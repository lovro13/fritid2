import crypto from 'crypto';
import { Response } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' as const : 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
};

export const generateCsrfToken = (): string => crypto.randomBytes(32).toString('hex');

export function setAuthCookies(res: Response, jwtToken: string): string {
  const csrfToken = generateCsrfToken();

  res.cookie('token', jwtToken, authCookieOptions);
  res.cookie('csrfToken', csrfToken, {
    httpOnly: false, // readable by frontend to echo in header
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: authCookieOptions.maxAge
  });

  return csrfToken;
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  });
  res.clearCookie('csrfToken', {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  });
}
