// Round 36: Season Two, the Marshes. One question: who is the Friend, the man close to Ishaq who writes to the envoy?
// (The truth, kept for Season Four: it is Ishaq himself. He arranged the theft to carry the last quire, the Teacher's
// account of his poisoning, beyond the court's reach; Bardanes broke the bargain with blood. See STORY.md Round 36.)
//   Cold open        the weir at night, fire on the water: "Your friend in the camp writes a fine hand, guard."
//   Ep 1 The Light Chest       Rabab's boat; eleven quires of twenty; Jabir: "Bardanes called him the friend"; the
//                              landing raid; an arrow in the Teacher's cipher. "No one. No one alive."
//   Ep 2 The Reed Stockade     three learned the cipher; Katakylas: a woman poles the letters. Rabab's boat is gone.
//   Ep 3 The Boatwoman         Layla; the shore sentries; Rabab and her son Hani; the choice rabab36 (trust / bind).
//                              "Then the friend sleeps in our camp."
//   Ep 4 The Last Quire        the names of the poisoners; trade34 comes back; Jabir stands; fire-arrows on the camp.
//                              The last quire is gone, and so is Ishaq.
//   Ep 5 The Drowned Village   Ishaq at dawn, wet to the knee; Salim remembers the Sawad; Petronas: "an old man,
//                              coughing in the damp", last night.
//   Ep 6 The Weir              the brothers; the clock to dawn; Kallinikos; the reed village; the letters, all in the
//                              cipher. "Only one man alive writes this hand."
// Built on drama34.js's runner (cards, clocks, beats); state p.ep36 = { n, b, opened } (saved). Arabic: story36_ar.js.
import * as THREE from 'three';
import { H32 } from './scenes.js';
import { chat, other, extra } from './scenes32.js';
import { humanoid } from './characters.js';
import { LOOK, byzify } from './byz.js';
import { HUB, STORY } from './region.js';
import { SITES, heightAt, WATER_Y } from './terrain.js';
import { LIEUT, BOSS } from './story15.js';
import { choose, chosen } from './story25.js';
import { TYPES } from './entities.js';
import { mashuf } from './regionprops.js';
import { womanLook } from './women33.js';
import { t } from './i18n.js';

const { V, ground, yawTo, lineDur, actor, at, headOf, walk, act, tickActor, playerActor } = H32;

export const EPISODES2 = {
  1: { title: 'The Light Chest', ar: 'الصندوق الخفيف', next: '' },
  2: { title: 'The Reed Stockade', ar: 'حصن القصب', next: 'No one alive writes that hand. Except one.' },
  3: { title: 'The Boatwoman', ar: 'صاحبة القارب', next: 'A woman carries the letters. And Rabab is gone.' },
  4: { title: 'The Last Quire', ar: 'الكرّاس الأخير', next: 'The friend sleeps in Salim\'s own camp.' },
  5: { title: 'The Drowned Village', ar: 'القرية الغارقة', next: 'The last quire is gone. So is Ishaq.' },
  6: { title: 'The Weir', ar: 'السِّكر', next: 'Last night, Ishaq was not in his tent.' },
  7: { title: 'Season Three · Al-Karkh', ar: 'الموسم الثالث · الكرخ', next: 'Ishaq owes Salim an answer.' },
};
const RECAP2 = {
  2: () => ['Rabab the boatwoman poled Salim into the marshes.', 'The chest was light. Kallinikos has the rest of the Pages.', 'Then an arrow brought a message in the Teacher\'s cipher. Only Ishaq writes it.'],
  3: () => ['Three men learned the cipher. Only Ishaq still lives.', 'Katakylas fell in the reed stockade. A woman poles the letters, he said.', 'And Rabab\'s boat was gone.'],
  4: (g) => ['Rabab carried the letters so they would let her see her son.', chosen(g, 'rabab36') === 'trust' ? 'Salim trusted her.' : 'Salim bound her, for Ishaq to judge.', 'The letters are left a stone\'s throw from Salim\'s own fire.'],
  5: () => ['Ishaq told what the last quire holds: the names of the men who poisoned the Teacher.', 'Fire-arrows came down on the camp.', 'Then the last quire was gone. And so was Ishaq.'],
  6: () => ['Ishaq came back at dawn. He had hidden the quire, he said.', 'Petronas fell in the drowned village.', 'The friend went to the weir himself, last night. The night Ishaq was gone.'],
};
const FLOOR2 = { 1: 7, 2: 7, 3: 8, 4: 8, 5: 9, 6: 9 };
// which of the marshes' open-ground troops are out in each episode
const ZONES2 = { 1: [], 2: ['serai'], 3: [], 4: [], 5: ['kiln'], 6: ['south'] };

// Rabab, the boatwoman, and her son Hani
const RABAB = womanLook(2, { robe: '#2e3a3a', robe2: '#6a2a2a', wrap: 0x3a2a24, skin: 0x8a5a3a, weapon: 'spear', sash: 0x8a6a3a });
const HANI = { robe: '#b8a888', robe2: '#4a3a2a', turban: null, cap: 0x4a3a2a, capBand: 0x2a1a10, skin: 0x8a5a3a, weapon: null, sash: 0x4a3a2a, scale: 0.66, build: 0.85 };

