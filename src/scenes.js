import * as THREE from 'three';
import { humanoid, camel, animateCamel } from './characters.js';
import { heightAt, canalX, SITES, WATER_Y, CANAL_W } from './terrain.js';
import { barge } from './docksprops.js';
import { REGION, HUB } from './region.js';
import { mashuf } from './regionprops.js';
import { LOOK, byzify } from './byz.js';
import { horseRider } from './foes20.js';
import { choose, chosen } from './story25.js';
import { lineClear } from './collision.js';

// The story's cinematics. Each returns a scene definition for the Director.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ground = (x, z, y = 0) => V(x, heightAt(x, z) + y, z);
const dry = (x, z, y = 0) => V(x, Math.max(heightAt(x, z), 0) + y, z); // never below the water line
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
// Round 28: a camera spot in front of an actor on the first of the given sides with a clear line to him (walls and
// piers used to fill half the frame), at a height set from his head, so a tall or scaled man is framed by his face
function faceCam(a, fwd, sides, dy = -0.2) {
  let side = null;
  return () => {
    if (side === null) { side = sides[0]; for (const sd of sides) { const p = at(a, 1, fwd, sd)(); if (lineClear(a.pos.x, a.pos.z, p.x, p.z)) { side = sd; break; } } }
    const p = at(a, 1, fwd, side)(); p.y = headOf(a)().y + dy; return p;
  };
}
// a look point under the head, so the face sits in the upper part of the frame, clear of the subtitle bar
const faceAim = (a, dy = -0.4) => () => headOf(a)().add(V(0, dy, 0));
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
  // Round 23: riders of Arsaber's company in Byzantine mail; the bowman is Tatzates
  const archer = add(actor(humanoid(byzify({ ...LOOK.toxotes(), robe: '#1e2430', robe2: '#8a2a1a', beard: 0x1a120c, cloak: 0x1a1a22 })), ground(27, 113), -Math.PI / 2));
  const b1 = add(actor(humanoid(byzify({ ...LOOK.skoutatos(), shieldTint: 0 })), ground(28.5, 117), -Math.PI / 2));
  const b2 = add(actor(humanoid(byzify({ ...LOOK.kataphraktos(), weapon: 'sword', offhand: 'shield', shieldTint: 0 })), ground(26, 121), -Math.PI / 2));
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
    { dur: 4.6, line: { who: 'Jabir', text: 'Two more days to Baghdad, Salim. Then home.', rig: guard1.rig, cue: 'hm', expr: 'warm' },
      cam: { follow: true, p0: at(guard1, 1.8, 2.8, 2.2), t0: at(guard1, 1.55, -1, 0), p1: at(guard1, 1.75, 2.4, 1.8), t1: at(guard1, 1.55, -1, 0), fov: 34 }, dof: headOf(guard1), aperture: 1.4,
      run: (d, k, dt) => march(dt) },
    { dur: 4.4, line: { who: 'Salim', text: 'Too quiet, brother. I do not like it.', rig: g.player.rig, cue: 'hm', expr: 'wary' },
      cam: { follow: true, p0: at(salim, 1.75, 2.6, 1.6), t0: at(salim, 1.6, -1.5, -0.6), p1: at(salim, 1.7, 2.3, 1.3), t1: at(salim, 1.6, -1.5, -0.6) }, dof: headOf(salim), aperture: 1.6,
      run: (d, k, dt) => { march(dt); salim.st.headYaw = -Math.sin(k * Math.PI) * 0.6; } },
    // riders on the ridge, seen from far away; they only stand and watch
    { dur: 3.6, caption: 'Riders in Byzantine mail were waiting on the dunes.', noWait: true, cam: { p0: () => ground(17, 109, 1.8), t0: () => ground(27, 116, 1.6), p1: () => ground(17.6, 110.2, 1.9), t1: () => ground(27, 116, 1.6), fov: 32 }, stinger: 'ambush',
      run: (d, k, dt) => { march(dt, 0.8); for (const b of [archer, b1, b2]) b.st.crouch = Math.max(0, 1 - k * 1.6); salim.st.headYaw = 0; if (k > 0.7) d.fade(1, 1.0); } },
    { dur: 3.4, caption: 'They attacked the caravan at dusk.',
      enter: (d) => { d.fade(1, 0.01); d.audio.vocal('shout', 0.9); for (const a of caravan) a.halt = true; hideBandits(); } },
    { dur: 4.8, fadeIn: 1.4, line: { who: 'Jabir', text: 'Salim... the chest. Do not let them burn it.', rig: guard1.rig, cue: 'breath', expr: 'pain', react: 'grief' },
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
    { dur: 3.6, line: { who: 'Salim', text: 'I will bring it back, brother. I promise.', rig: g.player.rig, cue: 'breath', expr: 'grief' },
      cam: { follow: true, p0: at(salim, 1.5, 1.9, 1.0), t0: headOf(salim), p1: at(salim, 1.45, 1.7, 0.9), t1: headOf(salim), fov: 32 }, dof: headOf(salim), aperture: 1.3,
      run: () => { salim.st.crouch = 0.85; } },
    { dur: 4.2, caption: 'Jabir did not live to see Baghdad. The raiders had taken the chest.', enter: (d) => d.fade(1, 1.2) },
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
    'The Pages: the writings of my old teacher. A Byzantine envoy came under the smoke of the war. His soldiers took the Pages.',
    'Bardanes leads them in the Sawad, and he split the Pages between his men. Get them back. Start with Photeinos, at the old caravanserai.',
  ];
  const face = () => { salim.facing = yawTo(salim.pos, ishaq.pos); ishaq.facing = yawTo(ishaq.pos, salim.pos); };
  const ots = (from, to, side) => ({ follow: true, p0: () => { const a = from.pos, b = to.pos, f = yawTo(a, b); return V(a.x - Math.sin(f) * 0.9 + Math.cos(f) * side, a.y + 1.75, a.z - Math.cos(f) * 0.9 - Math.sin(f) * side); }, t0: headOf(to), fov: 30 });
  const talk = (on) => { ishaq.st.talk = on; };
  const shots = [
    { dur: 3.2, fadeIn: 1.0, cam: { p0: () => V(-0.5 + 5.5, heightAt(4, 90) + 2.6, 92), t0: () => V(-0.5, 1.4 + heightAt(0, 86), 86), p1: () => V(3.5, heightAt(3, 90) + 2.2, 90.5), t1: () => V(-0.5, 1.4 + heightAt(0, 86), 86) },
      enter: () => { face(); g.npcMark && (g.npcMark.visible = false); } },
    { dur: lineDur(L[0]), line: { who: 'Ishaq', text: L[0], rig: g.npc, cue: 'breath' }, cam: ots(salim, ishaq, 0.35), dof: headOf(ishaq), enter: () => talk(true), run: () => face() },
    { dur: 3.6, line: { who: 'Salim', text: 'He died for that chest. What was in it?', rig: g.player.rig, cue: 'hm', expr: 'grief', react: 'sad' }, cam: ots(ishaq, salim, -0.35), dof: headOf(salim), enter: () => { talk(false); salim.st.talk = true; } },
    { dur: lineDur(L[1]), line: { who: 'Ishaq', text: L[1], rig: g.npc }, cam: ots(salim, ishaq, 0.4), dof: headOf(ishaq), enter: () => { salim.st.talk = false; talk(true); act(ishaq, 'cast', 2.4); } },
    { dur: lineDur(L[2]), line: { who: 'Ishaq', text: L[2], rig: g.npc }, cam: { follow: true, p0: at(ishaq, 1.6, 2.4, 1.6), t0: headOf(ishaq), p1: at(ishaq, 1.6, 2.0, 1.0), t1: headOf(ishaq), fov: 32 }, dof: headOf(ishaq) },
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); }, end: () => { talk(false); salim.st.talk = false; ishaq.st.action = null; } };
}

