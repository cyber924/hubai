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
