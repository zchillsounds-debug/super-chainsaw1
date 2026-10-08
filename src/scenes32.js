// Round 32: story everywhere. The scenes for the new beats: Arsaber in the paper-sellers' lane, one scene inside each act,
// the deserters, the family going home to al-Karkh, the hired guards' talks. They are all built with chat(): a two-hander
// between Salim and one other (over-the-shoulder shots, like scenes.conversation), with captions, choices and
// lines that only play when a condition holds (`when`).
import * as THREE from 'three';
import { humanoid } from './characters.js';
import { heightAt } from './terrain.js';
import { lineClear } from './collision.js';
import { LOOK, byzify } from './byz.js';
import { H32 } from './scenes.js';

const RAY = new THREE.Raycaster();
const { V, yawTo, lineDur, at, headOf, walk, act, tickActor, playerActor } = H32;

// a stand-in for anyone with a rig and an animation state (an NPC, the hired guard, a rig made for the scene)
export function other(n) { return { rig: n.rig, pos: n.rig.position, get facing() { return n.rig.rotation.y; }, set facing(v) { n.rig.rotation.y = v; }, st: n.st }; }

// script items: { who, text, when?, act?, expr? } a line · { caption, dur?, when?, run? } a held wide shot ·
// { choice: { prompt, options } } buttons over Salim's shoulder · { run } on a line runs every frame of it
export function chat(g, o, script, { establish = true, onEnd = null, closeIn = 1.7, tick = null, cast = {} } = {}) {
  const salim = playerActor(g), actors = [salim, o, ...Object.values(cast)];
  let look = o; // whoever spoke last: Salim faces him, the others face Salim
  const face = () => { salim.facing = yawTo(salim.pos, look.pos); for (const a of actors) if (a !== salim) a.facing = yawTo(a.pos, salim.pos); };
  // over the shoulder, further back and wider than a tight two-shot (a head filled a third of the frame on a phone)
  const ots = (from, to, side) => ({ follow: true, p0: () => { const a = from.pos, b = to.pos, f = yawTo(a, b), sd = side * 1.6; return V(a.x - Math.sin(f) * 1.25 + Math.cos(f) * sd, a.y + 1.85, a.z - Math.cos(f) * 1.25 - Math.sin(f) * sd); }, t0: headOf(to), fov: 32 });
  // the wide shot takes the first side with a clear line to the speaker (a wall filled it on the quays)
  let ws = null;
  // Round 32: and nothing drawn in between (tents and awnings are not colliders): a ray from each spot to the speaker's head
  const own = new Set(); for (const a of actors) a.rig.traverse((x) => own.add(x));
  // Round 33: only static scenery blocks the view: skinned people are skipped (one with a freed buffer threw in the Arabic docks run)
  let solid = null;
  const seen = (q, h) => { if (!solid) { solid = []; g.scene.traverseVisible((x) => { if (x.isMesh && !x.isSkinnedMesh && !own.has(x) && x.geometry?.attributes?.position?.array) solid.push(x); }); } RAY.set(q, h.clone().sub(q).normalize()); RAY.far = q.distanceTo(h) - 0.4; return !RAY.intersectObjects(solid, false).length; };
  const wsSide = () => { if (ws) return ws; ws = [3.4, 2.6]; const h = headOf(o)(); for (const [fw, sd] of [[3.4, 2.6], [3.4, -2.6], [2.4, 3.4], [2.4, -3.4], [-3.0, 2.6], [-3.0, -2.6], [2.0, 1.4], [2.0, -1.4]]) { const q = at(o, 2.2, fw, sd)(); if (lineClear(o.pos.x, o.pos.z, q.x, q.z) && seen(q, h)) { ws = [fw, sd]; break; } } return ws; };
  const wide = { follow: true, p0: () => at(o, 2.2, wsSide()[0], wsSide()[1])(), t0: at(o, 1.3, -0.8, 0), p1: () => at(o, 2.0, wsSide()[0] * 0.88, wsSide()[1] * 0.77)(), t1: at(o, 1.3, -0.8, 0), fov: 34 };
  const d = Math.hypot(salim.pos.x - o.pos.x, salim.pos.z - o.pos.z);
  if (closeIn && (d > 2.4 || d < 1.2)) { const f = yawTo(o.pos, salim.pos); salim.pos.set(o.pos.x + Math.sin(f) * closeIn, 0, o.pos.z + Math.cos(f) * closeIn); salim.pos.y = heightAt(salim.pos.x, salim.pos.z); }
  const shots = [];
  if (establish) shots.push({ dur: 2.4, fadeIn: 0.6, cam: wide, enter: () => face() });
  for (const L of script) {
    if (L.caption) { shots.push({ when: L.when, dur: L.dur || 2.6 + L.caption.length / 22, caption: L.caption, cam: L.cam || wide, tight: L.tight, beat: L.beat, enter: () => { face(); salim.st.talk = false; o.st.talk = false; L.enter?.(); }, run: L.run }); continue; }
    if (L.choice) { shots.push({ when: L.when, dur: 0.8, choice: L.choice, cam: ots(salim, o, 0.6), dof: headOf(o), enter: () => { face(); salim.st.talk = false; o.st.talk = false; }, run: () => face() }); continue; }
    const isS = L.who === 'Salim', spk = isS ? salim : cast[L.who] || o;
    let lis = o; // Salim speaks to whoever spoke before him
    shots.push({ when: L.when, dur: lineDur(L.text), tight: L.tight, beat: L.beat, line: { who: L.who, text: L.text, rig: spk.rig, cue: isS ? 'hm' : 'breath', expr: L.expr }, cam: isS ? ots({ get pos() { return lis.pos; } }, salim, -0.35) : ots(salim, spk, 0.35), dof: headOf(spk),
      enter: () => { if (isS) lis = look; else look = spk; face(); for (const a of actors) a.st.talk = a === spk; if (L.act) act(spk, L.act, 1.6); L.enter?.(); }, run: (dd, k, dt) => { if (L.run) L.run(dd, k, dt); else face(); } });
  }
  return { actors, shots, tick: (dd, dt) => { for (const a of actors) tickActor(g, a, dt); tick?.(dd, dt); }, end: () => { for (const a of actors) a.st.talk = false; onEnd?.(); } };
}

