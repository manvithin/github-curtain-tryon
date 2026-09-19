/**
 * main.js — Application entry point.
 *
 * Boot sequence:
 *  1. Create renderer + scene + camera + lights
 *  2. Start render loop
 *  3. Wire UI controls + sidebar (no model yet)
 *  4. Wire photo upload → triggers model load on first photo
 *  5. Wire fabric panels
 *
 * KEY FIX: The GLB model is NOT loaded on startup.
 * It loads automatically the FIRST time a background photo is uploaded.
 * This keeps the initial screen clean and avoids loading 3D assets
 * the user may never use if they are still choosing a photo.
 */

import * as THREE from 'three';

import { createRenderer }                           from './scene/renderer.js';
import { createScene, createCamera,
         setupLights, updateCameraAspect }          from './scene/scene.js';
import { loadCurtainModel }                         from './scene/loader.js';

import { setupCurtain, teardownCurtain,
         applyFrontFabric, applyBackFabric }        from './curtain/controller.js';

import { setBackgroundPhoto, loadPhotoFile,
         captureFromCamera, snapshotVideo }         from './background/photo.js';

import { setupFabricPanel }                         from './ui/fabricPanel.js';
import { setupControls }                            from './ui/controls.js';
import { setupSidebar }                             from './ui/sidebar.js';
import { showToast }                                from './ui/toast.js';
import { store }                                    from './state.js';

// ── DOM refs ─────────────────────────────────────────────────────────────
const mountEl    = document.getElementById('rendererMount');
const canvasArea = document.getElementById('canvasArea');

// ── 1 · Renderer + Scene + Camera + Lights ───────────────────────────────
const renderer = createRenderer(mountEl);
const scene    = createScene();
const camera   = createCamera(mountEl);
setupLights(scene);

new ResizeObserver(() => updateCameraAspect(camera, mountEl)).observe(mountEl);

// ── 2 · Render loop ───────────────────────────────────────────────────────
let rafId = null;
function renderLoop() {
  rafId = requestAnimationFrame(renderLoop);
  renderer.render(scene, camera);
}
renderLoop();

// ── 3 · Controls + Sidebar ────────────────────────────────────────────────
setupControls();
setupSidebar();

// ── Model loading (triggered by first photo, not on startup) ──────────────
let _modelLoadStarted = false;

async function ensureModelLoaded() {
  if (_modelLoadStarted) return;      // only load once
  _modelLoadStarted = true;

  store.set({ modelLoading: true });
  const spinner = createSpinner();
  mountEl.appendChild(spinner);

  try {
    const result = await loadCurtainModel(scene);
    spinner.remove();

    setupCurtain({
      ...result,
      camera,
      rendererCanvas: renderer.domElement,
    });

    showToast('Curtain loaded — drag to position it over your window.', 'success', 4500);
  } catch (err) {
    spinner.remove();
    _modelLoadStarted = false;        // allow retry

    const isNotFound =
      err?.message?.includes('404') ||
      err?.message?.includes('Failed to fetch') ||
      err?.message?.includes('NetworkError');

    const userMsg = isNotFound
      ? 'Curtain model not found. Drop curtain.glb in the public/ folder and reload.'
      : `Could not load curtain model: ${err.message}`;

    store.set({ modelLoading: false, modelError: userMsg });

    const notice = document.querySelector('#noModelNotice p');
    if (notice) notice.innerHTML =
      `Drop <code>curtain.glb</code> in <code>public/</code> and reload.`;

    showToast(userMsg, 'error', 6000);
    console.warn('[Curtain Visualizer]', userMsg, err);
  }
}

// ── 4 · Photo Upload ──────────────────────────────────────────────────────
const photoInput        = document.getElementById('photoInput');
const photoUploadZone   = document.getElementById('photoUploadZone');
const photoUploadPrompt = document.getElementById('photoUploadPrompt');
const photoPreviewWrap  = document.getElementById('photoPreviewWrap');
const photoThumb        = document.getElementById('photoThumb');
const replacePhotoBtn   = document.getElementById('replacePhotoBtn');
const cameraBtn         = document.getElementById('cameraBtn');

// Click on zone (but not replace button) → open file picker
photoUploadZone.addEventListener('click', (e) => {
  if (replacePhotoBtn?.contains(e.target)) return;
  photoInput.click();
});

replacePhotoBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  photoInput.click();
});

photoInput.addEventListener('change', async () => {
  const file = photoInput.files?.[0];
  if (!file) return;
  await handlePhotoFile(file);
  photoInput.value = '';
});

// Drag & drop onto the canvas area
canvasArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  canvasArea.classList.add('drag-over');
});
canvasArea.addEventListener('dragleave', () => canvasArea.classList.remove('drag-over'));
canvasArea.addEventListener('drop', async (e) => {
  e.preventDefault();
  canvasArea.classList.remove('drag-over');
  const file = [...(e.dataTransfer.files || [])].find(f => f.type.startsWith('image/'));
  if (file) await handlePhotoFile(file);
});

