import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      activeModel: {
        id: 'curtain-blender-default',
        name: 'Blender Pleated Curtain with Rod & Tiebacks',
        url: '/models/curtain.glb',
        curtainMeshes: ['Plane.004', 'Plane.005', 'Rideau'],
        targetMaterials: ['Tissus curtain', 'Curtain', 'Fabric'],
        excludeMeshes: ['tieback', 'tie_back', 'bracket', 'hardware'],
        animationClips: ['Plane.004Action', 'Plane.005Action'],
        defaultDimensions: { width: 2.2, height: 2.6 },
        limits: {
          minWidth: 0.6,
          maxWidth: 5.0,
          minHeight: 0.8,
          maxHeight: 4.5
        }
      }
    }
  });
});

export default router;
