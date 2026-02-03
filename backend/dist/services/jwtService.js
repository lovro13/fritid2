"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../logger"));
class JWTService {
    static generateToken(user, expiresIn) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
        };
        const expires = (expiresIn ?? process.env.JWT_EXPIRES_IN ?? '24h');
        const options = {
            expiresIn: expires,
            issuer: 'fritid-app',
            audience: 'fritid-users'
        };
        try {
            return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, options);
        }
        catch (error) {
            logger_1.default.error('Error generating JWT token:', error);
            throw new Error('Token generation failed');
        }
    }
    static verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, {
                issuer: 'fritid-app',
                audience: 'fritid-users'
            });
        }
        catch (error) {
            if (error?.name === 'TokenExpiredError') {
                throw new Error('Token has expired');
            }
            if (error?.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            }
            logger_1.default.error('Error verifying JWT token:', error);
            throw new Error('Token verification failed');
        }
    }
    static generateRefreshToken(user) {
        return this.generateToken(user, process.env.JWT_REFRESH_EXPIRES_IN || '7d');
    }
    static decodeToken(token) {
        return jsonwebtoken_1.default.decode(token);
    }
    static isTokenExpired(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (!decoded || typeof decoded !== 'object' || !decoded.exp)
                return true;
            const currentTime = Math.floor(Date.now() / 1000);
            return decoded.exp < currentTime;
        }
        catch (_error) {
            return true;
        }
    }
}
exports.default = JWTService;
// CommonJS compatibility for existing require() usage
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = JWTService;
