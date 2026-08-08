import { useEffect, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { CurtainModel, type CurtainConfig } from '../modules/curtain/curtainModel.ts'

/**
 * Loads the single curtain GLB asset once and returns a typed accessor.
 * The scene is cached by React so repeated mounts reuse the geometry.
 */
export function useCurtainModel(): CurtainModel | null {
  const gltf = useLoader(GLTFLoader, '/models/curtain.glb')
  return useMemo(() => {
    if (!gltf.scene) return null
    const root = gltf.scene
    // GLTFLoader scene may reuse a cached scene; clone to avoid mutation bleed.
    const clone = root.clone(true)
    return new CurtainModel(clone)
  }, [gltf])
}

export type { CurtainConfig }

/**
 * A lightweight hook to update the model imperatively without gaps.
 * We keep it minimal: callers invoke modelRef.current?.set(config).
 */
export function useCurtainUpdater(model: CurtainModel | null, config: CurtainConfig): void {
  useEffect(() => {
    model?.set(config)
  }, [model, config])
}