import type { Quad } from '../detection/types.ts'

/**
 * 1B/1C placement: converts the user's video-normalized window quad into a
 * "place the curtain" target that the Three.js camera can render in front of
 * the live video.
 *
 * MVP approximation (Checkpoint 2A): the curtain is rendered FRONT-PARALLEL
 * to the camera at a fixed depth, centered/sized from the window corners.
 * True projective tilt requires real depth — deferred per architecture.
 */
export interface PlanePlacement {
  /** World-space center on the camera-facing plane. */
  x: number
  y: number
  z: number
  /** Curtain size in world units. */
  width: number
  height: number
  /** Camera FOV used when rendering (degrees, vertical). */
  cameraFov: number
}

const DEPTH_Z = 2.9 // fixed distance curtain sits from camera

export function computePlacement(quad: Quad, cw: number, ch: number, vw: number, vh: number): PlanePlacement {
  const aspect = cw / ch
  const cameraFov = 72 // vertical FOV (degrees) — typical phone rear cam

  // map video-normalized corners -> display-normalized (0..1), object-cover aware
  const toDisp = (nx: number, ny: number) => {
    let scale = Math.max(cw / vw, ch / vh)
    let dw = vw * scale
    let dh = vh * scale
    const ox = (cw - dw) / 2
    const oy = (ch - dh) / 2
    return { x: (ox + nx * dw) / cw, y: (oy + ny * dh) / ch }
  }

  const tl = toDisp(quad.tl.x, quad.tl.y)
  const tr = toDisp(quad.tr.x, quad.tr.y)
  const br = toDisp(quad.br.x, quad.br.y)
  const bl = toDisp(quad.bl.x, quad.bl.y)

  const cx = (tl.x + tr.x + br.x + bl.x) / 4
  const cy = (tl.y + tr.y + br.y + bl.y) / 4

  // width/height in display-normalized units
  const wNorm = Math.hypot(tr.x - tl.x, tr.y - tl.y)
  const hNorm = Math.hypot(bl.y - tl.y, bl.x - tl.x)

  // world size at the fixed depth
  const halfH = DEPTH_Z * Math.tan((cameraFov / 2) * (Math.PI / 180))
  const worldH = halfH * 2
  const worldW = worldH * aspect

  return {
    x: (cx - 0.5) * worldW,
    y: -(cy - 0.5) * worldH,
    z: -DEPTH_Z,
    width: wNorm * worldW * 1.06, // slight overhang
    height: hNorm * worldH * 1.06,
    cameraFov,
  }
}