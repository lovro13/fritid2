import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult, param } from 'express-validator';
import User from '../models/User';
import authenticateToken from '../middleware/auth';
import adminAuth from '../middleware/adminAuth';
import logger from '../logger';

const router = express.Router();
const emailCheckLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Preveč zahtevkov za preverjanje e-pošte, poskusite znova kasneje.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', adminAuth, async (_req: Request, res: Response) => {
  try {
    const users = await User.findAll();
    res.json(users.map((user) => user.toJSON()));
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju uporabnikov' });
  }
});

router.get('/:id', authenticateToken, async (req: Request<{ id: string }>, res: Response) => {
  try {
    if (req.params.id !== String(req.user?.id) && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Dostop zavrnjen' });
    }

    const user = await User.findById(Number(req.params.id));
    if (!user) {
      return res.status(404).json({ error: 'Uporabnik ni bil najden' });
    }
    res.json(user.toJSON());
  } catch (error) {
    logger.error('Error fetching user by ID:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju uporabnika' });
  }
});

router.get('/email/:email', adminAuth, async (req: Request<{ email: string }>, res: Response) => {
  try {
    const user = await User.findByEmail(req.params.email);
    if (!user) {
      return res.status(404).json({ error: 'Uporabnik ni bil najden' });
    }
    res.json(user.toJSON());
  } catch (error) {
    logger.error('Error fetching user by email:', error);
    res.status(500).json({ error: 'Napaka pri pridobivanju uporabnika' });
  }
});

router.get('/exists/email/:email', emailCheckLimiter, [
    param('email').isEmail().withMessage('Vnesite veljaven e-poštni naslov')
], async (req: Request<{ email: string }>, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = req.params.email;
    const [exists, validDomain] = await Promise.all([
      User.emailExists(email),
      User.validateEmailDomain(email)
    ]);
    res.json({ exists, validDomain });
  } catch (error) {
    logger.error('Error checking email:', error);
    res.status(500).json({ error: 'Napaka pri preverjanju e-poštnega naslova' });
  }
});

router.post('/', (_req: Request, res: Response) => {
  res.status(403).json({ error: 'Neposredno ustvarjanje uporabnikov ni dovoljeno. Prosimo, uporabite /api/auth/register' });
});

router.put('/:id',
    authenticateToken,
  [
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }).escape().withMessage('First name must be 1-50 characters'),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }).escape().withMessage('Last name must be 1-50 characters'),
    body('email').optional().isEmail().trim().toLowerCase().withMessage('Valid email is required')
  ],
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      if (req.params.id !== String(req.user?.id) && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Dostop zavrnjen' });
      }
      const user = await User.findById(Number(req.params.id));
      if (!user) {
        return res.status(404).json({ error: 'Uporabnik ni bil najden' });
      }

      if (req.body.email && req.body.email !== user.email) {
        const emailExists = await User.emailExists(req.body.email);
        if (emailExists) {
          return res.status(409).json({ error: 'E-poštni naslov že obstaja' });
        }
      }

      const { firstName, lastName, email } = req.body as Record<string, string | undefined>;
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      if (email !== undefined) user.email = email;

      await user.save();
      res.json(user.toJSON());
    } catch (error) {
      logger.error('Error updating user:', error);
      res.status(500).json({ error: 'Napaka pri posodabljanju uporabnika' });
    }
  });

router.put('/:id/profile',
    authenticateToken,
  [
    body('address').optional().trim().isLength({ min: 5, max: 100 }).escape().withMessage('Address must be 5-100 characters'),
    body('postalCode').optional().trim().matches(/^[1-9]\d{3}$/).withMessage('Valid postal code is required (4 digits, 1000-9999)'),
    body('city').optional().trim().isLength({ min: 2, max: 50 }).escape().withMessage('City must be 2-50 characters'),
    body('phoneNumber').optional().trim().custom((value) => {
      if (!value) return true;
      const cleaned = value.replace(/\s/g, '');
      if (!/^0\d{8}$/.test(cleaned)) {
        throw new Error('Phone number must contain 9 digits and start with 0');
      }
      return true;
    })
  ],
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      if (req.params.id !== String(req.user?.id) && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Dostop zavrnjen' });
      }
      const user = await User.findById(Number(req.params.id));
      if (!user) {
        return res.status(404).json({ error: 'Uporabnik ni bil najden' });
      }

      const { address, postalCode, city, phoneNumber } = req.body as Record<string, string | undefined>;
      if (address !== undefined) user.address = address;
      if (postalCode !== undefined) user.postalCode = postalCode;
      if (city !== undefined) user.city = city;
      if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

      await user.save();
      res.json(user.toJSON());
    } catch (error) {
      logger.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Napaka pri posodabljanju profila' });
    }
  });

router.delete('/:id', authenticateToken, async (req: Request<{ id: string }>, res: Response) => {
  try {
    if (req.params.id !== String(req.user?.id) && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Dostop zavrnjen' });
    }
    const deleted = await User.delete(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Uporabnik ni bil najden' });
    }
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ error: 'Napaka pri brisanju uporabnika' });
  }
});

export default router;
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
(module as any).exports = router;
