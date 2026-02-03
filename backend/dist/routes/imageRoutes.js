"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const adminAuth_1 = __importDefault(require("../middleware/adminAuth"));
const logger_1 = __importDefault(require("../logger"));
const router = express_1.default.Router();
const routesDir = path_1.default.resolve(__dirname, '..');
const backendDir = path_1.default.basename(routesDir) === 'dist' ? path_1.default.resolve(routesDir, '..') : routesDir;
const uploadsDir = path_1.default.resolve(backendDir, 'uploads/images/products');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
const ALLOWED_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
};
const MAGIC_NUMBERS = {
    '.jpg': ['ffd8ff', 'ffd8'],
    '.jpeg': ['ffd8ff', 'ffd8'],
    '.png': ['89504e47'],
};
const validateMagicNumbers = (buffer, extension) => {
    if (!buffer || buffer.length < 4)
        return false;
    const ext = extension.toLowerCase();
    const magicNumbers = MAGIC_NUMBERS[ext];
    if (!magicNumbers)
        return false;
    const firstBytes = buffer.toString('hex', 0, Math.min(4, buffer.length));
    for (const magic of magicNumbers) {
        if (firstBytes.startsWith(magic.toLowerCase())) {
            if (ext === '.webp' && buffer.length >= 12) {
                const webpCheck = buffer.toString('ascii', 8, 12);
                return webpCheck === 'WEBP';
            }
            return true;
        }
    }
    return false;
};
const memoryStorage = multer_1.default.memoryStorage();
const fileFilter = (_req, file, cb) => {
    const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
    const allowedExtensions = ALLOWED_TYPES[file.mimetype];
    if (!allowedExtensions || !allowedExtensions.includes(fileExtension)) {
        return cb(new Error('Invalid file type or extension! Only JPG, PNG are allowed.'), false);
    }
    cb(null, true);
};
const upload = (0, multer_1.default)({
    storage: memoryStorage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});
router.post('/upload', adminAuth_1.default, upload.single('file'), (req, res) => {
    let savedFilePath = null;
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }
        const extension = path_1.default.extname(req.file.originalname).toLowerCase();
        const isValid = validateMagicNumbers(req.file.buffer, extension);
        if (!isValid) {
            logger_1.default.warn('File upload rejected: Invalid magic numbers', {
                extension,
                mimetype: req.file.mimetype,
                ip: req.ip
            });
            return res.status(400).json({
                success: false,
                message: 'Invalid file content. Magic bytes do not match file type.'
            });
        }
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const filename = 'product-' + uniqueSuffix + extension;
        savedFilePath = path_1.default.join(uploadsDir, filename);
        fs_1.default.writeFileSync(savedFilePath, req.file.buffer);
        const imageUrl = `/images/${filename}`;
        res.json({
            success: true,
            message: 'Image uploaded successfully',
            imageUrl,
            filename
        });
    }
    catch (error) {
        logger_1.default.error('Upload error:', error);
        if (savedFilePath && fs_1.default.existsSync(savedFilePath)) {
            try {
                fs_1.default.unlinkSync(savedFilePath);
            }
            catch (unlinkError) {
                logger_1.default.error('Failed to delete uploaded file:', unlinkError);
            }
        }
        const isProduction = process.env.NODE_ENV === 'production';
        res.status(500).json({
            success: false,
            message: 'Error uploading image',
            ...(isProduction ? {} : { error: error.message })
        });
    }
});
router.delete('/delete/:filename', adminAuth_1.default, (req, res) => {
    try {
        const filename = path_1.default.basename(req.params.filename);
        if (!/^product-\d+-\d+\.\w+$/.test(filename)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid filename format'
            });
        }
        const filePath = path_1.default.join(uploadsDir, filename);
        const resolvedPath = path_1.default.resolve(filePath);
        const resolvedUploadsDir = path_1.default.resolve(uploadsDir);
        if (!resolvedPath.startsWith(resolvedUploadsDir)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            res.json({
                success: true,
                message: 'Image deleted successfully'
            });
        }
        else {
            res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }
    }
    catch (error) {
        logger_1.default.error('Delete error:', error);
        const isProduction = process.env.NODE_ENV === 'production';
        res.status(500).json({
            success: false,
            message: 'Error deleting image',
            ...(isProduction ? {} : { error: error.message })
        });
    }
});
router.use((error, _req, res, _next) => {
    if (error instanceof multer_1.default.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB'
            });
        }
    }
    if (error.message === 'Invalid file type or extension! Only JPG, PNG are allowed.') {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    res.status(500).json({
        success: false,
        message: 'Upload error',
        error: error.message
    });
});
exports.default = router;
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
module.exports = router;
