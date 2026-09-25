import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { CURTAIN_CONFIG } from '../../config/curtainConfig.js';
import { useVisualizerStore } from '../../store/visualizerStore.js';
import { useCurtainModel } from '../../hooks/useCurtainModel.js';
import { useFabricTexture } from '../../hooks/useFabricTexture.js';
import { useCurtainTransform } from '../../hooks/useCurtainTransform.js';
import { useCurtainAnimation } from '../../hooks/useCurtainAnimation.js';

/**
 * CurtainModel — Renders the active curtain GLB with direct manipulation
 * and subtle 3D rim glow selection feedback (no DOM bounding boxes or handles).
 */
export function CurtainModel() {
  const groupRef = useRef(null);

  // ── Store selections ───────────────────────────────────────────────────────
  const selectedModel       = useVisualizerStore((s) => s.selectedModel);
  const selectedFabric      = useVisualizerStore((s) => s.selectedFabric);
  const selectedSheerFabric = useVisualizerStore((s) => s.selectedSheerFabric);
  const isCurtainSelected   = useVisualizerStore((s) => s.isCurtainSelected);
  const curtain             = useVisualizerStore((s) => s.curtain);

  // ── Load the GLB for the currently selected model ──────────────────────────
  const { scene, animations, curtainMeshes, sheerMeshes, baseDimensions } =
    useCurtainModel(undefined, selectedModel);

  // ── Apply main fabric to front curtain meshes (always called unconditionally) ──
  useFabricTexture(curtainMeshes, selectedFabric);

  // ── Apply sheer fabric to sheer meshes (for double model) ──────────────────
  useFabricTexture(
    selectedModel === 'double' ? sheerMeshes : [],
    selectedSheerFabric
  );

  // ── Configure Mat_BackSheer transparency at runtime ────────────────────────
  useEffect(() => {
    if (selectedModel !== 'double' || !scene) return;

    scene.traverse((node) => {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((mat) => {
        if (!mat) return;
        if (
          (mat.name || '').toLowerCase().includes('backsheer') ||
          (mat.name || '').toLowerCase().includes('voilage') ||
          (mat.name || '').toLowerCase().includes('sheer')
        ) {
          mat.transparent = true;
          mat.opacity     = 0.45;
          mat.depthWrite  = false;
          mat.side        = THREE.DoubleSide;
          mat.needsUpdate = true;
        }
      });
    });
  }, [scene, selectedModel]);

  // ── 3D Rim Glow on the Curtain when Selected (No DOM Box / Handles) ────────
  useEffect(() => {
    if (!scene) return;
    scene.traverse((node) => {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((mat) => {
        if (!mat || !mat.color) return;
        if (isCurtainSelected) {
          // Subtle warm golden rim glow directly on the fabric pleats
          mat.emissive = new THREE.Color(0x281f0e);
        } else {
          mat.emissive = new THREE.Color(0x000000);
        }
        mat.needsUpdate = true;
      });
    });
  }, [scene, isCurtainSelected]);

  // ── Direct Touch Gesture Interactions (1-finger drag, 2-finger resize/twist, double-tap) ──
  useCurtainTransform(groupRef, baseDimensions);

  // ── Play open / close pleat animations ──────────────────────────────────────
  useCurtainAnimation(scene, animations);

  // ── Explicit single-instance lifecycle management (prevents duplicate curtains) ──
  useEffect(() => {
    const group = groupRef.current;
    if (!group || !scene) return;

    // Clear any existing children to strictly enforce ONE curtain instance in the scene
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    group.add(scene);

    return () => {
      while (group.children.length > 0) {
        group.remove(group.children[0]);
      }
    };
  }, [scene]);

  return (
    <>
      {/* Base Lighting */}
      <ambientLight intensity={CURTAIN_CONFIG.lighting.ambientIntensity} />
      <directionalLight
        position={CURTAIN_CONFIG.lighting.directionalPosition}
        intensity={CURTAIN_CONFIG.lighting.directinalIntensity}
        castShadow={false}
      />
      <directionalLight position={[-2, 3, -1]} intensity={CURTAIN_CONFIG.lighting.fillIntensity} />
      <hemisphereLight skyColor="#ffffff" groundColor="#333333" intensity={0.4} />

      {/* Dynamic 3D Selection Rim Light (Active ONLY when Curtain is selected) */}
      {isCurtainSelected && (
        <>
          <pointLight
            position={[curtain.positionX, curtain.positionY, 1.2]}
            intensity={2.2}
            color="#ffd685"
            distance={4.5}
          />
          <directionalLight
            position={[0, 1, 2.5]}
            intensity={0.7}
            color="#fff0d0"
          />
        </>
      )}

      {/* 3D Curtain Model Group (guaranteed exactly one instance) */}
      <group ref={groupRef} />
    </>
  );
}
