const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../logger');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        logger.info(`Attempting to register user with email: ${email}, firstName: ${firstName}, lastName: ${lastName}`);
        // Check if user already exists`
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser.passwordHash != null) {
            return res.status(400).json({ error: 'User with this email already exists' });
        } else if (existingUser && existingUser.passwordHash == null) {
            // User exists but has no password, initialize password
            await existingUser.initPassword(password);
            
            // Generate JWT token
            const token = jwt.sign(
                { id: existingUser.id, email: existingUser.email, role: existingUser.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            return res.status(200).json({
                message: 'Password set successfully',
                user: existingUser.toJSON(),
                token
            });
        } else {
            // Create new user
            const user = await User.create({ firstName, lastName, email, password });
            
            // Generate JWT token
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );
            
            res.status(201).json({
                message: 'User created successfully',
                user: user.toJSON(),
                token
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(email, password)
        // Find user by email
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user has a password set (prevent login for users without password)
        if (!user.passwordHash) {
            return res.status(401).json({ error: 'Account requires password setup' });
        }

        // Validate password
        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            user: user.toJSON(),
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Verify token
router.post('/verify', (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true, userId: decoded.id, role: decoded.role });
    } catch (error) {
        res.status(401).json({ valid: false, error: 'Invalid token' });
    }
});

module.exports = router;
