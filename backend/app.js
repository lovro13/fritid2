const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet'); // Import helmet
const logger = require('./logger');

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

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 && !isProduction) { 
        // Allow all origins in dev if FRONTEND_URL is not set
        return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
};

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors(corsOptions)); // TEMPORARILY DISABLED
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static images with CORS headers
app.use('/api/images', cors(corsOptions), express.static(path.join(__dirname, 'uploads/images/products')));

// Initialize database
initializeDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
// The static middleware above handles GET requests, imageRoutes can handle other methods if needed.
app.use('/api/images', imageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Fritid Backend is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});

module.exports = app;
