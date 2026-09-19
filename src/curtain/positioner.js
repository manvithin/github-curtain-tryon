/**
 * positioner.js — Smooth, jitter-free curtain positioning.
 *
 * FIX: Previous version computed world-units-per-pixel from camera math,
 * which drifted and felt jittery. New approach:
 *   - On pointerdown: raycast cursor → Z=0 plane → record world offset
 *     between cursor hit point and curtain position.
 *   - On pointermove: raycast new cursor → Z=0 plane → subtract offset
 *     = smooth, locked, frame-rate-independent dragging with zero drift.
 */

import * as THREE from 'three';
import { store }  from '../state.js';
import { config } from '../config.js';

let _camera      = null;
let _root        = null;
let _canvas      = null;
let _isDragging  = false;

// World-space offset recorded at drag start (cursor hit - curtain position)
const _dragOffset = new THREE.Vector3();

// Reusable objects
const _plane     = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const _raycaster = new THREE.Raycaster();
const _ndc       = new THREE.Vector2();
const _hit       = new THREE.Vector3();

/**
 * Initialise positioner.
 */
export function initPositioner(camera, curtainRoot, rendererCanvas) {
  _camera  = camera;
  _root    = curtainRoot;
  _canvas  = rendererCanvas;

  syncTransformFromState();

  _canvas.addEventListener('pointerdown',   onPointerDown,   { passive: false });
  _canvas.addEventListener('pointermove',   onPointerMove,   { passive: true  });
  _canvas.addEventListener('pointerup',     onPointerUp,     { passive: true  });
  _canvas.addEventListener('pointercancel', onPointerUp,     { passive: true  });
  _canvas.style.touchAction = 'none';
}

export function destroyPositioner() {
  if (!_canvas) return;
  _canvas.removeEventListener('pointerdown',   onPointerDown);
  _canvas.removeEventListener('pointermove',   onPointerMove);
  _canvas.removeEventListener('pointerup',     onPointerUp);
  _canvas.removeEventListener('pointercancel', onPointerUp);
  _canvas = null;
}

// ── Pointer handlers ──────────────────────────────────────────────────────

function onPointerDown(e) {
  if (!_root) return;
  e.preventDefault();

  const worldPos = raycastPlane(e.clientX, e.clientY);
  if (!worldPos) return;

  _dragOffset.set(
    worldPos.x - _root.position.x,
    worldPos.y - _root.position.y,
    0,
  );

  _isDragging = true;
  _canvas.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
  if (!_isDragging || !_root) return;

  const worldPos = raycastPlane(e.clientX, e.clientY);
  if (!worldPos) return;

  const newX = worldPos.x - _dragOffset.x;
  const newY = worldPos.y - _dragOffset.y;

  // Write directly to root (skip state update per-frame to avoid re-render overhead)
  _root.position.x = newX;
  _root.position.y = newY;
}

function onPointerUp(e) {
  if (!_isDragging) return;
  _isDragging = false;
  _canvas?.releasePointerCapture(e.pointerId);

  // Persist final position to state
  if (_root) {
    store.set({ position: { x: _root.position.x, y: _root.position.y } });
  }
}

// ── Raycast helper ────────────────────────────────────────────────────────

/**
 * Convert client XY → normalised device coords → ray → plane intersection.
 * @returns {THREE.Vector3|null}
 */
function raycastPlane(clientX, clientY) {
  if (!_camera || !_canvas) return null;
  const rect = _canvas.getBoundingClientRect();
  _ndc.set(
    ((clientX - rect.left)  / rect.width)  *  2 - 1,
    -((clientY - rect.top) / rect.height)  *  2 + 1,
  );
  _raycaster.setFromCamera(_ndc, _camera);
  const intersects = _raycaster.ray.intersectPlane(_plane, _hit);
  return intersects ? _hit.clone() : null;
}

// ── Transform sync ────────────────────────────────────────────────────────

export function syncTransformFromState() {
  if (!_root) return;
  const { position, scale, rotation } = store.get();
  _root.position.set(position.x, position.y, 0);
  _root.scale.set(scale.x, scale.y, 1);
  _root.rotation.z = rotation * (Math.PI / 180);
}

export function setWidth(pct) {
  store.set(s => ({ scale: { ...s.scale, x: pct / 100 } }));
  syncTransformFromState();
}
export function setHeight(pct) {
  store.set(s => ({ scale: { ...s.scale, y: pct / 100 } }));
  syncTransformFromState();
}
export function setRotation(deg) {
  store.set({ rotation: deg });
  syncTransformFromState();
}

export function resetPosition() {
  store.set({
    position: { ...config.DEFAULT_POSITION },
    scale:    { ...config.DEFAULT_SCALE },
  });
  syncTransformFromState();
}

export function resetAll() {
  store.set({
    position: { ...config.DEFAULT_POSITION },
    scale:    { ...config.DEFAULT_SCALE },
    rotation: config.DEFAULT_ROTATION,
  });
  syncTransformFromState();
}
