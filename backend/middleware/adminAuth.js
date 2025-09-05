const jwt = require('jsonwebtoken');
const User = require('../models/User');


// its purpose is to authenticate and authorize admin users for protected routes
// it is used in adminRoutes
const adminAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid token.' });
        }

        if (!user.isAdmin()) {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token.' });
    }
};

module.exports = adminAuth;
