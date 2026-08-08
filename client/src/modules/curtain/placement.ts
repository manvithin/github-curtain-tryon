import type { Quad } from '../detection/types.ts'
import type { Point } from '../detection/types.ts'

/**
 * Placement core after the 1B audit fix.
 *
 * The user selects four points in VIDEO-normalized coordinates (0..1). These are
 * the single source of truth. We convert them to CONTAINER/canvas pixels
 * (object-cover aware) and emit:
 *
 *  - screenCorners: the four corners the curtain must occupy, in canvas px.
 *  - bilinear(u,v): maps curtain-local (u,v) in [0,1]^2 onto that quad using the
 *    exact bilinear formula requested:
 *      P(u,v) = (1-u)(1-v)·P1 + u(1-v)·P2 + u·v·P3 + (u-v)·P4
 *    so the curtain's top edge maps to P1->P2 and bottom to P4->P3 under any
 *    perspective skew.
 *
 * Rendering happens in canvas-pixel space (orthographic), so screen-space
 * alignment is the source of truth and there is no AABB/perspective drift.
 */
export interface ScreenQuad {
  /** Canvas-pixel corners (source of truth = the user's selection). */
  p1: Point // top-left   (canvas px)
  p2: Point // top-right
  p3: Point // bottom-right
  p4: Point // bottom-left
  /** Viewbox of the curtain canvas. */
  canvasW: number
  canvasH: number
  /** Camera FOV kept for compatibility; not used in the ortho path. */
  cameraFov: number
}

export interface PlanePlacement {
  quad: ScreenQuad
  /** Convenience: the same four points as an ordered array [P1,P2,P3,P4]. */
  corners: [Point, Point, Point, Point]
  width: number
  height: number
  cameraFov: number
}

export function computePlacement(
  quad: Quad,
  cw: number,
  ch: number,
  vw: number,
  vh: number,
): PlanePlacement {
  // video-norm -> container-px, mirroring CSS `object-cover` exactly.
  const scale = Math.max(cw / vw, ch / vh)
  const dw = vw * scale
  const dh = vh * scale
  const ox = (cw - dw) / 2
  const oy = (ch - dh) / 2
  const toDisp = (p: Point): Point => ({
    x: ox + p.x * dw,
    y: oy + p.y * dh,
  })

  const p1 = toDisp(quad.tl)
  const p2 = toDisp(quad.tr)
  const p3 = toDisp(quad.br)
  const p4 = toDisp(quad.bl)

  // screen-space width/height of the curtain's bounding box (for culling/sizing)
  const minX = Math.min(p1.x, p2.x, p3.x, p4.x)
  const maxX = Math.max(p1.x, p2.x, p3.x, p4.x)
  const minY = Math.min(p1.y, p2.y, p3.y, p4.y)
  const maxY = Math.max(p1.y, p2.y, p3.y, p4.y)

  return {
    corners: [p1, p2, p3, p4],
    quad: { p1, p2, p3, p4, canvasW: cw, canvasH: ch, cameraFov: 72 },
    width: maxX - minX,
    height: maxY - minY,
    cameraFov: 72,
  }
}

/**
 * Bilinear interpolation of a curtain-local (u,v) in [0,1]^2 onto the selected
 * screen quadrilateral P1(top-L)->P2(top-R)->P3(bot-R)->P4(bot-L):
 *   P(u,v) = (1-u)(1-v)·P1 + u(1-v)·P2 + u*v·P3 + (1-u)*v·P4
 *
 * This is the exact mapping requested. The rod's left/right endpoints
 * (curtain u=0 and u=1 at v=0) land precisely on P1 and P2; the bottom edge
 * (v=1) lands on P4..P3.
 */
export function bilinearPoint(
  u: number,
  v: number,
  s: ScreenQuad,
): { x: number; y: number } {
  const w00 = (1 - u) * (1 - v)
  const w10 = u * (1 - v)
  const w11 = u * v
  const w01 = (1 - u) * v
  return {
    x: w00 * s.p1.x + w10 * s.p2.x + w11 * s.p3.x + w01 * s.p4.x,
    y: w00 * s.p1.y + w10 * s.p2.y + w11 * s.p3.y + w01 * s.p4.y,
  }
}
