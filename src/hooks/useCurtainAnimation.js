import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisualizerStore } from '../store/visualizerStore.js';
import { CURTAIN_CONFIG } from '../config/curtainConfig.js';

/**
 * Drives the Blender-baked curtain open/close animation from Zustand's openProgress (0→1).
 *
 * TWO complementary systems work together:
 *
 * 1. AnimationMixer scrubbing
 *    – Drives Plane.045Action & Plane.052Action (morph-target weight animations on the fabric meshes).
 *    – This gathers/spreads the fabric pleats.
 *    – Pattern: play → pause → set action.time = progress * duration → mixer.update(0).
 *
 * 2. Manual ring Empty node positioning
 *    – The ring Empty nodes (Empty.001-012 left, Empty.014-024 right) are children of the fabric
 *      panel NODES (Rideau.001 / Plane.001), but the panel NODES themselves don't translate —
 *      only the mesh VERTICES move (morph targets). So the ring empties must be manually slid.
 *    – Left rings cluster toward leftmost initial-X as curtain opens.
 *    – Right rings cluster toward rightmost initial-X as curtain opens.
 *
 * 3. Hardware lock
 *    – Cylinder.004 (rod) and Anneau/mesh.001 (ring hardware meshes) have shortening shape keys.
 *    – These are set to 0 once on mount and re-locked every frame in case the mixer touches them.
 */
export function useCurtainAnimation(root, clips = []) {
  const mixerRef        = useRef(null);
  const actionsRef      = useRef([]);
  const prevProgressRef = useRef(-1);
  const leftRingsRef    = useRef([]); // { node, initialX, anchorX }
  const rightRingsRef   = useRef([]); // { node, initialX, anchorX }
  const hardwareRef     = useRef([]); // meshes whose morph targets must stay 0

  // ── Setup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!root || !clips || clips.length === 0) return;

    // Dispose any previous mixer
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current.uncacheRoot(mixerRef.current.getRoot());
      mixerRef.current = null;
    }

    const mixer = new THREE.AnimationMixer(root);
    mixerRef.current = mixer;

    // Match fabric panel clips by name
    const targetNames = (CURTAIN_CONFIG.animationNames?.clips || []).map((c) => c.toLowerCase());
    let matched = targetNames.length > 0
      ? clips.filter((c) => targetNames.some((n) => c.name.toLowerCase().includes(n)))
      : [];
    if (matched.length === 0) matched = [...clips]; // fallback: use all clips

    const actions = [];
    matched.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.clampWhenFinished = true;
      action.loop = THREE.LoopOnce;
      action.play();
      action.paused = true;
      action.time = 0;
      actions.push({ action, duration: clip.duration });
    });
    actionsRef.current = actions;

    // ── Discover ring empties + hardware meshes ────────────────────────────
    const leftRings  = [];
    const rightRings = [];
    const hardware   = [];

    // Left-panel ring name pattern:  Empty.001 – Empty.010, Empty.012
    const leftPat  = /^Empty\.0(0[1-9]|1[02])$/i;
    // Right-panel ring name pattern: Empty.014 – Empty.024
    const rightPat = /^Empty\.0(1[4-9]|2[0-4])$/i;

    root.traverse((node) => {
      const name = node.name || '';
      const nl   = name.toLowerCase();

      // Fix rogue Anneau.007 transform glitch (was offset and rotated in Blender GLB export)
      if (name === 'Anneau.007') {
        node.position.set(0.08076477, 3.250244, -0.048188);
        node.rotation.set(0, 0, 0);
      }

      // Ring empties
      if (leftPat.test(name)) {
        leftRings.push({ node, initialX: node.position.x });
      } else if (rightPat.test(name)) {
        rightRings.push({ node, initialX: node.position.x });
      }

      // Rod & ring hardware meshes — lock morph targets
      if (node.isMesh && node.morphTargetInfluences && node.morphTargetInfluences.length > 0) {
        const isHardware =
          nl.includes('cylinder') ||
          nl.includes('tringle')  ||
          nl.includes('anneau')   ||
          nl.includes('mesh.001');
        if (isHardware) {
          for (let i = 0; i < node.morphTargetInfluences.length; i++) {
            node.morphTargetInfluences[i] = 0;
          }
          hardware.push(node);
        }
      }
    });

    // Sort rings from left to right so they accordion-stack naturally above each fabric pleat
    leftRings.sort((a, b) => a.initialX - b.initialX);
    rightRings.sort((a, b) => a.initialX - b.initialX);

    // Left panel pleat bounds when fully open: [-0.589, -0.285] (~30cm gathered stack)
    const leftAnchorX = leftRings.length > 0 ? leftRings[0].initialX : -0.589;
    const leftInnerX  = -0.285;
    leftRingsRef.current = leftRings.map((r, i) => {
      const openX = leftRings.length > 1
        ? leftAnchorX + (i / (leftRings.length - 1)) * (leftInnerX - leftAnchorX)
        : leftAnchorX;
      return { ...r, openX };
    });

    // Right panel pleat bounds when fully open: [+0.285, +0.585] (~30cm gathered stack)
    const rightAnchorX = rightRings.length > 0 ? rightRings[rightRings.length - 1].initialX : 0.585;
    const rightInnerX  = 0.285;
    rightRingsRef.current = rightRings.map((r, i) => {
      const openX = rightRings.length > 1
        ? rightInnerX + (i / (rightRings.length - 1)) * (rightAnchorX - rightInnerX)
        : rightAnchorX;
      return { ...r, openX };
    });

    hardwareRef.current   = hardware;
    prevProgressRef.current = -1; // force first-frame update

    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current.uncacheRoot(mixerRef.current.getRoot());
        mixerRef.current = null;
      }
      actionsRef.current   = [];
      leftRingsRef.current = [];
      rightRingsRef.current = [];
      hardwareRef.current  = [];
    };
  }, [root, clips]);

  // ── Per-frame: scrub actions + slide rings ───────────────────────────────
  useFrame(() => {
    const progress = useVisualizerStore.getState().animationState.openProgress ?? 0;
    if (Math.abs(progress - prevProgressRef.current) < 0.0001) return;
    prevProgressRef.current = progress;

    const t = Math.max(0, Math.min(1, progress));

    // 1. Scrub AnimationMixer (fabric morph targets)
    if (actionsRef.current.length > 0 && mixerRef.current) {
      actionsRef.current.forEach(({ action, duration }) => {
        action.paused = false;
        action.time   = t * duration;
      });
      mixerRef.current.update(0);
      actionsRef.current.forEach(({ action }) => { action.paused = true; });
    }

    // 2. Re-lock hardware morph targets (mixer may have touched them)
    hardwareRef.current.forEach((mesh) => {
      for (let i = 0; i < mesh.morphTargetInfluences.length; i++) {
        mesh.morphTargetInfluences[i] = 0;
      }
    });

    // 3. Slide ring empties along the rod in an orderly accordion stack above each pleat
    leftRingsRef.current.forEach(({ node, initialX, openX }) => {
      node.position.x = initialX + (openX - initialX) * t;
    });
    rightRingsRef.current.forEach(({ node, initialX, openX }) => {
      node.position.x = initialX + (openX - initialX) * t;
    });
  });
}
