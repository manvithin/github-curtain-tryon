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
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

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
      <div className="relative z-10 w-full max-w-md bg-neutral-900/85 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 text-center">
        {/* RUAM Brand Logo */}
        <div className="flex items-center justify-center mx-auto mb-6">
          <img
            src="/RUAM_WATERMARK.png"
            alt="RUAM"
            className="h-12 w-auto object-contain opacity-95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]"
          />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
          Curtain Visualizer
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mb-7 leading-relaxed max-w-xs mx-auto">
          Photograph your window or upload a room photo to see how custom curtains will look in your space.
        </p>

        {/* Primary Actions */}
        <div className="flex flex-col gap-3 mb-7">
          {/* Take Photo Button */}
          <button
            onClick={() => {
              if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
                cameraInputRef.current?.click();
              } else {
                setShowWebcamModal(true);
              }
            }}
            disabled={isUploading}
            style={{ touchAction: 'manipulation' }}
            className="w-full h-13 rounded-2xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-neutral-950 font-bold flex items-center justify-center gap-2.5 transition active:scale-98 shadow-lg shadow-amber-400/20 disabled:opacity-50 text-sm"
          >
            <Camera size={19} />
            <span>Take Window Photo</span>
          </button>

          {/* Upload Photo Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            style={{ touchAction: 'manipulation' }}
            className="w-full h-13 rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white font-medium flex items-center justify-center gap-2.5 transition active:scale-98 disabled:opacity-50 text-sm border border-white/10"
          >
            <Upload size={18} className="text-white/80" />
            <span>Upload Photo</span>
          </button>
        </div>

        {/* Quick Start Presets */}
        <div className="border-t border-white/10 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3.5">
            Or try with a sample room
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {SAMPLE_ROOMS.map((room) => (
              <button
                key={room.id}
                onClick={() => handleSelectSample(room)}
                style={{ touchAction: 'manipulation' }}
                className="group flex flex-col items-center gap-1.5 p-1.5 rounded-xl border border-white/10 hover:border-amber-400/60 bg-white/5 hover:bg-white/10 transition active:scale-95"
              >
                <div className="w-full aspect-4/3 rounded-lg overflow-hidden bg-neutral-800 relative">
                  <img
                    src={room.url}
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>
                <span className="text-[10px] font-medium text-neutral-300 group-hover:text-white truncate w-full text-center">
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
