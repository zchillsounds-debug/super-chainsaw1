import * as THREE from 'three';
import { registerHolds } from './holds.js';
import { REGION, STORY } from './region.js';
import { SITES, heightAt } from './terrain.js';
import { colliders } from './buildings.js';
import { buildGrid } from './collision.js';
import { freeSpot } from './sidequests.js';
import { rmats } from './regionprops.js';
import { mudBrick } from './textures.js';
import { triplanarMaterial } from './triplanar.js';
import { CODEX } from './narrative.js';
import { t } from './i18n.js';

// Round 22: the story holds. Each region's two lieutenants no longer wait in the open: each holds a dungeon built
// by hand like the Hamrin holds (holds.js does the building, the captains' moves, the fires, the close camera),
// and is its master. A captain of his holds the way halfway. The door stands at the old site (the caravanserai,
// the kiln yard, the reed camp...). The second hold is barred until the first lieutenant has talked.
//   Sawad:  the Broken Dam (Durayd, then Farud) · the Kiln Galleries (Mazin, then Hisham, with his hooked chain)
//   Marsh:  the Reed Stockade (Farqad, then Marwan) · the Sunken Village (Shibl, then Sahl)
//   Karkh:  the Burned Quarter (Hajib, then 'Asim) · the Warehouse Vaults (Ghiyath, then Layth, in his smoke)
//   Docks:  the Shipyard (Hawtha, then Bilal) · the Hulks (Murra, then Mus'ab)
// Everything inside meets Salim at his own level. Map legend: see holds.js.
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const MAPS = {
  dam: [
    '##############################',
    '#########...........##########',
    '########..p.......p..#########',
    '########......B......#########',
    '########..p.......p..#########',
    '#########.....T.....##########',
    '############.....#############',
    '############..C..#############',
    '############.....#############',
    '~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~',
    '#####a........=........a######',
    '#####..%%...........%%..######',
    '#####.m....w.....w....m.x..S##',
    '#####...................###..#',
    '######.......m.......##g###..#',
    '########...........####.######',
    '#########...p.p...#####.######',
    '#########....M....#.......####',
    '#########...p.p...#.......####',
    '##########.......##...m...####',
    '###########.....###.......####',
    '~~~~~~~~~~~~~=~~~~~...a...####',
    '~~~~~~~~~~~~~=~~~~~.......####',
    '######.....a....###.......####',
    '######.........%%##.......####',
    '#######..m....%%%#####...#####',
    '########.......%%#####...#####',
    '#########......h.#####...#####',
    '#########..h...........#######',
    '##########.......C...#########',
    '###########.........##########',
    '############..E..#############',
    '##############################',
  ],
  kilns: [
    '#################################',
    '##########............###########',
    '#########..h........h..##########',
    '#########.....v..v.....##########',
    '#########.......B......##########',
    '#########..h........h..##########',
    '##########.....T......###########',
    '#############......##############',
    '##############.C..###############',
    '##############....###############',
    '#########~~~~~=~~~~~~############',
    '#########~~~~~=~~~~~~############',
    '######a.......v.......a##########',
    '######..h..........h...x...S#####',
    '######.....m....m.....###....####',
    '#######.....v....v...#####...####',
    '########..............###########',
    '#########....p..p....############',
    '#########.....M......g.......####',
    '#########....p..p....#...m...####',
    '##########...........#.......####',
    '###########...v.....##...a...####',
    '############.......###.......####',
    '#############.....####.......####',
    '##########~~~=~~~~~~~#####...####',
    '##########~~~=~~~~~~~#####...####',
    '#######......=.a.....#####...####',
    '#######..m.......v...#####...####',
    '########...h........######...####',
    '#########......m............#####',
    '##########.............h...######',
    '###########......C.....##########',
    '############...........##########',
    '##############..E..##############',
    '#################################',
  ],
  stockade: [
    '##############################',
    '##########..........##########',
    '#########..p......p..#########',
    '#########.....B......#########',
    '#########..p......p..#########',
    '##########....T.....##########',
    '############......############',
    '~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~...C...~~~~~~~~~~~~',
    '~~~~~~~~~~~.......~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~',
    '#######a......=.......a#######',
    '#######..%%..........w.x...S##',
    '#######.m.....w..%%...####...#',
    '########...........m.######..#',
    '#########.....%%%...##########',
    '##########..p...p..###########',
    '##########....M....g.......###',
    '##########..p...p..#...m...###',
    '###########.......##.......###',
    '~~~~~~~~~~~~~~=~~~~~~~~~~=~~~~',
    '~~~~~~~~~~~~~~=~~~~~~~~~~=~~~~',
    '~~~~~~~~~~~...=...~~~~~~.=.~~~',
    '~~~~~~~~~~~.a...m.~~~~~~.a.~~~',
    '~~~~~~~~~~~~~~=~~~~~~~~~~=~~~~',
    '~~~~~~~~~~~~~~=~~~~~~~~~~=~~~~',
    '########......=..........=.###',
    '########.%%..m.....h.......###',
    '#########.........%%.....#####',
    '##########......C......#######',
    '###########...........########',
    '#############..E..############',
    '##############################',
  ],
  sunken: [
    '################################',
    '###########...........##########',
    '##########..h.......h..#########',
    '##########.%%...B..%%..#########',
    '##########..p.......p..#########',
    '###########....T......##########',
    '#############......#############',
    '#############%%C%%##############',
    '#############%%%%%##############',
    '~~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~~',
    '#######a.%%%...=...%%%.a########',
    '#######..%%%.......%%%..x...S###',
    '#######.m...w.%%%.w..m.###...###',
    '########......%%%.....####...###',
    '#########...........############',
    '##########%%.p..p.%%############',
    '##########%%..M...%%g.......####',
    '##########%%.p..p.%%#..%%m..####',
    '###########........##..%%...####',
    '############......###...a...####',
    '~~~~~~~~~~~~~~=~~~~~~##.....####',
    '~~~~~~~~~~~~~~=~~~~~~###...#####',
    '########...%%.=.a....###...#####',
    '########..%%%%.......###...#####',
    '#########.m%%%...h.%%%.....#####',
    '##########..%%.m....%%...#######',
    '###########.........%%..########',
    '############....C.......########',
    '#############.........##########',
    '##############..E..#############',
    '################################',
  ],
  quarter: [
    '##############################',
    '#########............#########',
    '########..p........p..########',
    '########.....v..v.....########',
    '########.......B......########',
    '########..p........p..########',
    '#########.....T......#########',
    '############......############',
    '############..C...############',
    '############......############',
    '#############.k..#############',
    '##########....w....###########',
    '######a......k........a#######',
    '######..h...........h...x..S##',
    '######.m....w....w...m.###..##',
    '#######......v.v......###...##',
    '########.............#########',
    '#########...p...p...##########',
    '#########.....M.....g......###',
    '#########...p...p...#..m...###',
    '##########..........#......###',
    '###########...k....##..a...###',
    '############......###......###',
    '#############.k..####......###',
    '##########.......#####....####',
    '#######a....h......###....####',
    '#######..m.....v...###....####',
    '########.....w.....###....####',
    '#########........m........####',
    '##########...h.........#######',
    '###########.....C......#######',
    '############..........########',
    '#############...E...##########',
    '##############################',
  ],
  vaults: [
    '################################',
    '##########............##########',
    '#########..h........h..#########',
    '#########......B.......#########',
    '#########..h........h..#########',
    '##########.....T......##########',
    '#############.....##############',
    '#############..C..##############',
    '#############.....##############',
    '######a.....w.....w....a########',
    '######..h............h..x....S##',
    '######.m....h.....h...m.###....#',
    '#######..........a.....###....##',
    '#########.....w..w....##########',
    '###########....h....############',
    '##########...p...p...###########',
    '##########.....M.....g........##',
    '##########...p...p...#...m....##',
    '###########.........##........##',
    '############.......###..a..h..##',
    '#############.....####........##',
    '############......#####......###',
    '#########a....h......##......###',
    '#########..m......m..##......###',
    '##########....w...h..##......###',
    '###########.............h...####',
    '############..m......#....######',
    '#############....C...###########',
    '##############.......###########',
    '###############.E..#############',
    '################################',
  ],
  shipyard: [
    '################################',
    '#########..............#########',
    '#########..p....B...p..#########',
    '#########..............#########',
    '#########..h........h..#########',
    '##########.....T......##########',
    '#############.....##############',
    '#############..C..##############',
    '#############.....##############',
    '~~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~~',
    '#######a.......=........a#######',
    '#######..h..k.....k..h...x...S##',
    '#######.m...........m...###...##',
    '########....w....w......###...##',
    '#########..............#########',
    '##########...p...p....##########',
    '##########.....M......g.......##',
    '##########...p...p....#...m...##',
    '###########..........##.......##',
    '############...k....###...a...##',
    '#############.....####........##',
    '~~~~~~~~~~~~~=~~~~~~~~####...###',
    '~~~~~~~~~~~~~=~~~~~~~~####...###',
    '#######..a...=......h.####...###',
    '#######.....k.....w..........###',
    '########.m.......h.....#########',
    '#########.....m.......##########',
    '##########..h.........##########',
    '###########.....C.....##########',
    '############.........###########',
    '#############..E..##############',
    '################################',
  ],
  hulks: [
    '################################',
    '~~~~~~~~~#############~~~~~~~~~~',
    '~~~~~~~~##............##~~~~~~~~',
    '~~~~~~~##..p...B....p..##~~~~~~~',
    '~~~~~~~##..............##~~~~~~~',
    '~~~~~~~~##..h..T...h..##~~~~~~~~',
    '~~~~~~~~~####.....####~~~~~~~~~~',
    '~~~~~~~~~~~~#..C..#~~~~~~~~~~~~~',
    '~~~~~~~~~~~~##...##~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~~',
    '~~~~~~####a....=.....a####~~~~~~',
    '~~~~~##..h.........h....x..S#~~~',
    '~~~~~##.m....w...w....m.#...#~~~',
    '~~~~~~##..............#######~~~',
    '~~~~~~~####.......####~~~~~~~~~~',
    '~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~=~~~~~~~~~~~~~~~~~',
    '~~~~~~~####.......####~~~~~~~~~~',
    '~~~~~~##...p....p....##~~~~~~~~~',
    '~~~~~~##......M......g====####~~',
    '~~~~~~##...p....p....#..m...##~~',
    '~~~~~~~####.......####...a..#~~~',
    '~~~~~~~~~~~~~~=~~~~~~##.....##~~',
    '~~~~~~~~~~~~~~=~~~~~~~##...##~~~',
    '~~~~~~~~~~~~~~=~~~~~~~~##=##~~~~',
    '~~~~~~####a...=....h####~=~~~~~~',
    '~~~~~##...........m......=~~~~~~',
    '~~~~~##..m...h.............#~~~~',
    '~~~~~~##.....C.......#######~~~~',
    '~~~~~~~##...........##~~~~~~~~~~',
    '~~~~~~~~####..E..####~~~~~~~~~~~',
    '~~~~~~~~~~~#######~~~~~~~~~~~~~~',
    '################################',
  ],};

