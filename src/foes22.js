import * as THREE from 'three';
import { humanoid } from './characters.js';
import { t } from './i18n.js';

// Round 22: three new kinds of (human) foe, and the leaders of packs.
//   hookman:   militia with a hooked pole. Besides his thrust, every few seconds at mid range he swings the hook out
//              along a marked line; caught, Salim is dragged in to him. Step off the line or evade through it.
//   pavise:    a brigand behind a tall shield. He turns aside almost every blow from the front and walks a bowman in
//              behind him; strike from the side or the back, or break his guard with a heavy blow or a skill.
//   slingboy:  a quick, light lad with a sling. He keeps his distance and runs when Salim closes on him.
//   leaders:   a pack of four or more has a leader. While he stands, his men hit harder; when he falls, they falter.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();

// difficulty (Settings → Controls): foes' life and damage, how generous the loot is, how fast Salim levels
export const DIFFICULTY = {
  story: { hp: 0.7, dmg: 0.6, loot: 0, xp: 1 },
  normal: { hp: 1, dmg: 1, loot: 0, xp: 1 },
  hard: { hp: 1.4, dmg: 1.35, loot: 0.06, xp: 1.25 },
};
const diffNow = () => { try { return DIFFICULTY[JSON.parse(localStorage.getItem('sob.settings.v1') || '{}').diff] || DIFFICULTY.normal; } catch { return DIFFICULTY.normal; } };
// the new foes join packs of the kinds they fight beside
const MIX = { spearman: ['hookman', 0.22], reedman: ['hookman', 0.2], guard: ['pavise', 0.18], bandit: ['pavise', 0.08], archer: ['slingboy', 0.22], slinger: ['slingboy', 0.3], deserter: ['hookman', 0.1] };
// game.spawnPack calls these: mixPack before it makes the men, shapePack after (so the first world gets them too)
export const mixPack = (type, n, opts) => (Array.isArray(type) && !opts.noMix && n >= 2 ? type.map((k) => (MIX[k] && Math.random() < MIX[k][1] ? MIX[k][0] : k)) : type);
let penG, penM, poleG, poleM;
export function shapePack(pack, opts) {
  const D = diffNow();
  for (const e of pack) { if (D.hp !== 1 && !e.boss) { e.maxHp = Math.round(e.maxHp * D.hp); e.hp = e.maxHp; } e.baseDmg = e.dmg; }
  if (pack.length >= 4 && !opts.elite && !opts.noLeader) { const L = pack.find((e) => !e.T.ranged && !e.T.static && !e.elite && e.type !== 'rider'); if (L) makeLeader(L); }
  // a shield-bearer walks a bowman of his pack in behind him
  const pv = pack.find((e) => e.type === 'pavise'), bw = pack.find((e) => e.T.ranged && !e.ward);
  if (pv && bw) pv.ward = bw;
}
function makeLeader(L) {
  L.leader = true; L.maxHp = L.hp = Math.round(L.maxHp * 1.8); L.dmg *= 1.15; L.baseDmg = L.dmg; L.xp *= 2.5; L.maxPoise = (L.maxPoise || 30) * 1.6; L.poise = L.maxPoise;
  L.baseName = L.name; L.name = `${L.name} · ${t('Leader')}`;
  // a red pennant on a short pole at his back (shared geometry and plain material: no new programs mid-fight)
  penG ||= new THREE.PlaneGeometry(0.42, 0.6).translate(0.21, 0, 0); penM ||= new THREE.MeshBasicMaterial({ color: 0x9a1a10, side: THREE.DoubleSide });
  poleG ||= new THREE.CylinderGeometry(0.018, 0.018, 1.5, 4); poleM ||= new THREE.MeshBasicMaterial({ color: 0x2a1c12 });
  const back = L.rig.userData.parts?.chest || L.rig;
  const pole = new THREE.Mesh(poleG, poleM); pole.position.set(-0.12, 0.55, -0.22); back.add(pole);
  const flag = new THREE.Mesh(penG, penM); flag.position.set(0, 0.5, 0); pole.add(flag); L.pennant = flag;
}

export const TYPES22 = {
  hookman: {
    name: 'Hookman', hp: 32, dmg: 6, speed: 4.0, range: 3.2, atk: 1.5, xp: 19, radius: 0.5, action: 'thrust',
    build: (x) => humanoid({ robe: '#5a4a36', robe2: '#3a2e22', turban: 0x6a5a40, skin: [0x8a5a3a, 0x7a4a2a][Math.floor(Math.random() * 2)], weapon: 'spear', sash: 0x4a3020, armour: 'leather', leather: 0x3a2818, beard: 0x2a1c12, beardLen: 0.5, ...x }),
  },
  pavise: {
    name: 'Shield-bearer', hp: 56, dmg: 6, speed: 3.1, range: 1.9, atk: 1.5, xp: 24, radius: 0.56, action: 'attack',
    build: (x) => humanoid({ robe: '#3a3226', robe2: '#5a2a1a', turban: null, helm: true, skin: 0x8a5a3a, weapon: 'sword', offhand: 'shield', armour: 'heavy', mail: true, sash: 0x5a2a1a, build: 1.15, ...x }),
  },
  slingboy: {
    name: 'Sling-lad', hp: 14, dmg: 4, speed: 6.0, range: 13, atk: 1.9, xp: 11, radius: 0.42, action: 'chop', ranged: 'stone', hold: [9, 13],
    build: (x) => humanoid({ robe: '#8a7a5a', robe2: '#4a3a2a', turban: 0xd8ccb0, skin: [0x9a6a44, 0x8a5a3a][Math.floor(Math.random() * 2)], weapon: 'sling', sash: 0x4a3a2a, build: 0.78, scale: 0.86, beard: null, ...x }),
  },
};

