import * as THREE from 'three';
import { heightAt } from './terrain.js';
import { resolve } from './collision.js';

// The four disciplines Salim can follow. Each has a look, a basic attack, a right-click skill, three numbered skills,
// a weapon weight (drives hit-stop, camera kick, knockback and stagger) and its own weapon bases for loot.
const tmp = new THREE.Vector3();
const C = (r, g, b) => new THREE.Color(r, g, b);

const svg = (body) => `<svg viewBox="0 0 64 64">${body}</svg>`;
export const SKILL_ICONS = {
  sword: svg('<path d="M14 52 L46 12 Q52 8 54 10 Q52 18 48 20 L18 56 Z" fill="#dfe6ee" stroke="#6a5530" stroke-width="2"/><path d="M10 46 L22 58" stroke="#d9a441" stroke-width="5" stroke-linecap="round"/>'),
  bow: svg('<path d="M18 6 Q52 32 18 58" fill="none" stroke="#c89a5a" stroke-width="5"/><path d="M18 6 L18 58" stroke="#e8dcc0" stroke-width="1.5"/><path d="M10 32 H54" stroke="#dfe6ee" stroke-width="3"/><path d="M54 32 l-8 -5 v10z" fill="#dfe6ee"/>'),
  daggers: svg('<path d="M10 54 L36 20 L40 24 L14 58Z" fill="#dfe6ee" stroke="#6a5530"/><path d="M54 54 L28 20 L24 24 L50 58Z" fill="#c8ced6" stroke="#6a5530"/><path d="M30 14 l4 -6 l4 6z" fill="#d9a441"/>'),
  dart: svg('<circle cx="22" cy="42" r="10" fill="#ff7a20"/><path d="M28 36 L56 8" stroke="#ffd080" stroke-width="5" stroke-linecap="round"/><circle cx="22" cy="42" r="5" fill="#ffe08a"/>'),
  bash: svg('<path d="M32 6 L54 14 Q54 42 32 58 Q10 42 10 14Z" fill="#7a5530" stroke="#d9a441" stroke-width="3"/><circle cx="32" cy="28" r="7" fill="#d9a441"/><path d="M4 30h8M52 30h8" stroke="#f0c070" stroke-width="3"/>'),
  whirl: svg('<g fill="none" stroke="#f0c070" stroke-width="4" stroke-linecap="round"><path d="M32 32 m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0 a16 16 0 1 1 -32 0 a20 20 0 1 1 40 0"/></g>'),
  dash: svg('<g stroke="#e8d0a0" stroke-width="4" stroke-linecap="round"><path d="M8 20h22M4 32h30M8 44h22"/></g><path d="M36 14 L58 32 L36 50 Z" fill="#f0c070"/>'),
  wall: svg('<path d="M32 6 L54 14 Q54 42 32 58 Q10 42 10 14Z" fill="#3a2a1a" stroke="#ffd870" stroke-width="3"/><path d="M20 22 H44 M20 32 H44 M20 42 H44" stroke="#ffd870" stroke-width="2.5"/>'),
  pierce: svg('<path d="M4 32 H60" stroke="#dfe6ee" stroke-width="3"/><path d="M60 32 l-10 -6 v12z" fill="#dfe6ee"/><circle cx="24" cy="32" r="7" fill="none" stroke="#e05040" stroke-width="3"/><circle cx="42" cy="32" r="7" fill="none" stroke="#e05040" stroke-width="3"/>'),
  volley: svg('<g stroke="#dfe6ee" stroke-width="3">' + [12, 24, 36, 48].map((x) => `<path d="M${x} 6 L${x + 6} 46"/><path d="M${x + 6} 46 l-4 -6 l6 1z" fill="#dfe6ee"/>`).join('') + '</g><path d="M6 56 H58" stroke="#c89a5a" stroke-width="3"/>'),
  tumble: svg('<path d="M12 44 A20 20 0 1 1 44 50" fill="none" stroke="#f0c070" stroke-width="5" stroke-linecap="round"/><path d="M44 50 l-10 2 l6 -9z" fill="#f0c070"/>'),
  caltrops: svg('<g fill="#9aa0a8" stroke="#3a3e44">' + [[18, 22], [44, 26], [28, 44], [48, 48]].map(([x, y]) => `<path d="M${x} ${y - 8} L${x + 3} ${y} L${x + 8} ${y + 4} L${x} ${y + 2} L${x - 7} ${y + 5} L${x - 3} ${y}Z"/>`).join('') + '</g>'),
  flask: svg('<path d="M26 10h12v8c8 4 12 10 12 18 0 10-8 18-18 18S14 46 14 36c0-8 4-14 12-18z" fill="#7a3d1e" stroke="#e8b060" stroke-width="2"/><path d="M32 22c6 8 10 12 6 20-3 6-12 6-14 0-2-6 4-8 8-20z" fill="#ff7a20"/>'),
  fireline: svg('<g fill="#ff7a20">' + [10, 24, 38, 52].map((x, i) => `<path d="M${x} 54 q-6 -10 0 -${16 + i * 4} q6 ${10 + i * 2} 0 ${16 + i * 4}z"/>`).join('') + '</g><path d="M4 56 H60" stroke="#ffe08a" stroke-width="2"/>'),
  smoke: svg('<g fill="#9a948a"><circle cx="24" cy="36" r="14"/><circle cx="40" cy="30" r="12"/><circle cx="34" cy="44" r="12"/></g><path d="M40 14 L56 6" stroke="#f0c070" stroke-width="4" stroke-linecap="round"/>'),
  inferno: svg('<circle cx="32" cy="32" r="22" fill="none" stroke="#ff7a20" stroke-width="6" stroke-dasharray="6 4"/><circle cx="32" cy="32" r="6" fill="#ffe08a"/>'),
  knives: svg('<g fill="#dfe6ee" stroke="#3a3e44">' + [-30, 0, 30].map((a) => `<path transform="rotate(${a} 32 52)" d="M30 52 L32 10 L34 52Z"/>`).join('') + '</g>'),
  flurry: svg('<g stroke="#f0d0a0" stroke-width="4" stroke-linecap="round"><path d="M10 50 L50 10"/><path d="M14 30 L36 8"/><path d="M30 54 L54 30"/></g>'),
  step: svg('<path d="M14 50 Q32 4 50 50" fill="none" stroke="#a090c0" stroke-width="4" stroke-dasharray="4 4"/><circle cx="50" cy="50" r="6" fill="#f0c070"/><circle cx="14" cy="50" r="6" fill="#5a5070"/>'),
  vanish: svg('<path d="M32 10 Q50 10 50 30 Q50 56 32 56 Q14 56 14 30 Q14 10 32 10Z" fill="#2a2430" stroke="#a090c0" stroke-width="3" stroke-dasharray="5 3"/><path d="M22 30 h6 M36 30 h6" stroke="#f0c070" stroke-width="3"/>'),
  potion: svg('<path d="M26 8h12v10c8 4 12 10 12 18 0 10-8 18-18 18S14 46 14 36c0-8 4-14 12-18z" fill="#3a0d14" stroke="#e8b060" stroke-width="2"/><path d="M17 36c4 3 26 3 30 0 0 9-6 15-15 15s-15-6-15-15z" fill="#d0203a"/>'),
  dodge: svg('<path d="M10 40 Q32 12 54 40" fill="none" stroke="#e8d0a0" stroke-width="5" stroke-linecap="round"/><path d="M54 40 l-2 -11 l-8 7z" fill="#e8d0a0"/><path d="M14 52 H50" stroke="#e8d0a0" stroke-width="2" stroke-dasharray="3 3"/>'),
};

