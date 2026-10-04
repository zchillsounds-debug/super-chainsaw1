import * as THREE from 'three';
import { humanoid } from './characters.js';
import { TYPES, captainLook } from './entities.js';
import { colliders } from './buildings.js';
import { buildGrid, resolve } from './collision.js';
import { buildNav, setInteriorFloor, INTERIOR_X, navClear } from './nav.js';
import { triplanarMaterial } from './triplanar.js';
import { rockTex } from './vegetation.js';
import { floorMat } from './interior.js';
import { mudBrick } from './textures.js';
import { firePit } from './props.js';
import { mergeStatic } from './world.js';
import { makeItem } from './items.js';
import { saveGame } from './save.js';
import { CODEX, unlock } from './narrative.js';
import * as SCENES from './scenes.js';
import { haptic } from './sheets.js';
import { t } from './i18n.js';

// Round 21: the holds of the Hamrin hills, four dungeons laid out by hand rather than rolled at random. Each is a
// tile map (3 m tiles) of rock and ravine: rope-railed plank bridges over chasms, ledges, low walls to fight round,
// a cracked wall that hides a side chamber, a barred gate that opens a shortcut back to the start once it is
// reached from the far side, and two campfires. Resting at a fire heals, refills the sherbet, brings his men back
// to their posts and makes the fire the place Salim wakes if he falls; any fire already lit can be travelled to.
// Each hold has a captain halfway (the mid-boss) and its master at the end, every one with moves of his own.
// Inside, the camera comes down behind Salim's shoulder (the close action camera) with a lock-on.
//   legend: # rock  . floor  ~ chasm  = bridge  w low wall  p pillar  x cracked wall  g barred gate
//           E entrance  C campfire  m foes  a archers  M mid-boss  B master  T the master's chest  S hidden chest
const TILE = 3, OX = 220;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const rand = (a, b) => a + Math.random() * (b - a);
const WALK = new Set(['.', 'E', 'C', 'm', 'a', 'M', 'B', 'T', 'S', '=']);

const MAPS = {
  quarry: [
    '################################',
    '#########.........##############',
    '########...p...p...#############',
    '########.....B.....#############',
    '########...p...p...#############',
    '#########....T....##############',
    '###########.....################',
    '############...#################',
    '############.C.#################',
    '############...#################',
    '#####~~~~~~~~=~~~~~~~###########',
    '#####~~~~~~~~=~~~~~~~###########',
    '#####...a....=....a..###########',
    '#####..............m.###########',
    '#####.m...........#####.....####',
    '#####.....w..w....x...S.....####',
    '######...........######.....####',
    '#######....m....#######.....####',
    '########.......#################',
    '#######.........################',
    '######....p.p....###############',
    '######.....M.....###############',
    '######....p.p....g......########',
    '#######.........##.....#########',
    '########.......###.....#########',
    '##########...#####..m..#########',
    '##########...#####.....#########',
    '#####~~~~~=~~~~~~##.....########',
    '#####~~~~~=~~~~~~###...#########',
    '#####..m..=..a..####...#########',
    '#####...........####...#########',
    '######....m....#####...#########',
    '#######.......######...#########',
    '#########...#######....#########',
    '#########...######....##########',
    '########.....C.......###########',
    '########...........#############',
    '#########....E....##############',
    '##########.......###############',
    '################################',
  ],
  fort: [
    '##################################',
    '##########..............##########',
    '#########..p..........p..#########',
    '#########.......B........#########',
    '#########..p..........p..#########',
    '##########......T.......##########',
    '#############w.....w#############~',
    '#############...C...#############~',
    '#############.......#############~',
    '##########aw.........wa##########~',
    '##########...........#####......#~',
    '##########..m.....m..x....S.....#~',
    '##########...........#####......#~',
    '###########....w....############~~',
    '############.......#############~~',
    '############...M...############~~~',
    '###########.........###########~~~',
    '###########.p.....p.g.......===~~~',
    '############.......##.......#~~~~~',
    '#############.....###...m...#~~~~~',
    '##############...####.......#~~~~~',
    '##############...####...a...#~~~~~',
    '#######.......w.w...###....##~~~~~',
    '#######.a..........m###....##~~~~~',
    '#######...w.....w...###....###~~~~',
    '########...m.....m.####....###~~~~',
    '#########.........#####....###~~~~',
    '##########w.....w######....###~~~~',
    '###########.....#######....###~~~~',
    '############.C............####~~~~',
    '############.....#############~~~~',
    '#############.E.##############~~~~',
    '#############...##############~~~~',
    '##################################',
  ],
  gorge: [
    '##############################',
    '##########...........#########',
    '#########..p.......p..########',
    '#########......B......########',
    '#########..p.......p..########',
    '##########.....T.....#########',
    '############.......###########',
    '#####~~~~~~~~~=~~~~~~~~~######',
    '#####~~~~~~~~~=~~~~~~~~~######',
    '#####~~~~~~~~~=~~~~~~~~~######',
    '#####~~~~~~...C...~~~~~~######',
    '#####~~~~~~.......~~~~~~######',
    '#####~~~~~~~~~=~~~~~~~~~######',
    '#####~~~~~~~~~=~~~~~~~~~######',
    '#####~~~~~=========~~~~~######',
    '#####~~~~~=.......=~~~~~######',
    '#####~~~~~=...M...=~~~~~######',
    '#####~~~~~=.......=~~~~~######',
    '#####~~~~~=========~~~~~######',
    '#####~~~~~~~~~=~~~~~~~~~######',
    '#####~~~~~~~~~=~~~~~~~~~######',
    '#####~~~~~~.......~~~~~~######',
    '#####~~~~~~.a...a.x....S######',
    '#####~~~~~~.......~~...#######',
    '#####~~~~~~~~~=~~~~~~~~~######',
    '#####~~~~~~~~~=~~~~~~~~~######',
    '#####~~.....~~=~~~~~~~~~######',
    '#####~~..m..g.......m...######',
    '#####~~.....~~~~~~~~~=~~######',
    '#####~~~~=~~~~~~~~~~~=~~######',
    '#####~~~~=~~~~~~~~~~~=~~######',
    '#####~......m..........~######',
    '#####~...a.......a.....~######',
    '#####~~~~~~~~~=~~~~~~~~~######',
    '#####~~~~~~~~~=~~~~~~~~~######',
    '##########.........###########',
    '##########....C....###########',
    '##########.........###########',
    '###########...E...############',
    '##############################',
  ],
  rivalhold: [
    '################################',
    '#######..................#######',
    '######..p.....p.....p.....######',
    '######......................####',
    '######..p.......B.......p...####',
    '######......................####',
    '#######..p.....p.....p....######',
    '##########......T......#########',
    '##############.....#############',
    '###############.C.##############',
    '###############...##############',
    '##########a.......####.....#####',
    '#########.....w.......x..S.#####',
    '#########..m......m.###....#####',
    '##########.....#########.#######',
    '###########...##################',
    '##########.....#################',
    '#########...M...################',
    '##########.....g........########',
    '#########.....####.....#########',
    '#####~~~~=~~~~~###..a..#########',
    '#####~~~~=~~~~~###.....#########',
    '#####..a.=..m..####...##########',
    '######.......######...##########',
    '#######..m...######...##########',
    '########...#######....##########',
    '#######.....#####....###########',
    '######...w...a#.....############',
    '#######.........m..#############',
    '########.....C....##############',
    '#########.......################',
    '##########..E..#################',
    '################################',
  ],
};

