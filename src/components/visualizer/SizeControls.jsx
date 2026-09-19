import React from 'react';
import { RotateCcw, Maximize2 } from 'lucide-react';
import { useVisualizerStore } from '../../store/visualizerStore.js';
import { CURTAIN_CONFIG } from '../../config/curtainConfig.js';

export function SizeControls() {
  const curtain = useVisualizerStore((state) => state.curtain);
  const setCurtainTransform = useVisualizerStore((state) => state.setCurtainTransform);

  const { minWidth, maxWidth, minHeight, maxHeight, defaultWidth, defaultHeight } = CURTAIN_CONFIG;

  const handleWidthChange = (val) => {
    setCurtainTransform({ width: parseFloat(val) });
  };

  const handleHeightChange = (val) => {
    setCurtainTransform({ height: parseFloat(val) });
  };

  const handleResetSize = () => {
    setCurtainTransform({
      width: defaultWidth,
      height: defaultHeight
    });
  };

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Header info */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500 font-medium">Curtain Dimensions</span>
        <button
          onClick={handleResetSize}
          className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 transition font-medium"
        >
          <RotateCcw size={13} />
          <span>Reset Size</span>
        </button>
      </div>

      {/* Width Slider */}
      <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-semibold text-neutral-800">Width</span>
          <span className="text-xs font-bold text-neutral-900 font-mono bg-white px-2 py-0.5 rounded-md border border-neutral-200">
            {curtain.width.toFixed(2)} m
          </span>
        </div>
        <input
          type="range"
          min={minWidth}
          max={maxWidth}
          step="0.05"
          value={curtain.width}
          onChange={(e) => handleWidthChange(e.target.value)}
          style={{ touchAction: 'pan-x' }}
          className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
        />
        <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
          <span>{minWidth} m</span>
          <span>{maxWidth} m</span>
        </div>
      </div>

      {/* Height Slider */}
      <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-semibold text-neutral-800">Height</span>
          <span className="text-xs font-bold text-neutral-900 font-mono bg-white px-2 py-0.5 rounded-md border border-neutral-200">
            {curtain.height.toFixed(2)} m
          </span>
        </div>
        <input
          type="range"
          min={minHeight}
          max={maxHeight}
          step="0.05"
          value={curtain.height}
          onChange={(e) => handleHeightChange(e.target.value)}
          style={{ touchAction: 'pan-x' }}
          className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
        />
        <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
          <span>{minHeight} m</span>
          <span>{maxHeight} m</span>
        </div>
      </div>
    </div>
  );
}
