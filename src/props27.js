// Round 27: the camp stories' props, sculpted (they were plain boxes and cylinders in Round 26). Each builder returns a
// group standing on y = 0, its front toward +z, merged per material so each prop costs a handful of draw calls.
//   wasitGoods(): Yusuf's goods from Wasit: plank crates lashed with rope, a slumped sack of dates with a few spilled,
//                 a bolt of indigo cloth with its loose end hanging
//   anvil():      Bishr's new anvil: a forged body with horn, face, heel and feet on a banded stump with root flare,
//                 a hammer on the face, tongs and a quench bucket
//   drillGround(): 'Amr's ground: a straw-bound practice post with cut marks, and an A-frame rack of blunted practice spears
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { woodTex } from './textures.js';

let MATS = null;
function mats() {
  if (MATS) return MATS;
  const wt = woodTex(); wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
  const M = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });
  // the stump's top: growth rings and radial checks
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#9a7650'; x.fillRect(0, 0, 128, 128);
  for (let r = 4; r < 64; r += 3 + Math.random() * 3) { x.strokeStyle = `rgba(70,45,25,${0.25 + Math.random() * 0.3})`; x.lineWidth = 1 + Math.random(); x.beginPath(); x.ellipse(64, 64, r, r * 0.96, 0, 0, Math.PI * 2); x.stroke(); }
  x.strokeStyle = 'rgba(40,25,12,0.6)'; x.lineWidth = 1.5; for (let i = 0; i < 5; i++) { const a = Math.random() * 6.28; x.beginPath(); x.moveTo(64 + Math.cos(a) * 20, 64 + Math.sin(a) * 20); x.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62); x.stroke(); }
  const rings = new THREE.CanvasTexture(c); rings.colorSpace = THREE.SRGBColorSpace;
  // the cloth bolt's end: the wound layers as a spiral
  const c2 = document.createElement('canvas'); c2.width = c2.height = 64; const y = c2.getContext('2d');
  y.fillStyle = '#1f4a6e'; y.fillRect(0, 0, 64, 64); y.strokeStyle = 'rgba(10,25,40,0.7)'; y.lineWidth = 1.2; y.beginPath();
  for (let a = 0; a < Math.PI * 14; a += 0.1) { const r = 3 + a * 0.62; y.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } y.stroke();
  const spiral = new THREE.CanvasTexture(c2); spiral.colorSpace = THREE.SRGBColorSpace;
  MATS = {
    plank: M({ map: wt, color: 0xd8b890 }), plankDark: M({ map: wt, color: 0x9a7a58 }), timber: M({ map: wt, color: 0xb89870 }),
    rope: M({ color: 0xb8a070, roughness: 1 }), sack: M({ color: 0xb59c72, roughness: 1 }), date: M({ color: 0x4a2414, roughness: 0.45 }),
    cloth: M({ color: 0x24527a, roughness: 0.85 }), clothEnd: M({ map: spiral, roughness: 0.9 }), trim: M({ color: 0xc89a3a, roughness: 0.7 }),
    iron: M({ color: 0x3a3a3e, metalness: 0.75, roughness: 0.45 }), face: M({ color: 0xb8b8bc, metalness: 0.95, roughness: 0.18 }),
    bark: M({ color: 0x5a4430, roughness: 1 }), ringTop: M({ map: rings, roughness: 0.95 }), straw: M({ color: 0xcfae62, roughness: 1 }),
    strawDark: M({ color: 0x9a7e40, roughness: 1 }), leather: M({ color: 0x5a3820, roughness: 0.75 }), water: M({ color: 0x2a3438, metalness: 0.2, roughness: 0.1 }),
  };
  return MATS;
}

// a group builder that collects geometries per material and merges them at the end
function builder() {
  const parts = new Map();
  const put = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = null) => {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), s || new THREE.Vector3(1, 1, 1));
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m); g.deleteAttribute('uv2');
    if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(g);
  };
  const finish = () => {
    const grp = new THREE.Group();
    for (const [mat, list] of parts) {
      const keep = list.map((g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; });
      const m = new THREE.Mesh(mergeGeometries(keep), mat); m.castShadow = m.receiveShadow = true; grp.add(m);
    }
    return grp;
  };
  return { put, finish };
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r1, r2, h, n = 10) => new THREE.CylinderGeometry(r1, r2, h, n);
// a little jitter so hand-made things are not ruler-straight
const jit = (k) => (Math.random() - 0.5) * k;

