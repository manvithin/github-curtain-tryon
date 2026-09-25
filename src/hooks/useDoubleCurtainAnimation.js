import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useVisualizerStore } from '../store/visualizerStore.js';

/**
 * useDoubleCurtainAnimation — Handles the tie-back ↔ close animation
 * for the Double_Curtain.glb model using pure Three.js positional transforms.
 *
 * WHY NOT ANIMATIONMIXER: Double_Curtain.glb has 0 animation clips and
 * 0 morph targets. The curtain panels are already modeled in the gathered
 * (tied-back) position. We animate by sliding them inward (X axis) to
 * simulate releasing from tie-backs and draping closed.
 *
 * openProgress 0 = Closed (panels at center, tiebacks hidden)
 * openProgress 1 = Tied Back / Open (panels at outer positions, tiebacks visible)
 *
 * Activation: only when selectedModel === 'double'.
 */
export function useDoubleCurtainAnimation(root, selectedModel) {
  // Track discovered panels
  const leftPanelRef      = useRef(null);  // curtain_folded_left node
  const rightPanelRef     = useRef(null);  // curtain_folded_right node
  const tiebacksRef       = useRef([]);    // all TIEBACKS* nodes
  const sheerRef          = useRef(null);  // sheer panel
  const panelDataRef      = useRef(null);  // { leftInitX, rightInitX, leftSheerX }
  const prevProgressRef   = useRef(-1);

  // ── Setup: traverse scene and collect panel nodes ───────────────────────────
  useEffect(() => {
    if (!root || selectedModel !== 'double') return;

    let leftPanel   = null;
    let rightPanel  = null;
    let sheerPanel  = null;
    const tiebacks  = [];

    root.traverse((node) => {
      const name = (node.name || '').toLowerCase();

      if (name.includes('curtain_folded_left') && !name.includes('.002')) {
        leftPanel = node;
      } else if (name.includes('curtain_folded_right') && !name.includes('.002')) {
        rightPanel = node;
      } else if (name.includes('sheer') && !name.includes('.002')) {
        sheerPanel = node;
      } else if (name.includes('tieback') || name.includes('tiebacks')) {
        tiebacks.push(node);
      }
    });

    leftPanelRef.current    = leftPanel;
    rightPanelRef.current   = rightPanel;
    sheerRef.current        = sheerPanel;
    tiebacksRef.current     = tiebacks;

    if (leftPanel && rightPanel) {
      panelDataRef.current = {
        // "Open / Tied-back" resting positions (from GLB)
        leftOpenX:  leftPanel.position.x,   // ~-0.828
        rightOpenX: rightPanel.position.x,  // ~+0.793
        // "Closed / Released" positions — panels meet near center with a small gap
        leftClosedX:  leftPanel.position.x  * 0.08, // near center-left
        rightClosedX: rightPanel.position.x * 0.08, // near center-right
      };

      console.log('[DoubleCurtainAnim] Left panel initial X:', leftPanel.position.x.toFixed(3));
      console.log('[DoubleCurtainAnim] Right panel initial X:', rightPanel.position.x.toFixed(3));
      console.log('[DoubleCurtainAnim] Tiebacks found:', tiebacks.length);
    } else {
      console.warn('[DoubleCurtainAnim] Could not find curtain_folded_left or curtain_folded_right in scene.');
    }

    prevProgressRef.current = -1; // force first-frame recalc

    return () => {
      leftPanelRef.current    = null;
      rightPanelRef.current   = null;
      sheerRef.current        = null;
      tiebacksRef.current     = [];
      panelDataRef.current    = null;
    };
  }, [root, selectedModel]);

  // ── Per-frame: lerp panel positions driven by openProgress ──────────────────
  useFrame(() => {
    if (selectedModel !== 'double') return;

    const progress = useVisualizerStore.getState().animationState.openProgress ?? 0;
    if (Math.abs(progress - prevProgressRef.current) < 0.0005) return;
    prevProgressRef.current = progress;

    const t = Math.max(0, Math.min(1, progress));
    const data = panelDataRef.current;

    // Move left panel: t=0 → center (closed), t=1 → leftOpenX (tied back)
    if (leftPanelRef.current && data) {
      leftPanelRef.current.position.x = THREE.MathUtils.lerp(
        data.leftClosedX,
        data.leftOpenX,
        t
      );
      // Subtle outward lean when tied back — 0° closed, ~8° open
      leftPanelRef.current.rotation.z = THREE.MathUtils.lerp(0, 0.14, t);
    }

    // Move right panel: t=0 → center (closed), t=1 → rightOpenX (tied back)
    if (rightPanelRef.current && data) {
      rightPanelRef.current.position.x = THREE.MathUtils.lerp(
        data.rightClosedX,
        data.rightOpenX,
        t
      );
      // Mirror lean
      rightPanelRef.current.rotation.z = THREE.MathUtils.lerp(0, -0.14, t);
    }

    // Show/hide tiebacks: invisible when closed (t < 0.35), fade in as curtains open
    tiebacksRef.current.forEach((node) => {
      if (node.isMesh) {
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        mats.forEach((mat) => {
          if (!mat) return;
          const targetOpacity = t < 0.35 ? 0 : THREE.MathUtils.mapLinear(t, 0.35, 0.75, 0, 1);
          mat.transparent = true;
          mat.opacity = Math.max(0, Math.min(1, targetOpacity));
          mat.needsUpdate = true;
        });
        node.visible = t > 0.1;
      }
    });

    // Sheer panel: stays centered, but slightly reveals as curtains open
    // (sheer is always visible but its lateral visibility improves when drape panels move aside)
    // No position change needed — it's already centered in the model.
  });
}
