import * as THREE from 'three';
import { humanoid } from './characters.js';
import { TYPES } from './entities.js';
import { heightAt, SITES } from './terrain.js';
import { navClear } from './nav.js';
import { resolve } from './collision.js';
import { REGION, IS_SAWAD, IS_MARSH, IS_KARKH, IS_DOCKS } from './region.js';
import { freeSpot } from './sidequests.js';
import { saveGame } from './save.js';
import { makeItem } from './items.js';
import * as SCENES from './scenes.js';
import { t } from './i18n.js';
import { byzify } from './byz.js';

// Round 21: the rival, and two lieutenants with fights of their own.
//
// Tatzates (Round 23; was Zubayr) is the Armenian bowman in Byzantine pay who loosed the arrow that killed Jabir on
// the dune. He works for whoever pays: Bardanes, then Kallinikos, then Arsaber himself. He waits on Salim's road three times (Acts II, IV and VI) with a
// few of his men, fights at range, and slips away in smoke when he is down to a third of his life. The last time he
// says where he is going: the Hamrin hills, where his hold is the deepest of the endgame dungeons (hamrin.js).
//   His kit: a fan of arrows; a marked shot (he kneels, a red line runs to Salim, then a heavy arrow that shoves);
//   a leap back with a smoke pot when Salim closes on him; a kick if he is cornered.
// Olbianos, the Teacher's old student who sold out (Act II; was Hisham), throws a hooked chain (the kind that drags bricks out of a kiln):
//   a red line shows its path, and if it catches Salim he is hauled in and Olbianos brings his spear down on him.
//   An evade through the throw, or as the blow falls, slips it.
// Kalokyros, who holds the vaults under the paper-sellers' lane (Act V; was Layth), fights in smoke: he breaks a pot at his feet, is gone, and
//   steps out behind Salim; his blade glints a moment before the cut, and an evade then turns it aside.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const rand = (a, b) => a + Math.random() * (b - a);

// ------------------------------------------------------------------ Tatzates (the type key stays 'zubayr')
// an Armenian of the frontier: long hair under a felt cap, a dark coat and cloak, a hunting bow
const ZLOOK = { robe: '#1e2430', robe2: '#8a2a1a', qaba: true, turban: null, pilos: 0x3a3028, beard: 0x1a120c, beardLen: 0.45, beardStyle: 'trim', hair: 'long', keepHair: true, skin: 0xa8724a, weapon: 'bow', sash: 0x8a2a1a, armour: 'leather', leather: 0x2a1a14, cloak: 0x1a1a22, detail: 'hi', build: 1.02 };
TYPES.zubayr = {
  name: 'Tatzates', hp: 70, dmg: 9, speed: 5.4, range: 16, atk: 1.7, xp: 40, radius: 0.5, action: 'shoot', ranged: 'arrow', hold: [8, 14],
  build: (x) => humanoid(byzify({ ...ZLOOK, ...x })), ai: zubayrAI,
};
// where he waits on each road, and what he says (one sentence each: no villain speech runs longer)
export const RIVAL = {
  sawad: { act: 2, at: [-22, -14], level: 4, men: ['archer', 'archer', 'bandit', 'bandit'],
    intro: [['Tatzates', 'So the brother lived. I was paid for one arrow, not two.'], ['Salim', 'You loosed it?'], ['Tatzates', 'Bardanes paid. I shot. That is all it was.']],
    escape: 'Not today, guard. The envoy\'s silver does not cover this.' },
  marsh: { act: 4, at: [-16, -40], level: 9, men: ['slinger', 'archer', 'netter', 'reedman'],
    intro: [['Tatzates', 'Kallinikos pays better than Bardanes did.'], ['Salim', 'Then he wasted his silver.']],
    escape: 'The reeds will hide me. They hide everyone.' },
  docks: { act: 6, at: [14, 4], level: 15, men: ['crossbow', 'archer', 'guard', 'guard'],
    intro: [['Tatzates', 'One more job, and I go north with the envoy.'], ['Salim', 'Then I will follow you north.']],
    escape: 'If you want me, look for me in the Hamrin hills.' },
};

