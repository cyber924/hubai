import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProductCard from "@/components/product-card";
import { Sparkles, Filter } from "lucide-react";

export default function AiPicks() {
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: products, isLoading } = useQuery({
    queryKey: ['/api/products', sourceFilter, categoryFilter],
    queryFn: async () => {
      let url = '/api/products?limit=50';
      if (sourceFilter !== 'all') {
        url += `&source=${sourceFilter}`;
      }
      if (categoryFilter !== 'all') {
        url += `&status=analyzed`;
      }
      const res = await fetch(url);
      return res.json();
    },
  });

  const filteredProducts = products?.filter((product: any) => {
    if (categoryFilter === 'all') return true;
    return product.category === categoryFilter;
  });

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary korean-text mb-4">
            <Sparkles className="mr-2 h-4 w-4" />
            AI 추천 상품
          </div>
          <h1 className="text-4xl font-bold mb-4 korean-text" data-testid="text-page-title">AI가 추천하는 트렌드 상품</h1>
          <p className="text-lg text-muted-foreground korean-text">
            Gemini AI가 분석한 최신 패션 트렌드와 인기 상품들을 만나보세요
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <label className="text-sm font-medium korean-text mb-2 block">카테고리</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter} data-testid="select-category-filter">
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 카테고리</SelectItem>
                    <SelectItem value="상의">상의</SelectItem>
                    <SelectItem value="하의">하의</SelectItem>
                    <SelectItem value="아우터">아우터</SelectItem>
                    <SelectItem value="신발">신발</SelectItem>
                    <SelectItem value="액세서리">액세서리</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSourceFilter("all");
                    setCategoryFilter("all");
                  }}
                  className="w-full korean-text"
                  data-testid="button-reset-filters"
                >
                  필터 초기화
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
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
                  // Handle product details view
                  console.log("View details for product:", product.name);
                }}
              />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Sparkles className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold korean-text mb-2">상품을 찾을 수 없습니다</h3>
              <p className="text-muted-foreground korean-text mb-4">
                선택한 필터 조건에 맞는 상품이 없습니다. 다른 조건을 시도해보세요.
              </p>
              <Button 
                variant="outline"
                onClick={() => {
                  setSourceFilter("all");
                  setCategoryFilter("all");
                }}
                className="korean-text"
                data-testid="button-clear-filters"
              >
                모든 필터 제거
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Load More */}
        {filteredProducts && filteredProducts.length >= 50 && (
          <div className="text-center mt-12">
            <Button variant="outline" className="korean-text" data-testid="button-load-more">
              더 많은 상품 보기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
