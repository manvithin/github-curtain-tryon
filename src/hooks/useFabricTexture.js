import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadFabricTexture } from '../utils/textureUtils.js';
import { disposeTexture } from '../utils/disposalUtils.js';
import { useVisualizerStore } from '../store/visualizerStore.js';

/**
 * Custom hook to load and apply fabric textures to targeted curtain meshes.
 * Strictly preserves normal maps, roughness, metalness, and AO properties
 * while safely swapping the diffuse/albedo map and managing texture disposal.
 */
export function useFabricTexture(curtainMeshes, fabric) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const currentTextureRef = useRef(null);
  const showToast = useVisualizerStore((state) => state.showToast);

  useEffect(() => {
    if (!curtainMeshes || curtainMeshes.length === 0 || !fabric?.imageUrl) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const repeatX = fabric.repeatX || 1;
    const repeatY = fabric.repeatY || 1;

    loadFabricTexture(fabric.imageUrl, repeatX, repeatY)
      .then((newTexture) => {
        if (!isMounted) {
          disposeTexture(newTexture);
          return;
        }

        // Dispose previous texture safely
        if (currentTextureRef.current && currentTextureRef.current !== newTexture) {
          disposeTexture(currentTextureRef.current);
        }
        currentTextureRef.current = newTexture;

        // Apply to curtain mesh materials safely
        curtainMeshes.forEach((mesh) => {
          if (!mesh || !mesh.material) return;

          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map((mat) => {
              if (!mat) return mat;
              let targetMat = mat;
              if (!mat.userData?.isClonedForVisualizer) {
                targetMat = mat.clone();
                targetMat.userData = { ...mat.userData, isClonedForVisualizer: true };
              }
              applyTextureToMaterial(targetMat, newTexture);
              return targetMat;
            });
          } else {
            let targetMat = mesh.material;
            if (!mesh.material.userData?.isClonedForVisualizer) {
              targetMat = mesh.material.clone();
              targetMat.userData = { ...mesh.material.userData, isClonedForVisualizer: true };
              mesh.material = targetMat;
            }
            applyTextureToMaterial(targetMat, newTexture);
          }
        });

        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[useFabricTexture] Error applying fabric:', err);
        const msg = err.message || 'Failed to load fabric texture';
        setError(msg);
        showToast(`Could not apply fabric: ${fabric.name || 'selected fabric'}`, 'error');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [curtainMeshes, fabric?.id, fabric?.imageUrl, fabric?.repeatX, fabric?.repeatY]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (currentTextureRef.current) {
        disposeTexture(currentTextureRef.current);
        currentTextureRef.current = null;
      }
    };
  }, []);

  return { isLoading, error };
}

/**
 * Applies texture to a Three.js material while preserving existing PBR maps
 */
function applyTextureToMaterial(material, texture) {
  if (!material) return;

  // Set material diffuse map
  material.map = texture;

  // Set diffuse color to pure white so the fabric texture shows its true, untinted colors
  if (material.color) {
    material.color.set(0xffffff);
  }

  // Ensure appropriate PBR defaults for fabric finish
  if (material.roughness === undefined || material.roughness < 0.6) {
    material.roughness = 0.85; // Natural cloth finish
  }
  if (material.metalness === undefined) {
    material.metalness = 0.0;
  }

  // Ensure double sided rendering for folding curtain pleats
  material.side = THREE.DoubleSide;
  material.needsUpdate = true;
}
