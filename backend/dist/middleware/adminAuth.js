"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuth = void 0;
const jwtService_1 = __importDefault(require("../services/jwtService"));
const User_1 = __importDefault(require("../models/User"));
const logger_1 = __importDefault(require("../logger"));
const adminAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            logger_1.default.warn('adminAuth: No token provided in cookies');
            res.status(401).json({ error: 'Access denied. No token provided.' });
            return;
        }
        const decoded = jwtService_1.default.verifyToken(token);
        const user = await User_1.default.findById(decoded.id);
        if (!user) {
            logger_1.default.warn(`adminAuth: User not found for ID ${decoded.id}`);
            res.status(401).json({ error: 'Invalid token.' });
            return;
        }
        if (!user.isAdmin()) {
            logger_1.default.warn(`adminAuth: User ${user.email} (ID: ${user.id}) is not admin. Role: ${user.role}`);
            res.status(403).json({ error: 'Access denied. Admin privileges required.' });
            return;
        }
        req.user = { id: user.id, email: user.email, role: user.role };
        next();
    }
    catch (error) {
        logger_1.default.error('adminAuth: Token verification failed:', error?.message || error);
        res.status(401).json({ error: 'Invalid token.' });
    }
};
exports.adminAuth = adminAuth;
exports.default = adminAuth;
// CommonJS compatibility for existing require() usage
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = adminAuth;
