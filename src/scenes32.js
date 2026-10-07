// Round 32: story everywhere. A general stage for small scenes (stage32) and the round's scenes as data.
// A scene is a cast (people made for it, or people already standing in the world) and a list of beats:
//   { who, text, expr, to, when, act, walk: { who, to: [fwd, side] }, past }   a spoken line (who: a cast name, 'Salim', or a voice off)
//   { caption, dur, fade, when }                                             a caption, framed wide on everyone
//   { card: { ar, en, sub } }                                                a title card, the camera rising away
//   { choice: { prompt, options: [{ label, fx }] } }                          a choice (cinema.js shows the buttons)
// Cast entries: { who, look, at: [fwd, side] (from Salim, in his facing), face: 'salim' | radians, crouch, npc: 'Name' (someone
// already in the world: Salim is walked up to him), past: true (shown only in the flashback beats) }.
import * as THREE from 'three';
import { humanoid } from './characters.js';
import { heightAt } from './terrain.js';
import { LOOK, byzify } from './byz.js';
import { HUB } from './region.js';
import { choose, chosen } from './story25.js';
import { freeSpot } from './sidequests.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const lineDur = (s) => 2.2 + s.length / 17;
const headOf = (a) => () => a.rig.userData.parts.head.getWorldPosition(new THREE.Vector3()).add(V(0, 0.08, 0));
const st0 = () => ({ phase: 0, walkBlend: 0, action: null, actionT: 0, hitT: 0, dead: false, deadT: 0, fallDir: 1 });

// ---------------------------------------------------------------- looks for the round's people
export const LOOKS32 = {
  envoy: () => byzify({ ...LOOK.officer('#4a1a4a', 0x3a1440), weapon: null, offhand: null, beard: 0x8a8070, beardLen: 0.9, skin: 0xb07a52, sash: 0x5a1a5a, scale: 1.08, build: 1.12, belly: 0.3, hemY: 0.3, leather: 0x6a5a3a }),
  kallinikos: () => byzify({ ...LOOK.officer('#6a3a14', 0x2a1408), weapon: null, offhand: null, beard: 0x2a1a10, beardLen: 0.7, skin: 0xa8714a, build: 1.15, belly: 0.4 }),
  niketas: () => byzify({ ...LOOK.psilos(), weapon: null, offhand: null, armour: null, beard: 0xb8b4a8, beardLen: 0.85, skin: 0xb07a52, hunch: 0.12, build: 0.95, keepHair: true }),
  lubna: () => ({ robe: '#4a3a4a', robe2: '#7a5a3a', turban: null, mantle: 0x3a2e34, beard: null, beardLen: 0, bald: true, skin: 0xa8714a, weapon: null, sash: 0x7a5a3a, build: 0.82, hemY: 0.05, scale: 0.94 }),
  shabib: () => ({ robe: '#b8a070', robe2: '#5a3a2a', turban: null, cap: 0x6a4a2a, capBand: 0x2a1a10, skin: 0xa8714a, weapon: null, sash: 0x5a3a2a, scale: 0.68, build: 0.85 }),
  rafi: () => ({ robe: '#2a2a2a', robe2: '#8a6a3a', turban: 0x1a1a1a, beard: 0x1a120c, beardLen: 0.5, skin: 0x9a6a44, weapon: null, sash: 0x8a6a3a, build: 0.95 }),
  elder: () => ({ robe: '#c8bca0', robe2: '#4a5a4a', turban: 0x6a5a40, beard: 0xd0ccc0, beardLen: 0.9, skin: 0x7a4a2a, weapon: null, sash: 0x4a5a4a, build: 0.9, hunch: 0.12 }),
  ferryman: () => ({ robe: '#d8ccb0', robe2: '#3a4a5a', turban: 0x3a3a2a, beard: 0x3a2a1a, beardLen: 0.6, skin: 0x7a4a2a, weapon: null, sash: 0x3a4a5a, build: 1.05 }),
  hakam: () => ({ robe: '#e8e0cc', robe2: '#1e1e22', turban: 0x1e1e22, beard: 0x9a948a, beardLen: 0.8, skin: 0xa8714a, weapon: null, sash: 0x1e1e22, build: 0.92, tiraz: true }),
  // the flashback: Jabir at seventeen and Salim at twelve, caravan boys at the same gate
  jabirYoung: () => ({ robe: '#3a3428', robe2: '#8a6a3a', turban: 0xd8cfb8, weapon: 'spear', beard: 0x2a1a10, beardLen: 0.2, skin: 0x9a6a44, scale: 0.94, build: 0.9 }),
  salimBoy: () => ({ robe: '#6a5a40', robe2: '#3a4a3a', turban: 0xc8b890, weapon: null, skin: 0x9a6a44, sash: 0x3a4a3a, scale: 0.74, build: 0.82 }),
  hillman: () => ({ robe: '#5a4a34', robe2: '#7a3a24', turban: 0x8a6a4a, beard: 0x1a120c, beardLen: 0.8, skin: 0x8a5a3a, weapon: 'spear', sash: 0x7a3a24, build: 1.05 }),
};

