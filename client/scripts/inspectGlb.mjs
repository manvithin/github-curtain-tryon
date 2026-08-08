/**
 * Inspects curtain.glb structure (nodes, geometry count, materials).
 * Run: node scripts/inspectGlb.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const buf = readFileSync(resolve(__dirname, '../public/models/curtain.glb'))

// GLB container: magic(4) version(4) length(4) chunkLen(4) chunkType(4) -> JSON
const jsonChunkLen = buf.readUInt32LE(12)
const jsonText = buf.slice(20, 20 + jsonChunkLen).toString('utf8')
const gltf = JSON.parse(jsonText)

console.log('asset:', JSON.stringify(gltf.asset))
console.log('nodes:', gltf.nodes?.map((n) => n.name || '(unnamed)').join(', '))
console.log('meshes:', gltf.meshes?.length)
console.log('materials:', gltf.materials?.map((m) => m.name).join(', '))
console.log('buffers:', (gltf.buffers || []).map((b) => b.byteLength))