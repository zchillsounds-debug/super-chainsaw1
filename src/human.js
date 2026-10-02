import { cachedGeo } from './geocache.js';
import * as THREE from 'three';
import { sculpt, capsule, ellipsoid, torus, halfspace, V } from './sculpt.js';
import { charMaterial, defaultPalette, R, eyeTexture, blobTexture } from './charmats.js';
import { Cloth, Jiggle, addWrinkles } from './cloth.js';
import { fabricTex } from './textures.js';
import { sword, dagger, torch, spear, bow, shield, addRim } from './characters.js';
import { QUALITY } from './graphics.js';
import { Animator } from './anim.js';

const LOW = QUALITY === 'low';

// ---------------------------------------------------------------- skeleton
// [name, parent, x, y, z, bindRotZ]. Model space: feet at y=0, facing +Z, character's right is +X.
// Arms are bound in a relaxed A-pose so the arm and torso surfaces stay apart for clean skinning.
function boneDefs(b) {
  const d = [
    ['hips', null, 0, 1.0, 0], ['spine', 'hips', 0, 0.07, 0], ['chest', 'spine', 0, 0.18, 0], ['upperChest', 'chest', 0, 0.17, 0],
    ['neck', 'upperChest', 0, 0.14, -0.005], ['head', 'neck', 0, 0.09, 0.015], ['jaw', 'head', 0, 0.072 * HS, 0.008 * HS], ['brow', 'head', 0, 0.118 * HS, 0.07 * HS], ['beard', 'jaw', 0, -0.075 * HS, 0.06 * HS],
  ];
  for (const [S, s] of [['L', -1], ['R', 1]]) {
    d.push(['clav' + S, 'upperChest', s * 0.025, 0.095, 0], ['arm' + S, 'clav' + S, s * 0.155 * b, -0.015, -0.01, s * 0.35], ['fore' + S, 'arm' + S, 0, -0.29, 0], ['hand' + S, 'fore' + S, 0, -0.255, 0]);
    d.push(['thigh' + S, 'hips', s * 0.095, -0.05, 0], ['shin' + S, 'thigh' + S, 0, -0.44, 0], ['foot' + S, 'shin' + S, 0, -0.43, 0], ['toe' + S, 'foot' + S, 0, -0.06, 0.12]);
  }
  return d;
}
const _bind = new Map();
function bindData(b) {
  const key = b.toFixed(3);
  if (_bind.has(key)) return _bind.get(key);
  const defs = boneDefs(b), mats = {}, idx = {};
  defs.forEach(([n, p, x, y, z, rz = 0], i) => {
    const m = new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rz)), V(1, 1, 1));
    mats[n] = p ? mats[p].clone().multiply(m) : m; idx[n] = i;
  });
  const inv = defs.map(([n]) => mats[n].clone().invert());
  const r = { defs, mats, idx, inv };
  _bind.set(key, r);
  return r;
}
function makeSkeleton(B) {
  const bones = {}, list = [];
  for (const [n, p, x, y, z, rz = 0] of B.defs) {
    const bone = new THREE.Bone(); bone.name = n; bone.position.set(x, y, z); bone.rotation.set(0, 0, rz);
    bone.userData.bindPos = bone.position.clone(); bone.userData.bindRot = new THREE.Euler(0, 0, rz); bone.userData.bindWorld = B.mats[n];
    if (p) bones[p].add(bone);
    bones[n] = bone; list.push(bone);
  }
  return { bones, skeleton: new THREE.Skeleton(list, B.inv.map((m) => m.clone())) };
}

// ---------------------------------------------------------------- sculpted pieces
const HS = 1.1; // head scale: slightly heroic proportions read better from the overhead camera
function helpers(B, sc = 1) {
  const P = (bn, [x, y, z]) => V(x * sc, y * sc, z * sc).applyMatrix4(B.mats[bn]);
  const Q = (bn, r) => { const q = new THREE.Quaternion().setFromRotationMatrix(B.mats[bn]); if (r) q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...r))); return q; };
  return {
    cap: (bn, a, b, r1, r2, o = {}) => capsule(P(bn, a), P(bn, b), r1 * sc, r2 * sc, { bone: B.idx[bn], ...o }),
    ell: (bn, c, r, rot, o = {}) => ellipsoid(P(bn, c), V(...r).multiplyScalar(sc), Q(bn, rot), { bone: B.idx[bn], ...o }),
    tor: (bn, c, Rr, r, rot, o = {}, sy = 1) => torus(P(bn, c), Rr * sc, r * sc, Q(bn, rot), { bone: B.idx[bn], ...o }, sy),
    P, Q,
  };
}
const SIDES = [['L', -1], ['R', 1]];