// ---------------------------------------------------------------- the stage
export function stage32(g, def) {
  const p = g.player;
  const salim = { rig: p.rig, pos: p.pos, get facing() { return p.facing; }, set facing(v) { p.facing = v; }, st: p.st, who: 'Salim' };
  const actors = [salim], temp = [], cast = { Salim: salim };
  const wrapNpc = (n) => n.name === 'Ishaq' && n.rig === g.npc
    ? { rig: g.npc, pos: g.npc.position, get facing() { return g.npc.rotation.y; }, set facing(v) { g.npc.rotation.y = v; }, st: g.npcSt, npc: true }
    : { rig: n.rig, pos: n.rig.position, get facing() { return n.rig.rotation.y; }, set facing(v) { n.rig.rotation.y = v; }, st: n.st, npc: true };
  // Salim stands a talking distance from the person the scene is about, if there is one
  const anchorNpc = def.cast?.find((c) => c.npc);
  if (anchorNpc) {
    const n = g.npcs.find((x) => x.name === anchorNpc.npc);
    if (n) { const o = n.rig.position, d = Math.hypot(p.pos.x - o.x, p.pos.z - o.z); if (d > 2.6 || d < 1.3) { const f = yawTo(o, p.pos); p.pos.set(o.x + Math.sin(f) * 1.8, 0, o.z + Math.cos(f) * 1.8); p.pos.y = heightAt(p.pos.x, p.pos.z); } p.facing = yawTo(p.pos, o); }
  }
  const f0 = p.facing, fwd = V(Math.sin(f0), 0, Math.cos(f0)), side = V(fwd.z, 0, -fwd.x);
  const startPos = p.pos.clone();
  for (const c of def.cast || []) {
    let a;
    if (c.npc) { const n = g.npcs.find((x) => x.name === c.npc); if (!n) continue; a = wrapNpc(n); }
    else {
      const [fa, sa] = c.at || [2, 0];
      let x = startPos.x + fwd.x * fa + side.x * sa, z = startPos.z + fwd.z * fa + side.z * sa;
      if (!c.free) [x, z] = freeSpot(x, z, 0.7);
      const rig = humanoid({ detail: 'hi', ...(typeof c.look === 'function' ? c.look() : c.look) });
      a = { rig, pos: V(x, heightAt(x, z), z), facing: 0, st: st0() };
      rig.position.copy(a.pos); g.scene.add(rig); temp.push(rig);
      a.st.crouch = c.crouch || 0;
      if (c.past) rig.visible = false;
    }
    a.who = c.who; a.past = !!c.past; a.crouch = c.crouch || 0; a.home = a.pos.clone(); a.homeFace = a.facing;
    if (c.face === 'salim' || c.face == null) a.facing = yawTo(a.pos, salim.pos); else a.facing = c.face;
    cast[c.who] = a; actors.push(a);
  }
  const first = actors.find((a) => a !== salim && !a.past) || actors.find((a) => a !== salim) || salim;
  // the past (a flashback): its actors only show in its beats, and Salim is hidden while they do
  const showPast = (on) => { for (const a of actors) if (a.past) a.rig.visible = on; if (def.hideInPast !== false && actors.some((a) => a.past)) p.rig.visible = !on; };
  const listenerOf = (spk, L) => cast[L.to] || (spk === salim ? first : (spk.past ? actors.find((a) => a.past && a !== spk) || salim : salim));
  const ots = (from, to, sd0) => ({ follow: true, p0: () => { const a = from.pos, b = to.pos, f = yawTo(a, b), sd = sd0 * 1.9, h = Math.max(1.45, 1.9 * (from.rig.userData.parts?.body.scale.x || 1)); return V(a.x - Math.sin(f) * 1.3 + Math.cos(f) * sd, a.y + h, a.z - Math.cos(f) * 1.3 - Math.sin(f) * sd); }, t0: headOf(to), fov: 32 }); // wide enough that a turban in the foreground never fills the frame
  // from where Salim crouches: what he sees and hears (an overheard scene)
  const pov = (a) => ({ follow: true, p0: () => { const others = actors.filter((o) => o !== salim && !o.past && o.rig.visible !== false); const m = V(0, 0, 0); for (const o of others) m.add(o.pos); m.multiplyScalar(1 / Math.max(1, others.length)); let dx = 1, dz = 0; if (others.length > 1) { dx = others[1].pos.z - others[0].pos.z; dz = -(others[1].pos.x - others[0].pos.x); const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; } if (dx * (salim.pos.x - m.x) + dz * (salim.pos.z - m.z) < 0) { dx = -dx; dz = -dz; } return V(m.x + dx * 4.2, m.y + 2.7, m.z + dz * 4.2); }, t0: () => headOf(a)().add(V(0, -0.3, 0)), fov: 40 }); // an overheard pair, framed side-on from Salim's side and above the reeds
  const closeOn = (a) => ({ follow: true, p0: () => { const h = headOf(a)(), f = a.facing; return V(h.x + Math.sin(f) * 1.3 + Math.cos(f) * 0.4, h.y - 0.1, h.z + Math.cos(f) * 1.3 - Math.sin(f) * 0.4); }, t0: headOf(a), fov: 30 });
  const group = (past) => () => { const L = actors.filter((a) => (past ? a.past : !a.past) && a.rig.visible !== false); const c = V(0, 0, 0); for (const a of L) c.add(a.pos); return c.multiplyScalar(1 / Math.max(1, L.length)); };
  const wide = (past, k = 1) => ({ follow: true, p0: () => { const c = group(past)(); return V(c.x + side.x * 5.5 * k - fwd.x * 2.5 * k, c.y + 2.6 * k, c.z + side.z * 5.5 * k - fwd.z * 2.5 * k); }, t0: () => group(past)().add(V(0, 1.0, 0)),
    p1: () => { const c = group(past)(); return V(c.x + side.x * 4.6 * k - fwd.x * 1.8 * k, c.y + 2.2 * k, c.z + side.z * 4.6 * k - fwd.z * 1.8 * k); }, t1: () => group(past)().add(V(0, 1.0, 0)), fov: 38 });
  if (def.props) def.props(g, cast, (o) => { g.scene.add(o); temp.push(o); return o; }, { fwd, side, startPos });
  const walks = [];
  const face = (spk, lis) => { for (const a of actors) { if (a.walking) continue; if (a === spk) a.facing = yawTo(a.pos, lis.pos); else if (a.past === spk.past && a !== salim) a.facing = yawTo(a.pos, spk.pos); else if (a === salim && !spk.past) a.facing = yawTo(a.pos, spk.pos); } };
  const shots = [];
  if (def.open) shots.push({ dur: def.open.dur || 3.4, fadeIn: def.open.fadeIn ?? 0.8, caption: def.open.caption, stinger: def.open.stinger, cam: wide(false, 1.3), enter: () => { showPast(false); g.npcMark && (g.npcMark.visible = false); def.open.enter?.(g, cast); } });
  for (const L of def.beats) {
    if (L.choice) { shots.push({ when: L.when, dur: 0.8, choice: L.choice, cam: wide(false, 0.8), enter: () => showPast(false) }); continue; }
    if (L.card) { shots.push({ when: L.when, dur: 5.4, card: L.card, stinger: 'title', cam: { follow: true, p0: () => { const c = group(false)(); return V(c.x - fwd.x * 3 + side.x * 2, c.y + 1.8, c.z - fwd.z * 3 + side.z * 2); }, t0: () => group(false)().add(V(0, 1, 0)), p1: () => { const c = group(false)(); return V(c.x - fwd.x * 9 + side.x * 5, c.y + 8, c.z - fwd.z * 9 + side.z * 5); }, t1: () => group(false)(), ease: 'io2' }, enter: () => showPast(false) }); continue; }
    if (L.caption) {
      shots.push({ when: L.when, dur: L.dur || Math.max(3.6, lineDur(L.caption) * 0.8), caption: L.caption, cam: wide(!!L.past, L.k || 1), fadeIn: L.fadeIn,
        enter: (d) => { if (L.fade) d.fade(1, 1.0); showPast(!!L.past); L.enter?.(g, cast); if (L.walk) for (const w of [].concat(L.walk)) walks.push(w); },
        run: (d, k, dt) => tickWalks(dt) });
      continue;
    }
    const spk = cast[L.who];
    shots.push({ when: L.when, dur: lineDur(L.text), line: { who: L.who, text: L.text, rig: spk ? spk.rig : null, cue: L.who === 'Salim' ? 'hm' : 'breath', expr: L.expr, react: L.react },
      cam: L.close && spk ? closeOn(spk) : L.pov && spk !== salim ? pov(spk) : spk ? ots(listenerOf(spk, L), spk, spk === salim ? -0.35 : 0.35) : closeOn(salim), dof: headOf(spk || salim), fadeIn: L.fadeIn,
      enter: (d) => {
        if (L.fade) d.fade(0, 0.9);
        showPast(!!(spk && spk.past)); L.enter?.(g, cast);
        for (const a of actors) a.st.talk = a === spk;
        if (spk) face(spk, listenerOf(spk, L)); if (L.act && spk) { spk.st.action = L.act; spk.st.actionT = 0; spk.actDur = 1.6; }
        if (L.walk) for (const w of [].concat(L.walk)) walks.push(w);
      },
      run: (d, k, dt) => { if (spk) face(spk, listenerOf(spk, L)); tickWalks(dt); } });
  }
  function tickWalks(dt = 1 / 60) {
    for (const w of walks) {
      const a = cast[w.who]; if (!a || w.done) continue;
      if (!w.target) { const [fa, sa] = w.to; w.target = V(a.pos.x + fwd.x * fa + side.x * sa, 0, a.pos.z + fwd.z * fa + side.z * sa); }
      const dx = w.target.x - a.pos.x, dz = w.target.z - a.pos.z, dd = Math.hypot(dx, dz);
      if (dd < 0.1) { w.done = true; a.walking = false; a.st.walkBlend = 0; if (w.vanish) a.rig.visible = false; continue; }
      const s = Math.min(dd, (w.speed || 1.4) * dt); a.walking = true; a.facing = Math.atan2(dx, dz);
      a.pos.x += dx / dd * s; a.pos.z += dz / dd * s; a.pos.y = heightAt(a.pos.x, a.pos.z); a.st.walkBlend = 1; a.st.phase += dt * 5.2 * (w.speed || 1.4) / 1.4;
    }
  }
  const tick = (d, dt) => {
    for (const a of actors) {
      if (a.st.action) { a.st.actionT += dt / (a.actDur || 0.6); if (a.st.actionT >= 1) a.st.action = null; }
      a.st.hitT = Math.max(0, (a.st.hitT || 0) - dt * 2.5);
      if (a !== salim && !a.walking) a.st.walkBlend = 0;
      if (a.crouch) a.st.crouch = a.crouch;
      a.rig.position.copy(a.pos); a.rig.rotation.y = a.facing;
      g.anim(a.rig, a.st, dt);
    }
  };
  const end = () => {
    p.rig.visible = true;
    for (const a of actors) { a.st.talk = false; if (a.npc && a.home) { a.pos.copy(a.home); } }
    for (const r of temp) g.scene.remove(r);
    def.end?.(g, cast);
  };
  return { actors, shots, tick, end };
}

