import * as THREE from 'three';
import { humanoid } from './characters.js';
import { TYPES20 } from './foes20.js';

// Enemy archetypes.
// Raiders and deserters loose in the Sawad after the siege of 813. All human foes.
export const TYPES = {
  bandit: {
    name: 'Brigand', hp: 24, dmg: 5, speed: 4.3, range: 1.9, atk: 1.1, xp: 14, radius: 0.5, action: 'attack',
    build: (x) => { const R = [['#3a2f26', '#6a2a1a', 0x2a2420], ['#4a3020', '#8a6a2a', 0x5a1a10], ['#2a2a30', '#7a2a2a', 0x1a1a1a], ['#5a4a3a', '#2a3a2a', 0x8a7a5a]][Math.floor(Math.random() * 4)];
      return humanoid({ robe: R[0], robe2: R[1], turban: R[2], mask: 0x1e1a16, skin: [0x8a5a3a, 0x7a4a2a, 0x9a6a44][Math.floor(Math.random() * 3)], weapon: 'sword', sash: 0x5a1a10, offhand: Math.random() < 0.3 ? 'shield' : null, armour: Math.random() < 0.6 ? 'leather' : null, leather: 0x3a2414, ...x }); },
  },
  spearman: {
    name: 'Deserter Lancer', hp: 34, dmg: 7, speed: 3.8, range: 2.7, atk: 1.4, xp: 18, radius: 0.5, action: 'thrust',
    build: (x) => humanoid({ robe: '#4a3a2a', robe2: '#2a3a5a', turban: null, helm: true, skin: 0x7a4a30, weapon: 'spear', offhand: 'shield', mail: true, armour: 'lamellar', leather: 0x1c1a1c, robe: '#1e1c1e', ...x }),
  },
  archer: {
    name: 'Brigand Archer', hp: 20, dmg: 5, speed: 4.0, range: 15, atk: 1.8, xp: 15, radius: 0.5, action: 'shoot', ranged: 'arrow',
    build: (x) => humanoid({ robe: '#5a4a32', robe2: '#3a2a1a', turban: 0xc8b890, mask: 0x8a7a5a, skin: 0x9a6a44, weapon: 'bow', armour: 'leather', leather: 0x4a3020, ...x }),
  },
  deserter: {
    name: 'Knife-man', hp: 30, dmg: 6, speed: 5.0, range: 1.7, atk: 1.0, xp: 16, radius: 0.5, action: 'attack',
    build: (x) => humanoid({ robe: '#4a4234', robe2: '#2a261c', turban: 0x3a3228, mask: 0x2a241c, skin: [0x8a5a3a, 0x9a6a44][Math.floor(Math.random() * 2)], weapon: 'dagger', hunch: 0.25, sash: 0x3a2a1a, armour: 'leather', leather: 0x2a1c14, ...x }),
  },
  naffat: {
    name: 'Torch-bearer', hp: 30, dmg: 8, speed: 5.0, range: 1.8, atk: 1.0, xp: 12, radius: 0.48, action: 'attack', fiery: true,
    build: (x) => humanoid({ robe: '#3a2418', robe2: '#a04a18', turban: 0x2a1a10, mask: 0x1a120c, skin: 0x7a4a30, weapon: 'torch', sash: 0x7a2a10, ...x }),
  },
  // ---- Act IV: the marsh men Rawh hired (Round 15)
  slinger: {
    name: 'Slinger', hp: 22, dmg: 7, speed: 4.2, range: 15, atk: 2.2, xp: 16, radius: 0.48, action: 'chop', ranged: 'stone', hold: [8, 14],
    build: (x) => humanoid({ robe: '#6a5a40', robe2: '#3a4a3a', turban: 0xd8ccb0, skin: [0x8a5a3a, 0x7a4a2a][Math.floor(Math.random() * 2)], weapon: 'sling', sash: 0x3a4a3a, build: 0.9, hat: 0xb8a468, armour: 'reed', leather: 0x9a8a50, ...x }),
  },
  netter: {
    name: 'Net-thrower', hp: 30, dmg: 4, speed: 4.4, range: 9, atk: 3.6, xp: 18, radius: 0.5, action: 'throw', ranged: 'net', hold: [4.5, 9],
    build: (x) => humanoid({ robe: '#4a4a3a', robe2: '#6a5a3a', turban: 0x8a7a5a, beard: 0x2a1a10, skin: 0x7a4a2a, weapon: 'net', sash: 0x5a4a2a, build: 1.05, armour: 'reed', leather: 0x8a7a48, ...x }),
  },
  reedman: {
    name: 'Reed Ambusher', hp: 28, dmg: 7, speed: 5.2, range: 2.4, atk: 1.1, xp: 17, radius: 0.48, action: 'thrust',
    build: (x) => humanoid({ robe: '#4a5236', robe2: '#2a3020', turban: 0x5a5a3a, mask: 0x3a3a26, skin: 0x7a4a2a, weapon: 'spear', hunch: 0.2, sash: 0x2a3020, armour: 'reed', leather: 0x7a7444, ...x }),
  },
  // ---- Act V: the buyer's hired guards in al-Karkh
  guard: {
    name: 'Hired Guard', hp: 46, dmg: 8, speed: 3.7, range: 2.0, atk: 1.3, xp: 22, radius: 0.52, action: 'attack',
    build: (x) => humanoid({ robe: '#2a2a2a', robe2: '#5a4a2a', qaba: true, turban: null, helm: true, mail: true, skin: [0x8a5a3a, 0x9a6a44][Math.floor(Math.random() * 2)], weapon: 'sword', offhand: 'shield', sash: 0x5a4a2a, build: 1.1, armour: 'scale', ...x }),
  },
  commander: {
    name: 'Ghassan', hp: 2200, dmg: 14, speed: 3.0, range: 3.2, atk: 2.4, xp: 600, radius: 1.1, boss: true,
    build: (x) => humanoid({ robe: '#141414', robe2: '#8a1a14', hem: true, qaba: true, mail: true, helm: true, turban: null, cloak: 0x5a0e0a, beard: 0x1a120c, beardLen: 0.8, skin: 0x8a5a3a, weapon: 'sword', offhand: 'shield', sash: 0x8a1a14, scale: 1.55, build: 1.15, belly: 0.4, hemY: 0.3, detail: 'hi', armour: 'heavy', leather: 0x1a1414, crest: 'plume', ...x }),
  },
  // Rawh, Ghassan's paymaster: a merchant's coat over mail, quick with a blade and quicker with his purse
  rawh: {
    name: 'Rawh', hp: 2900, dmg: 15, speed: 3.6, range: 3.0, atk: 2.2, xp: 900, radius: 1.0, boss: true,
    build: (x) => humanoid({ robe: '#3a5a6a', robe2: '#c8a050', hem: true, qaba: true, mail: true, turban: 0xe8dcc0, beard: 0x2a1c12, beardLen: 0.6, skin: 0x9a6a44, weapon: 'sword', sash: 0xc8a050, scale: 1.4, build: 1.0, belly: 0.5, hemY: 0.3, detail: 'hi', ...x }),
  },
  // 'Utba, captain of the buyer's men: black-dressed, iron-capped, shield and sayf
  utba: {
    name: '\'Utba', hp: 3800, dmg: 18, speed: 3.2, range: 3.2, atk: 2.3, xp: 1400, radius: 1.1, boss: true,
    build: (x) => humanoid({ robe: '#141414', robe2: '#3a3a3a', hem: true, qaba: true, mail: true, helm: true, turban: null, cloak: 0x1a1a1a, beard: 0x141010, beardLen: 0.7, skin: 0x8a5a3a, weapon: 'sword', offhand: 'shield', sash: 0x5a4a2a, scale: 1.5, build: 1.2, belly: 0.2, hemY: 0.3, detail: 'hi', armour: 'heavy', leather: 0x141414, ...x }),
  },
};