function zubayrAI(g, e, dt, dist) {
  const p = g.player;
  if (!e.alerted || p.dead) return; // idle: the default wander
  e.barOn = dist < 30; if (e.barOn) g.ui.bossBar(e.name, e.hp / e.maxHp);
  e.volleyCd = (e.volleyCd ?? 2.5) - dt; e.markCd = (e.markCd ?? 5) - dt; e.leapCd = (e.leapCd ?? 0) - dt; e.kickCd = (e.kickCd ?? 0) - dt;
  const face = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
  let moving = false;
  // the escape: a third of his life gone, and he is away in smoke (the scene plays from rivals' tick)
  if (!e.final && e.hp <= e.maxHp * 0.3 + 0.5 && !e.escaping) { e.escaping = true; g.rivalEscape?.(e); return 'skip'; }
  if (e.escaping) { e.st.walkBlend = 0; e.rig.position.copy(e.pos); g.animEnemy(e, dt, dist); return 'skip'; }
  if (e.leap) {
    // a quick spring backwards and away, with smoke where he stood
    const L = e.leap; L.t += dt; const k = Math.min(1, L.t / 0.45);
    e.pos.addScaledVector(L.dir, (1 - k) * 18 * dt); resolve(e.pos, e.radius); e.st.crouch = Math.sin(k * Math.PI) * 0.7;
    if (k >= 1) { e.leap = null; e.st.crouch = 0; }
  } else if (e.st.action === 'shootKneel') {
    // the marked shot: he kneels and draws, a red line runs out toward Salim, then a heavy arrow that shoves
    e.st.actionT += dt / 1.5;
    g.aimLine(e, e.st.actionT);
    if (!e.didHit && e.st.actionT > 0.72) {
      e.didHit = true; g.aimLine(e, null);
      const from = e.pos.clone(); from.y += 1.35; const to = (e.aimAt || p.pos).clone(); to.y = p.pos.y + 1.0;
      const dir = to.sub(from).normalize();
      const m = new THREE.Mesh(g.arrowGeo, g.arrowMat); m.scale.set(1.5, 1.5, 1.2); m.position.copy(from); m.lookAt(from.clone().add(dir)); g.scene.add(m);
      g.projectiles.push({ mesh: m, vel: dir.multiplyScalar(40), grav: 0, life: 0.8, owner: 'enemy', kind: 'arrow', dmg: e.dmg * 1.8, bolt: true });
      g.audio.at(e.pos, () => g.audio.whoosh?.());
    }
    if (e.st.actionT >= 1) e.st.action = null;
  } else if (e.st.action === 'shoot') {
    e.st.actionT += dt / 0.9; e.facing += angDiff(e.facing, face) * Math.min(1, dt * 12);
    if (!e.didHit && e.st.actionT > 0.6) {
      e.didHit = true; const n = e.volleyN || 3;
      for (let i = 0; i < n; i++) { const a = face + (i - (n - 1) / 2) * 0.13; g.shootArrow(e, V(Math.sin(a), 0, Math.cos(a)), e.dmg); }
    }
    if (e.st.actionT >= 1) e.st.action = null;
  } else if (e.st.action === 'shove') {
    e.st.actionT += dt / 0.6;
    if (!e.didHit && e.st.actionT > 0.5) { e.didHit = true; if (dist < 2.4) { g.damagePlayer(e.dmg * 0.6, e.pos, e); p.knock = (p.knock || new THREE.Vector3()).addScaledVector(tmp.set(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z).normalize(), 7); } }
    if (e.st.actionT >= 1) e.st.action = null;
  } else {
    e.facing += angDiff(e.facing, face) * Math.min(1, dt * 8);
    if (dist < 4.2 && e.leapCd <= 0) {
      // too close: smoke at his feet and a spring back and to the side
      e.leapCd = 4.5; const away = tmp.set(e.pos.x - p.pos.x, 0, e.pos.z - p.pos.z).normalize(), side = Math.random() < 0.5 ? 1 : -1;
      e.leap = { t: 0, dir: V(away.x + away.z * 0.6 * side, 0, away.z - away.x * 0.6 * side).normalize() };
      puff(g, e.pos, 14); g.audio.at(e.pos, () => g.audio.whoosh?.());
    } else if (dist < 2.2 && e.kickCd <= 0) { e.kickCd = 2.5; e.st.action = 'shove'; e.st.actionT = 0; e.didHit = false; }
    else if (e.markCd <= 0 && dist < 18 && navClear(e.pos.x, e.pos.z, p.pos.x, p.pos.z)) { e.markCd = rand(6, 8); e.st.action = 'shootKneel'; e.st.actionT = 0; e.didHit = false; e.aimAt = null; }
    else if (e.volleyCd <= 0 && dist < 17 && navClear(e.pos.x, e.pos.z, p.pos.x, p.pos.z)) { e.volleyCd = rand(1.8, 2.6); e.st.action = 'shoot'; e.st.actionT = 0; e.didHit = false; }
    else {
      // keep 8-14 m, circling so his men have a line too
      const [h0, h1] = e.T.hold; let want = null;
      if (dist > h1 || !navClear(e.pos.x, e.pos.z, p.pos.x, p.pos.z)) want = p.pos;
      else { const a = face + Math.PI + (e.circle ??= Math.random() < 0.5 ? 0.6 : -0.6), r = dist < h0 ? h0 + 2 : dist; want = { x: p.pos.x + Math.sin(a) * r, z: p.pos.z + Math.cos(a) * r }; }
      const wp = g.steer(e, want), dir = tmp.set(wp.x - e.pos.x, 0, wp.z - e.pos.z); const dl = dir.length();
      if (dl > 0.3) { e.pos.addScaledVector(dir.divideScalar(dl), e.speed * dt); moving = true; }
    }
  }
  resolve(e.pos, e.radius); e.pos.y = heightAt(e.pos.x, e.pos.z);
  e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend, moving ? 1 : 0, Math.min(1, dt * 8)); e.st.phase += dt * (moving ? e.speed * 1.6 : 0);
  e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist);
  return 'skip';
}
function puff(g, pos, n = 20, life = 2.6) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = Math.random() * 1.6; g.fx.smoke.spawn({ pos: { x: pos.x + Math.cos(a) * r, y: (pos.y || 0) + Math.random() * 1.4, z: pos.z + Math.sin(a) * r }, vel: { x: Math.cos(a) * 0.8, y: 0.5, z: Math.sin(a) * 0.8 }, life, size: 1.2, size1: 3.4, color: new THREE.Color(0.46, 0.44, 0.42), alpha: 0.6, drag: 0.6, fadeIn: 0.1 }); }
}

