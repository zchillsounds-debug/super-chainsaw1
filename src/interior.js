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
const S = 12, WALL_H = 3.4, T = 0.8;
let DOOR = 3.4;

let KIT = null;
function kit() {
  if (KIT) return KIT;
  const fired = mudBrick([118, 66, 46]), lime = mudBrick([196, 186, 166]);
  for (const t of [fired.map, fired.normalMap, lime.map, lime.normalMap]) t.repeat.set(0.3, 0.3);
  KIT = {
    kiln: { wall: triplanarMaterial({ map: fired.map, normalMap: fired.normalMap, scale: 0.5, roughness: 0.95, normalStrength: 1.3, grime: 0.7 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x5a4434, roughness: 1 }), trim: new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 1 }) },
    qanat: { wall: triplanarMaterial({ map: lime.map, normalMap: lime.normalMap, color: 0xe0d4bc, scale: 0.45, roughness: 0.9, normalStrength: 1.0, grime: 0.45 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x8a7e66, roughness: 0.95 }), trim: new THREE.MeshStandardMaterial({ color: 0x2a261e, roughness: 1 }) },
    // storerooms under the caravanserai: limewashed mud brick, dark timber, packed earth
    cellar: { wall: triplanarMaterial({ map: lime.map, normalMap: lime.normalMap, color: 0xf0e2c8, scale: 0.6, roughness: 0.95, normalStrength: 0.6, grime: 0.6 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x7a6248, roughness: 1 }), trim: mats().wood },
    // the clay pits: raw red earth, cut in steps
    pit: { wall: triplanarMaterial({ map: fired.map, normalMap: fired.normalMap, color: 0xb89070, scale: 0.18, roughness: 1, normalStrength: 2.2, grime: 0.9 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x6a5240, roughness: 1 }), trim: new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 1 }) },
    // Sasanian vaults: big yellow-grey baked brick, older and colder
    vault: { wall: triplanarMaterial({ map: lime.map, normalMap: lime.normalMap, color: 0xc8c0aa, scale: 0.32, roughness: 0.92, normalStrength: 1.6, grime: 0.8 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x5a5244, roughness: 0.95 }), trim: new THREE.MeshStandardMaterial({ color: 0x2c2822, roughness: 1 }) },
    // the drowned granary: mud-brick bins, the floor under a hand's depth of still water
    flood: { wall: triplanarMaterial({ map: fired.map, normalMap: fired.normalMap, color: 0xa89878, scale: 0.4, roughness: 0.95, normalStrength: 1.2, grime: 0.95 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x3a3a2c, roughness: 0.6 }), trim: new THREE.MeshStandardMaterial({ color: 0x2a2418, roughness: 1 }) },
    // the merchants' cellars under burned al-Karkh: plaster blackened by the fire above
    scorched: { wall: triplanarMaterial({ map: lime.map, normalMap: lime.normalMap, color: 0x8a7a68, scale: 0.55, roughness: 1, normalStrength: 0.8, grime: 1.0 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x4a3e34, roughness: 1 }), trim: new THREE.MeshStandardMaterial({ color: 0x120e0c, roughness: 0.95 }) },
    // Round 17 styles
    // a Sasanian cistern: pale lime plaster over brick, the floor wet, stone landings to stand on
    cistern: { wall: triplanarMaterial({ map: lime.map, normalMap: lime.normalMap, color: 0xb8b4a0, scale: 0.4, roughness: 0.7, normalStrength: 1.0, grime: 0.85 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x46483e, roughness: 0.45 }), trim: new THREE.MeshStandardMaterial({ color: 0x6a685a, roughness: 0.9 }) },
    // granary vaults: tall mud-brick bins under timber, grain dust on everything
    grainvault: { wall: triplanarMaterial({ map: fired.map, normalMap: fired.normalMap, color: 0xd0b088, scale: 0.45, roughness: 1, normalStrength: 1.0, grime: 0.5 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x9a8058, roughness: 1 }), trim: mats().wood },
    // the salt workings: white crust over grey rock, narrow cuts
    salt: { wall: triplanarMaterial({ map: lime.map, normalMap: lime.normalMap, color: 0xf4f0e6, scale: 0.22, roughness: 0.6, normalStrength: 2.4, grime: 0.25 }),
      floor: new THREE.MeshStandardMaterial({ color: 0xc8c2b4, roughness: 0.75 }), trim: new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 0.8 }) },
    // the old kiln galleries: soot-black fired brick, glowing vents
    kiln2: { wall: triplanarMaterial({ map: fired.map, normalMap: fired.normalMap, color: 0x7a5a4a, scale: 0.5, roughness: 0.95, normalStrength: 1.4, grime: 1.0 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x3a2c24, roughness: 1 }), trim: new THREE.MeshStandardMaterial({ color: 0x0e0a08, roughness: 1 }) },
    // palace cellars: cut-stone dados, tiled floors, painted plaster above
    palace: { wall: triplanarMaterial({ map: lime.map, normalMap: lime.normalMap, color: 0xe8d8b8, scale: 0.7, roughness: 0.8, normalStrength: 0.5, grime: 0.55 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x8a6e52, roughness: 0.7 }), trim: new THREE.MeshStandardMaterial({ color: 0x2a4a48, roughness: 0.8 }) },
    // the reed-hut warren: woven reed walls, mud floor, matting
    warren: { wall: triplanarMaterial({ map: fired.map, normalMap: fired.normalMap, color: 0xc8a868, scale: 0.12, roughness: 1, normalStrength: 2.6, grime: 0.4 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 1 }), trim: new THREE.MeshStandardMaterial({ color: 0x7a6238, roughness: 1 }) },
    reed: new THREE.MeshStandardMaterial({ color: 0xb89a5a, roughness: 1 }),
    cisternW: new THREE.MeshStandardMaterial({ color: 0x3a6a66, emissive: 0x0c2422, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.72, depthWrite: false }),
    tile: new THREE.MeshStandardMaterial({ color: 0x3a6a72, roughness: 0.5 }),
    crack: new THREE.MeshStandardMaterial({ color: 0xc8a878, emissive: 0x2a1a08, roughness: 0.9 }),
    saltw: new THREE.MeshStandardMaterial({ color: 0xf8f6f0, roughness: 0.5 }),
    shaftm: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.3), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    pool: new THREE.MeshStandardMaterial({ color: 0x1a2a24, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.78, depthWrite: false }),
    grain: new THREE.MeshStandardMaterial({ color: 0xb89a58, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x2a2624, metalness: 0.8, roughness: 0.5 }),
    ember: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.3), toneMapped: false }),
    water: new THREE.MeshStandardMaterial({ color: 0x0e2a2a, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85 }),
    slip: new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.2, metalness: 0.05 }),
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

