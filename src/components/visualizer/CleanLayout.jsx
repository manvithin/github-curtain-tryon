import React, { Suspense, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  ArrowLeft,
  Download,
  RotateCcw,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ImageIcon,
  Loader2,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import { CURTAIN_CONFIG } from '../../config/curtainConfig.js';
import { useVisualizerStore } from '../../store/visualizerStore.js';
import { Background } from './Background.jsx';
import { CurtainModel } from './CurtainModel.jsx';
import { CurtainTransformOverlay } from './CurtainTransformOverlay.jsx';
import { ExportModal } from '../ui/ExportModal.jsx';
import { compositePreview } from '../../utils/imageUtils.js';
import { usePinchToZoom } from '../../hooks/usePinchToZoom.js';

// ── Reusable Dark-Glass Slider Row for Advanced Accordion ─────────────────────
function GlassSliderRow({ label, value, min, max, step, onChange, unit = '', display }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-neutral-300 font-medium">{label}</span>
        <span className="text-[11px] font-bold text-white font-mono bg-white/10 px-2 py-0.5 rounded-md border border-white/15">
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
        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
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
  const selectedLayer = useVisualizerStore((s) => s.selectedLayer);
  const setSelectedLayer = useVisualizerStore((s) => s.setSelectedLayer);
  const isTransforming = useVisualizerStore((s) => s.isTransforming);
  const curtain = useVisualizerStore((s) => s.curtain);
  const setCurtainTransform = useVisualizerStore((s) => s.setCurtainTransform);
  const resetCurtainTransform = useVisualizerStore((s) => s.resetCurtainTransform);
  const bgOffset = useVisualizerStore((s) => s.bgOffset);
  const setBgOffset = useVisualizerStore((s) => s.setBgOffset);
  const backgroundImage = useVisualizerStore((s) => s.backgroundImage);
  const setExportModal = useVisualizerStore((s) => s.setExportModal);
  const showToast = useVisualizerStore((s) => s.showToast);

  // Drawer States: 'peek' (~150px) | 'expanded' (shows Advanced fallback) | 'hidden' (fully collapsed)
  const [drawerState, setDrawerState] = useState('peek');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);

  // Attach midpoint-centered pinch-to-zoom and pan gesture handler for background
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
    if (deltaY < -35) {
      setDrawerState('expanded');
      setShowAdvanced(true);
    } else if (deltaY > 40) {
      if (dragStartStateRef.current === 'expanded') {
        setDrawerState('peek');
        setShowAdvanced(false);
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

  const handleHandleClick = () => {
    if (drawerState === 'peek') {
      setDrawerState('expanded');
      setShowAdvanced(true);
    } else if (drawerState === 'expanded') {
      setDrawerState('peek');
      setShowAdvanced(false);
    } else {
      setDrawerState('peek');
    }
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

        {/* 3D WebGL Canvas Layer (Dims to 50% opacity when editing background photo) */}
        <div
          className={`absolute inset-0 z-10 touch-none transition-opacity duration-300 ${
            selectedLayer === 'photo' ? 'opacity-50' : 'opacity-100'
          }`}
        >
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

        {/* ── ON-CANVAS DIRECT MANIPULATION TRANSFORM BOUNDING BOX & HANDLES ── */}
        <CurtainTransformOverlay containerRef={viewportRef} />

        {/* Subtle dimming overlay when drawer is expanded */}
        <div
          className={`absolute inset-0 z-25 bg-black/25 pointer-events-none transition-opacity duration-300 ${
            drawerState === 'expanded' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* ── TOP FLOATING BAR: Model Selector & Edit Photo Toggle ── */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none pt-[max(env(safe-area-inset-top,0px),16px)] px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Left: Change Photo Button */}
          <button
            onClick={() => setStep('upload')}
            style={{ touchAction: 'manipulation' }}
            className="pointer-events-auto h-11 px-3.5 rounded-2xl bg-neutral-900/80 hover:bg-neutral-900 active:bg-neutral-800 text-white border border-white/15 shadow-lg flex items-center gap-2 transition active:scale-95 text-xs font-semibold"
            title="Change Room Photo"
          >
            <ArrowLeft size={16} className="text-neutral-200" />
            <span className="hidden sm:inline">Change Photo</span>
          </button>

          {/* Center: Model Selector & Edit Photo Pill */}
          <div className="pointer-events-auto flex items-center gap-2">
            {/* Segmented Model Switcher */}
            <div className="flex items-center p-1 rounded-full bg-neutral-900/85 border border-white/15 shadow-xl">
              <button
                onClick={() => setSelectedModel('single')}
                style={{ touchAction: 'manipulation' }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  selectedModel === 'single'
                    ? 'bg-white text-neutral-950 shadow-md font-bold'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                Single
              </button>
              <button
                onClick={() => setSelectedModel('double')}
                style={{ touchAction: 'manipulation' }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  selectedModel === 'double'
                    ? 'bg-white text-neutral-950 shadow-md font-bold'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                Double
              </button>
            </div>

            {/* "Edit Photo" Mode Toggle Pill (Secondary, unobtrusive) */}
            <button
              onClick={() => {
                const nextLayer = selectedLayer === 'photo' ? 'curtain' : 'photo';
                setSelectedLayer(nextLayer);
                showToast(
                  nextLayer === 'photo'
                    ? 'Editing room photo: Drag to pan, pinch to zoom'
                    : 'Editing curtain',
                  'info',
                  2000
                );
              }}
              style={{ touchAction: 'manipulation' }}
              className={`h-9 px-3 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                selectedLayer === 'photo'
                  ? 'bg-amber-400 text-neutral-950 border-amber-300 font-bold'
                  : 'bg-neutral-900/80 text-neutral-300 hover:text-white border-white/15'
              }`}
              title="Toggle Background Photo Editing"
            >
              <ImageIcon size={14} />
              <span>{selectedLayer === 'photo' ? 'Done' : 'Edit Photo'}</span>
            </button>
          </div>

          {/* Right: Save Preview Button */}
          <button
            onClick={handleExport}
            style={{ touchAction: 'manipulation' }}
            className="pointer-events-auto h-11 px-3.5 rounded-2xl bg-neutral-900/80 hover:bg-neutral-900 active:bg-neutral-800 text-white border border-white/15 shadow-lg flex items-center gap-2 transition active:scale-95 text-xs font-semibold"
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
        className="fixed z-40 right-4 bottom-[max(env(safe-area-inset-bottom,0px),20px)] w-12 h-12 rounded-full bg-neutral-900/85 hover:bg-neutral-800 active:bg-neutral-700 text-white border border-white/20 shadow-2xl flex items-center justify-center transition-all duration-200 active:scale-90"
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
          className="fixed z-40 left-1/2 -translate-x-1/2 bottom-[max(env(safe-area-inset-bottom,0px),20px)] h-9 px-4 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-white border border-white/20 shadow-2xl flex items-center gap-1.5 transition-all duration-200 active:scale-95 text-xs font-semibold animate-in fade-in zoom-in-95"
        >
          <ChevronUp size={15} className="text-amber-400" />
          <span>Show Controls</span>
        </button>
      )}

      {/* ── SIMPLIFIED GLASSMORPHISM BOTTOM DRAWER ───────────────────────────── */}
      <div
        className={`
          fixed left-0 right-0 bottom-0 z-30
          max-w-xl mx-auto
          border-t border-white/15
          rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.6)]
          flex flex-col text-white
          transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${isTransforming ? 'bg-neutral-900/90' : 'bg-neutral-900/85 backdrop-blur-2xl'}
          ${drawerState === 'hidden' ? 'translate-y-full pointer-events-none' : ''}
          ${drawerState === 'peek' ? 'translate-y-[calc(100%-145px)]' : ''}
          ${drawerState === 'expanded' ? 'translate-y-0' : ''}
        `}
      >
        {/* ── EXCLUSIVE DRAG HANDLE STRIP ── */}
        <div
          ref={handleRef}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          onClick={handleHandleClick}
          style={{ touchAction: 'none' }}
          className="w-full flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0 min-h-[44px] justify-center"
        >
          <div className="w-12 h-1.5 bg-white/35 hover:bg-white/50 rounded-full mb-1 transition-all" />
          <div className="text-neutral-400 flex items-center gap-1 text-[11px] font-medium">
            <span>Direct Touch: Drag, pinch, twist or double-tap curtain</span>
          </div>
        </div>

        {/* ── PRIMARY ACTIONS: Reset Curtain & Next: Add Fabric ── */}
        <div className="px-4 py-2 shrink-0 flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            {/* Reset Curtain Button */}
            <button
              onClick={() => {
                resetCurtainTransform();
                showToast('Curtain reset to center & default dimensions', 'info', 2000);
              }}
              style={{ touchAction: 'manipulation' }}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-neutral-200 hover:text-white border border-white/15 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 min-h-[44px]"
            >
              <RotateCcw size={15} />
              <span>Reset Curtain</span>
            </button>

            {/* Next: Add Fabric Placeholder Button */}
            <button
              onClick={() => {
                showToast('Fabric selection coming in the next milestone', 'info', 2500);
              }}
              style={{ touchAction: 'manipulation' }}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-lg min-h-[44px]"
            >
              <Sparkles size={15} />
              <span>Next: Add Fabric</span>
            </button>
          </div>

          {/* Toggle for Advanced Numeric Fallback Accordion */}
          <button
            onClick={() => {
              const next = !showAdvanced;
              setShowAdvanced(next);
              setDrawerState(next ? 'expanded' : 'peek');
            }}
            style={{ touchAction: 'manipulation' }}
            className="w-full py-1 text-[11px] text-neutral-400 hover:text-neutral-200 flex items-center justify-center gap-1 transition"
          >
            <SlidersHorizontal size={12} />
            <span>{showAdvanced ? 'Hide Advanced Sliders' : 'Advanced Numeric Controls'}</span>
            {showAdvanced ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>

        {/* ── ADVANCED ACCORDION: Numeric Fallback Sliders (Collapsed by default) ── */}
        <div
          className={`
            overflow-y-auto overscroll-contain transition-all duration-300
            ${showAdvanced && drawerState === 'expanded' ? 'max-h-[45vh] opacity-100 p-4 border-t border-white/10' : 'max-h-0 opacity-0 overflow-hidden pointer-events-none p-0'}
          `}
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          <div className="flex flex-col gap-4">
            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 flex flex-col gap-3">
              <span className="text-xs font-semibold text-neutral-300">Exact Dimensions</span>
              <GlassSliderRow
                label="Width"
                value={curtain.width}
                min={CURTAIN_CONFIG.minWidth}
                max={CURTAIN_CONFIG.maxWidth}
                step={0.05}
                unit=" m"
                onChange={(v) => setCurtainTransform({ width: v })}
              />
              <GlassSliderRow
                label="Height"
                value={curtain.height}
                min={CURTAIN_CONFIG.minHeight}
                max={CURTAIN_CONFIG.maxHeight}
                step={0.05}
                unit=" m"
                onChange={(v) => setCurtainTransform({ height: v })}
              />
              <GlassSliderRow
                label="Rotation"
                value={curtain.rotation || 0}
                min={-45}
                max={45}
                step={1}
                unit="°"
                onChange={(v) => setCurtainTransform({ rotation: v })}
              />
            </div>

            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-neutral-300">Room Photo Pan &amp; Zoom</span>
                <button
                  onClick={() => setBgOffset({ x: 0, y: 0, scale: 1 })}
                  className="text-[11px] text-amber-400 hover:text-amber-300"
                >
                  Reset
                </button>
              </div>
              <GlassSliderRow
                label="Horizontal Pan"
                value={bgOffset.x}
                min={-50}
                max={50}
                step={1}
                unit="%"
                onChange={(v) => setBgOffset({ x: v })}
              />
              <GlassSliderRow
                label="Vertical Pan"
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

        {/* Safe-Area Bottom Inset Pad for Gesture Bar */}
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
