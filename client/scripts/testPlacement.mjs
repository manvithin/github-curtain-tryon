/**
 * Deterministic test for the 1B geometry invariant:
 * "The rendered curtain must land inside the user's selected quadrilateral,
 * anchored at the top edge (rod on P1-P2) and dropping to the bottom edge (P4-P3)."
 *
 * We mirror the EXACT mapping used by placement.ts and windowPlane.ts, then
 * project the curtain's world-space AABB corners back to screen/display
 * coordinates and assert they coincide with the selected window corners.
 *
 * Run: node scripts/testPlacement.mjs
 */
const PASS = []; const FAIL = [];
function assert(name, cond, extra) {
  if (cond) PASS.push(name); else { FAIL.push(name + (extra ? ' -> ' + extra : '')); console.log('FAIL: ' + name + (extra ? ' -> ' + extra : '')) }
}

// --- mirror windowPlane.ts ---
function coverMapping(cw, ch, vw, vh) {
  const scale = Math.max(cw / vw, ch / vh);
  const dw = vw * scale, dh = vh * scale;
  return { scale, offsetX: (cw - dw) / 2, offsetY: (ch - dh) / 2, vw, vh }
}
function displayToVideo(px, py, cw, ch, vw, vh) {
  const m = coverMapping(cw, ch, vw, vh)
  const dw = vw * m.scale, dh = vh * m.scale
  const x = (px - m.offsetX) / dw, y = (py - m.offsetY) / dh
  if (x < 0 || x > 1 || y < 0 || y > 1) return null
  return { x, y }
}
function videoToDisplay(p, cw, ch, vw, vh) {
  const m = coverMapping(cw, ch, vw, vh)
  return { x: m.offsetX + p.x * vw * m.scale, y: m.offsetY + p.y * vh * m.scale }
}
function pointsToQuad(c) { const [p1,p2,p3,p4]=c; return { tl:p1, tr:p2, br:p3, bl:p4 }}

// --- mirror placement.ts ---
function computePlacement(quad, cw, ch, vw, vh) {
  const aspect = cw / ch
  const toDisp = (nx, ny) => {
    const scale = Math.max(cw / vw, ch / vh)
    const dw = vw * scale, dh = vh * scale
    const ox = (cw - dw) / 2, oy = (ch - dh) / 2
    return { x: (ox + nx * dw) / cw, y: (oy + ny * dh) / ch }
  }
  const tl=toDisp(quad.tl.x,quad.tl.y), tr=toDisp(quad.tr.x,quad.tr.y)
  const br=toDisp(quad.br.x,quad.br.y), bl=toDisp(quad.bl.x,quad.bl.y)
  const tmX=(tl.x+tr.x)/2, tmY=(tl.y+tr.y)/2
  const bmX=(bl.x+br.x)/2, bmY=(bl.y+br.y)/2
  const wNorm = Math.hypot(tr.x-tl.x, tr.y-tl.y) || (br.x-bl.x)
  const hNorm = Math.hypot(bmX-tmX, bmY-tmY)
  const DEPTH_Z=2.9, cameraFov=72
  const halfH = DEPTH_Z * Math.tan((cameraFov/2)*Math.PI/180)
  const worldH = halfH*2, worldW = worldH*aspect
  return { x:(tmX-0.5)*worldW, y:-(tmY-0.5)*worldH, z:-DEPTH_Z,
           width:wNorm*worldW, height:hNorm*worldH, cameraFov }
}

// --- inverse-project world -> display EXACTLY as the Three.js camera does ---
function worldToDisplay(px, py, placement, cw, ch) {
  // R3F Canvas camera: vertical fov = cameraFov degrees, aspect = cw/ch, at z=0 looking -Z.
  // At the curtain plane (z = placement.z < 0), world half-height visible = depth * tan(fovV/2).
  const depth = -placement.z
  const halfV = Math.tan((placement.cameraFov / 2) * Math.PI / 180)
  const worldH = 2 * depth * halfV
  const worldW = worldH * (cw / ch) // horizontal span at this depth
  // canvas center is (cw/2, ch/2); world (0,0) maps to center. y up in world -> y down in canvas.
  return {
    x: (cw / 2) + (px / worldW) * (cw / 2) * 2,
    y: (ch / 2) - (py / worldH) * (ch / 2) * 2,
  }
}

// ===== TESTS =====
function run(name, fn){ try { fn(); assert(name, true) } catch(e){ FAIL.push(name+' threw'); console.log('THROW '+name+': '+e)} }

run('placement: front-parallel quad centered', () => {
  const cw=400, ch=800, vw=720, vh=1280 // portrait: aspect 0.5
  const pts = [{x:0.2,y:0.15},{x:0.8,y:0.15},{x:0.8,y:0.85},{x:0.2,y:0.85}]
  const p = computePlacement(pointsToQuad(pts), cw, ch, vw, vh)
  // window span must equal the display-space width of the chosen video-norm window
  const m = coverMapping(cw, ch, vw, vh)
  const dw = vw * m.scale, dh = vh * m.scale
  const disp = (nx,ny) => ({ x: (m.offsetX + nx*dw)/cw, y: (m.offsetY + ny*dh)/ch })
  const tlD=disp(0.2,0.15), trD=disp(0.8,0.15)
  const wDisp = Math.hypot(trD.x-tlD.x, trD.y-tlD.y)
  // world width of curtain = wDisp * worldW ; recompute worldW from computePlacement's fov
  const worldH = 2*2.9*Math.tan(36*Math.PI/180), worldW = worldH*(cw/ch)
  assert('width spans the visible window width', Math.abs(p.width - wDisp*worldW) < 1e-9, p.width+' vs '+wDisp*worldW)
  assert('anchor x near 0 (top-mid of window at x=0.5)', Math.abs(p.x) < 1e-9)
  assert('anchor y = -(topMidY-0.5)*worldH', Math.abs(p.y - (-(disp(0.5,0.15).y-0.5)*worldH)) < 1e-9)
})

