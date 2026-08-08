import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { CurtainModel, type CurtainConfig, type QuadPoints } from '../modules/curtain/curtainModel.ts'
import type { PlanePlacement } from '../modules/curtain/placement.ts'

/**
 * Loads the single curtain GLB once and wraps it in a CurtainModel.
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

export function preloadCurtain(): void {
  useLoader.preload(GLTFLoader, '/models/curtain.glb')
}

interface CurtainOverlayProps {
  placement: PlanePlacement
  config: Omit<CurtainConfig, 'points'>
}

export default function CurtainOverlay({ placement, config }: CurtainOverlayProps) {
  const cw = placement.quad.canvasW
  const ch = placement.quad.canvasH

  const camera = useMemo(() => {
    const cam = new THREE.OrthographicCamera(0, cw, ch, 0, 0.1, 200)
    cam.position.set(cw / 2, ch / 2, 10)
    cam.lookAt(cw / 2, ch / 2, 0)
    return cam
  }, [cw, ch])

  const points: QuadPoints = useMemo(
    () => ({
      p1: placement.corners[0],
      p2: placement.corners[1],
      p3: placement.corners[2],
      p4: placement.corners[3],
      canvasH: ch,
    }),
    [placement, ch],
  )

  const fullConfig: CurtainConfig = useMemo(
    () => ({ points, ...config }),
    [points, config],
  )

  return (
    <Canvas
      className="pointer-events-none absolute inset-0 !h-full !w-full"
      camera={camera}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <hemisphereLight args={['#ffffff', '#dcdcdc', 0.5]} />
      <CurtainObject config={fullConfig} />
    </Canvas>
  )
}

function CurtainObject(props: { config: CurtainConfig }) {
  const { config } = props
  const model = useCurtainModel(config.points)
  useFrame((_, delta) => model?.update(delta * 1000))

  useEffect(() => {
    if (model) model.set(config)
  }, [model, config])

  if (!model) return null
  return <primitive object={model.group} />
}