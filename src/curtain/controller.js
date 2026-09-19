/**
 * controller.js — High-level curtain API.
 *
 * Bridges UI events → animation system → materials system.
 * Keeps UI code free of Three.js details.
 */

import { store } from '../state.js';
import {
  initAnimation,
  scrubToAmount,
  animateTo,
  disposeAnimation,
} from '../scene/animation.js';
import {
  applyFabricToLayer,
  clearFabricFromLayer,
  disposeAllFabricTextures,
} from './materials.js';
import {
  initPositioner,
  destroyPositioner,
  resetPosition,
  resetAll,
  setWidth,
  setHeight,
  setRotation,
  syncTransformFromState,
} from './positioner.js';

let _frontMeshes = [];
let _backMeshes  = [];

/**
 * Called once the GLB model is loaded.
 */
export function setupCurtain({ gltf, root, frontMeshes, backMeshes, clips, camera, rendererCanvas }) {
  _frontMeshes = frontMeshes;
  _backMeshes  = backMeshes;

  store.set({
    frontMeshes,
    backMeshes,
    modelLoaded: true,
    modelLoading: false,
    modelError: null,
  });

  initAnimation(root, clips);
  initPositioner(camera, root, rendererCanvas);
}

/**
 * Open curtain (animate to 100%).
 */
export function openCurtain() {
  const current = store.get().openAmount / 100;
  animateTo(1, current, (t) => {
    const pct = Math.round(t * 100);
    store.set({ openAmount: pct, curtainOpen: pct >= 95 });
    scrubToAmount(t);
    // Update the UI slider
    const slider = document.getElementById('openSlider');
    const val    = document.getElementById('openVal');
    if (slider) slider.value = pct;
    if (val)    val.textContent = `${pct}%`;
  });
}

/**
 * Close curtain (animate to 0%).
 */
export function closeCurtain() {
  const current = store.get().openAmount / 100;
  animateTo(0, current, (t) => {
    const pct = Math.round(t * 100);
    store.set({ openAmount: pct, curtainOpen: pct >= 95 });
    scrubToAmount(t);
    const slider = document.getElementById('openSlider');
    const val    = document.getElementById('openVal');
    if (slider) slider.value = pct;
    if (val)    val.textContent = `${pct}%`;
  });
}

/**
 * Set open amount directly (from slider).
 * @param {number} pct  0-100
 */
export function setCurtainOpen(pct) {
  const t = pct / 100;
  store.set({ openAmount: pct, curtainOpen: pct >= 95 });
  scrubToAmount(t);
}

/**
 * Apply fabric to front layer.
 * @param {string} imageUrl
 */
export async function applyFrontFabric(imageUrl) {
  if (_frontMeshes.length === 0) return;
  await applyFabricToLayer(_frontMeshes, imageUrl);
  store.set({ frontFabricUrl: imageUrl });
}

/**
 * Apply fabric to back layer.
 * @param {string} imageUrl
 */
export async function applyBackFabric(imageUrl) {
  if (_backMeshes.length === 0) return;
  await applyFabricToLayer(_backMeshes, imageUrl);
  store.set({ backFabricUrl: imageUrl });
}

// Re-export positioning helpers for UI
export { resetPosition, resetAll, setWidth, setHeight, setRotation };

/**
 * Full teardown.
 */
export function teardownCurtain() {
  disposeAnimation();
  destroyPositioner();
  disposeAllFabricTextures();
  _frontMeshes = [];
  _backMeshes  = [];
  store.set({
    modelLoaded: false,
    frontMeshes: [],
    backMeshes: [],
    frontFabricUrl: null,
    backFabricUrl: null,
    openAmount: 0,
    curtainOpen: false,
  });
}
