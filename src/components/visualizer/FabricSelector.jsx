import React, { useRef, useState, useEffect } from 'react';
import { Plus, Check, Trash2, Sliders, Loader2, MoreVertical, X, Layers } from 'lucide-react';
import { useVisualizerStore } from '../../store/visualizerStore.js';
import { processFabricImage } from '../../utils/imageUtils.js';
import { BUILTIN_FABRICS, SHEER_PRESETS } from '../../config/curtainConfig.js';

const LOCAL_CUSTOM_FABRICS_KEY = 'custom_fabrics_v1';

function getStoredCustomFabrics() {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOM_FABRICS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveStoredCustomFabrics(list) {
  try {
    localStorage.setItem(LOCAL_CUSTOM_FABRICS_KEY, JSON.stringify(list));
  } catch (e) {}
}

// ─── Reusable swatch grid ────────────────────────────────────────────────────
function SwatchGrid({
  fabrics,
  selectedFabric,
  onSelect,
  onMenuOpen,
  onTouchStart,
  onTouchEnd,
  isUploading,
  onUploadClick,
  showUpload = true,
}) {
  return (
    <div className="flex items-start gap-3 overflow-x-auto pb-2 scrollbar-none touch-pan-x">
      {/* Upload button */}
      {showUpload && (
        <button
          onClick={onUploadClick}
          disabled={isUploading}
          style={{ touchAction: 'manipulation' }}
          className="shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2 border-dashed border-neutral-300 hover:border-neutral-900 bg-neutral-50 hover:bg-neutral-100 transition duration-150 active:scale-95 text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 size={20} className="animate-spin text-neutral-800" />
          ) : (
            <>
              <Plus size={22} />
              <span className="text-[10px] font-semibold mt-1">Upload</span>
            </>
          )}
        </button>
      )}

      {/* Swatches */}
      {fabrics.map((fabric) => {
        const isSelected = selectedFabric?.id === fabric.id;
        return (
          <div
            key={fabric.id}
            onTouchStart={() => onTouchStart(fabric)}
            onTouchEnd={onTouchEnd}
            onTouchMove={onTouchEnd}
            onClick={() => onSelect(fabric)}
            className="group relative shrink-0 flex flex-col items-center w-20 cursor-pointer active:scale-95 transition-all duration-150"
          >
            <div
              className={`relative w-20 h-20 rounded-2xl overflow-hidden shadow-xs border-2 transition duration-200 ${
                isSelected
                  ? 'border-neutral-950 ring-2 ring-neutral-950/20 scale-102'
                  : 'border-neutral-200 hover:border-neutral-400'
              }`}
            >
              <img
                src={fabric.thumbnailUrl || fabric.imageUrl}
                alt={fabric.name}
                className="w-full h-full object-cover"
              />

              {isSelected && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                  <div className="w-6 h-6 rounded-full bg-white text-neutral-950 flex items-center justify-center shadow-md">
                    <Check size={14} strokeWidth={3} />
                  </div>
                </div>
              )}

              {onMenuOpen && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMenuOpen(fabric);
                  }}
                  title="Fabric Options"
                  style={{ touchAction: 'manipulation' }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-neutral-900 transition active:scale-90 z-10"
                >
                  <MoreVertical size={13} />
                </button>
              )}
            </div>

            <span className="text-[11px] font-medium text-neutral-700 text-center truncate w-full mt-1.5 leading-tight">
              {fabric.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tiling controls for a given fabric ──────────────────────────────────────
function TilingControls({ fabric, onUpdate }) {
  if (!fabric) return null;
  return (
    <div className="border-t border-neutral-100 pt-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 mb-2.5">
        <Sliders size={13} />
        Pattern Tiling
      </p>
      <div className="grid grid-cols-2 gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
        <div>
          <label className="text-[11px] text-neutral-500 font-medium block mb-1">
            Horizontal: <span className="text-neutral-900 font-bold">{fabric.repeatX || 1}×</span>
          </label>
          <input
            type="range" min="1" max="10" step="1"
            value={fabric.repeatX || 1}
            onChange={(e) => onUpdate('x', e.target.value)}
            style={{ touchAction: 'pan-x' }}
            className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
          />
        </div>
        <div>
          <label className="text-[11px] text-neutral-500 font-medium block mb-1">
            Vertical: <span className="text-neutral-900 font-bold">{fabric.repeatY || 1}×</span>
          </label>
          <input
            type="range" min="1" max="10" step="1"
            value={fabric.repeatY || 1}
            onChange={(e) => onUpdate('y', e.target.value)}
            style={{ touchAction: 'pan-x' }}
            className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main FabricSelector ─────────────────────────────────────────────────────
export function FabricSelector() {
  const fileInputRef  = useRef(null);
  const touchTimerRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [menuFabric, setMenuFabric]   = useState(null);

  // Store state
  const selectedModel       = useVisualizerStore((s) => s.selectedModel);
  const fabrics             = useVisualizerStore((s) => s.fabrics);
  const setFabrics          = useVisualizerStore((s) => s.setFabrics);
  const selectedFabric      = useVisualizerStore((s) => s.selectedFabric);
  const setSelectedFabric   = useVisualizerStore((s) => s.setSelectedFabric);
  const selectedSheerFabric = useVisualizerStore((s) => s.selectedSheerFabric);
  const setSelectedSheerFabric = useVisualizerStore((s) => s.setSelectedSheerFabric);
  const showToast           = useVisualizerStore((s) => s.showToast);

  const isDouble = selectedModel === 'double';

  // Which panel is expanded: 'front' | 'sheer'
  const [activePanel, setActivePanel] = useState('front');

  // Load fabric catalog on mount
  useEffect(() => {
    async function loadCatalog() {
      let catalog = [...BUILTIN_FABRICS];
      try {
        const res = await fetch('/api/fabrics');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            catalog = json.data;
          }
        }
      } catch (err) {
        console.warn('Backend fabrics fetch fallback to built-in list:', err);
      }
      const localCustoms = getStoredCustomFabrics();
      const mergedMap = new Map();
      catalog.forEach((f) => mergedMap.set(f.id, f));
      localCustoms.forEach((f) => mergedMap.set(f.id, f));
      const finalFabrics = Array.from(mergedMap.values());
      if (finalFabrics.length > 0) {
        setFabrics(finalFabrics);
        if (!selectedFabric) setSelectedFabric(finalFabrics[0]);
      }
    }
    if (fabrics.length === 0) loadCatalog();
  }, [fabrics.length, selectedFabric, setFabrics, setSelectedFabric]);

  // Upload handler
  const handleUploadFabric = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (JPG, PNG, WebP).', 'error');
      return;
    }
    setIsUploading(true);
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
        category: 'Custom',
      };
      const updatedList = [...fabrics, newFabric];
      setFabrics(updatedList);
      setSelectedFabric(newFabric);
      const localCustoms = getStoredCustomFabrics();
      localCustoms.push(newFabric);
      saveStoredCustomFabrics(localCustoms);
      showToast(`Custom fabric "${newFabric.name}" applied!`, 'success');
      try {
        const formData = new FormData();
        formData.append('fabric', file);
        formData.append('name', fabricName);
        fetch('/api/fabrics', { method: 'POST', body: formData }).catch(() => {});
      } catch (err) {}
    } catch (err) {
      showToast('Failed to process fabric image format.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFabric = async (targetFabric) => {
    if (!targetFabric) return;
    setMenuFabric(null);
    try {
      const updated = fabrics.filter((f) => f.id !== targetFabric.id);
      setFabrics(updated);
      const localCustoms = getStoredCustomFabrics().filter((f) => f.id !== targetFabric.id);
      saveStoredCustomFabrics(localCustoms);
      if (targetFabric.isCustom) {
        fetch(`/api/fabrics/${targetFabric.id}`, { method: 'DELETE' }).catch(() => {});
      }
      if (selectedFabric?.id === targetFabric.id) setSelectedFabric(updated[0] || null);
      showToast(`Fabric "${targetFabric.name}" deleted`, 'info');
    } catch (err) {
      showToast('Could not delete fabric', 'error');
    }
  };

  const handleTouchStart = (fabric) => {
    touchTimerRef.current = setTimeout(() => setMenuFabric(fabric), 450);
  };
  const handleTouchEnd = () => {
    if (touchTimerRef.current) { clearTimeout(touchTimerRef.current); touchTimerRef.current = null; }
  };

  const handleUpdateRepeat = (axis, value) => {
    if (!selectedFabric) return;
    const num = Math.max(1, Math.min(12, parseInt(value, 10) || 1));
    const updated = { ...selectedFabric, [axis === 'x' ? 'repeatX' : 'repeatY']: num };
    setSelectedFabric(updated);
    setFabrics(fabrics.map((f) => (f.id === selectedFabric.id ? updated : f)));
  };

  const handleUpdateSheerRepeat = (axis, value) => {
    if (!selectedSheerFabric) return;
    const num = Math.max(1, Math.min(12, parseInt(value, 10) || 1));
    setSelectedSheerFabric({ ...selectedSheerFabric, [axis === 'x' ? 'repeatX' : 'repeatY']: num });
  };

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Hidden upload input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUploadFabric}
      />

      {/* ── Double-layer: tab switcher ── */}
      {isDouble && (
        <div className="flex rounded-xl overflow-hidden border border-neutral-200 shrink-0">
          <button
            onClick={() => setActivePanel('front')}
            style={{ touchAction: 'manipulation' }}
            className={`flex-1 py-2 text-xs font-semibold transition-all ${
              activePanel === 'front'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            🪟 Front Curtain
          </button>
          <button
            onClick={() => setActivePanel('sheer')}
            style={{ touchAction: 'manipulation' }}
            className={`flex-1 py-2 text-xs font-semibold transition-all border-l border-neutral-200 ${
              activePanel === 'sheer'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <Layers size={12} className="inline mr-1" />
            Sheer / Back
          </button>
        </div>
      )}

      {/* ── Front Fabric panel (always shown for single; shown when activePanel=front for double) ── */}
      {(!isDouble || activePanel === 'front') && (
        <>
          {isDouble && (
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide -mb-2">
              Front Curtain Fabric
            </p>
          )}
          <SwatchGrid
            fabrics={fabrics}
            selectedFabric={selectedFabric}
            onSelect={setSelectedFabric}
            onMenuOpen={setMenuFabric}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            isUploading={isUploading}
            onUploadClick={() => fileInputRef.current?.click()}
            showUpload
          />
          <TilingControls fabric={selectedFabric} onUpdate={handleUpdateRepeat} />
        </>
      )}

      {/* ── Sheer Fabric panel (only in double mode) ── */}
      {isDouble && activePanel === 'sheer' && (
        <>
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide -mb-2">
            Sheer / Back Layer Fabric
          </p>
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-[11px] leading-relaxed">
            This fabric applies to the semi-transparent rear layer only. Front curtain stays unchanged.
          </div>
          <SwatchGrid
            fabrics={SHEER_PRESETS}
            selectedFabric={selectedSheerFabric}
            onSelect={setSelectedSheerFabric}
            onMenuOpen={null}
            onTouchStart={() => {}}
            onTouchEnd={() => {}}
            isUploading={false}
            onUploadClick={() => {}}
            showUpload={false}
          />
          <TilingControls fabric={selectedSheerFabric} onUpdate={handleUpdateSheerRepeat} />
        </>
      )}

      {/* ── 3-Dots / Long-Press Fabric Options Modal ── */}
      {menuFabric && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setMenuFabric(null)}
        >
          <div
            className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl border border-neutral-100 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-neutral-200 shadow-xs">
                  <img
                    src={menuFabric.thumbnailUrl || menuFabric.imageUrl}
                    alt={menuFabric.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs font-semibold text-neutral-900 truncate">
                  {menuFabric.name}
                </span>
              </div>
              <button
                onClick={() => setMenuFabric(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-800 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleDeleteFabric(menuFabric)}
                style={{ touchAction: 'manipulation' }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition active:scale-95 min-h-[44px]"
              >
                <Trash2 size={16} />
                <span>Delete Fabric</span>
              </button>
              <button
                onClick={() => setMenuFabric(null)}
                style={{ touchAction: 'manipulation' }}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium transition min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
