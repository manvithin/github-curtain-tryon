import React, { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  ArrowLeft,
  Download,
  Camera,
  Upload,
  Plus,
  Check,
  ChevronUp,
  ChevronDown,
  Layers,
  Sparkles,
  Sliders,
  Maximize2,
  Image as ImageIcon,
  RotateCcw,
  Loader2,
  X
} from 'lucide-react';
import { CURTAIN_CONFIG, BUILTIN_FABRICS, SHEER_PRESETS } from '../../config/curtainConfig.js';
import { useVisualizerStore } from '../../store/visualizerStore.js';
import { Background } from './Background.jsx';
import { CurtainModel } from './CurtainModel.jsx';
import { ExportModal } from '../ui/ExportModal.jsx';
import { CameraCapture } from '../upload/CameraCapture.jsx';
import { compositePreview, processFabricImage, processRoomImage } from '../../utils/imageUtils.js';
import { usePinchToZoom } from '../../hooks/usePinchToZoom.js';

function CanvasLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-xs z-10 select-none pointer-events-none">
      <div className="bg-neutral-900/90 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 border border-white/15">
        <Loader2 className="animate-spin text-amber-400" size={18} />
        <span className="text-xs font-medium tracking-wide">Loading Curtain...</span>
      </div>
    </div>
  );
}

