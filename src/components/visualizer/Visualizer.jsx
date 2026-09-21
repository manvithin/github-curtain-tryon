import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { CURTAIN_CONFIG, MODEL_CONFIG } from '../../config/curtainConfig.js';
import { useVisualizerStore } from '../../store/visualizerStore.js';
import { Background } from './Background.jsx';
import { CurtainModel } from './CurtainModel.jsx';
import { CurtainControls } from './CurtainControls.jsx';
import { Header } from '../ui/Header.jsx';
import { ExportModal } from '../ui/ExportModal.jsx';
import { Loader2 } from 'lucide-react';

function CanvasLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-xs z-10 select-none pointer-events-none">
      <div className="bg-white/90 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-white/60">
        <Loader2 className="animate-spin text-neutral-800" size={20} />
        <span className="text-sm font-medium text-neutral-800">Loading 3D Curtain...</span>
      </div>
    </div>
  );
}

export function Visualizer() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-900 flex flex-col select-none">
      {/* Top Header with Status Bar Grace Area & Action Row */}
      <Header />

      {/* ── Main Viewport below header ── */}
      <div className="flex-1 relative mt-[calc(max(env(safe-area-inset-top,0px),8px)+56px)] overflow-hidden flex flex-col sm:flex-row">

        {/* ── DESKTOP: right sidebar ── */}
        <div className="hidden sm:flex sm:flex-col sm:w-96 sm:h-full sm:border-l sm:border-neutral-200/80 bg-white z-20 order-last">
          <CurtainControls />
        </div>

        {/* ── 3D Viewport (fills full area) ── */}
        <div className="relative flex-1 w-full h-full overflow-hidden">
          {/* Room Background Photo */}
          <Background />

          {/* Transparent WebGL Canvas Overlay */}
          <div className="absolute inset-0 z-10 touch-none">
            <Suspense fallback={<CanvasLoader />}>
              <Canvas
                dpr={CURTAIN_CONFIG.dpr}
                gl={{
                  alpha: true,
                  antialias: true,
                  preserveDrawingBuffer: true,
                  powerPreference: 'high-performance'
                }}
                camera={{
                  position: [0, 0, CURTAIN_CONFIG.camera.defaultZ],
                  fov: CURTAIN_CONFIG.camera.fov,
                  near: CURTAIN_CONFIG.camera.near,
                  far: CURTAIN_CONFIG.camera.far
                }}
              >
                <CurtainModel />
              </Canvas>
            </Suspense>
          </div>

          {/* ── MOBILE: floating bottom sheet anchored to bottom of viewport ── */}
          <div className="sm:hidden absolute bottom-0 left-0 right-0 z-20">
            <CurtainControls />
          </div>
        </div>
      </div>

      {/* Export Preview Modal */}
      <ExportModal />
    </div>
  );
}
