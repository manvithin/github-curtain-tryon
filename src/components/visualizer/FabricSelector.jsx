import React, { useRef, useState, useEffect } from 'react';
import { Plus, Check, Trash2, Sliders, Loader2, MoreVertical, X } from 'lucide-react';
import { useVisualizerStore } from '../../store/visualizerStore.js';

export function FabricSelector() {
  const fileInputRef = useRef(null);
  const touchTimerRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [menuFabric, setMenuFabric] = useState(null); // Fabric object currently targeted by 3-dots / long-press menu

  const fabrics = useVisualizerStore((state) => state.fabrics);
  const setFabrics = useVisualizerStore((state) => state.setFabrics);
  const selectedFabric = useVisualizerStore((state) => state.selectedFabric);
  const setSelectedFabric = useVisualizerStore((state) => state.setSelectedFabric);
  const showToast = useVisualizerStore((state) => state.showToast);

  // Fetch fabric catalog on mount if empty
  useEffect(() => {
    async function fetchFabrics() {
      try {
        const res = await fetch('/api/fabrics');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setFabrics(json.data);
            if (!selectedFabric && json.data.length > 0) {
              setSelectedFabric(json.data[0]);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch fabrics from backend:', err);
      }
    }

    if (fabrics.length === 0) {
      fetchFabrics();
    }
  }, [fabrics.length, selectedFabric, setFabrics, setSelectedFabric]);

  // Handle uploading custom fabric
  const handleUploadFabric = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (JPG, PNG, WebP).', 'error');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('fabric', file);
      formData.append('name', file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      formData.append('repeatX', '1');
      formData.append('repeatY', '1');

      const res = await fetch('/api/fabrics', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const newFabric = json.data;
          setFabrics([...fabrics, newFabric]);
          setSelectedFabric(newFabric);
          showToast(`Custom fabric "${newFabric.name}" added!`, 'success');
          return;
        }
      }

      // Fallback: Local object URL if backend is unreachable or offline
      const localUrl = URL.createObjectURL(file);
      const fallbackFabric = {
        id: `custom-local-${Date.now()}`,
        name: file.name.split('.')[0] || 'Custom Fabric',
        imageUrl: localUrl,
        thumbnailUrl: localUrl,
        repeatX: 1,
        repeatY: 1,
        isCustom: true
      };
      setFabrics([...fabrics, fallbackFabric]);
      setSelectedFabric(fallbackFabric);
      showToast('Custom fabric added!', 'success');
    } catch (err) {
      console.error('Fabric upload error:', err);
      showToast('Failed to process fabric image.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle deleting a fabric
  const handleDeleteFabric = async (fabricToDelete) => {
    if (!fabricToDelete) return;
    setMenuFabric(null);

    try {
      if (fabricToDelete.isCustom) {
        await fetch(`/api/fabrics/${fabricToDelete.id}`, { method: 'DELETE' }).catch(() => {});
      }

      const updated = fabrics.filter((f) => f.id !== fabricToDelete.id);
      setFabrics(updated);

      if (selectedFabric?.id === fabricToDelete.id) {
        setSelectedFabric(updated[0] || null);
      }
      showToast(`Fabric "${fabricToDelete.name}" deleted.`, 'info');
    } catch (err) {
      showToast('Could not delete fabric', 'error');
    }
  };

  // Long press handler for touch devices
  const handleTouchStart = (fabric) => {
    touchTimerRef.current = setTimeout(() => {
      setMenuFabric(fabric);
    }, 500); // 500ms long press threshold
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleUpdateRepeat = (axis, value) => {
    if (!selectedFabric) return;
    const num = Math.max(1, Math.min(12, parseInt(value, 10) || 1));
    const updated = {
      ...selectedFabric,
      [axis === 'x' ? 'repeatX' : 'repeatY']: num
    };
    setSelectedFabric(updated);
    setFabrics(fabrics.map((f) => (f.id === selectedFabric.id ? updated : f)));
  };

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUploadFabric}
      />

      {/* Fabric Swatches Horizontal Scroll */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none touch-pan-x">
        {/* Upload Custom Fabric Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={{ touchAction: 'manipulation' }}
          className="shrink-0 flex flex-col items-center justify-center w-20 h-22 rounded-2xl border-2 border-dashed border-neutral-300 hover:border-neutral-900 bg-neutral-50 hover:bg-neutral-100 transition active:scale-95 text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
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

        {/* Fabric Swatches */}
        {fabrics.map((fabric) => {
          const isSelected = selectedFabric?.id === fabric.id;

          return (
            <div
              key={fabric.id}
              onTouchStart={() => handleTouchStart(fabric)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
              onClick={() => setSelectedFabric(fabric)}
              className="group relative shrink-0 flex flex-col items-center w-20 cursor-pointer active:scale-95 transition-all"
            >
              <div
                className={`relative w-20 h-20 rounded-2xl overflow-hidden shadow-xs border-2 transition ${
                  isSelected ? 'border-neutral-950 ring-2 ring-neutral-950/20' : 'border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <img
                  src={fabric.thumbnailUrl || fabric.imageUrl}
                  alt={fabric.name}
                  className="w-full h-full object-cover"
                />

                {/* Selected Checkmark Badge */}
                {isSelected && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                    <div className="w-6 h-6 rounded-full bg-white text-neutral-950 flex items-center justify-center shadow-md">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  </div>
                )}

                {/* 3-Dots Menu Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuFabric(fabric);
                  }}
                  title="Fabric Options"
                  style={{ touchAction: 'manipulation' }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-neutral-900 opacity-80 group-hover:opacity-100 transition active:scale-90"
                >
                  <MoreVertical size={13} />
                </button>
              </div>

              <span className="text-[11px] font-medium text-neutral-700 text-center truncate w-full mt-1.5 leading-tight">
                {fabric.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Pattern Repeat / Tiling Controls — always visible */}
      {selectedFabric && (
        <div className="border-t border-neutral-100 pt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 mb-2.5">
            <Sliders size={13} />
            Pattern Tiling
          </p>

          <div className="grid grid-cols-2 gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
            <div>
              <label className="text-[11px] text-neutral-500 font-medium block mb-1">
                Horizontal: <span className="text-neutral-900 font-bold">{selectedFabric.repeatX || 1}×</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={selectedFabric.repeatX || 1}
                onChange={(e) => handleUpdateRepeat('x', e.target.value)}
                style={{ touchAction: 'pan-x' }}
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
              />
            </div>
            <div>
              <label className="text-[11px] text-neutral-500 font-medium block mb-1">
                Vertical: <span className="text-neutral-900 font-bold">{selectedFabric.repeatY || 1}×</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={selectedFabric.repeatY || 1}
                onChange={(e) => handleUpdateRepeat('y', e.target.value)}
                style={{ touchAction: 'pan-x' }}
                className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 3-Dots / Long-Press Fabric Options Action Modal ── */}
      {menuFabric && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setMenuFabric(null)}
        >
          <div
            className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl border border-neutral-100 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-neutral-200">
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

            {/* Actions */}
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