// ================================================================= the round's scenes
const ch = (g, k, v) => () => chosen(g, k) === v;

// ---------------- Arsaber's chapter
// marsh, after the reed stockade: across the water, Arsaber and Kallinikos argue about the burning
export const reedsOverheard = (g) => ({
  cast: [{ who: 'Arsaber', look: LOOKS32.envoy, at: [9, -1.2], face: 1.6 }, { who: 'Kallinikos', look: LOOKS32.kallinikos, at: [9.2, 1.4], face: -1.6 }],
  open: { caption: 'Voices across the water. Salim keeps low in the reeds.', fadeIn: 1.0, enter: (g2, c) => { c.Salim.st.crouch = 0.75; c.Arsaber.facing = yawTo(c.Arsaber.pos, c.Kallinikos.pos); c.Kallinikos.facing = yawTo(c.Kallinikos.pos, c.Arsaber.pos); } },
  beats: [
    { pov: true, who: 'Kallinikos', to: 'Arsaber', text: 'The fishermen talk. Burn one village and the rest stop talking.', expr: 'anger' },
    { pov: true, who: 'Arsaber', to: 'Kallinikos', text: 'We came for books, Kallinikos. Not for a burned country.', expr: 'stern' },
    { pov: true, who: 'Kallinikos', to: 'Arsaber', text: 'Your books burn the same as their reeds, envoy.' },
    { pov: true, who: 'Arsaber', to: 'Kallinikos', text: 'Then keep your fire on the water. That is an order.', expr: 'anger', walk: { who: 'Arsaber', to: [14, -6], speed: 1.5, vanish: true } },
    { pov: true, who: 'Kallinikos', to: 'Arsaber', text: 'Orders. From a man who reads at night.', walk: { who: 'Kallinikos', to: [16, 7], speed: 1.3, vanish: true } },
    { who: 'Salim', close: true, text: 'Two of them. One wants the Pages. One wants the fire.', expr: 'resolve' },
  ],
  end: (g2, c) => { c.Salim.st.crouch = 0; },
});
// al-Karkh, by the paper-sellers' lane, after the burned quarter: a truce of an hour in the ash
export const truceInAsh = (g) => ({
  cast: [{ who: 'Arsaber', look: LOOKS32.envoy, at: [4.2, 0.8] }],
  open: { caption: 'In the ash of the paper-sellers\' lane, a man stands alone, unarmed.', fadeIn: 0.9 },
  beats: [
    { who: 'Arsaber', text: 'Peace, guard. For an hour. I came to see what your war did to this street.', expr: 'neutral' },
    { who: 'Salim', text: 'Your men helped burn it.', expr: 'anger' },
    { who: 'Arsaber', text: 'Krateros did. I sent for books, and he sent me smoke.', expr: 'sad' },
    { who: 'Arsaber', text: 'In Constantinople the libraries are cold and half empty. Here they burn. Tell me which is worse.' },
    { who: 'Salim', text: 'Here, at least, someone is still copying.', expr: 'resolve' },
    { who: 'Arsaber', text: 'Then hurry. Krateros will not wait for your copyists.', expr: 'stern', walk: { who: 'Arsaber', to: [-2, 14], speed: 1.4, vanish: true } },
    { caption: 'He walked away into the smoke. He did not look back.', dur: 3.6, k: 1.4 },
    { who: 'Salim', close: true, text: 'He warned me. Why would he warn me?', expr: 'wary' },
  ],
});
// the Hamrin camp: Rafi' the courier brings a letter from Constantinople, through the exchange on the Lamis
export const envoyLetter = (g) => ({
  cast: [{ who: 'Rafi\'', look: LOOKS32.rafi, at: [2.0, 0.6] }],
  open: { caption: 'A rider comes up the frontier road with the barid\'s satchel.', fadeIn: 0.9 },
  beats: [
    { who: 'Rafi\'', text: 'A letter for the guard Salim. It came through three hands and one exchange of prisoners.', act: 'point' },
    { caption: '"To the guard Salim. The copy you gave me sits in the palace library, and young men wait in line to read it. I did not bring back a theft. I brought back a question." Arsaber.', dur: 7, when: ch(g, 'arsaber', 'promise') },
    { caption: '"To the guard Salim. I came home with nothing, and I find I am glad of it. A book carried off in a chest is a prisoner. Yours are free." Arsaber.', dur: 7, when: () => chosen(g, 'arsaber') !== 'promise' },
    { caption: '"My bowman did not come home with me. He says he owes you a debt he cannot pay. Do not let him pay it in blood."', dur: 6 },
    { who: 'Salim', text: 'Even the envoy writes letters now.', expr: 'neutral' },
    { who: 'Rafi\'', text: 'Everyone writes letters now, guard. The roads are open. That is your fault.', expr: 'warm' },
  ],
});

