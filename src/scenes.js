import * as THREE from 'three';
import { humanoid, camel, animateCamel } from './characters.js';
import { heightAt } from './terrain.js';

// The story's cinematics. Each returns a scene definition for the Director.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ground = (x, z, y = 0) => V(x, heightAt(x, z) + y, z);
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const lineDur = (s) => 2.2 + s.length / 17;

function actor(rig, pos, facing = 0) {
  return { rig, pos: pos.clone(), facing, st: { phase: 0, walkBlend: 0, action: null, actionT: 0, hitT: 0, dead: false, deadT: 0, fallDir: 1 } };
}
// world point at a height above an actor (follows the actor while it moves)
const at = (a, y = 1.5, fwd = 0, side = 0) => () => {
  const f = a.facing, s = a.rig.userData.parts?.body.scale.x || 1;
  return V(a.pos.x + Math.sin(f) * fwd + Math.cos(f) * side, a.pos.y + y * s, a.pos.z + Math.cos(f) * fwd - Math.sin(f) * side);
};
const headOf = (a) => () => a.rig.userData.parts.head.getWorldPosition(new THREE.Vector3()).add(V(0, 0.08, 0));
function walk(a, target, speed, dt) {
  const d = Math.hypot(target.x - a.pos.x, target.z - a.pos.z);
  if (d < 0.05) return true;
  const step = Math.min(d, speed * dt);
  a.facing = yawTo(a.pos, target);
  a.pos.x += (target.x - a.pos.x) / d * step; a.pos.z += (target.z - a.pos.z) / d * step; a.pos.y = heightAt(a.pos.x, a.pos.z);
  return false;
}
function act(a, name, dur) { a.st.action = name; a.st.actionT = 0; a.actDur = dur; }
function tickActor(g, a, dt) {
  if (a.st.action) { a.st.actionT += dt / (a.actDur || 0.6); if (a.st.actionT >= 1) a.st.action = null; }
  if (a.st.dead) a.st.deadT += dt;
  a.st.hitT = Math.max(0, a.st.hitT - dt * 2.5);
  a.rig.position.copy(a.pos); a.rig.rotation.y = a.facing;
  if (a.camel) { a.st.walkBlend = a.moving ? 1 : 0; a.st.phase += dt * (a.moving ? 2.6 : 0); a.rig.rotation.y = a.facing - Math.PI / 2; animateCamel(a.rig, a.st, g.t); }
  else g.anim(a.rig, a.st, dt);
}
// the player's state as a cinematic actor (shares the rig and position)
function playerActor(g) { const p = g.player; return { rig: p.rig, pos: p.pos, get facing() { return p.facing; }, set facing(v) { p.facing = v; }, st: p.st }; }
function npcActor(g) { const n = g.npc; return { rig: n, pos: n.position, get facing() { return n.rotation.y; }, set facing(v) { n.rotation.y = v; }, st: g.npcSt }; }

