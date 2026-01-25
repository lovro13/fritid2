const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const logger = require('./logger');
const CSRFProtection = require('./middleware/csrf');

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
logger.info(process.env.NODE_ENV)
const { initializeDatabase } = require('./models/dbModel');

// Import routes
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const imageRoutes = require('./routes/imageRoutes');

const app = express();
const PORT = process.env.PORT;

// --- Production Configuration ---
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.FRONTEND_URL;

// --- HTTPS Enforcement ---
if (isProduction) {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.length === 0) {
      logger.error('CORS: FRONTEND_URL is not configured ');
      return callback(new Error('CORS not configured'));
    }

    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn('CORS: Origin not allowed', { origin, allowedOrigins });
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies for CSRF protection
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token']
};

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
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

// CSRF Protection - Generate token for all requests
app.use(CSRFProtection.generateTokenMiddleware);
// CSRF Protection - Validate token for state-changing requests
app.use('/api/', CSRFProtection.validateTokenMiddleware);

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
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Fritid Backend is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
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
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

module.exports = app;
logger.info("Succesfuly made endpoints with no error found!")
