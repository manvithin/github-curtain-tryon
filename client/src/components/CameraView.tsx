import { useCallback, useEffect, useRef, useState } from 'react'
import type { Point, Quad } from '../modules/window/windowPlane.ts'
import {
  displayToVideo,
  isValidQuad,
  pointsToQuad,
} from '../modules/window/windowPlane.ts'
import { draw } from './cameraOverlay.tsx'

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
    setStage({ corners: [], quad })
    setError('')
  }, [])

  const handleReanchor = useCallback(() => {
    setStage({ corners: [], quad: null })
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
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-neutral-100 px-5 py-3 text-sm font-semibold text-neutral-900 active:scale-95"
        >
          Re-anchor
        </button>
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