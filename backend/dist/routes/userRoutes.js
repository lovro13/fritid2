"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_validator_1 = require("express-validator");
const User_1 = __importDefault(require("../models/User"));
const auth_1 = __importDefault(require("../middleware/auth"));
const adminAuth_1 = __importDefault(require("../middleware/adminAuth"));
const logger_1 = __importDefault(require("../logger"));
const router = express_1.default.Router();
const emailCheckLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: 'Preveč zahtevkov za preverjanje e-pošte, poskusite znova kasneje.',
    standardHeaders: true,
    legacyHeaders: false,
});
router.get('/', adminAuth_1.default, async (_req, res) => {
    try {
        const users = await User_1.default.findAll();
        res.json(users.map((user) => user.toJSON()));
    }
    catch (error) {
        logger_1.default.error('Error fetching users:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju uporabnikov' });
    }
});
router.get('/:id', auth_1.default, async (req, res) => {
    try {
        if (req.params.id !== String(req.user?.id) && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Dostop zavrnjen' });
        }
        const user = await User_1.default.findById(Number(req.params.id));
        if (!user) {
            return res.status(404).json({ error: 'Uporabnik ni bil najden' });
        }
        res.json(user.toJSON());
    }
    catch (error) {
        logger_1.default.error('Error fetching user by ID:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju uporabnika' });
    }
});
router.get('/email/:email', adminAuth_1.default, async (req, res) => {
    try {
        const user = await User_1.default.findByEmail(req.params.email);
        if (!user) {
            return res.status(404).json({ error: 'Uporabnik ni bil najden' });
        }
        res.json(user.toJSON());
    }
    catch (error) {
        logger_1.default.error('Error fetching user by email:', error);
        res.status(500).json({ error: 'Napaka pri pridobivanju uporabnika' });
    }
});
router.get('/exists/email/:email', emailCheckLimiter, [
    (0, express_validator_1.param)('email').isEmail().withMessage('Vnesite veljaven e-poštni naslov')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const email = req.params.email;
        const [exists, validDomain] = await Promise.all([
            User_1.default.emailExists(email),
            User_1.default.validateEmailDomain(email)
        ]);
        res.json({ exists, validDomain });
    }
    catch (error) {
        logger_1.default.error('Error checking email:', error);
        res.status(500).json({ error: 'Napaka pri preverjanju e-poštnega naslova' });
    }
});
router.post('/', (_req, res) => {
    res.status(403).json({ error: 'Neposredno ustvarjanje uporabnikov ni dovoljeno. Prosimo, uporabite /api/auth/register' });
});
router.put('/:id', auth_1.default, [
    (0, express_validator_1.body)('firstName').optional().trim().isLength({ min: 1, max: 50 }).escape().withMessage('First name must be 1-50 characters'),
    (0, express_validator_1.body)('lastName').optional().trim().isLength({ min: 1, max: 50 }).escape().withMessage('Last name must be 1-50 characters'),
    (0, express_validator_1.body)('email').optional().isEmail().trim().toLowerCase().withMessage('Valid email is required')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        if (req.params.id !== String(req.user?.id) && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Dostop zavrnjen' });
        }
        const user = await User_1.default.findById(Number(req.params.id));
        if (!user) {
            return res.status(404).json({ error: 'Uporabnik ni bil najden' });
        }
        if (req.body.email && req.body.email !== user.email) {
            const emailExists = await User_1.default.emailExists(req.body.email);
            if (emailExists) {
                return res.status(409).json({ error: 'E-poštni naslov že obstaja' });
            }
        }
        const { firstName, lastName, email } = req.body;
        if (firstName !== undefined)
            user.firstName = firstName;
        if (lastName !== undefined)
            user.lastName = lastName;
        if (email !== undefined)
            user.email = email;
        await user.save();
        res.json(user.toJSON());
    }
    catch (error) {
        logger_1.default.error('Error updating user:', error);
        res.status(500).json({ error: 'Napaka pri posodabljanju uporabnika' });
    }
});
router.put('/:id/profile', auth_1.default, [
    (0, express_validator_1.body)('address').optional().trim().isLength({ min: 5, max: 100 }).escape().withMessage('Address must be 5-100 characters'),
    (0, express_validator_1.body)('postalCode').optional().trim().matches(/^[1-9]\d{3}$/).withMessage('Valid postal code is required (4 digits, 1000-9999)'),
    (0, express_validator_1.body)('city').optional().trim().isLength({ min: 2, max: 50 }).escape().withMessage('City must be 2-50 characters'),
    (0, express_validator_1.body)('phoneNumber').optional().trim().custom((value) => {
        if (!value)
            return true;
        const cleaned = value.replace(/\s/g, '');
        if (!/^0\d{8}$/.test(cleaned)) {
            throw new Error('Phone number must contain 9 digits and start with 0');
        }
        return true;
    })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        if (req.params.id !== String(req.user?.id) && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Dostop zavrnjen' });
        }
        const user = await User_1.default.findById(Number(req.params.id));
        if (!user) {
            return res.status(404).json({ error: 'Uporabnik ni bil najden' });
        }
        const { address, postalCode, city, phoneNumber } = req.body;
        if (address !== undefined)
            user.address = address;
        if (postalCode !== undefined)
            user.postalCode = postalCode;
        if (city !== undefined)
            user.city = city;
        if (phoneNumber !== undefined)
            user.phoneNumber = phoneNumber;
        await user.save();
        res.json(user.toJSON());
    }
    catch (error) {
        logger_1.default.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Napaka pri posodabljanju profila' });
    }
});
router.delete('/:id', auth_1.default, async (req, res) => {
    try {
        if (req.params.id !== String(req.user?.id) && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Dostop zavrnjen' });
        }
        const deleted = await User_1.default.delete(Number(req.params.id));
        if (!deleted) {
            return res.status(404).json({ error: 'Uporabnik ni bil najden' });
        }
        res.status(204).send();
    }
    catch (error) {
        logger_1.default.error('Error deleting user:', error);
        res.status(500).json({ error: 'Napaka pri brisanju uporabnika' });
    }
});
exports.default = router;
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = router;
