/**
 * materials.js — Front and back curtain fabric material system.
 *
 * Design principles:
 *  - Replaces ONLY material.map (the albedo/diffuse texture).
 *  - Preserves all original GLB material properties:
 *      normalMap, roughnessMap, metalnessMap, aoMap, emissiveMap,
 *      roughness, metalness, color, side, etc.
 *  - Does NOT alter geometry, UVs, folds, or animation.
 *  - Properly disposes old textures on replacement (no memory leaks).
 *  - Fabric texture uses RepeatWrapping to follow UV layout.
 *
 * Usage:
 *   applyFabricToLayer(meshes, imageUrl)
 *   clearFabricFromLayer(meshes)
 */

import * as THREE from 'three';
import { config } from '../config.js';

// Track current textures for disposal
const _activeFabricTextures = new Map(); // meshUUID → Texture

/**
 * Apply a fabric image URL to an array of meshes.
 * @param {THREE.Mesh[]} meshes
 * @param {string} imageUrl  — Data URL or object URL
 */
export function applyFabricToLayer(meshes, imageUrl) {
  if (!meshes || meshes.length === 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (texture) => {
        // Color space — fabric images are sRGB
        texture.colorSpace = THREE.SRGBColorSpace;
        // Repeat/tile so pattern follows UV layout
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(config.FABRIC_REPEAT_U, config.FABRIC_REPEAT_V);
        // Good quality filtering
        texture.minFilter  = THREE.LinearMipmapLinearFilter;
        texture.magFilter  = THREE.LinearFilter;
        texture.anisotropy = 8; // set by renderer later; safe default
        texture.generateMipmaps = true;
        texture.needsUpdate = true;

        meshes.forEach((mesh) => {
          // Dispose old fabric texture if any
          const prev = _activeFabricTextures.get(mesh.uuid);
          if (prev) { prev.dispose(); }
          _activeFabricTextures.set(mesh.uuid, texture);

          // Apply to material(s) — preserve all other PBR properties
          applyTextureToMesh(mesh, texture);
        });

        resolve(texture);
      },
      undefined,
      (err) => reject(err)
    );
  });
}

/**
 * Remove fabric from meshes, restoring original material.map = null (solid colour).
 * @param {THREE.Mesh[]} meshes
 */
export function clearFabricFromLayer(meshes) {
  meshes.forEach((mesh) => {
    const prev = _activeFabricTextures.get(mesh.uuid);
    if (prev) { prev.dispose(); _activeFabricTextures.delete(mesh.uuid); }
    applyTextureToMesh(mesh, null);
  });
}

/**
 * Upgrade mesh materials to MeshStandardMaterial if not already PBR,
 * then set the map texture. Preserves existing PBR properties.
 */
function applyTextureToMesh(mesh, texture) {
  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map(m => upgradedMaterial(m, texture));
  } else {
    mesh.material = upgradedMaterial(mesh.material, texture);
  }
}

function upgradedMaterial(mat, texture) {
  let target;

  if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
    // Already PBR — clone to avoid mutating shared materials
    target = mat.clone();
  } else {
    // Upgrade non-PBR material to MeshStandardMaterial
    target = new THREE.MeshStandardMaterial({
      roughness: mat.roughness ?? 0.8,
      metalness: mat.metalness ?? 0.0,
      color:     mat.color     ?? new THREE.Color(1, 1, 1),
      side:      mat.side      ?? THREE.FrontSide,
    });
  }

  // Set (or clear) the fabric map
  target.map = texture;

  // When a fabric is applied, set material color to white so the
  // fabric texture shows its true colour (not tinted by material color).
  if (texture) {
    target.color.set(0xffffff);
  }

  target.needsUpdate = true;
  return target;
}

/**
 * Dispose all tracked fabric textures (call on app teardown).
 */
export function disposeAllFabricTextures() {
  _activeFabricTextures.forEach(tex => tex.dispose());
  _activeFabricTextures.clear();
}

/**
 * Validate an image file before loading.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFabricFile(file) {
  const MAX_SIZE = config.MAX_FILE_SIZE_MB * 1024 * 1024;
  const ALLOWED  = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

  if (!ALLOWED.includes(file.type)) {
    return { valid: false, error: `Unsupported format. Please use JPG, PNG, or WebP.` };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: `Image is too large. Maximum size is ${config.MAX_FILE_SIZE_MB} MB.` };
  }
  return { valid: true };
}

/**
 * Downscale image if larger than MAX_TEXTURE_SIZE.
 * Returns a data URL.
 */
export function processImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const max = config.MAX_TEXTURE_SIZE;
        if (img.width <= max && img.height <= max) {
          resolve(e.target.result);
          return;
        }
        // Downscale preserving aspect ratio
        const ratio  = Math.min(max / img.width, max / img.height);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}
