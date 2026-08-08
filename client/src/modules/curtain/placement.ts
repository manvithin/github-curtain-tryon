import type { Quad } from '../detection/types.ts'

/**
 * 1B/1C placement: converts the user's video-normalized window quad into a
 * "place the curtain" target for the Three.js camera.
 *
 * MVP approximation (Checkpoint 2A): the curtain is rendered FRONT-PARALLEL
 * to the camera at a fixed depth. The anchor is the TOP-CENTER of the window
 * quad so the rod spans P1..P2 and the fabric drops toward P4..P3.
 */
export interface PlanePlacement {
  /** World-space anchor (top-center of the window) on the camera-facing plane. */
  x: number
  y: number
  z: number
  /** Exactly the quad's width/height in world units (no fixed model size). */
  width: number
  height: number
  /** Camera FOV used when rendering (degrees, vertical). */
  cameraFov: number
}

const DEPTH_Z = 2.9 // fixed distance curtain sits from camera

export function computePlacement(quad: Quad, cw: number, ch: number, vw: number, vh: number): PlanePlacement {
  const aspect = cw / ch
  const cameraFov = 72

  const toDisp = (nx: number, ny: number) => {
    const scale = Math.max(cw / vw, ch / vh)
    const dw = vw * scale
    const dh = vh * scale
    const ox = (cw - dw) / 2
    const oy = (ch - dh) / 2
    return { x: (ox + nx * dw) / cw, y: (oy + ny * dh) / ch }
  }

  const tl = toDisp(quad.tl.x, quad.tl.y)
  const tr = toDisp(quad.tr.x, quad.tr.y)
  const br = toDisp(quad.br.x, quad.br.y)
  const bl = toDisp(quad.bl.x, quad.bl.y)

  // top-center anchor on the display-quad
  const topMidX = (tl.x + tr.x) / 2
  const topMidY = (tl.y + tr.y) / 2
  const bottomMidX = (bl.x + br.x) / 2
  const bottomMidY = (bl.y + br.y) / 2

  const wNorm = Math.hypot(tr.x - tl.x, tr.y - tl.y) || (br.x - bl.x)
  const hNorm = Math.hypot(bottomMidX - topMidX, bottomMidY - topMidY)

  const halfH = DEPTH_Z * Math.tan((cameraFov / 2) * (Math.PI / 180))
  const worldH = halfH * 2
  const worldW = worldH * aspect

  return {
    x: (topMidX - 0.5) * worldW,
    y: -(topMidY - 0.5) * worldH,
    z: -DEPTH_Z,
    width: wNorm * worldW,
    height: hNorm * worldH,
    cameraFov,
  }
}