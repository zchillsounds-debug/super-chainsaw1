import * as THREE from 'three';
import { humanoid } from './characters.js';

// Enemy archetypes.
// Raiders and deserters loose in the Sawad after the siege of 813. All human foes.
export const TYPES = {
  bandit: {
    name: 'Brigand', hp: 24, dmg: 5, speed: 4.3, range: 1.9, atk: 1.1, xp: 14, radius: 0.5, action: 'attack',
    build: () => { const R = [['#3a2f26', '#6a2a1a', 0x2a2420], ['#4a3020', '#8a6a2a', 0x5a1a10], ['#2a2a30', '#7a2a2a', 0x1a1a1a], ['#5a4a3a', '#2a3a2a', 0x8a7a5a]][Math.floor(Math.random() * 4)];
      return humanoid({ robe: R[0], robe2: R[1], turban: R[2], mask: 0x1e1a16, skin: [0x8a5a3a, 0x7a4a2a, 0x9a6a44][Math.floor(Math.random() * 3)], weapon: 'sword', sash: 0x5a1a10, offhand: Math.random() < 0.3 ? 'shield' : null }); },
  },
  spearman: {
    name: 'Deserter Lancer', hp: 34, dmg: 7, speed: 3.8, range: 2.7, atk: 1.4, xp: 18, radius: 0.5, action: 'thrust',
    build: () => humanoid({ robe: '#4a3a2a', robe2: '#2a3a5a', turban: null, helm: true, skin: 0x7a4a30, weapon: 'spear', offhand: 'shield', mail: true }),
  },
  archer: {
    name: 'Brigand Archer', hp: 20, dmg: 5, speed: 4.0, range: 15, atk: 1.8, xp: 15, radius: 0.5, action: 'shoot', ranged: 'arrow',
    build: () => humanoid({ robe: '#5a4a32', robe2: '#3a2a1a', turban: 0xc8b890, mask: 0x8a7a5a, skin: 0x9a6a44, weapon: 'bow' }),
  },
  deserter: {
    name: 'Knife-man', hp: 30, dmg: 6, speed: 5.0, range: 1.7, atk: 1.0, xp: 16, radius: 0.5, action: 'attack',
    build: () => humanoid({ robe: '#4a4234', robe2: '#2a261c', turban: 0x3a3228, mask: 0x2a241c, skin: [0x8a5a3a, 0x9a6a44][Math.floor(Math.random() * 2)], weapon: 'dagger', hunch: 0.25, sash: 0x3a2a1a }),
  },
  naffat: {
    name: 'Torch-bearer', hp: 30, dmg: 8, speed: 5.0, range: 1.8, atk: 1.0, xp: 12, radius: 0.48, action: 'attack', fiery: true,
    build: () => humanoid({ robe: '#3a2418', robe2: '#a04a18', turban: 0x2a1a10, mask: 0x1a120c, skin: 0x7a4a30, weapon: 'torch', sash: 0x7a2a10 }),
  },
  commander: {
    name: 'Ghassan', hp: 2200, dmg: 14, speed: 3.0, range: 3.2, atk: 2.4, xp: 600, radius: 1.1, boss: true,
    build: () => humanoid({ robe: '#141414', robe2: '#8a1a14', hem: true, qaba: true, mail: true, helm: true, turban: null, cloak: 0x5a0e0a, beard: 0x1a120c, beardLen: 0.8, skin: 0x8a5a3a, weapon: 'sword', offhand: 'shield', sash: 0x8a1a14, scale: 1.55, build: 1.15, belly: 0.4, hemY: 0.3, detail: 'hi' }),
  },
};

const ELITE_NAMES = ['Fadl', 'Khalid', 'Sinan', 'Hudhayl', 'Mukhariq', 'Sa\'d', 'Kulayb', 'Harith'];

export function makeEnemy(type, level, opts = {}) {
  const T = TYPES[type];
  const rig = T.build();
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
