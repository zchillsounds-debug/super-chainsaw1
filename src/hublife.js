import * as THREE from 'three';
import { saluki, animateSaluki, SALUKI_COATS } from './characters.js';
import { HUB, IS_MARSH, IS_DOCKS } from './region.js';
import { heightAt, waterDepth, DECKS, WATER_Y } from './terrain.js';
import { colliders, mats } from './buildings.js';
import { buildGrid, resolve } from './collision.js';
import { blocked } from './world.js';
import { freeSpot } from './sidequests.js';
import { HUBK, MAT_NAMES } from './hub.js';
import { saveGame } from './save.js';
import { haptic } from './sheets.js';
import { t } from './i18n.js';

// Round 21: life about the camp.
//  - the kennel and mews (beside the training yard): a saluki that trots at Salim's heel and fetches dinars, coat of
//    his choosing; a saker falcon that sits on his arm in camp and, out in the country, wheels overhead and marks
//    hidden men and archers. State: p.hound = { coat, on }, p.falcon = { on }.
//  - fishing (the marshes and the Tigris): cast at a fishing spot, wait for the float to go under, strike, then
//    play the fish on a timing bar. The catch is grilled for a food blessing or sold to Yusuf. p.fish, p.food.
//  - camp upgrades (the ledger beside Ishaq): mend the well, raise the stalls, rebuild the forge. Each one shows in
//    every camp and carries a perk. p.hubUp = { well, stalls, forge }.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const el = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; };
const HOUND_COST = 250, FALCON_COST = 600;
const COATS = { cream: 'Cream', fawn: 'Red fawn', blacktan: 'Black and tan', grizzle: 'Grizzle' };
export const FISH = {
  himri: { name: 'Himri', sell: 12, eat: 'regen', v: 3, desc: '+3 regeneration', speed: 1.0, zone: 0.26 },
  bunni: { name: 'Bunni', sell: 25, eat: 'lifePct', v: 10, desc: '+10% maximum life', speed: 1.3, zone: 0.22 },
  shilig: { name: 'Shilig', sell: 40, eat: 'move', v: 8, desc: '+8% movement', speed: 1.6, zone: 0.18 },
  shabbut: { name: 'Shabbut', sell: 80, eat: 'dmgPct', v: 12, desc: '+12% damage', speed: 2.0, zone: 0.15 },
};
const FISH_POOL = IS_DOCKS ? [['himri', 4], ['bunni', 3], ['shabbut', 1.5]] : [['himri', 4], ['bunni', 3], ['shilig', 1.5]];
const FOOD_TIME = 300;
export const UPGRADES = {
  well: { name: 'Mend the well', desc: 'A new frame, rope and buckets. Carry one more sherbet; sherbet heals 15% more.', gold: 1500, mats: { scrap: 10 } },
  stalls: { name: 'Raise the stalls', desc: 'Awnings and rugs for the traders. Yusuf\'s prices fall by a tenth.', gold: 2500, mats: { silk: 10 } },
  forge: { name: 'Rebuild the forge', desc: 'A brick hearth and bellows for Bishr. Tempering and forging cost a quarter less.', gold: 4000, mats: { scrap: 20, gem: 4 } },
};

const box = (g, w, h, d, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
const cyl = (g, r0, r1, h, m, x, y, z, seg = 8) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };

// ------------------------------------------------------------------ props
function K() {
  const m = mats();
  return {
    wood: m.wood, rope: new THREE.MeshStandardMaterial({ color: 0x9a8058, roughness: 1 }), stone: new THREE.MeshStandardMaterial({ color: 0xb0a088, roughness: 0.95 }),
    brick: m.mud || new THREE.MeshStandardMaterial({ color: 0xa06848, roughness: 0.95 }), dark: new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 1 }),
    water: new THREE.MeshStandardMaterial({ color: 0x2a4048, roughness: 0.1, metalness: 0.3 }), leather: new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.85 }),
    clay: new THREE.MeshStandardMaterial({ color: 0xb87a50, roughness: 0.9 }), iron: new THREE.MeshStandardMaterial({ color: 0x3a3634, metalness: 0.7, roughness: 0.5 }),
    ember: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.3), toneMapped: false }),
    clothA: new THREE.MeshStandardMaterial({ color: 0x8a2a20, roughness: 0.9, side: THREE.DoubleSide }), clothB: new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.9, side: THREE.DoubleSide }),
    clothC: new THREE.MeshStandardMaterial({ color: 0x1f3f5c, roughness: 0.9, side: THREE.DoubleSide }), straw: new THREE.MeshStandardMaterial({ color: 0xc8a860, roughness: 1 }),
  };
}
// the kennel and mews: a low wattle pen, a perch block on a post, a water trough
function kennel(k) {
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) { const a = -0.4 + i / 8 * (Math.PI + 0.8); cyl(g, 0.05, 0.06, 0.9, k.wood, Math.cos(a) * 1.5, 0.45, Math.sin(a) * 1.1 + 0.3, 5); }
  box(g, 3.1, 0.08, 0.06, k.rope, 0, 0.75, -0.7).rotation.y = 0; box(g, 0.9, 0.18, 0.4, k.wood, -0.6, 0.09, 0.8);
  const w = box(g, 0.8, 0.04, 0.3, k.water, -0.6, 0.19, 0.8); w.castShadow = false;
  cyl(g, 0.06, 0.07, 1.4, k.wood, 1.9, 0.7, -0.3, 6); cyl(g, 0.18, 0.15, 0.12, k.leather, 1.9, 1.44, -0.3, 10); // the falcon's block
  box(g, 0.9, 0.3, 0.6, k.straw, 0.6, 0.15, 0.9, 0.3);
  g.userData.colliders = [{ type: 'box', x: 0, z: 0.4, hw: 1.6, hd: 1.0 }];
  return g;
}
function ledger(k) {
  const g = new THREE.Group();
  box(g, 1.2, 0.08, 0.6, k.wood, 0, 0.75, 0); for (const [x, z] of [[-0.5, -0.24], [0.5, -0.24], [-0.5, 0.24], [0.5, 0.24]]) box(g, 0.07, 0.75, 0.07, k.wood, x, 0.37, z);
  box(g, 0.5, 0.03, 0.36, k.clothB, -0.1, 0.8, 0, 0.2); cyl(g, 0.04, 0.05, 0.08, k.clay, 0.4, 0.83, 0.1, 8);
  return g;
}
// the camp upgrades: each spot has a before and an after; the after is shown once bought
function wellBefore(k) { const g = new THREE.Group(); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; box(g, 0.45, 0.3 + (i % 3) * 0.12, 0.3, k.stone, Math.cos(a) * 0.75, 0.15, Math.sin(a) * 0.75, a); } const d = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16).rotateX(-Math.PI / 2), k.dark); d.position.y = 0.05; g.add(d); return g; }
function wellAfter(k) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.75, 18, 1, true), k.stone); ring.material = k.stone; ring.position.y = 0.37; ring.castShadow = true; g.add(ring);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.1, 6, 20).rotateX(Math.PI / 2), k.stone); rim.position.y = 0.76; g.add(rim);
  const wat = new THREE.Mesh(new THREE.CircleGeometry(0.82, 18).rotateX(-Math.PI / 2), k.water); wat.position.y = 0.4; g.add(wat);
  for (const s of [-1, 1]) { const post = cyl(g, 0.07, 0.08, 2.0, k.wood, s * 0.95, 1.0, 0, 6); post.rotation.z = s * 0.06; }
  const beam = cyl(g, 0.06, 0.06, 2.1, k.wood, 0, 1.95, 0, 6); beam.rotation.z = Math.PI / 2;
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 14), k.wood); wheel.position.set(0, 1.95, 0); g.add(wheel);
  cyl(g, 0.012, 0.012, 1.3, k.rope, 0.22, 1.3, 0, 4); cyl(g, 0.14, 0.11, 0.2, k.leather, 0.22, 0.6, 0, 10);
  for (let i = 0; i < 3; i++) cyl(g, 0.12, 0.16, 0.42, k.clay, 1.3 + i * 0.36, 0.21, 0.5 - i * 0.12, 10);
  return g;
}
function stallsBefore(k) { const g = new THREE.Group(); for (const [x, z] of [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]]) cyl(g, 0.05, 0.06, 2.2, k.wood, x, 1.1, z, 5); return g; }
function stallsAfter(k) {
  const g = new THREE.Group();
  for (const [x, z] of [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]]) cyl(g, 0.05, 0.06, 2.3, k.wood, x, 1.15, z, 5);
  // a striped awning sagging between the poles
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.0, 1, 4), i % 2 ? k.clothA : k.clothB); const p = s.geometry.attributes.position; for (let j = 0; j < p.count; j++) p.setZ(j, -Math.sin((p.getY(j) / 2 + 0.5) * Math.PI) * 0.18); s.geometry.computeVertexNormals(); s.rotation.x = -Math.PI / 2 + 0.12; s.position.set(-1.25 + i * 0.5, 2.25, 0); s.castShadow = true; g.add(s); }
  // a rug, baskets of dates and spice, rolled cloth
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4).rotateX(-Math.PI / 2), k.clothC); rug.position.y = 0.02; rug.receiveShadow = true; g.add(rug);
  for (const [x, z, c] of [[-0.8, 0.2, 0x6a3a1a], [-0.3, 0.4, 0xc87a20], [0.3, 0.3, 0x8a2a1a], [0.9, 0.1, 0xd8b040]]) { cyl(g, 0.24, 0.18, 0.28, k.straw, x, 0.14, z, 10); const top = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: c, roughness: 1 })); top.position.set(x, 0.26, z); top.scale.y = 0.5; g.add(top); }
  for (let i = 0; i < 3; i++) { const r = cyl(g, 0.1, 0.1, 0.9, [k.clothA, k.clothC, k.clothB][i], 0.2 + i * 0.22, 0.1, -0.5, 10); r.rotation.z = Math.PI / 2; }
  return g;
}
function forgeBefore(k) { const g = new THREE.Group(); for (let i = 0; i < 6; i++) box(g, 0.32, 0.18, 0.2, k.brick, (i % 3 - 1) * 0.36, 0.09 + Math.floor(i / 3) * 0.18, Math.floor(i / 3) * 0.1, i * 0.4); return g; }
function forgeAfter(k) {
  const g = new THREE.Group();
  box(g, 1.4, 0.85, 1.0, k.brick, 0, 0.42, 0); box(g, 1.5, 0.1, 1.1, k.stone, 0, 0.88, 0);
  const coals = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.08, 10), k.ember); coals.position.set(0, 0.94, 0); g.add(coals);
  box(g, 1.5, 0.7, 0.18, k.brick, 0, 1.24, -0.46); // a low back wall to the hearth, blackened above the coals
  box(g, 0.7, 0.4, 0.02, k.dark, 0, 1.2, -0.36);
  // the bellows: two boards and a leather bag, its nozzle at the hearth
  const bel = new THREE.Group(); bel.position.set(-1.1, 0.5, 0); g.add(bel); box(bel, 0.6, 0.05, 0.4, k.wood, 0, 0.12, 0); box(bel, 0.6, 0.05, 0.4, k.wood, 0, -0.12, 0); box(bel, 0.5, 0.2, 0.36, k.leather, 0, 0, 0); const nz = cyl(bel, 0.03, 0.05, 0.4, k.iron, 0.45, 0, 0, 6); nz.rotation.z = Math.PI / 2;
  const tr = box(g, 0.9, 0.35, 0.45, k.wood, 1.25, 0.18, 0.2); const w = box(g, 0.8, 0.03, 0.36, k.water, 1.25, 0.34, 0.2); w.castShadow = false; tr.castShadow = true;
  for (let i = 0; i < 3; i++) { const tl = box(g, 0.04, 0.6, 0.04, k.iron, 0.7 + i * 0.12, 1.1, 0.52); tl.rotation.z = 0.1; }
  g.userData.ember = coals;
  return g;
}