// ------------------------------------------------------------------ the captains: the man halfway, and the lieutenant
const BOSS = {
  // the Sawad
  durayd: { name: 'Durayd', sub: 'Keeper of the sluices', type: 'engineer', look: { scale: 1.35, crest: 'hat', sash: 0x5a4a1a }, hp: 5, dmg: 1.2,
    moves: ['swing', 'crack', 'slam'], p2: { at: 0.5, line: 'Bring the old wall down on him!', add: ['rockfall'] } },
  farud: { name: 'Farud', sub: 'Ghassan\'s man at the caravanserai', type: 'spearman', look: { scale: 1.35 }, hp: 8, dmg: 1.25,
    moves: ['swing', 'charge', 'sweep'], p2: { at: 0.5, line: 'To me! Hold him!', add: ['summon'], summon: ['bandit', 'bandit', 'archer'] } },
  mazin: { name: 'Mazin', sub: 'The stoker of the kilns', type: 'naffat', look: { scale: 1.35, sash: 0x7a2a10 }, hp: 6, dmg: 1.25,
    moves: ['swing', 'firepots'], p2: { at: 0.5, line: 'Feed the fires!', add: ['fireline', 'summon'], summon: ['deserter', 'deserter'] } },
  hisham: { name: 'Hisham', sub: 'The kiln-master who sold the Pages', type: 'spearman', look: { scale: 1.35 }, hp: 9, dmg: 1.3, own: 'hookAI',
    moves: ['slam', 'firepots'], p2: { at: 0.5, line: 'Into the fire with you!', add: ['fireline'] } },
  // the marshes
  farqad: { name: 'Farqad', sub: 'Warden of the causeways', type: 'netter', look: { scale: 1.35, sash: 0x2a4a2a }, hp: 7, dmg: 1.25,
    moves: ['swing', 'net', 'charge'], p2: { at: 0.5, line: 'Out of the reeds, all of you!', add: ['summon'], summon: ['reedman', 'reedman', 'slinger'] } },
  marwan: { name: 'Marwan', sub: 'Rawh\'s man in the reed camp', type: 'netter', look: { scale: 1.38 }, hp: 10, dmg: 1.3,
    moves: ['net', 'swing', 'charge'], p2: { at: 0.5, line: 'The reeds, now!', add: ['summon', 'arrows'], summon: ['reedman', 'reedman', 'netter'] } },
  shibl: { name: 'Shibl', sub: 'The boatmen\'s headman', type: 'spearman', look: { scale: 1.4, crest: 'hat', hat: 0xb8a468, helm: false }, hp: 7, dmg: 1.3,
    moves: ['swing', 'sweep', 'arrows'], p2: { at: 0.5, line: 'Sink him in the mud!', add: ['stomp'] } },
  sahl: { name: 'Sahl', sub: 'Keeper of Rawh\'s boats', type: 'spearman', look: { scale: 1.4 }, hp: 11, dmg: 1.3,
    moves: ['swing', 'sweep', 'arrows'], p2: { at: 0.5, line: 'You will drown here.', add: ['stomp', 'summon'], summon: ['slinger', 'netter'] } },
  // al-Karkh
  hajib: { name: 'Hajib', sub: 'Captain of the burned lanes', type: 'guard', look: { scale: 1.45, offhand: 'shield', crest: 'heavy' }, hp: 8, dmg: 1.3, block: 0.85,
    moves: ['swing', 'slam', 'charge'], p2: { at: 0.5, line: 'Let the roofs fall!', add: ['fireline'] } },
  asim: { name: '\'Asim', sub: '\'Utba\'s man in the burned suq', type: 'guard', look: { scale: 1.45, offhand: 'shield' }, hp: 12, dmg: 1.35, block: 0.85,
    moves: ['swing', 'slam', 'charge'], p2: { at: 0.5, line: 'Guards! Burn the lane!', add: ['summon', 'fireline'], summon: ['guard', 'guard'] } },
  ghiyath: { name: 'Ghiyath', sub: 'Keeper of the store-rooms', type: 'guard', look: { scale: 1.4, crest: 'mantle', cloak: 0x3a2a1a }, hp: 8, dmg: 1.3,
    moves: ['swing', 'arrows', 'charge'], p2: { at: 0.5, line: 'Bolts! Put him down!', add: ['summon'], summon: ['crossbow', 'crossbow'] } },
  layth: { name: 'Layth', sub: 'He guards the Pages for \'Utba', type: 'naffat', look: { scale: 1.3 }, hp: 12, dmg: 1.35, own: 'smokeAI',
    moves: ['swing', 'firepots'], p2: { at: 0.5, line: 'Then let it all burn.', add: ['fireline'] } },
  // the river quays
  hawtha: { name: 'Hawtha', sub: 'Master of the slips', type: 'engineer', look: { scale: 1.42, belly: 0.4 }, hp: 9, dmg: 1.35,
    moves: ['swing', 'crack', 'rockfall'], p2: { at: 0.5, line: 'Drop the timbers on him!', add: ['sweep', 'summon'], summon: ['guard', 'crossbow'] } },
  bilal: { name: 'Bilal', sub: 'Ghanim\'s man on the river', type: 'guard', look: { scale: 1.45 }, hp: 13, dmg: 1.35,
    moves: ['swing', 'charge', 'arrows'], p2: { at: 0.5, line: 'Drop the loads on him!', add: ['rockfall'] } },
  murra: { name: 'Murra', sub: 'Keeper of the moorings', type: 'spearman', look: { scale: 1.4, crest: 'mantle', cloak: 0x1a2a3a }, hp: 9, dmg: 1.35,
    moves: ['swing', 'sweep', 'stomp'], p2: { at: 0.5, line: 'Cut the gangplanks!', add: ['net'] } },
  musab: { name: 'Mus\'ab', sub: 'He keeps the copyists\' boat', type: 'spearman', look: { scale: 1.45 }, hp: 13, dmg: 1.4,
    moves: ['swing', 'sweep', 'stomp'], p2: { at: 0.5, line: 'Over the side with him!', add: ['summon', 'net'], summon: ['guard', 'crossbow'] } },
};

