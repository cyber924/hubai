import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Save, X, Plus, Minus, RefreshCw } from "lucide-react";
import { z } from "zod";
import type { Product } from "@shared/schema";

const productEditSchema = z.object({
  name: z.string().min(1, "상품명은 필수입니다"),
  description: z.string().optional(),
  price: z.string().min(1, "가격은 필수입니다"),
  originalPrice: z.string().optional(),
  imageUrl: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  season: z.string().optional(),
  gender: z.string().optional(),
  ageGroup: z.string().optional(),
});

type ProductEditFormData = z.infer<typeof productEditSchema>;

interface ProductEditModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ProductEditModal({ 
  product, 
  open, 
  onClose,
  onSuccess
}: ProductEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  const form = useForm<ProductEditFormData>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      originalPrice: "",
      imageUrl: "",
      category: "",
      subcategory: "",
      brand: "",
      season: "",
      gender: "",
      ageGroup: "",
    },
  });

  // 모달이 열릴 때 폼 데이터 초기화
  useEffect(() => {
    if (product && open) {
      form.reset({
        name: product.name || "",
        description: product.description || "",
        price: product.price?.toString() || "",
        originalPrice: product.originalPrice?.toString() || "",
        imageUrl: product.imageUrl || "",
        category: product.category || "",
        subcategory: product.subcategory || "",
        brand: product.brand || "",
        season: product.season || "",
        gender: product.gender || "",
        ageGroup: product.ageGroup || "",
      });
      setImageUrls(product.imageUrls || []);
      setTags(product.tags || []);
    }
  }, [product, open, form]);

  const updateProductMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => api.updateProduct(id, updates),
    onSuccess: () => {
      toast({
        title: "성공",
        description: "상품이 수정되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      onSuccess?.();
      onClose();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "상품 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductEditFormData) => {
    if (!product) return;

    const updates = {
      ...data,
      price: Number(data.price),
      originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
      imageUrls: imageUrls.filter(url => url.trim()),
      tags: tags.filter(tag => tag.trim()),
      updatedAt: new Date(),
    };

    updateProductMutation.mutate({
      id: product.id,
      updates
    });
  };

  const handleAddImageUrl = () => {
    setImageUrls([...imageUrls, ""]);
  };

  const handleImageUrlChange = (index: number, value: string) => {
    const newUrls = [...imageUrls];
    newUrls[index] = value;
    setImageUrls(newUrls);
  };

  const handleRemoveImageUrl = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-product-edit">
        <DialogHeader>
          <DialogTitle className="korean-text text-xl" data-testid="text-modal-title">
            상품 수정
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold korean-text">기본 정보</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="korean-text">상품명 *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="상품명을 입력하세요"
                          {...field}
                          data-testid="input-product-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="korean-text">상품 설명</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="상품 설명을 입력하세요"
                          className="min-h-[100px]"
                          {...field}
                          data-testid="textarea-product-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="korean-text">현재 가격 *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            data-testid="input-product-price"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="originalPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="korean-text">원래 가격</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            data-testid="input-product-original-price"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 이미지 정보 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold korean-text">이미지</h3>
                
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="korean-text">메인 이미지 URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/image.jpg"
                          {...field}
                          data-testid="input-main-image-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium korean-text">추가 이미지 URL</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddImageUrl}
                      data-testid="button-add-image-url"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      추가
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {imageUrls.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="https://example.com/image.jpg"
                          value={url}
                          onChange={(e) => handleImageUrlChange(index, e.target.value)}
                          data-testid={`input-additional-image-${index}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveImageUrl(index)}
                          data-testid={`button-remove-image-${index}`}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* 상품 분류 */}
            <div>
              <h3 className="text-lg font-semibold korean-text mb-4">상품 분류</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="korean-text">카테고리</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="예: 의류"
                          {...field}
                          data-testid="input-category"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="korean-text">하위 카테고리</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="예: 셔츠"
                          {...field}
                          data-testid="input-subcategory"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="korean-text">브랜드</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="브랜드명"
                          {...field}
                          data-testid="input-brand"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="season"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="korean-text">시즌</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-season">
                            <SelectValue placeholder="시즌 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="봄">봄</SelectItem>
                          <SelectItem value="여름">여름</SelectItem>
                          <SelectItem value="가을">가을</SelectItem>
                          <SelectItem value="겨울">겨울</SelectItem>
                          <SelectItem value="사계절">사계절</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="korean-text">성별</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gender">
                            <SelectValue placeholder="성별 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="남성">남성</SelectItem>
                          <SelectItem value="여성">여성</SelectItem>
                          <SelectItem value="유니섹스">유니섹스</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ageGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="korean-text">연령대</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-age-group">
                            <SelectValue placeholder="연령대 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="키즈">키즈</SelectItem>
                          <SelectItem value="10대">10대</SelectItem>
                          <SelectItem value="20대">20대</SelectItem>
                          <SelectItem value="30대">30대</SelectItem>
                          <SelectItem value="40대">40대</SelectItem>
                          <SelectItem value="50대+">50대+</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* 태그 */}
            <div>
              <h3 className="text-lg font-semibold korean-text mb-4">태그</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="태그를 입력하세요"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    data-testid="input-new-tag"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTag}
                    data-testid="button-add-tag"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="korean-text cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                        data-testid={`tag-${index}`}
                      >
                        #{tag}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* 액션 버튼 */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-edit"
                className="korean-text"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={updateProductMutation.isPending}
                data-testid="button-save-product"
                className="korean-text"
              >
                {updateProductMutation.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {updateProductMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}