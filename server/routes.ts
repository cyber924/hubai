import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { scrapeProducts, startScheduledScraping } from "./services/scraper";
import { generateTrendReport } from "./services/gemini";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  
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

  app.put("/api/products/:id", async (req, res) => {
    try {
      const updates = req.body;
      const product = await storage.updateProduct(req.params.id, updates);
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update product: " + error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ message: "Product deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete product: " + error.message });
    }
  });

  // Scraping routes
  app.post("/api/scraping/start", async (req, res) => {
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
  app.get("/api/stats/products", async (req, res) => {
    try {
      const stats = await storage.getProductStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch product stats: " + error.message });
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
          ? subscription.latest_invoice?.payment_intent?.client_secret 
          : undefined,
      });
    } catch (error: any) {
      return res.status(400).send({ error: { message: error.message } });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
