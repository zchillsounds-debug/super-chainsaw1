import * as THREE from 'three';
import { humanoid, horse, animateHorse } from './characters.js';
import { LOOK, byzify } from './byz.js';
import { heightAt } from './terrain.js';
import { navClear } from './nav.js';

// Round 20: three new kinds of (human) foe, plus the engine one of them builds.
//   crossbowman: a slow, heavy shot. He kneels to aim for a second with a red line on the ground toward the hero,
//                then looses a bolt that hits hard and knocks back. Evade through it or step off the line.
//   engineer:    a siege carpenter. When he sees the hero he runs to open ground 12-16 m away and spends a few
//                seconds raising a field mangonel, then fights with his mallet. The mangonel is a target of its
//                own: it keeps lobbing stones onto a wide marked ring until it is broken.
//   rider:       a kataphraktos, an armoured horseman (Round 23; was a camel raider). He charges past with his lance,
//                wheels round and charges again; wound him badly enough and he is thrown, and fights on foot while
//                the horse bolts.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// ------------------------------------------------------------------ the field mangonel (manjaniq), built from boxes
const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2c, roughness: 0.85 });
const wood2 = new THREE.MeshStandardMaterial({ color: 0x4e3620, roughness: 0.9 });
const rope = new THREE.MeshStandardMaterial({ color: 0xa08a60, roughness: 1 });
function box(w, h, d, m, x, y, z, rx = 0, rz = 0) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); o.castShadow = true; o.receiveShadow = true; return o; }
export function mangonel() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  for (const s of [-1, 1]) {
    body.add(box(0.14, 0.14, 2.6, wood2, s * 0.6, 0.1, 0));
    body.add(box(0.12, 2.2, 0.14, wood, s * 0.45, 1.1, 0.2, 0, s * 0.08));
    body.add(box(0.1, 1.9, 0.1, wood2, s * 0.5, 0.9, -0.55, -0.45, s * 0.05));
  }
  for (const z of [-1.1, 1.1]) body.add(box(1.34, 0.12, 0.14, wood2, 0, 0.12, z));
  body.add(box(1.05, 0.12, 0.12, wood, 0, 2.15, 0.2));
  // the throwing beam pivots on the axle: short arm forward with the pulling ropes, long arm back with the sling
  const beam = new THREE.Group(); beam.position.set(0, 2.15, 0.2); body.add(beam);
  beam.add(box(0.1, 0.1, 3.4, wood, 0, 0, -0.75));
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 3).translate(0, -0.7, 0), rope); r.position.set(-0.15 + i * 0.1, 0, 0.9); beam.add(r); }
  const sling = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.8, 3).translate(0, -0.4, 0), rope); sling.position.set(0, 0, -2.4); beam.add(sling);
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.9 })); stone.position.set(0, -0.8, -2.4); beam.add(stone);
  beam.rotation.x = -0.55; // at rest the long arm is down behind
  g.userData.beam = beam; g.userData.stone = stone; g.userData.body = body;
  g.userData.anim = { update(st, t, dt) {
    // the beam whips over when it looses, then is hauled back down
    const k = st.fireT ?? 9;
    beam.rotation.x = k < 0.25 ? -0.55 + (k / 0.25) * 1.9 : k < 2.2 ? 1.35 - Math.min(1, (k - 0.25) / 1.9) * 1.9 : -0.55;
    stone.visible = k > 1.6;
    if (st.dead) { body.rotation.z = Math.min(0.45, (st.deadT || 0) * 0.8); body.position.y = -Math.min(0.4, (st.deadT || 0) * 0.3); }
    // raised plank by plank while the engineer works (st.build 0..1)
    const b = st.build ?? 1; body.scale.set(1, Math.max(0.05, b), 1);
  } };
  return g;
}

// ------------------------------------------------------------------ the horseman
const COATS = [[0x4a3020, 0x5a1a14], [0x2a2420, 0x1e3a6a], [0x8a8070, 0x5a1a14], [0x5a3a24, 0x2a2a2a]];
export function horseRider(look) {
  const g = new THREE.Group(), [coat, cloth] = COATS[Math.floor(Math.random() * COATS.length)];
  const c = horse(coat, cloth);
  c.rotation.y = -Math.PI / 2; g.add(c); // the horse model faces +X; the group faces +Z like everyone else
  const rider = humanoid(look);
  rider.rotation.y = Math.PI / 2; rider.position.set(0.02, -0.66, 0); // in the saddle (the hero's seat in mount.js)
  c.userData.parts.body.add(rider);
  const cst = { phase: 0, walkBlend: 0, seed: Math.random() * 9, speedK: 1 };
  const ra = rider.userData.anim;
  g.userData.rider = rider; g.userData.camel = c; g.userData.cst = cst;
  g.userData.anim = { update(st, t, dt) {
    cst.walkBlend = st.walkBlend; cst.phase = st.phase * 0.62; cst.speedK = 1 + st.walkBlend * 0.9;
    animateHorse(c, cst, t);
    st.mounted = !st.thrown; if (rider.visible) ra.update(st, t, dt);
  } };
  return g;
}

