import * as THREE from 'three';
import { humanoid } from './characters.js';
import { TYPES20 } from './foes20.js';
import { LOOK, byzify } from './byz.js';

// Enemy archetypes.
// Round 23: Arsaber's company, a Byzantine embassy's picked men and hired turncoats loose in Iraq under cover of
// the civil war of 813. All human foes.
export const TYPES = {
  // Round 23: Arsaber's company. The type keys stay (the AI keys off them); names and looks are Byzantine.
  bandit: {
    name: 'Psilos', hp: 24, dmg: 5, speed: 4.3, range: 1.9, atk: 1.1, xp: 14, radius: 0.5, action: 'attack',
    build: (x) => humanoid(byzify({ ...LOOK.psilos(), ...x })),
  },
  spearman: {
    name: 'Menavlatos', hp: 34, dmg: 7, speed: 3.8, range: 2.7, atk: 1.4, xp: 18, radius: 0.5, action: 'thrust',
    build: (x) => humanoid(byzify({ ...LOOK.menavlatos(), ...x })),
  },
  archer: {
    name: 'Toxotes', hp: 20, dmg: 5, speed: 4.0, range: 15, atk: 1.8, xp: 15, radius: 0.5, action: 'shoot', ranged: 'arrow',
    build: (x) => humanoid(byzify({ ...LOOK.toxotes(), ...x })),
  },
  deserter: {
    name: 'Trapezites', hp: 30, dmg: 6, speed: 5.0, range: 1.7, atk: 1.0, xp: 16, radius: 0.5, action: 'attack',
    build: (x) => humanoid(byzify({ ...LOOK.trapezites(), ...x })),
  },
  naffat: {
    name: 'Siphon-bearer', hp: 30, dmg: 8, speed: 5.0, range: 1.8, atk: 1.0, xp: 12, radius: 0.48, action: 'attack', fiery: true,
    build: (x) => humanoid(byzify({ ...LOOK.siphon(), ...x })),
  },
  // ---- Act IV: the river-fleet men in the marshes
  slinger: {
    name: 'Slinger', hp: 22, dmg: 7, speed: 4.2, range: 15, atk: 2.2, xp: 16, radius: 0.48, action: 'chop', ranged: 'stone', hold: [8, 14],
    build: (x) => humanoid(byzify({ ...LOOK.slinger(), ...x })),
  },
  netter: {
    name: 'Marine', hp: 30, dmg: 4, speed: 4.4, range: 9, atk: 3.6, xp: 18, radius: 0.5, action: 'throw', ranged: 'net', hold: [4.5, 9],
    build: (x) => humanoid(byzify({ ...LOOK.marine(), ...x })),
  },
  reedman: {
    name: 'Trapezites', hp: 28, dmg: 7, speed: 5.2, range: 2.4, atk: 1.1, xp: 17, radius: 0.48, action: 'thrust',
    build: (x) => humanoid(byzify({ ...LOOK.reed(), ...x })),
  },
  // ---- the line infantry of the company
  guard: {
    name: 'Skoutatos', hp: 46, dmg: 8, speed: 3.7, range: 2.0, atk: 1.3, xp: 22, radius: 0.52, action: 'attack',
    build: (x) => humanoid(byzify({ ...LOOK.skoutatos(), ...x })),
  },
  // Bardanes, commander of the company in the Sawad: red-cloaked, plumed, heavy lamellar
  commander: {
    name: 'Bardanes', hp: 2200, dmg: 14, speed: 3.0, range: 3.2, atk: 2.4, xp: 600, radius: 1.1, boss: true,
    build: (x) => humanoid(byzify({ ...LOOK.officer('#8a1a14', 0x5a0e0a), beard: 0x1a120c, beardLen: 0.8, skin: 0xb07a52, sash: 0x8a1a14, scale: 1.55, build: 1.15, belly: 0.4, hemY: 0.3, leather: 0x3a3a3e, ...x })),
  },
  // Kallinikos, master of the siphons: a scorched leather coat over mail, a felt cap, the big siphon's bronze
  rawh: {
    name: 'Kallinikos', hp: 2900, dmg: 15, speed: 3.6, range: 3.0, atk: 2.2, xp: 900, radius: 1.0, boss: true,
    build: (x) => humanoid(byzify({ ...LOOK.officer('#8a4a1a', null), helm: null, pilos: true, crest: null, offhand: null, armour: 'scale', beard: 0x3a2a1a, beardLen: 0.6, skin: 0xc08a60, sash: 0xc8a050, scale: 1.4, build: 1.0, belly: 0.5, hemY: 0.3, leather: 0x4a3020, ...x })),
  },
  // Krateros, commander in al-Karkh: black lamellar, iron helmet, shield and spathion
  utba: {
    name: 'Krateros', hp: 3800, dmg: 18, speed: 3.2, range: 3.2, atk: 2.3, xp: 1400, radius: 1.1, boss: true,
    build: (x) => humanoid(byzify({ ...LOOK.officer('#3a3a3a', 0x1a1a1a), crest: null, beard: 0x141010, beardLen: 0.7, skin: 0xa06c46, sash: 0x5a4a2a, scale: 1.5, build: 1.2, belly: 0.2, hemY: 0.3, leather: 0x1e1e20, shieldTint: 1, ...x })),
  },
};

const ELITE_NAMES = ['Bryas', 'Kamytzes', 'Melias', 'Tzirithon', 'Sarantenos', 'Hexamilites', 'Choumnos', 'Mouzalon'];

// Round 20: the act VI boss at the bridge of boats. Round 23: Arsaber, the envoy himself: a court dignitary's
// purple-bordered cloak over gilded lamellar, a grey beard, the plumed helmet
TYPES.ghanim = {
  name: 'Arsaber', hp: 4600, dmg: 20, speed: 3.3, range: 3.2, atk: 2.2, xp: 1900, radius: 1.1, boss: true,
  build: (x) => humanoid(byzify({ ...LOOK.officer('#4a1a4a', 0x3a1440), beard: 0x8a8070, beardLen: 0.9, skin: 0xb07a52, sash: 0xc8a050, scale: 1.5, build: 1.15, belly: 0.3, hemY: 0.3, leather: 0x6a5a3a, shieldTint: 3, ...x })),
};
Object.assign(TYPES, TYPES20); // Round 20: crossbowmen, siege engineers and their mangonels, camel raiders

// Round 20: captains get a silhouette of their own: heavy armour, the full-detail sculpt and one crest chosen
// from the name (a plume, a mantle, a tall felt cap, a pennant on the back, or great shoulders and greaves)
const CRESTS = ['plume', 'mantle', 'hat', 'banner', 'heavy'];
export function captainLook(name = '') {
  let h = 7; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const NAMED = { Photeinos: 'mantle', Olbianos: 'hat', Katakylas: 'banner', Petronas: 'plume', Narses: 'heavy', Kalokyros: 'banner' };
  const crest = NAMED[name.split(' ·')[0]] || CRESTS[h % CRESTS.length], tint = [0x6a1a14, 0x1a3a5a, 0x5a4a1a, 0x2a4a2a, 0x4a1a3a][(h >>> 3) % 5];
  // the coat is lacquered in the captain's own colour, so each reads apart from his men even from overhead
  const L = { armour: 'heavy', crest, detail: 'hi', sash: tint, leather: new THREE.Color(tint).multiplyScalar(0.55).getHex() };
  if (crest === 'plume') L.helm = true;
  if (crest === 'mantle') L.cloak = tint;
  if (crest === 'hat') { L.helm = false; L.pilos = true; L.cloak = tint; } // Round 23: a felt pilos and a cloak in his colour
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
