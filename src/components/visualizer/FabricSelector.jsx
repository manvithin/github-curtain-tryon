import React, { useRef, useState, useEffect } from 'react';
import { Plus, Check, Trash2, Sliders, Upload, Loader2 } from 'lucide-react';
import { useVisualizerStore } from '../../store/visualizerStore.js';

export function FabricSelector() {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

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
        console.warn('Could not fetch fabrics from backend, using default list:', err);
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
          showToast(`Custom fabric "${newFabric.name}" applied!`, 'success');
          return;
        }
      }

      // Fallback: Local object URL if backend fails
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
      showToast('Custom fabric applied locally!', 'success');
    } catch (err) {
      console.error('Fabric upload error:', err);
      showToast('Failed to upload fabric image.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFabric = async (fabricId, e) => {
    e.stopPropagation();
    try {
      await fetch(`/api/fabrics/${fabricId}`, { method: 'DELETE' });
      const updated = fabrics.filter((f) => f.id !== fabricId);
      setFabrics(updated);
      if (selectedFabric?.id === fabricId) {
        setSelectedFabric(updated[0] || null);
      }
      showToast('Fabric removed', 'info');
    } catch (err) {
      showToast('Could not delete fabric', 'error');
    }
  };

  const handleUpdateRepeat = (axis, value) => {
    if (!selectedFabric) return;
    const num = Math.max(1, Math.min(12, parseInt(value, 10) || 4));
    const updated = {
      ...selectedFabric,
      [axis === 'x' ? 'repeatX' : 'repeatY']: num
    };
    setSelectedFabric(updated);
    setFabrics(fabrics.map((f) => (f.id === selectedFabric.id ? updated : f)));
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

      {/* Fabric Thumbnails Grid */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {/* Upload Custom Fabric Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="shrink-0 flex flex-col items-center justify-center w-18 h-22 rounded-xl border-2 border-dashed border-neutral-300 hover:border-neutral-900 bg-neutral-50 hover:bg-neutral-100 transition active:scale-95 text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 size={20} className="animate-spin text-neutral-800" />
          ) : (
            <>
              <Plus size={22} />
              <span className="text-[10px] font-medium mt-1">Upload</span>
            </>
          )}
        </button>

        {/* Fabric Swatches */}
        {fabrics.map((fabric) => {
          const isSelected = selectedFabric?.id === fabric.id;
          return (
            <div
              key={fabric.id}
              onClick={() => setSelectedFabric(fabric)}
              className={`group relative shrink-0 flex flex-col items-center w-18 cursor-pointer active:scale-95 transition-all`}
            >
              <div
                className={`relative w-18 h-18 rounded-xl overflow-hidden shadow-xs border-2 transition ${
                  isSelected ? 'border-neutral-950 ring-2 ring-neutral-950/20' : 'border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <img
                  src={fabric.thumbnailUrl || fabric.imageUrl}
                  alt={fabric.name}
                  className="w-full h-full object-cover"
                />

                {isSelected && (
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-white text-neutral-950 flex items-center justify-center shadow-md">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  </div>
                )}

                {/* Delete button for user-uploaded custom fabrics */}
                {fabric.isCustom && (
                  <button
                    onClick={(e) => handleDeleteFabric(fabric.id, e)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition opacity-0 group-hover:opacity-100"
                    title="Delete custom fabric"
                  >
                    <Trash2 size={12} />
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
    </div>
  );
}