// ------------------------------------------------------------------ a lieutenant falls, and the next act begins
export function lieutenantFalls(g, e, { who, text, card }) {
  // Round 20: Salim walks up and kneels by the fallen man; his last words in a close shot from above,
  // Salim's reaction from low, then the crane up for the act card (no slow motion, nothing shown of the blow)
  const salim = playerActor(g), foe = { rig: e.rig, pos: e.pos, get facing() { return e.facing; }, set facing(v) { e.facing = v; }, st: e.st };
  const actors = [salim, foe];
  const dir = V(salim.pos.x - foe.pos.x, 0, salim.pos.z - foe.pos.z); if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1); dir.normalize();
  const spot = V(foe.pos.x + dir.x * 1.15, salim.pos.y, foe.pos.z + dir.z * 1.15);
  const side = V(dir.z, 0, -dir.x);
  // low, from beyond the fallen man: he lies across the foreground, Salim kneels over him
  const mid = () => V(spot.x * 0.6 + foe.pos.x * 0.4, salim.pos.y + 0.72, spot.z * 0.6 + foe.pos.z * 0.4);
  const faceDown = () => V(foe.pos.x - dir.x * 2.3 + side.x * 1.2, foe.pos.y + 0.62, foe.pos.z - dir.z * 2.3 + side.z * 1.2);
  let kneel = 0;
  // Round 25: Photeinos is beaten, not killed: he kneels, confesses, and Salim decides what becomes of him
  const spare = who === 'Photeinos' || who === 'Tatzates'; // Round 26: Tatzates too
  if (spare) { e.spared = true; e.removed = false; if (!e.rig.parent) g.scene.add(e.rig); e.rig.visible = true; }
  const up = () => { if (!spare) return; e.st.dead = false; e.st.deadT = 0; e.deadT = 0; e.st.action = null; e.st.crouch = 0.85; e.rig.visible = true; foe.facing = yawTo(foe.pos, salim.pos); };
  const closeSalim = { follow: true, p0: () => { const h = headOf(salim)(); return V(h.x - dir.x * 1.1 + side.x * 0.35, h.y - 0.25, h.z - dir.z * 1.1 + side.z * 0.35); }, t0: headOf(salim), fov: 30 };
  const overSalim = { follow: true, p0: () => { const h = headOf(salim)(); return V(h.x + dir.x * 0.5 + side.x * 0.9, h.y + 0.1, h.z + dir.z * 0.5 + side.z * 0.9); }, t0: headOf(foe), fov: 32 };
  // the choice is framed wide from the side, both men in the top half of the frame, clear of the buttons below
  const twoShot = { follow: true, p0: () => V(spot.x * 0.5 + foe.pos.x * 0.5 + side.x * 4.2, salim.pos.y + 1.9, spot.z * 0.5 + foe.pos.z * 0.5 + side.z * 4.2), t0: () => V(spot.x * 0.5 + foe.pos.x * 0.5, salim.pos.y + 0.55, spot.z * 0.5 + foe.pos.z * 0.5), fov: 36 };
  const pho = (k) => () => chosen(g, 'photeinos') === k;
  // Round 26: Tatzates, the bowman who shot Jabir: chains for Baghdad, or a cut bowstring and the road north
  const tz = (k) => () => chosen(g, 'tatzates') === k;
  const tzShots = [
    { dur: 0.8, choice: { prompt: 'Tatzates is beaten. His arrow killed Jabir. What becomes of him?', options: [
      { label: 'Bind him. Baghdad will judge him.', fx: () => choose(g, 'tatzates', 'chains') },
      { label: 'Cut his bowstring and let him walk.', fx: () => choose(g, 'tatzates', 'free') }] }, cam: twoShot, dof: headOf(foe), aperture: 0.6, run: () => up() },
    { when: tz('chains'), dur: lineDur('Baghdad will hear every name you were paid for. Jabir\'s first.'), line: { who: 'Salim', text: 'Baghdad will hear every name you were paid for. Jabir\'s first.', rig: g.player.rig, cue: 'hm', expr: 'resolve' }, cam: closeSalim, dof: headOf(salim), run: () => up() },
    { when: tz('chains'), dur: lineDur('And when it is done, guard, the dune will still be there.'), line: { who: 'Tatzates', text: 'And when it is done, guard, the dune will still be there.', rig: e.rig, cue: 'breath', expr: 'sad' }, cam: overSalim, dof: headOf(foe), run: () => up() },
    { when: tz('free'), dur: lineDur('No more arrows. Walk north, and do not turn round.'), line: { who: 'Salim', text: 'No more arrows. Walk north, and do not turn round.', rig: g.player.rig, cue: 'hm', expr: 'stern' }, cam: closeSalim, dof: headOf(salim), run: () => up() },
    { when: tz('free'), dur: lineDur('You let me live. I do not know what to do with that.'), line: { who: 'Tatzates', text: 'You let me live. I do not know what to do with that.', rig: e.rig, cue: 'breath', expr: 'sad' }, cam: overSalim, dof: headOf(foe), run: () => up() },
  ];
  // after the card: the bowman's road, then a lamp on the Diyala for Jabir (over black, the scene ends on it)
  const tzClose = who !== 'Tatzates' ? [] : [
    { when: tz('chains'), dur: 4.4, caption: 'The bowman was taken down the Diyala to Baghdad in chains, to answer before the qadi.', enter: (d) => d.fade(1, 1.2) },
    { when: tz('free'), dur: 4.4, caption: 'Tatzates walked north toward the frontier with a cut bowstring. No one on the Diyala saw him again.', enter: (d) => d.fade(1, 1.2) },
    { dur: 4.6, caption: 'That night Salim set a lamp on the Diyala for Jabir, and let the current take it.' },
  ];
  const choiceShots = !spare ? [] : who === 'Tatzates' ? tzShots : [
    { dur: 0.8, choice: { prompt: 'Photeinos is beaten. What becomes of him?', options: [
      { label: 'Bind him for the qadi in Baghdad.', fx: () => choose(g, 'photeinos', 'qadi') },
      { label: 'Let him go. He has confessed.', fx: () => choose(g, 'photeinos', 'free') }] }, cam: twoShot, dof: headOf(foe), aperture: 0.6, run: () => up() },
    { when: pho('qadi'), dur: lineDur('The qadi will hear the rest of it.'), line: { who: 'Salim', text: 'The qadi will hear the rest of it.', rig: g.player.rig, cue: 'hm', expr: 'resolve' }, cam: closeSalim, dof: headOf(salim), run: () => up() },
    { when: pho('qadi'), dur: lineDur('Then I will tell it. All of it.'), line: { who: 'Photeinos', text: 'Then I will tell it. All of it.', rig: e.rig, cue: 'breath', expr: 'sad' }, cam: overSalim, dof: headOf(foe), run: () => up() },
    { when: pho('free'), dur: lineDur('Go. If I see you with a sword again, I will not ask twice.'), line: { who: 'Salim', text: 'Go. If I see you with a sword again, I will not ask twice.', rig: g.player.rig, cue: 'hm', expr: 'stern' }, cam: closeSalim, dof: headOf(salim), run: () => up() },
    { when: pho('free'), dur: lineDur('You will not. I read one page, guard. One was enough.'), line: { who: 'Photeinos', text: 'You will not. I read one page, guard. One was enough.', rig: e.rig, cue: 'breath', expr: 'sad' }, cam: overSalim, dof: headOf(foe), run: () => up() },
  ];
  const shots = [
    { dur: 2.6, cam: { follow: true, p0: () => V(spot.x + side.x * 3.2 + dir.x * 1.5, spot.y + 1.1, spot.z + side.z * 3.2 + dir.z * 1.5), t0: at(salim, 1.0), p1: () => V(spot.x + side.x * 2.6 + dir.x * 0.6, spot.y + 0.9, spot.z + side.z * 2.6 + dir.z * 0.6), t1: at(foe, 0.4), fov: 36 },
      run: (d, k, dt) => { walk(salim, spot, 1.6, dt || 1 / 60); } },
    { dur: lineDur(text), line: { who, text, rig: e.rig, cue: 'breath' }, cam: { follow: true, p0: faceDown, t0: mid, p1: () => faceDown().add(V(0, -0.1, 0)).lerp(mid(), 0.15), t1: mid, fov: 36 }, dof: headOf(foe), aperture: 1.6,
      enter: () => { salim.pos.copy(spot); salim.facing = yawTo(salim.pos, foe.pos); }, run: (d, k, dt) => { up(); kneel = Math.min(1, kneel + (dt || 1 / 60) * 2.5); salim.st.crouch = 0.65 * kneel; } },
    { dur: 2.2, cam: { follow: true, p0: () => { const h = headOf(salim)(); return V(h.x - dir.x * 1.1 + side.x * 0.35, h.y - 0.25, h.z - dir.z * 1.1 + side.z * 0.35); }, t0: headOf(salim), fov: 30 }, dof: headOf(salim), aperture: 1.4, run: () => up() },
    ...choiceShots,
    { dur: 5.6, card, stinger: 'title', cam: { p0: at(salim, 1.6, -2.4, 0.8), t0: at(foe, 0.4), p1: () => at(salim, 9, -10, 3)(), t1: at(foe, 0), ease: 'io2' },
      run: (d, k) => { salim.st.crouch = 0.65 * Math.max(0, 1 - k * 3); } },
    ...tzClose,
  ];
  // his surviving men step out of the frame for the scene (they are back when it ends)
  const hidden = g.enemies.filter((o) => o !== e && !o.dead && o.rig.visible && o.pos.distanceTo(e.pos) < 14);
  for (const o of hidden) o.rig.visible = false;
  return { actors, shots, tick: (d, dt) => { up(); for (const a of actors) tickActor(g, a, dt); }, end: () => { salim.st.crouch = 0; for (const o of hidden) o.rig.visible = true; if (spare) e.rig.visible = false; } };
}

