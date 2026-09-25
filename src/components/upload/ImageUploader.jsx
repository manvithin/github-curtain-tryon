import React, { useRef, useState } from 'react';
import { Camera, Upload, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';
import { useVisualizerStore } from '../../store/visualizerStore.js';
import { CameraCapture } from './CameraCapture.jsx';
import { processRoomImage } from '../../utils/imageUtils.js';

const SAMPLE_ROOMS = [
  {
    id: 'room-modern-living',
    name: 'Modern Living Room',
    url: '/rooms/modern_living.webp',
    width: 1280,
    height: 960
  },
  {
    id: 'room-cozy-bedroom',
    name: 'Cozy Bedroom Window',
    url: '/rooms/bedroom_window.webp',
    width: 1280,
    height: 960
  },
  {
    id: 'room-minimalist-studio',
    name: 'Minimalist Studio',
    url: '/rooms/minimalist_studio.webp',
    width: 1280,
    height: 960
  }
];

export function ImageUploader() {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [isUploading, setIsUploading] = useState(false);
  const [showWebcamModal, setShowWebcamModal] = useState(false);

  const setBackgroundImage = useVisualizerStore((state) => state.setBackgroundImage);
  const showToast = useVisualizerStore((state) => state.showToast);

  // Upload file via backend API or fallback to local object URL
  const processImageFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, or WebP).', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast('Image file exceeds the 15MB limit.', 'error');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setBackgroundImage({
            id: json.data.id,
            url: json.data.url,
            width: json.data.width,
            height: json.data.height,
            isSample: false
          });
          return;
        }
      }

      // Client-side processing: downsample to max 2048px for GPU performance
      const { dataUrl, width, height } = await processRoomImage(file);
      setBackgroundImage({
        id: `local-${Date.now()}`,
        url: dataUrl,
        width,
        height,
        isSample: false
      });
    } catch (err) {
      console.warn('Image processing fallback:', err);
      const localUrl = URL.createObjectURL(file);
      setBackgroundImage({
        id: `local-${Date.now()}`,
        url: localUrl,
        width: 1920,
        height: 1080,
        isSample: false
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleCameraSnap = async (dataUrl) => {
    setShowWebcamModal(false);
    setIsUploading(true);
    try {
      // Convert data URL to Blob
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await processImageFile(file);
    } catch (e) {
      setBackgroundImage({
        id: `cam-${Date.now()}`,
        url: dataUrl,
        width: 1280,
        height: 720,
        isSample: false
      });
      setIsUploading(false);
    }
  };

  const handleSelectSample = (sample) => {
    setBackgroundImage({
      ...sample,
      isSample: true
    });
    showToast(`Loaded ${sample.name}`, 'info');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 via-white to-neutral-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Main card */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-neutral-100/80 text-center">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mx-auto mb-5 shadow-md">
          <Sparkles size={28} className="text-amber-400" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight mb-2">
          Visualize Your Curtains
        </h1>
        <p className="text-sm text-neutral-500 mb-8 leading-relaxed max-w-xs mx-auto">
          Photograph your window or upload a room image to preview realistic 3D curtains with custom fabrics.
        </p>

        {/* Primary Actions */}
        <div className="flex flex-col gap-3.5 mb-8">
          {/* Take Photo Button */}
          <button
            onClick={() => {
              // On mobile, native capture input opens device camera directly.
              // On desktop without mobile capture, offer the WebRTC camera modal.
              if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                cameraInputRef.current?.click();
              } else {
                setShowWebcamModal(true);
              }
            }}
            disabled={isUploading}
            className="w-full h-14 rounded-2xl bg-neutral-900 hover:bg-black active:scale-[0.98] text-white font-medium flex items-center justify-center gap-3 transition shadow-md disabled:opacity-50 text-base"
          >
            <Camera size={20} className="text-amber-400" />
            <span>Take Photo</span>
          </button>

          {/* Upload Photo Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full h-14 rounded-2xl bg-neutral-100 hover:bg-neutral-200/80 active:scale-[0.98] text-neutral-800 font-medium flex items-center justify-center gap-3 transition disabled:opacity-50 text-base border border-neutral-200/60"
          >
            <Upload size={20} className="text-neutral-600" />
            <span>Upload Photo</span>
          </button>
        </div>

        {/* Quick Start Presets */}
        <div className="border-t border-neutral-100 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4">
            Or try with a sample room
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {SAMPLE_ROOMS.map((room) => (
              <button
                key={room.id}
                onClick={() => handleSelectSample(room)}
                className="group flex flex-col items-center gap-1.5 p-2 rounded-xl border border-neutral-100 hover:border-neutral-300 hover:bg-neutral-50 transition active:scale-95"
              >
                <div className="w-full aspect-4/3 rounded-lg overflow-hidden bg-neutral-200 relative">
                  <img
                    src={room.url}
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>
                <span className="text-[11px] font-medium text-neutral-600 group-hover:text-neutral-900 truncate w-full text-center">
                  {room.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Camera Capture Modal for Desktop */}
      {showWebcamModal && (
        <CameraCapture
          onCapture={handleCameraSnap}
          onClose={() => setShowWebcamModal(false)}
        />
      )}
    </div>
  );
}
