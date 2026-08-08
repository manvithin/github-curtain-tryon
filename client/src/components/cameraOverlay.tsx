import type { Point, Quad } from '../modules/window/windowPlane.ts'
import { videoToDisplay } from '../modules/window/windowPlane.ts'

interface WindowStage {
  corners: Point[]
  quad: Quad | null
}

/** Whether the placement is finished (green debug overlay should be hidden). */
export type PlaceState = 'placing' | 'placed'

const ANCHOR_COLOR = '#22d3ee'
const LOCK_COLOR = '#34d399'

/**
 * Draw the Stage-1A overlay onto the (DPR-scaled) canvas.
 *  - placing: numbered corner anchors + dashed preview; once 4 corners are set,
 *    a glowing green outline confirms the detected window.
 *  - placed:  nothing is drawn; the live curtain takes over.
 * Input corners/quad are video-normalized; we map to container px.
 */
export function draw(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  stage: WindowStage,
  placeState: PlaceState,
): void {
  const cw = canvas.width
  const ch = canvas.height
  ctx.clearRect(0, 0, cw, ch)
  if (video.videoWidth === 0) return
  // once the curtain is placed, do not draw any debug green over it.
  if (placeState === 'placed') return

  const map = (p: Point): Point => {
    const pt = videoToDisplay(p, cw, ch, video.videoWidth, video.videoHeight)
    return pt
  }

  // ---------- dragging / preview ----------
  if (stage.quad == null && stage.corners.length > 0) {
    const pts = stage.corners.map(map)
    drawPreview(ctx, pts)

    for (let i = 0; i < pts.length; i++) {
      drawCornerMarker(ctx, pts[i], CORNER_LABELS[i])
    }
  }

  // ---------- locked window (before Confirm finishes) ----------
  if (stage.quad) {
    drawLockedQuad(ctx, stage.quad, map)
  }
}

const CORNER_LABELS = ['1', '2', '3', '4']

function drawCornerMarker(ctx: CanvasRenderingContext2D, p: Point, label: string): void {
  ctx.save()
  ctx.strokeStyle = ANCHOR_COLOR
  ctx.fillStyle = ANCHOR_COLOR
  ctx.lineWidth = 3
  // inner crosshair
  ctx.beginPath()
  ctx.moveTo(p.x - 14, p.y)
  ctx.lineTo(p.x + 14, p.y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(p.x, p.y - 14)
  ctx.lineTo(p.x, p.y + 14)
  ctx.stroke()
  // circle
  ctx.beginPath()
  ctx.arc(p.x, p.y, 9, 0, Math.PI * 2)
  ctx.stroke()
  // label
  ctx.font = 'bold 12px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, p.x, p.y)
  ctx.restore()
}

function drawPreview(ctx: CanvasRenderingContext2D, pts: Point[]): void {
  if (pts.length < 2) return
  ctx.save()
  ctx.strokeStyle = 'rgba(34,211,238,0.6)'
  ctx.lineWidth = 2.5
  ctx.setLineDash([8, 6])
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  if (pts.length === 4) ctx.closePath()
  ctx.stroke()
  ctx.restore()
}

function drawLockedQuad(ctx: CanvasRenderingContext2D, quad: Quad, map: (p: Point) => Point): void {
  const tl = map(quad.tl)
  const tr = map(quad.tr)
  const br = map(quad.br)
  const bl = map(quad.bl)

  ctx.save()
  // glow pass
  ctx.shadowColor = LOCK_COLOR
  ctx.shadowBlur = 22
  ctx.strokeStyle = LOCK_COLOR
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(tl.x, tl.y)
  ctx.lineTo(tr.x, tr.y)
  ctx.lineTo(br.x, br.y)
  ctx.lineTo(bl.x, bl.y)
  ctx.closePath()
  ctx.stroke()
  ctx.shadowBlur = 0

  // translucent fill
  ctx.fillStyle = 'rgba(52,211,153,0.12)'
  ctx.beginPath()
  ctx.moveTo(tl.x, tl.y)
  ctx.lineTo(tr.x, tr.y)
  ctx.lineTo(br.x, br.y)
  ctx.lineTo(bl.x, bl.y)
  ctx.closePath()
  ctx.fill()

  // corner dots
  ctx.fillStyle = LOCK_COLOR
  for (const p of [tl, tr, br, bl]) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}