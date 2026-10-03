import * as THREE from 'three';
import { humanoid, camel, animateCamel } from './characters.js';
import { heightAt, canalX, SITES, WATER_Y } from './terrain.js';
import { REGION, HUB } from './region.js';
import { mashuf } from './regionprops.js';

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
  let arrow = null, jabirLight = null;
  let cleanup = () => {
    for (const r of extra) sc.remove(r);
    if (jabirLight) sc.remove(jabirLight);
    if (arrow) sc.remove(arrow);
    const p = g.player; p.pos.set(1, 0, 88); p.pos.y = heightAt(1, 88); p.facing = yawTo(p.pos, g.npc.position); p.st.crouch = 0; p.st.action = null; p.st.hitT = 0; p.vel?.set(0, 0, 0);
  };
  // calm and readable: no arrows or blows on screen; the attack happens in a fade to black
  const lamp = g.bossLight; // pre-made light (adding one mid-scene would recompile every shader and stutter)
  const hideBandits = () => { for (const b of [archer, b1, b2]) b.rig.visible = false; };
  const shots = [
    { dur: 6.5, card: { ar: 'القافلة', en: 'Act I · The Caravan', sub: 'The Sawad, outside Baghdad, in the year 813' }, stinger: 'title', fadeIn: 1.2,
      cam: { p0: () => ground(36, 140, 14), t0: () => ground(14, 124, 1.2), p1: () => ground(26, 132, 6), t1: () => ground(13.5, 121, 1.4) }, run: (d, k, dt) => march(dt) },
    { dur: 4.6, line: { who: 'Jabir', text: 'Two more days to Baghdad, Salim. Then home.', rig: guard1.rig, cue: 'hm' },
      cam: { follow: true, p0: at(guard1, 1.8, 2.8, 2.2), t0: at(guard1, 1.55, -1, 0), p1: at(guard1, 1.75, 2.4, 1.8), t1: at(guard1, 1.55, -1, 0), fov: 34 }, dof: headOf(guard1), aperture: 1.4,
      run: (d, k, dt) => march(dt) },
    { dur: 4.4, line: { who: 'Salim', text: 'Too quiet, brother. I do not like it.', rig: g.player.rig, cue: 'hm' },
      cam: { follow: true, p0: at(salim, 1.75, 2.6, 1.6), t0: at(salim, 1.6, -1.5, -0.6), p1: at(salim, 1.7, 2.3, 1.3), t1: at(salim, 1.6, -1.5, -0.6) }, dof: headOf(salim), aperture: 1.6,
      run: (d, k, dt) => { march(dt); salim.st.headYaw = -Math.sin(k * Math.PI) * 0.6; } },
    // riders on the ridge, seen from far away; they only stand and watch
    { dur: 3.6, caption: 'Riders were waiting on the dunes.', noWait: true, cam: { p0: () => ground(17, 109, 1.8), t0: () => ground(27, 116, 1.6), p1: () => ground(17.6, 110.2, 1.9), t1: () => ground(27, 116, 1.6), fov: 32 }, stinger: 'ambush',
      run: (d, k, dt) => { march(dt, 0.8); for (const b of [archer, b1, b2]) b.st.crouch = Math.max(0, 1 - k * 1.6); salim.st.headYaw = 0; if (k > 0.7) d.fade(1, 1.0); } },
    { dur: 3.4, caption: 'Bandits attacked the caravan at dusk.',
      enter: (d) => { d.fade(1, 0.01); d.audio.vocal('shout', 0.9); for (const a of caravan) a.halt = true; hideBandits(); } },
    { dur: 4.8, fadeIn: 1.4, line: { who: 'Jabir', text: 'Salim... the chest. Do not let them burn it.', rig: guard1.rig, cue: 'breath' },
      cam: { follow: true, p0: at(salim, 2.5, -1.9, -2.3), t0: at(salim, 0.35, 1.3), p1: at(salim, 2.35, -1.75, -2.15), t1: at(salim, 0.38, 1.28), fov: 40 }, dof: headOf(salim), aperture: 1.4,
      enter: () => {
        hideBandits();
        guard1.st.dead = true; guard1.st.fallDir = 1; guard1.st.deadT = Math.max(guard1.st.deadT || 0, 4);
        // he lies along the dune's contour rather than with his head in the slope
        { let best = 0, bd = 1e9; const h0 = heightAt(guard1.pos.x, guard1.pos.z); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, dh = Math.abs(heightAt(guard1.pos.x + Math.sin(a) * 1.6, guard1.pos.z + Math.cos(a) * 1.6) - h0) + Math.abs(heightAt(guard1.pos.x + Math.sin(a) * 0.8, guard1.pos.z + Math.cos(a) * 0.8) - h0); if (dh < bd) { bd = dh; best = a; } } guard1.facing = best + Math.PI; guard1.pos.y = h0; }
        salim.pos.copy(guard1.pos).add(V(0.9, 0, -0.2));
        guard2.pos.copy(salim.pos).add(V(1.4, 0, -1.6)); guard2.pos.y = heightAt(guard2.pos.x, guard2.pos.z); guard2.facing = Math.PI / 2;
        for (const c of [camelA, camelB]) { c.pos.x += 3; c.pos.y = heightAt(c.pos.x, c.pos.z); } salim.pos.y = heightAt(salim.pos.x, salim.pos.z); salim.facing = yawTo(salim.pos, guard1.pos); salim.st.crouch = 0.85;
        // a low, warm lantern light so the faces read at dusk
        if (lamp) { lamp.color.set(0xff9a50); lamp.distance = 8; lamp.position.copy(guard1.pos).add(V(0.4, 1.1, 0.9)); lamp.intensity = 7; }
      },
      run: () => { salim.st.crouch = 0.85; } },
    { dur: 3.6, line: { who: 'Salim', text: 'I will bring it back, brother. I promise.', rig: g.player.rig, cue: 'breath' },
      cam: { follow: true, p0: at(salim, 1.5, 1.9, 1.0), t0: headOf(salim), p1: at(salim, 1.45, 1.7, 0.9), t1: headOf(salim), fov: 32 }, dof: headOf(salim), aperture: 1.3,
      run: () => { salim.st.crouch = 0.85; } },
    { dur: 4.2, caption: 'Jabir did not live to see Baghdad. The bandits had taken the chest.', enter: (d) => d.fade(1, 1.2) },
  ];
  const _end = cleanup; cleanup = () => { _end(); if (lamp) { lamp.intensity = 0; lamp.color.set(0xff8a40); lamp.distance = 16; } for (const b of [archer, b1, b2]) b.rig.visible = true; };
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
    'I am Ishaq. I hired your caravan. I am sorry about Jabir.',
    'The Pages: the writings of my old teacher. A powerful man in Baghdad wants them burned. He paid a bandit chief, Ghassan, to steal them.',
    'Ghassan split the Pages between his men. Get them back. Start with Farud, at the old caravanserai.',
  ];
  const face = () => { salim.facing = yawTo(salim.pos, ishaq.pos); ishaq.facing = yawTo(ishaq.pos, salim.pos); };
  const ots = (from, to, side) => ({ follow: true, p0: () => { const a = from.pos, b = to.pos, f = yawTo(a, b); return V(a.x - Math.sin(f) * 0.9 + Math.cos(f) * side, a.y + 1.75, a.z - Math.cos(f) * 0.9 - Math.sin(f) * side); }, t0: headOf(to), fov: 30 });
  const talk = (on) => { ishaq.st.talk = on; };
  const shots = [
    { dur: 3.2, fadeIn: 1.0, cam: { p0: () => V(-0.5 + 5.5, heightAt(4, 90) + 2.6, 92), t0: () => V(-0.5, 1.4 + heightAt(0, 86), 86), p1: () => V(3.5, heightAt(3, 90) + 2.2, 90.5), t1: () => V(-0.5, 1.4 + heightAt(0, 86), 86) },
      enter: () => { face(); g.npcMark && (g.npcMark.visible = false); } },
    { dur: lineDur(L[0]), line: { who: 'Ishaq', text: L[0], rig: g.npc, cue: 'breath' }, cam: ots(salim, ishaq, 0.35), dof: headOf(ishaq), enter: () => talk(true), run: () => face() },
    { dur: 3.6, line: { who: 'Salim', text: 'He died for that chest. What was in it?', rig: g.player.rig, cue: 'hm' }, cam: ots(ishaq, salim, -0.35), dof: headOf(salim), enter: () => { talk(false); salim.st.talk = true; } },
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
    // calm framing: from behind Salim's shoulder at normal speed, no slow-motion lingering on the fallen man
    { dur: 3.4, line: { who, text, rig: e.rig, cue: 'breath' }, cam: { follow: true, p0: at(salim, 2.2, -2.8, 1.4), t0: at(foe, 0.6), p1: at(salim, 2.1, -2.5, 1.2), t1: at(foe, 0.6), fov: 38 }, dof: at(foe, 0.6), aperture: 1.0 },
    { dur: 5.6, card, stinger: 'title', cam: { p0: () => at(foe, 3.5, 0, 0)().add(V(0, 0, 0)), t0: at(foe, 0.5), p1: () => at(foe, 14, 0, 0)().add(V(8, 0, 8)), t1: at(foe, 0), ease: 'io2' } },
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); } };
}

