import * as THREE from 'three';
import { humanoid } from './characters.js';
import { LOOK, byzify } from './byz.js';
import { horseRider } from './foes20.js';
import { heightAt } from './terrain.js';
import { navClear } from './nav.js';
import { resolve, lineClear } from './collision.js';
import { t } from './i18n.js';

// Round 26: three new kinds of Byzantine troop, each asking for a different answer.
//   standard: the bandophoros carries his unit's plain bandon. While it stands, his men within RALLY m move faster and
//             strike harder (a gold ring on the ground shows the reach). Cut him down and they waver.
//   wall:     three skoutatoi with locked shields who advance abreast. From the front almost every blow is turned;
//             get round them, or break a man's guard with heavy blows (blocked hits drain his poise fast).
//             When only one is left standing he fights like any skoutatos.
//   hippo:    a hippotoxotes, a horse archer: he rides a wide circle round Salim and shoots as he goes. Close in
//             as he passes; wound him badly and he is thrown and fights on foot with his bow.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const RALLY = 9;
const BANDS = [0x7a1a14, 0x1e3a6a, 0x2a4a2a, 0x5a1a4a];

function bearerBuild(x) {
  const k = Math.floor(Math.random() * BANDS.length);
  const rig = humanoid(byzify({ ...LOOK.skoutatos(), offhand: null, shieldKind: null, standard: BANDS[k], cloak: BANDS[k], crest: 'plume', ...x }));
  // the reach of the rally: one faint ring on the ground, shown while he is alerted
  const ring = new THREE.Mesh(new THREE.RingGeometry(RALLY - 0.25, RALLY, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.0, 0.2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  ring.position.y = 0.1; ring.visible = false; rig.add(ring); rig.userData.rallyRing = ring;
  return rig;
}
function wallBuild(x) {
  const rig = humanoid(byzify({ ...LOOK.skoutatos(), shieldKind: 'oval', ...x }));
  const sh = rig.userData.parts?.shield; if (sh) sh.scale.multiplyScalar(1.3); // the big oval of the line
  return rig;
}

export const TYPES26 = {
  standard: {
    name: 'Bandophoros', hp: 40, dmg: 7, speed: 3.8, range: 1.9, atk: 1.4, xp: 30, radius: 0.5, action: 'attack',
    build: (x) => bearerBuild(x), ai: bearerAI,
  },
  wall: {
    name: 'Skoutatos of the Wall', hp: 50, dmg: 9, speed: 3.4, range: 2.0, atk: 1.6, xp: 26, radius: 0.55, action: 'shove',
    build: (x) => wallBuild(x), ai: wallAI,
  },
  hippo: {
    name: 'Hippotoxotes', hp: 36, dmg: 8, speed: 7.4, range: 15, atk: 2.2, xp: 30, radius: 1.0, action: 'shoot', ranged: 'arrow', shootH: 2.3,
    build: (x) => horseRider(byzify({ ...LOOK.toxotes(), helm: 'byz', pilos: null, armour: 'scale', leather: 0x3a2a1a, ...x })),
    ai: hippoAI,
  },
};

// ------------------------------------------------------------------ the standard-bearer
function bearerAI(g, e, dt, dist) {
  const ring = e.rig.userData.rallyRing;
  const on = e.alerted && !g.player.dead;
  if (ring) { ring.visible = on; ring.material.opacity = on ? 0.22 + Math.sin(g.t * 3) * 0.08 : 0; }
  const flag = e.rig.userData.parts?.standard; if (flag) flag.rotation.y = Math.sin(g.t * 1.7 + e.home.x) * 0.35;
  if (!on) return;
  if (!g.rallyWarned && dist < 22) { g.rallyWarned = true; g.ui.toast(t('A standard rallies his men: cut him down first')); g.bark?.('Salim', 'The standard. Take the standard.'); }
  for (const o of g.enemies) {
    if (o === e || o.dead || o.boss || o.T.static || o.type === 'standard') continue;
    if (o.pos.distanceToSquared(e.pos) < RALLY * RALLY) { if (!(o.rallyT > 0)) o.speed = o.T.speed * 1.25; o.rallyT = 0.35; o.alerted = true; }
  }
  // he keeps behind his men: hold 5-8 m off while any of them is near him
  const near = g.enemies.some((o) => o !== e && !o.dead && !o.T.ranged && !o.boss && o.alerted && o.pos.distanceToSquared(e.pos) < RALLY * RALLY * 2);
  if (!near || e.st.action || e.staggerT > 0) return; // alone (or busy): he fights like anyone
  const p = g.player.pos;
  let want = null;
  if (dist < 5) { const away = tmp.copy(e.pos).sub(p).setY(0).normalize(); want = V(e.pos.x + away.x * 3, 0, e.pos.z + away.z * 3); }
  else if (dist > 8.5) want = p;
  e.facing += angDiff(e.facing, Math.atan2(p.x - e.pos.x, p.z - e.pos.z)) * Math.min(1, dt * 6);
  let moving = false;
  if (want) {
    const dir = tmp.set(want.x - e.pos.x, 0, want.z - e.pos.z).normalize(), nx = e.pos.x + dir.x * e.speed * 0.8 * dt, nz = e.pos.z + dir.z * e.speed * 0.8 * dt;
    if (navClear(e.pos.x, e.pos.z, nx, nz)) { e.pos.x = nx; e.pos.z = nz; moving = true; }
  }
  resolve(e.pos, e.radius); e.pos.y = heightAt(e.pos.x, e.pos.z);
  e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend, moving ? 1 : 0, Math.min(1, dt * 8)); e.st.phase += dt * (moving ? e.speed * 1.2 : 0);
  e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist);
  return 'skip';
}