// ------------------------------------------------------------------ the act's commander (Bardanes at the arch)
export function bossIntro(g, b, intro = null) {
  const who = b.T.name, I = intro || { text: 'Turn back, guard. Those Pages are going to Constantinople.', card: { ar: 'بردانس', en: 'Bardanes', sub: 'Commander of the envoy\'s company' } };
  const salim = playerActor(g), boss = { rig: b.rig, pos: b.pos, get facing() { return b.facing; }, set facing(v) { b.facing = v; }, st: b.st };
  const actors = [salim, boss];
  const face = () => { boss.facing = yawTo(boss.pos, salim.pos); };
  const shots = [
    { dur: 3.4, cam: { follow: true, p0: at(salim, 1.9, -3.2, 0.9), t0: at(boss, 2.4), p1: at(salim, 1.8, -2.2, 0.7), t1: at(boss, 2.4), fov: 32 }, stinger: 'boss',
      enter: () => { face(); b.st.crouch = 0.8; }, run: (d, k) => { face(); b.st.crouch = 0.8 * (1 - k); } },
    { dur: 5.2, line: { who, text: I.text, rig: b.rig, cue: 'growl', expr: 'anger', react: 'resolve' },
      cam: { follow: true, p0: at(boss, 0.5, 4.6, 1.4), t0: at(boss, 2.25), p1: at(boss, 0.7, 3.6, 0.9), t1: at(boss, 2.3), fov: 34 }, dof: headOf(boss),
      enter: (d) => { act(boss, 'command', 2.6); d.audio.roar?.(); }, run: () => face() },
    // Round 20: Salim's answer is a look, from low and close, before the boss is framed from below for his card
    { dur: 2.0, cam: { follow: true, p0: () => { const h = headOf(salim)(), f = yawTo(salim.pos, boss.pos); return V(h.x + Math.sin(f) * 1.2 + Math.cos(f) * 0.4, h.y - 0.3, h.z + Math.cos(f) * 1.2 - Math.sin(f) * 0.4); }, t0: headOf(salim), fov: 30 }, dof: headOf(salim), aperture: 1.4,
      enter: () => { salim.facing = yawTo(salim.pos, boss.pos); } },
    { dur: 4.6, card: I.card,
      cam: { follow: true, p0: at(boss, 0.5, 6.5, -3.5), t0: at(boss, 2.6), p1: at(boss, 0.7, 5.2, 2.8), t1: at(boss, 2.4), fov: 38 } },
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); }, end: () => { b.rise = 1; b.st.crouch = 0; b.st.action = null; } };
}
export function bossPhase(g, b, enginesBurnt = false, line = null) {
  const boss = { rig: b.rig, pos: b.pos, get facing() { return b.facing; }, set facing(v) { b.facing = v; }, st: b.st }, salim = playerActor(g);
  const shots = [
    { dur: 3.6, slow: 0.5, stinger: 'phase', line: { who: b.T.name, text: line || (enginesBurnt ? 'You burned my engines? Then my men will burn you by hand!' : 'Fire the engines! Burn the road!'), rig: b.rig, cue: 'growl' },
      cam: { follow: true, p0: faceCam(boss, 5, [2, -2, 0.6]), t0: faceAim(boss), p1: faceCam(boss, 3.6, [1.2, -1.2, 0.4], -0.1), t1: faceAim(boss, -0.35), fov: 34, shake: 0.12 }, dof: headOf(boss),
      enter: (d) => { act(boss, 'command', 1.6); d.audio.roar?.(); } },
  ];
  return { actors: [boss, salim], shots, tick: (d, dt) => { tickActor(g, boss, dt); tickActor(g, salim, dt); } };
}

// Bardanes, at a quarter of his life, throws down his shield: fire rings the arena and he fights with the sword alone
export function bossDuel(g, b, enginesBurnt, K = null) {
  const boss = { rig: b.rig, pos: b.pos, get facing() { return b.facing; }, set facing(v) { b.facing = v; }, st: b.st }, salim = playerActor(g);
  const text = K?.duel || (enginesBurnt ? 'No engines left. Then it is just you and me.' : 'You would die for paper? Then die.');
  const shots = [
    { dur: 4.2, slow: 0.4, stinger: 'phase', line: { who: b.T.name, text, rig: b.rig, cue: 'growl' },
      cam: { follow: true, p0: faceCam(boss, 4.2, [1.8, -1.8, 0.6]), t0: faceAim(boss), p1: faceCam(boss, 3.0, [0.8, -0.8, 0.3], -0.1), t1: faceAim(boss, -0.35), fov: 32, shake: 0.08 }, dof: headOf(boss),
      enter: (d) => { act(boss, 'command', 1.8); d.audio.roar?.(); }, run: () => { boss.facing = yawTo(boss.pos, salim.pos); } },
    { dur: 2.2, caption: K?.duelCaption || 'Bardanes rings the arena with fire. Stay inside it.', cam: { follow: true, p0: at(salim, 7, -9, 0), t0: at(boss, 1.2), fov: 44 } },
  ];
  return { actors: [boss, salim], shots, tick: (d, dt) => { tickActor(g, boss, dt); tickActor(g, salim, dt); } };
}

