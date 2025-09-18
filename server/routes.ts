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
