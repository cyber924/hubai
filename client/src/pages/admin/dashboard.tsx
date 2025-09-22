import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdminSidebar from "@/components/admin-sidebar";
import { api } from "@/lib/api";
import { 
  Download, 
  Bot, 
  Package, 
  RefreshCw, 
  TrendingUp,
  Play,
  AlertCircle,
  CheckCircle,
  Users,
  Crown,
  Shield
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/stats/products'],
    queryFn: api.getProductStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: userStats, isLoading: userStatsLoading } = useQuery<{total: number; premium: number; free: number; admin: number}>({
    queryKey: ['/api/stats/users'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: recentProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products', 'recent'],
    queryFn: () => api.getProducts({ limit: 10 }),
  });

  const { data: recentUploads, isLoading: uploadsLoading } = useQuery({
    queryKey: ['/api/products', 'csv_uploads'],
    queryFn: () => api.getProducts({ limit: 5, source: 'csv_upload' }),
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('csvFile', file);

    try {
      const response = await fetch('/api/admin/upload-csv', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        // Refresh product data
        window.location.reload();
      }
    } catch (error) {
      console.error('CSV 업로드 실패:', error);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="flex">
        <AdminSidebar className="fixed left-0 top-0 h-screen" />
        
        <div className="flex-1 ml-64 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold korean-text" data-testid="text-dashboard-title">관리자 대시보드</h1>
            <p className="text-muted-foreground korean-text">
              상품 업로드와 AI 분석 결과를 확인하세요
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Download className="text-primary h-6 w-6" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-secondary" />
                </div>
                <div className="text-2xl font-bold mb-1 english-text" data-testid="text-total-products">
                  {statsLoading ? "..." : stats?.total || 0}
                </div>
                <div className="text-sm text-muted-foreground korean-text">수집된 상품</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                    <Bot className="text-secondary h-6 w-6" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-secondary" />
                </div>
                <div className="text-2xl font-bold mb-1 english-text" data-testid="text-analyzed-products">
                  {statsLoading ? "..." : stats?.analyzed || 0}
                </div>
                <div className="text-sm text-muted-foreground korean-text">AI 분석 완료</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-chart-3/10 rounded-xl flex items-center justify-center">
                    <Package className="text-chart-3 h-6 w-6" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-secondary" />
                </div>
                <div className="text-2xl font-bold mb-1 english-text" data-testid="text-registered-products">
                  {statsLoading ? "..." : stats?.registered || 0}
                </div>
                <div className="text-sm text-muted-foreground korean-text">자사몰 등록</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-chart-4/10 rounded-xl flex items-center justify-center">
                    <RefreshCw className="text-chart-4 h-6 w-6" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-secondary" />
                </div>
                <div className="text-2xl font-bold mb-1 english-text" data-testid="text-synced-products">
                  {statsLoading ? "..." : stats?.synced || 0}
                </div>
                <div className="text-sm text-muted-foreground korean-text">마켓 동기화</div>
              </CardContent>
            </Card>

            {/* User Stats Cards */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Users className="text-blue-500 h-6 w-6" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-secondary" />
                </div>
                <div className="text-2xl font-bold mb-1 english-text" data-testid="text-total-users">
                  {userStatsLoading ? "..." : userStats?.total || 0}
                </div>
                <div className="text-sm text-muted-foreground korean-text">총 회원수</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                    <Crown className="text-yellow-500 h-6 w-6" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-secondary" />
                </div>
                <div className="text-2xl font-bold mb-1 english-text" data-testid="text-premium-users">
                  {userStatsLoading ? "..." : userStats?.premium || 0}
                </div>
                <div className="text-sm text-muted-foreground korean-text">프리미엄 회원</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <Shield className="text-green-500 h-6 w-6" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-secondary" />
                </div>
                <div className="text-2xl font-bold mb-1 english-text" data-testid="text-admin-users">
                  {userStatsLoading ? "..." : userStats?.admin || 0}
                </div>
                <div className="text-sm text-muted-foreground korean-text">관리자</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* CSV Upload */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="korean-text">상품 업로드</CardTitle>
                  <Button 
                    size="sm"
                    onClick={() => document.getElementById('csv-upload')?.click()}
                    className="korean-text"
                    data-testid="button-upload-csv"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV 업로드
                  </Button>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center">
                    <Download className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground korean-text mb-2">
                      CSV 파일을 업로드하여 상품을 일괄 등록하세요
                    </p>
                    <p className="text-xs text-muted-foreground korean-text">
                      필수 필드: name, price, description, category, brand
                    </p>
                  </div>
                  
                  {uploadsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg animate-pulse">
                          <div className="w-6 h-6 bg-muted rounded"></div>
                          <div className="flex-1">
                            <div className="h-3 bg-muted rounded w-2/3 mb-1"></div>
                            <div className="h-2 bg-muted rounded w-1/3"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentUploads && recentUploads.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium korean-text">최근 업로드된 상품</p>
                      {recentUploads.map((product: any) => (
                        <div key={product.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate korean-text">
                              {product.name}
                            </p>
                            <p className="text-xs text-muted-foreground korean-text">
                              ₩{Number(product.price).toLocaleString()} • {product.category}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Package className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground korean-text">
                        아직 업로드된 상품이 없습니다
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Products */}
            <Card>
              <CardHeader>
                <CardTitle className="korean-text">최근 분석 상품</CardTitle>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 p-3 rounded-lg animate-pulse">
                        <div className="w-10 h-10 bg-muted rounded"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentProducts && recentProducts.length > 0 ? (
                  <div className="space-y-4">
                    {recentProducts.slice(0, 5).map((product: any) => (
                      <div key={product.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        {product.imageUrl && (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover"
                            data-testid={`img-recent-product-${product.id}`}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate korean-text" data-testid={`text-recent-product-name-${product.id}`}>
                            {product.name}
                          </p>
                          <p className="text-xs text-muted-foreground korean-text">
                            {product.source} • ₩{Number(product.price).toLocaleString()}
                          </p>
                        </div>
                        <Badge 
                          variant={product.status === "analyzed" ? "secondary" : "outline"}
                          className="korean-text text-xs"
                        >
                          {product.status === "analyzed" ? "분석완료" : "처리중"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground korean-text">최근 상품이 없습니다</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
