import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mats } from './buildings.js';
import { rmats } from './regionprops.js';
import { fabricTex } from './textures.js';

// Round 20 set dressing for Act VI, the river quays of al-Karkh on the Tigris: the cut-stone quay with its
// bollards and water stairs, timber jetties, river barges, a boatyard's hulls on the slip, shear-leg cranes,
// bales and pitch cauldrons, and the bridge of boats (cut in the middle by Ghanim's men).

function mesh(g, m, cast = true) { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; return o; }
let DM = null;
function dmats() {
  if (DM) return DM;
  DM = {
    plank: new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.9 }),
    wet: new THREE.MeshStandardMaterial({ color: 0x3a3228, roughness: 0.6 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x9a8058, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x2a2624, metalness: 0.8, roughness: 0.5 }),
    pitch: new THREE.MeshStandardMaterial({ color: 0x0c0a08, roughness: 0.25 }),
    bales: ['#8a6a40', '#a88a5a', '#6a4a30', '#c8b088'].map((c, i) => new THREE.MeshStandardMaterial({ map: fabricTex(c, ['#5a3a20', '#7a2a1a', '#2a3a4a', '#6a5a3a'][i], false), roughness: 0.95 })),
    sail: new THREE.MeshStandardMaterial({ map: fabricTex('#d8c8a8', '#8a5a3a', 'hem'), roughness: 0.9, side: THREE.DoubleSide }),
  };
  return DM;
}

