import type { Point, Quad } from '../detection/types.ts'

export type { Point, Quad } from '../detection/types.ts'

/**
 * Stage 1A geometry core.
 *
 * All corners are stored in VIDEO-NORMALIZED coordinates (0..1) so the
 * geometry layer never depends on screen resolution. Mapping helpers convert
 * between on-screen pointer positions and video-normalized space, accounting
 * for the object-cover crop of the <video> element.
 */

export interface VideoMapping {
  /** object-cover scale and offset of the video inside its container. */
  scale: number
  offsetX: number
  offsetY: number
  /** intrinsic video dimensions. */
  vw: number
  vh: number
}

/**
 * Compute the object-cover mapping so that a normalized video coord maps to a
 * container pixel. Mirrors CSS `object-cover` exactly.
 */
export function coverMapping(cw: number, ch: number, vw: number, vh: number): VideoMapping {
  const scale = Math.max(cw / vw, ch / vh)
  const dw = vw * scale
  const dh = vh * scale
  return { scale, offsetX: (cw - dw) / 2, offsetY: (ch - dh) / 2, vw, vh }
}

/** Container pixel -> normalized video coord (0..1). Returns null if outside visible video. */
export function displayToVideo(
  px: number,
  py: number,
  cw: number,
  ch: number,
  vw: number,
  vh: number,
): Point | null {
  const m = coverMapping(cw, ch, vw, vh)
  const dw = vw * m.scale
  const dh = vh * m.scale
  const x = (px - m.offsetX) / dw
  const y = (py - m.offsetY) / dh
  if (x < 0 || x > 1 || y < 0 || y > 1) return null
  return { x, y }
}

/** Normalized video coord -> container pixel. */
export function videoToDisplay(p: Point, cw: number, ch: number, vw: number, vh: number): Point {
  const m = coverMapping(cw, ch, vw, vh)
  return {
    x: m.offsetX + p.x * vw * m.scale,
    y: m.offsetY + p.y * vh * m.scale,
  }
}

/** Build a Quad from 4 points in P1(P2?)-order. Order in is [p1,p2,p3,p4]. */
export function pointsToQuad(corners: Point[]): Quad | null {
  if (corners.length !== 4) return null
  const [p1, p2, p3, p4] = corners
  return { tl: p1, tr: p2, br: p3, bl: p4 }
}

/** Cheap sanity check: reject degenerate/quads that collapse to a point/line. */
export function isValidQuad(quad: Quad): boolean {
  const { tl, tr, br, bl } = quad
  const w1 = Math.abs(tr.x - tl.x)
  const w2 = Math.abs(br.x - bl.x)
  const h1 = Math.abs(bl.y - tl.y)
  const h2 = Math.abs(br.y - tr.y)
  const minW = Math.max(w1, w2)
  const minH = Math.max(h1, h2)
  return minW > 0.05 && minH > 0.05
}
