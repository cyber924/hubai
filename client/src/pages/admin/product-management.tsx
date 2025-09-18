import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminSidebar from "@/components/admin-sidebar";
import ProductDetailModal from "@/components/ProductDetailModal";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Edit, 
  RefreshCw,
  CheckCircle,
  Upload,
  ShoppingCart,
  Eye
} from "lucide-react";
import type { Product } from "@shared/schema";

export default function ProductManagement() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['/api/products', 'management', statusFilter],
    queryFn: () => {
      const params: any = { limit: 100 };
      if (statusFilter !== 'all') params.status = statusFilter;
      return api.getProducts(params);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => api.updateProduct(id, updates),
    onSuccess: () => {
      toast({
        title: "성공",
        description: "상품이 업데이트되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "상품 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const createMarketplaceSyncMutation = useMutation({
    mutationFn: api.createMarketplaceSync,
    onSuccess: () => {
      toast({
        title: "성공",
        description: "마켓플레이스 동기화가 시작되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace-syncs'] });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "마켓플레이스 동기화에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (productId: string, newStatus: string) => {
    updateProductMutation.mutate({
      id: productId,
      updates: { status: newStatus }
    });
  };

  const handleRegisterToStore = (productId: string) => {
    updateProductMutation.mutate({
      id: productId,
      updates: { status: "registered" }
    });
  };

  const handleSyncToMarketplace = (productId: string, marketplace: string) => {
    createMarketplaceSyncMutation.mutate({
      productId,
      marketplace,
      status: "pending"
    });
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedProduct(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "analyzed":
        return <Badge variant="secondary" className="korean-text">분석완료</Badge>;
      case "registered":
        return <Badge variant="outline" className="korean-text">등록완료</Badge>;
      case "pending":
        return <Badge variant="destructive" className="korean-text">대기중</Badge>;
      default:
        return <Badge variant="outline" className="korean-text">{status}</Badge>;
    }
  };

  const registeredProducts = products?.filter((p: any) => p.status === "registered") || [];
  const analyzedProducts = products?.filter((p: any) => p.status === "analyzed") || [];
  const pendingProducts = products?.filter((p: any) => p.status === "pending") || [];

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="flex">
        <AdminSidebar className="fixed left-0 top-0 h-screen" />
        
        <div className="flex-1 ml-64 p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-secondary/10 text-secondary korean-text mb-4">
              <Package className="mr-2 h-4 w-4" />
              상품 관리
            </div>
            <h1 className="text-3xl font-bold korean-text" data-testid="text-page-title">상품 관리</h1>
            <p className="text-muted-foreground korean-text">
              상품 상태를 관리하고 마켓플레이스에 등록하세요
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">등록 가능</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-analyzed-count">{analyzedProducts.length}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">등록완료</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-registered-count">{registeredProducts.length}</p>
                  </div>
                  <Upload className="h-8 w-8 text-secondary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">처리 대기</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-pending-count">{pendingProducts.length}</p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-chart-3" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="korean-text">상태별 필터</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status-filter">
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 상태</SelectItem>
                    <SelectItem value="pending">대기중</SelectItem>
                    <SelectItem value="analyzed">분석완료</SelectItem>
                    <SelectItem value="registered">등록완료</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  onClick={() => refetch()}
                  className="korean-text"
                  data-testid="button-refresh"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  새로고침
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Products List */}
          <Card>
            <CardHeader>
              <CardTitle className="korean-text">상품 목록</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                      <div className="w-16 h-16 bg-muted rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                      <div className="w-32 h-8 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : products && products.length > 0 ? (
                <div className="space-y-4">
                  {products.map((product: any) => (
                    <div key={product.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      {/* Product Image */}
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-16 h-16 rounded-lg object-cover"
                          data-testid={`img-product-${product.id}`}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate korean-text mb-1" data-testid={`text-product-name-${product.id}`}>
                          {product.name}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="english-text">₩{Number(product.price).toLocaleString()}</span>
                          <span className="korean-text">{product.source}</span>
                          {product.category && <span className="korean-text">{product.category}</span>}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(product.status)}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        {product.status === "analyzed" && (
                          <Button 
                            size="sm"
                            onClick={() => handleRegisterToStore(product.id)}
                            disabled={updateProductMutation.isPending}
                            className="korean-text"
                            data-testid={`button-register-${product.id}`}
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            자사몰 등록
                          </Button>
                        )}

                        {product.status === "registered" && (
                          <div className="flex space-x-1">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleSyncToMarketplace(product.id, "naver")}
                              disabled={createMarketplaceSyncMutation.isPending}
                              className="korean-text text-xs"
                              data-testid={`button-sync-naver-${product.id}`}
                            >
                              네이버
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleSyncToMarketplace(product.id, "coupang")}
                              disabled={createMarketplaceSyncMutation.isPending}
                              className="korean-text text-xs"
                              data-testid={`button-sync-coupang-${product.id}`}
                            >
                              쿠팡
                            </Button>
                          </div>
                        )}

                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewProduct(product)}
                          data-testid={`button-view-${product.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditProduct(product)}
                          data-testid={`button-edit-${product.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold korean-text mb-2">관리할 상품이 없습니다</h3>
                  <p className="text-muted-foreground korean-text">
                    상품을 수집하고 AI 분석을 완료하면 여기에서 관리할 수 있습니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        open={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onEdit={(product) => {
          // 수정 로직 구현 필요
          console.log('Edit product:', product);
        }}
      />
    </div>
  );
}