run('placement: curtain AABB maps back to window corners', () => {
  const cw=400, ch=800, vw=720, vh=1280
  const pts = [{x:0.2,y:0.15},{x:0.8,y:0.15},{x:0.8,y:0.85},{x:0.2,y:0.85}]
  const quad = pointsToQuad(pts)
  const p = computePlacement(quad, cw, ch, vw, vh)
  // Curtain anchored at top-center: AABB y from (p.y - height) [bottom] to p.y [top].
  const tl_disp = worldToDisplay(p.x - p.width/2, p.y, p, cw, ch)        // top-left
  const tr_disp = worldToDisplay(p.x + p.width/2, p.y, p, cw, ch)       // top-right
  const bl_disp = worldToDisplay(p.x - p.width/2, p.y - p.height, p, cw, ch) // bottom-left
  const br_disp = worldToDisplay(p.x + p.width/2, p.y - p.height, p, cw, ch)  // bottom-right
  const tl_vid = videoToDisplay(quad.tl, cw, ch, vw, vh)
  const tr_vid = videoToDisplay(quad.tr, cw, ch, vw, vh)
  const bl_vid = videoToDisplay(quad.bl, cw, ch, vw, vh)
  const br_vid = videoToDisplay(quad.br, cw, ch, vw, vh)
  assert('top-left x coincides with window', Math.abs(tl_disp.x - tl_vid.x) < 1e-6, JSON.stringify(tl_disp)+' vs '+JSON.stringify(tl_vid))
  assert('top-left y coincides with window', Math.abs(tl_disp.y - tl_vid.y) < 1e-6, JSON.stringify(tl_disp)+' vs '+JSON.stringify(tl_vid))
  assert('top-right x coincides', Math.abs(tr_disp.x - tr_vid.x) < 1e-6)
  assert('top-right y coincides', Math.abs(tr_disp.y - tr_vid.y) < 1e-6)
  assert('bottom-left x coincides', Math.abs(bl_disp.x - bl_vid.x) < 1e-6)
  assert('bottom-left y coincides', Math.abs(bl_disp.y - bl_vid.y) < 1e-6)
  assert('bottom-right x coincides', Math.abs(br_disp.x - br_vid.x) < 1e-6)
  assert('bottom-right y coincides', Math.abs(br_disp.y - br_vid.y) < 1e-6)
})

run('placement: top edge of curtain sits exactly on P1-P2 (rod line)', () => {
  const cw=400, ch=800, vw=720, vh=1280
  // tilted window
  const pts=[{x:0.15,y:0.2},{x:0.85,y:0.25},{x:0.8,y:0.9},{x:0.2,y:0.85}]
  const p = computePlacement(pointsToQuad(pts), cw, ch, vw, vh)
  const topMid_disp = videoToDisplay({x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2}, cw,ch,vw,vh)
  const anchor_disp = worldToDisplay(p.x, p.y, p, cw, ch)
  assert('rod anchor (top-center) lands on window top-midline', Math.abs(anchor_disp.x-topMid_disp.x)<1e-6 && Math.abs(anchor_disp.y-topMid_disp.y)<1e-6)
})

run('placement: proportions match the chosen quad', () => {
  const cw=1080, ch=1920, vw=1080, vh=1920  // square video, portrait screen
  const pts=[{x:0.2,y:0.15},{x:0.7,y:0.15},{x:0.7,y:0.85},{x:0.2,y:0.85}] // 50% wide, 70% tall
  const p = computePlacement(pointsToQuad(pts), cw, ch, vw, vh)
  assert('width == wNorm*worldW', Math.abs(p.width - 0.5*(2*2.9*Math.tan(36*Math.PI/180)*(cw/ch))) < 1e-9)
  assert('height == hNorm*worldH', Math.abs(p.height - 0.7*(2*2.9*Math.tan(36*Math.PI/180))) < 1e-9)
})

run('undo: pops exactly one point', () => {
  // mirror CameraView handleUndo state transitions on a plain array (deterministic)
  function undo(corners){ const c=[...corners]; c.pop(); return c }
  assert('[] stays []', JSON.stringify(undo([])) === '[]')
  assert('[p1]->[]', JSON.stringify(undo([{x:1,y:1}])) === '[]')
  assert('[p1,p2,p3,p4]->[p1,p2,p3]', JSON.stringify(undo([{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}])) === '[{"x":0,"y":0},{"x":1,"y":0},{"x":1,"y":1}]')
})

run('undo: preserves earlier points in order', () => {
  const undo4=(c)=>{const a=[...c];a.pop();return a}
  const pts=[{x:0.2,y:0.15},{x:0.8,y:0.15},{x:0.8,y:0.85},{x:0.2,y:0.85}]
  const after3 = undo4(pts); const after2 = undo4(after3)
  assert('after undo P4 keeps [P1,P2,P3]', after3.length===3 && Math.abs(after3[2].x-0.8)<1e-9 && Math.abs(after3[2].y-0.85)<1e-9)
  assert('after undo P3 keeps [P1,P2]', after2.length===2 && Math.abs(after2[0].x-0.2)<1e-9)
  const after1 = undo4(after2); const after0 = undo4(after1)
  assert('undo chain empties at end', after0.length===0)
})

console.log('\n=== '+PASS.length+' passed, '+FAIL.length+' failed ===')
if (FAIL.length) process.exit(1)
