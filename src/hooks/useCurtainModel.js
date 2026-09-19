import { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { CURTAIN_CONFIG } from '../config/curtainConfig.js';
import { getModelDimensions, inspectModelStructure } from '../utils/modelUtils.js';

// Preload the default curtain model
useGLTF.preload(CURTAIN_CONFIG.modelUrl);

/**
 * Custom hook to load the 3D curtain GLB, detect targeted fabric meshes,
 * hide excluded hardware (tiebacks, hooks), and compute initial dimensions.
 */
export function useCurtainModel(url = CURTAIN_CONFIG.modelUrl) {
  const gltf = useGLTF(url);

  const { scene, animations } = gltf;

  // Clone scene so multiple instances or transforms don't mutate source cache
  const clonedScene = useMemo(() => {
    return scene.clone(true);
  }, [scene]);

  // Mesh discovery and filtering
  const { curtainMeshes, rodMeshes, allMeshes, baseDimensions } = useMemo(() => {
    const targetMats = (CURTAIN_CONFIG.targetMaterials || []).map((m) => m.toLowerCase());
    const targetMeshNames = (CURTAIN_CONFIG.curtainMeshes || []).map((m) => m.toLowerCase());
    const excludePatterns = (CURTAIN_CONFIG.excludeMeshes || []).map((e) => e.toLowerCase());

    const curtainList = [];
    const rodList = [];
    const all = [];

    clonedScene.traverse((node) => {
      if (!node.isMesh) return;

      const name = (node.name || '').toLowerCase();
      all.push(node);

      // Check if mesh should be excluded (e.g. tiebacks)
      const isExcluded = excludePatterns.some((pattern) => name.includes(pattern));
      if (isExcluded) {
        node.visible = false;
        return;
      }

      // Check if mesh matches target materials
      let matMatches = false;
      if (node.material) {
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        matMatches = mats.some((mat) => {
          const matName = (mat.name || '').toLowerCase();
          return targetMats.some((tm) => matName.includes(tm));
        });
      }

      // Check if mesh name matches known curtain panel names
      const nameMatches = targetMeshNames.some((tm) => name.includes(tm));

      if (matMatches || nameMatches) {
        curtainList.push(node);
      } else if (name.includes('rod') || name.includes('tringle') || name.includes('cylinder') || name.includes('anneau') || name.includes('ring')) {
        rodList.push(node);
      } else {
        // Fallback: if not excluded and not rod, treat as curtain panel
        curtainList.push(node);
      }
    });

    const dimensions = getModelDimensions(clonedScene);

    return {
      curtainMeshes: curtainList,
      rodMeshes: rodList,
      allMeshes: all,
      baseDimensions: dimensions
    };
  }, [clonedScene]);

  useEffect(() => {
    inspectModelStructure(clonedScene, animations);
  }, [clonedScene, animations]);

  return {
    scene: clonedScene,
    animations,
    curtainMeshes,
    rodMeshes,
    allMeshes,
    baseDimensions
  };
}