// ------------------------------------------------------------------ skill helpers
const dirToCursor = (g) => { const p = g.player, gp = g.groundPoint(); const d = new THREE.Vector3(gp.x - p.pos.x, 0, gp.z - p.pos.z); if (d.lengthSq() < 0.01) d.set(Math.sin(p.facing), 0, Math.cos(p.facing)); return { dir: d.normalize(), point: gp }; };
const alive = (g, fn) => { for (const e of g.enemies) if (!e.dead && !e.hidden && !e.parked && !e.ghost) fn(e); };
function faceDir(p, d) { p.facing = Math.atan2(d.x, d.z); }
function blink(g, to) { const p = g.player; g.fx.dust(p.pos, 10, 1); p.pos.set(to.x, 0, to.z); resolve(p.pos, 0.45); p.pos.y = heightAt(p.pos.x, p.pos.z); g.fx.dust(p.pos, 10, 1); p.vel?.set(0, 0, 0); }

// ------------------------------------------------------------------ class definitions
export const CLASSES = {
  faris: {
    mobility: 0.3, // movement speed while an attack plays (1 = unhindered)
    name: 'Faris', ar: 'فارس', role: 'Mailed horseman fighting afoot: sword, shield and nerve',
    look: { robe: '#17171a', robe2: '#b8913e', hem: true, mail: true, qaba: true, turban: null, cap: 0x2a2620, capBand: 0x141210, weapon: 'sword', offhand: 'shield', beard: 0x2a1a10, cloak: 0x6e1c16, sash: 0x9a2a1c, scabbard: true, skin: 0xa8714a, build: 1.1, detail: 'hi' },
    base: { hp: 100, armor: 6, mp: 50 }, weight: 1.0, resource: 'Resolve',
    weapon: { name: 'Rusted Sayf', base: 'Sayf', min: 4, max: 9 },
    weapons: [{ name: 'Sayf', min: 4, max: 9 }, { name: 'Yamani Sayf', min: 6, max: 12 }, { name: 'Qala\'i Sayf', min: 8, max: 15 }, { name: 'Hindi Sayf', min: 11, max: 19 }],
    attack: { kind: 'melee', icon: 'sword', name: 'Sword', range: 1.6, dur: 0.62, arc: 0.2, reach: 2.4 },
    skills: {
      rmb: { id: 'bash', name: 'Shield Bash', icon: 'bash', cd: 3, mana: 8, aim: true, use(g, p) {
        const { dir } = dirToCursor(g); faceDir(p, dir); p.st.action = 'thrust'; p.st.actionT = 0; p.actionDur = 0.42; g.audio.whoosh();
        p.pendingHit = { at: 0.55, fn: () => { g.audio.clang(); let any = false;
          alive(g, (e) => { const v = tmp.copy(e.pos).sub(p.pos).setY(0), d = v.length(); if (d < 2.6 + e.radius && v.normalize().dot(dir) > 0.3) { any = true; const r = g.rollDamage(0.8); g.damageEnemy(e, r.d, r.crit, p.pos, 'normal', { stagger: 999, knock: 2.6, weight: 1.6, unblockable: true }); } });
          if (any) g.impulse(dir, 0.35); g.fx.dust(tmp.copy(p.pos).addScaledVector(dir, 1.4), 8, 0.8); } };
      } },
      s1: { id: 'whirl', name: 'Sandstorm Spin', icon: 'whirl', cd: 7, mana: 22, use(g, p) { p.whirlT = 2.0; p.whirlTick = 0; g.audio.whoosh(); p.whirlPull = !!p.flags?.whirlPull; } },
      s2: { id: 'charge', name: 'Charge', icon: 'dash', cd: 4, mana: 10, aim: true, use(g, p) {
        const { dir } = dirToCursor(g); p.dashDir = dir; p.dashT = 0.28; p.dashHit = new Set(); faceDir(p, dir); p.invuln = 0.3; p.dashDmg = 1.3; p.dashStagger = !!p.flags?.chargeStagger; g.audio.whoosh(); g.fx.dust(p.pos, 12, 1.2);
      } },
      s3: { id: 'wall', name: 'Shield Wall', icon: 'wall', cd: 16, mana: 25, buff: 'ward', use(g, p) {
        p.buffs.ward = 8; p.wardTick = 0; g.audio.clang(); g.fx.ring(p.pos, C(3, 2.2, 0.8), 0.5, 5, 0.7); g.fx.dust(p.pos, 18, 1.4);
      } },
    },
  },
  rami: {
    mobility: 0.92, // movement speed while an attack plays (1 = unhindered)
    name: 'Rami', ar: 'رامي', role: 'Horse-archer of the Khurasani regiments: range, movement, a steady draw',
    look: { robe: '#2e3424', robe2: '#a88a4a', qaba: true, hem: true, turban: null, cap: 0x5a4a32, capBand: 0x2a2018, weapon: 'bow', beard: 0x2a1a10, beardLen: 0.5, cloak: 0x4a4a30, sash: 0x8a6a2a, skin: 0xa8714a, build: 0.98, detail: 'hi' },
    base: { hp: 84, armor: 2, mp: 60 }, weight: 0.4, resource: 'Focus',
    weapon: { name: 'Worn Qaws', base: 'Qaws', min: 3, max: 8 },
    weapons: [{ name: 'Qaws', min: 3, max: 8 }, { name: 'Horn Qaws', min: 5, max: 11 }, { name: 'Khurasani Qaws', min: 7, max: 14 }, { name: 'Composite Qaws', min: 10, max: 18 }],
    attack: { kind: 'ranged', icon: 'bow', name: 'Arrow', range: 13, dur: 0.6, action: 'shoot', proj: { speed: 30, kind: 'arrow', mult: 1 } },
    skills: {
      rmb: { id: 'pierce', name: 'Piercing Shot', icon: 'pierce', cd: 1.5, mana: 10, aim: true, use(g, p) {
        const { dir } = dirToCursor(g); faceDir(p, dir); p.st.action = 'shoot'; p.st.actionT = 0.3; p.actionDur = 0.4;
        g.playerShot(dir, { speed: 42, mult: 2.2, pierce: 99, kind: 'arrow', glow: C(2.4, 2.0, 1.4), weight: 0.9 }); g.audio.whoosh();
      } },
      s1: { id: 'volley', name: 'Rain of Arrows', icon: 'volley', cd: 6, mana: 20, aim: true, use(g, p) {
        const { dir, point } = dirToCursor(g); faceDir(p, dir); p.st.action = 'shoot'; p.st.actionT = 0; p.actionDur = 0.5;
        const d = Math.min(14, Math.hypot(point.x - p.pos.x, point.z - p.pos.z)); const c = p.pos.clone().addScaledVector(dir, d); c.y = heightAt(c.x, c.z);
        for (let w = 0; w < (p.flags?.volleyWave ? 4 : 3); w++) g.telegraph(c, 3.6, 0.5 + w * 0.35, () => {
          for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28, r = Math.random() * 3.4; const q = tmp.set(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r); g.fx.dust(q, 1, 0.4); g.fx.burst(q.setY(heightAt(q.x, q.z) + 0.2), 2, { speed: 2, life: 0.3, size: 0.1, size1: 0.02, color: C(2, 1.8, 1.4), gravity: 8 }); }
          g.audio.hit(); alive(g, (e) => { if (e.pos.distanceTo(c) < 3.6 + e.radius) { const r = g.rollDamage(0.7); g.damageEnemy(e, r.d, r.crit, c, 'normal', { weight: 0.3 }); } });
        }, false, true);
      } },
      s2: { id: 'tumble', name: 'Tumble', icon: 'tumble', cd: 3, mana: 6, aim: true, use(g, p) {
        const { dir } = dirToCursor(g); p.dashDir = dir; p.dashT = 0.24; p.dashHit = new Set(); p.dashDmg = 0; p.invuln = 0.35; p.st.crouch = 0.8; p.nextCrit = true; g.audio.whoosh(); g.fx.dust(p.pos, 10, 1);
        if (p.flags?.tumbleArrows) for (let i = -1; i <= 1; i++) { const a = Math.atan2(-dir.x, -dir.z) + i * 0.25; g.playerShot(new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), { speed: 30, mult: 0.8, kind: 'arrow', weight: 0.4 }); }
      } },
      s3: { id: 'caltrops', name: 'Caltrops', icon: 'caltrops', cd: 10, mana: 15, aim: true, use(g, p) {
        const { point } = dirToCursor(g); const c = new THREE.Vector3(point.x, heightAt(point.x, point.z), point.z);
        if (c.distanceTo(p.pos) > 12) c.copy(p.pos).add(tmp.copy(c).sub(p.pos).setLength(12)).setY(heightAt(c.x, c.z));
        g.spawnZone({ kind: 'caltrops', pos: c, r: 3.4, life: 7, slow: 0.55, tickDmg: 0.18 }); g.audio.gold();
      } },
    },
  },
  naffat: {
    mobility: 0.8, // movement speed while an attack plays (1 = unhindered)
    name: 'Naffat', ar: 'نفّاط', role: 'Siege naft-thrower: clay grenades, burning oil and smoke',
    look: { robe: '#3a2a1e', robe2: '#c06a24', qaba: false, hem: true, turban: 0x6a4a2a, weapon: 'torch', beard: 0x1e140c, beardLen: 0.7, sash: 0xa04a18, mask: null, skin: 0x9a6440, build: 1.04, belly: 0.15, detail: 'hi' },
    base: { hp: 90, armor: 4, mp: 70 }, weight: 0.55, resource: 'Naft',
    weapon: { name: 'Cracked Siphon', base: 'Naft Siphon', min: 4, max: 8 },
    weapons: [{ name: 'Naft Siphon', min: 4, max: 8 }, { name: 'Bronze Siphon', min: 6, max: 11 }, { name: 'Siege Siphon', min: 8, max: 14 }, { name: 'Harraqa Siphon', min: 11, max: 18 }],
    attack: { kind: 'ranged', icon: 'dart', name: 'Naft Spurt', range: 9, dur: 0.5, action: 'throw', proj: { speed: 20, kind: 'fire', mult: 0.9, fire: true, burn: 1.5 } },
    skills: {
      rmb: { id: 'naft', name: 'Naft Flask', icon: 'flask', cd: 0.9, mana: 12, aim: true, use(g, p) {
        const gp = g.groundPoint(); const from = p.pos.clone(); from.y += 1.6;
        const dist = Math.min(14, Math.hypot(gp.x - p.pos.x, gp.z - p.pos.z)); const dir = tmp.set(gp.x - p.pos.x, 0, gp.z - p.pos.z).normalize();
        const target = p.pos.clone().addScaledVector(dir, dist); target.y = heightAt(target.x, target.z);
        faceDir(p, dir); p.st.action = 'throw'; p.st.actionT = 0; p.actionDur = 0.45; g.throwFlask(from, target); g.audio.whoosh();
      } },
      s1: { id: 'fireline', name: 'Line of Naft', icon: 'fireline', cd: 6, mana: 20, aim: true, use(g, p) {
        const { dir } = dirToCursor(g); faceDir(p, dir); p.st.action = 'throw'; p.st.actionT = 0; p.actionDur = 0.45; g.audio.whoosh();
        for (let i = 1; i <= 6; i++) setTimeout(() => { const q = p.pos.clone().addScaledVector(dir, i * 1.9); q.y = heightAt(q.x, q.z); g.spawnZone({ kind: 'fire', pos: q, r: 1.4, life: 4, tickDmg: 0.35, burn: 2 }); g.fx.flash(tmp.copy(q).setY(q.y + 1), 0xff7a30, 20, 0.3, 8); }, i * 60);
      } },
      s2: { id: 'smoke', name: 'Smoke Jar', icon: 'smoke', cd: 5, mana: 10, aim: true, use(g, p) {
        const { dir, point } = dirToCursor(g); const d = Math.min(8, Math.hypot(point.x - p.pos.x, point.z - p.pos.z) || 8);
        const from = p.pos.clone(); g.spawnZone({ kind: 'smoke', pos: from, r: 3.8, life: 5 });
        blink(g, from.clone().addScaledVector(dir, d)); faceDir(p, dir); p.invuln = 0.4; g.audio.boom();
      } },
      s3: { id: 'inferno', name: 'Naft Ring', icon: 'inferno', cd: 14, mana: 30, use(g, p) {
        g.audio.boom(); g.shake = 0.4; g.fx.flash(tmp.copy(p.pos).setY(p.pos.y + 1.5), 0xff7a30, 60, 0.6, 14);
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const q = new THREE.Vector3(p.pos.x + Math.cos(a) * 3.6, 0, p.pos.z + Math.sin(a) * 3.6); q.y = heightAt(q.x, q.z); g.spawnZone({ kind: 'fire', pos: q, r: 1.3, life: p.flags?.ringLong ? 8 : 5, tickDmg: 0.4, burn: 2.5 }); }
      } },
    },
  },
  ayyar: {
    mobility: 0.7, // movement speed while an attack plays (1 = unhindered)
    name: '\'Ayyar', ar: 'عيّار', role: 'Street fighter of the Baghdad quarters: knives, speed and the shadows',
    look: { robe: '#1e1c1e', robe2: '#5a2a2a', qaba: false, hem: true, turban: 0x2a2428, mask: 0x1a1618, weapon: 'dagger', sash: 0x6a1a1a, skin: 0x9a6a44, build: 0.95, hunch: 0.05, detail: 'hi' },
    base: { hp: 80, armor: 2, mp: 55 }, weight: 0.35, resource: 'Nerve',
    weapon: { name: 'Chipped Khanjar', base: 'Khanjar', min: 3, max: 7 },
    weapons: [{ name: 'Khanjar', min: 3, max: 7 }, { name: 'Curved Khanjar', min: 5, max: 10 }, { name: 'Damascene Khanjar', min: 7, max: 13 }, { name: 'Twin Khanjars', min: 10, max: 17 }],
    attack: { kind: 'melee', icon: 'daggers', name: 'Knives', range: 1.4, dur: 0.36, arc: 0.4, reach: 2.0, backstab: 2 },
    skills: {
      rmb: { id: 'knives', name: 'Fan of Knives', icon: 'knives', cd: 1.2, mana: 9, aim: true, use(g, p) {
        const { dir } = dirToCursor(g); faceDir(p, dir); p.st.action = 'throw'; p.st.actionT = 0.2; p.actionDur = 0.3;
        for (let i = -2; i <= 2; i++) { const a = Math.atan2(dir.x, dir.z) + i * 0.16; g.playerShot(new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), { speed: 26, mult: 0.7, kind: 'knife', life: 0.5, weight: 0.3 }); }
        g.audio.whoosh();
      } },
      s1: { id: 'flurry', name: 'Flurry', icon: 'flurry', cd: 5, mana: 15, use(g, p) {
        const e = g.pickTarget(6); if (!e) { g.ui.toast('No foe in reach'); return false; }
        const behind = e.pos.clone().add(tmp.set(-Math.sin(e.facing), 0, -Math.cos(e.facing)).multiplyScalar(e.radius + 0.7)); blink(g, behind);
        p.facing = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z); p.flurry = { e, n: p.flags?.flurryPlus ? 9 : 6, t: 0 };
      } },
      s2: { id: 'step', name: 'Shadowstep', icon: 'step', cd: 4, mana: 10, use(g, p) {
        const e = g.pickTarget(12); if (!e) { g.ui.toast('No foe in reach'); return false; }
        const behind = e.pos.clone().add(tmp.set(-Math.sin(e.facing), 0, -Math.cos(e.facing)).multiplyScalar(e.radius + 0.8)); blink(g, behind);
        p.facing = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z); p.target = e; p.nextCrit = true; p.invuln = 0.3; g.audio.whoosh();
      } },
      s3: { id: 'vanish', name: 'Vanish', icon: 'vanish', cd: 15, mana: 20, buff: 'stealth', use(g, p) {
        if (p.flags?.vanishHeal) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * 0.2); p.buffs.stealth = 5; g.fx.burst(tmp.copy(p.pos).setY(p.pos.y + 1), 30, { speed: 2, life: 1.4, size: 1, size1: 2.4, color: C(0.18, 0.16, 0.2), alpha: 0.6, smoke: true, up: 0.5, drag: 1.5 });
        alive(g, (e) => { if (!e.boss && e.pos.distanceTo(p.pos) < 25) { e.alerted = false; e.lost = 2.5; } }); g.audio.whoosh();
      } },
    },
  },
};
export const CLASS_ORDER = ['faris', 'rami', 'naffat', 'ayyar'];
export const COMMON = {
  potion: { id: 'potion', name: 'Sherbet', icon: 'potion', cd: 1.2, mana: 0 },
  dodge: { id: 'dodge', name: 'Evade', icon: 'dodge', cd: 0.9, mana: 0 },
};
export const SLOT_KEYS = { attack: 'LMB', rmb: 'RMB', s1: '1', s2: '2', s3: '3', s4: '4', potion: 'Q', dodge: '␣' };

