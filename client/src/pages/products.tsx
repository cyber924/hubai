import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, ShoppingCart, TrendingUp, Package, ExternalLink } from "lucide-react";
import type { Product } from "@shared/schema";

export default function Products() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showMarketplaceSelect, setShowMarketplaceSelect] = useState(false);
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // 카페24 연결 성공 메시지 처리
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('cafe24_connected') === 'true') {
      toast({
        title: "카페24 연결 완료",
        description: "카페24가 성공적으로 연결되었습니다. 이제 상품을 등록할 수 있습니다.",
      });
      // URL에서 파라미터 제거
      window.history.replaceState({}, '', '/products');
    }
  }, [toast]);

  // Fetch products with count
  const { data, isLoading, error } = useQuery<{ products: Product[], total: number }>({
    queryKey: ["/api/products", statusFilter, currentPage],
    queryFn: () => {
      const params = new URLSearchParams({ 
        limit: ITEMS_PER_PAGE.toString(),
        offset: ((currentPage - 1) * ITEMS_PER_PAGE).toString(),
        withCount: 'true'
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      return fetch(`/api/products?${params}`).then(res => res.json());
    },
  });

  const products = data?.products || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  // 필터 변경 시 페이지 리셋 및 선택 초기화
  useEffect(() => {
    setCurrentPage(1);
    setSelectedProducts([]);
  }, [statusFilter]);

  // Fetch marketplace connections
  const { data: connections = [] } = useQuery<Array<{provider: string}>>({
    queryKey: ["/api/marketplace/connections"],
  });

  // 마켓플레이스 등록 뮤테이션
  const marketplaceRegisterMutation = useMutation({
    mutationFn: async ({ marketplace, productIds }: { marketplace: string, productIds: string[] }) => {
      const response = await apiRequest('POST', `/api/marketplace/${marketplace}/products`, { productIds });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/products"],
        exact: false 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace-syncs'] });
      const marketplaceName = selectedMarketplace === 'cafe24' ? '카페24' : 
                             selectedMarketplace === 'naver' ? '네이버' : 
                             selectedMarketplace === 'coupang' ? '쿠팡' : selectedMarketplace;
      toast({
        title: "등록 완료",
        description: `${data.successCount || 0}개 상품이 성공적으로 ${marketplaceName}에 등록되었습니다.`,
      });
      setSelectedProducts([]);
      setShowMarketplaceSelect(false);
      setSelectedMarketplace("");
    },
    onError: (error: any) => {
      const marketplaceName = selectedMarketplace === 'cafe24' ? '카페24' : 
                             selectedMarketplace === 'naver' ? '네이버' : 
                             selectedMarketplace === 'coupang' ? '쿠팡' : selectedMarketplace;
      toast({
        title: "등록 실패",
        description: error.message || `${marketplaceName} 상품 등록 중 오류가 발생했습니다.`,
        variant: "destructive",
      });
    }
  });

  // 마켓플레이스 등록 처리
  const handleMarketplaceRegister = () => {
    if (!selectedMarketplace || selectedProducts.length === 0) {
      toast({
        title: "선택 필요",
        description: "마켓플레이스와 상품을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    marketplaceRegisterMutation.mutate({
      marketplace: selectedMarketplace,
      productIds: selectedProducts
    });
  };

  // Filter products based on search only (status filtering is done server-side)
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Status counts - showing only current filter count
  const statusCounts = {
    all: totalCount,
    collected: statusFilter === 'collected' ? totalCount : '?',
    analyzed: statusFilter === 'analyzed' ? totalCount : '?',
    registered: statusFilter === 'registered' ? totalCount : '?',
    synced: statusFilter === 'synced' ? totalCount : '?',
  };

  // Select/deselect products
  const handleProductSelect = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleSelectAll = (products: Product[], checked: boolean) => {
    if (checked) {
      const productIds = products.map(p => p.id);
      setSelectedProducts(prev => {
        const newSelection = [...prev, ...productIds];
        return Array.from(new Set(newSelection));
      });
    } else {
      const productIds = products.map(p => p.id);
      setSelectedProducts(prev => prev.filter(id => !productIds.includes(id)));
    }
  };

  // Status badge color mapping
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "collected": return "secondary";
      case "analyzed": return "outline";
      case "registered": return "default";
      case "synced": return "default";
      default: return "secondary";
    }
  };

  // Status badge text mapping
  const getStatusText = (status: string) => {
    switch (status) {
      case "collected": return "수집됨";
      case "analyzed": return "분석됨";
      case "registered": return "등록됨";
      case "synced": return "동기화됨";
      default: return status;
    }
  };

  const ProductCard = ({ product }: { product: Product }) => (
    <Card key={product.id} className="group hover:shadow-md transition-all duration-200" data-testid={`card-product-${product.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              data-testid={`checkbox-product-${product.id}`}
              checked={selectedProducts.includes(product.id)}
              onCheckedChange={(checked) => handleProductSelect(product.id, checked as boolean)}
            />
            <Badge variant={getStatusBadgeVariant(product.status || 'collected')} data-testid={`badge-status-${product.id}`}>
              {getStatusText(product.status || 'collected')}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-primary" data-testid={`text-price-${product.id}`}>
              ₩{parseInt(product.price).toLocaleString()}
            </p>
          </div>
        </div>
        <CardTitle className="text-base line-clamp-2" data-testid={`text-name-${product.id}`}>
          {product.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {(product.imageUrl || (product.imageUrls && product.imageUrls.length > 0)) && (
          <div className="mb-3">
            <img
              src={product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : product.imageUrl || ''}
              alt={product.name}
              className="w-full h-32 object-cover rounded-md"
              data-testid={`img-product-${product.id}`}
            />
          </div>
        )}
        {product.description && (
          <CardDescription className="text-sm line-clamp-2 mb-3" data-testid={`text-description-${product.id}`}>
            {product.description}
          </CardDescription>
        )}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span data-testid={`text-source-${product.id}`}>
              {product.sourceUrl ? (() => {
                try {
                  return new URL(product.sourceUrl).hostname;
                } catch {
                  return '소스 불명';
                }
              })() : '소스 불명'}
            </span>
          </div>
          {product.sourceUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => product.sourceUrl && window.open(product.sourceUrl, '_blank')}
              data-testid={`button-source-${product.id}`}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">상품을 불러오는 중 오류가 발생했습니다.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">내 상품</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            {totalCount > 0 ? `총 ${totalCount}개 상품 (페이지 ${currentPage}/${totalPages})` : '상품이 없습니다'}
          </p>
        </div>
        <div className="mt-4 lg:mt-0 flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="상품명이나 설명으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-64"
              data-testid="input-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 ({statusCounts.all})</SelectItem>
              <SelectItem value="collected">수집됨 ({statusCounts.collected})</SelectItem>
              <SelectItem value="analyzed">분석됨 ({statusCounts.analyzed})</SelectItem>
              <SelectItem value="registered">등록됨 ({statusCounts.registered})</SelectItem>
              <SelectItem value="synced">동기화됨 ({statusCounts.synced})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action bar for selected products */}
      {selectedProducts.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" data-testid="text-selected-count">
              {selectedProducts.length}개 상품 선택됨
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProducts([])}
                data-testid="button-clear-selection"
              >
                선택 해제
              </Button>
              <Button 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowMarketplaceSelect(true)}
                disabled={selectedProducts.length === 0}
                data-testid="button-register-marketplace"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                마켓플레이스에 등록
              </Button>
            </div>
          </div>
        </div>
      )}

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" data-testid="tab-all">
            전체 ({statusCounts.all})
          </TabsTrigger>
          <TabsTrigger value="collected" data-testid="tab-collected">
            수집됨 ({statusCounts.collected})
          </TabsTrigger>
          <TabsTrigger value="analyzed" data-testid="tab-analyzed">
            분석됨 ({statusCounts.analyzed})
          </TabsTrigger>
          <TabsTrigger value="registered" data-testid="tab-registered">
            등록됨 ({statusCounts.registered})
          </TabsTrigger>
          <TabsTrigger value="synced" data-testid="tab-synced">
            동기화됨 ({statusCounts.synced})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {filteredProducts.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.includes(p.id))}
                    onCheckedChange={(checked) => handleSelectAll(filteredProducts, checked as boolean)}
                    data-testid="checkbox-select-all"
                  />
                  <span className="text-sm font-medium">전체 선택</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">상품이 없습니다</h3>
              <p className="text-muted-foreground">상품 수집을 시작하여 상품을 추가해보세요.</p>
            </div>
          )}
        </TabsContent>

        {['collected', 'analyzed', 'registered', 'synced'].map((status) => (
          <TabsContent key={status} value={status} className="mt-6">
            {filteredProducts.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.includes(p.id))}
                      onCheckedChange={(checked) => handleSelectAll(filteredProducts, checked as boolean)}
                      data-testid={`checkbox-select-all-${status}`}
                    />
                    <span className="text-sm font-medium">{getStatusText(status)} 상품 전체 선택</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{getStatusText(status)} 상품이 없습니다</h3>
                <p className="text-muted-foreground">해당 상태의 상품이 없습니다.</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Pagination */}
      {totalCount > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            data-testid="button-first-page"
          >
            처음
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            data-testid="button-prev-page"
          >
            이전
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return page <= totalPages ? (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  data-testid={`button-page-${page}`}
                >
                  {page}
                </Button>
              ) : null;
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            data-testid="button-next-page"
          >
            다음
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            data-testid="button-last-page"
          >
            마지막
          </Button>
        </div>
      )}

      {/* 마켓플레이스 선택 모달 */}
      <Dialog open={showMarketplaceSelect} onOpenChange={setShowMarketplaceSelect}>
        <DialogContent data-testid="dialog-marketplace-select">
          <DialogHeader>
            <DialogTitle>마켓플레이스 선택</DialogTitle>
            <DialogDescription>
              선택한 {selectedProducts.length}개 상품을 등록할 마켓플레이스를 선택해주세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-3 py-4">
            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedMarketplace === 'cafe24' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => setSelectedMarketplace('cafe24')}
              data-testid="option-cafe24"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">☕</div>
                <div>
                  <h3 className="font-medium">카페24</h3>
                  <p className="text-sm text-muted-foreground">Korean e-commerce platform</p>
                </div>
              </div>
            </div>
            
            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedMarketplace === 'naver' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => setSelectedMarketplace('naver')}
              data-testid="option-naver"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🛍️</div>
                <div>
                  <h3 className="font-medium">네이버 스마트스토어</h3>
                  <p className="text-sm text-muted-foreground">Korea's largest shopping platform</p>
                </div>
              </div>
            </div>
            
            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedMarketplace === 'coupang' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => setSelectedMarketplace('coupang')}
              data-testid="option-coupang"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">📦</div>
                <div>
                  <h3 className="font-medium">쿠팡</h3>
                  <p className="text-sm text-muted-foreground">Fast delivery e-commerce</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowMarketplaceSelect(false)}
              data-testid="button-cancel-marketplace"
            >
              취소
            </Button>
            <Button 
              onClick={handleMarketplaceRegister}
              disabled={!selectedMarketplace || marketplaceRegisterMutation.isPending}
              data-testid="button-confirm-marketplace"
            >
              {marketplaceRegisterMutation.isPending ? '등록 중...' : '등록하기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}