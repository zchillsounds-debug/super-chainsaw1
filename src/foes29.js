import * as THREE from 'three';
import { humanoid } from './characters.js';
import { LOOK, byzify } from './byz.js';
import { heightAt } from './terrain.js';
import { navClear } from './nav.js';
import { resolve, lineClear } from './collision.js';
import { t } from './i18n.js';

// Round 29: four new kinds of Byzantine troop.
//   akontistes: a javelin skirmisher. He keeps 7-11 m off, throws a javelin at where Salim is about to be (a short lead),
//               then backs away. Standing still is what he wants; keep moving across his line.
//   kontaratos: a heavy spearman with a long kontarion. When Salim is in front of him he braces: a marked wedge of ground
//               for 1.4 s. Walking into it is a hard blow, dashing into it is a skewering. Get round him, or let the
//               brace pass (he is slow to recover from it and takes more damage then).
//   tribolos:   a caltrop man. He keeps behind his men and throws caltrops onto where Salim is going: a marked patch,
//               then iron points for 9 s that slow and cut.
//   deputatos:  a field surgeon. He runs to a badly hurt man, pulls him back out of the fight and binds his wounds
//               (healing him once). A blow breaks off the binding. Cut him down first.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const BRACE_R = 4.8, BRACE_A = 0.62; // the kontaratos' wedge: reach and half-angle
const PATCH_R = 1.7;

export const TYPES29 = {
  akontistes: {
    name: 'Akontistes', hp: 30, dmg: 10, speed: 4.6, range: 12, atk: 2.6, xp: 26, radius: 0.45, action: 'javelin',
    build: (x) => humanoid(byzify({ ...LOOK.psilos(), weapon: 'spear', offhand: 'shield', shieldKind: 'round', armour: 'leather', leather: 0x6a4a2a, ...x })),
    ai: akonAI,
  },
  kontaratos: {
    name: 'Kontaratos', hp: 62, dmg: 13, speed: 3.2, range: 2.6, atk: 1.9, xp: 34, radius: 0.55, action: 'attack',
    build: (x) => humanoid(byzify({ ...LOOK.menavlatos(), cloak: 0x2e3a4a, crest: 'plume', build: 1.16, ...x })),
    ai: kontAI,
  },
  tribolos: {
    name: 'Caltrop Thrower', hp: 34, dmg: 6, speed: 4.0, range: 1.7, atk: 1.3, xp: 26, radius: 0.45, action: 'attack',
    build: (x) => humanoid(byzify({ ...LOOK.trapezites(), weapon: 'dagger', hunch: 0.15, sash: 0x6a4a1a, ...x })),
    ai: triboAI,
  },
  deputatos: {
    name: 'Deputatos', hp: 32, dmg: 5, speed: 4.6, range: 1.6, atk: 1.4, xp: 30, radius: 0.45, action: 'attack',
    build: (x) => humanoid(byzify({ ...LOOK.psilos(), robe: '#c8bc9c', robe2: '#5a4a34', offhand: null, shieldKind: null, weapon: 'dagger', armour: null, sash: 0xd8ccb0, pilos: null, ...x })),
    ai: depAI,
  },
};

// shared: step toward (or away from) a point, on the nav grid, then settle the rig
function stepTo(g, e, want, k, dt) {
  const dx = want.x - e.pos.x, dz = want.z - e.pos.z, d = Math.hypot(dx, dz);
  if (d < 0.2) return false;
  const sp = e.speed * k * (e.slowT > 0 ? 1 - e.slowK : 1) * (e.rallyT > 0 ? 1.25 : 1), nx = e.pos.x + dx / d * sp * dt, nz = e.pos.z + dz / d * sp * dt;
  if (!navClear(e.pos.x, e.pos.z, nx, nz)) return false;
  e.pos.x = nx; e.pos.z = nz; return true;
}
function settle(g, e, dt, dist, moving, face) {
  if (face != null) e.facing += angDiff(e.facing, face) * Math.min(1, dt * 7);
  resolve(e.pos, e.radius); e.pos.y = heightAt(e.pos.x, e.pos.z);
  e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend, moving ? 1 : 0, Math.min(1, dt * 8)); e.st.phase += dt * (moving ? e.speed * 1.2 : 0);
  e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist);
  return 'skip';
}
// the base AI handles idling, alerting, reeling and the knock-back; ours runs once he is up and alerted
const ours = (g, e) => e.alerted && !g.player.dead && !(e.staggerT > 0) && !e.hidden && e.riseT >= 1;

