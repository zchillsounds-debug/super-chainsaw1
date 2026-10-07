// Round 30: sculpted camp props. Each builder returns a group standing on y = 0, its front toward +z, merged per
// material (props27.js builder), so each prop costs a handful of draw calls.
//   forgeHearth(): the rebuilt forge (the camp upgrade): a fired-brick hearth with a sunken coal bed, a back wall and a
//                  clay hood narrowing into a flue, sooted above the fire; a pair of goatskin bellows feeding a clay
//                  tuyere; a charcoal heap, a tool rail with tongs and hammers, a stone quench trough
//   fieldForge():  Bishr's forge before that: a clay bowl hearth in a ring of fire-blackened stones, one goatskin
//                  bellows on a frame, a basket of charcoal (replaces the old fire pit)
//   oldAnvil():    the anvil Bishr carried out of Baghdad: a small, worn block on a cracked stump (replaces the box)
//   cookFire():    a tripod of poles over a fire with a copper cauldron on a chain, a clay tannur with bread, pots,
//                  a stone mortar, a rug with bowls
//   tent(w, d, black): a ridge tent: a sagging cloth roof over two poles and a ridge, side walls, guy ropes to stakes,
//                  the door flap rolled up, a rug at the door. black: goat hair, striped
//   waterJars():   two tall zir jars on a wooden stand dripping into bowls, a covered jar and a waterskin
import * as THREE from 'three';
import { builder, mats as mats27 } from './props27.js';
import { fabricTex } from './textures.js';