// ------------------------------------------------------------------ Round 18: alternate skills (one opens at level 15, one at 20)
Object.assign(SKILL_ICONS, {
  // Round 22: the level-25 skills
  bash: svg('<path d="M22 12 H44 Q48 30 33 54 Q18 30 22 12Z" fill="#7a5a3a" stroke="#ffd870" stroke-width="2.5"/><path d="M6 32 H18 M8 24 H16 M8 40 H16" stroke="#f0c070" stroke-width="3" stroke-linecap="round"/>'),
  pierce: svg('<path d="M6 32 H58" stroke="#dfe6ee" stroke-width="4"/><path d="M58 32 l-10 -6 v12z" fill="#dfe6ee"/><circle cx="24" cy="32" r="7" fill="none" stroke="#e07050" stroke-width="3"/><circle cx="40" cy="32" r="7" fill="none" stroke="#e07050" stroke-width="3"/>'),
  firewall: svg('<path d="M6 52 H58" stroke="#5a3a20" stroke-width="4"/><path d="M12 50 Q8 36 16 26 Q16 38 22 34 Q20 22 28 14 Q30 30 36 26 Q34 36 42 30 Q44 40 50 34 Q54 44 52 50Z" fill="#ff8a30" stroke="#ffd870" stroke-width="2"/>'),
  shadowstep: svg('<circle cx="22" cy="20" r="6" fill="#3a3a48"/><path d="M14 54 L20 30 L30 36 L26 54" fill="#3a3a48"/><circle cx="44" cy="20" r="6" fill="#dfe6ee"/><path d="M36 54 L42 30 L52 36 L48 54" fill="#dfe6ee"/><path d="M26 26 Q34 14 40 24" fill="none" stroke="#9a7ad0" stroke-width="2.5" stroke-dasharray="3 3"/>'),
  rally: svg('<path d="M14 54 V10" stroke="#c89a5a" stroke-width="4"/><path d="M16 12 H50 L42 22 L50 32 H16Z" fill="#9a2a1c" stroke="#ffd870" stroke-width="2"/><path d="M24 44 l8 -8 l8 8" fill="none" stroke="#ffd870" stroke-width="3"/>'),
  sweep: svg('<path d="M8 40 Q32 4 56 40" fill="none" stroke="#dfe6ee" stroke-width="6" stroke-linecap="round"/><path d="M14 46 Q32 20 50 46" fill="none" stroke="#f0c070" stroke-width="2.5" stroke-dasharray="4 3"/>'),
  pin: svg('<path d="M4 20 L44 40" stroke="#dfe6ee" stroke-width="3"/><path d="M44 40 l-11 0 l5 -9z" fill="#dfe6ee"/><path d="M40 52 H60" stroke="#c89a5a" stroke-width="4"/><circle cx="46" cy="44" r="5" fill="none" stroke="#e05040" stroke-width="2.5"/>'),
  scatter: svg('<g stroke="#dfe6ee" stroke-width="3">' + [-36, -18, 0, 18, 36].map((a) => `<path transform="rotate(${a} 10 32)" d="M10 32 H58"/>`).join('') + '</g><circle cx="10" cy="32" r="5" fill="#c89a5a"/>'),
  mortar: svg('<path d="M10 52 Q30 -6 54 44" fill="none" stroke="#e8d0a0" stroke-width="2.5" stroke-dasharray="4 3"/><circle cx="54" cy="46" r="9" fill="#ff7a20"/><circle cx="54" cy="46" r="4" fill="#ffe08a"/><path d="M4 58 H22" stroke="#7a3d1e" stroke-width="6"/>'),
  brand: svg('<path d="M20 58 L30 22" stroke="#7a5530" stroke-width="6" stroke-linecap="round"/><path d="M32 22 q-10 -8 0 -18 q10 10 2 18z" fill="#ff7a20" stroke="#ffe08a" stroke-width="2"/><path d="M38 40 l14 -6 M38 48 l16 0" stroke="#ff9a40" stroke-width="3" stroke-linecap="round"/>'),
  mark: svg('<circle cx="32" cy="32" r="20" fill="none" stroke="#e05040" stroke-width="3"/><circle cx="32" cy="32" r="10" fill="none" stroke="#e05040" stroke-width="2"/><path d="M32 4 V18 M32 46 V60 M4 32 H18 M46 32 H60" stroke="#f0d0a0" stroke-width="3"/>'),
  powder: svg('<path d="M10 40 L30 30 L10 22Z" fill="#7a6a5a"/><g fill="#e8e0c8">' + [[38, 20, 5], [46, 32, 7], [38, 44, 5], [54, 22, 4], [54, 44, 4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('') + '</g>'),
});
const arc = (g, p, dir, r, cos, fn) => alive(g, (e) => { const v = tmp.copy(e.pos).sub(p.pos).setY(0), d = v.length(); if (d < r + e.radius && (d < 0.8 || v.normalize().dot(dir) > cos)) fn(e); });
export const ALT_SKILLS = {
  faris: [
    { lvl: 15, id: 'rally', name: 'Rallying Cry', icon: 'rally', cd: 18, mana: 20, buff: 'rally', desc: '+25% damage and +20 armour for 6 seconds', use(g, p) {
      p.buffs.rally = 6; g.audio.levelUp?.(); g.fx.ring(p.pos, C(3, 1.4, 0.6), 0.5, 6, 0.8); g.recalcStats();
    } },
    { lvl: 25, id: 'bash', name: 'Shield Rush', icon: 'bash', cd: 9, mana: 18, aim: true, desc: 'Rush 7 m behind your shield, knocking foes aside and staggering them', use(g, p) {
      const { dir } = dirToCursor(g); faceDir(p, dir); p.st.action = 'attack'; p.st.actionT = 0.2; p.actionDur = 0.45; g.audio.whoosh(); p.invuln = Math.max(p.invuln || 0, 0.45);
      const from = p.pos.clone(), hit = new Set();
      for (let k = 1; k <= 14; k++) setTimeout(() => { if (p.dead) return; p.pos.addScaledVector(dir, 0.5); resolve(p.pos, 0.45); p.pos.y = g.interior ? 0 : heightAt(p.pos.x, p.pos.z); g.fx.dust(p.pos, 2, 0.6);
        alive(g, (e) => { if (hit.has(e) || e.pos.distanceTo(p.pos) > 1.8 + e.radius) return; hit.add(e); const r = g.rollDamage(1.3); g.damageEnemy(e, r.d, r.crit, from, 'normal', { weight: 1.6, knock: 2.6, skill: true }); if (!e.boss) e.staggerT = Math.max(e.staggerT || 0, 1.4); }); }, k * 22);
      setTimeout(() => { g.shake = Math.max(g.shake, 0.35); g.fx.ring(p.pos, C(2.6, 2, 1.2), 0.4, 3, 0.4); }, 330);
    } },
    { lvl: 20, id: 'sweep', name: 'Sweeping Cut', icon: 'sweep', cd: 6, mana: 16, aim: true, desc: 'A wide cut through every foe in front of you', use(g, p) {
      const { dir } = dirToCursor(g); faceDir(p, dir); p.st.action = 'attack'; p.st.actionT = 0; p.actionDur = 0.55; g.audio.whoosh();
      p.pendingHit = { at: 0.4, fn: () => { arc(g, p, dir, 3.6, -0.2, (e) => { const r = g.rollDamage(1.7); g.damageEnemy(e, r.d, r.crit, p.pos, 'normal', { weight: 1.4, knock: 2 }); }); g.fx.ring(tmp.copy(p.pos).addScaledVector(dir, 1.2), C(2.4, 2, 1.4), 0.5, 3.6, 0.3, 0.6); } };
    } },
  ],
  rami: [
    { lvl: 15, id: 'pin', name: 'Pinning Shot', icon: 'pin', cd: 5, mana: 12, desc: 'A heavy arrow that pins a foe in place for 2.5 seconds', use(g, p) {
      const e = g.pickTarget(16); if (!e) { g.ui.toast('No foe in reach'); return false; }
      const dir = tmp.copy(e.pos).sub(p.pos).setY(0).normalize().clone(); faceDir(p, dir); p.st.action = 'shoot'; p.st.actionT = 0.3; p.actionDur = 0.4;
      g.playerShot(dir, { speed: 40, mult: 1.8, kind: 'arrow', glow: C(2.4, 1.4, 1), weight: 1 }); g.audio.whoosh();
      setTimeout(() => { if (!e.dead) { e.slowT = 2.5; e.slowK = 0.95; e.staggerT = Math.max(e.staggerT || 0, 0.6); } }, Math.min(500, e.pos.distanceTo(p.pos) / 40 * 1000));
    } },
    { lvl: 25, id: 'pierce', name: 'Piercing Shot', icon: 'pierce', cd: 6, mana: 16, aim: true, desc: 'A heavy arrow that passes through every foe in a line', use(g, p) {
      const { dir } = dirToCursor(g); faceDir(p, dir); p.st.action = 'shootKneel'; p.st.actionT = 0.35; p.actionDur = 0.5; g.audio.whoosh();
      const from = p.pos.clone(); g.playerShot(dir.clone(), { speed: 46, mult: 0.01, kind: 'arrow', glow: C(2.6, 1.8, 1.2), weight: 0.2 });
      for (let k = 1; k <= 11; k++) setTimeout(() => { const c = from.clone().addScaledVector(dir, k * 2); g.fx.sparks?.(tmp.copy(c).setY(c.y + 1.2), C(2.4, 1.6, 1)); alive(g, (e) => { const v = tmp.copy(e.pos).sub(from).setY(0), along = v.dot(dir), side = Math.abs(v.x * dir.z - v.z * dir.x); if (along > k * 2 - 2 && along <= k * 2 && side < 0.9 + e.radius) { const r = g.rollDamage(2.0); g.damageEnemy(e, r.d, r.crit, from, 'normal', { weight: 1, skill: true }); } }); }, k * 40);
    } },
    { lvl: 20, id: 'scatter', name: 'Scatter Volley', icon: 'scatter', cd: 7, mana: 18, aim: true, desc: 'Seven arrows loosed in a wide fan', use(g, p) {
      const { dir } = dirToCursor(g); faceDir(p, dir); p.st.action = 'shoot'; p.st.actionT = 0.2; p.actionDur = 0.45; g.audio.whoosh();
      for (let i = -3; i <= 3; i++) { const a = Math.atan2(dir.x, dir.z) + i * 0.17; g.playerShot(new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), { speed: 32, mult: 0.9, kind: 'arrow', weight: 0.5 }); }
    } },
  ],
  naffat: [
    { lvl: 15, id: 'mortar', name: 'Naft Mortar', icon: 'mortar', cd: 9, mana: 26, aim: true, desc: 'Three pots fall in turn on the target ground', use(g, p) {
      const { dir, point } = dirToCursor(g); faceDir(p, dir); p.st.action = 'throw'; p.st.actionT = 0; p.actionDur = 0.45; g.audio.whoosh();
      const d = Math.min(14, Math.hypot(point.x - p.pos.x, point.z - p.pos.z));
      for (let i = 0; i < 3; i++) { const c = p.pos.clone().addScaledVector(dir, d).add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3)); c.y = heightAt(c.x, c.z);
        g.telegraph(c, 2.4, 0.6 + i * 0.35, () => { g.fx.flash(tmp.copy(c).setY(c.y + 1), 0xff7a30, 30, 0.3, 10); g.fx.naftBurst?.(c, 2.4); g.audio.boom(); alive(g, (e) => { if (e.pos.distanceTo(c) < 2.4 + e.radius) { const r = g.rollDamage(1.4, true); g.damageEnemy(e, r.d, r.crit, c, 'fire', { weight: 0.8, knock: 1.2 }); e.burn = Math.max(e.burn || 0, 2); } }); }, false, true); }
    } },
    { lvl: 25, id: 'firewall', name: 'Wall of Fire', icon: 'firewall', cd: 14, mana: 30, aim: true, desc: 'Naft poured in a line across the ground, burning for 5 seconds', use(g, p) {
      const { dir, point } = dirToCursor(g); faceDir(p, dir); p.st.action = 'throw'; p.st.actionT = 0; p.actionDur = 0.5; g.audio.whoosh();
      const d = Math.min(9, Math.max(3, Math.hypot(point.x - p.pos.x, point.z - p.pos.z))), mid = p.pos.clone().addScaledVector(dir, d), side = new THREE.Vector3(dir.z, 0, -dir.x);
      const pts = []; for (let i = -3; i <= 3; i++) { const q = mid.clone().addScaledVector(side, i * 1.4); q.y = g.interior ? 0 : heightAt(q.x, q.z); pts.push(q); }
      let t0 = 0; const tick = () => { t0 += 0.25; for (const q of pts) { if (Math.random() < 0.8) g.fx.fire(tmp.copy(q).setY(q.y + 0.2), 0.9); }
        alive(g, (e) => { for (const q of pts) if (e.pos.distanceTo(q) < 1.1 + e.radius) { const r = g.rollDamage(0.32, true); g.damageEnemy(e, r.d, false, q, 'dot'); e.burn = Math.max(e.burn || 0, 2); break; } });
        if (t0 < 5) setTimeout(tick, 250); };
      setTimeout(() => { g.audio.boom(); g.fx.flash?.(tmp.copy(mid).setY(mid.y + 1), 0xff7a30, 20, 0.3, 8); for (const q of pts) if (Math.random() < 0.5) g.fx.naftBurst?.(q, 1.2); for (const q of pts) g.decal?.(q, 1.6, 'scorch'); tick(); }, 300);
    } },
    { lvl: 20, id: 'brand', name: 'Burning Brand', icon: 'brand', cd: 16, mana: 24, buff: 'brand', desc: 'For 8 seconds every hit sets the foe alight', use(g, p) {
      p.buffs.brand = 8; g.audio.boom(); g.fx.flash(tmp.copy(p.pos).setY(p.pos.y + 1.4), 0xff7a30, 20, 0.4, 8);
    } },
  ],
  ayyar: [
    { lvl: 15, id: 'mark', name: 'Death Mark', icon: 'mark', cd: 10, mana: 14, desc: 'Marked foe takes 35% more damage for 8 seconds', use(g, p) {
      const e = g.pickTarget(14); if (!e) { g.ui.toast('No foe in reach'); return false; }
      e.markT = 8; p.target = e; g.audio.whoosh(); g.fx.ring(e.pos, C(3, 0.6, 0.4), 0.3, 1.6, 0.6);
    } },
    { lvl: 25, id: 'shadowstep', name: 'Shadow Step', icon: 'shadowstep', cd: 8, mana: 16, desc: 'Step through the shadows to a foe\'s back and strike a sure critical blow', use(g, p) {
      const e = g.pickTarget(12); if (!e) { g.ui.toast('No foe in reach'); return false; }
      g.fx.burst(tmp.copy(p.pos).setY(p.pos.y + 1), 18, { speed: 1.5, life: 0.8, size: 0.5, size1: 1.4, color: C(0.3, 0.28, 0.36), alpha: 0.5, smoke: true, drag: 2 });
      const b = new THREE.Vector3(-Math.sin(e.facing), 0, -Math.cos(e.facing)); p.pos.copy(e.pos).addScaledVector(b, 1.3 + e.radius); resolve(p.pos, 0.45); p.pos.y = g.interior ? 0 : heightAt(p.pos.x, p.pos.z);
      p.facing = e.facing; p.target = e; p.invuln = Math.max(p.invuln || 0, 0.3); p.st.action = 'attack'; p.st.actionT = 0.3; p.actionDur = 0.35; g.camInit = false; g.audio.whoosh();
      setTimeout(() => { if (e.dead) return; const r = g.rollDamage(2.4); g.damageEnemy(e, Math.round(r.d * 1.3), true, p.pos, 'normal', { weight: 0.9, skill: true }); }, 160);
    } },
    { lvl: 20, id: 'powder', name: 'Blinding Powder', icon: 'powder', cd: 9, mana: 14, aim: true, desc: 'A cloud of powder that dazes every foe in front of you', use(g, p) {
      const { dir } = dirToCursor(g); faceDir(p, dir); p.st.action = 'throw'; p.st.actionT = 0.2; p.actionDur = 0.3; g.audio.whoosh();
      g.fx.burst(tmp.copy(p.pos).addScaledVector(dir, 2).setY(p.pos.y + 1.2), 30, { speed: 3, life: 1.2, size: 0.8, size1: 2.2, color: C(0.85, 0.82, 0.72), alpha: 0.5, smoke: true, drag: 2 });
      arc(g, p, dir, 4.5, 0.35, (e) => { if (!e.boss) { e.staggerT = 2.2; e.st.action = null; e.alerted = false; e.lost = 1.5; } else e.staggerT = Math.max(e.staggerT || 0, 0.5); });
    } },
  ],
};