// ------------------------------------------------------------------ the eight captains
// look: built like any captain (heavy coat, a crest), each in his own colour; moves: what he can do, how often
const BOSS = {
  sakhr: { name: 'Sakhr', sub: 'Master of the quarry gangs', type: 'engineer', look: { scale: 1.45, belly: 0.5, cap: 0x3a2a1e, capBand: 0x6a3a1a, helm: false, crest: 'hat', sash: 0x6a3a1a }, hp: 14, dmg: 1.5,
    moves: ['swing', 'crack', 'slam'], p2: { at: 0.5, line: 'Bring the face down on him!', add: ['rockfall'] } },
  ghaylan: { name: 'Ghaylan', sub: 'Overseer of the galleries', type: 'spearman', look: { scale: 1.5, crest: 'plume', sash: 0x5a4a1a }, hp: 22, dmg: 1.6,
    moves: ['swing', 'charge', 'rockfall', 'sweep'], p2: { at: 0.5, line: 'Every man to me!', add: ['summon', 'crack'], summon: ['guard', 'spearman', 'crossbow'] } },
  shaddad: { name: 'Shaddad', sub: 'The shield of the fort', type: 'guard', look: { scale: 1.55, crest: 'heavy', sash: 0x1a3a5a, offhand: 'shield' }, hp: 16, dmg: 1.5, block: 0.9,
    moves: ['swing', 'charge', 'slam'], p2: { at: 0.5, line: 'Close the wall!', add: ['summon'], summon: ['guard', 'guard'] } },
  jabala: { name: 'Jabala', sub: 'Commander of the cliff fort', type: 'guard', look: { scale: 1.5, crest: 'banner', sash: 0x6a1a14, cloak: 0x3a0e0a }, hp: 24, dmg: 1.6,
    moves: ['swing', 'arrows', 'sweep'], p2: { at: 0.55, line: 'Archers! Fire on the yard!', add: ['fireline', 'summon'], summon: ['archer', 'archer', 'crossbow'] } },
  dhuayb: { name: 'Dhuayb', sub: 'Keeper of the bridge', type: 'spearman', look: { scale: 1.45, crest: 'mantle', sash: 0x2a4a2a, cloak: 0x2a4a2a }, hp: 16, dmg: 1.5,
    moves: ['swing', 'sweep', 'stomp', 'charge'], p2: { at: 0.45, line: 'Break the boards under him!', add: ['stomp'] } },
  hanzala: { name: 'Hanzala', sub: 'Master of the gorge', type: 'spearman', look: { scale: 1.5, crest: 'hat', sash: 0x4a1a3a, hat: 0xb8a468, helm: false }, hp: 24, dmg: 1.6,
    moves: ['swing', 'net', 'charge', 'sweep'], p2: { at: 0.5, line: 'Cut the ropes. Let the gorge have him.', add: ['shrink', 'arrows'] } },
  nahshal: { name: 'Nahshal', sub: 'Zubayr\'s naft-master', type: 'naffat', look: { scale: 1.45, crest: 'hat', sash: 0x7a2a10 }, hp: 16, dmg: 1.5,
    moves: ['swing', 'fireline', 'firepots'], p2: { at: 0.5, line: 'Burn it all!', add: ['summon'], summon: ['naffat', 'naffat', 'deserter'] } },
  zubayr: { name: 'Zubayr', sub: 'The bowman on the dune', type: 'zubayr', look: { scale: 1.12 }, hp: 30, dmg: 1.5, rival: true,
    moves: ['arrows', 'rockfall'], p2: { at: 0.5, line: 'You will not see the next one coming.', add: ['vanish'] } },
};
export const HOLDS = {
  quarry: { title: 'The Quarry Galleries', sub: 'Old workings in the western cliff', rock: 0xd8c8a8, floor: [0x9a8a70, 'earth'], wall: 0xc8b898, pool: ['guard', 'deserter', 'spearman', 'engineer'], ranged: ['crossbow', 'archer'], mid: 'sakhr', boss: 'ghaylan', codex: 'quarry', quest: 'quarry', step: 0 },
  fort: { title: 'The Cliff Fort', sub: 'A border fort the deserters hold', rock: 0xb8a890, floor: [0x8a7a62, 'flag'], wall: 0xa89878, pool: ['guard', 'spearman', 'guard', 'deserter'], ranged: ['archer', 'crossbow'], mid: 'shaddad', boss: 'jabala', codex: 'deserters', quest: 'fort', step: 1 },
  gorge: { title: 'The Gorge Bridge', sub: 'Plank ways across the ravine of the Diyala', rock: 0x9a8270, floor: [0x7a6a58, 'earth'], wall: 0x8a7462, pool: ['spearman', 'deserter', 'guard', 'netter'], ranged: ['archer', 'slinger'], mid: 'dhuayb', boss: 'hanzala', codex: 'diyala', quest: 'gorge', step: 2 },
  rivalhold: { title: 'Zubayr\'s Hold', sub: 'The bowman\'s ravine', rock: 0x9a6a50, floor: [0x6a4e3a, 'earth'], wall: 0x8a5a44, pool: ['deserter', 'guard', 'deserter', 'naffat'], ranged: ['archer', 'archer', 'crossbow'], mid: 'nahshal', boss: 'zubayr', codex: 'hamrin', quest: 'rivalhold', step: 3 },
};
for (const [k, B] of Object.entries(BOSS)) if (B.type !== 'zubayr') {
  // each captain is his own type, built from his men's look with his crest and colour
  const base = TYPES[B.type];
  TYPES['hb_' + k] = { ...base, name: B.name, build: (x) => base.build({ ...captainLook(B.name), ...B.look, detail: 'hi', ...x }) };
}

