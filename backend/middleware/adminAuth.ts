import { Request, Response, NextFunction } from 'express';
import JWTService from '../services/jwtService';
import User from '../models/User';
import logger from '../logger';

const adminAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.token as string | undefined;

    if (!token) {
      logger.warn('adminAuth: No token provided in cookies');
      res.status(401).json({ error: 'Access denied. No token provided.' });
      return;
    }

    const decoded = JWTService.verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      logger.warn(`adminAuth: User not found for ID ${decoded.id}`);
      res.status(401).json({ error: 'Invalid token.' });
      return;
    }

    if (!user.isAdmin()) {
      logger.warn(`adminAuth: User ${user.email} (ID: ${user.id}) is not admin. Role: ${user.role}`);
      res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      return;
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (error: any) {
    logger.error('adminAuth: Token verification failed:', error?.message || error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

export { adminAuth };
export default adminAuth;
// CommonJS compatibility for existing require() usage
// eslint-disable-next-line @typescript-eslint/no-var-requires
(module as any).exports = adminAuth;
