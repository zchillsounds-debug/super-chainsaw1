import * as THREE from 'three';
import { heightAt, canalX, roadDist, SITES, WORLD, HAMRIN_WALK, rawHeight } from './terrain.js';
import { colliders, mats } from './buildings.js';
import { grassField, rocks, shrubs } from './vegetation.js';
import { firePit, tent, jar, crate, deadTree, cart, lanternPost } from './props.js';
import { compoundWall, wellHead } from './regionprops.js';
import { place, blocked } from './world.js';
import { buildGrid } from './collision.js';
import { IS_HAMRIN, IS_DOCKS, HUB } from './region.js';
import { CODEX, unlock } from './narrative.js';
import { saveGame } from './save.js';
import { freeSpot } from './sidequests.js';
import { t } from './i18n.js';

// Round 21: the Hamrin hills, the endgame map (Round 23: the last of Arsaber's company holds it, on the road toward the frontier). A ridge of limestone north-east of Baghdad where deserters from both
// armies went to ground after the siege. The gorge floors are the only ground a man can walk; the rock between them
// rises in cliffs. The deserters' camp is the hub; the four holds open off the gorges (holds.js builds their insides):
//   the Quarry Galleries (west), the Cliff Fort (east), the Gorge Bridge (south) and Tatzates' hold (south-west).
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const M = () => {
  const m = mats();
  return {
    stake: m.wood, rope: new THREE.MeshStandardMaterial({ color: 0x8a7050, roughness: 1 }),
    stone: new THREE.MeshStandardMaterial({ color: 0xb4a890, roughness: 0.95 }), dark: new THREE.MeshBasicMaterial({ color: 0x0a0806 }),
    straw: new THREE.MeshStandardMaterial({ color: 0xc8a860, roughness: 1 }), iron: new THREE.MeshStandardMaterial({ color: 0x3a3634, metalness: 0.7, roughness: 0.5 }),
  };
};
const box = (g, w, h, d, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
const cyl = (g, r0, r1, h, m, x, y, z, seg = 8) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };

// a run of sharpened stakes (a palisade), along x
function palisade(len, K, rnd) {
  const g = new THREE.Group();
  for (let x = -len / 2; x <= len / 2; x += 0.34) { const h = 2.2 + rnd() * 0.5; cyl(g, 0.15, 0.17, h, K.stake, x, h / 2, (rnd() - 0.5) * 0.08, 6); const c = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 6), K.stake); c.position.set(x, h + 0.2, 0); g.add(c); }
  box(g, len, 0.12, 0.1, K.rope, 0, 1.4, 0.2); box(g, len, 0.12, 0.1, K.rope, 0, 0.6, 0.2);
  g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: len / 2, hd: 0.3, rot: 0 }];
  return g;
}
// the mouths of the four holds
function quarryMouth(K, rnd) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) box(g, 1.4, 5, 1.4, K.stone, sx * 2.6, 2.5, 0);
  box(g, 6.8, 1.1, 1.6, K.stone, 0, 5.4, 0);
  const d = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 4.9), K.dark); d.position.set(0, 2.45, -0.5); g.add(d);
  // cut blocks waiting to be hauled, and a hoist of beams and rope
  for (let i = 0; i < 7; i++) box(g, 1.1 + rnd() * 0.5, 0.7, 0.8 + rnd() * 0.3, K.stone, -6 + (i % 4) * 1.3 + rnd() * 0.2, 0.35 + Math.floor(i / 4) * 0.7, 2.6 + rnd() * 0.4, rnd() * 0.3);
  const hoist = new THREE.Group(); hoist.position.set(5.5, 0, 2.5); g.add(hoist);
  for (const sz of [-1, 1]) { const l = box(hoist, 0.22, 5.2, 0.22, K.stake, 0, 2.5, sz * 0.9); l.rotation.x = sz * 0.18; }
  box(hoist, 0.22, 0.22, 4.4, K.stake, -1.2, 4.9, 0).rotation.y = Math.PI / 2;
  cyl(hoist, 0.02, 0.02, 3.4, K.rope, -2.9, 3.2, 0, 4);
  g.userData.colliders = [{ type: 'box', x: -2.6, z: 0, hw: 0.8, hd: 0.8 }, { type: 'box', x: 2.6, z: 0, hw: 0.8, hd: 0.8 }, { type: 'box', x: -4.5, z: 2.7, hw: 2.6, hd: 0.7 }, { type: 'circle', x: 5.5, z: 2.5, r: 1.1 }];
  return g;
}
function fortGate(K, rnd) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) {
    box(g, 6, 5.5, 2, K.stone, sx * 5.2, 2.75, 0);
    for (let i = 0; i < 4; i++) box(g, 0.9, 0.8, 2.1, K.stone, sx * (2.8 + i * 1.6), 5.9, 0); // merlons
  }
  box(g, 3.2, 1.2, 2.2, K.stone, 0, 5.0, 0);
  const gate = box(g, 3.0, 4.4, 0.25, K.stake, 0, 2.2, 0.6); for (let i = 0; i < 4; i++) box(gate, 0.06, 4.2, 0.06, K.iron, -1.1 + i * 0.73, 0, 0.15);
  const tower = new THREE.Group(); tower.position.set(-9, 0, -1.5); g.add(tower); box(tower, 3.4, 8, 3.4, K.stone, 0, 4, 0); for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) box(tower, 0.8, 0.8, 0.8, K.stone, x, 8.4, z);
  g.userData.colliders = [{ type: 'box', x: -5.2, z: 0, hw: 3, hd: 1 }, { type: 'box', x: 5.2, z: 0, hw: 3, hd: 1 }, { type: 'box', x: -9, z: -1.5, hw: 1.8, hd: 1.8 }];
  return g;
}
function bridgeHead(K) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) { cyl(g, 0.28, 0.32, 3.6, K.stake, sx * 1.6, 1.8, 0, 8); for (let i = 0; i < 2; i++) { const r = cyl(g, 0.03, 0.03, 9, K.rope, sx * 1.6, 1.0 + i * 1.0, -4.4, 4); r.rotation.x = Math.PI / 2 - 0.08; } }
  for (let i = 0; i < 9; i++) box(g, 3.0, 0.1, 0.42, K.stake, 0, 0.12 - i * 0.03, -0.6 - i * 0.55, (i % 2 ? 0.03 : -0.02));
  const d = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4), K.dark); d.position.set(0, 1.7, -5.4); g.add(d);
  g.userData.colliders = [{ type: 'circle', x: -1.6, z: 0, r: 0.4 }, { type: 'circle', x: 1.6, z: 0, r: 0.4 }];
  return g;
}
function caveMouth(K, rnd) {
  const g = new THREE.Group();
  const d = new THREE.Mesh(new THREE.CircleGeometry(2.8, 20, 0, Math.PI), K.dark); d.position.set(0, 0.02, -0.6); g.add(d);
  for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI, r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9 + rnd() * 0.5, 0), K.stone); r.position.set(Math.cos(a) * 3.2, Math.sin(a) * 3.0, -0.4); r.rotation.set(rnd() * 3, rnd() * 3, 0); r.castShadow = true; g.add(r); }
  // his men's practice ground before it: straw butts and a rack of bows
  for (const [x, z] of [[-5, 4], [5, 5]]) { cyl(g, 0.7, 0.7, 0.5, K.straw, x, 1.1, z, 14).rotation.x = Math.PI / 2; box(g, 0.12, 1.6, 0.12, K.stake, x, 0.8, z + 0.3); }
  const rack = new THREE.Group(); rack.position.set(3.4, 0, 1.2); g.add(rack); box(rack, 1.8, 0.1, 0.1, K.stake, 0, 1.4, 0); for (const sx of [-0.8, 0.8]) box(rack, 0.1, 1.5, 0.1, K.stake, sx, 0.75, 0);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.02, 4, 12, Math.PI * 0.8), K.stake); b.position.set(-0.6 + i * 0.4, 0.9, 0.06); b.rotation.z = Math.PI / 2 - Math.PI * 0.4; rack.add(b); }
  g.userData.colliders = [{ type: 'circle', x: -5, z: 4, r: 0.8 }, { type: 'circle', x: 5, z: 5, r: 0.8 }, { type: 'box', x: 3.4, z: 1.2, hw: 1, hd: 0.3 }];
  return g;
}