// ---------------- the acts
// the Sawad, at the caravanserai: a memory of two caravan boys at the same gate
export const caravanBoys = (g) => ({
  cast: [{ who: 'Jabir', look: LOOKS32.jabirYoung, at: [3.4, 1.2], past: true }, { who: 'Salim (a boy)', look: LOOKS32.salimBoy, at: [2.2, -0.6], past: true }],
  open: { caption: 'Salim knows this gate. He slept in it as a boy, on the caravans.', fadeIn: 1.0 },
  beats: [
    { caption: 'Twelve years ago. The same gate, the same road.', past: true, fade: false, dur: 4 },
    { who: 'Jabir', text: 'Hold the lead rope, little brother. If the camel bolts, let it go. Never let a rope take your hand.', expr: 'warm', fadeIn: 0.6 },
    { who: 'Salim (a boy)', text: 'And if it runs off with the load?' },
    { who: 'Jabir', text: 'Then we find it. Loads come back. Hands do not.', expr: 'warm' },
    { who: 'Salim', text: 'He was always saying things like that. I never wrote any of them down.', expr: 'sad', fadeIn: 0.6 },
  ],
});
// the marshes, by the camp: an elder of the reed village counts what the war has taken
export const reedCount = (g) => ({
  cast: [{ who: 'Muhalhil', look: LOOKS32.elder, at: [2.2, 0.8] }],
  beats: [
    { who: 'Muhalhil', text: 'Guard. Before you chase the Rum through my reeds, count with me.' },
    { who: 'Muhalhil', text: 'In spring, soldiers of al-Amin, running from the city. In summer, Tahir\'s men, chasing them. Now the Rum, with fire on the water.' },
    { who: 'Muhalhil', text: 'Every one of them took a boat. Not one brought it back.', expr: 'sad' },
    { who: 'Salim', text: 'I will bring back what I can.', expr: 'resolve' },
    { who: 'Muhalhil', text: 'Then you will be the first. I will count that too.' },
  ],
});
// al-Karkh, by the khan: Ishaq tells of the Teacher's last lesson
export const lastLesson = (g) => ({
  cast: [{ npc: 'Ishaq', who: 'Ishaq' }],
  beats: [
    { who: 'Ishaq', text: 'He taught in a prison yard, at the end. Four of us at the bars, every evening the guard allowed it.' },
    { who: 'Ishaq', text: 'His last lesson was about lamps. A lamp does not argue with the dark, he said. It only stays lit.', expr: 'sad' },
    { who: 'Salim', text: 'Is that in the Pages?' },
    { who: 'Ishaq', text: 'No. I never wrote it down. I was afraid it would sound small on paper.' },
    { who: 'Salim', text: 'Write it down. Jabir\'s words are going already. I cannot keep them all.', expr: 'sad' },
    { who: 'Ishaq', text: 'Then tonight we both write. You tell me his, and I will tell you mine.', expr: 'warm' },
  ],
});
// the quays: a ferryman who owed Jabir eight dirhams
export const ferrymanDebt = (g) => ({
  cast: [{ who: 'Sumayr', look: LOOKS32.ferryman, at: [2.2, -0.8] }],
  beats: [
    { who: 'Sumayr', text: 'You have his face. You are Jabir\'s brother.' },
    { who: 'Sumayr', text: 'At Ukbara, two years ago, he lent me eight dirhams for a new oar. He said, pay it to whoever needs it more.' },
    { who: 'Sumayr', text: 'I never found anyone who needed it more than me. Until today.', act: 'point' },
    { who: 'Salim', text: 'Give it to the copyists\' barge. For lamp oil. They work all night.', expr: 'warm' },
    { who: 'Sumayr', text: 'For lamp oil. He would have liked that. He always argued my tolls down, you know.' },
  ],
});