// ------------------------------------------------------------------ the javelin man
function akonAI(g, e, dt, dist) {
  if (!ours(g, e)) return;
  if (!g.akonWarned && dist < 20) { g.akonWarned = true; g.ui.toast(t('Javelin men: keep moving across their line')); }
  const p = g.player.pos, face = Math.atan2(p.x - e.pos.x, p.z - e.pos.z);
  if (e.st.action === 'javelin') {
    e.st.actionT += dt / 0.9;
    if (!e.didHit && e.st.actionT > 0.55) { e.didHit = true; throwJavelin(g, e); e.backT = 1.1; }
    if (e.st.actionT >= 1) e.st.action = null;
    return settle(g, e, dt, dist, false, face);
  }
  // after a throw he backs off; otherwise he keeps 7-11 m, sidling round Salim
  let want = null, k = 1;
  e.backT = Math.max(0, (e.backT || 0) - dt);
  if (e.backT > 0 || dist < 6.5) { tmp.copy(e.pos).sub(p).setY(0).normalize(); want = tmp2.set(e.pos.x + tmp.x * 3, 0, e.pos.z + tmp.z * 3); k = 0.85; }
  else if (dist > 11.5 || !lineClear(e.pos.x, e.pos.z, p.x, p.z)) want = p;
  else { e.side ||= Math.random() < 0.5 ? 1 : -1; const a = face + Math.PI + e.side * 0.5; want = tmp2.set(p.x + Math.sin(a) * 9, 0, p.z + Math.cos(a) * 9); k = 0.5; }
  const moving = stepTo(g, e, want, k, dt);
  if (!moving && e.backT > 0) e.side = -(e.side || 1);
  if (e.atkCd <= 0 && dist < 13 && dist > 4 && lineClear(e.pos.x, e.pos.z, p.x, p.z)) {
    e.st.action = 'javelin'; e.st.actionT = 0; e.didHit = false; e.atkCd = e.T.atk * (0.85 + Math.random() * 0.4); g.telegraphTell?.(e);
  }
  return settle(g, e, dt, dist, moving, face);
}
function throwJavelin(g, e) {
  const P = g.player, from = e.pos.clone(); from.y += 1.9;
  const to = P.pos.clone(); if (P.vel) to.addScaledVector(tmp.set(P.vel.x, 0, P.vel.z), 0.35); // a short lead: he throws where Salim is about to be
  to.y = heightAt(to.x, to.z) + 1.0;
  const flat = Math.hypot(to.x - from.x, to.z - from.z), sp = 19, T = Math.max(0.2, flat / sp), grav = 7;
  const vel = V((to.x - from.x) / T, (to.y - from.y) / T + 0.5 * grav * T, (to.z - from.z) / T);
  const m = new THREE.Mesh(g.arrowGeo, g.arrowMat); m.scale.set(1.5, 1.5, 2.6);
  m.position.copy(from); m.lookAt(from.clone().add(vel)); g.scene.add(m);
  g.projectiles.push({ mesh: m, vel, grav, life: T + 0.6, owner: 'enemy', kind: 'arrow', dmg: e.dmg, jav: true, bolt: true });
  g.audio.at?.(e.pos, () => g.audio.whoosh?.());
}

