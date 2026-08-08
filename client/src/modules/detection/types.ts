/**
 * Detection domain types.
 *
 * Coordinates for `Quad` are in NORMALIZED space (0..1) relative to the
 * source frame. Consumers scale them to their own render surface.
 */
export interface Point {
  x: number
  y: number
}

export interface Quad {
  tl: Point
  tr: Point
  br: Point
  bl: Point
}

export type DetectionPhase = 'none' | 'weak' | 'good'

export interface DetectionResult {
  /** State machine phase used for UI messaging. */
  phase: DetectionPhase
  /** 0..1 confidence of the current quad estimate. */
  confidence: number
  /** Normalized corner coordinates, or null when nothing is tracked. */
  quad: Quad | null
  /** Frame too dark to detect reliably. */
  lowLight: boolean
}

/** Input a detector consumes. A raw RGBA frame in working resolution. */
export interface DetectorFrame {
  data: Uint8ClampedArray
  width: number
  height: number
}

/**
 * Replaceable detection interface (D9).
 *
 * The pipeline is: image -> geometry -> candidate quadrilateral ->
 * confidence -> temporal tracking. Swapping in an ML-based detector later
 * must not touch consumers; only implement this interface.
 */
export interface WindowDetector {
  /** Process one frame. Callers should drop frames to keep a target Hz. */
  detect(frame: DetectorFrame): DetectionResult
  /** Clear internal tracking state (e.g. when camera restarts). */
  reset(): void
}

export type DetectorFactory = () => WindowDetector