// ---------------- the people who come back: Niketas, Lubna and Shabib
export const niketasMeet = (g) => ({
  cast: [{ who: 'Niketas', look: LOOKS32.niketas, at: [2.4, 0.5], crouch: 0.6 }],
  open: { caption: 'An old soldier of the Rum sits against a wall, his spear broken across his knees.', fadeIn: 0.8 },
  beats: [
    { who: 'Niketas', text: 'Do not trouble yourself, guard. I threw it down at the kilns. I am too old for Arsaber\'s road.', expr: 'sad' },
    { who: 'Niketas', text: 'Thirty years I marched for Constantinople. They never once asked me where I wanted to go.' },
    { who: 'Salim', text: 'Where do you want to go?' },
    { who: 'Niketas', text: 'Somewhere with sheep. Sheep never ask whose side you are on.' },
    { choice: { prompt: 'An old deserter of the Rum. What do you do with him?', options: [
      { label: 'Hand him to \'Amr\'s men, for the qadi.', fx: () => choose(g, 'niketas', 'qadi') },
      { label: 'Tell no one. Let him hide.', fx: () => choose(g, 'niketas', 'hide') }] } },
    { when: ch(g, 'niketas', 'qadi'), who: 'Salim', text: 'The qadi will hear you. If you are telling the truth, you have nothing to fear from him.', expr: 'resolve' },
    { when: ch(g, 'niketas', 'qadi'), who: 'Niketas', text: 'A court that listens. I will believe it when I see it.' },
    { when: ch(g, 'niketas', 'hide'), who: 'Salim', text: 'I did not see you. Keep off the roads.', expr: 'neutral' },
    { when: ch(g, 'niketas', 'hide'), who: 'Niketas', text: 'Off the roads. Yes. I know a few things about the roads, guard. I may repay you.' },
  ],
});
export const niketasMarsh = (g) => ({
  cast: [{ who: 'Niketas', look: LOOKS32.niketas, at: [2.2, 0.8] }],
  beats: [
    { when: ch(g, 'niketas', 'hide'), who: 'Niketas', text: 'You again. The marsh people feed me if I mend their nets. I mend nets badly. They feed me anyway.', expr: 'warm' },
    { when: ch(g, 'niketas', 'qadi'), who: 'Niketas', text: 'The qadi\'s men make me carry water for the camp until my case is heard. It is the most useful thing I have done in thirty years.', expr: 'warm' },
    { who: 'Niketas', text: 'Kallinikos used to be a decent engineer. Then someone gave him the fire, and he forgot what else he knew.' },
    { who: 'Salim', text: 'And Arsaber?' },
    { who: 'Niketas', text: 'Arsaber reads at night and does not sleep. A man like that is dangerous, or he is sorry. Usually both.' },
  ],
});
export const niketasDocks = (g) => ({
  cast: [{ who: 'Niketas', look: LOOKS32.niketas, at: [2.2, -0.8] }],
  beats: [
    { who: 'Niketas', text: 'Guard. Listen, I have little time. Arsaber\'s ship sails at dawn whatever happens.', expr: 'wary' },
    { who: 'Niketas', text: 'If he is pressed, he will fire the bridge of boats behind him. I heard him give the order.' },
    { when: ch(g, 'niketas', 'hide'), who: 'Niketas', text: 'And they wait for you on the quay road, past the warehouses. Go round by the slips. That is my repayment.', expr: 'resolve' },
    { when: ch(g, 'niketas', 'qadi'), who: 'Niketas', text: 'The qadi heard me yesterday. He sent me here to tell you myself. He said you had earned it.', expr: 'warm' },
    { who: 'Salim', text: 'And you? Where do you go now?' },
    { who: 'Niketas', text: 'North. The hills. Someone there must have sheep.' },
  ],
});
function handcart() {
  const grp = new THREE.Group(), w = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.9 }), dark = new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.9 });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.7), w); bed.position.y = 0.42; grp.add(bed);
  for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 0.05), w); rail.position.set(0, 0.54, s * 0.33); grp.add(rail); const h = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.05), dark); h.position.set(-0.9, 0.5, s * 0.22); grp.add(h); }
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 14), dark); wheel.rotation.x = Math.PI / 2; wheel.position.set(0.1, 0.34, 0.4); grp.add(wheel);
  const off = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 14), dark); off.position.set(0.6, 0.03, -0.75); grp.add(off); grp.userData.off = off;
  const bundle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.45), new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 1 })); bundle.position.set(0.1, 0.62, 0); grp.add(bundle);
  grp.rotation.z = -0.12; grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return grp;
}
export const lubnaRoad = (g) => ({
  props: (g2, c, add, { fwd, side, startPos }) => { const cart = add(handcart()); const x = startPos.x + fwd.x * 3.2 + side.x * -0.4, z = startPos.z + fwd.z * 3.2 + side.z * -0.4; cart.position.set(x, heightAt(x, z), z); cart.rotation.y = Math.atan2(side.x, side.z); c.cart = cart; },
  cast: [{ who: 'Lubna', look: LOOKS32.lubna, at: [2.4, 0.6] }, { who: 'Shabib', look: LOOKS32.shabib, at: [2.0, -0.8] }],
  open: { caption: 'A woman and a boy with a handcart, its wheel off in the dust.', fadeIn: 0.8 },
  beats: [
    { who: 'Lubna', text: 'We left Baghdad when the fires started. Now they say it is over. We are going home.' },
    { who: 'Shabib', text: 'Is that a real sword? Have you killed a Rum?' },
    { who: 'Salim', text: 'Real enough. Hold the cart, not the sword.', expr: 'warm' },
    { caption: 'Salim lifts the cart while Shabib knocks the wheel back onto its axle.', dur: 4, enter: (g2, c) => { if (c.cart) { c.cart.rotation.z = 0; c.cart.userData.off.position.set(0.1, 0.34, -0.4); c.cart.userData.off.rotation.x = Math.PI / 2; } } },
    { who: 'Lubna', text: 'Al-Karkh. The lane of the cotton-sellers, by the Sarat bridge. If it is still there, there will be bread for you.', expr: 'warm' },
  ],
});
export const lubnaMarsh = (g) => ({
  cast: [{ who: 'Lubna', look: LOOKS32.lubna, at: [2.2, 0.6] }, { who: 'Shabib', look: LOOKS32.shabib, at: [1.9, -0.8] }],
  beats: [
    { who: 'Lubna', text: 'Every boat up the canal is taken by soldiers. We have waited four days.', expr: 'sad' },
    { who: 'Shabib', text: 'I counted the soldiers\' boats. Twenty-two. One was on fire.' },
    { choice: { prompt: 'A boatman will take them for thirty dinars.', options: [
      { label: 'Pay their passage (30 dinars).', fx: () => { const p = g.player; if (p.gold >= 30) { p.gold -= 30; choose(g, 'lubna', 'paid'); } else choose(g, 'lubna', 'word'); } },
      { label: 'Speak to the boatman for them.', fx: () => choose(g, 'lubna', 'word') }] } },
    { when: ch(g, 'lubna', 'paid'), who: 'Lubna', text: 'Thirty dinars. I will owe you this until I am old.', expr: 'warm' },
    { when: ch(g, 'lubna', 'word'), who: 'Lubna', text: 'He listens to you. Men with swords are always listened to. Thank you.' },
    { who: 'Salim', text: 'You owe me nothing. Find your lane.' },
  ],
});
function burnedDoor() {
  const grp = new THREE.Group(), brick = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.95 }), soot = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 1 }), wood = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.9 });
  for (const sx of [-0.75, 0.75]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.5, 0.5), brick); post.position.set(sx, 1.25, 0); grp.add(post); const sc = new THREE.Mesh(new THREE.BoxGeometry(0.47, 1.1, 0.52), soot); sc.position.set(sx, 2.0, 0); grp.add(sc); }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 0.55), wood); lintel.position.y = 2.6; lintel.rotation.z = 0.06; grp.add(lintel);
  for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.4 + Math.random() * 0.3, 0.2, 0.3), i % 2 ? brick : soot); r.position.set(-1.4 + i * 0.7, 0.1, -0.9 - Math.random() * 0.8); r.rotation.y = Math.random(); grp.add(r); }
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 1.8), soot); leaf.position.set(0.3, 0.05, -1.4); leaf.rotation.y = 0.4; grp.add(leaf);
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return grp;
}
export const lubnaHome = (g) => ({
  props: (g2, c, add, { fwd, side, startPos }) => { const d = add(burnedDoor()); const x = startPos.x + fwd.x * 4.4 + side.x * 0.6, z = startPos.z + fwd.z * 4.4 + side.z * 0.6; d.position.set(x, heightAt(x, z), z); d.rotation.y = Math.atan2(fwd.x, fwd.z); },
  cast: [{ who: 'Lubna', look: LOOKS32.lubna, at: [2.4, 0.6] }, { who: 'Shabib', look: LOOKS32.shabib, at: [3.0, -1.2], crouch: 0.7 }],
  open: { caption: 'The lane of the cotton-sellers. A doorway stands, and nothing behind it.', fadeIn: 1.0 },
  beats: [
    { who: 'Lubna', text: 'This was the door. My husband carved the latch.', expr: 'sad' },
    { who: 'Lubna', text: 'He went to the wall with the \'ayyarun when Tahir came. He did not come back.' },
    { who: 'Shabib', text: 'I found the latch, mother. It is not even burned.', to: 'Lubna' },
    { who: 'Lubna', text: 'Do not say anything, guard. Help me carry the bricks that are still good.' },
    { caption: 'Salim carried bricks until dark. Nobody said anything, and it helped.', fade: true, dur: 5 },
  ],
});
export const lubnaQuays = (g) => ({
  cast: [{ who: 'Shabib', look: LOOKS32.shabib, at: [1.8, 0.4] }, { who: 'Lubna', look: LOOKS32.lubna, at: [3.4, 1.6] }],
  beats: [
    { who: 'Shabib', text: 'Hakam\'s copyists are teaching me letters! I can write my name. And yours. Look.', expr: 'warm', act: 'point' },
    { who: 'Salim', text: 'My brother always said I should learn to read.', expr: 'sad' },
    { who: 'Shabib', text: 'Then I will teach you. It is easy. The letters are only small roads.' },
    { who: 'Lubna', text: 'I bake for the copyists now. Bread for letters. It is a good trade.', expr: 'warm', to: 'Salim' },
  ],
});

