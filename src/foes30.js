import * as THREE from 'three';
import { humanoid, saluki, animateSaluki } from './characters.js';
import { LOOK, byzify } from './byz.js';
import { horseRider } from './foes20.js';
import { heightAt } from './terrain.js';
import { navClear } from './nav.js';
import { resolve, lineClear } from './collision.js';
import { t } from './i18n.js';

// Round 30: two new kinds of Byzantine troop.
//   kontophoros: a lancer on horseback. He keeps 12-16 m off, lines up on Salim and shows the lane he will ride down
//                (0.9 s), then charges through it at full gallop: a heavy blow and a throw for anyone in the lane. After
//                the pass he has to rein in and wheel round (2 s): that is the moment to close in. Below half his
//                life he is thrown and fights on foot as a braced spearman.
//   kynegos:     a dog handler. When he sees Salim he slips two war dogs, which harry: a dash in, a bite, a dart out.
//                He keeps back and whistles them on. Cut him down and the dogs run.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const LANE_W = 2.4, LANE_L = 22;

export const TYPES30 = {
  kontophoros: {
    name: 'Kontophoros', hp: 48, dmg: 12, speed: 7.0, range: 16, atk: 3.2, xp: 38, radius: 1.0, action: 'attack',
    build: (x) => horseRider(byzify({ ...LOOK.kataphraktos(), weapon: 'spear', offhand: 'shield', shieldKind: 'round', cloak: 0x6a2a24, ...x })),
    ai: lancerAI,
  },
  kynegos: {
    name: 'Kynegos', hp: 36, dmg: 7, speed: 4.4, range: 1.7, atk: 1.4, xp: 28, radius: 0.45, action: 'attack',
    build: (x) => humanoid(byzify({ ...LOOK.psilos(), weapon: 'dagger', offhand: null, shieldKind: null, armour: 'leather', leather: 0x4a3a2a, robe: '#6a5a3a', sash: 0x3a2a1a, ...x })),
    ai: handlerAI,
  },
  molossos: {
    name: 'War Dog', hp: 16, dmg: 5, speed: 8.2, range: 1.5, atk: 1.1, xp: 8, radius: 0.4, action: 'attack', quad: true,
    build: () => { const r = saluki('blacktan'); r.scale.set(1.3, 1.36, 1.55); return r; }, // heavier and broader than the camp's saluki (it faces +x)
    ai: dogAI,
  },
};
const ours = (g, e) => e.alerted && !g.player.dead && !(e.staggerT > 0) && !e.hidden && e.riseT >= 1;
function settle(g, e, dt, dist, moving, face, gait = 1.2) {
  if (face != null) e.facing += angDiff(e.facing, face) * Math.min(1, dt * 7);
  resolve(e.pos, e.radius); e.pos.y = heightAt(e.pos.x, e.pos.z);
  e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend, moving ? 1 : 0, Math.min(1, dt * 8)); e.st.phase += dt * (moving ? e.speed * gait : 0);
  e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist);
  return 'skip';
}
function stepTo(e, want, sp, dt) {
  const dx = want.x - e.pos.x, dz = want.z - e.pos.z, d = Math.hypot(dx, dz); if (d < 0.2) return false;
  const s = Math.min(d, sp * (e.slowT > 0 ? 1 - e.slowK : 1) * dt), nx = e.pos.x + dx / d * s, nz = e.pos.z + dz / d * s;
  if (!navClear(e.pos.x, e.pos.z, nx, nz)) return false;
  e.pos.x = nx; e.pos.z = nz; return true;
}

