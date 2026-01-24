const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const logger = require('../logger');

const router = express.Router();

// Get all users
router.get('/', adminAuth, async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users.map(user => user.toJSON()));
    } catch (error) {
        logger.error('Error fetching users:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju uporabnikov' });
    }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        // Check ownership: users can only view their own profile, admins can view all
        if (req.params.id !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Dostop zavrnjen' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Uporabnik ni bil najden' });
        }
        res.json(user.toJSON());
    } catch (error) {
        logger.error('Error fetching user by ID:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju uporabnika' });
    }
});

// Get user by email
router.get('/email/:email', adminAuth, async (req, res) => {
    try {
        const user = await User.findByEmail(req.params.email);
        if (!user) {
            return res.status(404).json({ error: 'Uporabnik ni bil najden' });
        }
        res.json(user.toJSON());
    } catch (error) {
        logger.error('Error fetching user by email:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju uporabnika' });
    }
});

// Check if email exists and validate domain
router.get('/exists/email/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const [exists, validDomain] = await Promise.all([
            User.emailExists(email),
            User.validateEmailDomain(email)
        ]);
        res.json({ exists, validDomain });
    } catch (error) {
        logger.error('Error checking email:', error);
        res.status(500).json({ error: 'Napaka pri preverjanju e-poštnega naslova' });
    }
});

// Create user - Disabled, use /api/auth/register instead
router.post('/', (req, res) => {
    res.status(403).json({ error: 'Neposredno ustvarjanje uporabnikov ni dovoljeno. Prosimo, uporabite /api/auth/register' });
});

// Update user
router.put('/:id', authenticateToken, [
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }).escape().withMessage('First name must be 1-50 characters'),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }).escape().withMessage('Last name must be 1-50 characters'),
    body('email').optional().isEmail().trim().toLowerCase().withMessage('Valid email is required')
], async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('User update validation failed', { errors: errors.array(), userId: req.params.id });
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Check ownership: users can only update their own profile, admins can update all
        if (req.params.id !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Dostop zavrnjen' });
        }
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Uporabnik ni bil najden' });
        }

        // Check if email is being changed and if it already exists
        if (req.body.email && req.body.email !== user.email) {
            const emailExists = await User.emailExists(req.body.email);
            if (emailExists) {
                return res.status(409).json({ error: 'E-poštni naslov že obstaja' });
            }
        }

        // Update user properties
        const { firstName, lastName, email } = req.body;
        if (firstName !== undefined) user.firstName = firstName;
        if (lastName !== undefined) user.lastName = lastName;
        if (email !== undefined) user.email = email;

        await user.save();
        res.json(user.toJSON());
    } catch (error) {
        logger.error('Error updating user:', error);
        res.status(500).json({ error: 'Napaka pri posodabljanju uporabnika' });
    }
});

// Update user profile
router.put('/:id/profile', authenticateToken, [
    body('address').optional().trim().isLength({ min: 5, max: 100 }).escape().withMessage('Address must be 5-100 characters'),
    body('postalCode').optional().trim().matches(/^[1-9]\d{3}$/).withMessage('Valid postal code is required (4 digits, 1000-9999)'),
    body('city').optional().trim().isLength({ min: 2, max: 50 }).escape().withMessage('City must be 2-50 characters'),
    body('phoneNumber').optional().trim().custom((value) => {
        if (!value) return true;
        const cleaned = value.replace(/\s/g, '');
        if (!/^0\d{8}$/.test(cleaned)) {
            throw new Error('Phone number must contain 9 digits and start with 0');
        }
        return true;
    })
], async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('User profile update validation failed', { errors: errors.array(), userId: req.params.id });
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Check ownership: users can only update their own profile, admins can update all
        if (req.params.id !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Dostop zavrnjen' });
        }
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Uporabnik ni bil najden' });
        }

        // Update profile fields
        const { address, postalCode, city, phoneNumber } = req.body;
        if (address !== undefined) user.address = address;
        if (postalCode !== undefined) user.postalCode = postalCode;
        if (city !== undefined) user.city = city;
        if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

        await user.save();
        res.json(user.toJSON());
    } catch (error) {
        logger.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Napaka pri posodabljanju profila' });
    }
});

// Delete user
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        // Check ownership: users can only delete their own profile, admins can delete all
        if (req.params.id !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Dostop zavrnjen' });
        }
        const deleted = await User.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Uporabnik ni bil najden' });
        }
        res.status(204).send();
    } catch (error) {
        logger.error('Error deleting user:', error);
        res.status(500).json({ error: 'Napaka pri brisanju uporabnika' });
    }
});

module.exports = router;
