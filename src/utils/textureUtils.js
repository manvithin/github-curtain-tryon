import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();

/**
 * Loads and configures a fabric texture for realistic 3D curtain rendering.
 * Configures RepeatWrapping, sRGB color space, linear mipmapping, and max anisotropy.
 *
 * @param {string} url
 * @param {number} repeatX
 * @param {number} repeatY
 * @returns {Promise<THREE.Texture>}
 */
export function loadFabricTexture(url, repeatX = 4, repeatY = 4) {
  return new Promise((resolve, reject) => {
    if (!url) {
      return reject(new Error('No texture URL provided'));
    }

    textureLoader.load(
      url,
      (texture) => {
        // High fidelity texture settings
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);

        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = 8;
        texture.needsUpdate = true;

        resolve(texture);
      },
      undefined,
      (err) => {
        console.error(`[TextureLoader] Failed to load fabric texture: ${url}`, err);
        reject(err);
      }
    );
  });
}

/**
 * Updates texture tiling repeat values without re-fetching the image.
 */
export function updateTextureRepeat(texture, repeatX, repeatY) {
  if (!texture) return;
  texture.repeat.set(repeatX, repeatY);
  texture.needsUpdate = true;
}
