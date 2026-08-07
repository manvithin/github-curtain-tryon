import { useEffect, useRef, useState } from 'react'
import { requestCamera, type CameraStatus } from './modules/camera/camera.ts'

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [message, setMessage] = useState<string>('')
  const [hint, setHint] = useState<string>('')

  // Attach the stream once the <video> element is in the DOM (after 'granted' renders).
  useEffect(() => {
    if (!stream || !videoRef.current) return
    const video = videoRef.current
    video.srcObject = stream
    void video.play().catch(() => undefined)
    // The Play promise rejection (Autoplay) is benign because stream is muted.
  }, [stream])

  // Clean up the stream when the component unmounts.
  useEffect(() => {
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [stream])

  async function handleStart() {
    setStatus('requesting')
    setMessage('Requesting camera…')
    const { result, stream: nextStream } = await requestCamera()
    setStatus(result.status)
    setMessage(result.message)
    setHint(result.hint ?? '')
    setStream(nextStream)
  }

  function handleStop() {
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
    setStatus('idle')
    setMessage('')
    setHint('')
  }

  const isLive = status === 'granted'

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-neutral-950 px-6 text-white">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
          AR Curtain Try-On
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {isLive ? 'Camera is live' : 'Point at a window'}
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          {isLive
            ? 'Window detection is the next milestone.'
            : 'Allow camera access to preview curtains in real space.'}
        </p>
      </div>

      <div className="relative aspect-[3/4] w-full max-w-xs overflow-hidden rounded-2xl bg-neutral-900 ring-1 ring-white/10">
        {isLive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-neutral-500">
            <svg
              className="h-10 w-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
            <span className="text-xs">Camera preview</span>
          </div>
        )}
      </div>

      {message && (
        <p className="max-w-xs text-center text-sm text-neutral-300">{message}</p>
      )}
      {hint && (
        <p className="max-w-xs text-center text-xs text-neutral-500">{hint}</p>
      )}

      {!isLive ? (
        <button
          onClick={handleStart}
          disabled={status === 'requesting'}
          className="w-full max-w-xs rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-neutral-950 transition active:scale-[0.98] disabled:opacity-50"
        >
          {status === 'requesting' ? 'Starting…' : 'Start Camera'}
        </button>
      ) : (
        <button
          onClick={handleStop}
          className="w-full max-w-xs rounded-full bg-neutral-800 px-6 py-3.5 text-sm font-semibold text-white transition active:scale-[0.98]"
        >
          Stop Camera
        </button>
      )}

      <p className="text-[11px] leading-relaxed text-neutral-600">
        Phase 1 · HTTPS shell · Camera permission gate
      </p>
    </main>
  )
}