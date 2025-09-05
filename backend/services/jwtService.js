const jwt = require('jsonwebtoken');
const logger = require('../logger');

/**
 * JWT Utility Service
 * Centralized JWT token creation and verification
 */
class JWTService {
    /**
     * Generate a JWT token for a user
     * @param {Object} user - User object containing id, email, role
     * @param {string} expiresIn - Token expiration time (default: 24h)
     * @returns {string} JWT token
     */
    static generateToken(user, expiresIn = null) {
        try {
            const payload = {
                id: user.id,
                email: user.email,
                role: user.role,
                iat: Math.floor(Date.now() / 1000) // Issued at
            };

            const options = {
                expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '24h',
                issuer: 'fritid-app',
                audience: 'fritid-users'
            };

            return jwt.sign(payload, process.env.JWT_SECRET, options);
        } catch (error) {
            logger.error('Error generating JWT token:', error);
            throw new Error('Token generation failed');
        }
    }

    /**
     * Verify and decode a JWT token
     * @param {string} token - JWT token to verify
     * @returns {Object} Decoded token payload
     */
    static verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET, {
                issuer: 'fritid-app',
                audience: 'fritid-users'
            });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token has expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            } else {
                logger.error('Error verifying JWT token:', error);
                throw new Error('Token verification failed');
            }
        }
    }

    /**
     * Generate a refresh token (longer expiration)
     * @param {Object} user - User object
     * @returns {string} Refresh token
     */
    static generateRefreshToken(user) {
        return this.generateToken(user, process.env.JWT_REFRESH_EXPIRES_IN || '7d');
    }

    /**
     * Decode token without verification (for debugging)
     * @param {string} token - JWT token
     * @returns {Object} Decoded payload
     */
    static decodeToken(token) {
        return jwt.decode(token);
    }

    /**
     * Check if token is expired without verification
     * @param {string} token - JWT token
     * @returns {boolean} True if expired
     */
    static isTokenExpired(token) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) return true;
            
            const currentTime = Math.floor(Date.now() / 1000);
            return decoded.exp < currentTime;
        } catch (error) {
            return true;
        }
    }
}

module.exports = JWTService;