// ------------------------------------------------------------------ the holds
const HOLDS = {
  dam: { region: 'sawad', site: 'serai', lieut: 'chief', quest: 'serai', title: 'The Broken Dam', sub: 'Old sluices behind the caravanserai', theme: 'masonry', light: 'golden',
    wall: 0xc8a882, rock: 0xa89070, floor: [0xa89478, 'flag'], water: 0x3a5650, waterY: -1.6, chasm: 'river',
    pool: ['bandit', 'bandit', 'spearman', 'deserter'], ranged: ['archer'], mid: 'durayd', boss: 'farud', codex: 'h_dam', step: 0 },
  kilns: { region: 'sawad', site: 'kiln', lieut: 'second', quest: 'graves', needs: 'serai', lockMsg: 'The galleries are barred. Find Farud first.', title: 'The Kiln Galleries', sub: 'Firing lanes under the kiln yard', theme: 'masonry', light: 'gorge', char: true,
    wall: 0xa8664a, rock: 0x7a5040, floor: [0x8a6450, 'earth'], waterY: -5, chasm: 'deep', braziers: 0.16,
    pool: ['deserter', 'deserter', 'spearman', 'naffat'], ranged: ['archer', 'naffat'], mid: 'mazin', boss: 'hisham', codex: 'h_kilns', step: 1 },
  stockade: { region: 'marsh', site: 'serai', lieut: 'chief', quest: 'reedcamp', title: 'The Reed Stockade', sub: 'An island fort in the reed beds', theme: 'reed', light: 'mist',
    rock: 0x4e4230, floor: [0x6a5a40, 'earth'], wet: 0.55, water: 0x3a4a3c, waterY: -0.4, sea: true,
    pool: ['bandit', 'netter', 'spearman', 'reedman'], ranged: ['slinger', 'archer'], mid: 'farqad', boss: 'marwan', codex: 'h_stockade', step: 0 },
  sunken: { region: 'marsh', site: 'kiln', lieut: 'second', quest: 'landing', needs: 'reedcamp', lockMsg: 'The way is barred. Find Marwan first.', title: 'The Sunken Village', sub: 'Drowned houses by the fish racks', theme: 'masonry', light: 'mist',
    wall: 0xa8906a, rock: 0x6a5a44, floor: [0x6a5a44, 'earth'], wet: 0.6, water: 0x34443a, waterY: -0.45, sea: true, wallH: [2.2, 3.8],
    pool: ['spearman', 'netter', 'bandit', 'reedman'], ranged: ['slinger', 'slinger'], mid: 'shibl', boss: 'sahl', codex: 'h_sunken', step: 1 },
  quarter: { region: 'karkh', site: 'serai', lieut: 'chief', quest: 'burnedsuq', title: 'The Burned Quarter', sub: 'Lanes still smouldering behind the suq', theme: 'masonry', light: 'haze', char: true,
    wall: 0x6e5c4e, rock: 0x4a4038, floor: [0x4e443a, 'flag'], wallH: [4.6, 7.4], braziers: 0.08,
    pool: ['guard', 'deserter', 'guard', 'naffat'], ranged: ['archer', 'crossbow'], mid: 'hajib', boss: 'asim', codex: 'h_quarter', step: 0 },
  vaults: { region: 'karkh', site: 'kiln', lieut: 'second', quest: 'warraqin', needs: 'burnedsuq', lockMsg: 'The vaults are barred. Find \'Asim first.', title: 'The Warehouse Vaults', sub: 'Store-rooms under the paper-sellers\' lane', theme: 'masonry', light: 'haze',
    wall: 0x9a8268, rock: 0x7a6a54, floor: [0x8a7a64, 'flag'], wallH: [4.6, 6.6],
    pool: ['guard', 'guard', 'deserter', 'naffat'], ranged: ['crossbow', 'crossbow', 'archer'], mid: 'ghiyath', boss: 'layth', codex: 'h_vaults', step: 1 },
  shipyard: { region: 'docks', site: 'serai', lieut: 'chief', quest: 'warehouses', title: 'The Shipyard', sub: 'Slips and sheds beside the warehouses', theme: 'timber', light: 'golden',
    rock: 0x6a5a48, floor: 'deck', water: 0x2e4446, waterY: -1.0, chasm: 'river',
    pool: ['guard', 'guard', 'deserter', 'engineer'], ranged: ['crossbow', 'archer'], mid: 'hawtha', boss: 'bilal', codex: 'h_shipyard', step: 0 },
  hulks: { region: 'docks', site: 'kiln', lieut: 'second', quest: 'boatyard', needs: 'warehouses', lockMsg: 'No boat will take you out yet. Find Bilal first.', title: 'The Hulks', sub: 'Burned barges moored in mid-river', theme: 'timber', light: 'dusk', low: true,
    rock: 0x5a4a3a, floor: 'deck', water: 0x2a4042, waterY: -0.9, sea: true,
    pool: ['guard', 'spearman', 'deserter', 'naffat'], ranged: ['crossbow', 'crossbow'], mid: 'murra', boss: 'musab', codex: 'h_hulks', step: 1 },
};
registerHolds(MAPS, BOSS, HOLDS);

