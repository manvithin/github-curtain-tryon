import React from 'react';
import { Play, RotateCcw, PanelLeftClose, PanelLeftOpen, Loader2 } from 'lucide-react';
import { useVisualizerStore } from '../../store/visualizerStore.js';

export function AnimationControls() {
  const animationState = useVisualizerStore((state) => state.animationState);
  const setAnimationState = useVisualizerStore((state) => state.setAnimationState);

  const { isOpen, openProgress, isAnimating } = animationState;
  const pct = Math.round(openProgress * 100);

  const handleOpen = () => {
    // Trigger open
    const current = openProgress;
    const start = performance.now();
    const duration = 800; // ms

    setAnimationState({ isAnimating: true });

    function tick(now) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const nextProgress = current + (1 - current) * eased;

      setAnimationState({
        openProgress: nextProgress,
        isOpen: nextProgress >= 0.95
      });

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        setAnimationState({ isAnimating: false, openProgress: 1, isOpen: true });
      }
    }

    requestAnimationFrame(tick);
  };

  const handleClose = () => {
    // Trigger close
    const current = openProgress;
    const start = performance.now();
    const duration = 800; // ms

    setAnimationState({ isAnimating: true });

    function tick(now) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const nextProgress = current + (0 - current) * eased;

      setAnimationState({
        openProgress: nextProgress,
        isOpen: nextProgress >= 0.95
      });

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        setAnimationState({ isAnimating: false, openProgress: 0, isOpen: false });
      }
    }

    requestAnimationFrame(tick);
  };

  const handleScrub = (val) => {
    const p = parseFloat(val) / 100;
    setAnimationState({
      openProgress: p,
      isOpen: p >= 0.95,
      isAnimating: false
    });
  };

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Quick Action Open / Close Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Open Button */}
        <button
          onClick={handleOpen}
          disabled={isAnimating || pct >= 99}
          className={`h-13 rounded-2xl font-medium text-sm flex items-center justify-center gap-2.5 transition active:scale-98 shadow-xs border ${
            pct >= 90
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200 hover:border-neutral-300'
          } disabled:opacity-50`}
        >
          {isAnimating && pct < 90 ? (
            <Loader2 size={18} className="animate-spin text-amber-500" />
          ) : (
            <PanelLeftOpen size={18} />
          )}
          <span>{isAnimating && pct < 90 ? 'Opening...' : 'Open Curtain'}</span>
        </button>

        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isAnimating || pct <= 1}
          className={`h-13 rounded-2xl font-medium text-sm flex items-center justify-center gap-2.5 transition active:scale-98 shadow-xs border ${
            pct <= 10
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200 hover:border-neutral-300'
          } disabled:opacity-50`}
        >
          {isAnimating && pct > 10 ? (
            <Loader2 size={18} className="animate-spin text-amber-500" />
          ) : (
            <PanelLeftClose size={18} />
          )}
          <span>{isAnimating && pct > 10 ? 'Closing...' : 'Close Curtain'}</span>
        </button>
      </div>

      {/* Manual Open/Close Scrub Slider */}
      <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-100">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-semibold text-neutral-800">Open Amount</span>
          <span className="text-xs font-bold text-neutral-900 font-mono bg-white px-2 py-0.5 rounded-md border border-neutral-200">
            {pct}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={pct}
          onChange={(e) => handleScrub(e.target.value)}
          className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
        />
        <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
          <span>0% (Closed)</span>
          <span>50%</span>
          <span>100% (Open)</span>
        </div>
      </div>
    </div>
  );
}
