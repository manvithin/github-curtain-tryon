import React, { useEffect, useState } from 'react';
import { useVisualizerStore } from './store/visualizerStore.js';
import { ImageUploader } from './components/upload/ImageUploader.jsx';
// Clean canvas-first layout with glassmorphic bottom drawer:
import { CleanLayout as Visualizer } from './components/visualizer/CleanLayout.jsx';
// To switch back to original classic layout, uncomment below:
// import { Visualizer } from './components/visualizer/Visualizer.jsx';
import { Toast } from './components/ui/Toast.jsx';
import { isWebGLAvailable, WebGLFallback } from './components/ui/WebGLFallback.jsx';

export default function App() {
  const step = useVisualizerStore((state) => state.step);
  const loadFromLocalStorage = useVisualizerStore((state) => state.loadFromLocalStorage);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    setWebglSupported(isWebGLAvailable());
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  if (!webglSupported) {
    return <WebGLFallback />;
  }

  return (
    <div className="w-full h-screen overflow-hidden font-sans text-neutral-900 bg-neutral-900 antialiased">
      {step === 'upload' ? <ImageUploader /> : <Visualizer />}
      <Toast />
    </div>
  );
}
