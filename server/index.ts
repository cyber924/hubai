import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Trust proxy for production (Replit uses proxy)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  
  // Require SESSION_SECRET in production
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'your-secret-key-change-this-in-production') {
    throw new Error('SESSION_SECRET is required in production and must be changed from default');
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware with PostgreSQL store
const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS in production
    httpOnly: true,
    sameSite: 'lax', // CSRF protection
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize app for serverless or traditional server
const initializeApp = async () => {
  await registerRoutes(app);

  // API catch-all 404 handler to prevent SPA fallback from handling /api requests
  app.all('/api/*', (req, res) => {
    res.status(404).json({ message: 'API route not found', path: req.originalUrl });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Error handled:', err);
    res.status(status).json({ message });
  });

  return app;
};

// Traditional server for development
if (!process.env.VERCEL) {
  (async () => {
    await initializeApp();
    const server = createServer(app);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  })();
}

// Export for Vercel serverless function
export default initializeApp();