// the falcon: a saker. Round 22: rebuilt larger and truer to the bird: a tapered body leaning forward, a pale barred
// breast, the dark moustache stripe under the eye, a hooked beak with a yellow cere, long pointed wings that fold
// along the back and cross over the tail, yellow feet gripping. The wings are hinged groups that flap or fold.
function falconRig() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const M = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
  const brown = M(0x6e4e32), rufous = M(0x8a6040), pale = M(0xe0d2b4, 0.9), bar = M(0x5a4030), dark = M(0x1a1410, 0.5), beakM = M(0x3a3a40, 0.4), yellow = M(0xd8b040, 0.6);
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, into = body) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(sx, sy, sz); into.add(o); return o; };
  // body: a tapered capsule, leaning forward; the breast pale with brown bars
  add(new THREE.CapsuleGeometry(0.075, 0.15, 4, 10), brown, 0, 0, -0.01, -0.35, 0, 0, 1, 1, 0.9);
  add(new THREE.SphereGeometry(0.07, 10, 8), pale, 0, 0.0, 0.035, -0.35, 0, 0, 0.95, 1.5, 0.7);
  for (let i = 0; i < 4; i++) add(new THREE.TorusGeometry(0.05 - i * 0.004, 0.006, 3, 10, Math.PI * 0.9), bar, 0, 0.04 - i * 0.035, 0.07 - i * 0.008, 0.2, 0, Math.PI * 1.05, 1, 0.6, 1);
  // head: rounded, brown cap, pale cheek, dark moustache stripe, big dark eye with a yellow ring, hooked beak
  const head = new THREE.Group(); head.position.set(0, 0.155, 0.04); body.add(head);
  add(new THREE.SphereGeometry(0.058, 12, 10), rufous, 0, 0, 0, 0, 0, 0, 1, 0.95, 1.05, head);
  add(new THREE.SphereGeometry(0.045, 10, 8), pale, 0, -0.018, 0.022, 0, 0, 0, 1.1, 0.8, 0.8, head);
  for (const sd of [-1, 1]) {
    add(new THREE.BoxGeometry(0.012, 0.04, 0.012), dark, sd * 0.04, -0.03, 0.03, 0, 0, sd * 0.2, 1, 1, 1, head);
    add(new THREE.SphereGeometry(0.014, 8, 6), yellow, sd * 0.034, 0.008, 0.035, 0, 0, 0, 1, 1, 1, head);
    add(new THREE.SphereGeometry(0.011, 8, 6), dark, sd * 0.038, 0.009, 0.039, 0, 0, 0, 1, 1, 1, head);
  }
  add(new THREE.SphereGeometry(0.014, 6, 5), yellow, 0, 0.0, 0.055, 0, 0, 0, 1, 0.8, 1, head); // the cere
  add(new THREE.ConeGeometry(0.014, 0.04, 6), beakM, 0, -0.012, 0.072, Math.PI / 2 + 0.9, 0, 0, 1, 1, 1, head);
  // tail: long, a little fanned, barred at the tip
  add(new THREE.BoxGeometry(0.075, 0.2, 0.012), brown, 0, -0.18, -0.07, -0.5);
  add(new THREE.BoxGeometry(0.078, 0.03, 0.014), dark, 0, -0.27, -0.115, -0.5);
  // feet: yellow, gripping
  for (const sd of [-1, 1]) { add(new THREE.CylinderGeometry(0.01, 0.009, 0.06, 5), yellow, sd * 0.03, -0.11, 0.02); add(new THREE.BoxGeometry(0.03, 0.01, 0.045), yellow, sd * 0.03, -0.14, 0.03); }
  // wings: a long pointed blade from the shoulder, swept back, darker at the primaries
  const blade = new THREE.Shape(); blade.moveTo(0, 0.05); blade.quadraticCurveTo(0.18, 0.07, 0.42, -0.06); blade.quadraticCurveTo(0.2, -0.06, 0, -0.07); blade.lineTo(0, 0.05);
  const bladeG = new THREE.ExtrudeGeometry(blade, { depth: 0.01, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, 0.005, 0);
  const tipS = new THREE.Shape(); tipS.moveTo(0.26, 0.0); tipS.quadraticCurveTo(0.36, 0.0, 0.42, -0.06); tipS.quadraticCurveTo(0.33, -0.06, 0.24, -0.06); tipS.lineTo(0.26, 0.0);
  const tipG = new THREE.ExtrudeGeometry(tipS, { depth: 0.012, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, 0.006, 0);
  const wings = [];
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.position.set(s * 0.055, 0.06, -0.02); body.add(hinge);
    const w = new THREE.Mesh(bladeG, brown); w.scale.x = s; hinge.add(w);
    const tp = new THREE.Mesh(tipG, dark); tp.scale.x = s; hinge.add(tp);
    wings.push({ hinge, s });
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.material.side = THREE.DoubleSide; } });
  g.scale.setScalar(1.3);
  g.userData = { body, wings, head };
  return g;
}

