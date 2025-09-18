import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminSidebar from "@/components/admin-sidebar";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Database, 
  Filter, 
  Trash2, 
  Eye,
  RefreshCw,
  Bot,
  ExternalLink 
} from "lucide-react";

export default function ProductFeed() {
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['/api/products', 'feed', sourceFilter, statusFilter],
    queryFn: () => {
      const params: any = { limit: 100 };
      if (sourceFilter !== 'all') params.source = sourceFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      return api.getProducts(params);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: api.deleteProduct,
    onSuccess: () => {
      toast({
        title: "성공",
        description: "상품이 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "상품 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProduct = (id: string) => {
    if (confirm('이 상품을 삭제하시겠습니까?')) {
      deleteProductMutation.mutate(id);
    }
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

  const getSourceBadge = (source: string) => {
    const sourceNames = {
      naver: "네이버",
      coupang: "쿠팡", 
      zigzag: "지그재그"
    };
    
    return (
      <Badge variant="outline" className="korean-text text-xs">
        {sourceNames[source as keyof typeof sourceNames] || source}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="flex">
        <AdminSidebar className="fixed left-0 top-0 h-screen" />
        
        <div className="flex-1 ml-64 p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary korean-text mb-4">
              <Database className="mr-2 h-4 w-4" />
              상품 피드
            </div>
            <h1 className="text-3xl font-bold korean-text" data-testid="text-page-title">상품 피드 관리</h1>
            <p className="text-muted-foreground korean-text">
              수집된 상품과 AI 분석 결과를 확인하고 관리하세요
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center korean-text">
                <Filter className="mr-2 h-5 w-5" />
                필터
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium korean-text mb-2 block">소스</label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter} data-testid="select-source-filter">
                    <SelectTrigger>
                      <SelectValue placeholder="소스 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 소스</SelectItem>
                      <SelectItem value="naver">네이버</SelectItem>
                      <SelectItem value="coupang">쿠팡</SelectItem>
                      <SelectItem value="zigzag">지그재그</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium korean-text mb-2 block">상태</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status-filter">
                    <SelectTrigger>
                      <SelectValue placeholder="상태 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                      <SelectItem value="pending">대기중</SelectItem>
                      <SelectItem value="analyzed">분석완료</SelectItem>
                      <SelectItem value="registered">등록완료</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSourceFilter("all");
                      setStatusFilter("all");
                    }}
                    className="w-full korean-text"
                    data-testid="button-reset-filters"
                  >
                    필터 초기화
                  </Button>
                </div>

                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => refetch()}
                    className="w-full korean-text"
                    data-testid="button-refresh"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    새로고침
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="korean-text">상품 목록</CardTitle>
                <div className="text-sm text-muted-foreground korean-text">
                  총 {products?.length || 0}개 상품
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                      <div className="w-16 h-16 bg-muted rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/4"></div>
                      </div>
                      <div className="w-20 h-8 bg-muted rounded"></div>
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
                          <Database className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium truncate korean-text" data-testid={`text-product-name-${product.id}`}>
                            {product.name}
                          </h3>
                          {getSourceBadge(product.source)}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="english-text">₩{Number(product.price).toLocaleString()}</span>
                          {product.category && <span className="korean-text">{product.category}</span>}
                          {product.tags && product.tags.length > 0 && (
                            <span className="korean-text">
                              {product.tags.slice(0, 2).map((tag: string) => `#${tag}`).join(' ')}
                            </span>
                          )}
                        </div>

                        {/* AI Analysis */}
                        {product.aiAnalysis && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                            <div className="flex items-center space-x-2">
                              <Bot className="h-3 w-3 text-primary" />
                              <span className="korean-text">AI 분석:</span>
                              <span className="korean-text">{product.aiAnalysis.style}</span>
                              <span className="korean-text">• {product.aiAnalysis.season}</span>
                              <span className="korean-text">• {product.aiAnalysis.gender}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Status and Actions */}
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(product.status)}
                        
                        <div className="flex space-x-1">
                          {product.sourceUrl && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(product.sourceUrl, '_blank')}
                              data-testid={`button-view-source-${product.id}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-view-details-${product.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteProduct(product.id)}
                            disabled={deleteProductMutation.isPending}
                            data-testid={`button-delete-${product.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold korean-text mb-2">상품이 없습니다</h3>
                  <p className="text-muted-foreground korean-text mb-4">
                    선택한 필터 조건에 맞는 상품이 없습니다.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSourceFilter("all");
                      setStatusFilter("all");
                    }}
                    className="korean-text"
                    data-testid="button-clear-filters"
                  >
                    모든 필터 제거
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