// ------------------------------------------------------------------ the builder
let KIT = null;
function kit() {
  if (KIT) return KIT;
  const rt = rockTex(), brick = mudBrick([150, 132, 110]);
  KIT = {
    rt, brick, plank: new THREE.MeshStandardMaterial({ color: 0x6a4a2c, roughness: 0.9 }), plank2: new THREE.MeshStandardMaterial({ color: 0x4e3620, roughness: 0.95 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x9a8058, roughness: 1 }), void: new THREE.MeshBasicMaterial({ color: 0x050403 }),
    river: new THREE.MeshStandardMaterial({ color: 0x2a4a48, roughness: 0.15, metalness: 0.3, emissive: 0x081412 }), deep: new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x2a2624, metalness: 0.8, roughness: 0.5 }), ember: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.3), toneMapped: false }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc9973c, metalness: 0.85, roughness: 0.4 }), wood: new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.85 }),
    styles: {},
  };
  return KIT;
}
function styleMats(id) {
  const K = kit(), H = HOLDS[id];
  if (K.styles[id]) return K.styles[id];
  return (K.styles[id] = {
    rock: triplanarMaterial({ map: K.rt.map, normalMap: K.rt.normal, color: H.rock, scale: 0.55, roughness: 0.95, normalStrength: 1.6, grime: 0.55 }),
    wall: triplanarMaterial({ map: K.brick.map, normalMap: K.brick.normalMap, color: H.wall, scale: 0.5, roughness: 0.95, normalStrength: 1.2, grime: 0.6 }),
    crack: triplanarMaterial({ map: K.rt.map, normalMap: K.rt.normal, color: new THREE.Color(H.rock).multiplyScalar(1.15), scale: 0.6, roughness: 1, normalStrength: 2.6, grime: 1.0 }),
    floor: floorMat(H.floor[0], H.floor[1], 1, id === 'gorge' ? 0.25 : 0),
  });
}
// one lumpy rock (a noisy dodecahedron), shared by every cliff and column
let _lump = null;
function rockLump() {
  if (_lump) return _lump;
  const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const n = 1 + Math.sin(v.x * 4.1 + v.y * 2.3) * 0.12 + Math.sin(v.z * 5.3 - v.x * 1.7) * 0.1 + Math.sin(v.y * 7.1) * 0.06; v.multiplyScalar(n); v.y *= 0.85; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return (_lump = g);
}
const hash = (c, r) => { let h = (c * 73856093) ^ (r * 19349663); h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export function buildHold(scene, id) {
  const rows = MAPS[id], H = rows.length, W = rows[0].length, M = styleMats(id), K = kit();
  const at = (c, r) => rows[r]?.[c] ?? '#';
  const X = (c) => OX + (c - W / 2) * TILE + TILE / 2, Z = (r) => (r - H / 2) * TILE + TILE / 2;
  const grp = new THREE.Group(), dyn = new THREE.Group();
  const add = (geo, m, x, y, z, ry = 0, into = grp) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; into.add(o); return o; };
  const col = (x, z, hw, hd, extra = {}) => { const c = { type: 'box', x, z, hw, hd, rot: 0, interior: true, ...extra }; colliders.push(c); return c; };
  const I = { hold: id, mist: [], group: grp, rooms: [], torches: [], style: 'hold', floors: [], hazards: [], water: [], fades: [], spawns: [], fires: [], gates: [], cracks: [], chests: [], tiles: rows, W, H, X, Z, at };
  const walkable = (c, r) => WALK.has(at(c, r)) || (at(c, r) === 'x' && I.cracks.find((k) => k.c === c && k.r === r)?.open) || (at(c, r) === 'g' && I.gates.find((k) => k.c === c && k.r === r)?.open);
  I.walkable = walkable;
  const floorG = new THREE.PlaneGeometry(TILE, TILE).rotateX(-Math.PI / 2);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const ch = at(c, r), x = X(c), z = Z(r), near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => WALK.has(at(c + dc, r + dr)) || '~xgwp'.includes(at(c + dc, r + dr)));
    if (WALK.has(ch) && ch !== '=') { add(floorG, M.floor, x, 0, z).castShadow = false; I.floors.push([x - TILE / 2, z - TILE / 2, x + TILE / 2, z + TILE / 2]); }
    if ('wpCgx'.includes(ch)) { add(floorG, M.floor, x, 0, z).castShadow = false; I.floors.push([x - TILE / 2, z - TILE / 2, x + TILE / 2, z + TILE / 2]); }
    if (ch === '#' && !near) {
      // the rock beyond the paths: big weathered lumps at mixed heights, a ridge line against the sky
      if (hash(c, r) < 0.7) continue;
      const lr = 2.6 + hash(c + 9, r) * 2.4, lump = add(rockLump(), M.rock, x, 4 + hash(r, c + 4) * 6, z); lump.scale.set(lr, lr * (0.9 + hash(c, r + 6) * 0.9), lr); lump.rotation.set(hash(c, r) * 3, hash(r, c) * 6, 0); lump.castShadow = false;
    } else if (ch === '#') {
      // rock at the paths' edge: jagged columns
      const h = 6.5 + hash(c, r) * 5.5 + (near ? 0 : 2.5), w = TILE + 0.06;
      // a rough base, jittered, then lumps of rock stacked and leaning on it: it reads as cliff, not as blocks
      const jx = (hash(c + 11, r) - 0.5) * 0.5, jz = (hash(c, r + 11) - 0.5) * 0.5;
      add(new THREE.BoxGeometry(w, h * 0.72, w), M.rock, x + jx, h * 0.36 - 0.2, z + jz, (hash(r, c) - 0.5) * 0.35);
      if (near) {
        col(x, z, TILE / 2, TILE / 2);
        for (let k = 0; k < 2; k++) { const lr = 1.5 + hash(c + k, r * 3) * 0.7, lump = add(rockLump(), M.rock, x + (hash(c * 7 + k, r) - 0.5) * 1.2, h * (0.45 + k * 0.32), z + (hash(c, r * 7 + k) - 0.5) * 1.2); lump.scale.set(lr, lr * (1.2 + hash(r + k, c) * 0.8), lr); lump.rotation.set(hash(c, r + k) * 3, hash(r, c + k) * 6, hash(c + k, r) * 0.6); }
        if (hash(c + 3, r + 5) < 0.35) { const ledge = add(new THREE.BoxGeometry(w * 1.05, 0.5, w * 1.05), M.rock, x, h * (0.3 + hash(c, r + 2) * 0.3), z, hash(c + 1, r) * 0.6); ledge.castShadow = true; }
      }
      if (near && hash(c + 7, r) < 0.3) { const b = add(new THREE.DodecahedronGeometry(0.6 + hash(r, c + 3) * 0.7, 0), M.rock, x + (hash(c, r + 9) - 0.5) * 2, 0.3, z + (hash(c + 2, r) - 0.5) * 2); b.rotation.set(hash(c, r) * 3, hash(r, c) * 3, 0); }
    } else if (ch === '~') {
      // the drop: dark below, rock faces going down at its edges
      col(x, z, TILE / 2, TILE / 2, { chasm: true });
      // far below: the river (the gorge) or rubble on a dark floor (the quarry, the fort's drop, the ravine)
      add(new THREE.PlaneGeometry(TILE, TILE).rotateX(-Math.PI / 2), id === 'gorge' ? K.river : K.deep, x, -12, z).castShadow = false;
      if (hash(c * 3, r) < 0.35) { const b = add(rockLump(), M.rock, x + (hash(c, r * 5) - 0.5) * 2, -12, z + (hash(c * 5, r) - 0.5) * 2); const bs = 0.5 + hash(r, c * 2) * 0.9; b.scale.set(bs, bs * 0.7, bs); b.castShadow = false; }
      if (hash(c, r * 3) < 0.12) I.mist.push(V(x, -9, z));
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = at(c + dc, r + dr); if (n === '~' || n === '#') continue;
        const face = add(new THREE.BoxGeometry(dc ? 0.7 : TILE, 12.2, dr ? 0.7 : TILE), M.rock, x + dc * (TILE / 2 - 0.35), -6.05, z + dr * (TILE / 2 - 0.35)); face.castShadow = false;
      }
    } else if (ch === '=') {
      // a plank way: boards across, a rope rail on each chasm side, posts at the corners
      const alongZ = at(c - 1, r) === '~' || at(c + 1, r) === '~';
      for (let k = 0; k < 6; k++) { const o = k / 6 * TILE - TILE / 2 + TILE / 12; add(new THREE.BoxGeometry(alongZ ? TILE * 0.96 : 0.44, 0.1, alongZ ? 0.44 : TILE * 0.96), k % 2 ? K.plank : K.plank2, x + (alongZ ? 0 : o), -0.02 - hash(c * 3 + k, r) * 0.04, z + (alongZ ? o : 0)); }
      I.floors.push([x - TILE / 2, z - TILE / 2, x + TILE / 2, z + TILE / 2]);
      add(new THREE.BoxGeometry(alongZ ? 0.18 : TILE, 0.22, alongZ ? TILE : 0.18), K.plank2, x + (alongZ ? -TILE / 2 + 0.1 : 0), -0.16, z + (alongZ ? 0 : -TILE / 2 + 0.1)).castShadow = false;
      for (const s of [-1, 1]) {
        const side = alongZ ? at(c + s, r) : at(c, r + s); if (side !== '~') continue;
        const ox = alongZ ? s * (TILE / 2 - 0.12) : 0, oz = alongZ ? 0 : s * (TILE / 2 - 0.12);
        add(new THREE.CylinderGeometry(0.07, 0.08, 1.2, 6), K.plank2, x + ox + (alongZ ? 0 : -TILE / 2), 0.55, z + oz + (alongZ ? -TILE / 2 : 0));
        const rope = add(new THREE.CylinderGeometry(0.025, 0.025, TILE, 4), K.rope, x + ox, 1.05, z + oz); rope.rotation[alongZ ? 'x' : 'z'] = Math.PI / 2; rope.castShadow = false;
        col(x + ox, z + oz, alongZ ? 0.12 : TILE / 2, alongZ ? TILE / 2 : 0.12);
      }
    } else if (ch === 'w') {
      add(new THREE.BoxGeometry(TILE, 1.15, TILE * 0.55), M.wall, x, 0.57, z); col(x, z, TILE / 2, TILE * 0.28);
    } else if (ch === 'p') {
      // a column of rock the quarrymen left standing: rough lumps stacked on a broad foot
      add(new THREE.CylinderGeometry(0.9, 1.15, 2.2, 7), M.rock, x, 1.1, z, hash(c, r) * 3);
      for (let k = 0; k < 3; k++) { const lump = add(rockLump(), M.rock, x + (hash(c + k, r) - 0.5) * 0.3, 2.4 + k * 1.5, z + (hash(c, r + k) - 0.5) * 0.3); const sc = 0.95 - k * 0.12; lump.scale.set(sc, sc * 1.25, sc); lump.rotation.set(hash(c * 3 + k, r) * 3, hash(r, c * 3 + k) * 6, 0); }
      col(x, z, 0.95, 0.95);
    } else if (ch === 'x') {
      const m = add(new THREE.BoxGeometry(TILE + 0.06, 7, TILE + 0.06), M.crack, x, 3.3, z, 0, dyn); m.userData.noMerge = true;
      for (let k = 0; k < 4; k++) { const cr = add(new THREE.BoxGeometry(0.08, 2.2, 0.08), K.void, x + (k - 1.5) * 0.5, 1.3 + k * 0.3, z + TILE / 2 + 0.05, 0, m); cr.position.set((k - 1.5) * 0.5, -2 + k * 0.3, TILE / 2 + 0.05); cr.rotation.z = (k % 2 ? 0.5 : -0.4); }
      I.cracks.push({ c, r, x, z, mesh: m, col: col(x, z, TILE / 2, TILE / 2), open: false });
    } else if (ch === 'g') {
      const gate = new THREE.Group(); gate.position.set(x, 0, z); dyn.add(gate);
      const alongX = WALK.has(at(c, r - 1)) || WALK.has(at(c, r + 1));
      const leaf = new THREE.Group(); gate.add(leaf);
      for (let k = 0; k < 7; k++) add(new THREE.BoxGeometry(alongX ? 0.36 : 0.22, 3.2, alongX ? 0.22 : 0.36), K.plank, alongX ? -TILE / 2 + 0.25 + k * 0.42 : 0, 1.6, alongX ? 0 : -TILE / 2 + 0.25 + k * 0.42, 0, leaf);
      add(new THREE.BoxGeometry(alongX ? TILE : 0.3, 0.26, alongX ? 0.3 : TILE), K.iron, 0, 2.0, 0, 0, leaf); add(new THREE.BoxGeometry(alongX ? TILE : 0.3, 0.26, alongX ? 0.3 : TILE), K.iron, 0, 0.8, 0, 0, leaf);
      I.gates.push({ c, r, x, z, mesh: gate, leaf, col: col(x, z, TILE / 2, TILE / 2), open: false, alongX });
    }
    // furniture of the special tiles
    if (ch === 'C') {
      const f = firePit(); f.position.set(x, 0, z); dyn.add(f);
      for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.22, 0.22, 1.5, 7), K.wood, x + s * 1.2, 0.22, z + 0.5, Math.PI / 2 + s * 0.3, dyn).rotation.z = Math.PI / 2;
      const fire = { c, r, pos: V(x, 0, z), lit: false, idx: I.fires.length }; I.fires.push(fire);
      I.torches.push({ pos: V(x, 0.4, z), light: V(x, 1.2, z), intensity: 0.8, fire: true });
      colliders.push({ type: 'circle', x, z, r: 0.9, interior: true });
    }
    if (ch === 'E') { I.entrance = V(x, 0, z + 1); I.start = V(x, 0, z - 2.5); } // he arrives a step in, so the camera has room behind him
    if (ch === 'm' || ch === 'a') I.spawns.push({ kind: ch, x, z });
    if (ch === 'M') I.midAt = V(x, 0, z);
    if (ch === 'B') I.bossAt = V(x, 0, z);
    if (ch === 'T' || ch === 'S') {
      const chest = new THREE.Group();
      add(new THREE.BoxGeometry(1.1, 0.6, 0.7), K.wood, 0, 0.3, 0, 0, chest);
      const lid = add(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), K.wood, 0, 0.6, 0, 0, chest);
      for (const sx of [-0.4, 0.4]) add(new THREE.BoxGeometry(0.08, 0.95, 0.74), K.gold, sx, 0.45, 0, 0, chest);
      chest.position.set(x, 0, z); dyn.add(chest);
      colliders.push({ type: 'circle', x, z, r: 0.75, interior: true });
      I.chests.push({ kind: ch, pos: V(x, 0, z), mesh: chest, lid, opened: false });
    }
  }
  // braziers along the paths (light from the pool where the walls close in)
  for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) {
    if (at(c, r) !== '#' || hash(c * 5, r * 3) > 0.12) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dc, dr]) => WALK.has(at(c + dc, r + dr)) && at(c + dc, r + dr) !== '=');
    if (!n) continue;
    const x = X(c) + n[0] * (TILE / 2 + 0.3), z = Z(r) + n[1] * (TILE / 2 + 0.3);
    add(new THREE.CylinderGeometry(0.06, 0.04, 0.7, 6), K.iron, x, 2.3, z).rotation.set(n[1] * 0.5, 0, -n[0] * 0.5);
    add(new THREE.SphereGeometry(0.1, 6, 5), K.ember, x + n[0] * 0.15, 2.65, z + n[1] * 0.15).castShadow = false;
    I.torches.push({ pos: V(x + n[0] * 0.15, 2.7, z + n[1] * 0.15), light: V(x + n[0] * 0.9, 2.4, z + n[1] * 0.9), intensity: 0.5, torch: true });
  }
  grp.updateMatrixWorld(true); mergeStatic(grp);
  grp.traverse((o) => { if (o.isMesh) o.userData.noOcc = true; });
  grp.add(dyn); scene.add(grp);
  // collision and paths for the layout (gates and cracked walls block until opened)
  const tileOf = (x, z) => [Math.floor((x - OX) / TILE + W / 2), Math.floor(z / TILE + H / 2)];
  I.tileOf = tileOf;
  setInteriorFloor((x, z) => { const [c, r] = tileOf(x, z); return walkable(c, r); });
  buildGrid(); buildNav(INTERIOR_X, 290);
  // which side of each gate is the far one (reached later along the way from the entrance)
  const dist = new Map(), q = [], [ec, er] = tileOf(I.entrance.x, I.entrance.z); dist.set(ec + ',' + er, 0); q.push([ec, er]);
  while (q.length) { const [c, r] = q.shift(), d = dist.get(c + ',' + r); for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (c + dc) + ',' + (r + dr); if (dist.has(k) || !(WALK.has(at(c + dc, r + dr)) || at(c + dc, r + dr) === 'x')) continue; dist.set(k, d + 1); q.push([c + dc, r + dr]); } }
  for (const G of I.gates) {
    const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dc, dr]) => [G.c + dc, G.r + dr]).filter(([c, r]) => WALK.has(at(c, r)));
    sides.sort((a, b) => (dist.get(b.join()) ?? 0) - (dist.get(a.join()) ?? 0));
    G.far = V(X(sides[0][0]), 0, Z(sides[0][1])); G.near = V(X(sides[sides.length - 1][0]), 0, Z(sides[sides.length - 1][1]));
  }
  I.center = () => I.entrance; I.chest = null;
  return I;
}
function destroyHold(scene, I) {
  scene.remove(I.group);
  I.group.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
  for (let i = colliders.length - 1; i >= 0; i--) if (colliders[i].interior) colliders.splice(i, 1);
}