// ------------------------------------------------------------------ the lancer
function laneMesh(g, e) {
  if (e.lane) return e.lane;
  const geo = new THREE.PlaneGeometry(LANE_W, LANE_L).rotateX(-Math.PI / 2).translate(0, 0, LANE_L / 2);
  // a solid red band with brighter edges: additive red vanished on sunlit sand
  const c = document.createElement('canvas'); c.width = 32; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = 'rgba(200,40,20,0.55)'; x.fillRect(0, 0, 32, 64); x.fillStyle = 'rgba(255,90,40,1)'; x.fillRect(0, 0, 3, 64); x.fillRect(29, 0, 3, 64);
  for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(6, 10 + i * 14); x.lineTo(16, 4 + i * 14); x.lineTo(26, 10 + i * 14); x.lineWidth = 3; x.strokeStyle = 'rgba(255,150,90,0.9)'; x.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, LANE_L / 3);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }));
  m.renderOrder = 3; g.scene.add(m); e.lane = m; (g.marks30 ||= new Set()).add(e); return m;
}
function lancerAI(g, e, dt, dist) {
  if (!e.thrown30 && e.hp < e.maxHp * 0.5 && !e.dead) return unhorse(g, e);
  if (!ours(g, e)) { if (e.lane) e.lane.visible = false; return; }
  if (!g.lancerWarned && dist < 26) { g.lancerWarned = true; g.ui.toast(t('A lancer charges down a marked lane: step out of it, then strike as he wheels')); }
  const P = g.player, p = P.pos, face = Math.atan2(p.x - e.pos.x, p.z - e.pos.z), C = (e.ch30 ||= { s: 'line', t: 0, dir: 0, hit: false, from: V(0, 0, 0) });
  C.t += dt;
  if (C.s === 'aim') {
    // the lane follows Salim for the first half of the aim, then sets
    if (C.t < 0.45) C.dir += angDiff(C.dir, face) * Math.min(1, dt * 6);
    const L = laneMesh(g, e); L.visible = true; L.position.set(e.pos.x, e.pos.y + 0.07, e.pos.z); L.rotation.y = C.dir;
    L.material.opacity = 0.35 + 0.5 * Math.min(1, C.t / 0.9) * (0.8 + 0.2 * Math.sin(g.t * 24)); L.material.map.offset.y = -g.t * 2.5; // chevrons run toward Salim
    e.facing += angDiff(e.facing, C.dir) * Math.min(1, dt * 9);
    if (C.t >= 0.9) { C.s = 'charge'; C.t = 0; C.hit = false; C.from.copy(e.pos); g.audio.at?.(e.pos, () => g.audio.grunt?.()); g.shake = Math.max(g.shake || 0, 0.12); }
    return settle(g, e, dt, dist, false, null);
  }
  if (C.s === 'charge') {
    const sp = 17 * (e.slowT > 0 ? 1 - e.slowK * 0.5 : 1), fx = Math.sin(C.dir), fz = Math.cos(C.dir), ox = e.pos.x, oz = e.pos.z;
    e.pos.x += fx * sp * dt; e.pos.z += fz * sp * dt; resolve(e.pos, e.radius);
    const blocked = Math.hypot(e.pos.x - ox, e.pos.z - oz) < sp * dt * 0.4;
    if (e.lane) e.lane.material.opacity = Math.max(0, e.lane.material.opacity - dt * 0.8);
    // anyone beside the horse's chest is struck once: a heavy blow and a throw along the lane
    const rx = p.x - e.pos.x, rz = p.z - e.pos.z, along = rx * fx + rz * fz, across = Math.abs(rx * fz - rz * fx);
    if (!C.hit && along > -0.6 && along < 1.8 && across < LANE_W / 2 + 0.2 && !(P.invuln > 0)) {
      C.hit = true; g.damagePlayer(e.dmg * 2.2, e.pos, null);
      P.knock = (P.knock || V(0, 0, 0)).addScaledVector(tmp.set(fx + (rx * fz - rz * fx > 0 ? 0.6 : -0.6) * fz, 0, fz), 12);
      g.ui.damageNumber?.(p, t('Ridden down!'), 'stagger'); g.shake = Math.max(g.shake || 0, 0.45); g.audio.at?.(e.pos, () => g.audio.clang?.());
    }
    e.facing = C.dir; e.st.walkBlend = 1; e.st.phase += dt * sp * 0.9;
    if (Math.random() < 0.5) g.fx.dust?.(e.pos, 2, 0.7);
    if (blocked || e.pos.distanceTo(C.from) > LANE_L - 1 || C.t > 1.6) { C.s = 'wheel'; C.t = 0; if (e.lane) e.lane.visible = false; }
    e.pos.y = heightAt(e.pos.x, e.pos.z); e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist);
    return 'skip';
  }
  if (C.s === 'wheel') {
    // reining in and turning: slow, wide, no threat (open to a counter)
    e.openT = 0.3; const sp = Math.max(2, 9 - C.t * 5);
    e.facing += angDiff(e.facing, face) * Math.min(1, dt * 1.6);
    const nx = e.pos.x + Math.sin(e.facing) * sp * dt, nz = e.pos.z + Math.cos(e.facing) * sp * dt;
    if (navClear(e.pos.x, e.pos.z, nx, nz)) { e.pos.x = nx; e.pos.z = nz; }
    if (C.t > 2.1) { C.s = 'line'; C.t = 0; e.atkCd = 1.2 + Math.random(); }
    return settle(g, e, dt, dist, true, null, 0.9);
  }
  // lining up: ride to a spot 12-16 m from Salim with a clear run at him
  e.side30 ||= Math.random() < 0.5 ? 1 : -1;
  const a = Math.atan2(e.pos.x - p.x, e.pos.z - p.z) + e.side30 * 0.25 * dt, want = tmp.set(p.x + Math.sin(a) * 14, 0, p.z + Math.cos(a) * 14);
  const moving = stepTo(e, want, e.speed * 0.8, dt); if (!moving) e.side30 *= -1;
  if (e.atkCd <= 0 && dist > 8 && dist < 19 && lineClear(e.pos.x, e.pos.z, p.x, p.z)) { C.s = 'aim'; C.t = 0; C.dir = face; g.telegraphTell?.(e); }
  return settle(g, e, dt, dist, moving, Math.atan2(want.x - e.pos.x, want.z - e.pos.z), 0.9);
}
function unhorse(g, e) {
  e.thrown30 = true; if (e.lane) e.lane.visible = false;
  const side = V(Math.cos(e.facing), 0, -Math.sin(e.facing));
  const foot = g.spawnPack('kontaratos', e.pos.x + side.x * 1.4, e.pos.z + side.z * 1.4, 1, e.level, { spread: 0, name: 'Unhorsed Kontophoros' })[0];
  if (foot) { foot.hp = foot.maxHp = Math.max(10, Math.round(e.hp * 0.9)); foot.alerted = true; foot.staggerT = 1.2; foot.riseT = 0; foot.sideTag = e.sideTag; }
  e.rig.userData.rider && (e.rig.userData.rider.visible = false); e.dead = true; e.fleeing = true; e.deadT = 0; e.st.dead = false; e.xp = 0;
  g.fx.dust(e.pos, 16, 1.4); g.audio.at?.(e.pos, () => g.audio.grunt?.());
  return 'skip';
}

