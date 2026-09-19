import React from 'react';
import { Download, X, Check } from 'lucide-react';
import { useVisualizerStore } from '../../store/visualizerStore.js';
import { downloadImage } from '../../utils/imageUtils.js';

export function ExportModal() {
  const isExportModalOpen = useVisualizerStore((state) => state.isExportModalOpen);
  const exportImageUrl = useVisualizerStore((state) => state.exportImageUrl);
  const setExportModal = useVisualizerStore((state) => state.setExportModal);
  const showToast = useVisualizerStore((state) => state.showToast);

  if (!isExportModalOpen || !exportImageUrl) return null;

  const handleDownload = () => {
    downloadImage(exportImageUrl, `curtain-room-preview-${Date.now()}.jpg`);
    showToast('Preview saved to your downloads!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="font-semibold text-neutral-900 text-base">Your Custom Curtain Preview</h3>
          <button
            onClick={() => setExportModal(false)}
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Preview Image */}
        <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-neutral-50">
          <img
            src={exportImageUrl}
            alt="Room with Custom Curtain"
            className="rounded-xl shadow-md max-h-[55vh] object-contain w-auto border border-neutral-200"
          />
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-100 flex items-center justify-end gap-3 bg-white">
          <button
            onClick={() => setExportModal(false)}
            className="px-4 py-2.5 rounded-xl text-neutral-700 hover:bg-neutral-100 text-sm font-medium transition"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-neutral-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium transition shadow-sm active:scale-95"
          >
            <Download size={16} />
            <span>Download Image</span>
          </button>
        </div>
      </div>
    </div>
  );
}
