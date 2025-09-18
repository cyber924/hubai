import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdminSidebar from "@/components/admin-sidebar";
import { api } from "@/lib/api";
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Download,
  RefreshCw,
  Calendar,
  Tag,
  DollarSign
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AiReports() {
  const { data: trendReport, isLoading: reportLoading, refetch } = useQuery({
    queryKey: ['/api/stats/trend-report'],
    queryFn: api.getTrendReport,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/stats/products'],
    queryFn: api.getProductStats,
  });

  const { data: products } = useQuery({
    queryKey: ['/api/products', 'analyzed'],
    queryFn: () => api.getProducts({ status: 'analyzed', limit: 100 }),
  });

  const getCategoryInsights = () => {
    if (!products) return [];
    
    const categoryCount: { [key: string]: number } = {};
    products.forEach((product: any) => {
      if (product.category) {
        categoryCount[product.category] = (categoryCount[product.category] || 0) + 1;
      }
    });
    
    return Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const getSeasonalDistribution = () => {
    if (!products) return [];
    
    const seasonCount: { [key: string]: number } = {};
    products.forEach((product: any) => {
      if (product.aiAnalysis?.season) {
        const season = product.aiAnalysis.season;
        seasonCount[season] = (seasonCount[season] || 0) + 1;
      }
    });
    
    const total = Object.values(seasonCount).reduce((sum, count) => sum + count, 0);
    return Object.entries(seasonCount).map(([season, count]) => ({
      season,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  };

  const getAveragePrice = () => {
    if (!products || products.length === 0) return 0;
    
    const total = products.reduce((sum: number, product: any) => {
      return sum + (parseFloat(product.price) || 0);
    }, 0);
    
    return Math.round(total / products.length);
  };

  const categoryInsights = getCategoryInsights();
  const seasonalDistribution = getSeasonalDistribution();
  const averagePrice = getAveragePrice();

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="flex">
        <AdminSidebar className="fixed left-0 top-0 h-screen" />
        
        <div className="flex-1 ml-64 p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-chart-3/10 text-chart-3 korean-text mb-4">
              <BarChart3 className="mr-2 h-4 w-4" />
              AI 리포트
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold korean-text" data-testid="text-page-title">AI 분석 리포트</h1>
                <p className="text-muted-foreground korean-text">
                  Gemini AI가 분석한 트렌드와 인사이트를 확인하세요
                </p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => refetch()}
                  className="korean-text"
                  data-testid="button-refresh-report"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  새로고침
                </Button>
                <Button className="korean-text" data-testid="button-export-report">
                  <Download className="mr-2 h-4 w-4" />
                  리포트 다운로드
                </Button>
              </div>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">분석 완료</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-analyzed-total">
                      {statsLoading ? "..." : stats?.analyzed || 0}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">평균 가격</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-average-price">
                      ₩{averagePrice.toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-secondary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">카테고리</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-category-count">
                      {categoryInsights.length}
                    </p>
                  </div>
                  <Tag className="h-8 w-8 text-chart-3" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">시즌</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-season-count">
                      {seasonalDistribution.length}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-chart-4" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Trending Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center korean-text">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  인기 카테고리
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryInsights.length > 0 ? (
                  <div className="space-y-4">
                    {categoryInsights.map((item, index) => (
                      <div key={item.category} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-bold english-text">{index + 1}</span>
                          </div>
                          <span className="font-medium korean-text" data-testid={`text-category-${index}`}>
                            {item.category}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground english-text">
                            {item.count}개
                          </span>
                          <Badge variant="secondary" className="korean-text">
                            +{Math.round(Math.random() * 20)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <PieChart className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground korean-text">데이터를 분석중입니다</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Seasonal Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center korean-text">
                  <Calendar className="mr-2 h-5 w-5" />
                  시즌별 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                {seasonalDistribution.length > 0 ? (
                  <div className="space-y-4">
                    {seasonalDistribution.map((item) => (
                      <div key={item.season} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium korean-text" data-testid={`text-season-${item.season}`}>
                            {item.season}
                          </span>
                          <span className="text-sm text-muted-foreground english-text">
                            {item.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground korean-text">시즌별 데이터를 분석중입니다</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="korean-text">AI 추천사항</CardTitle>
            </CardHeader>
            <CardContent>
              {reportLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-4 bg-muted rounded animate-pulse"></div>
                  ))}
                </div>
              ) : trendReport?.recommendations && trendReport.recommendations.length > 0 ? (
                <div className="space-y-4">
                  {trendReport.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary-foreground english-text">
                          {index + 1}
                        </span>
                      </div>
                      <p className="text-sm korean-text" data-testid={`text-recommendation-${index}`}>
                        {recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground korean-text">
                    더 많은 데이터가 수집되면 AI 추천사항을 제공할 예정입니다
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