// ------------------------------------------------------------------ the braced spearman
function kontAI(g, e, dt, dist) {
  const W = e.wedge;
  if (!ours(g, e)) { if (W) W.visible = false; e.braceT = 0; return; }
  if (!g.kontWarned && dist < 16) { g.kontWarned = true; g.ui.toast(t('A braced spear: never dash into its point. Go round, or wait it out')); }
  const P = g.player, p = P.pos, face = Math.atan2(p.x - e.pos.x, p.z - e.pos.z);
  // after the brace: slow to lift the spear again (open: he takes more from every blow then)
  if (e.recoverT > 0) { e.recoverT -= dt; e.st.action = null; e.st.crouch = Math.min(0.5, Math.max(0, e.recoverT) * 0.5); return settle(g, e, dt, dist, false, null); }
  if (e.braceT > 0) {
    e.braceT -= dt; const k = 1 - e.braceT / 1.4;
    e.st.action = 'brace'; e.st.actionT = Math.min(0.5, k);
    const w = wedgeMesh(g, e); w.visible = true; w.position.set(e.pos.x, e.pos.y + 0.08, e.pos.z); w.rotation.y = e.braceDir;
    w.material.opacity = 0.25 + 0.45 * Math.min(1, k * 2) * (0.8 + 0.2 * Math.sin(g.t * 26));
    // inside the wedge? walking in is a hard blow, an evade or a dash into it is a skewering (the evade does not save you)
    const dx = p.x - e.pos.x, dz = p.z - e.pos.z, d = Math.hypot(dx, dz), a = Math.abs(angDiff(e.braceDir, Math.atan2(dx, dz)));
    if (!e.braceHit && k > 0.25 && d < BRACE_R && a < BRACE_A) {
      e.braceHit = true; const dash = P.rollT > 0 || P.dashT > 0;
      if (dash) P.invuln = 0;
      g.damagePlayer(e.dmg * (dash ? 2.4 : 1.4), e.pos, null);
      P.knock = (P.knock || V(0, 0, 0)).addScaledVector(tmp.set(dx, 0, dz).normalize(), dash ? 14 : 9);
      g.ui.damageNumber?.(p, t(dash ? 'Skewered!' : 'Braced!'), 'stagger'); g.shake = Math.max(g.shake || 0, dash ? 0.5 : 0.3); g.audio.at?.(e.pos, () => g.audio.clang?.());
    }
    if (e.braceT <= 0) { w.visible = false; e.st.action = null; e.recoverT = 1.1; e.atkCd = 1.6; e.openT = 1.8; }
    return settle(g, e, dt, dist, false, null);
  }
  // close and in front: brace (not too often); otherwise the base AI walks him in and thrusts
  if (!e.st.action && dist < 7.5 && dist > 2.2 && (e.braceCd = (e.braceCd ?? 1.5) - dt) <= 0 && Math.abs(angDiff(e.facing, face)) < 0.6) {
    e.braceT = 1.4; e.braceDir = face; e.braceHit = false; e.braceCd = 4.5 + Math.random() * 2; g.telegraphTell?.(e); g.audio.at?.(e.pos, () => g.audio.grunt?.());
    return settle(g, e, dt, dist, false, null);
  }
}
function wedgeMesh(g, e) {
  if (e.wedge) return e.wedge;
  const geo = new THREE.CircleGeometry(BRACE_R, 20, Math.PI / 2 - BRACE_A, BRACE_A * 2).rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.22, 0.05), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  m.renderOrder = 3; g.scene.add(m); e.wedge = m; (g.marks29 ||= new Set()).add(e); return m;
}