export const TYPES20 = {
  crossbow: {
    name: 'Solenarion Archer', hp: 26, dmg: 14, speed: 3.6, range: 18, atk: 2.8, xp: 20, radius: 0.5, action: 'aimXbow', ranged: 'bolt', hold: [9, 17],
    build: (x) => humanoid(byzify({ ...LOOK.solen(), ...x })),
  },
  engineer: {
    name: 'Mechanikos', hp: 32, dmg: 7, speed: 4.4, range: 1.9, atk: 1.3, xp: 22, radius: 0.5, action: 'attack',
    build: (x) => humanoid(byzify({ ...LOOK.mechanikos(), ...x })),
    ai: engineerAI,
  },
  mangonel: {
    name: 'Mangonel', hp: 70, dmg: 16, speed: 0, range: 30, atk: 4.6, xp: 18, radius: 1.3, action: null, static: true,
    build: () => mangonel(), ai: mangonelAI,
  },
  rider: {
    name: 'Kataphraktos', hp: 44, dmg: 11, speed: 8.2, range: 2.6, atk: 1.2, xp: 30, radius: 1.0, action: 'thrust',
    build: (x) => horseRider(byzify({ ...LOOK.kataphraktos(), ...x })),
    ai: riderAI,
  },
};

// ------------------------------------------------------------------ behaviours (return 'skip' when fully handled)
function engineerAI(g, e, dt, dist) {
  if (!e.alerted || e.engineDone || g.player.dead) return;
  const p = g.player.pos;
  if (!e.buildAt) {
    // open ground 12-16 m from the hero, on this side of him, with a clear line to him
    for (let i = 0; i < 16 && !e.buildAt; i++) {
      const a = Math.atan2(e.pos.x - p.x, e.pos.z - p.z) + (Math.random() - 0.5) * (i < 8 ? 1.6 : 4), r = 12 + Math.random() * 4;
      const x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r;
      if (navClear(x, z, p.x, p.z) && (i >= 8 || navClear(e.pos.x, e.pos.z, x, z))) e.buildAt = V(x, heightAt(x, z), z);
    }
    if (!e.buildAt) e.buildAt = e.pos.clone(); // nowhere better: he builds where he stands
  }
  const d = Math.hypot(e.buildAt.x - e.pos.x, e.buildAt.z - e.pos.z);
  if (d > 0.8 && !e.building) {
    const dir = tmp.set(e.buildAt.x - e.pos.x, 0, e.buildAt.z - e.pos.z).normalize();
    e.pos.addScaledVector(dir, e.speed * 1.1 * dt); e.facing += angDiff(e.facing, Math.atan2(dir.x, dir.z)) * Math.min(1, dt * 8);
    e.pos.y = heightAt(e.pos.x, e.pos.z); e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend, 1, Math.min(1, dt * 8)); e.st.phase += dt * e.speed * 1.6;
    e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist);
    return 'skip';
  }
  if (!e.building) {
    // the engine goes up beside him, facing the hero
    e.building = 0;
    const ex = e.pos.x + Math.cos(e.facing) * 1.8, ez = e.pos.z - Math.sin(e.facing) * 1.8;
    const m = g.spawnPack('mangonel', ex, ez, 1, e.level, { spread: 0 })[0];
    m.pos.set(ex, heightAt(ex, ez), ez); m.facing = Math.atan2(p.x - ex, p.z - ez); m.alerted = true; m.st.build = 0.05; m.atkCd = 3; m.crew = e; e.engine = m;
    if (!g.engineWarned) { g.engineWarned = true; g.ui.toast('An engineer is raising a mangonel: break it'); }
  }
  e.building += dt / 3.2;
  e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend, 0, Math.min(1, dt * 8));
  if (!e.st.action) { e.st.action = 'chop'; e.st.actionT = 0; }
  e.st.actionT += dt * 1.6; if (e.st.actionT >= 1) { e.st.action = null; g.audio.at(e.pos, () => g.audio.hit?.(0.3)); }
  if (e.engine && !e.engine.dead) { e.engine.st.build = Math.min(1, e.building); e.facing += angDiff(e.facing, Math.atan2(e.engine.pos.x - e.pos.x, e.engine.pos.z - e.pos.z)) * Math.min(1, dt * 6); }
  if (e.building >= 1 || !e.engine || e.engine.dead) { e.engineDone = true; e.st.action = null; }
  e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist);
  return 'skip';
}

