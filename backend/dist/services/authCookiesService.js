"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCsrfToken = void 0;
exports.setAuthCookies = setAuthCookies;
exports.clearAuthCookies = clearAuthCookies;
const crypto_1 = __importDefault(require("crypto"));
const isProduction = process.env.NODE_ENV === 'production';
const authCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
};
const generateCsrfToken = () => crypto_1.default.randomBytes(32).toString('hex');
exports.generateCsrfToken = generateCsrfToken;
function setAuthCookies(res, jwtToken) {
    const csrfToken = (0, exports.generateCsrfToken)();
    res.cookie('token', jwtToken, authCookieOptions);
    res.cookie('csrfToken', csrfToken, {
        httpOnly: false, // readable by frontend to echo in header
        secure: isProduction,
        sameSite: 'lax',
        maxAge: authCookieOptions.maxAge
    });
    return csrfToken;
}
function clearAuthCookies(res) {
    res.clearCookie('token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax'
    });
    res.clearCookie('csrfToken', {
        httpOnly: false,
        secure: isProduction,
        sameSite: 'lax'
    });
}