// ------------------------------------------------------------------ Ghassan at the arch
export function bossIntro(g, b, intro = null) {
  const who = b.T.name, I = intro || { text: 'Turn back, guard. Those Pages are not worth your life.', card: { ar: 'غسّان', en: 'Ghassan', sub: 'The man who paid for the ambush' } };
  const salim = playerActor(g), boss = { rig: b.rig, pos: b.pos, get facing() { return b.facing; }, set facing(v) { b.facing = v; }, st: b.st };
  const actors = [salim, boss];
  const face = () => { boss.facing = yawTo(boss.pos, salim.pos); };
  const shots = [
    { dur: 3.4, cam: { follow: true, p0: at(salim, 1.9, -3.2, 0.9), t0: at(boss, 2.4), p1: at(salim, 1.8, -2.2, 0.7), t1: at(boss, 2.4), fov: 32 }, stinger: 'boss',
      enter: () => { face(); b.st.crouch = 0.8; }, run: (d, k) => { face(); b.st.crouch = 0.8 * (1 - k); } },
    { dur: 5.2, line: { who, text: I.text, rig: b.rig, cue: 'growl' },
      cam: { follow: true, p0: at(boss, 0.5, 4.6, 1.4), t0: at(boss, 2.25), p1: at(boss, 0.7, 3.6, 0.9), t1: at(boss, 2.3), fov: 34 }, dof: headOf(boss),
      enter: (d) => { act(boss, 'command', 2.6); d.audio.roar?.(); }, run: () => face() },
    { dur: 4.6, card: I.card,
      cam: { follow: true, p0: at(boss, 2.4, 6, -4), t0: at(boss, 1.8), p1: at(boss, 2.0, 5.4, 3.2), t1: at(boss, 1.8), fov: 36 } },
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); }, end: () => { b.rise = 1; b.st.crouch = 0; b.st.action = null; } };
}
export function bossPhase(g, b, enginesBurnt = false, line = null) {
  const boss = { rig: b.rig, pos: b.pos, get facing() { return b.facing; }, set facing(v) { b.facing = v; }, st: b.st }, salim = playerActor(g);
  const shots = [
    { dur: 3.6, slow: 0.5, stinger: 'phase', line: { who: b.T.name, text: line || (enginesBurnt ? 'You burned my engines? Then my men will burn you by hand!' : 'Fire the engines! Burn the road!'), rig: b.rig, cue: 'growl' },
      cam: { follow: true, p0: at(boss, 1.4, 5, 2), t0: at(boss, 2.3), p1: at(boss, 2.0, 3.4, 1.0), t1: at(boss, 2.4), fov: 34, shake: 0.12 }, dof: headOf(boss),
      enter: (d) => { act(boss, 'command', 1.6); d.audio.roar?.(); } },
  ];
  return { actors: [boss, salim], shots, tick: (d, dt) => { tickActor(g, boss, dt); tickActor(g, salim, dt); } };
}

