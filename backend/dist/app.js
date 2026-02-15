"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const logger_1 = __importDefault(require("./logger"));
const csrf_1 = __importDefault(require("./middleware/csrf"));
// Load environment variables
const envPath = process.env.ENV_PATH;
dotenv_1.default.config({ path: envPath });
logger_1.default.info(`Loading environment from: ${envPath}`);
// Validate required environment variables
if (!process.env.JWT_SECRET) {
    logger_1.default.error('FATAL: JWT_SECRET environment variable is not set');
    process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
    logger_1.default.warn('WARNING: JWT_SECRET should be at least 32 characters long for security');
}
// Import database initialization
logger_1.default.info(`Environment: ${process.env.NODE_ENV ?? 'unknown'}`);
const dbModel_1 = require("./models/dbModel");
// Import routes
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const imageRoutes_1 = __importDefault(require("./routes/imageRoutes"));
const app = (0, express_1.default)();
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
const PORT = process.env.PORT;
// --- Production Configuration ---
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
// --- HTTPS Enforcement ---
if (isProduction) {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        }
        else {
            next();
        }
    });
}
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.length === 0) {
            logger_1.default.error('CORS: FRONTEND_URL is not configured ');
            return callback(new Error('CORS not configured'));
        }
        const normalizedOrigin = origin.replace(/\/$/, '');
        if (allowedOrigins.includes(normalizedOrigin)) {
            return callback(null, true);
        }
        logger_1.default.warn('CORS: Origin not allowed', { origin, allowedOrigins });
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token']
};
// Middleware
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '10kb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10kb' }));
app.use((0, cookie_parser_1.default)());
app.use(csrf_1.default);
// --- Rate Limiting ---
// Global rate limiter for all API routes
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // limit each IP to 300 requests per windowMs (approx 1 per 3 seconds on avg)
    message: 'Preveč zahtevkov s tega IP naslova, poskusite znova pozneje.',
    standardHeaders: true,
    legacyHeaders: false,
});
// Stricter rate limiter for authentication routes
const authLimiter = (0, express_rate_limit_1.default)({
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
const backendDir = path_1.default.basename(__dirname) === 'dist' ? path_1.default.resolve(__dirname, '..') : __dirname;
const uploadsDir = path_1.default.resolve(backendDir, 'uploads/images/products');
const legacyUploadsDir = path_1.default.resolve(backendDir, 'dist/uploads/images/products');
// Serve static images with CORS headers
app.use('/api/images', (0, cors_1.default)(corsOptions), express_1.default.static(uploadsDir), express_1.default.static(legacyUploadsDir));
// Initialize database
(0, dbModel_1.initializeDatabase)();
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/products', productRoutes_1.default);
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/images', imageRoutes_1.default);
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Fritid Backend is running' });
});
// Error handling middleware
app.use((err, req, res, next) => {
    // Log full error details (including stack) only in development
    if (isProduction) {
        logger_1.default.error('Error occurred:', {
            message: err.message,
            path: req.path,
            method: req.method,
            ip: req.ip
        });
    }
    else {
        logger_1.default.error('Error occurred:', {
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
    logger_1.default.info(`Server is running on port ${PORT}`);
});
exports.default = app;
logger_1.default.info('Succesfuly made endpoints with no error found!');
