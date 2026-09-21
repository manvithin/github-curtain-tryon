const fs = require('fs');

function inspectDetailed(filepath) {
  const buf = fs.readFileSync(filepath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);

  console.log('--- DETAILED INSPECTION:', filepath, '---');
  console.log('Materials:');
  gltf.materials.forEach((mat, i) => {
    console.log(`  [${i}] ${mat.name}:`, JSON.stringify(mat));
  });

  console.log('Meshes:');
  gltf.meshes.forEach((mesh, i) => {
    console.log(`  [${i}] ${mesh.name}:`, mesh.primitives.map(p => ({
      material: p.material !== undefined ? gltf.materials[p.material]?.name : 'none',
      targets: p.targets ? p.targets.length : 0,
      extras: mesh.extras
    })));
  });

  console.log('Animations:');
  (gltf.animations || []).forEach((anim, i) => {
    console.log(`  [${i}] ${anim.name}, channels: ${anim.channels.length}, samplers: ${anim.samplers.length}`);
    anim.channels.forEach(ch => {
      const targetNode = gltf.nodes[ch.target.node]?.name;
      console.log(`    target: ${targetNode}, path: ${ch.target.path}`);
    });
  });

  console.log('Nodes Hierarchy:');
  gltf.nodes.forEach((node, i) => {
    if (node.mesh !== undefined || node.children) {
      console.log(`  [${i}] Node "${node.name}" mesh=${node.mesh !== undefined ? gltf.meshes[node.mesh]?.name : 'none'}, children=${(node.children || []).map(c => gltf.nodes[c]?.name).join(', ')}`);
    }
  });
}

inspectDetailed('C:/Users/manvi/OneDrive/Documents/home decor/curtain7.glb');
