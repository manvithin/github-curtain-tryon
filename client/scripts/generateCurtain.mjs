/**
 * Generates public/models/curtain.glb — one sculpted curtain asset.
 *
 * Layout (asset units):
 *   rod  = horizontal cylinder at y≈0 spanning the full width
 *   panels = hang DOWNWARD from just under the rod, folded/pleated, UV-mapped
 *   standard metal rod color with finish caps added as small spheres
 *
 * Nodes: "rod", "finialL", "finialR", "panelL", "panelR".
 * Origin of the group is the TOP-CENTER of the assembly (callers anchor there).
 *
 * Run: node scripts/generateCurtain.mjs
 */
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// GLTFExporter (binary) uses FileReader; polyfill for Node.
if (!globalThis.FileReader) {
  globalThis.FileReader = class {
    onload = null
    onerror = null
    onloadend = null
    result = null
    readAsArrayBuffer(blob) {
      blob
        .arrayBuffer()
        .then((buf) => {
          this.result = buf
          this.onload?.()
          this.onloadend?.()
        })
        .catch((err) => {
          this.onerror?.(err)
          this.onloadend?.()
        })
    }
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../public/models/curtain.glb')

// ---- asset metrics --------------------------------------------------------
const ROD_LENGTH = 3.4
const ROD_RADIUS = 0.05
const FINIAL_RADIUS = 0.09
const PANEL_W = 1.6
const PANEL_H = 4.0
const PLEATS = 13
const ROD_CENTER_X = 0

function buildPanel(phase) {
  const segW = 96 // many segments for smooth curved folds
  const segH = 56
  const geo = new THREE.PlaneGeometry(PANEL_W, PANEL_H, segW, segH)

  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  const foldAmp = 0.16
  const droop = 0.12

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const u = uv.getX(i)
    const v = uv.getY(i)

    // vertical pleats: a few full-depth ridges with slight amplitude drift
    // per-fold so it doesn't read as a perfect sin wave.
    let z = 0
    for (let k = 1; k <= 2; k++) {
      z += foldAmp * (1 / k) * (0.5 + 0.5 * Math.sin(u * Math.PI * 2 * PLEATS * k * 0.5 + phase))
    }
    // heading: top 12% pulls into the rod pocket
    const heading = Math.max(0, 1 - v / 0.12)
    z *= 1 - heading

    // droop toward the floor
    z += droop * Math.sin((1 - v) * Math.PI) * 0.7

    // subtle surface irregularity for natural variation
    z += Math.sin(u * 41 + v * 29) * 0.01

    pos.setZ(i, z)
  }
  geo.computeVertexNormals()
  return geo
}

function material() {
  return new THREE.MeshStandardMaterial({
    color: 0xe8e4dc,
    roughness: 0.92,
    metalness: 0.0,
    side: THREE.DoubleSide,
    name: 'curtainFabric',
  })
}

// ---- build group anchored at top-center -----------------------------------
const group = new THREE.Group()
group.name = 'curtain'

const rodMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.3, metalness: 0.85 })

const rod = new THREE.Mesh(new THREE.CylinderGeometry(ROD_RADIUS, ROD_RADIUS, ROD_LENGTH, 24), rodMat)
rod.rotation.z = Math.PI / 2
rod.position.y = 0
rod.name = 'rod'
group.add(rod)

const finialMat = new THREE.MeshStandardMaterial({ color: 0xb5b5b5, roughness: 0.25, metalness: 0.8 })
for (const [sx] of [[-1], [1]]) {
  const fin = new THREE.Mesh(new THREE.SphereGeometry(FINIAL_RADIUS, 20, 16), finialMat)
  fin.position.x = sx * (ROD_LENGTH / 2)
  fin.position.y = 0
  fin.name = sx === -1 ? 'finialL' : 'finialR'
  group.add(fin)
}

// Panels: top edge tucked just below the rod, hanging DOWN to -PANEL_H.
const halfH = PANEL_H / 2
const rodGap = ROD_RADIUS

const panelL = new THREE.Mesh(buildPanel(-1), material())
panelL.name = 'panelL'
panelL.geometry.translate(0, -halfH - rodGap, 0) // top edge at -rodGap
panelL.position.x = -PANEL_W / 2 // closed = left panel touches center
panelL.position.y = 0
group.add(panelL)

const panelR = new THREE.Mesh(buildPanel(1), material())
panelR.name = 'panelR'
panelR.geometry.translate(0, -halfH - rodGap, 0)
panelR.position.x = PANEL_W / 2 // closed = right panel touches center
panelR.position.y = 0
group.add(panelR)

// ---- shift so the origin is the TOP-CENTER of the whole assembly ----------
// bounding box measurement over the raw group
const boxExpanded = new THREE.Box3()
group.traverse((obj) => {
  if (obj instanceof THREE.Mesh) boxExpanded.expandByObject(obj)
})
const size = new THREE.Vector3()
boxExpanded.getSize(size)
const maxV = boxExpanded.max
group.position.set(-(maxV.x + boxExpanded.min.x) / 2, -maxV.y, 0)

const exporter = new GLTFExporter()
exporter.parse(
  group,
  (result) => {
    if (result instanceof ArrayBuffer) {
      mkdirSync(dirname(OUT), { recursive: true })
      writeFileSync(OUT, Buffer.from(result))
      console.log('wrote', OUT, size.toArray())
    } else {
      throw new Error('expected ArrayBuffer output')
    }
  },
  (err) => {
    console.error('export failed', err)
    process.exit(1)
  },
  { binary: true },
)