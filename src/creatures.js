import * as THREE from 'three';
import { sculpt, capsule, ellipsoid, V } from './sculpt.js';
import { charMaterial, defaultPalette, R } from './charmats.js';
import { cachedGeo } from './geocache.js';
import { QUALITY } from './graphics.js';

// ---------------------------------------------------------------- dromedary (SDF-sculpted, skinned)
// Same pipeline as the humanoids: smooth-union primitives meshed with surface nets, each primitive owning the
// vertices it generated. Model space: feet at y=0, facing +X, left side is +Z. One sculpt is shared by every camel;
// the coat colour and saddle cloth come from the palette.
const LEGS = [['FL', 0.78, 0.3], ['FR', 0.78, -0.3], ['HL', -0.78, 0.3], ['HR', -0.78, -0.3]];
function camelBones() {
  const d = [['body', null, 0, 1.9, 0], ['neck', 'body', 1.05, 0.1, 0], ['neck2', 'neck', 0.6, -0.05, 0], ['head', 'neck2', 0.22, 1.15, 0], ['tail', 'body', -1.2, -0.05, 0]];
  for (const [n, x, z] of LEGS) d.push(['thigh' + n, 'body', x, -0.25, z], ['shin' + n, 'thigh' + n, 0, -0.8, 0], ['foot' + n, 'shin' + n, 0, -0.78, 0]);
  return d;
}
let _B = null;
function bind() {
  if (_B) return _B;
  const defs = camelBones(), world = {}, idx = {};
  defs.forEach(([n, p, x, y, z], i) => { const w = V(x, y, z); if (p) w.add(world[p]); world[n] = w; idx[n] = i; });
  return (_B = { defs, world, idx });
}
function camelPrims(B) {
  const b = B.idx, W = B.world, P = [];
  const own = (bone, mat = R.FELT, extra = {}) => Object.assign({ bone: b[bone], mat }, extra);
  // barrel, chest, belly, hump (the hump is a single rounded dome sitting a little behind the withers)
  P.push(ellipsoid(V(0, 1.92, 0), V(1.12, 0.56, 0.5), null, own('body', R.FELT, { k: 0.18 })));
  P.push(ellipsoid(V(0.72, 1.86, 0), V(0.55, 0.55, 0.46), null, own('body', R.FELT, { k: 0.2 })));
  P.push(ellipsoid(V(-0.12, 1.66, 0), V(0.85, 0.36, 0.45), null, own('body', R.FELT, { k: 0.2 })));
  P.push(ellipsoid(V(-0.05, 2.38, 0), V(0.62, 0.46, 0.4), null, own('body', R.FELT, { k: 0.3 })));
  P.push(ellipsoid(V(-0.82, 1.98, 0), V(0.42, 0.42, 0.42), null, own('body', R.FELT, { k: 0.15 })));
  // shoulders and haunches carry the legs into the body
  for (const s of [1, -1]) {
    P.push(ellipsoid(V(0.8, 1.55, s * 0.27), V(0.26, 0.55, 0.18), null, own('thigh' + (s > 0 ? 'FL' : 'FR'), R.FELT, { k: 0.14, blend: 0.08 })));
    P.push(ellipsoid(V(-0.78, 1.45, s * 0.27), V(0.32, 0.62, 0.2), null, own('thigh' + (s > 0 ? 'HL' : 'HR'), R.FELT, { k: 0.14, blend: 0.08 })));
  }
  // neck: dips forward then rises in the characteristic S curve
  const n0 = W.neck, n1 = W.neck2, hd = W.head;
  P.push(capsule(V(n0.x - 0.15, n0.y + 0.05, 0), V(n1.x, n1.y - 0.05, 0), 0.26, 0.16, own('neck', R.FELT, { k: 0.12 })));
  P.push(capsule(V(n1.x, n1.y - 0.05, 0), V(n1.x + 0.14, n1.y + 0.6, 0), 0.16, 0.13, own('neck2', R.FELT, { k: 0.06 })));
  P.push(capsule(V(n1.x + 0.14, n1.y + 0.6, 0), V(hd.x - 0.02, hd.y - 0.02, 0), 0.13, 0.12, own('neck2', R.FELT, { k: 0.06 })));
  // head: long skull, drooping lip, small ears, heavy-lidded eyes
  P.push(ellipsoid(V(hd.x + 0.12, hd.y + 0.05, 0), V(0.24, 0.14, 0.13), null, own('head', R.FELT, { k: 0.06 })));
  P.push(capsule(V(hd.x + 0.2, hd.y + 0.02, 0), V(hd.x + 0.46, hd.y - 0.04, 0), 0.1, 0.08, own('head', R.FELT, { k: 0.05 })));
  P.push(ellipsoid(V(hd.x + 0.47, hd.y - 0.1, 0), V(0.07, 0.035, 0.065), null, own('head', R.LIPS, { k: 0.03 })));
  for (const s of [1, -1]) {
    P.push(ellipsoid(V(hd.x - 0.02, hd.y + 0.17, s * 0.1), V(0.035, 0.06, 0.025), new THREE.Euler(s * 0.5, 0, 0.3), own('head', R.FELT, { k: 0.02 })));
    P.push(ellipsoid(V(hd.x + 0.2, hd.y + 0.1, s * 0.105), V(0.03, 0.022, 0.02), null, own('head', R.MOUTH, { k: 0.008 })));
    P.push(ellipsoid(V(hd.x + 0.2, hd.y + 0.125, s * 0.1), V(0.05, 0.02, 0.03), null, own('head', R.FELT, { k: 0.015 })));
  }
  // legs: long thighs, knobbly knees with callus pads, slim cannons, broad soft feet
  for (const [n, x, z] of LEGS) {
    const top = V(x, 1.65, z), knee = V(x, 0.86, z), ank = V(x, 0.08, z), hind = x < 0;
    P.push(capsule(top, V(x + (hind ? -0.05 : 0.02), knee.y, z), hind ? 0.2 : 0.16, 0.08, own('thigh' + n, R.FELT, { k: 0.05 })));
    P.push(ellipsoid(V(x, knee.y - 0.02, z), V(0.085, 0.1, 0.08), null, own('shin' + n, R.LEATHER, { k: 0.04 })));
    P.push(capsule(V(x, knee.y - 0.04, z), ank, 0.06, 0.055, own('shin' + n, R.FELT, { k: 0.03 })));
    P.push(ellipsoid(V(x + 0.05, 0.06, z), V(0.17, 0.07, 0.14), null, own('foot' + n, R.DARK, { k: 0.04 })));
  }
  // tail with a dark tuft
  const tl = W.tail;
  P.push(capsule(V(tl.x, tl.y, 0), V(tl.x - 0.12, tl.y - 0.5, 0), 0.05, 0.03, own('tail', R.FELT, { k: 0.04 })));
  P.push(ellipsoid(V(tl.x - 0.14, tl.y - 0.6, 0), V(0.04, 0.1, 0.04), null, own('tail', R.HAIR, { k: 0.03 })));
  return P;
}
// saddle cloth over the hump, with a woven border and a girth strap behind the forelegs
function camelPaint(x, y, z, dom) {
  if (!dom || dom.mat !== R.FELT || dom.bone !== 0) return null;
  const rx = (x + 0.05) / 0.72, rz = z / 0.62, r = Math.hypot(rx, rz);
  if (y > 1.95 && r < 1) return r > 0.86 ? R.CLOTH2 : R.SASH;
  if (Math.abs(x - 0.42) < 0.055 && y > 1.45) return R.LEATHER;
  return null;
}
const _geo = new Map();
function camelGeo(tier) {
  const k = 'camel2|' + tier + '|' + QUALITY;
  if (!_geo.has(k)) _geo.set(k, cachedGeo(k, () => sculpt(camelPrims(bind()), { voxel: tier === 'hi' ? 0.022 : 0.034, blend: 0.05, pad: 0.05, paint: camelPaint })));
  return _geo.get(k);
}