export function setupHubLife(g) {
  const p = g.player, k = K();
  p.hound ||= null; p.falcon ||= null; p.fish ||= {}; p.hubUp ||= {};
  const H = HUB;
  const near = (x, z, r) => Math.hypot(p.pos.x - x, p.pos.z - z) < r;
  const inCamp = () => !g.interior && near(H.ishaq[0], H.ishaq[1], 26);

  // ================================================================== the kennel and mews
  const [kx, kz] = freeSpot(H.trainer[0] - 5, H.trainer[1] + 3, 2.2);
  { const o = kennel(k); o.position.set(kx, heightAt(kx, kz), kz); o.rotation.y = Math.atan2(H.spawn[0] - kx, H.spawn[1] - kz); g.scene.add(o); colliders.push({ type: 'circle', x: kx, z: kz, r: 1.5 }); }
  g.interactables.push({ pos: V(kx, heightAt(kx, kz), kz), r: 3, label: 'The kennel and mews', act: () => mewsPanel() });
  g.pois?.push({ x: kx, z: kz, icon: '🐾', color: '#d8b888' });

  // ---------------- the hound
  let hound = null;
  const hst = { phase: 0, walkBlend: 0, speedK: 1, sit: 0, sniff: 0, happy: 0, seed: 2.1 };
  const HD = { pos: V(kx + 1, 0, kz + 1), facing: 0, fetch: null, barkT: 0 };
  const makeHound = (coat) => { if (hound) g.scene.remove(hound); hound = saluki(coat); hound.visible = false; g.scene.add(hound); };
  makeHound(p.hound?.coat || 'fawn');
  const houndOn = () => p.hound?.on && !g.interior && !g.cinematic;

  // ---------------- the falcon
  const falcon = falconRig(); falcon.visible = false; g.scene.add(falcon);
  const FC = { pos: V(), ang: 0, mode: 'perch', scanT: 4, dive: null };
  // marks over the men the falcon has seen: a red chevron that bobs over the head, and the hidden shown
  const markM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.5, 0.3), toneMapped: false, transparent: true, opacity: 0.9, depthWrite: false });
  const marks = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.36, 4).rotateX(Math.PI), markM); m.visible = false; g.scene.add(m); return { m, e: null, t: 0 }; });
  const falconOn = () => p.falcon?.on && !g.cinematic && (!g.interior || g.interior.hold);

  function mewsPanel() {
    document.getElementById('shop')?.remove(); g.closePanels?.();
    const coat = p.hound?.coat || 'fawn';
    const w = document.createElement('div'); w.id = 'shop'; w.className = 'panel mews';
    w.innerHTML = `<div class="ptitle">${t('The kennel and mews')} <span class="close" role="button" aria-label="Close">✕</span></div><div class="sbody">
      <div class="cgroup"><div class="ch">${t('Saluki')}</div>
        <div class="slabel">${t('A hunting hound of the desert Arabs: fast, quiet, and fond of anything that shines. He keeps clear of a fight and brings back the dinars that fall.')}</div>
        ${p.hound ? `<div class="chips">${Object.entries(COATS).map(([c, n]) => `<button class="chip ${c === coat ? 'on' : ''}" data-coat="${c}"><i class="sw" style="background:#${SALUKI_COATS[c][0].toString(16).padStart(6, '0')}"></i>${t(n)}</button>`).join('')}</div>
          <div class="row2"><button class="sbtn hon">${p.hound.on ? t('Leave him at the kennel') : t('Bring him along')}</button></div>`
        : `<div class="row2"><button class="sbtn hbuy" ${p.gold >= HOUND_COST ? '' : 'disabled'}>${t('Buy the saluki')} · ◉ ${HOUND_COST}</button></div>`}</div>
      <div class="cgroup"><div class="ch">${t('Saker falcon')}</div>
        <div class="slabel">${t('Sits on your arm in camp. In the country she circles overhead and marks men hiding in the reeds, and archers.')}</div>
        ${p.falcon ? `<div class="row2"><button class="sbtn fon">${p.falcon.on ? t('Leave her on the block') : t('Take her with you')}</button></div>`
        : `<div class="row2"><button class="sbtn fbuy" ${p.gold >= FALCON_COST ? '' : 'disabled'}>${t('Buy the falcon')} · ◉ ${FALCON_COST}</button></div>`}</div></div>`;
    g.ui.root.appendChild(w);
    const re = () => { saveGame(g); mewsPanel(); };
    w.querySelector('.close').onclick = () => w.remove();
    w.querySelector('.hbuy')?.addEventListener('click', () => { if (p.gold < HOUND_COST) return; p.gold -= HOUND_COST; p.hound = { coat: 'fawn', on: true }; HD.pos.set(kx + 1, 0, kz + 1); g.audio.bark?.(); haptic(12); re(); });
    w.querySelector('.fbuy')?.addEventListener('click', () => { if (p.gold < FALCON_COST) return; p.gold -= FALCON_COST; p.falcon = { on: true }; g.audio.cry?.(); haptic(12); re(); });
    w.querySelector('.hon')?.addEventListener('click', () => { p.hound.on = !p.hound.on; re(); });
    w.querySelector('.fon')?.addEventListener('click', () => { p.falcon.on = !p.falcon.on; re(); });
    w.querySelectorAll('[data-coat]').forEach((b) => b.onclick = () => { p.hound.coat = b.dataset.coat; makeHound(p.hound.coat); g.audio.bark?.(); re(); });
  }

  // ================================================================== camp upgrades
  const [lx, lz] = freeSpot(H.ishaq[0] + 3.5, H.ishaq[1] + 2.5, 1.3);
  { const o = ledger(k); o.position.set(lx, heightAt(lx, lz), lz); o.rotation.y = Math.atan2(H.spawn[0] - lx, H.spawn[1] - lz); g.scene.add(o); colliders.push({ type: 'circle', x: lx, z: lz, r: 0.7 }); }
  g.interactables.push({ pos: V(lx, heightAt(lx, lz), lz), r: 2.4, label: 'The camp\'s needs', act: () => campPanel() });
  const spots = {};
  for (const [key, at, mk0, mk1] of [['well', [H.ishaq[0] - 4, H.ishaq[1] - 4], wellBefore, wellAfter], ['stalls', [H.merchant[0] + 3.2, H.merchant[1] - 1.5], stallsBefore, stallsAfter], ['forge', [H.smith[0] + 4.8, H.smith[1] - 2.6], forgeBefore, forgeAfter]]) {
    const [x, z] = freeSpot(at[0], at[1], 1.6), y = heightAt(x, z), ry = Math.atan2(H.spawn[0] - x, H.spawn[1] - z);
    const a = mk0(k), b = mk1(k); for (const o of [a, b]) { o.position.set(x, y, z); o.rotation.y = ry; g.scene.add(o); }
    colliders.push({ type: 'circle', x, z, r: key === 'stalls' ? 0.4 : 1.0 });
    spots[key] = { a, b, x, z };
  }
  const showUpgrades = () => { for (const [key, s] of Object.entries(spots)) { const on = !!p.hubUp[key]; s.a.visible = !on; s.b.visible = on; } HUBK.forge = p.hubUp.forge ? 0.75 : 1; };
  showUpgrades();
  function campPanel() {
    document.getElementById('shop')?.remove(); g.closePanels?.();
    const w = document.createElement('div'); w.id = 'shop'; w.className = 'panel camp';
    const can = (U) => p.gold >= U.gold && Object.entries(U.mats).every(([m, n]) => (p.mats?.[m] || 0) >= n);
    w.innerHTML = `<div class="ptitle">${t('The camp\'s needs')} <span class="close" role="button" aria-label="Close">✕</span></div><div class="sbody">
      <div class="slabel">${t('Ishaq keeps the camp\'s accounts. What you build here goes with the company to every camp.')}</div>
      <div class="slist">${Object.entries(UPGRADES).map(([key, U]) => `<div class="srow"><div class="bico">${p.hubUp[key] ? '✓' : { well: '◍', stalls: '⌂', forge: '⚒' }[key]}</div><div class="sinfo"><b>${t(U.name)}</b><small>${t(U.desc)}</small>${p.hubUp[key] ? '' : `<small>◉ ${U.gold} · ${Object.entries(U.mats).map(([m, n]) => `${n} ${t(MAT_NAMES[m])}`).join(' · ')}</small>`}</div>${p.hubUp[key] ? `<span class="done">${t('Done')}</span>` : `<button class="sbtn" data-up="${key}" ${can(U) ? '' : 'disabled'}>${t('Build')}</button>`}</div>`).join('')}</div></div>`;
    g.ui.root.appendChild(w);
    w.querySelector('.close').onclick = () => w.remove();
    w.querySelectorAll('[data-up]').forEach((b) => b.onclick = () => {
      const key = b.dataset.up, U = UPGRADES[key]; if (!can(U)) { g.audio.denied?.(); return; }
      p.gold -= U.gold; for (const [m, n] of Object.entries(U.mats)) p.mats[m] -= n;
      p.hubUp[key] = true; showUpgrades(); g.recalcStats(); g.audio.clang?.(); g.audio.levelUp?.(); haptic(16);
      const s = spots[key]; g.fx.dust(V(s.x, heightAt(s.x, s.z) + 0.3, s.z), 24, 2);
      g.ui.toast(`${t(U.name)}: ${t('done')}`); saveGame(g); campPanel();
    });
  }

  // ================================================================== fishing
  const fishSpots = [];
  if (IS_MARSH) {
    // banks near the camp with open water a few metres out
    const found = [];
    for (let r = 10; r < 60 && found.length < 3; r += 3) for (let a = 0; a < Math.PI * 2 && found.length < 3; a += 0.35) {
      const x = H.ishaq[0] + Math.cos(a) * r, z = H.ishaq[1] + Math.sin(a) * r;
      if (Math.abs(x) > 120 || Math.abs(z) > 120 || waterDepth(x, z) > 0.02 || blocked(x, z, 0.8)) continue;
      for (let b = 0; b < 8; b++) { const fa = b / 8 * Math.PI * 2, wx = x + Math.sin(fa) * 5, wz = z + Math.cos(fa) * 5; if (waterDepth(wx, wz) > 0.35 && waterDepth(x + Math.sin(fa) * 2.5, z + Math.cos(fa) * 2.5) > 0.1 && !found.some((f) => Math.hypot(f.x - x, f.z - z) < 18)) { found.push({ x, z, face: fa }); break; } }
    }
    fishSpots.push(...found);
  } else if (IS_DOCKS) {
    // the end of each jetty, looking out over the Tigris
    for (const [, x1, dz] of DECKS) fishSpots.push({ x: x1 - 0.9, z: dz, face: Math.PI / 2, deck: true });
  }
  const rod = new THREE.Group(); rod.visible = false; g.scene.add(rod);
  { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.016, 2.4, 5).translate(0, 1.2, 0), k.wood); r.rotation.x = 0.9; rod.add(r); rod.userData.tip = V(0, 2.4 * Math.cos(0.9), 2.4 * Math.sin(0.9)); }
  const lineM = new THREE.LineBasicMaterial({ color: 0xd8d0c0, transparent: true, opacity: 0.7 });
  const lineG = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const line = new THREE.Line(lineG, lineM); line.frustumCulled = false; line.visible = false; g.scene.add(line);
  const float = new THREE.Group(); float.visible = false; g.scene.add(float);
  { const a = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshStandardMaterial({ color: 0xc83020, roughness: 0.5 })); float.add(a); const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.5 })); b.position.y = -0.05; float.add(b); }
  for (const S of fishSpots) {
    const y = heightAt(S.x, S.z);
    g.interactables.push({ pos: V(S.x, y, S.z), r: 2.4, label: 'Fish here', act: () => fishPanel(S) });
    g.pois?.push({ x: S.x, z: S.z, icon: '≈', color: '#8ac0d8' });
  }
  const ov = document.createElement('div'); ov.id = 'fishing'; ov.className = 'hide';
  ov.innerHTML = `<div class="fmsg"></div><div class="fbar"><div class="fzone"></div><div class="fneedle"></div></div><div class="fdots"></div><div class="frow"><button class="fbtn">${t('Strike')}</button><button class="fquit">✕</button></div>`;
  document.getElementById('ui').appendChild(ov);
  const msg = ov.querySelector('.fmsg'), bar = ov.querySelector('.fbar'), zoneEl = ov.querySelector('.fzone'), needle = ov.querySelector('.fneedle'), dots = ov.querySelector('.fdots'), fbtn = ov.querySelector('.fbtn');
  let F = null; // the cast: { S, phase: 'wait'|'bite'|'reel'|'done', t, fish, hits, miss, needle, zone }
  const pickFish = () => { const tot = FISH_POOL.reduce((a, [, w]) => a + w, 0); let r = Math.random() * tot; for (const [k2, w] of FISH_POOL) { if ((r -= w) <= 0) return k2; } return FISH_POOL[0][0]; };
  function fishPanel(S) {
    document.getElementById('shop')?.remove(); g.closePanels?.();
    const w = document.createElement('div'); w.id = 'shop'; w.className = 'panel fishp';
    const catchRows = Object.entries(p.fish).filter(([, n]) => n > 0).map(([f, n]) => `<div class="srow"><div class="bico">≈</div><div class="sinfo"><b>${t(FISH[f].name)} ×${n}</b><small>${t('Grilled')}: ${t(FISH[f].desc)} · ${Math.round(FOOD_TIME / 60)} ${t('min')}</small></div><button class="sbtn" data-eat="${f}">${t('Grill and eat')}</button></div>`).join('') || `<div class="slabel">${t('Nothing caught yet.')}</div>`;
    const food = p.food && p.food.left > 0 ? `<div class="slabel creward">${t('You have eaten')}: ${t(FISH[p.food.k].name)} · ${t(FISH[p.food.k].desc)} · ${Math.ceil(p.food.left / 60)} ${t('min')}</div>` : '';
    w.innerHTML = `<div class="ptitle">${t('Fishing')} <span class="close" role="button" aria-label="Close">✕</span></div><div class="sbody">
      <div class="slabel">${t('Cast, and wait for the float to go under. Strike at once, then play the fish: tap when the needle is in the green. Three good pulls land it; two bad ones and it is gone.')}</div>
      <div class="row2"><button class="sbtn go">${t('Cast a line')}</button></div>${food}
      <div class="cgroup"><div class="ch">${t('Your catch')}</div><div class="slist">${catchRows}</div><div class="slabel">${t('Yusuf buys fish at the camp.')}</div></div></div>`;
    g.ui.root.appendChild(w);
    w.querySelector('.close').onclick = () => w.remove();
    w.querySelector('.go').onclick = () => { w.remove(); cast(S); };
    w.querySelectorAll('[data-eat]').forEach((b) => b.onclick = () => { eat(b.dataset.eat); fishPanel(S); });
  }
  function eat(f) {
    if (!(p.fish[f] > 0)) return;
    p.fish[f]--; p.food = { k: f, left: FOOD_TIME }; g.recalcStats(); g.audio.potion?.(); haptic(10);
    g.ui.toast(`${t(FISH[f].name)}: ${t(FISH[f].desc)}`); saveGame(g);
  }
  function cast(S) {
    if (g.enemies.some((e) => !e.dead && e.alerted && e.pos.distanceTo(p.pos) < 22)) { g.ui.toast(t('Not with foes so near')); return; }
    g.mount?.dismount?.(true);
    p.pos.set(S.x, heightAt(S.x, S.z), S.z); p.facing = S.face; p.moveTo = null; p.target = null; g.walk = null;
    const fx = S.x + Math.sin(S.face) * 6, fz = S.z + Math.cos(S.face) * 6;
    F = { S, phase: 'wait', t: 0, wait: 2 + Math.random() * 4, fish: pickFish(), hits: 0, miss: 0, nd: 0, at: V(fx, WATER_Y + 0.03, fz) };
    float.position.copy(F.at); float.visible = rod.visible = line.visible = true;
    p.st.action = 'throw'; p.st.actionT = 0; p.actionDur = 0.6; p.hitApplied = true;
    g.audio.whoosh?.(); setTimeout(() => g.audio.splashSmall?.(), 450);
    ov.classList.remove('hide'); ov.classList.remove('reel'); bar.classList.add('hide'); msg.textContent = t('Wait for a bite…'); fbtn.textContent = t('Strike'); dots.innerHTML = '';
    document.body.classList.add('fishing');
  }
  function endCast(text) {
    F = null; float.visible = rod.visible = line.visible = false; document.body.classList.remove('fishing');
    if (text) { msg.textContent = text; setTimeout(() => { if (!F) ov.classList.add('hide'); }, 1200); } else ov.classList.add('hide');
  }
  fbtn.onclick = (ev) => {
    ev.stopPropagation(); if (!F) return; haptic(8);
    if (F.phase === 'wait') { g.audio.denied?.(); endCast(t('Too soon: it took fright')); return; }
    if (F.phase === 'bite') {
      const D = FISH[F.fish]; F.phase = 'reel'; F.t = 0; F.zone = 0.5 + (Math.random() - 0.5) * 0.4; F.zw = D.zone;
      zoneEl.style.left = `${(F.zone - F.zw / 2) * 100}%`; zoneEl.style.width = `${F.zw * 100}%`;
      bar.classList.remove('hide'); ov.classList.add('reel'); msg.textContent = t('Play the fish!'); fbtn.textContent = t('Pull');
      g.audio.clang?.(); return;
    }
    if (F.phase === 'reel') {
      const inZone = Math.abs(F.nd - F.zone) <= F.zw / 2;
      if (inZone) { F.hits++; g.audio.pickup?.(); F.zone = 0.15 + Math.random() * 0.7; zoneEl.style.left = `${(F.zone - F.zw / 2) * 100}%`; } else { F.miss++; g.audio.denied?.(); }
      dots.innerHTML = '●'.repeat(F.hits) + '○'.repeat(Math.max(0, 3 - F.hits)) + (F.miss ? ` <i>${'✕'.repeat(F.miss)}</i>` : '');
      if (F.hits >= 3) { const f = F.fish; p.fish[f] = (p.fish[f] || 0) + 1; g.audio.legendary?.(); g.fx.burst?.(F.at.clone().setY(F.at.y + 0.2), 14, { speed: 2.5, life: 0.6, size: 0.1, size1: 0.03, color: new THREE.Color(0.8, 0.9, 1.0) }); saveGame(g); endCast(`${t('Landed')}: ${t(FISH[f].name)}!`); }
      else if (F.miss >= 2) endCast(t('The line went slack: it got away'));
    }
  };
  ov.querySelector('.fquit').onclick = (ev) => { ev.stopPropagation(); endCast(); };
  // Yusuf buys fish
  g.merchantExtra = (body, refresh) => {
    const have = Object.entries(p.fish).filter(([, n]) => n > 0); if (!have.length) return;
    const row = el(`<div class="fishsell"><div class="slabel">${t('Your catch')}</div><div class="chips">${have.map(([f, n]) => `<button class="chip" data-sell="${f}">${t(FISH[f].name)} ×${n} · ◉ ${FISH[f].sell}</button>`).join('')}</div></div>`);
    row.querySelectorAll('[data-sell]').forEach((b) => b.onclick = () => { const f = b.dataset.sell; if (!(p.fish[f] > 0)) return; p.fish[f]--; p.gold += FISH[f].sell; g.audio.gold?.(); saveGame(g); refresh(); });
    body.appendChild(row);
  };

  // ================================================================== stats: food and the well
  const baseRecalc = g.recalcStats.bind(g);
  g.recalcStats = () => {
    baseRecalc();
    const s = p.stats;
    if (p.hubUp.well) { s.potCapB = (s.potCapB || 0) + 1; s.potHeal = (s.potHeal || 0) + 15; }
    if (p.food && p.food.left > 0) {
      const D = FISH[p.food.k];
      if (D.eat === 'lifePct') { const add = Math.round(s.maxHp * D.v / 100); s.maxHp += add; }
      else if (D.eat === 'dmgPct') { const k2 = 1 + D.v / 100; s.min = Math.round(s.min * k2); s.max = Math.round(s.max * k2); }
      else s[D.eat] = (s[D.eat] || 0) + D.v;
    }
    p.hp = Math.min(p.hp, s.maxHp);
  };
  g.recalcStats();

  // ================================================================== per frame
  const prevTick = g.tickExtra;
  let foodT = 0;
  g.tickExtra = (dt) => {
    prevTick?.(dt);
    if (p.food && p.food.left > 0 && !g.cinematic) { p.food.left -= dt; if ((foodT += dt) > 5) { foodT = 0; } if (p.food.left <= 0) { p.food = null; g.recalcStats(); g.ui.toast(t('The meal has worn off')); } }
    tickHound(dt); tickFalcon(dt); tickFishing(dt);
  };

  function tickHound(dt) {
    if (!hound) return;
    const on = houndOn() && !p.dead;
    hound.visible = on; if (!on) { HD.fetch = null; return; }
    if (HD.pos.distanceTo(p.pos) > 28) { HD.pos.set(p.pos.x - Math.sin(p.facing) * 3, 0, p.pos.z - Math.cos(p.facing) * 3); resolve(HD.pos, 0.35); }
    const danger = g.enemies.some((e) => !e.dead && !e.hidden && e.alerted && e.pos.distanceTo(p.pos) < 12);
    // fetch: the nearest dinars within 12 m, if no fight is on
    if (!danger && (!HD.fetch || !g.drops.includes(HD.fetch))) HD.fetch = g.drops.filter((d) => d.item.gold && d.t > 0.6 && d.mesh.position.distanceTo(p.pos) < 12).sort((a, b) => a.mesh.position.distanceTo(HD.pos) - b.mesh.position.distanceTo(HD.pos))[0] || null;
    if (danger) HD.fetch = null;
    let goal, run = false;
    if (HD.fetch) { goal = HD.fetch.mesh.position; run = true; }
    else {
      // at heel: behind and to his left; further back while there is fighting
      const back = danger ? 5 : 2.2, side = danger ? 1.5 : 1.2;
      goal = tmp.set(p.pos.x - Math.sin(p.facing) * back + Math.cos(p.facing) * side, 0, p.pos.z - Math.cos(p.facing) * back - Math.sin(p.facing) * side);
    }
    const dx = goal.x - HD.pos.x, dz = goal.z - HD.pos.z, d = Math.hypot(dx, dz);
    const pv = Math.hypot(p.vel?.x || 0, p.vel?.z || 0);
    const want = d > 0.4 ? Math.min(run ? 9.5 : Math.max(pv * 1.15, d > 4 ? 8 : 3.2), d / Math.max(dt, 1e-3)) : 0;
    if (want > 0.05) { HD.pos.x += dx / d * want * dt; HD.pos.z += dz / d * want * dt; resolve(HD.pos, 0.35); HD.facing += angDiff(HD.facing, Math.atan2(dx, dz)) * Math.min(1, dt * 8); }
    else HD.facing += angDiff(HD.facing, p.facing) * Math.min(1, dt * 1.5);
    if (HD.fetch && d < 0.8) { g.tryPickup(HD.fetch); HD.fetch = null; hst.happy = 1; if (Math.random() < 0.5) g.audio.bark?.(); }
    if (danger && (HD.barkT -= dt) < 0) { HD.barkT = 2.5 + Math.random() * 3; g.audio.at?.(HD.pos, () => g.audio.bark?.()); }
    hst.speedK = want / 4.5; hst.walkBlend = THREE.MathUtils.lerp(hst.walkBlend, want > 0.3 ? 1 : 0, Math.min(1, dt * 6));
    hst.phase += dt * want * 2.4; hst.sit = THREE.MathUtils.lerp(hst.sit, want < 0.1 && pv < 0.3 && !danger ? 1 : 0, Math.min(1, dt * 2)); hst.happy = Math.max(0, hst.happy - dt * 0.4);
    hst.sniff = THREE.MathUtils.lerp(hst.sniff, HD.fetch && d < 2.5 ? 1 : 0, Math.min(1, dt * 5));
    HD.pos.y = g.interior ? 0 : heightAt(HD.pos.x, HD.pos.z);
    hound.position.copy(HD.pos); hound.rotation.y = HD.facing - Math.PI / 2;
    animateSaluki(hound, hst, g.t);
  }

  function tickFalcon(dt) {
    const on = falconOn() && !p.dead;
    falcon.visible = on; for (const M of marks) if (M.t > 0) { M.t -= dt; const e = M.e; if (M.t <= 0 || !e || e.dead) { M.m.visible = false; M.t = 0; } else { M.m.visible = true; M.m.position.set(e.pos.x, e.pos.y + 2.5 + Math.sin(g.t * 5) * 0.1, e.pos.z); M.m.rotation.y += dt * 3; } }
    if (!on) return;
    const W = falcon.userData.wings, body = falcon.userData.body;
    const perch = inCamp() && !p.st.mounted;
    if (perch) {
      // on his left forearm (on the shoulder when he carries a shield there)
      const parts = p.rig.userData.parts, shield = p.cls === 'faris' || p.cls === 'rami'; // a shield or a bow in the left hand
      const bone = shield ? parts.upperChest || parts.chest : parts.elL || parts.handL;
      if (bone) { bone.updateWorldMatrix(true, false); bone.localToWorld(tmp.set(shield ? 0.16 : 0, shield ? 0.2 : -0.12, shield ? -0.02 : 0)); }
      else tmp.copy(p.pos).setY(p.pos.y + 1.5);
      FC.pos.lerp(tmp, FC.mode === 'perch' ? 1 : Math.min(1, dt * 4)); FC.mode = FC.pos.distanceTo(tmp) < 0.3 ? 'perch' : 'land';
      falcon.position.copy(FC.pos).setY(FC.pos.y + 0.12); falcon.rotation.set(0, p.facing + 0.6, 0);
      for (const w of W) { const fold = FC.mode === 'perch'; w.hinge.rotation.set(fold ? -0.35 : 0, fold ? w.s * 1.25 : 0, fold ? -w.s * 1.25 + Math.sin(g.t * 1.3) * 0.02 : Math.sin(g.t * 22) * 0.9 * w.s); }
      if (falcon.userData.head) falcon.userData.head.rotation.y = Math.sin(g.t * 0.7) * 0.6 * (Math.sin(g.t * 0.23) > 0 ? 1 : 0); // she looks about
      body.rotation.x = FC.mode === 'perch' ? 0 : 0.9;
      return;
    }
    // wheeling overhead; a stoop toward each man she marks
    FC.mode = 'fly'; FC.ang += dt * 0.55;
    let goal = tmp.set(p.pos.x + Math.cos(FC.ang) * 7, p.pos.y + 9 + Math.sin(FC.ang * 2.3) * 0.8, p.pos.z + Math.sin(FC.ang) * 7);
    if (FC.dive) { FC.dive.t += dt; const e = FC.dive.e, k2 = Math.sin(Math.min(1, FC.dive.t / 1.4) * Math.PI); goal = tmp.set(e.pos.x, e.pos.y + 3.5, e.pos.z).lerp(tmp2.set(p.pos.x, p.pos.y + 9, p.pos.z), 1 - k2); if (FC.dive.t > 1.4) FC.dive = null; }
    const prev = tmp2.copy(FC.pos); FC.pos.lerp(goal, Math.min(1, dt * (FC.dive ? 3 : 1.6)));
    const vx = FC.pos.x - prev.x, vz = FC.pos.z - prev.z;
    falcon.position.copy(FC.pos); if (Math.abs(vx) + Math.abs(vz) > 1e-4) falcon.rotation.set(0, Math.atan2(vx, vz), 0);
    body.rotation.x = Math.PI / 2 - 0.15; body.rotation.z = Math.sin(FC.ang) * 0.3;
    for (const w of W) { w.hinge.rotation.set(0, 0, FC.dive ? -w.s * 0.6 : Math.sin(g.t * (Math.sin(g.t * 0.4) > 0.3 ? 0 : 14)) * 0.7 * w.s); }
    // the scan: hidden men and archers within 32 m
    if ((FC.scanT -= dt) <= 0) {
      FC.scanT = 9;
      const foes = (g.interior ? g.interior.enemies : g.enemies).filter((e) => !e.dead && (e.hidden || e.ghost || e.T?.ranged) && e.pos.distanceTo(p.pos) < 32 && !marks.some((M) => M.e === e && M.t > 0)).slice(0, marks.length);
      let n = 0;
      for (const e of foes) { const M = marks.find((m) => m.t <= 0); if (!M) break; M.e = e; M.t = 7; n++; }
      if (n) { FC.dive = { e: foes[0], t: 0 }; g.audio.cry?.(); if (!FC.told) { FC.told = true; g.ui.toast(t('The falcon marks men you cannot see')); } }
    }
  }

  function tickFishing(dt) {
    if (!F) return;
    const S = F.S;
    if (p.dead || g.cinematic || Math.hypot(p.pos.x - S.x, p.pos.z - S.z) > 1.2 || g.enemies.some((e) => !e.dead && e.alerted && e.pos.distanceTo(p.pos) < 14)) { endCast(); return; }
    F.t += dt;
    p.facing = S.face; p.rig.rotation.y = S.face;
    // the rod in his hands; the line to the float
    const hand = p.rig.userData.parts.handR; hand.updateWorldMatrix(true, false); hand.getWorldPosition(rod.position); rod.rotation.set(0, S.face, 0);
    rod.updateMatrixWorld(true); const tip = rod.localToWorld(tmp.copy(rod.userData.tip));
    let y = F.at.y + Math.sin(g.t * 2.2) * 0.015;
    if (F.phase === 'wait' && F.t > F.wait) { F.phase = 'bite'; F.t = 0; msg.textContent = t('A bite! Strike!'); ov.classList.add('bite'); g.audio.splashSmall?.(); haptic([20, 40, 20]); g.fx.ring?.(F.at, new THREE.Color(0.8, 0.9, 1.0), 0.1, 0.8, 0.5); }
    if (F.phase === 'bite') { y = F.at.y - 0.08 + Math.sin(g.t * 18) * 0.03; if (F.t > 0.95) { ov.classList.remove('bite'); endCast(t('Too slow: it took the bait and went')); return; } }
    else ov.classList.remove('bite');
    if (F.phase === 'reel') {
      const D = FISH[F.fish]; F.nd = 0.5 + Math.sin(F.t * 2.4 * D.speed) * 0.48 * Math.min(1, 0.6 + F.t * 0.2);
      needle.style.left = `${F.nd * 100}%`; y = F.at.y - 0.04 + Math.sin(g.t * 9) * 0.04;
      // the fish runs: the float darts about
      float.position.x = F.at.x + Math.sin(F.t * 1.7) * 0.5; float.position.z = F.at.z + Math.cos(F.t * 1.3) * 0.5;
    }
    float.position.y = y;
    const a = lineG.attributes.position.array; a[0] = tip.x; a[1] = tip.y; a[2] = tip.z; a[3] = float.position.x; a[4] = float.position.y; a[5] = float.position.z; lineG.attributes.position.needsUpdate = true;
  }

  // a loaded save arrives after setup: show what was built, the hound's coat, the meal still in effect
  const prevRestore = g.restoreSide;
  g.restoreSide = () => { prevRestore?.(); p.fish ||= {}; p.hubUp ||= {}; showUpgrades(); if (p.hound) makeHound(p.hound.coat); g.recalcStats(); };
  g.hubLife = { showUpgrades, mewsPanel, campPanel, fishPanel, fishSpots, eat, cast, get F() { return F; }, get hound() { return hound; }, HD, falcon, FC, marks, spots, kennel: [kx, kz], ledger: [lx, lz], strike: () => fbtn.onclick({ stopPropagation() {} }) };
  buildGrid();
}
