import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { CurtainModel, type CurtainConfig, type QuadPoints } from '../modules/curtain/curtainModel.ts'

/**
 * Loads the single curtain GLB once and wraps it in a CurtainModel.
 * `seedPoints` hydrates the curtain's deformation target at construction so
 * the curtain renders at the selected quadrilateral immediately (no flash).
 *
 * The model is rebuilt only when the four window corners change (i.e. a new
 * window is selected), never on open/color/fabric updates — those go through
 * model.set() and the frame loop.
 *
 * The GLB is preloaded by CameraView (preloadCurtain) while the user places
 * corners, so the asset is cached by the time Confirm fires.
 */
export function useCurtainModel(seedPoints: QuadPoints): CurtainModel | null {
  const gltf = useLoader(GLTFLoader, '/models/curtain.glb')
  return useMemo(() => {
    if (!gltf.scene) return null
    const clone = gltf.scene.clone(true)
    const model = new CurtainModel(clone)
    model.set({ points: seedPoints })
    return model
  }, [gltf, seedPoints])
}

export type { CurtainConfig }

/** Fetch+cache the curtain GLB while the camera is active (before Confirm). */
export function preloadCurtain(): void {
  useLoader.preload(GLTFLoader, '/models/curtain.glb')
}
