import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Edit, Trash2, Package, Calendar, Users, MapPin, Brain, Database, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Product, ProductOption, Inventory, MarketplaceSync } from "@shared/schema";

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

export default function ProductDetailModal({ 
  product, 
  open, 
  onClose, 
  onEdit, 
  onDelete 
}: ProductDetailModalProps) {
  if (!product) return null;

  // DB에서 추가 정보 불러오기
  const { data: productOptions, isLoading: optionsLoading } = useQuery<ProductOption[]>({
    queryKey: ['/api/products', product.id, 'options'],
    enabled: open && !!product.id,
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery<Inventory[]>({
    queryKey: ['/api/products', product.id, 'inventory'],
    enabled: open && !!product.id,
  });

  const { data: syncs, isLoading: syncsLoading } = useQuery<MarketplaceSync[]>({
    queryKey: ['/api/products', product.id, 'syncs'],
    enabled: open && !!product.id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "analyzed":
        return <Badge variant="secondary" className="korean-text">분석완료</Badge>;
      case "registered":
        return <Badge variant="outline" className="korean-text">등록완료</Badge>;
      case "synced":
        return <Badge variant="default" className="korean-text">동기화완료</Badge>;
      case "pending":
        return <Badge variant="destructive" className="korean-text">처리중</Badge>;
      default:
        return <Badge variant="outline" className="korean-text">{status}</Badge>;
    }
  };

  const getSourceName = (source: string) => {
    const sourceNames = {
      naver: "네이버 쇼핑",
      coupang: "쿠팡", 
      zigzag: "지그재그"
    };
    return sourceNames[source as keyof typeof sourceNames] || source;
  };

  const discountRate = product.originalPrice 
    ? Math.round((1 - Number(product.price) / Number(product.originalPrice)) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-product-detail">
        <DialogHeader>
          <DialogTitle className="korean-text text-xl" data-testid="text-modal-title">
            상품 상세 정보
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 이미지 영역 */}
          <div className="space-y-4">
            {/* 메인 이미지 */}
            {product.imageUrl && (
              <img 
                src={product.imageUrl} 
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg border"
                data-testid="img-product-detail"
              />
            )}
            
            {/* 추가 이미지들 */}
            {product.imageUrls && product.imageUrls.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium korean-text text-muted-foreground">추가 이미지</h4>
                <div className="grid grid-cols-3 gap-2">
                  {product.imageUrls.map((imageUrl, index) => (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`${product.name} 추가 이미지 ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                      data-testid={`img-product-additional-${index}`}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              {getStatusBadge(product.status || "pending")}
              <Badge variant="outline" className="korean-text">
                {getSourceName(product.source)}
              </Badge>
            </div>
          </div>

          {/* 상품 정보 영역 */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold korean-text mb-2" data-testid="text-product-name">
                {product.name}
              </h2>
              {product.description && (
                <p className="text-muted-foreground korean-text" data-testid="text-product-description">
                  {product.description}
                </p>
              )}
            </div>

            {/* 가격 정보 */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold english-text" data-testid="text-current-price">
                  ₩{Number(product.price).toLocaleString()}
                </span>
                {product.originalPrice && discountRate > 0 && (
                  <Badge variant="destructive" className="english-text">
                    {discountRate}% 할인
                  </Badge>
                )}
              </div>
              {product.originalPrice && (
                <span className="text-lg text-muted-foreground line-through english-text" data-testid="text-original-price">
                  ₩{Number(product.originalPrice).toLocaleString()}
                </span>
              )}
            </div>

            <Separator />

            {/* 상품 속성 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {product.category && (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="korean-text">
                    {product.category} {product.subcategory && `> ${product.subcategory}`}
                  </span>
                </div>
              )}
              {product.brand && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground korean-text">브랜드:</span>
                  <span className="korean-text">{product.brand}</span>
                </div>
              )}
              {product.season && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="korean-text">{product.season}</span>
                </div>
              )}
              {product.gender && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="korean-text">{product.gender}</span>
                </div>
              )}
              {product.ageGroup && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground korean-text">연령대:</span>
                  <span className="korean-text">{product.ageGroup}</span>
                </div>
              )}
              {product.sourceUrl && (
                <div className="flex items-center gap-2 col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={product.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline korean-text text-sm flex items-center gap-1"
                    data-testid="link-source"
                  >
                    원본 페이지 보기 <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {/* 태그 */}
            {product.tags && product.tags.length > 0 && (
              <div>
                <h4 className="font-medium korean-text mb-2">태그</h4>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="korean-text text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* AI 분석 정보 */}
            {product.aiAnalysis && (
              <div data-testid="section-ai-analysis">
                <h4 className="font-medium korean-text mb-3 flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI 분석
                </h4>
                <div className="space-y-2 text-sm border rounded-lg p-3 bg-muted/30">
                  {(product.aiAnalysis as any)?.description && (
                    <div>
                      <span className="text-muted-foreground korean-text">분석:</span>
                      <span className="korean-text ml-2">{(product.aiAnalysis as any).description}</span>
                    </div>
                  )}
                  {(product.aiAnalysis as any)?.style && (
                    <div>
                      <span className="text-muted-foreground korean-text">스타일:</span>
                      <span className="korean-text ml-2">{(product.aiAnalysis as any).style}</span>
                    </div>
                  )}
                  {(product.aiAnalysis as any)?.recommendedPrice && (
                    <div>
                      <span className="text-muted-foreground korean-text">추천 가격:</span>
                      <span className="korean-text ml-2">₩{Number((product.aiAnalysis as any).recommendedPrice).toLocaleString()}</span>
                    </div>
                  )}
                  {(product.aiAnalysis as any)?.confidence && (
                    <div>
                      <span className="text-muted-foreground korean-text">신뢰도:</span>
                      <span className="korean-text ml-2">{Math.round((product.aiAnalysis as any).confidence * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 원본 정보 */}
            {(product.sourceProductId || product.createdAt || product.updatedAt) && (
              <div data-testid="section-source-info">
                <h4 className="font-medium korean-text mb-3 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  원본 정보
                </h4>
                <div className="space-y-2 text-sm border rounded-lg p-3 bg-muted/30">
                  {product.sourceProductId && (
                    <div>
                      <span className="text-muted-foreground korean-text">원본 상품 ID:</span>
                      <span className="korean-text ml-2">{product.sourceProductId}</span>
                    </div>
                  )}
                  {product.createdAt && (
                    <div>
                      <span className="text-muted-foreground korean-text">생성일:</span>
                      <span className="korean-text ml-2">{new Date(product.createdAt).toLocaleString('ko-KR')}</span>
                    </div>
                  )}
                  {product.updatedAt && (
                    <div>
                      <span className="text-muted-foreground korean-text">수정일:</span>
                      <span className="korean-text ml-2">{new Date(product.updatedAt).toLocaleString('ko-KR')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 상품 옵션 */}
            {!optionsLoading && (
              <div data-testid="section-product-options">
                <h4 className="font-medium korean-text mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  상품 옵션
                </h4>
                {productOptions && productOptions.length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(
                      productOptions.reduce((acc, option) => {
                        if (!acc[option.optionType]) acc[option.optionType] = [];
                        acc[option.optionType].push(option);
                        return acc;
                      }, {} as Record<string, ProductOption[]>)
                    ).map(([type, options]) => (
                      <div key={type} className="border rounded-lg p-3 bg-muted/30">
                        <h5 className="font-medium korean-text mb-2">{type}</h5>
                        <div className="space-y-1">
                          {options.map((option) => (
                            <div key={option.id} className="flex justify-between items-center text-sm">
                              <span className="korean-text">{option.optionValue}</span>
                              <div className="flex items-center gap-2">
                                {option.additionalPrice && Number(option.additionalPrice) > 0 && (
                                  <span className="text-xs">+₩{Number(option.additionalPrice).toLocaleString()}</span>
                                )}
                                <span className="text-xs text-muted-foreground">재고: {option.stock}</span>
                                {!option.isActive && (
                                  <Badge variant="destructive" className="text-xs">비활성</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-lg p-3 bg-muted/30 text-center text-muted-foreground korean-text text-sm">
                    등록된 상품 옵션이 없습니다
                  </div>
                )}
              </div>
            )}

            {/* 재고 정보 */}
            {!inventoryLoading && (
              <div data-testid="section-inventory">
                <h4 className="font-medium korean-text mb-3 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  재고 관리
                </h4>
                {inventory && inventory.length > 0 ? (
                  <div className="space-y-2">
                    {inventory.map((item) => (
                      <div key={item.id} className="border rounded-lg p-3 bg-muted/30">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground korean-text">현재 재고:</span>
                            <span className="korean-text ml-2 font-medium">{item.currentStock}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground korean-text">예약 재고:</span>
                            <span className="korean-text ml-2">{item.reservedStock}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground korean-text">부족 임계값:</span>
                            <span className="korean-text ml-2">{item.lowStockThreshold}</span>
                          </div>
                          {item.lastRestocked && (
                            <div>
                              <span className="text-muted-foreground korean-text">마지막 입고:</span>
                              <span className="korean-text ml-2">{new Date(item.lastRestocked).toLocaleDateString('ko-KR')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-lg p-3 bg-muted/30 text-center text-muted-foreground korean-text text-sm">
                    등록된 재고 정보가 없습니다
                  </div>
                )}
              </div>
            )}

            {/* 마켓플레이스 동기화 */}
            {!syncsLoading && (
              <div data-testid="section-marketplace-syncs">
                <h4 className="font-medium korean-text mb-3 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  마켓플레이스 동기화
                </h4>
                {syncs && syncs.length > 0 ? (
                  <div className="space-y-2">
                    {syncs.map((sync) => (
                      <div key={sync.id} className="border rounded-lg p-3 bg-muted/30">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium korean-text">{sync.marketplace}</span>
                          <Badge variant={sync.status === 'synced' ? 'default' : sync.status === 'failed' ? 'destructive' : 'secondary'}>
                            {sync.status === 'synced' ? '동기화완료' : sync.status === 'failed' ? '실패' : '대기중'}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          {sync.marketplaceProductId && (
                            <div>
                              <span className="text-muted-foreground korean-text">상품 ID:</span>
                              <span className="korean-text ml-2">{sync.marketplaceProductId}</span>
                            </div>
                          )}
                          {sync.syncedAt && (
                            <div>
                              <span className="text-muted-foreground korean-text">동기화 시간:</span>
                              <span className="korean-text ml-2">{new Date(sync.syncedAt).toLocaleString('ko-KR')}</span>
                            </div>
                          )}
                          {sync.errorMessage && (
                            <div>
                              <span className="text-muted-foreground korean-text">오류:</span>
                              <span className="text-destructive korean-text ml-2">{sync.errorMessage}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-lg p-3 bg-muted/30 text-center text-muted-foreground korean-text text-sm">
                    마켓플레이스 동기화 이력이 없습니다
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* 액션 버튼 */}
            <div className="flex gap-2">
              {onEdit && (
                <Button 
                  variant="outline" 
                  onClick={() => onEdit(product)}
                  className="korean-text flex-1"
                  data-testid="button-edit-product"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  수정
                </Button>
              )}
              {onDelete && (
                <Button 
                  variant="destructive" 
                  onClick={() => onDelete(product)}
                  className="korean-text"
                  data-testid="button-delete-product"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}