export function buildHamrin(scene, rnd, out) {
  const K = M();
  // ---------------- the cliffs: a ring of colliders round the walkable gorge floors (rock above HAMRIN_WALK)
  const STEP = 2, walk = (x, z) => rawHeight(x, z) < HAMRIN_WALK;
  for (let x = -136; x <= 136; x += STEP) for (let z = -136; z <= 136; z += STEP) {
    if (walk(x, z)) continue;
    if (walk(x + STEP, z) || walk(x - STEP, z) || walk(x, z + STEP) || walk(x, z - STEP)) colliders.push({ type: 'circle', x, z, r: 1.5, cliff: true });
  }
  // ---------------- the deserters' camp (hub): palisade, tents, fires, a well, stores
  const Vc = SITES.village;
  for (const [dx, dz, len, r] of [[0, -24, 26, 0], [-24, -2, 30, Math.PI / 2], [22, -4, 26, Math.PI / 2], [-12, 20, 10, 0.2]]) place(scene, palisade(len, K, rnd), Vc.x + dx, Vc.z + dz, r, true);
  const tents = [[-16, -10, '#3a3028'], [-14, 6, '#5a4a36'], [12, -12, '#2a2a2a'], [14, 4, '#4a3a2a'], [-4, -16, '#6a5a40'], [8, 14, '#3a3430']];
  for (const [dx, dz, c] of tents) { const x = Vc.x + dx, z = Vc.z + dz; if (blocked(x, z, 2.2)) continue; place(scene, tent(c), x, z, Math.atan2(-dx, -dz), true); }
  const fireAt = (x, z, k = 1) => { const f = place(scene, firePit(), x, z, 0, false); out.fires.push({ pos: f.position.clone().add(V(0, 0.3, 0)), intensity: k }); colliders.push({ type: 'circle', x, z, r: 1.1 }); };
  fireAt(Vc.x - 2, Vc.z - 2, 0.9); fireAt(Vc.x + 10, Vc.z - 6, 0.6); fireAt(Vc.x - 10, Vc.z + 10, 0.6);
  place(scene, wellHead(), Vc.x + 4, Vc.z + 8, 0.3, true);
  for (const [dx, dz] of [[-6, 4], [6, -2], [0, -10], [-12, -4]]) { const l = place(scene, lanternPost(), Vc.x + dx, Vc.z + dz, rnd() * 6, false); out.lanterns.push(l); }
  place(scene, cart(), Vc.x + 16, Vc.z + 10, 0.6, false); colliders.push({ type: 'circle', x: Vc.x + 16, z: Vc.z + 10, r: 1.3 });
  for (let i = 0; i < 16; i++) { const x = Vc.x + (rnd() - 0.5) * 36, z = Vc.z + (rnd() - 0.5) * 34; if (blocked(x, z, 0.8) || roadDist(x, z) < 2.5) continue; place(scene, rnd() < 0.5 ? jar([0xa8643c, 0x8c5a3a, 0xb98a5e][i % 3], 0.8 + rnd() * 0.5) : crate(), x, z, rnd() * 6, false); colliders.push({ type: 'circle', x, z, r: 0.5 }); }
  // ---------------- the four holds' mouths, each facing down its road
  // the mouth stands at the far side of its site, against the cliff, facing back down the road to the camp
  const face = (s) => Math.atan2(Vc.x - s.x, Vc.z - s.z);
  out.holdMouths = {};
  for (const [key, make] of [['serai', quarryMouth], ['kiln', fortGate], ['arch', bridgeHead], ['hold', caveMouth]]) {
    const S = SITES[key], f = face(S), dx = Math.sin(f), dz = Math.cos(f);
    const x = S.x - dx * 6, z = S.z - dz * 6;
    place(scene, make(K, rnd), x, z, f, true, true);
    out.holdMouths[key] = { x: S.x - dx * 3.4, z: S.z - dz * 3.4 };
    const fx = S.x + dx * 3 + dz * 4, fz = S.z + dz * 3 - dx * 4;
    const fp = place(scene, firePit(), fx, fz, 0, false); out.fires.push({ pos: fp.position.clone().add(V(0, 0.3, 0)), intensity: 0.5 }); colliders.push({ type: 'circle', x: fx, z: fz, r: 1.1 });
  }
  // ---------------- the gorges: boulders at the cliff feet, scrub and dry grass on the floors, dead trees
  const rk = [], sh = [], gr = [], big = [];
  for (let i = 0; i < 2600; i++) {
    const x = (rnd() - 0.5) * 262, z = (rnd() - 0.5) * 262, h = rawHeight(x, z);
    if (h > HAMRIN_WALK + 4) { if (rnd() < 0.08) big.push({ x, y: h - 0.3, z, s: 0.8 + rnd() * 0.8, sx: 1.3 + rnd() * 0.5, sy: 0.45 + rnd() * 0.2, ry: rnd() * 6.3 }); continue; }
    if (Math.abs(x - canalX(z)) < 8 || roadDist(x, z) < 2.4 || blocked(x, z, 0.5)) continue;
    const nearCliff = rawHeight(x + 3, z) > HAMRIN_WALK || rawHeight(x - 3, z) > HAMRIN_WALK || rawHeight(x, z + 3) > HAMRIN_WALK || rawHeight(x, z - 3) > HAMRIN_WALK;
    const y = heightAt(x, z);
    if (nearCliff && rnd() < 0.5) rk.push({ x, y: y - 0.1, z, s: 0.5 + rnd() * 1.4 });
    else if (rnd() < 0.18) sh.push({ x, y, z });
    else if (rnd() < 0.5) gr.push({ x, y, z });
    else if (rnd() < 0.04) rk.push({ x, y: y - 0.05, z, s: 0.2 + rnd() * 0.4 });
  }
  // bedded slabs jutting from the cliff faces (the hard beds weather out as ledges), and talus fallen from them
  const slab = [];
  for (let i = 0; i < 5200 && slab.length < 600; i++) {
    const x = (rnd() - 0.5) * 262, z = (rnd() - 0.5) * 262, h = rawHeight(x, z);
    if (h < HAMRIN_WALK + 0.6) continue;
    const gx = rawHeight(x + 1, z) - rawHeight(x - 1, z), gz = rawHeight(x, z + 1) - rawHeight(x, z - 1), sl = Math.hypot(gx, gz) / 2;
    if (sl < 0.9) continue;
    const s0 = 0.5 + rnd() * 0.6, sy = 0.3 + rnd() * 0.15; slab.push({ x, y: h - s0 * sy * 0.35, z, s: s0, sx: 1.5 + rnd() * 0.6, sy, ry: Math.atan2(gx, gz) + (rnd() - 0.5) * 0.6 });
    if (rnd() < 0.35) { const k = 2 + rnd() * 3, tx = x - gx / (sl * 2) * k, tz = z - gz / (sl * 2) * k; if (rawHeight(tx, tz) < HAMRIN_WALK && !blocked(tx, tz, 0.6) && roadDist(tx, tz) > 3) rk.push({ x: tx, y: heightAt(tx, tz) - 0.1, z: tz, s: 0.4 + rnd() * 0.9 }); }
  }
  const RS = rocks(slab, 27, 0xe0d0b4); RS.castShadow = true; scene.add(RS);
  const R = rocks(rk, 21, 0xd8ccb8); scene.add(R); const RB = rocks(big, 23, 0xdccab0); RB.castShadow = false; scene.add(RB);
  scene.add(shrubs(sh, 24)); scene.add(grassField(gr, 'dry', 25));
  for (let i = 0; i < 18; i++) { const x = (rnd() - 0.5) * 240, z = (rnd() - 0.5) * 240; if (rawHeight(x, z) > HAMRIN_WALK || roadDist(x, z) < 3 || blocked(x, z, 1.5)) continue; place(scene, deadTree(rnd), x, z, rnd() * 6, false); colliders.push({ type: 'circle', x, z, r: 0.4 }); }
  // tamarisk along the Diyala far below the eastern cliffs
  const tam = []; for (let z = -130; z < 130; z += 2.2) for (const s of [-1, 1]) if (rnd() < 0.6) { const x = canalX(z) + s * (5 + rnd() * 6); tam.push({ x, y: heightAt(x, z), z }); }
  scene.add(shrubs(tam, 26));
}