// ------------------------------------------------------------------ Olbianos' hooked chain
function hookAI(g, e, dt, dist) {
  const p = g.player;
  if (!e.alerted || p.dead) return;
  e.barOn = dist < 28; if (e.barOn) g.ui.bossBar(e.name, e.hp / e.maxHp);
  e.hookCd = (e.hookCd ?? 3) - dt;
  const H = e.hook, C = g.rivalChain;
  if (H) {
    H.t += dt; e.facing += angDiff(e.facing, Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z)) * Math.min(1, dt * (H.phase === 'wind' ? 6 : 2));
    const hand = e.rig.userData.parts.handL.getWorldPosition(tmp2);
    if (H.phase === 'wind') {
      e.st.action = 'throwSide'; e.st.actionT = Math.min(0.42, H.t / 0.9 * 0.42);
      g.aimLine(e, Math.min(0.99, H.t / 0.9 * 0.7));
      if (H.t >= 0.9) { H.phase = 'fly'; H.t = 0; H.tip = hand.clone(); H.dir = V((e.aimAt || p.pos).x - e.pos.x, 0, (e.aimAt || p.pos).z - e.pos.z).normalize(); g.aimLine(e, null); e.st.actionT = 0.45; g.audio.at(e.pos, () => g.audio.whoosh?.()); }
    } else if (H.phase === 'fly') {
      e.st.actionT = Math.min(1, e.st.actionT + dt);
      H.tip.addScaledVector(H.dir, 26 * dt); H.tip.y = THREE.MathUtils.lerp(H.tip.y, p.pos.y + 1.1, Math.min(1, dt * 6));
      if (Math.hypot(H.tip.x - p.pos.x, H.tip.z - p.pos.z) < 0.9) {
        if (p.rollT > 0 || p.invuln > 0) { g.ui.damageNumber(p.pos, 'Evaded', 'block'); H.phase = 'reel'; H.t = 0; }
        else { H.phase = 'pull'; H.t = 0; g.damagePlayer(e.dmg * 0.4, e.pos); g.audio.clang?.(); g.shake = Math.max(g.shake, 0.3); if (!g.hookWarned) { g.hookWarned = true; g.ui.toast('Hooked! Evade as he strikes to slip the blow'); } }
      } else if (H.tip.distanceTo(hand) > 13 || !navClear(e.pos.x, e.pos.z, H.tip.x, H.tip.z)) { H.phase = 'reel'; H.t = 0; }
    } else if (H.phase === 'pull') {
      // Salim is dragged in along the chain
      const to = tmp.set(e.pos.x - p.pos.x, 0, e.pos.z - p.pos.z); const d = to.length();
      if (d > 1.9 && H.t < 1.2 && !p.dead) { p.pos.addScaledVector(to.divideScalar(d), Math.min(d - 1.9, 15 * dt)); resolve(p.pos, 0.45); p.st.hitT = 0.4; H.tip.copy(p.pos).setY(p.pos.y + 1.1); }
      else { H.phase = 'strike'; H.t = 0; e.st.action = 'slam'; e.st.actionT = 0; e.didHit = false; g.telegraphTell(e); }
    } else if (H.phase === 'strike') {
      e.st.actionT += dt / 1.0;
      if (!e.didHit && e.st.actionT > 0.58) { e.didHit = true; if (p.pos.distanceTo(e.pos) < 2.9) g.damagePlayer(e.dmg * 1.6, e.pos, e); g.audio.boom?.(); g.fx.dust(e.pos, 14, 1.4); }
      if (e.st.actionT >= 1) { e.st.action = null; e.hook = null; }
    } else if (H.phase === 'reel') {
      H.tip.lerp(hand, Math.min(1, dt * 9)); if (H.t > 0.4) { e.hook = null; e.st.action = null; }
    }
    // the chain: a line of links from his hand to the hook
    if (e.hook && H.tip) { const d = H.tip.distanceTo(hand); C.visible = true; C.position.copy(hand); C.quaternion.setFromUnitVectors(tmp.set(0, 1, 0), tmp2.copy(H.tip).sub(hand).normalize()); C.scale.set(1, Math.max(0.05, d), 1); C.userData.hook.position.set(0, 1, 0); C.userData.hook.scale.set(1, 1 / Math.max(0.05, d), 1); }
    else C.visible = false;
    if (!e.hook) C.visible = false;
    e.pos.y = heightAt(e.pos.x, e.pos.z); e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend, 0, Math.min(1, dt * 8));
    e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist);
    return 'skip';
  }
  if (e.hookCd <= 0 && !e.st.action && !e.staggerT && dist > 3.3 && dist < 12 && navClear(e.pos.x, e.pos.z, p.pos.x, p.pos.z)) {
    e.hookCd = e.hp < e.maxHp * 0.5 ? 4.2 : 6; e.hook = { phase: 'wind', t: 0 }; e.aimAt = null; return 'skip';
  }
  // pressed close with the chain ready: he shoves Salim off to make room for the throw
  if (e.shoveT > 0) {
    e.shoveT -= dt; e.st.actionT = Math.min(1, e.st.actionT + dt / 0.6);
    if (!e.didHit && e.st.actionT > 0.55) { e.didHit = true; if (dist < 2.8 && !(p.rollT > 0)) { p.knock = (p.knock || new THREE.Vector3()).addScaledVector(tmp.set(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z).normalize(), 22); g.damagePlayer(e.dmg * 0.3, e.pos); } }
    if (e.shoveT <= 0) { e.st.action = null; e.hookCd = Math.min(e.hookCd, 0.35); }
    e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist); return 'skip';
  }
  if (e.hookCd <= 0 && !e.st.action && !e.staggerT && dist <= 3.3) { e.shoveT = 0.6; e.st.action = 'shove'; e.st.actionT = 0; e.didHit = false; e.facing = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z); return 'skip'; }
  return undefined; // otherwise he fights with the spear like any captain
}