// ------------------------------------------------------------------ Act I: the ambush on the caravan road at dusk
export function prologue(g) {
  const sc = g.scene, actors = [], extra = [];
  const salim = playerActor(g);
  const road = (z) => 13.5 + (z - 100) * 0.02;
  const add = (a) => { if (!actors.includes(a)) actors.push(a); if (a.rig !== g.player.rig) { sc.add(a.rig); extra.push(a.rig); } return a; };
  const camelA = add(Object.assign(actor(camel(0xb88a58), ground(road(124) + 1.3, 124), Math.PI), { camel: true }));
  const camelB = add(Object.assign(actor(camel(0xa07850), ground(road(130) + 1.3, 130), Math.PI), { camel: true }));
  const guard1 = add(actor(humanoid({ robe: '#3a3428', robe2: '#8a6a3a', turban: 0xd8cfb8, weapon: 'spear', beard: 0x2a1a10, skin: 0x9a6a44 }), ground(road(127) - 1.2, 127.5), Math.PI));
  const guard2 = add(actor(humanoid({ robe: '#4a3a2a', robe2: '#2a3a5a', turban: 0xc8b890, weapon: 'spear', skin: 0x8a5a3a }), ground(road(134) - 0.6, 134), Math.PI));
  const archer = add(actor(humanoid({ robe: '#5a4a32', robe2: '#3a2a1a', turban: 0xc8b890, mask: 0x8a7a5a, skin: 0x9a6a44, weapon: 'bow' }), ground(27, 113), -Math.PI / 2));
  const b1 = add(actor(humanoid({ robe: '#4a3a2a', robe2: '#7a3a1a', turban: 0x6a2a1a, mask: 0x1e1a16, skin: 0x8a5a3a, weapon: 'sword', sash: 0x5a1a10 }), ground(28.5, 117), -Math.PI / 2));
  const b2 = add(actor(humanoid({ robe: '#3a3226', robe2: '#5a2a1a', turban: 0x2a2018, mask: 0x1e1a16, skin: 0x7a4a2a, weapon: 'sword', offhand: 'shield', sash: 0x3a1a10 }), ground(26, 121), -Math.PI / 2));
  for (const b of [archer, b1, b2]) b.st.crouch = 1;
  add(salim);
  const startZ = 125.5;
  const reset = () => {
    salim.pos.copy(ground(road(startZ) - 0.2, startZ)); salim.facing = Math.PI; salim.st.action = null; salim.st.crouch = 0; salim.st.hitT = 0;
  };
  reset();
  const caravan = [camelA, camelB, guard1, guard2, salim];
  const march = (dt, speed = 1.35) => {
    for (const a of caravan) { if (a.st.dead || a.halt) { a.moving = false; continue; } a.moving = true; walk(a, V(road(a.pos.z - 2) + (a.camel ? 1.3 : a === salim ? -0.2 : a === guard1 ? -1.2 : -0.6), 0, a.pos.z - 2), speed, dt); }
  };
  let arrow = null;
  const cleanup = () => {
    for (const r of extra) sc.remove(r);
    if (arrow) sc.remove(arrow);
    const p = g.player; p.pos.set(1, 0, 88); p.pos.y = heightAt(1, 88); p.facing = yawTo(p.pos, g.npc.position); p.st.crouch = 0; p.st.action = null; p.st.hitT = 0; p.vel?.set(0, 0, 0);
  };
  const shots = [
    { dur: 6.5, card: { ar: 'القافلة', en: 'Act I · The Caravan', sub: 'The Sawad, outside Baghdad, in the year 813' }, stinger: 'title', fadeIn: 1.2,
      cam: { p0: () => ground(36, 140, 14), t0: () => ground(14, 124, 1.2), p1: () => ground(26, 132, 6), t1: () => ground(13.5, 121, 1.4) }, run: (d, k, dt) => march(dt) },
    { dur: 5.2, line: { who: 'Salim', text: 'Too quiet. Even the frogs in the canal have stopped.', rig: g.player.rig, cue: 'hm' },
      cam: { follow: true, p0: at(salim, 1.75, 2.6, 1.6), t0: at(salim, 1.6, -1.5, -0.6), p1: at(salim, 1.7, 2.2, 1.2), t1: at(salim, 1.6, -1.5, -0.6) }, dof: headOf(salim), aperture: 1.6,
      run: (d, k, dt) => { march(dt); salim.st.headYaw = -Math.sin(k * Math.PI) * 0.7; } },
    { dur: 3.0, cam: { p0: () => ground(17, 109, 1.8), t0: () => ground(27, 116, 1.4), p1: () => ground(18, 111.5, 2.0), t1: () => ground(27, 116, 1.5), fov: 30 }, stinger: 'ambush',
      enter: (d) => { d.audio.vocal('shout', 0.9); },
      run: (d, k, dt) => { march(dt, 0.6); for (const b of [archer, b1, b2]) b.st.crouch = Math.max(0, 1 - k * 2.2); if (k > 0.45 && !archer.st.action) act(archer, 'shoot', 1.6); salim.st.headYaw = 0; } },
    { dur: 2.6, slow: 0.3, cam: { follow: true, p0: at(guard1, 1.4, 1.2, -2.4), t0: at(guard1, 1.3, 0, 0), p1: at(guard1, 1.2, 0.6, -1.9), t1: at(guard1, 1.0, 0, 0), fov: 32 },
      enter: () => { for (const a of caravan) a.halt = true; arrow = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 4).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5a3a20 })); sc.add(arrow); arrow.userData.t = 0; },
      run: (d, k, dt) => {
        const a0 = at(archer, 1.5)(), a1 = at(guard1, 1.35)(); arrow.userData.t = Math.min(1, arrow.userData.t + dt * 1.6);
        const u = arrow.userData.t; arrow.position.lerpVectors(a0, a1, u).y += Math.sin(u * Math.PI) * 0.6; arrow.lookAt(a1);
        if (u >= 1 && !guard1.st.dead) { guard1.st.dead = true; guard1.st.fallDir = 1; d.audio.vocal('hurt', 0.8); d.audio.hit?.(); }
      } },
    { dur: 3.2, cam: { follow: true, p0: at(salim, 1.3, -3.4, 1.2), t0: at(salim, 1.2, 3, 0), p1: at(salim, 1.1, -2.6, 1.0), t1: at(salim, 1.2, 3, 0), fov: 34 },
      enter: (d) => { salim.facing = yawTo(salim.pos, b1.pos); d.audio.vocal('hm', 1.1); },
      run: (d, k, dt) => {
        salim.facing = yawTo(salim.pos, b1.pos);
        const meet = salim.pos.clone().add(V(Math.sin(salim.facing) * 1.6, 0, Math.cos(salim.facing) * 1.6));
        walk(b1, meet, 5.2, dt); walk(b2, meet.clone().add(V(0.6, 0, 3.2)), 4.6, dt);
      } },
    { dur: 3.0, slow: 0.35, cam: { follow: true, p0: at(salim, 1.6, 2.4, 2.6), t0: at(salim, 1.2, 0.8, 0), p1: at(salim, 1.4, 0.4, 3.4), t1: at(salim, 1.2, 0.8, 0), fov: 34 }, dof: at(salim, 1.5),
      enter: (d) => { act(salim, 'attack', 0.55); d.audio.swing?.(); d.audio.vocal('effort', 1); },
      run: (d, k, dt) => {
        salim.facing = yawTo(salim.pos, b1.pos); b1.facing = yawTo(b1.pos, salim.pos);
        if (!salim.st.action && !b1.st.dead && k < 0.5) { act(salim, 'attack', 0.55); d.audio.swing?.(); }
        if (k > 0.42 && !b1.st.dead) { b1.st.dead = true; b1.st.fallDir = 1; d.audio.hit?.(); d.audio.vocal('hurt', 1.15); }
      } },
    { dur: 2.4, cam: { follow: true, p0: at(salim, 1.0, 1.6, -1.8), t0: at(salim, 1.3, 0, 0), p1: at(salim, 0.8, 1.3, -1.4), t1: at(salim, 0.9, 0, 0), shake: 0.15 },
      enter: (d) => { b2.pos.copy(salim.pos).add(V(-Math.sin(salim.facing) * 1.4, 0, -Math.cos(salim.facing) * 1.4)); b2.facing = yawTo(b2.pos, salim.pos); act(b2, 'attack', 0.6); },
      run: (d, k, dt) => {
        if (k > 0.35 && salim.st.hitT === 0 && !salim.hurt) { salim.hurt = true; salim.st.hitT = 1; d.audio.hit?.(); d.audio.vocal('hurt', 1); }
        if (salim.hurt) salim.st.crouch = Math.min(0.85, (k - 0.35) * 2);
        if (k > 0.75) d.fade(1, 0.5);
      } },
    { dur: 4.5, caption: 'The caravan was lost. Salim was not.', cam: { p0: V(0, 60, 0), t0: V(0, 0, 1) }, enter: (d) => d.fade(1, 0.01) },
  ];
  return {
    dusk: 0.7, actors, shots,
    tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); },
    end: () => { salim.hurt = false; cleanup(); },
  };
}