let MATS = null;
function mats() {
  if (MATS) return MATS;
  const M = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });
  // fired brick in gypsum mortar, laid in courses; each brick a slightly different burn
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#d8cdb8'; x.fillRect(0, 0, 128, 128);
  for (let r = 0; r < 8; r++) for (let i = -1; i < 4; i++) {
    const bx = i * 36 + (r % 2) * 18 + 1, by = r * 16 + 1, v = Math.random();
    x.fillStyle = `rgb(${150 + v * 50 | 0},${92 + v * 34 | 0},${60 + v * 22 | 0})`; x.fillRect(bx, by, 33, 13);
    for (let k = 0; k < 10; k++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '60,30,15' : '230,200,160'},0.18)`; x.fillRect(bx + Math.random() * 30, by + Math.random() * 11, 2 + Math.random() * 3, 1 + Math.random() * 2); }
  }
  const brickT = new THREE.CanvasTexture(c); brickT.colorSpace = THREE.SRGBColorSpace; brickT.wrapS = brickT.wrapT = THREE.RepeatWrapping;
  // the same brick blackened by smoke, for the hearth's back wall and the hood's throat
  const c2 = document.createElement('canvas'); c2.width = c2.height = 128; const y = c2.getContext('2d');
  y.drawImage(c, 0, 0); y.fillStyle = 'rgba(20,14,10,0.72)'; y.fillRect(0, 0, 128, 128);
  for (let k = 0; k < 40; k++) { y.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`; y.beginPath(); y.arc(Math.random() * 128, Math.random() * 128, 4 + Math.random() * 14, 0, 7); y.fill(); }
  const sootT = new THREE.CanvasTexture(c2); sootT.colorSpace = THREE.SRGBColorSpace; sootT.wrapS = sootT.wrapT = THREE.RepeatWrapping;
  // gypsum plaster gone grey and black toward the top with smoke
  const c3 = document.createElement('canvas'); c3.width = c3.height = 64; const z = c3.getContext('2d');
  const gr = z.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#3a302a'); gr.addColorStop(0.5, '#8a7a68'); gr.addColorStop(1, '#c8b8a0'); z.fillStyle = gr; z.fillRect(0, 0, 64, 64);
  for (let k = 0; k < 60; k++) { z.fillStyle = `rgba(${Math.random() < 0.5 ? '30,24,20' : '220,205,180'},${Math.random() * 0.2})`; z.fillRect(Math.random() * 64, Math.random() * 64, 2 + Math.random() * 6, 1 + Math.random() * 4); }
  const plasterT = new THREE.CanvasTexture(c3); plasterT.colorSpace = THREE.SRGBColorSpace;
  // tent cloth: woven panels sewn side by side (seams across the roof), dust darkening toward the hems
  const c4 = document.createElement('canvas'); c4.width = c4.height = 256; const q = c4.getContext('2d');
  q.fillStyle = '#d8ccb0'; q.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 3000; k++) { q.fillStyle = `rgba(${Math.random() < 0.5 ? '120,100,70' : '250,240,220'},0.08)`; q.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1); }
  for (let k = 1; k < 7; k++) { const x0 = k * 256 / 7; q.fillStyle = 'rgba(90,70,45,0.45)'; q.fillRect(x0 - 1, 0, 2, 256); q.fillStyle = 'rgba(255,248,230,0.35)'; q.fillRect(x0 + 1, 0, 1, 256); }
  for (const [y0, y1] of [[0, 46], [256, 210]]) { const g2 = q.createLinearGradient(0, y0, 0, y1); g2.addColorStop(0, 'rgba(110,80,50,0.55)'); g2.addColorStop(1, 'rgba(110,80,50,0)'); q.fillStyle = g2; q.fillRect(0, Math.min(y0, y1), 256, Math.abs(y1 - y0)); }
  const clothT = new THREE.CanvasTexture(c4); clothT.colorSpace = THREE.SRGBColorSpace;
  const stripe = fabricTex('#2a221c', '#7a6a52', true); stripe.wrapS = stripe.wrapT = THREE.RepeatWrapping; stripe.repeat.set(1, 3);
  MATS = {
    brick: M({ map: brickT }), plaster: M({ map: plasterT, color: 0xc0b098 }), soot: M({ map: sootT, roughness: 1 }), clay: M({ color: 0xa8714a }), clayPale: M({ color: 0xcaa67c, roughness: 0.95 }),
    clayDark: M({ color: 0x6a4630 }), copper: M({ color: 0xb8703c, metalness: 0.75, roughness: 0.38 }), stone: M({ color: 0x8a8378 }), stoneBurnt: M({ color: 0x3a3430, roughness: 1 }),
    charcoal: M({ color: 0x1c1816, roughness: 1 }), ember: new THREE.MeshStandardMaterial({ color: 0x2a0a00, emissive: 0xff5a10, emissiveIntensity: 2.4, roughness: 1 }),
    skin: M({ color: 0x7a5a3a, roughness: 0.8 }), basket: M({ color: 0x9a7a48, roughness: 1 }), bread: M({ color: 0xc89050, roughness: 1 }),
    linen: M({ map: clothT, color: 0xc4b8a0, roughness: 1, side: THREE.DoubleSide }), cloth: M({ color: 0xb4a688, roughness: 1 }), hair: M({ map: stripe, roughness: 1, side: THREE.DoubleSide }),
    rug: M({ map: fabricTex('#7a2a1a', '#d9a441', true), roughness: 1 }), rug2: M({ map: fabricTex('#1f3a5a', '#c89a3a', true), roughness: 1 }),
  };
  return MATS;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r1, r2, h, n = 10) => new THREE.CylinderGeometry(r1, r2, h, n);