// ------------------------------------------------------------------ the caltrop thrower
function triboAI(g, e, dt, dist) {
  if (!ours(g, e)) return;
  if (!g.triboWarned && dist < 18) { g.triboWarned = true; g.ui.toast(t('Caltrops: step off the iron points')); }
  const p = g.player.pos, face = Math.atan2(p.x - e.pos.x, p.z - e.pos.z);
  if (e.st.action === 'throw') {
    e.st.actionT += dt / 0.8;
    if (!e.didHit && e.st.actionT > 0.5) { e.didHit = true; const P = g.player, q = P.pos.clone(); if (P.vel) q.addScaledVector(tmp.set(P.vel.x, 0, P.vel.z), 0.6); q.y = heightAt(q.x, q.z);
      g.telegraph(q, PATCH_R, 0.7, () => { if (!e.dead) g.caltrops29(q, e); }); g.audio.at?.(e.pos, () => g.audio.whoosh?.()); }
    if (e.st.actionT >= 1) e.st.action = null;
    return settle(g, e, dt, dist, false, face);
  }
  // with men about he keeps 6-9 m back; alone he closes and fights with his knife (the base AI)
  const near = g.enemies.some((o) => o !== e && !o.dead && !o.T.ranged && !o.boss && o.alerted && o.pos.distanceToSquared(e.pos) < 160);
  if (e.atkCd <= 0 && dist < 13 && dist > 3 && lineClear(e.pos.x, e.pos.z, p.x, p.z)) {
    e.st.action = 'throw'; e.st.actionT = 0; e.didHit = false; e.atkCd = 5.5 + Math.random() * 1.5;
    return settle(g, e, dt, dist, false, face);
  }
  if (!near || e.st.action) return;
  let want = null;
  if (dist < 6) { tmp.copy(e.pos).sub(p).setY(0).normalize(); want = tmp2.set(e.pos.x + tmp.x * 3, 0, e.pos.z + tmp.z * 3); }
  else if (dist > 9.5) want = p;
  const moving = want ? stepTo(g, e, want, 0.85, dt) : false;
  return settle(g, e, dt, dist, moving, face);
}