// ------------------------------------------------------------------ the shield wall
export function spawnWall(g, x, z, level, opts = {}) {
  const men = [];
  for (let i = 0; i < 3; i++) men.push(...g.spawnPack('wall', x, z, 1, level, { spread: 0, ...opts }));
  const W = { men, face: Math.random() * 6 };
  men.forEach((m, i) => { m.wall = W; m.slot = i - 1; m.blockK = 0.95; m.blockPoiseK = 2.6; m.pos.set(x + Math.cos(W.face) * m.slot * 1.25, 0, z - Math.sin(W.face) * m.slot * 1.25); m.pos.y = heightAt(m.pos.x, m.pos.z); m.home.copy(m.pos); m.facing = W.face; });
  return men;
}
function wallAI(g, e, dt, dist) {
  const W = e.wall;
  if (!W) return;
  const live = W.men.filter((m) => !m.dead);
  if (live.length < 2) { for (const m of live) { m.wall = null; m.blockK = 0.7; m.blockPoiseK = 1; } return; }
  if (!e.alerted) { if (W.men.some((m) => m.alerted)) e.alerted = true; else return; }
  if (e.st.action || e.staggerT > 0 || g.player.dead) return; // the usual code plays the bash or the reel
  if (!g.wallWarned && dist < 16) { g.wallWarned = true; g.ui.toast(t('A shield wall: get round it, or break a guard with heavy blows')); }
  // the line: centred on the men still standing, square to Salim, slots kept even
  const p = g.player.pos, c = tmp.set(0, 0, 0);
  for (const m of live) c.add(m.pos); c.divideScalar(live.length);
  if (e === live[0]) W.face += angDiff(W.face, Math.atan2(p.x - c.x, p.z - c.z)) * Math.min(1, dt * 1.2); // the line turns slowly: the flanks are open
  const fx = Math.sin(W.face), fz = Math.cos(W.face), rank = live.indexOf(e) - (live.length - 1) / 2;
  const cd = Math.hypot(p.x - c.x, p.z - c.z), step = cd > 2.6 ? Math.min(1, cd - 2.4) : 0;
  const wx = c.x + fz * rank * 1.25 + fx * step, wz = c.z - fx * rank * 1.25 + fz * step;
  const dx = wx - e.pos.x, dz = wz - e.pos.z, d = Math.hypot(dx, dz);
  let moving = false;
  if (d > 0.15) { const sp = Math.min(d / dt, e.speed * (e.rallyT > 0 ? 0.75 : 0.55)), nx = e.pos.x + dx / d * sp * dt, nz = e.pos.z + dz / d * sp * dt; if (navClear(e.pos.x, e.pos.z, nx, nz)) { e.pos.x = nx; e.pos.z = nz; moving = true; } }
  e.facing += angDiff(e.facing, W.face) * Math.min(1, dt * 6);
  // a man with Salim before him at arm's length bashes with the shield
  const ahead = (p.x - e.pos.x) * fx + (p.z - e.pos.z) * fz;
  if (dist < e.range + 0.5 && ahead > 0 && e.atkCd <= 0) { e.st.action = e.T.action; e.st.actionT = 0; e.didHit = false; e.atkCd = e.T.atk * (0.9 + Math.random() * 0.4); g.telegraphTell?.(e); }
  resolve(e.pos, e.radius); e.pos.y = heightAt(e.pos.x, e.pos.z);
  e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend, moving ? 0.6 : 0, Math.min(1, dt * 8)); e.st.phase += dt * (moving ? 2.4 : 0);
  e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist);
  return 'skip';
}