const jit = (k) => (Math.random() - 0.5) * k;
const V2 = (pts) => pts.map(([r, h]) => new THREE.Vector2(r, h));
// a lathe whose surface wobbles a little, so thrown clay and sewn skins are not machine-perfect
function lathe(pts, n = 16, wob = 0.03, fn) {
  const g = new THREE.LatheGeometry(V2(pts), n), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), a = Math.atan2(pz, px), k = 1 + wob * Math.sin(a * 3 + py * 7) + (fn ? fn(a, py) : 0); p.setXYZ(i, px * k, py, pz * k); }
  g.computeVertexNormals(); return g;
}
// a box with its brick texture repeated at a true scale (a brick course is 16 px of 128 = 1/8 of the map: 0.09 m)
function brickBox(w, h, d) {
  const g = box(w, h, d), uv = g.attributes.uv, n = g.attributes.normal, s = 1 / 0.72;
  const P = g.attributes.position;
  for (let i = 0; i < uv.count; i++) { const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)); const u = nx > 0.5 ? P.getZ(i) : P.getX(i), v = ny > 0.5 ? P.getZ(i) : P.getY(i); uv.setXY(i, u * s, v * s); }
  return g;
}
// a goatskin bellows: a fat, folded bag with a board on top and a nozzle; lies along +x
function bellows(B, M, x, y, z, ry, s = 1) {
  const bag = lathe([[0, 0], [0.12, 0.02], [0.2, 0.12], [0.22, 0.3], [0.2, 0.46], [0.13, 0.56], [0.05, 0.6], [0.03, 0.66], [0, 0.66]], 14, 0.02, (a, py) => 0.05 * Math.sin(py * 38) * Math.min(1, py * 3));
  bag.rotateZ(-Math.PI / 2); bag.scale(s, s * 0.7, s);
  B.put(bag, M.skin, x, y + 0.16 * s, z, 0, ry, 0);
  const c = Math.cos(ry), sn = Math.sin(ry), at = (l) => [x + l * c, z - l * sn];
  const [bx, bz] = at(0.25 * s); B.put(box(0.5 * s, 0.03, 0.3 * s), mats27().plankDark, bx, y + 0.31 * s, bz, 0, ry, -0.12);
  const [nx, nz] = at(0.72 * s); B.put(cyl(0.022, 0.035, 0.22 * s, 6), mats27().iron, nx, y + 0.16 * s, nz, 0, ry, Math.PI / 2);
}