export function CleanLayout() {
  const viewportRef = useRef(null);
  const fabricFileInputRef = useRef(null);
  const fabricCameraInputRef = useRef(null);
  const roomFileInputRef = useRef(null);
  const roomCameraInputRef = useRef(null);

  // Store
  const setStep = useVisualizerStore((s) => s.setStep);
  const selectedModel = useVisualizerStore((s) => s.selectedModel);
  const setSelectedModel = useVisualizerStore((s) => s.setSelectedModel);
  const selectedFabric = useVisualizerStore((s) => s.selectedFabric);
  const setSelectedFabric = useVisualizerStore((s) => s.setSelectedFabric);
  const selectedSheerFabric = useVisualizerStore((s) => s.selectedSheerFabric);
  const setSelectedSheerFabric = useVisualizerStore((s) => s.setSelectedSheerFabric);
  const fabrics = useVisualizerStore((s) => s.fabrics);
  const setFabrics = useVisualizerStore((s) => s.setFabrics);
  const curtain = useVisualizerStore((s) => s.curtain);
  const setCurtainTransform = useVisualizerStore((s) => s.setCurtainTransform);
  const resetCurtainTransform = useVisualizerStore((s) => s.resetCurtainTransform);
  const animationState = useVisualizerStore((s) => s.animationState);
  const setAnimationState = useVisualizerStore((s) => s.setAnimationState);
  const bgOffset = useVisualizerStore((s) => s.bgOffset);
  const setBgOffset = useVisualizerStore((s) => s.setBgOffset);
  const backgroundImage = useVisualizerStore((s) => s.backgroundImage);
  const setBackgroundImage = useVisualizerStore((s) => s.setBackgroundImage);
  const setExportModal = useVisualizerStore((s) => s.setExportModal);
  const showToast = useVisualizerStore((s) => s.showToast);

  // Bottom Sheet State: 'collapsed' (minimal peek ~70px) | 'expanded' (~230px)
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('fabric'); // 'fabric' | 'openclose' | 'size' | 'room'
  const [doubleLayerTarget, setDoubleLayerTarget] = useState('front'); // 'front' | 'sheer'
  const [showFabricChoiceModal, setShowFabricChoiceModal] = useState(false);
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [webcamTarget, setWebcamTarget] = useState('fabric'); // 'fabric' | 'room'
  const [isProcessing, setIsProcessing] = useState(false);

  // Attach background pinch/pan zoom
  usePinchToZoom(viewportRef);

  // Initialize fabrics if empty
  useEffect(() => {
    if (!fabrics || fabrics.length === 0) {
      setFabrics([...BUILTIN_FABRICS]);
    }
  }, [fabrics, setFabrics]);

  // Pattern Size Slider Value (derived from current fabric repeat)
  // Higher repeat = smaller pattern size
  const currentRepeat = (doubleLayerTarget === 'sheer' && selectedModel === 'double')
    ? (selectedSheerFabric?.repeatX || 1)
    : (selectedFabric?.repeatX || 1);

  // Convert repeat to 1..5 pattern size scale
  const patternSizeValue = Math.max(1, Math.min(5, Math.round(6 - currentRepeat)));

  const handlePatternSizeChange = (val) => {
    const num = parseInt(val, 10);
    // Inverse mapping: Larger pattern size = smaller repeat (e.g. size 5 -> repeat 1, size 1 -> repeat 5)
    const newRepeat = Math.max(1, 6 - num);

    if (doubleLayerTarget === 'sheer' && selectedModel === 'double') {
      if (!selectedSheerFabric) return;
      const updated = { ...selectedSheerFabric, repeatX: newRepeat, repeatY: newRepeat };
      setSelectedSheerFabric(updated);
    } else {
      if (!selectedFabric) return;
      const updated = { ...selectedFabric, repeatX: newRepeat, repeatY: newRepeat };
      setSelectedFabric(updated);
      setFabrics(fabrics.map((f) => (f.id === selectedFabric.id ? updated : f)));
    }
  };

  // Open/Close Animation Scrubber Handler
  const handleScrubOpen = (pct) => {
    const p = parseFloat(pct) / 100;
    setAnimationState({
      openProgress: p,
      isOpen: p >= 0.95,
      isAnimating: false
    });
  };

  // Quick Open / Close action
  const handleAnimateToggle = (targetOpen) => {
    const start = performance.now();
    const duration = 650;
    const fromProgress = animationState.openProgress;
    setAnimationState({ isAnimating: true });

    function tick(now) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const nextProgress = fromProgress + (targetOpen ? 1 - fromProgress : -fromProgress) * eased;

      setAnimationState({
        openProgress: nextProgress,
        isOpen: nextProgress >= 0.95
      });

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        setAnimationState({
          isAnimating: false,
          openProgress: targetOpen ? 1 : 0,
          isOpen: targetOpen
        });
      }
    }

    requestAnimationFrame(tick);
  };

  // Add Custom Fabric File Processing
  const handleFabricFile = async (file) => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const dataUrl = await processFabricImage(file);
      const fabricName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Custom Fabric';
      const newFabric = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: fabricName,
        imageUrl: dataUrl,
        thumbnailUrl: dataUrl,
        repeatX: 1,
        repeatY: 1,
        isCustom: true,
        category: 'Custom'
      };

      const updatedList = [newFabric, ...fabrics];
      setFabrics(updatedList);

      if (doubleLayerTarget === 'sheer' && selectedModel === 'double') {
        setSelectedSheerFabric(newFabric);
      } else {
        setSelectedFabric(newFabric);
      }
    } catch (err) {
      showToast('Could not process fabric image.', 'error');
    } finally {
      setIsProcessing(false);
      setShowFabricChoiceModal(false);
    }
  };

  // Change Room Photo File Processing
  const handleRoomFile = async (file) => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const { dataUrl, width, height } = await processRoomImage(file);
      setBackgroundImage({
        id: `room-${Date.now()}`,
        url: dataUrl,
        width,
        height,
        isSample: false
      });
    } catch (err) {
      showToast('Could not process room image.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save / Export High-Res Preview
  const handleExport = async () => {
    try {
      const canvas = document.querySelector('canvas');
      if (!canvas || !backgroundImage?.url) {
        showToast('Scene is not ready for export.', 'error');
        return;
      }
      showToast('Generating high-resolution preview...', 'info', 1500);
      const compositeDataUrl = await compositePreview(backgroundImage.url, canvas);
      setExportModal(true, compositeDataUrl);
    } catch (err) {
      showToast('Failed to generate preview image.', 'error');
    }
  };

  const openList = (doubleLayerTarget === 'sheer' && selectedModel === 'double')
    ? SHEER_PRESETS
    : fabrics;

  const currentSelected = (doubleLayerTarget === 'sheer' && selectedModel === 'double')
    ? selectedSheerFabric
    : selectedFabric;

  return (
    <div
      ref={viewportRef}
      className="relative w-screen h-[100dvh] overflow-hidden bg-neutral-950 select-none touch-none flex flex-col font-sans"
    >
      {/* Hidden File Inputs */}
      <input
        ref={fabricFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFabricFile(e.target.files?.[0])}
      />
      <input
        ref={fabricCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFabricFile(e.target.files?.[0])}
      />
      <input
        ref={roomFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleRoomFile(e.target.files?.[0])}
      />
      <input
        ref={roomCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleRoomFile(e.target.files?.[0])}
      />

      {/* ── BASE LAYER (75%–90% of screen): Full-Bleed 3D Curtain & Room Photo ── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Background />

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
      </div>

      {/* ── MINIMAL TOP BAR: Floating & Translucent ── */}
      <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none pt-[max(env(safe-area-inset-top,0px),12px)] px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Change Photo Button */}
          <button
            onClick={() => setStep('upload')}
            style={{ touchAction: 'manipulation' }}
            className="pointer-events-auto h-10 px-3 rounded-full bg-black/40 hover:bg-black/60 active:bg-black/70 text-white/90 backdrop-blur-md border border-white/10 shadow-md flex items-center gap-1.5 transition active:scale-95 text-xs font-medium"
            title="Change Room Photo"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Change Room</span>
          </button>

          {/* Model Switcher Pill */}
          <div className="pointer-events-auto flex items-center p-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-md">
            <button
              onClick={() => setSelectedModel('single')}
              style={{ touchAction: 'manipulation' }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                selectedModel === 'single'
                  ? 'bg-white text-neutral-950 shadow-sm font-bold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Single Layer
            </button>
            <button
              onClick={() => setSelectedModel('double')}
              style={{ touchAction: 'manipulation' }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                selectedModel === 'double'
                  ? 'bg-white text-neutral-950 shadow-sm font-bold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Double Layer
            </button>
          </div>

          {/* Save Preview Button */}
          <div className="pointer-events-auto flex items-center">
            <button
              onClick={handleExport}
              style={{ touchAction: 'manipulation' }}
              className="h-10 px-3.5 rounded-full bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-neutral-950 font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 text-xs"
              title="Save Image Preview"
            >
              <Download size={15} />
              <span>Save</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── COLLAPSIBLE MINIMAL BOTTOM SHEET ── */}
      <div
        className={`
          fixed left-0 right-0 bottom-0 z-30
          max-w-2xl mx-auto
          bg-neutral-950/85 backdrop-blur-2xl border-t border-white/10
          rounded-t-[28px] shadow-[0_-10px_35px_rgba(0,0,0,0.6)]
          flex flex-col text-white
          transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]
        `}
      >
        {/* Drag Handle / Peek Header */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ touchAction: 'manipulation' }}
          className="w-full flex flex-col items-center pt-2.5 pb-1 cursor-pointer shrink-0"
        >
          <div className="w-10 h-1 bg-white/30 rounded-full mb-1" />
        </div>

        {/* ── TAB BAR: Minimal Pill Switcher ── */}
        <div className="px-4 pb-2 flex items-center justify-between gap-1 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => {
                setActiveTab('fabric');
                setIsExpanded(true);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'fabric'
                  ? 'bg-white text-neutral-950 shadow-sm'
                  : 'bg-white/10 text-white/75 hover:bg-white/15'
              }`}
            >
              <Sparkles size={13} />
              <span>Fabric</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('openclose');
                setIsExpanded(true);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'openclose'
                  ? 'bg-white text-neutral-950 shadow-sm'
                  : 'bg-white/10 text-white/75 hover:bg-white/15'
              }`}
            >
              <Sliders size={13} />
              <span>Open / Close</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('size');
                setIsExpanded(true);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'size'
                  ? 'bg-white text-neutral-950 shadow-sm'
                  : 'bg-white/10 text-white/75 hover:bg-white/15'
              }`}
            >
              <Maximize2 size={13} />
              <span>Size</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('room');
                setIsExpanded(true);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'room'
                  ? 'bg-white text-neutral-950 shadow-sm'
                  : 'bg-white/10 text-white/75 hover:bg-white/15'
              }`}
            >
              <ImageIcon size={13} />
              <span>Room</span>
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>

        {/* ── COLLAPSED QUICK VIEW: Horizontal Fabric Thumbnails (Always 1-Tap Accessible) ── */}
        {!isExpanded && (
          <div className="px-4 pb-3 flex items-center gap-2.5 overflow-x-auto scrollbar-none touch-pan-x">
            {/* Quick Add Fabric Button */}
            <button
              onClick={() => setShowFabricChoiceModal(true)}
              style={{ touchAction: 'manipulation' }}
              className="shrink-0 w-12 h-12 rounded-xl border border-dashed border-white/30 hover:border-amber-400 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center text-white/80 active:scale-95 transition"
              title="Add Fabric"
            >
              <Plus size={18} className="text-amber-400" />
            </button>

            {/* Quick Fabric Thumbnails */}
            {openList.map((f) => {
              const isSelected = currentSelected?.id === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    if (doubleLayerTarget === 'sheer' && selectedModel === 'double') {
                      setSelectedSheerFabric(f);
                    } else {
                      setSelectedFabric(f);
                    }
                  }}
                  style={{ touchAction: 'manipulation' }}
                  className={`relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition active:scale-95 ${
                    isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400/40 scale-105'
                      : 'border-white/15 hover:border-white/40 opacity-80 hover:opacity-100'
                  }`}
                  title={f.name}
                >
                  <img
                    src={f.thumbnailUrl || f.imageUrl}
                    alt={f.name}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-amber-400/20 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── EXPANDED TAB CONTENT ── */}
        {isExpanded && (
          <div className="px-4 pt-1 pb-4 flex flex-col gap-3.5 max-h-[45vh] overflow-y-auto overscroll-contain animate-in fade-in duration-200">
            {/* 1. FABRIC TAB */}
            {activeTab === 'fabric' && (
              <div className="flex flex-col gap-3">
                {/* Double Layer Switcher: Front vs Sheer */}
                {selectedModel === 'double' && (
                  <div className="flex rounded-full bg-white/10 p-0.5 border border-white/10">
                    <button
                      onClick={() => setDoubleLayerTarget('front')}
                      className={`flex-1 py-1 rounded-full text-xs font-semibold transition ${
                        doubleLayerTarget === 'front'
                          ? 'bg-amber-400 text-neutral-950 font-bold'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      Front Drape
                    </button>
                    <button
                      onClick={() => setDoubleLayerTarget('sheer')}
                      className={`flex-1 py-1 rounded-full text-xs font-semibold transition ${
                        doubleLayerTarget === 'sheer'
                          ? 'bg-amber-400 text-neutral-950 font-bold'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      Sheer Back
                    </button>
                  </div>
                )}

                {/* Horizontal Fabric Thumbnails */}
                <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-1">
                  <button
                    onClick={() => setShowFabricChoiceModal(true)}
                    style={{ touchAction: 'manipulation' }}
                    className="shrink-0 w-14 h-14 rounded-2xl border-2 border-dashed border-white/30 hover:border-amber-400 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center text-white/80 active:scale-95 transition"
                  >
                    <Plus size={18} className="text-amber-400" />
                    <span className="text-[10px] font-medium mt-0.5">Add</span>
                  </button>

                  {openList.map((f) => {
                    const isSelected = currentSelected?.id === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          if (doubleLayerTarget === 'sheer' && selectedModel === 'double') {
                            setSelectedSheerFabric(f);
                          } else {
                            setSelectedFabric(f);
                          }
                        }}
                        style={{ touchAction: 'manipulation' }}
                        className={`group relative shrink-0 w-14 h-14 rounded-2xl overflow-hidden border-2 transition active:scale-95 ${
                          isSelected
                            ? 'border-amber-400 ring-2 ring-amber-400/40 scale-105'
                            : 'border-white/15 hover:border-white/40 opacity-80 hover:opacity-100'
                        }`}
                        title={f.name}
                      >
                        <img
                          src={f.thumbnailUrl || f.imageUrl}
                          alt={f.name}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-amber-400/20 flex items-center justify-center">
                            <div className="w-5 h-5 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Simple Pattern Size Slider */}
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300 font-medium">Pattern Size</span>
                    <span className="text-amber-400 font-bold font-mono text-[11px]">
                      {patternSizeValue === 1 ? 'Fine' : patternSizeValue === 5 ? 'Large' : 'Normal'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={patternSizeValue}
                    onChange={(e) => handlePatternSizeChange(e.target.value)}
                    style={{ touchAction: 'pan-x' }}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400">
                    <span>Smaller</span>
                    <span>Larger</span>
                  </div>
                </div>

                {/* Separate Quick Actions: Capture & Upload Fabric */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    onClick={() => {
                      if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                        fabricCameraInputRef.current?.click();
                      } else {
                        setWebcamTarget('fabric');
                        setShowWebcamModal(true);
                      }
                    }}
                    style={{ touchAction: 'manipulation' }}
                    className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white font-medium text-xs flex items-center justify-center gap-2 transition active:scale-95 border border-white/10"
                  >
                    <Camera size={15} className="text-amber-400" />
                    <span>Capture Fabric</span>
                  </button>
                  <button
                    onClick={() => fabricFileInputRef.current?.click()}
                    style={{ touchAction: 'manipulation' }}
                    className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white font-medium text-xs flex items-center justify-center gap-2 transition active:scale-95 border border-white/10"
                  >
                    <Upload size={15} className="text-white/80" />
                    <span>Upload Fabric</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. OPEN / CLOSE TAB */}
            {activeTab === 'openclose' && (
              <div className="flex flex-col gap-3">
                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300 font-medium">Curtain Open State</span>
                    <span className="text-amber-400 font-bold font-mono text-[11px]">
                      {Math.round(animationState.openProgress * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(animationState.openProgress * 100)}
                    onChange={(e) => handleScrubOpen(e.target.value)}
                    style={{ touchAction: 'pan-x' }}
                    className="w-full h-2.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400">
                    <span>Closed</span>
                    <span>Half</span>
                    <span>Fully Open</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAnimateToggle(true)}
                    style={{ touchAction: 'manipulation' }}
                    className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border border-white/10"
                  >
                    <span>▶ Open Pleats</span>
                  </button>
                  <button
                    onClick={() => handleAnimateToggle(false)}
                    style={{ touchAction: 'manipulation' }}
                    className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border border-white/10"
                  >
                    <span>⏸ Close Pleats</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. SIZE & ADJUST TAB */}
            {activeTab === 'size' && (
              <div className="flex flex-col gap-3">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300 font-medium">Curtain Width</span>
                    <span className="text-amber-400 font-bold font-mono text-[11px]">
                      {curtain.width.toFixed(2)} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={CURTAIN_CONFIG.minWidth}
                    max={CURTAIN_CONFIG.maxWidth}
                    step={0.05}
                    value={curtain.width}
                    onChange={(e) => setCurtainTransform({ width: parseFloat(e.target.value) })}
                    style={{ touchAction: 'pan-x' }}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300 font-medium">Curtain Height</span>
                    <span className="text-amber-400 font-bold font-mono text-[11px]">
                      {curtain.height.toFixed(2)} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min={CURTAIN_CONFIG.minHeight}
                    max={CURTAIN_CONFIG.maxHeight}
                    step={0.05}
                    value={curtain.height}
                    onChange={(e) => setCurtainTransform({ height: parseFloat(e.target.value) })}
                    style={{ touchAction: 'pan-x' }}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                {/* Manual Rotation Slider (-45° → 0° → +45°) */}
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300 font-medium">Rotation</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-bold font-mono text-[11px]">
                        {Math.round(curtain.rotation || 0)}°
                      </span>
                      {Math.round(curtain.rotation || 0) !== 0 && (
                        <button
                          onClick={() => setCurtainTransform({ rotation: 0 })}
                          className="text-[10px] text-white/50 hover:text-white px-1.5 py-0.5 rounded bg-white/10"
                        >
                          Reset 0°
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    step="1"
                    value={Math.round(curtain.rotation || 0)}
                    onChange={(e) => setCurtainTransform({ rotation: parseFloat(e.target.value) })}
                    style={{ touchAction: 'pan-x' }}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400">
                    <span>-45°</span>
                    <span>0°</span>
                    <span>+45°</span>
                  </div>
                </div>

                <button
                  onClick={resetCurtainTransform}
                  style={{ touchAction: 'manipulation' }}
                  className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 font-medium text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border border-white/10"
                >
                  <RotateCcw size={14} />
                  <span>Reset Size &amp; Position</span>
                </button>
              </div>
            )}

            {/* 4. ROOM TAB */}
            {activeTab === 'room' && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                        roomCameraInputRef.current?.click();
                      } else {
                        setWebcamTarget('room');
                        setShowWebcamModal(true);
                      }
                    }}
                    style={{ touchAction: 'manipulation' }}
                    className="py-3 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-2 transition active:scale-95 border border-white/10"
                  >
                    <Camera size={16} className="text-amber-400" />
                    <span>Capture Room</span>
                  </button>
                  <button
                    onClick={() => roomFileInputRef.current?.click()}
                    style={{ touchAction: 'manipulation' }}
                    className="py-3 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-2 transition active:scale-95 border border-white/10"
                  >
                    <Upload size={16} className="text-white/80" />
                    <span>Upload Room</span>
                  </button>
                </div>

                <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300 font-medium">Room Photo Zoom</span>
                    <span className="text-amber-400 font-mono text-[11px] font-bold">
                      {bgOffset.scale.toFixed(2)}×
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.05"
                    value={bgOffset.scale}
                    onChange={(e) => setBgOffset({ scale: parseFloat(e.target.value) })}
                    style={{ touchAction: 'pan-x' }}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                  <div className="flex justify-between pt-1">
                    <button
                      onClick={() => setBgOffset({ x: 0, y: 0, scale: 1 })}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
                    >
                      Reset Room Zoom
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Safe-Area Bottom Inset Pad for Home Indicator / Gesture Bar */}
        <div
          style={{
            height: 'max(env(safe-area-inset-bottom, 0px), 12px)',
            flexShrink: 0
          }}
        />
      </div>

      {/* ── SEPARATE ADD FABRIC OPTIONS MODAL ── */}
      {showFabricChoiceModal && (
        <div
          onClick={() => setShowFabricChoiceModal(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs bg-neutral-900 border border-white/15 rounded-3xl p-5 shadow-2xl text-white flex flex-col gap-3.5"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-sm font-bold">Add Custom Fabric</span>
              <button
                onClick={() => setShowFabricChoiceModal(false)}
                className="p-1 rounded-full text-white/60 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              {/* Option 1: Capture Fabric */}
              <button
                onClick={() => {
                  setShowFabricChoiceModal(false);
                  if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                    fabricCameraInputRef.current?.click();
                  } else {
                    setWebcamTarget('fabric');
                    setShowWebcamModal(true);
                  }
                }}
                className="w-full py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-md"
              >
                <Camera size={17} />
                <span>Capture Fabric Sample</span>
              </button>

              {/* Option 2: Upload Fabric */}
              <button
                onClick={() => {
                  setShowFabricChoiceModal(false);
                  fabricFileInputRef.current?.click();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-95 border border-white/15"
              >
                <Upload size={17} />
                <span>Upload Fabric File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Modal (Desktop WebRTC fallback) */}
      {showWebcamModal && (
        <CameraCapture
          title={webcamTarget === 'fabric' ? 'Capture Fabric Sample' : 'Capture Room Photo'}
          onCapture={async (dataUrl) => {
            setShowWebcamModal(false);
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `${webcamTarget}_${Date.now()}.jpg`, { type: 'image/jpeg' });
            if (webcamTarget === 'fabric') {
              handleFabricFile(file);
            } else {
              handleRoomFile(file);
            }
          }}
          onClose={() => setShowWebcamModal(false)}
        />
      )}

      {/* Export Preview Modal */}
      <ExportModal />
    </div>
  );
}