// Ghassan, at a quarter of his life, throws down his shield: fire rings the arena and he fights with the sword alone
export function bossDuel(g, b, enginesBurnt, K = null) {
  const boss = { rig: b.rig, pos: b.pos, get facing() { return b.facing; }, set facing(v) { b.facing = v; }, st: b.st }, salim = playerActor(g);
  const text = K?.duel || (enginesBurnt ? 'No engines left. Then it is just you and me.' : 'You would die for paper? Then die.');
  const shots = [
    { dur: 4.2, slow: 0.4, stinger: 'phase', line: { who: b.T.name, text, rig: b.rig, cue: 'growl' },
      cam: { follow: true, p0: at(boss, 1.6, 4.2, 1.8), t0: at(boss, 2.3), p1: at(boss, 1.9, 3.0, 0.8), t1: at(boss, 2.4), fov: 32, shake: 0.08 }, dof: headOf(boss),
      enter: (d) => { act(boss, 'command', 1.8); d.audio.roar?.(); }, run: () => { boss.facing = yawTo(boss.pos, salim.pos); } },
    { dur: 2.2, caption: K?.duelCaption || 'Ghassan rings the arena with fire. Stay inside it.', cam: { follow: true, p0: at(salim, 7, -9, 0), t0: at(boss, 1.2), fov: 44 } },
  ];
  return { actors: [boss, salim], shots, tick: (d, dt) => { tickActor(g, boss, dt); tickActor(g, salim, dt); } };
}

