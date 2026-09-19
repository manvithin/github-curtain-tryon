/**
 * fabricPanel.js — Fabric upload/preview for one layer.
 *
 * Used for both front and back fabric slots.
 * Handles: click-to-upload, drag & drop, preview, replace button.
 */

import {
  validateFabricFile,
  processImageFile,
} from '../curtain/materials.js';
import { showToast } from './toast.js';

/**
 * @param {{
 *   slotEl:      HTMLElement,
 *   emptyEl:     HTMLElement,
 *   filledEl:    HTMLElement,
 *   previewImg:  HTMLImageElement,
 *   fileInput:   HTMLInputElement,
 *   replaceBtnId:string,
 *   onFabricReady: (dataUrl: string) => void,
 *   label: string,
 * }} opts
 */
export function setupFabricPanel(opts) {
  const {
    slotEl, emptyEl, filledEl, previewImg, fileInput,
    replaceBtnId, onFabricReady, label,
  } = opts;

  const replaceBtn = document.getElementById(replaceBtnId);

  // Click on slot or empty prompt → open file picker
  slotEl.addEventListener('click', (e) => {
    if (e.target === replaceBtn || replaceBtn?.contains(e.target)) return;
    fileInput.click();
  });

  // Replace button
  replaceBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  // File input change
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    await handleFile(file);
    fileInput.value = ''; // Reset so same file can be re-selected
  });

  // Drag & drop
  slotEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    slotEl.classList.add('drag-over');
  });
  slotEl.addEventListener('dragleave', () => slotEl.classList.remove('drag-over'));
  slotEl.addEventListener('drop', async (e) => {
    e.preventDefault();
    slotEl.classList.remove('drag-over');
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  });

  async function handleFile(file) {
    const { valid, error } = validateFabricFile(file);
    if (!valid) {
      showToast(error, 'error');
      return;
    }

    try {
      const dataUrl = await processImageFile(file);

      // Show preview
      previewImg.src = dataUrl;
      emptyEl.classList.add('hidden');
      filledEl.classList.remove('hidden');

      // Notify parent
      onFabricReady(dataUrl);
      showToast(`${label} applied.`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to load fabric image.', 'error');
    }
  }
}
