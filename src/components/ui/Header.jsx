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
    <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-white/90 backdrop-blur-md border-b border-neutral-200 px-4 flex items-center justify-between shadow-xs select-none">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStep('upload')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition active:scale-95 text-sm font-medium"
          title="Change Room Photo"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">Change Photo</span>
        </button>
        <span className="text-neutral-300">|</span>
        <div className="flex items-center gap-1.5">
          <Sparkles size={16} className="text-amber-600" />
          <h1 className="text-sm font-semibold text-neutral-900 tracking-tight">Curtain Studio</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            resetCurtainTransform();
            showToast('Curtain reset to default position & scale', 'info', 2000);
          }}
          className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition active:scale-95"
          title="Reset position & size"
        >
          <RotateCcw size={18} />
        </button>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 bg-neutral-900 hover:bg-black text-white px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition shadow-xs active:scale-95"
        >
          <Download size={15} />
          <span>Save Preview</span>
        </button>
      </div>
    </header>
  );
}