export function season2(C) {
  const { g, D, E, play, sleep, said, ishaq, npcNamed, bark, gateNpc, goto, fight, holdBeat, leaveHold, withCliff, startClock, stopClock, clock } = C;
  const p = g.player, sc = g.scene;
  const VIL = SITES.village;
  const jab = () => g.jabir35;
  const jabCast = () => (jab() ? { Jabir: other(jab()) } : {});
  const night = () => g.lighting?.set?.('night', 0), day = () => g.lighting?.forAct?.(g.act || 4, 0);
  const lvl = (d = 0) => Math.max(7, p.level + d);

  // ------------------------------------------------ places: the camp's landing, the shore below the drowned village
  // the channel the boat comes down (the same search as the old arrival), and the last dry ground on it (the landing)
  const chan = (() => {
    let a0 = 0, best = null;
    for (let i = 0; i < 48 && !best; i++) {
      const a = i / 48 * Math.PI * 2, x = VIL.x + Math.sin(a) * 32, z = VIL.z + Math.cos(a) * 32, x2 = VIL.x + Math.sin(a) * 58, z2 = VIL.z + Math.cos(a) * 58;
      if (heightAt(x, z) < WATER_Y - 0.35 && heightAt(x2, z2) < WATER_Y - 0.35 && heightAt((x + x2) / 2, (z + z2) / 2) < WATER_Y - 0.35) { best = [x, z, x2, z2]; a0 = a; }
    }
    const [nx, nz, fx, fz] = best || [VIL.x + 30, VIL.z - 30, VIL.x + 56, VIL.z - 56];
    let land = ground(VIL.x + Math.sin(a0) * 12, VIL.z + Math.cos(a0) * 12);
    for (let r = 10; r < 32; r += 0.5) { const x = VIL.x + Math.sin(a0) * r, z = VIL.z + Math.cos(a0) * r; if (heightAt(x, z) < WATER_Y + 0.12) break; land = ground(x, z); }
    return { a: a0, nx, nz, fx, fz, land };
  })();
  // dry ground near a point (a spiral out from it)
  const dryNear = (x, z) => { for (let r = 0; r < 16; r += 1.2) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, qx = x + Math.sin(a) * r, qz = z + Math.cos(a) * r; if (heightAt(qx, qz) > WATER_Y + 0.25) return ground(qx, qz); } return ground(x, z); };
  // the shore below the drowned village, on the way from the camp
  const SHORE = (() => { const K = SITES.kiln, d = Math.hypot(VIL.x - K.x, VIL.z - K.z), k = 30 / d; return dryNear(K.x + (VIL.x - K.x) * k, K.z + (VIL.z - K.z) * k); })();

  // ------------------------------------------------ the cedar chest by Ishaq's place (its lid opens)
  const chest = new THREE.Group();
  const lid = new THREE.Group();
  {
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: 0.8 }), band = new THREE.MeshStandardMaterial({ color: 0x5a4a30, metalness: 0.6, roughness: 0.5 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.4), wood); box.position.y = 0.17; chest.add(box);
    for (const x of [-0.22, 0.22]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.41), band); b.position.set(x, 0.17, 0); chest.add(b); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.06, 0.42), wood); top.position.set(0, 0.03, 0.21); lid.add(top);
    lid.position.set(0, 0.34, -0.21); chest.add(lid);
    // the quires inside, pale under the lid
    const leaves = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.3), new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 1 })); leaves.position.y = 0.24; chest.add(leaves);
    chest.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  const [hx, hz] = HUB?.ishaq || [VIL.x, VIL.z];
  const chestAt = ground(hx + 1.3, hz - 1.0);
  chest.position.copy(chestAt); chest.rotation.y = yawTo(chestAt, ground(HUB?.spawn?.[0] ?? hx, HUB?.spawn?.[1] ?? hz + 6)); sc.add(chest);
  const lidOpen = (k) => { lid.rotation.x = -k * 1.9; };
  lidOpen(0);
  const chestTop = () => chest.position.clone().add(V(0, 0.4, 0));
  // an insert shot of the chest, from the side Salim stands on
  const chestCam = (d = 1.6, h = 1.3) => ({ follow: true, p0: () => { const f = chest.rotation.y; return chestTop().add(V(Math.sin(f) * d + Math.cos(f) * 0.6, h, Math.cos(f) * d - Math.sin(f) * 0.6)); }, t0: () => chestTop().add(V(0, -0.15, 0)), fov: 34 });

  // an arrow with a linen strip (the dune's message, again)
  const makeArrow = () => {
    const a = new THREE.Group();
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 5), new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.9 })); sh.position.y = 0.4;
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.004), new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 1 })); cloth.position.set(0.05, 0.62, 0);
    a.add(sh, cloth); return a;
  };

  // ================================================================ the scenes
  // ---------------- the cold open: the weir at night, the reed village burning, Kallinikos and his siphon
  function coldOpen() {
    const salim = playerActor(g), actors = [salim], extraR = [], lamp = g.bossLight;
    const A = SITES.arch, K = dryNear(A.x, A.z - 2);
    const kal = actor(TYPES.rawh.build({}), K.clone(), 0); sc.add(kal.rig); extraR.push(kal.rig); actors.push(kal);
    const S = dryNear(K.x + 4.5, K.z + 3.5);
    // the reed village burning on the far side of the weir, and fire running on the water
    const burnAt = dryNear(K.x - 16, K.z - 14);
    const burn = () => {
      for (let i = 0; i < 4; i++) { const a = Math.random() * 6.28, r = Math.random() * 8; g.fx.fire(V(burnAt.x + Math.cos(a) * r, burnAt.y + Math.random() * 1.6, burnAt.z + Math.sin(a) * r), 2.4 + Math.random() * 1.6); }
      for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28, r = 6 + Math.random() * 10; g.fx.fire(V(K.x + Math.cos(a) * r, WATER_Y + 0.1, K.z + Math.sin(a) * r), 1.4 + Math.random()); }
    };
    // fire running on the water close around the two of them
    const burnNear = () => { for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28, r = 2.5 + Math.random() * 4; g.fx.fire(V((K.x + S.x) / 2 + Math.cos(a) * r, Math.max(WATER_Y, heightAt((K.x + S.x) / 2 + Math.cos(a) * r, (K.z + S.z) / 2 + Math.sin(a) * r)) + 0.1, (K.z + S.z) / 2 + Math.sin(a) * r), 1.8 + Math.random()); } };
    const place = () => {
      salim.pos.copy(S); salim.facing = yawTo(S, K); salim.st.action = null; salim.st.crouch = 0;
      kal.facing = yawTo(K, S); night();
      if (lamp) { lamp.color.set(0xff7a30); lamp.distance = 16; lamp.position.copy(K).lerp(S, 0.5).add(V(0, 1.6, 0)); lamp.intensity = 16; }
    };
    const jet = (k) => { const a = at(kal, 1.3, 0.6)(), b = at(salim, 1.2)(); for (let i = 0; i < 6; i++) { const q = a.clone().lerp(b, Math.min(1, k * 1.4) * Math.random()); g.fx.fire(q, 2.0 + Math.random()); } };
    const shots = [
      // low over the burning water, onto the weir: two men, the village burning behind
      { dur: 3.6, fadeIn: 0.5, tight: true, beat: 2, stinger: 'ambush', enter: () => place(),
        cam: { p0: () => { const f = yawTo(K, S); return V(S.x + Math.sin(f) * 3.2 + Math.cos(f) * 1.4, S.y + 1.1, S.z + Math.cos(f) * 3.2 - Math.sin(f) * 1.4); }, t0: () => at(kal, 1.4)(), p1: () => { const f = yawTo(K, S); return V(S.x + Math.sin(f) * 2.2 + Math.cos(f) * 1.1, S.y + 1.3, S.z + Math.cos(f) * 2.2 - Math.sin(f) * 1.1); }, t1: () => at(kal, 1.5)(), fov: 36 },
        run: () => { burn(); burnNear(); } },
      { dur: lineDur('Your friend in the camp writes a fine hand, guard.'), line: { who: 'Kallinikos', text: 'Your friend in the camp writes a fine hand, guard.', rig: kal.rig, cue: 'hm', expr: 'neutral' }, tight: true, beat: 1,
        cam: { follow: true, p0: () => { const f = yawTo(salim.pos, kal.pos), h = headOf(salim)(); return V(h.x - Math.sin(f) * 1.3 + Math.cos(f) * 0.7, h.y + 0.15, h.z - Math.cos(f) * 1.3 - Math.sin(f) * 0.7); }, t0: () => headOf(kal)().add(V(0, -0.15, 0)), fov: 30 }, dof: headOf(kal), aperture: 1.3,
        run: () => { burn(); burnNear(); } },
      { dur: lineDur('What friend?'), line: { who: 'Salim', text: 'What friend?', rig: p.rig, cue: 'hm', expr: 'wary' }, tight: true,
        cam: { follow: true, p0: at(salim, 1.65, 1.6, -0.5), t0: headOf(salim), fov: 28 }, dof: headOf(salim), aperture: 1.4, run: () => { burn(); burnNear(); } },
      // he lifts the siphon; the fire comes; the frame freezes white-hot
      { dur: 1.9, slow: 0.5, tight: true, beat: 2,
        enter: () => act(kal, 'attack', 1.4),
        cam: { follow: true, p0: () => { const f = yawTo(kal.pos, salim.pos); return V(kal.pos.x + Math.sin(f) * 3.2 + Math.cos(f) * 1.6, kal.pos.y + 1.6, kal.pos.z + Math.cos(f) * 3.2 - Math.sin(f) * 1.6); }, t0: at(kal, 1.4), fov: 34 },
        run: (d, k) => { burn(); if (k > 0.35) jet((k - 0.35) / 0.65); if (k > 0.7 && !kal.flash) { kal.flash = true; g.fx.flash?.(at(salim, 1.3)(), 0xff8030, 80, 0.8, 20); g.audio.boom?.(); document.body.classList.add('ep34freeze'); d.fade(1, 0.5); } } },
    ];
    return { dusk: 1, actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); },
      end: () => { for (const r of extraR) sc.remove(r); document.body.classList.remove('ep34freeze'); day(); if (lamp) { lamp.intensity = 0; lamp.color.set(0xff8a40); lamp.distance = 16; } } };
  }

  // ---------------- Ep 1: Rabab poles Salim into the marshes
  function boatIn() {
    const salim = playerActor(g), actors = [salim], extraR = [];
    const { nx, nz, fx, fz, land } = chan;
    const boat = mashuf(6); sc.add(boat); extraR.push(boat);
    const rab = actor(humanoid(RABAB), V(fx, WATER_Y + 0.2, fz), 0); sc.add(rab.rig); extraR.push(rab.rig); actors.push(rab);
    const f = Math.atan2(nx - fx, nz - fz);
    const glide = (k) => {
      const x = fx + (nx - fx) * k, z = fz + (nz - fz) * k;
      boat.position.set(x, WATER_Y - 0.18 + Math.sin(k * 20) * 0.02, z); boat.rotation.y = f;
      rab.pos.set(x - Math.sin(f) * 1.9, WATER_Y + 0.14, z - Math.cos(f) * 1.9); rab.facing = f;
      p.pos.set(x + Math.sin(f) * 0.9, WATER_Y + 0.14, z + Math.cos(f) * 0.9); salim.facing = f + Math.PI; salim.st.crouch = 0.6;
      rab.st.action = 'thrust'; rab.st.actionT = (k * 6) % 1;
    };
    let K = 0; const run = (span) => (d, k) => { K = span[0] + (span[1] - span[0]) * k; glide(K); };
    // the two in the boat face each other: Salim sits forward, looking back at her
    const onRab = { follow: true, p0: () => { const h = headOf(salim)(); return V(h.x - Math.cos(f) * 0.75 - Math.sin(f) * 0.4, h.y + 0.1, h.z + Math.sin(f) * 0.75 - Math.cos(f) * 0.4); }, t0: () => headOf(rab)().add(V(0, -0.1, 0)), fov: 32 };
    const onSalim = { follow: true, p0: () => { const h = headOf(rab)(); return V(h.x - Math.cos(f) * 0.5 + Math.sin(f) * 0.6, h.y - 0.15, h.z + Math.sin(f) * 0.5 + Math.cos(f) * 0.6); }, t0: () => headOf(salim)(), fov: 30 };
    const shots = [
      { dur: 6.0, fadeIn: 1.4, caption: 'The Nahrawan marshes, east of Baghdad. Three days after the arch.',
        cam: { p0: () => V(fx + 14, 8, fz + 10), t0: () => V((fx + nx) / 2, 0, (fz + nz) / 2), p1: () => V(fx + 6, 3.6, fz + 13), t1: () => V(nx, 0.5, nz) }, run: run([0, 0.35]) },
      { dur: lineDur('Keep your hands inside the boat, guard. Things bite out here.'), line: { who: 'Rabab', text: 'Keep your hands inside the boat, guard. Things bite out here.', rig: rab.rig, cue: 'breath', expr: 'neutral' }, cam: onRab, dof: headOf(rab), run: run([0.35, 0.5]) },
      { dur: lineDur('Snakes?'), line: { who: 'Salim', text: 'Snakes?', rig: p.rig, cue: 'hm', expr: 'wary' }, cam: onSalim, dof: headOf(salim), run: run([0.5, 0.56]) },
      { dur: lineDur('Tax men.'), line: { who: 'Rabab', text: 'Tax men.', rig: rab.rig, cue: 'breath', expr: 'warm' }, cam: onRab, dof: headOf(rab), run: run([0.56, 0.62]) },
      { dur: lineDur('You pole these channels like you were born on them.'), line: { who: 'Salim', text: 'You pole these channels like you were born on them.', rig: p.rig, cue: 'hm', expr: 'neutral' }, cam: onSalim, dof: headOf(salim), run: run([0.62, 0.74]) },
      { dur: lineDur('I was. Every channel, every reed bed, as far as the weir.'), line: { who: 'Rabab', text: 'I was. Every channel, every reed bed, as far as the weir.', rig: rab.rig, cue: 'breath', expr: 'neutral' }, cam: onRab, dof: headOf(rab), run: run([0.74, 0.88]) },
      { dur: 2.6, cam: { follow: true, p0: () => V(p.pos.x + 4, 2.4, p.pos.z + 4), t0: at(salim, 1.2), fov: 38 }, run: (d, k) => { glide(0.88 + 0.12 * k); if (k > 0.75) d.fade(1, 0.5); } },
    ];
    return { actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); },
      end: () => { for (const r of extraR) sc.remove(r); salim.st.crouch = 0; p.pos.copy(land); p.facing = yawTo(land, ground(hx, hz)); g.act = Math.max(g.act || 4, 4); (g.arrived ||= {}).marsh = true; } };
  }
  // ---------------- Ep 1: the light chest
  const lightChest = () => {
    const def = chat(g, ishaq(), [
      { caption: 'The chest from Bardanes\' tent. It weighed less than it should.', cam: chestCam(1.7, 1.4), enter: () => lidOpen(1) },
      { who: 'Ishaq', text: 'Eleven quires. There were twenty.', expr: 'sad' },
      { who: 'Salim', text: 'Kallinikos has the rest?', expr: 'stern' },
      { who: 'Ishaq', text: 'Most of them. And the last.', expr: 'sad', tight: true, beat: 1 },
      // the plant: he shuts the lid on it
      { caption: 'Ishaq closed the lid. Quickly.', dur: 2.6, cam: chestCam(1.3, 1.0), run: (d, k) => lidOpen(1 - Math.min(1, k * 2.2)) },
      { who: 'Jabir', text: 'In the vault, a man came to Bardanes at night. I never saw his face. Bardanes called him the friend.', expr: 'pain', tight: true, beat: 2 },
      { who: 'Salim', text: 'Photeinos said it too. Ishaq has a friend who writes to the envoy.', expr: 'stern' },
      { who: 'Ishaq', text: 'I have very few friends, Salim. Fewer every year.', expr: 'sad' },
      { who: 'Jabir', text: 'He coughs all night in this damp. Make him sleep, little brother.', expr: 'warm' },
      { who: 'Ishaq', text: 'The fishermen say Kallinikos\' reed-men raid the landing at dusk. Be there first.' },
    ], { cast: jabCast(), onEnd: () => lidOpen(0) });
    return def;
  };
  // the landing raid
  const landingRaid = () => {
    const L = chan.land, foes = [...g.spawnPack(['reedman', 'slinger', 'reedman'], L.x + Math.sin(chan.a) * 3, L.z + Math.cos(chan.a) * 3, 3, lvl(-1), { spread: 3 }), ...g.spawnPack('netter', L.x, L.z, 1, lvl(-1), { spread: 1 })];
    for (const e of foes) e.alerted = true; return foes;
  };
  // ---------------- Ep 1: night; an arrow by Jabir's pallet
  const arrowNight = () => {
    const arrow = makeArrow();
    const J = jab()?.rig?.position || ground(hx - 2.6, hz + 1.8);
    const spot = ground(J.x + 0.8, J.z - 0.6);
    const def = chat(g, ishaq(), [
      { caption: 'That night, something came out of the dark and struck the post by Jabir\'s pallet.', tight: true, beat: 2,
        enter: () => { night(); arrow.position.copy(spot).add(V(0, -0.1, 0)); arrow.rotation.set(0.3, 0.4, 0.25); sc.add(arrow); g.audio.hit?.(); },
        cam: { follow: true, p0: () => { const f = yawTo(ground(hx, hz), spot); return spot.clone().add(V(Math.sin(f) * 0.9, 1.05, Math.cos(f) * 0.9)); }, t0: () => spot.clone().add(V(0, 0.45, 0)), fov: 34 }, dof: () => spot.clone().add(V(0, 0.5, 0)), aperture: 1.6 },
      { who: 'Jabir', text: 'The same marks, Salim. Like the arrow on the dune.', expr: 'fear' },
      { who: 'Salim', text: 'Read it.', expr: 'stern' },
      { caption: 'Ishaq read it twice. He did not read it aloud the first time.', tight: true },
      { who: 'Ishaq', text: 'It says the rest of the Pages burn at the weir, unless I come.', expr: 'sad' },
      { who: 'Salim', text: 'It is your teacher\'s cipher. Who else writes it?', expr: 'stern', tight: true, beat: 1 },
      { who: 'Ishaq', text: 'No one. No one alive.', expr: 'fear', tight: true, beat: 2 },
    ], { cast: jabCast(), onEnd: () => { sc.remove(arrow); } });
    return withCliff(def, 1);
  };

  // ---------------- Ep 2: three learned the cipher
  const cipherTalk = () => chat(g, ishaq(), [
    { who: 'Salim', text: 'No one alive writes that hand, you said. Then who wrote it?', expr: 'anger' },
    { who: 'Ishaq', text: 'Three of us learned it from him. Olbianos copied it without understanding it, and he is dead.' },
    { who: 'Ishaq', text: 'The third was a boy called Rafi\'. The siege took him. I watched his street burn.', expr: 'sad' },
    { who: 'Salim', text: 'So a dead man writes letters.', expr: 'stern' },
    { who: 'Ishaq', text: 'Or a living one learned it from a dead man\'s papers.' },
    { who: 'Jabir', text: 'Or someone in this camp is lying.', expr: 'neutral', tight: true, beat: 1 },
    { caption: 'Nobody answered him.', dur: 2.4 },
    { who: 'Ishaq', text: 'The fishermen say the letters go through the reed stockade. Katakylas holds it.' },
    { who: 'Salim', text: 'Then Katakylas can tell me who carries them.', expr: 'resolve' },
  ], { cast: jabCast() });
  // ---------------- Ep 2: Rabab's boat is gone
  const boatGone = () => {
    const salim = playerActor(g), L = chan.land, pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.4, 5), new THREE.MeshStandardMaterial({ color: 0x7a6040, roughness: 1 }));
    const W = V(L.x + Math.sin(chan.a) * 3.5, WATER_Y + 0.02, L.z + Math.cos(chan.a) * 3.5);
    pole.rotation.set(Math.PI / 2, 0, chan.a + 0.6); pole.position.copy(W);
    const shots = [
      { dur: 4.2, fadeIn: 0.8, caption: 'When Salim came back to the landing, Rabab\'s boat was gone. Her pole was floating in the reeds.', tight: true, beat: 1,
        enter: () => { sc.add(pole); p.pos.copy(L); salim.facing = yawTo(L, W); },
        cam: { follow: true, p0: () => V(L.x - Math.sin(chan.a) * 0.8 + Math.cos(chan.a) * 2.8, L.y + 1.7, L.z - Math.cos(chan.a) * 0.8 - Math.sin(chan.a) * 2.8), t0: () => W.clone().lerp(L, 0.3).add(V(0, 0.4, 0)), fov: 40 } },
      { dur: lineDur('She knew every channel. Of course she did.'), line: { who: 'Salim', text: 'She knew every channel. Of course she did.', rig: p.rig, cue: 'hm', expr: 'anger' }, tight: true, beat: 2,
        cam: { follow: true, p0: at(salim, 1.65, 1.5, 0.5), t0: headOf(salim), fov: 28 }, dof: headOf(salim) },
    ];
    return withCliff({ actors: [salim], shots, tick: (d, dt) => tickActor(g, salim, dt), end: () => sc.remove(pole) }, 2);
  };

  // ---------------- Ep 3: Layla; the shore; Rabab
  const layla = () => { const n = npcNamed('Layla'); return chat(g, other(n), [
    { who: 'Salim', text: 'The boatwoman, Rabab. Where does she go?', expr: 'stern' },
    { who: 'Layla', text: 'East, every night, to the drowned village. Since the soldiers took her boy.' },
    { who: 'Salim', text: 'Her boy?', expr: 'wary' },
    { who: 'Layla', text: 'Hani. Twelve years old. They make him row for Kallinikos. She would carry fire in her hands to see him.', expr: 'sad', tight: true, beat: 1 },
    { who: 'Layla', text: 'Do not hurt her, guard. Half this marsh would have done the same.' },
  ]); };
  const shoreWatch = () => {
    const foes = [...g.spawnPack(['reedman', 'netter', 'slinger'], SHORE.x + 3, SHORE.z - 3, 3, lvl(-1), { spread: 3 }), ...g.spawnPack('archer', SHORE.x - 2, SHORE.z - 5, 1, lvl(-1), { spread: 1 })];
    for (const e of foes) e.alerted = true; return foes;
  };
  let rab3 = null;
  const rababAt = () => { if (!rab3) { const q = dryNear(SHORE.x - 1.5, SHORE.z + 1.5); rab3 = extra(g, { ...RABAB, weapon: null }, q, yawTo(q, SHORE)); rab3.rig.visible = live3();
    // her basket of bread at her feet
    const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.24, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0x9a7a4a, roughness: 1, side: THREE.DoubleSide }));
    const f = yawTo(q, SHORE) + 0.9; bk.position.set(q.x + Math.sin(f) * 0.55, heightAt(q.x, q.z) + 0.12, q.z + Math.cos(f) * 0.55); bk.castShadow = true; rab3.rig.parent.add(bk); rab3.basket = bk; bk.visible = rab3.rig.visible; } return rab3.rig.position; };
  const live3 = () => E().n === 3 && E().b >= 2;
  const rababScene = () => {
    rababAt(); rab3.rig.visible = true; rab3.basket.visible = true;
    const def = chat(g, other(rab3), [
      { caption: 'On the shore below the drowned village, Rabab was packing bread into a basket.' },
      { who: 'Salim', text: 'You carried their letters.', expr: 'anger' },
      { who: 'Rabab', text: 'They have my son. Hani. He rows Kallinikos\' boat.', expr: 'grief', tight: true, beat: 1 },
      { who: 'Rabab', text: 'I cannot read, guard. I never could. I carry what I find, and they let me see him for an hour.', expr: 'sad' },
      { who: 'Salim', text: 'Who gives you the letters?', expr: 'stern' },
      { who: 'Rabab', text: 'No one gives them. They are left under a stone at the old mooring post. With a silver coin.' },
      { choice: { prompt: 'Rabab waits to hear what you think she is.', options: [
        { label: 'Then take me to your son.', fx: () => choose(g, 'rabab36', 'trust') },
        { label: 'You will answer to Ishaq.', fx: () => choose(g, 'rabab36', 'bind') }] } },
      { who: 'Rabab', text: 'The drowned village has a back way in. I will show you.', when: () => chosen(g, 'rabab36') === 'trust' },
      { who: 'Rabab', text: 'Then tie me. But tie me where I can see the water.', expr: 'sad', when: () => chosen(g, 'rabab36') !== 'trust' },
      { who: 'Salim', text: 'The old mooring post. That is by our camp.', expr: 'wary', tight: true, beat: 1 },
      { who: 'Rabab', text: 'A stone\'s throw from your own fire.' },
      { who: 'Salim', text: 'Then the friend sleeps in our camp.', expr: 'anger', tight: true, beat: 2 },
    ], { onEnd: () => { if (rab3) { rab3.rig.visible = false; rab3.basket.visible = false; } } });
    return withCliff(def, 3);
  };

  // ---------------- Ep 4: the last quire
  const lastQuire = () => chat(g, ishaq(), [
    { who: 'Salim', text: 'The letters are left a stone\'s throw from our fire. Tell me what is in that chest, Ishaq. All of it.', expr: 'anger' },
    { who: 'Ishaq', text: 'The sayings. The letters. And one more quire. The last.', expr: 'sad' },
    { who: 'Ishaq', text: 'In the prison, he wrote down how he was dying. And the names of the men who poisoned him.', expr: 'grief', tight: true, beat: 2 },
    { who: 'Ishaq', text: 'Some of them sit at court today.' },
    { who: 'Salim', text: 'So the envoy does not want wisdom. He wants a knife at Baghdad\'s throat.', expr: 'stern' },
    { who: 'Ishaq', text: 'The envoy wants to hold it over them. The court wants it burned. And the man who can read it.' },
    // Round 36: Season One's choice comes back
    { who: 'Ishaq', text: 'You told Bardanes you would bring me. For a moment I believed you. I would have gone.', expr: 'sad', when: () => chosen(g, 'trade34') === 'feign' },
    { who: 'Salim', text: 'I would not have let you.', expr: 'stern', when: () => chosen(g, 'trade34') === 'feign' },
    { who: 'Ishaq', text: 'You would not trade me for your brother. I never thanked you. I do not know that I deserve to.', expr: 'sad', when: () => chosen(g, 'trade34') !== 'feign' },
    { who: 'Salim', text: 'Thank Jabir. He would never have forgiven me.', when: () => chosen(g, 'trade34') !== 'feign' },
    { caption: 'Jabir pushed himself up off the pallet. And stood.', tight: true, beat: 1, enter: () => { const j = jab(); if (j) { j.stand36 = true; j.st.crouch = 0; } } },
    { who: 'Jabir', text: 'Then we carry it the rest of the way. All of us.', expr: 'resolve' },
    { who: 'Salim', text: 'Sit down before you fall down, brother.', expr: 'warm' },
    { caption: 'Fire-arrows came out of the reeds.', tight: true, beat: 2, enter: () => { night(); g.audio.stinger?.('ambush'); } },
  ], { cast: jabCast(), onEnd: () => { const j = jab(); if (j) j.stand36 = false; } });
  const fireRaid = () => {
    const foes = [];
    for (const a of [chan.a + 0.6, chan.a - 0.7]) { const q = dryNear(hx + Math.sin(a) * 15, hz + Math.cos(a) * 15); foes.push(...g.spawnPack(['archer', 'reedman', 'naffat'], q.x, q.z, 3, lvl(-1), { spread: 2.5 })); }
    for (const e of foes) e.alerted = true; return foes;
  };
  const quireGone = () => {
    const salim = playerActor(g);
    const shots = [
      { dur: 4.0, fadeIn: 0.8, caption: 'When the last fire was out, Salim went to Ishaq\'s place. The chest stood open.', tight: true, beat: 1,
        enter: () => { night(); g.npc.visible = false; lidOpen(1); const f = chest.rotation.y; p.pos.copy(ground(chest.position.x + Math.sin(f) * 1.6, chest.position.z + Math.cos(f) * 1.6)); salim.facing = yawTo(p.pos, chest.position); },
        cam: chestCam(1.6, 1.3) },
      { dur: lineDur('The last quire is gone.'), line: { who: 'Salim', text: 'The last quire is gone.', rig: p.rig, cue: 'hm', expr: 'fear' }, tight: true,
        cam: { follow: true, p0: at(salim, 1.65, 1.5, 0.5), t0: headOf(salim), fov: 28 }, dof: headOf(salim) },
      { dur: lineDur('So is Ishaq.'), line: { who: 'Jabir', text: 'So is Ishaq.', rig: jab()?.rig || p.rig, cue: 'breath', expr: 'fear' }, tight: true, beat: 2,
        enter: () => { const j = jab(); if (j) { j.stand36 = true; } },
        cam: { follow: true, p0: () => jab() ? at(other(jab()), 1.6, 1.6, 0.6)() : at(salim, 1.65, 1.5, 0.5)(), t0: () => jab() ? headOf(other(jab()))() : headOf(salim)(), fov: 30 } },
    ];
    return withCliff({ actors: [salim], shots, tick: (d, dt) => tickActor(g, salim, dt), end: () => { const j = jab(); if (j) j.stand36 = false; } }, 4);
  };

  // ---------------- Ep 5: dawn; Ishaq comes up from the water
  const dawnBack = () => {
    const ish = ishaq(), home = g.npc.position.clone(), from = ground(chan.land.x, chan.land.z);
    return { actors: [playerActor(g), ish], shots: [
      { dur: 5.0, fadeIn: 1.2, caption: 'At first light Ishaq came up from the water. Wet to the knee. Ash on his fingers.',
        enter: () => { g.lighting?.set?.('dawn', 0); g.npc.visible = true; lidOpen(0); ish.pos.copy(from); p.pos.copy(ground(home.x + 1.6, home.z + 1.2)); },
        cam: { p0: () => home.clone().add(V(4, 2.2, 4)), t0: () => at(ish, 1.2)(), p1: () => home.clone().add(V(3, 1.8, 3)), t1: () => at(ish, 1.2)(), fov: 38 },
        run: (d, k, dt) => { const done = walk(ish, home, 1.1, dt); ish.st.walkBlend = done ? 0 : 1; ish.st.phase += dt * 4 * ish.st.walkBlend; } },
    ], tick: (d, dt) => { g.npc.position.copy(ish.pos); }, end: () => { g.npc.position.copy(home); g.npcSt.walkBlend = 0; } };
  };
  const dawnTalk = () => chat(g, ishaq(), [
    { who: 'Salim', text: 'Where is it?', expr: 'anger' },
    { who: 'Ishaq', text: 'Where no fire can reach it. Do not ask me where. What you do not know, no one can make you tell.' },
    { who: 'Salim', text: 'You went out alone. Again.', expr: 'anger' },
    { who: 'Ishaq', text: 'Again?', expr: 'wary' },
    { who: 'Salim', text: 'In the Sawad, the night before the canal went black. Your sandals were wet then too.', expr: 'stern', tight: true, beat: 1 },
    { who: 'Salim', text: 'And you knew the water was fouled before anyone told you.', expr: 'anger', tight: true, beat: 2 },
    { caption: 'Ishaq did not answer.', dur: 2.6, tight: true },
    { who: 'Jabir', text: 'Salim. The boy first. Then the questions.', expr: 'stern' },
    // Rabab, by the choice
    { caption: 'In the night someone had untied Rabab. Ishaq, she said. "A mother is not a thief," he had told her.', when: () => chosen(g, 'rabab36') !== 'trust' },
    { who: 'Ishaq', text: 'Rabab is waiting at the landing. She knows the back way into the drowned village.' },
  ], { cast: jabCast(), onEnd: () => day() });
  const coughCliff = () => {
    const salim = playerActor(g);
    const shots = [
      { dur: lineDur('An old man, coughing in the damp. Last night.'), line: { who: 'Salim', text: 'An old man, coughing in the damp. Last night.', rig: p.rig, cue: 'breath', expr: 'wary' }, tight: true, beat: 1,
        cam: { follow: true, p0: at(salim, 1.7, 2.2, 0.9), t0: headOf(salim), fov: 32 }, dof: headOf(salim) },
      { dur: lineDur('Last night, Ishaq was not in his tent.'), line: { who: 'Salim', text: 'Last night, Ishaq was not in his tent.', rig: p.rig, cue: 'hm', expr: 'anger' }, tight: true, beat: 2,
        cam: { follow: true, p0: at(salim, 1.65, 1.3, 0.4), t0: headOf(salim), p1: at(salim, 1.65, 1.1, 0.35), t1: headOf(salim), fov: 28 }, dof: headOf(salim) },
    ];
    return withCliff({ actors: [salim], shots, tick: (d, dt) => tickActor(g, salim, dt) }, 5);
  };

  // ---------------- Ep 6: the brothers, before the weir
  const brothers = () => {
    const j = jab(); if (!j) return chat(g, ishaq(), [{ who: 'Ishaq', text: 'When you come back, ask me. I will answer.' }]);
    return chat(g, other(j), [
      { who: 'Jabir', text: 'You think it is Ishaq.', expr: 'neutral' },
      { who: 'Salim', text: 'I think he has lied to me twice. And he is the only man alive who writes that hand.', expr: 'stern' },
      { who: 'Jabir', text: 'He kept me alive in his account, all through the Sawad. Ask him after. Not before a fight.' },
      { who: 'Jabir', text: 'The year of the flood, I came back for you.', expr: 'warm' },
      { who: 'Salim', text: 'And at the arch, I came back for you.', expr: 'warm' },
      { who: 'Jabir', text: 'So we are even. Go and bring that boy back to his mother.', expr: 'resolve' },
      { who: 'Ishaq', text: 'Salim. When you come back, ask me. I will answer. All of it.', expr: 'sad', tight: true, beat: 1 },
      { who: 'Salim', text: 'Keep the lamp lit, Ishaq. I will hold you to that.', expr: 'stern' },
    ], { cast: { Ishaq: ishaq() }, tick: () => { p.st.crouch = 0.75; }, onEnd: () => { p.st.crouch = 0; } });
  };
  // after Kallinikos falls (scenes.rawhFalls): Hani; the letters; the season's last line
  D.rawhTail = (salim) => {
    const letters = new THREE.Group();
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.24), new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 1, side: THREE.DoubleSide })); m.position.set(i * 0.03, i * 0.004, i * 0.02); m.rotation.set(-Math.PI / 2 + 0.2, 0, i * 0.15); letters.add(m); }
    const hand = () => at(salim, 1.05, 0.45, 0.05)();
    return [
      { dur: 4.4, fadeIn: 1.0, caption: chosen(g, 'rabab36') === 'trust' ? 'Hani was in Kallinikos\' boat, under the nets. Rabab had him out before Salim reached the water.' : 'Hani was in Kallinikos\' boat, under the nets. Salim carried him to the shore himself.',
        enter: () => { night(); }, cam: { follow: true, p0: at(salim, 2.4, 3.6, 1.8), t0: at(salim, 1.2), fov: 36 } },
      { dur: 4.6, caption: 'In Kallinikos\' satchel: a bundle of letters. Every one in the marks Salim had seen on the arrow.', tight: true, beat: 1,
        enter: () => { sc.add(letters); letters.position.copy(hand()); letters.rotation.y = salim.facing; salim.st.action = null; },
        cam: { follow: true, p0: () => hand().add(V(Math.sin(salim.facing + 0.9) * 0.7, 0.45, Math.cos(salim.facing + 0.9) * 0.7)), t0: hand, fov: 30 }, dof: hand, aperture: 1.8,
        run: () => { letters.position.copy(hand()); } },
      { dur: lineDur('Only one man alive writes this hand.'), line: { who: 'Salim', text: 'Only one man alive writes this hand.', rig: g.player.rig, cue: 'breath', expr: 'grief' }, tight: true, beat: 2,
        cam: { follow: true, p0: at(salim, 1.65, 1.4, 0.45), t0: headOf(salim), p1: at(salim, 1.65, 1.15, 0.4), t1: headOf(salim), fov: 28 }, dof: headOf(salim), aperture: 1.4,
        run: () => { letters.position.copy(hand()); } },
      { dur: 1.4, enter: (d) => { d.fade(1, 1.0); }, run: () => { letters.position.copy(hand()); } },
      { dur: 0.2, enter: () => { sc.remove(letters); } },
    ];
  };

  // ================================================================ the beats
  const BEATS = {
    1: [
      { then: async () => { await play(boatIn()); await play(lightChest()); } },
      fight('Reed-men are raiding the landing. Drive them off.', landingRaid, async () => { bark('Salim', 'They came for the boats. Or for us.'); await sleep(1600); await play(arrowNight()); day(); }),
    ],
    2: [
      { then: async () => { await play(cipherTalk()); } },
      holdBeat('Take the reed stockade to the west. Find out who carries the letters.', 'chief', STORY.chief, async () => { await leaveHold(); await play(boatGone()); }),
    ],
    3: [
      goto('Ask Layla, the mat-weaver in the village, where Rabab goes', () => npcNamed('Layla')?.pos, 3.4, async () => { await play(layla()); }),
      fight('Kallinikos\' men watch the shore below the drowned village', shoreWatch, async () => { await sleep(900); }),
      goto('Find Rabab on the shore', () => rababAt(), 3.6, async () => { await play(rababScene()); }),
    ],
    4: [
      goto('Go back to the camp. Ishaq has some answering to do.', () => g.npc?.position, 4, async () => { await play(lastQuire()); }),
      fight('Fire-arrows on the camp! Drive the raiders out of the reeds.', fireRaid, async () => { await sleep(900); await play(quireGone()); }),
    ],
    5: [
      { then: async () => { await play(dawnBack()); await play(dawnTalk()); } },
      { enter: () => { if (chosen(g, 'rabab36') === 'trust') bark('Rabab', 'The back way is through the old fish weirs. Stay close to the reeds.'); },
        ...holdBeat('Go into the drowned village. Petronas holds Kallinikos\' boats.', 'second', STORY.second, async () => { await leaveHold(); await play(coughCliff()); }) },
    ],
    6: [
      { then: async () => { BOSS.intro = { ...BOSS.intro, text: D.bossLine() }; await play(brothers()); } },
      { enter: () => { if (!g.boss && !g.bossActive) g.bossSpawned = false; if (clock()?.label !== 'The reed village' && !E().dawn) startClock({ label: 'The reed village', total: 540, unit: (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`, out: () => { E().dawn = 'late'; BOSS.intro = { ...BOSS.intro, text: 'Dawn, guard. The reed village is already burning.' }; bark('Salim', 'Smoke over the weir. Faster.'); } }); },
        obj: 'Reach the old weir before dawn. Kallinikos has Hani.', at: () => g.boss && !g.boss.dead ? g.boss.pos : V(SITES.arch.x, 0, SITES.arch.z), done: () => false },
    ],
  };

  // ------------------------------------------------ the captains' words, the boss, the doors, the people
  if (LIEUT?.chief) {
    LIEUT.chief = { ...LIEUT.chief, text: 'The letters come by boat, from your own camp. A woman poles it.', card: null };
    LIEUT.second = { ...LIEUT.second, text: 'Your friend came to the weir himself, last night. An old man, coughing in the damp.', card: null };
  }
  D.bossLine = () => 'Your friend in the camp writes a fine hand, guard. Did he not tell you?';
  if (E().n === 6 && BOSS?.intro) BOSS.intro = { ...BOSS.intro, text: E().dawn === 'late' ? 'Dawn, guard. The reed village is already burning.' : D.bossLine() };
  const lock = (id) => {
    if (id === 'stockade' && E().n < 2) return 'Not yet. Find out who sent the arrow first.';
    if (id === 'sunken' && E().n < 5) return 'Not yet. You do not know the way in.';
    return null;
  };
  // Tatzates waits on the weir road for the last episode
  g.rivalWait = () => D.live() && E().n < 6;
  const gate = (n, b) => {
    for (const w of ['Umayma', 'Nadr', 'Qays', 'Leon']) gateNpc(w, false);
    if (g.npc) g.npc.visible = !(n === 4 && b >= 2) && !(n === 5 && b === 0 && !g.cinematic);
    if (rab3 && !g.cinematic) rab3.rig.visible = live3();
    if (rab3?.basket) rab3.basket.visible = rab3.rig.visible;
  };
  // an older save (played in the marshes before the episodes): the nearest episode
  const fromSave = () => {
    if ((g.act || 4) >= 5 || C.questDone(STORY.boss)) return { n: 7, b: 0 };
    if (C.questDone(STORY.second)) return { n: 6, b: 0, opened: true };
    if (C.questDone(STORY.chief)) return { n: 3, b: 0, opened: true };
    if (g.arrived?.marsh) return { n: 2, b: 0, opened: true };
    return { n: 1, b: 0 };
  };
  // headless tests: start at an episode with what came before marked done
  const jump = (n) => {
    p.ep36 = { n, b: 0, opened: true }; stopClock();
    const done = (id, hold) => { const q = g.quests.find((x) => x.id === id); if (q) q.done = true; const s = g.holds?.state(hold); if (s) s.done = true; };
    if (n >= 3) done(STORY.chief, 'stockade'); if (n >= 6) done(STORY.second, 'sunken');
    if (n >= 4 && !chosen(g, 'rabab36')) choose(g, 'rabab36', 'trust');
    (g.arrived ||= {}).marsh = true;
  };
  return { EPISODES: EPISODES2, RECAP: RECAP2, FLOOR: FLOOR2, ZONES: ZONES2, BEATS, coldOpen, lock, gate, fromSave, jump,
    where: 'The Nahrawan marshes, 813', end: 'End of Season Two', slate: 'Three days earlier', eyebrow: 'Season Two' };
}
