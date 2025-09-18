import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProductCard from "@/components/product-card";
import { Store, Plus, Package, TrendingUp } from "lucide-react";

export default function MyStore() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: products, isLoading } = useQuery({
    queryKey: ['/api/products', 'registered'],
    queryFn: async () => {
      const res = await fetch('/api/products?status=registered');
      return res.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/stats/products'],
  });

  const filteredProducts = products?.filter((product: any) => {
    if (statusFilter === 'all') return true;
    return product.status === statusFilter;
  });

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-secondary/10 text-secondary korean-text mb-4">
              <Store className="mr-2 h-4 w-4" />
              내 쇼핑몰
            </div>
            <h1 className="text-4xl font-bold korean-text" data-testid="text-page-title">쇼핑몰 상품 관리</h1>
            <p className="text-lg text-muted-foreground korean-text mt-2">
              등록된 상품을 관리하고 마켓플레이스에 연동하세요
            </p>
          </div>
          <Button className="korean-text" data-testid="button-add-product">
            <Plus className="mr-2 h-4 w-4" />
            상품 추가
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">등록된 상품</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-registered-count">{stats.registered}</p>
                  </div>
                  <Package className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">마켓 동기화</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-synced-count">{stats.synced}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-secondary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">전체 상품</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-total-count">{stats.total}</p>
                  </div>
                  <Store className="h-8 w-8 text-chart-3" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Status Filter */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="korean-text">상태별 필터</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="korean-text"
                data-testid="button-filter-all"
              >
                전체
              </Button>
              <Button
                variant={statusFilter === "registered" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("registered")}
                className="korean-text"
                data-testid="button-filter-registered"
              >
                등록완료
              </Button>
              <Button
                variant={statusFilter === "analyzed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("analyzed")}
                className="korean-text"
                data-testid="button-filter-analyzed"
              >
                분석완료
              </Button>
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("pending")}
                className="korean-text"
                data-testid="button-filter-pending"
              >
                대기중
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product: any) => (
              <ProductCard 
                key={product.id} 
                product={product}
                onViewDetails={(product) => {
                  // Handle product management
                  console.log("Manage product:", product.name);
                }}
              />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold korean-text mb-2">등록된 상품이 없습니다</h3>
              <p className="text-muted-foreground korean-text mb-4">
                AI가 분석한 상품을 등록하거나 직접 상품을 추가해보세요.
              </p>
              <div className="flex justify-center gap-4">
                <Button className="korean-text" data-testid="button-go-ai-picks">
                  AI 추천 상품 보기
                </Button>
                <Button variant="outline" className="korean-text" data-testid="button-add-manual">
                  직접 상품 추가
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
