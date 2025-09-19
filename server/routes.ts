import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import bcrypt from "bcryptjs";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { storage } from "./storage";
import { scrapeProducts, startScheduledScraping } from "./services/scraper";
import { generateTrendReport } from "./services/gemini";
import { insertUserSchema, insertProductSchema } from "@shared/schema";
import { z } from "zod";

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

// Validation schemas
const adminUserUpdateSchema = z.object({
  isAdmin: z.boolean().optional(),
  subscriptionPlan: z.enum(["free", "starter", "pro", "enterprise"]).optional(),
});

// Multer setup for file uploads
const upload = multer({ 
  dest: '/tmp/uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
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
  app.get("/api/products", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const source = req.query.source as string;
      const status = req.query.status as string;

      let products;
      if (source) {
        products = await storage.getProductsBySource(source);
      } else if (status) {
        products = await storage.getProductsByStatus(status);
      } else {
        products = await storage.getProducts(limit, offset);
      }

      res.json(products);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch products: " + error.message });
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
          name: "하이힐",
          description: "우아하고 세련된 디자인의 하이힐입니다. 정장부터 파티룩까지 완벽한 스타일링이 가능합니다.",
          price: "95000",
          originalPrice: "120000",
          imageUrl: "https://example.com/heels.jpg",
          imageUrls: "https://example.com/heels1.jpg,https://example.com/heels2.jpg",
          category: "신발",
          subcategory: "하이힐",
          brand: "FashionHub",
          source: "zigzag",
          sourceUrl: "https://zigzag.kr/sample1",
          sourceProductId: "ZZ001",
          tags: "분석완료,자고픽",
          season: "사계절",
          gender: "여성",
          ageGroup: "20-30대"
        },
        {
          name: "블라우스",
          description: "시원하고 편안한 착용감의 블라우스입니다. 오피스룩이나 데일리 착용에 완벽합니다.",
          price: "48000",
          originalPrice: "65000",
          imageUrl: "https://example.com/blouse.jpg",
          imageUrls: "https://example.com/blouse1.jpg,https://example.com/blouse2.jpg,https://example.com/blouse3.jpg",
          category: "상의",
          subcategory: "블라우스",
          brand: "StylePlus",
          source: "naver",
          sourceUrl: "https://shopping.naver.com/sample2",
          sourceProductId: "NV002",
          tags: "분석완료",
          season: "봄",
          gender: "여성",
          ageGroup: "30-40대"
        },
        {
          name: "플리츠 스커트",
          description: "트렌디한 플리츠 디자인의 스커트입니다. 다양한 상의와 매치하여 스타일링할 수 있습니다.",
          price: "38000",
          originalPrice: "45000",
          imageUrl: "https://example.com/skirt.jpg",
          imageUrls: "https://example.com/skirt1.jpg,https://example.com/skirt2.jpg",
          category: "하의",
          subcategory: "스커트",
          brand: "TrendyWear",
          source: "coupang",
          sourceUrl: "https://coupang.com/sample3",
          sourceProductId: "CP003",
          tags: "분석완료,트렌드",
          season: "가을",
          gender: "여성",
          ageGroup: "20-30대"
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
                  price: row.price ? parseFloat(row.price.toString()) : 0,
                  originalPrice: row.originalPrice ? parseFloat(row.originalPrice.toString()) : null,
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

  // Scraping routes
  app.post("/api/scraping/start", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { source } = req.body;
      
      if (source && ["naver", "coupang", "zigzag"].includes(source)) {
        // Start scraping for specific source
        scrapeProducts(source as "naver" | "coupang" | "zigzag");
        res.json({ message: `Started scraping ${source}` });
      } else {
        // Start scraping for all sources
        startScheduledScraping();
        res.json({ message: "Started scraping all sources" });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to start scraping: " + error.message });
    }
  });

  app.get("/api/scraping/jobs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const jobs = await storage.getScrapingJobs(limit);
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch scraping jobs: " + error.message });
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
      res.json(report);
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

  const httpServer = createServer(app);

  return httpServer;
}
