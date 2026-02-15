"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const User_1 = __importDefault(require("../models/User"));
const logger_1 = __importDefault(require("../logger"));
const jwtService_1 = __importDefault(require("../services/jwtService"));
const authCookiesService_1 = require("../services/authCookiesService");
const router = express_1.default.Router();
// Register
router.post('/register', [
    (0, express_validator_1.body)('email').isEmail().trim().toLowerCase().withMessage('Vnesite veljaven e-poštni naslov'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('Geslo mora imeti vsaj 8 znakov')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Geslo mora vsebovati vsaj eno veliko črko, eno malo črko in eno številko'),
    (0, express_validator_1.body)('firstName').trim().isLength({ min: 1, max: 50 }).escape().withMessage('Ime je obvezno'),
    (0, express_validator_1.body)('lastName').trim().isLength({ min: 1, max: 50 }).escape().withMessage('Priimek je obvezen'),
    (0, express_validator_1.body)('phoneNumber')
        .trim()
        .custom((value) => {
        const cleaned = value.replace(/\s/g, '');
        if (!/^0\d{8}$/.test(cleaned)) {
            throw new Error('Telefonska številka mora vsebovati 9 številk in se začeti z 0 (npr. 051234567 ali 051 234 567)');
        }
        return true;
    }),
    (0, express_validator_1.body)('address').trim().isLength({ min: 5, max: 100 }).withMessage('Naslov je obvezen (5-100 znakov)'),
    (0, express_validator_1.body)('postalCode')
        .trim()
        .matches(/^[1-9]\d{3}$/)
        .withMessage('Vnesite veljavno slovensko poštno številko (4 številke, 1000-9999)'),
    (0, express_validator_1.body)('city').trim().isLength({ min: 2, max: 50 }).escape().withMessage('Kraj je obvezen (2-50 znakov)')
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        logger_1.default.warn('Registration validation failed', { ip: req.ip });
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { firstName, lastName, email, password, phoneNumber, address, postalCode, city } = req.body;
        logger_1.default.info('Attempting to register user');
        const existingUser = await User_1.default.findByEmail(email);
        if (existingUser && existingUser.passwordHash != null) {
            return res.status(409).json({ message: 'Uporabnik s tem e-poštnim naslovom že obstaja' });
        }
        if (existingUser && existingUser.passwordHash == null) {
            logger_1.default.warn(`Registration blocked for existing guest account: ${email} from IP: ${req.ip}`);
            return res.status(409).json({
                message: 'Račun s tem e‑poštnim naslovom že obstaja kot gost. Prosimo, prijavite se ali uporabite postopek potrditve e‑pošte.'
            });
        }
        const user = await User_1.default.create({ firstName, lastName, email, password, phoneNumber, address, postalCode, city });
        const token = jwtService_1.default.generateToken({ id: user.id, email: user.email, role: user.role });
        (0, authCookiesService_1.setAuthCookies)(res, token);
        res.status(201).json({
            message: 'Uporabnik uspešno ustvarjen',
            user: user.toJSON()
        });
    }
    catch (error) {
        logger_1.default.error('Registration error:', error);
        logger_1.default.warn(`Failed registration attempt for email: ${req.body.email} from IP: ${req.ip}`);
        res.status(500).json({ error: 'Napaka pri ustvarjanju uporabnika' });
    }
});
// Login
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().trim().toLowerCase().withMessage('Vnesite veljaven e-poštni naslov'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Geslo je obvezno')
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        logger_1.default.warn('Login validation failed', { ip: req.ip });
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { email, password } = req.body;
        const user = await User_1.default.findByEmail(email);
        if (!user) {
            logger_1.default.warn('Failed login attempt for non-existent account', { ip: req.ip });
            return res.status(401).json({ error: 'Neveljavni podatki za prijavo' });
        }
        if (!user.passwordHash) {
            logger_1.default.warn('Login attempt for passwordless account', { ip: req.ip });
            return res.status(401).json({ error: 'Račun zahteva nastavitev gesla' });
        }
        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            logger_1.default.warn('Failed login attempt (invalid password)', { ip: req.ip, userId: user.id });
            return res.status(401).json({ error: 'Neveljavni podatki za prijavo' });
        }
        const token = jwtService_1.default.generateToken({ id: user.id, email: user.email, role: user.role });
        (0, authCookiesService_1.setAuthCookies)(res, token);
        logger_1.default.info('Successful login', { userId: user.id, ip: req.ip });
        res.json({
            success: true,
            message: 'Prijava uspešna',
            user: user.toJSON()
        });
    }
    catch (error) {
        logger_1.default.error('Login error:', error);
        res.status(500).json({ error: 'Napaka pri prijavi' });
    }
});
// Verify token
router.post('/verify', (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            logger_1.default.warn('Verify failed: No token provided', { ip: req.ip });
            (0, authCookiesService_1.clearAuthCookies)(res);
            return res.status(401).json({ valid: false, error: 'Žeton ni predložen' });
        }
        const decoded = jwtService_1.default.verifyToken(token);
        res.json({ valid: true, userId: decoded.id, role: decoded.role });
    }
    catch (error) {
        logger_1.default.warn('Verify failed: Invalid token', { ip: req.ip });
        (0, authCookiesService_1.clearAuthCookies)(res);
        res.status(401).json({ valid: false, error: 'Neveljaven žeton' });
    }
});
// Refresh token endpoint
router.post('/refresh', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            (0, authCookiesService_1.clearAuthCookies)(res);
            return res.status(401).json({ error: 'No token provided' });
        }
        const decoded = jwtService_1.default.verifyToken(token);
        const user = await User_1.default.findById(decoded.id);
        if (!user) {
            (0, authCookiesService_1.clearAuthCookies)(res);
            return res.status(401).json({ error: 'User not found' });
        }
        const newToken = jwtService_1.default.generateToken({ id: user.id, email: user.email, role: user.role });
        (0, authCookiesService_1.setAuthCookies)(res, newToken);
        res.json({ success: true, message: 'Token refreshed' });
    }
    catch (error) {
        logger_1.default.warn('Token refresh failed:', error?.message);
        (0, authCookiesService_1.clearAuthCookies)(res);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});
// Logout
router.post('/logout', (_req, res) => {
    (0, authCookiesService_1.clearAuthCookies)(res);
    res.json({ success: true, message: 'Odjava uspešna' });
});
exports.default = router;
