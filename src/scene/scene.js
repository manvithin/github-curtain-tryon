/**
 * scene.js — Three.js scene, camera, and lights.
 */

import * as THREE from 'three';
import { config } from '../config.js';

export function createScene() {
  const scene = new THREE.Scene();
  // Transparent background — photo shows through renderer canvas
  scene.background = null;
  return scene;
}

export function createCamera(mountEl) {
  const aspect = mountEl.clientWidth / mountEl.clientHeight;
  const camera = new THREE.PerspectiveCamera(35, aspect, 0.01, 100);
  camera.position.set(0, 0, 5);
  return camera;
}

export function updateCameraAspect(camera, mountEl) {
  camera.aspect = mountEl.clientWidth / mountEl.clientHeight;
  camera.updateProjectionMatrix();
}

/**
 * Set up a simple 3-point light rig simulating a bright window environment.
 */
export function setupLights(scene) {
  // Ambient — soft fill
  const ambient = new THREE.AmbientLight(0xffffff, config.AMBIENT_INTENSITY);
  scene.add(ambient);

  // Key light — window-side directional with shadow
  const key = new THREE.DirectionalLight(0xfff5e0, config.DIRECTIONAL_INTENSITY);
  key.position.set(3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(config.SHADOW_MAP_SIZE, config.SHADOW_MAP_SIZE);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far  = 30;
  key.shadow.camera.left   = -4;
  key.shadow.camera.right  =  4;
  key.shadow.camera.top    =  4;
  key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0005;
  scene.add(key);

  // Fill light — opposite side, low intensity
  const fill = new THREE.DirectionalLight(0xe0eeff, 0.4);
  fill.position.set(-3, 2, 2);
  scene.add(fill);

  // Back rim light — subtle depth separation
  const rim = new THREE.DirectionalLight(0xffffff, 0.2);
  rim.position.set(0, -2, -3);
  scene.add(rim);

  return { ambient, key, fill, rim };
}
