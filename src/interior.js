import * as THREE from 'three';
import { colliders, mats } from './buildings.js';
import { mudBrick } from './textures.js';
import { triplanarMaterial } from './triplanar.js';
import { mulberry32 } from './noise.js';
import { buildGrid } from './collision.js';
import { buildNav, setInteriorFloor, INTERIOR_X } from './nav.js';
import { jar, crate, brickStack } from './props.js';
import { mergeStatic } from './world.js';

// Modular underground kit: brick-vaulted kiln tunnels and limestone qanat galleries.
// Interiors live on a flat floor east of the overworld (x > 150), share its collision and nav grids,
// and are rebuilt whenever a new layout is generated (dungeon runs reroll the layout).
export const ORIGIN = { x: 220, z: 0 };
const S = 12, WALL_H = 3.4, T = 0.8, DOOR = 3.4;

let KIT = null;
function kit() {
  if (KIT) return KIT;
  const fired = mudBrick([118, 66, 46]), lime = mudBrick([196, 186, 166]);
  for (const t of [fired.map, fired.normalMap, lime.map, lime.normalMap]) t.repeat.set(0.3, 0.3);
  KIT = {
    kiln: { wall: triplanarMaterial({ map: fired.map, normalMap: fired.normalMap, scale: 0.5, roughness: 0.95, normalStrength: 1.3, grime: 0.7 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 1 }), trim: new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 1 }) },
    qanat: { wall: triplanarMaterial({ map: lime.map, normalMap: lime.normalMap, color: 0xb8ad98, scale: 0.45, roughness: 0.9, normalStrength: 1.0, grime: 0.55 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x4a4234, roughness: 0.95 }), trim: new THREE.MeshStandardMaterial({ color: 0x2a261e, roughness: 1 }) },
    iron: new THREE.MeshStandardMaterial({ color: 0x2a2624, metalness: 0.8, roughness: 0.5 }),
    ember: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.3), toneMapped: false }),
    water: new THREE.MeshStandardMaterial({ color: 0x0e2a2a, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85 }),
    wood: mats().wood, gold: mats().gold,
  };
  return KIT;
}

// Random-walk layout of n rooms on a 12 m grid. Returns rooms in discovery order: [0] is the entrance, the last the deepest.
export function layout(seed, n) {
  const rnd = mulberry32(seed), cells = new Map(), list = [], links = new Set();
  const key = (i, j) => i + ',' + j, ok = (i, j) => Math.abs(i) <= 4 && j >= -9 && j <= 9;
  const add = (i, j, from) => { const r = { i, j, k: key(i, j), depth: from ? from.depth + 1 : 0 }; cells.set(r.k, r); list.push(r); if (from) links.add([from.k, r.k].sort().join('|')); return r; };
  add(0, 6, null);
  let guard = 0;
  while (list.length < n && guard++ < 800) {
    // grow mostly from the newest rooms (long galleries) with occasional side branches
    const from = rnd() < 0.7 ? list[list.length - 1 - Math.floor(rnd() * Math.min(2, list.length))] : list[Math.floor(rnd() * list.length)];
    const dirs = [[0, -1], [0, -1], [1, 0], [-1, 0], [0, 1]], [di, dj] = dirs[Math.floor(rnd() * dirs.length)];
    const ni = from.i + di, nj = from.j + dj;
    if (!ok(ni, nj)) continue;
    if (cells.has(key(ni, nj))) { if (rnd() < 0.15) links.add([from.k, key(ni, nj)].sort().join('|')); continue; }
    add(ni, nj, from);
  }
  list.sort((a, b) => a.depth - b.depth);
  return { rooms: list, cells, links, linked: (a, b) => links.has([a, b].sort().join('|')) };
}
export const roomCenter = (r) => ({ x: ORIGIN.x + r.i * S, z: ORIGIN.z + r.j * S });

let current = null;
export function destroyInterior(scene) {
  if (!current) return;
  scene.remove(current.group);
  current.group.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
  for (let i = colliders.length - 1; i >= 0; i--) if (colliders[i].interior) colliders.splice(i, 1);
  current = null;
}