// ------------------------------------------------------------------ epilogue
export function epilogue(g, b) {
  const salim = playerActor(g), boss = { rig: b.rig, pos: b.pos, get facing() { return b.facing; }, set facing(v) { b.facing = v; }, st: b.st }, ishaq = npcActor(g);
  const actors = [salim, boss, ishaq];
  const ang = yawTo(salim.pos, boss.pos);
  const text = 'Thanks to you, his words will be read. And we will remember Jabir.';
  // Round 24: the first time the envoy is seen. A rider on the far bank watches the lamps, then turns for Baghdad.
  const RZ = 96, rx = canalX(RZ) - CANAL_W / 2 - 2.6, envoy = actor(horseRider(byzify({ ...LOOK.officer('#4a1a4a', 0x3a1440), beard: 0x8a8070, beardLen: 0.9, skin: 0xb07a52, sash: 0x5a1a5a, build: 1.1, belly: 0.25, hemY: 0.3, leather: 0x6a5a3a })), ground(rx, RZ), Math.PI / 2);
  envoy.rig.visible = false; g.scene.add(envoy.rig); actors.push(envoy);
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
    { dur: 4.4, line: { who: 'Salim', text: 'Not for paper. For my brother.', rig: g.player.rig, cue: 'hm', expr: 'resolve' },
      cam: { follow: true, p0: at(salim, 1.7, 1.8, 0.9), t0: headOf(salim), fov: 30 }, dof: headOf(salim), run: () => { salim.facing = yawTo(salim.pos, boss.pos); } },
    { dur: 3.6, caption: 'Most of the Pages were in Bardanes\'s tent.', enter: (d) => d.fade(1, 0.8) },
    { dur: 7, fadeIn: 1.6, caption: 'That evening the village floated a lamp on the canal for each guard who died.',
      enter: () => { floatLamps(); g.lighting?.set?.('dusk', 0); },
      cam: { p0: () => V(canalX(70) + 7, 3.2, 66), t0: () => V(canalX(84), 0.2, 84), p1: () => V(canalX(72) + 5, 2.2, 70), t1: () => V(canalX(88), 0.2, 88), fov: 40 },
      run: (d, k, dt) => { for (const l of lamps) { l.position.z += l.userData.v * dt; l.position.x = canalX(l.position.z) + Math.sin(l.position.z * 2) * 0.4; } } },
    { dur: 5.4, caption: 'On the far bank, a rider in a Roman cloak watched the lamps.',
      enter: () => { envoy.rig.visible = true; envoy.facing = yawTo(envoy.pos, V(canalX(RZ), 0, RZ - 6)); },
      // straight across the water from the near bank, low, the lamps drifting between
      cam: { p0: () => dry(canalX(RZ - 4) + CANAL_W / 2 + 1.4, RZ - 4, 1.0), t0: () => at(envoy, 1.9)(), p1: () => dry(canalX(RZ - 3.6) + CANAL_W / 2 + 1.2, RZ - 3.6, 0.95), t1: () => at(envoy, 2.0)(), fov: 24 },
      run: (d, k, dt) => { for (const l of lamps) { l.position.z += l.userData.v * dt; l.position.x = canalX(l.position.z) + Math.sin(l.position.z * 2) * 0.4; } } },
    { dur: 4.6, caption: 'Arsaber, the envoy. Then he turned his horse toward Baghdad.',
      cam: { follow: true, p0: () => dry(canalX(RZ - 3.6) + CANAL_W / 2 + 1.2, RZ - 3.6, 0.95), t0: () => at(envoy, 1.8)(), fov: 26 },
      run: (d, k, dt) => {
        const want = Math.PI; envoy.facing += Math.max(-dt * 1.4, Math.min(dt * 1.4, ((want - envoy.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI));
        if (k > 0.3) { envoy.moving = true; envoy.st.walkBlend = 1; envoy.st.phase += dt * 4; envoy.pos.x += Math.sin(envoy.facing) * dt * 1.6; envoy.pos.z += Math.cos(envoy.facing) * dt * 1.6; envoy.pos.y = heightAt(envoy.pos.x, envoy.pos.z); }
        for (const l of lamps) l.position.z += l.userData.v * dt;
      } },
    { dur: 4.2, line: { who: 'Salim', text: 'Jabir.', rig: g.player.rig, cue: 'breath', expr: 'sad' },
      enter: () => { envoy.rig.visible = false; const p = g.player; p.pos.set(canalX(84) - 3, 0, 84); p.pos.y = heightAt(p.pos.x, 84); salim.facing = Math.PI / 2; },
      cam: { follow: true, p0: at(salim, 1.6, 2.2, -1.2), t0: headOf(salim), fov: 28 }, dof: headOf(salim), aperture: 1.2,
      run: (d, k, dt) => { for (const l of lamps) l.position.z += l.userData.v * dt; } },
    { dur: lineDur(text), line: { who: 'Ishaq', text, rig: g.npc, cue: 'breath' },
      enter: () => {
        const p = g.player; p.pos.set(1, 0, 88); p.pos.y = heightAt(1, 88); salim.facing = yawTo(salim.pos, ishaq.pos); ishaq.facing = yawTo(ishaq.pos, salim.pos); ishaq.st.talk = true;
      },
      cam: { follow: true, p0: at(salim, 1.75, -0.9, 0.4), t0: headOf(ishaq), fov: 30 }, dof: headOf(ishaq) },
    ...[['Ishaq', 'But the chest is light. Some of the Pages are missing.'], ['Salim', 'Who has them?'], ['Ishaq', 'Kallinikos, the master of their fire siphons. He fled east, into the Nahrawan marshes.']].map(([who, line]) => {
      const sp = who === 'Salim' ? salim : ishaq, li = who === 'Salim' ? ishaq : salim;
      return { dur: lineDur(line), line: { who, text: line, rig: sp.rig, cue: who === 'Salim' ? 'hm' : 'breath' }, enter: () => { ishaq.st.talk = who === 'Ishaq'; salim.st.talk = who === 'Salim'; },
        cam: { follow: true, p0: () => { const a = li.pos, f = yawTo(a, sp.pos); return V(a.x - Math.sin(f) * 0.9 + Math.cos(f) * 0.35, a.y + 1.75, a.z - Math.cos(f) * 0.9 - Math.sin(f) * 0.35); }, t0: headOf(sp), fov: 30 }, dof: headOf(sp) };
    }),
    // Round 24: the act card is shown once, on the travel card while the marshes load (main.js TRAVEL_CARD)
    { dur: 1.5, enter: (d) => { ishaq.st.talk = false; salim.st.talk = false; d.fade(1, 1.2); } },
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); }, end: () => { for (const l of lamps) g.scene.remove(l); g.scene.remove(envoy.rig); } };
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
  // Round 24: a wider over-the-shoulder (Ishaq's turban and Arsaber's mailed back filled half of a tight one)
  const ots = (from, to, side) => ({ follow: true, p0: () => { const a = from.pos, b = to.pos, f = yawTo(a, b), sd = side * 1.9; return V(a.x - Math.sin(f) * 1.25 + Math.cos(f) * sd, a.y + 1.95, a.z - Math.cos(f) * 1.25 - Math.sin(f) * sd); }, t0: headOf(to), fov: 32 });
  const talk = (who) => { ishaq.st.talk = who === 'Ishaq'; salim.st.talk = who === 'Salim'; };
  const say = (who, text) => ({ dur: lineDur(text), line: { who, text, rig: who === 'Salim' ? g.player.rig : g.npc, cue: who === 'Salim' ? 'hm' : 'breath' }, cam: who === 'Salim' ? ots(ishaq, salim, -0.35) : ots(salim, ishaq, 0.35), dof: headOf(who === 'Salim' ? salim : ishaq), enter: () => { face(); talk(who); }, run: () => face() });
  const land = () => { const p = g.player; p.pos.set(HUB.spawn[0], 0, HUB.spawn[1]); p.pos.y = heightAt(p.pos.x, p.pos.z); face(); };
  // Round 24: Arsaber at the khan (docks only), at a man's size rather than the boss fight's
  let envoy = null, meet = null, away = null, envoySay = null, ishaqToEnvoy = null;
  if (REGION === 'docks') {
    envoy = actor(humanoid(byzify({ ...LOOK.officer('#4a1a4a', 0x3a1440), weapon: null, offhand: null, beard: 0x8a8070, beardLen: 0.9, skin: 0xb07a52, sash: 0x5a1a5a, scale: 1.08, build: 1.12, belly: 0.3, hemY: 0.3, leather: 0x6a5a3a })), V(0, -50, 0), 0);
    envoy.rig.visible = false; sc.add(envoy.rig); extra.push(envoy.rig); actors.push(envoy);
    meet = () => { const f = yawTo(ishaq.pos, salim.pos) + 1.2; return ground(ishaq.pos.x + Math.sin(f) * 2.3, ishaq.pos.z + Math.cos(f) * 2.3); };
    away = ground(HUB.ishaq[0] + 12, HUB.ishaq[1] + 9);
    const three = () => { envoy.facing = yawTo(envoy.pos, ishaq.pos); ishaq.facing = yawTo(ishaq.pos, envoy.pos); salim.facing = yawTo(salim.pos, envoy.pos); };
    envoySay = (text) => ({ dur: lineDur(text), line: { who: 'Arsaber', text, rig: envoy.rig, cue: 'hm', expr: 'neutral', react: 'wary' }, cam: ots(ishaq, envoy, 0.4), dof: headOf(envoy),
      enter: () => { if (envoy.pos.distanceTo(meet()) > 0.3) envoy.pos.copy(meet()); envoy.st.walkBlend = 0; three(); envoy.st.talk = true; ishaq.st.talk = false; salim.st.talk = false; }, run: () => three() });
    ishaqToEnvoy = (text) => ({ dur: lineDur(text), line: { who: 'Ishaq', text, rig: g.npc, cue: 'breath', expr: 'resolve', react: 'stern' }, cam: ots(envoy, ishaq, -0.4), dof: headOf(ishaq),
      enter: () => { three(); envoy.st.talk = false; ishaq.st.talk = true; }, run: () => three() });
  }
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
      say('Ishaq', 'The fishermen say Kallinikos paid for boats, and for silence.'),
      say('Salim', 'Then someone here will talk.'),
      say('Ishaq', 'Start with Katakylas. His men hold the reed stockade to the west.'),
    ];
  } else if (REGION === 'docks') {
    // Round 20, the river quays: a crane shot along the Tigris at dawn, barges at the quay, then the khan
    const S = SITES.serai, bx = canalX(S.z) - CANAL_W / 2;
    shots = [
      { dur: 6.5, card: { ar: 'الشطّ', en: 'Act VI · The River Quays', sub: 'The quays of al-Karkh on the Tigris, at dawn' }, stinger: 'title', fadeIn: 1.4,
        cam: { p0: () => V(bx + 30, 18, S.z + 70), t0: () => V(bx, 0, S.z + 10), p1: () => V(bx + 8, 8, S.z + 30), t1: () => V(bx - 6, 2, S.z - 40), ease: 'io2' }, enter: () => land() },
      { dur: 5.0, caption: 'Everything Baghdad eats or sells comes up this river, or goes down it.', noWait: true,
        cam: { p0: () => V(bx - 4, 3.2, S.z + 16), t0: () => V(bx + 10, 0.5, S.z - 4), p1: () => V(bx - 2, 2.6, S.z + 10), t1: () => V(bx + 12, 0.5, S.z - 12), fov: 40 }, run: (d, k) => { if (k > 0.8) d.fade(1, 0.8); } },
      { dur: 3.0, fadeIn: 1.0, cam: { p0: () => V(ishaq.pos.x + 6, ishaq.pos.y + 3, ishaq.pos.z + 7), t0: at(ishaq, 1.3), p1: () => V(ishaq.pos.x + 4, ishaq.pos.y + 2.4, ishaq.pos.z + 5), t1: at(ishaq, 1.3) }, enter: () => face() },
      say('Ishaq', 'Hakam\'s copyists worked all night. The first copies sail at dawn, for Wasit and Basra.'),
      // Round 24: the parley. The envoy comes to the khan himself, unarmed, and makes his offer
      { dur: 4.2, caption: 'At noon, Arsaber himself came to the khan, under a truce.',
        enter: () => { envoy.rig.visible = true; envoy.pos.copy(ground(ishaq.pos.x + 7, ishaq.pos.z + 5)); face(); },
        cam: { follow: true, p0: () => V(ishaq.pos.x - 3.5, ishaq.pos.y + 2.2, ishaq.pos.z - 2.5), t0: at(envoy, 1.4), fov: 38 },
        run: (d, k, dt) => { walk(envoy, meet(), 1.3, dt); envoy.st.walkBlend = envoy.pos.distanceTo(meet()) > 0.1 ? 1 : 0; envoy.st.phase += dt * 4 * envoy.st.walkBlend; } },
      envoySay('I am Arsaber, envoy of the Emperor. I did not come to fight you, astronomer.'),
      envoySay('Your city is burning itself. Come north with the Pages. In Constantinople your Teacher would have a library, not a prison.'),
      ishaqToEnvoy('He had a prison here. He still chose to teach here.'),
      { ...envoySay('Then I will take them without you.'), run: (d, k, dt) => { envoy.facing = yawTo(envoy.pos, ishaq.pos); } },
      { ...say('Salim', ''), line: null, dur: 0.8, choice: { prompt: 'Arsaber turns to go.', options: [
        { label: 'Refuse him.', fx: () => choose(g, 'arsaber', 'refuse') },
        { label: 'Promise him a copy, freely given.', fx: () => choose(g, 'arsaber', 'promise') }] },
        // over Salim's shoulder onto Arsaber, who stands in the top third of the frame, clear of the buttons
        cam: { follow: true, p0: () => { const f = yawTo(salim.pos, envoy.pos), h = headOf(salim)(); return V(h.x - Math.sin(f) * 1.5 + Math.cos(f) * 0.75, h.y + 0.3, h.z - Math.cos(f) * 1.5 - Math.sin(f) * 0.75); }, t0: at(envoy, 0.75), fov: 34 }, dof: headOf(envoy),
        run: () => { salim.facing = yawTo(salim.pos, envoy.pos); envoy.facing = yawTo(envoy.pos, salim.pos); } },
      { ...say('Salim', 'Let him try.'), when: () => chosen(g, 'arsaber') !== 'promise', run: (d, k, dt) => { face(); if (k > 0.15) { envoy.facing = yawTo(envoy.pos, away); walk(envoy, away, 1.4, dt); envoy.st.walkBlend = 1; envoy.st.phase += dt * 4; } } },
      { ...say('Salim', 'Wait. When the copying is done, one copy goes north. Freely given. My word on it.'), when: () => chosen(g, 'arsaber') === 'promise', run: () => { face(); envoy.facing = yawTo(envoy.pos, salim.pos); } },
      { ...envoySay('A caravan guard\'s word. My orders are the originals, but I will remember it.'), when: () => chosen(g, 'arsaber') === 'promise', run: (d, k, dt) => { if (k > 0.55) { envoy.facing = yawTo(envoy.pos, away); walk(envoy, away, 1.4, dt); envoy.st.walkBlend = 1; envoy.st.phase += dt * 4; } } },
      { ...say('Ishaq', 'He holds the quays, and his ship waits there. Start with Rhentakios, at the shipyard.'), enter: () => { envoy.rig.visible = false; face(); talk('Ishaq'); } },
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
      say('Salim', 'Jabir wanted to see Baghdad. Not like this.'),
      say('Ishaq', 'Arsaber\'s men hold the Pages here. Their captain is Krateros. Start with Narses, in the burned quarter.'),
    ];
  }
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); },
    end: () => { for (const r of extra) sc.remove(r); talk(null); land(); g.player.st.action = null; } };
}