export function camel(color = 0xb88a58, saddle = null) {
  const B = bind();
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const bones = {}, list = [];
  for (const [n, p, x, y, z] of B.defs) { const bn = new THREE.Bone(); bn.name = n; bn.position.set(x, y, z); (p ? bones[p] : body).add(bn); bones[n] = bn; list.push(bn); }
  body.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(list, B.defs.map(([n]) => new THREE.Matrix4().makeTranslation(-B.world[n].x, -B.world[n].y, -B.world[n].z)));
  const pal = defaultPalette(), C = (c) => new THREE.Color(c);
  pal[R.FELT].c = C(color); pal[R.FELT].r = 0.97;
  pal[R.LIPS].c = C(color).multiplyScalar(0.7);
  pal[R.LEATHER].c = C(color).multiplyScalar(0.55);
  pal[R.DARK].c = C(0x3a2a1c);
  pal[R.HAIR].c = C(color).multiplyScalar(0.35);
  pal[R.SASH].c = C(saddle ?? [0x7a1c24, 0x1f3f5c, 0x5c3a18][Math.floor(Math.abs(color) % 3)]);
  pal[R.CLOTH2].c = C(0xc9a24a);
  const mat = charMaterial(pal);
  const m = new THREE.SkinnedMesh(camelGeo(QUALITY === 'low' ? 'lo' : 'hi'), mat); m.bind(skeleton, new THREE.Matrix4());
  m.castShadow = true; m.receiveShadow = true; m.boundingSphere = new THREE.Sphere(V(0.3, 1.6, 0), 2.4); m.frustumCulled = true;
  body.add(m);
  const legs = LEGS.map(([n, x, z]) => ({ th: bones['thigh' + n], sh: bones['shin' + n], ft: bones['foot' + n], front: x > 0, side: z > 0 ? 1 : -1 }));
  root.userData.parts = { legs, neck: bones.neck, neck2: bones.neck2, head: bones.head, tail: bones.tail, body: bones.body, mat, mesh: m };
  return root;
}

