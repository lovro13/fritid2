const crypto = require('crypto');
const logger = require('../logger');

/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern for CSRF protection
 */
class CSRFProtection {
    /**
     * Generate a CSRF token
     */
    static generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Middleware to generate and set CSRF token cookie
     * Token is sent as a cookie and must be included in X-CSRF-Token header
     */
    static generateTokenMiddleware(req, res, next) {
        // Only generate token for GET requests (to avoid unnecessary token generation)
        // For other methods, token should already exist
        if (req.method === 'GET' && !req.cookies['csrf-token']) {
            const token = CSRFProtection.generateToken();
            res.cookie('csrf-token', token, {
                httpOnly: false, // Must be readable by JavaScript for header
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
            // Also set it in response header for easy access
            res.setHeader('X-CSRF-Token', token);
        }
        next();
    }

    /**
     * Middleware to validate CSRF token
     * Compares token from cookie with token from header
     */
    static validateTokenMiddleware(req, res, next) {
        // Skip CSRF validation for GET, HEAD, OPTIONS requests
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            return next();
        }

        // Skip CSRF validation for health check
        if (req.path === '/api/health') {
            return next();
        }

        const cookieToken = req.cookies['csrf-token'];
        const headerToken = req.headers['x-csrf-token'];

        if (!cookieToken) {
            logger.warn(`CSRF validation failed: No CSRF token cookie from IP: ${req.ip}`);
            return res.status(403).json({ error: 'CSRF token missing' });
        }

        if (!headerToken) {
            logger.warn(`CSRF validation failed: No CSRF token header from IP: ${req.ip}`);
            return res.status(403).json({ error: 'CSRF token required in X-CSRF-Token header' });
        }

        // Use timing-safe comparison to prevent timing attacks
        if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
            logger.warn(`CSRF validation failed: Token mismatch from IP: ${req.ip}`);
            return res.status(403).json({ error: 'Invalid CSRF token' });
        }

        next();
    }
}

module.exports = CSRFProtection;