// Kallinikos falls at the weir: he says where the last bundle went, and his own boats carry Salim on to al-Karkh
export function rawhFalls(g, b) {
  const salim = playerActor(g), boss = { rig: b.rig, pos: b.pos, get facing() { return b.facing; }, set facing(v) { b.facing = v; }, st: b.st };
  const actors = [salim, boss], ang = yawTo(salim.pos, boss.pos);
  // Round 25: the reed village burning beyond the weir (for the choice), on dry ground past Kallinikos
  const burnAt = dry(boss.pos.x + Math.sin(ang) * 26, boss.pos.z + Math.cos(ang) * 26);
  const shots = [
    { dur: 3.6, cam: { follow: true, p0: () => V(boss.pos.x + Math.sin(ang + 2.4) * 7, boss.pos.y + 2.6, boss.pos.z + Math.cos(ang + 2.4) * 7), t0: at(boss, 1.0), p1: () => V(boss.pos.x + Math.sin(ang + 1.8) * 6, boss.pos.y + 2.0, boss.pos.z + Math.cos(ang + 1.8) * 6), t1: at(boss, 0.5), fov: 34 } },
    { dur: lineDur('Too late. I sent the last bundle up the canal at dawn.'), line: { who: 'Kallinikos', text: 'Too late. I sent the last bundle up the canal at dawn.', rig: b.rig, cue: 'breath' },
      cam: { follow: true, p0: at(salim, 2.2, -2.8, 1.4), t0: at(boss, 0.6), p1: at(salim, 2.1, -2.5, 1.2), t1: at(boss, 0.6), fov: 38 }, dof: at(boss, 0.6), aperture: 1.0 },
    { dur: 3.2, line: { who: 'Salim', text: 'To whom?', rig: g.player.rig, cue: 'hm' }, cam: { follow: true, p0: at(salim, 1.7, 1.8, 0.9), t0: headOf(salim), fov: 30 }, dof: headOf(salim), run: () => { salim.facing = yawTo(salim.pos, boss.pos); } },
    { dur: lineDur('To Krateros, in al-Karkh. He will burn it before he lets your caliph\'s men take it back.'), line: { who: 'Kallinikos', text: 'To Krateros, in al-Karkh. He will burn it before he lets your caliph\'s men take it back.', rig: b.rig, cue: 'breath' },
      cam: { follow: true, p0: at(salim, 2.2, -2.8, 1.4), t0: at(boss, 0.6), fov: 38 }, dof: at(boss, 0.6), aperture: 1.0 },
    // Round 25: the choice. Behind the weir the reed village is burning
    { dur: 0.8, choice: { prompt: 'Behind the weir, the reed village is burning.', options: [
      { label: 'Chase the bundle up the canal tonight.', fx: () => choose(g, 'marsh', 'chase') },
      { label: 'Stay and fight the fire with the marsh-folk.', fx: () => choose(g, 'marsh', 'stay') }] },
      // over his shoulder, out across the water to the village burning beyond the weir (Salim in the upper left, clear of the buttons)
      cam: { follow: true, p0: () => { const f = yawTo(salim.pos, burnAt), h = headOf(salim)(); return V(h.x - Math.sin(f) * 1.9 - Math.cos(f) * 0.9, h.y + 0.25, h.z - Math.cos(f) * 1.9 + Math.sin(f) * 0.9); }, t0: () => V(burnAt.x, burnAt.y + 1.2, burnAt.z), fov: 40 },
      enter: () => { salim.facing = yawTo(salim.pos, burnAt); },
      run: (d, k, dt) => { for (let i = 0; i < 6; i++) { const a2 = Math.random() * 6.28, r2 = Math.random() * 7; g.fx.fire(V(burnAt.x + Math.cos(a2) * r2, burnAt.y + Math.random() * 1.5, burnAt.z + Math.sin(a2) * r2), 2.6 + Math.random() * 1.4); } } },
    { when: () => chosen(g, 'marsh') === 'chase', dur: 3.2, line: { who: 'Salim', text: 'Ishaq. Find us a boat.', rig: g.player.rig, cue: 'hm', expr: 'resolve' }, cam: { follow: true, p0: at(salim, 1.7, 1.8, 0.9), t0: headOf(salim), fov: 30 }, dof: headOf(salim) },
    { when: () => chosen(g, 'marsh') === 'chase', dur: 4.0, caption: 'That night Kallinikos\'s own boats carried Salim and Ishaq up the canal to Baghdad.', enter: (d) => d.fade(1, 0.8) },
    { when: () => chosen(g, 'marsh') === 'stay', dur: lineDur('The Pages can wait one night. These people cannot.'), line: { who: 'Salim', text: 'The Pages can wait one night. These people cannot.', rig: g.player.rig, cue: 'hm', expr: 'resolve' }, cam: { follow: true, p0: at(salim, 1.7, 1.8, 0.9), t0: headOf(salim), fov: 30 }, dof: headOf(salim) },
    { when: () => chosen(g, 'marsh') === 'stay', dur: 4.6, caption: 'They fought the fire until dawn. Then the marsh-folk poled Salim and Ishaq up the canal to Baghdad.', enter: (d) => d.fade(1, 0.8) },
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
    { dur: 4.4, caption: 'The Pages were still on the pyre. Not one had burned.', when: () => chosen(g, 'marsh') !== 'stay',
      enter: () => { const p = g.player; p.pos.set(pyre.x + 1.8, 0, pyre.z + 2.2); p.pos.y = heightAt(p.pos.x, p.pos.z); salim.facing = yawTo(salim.pos, pyre); act(salim, 'command', 2.4); },
      cam: { p0: () => V(pyre.x + 5, pyre.y + 2.4, pyre.z + 5), t0: () => V(pyre.x, pyre.y + 1.2, pyre.z), p1: () => V(pyre.x + 4, pyre.y + 2, pyre.z + 4.2), t1: () => V(pyre.x, pyre.y + 1.2, pyre.z), fov: 36 }, run: (d, k) => { if (k > 0.8) d.fade(1, 0.7); } },
    { dur: 4.8, caption: 'The Pages were still on the pyre. The edges of a few had caught. Hakam\'s copyists would mend them from memory.', when: () => chosen(g, 'marsh') === 'stay',
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
    // Round 20: the chronicle goes on to the river quays (Act VI); the lamps are lit there, at its end
    // Round 32: the history turning, over black
    { dur: 5.4, caption: 'That autumn the brothers\' war was over. Baghdad began to count what it had lost: whole quarters, a caliph, and the paper-sellers\' lane.', enter: (d) => { ishaq.st.talk = false; d.fade(1, 0.8); } },
    { dur: 4.4, caption: 'Hakam\'s copyists began that night, by one lamp. By dawn the first copies were bound for the river.' },
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); },
    end: () => { for (const l of lamps) sc.remove(l); for (const r of extra) sc.remove(r); const [ix, iz] = HUB.ishaq; ishaq.pos.set(ix, heightAt(ix, iz), iz); } };
}

