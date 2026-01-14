const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adminAuth = require('../middleware/adminAuth');
const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/images/products');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, 'product-' + uniqueSuffix + fileExtension);
    }
});

// Allowed file types mapping
const ALLOWED_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp']
};

// Strict file filter with Magic Number verification
const fileFilter = async (req, file, cb) => {
    // 1. Initial extension/MIME check (fast fail)
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ALLOWED_TYPES[file.mimetype];

    if (!allowedExtensions || !allowedExtensions.includes(fileExtension)) {
        return cb(new Error('Invalid file type or extension! Only JPG, PNG, GIF, and WebP are allowed.'), false);
    }

    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Magic keys for valid file types
const MAGIC_NUMBERS = {
    jpg: 'ffd8ff',
    png: '89504e47',
    gif: '47494638',
    webp: '52494646' // RIFF....WEBP
};

// Start of the file validation using magic numbers
const validateFileContent = (filePath, extension) => {
    try {
        const buffer = fs.readFileSync(filePath);
        if (!buffer || buffer.length < 4) return false;

        const hex = buffer.toString('hex', 0, 4);

        // Simple check for common types
        if (extension === '.png' && hex === MAGIC_NUMBERS.png) return true;
        if (extension === '.gif' && hex === MAGIC_NUMBERS.gif) return true;
        if ((extension === '.jpg' || extension === '.jpeg') && buffer.toString('hex', 0, 3) === MAGIC_NUMBERS.jpg) return true;
        if (extension === '.webp' && hex === MAGIC_NUMBERS.webp) return true;

        return false;
    } catch (e) {
        return false;
    }
};

// Upload image endpoint
router.post('/upload', adminAuth, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Validate bytes
        const extension = path.extname(req.file.originalname).toLowerCase();
        const isValid = validateFileContent(req.file.path, extension);

        if (!isValid) {
            // Delete the invalid file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'Invalid file content. Magic bytes do not match extension.'
            });
        }

        // Create image URL
        const imageUrl = `/images/${req.file.filename}`;

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            imageUrl: imageUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Upload error:', error);
        // Try to clean up if file exists
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            message: 'Error uploading image',
            error: error.message
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
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting image',
            error: error.message
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
