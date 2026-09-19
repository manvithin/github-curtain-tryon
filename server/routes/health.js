import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'curtain-visualizer-api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
