const express = require('express');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Get all users
router.get('/', adminAuth, async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users.map(user => user.toJSON()));
    } catch (error) {
        console.error('Error fetching users:', error);
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
        console.error('Error fetching user:', error);
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
        console.error('Error fetching user:', error);
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
        console.error('Error checking email:', error);
        res.status(500).json({ error: 'Napaka pri preverjanju e-poštnega naslova' });
    }
});

// Create user - Disabled, use /api/auth/register instead
router.post('/', (req, res) => {
    res.status(403).json({ error: 'Neposredno ustvarjanje uporabnikov ni dovoljeno. Prosimo, uporabite /api/auth/register' });
});

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        // Check ownership: users can only update their own profile, admins can update all
        if (req.params.id !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Dostop zavrnjen' });
        }
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Uporabnik ni bil najden' });
        }

        // Update user properties
        const { firstName, lastName, email } = req.body;
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (email) user.email = email;

        await user.save();
        res.json(user.toJSON());
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Napaka pri posodabljanju uporabnika' });
    }
});

// Update user profile
router.put('/:id/profile', authenticateToken, async (req, res) => {
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
        console.error('Error updating user profile:', error);
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
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Napaka pri brisanju uporabnika' });
    }
});

module.exports = router;