// ------------------------------------------------------------------ the field surgeon
function depAI(g, e, dt, dist) {
  const R = e.ring;
  if (!ours(g, e)) { if (R) R.visible = false; if (e.tending) breakOff(e); return; }
  if (!g.depWarned && dist < 20) { g.depWarned = true; g.ui.toast(t('A field surgeon binds their wounded: cut him down first')); g.bark?.('Salim', 'The surgeon. Him first, or they get up again.'); }
  const p = g.player.pos;
  // binding a man: kneel beside him; he heals at the end unless the binding is broken
  if (e.tending) {
    const m = e.tending;
    if (m.dead) { breakOff(e); return settle(g, e, dt, dist, false, null); }
    e.tendT += dt; e.st.action = 'tend'; e.st.actionT = 0.5; m.staggerT = Math.max(m.staggerT || 0, 0.1); m.st.crouch = 0.7;
    const r = ringMesh(g, e); r.visible = true; r.position.set(m.pos.x, m.pos.y + 0.09, m.pos.z); r.material.opacity = 0.25 + 0.35 * (e.tendT / 2.2);
    r.scale.setScalar(1.4 - 0.5 * Math.min(1, e.tendT / 2.2));
    if (e.tendT >= 2.2) {
      const add = Math.round(m.maxHp * 0.45); m.hp = Math.min(m.maxHp, m.hp + add); m.patched = true; m.st.crouch = 0;
      g.ui.damageNumber?.(m.pos, '+' + add, 'heal'); g.fx.burst(tmp.copy(m.pos).setY(m.pos.y + 1.2), 14, { speed: 1.4, life: 0.8, size: 0.14, size1: 0.02, color: new THREE.Color(2.2, 2.0, 1.4), up: 1.2 });
      breakOff(e); e.atkCd = 1;
    }
    return settle(g, e, dt, dist, false, Math.atan2(m.pos.x - e.pos.x, m.pos.z - e.pos.z));
  }
  // dragging a man back out of the fight, 3 m away from Salim, before binding him
  if (e.dragging) {
    const m = e.dragging; e.dragT += dt;
    if (m.dead) { breakOff(e); return settle(g, e, dt, dist, false, null); }
    tmp.copy(m.pos).sub(p).setY(0).normalize();
    const nx = m.pos.x + tmp.x * 2.6 * dt, nz = m.pos.z + tmp.z * 2.6 * dt;
    if (navClear(m.pos.x, m.pos.z, nx, nz)) { m.pos.x = nx; m.pos.z = nz; m.pos.y = heightAt(nx, nz); m.rig.position.copy(m.pos); }
    m.staggerT = Math.max(m.staggerT || 0, 0.15); m.st.crouch = 0.5;
    e.pos.set(m.pos.x + tmp.x * 0.9, 0, m.pos.z + tmp.z * 0.9);
    if (e.dragT > 1.2) { e.dragging = null; e.tending = m; e.tendT = 0; }
    return settle(g, e, dt, dist, true, Math.atan2(m.pos.x - e.pos.x, m.pos.z - e.pos.z));
  }
  // the worst hurt man within 16 m who has not been bound yet
  let best = null, bk = 0.5;
  for (const o of g.enemies) {
    if (o === e || o.dead || o.boss || o.patched || o.T.static || o.type === 'deputatos' || o.wall || o.type === 'hippo' || o.hidden) continue;
    const k = o.hp / o.maxHp; if (k < bk && o.pos.distanceToSquared(e.pos) < 256) { bk = k; best = o; }
  }
  if (best) {
    const d = best.pos.distanceTo(e.pos);
    if (d < 1.3) { e.dragging = best; e.dragT = 0; best.st.action = null; return settle(g, e, dt, dist, false, null); }
    const moving = stepTo(g, e, best.pos, 1.1, dt);
    if (moving) return settle(g, e, dt, dist, true, Math.atan2(best.pos.x - e.pos.x, best.pos.z - e.pos.z));
  }
  // nobody to bind: keep 7-10 m back while his men fight, or fight himself when alone
  const near = g.enemies.some((o) => o !== e && !o.dead && !o.boss && o.alerted && o.pos.distanceToSquared(e.pos) < 196);
  if (!near || e.st.action) return;
  let want = null;
  if (dist < 7) { tmp.copy(e.pos).sub(p).setY(0).normalize(); want = tmp2.set(e.pos.x + tmp.x * 3, 0, e.pos.z + tmp.z * 3); }
  else if (dist > 10.5) want = p;
  const moving = want ? stepTo(g, e, want, 0.8, dt) : false;
  return settle(g, e, dt, dist, moving, Math.atan2(p.x - e.pos.x, p.z - e.pos.z));
}
function breakOff(e) {
  for (const m of [e.tending, e.dragging]) if (m && !m.dead) m.st.crouch = 0;
  e.tending = e.dragging = null; e.st.action = null; if (e.ring) e.ring.visible = false;
}
function ringMesh(g, e) {
  if (e.ring) return e.ring;
  const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.0, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 0.8), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.renderOrder = 3; g.scene.add(m); e.ring = m; (g.marks29 ||= new Set()).add(e); return m;
}

// ------------------------------------------------------------------ caltrop patches (pooled) and wiring (set up from main.js)
function caltropPatch() {
  // a scatter of four-pointed iron caltrops over a faint dark disc; one merged mesh
  const pts = [], tet = new THREE.TetrahedronGeometry(0.12);
  const base = new THREE.Mesh(new THREE.CircleGeometry(PATCH_R, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1a1410, transparent: true, opacity: 0, depthWrite: false }));
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (PATCH_R - 0.15);
    pts.push(tet.clone().rotateX(Math.random() * 6).rotateY(Math.random() * 6).translate(Math.cos(a) * r, 0.05, Math.sin(a) * r));
  }
  const geo = mergeAll(pts);
  const iron = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x8a8278, metalness: 0.6, roughness: 0.35, emissive: 0x2a1a10 }));
  const rim = new THREE.Mesh(new THREE.RingGeometry(PATCH_R - 0.08, PATCH_R, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.35, 0.1), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  rim.position.y = 0.03;
  const grp = new THREE.Group(); grp.add(base, iron, rim); grp.visible = false; grp.userData = { base, iron, rim };
  return grp;
}
function mergeAll(list) {
  // a small merge (non-indexed positions and normals) so a patch is one draw
  let n = 0; const flat = list.map((gq) => gq.index ? gq.toNonIndexed() : gq); for (const gq of flat) n += gq.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const gq of flat) { pos.set(gq.attributes.position.array, o * 3); nor.set(gq.attributes.normal.array, o * 3); o += gq.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return out;
}