// Round 20: the docks finale. Arsaber falls at the bridge; the copyists' barge sails downriver with the first copies;
// that evening Salim sets lamps on the Tigris for his brother. The chronicle ends here.
export function docksFinale(g, b) {
  const salim = playerActor(g), boss = { rig: b.rig, pos: b.pos, get facing() { return b.facing; }, set facing(v) { b.facing = v; }, st: b.st }, ishaq = npcActor(g);
  const sc = g.scene, extra = [], actors = [salim, boss, ishaq], ang = yawTo(salim.pos, boss.pos);
  const bank = (z) => canalX(z) - CANAL_W / 2, QZ = -6, LZ = 34;
  const scholar = actor(humanoid({ robe: '#e8e0cc', robe2: '#2a3a5a', turban: 0xf0ead8, beard: 0xb8b0a0, beardLen: 1, skin: 0x9a6a48, weapon: null, sash: 0x2a3a5a, build: 0.9, belly: 0.3, tiraz: true }), V(bank(QZ) - 2.2, 0, QZ + 1.4), Math.PI / 2);
  scholar.pos.y = heightAt(scholar.pos.x, scholar.pos.z); sc.add(scholar.rig); extra.push(scholar.rig); scholar.rig.visible = false; actors.push(scholar);
  const boat = barge(Math.random, 11); boat.visible = false; sc.add(boat); extra.push(boat);
  const sail = (k) => { const z = QZ + 2 - k * 40; boat.position.set(bank(z) + 9, -0.95 + Math.sin(k * 30) * 0.03, z); boat.rotation.y = Math.PI; };
  const lamps = [];
  const floatLamps = () => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.5), toneMapped: false }), cupM = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.9 });
    for (let i = 0; i < 26; i++) {
      const z = LZ + 6 - i * 1.4 + Math.random(), x = bank(z) + 1.5 + Math.random() * 7;
      const l = new THREE.Group(); l.scale.setScalar(1.8); const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.07, 8), cupM);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), m); flame.position.y = 0.08; flame.scale.y = 1.8; l.add(cup, flame);
      l.position.set(x, -0.5, z); l.userData.v = 0.18 + Math.random() * 0.15; sc.add(l); lamps.push(l);
    }
  };
  const drift = (dt) => { for (const l of lamps) l.position.z -= l.userData.v * dt; }; // the river runs south, toward Basra
  const L = (who, rig, text, cam, dof, enter) => ({ dur: lineDur(text), line: { who, text, rig, cue: who === 'Salim' ? 'hm' : 'breath' }, cam, dof, enter });
  const ots = (from, to, side) => ({ follow: true, p0: () => { const a = from.pos, b2 = to.pos, f = yawTo(a, b2), sd = side * 1.9; return V(a.x - Math.sin(f) * 1.2 + Math.cos(f) * sd, a.y + 1.95, a.z - Math.cos(f) * 1.2 - Math.sin(f) * sd); }, t0: headOf(to), fov: 32 });
  // Round 24: Arsaber is beaten, not killed: down on one knee, his sword out of reach
  b.spared = true; b.removed = false; if (!b.rig.parent) sc.add(b.rig); b.rig.visible = true;
  const kneel = () => { b.st.dead = false; b.st.deadT = 0; b.deadT = 0; b.st.action = null; b.st.crouch = 0.85; b.rig.visible = true; boss.facing = yawTo(boss.pos, salim.pos); };
  const spot = () => { const f = yawTo(boss.pos, salim.pos); return V(boss.pos.x + Math.sin(f) * 2.4, salim.pos.y, boss.pos.z + Math.cos(f) * 2.4); };
  const shots = [
    { dur: 3.4, enter: () => { kneel(); const s2 = spot(); salim.pos.copy(s2); salim.pos.y = heightAt(s2.x, s2.z); salim.facing = yawTo(salim.pos, boss.pos); },
      cam: { follow: true, p0: () => V(boss.pos.x + Math.sin(ang + 2.4) * 7, boss.pos.y + 2.6, boss.pos.z + Math.cos(ang + 2.4) * 7), t0: at(boss, 1.2), p1: () => V(boss.pos.x + Math.sin(ang + 1.9) * 5.5, boss.pos.y + 2.0, boss.pos.z + Math.cos(ang + 1.9) * 5.5), t1: at(boss, 1.0), fov: 34 }, run: () => kneel() },
    { dur: lineDur('You burn your own city, and call me the thief.'), line: { who: 'Arsaber', text: 'You burn your own city, and call me the thief.', rig: b.rig, cue: 'breath', expr: 'stern', react: 'resolve' },
      cam: { follow: true, p0: at(salim, 1.6, -0.9, 1.0), t0: headOf(boss), fov: 32 }, dof: headOf(boss), aperture: 1.2, run: () => kneel() },
    { dur: lineDur('We copy. That is the difference.'), line: { who: 'Salim', text: 'We copy. That is the difference.', rig: g.player.rig, cue: 'hm', expr: 'resolve' },
      cam: { follow: true, p0: () => { const h = headOf(salim)(), f = yawTo(salim.pos, boss.pos); return V(h.x + Math.sin(f) * 1.3 + Math.cos(f) * 1.35, h.y - 0.05, h.z + Math.cos(f) * 1.3 - Math.sin(f) * 1.35); }, t0: () => headOf(salim)().add(V(0, -0.06, 0)), fov: 32 }, dof: headOf(salim), aperture: 1.4, run: () => kneel() },
    { when: () => chosen(g, 'arsaber') === 'promise', dur: lineDur('And I keep my word. The first copy that is not spoken for goes north, with you.'), line: { who: 'Salim', text: 'And I keep my word. The first copy that is not spoken for goes north, with you.', rig: g.player.rig, cue: 'hm', expr: 'resolve' },
      cam: { follow: true, p0: () => { const h = headOf(salim)(), f = yawTo(salim.pos, boss.pos); return V(h.x + Math.sin(f) * 1.3 + Math.cos(f) * 1.35, h.y - 0.05, h.z + Math.cos(f) * 1.3 - Math.sin(f) * 1.35); }, t0: () => headOf(salim)().add(V(0, -0.06, 0)), fov: 32 }, dof: headOf(salim), aperture: 1.4, run: () => kneel() },
    { when: () => chosen(g, 'arsaber') === 'promise', dur: lineDur('Then I go home with a book, and not a theft.'), line: { who: 'Arsaber', text: 'Then I go home with a book, and not a theft.', rig: b.rig, cue: 'breath', expr: 'sad' },
      cam: { follow: true, p0: at(salim, 1.6, -0.9, 1.0), t0: headOf(boss), fov: 32 }, dof: headOf(boss), aperture: 1.2, run: () => kneel() },
    // Round 32: what becomes of Arsaber's crews
    { dur: 0.8, choice: { prompt: 'Arsaber\'s men throw down their bows. What becomes of his crews?', options: [
      { label: 'Send them home in the exchange on the Lamis.', fx: () => choose(g, 'crews', 'lamis') },
      { label: 'Put them to work mending the bridge of boats.', fx: () => choose(g, 'crews', 'bridge') }] },
      cam: { follow: true, p0: () => V(boss.pos.x + Math.sin(ang + 1.9) * 6.5, boss.pos.y + 2.4, boss.pos.z + Math.cos(ang + 1.9) * 6.5), t0: at(boss, 0.6), fov: 36 }, run: () => kneel() },
    { dur: 4.2, caption: 'His crews threw down their bows. The copyists\' barge came down from the yard.', enter: (d) => d.fade(1, 0.8) },
    // on the quay: Hakam and Ishaq see the first copies off
    { dur: 3.6, fadeIn: 1.0, enter: () => {
      scholar.rig.visible = true; boat.visible = true; sail(0);
      const p = g.player; p.pos.set(bank(QZ) - 2.4, 0, QZ - 1.2); p.pos.y = heightAt(p.pos.x, p.pos.z);
      ishaq.pos.set(bank(QZ) - 3.6, heightAt(bank(QZ) - 3.6, QZ), QZ); salim.facing = Math.PI / 2; ishaq.facing = Math.PI / 2 + 0.3; scholar.facing = Math.PI / 2;
    }, cam: { p0: () => V(bank(QZ) - 8, 3.2, QZ + 6), t0: () => V(bank(QZ) + 8, 0.5, QZ - 3), p1: () => V(bank(QZ) - 7, 2.6, QZ + 4), t1: () => V(bank(QZ) + 9, 0.6, QZ - 6), fov: 40 }, run: (d, k) => sail(k * 0.12) },
    L('Hakam', scholar.rig, 'Two copies to Wasit, two to Basra. The rest go north when the river allows.', ots(ishaq, scholar, -0.35), headOf(scholar), () => { scholar.st.talk = true; scholar.facing = yawTo(scholar.pos, ishaq.pos); ishaq.facing = yawTo(ishaq.pos, scholar.pos); }),
    L('Ishaq', g.npc, 'Let Constantinople try to gather them now.', ots(scholar, ishaq, 0.35), headOf(ishaq), () => { scholar.st.talk = false; ishaq.st.talk = true; }),
    { dur: 5.5, caption: 'The barge took the current, and was gone around the bend by noon.', noWait: true,
      cam: { p0: () => V(bank(QZ) - 1, 2.2, QZ + 2), t0: () => boat.position.clone().add(V(0, 1.2, 0)), p1: () => V(bank(QZ) - 1.5, 2.6, QZ + 3), t1: () => boat.position.clone().add(V(0, 1.2, 0)), fov: 36 },
      enter: () => { ishaq.st.talk = false; }, run: (d, k) => { sail(0.12 + k * 0.88); if (k > 0.82) d.fade(1, 0.8); } },
    { dur: 4.6, caption: 'Arsaber went home that winter, in an exchange of prisoners on the Lamis river.', when: () => chosen(g, 'arsaber') !== 'promise', enter: () => { boat.visible = false; b.rig.visible = false; } },
    { dur: 5.2, caption: 'Arsaber went home that winter, in an exchange of prisoners on the Lamis river. In his baggage was a copy of the Pages, freely given.', when: () => chosen(g, 'arsaber') === 'promise', enter: () => { boat.visible = false; b.rig.visible = false; } },
    // Round 25: what became of the people Salim let live, or bound, or stayed for
    { dur: 4.8, caption: 'Photeinos told the qadi everything. His testimony put the envoy\'s name before the court.', when: () => chosen(g, 'photeinos') === 'qadi' },
    { dur: 4.8, caption: 'Photeinos never carried a sword again. A scribe in Wasit took on a Greek assistant that spring.', when: () => chosen(g, 'photeinos') === 'free' },
    { dur: 4.8, caption: 'In the Nahrawan the reed village was rebuilt before the floods. They named a boat for Salim.', when: () => chosen(g, 'marsh') === 'stay' },
    { dur: 4.8, caption: 'In the Nahrawan the burned village was a long time rebuilding.', when: () => chosen(g, 'marsh') === 'chase' },
    // Round 32: the crews, the copies, Niketas
    { dur: 5.0, caption: 'In the spring exchange on the Lamis, forty men of the Rum walked east over the bridge, and forty men of Baghdad came home.', when: () => chosen(g, 'crews') === 'lamis' },
    { dur: 5.0, caption: 'Arsaber\'s sailors mended the bridge of boats all winter. Bishr said he had never seen better rope-work.', when: () => chosen(g, 'crews') === 'bridge' },
    { dur: 4.8, caption: 'The House of Wisdom kept the Pages in its finest hand. Scholars came from Basra to read them.', when: () => chosen(g, 'copies') === 'wisdom' },
    { dur: 4.8, caption: 'Within a year the Pages were sold on the paper-sellers\' lane for the price of a week\'s bread, and argued over in every market.', when: () => chosen(g, 'copies') === 'market' },
    { dur: 7, fadeIn: 1.6, caption: 'That evening he set a lamp on the river for his brother, and one for each guard of the caravan.',
      enter: () => { boat.visible = false; scholar.rig.visible = false; floatLamps(); g.lighting?.set?.('dusk', 0); },
      cam: { p0: () => V(bank(LZ) - 4, 3.2, LZ + 14), t0: () => V(bank(LZ) + 5, -0.4, LZ), p1: () => V(bank(LZ) - 3, 2.4, LZ + 10), t1: () => V(bank(LZ) + 6, -0.4, LZ - 6), fov: 40 },
      run: (d, k, dt) => drift(dt || 1 / 60) },
    { dur: 4.4, line: { who: 'Salim', text: 'Jabir. It is done.', rig: g.player.rig, cue: 'breath', expr: 'sad', react: 'warm' },
      enter: () => { const p = g.player; p.pos.set(bank(LZ) - 1.4, 0, LZ); p.pos.y = heightAt(p.pos.x, LZ); salim.facing = Math.PI / 2; ishaq.pos.set(p.pos.x - 1.4, heightAt(p.pos.x - 1.4, LZ - 1.2), LZ - 1.2); ishaq.facing = Math.PI / 2; },
      cam: { follow: true, p0: at(salim, 1.6, 2.2, -1.2), t0: headOf(salim), fov: 28 }, dof: headOf(salim), aperture: 1.2, run: (d, k, dt) => drift(dt || 1 / 60) },
    // Round 25: if Ishaq confessed on the road, the account between them is settled here
    { when: () => chosen(g, 'ishaq') === 'heard', dur: lineDur('I chose his road. I will not forget it.'), line: { who: 'Ishaq', text: 'I chose his road. I will not forget it.', rig: g.npc, cue: 'breath', expr: 'sad' },
      cam: { follow: true, p0: () => { const f = yawTo(salim.pos, ishaq.pos), h = headOf(salim)(); return V(h.x - Math.sin(f) * 1.3 + Math.cos(f) * 0.6, h.y + 0.1, h.z - Math.cos(f) * 1.3 - Math.sin(f) * 0.6); }, t0: headOf(ishaq), fov: 30 }, dof: headOf(ishaq), aperture: 1.2,
      enter: () => { ishaq.facing = yawTo(ishaq.pos, salim.pos); salim.facing = yawTo(salim.pos, ishaq.pos); ishaq.st.talk = true; }, run: (d, k, dt) => drift(dt || 1 / 60) },
    { when: () => chosen(g, 'ishaq') === 'heard', dur: lineDur('Neither will I. Light the next one, Ishaq.'), line: { who: 'Salim', text: 'Neither will I. Light the next one, Ishaq.', rig: g.player.rig, cue: 'hm', expr: 'warm' },
      cam: { follow: true, p0: at(salim, 1.6, 2.2, -1.2), t0: headOf(salim), fov: 28 }, dof: headOf(salim), aperture: 1.2, enter: () => { ishaq.st.talk = false; }, run: (d, k, dt) => drift(dt || 1 / 60) },
    { dur: 4.0, line: { who: 'Ishaq', text: 'We keep the account.', rig: g.npc, cue: 'breath' },
      cam: { p0: () => V(bank(LZ) + 1.2, 0.9, LZ + 1.2), t0: () => V(salim.pos.x - 0.7, salim.pos.y + 1.45, LZ - 0.6), p1: () => V(bank(LZ) + 1.0, 0.95, LZ + 0.6), t1: () => V(salim.pos.x - 0.7, salim.pos.y + 1.45, LZ - 0.6), fov: 34 },
      enter: () => { ishaq.facing = yawTo(ishaq.pos, salim.pos); ishaq.st.talk = true; }, run: (d, k, dt) => drift(dt || 1 / 60) },
    // Round 32: the history turning
    { dur: 5.6, caption: 'Six years later the new caliph came home to Baghdad, and the House of Wisdom became a place where the books of every people were copied into Arabic.', enter: () => { ishaq.st.talk = false; }, run: (d, k, dt) => drift(dt || 1 / 60),
      cam: { p0: () => V(bank(LZ) - 6, 3, LZ + 6), t0: () => V(bank(LZ) + 6, 0, LZ - 8), p1: () => V(bank(LZ) - 8, 5, LZ + 10), t1: () => V(bank(LZ) + 8, 0, LZ - 12), fov: 40 } },
    { dur: 6.5, card: { ar: 'مدينة السلام', en: 'Madinat al-Salam', sub: 'Here ends the chronicle of Salim' }, enter: () => { ishaq.st.talk = false; },
      cam: { p0: () => V(bank(LZ) - 6, 4, LZ + 8), t0: () => V(bank(LZ) + 6, 0, LZ - 10), p1: () => V(bank(LZ) - 20, 30, LZ + 40), t1: () => V(bank(LZ) + 20, 10, LZ - 140), ease: 'io2' }, run: (d, k, dt) => drift(dt || 1 / 60) },
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); },
    end: () => { for (const l of lamps) sc.remove(l); for (const r of extra) sc.remove(r); const [ix, iz] = HUB.ishaq; ishaq.pos.set(ix, heightAt(ix, iz), iz); } };
}

