import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useVisualizerStore } from '../store/visualizerStore.js';
import { calculateCurtainScale } from '../utils/modelUtils.js';

const PLANE_Z = 0;
const BOUNDS = {
  minX: -15.0,
  maxX: 15.0,
  minY: -12.0,
  maxY: 12.0
};

/**
 * Hook for smooth, low-latency, mobile-friendly 1-finger pointer dragging
 * and real-world dimension scaling of the 3D curtain.
 */
export function useCurtainTransform(groupRef, baseDimensions) {
  const { camera, gl } = useThree();
  const curtain = useVisualizerStore((state) => state.curtain);
  const setCurtainTransform = useVisualizerStore((state) => state.setCurtainTransform);

  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef(new THREE.Vector3());
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), -PLANE_Z));
  const raycasterRef = useRef(new THREE.Raycaster());
  const ndcRef = useRef(new THREE.Vector2());
  const hitRef = useRef(new THREE.Vector3());

  // 1. Update scale directly when width / height change
  useEffect(() => {
    if (!groupRef.current || !baseDimensions) return;

    const { scaleX, scaleY, scaleZ } = calculateCurtainScale(baseDimensions, {
      width: curtain.width,
      height: curtain.height
    });

    groupRef.current.scale.set(scaleX, scaleY, scaleZ);
  }, [curtain.width, curtain.height, baseDimensions, groupRef]);

  // 2. Sync initial position and rotation from state
  useEffect(() => {
    if (!groupRef.current) return;
    if (!isDraggingRef.current) {
      groupRef.current.position.set(curtain.positionX, curtain.positionY, PLANE_Z);
      groupRef.current.rotation.z = (curtain.rotation || 0) * (Math.PI / 180);
    }
  }, [curtain.positionX, curtain.positionY, curtain.rotation, groupRef]);

  // Raycast helper to intersect pointer with the Z=0 plane
  const getPlaneIntersection = useCallback(
    (clientX, clientY) => {
      const dom = gl.domElement;
      const rect = dom.getBoundingClientRect();

      ndcRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndcRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(ndcRef.current, camera);
      const hit = raycasterRef.current.ray.intersectPlane(planeRef.current, hitRef.current);
      return hit ? hit.clone() : null;
    },
    [camera, gl.domElement]
  );

  // Pointer event handlers attached to the canvas
  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e) => {
      // Only drag on left click or single touch
      if (e.button !== undefined && e.button !== 0) return;
      if (!groupRef.current) return;

      const hit = getPlaneIntersection(e.clientX, e.clientY);
      if (!hit) return;

      // Check if click is reasonably near the curtain or anywhere on canvas
      dragOffsetRef.current.set(
        hit.x - groupRef.current.position.x,
        hit.y - groupRef.current.position.y,
        0
      );

      isDraggingRef.current = true;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {}
    };

    const onPointerMove = (e) => {
      if (!isDraggingRef.current || !groupRef.current) return;

      const hit = getPlaneIntersection(e.clientX, e.clientY);
      if (!hit) return;

      // Calculate new position
      let newX = hit.x - dragOffsetRef.current.x;
      let newY = hit.y - dragOffsetRef.current.y;

      // Clamp to viewport boundary limits
      newX = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, newX));
      newY = Math.max(BOUNDS.minY, Math.min(BOUNDS.maxY, newY));

      // Direct ref update (avoids React re-renders during 60fps drag)
      groupRef.current.position.x = newX;
      groupRef.current.position.y = newY;
    };

    const onPointerUp = (e) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}

      // Commit final position to Zustand store on drag end
      if (groupRef.current) {
        setCurtainTransform({
          positionX: groupRef.current.position.x,
          positionY: groupRef.current.position.y
        });
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [getPlaneIntersection, gl.domElement, groupRef, setCurtainTransform]);

  return { isDragging: isDraggingRef.current };
}
