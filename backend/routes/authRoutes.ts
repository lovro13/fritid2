import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import logger from '../logger';
import JWTService from '../services/jwtService';
import { setAuthCookies, clearAuthCookies } from '../services/authCookiesService';

const router = express.Router();

// Register
router.post(
  '/register',
  [
    body('email').isEmail().trim().toLowerCase().withMessage('Vnesite veljaven e-poštni naslov'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Geslo mora imeti vsaj 8 znakov')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Geslo mora vsebovati vsaj eno veliko črko, eno malo črko in eno številko'),
    body('firstName').trim().isLength({ min: 1, max: 50 }).escape().withMessage('Ime je obvezno'),
    body('lastName').trim().isLength({ min: 1, max: 50 }).escape().withMessage('Priimek je obvezen'),
    body('phoneNumber')
      .trim()
      .custom((value) => {
        const cleaned = value.replace(/\s/g, '');
        if (!/^0\d{8}$/.test(cleaned)) {
          throw new Error('Telefonska številka mora vsebovati 9 številk in se začeti z 0 (npr. 051234567 ali 051 234 567)');
        }
        return true;
      }),
    body('address').trim().isLength({ min: 5, max: 100 }).withMessage('Naslov je obvezen (5-100 znakov)'),
    body('postalCode')
      .trim()
      .matches(/^[1-9]\d{3}$/)
      .withMessage('Vnesite veljavno slovensko poštno številko (4 številke, 1000-9999)'),
    body('city').trim().isLength({ min: 2, max: 50 }).escape().withMessage('Kraj je obvezen (2-50 znakov)')
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Registration validation failed', { ip: req.ip });
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { firstName, lastName, email, password, phoneNumber, address, postalCode, city } = req.body;
      logger.info('Attempting to register user');
      const existingUser = await User.findByEmail(email);
      if (existingUser && existingUser.passwordHash != null) {
        return res.status(409).json({ message: 'Uporabnik s tem e-poštnim naslovom že obstaja' });
      }
      if (existingUser && existingUser.passwordHash == null) {
        logger.warn(`Registration blocked for existing guest account: ${email} from IP: ${req.ip}`);
        return res.status(409).json({
          message: 'Račun s tem e‑poštnim naslovom že obstaja kot gost. Prosimo, prijavite se ali uporabite postopek potrditve e‑pošte.'
        });
      }

      const user = await User.create({ firstName, lastName, email, password, phoneNumber, address, postalCode, city });
      const token = JWTService.generateToken({ id: user.id, email: user.email, role: user.role });

      setAuthCookies(res, token);

      res.status(201).json({
        message: 'Uporabnik uspešno ustvarjen',
        user: user.toJSON()
      });
    } catch (error) {
      logger.error('Registration error:', error);
      logger.warn(`Failed registration attempt for email: ${req.body.email} from IP: ${req.ip}`);
      res.status(500).json({ error: 'Napaka pri ustvarjanju uporabnika' });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().trim().toLowerCase().withMessage('Vnesite veljaven e-poštni naslov'),
    body('password').notEmpty().withMessage('Geslo je obvezno')
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Login validation failed', { ip: req.ip });
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;
      const user = await User.findByEmail(email);
      if (!user) {
        logger.warn('Failed login attempt for non-existent account', { ip: req.ip });
        return res.status(401).json({ error: 'Neveljavni podatki za prijavo' });
      }

      if (!user.passwordHash) {
        logger.warn('Login attempt for passwordless account', { ip: req.ip });
        return res.status(401).json({ error: 'Račun zahteva nastavitev gesla' });
      }

      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        logger.warn('Failed login attempt (invalid password)', { ip: req.ip, userId: user.id });
        return res.status(401).json({ error: 'Neveljavni podatki za prijavo' });
      }

      const token = JWTService.generateToken({ id: user.id, email: user.email, role: user.role });
      setAuthCookies(res, token);

      logger.info('Successful login', { userId: user.id, ip: req.ip });
      res.json({
        success: true,
        message: 'Prijava uspešna',
        user: user.toJSON()
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Napaka pri prijavi' });
    }
  }
);

// Verify token
router.post('/verify', (req: Request, res: Response) => {
  try {
    const token = req.cookies.token as string | undefined;

    if (!token) {
      logger.warn('Verify failed: No token provided', { ip: req.ip });
      clearAuthCookies(res);
      return res.status(401).json({ valid: false, error: 'Žeton ni predložen' });
    }

    const decoded = JWTService.verifyToken(token);
    res.json({ valid: true, userId: decoded.id, role: decoded.role });
  } catch (error) {
    logger.warn('Verify failed: Invalid token', { ip: req.ip });
    clearAuthCookies(res);
    res.status(401).json({ valid: false, error: 'Neveljaven žeton' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token as string | undefined;
    if (!token) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = JWTService.verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'User not found' });
    }

    const newToken = JWTService.generateToken({ id: user.id, email: user.email, role: user.role });
    setAuthCookies(res, newToken);

    res.json({ success: true, message: 'Token refreshed' });
  } catch (error: any) {
    logger.warn('Token refresh failed:', error?.message);
    clearAuthCookies(res);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Logout
router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookies(res);
  res.json({ success: true, message: 'Odjava uspešna' });
});

export default router;
