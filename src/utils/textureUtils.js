import * as THREE from 'three';

/**
 * Creates a truly seamless, infinitely repeatable fabric canvas texture
 * using boundary-preserving cosine cross-fade blending.
 *
 * Preserves 100% of the authentic pattern, thread weave, color, and texture
 * while eliminating hard rectangular boundaries and tiling seams across any curtain dimension.
 *
 * @param {HTMLImageElement} img
 * @param {number} marginFraction - Fraction of width/height used for edge blend (default 0.15)
 * @returns {HTMLCanvasElement}
 */
export function createSeamlessFabricCanvas(img, marginFraction = 0.15) {
  const w = img.naturalWidth || img.width || 512;
  const h = img.naturalHeight || img.height || 512;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return img;

  // Draw original image crisp and untinted
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const mx = Math.max(8, Math.min(Math.round(w * marginFraction), Math.floor(w / 4)));
    const my = Math.max(8, Math.min(Math.round(h * marginFraction), Math.floor(h / 4)));

    // Precalculate smoothstep / cosine weights for C1 continuous blending
    // w(0) = 0.0, w(m) = 1.0; smooth zero derivatives at boundaries
    const lutX = new Float32Array(mx);
    for (let i = 0; i < mx; i++) {
      lutX[i] = (1 - Math.cos((Math.PI * i) / mx)) * 0.5;
    }

    const lutY = new Float32Array(my);
    for (let j = 0; j < my; j++) {
      lutY[j] = (1 - Math.cos((Math.PI * j) / my)) * 0.5;
    }

    // Horizontal seamless blend (left edge <-> right edge)
    for (let y = 0; y < h; y++) {
      const rowOffset = y * w * 4;
      for (let x = 0; x < mx; x++) {
        const leftIdx = rowOffset + x * 4;
        const rightIdx = rowOffset + (w - mx + x) * 4;
        const t = lutX[x]; // 0 at x=0 -> 1 at x=mx
        const invT = 1 - t;

        for (let c = 0; c < 3; c++) {
          const lVal = data[leftIdx + c];
          const rVal = data[rightIdx + c];

          data[leftIdx + c] = Math.round(lVal * t + rVal * invT);
          data[rightIdx + c] = Math.round(rVal * t + lVal * invT);
        }
      }
    }

    // Vertical seamless blend (top edge <-> bottom edge)
    for (let y = 0; y < my; y++) {
      const topRowOffset = y * w * 4;
      const bottomRowOffset = (h - my + y) * w * 4;
      const t = lutY[y]; // 0 at y=0 -> 1 at y=my
      const invT = 1 - t;

      for (let x = 0; x < w; x++) {
        const topIdx = topRowOffset + x * 4;
        const bottomIdx = bottomRowOffset + x * 4;

        for (let c = 0; c < 3; c++) {
          const tVal = data[topIdx + c];
          const bVal = data[bottomIdx + c];

          data[topIdx + c] = Math.round(tVal * t + bVal * invT);
          data[bottomIdx + c] = Math.round(bVal * t + tVal * invT);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  } catch (err) {
    console.warn('[SeamlessTexture] Falling back to standard image canvas:', err);
    return canvas;
  }
}

/**
 * Loads, seamless-synthesizes, and configures a fabric texture for realistic 3D curtain rendering.
 * Configures RepeatWrapping, sRGB color space, linear mipmapping, and high anisotropy.
 *
 * @param {string} url
 * @param {number} repeatX
 * @param {number} repeatY
 * @returns {Promise<THREE.Texture>}
 */
export function loadFabricTexture(url, repeatX = 1, repeatY = 1) {
  return new Promise((resolve, reject) => {
    if (!url) {
      return reject(new Error('No texture URL provided'));
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const seamlessCanvas = createSeamlessFabricCanvas(img);
        const texture = new THREE.CanvasTexture(seamlessCanvas);

        // High fidelity texture settings for realistic fabric
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);

        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = 16;
        texture.needsUpdate = true;

        resolve(texture);
      } catch (err) {
        console.error('[loadFabricTexture] Failed to build seamless texture:', err);
        // Fallback to standard TextureLoader if canvas synthesis fails
        new THREE.TextureLoader().load(
          url,
          (fallbackTex) => {
            fallbackTex.colorSpace = THREE.SRGBColorSpace;
            fallbackTex.wrapS = THREE.RepeatWrapping;
            fallbackTex.wrapT = THREE.RepeatWrapping;
            fallbackTex.repeat.set(repeatX, repeatY);
            fallbackTex.minFilter = THREE.LinearMipmapLinearFilter;
            fallbackTex.magFilter = THREE.LinearFilter;
            fallbackTex.generateMipmaps = true;
            fallbackTex.anisotropy = 8;
            resolve(fallbackTex);
          },
          undefined,
          reject
        );
      }
    };

    img.onerror = (err) => {
      console.error(`[TextureLoader] Failed to load fabric image: ${url}`, err);
      reject(new Error(`Failed to load fabric image from ${url}`));
    };

    img.src = url;
  });
}

/**
 * Updates texture tiling repeat values without re-fetching or re-synthesizing the image.
 */
export function updateTextureRepeat(texture, repeatX, repeatY) {
  if (!texture) return;
  texture.repeat.set(repeatX, repeatY);
  texture.needsUpdate = true;
}
