const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adminAuth = require('../middleware/adminAuth');
const logger = require('../logger');
const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/images/products');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed file types mapping
const ALLOWED_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp']
};

// Magic keys for valid file types (first bytes)
const MAGIC_NUMBERS = {
    '.jpg': ['ffd8ff', 'ffd8'],
    '.jpeg': ['ffd8ff', 'ffd8'],
    '.png': ['89504e47'],
    '.gif': ['47494638'],
    '.webp': ['52494646'] // RIFF header, need to check further for WEBP
};

// Validate magic numbers from buffer
const validateMagicNumbers = (buffer, extension) => {
    if (!buffer || buffer.length < 4) return false;

    const ext = extension.toLowerCase();
    const magicNumbers = MAGIC_NUMBERS[ext];
    if (!magicNumbers) return false;

    // Check first bytes
    const firstBytes = buffer.toString('hex', 0, Math.min(4, buffer.length));
    
    for (const magic of magicNumbers) {
        if (firstBytes.startsWith(magic.toLowerCase())) {
            // For WebP, need to check further (RIFF....WEBP)
            if (ext === '.webp' && buffer.length >= 12) {
                const webpCheck = buffer.toString('ascii', 8, 12);
                return webpCheck === 'WEBP';
            }
            return true;
        }
    }

    return false;
};

// Use memory storage to validate before saving to disk
const memoryStorage = multer.memoryStorage();

// Strict file filter
const fileFilter = (req, file, cb) => {
    // 1. Initial extension/MIME check (fast fail)
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ALLOWED_TYPES[file.mimetype];

    if (!allowedExtensions || !allowedExtensions.includes(fileExtension)) {
        return cb(new Error('Invalid file type or extension! Only JPG, PNG, GIF, and WebP are allowed.'), false);
    }

    cb(null, true);
};

const upload = multer({
    storage: memoryStorage, // Use memory storage to validate before saving
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Upload image endpoint
router.post('/upload', adminAuth, upload.single('file'), (req, res) => {
    let savedFilePath = null;
    
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Validate magic numbers from buffer (before saving to disk)
        const extension = path.extname(req.file.originalname).toLowerCase();
        const isValid = validateMagicNumbers(req.file.buffer, extension);

        if (!isValid) {
            logger.warn('File upload rejected: Invalid magic numbers', {
                extension,
                mimetype: req.file.mimetype,
                ip: req.ip
            });
            return res.status(400).json({
                success: false,
                message: 'Invalid file content. Magic bytes do not match file type.'
            });
        }

        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'product-' + uniqueSuffix + extension;
        savedFilePath = path.join(uploadsDir, filename);

        // Save file to disk only after validation
        fs.writeFileSync(savedFilePath, req.file.buffer);

        // Create image URL
        const imageUrl = `/images/${filename}`;

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            imageUrl: imageUrl,
            filename: filename
        });
    } catch (error) {
        logger.error('Upload error:', error);
        // Try to clean up if file was saved
        if (savedFilePath && fs.existsSync(savedFilePath)) {
            try {
                fs.unlinkSync(savedFilePath);
            } catch (unlinkError) {
                logger.error('Failed to delete uploaded file:', unlinkError);
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

// Delete image endpoint
router.delete('/delete/:filename', adminAuth, (req, res) => {
    try {
        // Sanitize filename to prevent path traversal
        const filename = path.basename(req.params.filename);

        // Validate filename format (product-timestamp-random.ext)
        if (!/^product-\d+-\d+\.\w+$/.test(filename)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid filename format'
            });
        }

        const filePath = path.join(uploadsDir, filename);

        // Ensure resolved path is within uploads directory (prevent path traversal)
        const resolvedPath = path.resolve(filePath);
        const resolvedUploadsDir = path.resolve(uploadsDir);
        if (!resolvedPath.startsWith(resolvedUploadsDir)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({
                success: true,
                message: 'Image deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }
    } catch (error) {
        logger.error('Delete error:', error);
        const isProduction = process.env.NODE_ENV === 'production';
        res.status(500).json({
            success: false,
            message: 'Error deleting image',
            ...(isProduction ? {} : { error: error.message })
        });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB'
            });
        }
    }

    if (error.message === 'Invalid file type or extension! Only JPG, PNG, GIF, and WebP are allowed.') {
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

module.exports = router;
