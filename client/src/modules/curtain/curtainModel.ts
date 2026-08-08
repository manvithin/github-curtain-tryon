import * as THREE from 'three'

/**
 * Parametric curtain layer over the single GLB asset.
 *
 * The asset origin is its TOP-CENTER (rod at y=0, fabric hanging downward).
 * `width`/`height` describe the FULL curtain rect:
 *   - width  = rod span (left finial → right finial)
 *   - height = rod-to-hem drop
 *
 * Scale is baked from the measured asset bounding box so the curtain fills the
 * selected window exactly (no fixed-size rectangle). Two panels slide along
 * the rod as one unit; they are never horizontally stretched.
 */
export interface CurtainConfig {
  width: number
  height: number
  /** 0 = closed (panels meet at center), 1 = wide open. */
  open: number
  /** How far panels travel when open (fraction of half-width). */
  draw: number
  color: string
  roughness: number
  /** 0 = opaque .. 1 = translucent fabric. */
  translucency: number
  /** Whether the curtain has been confirmed/placed (drives material hydrate). */
  placed: boolean
}

const DEFAULT_CONFIG: CurtainConfig = {
  width: 1,
  height: 1,
  open: 0,
  draw: 0.92,
  color: '#e8e4dc',
  roughness: 0.92,
  translucency: 0,
  placed: true,
}

export class CurtainModel {
  readonly group = new THREE.Group()

  private panelL: THREE.Mesh | null = null
  private panelR: THREE.Mesh | null = null
  private panelXBase: Record<'L' | 'R', number> = { L: 0, R: 0 }
  private fabricMat: THREE.MeshStandardMaterial | null = null
  private rodMat: THREE.MeshStandardMaterial | null = null
  private finialMat: THREE.MeshStandardMaterial | null = null
  private readonly assembledW: number
  private readonly assembledH: number
  private config: CurtainConfig
  /** smoothed open value (frame-rate independent). */
  private activeOpen = 0

  constructor(gltfRoot: THREE.Group, initial: Partial<CurtainConfig> = {}) {
    gltfRoot.traverse((obj) => {
      if (obj.name === 'panelL' && obj instanceof THREE.Mesh) {
        this.panelL = obj
        this.panelXBase.L = obj.position.x
        const m = obj.material
        this.fabricMat = Array.isArray(m) ? (m[0] as THREE.MeshStandardMaterial) : (m as THREE.MeshStandardMaterial)
      }
      if (obj.name === 'panelR' && obj instanceof THREE.Mesh) {
        this.panelR = obj
        this.panelXBase.R = obj.position.x
        if (!this.fabricMat) {
          const m = obj.material
          this.fabricMat = Array.isArray(m) ? (m[0] as THREE.MeshStandardMaterial) : (m as THREE.MeshStandardMaterial)
        }
      }
      if (obj.name === 'rod' && obj instanceof THREE.Mesh) {
        const m = obj.material
        this.rodMat = Array.isArray(m) ? (m[0] as THREE.MeshStandardMaterial) : (m as THREE.MeshStandardMaterial)
      }
      if (obj.name === 'finialL' || obj.name === 'finialR') {
        if (obj instanceof THREE.Mesh && !this.finialMat) {
          const m = obj.material
          this.finialMat = Array.isArray(m) ? (m[0] as THREE.MeshStandardMaterial) : (m as THREE.MeshStandardMaterial)
        }
      }
    })

    const bb = new THREE.Box3().setFromObject(gltfRoot)
    this.assembledW = bb.max.x - bb.min.x || 1
    this.assembledH = bb.max.y - bb.min.y || 1

    this.group.add(gltfRoot)
    this.config = { ...DEFAULT_CONFIG, ...initial }
    this.apply(true)
  }

  set(config: Partial<CurtainConfig>): void {
    this.config = { ...this.config, ...config }
    this.apply(false)
  }

  get(): CurtainConfig {
    return this.config
  }

  /** Advance open/close smoothing. Call every frame with elapsed ms. */
  update(dtMs: number): void {
    const target = Math.max(0, Math.min(1, this.config.open))
    const k = 1 - Math.exp(-dtMs / 150)
    this.activeOpen += (target - this.activeOpen) * k
    if (Math.abs(target - this.activeOpen) < 0.0005) this.activeOpen = target
    this.hydrateOpen(this.activeOpen)
  }

  private apply(instant: boolean): void {
    if (instant) this.activeOpen = this.config.open
    this.hydrateMaterial()
    this.hydrateOpen(this.activeOpen)
    this.hydrateRod()
  }

  private hydrateOpen(open: number): void {
    const sx = this.config.width / this.assembledW
    const sy = Math.max(0.05, this.config.height / this.assembledH)
    this.group.scale.set(sx, sy, Math.min(sx, sy))

    const halfW = this.config.width / 2
    const shift = Math.max(0, Math.min(1, open)) * halfW * (this.config.draw ?? 0.92)

    if (this.panelL) this.panelL.position.x = this.panelXBase.L - shift / sx
    if (this.panelR) this.panelR.position.x = this.panelXBase.R + shift / sx
  }

  private hydrateMaterial(): void {
    if (!this.fabricMat) return
    const alpha = 1 - this.config.translucency * 0.8
    this.fabricMat.transparent = alpha < 1
    this.fabricMat.opacity = alpha
    this.fabricMat.roughness = this.config.roughness
    this.fabricMat.color.set(this.config.color)
    this.fabricMat.depthWrite = this.config.translucency > 0 ? false : true
  }

  /** Metal parts always opaque; hide until placed so we never see a bare rod. */
  private hydrateRod(): void {
    if (this.rodMat) this.rodMat.visible = this.config.placed
    if (this.finialMat) this.finialMat.visible = this.config.placed
  }
}
