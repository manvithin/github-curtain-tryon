import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Detects whether the current browser environment supports WebGL / WebGL2.
 */
export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

export function WebGLFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-neutral-900 text-white select-none">
      <div className="max-w-md w-full bg-neutral-800/90 border border-neutral-700 p-6 rounded-2xl text-center shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-lg font-bold mb-2">3D Preview Isn't Supported</h2>
        <p className="text-neutral-300 text-sm mb-6 leading-relaxed">
          Your browser or device does not have hardware-accelerated WebGL enabled. To experience the realistic 3D curtain visualizer, please open this link on a modern Chrome, Safari, or Edge browser.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 bg-white text-neutral-900 hover:bg-neutral-100 font-medium px-5 py-2.5 rounded-xl text-sm transition active:scale-95"
        >
          <RefreshCw size={16} />
          <span>Reload Page</span>
        </button>
      </div>
    </div>
  );
}