// style: 'kiln' | 'qanat'. Returns { rooms, entrance, exit, torches, chests, group, spawnRooms }
export function buildInterior(scene, { seed = 1, rooms = 7, style = 'kiln' } = {}) {
  destroyInterior(scene);
  const K = kit(), M = K[style], rnd = mulberry32(seed * 7 + 3);
  const L = layout(seed, rooms), grp = new THREE.Group(), dyn = new THREE.Group();
  const col = (x, z, hw, hd) => colliders.push({ type: 'box', x, z, hw, hd, rot: 0, interior: true });
  const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; grp.add(b); return b; };
  const torches = [], floors = [];
  for (const r of L.rooms) {
    const c = roomCenter(r);
    floors.push([c.x - S / 2, c.z - S / 2, c.x + S / 2, c.z + S / 2]);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(S, S).rotateX(-Math.PI / 2), M.floor); f.position.set(c.x, 0, c.z); f.receiveShadow = true; grp.add(f);
    // four edges: solid wall, or a wall with a doorway into a linked neighbour
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nk = (r.i + di) + ',' + (r.j + dj), open = L.cells.has(nk) && L.linked(r.k, nk);
      const ex = c.x + di * S / 2, ez = c.z + dj * S / 2, along = di === 0;
      // each shared edge is built once (by the room with the smaller key), outer edges by their room
      if (L.cells.has(nk) && nk < r.k) continue;
      const segs = open ? [[-S / 2, -DOOR / 2], [DOOR / 2, S / 2]] : [[-S / 2, S / 2]];
      for (const [a, b] of segs) {
        const len = b - a + (open ? 0 : T), mid = (a + b) / 2;
        const x = along ? ex + mid : ex, z = along ? ez : ez + mid;
        // walls nearer the camera (south faces) are kept low so the top-down view sees in
        // (shared east-west walls are mid-height; the dither hole handles the rest)
        const h = dj === 0 ? WALL_H : L.cells.has(nk) ? 2.2 : dj === 1 ? 1.1 : WALL_H;
        box(along ? len : T, h, along ? T : len, x, h / 2, z, M.wall);
        col(x, z, (along ? len : T) / 2, (along ? T : len) / 2);
      }
      if (open) { // lintel beam over the doorway on the tall walls
        if (dj === 0 || !L.cells.has(nk) && dj === -1) box(along ? DOOR + 0.6 : T + 0.1, 0.5, along ? T + 0.1 : DOOR + 0.6, ex, WALL_H - 0.25, ez, M.trim);
      }
    }
    // corner piers
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const h = sz === 1 ? 1.3 : WALL_H + 0.3; box(1.3, h, 1.3, c.x + sx * S / 2, h / 2, c.z + sz * S / 2, M.trim); }
    // wall torches on the north wall (and sometimes east/west)
    const tw = [[0, -S / 2 + T / 2 + 0.15, 0]];
    if (rnd() < 0.5) tw.push([S / 2 - T / 2 - 0.15, 0, -Math.PI / 2]); if (rnd() < 0.5) tw.push([-S / 2 + T / 2 + 0.15, 0, Math.PI / 2]);
    for (const [tx, tz, ry] of tw) {
      const sx = c.x + tx + (tx === 0 ? (rnd() - 0.5) * 4 : 0), sz = c.z + tz + (tz === 0 ? (rnd() - 0.5) * 4 : 0);
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.6, 6), K.iron); br.position.set(sx, 2.2, sz); br.rotation.set(0.5, ry, 0); grp.add(br);
      const em = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), K.ember); em.position.set(sx, 2.5, sz); grp.add(em);
      const off = new THREE.Vector3(Math.sin(ry) * 0.9, 0, tx === 0 ? 0.9 : 0); if (tx !== 0) off.set(-Math.sign(tx) * 0.9, 0, 0);
      torches.push({ pos: new THREE.Vector3(sx, 2.55, sz), light: new THREE.Vector3(sx, 2.3, sz).add(off), intensity: 0.45, torch: true });
    }
    // clutter
    const n = 2 + Math.floor(rnd() * 4);
    for (let q = 0; q < n; q++) {
      const ox = (rnd() - 0.5) * (S - 4), oz = (rnd() - 0.5) * (S - 4);
      if (Math.abs(ox) < 2 && Math.abs(oz) < 2) continue;
      const o = style === 'kiln' ? (rnd() < 0.55 ? brickStack(rnd) : jar(0x6a3a24, 0.9 + rnd() * 0.4)) : (rnd() < 0.6 ? jar(0x8a7a60, 0.8 + rnd() * 0.5) : crate());
      o.position.set(c.x + ox, 0, c.z + oz); o.rotation.y = rnd() * 6; grp.add(o);
      colliders.push({ type: 'circle', x: c.x + ox, z: c.z + oz, r: style === 'kiln' ? 0.9 : 0.5, interior: true });
    }
    if (style === 'qanat') { // the water channel running through each gallery
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, S).rotateX(-Math.PI / 2), K.water); w.position.set(c.x + 3.6, 0.02, c.z); grp.add(w);
      box(0.25, 0.2, S, c.x + 2.8, 0.1, c.z, M.trim); box(0.25, 0.2, S, c.x + 4.4, 0.1, c.z, M.trim);
    } else { // soot-black scorch on the floor
      const sc = new THREE.Mesh(new THREE.CircleGeometry(2 + rnd() * 2, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })); sc.position.set(c.x + (rnd() - 0.5) * 5, 0.015, c.z + (rnd() - 0.5) * 5); grp.add(sc);
    }
  }
  // entrance: a shaft of daylight and the way back up
  const e0 = roomCenter(L.rooms[0]);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 14, 16, 1, true).translate(0, 7, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.0, 0.7), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  shaft.position.set(e0.x, 0, e0.z + 2.5); dyn.add(shaft);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 8, 5), K.wood); rope.position.set(e0.x + 0.6, 4, e0.z + 2.5); dyn.add(rope);
  // treasure chest in the deepest room
  const last = L.rooms[L.rooms.length - 1], lc = roomCenter(last);
  const chest = new THREE.Group();
  const cb = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.7), K.wood); cb.position.y = 0.3; chest.add(cb);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), K.wood); lid.position.y = 0.6; chest.add(lid);
  for (const sx of [-0.4, 0.4]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.74), K.gold); b.position.set(sx, 0.45, 0); chest.add(b); }
  chest.position.set(lc.x, 0, lc.z - 3.5); dyn.add(chest);
  colliders.push({ type: 'circle', x: lc.x, z: lc.z - 3.5, r: 0.8, interior: true });
  grp.updateMatrixWorld(true); mergeStatic(grp);
  grp.traverse((o) => { if (o.isMesh && (o.material === M.floor || o.material === K.water || o.material.transparent)) o.userData.noOcc = true; });
  grp.add(dyn);
  scene.add(grp);
  // collision + nav for the new layout
  const inFloor = (x, z) => floors.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
  setInteriorFloor(inFloor);
  buildGrid(); buildNav(INTERIOR_X, 290);
  current = { group: grp, rooms: L.rooms, torches, style, entrance: new THREE.Vector3(e0.x, 0, e0.z + 2.5), chest: { mesh: chest, lid, pos: new THREE.Vector3(lc.x, 0, lc.z - 3.5), opened: false }, center: roomCenter, floors };
  return current;
}
export const interiorNow = () => current;
