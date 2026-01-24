const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../logger');
const JWTService = require('../services/jwtService');
const router = express.Router();

// Register
router.post('/register', [
    body('email').isEmail().trim().toLowerCase().withMessage('Vnesite veljaven e-poštni naslov'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Geslo mora imeti vsaj 8 znakov')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Geslo mora vsebovati vsaj eno veliko črko, eno malo črko in eno številko'),
    body('firstName').trim().isLength({ min: 1, max: 50 }).escape().withMessage('Ime je obvezno'),
    body('lastName').trim().isLength({ min: 1, max: 50 }).escape().withMessage('Priimek je obvezen'),
    body('phoneNumber')
        .trim()
        .custom((value) => {
            // Remove all spaces and check if it matches 0 followed by 8 digits
            const cleaned = value.replace(/\s/g, '');
            if (!/^0\d{8}$/.test(cleaned)) {
                throw new Error('Telefonska številka mora vsebovati 9 številk in se začeti z 0 (npr. 051234567 ali 051 234 567)');
            }
            return true;
        }),
    body('address').trim().isLength({ min: 5, max: 100 }).withMessage('Naslov je obvezen (5-100 znakov)'),
    body('postalCode')
        .trim()
        .matches(/^[1-9]\d{3}$/)
        .withMessage('Vnesite veljavno slovensko poštno številko (4 številke, 1000-9999)'),
    body('city').trim().isLength({ min: 2, max: 50 }).escape().withMessage('Kraj je obvezen (2-50 znakov)')
], async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn(`Registration validation failed for email: ${req.body.email || 'unknown'} from IP: ${req.ip}. Errors: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { firstName, lastName, email, password, phoneNumber, address, postalCode, city } = req.body;
        logger.info(`Attempting to register user with email: ${email}, firstName: ${firstName}, lastName: ${lastName}`);
        // Check if user already exists`
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.passwordHash != null) {
            return res.status(409).json({ message: 'Uporabnik s tem e-poštnim naslovom že obstaja' });
        } else if (existingUser && existingUser.passwordHash == null) {
            // User exists but has no password, initialize password and update address info
            await existingUser.initPassword(password);

            // Update address information
            existingUser.firstName = firstName;
            existingUser.lastName = lastName;
            existingUser.phoneNumber = phoneNumber;
            existingUser.address = address;
            existingUser.postalCode = postalCode;
            existingUser.city = city;
            await existingUser.save();

            // Generate JWT token using JWTService
            const token = JWTService.generateToken(existingUser);

            // Set HttpOnly cookie with strict sameSite in production
            const isProduction = process.env.NODE_ENV === 'production';
            res.cookie('token', token, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'strict' : 'lax', // Strict in production for better security
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });

            return res.status(200).json({
                message: 'Geslo je bilo uspešno nastavljeno',
                user: existingUser.toJSON()
            });
        } else {
            // Create new user
            const user = await User.create({ firstName, lastName, email, password, phoneNumber, address, postalCode, city });

            // Generate JWT token using JWTService
            const token = JWTService.generateToken(user);

            // Set HttpOnly cookie with strict sameSite in production
            const isProduction = process.env.NODE_ENV === 'production';
            res.cookie('token', token, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'strict' : 'lax',
                maxAge: 24 * 60 * 60 * 1000
            });

            res.status(201).json({
                message: 'Uporabnik uspešno ustvarjen',
                user: user.toJSON()
            });
        }
    } catch (error) {
        logger.error('Registration error:', error);
        logger.warn(`Failed registration attempt for email: ${req.body.email} from IP: ${req.ip}`);
        res.status(500).json({ error: 'Napaka pri ustvarjanju uporabnika' });
    }
});

// Login
router.post('/login', [
    body('email').isEmail().trim().toLowerCase().withMessage('Vnesite veljaven e-poštni naslov'),
    body('password').notEmpty().withMessage('Geslo je obvezno')
], async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn(`Login validation failed for email: ${req.body.email || 'unknown'} from IP: ${req.ip}. Errors: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;
        // Find user by email
        const user = await User.findByEmail(email);
        if (!user) {
            logger.warn(`Failed login attempt for non-existent email: ${email} from IP: ${req.ip}`);
            return res.status(401).json({ error: 'Neveljavni podatki za prijavo' });
        }

        // Check if user has a password set (prevent login for users without password)
        if (!user.passwordHash) {
            logger.warn(`Login attempt for passwordless account: ${email} from IP: ${req.ip}`);
            return res.status(401).json({ error: 'Račun zahteva nastavitev gesla' });
        }

        // Validate password
        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            logger.warn(`Failed login attempt for email: ${email} from IP: ${req.ip}`);
            return res.status(401).json({ error: 'Neveljavni podatki za prijavo' });
        }

        // Generate JWT token using JWTService
        const token = JWTService.generateToken(user);

        // Set HttpOnly cookie with strict sameSite in production
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });

        logger.info(`Successful login for user: ${user.id} from IP: ${req.ip}`);
        res.json({
            success: true,
            message: 'Prijava uspešna',
            user: user.toJSON()
        });
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Napaka pri prijavi' });
    }
});

// Verify token
router.post('/verify', (req, res) => {
    try {
        // Only accept token from HttpOnly cookie
        const token = req.cookies.token;

        if (!token) {
            logger.warn(`Verify failed: No token provided from IP: ${req.ip}`);
            return res.status(401).json({ valid: false, error: 'Žeton ni predložen' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true, userId: decoded.id, role: decoded.role });
    } catch (error) {
        logger.warn(`Verify failed: Invalid token from IP: ${req.ip}. Error: ${error.message}`);
        res.status(401).json({ valid: false, error: 'Neveljaven žeton' });
    }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Verify token
        const decoded = JWTService.verifyToken(token);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Generate new token (token rotation)
        const newToken = JWTService.generateToken(user);

        // Set new token cookie
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', newToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'strict' : 'lax',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ success: true, message: 'Token refreshed' });
    } catch (error) {
        logger.warn('Token refresh failed:', error.message);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax'
    });
    res.json({ success: true, message: 'Odjava uspešna' });
});

module.exports = router;