export function forgeHearth() {
  const M = mats(), M7 = mats27(), B = builder();
  // the hearth block, its top a stone curb round a sunken bed of coals
  B.put(brickBox(1.4, 0.8, 1.0), M.brick, 0, 0.4, 0);
  for (const [w, d, px, pz] of [[1.5, 0.16, 0, 0.47], [1.5, 0.16, 0, -0.47], [0.16, 0.8, 0.67, 0], [0.16, 0.8, -0.67, 0]]) B.put(box(w, 0.08, d), M.stone, px, 0.84, pz, 0, 0, jit(0.02));
  B.put(box(1.2, 0.02, 0.8), M.charcoal, 0, 0.8, 0);
  for (let i = 0; i < 26; i++) { const r = Math.sqrt(Math.random()) * 0.32; const a = Math.random() * 6.28; B.put(new THREE.DodecahedronGeometry(0.04 + Math.random() * 0.035, 0), r < 0.2 ? M.ember : M.charcoal, Math.cos(a) * r * 1.5, 0.83, Math.sin(a) * r, Math.random() * 3, Math.random() * 3, 0); }
  // the back wall, sooted, and the hood: a half bell from the wall narrowing into a round flue
  B.put(brickBox(1.5, 1.0, 0.22), M.soot, 0, 1.3, -0.45);
  // the hood: a four-sided plaster funnel over the hearth's back half, narrowing to a square flue
  const hood = cyl(0.21, 1.0, 0.85, 4); hood.rotateY(Math.PI / 4); hood.scale(1, 1, 0.62);
  const hp = hood.attributes.position; for (let i = 0; i < hp.count; i++) hp.setZ(i, hp.getZ(i) + (hp.getY(i) + 0.425) * 0.08 - 0.02);
  hood.computeVertexNormals();
  B.put(hood, M.plaster, 0, 2.2, -0.2);
  B.put(box(1.45, 0.08, 0.92), M.plaster, 0, 1.78, -0.2); // the hood's lip, a plastered beam over the jambs
  B.put(box(0.32, 0.95, 0.24), M.soot, 0, 3.05, -0.3);
  B.put(box(0.38, 0.06, 0.3), M.clayDark, 0, 3.53, -0.3);
  for (const sx of [-1, 1]) B.put(box(0.12, 0.95, 0.14), M.brick, sx * 0.7, 1.28, -0.2, 0, 0, 0); // the jambs that carry the hood's lip
  // the tuyere: a clay pipe through the left side into the coals, and the pair of bellows feeding it
  B.put(cyl(0.05, 0.06, 0.5, 8), M.clayDark, -0.78, 0.62, 0.05, 0, 0, Math.PI / 2 - 0.15);
  bellows(B, M, -1.65, 0.0, -0.12, 0.08, 1.05); bellows(B, M, -1.65, 0.0, 0.26, -0.12, 1.05);
  B.put(box(0.16, 0.12, 0.16), M7.plankDark, -1.2, 0.06, 0.07);
  // the charcoal heap to the right, a rail of tools on the wall, the quench trough in front
  for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 0.38, h = (1 - r / 0.4) * 0.3; B.put(new THREE.DodecahedronGeometry(0.05 + Math.random() * 0.04, 0), M.charcoal, 1.15 + Math.cos(a) * r, h, 0.35 + Math.sin(a) * r, Math.random() * 3, Math.random() * 3, 0); }
  B.put(box(1.2, 0.05, 0.05), M7.plankDark, 0, 1.6, -0.33);
  for (let i = 0; i < 4; i++) { const x = -0.45 + i * 0.3;
    if (i % 2) { B.put(cyl(0.012, 0.015, 0.36, 5), M7.timber, x, 1.42, -0.3); B.put(box(0.06, 0.05, 0.13), M7.iron, x, 1.24, -0.3); }
    else for (const sx of [-1, 1]) B.put(cyl(0.008, 0.01, 0.55, 5), M7.iron, x + sx * 0.018, 1.33, -0.3, 0, 0, sx * 0.05); }
  B.put(brickBox(0.9, 0.34, 0.42), M.stone, 0.95, 0.17, 0.85);
  B.put(box(0.78, 0.02, 0.3), M7.water, 0.95, 0.33, 0.85);
  return B.finish();
}

export function fieldForge() {
  const M = mats(), M7 = mats27(), B = builder();
  for (let i = 0; i < 11; i++) { const a = i / 11 * 6.28 + jit(0.15); B.put(new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.07, 0), i % 3 ? M.stoneBurnt : M.stone, Math.cos(a) * 0.72, 0.12, Math.sin(a) * 0.72, a, a * 2, 0, new THREE.Vector3(1, 0.75, 1)); }
  // a clay bowl hearth on a mound, its rim cracked, the coals glowing in it
  B.put(lathe([[0, 0], [0.55, 0], [0.5, 0.18], [0.42, 0.3], [0.36, 0.32], [0.3, 0.24], [0, 0.22]], 18, 0.04), M.clay, 0, 0, 0);
  for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, r = Math.random() * 0.24; B.put(new THREE.DodecahedronGeometry(0.045 + Math.random() * 0.03, 0), r < 0.16 ? M.ember : M.charcoal, Math.cos(a) * r, 0.26, Math.sin(a) * r, Math.random() * 3, Math.random() * 3, 0); }
  B.put(cyl(0.04, 0.05, 0.42, 8), M.clayDark, -0.5, 0.24, 0, 0, 0, Math.PI / 2 - 0.2);
  bellows(B, M, -1.35, 0.06, 0.02, 0, 1);
  B.put(box(0.6, 0.05, 0.08), M7.plankDark, -1.1, 0.05, 0.25); B.put(box(0.6, 0.05, 0.08), M7.plankDark, -1.1, 0.05, -0.21);
  // the charcoal basket
  B.put(lathe([[0, 0], [0.2, 0], [0.26, 0.24], [0.27, 0.3], [0.25, 0.3], [0.18, 0.02], [0, 0.02]], 14, 0.03, (a) => 0.02 * Math.sin(a * 20)), M.basket, 0.95, 0, 0.55);
  for (let i = 0; i < 10; i++) B.put(new THREE.DodecahedronGeometry(0.05, 0), M.charcoal, 0.95 + jit(0.3), 0.3, 0.55 + jit(0.3), Math.random() * 3, Math.random() * 3, 0);
  for (const sx of [-1, 1]) B.put(cyl(0.008, 0.01, 0.6, 5), M7.iron, 0.7 + sx * 0.02, 0.03, -0.55, Math.PI / 2, 0.5, 0);
  return B.finish();
}

