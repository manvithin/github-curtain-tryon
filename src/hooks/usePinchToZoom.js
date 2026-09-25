import { useEffect, useRef } from 'react';
import { useVisualizerStore } from '../store/visualizerStore.js';

/**
 * usePinchToZoom — Midpoint-Centered (Zoom-to-Point) Pinch Gesture Handler.
 *
 * Ensures 2-finger pinch gestures zoom directly into the midpoint between the fingers
 * (native browser zoom-to-point behavior) without snapping or recentering unexpectedly.
 *
 * @param {React.RefObject<HTMLElement>} targetRef - Ref of the touchable viewport container.
 */
export function usePinchToZoom(targetRef) {
  const setBgOffset = useVisualizerStore((state) => state.setBgOffset);
  const touchStateRef = useRef(null);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;

        const rect = el.getBoundingClientRect();
        const currentBg = useVisualizerStore.getState().bgOffset;

        touchStateRef.current = {
          startDist: Math.max(dist, 10),
          startMidX: midX,
          startMidY: midY,
          startScale: currentBg.scale || 1,
          startX: currentBg.x || 0,
          startY: currentBg.y || 0,
          rect
        };
      } else {
        touchStateRef.current = null;
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length !== 2 || !touchStateRef.current) return;

      // Prevent native browser viewport scaling so we handle canvas/room zoom cleanly
      if (e.cancelable) {
        e.preventDefault();
      }

      const { startDist, startMidX, startMidY, startScale, startX, startY, rect } =
        touchStateRef.current;

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
      // newOffset = anchor - (anchor - oldOffset) * (newScale / oldScale) + delta
      const scaleRatio = targetScale / startScale;
      let newX = anchorPercentX - (anchorPercentX - startX) * scaleRatio + deltaX;
      let newY = anchorPercentY - (anchorPercentY - startY) * scaleRatio + deltaY;

      // Clamp within realistic background bounds
      newX = Math.max(-50, Math.min(50, newX));
      newY = Math.max(-50, Math.min(50, newY));

      setBgOffset({
        x: parseFloat(newX.toFixed(2)),
        y: parseFloat(newY.toFixed(2)),
        scale: parseFloat(targetScale.toFixed(3))
      });
    };

    const onTouchEnd = () => {
      touchStateRef.current = null;
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
  }, [targetRef, setBgOffset]);
}
