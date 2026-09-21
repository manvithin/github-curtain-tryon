import React from 'react';
import { Palette, Maximize2, Move, Play, ChevronDown, ChevronUp, RotateCcw, ImageIcon } from 'lucide-react';
import { useVisualizerStore } from '../../store/visualizerStore.js';
import { FabricSelector } from './FabricSelector.jsx';
import { SizeControls } from './SizeControls.jsx';
import { AnimationControls } from './AnimationControls.jsx';

const TABS = [
  { id: 'fabric',    label: 'Fabric',     icon: Palette   },
  { id: 'size',      label: 'Size',       icon: Maximize2 },
  { id: 'position',  label: 'Position',   icon: Move      },
  { id: 'animation', label: 'Animation',  icon: Play      }
];

// ── Reusable Slider row ─────────────────────────────────────────────────────
function SliderRow({ label, value, min, max, step, onChange, unit = '', display }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-neutral-500 font-medium">{label}</span>
        <span className="text-[11px] font-bold text-neutral-900 font-mono">
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
        className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900 transition-opacity"
      />
      <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

export function CurtainControls() {
  const activeTab          = useVisualizerStore((s) => s.activeTab);
  const setActiveTab       = useVisualizerStore((s) => s.setActiveTab);
  const isSheetCollapsed   = useVisualizerStore((s) => s.isSheetCollapsed);
  const toggleSheetCollapsed = useVisualizerStore((s) => s.toggleSheetCollapsed);
  const resetCurtainTransform = useVisualizerStore((s) => s.resetCurtainTransform);
  const curtain            = useVisualizerStore((s) => s.curtain);
  const bgOffset           = useVisualizerStore((s) => s.bgOffset);
  const setBgOffset        = useVisualizerStore((s) => s.setBgOffset);

  return (
    <div
      className={`
        bg-white rounded-t-3xl sm:rounded-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.14)] border border-neutral-200/80
        flex flex-col z-20 transition-all duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]
        sm:translate-y-0 sm:shadow-none sm:border-none
        ${isSheetCollapsed ? 'translate-y-[calc(100%-98px)]' : 'translate-y-0'}
      `}
    >
      {/* ── Drag handle (mobile only) — smooth tap to expand/collapse ─────────────────── */}
      <div
        onClick={toggleSheetCollapsed}
        className="sm:hidden w-full flex flex-col items-center pt-2.5 pb-1 cursor-pointer shrink-0 active:opacity-70 transition-opacity"
        style={{ touchAction: 'manipulation' }}
      >
        <div className="w-11 h-1.5 bg-neutral-300 rounded-full mb-1 transition-all" />
        <div className="text-neutral-400 py-0.5 transition-transform duration-200">
          {isSheetCollapsed ? (
            <ChevronUp size={16} className="animate-bounce-subtle" />
          ) : (
            <ChevronDown size={16} />
          )}
        </div>
      </div>

      {/* ── Tab Bar — always visible (the "peek" strip when collapsed) ────── */}
      <div className="flex border-b border-neutral-100 px-2 shrink-0 bg-white">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (isSheetCollapsed) toggleSheetCollapsed();
                setActiveTab(tab.id);
              }}
              style={{ touchAction: 'manipulation' }}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2.5 text-[10px] sm:text-xs font-semibold transition-all duration-200 border-b-2 -mb-[1px] min-h-[44px] active:scale-95 ${
                isActive
                  ? 'border-neutral-900 text-neutral-900 font-bold'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-neutral-900 scale-105 transition-transform' : 'text-neutral-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Scrollable Tab Content ──────────────────────────────────────────
          Hidden when collapsed so the sheet shows just the handle + tab bar.
          scroll-touch enables momentum scrolling on iOS/Android.
          touch-action:pan-y lets the browser scroll without fighting R3F.
      ─────────────────────────────────────────────────────────────────────── */}
      <div
        className={`overflow-y-scroll overscroll-contain transition-all duration-350 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isSheetCollapsed ? 'max-h-0 opacity-0 overflow-hidden pointer-events-none' : 'max-h-[42vh] sm:max-h-[60vh] opacity-100'
        }`}
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        <div className="p-4 sm:p-5 flex flex-col gap-4">

          {/* ── FABRIC TAB ── */}
          {activeTab === 'fabric' && <FabricSelector />}

          {/* ── SIZE TAB ── */}
          {activeTab === 'size' && <SizeControls />}

          {/* ── POSITION TAB ── */}
          {activeTab === 'position' && (
            <div className="flex flex-col gap-4 select-none">
              {/* Curtain drag hint */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-100 text-neutral-700 text-xs leading-relaxed">
                <p className="font-semibold text-neutral-900 mb-1 flex items-center gap-2">
                  <Move size={15} className="text-amber-600" />
                  Touch &amp; Drag to Position Curtain
                </p>
                Drag directly on the curtain to move it. Use Width &amp; Height sliders for sizing.
              </div>

              {/* Live position readout */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                  <span className="text-[11px] text-neutral-500 font-medium block">X Position</span>
                  <span className="text-xs font-mono font-bold text-neutral-900">{curtain.positionX.toFixed(2)} m</span>
                </div>
                <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                  <span className="text-[11px] text-neutral-500 font-medium block">Y Position</span>
                  <span className="text-xs font-mono font-bold text-neutral-900">{curtain.positionY.toFixed(2)} m</span>
                </div>
              </div>

              <button
                onClick={resetCurtainTransform}
                style={{ touchAction: 'manipulation' }}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 active:scale-95 transition duration-150 min-h-[44px]"
              >
                <RotateCcw size={14} />
                <span>Center Curtain</span>
              </button>

              {/* ── Background Image Adjustment ── */}
              <div className="border-t border-neutral-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-neutral-500" />
                    Background Image
                  </p>
                  <button
                    onClick={() => setBgOffset({ x: 0, y: 0, scale: 1 })}
                    style={{ touchAction: 'manipulation' }}
                    className="text-[11px] text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition"
                  >
                    <RotateCcw size={11} />
                    Reset
                  </button>
                </div>

                <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-100 flex flex-col gap-3">
                  <SliderRow
                    label="Pan Left / Right"
                    value={bgOffset.x}
                    min={-50}
                    max={50}
                    step={1}
                    unit="%"
                    onChange={(v) => setBgOffset({ x: v })}
                  />
                  <SliderRow
                    label="Pan Up / Down"
                    value={bgOffset.y}
                    min={-50}
                    max={50}
                    step={1}
                    unit="%"
                    onChange={(v) => setBgOffset({ y: v })}
                  />
                  <SliderRow
                    label="Zoom"
                    value={bgOffset.scale}
                    min={0.5}
                    max={3}
                    step={0.05}
                    display={`${bgOffset.scale.toFixed(2)}×`}
                    onChange={(v) => setBgOffset({ scale: v })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── ANIMATION TAB ── */}
          {activeTab === 'animation' && <AnimationControls />}
        </div>

        {/* Grace area above Android gesture bar — ensures last button is never obscured */}
        <div
          style={{
            height: 'max(env(safe-area-inset-bottom, 0px), 28px)',
            flexShrink: 0
          }}
        />
      </div>
    </div>
  );
}