// ------------------------------------------------------------------ epilogue
export function epilogue(g, b) {
  const salim = playerActor(g), boss = { rig: b.rig, pos: b.pos, get facing() { return b.facing; }, set facing(v) { b.facing = v; }, st: b.st }, ishaq = npcActor(g);
  const actors = [salim, boss, ishaq];
  const ang = yawTo(salim.pos, boss.pos);
  const text = 'Thanks to you, his words will be read. And we will remember Jabir.';
  const lamps = [];
  const floatLamps = () => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.5), toneMapped: false });
    for (let i = 0; i < 26; i++) {
      const z = 74 + i * 1.3 + Math.random(), x = canalX(z) + (Math.random() - 0.5) * 2.2;
      const l = new THREE.Group(); l.scale.setScalar(1.8); const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.07, 8), new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.9 }));
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), m); flame.position.y = 0.08; flame.scale.y = 1.8; l.add(cup, flame);
      l.position.set(x, 0.05, z); l.userData.v = 0.15 + Math.random() * 0.15; g.scene.add(l); lamps.push(l);
    }
  };
  const shots = [
    { dur: 4.2, cam: { follow: true, p0: () => V(boss.pos.x + Math.sin(ang + 2.4) * 7, boss.pos.y + 2.6, boss.pos.z + Math.cos(ang + 2.4) * 7), t0: at(boss, 1.4), p1: () => V(boss.pos.x + Math.sin(ang + 1.6) * 6, boss.pos.y + 2.0, boss.pos.z + Math.cos(ang + 1.6) * 6), t1: at(boss, 0.6), fov: 34 } },
    { dur: 4.4, line: { who: 'Salim', text: 'Not for paper. For my brother.', rig: g.player.rig, cue: 'hm' },
      cam: { follow: true, p0: at(salim, 1.7, 1.8, 0.9), t0: headOf(salim), fov: 30 }, dof: headOf(salim), run: () => { salim.facing = yawTo(salim.pos, boss.pos); } },
    { dur: 3.6, caption: 'Most of the Pages were in Ghassan\'s tent.', enter: (d) => d.fade(1, 0.8) },
    { dur: 7, fadeIn: 1.6, caption: 'That evening the village floated a lamp on the canal for each guard who died.',
      enter: () => { floatLamps(); g.lighting?.set?.('dusk', 0); },
      cam: { p0: () => V(canalX(70) + 7, 3.2, 66), t0: () => V(canalX(84), 0.2, 84), p1: () => V(canalX(72) + 5, 2.2, 70), t1: () => V(canalX(88), 0.2, 88), fov: 40 },
      run: (d, k, dt) => { for (const l of lamps) { l.position.z += l.userData.v * dt; l.position.x = canalX(l.position.z) + Math.sin(l.position.z * 2) * 0.4; } } },
    { dur: 4.2, line: { who: 'Salim', text: 'Jabir.', rig: g.player.rig, cue: 'breath' },
      enter: () => { const p = g.player; p.pos.set(canalX(84) - 3, 0, 84); p.pos.y = heightAt(p.pos.x, 84); salim.facing = Math.PI / 2; },
      cam: { follow: true, p0: at(salim, 1.6, 2.2, -1.2), t0: headOf(salim), fov: 28 }, dof: headOf(salim), aperture: 1.2,
      run: (d, k, dt) => { for (const l of lamps) l.position.z += l.userData.v * dt; } },
    { dur: lineDur(text), line: { who: 'Ishaq', text, rig: g.npc, cue: 'breath' },
      enter: () => {
        const p = g.player; p.pos.set(1, 0, 88); p.pos.y = heightAt(1, 88); salim.facing = yawTo(salim.pos, ishaq.pos); ishaq.facing = yawTo(ishaq.pos, salim.pos); ishaq.st.talk = true;
      },
      cam: { follow: true, p0: at(salim, 1.75, -0.9, 0.4), t0: headOf(ishaq), fov: 30 }, dof: headOf(ishaq) },
    ...[['Ishaq', 'But the chest is light. Some of the Pages are missing.'], ['Salim', 'Who has them?'], ['Ishaq', 'Rawh, Ghassan\'s paymaster. He fled east, into the Nahrawan marshes.']].map(([who, line]) => {
      const sp = who === 'Salim' ? salim : ishaq, li = who === 'Salim' ? ishaq : salim;
      return { dur: lineDur(line), line: { who, text: line, rig: sp.rig, cue: who === 'Salim' ? 'hm' : 'breath' }, enter: () => { ishaq.st.talk = who === 'Ishaq'; salim.st.talk = who === 'Salim'; },
        cam: { follow: true, p0: () => { const a = li.pos, f = yawTo(a, sp.pos); return V(a.x - Math.sin(f) * 0.9 + Math.cos(f) * 0.35, a.y + 1.75, a.z - Math.cos(f) * 0.9 - Math.sin(f) * 0.35); }, t0: headOf(sp), fov: 30 }, dof: headOf(sp) };
    }),
    { dur: 6, card: { ar: 'الأهوار', en: 'Act IV · The Marshes', sub: 'Rawh has the last Pages. Follow him into the reeds.' }, stinger: 'title', enter: () => { ishaq.st.talk = false; salim.st.talk = false; },
      cam: { p0: V(8, 6, 98), t0: V(4, 3, 80), p1: V(22, 26, 118), t1: V(14, 2, 70), ease: 'io2' } },
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); }, end: () => { for (const l of lamps) g.scene.remove(l); } };
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