// ------------------------------------------------------------------ Ishaq's briefing in the village
export function briefing(g) {
  const salim = playerActor(g), ishaq = npcActor(g), actors = [salim, ishaq];
  const L = [
    'Salim! You live. When your caravan did not reach the gate, I feared the worst. I am Ishaq, astronomer of the House of Wisdom, and those were my instruments on your camels.',
    'The siege is over, but its soldiers did not all go home. A renegade named Ghassan gathers deserters at the ruined Persian arch to the south. He means to choke the grain road.',
    'Break his lieutenants first. Ziyad holds the old caravanserai to the east, and Hisham hides his knife-men in the brick kilns across the canal. Keep your sword arm loose.',
  ];
  const face = () => { salim.facing = yawTo(salim.pos, ishaq.pos); ishaq.facing = yawTo(ishaq.pos, salim.pos); };
  const ots = (from, to, side) => ({ follow: true, p0: () => { const a = from.pos, b = to.pos, f = yawTo(a, b); return V(a.x - Math.sin(f) * 0.9 + Math.cos(f) * side, a.y + 1.75, a.z - Math.cos(f) * 0.9 - Math.sin(f) * side); }, t0: headOf(to), fov: 30 });
  const talk = (on) => { ishaq.st.talk = on; };
  const shots = [
    { dur: 3.2, fadeIn: 1.0, cam: { p0: () => V(-0.5 + 5.5, heightAt(4, 90) + 2.6, 92), t0: () => V(-0.5, 1.4 + heightAt(0, 86), 86), p1: () => V(3.5, heightAt(3, 90) + 2.2, 90.5), t1: () => V(-0.5, 1.4 + heightAt(0, 86), 86) },
      enter: () => { face(); g.npcMark && (g.npcMark.visible = false); } },
    { dur: lineDur(L[0]), line: { who: 'Ishaq', text: L[0], rig: g.npc, cue: 'breath' }, cam: ots(salim, ishaq, 0.35), dof: headOf(ishaq), enter: () => talk(true), run: () => face() },
    { dur: 3.6, line: { who: 'Salim', text: 'Then I will bring them back. All of them.', rig: g.player.rig, cue: 'hm' }, cam: ots(ishaq, salim, -0.35), dof: headOf(salim), enter: () => { talk(false); salim.st.talk = true; } },
    { dur: lineDur(L[1]), line: { who: 'Ishaq', text: L[1], rig: g.npc }, cam: ots(salim, ishaq, 0.4), dof: headOf(ishaq), enter: () => { salim.st.talk = false; talk(true); act(ishaq, 'cast', 2.4); } },
    { dur: lineDur(L[2]), line: { who: 'Ishaq', text: L[2], rig: g.npc }, cam: { follow: true, p0: at(ishaq, 1.6, 2.4, 1.6), t0: headOf(ishaq), p1: at(ishaq, 1.6, 2.0, 1.0), t1: headOf(ishaq), fov: 32 }, dof: headOf(ishaq) },
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); }, end: () => { talk(false); salim.st.talk = false; ishaq.st.action = null; } };
}

