import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import storageService from '../services/storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FABRIC_SIZE = 12 * 1024 * 1024; // 12 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FABRIC_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const err = new Error('INVALID_FILE_TYPE');
      err.code = 'INVALID_FILE_TYPE';
      return cb(err, false);
    }
    cb(null, true);
  }
});

// Built-in library fabrics (served statically from /fabrics/)
const PREDEFINED_FABRICS = [
  {
    id: 'fabric-linen-natural',
    name: 'Natural Beige Linen',
    imageUrl: '/fabrics/linen_natural.webp',
    thumbnailUrl: '/fabrics/linen_natural.webp',
    repeatX: 1,
    repeatY: 1,
    category: 'Linen',
    color: '#D8C7B0',
    isCustom: false
  },
  {
    id: 'fabric-velvet-navy',
    name: 'Royal Navy Velvet',
    imageUrl: '/fabrics/velvet_navy.webp',
    thumbnailUrl: '/fabrics/velvet_navy.webp',
    repeatX: 1,
    repeatY: 1,
    category: 'Velvet',
    color: '#1E2D4A',
    isCustom: false
  },
  {
    id: 'fabric-cotton-charcoal',
    name: 'Charcoal Slub Weave',
    imageUrl: '/fabrics/cotton_charcoal.webp',
    thumbnailUrl: '/fabrics/cotton_charcoal.webp',
    repeatX: 1,
    repeatY: 1,
    category: 'Cotton',
    color: '#34383C',
    isCustom: false
  },
  {
    id: 'fabric-silk-champagne',
    name: 'Champagne Shimmer Silk',
    imageUrl: '/fabrics/silk_champagne.webp',
    thumbnailUrl: '/fabrics/silk_champagne.webp',
    repeatX: 1,
    repeatY: 1,
    category: 'Silk',
    color: '#F4ECE1',
    isCustom: false
  },
  {
    id: 'fabric-sheer-ivory',
    name: 'Ivory Sheer Weave',
    imageUrl: '/fabrics/sheer_ivory.webp',
    thumbnailUrl: '/fabrics/sheer_ivory.webp',
    repeatX: 1,
    repeatY: 1,
    category: 'Sheer',
    color: '#F9F8F6',
    isCustom: false
  },
  {
    id: 'fabric-geo-sage',
    name: 'Sage Herringbone Jacquard',
    imageUrl: '/fabrics/geo_sage.webp',
    thumbnailUrl: '/fabrics/geo_sage.webp',
    repeatX: 1,
    repeatY: 1,
    category: 'Jacquard',
    color: '#7C8C7E',
    isCustom: false
  }
];

const CUSTOM_FABRICS_DB = path.resolve(__dirname, '../../uploads/custom_fabrics.json');

function getCustomFabrics() {
  try {
    if (fs.existsSync(CUSTOM_FABRICS_DB)) {
      const data = fs.readFileSync(CUSTOM_FABRICS_DB, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read custom fabrics db:', e);
  }
  return [];
}

function saveCustomFabrics(fabrics) {
  try {
    const dir = path.dirname(CUSTOM_FABRICS_DB);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CUSTOM_FABRICS_DB, JSON.stringify(fabrics, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write custom fabrics db:', e);
  }
}

/**
 * GET /api/fabrics
 * Returns complete fabric catalog (predefined + custom user fabrics)
 */
router.get('/', (req, res) => {
  const customFabrics = getCustomFabrics();
  res.json({
    success: true,
    data: [...PREDEFINED_FABRICS, ...customFabrics]
  });
});

/**
 * POST /api/fabrics
 * Upload custom fabric pattern.
 * High fidelity processing: max 2048px, lossless or high-quality (92) WebP to preserve fabric weave.
 */
router.post('/', upload.single('fabric'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No fabric image uploaded.' }
      });
    }

    const name = (req.body.name || 'Custom Fabric').trim();
    const repeatX = parseFloat(req.body.repeatX) || 4;
    const repeatY = parseFloat(req.body.repeatY) || 4;

    let processedBuffer;
    try {
      // Process with Sharp keeping texture weave sharpness and high visual fidelity
      processedBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize({
          width: 2048,
          height: 2048,
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 92, effort: 4 })
        .toBuffer();
    } catch (sharpErr) {
      console.warn('[Fabric Upload] Sharp processing failed, saving raw file buffer:', sharpErr);
      processedBuffer = req.file.buffer;
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 7);
    const filename = `custom_fabric_${timestamp}_${randomId}.webp`;

    const stored = await storageService.saveFile(processedBuffer, filename, 'fabrics');

    const newFabric = {
      id: `custom-${timestamp}`,
      name,
      imageUrl: stored.url,
      thumbnailUrl: stored.url,
      repeatX,
      repeatY,
      category: 'Custom',
      isCustom: true,
      filename: stored.filename,
      createdAt: new Date().toISOString()
    };

    const customs = getCustomFabrics();
    customs.push(newFabric);
    saveCustomFabrics(customs);

    res.status(201).json({
      success: true,
      data: newFabric
    });
  } catch (error) {
    console.error('[Fabric Upload Error]:', error);
    if (error.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_FILE_TYPE', message: 'Supported formats: JPG, PNG, WebP.' }
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'FABRIC_UPLOAD_FAILED', message: error.message || 'Failed to process fabric.' }
    });
  }
});

/**
 * DELETE /api/fabrics/:id
 * Delete user-uploaded fabric
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const customs = getCustomFabrics();
    const index = customs.findIndex(f => f.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'FABRIC_NOT_FOUND', message: 'Fabric not found or cannot be deleted.' }
      });
    }

    const [deleted] = customs.splice(index, 1);
    if (deleted.filename) {
      await storageService.deleteFile(deleted.filename, 'fabrics');
    }
    saveCustomFabrics(customs);

    res.json({
      success: true,
      data: { id, deleted: true }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: error.message }
    });
  }
});

export default router;
