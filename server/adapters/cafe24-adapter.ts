import type { 
  MarketplaceAdapter, 
  MarketplaceCapabilities, 
  MarketplaceSyncResult, 
  MarketplaceProductStatus,
  Product 
} from "@shared/schema";
import { storage } from "../storage";

export class Cafe24Adapter implements MarketplaceAdapter {
  provider: 'cafe24' = 'cafe24';
  
  capabilities: MarketplaceCapabilities = {
    supportsCSV: true,
    supportsAPI: true,
    supportsOAuth: true,
    rateLimit: 120, // 2 calls per second = 120 per minute
    maxBatchSize: 50 // Reasonable batch size for API calls
  };

  // CSV 관련 메서드들
  mapProductToCSV(product: Product): Record<string, any> {
    const productPrice = parseFloat(product.price);
    
    return {
      '상품명': product.name,
      '상품코드': product.sourceProductId || `PROD_${Date.now()}`,
      '판매가': Math.round(productPrice),
      '소비자가': Math.round(productPrice * 1.3), // 30% 마크업
      '공급가': Math.round(productPrice * 0.8), // 20% 할인
      '상품요약설명': product.description?.substring(0, 255) || '',
      '상품상세설명': product.description || '',
      '브랜드': product.brand || '',
      '카테고리': this.getCategoryMapping(product.category),
      '대표이미지': product.imageUrl || (product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : ''),
      '추가이미지1': product.imageUrls && product.imageUrls.length > 1 ? product.imageUrls[1] : '',
      '추가이미지2': product.imageUrls && product.imageUrls.length > 2 ? product.imageUrls[2] : '',
      '추가이미지3': product.imageUrls && product.imageUrls.length > 3 ? product.imageUrls[3] : '',
      '성별': this.getGenderMapping(product.gender),
      '연령대': this.getAgeGroupMapping(product.ageGroup),
      '시즌': this.getSeasonMapping(product.season),
      '태그': product.tags ? product.tags.join(',') : '',
      '진열상태': 'T', // 진열함
      '판매상태': 'T', // 판매함
      '상품상태': 'N', // 신상품
      '과세구분': 'A', // 과세상품
      '재고수량': '999', // 기본 재고
      '최소주문수량': '1',
      '최대주문수량': '999'
    };
  }

  buildCSVHeaders(): string[] {
    return [
      '상품명',
      '상품코드', 
      '판매가',
      '소비자가',
      '공급가',
      '상품요약설명',
      '상품상세설명',
      '브랜드',
      '카테고리',
      '대표이미지',
      '추가이미지1',
      '추가이미지2', 
      '추가이미지3',
      '성별',
      '연령대',
      '시즌',
      '태그',
      '진열상태',
      '판매상태', 
      '상품상태',
      '과세구분',
      '재고수량',
      '최소주문수량',
      '최대주문수량'
    ];
  }

  buildCSVContent(products: Product[]): string {
    const headers = this.buildCSVHeaders();
    const csvRows = [headers.join(',')];
    
    for (const product of products) {
      const mappedProduct = this.mapProductToCSV(product);
      const row = headers.map(header => {
        const value = mappedProduct[header] || '';
        // CSV 특수문자 이스케이프
        const escapedValue = typeof value === 'string' 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
        return escapedValue;
      });
      csvRows.push(row.join(','));
    }
    
    return csvRows.join('\n');
  }

