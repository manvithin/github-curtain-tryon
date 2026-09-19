/**
 * imageUtils.js — Image processing, preview compositing, and export utilities.
 */

/**
 * Composites the room background image with the active Three.js WebGL canvas,
 * producing a clean, high-resolution exported image without any UI controls.
 *
 * @param {string} backgroundUrl
 * @param {HTMLCanvasElement} webglCanvas
 * @returns {Promise<string>} Base64 Data URL of the composite preview
 */
export async function compositePreview(backgroundUrl, webglCanvas) {
  return new Promise((resolve, reject) => {
    if (!backgroundUrl || !webglCanvas) {
      return reject(new Error('Missing background URL or WebGL canvas'));
    }

    const bgImage = new Image();
    bgImage.crossOrigin = 'anonymous';

    bgImage.onload = () => {
      try {
        const width = bgImage.naturalWidth || bgImage.width || 1920;
        const height = bgImage.naturalHeight || bgImage.height || 1080;

        const offscreen = document.createElement('canvas');
        offscreen.width = width;
        offscreen.height = height;
        const ctx = offscreen.getContext('2d');

        if (!ctx) {
          return reject(new Error('Could not create 2D canvas context'));
        }

        // 1. Draw background image
        ctx.drawImage(bgImage, 0, 0, width, height);

        // 2. Draw WebGL canvas overlaid onto the background
        // Match the viewport coordinate mapping
        ctx.drawImage(webglCanvas, 0, 0, width, height);

        // 3. Return high-quality JPEG / PNG
        const dataUrl = offscreen.toDataURL('image/jpeg', 0.95);
        resolve(dataUrl);
      } catch (err) {
        console.error('[compositePreview] Failed during rendering:', err);
        reject(err);
      }
    };

    bgImage.onerror = (err) => {
      console.error('[compositePreview] Failed to load background image:', err);
      reject(new Error('Failed to load background image for export'));
    };

    bgImage.src = backgroundUrl;
  });
}

/**
 * Triggers browser download of a data URL or blob URL.
 *
 * @param {string} dataUrl
 * @param {string} filename
 */
export function downloadImage(dataUrl, filename = 'curtain-visualization.jpg') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