export function oldAnvil() {
  const M = mats(), M7 = mats27(), B = builder();
  // the stump: weathered, split down one side, sunk a little into the ground
  const st = lathe([[0, 0], [0.33, 0], [0.31, 0.06], [0.29, 0.2], [0.3, 0.46], [0.31, 0.5], [0, 0.5]], 16, 0.04, (a) => (Math.abs(Math.sin(a * 0.5 - 0.6)) < 0.06 ? -0.12 : 0));
  B.put(st, M7.bark, 0, 0, 0);
  B.put(new THREE.CircleGeometry(0.3, 16), M7.ringTop, 0, 0.502, 0, -Math.PI / 2, 0, 0);
  // the old body: a squat block with a short horn, its face dished with years of work
  const s = new THREE.Shape();
  s.moveTo(-0.22, 0); s.lineTo(0.2, 0); s.lineTo(0.15, 0.06); s.quadraticCurveTo(0.08, 0.14, 0.12, 0.2); s.quadraticCurveTo(0.3, 0.22, 0.4, 0.27); s.quadraticCurveTo(0.3, 0.29, 0.16, 0.3);
  s.lineTo(-0.24, 0.3); s.lineTo(-0.26, 0.25); s.quadraticCurveTo(-0.14, 0.14, -0.16, 0.06); s.closePath();
  const body = new THREE.ExtrudeGeometry(s, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.018, bevelSegments: 2, curveSegments: 6 });
  body.translate(0, 0, -0.075); const bp = body.attributes.position;
  for (let i = 0; i < bp.count; i++) { const px = bp.getX(i); if (px > 0.16) bp.setZ(i, bp.getZ(i) * (1 - (px - 0.16) / 0.26 * 0.8)); if (bp.getY(i) > 0.29) bp.setY(i, bp.getY(i) - 0.012 * Math.cos(px * 6)); }
  body.computeVertexNormals();
  B.put(body, M7.iron, 0, 0.5, 0);
  B.put(box(0.38, 0.01, 0.15), M7.face, -0.04, 0.5 + 0.31, 0);
  // a rough hammer, a file and a few nails on the ground
  B.put(cyl(0.015, 0.018, 0.36, 6), M7.timber, 0.36, 0.03, 0.28, 0, 0.7, Math.PI / 2); B.put(box(0.06, 0.06, 0.12), M7.iron, 0.36 + Math.cos(0.7) * 0.18, 0.04, 0.28 - Math.sin(0.7) * 0.18, 0, 0.7, 0);
  for (let i = 0; i < 5; i++) B.put(cyl(0.005, 0.003, 0.07, 4), M7.iron, -0.35 + jit(0.2), 0.006, 0.3 + jit(0.15), Math.PI / 2, Math.random() * 6, 0);
  return B.finish();
}

