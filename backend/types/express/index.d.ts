import type { JwtPayload } from '../../services/jwtService';

declare global {
  namespace Express {
    interface UserTokenPayload extends JwtPayload {}
    interface Request {
      user?: UserTokenPayload;
    }
  }
}

export {};
