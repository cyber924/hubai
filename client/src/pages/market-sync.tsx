import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download, ExternalLink, CheckCircle, Clock, AlertCircle } from "lucide-react";

export default function MarketSync() {
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>("all");

  const { data: syncs, isLoading } = useQuery<any[]>({
    queryKey: ['/api/marketplace-syncs'],
  });

  const { data: products } = useQuery<any[]>({
    queryKey: ['/api/products', 'registered'],
    queryFn: async () => {
      const res = await fetch('/api/products?status=registered');
      return res.json();
    },
  });

  const marketplaces = [
    { id: "naver", name: "네이버 스마트스토어", icon: "🛍️", color: "bg-green-500" },
    { id: "coupang", name: "쿠팡", icon: "📦", color: "bg-orange-500" },
    { id: "zigzag", name: "지그재그", icon: "💄", color: "bg-pink-500" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "synced":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "synced":
        return <Badge variant="secondary" className="korean-text">동기화완료</Badge>;
      case "pending":
        return <Badge variant="outline" className="korean-text">대기중</Badge>;
      case "failed":
        return <Badge variant="destructive" className="korean-text">실패</Badge>;
      default:
        return <Badge variant="outline" className="korean-text">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-chart-3/10 text-chart-3 korean-text mb-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            마켓플레이스 연동
          </div>
          <h1 className="text-4xl font-bold mb-4 korean-text" data-testid="text-page-title">마켓플레이스 연동 관리</h1>
          <p className="text-lg text-muted-foreground korean-text">
            다양한 플랫폼에 상품을 자동으로 동기화하고 관리하세요
          </p>
        </div>

        {/* Marketplace Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {marketplaces.map((marketplace) => (
            <Card key={marketplace.id} className="hover:shadow-lg transition-all">
              <CardHeader className="text-center">
                <div className="text-4xl mb-2">{marketplace.icon}</div>
                <CardTitle className="korean-text">{marketplace.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-4">
                  <p className="text-2xl font-bold english-text">
                    {syncs?.filter((sync: any) => sync.marketplace === marketplace.id && sync.status === "synced").length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground korean-text">동기화된 상품</p>
                </div>
                <div className="space-y-2">
                  <Button 
                    className="w-full korean-text" 
                    size="sm"
                    data-testid={`button-sync-${marketplace.id}`}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    동기화
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full korean-text" 
                    size="sm"
                    data-testid={`button-export-${marketplace.id}`}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV 다운로드
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sync Status */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="korean-text">동기화 현황</CardTitle>
              <Button variant="outline" size="sm" className="korean-text" data-testid="button-refresh-sync">
                <RefreshCw className="mr-2 h-4 w-4" />
                새로고침
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                    <div className="w-12 h-12 bg-muted rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                    <div className="h-6 w-20 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            ) : syncs && syncs.length > 0 ? (
              <div className="space-y-4">
                {syncs.map((sync: any, index: number) => (
                  <div key={sync.id || index} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(sync.status)}
                      <span className="text-2xl">
                        {marketplaces.find(m => m.id === sync.marketplace)?.icon || "🛍️"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium korean-text" data-testid={`text-sync-product-${index}`}>
                        {products?.find((p: any) => p.id === sync.productId)?.name || "상품명 불러오는 중..."}
                      </p>
                      <p className="text-sm text-muted-foreground korean-text">
                        {marketplaces.find(m => m.id === sync.marketplace)?.name || sync.marketplace}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      {getStatusBadge(sync.status)}
                      {sync.marketplaceProductId && (
                        <Button variant="ghost" size="sm" data-testid={`button-view-marketplace-${index}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold korean-text mb-2">동기화 내역이 없습니다</h3>
                <p className="text-muted-foreground korean-text mb-4">
                  등록된 상품을 마켓플레이스에 동기화해보세요.
                </p>
                <Button className="korean-text" data-testid="button-start-sync">
                  동기화 시작하기
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Integration Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="korean-text">연동 가이드</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold korean-text mb-2">자동 동기화 설정</h4>
                <ul className="space-y-2 text-sm text-muted-foreground korean-text">
                  <li>• API 키 설정으로 자동 업로드</li>
                  <li>• 실시간 재고 동기화</li>
                  <li>• 가격 정보 자동 업데이트</li>
                  <li>• 주문 상태 모니터링</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold korean-text mb-2">수동 업로드</h4>
                <ul className="space-y-2 text-sm text-muted-foreground korean-text">
                  <li>• CSV/Excel 파일 다운로드</li>
                  <li>• 각 마켓별 맞춤 포맷 제공</li>
                  <li>• 대량 상품 일괄 업로드</li>
                  <li>• 업로드 결과 확인</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
