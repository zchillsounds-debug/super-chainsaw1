import * as THREE from 'three';
import { humanoid, ifrit } from './characters.js';

// Enemy archetypes.
export const TYPES = {
  bandit: {
    name: 'Desert Raider', hp: 24, dmg: 5, speed: 4.3, range: 1.9, atk: 1.1, xp: 14, radius: 0.5, action: 'attack',
    build: () => humanoid({ robe: '#3a2f26', robe2: '#6a2a1a', turban: 0x2a2420, mask: 0x1e1a16, skin: 0x8a5a3a, weapon: 'scimitar', sash: 0x5a1a10 }),
  },
  spearman: {
    name: 'Raider Lancer', hp: 34, dmg: 7, speed: 3.8, range: 2.7, atk: 1.4, xp: 18, radius: 0.5, action: 'thrust',
    build: () => humanoid({ robe: '#4a3a2a', robe2: '#2a3a5a', turban: 0x6a3020, skin: 0x7a4a30, weapon: 'spear', offhand: 'shield', helmet: true, mail: true }),
  },
  archer: {
    name: 'Raider Bowman', hp: 20, dmg: 5, speed: 4.0, range: 15, atk: 1.8, xp: 15, radius: 0.5, action: 'shoot', ranged: 'arrow',
    build: () => humanoid({ robe: '#5a4a32', robe2: '#3a2a1a', turban: 0xc8b890, mask: 0x8a7a5a, skin: 0x9a6a44, weapon: 'bow' }),
  },
  ghoul: {
    name: 'Ghul', hp: 30, dmg: 6, speed: 5.0, range: 1.7, atk: 0.9, xp: 16, radius: 0.5, action: 'claw',
    build: () => humanoid({ robe: '#4a4234', robe2: '#2a261c', turban: null, skin: 0x9aa48a, weapon: null, hunch: 0.7, claws: true, longArms: 1.35, eyes: new THREE.Color(5, 4, 0.5), scale: 1.05 }),
  },
  imp: {
    name: 'Ember Imp', hp: 34, dmg: 8, speed: 5.4, range: 1.6, atk: 0.9, xp: 10, radius: 0.45, action: 'claw',
    build: () => humanoid({ robe: '#2a0a04', robe2: '#ff5010', turban: null, skin: 0x3a1006, weapon: null, hunch: 0.5, claws: true, eyes: new THREE.Color(6, 2, 0.2), scale: 0.8 }),
  },
  ifrit: {
    name: 'Ifrit, the Unbound', hp: 1300, dmg: 14, speed: 2.6, range: 5.5, atk: 2.4, xp: 600, radius: 1.8, boss: true,
    build: () => { const r = ifrit(); r.children[0].scale.setScalar(0.8); return r; },
  },
};

const ELITE_NAMES = ['the Cutthroat', 'the Jackal', 'Sand-Viper', 'the Ravenous', 'Bloodhand', 'the Hollow'];

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
  if (opts.elite) {
    rig.children[0].scale.multiplyScalar(1.3);
    e.name = opts.name || `${T.name} ${ELITE_NAMES[Math.floor(Math.random() * ELITE_NAMES.length)]}`;
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
