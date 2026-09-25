import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCw, Sparkles } from 'lucide-react';
import { useVisualizerStore } from '../../store/visualizerStore.js';
import { CURTAIN_CONFIG } from '../../config/curtainConfig.js';

const CAMERA_Z = CURTAIN_CONFIG.camera.defaultZ; // 4.5
const CAMERA_FOV = CURTAIN_CONFIG.camera.fov; // 45 deg

/**
 * CurtainTransformOverlay — Screen-space Direct Manipulation Transform Controls.
 *
 * Implements:
 * 1. Idle state: subtle 1px outline (40% opacity, no handles)
 * 2. Active state: solid accent outline + 4 corner resize handles + 1 rotate handle
 * 3. 60FPS ref-based handle dragging (corner resize & top rotate)
 * 4. Hit-testing: curtain takes priority over background
 */
export function CurtainTransformOverlay({ containerRef }) {
  const curtain = useVisualizerStore((state) => state.curtain);
  const setCurtainTransform = useVisualizerStore((state) => state.setCurtainTransform);
  const selectedLayer = useVisualizerStore((state) => state.selectedLayer);
  const setSelectedLayer = useVisualizerStore((state) => state.setSelectedLayer);
  const setIsTransforming = useVisualizerStore((state) => state.setIsTransforming);

  const [box, setBox] = useState({ cx: 0, cy: 0, w: 0, h: 0, rot: 0, pxPerMeter: 100 });
  const isDraggingHandleRef = useRef(false);
  const activeHandleTypeRef = useRef(null); // 'se' | 'sw' | 'ne' | 'nw' | 'rotate'
  const handleStartRef = useRef({});

  // Compute 2D screen-space bounds from 3D world parameters
  const updateScreenBounds = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    // In 3D perspective projection at Z=0 plane:
    const visibleWorldHeight = 2 * CAMERA_Z * Math.tan((CAMERA_FOV * Math.PI) / 360);
    const pxPerMeter = rect.height / visibleWorldHeight;

    const cx = rect.width / 2 + curtain.positionX * pxPerMeter;
    const cy = rect.height / 2 - curtain.positionY * pxPerMeter;
    const w = curtain.width * pxPerMeter;
    const h = curtain.height * pxPerMeter;
    const rot = curtain.rotation || 0;

    setBox({ cx, cy, w, h, rot, pxPerMeter });
  }, [containerRef, curtain.positionX, curtain.positionY, curtain.width, curtain.height, curtain.rotation]);

  useEffect(() => {
    updateScreenBounds();
    window.addEventListener('resize', updateScreenBounds);
    return () => window.removeEventListener('resize', updateScreenBounds);
  }, [updateScreenBounds]);

  // ── Handle Pointer Down (Corner Resize / Top Rotate) ───────────────────────
  const onHandlePointerDown = (type, e) => {
    e.stopPropagation();
    e.preventDefault();

    isDraggingHandleRef.current = true;
    activeHandleTypeRef.current = type;
    setIsTransforming(true);

    handleStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: curtain.width,
      startHeight: curtain.height,
      startRotation: curtain.rotation || 0,
      boxCx: box.cx,
      boxCy: box.cy,
      pxPerMeter: box.pxPerMeter
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const onHandlePointerMove = (e) => {
    if (!isDraggingHandleRef.current) return;
    const { startWidth, startHeight, startRotation, boxCx, boxCy, pxPerMeter } =
      handleStartRef.current;
    const type = activeHandleTypeRef.current;

    const rad = (-startRotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    if (type === 'rotate') {
      // Rotate handle logic
      const dx = e.clientX - boxCx;
      const dy = e.clientY - boxCy;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      // Top handle is at -90 deg (12 o'clock)
      let newRot = Math.round((angle + 90) % 360);
      if (newRot > 180) newRot -= 360;
      if (newRot < -180) newRot += 360;

      // Update state live or commit
      setCurtainTransform({ rotation: newRot });
    } else {
      // Corner resize logic (un-rotate pointer relative to box center)
      const dx = e.clientX - boxCx;
      const dy = e.clientY - boxCy;

      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      let newW = Math.abs(localX * 2) / pxPerMeter;
      let newH = Math.abs(localY * 2) / pxPerMeter;

      newW = Math.max(CURTAIN_CONFIG.minWidth, Math.min(CURTAIN_CONFIG.maxWidth, newW));
      newH = Math.max(CURTAIN_CONFIG.minHeight, Math.min(CURTAIN_CONFIG.maxHeight, newH));

      setCurtainTransform({
        width: parseFloat(newW.toFixed(2)),
        height: parseFloat(newH.toFixed(2))
      });
    }
  };

  const onHandlePointerUp = (e) => {
    if (!isDraggingHandleRef.current) return;
    isDraggingHandleRef.current = false;
    activeHandleTypeRef.current = null;
    setIsTransforming(false);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}
  };

  if (!box.w || !box.h) return null;

  const isActive = selectedLayer === 'curtain';

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {/* Oriented Curtain Bounding Box */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (!isActive) setSelectedLayer('curtain');
        }}
        style={{
          position: 'absolute',
          left: `${box.cx}px`,
          top: `${box.cy}px`,
          width: `${box.w}px`,
          height: `${box.h}px`,
          transform: `translate(-50%, -50%) rotate(${box.rot}deg)`,
          transformOrigin: 'center center',
          pointerEvents: isActive ? 'none' : 'auto'
        }}
        className={`transition-colors duration-200 cursor-pointer ${
          isActive
            ? 'border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
            : 'border border-white/40 border-dashed hover:border-amber-400/80'
        }`}
      >
        {/* ── Active Transform Handles (Only when Curtain is Active) ── */}
        {isActive && (
          <>
            {/* Top Rotate Handle + Stem Line */}
            <div className="absolute left-1/2 -top-8 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
              <div
                onPointerDown={(e) => onHandlePointerDown('rotate', e)}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
                onPointerCancel={onHandlePointerUp}
                style={{ touchAction: 'none' }}
                title="Drag to Rotate"
                className="w-8 h-8 -m-2 rounded-full bg-amber-400 hover:bg-amber-300 text-neutral-950 flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing active:scale-110 transition shrink-0"
              >
                <RotateCw size={13} strokeWidth={2.5} />
              </div>
              <div className="w-0.5 h-6 bg-amber-400/90" />
            </div>

            {/* Corner Resize Handle: Top-Left (NW) */}
            <div
              onPointerDown={(e) => onHandlePointerDown('nw', e)}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
              style={{ touchAction: 'none' }}
              className="absolute -top-3 -left-3 w-7 h-7 -m-1 rounded-full bg-white hover:bg-amber-300 border-2 border-amber-500 shadow-md cursor-nwse-resize active:scale-125 transition pointer-events-auto flex items-center justify-center"
            />

            {/* Corner Resize Handle: Top-Right (NE) */}
            <div
              onPointerDown={(e) => onHandlePointerDown('ne', e)}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
              style={{ touchAction: 'none' }}
              className="absolute -top-3 -right-3 w-7 h-7 -m-1 rounded-full bg-white hover:bg-amber-300 border-2 border-amber-500 shadow-md cursor-nesw-resize active:scale-125 transition pointer-events-auto flex items-center justify-center"
            />

            {/* Corner Resize Handle: Bottom-Left (SW) */}
            <div
              onPointerDown={(e) => onHandlePointerDown('sw', e)}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
              style={{ touchAction: 'none' }}
              className="absolute -bottom-3 -left-3 w-7 h-7 -m-1 rounded-full bg-white hover:bg-amber-300 border-2 border-amber-500 shadow-md cursor-nesw-resize active:scale-125 transition pointer-events-auto flex items-center justify-center"
            />

            {/* Corner Resize Handle: Bottom-Right (SE) */}
            <div
              onPointerDown={(e) => onHandlePointerDown('se', e)}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerUp}
              style={{ touchAction: 'none' }}
              className="absolute -bottom-3 -right-3 w-7 h-7 -m-1 rounded-full bg-white hover:bg-amber-300 border-2 border-amber-500 shadow-md cursor-nwse-resize active:scale-125 transition pointer-events-auto flex items-center justify-center"
            />

            {/* Subtle Dimensions Tag on Bounding Box */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900/90 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-white/20 shadow whitespace-nowrap">
              {curtain.width.toFixed(2)}m × {curtain.height.toFixed(2)}m
              {curtain.rotation ? ` • ${Math.round(curtain.rotation)}°` : ''}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