// ------------------------------------------------------------------ Kalokyros in the smoke
function smokeAI(g, e, dt, dist) {
  const p = g.player;
  if (!e.alerted || p.dead) return;
  e.barOn = dist < 28 || e.ghost; if (e.barOn) g.ui.bossBar(e.name, e.hp / e.maxHp);
  e.smokeCd = (e.smokeCd ?? 4) - dt;
  const S = e.smoke;
  if (S) {
    S.t += dt;
    if (S.phase === 'break') {
      if (S.t > 0.35) { e.ghost = true; e.rig.visible = false; S.phase = 'gone'; S.t = 0; S.hold = rand(1.3, 2.1); if (e.hp < e.maxHp * 0.5) for (let i = 0; i < 2; i++) puff(g, tmp.set(p.pos.x + rand(-6, 6), p.pos.y, p.pos.z + rand(-6, 6)), 10, 3); }
    } else if (S.phase === 'gone') {
      if (S.t > S.hold) {
        // out of the smoke behind him, the blade already up
        const back = Math.atan2(-Math.sin(p.facing), -Math.cos(p.facing)) + rand(-0.5, 0.5);
        e.pos.set(p.pos.x + Math.sin(back) * 2.2, 0, p.pos.z + Math.cos(back) * 2.2); resolve(e.pos, e.radius); e.pos.y = heightAt(e.pos.x, e.pos.z);
        e.facing = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z); e.ghost = false; e.rig.visible = true; puff(g, e.pos, 8, 1.4);
        S.phase = 'lunge'; S.t = 0; e.st.action = 'attack'; e.st.actionT = 0; e.didHit = false; g.telegraphTell(e); g.audio.at(e.pos, () => g.audio.swing?.());
      }
    } else if (S.phase === 'lunge') {
      e.st.actionT = Math.min(1, S.t / 0.75);
      if (!e.didHit && S.t > 0.45) { e.didHit = true; if (p.pos.distanceTo(e.pos) < 2.8) g.damagePlayer(e.dmg * 1.5, e.pos, e); }
      if (S.t > 0.75) { e.smoke = null; e.st.action = null; }
    }
    e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; if (!e.ghost) g.animEnemy(e, dt, dist);
    return 'skip';
  }
  if (e.smokeCd <= 0 && !e.st.action && !e.staggerT) {
    e.smokeCd = e.hp < e.maxHp * 0.5 ? rand(5, 6.5) : rand(7.5, 9);
    e.smoke = { phase: 'break', t: 0 }; puff(g, e.pos, 26, 3.2); g.audio.at(e.pos, () => g.audio.hit?.(0.3));
    if (!g.smokeWarned) { g.smokeWarned = true; g.ui.toast('He is in the smoke. Watch for the glint, and evade'); }
    return 'skip';
  }
  return undefined;
}

