/**
 * animation.js — AnimationMixer wrapper for curtain open/close.
 *
 * FIX: mixer.setTime() alone does NOT flush changes — we must call
 * mixer.update(0) after setting action.time to actually move the bones/morphs.
 * Also: action.time must be set on the ACTION, not via mixer.setTime()
 * which resets ALL actions and causes visible pops.
 */

import * as THREE from 'three';
import { config } from '../config.js';

let mixer        = null;
let action       = null;
let clipDuration  = 0;
let rafId        = null;

/**
 * Initialise the mixer with a loaded GLTF.
 */
export function initAnimation(root, clips) {
  disposeAnimation();

  if (!clips || clips.length === 0) {
    console.info('[Animation] No clips in model — open/close has no GLB animation to play.');
    return;
  }

  mixer = new THREE.AnimationMixer(root);
  const clip = clips[config.ANIMATION_CLIP_INDEX] || clips[0];
  clipDuration = clip.duration;

  action = mixer.clipAction(clip);
  action.clampWhenFinished = true;
  action.loop   = THREE.LoopOnce;
  action.paused = false;   // must be playing (not paused) for time-setting to work
  action.play();

  // Jump to start (closed)
  _setMixerTime(0);

  console.info(`[Animation] Clip "${clip.name || 'unnamed'}" duration=${clipDuration.toFixed(3)}s`);
}

/**
 * Internal: reliably set the mixer to an exact time without popping.
 * Three.js requires: set action.time then call mixer.update(0).
 */
function _setMixerTime(t) {
  if (!mixer || !action) return;
  action.time = Math.max(0, Math.min(clipDuration, t));
  mixer.update(0);  // flush: evaluate bones/morphs at this time, advance by 0s
}

/**
 * Scrub animation to normalised position t ∈ [0,1].
 * 0 = fully closed, 1 = fully open.
 */
export function scrubToAmount(t) {
  if (!mixer || clipDuration === 0) return;
  _setMixerTime(t * clipDuration);
}

/**
 * Smoothly animate to a target openAmount with easing.
 * @param {number} targetT  0-1
 * @param {number} currentT 0-1
 * @param {(t:number)=>void} onUpdate  called each frame with current t
 */
export function animateTo(targetT, currentT, onUpdate) {
  cancelAnimationTo();

  const startT    = currentT;
  const startTime = performance.now();
  const duration  = config.ANIMATION_EASE_DURATION * 1000;

  const tick = (now) => {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = easeInOut(progress);
    const t        = startT + (targetT - startT) * eased;
    onUpdate(t);
    if (progress < 1) rafId = requestAnimationFrame(tick);
    else rafId = null;
  };
  rafId = requestAnimationFrame(tick);
}

export function cancelAnimationTo() {
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
}

export function disposeAnimation() {
  cancelAnimationTo();
  if (mixer) {
    mixer.stopAllAction();
    mixer.uncacheRoot(mixer.getRoot());
    mixer       = null;
    action      = null;
    clipDuration = 0;
  }
}

/** Cubic ease-in-out */
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export { mixer };