// ------------------------------------------------------------------ setup (after the game exists)
const DOCKS_TO_HILLS = 'Ride north to the Hamrin hills';
export function setupHamrin(g) {
  const p = g.player;
  Object.assign(CODEX, {
    hamrin: { t: 'The Hamrin Hills', cat: 'Places', x: 'A long, low ridge of limestone and sandstone north-east of Baghdad, cut by gorges where winter rain runs off to the Diyala. Shepherds grazed its valleys in spring; in bad years it gave shelter to anyone who did not want to be found.' },
    deserters: { t: 'After the Siege', cat: 'War', x: 'When Baghdad fell in 813 the armies that had fought over it did not simply go home. Unpaid soldiers of both sides, and the street fighters who had held the city, drifted into the countryside in bands. For years afterward the roads were not safe.' },
    diyala: { t: 'The Diyala', cat: 'Places', x: 'The river comes down out of the Zagros, breaks through the Hamrin hills in a gorge and joins the Tigris below Baghdad. Canals off its lower course watered some of the richest land in the Sawad.' },
    quarry: { t: 'Stone and Brick', cat: 'Craft', x: 'Baghdad was built of mud-brick and baked brick, but stone was quarried where it lay near the surface, for foundations, thresholds, millstones and the bases of columns. Cut blocks were levered out along their beds and dragged to the nearest water.' },
  });
  if (IS_DOCKS) {
    // after the chronicle: Kathir knows the road north, where Tatzates went
    const [x, z] = freeSpot(HUB.ishaq[0] - 7, HUB.ishaq[1] + 4, 1.2);
    const it = { pos: V(x, heightAt(x, z), z), r: 2.6, label: DOCKS_TO_HILLS, act: () => {
      if ((g.act || 1) < 7) { g.ui.toast(t('The road north can wait until the copies have sailed')); return; }
      try { localStorage.setItem('sob.endgame', 'hamrin'); } catch { /* storage unavailable */ }
      g.ui.toast(t('North, to the Hamrin hills')); saveGame(g); g.travel();
    } };
    g.interactables.push(it); g.pois?.push({ x, z, icon: '⛰', color: '#c8b088' });
    const post = place(g.scene, lanternPost(), x, z, 0, false); g.world.lanterns?.push(post);
  }
  if (!IS_HAMRIN) return;
  // the way back down to the river, from the camp's south gate
  {
    const [x, z] = freeSpot(SITES.village.x + 4, SITES.village.z + 26, 1.2);
    g.interactables.push({ pos: V(x, heightAt(x, z), z), r: 2.8, label: 'Ride back to the river quays', act: () => { try { localStorage.removeItem('sob.endgame'); } catch { /* ignore */ } saveGame(g); g.travel(); } });
  }
  // the holds' doors (holds.js enters them)
  const mouths = g.world.holdMouths || {};
  const HOLD_OF = { serai: 'quarry', kiln: 'fort', arch: 'gorge', hold: 'rivalhold' };
  const ICON = { serai: '⛏', kiln: '♜', arch: '≋', hold: '➶' };
  for (const [key, id] of Object.entries(HOLD_OF)) {
    const m = mouths[key]; if (!m) continue;
    const pos = V(m.x, heightAt(m.x, m.z), m.z);
    g.interactables.push({ pos, r: 3, area: id, get label() { return g.holds?.label(id) || 'Enter'; }, act: () => g.holds?.enter(id) });
    g.pois?.push({ x: m.x, z: m.z, icon: ICON[key], color: '#e0b060' });
  }
  // the hills' foes come to meet Salim's strength (the map is fought after the chronicle, at any level)
  const scale = () => {
    const L = Math.max(20, Math.min(30, p.level + 1));
    for (const e of g.enemies) {
      if (e.interior || e.hamrinScaled) continue; e.hamrinScaled = true;
      const k = (1 + (L - 1) * 0.35) / (1 + (e.level - 1) * 0.35), kd = (1 + (L - 1) * 0.25) / (1 + (e.level - 1) * 0.25);
      e.level = L; e.maxHp = Math.round(e.maxHp * k); e.hp = e.maxHp; e.dmg *= kd; e.xp = e.T.xp * L * (e.elite ? 5 : 1);
    }
  };
  const prevRestore = g.restoreSide; g.restoreSide = () => { prevRestore?.(); scale(); };
  setTimeout(scale, 0);
  // codex as Salim sees the hills
  const prevTick = g.tickExtra;
  g.tickExtra = (dt) => {
    prevTick?.(dt);
    if (g.t > 15) unlock(g, 'hamrin');
    if (g.t > 40) unlock(g, 'deserters'); if (g.t > 80) unlock(g, 'thughur');
    if (Math.abs(p.pos.x - canalX(p.pos.z)) < 30) unlock(g, 'diyala');
    if (Math.hypot(p.pos.x - SITES.serai.x, p.pos.z - SITES.serai.z) < 24) unlock(g, 'quarry');
  };
  buildGrid();
}