// ------------------------------------------------------------------ a lieutenant falls, and the next act begins
export function lieutenantFalls(g, e, { who, text, card }) {
  const salim = playerActor(g), foe = { rig: e.rig, pos: e.pos, get facing() { return e.facing; }, set facing(v) { e.facing = v; }, st: e.st };
  const actors = [salim, foe];
  const ang = yawTo(salim.pos, foe.pos);
  const orbit = (r, h, a0) => () => { const a = a0 + (performance.now() / 1000) * 0.12; return V(foe.pos.x + Math.sin(a) * r, foe.pos.y + h, foe.pos.z + Math.cos(a) * r); };
  const shots = [
    { dur: 3.4, slow: 0.3, line: { who, text, rig: e.rig, cue: 'hurt' }, cam: { follow: true, p0: orbit(3.3, 0.85, ang + 2.2), t0: at(foe, 0.35) }, dof: at(foe, 0.4), aperture: 1.0 },
    { dur: 5.6, card, stinger: 'title', cam: { p0: () => at(foe, 3.5, 0, 0)().add(V(0, 0, 0)), t0: at(foe, 0.5), p1: () => at(foe, 14, 0, 0)().add(V(8, 0, 8)), t1: at(foe, 0), ease: 'io2' } },
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); } };
}

// ------------------------------------------------------------------ Ghassan at the arch
export function bossIntro(g, b) {
  const salim = playerActor(g), boss = { rig: b.rig, pos: b.pos, get facing() { return b.facing; }, set facing(v) { b.facing = v; }, st: b.st };
  const actors = [salim, boss];
  const face = () => { boss.facing = yawTo(boss.pos, salim.pos); };
  const shots = [
    { dur: 3.4, cam: { follow: true, p0: at(salim, 1.9, -3.2, 0.9), t0: at(boss, 2.4), p1: at(salim, 1.8, -2.2, 0.7), t1: at(boss, 2.4), fov: 32 }, stinger: 'boss',
      enter: () => { face(); b.st.crouch = 0.8; }, run: (d, k) => { face(); b.st.crouch = 0.8 * (1 - k); } },
    { dur: 5.2, line: { who: 'Ghassan', text: 'The siege fed my men for two years. Your grain road will feed them now.', rig: b.rig, cue: 'growl' },
      cam: { follow: true, p0: at(boss, 0.5, 4.6, 1.4), t0: at(boss, 2.25), p1: at(boss, 0.7, 3.6, 0.9), t1: at(boss, 2.3), fov: 34 }, dof: headOf(boss),
      enter: (d) => { act(boss, 'command', 2.6); d.audio.roar?.(); }, run: () => face() },
    { dur: 4.6, card: { ar: 'غسّان', en: 'Ghassan', sub: 'Renegade commander of the siege' },
      cam: { follow: true, p0: at(boss, 2.4, 6, -4), t0: at(boss, 1.8), p1: at(boss, 2.0, 5.4, 3.2), t1: at(boss, 1.8), fov: 36 } },
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); }, end: () => { b.rise = 1; b.st.crouch = 0; b.st.action = null; } };
}
export function bossPhase(g, b, enginesBurnt = false) {
  const boss = { rig: b.rig, pos: b.pos, get facing() { return b.facing; }, set facing(v) { b.facing = v; }, st: b.st }, salim = playerActor(g);
  const shots = [
    { dur: 3.6, slow: 0.5, stinger: 'phase', line: { who: 'Ghassan', text: enginesBurnt ? 'You burned my engines? Then my men will do it by hand!' : 'Engines! Burn the road!', rig: b.rig, cue: 'growl' },
      cam: { follow: true, p0: at(boss, 1.4, 5, 2), t0: at(boss, 2.3), p1: at(boss, 2.0, 3.4, 1.0), t1: at(boss, 2.4), fov: 34, shake: 0.12 }, dof: headOf(boss),
      enter: (d) => { act(boss, 'command', 1.6); d.audio.roar?.(); } },
  ];
  return { actors: [boss, salim], shots, tick: (d, dt) => { tickActor(g, boss, dt); tickActor(g, salim, dt); } };
}

