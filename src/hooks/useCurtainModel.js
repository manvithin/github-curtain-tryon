import { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { MODEL_CONFIG, CURTAIN_CONFIG } from '../config/curtainConfig.js';
import { getModelDimensions, inspectModelStructure } from '../utils/modelUtils.js';

// Eagerly preload both model URLs so switching is instant
useGLTF.preload(MODEL_CONFIG.single.url);
useGLTF.preload(MODEL_CONFIG.double.url);

/**
 * Loads the curtain GLB for the given selectedModel and returns classified mesh groups.
 *
 * @param {string|undefined} url         - Override URL (leave undefined to use MODEL_CONFIG).
 * @param {string}           selectedModel - 'single' | 'double'
 */
export function useCurtainModel(url, selectedModel = CURTAIN_CONFIG.defaultModel) {
  // Resolve config + URL
  const cfg      = MODEL_CONFIG[selectedModel] || MODEL_CONFIG.single;
  const modelUrl = url || cfg.url;

  // useGLTF caches by URL — switching URL loads the correct cached GLB instantly
  const gltf                     = useGLTF(modelUrl);
  const { scene, animations }    = gltf;

  // Clone scene so mutations (fabric, transparency) never corrupt the GLTF cache
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // Classify meshes into front-curtain, sheer, and rod groups
  const { curtainMeshes, sheerMeshes, rodMeshes, baseDimensions } = useMemo(() => {
    const frontMats   = (cfg.frontMaterials  || []).map((m) => m.toLowerCase());
    const sheerMats   = (cfg.sheerMaterials  || []).map((m) => m.toLowerCase());
    const excludePats = (CURTAIN_CONFIG.excludeMeshes || []).map((e) => e.toLowerCase());

    const curtains = [];
    const sheers   = [];
    const rods     = [];

    clonedScene.traverse((node) => {
      const name = (node.name || '').toLowerCase();

      // For double curtain GLB, hide duplicate LOD/offset subtrees (.001, .002) exported by Blender
      if (selectedModel === 'double' && (name.includes('.001') || name.includes('.002'))) {
        node.visible = false;
        if (node.isMesh) return;
      }

      if (!node.isMesh) return;

      // Hide hardware we never want to show
      if (excludePats.some((p) => name.includes(p))) {
        node.visible = false;
        return;
      }

      // Collect all material names on this mesh
      const mats    = Array.isArray(node.material) ? node.material : [node.material];
      const matNames = mats.map((m) => (m?.name || '').toLowerCase());

      const isFront = matNames.some((m) => frontMats.includes(m));
      const isSheer = matNames.some((m) => sheerMats.some((s) => m.includes(s)));
      const isRod   =
        name.includes('rod')    ||
        name.includes('tringle') ||
        name.includes('cylinder') ||
        name.includes('anneau')   ||
        name.includes('ring');

      if (isSheer) {
        sheers.push(node);
      } else if (isRod) {
        rods.push(node);
      } else if (isFront) {
        curtains.push(node);
      } else {
        // Default: treat as front curtain so fabric always applies
        curtains.push(node);
      }
    });

    const dimensions = getModelDimensions(clonedScene);

    return {
      curtainMeshes:  curtains,
      sheerMeshes:    sheers,
      rodMeshes:      rods,
      baseDimensions: dimensions,
    };
  }, [clonedScene, cfg, selectedModel]); // re-run if model changes

  // Log model structure for debugging
  useEffect(() => {
    inspectModelStructure(clonedScene, animations);
    console.log(
      `[useCurtainModel] Loaded "${selectedModel}" → ${modelUrl}\n` +
      `  front meshes: ${curtainMeshes.length}, sheer meshes: ${sheerMeshes.length}, rod meshes: ${rodMeshes.length}`
    );
  }, [clonedScene, animations, selectedModel]);

  return {
    scene: clonedScene,
    animations,
    curtainMeshes,
    sheerMeshes,
    rodMeshes,
    baseDimensions,
  };
}
