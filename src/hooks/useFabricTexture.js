import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadFabricTexture } from '../utils/textureUtils.js';
import { disposeTexture } from '../utils/disposalUtils.js';

/**
 * Custom hook to load and apply fabric textures to targeted curtain meshes.
 * Strictly preserves normal maps, roughness, metalness, and AO properties
 * while safely swapping the diffuse/albedo map and managing texture disposal.
 */
export function useFabricTexture(curtainMeshes, fabric) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const currentTextureRef = useRef(null);

  useEffect(() => {
    if (!curtainMeshes || curtainMeshes.length === 0 || !fabric?.imageUrl) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const repeatX = fabric.repeatX || 4;
    const repeatY = fabric.repeatY || 4;

    loadFabricTexture(fabric.imageUrl, repeatX, repeatY)
      .then((newTexture) => {
        if (!isMounted) {
          disposeTexture(newTexture);
          return;
        }

        // Dispose previous texture
        if (currentTextureRef.current && currentTextureRef.current !== newTexture) {
          disposeTexture(currentTextureRef.current);
        }
        currentTextureRef.current = newTexture;

        // Apply to curtain mesh materials
        curtainMeshes.forEach((mesh) => {
          if (!mesh) return;

          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

          materials.forEach((mat) => {
            if (!mat) return;

            // Clone material if it is shared, to avoid modifying original GLTF cache
            if (!mat.userData?.isClonedForVisualizer) {
              const cloned = mat.clone();
              cloned.userData = { ...mat.userData, isClonedForVisualizer: true };
              mesh.material = cloned;
              applyTextureToMaterial(cloned, newTexture);
            } else {
              applyTextureToMaterial(mat, newTexture);
            }
          });
        });

        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[useFabricTexture] Error applying fabric:', err);
        setError(err.message || 'Failed to load fabric texture');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [curtainMeshes, fabric?.imageUrl, fabric?.repeatX, fabric?.repeatY]);

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
  // Set material map
  material.map = texture;

  // Set diffuse color to pure white so the fabric texture shows its true, untinted colors
  if (material.color) {
    material.color.set(0xffffff);
  }

  // Ensure appropriate PBR defaults if missing
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
