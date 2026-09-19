import React, { useRef } from 'react';
import { CURTAIN_CONFIG } from '../../config/curtainConfig.js';
import { useVisualizerStore } from '../../store/visualizerStore.js';
import { useCurtainModel } from '../../hooks/useCurtainModel.js';
import { useFabricTexture } from '../../hooks/useFabricTexture.js';
import { useCurtainTransform } from '../../hooks/useCurtainTransform.js';
import { useCurtainAnimation } from '../../hooks/useCurtainAnimation.js';

export function CurtainModel() {
  const groupRef = useRef(null);

  // Load 3D model
  const { scene, animations, curtainMeshes, baseDimensions } = useCurtainModel(CURTAIN_CONFIG.modelUrl);

  // Selected fabric
  const selectedFabric = useVisualizerStore((state) => state.selectedFabric);

  // Apply fabric texture to targeted curtain meshes
  useFabricTexture(curtainMeshes, selectedFabric);

  // Smooth pointer dragging and scaling
  useCurtainTransform(groupRef, baseDimensions);

  // Embedded Blender morph / action open-close animations
  useCurtainAnimation(scene, animations);

  return (
    <>
      {/* Controlled Lighting Setup */}
      <ambientLight intensity={CURTAIN_CONFIG.lighting.ambientIntensity} />
      <directionalLight
        position={CURTAIN_CONFIG.lighting.directionalPosition}
        intensity={CURTAIN_CONFIG.lighting.directionalIntensity}
        castShadow={false}
      />
      <directionalLight position={[-2, 3, -1]} intensity={CURTAIN_CONFIG.lighting.fillIntensity} />
      <hemisphereLight skyColor="#ffffff" groundColor="#333333" intensity={0.4} />

      {/* Main 3D Curtain Model Group */}
      <group ref={groupRef} dispose={null}>
        <primitive object={scene} />
      </group>
    </>
  );
}
