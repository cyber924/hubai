import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "../server/routes";

const app = express();

// Trust proxy for Vercel
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware with PostgreSQL store (with fallback)
const PgSession = connectPgSimple(session);

// Require DATABASE_URL for persistent sessions in serverless
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for persistent sessions in production');
}

const sessionStore = new PgSession({
  conString: process.env.DATABASE_URL,
  tableName: 'session'
});

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS in Vercel
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize app with routes
let isInitialized = false;

const initializeApp = async () => {
  if (!isInitialized) {
    await registerRoutes(app);
    
    // API catch-all 404 handler
    app.all('/api/*', (req, res) => {
      res.status(404).json({ message: 'API route not found', path: req.originalUrl });
    });

    // Error handler
    app.use((err, req, res, next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error('Error handled:', err);
      res.status(status).json({ message });
    });
    
    isInitialized = true;
  }
  return app;
};

// Export for Vercel
export default async (req, res) => {
  const app = await initializeApp();
  return app(req, res);
};