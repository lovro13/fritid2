"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jwtService_1 = __importDefault(require("../services/jwtService"));
const authenticateToken = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
    }
    try {
        const decoded = jwtService_1.default.verifyToken(token);
        req.user = decoded;
        next();
    }
    catch (_error) {
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};
exports.authenticateToken = authenticateToken;
exports.default = exports.authenticateToken;
