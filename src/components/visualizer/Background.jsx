import React from 'react';
import { useVisualizerStore } from '../../store/visualizerStore.js';

/**
 * Background room image container.
 * Uses object-cover + CSS transform (translate + scale) driven by Zustand bgOffset
 * so the user can pan and zoom the background photo to align it with their room.
 */
export function Background() {
  const backgroundImage = useVisualizerStore((state) => state.backgroundImage);
  const bgOffset = useVisualizerStore((state) => state.bgOffset);

  if (!backgroundImage?.url) return null;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
      <img
        src={backgroundImage.url}
        alt="Room Background"
        crossOrigin="anonymous"
        className="pointer-events-none select-none"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transformOrigin: 'center center',
          transform: `translate(${bgOffset.x}%, ${bgOffset.y}%) scale(${bgOffset.scale})`,
          willChange: 'transform'
        }}
      />
    </div>
  );
}
