"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.getPool = getPool;
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("../logger"));
let pool = null;
const envPath = '../' + (process.env.ENV_PATH || '.env');
dotenv_1.default.config({ path: envPath });
async function initializeDatabase() {
    try {
        pool = promise_1.default.createPool({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            namedPlaceholders: true,
            charset: 'utf8mb4'
        });
        const connection = await pool.getConnection();
        logger_1.default.info('Successfully connected to MySQL database.');
        connection.release();
        await createTables();
        logger_1.default.info('DB init OK (MySQL)');
    }
    catch (error) {
        logger_1.default.error('Failed to initialize MySQL database:', error);
        process.exit(1);
    }
}
async function createTables() {
    if (!pool)
        throw new Error('DB not initialized');
    const connection = await pool.getConnection();
    try {
        await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NULL,
        address TEXT,
        postal_code VARCHAR(20),
        city VARCHAR(100),
        phone_number VARCHAR(20),
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        image_url VARCHAR(512),
        colors JSON NULL,
        category VARCHAR(100),
        stock_quantity INT NOT NULL DEFAULT 0,
        minimax_id VARCHAR(255) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_products_active (is_active),
        INDEX idx_products_price (price)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        shipping_first_name VARCHAR(255) NOT NULL,
        shipping_last_name VARCHAR(255) NOT NULL,
        shipping_email VARCHAR(255) NOT NULL,
        shipping_address TEXT NOT NULL,
        shipping_postal_code VARCHAR(20) NOT NULL,
        shipping_city VARCHAR(100) NOT NULL,
        shipping_phone_number VARCHAR(20) NOT NULL,
        payment_method ENUM('DELIVERY', 'UPN') NOT NULL DEFAULT 'DELIVERY',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
        INDEX idx_orders_user_id (user_id),
        INDEX idx_orders_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        color VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL,
        INDEX idx_order_items_order_id (order_id),
        INDEX idx_order_items_product_id (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        logger_1.default.info('All tables created or already exist.');
    }
    finally {
        connection.release();
    }
}
function getPool() {
    if (!pool) {
        throw new Error('DB not initialized');
    }
    return pool;
}
// CommonJS compatibility for existing require() usage
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = { initializeDatabase, getPool };
