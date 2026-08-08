import * as THREE from 'three'

/**
 * Parametric curtain layer over the single GLB asset.
 *
 * 1B audit fix — true four-corner mapping:
 *   The user selects four screen corners (P1..P4) that are the sole source of
 *   truth. We deform the fabric vertices onto that quadrilateral with bilinear
 *   interpolation, so the rod follows P1->P2 and the hem follows P4->P3 under
 *   any perspective skew — never an axis-aligned bounding box.
 *
 * The rod and finials stay rigid and are repositioned onto the top edge.
 * Fabric Z-depth (the pleats from the original GLB) is preserved so it still
 * reads as 3D fabric.
 *
 * Coordinates are CANVAS-PIXEL (CSS px). A Y-flip (canvasH - y) converts
 * canvas-down to the world Y-up used by the orthographic overlay canvas, so
 * screen-space alignment is exact.
 */
export interface QuadPoints {
  p1: { x: number; y: number } // top-left
  p2: { x: number; y: number } // top-right
  p3: { x: number; y: number } // bottom-right
  p4: { x: number; y: number } // bottom-left
  canvasH: number
}

export interface CurtainConfig {
  points: QuadPoints
  open: number
  draw: number
  color: string
  roughness: number
  translucency: number
}

export class CurtainModel {
  readonly group = new THREE.Group()

  private panelL: THREE.Mesh | null = null
  private panelR: THREE.Mesh | null = null
  private rod: THREE.Mesh | null = null
  private finialL: THREE.Mesh | null = null
  private finialR: THREE.Mesh | null = null
  private fabricMat: THREE.MeshStandardMaterial | null = null

  /** Per-panel vertex cache for fast in-place deform (screen px coords). */
  private panels: Record<
    string,
    {
      mesh: THREE.Mesh
      vx: Float32Array
      vy: Float32Array
      vz: Float32Array
      nx: number
      ny: number
      halfW: number
      halfH: number
      isLeft: boolean
      uMin: number
      uMax: number
    }
  > = {}

  private config: CurtainConfig
  private smoothedOpen = 0

