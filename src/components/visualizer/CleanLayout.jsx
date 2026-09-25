import React, { Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  ArrowLeft,
  Download,
  RotateCcw,
  Maximize2,
  Move,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ImageIcon,
  Loader2,
  Layers
} from 'lucide-react';
import { CURTAIN_CONFIG, MODEL_CONFIG } from '../../config/curtainConfig.js';
import { useVisualizerStore } from '../../store/visualizerStore.js';
import { Background } from './Background.jsx';
import { CurtainModel } from './CurtainModel.jsx';
import { ExportModal } from '../ui/ExportModal.jsx';
import { compositePreview } from '../../utils/imageUtils.js';
import { usePinchToZoom } from '../../hooks/usePinchToZoom.js';

// ── Reusable Dark-Glass Slider Row ───────────────────────────────────────────
function GlassSliderRow({ label, value, min, max, step, onChange, unit = '', display }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-neutral-300 font-medium">{label}</span>
        <span className="text-xs font-bold text-white font-mono bg-white/10 px-2 py-0.5 rounded-md border border-white/15">
          {display !== undefined ? display : `${value}${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ touchAction: 'pan-x' }}
        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white hover:accent-amber-400 transition"
      />
      <div className="flex justify-between text-[10px] text-neutral-400">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ── Canvas Loader Indicator ──────────────────────────────────────────────────
function CanvasLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-xs z-10 select-none pointer-events-none">
      <div className="bg-neutral-900/90 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20">
        <Loader2 className="animate-spin text-amber-400" size={20} />
        <span className="text-sm font-medium">Loading 3D Curtain...</span>
      </div>
    </div>
  );
}

// ── Main CleanLayout Component ───────────────────────────────────────────────
export function CleanLayout() {
  const viewportRef = useRef(null);
  const handleRef = useRef(null);

  // Zustand Store
  const setStep = useVisualizerStore((s) => s.setStep);
  const selectedModel = useVisualizerStore((s) => s.selectedModel);
  const setSelectedModel = useVisualizerStore((s) => s.setSelectedModel);
  const curtain = useVisualizerStore((s) => s.curtain);
  const setCurtainTransform = useVisualizerStore((s) => s.setCurtainTransform);
  const resetCurtainTransform = useVisualizerStore((s) => s.resetCurtainTransform);
  const bgOffset = useVisualizerStore((s) => s.bgOffset);
  const setBgOffset = useVisualizerStore((s) => s.setBgOffset);
  const backgroundImage = useVisualizerStore((s) => s.backgroundImage);
  const setExportModal = useVisualizerStore((s) => s.setExportModal);
  const showToast = useVisualizerStore((s) => s.showToast);

  // Drawer States: 'peek' (~25% viewport) | 'expanded' (~65% viewport) | 'hidden' (fully collapsed)
  const [drawerState, setDrawerState] = useState('peek');
  const [activeTab, setActiveTab] = useState('size'); // 'size' | 'position'
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);

  // Attach midpoint-centered pinch to zoom gesture handler
  usePinchToZoom(viewportRef);

  // Export Preview
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

  // ── Exclusive Drawer Handle Drag Gesture ───────────────────────────────────
  // Note: Dragging is bound strictly and exclusively to the drawer handle element.
  const dragStartYRef = useRef(0);
  const dragStartStateRef = useRef('peek');

  const onHandlePointerDown = (e) => {
    e.stopPropagation();
    setIsDraggingHandle(true);
    dragStartYRef.current = e.clientY;
    dragStartStateRef.current = drawerState;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const onHandlePointerMove = (e) => {
    if (!isDraggingHandle) return;
    const deltaY = e.clientY - dragStartYRef.current;
    // Interactive threshold check
    if (deltaY < -40) {
      setDrawerState('expanded');
    } else if (deltaY > 50) {
      if (dragStartStateRef.current === 'expanded') {
        setDrawerState('peek');
      } else {
        setDrawerState('hidden');
      }
    }
  };

  const onHandlePointerUp = (e) => {
    if (!isDraggingHandle) return;
    setIsDraggingHandle(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}
  };

  // Toggle drawer via clicking handle
  const handleHandleClick = () => {
    if (drawerState === 'peek') setDrawerState('expanded');
    else if (drawerState === 'expanded') setDrawerState('peek');
    else setDrawerState('peek');
  };

  return (
    <div
      ref={viewportRef}
      className="relative w-screen h-[100dvh] overflow-hidden bg-neutral-950 select-none touch-none flex flex-col font-sans"
    >
      {/* ── BASE LAYER: Full-Bleed 100vw × 100dvh 3D Canvas & Room Background ── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Room Background Photo */}
        <Background />

        {/* 3D WebGL Canvas Layer */}
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

        {/* Subtle dimming overlay when drawer is at full expanded height */}
        <div
          className={`absolute inset-0 z-15 bg-black/20 pointer-events-none transition-opacity duration-300 ${
            drawerState === 'expanded' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* ── TOP FLOATING BAR: Translucent Glass Model Selector & Quick Actions ── */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none pt-[max(env(safe-area-inset-top,0px),16px)] px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Left: Change Photo Button (≥44×44px hit target) */}
          <button
            onClick={() => setStep('upload')}
            style={{ touchAction: 'manipulation' }}
            className="pointer-events-auto h-11 px-3.5 rounded-2xl bg-neutral-900/75 hover:bg-neutral-900/90 active:bg-neutral-800 text-white backdrop-blur-xl border border-white/15 shadow-lg flex items-center gap-2 transition active:scale-95 text-xs font-semibold"
            title="Change Room Photo"
          >
            <ArrowLeft size={16} className="text-neutral-200" />
            <span className="hidden sm:inline">Change Photo</span>
          </button>

          {/* Center: Compact Pill-Shaped Model Switcher (max-w ~210px) */}
          <div className="pointer-events-auto flex items-center p-1 rounded-full bg-neutral-900/80 backdrop-blur-xl border border-white/15 shadow-xl">
            <button
              onClick={() => setSelectedModel('single')}
              style={{ touchAction: 'manipulation' }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                selectedModel === 'single'
                  ? 'bg-white text-neutral-950 shadow-md font-bold'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              Single Layer
            </button>
            <button
              onClick={() => setSelectedModel('double')}
              style={{ touchAction: 'manipulation' }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                selectedModel === 'double'
                  ? 'bg-white text-neutral-950 shadow-md font-bold'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              Double Layer
            </button>
          </div>

          {/* Right: Save Preview Button (≥44×44px hit target) */}
          <button
            onClick={handleExport}
            style={{ touchAction: 'manipulation' }}
            className="pointer-events-auto h-11 px-3.5 rounded-2xl bg-neutral-900/75 hover:bg-neutral-900/90 active:bg-neutral-800 text-white backdrop-blur-xl border border-white/15 shadow-lg flex items-center gap-2 transition active:scale-95 text-xs font-semibold"
            title="Save Preview"
          >
            <Download size={16} className="text-neutral-200" />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </div>

      {/* ── FLOATING "HIDE UI" TOGGLE BUTTON (Bottom-Right, ≥44×44px hit area) ── */}
      <button
        onClick={() => setDrawerState(drawerState === 'hidden' ? 'peek' : 'hidden')}
        style={{ touchAction: 'manipulation' }}
        className="fixed z-40 right-4 bottom-[max(env(safe-area-inset-bottom,0px),20px)] w-12 h-12 rounded-full bg-neutral-900/80 hover:bg-neutral-800 active:bg-neutral-700 text-white backdrop-blur-xl border border-white/20 shadow-2xl flex items-center justify-center transition-all duration-200 active:scale-90"
        title={drawerState === 'hidden' ? 'Show Controls' : 'Hide Controls'}
        aria-label="Toggle UI Visibility"
      >
        {drawerState === 'hidden' ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>

      {/* ── "SHOW CONTROLS" CENTERED PILL (Visible when Drawer is Hidden) ── */}
      {drawerState === 'hidden' && (
        <button
          onClick={() => setDrawerState('peek')}
          style={{ touchAction: 'manipulation' }}
          className="fixed z-40 left-1/2 -translate-x-1/2 bottom-[max(env(safe-area-inset-bottom,0px),20px)] h-9 px-4 rounded-full bg-neutral-900/85 hover:bg-neutral-800 text-white backdrop-blur-xl border border-white/20 shadow-2xl flex items-center gap-1.5 transition-all duration-200 active:scale-95 text-xs font-semibold animate-in fade-in zoom-in-95"
        >
          <ChevronUp size={15} className="text-amber-400" />
          <span>Show Controls</span>
        </button>
      )}

      {/* ── 3-STATE GLASSMORPHISM BOTTOM DRAWER ──────────────────────────────── */}
      <div
        className={`
          fixed left-0 right-0 bottom-0 z-30
          max-w-2xl mx-auto
          bg-neutral-900/85 backdrop-blur-2xl border-t border-white/15
          rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.6)]
          flex flex-col text-white
          transition-transform duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${drawerState === 'hidden' ? 'translate-y-full pointer-events-none' : ''}
          ${drawerState === 'peek' ? 'translate-y-[calc(100%-195px)]' : ''}
          ${drawerState === 'expanded' ? 'translate-y-0' : ''}
        `}
      >
        {/* ── EXCLUSIVE DRAG HANDLE STRIP (Only this area captures vertical drags) ── */}
        <div
          ref={handleRef}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          onClick={handleHandleClick}
          style={{ touchAction: 'none' }}
          className="w-full flex flex-col items-center pt-3 pb-1.5 cursor-grab active:cursor-grabbing shrink-0 min-h-[44px] justify-center"
        >
          <div className="w-12 h-1.5 bg-white/35 hover:bg-white/50 rounded-full mb-1 transition-all" />
          <div className="text-neutral-400 flex items-center gap-1 text-[11px] font-medium">
            {drawerState === 'expanded' ? (
              <>
                <span>Swipe down to minimize</span>
                <ChevronDown size={14} />
              </>
            ) : (
              <>
                <span>Swipe up for more controls</span>
                <ChevronUp size={14} />
              </>
            )}
          </div>
        </div>

        {/* ── PRIMARY CONTROLS ROW (Always visible in Peek & Expanded states) ── */}
        <div className="px-4 py-2 shrink-0 flex flex-col gap-2.5 border-b border-white/10">
          {/* Quick Actions: Reset Curtain & Next Placeholder Button */}
          <div className="flex items-center gap-2">
            {/* Reset Curtain Button */}
            <button
              onClick={() => {
                resetCurtainTransform();
                showToast('Curtain reset to center & default dimensions', 'info', 2000);
              }}
              style={{ touchAction: 'manipulation' }}
              className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-neutral-200 hover:text-white border border-white/15 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 min-h-[44px]"
            >
              <RotateCcw size={14} />
              <span>Reset Curtain</span>
            </button>

            {/* Next: Add Fabric Placeholder Button */}
            <button
              onClick={() => {
                showToast('Fabric selection coming in the next milestone', 'info', 2500);
              }}
              style={{ touchAction: 'manipulation' }}
              className="flex-1 py-2 px-3 rounded-xl bg-amber-500/90 hover:bg-amber-500 active:bg-amber-600 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md min-h-[44px]"
            >
              <Sparkles size={14} />
              <span>Next: Add Fabric</span>
            </button>
          </div>

          {/* Quick Tab Switcher: Size | Position */}
          <div className="flex rounded-xl overflow-hidden bg-white/10 p-1 border border-white/10">
            <button
              onClick={() => {
                setActiveTab('size');
                setDrawerState('expanded');
              }}
              style={{ touchAction: 'manipulation' }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 min-h-[40px] ${
                activeTab === 'size'
                  ? 'bg-white text-neutral-950 shadow-md font-bold'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Maximize2 size={14} />
              <span>Size Controls</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('position');
                setDrawerState('expanded');
              }}
              style={{ touchAction: 'manipulation' }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 min-h-[40px] ${
                activeTab === 'position'
                  ? 'bg-white text-neutral-950 shadow-md font-bold'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Move size={14} />
              <span>Position &amp; Pan</span>
            </button>
          </div>
        </div>

        {/* ── EXPANDED TAB CONTENT (Smooth scroll when Drawer is Expanded) ────── */}
        <div
          className={`
            overflow-y-auto overscroll-contain transition-all duration-300
            ${drawerState === 'expanded' ? 'max-h-[50vh] sm:max-h-[60vh] opacity-100 p-4' : 'max-h-0 opacity-0 overflow-hidden pointer-events-none p-0'}
          `}
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {/* ── SIZE TAB CONTROLS ── */}
          {activeTab === 'size' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-medium">Curtain Dimensions</span>
                <button
                  onClick={() => {
                    setCurtainTransform({
                      width: CURTAIN_CONFIG.defaultWidth,
                      height: CURTAIN_CONFIG.defaultHeight
                    });
                  }}
                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium"
                >
                  <RotateCcw size={12} />
                  <span>Reset Size</span>
                </button>
              </div>

              <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 flex flex-col gap-4">
                <GlassSliderRow
                  label="Curtain Width"
                  value={curtain.width}
                  min={CURTAIN_CONFIG.minWidth}
                  max={CURTAIN_CONFIG.maxWidth}
                  step={0.05}
                  unit=" m"
                  onChange={(v) => setCurtainTransform({ width: v })}
                />
                <GlassSliderRow
                  label="Curtain Height"
                  value={curtain.height}
                  min={CURTAIN_CONFIG.minHeight}
                  max={CURTAIN_CONFIG.maxHeight}
                  step={0.05}
                  unit=" m"
                  onChange={(v) => setCurtainTransform({ height: v })}
                />
              </div>
            </div>
          )}

          {/* ── POSITION TAB CONTROLS ── */}
          {activeTab === 'position' && (
            <div className="flex flex-col gap-4">
              {/* Hint banner */}
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs flex items-center gap-2.5">
                <Move size={16} className="text-amber-400 shrink-0" />
                <span>Drag anywhere on the canvas or curtain to position it directly.</span>
              </div>

              {/* Position X / Y Readouts */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[11px] text-neutral-400 font-medium block">X Position</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {curtain.positionX.toFixed(2)} m
                  </span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[11px] text-neutral-400 font-medium block">Y Position</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {curtain.positionY.toFixed(2)} m
                  </span>
                </div>
              </div>

              {/* Center Curtain */}
              <button
                onClick={resetCurtainTransform}
                style={{ touchAction: 'manipulation' }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold transition active:scale-95 min-h-[44px]"
              >
                <RotateCcw size={14} />
                <span>Center Curtain</span>
              </button>

              {/* Background Pan & Zoom */}
              <div className="border-t border-white/10 pt-3">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-amber-400" />
                    Room Photo Zoom &amp; Pan
                  </span>
                  <button
                    onClick={() => setBgOffset({ x: 0, y: 0, scale: 1 })}
                    className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1"
                  >
                    <RotateCcw size={11} />
                    Reset
                  </button>
                </div>

                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 flex flex-col gap-3">
                  <GlassSliderRow
                    label="Pan Horizontal"
                    value={bgOffset.x}
                    min={-50}
                    max={50}
                    step={1}
                    unit="%"
                    onChange={(v) => setBgOffset({ x: v })}
                  />
                  <GlassSliderRow
                    label="Pan Vertical"
                    value={bgOffset.y}
                    min={-50}
                    max={50}
                    step={1}
                    unit="%"
                    onChange={(v) => setBgOffset({ y: v })}
                  />
                  <GlassSliderRow
                    label="Zoom Level"
                    value={bgOffset.scale}
                    min={0.5}
                    max={3.0}
                    step={0.05}
                    display={`${bgOffset.scale.toFixed(2)}×`}
                    onChange={(v) => setBgOffset({ scale: v })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Safe-Area Bottom Inset Pad for Home Indicator / Gesture Bar */}
        <div
          style={{
            height: 'max(env(safe-area-inset-bottom, 0px), 16px)',
            flexShrink: 0
          }}
        />
      </div>
    </div>
  );
}