// a 10 m stretch of the stone quay wall, from the river bed up to the paving, with a coping and two bollards
export function quayWall(len = 10, stairs = false) {
  const m = mats(), D = dmats(), g = new THREE.Group(), geos = [];
  geos.push(new THREE.BoxGeometry(len, 3.6, 1.6).translate(0, -1.6, 0));
  geos.push(new THREE.BoxGeometry(len + 0.05, 0.28, 1.9).translate(0, 0.28, 0.12));
  if (stairs) for (let i = 0; i < 7; i++) geos.push(new THREE.BoxGeometry(2.4, 0.42, 0.55).translate(0, -0.1 - i * 0.42, 1.0 + i * 0.5));
  g.add(mesh(mergeGeometries(geos), m.stone));
  for (const x of [-len / 2 + 2, len / 2 - 2]) g.add(mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.6, 8).translate(x, 0.6, 0.6), D.wet));
  // a green-black tide line along the foot of the wall
  g.add(mesh(new THREE.BoxGeometry(len, 0.6, 0.02).translate(0, -0.6, 0.81), D.wet, false));
  return g;
}
// a plank jetty out over the river on posts (decks are walkable: terrain.js DECKS)
export function jetty(len = 14, w = 3.2) {
  const D = dmats(), g = new THREE.Group(), geos = [], posts = [];
  for (let x = 0; x < len; x += 0.5) geos.push(new THREE.BoxGeometry(0.46, 0.1, w).translate(x + 0.25, 0.2, 0));
  geos.push(new THREE.BoxGeometry(len, 0.2, 0.2).translate(len / 2, 0.06, -w / 2 + 0.2), new THREE.BoxGeometry(len, 0.2, 0.2).translate(len / 2, 0.06, w / 2 - 0.2));
  for (let x = 1; x <= len; x += 3) for (const s of [-1, 1]) posts.push(new THREE.CylinderGeometry(0.12, 0.14, 4.2, 6).translate(x, -1.8, s * (w / 2 - 0.15)));
  for (let x = 1; x <= len; x += 3) for (const s of [-1, 1]) posts.push(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 5).translate(x, 0.7, s * (w / 2 - 0.15)));
  g.add(mesh(mergeGeometries(geos), D.plank)); g.add(mesh(mergeGeometries(posts), D.wet));
  for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, len - 1, 4).rotateZ(Math.PI / 2).translate(len / 2 + 0.5, 1.15, s * (w / 2 - 0.15)), D.rope, false));
  return g;
}
// a river barge: a broad pitched hull with a reed-roofed cabin aft and bales amidships
export function barge(rnd, len = 10) {
  const R = rmats(), D = dmats(), pos = [], idx = [], N = 24, M = 8, W = 1.4;
  for (let i = 0; i <= N; i++) {
    const t = i / N * 2 - 1, half = W * Math.sqrt(Math.max(0, 1 - t * t * t * t)) + 0.04, depth = 0.9 * Math.sqrt(Math.max(0, 1 - t ** 6)), lift = t ** 4 * 0.7;
    for (let j = 0; j <= M; j++) { const a = Math.PI * j / M; pos.push(Math.cos(a) * half, lift + 0.6 - Math.sin(a) * depth, t * len / 2); }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const g = new THREE.Group(); g.add(mesh(geo, R.bitumen));
  g.add(mesh(new THREE.BoxGeometry(W * 1.6, 0.08, len * 0.8).translate(0, 0.32, 0), D.plank));
  // cabin aft
  g.add(mesh(new THREE.BoxGeometry(1.8, 1.2, 2.2).translate(0, 0.95, -len * 0.28), D.plank));
  const roof = mesh(new THREE.CylinderGeometry(1.15, 1.15, 2.5, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, 1.55, -len * 0.28), R.reedMat); g.add(roof);
  for (let i = 0; i < 4 + Math.floor(rnd() * 4); i++) g.add(mesh(new THREE.BoxGeometry(0.7, 0.55, 0.9).translate((i % 2 - 0.5) * 0.8, 0.62 + Math.floor(i / 4) * 0.55, -0.4 + (Math.floor(i / 2) % 2) * 1.0 + len * 0.05), D.bales[i % 4]));
  // a steering oar and a short mast with its sail furled on the yard
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 3.4).rotateX(-0.35).translate(0.5, 0.8, -len / 2 - 0.6), D.plank));
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 5, 6).translate(0, 2.7, len * 0.15), D.plank));
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.6, 8).rotateZ(Math.PI / 2).translate(0, 4.6, len * 0.15), D.sail));
  return g;
}
// a hull being built on the slip: keel, stem and sternposts, ribs, a few strakes, the stands that hold it up
export function boatFrame(len = 11) {
  const D = dmats(), g = new THREE.Group(), geos = [], ribs = [];
  geos.push(new THREE.BoxGeometry(0.22, 0.26, len).translate(0, 0.55, 0));
  geos.push(new THREE.BoxGeometry(0.2, 2.0, 0.22).rotateX(0.35).translate(0, 1.4, len / 2 + 0.2), new THREE.BoxGeometry(0.2, 1.8, 0.22).rotateX(-0.3).translate(0, 1.3, -len / 2 - 0.2));
  for (let z = -len / 2 + 1; z <= len / 2 - 1; z += 0.9) { const k = 1 - Math.pow(Math.abs(z) / (len / 2), 2); const r = 0.6 + 1.0 * k; ribs.push(new THREE.TorusGeometry(r, 0.06, 4, 10, Math.PI).rotateZ(Math.PI).translate(0, 0.6 + r, z)); }
  for (const s of [-1, 1]) for (let h = 0; h < 3; h++) geos.push(new THREE.BoxGeometry(0.08, 0.18, len * 0.82).translate(s * (1.0 + h * 0.18), 0.85 + h * 0.3, 0));
  for (const z of [-len / 3, 0, len / 3]) for (const s of [-1, 1]) geos.push(new THREE.BoxGeometry(0.16, 1.2, 0.16).rotateZ(s * 0.5).translate(s * 1.3, 0.6, z));
  g.add(mesh(mergeGeometries(geos), D.plank)); g.add(mesh(mergeGeometries(ribs), D.plank));
  return g;
}
// shear-legs: two poles leaning out over the water, a rope and a slung bale
export function crane() {
  const D = dmats(), g = new THREE.Group();
  for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.12, 0.15, 7.5, 6).translate(0, 3.75, 0).rotateX(0.38).rotateZ(s * 0.18).translate(s * 0.9, 0, 0), D.plank));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.5, 4).translate(0, 4.2, 2.75), D.rope, false));
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.7, 1.1).translate(0, 1.8, 2.75), D.bales[1]));
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.4, 8).rotateZ(Math.PI / 2).translate(0, 0.5, -1.4), D.plank)); // the windlass
  return g;
}
export function baleStack(rnd) {
  const D = dmats(), g = new THREE.Group();
  for (let i = 0; i < 5 + Math.floor(rnd() * 5); i++) { const lv = i < 5 ? 0 : 1; const o = mesh(new THREE.BoxGeometry(0.9, 0.62, 1.2), D.bales[Math.floor(rnd() * 4)]); o.position.set((i % 3 - 1) * 0.95 + (rnd() - 0.5) * 0.1, 0.31 + lv * 0.62, (Math.floor(i / 3) % 2) * 1.25 - 0.6); o.rotation.y = (rnd() - 0.5) * 0.15; g.add(o); }
  g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 1.5, hd: 1.3 }];
  return g;
}
// a cauldron of pitch for caulking hulls, on a ring of stones
export function cauldron() {
  const D = dmats(), m = mats(), g = new THREE.Group();
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; g.add(mesh(new THREE.DodecahedronGeometry(0.22, 0).translate(Math.cos(a) * 0.75, 0.15, Math.sin(a) * 0.75), m.stone)); }
  g.add(mesh(new THREE.CylinderGeometry(0.6, 0.45, 0.7, 12, 1, true).translate(0, 0.75, 0), D.iron));
  g.add(mesh(new THREE.CircleGeometry(0.56, 12).rotateX(-Math.PI / 2).translate(0, 1.0, 0), D.pitch));
  g.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 0.95 }];
  return g;
}
// the bridge of boats: barges moored side by side across the river under a plank road. Ghanim's men cut it:
// boats between gap0 and gap1 (fractions of the span) are gone, their burned stubs low in the water.
export function boatBridge(span, gap0 = 0.35, gap1 = 0.55) {
  const R = rmats(), D = dmats(), g = new THREE.Group(), deck = [], hulls = [], stubs = [];
  const n = Math.round(span / 3.2);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = t * span; if (t > gap0 && t < gap1) { if (i % 2) stubs.push(new THREE.BoxGeometry(1.6, 0.4, 2.6).rotateZ(0.4).translate(x, -0.6, (i % 3 - 1) * 1.5)); continue; }
    hulls.push(new THREE.CylinderGeometry(1.1, 1.1, 6.4, 10, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(x, -0.25, 0));
    deck.push(new THREE.BoxGeometry(3.25, 0.16, 4).translate(x, 0.32, 0));
  }
  for (const s of [-1, 1]) for (const [a, b] of [[0, gap0], [gap1, 1]]) deck.push(new THREE.BoxGeometry(span * (b - a), 0.12, 0.12).translate(span * (a + b) / 2, 1.1, s * 1.9));
  g.add(mesh(mergeGeometries(hulls), R.bitumen)); g.add(mesh(mergeGeometries(deck), D.plank));
  if (stubs.length) g.add(mesh(mergeGeometries(stubs), R.char));
  return g;
}
