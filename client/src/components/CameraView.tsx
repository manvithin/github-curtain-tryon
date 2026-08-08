import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { Point, Quad } from '../modules/detection/types.ts'
import {
  displayToVideo,
  isValidQuad,
  pointsToQuad,
} from '../modules/window/windowPlane.ts'
import { draw, type PlaceState } from './cameraOverlay.tsx'
import type { PlanePlacement } from '../modules/curtain/placement.ts'
import { computePlacement, bilinearPoint } from '../modules/curtain/placement.ts'
import { preloadCurtain } from './curtainScene.ts'

const CurtainOverlay = lazy(() => import('./CurtainOverlay.tsx'))

type Fabric = { name: string; color: string; roughness: number; translucency: number }
const FABRICS: Fabric[] = [
  { name: 'Linen', color: '#e8e4dc', roughness: 0.92, translucency: 0.08 },
  { name: 'Sheer', color: '#f4f1eb', roughness: 0.85, translucency: 0.65 },
  { name: 'Velvet', color: '#7c3aed', roughness: 0.75, translucency: 0 },
]

const PROMPTS = [
  'Tap the top-left corner of the window',
  'Tap the top-right corner',
  'Tap the bottom-right corner',
  'Tap the bottom-left corner',
]

const DEFAULT_FABRIC = 0

interface CameraViewProps {
  stream: MediaStream
  onExit: () => void
}

