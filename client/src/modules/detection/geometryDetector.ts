import type { DetectorFactory, DetectionResult, Point, Quad } from './types.ts'

/**
 * Browser-native geometric window detector (no OpenCV, no ML models).
 *
 * Pipeline: luma -> box blur -> Sobel -> edge projection profiles ->
 * candidate rectangle -> confidence scoring -> corner refinement.
 *
 * This is the LIGHTEST viable implementation. If it underperforms in real
 * rooms, swap the factory (D9) rather than patching OpenCV in here.
 */

export const createGeometricDetector: DetectorFactory = () => {
  let prevQuad: Quad | null = null
  let emaConfidence = 0
  let lostFrames = 0
  let phase: DetectionResult['phase'] = 'none'

  const HOLD_FRAMES = 4 // frames to keep a quad while the frame flickers
  const EMA = 0.45 // temporal smoothing factor on corners

  return {
    reset() {
      prevQuad = null
      emaConfidence = 0
      lostFrames = 0
      phase = 'none'
    },

    detect(frame) {
      const { data, width: w, height: h } = frame
      const lowLight = frameIsDark(data)
      const raw = lowLight ? null : analyzeFrame(data, w, h)

      // ---- temporal tracking with hysteresis ---------------------------
      if (!raw) {
        lostFrames++
        if (lostFrames > HOLD_FRAMES) {
          prevQuad = null
          emaConfidence = 0
          phase = 'none'
        } else if (phase === 'good') {
          phase = 'weak' // briefly holding a stale quad
        }
        return { phase, confidence: emaConfidence, quad: prevQuad, lowLight }
      }

      lostFrames = 0
      const { quad, confidence } = raw

      // smooth corners toward the new estimate
      const smooth: Quad = prevQuad
        ? {
            tl: lerp(prevQuad.tl, quad.tl, EMA),
            tr: lerp(prevQuad.tr, quad.tr, EMA),
            br: lerp(prevQuad.br, quad.br, EMA),
            bl: lerp(prevQuad.bl, quad.bl, EMA),
          }
        : quad
      prevQuad = smooth

      emaConfidence = emaConfidence === 0 ? confidence : emaConfidence * 0.5 + confidence * 0.5

      // hysteresis: don't drop state on the first weak frame
      if (phase === 'good') {
        phase = emaConfidence >= 0.45 ? 'good' : 'weak'
      } else if (phase === 'weak') {
        phase = emaConfidence >= 0.55 ? 'good' : emaConfidence >= 0.35 ? 'weak' : 'none'
      } else {
        phase = emaConfidence >= 0.55 ? 'good' : emaConfidence >= 0.4 ? 'weak' : 'none'
      }

      return { phase, confidence: emaConfidence, quad: smooth, lowLight }
    },
  }
}

// ---------------------------------------------------------------------------
// internals
// ---------------------------------------------------------------------------

function frameIsDark(data: Uint8ClampedArray): boolean {
  let sum = 0
  const n = Math.floor(data.length / 4)
  for (let i = 0; i < data.length; i += 40) sum += data[i]
  return sum / Math.max(1, n / 10) < 28 // mean luma below ~28/255
}

function analyzeFrame(data: Uint8ClampedArray, w: number, h: number): { quad: Quad; confidence: number } | null {
  const luma = toLuma(data)
  blur(luma, w, h)
  const { mag, horiz, vert } = sobel(luma, w, h)

  const thresh = edgeThreshold(mag)

  // projection profiles of strong, orientation-classified edges
  const rowH = new Float32Array(h) // horizontal-edge energy per row (frame top/bottom)
  const colV = new Float32Array(w) // vertical-edge energy per column (frame left/right)

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      if (mag[i] < thresh) continue
      if (vert[i]) colV[x] += mag[i]
      if (horiz[i]) rowH[y] += mag[i]
    }
  }

  smoothProfile(rowH)
  smoothProfile(colV)

  const top = pickPeaks(rowH, h * 0.1)
  const cols = pickPeaks(colV, w * 0.1)
  if (top.length < 2 || cols.length < 2) return null

  let best: { quad: Quad; score: number } | null = null
  const minH = Math.max(3, h * 0.1)
  const minW = Math.max(3, w * 0.08)

  for (let a = 0; a < top.length; a++) {
    for (let b = a + 1; b < top.length; b++) {
      const t = Math.min(top[a].i, top[b].i)
      const bt = Math.max(top[a].i, top[b].i)
      if (bt - t < minH) continue
      for (let c = 0; c < cols.length; c++) {
        for (let d = c + 1; d < cols.length; d++) {
          const l = Math.min(cols[c].i, cols[d].i)
          const r = Math.max(cols[c].i, cols[d].i)
          if (r - l < minW) continue
          const quad: Quad = {
            tl: { x: l, y: t },
            tr: { x: r, y: t },
            br: { x: r, y: bt },
            bl: { x: l, y: bt },
          }
          const score = scoreQuad(mag, luma, w, h, quad)
          if (!best || score > best.score) best = { quad, score }
        }
      }
    }
  }

  if (!best || best.score < 0.3) return null

  const refined = refineCorners(mag, horiz, vert, w, h, best.quad)
  return { quad: normalizeQuad(refined, w, h), confidence: best.score }
}

