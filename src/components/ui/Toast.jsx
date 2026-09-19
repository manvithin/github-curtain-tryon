import React from 'react';
import { useVisualizerStore } from '../../store/visualizerStore.js';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function Toast() {
  const toast = useVisualizerStore((state) => state.toast);
  const hideToast = useVisualizerStore((state) => state.hideToast);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />,
    error: <AlertCircle className="text-rose-600 shrink-0" size={18} />,
    info: <Info className="text-blue-600 shrink-0" size={18} />
  };

  const bgStyles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    error: 'bg-rose-50 border-rose-200 text-rose-950',
    info: 'bg-neutral-900 text-white border-neutral-800'
  };

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-lg max-w-sm w-[90%] text-sm font-medium transition-all animate-in fade-in slide-in-from-top-4 duration-200 select-none">
      <div className={`flex items-center gap-2.5 w-full ${bgStyles[toast.type] || bgStyles.info} px-3 py-2 rounded-lg`}>
        {icons[toast.type] || icons.info}
        <span className="flex-1 text-xs sm:text-sm leading-tight">{toast.message}</span>
        <button onClick={hideToast} className="p-0.5 opacity-70 hover:opacity-100 transition">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
