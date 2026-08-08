import { useEffect, useRef, useState } from 'react'
import { requestCamera, type CameraStatus } from './modules/camera/camera.ts'
import CameraView from './components/CameraView.tsx'

export default function App() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [message, setMessage] = useState<string>('')
  const [hint, setHint] = useState<string>('')
  const startedRef = useRef(false)

  useEffect(() => {
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [stream])

  async function handleStart() {
    if (startedRef.current) return
    startedRef.current = true
    setStatus('requesting')
    setMessage('Starting camera…')
    const { result, stream: nextStream } = await requestCamera()
    setStatus(result.status)
    setMessage(result.message)
    setHint(result.hint ?? '')
    setStream(nextStream)
  }

  function handleExit() {
    setStream(null)
    setStatus('idle')
    setMessage('')
    setHint('')
    startedRef.current = false
  }

  if (stream) {
    return <CameraView stream={stream} onExit={handleExit} />
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-neutral-950 px-6 text-white">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
          AR Curtain Try-On
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Place your curtain</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Tap the four corners of your window in order — top-left, top-right, bottom-right,
          bottom-left — and confirm.
        </p>
      </div>

      <button
        onClick={handleStart}
        disabled={status === 'requesting'}
        className="w-full max-w-xs rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-neutral-950 transition active:scale-[0.98] disabled:opacity-50"
      >
        {status === 'requesting' ? 'Starting…' : 'Start Placement'}
      </button>

      {message && <p className="max-w-xs text-center text-sm text-neutral-300">{message}</p>}
      {hint && <p className="max-w-xs text-center text-xs text-neutral-500">{hint}</p>}

      <p className="text-[11px] leading-relaxed text-neutral-600">
        Stage 1A · Manual four-corner window placement · On-device, no uploads
      </p>
    </main>
  )
}
