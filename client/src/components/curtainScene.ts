import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { CurtainModel, type CurtainConfig } from '../modules/curtain/curtainModel.ts'

interface CurtainSeed {
  /** Window span the curtain must fill — set once at placement, never rehydrated. */
  width: number
  height: number
}

/**
 * Loads the single curtain GLB once and wraps it in a CurtainModel.
 * `seed.width/height` (the selected window size) hydrates scale at construction
 * so the curtain never flashes at the asset's default size. The model is only
 * rebuilt when the window geometry itself changes, not on open/color updates.
 *
 * The GLB is fetched via useLoader.preload while the camera is active (see
 * CameraView), so by the time the user confirms a window this is cached.
 */
export function useCurtainModel(seed: CurtainSeed): CurtainModel | null {
  const gltf = useLoader(GLTFLoader, '/models/curtain.glb')
  return useMemo(() => {
    if (!gltf.scene) return null
    const clone = gltf.scene.clone(true)
    const model = new CurtainModel(clone, { width: seed.width, height: seed.height, placed: true })
    return model
  }, [gltf, seed.width, seed.height])
}

export type { CurtainConfig }

export function preloadCurtain(): void {
  useLoader.preload(GLTFLoader, '/models/curtain.glb')
}
