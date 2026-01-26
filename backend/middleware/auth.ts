import { Request, Response, NextFunction } from 'express';
import JWTService, { JwtPayload } from '../services/jwtService';

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies?.token as string | undefined;

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded: JwtPayload = JWTService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (_error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export default authenticateToken;
