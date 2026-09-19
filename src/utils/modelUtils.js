import * as THREE from 'three';

/**
 * Calculates the bounding box and natural world dimensions (width, height, depth)
 * of a model or set of meshes.
 *
 * @param {THREE.Object3D} model
 * @returns {{ width: number, height: number, depth: number, center: THREE.Vector3, box: THREE.Box3 }}
 */
export function getModelDimensions(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  return {
    width: Math.max(0.01, size.x),
    height: Math.max(0.01, size.y),
    depth: Math.max(0.01, size.z),
    center,
    box
  };
}

/**
 * Computes scale factors to size a model to desired physical width & height (in meters).
 *
 * @param {{ width: number, height: number }} originalDimensions
 * @param {{ width: number, height: number }} desiredDimensions
 * @returns {{ scaleX: number, scaleY: number, scaleZ: number }}
 */
export function calculateCurtainScale(originalDimensions, desiredDimensions) {
  const baseWidth = originalDimensions.width || 1;
  const baseHeight = originalDimensions.height || 1;

  const scaleX = desiredDimensions.width / baseWidth;
  const scaleY = desiredDimensions.height / baseHeight;
  // Maintain natural realistic depth (prevents rod & rings from bloating into thick cylinders)
  const scaleZ = Math.min(1.3, Math.max(0.7, scaleY * 0.9 + 0.1));

  return { scaleX, scaleY, scaleZ };
}

/**
 * Inspects a loaded GLTF scene and logs detailed metadata to assist in
 * debugging future Blender model replacements.
 *
 * @param {THREE.Object3D} scene
 * @param {THREE.AnimationClip[]} clips
 */
export function inspectModelStructure(scene, clips = []) {
  const meshes = [];
  const materials = new Set();
  const nodes = [];

  scene.traverse((node) => {
    nodes.push(node.name || 'unnamed');
    if (node.isMesh) {
      meshes.push(node.name || 'unnamed-mesh');
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach((m) => materials.add(m.name || 'unnamed-mat'));
        } else {
          materials.add(node.material.name || 'unnamed-mat');
        }
      }
    }
  });

  const dimensions = getModelDimensions(scene);

  console.groupCollapsed('🔍 [Curtain 3D Model Inspection]');
  console.log('Meshes (' + meshes.length + '):', meshes);
  console.log('Materials (' + materials.size + '):', Array.from(materials));
  console.log('Animation Clips (' + clips.length + '):', clips.map((c) => `${c.name} (${c.duration.toFixed(2)}s)`));
  console.log('Original Dimensions (m):', {
    width: dimensions.width.toFixed(3),
    height: dimensions.height.toFixed(3),
    depth: dimensions.depth.toFixed(3)
  });
  console.groupEnd();

  return {
    meshes,
    materials: Array.from(materials),
    clips: clips.map((c) => ({ name: c.name, duration: c.duration })),
    dimensions
  };
}
