import * as THREE from 'three'

/**
 * 1B parametric layer over the single GLB curtain asset.
 *
 * Owns the glTF scene and applies runtime transforms so the asset itself
 * stays pure geometry (D9). Parameters: width, height, panel separation,
 * open/closed (0..1), material color/roughness/opacity/translucency.
 */

export interface CurtainConfig {
  /** Curtain width in 3D units (scales whole asset horizontally). */
  width: number
  /** Curtain height in 3D units (scales whole asset vertically). */
  height: number
  /** 0 = fully closed (panels meet), 1 = fully open (drawn to the sides). */
  open: number
  /** Multiplier for how far panels pull when opening. */
  draw: number
  color: string
  roughness: number
  /** 0..1 opaque..flow to sheet. */
  translucency: number
}

const BASE_WIDTH = 3.2
const BASE_HEIGHT = 4.0

const DEFAULT_CONFIG: CurtainConfig = {
  width: 3,
  height: 2,
  open: 0,
  draw: 0.9,
  color: '#e8e4dc',
  roughness: 0.92,
  translucency: 0,
}

export class CurtainModel {
  readonly group = new THREE.Group()

  private root: THREE.Group
  private panelL: THREE.Mesh | null = null
  private panelR: THREE.Mesh | null = null
  private panelLBaseX: number
  private panelRBaseX: number
  private fabric: THREE.MeshStandardMaterial | null = null
  private config: CurtainConfig = { ...DEFAULT_CONFIG }

  constructor(gltfRoot: THREE.Group) {
    this.root = gltfRoot
    this.group.name = 'curtainInstance'

    gltfRoot.traverse((obj) => {
      if (obj.name === 'panelL' && obj instanceof THREE.Mesh) this.panelL = obj
      if (obj.name === 'panelR' && obj instanceof THREE.Mesh) this.panelR = obj
    })

    this.panelLBaseX = this.panelL?.position.x ?? -0.8
    this.panelRBaseX = this.panelR?.position.x ?? 0.8

    if (this.panelL) {
      const m = this.panelL.material
      this.fabric = Array.isArray(m) ? (m[0] as THREE.MeshStandardMaterial) : (m as THREE.MeshStandardMaterial)
    }

    this.group.add(this.root)
    this.apply()
  }

  set(config: Partial<CurtainConfig>): void {
    this.config = { ...this.config, ...config }
    this.apply()
  }

  get(): CurtainConfig {
    return this.config
  }

  /** Reserved for open/close tween easing in later milestones. */
  update(): void {}

  private apply(): void {
    const c = this.config
    const sx = Math.max(0.1, c.width / BASE_WIDTH)
    const sy = Math.max(0.1, c.height / BASE_HEIGHT)

    this.group.scale.set(sx, sy, Math.min(sx, sy))

    const openFrac = Math.max(0, Math.min(1, c.open))
    const openShift = openFrac * (BASE_WIDTH / 2 + 0.4) * (c.draw || 0.9)

    if (this.panelL) {
      this.panelL.position.x = this.panelLBaseX - openShift
      this.panelL.rotation.y = -openFrac * 0.12
    }
    if (this.panelR) {
      this.panelR.position.x = this.panelRBaseX + openShift
      this.panelR.rotation.y = openFrac * 0.12
    }

    if (this.fabric) {
      const alpha = 1 - c.translucency * 0.8
      this.fabric.transparent = alpha < 1
      this.fabric.opacity = alpha
      this.fabric.roughness = c.roughness
      this.fabric.color?.set(c.color)
    }
  }
}