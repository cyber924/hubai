import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Download, ExternalLink, CheckCircle, Clock, AlertCircle, Settings, Link as LinkIcon, Trash2, Wifi, WifiOff, Upload, FileText, Eye, ArrowRight, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function MarketSync() {
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>("all");
  const [showStylehubConfig, setShowStylehubConfig] = useState<boolean>(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'name', 'description', 'price', 'originalPrice', 'imageUrl', 'category', 'brand'
  ]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showCafe24Dialog, setShowCafe24Dialog] = useState<boolean>(false);
  
  // 데이터 변환 관련 상태
  const [uploadedTemplate, setUploadedTemplate] = useState<any>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [customProfile, setCustomProfile] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTransformMarketplace, setSelectedTransformMarketplace] = useState<string>("cafe24");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 스타일허브용 컬럼 옵션들
  const availableColumns = [
    { id: 'name', label: '상품명', checked: true },
    { id: 'description', label: '상품설명', checked: true },
    { id: 'price', label: '판매가', checked: true },
    { id: 'originalPrice', label: '정가', checked: true },
    { id: 'imageUrl', label: '이미지URL', checked: true },
    { id: 'imageUrls', label: '추가이미지들', checked: false },
    { id: 'category', label: '카테고리', checked: true },
    { id: 'subcategory', label: '서브카테고리', checked: false },
    { id: 'brand', label: '브랜드', checked: true },
    { id: 'source', label: '수집소스', checked: false },
    { id: 'sourceUrl', label: '원본URL', checked: false },
    { id: 'sourceProductId', label: '원본상품ID', checked: false },
    { id: 'tags', label: '태그', checked: false },
    { id: 'season', label: '시즌', checked: false },
    { id: 'gender', label: '성별', checked: false },
    { id: 'ageGroup', label: '연령대', checked: false },
    { id: 'status', label: '상태', checked: false },
    { id: 'createdAt', label: '등록일', checked: false },
    { id: 'updatedAt', label: '수정일', checked: false },
  ];

  // 컬럼 선택 핸들러
  const handleColumnToggle = (columnId: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  // 스타일허브 커스텀 CSV 다운로드
  const downloadStylehubCSV = async () => {
    try {
      const response = await fetch(`/api/products/csv/stylehub`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          columns: selectedColumns
        }),
      });

      if (!response.ok) {
        throw new Error('CSV 다운로드에 실패했습니다.');
      }

      // Blob으로 파일 데이터 받기
      const blob = await response.blob();
      
      // 파일 다운로드
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stylehub_custom_products.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "다운로드 완료",
        description: "스타일허브 커스텀 CSV 파일이 다운로드되었습니다.",
      });
    } catch (error) {
      console.error('CSV 다운로드 에러:', error);
      toast({
        title: "다운로드 실패",
        description: "CSV 파일 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 일반 CSV 다운로드 함수
  const downloadCSV = async (marketplace: string) => {
    if (marketplace === 'stylehub') {
      downloadStylehubCSV();
      return;
    }

    try {
      const response = await fetch(`/api/products/csv/${marketplace}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('CSV 다운로드에 실패했습니다.');
      }

      // Blob으로 파일 데이터 받기
      const blob = await response.blob();
      
      // 파일 다운로드
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${marketplace}_products.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "다운로드 완료",
        description: `${marketplace.toUpperCase()} 상품 CSV 파일이 다운로드되었습니다.`,
      });
    } catch (error) {
      console.error('CSV 다운로드 에러:', error);
      toast({
        title: "다운로드 실패",
        description: "CSV 파일 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const { data: syncs, isLoading } = useQuery<any[]>({
    queryKey: ['/api/marketplace-syncs'],
  });

  const { data: products, isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ['/api/products', 'registered'],
    queryFn: async () => {
      const response = await fetch('/api/products?status=registered', {
        credentials: 'include'
      });
      return response.json();
    },
  });

  // 마켓플레이스 연결 정보 조회
  const { data: connections } = useQuery<any[]>({
    queryKey: ['/api/marketplace/connections'],
  });

  // 카페24 연결 정보
  const cafe24Connection = connections?.find(conn => conn.provider === 'cafe24');

  // 카페24 OAuth 인증 뮤테이션
  const cafe24AuthMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/marketplace/cafe24/auth');
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "연결 실패",
        description: error.message || "카페24 연결 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // 마켓플레이스 연결 삭제 뮤테이션
  const deleteConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      await apiRequest('DELETE', `/api/marketplace/connections/${connectionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/connections'] });
      toast({
        title: "연결 해제 완료",
        description: "마켓플레이스 연결이 해제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "연결 해제 실패",
        description: error.message || "연결 해제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  // 카페24 상품 등록 뮤테이션
  const cafe24SyncMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      const response = await apiRequest('POST', '/api/marketplace/cafe24/products', { productIds });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace-syncs'] });
      toast({
        title: "동기화 완료",
        description: `${data.successCount || 0}개 상품이 성공적으로 등록되었습니다.`,
      });
      setSelectedProducts([]);
      setShowCafe24Dialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "동기화 실패",
        description: error.message || "상품 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  });

  const marketplaces = [
    { id: "naver", name: "네이버 스마트스토어", icon: "🛍️", color: "bg-green-500" },
    { id: "coupang", name: "쿠팡", icon: "📦", color: "bg-orange-500" },
    { id: "zigzag", name: "지그재그", icon: "💄", color: "bg-pink-500" },
    { id: "cafe24", name: "카페24", icon: "☕", color: "bg-purple-500" },
    { id: "stylehub", name: "스타일허브 커스텀", icon: "⚙️", color: "bg-blue-500" },
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

  // 카페24 연결 상태 확인
  const getCafe24Status = () => {
    if (!cafe24Connection) {
      return { connected: false, status: "disconnected" };
    }
    
    if (cafe24Connection.status === 'active') {
      return { connected: true, status: "connected" };
    }
    
    return { connected: false, status: cafe24Connection.status };
  };

  // 카페24 연결 처리
  const handleCafe24Connect = () => {
    cafe24AuthMutation.mutate();
  };

  // 카페24 연결 해제 처리
  const handleCafe24Disconnect = () => {
    if (cafe24Connection) {
      deleteConnectionMutation.mutate(cafe24Connection.id);
    }
  };

  // 카페24 동기화 처리
  const handleCafe24Sync = () => {
    if (!cafe24Connection) {
      toast({
        title: "연결 필요",
        description: "먼저 카페24에 연결해주세요.",
        variant: "destructive",
      });
      return;
    }
    setShowCafe24Dialog(true);
  };

  // 상품 선택 처리
  const handleProductSelect = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // 모든 상품 선택/해제
  const handleSelectAll = () => {
    if (selectedProducts.length === (products?.length || 0)) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products?.map(p => p.id) || []);
    }
  };

  // 카페24 동기화 확인
  const handleConfirmCafe24Sync = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "상품 선택 필요",
        description: "동기화할 상품을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    cafe24SyncMutation.mutate(selectedProducts);
  };

  // ========================
  // 데이터 변환 관련 함수들
  // ========================

  // 매핑 프로필 조회
  const { data: mappingProfiles } = useQuery({
    queryKey: ['/api/data-transform/profiles', selectedTransformMarketplace],
    queryFn: async () => {
      const response = await fetch(`/api/data-transform/profiles?marketplace=${selectedTransformMarketplace}`, {
        credentials: 'include'
      });
      return response.json();
    },
  });

  // 템플릿 업로드 처리
  const handleTemplateUpload = async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('template', file);
      formData.append('marketplace', selectedTransformMarketplace);

      const response = await fetch('/api/data-transform/upload-template', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) throw new Error('템플릿 업로드 실패');
      
      const result = await response.json();
      setUploadedTemplate(result);
      
      toast({
        title: "업로드 완료",
        description: `${result.headers?.length || 0}개 필드가 감지되었습니다.`,
      });
    } catch (error: any) {
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 미리보기 생성
  const handlePreview = async () => {
    if (!selectedProfileId && !customProfile) {
      toast({
        title: "프로필 선택 필요",
        description: "매핑 프로필을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsPreviewing(true);
    try {
      // 샘플 상품 데이터 가져오기 (최대 10개)
      const sampleProducts = products?.slice(0, 10) || [];
      
      const response = await fetch('/api/data-transform/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfileId || undefined,
          customProfile: customProfile || undefined,
          sampleData: sampleProducts
        }),
        credentials: 'include'
      });

      if (!response.ok) throw new Error('미리보기 생성 실패');
      
      const result = await response.json();
      setPreviewData(result);
      
      toast({
        title: "미리보기 생성 완료",
        description: `${result.successCount}개 상품 변환 완료`,
      });
    } catch (error: any) {
      toast({
        title: "미리보기 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  // CSV 내보내기
  const handleExport = async () => {
    if (!selectedProfileId && !customProfile) {
      toast({
        title: "프로필 선택 필요",
        description: "매핑 프로필을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!products || products.length === 0) {
      toast({
        title: "상품 없음",
        description: "내보낼 상품이 없습니다.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch('/api/data-transform/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfileId || undefined,
          customProfile: customProfile || undefined,
          productIds: products.map((p: any) => p.id)
        }),
        credentials: 'include'
      });

      if (!response.ok) throw new Error('내보내기 실패');
      
      // 파일 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTransformMarketplace}_mapped_products_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "내보내기 완료",
        description: `${products.length}개 상품이 변환되어 다운로드되었습니다.`,
      });
    } catch (error: any) {
      toast({
        title: "내보내기 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
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
                {marketplace.id === 'stylehub' ? (
                  // 스타일허브 커스텀 UI
                  <div className="space-y-4">
                    <div className="mb-4">
                      <p className="text-2xl font-bold english-text">124</p>
                      <p className="text-sm text-muted-foreground korean-text">전체 상품</p>
                    </div>

                    <div className="text-left">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium korean-text">컬럼 선택</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowStylehubConfig(!showStylehubConfig)}
                          data-testid="button-toggle-columns"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>

                      {showStylehubConfig && (
                        <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1 mb-3">
                          {availableColumns.map((column) => (
                            <div key={column.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={column.id}
                                checked={selectedColumns.includes(column.id)}
                                onCheckedChange={() => handleColumnToggle(column.id)}
                                data-testid={`checkbox-${column.id}`}
                              />
                              <label 
                                htmlFor={column.id} 
                                className="text-xs korean-text cursor-pointer"
                              >
                                {column.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="text-xs korean-text text-muted-foreground mb-3">
                        선택된 컬럼: {selectedColumns.length}개
                      </div>
                    </div>

                    <Button 
                      className="w-full korean-text" 
                      onClick={() => downloadCSV('stylehub')}
                      disabled={selectedColumns.length === 0}
                      data-testid="button-download-stylehub"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      커스텀 CSV 다운로드
                    </Button>
                  </div>
                ) : marketplace.id === 'cafe24' ? (
                  // 카페24 전용 UI
                  <div className="space-y-4">
                    {(() => {
                      const cafe24Status = getCafe24Status();
                      return (
                        <>
                          <div className="mb-4">
                            <div className="flex items-center justify-center mb-2">
                              {cafe24AuthMutation.isPending ? (
                                <RefreshCw className="h-6 w-6 text-orange-500 animate-spin" />
                              ) : cafe24Status.connected ? (
                                <Wifi className="h-6 w-6 text-green-500" />
                              ) : (
                                <WifiOff className="h-6 w-6 text-red-500" />
                              )}
                            </div>
                            <div className="text-sm text-center korean-text">
                              {cafe24AuthMutation.isPending ? (
                                <Badge variant="outline" className="korean-text text-orange-600">
                                  연동중...
                                </Badge>
                              ) : cafe24Status.connected ? (
                                <Badge variant="secondary" className="korean-text">
                                  연결됨
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="korean-text">
                                  연결 안됨
                                </Badge>
                              )}
                            </div>
                            {cafe24Connection && (
                              <p className="text-xs text-muted-foreground korean-text text-center mt-1">
                                {cafe24Connection.shopDomain}
                              </p>
                            )}
                          </div>

                          {cafe24Status.connected ? (
                            // 연결된 상태 UI
                            <div className="space-y-2">
                              <Button 
                                className="w-full korean-text" 
                                size="sm"
                                onClick={handleCafe24Sync}
                                disabled={cafe24SyncMutation.isPending}
                                data-testid="button-sync-cafe24"
                              >
                                <RefreshCw className={`mr-2 h-4 w-4 ${cafe24SyncMutation.isPending ? 'animate-spin' : ''}`} />
                                상품 등록
                              </Button>
                              <Button 
                                variant="outline" 
                                className="w-full korean-text" 
                                size="sm"
                                onClick={() => downloadCSV('cafe24')}
                                data-testid="button-export-cafe24"
                              >
                                <Download className="mr-2 h-4 w-4" />
                                CSV 다운로드
                              </Button>
                              <Button 
                                variant="destructive" 
                                className="w-full korean-text" 
                                size="sm"
                                onClick={handleCafe24Disconnect}
                                disabled={deleteConnectionMutation.isPending}
                                data-testid="button-disconnect-cafe24"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                연결 해제
                              </Button>
                            </div>
                          ) : (
                            // 연결되지 않은 상태 UI
                            <div className="space-y-2">
                              <Button 
                                className="w-full korean-text" 
                                size="sm"
                                onClick={handleCafe24Connect}
                                disabled={cafe24AuthMutation.isPending}
                                data-testid="button-connect-cafe24"
                              >
                                <LinkIcon className="mr-2 h-4 w-4" />
                                카페24 연결하기
                              </Button>
                              <Button 
                                variant="outline" 
                                className="w-full korean-text" 
                                size="sm"
                                onClick={() => downloadCSV('cafe24')}
                                data-testid="button-export-cafe24"
                              >
                                <Download className="mr-2 h-4 w-4" />
                                CSV 다운로드
                              </Button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  // 일반 마켓플레이스 UI
                  <>
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
                        onClick={() => downloadCSV(marketplace.id)}
                        data-testid={`button-export-${marketplace.id}`}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        CSV 다운로드
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Universal Format - 마켓플레이스 템플릿 매핑 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center korean-text">
              <Upload className="mr-2 h-5 w-5" />
              마켓플레이스 템플릿 매핑 (Universal Format)
            </CardTitle>
            <p className="text-muted-foreground korean-text">
              마켓플레이스 공식 템플릿을 업로드하여 자동 매핑하고 완벽한 CSV를 생성하세요
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="upload" className="korean-text">템플릿 업로드</TabsTrigger>
                <TabsTrigger value="mapping" className="korean-text">매핑 편집</TabsTrigger>
                <TabsTrigger value="preview" className="korean-text">미리보기</TabsTrigger>
                <TabsTrigger value="export" className="korean-text">내보내기</TabsTrigger>
              </TabsList>

              {/* 템플릿 업로드 탭 */}
              <TabsContent value="upload" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="korean-text">마켓플레이스 선택</Label>
                      <Select 
                        value={selectedTransformMarketplace} 
                        onValueChange={setSelectedTransformMarketplace}
                        data-testid="select-transform-marketplace"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="마켓플레이스 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cafe24">카페24</SelectItem>
                          <SelectItem value="naver">네이버 스마트스토어</SelectItem>
                          <SelectItem value="coupang">쿠팡</SelectItem>
                          <SelectItem value="zigzag">지그재그</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="korean-text">공식 템플릿 업로드</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept=".csv,.xlsx,.xls"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleTemplateUpload(file);
                          }}
                          className="hidden"
                          data-testid="input-template-file"
                        />
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          data-testid="button-upload-template"
                        >
                          {isUploading ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              업로드 중...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              템플릿 파일 선택
                            </>
                          )}
                        </Button>
                        <p className="text-sm text-muted-foreground korean-text mt-2">
                          CSV, Excel 파일 지원 (최대 10MB)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="korean-text">업로드된 템플릿 정보</Label>
                      {uploadedTemplate ? (
                        <div className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="korean-text">
                              {uploadedTemplate.encoding || 'UTF-8'}
                            </Badge>
                            <Badge variant="outline" className="korean-text">
                              {uploadedTemplate.headers?.length || 0}개 필드
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm font-medium korean-text mb-2">감지된 필드:</p>
                            <div className="grid grid-cols-2 gap-1 text-xs">
                              {uploadedTemplate.headers?.slice(0, 8).map((header: string, index: number) => (
                                <span key={index} className="bg-muted px-2 py-1 rounded">
                                  {header}
                                </span>
                              ))}
                              {uploadedTemplate.headers?.length > 8 && (
                                <span className="text-muted-foreground korean-text">
                                  +{uploadedTemplate.headers.length - 8}개 더
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="border rounded-lg p-4 text-center text-muted-foreground korean-text">
                          템플릿을 업로드하면 필드 정보가 표시됩니다
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* 매핑 편집 탭 */}
              <TabsContent value="mapping" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="korean-text">매핑 프로필 선택</Label>
                      <Select 
                        value={selectedProfileId} 
                        onValueChange={setSelectedProfileId}
                        data-testid="select-mapping-profile"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="프로필 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {mappingProfiles?.predefined?.map((profile: any) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name} (기본)
                            </SelectItem>
                          ))}
                          {mappingProfiles?.custom?.map((profile: any) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name} (사용자)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedProfileId && (
                      <div className="border rounded-lg p-4">
                        <p className="text-sm font-medium korean-text mb-2">선택된 프로필 정보:</p>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="korean-text">마켓플레이스:</span>
                            <Badge variant="outline">
                              {(() => {
                                const profile = [...(mappingProfiles?.predefined || []), ...(mappingProfiles?.custom || [])]
                                  .find((p: any) => p.id === selectedProfileId);
                                return profile?.marketplace || '';
                              })()}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="korean-text">매핑 필드 수:</span>
                            <span>
                              {(() => {
                                const profile = [...(mappingProfiles?.predefined || []), ...(mappingProfiles?.custom || [])]
                                  .find((p: any) => p.id === selectedProfileId);
                                return profile?.mappings?.length || 0;
                              })()}개
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="korean-text">매핑 설정</Label>
                      <Button variant="outline" size="sm" className="korean-text">
                        <Edit className="mr-2 h-4 w-4" />
                        커스텀 매핑
                      </Button>
                    </div>
                    <div className="border rounded-lg p-4 text-center text-muted-foreground korean-text">
                      고급 매핑 편집기 (개발 예정)
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* 미리보기 탭 */}
              <TabsContent value="preview" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium korean-text">변환 미리보기</h3>
                    <p className="text-sm text-muted-foreground korean-text">
                      선택된 매핑 프로필로 상품 데이터가 어떻게 변환되는지 확인하세요
                    </p>
                  </div>
                  <Button 
                    onClick={handlePreview}
                    disabled={isPreviewing || !selectedProfileId}
                    data-testid="button-generate-preview"
                  >
                    {isPreviewing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        생성 중...
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        미리보기 생성
                      </>
                    )}
                  </Button>
                </div>

                {previewData && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-4">
                        <Badge variant="secondary" className="korean-text">
                          성공: {previewData.successCount}개
                        </Badge>
                        {previewData.failureCount > 0 && (
                          <Badge variant="destructive" className="korean-text">
                            실패: {previewData.failureCount}개
                          </Badge>
                        )}
                        {previewData.warnings?.length > 0 && (
                          <Badge variant="outline" className="korean-text">
                            경고: {previewData.warnings.length}개
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {previewData.data?.[0] && Object.keys(previewData.data[0]).slice(0, 6).map((key: string) => (
                              <TableHead key={key} className="korean-text">{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.data?.slice(0, 5).map((row: any, index: number) => (
                            <TableRow key={index}>
                              {Object.keys(row).slice(0, 6).map((key: string) => (
                                <TableCell key={key} className="max-w-32 truncate">
                                  {String(row[key] || '')}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {previewData.errors?.length > 0 && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                        <h4 className="font-medium text-destructive korean-text mb-2">변환 오류:</h4>
                        <ul className="text-sm space-y-1">
                          {previewData.errors.slice(0, 3).map((error: string, index: number) => (
                            <li key={index} className="text-destructive">• {error}</li>
                          ))}
                          {previewData.errors.length > 3 && (
                            <li className="text-muted-foreground korean-text">+{previewData.errors.length - 3}개 더</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* 내보내기 탭 */}
              <TabsContent value="export" className="space-y-6">
                <div className="text-center space-y-4">
                  <div>
                    <h3 className="text-lg font-medium korean-text">CSV 내보내기</h3>
                    <p className="text-sm text-muted-foreground korean-text">
                      매핑된 상품 데이터를 {selectedTransformMarketplace} 형식으로 내보내기
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="border rounded-lg p-4">
                      <div className="text-2xl font-bold">{products?.length || 0}</div>
                      <div className="text-muted-foreground korean-text">전체 상품</div>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="text-2xl font-bold">
                        {selectedProfileId ? 
                          (() => {
                            const profile = [...(mappingProfiles?.predefined || []), ...(mappingProfiles?.custom || [])]
                              .find((p: any) => p.id === selectedProfileId);
                            return profile?.mappings?.length || 0;
                          })() : 0
                        }
                      </div>
                      <div className="text-muted-foreground korean-text">매핑 필드</div>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="text-2xl font-bold">{previewData?.successCount || 0}</div>
                      <div className="text-muted-foreground korean-text">변환 성공</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      size="lg"
                      onClick={handleExport}
                      disabled={isExporting || !selectedProfileId || !products?.length}
                      className="w-full md:w-auto korean-text"
                      data-testid="button-export-csv"
                    >
                      {isExporting ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          내보내기 중...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          {selectedTransformMarketplace.toUpperCase()} CSV 다운로드
                        </>
                      )}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground korean-text">
                      UTF-8 BOM 인코딩으로 한글 깨짐 방지
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Sync Status */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="korean-text">동기화 현황</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                className="korean-text" 
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/marketplace-syncs'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/marketplace/connections'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/products', 'registered'] });
                }}
                data-testid="button-refresh-sync"
              >
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

        {/* 카페24 상품 선택 다이얼로그 */}
        <Dialog open={showCafe24Dialog} onOpenChange={setShowCafe24Dialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="korean-text">카페24에 등록할 상품 선택</DialogTitle>
              <DialogDescription className="korean-text">
                카페24에 등록하고 싶은 상품을 선택해주세요. 선택된 상품들이 카페24 스토어에 자동으로 등록됩니다.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col h-[500px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedProducts.length === (products?.length || 0) && (products?.length || 0) > 0}
                    onCheckedChange={handleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                  <label htmlFor="select-all" className="text-sm korean-text">
                    전체 선택 ({selectedProducts.length}/{products?.length || 0})
                  </label>
                </div>
                <Badge variant="outline" className="korean-text">
                  등록 가능한 상품: {products?.length || 0}개
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto border rounded-md">
                {products && products.length > 0 ? (
                  <div className="divide-y">
                    {products.map((product: any, index: number) => (
                      <div key={product.id} className="flex items-center space-x-4 p-4 hover:bg-muted/50">
                        <Checkbox
                          id={`product-${product.id}`}
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => handleProductSelect(product.id)}
                          data-testid={`checkbox-product-${index}`}
                        />
                        <div className="flex-shrink-0">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">이미지</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium korean-text truncate" data-testid={`text-product-name-${index}`}>
                            {product.name}
                          </p>
                          <p className="text-sm text-muted-foreground korean-text">
                            {product.brand && `${product.brand} • `}
                            {product.category || '카테고리 없음'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold english-text" data-testid={`text-product-price-${index}`}>
                            ₩{parseFloat(product.price).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground korean-text">
                            {product.source}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground korean-text">등록 가능한 상품이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCafe24Dialog(false)}
                data-testid="button-cancel-cafe24-sync"
              >
                취소
              </Button>
              <Button
                onClick={handleConfirmCafe24Sync}
                disabled={selectedProducts.length === 0 || cafe24SyncMutation.isPending || productsLoading}
                data-testid="button-confirm-cafe24-sync"
              >
                {cafe24SyncMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    등록 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {selectedProducts.length}개 상품 등록
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