// ================================================================== Round 15: the marshes and al-Karkh
// Arriving in a new region: a wide establishing shot, then Ishaq says who to find first.
export function arrival(g) {
  const salim = playerActor(g), ishaq = npcActor(g), actors = [salim, ishaq], extra = [], sc = g.scene;
  const V0 = SITES.village, face = () => { salim.facing = yawTo(salim.pos, ishaq.pos); ishaq.facing = yawTo(ishaq.pos, salim.pos); };
  const ots = (from, to, side) => ({ follow: true, p0: () => { const a = from.pos, b = to.pos, f = yawTo(a, b); return V(a.x - Math.sin(f) * 0.9 + Math.cos(f) * side, a.y + 1.75, a.z - Math.cos(f) * 0.9 - Math.sin(f) * side); }, t0: headOf(to), fov: 30 });
  const talk = (who) => { ishaq.st.talk = who === 'Ishaq'; salim.st.talk = who === 'Salim'; };
  const say = (who, text) => ({ dur: lineDur(text), line: { who, text, rig: who === 'Salim' ? g.player.rig : g.npc, cue: who === 'Salim' ? 'hm' : 'breath' }, cam: who === 'Salim' ? ots(ishaq, salim, -0.35) : ots(salim, ishaq, 0.35), dof: headOf(who === 'Salim' ? salim : ishaq), enter: () => { face(); talk(who); }, run: () => face() });
  const land = () => { const p = g.player; p.pos.set(HUB.spawn[0], 0, HUB.spawn[1]); p.pos.y = heightAt(p.pos.x, p.pos.z); face(); };
  let shots;
  if (REGION === 'marsh') {
    // a reed boat poled down a channel toward the fishing village
    let a0 = 0, best = null;
    for (let i = 0; i < 48 && !best; i++) { const a = i / 48 * Math.PI * 2, x = V0.x + Math.sin(a) * 32, z = V0.z + Math.cos(a) * 32, x2 = V0.x + Math.sin(a) * 58, z2 = V0.z + Math.cos(a) * 58; if (heightAt(x, z) < WATER_Y - 0.35 && heightAt(x2, z2) < WATER_Y - 0.35 && heightAt((x + x2) / 2, (z + z2) / 2) < WATER_Y - 0.35) { best = [x, z, x2, z2]; a0 = a; } }
    const [nx, nz, fx, fz] = best || [V0.x + 30, V0.z - 30, V0.x + 56, V0.z - 56];
    const boat = mashuf(6); sc.add(boat); extra.push(boat);
    const poler = actor(humanoid({ robe: '#d8ccb0', robe2: '#4a5a4a', turban: 0x3a3a2a, beard: 0x2a1a10, skin: 0x7a4a2a, weapon: 'spear' }), V(fx, WATER_Y + 0.2, fz), 0);
    sc.add(poler.rig); extra.push(poler.rig); actors.push(poler);
    const glide = (k) => {
      const x = fx + (nx - fx) * k, z = fz + (nz - fz) * k, f = Math.atan2(nx - fx, nz - fz);
      boat.position.set(x, WATER_Y - 0.18 + Math.sin(k * 20) * 0.02, z); boat.rotation.y = f;
      poler.pos.set(x - Math.sin(f) * 1.9, WATER_Y + 0.14, z - Math.cos(f) * 1.9); poler.facing = f;
      g.player.pos.set(x + Math.sin(f) * 0.9, WATER_Y + 0.14, z + Math.cos(f) * 0.9); salim.facing = f;
      poler.st.action = 'thrust'; poler.st.actionT = (k * 6) % 1;
    };
    shots = [
      { dur: 6.5, card: { ar: 'الأهوار', en: 'Act IV · The Marshes', sub: 'The Nahrawan, east of Baghdad, two days later' }, stinger: 'title', fadeIn: 1.4,
        cam: { p0: () => V(fx + 14, 9, fz + 10), t0: () => V((fx + nx) / 2, 0, (fz + nz) / 2), p1: () => V(fx + 6, 4, fz + 14), t1: () => V(nx, 0.5, nz) }, run: (d, k) => glide(k * 0.45) },
      { dur: 5.5, caption: 'Where the old canal broke its banks, the land became water and reed.', noWait: true,
        cam: { follow: true, p0: () => V(g.player.pos.x + 4, 2.6, g.player.pos.z + 5), t0: at(salim, 1.5), p1: () => V(g.player.pos.x + 3, 2.2, g.player.pos.z + 4), t1: at(salim, 1.5), fov: 36 }, dof: headOf(salim), run: (d, k) => { glide(0.45 + k * 0.55); if (k > 0.75) d.fade(1, 0.9); } },
      { dur: 3.2, fadeIn: 1.0, enter: () => { boat.visible = false; poler.rig.visible = false; land(); },
        cam: { p0: () => V(ishaq.pos.x + 6, ishaq.pos.y + 3, ishaq.pos.z + 7), t0: at(ishaq, 1.3), p1: () => V(ishaq.pos.x + 4, ishaq.pos.y + 2.4, ishaq.pos.z + 5), t1: at(ishaq, 1.3) } },
      say('Ishaq', 'The fishermen say Rawh paid for boats, and for silence.'),
      say('Salim', 'Then someone here will talk.'),
      say('Ishaq', 'Start with Marwan. His men hold the reed camp to the west.'),
    ];
  } else {
    // al-Karkh: a crane shot down a burned lane toward the Round City's wall, then the khan
    const S = SITES.serai;
    shots = [
      { dur: 6.5, card: { ar: 'الكرخ', en: 'Act V · Al-Karkh', sub: 'The market quarter outside the Round City, burned in the siege' }, stinger: 'title', fadeIn: 1.4,
        cam: { p0: () => V(S.x - 30, 22, S.z + 40), t0: () => V(S.x + 30, 6, S.z - 40), p1: () => V(S.x - 10, 12, S.z + 14), t1: () => V(S.x + 80, 14, S.z - 110), ease: 'io2' }, enter: () => land() },
      { dur: 5.0, caption: 'A year after the siege, al-Karkh is still black with ash.', noWait: true,
        cam: { p0: () => V(S.x + 6, 3.5, S.z + 12), t0: () => V(S.x, 1.5, S.z - 6), p1: () => V(S.x + 2, 3, S.z + 6), t1: () => V(S.x - 2, 1.4, S.z - 12), fov: 40 }, run: (d, k) => { if (k > 0.8) d.fade(1, 0.8); } },
      { dur: 3.0, fadeIn: 1.0, cam: { p0: () => V(ishaq.pos.x + 6, ishaq.pos.y + 3, ishaq.pos.z + 7), t0: at(ishaq, 1.3), p1: () => V(ishaq.pos.x + 4, ishaq.pos.y + 2.4, ishaq.pos.z + 5), t1: at(ishaq, 1.3) }, enter: () => face() },
      say('Ishaq', 'The scholars of the House of Wisdom will keep the Pages safe, if we can get them there.'),
      say('Salim', 'Who holds them now?'),
      say('Ishaq', 'The buyer\'s men. Their captain is \'Utba. Start with \'Asim, in the burned suq.'),
    ];
  }
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); },
    end: () => { for (const r of extra) sc.remove(r); talk(null); land(); g.player.st.action = null; } };
}