export function cookFire() {
  const M = mats(), M7 = mats27(), B = builder();
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; B.put(new THREE.DodecahedronGeometry(0.17, 0), M.stoneBurnt, Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55, a, a, 0, new THREE.Vector3(1, 0.7, 1)); }
  for (let i = 0; i < 4; i++) B.put(cyl(0.05, 0.06, 0.8, 6), M7.bark, 0, 0.12, 0, 0, i * 0.8, Math.PI / 2 - 0.25);
  B.put(new THREE.CircleGeometry(0.42, 14), M.charcoal, 0, 0.02, 0, -Math.PI / 2, 0, 0);
  for (let i = 0; i < 9; i++) B.put(new THREE.DodecahedronGeometry(0.05, 0), M.ember, jit(0.4), 0.05, jit(0.4), Math.random() * 3, 0, 0);
  // the tripod: three poles leaning in, lashed at the top, a chain down to the cauldron
  for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28 + 0.3, lean = 0.32; B.put(cyl(0.025, 0.03, 1.9, 6), M7.timber, Math.cos(a) * 0.48, 0.92, Math.sin(a) * 0.48, 0, -a, lean * 1.0); }
  B.put(cyl(0.05, 0.05, 0.12, 8), M7.rope, 0, 1.78, 0);
  for (let i = 0; i < 9; i++) B.put(new THREE.TorusGeometry(0.022, 0.006, 4, 8), M7.iron, 0, 1.72 - i * 0.07, 0, 0, i * 1.57, 0);
  const pot = lathe([[0, 0], [0.12, 0], [0.24, 0.06], [0.29, 0.18], [0.28, 0.3], [0.24, 0.36], [0.26, 0.4], [0.23, 0.4], [0, 0.36]], 18, 0.008);
  B.put(pot, M.copper, 0, 0.56, 0);
  B.put(new THREE.TorusGeometry(0.27, 0.01, 4, 18, Math.PI), M7.iron, 0, 0.96, 0, 0, 0, 0);
  B.put(new THREE.CircleGeometry(0.23, 16), M.clayDark, 0, 0.93, 0, -Math.PI / 2, 0, 0); // the stew
  // the tannur: a clay oven, open at the top, flatbreads cooling on a cloth beside it
  const tn = lathe([[0, 0], [0.42, 0], [0.44, 0.2], [0.4, 0.55], [0.3, 0.8], [0.22, 0.86], [0.2, 0.86], [0.27, 0.78], [0.36, 0.52], [0.38, 0.2], [0.36, 0.06], [0, 0.06]], 18, 0.03);
  B.put(tn, M.clayPale, 1.55, 0, -0.25);
  B.put(box(0.18, 0.14, 0.04), M.charcoal, 1.55, 0.1, 0.17);
  B.put(box(0.7, 0.012, 0.5), M.cloth, 1.5, 0.006, 0.55, 0, 0.2, 0);
  for (let i = 0; i < 5; i++) B.put(cyl(0.13, 0.13, 0.012, 14), M.bread, 1.4 + (i % 3) * 0.12, 0.018 + Math.floor(i / 3) * 0.014, 0.55 + jit(0.12), jit(0.15), 0, jit(0.15));
  // pots, a stone mortar and pestle, a rug with bowls
  for (const [x, z, s] of [[-1.0, 0.45, 1], [-1.15, 0.05, 0.75], [-0.85, -0.3, 0.6]]) B.put(lathe([[0, 0], [0.12, 0], [0.18, 0.12], [0.16, 0.26], [0.1, 0.3], [0.11, 0.34], [0.09, 0.34], [0, 0.3]].map(([r, h]) => [r * s * 1.2, h * s * 1.2]), 14, 0.02), x < -1.05 ? M.clayDark : M.clay, x, 0, z);
  B.put(lathe([[0, 0], [0.16, 0], [0.18, 0.16], [0.15, 0.18], [0.1, 0.1], [0, 0.1]], 12, 0.05), M.stone, -0.5, 0, 0.85);
  B.put(cyl(0.025, 0.035, 0.26, 6), M.stone, -0.48, 0.2, 0.85, 0.3, 0, 0.2);
  B.put(box(1.3, 0.012, 0.85), M.rug, 0.3, 0.006, 1.25, 0, -0.1, 0);
  for (let i = 0; i < 3; i++) B.put(lathe([[0, 0], [0.05, 0], [0.09, 0.05], [0.085, 0.055], [0, 0.02]], 10, 0.01), i ? M.clay : M.copper, 0.0 + i * 0.32, 0.012, 1.2 + jit(0.2));
  return B.finish();
}

