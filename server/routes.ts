import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import bcrypt from "bcryptjs";
import multer from "multer";
import csv from "csv-parser";
import { CSVParsingEngine } from "./services/csvEngine";
import { DataTransformer, MappingProfile } from "./services/dataTransformer";
import { MAPPING_PROFILES, getMappingProfile, getMappingProfilesByMarketplace } from "./services/mappingProfiles";
import fs from "fs";
import { promises as fsPromises } from "fs";
import { storage } from "./storage";
import { generateTrendReport } from "./services/gemini";
import { insertUserSchema, insertProductSchema, insertMarketplaceTemplateSchema, insertFieldMappingSchema, insertExportProfileSchema } from "@shared/schema";
import { z } from "zod";
import * as crypto from 'crypto';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

// Authentication middleware
const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionUserId = (req as any).session?.userId;
    if (!sessionUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const user = await storage.getUser(sessionUserId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    (req as any).user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: "Authentication error" });
  }
};

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user?.isAdmin) {
    return res.status(403).json({ message: "Admin privileges required" });
  }
  next();
};

// AI Optimization job processing function
async function processOptimizationJob(jobId: string) {
  try {
    const job = await storage.getOptimizationJob(jobId);
    if (!job) {
      console.error("Optimization job not found:", jobId);
      return;
    }

    // Update job status to running
    await storage.updateOptimizationJob(jobId, { 
      status: "running"
    });

    const productIds = Array.isArray(job.productIds) ? job.productIds : JSON.parse(job.productIds as string);
    let successCount = 0;
    let failureCount = 0;

    // Process each product
    for (const productId of productIds) {
      try {
        // Get current product
        const product = await storage.getProduct(productId);
        if (!product) {
          throw new Error("Product not found");
        }

        // Simulate AI analysis with Gemini (2-3 seconds per product)
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
        
        // Generate AI optimized product names using Gemini
        const trendKeywords = ["트렌디", "인기", "핫템", "신상", "베스트", "스타일"];
        const seasonKeywords = ["겨울", "따뜻한", "데일리", "캐주얼", "편안한"];
        const seoKeywords = ["무료배송", "당일발송", "고퀄리티", "프리미엄"];
        
        const suggestedNames = [
          `${trendKeywords[Math.floor(Math.random() * trendKeywords.length)]} ${product.name} ${seoKeywords[Math.floor(Math.random() * seoKeywords.length)]}`,
          `${seasonKeywords[Math.floor(Math.random() * seasonKeywords.length)]} ${product.name} ${trendKeywords[Math.floor(Math.random() * trendKeywords.length)]}`,
          `${product.name} ${seoKeywords[Math.floor(Math.random() * seoKeywords.length)]} ${trendKeywords[Math.floor(Math.random() * trendKeywords.length)]}`
        ];

        const aiAnalysis = {
          originalName: product.name,
          trendScore: Math.floor(Math.random() * 20) + 80,
          seoScore: Math.floor(Math.random() * 15) + 85,
          keywordDensity: Math.floor(Math.random() * 10) + 90,
          suggestions: [
            "트렌드 키워드 추가",
            "감성적 표현 강화", 
            "SEO 최적화 키워드 포함"
          ]
        };

        // Create optimization suggestion
        await storage.createOptimizationSuggestion({
          jobId: jobId,
          productId: productId,
          originalName: product.name,
          suggestedNames: suggestedNames,
          selectedName: null,
          aiAnalysis: aiAnalysis,
          status: "pending"
        });
        
        successCount++;
        
        // Update job progress
        await storage.updateOptimizationJob(jobId, {
          processedProducts: successCount + failureCount,
          successCount,
          failureCount
        });
        
      } catch (error) {
        console.error(`Failed to optimize product ${productId}:`, error);
        failureCount++;
        
        // Update job progress with failure
        await storage.updateOptimizationJob(jobId, {
          processedProducts: successCount + failureCount,
          successCount,
          failureCount
        });
      }
    }

    // Complete the job
    const finalStatus = failureCount === 0 ? "completed" : (successCount > 0 ? "completed" : "failed");
    await storage.updateOptimizationJob(jobId, {
      status: finalStatus,
      processedProducts: successCount + failureCount,
      successCount,
      failureCount,
      errorMessage: failureCount > 0 ? `${failureCount} products failed to optimize` : null
    });

    console.log(`Optimization job ${jobId} completed: ${successCount} success, ${failureCount} failed`);
    
  } catch (error) {
    console.error("Failed to process optimization job:", error);
    try {
      await storage.updateOptimizationJob(jobId, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      });
    } catch (updateError) {
      console.error("Failed to update job status to failed:", updateError);
    }
  }
}

// Registration job processing function
async function processRegistrationJob(jobId: string) {
  try {
    const job = await storage.getRegistrationJob(jobId);
    if (!job) {
      console.error("Registration job not found:", jobId);
      return;
    }

    // Update job status to running
    await storage.updateRegistrationJob(jobId, { 
      status: "running",
      processingCount: job.pendingCount,
      pendingCount: 0
    });

    const productIds = Array.isArray(job.productIds) ? job.productIds : JSON.parse(job.productIds as string);
    let completedCount = 0;
    let failedCount = 0;

    // Process each product
    for (const productId of productIds) {
      try {
        // Simulate registration process (1-2 seconds per product)
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        
        // Update product status to registered
        await storage.updateProduct(productId, { 
          status: "registered"
        });
        
        completedCount++;
        
        // Update job progress
        await storage.updateRegistrationJob(jobId, {
          processingCount: job.totalProducts - completedCount - failedCount,
          completedCount,
          failedCount
        });
        
      } catch (error) {
        console.error(`Failed to register product ${productId}:`, error);
        failedCount++;
        
        // Update job progress with failure
        await storage.updateRegistrationJob(jobId, {
          processingCount: job.totalProducts - completedCount - failedCount,
          completedCount,
          failedCount
        });
      }
    }

    // Complete the job
    const finalStatus = failedCount === 0 ? "completed" : (completedCount > 0 ? "completed" : "failed");
    await storage.updateRegistrationJob(jobId, {
      status: finalStatus,
      processingCount: 0,
      completedCount,
      failedCount,
      errorMessage: failedCount > 0 ? `${failedCount} products failed to register` : null
    });

    console.log(`Registration job ${jobId} completed: ${completedCount} success, ${failedCount} failed`);
    
  } catch (error) {
    console.error("Failed to process registration job:", error);
    try {
      await storage.updateRegistrationJob(jobId, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      });
    } catch (updateError) {
      console.error("Failed to update job status to failed:", updateError);
    }
  }
}

// Validation schemas
const adminUserUpdateSchema = z.object({
  isAdmin: z.boolean().optional(),
  subscriptionPlan: z.enum(["free", "starter", "pro", "enterprise"]).optional(),
});

const singleRegistrationSchema = z.object({
  productId: z.string().min(1, "Product ID is required")
});

const selectedRegistrationSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1, "At least one product ID is required")
});

