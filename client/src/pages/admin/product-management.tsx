import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminSidebar from "@/components/admin-sidebar";
import ProductDetailModal from "@/components/ProductDetailModal";
import ProductEditModal from "@/components/ProductEditModal";
import { api, type RegistrationJob } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Edit, 
  RefreshCw,
  CheckCircle,
  Upload,
  Download,
  ShoppingCart,
  Eye,
  FileSpreadsheet,
  Check,
  Square,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Trash2
} from "lucide-react";
import type { Product } from "@shared/schema";

export default function ProductManagement() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeJobIds, setActiveJobIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const ITEMS_PER_PAGE = 50;

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['/api/products', 'management', statusFilter],
    queryFn: () => {
      const params: any = { limit: 1000 }; // 모든 상품 보기
      if (statusFilter !== 'all') params.status = statusFilter;
      return api.getProducts(params);
    },
    staleTime: 30000, // 30초 동안 fresh 상태 유지
    retry: 3, // 실패시 3번 재시도
  });

  // Real-time polling for registration jobs
  const { data: registrationJobs } = useQuery({
    queryKey: ['/api/registration/jobs'],
    queryFn: () => api.getRegistrationJobs(10),
    refetchInterval: activeJobIds.size > 0 ? 5000 : false, // Poll every 5 seconds if there are active jobs (Vercel optimized)
    refetchOnWindowFocus: false,
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => api.updateProduct(id, updates),
    onSuccess: () => {
      toast({
        title: "성공",
        description: "상품이 업데이트되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "상품 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const createMarketplaceSyncMutation = useMutation({
    mutationFn: api.createMarketplaceSync,
    onSuccess: () => {
      toast({
        title: "성공",
        description: "마켓플레이스 동기화가 시작되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace-syncs'] });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "마켓플레이스 동기화에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (productId: string, newStatus: string) => {
    updateProductMutation.mutate({
      id: productId,
      updates: { status: newStatus }
    });
  };

  const handleRegisterToStore = async (productId: string) => {
    setIsRegistering(true);
    try {
      const response = await api.registerSelectedProducts([productId]);
      
      // Add new job to active jobs tracking
      if (response.job?.id) {
        setActiveJobIds(prev => new Set(prev).add(response.job.id));
      }
      
      toast({
        title: "등록 작업 시작",
        description: "상품 등록이 시작되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    } catch (error) {
      toast({
        title: "등록 실패",
        description: "상품 등록에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSyncToMarketplace = (productId: string, marketplace: string) => {
    createMarketplaceSyncMutation.mutate({
      productId,
      marketplace,
      status: "pending"
    });
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: "삭제 완료",
          description: "상품이 성공적으로 삭제되었습니다.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
        refetch();
      } else {
        const error = await response.json();
        toast({
          title: "삭제 실패",
          description: error.message || "상품 삭제에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "삭제 실패",
        description: "네트워크 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("정말로 모든 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    try {
      const response = await fetch('/api/admin/products', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "전체 삭제 완료",
          description: `${result.deletedCount}개 상품이 성공적으로 삭제되었습니다.`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
        refetch();
        setSelectedProductIds(new Set());
      } else {
        const error = await response.json();
        toast({
          title: "전체 삭제 실패",
          description: error.message || "전체 상품 삭제에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "전체 삭제 실패",
        description: "네트워크 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedProductIds.size === 0) {
      toast({
        title: "선택된 상품이 없습니다",
        description: "삭제할 상품을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`선택한 ${selectedProductIds.size}개 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/products/selected', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          productIds: Array.from(selectedProductIds)
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "선택 삭제 완료",
          description: `${result.deletedCount}개 상품이 성공적으로 삭제되었습니다.`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
        refetch();
        setSelectedProductIds(new Set());
      } else {
        const error = await response.json();
        toast({
          title: "선택 삭제 실패",
          description: error.message || "선택된 상품 삭제에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "선택 삭제 실패",
        description: "네트워크 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedProduct(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedProduct(null);
  };

  // Selection functions
  const handleProductSelect = (productId: string, checked: boolean) => {
    const newSelection = new Set(selectedProductIds);
    if (checked) {
      newSelection.add(productId);
    } else {
      newSelection.delete(productId);
    }
    setSelectedProductIds(newSelection);
  };

  const handleSelectAll = () => {
    const analyzedProducts = products?.filter((p: any) => p.status === "analyzed") || [];
    const allIds = analyzedProducts.map((p: any) => p.id);
    setSelectedProductIds(new Set(allIds));
  };

  const handleDeselectAll = () => {
    setSelectedProductIds(new Set());
  };

  // Registration functions
  const handleRegisterSelected = async () => {
    if (selectedProductIds.size === 0) {
      toast({
        title: "선택된 상품이 없습니다",
        description: "등록할 상품을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    const selectedIds = Array.from(selectedProductIds);
    if (import.meta.env.DEV) {
      console.log("등록할 상품 IDs:", selectedIds);
      console.log("선택된 상품들:", selectedIds.map(id => products?.find((p: any) => p.id === id)?.name || id));
    }

    setIsRegistering(true);
    try {
      const response = await api.registerSelectedProducts(selectedIds);
      
      if (import.meta.env.DEV) {
        console.log("등록 응답:", response);
      }
      
      // Add new job to active jobs tracking
      if (response.job?.id) {
        setActiveJobIds(prev => {
          const newSet = new Set(prev).add(response.job.id);
          if (import.meta.env.DEV) {
            console.log("Active jobs updated:", Array.from(newSet));
          }
          return newSet;
        });
      }
      
      toast({
        title: "등록 작업 시작",
        description: `${selectedProductIds.size}개 상품 등록이 시작되었습니다.`,
      });
      setSelectedProductIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("등록 에러:", error);
      }
      toast({
        title: "등록 실패",
        description: "선택된 상품 등록에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRegisterAll = async () => {
    setIsRegistering(true);
    try {
      const response = await api.registerAllProducts();
      
      // Add new job to active jobs tracking
      if (response.job?.id) {
        setActiveJobIds(prev => new Set(prev).add(response.job.id));
      }
      
      toast({
        title: "전체 등록 작업 시작",
        description: "모든 상품 등록이 시작되었습니다.",
      });
      setSelectedProductIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    } catch (error) {
      toast({
        title: "등록 실패",
        description: "전체 상품 등록에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
    } else {
      toast({
        title: "오류",
        description: "CSV 파일만 업로드 가능합니다.",
        variant: "destructive",
      });
    }
  };

  const handleCsvUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "오류", 
        description: "파일을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('csvFile', selectedFile);
      
      const response = await fetch('/api/products/upload-csv', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "성공",
          description: `${result.successCount}개 상품이 등록되었습니다. ${result.errorCount > 0 ? `${result.errorCount}개 오류` : ''}`,
        });
        
        // Reset form
        setSelectedFile(null);
        const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Refresh products list
        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
        refetch();
      } else {
        toast({
          title: "오류",
          description: result.message || "CSV 업로드에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "CSV 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCsvSampleDownload = async () => {
    try {
      const response = await fetch('/api/products/csv-sample', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        // 파일 다운로드 처리
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'products_sample.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "성공",
          description: "CSV 샘플 파일이 다운로드되었습니다.",
        });
      } else {
        const result = await response.json();
        toast({
          title: "오류",
          description: result.message || "CSV 샘플 다운로드에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "CSV 샘플 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // Clear selection when filter changes
  useEffect(() => {
    setSelectedProductIds(new Set());
  }, [statusFilter]);

  // Track active registration jobs and handle completion
  useEffect(() => {
    if (!registrationJobs) return;

    if (import.meta.env.DEV) {
      console.log("Polling registration jobs:", registrationJobs);
      console.log("Current active job IDs:", Array.from(activeJobIds));
    }

    const currentActiveJobs = new Set<string>();
    const completedJobs = new Set<string>();

    registrationJobs.forEach((job: RegistrationJob) => {
      if (job.status === 'running' || job.status === 'pending') {
        currentActiveJobs.add(job.id);
      } else if ((job.status === 'completed' || job.status === 'failed') && activeJobIds.has(job.id)) {
        completedJobs.add(job.id);
      }
    });

    if (import.meta.env.DEV) {
      console.log("Current active jobs:", Array.from(currentActiveJobs));
      console.log("Completed jobs:", Array.from(completedJobs));
    }

    // Handle completed jobs
    if (completedJobs.size > 0) {
      completedJobs.forEach(jobId => {
        const job = registrationJobs.find((j: RegistrationJob) => j.id === jobId);
        if (job) {
          if (import.meta.env.DEV) {
            console.log("Processing completed job:", job);
          }
          
          if (job.status === 'completed') {
            toast({
              title: "등록 완료",
              description: `${job.successCount}개 상품이 성공적으로 등록되었습니다.`,
            });
          } else if (job.status === 'failed') {
            toast({
              title: "등록 실패",
              description: job.errorMessage || "등록 중 오류가 발생했습니다.",
              variant: "destructive",
            });
          }
        }
      });

      // Refresh products list after job completion
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    }

    // Update active job IDs
    setActiveJobIds(currentActiveJobs);

    // Stop registration state if no active jobs
    if (currentActiveJobs.size === 0 && isRegistering) {
      setIsRegistering(false);
    }
  }, [registrationJobs, activeJobIds, isRegistering, toast, queryClient]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "analyzed":
        return <Badge variant="secondary" className="korean-text">분석완료</Badge>;
      case "registered":
        return <Badge variant="outline" className="korean-text">등록완료</Badge>;
      case "pending":
        return <Badge variant="destructive" className="korean-text">대기중</Badge>;
      default:
        return <Badge variant="outline" className="korean-text">{status}</Badge>;
    }
  };

  const registeredProducts = products?.filter((p: any) => p.status === "registered") || [];
  const analyzedProducts = products?.filter((p: any) => p.status === "analyzed") || [];
  const pendingProducts = products?.filter((p: any) => p.status === "pending") || [];

  // 페이지네이션 계산
  const totalProducts = products?.length || 0;
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = products?.slice(startIndex, endIndex) || [];

  // 페이지 변경시 currentPage 초기화
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // totalPages 변경시 currentPage clamp 처리
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="flex">
        <AdminSidebar className="fixed left-0 top-0 h-screen" />
        
        <div className="flex-1 ml-64 p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-secondary/10 text-secondary korean-text mb-4">
              <Package className="mr-2 h-4 w-4" />
              상품 관리
            </div>
            <h1 className="text-3xl font-bold korean-text" data-testid="text-page-title">상품 관리</h1>
            <p className="text-muted-foreground korean-text">
              상품 상태를 관리하고 마켓플레이스에 등록하세요
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">등록 가능</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-analyzed-count">{analyzedProducts.length}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">등록완료</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-registered-count">{registeredProducts.length}</p>
                  </div>
                  <Upload className="h-8 w-8 text-secondary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground korean-text">처리 대기</p>
                    <p className="text-3xl font-bold english-text" data-testid="text-pending-count">{pendingProducts.length}</p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-chart-3" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="korean-text">상태별 필터</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status-filter">
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 상태</SelectItem>
                    <SelectItem value="pending">대기중</SelectItem>
                    <SelectItem value="analyzed">분석완료</SelectItem>
                    <SelectItem value="registered">등록완료</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  onClick={() => refetch()}
                  className="korean-text"
                  data-testid="button-refresh"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  새로고침
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Registration Progress Section */}
          {activeJobIds.size > 0 && registrationJobs && (
            <Card className="mb-8 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="korean-text flex items-center text-blue-800 dark:text-blue-200">
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  등록 작업 진행 중
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {registrationJobs
                  .filter((job: RegistrationJob) => activeJobIds.has(job.id))
                  .map((job: RegistrationJob) => (
                    <div key={job.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="korean-text font-medium">
                          {job.type === 'bulk' ? '전체 상품 등록' : 
                           job.type === 'selected' ? `선택된 상품 등록` : '개별 상품 등록'}
                        </span>
                        <span className="text-muted-foreground">
                          {job.processedProducts}/{job.totalProducts}
                        </span>
                      </div>
                      <Progress 
                        value={(job.processedProducts / job.totalProducts) * 100} 
                        className="h-2"
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>성공: {job.successCount}개</span>
                        <span>실패: {job.failureCount}개</span>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* CSV Upload Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="korean-text flex items-center">
                <FileSpreadsheet className="mr-2 h-5 w-5" />
                CSV 대량 등록
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground korean-text">
                  CSV 파일로 상품을 대량 등록할 수 있습니다. 
                  <br />
                  필수 컬럼: name, price | 선택 컬럼: description, originalPrice, imageUrl, imageUrls, category, subcategory, brand, source, tags, season, gender, ageGroup
                </p>
                
                <div className="flex items-center space-x-4">
                  <Button
                    variant="secondary"
                    onClick={handleCsvSampleDownload}
                    className="korean-text"
                    data-testid="button-download-csv-sample"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV 샘플 다운로드
                  </Button>
                  
                  <input
                    id="csv-file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('csv-file-input')?.click()}
                    className="korean-text"
                    data-testid="button-select-csv"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    파일 선택
                  </Button>
                  
                  {selectedFile && (
                    <span className="text-sm text-muted-foreground korean-text">
                      선택된 파일: {selectedFile.name}
                    </span>
                  )}
                  
                  <Button
                    onClick={handleCsvUpload}
                    disabled={!selectedFile || isUploading}
                    className="korean-text"
                    data-testid="button-upload-csv"
                  >
                    {isUploading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                    )}
                    {isUploading ? '업로드 중...' : 'CSV 업로드'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="korean-text">상품 목록</CardTitle>
                <div className="flex items-center space-x-2">
                  {products && products.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectedProductIds.size === 0 ? handleSelectAll : handleDeselectAll}
                        disabled={isRegistering || analyzedProducts.length === 0}
                        className="korean-text"
                        data-testid="button-select-all"
                      >
                        {selectedProductIds.size === 0 ? (
                          <>
                            <CheckSquare className="mr-2 h-4 w-4" />
                            전체선택
                          </>
                        ) : (
                          <>
                            <Square className="mr-2 h-4 w-4" />
                            선택해제
                          </>
                        )}
                      </Button>
                      
                      {selectedProductIds.size > 0 && (
                        <>
                          <span className="text-sm text-muted-foreground korean-text">
                            {selectedProductIds.size}개 선택됨
                          </span>
                          <Button
                            onClick={handleRegisterSelected}
                            disabled={isRegistering || selectedProductIds.size === 0}
                            className="korean-text"
                            data-testid="button-register-selected"
                          >
                            {isRegistering ? (
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <ShoppingCart className="mr-2 h-4 w-4" />
                            )}
                            선택 등록
                          </Button>
                          
                          <Button
                            variant="destructive"
                            onClick={handleDeleteSelected}
                            disabled={isRegistering || selectedProductIds.size === 0}
                            className="korean-text"
                            data-testid="button-delete-selected"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            선택 삭제
                          </Button>
                        </>
                      )}
                      
                      <Button
                        variant="secondary"
                        onClick={handleRegisterAll}
                        disabled={isRegistering || analyzedProducts.length === 0}
                        className="korean-text"
                        data-testid="button-register-all"
                      >
                        {isRegistering ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        전체 등록 ({analyzedProducts.length}개)
                      </Button>
                      
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAll}
                        disabled={isRegistering || !products || products.length === 0}
                        className="korean-text"
                        data-testid="button-delete-all"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        전체 삭제 ({products?.length || 0}개)
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground korean-text">
                    상품을 불러오는 중...
                  </p>
                </div>
              ) : products && products.length > 0 ? (
                <div className="space-y-4">
                  {/* 페이지네이션 정보 */}
                  <div className="flex items-center justify-between pb-4 border-b">
                    <p className="text-sm text-muted-foreground korean-text">
                      전체 {totalProducts}개 중 {startIndex + 1}-{Math.min(endIndex, totalProducts)}개 표시
                    </p>
                    <p className="text-sm text-muted-foreground korean-text">
                      페이지 {currentPage}/{totalPages}
                    </p>
                  </div>
                  
                  {currentProducts.map((product: any) => (
                    <div key={product.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      {/* Checkbox for selection */}
                      {product.status === "analyzed" && (
                        <Checkbox
                          checked={selectedProductIds.has(product.id)}
                          onCheckedChange={(checked) => handleProductSelect(product.id, checked as boolean)}
                          disabled={isRegistering}
                          className="h-4 w-4"
                          data-testid={`checkbox-product-${product.id}`}
                        />
                      )}
                      
                      {/* Product Image */}
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-16 h-16 rounded-lg object-cover"
                          data-testid={`img-product-${product.id}`}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate korean-text mb-1" data-testid={`text-product-name-${product.id}`}>
                          {product.name}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="english-text">₩{Number(product.price).toLocaleString()}</span>
                          <span className="korean-text">{product.source}</span>
                          {product.category && <span className="korean-text">{product.category}</span>}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(product.status)}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        {product.status === "analyzed" && (
                          <Button 
                            size="sm"
                            onClick={() => handleRegisterToStore(product.id)}
                            disabled={updateProductMutation.isPending}
                            className="korean-text"
                            data-testid={`button-register-${product.id}`}
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            자사몰 등록
                          </Button>
                        )}

                        {product.status === "registered" && (
                          <div className="flex space-x-1">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleSyncToMarketplace(product.id, "naver")}
                              disabled={createMarketplaceSyncMutation.isPending}
                              className="korean-text text-xs"
                              data-testid={`button-sync-naver-${product.id}`}
                            >
                              네이버
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleSyncToMarketplace(product.id, "coupang")}
                              disabled={createMarketplaceSyncMutation.isPending}
                              className="korean-text text-xs"
                              data-testid={`button-sync-coupang-${product.id}`}
                            >
                              쿠팡
                            </Button>
                          </div>
                        )}

                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewProduct(product)}
                          data-testid={`button-view-${product.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditProduct(product)}
                          data-testid={`button-edit-${product.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-${product.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* 페이지네이션 UI */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2 pt-6 border-t bg-background relative z-10">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handlePageChange(currentPage - 1);
                        }}
                        disabled={currentPage === 1}
                        className="korean-text bg-background hover:bg-muted"
                        data-testid="button-prev-page"
                        role="button"
                        tabIndex={0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        이전
                      </Button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            type="button"
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handlePageChange(page);
                            }}
                            className="w-10 h-10 bg-background hover:bg-muted"
                            data-testid={`button-page-${page}`}
                            role="button"
                            tabIndex={0}
                            aria-label={`페이지 ${page}로 이동`}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handlePageChange(currentPage + 1);
                        }}
                        disabled={currentPage === totalPages}
                        className="korean-text bg-background hover:bg-muted"
                        data-testid="button-next-page"
                        role="button"
                        tabIndex={0}
                      >
                        다음
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold korean-text mb-2">관리할 상품이 없습니다</h3>
                  <p className="text-muted-foreground korean-text">
                    상품을 수집하고 AI 분석을 완료하면 여기에서 관리할 수 있습니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        open={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onEdit={(product) => {
          setIsDetailModalOpen(false);
          setSelectedProduct(product);
          setIsEditModalOpen(true);
        }}
      />

      {/* Product Edit Modal */}
      <ProductEditModal
        product={selectedProduct}
        open={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSuccess={() => {
          refetch();
          handleCloseEditModal();
        }}
      />
    </div>
  );
}
