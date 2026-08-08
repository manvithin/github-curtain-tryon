import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { Point, Quad } from '../modules/window/windowPlane.ts'
import {
  displayToVideo,
  isValidQuad,
  pointsToQuad,
} from '../modules/window/windowPlane.ts'
import { draw } from './cameraOverlay.tsx'
import type { PlanePlacement } from '../modules/curtain/placement.ts'
import { computePlacement } from '../modules/curtain/placement.ts'

const CurtainOverlay = lazy(() => import('./CurtainOverlay.tsx'))

interface WindowStage {
  /** Points tapped so far, in video-normalized coords (0..1). */
  corners: Point[]
  /** The confirmed window object, or null. */
  quad: Quad | null
}

interface CameraViewProps {
  stream: MediaStream
  onExit: () => void
}

const FABRICS = [
  { name: 'Linen', color: '#e8e4dc', roughness: 0.92, translucency: 0.08 },
  { name: 'Sheer', color: '#f4f1eb', roughness: 0.85, translucency: 0.65 },
  { name: 'Velvet', color: '#7c3aed', roughness: 0.75, translucency: 0 },
]

const DEFAULT_FABRIC = 0

const PROMPTS = [
  'Tap the top-left corner of the window',
  'Tap the top-right corner',
  'Tap the bottom-right corner',
  'Tap the bottom-left corner',
]

export default function CameraView({ stream, onExit }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const [stage, setStage] = useState<WindowStage>({ corners: [], quad: null })
  const [error, setError] = useState('')
  const [placement, setPlacement] = useState<PlanePlacement | null>(null)
  const [fabricIdx, setFabricIdx] = useState(DEFAULT_FABRIC)
  const [openRatio, setOpenRatio] = useState(0)

  // ---- attach stream ----------------------------------------------------
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    void video.play().catch(() => undefined)
    return () => {
      video.srcObject = null
    }
  }, [stream])

  // ---- render loop (draws preview + persistent anchor) -------------------
  useEffect(() => {
    let raf = 0
    const overlay = overlayRef.current
    const wrap = wrapRef.current
    const video = videoRef.current
    if (!overlay || !wrap || !video) return
    const ctx = overlay.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      overlay.width = Math.round(wrap.clientWidth * dpr)
      overlay.height = Math.round(wrap.clientHeight * dpr)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const loop = () => {
      raf = requestAnimationFrame(loop)
      draw(ctx, overlay, video, stageRef.current)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  // Keep a ref in sync so the draw loop always sees current state.
  const stageRef = useRef(stage)
  stageRef.current = stage

  // ---- pointer handling ---------------------------------------------------
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current
    const video = videoRef.current
    if (!wrap || !video || video.videoWidth === 0) return

    // only accept taps while placing (before confirm)
    if (stageRef.current.quad) return

    const rect = wrap.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const pt = displayToVideo(px, py, rect.width, rect.height, video.videoWidth, video.videoHeight)
    if (!pt) return

    const corners = [...stageRef.current.corners]
    if (corners.length >= 4) return

    const newCorners = [...corners, pt]
    setStage({ corners: newCorners, quad: null })
    setError('')
  }, [])

  const handleConfirm = useCallback(() => {
    const quad = pointsToQuad(stageRef.current.corners)
    if (!quad || !isValidQuad(quad)) {
      setError('Corners are too small or overlapping — please re-tap them.')
      setStage({ corners: [], quad: null })
      return
    }
    const wrap = wrapRef.current
    const video = videoRef.current
    if (wrap && video && video.videoWidth) {
      const rect = wrap.getBoundingClientRect()
      setPlacement(computePlacement(quad, rect.width, rect.height, video.videoWidth, video.videoHeight))
    }
    setStage({ corners: [], quad })
    setError('')
  }, [])

  const handleReanchor = useCallback(() => {
    setStage({ corners: [], quad: null })
    setPlacement(null)
    setError('')
  }, [])

  const handleExit = useCallback(() => {
    stream.getTracks().forEach((t) => t.stop())
    onExit()
  }, [stream, onExit])

  const hasQuad = !!stage.quad
  const prompt = !hasQuad
    ? stage.corners.length === 0
      ? PROMPTS[0]
      : stage.corners.length === 4
        ? 'All corners placed — press Confirm to place curtains.'
        : PROMPTS[stage.corners.length]
    : 'Window placed — curtains anchored here.'

  return (
    <div
      ref={wrapRef}
      onPointerDown={hasQuad ? undefined : handlePointerDown}
      className="relative h-svh w-full overflow-hidden bg-black select-none"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* 3D curtain over the live video */}
      {placement && (
        <Suspense fallback={null}>
          <CurtainOverlay
            placement={placement}
            config={{
              width: placement.width,
              height: placement.height,
              open: openRatio,
              draw: 0.9,
              color: FABRICS[fabricIdx].color,
              roughness: FABRICS[fabricIdx].roughness,
              translucency: FABRICS[fabricIdx].translucency,
            }}
          />
        </Suspense>
      )}

      {/* status pill */}
      <div
        className={`absolute left-1/2 top-6 w-max max-w-[85vw] -translate-x-1/2 rounded-full px-4 py-2 text-center text-xs font-semibold tracking-wide backdrop-blur ${
          error ? 'bg-red-500/70 text-white' : 'bg-black/55 text-white'
        }`}
      >
        {error || prompt}
      </div>

      {/* re-anchor (only when a quad exists) */}
      {hasQuad && (
        <button
          onClick={handleReanchor}
          className="absolute right-4 bottom-24 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-900 active:scale-95"
          aria-label="Re-anchor"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 3l-6 6m0 0V5m0 4h4M5 3c-3 3-3 9 0 12l7-7M5 3l7 7" />
          </svg>
        </button>
      )}

      {/* 1B minimal controls (curtain placed) */}
      {hasQuad && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-black/55 px-3 py-2 backdrop-blur">
          <button
            onClick={() => setOpenRatio((o) => (o === 1 ? 0 : 1))}
            className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-neutral-900 active:scale-95"
          >
            {openRatio === 1 ? 'Close' : 'Open'}
          </button>
          {FABRICS.map((f, i) => (
            <button
              key={f.name}
              onClick={() => setFabricIdx(i)}
              aria-label={f.name}
              className={`h-9 w-9 rounded-full border-2 transition active:scale-90 ${
                i === fabricIdx ? 'border-white' : 'border-white/30'
              }`}
              style={{ backgroundColor: f.color }}
            />
          ))}
        </div>
      )}

      {/* confirm (only while placing, 4 corners ready) */}
      {!hasQuad && stage.corners.length === 4 && (
        <button
          onClick={handleConfirm}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-max max-w-[85vw] rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-950 active:scale-95"
        >
          Confirm placement
        </button>
      )}

      {/* exit camera */}
      <button
        onClick={handleExit}
        aria-label="Exit camera"
        className="absolute right-4 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur active:scale-95"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {!hasQuad && stage.corners.length > 0 && (
        <p className="absolute bottom-24 left-1/2 -translate-x-1/2 text-[11px] text-white/60">
          {stage.corners.length}/4 corners placed
        </p>
      )}
    </div>
  )
}