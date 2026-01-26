import express, { Request, Response, NextFunction } from 'express';
import type { Express } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import adminAuth from '../middleware/adminAuth';
import logger from '../logger';

const router = express.Router();

const routesDir = path.resolve(__dirname, '..');
const backendDir = path.basename(routesDir) === 'dist' ? path.resolve(routesDir, '..') : routesDir;
const uploadsDir = path.resolve(backendDir, 'uploads/images/products');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

const MAGIC_NUMBERS: Record<string, string[]> = {
  '.jpg': ['ffd8ff', 'ffd8'],
  '.jpeg': ['ffd8ff', 'ffd8'],
  '.png': ['89504e47'],
};

const validateMagicNumbers = (buffer: Buffer, extension: string): boolean => {
  if (!buffer || buffer.length < 4) return false;

  const ext = extension.toLowerCase();
  const magicNumbers = MAGIC_NUMBERS[ext];
  if (!magicNumbers) return false;

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

const memoryStorage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ALLOWED_TYPES[file.mimetype];

  if (!allowedExtensions || !allowedExtensions.includes(fileExtension)) {
    return cb(new Error('Invalid file type or extension! Only JPG, PNG are allowed.') as any, false);
  }

  cb(null, true);
};

const upload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

router.post('/upload', adminAuth, upload.single('file'), (req: Request & { file?: Express.Multer.File }, res: Response) => {
  let savedFilePath: string | null = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

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

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = 'product-' + uniqueSuffix + extension;
    savedFilePath = path.join(uploadsDir, filename);

    fs.writeFileSync(savedFilePath, req.file.buffer);

    const imageUrl = `/images/${filename}`;

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl,
      filename
    });
  } catch (error: any) {
    logger.error('Upload error:', error);
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

router.delete('/delete/:filename', adminAuth, (req: Request<{ filename: string }>, res: Response) => {
  try {
    const filename = path.basename(req.params.filename);

    if (!/^product-\d+-\d+\.\w+$/.test(filename)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename format'
      });
    }

    const filePath = path.join(uploadsDir, filename);
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
  } catch (error: any) {
    logger.error('Delete error:', error);
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      ...(isProduction ? {} : { error: error.message })
    });
  }
});

router.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof multer.MulterError) {
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

export default router;
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
(module as any).exports = router;