// ------------------------------------------------------------------ captains' moves
// telegraphs: a ground line (made at load, pooled) and the game's ring telegraph
function lineTele(g, from, dir, len, w, delay, onDone) {
  const L = g.holdLines.find((m) => !m.visible); if (!L) { setTimeout(onDone, delay * 1000); return; }
  L.visible = true; L.position.set(from.x + dir.x * len / 2, (from.y || 0) + 0.08, from.z + dir.z * len / 2); L.rotation.set(0, Math.atan2(dir.x, dir.z), 0); L.scale.set(w, 1, len);
  g.hazards.push({ kind: 'holdline', mesh: L, t: 0, life: delay, onDone, from: from.clone(), dir: dir.clone(), len, w });
}
const inLine = (p, H) => { const dx = p.x - H.from.x, dz = p.z - H.from.z, along = dx * H.dir.x + dz * H.dir.z, side = Math.abs(dx * H.dir.z - dz * H.dir.x); return along > -0.5 && along < H.len + 0.5 && side < H.w / 2 + 0.3; };
const MOVES = {
  // a heavy swing with a glint first: an evade then turns it aside (the game's parry)
  swing: { range: [0, 3.4], cd: 1.6, start(g, e) { e.st.action = e.T.action === 'thrust' ? 'thrust' : 'attack'; e.mv = { t: 0, dur: 0.95, hit: false }; g.telegraphTell(e); },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = M.t / M.dur; if (!M.hit && M.t > 0.55) { M.hit = true; if (g.player.pos.distanceTo(e.pos) < e.range + 1.4) g.damagePlayer(e.dmg, e.pos, e); g.audio.at(e.pos, () => g.audio.swing?.()); } return M.t >= M.dur; } },
  // a slam on a marked ring in front of him
  slam: { range: [0, 6], cd: 6, start(g, e) { const f = V(Math.sin(e.facing), 0, Math.cos(e.facing)); const c = e.pos.clone().addScaledVector(f, 2.4); e.mv = { t: 0, dur: 1.4, c }; e.st.action = 'slam'; g.telegraph(c, 3.4, 0.82, () => { g.audio.boom?.(); g.shake = Math.max(g.shake, 0.6); g.fx.dust(c, 20, 2); g.fx.ring(c, new THREE.Color(2, 1.7, 1.2), 0.6, 4.2, 0.45); if (g.player.pos.distanceTo(c) < 3.6) g.damagePlayer(e.dmg * 1.5, c); }); },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / M.dur); return M.t >= M.dur; } },
  // a crack runs along the ground toward Salim and bursts
  crack: { range: [3, 14], cd: 7, start(g, e) { const d = tmp.set(g.player.pos.x - e.pos.x, 0, g.player.pos.z - e.pos.z).normalize().clone(); e.facing = Math.atan2(d.x, d.z); e.st.action = 'slam'; e.mv = { t: 0, dur: 1.5 };
      lineTele(g, e.pos.clone().addScaledVector(d, 1), d, 15, 2.2, 1.0, () => { const H = { from: e.pos.clone().addScaledVector(d, 1), dir: d, len: 15, w: 2.2 }; for (let k = 0; k < 8; k++) g.fx.dust(tmp2.copy(H.from).addScaledVector(d, k * 2), 6, 1.2); g.audio.boom?.(); g.shake = Math.max(g.shake, 0.4); if (inLine(g.player.pos, H)) g.damagePlayer(e.dmg * 1.3, e.pos); }); },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / M.dur); return M.t >= M.dur; } },
  // stones (or cut blocks) dropped from above onto marked rings round Salim
  rockfall: { range: [0, 20], cd: 9, start(g, e) { e.st.action = 'command'; e.mv = { t: 0, dur: 1.4 }; const p = g.player.pos;
      for (let i = 0; i < 6; i++) { const q = V(p.x + (i ? rand(-6, 6) : 0), 0, p.z + (i ? rand(-6, 6) : 0)); if (!g.holdWalk(q)) continue; g.lobStone(V(q.x + 2, 16, q.z - 1), q, e.dmg * 1.0, 1.3 + i * 0.18, 1.9); } },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / M.dur); return M.t >= M.dur; } },
  // a charge along a marked lane; if he runs into rock he is stunned
  charge: { range: [4, 16], cd: 8, start(g, e) { const d = tmp.set(g.player.pos.x - e.pos.x, 0, g.player.pos.z - e.pos.z).normalize().clone(); e.facing = Math.atan2(d.x, d.z); e.mv = { t: 0, dir: d, phase: 'wind', hit: false, run: 0 };
      lineTele(g, e.pos.clone(), d, 16, 2.0, 0.75, () => {}); e.st.crouch = 0.4; },
    tick(g, e, dt, M) { M.t += dt;
      if (M.phase === 'wind') { if (M.t > 0.75) { M.phase = 'run'; e.st.crouch = 0; g.audio.at(e.pos, () => g.audio.roar?.()); } return false; }
      const step = 19 * dt; const before = e.pos.clone(); e.pos.addScaledVector(M.dir, step); M.run += step; const bumped = resolve(e.pos, e.radius) && e.pos.distanceTo(before) < step * 0.5;
      e.st.walkBlend = 1; e.st.phase += dt * 14; g.fx.dust(e.pos, 2, 0.8);
      if (!M.hit && g.player.pos.distanceTo(e.pos) < 2.0) { M.hit = true; g.damagePlayer(e.dmg * 1.4, e.pos, e); g.player.knock = (g.player.knock || new THREE.Vector3()).addScaledVector(M.dir, 16); }
      if (bumped) { e.staggerT = 1.8; g.shake = 0.5; g.audio.boom?.(); g.ui.damageNumber(e.pos, 'Stunned', 'stagger'); return true; }
      return M.run > 16; } },
  // a wide sweep all round him that throws Salim back
  sweep: { range: [0, 4.5], cd: 6.5, start(g, e) { e.st.action = 'sweep'; e.mv = { t: 0, dur: 1.2 }; g.telegraph(e.pos.clone(), 4.0, 0.7, () => { const p = g.player; if (p.pos.distanceTo(e.pos) < 4.2) { g.damagePlayer(e.dmg * 1.2, e.pos, e); p.knock = (p.knock || new THREE.Vector3()).addScaledVector(tmp.set(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z).normalize(), 20); } g.audio.at(e.pos, () => g.audio.swing?.()); }); },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / M.dur); return M.t >= M.dur; } },
  // a stamp that breaks the boards: holes that slow and hurt for a while
  stomp: { range: [0, 7], cd: 9, start(g, e) { e.st.action = 'slam'; e.mv = { t: 0, dur: 1.3 }; g.telegraph(e.pos.clone(), 4.6, 0.85, () => { g.audio.boom?.(); g.shake = 0.5; if (g.player.pos.distanceTo(e.pos) < 4.8) g.damagePlayer(e.dmg, e.pos); for (let i = 0; i < 3; i++) { const q = V(e.pos.x + rand(-5, 5), 0, e.pos.z + rand(-5, 5)); if (g.holdWalk(q)) g.holdHole(q); } }); },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / M.dur); return M.t >= M.dur; } },
  // arrows from his men above: rings that follow Salim
  arrows: { range: [0, 24], cd: 8, start(g, e) { e.st.action = 'command'; e.mv = { t: 0, dur: 2.4, n: 0 }; },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / 1.2); if (M.t > 0.3 + M.n * 0.38 && M.n < 6) { M.n++; const p = g.player.pos, q = p.clone().addScaledVector(g.player.vel || V(0, 0, 0), 0.5); q.y = 0; g.telegraph(q, 1.7, 0.9, () => { for (let k = 0; k < 5; k++) g.fx.dust(tmp2.set(q.x + rand(-1, 1), 0, q.z + rand(-1, 1)), 2, 0.4); if (g.player.pos.distanceTo(q) < 1.8) g.damagePlayer(e.dmg * 0.7, q); }); } return M.t >= M.dur; } },
  // naft poured in lines across the floor, lit one after another
  fireline: { range: [0, 16], cd: 10, start(g, e) { e.st.action = 'command'; const d = tmp.set(g.player.pos.x - e.pos.x, 0, g.player.pos.z - e.pos.z).normalize().clone(), side = V(d.z, 0, -d.x); e.mv = { t: 0, dur: 2.2 };
      for (let k = 0; k < 3; k++) { const c = e.pos.clone().addScaledVector(d, 3 + k * 3.2).addScaledVector(side, -8); setTimeout(() => lineTele(g, c, side, 16, 1.8, 0.9, () => { for (let j = 0; j < 6; j++) { const q = c.clone().addScaledVector(side, 1.4 + j * 2.6); if (g.holdWalk(q)) g.fires2.push({ pos: q, r: 1.5, life: 3.2, t: 0, tick: 0, dmg: e.dmg * 0.35 }); } g.audio.boom?.(); }), k * 450); } },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / 1.2); return M.t >= M.dur; } },
  // pots of naft thrown onto marked rings that burn where they land
  firepots: { range: [0, 16], cd: 7, start(g, e) { e.st.action = 'throw'; e.mv = { t: 0, dur: 1.2 }; const p = g.player.pos;
      for (let i = 0; i < 4; i++) { const q = V(p.x + (i ? rand(-5, 5) : 0), 0, p.z + (i ? rand(-5, 5) : 0)); g.telegraph(q, 2.0, 1.0 + i * 0.15, () => { g.decal(q, 4, 'scorch'); g.fires2.push({ pos: q, r: 2.0, life: 4, t: 0, tick: 0, dmg: e.dmg * 0.35 }); g.audio.boom?.(); }); } },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / M.dur); return M.t >= M.dur; } },
  // a casting net (the marsh men's trick): it pins Salim unless he evades through it
  net: { range: [3, 10], cd: 7, start(g, e) { e.st.action = 'throw'; e.mv = { t: 0, dur: 1.0, done: false }; },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = M.t / M.dur; if (!M.done && M.t > 0.5) { M.done = true; const f = Math.atan2(g.player.pos.x - e.pos.x, g.player.pos.z - e.pos.z); for (const a of [-0.3, 0, 0.3]) g.throwNet(e, V(Math.sin(f + a), 0, Math.cos(f + a))); } return M.t >= M.dur; } },
  // his men come at a call
  summon: { range: [0, 30], cd: 99, once: true, start(g, e) { e.st.action = 'command'; e.mv = { t: 0, dur: 1.4 }; const K = e.holdBoss; const men = g.spawnPack(K.p2?.summon || ['guard', 'guard'], e.pos.x, e.pos.z, (K.p2?.summon || []).length || 2, Math.max(1, e.level - 2), { spread: 5, interior: true }); for (const m of men) { m.alerted = true; m.interior = true; m.summoned = true; g.interior?.enemies.push(m); g.fx.dust(m.pos, 10, 1.2); } g.audio.roar?.(); },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / M.dur); return M.t >= M.dur; } },
  // the bridge's ropes cut: the safe ground shrinks toward the middle
  shrink: { range: [0, 40], cd: 99, once: true, start(g, e) { e.st.action = 'command'; e.mv = { t: 0, dur: 1.2 }; g.holdArena = { c: (g.interior?.I.bossAt || e.pos).clone(), r: 13, to: 6.5, t: 0 }; g.ui.toast(t('The ropes are cut. Keep to the middle')); },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / M.dur); return M.t >= M.dur; } },
  // into the smoke and out behind him (Zubayr's last trick)
  vanish: { range: [0, 30], cd: 8, start(g, e) { e.mv = { t: 0, phase: 'break' }; for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, r = Math.random() * 1.6; g.fx.smoke.spawn({ pos: { x: e.pos.x + Math.cos(a) * r, y: e.pos.y + Math.random() * 1.4, z: e.pos.z + Math.sin(a) * r }, vel: { x: Math.cos(a) * 0.8, y: 0.5, z: Math.sin(a) * 0.8 }, life: 3, size: 1.2, size1: 3.4, color: new THREE.Color(0.46, 0.44, 0.42), alpha: 0.6, drag: 0.6, fadeIn: 0.1 }); } },
    tick(g, e, dt, M) { M.t += dt; const p = g.player;
      if (M.phase === 'break' && M.t > 0.35) { M.phase = 'gone'; e.ghost = true; e.rig.visible = false; M.hold = rand(1.2, 1.8); }
      else if (M.phase === 'gone' && M.t > 0.35 + M.hold) { const a = p.facing + Math.PI + rand(-0.6, 0.6); e.pos.set(p.pos.x + Math.sin(a) * 9, 0, p.pos.z + Math.cos(a) * 9); resolve(e.pos, e.radius); e.ghost = false; e.rig.visible = true; M.phase = 'shot'; M.t2 = 0; e.st.action = 'shootKneel'; e.st.actionT = 0; e.aimAt = null; }
      else if (M.phase === 'shot') { M.t2 += dt; e.st.actionT = M.t2 / 1.1; g.aimLine(e, e.st.actionT); e.facing = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
        if (e.st.actionT > 0.72 && !M.fired) { M.fired = true; g.aimLine(e, null); const from = e.pos.clone(); from.y += 1.35; const to = (e.aimAt || p.pos).clone(); to.y = p.pos.y + 1; const dir = to.sub(from).normalize(); const m = new THREE.Mesh(g.arrowGeo, g.arrowMat); m.scale.set(1.6, 1.6, 1.3); m.position.copy(from); m.lookAt(from.clone().add(dir)); g.scene.add(m); g.projectiles.push({ mesh: m, vel: dir.multiplyScalar(42), grav: 0, life: 0.8, owner: 'enemy', kind: 'arrow', dmg: e.dmg * 2, bolt: true }); }
        if (e.st.actionT >= 1) { e.st.action = null; return true; } }
      return false; } },
};