// Walk: a pace (both legs on one side move together, as camels do), with a body roll toward the planted side.
export function animateCamel(rig, st, t) {
  const p = rig.userData.parts, w = st.walkBlend || 0;
  for (const L of p.legs) {
    const ph = st.phase + (L.side > 0 ? 0 : Math.PI) + (L.front ? 0.35 : 0);
    L.th.rotation.z = Math.sin(ph) * 0.28 * w;
    L.sh.rotation.z = -Math.max(0, -Math.sin(ph - 0.6)) * 0.5 * w;
    if (L.ft) L.ft.rotation.z = -L.th.rotation.z - L.sh.rotation.z * 0.6;
  }
  if (p.body) { p.body.rotation.x = Math.sin(st.phase) * 0.05 * w; p.body.position.y = 1.9 + Math.abs(Math.cos(st.phase)) * 0.04 * w; }
  const graze = (st.graze ? 1 : 0) * (0.5 + 0.5 * Math.sin(t * 0.3 + st.seed));
  p.neck.rotation.z = Math.sin(t * 0.8 + st.seed) * 0.06 - graze * 0.7 - w * 0.08;
  if (p.neck2) p.neck2.rotation.z = -graze * 0.55 + Math.sin(st.phase * 2) * 0.05 * w;
  if (p.head) p.head.rotation.z = graze * 0.9 + Math.sin(t * 1.3 + st.seed) * 0.05;
  if (p.tail) p.tail.rotation.x = Math.sin(t * 2.1 + st.seed) * 0.25;
}