// -- helpers ----------------------------------------------------------------

function toLuma(data: Uint8ClampedArray): Float32Array {
  const out = new Float32Array(data.length / 4)
  for (let i = 0, o = 0; i < data.length; i += 4, o++) {
    out[o] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
  }
  return out
}

function blur(src: Float32Array, w: number, h: number): void {
  const tmp = new Float32Array(src.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      tmp[i] =
        (src[clamp(x - 1, 0, w - 1) + y * w] +
          src[clamp(x + 1, 0, w - 1) + y * w] +
          src[i]) /
        3
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      src[i] =
        (tmp[clamp(y - 1, 0, h - 1) * w + x] +
          tmp[clamp(y + 1, 0, h - 1) * w + x] +
          tmp[i]) /
        3
    }
  }
}

function sobel(luma: Float32Array, w: number, h: number): { mag: Float32Array; horiz: Uint8Array; vert: Uint8Array } {
  const mag = new Float32Array(luma.length)
  const horiz = new Uint8Array(luma.length)
  const vert = new Uint8Array(luma.length)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const a = luma[(y - 1) * w + (x - 1)]
      const b = luma[(y - 1) * w + x]
      const c = luma[(y - 1) * w + (x + 1)]
      const d = luma[y * w + (x - 1)]
      const f = luma[y * w + (x + 1)]
      const g = luma[(y + 1) * w + (x - 1)]
      const hh = luma[(y + 1) * w + x]
      const ii = luma[(y + 1) * w + (x + 1)]

      const gx = -a + c - 2 * d + 2 * f - g + ii
      const gy = -a - 2 * b - c + g + 2 * hh + ii
      const m = Math.abs(gx) + Math.abs(gy)
      mag[i] = m
      if (Math.abs(gy) > Math.abs(gx)) horiz[i] = 1
      else if (Math.abs(gx) > Math.abs(gy)) vert[i] = 1
    }
  }
  return { mag, horiz, vert }
}

function edgeThreshold(mag: Float32Array): number {
  let sum = 0
  let sq = 0
  let n = 0
  for (let i = 0; i < mag.length; i += 3) {
    sum += mag[i]
    sq += mag[i] * mag[i]
    n++
  }
  const mean = sum / n
  const std = Math.sqrt(sq / n - mean * mean)
  return Math.max(24, mean + std * 0.9)
}

function smoothProfile(p: Float32Array): void {
  const copy = Float32Array.from(p)
  for (let i = 0; i < p.length; i++) {
    const a = copy[clamp(i - 2, 0, p.length - 1)]
    const b = copy[clamp(i - 1, 0, p.length - 1)]
    const c = copy[i]
    const d = copy[clamp(i + 1, 0, p.length - 1)]
    const e = copy[clamp(i + 2, 0, p.length - 1)]
    p[i] = (a + b + c + d + e) / 5
  }
}

interface Peak {
  i: number
  v: number
}

function pickPeaks(profile: Float32Array, minSpan: number): Peak[] {
  let mean = 0
  for (let i = 0; i < profile.length; i++) mean += profile[i]
  mean /= profile.length
  const thr = Math.max(mean * 1.6, mean + 4)

  const peaks: Peak[] = []
  for (let i = 1; i < profile.length - 1; i++) {
    if (profile[i] > thr && profile[i] >= profile[i - 1] && profile[i] >= profile[i + 1]) {
      peaks.push({ i, v: profile[i] })
    }
  }
  peaks.sort((a, b) => b.v - a.v)
  // keep peaks that are far apart so we don't pick two sides of one edge
  const picked: Peak[] = []
  for (const p of peaks) {
    if (picked.every((q) => Math.abs(q.i - p.i) >= minSpan)) picked.push(p)
    if (picked.length >= 6) break
  }
  return picked
}

