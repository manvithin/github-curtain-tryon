/**
 * Generates public/models/curtain.glb — one sculpted curtain asset.
 *
 * Contains nodes: "rod", "panelL", "panelR". Panels have baked vertical pleats
 * and UVs so fabric textures map correctly. The runtime parametric layer
 * (CurtainModel) drives width/height/panels/open-close/material on top.
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

// ---- base curtain metrics (arbitrary units; runtime scales to window) ----
const ROD_LENGTH = 3.4
const ROD_RADIUS = 0.045
const PANEL_W = 1.6
const PANEL_H = 4.0
const PLEATS = 11

function buildPanel(phase) {
  const segW = 48
  const segH = 44
  const geo = new THREE.PlaneGeometry(PANEL_W, PANEL_H, segW, segH)

  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  const foldAmp = 0.13
  const droop = 0.10

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const u = uv.getX(i)
    const v = uv.getY(i)

    // vertical pleats: sinusoidal ridges across the width
    let z = foldAmp * Math.sin(u * Math.PI * 2 * PLEATS * 0.5 + phase)

    // deeper, softer outer edge (the return panel)
    const edge = Math.min(u, 1 - u)
    z += 0.05 * Math.exp(-edge * 8)

    // heading: top 8% lies flat against the rod pocket
    const heading = Math.max(0, 1 - v / 0.08)
    z *= 1 - heading

    // droop toward the floor
    z += droop * Math.sin((1 - v) * Math.PI) * 0.6

    // tiny irregularity so folds are not unnaturally uniform
    z += Math.sin(u * 37 + v * 53) * 0.008

    pos.setZ(i, z)
  }
  geo.computeVertexNormals()
  return geo
}

function buildMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xe8e4dc,
    roughness: 0.92,
    metalness: 0.0,
    side: THREE.DoubleSide,
    name: 'curtainFabric',
  })
}

const group = new THREE.Group()
group.name = 'curtain'

const rodMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.6 })
const rod = new THREE.Mesh(new THREE.CylinderGeometry(ROD_RADIUS, ROD_RADIUS, ROD_LENGTH, 20), rodMat)
rod.rotation.z = Math.PI / 2
rod.position.y = 0.05
rod.name = 'rod'
group.add(rod)

const panelL = new THREE.Mesh(buildPanel(0.0), buildMaterial())
panelL.name = 'panelL'
panelL.position.x = -PANEL_W / 2 - 0.03
panelL.position.y = PANEL_H / 2
group.add(panelL)

const panelR = new THREE.Mesh(buildPanel(Math.PI), buildMaterial())
panelR.name = 'panelR'
panelR.position.x = PANEL_W / 2 + 0.03
panelR.position.y = PANEL_H / 2
group.add(panelR)

const exporter = new GLTFExporter()
exporter.parse(
  group,
  (result) => {
    if (result instanceof ArrayBuffer) {
      mkdirSync(dirname(OUT), { recursive: true })
      writeFileSync(OUT, Buffer.from(result))
      console.log('wrote', OUT)
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