// ------------------------------------------------------------------ Round 26: the Hamrin hills
// the hill men bring in one of Tatzates' scouts, bound; he tells Salim what waits on the frontier road
export function hamrinScout(g) {
  const salim = playerActor(g), ishaq = npcActor(g);
  const fwd = V(Math.sin(ishaq.facing), 0, Math.cos(ishaq.facing)), side = V(fwd.z, 0, -fwd.x);
  const sp = ishaq.pos.clone().addScaledVector(fwd, 1.6).addScaledVector(side, 1.2); sp.y = heightAt(sp.x, sp.z);
  const rig = humanoid(byzify({ ...LOOK.psilos(), offhand: null, weapon: null }));
  const scout = actor(rig, sp, 0); g.scene.add(rig); scout.st.crouch = 0.85;
  const sal = ishaq.pos.clone().addScaledVector(fwd, 2.6).addScaledVector(side, -0.9); sal.y = heightAt(sal.x, sal.z);
  const actors = [salim, ishaq, scout];
  const face = () => { salim.facing = yawTo(salim.pos, scout.pos); ishaq.facing = yawTo(ishaq.pos, salim.pos); scout.facing = yawTo(scout.pos, salim.pos); scout.st.crouch = 0.85; };
  const ots = (from, to, s2) => ({ follow: true, p0: () => { const a = from.pos, b = to.pos, f = yawTo(a, b); return V(a.x - Math.sin(f) * 0.9 + Math.cos(f) * s2, a.y + 1.75, a.z - Math.cos(f) * 0.9 - Math.sin(f) * s2); }, t0: headOf(to), fov: 30 });
  // low and level with the kneeling man (from Salim's standing head height the cap filled the frame)
  const low = { follow: true, p0: () => { const h = headOf(scout)(), f = yawTo(scout.pos, salim.pos); return V(h.x + Math.sin(f) * 1.5 + Math.cos(f) * 0.45, h.y + 0.05, h.z + Math.cos(f) * 1.5 - Math.sin(f) * 0.45); }, t0: headOf(scout), fov: 32 };
  const L = (who, text, a, cam, expr) => ({ dur: lineDur(text), line: { who, text, rig: a.rig, cue: who === 'Salim' ? 'hm' : 'breath', expr }, cam, dof: headOf(a), run: () => face() });
  const shots = [
    { dur: 3.0, fadeIn: 0.8, cam: { follow: true, p0: () => V(sp.x + side.x * 5 + fwd.x * 3, sp.y + 2.4, sp.z + side.z * 5 + fwd.z * 3), t0: () => V(sp.x, sp.y + 0.9, sp.z), p1: () => V(sp.x + side.x * 4 + fwd.x * 2.4, sp.y + 2.0, sp.z + side.z * 4 + fwd.z * 2.4), t1: () => V(sp.x, sp.y + 0.9, sp.z), fov: 36 },
      enter: () => { salim.pos.copy(sal); face(); g.npcMark && (g.npcMark.visible = false); } },
    L('Ishaq', 'The hill men brought this one in at dawn. One of Tatzates\' scouts.', ishaq, ots(salim, ishaq, 0.35)),
    L('Scout', 'He holds the frontier road. Four holds, and his ravine is the last. He will not run again.', scout, low, 'wary'),
    L('Salim', 'Good. Neither will I.', salim, ots(scout, salim, -0.35), 'resolve'),
    L('Ishaq', 'Salim. Whatever waits at the end of that road, it will not give Jabir back.', ishaq, ots(salim, ishaq, 0.35), 'sad'),
    L('Salim', 'I know. I am not going for Jabir. I am going so that it ends.', salim, ots(ishaq, salim, -0.35), 'resolve'),
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); }, end: () => { g.scene.remove(rig); } };
}
// after the second hold: an arrow into the post beside Salim, with a strip of cloth tied to it
export function hamrinArrow(g) {
  const salim = playerActor(g), actors = [salim];
  const f = salim.facing, fwd = V(Math.sin(f), 0, Math.cos(f)), side = V(fwd.z, 0, -fwd.x);
  const ap = salim.pos.clone().addScaledVector(fwd, 1.3).addScaledVector(side, 0.8); ap.y = heightAt(ap.x, ap.z);
  const arrow = new THREE.Mesh(g.arrowGeo, g.arrowMat); arrow.scale.setScalar(2.4); arrow.position.copy(ap).setY(ap.y + 0.45);
  arrow.lookAt(ap.x - fwd.x * 0.4, ap.y - 0.6, ap.z - fwd.z * 0.4); g.scene.add(arrow);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.22), new THREE.MeshStandardMaterial({ color: 0xc8b890, roughness: 1, side: THREE.DoubleSide })); cloth.position.set(0, 0, 0.1); arrow.add(cloth);
  arrow.visible = false;
  const onArrow = { follow: true, p0: () => V(ap.x + side.x * 1.1 - fwd.x * 0.4, ap.y + 0.75, ap.z + side.z * 1.1 - fwd.z * 0.4), t0: () => V(ap.x, ap.y + 0.45, ap.z), fov: 28 };
  const closeSalim = { follow: true, p0: () => { const h = headOf(salim)(); return V(h.x + fwd.x * 1.2 + side.x * 0.4, h.y - 0.15, h.z + fwd.z * 1.2 + side.z * 0.4); }, t0: headOf(salim), fov: 30 };
  const shots = [
    { dur: 3.6, caption: 'An arrow strikes the ground beside Salim. A strip of cloth is tied to the shaft.', cam: onArrow, stinger: 'ambush', enter: (d) => { arrow.visible = true; d.audio.whoosh?.(); } },
    { dur: lineDur('"Two holds. You are better than I was paid to expect. Come to the ravine, guard. I will not hide from you."'), line: { who: 'Tatzates', text: '"Two holds. You are better than I was paid to expect. Come to the ravine, guard. I will not hide from you."', rig: null, cue: 'breath' }, cam: onArrow, run: () => { salim.facing = yawTo(salim.pos, ap); } },
    { dur: lineDur('He wants me angry.'), line: { who: 'Salim', text: 'He wants me angry.', rig: g.player.rig, cue: 'hm', expr: 'anger' }, cam: closeSalim, dof: headOf(salim) },
    { dur: lineDur('Then go to him calm. Anger misses.'), line: { who: 'Ishaq', text: 'Then go to him calm. Anger misses.', rig: null, cue: 'breath' }, cam: closeSalim, dof: headOf(salim) },
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); }, end: () => { g.scene.remove(arrow); } };
}