// Ghassan, at a quarter of his life, throws down his shield: fire rings the arena and he fights with the sword alone
export function bossDuel(g, b, enginesBurnt) {
  const boss = { rig: b.rig, pos: b.pos, get facing() { return b.facing; }, set facing(v) { b.facing = v; }, st: b.st }, salim = playerActor(g);
  const text = enginesBurnt ? 'My engines are ash. Then it is steel, guard. Just you and me.' : 'Enough. No more men, no more engines. Just you and me.';
  const shots = [
    { dur: 4.2, slow: 0.4, stinger: 'phase', line: { who: 'Ghassan', text, rig: b.rig, cue: 'growl' },
      cam: { follow: true, p0: at(boss, 1.6, 4.2, 1.8), t0: at(boss, 2.3), p1: at(boss, 1.9, 3.0, 0.8), t1: at(boss, 2.4), fov: 32, shake: 0.08 }, dof: headOf(boss),
      enter: (d) => { act(boss, 'command', 1.8); d.audio.roar?.(); }, run: () => { boss.facing = yawTo(boss.pos, salim.pos); } },
    { dur: 2.2, caption: 'Fire rings the broken arch.', cam: { follow: true, p0: at(salim, 7, -9, 0), t0: at(boss, 1.2), fov: 44 } },
  ];
  return { actors: [boss, salim], shots, tick: (d, dt) => { tickActor(g, boss, dt); tickActor(g, salim, dt); } };
}

