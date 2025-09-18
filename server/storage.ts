import { type User, type InsertUser, type Product, type InsertProduct, type MarketplaceSync, type InsertMarketplaceSync, type ScrapingJob, type InsertScrapingJob } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
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

  // Marketplace sync operations
  getMarketplaceSyncs(productId?: string): Promise<MarketplaceSync[]>;
  createMarketplaceSync(sync: InsertMarketplaceSync): Promise<MarketplaceSync>;
  updateMarketplaceSync(id: string, updates: Partial<MarketplaceSync>): Promise<MarketplaceSync>;

  // Scraping job operations
  getScrapingJobs(limit?: number): Promise<ScrapingJob[]>;
  createScrapingJob(job: InsertScrapingJob): Promise<ScrapingJob>;
  updateScrapingJob(id: string, updates: Partial<ScrapingJob>): Promise<ScrapingJob>;

  // Statistics
  getProductStats(): Promise<{
    total: number;
    analyzed: number;
    registered: number;
    synced: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private products: Map<string, Product>;
  private marketplaceSyncs: Map<string, MarketplaceSync>;
  private scrapingJobs: Map<string, ScrapingJob>;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.marketplaceSyncs = new Map();
    this.scrapingJobs = new Map();
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
      productsFound: 0,
      productsProcessed: 0,
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
}

export const storage = new MemStorage();
