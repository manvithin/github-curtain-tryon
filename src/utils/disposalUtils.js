import * as THREE from 'three';

/**
 * Safely disposes a Three.js texture.
 */
export function disposeTexture(texture) {
  if (!texture) return;
  try {
    if (typeof texture.dispose === 'function') {
      texture.dispose();
    }
  } catch (e) {
    console.warn('Error disposing texture:', e);
  }
}

/**
 * Safely disposes a material and its attached map textures.
 */
export function disposeMaterial(material, disposeMaps = false) {
  if (!material) return;

  if (Array.isArray(material)) {
    material.forEach((m) => disposeMaterial(m, disposeMaps));
    return;
  }

  try {
    if (disposeMaps) {
      const mapKeys = [
        'map',
        'alphaMap',
        'roughnessMap',
        'metalnessMap',
        'normalMap',
        'aoMap',
        'bumpMap',
        'emissiveMap',
        'transmissionMap'
      ];
      mapKeys.forEach((key) => {
        if (material[key] && typeof material[key].dispose === 'function') {
          material[key].dispose();
        }
      });
    }

    if (typeof material.dispose === 'function') {
      material.dispose();
    }
  } catch (e) {
    console.warn('Error disposing material:', e);
  }
}

/**
 * Recursively disposes an entire 3D Object / Mesh tree including geometries and materials.
 */
export function disposeModel(root) {
  if (!root) return;

  root.traverse((node) => {
    if (node.isMesh) {
      if (node.geometry && typeof node.geometry.dispose === 'function') {
        node.geometry.dispose();
      }
      disposeMaterial(node.material, false);
    }
  });
}
