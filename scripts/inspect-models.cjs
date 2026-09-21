const fs = require('fs');
const path = require('path');

function inspectGlb(filepath) {
  if (!fs.existsSync(filepath)) {
    console.log('File not found:', filepath);
    return;
  }
  const buf = fs.readFileSync(filepath);
  if (buf.length < 20) {
    console.log('File too small:', filepath);
    return;
  }
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546C67) {
    console.log('Not a GLB:', filepath);
    return;
  }
  const jsonLen = buf.readUInt32LE(12);
  const jsonChunkType = buf.readUInt32LE(16);
  if (jsonChunkType !== 0x4E4F534A) return;
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);
  console.log('=========================================');
  console.log('FILE:', filepath);
  console.log('MESHES:', (gltf.meshes || []).map(m => m.name));
  console.log('MATERIALS:', (gltf.materials || []).map(m => m.name));
  console.log('NODES:', (gltf.nodes || []).map(n => n.name).filter(Boolean));
  console.log('ANIMATIONS:', (gltf.animations || []).map(a => a.name));
  if (gltf.meshes) {
    gltf.meshes.forEach((m) => {
      if (m.extras && m.extras.targetNames) {
        console.log(`Morph targets on mesh ${m.name}:`, m.extras.targetNames);
      }
    });
  }
}

[
  'public/models/curtain.glb',
  'C:/Users/manvi/OneDrive/Documents/curtain5.glb',
  'C:/Users/manvi/OneDrive/Documents/home decor/curtain6.glb',
  'C:/Users/manvi/OneDrive/Documents/home decor/curtain7.glb',
  'C:/Users/manvi/OneDrive/Documents/home decor/curtain_model3.glb'
].forEach(inspectGlb);