// ---------------------------------------------------------------- water buffalo (Round 16, the marshes)
// Heavy, low and slate-black, with broad horns swept back in a crescent-free flat curve over the neck and the
// head carried low on a short thick neck. Same sculpt/skin pipeline as the camel; model space faces +X.
const BLEGS = [['FL', 0.62, 0.27], ['FR', 0.62, -0.27], ['HL', -0.66, 0.27], ['HR', -0.66, -0.27]];
let _BB = null;
function bBind() {
  if (_BB) return _BB;
  const d = [['body', null, 0, 1.2, 0], ['neck', 'body', 0.85, 0.05, 0], ['head', 'neck', 0.42, -0.12, 0], ['tail', 'body', -0.98, 0.1, 0]];
  for (const [n, x, z] of BLEGS) d.push(['thigh' + n, 'body', x, -0.18, z], ['shin' + n, 'thigh' + n, 0, -0.5, 0], ['foot' + n, 'shin' + n, 0, -0.46, 0]);
  const world = {}, idx = {};
  d.forEach(([n, p, x, y, z], i) => { const w = V(x, y, z); if (p) w.add(world[p]); world[n] = w; idx[n] = i; });
  return (_BB = { defs: d, world, idx });
}
function buffaloPrims(B) {
  const b = B.idx, W = B.world, P = [];
  const own = (bone, mat = R.FELT, extra = {}) => Object.assign({ bone: b[bone], mat }, extra);
  // deep barrel, heavy shoulders, sloping rump
  P.push(ellipsoid(V(0, 1.22, 0), V(1.0, 0.5, 0.52), null, own('body', R.FELT, { k: 0.2 })));
  P.push(ellipsoid(V(0.55, 1.3, 0), V(0.5, 0.52, 0.5), null, own('body', R.FELT, { k: 0.22 })));
  P.push(ellipsoid(V(-0.62, 1.22, 0), V(0.45, 0.46, 0.46), null, own('body', R.FELT, { k: 0.18 })));
  P.push(ellipsoid(V(0, 0.92, 0), V(0.72, 0.28, 0.4), null, own('body', R.FELT, { k: 0.2 })));
  for (const s of [1, -1]) {
    P.push(ellipsoid(V(0.62, 1.0, s * 0.26), V(0.22, 0.4, 0.17), null, own('thigh' + (s > 0 ? 'FL' : 'FR'), R.FELT, { k: 0.12, blend: 0.07 })));
    P.push(ellipsoid(V(-0.66, 1.0, s * 0.26), V(0.28, 0.42, 0.18), null, own('thigh' + (s > 0 ? 'HL' : 'HR'), R.FELT, { k: 0.12, blend: 0.07 })));
  }
  // short thick neck with a dewlap, head carried low
  const n0 = W.neck, hd = W.head;
  P.push(capsule(V(n0.x - 0.2, n0.y + 0.1, 0), V(hd.x - 0.08, hd.y + 0.05, 0), 0.34, 0.24, own('neck', R.FELT, { k: 0.14 })));
  P.push(ellipsoid(V(n0.x + 0.05, n0.y - 0.28, 0), V(0.22, 0.18, 0.12), null, own('neck', R.FELT, { k: 0.1 })));
  P.push(ellipsoid(V(hd.x + 0.1, hd.y, 0), V(0.26, 0.2, 0.19), null, own('head', R.FELT, { k: 0.08 })));
  P.push(capsule(V(hd.x + 0.18, hd.y - 0.06, 0), V(hd.x + 0.42, hd.y - 0.18, 0), 0.14, 0.12, own('head', R.FELT, { k: 0.06 })));
  P.push(ellipsoid(V(hd.x + 0.47, hd.y - 0.22, 0), V(0.07, 0.08, 0.12), null, own('head', R.FELT, { k: 0.03 })));
  for (const s of [1, -1]) {
    // horns: thick at the base, sweeping out and back along the neck
    P.push(capsule(V(hd.x + 0.02, hd.y + 0.16, s * 0.12), V(hd.x - 0.12, hd.y + 0.2, s * 0.42), 0.075, 0.055, own('head', R.SASH, { k: 0.03 })));
    P.push(capsule(V(hd.x - 0.12, hd.y + 0.2, s * 0.42), V(hd.x - 0.42, hd.y + 0.16, s * 0.5), 0.055, 0.025, own('head', R.SASH, { k: 0.02 })));
    P.push(ellipsoid(V(hd.x + 0.02, hd.y + 0.06, s * 0.2), V(0.1, 0.04, 0.07), new THREE.Euler(s * 0.3, 0, -0.2), own('head', R.FELT, { k: 0.02 })));
    P.push(ellipsoid(V(hd.x + 0.22, hd.y + 0.05, s * 0.135), V(0.025, 0.02, 0.018), null, own('head', R.MOUTH, { k: 0.008 })));
  }
  for (const [n, x, z] of BLEGS) {
    const top = V(x, 1.05, z), knee = V(x, 0.52, z), ank = V(x, 0.07, z), hind = x < 0;
    P.push(capsule(top, V(x + (hind ? -0.04 : 0.02), knee.y, z), hind ? 0.17 : 0.15, 0.09, own('thigh' + n, R.FELT, { k: 0.05 })));
    P.push(capsule(V(x, knee.y, z), ank, 0.085, 0.07, own('shin' + n, R.FELT, { k: 0.04 })));
    P.push(ellipsoid(V(x + 0.04, 0.06, z), V(0.11, 0.065, 0.1), null, own('foot' + n, R.WRAP, { k: 0.03 })));
  }
  const tl = W.tail;
  P.push(capsule(V(tl.x, tl.y, 0), V(tl.x - 0.06, tl.y - 0.62, 0), 0.045, 0.03, own('tail', R.FELT, { k: 0.04 })));
  P.push(ellipsoid(V(tl.x - 0.07, tl.y - 0.72, 0), V(0.04, 0.1, 0.04), null, own('tail', R.WRAP, { k: 0.03 })));
  return P;
}
// a dried-mud coat on the legs and belly, where they wallow
function buffaloPaint(x, y, z, dom) {
  if (!dom || dom.mat !== R.FELT) return null;
  return y < 0.42 ? R.WRAP : null;
}
function buffaloGeo(tier) {
  const k = 'buffalo3|' + tier + '|' + QUALITY;
  if (!_geo.has(k)) _geo.set(k, cachedGeo(k, () => sculpt(buffaloPrims(bBind()), { voxel: tier === 'hi' ? 0.022 : 0.034, blend: 0.05, pad: 0.05, paint: buffaloPaint })));
  return _geo.get(k);
}
export function buffalo(color = 0x2c2a2a) {
  const B = bBind();
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const bones = {}, list = [];
  for (const [n, p, x, y, z] of B.defs) { const bn = new THREE.Bone(); bn.name = n; bn.position.set(x, y, z); (p ? bones[p] : body).add(bn); bones[n] = bn; list.push(bn); }
  body.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(list, B.defs.map(([n]) => new THREE.Matrix4().makeTranslation(-B.world[n].x, -B.world[n].y, -B.world[n].z)));
  const pal = defaultPalette(), C = (c) => new THREE.Color(c);
  pal[R.FELT].c = C(color); pal[R.FELT].r = 0.72;
  // material ids interpolate across the mesh, so only neighbouring ids (10 horn, 11 hide, 12 mud) meet
  pal[R.SASH].c = C(0x4a4642); pal[R.SASH].r = 0.5; pal[R.SASH].k = 3;
  pal[R.WRAP].c = C(0x2e2822); pal[R.WRAP].r = 0.95; pal[R.WRAP].k = 7;
  const mat = charMaterial(pal);
  const m = new THREE.SkinnedMesh(buffaloGeo(QUALITY === 'low' ? 'lo' : 'hi'), mat); m.bind(skeleton, new THREE.Matrix4());
  m.castShadow = true; m.receiveShadow = true; m.boundingSphere = new THREE.Sphere(V(0.2, 1.0, 0), 1.9); m.frustumCulled = true;
  body.add(m);
  const legs = BLEGS.map(([n, x, z]) => ({ th: bones['thigh' + n], sh: bones['shin' + n], ft: bones['foot' + n], front: x > 0, side: z > 0 ? 1 : -1 }));
  root.userData.parts = { legs, neck: bones.neck, head: bones.head, tail: bones.tail, body: bones.body, mat, mesh: m, buffalo: true };
  return root;
}
// walk: a diagonal gait (unlike the camel's pace), head nodding with each step
export function animateBuffalo(rig, st, t) {
  const p = rig.userData.parts, w = st.walkBlend || 0;
  for (const L of p.legs) {
    const ph = st.phase + ((L.side > 0) === L.front ? 0 : Math.PI);
    L.th.rotation.z = Math.sin(ph) * 0.3 * w;
    L.sh.rotation.z = -Math.max(0, -Math.sin(ph - 0.6)) * 0.55 * w;
    L.ft.rotation.z = -L.th.rotation.z - L.sh.rotation.z * 0.6;
  }
  p.body.position.y = 1.2 + Math.abs(Math.sin(st.phase)) * 0.025 * w;
  const graze = (st.graze ? 1 : 0) * (0.5 + 0.5 * Math.sin(t * 0.25 + st.seed));
  p.neck.rotation.z = -0.12 - graze * 0.55 + Math.sin(st.phase * 2) * 0.05 * w + Math.sin(t * 0.7 + st.seed) * 0.04;
  p.head.rotation.z = graze * 0.3 + Math.sin(t * 1.1 + st.seed) * 0.05;
  p.head.rotation.x = Math.sin(t * 0.5 + st.seed) * 0.08;
  p.tail.rotation.x = Math.sin(t * 2.4 + st.seed) * 0.35;
}
