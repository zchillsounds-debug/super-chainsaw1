// Round 34: the Chronicle as a microdrama. The story is the game: the Sawad is told as six short episodes, each with a
// hook, one objective at a time, a turn, and a cliffhanger card. Nothing is skipped (cinema.js). Between scenes the
// map holds only the episode's own fights and people; the boards, bounties, dungeons and trials wait for the end of
// the chronicle ("After the Chronicle", act 7).
// Round 35: rebuilt around one question: why keep a wounded guard alive? The raiders took Jabir to trade for Ishaq,
// the only man who can read the Pages' cipher. A new chronicle opens on the night raid (cold open), then rewinds.
//   Ep 1 Dusk on the Dune   the caravan halts; the ambush; an arrow wounds Jabir; the raid; "The astronomer, for your brother."
//   Ep 2 The Cedar Chest    why they need Ishaq; Khawla saw Jabir tied over a horse; the watcher; his headcloth on the dam door
//   Ep 3 The Broken Dam     Photeinos: Jabir is at the kilns, and Ishaq has a friend who writes to the envoy; smoke
//   Ep 4 Ash in the Kilns   a clock; the last cell is empty; Olbianos, who once copied for Ishaq, names him
//   Ep 5 Thirst             the confession; the canal; the deserter; the herald's terms and the choice (trade34)
//   Ep 6 The Arch           four names, not five; a race to the arch before dawn; Bardanes; Jabir found alive
// A cliffhanger runs straight on into the next title card; "previously" only plays when a saved chronicle is resumed.
// State: p.ep34 = { n, b, leaves, dawn } (saved). Every line has Arabic in story34_ar.js.
import * as THREE from 'three';
import { H32, JABIR_LOOK } from './scenes.js';
import { chat, other, extra, spotAhead, MIDACT } from './scenes32.js';
import { humanoid, camel } from './characters.js';
import { LOOK, byzify } from './byz.js';
import { REGION, IS_SAWAD, IS_MARSH, STORY } from './region.js';
import { season2 } from './drama36.js';
import { SITES, heightAt } from './terrain.js';
import { LIEUT, BOSS } from './story15.js';
import { S25, choose, chosen } from './story25.js';
import { saveGame } from './save.js';
import { t, LANG } from './i18n.js';

const { V, ground, yawTo, lineDur, actor, at, headOf, walk, act, tickActor, playerActor } = H32;
const P = new URLSearchParams(location.search);
// on for every real chronicle; the old headless tests (?play) run without it unless they ask (?drama)
export const DRAMA_ON = !P.has('nodrama') && (!P.has('play') || P.has('drama'));
// Round 36: each story region is a season: the Sawad is Season One, the marshes Season Two (drama36.js)
const SEASON = IS_SAWAD ? 1 : IS_MARSH ? 2 : 0;