// ------------------------------------------------------------------ their own ways of fighting (T.ai: 'skip' = handled)
function hookAI(g, e, dt, dist) {
  const p = g.player, H = e.hookMv;
  e.hookCd = (e.hookCd ?? 2 + Math.random() * 2) - dt;
  if (!H) {
    if (!e.alerted || p.dead || g.cinematic || e.staggerT > 0 || e.st.action || e.hookCd > 0 || dist < 3.6 || dist > 8.5) return;
    const d = tmp.set(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z).normalize().clone();
    e.facing = Math.atan2(d.x, d.z); e.hookMv = { t: 0, dir: d, phase: 'wind' }; e.st.action = 'throwSide'; e.st.actionT = 0;
    g.aimLine?.(e, 0.05); return 'skip';
  }
  H.t += dt; e.st.actionT = Math.min(1, H.t / 0.9); e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist);
  if (H.phase === 'wind') { g.aimLine?.(e, Math.min(1, H.t / 0.7)); if (H.t > 0.7) { H.phase = 'throw'; g.aimLine?.(e, null); g.audio.at?.(e.pos, () => g.audio.whoosh?.()); } return 'skip'; }
  if (H.phase === 'throw') {
    // along the line he threw: caught unless Salim stepped off it or is evading
    const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, along = dx * H.dir.x + dz * H.dir.z, side = Math.abs(dx * H.dir.z - dz * H.dir.x);
    if (along > 0 && along < 9 && side < 1.1 && !(p.invuln > 0) && !p.dead) {
      H.phase = 'drag'; H.t = 0; g.ui.damageNumber(p.pos, 'Hooked', 'block'); g.damagePlayer(e.dmg * 0.6, e.pos, null);
      p.knock = (p.knock || V(0, 0, 0)).addScaledVector(H.dir, -Math.min(16, along * 2.2)); g.shake = Math.max(g.shake, 0.25);
    } else H.phase = 'done';
    e.hookCd = 6 + Math.random() * 3; return 'skip';
  }
  if (H.phase === 'drag' && H.t < 0.35) return 'skip';
  e.hookMv = null; e.st.action = null; return 'skip';
}
// the shield-bearer: slow, turned to face Salim, a heavy blow or a skill breaks his guard
function paviseAI(g, e, dt) {
  if (e.guardT > 0) { e.guardT -= dt; e.blockK = 0.2; } else e.blockK = 0.92;
  e.shield = true;
  // a bowman of his pack keeps behind him while he lives
  const B = e.ward && !e.ward.dead ? e.ward : null;
  if (B && e.alerted && !B.st.action) { const p = g.player.pos, d = tmp.set(e.pos.x - p.x, 0, e.pos.z - p.z).normalize(); const want = V(e.pos.x + d.x * 1.8, 0, e.pos.z + d.z * 1.8); if (B.pos.distanceTo(want) > 1.2) B.moveHint = want; else B.moveHint = null; }
}
function slingAI(g, e, dt, dist) {
  // too close: he runs for it, then turns and slings again
  if (e.fleeT > 0) {
    e.fleeT -= dt; const p = g.player.pos, d = tmp.set(e.pos.x - p.x, 0, e.pos.z - p.z).normalize(), wp = g.steer ? g.steer(e, V(e.pos.x + d.x * 6, e.pos.y, e.pos.z + d.z * 6)) : null;
    const m = wp ? tmp.set(wp.x - e.pos.x, 0, wp.z - e.pos.z).normalize() : d;
    e.pos.addScaledVector(m, e.speed * dt); e.facing = Math.atan2(m.x, m.z); e.st.walkBlend = 1; e.st.phase += dt * e.speed * 1.5; e.st.action = null;
    e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist); return 'skip';
  }
  if (e.alerted && dist < 4.5 && !e.st.action && (e.fleeCd = (e.fleeCd ?? 0) - dt) <= 0) { e.fleeT = 1.3; e.fleeCd = 3; }
}
export function setupFoes22(g) {
  TYPES22.hookman.ai = hookAI; TYPES22.pavise.ai = paviseAI; TYPES22.slingboy.ai = slingAI;
  // a heavy blow (weight above 0.8), a skill or a hit from the side breaks a shield-bearer's guard for a moment
  const dmg = g.damageEnemy.bind(g);
  g.damageEnemy = (e, d, crit, src, kind = 'normal', o = {}) => {
    if (e.type === 'pavise' && !e.dead && src) {
      const w = o.weight ?? g.kit?.weight ?? 0.5, f = tmp.copy(src).sub(e.pos).setY(0).normalize(), front = f.dot(V(Math.sin(e.facing), 0, Math.cos(e.facing)));
      if (w > 0.8 || o.skill || o.unblockable || front < 0.3) { if (!(e.guardT > 0)) { e.guardT = 2.2; e.staggerT = Math.max(e.staggerT || 0, 0.8); g.ui.damageNumber(e.pos, 'Guard broken', 'stagger'); g.audio.at?.(e.pos, () => g.audio.clang?.()); } }
    }
    return dmg(e, d, crit, src, kind, o);
  };
}
