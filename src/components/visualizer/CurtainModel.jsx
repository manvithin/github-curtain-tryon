import React, { useRef } from 'react';
import * as THREE from 'three';
import { useEffect } from 'react';
import { CURTAIN_CONFIG } from '../../config/curtainConfig.js';
import { useVisualizerStore } from '../../store/visualizerStore.js';
import { useCurtainModel } from '../../hooks/useCurtainModel.js';
import { useFabricTexture } from '../../hooks/useFabricTexture.js';
import { useCurtainTransform } from '../../hooks/useCurtainTransform.js';
import { useCurtainAnimation } from '../../hooks/useCurtainAnimation.js';

/**
 * CurtainModel — Renders the active curtain GLB (single or double layer).
 *
 * Rules of Hooks fix: ALL hooks are called unconditionally at the top level.
 * Conditional logic is inside useEffect / useMemo bodies, never around hook calls.
 */
export function CurtainModel() {
  const groupRef = useRef(null);

  // ── Store selections ───────────────────────────────────────────────────────
  const selectedModel      = useVisualizerStore((s) => s.selectedModel);
  const selectedFabric     = useVisualizerStore((s) => s.selectedFabric);
  const selectedSheerFabric = useVisualizerStore((s) => s.selectedSheerFabric);

  // ── Load the GLB for the currently selected model ──────────────────────────
  // useCurtainModel resolves the correct URL from MODEL_CONFIG[selectedModel]
  const { scene, animations, curtainMeshes, sheerMeshes, baseDimensions } =
    useCurtainModel(undefined, selectedModel);

  // ── Apply main fabric to front curtain meshes (always called — no conditional) ──
  useFabricTexture(curtainMeshes, selectedFabric);

  // ── Apply sheer fabric to sheer meshes (always called — pass empty array when not double) ──
  // When single model → sheerMeshes is [] → useFabricTexture bails out cleanly (no meshes).
  useFabricTexture(
    selectedModel === 'double' ? sheerMeshes : [],
    selectedSheerFabric
  );

  // ── Configure Mat_BackSheer transparency at runtime after model loads ──────
  useEffect(() => {
    if (selectedModel !== 'double' || !scene) return;

    scene.traverse((node) => {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((mat) => {
        if (!mat) return;
        if ((mat.name || '').toLowerCase().includes('backsheer') ||
            (mat.name || '').toLowerCase().includes('voilage') ||
            (mat.name || '').toLowerCase().includes('sheer')) {
          mat.transparent = true;
          mat.opacity     = 0.45;
          mat.depthWrite  = false;
          mat.side        = THREE.DoubleSide;
          mat.needsUpdate = true;
          console.log('[CurtainModel] Sheer transparency applied to:', mat.name);
        }
      });
    });
  }, [scene, selectedModel]);

  // ── Drag / scale interactions ──────────────────────────────────────────────
  useCurtainTransform(groupRef, baseDimensions);

  // ── Play open / close animations ──────────────────────────────────────────
  useCurtainAnimation(scene, animations);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={CURTAIN_CONFIG.lighting.ambientIntensity} />
      <directionalLight
        position={CURTAIN_CONFIG.lighting.directionalPosition}
        intensity={CURTAIN_CONFIG.lighting.directinalIntensity}
        castShadow={false}
      />
      <directionalLight position={[-2, 3, -1]} intensity={CURTAIN_CONFIG.lighting.fillIntensity} />
      <hemisphereLight skyColor="#ffffff" groundColor="#333333" intensity={0.4} />

      {/* 3D Model */}
      <group ref={groupRef} dispose={null}>
        <primitive object={scene} />
      </group>
    </>
  );
}