function scoreQuad(
  mag: Float32Array,
  luma: Float32Array,
  w: number,
  h: number,
  quad: Quad,
): number {
  const { tl, tr, bl } = quad
  const left = Math.max(0, Math.min(w - 1, Math.round(tl.x)))
  const right = Math.max(0, Math.min(w - 1, Math.round(tr.x)))
  const topY = Math.max(0, Math.min(h - 1, Math.round(tl.y)))
  const botY = Math.max(0, Math.min(h - 1, Math.round(bl.y)))

  // 1) boundary edge coverage: fraction of each side that sits on a strong edge
  const wdt = Math.max(1, right - left)
  const hgt = Math.max(1, botY - topY)
  let topEdge = 0
  for (let x = left; x <= right; x++) if (mag[topY * w + x] > 0) topEdge++
  let botEdge = 0
  for (let x = left; x <= right; x++) if (mag[botY * w + x] > 0) botEdge++
  let leEdge = 0
  for (let y = topY; y <= botY; y++) if (mag[y * w + left] > 0) leEdge++
  let reEdge = 0
  for (let y = topY; y <= botY; y++) if (mag[y * w + right] > 0) reEdge++

  const boundary =
    (topEdge / wdt + botEdge / wdt + leEdge / hgt + reEdge / hgt) / 4

  // 2) brightness contrast between interior and a ring just outside
  let inSum = 0
  let inN = 0
  for (let y = topY + 2; y < botY - 2; y++) {
    for (let x = left + 2; x < right - 2; x++) {
      inSum += luma[y * w + x]
      inN++
    }
  }
  let outSum = 0
  let outN = 0
  const ring = 3
  for (let y = topY - ring; y <= botY + ring; y++) {
    for (let x = left - ring; x <= right + ring; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue
      if (x >= left - 2 && x <= right + 2 && y >= topY - 2 && y <= botY + 2) continue
      outSum += luma[y * w + x]
      outN++
    }
  }
  const inMean = inN ? inSum / inN : 0
  const outMean = outN ? outSum / outN : 0
  const contrast = Math.min(1, Math.abs(inMean - outMean) / 70)

  // 3) aspect ratio fitness (windows are usually wider than tall, allow tall)
  const aspect = wdt / hgt
  const aspectFit = aspect >= 0.4 && aspect <= 3.5 ? 1 : 0.5

  // 4) size fitness (window should dominate a meaningful area)
  const area = wdt * hgt
  const sizeFit = Math.min(1, area / (0.3 * w * h))

  const score = boundary * 0.5 + contrast * 0.2 + aspectFit * 0.15 + sizeFit * 0.15
  return Math.min(1, score)
}

/**
 * Perspective-aware corner refinement: within a small window around each
 * axis-aligned corner, snap to the point of maximum local edge energy.
 */
function refineCorners(
  mag: Float32Array,
  horiz: Uint8Array,
  vert: Uint8Array,
  w: number,
  h: number,
  quad: Quad,
): Quad {
  const radius = 4
  const snap = (cx: number, cy: number): Point => {
    let best = { x: cx, y: cy, score: mag[clamp(cy, 0, h - 1) * w + clamp(cx, 0, w - 1)] }
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx
        const y = cy + dy
        if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue
        const i = y * w + x
        // a corner should have BOTH an h-edge row and a v-edge column nearby
        const support = mag[i] + (horiz[y * w + x] ? 1 : 0) * 2 + (vert[y * w + x] ? 1 : 0) * 2
        if (support > best.score) best = { x, y, score: support }
      }
    }
    return { x: best.x, y: best.y }
  }

  return {
    tl: snap(quad.tl.x, quad.tl.y),
    tr: snap(quad.tr.x, quad.tr.y),
    br: snap(quad.br.x, quad.br.y),
    bl: snap(quad.bl.x, quad.bl.y),
  }
}

function normalizeQuad(quad: Quad, w: number, h: number): Quad {
  const nx = (x: number) => Math.min(1, Math.max(0, x / w))
  const ny = (y: number) => Math.min(1, Math.max(0, y / h))
  return {
    tl: { x: nx(quad.tl.x), y: ny(quad.tl.y) },
    tr: { x: nx(quad.tr.x), y: ny(quad.tr.y) },
    br: { x: nx(quad.br.x), y: ny(quad.br.y) },
    bl: { x: nx(quad.bl.x), y: ny(quad.bl.y) },
  }
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}
