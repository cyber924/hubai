import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Bot,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  Search,
  Star,
  Loader2,
  Package,
  ShoppingCart
} from "lucide-react";
import type { Product, OptimizationJob, OptimizationSuggestion } from "@shared/schema";

interface OptimizationJobWithDetails extends OptimizationJob {
  suggestions?: OptimizationSuggestion[];
}

export default function AIOptimization() {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [currentJob, setCurrentJob] = useState<OptimizationJobWithDetails | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const { toast } = useToast();

  // Fetch analyzed products (ready for optimization)
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
    select: (data: Product[]) => data.filter(p => p.status === "analyzed")
  });

  // Fetch optimization jobs
  const { data: jobs = [], refetch: refetchJobs } = useQuery<OptimizationJob[]>({
    queryKey: ['/api/optimization/jobs'],
  });

  // Fetch current job suggestions
  const { data: suggestions = [], refetch: refetchSuggestions } = useQuery<OptimizationSuggestion[]>({
    queryKey: ['/api/optimization/suggestions', currentJob?.id],
    enabled: !!currentJob?.id,
  });

  // Start optimization mutation
  const startOptimizationMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const response = await apiRequest('POST', '/api/optimization/selected', { productIds });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setCurrentJob(data.job);
      setShowJobDetails(true);
      setSelectedProducts([]);
      toast({
        title: "AI 최적화 시작",
        description: `${data.validProductsCount}개 상품의 AI 상품명 최적화가 시작되었습니다.`,
      });
      refetchJobs();
    },
    onError: (error: any) => {
      toast({
        title: "최적화 실패",
        description: error.message || "AI 최적화를 시작할 수 없습니다.",
        variant: "destructive",
      });
    }
  });

  // Apply suggestion mutation
  const applySuggestionMutation = useMutation({
    mutationFn: async ({ suggestionId, selectedName }: { suggestionId: string; selectedName: string }) => {
      const response = await apiRequest('PATCH', `/api/optimization/suggestions/${suggestionId}/apply`, { selectedName });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "상품명 변경 완료",
        description: data.message,
      });
      refetchSuggestions();
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error: any) => {
      toast({
        title: "변경 실패",
        description: error.message || "상품명 변경에 실패했습니다.",
        variant: "destructive",
      });
    }
  });

  // Poll for job updates
  useEffect(() => {
    if (currentJob && (currentJob.status === "pending" || currentJob.status === "running")) {
      const interval = setInterval(() => {
        refetchJobs();
        refetchSuggestions();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [currentJob, refetchJobs, refetchSuggestions]);

  // Update current job with latest data
  useEffect(() => {
    if (currentJob && jobs.length > 0) {
      const updatedJob = jobs.find((job: OptimizationJob) => job.id === currentJob.id);
      if (updatedJob) {
        setCurrentJob({ ...updatedJob, suggestions });
      }
    }
  }, [jobs, currentJob, suggestions]);

  const handleProductSelection = (productId: string, checked: boolean) => {
    setSelectedProducts(prev => 
      checked 
        ? [...prev, productId]
        : prev.filter(id => id !== productId)
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const startOptimization = () => {
    if (selectedProducts.length < 10) {
      toast({
        title: "선택 부족",
        description: "최소 10개 이상의 상품을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    startOptimizationMutation.mutate(selectedProducts);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "running":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const calculateProgress = (job: OptimizationJob) => {
    if (job.status === "completed") return 100;
    if (job.status === "failed") return 0;
    if (job.totalProducts === 0) return 0;
    return Math.round((job.processedProducts / job.totalProducts) * 100);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold korean-text flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            AI 상품명 최적화
          </h1>
          <p className="text-muted-foreground korean-text">
            AI가 상품명을 분석하여 트렌드와 SEO에 최적화된 상품명을 제안합니다
          </p>
        </div>
      </div>

      {/* AI 최적화 소개 */}
      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertDescription className="korean-text">
          <strong>AI 상품명 최적화 기능:</strong> 등록된 상품들의 이름을 AI가 분석하여 트렌드 키워드, SEO 최적화, 감성적 표현이 포함된 새로운 상품명을 제안합니다. 
          최소 10개 이상의 상품을 선택해야 합니다.
        </AlertDescription>
      </Alert>

      {showJobDetails && currentJob ? (
        /* Job Details View */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowJobDetails(false)}
              data-testid="button-back-to-products"
            >
              ← 상품 선택으로 돌아가기
            </Button>
          </div>

          {/* Job Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 korean-text">
                {getStatusIcon(currentJob.status || "pending")}
                AI 최적화 작업 진행 상황
              </CardTitle>
              <CardDescription>
                작업 ID: {currentJob.id || "알 수 없음"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentJob.totalProducts}</div>
                  <div className="text-sm text-muted-foreground korean-text">총 상품</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{currentJob.processedProducts}</div>
                  <div className="text-sm text-muted-foreground korean-text">처리된 상품</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{currentJob.successCount}</div>
                  <div className="text-sm text-muted-foreground korean-text">성공</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{currentJob.failureCount}</div>
                  <div className="text-sm text-muted-foreground korean-text">실패</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="korean-text">진행률</span>
                  <span>{calculateProgress(currentJob)}%</span>
                </div>
                <Progress value={calculateProgress(currentJob)} className="h-2" />
              </div>

              {currentJob.status === "running" && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="korean-text">AI가 상품명을 분석 중입니다...</span>
                </div>
              )}

              {currentJob.errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{currentJob.errorMessage}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Suggestions List */}
          {suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="korean-text">AI 상품명 제안</CardTitle>
                <CardDescription>
                  AI가 분석한 최적화된 상품명들입니다. 마음에 드는 상품명을 선택하여 적용하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {suggestions.map((suggestion: OptimizationSuggestion) => (
                      <div
                        key={suggestion.id}
                        className="border rounded-lg p-4 space-y-3"
                        data-testid={`suggestion-${suggestion.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium korean-text">원래 상품명</div>
                          <Badge 
                            variant={suggestion.status === "approved" ? "default" : "secondary"}
                            data-testid={`status-${suggestion.id}`}
                          >
                            {suggestion.status === "approved" ? "적용됨" : "대기중"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                          {suggestion.originalName}
                        </div>

                        <div className="space-y-2">
                          <div className="font-medium korean-text flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            AI 제안 상품명
                          </div>
                          {Array.isArray(suggestion.suggestedNames) && suggestion.suggestedNames.map((name: string, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-2">
                              <div className="flex-1 p-2 bg-blue-50 dark:bg-blue-950 rounded text-sm">
                                {name}
                              </div>
                              {suggestion.status !== "approved" && (
                                <Button
                                  size="sm"
                                  onClick={() => applySuggestionMutation.mutate({
                                    suggestionId: suggestion.id,
                                    selectedName: name
                                  })}
                                  disabled={applySuggestionMutation.isPending}
                                  data-testid={`apply-suggestion-${suggestion.id}-${index}`}
                                >
                                  {applySuggestionMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "적용"
                                  )}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>

                        {suggestion.aiAnalysis && typeof suggestion.aiAnalysis === 'object' && (
                          <div className="space-y-2 mt-3 pt-3 border-t">
                            <div className="font-medium korean-text">AI 분석 결과</div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="text-center">
                                <div className="font-bold text-lg text-green-600">
                                  {(suggestion.aiAnalysis as any).trendScore || 0}
                                </div>
                                <div className="text-muted-foreground korean-text">트렌드 점수</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-lg text-blue-600">
                                  {(suggestion.aiAnalysis as any).seoScore || 0}
                                </div>
                                <div className="text-muted-foreground korean-text">SEO 점수</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-lg text-purple-600">
                                  {(suggestion.aiAnalysis as any).keywordDensity || 0}
                                </div>
                                <div className="text-muted-foreground korean-text">키워드 밀도</div>
                              </div>
                            </div>
                            {(suggestion.aiAnalysis as any).suggestions && Array.isArray((suggestion.aiAnalysis as any).suggestions) && (
                              <div className="mt-2">
                                <div className="text-sm font-medium korean-text">개선 제안:</div>
                                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                                  {(suggestion.aiAnalysis as any).suggestions.map((item: string, idx: number) => (
                                    <li key={idx} className="flex items-center gap-2">
                                      <TrendingUp className="h-3 w-3" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Product Selection View */
        <div className="space-y-6">
          {/* Recent Jobs */}
          {jobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="korean-text">최근 AI 최적화 작업</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {jobs.slice(0, 3).map((job: OptimizationJob) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setCurrentJob(job);
                        setShowJobDetails(true);
                      }}
                      data-testid={`job-${job.id || 'unknown'}`}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <div className="font-medium">
                            {job.totalProducts}개 상품 최적화
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {job.createdAt ? new Date(job.createdAt).toLocaleDateString('ko-KR') : '날짜 없음'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(job.status)}`} />
                        <Badge variant="secondary">{calculateProgress(job)}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="korean-text flex items-center gap-2">
                <Package className="h-5 w-5" />
                등록된 상품 선택 ({selectedProducts.length}/{products.length})
              </CardTitle>
              <CardDescription>
                AI 최적화를 원하는 상품을 선택하세요. 최소 10개 이상 선택해야 합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedProducts.length === products.length && products.length > 0}
                    onCheckedChange={handleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                  <label className="korean-text">전체 선택</label>
                </div>
                <Button
                  onClick={startOptimization}
                  disabled={selectedProducts.length < 10 || startOptimizationMutation.isPending}
                  className="korean-text"
                  data-testid="button-start-optimization"
                >
                  {startOptimizationMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      AI 최적화 시작 중...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      AI 최적화 시작 ({selectedProducts.length}개)
                    </>
                  )}
                </Button>
              </div>

              {selectedProducts.length < 10 && selectedProducts.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="korean-text">
                    {10 - selectedProducts.length}개 더 선택해주세요. (최소 10개 필요)
                  </AlertDescription>
                </Alert>
              )}

              {productsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2 korean-text">상품을 불러오는 중...</span>
                </div>
              ) : products.length === 0 ? (
                <Alert>
                  <ShoppingCart className="h-4 w-4" />
                  <AlertDescription className="korean-text">
                    등록된 상품이 없습니다. 먼저 상품을 등록해주세요.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-96">
                  <div className="grid gap-3">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                        data-testid={`product-${product.id}`}
                      >
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => handleProductSelection(product.id, checked as boolean)}
                          data-testid={`checkbox-product-${product.id}`}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {product.category} • ₩{product.price?.toLocaleString()}
                          </div>
                        </div>
                        <Badge variant="outline" className="korean-text">등록됨</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}