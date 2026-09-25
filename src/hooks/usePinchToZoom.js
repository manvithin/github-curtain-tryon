import { useEffect, useRef } from 'react';
import { useVisualizerStore } from '../store/visualizerStore.js';

/**
 * usePinchToZoom — Midpoint-Centered Background Photo Gesture Controller.
 *
 * When selectedLayer === 'photo':
 * - 1-finger drag pans the photo
 * - 2-finger pinch zooms the photo directly centered at the fingers' midpoint
 * - Ref-based 60fps mutation with single state commit on touch end to avoid jitter
 *
 * @param {React.RefObject<HTMLElement>} targetRef
 */
export function usePinchToZoom(targetRef) {
  const setBgOffset = useVisualizerStore((state) => state.setBgOffset);
  const setIsTransforming = useVisualizerStore((state) => state.setIsTransforming);

  const gestureStateRef = useRef(null);
  const currentOffsetRef = useRef({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    // Synchronize initial offset
    const initialBg = useVisualizerStore.getState().bgOffset;
    currentOffsetRef.current = { ...initialBg };

    const onTouchStart = (e) => {
      const selectedLayer = useVisualizerStore.getState().selectedLayer;
      const currentBg = useVisualizerStore.getState().bgOffset;
      currentOffsetRef.current = { ...currentBg };

      const rect = el.getBoundingClientRect();

      if (e.touches.length === 2) {
        // 2-Finger Pinch Zoom (Active in 'photo' mode or viewport zoom)
        if (selectedLayer !== 'photo') return;

        setIsTransforming(true);
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;

        gestureStateRef.current = {
          type: 'pinch',
          startDist: Math.max(dist, 10),
          startMidX: midX,
          startMidY: midY,
          startScale: currentBg.scale || 1,
          startX: currentBg.x || 0,
          startY: currentBg.y || 0,
          rect
        };
      } else if (e.touches.length === 1 && selectedLayer === 'photo') {
        // 1-Finger Pan (Only in 'photo' mode)
        setIsTransforming(true);
        const t = e.touches[0];
        gestureStateRef.current = {
          type: 'pan',
          startX: t.clientX,
          startY: t.clientY,
          startBgX: currentBg.x || 0,
          startBgY: currentBg.y || 0,
          rect
        };
      } else {
        gestureStateRef.current = null;
      }
    };

    const onTouchMove = (e) => {
      if (!gestureStateRef.current) return;
      const selectedLayer = useVisualizerStore.getState().selectedLayer;
      if (selectedLayer !== 'photo') return;

      if (e.cancelable) e.preventDefault();

      if (gestureStateRef.current.type === 'pinch' && e.touches.length === 2) {
        const { startDist, startMidX, startMidY, startScale, startX, startY, rect } =
          gestureStateRef.current;

        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const currentMidX = (t1.clientX + t2.clientX) / 2;
        const currentMidY = (t1.clientY + t2.clientY) / 2;

        const scaleFactor = currentDist / startDist;
        const targetScale = Math.min(3.5, Math.max(0.5, startScale * scaleFactor));

        // Pinch midpoint in percentage relative to container center (-50% to +50%)
        const anchorPercentX = ((startMidX - rect.left) / rect.width - 0.5) * 100;
        const anchorPercentY = ((startMidY - rect.top) / rect.height - 0.5) * 100;

        // Translation delta of the pinch center in %
        const deltaX = ((currentMidX - startMidX) / rect.width) * 100;
        const deltaY = ((currentMidY - startMidY) / rect.height) * 100;

        // True zoom-to-point anchor preservation formula:
        const scaleRatio = targetScale / startScale;
        let newX = anchorPercentX - (anchorPercentX - startX) * scaleRatio + deltaX;
        let newY = anchorPercentY - (anchorPercentY - startY) * scaleRatio + deltaY;

        newX = Math.max(-50, Math.min(50, newX));
        newY = Math.max(-50, Math.min(50, newY));

        currentOffsetRef.current = {
          x: parseFloat(newX.toFixed(2)),
          y: parseFloat(newY.toFixed(2)),
          scale: parseFloat(targetScale.toFixed(3))
        };

        // Directly update background DOM element for 60fps rendering without re-rendering entire app
        const bgImg = document.getElementById('room-bg-image');
        if (bgImg) {
          bgImg.style.transform = `translate(${newX}%, ${newY}%) scale(${targetScale})`;
        }
      } else if (gestureStateRef.current.type === 'pan' && e.touches.length === 1) {
        const { startX, startY, startBgX, startBgY, rect } = gestureStateRef.current;
        const t = e.touches[0];

        const deltaX = ((t.clientX - startX) / rect.width) * 100;
        const deltaY = ((t.clientY - startY) / rect.height) * 100;

        let newX = Math.max(-50, Math.min(50, startBgX + deltaX));
        let newY = Math.max(-50, Math.min(50, startBgY + deltaY));

        currentOffsetRef.current = {
          ...currentOffsetRef.current,
          x: parseFloat(newX.toFixed(2)),
          y: parseFloat(newY.toFixed(2))
        };

        const bgImg = document.getElementById('room-bg-image');
        if (bgImg) {
          bgImg.style.transform = `translate(${newX}%, ${newY}%) scale(${currentOffsetRef.current.scale})`;
        }
      }
    };

    const onTouchEnd = () => {
      if (gestureStateRef.current) {
        gestureStateRef.current = null;
        setIsTransforming(false);

        // Commit final background pan & zoom state ONCE to Zustand store
        setBgOffset({ ...currentOffsetRef.current });
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [targetRef, setBgOffset, setIsTransforming]);
}