// a spot in front of Salim (first of a few bearings with a clear line), for someone who walks up to him
export function spotAhead(g, dist = 6) {
  const p = g.player.pos, f = g.player.facing;
  for (const da of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, Math.PI]) {
    const a = f + da, x = p.x + Math.sin(a) * dist, z = p.z + Math.cos(a) * dist;
    if (lineClear(p.x, p.z, x, z)) return V(x, heightAt(x, z), z);
  }
  return V(p.x + Math.sin(f) * dist, heightAt(p.x + Math.sin(f) * dist, p.z + Math.cos(f) * dist), p.z + Math.cos(f) * dist);
}

// someone made for one scene: a rig, an animation state, and its removal
export function extra(g, look, pos, face = 0) {
  const rig = humanoid({ detail: 'lo', ...look }); rig.position.copy(pos); rig.rotation.y = face; g.scene.add(rig);
  return { rig, st: { phase: 0, walkBlend: 0, action: null, actionT: 0, hitT: 0, dead: false, deadT: 0, seed: Math.random() * 9 }, remove: () => g.scene.remove(rig) };
}

// ------------------------------------------------------------------ Arsaber in the paper-sellers' lane (al-Karkh)
// He walks up the burned lane alone, unarmed, in a plain cloak. Salim lets him walk on, or calls the watch.
export function arsaberLane(g, choose) {
  const start = spotAhead(g, 9);
  const look = byzify({ ...LOOK.officer('#3a2a2a', 0x2a201a), weapon: null, offhand: null, beard: 0x8a8070, beardLen: 0.9, skin: 0xb07a52, sash: 0x3a2a24, scale: 1.04, build: 1.1, belly: 0.3, hemY: 0.3, cloak: 0x3a3028, helm: null, pilos: null, turban: null, cap: 0x2a2420, capBand: 0x1a1612 }); look.mail = false; look.armour = null; // no armour: he walks the lane as a private man
  const E = extra(g, look, start, yawTo(start, g.player.pos)), o = other(E);
  const p = g.player.pos, f = yawTo(start, p), meet = V(p.x - Math.sin(f) * 2.0, 0, p.z - Math.cos(f) * 2.0); meet.y = heightAt(meet.x, meet.z);
  const away = V(start.x - Math.sin(f) * 12, 0, start.z - Math.cos(f) * 12);
  let leaving = false;
  const stroll = (to) => (dd, k, dt) => { o.facing = yawTo(o.pos, to); const done = walk(o, to, 1.3, dt || 1 / 60); o.st.walkBlend = done ? 0 : 1; o.st.phase += (dt || 1 / 60) * 4 * o.st.walkBlend; };
  const script = [
    { caption: 'In the ash of the paper-sellers\' lane, a man in a plain cloak is reading a burned shop sign.', dur: 4.4, run: stroll(meet) },
    { who: 'Arsaber', text: 'You are the guard. My captains describe your face in every report. They draw it badly.', enter: () => { o.pos.copy(meet); o.st.walkBlend = 0; } },
    { who: 'Salim', text: 'Arsaber.', expr: 'anger' },
    { who: 'Arsaber', text: 'No sword today. I came to see what your city did to itself. Forty paper shops on this lane, and not one roof.' },
    { who: 'Salim', text: 'Your men burned the Pages in the kilns.' },
    { who: 'Arsaber', text: 'Olbianos burned them, to buy his life. I wrote home that a man who burns books has no place in my company. They did not answer.' },
    { who: 'Arsaber', text: 'In a hundred years no one will remember the brothers\' war. They will remember who kept the books. I would like it to be us.' },
    { choice: { prompt: 'Arsaber turns to walk on down the lane, alone.', options: [
      { label: 'Let him walk.', fx: () => choose('lane', 'walk') },
      { label: 'Call the watch.', fx: () => choose('lane', 'watch') }] } },
    { who: 'Salim', text: 'Go. Next time we meet, it will not be in the ash.', when: () => g.player.s25?.ch?.lane === 'walk' },
    { who: 'Arsaber', text: 'No. It will be at the river. I will remember this, guard.', when: () => g.player.s25?.ch?.lane === 'walk' },
    { caption: 'Arsaber walked on down the lane and did not look back.', when: () => g.player.s25?.ch?.lane === 'walk', run: (dd, k, dt) => { leaving = true; stroll(away)(dd, k, dt); } },
    { who: 'Salim', text: 'Watch! Here! The envoy of the Rum!', expr: 'anger', when: () => g.player.s25?.ch?.lane === 'watch' },
    { who: 'Arsaber', text: 'Of course. I would have done the same.', when: () => g.player.s25?.ch?.lane === 'watch' },
    { caption: 'The watch came running. Arsaber was over the roofs before they reached the lane, but now every gate in al-Karkh knows his face.', when: () => g.player.s25?.ch?.lane === 'watch',
      run: (dd, k, dt) => { leaving = true; o.facing = yawTo(o.pos, away); const done = walk(o, away, 3.6, dt || 1 / 60); o.st.walkBlend = done ? 0 : 1; o.st.phase += (dt || 1 / 60) * 8 * o.st.walkBlend; } },
  ];
  const def = chat(g, o, script, { establish: false, closeIn: 0, onEnd: () => E.remove() });
  for (const s of def.shots) { const r = s.run; if (s.line) s.run = (dd, k, dt) => { if (!leaving) { o.facing = yawTo(o.pos, g.player.pos); g.player.facing = yawTo(g.player.pos, o.pos); } r?.(dd, k, dt); }; }
  def.shots[0].fadeIn = 0.8; def.shots[0].cam = { follow: true, p0: () => V(p.x + Math.cos(f) * 3.5 - Math.sin(f) * 2.5, p.y + 2.3, p.z - Math.sin(f) * 3.5 - Math.cos(f) * 2.5), t0: at(o, 1.4), fov: 38 };
  return def;
}

