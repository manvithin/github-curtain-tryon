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
  maxY: 12.0,
  minWidth: 0.2,
  maxWidth: 12.0,
  minHeight: 0.3,
  maxHeight: 8.0
};

/**
 * useCurtainTransform — High-Performance Ref-Based Direct Manipulation Hook.
 *
 * Handles:
 * 1. 1-finger move (position)
 * 2. 2-finger pinch (resize width/height)
 * 3. 2-finger twist (rotate)
 * 4. Double-tap detection (<300ms, <10px) to toggle open/close animation
 * 5. 60FPS direct Three.js scene graph mutation (commits to React/Zustand state ONCE on pointerup)
 * 6. Layer routing: respects selectedLayer ('curtain' vs 'photo')
 */
export function useCurtainTransform(groupRef, baseDimensions) {
  const { camera, gl } = useThree();

  const curtain = useVisualizerStore((state) => state.curtain);
  const setCurtainTransform = useVisualizerStore((state) => state.setCurtainTransform);
  const selectedLayer = useVisualizerStore((state) => state.selectedLayer);
  const setSelectedLayer = useVisualizerStore((state) => state.setSelectedLayer);
  const setIsTransforming = useVisualizerStore((state) => state.setIsTransforming);

  // Gesture state tracking refs
  const isDraggingRef = useRef(false);
  const isPinchingRef = useRef(false);
  const dragOffsetRef = useRef(new THREE.Vector3());
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), -PLANE_Z));
  const raycasterRef = useRef(new THREE.Raycaster());
  const ndcRef = useRef(new THREE.Vector2());
  const hitRef = useRef(new THREE.Vector3());

  // Active transform numbers in refs for 60fps non-re-rendering tracking
  const currentTransformRef = useRef({
    x: curtain.positionX,
    y: curtain.positionY,
    width: curtain.width,
    height: curtain.height,
    rotation: curtain.rotation || 0
  });

  // Pinch / Twist start refs
  const pinchStartRef = useRef({
    dist: 0,
    distX: 0,
    distY: 0,
    angle: 0,
    startWidth: curtain.width,
    startHeight: curtain.height,
    startRotation: curtain.rotation || 0
  });

  // Double tap detection refs
  const lastTapTimeRef = useRef(0);
  const lastTapPosRef = useRef({ x: 0, y: 0 });

  // 1. Synchronize initial scale when width/height/baseDimensions change from state
  useEffect(() => {
    if (!groupRef.current || !baseDimensions) return;
    currentTransformRef.current.width = curtain.width;
    currentTransformRef.current.height = curtain.height;

    const { scaleX, scaleY, scaleZ } = calculateCurtainScale(baseDimensions, {
      width: curtain.width,
      height: curtain.height
    });

    groupRef.current.scale.set(scaleX, scaleY, scaleZ);
  }, [curtain.width, curtain.height, baseDimensions, groupRef]);

  // 2. Synchronize initial position & rotation from state
  useEffect(() => {
    if (!groupRef.current) return;
    if (!isDraggingRef.current && !isPinchingRef.current) {
      currentTransformRef.current.x = curtain.positionX;
      currentTransformRef.current.y = curtain.positionY;
      currentTransformRef.current.rotation = curtain.rotation || 0;

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

  // Trigger smooth curtain animation open/close on double tap
  const triggerAnimationToggle = useCallback(() => {
    const anim = useVisualizerStore.getState().animationState;
    if (anim.isAnimating) return;

    const targetOpen = anim.openProgress < 0.5;
    const fromProgress = anim.openProgress;
    const start = performance.now();
    const duration = 500;

    useVisualizerStore.getState().setAnimationState({ isAnimating: true });

    function tick(now) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const nextProgress = fromProgress + (targetOpen ? 1 - fromProgress : -fromProgress) * eased;

      useVisualizerStore.getState().setAnimationState({
        openProgress: nextProgress,
        isOpen: nextProgress >= 0.95
      });

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        useVisualizerStore.getState().setAnimationState({
          isAnimating: false,
          openProgress: targetOpen ? 1 : 0,
          isOpen: targetOpen
        });
      }
    }

    requestAnimationFrame(tick);
    useVisualizerStore.getState().showToast(
      targetOpen ? 'Opening curtain pleats' : 'Closing curtain pleats',
      'info',
      1500
    );
  }, []);

  // Attach pointer & touch event listeners for 60FPS ref-based direct manipulation
  useEffect(() => {
    const canvas = gl.domElement;

    // Pointer Down (Mouse & 1-Finger Touch)
    const onPointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      if (!groupRef.current) return;

      const hit = getPlaneIntersection(e.clientX, e.clientY);
      if (!hit) return;

      // Check double-tap threshold (<300ms, <10px)
      const now = performance.now();
      const timeDiff = now - lastTapTimeRef.current;
      const distDiff = Math.hypot(e.clientX - lastTapPosRef.current.x, e.clientY - lastTapPosRef.current.y);

      if (timeDiff < 300 && distDiff < 15) {
        // Double-tap detected on curtain!
        triggerAnimationToggle();
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;
      lastTapPosRef.current = { x: e.clientX, y: e.clientY };

      // Ensure curtain is active layer
      if (useVisualizerStore.getState().selectedLayer !== 'curtain') {
        setSelectedLayer('curtain');
      }

      // Secondary touch during pinch handled in touch listeners
      if (e.isPrimary === false) {
        isDraggingRef.current = false;
        return;
      }

      dragOffsetRef.current.set(
        hit.x - groupRef.current.position.x,
        hit.y - groupRef.current.position.y,
        0
      );

      isDraggingRef.current = true;
      setIsTransforming(true);

      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {}
    };

    // Pointer Move (1-Finger Drag)
    const onPointerMove = (e) => {
      if (!isDraggingRef.current || !groupRef.current) return;
      if (e.isPrimary === false) return;

      const hit = getPlaneIntersection(e.clientX, e.clientY);
      if (!hit) return;

      let newX = hit.x - dragOffsetRef.current.x;
      let newY = hit.y - dragOffsetRef.current.y;

      newX = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, newX));
      newY = Math.max(BOUNDS.minY, Math.min(BOUNDS.maxY, newY));

      // Direct ref mutation on Three.js object — 0 React re-renders!
      groupRef.current.position.x = newX;
      groupRef.current.position.y = newY;

      currentTransformRef.current.x = newX;
      currentTransformRef.current.y = newY;
    };

    // Pointer Up (Commit final position ONCE to React state)
    const onPointerUp = (e) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsTransforming(false);

      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}

      if (groupRef.current) {
        setCurtainTransform({
          positionX: currentTransformRef.current.x,
          positionY: currentTransformRef.current.y
        });
      }
    };

    // ── 2-Finger Pinch & Twist on Curtain ─────────────────────────────────────
    const onTouchStart = (e) => {
      if (e.touches.length === 2 && useVisualizerStore.getState().selectedLayer === 'curtain') {
        isDraggingRef.current = false;
        isPinchingRef.current = true;
        setIsTransforming(true);

        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const dx = Math.abs(t2.clientX - t1.clientX);
        const dy = Math.abs(t2.clientY - t1.clientY);
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);

        pinchStartRef.current = {
          dist: Math.max(dist, 10),
          distX: Math.max(dx, 10),
          distY: Math.max(dy, 10),
          angle,
          startWidth: currentTransformRef.current.width,
          startHeight: currentTransformRef.current.height,
          startRotation: currentTransformRef.current.rotation
        };
      }
    };

    const onTouchMove = (e) => {
      if (!isPinchingRef.current || e.touches.length !== 2 || !groupRef.current || !baseDimensions) return;

      if (e.cancelable) e.preventDefault();

      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const currentAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
      const currentDx = Math.abs(t2.clientX - t1.clientX);
      const currentDy = Math.abs(t2.clientY - t1.clientY);

      const { dist, distX, distY, angle, startWidth, startHeight, startRotation } = pinchStartRef.current;

      // Scale ratio
      const scaleRatio = currentDist / dist;
      const scaleXRatio = currentDx / distX;
      const scaleYRatio = currentDy / distY;

      // If pinch is predominantly horizontal vs vertical vs proportional
      let newW = startWidth * (scaleXRatio * 0.7 + scaleRatio * 0.3);
      let newH = startHeight * (scaleYRatio * 0.7 + scaleRatio * 0.3);

      newW = Math.max(BOUNDS.minWidth, Math.min(BOUNDS.maxWidth, newW));
      newH = Math.max(BOUNDS.minHeight, Math.min(BOUNDS.maxHeight, newH));

      // Rotation angle delta
      let angleDelta = currentAngle - angle;
      if (angleDelta > 180) angleDelta -= 360;
      if (angleDelta < -180) angleDelta += 360;

      // Only apply rotation if twist exceeds small deadzone
      let newRot = startRotation;
      if (Math.abs(angleDelta) > 4) {
        newRot = (startRotation + angleDelta) % 360;
      }

      // Direct Three.js ref mutation — 0 React re-renders!
      const { scaleX, scaleY, scaleZ } = calculateCurtainScale(baseDimensions, {
        width: newW,
        height: newH
      });
      groupRef.current.scale.set(scaleX, scaleY, scaleZ);
      groupRef.current.rotation.z = newRot * (Math.PI / 180);

      currentTransformRef.current.width = newW;
      currentTransformRef.current.height = newH;
      currentTransformRef.current.rotation = newRot;
    };

    const onTouchEnd = () => {
      if (isPinchingRef.current) {
        isPinchingRef.current = false;
        setIsTransforming(false);

        // Commit final width, height, rotation ONCE on touch end
        setCurtainTransform({
          width: parseFloat(currentTransformRef.current.width.toFixed(2)),
          height: parseFloat(currentTransformRef.current.height.toFixed(2)),
          rotation: parseFloat(currentTransformRef.current.rotation.toFixed(1))
        });
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });

    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      canvas.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [getPlaneIntersection, gl.domElement, groupRef, baseDimensions, setCurtainTransform, setSelectedLayer, setIsTransforming, triggerAnimationToggle]);

  return { isDragging: isDraggingRef.current, isPinching: isPinchingRef.current };
}