export function setupFoes29(g) {
  const pool = [];
  for (let i = 0; i < 4; i++) { const m = caltropPatch(); g.scene.add(m); pool.push({ m, life: 0, at: V(0, 0, 0), tick: 0 }); }
  g.caltrops29 = (at, owner) => {
    const z = pool.find((q) => q.life <= 0) || pool.reduce((a, b) => (a.life < b.life ? a : b));
    z.life = 9; z.at.copy(at); z.tick = 0; z.dmg = Math.max(2, Math.round((owner?.dmg || 6) * 0.35));
    z.m.position.set(at.x, heightAt(at.x, at.z) + 0.02, at.z); z.m.rotation.y = Math.random() * 6; z.m.visible = true;
    g.fx.dust(at, 10, 1.2); g.audio.at?.(at, () => g.audio.clang?.());
  };
  g.caltropsClear29 = () => { for (const z of pool) { z.life = 0; z.m.visible = false; } };
  const prev = g.tickExtra;
  g.tickExtra = (dt) => {
    prev?.(dt);
    const P = g.player;
    for (const z of pool) {
      if (z.life <= 0) continue; z.life -= dt;
      const f = Math.min(1, z.life / 0.8); z.m.userData.base.material.opacity = 0.55 * f; z.m.userData.rim.material.opacity = 0.5 * f;
      if (z.life <= 0) { z.m.visible = false; continue; }
      if (P.dead || g.cinematic) continue;
      if (Math.hypot(P.pos.x - z.at.x, P.pos.z - z.at.z) < PATCH_R && !(P.rollT > 0)) {
        g.hazSlowK = Math.min(g.hazSlowK ?? 1, 0.5);
        if ((z.tick -= dt) <= 0) { z.tick = 0.5; g.damagePlayer(z.dmg, z.at); }
      }
    }
    // a wedge or binding ring whose man is gone, dead or done is put away (a removed man never runs his AI again)
    if (g.marks29) for (const e of g.marks29) {
      const gone = e.dead || !g.enemies.includes(e);
      if (e.wedge && (gone || !(e.braceT > 0))) e.wedge.visible = false;
      if (e.ring && (gone || !e.tending)) e.ring.visible = false;
      if (gone) g.marks29.delete(e);
    }
    // javelins fly nose-first along their arc and stop in the ground
    for (let i = g.projectiles.length - 1; i >= 0; i--) {
      const q = g.projectiles[i]; if (!q.jav) continue;
      const mp = q.mesh.position; q.mesh.lookAt(tmp.copy(mp).add(q.vel));
      if (mp.y < heightAt(mp.x, mp.z) + 0.05) { g.fx.dust(mp, 4, 0.6); g.scene.remove(q.mesh); g.projectiles.splice(i, 1); }
    }
  };
  // the kontaratos is open while he lifts his spear again; a bound man stands up from the binding
  const de = g.damageEnemy.bind(g);
  g.damageEnemy = (e, dmg, ...rest) => {
    if (e?.type === 'kontaratos' && e.recoverT > 0) dmg *= 1.35;
    if (e?.type === 'deputatos' && (e.tending || e.dragging) && dmg > 0) { breakOff(e); g.ui.damageNumber?.(e.pos, t('Interrupted'), 'stagger'); }
    return de(e, dmg, ...rest);
  };
  const ke = g.killEnemy.bind(g);
  g.killEnemy = (e, src) => {
    if (e?.type === 'deputatos') breakOff(e);
    if (e?.wedge) e.wedge.visible = false;
    return ke(e, src);
  };
}
