import jwt, { JwtPayload as JwtPayloadBase, SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import logger from '../logger';

export interface JwtPayload extends JwtPayloadBase {
  id: number;
  email: string;
  role: string;
  exp?: number;
}

export interface JwtUserInput {
  id: number;
  email: string;
  role: string;
}

class JWTService {
  static generateToken(user: JwtUserInput, expiresIn?: string | null): string {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const expires: StringValue | number = (expiresIn ?? process.env.JWT_EXPIRES_IN ?? '24h') as StringValue | number;

    const options: SignOptions = {
      expiresIn: expires,
      issuer: 'fritid-app',
      audience: 'fritid-users'
    };

    try {
      return jwt.sign(payload, process.env.JWT_SECRET as string, options);
    } catch (error) {
      logger.error('Error generating JWT token:', error);
      throw new Error('Token generation failed');
    }
  }

  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, process.env.JWT_SECRET as string, {
        issuer: 'fritid-app',
        audience: 'fritid-users'
      }) as JwtPayload;
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error?.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      logger.error('Error verifying JWT token:', error);
      throw new Error('Token verification failed');
    }
  }

  static generateRefreshToken(user: JwtUserInput): string {
    return this.generateToken(user, process.env.JWT_REFRESH_EXPIRES_IN || '7d');
  }

  static decodeToken(token: string): null | JwtPayload | string {
    return jwt.decode(token) as JwtPayload | string | null;
  }

  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as JwtPayload | null;
      if (!decoded || typeof decoded !== 'object' || !decoded.exp) return true;

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (_error) {
      return true;
    }
  }
}

export default JWTService;
// CommonJS compatibility for existing require() usage
// eslint-disable-next-line @typescript-eslint/no-var-requires
(module as any).exports = JWTService;
