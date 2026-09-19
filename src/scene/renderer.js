/**
 * renderer.js — Three.js WebGLRenderer setup.
 *
 * Uses WebGL2 (with automatic WebGL1 fallback via Three.js).
 * The canvas is transparent so the DOM photo background shows through.
 *
 * WebGPU upgrade path:
 *   When Three.js WebGPURenderer is production-stable, replace:
 *     new THREE.WebGLRenderer(…) → new WebGPURenderer(…)
 *   and import from 'three/addons/renderers/common/WebGPURenderer.js'.
 *   All materials/lights stay the same — only the renderer constructor changes.
 */

import * as THREE from 'three';
import { config } from '../config.js';

export function createRenderer(mountEl) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,                      // transparent background
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });

  // Color management
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = config.TONE_MAPPING_EXPOSURE;

  // Shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

  // DPR — cap at 2 to avoid crushing mobile GPUs
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.MAX_PIXEL_RATIO));

  // Clear to fully transparent
  renderer.setClearColor(0x000000, 0);

  // Append canvas
  mountEl.appendChild(renderer.domElement);

  // Initial size
  resize(renderer, mountEl);

  // Resize observer
  const ro = new ResizeObserver(() => resize(renderer, mountEl));
  ro.observe(mountEl);

  return renderer;
}

function resize(renderer, mountEl) {
  const w = mountEl.clientWidth;
  const h = mountEl.clientHeight;
  renderer.setSize(w, h, false); // false = don't set CSS size (CSS handles it)
}

export function disposeRenderer(renderer) {
  renderer.dispose();
  renderer.domElement.remove();
}
