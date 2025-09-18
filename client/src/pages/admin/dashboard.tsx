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

  const { data: scrapingJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/scraping/jobs'],
    queryFn: () => api.getScrapingJobs(5),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const handleStartScraping = async () => {
    try {
      await api.startScraping();
      // Invalidate queries to refresh data
    } catch (error) {
      console.error('Failed to start scraping:', error);
    }
  };

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "running":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="secondary" className="korean-text">완료</Badge>;
      case "running":
        return <Badge variant="outline" className="korean-text">실행중</Badge>;
      case "failed":
        return <Badge variant="destructive" className="korean-text">실패</Badge>;
      default:
        return <Badge variant="outline" className="korean-text">{status}</Badge>;
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
              실시간 수집 현황과 AI 분석 결과를 확인하세요
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
            {/* Scraping Jobs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="korean-text">수집 작업 현황</CardTitle>
                  <Button 
                    size="sm" 
                    onClick={handleStartScraping}
                    className="korean-text"
                    data-testid="button-start-scraping"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    수집 시작
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 p-3 border rounded-lg animate-pulse">
                        <div className="w-8 h-8 bg-muted rounded"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                          <div className="h-3 bg-muted rounded w-1/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : scrapingJobs && scrapingJobs.length > 0 ? (
                  <div className="space-y-4">
                    {scrapingJobs.map((job) => (
                      <div key={job.id} className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-2">
                          {getJobStatusIcon(job.status)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium korean-text" data-testid={`text-job-source-${job.id}`}>
                            {job.source} 수집
                          </p>
                          <p className="text-sm text-muted-foreground korean-text">
                            {job.productsProcessed}/{job.productsFound} 처리됨
                          </p>
                        </div>
                        <div>
                          {getJobStatusBadge(job.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground korean-text">수집 작업이 없습니다</p>
                  </div>
                )}
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
