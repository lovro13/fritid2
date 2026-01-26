import type { Request, Response, NextFunction } from 'express';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import logger from './logger';
import csrfProtection from './middleware/csrf';

// Load environment variables
const envPath = process.env.ENV_PATH;
dotenv.config({ path: envPath });
logger.info(`Loading environment from: ${envPath}`);

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  logger.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  logger.warn('WARNING: JWT_SECRET should be at least 32 characters long for security');
}

// Import database initialization
logger.info(`Environment: ${process.env.NODE_ENV ?? 'unknown'}`);
import { initializeDatabase } from './models/dbModel';

// Import routes
import userRoutes from './routes/userRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import imageRoutes from './routes/imageRoutes';

const app = express();
const PORT = process.env.PORT;

// --- Production Configuration ---
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.FRONTEND_URL || '';

// --- HTTPS Enforcement ---
if (isProduction) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.length === 0) {
      logger.error('CORS: FRONTEND_URL is not configured ');
      return callback(new Error('CORS not configured'));
    }

    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    logger.warn('CORS: Origin not allowed', { origin, allowedOrigins });
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token']
};

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(csrfProtection);

// --- Rate Limiting ---
// Global rate limiter for all API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs (approx 1 per 3 seconds on avg)
  message: 'Preveč zahtevkov s tega IP naslova, poskusite znova pozneje.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Preveč poskusov prijave, poskusite znova pozneje.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

const backendDir = path.basename(__dirname) === 'dist' ? path.resolve(__dirname, '..') : __dirname;
const uploadsDir = path.resolve(backendDir, 'uploads/images/products');
const legacyUploadsDir = path.resolve(backendDir, 'dist/uploads/images/products');

// Serve static images with CORS headers
app.use('/api/images', cors(corsOptions), express.static(uploadsDir), express.static(legacyUploadsDir));

// Initialize database
initializeDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/images', imageRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Fritid Backend is running' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Log full error details (including stack) only in development
  if (isProduction) {
    logger.error('Error occurred:', {
      message: err.message,
      path: req.path,
      method: req.method,
      ip: req.ip
    });
  } else {
    logger.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip
    });
  }

  // Always return generic error message to client
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: isProduction ? 'Something went wrong!' : err.message
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

export default app;
logger.info('Succesfuly made endpoints with no error found!');