const ELITE_NAMES = ['Fadl', 'Khalid', 'Sinan', 'Hudhayl', 'Mukhariq', 'Sa\'d', 'Kulayb', 'Harith'];

Object.assign(TYPES, TYPES20); // Round 20: crossbowmen, siege engineers and their mangonels, camel raiders

// Round 20: captains get a silhouette of their own: heavy armour, the full-detail sculpt and one crest chosen
// from the name (a plume, a mantle, a tall felt cap, a pennant on the back, or great shoulders and greaves)
const CRESTS = ['plume', 'mantle', 'hat', 'banner', 'heavy'];
export function captainLook(name = '') {
  let h = 7; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const NAMED = { Farud: 'mantle', Hisham: 'hat', Marwan: 'banner', Sahl: 'plume', '\'Asim': 'heavy', Layth: 'banner' };
  const crest = NAMED[name.split(' ·')[0]] || CRESTS[h % CRESTS.length], tint = [0x6a1a14, 0x1a3a5a, 0x5a4a1a, 0x2a4a2a, 0x4a1a3a][(h >>> 3) % 5];
  // the coat is lacquered in the captain's own colour, so each reads apart from his men even from overhead
  const L = { armour: 'heavy', crest, detail: 'hi', sash: tint, leather: new THREE.Color(tint).multiplyScalar(0.55).getHex() };
  if (crest === 'plume') L.helm = true;
  if (crest === 'mantle') L.cloak = tint;
  if (crest === 'hat') { L.helm = false; L.cap = 0x1e1a16; L.capBand = tint; }
  if (crest === 'banner') L.helm = true;
  return L;
}
export function makeEnemy(type, level, opts = {}) {
  const T = TYPES[type];
  const rig = T.build(opts.elite && !T.boss ? captainLook(opts.name || type) : {});
  const scale = 1 + (level - 1) * 0.04;
  const e = {
    type, T, rig, level, name: opts.name || T.name, elite: !!opts.elite, boss: !!T.boss,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), facing: 0,
    maxHp: Math.round(T.hp * (1 + (level - 1) * 0.35) * (opts.elite ? 4 : 1)),
    dmg: T.dmg * (1 + (level - 1) * 0.25) * (opts.elite ? 1.5 : 1), speed: T.speed, range: T.range, radius: T.radius * (opts.elite ? 1.3 : 1),
    atkCd: Math.random(), state: 'idle', alerted: false, dead: false, deadT: 0, home: new THREE.Vector3(), xp: T.xp * level * (opts.elite ? 5 : 1),
    st: { phase: Math.random() * 6, walkBlend: 0, action: null, actionT: 0, hitT: 0, dead: false, deadT: 0, fallDir: 1 },
    flash: 0, hidden: !!opts.hidden, riseT: opts.hidden ? 0 : 1, didHit: false, slow: 0, burn: 0,
  };
  e.hp = e.maxHp;
  e.maxPoise = e.poise = Math.round((18 + e.maxHp * 0.55) * (opts.elite ? 1.8 : 1));
  e.shield = !!rig.userData.parts?.shield; e.staggerT = 0;
  if (opts.elite) {
    rig.children[0].scale.multiplyScalar(1.3);
    e.name = opts.name || `${ELITE_NAMES[Math.floor(Math.random() * ELITE_NAMES.length)]} · ${T.name}`;
    const aura = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.0, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.0, 0.2), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    aura.position.y = 0.08; rig.add(aura); e.aura = aura;
  }
  const cache = new Map();
  rig.traverse((o) => {
    if (!(o.isMesh && o.material && o.material.emissive)) return;
    const src = o.material;
    if (!cache.has(src)) {
      const m = src.clone(); // Material.copy drops shader hooks, so carry them over
      m.onBeforeCompile = src.onBeforeCompile; m.customProgramCacheKey = src.customProgramCacheKey;
      cache.set(src, m);
    }
    o.material = cache.get(src);
  });
  e.mats = []; rig.traverse((o) => { if (o.isMesh && o.material?.emissive) e.mats.push(o.material); });
  e.baseEmissive = e.mats.map((m) => m.emissive.clone());
  return e;
}