// ---------------- the docks: where do the copies go (Ishaq and Hakam disagree)
export const copiesWhere = (g) => ({
  cast: [{ npc: 'Ishaq', who: 'Ishaq' }, { who: 'Hakam', look: LOOKS32.hakam, at: [2.2, 1.8] }],
  beats: [
    { who: 'Hakam', to: 'Salim', text: 'The copies belong in the House of Wisdom. Behind walls, in good hands, where they can be guarded.' },
    { who: 'Ishaq', to: 'Hakam', text: 'Guarded copies are only a smaller prison, Hakam. Give some to the paper-sellers. Let them be sold for bread.' },
    { who: 'Hakam', to: 'Ishaq', text: 'Sold for bread, and copied badly, and argued over in every market.' },
    { who: 'Ishaq', to: 'Hakam', text: 'Yes. Exactly that.' },
    { choice: { prompt: 'Where should the first copies go?', options: [
      { label: 'To the House of Wisdom, where they are safe.', fx: () => choose(g, 'copies', 'wisdom') },
      { label: 'To the paper-sellers\' market as well.', fx: () => choose(g, 'copies', 'market') }] } },
    { when: ch(g, 'copies', 'wisdom'), who: 'Salim', text: 'Keep them safe first. They have been burned enough.', expr: 'resolve' },
    { when: ch(g, 'copies', 'wisdom'), who: 'Ishaq', to: 'Salim', text: 'Safe first. Very well. But I will hold you to "first".' },
    { when: ch(g, 'copies', 'market'), who: 'Salim', text: 'Let the market have them. Nobody can burn every stall in Baghdad.', expr: 'resolve' },
    { when: ch(g, 'copies', 'market'), who: 'Hakam', to: 'Salim', text: 'You sound like him. Very well. Two copies for the lane, and may they be argued over.' },
  ],
});