// Rawh falls at the weir: he says where the last bundle went, and Rawh's own boats carry Salim on to al-Karkh
export function rawhFalls(g, b) {
  const salim = playerActor(g), boss = { rig: b.rig, pos: b.pos, get facing() { return b.facing; }, set facing(v) { b.facing = v; }, st: b.st };
  const actors = [salim, boss], ang = yawTo(salim.pos, boss.pos);
  const shots = [
    { dur: 3.6, cam: { follow: true, p0: () => V(boss.pos.x + Math.sin(ang + 2.4) * 7, boss.pos.y + 2.6, boss.pos.z + Math.cos(ang + 2.4) * 7), t0: at(boss, 1.0), p1: () => V(boss.pos.x + Math.sin(ang + 1.8) * 6, boss.pos.y + 2.0, boss.pos.z + Math.cos(ang + 1.8) * 6), t1: at(boss, 0.5), fov: 34 } },
    { dur: lineDur('Too late. I sent the last bundle up the canal at dawn.'), line: { who: 'Rawh', text: 'Too late. I sent the last bundle up the canal at dawn.', rig: b.rig, cue: 'breath' },
      cam: { follow: true, p0: at(salim, 2.2, -2.8, 1.4), t0: at(boss, 0.6), p1: at(salim, 2.1, -2.5, 1.2), t1: at(boss, 0.6), fov: 38 }, dof: at(boss, 0.6), aperture: 1.0 },
    { dur: 3.2, line: { who: 'Salim', text: 'To whom?', rig: g.player.rig, cue: 'hm' }, cam: { follow: true, p0: at(salim, 1.7, 1.8, 0.9), t0: headOf(salim), fov: 30 }, dof: headOf(salim), run: () => { salim.facing = yawTo(salim.pos, boss.pos); } },
    { dur: lineDur('The buyer\'s men, in al-Karkh. They will burn it where the city can watch.'), line: { who: 'Rawh', text: 'The buyer\'s men, in al-Karkh. They will burn it where the city can watch.', rig: b.rig, cue: 'breath' },
      cam: { follow: true, p0: at(salim, 2.2, -2.8, 1.4), t0: at(boss, 0.6), fov: 38 }, dof: at(boss, 0.6), aperture: 1.0 },
    { dur: 4.0, caption: 'That night Rawh\'s own boats carried Salim and Ishaq up the canal to Baghdad.', enter: (d) => d.fade(1, 0.8) },
    { dur: 6, card: { ar: 'الكرخ', en: 'Act V · Al-Karkh', sub: 'The buyer\'s men will burn the Pages. Get there first.' }, stinger: 'title', fadeIn: 1.2,
      cam: { p0: () => V(boss.pos.x, 30, boss.pos.z + 30), t0: () => V(boss.pos.x, 0, boss.pos.z - 30), p1: () => V(boss.pos.x - 10, 40, boss.pos.z + 50), t1: () => V(boss.pos.x - 20, 0, boss.pos.z - 60), ease: 'io2' } },
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); } };
}

