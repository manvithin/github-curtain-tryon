import * as THREE from 'three'

/**
 * 1B parametric layer over the single GLB curtain asset.
 *
 * The asset origin is its TOP-CENTER. `width`/`height` are the FULL desired
 * rect (rod span = width, fabric drop = height). Scaling is computed from the
 * measured bounding box so the curtain fills the selected window exactly.
 */
export interface CurtainConfig {
  /** Total width (rod span) in 3D units. */
  width: number
  /** Total height (rod to hem) in 3D units. */
  height: number
  /** 0 = closed (panels meet), 1 = wide open. */
  open: number
  /** How far panels travel when open (fraction of half width). */
  draw: number
  color: string
  roughness: number
  /** 0 = opaque .. 1 = translucent. */
  translucency: number
}

const DEFAULT_CONFIG: CurtainConfig = {
  width: 3,
  height: 3,
  open: 0,
  draw: 0.92,
  color: '#e8e4dc',
  roughness: 0.92,
  translucency: 0,
}

export class CurtainModel {
  readonly group = new THREE.Group()

  private panelL: THREE.Mesh | null = null
  private panelR: THREE.Mesh | null = null
  private panelXBase: Record<'L' | 'R', number> = { L: 0, R: 0 }
  private fabricMat: THREE.MeshStandardMaterial | null = null
  private assembledW = 1
  private assembledH = 1
  private config: CurtainConfig = { ...DEFAULT_CONFIG }
  private activeOpen = 0

  constructor(gltfRoot: THREE.Group) {
    gltfRoot.traverse((obj) => {
      if (obj.name === 'panelL' && obj instanceof THREE.Mesh) {
        this.panelL = obj
        this.panelXBase.L = obj.position.x
      }
      if (obj.name === 'panelR' && obj instanceof THREE.Mesh) {
        this.panelR = obj
        this.panelXBase.R = obj.position.x
      }
    })

    if (this.panelL) {
      const m = this.panelL.material
      this.fabricMat = Array.isArray(m) ? (m[0] as THREE.MeshStandardMaterial) : (m as THREE.MeshStandardMaterial)
    }

    const bb = new THREE.Box3().setFromObject(gltfRoot)
    const size = new THREE.Vector3()
    bb.getSize(size)
    this.assembledW = size.x || 1
    this.assembledH = size.y || 1

    this.group.add(gltfRoot)
    this.apply(true)
  }

  set(config: Partial<CurtainConfig>): void {
    this.config = { ...this.config, ...config }
    this.apply(false)
  }

  get(): CurtainConfig {
    return this.config
  }

  /** Advance open/close smoothing. Call ~each frame with elapsed ms since last call. */
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
  }
}