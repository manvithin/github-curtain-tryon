import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import storageService from '../services/storageService.js';

const router = Router();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const err = new Error('INVALID_FILE_TYPE');
      err.code = 'INVALID_FILE_TYPE';
      return cb(err, false);
    }
    cb(null, true);
  }
});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No image file provided.' }
      });
    }

    // Process image with Sharp:
    // 1. auto-rotate according to EXIF
    // 2. resize if larger than 2560px in either dimension
    // 3. convert to webp format at high quality (88)
    const pipeline = sharp(req.file.buffer)
      .rotate()
      .resize({
        width: 2560,
        height: 2560,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 88 });

    const metadata = await pipeline.metadata();
    const processedBuffer = await pipeline.toBuffer();

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `room_${timestamp}_${randomId}.webp`;

    const stored = await storageService.saveFile(processedBuffer, filename, 'rooms');

    res.status(201).json({
      success: true,
      data: {
        id: `room-${timestamp}`,
        filename: stored.filename,
        url: stored.url,
        width: metadata.width,
        height: metadata.height,
        size: processedBuffer.length,
        format: 'webp'
      }
    });
  } catch (error) {
    console.error('[Upload Error]:', error);
    if (error.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_FILE_TYPE', message: 'Unsupported image format. Please upload JPG, PNG, or WebP.' }
      });
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: 'Image exceeds maximum 15MB file size limit.' }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'PROCESSING_FAILED', message: error.message || 'Failed to process image.' }
    });
  }
});

export default router;