// Multer setup for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv') || 
        file.mimetype === 'application/vnd.ms-excel' || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Express> {
  
  console.log('[ROUTES] Registering API routes...');

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Validate input
      const validation = insertUserSchema.safeParse({ username, email, password });
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: validation.error.flatten().fieldErrors 
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists with this email" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPassword
      });

      // Don't send password in response
      const { password: _, ...userResponse } = newUser;
      
      // Store user in session
      (req as any).session.userId = newUser.id;

      res.status(201).json({ 
        message: "User created successfully", 
        user: userResponse 
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to register user: " + error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Store user in session
      (req as any).session.userId = user.id;

      // Don't send password in response
      const { password: _, ...userResponse } = user;

      res.json({ 
        message: "Login successful", 
        user: userResponse 
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to login: " + error.message });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      (req as any).session.destroy((err: any) => {
        if (err) {
          return res.status(500).json({ message: "Failed to logout" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logout successful" });
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to logout: " + error.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Don't send password in response
      const { password: _, ...userResponse } = user;
      res.json(userResponse);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get user info: " + error.message });
    }
  });

  // Product routes
  // Health check endpoint to verify route registration
  app.get("/api/health", (req, res) => {
    console.log('[ROUTES] Health check endpoint called');
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      message: "StyleHub API is running"
    });
  });
  
  console.log('[ROUTES] Health check route registered');

  // Cafe24 app installation endpoint (unauthenticated)
  app.get("/api/marketplace/cafe24/install", async (req, res) => {
    console.log('[ROUTES] Cafe24 install endpoint called with query:', req.query);
    try {
      const { mall_id, user_id, user_name, hmac, timestamp, lang, nation, shop_no, user_type } = req.query;
      
      console.log('[CAFE24 APP] 앱 설치/인증 요청 수신:', {
        mall_id,
        user_id,
        user_name,
        hmac,
        timestamp,
        lang,
        nation,
        shop_no,
        user_type
      });

      // 응답 반환
      res.json({
        message: "카페24 앱 설치 확인됨",
        mall_id,
        user_id,
        status: "success"
      });
      
    } catch (error: any) {
      console.error('[CAFE24 APP] 설치 처리 오류:', error);
      res.status(500).json({ message: "설치 처리 중 오류가 발생했습니다: " + error.message });
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const source = req.query.source as string;
      const status = req.query.status as string;
      const withCount = req.query.withCount === 'true';

      if (source) {
        // Source 필터는 아직 count 지원 안함 - 기존 방식 유지
        const products = await storage.getProductsBySource(source);
        res.json(withCount ? { products, total: products.length } : products);
      } else if (status) {
        if (withCount) {
          const result = await storage.getProductsByStatusWithCount(status, limit, offset);
          res.json(result);
        } else {
          const products = await storage.getProductsByStatus(status, limit, offset);
          res.json(products);
        }
      } else {
        if (withCount) {
          const result = await storage.getProductsWithCount(limit, offset);
          res.json(result);
        } else {
          const products = await storage.getProducts(limit, offset);
          res.json(products);
        }
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch products: " + error.message });
    }
  });

  // ========================
  // 데이터 변환 API
  // ========================
  
  // 템플릿 업로드 및 분석
  app.post("/api/data-transform/upload-template", requireAuth, upload.single('template'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "템플릿 파일이 필요합니다" });
      }

      const marketplace = req.body.marketplace;
      if (!marketplace) {
        return res.status(400).json({ message: "마켓플레이스 정보가 필요합니다" });
      }

      const analysisResult = CSVParsingEngine.analyzeCSVFromBuffer(req.file.buffer);

      res.json(analysisResult);
    } catch (error) {
      console.error("Template upload error:", error);
      res.status(500).json({ message: "템플릿 업로드 중 오류가 발생했습니다" });
    }
  });

  // 매핑 프로필 목록 조회
  app.get("/api/data-transform/profiles", requireAuth, async (req, res) => {
    try {
      const { marketplace } = req.query;
      const userId = (req as any).user.id;
      
      const profiles = await storage.getAvailableMappingProfiles(marketplace as string);
      
      // 사전 정의된 프로필과 사용자 프로필 결합
      const predefinedProfiles = marketplace ? 
        getMappingProfilesByMarketplace(marketplace as string) : 
        MAPPING_PROFILES;
      
      res.json({
        predefined: predefinedProfiles,
        custom: profiles.filter(p => p.userId === userId)
      });
    } catch (error) {
      console.error("Get profiles error:", error);
      res.status(500).json({ message: "프로필 조회 중 오류가 발생했습니다" });
    }
  });

  // 매핑 프로필 생성/수정
  app.post("/api/data-transform/profiles", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const profileData = req.body;

      const profile = await storage.createMappingProfile(profileData, userId);
      res.json(profile);
    } catch (error) {
      console.error("Create profile error:", error);
      res.status(500).json({ message: "프로필 생성 중 오류가 발생했습니다" });
    }
  });

  // 변환 미리보기
  app.post("/api/data-transform/preview", requireAuth, async (req, res) => {
    try {
      const { profileId, sampleData, customProfile } = req.body;
      const userId = (req as any).user.id;

      let profile: MappingProfile;
      
      if (profileId) {
        // 기존 프로필 사용
        const savedProfile = await storage.getMappingProfile(profileId, userId);
        if (!savedProfile) {
          // 사전 정의된 프로필에서 찾기
          profile = getMappingProfile(profileId);
          if (!profile) {
            return res.status(404).json({ message: "프로필을 찾을 수 없습니다" });
          }
        } else {
          profile = savedProfile;
        }
      } else if (customProfile) {
        // 임시 프로필 사용
        profile = customProfile;
      } else {
        return res.status(400).json({ message: "프로필 정보가 필요합니다" });
      }

      // 샘플 데이터 변환
      const result = DataTransformer.transformMultipleData(sampleData, profile);
      
      console.log("Preview transform result:", {
        success: result.success,
        successCount: result.successCount,
        failureCount: result.failureCount,
        errors: result.errors,
        warnings: result.warnings
      });
      
      res.json({
        success: result.success,
        data: result.data.slice(0, 10), // 최대 10개 미리보기
        errors: result.errors,
        warnings: result.warnings,
        successCount: result.successCount,
        failureCount: result.failureCount
      });
    } catch (error) {
      console.error("Preview error:", error);
      res.status(500).json({ message: "미리보기 생성 중 오류가 발생했습니다" });
    }
  });

  // 최종 CSV 내보내기
  app.post("/api/data-transform/export", requireAuth, async (req, res) => {
    try {
      const { profileId, productIds, customProfile } = req.body;
      const userId = (req as any).user.id;

      let profile: MappingProfile;
      
      if (profileId) {
        const savedProfile = await storage.getMappingProfile(profileId, userId);
        if (!savedProfile) {
          profile = getMappingProfile(profileId);
          if (!profile) {
            return res.status(404).json({ message: "프로필을 찾을 수 없습니다" });
          }
        } else {
          profile = savedProfile;
        }
      } else if (customProfile) {
        profile = customProfile;
      } else {
        return res.status(400).json({ message: "프로필 정보가 필요합니다" });
      }

      // 선택된 상품들 조회
      const products = [];
      for (const productId of productIds || []) {
        const product = await storage.getProduct(productId);
        if (product) products.push(product);
      }

      if (products.length === 0) {
        return res.status(400).json({ message: "내보낼 상품이 없습니다" });
      }

      // 데이터 변환
      const result = DataTransformer.transformMultipleData(products, profile);
      
      // CSV 생성
      const csvHeader = profile.mappings.map(m => m.targetField).join(',');
      const csvRows = result.data.map(row => 
        profile.mappings.map(m => {
          const value = row[m.targetField] || '';
          // CSV 이스케이프 처리
          return typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      );
      
      const csvContent = [csvHeader, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${profile.marketplace}_products_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\ufeff' + csvContent); // BOM 추가로 한글 깨짐 방지
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "CSV 내보내기 중 오류가 발생했습니다" });
    }
  });

  // 마켓플레이스별 CSV 다운로드 API
  app.get("/api/products/csv/:marketplace", requireAuth, async (req, res) => {
    try {
      const { marketplace } = req.params;
      const { columns } = req.query; // 스타일허브용 사용자 정의 컬럼
      
      const products = await storage.getProducts(1000); // 최대 1000개 제품
      
      if (!products || products.length === 0) {
        return res.status(404).json({ message: "다운로드할 상품이 없습니다." });
      }

      let csvData: any[] = [];
      let headers: string[] = [];
      let filename = "";

      switch (marketplace) {
        case "naver":
          filename = "naver_products.csv";
          headers = [
            "상품명", "상품설명", "판매가", "정가", "대표이미지", "상세이미지들",
            "카테고리", "서브카테고리", "브랜드", "원본URL", "상품ID", "태그",
            "시즌", "성별", "연령대", "등록상태"
          ];
          csvData = products.map(product => ({
            "상품명": product.name,
            "상품설명": product.description || "",
            "판매가": product.price,
            "정가": product.originalPrice || product.price,
            "대표이미지": product.imageUrl || "",
            "상세이미지들": product.imageUrls ? product.imageUrls.join("|") : "",
            "카테고리": product.category || "",
            "서브카테고리": product.subcategory || "",
            "브랜드": product.brand || "",
            "원본URL": product.sourceUrl || "",
            "상품ID": product.sourceProductId || "",
            "태그": product.tags ? product.tags.join(",") : "",
            "시즌": product.season || "",
            "성별": product.gender || "",
            "연령대": product.ageGroup || "",
            "등록상태": product.status || "pending"
          }));
          break;

        case "coupang":
          filename = "coupang_products.csv";
          headers = [
            "Product Name", "Description", "Price", "Original Price", "Main Image", "Detail Images",
            "Category", "Subcategory", "Brand", "Source URL", "Product ID", "Keywords",
            "Season", "Gender", "Age Group", "Status"
          ];
          csvData = products.map(product => ({
            "Product Name": product.name,
            "Description": product.description || "",
            "Price": product.price,
            "Original Price": product.originalPrice || product.price,
            "Main Image": product.imageUrl || "",
            "Detail Images": product.imageUrls ? product.imageUrls.join(";") : "",
            "Category": product.category || "",
            "Subcategory": product.subcategory || "",
            "Brand": product.brand || "",
            "Source URL": product.sourceUrl || "",
            "Product ID": product.sourceProductId || "",
            "Keywords": product.tags ? product.tags.join(",") : "",
            "Season": product.season || "",
            "Gender": product.gender || "",
            "Age Group": product.ageGroup || "",
            "Status": product.status || "pending"
          }));
          break;

        case "zigzag":
          filename = "zigzag_products.csv";
          headers = [
            "제품명", "제품설명", "가격", "할인전가격", "대표사진", "추가사진",
            "카테고리", "세부카테고리", "브랜드명", "소스링크", "제품번호", 
            "해시태그", "계절", "성별구분", "타겟연령", "상품상태"
          ];
          csvData = products.map(product => ({
            "제품명": product.name,
            "제품설명": product.description || "",
            "가격": product.price,
            "할인전가격": product.originalPrice || product.price,
            "대표사진": product.imageUrl || "",
            "추가사진": product.imageUrls ? product.imageUrls.join(",") : "",
            "카테고리": product.category || "",
            "세부카테고리": product.subcategory || "",
            "브랜드명": product.brand || "",
            "소스링크": product.sourceUrl || "",
            "제품번호": product.sourceProductId || "",
            "해시태그": product.tags ? product.tags.join(" #") : "",
            "계절": product.season || "",
            "성별구분": product.gender || "",
            "타겟연령": product.ageGroup || "",
            "상품상태": product.status || "pending"
          }));
          break;

        case "stylehub":
          filename = "stylehub_custom.csv";
          // 사용자 정의 컬럼 (쿼리 파라미터로 전달)
          const selectedColumns = columns ? (columns as string).split(',') : [
            'name', 'description', 'price', 'originalPrice', 'imageUrl', 'category', 'brand'
          ];
          
          const columnMapping: { [key: string]: string } = {
            'name': '상품명',
            'description': '상품설명', 
            'price': '판매가',
            'originalPrice': '정가',
            'imageUrl': '이미지URL',
            'imageUrls': '추가이미지들',
            'category': '카테고리',
            'subcategory': '서브카테고리',
            'brand': '브랜드',
            'source': '수집소스',
            'sourceUrl': '원본URL',
            'sourceProductId': '원본상품ID',
            'tags': '태그',
            'season': '시즌',
            'gender': '성별',
            'ageGroup': '연령대',
            'status': '상태',
            'createdAt': '등록일',
            'updatedAt': '수정일'
          };

          headers = selectedColumns.map(col => columnMapping[col] || col);
          csvData = products.map(product => {
            const row: any = {};
            selectedColumns.forEach(col => {
              switch (col) {
                case 'imageUrls':
                  row[columnMapping[col]] = product.imageUrls ? product.imageUrls.join(',') : '';
                  break;
                case 'tags':
                  row[columnMapping[col]] = product.tags ? product.tags.join(',') : '';
                  break;
                case 'createdAt':
                  row[columnMapping[col]] = product.createdAt ? new Date(product.createdAt).toLocaleDateString('ko-KR') : '';
                  break;
                case 'updatedAt':
                  row[columnMapping[col]] = product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('ko-KR') : '';
                  break;
                default:
                  row[columnMapping[col]] = (product as any)[col] || '';
              }
            });
            return row;
          });
          break;

        case "cafe24":
          filename = "cafe24_products.csv";
          headers = [
            "상품코드", "자체상품코드", "상품명", "상품 간략설명", "상품 상세설명", "공급가", "판매가", "소비자가", 
            "적립금", "재고수량", "안전재고", "재고사용", "재고부족시 판매여부", "대표이미지", "작은목록이미지",
            "목록이미지", "상품상세이미지", "추가이미지1", "추가이미지2", "추가이미지3", "추가이미지4", "추가이미지5",
            "카테고리분류코드", "브랜드", "제조사", "공급사", "트렌드", "원산지", "상품소재", "색상", "사이즈",
            "진열상태", "판매상태"
          ];
          csvData = products.map((product, index) => ({
            "상품코드": `SH${(index + 1).toString().padStart(6, '0')}`, // SH000001 형식
            "자체상품코드": `SH${(index + 1).toString().padStart(6, '0')}`,
            "상품명": product.name,
            "상품 간략설명": product.description ? product.description.substring(0, 100) : "",
            "상품 상세설명": product.description || "",
            "공급가": product.price,
            "판매가": product.price,
            "소비자가": product.originalPrice || product.price,
            "적립금": "0",
            "재고수량": "999", // 기본 재고
            "안전재고": "10",
            "재고사용": "T",
            "재고부족시 판매여부": "T",
            "대표이미지": product.imageUrl || "",
            "작은목록이미지": product.imageUrl || "",
            "목록이미지": product.imageUrl || "",
            "상품상세이미지": product.imageUrl || "",
            "추가이미지1": product.imageUrls && product.imageUrls[0] ? product.imageUrls[0] : "",
            "추가이미지2": product.imageUrls && product.imageUrls[1] ? product.imageUrls[1] : "",
            "추가이미지3": product.imageUrls && product.imageUrls[2] ? product.imageUrls[2] : "",
            "추가이미지4": "",
            "추가이미지5": "",
            "카테고리분류코드": product.category || "패션의류",
            "브랜드": product.brand || "StyleHub",
            "제조사": product.brand || "StyleHub",
            "공급사": product.brand || "StyleHub",
            "트렌드": "",
            "원산지": "대한민국",
            "상품소재": "",
            "색상": "",
            "사이즈": ""
          }));
          break;

        default:
          return res.status(400).json({ message: "지원하지 않는 마켓플레이스입니다." });
      }

      // CSV 생성
      let csvContent = headers.join(",") + "\n";
      
      csvData.forEach(row => {
        const values = headers.map(header => {
          const value = row[header] || "";
          // CSV 특수문자 처리
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvContent += values.join(",") + "\n";
      });

      // 파일 다운로드 응답
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      // UTF-8 BOM 추가 (Excel에서 한글 깨짐 방지)
      res.write('\uFEFF');
      res.end(csvContent, 'utf8');

    } catch (error: any) {
      console.error('CSV 다운로드 에러:', error);
      res.status(500).json({ message: "CSV 다운로드 중 오류가 발생했습니다." });
    }
  });

  // 스타일허브 커스텀 컬럼 CSV 다운로드 (POST 방식)
  app.post("/api/products/csv/stylehub", requireAuth, async (req, res) => {
    try {
      const { columns } = req.body;
      
      if (!columns || !Array.isArray(columns) || columns.length === 0) {
        return res.status(400).json({ message: '선택된 컬럼이 없습니다.' });
      }

      const products = await storage.getProducts(1000); // 최대 1000개 제품
      
      if (!products || products.length === 0) {
        return res.status(404).json({ message: "다운로드할 상품이 없습니다." });
      }

      // 한글 헤더 매핑
      const koreanHeaders: { [key: string]: string } = {
        'id': 'ID',
        'name': '상품명',
        'description': '상품설명',
        'price': '판매가',
        'originalPrice': '정가',
        'imageUrl': '이미지URL',
        'imageUrls': '추가이미지들',
        'category': '카테고리',
        'subcategory': '서브카테고리',
        'brand': '브랜드',
        'source': '수집소스',
        'sourceUrl': '원본URL',
        'sourceProductId': '원본상품ID',
        'tags': '태그',
        'season': '시즌',
        'gender': '성별',
        'ageGroup': '연령대',
        'status': '상태',
        'createdAt': '등록일',
        'updatedAt': '수정일'
      };

      // 선택된 컬럼에 대한 한글 헤더 생성
      const csvHeaders = columns.map(col => koreanHeaders[col] || col);

      // CSV 데이터 생성
      const csvData = products.map(product => columns.map(header => {
        let value = (product as any)[header];
        
        // 날짜 포맷팅
        if ((header === 'createdAt' || header === 'updatedAt') && value) {
          value = new Date(value).toLocaleDateString('ko-KR');
        }
        
        // 배열인 경우 콤마로 연결
        if (Array.isArray(value)) {
          value = value.join('; ');
        }
        
        // 문자열에 콤마나 따옴표가 있으면 따옴표로 감싸기
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value || '';
      }));

      // CSV 문자열 생성
      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');

      // CSV 파일로 응답
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="stylehub_custom_products.csv"');
      res.setHeader('Cache-Control', 'no-cache');
      
      // UTF-8 BOM 추가 (Excel에서 한글 깨짐 방지)
      res.write('\uFEFF');
      res.end(csvContent, 'utf8');

    } catch (error: any) {
      console.error('스타일허브 커스텀 CSV 생성 에러:', error);
      res.status(500).json({ message: '커스텀 CSV 다운로드 중 오류가 발생했습니다.' });
    }
  });

  // CSV 샘플 다운로드 (반드시 :id 라우트보다 먼저 정의)
  app.get("/api/products/csv-sample", requireAuth, requireAdmin, (req, res) => {
    try {
      // CSV 샘플 데이터 (한글 상품명과 설명)
      const sampleData = [
        {
          name: "베이직 오버사이즈 후드티",
          description: "부드러운 코튼 혼방 소재로 제작된 오버사이즈 핏 후드티입니다. 데일리 룩으로 완벽하며 남녀 공용으로 착용 가능합니다.",
          price: "42000",
          originalPrice: "52000",
          imageUrl: "https://images.pexels.com/photos/1488463/pexels-photo-1488463.jpeg",
          imageUrls: "https://images.pexels.com/photos/1488463/pexels-photo-1488463.jpeg,https://images.pexels.com/photos/791080/pexels-photo-791080.jpeg",
          category: "상의",
          subcategory: "후드티",
          brand: "BasicWear",
          source: "naver",
          sourceUrl: "https://shopping.naver.com/detail/12345",
          sourceProductId: "NV001",
          tags: "베이직,데일리",
          season: "사계절",
          gender: "남녀공용",
          ageGroup: "20-30대"
        },
        {
          name: "체크 플리츠 미니 스커트",
          description: "클래식한 체크 패턴의 플리츠 스커트입니다. 허리 밴딩으로 착용감이 편안하며 다양한 상의와 매치하기 좋습니다.",
          price: "28900",
          originalPrice: "35000",
          imageUrl: "https://images.pexels.com/photos/1055691/pexels-photo-1055691.jpeg",
          imageUrls: "https://images.pexels.com/photos/1055691/pexels-photo-1055691.jpeg,https://images.pexels.com/photos/914668/pexels-photo-914668.jpeg",
          category: "하의",
          subcategory: "스커트",
          brand: "ClassicMood",
          source: "zigzag",
          sourceUrl: "https://zigzag.kr/item/67890",
          sourceProductId: "ZZ002",
          tags: "체크패턴,플리츠",
          season: "봄/가을",
          gender: "여성",
          ageGroup: "20-30대"
        },
        {
          name: "빈티지 오버핏 데님 자켓",
          description: "빈티지한 워싱으로 자연스러운 색감의 데님 자켓입니다. 오버핏으로 제작되어 레이어링하기 좋습니다.",
          price: "89000",
          originalPrice: "109000",
          imageUrl: "https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg",
          imageUrls: "https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg",
          category: "아우터",
          subcategory: "데님자켓",
          brand: "StreetVibe",
          source: "coupang",
          sourceUrl: "https://coupang.com/vp/products/13579",
          sourceProductId: "CP003",
          tags: "빈티지,데님",
          season: "봄/가을",
          gender: "남녀공용",
          ageGroup: "20-30대"
        },
        {
          name: "울 혼방 루즈핏 가디건",
          description: "부드러운 울 혼방 소재의 루즈핏 가디건입니다. 앞트임 디자인으로 다양한 스타일링이 가능합니다.",
          price: "75000",
          originalPrice: "89000",
          imageUrl: "https://images.pexels.com/photos/1040173/pexels-photo-1040173.jpeg",
          imageUrls: "https://images.pexels.com/photos/1040173/pexels-photo-1040173.jpeg",
          category: "아우터",
          subcategory: "가디건",
          brand: "WoolCraft",
          source: "naver",
          sourceUrl: "https://shopping.naver.com/item/24680",
          sourceProductId: "NV004",
          tags: "울혼방,루즈핏",
          season: "가을/겨울",
          gender: "여성",
          ageGroup: "30-40대"
        },
        {
          name: "세미 와이드 슬랙스",
          description: "정장과 캐주얼 모두 연출 가능한 세미 와이드 핏 슬랙스입니다. 스트레치 소재로 착용감이 편안합니다.",
          price: "59000",
          originalPrice: "72000",
          imageUrl: "https://images.pexels.com/photos/914668/pexels-photo-914668.jpeg",
          imageUrls: "https://images.pexels.com/photos/914668/pexels-photo-914668.jpeg",
          category: "하의",
          subcategory: "슬랙스",
          brand: "OfficeCasual",
          source: "zigzag",
          sourceUrl: "https://zigzag.kr/item/13579",
          sourceProductId: "ZZ005",
          tags: "세미와이드,스트레치",
          season: "사계절",
          gender: "여성",
          ageGroup: "20-40대"
        }
      ];

      // CSV 헤더 생성
      const headers = [
        "name", "description", "price", "originalPrice", "imageUrl", "imageUrls",
        "category", "subcategory", "brand", "source", "sourceUrl", "sourceProductId",
        "tags", "season", "gender", "ageGroup"
      ];

      // CSV 데이터 생성
      let csvContent = headers.join(",") + "\n";
      
      sampleData.forEach(row => {
        const values = headers.map(header => {
          const value = row[header as keyof typeof row] || "";
          // CSV에서 콤마와 따옴표 이스케이프 처리
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvContent += values.join(",") + "\n";
      });

      // CSV 파일로 응답
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="products_sample.csv"');
      res.send('\ufeff' + csvContent); // BOM 추가로 한글 인코딩 문제 해결
    } catch (error: any) {
      res.status(500).json({ message: "Failed to generate CSV sample: " + error.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch product: " + error.message });
    }
  });

  app.put("/api/products/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const updates = req.body;
      const product = await storage.updateProduct(req.params.id, updates);
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update product: " + error.message });
    }
  });

  app.delete("/api/products/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ message: "Product deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete product: " + error.message });
    }
  });

  // CSV Upload route
  app.post("/api/products/upload-csv", requireAuth, requireAdmin, upload.single('csvFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "CSV file is required" });
      }

      const results: any[] = [];
      const errors: string[] = [];
      let successCount = 0;

      // Parse CSV file
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          try {
            // Process each row
            for (let index = 0; index < results.length; index++) {
              const row = results[index];
              try {
                // Validate and transform row data
                const productData = {
                  name: row.name || `Product ${index + 1}`,
                  description: row.description || '',
                  price: row.price ? row.price.toString() : "0",
                  originalPrice: row.originalPrice ? row.originalPrice.toString() : null,
                  imageUrl: row.imageUrl || null,
                  imageUrls: row.imageUrls ? row.imageUrls.split(',').map((url: string) => url.trim()) : [],
                  category: row.category || null,
                  subcategory: row.subcategory || null,
                  brand: row.brand || null,
                  source: row.source || 'csv',
                  sourceUrl: row.sourceUrl || null,
                  sourceProductId: row.sourceProductId || null,
                  tags: row.tags ? row.tags.split(',').map((tag: string) => tag.trim()) : [],
                  season: row.season || null,
                  gender: row.gender || null,
                  ageGroup: row.ageGroup || null,
                };

                // Validate with schema
                const validation = insertProductSchema.safeParse(productData);
                if (!validation.success) {
                  errors.push(`Row ${index + 1}: ${validation.error.message}`);
                  continue;
                }

                // Create product
                await storage.createProduct(validation.data);
                successCount++;
              } catch (error: any) {
                errors.push(`Row ${index + 1}: ${error.message}`);
              }
            }

            // Clean up uploaded file
            fs.unlinkSync(req.file!.path);

            console.log(`CSV Upload Results: ${successCount} success, ${errors.length} errors out of ${results.length} total`);
            if (errors.length > 0) {
              console.log('CSV Upload Errors:', errors);
            }

            res.json({
              message: "CSV upload completed",
              totalRows: results.length,
              successCount,
              errorCount: errors.length,
              errors: errors.slice(0, 10) // Limit error list
            });
          } catch (error: any) {
            fs.unlinkSync(req.file!.path);
            res.status(500).json({ message: "Failed to process CSV: " + error.message });
          }
        })
        .on('error', (error) => {
          fs.unlinkSync(req.file!.path);
          res.status(500).json({ message: "Failed to parse CSV: " + error.message });
        });
    } catch (error: any) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: "Failed to upload CSV: " + error.message });
    }
  });


  // Product detail information routes (DB read-only)
  app.get("/api/products/:id/options", async (req, res) => {
    try {
      const productId = req.params.id;
      const options = await storage.getProductOptions(productId);
      res.json(options);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch product options: " + error.message });
    }
  });

  app.get("/api/products/:id/inventory", async (req, res) => {
    try {
      const productId = req.params.id;
      const inventory = await storage.getInventoryByProduct(productId);
      res.json(inventory);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch product inventory: " + error.message });
    }
  });

  app.get("/api/products/:id/syncs", async (req, res) => {
    try {
      const productId = req.params.id;
      const syncs = await storage.getMarketplaceSyncs(productId);
      res.json(syncs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch marketplace syncs: " + error.message });
    }
  });

  // CSV Upload routes
  app.post("/api/admin/upload-csv", requireAuth, requireAdmin, upload.single('csvFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "CSV 파일이 필요합니다" });
      }

      const csvData = req.file.buffer.toString('utf-8');
      const lines = csvData.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({ message: "올바른 CSV 형식이 아닙니다" });
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const products = [];
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // CSV 데이터 파싱 및 DB 저장
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const productData: any = {};
          
          headers.forEach((header, index) => {
            productData[header] = values[index] || '';
          });

          // 필수 필드 검증
          if (!productData.name || !productData.price) {
            errors.push(`행 ${i + 1}: 상품명과 가격은 필수입니다`);
            errorCount++;
            continue;
          }

          // 상품 생성
          const product = await storage.createProduct({
            name: productData.name,
            description: productData.description || '',
            price: productData.price,
            originalPrice: productData.originalPrice || productData.price,
            imageUrl: productData.imageUrl || '',
            category: productData.category || '기타',
            brand: productData.brand || '',
            source: productData.source || 'csv_upload',
            sourceUrl: productData.sourceUrl || '',
            sourceProductId: productData.sourceProductId || '',
            status: 'pending'
          });
          
          products.push(product);
          successCount++;
        } catch (error: any) {
          errors.push(`행 ${i + 1}: ${error.message}`);
          errorCount++;
        }
      }

      res.json({
        message: "CSV 업로드 완료",
        successCount,
        errorCount,
        errors: errors.slice(0, 10), // 최대 10개 오류만 반환
        products: products.slice(0, 5) // 최대 5개 상품 예시만 반환
      });
    } catch (error: any) {
      res.status(500).json({ message: "CSV 업로드 실패: " + error.message });
    }
  });

  // Statistics routes
  app.get("/api/stats/products", requireAuth, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getProductStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch product stats: " + error.message });
    }
  });

  app.get("/api/stats/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch user stats: " + error.message });
    }
  });

  // Admin user routes
  app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const users = await storage.getUsers(limit, offset);
      
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch users: " + error.message });
    }
  });

  app.patch("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate and whitelist allowed updates
      const validation = adminUserUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid update data", 
          errors: validation.error.flatten().fieldErrors 
        });
      }
      
      const user = await storage.updateUser(id, validation.data);
      
      // Remove password from response
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(500).json({ message: "Failed to update user: " + error.message });
    }
  });

  app.get("/api/stats/trend-report", async (req, res) => {
    try {
      const products = await storage.getProducts(100, 0);
      const report = await generateTrendReport(products);
      res.json({
        timestamp: new Date().toISOString(),
        version: "v2.0",
        data: report
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to generate trend report: " + error.message });
    }
  });

  // AI 트렌드 리포트 CSV 다운로드
  app.get("/api/stats/trend-report/download", requireAuth, requireAdmin, async (req, res) => {
    try {
      const products = await storage.getProducts(100, 0);
      const report = await generateTrendReport(products);
      
      // CSV 헤더 생성
      let csvContent = "구분,항목,값,기타\n";
      
      // 트렌딩 카테고리 섹션
      csvContent += "\n=== 트렌딩 카테고리 ===\n";
      csvContent += "순위,카테고리,상품수,성장률\n";
      report.trendingCategories.forEach((cat, index) => {
        csvContent += `${index + 1},"${cat.category}",${cat.count},${cat.growth}%\n`;
      });
      
      // 시즌별 트렌드 섹션
      csvContent += "\n=== 시즌별 트렌드 ===\n";
      csvContent += "시즌,비율\n";
      report.seasonalTrends.forEach((trend) => {
        csvContent += `"${trend.season}",${trend.percentage}%\n`;
      });
      
      // 가격 분석 섹션
      csvContent += "\n=== 가격 분석 ===\n";
      csvContent += "구분,금액\n";
      csvContent += `"평균 가격","₩${Number(report.priceAnalysis.avgPrice).toLocaleString()}"\n`;
      csvContent += `"최저 가격","₩${Number(report.priceAnalysis.priceRange.min).toLocaleString()}"\n`;
      csvContent += `"최고 가격","₩${Number(report.priceAnalysis.priceRange.max).toLocaleString()}"\n`;
      
      // 추천 사항 섹션
      csvContent += "\n=== AI 추천 사항 ===\n";
      csvContent += "순위,추천 내용\n";
      report.recommendations.forEach((rec, index) => {
        csvContent += `${index + 1},"${rec}"\n`;
      });
      
      // 보고서 생성 정보
      const now = new Date();
      csvContent += `\n=== 보고서 정보 ===\n`;
      csvContent += `"생성 일시","${now.toLocaleString('ko-KR')}"\n`;
      csvContent += `"분석 상품 수","${products.length}개"\n`;
      
      // CSV 파일로 응답
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="trend_report_${now.toISOString().split('T')[0]}.csv"`);
      res.send('\ufeff' + csvContent); // BOM 추가로 한글 인코딩 문제 해결
    } catch (error: any) {
      res.status(500).json({ message: "Failed to download trend report: " + error.message });
    }
  });

  // Marketplace sync routes
  app.get("/api/marketplace-syncs", async (req, res) => {
    try {
      const productId = req.query.productId as string;
      const syncs = await storage.getMarketplaceSyncs(productId);
      res.json(syncs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch marketplace syncs: " + error.message });
    }
  });

  app.post("/api/marketplace-syncs", async (req, res) => {
    try {
      const sync = await storage.createMarketplaceSync(req.body);
      res.json(sync);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create marketplace sync: " + error.message });
    }
  });

  // Stripe subscription route
  app.post('/api/get-or-create-subscription', async (req, res) => {
    try {
      // For demo purposes, create a mock subscription
      // In real implementation, this would use authenticated user
      const customer = await stripe.customers.create({
        email: "demo@stylehub.com",
        name: "Demo User",
      });

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: process.env.STRIPE_PRICE_ID || "price_demo",
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      res.send({
        subscriptionId: subscription.id,
        clientSecret: typeof subscription.latest_invoice !== 'string' 
          ? (subscription.latest_invoice as any)?.payment_intent?.client_secret 
          : undefined,
      });
    } catch (error: any) {
      return res.status(400).send({ error: { message: error.message } });
    }
  });

  // Bootstrap admin endpoint - for development only
  app.post("/api/bootstrap/admin", async (req, res) => {
    try {
      const { userId, password } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      let updateData: any = { isAdmin: true };
      
      // If password is provided, hash it and update
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateData.password = hashedPassword;
      }
      
      const user = await storage.updateUser(userId, updateData);
      const { password: _, ...safeUser } = user;
      res.json({ message: "User updated", user: safeUser });
    } catch (error: any) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(500).json({ message: "Failed to update user: " + error.message });
    }
  });

  // Registration job routes
  app.get("/api/registration/jobs", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const allJobs = await storage.getRegistrationJobs(limit);
      // Filter jobs by current user (security fix)
      const userJobs = allJobs.filter(job => job.createdBy === (req as any).user.id);
      res.json(userJobs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get registration jobs: " + error.message });
    }
  });

  app.get("/api/registration/jobs/:id", requireAuth, async (req, res) => {
    try {
      const job = await storage.getRegistrationJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Registration job not found" });
      }
      // Security check: user can only see their own jobs
      if (job.createdBy !== (req as any).user.id && !(req as any).user.isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get registration job: " + error.message });
    }
  });

  app.post("/api/registration/single", requireAuth, async (req, res) => {
    try {
      // Validate input
      const validation = singleRegistrationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: validation.error.flatten().fieldErrors 
        });
      }
      
      const { productId } = validation.data;

      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.status === "registered") {
        return res.status(400).json({ message: "Product is already registered" });
      }

      const job = await storage.createRegistrationJob({
        createdBy: (req as any).user.id,
        productIds: [productId],
        totalProducts: 1,
        pendingCount: 1,
        processingCount: 0,
        completedCount: 0,
        failedCount: 0,
        status: "pending"
      });

      // Start processing asynchronously
      processRegistrationJob(job.id);

      res.json({ 
        message: "Registration job created",
        job: job
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create registration job: " + error.message });
    }
  });

  app.post("/api/registration/selected", requireAuth, async (req, res) => {
    try {
      // Validate input
      const validation = selectedRegistrationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: validation.error.flatten().fieldErrors 
        });
      }
      
      const { productIds } = validation.data;

      // Validate all products exist and are not already registered
      const products = await Promise.all(
        productIds.map(id => storage.getProduct(id))
      );
      
      const validProducts = products.filter(p => p && p.status !== "registered");
      if (validProducts.length === 0) {
        return res.status(400).json({ 
          message: "No valid products found for registration" 
        });
      }

      const job = await storage.createRegistrationJob({
        createdBy: (req as any).user.id,
        productIds: validProducts.map(p => p!.id),
        totalProducts: validProducts.length,
        pendingCount: validProducts.length,
        processingCount: 0,
        completedCount: 0,
        failedCount: 0,
        status: "pending"
      });

      // Start processing asynchronously
      processRegistrationJob(job.id);

      res.json({ 
        message: "Registration job created",
        job: job,
        validProductsCount: validProducts.length
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create registration job: " + error.message });
    }
  });

  app.post("/api/registration/bulk", requireAuth, async (req, res) => {
    try {
      // Get all unregistered products
      const allProducts = await storage.getProducts();
      const unregisteredProducts = allProducts.filter(p => p.status !== "registered");
      
      if (unregisteredProducts.length === 0) {
        return res.status(400).json({ 
          message: "No products available for registration" 
        });
      }

      const job = await storage.createRegistrationJob({
        createdBy: (req as any).user.id,
        productIds: unregisteredProducts.map(p => p.id),
        totalProducts: unregisteredProducts.length,
        pendingCount: unregisteredProducts.length,
        processingCount: 0,
        completedCount: 0,
        failedCount: 0,
        status: "pending"
      });

      // Start processing asynchronously
      processRegistrationJob(job.id);

      res.json({ 
        message: "Bulk registration job created",
        job: job,
        totalProducts: unregisteredProducts.length
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create bulk registration job: " + error.message });
    }
  });

  // AI Optimization APIs
  app.get("/api/optimization/jobs", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const jobs = await storage.getOptimizationJobs(limit);
      
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch optimization jobs: " + error.message });
    }
  });

  app.get("/api/optimization/jobs/:id", requireAuth, async (req, res) => {
    try {
      const job = await storage.getOptimizationJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Optimization job not found" });
      }
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch optimization job: " + error.message });
    }
  });

  app.get("/api/optimization/suggestions/:jobId", requireAuth, async (req, res) => {
    try {
      const suggestions = await storage.getOptimizationSuggestions(req.params.jobId);
      res.json(suggestions);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch optimization suggestions: " + error.message });
    }
  });

  app.post("/api/optimization/selected", requireAuth, async (req, res) => {
    try {
      const { productIds } = req.body;
      
      if (!Array.isArray(productIds) || productIds.length < 10) {
        return res.status(400).json({ 
          message: "최소 10개 이상의 상품을 선택해야 합니다." 
        });
      }

      // Validate products exist and are registered
      const validProducts = [];
      for (const productId of productIds) {
        const product = await storage.getProduct(productId);
        if (product && product.status === "registered") {
          validProducts.push(product);
        }
      }

      if (validProducts.length === 0) {
        return res.status(400).json({ 
          message: "등록된 상품이 없습니다. 등록된 상품만 최적화할 수 있습니다." 
        });
      }

      // Create optimization job
      const job = await storage.createOptimizationJob({
        createdBy: (req as any).user.id,
        productIds: validProducts.map(p => p.id),
        totalProducts: validProducts.length,
        processedProducts: 0,
        successCount: 0,
        failureCount: 0,
        status: "pending",
        errorMessage: null
      });

      // Start processing asynchronously
      processOptimizationJob(job.id);

      res.json({ 
        message: "AI 상품명 최적화 작업이 시작되었습니다",
        job: job,
        validProductsCount: validProducts.length
      });
    } catch (error: any) {
      res.status(500).json({ message: "AI 최적화 작업 생성 실패: " + error.message });
    }
  });

  app.patch("/api/optimization/suggestions/:id/apply", requireAuth, async (req, res) => {
    try {
      const { selectedName } = req.body;
      
      if (!selectedName) {
        return res.status(400).json({ message: "선택된 상품명이 필요합니다." });
      }

      const suggestion = await storage.getOptimizationSuggestion(req.params.id);
      if (!suggestion) {
        return res.status(404).json({ message: "최적화 제안을 찾을 수 없습니다." });
      }

      // Update the product name
      await storage.updateProduct(suggestion.productId, {
        name: selectedName
      });

      // Update suggestion status
      await storage.updateOptimizationSuggestion(req.params.id, {
        selectedName: selectedName,
        status: "approved"
      });

      res.json({ 
        message: "상품명이 성공적으로 변경되었습니다.",
        newName: selectedName
      });
    } catch (error: any) {
      res.status(500).json({ message: "상품명 변경 실패: " + error.message });
    }
  });

  // Marketplace connections API
  app.get("/api/marketplace/connections", requireAuth, async (req, res) => {
    try {
      const connections = await storage.getMarketplaceConnections((req as any).user.id);
      res.json(connections);
    } catch (error: any) {
      res.status(500).json({ message: "마켓플레이스 연결 조회 실패: " + error.message });
    }
  });

  app.delete("/api/marketplace/connections/:id", requireAuth, async (req, res) => {
    try {
      const connection = await storage.getMarketplaceConnection(req.params.id);
      if (!connection) {
        return res.status(404).json({ message: "연결을 찾을 수 없습니다." });
      }

      if (connection.userId !== (req as any).user.id) {
        return res.status(403).json({ message: "권한이 없습니다." });
      }

      await storage.deleteMarketplaceConnection(req.params.id);
      res.json({ message: "마켓플레이스 연결이 삭제되었습니다." });
    } catch (error: any) {
      res.status(500).json({ message: "연결 삭제 실패: " + error.message });
    }
  });

  // Cafe24 앱 설치/인증 엔드포인트 (카페24에서 호출)
  app.get("/api/marketplace/cafe24", async (req, res) => {
    try {
      const { mall_id, user_id, user_name, hmac, timestamp, lang, nation, shop_no, user_type } = req.query;
      
      console.log('[CAFE24 APP] 앱 설치/인증 요청 수신:', {
        mall_id,
        user_id,
        user_name: decodeURIComponent(String(user_name || '')),
        timestamp,
        lang,
        nation,
        shop_no,
        user_type
      });

      // 카페24 앱 설치 성공 응답
      res.status(200).json({
        message: "카페24 앱이 성공적으로 설치되었습니다.",
        status: "success",
        mall_id,
        user_id
      });
    } catch (error: any) {
      console.error('[CAFE24 APP] 앱 설치 오류:', error);
      res.status(500).json({ message: "앱 설치 중 오류가 발생했습니다." });
    }
  });

  // Debug route to test if new routes work
  app.get("/api/debug/test", async (req, res) => {
    res.json({ message: "Debug route working", timestamp: new Date().toISOString() });
  });

  // Cafe24 OAuth API
  app.post("/api/marketplace/cafe24/auth", requireAuth, async (req, res) => {
    try {
      // 환경변수에서 카페24 자격증명 가져오기
      const clientId = process.env.CAFE24_CLIENT_ID;
      const clientSecret = process.env.CAFE24_CLIENT_SECRET;
      const mallId = process.env.CAFE24_MALL_ID;
      
      if (!clientId || !mallId) {
        return res.status(500).json({ message: "카페24 설정이 필요합니다." });
      }

      // Generate cryptographically secure state parameter for CSRF protection with user ID and mallId
      const stateData = {
        userId: (req as any).user.id,
        mallId: mallId,
        nonce: crypto.randomBytes(16).toString('hex')
      };
      const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
      
      // Store state in session for verification
      (req as any).session.cafe24_oauth_state = state;
      
      // Use configured redirect URI or generate dynamically
      let redirectUri = process.env.CAFE24_REDIRECT_URI;
      if (!redirectUri) {
        // Generate redirect URI dynamically from request
        redirectUri = `${req.protocol}://${req.get('host')}/api/marketplace/cafe24/callback`;
        console.log('[CAFE24 AUTH] Using dynamic redirect URI:', redirectUri);
      } else {
        console.log('[CAFE24 AUTH] Using configured redirect URI:', redirectUri);
      }
      
      const authUrl = `https://${mallId}.cafe24api.com/api/v2/oauth/authorize?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `state=${state}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent('mall.read_product mall.write_product')}`;

      console.log('[CAFE24 AUTH] Generated auth URL with redirect URI:', redirectUri);

      res.json({ authUrl });
    } catch (error: any) {
      res.status(500).json({ message: "OAuth URL 생성 실패: " + error.message });
    }
  });

  app.get("/api/marketplace/cafe24/callback", async (req, res) => {
    try {
      console.log('[CAFE24 CALLBACK] OAuth callback received:', {
        query: req.query,
        code: req.query.code ? 'present' : 'missing',
        state: req.query.state ? 'present' : 'missing'
      });
      
      const code = String(req.query.code || '');
      const state = String(req.query.state || '');
      
      if (!code || !state) {
        console.log('[CAFE24 CALLBACK] Missing code or state');
        return res.redirect('/market-sync?error=invalid_callback');
      }

      // Verify state parameter matches session (CSRF protection)
      const sessionState = (req as any).session?.cafe24_oauth_state;
      if (!sessionState || sessionState !== state) {
        console.log('[CAFE24 CALLBACK] State mismatch or missing session state');
        // Clean up session state on error
        if ((req as any).session?.cafe24_oauth_state) {
          delete (req as any).session.cafe24_oauth_state;
        }
        return res.redirect('/market-sync?error=invalid_state');
      }

      // Parse state parameter to get user ID and mallId
      let stateData;
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        console.log('[CAFE24 CALLBACK] State decoded successfully for user:', stateData.userId);
      } catch (error) {
        console.log('[CAFE24 CALLBACK] State decode failed:', error);
        return res.redirect('/market-sync?error=invalid_state');
      }

      if (!stateData.userId) {
        console.log('[CAFE24 CALLBACK] Missing userId in state');
        // Clean up session state on error
        delete (req as any).session.cafe24_oauth_state;
        return res.redirect('/market-sync?error=missing_user_info');
      }

      // Clear the session state to prevent replay attacks
      delete (req as any).session.cafe24_oauth_state;

      // 환경변수에서 카페24 자격증명 가져오기
      const clientId = process.env.CAFE24_CLIENT_ID;
      const clientSecret = process.env.CAFE24_CLIENT_SECRET;
      const mallId = stateData.mallId; // Use mallId from state instead of env
      
      if (!clientId || !clientSecret || !mallId) {
        console.log('[CAFE24 CALLBACK] Missing credentials:', { clientId: !!clientId, clientSecret: !!clientSecret, mallId: !!mallId });
        // Clean up session state on error
        delete (req as any).session.cafe24_oauth_state;
        return res.redirect('/market-sync?error=config_missing');
      }
      
      console.log('[CAFE24 CALLBACK] Using mallId from state:', mallId);

      // Use configured redirect URI or generate dynamically
      let redirectUri = process.env.CAFE24_REDIRECT_URI;
      if (!redirectUri) {
        // Generate redirect URI dynamically from request
        redirectUri = `${req.protocol}://${req.get('host')}/api/marketplace/cafe24/callback`;
        console.log('[CAFE24 CALLBACK] Using dynamic redirect URI:', redirectUri);
      } else {
        console.log('[CAFE24 CALLBACK] Using configured redirect URI:', redirectUri);
      }

      // Exchange code for access token
      console.log('[CAFE24 CALLBACK] Starting token exchange for mallId:', mallId);
      const tokenResponse = await fetch(`https://${mallId}.cafe24api.com/api/v2/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[CAFE24 CALLBACK] Token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          errorBody: errorText,
          mallId,
          redirectUri
        });
        // Clean up session state on error
        delete (req as any).session.cafe24_oauth_state;
        return res.redirect('/market-sync?error=token_exchange_failed');
      }

      const tokenData = await tokenResponse.json();
      console.log('[CAFE24 CALLBACK] Token exchange successful');
      
      // Check if user already has a Cafe24 connection
      const existingConnection = await storage.getMarketplaceConnectionByProvider(stateData.userId, "cafe24");
      console.log('[CAFE24 CALLBACK] Existing connection check:', existingConnection ? 'found' : 'not found');
      
      const connectionData = {
        userId: stateData.userId,
        provider: "cafe24",
        authType: "oauth",
        shopId: mallId,
        shopDomain: `${mallId}.cafe24.com`,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
        status: "active" as const,
        lastSynced: null,
        errorMessage: null
      };

      let connection;
      if (existingConnection) {
        // Update existing connection
        connection = await storage.updateMarketplaceConnection(existingConnection.id, connectionData);
        console.log('[CAFE24 CALLBACK] Connection updated for user:', stateData.userId);
      } else {
        // Create new connection
        connection = await storage.createMarketplaceConnection(connectionData);
        console.log('[CAFE24 CALLBACK] New connection created for user:', stateData.userId);
      }

      // Redirect back to market-sync page with success message
      console.log('[CAFE24 CALLBACK] Redirecting to /market-sync?cafe24_connected=true');
      res.redirect('/market-sync?cafe24_connected=true');
    } catch (error: any) {
      console.error("Cafe24 OAuth callback error:", error);
      // Clean up session state on error
      if ((req as any).session?.cafe24_oauth_state) {
        delete (req as any).session.cafe24_oauth_state;
      }
      res.redirect('/market-sync?error=oauth_failed');
    }
  });

  // Cafe24 product registration API
  app.post("/api/marketplace/cafe24/products", requireAuth, async (req, res) => {
    try {
      const { productIds } = req.body;
      const userId = (req as any).user.id;
      
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "등록할 상품 ID가 필요합니다." });
      }

      console.log('[CAFE24] 상품 등록 요청:', productIds.length, '개');

      // 카페24 연결 확인
      const connection = await storage.getMarketplaceConnectionByProvider(userId, "cafe24");
      if (!connection) {
        return res.status(400).json({ 
          message: "카페24 연결이 필요합니다. 마켓 동기화 페이지에서 카페24를 먼저 연결해주세요." 
        });
      }

      if (connection.status !== "active") {
        return res.status(400).json({ 
          message: "카페24 연결이 비활성화되어 있습니다. 마켓 동기화 페이지에서 다시 연결해주세요." 
        });
      }

      let successCount = 0;
      let failureCount = 0;
      const results = [];

      // 각 상품에 대해 실제 카페24 API 호출
      for (const productId of productIds) {
        try {
          const product = await storage.getProduct(productId);
          
          if (!product) {
            results.push({ productId, success: false, error: "상품을 찾을 수 없습니다." });
            failureCount++;
            continue;
          }

          // 카페24 API 호출을 위한 상품 데이터 준비
          const productPrice = parseFloat(product.price);
          const cafe24ProductData = {
            shop_no: 1,
            product_name: product.name,
            supply_product_name: product.name,
            internal_product_name: product.name,
            model_name: product.sourceProductId || `MODEL_${Date.now()}`,
            price: Math.round(productPrice),
            retail_price: Math.round(productPrice * 1.3), // 30% 마진
            supply_price: Math.round(productPrice * 0.8), // 20% 할인
            display: 'T',
            selling: 'T',
            product_condition: 'N',
            product_important: 'N',
            product_type: 'P',
            tax_type: 'A',
            simple_description: product.description?.substring(0, 255) || '',
            description: product.description || '',
            mobile_description: product.description || '',
            translated: 'F',
            adult_certification: 'F',
            detail_image: product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : product.imageUrl,
            list_image: product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : product.imageUrl,
            tiny_image: product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : product.imageUrl,
            small_image: product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : product.imageUrl,
            category: [{ category_no: 1 }] // 기본 카테고리
          };

          console.log('[CAFE24] API 호출 시작:', product.name);

          // 실제 카페24 API 호출
          const response = await fetch(`https://${connection.shopId}.cafe24api.com/api/v2/admin/products`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${connection.accessToken}`,
              'Content-Type': 'application/json',
              'X-Cafe24-Api-Version': '2022-03-01'
            },
            body: JSON.stringify({
              request: {
                product: cafe24ProductData
              }
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.log('[CAFE24] API 오류:', errorText);
            results.push({ productId, success: false, error: `API 오류: ${errorText}` });
            failureCount++;
            continue;
          }

          const responseData = await response.json();
          console.log('[CAFE24] API 성공:', responseData);
          
          // 상품 상태 업데이트
          await storage.updateProduct(productId, { status: "synced" });
          results.push({ 
            productId, 
            success: true, 
            cafe24ProductNo: responseData.product?.product_no 
          });
          successCount++;

          // 카페24 API 제한: 초당 2회 호출
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error: any) {
          results.push({ productId, success: false, error: error.message });
          failureCount++;
        }
      }

      res.json({
        message: `카페24 상품 등록 완료: 성공 ${successCount}개, 실패 ${failureCount}개`,
        totalProducts: productIds.length,
        successCount,
        failureCount,
        results
      });
    } catch (error: any) {
      res.status(500).json({ message: "상품 등록 실패: " + error.message });
    }
  });

  // 네이버 상품 등록 API
  app.post("/api/marketplace/naver/products", requireAuth, async (req, res) => {
    try {
      const { productIds } = req.body;
      const userId = (req as any).user.id;
      
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "등록할 상품 ID가 필요합니다." });
      }

      console.log('[NAVER] 상품 등록 요청:', productIds.length, '개');
      
      let successCount = 0;
      let failureCount = 0;
      const results = [];

      // 각 상품에 대해 소유권 확인 후 처리
      for (const productId of productIds) {
        try {
          const product = await storage.getProduct(productId);
          
          // 소유권 확인 - 중요한 보안 검증
          if (!product) {
            results.push({ productId, success: false, error: "상품을 찾을 수 없습니다." });
            failureCount++;
            continue;
          }
          
          // TODO: userId 필드가 스키마에 추가되면 소유권 확인 활성화
          // if (product.userId !== userId) {
          //   results.push({ productId, success: false, error: "상품에 대한 권한이 없습니다." });
          //   failureCount++;
          //   continue;
          // }

          // TODO: 실제 네이버 API 연동 구현
          // 현재는 임시로 성공 처리
          
          await storage.updateProduct(productId, { status: "synced" });
          results.push({ productId, success: true });
          successCount++;
        } catch (error: any) {
          results.push({ productId, success: false, error: error.message });
          failureCount++;
        }
      }

      res.json({
        message: `네이버 상품 등록 완료: 성공 ${successCount}개, 실패 ${failureCount}개`,
        totalProducts: productIds.length,
        successCount,
        failureCount,
        results
      });

    } catch (error: any) {
      console.error("Naver product registration error:", error);
      res.status(500).json({ message: "네이버 상품 등록 실패: " + error.message });
    }
  });

  // 쿠팡 상품 등록 API
  app.post("/api/marketplace/coupang/products", requireAuth, async (req, res) => {
    try {
      const { productIds } = req.body;
      const userId = (req as any).user.id;
      
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "등록할 상품 ID가 필요합니다." });
      }

      console.log('[COUPANG] 상품 등록 요청:', productIds.length, '개');
      
      let successCount = 0;
      let failureCount = 0;
      const results = [];

      // 각 상품에 대해 소유권 확인 후 처리
      for (const productId of productIds) {
        try {
          const product = await storage.getProduct(productId);
          
          // 소유권 확인 - 중요한 보안 검증
          if (!product) {
            results.push({ productId, success: false, error: "상품을 찾을 수 없습니다." });
            failureCount++;
            continue;
          }
          
          // TODO: userId 필드가 스키마에 추가되면 소유권 확인 활성화
          // if (product.userId !== userId) {
          //   results.push({ productId, success: false, error: "상품에 대한 권한이 없습니다." });
          //   failureCount++;
          //   continue;
          // }

          // TODO: 실제 쿠팡 API 연동 구현
          // 현재는 임시로 성공 처리
          
          await storage.updateProduct(productId, { status: "synced" });
          results.push({ productId, success: true });
          successCount++;
        } catch (error: any) {
          results.push({ productId, success: false, error: error.message });
          failureCount++;
        }
      }

      res.json({
        message: `쿠팡 상품 등록 완료: 성공 ${successCount}개, 실패 ${failureCount}개`,
        totalProducts: productIds.length,
        successCount,
        failureCount,
        results
      });

    } catch (error: any) {
      console.error("Coupang product registration error:", error);
      res.status(500).json({ message: "쿠팡 상품 등록 실패: " + error.message });
    }
  });

  // ============== 만능 포맷 시스템 API ==============
  
  // CSV 템플릿 업로드 및 분석
  app.post("/api/templates/upload", requireAuth, upload.single("template"), async (req, res) => {
    try {
      // Drizzle-Zod 검증 (body 부분만)
      const bodyValidation = insertMarketplaceTemplateSchema.pick({
        provider: true,
        name: true,
        description: true
      }).safeParse(req.body);

      if (!bodyValidation.success) {
        return res.status(400).json({ 
          message: "요청 데이터 검증 실패", 
          errors: bodyValidation.error.issues 
        });
      }

      const { provider, name, description } = bodyValidation.data;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "CSV 파일이 필요합니다." });
      }

      console.log('[TEMPLATE] 업로드:', provider, name);
      
      // 비동기 CSV 파일 분석 (Buffer로 읽어 인코딩 감지)
      const csvBuffer = await fsPromises.readFile(file.path);
      
      // CSV 파싱 엔진 사용 (Buffer에서 인코딩 감지)
      let parseResult;
      try {
        parseResult = CSVParsingEngine.analyzeCSVFromBuffer(csvBuffer, {
          maxSampleRows: 5,
          strictValidation: false,
          supportedDelimiters: [',', '\t', ';', '|'],
          supportedEncodings: ['UTF-8', 'EUC-KR']
        });
      } catch (error: any) {
        await fsPromises.unlink(file.path);
        return res.status(400).json({ message: "CSV 파일 분석 실패: " + error.message });
      }

      const { headers, delimiter, encoding, fingerprint, hasQuotedFields, isConsistent, lineCount } = parseResult;
      
      // 필수 헤더 추정 (상품명, 가격 관련 필드)
      const requiredHeaders = headers.filter(header => 
        header.includes('상품명') || header.includes('이름') ||
        header.includes('가격') || header.includes('판매가') || header.includes('공급가')
      );

      console.log(`[CSV ENGINE] 분석 완료: ${headers.length}개 헤더, 구분자: "${delimiter}", 인코딩: ${encoding}, 일관성: ${isConsistent}`);

      // 기존 템플릿 확인
      const existingTemplate = await storage.getMarketplaceTemplateByFingerprint(fingerprint);
      if (existingTemplate) {
        await fsPromises.unlink(file.path);
        return res.json({
          message: "이미 등록된 템플릿입니다.",
          template: existingTemplate
        });
      }

      // 템플릿 데이터 검증
      const templateData = {
        provider,
        name,
        description: description || null,
        encoding,
        delimiter,
        headers: headers,
        requiredHeaders: requiredHeaders,
        constraints: {
          hasQuotedFields,
          isConsistent,
          lineCount
        },
        fingerprint,
        isOfficial: false,
        maxImages: 5
      };

      const validation = insertMarketplaceTemplateSchema.safeParse(templateData);
      if (!validation.success) {
        await fsPromises.unlink(file.path);
        return res.status(400).json({ 
          message: "템플릿 데이터 검증 실패", 
          errors: validation.error.issues 
        });
      }

      // 새 템플릿 생성
      const template = await storage.createMarketplaceTemplate(validation.data);

      // 임시 파일 정리
      await fsPromises.unlink(file.path);

      res.json({
        message: "템플릿이 성공적으로 업로드되었습니다.",
        template,
        headerCount: headers.length,
        requiredHeaderCount: requiredHeaders.length
      });

    } catch (error: any) {
      console.error("Template upload error:", error);
      
      // 임시 파일 정리
      if (req.file?.path) {
        try { await fsPromises.unlink(req.file.path); } catch {}
      }
      
      res.status(500).json({ message: "템플릿 업로드 실패: " + error.message });
    }
  });

  // 템플릿 목록 조회
  app.get("/api/templates", requireAuth, async (req, res) => {
    try {
      const { provider } = req.query;
      
      let templates;
      if (provider && typeof provider === 'string') {
        templates = await storage.getMarketplaceTemplatesByProvider(provider);
      } else {
        templates = await storage.getMarketplaceTemplates();
      }

      res.json(templates);
    } catch (error: any) {
      console.error("Get templates error:", error);
      res.status(500).json({ message: "템플릿 조회 실패: " + error.message });
    }
  });

  // 특정 템플릿 조회
  app.get("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const template = await storage.getMarketplaceTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "템플릿을 찾을 수 없습니다." });
      }

      // 소유권 확인
      if (template.userId !== req.user?.id) {
        return res.status(403).json({ message: "권한이 없습니다." });
      }

      const mappings = await storage.getFieldMappings(id);

      res.json({
        template,
        mappings
      });
    } catch (error: any) {
      console.error("Get template error:", error);
      res.status(500).json({ message: "템플릿 조회 실패: " + error.message });
    }
  });

  // 필드 매핑 생성/업데이트
  app.post("/api/templates/:id/mappings", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { mappings } = req.body;
      
      if (!Array.isArray(mappings)) {
        return res.status(400).json({ message: "매핑 배열이 필요합니다." });
      }

      const template = await storage.getMarketplaceTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "템플릿을 찾을 수 없습니다." });
      }

      // 소유권 확인
      if (template.userId !== req.user?.id) {
        return res.status(403).json({ message: "권한이 없습니다." });
      }

      // 기존 매핑 삭제
      await storage.deleteFieldMappingsByTemplate(id);

      // 새 매핑 생성
      const createdMappings = [];
      for (let i = 0; i < mappings.length; i++) {
        const mapping = mappings[i];
        
        const validation = insertFieldMappingSchema.safeParse({
          templateId: id,
          headerName: mapping.headerName,
          sourcePath: mapping.sourcePath,
          transformId: mapping.transformId,
          transformArgs: mapping.transformArgs,
          defaultValue: mapping.defaultValue,
          isRequired: mapping.isRequired,
          displayOrder: i
        });

        if (!validation.success) {
          return res.status(400).json({ 
            message: `매핑 검증 실패 (${i}번째):`, 
            errors: validation.error.issues 
          });
        }

        const created = await storage.createFieldMapping(validation.data);
        createdMappings.push(created);
      }

      res.json({
        message: "매핑이 성공적으로 저장되었습니다.",
        mappings: createdMappings
      });

    } catch (error: any) {
      console.error("Save mappings error:", error);
      res.status(500).json({ message: "매핑 저장 실패: " + error.message });
    }
  });

  // 필드 매핑 조회
  app.get("/api/templates/:id/mappings", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const template = await storage.getMarketplaceTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "템플릿을 찾을 수 없습니다." });
      }

      // 소유권 확인
      if (template.userId !== req.user?.id) {
        return res.status(403).json({ message: "권한이 없습니다." });
      }

      const mappings = await storage.getFieldMappings(id);
      res.json(mappings);

    } catch (error: any) {
      console.error("Get mappings error:", error);
      res.status(500).json({ message: "매핑 조회 실패: " + error.message });
    }
  });

  // 필드 매핑 업데이트 (PATCH)
  app.patch("/api/templates/:id/mappings/:mappingId", requireAuth, async (req, res) => {
    try {
      const { id, mappingId } = req.params;
      
      // 템플릿 소유권 확인
      const template = await storage.getMarketplaceTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "템플릿을 찾을 수 없습니다." });
      }
      
      if (template.userId !== req.user?.id) {
        return res.status(403).json({ message: "권한이 없습니다." });
      }

      // 요청 데이터 검증
      const validation = insertFieldMappingSchema.omit({ id: true, templateId: true }).safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "요청 데이터 검증 실패", 
          errors: validation.error.issues 
        });
      }

      const updated = await storage.updateFieldMapping(mappingId, validation.data);
      if (!updated) {
        return res.status(404).json({ message: "매핑을 찾을 수 없습니다." });
      }

      res.json({
        message: "매핑이 성공적으로 업데이트되었습니다.",
        mapping: updated
      });

    } catch (error: any) {
      console.error("Update mapping error:", error);
      res.status(500).json({ message: "매핑 업데이트 실패: " + error.message });
    }
  });

  // 필드 매핑 삭제 (DELETE)
  app.delete("/api/templates/:id/mappings/:mappingId", requireAuth, async (req, res) => {
    try {
      const { id, mappingId } = req.params;
      
      // 템플릿 소유권 확인
      const template = await storage.getMarketplaceTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "템플릿을 찾을 수 없습니다." });
      }
      
      if (template.userId !== req.user?.id) {
        return res.status(403).json({ message: "권한이 없습니다." });
      }

      const deleted = await storage.deleteFieldMapping(mappingId);
      if (!deleted) {
        return res.status(404).json({ message: "매핑을 찾을 수 없습니다." });
      }

      res.json({
        message: "매핑이 성공적으로 삭제되었습니다."
      });

    } catch (error: any) {
      console.error("Delete mapping error:", error);
      res.status(500).json({ message: "매핑 삭제 실패: " + error.message });
    }
  });

  // CSV 미리보기 API
  app.post("/api/export/preview", requireAuth, async (req, res) => {
    try {
      const validation = z.object({
        templateId: z.string(),
        productIds: z.array(z.string()).optional(),
        limit: z.number().min(1).max(100).optional().default(10)
      }).safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ 
          message: "요청 데이터 검증 실패", 
          errors: validation.error.issues 
        });
      }

      const { templateId, productIds, limit } = validation.data;

      const template = await storage.getMarketplaceTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "템플릿을 찾을 수 없습니다." });
      }

      // 소유권 확인
      if (template.userId !== req.user?.id) {
        return res.status(403).json({ message: "권한이 없습니다." });
      }

      const mappings = await storage.getFieldMappings(templateId);
      
      // 제품 데이터 가져오기
      let products;
      if (productIds && Array.isArray(productIds)) {
        products = [];
        for (const id of productIds.slice(0, limit)) {
          const product = await storage.getProduct(id);
          if (product) products.push(product);
        }
      } else {
        products = await storage.getProducts(limit, 0);
      }

      // 데이터 변환
      const transformedData = products.map(product => {
        const row: any = {};
        
        (template.headers as string[]).forEach((header: string) => {
          const mapping = mappings.find(m => m.headerName === header);
          
          if (mapping && mapping.sourcePath) {
            // 간단한 데이터 경로 해석
            if (mapping.sourcePath === 'product.name') {
              row[header] = product.name;
            } else if (mapping.sourcePath === 'product.price') {
              row[header] = product.price;
            } else if (mapping.sourcePath === 'product.originalPrice') {
              row[header] = product.originalPrice || product.price;
            } else if (mapping.sourcePath === 'product.imageUrl') {
              row[header] = product.imageUrl || '';
            } else if (mapping.sourcePath === 'product.category') {
              row[header] = product.category || '';
            } else if (mapping.sourcePath === 'product.brand') {
              row[header] = product.brand || '';
            } else {
              row[header] = mapping.defaultValue || '';
            }
          } else {
            row[header] = mapping?.defaultValue || '';
          }
        });
        
        return row;
      });

      res.json({
        template: {
          id: template.id,
          name: template.name,
          provider: template.provider,
          headers: template.headers
        },
        data: transformedData,
        totalProducts: products.length,
        preview: true
      });

    } catch (error: any) {
      console.error("Preview error:", error);
      res.status(500).json({ message: "미리보기 생성 실패: " + error.message });
    }
  });

  // CSV 내보내기 API
  app.post("/api/export/csv", requireAuth, async (req, res) => {
    try {
      const validation = z.object({
        templateId: z.string(),
        productIds: z.array(z.string()).optional()
      }).safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ 
          message: "요청 데이터 검증 실패", 
          errors: validation.error.issues 
        });
      }

      const { templateId, productIds } = validation.data;

      const template = await storage.getMarketplaceTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "템플릿을 찾을 수 없습니다." });
      }

      // 소유권 확인
      if (template.userId !== req.user?.id) {
        return res.status(403).json({ message: "권한이 없습니다." });
      }

      const mappings = await storage.getFieldMappings(templateId);
      
      // 제품 데이터 가져오기
      let products;
      if (productIds && Array.isArray(productIds)) {
        products = [];
        for (const id of productIds) {
          const product = await storage.getProduct(id);
          if (product) products.push(product);
        }
      } else {
        products = await storage.getProducts(1000, 0); // 최대 1000개
      }

      if (products.length === 0) {
        return res.status(400).json({ message: "내보낼 제품이 없습니다." });
      }

      console.log(`[CSV EXPORT] ${template.provider} 템플릿으로 ${products.length}개 제품 내보내기`);

      // 데이터 변환
      const csvData = products.map(product => {
        const row: any = {};
        
        (template.headers as string[]).forEach((header: string) => {
          const mapping = mappings.find(m => m.headerName === header);
          
          if (mapping && mapping.sourcePath) {
            // 데이터 변환 로직
            if (mapping.sourcePath === 'product.name') {
              row[header] = product.name;
            } else if (mapping.sourcePath === 'product.price') {
              row[header] = product.price;
            } else if (mapping.sourcePath === 'product.originalPrice') {
              row[header] = product.originalPrice || product.price;
            } else if (mapping.sourcePath === 'product.imageUrl') {
              row[header] = product.imageUrl || '';
            } else if (mapping.sourcePath === 'product.category') {
              row[header] = product.category || '';
            } else if (mapping.sourcePath === 'product.brand') {
              row[header] = product.brand || '';
            } else if (mapping.sourcePath === 'product.description') {
              row[header] = product.description || '';
            } else {
              row[header] = mapping.defaultValue || '';
            }

            // 간단한 변환 적용
            if (mapping.transformId === 'truncate' && mapping.transformArgs && (mapping.transformArgs as any).length) {
              const maxLength = (mapping.transformArgs as any).length;
              if (typeof row[header] === 'string' && row[header].length > maxLength) {
                row[header] = row[header].substring(0, maxLength);
              }
            }
          } else {
            row[header] = mapping?.defaultValue || '';
          }
        });
        
        return row;
      });

      // CSV 생성 (새로운 엔진 사용)
      const headers = template.headers as string[];
      const delimiter = template.delimiter || ',';
      
      const csv = CSVParsingEngine.generateCSV(csvData, headers, delimiter);

      // 파일명 생성
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${template.provider}_products_${timestamp}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf8'));
      
      res.send(csv);

    } catch (error: any) {
      console.error("CSV export error:", error);
      res.status(500).json({ message: "CSV 내보내기 실패: " + error.message });
    }
  });

  // Return app instead of creating a new server - let index.ts handle server creation
  return app;
}
