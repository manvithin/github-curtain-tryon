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

    // Compute the anchor positions (where rings cluster when fully open)
    const leftAnchorX  = leftRings.length  > 0 ? Math.min(...leftRings.map((r)  => r.initialX)) : -0.6;
    const rightAnchorX = rightRings.length > 0 ? Math.max(...rightRings.map((r) => r.initialX)) :  0.6;

    leftRingsRef.current  = leftRings.map((r)  => ({ ...r, anchorX: leftAnchorX  }));
    rightRingsRef.current = rightRings.map((r) => ({ ...r, anchorX: rightAnchorX }));
    hardwareRef.current   = hardware;
    prevProgressRef.current = -1; // force first-frame update

    console.log(
      `[CurtainAnim] clips=${matched.length}  leftRings=${leftRings.length}  rightRings=${rightRings.length}`,
      `leftAnchor=${leftAnchorX.toFixed(3)}  rightAnchor=${rightAnchorX.toFixed(3)}`
    );

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

    // 3. Slide ring empties along the rod
    //    Left rings move toward anchorX (leftmost) as t → 1
    leftRingsRef.current.forEach(({ node, initialX, anchorX }) => {
      node.position.x = initialX + (anchorX - initialX) * t;
    });
    //    Right rings move toward anchorX (rightmost) as t → 1
    rightRingsRef.current.forEach(({ node, initialX, anchorX }) => {
      node.position.x = initialX + (anchorX - initialX) * t;
    });
  });
}