function headPrims(B, o) {
  const { cap, ell } = helpers(B, HS), H = 'head', L = [];
  const sk = { mat: R.SKIN };
  L.push(cap('neck', [0, -0.05, 0.0], [0, 0.1, -0.008], 0.054 * o.neck, 0.049, { k: 0.03, ...sk }));
  L.push(ell(H, [0, 0.115, -0.014], [0.077, 0.092, 0.097], null, { k: 0.03, ...sk }));
  L.push(ell(H, [0, 0.128, 0.028], [0.066, 0.062, 0.062], null, { k: 0.03, ...sk }));
  L.push(ell(H, [0, 0.077, 0.03], [0.061, 0.072, 0.07], null, { k: 0.03, ...sk }));
  // jaw and chin hang from the jaw bone so the mouth can open
  L.push(ell('jaw', [0, -0.04, 0.03], [0.05, 0.034, 0.05], null, { k: 0.03, ...sk }));
  for (const [, s] of SIDES) L.push(cap('jaw', [s * 0.05, -0.02, -0.012], [s * 0.022, -0.068, 0.058], 0.017, 0.014, { k: 0.025, ...sk }));
  L.push(ell('jaw', [0, -0.072, 0.07], [0.024, 0.021, 0.018], null, { k: 0.02, ...sk }));
  for (const [, s] of SIDES) {
    L.push(ell(H, [s * 0.046, 0.084, 0.062], [0.024, 0.015, 0.022], null, { k: 0.02, ...sk })); // cheekbone
    L.push(cap('brow', [s * 0.052, -0.004, 0.0], [s * 0.012, 0.0, 0.018], 0.0115, 0.011, { k: 0.016, ...sk })); // brow ridge
    L.push(ell(H, [s * 0.077, 0.09, -0.006], [0.011, 0.03, 0.019], [0, -s * 0.35, 0], { k: 0.008, ...sk })); // ear
    L.push(ell(H, [s * 0.084, 0.088, -0.001], [0.005, 0.016, 0.009], null, { sub: true, k: 0.005 }));
    L.push(ell(H, [s * 0.033, 0.096, 0.09], [0.019, 0.0125, 0.017], null, { sub: true, k: 0.012 })); // eye socket
  }
  // nose
  L.push(cap(H, [0, 0.113, 0.088], [0, 0.07, 0.114], 0.0085, 0.012, { k: 0.012, ...sk }));
  L.push(ell(H, [0, 0.064, 0.112], [0.0135, 0.0125, 0.0125], null, { k: 0.008, ...sk }));
  for (const [, s] of SIDES) {
    L.push(ell(H, [s * 0.0145, 0.061, 0.101], [0.0095, 0.008, 0.009], null, { k: 0.006, ...sk }));
    L.push(ell(H, [s * 0.008, 0.055, 0.107], [0.0038, 0.003, 0.0045], null, { sub: true, k: 0.003 }));
  }
  // lips (upper on the head, lower on the jaw) and the mouth line
  L.push(ell(H, [0, 0.044, 0.098], [0.022, 0.0068, 0.0085], null, { k: 0.007, mat: R.LIPS }));
  L.push(ell('jaw', [0, -0.041, 0.086], [0.02, 0.0075, 0.009], null, { k: 0.007, mat: R.LIPS }));
  L.push(cap(H, [-0.021, 0.0375, 0.103], [0.021, 0.0375, 0.103], 0.0016, 0.0016, { sub: true, k: 0.003 }));
  return L;
}
function handPrims(B, o) {
  const { cap, ell } = helpers(B), L = [], sk = { mat: R.SKIN };
  for (const [S, s] of SIDES) {
    const h = 'hand' + S;
    L.push(cap(h, [0, 0.03, 0], [0, -0.01, 0], 0.03, 0.027, { k: 0.015, ...sk }));
    L.push(ell(h, [-s * 0.004, -0.05, 0.002], [0.019, 0.046, 0.041], null, { k: 0.016, ...sk }));
    if (o._mitten) { L.push(ell(h, [-s * 0.022, -0.11, 0.0], [0.03, 0.035, 0.04], null, { k: 0.02, ...sk })); continue; }
    for (let f = 0; f < 4; f++) {
      const z = 0.029 - f * 0.0195, l = [0.95, 1, 0.96, 0.82][f], r = 0.0098 - f * 0.0006;
      const k0 = [0, -0.088, z], k1 = [-s * 0.008, -0.088 - 0.036 * l, z], k2 = [-s * 0.032 * l, -0.088 - 0.052 * l, z], k3 = [-s * 0.048 * l, -0.088 - 0.04 * l, z];
      L.push(cap(h, k0, k1, r, r * 0.92, { k: 0.008, ...sk }), cap(h, k1, k2, r * 0.92, r * 0.84, { k: 0.006, ...sk }), cap(h, k2, k3, r * 0.84, r * 0.76, { k: 0.005, ...sk }));
    }
    L.push(cap(h, [-s * 0.01, -0.025, 0.03], [-s * 0.026, -0.058, 0.05], 0.013, 0.011, { k: 0.012, ...sk }), cap(h, [-s * 0.026, -0.058, 0.05], [-s * 0.038, -0.088, 0.044], 0.011, 0.0092, { k: 0.006, ...sk }));
  }
  return L;
}
function garmentPrims(B, o) {
  const { cap, ell, tor } = helpers(B), L = [], b = o.build;
  const body = o.mail && !o.qaba ? R.MAIL : R.CLOTH;
  const T = { torso: true, mat: body };
  L.push(ell('hips', [0, -0.01, -0.005], [0.16 * o.girth, 0.125, 0.118 * o.girth], null, { k: 0.05, ...T, mat: R.CLOTH }));
  for (const [, s] of SIDES) L.push(ell('hips', [s * 0.072, -0.075, -0.045], [0.085, 0.09, 0.075], null, { k: 0.05, ...T, mat: R.CLOTH }));
  L.push(ell('spine', [0, 0.08, 0.008 + o.belly * 0.03], [0.146 * o.girth, 0.125, 0.11 + o.belly * 0.03], null, { k: 0.06, ...T }));
  L.push(ell('chest', [0, 0.09, 0.012], [0.17 * b, 0.15, 0.122], null, { k: 0.06, ...T }));
  for (const [, s] of SIDES) L.push(ell('chest', [s * 0.066 * b, 0.11, 0.058], [0.078 * b, 0.062, 0.05], null, { k: 0.04, ...T }));
  L.push(cap('upperChest', [-0.148 * b, 0.065, -0.012], [0.148 * b, 0.065, -0.012], 0.072, 0.072, { k: 0.05, ...T }));
  L.push(ell('upperChest', [0, 0.02, -0.045], [0.158 * b, 0.13, 0.085], null, { k: 0.05, ...T }));
  for (const [, s] of SIDES) L.push(cap('upperChest', [s * 0.1 * b, 0.085, -0.02], [0, 0.138, -0.015], 0.046, 0.04, { k: 0.04, ...T }));
  // collar: qaba band over a mail collar, or a plain robe neckline
  if (o.mail) L.push(tor('upperChest', [0, 0.118, -0.004], 0.075, 0.022, null, { k: 0.012, mat: R.MAIL }));
  L.push(tor('upperChest', [0, 0.138, 0.0], 0.064, 0.013, [0.18, 0, 0], { k: 0.008, mat: o.qaba ? R.GOLD : R.CLOTH2 }));
  for (const [S] of SIDES) {
    L.push(ell('arm' + S, [0, -0.035, 0], [0.066 * b, 0.08, 0.068], null, { k: 0.035, mat: o.mail && !o.qaba ? R.MAIL : R.CLOTH }));
    L.push(cap('arm' + S, [0, -0.01, 0], [0, -0.285, 0], 0.056 * b, 0.045, { k: 0.03, tiraz: o.qaba || o.tiraz, mat: o.mail && !o.qaba ? R.MAIL : R.CLOTH }));
    const sleeve = o.qaba && o.mail ? R.MAIL : R.CLOTH;
    L.push(cap('fore' + S, [0, 0.0, 0], [0, -0.228, 0], 0.046, 0.035, { k: 0.025, mat: sleeve }));
    if (o.qaba) L.push(tor('fore' + S, [0, -0.025, 0], 0.05, 0.012, null, { k: 0.01, mat: R.GOLD }));
    L.push(tor('fore' + S, [0, -0.205, 0], 0.036, 0.0105, null, { k: 0.006, mat: o.qaba ? R.LEATHER : R.CLOTH2 }));
    // legs: trousers into soft leather boots (khuff)
    L.push(cap('thigh' + S, [0, 0.03, 0], [0, -0.42, 0], 0.088, 0.06, { k: 0.045, mat: R.DARK }));
    L.push(ell('shin' + S, [0, 0.0, 0.012], [0.054, 0.06, 0.055], null, { k: 0.03, mat: R.DARK }));
    L.push(ell('shin' + S, [0, -0.12, -0.022], [0.05, 0.09, 0.05], null, { k: 0.03, mat: R.DARK }));
    L.push(cap('shin' + S, [0, -0.02, 0], [0, -0.2, 0], 0.055, 0.05, { k: 0.03, mat: R.DARK }));
    L.push(cap('shin' + S, [0, -0.165, 0], [0, -0.41, 0], 0.058, 0.049, { k: 0.01, mat: R.LEATHER }));
    L.push(tor('shin' + S, [0, -0.165, 0.0], 0.058, 0.012, [-0.15, 0, 0], { k: 0.008, mat: R.LEATHER }));
    L.push(ell('foot' + S, [0, -0.036, -0.016], [0.045, 0.046, 0.056], null, { k: 0.03, mat: R.LEATHER }));
    L.push(cap('foot' + S, [0, -0.046, 0.0], [0, -0.054, 0.125], 0.042, 0.032, { k: 0.03, mat: R.LEATHER }));
    L.push(cap('toe' + S, [0, 0.005, 0.0], [0, 0.012, 0.055], 0.03, 0.012, { k: 0.02, mat: R.LEATHER }));
  }
  L.push(halfspace(V(0, 0.003, 0), V(0, -1, 0), { inter: true, k: 0.008 }));
  // belt with gilt buckle, and a wool sash above it
  L.push(ell('hips', [0, 0.05, 0.004], [0.158 * o.girth, 0.03, 0.128 * o.girth], null, { k: 0.01, mat: R.LEATHER }));
  L.push(ell('hips', [0, 0.05, 0.132 * o.girth], [0.026, 0.02, 0.01], null, { k: 0.004, mat: R.GOLD }));
  if (o.sash) L.push(ell('spine', [0, 0.035, 0.006 + o.belly * 0.02], [0.152 * o.girth, 0.032, 0.124 * o.girth + o.belly * 0.02], null, { k: 0.01, mat: R.SASH }));
  return L;
}
function garmentPaint(o) {
  return (x, y, z, dom) => {
    if (!dom) return 0;
    if (dom.tiraz) { const t = dom.t(x, y, z); if (t > 0.3 && t < 0.42) return (t > 0.335 && t < 0.385) ? R.CLOTH2 : R.GOLD; }
    // qaba: left panel crosses over the right with a gilt edge
    if (o.qaba && dom.torso && z > 0.04 && y > 1.08 && y < 1.53) { const xl = -0.045 + (1.53 - y) * 0.3; if (Math.abs(x - xl) < 0.011) return R.GOLD; }
    return undefined;
  };
}
function hairPrims(B, o) {
  const { cap, ell } = helpers(B, HS), L = [], hm = { mat: R.HAIR };
  if (!o.bald) L.push(ell('head', [0, 0.11, -0.018], [0.0795, 0.068, 0.099], null, { k: 0.02, mat: R.HAIR }), ell('head', [0, 0.05, -0.09], [0.06, 0.05, 0.03], null, { k: 0.03, mat: R.HAIR }));
  for (const [, s] of SIDES) L.push(cap('brow', [s * 0.052, 0.004, 0.012], [s * 0.012, 0.008, 0.031], 0.005, 0.0058, { k: 0.004, mat: R.BROW }));
  if (o.beard) {
    const len = o.beardLen;
    for (const [, s] of SIDES) {
      L.push(cap('jaw', [s * 0.057, -0.01, -0.012], [s * 0.026, -0.072, 0.06], 0.017, 0.022, { k: 0.02, ...hm }));
      L.push(ell('jaw', [s * 0.043, -0.038, 0.045], [0.02, 0.03, 0.026], null, { k: 0.02, ...hm }));
    }
    L.push(ell('beard', [0, -0.012 - len * 0.03, 0.016], [0.036, 0.034 + len * 0.04, 0.028], null, { k: 0.025, ...hm }));
    L.push(ell('jaw', [0, -0.065, 0.068], [0.03, 0.024, 0.024], null, { k: 0.02, ...hm }));
    // moustache, joined under the nose and running into the beard
    for (const [, s] of SIDES) L.push(cap('head', [s * 0.033, 0.03, 0.088], [s * 0.012, 0.05, 0.104], 0.0055, 0.0068, { k: 0.008, ...hm }));
    L.push(cap('head', [-0.012, 0.05, 0.104], [0.012, 0.05, 0.104], 0.0068, 0.0068, { k: 0.008, ...hm }));
    for (const [, s] of SIDES) L.push(cap('head', [s * 0.072, 0.11, 0.0], [s * 0.06, 0.055, 0.035], 0.008, 0.012, { k: 0.012, ...hm })); // sideburns
    L.push(ell('jaw', [0, -0.04, 0.095], [0.02, 0.013, 0.03], null, { sub: true, k: 0.008 })); // keep the lower lip clear
    L.push(ell('head', [0, 0.062, 0.108], [0.022, 0.009, 0.02], null, { sub: true, k: 0.006 })); // clear under the nose
  }
  return L;
}
function headwearPrims(B, o) {
  const { cap, ell, tor } = helpers(B, HS), L = [], H = 'head';
  if (o.helm) {
    // steel bayda dome with a gilt rim and nasal, over a mail aventail open at the face
    L.push(ell(H, [0, 0.14, -0.012], [0.088, 0.1, 0.098], null, { k: 0.02, mat: R.STEEL }));
    L.push(cap(H, [0, 0.2, -0.012], [0, 0.255, -0.016], 0.03, 0.006, { k: 0.03, mat: R.STEEL }));
    L.push(ell(H, [0, 0.03, -0.01], [0.2, 0.085, 0.2], null, { sub: true, k: 0.01 }));
    L.push(tor(H, [0, 0.06, -0.012], 0.088, 0.03, [0.15, 0, 0], { k: 0.02, mat: R.MAIL }, 2.2));
    L.push(ell(H, [0, 0.06, 0.09], [0.066, 0.052, 0.075], null, { sub: true, k: 0.015 }));
    L.push(tor(H, [0, 0.118, -0.012], 0.09, 0.009, [0.12, 0, 0], { k: 0.006, mat: R.GOLD }));
    L.push(cap(H, [0, 0.13, 0.095], [0, 0.07, 0.112], 0.008, 0.0065, { k: 0.008, mat: R.STEEL }));
  } else if (o.cap) {
    // tall felt qalansuwa wound with a dark turban cloth
    L.push(ell(H, [0, 0.17, -0.014], [0.084, 0.115, 0.094], null, { k: 0.02, mat: R.FELT }));
    L.push(tor(H, [0, 0.135, -0.008], 0.087, 0.023, [-0.14, 0, 0], { k: 0.012, mat: R.WRAP }, 0.9));
    L.push(tor(H, [0, 0.162, -0.016], 0.08, 0.02, [0.1, 0, 0.06], { k: 0.012, mat: R.WRAP }, 0.9));
    L.push(tor(H, [0, 0.185, -0.018], 0.072, 0.017, [-0.05, 0, -0.08], { k: 0.012, mat: R.WRAP }, 0.9));
    L.push(ell(H, [0, 0.05, -0.01], [0.2, 0.066, 0.2], null, { sub: true, k: 0.01 }));
  } else if (o.turban) {
    L.push(ell(H, [0, 0.155, -0.012], [0.09, 0.07, 0.1], null, { k: 0.02, mat: R.WRAP }));
    L.push(tor(H, [0, 0.13, -0.01], 0.087, 0.026, [-0.14, 0, 0], { k: 0.015, mat: R.WRAP }, 0.85));
    L.push(tor(H, [0, 0.16, -0.012], 0.08, 0.026, [0.16, 0, 0.1], { k: 0.015, mat: R.WRAP }, 0.85));
    L.push(tor(H, [0, 0.19, -0.012], 0.06, 0.022, [-0.1, 0, -0.12], { k: 0.015, mat: R.WRAP }, 0.85));
    L.push(ell(H, [0, 0.05, -0.01], [0.2, 0.07, 0.2], null, { sub: true, k: 0.01 }));
  }
  return L;
}

