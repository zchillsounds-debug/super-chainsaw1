// Round 34: the Chronicle as a microdrama. The story is the game: the Sawad is told as six short episodes, each with a
// hook, one objective at a time, a turn, and a cliffhanger card. Nothing is skipped (cinema.js). Between scenes the
// map holds only the episode's own fights and people; the boards, bounties, dungeons and trials wait for the end of
// the chronicle ("After the Chronicle", act 7).
//   Ep 1 Dusk on the Dune   the caravan; the ambush is fought; an arrow from the ridge; Salim wakes by Ishaq
//   Ep 2 The Cedar Chest    what the chest held; Khawla saw the riders; the watcher; a voice at the broken dam
//   Ep 3 The Broken Dam     Photeinos' hold and his choice; smoke rises over the kiln yard
//   Ep 4 Ash in the Kilns   a clock: every second costs leaves; Olbianos names Ishaq
//   Ep 5 Thirst             Ishaq's confession; the canal fouled; the family's water; the deserter; Bardanes' herald
//   Ep 6 The Arch           the names of the dead; a race to the arch before dawn; Bardanes; the chest is light
// State: p.ep34 = { n, b, leaves, dawn } (saved). Every line has Arabic in story34_ar.js.
import * as THREE from 'three';
import { H32 } from './scenes.js';
import { chat, other, extra, spotAhead, MIDACT } from './scenes32.js';
import { humanoid, camel } from './characters.js';
import { LOOK, byzify } from './byz.js';
import { REGION, IS_SAWAD, STORY } from './region.js';
import { SITES, heightAt } from './terrain.js';
import { LIEUT, BOSS } from './story15.js';
import { S25, choose, chosen } from './story25.js';
import { saveGame } from './save.js';
import { t, LANG } from './i18n.js';

const { V, ground, yawTo, lineDur, actor, at, headOf, walk, act, tickActor, playerActor } = H32;
const P = new URLSearchParams(location.search);
// on for every real chronicle; the old headless tests (?play) run without it unless they ask (?drama)
export const DRAMA_ON = !P.has('nodrama') && (!P.has('play') || P.has('drama'));

// ---------------------------------------------------------------- the episodes' words
export const EPISODES = {
  1: { title: 'Dusk on the Dune', ar: 'غسقٌ على الكثيب', next: 'Two more days to Baghdad. Jabir will not see them.' },
  2: { title: 'The Cedar Chest', ar: 'صندوق الأرز', next: 'What is worth a brother?' },
  3: { title: 'The Broken Dam', ar: 'السدّ المكسور', next: 'Someone in the dark has been waiting for Salim.' },
  4: { title: 'Ash in the Kilns', ar: 'رمادٌ في الأتون', next: 'Every heartbeat, another page burns.' },
  5: { title: 'Thirst', ar: 'العطش', next: 'Ishaq has answers. Salim may not want them.' },
  6: { title: 'The Arch', ar: 'الطاق', next: 'Dawn is coming. So is Salim.' },
  7: { title: 'Season Two · The Marshes', ar: 'الموسم الثاني · الأهوار', next: 'Kallinikos has the last Pages. And he has the fire.' },
};
const NUM = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
// "previously": what the player must carry into each episode (choices change the lines)
const RECAP = {
  2: () => ['Jabir fell on the dune, to an arrow no one saw loosed.', 'The raiders took the cedar chest he died for.', 'And Ishaq said: it was never the instruments they wanted.'],
  3: () => ['The chest held the Pages: the only copy of a dead teacher\'s words.', 'A watcher on the rise knew Salim by sight.', 'At the broken dam, a voice in the dark was waiting for him.'],
  4: (g) => ['Photeinos fell in the broken dam, and named the envoy\'s men.', chosen(g, 'photeinos') === 'free' ? 'Salim let him go.' : 'Salim bound him for the qadi.', 'Then the smoke rose over the kiln yard. Olbianos is burning the Pages.'],
  5: (g) => ['Salim fought through the kiln galleries to the fire.', ...leavesLines(g), 'Olbianos died with a name in his mouth: Ishaq.'],
  6: () => ['Ishaq confessed: he chose Jabir\'s road for the chest.', 'Bardanes fouled the canal. The village is dying of thirst.', 'His herald gave the elders until dawn to give Salim up.'],
};
function leavesLines(g) {
  const n = g.player.ep34?.leaves ?? 60;
  return [t('He pulled {n} leaves out of the kiln mouth. The rest were ash.').replace('{n}', n)];
}
// Salim grows stronger at set points of the story (story-paced: no grinding needed)
const FLOOR = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };
// which of the Sawad's open-ground troops are out in each episode (the rest wait off the map)
const ZONES = { 1: [], 2: ['serai'], 3: ['serai'], 4: ['kiln'], 5: [], 6: ['south'] };
const zoneOf = (x, z) => {
  const S = SITES.serai, K = SITES.kiln;
  if (Math.hypot(x - S.x, z - S.z) < 34) return 'serai';
  if (Math.hypot(x - K.x, z - K.z) < 30) return 'kiln';
  if (z < -24 && x > -30) return 'south';
  return 'open';
};

// ---------------------------------------------------------------- overlays: title card, recap, cliffhanger, clock
let root = null;
function overlay() {
  if (root) return root;
  root = document.createElement('div'); root.id = 'ep34'; root.className = 'hidden';
  root.innerHTML = `<div class="still"></div><div class="veil"></div><div class="box"></div><div class="tap"><span></span><i>▸</i></div>`;
  document.body.appendChild(root);
  return root;
}
const $o = (s) => overlay().querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// resolves on a tap or a key once `min` ms have passed (or by itself after `max`); nothing is hurried before `min`
function waitTap(min, max, label = 'Tap to continue') {
  return new Promise((res) => {
    const t0 = performance.now(), tap = $o('.tap');
    let shown = false, done = false;
    const finish = () => { if (done) return; done = true; tap.classList.remove('show'); removeEventListener('pointerdown', on, true); removeEventListener('keydown', on, true); clearInterval(iv); res(); };
    const on = (e) => { if (performance.now() - t0 < min) return; e.preventDefault?.(); e.stopPropagation?.(); finish(); };
    const iv = setInterval(() => { const dt = performance.now() - t0; if (!shown && dt >= min) { shown = true; tap.querySelector('span').textContent = t(label); tap.classList.add('show'); } if (dt >= max) finish(); }, 100);
    addEventListener('pointerdown', on, true); addEventListener('keydown', on, true);
  });
}
function stillKey(n) { return 'sob.ep34.still.' + n; }
function getStill(n) { try { return localStorage.getItem(stillKey(n)); } catch { return null; } }