// Drag & drop onto the sidebar upload zone
photoUploadZone.addEventListener('dragover',  (e) => { e.preventDefault(); photoUploadZone.classList.add('drag-over'); });
photoUploadZone.addEventListener('dragleave', ()  => photoUploadZone.classList.remove('drag-over'));
photoUploadZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  photoUploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files?.[0];
  if (file) await handlePhotoFile(file);
});

async function handlePhotoFile(file) {
  try {
    const url = await loadPhotoFile(file);

    // Show photo as background
    setBackgroundPhoto(url);

    // Update sidebar thumbnail
    photoThumb.src = url;
    photoUploadPrompt.classList.add('hidden');
    photoPreviewWrap.classList.remove('hidden');

    showToast('Photo loaded.', 'success', 2000);

    // ★ Load the 3D model now (first time only)
    ensureModelLoaded();

  } catch (err) {
    showToast(err.message || 'Failed to load photo.', 'error');
  }
}

// ── Camera capture ────────────────────────────────────────────────────────
const cameraModal        = document.getElementById('cameraModal');
const cameraVideo        = document.getElementById('cameraVideo');
const capturePhotoBtn    = document.getElementById('capturePhotoBtn');
const cancelCameraBtn    = document.getElementById('cancelCameraBtn');
const closeCameraModal   = document.getElementById('closeCameraModal');
const cameraModalBackdrop = document.getElementById('cameraModalBackdrop');

let _cameraStream = null;

cameraBtn?.addEventListener('click', async () => {
  const stream = await captureFromCamera();
  if (!stream) return;
  _cameraStream = stream;
  cameraVideo.srcObject = stream;
  cameraModal.classList.remove('hidden');
});

function stopCamera() {
  _cameraStream?.getTracks().forEach(t => t.stop());
  _cameraStream = null;
  cameraVideo.srcObject = null;
  cameraModal.classList.add('hidden');
}

capturePhotoBtn?.addEventListener('click', () => {
  if (!cameraVideo.srcObject) return;
  const dataUrl = snapshotVideo(cameraVideo);

  setBackgroundPhoto(dataUrl);
  photoThumb.src = dataUrl;
  photoUploadPrompt.classList.add('hidden');
  photoPreviewWrap.classList.remove('hidden');
  stopCamera();
  showToast('Photo captured.', 'success', 2000);

  // ★ Load model after camera capture too
  ensureModelLoaded();
});

cancelCameraBtn?.addEventListener('click',       stopCamera);
closeCameraModal?.addEventListener('click',      stopCamera);
cameraModalBackdrop?.addEventListener('click',   stopCamera);

// ── 5 · Fabric Panels ─────────────────────────────────────────────────────

setupFabricPanel({
  slotEl:       document.getElementById('frontFabricSlot'),
  emptyEl:      document.getElementById('frontFabricEmpty'),
  filledEl:     document.getElementById('frontFabricFilled'),
  previewImg:   document.getElementById('frontFabricPreview'),
  fileInput:    document.getElementById('frontFabricInput'),
  replaceBtnId: 'replaceFrontFabricBtn',
  label:        'Front fabric',
  onFabricReady: async (dataUrl) => {
    if (!store.get().modelLoaded) {
      showToast('Upload a window photo first to load the curtain.', 'error');
      return;
    }
    try {
      await applyFrontFabric(dataUrl);
    } catch (err) {
      showToast('Failed to apply front fabric.', 'error');
    }
  },
});

setupFabricPanel({
  slotEl:       document.getElementById('backFabricSlot'),
  emptyEl:      document.getElementById('backFabricEmpty'),
  filledEl:     document.getElementById('backFabricFilled'),
  previewImg:   document.getElementById('backFabricPreview'),
  fileInput:    document.getElementById('backFabricInput'),
  replaceBtnId: 'replaceBackFabricBtn',
  label:        'Back fabric',
  onFabricReady: async (dataUrl) => {
    if (!store.get().modelLoaded) {
      showToast('Upload a window photo first to load the curtain.', 'error');
      return;
    }
    try {
      await applyBackFabric(dataUrl);
    } catch (err) {
      showToast('Failed to apply back fabric.', 'error');
    }
  },
});

// Dim back fabric slot for single-layer models
store.subscribe((state) => {
  const backSection = document.getElementById('fabricBackSection');
  if (backSection && state.singleLayerModel) {
    backSection.style.opacity      = '0.4';
    backSection.style.pointerEvents = 'none';
    backSection.title = 'This curtain model has only one layer.';
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────
function createSpinner() {
  const el = document.createElement('div');
  el.className = 'loader-overlay';
  el.innerHTML = '<div class="spinner"></div>';
  return el;
}

// ── Cleanup ───────────────────────────────────────────────────────────────
window.addEventListener('beforeunload', () => {
  cancelAnimationFrame(rafId);
  teardownCurtain();
  renderer.dispose();
});