// ------------------------------------------------------------------ a scene inside each act
// Each is told with Ishaq in the camp, or (in the hills) with the hill man who brings Jabir's spear.
export const MIDACT = {
  sawad: [
    { who: 'Ishaq', text: 'The village asks for the names of the men who died on the road. They want to say them at the canal.' },
    { who: 'Salim', text: 'Ka\'b, who sang badly. Sinan, and his brother \'Awf. Old Mazin, who walked that road for thirty years.' },
    { who: 'Salim', text: 'And Jabir.', expr: 'sad' },
    { who: 'Ishaq', text: 'Say them again tomorrow, and the day after. That is how the account is kept.' },
    { caption: 'That evening the village children learned five names, and said them at the water.' },
  ],
  marsh: [
    { who: 'Ishaq', text: 'You do not like the water either, I think.' },
    { who: 'Salim', text: 'The year I was nine, the river came over the dykes. Our father had died of a fever that spring.' },
    { who: 'Salim', text: 'Jabir was fourteen. He carried our mother\'s loom through water to his chest, and then he came back for me.' },
    { who: 'Salim', text: 'After that he was not only my brother. He was the one who came back.', expr: 'sad' },
    { who: 'Ishaq', text: 'Then you have been doing the same for him, all this way.' },
  ],
  karkh: [
    { who: 'Ishaq', text: 'There was an instrument maker on this side of the canal, Nu\'aym. He made the best astrolabes in Baghdad. I bought my first one from him, on credit.' },
    { who: 'Salim', text: 'Where is he?' },
    { who: 'Ishaq', text: 'The fire came down his lane in one night. His neighbours say he went back in for his brass plates.', expr: 'sad' },
    { who: 'Ishaq', text: 'Half of al-Karkh burned in one season. Every house was somebody\'s Nu\'aym.' },
    { who: 'Salim', text: 'Then we finish this, and you make an instrument and give it his name.' },
    { who: 'Ishaq', text: 'Yes. That is how scholars remember. We put the name on the work.' },
  ],
  docks: [
    { caption: 'All night in the khan, Hakam\'s copyists worked by lamplight: forty pens on the same Pages.' },
    { who: 'Ishaq', text: 'Hakam has not slept in two days. He says if he sleeps, the ink will dry in the pot and he will have to answer for it.' },
    { who: 'Salim', text: 'How many copies?' },
    { who: 'Ishaq', text: 'Seven by tomorrow. Ten by the end of the month. Wasit, Basra, Merv, Fustat... Once they are on the water, no army can call them back.' },
    { who: 'Salim', text: 'Jabir carried one chest. You are making ten cities carry it.' },
    { who: 'Ishaq', text: 'That is the whole art of it. A secret in one chest can be burned. A thing everyone knows cannot.' },
  ],
  hamrin: [
    { who: 'Shabib', text: 'We found this in the quarry, among their trophies. The men said it was taken on the caravan road, in the spring.' },
    { who: 'Salim', text: '...That is Jabir\'s spear. He wound the grip himself. Badly.', expr: 'sad' },
    { who: 'Shabib', text: 'Then it is yours. A trophy belongs with the dead man\'s family, not with the men who killed him.' },
    { who: 'Salim', text: 'He would want it carried, not hung on a wall.' },
    { caption: 'Salim tied his brother\'s spear behind his saddle. It rode with him from then on.' },
  ],
};
export function midAct(g, region, o) { return chat(g, o, MIDACT[region]); }

// the hill man who brings the spear (made for the scene, beside Salim)
export function hillMan(g) {
  const pos = spotAhead(g, 2.0);
  const E = extra(g, { robe: '#5a4a36', robe2: '#8a7a5a', turban: 0x8a7a5a, beard: 0x3a2a1a, beardLen: 0.8, skin: 0x7a4a2a, weapon: 'spear', sash: 0x5a3a24, build: 1.0 }, pos, yawTo(pos, g.player.pos));
  return E;
}
