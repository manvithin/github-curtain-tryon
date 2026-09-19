/**
 * loader.js — GLTFLoader with tie-back exclusion + front/back layer detection.
 *
 * Exclusion: meshes matching config.EXCLUDE_MESH_NAMES are hidden (visible=false)
 * so they don't appear in the scene but their nodes stay in the hierarchy
 * (preserving animation rig integrity).
 *
 * Layer detection (case-insensitive substring):
 *   1. Name matches FRONT_LAYER_NAMES / BACK_LAYER_NAMES
 *   2. Falls back to index parity if names are ambiguous
 *   3. Single-mesh model → all front, back slot disabled
 */

import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { config } from '../config.js';
import { store }  from '../state.js';

let _loader = null;

function getLoader() {
  if (_loader) return _loader;
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  _loader = new GLTFLoader();
  _loader.setDRACOLoader(draco);
  return _loader;
}

/**
 * Load curtain GLB, hide tie-backs, detect layers, add to scene.
 * @returns {Promise<{gltf, root, frontMeshes, backMeshes, clips}>}
 */
export function loadCurtainModel(scene) {
  return new Promise((resolve, reject) => {
    getLoader().load(
      config.MODEL_PATH,
      (gltf) => {
        const root = gltf.scene;

        // ── 1. Collect all meshes with their names ──────────────────────
        const allMeshes = [];
        root.traverse((node) => {
          if (!node.isMesh) return;
          node.castShadow    = true;
          node.receiveShadow = true;
          allMeshes.push(node);
        });

        // ── 2. Hide tie-backs / hardware ────────────────────────────────
        const excludeList = (config.EXCLUDE_MESH_NAMES || [])
          .map(n => n.toLowerCase());

        const visibleMeshes = [];
        const hiddenNames   = [];

        allMeshes.forEach((mesh) => {
          const name = (mesh.name || '').toLowerCase();
          const excluded = excludeList.some(ex => name.includes(ex));
          if (excluded) {
            mesh.visible = false;
            hiddenNames.push(mesh.name);
          } else {
            visibleMeshes.push(mesh);
          }
        });

        if (hiddenNames.length) {
          console.info('[Curtain] Hidden meshes (tie-backs/hardware):', hiddenNames);
        }

        // Log all visible mesh names to help configure layer detection
        console.info('[Curtain] All visible meshes:', visibleMeshes.map(m => m.name));

        // ── 3. Detect front / back layers from visible meshes ───────────
        const { frontMeshes, backMeshes } = detectLayers(visibleMeshes);

        console.info('[Curtain] Front layer:', frontMeshes.map(m => m.name));
        console.info('[Curtain] Back layer:',  backMeshes.map(m => m.name));

        if (frontMeshes.length === 0 && backMeshes.length === 0) {
          reject(new Error('No visible curtain meshes found after exclusions.'));
          return;
        }

        scene.add(root);

        resolve({
          gltf,
          root,
          frontMeshes,
          backMeshes,
          clips: gltf.animations || [],
        });
      },
      undefined,
      (err) => reject(err)
    );
  });
}

// ── Layer detection ─────────────────────────────────────────────────────────

function detectLayers(meshes) {
  if (meshes.length === 0) return { frontMeshes: [], backMeshes: [] };

  const frontNames = config.FRONT_LAYER_NAMES.map(n => n.toLowerCase());
  const backNames  = config.BACK_LAYER_NAMES.map(n => n.toLowerCase());

  const frontMeshes = [];
  const backMeshes  = [];
  const unmatched   = [];

  meshes.forEach((mesh) => {
    const name    = (mesh.name || '').toLowerCase();
    const isFront = frontNames.some(n => name.includes(n));
    const isBack  = backNames.some(n => name.includes(n));

    if (isFront && !isBack)       frontMeshes.push(mesh);
    else if (isBack && !isFront)  backMeshes.push(mesh);
    else                          unmatched.push(mesh);
  });

  // Nothing matched by name → split by index parity
  if (frontMeshes.length === 0 && backMeshes.length === 0) {
    console.warn('[Curtain] No name matches — splitting by mesh index (even=front, odd=back).');
    meshes.forEach((mesh, i) => {
      if (i % 2 === 0) frontMeshes.push(mesh);
      else             backMeshes.push(mesh);
    });
  } else {
    // Unmatched → assign to front (safe default)
    unmatched.forEach(m => frontMeshes.push(m));
  }

  // Single-layer model
  if (backMeshes.length === 0 && config.SINGLE_LAYER_FALLBACK) {
    console.warn('[Curtain] No back layer found — back fabric slot will be disabled.');
    store.set({ singleLayerModel: true });
  }

  return { frontMeshes, backMeshes };
}

// ── Disposal ────────────────────────────────────────────────────────────────

export function disposeCurtainModel(root) {
  if (!root) return;
  root.traverse((node) => {
    if (node.isMesh) {
      node.geometry?.dispose();
      const mat = node.material;
      if (Array.isArray(mat)) mat.forEach(disposeMaterial);
      else disposeMaterial(mat);
    }
  });
}

function disposeMaterial(mat) {
  if (!mat) return;
  Object.values(mat).forEach(v => {
    if (v && typeof v.dispose === 'function') v.dispose();
  });
  mat.dispose();
}
