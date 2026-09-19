import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import healthRouter from './routes/health.js';
import modelsRouter from './routes/models.js';
import uploadsRouter from './routes/uploads.js';
import fabricsRouter from './routes/fabrics.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// 1. Security Headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false // Allows Vite HMR, blob/data URLs for 3D textures during dev
  })
);

// 2. CORS Configuration
app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
  })
);

// 3. Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Rate Limiter for upload endpoints
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 uploads per 15 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many upload requests. Please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 5. Static Directories
const publicDir = path.resolve(__dirname, '../public');
const uploadsDir = path.resolve(__dirname, '../uploads');

app.use('/public', express.static(publicDir));
app.use('/models', express.static(path.join(publicDir, 'models')));
app.use('/fabrics', express.static(path.join(publicDir, 'fabrics')));
app.use('/rooms', express.static(path.join(publicDir, 'rooms')));
app.use('/uploads', express.static(uploadsDir));

// In production, serve Vite dist
const distDir = path.resolve(__dirname, '../dist');
app.use(express.static(distDir));

// 6. API Routes
app.use('/api/health', healthRouter);
app.use('/api/models', modelsRouter);
app.use('/api/uploads', uploadLimiter, uploadsRouter);
app.use('/api/fabrics', fabricsRouter);

// 7. Fallback to index.html for SPA in production
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'API route not found' }
    });
  }
  const indexPath = path.join(distDir, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

// 8. Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected server error occurred.'
    }
  });
});

app.listen(PORT, () => {
  console.log(`[Curtain Server] Running on http://localhost:${PORT}`);
  console.log(`[Curtain Server] Static uploads at ${uploadsDir}`);
});

export default app;