// ------------------------------------------------------------------ the doors, at the old sites
function doorProp(theme, wallCol) {
  const g = new THREE.Group();
  const R = theme === 'reed' ? rmats() : null, mb = mudBrick([150, 132, 110]);
  const m = theme === 'reed' ? R.reedRib : theme === 'timber' ? new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.9 })
    : triplanarMaterial({ map: mb.map, normalMap: mb.normalMap, color: wallCol, scale: 0.5, roughness: 0.95, normalStrength: 1.2, grime: 0.7 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x060403 });
  const box = (w, h, d, x, y, z, mat = m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
  // a dark way in between two piers under a lintel, with a stretch of wall either side
  box(4.4, 3.8, 0.5, 0, 1.9, -0.9);
  box(2.2, 2.6, 0.6, -3.2, 1.3, -0.85); box(2.2, 2.6, 0.6, 3.2, 1.3, -0.85);
  box(0.8, 3.6, 0.8, -1.4, 1.8, -0.4); box(0.8, 3.6, 0.8, 1.4, 1.8, -0.4);
  box(3.8, 0.55, 1.0, 0, 3.75, -0.4);
  box(2.0, 3.0, 0.05, 0, 1.5, -0.62, dark);
  if (theme === 'reed') for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 4.2, 8), R.reedPale); b.position.set(s * 1.4, 2.1, -0.4); b.castShadow = true; g.add(b); }
  if (theme === 'timber') for (let k = 0; k < 6; k++) box(0.12, 3.6, 0.14, -1.2 + k * 0.48, 1.8, -0.62);
  return g;
}

