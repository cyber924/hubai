import { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Download,
  RotateCw,
  Crop,
  Filter,
  Palette,
  Scissors,
  FileImage,
  Trash2,
  Settings,
  Info,
  Zap,
  Star,
  CheckCircle
} from "lucide-react";

interface ProcessedImage {
  id: string;
  name: string;
  originalFile: File;
  canvas: HTMLCanvasElement;
  format: string;
  quality: number;
  width: number;
  height: number;
  size: number;
}

interface ImageProcessingOptions {
  format: 'jpeg' | 'png' | 'webp';
  quality: number;
  width: number;
  height: number;
  maintainAspectRatio: boolean;
  rotation: number;
  crop: {
    enabled: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  filters: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    grayscale: boolean;
    sepia: boolean;
  };
  watermark: {
    enabled: boolean;
    text: string;
    opacity: number;
    position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'center';
  };
}

export default function ImageManagement() {
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [options, setOptions] = useState<ImageProcessingOptions>({
    format: 'jpeg',
    quality: 80,
    width: 800,
    height: 600,
    maintainAspectRatio: true,
    rotation: 0,
    crop: {
      enabled: false,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
    filters: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      grayscale: false,
      sepia: false,
    },
    watermark: {
      enabled: false,
      text: 'StyleHub',
      opacity: 50,
      position: 'bottomRight',
    },
  });

  const handleFileUpload = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast({
        title: "오류",
        description: "이미지 파일만 업로드할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    setUploadedImages(prev => [...prev, ...imageFiles]);
    if (!selectedImage && imageFiles.length > 0) {
      setSelectedImage(imageFiles[0]);
    }

    toast({
      title: "업로드 완료",
      description: `${imageFiles.length}개 이미지가 업로드되었습니다.`,
    });
  }, [selectedImage, toast]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFileUpload(event.target.files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer.files;
    if (files) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const loadImageToCanvas = useCallback((file: File): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        // 메모리 누수 방지
        URL.revokeObjectURL(img.src);
        
        let { width, height } = options;
        
        if (options.maintainAspectRatio) {
          const aspectRatio = img.width / img.height;
          if (width / height > aspectRatio) {
            width = height * aspectRatio;
          } else {
            height = width / aspectRatio;
          }
        }

        // 회전을 고려한 캔버스 크기 계산
        const radians = (options.rotation * Math.PI) / 180;
        const cos = Math.abs(Math.cos(radians));
        const sin = Math.abs(Math.sin(radians));
        const rotatedWidth = Math.ceil(width * cos + height * sin);
        const rotatedHeight = Math.ceil(width * sin + height * cos);

        canvas.width = rotatedWidth;
        canvas.height = rotatedHeight;

        // 회전과 크롭 적용
        ctx.save();
        ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
        ctx.rotate(radians);
        
        // 크롭 설정 계산
        let srcX = 0, srcY = 0, srcWidth = img.width, srcHeight = img.height;
        
        if (options.crop.enabled) {
          srcX = Math.max(0, Math.min(img.width - 1, (img.width * options.crop.x) / 100));
          srcY = Math.max(0, Math.min(img.height - 1, (img.height * options.crop.y) / 100));
          srcWidth = Math.max(1, Math.min(img.width - srcX, (img.width * options.crop.width) / 100));
          srcHeight = Math.max(1, Math.min(img.height - srcY, (img.height * options.crop.height) / 100));
        }

        // 크롭된 영역을 지정된 크기로 그리기
        ctx.drawImage(
          img,
          srcX, srcY, srcWidth, srcHeight,  // 소스 영역 (크롭)
          -width / 2, -height / 2, width, height  // 대상 영역
        );
        
        ctx.restore();

        // 필터 적용
        const imageData = ctx.getImageData(0, 0, rotatedWidth, rotatedHeight);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          // 밝기 조정
          data[i] = Math.min(255, (data[i] * options.filters.brightness) / 100);
          data[i + 1] = Math.min(255, (data[i + 1] * options.filters.brightness) / 100);
          data[i + 2] = Math.min(255, (data[i + 2] * options.filters.brightness) / 100);

          // 대비 조정
          const factor = (259 * (options.filters.contrast + 255)) / (255 * (259 - options.filters.contrast));
          data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
          data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
          data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));

          // 채도 조정
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const satFactor = options.filters.saturation / 100;
          data[i] = gray + (data[i] - gray) * satFactor;
          data[i + 1] = gray + (data[i + 1] - gray) * satFactor;
          data[i + 2] = gray + (data[i + 2] - gray) * satFactor;

          // 그레이스케일
          if (options.filters.grayscale) {
            const grayValue = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = grayValue;
            data[i + 1] = grayValue;
            data[i + 2] = grayValue;
          }

          // 세피아
          if (options.filters.sepia) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
          }
        }

        ctx.putImageData(imageData, 0, 0);

        // 블러 효과 (더 정확한 구현)
        if (options.filters.blur > 0) {
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCanvas.width = rotatedWidth;
            tempCanvas.height = rotatedHeight;
            tempCtx.filter = `blur(${options.filters.blur}px)`;
            tempCtx.drawImage(canvas, 0, 0);
            ctx.clearRect(0, 0, rotatedWidth, rotatedHeight);
            ctx.drawImage(tempCanvas, 0, 0);
          }
        }

        // 워터마크 추가
        if (options.watermark.enabled && options.watermark.text) {
          ctx.fillStyle = `rgba(255, 255, 255, ${options.watermark.opacity / 100})`;
          ctx.font = '20px Arial';
          const textWidth = ctx.measureText(options.watermark.text).width;
          
          let x = 10, y = 30;
          switch (options.watermark.position) {
            case 'topRight':
              x = rotatedWidth - textWidth - 10;
              y = 30;
              break;
            case 'bottomLeft':
              x = 10;
              y = rotatedHeight - 10;
              break;
            case 'bottomRight':
              x = rotatedWidth - textWidth - 10;
              y = rotatedHeight - 10;
              break;
            case 'center':
              x = (rotatedWidth - textWidth) / 2;
              y = rotatedHeight / 2;
              break;
          }
          
          ctx.fillText(options.watermark.text, x, y);
        }

        resolve(canvas);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, [options]);

  const processImage = useCallback(async (file: File) => {
    setProcessing(true);
    setProcessingProgress(0);

    try {
      setProcessingProgress(30);
      const canvas = await loadImageToCanvas(file);
      setProcessingProgress(70);

      // 정확한 사이즈 계산
      const processedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, `image/${options.format}`, options.quality / 100);
      });

      const processedImage: ProcessedImage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name.split('.')[0],
        originalFile: file,
        canvas,
        format: options.format,
        quality: options.quality,
        width: canvas.width,
        height: canvas.height,
        size: processedBlob.size,
      };

      setProcessedImages(prev => [...prev, processedImage]);
      setProcessingProgress(100);

      toast({
        title: "처리 완료",
        description: `${file.name} 이미지가 성공적으로 처리되었습니다.`,
      });
    } catch (error) {
      toast({
        title: "처리 실패",
        description: "이미지 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setProcessingProgress(0);
    }
  }, [loadImageToCanvas, options, toast]);

  const processAllImages = useCallback(async () => {
    if (uploadedImages.length === 0) {
      toast({
        title: "알림",
        description: "처리할 이미지가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    
    for (let i = 0; i < uploadedImages.length; i++) {
      setProcessingProgress((i / uploadedImages.length) * 100);
      await processImage(uploadedImages[i]);
      await new Promise(resolve => setTimeout(resolve, 500)); // 처리 간격
    }

    setProcessing(false);
    setProcessingProgress(100);
  }, [uploadedImages, processImage, toast]);

  const downloadImage = useCallback((processedImage: ProcessedImage) => {
    const canvas = processedImage.canvas;
    const quality = processedImage.quality / 100;
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${processedImage.name}_processed.${processedImage.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "다운로드 완료",
        description: `${processedImage.name} 이미지가 다운로드되었습니다.`,
      });
    }, `image/${processedImage.format}`, quality);
  }, [toast]);

  const downloadAllImages = useCallback(() => {
    if (processedImages.length === 0) {
      toast({
        title: "알림",
        description: "다운로드할 이미지가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    processedImages.forEach((img, index) => {
      setTimeout(() => downloadImage(img), index * 100);
    });
  }, [processedImages, downloadImage, toast]);

  // 실시간 미리보기 업데이트
  const updatePreview = useCallback(async () => {
    if (!selectedImage) {
      setPreviewImage(null);
      return;
    }

    try {
      const canvas = await loadImageToCanvas(selectedImage);
      const previewUrl = canvas.toDataURL(`image/${options.format}`, options.quality / 100);
      setPreviewImage(previewUrl);
    } catch (error) {
      console.error('Preview update failed:', error);
    }
  }, [selectedImage, loadImageToCanvas, options.format, options.quality]);

  // 옵션이나 선택된 이미지가 변경될 때마다 미리보기 업데이트
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updatePreview();
    }, 300); // 디바운스 적용

    return () => clearTimeout(timeoutId);
  }, [updatePreview]);

  const resetOptions = () => {
    setOptions({
      format: 'jpeg',
      quality: 80,
      width: 800,
      height: 600,
      maintainAspectRatio: true,
      rotation: 0,
      crop: {
        enabled: false,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      },
      filters: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        grayscale: false,
        sepia: false,
      },
      watermark: {
        enabled: false,
        text: 'StyleHub',
        opacity: 50,
        position: 'bottomRight',
      },
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold korean-text">이미지 관리</h1>
          <p className="text-muted-foreground korean-text">
            이미지 업로드, 변환, 편집 및 다운로드 기능을 제공합니다
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={resetOptions} variant="outline" data-testid="button-reset-options">
            <Settings className="h-4 w-4 mr-2" />
            초기화
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 업로드 및 설정 영역 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 파일 업로드 */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                <h3 className="text-lg font-semibold korean-text">이미지 업로드</h3>
              </div>
              
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                data-testid="upload-area"
              >
                <FileImage className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground korean-text">
                  클릭하거나 이미지를 드래그하여 업로드
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG, WebP 지원
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleInputChange}
                data-testid="input-file-upload"
              />

              {uploadedImages.length > 0 && (
                <div>
                  <Label className="korean-text">업로드된 이미지 ({uploadedImages.length}개)</Label>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {uploadedImages.map((file, index) => (
                      <div 
                        key={index} 
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          selectedImage === file ? 'bg-primary/10 border-2 border-primary' : 'bg-muted hover:bg-muted/80'
                        }`}
                        onClick={() => setSelectedImage(file)}
                        data-testid={`file-item-${index}`}
                      >
                        <span className="text-sm truncate">{file.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{formatFileSize(file.size)}</Badge>
                          {selectedImage === file && (
                            <Badge variant="default" className="text-xs">선택됨</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 처리 설정 */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <h3 className="text-lg font-semibold korean-text">처리 설정</h3>
              </div>

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">기본</TabsTrigger>
                  <TabsTrigger value="filters">필터</TabsTrigger>
                  <TabsTrigger value="advanced">고급</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div>
                    <Label className="korean-text">출력 형식</Label>
                    <Select value={options.format} onValueChange={(value: 'jpeg' | 'png' | 'webp') => setOptions(prev => ({...prev, format: value}))}>
                      <SelectTrigger data-testid="select-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jpeg">JPEG</SelectItem>
                        <SelectItem value="png">PNG</SelectItem>
                        <SelectItem value="webp">WebP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="korean-text">품질: {options.quality}%</Label>
                    <Slider
                      value={[options.quality]}
                      onValueChange={(value) => setOptions(prev => ({...prev, quality: value[0]}))}
                      max={100}
                      min={1}
                      step={1}
                      className="mt-2"
                      data-testid="slider-quality"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="korean-text">너비 (px)</Label>
                      <Input
                        type="number"
                        value={options.width}
                        onChange={(e) => setOptions(prev => ({...prev, width: parseInt(e.target.value) || 800}))}
                        data-testid="input-width"
                      />
                    </div>
                    <div>
                      <Label className="korean-text">높이 (px)</Label>
                      <Input
                        type="number"
                        value={options.height}
                        onChange={(e) => setOptions(prev => ({...prev, height: parseInt(e.target.value) || 600}))}
                        data-testid="input-height"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={options.maintainAspectRatio}
                      onCheckedChange={(checked) => setOptions(prev => ({...prev, maintainAspectRatio: checked}))}
                      data-testid="switch-aspect-ratio"
                    />
                    <Label className="korean-text">비율 유지</Label>
                  </div>
                </TabsContent>

                <TabsContent value="filters" className="space-y-4">
                  <div>
                    <Label className="korean-text">밝기: {options.filters.brightness}%</Label>
                    <Slider
                      value={[options.filters.brightness]}
                      onValueChange={(value) => setOptions(prev => ({...prev, filters: {...prev.filters, brightness: value[0]}}))}
                      max={200}
                      min={0}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="korean-text">대비: {options.filters.contrast}%</Label>
                    <Slider
                      value={[options.filters.contrast]}
                      onValueChange={(value) => setOptions(prev => ({...prev, filters: {...prev.filters, contrast: value[0]}}))}
                      max={200}
                      min={0}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="korean-text">채도: {options.filters.saturation}%</Label>
                    <Slider
                      value={[options.filters.saturation]}
                      onValueChange={(value) => setOptions(prev => ({...prev, filters: {...prev.filters, saturation: value[0]}}))}
                      max={200}
                      min={0}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="korean-text">블러: {options.filters.blur}px</Label>
                    <Slider
                      value={[options.filters.blur]}
                      onValueChange={(value) => setOptions(prev => ({...prev, filters: {...prev.filters, blur: value[0]}}))}
                      max={10}
                      min={0}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={options.filters.grayscale}
                      onCheckedChange={(checked) => setOptions(prev => ({...prev, filters: {...prev.filters, grayscale: checked}}))}
                    />
                    <Label className="korean-text">흑백</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={options.filters.sepia}
                      onCheckedChange={(checked) => setOptions(prev => ({...prev, filters: {...prev.filters, sepia: checked}}))}
                    />
                    <Label className="korean-text">세피아</Label>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <div>
                    <Label className="korean-text">회전: {options.rotation}°</Label>
                    <Slider
                      value={[options.rotation]}
                      onValueChange={(value) => setOptions(prev => ({...prev, rotation: value[0]}))}
                      max={360}
                      min={0}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={options.crop.enabled}
                      onCheckedChange={(checked) => setOptions(prev => ({...prev, crop: {...prev.crop, enabled: checked}}))}
                    />
                    <Label className="korean-text">크롭</Label>
                  </div>

                  {options.crop.enabled && (
                    <div className="space-y-3 ml-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="korean-text">X 위치: {options.crop.x}%</Label>
                          <Slider
                            value={[options.crop.x]}
                            onValueChange={(value) => setOptions(prev => ({...prev, crop: {...prev.crop, x: value[0]}}))}
                            max={100}
                            min={0}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label className="korean-text">Y 위치: {options.crop.y}%</Label>
                          <Slider
                            value={[options.crop.y]}
                            onValueChange={(value) => setOptions(prev => ({...prev, crop: {...prev.crop, y: value[0]}}))}
                            max={100}
                            min={0}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="korean-text">크롭 너비: {options.crop.width}%</Label>
                          <Slider
                            value={[options.crop.width]}
                            onValueChange={(value) => setOptions(prev => ({...prev, crop: {...prev.crop, width: value[0]}}))}
                            max={100}
                            min={1}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label className="korean-text">크롭 높이: {options.crop.height}%</Label>
                          <Slider
                            value={[options.crop.height]}
                            onValueChange={(value) => setOptions(prev => ({...prev, crop: {...prev.crop, height: value[0]}}))}
                            max={100}
                            min={1}
                            step={1}
                            className="mt-2"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={() => setOptions(prev => ({...prev, crop: {...prev.crop, x: 0, y: 0, width: 100, height: 100}}))}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Crop className="h-3 w-3 mr-1" />
                        크롭 초기화
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={options.watermark.enabled}
                      onCheckedChange={(checked) => setOptions(prev => ({...prev, watermark: {...prev.watermark, enabled: checked}}))}
                    />
                    <Label className="korean-text">워터마크</Label>
                  </div>

                  {options.watermark.enabled && (
                    <div className="space-y-3 ml-6">
                      <div>
                        <Label className="korean-text">텍스트</Label>
                        <Input
                          value={options.watermark.text}
                          onChange={(e) => setOptions(prev => ({...prev, watermark: {...prev.watermark, text: e.target.value}}))}
                          placeholder="워터마크 텍스트"
                        />
                      </div>
                      <div>
                        <Label className="korean-text">투명도: {options.watermark.opacity}%</Label>
                        <Slider
                          value={[options.watermark.opacity]}
                          onValueChange={(value) => setOptions(prev => ({...prev, watermark: {...prev.watermark, opacity: value[0]}}))}
                          max={100}
                          min={10}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="korean-text">위치</Label>
                        <Select value={options.watermark.position} onValueChange={(value: any) => setOptions(prev => ({...prev, watermark: {...prev.watermark, position: value}}))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="topLeft">왼쪽 상단</SelectItem>
                            <SelectItem value="topRight">오른쪽 상단</SelectItem>
                            <SelectItem value="bottomLeft">왼쪽 하단</SelectItem>
                            <SelectItem value="bottomRight">오른쪽 하단</SelectItem>
                            <SelectItem value="center">중앙</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="space-y-2">
                <Button
                  onClick={() => selectedImage && processImage(selectedImage)}
                  disabled={!selectedImage || processing}
                  className="w-full"
                  data-testid="button-process-single"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  선택된 이미지 처리
                </Button>
                <Button
                  onClick={processAllImages}
                  disabled={uploadedImages.length === 0 || processing}
                  variant="secondary"
                  className="w-full"
                  data-testid="button-process-all"
                >
                  <Star className="h-4 w-4 mr-2" />
                  모든 이미지 일괄 처리
                </Button>
              </div>

              {processing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="korean-text">처리 중...</span>
                    <span>{processingProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={processingProgress} className="w-full" />
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 결과 영역 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 실시간 미리보기 */}
          {selectedImage && (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse"></div>
                  </div>
                  <h3 className="text-lg font-semibold korean-text">실시간 미리보기</h3>
                  <Badge variant="outline">{selectedImage.name}</Badge>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="korean-text">원본 이미지</Label>
                    <div className="mt-2 aspect-video bg-muted rounded-lg overflow-hidden">
                      <img
                        src={URL.createObjectURL(selectedImage)}
                        alt="원본"
                        className="w-full h-full object-contain"
                        onLoad={(e) => {
                          URL.revokeObjectURL((e.target as HTMLImageElement).src);
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="korean-text">미리보기 (처리 후)</Label>
                    <div className="mt-2 aspect-video bg-muted rounded-lg overflow-hidden">
                      {previewImage ? (
                        <img
                          src={previewImage}
                          alt="미리보기"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <FileImage className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-sm korean-text">미리보기 준비중...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="font-medium">포맷</div>
                    <div className="text-muted-foreground">{options.format.toUpperCase()}</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="font-medium">크기</div>
                    <div className="text-muted-foreground">{options.width}×{options.height}</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="font-medium">품질</div>
                    <div className="text-muted-foreground">{options.quality}%</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="font-medium">회전</div>
                    <div className="text-muted-foreground">{options.rotation}°</div>
                  </div>
                </div>
              </div>
            </Card>
          )}
          
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <h3 className="text-lg font-semibold korean-text">처리된 이미지</h3>
                <Badge variant="secondary">{processedImages.length}개</Badge>
              </div>
              {processedImages.length > 0 && (
                <Button onClick={downloadAllImages} data-testid="button-download-all">
                  <Download className="h-4 w-4 mr-2" />
                  전체 다운로드
                </Button>
              )}
            </div>

            {processedImages.length === 0 ? (
              <div className="text-center py-12">
                <FileImage className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground korean-text">
                  처리된 이미지가 없습니다. 위에서 이미지를 업로드하고 처리해보세요.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {processedImages.map((img) => (
                  <Card key={img.id} className="p-4">
                    <div className="space-y-3">
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                        <img
                          src={img.canvas.toDataURL(`image/${img.format}`, img.quality / 100)}
                          alt={img.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium truncate">{img.name}</h4>
                          <Badge variant="outline">{img.format.toUpperCase()}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <span>크기: {img.width} × {img.height}</span>
                          <span>품질: {img.quality}%</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => downloadImage(img)}
                            size="sm"
                            className="flex-1"
                            data-testid={`button-download-${img.id}`}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            다운로드
                          </Button>
                          <Button
                            onClick={() => {
                              setProcessedImages(prev => prev.filter(p => p.id !== img.id));
                              toast({
                                title: "삭제됨",
                                description: `${img.name} 이미지가 삭제되었습니다.`,
                              });
                            }}
                            size="sm"
                            variant="outline"
                            data-testid={`button-delete-${img.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>

          {/* 기능 안내 */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                <h3 className="text-lg font-semibold korean-text">제공 기능</h3>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium korean-text">🔄 기본 변환</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 korean-text">
                    <li>• 포맷 변환 (JPEG, PNG, WebP)</li>
                    <li>• 크기 조정 (비율 유지 옵션)</li>
                    <li>• 품질 조정 (1-100%)</li>
                    <li>• 회전 (0-360도)</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium korean-text">🎨 고급 편집</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 korean-text">
                    <li>• 필터 (밝기, 대비, 채도)</li>
                    <li>• 특수 효과 (흑백, 세피아, 블러)</li>
                    <li>• 워터마크 추가</li>
                    <li>• 일괄 처리</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}