import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RotateCcw, Check } from 'lucide-react';

export function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activeStream = null;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Camera access failed:', err);
        setError('Could not access camera. Please allow camera permissions or upload an image.');
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPhoto(dataUrl);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-4">
      {/* Top bar */}
      <div className="w-full flex justify-between items-center text-white z-10 py-2">
        <span className="text-sm font-medium">Capture Window / Room</span>
        <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition">
          <X size={20} />
        </button>
      </div>

      {/* Viewport */}
      <div className="relative flex-1 w-full max-w-lg rounded-2xl overflow-hidden bg-neutral-900 flex items-center justify-center">
        {error ? (
          <div className="p-6 text-center text-rose-300 text-sm">{error}</div>
        ) : capturedPhoto ? (
          <img src={capturedPhoto} alt="Captured Room" className="w-full h-full object-contain" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}
      </div>

      {/* Controls */}
      <div className="w-full max-w-lg py-6 flex items-center justify-around">
        {capturedPhoto ? (
          <>
            <button
              onClick={handleRetake}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/20 hover:bg-white/30 text-white font-medium text-sm transition"
            >
              <RotateCcw size={18} />
              <span>Retake</span>
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition shadow-lg"
            >
              <Check size={18} />
              <span>Use Photo</span>
            </button>
          </>
        ) : (
          <button
            onClick={handleSnap}
            disabled={!!error}
            className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center bg-white/30 hover:bg-white/50 active:scale-95 transition shadow-lg disabled:opacity-50"
          >
            <div className="w-13 h-13 rounded-full bg-white" />
          </button>
        )}
      </div>
    </div>
  );
}