// ================================================================== Round 29: the epilogue
// Baghdad at dusk, after the Hamrin: Ishaq crosses the river to the House of Wisdom, and Salim sets the last lamp.
export function quaysAtDusk(g) {
  const salim = playerActor(g), ishaq = npcActor(g), actors = [salim, ishaq], sc = g.scene;
  const bank = (z) => canalX(z) - CANAL_W / 2, LZ = 34;
  const lamps = [];
  const floatLamp = (x, z) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.6, 0.5), toneMapped: false }), cupM = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.9 });
    const l = new THREE.Group(); l.scale.setScalar(1.8); const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.07, 8), cupM);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), m); flame.position.y = 0.08; flame.scale.y = 1.8; l.add(cup, flame);
    l.position.set(x, -0.5, z); l.userData.v = 0.16 + Math.random() * 0.12; sc.add(l); lamps.push(l); return l;
  };
  const drift = (dt) => { for (const l of lamps) l.position.z -= l.userData.v * dt; };
  const place = () => { const p = g.player; p.pos.set(bank(LZ) - 1.4, 0, LZ); p.pos.y = heightAt(p.pos.x, LZ); salim.facing = Math.PI / 2; ishaq.pos.set(p.pos.x - 1.5, heightAt(p.pos.x - 1.5, LZ - 1.2), LZ - 1.2); ishaq.facing = yawTo(ishaq.pos, salim.pos); };
  const ots = (from, to, side) => ({ follow: true, p0: () => { const a = from.pos, b2 = to.pos, f = yawTo(a, b2), sd = side * 1.9; return V(a.x - Math.sin(f) * 1.2 + Math.cos(f) * sd, a.y + 1.95, a.z - Math.cos(f) * 1.2 - Math.sin(f) * sd); }, t0: headOf(to), fov: 32 });
  const L = (who, text, when) => {
    const isS = who === 'Salim', spk = isS ? salim : ishaq, lis = isS ? ishaq : salim;
    return { when, dur: lineDur(text), line: { who, text, rig: spk.rig, cue: isS ? 'hm' : 'breath' }, cam: ots(lis, spk, isS ? -0.35 : 0.35), dof: headOf(spk), aperture: 1.2,
      enter: () => { salim.facing = yawTo(salim.pos, ishaq.pos); ishaq.facing = yawTo(ishaq.pos, salim.pos); salim.st.talk = isS; ishaq.st.talk = !isS; }, run: (d, k, dt) => drift(dt || 1 / 60) };
  };
  const shots = [
    { dur: 4.2, fadeIn: 1.2, caption: 'Baghdad, at dusk. The quays were lit for the first time since the siege.', enter: () => { place(); g.lighting?.set?.('dusk', 0); for (let i = 0; i < 14; i++) floatLamp(bank(LZ + 30 - i * 3) + 2 + Math.random() * 8, LZ + 30 - i * 3 + Math.random()); },
      cam: { p0: () => V(bank(LZ) - 10, 6, LZ + 22), t0: () => V(bank(LZ) + 6, 0, LZ), p1: () => V(bank(LZ) - 7, 4, LZ + 14), t1: () => V(bank(LZ) + 5, 0, LZ - 2), fov: 40 }, run: (d, k, dt) => drift(dt || 1 / 60) },
    L('Ishaq', 'They have given me a table at the House of Wisdom, across the river. A table, Salim, and lamps, and other men\'s books.'),
    L('Salim', 'And the Pages?'),
    L('Ishaq', 'Copied, seven times. No one will ever gather them all into one fire again.'),
    L('Ishaq', 'Even the copy you promised Arsaber reached Constantinople. Let them read it. That was always the point.', () => chosen(g, 'arsaber') === 'promise'),
    L('Ishaq', 'I still owe you a brother. I will spend the rest of my life on that account.', () => chosen(g, 'ishaq') === 'heard'),
    L('Salim', 'Then spend it at that table. He would have liked that better than a debt.', () => chosen(g, 'ishaq') === 'heard'),
    // Round 32: the lesson about lamps, and Jabir's sayings, written down
    L('Ishaq', 'I wrote down the Teacher\'s lesson about lamps. And three of Jabir\'s sayings, the way you told them to me.', () => !!g.player.s25?.said?.r32_lastLesson),
    L('Salim', 'Loads come back. Hands do not.', () => !!g.player.s25?.said?.r32_lastLesson),
    L('Ishaq', 'That one is on the first page now. Before the Teacher\'s. I think he would have liked that.', () => !!g.player.s25?.said?.r32_lastLesson),
    L('Salim', 'And me?'),
    L('Ishaq', 'You were a caravan guard. Baghdad needs safe roads more than it needs one more scholar. Go home first, and take Jabir\'s spear with you.'),
    { dur: 6.5, caption: 'Salim set one more lamp on the water: for the guards of the caravan, and for everyone the road had taken.',
      enter: () => { ishaq.st.talk = false; salim.st.talk = false; salim.st.crouch = 0.7; floatLamp(bank(LZ) + 0.6, LZ + 0.4).userData.v = 0.22; },
      cam: { follow: true, p0: at(salim, 1.2, 2.4, -1.6), t0: () => V(bank(LZ) + 1.5, -0.3, LZ - 1), p1: () => V(bank(LZ) - 3, 2.2, LZ + 6), t1: () => V(bank(LZ) + 4, -0.4, LZ - 8), fov: 34 },
      run: (d, k, dt) => { drift(dt || 1 / 60); if (k > 0.35) salim.st.crouch = 0; } },
    // Round 32: the people of the road, and where it took them
    { dur: 5.2, caption: 'On the last lamp, in a boy\'s careful letters, Shabib had written Jabir\'s name.', when: () => !!g.player.s25?.said?.r32_lubnaQuays, run: (d, k, dt) => drift(dt || 1 / 60) },
    { dur: 5.2, caption: 'North, in the Hamrin, an old Greek kept sheep for a shepherd, and never once asked whose side anyone was on.', when: () => !!chosen(g, 'niketas'), run: (d, k, dt) => drift(dt || 1 / 60) },
    { dur: 5.2, caption: 'Ma\'n joined the river guard, and took \'Amr\'s boys out on their first watch.', when: () => (g.player.s25?.g32?.spear || 0) >= 4, run: (d, k, dt) => drift(dt || 1 / 60) },
    { dur: 5.2, caption: 'Dirar hired on the Basra barge. A month later a shell came up the river, wrapped in a scrap of sail.', when: () => (g.player.s25?.g32?.bow || 0) >= 4, run: (d, k, dt) => drift(dt || 1 / 60) },
    { dur: 5.2, caption: 'Tamim sold lamp oil on the quays. Nobody was ever hurt by it again.', when: () => (g.player.s25?.g32?.naft || 0) >= 4, run: (d, k, dt) => drift(dt || 1 / 60) },
    { dur: 5.2, caption: 'Nahshal taught the boys of the quays to climb, and stole the bricks to rebuild the Harbiyya.', when: () => (g.player.s25?.g32?.knives || 0) >= 4, run: (d, k, dt) => drift(dt || 1 / 60) },
    { dur: 7, card: { ar: 'مدينة السلام', en: 'Madinat al-Salam', sub: 'The City of Peace' },
      cam: { p0: () => V(bank(LZ) - 6, 4, LZ + 8), t0: () => V(bank(LZ) + 6, 0, LZ - 10), p1: () => V(bank(LZ) - 20, 30, LZ + 40), t1: () => V(bank(LZ) + 20, 10, LZ - 140), ease: 'io2' }, run: (d, k, dt) => drift(dt || 1 / 60) },
  ];
  return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); },
    end: () => { for (const l of lamps) sc.remove(l); salim.st.crouch = 0; const [ix, iz] = HUB.ishaq; ishaq.pos.set(ix, heightAt(ix, iz), iz); } };
}
