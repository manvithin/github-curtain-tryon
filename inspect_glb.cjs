const fs = require('fs');
const buf = fs.readFileSync('public/models/Double_Curtain.glb');

// Parse GLB header
const jsonChunkLen = buf.readUInt32LE(12);
const jsonStr = buf.toString('utf8', 20, 20 + jsonChunkLen);
const json = JSON.parse(jsonStr);

// Report animations
console.log('=== ANIMATIONS ===');
if (json.animations && json.animations.length > 0) {
  json.animations.forEach((a, i) => {
    const channelCount = a.channels ? a.channels.length : 0;
    const samplerCount = a.samplers ? a.samplers.length : 0;
    console.log('  [' + i + '] name=' + (a.name || 'unnamed') + '  channels=' + channelCount + '  samplers=' + samplerCount);
  });
} else {
  console.log('  NO ANIMATIONS in GLB');
}

// Report nodes
console.log('\n=== ALL NODES ===');
const nodes = json.nodes || [];
nodes.forEach((n, i) => {
  const meshStr = n.mesh !== undefined ? ' mesh=' + n.mesh : '';
  const childStr = n.children ? ' children=[' + n.children.join(',') + ']' : '';
  console.log('  [' + i + '] ' + (n.name || 'unnamed') + meshStr + childStr);
});

// Report meshes with morph targets
console.log('\n=== MESHES WITH MORPH TARGETS ===');
const meshes = json.meshes || [];
meshes.forEach((m, i) => {
  const prims = m.primitives || [];
  prims.forEach((p, pi) => {
    if (p.targets && p.targets.length > 0) {
      const targetNames = (m.extras && m.extras.targetNames) ? JSON.stringify(m.extras.targetNames) : 'none';
      console.log('  mesh[' + i + '] name=' + (m.name || 'unnamed') + ' prim[' + pi + '] targets=' + p.targets.length + ' targetNames=' + targetNames);
    }
  });
});

// Report materials
console.log('\n=== MATERIALS ===');
(json.materials || []).forEach((mat, i) => console.log('  mat[' + i + '] ' + (mat.name || 'unnamed')));

// Summary
console.log('\n=== SUMMARY ===');
console.log('  Nodes:', nodes.length, '  Meshes:', meshes.length);
console.log('  Animations:', (json.animations || []).length);
console.log('  Materials:', (json.materials || []).length);
