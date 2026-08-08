import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = dirname(fileURLToPath(import.meta.url))
const path = resolve(__dirname, '../public/models/curtain.glb')
const arrayBuf = readFileSync(path).buffer
const loader = new GLTFLoader()
loader.parse(arrayBuf, '', (g) => {
  const root = g.scene
  console.log('=== ROOT', root.name, 'position', root.position.toArray(), 'quaternion', root.quaternion.toArray())
  root.traverse((o) => {
    if (o.isMesh) {
      const geo = o.geometry
      geo.computeBoundingBox()
      const bb = geo.boundingBox
      const s = new THREE.Vector3()
      bb.getSize(s)
      const m = o.material
      const matInfo = Array.isArray(m) ? m.map(mm => ({ name: mm.name, color: mm.color.getHexString(), metalness: mm.metalness, roughness: mm.roughness, transparent: mm.transparent, opacity: mm.opacity, side: mm.side, transparent2: mm.transparent })) : [{ name: m.name, color: m.color.getHexString(), metalness: m.metalness, roughness: m.roughness, transparent: m.transparent, opacity: m.opacity, side: m.side }]
      console.log(`mesh "${o.name}" pos=${o.position.toArray()} scale=${o.scale.toArray()} size=${s.toArray()} mat=${JSON.stringify(matInfo)}`)
    }
  })
})
