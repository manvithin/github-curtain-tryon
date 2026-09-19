/**
 * photo.js — Window photo background system.
 *
 * The photo is a plain <img> element in the DOM, positioned BEHIND the
 * transparent Three.js canvas. It is NEVER part of the 3D scene.
 *
 * Supports:
 *  - File upload (drag & drop or click)
 *  - Camera capture via getUserMedia
 */

import { store }     from '../state.js';
import { showToast } from '../ui/toast.js';

const bgPhotoWrap  = document.getElementById('bgPhotoWrap');
const bgPhoto      = document.getElementById('bgPhoto');
const emptyState   = document.getElementById('canvasEmptyState');

/**
 * Display a photo URL as the background.
 * @param {string} url — object URL or data URL
 */
export function setBackgroundPhoto(url) {
  bgPhoto.src = url;
  bgPhotoWrap.classList.remove('hidden');
  // Hide the empty state once we have a photo
  if (emptyState) emptyState.classList.add('hidden');
  store.set({ photoUrl: url, hasPhoto: true });
}

/**
 * Open camera, capture a frame, and use as background.
 */
export async function captureFromCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('Camera not supported on this device.', 'error');
    return null;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      showToast('Camera permission denied.', 'error');
    } else {
      showToast('Could not access camera.', 'error');
    }
    return null;
  }

  return stream;
}

/**
 * Snapshot a video frame and set as background.
 * @param {HTMLVideoElement} video
 * @returns {string} data URL
 */
export function snapshotVideo(video) {
  const canvas = document.createElement('canvas');
  canvas.width  = video.videoWidth  || 1920;
  canvas.height = video.videoHeight || 1080;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Validate and load a File as background photo.
 * @param {File} file
 * @returns {Promise<string>} — object URL
 */
export function loadPhotoFile(file) {
  return new Promise((resolve, reject) => {
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!ALLOWED.includes(file.type)) {
      reject(new Error('Unsupported image format. Please use JPG, PNG, or WebP.'));
      return;
    }
    const MAX_MB = 20;
    if (file.size > MAX_MB * 1024 * 1024) {
      reject(new Error(`Photo is too large. Maximum size is ${MAX_MB} MB.`));
      return;
    }
    const url = URL.createObjectURL(file);
    // Validate it actually loads
    const img = new Image();
    img.onload  = () => resolve(url);
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Invalid image file.')); };
    img.src = url;
  });
}
