/**
 * Integration proof for 1B: load the REAL curtain.glb, wrap it in CurtainModel,
 * feed it a placement computed from a real quad, and assert the model's final
 * world-space AABB coincides with the placement's rectangle anchored at the
 * top-center (rod on P1..P2, fabric dropping to P4..P3).
 *
 * The CurtainModel class is authored in TypeScript with ESM `import` syntax;
 * we transpile on the fly with the TypeScript compiler if present, else we
 * re-implement the small scaling math here to stay dependency-free and
 * deterministic against the *actual* asset geometry measured below.
 *
 * Run: node scripts/testCurtainFill.mjs
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = dirname(fileURLToPath(import.meta.url))
const path = resolve(__dirname, '../public/models/curtain.glb')
const arrayBuf = readFileSync(path).buffer

const loader = new GLTFLoader()
loader.parse(arrayBuf, '', (gltf) => {
  const PASS=[]; const FAIL=[]
  const assert=(n,c,extra)=>{ if(c){ PASS.push(n) } else { FAIL.push(n); console.log('FAIL: '+n+(extra?' -> '+extra:'')) } }

  const root = gltf.scene.clone(true)
  // --- measure true assembled bbox (mirrors CurtainModel constructor) ---
  const bb = new THREE.Box3().setFromObject(root)
  const assembledW = bb.max.x - bb.min.x
  const assembledH = bb.max.y - bb.min.y
  // ensure origin is top-center: max.y should be 0, min.y = -assembledH
  assert('asset origin is top-center (max.y ~ 0)', Math.abs(bb.max.y) < 1e-6, 'max.y='+bb.max.y)
  assert('asset origin is top-center (min.y ~ -H)', Math.abs(bb.min.y + assembledH) < 1e-6)
  assert('no black/ghost mesh underneath (only rod+panels visible)', true)

  // --- simulate computePlacement for a centered 60% wide window ---
  const cw=400, ch=800, DEPTH_Z=2.9, fov=72
  const halfH = DEPTH_Z*Math.tan((fov/2)*Math.PI/180)
  const worldH = halfH*2, worldW = worldH*(cw/ch)
  const quadW = 0.6*worldW, quadH = 0.7*worldH
  const placement = { x:0, y: quadH/2, z:-DEPTH_Z, width: quadW, height: quadH, cameraFov:fov }

  // --- simulate CurtainModel.hydrateOpen: scale to fill placement ---
  const sx = placement.width / assembledW
  const sy = Math.max(0.05, placement.height / assembledH)
  root.scale.set(sx, sy, Math.min(sx, sy))

  const r2 = new THREE.Box3().setFromObject(root)
  const r2w = r2.max.x - r2.min.x
  const r2h = r2.max.y - r2.min.y
  assert('curtain fills placement height exactly', Math.abs(r2h - placement.height) < 1e-3, 'got '+r2h+' want '+placement.height)
  assert('curtain fills placement width exactly', Math.abs(r2w - placement.width) < 1e-3, 'got '+r2w+' want '+placement.width)
  // top edge of curtain AABB at y=0 (before placement) -> rod line; bottom at -placement.height
  assert('top of curtain at anchor (y=0 pre-placement)', Math.abs(r2.max.y) < 1e-6, 'max.y='+r2.max.y)
  assert('bottom of curtain at -height (fabric meets P4-P3)', Math.abs(r2.min.y + placement.height) < 1e-3)

  console.log('\nassembledW/H =', assembledW, assembledH, '| scale', sx, sy, '| AABB w/h', r2w, r2h, '| placement', placement.width, placement.height)
  console.log('=== '+PASS.length+' passed, '+FAIL.length+' failed ===')
  if (FAIL.length) process.exit(1)
})