// ---------------------------------------------------------------- the episodes' words
export const EPISODES = {
  1: { title: 'Dusk on the Dune', ar: 'غسقٌ على الكثيب', next: '' },
  2: { title: 'The Cedar Chest', ar: 'صندوق الأرز', next: 'Why keep a wounded guard alive?' },
  3: { title: 'The Broken Dam', ar: 'السدّ المكسور', next: 'The voice in the dark knows where Jabir is.' },
  4: { title: 'Ash in the Kilns', ar: 'رمادٌ في الأتون', next: 'The kilns are burning. Jabir is inside.' },
  5: { title: 'Thirst', ar: 'العطش', next: 'Ishaq has answers. Salim may not want them.' },
  6: { title: 'The Arch', ar: 'الطاق', next: 'Ishaq, for Jabir. At dawn.' },
  7: { title: 'Season Two · The Marshes', ar: 'الموسم الثاني · الأهوار', next: 'Kallinikos has the last Pages. And he has the fire.' },
};
const NUM = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
// Round 35: "previously" is only for a player coming back to a saved chronicle (choices change the lines)
const RECAP = {
  2: () => ['On the dune, the raiders wounded Jabir and took him alive, with the cedar chest.', 'They left a message tied to an arrow: "The astronomer, for your brother."'],
  3: () => ['The chest held the Pages, in Ishaq\'s own cipher. Only he can read them.', 'The riders carried Jabir east, to the old caravanserai.', 'At the broken dam, a voice in the dark knew Salim\'s name.'],
  4: (g) => ['Photeinos fell in the broken dam.', chosen(g, 'photeinos') === 'free' ? 'Salim let him go.' : 'Salim bound him for the qadi.', 'He said Jabir was at the kilns, and that someone close to Ishaq writes to the envoy.', 'Then the kilns began to burn.'],
  5: (g) => ['Salim fought through the burning kilns. Jabir was already gone.', ...leavesLines(g), 'Olbianos died with a name in his mouth: Ishaq.'],
  6: (g) => ['Ishaq confessed: he put the chest on Jabir\'s mules on purpose.', 'Bardanes fouled the canal, and named his price: Ishaq for Jabir, at the old arch, at dawn.', chosen(g, 'trade34') === 'feign' ? 'Salim sent word that they would come.' : 'Salim sent word: no trade.'],
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
function stillKey(n) { return 'sob.ep34.still.' + (SEASON === 2 ? 's2.' : '') + n; }
function getStill(n) { try { return localStorage.getItem(stillKey(n)); } catch { return null; } }

export function setupDrama34(g) {
  const p = g.player, audio = g.audio;
  const KEY = SEASON === 2 ? 'ep36' : 'ep34';
  const E = () => (p[KEY] ||= { n: 1, b: 0 });
  // the side content waits until the chronicle is finished (act 7)
  const locked = () => DRAMA_ON && (g.act || 1) < 7;
  // the Sawad's and the marshes' six episodes are played as episodes (later seasons follow in later rounds)
  const live = () => DRAMA_ON && SEASON > 0 && g.started && E().n <= 6;
  // the season's words and beats (Season Two fills these in from drama36.js once the helpers below exist)
  const SN = { EPISODES, RECAP, FLOOR, ZONES, where: 'The Sawad, outside Baghdad, 813', end: 'End of Season One', slate: 'One hour earlier', eyebrow: '' };
  g.storyLoot = false;
  const D = g.drama34 = { on: DRAMA_ON, live, locked, E, season: SEASON };

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
  if (SEASON) for (const e of g.enemies) if (!e.interior && !e.boss) zoned.push({ e, zone: zoneOf(e.pos.x, e.pos.z) });
  const applyZones = () => {
    if (!SEASON) return;
    const ok = new Set(live() ? SN.ZONES[E().n] || [] : ['serai', 'kiln', 'south', 'open']);
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
      // Round 35: no door opens while a beat is still running (the way out of a hold into the next scene)
      if (live() && busy) return 'Not now.';
      if (live() && SN.lock) { const m = SN.lock(id); if (m) return m; }
      if (live() && SEASON === 1) {
        if (id === 'dam' && E().n < 3) return 'Not yet. Find out who took the chest first.';
        if (id === 'kilns' && E().n < 4) return 'The galleries are barred. Find Photeinos first.';
      }
      return prevLocked(id);
    };
  }
  // the lieutenants' last words carry the episodes' turns; the act cards give way to the episode cards
  if (IS_SAWAD && DRAMA_ON && LIEUT?.chief) {
    LIEUT.chief = { ...LIEUT.chief, text: 'Your brother is at the kilns, with Olbianos. And your astronomer has a friend who writes to the envoy.', card: null };
    LIEUT.second = { ...LIEUT.second, text: 'Your brother left an hour ago, for Bardanes. I copied for Ishaq once. I know how he hides things. A guard\'s mules.', card: null };
    // Bardanes' greeting follows Salim's answer to the herald (set when the last episode begins)
    D.bossLine = () => chosen(g, 'trade34') === 'feign' ? 'You came, guard. But where is the astronomer? No matter. I will take him after you.' : 'No trade, then. Your brother said you were stubborn. I will take you both.';
    BOSS.intro = { ...BOSS.intro, text: D.bossLine() };
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
    const Ep = SN.EPISODES[n];
    $o('.box').innerHTML = `<div class="eyebrow">${SN.eyebrow ? t(SN.eyebrow) + ' · ' : ''}${t('Episode')} ${t(NUM[n] || String(n))}</div>${LANG === 'ar' ? '' : `<div class="arline">${Ep.ar}</div>`}<div class="rule"><i></i><b></b><i></i></div><div class="title"${rtl}>${t(Ep.title)}</div><div class="where">${t(SN.where)}</div>`;
    // Round 35: straight on from the cliffhanger: the overlay is already black, so the card comes up on it with no gap
    if (D.chained) { D.chained = false; overlay().className = 'title on'; } else show('title');
    audio.stinger?.('title');
    await sleep(900); await waitTap(2600, 4800, 'Tap to begin'); await hide();
  };
  D.recap = async (n) => {
    const lines = (SN.RECAP[n]?.(g) || []).map((s) => t(s));
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
    const N = SN.EPISODES[n + 1];
    $o('.box').innerHTML = `<div class="tbc"${rtl}>${t('To be continued')}</div><div class="nextep"${rtl}>${n >= 6 ? t(SN.end) : t('Next') + ' · ' + t('Episode') + ' ' + t(NUM[n + 1] || '')}</div>${n >= 6 ? `<div class="nexttitle"${rtl}>${t(N?.title || '')}</div>` : ''}<div class="teaser"${rtl}>${t(N?.next || '')}</div>`;
    await sleep(500); show(n >= 6 ? 'cliff final' : 'cliff');
    await waitTap(2600, 60000);
    // Round 35: the frozen frame goes to black and stays black: the next episode's title card comes up on it
    if (n < 6) { const o = overlay(); o.className = 'hold on'; $o('.box').innerHTML = ''; D.chained = true; D.chainT = performance.now(); await sleep(450); }
    else await hide();
    document.body.classList.remove('ep34freeze');
  };
  // Round 35: a black frame with one line on it ("One hour earlier"), between the cold open and the episode
  D.slate = async (text) => {
    $o('.box').innerHTML = `<div class="slate"${rtl}>${t(text)}</div>`;
    show('hold'); await sleep(2600); D.chained = true; D.chainT = performance.now();
  };
  // a shot that holds the frame while the cliffhanger card plays over it, then lets the scene end
  const cliffShot = (n) => { const s = { dur: 1e6, slow: 0.03, tight: true, enter: (d) => { D.cliff(n).then(() => { if (d.shot === s) d.next(); }); } }; return s; };
  const withCliff = (def, n) => { def.shots.push(cliffShot(n)); return def; };

  // ------------------------------------------------ the clock (Ep 4: the leaves burning; Ep 6: dawn)
  const clockEl = document.createElement('div'); clockEl.id = 'clock34'; clockEl.className = 'hidden';
  clockEl.innerHTML = '<div class="cl"></div><div class="bar"><i></i></div><div class="cn"></div>';
  document.getElementById('ui').appendChild(clockEl);
  let clock = null; // { label, total, left, unit(left) -> text, out() }
  const startClock = (C) => { clock = { ep: E().n, ...C, left: C.left ?? C.total }; clockEl.classList.remove('hidden'); heartT = 0; };
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
  const floorLevel = (n) => { while (p.level < (SN.FLOOR[n] || 1)) g.levelUp(); };
  // the people folded into the story stay out of sight until their episode
  const gateNpc = (name, show) => {
    const n = npcNamed(name); if (!n) return;
    if (!n.gate34) { n.gate34 = true; const it = g.interactables.find((i) => i.npc === n); if (it) { const d = Object.getOwnPropertyDescriptor(it, 'hidden'), orig = d?.get ? d.get.bind(it) : () => !!d?.value; Object.defineProperty(it, 'hidden', { get: () => (live() && !n.show34) || orig(), configurable: true }); } }
    n.show34 = show; if (live()) n.rig.visible = show;
  };
  const kilnSmoke = { on: false };

  // ================================================================ the scenes
  // ---------------- Ep 1: the caravan on the road at dusk (part one, to the attack)
  // Round 35: the caravan walks in from the north and halts at the place of the ambush (it used to keep walking for the
  // whole scene, 40 m down the road and into the village houses); the raiders stay hidden behind the ridge until the reveal
  const rt = {};
  const road = (z) => 13.5 + (z - 100) * 0.02;
  const HALT = 128; // where the caravan stops (z 128-136 is the flattest stretch of the road; the map ends at z 140)
  const LANE = { camel: -4.2, salim: 0.4, jabir: 2.0, guard: 1.2 }; // the camels on the dune side; the men face the ridge
  // a camera point kept at least `h` above the sand (the dune bank west of the road rises fast)
  const above = (v, h = 1.0) => { v.y = Math.max(v.y, heightAt(v.x, v.z) + h); return v; };
  function caravanA() {
    const sc = g.scene, actors = [];
    const salim = playerActor(g);
    const add = (a) => { actors.push(a); if (a.rig !== p.rig) sc.add(a.rig); return a; };
    const start = (stop) => Math.min(139.5, stop + 6); // each walks the last few metres to his place
    const camelA = add(Object.assign(actor(camel(0xb88a58), ground(road(start(HALT)) + LANE.camel, start(HALT)), Math.PI), { camel: true, stop: HALT }));
    const camelB = add(Object.assign(actor(camel(0xa07850), ground(road(start(HALT + 4)) + LANE.camel, start(HALT + 4)), Math.PI), { camel: true, stop: HALT + 4 }));
    const jabir = add(Object.assign(actor(humanoid(JABIR_LOOK), ground(road(start(HALT + 2)) + LANE.jabir, start(HALT + 2)), Math.PI), { stop: HALT + 2, lane: LANE.jabir }));
    const guard2 = add(Object.assign(actor(humanoid({ robe: '#4a3a2a', robe2: '#2a3a5a', turban: 0xc8b890, weapon: 'spear', skin: 0x8a5a3a }), ground(road(start(HALT + 4.5)) + LANE.guard, start(HALT + 4.5)), Math.PI), { stop: HALT + 4.5, lane: LANE.guard }));
    const archer = add(actor(humanoid(byzify({ ...LOOK.toxotes(), robe: '#1e2430', robe2: '#8a2a1a', beard: 0x1a120c, cloak: 0x1a1a22 })), ground(27, 111), -Math.PI / 2));
    // the two riders on the ridge lie flat behind its crest until the reveal
    const b1 = add(actor(humanoid(byzify({ ...LOOK.skoutatos(), shieldTint: 0 })), ground(29.5, 117), -Math.PI / 2));
    const b2 = add(actor(humanoid(byzify({ ...LOOK.kataphraktos(), weapon: 'sword', offhand: 'shield', shieldTint: 0 })), ground(29, 121), -Math.PI / 2));
    archer.rig.visible = false; b1.rig.visible = false; b2.rig.visible = false;
    actors.push(salim);
    salim.pos.copy(ground(road(start(HALT + 2)) + LANE.salim, start(HALT + 2))); salim.facing = Math.PI; salim.st.action = null; salim.st.crouch = 0;
    Object.assign(salim, { stop: HALT + 2, lane: LANE.salim });
    const caravan = [camelA, camelB, jabir, guard2, salim];
    for (const a of caravan) if (a.camel) a.lane = LANE.camel;
    const march = (dt, speed = 1.35) => { for (const a of caravan) {
      if (a.halt || a.pos.z <= a.stop + 0.05) { a.moving = false; a.st.walkBlend = 0; continue; }
      a.moving = true; const z = Math.max(a.stop, a.pos.z - 2); walk(a, V(road(z) + a.lane, 0, z), speed, dt);
      if (!a.camel) { a.st.walkBlend = 1; a.st.phase += dt * 4; }
    } };
    Object.assign(rt, { camelA, camelB, jabir, guard2, archer, keep: [camelA, camelB, jabir, guard2, archer] });
    // the brothers walk side by side; each is filmed from his own side (Jabir from the south-east, Salim from the south-west),
    // so the other is never between the camera and the speaker, and the camels walk well back on the dune side
    const L = (who, text, a, extra = {}) => ({ dur: lineDur(text), line: { who, text, rig: a.rig, cue: who === 'Salim' ? 'hm' : 'breath', ...(extra.line || {}) },
      cam: { follow: true, p0: () => { const q = a.pos, sd = a === salim ? -1.3 : 2.1; return above(V(q.x + sd, q.y + 1.62, q.z - 2.5)); }, t0: () => headOf(a)().add(V(0, -0.15, 0)), p1: () => { const q = a.pos, sd = a === salim ? -1.15 : 1.9; return above(V(q.x + sd, q.y + 1.6, q.z - 2.2)); }, t1: () => headOf(a)().add(V(0, -0.15, 0)), fov: 32 }, dof: headOf(a), aperture: 1.4,
      run: (d, k, dt) => march(dt), ...extra.shot });
    const shots = [
      { dur: 6.0, fadeIn: 1.4, caption: 'The Sawad, outside Baghdad, in the year 813. The caliph\'s sons are at war. The roads belong to no one.',
        cam: { p0: () => above(ground(road(HALT) + 12, HALT - 4, 6), 4), t0: () => ground(road(HALT + 8), HALT + 8, 1.4), p1: () => above(ground(road(HALT) + 8, HALT - 3, 3.6), 2.6), t1: () => ground(road(HALT + 3), HALT + 3, 1.4), fov: 40 },
        run: (d, k, dt) => march(dt) },
      L('Jabir', 'Two more days to Baghdad, Salim. Then home.', jabir, { line: { expr: 'warm' } }),
      L('Salim', 'Too quiet, brother. I do not like it.', salim, { line: { expr: 'wary' }, shot: { run: (d, k, dt) => { march(dt); salim.st.headYaw = -Math.sin(k * Math.PI) * 0.6; } } }),
      L('Jabir', 'Ishaq checks that cedar chest every hour. Star-glasses do not need that much love.', jabir, { line: { expr: 'warm' } }),
      L('Salim', 'Then do not ask him what is in it.', salim, { line: { expr: 'neutral' } }),
      // the reveal: the riders rise over the crest of the ridge
      { dur: 3.8, caption: 'Riders in Byzantine mail were waiting on the dunes.', tight: true, beat: 2, stinger: 'ambush',
        enter: () => { for (const a of caravan) { a.halt = true; a.moving = false; a.st.walkBlend = 0; } b1.rig.visible = true; b2.rig.visible = true; b1.st.crouch = 1; b2.st.crouch = 1; },
        cam: { p0: () => ground(road(HALT) + 3, HALT + 6, 1.7), t0: () => ground(28, 118, 1.8), p1: () => ground(road(HALT) + 3.6, HALT + 5.2, 1.8), t1: () => ground(28, 118, 1.8), fov: 30 },
        run: (d, k, dt) => { for (const b of [b1, b2]) { b.st.crouch = Math.max(0, 1 - k * 1.8); if (k > 0.5) walk(b, V(b.pos.x - 3, 0, b.pos.z), 1.6, dt); } salim.st.headYaw = 0; } },
      L('Jabir', 'Riders! Guard the camels, Salim!', jabir, { line: { expr: 'anger', cue: 'shout' }, shot: { tight: true, enter: () => { jabir.facing = yawTo(jabir.pos, b1.pos); act(jabir, 'command', 1.2); }, run: () => {} } }),
    ];
    return { dusk: 0.55, actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); },
      end: () => { for (const b of [b1, b2]) sc.remove(b.rig); for (const a of caravan) { a.halt = true; a.moving = false; } salim.st.headYaw = 0; } };
  }
  // the fight: real raiders down off the ridge; Jabir and the other guard hold beside the camels
  function raiders() {
    const foes = [...g.spawnPack(['bandit', 'spearman'], 26, 116, 3, 1, { spread: 3 }), ...g.spawnPack('bandit', 24, 125, 1, 1, { spread: 1 })];
    for (const e of foes) { e.alerted = true; e.ep34 = true; }
    return foes;
  }
  // ---------------- Ep 1, part two: the arrow from the ridge. Jabir goes down, wounded
  function caravanB() {
    const sc = g.scene, { jabir, archer } = rt, salim = playerActor(g);
    const actors = [salim, ...rt.keep];
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 4).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2a2018 }));
    shaft.visible = false; sc.add(shaft);
    // the highest point of the ridge 9-13 m east of Jabir, so the bowman stands against the sky
    const crest = () => { let best = null; for (let dx = 9; dx <= 13; dx += 1) for (let dz = -6; dz <= 2; dz += 2) { const q = ground(jabir.pos.x + dx, jabir.pos.z + dz); if (!best || q.y > best.y) best = q; } return best; };
    const from = () => at(archer, 1.55, 0.4)(), to = () => at(jabir, 1.15)();
    const shots = [
      { dur: lineDur('Ha! Is that all the Rum could send?'), line: { who: 'Jabir', text: 'Ha! Is that all the Rum could send?', rig: jabir.rig, cue: 'hm', expr: 'warm' },
        cam: { follow: true, p0: () => { const q = jabir.pos; return above(V(q.x + 2.2, q.y + 1.6, q.z - 1.8)); }, t0: headOf(jabir), fov: 32 }, dof: headOf(jabir),
        enter: () => { salim.pos.copy(jabir.pos).add(V(-1.7, 0, -0.9)); salim.pos.y = heightAt(salim.pos.x, salim.pos.z); jabir.st.action = null; jabir.facing = yawTo(jabir.pos, salim.pos); salim.facing = yawTo(salim.pos, jabir.pos); } },
      // on the ridge, a bowman nobody saw
      { dur: 2.6, slow: 0.45, tight: true, beat: 2, cam: { p0: () => { const f = yawTo(archer.pos, jabir.pos); return above(V(jabir.pos.x + Math.sin(f) * 1.8 + Math.cos(f) * 0.6, jabir.pos.y + 1.7, jabir.pos.z + Math.cos(f) * 1.8 - Math.sin(f) * 0.6)); }, t0: () => at(archer, 1.4)(), p1: () => { const f = yawTo(archer.pos, jabir.pos); return above(V(jabir.pos.x + Math.sin(f) * 1.4 + Math.cos(f) * 0.5, jabir.pos.y + 1.7, jabir.pos.z + Math.cos(f) * 1.4 - Math.sin(f) * 0.5)); }, t1: () => at(archer, 1.4)(), fov: 22 },
        enter: () => { archer.rig.visible = true; archer.pos.copy(crest()); archer.facing = yawTo(archer.pos, jabir.pos); act(archer, 'attack', 2.2); } },
      { dur: 1.6, slow: 0.35, tight: true, cam: { follow: true, p0: () => { const q = jabir.pos; return above(V(q.x + 1.2, q.y + 1.5, q.z - 3.2)); }, t0: at(jabir, 1.2), fov: 30 },
        enter: () => { shaft.visible = true; shaft.position.copy(from()); },
        run: (d, k) => { const a = from(), b = to(), q = Math.min(1, k * 1.3); shaft.position.lerpVectors(a, b, q); shaft.lookAt(b); if (q >= 1 && !jabir.st.dead) { jabir.st.dead = true; jabir.st.fallDir = -1; jabir.st.deadT = 0; d.audio.voice?.('hurt'); g.audio.hit?.(); } } },
      { dur: lineDur('Jabir!'), line: { who: 'Salim', text: 'Jabir!', rig: p.rig, cue: 'shout', expr: 'anger' }, tight: true,
        cam: { follow: true, p0: at(salim, 1.7, 1.8, 0.8), t0: headOf(salim), fov: 30 }, dof: headOf(salim), enter: () => { shaft.visible = false; salim.facing = yawTo(salim.pos, jabir.pos); } },
      { dur: 3.4, caption: 'The arrow took him under the ribs. Then the dark came, and the raiders came back with it.', enter: (d) => { d.fade(1, 0.9); archer.rig.visible = false; } },
    ];
    return { dusk: 0.7, actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); }, end: () => { sc.remove(shaft); for (const a of rt.keep || []) sc.remove(a.rig); rt.keep = []; } };
  }
  // ---------------- the night raid: the cold open (open = true: it ends on a freeze, then "One hour earlier") and the
  // same moment again at the end of Episode 1 (open = false: the blow lands, and they take Jabir)
  function nightRaid(open) {
    const sc = g.scene, actors = [], extra = [];
    const salim = playerActor(g), lamp = g.bossLight;
    const add = (a) => { actors.push(a); sc.add(a.rig); extra.push(a.rig); return a; };
    const C = ground(road(136) - 1.0, 136);
    // laid along the slope's contour (a body lying across a slope sinks into the uphill sand), on his back
    const gx = heightAt(C.x + 0.5, C.z) - heightAt(C.x - 0.5, C.z), gz = heightAt(C.x, C.z + 0.5) - heightAt(C.x, C.z - 0.5);
    const jabir = add(actor(humanoid({ ...JABIR_LOOK, weapon: null }), C.clone(), Math.atan2(-gz, gx))); // his spear is gone
    jabir.st.dead = true; jabir.st.fallDir = 1; jabir.st.deadT = 4; // fallDir 1: on his back
    const jf = jabir.facing, J = { head: () => ground(C.x + Math.sin(jf) * 1.45, C.z + Math.cos(jf) * 1.45) }; // on his back, the head lies forward of the feet
    // the head bone does not follow the lying pose (it reads at standing height), so his face is placed from the body
    const jhead = () => J.head().add(V(0, 0.22, 0));
    const s1 = add(actor(humanoid(byzify({ ...LOOK.skoutatos(), shieldTint: 0 })), ground(C.x + 5, C.z + 10), Math.PI));
    const s2 = add(actor(humanoid(byzify({ ...LOOK.psilos(), offhand: null })), ground(C.x + 8, C.z + 7), Math.PI));
    const s3 = add(actor(humanoid(byzify({ ...LOOK.kataphraktos(), weapon: 'sword', offhand: 'shield', shieldTint: 0 })), ground(C.x - 5, C.z + 3.5), Math.PI / 2));
    actors.push(salim);
    // the cargo burning: bales and the chest's empty frame, lit by the fire
    const bales = [];
    const baleM = new THREE.MeshStandardMaterial({ color: 0x6a5238, roughness: 1 }); // sacking
    for (const [dx, dz, s] of [[-2.2, 2.6, 0.9], [-2.8, -1.8, 0.7], [-1.0, 4.4, 0.8]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.1 * s, 0.7 * s, 0.8 * s), baleM); const q = ground(C.x + dx, C.z + dz); m.position.set(q.x, q.y + 0.3 * s, q.z); m.rotation.y = dx; sc.add(m); extra.push(m); bales.push(m.position);
    }
    const burn = () => { for (const b of bales) if (Math.random() < 0.6) g.fx.fire(V(b.x + (Math.random() - 0.5) * 0.6, b.y + 0.3, b.z + (Math.random() - 0.5) * 0.6), 1.6 + Math.random()); };
    const place = () => {
      // on his knees at his brother's head and shoulders
      { const h = J.head(); salim.pos.set(h.x + Math.cos(jf) * 1.0 - Math.sin(jf) * 0.4, 0, h.z - Math.sin(jf) * 1.0 - Math.cos(jf) * 0.4); } salim.pos.y = heightAt(salim.pos.x, salim.pos.z); salim.facing = yawTo(salim.pos, J.head()); salim.st.crouch = 0.85; salim.st.action = null;
      g.lighting?.set?.('night', 0);
      if (lamp) { lamp.color.set(0xff8a3a); lamp.distance = 14; lamp.position.copy(C).add(V(-1.6, 1.4, 1.6)); lamp.intensity = 10; }
    };
    const grab = (dt) => { walk(s1, V(C.x + 1.0, 0, C.z + 0.8), 2.2, dt); walk(s2, V(C.x + 0.5, 0, C.z - 0.9), 2.2, dt); for (const s of [s1, s2]) { s.st.walkBlend = 1; s.st.phase += dt * 5; } };
    // a point across Jabir's head from Salim (d metres beyond it, h up, slid s along his body), for the two-shots
    const across = (d, h, s = 0) => { const hj = jhead(), hs = headOf(salim)(), f = yawTo(hs, hj); return above(V(hj.x + Math.sin(f) * d + Math.sin(jf) * s, hj.y + h, hj.z + Math.cos(f) * d + Math.cos(jf) * s), 0.5); };
    const drag = (e, dt) => { const f = jabir.facing; walk(jabir, e, 1.6, dt); jabir.facing = f; };
    const shots = [
      { dur: 3.4, fadeIn: 0.5, tight: true, beat: 2, stinger: 'ambush',
        enter: () => place(),
        // low over the burning bales, onto Salim crouched over his brother; the soldiers walk in out of the dark
        cam: { p0: () => above(V(C.x + 4.6, C.y + 2.4, C.z - 3.4), 1.8), t0: () => V(C.x - 0.4, C.y + 0.7, C.z + 0.6), p1: () => above(V(C.x + 3.6, C.y + 2.0, C.z - 2.6), 1.6), t1: () => V(C.x - 0.4, C.y + 0.7, C.z + 0.6), fov: 38 },
        run: (d, k, dt) => { burn(); salim.st.crouch = 0.85; walk(s1, V(C.x + 2.5, 0, C.z + 5), 1.4, dt); walk(s2, V(C.x + 4.5, 0, C.z + 3.5), 1.4, dt); for (const s of [s1, s2]) { s.st.walkBlend = 1; s.st.phase += dt * 4; } } },
      { dur: lineDur('Leave me, Salim. Run!'), line: { who: 'Jabir', text: 'Leave me, Salim. Run!', rig: jabir.rig, cue: 'breath', expr: 'pain' }, tight: true,
        // Round 36: side-on, a little raised, on the side Salim faces: Jabir lying in the lower middle of the frame (clear of
        // the subtitle bar), Salim on his knees over him, half toward us (his position is reliable, a lying head bone is not)
        cam: { follow: true, p0: () => { const m = C.clone().lerp(salim.pos, 0.5), f = yawTo(salim.pos, C) + Math.PI / 2, s = Math.cos(salim.facing - f) > 0 ? 1 : -1; return above(V(m.x + Math.sin(f) * 3.9 * s, m.y + 1.35, m.z + Math.cos(f) * 3.9 * s), 1.1); }, t0: () => C.clone().lerp(salim.pos, 0.5).add(V(0, 0.55, 0)), fov: 42 }, dof: () => C.clone().lerp(salim.pos, 0.5).add(V(0, 0.4, 0)), aperture: 1.0,
        run: (d, k, dt) => { burn(); salim.st.crouch = 0.85; } },
      { dur: lineDur('Not without you.'), line: { who: 'Salim', text: 'Not without you.', rig: p.rig, cue: 'shout', expr: 'anger' }, tight: true, beat: 1,
        cam: { follow: true, p0: () => across(1.25, 0.95, 0.35), t0: () => headOf(salim)(), fov: 30 }, dof: headOf(salim), aperture: 1.6,
        run: (d, k, dt) => { burn(); salim.st.crouch = 0.85; grab(dt * 0.4); } },
      // they take him: two soldiers drag Jabir off; Salim comes up off his knees
      { dur: 2.4, slow: 0.6, tight: true,
        // wide, side-on from the south, so the three of them and the dragging read at once
        cam: { p0: () => above(V(C.x + 1.5, C.y + 1.8, C.z - 5.6), 1.4), t0: () => V(C.x + 1.6, C.y + 0.8, C.z + 0.6), p1: () => above(V(C.x + 2.2, C.y + 1.7, C.z - 5.0), 1.4), t1: () => V(C.x + 2.4, C.y + 0.8, C.z + 1.2), fov: 40 },
        run: (d, k, dt) => { burn(); grab(dt); salim.st.crouch = Math.max(0, 0.85 - k * 1.6); if (k > 0.45) { const e = V(C.x + 6, 0, C.z + 4); drag(e, dt); s1.pos.copy(jabir.pos).add(V(0.5, 0, -0.6)); s2.pos.copy(jabir.pos).add(V(0.4, 0, 0.7)); for (const s of [s1, s2]) { s.pos.y = heightAt(s.pos.x, s.pos.z); s.facing = yawTo(s.pos, e); } jabir.facing = Math.PI / 2; } } },
      // the blow from behind
      { dur: 1.5, slow: 0.5, tight: true, beat: 2,
        enter: () => { s3.pos.copy(salim.pos).add(V(-1.3, 0, 0.5)); s3.pos.y = heightAt(s3.pos.x, s3.pos.z); s3.facing = yawTo(s3.pos, salim.pos); act(s3, 'attack', 0.9); },
        cam: { follow: true, p0: () => V(salim.pos.x + 1.6, salim.pos.y + 1.5, salim.pos.z + 1.4), t0: () => headOf(salim)(), fov: 32 },
        run: (d, k, dt) => { burn(); drag(V(C.x + 6, 0, C.z + 4), dt); if (k > 0.55 && !salim.st.hitT) { salim.st.hitT = 1; g.audio.hit?.(); d.audio.voice?.('hurt'); if (open) document.body.classList.add('ep34freeze'); d.fade(1, open ? 0.6 : 0.12); } } },
      ...(open ? [] : [{ dur: 4.2, caption: 'They took Jabir alive. And the cedar chest.', enter: (d) => d.fade(1, 0) }]),
    ];
    return { dusk: 1, actors, shots, tick: (d, dt) => { for (const a of actors) tickActor(g, a, dt); },
      end: () => { for (const r of extra) sc.remove(r); salim.st.crouch = 0; document.body.classList.remove('ep34freeze'); g.lighting?.forAct?.(g.act || 1, 0); if (lamp) { lamp.intensity = 0; lamp.color.set(0xff8a40); lamp.distance = 16; } } };
  }
  const coldOpen = () => nightRaid(true);
  // ---------------- Ep 1, part three: Salim wakes in the village. A message on an arrow
  function wake() {
    const salim = playerActor(g), ish = ishaq();
    const arrow = new THREE.Group();
    { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 5), new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.9 })); sh.position.y = 0.4; const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.004), new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 1 })); cloth.position.set(0.05, 0.62, 0); arrow.add(sh, cloth); arrow.rotation.z = 0.5; }
    const head = () => g.npc.userData?.parts?.head ? g.npc.userData.parts.head.getWorldPosition(new THREE.Vector3()) : g.npc.position.clone().add(V(0, 1.6, 0));
    const ots = (lis, spk, side) => ({ follow: true, p0: () => { const a = lis.pos, f = yawTo(a, spk.pos); return V(a.x - Math.sin(f) * 0.9 + Math.cos(f) * side, a.y + 1.72, a.z - Math.cos(f) * 0.9 - Math.sin(f) * side); }, t0: () => headOf(spk)(), fov: 30 });
    const say = (who, text, extra = {}) => { const sp = who === 'Salim' ? salim : ish, li = who === 'Salim' ? ish : salim;
      return { dur: lineDur(text), line: { who, text, rig: sp.rig, cue: who === 'Salim' ? 'hm' : 'breath', expr: extra.expr }, cam: ots(li, sp, who === 'Salim' ? -0.35 : 0.35), dof: headOf(sp), tight: extra.tight, beat: extra.beat,
        enter: () => { g.npcSt.talk = who === 'Ishaq'; salim.st.talk = who === 'Salim'; extra.enter?.(); } }; };
    const shots = [
      { ...say('Ishaq', 'Easy. You were struck from behind. Do not stand yet.', { expr: 'sad' }), fadeIn: 1.6,
        enter: () => {
          p.pos.set(1, 0, 88); p.pos.y = heightAt(1, 88); salim.st.crouch = 0; salim.st.action = null; salim.facing = yawTo(p.pos, g.npc.position); g.npc.rotation.y = yawTo(g.npc.position, p.pos); g.npcSt.talk = true;
        }, cam: { follow: true, p0: () => { const a = salim.pos, b = g.npc.position, f = yawTo(a, b); return V(a.x - Math.sin(f) * 0.9 + Math.cos(f) * 0.35, a.y + 1.75, a.z - Math.cos(f) * 0.9 - Math.sin(f) * 0.35); }, t0: head, fov: 30 } },
      say('Salim', 'Jabir. Where is Jabir?', { expr: 'fear' }),
      say('Ishaq', 'They took him. Alive. And the chest.', { expr: 'sad', tight: true, beat: 2 }),
      // he drives it into the sand between them
      say('Ishaq', 'They left this in the sand, where the chest had stood.', { expr: 'sad', enter: () => { const m = salim.pos.clone().lerp(g.npc.position, 0.5); arrow.position.set(m.x, heightAt(m.x, m.z) - 0.08, m.z); arrow.rotation.set(0, yawTo(salim.pos, g.npc.position), 0.18); g.scene.add(arrow); } }),
      { dur: 3.6, caption: 'An arrow, with a strip of linen tied to the shaft. Salim could not read it.',
        cam: { follow: true, p0: () => { const f = yawTo(salim.pos, g.npc.position) + Math.PI / 2; return arrow.position.clone().add(V(Math.sin(f) * 1.0, 0.6, Math.cos(f) * 1.0)); }, t0: () => arrow.position.clone().add(V(0, 0.55, 0)), fov: 30 }, dof: () => arrow.position.clone().add(V(0, 0.6, 0)), aperture: 1.6 },
      say('Salim', 'What does it say?', { expr: 'stern' }),
      say('Ishaq', '"The astronomer, for your brother."', { expr: 'fear', tight: true, beat: 2 }),
    ];
    return withCliff({ actors: [salim, ish], shots, tick: (d, dt) => { tickActor(g, salim, dt); }, end: () => { g.scene.remove(arrow); g.npcSt.talk = false; salim.st.talk = false; } }, 1);
  }

  // ---------------- Ep 2
  const briefing = () => chat(g, ishaq(), [
    { who: 'Salim', text: 'Why would they want you?', expr: 'anger' },
    { who: 'Ishaq', text: 'Because the chest never held instruments. It held the Pages of my teacher. There is no other copy in the world.' },
    { who: 'Ishaq', text: 'He wrote them in a cipher of his own. I am the only man alive who can read it.' },
    { who: 'Salim', text: 'So the Pages are worthless to them without you. And my brother is the price.', expr: 'stern', tight: true, beat: 1 },
    { who: 'Ishaq', text: 'An envoy from Constantinople came under the smoke of this war. His men want the book, and the man who reads it.' },
    // Round 36: a plant for the whole chronicle: how did the envoy know to ask for Ishaq?
    { who: 'Salim', text: 'Then how did a Rum envoy know to ask for you by name?', expr: 'stern' },
    { who: 'Ishaq', text: '...Few knew. Fewer than should have.', expr: 'sad', tight: true, beat: 2 },
    { who: 'Ishaq', text: 'Khawla, at the village well, saw riders pass at first light. Start with her.' },
    { who: 'Salim', text: 'Do not leave this village, astronomer. If you run, I will find you before they do.', expr: 'anger', tight: true },
  ]);
  const khawla = () => { const n = npcNamed('Khawla'); return chat(g, other(n), [
    { who: 'Khawla', text: 'Riders, at first light. A mule with a cedar chest. And a man tied over a horse, bleeding through his shirt.' },
    { who: 'Salim', text: 'Alive?', expr: 'fear', tight: true, beat: 1 },
    { who: 'Khawla', text: 'He lifted his head when they passed the well. He was looking back down the road. For you, I think.' },
    { who: 'Salim', text: 'Where did they take him?' },
    { who: 'Khawla', text: 'East, to the old caravanserai by the broken dam.' },
    { who: 'Khawla', text: 'And one stayed behind. He sat his horse on the rise and watched your tent all morning.', tight: true, beat: 2, expr: 'fear' },
    { who: 'Salim', text: 'Then he can show me the way.', expr: 'resolve' },
  ]); };
  const watcher = () => {
    const foes = [...g.spawnPack('rider', 40, 26, 1, Math.max(2, p.level), { elite: true, spread: 0, name: 'The Watcher' }), ...g.spawnPack(['bandit', 'spearman'], 42, 22, 2, Math.max(1, p.level - 1), { spread: 3 })];
    for (const e of foes) e.ep34 = true; return foes;
  };
  const damDoor = () => {
    const door = g.storyDoor?.chief || V(SITES.serai.x, 0, SITES.serai.z), salim = playerActor(g);
    const dark = () => V(door.x, heightAt(door.x, door.z) + 1.5, door.z);
    // Jabir's headcloth, bloodied, tied to the door post
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.62, 1, 6), new THREE.MeshStandardMaterial({ color: 0xd8cfb8, roughness: 1, side: THREE.DoubleSide }));
    { const pa = cloth.geometry.attributes.position; for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getY(i) * 9) * 0.02); cloth.geometry.computeVertexNormals(); } // folds
    const blood = new THREE.Mesh(new THREE.CircleGeometry(0.13, 12), new THREE.MeshStandardMaterial({ color: 0x4a0c0a, roughness: 1, side: THREE.DoubleSide }));
    blood.position.set(0.01, 0.02, 0.025); blood.scale.set(0.55, 1.5, 1); cloth.add(blood);
    const toward = yawTo(door, salim.pos); cloth.position.set(door.x + Math.sin(toward) * 0.9, heightAt(door.x, door.z) + 1.35, door.z + Math.cos(toward) * 0.9); cloth.rotation.y = toward; g.scene.add(cloth);
    const cl = () => cloth.position.clone();
    const shots = [
      // an insert: the cloth close, from the side, Salim's shoulder soft at the edge of the frame
      { dur: 3.6, caption: 'Tied to the door of the broken dam: a headcloth, stiff with blood.', tight: true, beat: 2,
        cam: { p0: () => { const c = cl(); return V(c.x + Math.sin(toward) * 1.3 + Math.cos(toward) * 0.55, c.y + 0.12, c.z + Math.cos(toward) * 1.3 - Math.sin(toward) * 0.55); }, t0: cl, p1: () => { const c = cl(); return V(c.x + Math.sin(toward) * 1.0 + Math.cos(toward) * 0.45, c.y + 0.1, c.z + Math.cos(toward) * 1.0 - Math.sin(toward) * 0.45); }, t1: cl, fov: 32 }, dof: cl, aperture: 1.6,
        enter: () => { salim.pos.set(cloth.position.x + Math.sin(toward) * 2.2, 0, cloth.position.z + Math.cos(toward) * 2.2); salim.pos.y = heightAt(salim.pos.x, salim.pos.z); salim.facing = yawTo(salim.pos, door); } },
      { dur: lineDur('Jabir\'s.'), line: { who: 'Salim', text: 'Jabir\'s.', rig: p.rig, cue: 'breath', expr: 'grief' }, tight: true, cam: { follow: true, p0: at(salim, 1.7, 1.6, 0.6), t0: headOf(salim), fov: 30 }, dof: headOf(salim) },
      { dur: lineDur('You are the brother.'), line: { who: 'A voice in the dark', text: 'You are the brother.', expr: 'neutral' }, tight: true, beat: 1,
        cam: { p0: () => { const s = salim.pos; return V(s.x * 0.5 + door.x * 0.5, heightAt(door.x, door.z) + 1.3, s.z * 0.5 + door.z * 0.5); }, t0: dark, fov: 26 } },
      { dur: lineDur('He is alive. Come in, and I will tell you for how long.'), line: { who: 'A voice in the dark', text: 'He is alive. Come in, and I will tell you for how long.' }, tight: true, beat: 2,
        cam: { p0: () => at(salim, 1.7, 1.6, 0.6)(), t0: () => headOf(salim)(), fov: 28 }, dof: headOf(salim) },
    ];
    return withCliff({ actors: [salim], shots, tick: (d, dt) => tickActor(g, salim, dt), end: () => g.scene.remove(cloth) }, 2);
  };
  // ---------------- Ep 3: smoke over the kiln yard, seen from the broken dam
  const smokeScene = () => {
    const salim = playerActor(g), K = V(SITES.kiln.x, heightAt(SITES.kiln.x, SITES.kiln.z) + 8, SITES.kiln.z);
    kilnSmoke.on = true;
    const shots = [
      { dur: 4.2, caption: 'Black smoke over the kiln yard. Not brick smoke. Paper.', tight: true, beat: 2, cam: { follow: true, p0: at(salim, 2.4, -3.0, 1.0), t0: () => K, p1: at(salim, 2.2, -2.4, 0.8), t1: () => K, fov: 30 }, enter: () => { salim.facing = yawTo(salim.pos, K); } },
      { dur: lineDur('They are burning the Pages. And Jabir is in there.'), line: { who: 'Salim', text: 'They are burning the Pages. And Jabir is in there.', rig: p.rig, cue: 'hm', expr: 'anger' }, tight: true, cam: { follow: true, p0: at(salim, 1.7, 1.7, 0.7), t0: headOf(salim), fov: 30 }, dof: headOf(salim) },
    ];
    return withCliff({ actors: [salim], shots, tick: (d, dt) => tickActor(g, salim, dt) }, 3);
  };
  // ---------------- Ep 4: out of the kilns, a handful of leaves, and a name
  const ishaqKnew = () => {
    const salim = playerActor(g), n = p.ep34.leaves ?? 60;
    const shots = [
      { dur: 4.4, caption: 'The last cell in the galleries was empty. Scratched into the wall with a buckle: a spear, and Salim\'s name.', tight: true, beat: 1, cam: { follow: true, p0: at(salim, 2.2, 3.4, 1.8), t0: at(salim, 1.2), fov: 34 } },
      { dur: 4.2, caption: t('He came out with {n} scorched leaves held against his chest. Jabir was gone. Olbianos had said where: to Bardanes.').replace('{n}', n), cam: { follow: true, p0: at(salim, 2.0, 2.6, 1.2), t0: at(salim, 1.3), fov: 32 } },
      { dur: lineDur('A guard\'s mules. Ishaq knew. He put the chest on my brother\'s mules.'), line: { who: 'Salim', text: 'A guard\'s mules. Ishaq knew. He put the chest on my brother\'s mules.', rig: p.rig, cue: 'hm', expr: 'anger' }, tight: true, beat: 2,
        cam: { follow: true, p0: at(salim, 1.65, 1.5, 0.5), t0: headOf(salim), p1: at(salim, 1.65, 1.2, 0.4), t1: headOf(salim), fov: 28 }, dof: headOf(salim) },
    ];
    return withCliff({ actors: [salim], shots, tick: (d, dt) => tickActor(g, salim, dt) }, 4);
  };
  // ---------------- Ep 5
  const confession = () => {
    const sud = npcNamed('Su\'da'), cast = sud ? { 'Su\'da': other(sud) } : {};
    return chat(g, ishaq(), [
      // Round 36: a plant. Salim told him not to leave the village; he knows the canal is fouled before Su'da cries it
      { caption: 'Ishaq\'s lamp was out. His sandals by the door were wet with canal mud.', tight: true },
      { who: 'Salim', text: 'You went out. I told you not to leave the village.', expr: 'stern' },
      { who: 'Ishaq', text: 'Only to the canal. I wanted to see the water for myself.' },
      { who: 'Salim', text: 'Olbianos copied for you once. He said you put the chest on Jabir\'s mules. On purpose.', expr: 'anger' },
      { who: 'Ishaq', text: 'Yes.', expr: 'sad', tight: true, beat: 2 },
      { who: 'Ishaq', text: 'No one searches a caravan guard\'s mules. I chose your brother\'s road for the Pages. I did not know about the envoy.' },
      { who: 'Salim', text: 'He asked me what was in the crates. I told him not to ask.', expr: 'grief' },
      { choice: { prompt: 'Ishaq waits. He does not look away.', options: [
        { label: 'You should have told us.', fx: () => { choose(g, 'conf34', 'told'); } },
        { label: 'Jabir would have carried it anyway.', fx: () => { choose(g, 'conf34', 'anyway'); } }] } },
      { who: 'Ishaq', text: 'Yes. I should have. I will carry that with the rest of the account.', when: () => chosen(g, 'conf34') === 'told' },
      { who: 'Ishaq', text: 'Perhaps. It is kind of you to say it. It does not make it lighter.', when: () => chosen(g, 'conf34') !== 'told' },
      ...(sud ? [{ who: 'Su\'da', text: 'Ishaq! The canal! The water has gone black, and the goats will not drink it!', expr: 'fear', tight: true, beat: 2 }] : []),
      { who: 'Ishaq', text: 'Bardanes has fouled the canal above the village. He wants them thirsty enough to hand me over.', tight: true },
    ], { cast, onEnd: () => { const s = S25(g); s.said.ishaq = true; s.ch.ishaq = 'heard'; } });
  };
  const herald = () => {
    const pos = spotAhead(g, 7), h = extra(g, byzify({ ...LOOK.skoutatos(), weapon: null, offhand: null, cloak: 0xd8d0c0 }), pos, yawTo(pos, p.pos));
    const def = chat(g, other(h), [
      { caption: 'A rider came up the canal road under a white cloth.' },
      { who: 'Herald', text: 'From Bardanes, to the guard. The astronomer, for your brother. At the old arch, at dawn.' },
      { who: 'Herald', text: 'Bring him, and the village drinks again. Come without him, and your brother does not see the sun.', tight: true, beat: 2 },
      { choice: { prompt: 'Behind you, Ishaq has heard every word.', options: [
        { label: 'Tell Bardanes we will come. Both of us.', fx: () => choose(g, 'trade34', 'feign') },
        { label: 'Tell Bardanes there is no trade.', fx: () => choose(g, 'trade34', 'refuse') }] } },
      { who: 'Salim', text: 'Tell him we will be there.', expr: 'stern', when: () => chosen(g, 'trade34') === 'feign' },
      { who: 'Salim', text: 'No trade. Tell him I am coming for my brother. Alone.', expr: 'anger', when: () => chosen(g, 'trade34') !== 'feign' },
      { who: 'Herald', text: 'Then I will tell him.', when: () => chosen(g, 'trade34') !== 'feign' },
    ], { closeIn: 2.0, onEnd: () => h.remove() });
    return withCliff(def, 5);
  };
  // ---------------- Ep 6: the night before, the names of the dead
  const night = () => chat(g, ishaq(), [
    ...(MIDACT.sawad || []),
    { who: 'Ishaq', text: 'You told him we would both come. Did you mean it?', when: () => chosen(g, 'trade34') === 'feign' },
    { who: 'Salim', text: 'You walk with me until I say stop. Then you run, and you do not look back.', expr: 'stern', when: () => chosen(g, 'trade34') === 'feign' },
    { who: 'Ishaq', text: 'You could have traded me. No one would have blamed you.', when: () => chosen(g, 'trade34') !== 'feign' },
    { who: 'Salim', text: 'Jabir would. He would never forgive me.', expr: 'sad', when: () => chosen(g, 'trade34') !== 'feign' },
    { who: 'Ishaq', text: 'When this is done, I will tell the qadi what I did. All of it.', when: () => chosen(g, 'conf34') === 'told' },
    { who: 'Ishaq', text: 'Bring yourself back, Salim. And bring him.', when: () => chosen(g, 'conf34') !== 'told' },
    { who: 'Salim', text: 'Light a lamp. I will bring him home before it burns down.', expr: 'resolve', tight: true },
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
      fight('Hold the caravan. Drive off the riders.', raiders, async () => { await sleep(900); await play(caravanB()); await play(nightRaid(false)); await play(wake()); }),
    ],
    2: [
      { then: async () => { await play(briefing()); g.act = Math.max(g.act || 1, 1); g.briefed = true; } },
      goto('Ask Khawla at the village well what she saw', () => npcNamed('Khawla')?.pos, 3.4, async () => { await play(khawla()); }),
      fight('The watcher rides out to meet you', watcher, async () => { bark('Salim', 'He knew which tent was mine. They know who I am.'); await sleep(1500); }),
      goto('Follow Jabir to the broken dam behind the caravanserai', () => g.storyDoor?.chief, 5, async () => { await play(damDoor()); }),
    ],
    3: [
      holdBeat('Enter the Broken Dam. Make the voice in the dark talk.', 'chief', STORY.chief, async () => { await leaveHold(); await play(smokeScene()); }),
    ],
    4: [
      { enter: () => { kilnSmoke.on = true; if (!clock) startClock({ label: 'The Pages are burning', total: 420, unit: () => t('{n} leaves left').replace('{n}', leavesLeft()) }); },
        obj: 'Get into the kiln galleries. Jabir and the Pages are inside.', at: () => g.storyDoor?.second, done: () => questDone(STORY.second),
        then: async () => { E().leaves = leavesLeft(); stopClock(); kilnSmoke.on = false; await leaveHold(); await play(ishaqKnew()); } },
    ],
    5: [
      goto('Go back to the camp. Ishaq has some answering to do.', () => g.npc?.position, 4, async () => { await play(confession()); }),
      goto('A family on the canal road has had no clean water in two days', () => npcNamed('Umayma')?.pos, 3.6, async () => { const n = npcNamed('Umayma'); if (n && !said()['fam32_sawad']) { g.s32?.talkFamily('Umayma'); await idle(); } }),
      goto('A Rum deserter hides by the kiln yard. He may know where Jabir is held.', () => npcNamed('Doukitzes')?.pos || g.s32?.des?.pos, 3.4, async () => { if (g.s32?.des && !ch().des_sawad) { g.s32.talkDeserter(); await idle(); } }),
      { then: async () => { await sleep(600); await play(herald()); } },
    ],
    6: [
      { then: async () => { BOSS.intro = { ...BOSS.intro, text: D.bossLine?.() || BOSS.intro.text }; await play(night()); } },
      { enter: () => { if (!g.boss && !g.bossActive) g.bossSpawned = false; if (clock?.label !== 'Dawn' && !E().dawn) startClock({ label: 'Dawn', total: 480, unit: (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`, out: () => { E().dawn = 'late'; BOSS.intro = { ...BOSS.intro, text: 'Dawn, guard. You are late. Your brother has been watching the sky.' }; bark('Salim', 'The sky is going grey. Faster.'); } }); },
        obj: 'Reach the old arch before dawn. Bardanes has Jabir.', at: () => g.boss && !g.boss.dead ? g.boss.pos : V(SITES.arch.x, 0, SITES.arch.z), done: () => false }, // ends with the epilogue: g.travel below shows the season's cliffhanger
    ],
  };
  // wait for the director to be free (a scene started by another system)
  const idle = async () => { await sleep(200); while (g.cinematic || g.director?.active) await sleep(200); };
  SN.BEATS = BEATS;
  // the people of later episodes wait out of sight
  SN.gate = (n, b) => { for (const w of ['Umayma', 'Nadr', 'Qays']) gateNpc(w, n > 5 || (n === 5 && b >= 1)); gateNpc('Doukitzes', n === 5 && b >= 2); };
  // Round 36: Season Two, the marshes: its scenes and beats are built from the same helpers
  if (SEASON === 2) Object.assign(SN, season2({ g, D, E, play, sleep, said, ch, ishaq, npcNamed, near, calm, questDone, bark, gateNpc, goto, fight, scene, holdBeat, leaveHold, withCliff, cliffShot, idle,
    startClock, stopClock, clock: () => clock, saveGame }));

  // ================================================================ the runner
  let busy = false, introDone = false, cur = null;
  Object.defineProperty(D, 'busy', { get: () => busy, configurable: true });
  const beat = () => SN.BEATS[E().n]?.[E().b];
  const nextBeat = () => { E().b++; cur = null; saveGame(g); g.refreshTracker?.(); };
  const endEpisode = () => { const e = E(); e.n++; e.b = 0; cur = null; introDone = false; saveGame(g); };
  async function intro(fromLoad) {
    const n = E().n;
    applyZones(); floorLevel(n);
    if (clock && clock.ep !== n) stopClock(); // no clock outlives its episode
    g.paused = true;
    // Round 35: a new chronicle opens in the middle of the night raid, then rewinds; "previously" only on a return
    // Round 36: Season Two arrives by travel (a page load), so its cold open is marked as played instead
    if (n === 1 && E().b === 0 && (SEASON === 1 ? !fromLoad : !E().opened)) { E().opened = true; await play((SN.coldOpen || coldOpen)()); await D.slate(SN.slate); }
    if (fromLoad && n > 1) await D.recap(n);
    if (E().b === 0 || fromLoad) await D.titleCard(n);
    g.paused = false;
    // the people of later episodes wait out of sight
    SN.gate?.(n, E().b);
    if (SEASON === 1 && n >= 4 && n < 6) kilnSmoke.on = n === 4;
    if (n === 6 && D.bossLine) BOSS.intro = { ...BOSS.intro, text: E().dawn === 'late' ? BOSS.intro.text : D.bossLine() };
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
    const n = E().n; g.ui.quest([{ text: `${t('Episode')} ${t(NUM[n])} · ${t(SN.EPISODES[n].title)}`, on: true, done: false }]);
  };
  const prevTrack = g.trackTarget;
  g.trackTarget = (...a) => D.target() || (live() ? null : prevTrack?.(...a));

  async function step() {
    if (!introDone) { busy = true; const e0 = E(); try { await intro(false); } finally { if (E() === e0) introDone = true; busy = false; } return; }
    const B = beat();
    if (!B) { endEpisode(); return; }
    if (cur !== B) { cur = B; B.enter?.(); g.refreshTracker?.(); }
    // the people of the episode come out as their beat arrives
    SN.gate?.(E().n, E().b);
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
    if (!p[KEY]) p[KEY] = (SN.fromSave || fromSave)();
    if (p[KEY].n === 1) p[KEY].b = 0; // the first episode is played through in one sitting
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
    // a black hold left by a cliffhanger never outlives its title card
    if (D.chained && !busy && performance.now() - (D.chainT || 0) > 9000) { D.chained = false; hide(); }
    if (!live()) return;
    if (E().n < 6 && !g.bossActive) g.bossSpawned = true; // Bardanes waits for the last episode
    if (busy || !g.started || g.cinematic || g.paused || p.dead || g.ui.dialogOpen || !g.director) return;
    if (jumpTo) { (SN.jump || doJump)(jumpTo); introDone = false; cur = null; jumpTo = 0; return; }
    step();
  };
  // a chronicle continued from a save outside the episodes still has its gate and troops set
  applyZones();
  return D;
}