// ------------------------------------------------------------------ the dog handler and his dogs
function handlerAI(g, e, dt, dist) {
  if (!ours(g, e)) return;
  if (!e.dogs) {
    // slip the dogs
    e.dogs = g.spawnPack(['molossos', 'molossos'], e.pos.x, e.pos.z, 2, e.level, { spread: 1.2 });
    for (const d of e.dogs) { d.alerted = true; d.riseT = 1; d.master = e; d.sideTag = e.sideTag; d.hp = d.maxHp = Math.max(8, Math.round(d.maxHp)); }
    if (!g.dogWarned) { g.dogWarned = true; g.ui.toast(t('A dog handler: cut him down and his dogs will run')); }
    g.audio.at?.(e.pos, () => g.audio.whistle?.());
  }
  // he keeps 5-8 m back behind his dogs; close up, the base AI fights with the knife
  if (dist < 4.5) return;
  const p = g.player.pos, face = Math.atan2(p.x - e.pos.x, p.z - e.pos.z);
  let want = null;
  if (dist < 5.5) { tmp.copy(e.pos).sub(p).setY(0).normalize(); want = V(e.pos.x + tmp.x * 2, 0, e.pos.z + tmp.z * 2); }
  else if (dist > 8.5) want = p;
  const moving = want ? stepTo(e, want, e.speed * 0.8, dt) : false;
  return settle(g, e, dt, dist, moving, face);
}
function dogAI(g, e, dt, dist) {
  const D = (e.dog30 ||= { s: 'run', t: 0, dir: V(0, 0, 0) }), p = g.player.pos;
  // the handler is down: the dogs run off and are gone
  if (e.master && e.master.dead && D.s !== 'flee') { D.s = 'flee'; D.t = 0; tmp.copy(e.pos).sub(p).setY(0).normalize(); D.dir.copy(tmp); e.xp = 0; }
  if (D.s === 'flee') {
    D.t += dt; e.pos.addScaledVector(D.dir, e.speed * 1.1 * dt); resolve(e.pos, e.radius); e.pos.y = heightAt(e.pos.x, e.pos.z);
    e.facing = Math.atan2(D.dir.x, D.dir.z); e.st.walkBlend = 1; e.st.speedK = 1.6; e.st.phase += dt * 14; e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; dogAnim(g, e);
    if (D.t > 2.5) { e.dead = true; e.removed = true; e.rig.visible = false; g.scene.remove(e.rig); }
    return 'skip';
  }
  if (!ours(g, e)) { dogAnim(g, e); return 'skip'; }
  D.t += dt; const face = Math.atan2(p.x - e.pos.x, p.z - e.pos.z);
  let moving = false, k = 1;
  if (D.s === 'lunge') {
    // a short dash and a bite at the end of it
    e.pos.addScaledVector(D.dir, 11 * dt); resolve(e.pos, e.radius); moving = true; k = 1.8;
    if (!e.didHit && dist < 1.4) { e.didHit = true; g.damagePlayer(e.dmg, e.pos, null); g.audio.at?.(e.pos, () => g.audio.bark?.()); }
    if (D.t > 0.28) { D.s = 'out'; D.t = 0; e.side30 = Math.random() < 0.5 ? 1 : -1; }
  } else if (D.s === 'out') {
    // dart away at an angle, then come again
    const a = face + Math.PI + e.side30 * 0.9; moving = stepTo(e, V(e.pos.x + Math.sin(a) * 3, 0, e.pos.z + Math.cos(a) * 3), e.speed, dt); k = 1.5;
    if (D.t > 0.8) { D.s = 'run'; D.t = 0; }
  } else {
    // circle in close, then lunge
    const a = Math.atan2(e.pos.x - p.x, e.pos.z - p.z) + (e.side30 || 1) * 0.9, r = dist > 4 ? 2.2 : 2.6;
    moving = stepTo(e, V(p.x + Math.sin(a) * r, 0, p.z + Math.cos(a) * r), e.speed, dt); k = 1.3;
    if (e.atkCd <= 0 && dist < 3.6) { D.s = 'lunge'; D.t = 0; e.didHit = false; D.dir.set(p.x - e.pos.x, 0, p.z - e.pos.z).normalize(); e.atkCd = e.T.atk * (0.8 + Math.random() * 0.5); }
  }
  e.facing += angDiff(e.facing, D.s === 'out' ? e.facing : face) * Math.min(1, dt * 10);
  e.pos.y = heightAt(e.pos.x, e.pos.z);
  e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend, moving ? 1 : 0, Math.min(1, dt * 10)); e.st.speedK = k; e.st.phase += dt * (moving ? 7 * k : 0);
  e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; dogAnim(g, e);
  return 'skip';
}
// the dog rig is a quadruped: it never goes through the humanoid animation (alive or dead)
function dogAnim(g, e) {
  // the saluki faces +x in its own frame; the game's facing is +z
  e.rig.rotation.y = e.facing - Math.PI / 2;
  animateSaluki(e.rig, e.st, g.t);
}

// ------------------------------------------------------------------ wiring (set up from main.js)
export function setupFoes30(g) {
  const anim = g.animEnemy.bind(g);
  g.animEnemy = (e, dt, dist) => {
    if (!e.T?.quad) return anim(e, dt, dist);
    // a fallen dog lies on its side
    if (e.dead) { e.rig.rotation.z = THREE.MathUtils.lerp(e.rig.rotation.z, Math.PI / 2, Math.min(1, dt * 6)); e.st.walkBlend = 0; }
    dogAnim(g, e);
  };
  const prev = g.tickExtra;
  g.tickExtra = (dt) => {
    prev?.(dt);
    if (g.marks30) for (const e of g.marks30) { const gone = e.dead || !g.enemies.includes(e); if (e.lane && (gone || !['aim', 'charge'].includes(e.ch30?.s))) e.lane.visible = false; if (gone) g.marks30.delete(e); }
  };
}