// a plank crate: slatted sides with gaps, corner posts, a slatted lid, two rope lashings
function crate(B, M, w, h, d, x, y, z, ry, dark = false) {
  const P = dark ? M.plankDark : M.plank, c = Math.cos(ry), s = Math.sin(ry);
  const at = (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
  const n = 3, gap = 0.025, sh = (h - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const yy = sh / 2 + i * (sh + gap);
    for (const sz of [-1, 1]) { B.put(box(w - 0.02, sh, 0.035), P, ...at(jit(0.01), yy, sz * (d / 2)), jit(0.02), ry, jit(0.015)); }
    for (const sx of [-1, 1]) { B.put(box(0.035, sh, d - 0.02), P, ...at(sx * (w / 2), yy, jit(0.01)), 0, ry, jit(0.015)); }
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.put(box(0.06, h + 0.01, 0.06), M.plankDark, ...at(sx * (w / 2 - 0.01), h / 2, sz * (d / 2 - 0.01)), 0, ry, 0);
  for (let i = 0; i < 4; i++) B.put(box(w + 0.02, 0.03, d / 4 - 0.015), P, ...at(0, h + 0.015, -d / 2 + d / 8 + i * d / 4), jit(0.02), ry, jit(0.02));
  B.put(box(0.03, 0.04, d + 0.04), M.plankDark, ...at(0, h + 0.045, 0), 0, ry, 0); // the lid's batten
  for (const lx of [-w * 0.28, w * 0.3]) { B.put(box(0.03, h + 0.07, d + 0.07), M.rope, ...at(lx, h / 2 + 0.01, 0), 0, ry, 0); B.put(box(0.03, 0.03, d + 0.07), M.rope, ...at(lx, h + 0.06, 0), 0, ry, 0); }
}

export function wasitGoods() {
  const M = mats(), B = builder();
  crate(B, M, 0.78, 0.52, 0.6, 0, 0, 0, 0.18);
  crate(B, M, 0.66, 0.48, 0.56, 0.82, 0, 0.12, -0.2, true);
  crate(B, M, 0.6, 0.42, 0.5, 0.38, 0.6, 0.04, 0.45);
  // the date sack: a slumped lathe, lumpy, its neck gathered and tied, the top folded over
  const prof = [[0, 0], [0.26, 0.01], [0.36, 0.08], [0.39, 0.2], [0.37, 0.36], [0.31, 0.5], [0.2, 0.6], [0.09, 0.64], [0.07, 0.68], [0.11, 0.74], [0.13, 0.8], [0.06, 0.82], [0, 0.82]].map(([r, h]) => new THREE.Vector2(r, h));
  const sk = new THREE.LatheGeometry(prof, 18), pos = sk.attributes.position;
  for (let i = 0; i < pos.count; i++) { const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i), a = Math.atan2(pz, px), k = 1 + 0.07 * Math.sin(a * 3 + py * 9) + 0.04 * Math.sin(a * 7 - py * 13); pos.setXYZ(i, px * k * (py < 0.5 ? 1 + (0.5 - py) * 0.25 : 1), py * (0.92 + 0.08 * Math.cos(a * 2)), pz * k); }
  sk.computeVertexNormals();
  B.put(sk, M.sack, -0.62, 0, 0.26, 0.06, 0.4, -0.05);
  B.put(new THREE.TorusGeometry(0.075, 0.018, 6, 14), M.rope, -0.62 + 0.04, 0.69, 0.26 + 0.01, Math.PI / 2 + 0.06, 0, 0);
  for (let i = 0; i < 7; i++) { const a = i * 0.9, r = 0.42 + (i % 3) * 0.06; B.put(new THREE.SphereGeometry(0.03, 6, 5), M.date, -0.62 + Math.cos(a) * r * 0.6 + 0.12, 0.02, 0.26 + Math.sin(a) * r * 0.5 + 0.25, 0, a, 0, new THREE.Vector3(1, 0.8, 1.6)); }
  // the bolt of indigo cloth on the low crate, its loose end hanging over the front
  const bolt = cyl(0.11, 0.11, 0.86, 16);
  B.put(bolt, M.cloth, 0.84, 0.6, 0.14, 0, -0.2, Math.PI / 2);
  for (const sx of [-1, 1]) B.put(new THREE.CircleGeometry(0.11, 16), M.clothEnd, 0.84 + Math.cos(-0.2) * sx * 0.431, 0.6, 0.14 - Math.sin(-0.2) * sx * 0.431, 0, -0.2 + sx * Math.PI / 2, 0);
  for (const sx of [-0.34, 0.34]) B.put(new THREE.TorusGeometry(0.112, 0.008, 4, 16), M.trim, 0.84 + Math.cos(-0.2) * sx, 0.6, 0.14 - Math.sin(-0.2) * sx, 0, -0.2 + Math.PI / 2, 0);
  const tail = new THREE.PlaneGeometry(0.7, 0.42, 6, 6), tp = tail.attributes.position;
  for (let i = 0; i < tp.count; i++) { const u = tp.getX(i), v = tp.getY(i) + 0.21; tp.setXYZ(i, u, -v * 0.85, 0.02 * Math.sin(u * 14) + v * v * 0.35); }
  tail.computeVertexNormals();
  const tailG = tail; tailG.translate(0, 0, 0);
  B.put(tailG, M.cloth, 0.84 + 0.02, 0.56, 0.14 + 0.13, 0, -0.2, 0);
  return B.finish();
}

export function anvil() {
  const M = mats(), B = builder();
  // the stump: a flared lathe with roots, a ringed top and an iron band
  const sp = [[0, 0], [0.5, 0], [0.46, 0.05], [0.36, 0.14], [0.33, 0.3], [0.33, 0.5], [0.34, 0.56], [0, 0.56]].map(([r, h]) => new THREE.Vector2(r, h));
  const st = new THREE.LatheGeometry(sp, 16), sp2 = st.attributes.position;
  for (let i = 0; i < sp2.count; i++) { const px = sp2.getX(i), py = sp2.getY(i), pz = sp2.getZ(i), a = Math.atan2(pz, px), k = 1 + (py < 0.2 ? 0.25 * Math.max(0, Math.sin(a * 5)) * (0.2 - py) * 5 : 0) + 0.02 * Math.sin(a * 11); sp2.setXYZ(i, px * k, py, pz * k); }
  st.computeVertexNormals(); B.put(st, M.bark);
  B.put(new THREE.CircleGeometry(0.335, 18), M.ringTop, 0, 0.562, 0, -Math.PI / 2, 0, 0);
  B.put(cyl(0.345, 0.345, 0.06, 18), M.iron, 0, 0.44, 0);
  // the body: a side profile (heel, face, horn; waist and feet below) extruded and bevelled
  const s = new THREE.Shape();
  s.moveTo(-0.3, 0); s.lineTo(0.28, 0); s.lineTo(0.24, 0.05); s.lineTo(0.12, 0.08); s.quadraticCurveTo(0.08, 0.17, 0.12, 0.25); s.lineTo(0.2, 0.27);
  s.quadraticCurveTo(0.42, 0.29, 0.56, 0.36); s.quadraticCurveTo(0.42, 0.37, 0.24, 0.39); s.lineTo(-0.32, 0.39); s.lineTo(-0.36, 0.33); s.lineTo(-0.22, 0.27);
  s.quadraticCurveTo(-0.13, 0.17, -0.16, 0.08); s.lineTo(-0.26, 0.05); s.closePath();
  const body = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2, curveSegments: 8 });
  body.translate(0, 0, -0.09);
  // the horn tapers in plan too: squeeze the far end toward the middle
  const bp = body.attributes.position; for (let i = 0; i < bp.count; i++) { const px = bp.getX(i); if (px > 0.22) bp.setZ(i, bp.getZ(i) * (1 - (px - 0.22) / 0.36 * 0.85)); }
  body.computeVertexNormals();
  B.put(body, M.iron, 0, 0.56, 0);
  B.put(box(0.54, 0.012, 0.2), M.face, -0.05, 0.56 + 0.4 + 0.006, 0); // the bright, worked face
  B.put(box(0.03, 0.02, 0.03), M.plankDark, -0.25, 0.56 + 0.405, 0.04); // the hardy hole, a dark square
  // a hammer resting on the face, tongs against the stump, a quench bucket
  B.put(cyl(0.016, 0.02, 0.42, 6), M.timber, -0.08, 0.56 + 0.43, 0.12, 0, 0.3, Math.PI / 2);
  B.put(box(0.07, 0.07, 0.15), M.iron, -0.08 + Math.cos(0.3) * 0.21, 0.56 + 0.44, 0.12 - Math.sin(0.3) * 0.21, 0, 0.3, 0);
  for (const sx of [-1, 1]) B.put(cyl(0.008, 0.01, 0.62, 5), M.iron, 0.34 + sx * 0.025, 0.31, 0.24, 0.15, 0, -0.32 + sx * 0.05);
  const bucket = new THREE.LatheGeometry([[0, 0], [0.15, 0], [0.18, 0.3], [0.175, 0.3], [0.145, 0.02], [0, 0.02]].map(([r, h]) => new THREE.Vector2(r, h)), 14);
  B.put(bucket, M.plankDark, -0.62, 0, 0.18);
  for (const h of [0.06, 0.24]) B.put(new THREE.TorusGeometry(0.155 + h * 0.1, 0.008, 4, 16), M.iron, -0.62, h, 0.18, Math.PI / 2, 0, 0);
  B.put(new THREE.CircleGeometry(0.165, 14), M.water, -0.62, 0.25, 0.18, -Math.PI / 2, 0, 0);
  return B.finish();
}