export function setupDrama34(g) {
  const p = g.player, audio = g.audio;
  const E = () => (p.ep34 ||= { n: 1, b: 0 });
  // the side content waits until the chronicle is finished (act 7)
  const locked = () => DRAMA_ON && (g.act || 1) < 7;
  // the Sawad's six episodes are played as episodes (later seasons follow in later rounds)
  const live = () => DRAMA_ON && IS_SAWAD && g.started && E().n <= 6;
  g.storyLoot = false;
  const D = g.drama34 = { on: DRAMA_ON, live, locked, E };

  // ------------------------------------------------ the heartbeat, for the turns of the story and a running clock
  audio.heart = (n = 2) => {
    if (!audio.ctx) return;
    for (let i = 0; i < n; i++) setTimeout(() => { audio.tone?.(54, 0.16, 'sine', 0.5, 0.7); setTimeout(() => audio.tone?.(47, 0.22, 'sine', 0.36, 0.7), 170); }, i * 860);
  };

  // ------------------------------------------------ gating the side content (main.js tags what each side system added)
  for (const G of g.side34 || []) {
    for (const it of G.its) {
      const d = Object.getOwnPropertyDescriptor(it, 'hidden'), orig = d?.get ? d.get.bind(it) : () => !!d?.value;
      Object.defineProperty(it, 'hidden', { get: () => locked() || orig(), configurable: true });
    }
  }
  // dungeon mouths and the like (any door into an area that is not a story hold)
  const STORY_HOLDS = new Set(['dam', 'kilns', 'stockade', 'sunken', 'quarter', 'vaults', 'shipyard', 'hulks', 'quarry', 'fort', 'gorge', 'tatzates']);
  for (const it of g.interactables) if (it.area && !STORY_HOLDS.has(it.area) && !g.holds?.state?.(it.area)) {
    const d = Object.getOwnPropertyDescriptor(it, 'hidden'), orig = d?.get ? d.get.bind(it) : () => !!d?.value;
    Object.defineProperty(it, 'hidden', { get: () => locked() || orig(), configurable: true });
  }
  const sidePois = new Set((g.side34 || []).flatMap((G) => G.pois));
  const sideNpcs = (g.side34 || []).flatMap((G) => G.npcs), sideObjs = (g.side34 || []).flatMap((G) => G.objs);
  let gateWas = null;
  const applyGate = () => {
    const L = locked(); if (L === gateWas) return; gateWas = L;
    for (const n of sideNpcs) n.rig.visible = !L;
    for (const o of sideObjs) if (!o.isLight) o.visible = !L;
    if (g.pois) { if (L) { D.heldPois = g.pois.filter((q) => sidePois.has(q)); g.pois = g.pois.filter((q) => !sidePois.has(q)); } else if (D.heldPois) { g.pois.push(...D.heldPois); D.heldPois = null; } }
  };
  const prevMarks = g.questMarks;
  if (prevMarks) g.questMarks = () => (locked() ? [] : prevMarks());
  // story-paced loot (game.js killEnemy): no showers from the rank and file while the chronicle runs
  Object.defineProperty(g, 'storyLoot', { get: () => locked(), configurable: true });

  // ------------------------------------------------ the Sawad's troops, held off the map outside their episode
  const zoned = [];
  if (IS_SAWAD) for (const e of g.enemies) if (!e.interior && !e.boss) zoned.push({ e, zone: zoneOf(e.pos.x, e.pos.z) });
  const applyZones = () => {
    if (!IS_SAWAD) return;
    const ok = new Set(live() ? ZONES[E().n] || [] : ['serai', 'kiln', 'south', 'open']);
    for (const Z of zoned) {
      const want = ok.has(Z.zone), there = g.enemies.includes(Z.e);
      if (want && !there && !Z.e.dead) { g.enemies.push(Z.e); g.scene.add(Z.e.rig); Z.e.rig.visible = true; }
      if (!want && there && !Z.e.dead) { g.enemies.splice(g.enemies.indexOf(Z.e), 1); g.scene.remove(Z.e.rig); }
    }
  };

  // ------------------------------------------------ the holds and the arch open episode by episode
  if (g.holds) {
    const prevLocked = g.holds.locked.bind(g.holds);
    g.holds.locked = (id) => {
      if (live()) {
        if (id === 'dam' && E().n < 3) return 'Not yet. Find out who took the chest first.';
        if (id === 'kilns' && E().n < 4) return 'The galleries are barred. Find Photeinos first.';
      }
      return prevLocked(id);
    };
  }
  // the lieutenants' last words carry the episodes' turns; the act cards give way to the episode cards
  if (IS_SAWAD && DRAMA_ON && LIEUT?.chief) {
    LIEUT.chief = { ...LIEUT.chief, text: 'Bardanes paid me in the envoy\'s gold. Olbianos has the Pages at the kilns. He means to burn them.', card: null };
    LIEUT.second = { ...LIEUT.second, text: 'Ishaq always hid things where no one would look. A guard\'s mules. I knew him. I told them where to look.', card: null };
    BOSS.intro = { ...BOSS.intro, text: 'So the village did not give you up. Then I will take you myself.' };
  }

  // ------------------------------------------------ stills: a frame of the cliffhanger, for the next "previously"
  const snap = (n) => new Promise((res) => {
    g.afterRender = (cv) => {
      try {
        const c = document.createElement('canvas'), w = 420; c.width = w; c.height = Math.round(w * cv.height / cv.width);
        c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height);
        const url = c.toDataURL('image/jpeg', 0.62); try { localStorage.setItem(stillKey(n), url); } catch { /* full */ } res(url);
      } catch { res(null); }
    };
    setTimeout(() => res(null), 1500);
  });

  // ------------------------------------------------ the cards
  const show = (cls) => { const o = overlay(); o.className = cls; void o.offsetWidth; o.classList.add('on'); };
  const hide = async () => { overlay().classList.remove('on'); await sleep(450); overlay().className = 'hidden'; $o('.still').style.backgroundImage = ''; };
  const rtl = LANG === 'ar' ? ' dir="rtl"' : '';
  D.titleCard = async (n) => {
    const Ep = EPISODES[n];
    $o('.box').innerHTML = `<div class="eyebrow">${t('Episode')} ${t(NUM[n] || String(n))}</div>${LANG === 'ar' ? '' : `<div class="arline">${Ep.ar}</div>`}<div class="rule"><i></i><b></b><i></i></div><div class="title"${rtl}>${t(Ep.title)}</div><div class="where">${t('The Sawad, outside Baghdad, 813')}</div>`;
    show('title'); audio.stinger?.('title');
    await sleep(900); await waitTap(2600, 4800, 'Tap to begin'); await hide();
  };
  D.recap = async (n) => {
    const lines = (RECAP[n]?.(g) || []).map((s) => t(s));
    if (!lines.length) return;
    const st = getStill(n - 1); $o('.still').style.backgroundImage = st ? `url(${st})` : '';
    $o('.box').innerHTML = `<div class="eyebrow">${t('Previously')}</div><div class="lines"${rtl}></div>`;
    show('recap' + (st ? ' has' : '')); audio.heart(1);
    const box = $o('.lines');
    for (const s of lines) {
      const el = document.createElement('div'); el.className = 'rl'; box.appendChild(el);
      for (let i = 1; i <= s.length; i += 2) { el.textContent = s.slice(0, i); await sleep(22); }
      el.textContent = s;
      await waitTap(900, 3200 + s.length * 22);
    }
    await sleep(300); await hide();
  };
  // the cliffhanger: the frame freezes and drains, a hit, "to be continued", and what comes next
  D.cliff = async (n, still = true) => {
    document.body.classList.add('ep34freeze'); audio.stinger?.('ambush'); audio.heart(2);
    if (still) await snap(n);
    const N = EPISODES[n + 1];
    $o('.box').innerHTML = `<div class="tbc"${rtl}>${t('To be continued')}</div><div class="nextep"${rtl}>${n >= 6 ? t('End of Season One') : t('Next') + ' · ' + t('Episode') + ' ' + t(NUM[n + 1] || '')}</div><div class="nexttitle"${rtl}>${t(N?.title || '')}</div><div class="teaser"${rtl}>${t(N?.next || '')}</div>`;
    await sleep(500); show(n >= 6 ? 'cliff final' : 'cliff');
    await waitTap(2600, 60000);
    await hide(); document.body.classList.remove('ep34freeze');
  };
  // a shot that holds the frame while the cliffhanger card plays over it, then lets the scene end
  const cliffShot = (n) => { const s = { dur: 1e6, slow: 0.03, tight: true, enter: (d) => { D.cliff(n).then(() => { if (d.shot === s) d.next(); }); } }; return s; };
  const withCliff = (def, n) => { def.shots.push(cliffShot(n)); return def; };

  // ------------------------------------------------ the clock (Ep 4: the leaves burning; Ep 6: dawn)
  const clockEl = document.createElement('div'); clockEl.id = 'clock34'; clockEl.className = 'hidden';
  clockEl.innerHTML = '<div class="cl"></div><div class="bar"><i></i></div><div class="cn"></div>';
  document.getElementById('ui').appendChild(clockEl);
  let clock = null; // { label, total, left, unit(left) -> text, out() }
  const startClock = (C) => { clock = { ...C, left: C.left ?? C.total }; clockEl.classList.remove('hidden'); heartT = 0; };
  const stopClock = () => { clock = null; clockEl.classList.add('hidden'); };
  let heartT = 0;
  const tickClock = (dt) => {
    if (!clock) return;
    const run = g.started && !g.cinematic && !g.paused && !p.dead;
    clockEl.classList.toggle('hidden', !!g.cinematic);
    if (run) clock.left = Math.max(0, clock.left - dt);
    const k = clock.left / clock.total;
    clockEl.querySelector('.cl').textContent = t(clock.label);
    clockEl.querySelector('.bar i').style.width = (k * 100).toFixed(1) + '%';
    clockEl.querySelector('.cn').textContent = clock.unit(clock.left);
    clockEl.classList.toggle('low', k < 0.3);
    if (run && k < 0.3 && (heartT -= dt) <= 0) { heartT = 1.7; audio.heart(1); }
    if (clock.left <= 0 && !clock.spent) { clock.spent = true; clock.out?.(); }
  };
  const LEAVES = 120, leavesLeft = () => Math.max(8, Math.round(LEAVES * (clock ? clock.left / clock.total : 0.5)));

  // ------------------------------------------------ helpers
  const said = () => S25(g).said;
  const ch = () => S25(g).ch;
  const play = (def) => g.director.play(def);
  const ishaq = () => other({ rig: g.npc, st: g.npcSt });
  const npcNamed = (name) => g.npcs.find((n) => n.name === name);
  const near = (pos, r) => pos && Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z) < r;
  const calm = (r = 22) => !g.enemies.some((e) => !e.dead && !e.hidden && e.alerted && e.pos.distanceTo(p.pos) < r);
  const questDone = (id) => !!g.quests.find((q) => q.id === id)?.done;
  const bark = (who, text, ms = 4200) => g.bark?.(who, text, ms, true);
  const floorLevel = (n) => { while (p.level < (FLOOR[n] || 1)) g.levelUp(); };
  // the people folded into the story stay out of sight until their episode
  const gateNpc = (name, show) => {
    const n = npcNamed(name); if (!n) return;
    if (!n.gate34) { n.gate34 = true; const it = g.interactables.find((i) => i.npc === n); if (it) { const d = Object.getOwnPropertyDescriptor(it, 'hidden'), orig = d?.get ? d.get.bind(it) : () => !!d?.value; Object.defineProperty(it, 'hidden', { get: () => (live() && !n.show34) || orig(), configurable: true }); } }
    n.show34 = show; if (live()) n.rig.visible = show;
  };
  const kilnSmoke = { on: false };

  // ================================================================ the scenes
  // ---------------- Ep 1: the caravan on the road at dusk (part one, to the attack)
  const rt = {};
  const road = (z) => 13.5 + (z - 100) * 0.02;
  function caravanA() {
    const sc = g.scene, actors = [];
    const salim = playerActor(g);
    const add = (a) => { actors.push(a); if (a.rig !== p.rig) sc.add(a.rig); return a; };
    const camelA = add(Object.assign(actor(camel(0xb88a58), ground(road(124) + 1.3, 124), Math.PI), { camel: true }));
    const camelB = add(Object.assign(actor(camel(0xa07850), ground(road(130) + 1.3, 130), Math.PI), { camel: true }));
    const jabir = add(actor(humanoid({ robe: '#3a3428', robe2: '#8a6a3a', turban: 0xd8cfb8, weapon: 'spear', beard: 0x2a1a10, skin: 0x9a6a44 }), ground(road(127) - 1.2, 127.5), Math.PI));
    const guard2 = add(actor(humanoid({ robe: '#4a3a2a', robe2: '#2a3a5a', turban: 0xc8b890, weapon: 'spear', skin: 0x8a5a3a }), ground(road(134) - 0.6, 134), Math.PI));
    const archer = add(actor(humanoid(byzify({ ...LOOK.toxotes(), robe: '#1e2430', robe2: '#8a2a1a', beard: 0x1a120c, cloak: 0x1a1a22 })), ground(27, 111), -Math.PI / 2));
    const b1 = add(actor(humanoid(byzify({ ...LOOK.skoutatos(), shieldTint: 0 })), ground(28.5, 117), -Math.PI / 2));
    const b2 = add(actor(humanoid(byzify({ ...LOOK.kataphraktos(), weapon: 'sword', offhand: 'shield', shieldTint: 0 })), ground(26, 121), -Math.PI / 2));
    archer.rig.visible = false;
    for (const b of [b1, b2]) b.st.crouch = 1;
    actors.push(salim);
    salim.pos.copy(ground(road(125.5) - 0.2, 125.5)); salim.facing = Math.PI; salim.st.action = null; salim.st.crouch = 0;
    const caravan = [camelA, camelB, jabir, guard2, salim];
    const march = (dt, speed = 1.35) => { for (const a of caravan) { if (a.halt) { a.moving = false; continue; } a.moving = true; walk(a, V(road(a.pos.z - 2) + (a.camel ? 1.3 : a === salim ? -0.2 : a === jabir ? -1.2 : -0.6), 0, a.pos.z - 2), speed, dt); } };
    Object.assign(rt, { camelA, camelB, jabir, guard2, archer, keep: [camelA, camelB, jabir, guard2, archer] });
    const L = (who, text, a, extra = {}) => ({ dur: lineDur(text), line: { who, text, rig: a.rig, cue: who === 'Salim' ? 'hm' : 'breath', ...(extra.line || {}) },
      cam: { follow: true, p0: at(a, 1.75, 2.6, 1.6), t0: at(a, 1.55, -1.2, -0.4), p1: at(a, 1.7, 2.2, 1.2), t1: at(a, 1.55, -1.2, -0.4), fov: 33 }, dof: headOf(a), aperture: 1.4,
      run: (d, k, dt) => march(dt), ...extra.shot });
    const shots = [
      { dur: 6.0, fadeIn: 1.4, caption: 'The Sawad, outside Baghdad, in the year 813. The war between the caliph\'s sons is almost over.', cam: { p0: () => ground(36, 140, 14), t0: () => ground(14, 124, 1.2), p1: () => ground(26, 132, 6), t1: () => ground(13.5, 121, 1.4) }, run: (d, k, dt) => march(dt) },
      L('Jabir', 'Two more days to Baghdad, Salim. Then home.', jabir, { line: { expr: 'warm' } }),
      L('Salim', 'Too quiet, brother. I do not like it.', salim, { line: { expr: 'wary' }, shot: { run: (d, k, dt) => { march(dt); salim.st.headYaw = -Math.sin(k * Math.PI) * 0.6; } } }),
      L('Jabir', 'Ishaq checks that cedar chest every hour. Star-glasses do not need that much love.', jabir, { line: { expr: 'warm' } }),
      L('Salim', 'Then do not ask him what is in it.', salim, { line: { expr: 'neutral' } }),
      { dur: 3.8, caption: 'Riders in Byzantine mail were waiting on the dunes.', tight: true, beat: 2, stinger: 'ambush',
        cam: { p0: () => ground(17, 109, 1.8), t0: () => ground(27, 116, 1.6), p1: () => ground(17.6, 110.2, 1.9), t1: () => ground(27, 116, 1.6), fov: 32 },
        run: (d, k, dt) => { march(dt, 0.8); for (const b of [b1, b2]) b.st.crouch = Math.max(0, 1 - k * 1.6); salim.st.headYaw = 0; } },
      L('Jabir', 'Riders! Guard the camels, Salim!', jabir, { line: { expr: 'anger', cue: 'shout' }, shot: { tight: true, enter: () => { for (const a of caravan) a.halt = true; jabir.facing = yawTo(jabir.pos, b1.pos); act(jabir, 'command', 1.2); }, run: () => {} } }),
    ];
    return { dusk: 0.7, actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); },
      end: () => { for (const b of [b1, b2]) sc.remove(b.rig); for (const a of caravan) { a.halt = true; a.moving = false; } salim.st.headYaw = 0; } };
  }
  // the fight: real raiders down off the ridge; Jabir and the other guard hold beside the camels
  function raiders() {
    const foes = [...g.spawnPack(['bandit', 'spearman'], 26, 116, 3, 1, { spread: 3 }), ...g.spawnPack('bandit', 24, 125, 1, 1, { spread: 1 })];
    for (const e of foes) { e.alerted = true; e.ep34 = true; }
    return foes;
  }
  // ---------------- Ep 1, part two: the arrow from the ridge, Jabir's last words, and Salim wakes by Ishaq
  function caravanB() {
    const sc = g.scene, { jabir, guard2, archer, camelA, camelB } = rt, salim = playerActor(g);
    const actors = [salim, ...rt.keep];
    const lamp = g.bossLight;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 4).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2a2018 }));
    shaft.visible = false; sc.add(shaft);
    const from = () => at(archer, 1.55, 0.4)(), to = () => at(jabir, 1.25)();
    const shots = [
      { dur: lineDur('Ha! Is that all the Rum could send?'), line: { who: 'Jabir', text: 'Ha! Is that all the Rum could send?', rig: jabir.rig, cue: 'hm', expr: 'warm' },
        cam: { follow: true, p0: at(jabir, 1.75, 2.6, 1.4), t0: headOf(jabir), fov: 32 }, dof: headOf(jabir),
        enter: () => { salim.pos.copy(jabir.pos).add(V(1.6, 0, -1.2)); salim.pos.y = heightAt(salim.pos.x, salim.pos.z); jabir.st.action = null; jabir.facing = yawTo(jabir.pos, salim.pos); salim.facing = yawTo(salim.pos, jabir.pos); } },
      { dur: 2.6, slow: 0.45, tight: true, beat: 2, cam: { p0: () => at(jabir, 1.6, -2.0, 1.0)(), t0: () => at(archer, 1.6)(), p1: () => at(jabir, 1.6, -1.6, 0.8)(), t1: () => at(archer, 1.6)(), fov: 22 },
        enter: () => { archer.rig.visible = true; archer.pos.copy(ground(27, 111)); archer.facing = yawTo(archer.pos, jabir.pos); act(archer, 'attack', 2.2); } },
      { dur: 1.6, slow: 0.35, tight: true, cam: { follow: true, p0: at(jabir, 1.5, 3.2, 1.6), t0: at(jabir, 1.3), fov: 30 },
        enter: () => { shaft.visible = true; shaft.position.copy(from()); },
        run: (d, k) => { const a = from(), b = to(), q = Math.min(1, k * 1.3); shaft.position.lerpVectors(a, b, q); shaft.lookAt(b); if (q >= 1 && !jabir.st.dead) { jabir.st.dead = true; jabir.st.fallDir = -1; jabir.st.deadT = 0; d.audio.vocal?.('hurt', 0.9); } } },
      { dur: lineDur('Jabir!'), line: { who: 'Salim', text: 'Jabir!', rig: p.rig, cue: 'shout', expr: 'fear' }, tight: true,
        cam: { follow: true, p0: at(salim, 1.7, 1.8, 0.8), t0: headOf(salim), fov: 30 }, dof: headOf(salim), enter: () => { shaft.visible = false; salim.facing = yawTo(salim.pos, jabir.pos); } },
      { dur: 3.6, caption: 'The raiders came back over the dune while Salim held his brother.', enter: (d) => { d.fade(1, 0.9); archer.rig.visible = false; } },
      { dur: 4.8, fadeIn: 1.4, line: { who: 'Jabir', text: 'Salim... the chest. Do not let them burn it.', rig: jabir.rig, cue: 'breath', expr: 'pain', react: 'grief' }, beat: 1,
        cam: { follow: true, p0: at(salim, 2.5, -1.9, -2.3), t0: at(salim, 0.35, 1.3), p1: at(salim, 2.35, -1.75, -2.15), t1: at(salim, 0.38, 1.28), fov: 40 }, dof: headOf(salim), aperture: 1.4,
        enter: () => {
          jabir.st.dead = true; jabir.st.fallDir = 1; jabir.st.deadT = Math.max(jabir.st.deadT || 0, 4);
          { let best = 0, bd = 1e9; const h0 = heightAt(jabir.pos.x, jabir.pos.z); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, dh = Math.abs(heightAt(jabir.pos.x + Math.sin(a) * 1.6, jabir.pos.z + Math.cos(a) * 1.6) - h0) + Math.abs(heightAt(jabir.pos.x + Math.sin(a) * 0.8, jabir.pos.z + Math.cos(a) * 0.8) - h0); if (dh < bd) { bd = dh; best = a; } } jabir.facing = best + Math.PI; jabir.pos.y = h0; }
          salim.pos.copy(jabir.pos).add(V(0.9, 0, -0.2)); salim.pos.y = heightAt(salim.pos.x, salim.pos.z); salim.facing = yawTo(salim.pos, jabir.pos); salim.st.crouch = 0.85;
          guard2.pos.copy(salim.pos).add(V(1.4, 0, -1.6)); guard2.pos.y = heightAt(guard2.pos.x, guard2.pos.z); guard2.facing = Math.PI / 2;
          for (const c of [camelA, camelB]) { c.pos.x += 3; c.pos.y = heightAt(c.pos.x, c.pos.z); }
          if (lamp) { lamp.color.set(0xff9a50); lamp.distance = 8; lamp.position.copy(jabir.pos).add(V(0.4, 1.1, 0.9)); lamp.intensity = 7; }
        }, run: () => { salim.st.crouch = 0.85; } },
      { dur: lineDur('I will bring it back, brother. I promise.'), line: { who: 'Salim', text: 'I will bring it back, brother. I promise.', rig: p.rig, cue: 'breath', expr: 'grief' },
        cam: { follow: true, p0: at(salim, 1.5, 1.9, 1.0), t0: headOf(salim), p1: at(salim, 1.45, 1.7, 0.9), t1: headOf(salim), fov: 32 }, dof: headOf(salim), aperture: 1.3, run: () => { salim.st.crouch = 0.85; } },
      { dur: 4.4, caption: 'Jabir did not live to see Baghdad. The raiders had taken the cedar chest.', enter: (d) => d.fade(1, 1.2) },
      // he wakes in the village, Ishaq beside him
      { dur: lineDur('You are awake. Good. Listen to me, guard.'), fadeIn: 1.6, line: { who: 'Ishaq', text: 'You are awake. Good. Listen to me, guard.', rig: g.npc, cue: 'breath', expr: 'sad' },
        cam: { follow: true, p0: () => { const a = salim.pos, b = g.npc.position, f = yawTo(a, b); return V(a.x - Math.sin(f) * 0.9 + Math.cos(f) * 0.35, a.y + 1.75, a.z - Math.cos(f) * 0.9 - Math.sin(f) * 0.35); }, t0: () => g.npc.userData?.parts?.head ? g.npc.userData.parts.head.getWorldPosition(new THREE.Vector3()) : g.npc.position.clone().add(V(0, 1.6, 0)), fov: 30 },
        enter: () => {
          for (const a of rt.keep) sc.remove(a.rig); rt.keep = [];
          if (lamp) { lamp.intensity = 0; lamp.color.set(0xff8a40); lamp.distance = 16; }
          p.pos.set(1, 0, 88); p.pos.y = heightAt(1, 88); salim.st.crouch = 0; salim.st.action = null; salim.facing = yawTo(p.pos, g.npc.position); g.npc.rotation.y = yawTo(g.npc.position, p.pos); g.npcSt.talk = true;
        } },
      { dur: lineDur('It was never the instruments they wanted.'), line: { who: 'Ishaq', text: 'It was never the instruments they wanted.', rig: g.npc, cue: 'breath', expr: 'sad' }, tight: true, beat: 2,
        cam: { follow: true, p0: () => { const h = g.npc.userData.parts.head.getWorldPosition(new THREE.Vector3()), f = g.npc.rotation.y; return V(h.x + Math.sin(f) * 1.3 + Math.cos(f) * 0.3, h.y - 0.1, h.z + Math.cos(f) * 1.3 - Math.sin(f) * 0.3); }, t0: () => g.npc.userData.parts.head.getWorldPosition(new THREE.Vector3()), p1: () => { const h = g.npc.userData.parts.head.getWorldPosition(new THREE.Vector3()), f = g.npc.rotation.y; return V(h.x + Math.sin(f) * 1.0 + Math.cos(f) * 0.2, h.y - 0.08, h.z + Math.cos(f) * 1.0 - Math.sin(f) * 0.2); }, fov: 28 } },
    ];
    return withCliff({ dusk: 0.7, actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); }, end: () => { sc.remove(shaft); g.npcSt.talk = false; for (const a of rt.keep || []) sc.remove(a.rig); rt.keep = []; } }, 1);
  }

  // ---------------- Ep 2
  const briefing = () => chat(g, ishaq(), [
    { who: 'Ishaq', text: 'I am Ishaq. I hired your caravan. I am sorry about Jabir.' },
    { who: 'Salim', text: 'He died for a chest of star-glasses?', expr: 'grief' },
    { who: 'Ishaq', text: 'Not star-glasses. Pages. The writings of my old teacher. There is no other copy in the world.' },
    { who: 'Salim', text: 'My brother is dead for a book.', expr: 'anger' },
    { who: 'Ishaq', text: 'For the only copy of one. An envoy from Constantinople came under the smoke of the war, and his soldiers took it.' },
    { who: 'Salim', text: 'Who knew it was in our caravan?', expr: 'stern' },
    { who: 'Ishaq', text: '...Few. Fewer than should have.', expr: 'sad', tight: true, beat: 2 },
    { who: 'Ishaq', text: 'Khawla, at the village well, saw riders pass at first light. Start with her.' },
  ]);
  const khawla = () => { const n = npcNamed('Khawla'); return chat(g, other(n), [
    { who: 'Khawla', text: 'Riders, at first light. A mule with a cedar chest, and a man walking beside it like it was his child.' },
    { who: 'Salim', text: 'Where did they go?' },
    { who: 'Khawla', text: 'East, to the old caravanserai, where the dam is broken.' },
    { who: 'Khawla', text: 'And one stayed. He sat his horse on the rise and watched the village all morning. He watched your tent, guard.', tight: true, beat: 2, expr: 'fear' },
    { who: 'Salim', text: 'Then he is still out there.', expr: 'resolve' },
  ]); };
  const watcher = () => {
    const foes = [...g.spawnPack('rider', 40, 26, 1, Math.max(2, p.level), { elite: true, spread: 0, name: 'The Watcher' }), ...g.spawnPack(['bandit', 'spearman'], 42, 22, 2, Math.max(1, p.level - 1), { spread: 3 })];
    for (const e of foes) e.ep34 = true; return foes;
  };
  const damDoor = () => {
    const door = g.storyDoor?.chief || V(SITES.serai.x, 0, SITES.serai.z), salim = playerActor(g);
    const dark = () => V(door.x, heightAt(door.x, door.z) + 1.5, door.z);
    const shots = [
      { dur: 3.0, tight: true, beat: 2, cam: { follow: true, p0: at(salim, 2.1, -3.2, 1.1), t0: dark, p1: at(salim, 1.9, -2.2, 0.8), t1: dark, fov: 34 }, enter: () => { salim.facing = yawTo(salim.pos, door); } },
      { dur: lineDur('You are the brother. Jabir\'s brother.'), line: { who: 'A voice in the dark', text: 'You are the brother. Jabir\'s brother.', expr: 'neutral' }, tight: true, cam: { p0: () => at(salim, 1.7, 1.6, 0.6)(), t0: () => headOf(salim)(), fov: 30 }, dof: headOf(salim) },
      { dur: lineDur('Come in, then. I have been waiting to meet the man who keeps coming.'), line: { who: 'A voice in the dark', text: 'Come in, then. I have been waiting to meet the man who keeps coming.' }, tight: true, beat: 1,
        cam: { p0: () => { const s = salim.pos; return V(s.x * 0.5 + door.x * 0.5, heightAt(door.x, door.z) + 1.3, s.z * 0.5 + door.z * 0.5); }, t0: dark, fov: 26 } },
    ];
    return withCliff({ actors: [salim], shots, tick: (d, dt) => tickActor(g, salim, dt) }, 2);
  };
  // ---------------- Ep 3: smoke over the kiln yard, seen from the broken dam
  const smokeScene = () => {
    const salim = playerActor(g), K = V(SITES.kiln.x, heightAt(SITES.kiln.x, SITES.kiln.z) + 8, SITES.kiln.z);
    kilnSmoke.on = true;
    const shots = [
      { dur: 4.2, caption: 'Black smoke over the kiln yard. Not brick smoke. Paper.', tight: true, beat: 2, cam: { follow: true, p0: at(salim, 2.4, -3.0, 1.0), t0: () => K, p1: at(salim, 2.2, -2.4, 0.8), t1: () => K, fov: 30 }, enter: () => { salim.facing = yawTo(salim.pos, K); } },
      { dur: lineDur('They are burning them.'), line: { who: 'Salim', text: 'They are burning them.', rig: p.rig, cue: 'hm', expr: 'anger' }, tight: true, cam: { follow: true, p0: at(salim, 1.7, 1.7, 0.7), t0: headOf(salim), fov: 30 }, dof: headOf(salim) },
    ];
    return withCliff({ actors: [salim], shots, tick: (d, dt) => tickActor(g, salim, dt) }, 3);
  };
  // ---------------- Ep 4: out of the kilns, a handful of leaves, and a name
  const ishaqKnew = () => {
    const salim = playerActor(g), n = p.ep34.leaves ?? 60;
    const shots = [
      { dur: 4.4, caption: t('Salim came out of the galleries with {n} scorched leaves held against his chest.').replace('{n}', n), cam: { follow: true, p0: at(salim, 2.2, 3.4, 1.8), t0: at(salim, 1.2), fov: 34 } },
      { dur: lineDur('A guard\'s mules. Ishaq knew. He put the chest on my brother\'s mules.'), line: { who: 'Salim', text: 'A guard\'s mules. Ishaq knew. He put the chest on my brother\'s mules.', rig: p.rig, cue: 'hm', expr: 'anger' }, tight: true, beat: 2,
        cam: { follow: true, p0: at(salim, 1.65, 1.5, 0.5), t0: headOf(salim), p1: at(salim, 1.65, 1.2, 0.4), t1: headOf(salim), fov: 28 }, dof: headOf(salim) },
    ];
    return withCliff({ actors: [salim], shots, tick: (d, dt) => tickActor(g, salim, dt) }, 4);
  };
  // ---------------- Ep 5
  const confession = () => {
    const sud = npcNamed('Su\'da'), cast = sud ? { 'Su\'da': other(sud) } : {};
    return chat(g, ishaq(), [
      { who: 'Salim', text: 'Olbianos named you before he died. The chest rode on Jabir\'s mules because you put it there.', expr: 'anger' },
      { who: 'Ishaq', text: 'Yes.', expr: 'sad', tight: true, beat: 2 },
      { who: 'Ishaq', text: 'No one searches a caravan guard\'s mules. I chose your brother\'s road for the Pages. I did not know about the envoy.' },
      { who: 'Salim', text: 'He asked me what was in the crates. I told him not to ask.', expr: 'grief' },
      { choice: { prompt: 'Ishaq waits. He does not look away.', options: [
        { label: 'You should have told us.', fx: () => { choose(g, 'conf34', 'told'); } },
        { label: 'Jabir would have carried it anyway.', fx: () => { choose(g, 'conf34', 'anyway'); } }] } },
      { who: 'Ishaq', text: 'Yes. I should have. I will carry that with the rest of the account.', when: () => chosen(g, 'conf34') === 'told' },
      { who: 'Ishaq', text: 'Perhaps. It is kind of you to say it. It does not make it lighter.', when: () => chosen(g, 'conf34') !== 'told' },
      ...(sud ? [{ who: 'Su\'da', text: 'Ishaq! The canal! The water has gone black, and the goats will not drink it!', expr: 'fear', tight: true, beat: 2 }] : []),
      { who: 'Ishaq', text: 'Bardanes. He has fouled the canal above the village. Without water, the village has days. Not weeks.', tight: true },
    ], { cast, onEnd: () => { const s = S25(g); s.said.ishaq = true; s.ch.ishaq = 'heard'; } });
  };
  const herald = () => {
    const pos = spotAhead(g, 7), h = extra(g, byzify({ ...LOOK.skoutatos(), weapon: null, offhand: null, cloak: 0xd8d0c0 }), pos, yawTo(pos, p.pos));
    const def = chat(g, other(h), [
      { caption: 'A rider came up the canal road under a white cloth.' },
      { who: 'Herald', text: 'From Bardanes, to the guard. The village drinks again on the day the guard is given up.' },
      { who: 'Herald', text: 'The elders have until dawn to choose. So do you.', tight: true, beat: 2 },
    ], { closeIn: 2.0, onEnd: () => h.remove() });
    return withCliff(def, 5);
  };
  // ---------------- Ep 6: the night before, the names of the dead
  const night = () => chat(g, ishaq(), [
    ...(MIDACT.sawad || []),
    { who: 'Ishaq', text: 'When this is done, I will tell the qadi what I did. All of it.', when: () => chosen(g, 'conf34') === 'told' },
    { who: 'Ishaq', text: 'Bring yourself back, Salim. I cannot carry two of you.', when: () => chosen(g, 'conf34') !== 'told' },
    { who: 'Salim', text: 'Light a lamp for him. I will be back before it burns down.', expr: 'resolve', tight: true },
  ], { onEnd: () => { said().mid32_sawad = true; } });

  // ================================================================ the beats
  // { obj, at() -> pos, enter(), done() -> bool, then: async () } ; a beat with no done() runs its then() at once
  const goto = (obj, at, r, then, extra = {}) => ({ obj, at, done: () => near(at(), r) && calm(), then, ...extra });
  const fight = (obj, spawn, then) => { const B = { obj, foes: null, enter: () => { if (!B.foes || B.foes.every((e) => e.dead)) B.foes = spawn(); }, at: () => B.foes?.find((e) => !e.dead)?.pos || null, done: () => !!B.foes && B.foes.every((e) => e.dead), then }; return B; };
  const scene = (def) => ({ then: async () => { await play(def()); } });
  const holdBeat = (obj, door, quest, then) => ({ obj, at: () => g.storyDoor?.[door], done: () => questDone(quest), then });
  const leaveHold = async () => { await g.warmPending?.catch?.(() => {}); if (g.interior?.hold) await g.holds.exit(); await sleep(700); };
  const BEATS = {
    1: [
      { then: async () => { await play(caravanA()); } },
      fight('Hold the caravan. Drive off the riders.', raiders, async () => { await sleep(900); await play(caravanB()); }),
    ],
    2: [
      { then: async () => { await play(briefing()); g.act = Math.max(g.act || 1, 1); g.briefed = true; } },
      goto('Ask Khawla at the village well what she saw', () => npcNamed('Khawla')?.pos, 3.4, async () => { await play(khawla()); }),
      fight('The watcher rides out to meet you', watcher, async () => { bark('Salim', 'He was waiting for me. They know who I am.'); await sleep(1500); }),
      goto('Follow the chest to the broken dam behind the caravanserai', () => g.storyDoor?.chief, 5, async () => { await play(damDoor()); }),
    ],
    3: [
      holdBeat('Enter the Broken Dam. Find the voice in the dark.', 'chief', STORY.chief, async () => { await leaveHold(); await play(smokeScene()); }),
    ],
    4: [
      { enter: () => { kilnSmoke.on = true; if (!clock) startClock({ label: 'The Pages are burning', total: 420, unit: () => t('{n} leaves left').replace('{n}', leavesLeft()) }); },
        obj: 'Get to the kiln galleries before the Pages burn', at: () => g.storyDoor?.second, done: () => questDone(STORY.second),
        then: async () => { E().leaves = leavesLeft(); stopClock(); kilnSmoke.on = false; await leaveHold(); await play(ishaqKnew()); } },
    ],
    5: [
      goto('Go back to the camp. Ishaq has answers to give.', () => g.npc?.position, 4, async () => { await play(confession()); }),
      goto('A family on the canal road has had no clean water in two days', () => npcNamed('Umayma')?.pos, 3.6, async () => { const n = npcNamed('Umayma'); if (n && !said()['fam32_sawad']) { g.s32?.talkFamily('Umayma'); await idle(); } }),
      goto('A Rum deserter hides by the kiln yard. He may know where Bardanes is.', () => npcNamed('Doukitzes')?.pos || g.s32?.des?.pos, 3.4, async () => { if (g.s32?.des && !ch().des_sawad) { g.s32.talkDeserter(); await idle(); } }),
      { then: async () => { await sleep(600); await play(herald()); } },
    ],
    6: [
      { then: async () => { await play(night()); } },
      { enter: () => { if (!g.boss && !g.bossActive) g.bossSpawned = false; if (clock?.label !== 'Dawn' && !E().dawn) startClock({ label: 'Dawn', total: 480, unit: (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`, out: () => { E().dawn = 'late'; BOSS.intro = { ...BOSS.intro, text: 'Dawn, guard. You are late, and the village is thirsty.' }; bark('Salim', 'The sky is going grey. Faster.'); } }); },
        obj: 'Reach the old arch before dawn. Bardanes waits there.', at: () => g.boss && !g.boss.dead ? g.boss.pos : V(SITES.arch.x, 0, SITES.arch.z), done: () => false }, // ends with the epilogue: g.travel below shows the season's cliffhanger
    ],
  };
  // wait for the director to be free (a scene started by another system)
  const idle = async () => { await sleep(200); while (g.cinematic || g.director?.active) await sleep(200); };

  // ================================================================ the runner
  let busy = false, introDone = false, cur = null;
  const beat = () => BEATS[E().n]?.[E().b];
  const nextBeat = () => { E().b++; cur = null; saveGame(g); g.refreshTracker?.(); };
  const endEpisode = () => { const e = E(); e.n++; e.b = 0; cur = null; introDone = false; saveGame(g); };
  async function intro(fromLoad) {
    const n = E().n;
    applyZones(); floorLevel(n);
    if (clock && !(n === 4 && clock.label !== 'Dawn') && !(n === 6 && clock.label === 'Dawn')) stopClock(); // no clock outlives its episode
    g.paused = true;
    if (n > 1 || fromLoad) await D.recap(n);
    if (E().b === 0 || fromLoad) await D.titleCard(n);
    g.paused = false;
    // the people of later episodes wait out of sight
    gateNpc('Umayma', n > 5 || (n === 5 && E().b >= 1)); gateNpc('Nadr', n > 5 || (n === 5 && E().b >= 1)); gateNpc('Qays', n > 5 || (n === 5 && E().b >= 1));
    gateNpc('Doukitzes', n === 5 && E().b >= 2);
    if (n >= 4 && n < 6) kilnSmoke.on = n === 4;
    g.refreshTracker?.();
  }
  D.target = () => {
    if (!live() || g.interior) return null;
    const B = beat(); if (!B?.obj) return null;
    return { pos: B.at?.() || null, text: B.obj };
  };
  // the tracker shows the episode
  const prevRefresh = g.refreshTracker;
  g.refreshTracker = () => {
    if (!live()) return prevRefresh?.();
    const n = E().n; g.ui.quest([{ text: `${t('Episode')} ${t(NUM[n])} · ${t(EPISODES[n].title)}`, on: true, done: false }]);
  };
  const prevTrack = g.trackTarget;
  g.trackTarget = (...a) => D.target() || (live() ? null : prevTrack?.(...a));

  async function step() {
    if (!introDone) { busy = true; const e0 = E(); try { await intro(false); } finally { if (E() === e0) introDone = true; busy = false; } return; }
    const B = beat();
    if (!B) { endEpisode(); return; }
    if (cur !== B) { cur = B; B.enter?.(); g.refreshTracker?.(); }
    // the people of the episode come out as their beat arrives
    if (E().n === 5) { const b = E().b; for (const w of ['Umayma', 'Nadr', 'Qays']) gateNpc(w, b >= 1); gateNpc('Doukitzes', b >= 2); }
    if (B.done && !B.done()) return;
    busy = true;
    try { await B.then?.(); } catch (e) { console.warn('drama34 beat', e); }
    busy = false; nextBeat();
  }
  D.begin = async () => { // a new chronicle
    p.ep34 = { n: 1, b: 0 }; g.act = 1; g.briefed = true; introDone = false;
    for (let i = 1; i <= 6; i++) try { localStorage.removeItem(stillKey(i)); } catch { /* none */ }
  };
  D.resume = async () => { // Continue from the title screen
    if (!p.ep34) p.ep34 = fromSave();
    if (p.ep34.n === 1) p.ep34.b = 0; // the first episode is played through in one sitting
    if (!live()) return false;
    busy = true; try { await intro(true); } finally { introDone = true; busy = false; }
    return true;
  };
  // an older save: start at the episode that matches what was already done
  function fromSave() {
    if (!IS_SAWAD || (g.act || 1) >= 4 || questDone(STORY.boss)) return { n: 7, b: 0 };
    if (questDone(STORY.second)) return { n: 5, b: 0, leaves: 60 };
    if (questDone(STORY.chief)) return { n: 4, b: 0 };
    return { n: 2, b: 0 };
  }
  D.fromSave = fromSave;
  // headless tests: start at an episode, with what came before marked done (shots/r34drama.mjs)
  let jumpTo = 0;
  D.jump = (n) => { jumpTo = n; };
  const doJump = (n) => {
    p.ep34 = { n, b: 0, leaves: 60 }; introDone = false; cur = null; stopClock();
    const done = (id, hold) => { const q = g.quests.find((x) => x.id === id); if (q) q.done = true; const s = g.holds?.state(hold); if (s) s.done = true; };
    if (n >= 4) done(STORY.chief, 'dam'); if (n >= 5) done(STORY.second, 'kilns');
    if (n >= 4) choose(g, 'photeinos', 'qadi'); g.act = Math.max(g.act || 1, n >= 5 ? 3 : n >= 4 ? 2 : 1);
  };
  // the season ends on the quays' road: the epilogue plays, then the cliffhanger, then the marshes load
  const prevTravel = g.travel;
  g.travel = () => {
    if (live() && E().n === 6 && questDone(STORY.boss)) {
      E().n = 7; E().b = 0; saveGame(g); stopClock();
      g.ui.holdBlack = true;
      D.cliff(6, false).then(() => prevTravel());
      return;
    }
    prevTravel();
  };

  // ------------------------------------------------ per frame
  const prevTick = g.tickExtra;
  let smokeT = 0;
  g.tickExtra = (dt) => {
    prevTick?.(dt);
    applyGate();
    if (locked()) for (const m of g.sideMarks || []) if (m) m.visible = false;
    tickClock(dt);
    // paper smoke over the kiln yard while Olbianos burns the Pages
    if (kilnSmoke.on && !g.interior && (smokeT -= dt) <= 0) {
      smokeT = 0.08; const K = SITES.kiln;
      g.fx.smoke.spawn({ pos: { x: K.x + (Math.random() - 0.5) * 10, y: heightAt(K.x, K.z) + 3, z: K.z + (Math.random() - 0.5) * 10 }, vel: { x: 0.6, y: 3.2, z: 0.2 }, life: 9, size: 2, size1: 9, color: new THREE.Color(0.09, 0.08, 0.08), alpha: 0.55, drag: 0.15, fadeIn: 0.2 });
    }
    // the ambush: Jabir and the other guard stand by the camels and fight whoever comes close
    if (rt.keep?.length && !g.cinematic) {
      for (const a of rt.keep) tickActor(g, a, dt);
      for (const a of [rt.jabir, rt.guard2]) {
        if (!a || a.st.dead) continue;
        let f = null, fd = 9; for (const e of g.enemies) if (e.ep34 && !e.dead) { const d = e.pos.distanceTo(a.pos); if (d < fd) { fd = d; f = e; } }
        if (f) { a.facing = yawTo(a.pos, f.pos); if (!a.st.action && Math.random() < dt * 0.9) act(a, 'attack', 0.6); }
      }
    }
    // the season's last still: Bardanes down at the arch (the epilogue ends on black)
    if (live() && E().n === 6 && questDone(STORY.boss) && !E().snap6 && !g.cinematic) { E().snap6 = true; snap(6); }
    if (!live()) return;
    if (E().n < 6 && !g.bossActive) g.bossSpawned = true; // Bardanes waits for the last episode
    if (busy || !g.started || g.cinematic || g.paused || p.dead || g.ui.dialogOpen || !g.director) return;
    if (jumpTo) { doJump(jumpTo); jumpTo = 0; return; }
    step();
  };
  // a chronicle continued from a save outside the episodes still has its gate and troops set
  applyZones();
  return D;
}
