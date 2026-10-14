// Growth: critters change form as they level up (stage 2 at Lv 7, stage 3 at Lv 14).
// Each critter always grows along its own fixed path. Hand-built forms get new proportions, colours
// and parts (built here onto a Critter); every other critter gets a bigger, tougher generic form.
import * as THREE from 'three';
import { toon, inked } from './toon.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const GROW_LV = [7, 14];
export const stageFor = (lv = 1) => (lv >= GROW_LV[1] ? 3 : lv >= GROW_LV[0] ? 2 : 1);
// special/super damage and cooldown per stage
export const MOVE_POW = [1, 1.12, 1.25];
export const CD_MULT = [1, 0.92, 0.84];
const HP_MULT = [1, 1.06, 1.12];

// path: what the critter grows into (shown in the Critterdex)
export const FORMS = {
  cindermunch: {
    path: 'Brute',
    forms: [
      {
        name: 'Blazemunch', species: 'Furnace Hamster', size: 1.1, tailScale: 1.35, voice: 1.05,
        blurb: 'Its cheek pouches turned into furnaces. A crest of flame flares up whenever it gets fired up.',
        colors: { body: 0xec7c32, belly: 0xffe6c4, accent: 0xff3c14, dark: 0x5e2410, horn: 0xffe2b0 },
        body: { w: 0.7, h: 0.7, headR: 0.48, legLen: 0.2, armLen: 0.26, chubby: 1.18, limb: 1.3 },
        parts: { flamecrest: 0.8, horns: 0.55, brows: 0.6 },
        moves: { special: 'Blaze Bonk', super: 'Meteor Feast' },
      },
      {
        name: 'Magmuncher', species: 'Volcano Hamster', size: 1.28, tailScale: 1.7, voice: 0.8,
        blurb: 'A walking volcano wearing a coat of cooled lava. One stomp and the whole stadium bounces.',
        colors: { body: 0x6a3f36, belly: 0xffcf8a, accent: 0xff5a1e, dark: 0x2a1410, horn: 0xfff0d0, rock: 0x3a2a2a, lava: 0xff7a1e },
        body: { w: 0.9, h: 0.86, headR: 0.46, legLen: 0.22, armLen: 0.34, chubby: 1.22, limb: 1.8 },
        parts: { flamecrest: 1.15, horns: 0.95, lavaplates: 1, brows: 1, tusks: 0.8 },
        moves: { special: 'Magma Ram', super: 'Volcano Munch' },
      },
    ],
  },
  bubbalotl: {
    path: 'Mystic',
    forms: [
      {
        name: 'Tidalotl', species: 'Tide Axolotl', size: 1.1, tailScale: 1.4, voice: 0.95, earScale: 1.2,
        blurb: 'Grows a sail of fin along its back and surfs on its own bubbles.',
        colors: { body: 0xf47ab4, belly: 0xffe4f0, accent: 0x3ac0ff, dark: 0x7a1f52, fin: 0x3ac0ff },
        body: { w: 0.58, h: 0.76, headR: 0.5, legLen: 0.2, armLen: 0.24, chubby: 1.0, limb: 1.2 },
        parts: { backfin: 0.8, whiskers: 0.7 },
        moves: { special: 'Bubble Barrage', super: 'Tidal Crush' },
      },
      {
        name: 'Leviatotl', species: 'Deep Sea Axolotl', size: 1.26, tailScale: 1.8, voice: 0.75, earScale: 1.45,
        blurb: 'A gentle giant of the deep. The pearl on its brow glows when it calls the tide.',
        colors: { body: 0xb070e0, belly: 0xf4e6ff, accent: 0x52e2ff, dark: 0x3e1a6a, fin: 0x52e2ff, pearl: 0xe8fbff, horn: 0x8af0ff },
        body: { w: 0.66, h: 1.0, headR: 0.44, legLen: 0.24, armLen: 0.3, chubby: 0.98, limb: 1.4 },
        parts: { backfin: 1.25, whiskers: 1.15, pearl: 1, horns: 0.75 },
        moves: { special: 'Abyss Bubble', super: 'Leviathan Wave' },
      },
    ],
  },
  clovebun: {
    path: 'Swift',
    forms: [
      {
        name: 'Bramblehare', species: 'Bramble Hare', size: 1.1, voice: 1.25,
        blurb: 'Long legs, a leafy mane and a temper like a thorn bush. It can outrun its own clover-rangs.',
        colors: { body: 0xf0ecd8, belly: 0xffffff, accent: 0x46c95a, dark: 0x2a6a34, antler: 0x8a6a48 },
        body: { w: 0.5, h: 0.72, headR: 0.46, legLen: 0.3, armLen: 0.23, chubby: 0.9, limb: 1.1 },
        parts: { leafmane: 0.8 },
        moves: { special: 'Thorn-rang', super: 'Bramble Bloom' },
      },
      {
        name: 'Jackalorn', species: 'Grove Jackalope', size: 1.24, voice: 1.0, portraitZoom: 1.18,
        blurb: 'Blossoming antlers and legs like springs. Legends say spring arrives wherever it lands.',
        colors: { body: 0xe8e0c6, belly: 0xffffff, accent: 0x3ec456, dark: 0x2a6030, antler: 0x8a6440, blossom: 0xff9ac8 },
        body: { w: 0.54, h: 0.84, headR: 0.44, legLen: 0.38, armLen: 0.27, chubby: 0.9, limb: 1.25 },
        parts: { leafmane: 1.1, antlers: 1.3 },
        moves: { special: 'Antler-rang', super: 'Grove Bloom' },
      },
    ],
  },
  pebblepup: {
    path: 'Colossus',
    forms: [
      {
        name: 'Cragmutt', species: 'Crag Hound', size: 1.12, voice: 0.85,
        blurb: 'Its crystals grew into a ridge down its back. Digs holes big enough to nap in.',
        colors: { body: 0xa08c78, belly: 0xeadcc6, accent: 0x7ad0ff, dark: 0x3e322a, rock: 0x6e6258 },
        body: { w: 0.72, h: 0.64, headR: 0.5, legLen: 0.2, armLen: 0.24, chubby: 1.18, limb: 1.4 },
        parts: { crystalridge: 0.8, stonearmor: 0.7, brows: 0.6 },
        moves: { special: 'Boulder Toss', super: 'Rockslide' },
      },
      {
        name: 'Montiff', species: 'Mountain Mastiff', size: 1.32, voice: 0.65,
        blurb: 'Gentle as a sleeping mountain, heavy as one too. Its crystal spires hum before an avalanche.',
        colors: { body: 0x857466, belly: 0xe0d0b8, accent: 0x9ae4ff, dark: 0x2e2620, rock: 0x5a5048 },
        body: { w: 0.94, h: 0.86, headR: 0.5, legLen: 0.24, armLen: 0.32, chubby: 1.24, limb: 1.9 },
        parts: { crystalridge: 1.35, stonearmor: 1.25, brows: 1, tusks: 1 },
        moves: { special: 'Meteor Boulder', super: 'Mountain Fall' },
      },
    ],
  },
};