  constructor(gltfRoot: THREE.Group) {
    gltfRoot.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.name === 'rod') this.rod = obj
        else if (obj.name === 'finialL') this.finialL = obj
        else if (obj.name === 'finialR') this.finialR = obj
        else if (obj.name === 'panelL') this.panelL = obj
        else if (obj.name === 'panelR') this.panelR = obj
        const m = obj.material
        const mat = Array.isArray(m) ? (m[0] as THREE.MeshStandardMaterial) : (m as THREE.MeshStandardMaterial)
        if (obj.name === 'panelL' || obj.name === 'panelR') this.fabricMat = mat
      }
    })

    this.group.add(gltfRoot)
    this.config = {
      points: {
        p1: { x: 0, y: 0 },
        p2: { x: 1, y: 0 },
        p3: { x: 1, y: 1 },
        p4: { x: 0, y: 1 },
        canvasH: 1,
      },
      open: 0,
      draw: 0.92,
      color: '#e8e4dc',
      roughness: 0.92,
      translucency: 0,
    }
    this.bake()
    this.deform()
    this.hydrateMaterial()
  }

  set(config: Partial<CurtainConfig>): void {
    this.config = { ...this.config, ...config }
    this.deform()
    this.hydrateMaterial()
  }

  get(): CurtainConfig {
    return this.config
  }

  /** Per-frame open/close easing (dtMs since last frame). */
  update(dtMs: number): void {
    const target = Math.max(0, Math.min(1, this.config.open))
    const k = 1 - Math.exp(-dtMs / 150) // ~600ms settle
    this.smoothedOpen += (target - this.smoothedOpen) * k
    if (Math.abs(target - this.smoothedOpen) < 1e-4) this.smoothedOpen = target
    this.deform()
  }

  private bake(): void {
    for (const [key, mesh] of [['panelL', this.panelL], ['panelR', this.panelR]] as const) {
      if (!mesh) continue
      const pos = mesh.geometry.attributes.position
      const arr = pos.array as Float32Array
      const vx = new Float32Array(arr.length / 3)
      const vy = new Float32Array(arr.length / 3)
      const vz = new Float32Array(arr.length / 3)
      for (let i = 0; i < arr.length; i += 3) {
        const j = i / 3
        vx[j] = arr[i]
        vy[j] = arr[i + 1]
        vz[j] = arr[i + 2]
      }
      const minX = Math.min(...vx), maxX = Math.max(...vx)
      const minY = Math.min(...vy), maxY = Math.max(...vy)
      const nx = maxX - minX, ny = maxY - minY
      // curtain-local U range each panel covers. Panels share the center seam.
      const uMin = key === 'panelL' ? 0 : 0.5
      const uMax = key === 'panelL' ? 0.5 : 1
      this.panels[key] = {
        mesh,
        vx,
        vy,
        vz,
        nx,
        ny,
        halfW: nx / 2,
        halfH: ny / 2,
        isLeft: key === 'panelL',
        uMin,
        uMax,
      }
    }
  }

  private deform(): void {
    const { p1, p2, p3, p4, canvasH } = this.config.points
    const { open, draw } = this.config
    const slide = open * 0.5 * draw // curtain-U units the panels move inward when open

    for (const key of ['panelL', 'panelR'] as const) {
      const info = this.panels[key]
      if (!info) continue
      const { mesh, vx, vy, vz, nx, ny, halfW, halfH, uMin, uMax, isLeft } = info
      const pos = mesh.geometry.attributes.position
      const arr = pos.array as Float32Array

      // slide: closed panels meet at center; opening pulls their near edges inward
      const uShift = isLeft ? -slide : slide

      for (let i = 0; i < arr.length; i += 3) {
        const j = i / 3
        const lx = vx[j]
        const ly = vy[j]
        const lz = vz[j]

        // local panel U (0..1 across this panel's width) -> curtain U with slide
        let u = (lx + halfW) / nx // 0..1 within panel
        u = uMin + u * (uMax - uMin) + uShift
        u = Math.min(Math.max(u, 0), 1)
        const v = (ly + halfH) / ny // 0..1 top->bottom

        // bilinear map onto the screen quad
        const w00 = (1 - u) * (1 - v)
        const w10 = u * (1 - v)
        const w11 = u * v
        const w01 = (1 - u) * v
        const sx = w00 * p1.x + w10 * p2.x + w11 * p3.x + w01 * p4.x
        const sy = w00 * p1.y + w10 * p2.y + w11 * p3.y + w01 * p4.y

        arr[i] = sx
        arr[i + 1] = canvasH - sy // canvas y-down -> world y-up
        arr[i + 2] = lz // preserve pleat depth
      }
      pos.needsUpdate = true
      mesh.geometry.computeVertexNormals()
    }

    // rigid rod straddling the top edge P1->P2
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    if (this.rod) {
      this.rod.position.set((p1.x + p2.x) / 2, canvasH - (p1.y + p2.y) / 2, 0)
      const ang = Math.atan2(dy, dx)
      this.rod.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), ang)
      this.rod.scale.set(Math.hypot(dx, dy) / 3.4, 1, 1) // asset rod length = 3.4
    }
    if (this.finialL) this.finialL.position.set(p1.x, canvasH - p1.y, 0)
    if (this.finialR) this.finialR.position.set(p2.x, canvasH - p2.y, 0)
    // fabric sits just behind the rod in Z so it never appears "on top" of metal
    if (this.panelL) this.panelL.position.z = 0.03
    if (this.panelR) this.panelR.position.z = 0.03
  }

  private hydrateMaterial(): void {
    if (!this.fabricMat) return
    const alpha = 1 - this.config.translucency * 0.8
    this.fabricMat.transparent = alpha < 1
    this.fabricMat.opacity = alpha
    this.fabricMat.roughness = this.config.roughness
    this.fabricMat.color.set(this.config.color)
    this.fabricMat.depthWrite = this.config.translucency <= 0
  }
}
