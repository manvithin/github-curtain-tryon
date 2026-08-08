import { createGeometricDetector } from './geometryDetector.ts'
import type { DetectorFactory, DetectorFrame, DetectionResult } from './types.ts'

export type { DetectionResult } from './types.ts'
export type { Quad, Point } from './types.ts'

/**
 * Public window-detection seam (D9). Consumers depend ONLY on this module.
 *
 * To swap the algorithm later (e.g. an ML model), pass a different factory:
 *
 *   const detector = createDetector(createSomeMlDetector, { workWidth: 96 })
 *
 * No camera frames ever leave the device.
 */

export interface DetectorOptions {
  /** Working resolution width. Lower = faster, less accurate. */
  workWidth?: number
}

const DEFAULT_WORK_WIDTH = 128

let instance: ReturnType<DetectorFactory> | null = null
let workCanvas: HTMLCanvasElement | null = null
let workCtx: CanvasRenderingContext2D | null = null
let workWidth = DEFAULT_WORK_WIDTH

/**
 * Get a lazily-created, shared detector instance.
 */
export function getDetector(options: DetectorOptions = {}): ReturnType<DetectorFactory> {
  if (!instance) {
    workWidth = options.workWidth ?? DEFAULT_WORK_WIDTH
    instance = createGeometricDetector()
  }
  return instance
}

export function resetDetector(): void {
  instance?.reset()
}

/**
 * Detect a window in a live <video> frame.
 * Downscales the frame to working resolution, then runs the detector.
 * Cheap enough to call every frame; callers may throttle.
 */
export function detectWindow(video: HTMLVideoElement, options: DetectorOptions = {}): DetectionResult {
  const detector = getDetector(options)

  if (!workCanvas) {
    workCanvas = document.createElement('canvas')
    workCtx = workCanvas.getContext('2d', { willReadFrequently: true })
  }
  if (!workCtx || video.videoWidth === 0) {
    return { phase: 'none', confidence: 0, quad: null, lowLight: false }
  }

  const vw = video.videoWidth
  const vh = video.videoHeight
  const scale = workWidth / vw
  const wh = Math.max(1, Math.round(vh * scale))
  workCanvas.width = workWidth
  workCanvas.height = wh

  workCtx.drawImage(video, 0, 0, workWidth, wh)
  const pixels = workCtx.getImageData(0, 0, workWidth, wh).data

  const frame: DetectorFrame = { data: pixels, width: workWidth, height: wh }
  return detector.detect(frame)
}