export function tent(w = 3.2, d = 2.6, black = false) {
  const M = mats(), M7 = mats27(), B = builder(), cloth = black ? M.hair : M.linen, H = 1.75, eave = 0.55;
  // the roof: one cloth over the ridge, sagging between the poles and down to the eaves
  const roof = new THREE.PlaneGeometry(w + 0.3, d + 0.2, 14, 10), rp = roof.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const u = rp.getX(i), v = rp.getY(i), side = Math.abs(v) / ((d + 0.2) / 2), t = side, sag = 0.1 * Math.sin(Math.PI * (u / (w + 0.3) + 0.5)) ** 2 * (1 - t) + 0.04 * Math.sin(u * 5) * t;
    rp.setXYZ(i, u, H - (H - eave) * t - sag + (black ? 0.05 * Math.sin(u * 9 + v * 4) * t : 0), v * (1 + 0.04 * t));
  }
  roof.computeVertexNormals(); B.put(roof, cloth, 0, 0, 0);
  for (const sz of [-1, 1]) B.put(box(w + 0.32, 0.07, 0.02), black ? M.rug : M.rug2, 0, eave + 0.03, sz * (d + 0.2) / 2 * 1.04 + sz * 0.01); // a woven band along each eave
  // the back and two side walls hang from the eaves; the front is open, its flap rolled up on the ridge's end
  const wall = (len, x, z, ry) => { const g = new THREE.PlaneGeometry(len, eave, 8, 2), p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.025 * Math.sin(p.getX(i) * 7)); g.computeVertexNormals(); B.put(g, cloth, x, eave / 2, z, 0, ry, 0); };
  wall(w + 0.3, 0, -(d + 0.2) / 2 * 1.04, 0);
  const gable = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-(d + 0.2) / 2 * 1.04, eave, 0), new THREE.Vector3((d + 0.2) / 2 * 1.04, eave, 0), new THREE.Vector3(0, H, 0), new THREE.Vector3(-(d + 0.2) / 2 * 1.04, 0, 0), new THREE.Vector3((d + 0.2) / 2 * 1.04, 0, 0)]);
  gable.setIndex([0, 1, 2, 3, 4, 1, 3, 1, 0]); gable.computeVertexNormals();
  B.put(gable, cloth, -(w + 0.3) / 2, 0, 0, 0, Math.PI / 2, 0);
  B.put(cyl(0.09, 0.09, d * 0.9, 10), cloth, (w + 0.3) / 2 - 0.05, H - 0.25, 0, Math.PI / 2, 0, 0); // the rolled front flap
  for (const sx of [-1, 1]) { B.put(cyl(0.035, 0.04, H + 0.15, 6), M7.timber, sx * (w / 2), (H + 0.15) / 2, 0); B.put(new THREE.SphereGeometry(0.05, 6, 4), M7.timber, sx * (w / 2), H + 0.16, 0); }
  B.put(cyl(0.03, 0.03, w, 6), M7.timber, 0, H - 0.02, 0, 0, 0, Math.PI / 2);
  // guy ropes from the eaves and the pole tops to stakes
  const rope = (a, b) => { const dir = new THREE.Vector3().subVectors(b, a), L = dir.length(), mid = a.clone().add(b).multiplyScalar(0.5), g = cyl(0.008, 0.008, L, 4); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); g.applyQuaternion(q); B.put(g, M7.rope, mid.x, mid.y, mid.z); B.put(cyl(0.02, 0.012, 0.3, 5), M7.timber, b.x, 0.1, b.z, 0, 0, 0.35 * Math.sign(b.z || 1)); };
  for (const sz of [-1, 1]) for (const fx of [-0.42, 0, 0.42]) rope(new THREE.Vector3(fx * w, eave, sz * (d + 0.2) / 2 * 1.04), new THREE.Vector3(fx * w, 0, sz * ((d + 0.2) / 2 + 0.9)));
  for (const sx of [-1, 1]) rope(new THREE.Vector3(sx * w / 2, H + 0.1, 0), new THREE.Vector3(sx * (w / 2 + 1.1), 0, 0));
  // inside: a rug and a bedroll; at the open end, a rug
  B.put(box(w * 0.8, 0.012, d * 0.7), black ? M.rug : M.rug2, 0, 0.007, 0);
  B.put(cyl(0.13, 0.13, 0.8, 10), black ? M.rug2 : M.rug, -w * 0.25, 0.13, -d * 0.2, Math.PI / 2, 0.1, 0);
  return B.finish();
}

