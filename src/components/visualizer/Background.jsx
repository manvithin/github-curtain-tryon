import React from 'react';
import { useVisualizerStore } from '../../store/visualizerStore.js';

/**
 * Background room image container.
 * Displays photo with 60fps direct transform support and subtle discovery outline.
 */
export function Background() {
  const backgroundImage = useVisualizerStore((state) => state.backgroundImage);
  const bgOffset = useVisualizerStore((state) => state.bgOffset);
  const selectedLayer = useVisualizerStore((state) => state.selectedLayer);

  if (!backgroundImage?.url) return null;

  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden bg-neutral-950 pointer-events-none select-none">
      <div
        className="relative max-w-full max-h-full flex items-center justify-center transition-opacity duration-300"
        style={{
          width: '100%',
          height: '100%'
        }}
      >
        <img
          id="room-bg-image"
          src={backgroundImage.url}
          alt="Room Background"
          crossOrigin="anonymous"
          className="pointer-events-none select-none max-w-full max-h-full"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transformOrigin: 'center center',
            transform: `translate(${bgOffset.x}%, ${bgOffset.y}%) scale(${bgOffset.scale})`,
            willChange: 'transform'
          }}
        />

        {/* ── Background Layer Outline (Idle vs Active) ── */}
        <div
          className={`absolute inset-0 pointer-events-none transition-all duration-300 ${
            selectedLayer === 'photo'
              ? 'border-2 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
              : 'border border-white/20'
          }`}
        />
      </div>
    </div>
  );
}
