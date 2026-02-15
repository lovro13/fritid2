import { Request, Response, NextFunction } from 'express';
import JWTService, { JwtPayload } from '../services/jwtService';
import { clearAuthCookies } from '../services/authCookiesService';

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies?.token as string | undefined;

  if (!token) {
    clearAuthCookies(res);
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded: JwtPayload = JWTService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (_error) {
    clearAuthCookies(res);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export default authenticateToken;
