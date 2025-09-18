import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Product } from "@shared/schema";

interface ProductCardProps {
  product: Product;
  onViewDetails?: (product: Product) => void;
}

export default function ProductCard({ product, onViewDetails }: ProductCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "analyzed":
        return <Badge variant="secondary" className="korean-text">분석완료</Badge>;
      case "registered":
        return <Badge variant="outline" className="korean-text">등록완료</Badge>;
      case "pending":
        return <Badge variant="destructive" className="korean-text">처리중</Badge>;
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
    <Card className="rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all group" data-testid={`card-product-${product.id}`}>
      {product.imageUrl && (
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
          data-testid={`img-product-${product.id}`}
        />
      )}
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          {getStatusBadge(product.status || "pending")}
          {getSourceBadge(product.source)}
        </div>
        
        <h3 className="font-semibold mb-2 korean-text" data-testid={`text-product-name-${product.id}`}>
          {product.name}
        </h3>
        
        {product.tags && product.tags.length > 0 && (
          <p className="text-muted-foreground text-sm mb-3 korean-text" data-testid={`text-product-tags-${product.id}`}>
            {product.tags.map(tag => `#${tag}`).join(" ")}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg english-text" data-testid={`text-product-price-${product.id}`}>
            ₩{Number(product.price).toLocaleString()}
          </span>
          {onViewDetails && (
            <Button 
              variant="link" 
              size="sm" 
              className="text-xs korean-text p-0"
              onClick={() => onViewDetails(product)}
              data-testid={`button-view-details-${product.id}`}
            >
              상세보기
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