// style: 'kiln' | 'qanat' | 'cellar' | 'pit' | 'vault' | 'flood' | 'scorched' | (R17) 'cistern' | 'grainvault' | 'salt' | 'kiln2' | 'palace' | 'warren'. Returns { rooms, entrance, exit, torches, chests, group, spawnRooms }
export function buildInterior(scene, { seed = 1, rooms = 7, style = 'kiln' } = {}) {
  destroyInterior(scene);
  const K = kit(), M = K[style], rnd = mulberry32(seed * 7 + 3);
  DOOR = style === 'salt' ? 2.2 : 3.4;
  const haz = []; // Round 17 hazard anchors: { kind, x, z, mesh?, room }
  const L = layout(seed, rooms), grp = new THREE.Group();
  const col = (x, z, hw, hd) => colliders.push({ type: 'box', x, z, hw, hd, rot: 0, interior: true });
  const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; grp.add(b); return b; };
  const torches = [], floors = [], dynW = [];
  const dyn = new THREE.Group();
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
      const o = style === 'kiln' || style === 'pit' ? (rnd() < 0.55 ? brickStack(rnd) : jar(0x6a3a24, 0.9 + rnd() * 0.4))
        : style === 'cellar' ? (rnd() < 0.5 ? crate() : jar([0xa8643c, 0x8c5a3a, 0xb98a5e][Math.floor(rnd() * 3)], 0.9 + rnd() * 0.5))
        : style === 'flood' ? jar(0x5a4a34, 1 + rnd() * 0.4)
        : style === 'scorched' ? (rnd() < 0.6 ? crate() : jar(0x2a221c, 0.9 + rnd() * 0.4))
        : style === 'grainvault' || style === 'warren' ? (rnd() < 0.5 ? crate() : jar(0x9a6a40, 0.9 + rnd() * 0.4))
        : style === 'palace' ? jar([0x2a5a6a, 0xd8c8a0, 0x8a5a3a][Math.floor(rnd() * 3)], 1 + rnd() * 0.5)
        : style === 'kiln2' ? (rnd() < 0.7 ? brickStack(rnd) : jar(0x3a2418, 0.9 + rnd() * 0.4))
        : (rnd() < 0.6 ? jar(0x8a7a60, 0.8 + rnd() * 0.5) : crate());
      o.position.set(c.x + ox, 0, c.z + oz); o.rotation.y = rnd() * 6; grp.add(o);
      colliders.push({ type: 'circle', x: c.x + ox, z: c.z + oz, r: style === 'kiln' || style === 'pit' || style === 'kiln2' ? 0.9 : 0.5, interior: true });
    }
    if (style === 'qanat') { // the water channel running through each gallery
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, S).rotateX(-Math.PI / 2), K.water); w.position.set(c.x + 3.6, 0.02, c.z); grp.add(w);
      box(0.25, 0.2, S, c.x + 2.8, 0.1, c.z, M.trim); box(0.25, 0.2, S, c.x + 4.4, 0.1, c.z, M.trim);
    } else if (style === 'flood') { // standing water over the whole floor, rotting grain heaped in the bins along the walls
      const w = new THREE.Mesh(new THREE.PlaneGeometry(S, S).rotateX(-Math.PI / 2), K.pool); w.position.set(c.x, 0.06, c.z); w.userData.noOcc = true; dynW.push(w);
      for (const sx of [-1, 1]) { const x = c.x + sx * (S / 2 - 1.6); box(2.2, 1.0, S * 0.5, x, 0.5, c.z - S * 0.15, M.trim); col(x, c.z - S * 0.15, 1.1, S * 0.25); const h = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.9, 0.5, S * 0.22), K.grain); h.position.set(x, 1.0, c.z - S * 0.15); grp.add(h); }
    } else if (style === 'scorched') { // charred beams fallen through from the burned suq above, soot pooled on the floor
      for (let b = 0; b < 2; b++) { const beam = box(S * 0.7, 0.3, 0.32, c.x + (rnd() - 0.5) * 3, 0.25 + b * 0.5, c.z + (rnd() - 0.5) * 6, M.trim); beam.rotation.y = (rnd() - 0.5) * 1.2; beam.rotation.z = (rnd() - 0.5) * 0.3; }
      const sc = new THREE.Mesh(new THREE.CircleGeometry(2.5 + rnd() * 2, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false })); sc.position.set(c.x + (rnd() - 0.5) * 4, 0.015, c.z + (rnd() - 0.5) * 4); grp.add(sc);
    } else if (style === 'cistern') { // stone landings along the walls stay dry when the water rises; a row of piers carries the vault
      for (const sx of [-1, 1]) { const x = c.x + sx * (S / 2 - 1.6), z = c.z + (rnd() - 0.5) * 4; box(2.2, 0.16, 3.2, x, 0.08, z, M.trim); haz.push({ kind: 'landing', x, z, hw: 1.1, hd: 1.6, room: r }); }
      for (const sz of [-1, 1]) { const x = c.x + (rnd() - 0.5) * 2, z = c.z + sz * 2.6; box(0.9, WALL_H + 0.6, 0.9, x, (WALL_H + 0.6) / 2, z, M.wall); col(x, z, 0.45, 0.45); }
      const w = new THREE.Mesh(new THREE.PlaneGeometry(S, S).rotateX(-Math.PI / 2), K.cisternW); w.position.set(c.x, 0.03, c.z); w.userData.noOcc = true; dynW.push(w);
    } else if (style === 'grainvault') { // timber bins along the walls; loose grain stacked high in the middle of the floor
      for (const sx of [-1, 1]) { const x = c.x + sx * (S / 2 - 1.3); box(1.8, 1.6, S * 0.6, x, 0.8, c.z, M.trim); col(x, c.z, 0.9, S * 0.3); }
      for (let q = 0; q < 2; q++) {
        const x = c.x + (q ? 2.6 : -2.6) + (rnd() - 0.5), z = c.z + (rnd() - 0.5) * 4;
        const stk = new THREE.Group();
        for (let k = 0; k < 5; k++) { const sk = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.5, 3, 7).rotateZ(Math.PI / 2), K.grain); sk.position.set((k % 3 - 1) * 0.7 + (k > 2 ? 0.35 : 0), 0.34 + (k > 2 ? 0.6 : 0), 0); sk.castShadow = true; stk.add(sk); }
        const top = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.5, 3, 7).rotateZ(Math.PI / 2), K.grain); top.position.set(0, 1.5, 0); stk.add(top);
        stk.position.set(x, 0, z); stk.rotation.y = rnd() * 3; dyn.add(stk);
        const cl = { type: 'circle', x, z, r: 0.9, interior: true }; colliders.push(cl);
        haz.push({ kind: 'stack', x, z, mesh: stk, col: cl, room: r });
      }
    } else if (style === 'salt') { // salt pillars left standing narrow the galleries; light falls through cracks in the roof
      for (let q = 0; q < 3; q++) { const x = c.x + (rnd() - 0.5) * 7, z = c.z + (rnd() - 0.5) * 7; if (Math.abs(x - c.x) < 1.8 && Math.abs(z - c.z) < 1.8) continue; const rad = 0.7 + rnd() * 0.5; const pl = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.8, rad * 1.1, WALL_H + 0.6, 7), K.saltw); pl.position.set(x, (WALL_H + 0.6) / 2, z); pl.castShadow = true; grp.add(pl); colliders.push({ type: 'circle', x, z, r: rad, interior: true }); }
      for (let q = 0; q < 4; q++) { const cr = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + rnd() * 0.3, 0), K.saltw); cr.position.set(c.x + (rnd() - 0.5) * 9, 0.1, c.z + (rnd() - 0.5) * 9); grp.add(cr); }
      const gx = c.x + (rnd() - 0.5) * 3, gz = c.z + (rnd() - 0.5) * 3;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.7, 9, 12, 1, true).translate(0, 4.5, 0), K.shaftm.clone()); beam.position.set(gx, 0, gz); dyn.add(beam);
      const spot = new THREE.Mesh(new THREE.CircleGeometry(1.7, 20).rotateX(-Math.PI / 2), K.shaftm.clone()); spot.position.set(gx, 0.03, gz); dyn.add(spot);
      haz.push({ kind: 'glare', x: gx, z: gz, mesh: beam, spot, room: r });
    } else if (style === 'kiln2') { // vents in the floor breathe smoke from the dead kilns below
      for (let q = 0; q < (r.depth ? 2 : 0); q++) {
        const x = c.x + (rnd() - 0.5) * 6, z = c.z + (rnd() - 0.5) * 6;
        const g = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.12, 10), K.iron); g.position.set(x, 0.06, z); grp.add(g);
        for (let k = -2; k <= 2; k++) box(0.08, 0.14, 1.3, x + k * 0.26, 0.08, z, M.trim);
        const glow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12).rotateX(-Math.PI / 2), K.ember); glow.position.set(x, 0.035, z); grp.add(glow);
        haz.push({ kind: 'vent', x, z, room: r });
      }
      for (let b = -1; b <= 1; b += 2) box(S, 0.3, 0.5, c.x, WALL_H - 0.1, c.z + b * 3, M.trim);
    } else if (style === 'palace') { // a tiled floor field, a painted dado, and pressure plates among the tiles
      const t = new THREE.Mesh(new THREE.PlaneGeometry(S - 3, S - 3).rotateX(-Math.PI / 2), K.tile); t.position.set(c.x, 0.012, c.z); grp.add(t);
      for (const sx of [-1, 1]) { const x = c.x + sx * (S / 2 - 0.5); box(0.2, 1.1, S - 1.4, x, 0.55, c.z, M.trim); }
      for (let q = 0; q < (r.depth ? 3 : 0); q++) {
        const x = c.x + (rnd() - 0.5) * 7, z = c.z + (rnd() - 0.5) * 7; if (Math.hypot(x - c.x, z - c.z) < 1.5) continue;
        const pl = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 1.3), K.crack); pl.position.set(x, 0.03, z); dyn.add(pl);
        for (const a of [0.5, -0.7]) { const cr = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.07, 0.05), M.trim); cr.rotation.y = a; pl.add(cr); }
        haz.push({ kind: 'plate', x, z, mesh: pl, room: r, side: rnd() < 0.5 ? -1 : 1, cx: c.x });
      }
    } else if (style === 'warren') { // reed huts, two to a yard, joined by matting
      for (let q = 0; q < 2; q++) {
        const x = c.x + (q ? 3 : -3), z = c.z + (rnd() - 0.5) * 3;
        const h = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 1.6, 10, 1, true), K.reed); body.position.y = 0.8; h.add(body);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.1, 10), K.reed); roof.position.y = 2.1; h.add(roof);
        h.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.material = K.reed; } });
        for (const y of [0.35, 0.85, 1.35]) { const band = new THREE.Mesh(new THREE.TorusGeometry(1.47, 0.06, 4, 16).rotateX(Math.PI / 2), M.trim); band.position.y = y; h.add(band); }
        h.position.set(x, 0, z); dyn.add(h);
        colliders.push({ type: 'circle', x, z, r: 1.5, interior: true });
        haz.push({ kind: 'hut', x, z, mesh: h, room: r });
      }
      const mat = new THREE.Mesh(new THREE.PlaneGeometry(3, 5).rotateX(-Math.PI / 2), M.trim); mat.position.set(c.x, 0.02, c.z); mat.rotation.y = rnd(); grp.add(mat);
    } else if (style === 'cellar') { // roof beams across each storeroom
      for (let b = -1; b <= 1; b++) box(S, 0.28, 0.32, c.x, WALL_H - 0.1, c.z + b * 3.6, M.trim);
    } else if (style === 'vault') { // heavy square piers along the long walls carry the (unseen) vault
      for (const sx of [-1, 1]) for (const sz of [-0.5, 0.5]) { const x = c.x + sx * (S / 2 - 1.1), z = c.z + sz * S * 0.5; box(1.4, WALL_H + 0.6, 1.4, x, (WALL_H + 0.6) / 2, z, M.trim); col(x, z, 0.7, 0.7); }
    } else if (style === 'pit') { // stepped cut faces and puddles of slip
      for (let q = 0; q < 2; q++) { const w = 2 + rnd() * 3, x = c.x + (rnd() - 0.5) * 6; box(w, 0.5 + rnd() * 0.6, 1.2, x, 0.3, c.z - S / 2 + 1.2, M.wall); col(x, c.z - S / 2 + 1.2, w / 2, 0.6); }
      const sl = new THREE.Mesh(new THREE.CircleGeometry(1 + rnd(), 14).rotateX(-Math.PI / 2), K.water); sl.position.set(c.x + (rnd() - 0.5) * 6, 0.02, c.z + (rnd() - 0.5) * 6); sl.material = K.slip; grp.add(sl);
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
  grp.add(dyn); for (const w of dynW) grp.add(w);
  scene.add(grp);
  // collision + nav for the new layout
  const inFloor = (x, z) => floors.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
  setInteriorFloor(inFloor);
  buildGrid(); buildNav(INTERIOR_X, 290);
  current = { group: grp, rooms: L.rooms, torches, style, entrance: new THREE.Vector3(e0.x, 0, e0.z + 2.5), chest: { mesh: chest, lid, pos: new THREE.Vector3(lc.x, 0, lc.z - 3.5), opened: false }, center: roomCenter, floors, hazards: haz, water: dynW };
  return current;
}
export const interiorNow = () => current;
