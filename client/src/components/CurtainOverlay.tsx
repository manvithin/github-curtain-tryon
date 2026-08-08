import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect } from 'react'
import { useCurtainModel } from './curtainScene.ts'
import type { CurtainConfig } from '../modules/curtain/curtainModel.ts'
import type { PlanePlacement } from '../modules/curtain/placement.ts'

interface CurtainOverlayProps {
  placement: PlanePlacement | null
  config: CurtainConfig
}

/**
 * Transparent WebGL overlay that draws the curtain over the live video.
 * The camera matches the phone's estimated vertical FOV so the curtain lands
 * where the user tapped.
 */
export default function CurtainOverlay({ placement, config }: CurtainOverlayProps) {
  return (
    <Canvas
      className="pointer-events-none absolute inset-0 !h-full !w-full"
      camera={{ fov: placement?.cameraFov ?? 72, near: 0.1, far: 20 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <hemisphereLight args={['#ffffff', '#dcdcdc', 0.5]} />
      {placement && <CurtainObject placement={placement} config={config} />}
    </Canvas>
  )
}

function CurtainObject({ placement, config }: { placement: PlanePlacement; config: CurtainConfig }) {
  // Seed only with the window geometry so the model is rebuilt exclusively
  // when the user re-anchors a different window size.
  const model = useCurtainModel({ width: placement.width, height: placement.height })

  // drive the open/close tween every frame
  useFrame((_, delta) => model?.update(delta * 1000))

  useEffect(() => {
    if (!model) return
    model.set({
      width: config.width,
      height: config.height,
      open: config.open,
      draw: config.draw,
      color: config.color,
      roughness: config.roughness,
      translucency: config.translucency,
      placed: true,
    })
  }, [model, config])

  if (!model) return null
  return <primitive object={model.group} position={[placement.x, placement.y, placement.z]} />
}