// The finale: the Pages taken from the pyre, given to the scholars in the khan, and a lamp on the canal for Jabir
export function finale(g, b) {
  const salim = playerActor(g), boss = { rig: b.rig, pos: b.pos, get facing() { return b.facing; }, set facing(v) { b.facing = v; }, st: b.st }, ishaq = npcActor(g);
  const sc = g.scene, extra = [], actors = [salim, boss, ishaq], V0 = SITES.village, A = SITES.arch;
  const scholar = actor(humanoid({ robe: '#e8e0cc', robe2: '#2a3a5a', turban: 0xf0ead8, beard: 0xb8b0a0, beardLen: 1, skin: 0x9a6a48, weapon: null, sash: 0x2a3a5a, build: 0.9, belly: 0.3, tiraz: true }), ground(V0.x - 13.8, V0.z - 0.5), Math.PI / 2);
  sc.add(scholar.rig); extra.push(scholar.rig); scholar.rig.visible = false; actors.push(scholar);
  const ang = yawTo(salim.pos, boss.pos), pyre = V(A.x, heightAt(A.x, A.z - 13), A.z - 13);
  const lamps = [];
  const floatLamps = (z0) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.5), toneMapped: false }), cupM = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.9 });
    for (let i = 0; i < 20; i++) {
      const z = z0 - 10 + i * 1.3 + Math.random(), x = canalX(z) + (Math.random() - 0.5) * 2.2;
      const l = new THREE.Group(); l.scale.setScalar(1.8); const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.07, 8), cupM);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), m); flame.position.y = 0.08; flame.scale.y = 1.8; l.add(cup, flame);
      l.position.set(x, -0.5, z); l.userData.v = 0.15 + Math.random() * 0.15; sc.add(l); lamps.push(l);
    }
  };
  const L = (who, rig, text, cam, dof, enter) => ({ dur: lineDur(text), line: { who, text, rig, cue: who === 'Salim' ? 'hm' : 'breath' }, cam, dof, enter });
  // wider over-the-shoulder: the scholar's big turban would fill a tight one
  const ots = (from, to, side) => ({ follow: true, p0: () => { const a = from.pos, b2 = to.pos, f = yawTo(a, b2), sd = side * 1.9; return V(a.x - Math.sin(f) * 1.2 + Math.cos(f) * sd, a.y + 1.95, a.z - Math.cos(f) * 1.2 - Math.sin(f) * sd); }, t0: headOf(to), fov: 32 });
  const LZ = 92;
  const shots = [
    { dur: 3.8, cam: { follow: true, p0: () => V(boss.pos.x + Math.sin(ang + 2.4) * 7, boss.pos.y + 2.6, boss.pos.z + Math.cos(ang + 2.4) * 7), t0: at(boss, 1.0), p1: () => V(boss.pos.x + Math.sin(ang + 1.7) * 6, boss.pos.y + 2.0, boss.pos.z + Math.cos(ang + 1.7) * 6), t1: at(boss, 0.5), fov: 34 } },
    { dur: 4.4, caption: 'The Pages were still on the pyre. Not one had burned.',
      enter: () => { const p = g.player; p.pos.set(pyre.x + 1.8, 0, pyre.z + 2.2); p.pos.y = heightAt(p.pos.x, p.pos.z); salim.facing = yawTo(salim.pos, pyre); act(salim, 'command', 2.4); },
      cam: { p0: () => V(pyre.x + 5, pyre.y + 2.4, pyre.z + 5), t0: () => V(pyre.x, pyre.y + 1.2, pyre.z), p1: () => V(pyre.x + 4, pyre.y + 2, pyre.z + 4.2), t1: () => V(pyre.x, pyre.y + 1.2, pyre.z), fov: 36 }, run: (d, k) => { if (k > 0.8) d.fade(1, 0.7); } },
    // the khan: Ishaq gives the Pages to a scholar of the House of Wisdom
    { dur: 3.4, fadeIn: 1.0, enter: () => {
      scholar.rig.visible = true;
      const p = g.player; p.pos.set(V0.x - 10.2, 0, V0.z + 1.8); p.pos.y = heightAt(p.pos.x, p.pos.z);
      ishaq.pos.set(V0.x - 11, heightAt(V0.x - 11, V0.z - 0.6), V0.z - 0.6);
      salim.facing = yawTo(salim.pos, scholar.pos); ishaq.facing = yawTo(ishaq.pos, scholar.pos); scholar.facing = yawTo(scholar.pos, ishaq.pos);
    }, cam: { p0: () => V(V0.x - 6, 3.4, V0.z + 6), t0: () => V(V0.x - 12.5, 1.3, V0.z - 0.5), p1: () => V(V0.x - 7, 2.6, V0.z + 4.5), t1: () => V(V0.x - 12.5, 1.3, V0.z - 0.5), fov: 38 } },
    L('Ishaq', g.npc, 'Every page, brought home by a caravan guard and his brother.', ots(scholar, ishaq, 0.35), headOf(ishaq), () => { ishaq.st.talk = true; act(ishaq, 'cast', 2.4); }),
    L('Hakam', scholar.rig, 'We will copy them, ten times over, for ten cities.', ots(ishaq, scholar, -0.35), headOf(scholar), () => { ishaq.st.talk = false; scholar.st.talk = true; }),
    L('Ishaq', g.npc, 'Then no one can burn them again.', ots(scholar, ishaq, 0.35), headOf(ishaq), () => { scholar.st.talk = false; ishaq.st.talk = true; }),
    { dur: 3.6, caption: 'That evening Salim went down to the canal.', enter: (d) => { ishaq.st.talk = false; d.fade(1, 0.8); } },
    { dur: 7, fadeIn: 1.6, caption: 'He set a lamp on the water for his brother, and one for each guard of the caravan.',
      enter: () => { floatLamps(LZ); g.lighting?.set?.('dusk', 0); scholar.rig.visible = false; },
      cam: { p0: () => V(canalX(LZ - 14) + 7, 3.2, LZ - 18), t0: () => V(canalX(LZ), -0.4, LZ), p1: () => V(canalX(LZ - 12) + 5, 2.2, LZ - 14), t1: () => V(canalX(LZ + 4), -0.4, LZ + 4), fov: 40 },
      run: (d, k, dt) => { for (const l of lamps) { l.position.z += l.userData.v * dt; l.position.x = canalX(l.position.z) + Math.sin(l.position.z * 2) * 0.4; } } },
    { dur: 4.4, line: { who: 'Salim', text: 'Jabir. It is done.', rig: g.player.rig, cue: 'breath' },
      enter: () => { const p = g.player; p.pos.set(canalX(LZ) - 4.5, 0, LZ); p.pos.y = heightAt(p.pos.x, LZ); salim.facing = Math.PI / 2; ishaq.pos.set(p.pos.x - 1.4, heightAt(p.pos.x - 1.4, LZ - 1.2), LZ - 1.2); ishaq.facing = Math.PI / 2; },
      cam: { follow: true, p0: at(salim, 1.6, 2.2, -1.2), t0: headOf(salim), fov: 28 }, dof: headOf(salim), aperture: 1.2,
      run: (d, k, dt) => { for (const l of lamps) l.position.z += l.userData.v * dt; } },
    { dur: 4.0, line: { who: 'Ishaq', text: 'We keep the account.', rig: g.npc, cue: 'breath' },
      // a quiet two-shot from over the water, the lamps drifting past below them
      cam: { p0: () => V(canalX(LZ) - 0.6, 1.2, LZ + 1.2), t0: () => V(salim.pos.x - 0.7, salim.pos.y + 1.45, LZ - 0.6), p1: () => V(canalX(LZ) - 0.9, 1.25, LZ + 0.6), t1: () => V(salim.pos.x - 0.7, salim.pos.y + 1.45, LZ - 0.6), fov: 34 },
      enter: () => { ishaq.facing = yawTo(ishaq.pos, salim.pos); ishaq.st.talk = true; },
      run: (d, k, dt) => { for (const l of lamps) l.position.z += l.userData.v * dt; } },
    { dur: 6.5, card: { ar: 'مدينة السلام', en: 'Madinat al-Salam', sub: 'Here ends the chronicle of Salim' }, enter: () => { ishaq.st.talk = false; },
      cam: { p0: () => V(canalX(LZ) - 6, 4, LZ + 8), t0: () => V(canalX(LZ), 0, LZ - 10), p1: () => V(canalX(LZ) - 20, 30, LZ + 40), t1: () => V(canalX(LZ) + 40, 10, LZ - 120), ease: 'io2' },
      run: (d, k, dt) => { for (const l of lamps) l.position.z += l.userData.v * dt; } },
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); },
    end: () => { for (const l of lamps) sc.remove(l); for (const r of extra) sc.remove(r); const [ix, iz] = HUB.ishaq; ishaq.pos.set(ix, heightAt(ix, iz), iz); } };
}
