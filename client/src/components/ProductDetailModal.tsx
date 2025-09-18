import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Edit, Trash2, Package, Calendar, Users, MapPin } from "lucide-react";
import type { Product } from "@shared/schema";

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