function mangonelAI(g, e, dt, dist) {
  const p = g.player;
  e.st.fireT = (e.st.fireT ?? 9) + dt;
  if ((e.st.build ?? 1) >= 1 && e.alerted && !p.dead && dist < 34) {
    e.facing += angDiff(e.facing, Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z)) * Math.min(1, dt * 0.8);
    if (e.atkCd <= 0) {
      e.atkCd = e.T.atk * (0.9 + Math.random() * 0.3); e.st.fireT = 0;
      const from = tmp.copy(e.pos).setY(e.pos.y + 4.2).addScaledVector(V(Math.sin(e.facing), 0, Math.cos(e.facing)), 0.8).clone();
      const q = p.pos.clone().addScaledVector(p.vel || V(0, 0, 0), 0.6); q.y = heightAt(q.x, q.z);
      g.lobStone(from, q, e.dmg, 1.6, 2.3);
      g.audio.at(e.pos, () => g.audio.boom?.());
    }
  }
  e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; e.rig.userData.anim.update(e.st, g.t, dt);
  return 'skip';
}

function riderAI(g, e, dt, dist) {
  const p = g.player;
  // thrown: badly wounded, the horseman is pitched off and fights on foot; the horse bolts
  if (!e.st.thrown && e.hp < e.maxHp * 0.5 && !e.dead) {
    e.st.thrown = true;
    const side = V(Math.cos(e.facing), 0, -Math.sin(e.facing));
    const foot = g.spawnPack('bandit', e.pos.x + side.x * 1.4, e.pos.z + side.z * 1.4, 1, e.level, { spread: 0, name: 'Unhorsed Kataphraktos' })[0];
    foot.hp = foot.maxHp = Math.max(8, Math.round(e.hp * 0.9)); foot.alerted = true; foot.staggerT = 1.2; foot.riseT = 0;
    e.rig.userData.rider.visible = false; e.dead = true; e.fleeing = true; e.deadT = 0; e.st.dead = false; e.xp = 0;
    g.fx.dust(e.pos, 16, 1.4); g.audio.at(e.pos, () => g.audio.grunt?.());
    return 'skip';
  }
  if (!e.alerted || p.dead) return;
  e.passT = (e.passT || 0) - dt; e.wheelT = (e.wheelT || 0) - dt;
  let sp = 0;
  if (e.wheelT > 0) {
    // wheeling round for the next pass
    e.facing += angDiff(e.facing, Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z)) * Math.min(1, dt * 2.4); sp = e.speed * 0.35;
  } else if (e.passT > 0) {
    sp = e.speed;
    if (!e.swung && dist < 2.8) {
      e.swung = true; e.st.action = 'thrust'; e.st.actionT = 0;
      g.damagePlayer(e.dmg, e.pos, e); g.audio.at(e.pos, () => g.audio.swing?.());
    }
  } else {
    // line up a charge through where the hero will be, and carry on past him
    const lead = p.pos.clone().addScaledVector(p.vel || V(0, 0, 0), Math.min(1, dist / e.speed));
    e.facing = Math.atan2(lead.x - e.pos.x, lead.z - e.pos.z);
    e.passT = dist / e.speed + 0.9; e.swung = false; e.wheelT = 0; sp = e.speed;
    if (dist < 3) { e.passT = 0; e.wheelT = 1.0; }
  }
  if (e.passT <= 0 && e.passT + dt > 0) e.wheelT = 1.2;
  if (e.st.action) { e.st.actionT += dt * 2.2; if (e.st.actionT >= 1) e.st.action = null; }
  const dir = V(Math.sin(e.facing), 0, Math.cos(e.facing));
  const nx = e.pos.x + dir.x * sp * dt, nz = e.pos.z + dir.z * sp * dt;
  if (navClear(e.pos.x, e.pos.z, nx, nz)) { e.pos.x = nx; e.pos.z = nz; } else { e.passT = 0; e.wheelT = 0.8; }
  e.pos.y = heightAt(e.pos.x, e.pos.z);
  e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend, Math.min(1, sp / 4), Math.min(1, dt * 6)); e.st.phase += dt * sp * 1.1;
  e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist);
  return 'skip';
}

// a riderless horse runs off and is gone
export function fleeTick(g, e, dt) {
  const p = g.player.pos, away = tmp.set(e.pos.x - p.x, 0, e.pos.z - p.z); if (away.lengthSq() < 1e-4) away.set(1, 0, 0); away.normalize();
  e.facing += angDiff(e.facing, Math.atan2(away.x, away.z)) * Math.min(1, dt * 3);
  e.pos.x += Math.sin(e.facing) * 7 * dt; e.pos.z += Math.cos(e.facing) * 7 * dt; e.pos.y = heightAt(e.pos.x, e.pos.z);
  e.st.walkBlend = 1; e.st.phase += dt * 9;
  e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing;
}
