import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ProductCard from "@/components/product-card";
import { Sparkles, Play, Download, Bot, RefreshCw, TrendingUp, BarChart3, ArrowRight } from "lucide-react";

export default function Home() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=8');
      return res.json();
    },
  });

  const { data: stats } = useQuery<{total: number; analyzed: number; registered: number; synced: number}>({
    queryKey: ['/api/stats/products'],
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(262,83%,58%,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(151,55%,53%,0.1),transparent_50%)]"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary korean-text">
                <Bot className="mr-2 h-4 w-4" />
                AI 자동화 서비스
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 korean-text" data-testid="text-hero-title">
              <span className="text-foreground">AI가 패션 트렌드를</span><br/>
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">자동으로 수집하고</span><br/>
              <span className="text-foreground">내 쇼핑몰로 연결</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto korean-text" data-testid="text-hero-subtitle">
              수집 · 분석 · 등록까지 한 번에. 트렌드를 놓치지 않는 스마트 쇼핑몰을 만들어보세요.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link href="/subscribe">
                <Button size="lg" className="w-full sm:w-auto korean-text transform hover:scale-105" data-testid="button-start-free">
                  <Sparkles className="mr-2 h-5 w-5" />
                  무료로 시작하기
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="w-full sm:w-auto korean-text" data-testid="button-demo">
                <Play className="mr-2 h-5 w-5" />
                데모 보기
              </Button>
            </div>
            
            {/* Trust Indicators */}
            {stats && (
              <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary english-text" data-testid="text-stat-total">{stats.total}+</div>
                  <div className="text-sm text-muted-foreground korean-text">월 처리 상품</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary english-text" data-testid="text-stat-accuracy">95%</div>
                  <div className="text-sm text-muted-foreground korean-text">정확도</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-chart-3 english-text">24/7</div>
                  <div className="text-sm text-muted-foreground korean-text">자동 운영</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 korean-text" data-testid="text-features-title">StyleHub의 핵심 기능</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto korean-text">
              AI 기술로 패션 트렌드를 실시간 분석하고, 자동으로 쇼핑몰을 운영하세요.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="p-8 hover:shadow-lg transition-all group">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Bot className="text-primary h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-4 korean-text">Gemini AI 분석</h3>
                <p className="text-muted-foreground mb-4 korean-text">
                  구글 Gemini AI가 트렌드를 분석하고 카테고리, 태그, 시즌별 추천을 제공합니다.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground korean-text">
                  <li className="flex items-center">
                    <TrendingUp className="text-secondary mr-2 h-4 w-4" />
                    자동 카테고리 분류
                  </li>
                  <li className="flex items-center">
                    <TrendingUp className="text-secondary mr-2 h-4 w-4" />
                    트렌드 태그 생성
                  </li>
                  <li className="flex items-center">
                    <TrendingUp className="text-secondary mr-2 h-4 w-4" />
                    가격 추천
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            {/* Feature 2 */}
            <Card className="p-8 hover:shadow-lg transition-all group">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-secondary/20 transition-colors">
                  <Download className="text-secondary h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-4 korean-text">자동 상품 수집</h3>
                <p className="text-muted-foreground mb-4 korean-text">
                  네이버, 쿠팡의 인기 상품을 실시간으로 수집하고 분석합니다.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground korean-text">
                  <li className="flex items-center">
                    <TrendingUp className="text-secondary mr-2 h-4 w-4" />
                    실시간 크롤링
                  </li>
                  <li className="flex items-center">
                    <TrendingUp className="text-secondary mr-2 h-4 w-4" />
                    인기 상품 우선 수집
                  </li>
                  <li className="flex items-center">
                    <TrendingUp className="text-secondary mr-2 h-4 w-4" />
                    중복 상품 자동 제거
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            {/* Feature 3 */}
            <Card className="p-8 hover:shadow-lg transition-all group">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-chart-3/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-chart-3/20 transition-colors">
                  <RefreshCw className="text-chart-3 h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-4 korean-text">마켓플레이스 연동</h3>
                <p className="text-muted-foreground mb-4 korean-text">
                  네이버 스마트스토어, 쿠팡, 지그재그 등 다양한 플랫폼에 자동 등록합니다.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground korean-text">
                  <li className="flex items-center">
                    <TrendingUp className="text-secondary mr-2 h-4 w-4" />
                    원클릭 등록
                  </li>
                  <li className="flex items-center">
                    <TrendingUp className="text-secondary mr-2 h-4 w-4" />
                    포맷 자동 변환
                  </li>
                  <li className="flex items-center">
                    <TrendingUp className="text-secondary mr-2 h-4 w-4" />
                    재고 동기화
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Product Showcase */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 korean-text" data-testid="text-products-title">AI가 추천하는 트렌드 상품</h2>
            <p className="text-lg text-muted-foreground korean-text">
              실시간으로 분석된 인기 상품들을 확인해보세요
            </p>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {products?.slice(0, 8).map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          
          <div className="text-center">
            <Link href="/ai-picks">
              <Button className="korean-text" data-testid="button-view-more-products">
                더 많은 상품 보기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 korean-text">관리자 대시보드</h2>
            <p className="text-lg text-muted-foreground korean-text">
              실시간 데이터와 AI 분석 결과를 한눈에 확인하세요
            </p>
          </div>
          
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <Card className="p-6">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Download className="text-primary h-6 w-6" />
                    </div>
                    <span className="text-sm text-secondary font-medium korean-text">+12%</span>
                  </div>
                  <div className="text-2xl font-bold mb-1 english-text" data-testid="text-stat-collected">{stats.total}</div>
                  <div className="text-sm text-muted-foreground korean-text">오늘 수집된 상품</div>
                </CardContent>
              </Card>
              
              <Card className="p-6">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                      <Bot className="text-secondary h-6 w-6" />
                    </div>
                    <span className="text-sm text-secondary font-medium korean-text">+8%</span>
                  </div>
                  <div className="text-2xl font-bold mb-1 english-text" data-testid="text-stat-analyzed">{stats.analyzed}</div>
                  <div className="text-sm text-muted-foreground korean-text">AI 분석 완료</div>
                </CardContent>
              </Card>
              
              <Card className="p-6">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-chart-3/10 rounded-xl flex items-center justify-center">
                      <BarChart3 className="text-chart-3 h-6 w-6" />
                    </div>
                    <span className="text-sm text-secondary font-medium korean-text">+15%</span>
                  </div>
                  <div className="text-2xl font-bold mb-1 english-text" data-testid="text-stat-registered">{stats.registered}</div>
                  <div className="text-sm text-muted-foreground korean-text">자사몰 등록</div>
                </CardContent>
              </Card>
              
              <Card className="p-6">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-chart-4/10 rounded-xl flex items-center justify-center">
                      <RefreshCw className="text-chart-4 h-6 w-6" />
                    </div>
                    <span className="text-sm text-secondary font-medium korean-text">+5%</span>
                  </div>
                  <div className="text-2xl font-bold mb-1 english-text" data-testid="text-stat-synced">{stats.synced}</div>
                  <div className="text-sm text-muted-foreground korean-text">마켓 동기화</div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <div className="text-center">
            <Link href="/admin">
              <Button className="korean-text" data-testid="button-view-dashboard">
                대시보드 보기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