// ------------------------------------------------------------------ epilogue
export function epilogue(g, b) {
  const salim = playerActor(g), boss = { rig: b.rig, pos: b.pos, get facing() { return b.facing; }, set facing(v) { b.facing = v; }, st: b.st }, ishaq = npcActor(g);
  const actors = [salim, boss, ishaq];
  const ang = yawTo(salim.pos, boss.pos);
  const text = 'My instruments are home, and the House of Wisdom will hear how a caravan guard held the grain road.';
  const shots = [
    { dur: 4.2, slow: 0.3, cam: { follow: true, p0: () => V(boss.pos.x + Math.sin(ang + 2.4) * 7, boss.pos.y + 2.6, boss.pos.z + Math.cos(ang + 2.4) * 7), t0: at(boss, 1.4), p1: () => V(boss.pos.x + Math.sin(ang + 1.6) * 6, boss.pos.y + 2.0, boss.pos.z + Math.cos(ang + 1.6) * 6), t1: at(boss, 0.8) }, stinger: 'victory' },
    { dur: 3.6, caption: 'By nightfall the grain road was open again.', enter: (d) => d.fade(1, 0.8) },
    { dur: lineDur(text), fadeIn: 1.2, line: { who: 'Ishaq', text, rig: g.npc, cue: 'breath' },
      enter: () => {
        const p = g.player; p.pos.set(1, 0, 88); p.pos.y = heightAt(1, 88); salim.facing = yawTo(salim.pos, ishaq.pos); ishaq.facing = yawTo(ishaq.pos, salim.pos); ishaq.st.talk = true;
      },
      cam: { follow: true, p0: at(salim, 1.75, -0.9, 0.4), t0: headOf(ishaq), fov: 30 }, dof: headOf(ishaq) },
    { dur: 6, card: { ar: 'رمال بغداد', en: 'Sands of Baghdad', sub: 'Here ends the first chronicle of Salim' }, enter: () => { ishaq.st.talk = false; },
      cam: { p0: V(8, 6, 98), t0: V(4, 3, 80), p1: V(22, 26, 118), t1: V(14, 2, 70), ease: 'io2' } },
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); } };
}

// ------------------------------------------------------------------ side-quest conversations
// A two-hander between Salim and an NPC: over-the-shoulder shots alternating with the speaker.
// lines: [{ who: 'Salim' | npcName, text, act? }]
export function conversation(g, npc, lines, { establish = true } = {}) {
  const salim = playerActor(g);
  const other = { rig: npc.rig, pos: npc.rig.position, get facing() { return npc.rig.rotation.y; }, set facing(v) { npc.rig.rotation.y = v; }, st: npc.st };
  const actors = [salim, other];
  const face = () => { salim.facing = yawTo(salim.pos, other.pos); other.facing = yawTo(other.pos, salim.pos); };
  const ots = (from, to, side) => ({ follow: true, p0: () => { const a = from.pos, b = to.pos, f = yawTo(a, b); return V(a.x - Math.sin(f) * 0.9 + Math.cos(f) * side, a.y + 1.75, a.z - Math.cos(f) * 0.9 - Math.sin(f) * side); }, t0: headOf(to), fov: 30 });
  // stand Salim a conversational distance from the NPC
  const d = Math.hypot(salim.pos.x - other.pos.x, salim.pos.z - other.pos.z);
  if (d > 2.4 || d < 1.2) { const f = yawTo(other.pos, salim.pos); salim.pos.set(other.pos.x + Math.sin(f) * 1.7, 0, other.pos.z + Math.cos(f) * 1.7); salim.pos.y = heightAt(salim.pos.x, salim.pos.z); }
  const shots = [];
  if (establish) shots.push({ dur: 2.4, fadeIn: 0.6, cam: { follow: true, p0: at(other, 2.2, 3.4, 2.6), t0: at(other, 1.3, -0.8, 0), p1: at(other, 2.0, 3.0, 2.0), t1: at(other, 1.3, -0.8, 0), fov: 34 }, enter: () => face() });
  for (const L of lines) {
    const isSalim = L.who === 'Salim', spk = isSalim ? salim : other, lis = isSalim ? other : salim;
    shots.push({ dur: lineDur(L.text), line: { who: L.who, text: L.text, rig: spk.rig, cue: L.cue }, cam: ots(lis, spk, isSalim ? -0.35 : 0.35), dof: headOf(spk),
      enter: () => { face(); salim.st.talk = isSalim; other.st.talk = !isSalim; if (L.act) act(spk, L.act, 1.6); }, run: () => face() });
  }
  return { actors, shots, tick: (dd, dt) => { for (const a of actors) tickActor(g, a, dt); }, end: () => { salim.st.talk = false; other.st.talk = false; } };
}
