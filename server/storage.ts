import { type User, type InsertUser, type Product, type InsertProduct, type MarketplaceSync, type InsertMarketplaceSync, type ScrapingJob, type InsertScrapingJob, type ProductOption, type InsertProductOption, type Inventory, type InsertInventory, type RegistrationJob, type InsertRegistrationJob, users, products, marketplaceSyncs, scrapingJobs, productOptions, productInventory, registrationJobs } from "@shared/schema";

// AI Optimization types (메모리 기반으로 구현)
type OptimizationJob = {
  id: string;
  createdBy: string;
  totalProducts: number;
  processedProducts: number;
  successCount: number;
  failureCount: number;
  status: string;
  productIds: any;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type OptimizationSuggestion = {
  id: string;
  jobId: string;
  productId: string;
  originalName: string;
  suggestedNames: any;
  selectedName: string | null;
  aiAnalysis: any;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};
import { randomUUID } from "crypto";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, desc, sql } from 'drizzle-orm';

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(limit?: number, offset?: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  updateUserStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  updateStripeCustomerId(id: string, stripeCustomerId: string): Promise<User>;

  // Product operations
  getProducts(limit?: number, offset?: number): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductsBySource(source: string): Promise<Product[]>;
  getProductsByStatus(status: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product>;
  updateProductAiAnalysis(id: string, analysis: any): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Product options operations
  getProductOptions(productId: string): Promise<ProductOption[]>;
  createProductOption(option: InsertProductOption): Promise<ProductOption>;
  updateProductOption(id: string, updates: Partial<ProductOption>): Promise<ProductOption>;
  deleteProductOption(id: string): Promise<void>;

  // Inventory operations
  getInventory(productId?: string): Promise<Inventory[]>;
  getInventoryByProduct(productId: string): Promise<Inventory[]>;
  createInventory(inventory: InsertInventory): Promise<Inventory>;
  updateInventory(id: string, updates: Partial<Inventory>): Promise<Inventory>;
  deleteInventory(id: string): Promise<void>;

  // Marketplace sync operations
  getMarketplaceSyncs(productId?: string): Promise<MarketplaceSync[]>;
  createMarketplaceSync(sync: InsertMarketplaceSync): Promise<MarketplaceSync>;
  updateMarketplaceSync(id: string, updates: Partial<MarketplaceSync>): Promise<MarketplaceSync>;

  // Scraping job operations
  getScrapingJobs(limit?: number): Promise<ScrapingJob[]>;
  createScrapingJob(job: InsertScrapingJob): Promise<ScrapingJob>;
  updateScrapingJob(id: string, updates: Partial<ScrapingJob>): Promise<ScrapingJob>;

  // Registration job operations
  getRegistrationJobs(limit?: number): Promise<RegistrationJob[]>;
  getRegistrationJob(id: string): Promise<RegistrationJob | undefined>;
  createRegistrationJob(job: InsertRegistrationJob): Promise<RegistrationJob>;
  updateRegistrationJob(id: string, updates: Partial<RegistrationJob>): Promise<RegistrationJob>;

  // AI Optimization job operations
  getOptimizationJobs(limit?: number): Promise<OptimizationJob[]>;
  getOptimizationJob(id: string): Promise<OptimizationJob | undefined>;
  createOptimizationJob(job: Omit<OptimizationJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<OptimizationJob>;
  updateOptimizationJob(id: string, updates: Partial<OptimizationJob>): Promise<OptimizationJob>;

  // AI Optimization suggestion operations  
  getOptimizationSuggestions(jobId: string): Promise<OptimizationSuggestion[]>;
  getOptimizationSuggestion(id: string): Promise<OptimizationSuggestion | undefined>;
  createOptimizationSuggestion(suggestion: Omit<OptimizationSuggestion, 'id' | 'createdAt' | 'updatedAt'>): Promise<OptimizationSuggestion>;
  updateOptimizationSuggestion(id: string, updates: Partial<OptimizationSuggestion>): Promise<OptimizationSuggestion>;

  // Statistics
  getProductStats(): Promise<{
    total: number;
    analyzed: number;
    registered: number;
    synced: number;
  }>;
  getUserStats(): Promise<{
    total: number;
    premium: number;
    free: number;
    admin: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private products: Map<string, Product>;
  private marketplaceSyncs: Map<string, MarketplaceSync>;
  private scrapingJobs: Map<string, ScrapingJob>;
  private productOptions: Map<string, ProductOption>;
  private inventories: Map<string, Inventory>;
  private registrationJobs: Map<string, RegistrationJob>;
  private optimizationJobs: Map<string, OptimizationJob>;
  private optimizationSuggestions: Map<string, OptimizationSuggestion>;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.marketplaceSyncs = new Map();
    this.scrapingJobs = new Map();
    this.productOptions = new Map();
    this.inventories = new Map();
    this.registrationJobs = new Map();
    this.optimizationJobs = new Map();
    this.optimizationSuggestions = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUsers(limit = 50, offset = 0): Promise<User[]> {
    const users = Array.from(this.users.values()).sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
    return users.slice(offset, offset + limit);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionPlan: "free",
      isAdmin: false,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, stripeCustomerId, stripeSubscriptionId };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateStripeCustomerId(id: string, stripeCustomerId: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, stripeCustomerId };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getProducts(limit = 50, offset = 0): Promise<Product[]> {
    const products = Array.from(this.products.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(offset, offset + limit);
    return products;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsBySource(source: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(product => product.source === source);
  }

  async getProductsByStatus(status: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(product => product.status === status);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = {
      ...insertProduct,
      id,
      description: insertProduct.description ?? null,
      originalPrice: insertProduct.originalPrice ?? null,
      imageUrl: insertProduct.imageUrl ?? null,
      imageUrls: insertProduct.imageUrls ?? null,
      category: insertProduct.category ?? null,
      subcategory: insertProduct.subcategory ?? null,
      brand: insertProduct.brand ?? null,
      sourceUrl: insertProduct.sourceUrl ?? null,
      sourceProductId: insertProduct.sourceProductId ?? null,
      tags: insertProduct.tags ?? null,
      season: insertProduct.season ?? null,
      gender: insertProduct.gender ?? null,
      ageGroup: insertProduct.ageGroup ?? null,
      status: "pending",
      aiAnalysis: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const product = this.products.get(id);
    if (!product) throw new Error("Product not found");
    
    const updatedProduct = { ...product, ...updates, updatedAt: new Date() };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async updateProductAiAnalysis(id: string, analysis: any): Promise<Product> {
    const product = this.products.get(id);
    if (!product) throw new Error("Product not found");
    
    const updatedProduct = { 
      ...product, 
      aiAnalysis: analysis, 
      status: "analyzed",
      category: analysis.category || product.category,
      tags: analysis.tags || product.tags,
      season: analysis.season || product.season,
      updatedAt: new Date()
    };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<void> {
    this.products.delete(id);
  }

  async getMarketplaceSyncs(productId?: string): Promise<MarketplaceSync[]> {
    const syncs = Array.from(this.marketplaceSyncs.values());
    return productId ? syncs.filter(sync => sync.productId === productId) : syncs;
  }

  async createMarketplaceSync(insertSync: InsertMarketplaceSync): Promise<MarketplaceSync> {
    const id = randomUUID();
    const sync: MarketplaceSync = {
      ...insertSync,
      id,
      status: insertSync.status ?? null,
      marketplaceProductId: null,
      syncedAt: null,
      errorMessage: null,
      createdAt: new Date()
    };
    this.marketplaceSyncs.set(id, sync);
    return sync;
  }

  async updateMarketplaceSync(id: string, updates: Partial<MarketplaceSync>): Promise<MarketplaceSync> {
    const sync = this.marketplaceSyncs.get(id);
    if (!sync) throw new Error("Marketplace sync not found");
    
    const updatedSync = { ...sync, ...updates };
    this.marketplaceSyncs.set(id, updatedSync);
    return updatedSync;
  }

  async getScrapingJobs(limit = 10): Promise<ScrapingJob[]> {
    return Array.from(this.scrapingJobs.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  async createScrapingJob(insertJob: InsertScrapingJob): Promise<ScrapingJob> {
    const id = randomUUID();
    const job: ScrapingJob = {
      ...insertJob,
      id,
      status: insertJob.status ?? null,
      productsFound: insertJob.productsFound ?? null,
      productsProcessed: insertJob.productsProcessed ?? null,
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      createdAt: new Date()
    };
    this.scrapingJobs.set(id, job);
    return job;
  }

  async updateScrapingJob(id: string, updates: Partial<ScrapingJob>): Promise<ScrapingJob> {
    const job = this.scrapingJobs.get(id);
    if (!job) throw new Error("Scraping job not found");
    
    const updatedJob = { ...job, ...updates };
    this.scrapingJobs.set(id, updatedJob);
    return updatedJob;
  }

  async getProductStats(): Promise<{ total: number; analyzed: number; registered: number; synced: number; }> {
    const products = Array.from(this.products.values());
    const syncs = Array.from(this.marketplaceSyncs.values());
    
    return {
      total: products.length,
      analyzed: products.filter(p => p.status === "analyzed" || p.status === "registered").length,
      registered: products.filter(p => p.status === "registered").length,
      synced: syncs.filter(s => s.status === "synced").length
    };
  }

  async getUserStats(): Promise<{ total: number; premium: number; free: number; admin: number; }> {
    const users = Array.from(this.users.values());
    
    return {
      total: users.length,
      premium: users.filter(u => u.subscriptionPlan && u.subscriptionPlan !== "free").length,
      free: users.filter(u => !u.subscriptionPlan || u.subscriptionPlan === "free").length,
      admin: users.filter(u => u.isAdmin).length
    };
  }

  // Product options operations
  async getProductOptions(productId: string): Promise<ProductOption[]> {
    return Array.from(this.productOptions.values()).filter(option => option.productId === productId);
  }

  async createProductOption(insertOption: InsertProductOption): Promise<ProductOption> {
    const id = randomUUID();
    const option: ProductOption = {
      ...insertOption,
      id,
      additionalPrice: insertOption.additionalPrice ?? null,
      stock: insertOption.stock ?? null,
      isActive: insertOption.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.productOptions.set(id, option);
    return option;
  }

  async updateProductOption(id: string, updates: Partial<ProductOption>): Promise<ProductOption> {
    const option = this.productOptions.get(id);
    if (!option) throw new Error("Product option not found");
    
    const updatedOption = { ...option, ...updates, updatedAt: new Date() };
    this.productOptions.set(id, updatedOption);
    return updatedOption;
  }

  async deleteProductOption(id: string): Promise<void> {
    this.productOptions.delete(id);
  }

  // Inventory operations
  async getInventory(productId?: string): Promise<Inventory[]> {
    const inventories = Array.from(this.inventories.values());
    return productId ? inventories.filter(inv => inv.productId === productId) : inventories;
  }

  async getInventoryByProduct(productId: string): Promise<Inventory[]> {
    return Array.from(this.inventories.values()).filter(inv => inv.productId === productId);
  }

  async createInventory(insertInventory: InsertInventory): Promise<Inventory> {
    const id = randomUUID();
    const inventory: Inventory = {
      ...insertInventory,
      id,
      productOptionId: insertInventory.productOptionId ?? null,
      currentStock: insertInventory.currentStock ?? null,
      reservedStock: insertInventory.reservedStock ?? null,
      lowStockThreshold: insertInventory.lowStockThreshold ?? null,
      lastRestocked: insertInventory.lastRestocked ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.inventories.set(id, inventory);
    return inventory;
  }

  async updateInventory(id: string, updates: Partial<Inventory>): Promise<Inventory> {
    const inventory = this.inventories.get(id);
    if (!inventory) throw new Error("Inventory not found");
    
    const updatedInventory = { ...inventory, ...updates, updatedAt: new Date() };
    this.inventories.set(id, updatedInventory);
    return updatedInventory;
  }

  async deleteInventory(id: string): Promise<void> {
    this.inventories.delete(id);
  }

  // Registration job operations
  async getRegistrationJobs(limit = 10): Promise<RegistrationJob[]> {
    const jobs = Array.from(this.registrationJobs.values()).sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
    return jobs.slice(0, limit);
  }

  async getRegistrationJob(id: string): Promise<RegistrationJob | undefined> {
    return this.registrationJobs.get(id);
  }

  async createRegistrationJob(insertJob: InsertRegistrationJob): Promise<RegistrationJob> {
    const id = randomUUID();
    const job: RegistrationJob = {
      ...insertJob,
      id,
      totalProducts: insertJob.totalProducts ?? 0,
      pendingCount: insertJob.pendingCount ?? 0,
      processingCount: insertJob.processingCount ?? 0,
      completedCount: insertJob.completedCount ?? 0,
      failedCount: insertJob.failedCount ?? 0,
      status: insertJob.status ?? "pending",
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.registrationJobs.set(id, job);
    return job;
  }

  async updateRegistrationJob(id: string, updates: Partial<RegistrationJob>): Promise<RegistrationJob> {
    const job = this.registrationJobs.get(id);
    if (!job) throw new Error("Registration job not found");
    
    const updatedJob = { ...job, ...updates, updatedAt: new Date() };
    this.registrationJobs.set(id, updatedJob);
    return updatedJob;
  }

  // AI Optimization job operations
  async getOptimizationJobs(limit = 10): Promise<OptimizationJob[]> {
    const jobs = Array.from(this.optimizationJobs.values()).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return jobs.slice(0, limit);
  }

  async getOptimizationJob(id: string): Promise<OptimizationJob | undefined> {
    return this.optimizationJobs.get(id);
  }

  async createOptimizationJob(job: Omit<OptimizationJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<OptimizationJob> {
    const id = randomUUID();
    const optimizationJob: OptimizationJob = {
      ...job,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.optimizationJobs.set(id, optimizationJob);
    return optimizationJob;
  }

  async updateOptimizationJob(id: string, updates: Partial<OptimizationJob>): Promise<OptimizationJob> {
    const job = this.optimizationJobs.get(id);
    if (!job) throw new Error("Optimization job not found");
    
    const updatedJob = { ...job, ...updates, updatedAt: new Date() };
    this.optimizationJobs.set(id, updatedJob);
    return updatedJob;
  }

  // AI Optimization suggestion operations
  async getOptimizationSuggestions(jobId: string): Promise<OptimizationSuggestion[]> {
    return Array.from(this.optimizationSuggestions.values())
      .filter(suggestion => suggestion.jobId === jobId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getOptimizationSuggestion(id: string): Promise<OptimizationSuggestion | undefined> {
    return this.optimizationSuggestions.get(id);
  }

  async createOptimizationSuggestion(suggestion: Omit<OptimizationSuggestion, 'id' | 'createdAt' | 'updatedAt'>): Promise<OptimizationSuggestion> {
    const id = randomUUID();
    const optimizationSuggestion: OptimizationSuggestion = {
      ...suggestion,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.optimizationSuggestions.set(id, optimizationSuggestion);
    return optimizationSuggestion;
  }

  async updateOptimizationSuggestion(id: string, updates: Partial<OptimizationSuggestion>): Promise<OptimizationSuggestion> {
    const suggestion = this.optimizationSuggestions.get(id);
    if (!suggestion) throw new Error("Optimization suggestion not found");
    
    const updatedSuggestion = { ...suggestion, ...updates, updatedAt: new Date() };
    this.optimizationSuggestions.set(id, updatedSuggestion);
    return updatedSuggestion;
  }
}

export class DatabaseStorage implements IStorage {
  private db;
  
  // AI Optimization - 메모리 기반 저장소 (임시 해결책)
  private optimizationJobs = new Map<string, OptimizationJob>();
  private optimizationSuggestions = new Map<string, OptimizationSuggestion>();

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for DatabaseStorage');
    }
    const sql = postgres(process.env.DATABASE_URL, {
      ssl: 'require'
    });
    this.db = drizzle(sql);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getUsers(limit = 50, offset = 0): Promise<User[]> {
    return await this.db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values({
      ...insertUser,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionPlan: "free",
      isAdmin: false
    }).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const result = await this.db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    if (result.length === 0) throw new Error("User not found");
    return result[0];
  }

  async updateUserStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    const result = await this.db.update(users)
      .set({ stripeCustomerId, stripeSubscriptionId })
      .where(eq(users.id, id))
      .returning();
    if (result.length === 0) throw new Error("User not found");
    return result[0];
  }

  async updateStripeCustomerId(id: string, stripeCustomerId: string): Promise<User> {
    const result = await this.db.update(users)
      .set({ stripeCustomerId })
      .where(eq(users.id, id))
      .returning();
    if (result.length === 0) throw new Error("User not found");
    return result[0];
  }

  // Product operations
  async getProducts(limit = 50, offset = 0): Promise<Product[]> {
    return await this.db.select().from(products).orderBy(desc(products.createdAt)).limit(limit).offset(offset);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await this.db.select().from(products).where(eq(products.id, id));
    return result[0];
  }

  async getProductsBySource(source: string): Promise<Product[]> {
    return await this.db.select().from(products).where(eq(products.source, source));
  }

  async getProductsByStatus(status: string): Promise<Product[]> {
    return await this.db.select().from(products).where(eq(products.status, status));
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const result = await this.db.insert(products).values({
      ...insertProduct,
      description: insertProduct.description ?? null,
      originalPrice: insertProduct.originalPrice ?? null,
      imageUrl: insertProduct.imageUrl ?? null,
      imageUrls: insertProduct.imageUrls ?? null,
      category: insertProduct.category ?? null,
      subcategory: insertProduct.subcategory ?? null,
      brand: insertProduct.brand ?? null,
      sourceUrl: insertProduct.sourceUrl ?? null,
      sourceProductId: insertProduct.sourceProductId ?? null,
      tags: insertProduct.tags ?? null,
      season: insertProduct.season ?? null,
      gender: insertProduct.gender ?? null,
      ageGroup: insertProduct.ageGroup ?? null,
      status: "pending",
      aiAnalysis: null
    }).returning();
    return result[0];
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const result = await this.db.update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    if (result.length === 0) throw new Error("Product not found");
    return result[0];
  }

  async updateProductAiAnalysis(id: string, analysis: any): Promise<Product> {
    const result = await this.db.update(products)
      .set({
        aiAnalysis: analysis,
        status: "analyzed",
        category: analysis.category || null,
        tags: analysis.tags || null,
        season: analysis.season || null,
        updatedAt: new Date()
      })
      .where(eq(products.id, id))
      .returning();
    if (result.length === 0) throw new Error("Product not found");
    return result[0];
  }

  async deleteProduct(id: string): Promise<void> {
    await this.db.delete(products).where(eq(products.id, id));
  }

  // Marketplace sync operations
  async getMarketplaceSyncs(productId?: string): Promise<MarketplaceSync[]> {
    if (productId) {
      return await this.db.select().from(marketplaceSyncs).where(eq(marketplaceSyncs.productId, productId));
    }
    return await this.db.select().from(marketplaceSyncs);
  }

  async createMarketplaceSync(insertSync: InsertMarketplaceSync): Promise<MarketplaceSync> {
    const result = await this.db.insert(marketplaceSyncs).values({
      ...insertSync,
      status: insertSync.status ?? null,
      marketplaceProductId: null,
      syncedAt: null,
      errorMessage: null
    }).returning();
    return result[0];
  }

  async updateMarketplaceSync(id: string, updates: Partial<MarketplaceSync>): Promise<MarketplaceSync> {
    const result = await this.db.update(marketplaceSyncs)
      .set(updates)
      .where(eq(marketplaceSyncs.id, id))
      .returning();
    if (result.length === 0) throw new Error("Marketplace sync not found");
    return result[0];
  }

  // Scraping job operations
  async getScrapingJobs(limit = 10): Promise<ScrapingJob[]> {
    return await this.db.select().from(scrapingJobs).orderBy(desc(scrapingJobs.createdAt)).limit(limit);
  }

  async createScrapingJob(insertJob: InsertScrapingJob): Promise<ScrapingJob> {
    const result = await this.db.insert(scrapingJobs).values({
      ...insertJob,
      status: insertJob.status ?? null,
      productsFound: insertJob.productsFound ?? null,
      productsProcessed: insertJob.productsProcessed ?? null,
      startedAt: null,
      completedAt: null,
      errorMessage: null
    }).returning();
    return result[0];
  }

  async updateScrapingJob(id: string, updates: Partial<ScrapingJob>): Promise<ScrapingJob> {
    const result = await this.db.update(scrapingJobs)
      .set(updates)
      .where(eq(scrapingJobs.id, id))
      .returning();
    if (result.length === 0) throw new Error("Scraping job not found");
    return result[0];
  }

  async getProductStats(): Promise<{ total: number; analyzed: number; registered: number; synced: number; }> {
    const [totalCount] = await this.db.select({ count: sql<number>`count(*)` }).from(products);
    const [analyzedCount] = await this.db.select({ count: sql<number>`count(*)` }).from(products).where(sql`status IN ('analyzed', 'registered')`);
    const [registeredCount] = await this.db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.status, 'registered'));
    const [syncedCount] = await this.db.select({ count: sql<number>`count(*)` }).from(marketplaceSyncs).where(eq(marketplaceSyncs.status, 'synced'));

    return {
      total: totalCount.count,
      analyzed: analyzedCount.count,
      registered: registeredCount.count,
      synced: syncedCount.count
    };
  }

  async getUserStats(): Promise<{ total: number; premium: number; free: number; admin: number; }> {
    const [totalCount] = await this.db.select({ count: sql<number>`count(*)` }).from(users);
    const [premiumCount] = await this.db.select({ count: sql<number>`count(*)` }).from(users).where(sql`subscription_plan IS NOT NULL AND subscription_plan != 'free'`);
    const [freeCount] = await this.db.select({ count: sql<number>`count(*)` }).from(users).where(sql`subscription_plan IS NULL OR subscription_plan = 'free'`);
    const [adminCount] = await this.db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isAdmin, true));

    return {
      total: totalCount.count,
      premium: premiumCount.count,
      free: freeCount.count,
      admin: adminCount.count
    };
  }

  // Product options operations
  async getProductOptions(productId: string): Promise<ProductOption[]> {
    return await this.db.select().from(productOptions).where(eq(productOptions.productId, productId));
  }

  async createProductOption(insertOption: InsertProductOption): Promise<ProductOption> {
    const result = await this.db.insert(productOptions).values(insertOption).returning();
    return result[0];
  }

  async updateProductOption(id: string, updates: Partial<ProductOption>): Promise<ProductOption> {
    const result = await this.db.update(productOptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(productOptions.id, id))
      .returning();
    if (result.length === 0) throw new Error("Product option not found");
    return result[0];
  }

  async deleteProductOption(id: string): Promise<void> {
    await this.db.delete(productOptions).where(eq(productOptions.id, id));
  }

  // Inventory operations
  async getInventory(productId?: string): Promise<Inventory[]> {
    if (productId) {
      return await this.db.select().from(productInventory).where(eq(productInventory.productId, productId));
    }
    return await this.db.select().from(productInventory);
  }

  async getInventoryByProduct(productId: string): Promise<Inventory[]> {
    return await this.db.select().from(productInventory).where(eq(productInventory.productId, productId));
  }

  async createInventory(insertInventory: InsertInventory): Promise<Inventory> {
    const result = await this.db.insert(productInventory).values(insertInventory).returning();
    return result[0];
  }

  async updateInventory(id: string, updates: Partial<Inventory>): Promise<Inventory> {
    const result = await this.db.update(productInventory)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(productInventory.id, id))
      .returning();
    if (result.length === 0) throw new Error("Inventory not found");
    return result[0];
  }

  async deleteInventory(id: string): Promise<void> {
    await this.db.delete(productInventory).where(eq(productInventory.id, id));
  }

  // Registration job operations (temporary memory-based until DB sync is fixed)
  private registrationJobs: Map<string, RegistrationJob> = new Map();

  async getRegistrationJobs(limit = 10): Promise<RegistrationJob[]> {
    const jobs = Array.from(this.registrationJobs.values()).sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
    return jobs.slice(0, limit);
  }

  async getRegistrationJob(id: string): Promise<RegistrationJob | undefined> {
    return this.registrationJobs.get(id);
  }

  async createRegistrationJob(insertJob: InsertRegistrationJob): Promise<RegistrationJob> {
    const id = randomUUID();
    const job: RegistrationJob = {
      ...insertJob,
      id,
      totalProducts: insertJob.totalProducts ?? 0,
      pendingCount: insertJob.pendingCount ?? 0,
      processingCount: insertJob.processingCount ?? 0,
      completedCount: insertJob.completedCount ?? 0,
      failedCount: insertJob.failedCount ?? 0,
      status: insertJob.status ?? "pending",
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.registrationJobs.set(id, job);
    return job;
  }

  async updateRegistrationJob(id: string, updates: Partial<RegistrationJob>): Promise<RegistrationJob> {
    const job = this.registrationJobs.get(id);
    if (!job) throw new Error("Registration job not found");
    
    const updatedJob = { ...job, ...updates, updatedAt: new Date() };
    this.registrationJobs.set(id, updatedJob);
    return updatedJob;
  }

  // AI Optimization job operations (메모리 기반 구현)
  async getOptimizationJobs(limit = 10): Promise<OptimizationJob[]> {
    const jobs = Array.from(this.optimizationJobs.values()).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return jobs.slice(0, limit);
  }

  async getOptimizationJob(id: string): Promise<OptimizationJob | undefined> {
    return this.optimizationJobs.get(id);
  }

  async createOptimizationJob(job: Omit<OptimizationJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<OptimizationJob> {
    const id = randomUUID();
    const optimizationJob: OptimizationJob = {
      ...job,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.optimizationJobs.set(id, optimizationJob);
    return optimizationJob;
  }

  async updateOptimizationJob(id: string, updates: Partial<OptimizationJob>): Promise<OptimizationJob> {
    const job = this.optimizationJobs.get(id);
    if (!job) throw new Error("Optimization job not found");
    
    const updatedJob = { ...job, ...updates, updatedAt: new Date() };
    this.optimizationJobs.set(id, updatedJob);
    return updatedJob;
  }

  // AI Optimization suggestion operations
  async getOptimizationSuggestions(jobId: string): Promise<OptimizationSuggestion[]> {
    return Array.from(this.optimizationSuggestions.values())
      .filter(suggestion => suggestion.jobId === jobId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getOptimizationSuggestion(id: string): Promise<OptimizationSuggestion | undefined> {
    return this.optimizationSuggestions.get(id);
  }

  async createOptimizationSuggestion(suggestion: Omit<OptimizationSuggestion, 'id' | 'createdAt' | 'updatedAt'>): Promise<OptimizationSuggestion> {
    const id = randomUUID();
    const optimizationSuggestion: OptimizationSuggestion = {
      ...suggestion,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.optimizationSuggestions.set(id, optimizationSuggestion);
    return optimizationSuggestion;
  }

  async updateOptimizationSuggestion(id: string, updates: Partial<OptimizationSuggestion>): Promise<OptimizationSuggestion> {
    const suggestion = this.optimizationSuggestions.get(id);
    if (!suggestion) throw new Error("Optimization suggestion not found");
    
    const updatedSuggestion = { ...suggestion, ...updates, updatedAt: new Date() };
    this.optimizationSuggestions.set(id, updatedSuggestion);
    return updatedSuggestion;
  }
}

// Use DatabaseStorage for persistent data storage
export const storage = new DatabaseStorage();