export default function CameraView({ stream, onExit }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Placement points are the single source of truth: video-normalized [0..1].
  const [points, setPoints] = useState<Point[]>([])
  const [quad, setQuad] = useState<Quad | null>(null)
  const [placement, setPlacement] = useState<PlanePlacement | null>(null)
  const [error, setError] = useState('')
  const [fabricIdx, setFabricIdx] = useState(DEFAULT_FABRIC)
  const [openRatio, setOpenRatio] = useState(0)

  const pointsRef = useRef(points)
  const quadRef = useRef(quad)
  pointsRef.current = points
  quadRef.current = quad

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    void video.play().catch(() => undefined)
    preloadCurtain()
    return () => {
      video.srcObject = null
    }
  }, [stream])

  // ---- canvas render loop (preview + anchors) ---------------------------
  useEffect(() => {
    const overlay = overlayRef.current
    const wrap = wrapRef.current
    const video = videoRef.current
    if (!overlay || !wrap || !video) return
    const ctx = overlay.getContext('2d')
    if (!ctx) return

    let raf = 0
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
      const curQuad = quadRef.current
      const curPoints = pointsRef.current
      const stage = { corners: curPoints, quad: curQuad }
      const placeState: PlaceState = curQuad ? 'confirmed' : 'placing'
      draw(ctx, overlay, video, stage, placeState)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  // ---- pointer handling: ONLY the backdrop places points ----------------
  // Gate on e.target === e.currentTarget so clicks landing on child controls
  // never become placement points. Controls also stopPropagation.
  const handleBackdropPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (quadRef.current) return
    if (e.target !== e.currentTarget) return
    e.preventDefault()
    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()

    const wrap = wrapRef.current
    const video = videoRef.current
    if (!wrap || !video || video.videoWidth === 0) return

    const rect = wrap.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const pt = displayToVideo(px, py, rect.width, rect.height, video.videoWidth, video.videoHeight)
    if (!pt) return

    if (pointsRef.current.length >= 4) return
    setPoints((prev) => [...prev, pt])
    setError('')
  }, [])

  const handleUndo = useCallback(() => {
    if (quadRef.current) {
      if (window.confirm('Re-select the window?')) {
        setPoints([])
        setQuad(null)
        setPlacement(null)
        setError('')
      }
      return
    }
    setPoints((prev) => (prev.length === 0 ? prev : prev.slice(0, -1)))
    setError('')
  }, [])

  const handleConfirm = useCallback(() => {
    const pts = pointsRef.current
    if (pts.length < 4) {
      setError('Place all four corners first.')
      return
    }
    const built = pointsToQuad(pts)
    if (!built || !isValidQuad(built)) {
      setError('Corners are too small or overlapping — please re-tap them.')
      setPoints([])
      return
    }
    const wrap = wrapRef.current
    const video = videoRef.current
    if (wrap && video && video.videoWidth) {
      const rect = wrap.getBoundingClientRect()
      setPlacement(computePlacement(built, rect.width, rect.height, video.videoWidth, video.videoHeight))
    }
    setQuad(built)
    setPoints([])
    setError('')
  }, [])

  const handleReanchor = useCallback(() => {
    setPoints([])
    setQuad(null)
    setPlacement(null)
    setError('')
    setOpenRatio(0)
  }, [])

  const handleExit = useCallback(() => {
    stream.getTracks().forEach((t) => t.stop())
    onExit()
  }, [stream, onExit])

  const confirmed = !!quad
  const busy = points.length < 4 && !confirmed

  const prompt = confirmed
    ? 'Window placed — curtain anchored here.'
    : points.length === 0
      ? PROMPTS[0]
      : points.length === 4
        ? 'All corners placed — press Confirm to place curtains.'
        : `${PROMPTS[points.length]}${points.length < 4 ? ' — Undo removes only the last point.' : ''}`

  return (
    <div
      ref={wrapRef}
      onPointerDown={handleBackdropPointerDown}
      className="relative h-svh w-full overflow-hidden select-none"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover bg-black pointer-events-none"
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      {placement && (
        <Suspense fallback={null}>
          <CurtainOverlay
            placement={placement}
            config={{
              open: openRatio,
              draw: 0.9,
              color: FABRICS[fabricIdx].color,
              roughness: FABRICS[fabricIdx].roughness,
              translucency: FABRICS[fabricIdx].translucency,
            }}
          />
        </Suspense>
      )}

      <div
        className={`absolute left-1/2 top-6 w-max max-w-[85vw] -translate-x-1/2 rounded-full px-4 py-2 text-center text-xs font-semibold tracking-wide backdrop-blur ${
          error ? 'bg-red-500/70 text-white' : 'bg-black/55 text-white'
        }`}
      >
        {error || prompt}
      </div>

      {busy && points.length > 0 && (
        <p className="absolute bottom-24 left-1/2 -translate-x-1/2 text-[11px] text-white/60">
          {points.length}/4 corners placed
        </p>
      )}

      <div
        className="pointer-events-auto absolute bottom-4 left-1/2 flex w-max -translate-x-1/2 items-center gap-2"
        onClick={stopLayer}
        onPointerDown={stopLayer}
      >
        {busy && points.length > 0 && (
          <button
            onClick={() => handleUndo()}
            className="rounded-full bg-white/80 px-4 py-3 text-sm font-semibold text-neutral-900 backdrop-blur active:scale-95"
          >
            Undo
          </button>
        )}
        {points.length === 4 && (
          <button
            onClick={() => handleConfirm()}
            className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 active:scale-95"
          >
            Confirm placement
          </button>
        )}
      </div>

      {confirmed && (
        <>
          <button
            onClick={() => { setFabricIdx((i) => (i + 1) % FABRICS.length) }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-neutral-900 active:scale-95"
          >
            Fabric: {FABRICS[fabricIdx].name}
          </button>

          <button
            onClick={() => setOpenRatio((o) => (o === 1 ? 0 : 1))}
            className="absolute right-4 bottom-24 rounded-full bg-white/90 px-4 py-3 text-sm font-semibold text-neutral-900 active:scale-95"
          >
            {openRatio === 1 ? 'Close' : 'Open'}
          </button>

          <button
            onClick={() => handleReanchor()}
            className="absolute right-4 top-24 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-900 active:scale-95"
            aria-label="Re-anchor"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 3l-6 6m0 0V5m0 4h4M5 3c-3 3-3 9 0 12l7-7M5 3l7 7" />
            </svg>
          </button>
        </>
      )}

      <button
        onClick={() => handleExit()}
        aria-label="Exit camera"
        className="absolute right-4 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur active:scale-95"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function stopLayer(e: React.SyntheticEvent) {
  e.stopPropagation()
  e.preventDefault()
}

export { bilinearPoint }