  // OAuth 토큰 리프레시 메서드
  private async refreshToken(connectionId: string): Promise<boolean> {
    try {
      const connection = await storage.getMarketplaceConnection(connectionId);
      if (!connection || !connection.refreshToken) {
        return false;
      }

      const response = await fetch(`https://${connection.shopId}.cafe24api.com/api/v2/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`wLw4c845MVpgjzxjnzfK1D:jrJfMmdFPSDN5zY2V8UNeI`).toString('base64')
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refreshToken
        })
      });

      if (!response.ok) {
        return false;
      }

      const tokenData = await response.json();
      
      // 새로운 토큰으로 연결 정보 업데이트
      await storage.updateMarketplaceConnection(connectionId, {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || connection.refreshToken,
        expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
        status: 'active',
        errorMessage: null
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  // 카테고리 매핑 개선
  private getCafe24CategoryNo(category: string | null): number {
    const categoryMap: Record<string, number> = {
      '상의': 24,   // 의류 > 여성의류 > 상의
      '하의': 25,   // 의류 > 여성의류 > 하의
      '아우터': 26, // 의류 > 여성의류 > 아우터
      '원피스': 27, // 의류 > 여성의류 > 원피스
      '신발': 28,   // 신발
      '가방': 29,   // 가방
      '액세서리': 30 // 액세서리
    };
    
    return categoryMap[category || ''] || 1; // 기본 카테고리
  }

  // 에러 응답 파싱
  private parseApiError(responseText: string): string {
    try {
      const errorData = JSON.parse(responseText);
      if (errorData.error && errorData.error.message) {
        return errorData.error.message;
      }
      if (errorData.error_description) {
        return errorData.error_description;
      }
      return responseText;
    } catch {
      return responseText;
    }
  }

  // API 관련 메서드들
  async pushProduct(product: Product, connectionId: string): Promise<MarketplaceSyncResult> {
    try {
      let connection = await storage.getMarketplaceConnection(connectionId);
      if (!connection) {
        return {
          success: false,
          errorMessage: "마켓플레이스 연결을 찾을 수 없습니다."
        };
      }

      if (connection.provider !== 'cafe24') {
        return {
          success: false,
          errorMessage: "카페24 연결이 아닙니다."
        };
      }

      if (connection.status !== 'active') {
        return {
          success: false,
          errorMessage: "카페24 연결이 비활성화되어 있습니다."
        };
      }

      // 토큰 만료 체크 및 리프레시
      if (connection.expiresAt && connection.expiresAt <= new Date()) {
        const refreshed = await this.refreshToken(connectionId);
        if (!refreshed) {
          return {
            success: false,
            errorMessage: "액세스 토큰 갱신에 실패했습니다. 재인증이 필요합니다."
          };
        }
        // 갱신된 연결 정보 다시 가져오기
        connection = await storage.getMarketplaceConnection(connectionId);
        if (!connection) {
          return {
            success: false,
            errorMessage: "연결 정보를 다시 가져올 수 없습니다."
          };
        }
      }

      const productPrice = parseFloat(product.price);
      
      // 카페24 API 상품 데이터 준비
      const cafe24ProductData = {
        shop_no: 1,
        product_name: product.name,
        supply_product_name: product.name,
        internal_product_name: product.name,
        model_name: product.sourceProductId || `MODEL_${Date.now()}`,
        price: Math.round(productPrice),
        retail_price: Math.round(productPrice * 1.3),
        supply_price: Math.round(productPrice * 0.8),
        display: 'T',
        selling: 'T',
        product_condition: 'N',
        product_important: 'N',
        product_type: 'P',
        tax_type: 'A',
        simple_description: product.description?.substring(0, 255) || '',
        description: product.description || '',
        mobile_description: product.description || '',
        translated: 'F',
        adult_certification: 'F',
        detail_image: product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : product.imageUrl,
        list_image: product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : product.imageUrl,
        tiny_image: product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : product.imageUrl,
        small_image: product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : product.imageUrl,
        category: [{ category_no: this.getCafe24CategoryNo(product.category) }]
      };

      // 카페24 API 호출
      const response = await fetch(`https://${connection.shopId}.cafe24api.com/api/v2/admin/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
          'X-Cafe24-Api-Version': '2022-03-01'
        },
        body: JSON.stringify({
          request: {
            product: cafe24ProductData
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // 401 에러인 경우 토큰 리프레시 시도
        if (response.status === 401) {
          const refreshed = await this.refreshToken(connectionId);
          if (refreshed) {
            // 토큰 갱신 성공시 재시도
            return this.pushProduct(product, connectionId);
          } else {
            await storage.updateMarketplaceConnection(connectionId, {
              status: 'expired',
              errorMessage: '액세스 토큰 갱신에 실패했습니다.'
            });
          }
        }
        
        const parsedError = this.parseApiError(errorText);
        return {
          success: false,
          errorMessage: `카페24 API 오류: ${parsedError}`,
          retryAfter: response.status === 429 ? 60 : undefined
        };
      }

      const responseData = await response.json();
      
      // 연결 정보 업데이트 (마지막 동기화 시간)
      await storage.updateMarketplaceConnection(connectionId, {
        lastSynced: new Date(),
        errorMessage: null
      });

      return {
        success: true,
        marketplaceProductId: responseData.product?.product_no?.toString()
      };

    } catch (error: any) {
      return {
        success: false,
        errorMessage: `상품 등록 실패: ${error.message}`
      };
    }
  }

  async updateInventory(productId: string, stock: number, connectionId: string): Promise<MarketplaceSyncResult> {
    try {
      let connection = await storage.getMarketplaceConnection(connectionId);
      if (!connection || connection.provider !== 'cafe24' || connection.status !== 'active') {
        return {
          success: false,
          errorMessage: "유효한 카페24 연결을 찾을 수 없습니다."
        };
      }

      // 토큰 만료 체크 및 리프레시
      if (connection.expiresAt && connection.expiresAt <= new Date()) {
        const refreshed = await this.refreshToken(connectionId);
        if (!refreshed) {
          return {
            success: false,
            errorMessage: "액세스 토큰 갱신에 실패했습니다."
          };
        }
        connection = await storage.getMarketplaceConnection(connectionId);
        if (!connection) {
          return {
            success: false,
            errorMessage: "연결 정보를 다시 가져올 수 없습니다."
          };
        }
      }

      // 카페24 상품 재고 업데이트 API 호출
      const response = await fetch(`https://${connection.shopId}.cafe24api.com/api/v2/admin/products/${productId}/options`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
          'X-Cafe24-Api-Version': '2022-03-01'
        },
        body: JSON.stringify({
          request: {
            option: {
              quantity: stock
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status === 401) {
          const refreshed = await this.refreshToken(connectionId);
          if (refreshed) {
            return this.updateInventory(productId, stock, connectionId);
          }
        }
        
        const parsedError = this.parseApiError(errorText);
        return {
          success: false,
          errorMessage: `재고 업데이트 실패: ${parsedError}`,
          retryAfter: response.status === 429 ? 60 : undefined
        };
      }

      await storage.updateMarketplaceConnection(connectionId, {
        lastSynced: new Date(),
        errorMessage: null
      });

      return {
        success: true
      };
      
    } catch (error: any) {
      return {
        success: false,
        errorMessage: `재고 업데이트 실패: ${error.message}`
      };
    }
  }

  async getStatus(marketplaceProductId: string, connectionId: string): Promise<MarketplaceProductStatus> {
    try {
      let connection = await storage.getMarketplaceConnection(connectionId);
      if (!connection || connection.provider !== 'cafe24' || connection.status !== 'active') {
        throw new Error("유효한 카페24 연결을 찾을 수 없습니다.");
      }

      // 토큰 만료 체크 및 리프레시
      if (connection.expiresAt && connection.expiresAt <= new Date()) {
        const refreshed = await this.refreshToken(connectionId);
        if (!refreshed) {
          throw new Error("액세스 토큰 갱신에 실패했습니다.");
        }
        connection = await storage.getMarketplaceConnection(connectionId);
        if (!connection) {
          throw new Error("연결 정보를 다시 가져올 수 없습니다.");
        }
      }

      // 카페24 상품 상태 조회 API 호출
      const response = await fetch(`https://${connection.shopId}.cafe24api.com/api/v2/admin/products/${marketplaceProductId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
          'X-Cafe24-Api-Version': '2022-03-01'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        if (response.status === 401) {
          const refreshed = await this.refreshToken(connectionId);
          if (refreshed) {
            return this.getStatus(marketplaceProductId, connectionId);
          }
        }
        
        const parsedError = this.parseApiError(errorText);
        throw new Error(`상품 상태 조회 실패: ${parsedError}`);
      }

      const responseData = await response.json();
      const productData = responseData.product;

      if (!productData) {
        throw new Error("상품 정보를 찾을 수 없습니다.");
      }

      // 카페24 상품 상태를 내부 상태로 매핑
      let status: 'active' | 'inactive' | 'pending' | 'rejected' = 'inactive';
      
      if (productData.display === 'T' && productData.selling === 'T') {
        status = 'active';
      } else if (productData.display === 'F' || productData.selling === 'F') {
        status = 'inactive';
      }

      // 재고 수량 추출
      let inventoryCount = 0;
      if (productData.quantity && typeof productData.quantity === 'number') {
        inventoryCount = productData.quantity;
      }

      await storage.updateMarketplaceConnection(connectionId, {
        lastSynced: new Date(),
        errorMessage: null
      });

      return {
        status,
        lastUpdated: new Date(),
        inventoryCount,
        errorMessage: undefined
      };
      
    } catch (error: any) {
      throw new Error(`상품 상태 조회 실패: ${error.message}`);
    }
  }

  // 헬퍼 메서드들
  private getCategoryMapping(category: string | null): string {
    const categoryMap: Record<string, string> = {
      '상의': '의류 > 상의',
      '하의': '의류 > 하의', 
      '아우터': '의류 > 아우터',
      '원피스': '의류 > 원피스',
      '신발': '패션잡화 > 신발',
      '가방': '패션잡화 > 가방',
      '액세서리': '패션잡화 > 액세서리'
    };
    
    return categoryMap[category || ''] || '기타';
  }

  private getGenderMapping(gender: string | null): string {
    const genderMap: Record<string, string> = {
      'male': '남성',
      'female': '여성',
      'unisex': '공용'
    };
    
    return genderMap[gender || ''] || '공용';
  }

  private getAgeGroupMapping(ageGroup: string | null): string {
    const ageGroupMap: Record<string, string> = {
      'teen': '10대',
      'twenties': '20대',
      'thirties': '30대',
      'adult': '성인'
    };
    
    return ageGroupMap[ageGroup || ''] || '성인';
  }

  private getSeasonMapping(season: string | null): string {
    const seasonMap: Record<string, string> = {
      'spring': '봄',
      'summer': '여름',
      'fall': '가을',
      'winter': '겨울',
      'all': '사계절'
    };
    
    return seasonMap[season || ''] || '사계절';
  }
}

// 싱글톤 인스턴스 생성
export const cafe24Adapter = new Cafe24Adapter();