export function drillGround() {
  const M = mats(), B = builder();
  // the post: a squared timber, a crossbar with two straw-wrapped arms, the body bound in straw with rope bands
  B.put(box(0.13, 1.85, 0.13), M.timber, 0, 0.92, 0, 0, 0.05, jit(0.02));
  B.put(box(0.36, 0.06, 0.36), M.plankDark, 0, 0.03, 0); B.put(box(0.08, 0.14, 0.4), M.plankDark, 0, 0.1, 0, 0, 0.785, 0); B.put(box(0.08, 0.14, 0.4), M.plankDark, 0, 0.1, 0, 0, -0.785, 0);
  const bundle = new THREE.LatheGeometry([[0, 0], [0.18, 0], [0.23, 0.08], [0.25, 0.3], [0.24, 0.55], [0.2, 0.7], [0, 0.72]].map(([r, h]) => new THREE.Vector2(r, h)), 16), bdp = bundle.attributes.position;
  for (let i = 0; i < bdp.count; i++) { const px = bdp.getX(i), py = bdp.getY(i), pz = bdp.getZ(i), a = Math.atan2(pz, px), k = 1 + 0.06 * Math.sin(a * 13 + py * 3) + 0.03 * Math.sin(a * 29); bdp.setXYZ(i, px * k, py, pz * k); }
  bundle.computeVertexNormals(); B.put(bundle, M.straw, 0, 0.88, 0);
  for (const h of [0.95, 1.18, 1.42]) B.put(new THREE.TorusGeometry(0.245, 0.016, 5, 18), M.rope, 0, h, 0, Math.PI / 2, 0, 0);
  // cut marks: dark slashes across the straw where Nasim's blows land
  for (let i = 0; i < 5; i++) B.put(box(0.16, 0.012, 0.02), M.strawDark, Math.sin(i * 0.5 - 1) * 0.24, 1.05 + i * 0.07, Math.cos(i * 0.5 - 1) * 0.24, 0, i * 0.5 - 1, 0.5 - (i % 2) * 0.9);
  // straw tufts poking out at the top and bottom of the bundle
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28, top = i % 2; B.put(new THREE.ConeGeometry(0.02, 0.14, 3), M.straw, Math.cos(a) * 0.2, top ? 1.6 : 0.88, Math.sin(a) * 0.2, top ? Math.sin(a) * 0.6 : Math.PI + Math.sin(a) * 0.6, 0, top ? -Math.cos(a) * 0.6 : Math.cos(a) * 0.6); }
  B.put(box(0.9, 0.07, 0.07), M.timber, 0, 1.62, 0);
  for (const sx of [-1, 1]) { B.put(cyl(0.07, 0.07, 0.24, 8), M.straw, sx * 0.36, 1.62, 0, 0, 0, Math.PI / 2); B.put(new THREE.TorusGeometry(0.072, 0.01, 4, 10), M.rope, sx * 0.36, 1.62, 0, 0, Math.PI / 2, 0); }
  // the rack: two A-frames joined by a notched rail, five blunted practice spears and two wooden swords leaning in it
  const RX = 1.35, RZ = -0.35;
  for (const sx of [-0.55, 0.55]) { for (const lean of [-0.28, 0.28]) B.put(box(0.06, 1.15, 0.06), M.plankDark, RX + sx, 0.55, RZ + lean * 0.6, lean, 0, 0); B.put(box(0.05, 0.05, 0.4), M.plankDark, RX + sx, 0.28, RZ); }
  B.put(box(1.2, 0.07, 0.07), M.plankDark, RX, 1.08, RZ); B.put(box(1.2, 0.05, 0.05), M.plankDark, RX, 0.3, RZ + 0.18);
  for (let i = 0; i < 5; i++) { const x = RX - 0.44 + i * 0.22, tilt = -0.2 + jit(0.06);
    B.put(cyl(0.018, 0.022, 2.0, 6), M.timber, x, 1.0, RZ + 0.1, tilt, 0, jit(0.05));
    B.put(new THREE.SphereGeometry(0.045, 8, 6), M.leather, x, 1.0 + Math.cos(tilt) * 1.0, RZ + 0.1 - Math.sin(tilt) * 1.0); // the leather-padded blunt
    B.put(cyl(0.026, 0.026, 0.14, 6), M.rope, x, 1.0 + Math.cos(tilt) * 0.86, RZ + 0.1 - Math.sin(tilt) * 0.86, tilt, 0, 0); }
  for (let i = 0; i < 2; i++) { const x = RX + 0.3 + i * 0.16; B.put(box(0.05, 0.85, 0.015), M.timber, x, 0.46, RZ + 0.28, -0.18, 0, 0.05); B.put(box(0.16, 0.025, 0.04), M.plankDark, x, 0.72, RZ + 0.23, -0.18, 0, 0.05); }
  return B.finish();
}
