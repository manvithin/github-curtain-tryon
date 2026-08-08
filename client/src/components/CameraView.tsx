import { useCallback, useEffect, useRef, useState } from 'react'
import { detectWindow, resetDetector } from '../modules/detection/detectWindow.ts'
import type { DetectionResult } from '../modules/detection/detectWindow.ts'

interface CameraViewProps {
  stream: MediaStream
  onExit: () => void
}

const DETECT_INTERVAL_MS = 80 // ~12 Hz detection; rendering stays at 60 FPS

const PHASE_LABEL: Record<DetectionResult['phase'], string> = {
  none: 'Window not detected',
  weak: 'Move closer to the window',
  good: 'Window locked',
}

const PHASE_COLOR: Record<DetectionResult['phase'], string> = {
  none: 'rgba(255,255,255,0.85)',
  weak: 'rgba(251,191,36,0.95)', // amber
  good: 'rgba(52,211,153,0.95)', // emerald
}

export default function CameraView({ stream, onExit }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<DetectionResult>({
    phase: 'none',
    confidence: 0,
    quad: null,
    lowLight: false,
  })
  const [result, setResult] = useState<DetectionResult>(resultRef.current)
  const statsRef = useRef({ fps: 0, detectHz: 0 })

  // ---- attach stream to the video element ------------------------------
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    void video.play().catch(() => undefined)
    resetDetector()
    return () => {
      video.srcObject = null
      resetDetector()
    }
  }, [stream])

  // ---- main loop: detect + draw overlay --------------------------------
  useEffect(() => {
    let raf = 0
    let lastDetect = 0
    let frameCount = 0
    let lastFpsSample = performance.now()
    let fps = 0
    let detectHz = 0
    let detectSamples = 0
    let lastHzSample = performance.now()

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

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      frameCount++
      if (now - lastFpsSample >= 1000) {
        fps = Math.round((frameCount * 1000) / (now - lastFpsSample))
        frameCount = 0
        lastFpsSample = now
        statsRef.current.fps = fps
      }
      if (now - lastHzSample >= 2000) {
        detectHz = Math.round((detectSamples * 2000) / (now - lastHzSample))
        detectSamples = 0
        lastHzSample = now
        statsRef.current.detectHz = detectHz
      }

      // run detection on a cadence, not every frame
      if (now - lastDetect >= DETECT_INTERVAL_MS) {
        lastDetect = now
        detectSamples++
        resultRef.current = detectWindow(video)
        // surface state to React only when phase/confidence move meaningfully
        setResult((prev) => {
          const next = resultRef.current
          if (
            next.phase !== prev.phase ||
            Math.abs(next.confidence - prev.confidence) > 0.03 ||
            next.lowLight !== prev.lowLight
          ) {
            return next
          }
          return prev
        })
      }

      drawOverlay(ctx, overlay, video, resultRef.current)
    }

    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  const handleExit = useCallback(() => {
    stream.getTracks().forEach((t) => t.stop())
    onExit()
  }, [stream, onExit])

  const phase = result.phase

  return (
    <div ref={wrapRef} className="relative h-svh w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* status pill */}
      {!result.lowLight && (
        <div
          className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold tracking-wide backdrop-blur"
          style={{
            color: PHASE_COLOR[phase],
            backgroundColor: 'rgba(0,0,0,0.5)',
            boxShadow: `0 0 18px ${PHASE_COLOR[phase]}66`,
          }}
        >
          {PHASE_LABEL[phase]}
        </div>
      )}
      {result.lowLight && (
        <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-xs font-semibold tracking-wide text-amber-300 backdrop-blur">
          Low light — move to a brighter spot
        </div>
      )}

      {/* exit */}
      <button
        onClick={handleExit}
        aria-label="Exit camera"
        className="absolute right-4 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur active:scale-95"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* debug HUD (measurement aid — remove before release) */}
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-black/50 px-3 py-2 font-mono text-[10px] leading-relaxed text-emerald-300/80 backdrop-blur">
        <div>fps {statsRef.current.fps} · detect {statsRef.current.detectHz}Hz</div>
        <div>conf {(result.confidence * 100).toFixed(0)} · {phase}</div>
        {result.quad && (
          <div>
            tl({(result.quad.tl.x * 100).toFixed(0)},{(result.quad.tl.y * 100).toFixed(0)})
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// overlay rendering
// ---------------------------------------------------------------------------

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  result: DetectionResult,
) {
  const { width: cw, height: ch } = canvas
  ctx.clearRect(0, 0, cw, ch)

  const show = result.phase === 'good' || (result.phase === 'weak' && !!result.quad)
  if (!show || !result.quad || video.videoWidth === 0) return

  // map normalized video coords -> display coords accounting for object-cover crop
  const vw = video.videoWidth
  const vh = video.videoHeight
  const scale = Math.max(cw / vw, ch / vh)
  const dw = vw * scale
  const dh = vh * scale
  const ox = (cw - dw) / 2
  const oy = (ch - dh) / 2

  const map = (nx: number, ny: number) => ({
    x: ox + nx * dw,
    y: oy + ny * dh,
  })

  const tl = map(result.quad.tl.x, result.quad.tl.y)
  const tr = map(result.quad.tr.x, result.quad.tr.y)
  const br = map(result.quad.br.x, result.quad.br.y)
  const bl = map(result.quad.bl.x, result.quad.bl.y)

  const color = PHASE_COLOR[result.phase]

  // glowing stroke
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = 18
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(tl.x, tl.y)
  ctx.lineTo(tr.x, tr.y)
  ctx.lineTo(br.x, br.y)
  ctx.lineTo(bl.x, bl.y)
  ctx.closePath()
  ctx.stroke()
  ctx.restore()

  // corner markers
  ctx.fillStyle = color
  for (const p of [tl, tr, br, bl]) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
    ctx.fill()
  }
}