function holdBossAI(g, e, dt, dist) {
  const p = g.player, K = e.holdBoss;
  if (e.dead) return 'skip';
  // waiting for Salim at his ground; he turns to meet him when he comes near
  if (!e.engaged) {
    e.st.walkBlend = 0; e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist);
    if (dist < 13 && !p.dead && !g.cinematic) g.holdEngage(e);
    return 'skip';
  }
  if (g.cinematic) return 'skip';
  g.ui.bossBar(K.name, e.hp / e.maxHp); e.barOn = true;
  if (!e.p2 && K.p2 && e.hp < e.maxHp * K.p2.at) { e.p2 = true; g.ui.banner(K.name, K.p2.line, 2600); g.audio.stinger?.('phase'); e.moves = [...e.moves, ...K.p2.add]; for (const m of K.p2.add) if (MOVES[m]?.once || m === 'vanish') e.cds[m] = m === 'vanish' ? 2 : 0; }
  for (const k in e.cds) e.cds[k] -= dt;
  const face = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
  if (e.staggerT > 0) { e.staggerT -= dt; e.st.hitT = 0.8; e.mv = null; e.st.action = null; e.rig.position.copy(e.pos); g.animEnemy(e, dt, dist); return 'skip'; }
  if (e.mv && e.curMove) {
    if (MOVES[e.curMove].tick(g, e, dt, e.mv)) { e.mv = null; e.curMove = null; e.st.action = null; e.st.crouch = 0; e.idleT = rand(0.35, 0.9); }
  } else if (K.rival && !e.mvOwn) {
    // Zubayr keeps his own fight (rivals.js) between the moves of his last stand
    e.idleT = (e.idleT ?? 1) - dt;
    if (e.idleT <= 0 && pickMove(g, e, dist)) return 'skip';
    return g.rivalAI(g, e, dt, dist);
  } else {
    e.idleT = (e.idleT ?? 0.6) - dt;
    if (e.idleT <= 0 && !p.dead && pickMove(g, e, dist)) return 'skip';
    // close in, or circle a little while the moves come round
    let moving = false; e.facing += angDiff(e.facing, face) * Math.min(1, dt * 5);
    if (dist > 2.6) { const wp = g.steer(e, p.pos), d = tmp.set(wp.x - e.pos.x, 0, wp.z - e.pos.z); const l = d.length(); if (l > 0.2) { e.pos.addScaledVector(d.divideScalar(l), e.speed * dt); moving = true; } }
    resolve(e.pos, e.radius);
    e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend, moving ? 1 : 0, Math.min(1, dt * 6)); e.st.phase += dt * (moving ? e.speed * 1.4 : 0);
  }
  e.pos.y = 0; e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist);
  return 'skip';
}
function pickMove(g, e, dist) {
  const ok = e.moves.filter((m) => { const M = MOVES[m]; return M && (e.cds[m] ?? 0) <= 0 && dist >= M.range[0] && dist <= M.range[1]; });
  if (!ok.length) return false;
  // the big moves first when they are ready; the plain swing fills the gaps
  const big = ok.filter((m) => m !== 'swing'), m = big.length && Math.random() < 0.7 ? big[Math.floor(Math.random() * big.length)] : ok[Math.floor(Math.random() * ok.length)];
  const M = MOVES[m]; e.cds[m] = M.cd * (e.p2 ? 0.8 : 1) * rand(0.9, 1.15); e.curMove = m; e.st.actionT = 0; M.start(g, e);
  return true;
}

