const JWTService = require('../services/jwtService');

const authenticateToken = (req, res, next) => {
    // Only accept tokens from HttpOnly cookies
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = JWTService.verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

module.exports = {
    authenticateToken,
};
