/**
 * imageUtils.js — Image processing, preview compositing, and export utilities.
 */

/**
 * Processes an uploaded fabric image file into an optimized DataURL in-browser.
 * Resizes to max 1024x1024 while maintaining texture sharpness.
 * Works offline and across all hosting environments (Render, Vercel, Mobile browsers).
 *
 * @param {File} file
 * @returns {Promise<string>} Base64 Data URL
 */
export function processFabricImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Invalid image file format'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid or corrupted image file'));
      img.onload = () => {
        try {
          const maxDim = 1024;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas 2D context unavailable'));

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Return high-quality DataURL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

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
        ctx.drawImage(webglCanvas, 0, 0, width, height);

        // 3. Return high-quality JPEG
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