// ------------------------------------------------------------------ scenes
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const lineDur = (s) => 2.2 + s.length / 17;
const headOf = (rig) => () => rig.userData.parts.head.getWorldPosition(new THREE.Vector3()).add(V(0, 0.08, 0));
function actorOf(o, isPlayer) {
  return isPlayer ? { rig: o.rig, pos: o.pos, get facing() { return o.facing; }, set facing(v) { o.facing = v; }, st: o.st } : { rig: o.rig, pos: o.pos, get facing() { return o.facing; }, set facing(v) { o.facing = v; }, st: o.st };
}
function ots(from, to, side) { return { follow: true, p0: () => { const a = from.pos, b = to.pos, f = yawTo(a, b); return V(a.x - Math.sin(f) * 1.1 + Math.cos(f) * side, a.y + 1.85, a.z - Math.cos(f) * 1.1 - Math.sin(f) * side); }, t0: headOf(to.rig), fov: 30 }; }
function meetScene(g, z, lines, card) {
  const salim = actorOf(g.player, true), zub = actorOf(z);
  const face = () => { zub.facing = yawTo(zub.pos, salim.pos); salim.facing = yawTo(salim.pos, zub.pos); };
  const shots = lines.map(([who, text]) => {
    const isS = who === 'Salim', spk = isS ? salim : zub, lis = isS ? zub : salim;
    return { dur: lineDur(text), line: { who, text, rig: spk.rig, cue: isS ? 'hm' : 'breath', expr: isS ? (text.endsWith('?') ? 'surprise' : 'anger') : 'wary' }, cam: ots(lis, spk, isS ? -0.4 : 0.4), dof: headOf(spk.rig), enter: () => { face(); salim.st.talk = isS; zub.st.talk = !isS; }, run: face };
  });
  if (card) shots.push({ dur: 4.4, card, stinger: 'boss', cam: { follow: true, p0: () => V(zub.pos.x + Math.sin(zub.facing) * 5 + Math.cos(zub.facing) * 2.5, zub.pos.y + 0.8, zub.pos.z + Math.cos(zub.facing) * 5 - Math.sin(zub.facing) * 2.5), t0: () => zub.pos.clone().setY(zub.pos.y + 1.8), fov: 36 }, enter: () => { salim.st.talk = false; zub.st.talk = false; } });
  return { actors: [salim, zub], shots, tick: (d, dt) => { for (const a of [salim, zub]) { a.rig.position.copy(a.pos); a.rig.rotation.y = a.facing; g.anim(a.rig, a.st, dt); } }, end: () => { salim.st.talk = false; zub.st.talk = false; } };
}
function escapeScene(g, z, line) {
  const salim = actorOf(g.player, true), zub = actorOf(z);
  const shots = [
    { dur: lineDur(line), line: { who: 'Tatzates', text: line, rig: z.rig, cue: 'breath', expr: 'stern', react: 'anger' }, cam: ots(salim, zub, 0.45), dof: headOf(z.rig), enter: () => { zub.facing = yawTo(zub.pos, salim.pos); zub.st.crouch = 0.3; } },
    { dur: 1.8, cam: { follow: true, p0: () => V(zub.pos.x + 4.5, zub.pos.y + 2.2, zub.pos.z + 4.5), t0: () => zub.pos.clone().setY(zub.pos.y + 1), fov: 40 },
      enter: () => { puff(g, z.pos, 40, 3.5); g.audio.whoosh?.(); }, run: (d, k) => { if (k > 0.35) z.rig.visible = false; } },
  ];
  return { actors: [salim, zub], shots, tick: (d, dt) => { salim.rig.position.copy(salim.pos); g.anim(salim.rig, salim.st, dt); if (z.rig.visible) { z.rig.position.copy(z.pos); g.anim(z.rig, z.st, dt); } }, end: () => { zub.st.crouch = 0; } };
}