export function waterJars() {
  const M = mats(), M7 = mats27(), B = builder();
  // the stand: four legs, two rails with round holes the jars sit in
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.put(box(0.07, 0.95, 0.07), M7.plankDark, sx * 0.62, 0.47, sz * 0.24, sz * 0.04, 0, sx * -0.04);
  for (const sz of [-1, 1]) B.put(box(1.36, 0.07, 0.07), M7.plankDark, 0, 0.82, sz * 0.24);
  for (const sx of [-1, 1]) B.put(box(0.07, 0.06, 0.55), M7.plankDark, sx * 0.62, 0.3, 0);
  // the zir: tall, unglazed, the pointed foot through the stand, a dark wet patch where the water seeps
  const zir = (x) => {
    B.put(lathe([[0, 0], [0.06, 0.02], [0.18, 0.2], [0.27, 0.45], [0.29, 0.62], [0.25, 0.82], [0.15, 0.94], [0.12, 0.98], [0.15, 1.02], [0.14, 1.04], [0.1, 1.0], [0, 1.0]], 18, 0.012), M.clayPale, x, 0.36, 0);
    B.put(lathe([[0, -0.005], [0.066, 0.015], [0.19, 0.2], [0.215, 0.3], [0.2, 0.33], [0, 0.33]], 18, 0.012), M.clay, x, 0.36, 0); // the seeping, darker foot
    B.put(lathe([[0, 0], [0.13, 0], [0.16, 0.06], [0.15, 0.065], [0, 0.03]], 12, 0.01), M.clay, x, 0.0, 0); // the drip bowl beneath
    B.put(new THREE.CircleGeometry(0.13, 12), M7.water, x, 0.045, 0, -Math.PI / 2, 0, 0);
    B.put(cyl(0.16, 0.16, 0.02, 14), M7.timber, x, 1.4, 0); // a wooden lid against the dust
  };
  zir(-0.33); zir(0.33);
  B.put(lathe([[0, 0], [0.05, 0], [0.06, 0.04], [0.055, 0.045], [0, 0.01]], 10, 0.01), M.copper, 0.33 + 0.12, 1.42, 0.02); // a cup on the lid
  // on the ground: a covered storage jar and a waterskin
  B.put(lathe([[0, 0], [0.16, 0], [0.24, 0.2], [0.26, 0.4], [0.18, 0.56], [0.12, 0.6], [0.13, 0.64], [0, 0.64]], 16, 0.02), M.clay, 1.0, 0, 0.3);
  B.put(new THREE.SphereGeometry(0.14, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.cloth, 1.0, 0.63, 0.3, 0, 0, 0, new THREE.Vector3(1, 0.4, 1));
  const skin = lathe([[0, 0], [0.12, 0.02], [0.2, 0.15], [0.22, 0.3], [0.17, 0.44], [0.07, 0.5], [0.04, 0.58], [0, 0.58]], 12, 0.06);
  skin.scale(1, 1, 0.6); B.put(skin, M.skin, -0.9, 0.04, 0.32, 0, 0.4, Math.PI / 2 - 0.15);
  return B.finish();
}