function veilPrims(B, o) {
  // litham: a cloth veil drawn over nose and mouth
  const { cap, ell } = helpers(B, HS), L = [], H = 'head';
  L.push(ell(H, [0, 0.06, 0.035], [0.074, 0.062, 0.085], null, { k: 0.02, mat: R.MASK }));
  L.push(cap('neck', [0, 0.0, 0.0], [0, 0.09, 0.0], 0.06, 0.066, { k: 0.03, mat: R.MASK }));
  L.push(halfspace(V(0, 0.088 * HS, 0).applyMatrix4(B.mats.head), V(0, -1, 0), { sub: true, k: 0.008 }));
  return L;
}

const _geo = new Map();
function piece(name, key, make) {
  const k = name + '|' + key + '|' + QUALITY;
  if (!_geo.has(k)) _geo.set(k, cachedGeo(k, make));
  return _geo.get(k);
}

// ---------------------------------------------------------------- humanoid
// opts: skin, robe, robe2, sash, turban, cap, capBand, helm, mask, beard, mail, qaba, cloak, hem, scabbard,
//       weapon, offhand, hunch, scale, build (shoulder breadth), robeLen (hem height), belly
export function humanoid(opts = {}) {
  const o = Object.assign({ skin: 0xa8714a, robe: '#e8dcc0', robe2: '#a03020', sash: 0x8a1c1c, turban: 0xf0ead8, weapon: 'sword', offhand: null, hunch: 0, scale: 1,
    mail: false, cloak: null, cap: null, helm: null, mask: null, beard: null, qaba: false, build: 1, girth: 1, belly: 0, neck: 1, beardLen: 0.5, hemY: null }, opts);
  if (o.helm) o.turban = null;
  const B = bindData(o.build);
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(o.scale);
  const { bones, skeleton } = makeSkeleton(B);
  body.add(bones.hips);

  // palette for this character
  const pal = defaultPalette(), C = (c) => new THREE.Color(c);
  pal[R.CLOTH].c = C(o.robe); pal[R.CLOTH2].c = C(o.robe2); pal[R.SASH].c = C(o.sash);
  pal[R.SKIN].c = C(o.skin); pal[R.LIPS].c = C(o.skin).multiply(C(0xc89a8c)).multiplyScalar(0.9);
  pal[R.SKIN].c.offsetHSL(0, -0.12, -0.02);
  if (o.beard) { pal[R.HAIR].c = C(o.beard); pal[R.BROW].c = C(o.beard).lerp(C(0x1a120c), 0.3); }
  if (o.turban) pal[R.WRAP].c = C(o.turban);
  if (o.cap) { pal[R.FELT].c = C(o.cap); pal[R.WRAP].c = C(o.capBand || 0x1a1814); }
  if (o.mask) pal[R.MASK].c = C(o.mask);
  pal[R.DARK].c = C(o.trousers ?? 0x2c241e);
  const mat = charMaterial(pal);

  // sculpted, skinned pieces (geometry is shared between characters with the same build)
  const sk = JSON.stringify([o.build, o.girth, o.belly, o.neck]);
  // detail tiers: hero-class characters get the full sculpt, crowds a lighter one (and everyone is light on q=low)
  const hiTier = !LOW && o.detail === 'hi', tier = hiTier ? 'hi' : 'lo';
  const vox = (hi, lo) => (hiTier ? hi : lo);
  o._mitten = !hiTier;
  const geos = [
    piece('head', [tier, o.neck], () => sculpt(headPrims(B, o), { voxel: vox(0.0034, 0.0072), blend: 0.012 })),
    piece('hands', [tier, sk], () => sculpt(handPrims(B, o), { voxel: vox(0.0034, 0.0075), blend: 0.01 })),
    piece('garment', [tier, sk, o.qaba, o.mail, !!o.sash, o.tiraz], () => sculpt(garmentPrims(B, o), { voxel: vox(0.0105, 0.0185), blend: 0.03, paint: garmentPaint(o) })),
  ];
  const hp = hairPrims(B, o); if (hp.length) geos.push(piece('hair', [tier, o.neck, !!o.beard, o.beardLen, !!o.bald], () => sculpt(hp, { voxel: vox(0.0032, 0.0075), blend: 0.012 })));
  const hw = headwearPrims(B, o); if (hw.length) geos.push(piece('headwear', [tier, o.neck, !!o.helm, !!o.cap, !!o.turban], () => sculpt(hw, { voxel: vox(0.0048, 0.0085), blend: 0.02 })));
  if (o.mask) geos.push(piece('veil', [tier, o.neck], () => sculpt(veilPrims(B, o), { voxel: vox(0.0045, 0.0085), blend: 0.02 })));
  // far LOD (crowds only): the same pieces sculpted at ~2.2x the voxel size, about a fifth of the triangles
  const farGeos = hiTier ? null : [
    piece('head', ['far', o.neck], () => sculpt(headPrims(B, o), { voxel: 0.016, blend: 0.014 })),
    piece('hands', ['far', sk], () => sculpt(handPrims(B, o), { voxel: 0.017, blend: 0.012 })),
    piece('garment', ['far', sk, o.qaba, o.mail, !!o.sash, o.tiraz], () => sculpt(garmentPrims(B, o), { voxel: 0.04, blend: 0.035, paint: garmentPaint(o) })),
  ];
  if (farGeos) {
    if (hp.length) farGeos.push(piece('hair', ['far', o.neck, !!o.beard, o.beardLen, !!o.bald], () => sculpt(hp, { voxel: 0.016, blend: 0.014 })));
    if (hw.length) farGeos.push(piece('headwear', ['far', o.neck, !!o.helm, !!o.cap, !!o.turban], () => sculpt(hw, { voxel: 0.018, blend: 0.02 })));
    if (o.mask) farGeos.push(piece('veil', ['far', o.neck], () => sculpt(veilPrims(B, o), { voxel: 0.018, blend: 0.02 })));
  }
  const meshes = geos.map((g, i) => {
    const m = new THREE.SkinnedMesh(g, mat); m.bind(skeleton, new THREE.Matrix4());
    // a fixed bind-pose bound is enough for culling (poses stay within it); small pieces skip the shadow pass on crowds
    m.boundingSphere = new THREE.Sphere(V(0, 0.95, 0), 1.35);
    m.castShadow = hiTier || i === 0 || i === 2; m.receiveShadow = true; body.add(m); return m;
  });
  const farMeshes = farGeos ? farGeos.map((g, i) => {
    const m = new THREE.SkinnedMesh(g, mat); m.bind(skeleton, new THREE.Matrix4());
    m.boundingSphere = new THREE.Sphere(V(0, 0.95, 0), 1.35); m.castShadow = i === 2; m.receiveShadow = true; m.visible = false; body.add(m); return m;
  }) : null;

  // eyes with lids (rigid, on the head bone)
  const eyeM = new THREE.MeshStandardMaterial({ map: eyeTexture(), roughness: 0.12 });
  const lidM = addRim(new THREE.MeshStandardMaterial({ color: C(o.skin).multiplyScalar(0.92), roughness: 0.55 }));
  const eyes = [], lids = [], eyeRoot = new THREE.Group(); eyeRoot.scale.setScalar(HS); bones.head.add(eyeRoot);
  for (const [, s] of SIDES) {
    const piv = new THREE.Group(); piv.position.set(s * 0.032, 0.095, 0.0715); eyeRoot.add(piv);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0118, hiTier ? 16 : 8, hiTier ? 12 : 6), eyeM); ball.rotation.y = -Math.PI / 2; piv.add(ball);
    const up = new THREE.Mesh(new THREE.SphereGeometry(0.0138, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), lidM);
    const lo = new THREE.Mesh(new THREE.SphereGeometry(0.0134, 14, 6, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), lidM);
    const lidPiv = new THREE.Group(); piv.parent.add(lidPiv); lidPiv.position.copy(piv.position); lidPiv.add(up); lidPiv.add(lo);
    up.rotation.x = -0.3; lo.rotation.x = 0.25;
    eyes.push(piv); lids.push({ up, lo });
  }

  const parts = {
    body, bones, skeleton, mats: [mat], mat, meshes, farMeshes, lodFar: false, eyes, lids, cloths: [], jiggles: [], o,
    hips: bones.hips, spine: bones.spine, chest: bones.chest, upperChest: bones.upperChest, neck: bones.neck, head: bones.head, jaw: bones.jaw, brow: bones.brow,
    shL: bones.armL, elL: bones.foreL, handL: bones.handL, shR: bones.armR, elR: bones.foreR, handR: bones.handR,
    thighL: bones.thighL, shinL: bones.shinL, footL: bones.footL, thighR: bones.thighR, shinR: bones.shinR, footR: bones.footR,
  };

  // cloth: qaba / robe skirt, split at the front so the legs can stride, and a mantle on the back
  root.updateMatrixWorld(true);
  const hemY = o.hemY ?? (o.qaba ? 0.36 : 0.13);
  const skirtM = addWrinkles(addRim(new THREE.MeshStandardMaterial({ map: fabricTex(o.robe, o.robe2, o.hem || !o.qaba ? 'hem' : true), roughness: 0.9, side: THREE.DoubleSide })));
  const rows = LOW ? 6 : 9, cols = LOW ? 12 : 18, gap = o.qaba ? 0.62 : 0.34, top = 1.02, flare = o.qaba ? 0.13 : 0.11;
  const skirt = new Cloth({
    rows, cols, anchor: bones.hips, material: skirtM, uvRepeat: 3,
    rest: (r, c) => {
      const t = r / (rows - 1), a = gap / 2 + (c / (cols - 1)) * (Math.PI * 2 - gap);
      const y = top + (hemY - top) * t, rx = (0.168 * o.girth + 0.012) + flare * Math.pow(t, 0.8), rz = (0.132 * o.girth + 0.012 + o.belly * 0.02) + flare * 0.85 * Math.pow(t, 0.8);
      return V(Math.sin(a) * rx, y, Math.cos(a) * rz + (t > 0.2 ? -0.01 : 0));
    },
  });
  root.add(skirt.mesh); parts.cloths.push(skirt); parts.skirt = skirt;
  if (o.cloak) {
    const cm = addWrinkles(addRim(new THREE.MeshStandardMaterial({ map: fabricTex('#' + C(o.cloak).getHexString(), '#b8913e', 'hem'), roughness: 0.95, side: THREE.DoubleSide })));
    const mr = LOW ? 6 : 9, mc = LOW ? 7 : 11;
    const mantle = new Cloth({
      rows: mr, cols: mc, anchor: bones.upperChest, material: cm, uvRepeat: 2, gravity: 1,
      rest: (r, c) => {
        const t = r / (mr - 1), u = c / (mc - 1) * 2 - 1;
        const a = u * 1.25, x0 = Math.sin(a) * 0.17 * o.build, z0 = -Math.cos(a) * 0.11 - 0.01;
        const y = 1.535 - t * (1.535 - 0.5), w = 1 + t * 0.35;
        return V(x0 * w, y + (r === 0 ? Math.abs(u) * -0.03 : 0), z0 * (1 + t * 0.2) - 0.035 - t * 0.07);
      },
    });
    root.add(mantle.mesh); parts.cloths.push(mantle); parts.mantle = mantle;
  }

  // rigid gear on bones
  const steel = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.8, roughness: 0.32 });
  const leatherM = addRim(new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.7 }));
  const goldM = new THREE.MeshStandardMaterial({ color: 0xc9973c, metalness: 0.8, roughness: 0.4 });
  const grip = (h, w, s) => { w.position.set(-s * 0.018, -0.1, 0.004); h.add(w); return w; };
  if (o.weapon === 'sword') { const w = sword(); w.rotation.x = Math.PI / 2; parts.weapon = grip(bones.handR, w, 1); }
  if (o.weapon === 'dagger') { for (const [S, s] of SIDES) { const w = dagger(); w.rotation.x = Math.PI / 2; grip(bones['hand' + S], w, s); } }
  if (o.weapon === 'torch') { const w = torch(); w.rotation.x = Math.PI / 2.4; parts.weapon = grip(bones.handR, w, 1); }
  if (o.weapon === 'spear') { const w = spear(); w.rotation.x = Math.PI / 2; parts.weapon = grip(bones.handR, w, 1); }
  if (o.weapon === 'bow') { const w = bow(); w.position.set(0.018, -0.1, 0); bones.handL.add(w); parts.weapon = w; }
  if (o.offhand === 'shield') { const sd = shield(); sd.scale.setScalar(0.92); sd.position.set(-0.075, -0.14, 0.02); sd.rotation.set(0, -Math.PI / 2 + 0.5, 0); bones.foreL.add(sd); parts.shield = sd; }
  if (o.scabbard) {
    const piv = new THREE.Group(); piv.position.set(-0.165, 0.03, 0.02); piv.rotation.set(0.55, 0, -0.18); bones.hips.add(piv);
    const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.02, 0.9, 8).translate(0, -0.45, 0).scale(1, 1, 0.55), leatherM); sc.castShadow = true; piv.add(sc);
    const chape = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 8).rotateX(Math.PI).translate(0, -0.92, 0).scale(1, 1, 0.55), goldM); piv.add(chape);
    const locket = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8).translate(0, -0.06, 0).scale(1, 1, 0.6), goldM); piv.add(locket);
    parts.jiggles.push(new Jiggle(piv, V(0, -1, 0), 0.9, { stiff: 35, damp: 5, grav: 4, limit: 0.6 }));
  }
  if (o.sash) {
    const sm = addRim(new THREE.MeshStandardMaterial({ color: C(o.sash), roughness: 0.9, side: THREE.DoubleSide }));
    const piv = new THREE.Group(); piv.position.set(0.1 * o.girth, 0.075, 0.115 * o.girth); piv.rotation.set(-0.12, 0.4, 0.05); bones.hips.add(piv);
    const g = new THREE.PlaneGeometry(0.075, 0.34, 1, 4).translate(0, -0.17, 0); const gp = g.attributes.position;
    for (let i = 0; i < gp.count; i++) gp.setZ(i, Math.sin(-gp.getY(i) * 9) * 0.01);
    g.computeVertexNormals();
    const strip = new THREE.Mesh(g, sm); strip.castShadow = true; piv.add(strip);
    parts.jiggles.push(new Jiggle(piv, V(0, -1, 0), 0.34, { stiff: 25, damp: 4, grav: 5, limit: 0.9 }));
  }
  if (o.beard) parts.jiggles.push(new Jiggle(bones.beard, V(0, -1, 0.3), 0.06 + o.beardLen * 0.04, { stiff: 140, damp: 12, grav: 2, limit: 0.35 }));

  // contact shadows: a soft blob under the body and one under each foot
  const blobM = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.75, polygonOffset: true, polygonOffsetFactor: -2 });
  const blobG = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const blob = new THREE.Mesh(blobG, blobM); blob.scale.set(0.95 * o.scale, 1, 0.75 * o.scale); blob.position.y = 0.035; blob.renderOrder = 1; root.add(blob);
  parts.blobs = [blob];
  for (let i = 0; i < 2; i++) { const f = new THREE.Mesh(blobG, blobM); f.scale.set(0.28 * o.scale, 1, 0.4 * o.scale); f.renderOrder = 1; root.add(f); parts.blobs.push(f); }

  root.userData.parts = parts;
  root.userData.anim = new Animator(root, parts, o);
  return root;
}

export function animateHumanoid(rig, st, t, dt) { rig.userData.anim?.update(st, t, dt); }
// swap between the near and far sculpts (eyes and lids are hidden at range too)
export function setCharLOD(rig, far) {
  const P = rig.userData.parts; if (!P?.farMeshes || P.lodFar === far) return;
  P.lodFar = far;
  for (const m of P.meshes) m.visible = !far;
  for (const m of P.farMeshes) m.visible = far;
  for (const e of P.eyes) e.visible = !far; for (const l of P.lids) { l.up.visible = !far; l.lo.visible = !far; }
}
