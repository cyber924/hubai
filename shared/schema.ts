import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionPlan: text("subscription_plan").default("free"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  imageUrl: text("image_url"),
  imageUrls: text("image_urls").array().default(sql`ARRAY[]::text[]`), // Multiple images support
  category: text("category"),
  subcategory: text("subcategory"),
  brand: text("brand"),
  source: text("source").notNull(), // naver, coupang, zigzag
  sourceUrl: text("source_url"),
  sourceProductId: text("source_product_id"),
  status: text("status").default("pending"), // pending, analyzed, registered, synced
  aiAnalysis: jsonb("ai_analysis"), // Gemini AI analysis results
  tags: text("tags").array(),
  season: text("season"),
  gender: text("gender"),
  ageGroup: text("age_group"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const marketplaceSyncs = pgTable("marketplace_syncs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id).notNull(),
  marketplace: text("marketplace").notNull(), // naver, coupang, zigzag
  marketplaceProductId: text("marketplace_product_id"),
  status: text("status").default("pending"), // pending, synced, failed
  syncedAt: timestamp("synced_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scrapingJobs = pgTable("scraping_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull(),
  status: text("status").default("pending"), // pending, running, completed, failed
  productsFound: integer("products_found").default(0),
  productsProcessed: integer("products_processed").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productOptions = pgTable("product_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id).notNull(),
  optionType: text("option_type").notNull(), // size, color, material, etc.
  optionValue: text("option_value").notNull(), // S, M, L or red, blue, etc.
  additionalPrice: decimal("additional_price", { precision: 10, scale: 2 }).default("0"),
  stock: integer("stock").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productInventory = pgTable("product_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id).notNull(),
  productOptionId: varchar("product_option_id").references(() => productOptions.id), // nullable for simple products
  currentStock: integer("current_stock").default(0),
  reservedStock: integer("reserved_stock").default(0), // for pending orders
  lowStockThreshold: integer("low_stock_threshold").default(10),
  lastRestocked: timestamp("last_restocked"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const registrationJobs = pgTable("registration_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  totalProducts: integer("total_products").notNull().default(0),
  pendingCount: integer("pending_count").notNull().default(0),
  processingCount: integer("processing_count").notNull().default(0),
  completedCount: integer("completed_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  status: text("status").default("pending"), // pending, running, completed, failed
  productIds: jsonb("product_ids").notNull(), // Array of product IDs to register
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const optimizationJobs = pgTable("optimization_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  totalProducts: integer("total_products").notNull().default(0),
  processedProducts: integer("processed_products").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  status: text("status").default("pending"), // pending, running, completed, failed
  productIds: jsonb("product_ids").notNull(), // Array of product IDs to optimize
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const optimizationSuggestions = pgTable("optimization_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").references(() => optimizationJobs.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  originalName: text("original_name").notNull(),
  suggestedNames: jsonb("suggested_names").notNull(), // Array of AI suggested names
  selectedName: text("selected_name"), // User's final choice
  aiAnalysis: jsonb("ai_analysis"), // Gemini's analysis and reasoning
  status: text("status").default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  subscriptionPlan: true,
  isAdmin: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  aiAnalysis: true,
  status: true,
});

export const insertMarketplaceSyncSchema = createInsertSchema(marketplaceSyncs).omit({
  id: true,
  createdAt: true,
  syncedAt: true,
});

export const insertScrapingJobSchema = createInsertSchema(scrapingJobs).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertProductOptionSchema = createInsertSchema(productOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventorySchema = createInsertSchema(productInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRegistrationJobSchema = createInsertSchema(registrationJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOptimizationJobSchema = createInsertSchema(optimizationJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOptimizationSuggestionSchema = createInsertSchema(optimizationSuggestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type MarketplaceSync = typeof marketplaceSyncs.$inferSelect;
export type InsertMarketplaceSync = z.infer<typeof insertMarketplaceSyncSchema>;
export type ScrapingJob = typeof scrapingJobs.$inferSelect;
export type InsertScrapingJob = z.infer<typeof insertScrapingJobSchema>;
export type ProductOption = typeof productOptions.$inferSelect;
export type InsertProductOption = z.infer<typeof insertProductOptionSchema>;
export type Inventory = typeof productInventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type RegistrationJob = typeof registrationJobs.$inferSelect;
export type InsertRegistrationJob = z.infer<typeof insertRegistrationJobSchema>;
export type OptimizationJob = typeof optimizationJobs.$inferSelect;
export type InsertOptimizationJob = z.infer<typeof insertOptimizationJobSchema>;
export type OptimizationSuggestion = typeof optimizationSuggestions.$inferSelect;
export type InsertOptimizationSuggestion = z.infer<typeof insertOptimizationSuggestionSchema>;

// ===== MarketplaceAdapter Structure =====

// 마켓플레이스 제공자 타입
export type MarketplaceProvider = 'naver' | 'coupang' | 'zigzag' | 'cafe24';

// 마켓플레이스 역량 정의
export interface MarketplaceCapabilities {
  supportsCSV: boolean;        // CSV 내보내기 지원
  supportsAPI: boolean;        // API 직접 연동 지원
  supportsOAuth: boolean;      // OAuth 인증 지원
  rateLimit: number;           // API 호출 제한 (per minute)
  maxBatchSize: number;        // 한 번에 처리 가능한 상품 수
}

// 마켓플레이스 어댑터 인터페이스
export interface MarketplaceAdapter {
  provider: MarketplaceProvider;
  capabilities: MarketplaceCapabilities;
  
  // CSV 관련 메서드
  mapProductToCSV(product: Product): Record<string, any>;
  buildCSVHeaders(): string[];
  buildCSVContent(products: Product[]): string;
  
  // API 관련 메서드 (옵셔널)
  pushProduct?(product: Product, connectionId: string): Promise<MarketplaceSyncResult>;
  updateInventory?(productId: string, stock: number, connectionId: string): Promise<MarketplaceSyncResult>;
  getStatus?(marketplaceProductId: string, connectionId: string): Promise<MarketplaceProductStatus>;
}

// 마켓플레이스 동기화 결과
export interface MarketplaceSyncResult {
  success: boolean;
  marketplaceProductId?: string;
  errorMessage?: string;
  retryAfter?: number; // seconds
}

// 마켓플레이스 상품 상태
export interface MarketplaceProductStatus {
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  lastUpdated: Date;
  inventoryCount?: number;
  errorMessage?: string;
}

// 마켓플레이스 연결 정보 (메모리 기반)
export interface MarketplaceConnection {
  id: string;
  userId: string;
  provider: MarketplaceProvider;
  shopId?: string;           // 쇼핑몰 ID (카페24 등)
  shopDomain?: string;       // 쇼핑몰 도메인
  authType: 'oauth' | 'apikey' | 'none';
  accessToken?: string;      // OAuth 액세스 토큰
  refreshToken?: string;     // OAuth 리프레시 토큰
  expiresAt?: Date;         // 토큰 만료일
  apiKey?: string;          // API 키 (필요한 경우)
  status: 'active' | 'expired' | 'error';
  lastSynced?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 카페24 전용 설정
export interface Cafe24Config {
  mallId: string;
  clientId: string;
  redirectUri: string;
  scope: string[];
}

// Zod 스키마들
export const marketplaceConnectionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  provider: z.enum(['naver', 'coupang', 'zigzag', 'cafe24']),
  shopId: z.string().optional(),
  shopDomain: z.string().optional(),
  authType: z.enum(['oauth', 'apikey', 'none']),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.date().optional(),
  apiKey: z.string().optional(),
  status: z.enum(['active', 'expired', 'error']),
  lastSynced: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type InsertMarketplaceConnection = Omit<MarketplaceConnection, 'id' | 'createdAt' | 'updatedAt'>;
