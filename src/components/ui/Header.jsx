import React from 'react';
import { ArrowLeft, Download, RotateCcw, Sparkles } from 'lucide-react';
import { useVisualizerStore } from '../../store/visualizerStore.js';
import { compositePreview } from '../../utils/imageUtils.js';

export function Header() {
  const setStep = useVisualizerStore((state) => state.setStep);
  const resetCurtainTransform = useVisualizerStore((state) => state.resetCurtainTransform);
  const backgroundImage = useVisualizerStore((state) => state.backgroundImage);
  const setExportModal = useVisualizerStore((state) => state.setExportModal);
  const showToast = useVisualizerStore((state) => state.showToast);

  const handleExport = async () => {
    try {
      const canvas = document.querySelector('canvas');
      if (!canvas || !backgroundImage?.url) {
        showToast('Unable to capture preview. Scene not ready.', 'error');
        return;
      }

      showToast('Generating high-resolution preview...', 'info', 2000);
      const compositeDataUrl = await compositePreview(backgroundImage.url, canvas);
      setExportModal(true, compositeDataUrl);
    } catch (err) {
      console.error('Export error:', err);
      showToast('Failed to generate preview image.', 'error');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs select-none transition-all">
      {/* ── Status Bar Grace Space with Studio Name Banner ── */}
      <div className="w-full flex items-center justify-center pt-[max(env(safe-area-inset-top,0px),8px)] pb-1 px-4 bg-neutral-900 text-white">
        <div className="flex items-center gap-1.5 py-0.5 opacity-95">
          <Sparkles size={12} className="text-amber-400 shrink-0" />
          <span className="text-[10px] sm:text-xs font-bold tracking-[0.18em] uppercase text-neutral-100 font-mono">
            RUAM CURTAIN VISUALIZER
          </span>
        </div>
      </div>

      {/* ── Action Navigation Row (Comfortably below phone status bar) ── */}
      <div className="h-13 sm:h-14 px-3 sm:px-5 flex items-center justify-between">
        {/* Left: Change Room Photo Button */}
        <button
          onClick={() => setStep('upload')}
          style={{ touchAction: 'manipulation' }}
          className="flex items-center gap-1.5 py-2 px-3 rounded-xl text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 active:bg-neutral-200/70 transition duration-150 active:scale-95 text-xs sm:text-sm font-semibold min-h-[44px]"
          title="Change Room Photo"
        >
          <ArrowLeft size={18} className="text-neutral-800" />
          <span>Change Photo</span>
        </button>

        {/* Right: Reset & Export Actions */}
        <div className="flex items-center gap-2">
          {/* Reset Curtain Button */}
          <button
            onClick={() => {
              resetCurtainTransform();
              showToast('Curtain reset to center', 'info', 2000);
            }}
            style={{ touchAction: 'manipulation' }}
            className="p-2.5 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 active:bg-neutral-200 transition duration-150 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Reset position & size"
          >
            <RotateCcw size={18} />
          </button>

          {/* Save / Export Preview Button */}
          <button
            onClick={handleExport}
            style={{ touchAction: 'manipulation' }}
            className="flex items-center gap-1.5 bg-neutral-900 hover:bg-black active:bg-neutral-800 text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition duration-150 shadow-xs active:scale-95 min-h-[44px]"
          >
            <Download size={15} className="text-neutral-200" />
            <span>Save Preview</span>
          </button>
        </div>
      </div>
    </header>
  );
}