// ------------------------------------------------------------------ setup
export function setupHolds(g) {
  const p = g.player;
  p.holds ||= {};
  const S = () => (p.holds ||= {});
  const state = (id) => (S()[id] ||= { fires: {}, gates: {}, cracks: {}, chests: {}, mid: false, done: false });
  // pooled ground lines for telegraphs, a shrinking-arena ring, holes in the boards (all made at load)
  g.holdLines = [];
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.22, 0.05), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); m.visible = false; m.renderOrder = 3; g.scene.add(m); g.holdLines.push(m); }
  const ringM = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.4, 0.1), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); ringM.visible = false; g.scene.add(ringM);
  const holeG = new THREE.CircleGeometry(1.2, 12).rotateX(-Math.PI / 2), holeM = new THREE.MeshBasicMaterial({ color: 0x050403 });
  const holes = []; for (let i = 0; i < 8; i++) { const h = new THREE.Mesh(holeG, holeM); h.visible = false; g.scene.add(h); holes.push({ m: h, t: 0, life: 0 }); }
  g.holdHole = (q) => { const h = holes.find((x) => !x.m.visible) || holes[0]; h.m.visible = true; h.m.position.set(q.x, 0.04, q.z); h.t = 0; h.life = 9; };
  g.holdWalk = (q) => { const I = g.interior?.I; if (!I?.hold) return true; const [c, r] = I.tileOf(q.x, q.z); return I.walkable(c, r); };
  g.rivalAI = (g2, e, dt, dist) => g.__rivals?.zubayrAI(g2, e, dt, dist);

  // captains engage: a short card, then the fight
  g.holdEngage = (e) => {
    e.engaged = true; const K = e.holdBoss;
    for (const m of g.interior?.enemies || []) if (!m.dead && m.pos.distanceTo(e.pos) < 18) m.alerted = true;
    g.audio.setMusicIntensity?.(1);
    if (K.rival) { g.director?.play(rivalLast(g, e)); return; }
    g.director?.play(introScene(g, e, K));
  };
  const introScene = (g2, e, K) => {
    const boss = { rig: e.rig, pos: e.pos, get facing() { return e.facing; }, set facing(v) { e.facing = v; }, st: e.st };
    const head = () => e.rig.userData.parts.head.getWorldPosition(new THREE.Vector3());
    return { actors: [boss], shots: [
      { dur: 3.8, card: { ar: '', en: t(K.name), sub: t(K.sub) }, stinger: 'boss', cam: { follow: true, p0: () => V(e.pos.x + Math.sin(e.facing) * 4.2 + Math.cos(e.facing) * 1.6, e.pos.y + 1.0, e.pos.z + Math.cos(e.facing) * 4.2 - Math.sin(e.facing) * 1.6), t0: () => head().add(V(0, 0.2, 0)), p1: () => V(e.pos.x + Math.sin(e.facing) * 3.2 + Math.cos(e.facing) * 0.9, e.pos.y + 0.8, e.pos.z + Math.cos(e.facing) * 3.2 - Math.sin(e.facing) * 0.9), t1: () => head(), fov: 34 },
        enter: () => { e.facing = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z); e.st.action = 'command'; e.st.actionT = 0; }, run: (d, k) => { e.st.actionT = Math.min(1, k * 1.4); } },
    ], tick: (d, dt) => { e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g2.anim(e.rig, e.st, dt); }, end: () => { e.st.action = null; } };
  };
  const rivalLast = (g2, e) => {
    const lines = [['Zubayr', 'All this way, for one arrow?'], ['Salim', 'For my brother.']];
    return g2.__rivals.meetScene(g2, e, lines, { ar: 'زبير', en: 'Zubayr', sub: t('The last of the men from the dune') });
  };

  // the label on each hold's door (hamrin.js): what is left to do there
  g.holds = {
    label: (id) => { const s = state(id), H = HOLDS[id]; return s.done ? `${t('Enter')} ${t(H.title)} (${t('cleared')})` : `${t('Enter')} ${t(H.title)}`; },
    enter: (id) => enter(id),
    state,
  };
  async function enter(id) {
    if (g.interior) return;
    const H = HOLDS[id], s = state(id);
    g.ui.fade(1); g.paused = true; await new Promise((r) => setTimeout(r, 600));
    g.returnPos = p.pos.clone();
    const I = buildHold(g.scene, id);
    const level = Math.max(22, Math.min(30, p.level + 1)) + H.step;
    g.interior = { def: { kind: 'hold', id, title: H.title, level }, I, enemies: [], hold: true };
    for (const tch of I.torches) g.lightPool?.add({ pos: tch.light, color: tch.fire ? 0xff9a40 : 0xffa860, power: tch.fire ? 22 : 14, dist: tch.fire ? 12 : 9, interior: true });
    for (const e of g.enemies) if (!e.dead) e.rig.visible = false;
    // what has already been opened stays open
    for (const G of I.gates) if (s.gates[G.c + ',' + G.r]) openGate(I, G, true);
    for (const C of I.cracks) if (s.cracks[C.c + ',' + C.r]) breakCrack(I, C, true);
    for (const T of I.chests) if (s.chests[T.kind]) { T.opened = true; T.mesh.children[1].rotation.x = -1.1; }
    for (const F of I.fires) if (s.fires[F.idx]) F.lit = true;
    populate(I, level, s);
    // interactables: the way out, the fires, the gates (from the far side), the cracked walls, the chests
    g.interactables.push({ pos: I.entrance, r: 2.6, label: 'Climb back out of the hold', act: () => exit(), interior: true });
    for (const F of I.fires) g.interactables.push({ pos: F.pos, r: 2.4, interior: true, get label() { return F.lit ? 'Rest at the campfire' : 'Light the campfire'; }, act: () => rest(I, F) });
    for (const G of I.gates) g.interactables.push({ pos: G.far, r: 2.4, interior: true, get hidden() { return G.open; }, label: 'Lift the bar from the gate', act: () => { openGate(I, G); state(id).gates[G.c + ',' + G.r] = true; saveGame(g); g.ui.toast(t('A shortcut back to the entrance')); } });
    for (const G of I.gates) g.interactables.push({ pos: G.near, r: 2.0, interior: true, get hidden() { return G.open; }, label: 'Barred from the other side', act: () => { g.audio.denied?.(); } });
    for (const C of I.cracks) g.interactables.push({ pos: V(C.x, 0, C.z), r: 3.0, interior: true, get hidden() { return C.open; }, label: 'Break through the cracked wall', act: () => { breakCrack(I, C); state(id).cracks[C.c + ',' + C.r] = true; saveGame(g); } });
    for (const T of I.chests) g.interactables.push({ pos: T.pos, r: 2.2, interior: true, get hidden() { return T.opened; }, label: 'Open the chest', act: () => openChest(I, T, level) });
    // the trail: the captain halfway, the fire beyond him, the master, his chest, then the way out
    I.objective = () => {
      const st = state(id), mid = g.interior.enemies.find((e) => e.holdKey === 'mid' && !e.dead), boss = g.interior.enemies.find((e) => e.holdKey === 'boss' && !e.dead), T = I.chests.find((c) => c.kind === 'T');
      if (mid) return [mid.pos, `${t('Defeat')} ${t(mid.name)}`];
      const nextFire = I.fires.find((f) => !f.lit && f.pos.z < (I.midAt?.z ?? 0)); if (nextFire && boss) return [nextFire.pos, 'Light the campfire ahead'];
      if (boss) return [boss.pos, `${t('Defeat')} ${t(boss.name)}`];
      if (T && !T.opened) return [T.pos, 'Open the master\'s chest'];
      return [I.entrance, 'Climb back out of the hold'];
    };
    p.pos.copy(s.lastFire != null && I.fires[s.lastFire] ? I.fires[s.lastFire].pos.clone().add(V(0, 0, 2)) : I.start); p.target = null; p.moveTo = null; p.vel?.set(0, 0, 0);
    g.camInit = false; g.camAction = true; g.lighting?.set('gorge', 0);
    for (const o of g.world.staticRoots || []) { o.userData.wasVis = o.visible; o.visible = !!o.userData.sky; }
    g.world.cullPaused = true;
    g.ui.setMapRegion?.('interior', I);
    await g.warmCompile?.();
    g.paused = false; g.ui.fade(0); g.ui.banner(t(H.title), t(H.sub), 2800); g.audio.stinger?.('ambush');
    unlock(g, H.codex);
  }
  function populate(I, level, s, menOnly = false) {
    const H = HOLDS[I.hold];
    for (const e of g.interior.enemies) if (!menOnly || !e.holdBoss) { g.scene.remove(e.rig); e.removed = true; }
    g.enemies = g.enemies.filter((e) => !e.removed); g.interior.enemies = g.interior.enemies.filter((e) => !e.removed);
    for (const sp of I.spawns) {
      const ranged = sp.kind === 'a', pool = ranged ? H.ranged : H.pool, n = ranged ? 1 + (Math.random() < 0.5 ? 1 : 0) : 2 + Math.floor(Math.random() * 2);
      const pack = g.spawnPack(pool, sp.x, sp.z, n, level - 1, { spread: 2.2, interior: true });
      for (const e of pack) { e.interior = true; e.pos.y = 0; e.rig.visible = true; } g.interior.enemies.push(...pack);
    }
    for (const [key, atK] of [['mid', 'midAt'], ['boss', 'bossAt']]) {
      if (menOnly || (key === 'mid' ? s.mid : s.done)) continue;
      const bid = H[key], K = BOSS[bid], type = K.type === 'zubayr' ? 'zubayr' : 'hb_' + bid;
      const e = g.spawnPack(type, I[atK].x, I[atK].z, 1, level + (key === 'boss' ? 2 : 1), { spread: 0, interior: true })[0];
      e.interior = true; e.holdBoss = K; e.holdKey = key; e.name = K.name; e.elite = true; e.final = true;
      e.maxHp = e.hp = Math.round(e.maxHp * K.hp); e.dmg *= K.dmg; e.maxPoise = e.poise = e.maxPoise * 6; e.xp *= 12; e.speed *= 1.1;
      if (K.block) { e.shield = true; e.blockK = K.block; }
      if (K.rival) { e.volleyN = 5; e.T = { ...e.T, hold: [7, 13] }; }
      e.T = { ...e.T, ai: holdBossAI }; e.moves = [...K.moves]; e.cds = {}; e.facing = Math.PI; e.alerted = true; e.engaged = false;
      g.interior.enemies.push(e);
    }
  }
  function openGate(I, G, quiet) {
    G.open = true; const i = colliders.indexOf(G.col); if (i >= 0) colliders.splice(i, 1);
    G.leaf.position.y = 3.1; buildGrid(); buildNav(INTERIOR_X, 290);
    if (!quiet) { g.audio.clang?.(); g.fx.dust(V(G.x, 0, G.z), 10, 1); haptic(16); }
  }
  function breakCrack(I, C, quiet) {
    C.open = true; const i = colliders.indexOf(C.col); if (i >= 0) colliders.splice(i, 1);
    C.mesh.visible = false; buildGrid(); buildNav(INTERIOR_X, 290);
    if (!quiet) { g.audio.boom?.(); g.shake = 0.5; for (let k = 0; k < 4; k++) g.fx.dust(V(C.x + rand(-1, 1), 0.5, C.z + rand(-1, 1)), 16, 1.6); g.ui.toast(t('A hidden chamber')); }
  }
  function openChest(I, T, level) {
    const s = state(I.hold);
    if (T.kind === 'T' && g.interior.enemies.some((e) => !e.dead && e.holdKey === 'boss')) { g.ui.toast(t('The master of the hold still stands')); g.audio.denied?.(); return; }
    T.opened = true; T.mesh.children[1].rotation.x = -1.1; s.chests[T.kind] = true; g.audio.legendary();
    const at2 = T.pos.clone().add(V(0, 0.6, 1)), n = T.kind === 'T' ? 4 : 2;
    for (let i = 0; i < n; i++) g.dropItem(makeItem(level + 1, i < (T.kind === 'T' ? 2 : 1) ? 'legendary' : 'rare'), at2);
    g.dropItem({ gold: Math.round((T.kind === 'T' ? 140 : 70) * level), rarity: 'common' }, at2);
    const gem = ['ruby', 'lapis', 'carnelian'][Math.floor(Math.random() * 3)] + (T.kind === 'T' ? 3 : 2); (p.gems ||= {})[gem] = (p.gems[gem] || 0) + 1; g.ui.toast(t('A cut gem') + ' · ' + gem);
    p.renown = (p.renown || 0) + (T.kind === 'T' ? 40 : 15); saveGame(g);
  }
  // resting: heal, refill, his men back at their posts, and this fire is where Salim wakes
  function rest(I, F) {
    const s = state(I.hold), first = !F.lit;
    F.lit = true; s.fires[F.idx] = true; s.lastFire = F.idx;
    p.hp = p.stats.maxHp; p.mp = p.stats.maxMp; p.potions = Math.max(p.potions, 5 + (p.potCap || 0) + (p.stats.potCapB || 0));
    if (g.companion?.down) g.__companion?.getUp(1); else if (g.companion) g.companion.hp = g.companion.maxHp;
    g.fx.burst(tmp.copy(F.pos).setY(1), 30, { speed: 2, life: 1.2, size: 0.2, size1: 0.02, color: new THREE.Color(3, 1.6, 0.5), up: 3, drag: 1 });
    g.audio.potion?.(); saveGame(g);
    if (first) g.ui.toast(t('Campfire lit. You will wake here if you fall.'));
    // the panel: rest done; travel to another lit fire, or leave
    document.getElementById('shop')?.remove(); g.closePanels?.();
    const w = document.createElement('div'); w.id = 'shop'; w.className = 'panel';
    const lit = I.fires.filter((x) => x.lit && x !== F);
    w.innerHTML = `<div class="ptitle">${t('Campfire')} <span class="close" role="button" aria-label="Close">✕</span></div><div class="sbody"><div class="slabel">${t('You rest. Wounds bound, sherbet filled. His men are back at their posts.')}</div>
      <div class="slist">${lit.map((x) => `<div class="srow"><div class="bico">🔥</div><div class="sinfo"><span>${t('Campfire')} ${x.idx + 1}</span></div><button class="sbtn" data-f="${x.idx}">${t('Travel')}</button></div>`).join('')}
      <div class="srow"><div class="bico">⇱</div><div class="sinfo"><span>${t('Leave the hold')}</span></div><button class="sbtn" data-out="1">${t('Leave')}</button></div></div></div>`;
    g.ui.root.appendChild(w);
    w.querySelector('.close').onclick = () => w.remove();
    w.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { w.remove(); const T2 = I.fires[+b.dataset.f]; s.lastFire = T2.idx; g.ui.fade(1); setTimeout(() => { p.pos.copy(T2.pos).add(V(0, 0, 2)); g.camInit = false; g.ui.fade(0); }, 450); });
    w.querySelector('[data-out]').onclick = () => { w.remove(); exit(); };
    // and his men come back to their posts (the captains already beaten stay beaten)
    populate(I, g.interior.def.level, s, true);
    for (const e of g.interior.enemies) if (e.holdBoss && !e.dead) { e.hp = e.maxHp; e.engaged = false; e.p2 = false; e.moves = [...e.holdBoss.moves]; e.pos.copy(e.holdKey === 'mid' ? I.midAt : I.bossAt); e.ghost = false; e.rig.visible = true; }
  }
  async function exit() {
    if (!g.interior?.hold) return;
    g.ui.fade(1); g.paused = true; await new Promise((r) => setTimeout(r, 600));
    const I = g.interior.I;
    for (const e of g.enemies) if (e.interior) { g.scene.remove(e.rig); e.removed = true; }
    g.enemies = g.enemies.filter((e) => !e.removed);
    for (const d of [...g.drops]) if (d.to.x > 148) { g.scene.remove(d.mesh); g.ui.removeLootLabel(d); g.drops.splice(g.drops.indexOf(d), 1); }
    g.interactables = g.interactables.filter((x) => !x.interior);
    g.lightPool?.remove((e) => e.interior);
    destroyHold(g.scene, I); buildGrid(); setInteriorFloor(null); buildNav(INTERIOR_X, 290);
    g.interior = null; g.camAction = false; g.lockOn = null; g.holdArena = null; ringM.visible = false;
    g.ui.bossBar(null); g.audio.setMusicIntensity?.(0);
    p.pos.copy(g.returnPos); p.pos.y = 0; p.target = null; p.moveTo = null;
    const { heightAt } = await import('./terrain.js'); p.pos.y = heightAt(p.pos.x, p.pos.z);
    g.camInit = false; g.lighting?.forAct(g.act, 0);
    for (const o of g.world.staticRoots || []) o.visible = o.userData.wasVis ?? true;
    g.world.cullPaused = false; g.world.cull(p.pos);
    g.ui.setMapRegion?.('world');
    g.paused = false; g.ui.fade(0); saveGame(g);
  }
  g.holds.exit = exit;

  // the captains fall: the hold remembers; the master's fall clears the hold
  const prevKill = g.onKill;
  g.onKill = (e) => {
    prevKill?.(e);
    if (!e.holdBoss || !g.interior?.hold) return;
    const id = g.interior.I.hold, s = state(id), H = HOLDS[id];
    e.barOn = false; g.ui.bossBar(null); g.holdArena = null; ringM.visible = false; g.audio.setMusicIntensity?.(0);
    for (const m of g.interior.enemies) if (m.summoned && !m.dead) { m.hp = 0; g.killEnemy(m, e.pos); }
    p.renown = (p.renown || 0) + (e.holdKey === 'boss' ? 30 : 15);
    if (e.holdKey === 'mid') { s.mid = true; g.ui.banner(t(e.name) + ' ' + t('falls'), t('The way on is open. A fire waits ahead.'), 3200); }
    else {
      s.done = true; g.completeQuest?.(H.quest, true);
      if (e.holdBoss.rival) {
        p.rival = { ...(p.rival || {}), final: 'fallen' };
        g.director?.play(SCENES.lieutenantFalls(g, e, { who: 'Zubayr', text: 'It was only ever the pay.', card: { ar: 'زبير', en: 'Zubayr', sub: t('Jabir\'s account is kept') } }));
      } else g.ui.banner(t(H.title), t('The hold is broken. Its master\'s chest is yours.'), 3800);
      if (Object.keys(HOLDS).every((k) => state(k).done)) setTimeout(() => g.ui.banner(t('The Hamrin Hills'), t('Every hold is broken'), 4200), 4500);
    }
    saveGame(g);
  };
  // falling inside a hold: Salim wakes at the last fire he lit (or at the entrance)
  const prevRespawn = g.respawn.bind(g);
  g.respawn = async () => {
    if (!g.interior?.hold) return prevRespawn();
    const I = g.interior.I, s = state(I.hold); g.ui.death(false);
    p.dead = false; p.st.dead = false; p.rig.children[0].rotation.x = 0; p.rig.children[0].position.y = 0;
    p.hp = p.stats.maxHp; p.mp = p.stats.maxMp; p.invuln = 2; p.target = null; p.moveTo = null; p.gold = Math.floor(p.gold * 0.95);
    const F = s.lastFire != null ? I.fires[s.lastFire] : null;
    p.pos.copy(F ? F.pos.clone().add(V(0, 0, 2)) : I.start);
    g.holdArena = null; ringM.visible = false; g.ui.bossBar(null);
    for (const e of g.interior.enemies) if (e.holdBoss && !e.dead) { e.hp = e.maxHp; e.engaged = false; e.p2 = false; e.mv = null; e.curMove = null; e.st.action = null; e.moves = [...e.holdBoss.moves]; e.cds = {}; e.pos.copy(e.holdKey === 'mid' ? I.midAt : I.bossAt); e.ghost = false; e.rig.visible = true; }
    for (const e of g.interior.enemies) if (e.summoned && !e.dead) { g.scene.remove(e.rig); e.removed = true; e.dead = true; }
    for (const e of g.interior.enemies) if (!e.dead && !e.holdBoss) { e.alerted = false; e.hp = e.maxHp; e.pos.copy(e.home); }
    g.camInit = false;
  };
  // per frame: the board holes, the shrinking arena, the telegraph lines
  const prevTick = g.tickExtra;
  g.tickExtra = (dt) => {
    prevTick?.(dt);
    const IH = g.interior?.I; if (IH?.hold) for (const m of IH.mist) if (Math.random() < 0.06 && Math.abs(m.x - p.pos.x) < 30 && Math.abs(m.z - p.pos.z) < 30) g.fx.smoke.spawn({ pos: { x: m.x + rand(-1.5, 1.5), y: m.y, z: m.z + rand(-1.5, 1.5) }, vel: { x: 0.2, y: 0.9, z: 0.1 }, life: 7, size: 2.5, size1: 6, color: new THREE.Color(0.75, 0.74, 0.72), alpha: 0.14, drag: 0.1, fadeIn: 0.5 });
    for (const h of holes) if (h.m.visible) { h.t += dt; if (h.t > h.life) h.m.visible = false; else if (!p.dead && Math.hypot(p.pos.x - h.m.position.x, p.pos.z - h.m.position.z) < 1.2) { p.st.hitT = Math.max(p.st.hitT, 0.2); g.hazSlowK = 0.45; if ((h.tick = (h.tick || 0) - dt) <= 0) { h.tick = 0.5; g.damagePlayer(4 + p.level, h.m.position); } } }
    const A = g.holdArena;
    if (A) {
      A.t += dt; A.r = Math.max(A.to, 13 - A.t * 0.35);
      ringM.visible = true; ringM.position.set(A.c.x, 0.1, A.c.z); ringM.scale.setScalar(A.r);
      if (!p.dead && p.pos.distanceTo(A.c) > A.r) { if ((A.tick = (A.tick || 0) - dt) <= 0) { A.tick = 0.5; g.damagePlayer(8 + p.level * 1.5, A.c); g.ui.damageNumber(p.pos, t('Keep to the middle'), 'block'); } }
    }
  };
  // the telegraph lines tick with the game's hazards
  const prevHaz = g.updateHazards.bind(g);
  g.updateHazards = (dt) => {
    for (let i = g.hazards.length - 1; i >= 0; i--) {
      const h = g.hazards[i]; if (h.kind !== 'holdline') continue;
      h.t += dt; const k = h.t / h.life; h.mesh.material.opacity = 0.18 + k * 0.5;
      if (k >= 1) { h.mesh.visible = false; g.hazards.splice(i, 1); h.onDone?.(); }
    }
    prevHaz(dt);
  };
  // ---------------- lock-on (the close camera): a button above the skills on touch, Tab or F on the keyboard
  const reticle = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.95, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.5, 0.2), transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }));
  reticle.visible = false; reticle.renderOrder = 2; g.scene.add(reticle);
  const lockBtn = document.createElement('div'); lockBtn.id = 'lockbtn'; lockBtn.className = 'hide'; lockBtn.title = 'Lock on (Tab)'; lockBtn.innerHTML = '<span>◎</span>';
  document.getElementById('ui').appendChild(lockBtn);
  const lock = () => {
    if (!g.camAction) return;
    if (g.lockOn) { g.lockOn = null; p.target = null; return; }
    const f = V(Math.sin(g.camYaw ?? p.facing), 0, Math.cos(g.camYaw ?? p.facing));
    let best = null, bs = 1e9;
    for (const e of g.enemies) { if (e.dead || e.ghost || e.hidden || !e.rig.visible) continue; const d = tmp.subVectors(e.pos, p.pos).setY(0), l = d.length(); if (l > 24) continue; const a = 1 - d.normalize().dot(f); const sc = l + a * 14 - (e.holdBoss ? 6 : 0); if (sc < bs) { bs = sc; best = e; } }
    g.lockOn = best; if (best) { p.target = best; haptic(10); } else g.ui.toast(t('Nothing to lock on to'));
  };
  lockBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (g.started && !g.paused) lock(); });
  addEventListener('keydown', (e) => { if ((e.key === 'Tab' || e.key.toLowerCase() === 'f') && g.started && !g.paused && g.camAction && !g.ui.dialogOpen) { e.preventDefault(); lock(); } });
  const prevTick2 = g.tickExtra;
  g.tickExtra = (dt) => {
    prevTick2?.(dt);
    lockBtn.classList.toggle('hide', !g.camAction || !g.started || p.dead);
    lockBtn.classList.toggle('on', !!g.lockOn);
    const L = g.lockOn;
    if (L && (L.dead || L.ghost)) { // the next nearest foe takes his place, if one is close
      g.lockOn = null; p.target = null;
      const n = g.enemies.filter((e) => !e.dead && !e.ghost && e.alerted && e.pos.distanceTo(p.pos) < 16).sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos))[0];
      if (n) { g.lockOn = n; p.target = n; }
    }
    if (g.lockOn) { reticle.visible = true; reticle.position.set(g.lockOn.pos.x, (g.lockOn.pos.y || 0) + 0.06, g.lockOn.pos.z); reticle.scale.setScalar(g.lockOn.radius * 1.6 + 0.3); reticle.rotation.y += dt * 1.5; if (!p.target) p.target = g.lockOn; }
    else reticle.visible = false;
  };
  Object.assign(CODEX, {
    holds: { t: 'Holds in the Hills', cat: 'War', x: 'A band of deserters needed three things: water, a way out and a place that could be held by a few men. Old quarries, frontier forts and gorges crossed by a single plank way gave all three, which is why the same places were held again and again by whoever came through.' },
  });
}