// ------------------------------------------------------------------ the horse archer
function hippoAI(g, e, dt, dist) {
  const p = g.player;
  if (!e.st.thrown && e.hp < e.maxHp * 0.5 && !e.dead) {
    e.st.thrown = true;
    const side = V(Math.cos(e.facing), 0, -Math.sin(e.facing));
    const foot = g.spawnPack('archer', e.pos.x + side.x * 1.4, e.pos.z + side.z * 1.4, 1, e.level, { spread: 0, name: 'Unhorsed Hippotoxotes' })[0];
    foot.hp = foot.maxHp = Math.max(8, Math.round(e.hp * 0.9)); foot.alerted = true; foot.staggerT = 1.2; foot.riseT = 0;
    e.rig.userData.rider.visible = false; e.dead = true; e.fleeing = true; e.deadT = 0; e.st.dead = false; e.xp = 0;
    g.fx.dust(e.pos, 16, 1.4); g.audio.at(e.pos, () => g.audio.grunt?.());
    return 'skip';
  }
  if (!e.alerted || p.dead) return;
  if (!g.hippoWarned && dist < 24) { g.hippoWarned = true; g.ui.toast(t('A horse archer circles: close in as he passes')); }
  // ride a circle of 5.7-7.1 m round Salim (on a phone the overhead view shows about 7 m above and below him), turning the other way when the ground is blocked
  e.dirSign ||= Math.random() < 0.5 ? 1 : -1;
  const a = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z), r = 6.4 + Math.sin(g.t * 0.7 + e.home.z) * 0.7;
  const ta = a + e.dirSign * 0.55, tx = p.pos.x + Math.sin(ta) * r, tz = p.pos.z + Math.cos(ta) * r;
  e.facing += angDiff(e.facing, Math.atan2(tx - e.pos.x, tz - e.pos.z)) * Math.min(1, dt * 4);
  const sp = e.speed * (e.slowT > 0 ? 1 - e.slowK : 1) * (dist < 6 ? 1.15 : 1);
  const nx = e.pos.x + Math.sin(e.facing) * sp * dt, nz = e.pos.z + Math.cos(e.facing) * sp * dt;
  // move, then push out of walls; if a wall ate most of the step, wheel the other way (at most once a second)
  const ox = e.pos.x, oz = e.pos.z; e.pos.x = nx; e.pos.z = nz; resolve(e.pos, e.radius);
  e.flipT = (e.flipT || 0) - dt;
  if (Math.hypot(e.pos.x - ox, e.pos.z - oz) < sp * dt * 0.35 && e.flipT <= 0) { e.dirSign *= -1; e.flipT = 1; }
  e.pos.y = heightAt(e.pos.x, e.pos.z);
  // loose as he rides, when the line of sight is clear (lineClear: the nav grid is padded round props)
  if (e.st.action) {
    e.st.actionT += dt / e.T.atk * 2.2;
    if (!e.didHit && e.st.actionT > 0.55) { e.didHit = true; g.shootArrow(e); }
    if (e.st.actionT >= 1) e.st.action = null;
  } else if (e.atkCd <= 0 && dist < 18 && lineClear(e.pos.x, e.pos.z, p.pos.x, p.pos.z)) {
    e.st.action = 'shoot'; e.st.actionT = 0; e.didHit = false; e.atkCd = e.T.atk * (0.9 + Math.random() * 0.4);
  }
  e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend, 1, Math.min(1, dt * 6)); e.st.phase += dt * sp * 1.1;
  e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist);
  return 'skip';
}

// ------------------------------------------------------------------ wiring (set up from main.js)
export function setupFoes26(g) {
  // the rally wears off a moment after a man leaves the bearer's reach
  const upd = g.updateEnemies.bind(g);
  g.updateEnemies = (dt) => {
    for (const o of g.enemies) if (o.rallyT > 0) { o.rallyT -= dt; if (o.rallyT <= 0) o.speed = o.T.speed; }
    return upd(dt);
  };
  // rallied men hit harder; a shield bash shoves Salim back
  const dp = g.damagePlayer.bind(g);
  g.damagePlayer = (dmg, src, attacker = null) => {
    if (attacker?.rallyT > 0) dmg *= 1.25;
    const r = dp(dmg, src, attacker);
    if (attacker?.type === 'wall' && !g.player.dead && g.player.invuln <= 0) { const P = g.player; P.knock = (P.knock || V(0, 0, 0)).addScaledVector(tmp.set(P.pos.x - attacker.pos.x, 0, P.pos.z - attacker.pos.z).normalize(), 12); }
    return r;
  };
  // the standard falls: his men waver
  const ke = g.killEnemy.bind(g);
  g.killEnemy = (e, src) => {
    const was = e.type === 'standard' && !e.dead;
    const r = ke(e, src);
    if (was && e.dead) {
      let n = 0;
      for (const o of g.enemies) if (!o.dead && !o.boss && o.pos.distanceTo(e.pos) < RALLY + 3) { o.rallyT = 0; o.speed = o.T.speed; o.staggerT = Math.max(o.staggerT || 0, 1.3); n++; }
      if (n) g.ui.toast(t('The standard falls: his men waver'));
      e.rig.userData.rallyRing && (e.rig.userData.rallyRing.visible = false);
    }
    return r;
  };
}
