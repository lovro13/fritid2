const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../logger');


// its purpose is to authenticate and authorize admin users for protected routes
// it is used in adminRoutes
const adminAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            logger.warn('adminAuth: No token provided in cookies');
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            logger.warn(`adminAuth: User not found for ID ${decoded.id}`);
            return res.status(401).json({ error: 'Invalid token.' });
        }

        if (!user.isAdmin()) {
            logger.warn(`adminAuth: User ${user.email} (ID: ${user.id}) is not admin. Role: ${user.role}`);
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        req.user = user;
        next();
    } catch (error) {
        logger.error('adminAuth: Token verification failed:', error.message);
        res.status(401).json({ error: 'Invalid token.' });
    }
};

module.exports = adminAuth;
