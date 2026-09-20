import React from 'react';
import { useVisualizerStore } from '../../store/visualizerStore.js';

/**
 * Background room image container.
 * Uses object-contain so the room photo displays in its original uncropped aspect ratio
 * without forced zoom or distortion. User can still pan/zoom via controls if desired.
 */
export function Background() {
  const backgroundImage = useVisualizerStore((state) => state.backgroundImage);
  const bgOffset = useVisualizerStore((state) => state.bgOffset);

  if (!backgroundImage?.url) return null;

  return (
    <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden bg-neutral-900 pointer-events-none select-none">
      <img
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
    </div>
  );
}