// the form a critter def takes at this level (keeps the id, so progress stays shared)
export function grown(def, lv, shiny) {
  const stage = stageFor(lv);
  if (stage === 1 || def.stage) return def;
  const F = FORMS[def.id]?.forms[stage - 2];
  const hp = Math.round(def.stats.hp * HP_MULT[stage - 1]);
  if (!F) {
    // generic growth: bigger and sturdier, same look; moves get stronger names
    const p = stage === 2 ? 'Power' : 'Ultra';
    return {
      ...def, stage, size: stage === 2 ? 1.08 : 1.16,
      body: { ...def.body, limb: stage === 2 ? 1.15 : 1.3 },
      stats: { ...def.stats, hp },
      moves: { special: `${p} ${def.moves.special}`, super: `${p} ${def.moves.super}` },
    };
  }
  return {
    ...def, ...F, stage, baseName: def.name,
    colors: { ...def.colors, ...F.colors, ...(shiny || {}) },
    stats: { ...def.stats, hp },
  };
}

// ---------- parts for the hand-built forms ----------
const sphere = (r = 1) => new THREE.SphereGeometry(r, 28, 20);
const UP = new THREE.Vector3(0, 1, 0);

// a tapered segment from a to b (merged into antlers and horns)
function seg(a, b, r0, r1) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, 8, 1);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}
const tip = (a, b, r) => { const g = sphere(r); g.translate(b.x, b.y, b.z); return [seg(a, b, r, r * 0.35)]; };
const v = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildGrowth(cr, def, U, OL, { flameGeo, leafGeo }) {
  const P = def.parts;
  if (!P) return;
  const B = def.body, C = def.colors, headR = B.headR;
  const mat = (k, col, o = {}) => (cr.mats['g_' + k] ||= toon(col, { uniforms: U, ...o }));

  // a crest of flames from the brow back over the head
  if (P.flamecrest) {
    const s = P.flamecrest;
    for (let k = 0; k < 5; k++) {
      const a = -0.15 + k * 0.32, g = new THREE.Group();
      g.position.set(0, Math.cos(a) * headR * 0.86, -Math.sin(a) * headR * 0.86);
      g.rotation.x = -a * 0.9 - 0.15;
      const big = (1 - Math.abs(k - 1.5) * 0.18) * s;
      const outer = new THREE.Mesh(flameGeo(), new THREE.MeshBasicMaterial({ color: C.flame ?? 0xff5a1e }));
      const inner = new THREE.Mesh(flameGeo(), new THREE.MeshBasicMaterial({ color: C.flameIn ?? 0xffe066 }));
      outer.userData.base = 0.5 * big; inner.userData.base = 0.31 * big; inner.position.set(0, 0.02, 0.03);
      g.add(outer, inner);
      cr.flames.push(outer, inner);
      cr.skull.add(g);
    }
  }

  // two horns curving up and out from the brow
  if (P.horns) {
    const s = P.horns, hm = mat('horn', C.horn ?? 0xfff0d0);
    for (const x of [-1, 1]) {
      const a = v(0, 0, 0), b = v(x * 0.14, 0.22, 0.04).multiplyScalar(s * headR * 2.2), c = v(x * 0.2, 0.42, -0.06).multiplyScalar(s * headR * 2.2);
      const g = mergeGeometries([seg(a, b, headR * 0.12 * s, headR * 0.08 * s), seg(b, c, headR * 0.08 * s, headR * 0.012)]);
      const h = inked(g, hm, OL * 0.6);
      h.position.set(x * headR * 0.42, headR * 0.6, headR * 0.3);
      cr.skull.add(h);
    }
  }

  // cooled-lava armour: rock chunks over a glowing core, on the shoulders and the back
  if (P.lavaplates) {
    const rock = mat('rock', C.rock ?? 0x3a2a2a, { rim: 0.6 });
    const lava = new THREE.MeshBasicMaterial({ color: C.lava ?? 0xff7a1e });
    const chunk = (r, x, y, z, seed) => {
      const parts = [];
      for (let i = 0; i < 4; i++) {
        const g = new THREE.DodecahedronGeometry(r * (0.55 + ((seed * 7 + i * 3) % 5) * 0.06), 0);
        const a = i * 1.7 + seed;
        g.translate(Math.cos(a) * r * 0.45, Math.sin(a * 1.3) * r * 0.25 + r * 0.1, Math.sin(a) * r * 0.45);
        parts.push(g);
      }
      const m = inked(mergeGeometries(parts), rock, OL * 0.7);
      const core = new THREE.Mesh(sphere(r * 0.62), lava);
      core.position.y = r * 0.1;
      const grp = new THREE.Group(); grp.add(core, m); grp.position.set(x, y, z);
      return grp;
    };
    for (const s of [-1, 1]) {
      const sh = chunk(B.w * 0.3, s * B.w * B.chubby * 0.46, B.h * 0.8, -B.w * 0.02, s + 2);
      cr.torso.add(sh);
    }
    cr.torso.add(chunk(B.w * 0.36, 0, B.h * 0.6, -B.w * 0.42, 5));
    cr.torso.add(chunk(B.w * 0.26, 0, B.h * 0.28, -B.w * 0.44, 9));
    // glowing seams across the belly armour
    for (const s of [-1, 1]) {
      const seam = new THREE.Mesh(new THREE.TorusGeometry(B.w * 0.5, 0.012, 6, 24, 0.9), lava);
      seam.position.set(0, B.h * (s > 0 ? 0.5 : 0.36), 0);
      seam.rotation.set(Math.PI / 2 + 0.1, 0, Math.PI / 2 - 0.45);
      seam.scale.set(B.chubby * 1.02, 1.02, 1);
      cr.torso.add(seam);
    }
  }

  // heavy brows angled down toward the nose: a fierce look over the same bright eyes
  if (P.brows) {
    const s = P.brows, bm = cr.mats.dark;
    for (const x of [-1, 1]) {
      const yaw = x * 0.36, pit = 0.3, r = headR * 1.0;
      const b = inked(new THREE.CapsuleGeometry(headR * 0.05 * (0.7 + s * 0.3), headR * 0.26 * (0.8 + s * 0.2), 4, 8), bm, OL * 0.4);
      b.position.set(Math.sin(yaw) * Math.cos(pit) * r, Math.sin(pit) * r, Math.cos(yaw) * Math.cos(pit) * r);
      b.rotation.set(0, yaw, Math.PI / 2 + x * (0.25 + s * 0.15), 'YXZ');
      cr.skull.add(b);
    }
  }

  // little tusks poking up from the corners of the mouth
  if (P.tusks) {
    const s = P.tusks, tm = mat('tusk', 0xfffaf0);
    for (const x of [-1, 1]) {
      const yaw = x * 0.26, pit = -0.42, r = headR * 0.98;
      const t = inked(new THREE.ConeGeometry(headR * 0.06 * s, headR * 0.2 * s, 8), tm, OL * 0.4);
      t.position.set(Math.sin(yaw) * Math.cos(pit) * r, Math.sin(pit) * r + headR * 0.05 * s, Math.cos(yaw) * Math.cos(pit) * r);
      t.rotation.set(0.3, 0, -x * 0.15);
      cr.skull.add(t);
    }
  }

  // a scalloped sail fin from the crown down the back to the tail
  if (P.backfin) {
    const s = P.backfin, fm = toon(C.fin ?? C.accent, { uniforms: U, side: THREE.DoubleSide });
    cr.mats.g_fin = fm;
    const sh = new THREE.Shape(), L = (B.h + headR) * 1.15, H = 0.3 * s;
    sh.moveTo(0, 0);
    for (let k = 0; k <= 4; k++) { const x = (k / 4) * L, y = H * (1 - k * 0.16); sh.quadraticCurveTo(x - L * 0.06, y * 1.15, x + L * 0.05, y * 0.55); }
    sh.lineTo(L, 0); sh.lineTo(0, 0);
    const geo = new THREE.ShapeGeometry(sh, 8);
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, fm);
    const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x1a1020, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 }));
    o.scale.set(1.02, 1.08, 1); o.position.set(-0.01, -0.005, 0);
    g.add(o, m);
    g.rotation.y = Math.PI / 2; // shape x runs down the back (-z)
    g.rotation.order = 'YXZ'; g.rotation.x = -0.72;
    g.position.set(0, B.h * 0.82 + headR * 0.95, -headR * 0.2);
    cr.torso.add(g);
    cr.fin = g;
  }

  // long drooping whiskers from the snout
  if (P.whiskers) {
    const s = P.whiskers, wm = mat('whisk', C.fin ?? C.accent);
    for (const x of [-1, 1]) {
      const c = new THREE.CatmullRomCurve3([v(0, 0, 0), v(x * 0.3, 0.02, 0.1), v(x * 0.62, -0.06, 0.06), v(x * 0.85, -0.26, -0.04), v(x * 0.9, -0.48, -0.12)].map((p) => p.multiplyScalar(headR * s)));
      const w = inked(new THREE.TubeGeometry(c, 16, headR * 0.03, 6), wm, OL * 0.4);
      w.position.set(x * headR * 0.42, -headR * 0.18, headR * 0.82);
      cr.skull.add(w);
      cr.whiskers = (cr.whiskers || []).concat(w);
    }
  }

  // a glowing pearl on the brow in a gold setting
  if (P.pearl) {
    const p = new THREE.Mesh(sphere(headR * 0.12), new THREE.MeshBasicMaterial({ color: C.pearl ?? 0xffffff }));
    p.position.set(0, headR * 0.62, headR * 0.76);
    const ring = inked(new THREE.TorusGeometry(headR * 0.13, headR * 0.03, 6, 20), mat('gold', 0xffc93a, { rim: 0.9 }), OL * 0.4);
    ring.position.copy(p.position); ring.rotation.x = -0.75;
    const glow = new THREE.Mesh(sphere(headR * 0.2), new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.copy(p.position);
    cr.skull.add(p, ring, glow);
    cr.lantern ||= glow;
  }

  // a mane of leaves around the neck
  if (P.leafmane) {
    const s = P.leafmane, n = 11;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      if (Math.cos(a) > 0.82) continue; // keep the chin clear
      const lf = inked(leafGeo().scale(0.32 * s, 0.32 * s, 0.4 * s), k % 2 ? cr.mats.accent : cr.mats.dark, OL * 0.5);
      lf.position.set(Math.sin(a) * B.w * 0.4, B.h * 0.84, Math.cos(a) * B.w * 0.34);
      lf.rotation.set(-0.35, a, 0, 'YXZ'); // flared up and out like a ruff
      cr.torso.add(lf);
    }
  }

  // branching antlers with leaves and blossoms at the tips
  if (P.antlers) {
    const s = P.antlers * headR * 1.9, am = mat('antler', C.antler ?? 0x8a6440), bl = mat('blossom', C.blossom ?? 0xff9ac8);
    for (const x of [-1, 1]) {
      const p0 = v(0, 0, 0), p1 = v(x * 0.12, 0.26, -0.04), p2 = v(x * 0.3, 0.46, -0.1), p3 = v(x * 0.36, 0.7, -0.06);
      const t1 = v(x * 0.02, 0.5, 0.08), t2 = v(x * 0.52, 0.58, -0.16), t3 = v(x * 0.2, 0.76, 0.02);
      const P3 = [p0, p1, p2, p3, t1, t2, t3].map((q) => q.multiplyScalar(s));
      const r = 0.035 * s;
      const geo = mergeGeometries([seg(P3[0], P3[1], r, r * 0.85), seg(P3[1], P3[2], r * 0.85, r * 0.65), seg(P3[2], P3[3], r * 0.65, r * 0.2),
        seg(P3[1], P3[4], r * 0.6, r * 0.18), seg(P3[2], P3[5], r * 0.55, r * 0.15), seg(P3[2], P3[6], r * 0.5, r * 0.15)]);
      const g = new THREE.Group();
      g.add(inked(geo, am, OL * 0.5));
      for (const [q, kind] of [[P3[3], 'bloom'], [P3[4], 'leaf'], [P3[5], 'leaf'], [P3[6], 'bloom']]) {
        if (kind === 'leaf') {
          const lf = inked(leafGeo().scale(0.24 * s, 0.24 * s, 0.3 * s), cr.mats.accent, OL * 0.4);
          lf.position.copy(q); lf.rotation.set(-0.6, x * 0.8, 0);
          g.add(lf);
        } else {
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * Math.PI * 2, pe = new THREE.Mesh(sphere(0.04 * s), bl);
            pe.position.set(q.x + Math.cos(a) * 0.045 * s, q.y + 0.01 * s, q.z + Math.sin(a) * 0.045 * s);
            g.add(pe);
          }
          const c = new THREE.Mesh(sphere(0.03 * s), mat('pollen', 0xffe066));
          c.position.copy(q).y += 0.03 * s;
          g.add(c);
        }
      }
      g.position.set(x * headR * 0.22, headR * 0.82, -headR * 0.18);
      cr.skull.add(g);
    }
  }

  // a ridge of big crystals down the spine and a crystal tiara
  if (P.crystalridge) {
    const s = P.crystalridge, cm = mat('crystal', C.accent, { rim: 1 });
    const gem = (r, h) => { const g = new THREE.OctahedronGeometry(r, 0); g.scale(1, h / r, 1); g.translate(0, h * 0.5, 0); return g; };
    const parts = [];
    for (let k = 0; k < 6; k++) {
      const t = k / 5, a = 0.25 + t * 1.5; // from the shoulders over the back
      const r = (0.12 - t * 0.04) * s, h = (0.5 - t * 0.18) * s;
      for (const x of k % 2 ? [-1, 1] : [0]) {
        const g = gem(r * (x ? 0.75 : 1), h * (x ? 0.7 : 1));
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, v(x * 0.5, Math.cos(a), -Math.sin(a)).normalize()));
        g.translate(x * B.w * 0.18, B.h * 0.48 + Math.cos(a) * B.h * 0.46, -Math.sin(a) * B.w * 0.46);
        parts.push(g);
      }
    }
    cr.torso.add(inked(mergeGeometries(parts), cm, OL * 0.6));
    const hp = [];
    for (const [x, h] of [[0, 0.42], [-0.28, 0.28], [0.28, 0.28]]) {
      const g = gem(headR * 0.1 * s, headR * h * s);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, v(x, 1, -0.3).normalize()));
      g.translate(x * headR, headR * 0.82, -headR * 0.1);
      hp.push(g);
    }
    cr.skull.add(inked(mergeGeometries(hp), cm, OL * 0.6));
  }

  // stone armour: shoulder slabs and heavy bracers on the paws
  if (P.stonearmor) {
    const s = P.stonearmor, rm = mat('rock', C.rock ?? 0x6e6258, { rim: 0.6 });
    const slab = (r) => { const g = new THREE.DodecahedronGeometry(r, 0); g.scale(1.15, 0.7, 1); return g; };
    for (const x of [-1, 1]) {
      const sh = inked(slab(B.w * 0.26 * s), rm, OL * 0.7);
      sh.position.set(x * B.w * B.chubby * 0.5, B.h * 0.9, 0);
      sh.rotation.set(0.2, x * 0.4, x * -0.35);
      cr.torso.add(sh);
    }
    for (const arm of cr.arms) {
      const br = inked(new THREE.CylinderGeometry(0.11 * s, 0.13 * s, B.armLen * 0.55, 7), rm, OL * 0.6);
      br.position.y = -B.armLen * 0.72;
      arm.add(br);
    }
  }
}