export function setupStoryHolds(g) {
  const p = g.player;
  Object.assign(CODEX, {
    h_dam: { t: 'Dams and Sluices', cat: 'Craft', x: 'The Sasanian kings raised the rivers of the Sawad into its canals with weirs and dams of brick and stone. Each sluice had its keeper. When a dam was left to crack, the canals behind it silted up and the villages along them emptied.' },
    h_kilns: { t: 'The Brick-Makers', cat: 'Craft', x: 'Brick was made by gangs: diggers cut the clay, moulders pressed it into wooden frames, carriers stacked the dried bricks in the kiln, and the firemen kept it burning for days. A single firing could hold tens of thousands of bricks, and a kiln yard was a small town of its own, black with smoke.' },
    h_stockade: { t: 'Reed Islands', cat: 'Places', x: 'The marsh people built on platforms of reed and mud laid down layer on layer, and fenced their islands with reed. Such places were hard to reach for anyone without a boat and a guide, and the marshes sheltered rebels and runaways for centuries.' },
    h_sunken: { t: 'Drowned Villages', cat: 'Places', x: 'When the dykes failed, whole villages of the lower marsh went under. People came back by boat to their roofs and granary mounds, and some places were lived in half-drowned for a generation before the water was let out again, if it ever was.' },
    h_quarter: { t: 'The Burning of al-Karkh', cat: 'War', x: 'The histories of the siege of 812 to 813 tell of fighting from street to street in western Baghdad, of engines throwing stones and naft into the quarters, and of houses and markets burned or pulled down to open lines of fire. Al-Karkh, the great market suburb, suffered as badly as any.' },
    h_vaults: { t: 'Merchants\' Store-rooms', cat: 'Trade', x: 'Paper, ink, cloth and grain were kept in brick store-rooms behind the shops, often half below the ground to stay cool and dry, and barred from inside. A merchant\'s wealth lay as much in what he had stored as in what he sold that day.' },
    h_shipyard: { t: 'River Boats', cat: 'Craft', x: 'Boats for the Tigris were built of planks on frames, their seams stuffed with fibre and sealed with pitch or bitumen from the springs of the middle Euphrates. Yards along the bank built and mended them; timber came down the rivers from the north.' },
    h_hulks: { t: 'Burned Boats', cat: 'War', x: 'In the fighting for Baghdad the river itself was a battlefield. Boats were burned at their moorings and the bridges of boats were cut. The hulks were often left where they lay, and men hid and lived in them.' },
  });
  // the doors of this region's two holds, at the old sites, facing the hub
  g.storyDoor = {};
  for (const [id, H] of Object.entries(HOLDS)) {
    if (H.region !== REGION) continue;
    const S = SITES[H.site], Vc = SITES.village, dx = S.x - Vc.x, dz = S.z - Vc.z, l = Math.hypot(dx, dz) || 1;
    const [x, z] = freeSpot(S.x + dx / l * S.r * 0.45, S.z + dz / l * S.r * 0.45, 3.2), y = heightAt(x, z), face = Math.atan2(Vc.x - x, Vc.z - z);
    const d = doorProp(H.theme, H.wall || 0x9a8268); d.position.set(x, y, z); d.rotation.y = face; g.scene.add(d);
    const back = V(0, 0, -0.9).applyAxisAngle(V(0, 1, 0), face);
    colliders.push({ type: 'box', x: x + back.x, z: z + back.z, hw: 4.3, hd: 0.35, rot: face });
    const front = V(x, y, z).add(V(0, 0, 1.2).applyAxisAngle(V(0, 1, 0), face));
    g.lightPool?.add({ pos: front.clone().add(V(0, 1.6, 0)), color: 0xff8a40, power: 7, dist: 7, flicker: 1.2 });
    g.interactables.push({ pos: front, r: 3, area: id, get label() { return g.holds?.label(id) || 'Enter'; }, act: () => g.holds?.enter(id) });
    g.pois?.push({ x, z, icon: '◈', color: '#e0a050' });
    g.storyDoor[H.lieut] = front;
  }
  buildGrid();
}