// ------------------------------------------------------------------ setup
export function setupRivals(g) {
  const p = g.player;
  p.rival ||= {};
  // the hook and chain, made at load (no new materials mid-fight)
  {
    const m = new THREE.MeshStandardMaterial({ color: 0x9a9aa2, metalness: 0.75, roughness: 0.35, emissive: 0x1a1a1e });
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 5, 1, true).translate(0, 0.5, 0), m);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 5, 10, Math.PI * 1.3), m); chain.add(hook); chain.userData.hook = hook;
    chain.visible = false; chain.castShadow = true; g.scene.add(chain); g.rivalChain = chain;
  }
  // Olbianos and Kalokyros get their own fights; their death scenes and quests are unchanged
  const special = () => {
    const H = IS_SAWAD && g.matriarch?.name === 'Olbianos' ? g.matriarch : null, L = IS_KARKH && g.matriarch?.name === 'Kalokyros' ? g.matriarch : null;
    if (H) { H.T = { ...H.T, ai: hookAI }; H.maxHp = H.hp = Math.round(H.maxHp * 1.6); }
    if (L) { L.T = { ...L.T, ai: smokeAI }; L.maxHp = L.hp = Math.round(L.maxHp * 1.5); L.dmg *= 1.15; }
  };
  special();

  // hide the boss bar when a lieutenant falls or the fight is left; a rival never dies before his last stand
  const prevKill = g.killEnemy.bind(g);
  g.killEnemy = (e, src) => {
    if (e.type === 'zubayr' && !e.final) { e.hp = Math.max(1, e.maxHp * 0.3); return; }
    if (g.rivalChain && e.hook) { g.rivalChain.visible = false; e.hook = null; }
    if (e.barOn) { e.barOn = false; if (!g.bossActive) g.ui.bossBar(null); }
    prevKill(e, src);
  };

  // Tatzates' road ambush in this region
  const R = RIVAL[REGION];
  let spot = null;
  if (R) { const [x, z] = freeSpot(R.at[0], R.at[1], 1.4); spot = V(x, heightAt(x, z), z); }
  g.rivalEscape = async (e) => {
    g.aimLine(e, null);
    if (g.director) await g.director.play(escapeScene(g, e, R?.escape || 'Another day.'));
    e.rig.visible = false; e.dead = true; e.removed = true; g.scene.remove(e.rig); e.barOn = false; g.ui.bossBar(null);
    // what he leaves behind in the smoke: his purse, and something from his kit
    p.xp += Math.round(e.xp * (p.xpK || 1)); g.dropItem({ gold: Math.round(rand(40, 70) * e.level), rarity: 'common' }, e.pos); g.dropItem(makeItem(e.level + 1, Math.random() < 0.35 ? 'legendary' : 'rare'), e.pos);
    p.rival[REGION] = 'escaped'; if (REGION === 'docks') g.ui.banner('Tatzates Is Gone North', 'He waits in the Hamrin hills', 4500);
    saveGame(g);
  };
  let met = null;
  const prevTick = g.tickExtra;
  g.tickExtra = (dt) => {
    prevTick?.(dt);
    // a lieutenant's bar comes down if Salim walks away from him
    for (const e of [g.matriarch]) if (e?.barOn && (e.dead || e.pos.distanceTo(p.pos) > 32 || !e.alerted)) { e.barOn = false; if (!g.bossActive) g.ui.bossBar(null); }
    if (met?.barOn && (met.pos.distanceTo(p.pos) > 34 || !met.alerted || met.dead)) { met.barOn = false; if (!g.bossActive) g.ui.bossBar(null); }
    if (!R || !spot || met || p.rival[REGION] || g.cinematic || g.interior || g.bossActive || (g.act || 1) < R.act || !g.started) return;
    if (Math.hypot(p.pos.x - spot.x, p.pos.z - spot.z) > 17) return;
    // he is waiting on the road with his men
    const lvl = Math.max(R.level, p.level - 1);
    const z = met = g.spawnPack('zubayr', spot.x, spot.z, 1, lvl, { spread: 0 })[0];
    z.maxHp = z.hp = Math.round(z.maxHp * 3.2); z.dmg *= 1.25; z.elite = true; z.xp *= 4; z.volleyN = REGION === 'sawad' ? 3 : 5;
    z.facing = Math.atan2(p.pos.x - z.pos.x, p.pos.z - z.pos.z);
    const men = g.spawnPack(R.men, spot.x, spot.z, R.men.length, lvl - 1, { spread: 6 });
    if (g.director) g.director.play(meetScene(g, z, R.intro, REGION === 'sawad' ? { ar: 'تاتزاتيس', en: 'Tatzates', sub: 'The bowman on the dune' } : null)).then(() => { z.alerted = true; for (const m of men) m.alerted = true; });
    else { z.alerted = true; for (const m of men) m.alerted = true; }
  };
  g.__rivals = { RIVAL, spot: () => spot, met: () => met, hookAI, smokeAI, zubayrAI, special, meetScene };
}
