import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import logger from '../logger';
import { generateCsrfToken } from '../services/authCookiesService';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const AUTH_WHITELIST = new Set(['/api/auth/login', '/api/auth/register', '/api/auth/verify']);
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Double-submit cookie CSRF protection.
 * - Issues a csrfToken cookie (and response header) on safe requests when missing
 * - For unsafe methods, requires matching cookie and X-CSRF-Token header using timing-safe comparison
 */
function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    if (!req.cookies?.csrfToken) {
      const token = generateCsrfToken();
      res.cookie('csrfToken', token, {
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        domain: isProduction ? '.fritid.si' : undefined,
        maxAge: 24 * 60 * 60 * 1000
      });
      res.setHeader('X-CSRF-Token', token);
    }
    next();
    return;
  }

  if (AUTH_WHITELIST.has(req.path) || req.path === '/api/health') {
    next();
    return;
  }

  const csrfCookie = req.cookies?.csrfToken as string | undefined;
  const csrfHeader = req.get('x-csrf-token') as string | undefined;

  if (!csrfCookie) {
    logger.warn(`CSRF validation failed: No csrfToken cookie from IP ${req.ip}`);
    res.status(403).json({ error: 'CSRF token missing' });
    return;
  }

  if (!csrfHeader) {
    logger.warn(`CSRF validation failed: No X-CSRF-Token header from IP ${req.ip}`);
    res.status(403).json({ error: 'CSRF token required in X-CSRF-Token header' });
    return;
  }

  try {
    const cookieBuf = Buffer.from(csrfCookie);
    const headerBuf = Buffer.from(csrfHeader);

    if (cookieBuf.length !== headerBuf.length) {
      throw new Error('length-mismatch');
    }

    if (!crypto.timingSafeEqual(cookieBuf, headerBuf)) {
      throw new Error('mismatch');
    }
  } catch (err: any) {
    logger.warn(`CSRF validation failed: Token mismatch from IP ${req.ip}`, { error: err?.message });
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  next();
}

export default csrfProtection;
