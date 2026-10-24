// Title, tournament cups/ladder, critter select, VS splash, results and pause overlays.
import { buzz } from './haptics.js';
import { CRITTERS, TYPES, CUPS, ISLE_CUPS, ALL_CUPS, cupById, SHINY, BADGES, MODS, STARTERS, skinned, withGear, gearFor, GEAR, dailyChallenge } from './data.js';
import { sfx, playMusic } from './audio.js';
import { HAZARDS, SIGS } from './hazards.js';
import { Camp } from './camp.js';
import { save, persist, grantXp, unlock, xpNeeded } from './save.js';
import { grown, stageFor, FORMS, GROW_LV } from './growth.js';
import { openSettings, typeSpeed } from './settings.js';
import { DUMMY, moveList } from './training.js';
import { PhotoMode } from './photo.js';
import { SHOP_HATS } from './critters.js';
import { World, newAdventure, gullFish, heroDef, traderTown, digLeft, alphaToday, FISH, pumpkinNights, halloween, twinkleWeek, isAutumn, isSpring, isSummer, isWinter, isFrost, isMeadow, isEarlyAutumn, LANDMARKS, albumGet, derbyOf, SEASON_FISH, seasonKey } from './world.js';
import { storyIntro, storyStep, storyTalk, doorAction, nextGoal, favourLine, favourList, gauntletWeek, wearHats, countUp, towerRank, TOWER_RANKS, MASTERS, gauntletFoes } from './story.js';
import { MAPS } from './worldmaps.js';
import { CONSTELLATIONS, BOTTLE_NOTES } from './stars.js';

// trainers and story foes meet the hero partway: an over-levelled hero still gets a fight (the foe climbs
// halfway to the hero's level), and an under-levelled one is never more than 3 levels behind
export const storyLevel = (fixed, hero) => Math.min(hero > fixed ? Math.round((fixed + hero - 1) / 2) : fixed, hero + 3);

// Town Map layout (an SVG of Clashara): node positions, the cup in each town, and where a flight lands (outside the Berry Center)
const WMAP = {
  village: { x: 52, y: 214, fly: [4, 6] }, route1: { x: 52, y: 160 }, bloom: { x: 52, y: 100, cup: 'sprout', fly: [18, 6] },
  route2: { x: 118, y: 100 }, seashell: { x: 188, y: 100, cup: 'thunder', fly: [18, 5] }, glowwood: { x: 188, y: 46, ly: -12 },
  glowcap: { x: 262, y: 46, cup: 'grove', fly: [18, 5] }, cinder: { x: 318, y: 82 }, ember: { x: 352, y: 128, cup: 'champion', fly: [19, 12] },
  neon: { x: 340, y: 190, cup: 'midnight', fly: [22, 12] }, cloudtop: { x: 254, y: 198, cup: 'sky', fly: [19, 5] },
  frostpeak: { x: 170, y: 208, cup: 'legend', fly: [18, 5], ly: 26 }, peak: { x: 150, y: 158 },
};

// Chapter 2: the Sunscatter Isles' own Town Map (nodes appear as their maps are built)
const IMAP = {
  coral: { x: 92, y: 176, cup: 'coral', fly: [21, 6] }, palmpath: { x: 168, y: 150 },
  bluffs: { x: 236, y: 92, cup: 'gale', fly: [18, 6] }, ashtrail: { x: 290, y: 150 }, ember_isle: { x: 330, y: 196, cup: 'caldera', fly: [18, 6] },
  atoll: { x: 352, y: 60, ly: -14 },
};
const ILINKS = [['coral', 'palmpath'], ['palmpath', 'bluffs'], ['bluffs', 'ashtrail'], ['ashtrail', 'ember_isle'], ['coral', 'atoll', 1]]; // (the dashed line is the Sunny Gull's run to Starfall)
const ISLE_LAND = ['M52 206 Q40 170 70 150 Q110 138 130 160 Q150 190 120 212 Q86 228 52 206 Z', 'M140 160 Q150 120 200 100 Q236 66 268 84 Q290 104 262 130 Q232 160 176 172 Q146 176 140 160 Z',
  'M270 150 Q280 120 318 140 Q360 160 364 200 Q360 230 318 228 Q280 222 270 190 Z', 'M336 60 Q340 44 356 46 Q372 50 368 66 Q362 78 348 76 Q336 72 336 60 Z'].map((d) => `<path class="wm-land" d="${d}"/>`).join('');
const ISLE_DECOR = [['🌴', 60, 172], ['🐚', 128, 200], ['🌴', 196, 140], ['🪁', 250, 70], ['🌋', 352, 178], ['🗼', 366, 44], ['⛴️', 34, 226]];

const PROF_SVG = '<svg viewBox="0 0 64 64"><ellipse cx="32" cy="40" rx="20" ry="18" fill="#c98a4a" stroke="#2a1630" stroke-width="3"/><path d="M12 30c0-12 9-20 20-20s20 8 20 20z" fill="#7a4a2a" stroke="#2a1630" stroke-width="3"/><path d="M32 4v8" stroke="#2a1630" stroke-width="4" stroke-linecap="round"/><circle cx="25" cy="40" r="3" fill="#2a1630"/><circle cx="39" cy="40" r="3" fill="#2a1630"/><path d="M27 48q5 4 10 0" stroke="#2a1630" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="25" cy="40" r="7" fill="none" stroke="#2a1630" stroke-width="2"/><circle cx="39" cy="40" r="7" fill="none" stroke="#2a1630" stroke-width="2"/></svg>';

const STYLE_TAG = { balanced: '⚖️ Balanced', rushdown: '🔥 Aggressive', zoner: '🎯 Keeps away', turtle: '🛡️ Defensive', trickster: '🌀 Tricky' };
const ARENA_NAME = { meadow: 'Sunny Meadow', beach: 'Seashell Bay', volcano: 'Magma Crater', frost: 'Frostpeak Dome', neon: 'Neon Rooftop', sky: 'Cloudtop Gardens', grove: 'Glowcap Grove' };
const ARENA_KEYS = Object.keys(ARENA_NAME);
// Stadium Trials: one fight per hazard stadium under Stadium Mayhem, against a critter at home there
const TRIALS = [
  { arena: 'beach', foe: 'ripples' }, { arena: 'volcano', foe: 'kindlekit' }, { arena: 'frost', foe: 'pengsicle' },
  { arena: 'grove', foe: 'snoozlo' }, { arena: 'sky', foe: 'whirlwhisk' }, { arena: 'neon', foe: 'jiggawatt' },
];
const starRow = (n) => `<span class="stars">${[0, 1, 2].map((k) => `<i class="${k < n ? 'on' : ''}">★</i>`).join('')}</span>`;
const trialStars = () => TRIALS.reduce((a, t) => a + (save.trials?.[t.arena] || 0), 0);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const DIFFS = [{ name: 'Easy', v: 0.2 }, { name: 'Normal', v: 0.5 }, { name: 'Hard', v: 0.85 }];
const byId = (id) => CRITTERS.find((c) => c.id === id);

// which cup match unlocks a critter (for the locked-card hint)
const skinOf = (c) => withGear(skinned(c, save.skins?.[c.id]), save.critters?.[c.id]?.level);
const cupOfShiny = (id) => ALL_CUPS().find((cup) => cup.matches.some((m) => m.critter === id));

// badges newly satisfied by the save; marks them earned
export function newBadges() {
  save.badges ||= {};
  const out = BADGES.filter((b) => !save.badges[b.id] && b.test(save));
  for (const b of out) save.badges[b.id] = true;
  if (out.length) persist();
  return out;
}

// every cup's boss, one after another (by level)
const bossList = () => {
  const seen = new Set(), out = [];
  for (const cup of CUPS) for (const m of cup.matches) if (m.boss && !seen.has(m.name)) { seen.add(m.name); out.push({ ...m, arena: cup.arena }); }
  return out.sort((a, b) => a.level - b.level);
};

function unlockHint(id) {
  for (const cup of CUPS) for (const m of cup.matches) if (m.critter === id) return `Beat ${m.name} in the ${cup.name}`;
  if (CRITTERS.find((c) => c.id === id)?.legend) return CRITTERS.find((c) => c.id === id).mainland ? 'A legend of Clashara. Wake it after the Chapter 2 story (Adventure)' : 'A legend of the Sunscatter Isles. Find it after the Chapter 2 story (Adventure)';
  if (CRITTERS.find((c) => c.id === id)?.isle) return 'Befriend it in the Sunscatter Isles (Adventure)';
  return 'Keep battling!';
}

// in portrait, keep a bottom-anchored panel sitting just above another one, however tall that grows
function stackAbove(el, under, gap) {
  const fit = () => {
    if (!el.isConnected) { ro.disconnect(); return; }
    el.style.bottom = document.body.classList.contains('portrait') ? `${Math.round(window.innerHeight - under.getBoundingClientRect().top + gap)}px` : '';
  };
  const ro = new ResizeObserver(fit);
  ro.observe(under); ro.observe(document.body);
}

// where a beaten wild critter runs off to, by the area's battle scenery
const HOME = {
  meadow: '🌿', meadow_: 'scampers back into the grass', grove: '🍄', grove_: 'scurries off under the toadstools',
  beach: '🐚', beach_: 'scuttles back into the dunes', volcano: '🌋', volcano_: 'dashes off into the ash',
  neon: '🌃', neon_: 'zips off down a neon alley', frost: '❄️', frost_: 'slides away into the snow', sky: '☁️', sky_: 'floats off into the clouds',
};

// Adventure play time (save.adv.time, seconds the world was open): '45m', '3h 05m'
const playTime = (t) => { const m = Math.floor((t || 0) / 60); return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`; };

// the ☰ card names the season or festival, so players know the woods and towns change through the year
const seasonTag = () => twinkleWeek() ? '🎄 Twinkle Week' : halloween() ? '👻 Halloween' : pumpkinNights() ? '🎃 Pumpkin Nights' : isAutumn() ? '🍂 Autumn' : isEarlyAutumn() ? '🍃 Early autumn'
  : isFrost() || isWinter() ? '❄️ Winter' : isSpring() ? '🌸 Blossom' : isMeadow() ? '🌼 Wildflowers' : isSummer() ? '🌻 Summer' : '';

export class Screens {
  constructor(game) {
    this.game = game;
    this.root = document.createElement('div');
    this.root.className = 'screens';
    game.ui.appendChild(this.root);
    this.mode = null;
    this.t = 0;
    this.sel = 0;
    this.diff = 1;
    this.ctx = { kind: 'quick' };
    // scrollable panels fade out at the bottom while there's more to read
    const SCROLLERS = '.dex-info, .modal, .move-list, .dex-list';
    const mark = (el) => el.classList.toggle('more', el.scrollHeight - el.scrollTop - el.clientHeight > 6);
    const sweep = () => this.root.querySelectorAll(SCROLLERS).forEach(mark);
    new MutationObserver(() => requestAnimationFrame(sweep)).observe(this.root, { childList: true, subtree: true });
    this.root.addEventListener('scroll', (e) => { if (e.target.matches?.(SCROLLERS)) mark(e.target); }, true);
    addEventListener('resize', () => { sweep(); if (this.mode === 'results') this.fitResults(); });
  }

  hideAll() { this.root.innerHTML = ''; this.mode = null; }

  onAudioUnlocked() {
    if (['title', 'select', 'cups', 'ladder', 'dex'].includes(this.mode)) playMusic('menu');
  }

  btn(label, cls, fn) {
    const b = document.createElement('button');
    b.className = 'btn ' + cls;
    b.innerHTML = label;
    b.addEventListener('click', (e) => { e.stopPropagation(); sfx.ui('ok'); buzz('light'); fn(); });
    return b;
  }

  // ---------- title ----------
  title() {
    const g = this.game;
    if (!save.trainer?.name && !g.autoplay) { this.welcome(); return; }
    g.endBattle();
    // the title backdrop moves to the newest stadium the player has reached
    const open = CUPS.filter((c) => !c.requires || save.cups[c.requires]);
    g.setArena(g.autoplay ? 'meadow' : open[open.length - 1].arena);
    this.mode = 'title';
    this.t = 0;
    this.backFn = null;
    g.setShowcase(CRITTERS.filter((c) => save.unlocked.includes(c.id)).map(skinOf), 'line');
    const trophies = CUPS.filter((c) => save.cups[c.id]).length;
    this.root.innerHTML = `
      <div class="title-screen">
        <div class="logo">
          <div class="logo-top">CRITTER</div>
          <div class="logo-bot">CLASH!</div>
          <div class="logo-sub">Tiny critters. Huge bonks.</div>
        </div>
        <div class="title-menu"></div>
        <div class="title-foot"><span>🧢 ${save.trainer.name}</span><span>Team ${save.unlocked.length}/${CRITTERS.length}</span><span>🏆 ${trophies}/${CUPS.length}</span>${trophies === CUPS.length ? '<span class="master">🌟 Critter Master</span>' : ''}</div>
      </div>`;
    const m = this.root.querySelector('.title-menu');
    // the two main modes share a row in landscape and stack on narrow portrait screens
    const main = document.createElement('div');
    main.className = 'title-main';
    const advSub = () => { const k = save.adv.map?.startsWith('in:') ? save.adv.map.split(':')[1] : save.adv.map, cups = CUPS.filter((c) => save.adv.flags?.['cup_' + c.id]).length; return `${pumpkinNights() ? '🎃 ' : twinkleWeek() ? '🎄 ' : ''}${MAPS[k]?.name || ''} · 🏆${cups}/7 · 🗺️${this.recordsPc()}%`; };
    main.append(this.btn(save.adv ? `Adventure <small>${advSub()}</small>` : 'Adventure <small>NEW!</small>', 'primary big', () => this.adventure()), this.btn('Tournament', 'big', () => this.cups()));
    m.appendChild(main);
    const row = document.createElement('div');
    row.className = 'row';
    row.appendChild(this.btn('Quick Battle', '', () => { this.ctx = { kind: 'quick' }; this.select(); }));
    row.appendChild(this.btn('Challenges', '', () => this.challenges()));
    row.appendChild(this.btn('Critterdex', '', () => this.dex()));
    const campBtn = this.btn('Camp', '', () => this.camp());
    // a dot when there's something to do: unclaimed daily gift, berries to feed, or someone not yet petted today
    const day = new Date().toISOString().slice(0, 10);
    if (save.giftDay !== day || save.berries > 0 || save.unlocked.some((id) => save.petDay?.[id] !== day)) campBtn.classList.add('dot');
    row.appendChild(campBtn);
    row.appendChild(this.btn('How to Play', 'ghost', () => this.howTo()));
    m.appendChild(row);
    const gear = this.btn('<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.4 3.5c0-.5 0-1-.1-1.4l2-1.6-2-3.4-2.4 1a8 8 0 0 0-2.4-1.4L15 2.6h-4l-.4 2.6A8 8 0 0 0 8.2 6.6l-2.4-1-2 3.4 2 1.6a8 8 0 0 0 0 2.8l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 2.4 1.4l.4 2.6h4l.4-2.6a8 8 0 0 0 2.4-1.4l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.4z"/></svg>', 'icon-btn gear', () => openSettings(g, this.root));
    gear.setAttribute('aria-label', 'Settings');
    this.root.querySelector('.title-screen').appendChild(gear);
    playMusic('menu');
    // news for returning trainers: new critters turned up in cups they may already have cleared
    const twk = 'twinkle' + (new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()); // one greeting per festival
    if (!g.autoplay && twinkleWeek() && save.adv?.flags?.quest && !save.news?.includes(twk)) {
      (save.news ||= []).push(twk); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, Happy Twinkle Week! Every town in Clashara has put up a tree by its Berry Center. Look underneath: there's a little gift for you each day!",
        "Snow falls over the green towns in the evenings, and on New Year's Eve there are fireworks over every rooftop. Wrap up warm!",
      ]), 600);
    } else if (!g.autoplay && save.stats.battles >= 3 && !save.adv && !save.news?.includes('adventure')) {
      (save.news ||= []).push('adventure'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}! Big news: the whole land of Clashara is open to explore. Tap ADVENTURE on the title screen!",
        "Pick a hero, walk from town to town, battle wild critters in the tall grass, take on the seven stadium cups and face the trials on the road to the Critter Crown. I'll be waiting outside my lab!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && !save.news?.includes('adv2')) {
      (save.news ||= []).push('adv2'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, news from Clashara! Every house and Berry Center now has its door open: pop in and say hello. And the ☰ menu has a Town Map: tap any town you've visited to fly straight there.",
        "Push the stick all the way to run. Keep an eye out for hidden 🎁 gift boxes, and for sparkly shiny critters in the grass: beat one to unlock its shiny colours!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv2') && !save.news.includes('adv3')) {
      save.news.push('adv3'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, Clashara has weather now! Rain showers roll over the routes some afternoons: water critters love to come out and play in the tall grass, and the townsfolk pop their umbrellas open.",
        "Evenings glow gold and nights are starry, all on your phone's clock. And got spare berries? The blender in any Berry Center makes a smoothie that helps your hero grow!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv3') && !save.news.includes('adv4')) {
      save.news.push('adv4'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, more news from Clashara! Every stadium now has a lobby: sign up at the front desk, admire the line-up posters, and watch the trophy cases fill up as you win.",
        "Shake the berry bushes by the trees for free berries each day, spend them at the new Hat Shop in Bloom Town, and ask Fisher Finn in Seashell Town about fishing!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv4') && !save.news.includes('adv5')) {
      save.news.push('adv5'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, the townsfolk of Clashara need you! Look for a ❗ over someone's head: they've lost something, and they'll thank you with berries or a one-of-a-kind hat. Your new 📔 Journal in the ☰ menu keeps track, and the Town Map shows where to look.",
        "Also: sparkly X marks turn up on the beaches each day (dig!), and the Journal keeps a fish album of every kind you've caught. Win a cup, then pop into that stadium's lobby. They've got something for you!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv5') && !save.news.includes('adv6')) {
      save.news.push('adv6'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, Clashara keeps growing! Some townsfolk now need a parcel carried to another town. Deliver it, and the one you bring it to will thank you. Look for a ❗, then a ❓ over whoever is waiting.",
        "Frostpeak has a glinting X in the snow each day: dig for ice gems! And stay up late in the snowy towns. On clear nights an aurora ripples over the mountains, and shooting stars fly over Cloudtop.",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv6') && !save.news.includes('adv7')) {
      save.news.push('adv7'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, news from the south! Cinder Town has a warm glowing X in the ash each day. Dig there for ember gems! And the volcano towns now go dark at night, with the magma glowing bright.",
        "Neon City's Tinker Volt has a parcel for someone, too. And if you're in Seashell Town after dusk, there's a bonfire on the beach. Bring marshmallows!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv7') && !save.news.includes('adv8')) {
      save.news.push('adv8'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, Neon City has a noodle cart now! Chef Rumi serves one bowl of fizzy spark noodles a day, and the arcade cabinets finally work. Score well in CRITTER CLASH TURBO and they pay out in berries!",
        "The Town Map shows a ⛏️ wherever a dig spot is waiting today. And a warning: two Ace Trainers now guard the foot of Champion's Peak, and the toughest wild critters in Clashara live in the snow grass there.",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv8') && !save.news.includes('adv9')) {
      save.news.push('adv9'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, the Neon arcade has a second game! The blue cabinets play SKY HOP: tap to flap through the neon pillars. And Milliner Mo put a dressing mirror in the Hat Shop, so you can try on every hat you own.",
        "Big news for Champions: Keeper Orla runs the Peak Gauntlet on the summit. Five Ace battles, a new line-up every Monday, and a Golden Laurel for your first clear. Glowcap and Neon City now get dark at night, too. Bring a lantern!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv9') && !save.news.includes('adv10')) {
      save.news.push('adv10'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, Clashara has a night life! After dark, DJ Tumble spins records on Neon City's plaza: step onto the light-up floor and dance. Frostpeak lights ice lanterns around the frozen pond, and Skater Ivy skates there under the aurora.",
        "Anglers, listen up: some fish only bite at night. Moonfins swim in any water after dark, and some say there's a Glimmer Ray too. Champions: each week's Peak Gauntlet now has a type theme. And you can change hats any time from ☰ → 🎩 Hats!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv10') && !save.news.includes('adv11')) {
      save.news.push('adv11'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, look up! Grandpa's old telescope stands by the trees in Sprout Village. A different critter constellation rises each night: eight in all. Bloom Town sets off fireworks on Friday, Saturday and Sunday nights, too!",
        "Cloudtop Gardens has a wishing fountain now (one berry, one wish, once a day), and Skater Ivy lends out skates on Frostpeak's pond after dark. Your Journal has a new 📅 Today page that lists everything you can do each day.",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv11') && !save.news.includes('adv12')) {
      save.news.push('adv12'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, a song in the woods! Glowcap Hollow's fairy ring sings after dark: listen to the toadstools, then tap their tune back. And Cinder Town's hot spring is finally open. One good soak a day, Pengsicle's orders!",
        "Stargazers, a ninth constellation has turned up: The Toadstool. Out on the routes, wooden lanterns light the paths at night. And the red number on your ☰ button counts the Journal's 📅 Today things still to do.",
        ...(pumpkinNights() ? ["It's Pumpkin Nights, too! Carved pumpkins sit by the town doors until early November. After dark they glow, and one of them hides a treat each night. Boo!"] : []),
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv12') && !save.news.includes('adv13')) {
      save.news.push('adv13'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, say cheese! Every town has a landmark worth a picture. Stand near one and take a 📸 Photo from the ☰ menu. Snap all eight for my Journal and I'll send you a Shutterbug Cap!",
        "Your ☰ card now shows how much of Clashara you've explored. Every quarter of the way earns berries, and at 100%... well. Sprout Village has a spot saved for something golden.",
        ...(pumpkinNights() ? ["Pumpkin Nights news: jack-o'-lanterns light the path through Glowcap Woods after dark, and five little wisps float about. Catch them all for a treat! The wild critters have dressed up too. Very spooky. Very cute."] : []),
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv13') && !save.news.includes('adv14')) {
      save.news.push('adv14'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, fresh from the coast: Seashell Town has a driftwood bench right on the beach. Sit there in the golden evening and watch the sun melt into the sea. Fisher Finn says it's the best view in Clashara!",
        "And up in Frostpeak, snow is falling! Snowball Kid Kip built a snow fort by the path. Hit twelve snowmen in Snowball Toss and Kip shares a berry stash. Just... don't hit Kip.",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv14') && !save.news.includes('adv15')) {
      save.news.push('adv15'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, Gardener Bea has opened a little garden plot in Bloom Town. Plant a seed, water it every day, and on the fourth day... well, you'll see. Bea says the first bloom comes with a surprise!",
        "Out on Route 1, butterflies are dancing over the grass on sunny days. And on Cinder Road, a steam geyser has woken up. Stand on the vent if you're brave! Glowcap Woods' big golden fireflies come out every night, too.",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv15') && !save.news.includes('adv16')) {
      save.news.push('adv16'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, Fisher Finn has started a weekly FISHING DERBY! Every Monday he names a fish and a size to beat. Land one and his prize is yours, and the first winner gets his spare hat.",
        "Your Journal keeps a photo album now: snap a 📸 Photo by any landmark and it's pinned in Records. And on Route 2's bridge, face the river for a twig race. Pick a twig and cheer it on!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv16') && !save.news.includes('adv17')) {
      save.news.push('adv17'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, every Berry Center has a CRITTER DAYCARE now! Nanny Nell looks after one critter from your team while you explore.",
        "Every step you walk helps it grow, up to two whole levels. Pick it up again at any Berry Center. Out on the routes, the tall grass has grown a little wilder, too!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv17') && !save.news.includes('adv18')) {
      save.news.push('adv18'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, the strangest thing! Nanny Nell says EGGS keep turning up at her Daycare when a critter stays a good long while.",
        "Carry one with you and it hatches as you walk. The babies grow up in her nursery, and the first one comes with a little keepsake. Your Journal's Today page tells you when an egg is waiting!",
        "One more thing: some showers have turned into THUNDERSTORMS. Spark critters love them! Keep your umbrella handy, and listen for the thunder.",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv18') && !save.news.includes('adv19')) {
      save.news.push('adv19'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, news from Nanny Nell! Three days after they hatch, the Daycare babies are all grown up, and they want to live with YOU. Look for them at home in Sprout Village!",
        "They're always finding little presents in the garden. And have you noticed? After dark, every town hums its tune a little softer, like a lullaby.",
        "Night owls are out after dark, too: Hootsy and Squeakwing roam the tall grass on every route. Bring a lantern!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv19') && !save.news.includes('adv20')) {
      save.news.push('adv20'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}! Your grown-up Daycare babies keep staring at the front door. Ask one at home, and it'll come along for a walk!",
        "And listen in the golden evenings: the town tunes slow down and go all warm and mellow before the night lullabies start.",
        "Oh, and your Journal Records now count the night owls you meet. Hoo-hoo!",
        "Never up after dark? Your bed at home can sleep you right through to the evening, the night or the next morning.",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv20') && !save.news.includes('adv21')) {
      save.news.push('adv21'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        pumpkinNights() ? "{name}! It's Pumpkin Nights, and after dark the townsfolk are all in costume! Walk up and say \"trick or treat\". Six of them a night have a candy berry for you." : "{name}! Every Pumpkin Night from now on, the townsfolk will dress up after dark. Say \"trick or treat\" and they'll share a candy berry!",
        "Your ☰ Photo got better, too: your walking buddy steps up beside you for the shot. Smile!",
        "Autumn's here, too! Fallen leaves pile up by the trees in the green towns and routes. Run right through one. Wheee!",
        "And in Twinkle Week, an evening shower comes down as real snow over the green towns. Bring a scarf!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv21') && !save.news.includes('adv22')) {
      save.news.push('adv22'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}! I've been practising my singing. When Twinkle Week comes round, the townsfolk will sing carols with you after dark, and six a night share a mug of cocoa and a berry!",
        "And deep in the glowing woods, the glowcaps now light your way at any hour. No more bumping into toadstools!",
        "Oh, and the grown-up forms tie their level-up scarves properly now. Very smart. Very dashing.",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv22') && !save.news.includes('adv23')) {
      save.news.push('adv23'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}! Have you seen the trees? From October to mid-November the woods in the green towns turn orange, gold and red. My favourite time of year!",
        pumpkinNights() ? "And for Pumpkin Nights, every Berry Center has a scarecrow on the hay bales, and there are jack-o'-lanterns indoors too. Give the scarecrow a poke. It's friendly!" : "Every Pumpkin Nights, a scarecrow keeps watch by each Berry Center, and jack-o'-lanterns light up the rooms. In Twinkle Week, little trees twinkle indoors too!",
        "Listen closely to the town music, too: sleigh bells in Twinkle Week, and something spooky going 'oooo' on Pumpkin Nights...",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv23') && !save.news.includes('adv24')) {
      save.news.push('adv24'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, a little nature report! The autumn woods now turn in drifts: whole groves go gold or red together, with a few trees only just turning.",
        "And once the leaves are down, from mid-November until Twinkle Week, early mornings bring a white frost. The grass crunches, the treetops sparkle, and you can see your breath!",
        "Oh, and that crow on the scarecrow? It has opinions. Very loud ones. Caw!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv24') && !save.news.includes('adv25')) {
      save.news.push('adv25'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, I've been keeping a nature diary all year round! In spring, from late March through April, the trees along the routes blossom pink and white, and petals drift on the breeze.",
        "Then from midsummer to the end of August, sunflowers taller than you stand at the edge of the woods, and the cicadas buzz all afternoon.",
        "And after Twinkle Week, through January and February, winter mornings are frosty, and a shower over the green maps comes down as snow!",
        "Every season has something new out there. Come and look!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv25') && !save.news.includes('adv26')) {
      save.news.push('adv26'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, Fisher Finn tells me some fish only visit Clashara in one season: a Blossom Koi in spring, a Sunburst Perch in summer, a Maple Trout in autumn and a Snowflake Smelt in winter!",
        "They bite in any water but lava. The Journal keeps them in their own little list, and the 📅 Today page reminds you while the season's fish is still out there.",
        "And listen to the townsfolk, too. They love to chat about the blossom, the sunflowers, the falling leaves and the snow.",
        "Two more seasonal treats: on spring days Bea leaves a picnic by the Route 1 pond, on summer days Finn leaves a watermelon on Seashell beach (whack it open!), and on winter days you can roll a snow critter in Sprout Village.",
        "Oh, and two more townsfolk have parcels that need carrying: Surfer Pengsicle in Seashell Town and Elder Oakley in Glowcap Hollow. Look for the ❗!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.quest && save.news?.includes('adv26') && !save.news.includes('adv27')) {
      save.news.push('adv27'); persist();
      const champ = !!save.adv.flags.ending;
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}! Big news from across the sea: six critters nobody on the mainland has ever seen, from the Sunscatter Isles!",
        "Smokeshell lives in a tiny volcano, Blowfin puffs up into a spiky ball, Mossloth grows a garden on its back, Toucharge keeps lightning in its beak, Pumicub floats, and Skimray rides the trade winds.",
        champ ? "And you're the Champion, so the Sunny Gull ferry will take you there! Find Captain Gill on the pier in Seashell Town. Three new cups are waiting." : "Only Champions can catch the ferry out there, though. Win the Crown, then look for Captain Gill on the pier in Seashell Town!",
        "You can already try all six in Quick Battle. They're on the end of the critter list!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.isle_arrive && save.news?.includes('adv27') && !save.news.includes('adv28')) {
      save.news.push('adv28'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}! Captain Gill sent me a postcard from the isles. The rope bridge on Palm Path is fixed: Breezy Bluffs is open, windmills, kites and the Gale Cup!",
        "Past the Bluffs, the Ash Trail steams its way down to Ember Isle, where the Caldera Cup sits inside a sleepy volcano. Black sand beaches! I must see them.",
        "And those Gloom Gulls... they say Captain Morra is hiding the Sunstone on Starfall Atoll. Win all three island cups and Captain Gill will sail you there.",
        "Oh, and Fisher Finn says the island reefs have four fish of their own. One of them is a marlin as long as a canoe!",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.sunstone && save.news?.includes('adv28') && !save.news.includes('adv29')) {
      save.news.push('adv29'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}! The light on Starfall Atoll is back, and Captain Morra has... opened a BATTLE TOWER in the old Gloom Gull hideout? Win in a row for Bronze, Silver, Gold and Legend ranks!",
        "Kitemaker Hana on Breezy Bluffs is building a glider you can ride. She needs help from Kite Flyer Gale and Tinker Volt on the mainland. Updrafts could carry you somewhere nobody has been!",
        "And the islanders whisper of two legends: a golden moth that carries the dawn, and a narwhal that sings to the moon. Some people say pearls hide on every island, too. They only twinkle when you're close...",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.sunstone && save.news?.includes('adv29') && !save.news.includes('adv30') && ((save.adv.tower?.best || 0) >= 7 || save.adv.flags.glider || save.adv.flags.legend_solmoth || save.adv.flags.legend_moonwhal)) {
      save.news.push('adv30'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}! Dash called me from Starfall Atoll. He's been training on that beach every single day, and he wants one last battle at full strength. He sounded very serious. Then he sneezed.",
        "Kite Flyer Gale says a windsock has gone up at the east edge of Cloudtop Gardens, pointing straight at the sky. With Hana's glider... who knows where that wind goes?",
        "Your Journal has a new 🏆 Champ page, too: your Battle Tower ranks, this week's Sunscatter Masters and Peak Gauntlet, and the island legends, all in one place.",
      ]), 600);
    } else if (!g.autoplay && save.adv?.flags?.sunstone && save.news?.includes('adv30') && !save.news.includes('adv31') && (save.adv.flags.dash_show || save.adv.flags.amends1_done || save.adv.flags.legend_solmoth || save.adv.flags.legend_moonwhal)) {
      save.news.push('adv31'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}! Picker Fern sent me a glowcap from Glowcap Woods that won't glow. A whole forest going dim! I've been digging through the Grove Book ever since. Clashara may have a legend of its own...",
        "Snorkeller Pia in Port Coral says she found a shipwreck off the reef. A real one, a hundred years old! If you've helped Morra send back Pia's goggles, she'll take you diving.",
        "And the Gloom Gulls have started a FISHING club on Starfall Atoll. Petrel names a catch of the day. I'm told the club record is four boots.",
      ]), 600);
    } else if (!g.autoplay && save.stats.battles >= 1 && !save.news?.includes('grow')) {
      (save.news ||= []).push('grow'); persist();
      const already = CRITTERS.filter((c) => save.unlocked.includes(c.id) && stageFor(save.critters[c.id].level) > 1).map((c) => grown(c, save.critters[c.id].level).name);
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, I've made a discovery! Critters GROW when they get strong enough. At Lv 7, and again at Lv 14, they change into a bigger, stronger form with powered-up moves.",
        already.length ? `In fact, some of yours already have: say hello to ${already.slice(0, 3).join(', ')}${already.length > 3 ? ' and more' : ''}! Every critter grows its own way, so check the Critterdex.` : "Every critter grows its own way. Keep battling, and check the Critterdex to see how far yours have come!",
      ]), 600);
    } else if (!g.autoplay && save.cups.sprout && !save.news?.includes('tricks')) {
      (save.news ||= []).push('tricks'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "Careful out there, {name}! The stadiums have learned new tricks: fissures in the Magma Crater, ice slicks on Frostpeak, rogue waves at Seashell Bay, crosswinds over Cloudtop and spore clouds in the grove.",
        "Neon Rooftop's laser sweeps the whole floor: guard, or roll right through it! Test yourself in the new Stadium Trials, and watch out, some days the Daily Challenge is a 3-on-3!",
      ]), 600);
    } else if (!g.autoplay && (save.stats.bestStreak || 0) >= 1 && !save.news?.includes('gate')) {
      (save.news ||= []).push('gate'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, word from the Survival gauntlet: every fifth challenger is now a shiny ⭐ Gatekeeper, a little stronger than the rest.",
        "Knock one down and you'll get berries and a full heal for the road. And the Boss Rush pays out a whole berry basket now!",
      ]), 600);
    } else if (!g.autoplay && save.cups.thunder && !save.news?.includes('grove')) {
      (save.news ||= []).push('grove'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "Oh, {name}! A new league has opened deep in the mushroom woods: the Glowcap Cup.",
        "The fireflies are lovely, but watch out for the spore puffs. Achoo!",
      ]), 600);
    } else if (!g.autoplay && save.cups.thunder && !save.news?.includes('koala') && !save.unlocked.includes('snoozlo')) {
      (save.news ||= []).push('koala'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, tiptoe with me. Someone is snoring in a hammock in Glowcap Grove. That's Snoozlo, a drowsy koala!",
        "Hazel brings it to the Glowcap Cup. A word of advice: don't hit it while it naps. It hits back.",
      ]), 600);
    } else if (!g.autoplay && save.cups.thunder && !save.news?.includes('bat') && !save.unlocked.includes('squeakwing')) {
      (save.news ||= []).push('bat'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}! Something keeps knocking apples off the trees near Glowcap Grove. Meet Squeakwing, an orchard bat with a VERY loud squeak!",
        "Nyx the orchard keeper brings it to the Glowcap Cup. Cover your ears, win the match, and it might join your team.",
      ]), 600);
    } else if (!g.autoplay && save.cups.champion && !save.news?.includes('fox') && !save.unlocked.includes('kindlekit')) {
      (save.news ||= []).push('fox'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}! Did you see the fireworks over Cloudtop Gardens last night? That was Kindlekit, an ember fox kit with a campfire on its tail!",
        "Fizz the festival pyro has joined the Sky Cup with it. Win that match and Kindlekit might just join your team.",
      ]), 600);
    } else if (!g.autoplay && save.cups.champion && !save.news?.includes('jelly') && !save.unlocked.includes('jiggawatt')) {
      (save.news ||= []).push('jelly'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}! Something is glowing on the Neon Rooftop. It's Jiggawatt, a jelly sprite that crackles when it giggles!",
        "DJ Tumble brought it to the Midnight Cup as a light show. Beat them and it might drift over to your team.",
      ]), 600);
    } else if (!g.autoplay && save.news?.includes('grove') && !save.news.includes('otter') && !save.unlocked.includes('ripples')) {
      save.news.push('otter'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "News from the grove, {name}! A river otter called Ripples has been leaving puddles all over Glowcap Grove.",
        "Its trainer Brook is in the Glowcap Cup now. Beat them and Ripples might splash over to your team!",
      ]), 600);
    } else if (!g.autoplay && save.stats.battles >= 3 && !save.news?.includes('team')) {
      (save.news ||= []).push('team'); persist();
      setTimeout(() => this.mode === 'title' && this.profTalk([
        "{name}, try the new Team Battle in Challenges! Pick three critters and face a rival team of three.",
        "Whoever wins stays in, bruises and all. And Quick Battle now lets you choose your rival and the stadium!",
      ]), 600);
    } else if (!g.autoplay && save.cups.sprout && !save.news?.includes('frogmole')) {
      (save.news ||= []).push('frogmole'); persist();
      const where = [['lilypop', 'Paddy in the Thunder Cup'], ['diggles', 'Dusty in the Midnight Cup']].filter(([id]) => !save.unlocked.includes(id));
      if (where.length) setTimeout(() => this.mode === 'title' && this.profTalk([
        `Big news, {name}! Two new critters have been spotted: Lilypop, a frog with a very long tongue, and Diggles, a mole in a hard hat.`,
        `Beat ${where.map(([, w]) => w).join(' or ')} and they might just join your team!`,
      ]), 600);
    }
  }

  // ---------- first launch: the professor, a trainer name and a partner ----------
  welcome() {
    const g = this.game;
    g.endBattle();
    // the title backdrop moves to the newest stadium the player has reached
    const open = CUPS.filter((c) => !c.requires || save.cups[c.requires]);
    g.setArena(g.autoplay ? 'meadow' : open[open.length - 1].arena);
    this.mode = 'title';
    this.backFn = null;
    const starters = STARTERS.map(byId);
    g.setShowcase(starters, 'line');
    playMusic('menu');
    this.root.innerHTML = `
      <div class="welcome">
        <div class="prof">
          <div class="prof-icon">${PROF_SVG}</div>
          <div class="prof-box"><small>Professor Pecan</small><p class="prof-text"></p><div class="prof-ctrl"></div></div>
        </div>
      </div>`;
    const text = this.root.querySelector('.prof-text'), ctrl = this.root.querySelector('.prof-ctrl');
    const say = (msg, buttons) => {
      text.textContent = '';
      ctrl.innerHTML = '';
      let i = 0;
      clearInterval(this._typeT);
      const [ms, step] = typeSpeed();
      this._typeT = setInterval(() => {
        i += step; text.textContent = msg.slice(0, i);
        if (i % 3 === 0 || step > 1) sfx.ui('move');
        if (i >= msg.length) { clearInterval(this._typeT); buttons(); }
      }, ms + 4);
      text.onclick = () => { if (i < msg.length) { i = msg.length - 1; } };
    };
    const next = (label, fn) => ctrl.appendChild(this.btn(label, 'primary', fn));
    let name = '';
    const askName = () => say("First things first. What's your name, trainer?", () => {
      const inp = document.createElement('input');
      inp.className = 'name-in'; inp.maxLength = 12; inp.placeholder = 'Your name'; inp.autocomplete = 'off';
      inp.enterKeyHint = 'done';
      ctrl.appendChild(inp);
      // Android's landscape keyboard covers the screen and its Done key doesn't always send Enter,
      // so accept the name on Enter, on change (Done/blur) or on OK, and never auto-open the keyboard
      let taken = false;
      const ok = () => { if (taken) return; taken = true; name = inp.value.trim().slice(0, 12) || 'Sam'; inp.blur(); pickPartner(); };
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' || e.keyCode === 13) ok(); });
      inp.addEventListener('change', () => { if (inp.value.trim()) ok(); });
      next('OK!', ok);
      if (!document.body.classList.contains('is-touch')) setTimeout(() => inp.focus(), 50);
    });
    const pickPartner = () => say(`Nice to meet you, ${name}! These three are looking for a partner. Who will it be?`, () => {
      const row = document.createElement('div');
      row.className = 'partner-row';
      starters.forEach((c, k) => {
        const b = document.createElement('button');
        b.className = 'pcard';
        b.style.setProperty('--tc', TYPES[c.type].color);
        b.innerHTML = `<img src="${g.portrait(c)}" alt=""><b>${c.name}</b><small>${TYPES[c.type].name} type</small>`;
        b.addEventListener('click', () => {
          sfx.voice(c.voice, 'win');
          g.showcase.forEach((sc, j) => { sc.cheer = j === k ? 1.5 : 0; });
          confirm(c);
        });
        row.appendChild(b);
      });
      ctrl.appendChild(row);
    });
    const confirm = (c) => say(`${c.name}! ${c.blurb} Is that your partner?`, () => {
      next('Yes!', () => done(c));
      ctrl.appendChild(this.btn('Let me think', 'ghost', pickPartner));
    });
    const done = (c) => {
      save.trainer = { name, partner: c.id };
      save.critters[c.id].level = Math.max(save.critters[c.id].level, 2);
      persist();
      this.sel = CRITTERS.indexOf(c);
      sfx.jingle(3); sfx.cheer(1);
      say(`${c.name} is now your partner! The other two want to tag along too. Now go win some trophies, ${name}!`, () => next("Let's go!", () => this.title()));
    };
    say('Welcome to Critter Clash! I study the bonkiest critters in the world, and I could use a trainer like you.', () => next('Next', askName));
  }

  howTo() {
    const d = document.createElement('div');
    d.className = 'modal-wrap';
    d.innerHTML = `<div class="modal"><h2>How to Play</h2>
      <ul class="howto">
        <li><b>Move</b><span>Left thumb anywhere on the left side · WASD / arrows · stick</span></li>
        <li><b>Attack</b><span>Tap for a 3-hit combo; the third hit launches · J / Space</span></li>
        <li><b>Special</b><span>Your critter's signature move, on a cooldown · K</span></li>
        <li><b>Dodge</b><span>Quick roll with invincibility; dodge at the last moment for bonus Super · L / Shift</span></li>
        <li><b>Guard</b><span>Hold to raise a shield bubble that blocks most damage. Raise it right as a hit lands to PARRY and stagger the attacker · O</span></li>
        <li><b>Power-ups</b><span>Berries heal, stars charge your Super, shoes give a speed burst. Grab them before your rival does!</span></li>
        <li><b>Super</b><span>Fills as you trade hits. When it glows, unleash it! · I</span></li>
        <li><b>Types</b><span>Each type beats two others (Blaze burns Sprout, Splash douses Blaze, Pebble grounds Zap...). Hitting a weakness deals extra damage.</span></li>
        <li><b>Dizzy</b><span>Too many hits in a row makes a critter see stars. Mash buttons to shake it off!</span></li>
        <li><b>Hazards</b><span>Later stadiums fight back: when a glowing ring appears on the floor, get out of it (or guard)! Each one has a second trick too: fissures, ice slicks, lasers (guard or roll through), rogue waves, crosswinds and spore clouds. Practise them in Training with the ⚠ Hazards chip, earn stars in the Stadium Trials (Challenges), or switch hazards off in Settings.</span></li>
        <li><b>Adventure</b><span>Walk your hero across Clashara with the stick or WASD; push the stick all the way (or hold Shift) to run. Press A to talk, read signs and open doors. Tall grass hides wild critters, trainers battle you on sight, and each town's stadium holds a cup. The ☰ menu has a Town Map: tap a town you've visited to fly back to it. Hunt for hidden 🎁 gift boxes and rare sparkly shiny critters!</span></li>
        <li><b>Team Battle</b><span>In Challenges: pick three critters against a rival team of three. The winner of each fight stays in with the damage it took.</span></li>
        <li><b>Survival</b><span>Fight until you fall; damage carries over. Every 5th rival is a shiny ⭐ Gatekeeper: beat it for berries and a full heal. Clearing the Boss Rush pays a berry basket too.</span></li>
        <li><b>Daily</b><span>A new Daily Challenge every day for double XP; some days it's a 3-on-3 team fight. Clear it on back-to-back days for a streak: up to +5 berries a day.</span></li>
        <li><b>Counters</b><span>A napping Snoozlo is a trap: hit it and it wakes up swinging. Wait it out, then pounce while it yawns.</span></li>
        <li><b>Camp</b><span>Pet your critters to build friendship and feed them berries for XP. Win battles to earn berries, and drop by daily for a gift. Best friends (5 hearts) start every battle with some super meter.</span></li>
        <li><b>Growing</b><span>At Lv 7 and Lv 14 a critter grows into a new form: bigger, tougher, with stronger specials and supers. Rivals grow too!</span></li>
        <li><b>Settings</b><span>Make the touch buttons bigger or smaller, switch battle tips off (or back on to replay them), and pause any fight to Restart it.</span></li>
      </ul></div>`;
    const close = this.btn('Got it!', 'primary', () => d.remove());
    d.querySelector('.modal').appendChild(close);
    d.addEventListener('click', (e) => { if (e.target === d) d.remove(); });
    this.root.appendChild(d);
  }

  header(title, back) {
    const h = document.createElement('div');
    h.className = 'sel-head';
    h.innerHTML = `<button class="icon-btn back" aria-label="Back">‹</button><h1>${title}</h1>`;
    h.querySelector('.back').addEventListener('click', () => { sfx.ui('back'); back(); });
    this.backFn = back;
    return h;
  }

  // ---------- tournament cups ----------
  cups() {
    const g = this.game;
    g.endBattle();
    this.mode = 'cups';
    g.setShowcase([]);
    this.root.innerHTML = '<div class="cups-screen"><div class="cup-list"></div></div>';
    const S = this.root.firstElementChild;
    S.prepend(this.header('Tournament', () => this.title()));
    const list = S.querySelector('.cup-list');
    CUPS.forEach((cup) => {
      const locked = cup.requires && !save.cups[cup.requires];
      const done = save.cups[cup.id];
      const b = document.createElement('button');
      b.className = 'cup' + (locked ? ' locked' : '') + (done ? ' done' : '');
      b.style.setProperty('--tc', cup.color);
      b.innerHTML = `
        <div class="cup-trophy">${done ? '🏆' : locked ? '🔒' : '★'}</div>
        <h2>${cup.name}</h2>
        <p>${locked ? 'Clear the ' + CUPS.find((c) => c.id === cup.requires).name + ' to enter.' : cup.desc}</p>
        <div class="cup-foes">${cup.matches.map((m) => `<img src="${g.portrait(skinned(byId(m.critter), m.skin))}" alt="">`).join('')}</div>
        <div class="cup-meta">${cup.matches.length} battles · Lv ${cup.matches[0].level}–${cup.matches[cup.matches.length - 1].level}</div>`;
      b.addEventListener('click', () => {
        if (locked) { sfx.ui('back'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
        sfx.ui('ok');
        this.ctx = { kind: 'cup', cup, idx: 0 };
        this.select();
      });
      list.appendChild(b);
    });
  }

  // ---------- critter select ----------
  select() {
    const g = this.game;
    this.mode = 'select';
    this.t = 0;
    // Quick Battle and Training let you try any critter; the Tournament and challenges use your team
    const free = this.ctx.kind === 'quick' || this.ctx.kind === 'training';
    const playable = (c) => free || save.unlocked.includes(c.id);
    this.free = free;
    if (!playable(CRITTERS[this.sel])) this.sel = CRITTERS.findIndex((c) => save.unlocked.includes(c.id));
    const cup = this.ctx.kind === 'cup';
    if (cup && !g.autoplay) g.setArena(this.ctx.cup.arena);
    const chal = this.ctx.kind === 'survival' || this.ctx.kind === 'daily' || this.ctx.kind === 'training' || this.ctx.kind === 'bossrush' || this.ctx.kind === 'team' || this.ctx.kind === 'trials';
    const badge = cup ? `<div class="cup-badge" style="--tc:${this.ctx.cup.color}">${this.ctx.cup.name}</div>`
      : chal ? `<div class="cup-badge" style="--tc:${{ daily: '#3dc8ff', survival: '#ff7a3d', training: '#7ad36b', bossrush: '#ffb020', trials: '#ff8a3d', team: this.ctx.daily ? '#3dc8ff' : '#c86bff' }[this.ctx.kind]}">${{ daily: 'Daily Challenge', survival: 'Survival', training: 'Training', bossrush: 'Boss Rush', trials: `Trial · ${ARENA_NAME[this.ctx.arena]}`, team: this.ctx.daily ? 'Daily Team Challenge' : 'Team Battle' }[this.ctx.kind]}</div>` : '<div class="diff"></div>';
    this.root.innerHTML = `
      <div class="select-screen">
        <div class="sel-info"></div>
        <div class="sel-arrows"><button class="arrow l" aria-label="Previous">‹</button><button class="arrow r" aria-label="Next">›</button></div>
        <div class="sel-bottom">
          <div class="roster"></div>
          <div class="sel-actions">
            ${badge}
            <div class="go"></div>
          </div>
        </div>
      </div>`;
    const R = this.root;
    R.firstElementChild.prepend(this.header('Choose your Critter', () => (cup ? this.cups() : chal ? this.challenges() : this.title())));
    const step = (d) => {
      let i = this.sel;
      for (let k = 0; k < CRITTERS.length; k++) { i = (i + d + CRITTERS.length) % CRITTERS.length; if (playable(CRITTERS[i])) break; }
      this.pick(i);
    };
    R.querySelector('.arrow.l').addEventListener('click', () => step(-1));
    R.querySelector('.arrow.r').addEventListener('click', () => step(1));
    stackAbove(R.querySelector('.sel-info'), R.querySelector('.sel-bottom'), 14);
    const roster = R.querySelector('.roster');
    CRITTERS.forEach((c, i) => {
      const trial = !save.unlocked.includes(c.id) && free, locked = !playable(c);
      const b = document.createElement('button');
      b.className = 'rcard' + (locked ? ' locked' : '') + (trial ? ' trial' : '');
      b.style.setProperty('--tc', TYPES[c.type].color);
      const gc = locked ? c : grown(c, save.critters[c.id].level); // grown critters show their current form
      b.innerHTML = `<img src="${g.portrait(gc)}" alt=""><span>${save.trainer?.partner === c.id ? '♥ ' : ''}${locked ? '???' : gc.name}</span>${locked ? '<em>🔒</em>' : trial ? '<i>TRY</i>' : `<i>Lv${save.critters[c.id].level}</i>`}`;
      b.addEventListener('click', () => {
        if (locked) { sfx.ui('back'); this.toast(unlockHint(c.id)); return; }
        this.pick(i);
      });
      roster.appendChild(b);
    });
    const diff = R.querySelector('.diff');
    if (diff) DIFFS.forEach((d, i) => {
      const b = document.createElement('button');
      b.className = 'chip' + (i === this.diff ? ' on' : '');
      b.textContent = d.name;
      b.addEventListener('click', () => { this.diff = i; sfx.ui('move'); diff.querySelectorAll('.chip').forEach((x, k) => x.classList.toggle('on', k === i)); });
      diff.appendChild(b);
    });
    const train = this.ctx.kind === 'training';
    const go = () => (cup ? this.ladder() : train ? this.training() : this.ctx.kind === 'quick' ? this.matchSheet(false) : this.ctx.kind === 'team' ? this.teamSheet() : this.vs());
    R.querySelector('.go').appendChild(this.btn(cup ? 'GO!' : train ? 'PRACTICE!' : 'FIGHT!', 'primary big', go));
    this.pick(this.sel, true);
    removeEventListener('keydown', this._kn);
    addEventListener('keydown', this._kn = (e) => {
      if (this.mode !== 'select') return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') step(-1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') step(1);
      if (e.code === 'Enter') go();
    });
  }

  toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    const live = [...this.root.querySelectorAll('.toast')]; // two at once stack instead of printing over each other
    if (live.length) t.style.marginTop = live.reduce((h, o) => h + o.offsetHeight + 8, 0) + 'px';
    this.root.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  pick(i, silent) {
    const g = this.game;
    this.sel = i;
    const c = CRITTERS[i];
    if (!silent) { sfx.ui('move'); sfx.voice(c.voice, 'taunt'); }
    g.setShowcase([skinOf(c)], 'single');
    g.showcase[0].cheer = 0.8;
    const trial = this.free && !save.unlocked.includes(c.id);
    this.root.querySelector('.sel-info').innerHTML = this.infoCard(c, trial ? `<div class="ic-trial">Trial · ${cupOfShiny(c.id) ? 'recruit in the ' + cupOfShiny(c.id).name : c.mainland ? 'wake it in Glowcap Woods' : c.isle ? 'befriend it in the Sunscatter Isles' : 'recruit in the Tournament'}</div>` : '');
    this.root.querySelectorAll('.rcard').forEach((b, k) => { b.classList.toggle('on', k === i); if (k === i) b.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); });
  }

  infoCard(base, extra = '') {
    const T = TYPES[base.type], prog = save.critters[base.id];
    const c = grown(base, prog.level), st = c.stats, nx = GROW_LV.find((l) => l > prog.level);
    const bar = (label, v) => `<div class="stat"><span>${label}</span><i><b style="width:${Math.round(Math.max(0.08, Math.min(1, v)) * 100)}%"></b></i></div>`;
    const beats = T.beats.map((b) => `<span class="mini-type" style="background:${TYPES[b].color}">${TYPES[b].name}</span>`).join('');
    return `
      <div class="info-card" style="--tc:${T.color}">
        <div class="ic-row"><span class="ic-type">${T.name} type</span><span class="ic-lv">Lv ${prog.level}${c.stage ? ` · Stage ${c.stage}` : ''}</span></div>
        <h2>${c.name}</h2>
        <div class="ic-species">${c.species}${base.legend ? ' <b class="ic-legend">★ Legendary</b>' : ''}</div>
        <p>${c.blurb}</p>
        <div class="stats">${bar('Health', (st.hp - 800) / 400)}${bar('Speed', (st.speed - 5) / 3)}${bar('Power', (st.power - 0.85) / 0.3)}${bar('Weight', (st.weight - 0.6) / 0.8)}</div>
        <div class="ic-beats"><small>Strong vs</small>${beats}</div>
        <div class="moves"><div><small>Special</small><b>${c.moves.special}</b></div><div><small>Super</small><b>${c.moves.super}</b></div></div>
        ${extra}
        <div class="xpbar"><i style="width:${(prog.xp / xpNeeded(prog.level)) * 100}%"></i></div>
        <div class="ic-grow">${nx ? `🌱 Grows at Lv ${nx}` : '★ Fully grown'}</div>
      </div>`;
  }

  // marks today's daily cleared; the first clear each day extends the streak (back-to-back days) and pays streak berries
  dailyClear(key) {
    save.daily ||= {};
    if (save.daily[key]) return '';
    save.daily[key] = true;
    const prev = new Date(Date.parse(key + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10);
    const S = save.dailyStreak ||= { last: null, n: 0 };
    S.n = S.last === prev ? S.n + 1 : 1; S.last = key;
    save.stats.bestDaily = Math.max(save.stats.bestDaily || 0, S.n);
    const bonus = Math.min(5, S.n);
    save.berries = (save.berries || 0) + bonus;
    return S.n > 1 ? ` · 🔥 ${S.n}-day streak, +${bonus} 🍓` : ` · +1 🍓 (come back tomorrow for a streak!)`;
  }

  // the streak only counts while it's alive: cleared today or yesterday
  dailyStreakNow(key) {
    const S = save.dailyStreak;
    if (!S?.n) return 0;
    const prev = new Date(Date.parse(key + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10);
    return S.last === key || S.last === prev ? S.n : 0;
  }

  // Stadium Trials picker: one row of six stadium cards with their rival and stars
  trialSheet() {
    const g = this.game;
    if (this.root.querySelector('.train-pick')) return;
    const d = document.createElement('div');
    d.className = 'modal-wrap train-pick trial-pick';
    d.innerHTML = `<div class="modal"><h2>Stadium Trials</h2>
      <small>★ Win · ★★ without a hazard hit · ★★★ and with 70% health left</small>
      <div class="trial-list">${TRIALS.map((t) => `<button class="trial" data-k="${t.arena}"><img src="${g.portrait(byId(t.foe))}" alt=""><b>${ARENA_NAME[t.arena]}</b>${starRow(save.trials?.[t.arena] || 0)}</button>`).join('')}</div>
      <div class="row"></div></div>`;
    d.querySelectorAll('.trial').forEach((b) => b.addEventListener('click', () => {
      sfx.ui('ok'); d.remove();
      const t = TRIALS.find((x) => x.arena === b.dataset.k);
      this.ctx = { kind: 'trials', arena: t.arena, foe: t.foe };
      this.select();
    }));
    d.querySelector('.row').appendChild(this.btn('Back', 'ghost-dark', () => d.remove()));
    this.root.appendChild(d);
  }

  // ---------- Challenges: Survival gauntlet and the Daily Challenge ----------
  challenges() {
    const g = this.game;
    g.endBattle();
    this.mode = 'cups';
    g.setShowcase([]);
    const d = dailyChallenge(), foe = byId(d.foe), mod = MODS[d.mod];
    const doneToday = save.daily?.[d.key];
    this.root.innerHTML = '<div class="cups-screen"><div class="cup-list"></div></div>';
    const S = this.root.firstElementChild;
    S.prepend(this.header('Challenges', () => this.title()));
    const list = S.querySelector('.cup-list');
    const card = (cls, color, html, fn) => {
      const b = document.createElement('button');
      b.className = 'cup ' + cls;
      b.style.setProperty('--tc', color);
      b.innerHTML = html;
      b.addEventListener('click', () => { sfx.ui('ok'); fn(); });
      list.appendChild(b);
    };
    card('survival', '#ff7a3d', `
      <div class="cup-trophy">🔥</div>
      <h2>Survival</h2>
      <p>One fight after another. Damage carries over and every rival is tougher. Every 5th is a shiny ⭐ Gatekeeper: beat it for berries and a full heal.</p>
      <div class="cup-meta">Best streak: <b>${save.stats.bestStreak || 0}</b></div>`,
    () => { this.ctx = { kind: 'survival', streak: 0, hp: 1, last: null, best: save.stats.bestStreak || 0 }; this.select(); });
    // team days need three critters; until then the day's lead foe is a solo daily
    const teamDay = d.team && save.unlocked.length >= 3;
    const tm = dailyChallenge(new Date(Date.parse(d.key + 'T12:00:00Z') + 864e5)); // tomorrow's, previewed once today's is done
    card('daily' + (doneToday ? ' done' : ''), '#3dc8ff', `
      <div class="cup-trophy">${doneToday ? '✅' : '📅'}</div>
      <h2>${teamDay ? 'Daily Team Challenge' : 'Daily Challenge'}</h2>
      <p>${teamDay ? '3-on-3 today! ' : ''}${mod.icon} <b>${mod.name}</b>: ${mod.desc}</p>
      <div class="cup-foes">${(teamDay ? d.team : [d.foe]).map((id, k) => `<img src="${g.portrait(skinned(byId(id), d.shiny && k === 0 ? 'shiny' : 'base'))}" alt="">`).join('')}</div>
      <div class="cup-meta">vs ${teamDay ? 'a rival team' : `${d.shiny ? '✦ ' : ''}${foe.name}`} · ${ARENA_NAME[d.arena]} · ${doneToday ? 'Cleared today!' : 'Double XP'}${this.dailyStreakNow(d.key) ? ` · 🔥 ${this.dailyStreakNow(d.key)}` : ''}</div>
      ${doneToday ? `<div class="cup-meta">Tomorrow: ${tm.team && save.unlocked.length >= 3 ? '🤝 3-on-3' : `vs ${byId(tm.foe).name}`} · ${MODS[tm.mod].icon} ${MODS[tm.mod].name}</div>` : ''}`,
    () => { this.ctx = teamDay ? { kind: 'team', daily: d } : { kind: 'daily', d }; this.select(); });
    const bosses = bossList(), rushOpen = !!save.cups.champion;
    card('bossrush' + (rushOpen ? '' : ' locked'), '#ffb020', `
      <div class="cup-trophy">${rushOpen ? '👑' : '🔒'}</div>
      <h2>Boss Rush</h2>
      <p>${rushOpen ? `Every cup's boss, back to back. Damage carries over, so make every hit count.` : 'Clear the Champion Cup to unlock.'}</p>
      <div class="cup-foes">${bosses.map((m) => `<img src="${g.portrait(skinned(byId(m.critter), m.skin))}" alt="">`).join('')}</div>
      <div class="cup-meta">${save.stats.bossRush ? '👑 Cleared! ' : ''}Best: <b>${save.stats.bossBest || 0}/${bosses.length}</b></div>`,
    () => { if (!rushOpen) { this.toast('Clear the Champion Cup first!'); return; } this.ctx = { kind: 'bossrush', idx: 0, hp: 1 }; this.select(); });
    const teamOpen = save.unlocked.length >= 3;
    card('team' + (teamOpen ? '' : ' locked'), '#c86bff', `
      <div class="cup-trophy">${teamOpen ? '🤝' : '🔒'}</div>
      <h2>Team Battle</h2>
      <p>${teamOpen ? 'Pick three critters and take on a rival team of three. Whoever wins stays in, damage and all.' : 'Recruit three critters to unlock.'}</p>
      <div class="cup-meta">3-on-3 · Wins: <b>${save.stats.teamWins || 0}</b></div>`,
    () => { if (!teamOpen) { this.toast('Recruit three critters first!'); return; } this.ctx = { kind: 'team' }; this.select(); });
    const trialsOpen = !!save.cups.sprout;
    card('trials' + (trialsOpen ? '' : ' locked'), '#ff8a3d', `
      <div class="cup-trophy">${trialsOpen ? '🎪' : '🔒'}</div>
      <h2>Stadium Trials</h2>
      <p>${trialsOpen ? 'Six stadiums, every trick going off twice as often. Win for a star, dodge every hazard for two, finish healthy for three.' : 'Clear the Sprout Cup to unlock.'}</p>
      <div class="cup-meta">⭐ <b>${trialStars()}</b>/${TRIALS.length * 3}</div>`,
    () => {
      if (!trialsOpen) { this.toast('Clear the Sprout Cup first!'); return; }
      if (save.settings.hazards === false) { this.toast('Switch Arena hazards on in Settings first!'); return; }
      this.trialSheet();
    });
    card('training', '#7ad36b', `
      <div class="cup-trophy">🎯</div>
      <h2>Training</h2>
      <p>Practice combos on a dummy that never runs out of health. Set it to guard, dodge or fight back, and check the move list.</p>
      <div class="cup-meta">No timer · No XP</div>`,
    () => { this.ctx = { kind: 'training' }; this.select(); });
  }

  // training: pick the sparring dummy and the arena, then go
  // rival + arena sheet, shared by Training ("Sparring Setup") and Quick Battle ("Match Setup")
  matchSheet(train) {
    const g = this.game;
    if (this.root.querySelector('.train-pick')) return;
    const p = skinOf(CRITTERS[this.sel]);
    const others = CRITTERS.filter((x) => x.id !== p.id);
    const key = train ? 'train' : 'quick';
    let foe = this[key + 'Foe'] && this[key + 'Foe'] !== p.id ? this[key + 'Foe'] : 'random', arena = this[key + 'Arena'] || (train ? 'meadow' : 'random');
    const arenas = train ? ARENA_KEYS : ['random', ...ARENA_KEYS];
    const d = document.createElement('div');
    d.className = 'modal-wrap train-pick';
    d.innerHTML = `<div class="modal"><h2>${train ? 'Sparring Setup' : 'Match Setup'}</h2>
      <small>${train ? 'Dummy' : 'Rival'}</small><div class="tp-foes">${['random', ...others.map((c) => c.id)].map((id) => `<button class="tp-foe" data-id="${id}">${id === 'random' ? '<b>?</b>' : `<img src="${g.portrait(CRITTERS.find((c) => c.id === id))}" alt="${id}">`}</button>`).join('')}</div>
      <small>Arena</small><div class="tp-arenas">${arenas.map((k) => `<button class="tp-ar" data-k="${k}">${k === 'random' ? '🎲 Random' : ARENA_NAME[k]}${HAZARDS[k] && save.settings.hazards !== false ? ' ⚠' : ''}</button>`).join('')}${train && save.settings.hazards !== false ? '<button class="tp-hz"></button>' : ''}</div>
      <div class="row"></div></div>`;
    let hz = this.trainHz ? '1' : '0';
    // Quick Battle: one chip cycles through the match modifiers
    const modKeys = ['', ...Object.keys(MODS).filter((k) => !MODS[k].hazard || save.settings.hazards !== false)];
    let mod = modKeys.includes(this.quickMod) ? this.quickMod : '';
    const sync = () => {
      d.querySelectorAll('.tp-foe').forEach((b) => b.classList.toggle('on', b.dataset.id === foe));
      d.querySelectorAll('.tp-ar').forEach((b) => b.classList.toggle('on', b.dataset.k === arena));
      // one chip toggles hazard practice (only the ⚠ stadiums have any)
      d.querySelectorAll('.tp-hz').forEach((b) => { b.classList.toggle('on', hz === '1'); b.textContent = `⚠ Hazards: ${hz === '1' ? 'On' : 'Off'}`; });
      d.querySelectorAll('.tp-mod').forEach((b) => { b.classList.toggle('on', !!mod); b.innerHTML = mod ? `${MODS[mod].icon}<span> ${MODS[mod].name}</span>` : '🎲<span> No modifier</span>'; });
    };
    d.querySelectorAll('.tp-hz').forEach((b) => b.addEventListener('click', () => { hz = hz === '1' ? '0' : '1'; sfx.ui('move'); sync(); }));
    d.querySelectorAll('.tp-foe').forEach((b) => b.addEventListener('click', () => { foe = b.dataset.id; sfx.ui('move'); sync(); }));
    d.querySelectorAll('.tp-ar').forEach((b) => b.addEventListener('click', () => { arena = b.dataset.k; sfx.ui('move'); sync(); }));
    sync();
    const row = d.querySelector('.row');
    if (!train) { const mb = document.createElement('button'); mb.className = 'tp-mod'; mb.addEventListener('click', () => { mod = modKeys[(modKeys.indexOf(mod) + 1) % modKeys.length]; sfx.ui('move'); sync(); this.toast(mod ? `${MODS[mod].icon} ${MODS[mod].name}: ${MODS[mod].desc}` : 'No modifier'); }); row.appendChild(mb); }
    sync();
    row.appendChild(this.btn('Back', 'ghost-dark', () => d.remove()));
    row.appendChild(this.btn(train ? 'PRACTICE!' : 'FIGHT!', 'primary', () => {
      d.remove();
      this[key + 'Foe'] = foe; this[key + 'Arena'] = arena;
      const c = foe === 'random' ? others[Math.floor(Math.random() * others.length)] : others.find((x) => x.id === foe);
      if (!train) {
        this.quickMod = mod;
        // Stadium Mayhem on a random arena picks one that has hazards
        const ar = arena !== 'random' ? arena : pick(MODS[mod]?.hazard ? ARENA_KEYS.filter((k) => HAZARDS[k]) : ARENA_KEYS);
        this.quickPick = { c, arena: ar, mods: mod ? [mod] : [] };
        this.vs(); return;
      }
      this.mode = 'battle';
      playMusic('battle');
      this.trainHz = hz === '1';
      g.startBattle(p, c, { training: true, hazards: this.trainHz, playerLevel: save.critters[p.id].level, cpuLevel: save.critters[p.id].level, arena });
    }));
    this.root.appendChild(d);
  }

  training() { this.matchSheet(true); }

  // Team Battle: pick three from your team (the selected critter leads), then face three rivals
  teamSheet() {
    const g = this.game;
    if (this.root.querySelector('.train-pick')) return;
    const mine = CRITTERS.filter((c) => save.unlocked.includes(c.id));
    const lead = CRITTERS[this.sel].id;
    const byLv = [...mine].sort((a, b) => save.critters[b.id].level - save.critters[a.id].level).map((c) => c.id);
    let team = (this.lastTeam || []).filter((id) => save.unlocked.includes(id) && id !== lead);
    team = [lead, ...team, ...byLv.filter((id) => id !== lead && !team.includes(id))].slice(0, 3);
    const d = document.createElement('div');
    d.className = 'modal-wrap train-pick team-pick';
    d.innerHTML = `<div class="modal"><h2>Pick Your Team</h2>
      <small>Tap three critters. The first one leads.</small><div class="tp-foes">${mine.map((c) => `<button class="tp-foe" data-id="${c.id}"><img src="${g.portrait(skinOf(c))}" alt="${c.name}"><i></i></button>`).join('')}</div>
      <div class="row"></div></div>`;
    const sync = () => d.querySelectorAll('.tp-foe').forEach((b) => {
      const k = team.indexOf(b.dataset.id);
      b.classList.toggle('on', k >= 0); b.querySelector('i').textContent = k >= 0 ? k + 1 : '';
    });
    d.querySelectorAll('.tp-foe').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.id, k = team.indexOf(id);
      if (k >= 0) team.splice(k, 1); else if (team.length < 3) team.push(id); else { team[2] = id; }
      sfx.ui('move'); sync(); go.disabled = team.length < 3;
    }));
    const row = d.querySelector('.row');
    // a modifier for the whole team battle (not on daily team days, which bring their own)
    let mod = '';
    if (!this.ctx.daily) {
      const modKeys = ['', ...Object.keys(MODS).filter((k) => !MODS[k].hazard || save.settings.hazards !== false)];
      mod = modKeys.includes(this.teamMod) ? this.teamMod : '';
      const mb = document.createElement('button'); mb.className = 'tp-mod';
      const paint = () => { mb.classList.toggle('on', !!mod); mb.innerHTML = mod ? `${MODS[mod].icon}<span> ${MODS[mod].name}</span>` : '🎲<span> No modifier</span>'; };
      mb.addEventListener('click', () => { mod = modKeys[(modKeys.indexOf(mod) + 1) % modKeys.length]; this.teamMod = mod; sfx.ui('move'); paint(); this.toast(mod ? `${MODS[mod].icon} ${MODS[mod].name}: ${MODS[mod].desc}` : 'No modifier'); });
      paint(); row.appendChild(mb);
    }
    row.appendChild(this.btn('Back', 'ghost-dark', () => d.remove()));
    const go = this.btn('FIGHT!', 'primary', () => {
      if (team.length < 3) return;
      d.remove();
      this.lastTeam = team.slice();
      const pool = CRITTERS.filter((c) => !team.includes(c.id)).map((c) => c.id);
      const foes = [], daily = this.ctx.daily;
      if (daily) foes.push(...daily.team);
      while (foes.length < 3) { const id = pick(pool); if (!foes.includes(id)) foes.push(id); }
      const arena = daily ? daily.arena : pick(MODS[mod]?.hazard ? ARENA_KEYS.filter((k) => HAZARDS[k]) : ARENA_KEYS);
      this.ctx = { kind: 'team', team, foes, pi: 0, fi: 0, php: [1, 1, 1], fhp: [1, 1, 1], arena, daily, mods: !daily && mod ? [mod] : [] };
      this.sel = CRITTERS.findIndex((c) => c.id === team[0]);
      this.vs();
    });
    row.appendChild(go);
    sync();
    this.root.appendChild(d);
  }

  // little row of team portraits for the VS and results screens: KO'd ones greyed out
  teamRow(ids, hp, cur) {
    return `<span class="team-row">${ids.map((id, k) => `<img class="${hp[k] <= 0 ? 'ko' : k === cur ? 'cur' : ''}" src="${this.game.portrait(skinOf(byId(id)))}" alt="">`).join('')}</span>`;
  }

  // ---------- Critterdex: collection, skins and badges ----------
  dex(i = this.sel) {
    const g = this.game;
    this.mode = 'dex';
    this.t = 0;
    this.backFn = () => this.title();
    this.dexYaw = this.dexYaw || 0;
    const owned = save.unlocked.length;
    this.root.innerHTML = `
      <div class="dex-screen">
        <div class="dex-list"></div>
        <div class="dex-spin" aria-label="Drag to spin"></div>
        <div class="dex-info"></div>
        <button class="btn dex-badges"></button>
      </div>`;
    const S = this.root.firstElementChild;
    S.prepend(this.header(`Critterdex <small class="dex-count">${owned}/${CRITTERS.length}</small>`, () => this.title()));
    const earned = BADGES.filter((b) => save.badges?.[b.id]).length;
    const bb = S.querySelector('.dex-badges');
    bb.innerHTML = `🏅 Badges ${earned}/${BADGES.length}`;
    bb.addEventListener('click', () => { sfx.ui('ok'); this.badgeModal(); });
    const list = S.querySelector('.dex-list');
    stackAbove(S.querySelector('.dex-info'), list, 12);
    CRITTERS.forEach((c, k) => {
      const locked = !save.unlocked.includes(c.id);
      const b = document.createElement('button');
      b.className = 'dcard' + (locked ? ' locked' : '') + (save.shinies?.includes(c.id) ? ' has-shiny' : '');
      b.style.setProperty('--tc', TYPES[c.type].color);
      const gc = locked ? c : grown(c, save.critters[c.id].level);
      b.innerHTML = `<i>#${String(k + 1).padStart(3, '0')}</i><div class="pic"><img src="${g.portrait(gc)}" alt=""></div><span>${locked ? '???' : gc.name}</span>`;
      b.addEventListener('click', () => {
        if (locked) { sfx.ui('back'); this.toast(unlockHint(c.id)); return; }
        sfx.ui('move'); this.dexPick(k);
      });
      list.appendChild(b);
    });
    // drag to spin the model
    const spin = S.querySelector('.dex-spin');
    let lastX = null;
    spin.addEventListener('pointerdown', (e) => { lastX = e.clientX; spin.setPointerCapture(e.pointerId); this.dexDrag = true; });
    spin.addEventListener('pointermove', (e) => { if (lastX === null) return; this.dexYaw += (e.clientX - lastX) * 0.012; lastX = e.clientX; });
    const up = () => { lastX = null; this.dexDrag = false; };
    spin.addEventListener('pointerup', up); spin.addEventListener('pointercancel', up);
    spin.addEventListener('click', () => { const c = g.showcase[0]; if (c) { c.cheer = 0.8; sfx.voice(c.def.voice, 'taunt'); } });
    if (!save.unlocked.includes(CRITTERS[i].id)) i = CRITTERS.findIndex((c) => save.unlocked.includes(c.id));
    this.dexPick(i, true);
    playMusic('menu');
  }

  dexPick(i, silent) {
    const g = this.game;
    this.sel = i;
    const c = CRITTERS[i];
    const skin = save.skins?.[c.id] || 'base';
    const def = skinOf(c);
    g.setShowcase([def], 'single');
    if (!silent) { g.showcase[0].cheer = 0.8; sfx.voice(c.voice, 'taunt'); }
    const prog = save.critters[c.id];
    const hasShiny = save.shinies?.includes(c.id);
    const cup = cupOfShiny(c.id);
    const skins = SHINY[c.id] ? `
      <div class="dex-skins"><small>Palette</small>
        <button class="chip skin ${skin === 'base' ? 'on' : ''}" data-skin="base">Classic</button>
        <button class="chip skin shiny ${skin === 'shiny' ? 'on' : ''} ${hasShiny ? '' : 'locked'}" data-skin="shiny">${hasShiny ? '✦ Shiny' : '🔒 Shiny'}</button>
      </div>
      ${hasShiny ? '' : `<div class="dex-hint">${cup ? 'Clear the ' + cup.name + ' to unlock.' : c.isle ? 'Spot a shiny one in the Sunscatter Isles.' : 'Clear the tournament to unlock.'}</div>`}` : '';
    const gear = `<div class="dex-gear"><small>Gear</small>${GEAR.map((x) => prog.level >= x.lv
      ? `<span class="got" title="${x.name}"><i>${x.icon}</i>${x.name}</span>`
      : `<span title="Reach Lv ${x.lv}"><i>🔒</i>Lv ${x.lv}</span>`).join('')}</div>`;
    // growth line: forms you've reached show their face and name (tap to view), later ones stay a mystery
    const growth = `<div class="dex-growth"><small>Growth</small>${[1, ...GROW_LV].map((lv, k) => {
      const f = grown(c, lv), got = prog.level >= lv;
      return `${k ? '<b class="arr">›</b>' : ''}<button class="gstage ${got ? 'got' : ''}" data-lv="${lv}"><img src="${g.portrait(f, 128)}" alt=""><span>${got ? f.name : '???'}</span><em>${k ? 'Lv ' + lv : 'Base'}</em></button>`;
    }).join('')}</div>`;
    const record = `<div class="dex-record"><span><b>${prog.wins || 0}</b> wins</span><span>Lv <b>${prog.level}</b></span><span title="Friendship">💗 <b>${Math.min(5, Math.floor((prog.pets || 0) / 4))}</b>/5</span></div>`;
    const info = this.root.querySelector('.dex-info');
    info.innerHTML = this.infoCard(c, record + growth + gear + skins + '<button class="chip dex-moves">📜 Move List</button>');
    info.querySelectorAll('.gstage').forEach((b) => b.addEventListener('click', () => {
      const lv = +b.dataset.lv;
      if (prog.level < lv) { sfx.ui('back'); this.toast(`Reach Lv ${lv} to find out what ${c.name} grows into!`); return; }
      sfx.ui('move');
      g.setShowcase([withGear(skinned(c, skin), stageFor(prog.level) === stageFor(lv) ? prog.level : lv)], 'single'); // earlier forms show as they were
      g.showcase[0].cheer = 0.8;
      info.querySelectorAll('.gstage').forEach((x) => x.classList.toggle('on', x === b));
    }));
    info.querySelector(`.gstage[data-lv="${GROW_LV.filter((l) => l <= prog.level).pop() || 1}"]`)?.classList.add('on');
    info.querySelector('.dex-moves').addEventListener('click', () => this.moveModal(c));
    info.querySelectorAll('.skin').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.skin === 'shiny' && !hasShiny) { sfx.ui('back'); this.toast(cup ? `Clear the ${cup.name} to unlock` : c.isle ? 'Spot a shiny one in the Sunscatter Isles' : 'Clear the tournament to unlock'); return; }
      sfx.ui('ok');
      (save.skins ||= {})[c.id] = b.dataset.skin;
      persist();
      this.dexPick(i, b.dataset.skin === 'base');
      if (b.dataset.skin === 'shiny') { g.showcase[0].cheer = 1.2; sfx.jingle(2); }
    }));
    this.root.querySelectorAll('.dcard').forEach((b, k) => { b.classList.toggle('on', k === i); if (k === i) b.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); });
  }

  // ---------- critter camp ----------
  // ---------- Adventure: the tile world ----------
  adventure() {
    const g = this.game;
    if (!save.adv || !save.unlocked.includes(save.adv.hero)) { this.heroPick(); return; }
    g.endBattle();
    g.setArena('meadow');
    g.setShowcase([]);
    this.mode = 'world';
    this.backFn = () => this.worldMenu();
    document.body.classList.add('in-world');
    this.root.innerHTML = `<div class="world-screen"><button class="icon-btn wd-menu" aria-label="Menu">☰</button><button class="wd-a" aria-label="A">A</button></div>`;
    this.root.querySelector('.wd-menu').addEventListener('click', () => { sfx.ui('ok'); this.worldMenu(); });
    clearInterval(this.badgeT); this.badgeT = setInterval(() => (this.mode === 'world' ? this.todayBadge() : clearInterval(this.badgeT)), 3000);
    this.root.querySelector('.wd-a').addEventListener('pointerdown', (e) => { e.preventDefault(); if (this.worldObj) this.worldObj.tapA = true; });
    g.input.showTouch(true);
    this.worldObj?.dispose();
    this.worldObj = new World(this);
    storyIntro(this, this.worldObj);
    this.todayBadge();
  }

  leaveWorld() {
    this.worldObj?.dispose();
    this.worldObj = null;
    document.body.classList.remove('in-world');
    if (!this.game.battle) this.game.input.showTouch(false);
  }

  worldMenu() {
    if (this.root.querySelector('.modal-wrap')) return;
    const d = document.createElement('div');
    d.className = 'modal-wrap';
    const F = save.adv.flags, cups = CUPS.filter((c) => F['cup_' + c.id]).length, h = heroDef();
    d.innerHTML = `<div class="modal wd-menu-modal"><h2>Adventure</h2>
      <div class="wd-hero"><img src="${this.game.portrait(h)}" alt=""><div><b>${h.name}</b><small>Lv ${save.critters[h.id].level} · Hero${this.worldObj?.M && !this.worldObj.M.indoor && (!this.worldObj.M.mood || this.worldObj.M.snow || this.worldObj.M.border === 'cloud') ? ` · ${this.worldObj.storm ? '⛈️ Storm' : this.worldObj.rain ? '🌧️ Rain' : this.worldObj.snowing ? '🌨️ Snow' : { day: '☀️ Day', evening: '🌇 Evening', night: '🌙 Night' }[this.worldObj.phase] || ''}` : ''}${seasonTag() ? ` · <span class="nw">${seasonTag()}</span>` : ''}${save.adv.time >= 60 ? ` · ⏱️ ${playTime(save.adv.time)}` : ''}</small><small>🏆 Cups ${cups}/${CUPS.length} · 🍓 ${save.berries || 0} · 🎁 ${Object.keys(F).filter((k) => k.startsWith('it_')).length}/24 · 📋 ${save.adv.req?.day === new Date().toISOString().slice(0, 10) ? `${save.adv.req.paid.length}/3` : 'new!'}</small></div></div>
      <div class="wd-cups">${['sprout', 'thunder', 'grove', 'champion', 'midnight', 'sky', 'legend'].map((id) => { const c = CUPS.find((x) => x.id === id), on = F['cup_' + id]; return `<span class="${on ? 'on' : ''}" style="--cc:${c.color}" title="${c.name}">${on ? '🏆' : ''}</span>`; }).join('')}${F.crowned ? '<span class="on crown" style="--cc:#ffd23f" title="Critter Crown">👑</span>' : ''}<em class="wd-pc" title="Clashara explored">🗺️ ${this.recordsPc()}%</em></div>
      <p class="wd-goal">📜 ${nextGoal(F)}${favourLine() ? `<small class="wd-fav">🤝 ${favourLine()}</small>` : ''}${save.adv.care && save.critters[save.adv.care.id] ? `<small class="wd-fav">🧸 ${grown(byId(save.adv.care.id), save.critters[save.adv.care.id].level).name} is at the Daycare · ${Math.max(0, (save.adv.steps || 0) - save.adv.care.at)} steps</small>` : ''}${save.adv.egg ? `<small class="wd-fav">🥚 Your egg hatches in ${Math.max(1, 250 - ((save.adv.steps || 0) - save.adv.egg.at))} steps</small>` : ''}${save.adv.walk ? `<small class="wd-fav">🐾 ${byId(save.adv.walk.id).name} is out on a walk with you</small>` : ''}</p>
      <div class="res-btns"></div></div>`;
    const b = d.querySelector('.res-btns');
    const close = () => { d.remove(); this.game.modalClose = null; };
    d.querySelector('.wd-pc').addEventListener('click', () => { sfx.ui('ok'); close(); this.worldJournal('rec'); });
    b.appendChild(this.btn('Resume', 'primary', close));
    b.appendChild(this.btn('🗺️ Town Map', 'secondary', () => { close(); this.worldMap(); }));
    b.appendChild(this.btn('🐾 Buddy', 'secondary', () => { close(); this.buddyPick(); }));
    if ((save.adv.hats || []).length && this.worldObj) b.appendChild(this.btn('🎩 Hats', 'secondary', () => { close(); wearHats(this.worldObj); }));
    const jb = this.btn('📔 Journal', 'secondary', () => { close(); this.worldJournal(); }), left = this.root.querySelector('.world-screen .wd-menu')?.dataset.n;
    if (left) { jb.classList.add('has-badge'); jb.dataset.n = left; }
    b.appendChild(jb);
    b.appendChild(this.btn('📸 Photo', 'secondary', () => { close(); setTimeout(() => this.worldObj?.snapshot(), 60); }));
    b.appendChild(this.btn('Save & Quit', 'ghost', () => { close(); persist(); this.leaveWorld(); this.title(); }));
    // start over with a new hero (tap twice: this replaces the current story)
    const fresh = this.btn('New Adventure', 'ghost small', () => {
      if (!fresh.classList.contains('sure')) { fresh.classList.add('sure'); fresh.innerHTML = 'Tap again: start over?'; return; }
      close(); persist(); this.leaveWorld(); this.title(); this.heroPick();
    });
    b.appendChild(fresh);
    this.game.modalClose = close;
    this.root.appendChild(d);
    this.exploreCheck();
  }

  // the Journal: favours for townsfolk, and the fish album (every kind, biggest catch)
  // the Journal's 📅 Today rows ([icon, name, where, done]); the ☰ badge counts what's left of them
  todayList() {
    const A = save.adv, F = A.flags, seen = A.seen || {}, day = new Date().toISOString().slice(0, 10), night = this.worldObj?.outPhase !== 'day';
      const N = (k) => MAPS[k].name, al = alphaToday(), dig = Object.keys(MAPS).filter((k) => seen[k] && (MAPS[k].arena === 'beach' || (MAPS[k].snow && k !== 'peak') || k === 'ember'));
      const digOpen = new Set(digLeft(MAPS)), digDone = dig.filter((k) => !digOpen.has(k)).length;
      const rows = [
        ['🍓', 'Shake a berry bush', 'bushes at the edge of town', Object.values(A.bush || {}).includes(day), true],
        ['🥞', "Mom's breakfast (before 9)", N('village'), A.breakfast === day, (this.worldObj?.morning || A.breakfast === day) && seen.village], // only while it can still be done (or once it's done)
        dig.length && ['⛏️', `Dig spots (${digDone}/${dig.length})`, dig.filter((k) => digOpen.has(k)).map(N).join(', ') || 'all dug!', digDone === dig.length, true],
        al && ['💥', `Beat the Alpha ${CRITTERS.find((c) => c.id === al.id)?.name || ''}`, `tall grass in ${N(al.map)}`, al.done, true],
        ['🍜', 'Spark Noodles', N('neon'), A.noodles === day, seen.neon],
        ['🕹️', 'TURBO prize', 'Neon City arcade', A.arcadeDay === day, seen.neon],
        ['🎈', 'SKY HOP prize', 'Neon City arcade', A.hopDay === day, seen.neon],
        ['🏄', 'WAVE RIDER prize', 'Ember Isle Surf Shack', A.surfDay === day, seen.ember_isle],
        ['🤿', 'REEF DIVE prize', 'the Sunken Wreck (Snorkeller Pia, Port Coral)', A.diveDay === day, F.dived],
        ['🐦', `Gull Club catch: ${gullFish(day)}`, 'any island water → Petrel, Starfall Atoll', A.gullPaid === day, F.amends3_done && F.rod],
        ['⛲', 'Make a wish', N('cloudtop'), A.wish === day, seen.cloudtop],
        ['♨️', 'Soak in the hot spring', N('ember'), A.soak === day, seen.ember],
        ['🪵', 'Win a twig race', `${N('route2')} bridge`, A.twig === day, seen.route2],
        ['🦋', 'Catch five butterflies', `${N('route1')} (by day)`, A.flutter === day, seen.route1 && (this.worldObj?.outPhase === 'day' || A.flutter === day)],
        ['🍉', 'Split a watermelon', `${N('seashell')} beach (by day)`, A.melon === day, isSummer() && seen.seashell && (this.worldObj?.outPhase === 'day' || A.melon === day)], // summer only (world.js buildMelon)
        ['🧺', 'Spring picnic', `${N('route1')} pond (by day)`, A.picnic === day, (isSpring() || isMeadow()) && seen.route1 && (this.worldObj?.outPhase === 'day' || A.picnic === day)], // spring only (world.js buildPicnic)
        ['☃️', 'Build a snow critter', `${N('village')} (winter days)`, A.snowman?.day === day && A.snowman.n >= 3, isWinter() && seen.village && (this.worldObj?.outPhase !== 'night' || A.snowman?.day === day)], // Jan-Feb (world.js buildSnowman)
        ['🪁', 'Fly a kite with Gale', N('cloudtop'), A.kite === day, seen.cloudtop && F.kite_done],
        ['💨', 'Ride the steam geyser', `${N('cinder')} steam vent`, A.geyser === day, seen.cinder],
        ['🌻', A.garden?.stage >= 4 ? 'Pick your flower' : A.garden?.stage ? `Water the garden (day ${A.garden.stage}/4)` : 'Plant a seed', `${N('bloom')} garden plot`, A.garden?.stage >= 1 && A.garden.stage < 4 && A.garden.last === day, seen.bloom],
        ['⛄', 'Snowball Toss (12+ hits)', `${N('frostpeak')} snow fort`, A.snowball === day, seen.frostpeak],
        ['🌅', 'Watch the sunset (5–8 pm)', `${N('seashell')} bench`, A.sunset === day, (this.worldObj?.outPhase === 'evening' || A.sunset === day) && seen.seashell], // only while the sun is going down (or once it's watched)
        ['🥚', 'Collect a Daycare egg', 'Nanny Nell, any Berry Center', A.eggDay === day, A.eggDay === day || (A.care && !A.egg && (A.steps || 0) - A.care.at >= 400)], // only once Nell has one waiting
        ['🏡', 'A present from home', `home, ${N('village')}`, A.grownDay === day, A.grown?.length], // a grown-up Daycare baby (world.js grownSpot)
        ['🎄', 'A gift under the tree', 'by any Berry Center', A.xgift === day, twinkleWeek()], // Twinkle Week (world.js buildXtree)
        F.rod && (() => { const D = derbyOf(gauntletWeek()); return ['🎣', `Derby: ${D.name} ${D.cm}+ cm`, `this week, ${D.where}`, A.derbyWk === D.wk, true]; })(),
        F.rod && seasonKey() && (() => { const [n, , , em] = SEASON_FISH[seasonKey()]; return !A.fishLog?.season?.[n] && [em, `Hook the ${n}`, `${seasonKey()} visitor, any water`, false, true, 'season']; })(), // the season's fish, until it's caught
        F.ending && ['🏔️', 'Peak Gauntlet (this week)', "Keeper Orla, Champion's Peak", !!F['gauntpay_' + gauntletWeek()], true],
      ].filter((r) => r && r[4]);
      const after = [
        ['🔭', 'Spot a constellation', N('village'), A.stars === day, seen.village],
        ['🍠', 'Roast a sweet potato', `${N('cinder')}, at the lava's edge`, A.roast === day, seen.cinder],
        ['🌼', 'Sniff a moonflower', `${N('route1')}, by the path`, A.moon === day, seen.route1],
        ['🍾', 'Message in a bottle', `${N('seashell')} shore`, A.bottle === day, seen.seashell],
        ['🔥', 'Toast a marshmallow', `${N('seashell')} bonfire`, (A.fire || {}).seashell === day, seen.seashell],
        ['🔥', 'Toast a marshmallow', `${N('frostpeak')} campfire`, (A.fire || {}).frostpeak === day, seen.frostpeak],
        ['🪩', 'Dance with DJ Tumble', N('neon'), A.danced === day, seen.neon],
        ['🍬', 'Glowing candy floss', 'Neon night market', A.market === day, seen.neon],
        ['⛸️', 'Skate a twirl', `${N('frostpeak')} pond`, A.skated === day, seen.frostpeak && A.skates],
        ['🍄', 'Sing with the fairy ring', N('glowcap'), A.ring === day, seen.glowcap],
        ['🎃', 'Find a pumpkin treat', 'pumpkins by the town doors', A.pumpkin === day, pumpkinNights()],
        ['🎵', `Sing carols (${A.carol?.day === day ? A.carol.ids.length : 0}/6)`, 'townsfolk in bobble hats', A.carol?.day === day && A.carol.ids.length >= 6, twinkleWeek()],
        ['🧛', `Trick-or-treat (${A.tot?.day === day ? A.tot.ids.length : 0}/${halloween() ? 10 : 6})`, 'townsfolk in costume', A.tot?.day === day && A.tot.ids.length >= (halloween() ? 10 : 6), pumpkinNights()],
        [pumpkinNights() ? '👻' : '✨', pumpkinNights() ? 'Catch the five wisps' : 'Catch five big fireflies', N('glowwood'), A.wisp === day, seen.glowwood],
      ].filter((r) => r[4]);
    return { rows, after, night };
  }

  // the Journal's Records bars, and the overall 'Clashara explored' percentage (the ☰ card shows it too)
  recordsPc() { try { return this.records().pc; } catch (e) { return 0; } }

  // 'Clashara explored' milestones: berries at 25/50/75%, and at 100% a golden statue of the hero in Sprout Village (paid once each)
  exploreCheck(pc = this.recordsPc()) {
    const A = save.adv, steps = [[25, 5], [50, 10], [75, 15], [100, 25]], next = steps.find(([p]) => p > (A.expl || 0) && pc >= p);
    if (!next) return;
    A.expl = next[0]; save.berries = (save.berries || 0) + next[1];
    if (next[0] === 100) A.flags.statue = true;
    persist(); sfx.jingle?.(next[0] === 100 ? 3 : 2);
    this.toast(next[0] === 100 ? `🌟 All of Clashara explored! +${next[1]} 🍓 · Something golden waits in Sprout Village...` : `🗺️ ${next[0]}% of Clashara explored! +${next[1]} 🍓`);
    if (next[0] === 100 && this.worldObj?.key === 'village') this.worldObj.buildStatue();
    setTimeout(() => this.exploreCheck(pc), 2600); // more than one milestone at once (an old save): pay them one by one
  }

  records() {
    let body = '';
    const A = save.adv, F = A.flags, L = A.fishLog || {}, npcs = Object.values(MAPS).filter((M) => !M.isle && !M.extra).flatMap((M) => M.npcs || []); // Clashara only: the isles keep their own rows below (post-game extras like Rainbow Reach don't count either)
    const tr = npcs.filter((n) => n.trainer), fl = favourList(), fsp = new Set([...Object.keys(L.sp || {}), ...(L.best ? [L.best.name] : [])]);
    const parts = []; // every bar with a goal counts towards the overall completion
    const bar = (ic, name, n, of, own) => (of && !own && parts.push(Math.min(1, n / of)), `<li class="jr-rec"><span>${ic}</span><b>${name}</b><em>${n}${of ? ` / ${of}` : ''}</em>${of ? `<i style="--p:${Math.min(1, n / of)}" class="${n >= of ? 'full' : ''}"></i>` : ''}</li>`);
    body = (A.time >= 60 ? bar('⏱️', 'Time adventuring', playTime(A.time)) : '')
      + bar('🏆', 'Cups won', CUPS.filter((c) => F['cup_' + c.id]).length, CUPS.length)
      + bar('⚔️', 'Trainers beaten', tr.filter((n) => F[n.id]).length, tr.length)
      + bar('🎁', 'Gift boxes found', Object.keys(F).filter((k) => k.startsWith('it_') && !MAPS[k.slice(3, k.lastIndexOf('_'))]?.isle && !MAPS[k.slice(3, k.lastIndexOf('_'))]?.extra).length, 24)
      + bar('🤝', 'Favours done', fl.rows.filter((r) => r.state === 'done' && !r.isle).length, fl.mainland)
      + bar('🎩', 'Hats collected', (A.hats || []).filter((id) => { const h = SHOP_HATS.find((q) => q.id === id); return h && !h.season && !h.isle && !h.extra; }).length, SHOP_HATS.filter((h) => !h.season && !h.isle && !h.extra).length)
      + bar('🐟', 'Kinds of fish', [...fsp].filter((n) => !FISH.isle.some((f) => f[0] === n)).length, Object.entries(FISH).filter(([k]) => k !== 'isle').flatMap(([, v]) => v).length)
      + bar('📖', 'Critters on your team', save.unlocked.length, CRITTERS.length)
      + bar('🏔️', 'Peak Gauntlets cleared', A.gauntWins || 0)
      + bar('💥', 'Alphas beaten', Object.keys(F).filter((k) => k.startsWith('alpha_')).length)
      + bar('🌿', 'Wild critters met', A.cnt?.wild || 0)
      + (A.cnt?.owl ? bar('🦉', 'Night owls met', A.cnt.owl) : '')
      + bar('🗓️', 'Seasons seen', ['spring', 'summer', 'autumn', 'winter'].map((q, i) => (A.seasons?.[q] ? ['🌸', '🌻', '🍂', '❄️'][i] : '·')).join(' '))
      + (L.season ? bar('🐠', 'Seasonal fish', Object.entries(SEASON_FISH).map(([, [n, , , em]]) => (L.season[n] ? em : '·')).join(' ')) : '') // no goal: it doesn't count towards completion
      + bar('🕹️', 'TURBO best', A.arcadeHi || 0)
      + bar('🎈', 'SKY HOP best', A.hopHi || 0)
      + bar('🪩', 'Nights danced', A.cnt?.dance || 0)
      + bar('⛸️', 'Nights skated', A.cnt?.skate || 0)
      + bar('⛲', 'Wishes made', A.cnt?.wish || 0)
      + bar('🍄', 'Fairy ring songs', A.cnt?.ring || 0)
      + bar('♨️', 'Hot spring soaks', A.cnt?.soak || 0)
      + (A.cnt?.melon ? bar('🍉', 'Watermelons split', A.cnt.melon) : '') + (A.cnt?.picnic ? bar('🧺', 'Spring picnics', A.cnt.picnic) : '') + (A.cnt?.snowman ? bar('☃️', 'Snow critters built', A.cnt.snowman) : '')
      + (A.cnt?.care ? bar('🧸', 'Daycare stays', A.cnt.care) : '')
      + (A.cnt?.egg ? bar('🐣', 'Eggs hatched', A.cnt.egg) : '')
      + (A.grown?.length ? bar('🏡', 'Grown up at home', A.grown.length) : '')
      + (A.cnt?.walk ? bar('🐾', 'Walks with your little ones', A.cnt.walk) : '')
      + (A.cnt?.storm ? bar('⛈️', 'Thunderstorms weathered', A.cnt.storm) : '')
      + (A.cnt?.rainbow ? bar('🌈', 'Rainbows seen', A.cnt.rainbow) : '')
      + bar('🌅', 'Sunsets watched', A.cnt?.sunset || 0)
      + bar('🪵', 'Twig races won', A.cnt?.twig || 0)
      + bar('🎣', 'Fishing Derbies won', A.cnt?.derby || 0)
      + bar('🌟', 'Perfect days', A.cnt?.perfect || 0)
      + bar('🌼', 'Moonflowers sniffed', A.cnt?.moon || 0)
      + bar('🍠', 'Sweet potatoes roasted', A.cnt?.roast || 0)
      + bar('⛄', 'Snowball Toss best', A.snowHi || 0)
      + bar('🌻', 'Flowers grown', A.cnt?.bloom || 0)
      + bar('🦋', 'Butterfly days', A.cnt?.flutter || 0)
      + bar('💨', 'Geyser rides', A.cnt?.geyser || 0)
      + (A.cnt?.kite ? bar('🪁', 'Kites flown', A.cnt.kite) : '')
      + (A.cnt?.breakfast ? bar('🥞', 'Breakfasts at home', A.cnt.breakfast) : '')
      + (A.cnt?.pumpkin ? bar('🎃', 'Pumpkin treats', A.cnt.pumpkin) : '')
      + (A.cnt?.tot ? bar('🍬', 'Trick-or-treats', A.cnt.tot) : '')
      + (A.cnt?.leaves ? bar('🍂', 'Leaf piles jumped', A.cnt.leaves) : '')
      + (A.cnt?.twinkle ? bar('🎄', 'Twinkle Week gifts', A.cnt.twinkle) : '')
      + (A.cnt?.carol ? bar('🎵', 'Carols sung', A.cnt.carol) : '')
      + (A.cnt?.wisp ? bar('✨', 'Firefly & wisp nights', A.cnt.wisp) : '')
      + bar('📸', 'Landmark photos', (A.snaps || []).filter((id) => !LANDMARKS.find((l) => l.id === id)?.isle).length, LANDMARKS.filter((l) => !l.isle).length)
      + bar('🔭', 'Constellations spotted', (A.consts || []).length, CONSTELLATIONS.length)
      + bar('🍾', 'Bottle notes read', (A.notes || []).length, BOTTLE_NOTES.length)
      + bar('👣', 'Steps walked', (A.steps || 0).toLocaleString());
    if (F.isle_arrive) { // Chapter 2: the Sunscatter Isles get their own rows (they don't count towards Clashara's %)
      const itr = Object.values(MAPS).filter((M) => M.isle).flatMap((M) => M.npcs || []).filter((n) => n.trainer), ih = SHOP_HATS.filter((h) => h.isle && !h.season);
      body += '<li class="jr-head">🏝️ Sunscatter Isles</li>'
        + bar('🏆', 'Island cups won', ISLE_CUPS.filter((c) => F['cup_' + c.id]).length, ISLE_CUPS.length, true)
        + bar('⚔️', 'Island trainers beaten', itr.filter((n) => F[n.id]).length, itr.length, true)
        + bar('🤝', 'Island favours', fl.rows.filter((r) => r.state === 'done' && r.isle).length, fl.isles, true)
        + bar('🎩', 'Island hats', ih.filter((h) => (A.hats || []).includes(h.id)).length, ih.length, true)
        + bar('🐠', 'Reef fish', FISH.isle.filter((f) => fsp.has(f[0])).length, FISH.isle.length, true)
        + bar('📸', 'Island landmarks', (A.snaps || []).filter((id) => LANDMARKS.find((l) => l.id === id)?.isle).length, LANDMARKS.filter((l) => l.isle).length, true)
        + bar('🦪', 'Hidden pearls', Object.keys(MAPS).filter((k) => MAPS[k].pearl && F['pearl_' + k]).length, Object.keys(MAPS).filter((k) => MAPS[k].pearl).length, true)
        + bar('🌟', 'The Sunstone', F.sunstone ? 'home' : F.morra ? 'found' : 'lost')
        + bar('⛴️', 'Ferry rides', A.cnt?.ferry || 0)
        + (A.surfHi ? bar('🏄', 'WAVE RIDER best', A.surfHi) : '')
        + (A.surfNightHi ? bar('🌙', 'WAVE RIDER by moonlight', A.surfNightHi) : '')
        + (A.cnt?.gull ? bar('🐦', 'Gull Club catches', A.cnt.gull) : '')
        + (A.diveHi ? bar('🤿', 'REEF DIVE best', A.diveHi) : '')
        + (F.sunstone ? bar('🌺', 'Sunscatter Masters cleared', A.mastWins || 0) : '')
        + (F.sunstone ? bar('🗼', 'Battle Tower best streak', `${A.tower?.best || 0} · ${towerRank(A.tower?.best || 0)[2]} ${towerRank(A.tower?.best || 0)[1]}`) + (A.tower?.streak ? bar('🔥', 'Current Tower streak', A.tower.streak) : '') : '');
    }
    const pc = Math.floor(parts.reduce((a, b) => a + b, 0) / parts.length * 100);
    body = `<li class="jr-total ${pc >= 100 ? 'full' : ''}"><b>${pc >= 100 ? '🌟 Clashara complete!' : '🗺️ Clashara explored'}</b><em>${pc}%</em><i style="--p:${pc / 100}"></i></li>` + body;
    return { body, pc };
  }

  // one handy tip a day for the Journal's Today page (only about things the player can already use)
  tipOfDay() {
    const A = save.adv, F = A.flags, seen = A.seen || {}, tips = [
      'Any critter on your team can lead the Adventure: use the Critter Box on the right-hand shelf of a Berry Center.',
      'Tap the 🗺️ % on the ☰ card to see everything there is to find in Clashara.',
      'Hold the stick all the way to run outdoors.',
      'Your buddy walks behind you. Swap them from ☰ → 🐾 Buddy.',
      'Berry bushes at the edge of town can be shaken once a day.',
      seen.cinder && 'After dusk on Cinder Road, face the lava and press A to roast a sweet potato.',
      seen.route1 && 'After dark, moonflowers open beside the path on Route 1. Give one a sniff!',
      seen.route2 && 'On Route 2\'s bridge, face the river and press A for a twig race. Pick a twig and cheer it on!',
      'Rooms look different after dark: lamps come on, and the windows fill with stars.',
      F.rod && 'Two fish only bite in the golden evening, between five and eight.',
      seen.cinder && 'The steam geyser on Cinder Road blows every few seconds. Stand on the vent and hold on to your hat!',
      seen.route1 && 'On sunny days, five butterflies flutter about Route 1. Walk into them to catch them all!',
      seen.bloom && 'Gardener Bea\'s plot in Bloom Town: plant a seed, water it once a day, and on the fourth day it blooms. Every flower is a new colour!',
      seen.frostpeak && 'Snowball Kid Kip\'s snow fort in Frostpeak: hit 12 snowmen in Snowball Toss for a daily berry stash. Don\'t hit Kip!',
      seen.seashell && 'Sit on the driftwood bench on Seashell beach in the evening and watch the sun go down.',
      '📸 Photo in the ☰ menu saves a picture of your hero right where they stand.',
      (A.snaps || []).length < LANDMARKS.length && `Take a 📸 Photo by each town's landmark (${(A.snaps || []).length} / ${LANDMARKS.length} so far).${(A.hats || []).includes('shutter') ? '' : ' The eight in Clashara earn a hat!'}`,
      F.rod && 'Night fishing catches fish you never see by day.',
      (A.hats || []).length && 'Change hats any time from ☰ → 🎩 Hats. Each hat has its own story.',
      seen.neon && 'The Neon City arcade pays berries for a good score, once a day per game.',
      seen.village && 'Grandpa\'s telescope in Sprout Village shows a new constellation each night.',
      seen.cloudtop && 'Toss a berry in the Cloudtop fountain for a wish, once a day.',
      F.crowned && 'Since you were crowned, route trainers want a rematch once a day, at your level.',
      pumpkinNights() && 'Pumpkin Nights: the pumpkins by town doors glow after dark, and Glowcap Woods has wisps to catch.',
      new Date().getMonth() === 9 && 'Autumn: run through the leaf piles by the trees. The first one of the day sometimes hides a berry.',
      pumpkinNights() && 'Pumpkin Nights: after dark the townsfolk dress up. Say "trick or treat" to six of them a night for candy berries!',
      twinkleWeek() && 'Twinkle Week: look under the tree by any Berry Center for a gift, once a day.',
      twinkleWeek() && 'Twinkle Week: after dark, talk to the townsfolk and sing a carol together. Six a night share a cocoa berry!',
      A.grown?.length && 'Your grown-up Daycare babies love a walk. Ask one at home, and it may find a berry on the way.',
    ].filter(Boolean);
    return tips[Math.floor(Date.now() / 864e5) % tips.length];
  }

  todayBadge() {
    const m = this.root.querySelector('.world-screen .wd-menu');
    if (!m || !save.adv) return;
    let n = 0;
    let daily = [];
    try { const { rows, after, night } = this.todayList(); n = rows.filter((r) => !r[3] && !r[5]).length + (night ? after.filter((r) => !r[3]).length : 0); daily = rows.filter((r) => !['🏔️', '🎣'].includes(r[0]) && !r[5]); } catch (e) { n = 0; }
    m.dataset.n = n > 9 ? '9+' : n || '';
    // a perfect day: every ☀️ daily row ticked (the weekly ones don't count) pays a bonus once a day
    const day = new Date().toISOString().slice(0, 10), A = save.adv;
    if (daily.length >= 6 && daily.every((r) => r[3]) && A.perfect !== day && !this.root.querySelector('.modal-wrap') && !this.worldObj?.dialog) {
      A.perfect = day; countUp('perfect'); save.berries = (save.berries || 0) + 5; persist(); sfx.jingle?.(3);
      this.toast(`🌟 A perfect day! Every daily thing done. +5 🍓`);
    }
  }

  worldJournal(tab = 'today') {
    if (this.root.querySelector('.modal-wrap')) return;
    const d = document.createElement('div');
    d.className = 'modal-wrap';
    const giver = (id) => { const lc = favourList().rows.find((r) => r.id === id)?.critter; if (lc) return CRITTERS.find((c) => c.id === lc); for (const M of Object.values(MAPS)) { const n = (M.npcs || []).find((x) => x.story === 'lost:' + id); if (n) return CRITTERS.find((c) => c.id === n.critter); } return null; };
    let body = '';
    if (tab === 'fav') {
      const { rows, unasked } = favourList();
      body = rows.map((r) => { const c = giver(r.id); return `<li class="jr-row ${r.state}">${c ? `<img src="${this.game.portrait(c)}" alt="">` : ''}<div><b>${r.toast} ${r.who} <small>${r.home}</small></b><span>${r.state === 'done' ? '✅ ' : r.state === 'found' || r.deliver ? '📦 ' : '🔍 '}${r.text}</span></div></li>`; }).join('')
        + (unasked ? `<li class="jr-more">❗ ${unasked} more townsfolk need a hand. Look for a ❗ over their heads!</li>` : rows.length ? '<li class="jr-more">🌟 You\'ve asked everyone in Clashara. What a good neighbour!</li>' : '');
    } else if (tab === 'rec') { // everything there is to find and beat, with how far along you are
      const R = this.records(), nx = [25, 50, 75, 100].find((p) => p > (save.adv.expl || 0));
      // the photo album: one polaroid per landmark (its photo, a 'snapped' card for photos taken before the album, or where to find it)
      const alb = albumGet(), snaps = save.adv.snaps || [];
      const card = (l) => alb[l.id] ? `<button class="al-card got" data-id="${l.id}"><img src="${alb[l.id]}" alt=""><b>${l.name}</b></button>`
        : snaps.includes(l.id) ? `<button class="al-card old"><i>📸</i><b>${l.name}</b><small>snap it again for the album</small></button>`
          : `<button class="al-card"><i>${save.adv.seen?.[l.map] ? '❔' : '🔒'}</i><b>${save.adv.seen?.[l.map] ? l.name : '???'}</b><small>${save.adv.seen?.[l.map] ? MAPS[l.map].name : 'somewhere new'}</small></button>`;
      body = R.body + `<li class="jr-head">📸 Photo album <small>${snaps.length}/${LANDMARKS.length}</small></li><li class="jr-album">${LANDMARKS.map(card).join('')}</li>`
        + (snaps.length < LANDMARKS.length ? '<li class="jr-more">Stand by a landmark and take a ☰ → 📸 Photo to add it.</li>' : '') + (nx ? `<li class="jr-more">🎁 Next reward at ${nx}% explored${nx === 100 ? ': something golden!' : '.'}</li>` : '<li class="jr-more">🌟 Every corner explored. Visit your statue in Sprout Village!</li>');
      this.exploreCheck(R.pc);
    } else if (tab === 'today') { // every daily thing in one list: done today, or where to go for it
      const { rows, after, night } = this.todayList();
      const row = ([ic, name, where, done]) => `<li class="jr-fish jr-day ${done ? 'got' : ''}"><span>${done ? '✅' : ic}</span><b>${name}</b><em>${done ? 'done' : where}</em></li>`;
      const all = [...rows, ...after], n = all.filter((r) => r[3]).length;
      // what's still to do comes first; the done rows fold into one line of ticked icons at the end of each section
      const sect = (list) => list.filter((r) => !r[3]).map(row).join('') + (list.some((r) => r[3]) ? `<li class="jr-done"><b>✅ Done</b>${list.filter((r) => r[3]).map(([ic, name]) => `<span title="${name}">${ic}</span>`).join('')}</li>` : '');
      body = `<li class="jr-head">☀️ Every day <small>${rows.filter((r) => r[3]).length}/${rows.length}</small></li>` + sect(rows)
        + (after.length ? `<li class="jr-head">🌙 After dark${night ? ` <small>${after.filter((r) => r[3]).length}/${after.length}</small>` : ' <small>(wait for the evening, or nap at home)</small>'}</li>` + sect(after) : '')
        + `<li class="jr-more">${n === all.length ? '🌟 Everything done today! See you tomorrow.' : `${n} of ${all.length} done today. ${save.adv.perfect === new Date().toISOString().slice(0, 10) ? '🌟 Perfect day bonus earned!' : 'Tick every ☀️ row for a perfect-day bonus!'}`}</li>`
        + `<li class="jr-tip">💡 ${this.tipOfDay()}</li>`;
    } else if (tab === 'champ') { // post-game (M4): the Battle Tower ladder, this week's Masters and Gauntlet, the legendaries and Dash
      const A = save.adv, F = A.flags, T = A.tower || {}, wk = gauntletWeek(), hats = A.hats || [], nm = (id) => CRITTERS.find((c) => c.id === id)?.name || id;
      const rowC = (ic, name, where, done) => `<li class="jr-fish jr-day ${done ? 'got' : ''}"><span>${done ? '✅' : ic}</span><b>${name}</b><em>${where}</em></li>`;
      const mDone = MASTERS.filter((_, i) => F[`mast_${wk}_${i}`]).length, gf = gauntletFoes(wk, A.hero), gDone = gf.filter((_, i) => F[`gaunt_${wk}_${i}`]).length;
      const left = 7 - ((Math.floor(Date.now() / 864e5) + 3) % 7);
      body = `<li class="jr-head">🗼 Battle Tower <small>best ${T.best || 0} · ${towerRank(T.best || 0)[2]} ${towerRank(T.best || 0)[1]}</small></li>`
        + `<li class="jr-more">🔥 Current streak: <b>${T.streak || 0}</b>${T.streak ? ` · next is battle ${T.streak + 1}${(T.streak + 1) % 7 === 0 ? ': Morra!' : ` (Morra at ${Math.ceil((T.streak + 1) / 7) * 7})`}` : ''} · ${T.wins || 0} Tower wins in all</li>`
        + TOWER_RANKS.slice(1).map(([n, name, ic, hat, b]) => rowC(ic, `${name} rank`, (T.best || 0) >= n ? `${SHOP_HATS.find((h) => h.id === hat)?.name}` : `${n} in a row · ${SHOP_HATS.find((h) => h.id === hat)?.name} +${b} 🍓`, (T.best || 0) >= n)).join('')
        + `<li class="jr-head">🌺 Sunscatter Masters <small>this week ${mDone}/4</small></li>`
        + MASTERS.map(([name, cr, title], i) => rowC('⭐', `${name} <small>${title}</small>`, F[`mast_${wk}_${i}`] ? 'beaten' : `shiny ${nm(cr)}`, F[`mast_${wk}_${i}`])).join('')
        + `<li class="jr-more">${mDone === 4 ? (F['mastpay_' + wk] ? '🌟 Cleared this week!' : '🌟 All four beaten! Talk to Marina in Port Coral.') : 'Champion Marina waits outside Coral Stadium.'} ${A.mastWins ? `Cleared ${A.mastWins} week${A.mastWins > 1 ? 's' : ''}${hats.includes('masterlei') ? " · Champion's Lei 🌺" : ''}.` : ''} New Masters in ${left} day${left > 1 ? 's' : ''}.</li>`
        + `<li class="jr-head">🏔️ Peak Gauntlet <small>this week ${gDone}/5</small></li>`
        + `<li class="jr-more">${gDone === 5 ? '🌟 Cleared this week!' : `Next: ${gf[gDone] ? nm(gf[gDone].id) : ''} on Champion's Peak (Keeper Orla).`} ${A.gauntWins ? `Cleared ${A.gauntWins} week${A.gauntWins > 1 ? 's' : ''}.` : ''}</li>`
        + `<li class="jr-head">✨ Legendary critters <small>${['solmoth', 'moonwhal', 'verdelk'].filter((id) => F['legend_' + id]).length}/3</small></li>`
        + rowC('🌞', 'Solmoth <small>Dawn Moth</small>', F.legend_solmoth ? 'befriended' : F.festlamp_done ? 'rests on the Caldera Rim' : 'waits for a festival…', F.legend_solmoth)
        + rowC('🌙', 'Moonwhal <small>Moon Narwhal</small>', F.legend_moonwhal ? 'befriended' : F.tower_bronze ? 'Starfall beach, after dark' : 'sings for a Tower hero…', F.legend_moonwhal)
        + rowC('🌿', 'Verdelk <small>Grove Elk</small>', F.legend_verdelk ? 'befriended' : F.grove4_done ? 'Glowcap Woods, by the pond' : F.grove1_asked ? 'the Heartseed chain…' : 'sleeps under Glowcap Woods…', F.legend_verdelk)
        + `<li class="jr-head">📖 Critterdex <small>${save.unlocked.length}/${CRITTERS.length}</small></li>`
        + rowC('✨', 'Shiny Charm', F.shinycharm ? 'twice the shinies!' : `befriend every critter · ${CRITTERS.length - CRITTERS.filter((c) => save.unlocked.includes(c.id)).length} to go`, F.shinycharm)
        + `<li class="jr-head">⚡ Rival Dash</li>`
        + rowC('🔥', 'Rival Showdown', F.dash_show ? (hats.includes('rivalband') ? "won · Dash's Headband" : 'won! Talk to Dash') : 'Starfall Atoll', F.dash_show)
        + (F.dash_show ? rowC('⚔️', "Today's island rematch", F['dashisle_' + new Date().toISOString().slice(0, 10)] ? 'done' : 'Starfall Atoll', F['dashisle_' + new Date().toISOString().slice(0, 10)]) : '');
    } else if (tab === 'night') { // the star log (Sprout Village's telescope) and the bottle notes read on Seashell's shore
      const seen = save.adv.consts || [], read = save.adv.notes || [];
      body = `<li class="jr-head">🔭 Star log <small>${seen.length}/${CONSTELLATIONS.length}</small></li>`
        + `<li class="jr-stars">${CONSTELLATIONS.map((c) => `<span class="${seen.includes(c.id) ? 'got' : ''}">${seen.includes(c.id) ? '✨ ' + c.name : '❔ ???'}</span>`).join('')}</li>`
        + (seen.length ? '' : '<li class="jr-more">Grandpa\'s telescope stands by the trees in Sprout Village. Look through it after dark!</li>')
        + `<li class="jr-head">🍾 Bottle notes <small>${read.length}/${BOTTLE_NOTES.length}</small></li>`
        + (read.length ? [...read].sort((a, b) => a - b).map((i) => `<li class="jr-note">${BOTTLE_NOTES[i].replace(/\(signed\) (.*)$/, '<em>— $1</em>')}</li>`).join('') : '<li class="jr-more">A bottle washes up on Seashell Town\'s shore most nights. Pop the cork!</li>');
    } else {
      const L = save.adv.fishLog || { n: 0 }, sp = { ...(L.sp || {}) };
      if (L.best && !sp[L.best.name]) sp[L.best.name] = L.best.cm;
      const where = { pond: '🌿 Ponds & rivers', sea: '🏖️ The sea', isle: '🏝️ Island reefs', lava: '🌋 Lava pools', cold: '❄️ Icy water', night: '🌙 After dark (any water)', dusk: '🌇 Golden evenings (any water)' };
      const D = derbyOf(gauntletWeek());
      body = (save.adv.flags.rod ? `<li class="jr-more">🏆 This week's Fishing Derby: a ${D.name} of ${D.cm} cm or more (${D.where}). ${save.adv.derbyWk === D.wk ? '✅ Won! A new fish on Monday.' : 'Fisher Finn has a prize!'}</li>` : '<li class="jr-more">🎣 Fisher Finn in Seashell Town lends out rods. Then face any water and press A!</li>')
        + Object.entries(FISH).map(([k, list]) => `<li class="jr-head">${where[k]}</li>` + list.map(([n], i) => { const cm = sp[n]; return `<li class="jr-fish ${cm ? 'got' : ''}"><span>${cm ? '🐟' : '❔'}</span><b>${cm || n === D.name ? n : '???'}${i === list.length - 1 ? ' <small>rare</small>' : ''}${n === D.name && save.adv.flags.rod ? ' <small class="dby">🎯 derby</small>' : ''}</b><em>${cm ? cm + ' cm' : ''}${L.best?.name === n ? ' 🏅' : ''}</em></li>`; }).join('')).join('')
        + `<li class="jr-head">🗓️ Seasonal visitors (one a season · catch all four for a hat!)</li>` + Object.entries(SEASON_FISH).map(([k, [n, , , em]]) => { const cm = L.season?.[n], now = seasonKey() === k; return `<li class="jr-fish ${cm ? 'got' : ''}"><span>${cm ? em : '❔'}</span><b>${cm || now ? n : '???'} <small>${k}${now ? ' · now!' : ''}</small></b><em>${cm ? cm + ' cm' : ''}</em></li>`; }).join('')
        + `<li class="jr-more">${Object.keys(sp).length}/${Object.values(FISH).flat().length} kinds${L.season ? ` · ${Object.keys(L.season).length}/4 seasonal` : ''} · ${L.n || 0} caught${save.adv.gems ? ` · 💎 ${save.adv.gems} ice gem${save.adv.gems > 1 ? 's' : ''}` : ''}${save.adv.emberGems ? ` · 🔥 ${save.adv.emberGems} ember gem${save.adv.emberGems > 1 ? 's' : ''}` : ''}</li>`;
    }
    d.innerHTML = `<div class="modal wd-journal"><h2>Journal</h2>
      <div class="jr-tabs"><button data-t="today" class="${tab === 'today' ? 'on' : ''}">📅 Today</button><button data-t="fav" class="${tab === 'fav' ? 'on' : ''}">🤝 Favours</button><button data-t="fish" class="${tab === 'fish' ? 'on' : ''}">🐟 Fish</button><button data-t="night" class="${tab === 'night' ? 'on' : ''}">🌌 Night</button><button data-t="rec" class="${tab === 'rec' ? 'on' : ''}">🏅 Records</button>${save.adv.flags.sunstone ? `<button data-t="champ" class="${tab === 'champ' ? 'on' : ''}">🏆 Champ</button>` : ''}</div>
      <ul class="jr-list">${body || '<li class="jr-more">Nobody has asked for help yet. Townsfolk with a ❗ over their heads have a favour to ask!</li>'}</ul>
      <div class="res-btns"></div></div>`;
    const close = () => { d.remove(); this.game.modalClose = null; };
    d.querySelectorAll('.al-card.got').forEach((c) => c.addEventListener('click', () => { // a big look at an album photo; tap anywhere to put it back
      sfx.ui('ok'); const v = document.createElement('div'); v.className = 'al-view'; v.innerHTML = `<figure><img src="${albumGet()[c.dataset.id]}" alt=""><figcaption>${c.querySelector('b').textContent}</figcaption></figure>`;
      v.addEventListener('click', () => { sfx.ui('back'); v.remove(); }); d.appendChild(v);
    }));
    d.querySelectorAll('.jr-tabs button').forEach((t) => t.addEventListener('click', () => { if (t.dataset.t === tab) return; sfx.ui('ok'); close(); this.worldJournal(t.dataset.t); }));
    d.querySelector('.res-btns').appendChild(this.btn('Close', 'ghost', () => { close(); this.worldMenu(); }));
    this.game.modalClose = close;
    this.root.appendChild(d);
  }

  // Adventure wardrobe / Hat Shop: the hero wearing each hat they own; tap to put it on
  hatGrid(q, hats, onWear, onDone, buy = false) {
    const d = document.createElement('div');
    d.className = 'modal-wrap';
    const h = heroDef(), cur = () => save.adv.hat || '';
    const list = buy ? hats : [{ id: '', name: 'No hat' }, ...hats];
    d.innerHTML = `<div class="modal hat-pick"><h2>${buy ? 'Hat Shop' : 'Hats'}</h2><p>${q}${buy ? ` <b class="hat-purse">🍓 ${save.berries || 0}</b>` : ''}</p><div class="hero-grid">${list.map((x) => `<button data-id="${x.id}" class="${!buy && cur() === x.id ? 'on' : ''} ${buy && (save.berries || 0) < x.price ? 'dear' : ''}"><img src="${this.game.portrait(h, 128, false, x.id || 'none')}" alt=""><span>${x.name}</span>${buy ? `<em>${x.price} 🍓</em>` : ''}</button>`).join('')}</div><div class="res-btns"></div></div>`;
    const close = () => { d.remove(); this.game.modalClose = null; onDone?.(); };
    d.querySelectorAll('.hero-grid button').forEach((b) => b.addEventListener('click', () => {
      sfx.ui('ok');
      if (buy) { d.remove(); this.game.modalClose = null; return onWear(b.dataset.id); }
      onWear(b.dataset.id || null);
      d.querySelectorAll('.hero-grid button').forEach((o) => o.classList.toggle('on', o === b));
    }));
    d.querySelector('.res-btns').appendChild(this.btn(buy ? 'Back' : 'Done', buy ? 'ghost' : 'primary', close));
    this.game.modalClose = close;
    this.root.appendChild(d);
  }

  // the map of Clashara: where you've been, where the cups are, and fly back to any town you've visited
  worldMap() {
    if (this.root.querySelector('.modal-wrap')) return;
    const w = this.worldObj; if (!w) return;
    const F = save.adv.flags, seen = save.adv.seen ||= {};
    const here = w.key.startsWith('in:') ? w.key.split(':')[1] : w.key;
    seen[here] = true;
    const tt = traderTown(); // 🎩 marks where Trader Tock is today
    const dig = new Set(digLeft(MAPS)); // ⛏ a dig spot still waiting today
    const al = alphaToday(); // 💥 where today's Alpha waits
    const gnt = F.ending && !F['gauntpay_' + gauntletWeek()] && !MAPS[here]?.isle; // ⚔️ this week's Peak Gauntlet is still open
    const btl = !MAPS[here]?.isle && w.outPhase === 'night' && seen.seashell && save.adv.bottle !== new Date().toISOString().slice(0, 10); // 🍾 tonight's message in a bottle is still on Seashell's shore
    const scope = !MAPS[here]?.isle && w.outPhase === 'night' && seen.village && save.adv.stars !== new Date().toISOString().slice(0, 10); // 🔭 tonight's constellation in Sprout Village is still to be spotted
    const day = new Date().toISOString().slice(0, 10), daily = { cloudtop: save.adv.wish !== day && '⛲', ember: save.adv.soak !== day && '♨️', glowcap: w.outPhase === 'night' && save.adv.ring !== day && '🍄', village: w.morning && save.adv.breakfast !== day && '🥞', seashell: ((w.outPhase === 'evening' && save.adv.sunset !== day ? '🌅' : '') + (save.adv.flags.rod && save.adv.derbyWk !== gauntletWeek() ? '🎣' : '') + (isSummer() && w.outPhase === 'day' && save.adv.melon !== day ? '🍉' : '')) || false, frostpeak: save.adv.snowball !== day && '⛄', bloom: (save.adv.garden?.stage >= 4 || save.adv.garden?.last !== day) && '🌻', route2: save.adv.twig !== day && '🪵', route1: (isSpring() || isMeadow()) && w.outPhase === 'day' && save.adv.picnic !== day && '🧺' }; // (+ the summer watermelon and the spring picnic) // a wish, a soak and tonight's fairy-ring song still to do
    const snap = new Set(LANDMARKS.filter((l) => !(save.adv.snaps || []).includes(l.id)).map((l) => l.map)); // 📸 a landmark here still to photograph (the name gets a little camera)
    const fav = {}; for (const r of favourList().rows) if (r.at && !fav[r.at]) fav[r.at] = r.state === 'found' || r.deliver ? '📦' : '🔍'; // open favours: where to look, or who to take it back to
    // older saves: towns behind a cleared cup were visited
    // Chapter 2: out in the Sunscatter Isles the map shows the islands instead (you sail between the two by ferry)
    const isle = !!MAPS[here]?.isle, NM = isle ? Object.fromEntries(Object.entries(IMAP).filter(([k]) => MAPS[k])) : WMAP;
    for (const [k, n] of Object.entries(NM)) if (n.cup && F['cup_' + n.cup]) seen[k] = true;
    const links = (isle ? ILINKS : [['village', 'route1'], ['route1', 'bloom'], ['bloom', 'route2'], ['route2', 'seashell'], ['seashell', 'glowwood'], ['glowwood', 'glowcap'], ['glowcap', 'cinder'], ['cinder', 'ember'], ['ember', 'neon'], ['neon', 'cloudtop', 1], ['cloudtop', 'frostpeak', 1], ['frostpeak', 'peak']]).filter(([a, b]) => NM[a] && NM[b]);
    const d = document.createElement('div');
    d.className = 'modal-wrap';
    const svg = links.map(([a, b, air]) => { const A = NM[a], B = NM[b], on = seen[a] && seen[b]; return `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" class="${air ? 'air' : ''} ${on ? 'on' : ''}"/>`; }).join('')
      + Object.entries(NM).map(([k, n]) => {
        const v = seen[k], won = n.cup && F['cup_' + n.cup], town = !!n.fly;
        return `<g class="wm-node ${v ? 'seen' : ''} ${town ? 'town' : ''} ${k === here ? 'here' : ''}" data-k="${k}" transform="translate(${n.x} ${n.y})">
          <circle r="${town ? 11 : 7}"/>${won ? '<text class="wm-cup" y="5">🏆</text>' : ''}${v && k !== 'peak' && [0, 1].some((j) => !F[`it_${k}_${j}`]) ? `<text class="wm-gift" x="${town ? -10 : -7}" y="${town ? -7 : -4}">🎁</text>` : ''}${k === tt ? '<text class="wm-gift" x="11" y="-7">🎩</text>' : ''}${gnt && k === 'peak' ? `<text class="wm-gift" x="${town ? -10 : -7}" y="${town ? -7 : -4}">⚔️</text>` : ''}${al && !al.done && al.map === k ? `<text class="wm-gift wm-dig" x="${town ? 19 : 15}" y="${town ? 6 : 5}">💥</text>` : ''}${v && dig.has(k) ? `<text class="wm-gift wm-dig" x="${town ? -19 : -15}" y="${town ? 6 : 5}">⛏️</text>` : ''}${btl && k === 'seashell' ? `<text class="wm-gift wm-dig" x="-27" y="-8">🍾</text>` : ''}${scope && k === 'village' ? `<text class="wm-gift wm-dig" x="22" y="-4">🔭</text>` : ''}${v && daily[k] ? `<text class="wm-gift wm-dig" x="${k === 'glowcap' ? 25 : -27}" y="${k === 'glowcap' ? 2 : -8}">${daily[k]}</text>` : ''}${fav[k] ? `<text class="wm-gift wm-fav" x="${town ? 11 : 8}" y="${town ? 12 : 9}">${fav[k]}</text>` : ''}
          <text class="wm-name" y="${n.ly || (town ? 24 : 19)}">${v ? MAPS[k].name : '???'}${v && snap.has(k) ? ' 📸' : ''}</text></g>`;
      }).join('');
    const hp = NM[here];
    const ph = this.worldObj?.phase || 'day', stars = ph === 'night' ? [[30, 30], [120, 12], [210, 240], [260, 10], [392, 200], [12, 150], [360, 238], [70, 244], [330, 14], [395, 40]].map(([x, y], k) => `<circle cx="${x}" cy="${y}" r="${k % 3 ? 1.4 : 2.2}" class="wm-star"/>`).join('') : '';
    d.innerHTML = `<div class="modal wd-map ${ph}"><h2>${isle ? 'Sunscatter Isles' : 'Clashara'}</h2>
      <svg viewBox="0 0 400 250" class="wm"><rect x="0" y="0" width="400" height="250" rx="18" class="wm-sea"/>${stars}
      ${isle ? ISLE_LAND : '<path class="wm-land" d="M18 238 L18 70 Q20 20 90 22 L300 18 Q385 22 385 90 L380 160 Q378 205 330 214 L230 216 Q215 244 150 242 Z"/>'}${(isle ? ISLE_DECOR : [['🌲', 220, 34], ['🌲', 150, 40], ['🌋', 372, 78], ['🏙️', 372, 210], ['☁️', 290, 232], ['🏔️', 118, 150], ['🌊', 236, 128], ['🌸', 90, 196]]).map(([e, x, y]) => `<text class="wm-deco" x="${x}" y="${y}">${e}</text>`).join('')}${svg}
      ${hp ? `<image href="${this.game.portrait(heroDef())}" x="${hp.x + 4}" y="${hp.y - 34}" width="30" height="30" class="wm-hero"/>` : ''}</svg>
      <p class="wm-tip">${Object.values(seen).length > 1 ? 'Tap a town you\'ve visited to fly there by mail balloon.' : 'Explore to fill in the map!'}</p>
      ${Object.values(seen).length > 1 ? `<p class="wm-key">${[['🎁', 'gift'], tt && ['🎩', 'Trader Tock'], [...dig].some((k) => seen[k]) && ['⛏️', 'dig today'], al && !al.done && ['💥', 'Alpha'], gnt && ['⚔️', 'Gauntlet'], btl && ['🍾', 'bottle'], scope && ['🔭', 'stars'], Object.keys(daily).some((k) => seen[k] && daily[k]) && ['✨', `${Object.keys(daily).filter((k) => seen[k] && daily[k]).map((k) => daily[k]).join('')} daily`], Object.keys(fav).length && ['🔍', 'lost thing'], Object.values(fav).includes('📦') && ['📦', 'deliver'], [...snap].some((k) => seen[k]) && ['📸', 'photo spot']].filter(Boolean).map(([i, t]) => `<span>${i} ${t}</span>`).join('')}</p>` : ''}
      <div class="res-btns"></div></div>`;
    const close = () => { d.remove(); this.game.modalClose = null; };
    d.querySelector('.res-btns').appendChild(this.btn('Close', 'ghost', close));
    d.querySelectorAll('.wm-node.town.seen').forEach((g) => g.addEventListener('click', () => {
      const k = g.dataset.k, n = NM[k];
      if (k === here && !w.key.startsWith('in:')) { this.toast('📍 You are here!'); return; }
      sfx.ui('ok'); close();
      const [x, y] = n.fly;
      w.fade(() => { w.load(k, x, y, 's'); this.toast(`🎈 Flew to ${MAPS[k].name}!`); });
    }));
    this.game.modalClose = close;
    this.root.appendChild(d);
  }

  // a walking buddy: any other team critter can tag along behind the hero
  buddyPick() {
    const g = this.game, d = document.createElement('div');
    d.className = 'modal-wrap';
    const team = CRITTERS.filter((c) => save.unlocked.includes(c.id) && c.id !== save.adv.hero);
    d.innerHTML = `<div class="modal hero-pick"><h2>Walking buddy</h2><p>${save.adv.follow ? 'Pip is following you right now! Your buddy will be back once Pip is home.' : save.adv.walk ? `${byId(save.adv.walk.id)?.name || 'Your little one'} is out on a walk with you! Your buddy takes over once it heads home.` : 'Who comes along for the walk?'}</p><div class="hero-grid">${team.map((c) => `<button data-id="${c.id}" class="${save.adv.buddy === c.id ? 'on' : ''}${save.adv.care?.id === c.id ? ' off' : ''}"><img src="${g.portrait(skinOf(c))}" alt=""><span>${grown(c, save.critters[c.id].level).name}</span><small class="hp-sub"><b class="mini-type" style="background:${TYPES[c.type].color}">${TYPES[c.type].name}</b> Lv ${save.critters[c.id].level}</small></button>`).join('')}</div></div>`;
    const close = () => { d.remove(); this.game.modalClose = null; };
    d.querySelectorAll('.hero-grid button').forEach((btn) => btn.addEventListener('click', () => {
      if (btn.dataset.id === save.adv.care?.id) { sfx.ui('back'); return this.toast('🧸 That one is playing at the Daycare. Ask Nanny Nell at a Berry Center!'); }
      sfx.ui('ok'); close();
      save.adv.buddy = btn.dataset.id; persist();
      this.worldObj?.refreshFollower();
    }));
    const row = document.createElement('div'); row.className = 'res-btns';
    row.append(this.btn('Walk alone', 'ghost', () => { close(); save.adv.buddy = null; persist(); this.worldObj?.refreshFollower(); }), this.btn('Back', 'ghost', close));
    d.querySelector('.modal').appendChild(row);
    this.game.modalClose = close;
    this.root.appendChild(d);
  }

  // the Berry Center's Critter Box: swap which team critter leads the Adventure (the story carries on with them)
  leadPick(w, mode) { // mode 'care': pick who stays at Nanny Nell's Daycare instead
    const g = this.game, d = document.createElement('div'), care = mode === 'care';
    d.className = 'modal-wrap';
    const team = CRITTERS.filter((c) => save.unlocked.includes(c.id)), cur = save.adv.hero, away = save.adv.care?.id;
    d.innerHTML = `<div class="modal hero-pick"><h2>${care ? 'Critter Daycare' : 'Critter Box'}</h2><p>${care ? 'Who stays with Nanny Nell? It trains while you walk. (Your lead keeps walking with you.)' : 'Who leads the way? Your lead walks the world and fights every battle.'}</p><div class="hero-grid">${team.map((c) => `<button data-id="${c.id}" class="${c.id === (care ? '' : cur) ? 'on' : ''}${(care ? c.id === cur : c.id === away) ? ' off' : ''}"><img src="${g.portrait(skinOf(c))}" alt=""><span>${grown(c, save.critters[c.id].level).name}</span><i>${(care ? c.id === cur : c.id === away) ? (care ? 'Lead' : '🧸 Daycare') : 'Lv' + save.critters[c.id].level}</i></button>`).join('')}</div></div>`;
    const close = () => { d.remove(); this.game.modalClose = null; };
    d.querySelectorAll('.hero-grid button').forEach((btn) => btn.addEventListener('click', () => {
      const id = btn.dataset.id, name = grown(byId(id), save.critters[id].level).name;
      if (care) {
        if (id === cur) { sfx.ui('back'); return this.toast(`${name} is leading the way. Pick someone else!`); }
        close(); sfx.ui('ok');
        save.adv.care = { id, at: save.adv.steps || 0, lv0: save.critters[id].level };
        if (save.adv.buddy === id) { save.adv.buddy = null; w.refreshFollower?.(); }
        persist();
        return w.fade(() => { w.load(w.key, w.hx, w.hy, w.dir); sfx.jingle?.(1); w.say([`Nanny Nell: ${name} is in safe paws! Off you go. Every step you walk helps it grow.`, 'Nanny Nell: Come back to any Berry Center when you want it back.'], null, 'Nanny Nell'); });
      }
      if (id === away) { sfx.ui('back'); return this.toast(`🧸 ${name} is at the Daycare. Ask Nanny Nell for it first!`); }
      close();
      if (id === cur) { sfx.ui('ok'); return w.say(['{hero} is already leading the way. Onward!']); }
      sfx.ui('ok');
      if (save.adv.buddy === id) save.adv.buddy = cur; // the old lead walks behind instead
      save.adv.hero = id; persist();
      w.fade(() => { w.load(w.key, w.hx, w.hy, w.dir); sfx.jingle?.(1); w.say([`Whirr... ding! {hero} takes the lead! ${grown(byId(cur), save.critters[cur].level).name} hops into the box for a rest.`]); });
    }));
    const row = document.createElement('div'); row.className = 'res-btns';
    row.append(this.btn('Back', 'ghost', close));
    d.querySelector('.modal').appendChild(row);
    this.game.modalClose = close;
    this.root.appendChild(d);
  }

  // who is the hero? any recruited critter can be
  heroPick() {
    const g = this.game;
    const d = document.createElement('div');
    d.className = 'modal-wrap';
    const team = CRITTERS.filter((c) => save.unlocked.includes(c.id));
    d.innerHTML = `<div class="modal hero-pick"><h2>Who is the hero?</h2><p>Every critter dreams of the Critter Crown. Whose story is this?</p><div class="hero-grid">${team.map((c) => `<button data-id="${c.id}"><img src="${g.portrait(skinOf(c))}" alt=""><span>${grown(c, save.critters[c.id].level).name}</span><small class="hp-sub"><b class="mini-type" style="background:${TYPES[c.type].color}">${TYPES[c.type].name}</b> Lv ${save.critters[c.id].level}</small></button>`).join('')}</div></div>`;
    d.querySelectorAll('.hero-grid button').forEach((btn) => btn.addEventListener('click', () => {
      sfx.ui('ok');
      d.remove(); this.game.modalClose = null;
      newAdventure(btn.dataset.id);
      this.adventure();
    }));
    const close = this.btn('Back', 'ghost', () => { d.remove(); this.game.modalClose = null; });
    d.querySelector('.modal').appendChild(close);
    this.game.modalClose = () => { d.remove(); this.game.modalClose = null; };
    this.root.appendChild(d);
  }

  // a fight from the world: wild critters, trainers and story battles
  worldFight(info) {
    const g = this.game, h = heroDef(), lv = save.critters[h.id].level, arena = this.worldObj?.M.arena || 'meadow', place = this.worldObj?.M.name, phase = this.worldObj?.phase, rain = this.worldObj?.rain;
    this.ctx = { kind: 'world', fight: info.kind, flag: info.flag, name: info.name, note: info.note, recruit: info.recruit, berries: info.berries, shiny: info.shiny, arena, rain };
    this.leaveWorld();
    this.mode = 'vs';
    g.startBattle(h, info.foe, {
      cpuLevel: info.kind === 'wild' ? info.lv : storyLevel(info.lv, lv), playerLevel: lv, difficulty: info.diff ?? 0.3, arena,
      rounds: info.kind === 'wild' ? 1 : 2, trainer: info.trainer || null, stageName: place,
      stageSub: info.kind === 'wild' ? `${info.name} appeared!` : info.kind === 'story' ? 'Story battle' : `${info.name} wants to battle!`,
    });
    g.arena.setOpen(true); // out in the wild: no stadium, just the meadow
    if (phase && (phase !== 'day' || rain)) g.arena.tint(phase, rain);
  }

  worldCup(cup, front) {
    save.adv.x = front.x; save.adv.y = front.y; save.adv.dir = 's'; persist();
    this.leaveWorld();
    this.ctx = { kind: 'cup', cup, idx: 0, adv: true };
    this.sel = CRITTERS.findIndex((c) => c.id === save.adv.hero);
    this.mode = 'ladder';
    this.ladder();
  }

  worldDoor(b, w) { doorAction(this, b, w); }
  worldStory(id, w, a) { storyTalk(this, id, w, a); }
  worldStoryStep(w) { return storyStep(this, w); }

  camp() {
    const g = this.game;
    g.endBattle();
    g.setArena('meadow');
    this.mode = 'camp';
    const team = CRITTERS.filter((c) => save.unlocked.includes(c.id)).map(skinOf);
    g.setShowcase(team, 'line');
    this.root.innerHTML = `<div class="camp-screen"><div class="camp-touch"></div>
      <div class="camp-berries">🍓 <b>${save.berries || 0}</b></div>
      <button class="camp-toy">⚽ Toss ball</button>
      <div class="camp-panel"></div></div>`;
    const S = this.root.querySelector('.camp-screen');
    S.prepend(this.header('Critter Camp', () => this.title()));
    this.campObj?.dispose();
    this.campObj = new Camp(this, team);
    S.querySelector('.camp-touch').addEventListener('pointerdown', (e) => this.campObj?.tap(e.clientX, e.clientY));
    S.querySelector('.camp-toy').addEventListener('click', () => this.campObj?.toss());
    this.campObj.panel();
    playMusic('camp');
    // once a day the camp has a little basket of berries waiting
    const day = new Date().toISOString().slice(0, 10);
    if (save.giftDay !== day) {
      save.giftDay = day;
      save.berries = (save.berries || 0) + 2;
      persist();
      setTimeout(() => { if (this.mode !== 'camp') return; this.toast('🧺 Daily gift: +2 berries!'); sfx.jingle(2); this.campObj?.panel(); }, 700);
    }
  }

  badgeModal() {
    const st = save.stats;
    // [have, need] for badges that count something; locked ones show a little progress bar
    const BADGE_PROG = {
      ten: (s) => [st.wins || 0, 10], combo: (s) => [st.bestCombo || 0, 10], super: (s) => [st.supers || 0, 10], counter: (s) => [st.counters || 0, 5],
      roster: (s) => [s.unlocked.length, CRITTERS.length], streak5: (s) => [st.bestStreak || 0, 5], streak10: (s) => [st.bestStreak || 0, 10],
      snack: (s) => [st.fed || 0, 10], streak7: (s) => [st.bestDaily || 0, 7], tricks: (s) => [(st.hazardArenas || []).length, 6],
      trials: (s) => [Object.values(s.trials || {}).reduce((a, n) => a + n, 0), 18], shiny: (s) => [(s.shinies || []).length, CRITTERS.length],
      friend: (s) => [Math.max(0, ...Object.values(s.critters).map((c) => c.pets || 0)), 20],
    };
    const d = document.createElement('div');
    d.className = 'modal-wrap';
    // earned badges first so new ones aren't buried among 30 locks
    const has = (b) => !!save.badges?.[b.id], list = [...BADGES.filter(has), ...BADGES.filter((b) => !has(b))];
    d.innerHTML = `<div class="modal badges-modal"><h2>Badges <small class="badge-count">${BADGES.filter(has).length}/${BADGES.length}</small></h2><div class="badge-grid">${list.map((b) => {
      const got = save.badges?.[b.id];
      const pr = !got && BADGE_PROG[b.id]?.(save);
      return `<div class="badge ${got ? 'got' : ''}"><i>${got ? b.icon : '🔒'}</i><b>${b.name}</b><small>${b.desc}</small>${pr ? `<em class="badge-prog"><i style="width:${Math.min(100, (pr[0] / pr[1]) * 100)}%"></i><span>${Math.min(pr[0], pr[1])}/${pr[1]}</span></em>` : ''}</div>`;
    }).join('')}</div></div>`;
    d.querySelector('.modal').appendChild(this.btn('Close', 'primary', () => d.remove()));
    d.addEventListener('click', (e) => { if (e.target === d) d.remove(); });
    this.root.appendChild(d);
  }

  // Professor Pecan pops in with a few lines of story; tap to skip the typing, Next to go on
  profTalk(lines, done) {
    const d = document.createElement('div');
    d.className = 'prof-wrap';
    d.innerHTML = `<div class="prof"><div class="prof-icon">${PROF_SVG}</div><div class="prof-box"><small>Professor Pecan</small><p class="prof-text"></p><div class="prof-ctrl"></div></div></div>`;
    this.root.appendChild(d);
    const text = d.querySelector('.prof-text'), ctrl = d.querySelector('.prof-ctrl');
    const name = save.trainer?.name || 'Trainer';
    let k = 0;
    const show = () => {
      const msg = lines[k].replaceAll('{name}', name);
      let i = 0;
      text.textContent = ''; ctrl.innerHTML = '';
      clearInterval(this._profT);
      const finish = () => {
        clearInterval(this._profT);
        text.textContent = msg;
        if (ctrl.childElementCount) return;
        const last = k === lines.length - 1;
        ctrl.appendChild(this.btn(last ? "Let's go!" : 'Next', 'primary', () => { if (last) { d.remove(); done?.(); } else { k++; show(); } }));
      };
      const [ms, step] = typeSpeed();
      this._profT = setInterval(() => {
        if (!d.isConnected) return clearInterval(this._profT);
        i += step; text.textContent = msg.slice(0, i);
        if (i % 3 === 0 || step > 1) sfx.ui('move');
        if (i >= msg.length) finish();
      }, ms + 4);
      // tapping anywhere finishes the line, a second tap moves on (like the Next button)
      d.onclick = (e) => { if (e.target.closest('button')) return; if (text.textContent === msg && ctrl.firstElementChild) ctrl.firstElementChild.click(); else finish(); };
    };
    show();
    return d;
  }

  // ---------- tournament ladder ----------
  ladder() {
    const g = this.game;
    const { cup, idx } = this.ctx;
    this.mode = 'ladder';
    const m = cup.matches[idx];
    const foe = skinned(byId(m.critter), m.skin);
    if (!g.autoplay) g.setArena(cup.arena); // a preview of where the match will be fought
    g.setShowcase([foe], 'single');
    g.showcase[0].cheer = 1;
    this.root.innerHTML = `
      <div class="ladder-screen" style="--tc:${cup.color}">
        <div class="ladder">${cup.matches.map((mm, k) => `
          <div class="rung ${k < idx ? 'beat' : k === idx ? 'now' : ''} ${mm.boss ? 'boss' : ''}">
            <img src="${g.portrait(skinned(byId(mm.critter), mm.skin))}" alt=""><span>${mm.name}</span>${k < idx ? '<b>✓</b>' : ''}
          </div>`).join('<i class="rung-link"></i>')}
        </div>
        <div class="trainer-card">
          <div class="tc-title">${m.boss ? (m.bossTitle || 'CHAMPION') + ' · ' : ''}${m.title}</div>
          <h2>${m.name}</h2>
          <div class="bubble">“${m.taunt.replaceAll('{name}', save.trainer?.name || 'Trainer')}”</div>
          <div class="tc-critter"><span class="mini-type" style="background:${TYPES[foe.type].color}">${TYPES[foe.type].name}</span> ${m.skin ? '✦ Shiny ' : ''}${foe.name} · Lv ${m.level}</div>
          <div class="tc-style">${STYLE_TAG[m.style] || ''}</div>${(m.mods || []).map((k) => `<div class="tc-style mod">${MODS[k].icon} ${MODS[k].name}</div>`).join('')}
          <div class="go"></div>
        </div>
      </div>`;
    this.root.firstElementChild.prepend(this.header(`${cup.name} · Battle ${idx + 1}/${cup.matches.length}`, () => (this.ctx.adv ? this.adventure() : this.select())));
    this.root.querySelector('.go').appendChild(this.btn('Battle!', 'primary big', () => this.vs()));
    sfx.voice(foe.voice, 'taunt');
    // the professor sets the scene the first time you enter each cup
    if (idx === 0 && cup.intro && !save.cupIntro?.[cup.id] && !g.autoplay) {
      (save.cupIntro ||= {})[cup.id] = true;
      persist();
      this.profTalk(cup.intro);
    }
  }

  // ---------- VS ----------
  vs() {
    const g = this.game;
    if (this.mode !== 'select' && this.mode !== 'ladder') return;
    this.mode = 'vs';
    const p = skinOf(CRITTERS[this.sel]);
    let c, opts, label;
    if (this.ctx.kind === 'cup') {
      const { cup, idx } = this.ctx;
      const m = cup.matches[idx];
      c = withGear(skinned(byId(m.critter), m.skin), m.level);
      const k = cup.matches.length > 1 ? idx / (cup.matches.length - 1) : 1;
      opts = { cpuLevel: m.level, difficulty: cup.diff[0] + (cup.diff[1] - cup.diff[0]) * k, playerLevel: save.critters[p.id].level, trainer: m, arena: cup.arena, mods: m.mods || [] };
      label = `${m.name} · Lv ${m.level}${m.mods?.length ? ' · ' + m.mods.map((k) => MODS[k].icon).join('') : ''}`;
    } else if (this.ctx.kind === 'survival') {
      const S = this.ctx, n = S.streak;
      // every 5th challenger is a Gatekeeper: shiny, grown two levels ahead, and worth a reward
      const gate = (n + 1) % 5 === 0;
      const pool = CRITTERS.filter((x) => x.id !== p.id && x.id !== S.last);
      const pl = save.critters[p.id].level;
      c = skinned(pick(pool), gate || (n >= 4 && Math.random() < 0.25) ? 'shiny' : 'base');
      S.last = c.id;
      const mods = n >= 3 && Math.random() < 0.5 ? [pick(Object.keys(MODS))] : [];
      // Stadium Mayhem needs a stadium with hazards
      const arena = MODS[mods[0]]?.hazard && save.settings.hazards !== false ? pick(ARENA_KEYS.filter((k) => HAZARDS[k])) : pick(ARENA_KEYS);
      if (MODS[mods[0]]?.hazard && save.settings.hazards === false) mods.length = 0;
      opts = { cpuLevel: pl + Math.floor(n / 2) + (gate ? 2 : 0), difficulty: Math.min(0.95, 0.35 + n * 0.07 + (gate ? 0.08 : 0)), playerLevel: pl, arena, rounds: 1, playerHp: S.hp, mods, stageSub: gate ? `Gatekeeper #${n + 1}` : undefined };
      label = `${gate ? '⭐ Gatekeeper' : 'Challenger'} #${n + 1}${mods.length ? ' · ' + MODS[mods[0]].icon : ''}`;
    } else if (this.ctx.kind === 'bossrush') {
      const S = this.ctx, list = bossList(), m = list[S.idx];
      const pl = save.critters[p.id].level;
      c = withGear(skinned(byId(m.critter), m.skin), m.level);
      opts = { cpuLevel: Math.max(m.level, pl), difficulty: Math.min(0.95, 0.78 + S.idx * 0.03), playerLevel: pl, trainer: m, arena: m.arena, rounds: 1, playerHp: S.hp, mods: m.mods || [] };
      label = `Boss ${S.idx + 1}/${list.length} · ${m.name}`;
    } else if (this.ctx.kind === 'team') {
      const T = this.ctx, pl = save.critters[p.id].level;
      const avg = Math.round(T.team.reduce((a, id) => a + save.critters[id].level, 0) / 3);
      c = T.daily && T.fi === 0 && T.daily.shiny ? skinned(byId(T.foes[0]), 'shiny') : byId(T.foes[T.fi]);
      opts = { mods: T.daily ? [T.daily.mod] : T.mods || [], cpuLevel: Math.max(1, avg) + (T.daily ? 1 : 0), difficulty: 0.55 + T.fi * 0.08, playerLevel: pl, arena: T.arena, rounds: 1, playerHp: T.php[T.pi], cpuHp: T.fhp[T.fi], stageSub: `Team Battle · ${T.pi === 2 ? 'Your last critter!' : T.fi === 2 ? 'Their last critter!' : `Fight ${T.pi + T.fi + 1}`}` };
      label = T.daily ? `Daily team ${T.fi + 1}/3 · ${MODS[T.daily.mod].icon} ${MODS[T.daily.mod].name}` : `Rival team ${T.fi + 1}/3${T.mods?.length ? ` · ${MODS[T.mods[0]].icon}` : ''}`;
    } else if (this.ctx.kind === 'trials') {
      const T = this.ctx, pl = save.critters[p.id].level;
      c = byId(T.foe);
      opts = { cpuLevel: pl + 1, difficulty: 0.62, playerLevel: pl, arena: T.arena, rounds: 1, mods: ['mayhem'], stageSub: 'Stadium Trial · dodge every trick!' };
      label = `Stadium Trial · ${MODS.mayhem.icon} ${MODS.mayhem.name}`;
    } else if (this.ctx.kind === 'daily') {
      const d = this.ctx.d;
      c = skinned(byId(d.foe), d.shiny ? 'shiny' : 'base');
      const pl = save.critters[p.id].level;
      opts = { cpuLevel: pl + 1, difficulty: 0.6, playerLevel: pl, arena: d.arena, mods: [d.mod] };
      label = `Daily · ${MODS[d.mod].icon} ${MODS[d.mod].name}`;
    } else {
      const others = CRITTERS.filter((x) => x.id !== p.id), q = this.quickPick;
      this.quickPick = null;
      c = q?.c || others[Math.floor(Math.random() * others.length)];
      const pl = save.critters[p.id].level;
      opts = { cpuLevel: Math.max(1, pl + (this.diff - 1) * 2), difficulty: DIFFS[this.diff].v, playerLevel: pl, arena: q?.arena || pick(ARENA_KEYS), mods: q?.mods || [] };
      label = `CPU · ${DIFFS[this.diff].name}${opts.mods.length ? ` · ${MODS[opts.mods[0]].icon} ${MODS[opts.mods[0]].name}` : ""}`;
    }
    c = withGear(c, opts.cpuLevel); // rivals grow with their level too (Lv 7 / Lv 14 forms)
    const gold = this.ctx.kind === 'bossrush' || opts.trainer?.boss || /^Gatekeeper/.test(opts.stageSub || ''); // big fights get a gold nameplate
    this.root.innerHTML = `
      <div class="vs-screen">
        <div class="vs-side l" style="--tc:${TYPES[p.type].color}"><img src="${g.portrait(p)}" alt=""><b>${p.name}</b><small>YOU · Lv ${opts.playerLevel}</small></div>
        <div class="vs-mark">VS</div>
        <div class="vs-side r${gold ? ' gold' : ''}" style="--tc:${TYPES[c.type].color}"><img src="${g.portrait(c)}" alt=""><b>${c.name}</b><small>${label}</small></div>
        ${this.ctx.kind === 'team' ? `<div class="vs-team">${this.teamRow(this.ctx.team, this.ctx.php, this.ctx.pi)}${this.teamRow(this.ctx.foes, this.ctx.fhp, this.ctx.fi)}</div>${this.ctx.sent ? `<div class="vs-go ${this.ctx.sent}">${this.ctx.sent === 'you' ? `Go, ${p.name}!` : `Rival sends out ${c.name}!`}</div>` : ''}` : ''}
        ${HAZARDS[opts.arena] && save.settings.hazards !== false ? `<div class="vs-hazard">⚠ Arena hazards: ${HAZARDS[opts.arena].name} & ${SIGS[opts.arena].name.toLowerCase()}</div>` : ''}
      </div>`;
    sfx.boom();
    // only if the player is still on this VS screen (back or a menu tap during it must not drop them into a fight)
    const vsToken = this.vsToken = {};
    setTimeout(() => { if (this.mode === 'vs' && this.vsToken === vsToken) g.startBattle(p, c, opts); }, 1900);
  }

  // ---------- results ----------
  results(won, stats, pDef, cDef, opts) {
    const g = this.game;
    this.mode = 'results';
    document.body.classList.add('at-results'); // results have a portrait layout, so no rotate hint here
    g.input.showTouch(false);
    g.hud.show(false);
    save.stats.battles++;
    if (won) save.stats.wins++;
    const cup = this.ctx.kind === 'cup' ? this.ctx : null;
    // XP: winning pays more, tougher foes pay more
    const kind = this.ctx.kind;
    const xp = Math.round(((won ? 50 : 18) + (opts.cpuLevel || 1) * (won ? 14 : 5) + stats.maxCombo * 2 + (stats.perfect ? 30 : 0)) * ((kind === 'daily' || (kind === 'team' && this.ctx.daily)) && won ? 2 : 1));
    // survival bookkeeping: streak, carried health, personal best
    let streakNote = '';
    if (kind === 'survival') {
      const S = this.ctx, pf = g.battle?.player;
      if (won) {
        S.streak++;
        S.hp = Math.min(1, (pf ? pf.hp / pf.maxHp : 1) + 0.3);
        save.stats.bestStreak = Math.max(save.stats.bestStreak || 0, S.streak);
        if (S.streak % 5 === 0) {
          // Gatekeeper down: berries and a full heal
          const prize = Math.min(5, 1 + S.streak / 5);
          save.berries = (save.berries || 0) + prize;
          S.hp = 1;
          streakNote = `<div class="streak">⭐ Gatekeeper beaten! Streak ${S.streak} · +${prize} 🍓 · fully healed</div>`;
          setTimeout(() => { if (this.mode === 'results') { sfx.jingle(3); buzz('medium'); } }, 1400);
        } else streakNote = `<div class="streak">🔥 Streak ${S.streak} · ${Math.round(S.hp * 100)}% health for the next fight${S.best && S.streak === S.best + 1 ? ' · NEW BEST!' : ''}${S.streak % 5 === 4 ? ' · ⭐ Gatekeeper next!' : ''}</div>`;
      } else {
        const best = save.stats.bestStreak || 0;
        streakNote = `<div class="streak">Run over at <b>${S.streak}</b> win${S.streak === 1 ? '' : 's'}${S.streak > (S.best ?? best) ? ' · NEW BEST!' : ` · Best ${best}`}</div>`;
      }
    }
    if (kind === 'bossrush') {
      const S = this.ctx, pf = g.battle?.player, N = bossList().length;
      if (won) {
        S.idx++;
        S.hp = Math.min(1, (pf ? pf.hp / pf.maxHp : 1) + 0.35);
        save.stats.bossBest = Math.max(save.stats.bossBest || 0, S.idx);
        if (S.idx >= N) {
          // a fat berry basket the first time, a small one after
          const prize = save.stats.bossRush ? 2 : 5;
          save.stats.bossRush = true;
          save.berries = (save.berries || 0) + prize;
          streakNote = `<div class="streak">👑 Boss Rush cleared! All ${N} bosses down! · +${prize} 🍓</div>`;
        }
        else streakNote = `<div class="streak">👑 Boss ${S.idx} of ${N} down · ${Math.round(S.hp * 100)}% health for the next one</div>`;
      } else streakNote = `<div class="streak">Run over at boss <b>${S.idx + 1}</b> of ${N} · Best ${save.stats.bossBest || 0}/${N}</div>`;
    }
    if (kind === 'team') {
      const T = this.ctx, bt = g.battle, pf = bt?.player, cf = bt?.fighters[1];
      if (won) { T.fhp[T.fi] = 0; T.php[T.pi] = pf ? Math.max(0.05, pf.hp / pf.maxHp) : 1; T.fi++; T.sent = 'rival'; }
      else { T.php[T.pi] = 0; T.fhp[T.fi] = cf ? Math.max(0.05, cf.hp / cf.maxHp) : 1; T.pi++; T.sent = 'you'; }
      T.over = T.fi >= 3 ? 'won' : T.pi >= 3 ? 'lost' : null;
      if (T.over === 'won') save.stats.teamWins = (save.stats.teamWins || 0) + 1;
      const st = T.over === 'won' && T.daily ? this.dailyClear(T.daily.key) : '';
      const rows = `<div class="team-vs">${this.teamRow(T.team, T.php, T.pi)}<b>vs</b>${this.teamRow(T.foes, T.fhp, T.fi)}</div>`;
      streakNote = T.over === 'won' ? `<div class="streak">🤝 ${T.daily ? `Daily Team Challenge cleared! Double XP${st}` : 'Team Battle won!'} ${rows}</div>`
        : T.over === 'lost' ? `<div class="streak">Your team is out of critters. ${rows}</div>`
        : `<div class="streak">${won ? `${cDef.name} is out! ` : `${pDef.name} is out! `}${rows}</div>`;
    }
    if (kind === 'trials') {
      const T = this.ctx, n = won ? 1 + (!stats.hazardHits ? 1 : 0) + (!stats.hazardHits && (stats.hpLeft ?? 0) >= 0.7 ? 1 : 0) : 0;
      const was = save.trials?.[T.arena] || 0;
      if (n > was) (save.trials ||= {})[T.arena] = n;
      T.stars = n;
      streakNote = won ? `<div class="streak">🎪 Trial cleared: ${starRow(n)}${n > was ? (n === 3 ? ' · a new star for your Camp pedestal!' : ' · new best!') : ''}${n < 3 ? (stats.hazardHits ? ' · Dodge every hazard for more stars' : ' · Finish with 70% health for ★★★') : ''}</div>`
        : `<div class="streak">🎪 Trial failed. Best so far: ${starRow(was)}</div>`;
    }
    if (kind === 'daily' && won) { const st = this.dailyClear(this.ctx.d.key); streakNote = `<div class="streak">📅 Daily Challenge cleared! Double XP${st}</div>`; }
    const prog = save.critters[pDef.id];
    const before = { level: prog.level, xp: prog.xp };
    if (won) prog.wins++;
    const lv = grantXp(pDef.id, xp);
    save.stats.bestCombo = Math.max(save.stats.bestCombo || 0, stats.maxCombo);
    save.stats.supers = (save.stats.supers || 0) + stats.supers;
    if (stats.perfect) save.stats.perfects = (save.stats.perfects || 0) + 1;
    if (stats.counters) save.stats.counters = (save.stats.counters || 0) + stats.counters;
    if (won && HAZARDS[opts.arena || 'meadow'] && stats.hazardsSeen >= 2 && !stats.hazardHits) save.stats.hazardClean = (save.stats.hazardClean || 0) + 1;
    if (won && HAZARDS[opts.arena || 'meadow'] && save.settings.hazards !== false && !(save.stats.hazardArenas ||= []).includes(opts.arena)) save.stats.hazardArenas.push(opts.arena);
    let joined = false, cupDone = false, shinies = [];
    if (won && cup) {
      joined = unlock(cDef.id);
      if (cup.idx === cup.cup.matches.length - 1) {
        cupDone = true; save.cups[cup.cup.id] = true;
        if (cup.adv && save.adv) save.adv.flags['cup_' + cup.cup.id] = true;
        save.shinies ||= [];
        shinies = [...new Set(cup.cup.matches.map((m) => m.critter))].filter((id) => !save.shinies.includes(id));
        save.shinies.push(...shinies);
      }
    }
    if (kind === 'world') {
      const W = this.ctx;
      if (won) {
        if (W.flag) save.adv.flags[W.flag] = true;
        if (W.berries) save.berries = (save.berries || 0) + W.berries;
        // a beaten wild critter may ask to come along (more likely the first time you meet its kind)
        if ((W.fight === 'wild' || W.recruit) && !save.unlocked.includes(cDef.id) && (W.recruit || W.shiny || Math.random() < 0.45)) joined = unlock(cDef.id);
        let shinyNew = false;
        if (W.shiny && !(save.shinies ||= []).includes(cDef.id)) { save.shinies.push(cDef.id); shinyNew = true; }
        streakNote = `<div class="streak">${shinyNew ? `💎 ${cDef.name}'s shiny palette unlocked! ` : ''}${W.note || (W.fight === 'wild' ? (joined ? `🌿 ${cDef.name} wants to join your team!` : W.rain ? `🌧️ The wild ${cDef.name} splashes off through the puddles.` : `${HOME[W.arena] || HOME.meadow} The wild ${cDef.name} ${(HOME[W.arena + '_'] || HOME.meadow_)}.`) : `🏅 You beat ${W.name}!`)}</div>`;
      } else {
        const sp = save.adv.spawn;
        Object.assign(save.adv, { map: sp.map, x: sp.x, y: sp.y, dir: 's' });
        streakNote = `<div class="streak">💫 ${pDef.name} is worn out and hurries back to rest...</div>`;
      }
    }
    // berries for Critter Camp: one per win, a bonus for an S rank (added below once the rank is known)
    if (won && !opts.training) save.berries = (save.berries || 0) + 1;
    persist();
    this.ctx.newShinies = shinies;
    const badges = newBadges();
    badges.forEach((b, k) => setTimeout(() => { if (this.mode === 'results') { this.toast(`${b.icon} Badge earned: ${b.name}`); sfx.jingle(2); } }, 2600 + k * 2300));
    // performance grade: winning, health left, combos, supers and flawless rounds
    const hpLeft = stats.hpLeft ?? 0;
    const score = (won ? 45 : 10) + hpLeft * 30 + Math.min(stats.maxCombo, 8) * 2 + Math.min(stats.supers, 2) * 4 + (stats.perfect ? 12 : 0) + Math.min(stats.parries || 0, 3) * 2;
    const grade = !won ? (score >= 40 ? 'B' : 'C') : score >= 92 ? 'S' : score >= 78 ? 'A' : score >= 62 ? 'B' : 'C';
    const berries = won && !opts.training ? (grade === 'S' ? 2 : 1) : 0;
    if (berries === 2) { save.berries++; persist(); }
    // the cup rival has the last word: gracious in defeat, smug in victory
    const foe = opts.trainer || cup?.cup.matches[cup.idx], quote = foe && (won ? foe.beat : foe.gloat) ? { who: foe.name, line: won ? foe.beat : foe.gloat } : null;
    this.root.innerHTML = `
      <div class="results ${won ? 'won' : 'lost'}">
        <h1>${won ? 'VICTORY!' : 'DEFEAT'}</h1>
        ${quote ? `<div class="res-quote"><img src="${g.portrait(cDef)}" alt=""><span><b>${quote.who}</b> “${quote.line.replaceAll('{name}', save.trainer?.name || 'Trainer')}”</span></div>` : ''}
        <div class="res-card">
          <div class="grade g-${grade}"><small>Rank</small>${grade}</div>
          <img src="${g.portrait(pDef)}" alt="">
          <div class="res-stats">
            <div class="res-grid">
              <div><small>Damage</small><b data-n="${stats.dmgDealt}">0</b></div>
              <div><small>Best combo</small><b data-n="${stats.maxCombo}">0</b></div>
              <div><small>Health left</small><b data-n="${Math.round(hpLeft * 100)}" data-u="%">0</b></div>
            </div>
            ${stats.perfect ? '<div class="perfect">PERFECT ROUND!</div>' : ''}
            ${streakNote}
            <div class="res-xp"><span>+${xp} XP${berries ? ` · +${berries} 🍓` : ''}</span><span class="res-lv">Lv ${before.level}</span></div>
            <div class="xpbar big"><i style="width:${(before.xp / xpNeeded(before.level)) * 100}%"></i></div>
          </div>
        </div>
        <div class="res-btns"></div>
      </div>`;
    // count the stats up, then slam the rank stamp down
    const nums = [...this.root.querySelectorAll('[data-n]')], t0 = performance.now();
    const count = () => {
      if (!this.root.contains(nums[0])) return;
      const k = Math.min(1, (performance.now() - t0 - 250) / 900), e = 1 - (1 - Math.max(0, k)) ** 3;
      for (const n of nums) n.textContent = Math.round(+n.dataset.n * e) + (n.dataset.u || '');
      if (k < 1) requestAnimationFrame(count);
      else { this.root.querySelector('.grade')?.classList.add('in'); sfx.boom(); }
    };
    requestAnimationFrame(count);
    // animate the XP bar, rolling over on level-ups
    const bar = this.root.querySelector('.xpbar i'), lvEl = this.root.querySelector('.res-lv');
    let level = before.level;
    const fill = () => {
      if (!bar.isConnected) return;
      if (level < lv.to) {
        bar.style.width = '100%';
        setTimeout(() => {
          if (!bar.isConnected) return;
          level++; lvEl.textContent = 'Lv ' + level; lvEl.classList.add('up');
          sfx.voice(pDef.voice, 'win');
          this.toast(`${pDef.name} grew to Lv ${level}!`);
          if (gearFor(level) > gearFor(level - 1)) setTimeout(() => this.gearGet(pDef, GEAR[gearFor(level) - 1]), 900);
          if (stageFor(level) > stageFor(level - 1)) setTimeout(() => this.mode === 'results' && !this.growing && this.owedGrowth().includes(pDef.id) && this.growUp(pDef.id, save.critters[pDef.id].level), 1300);
          bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth; bar.style.transition = '';
          fill();
        }, 700);
      } else { bar.style.width = (prog.xp / xpNeeded(prog.level)) * 100 + '%'; this.resDone = performance.now(); }
    };
    this.resDone = 0;
    setTimeout(fill, 500);
    requestAnimationFrame(() => this.fitResults());

    const b = this.root.querySelector('.res-btns');
    if (kind === 'world') {
      b.appendChild(this.btn('Continue', 'primary', () => this.adventure()));
    } else if (kind === 'survival') {
      if (won) b.appendChild(this.btn('Next Challenger', 'primary', () => { g.endBattle(); playMusic('menu'); this.mode = 'select'; this.vs(); }));
      else b.appendChild(this.btn('New Run', 'primary', () => { this.ctx = { kind: 'survival', streak: 0, hp: 1, last: null, best: save.stats.bestStreak || 0 }; g.endBattle(); playMusic('menu'); this.select(); }));
      b.appendChild(this.btn('Challenges', 'ghost', () => this.challenges()));
    } else if (kind === 'bossrush') {
      const more = won && this.ctx.idx < bossList().length;
      if (more) b.appendChild(this.btn('Next Boss', 'primary', () => { g.endBattle(); playMusic('menu'); this.mode = 'select'; this.vs(); }));
      else if (!won) b.appendChild(this.btn('New Run', 'primary', () => { this.ctx = { kind: 'bossrush', idx: 0, hp: 1 }; g.endBattle(); playMusic('menu'); this.select(); }));
      b.appendChild(this.btn('Challenges', more || !won ? 'ghost' : 'primary', () => this.challenges()));
    } else if (kind === 'team') {
      const T = this.ctx;
      if (!T.over) b.appendChild(this.btn(won ? 'Next Rival' : 'Send Next Critter', 'primary', () => {
        this.sel = CRITTERS.findIndex((c) => c.id === T.team[T.pi]);
        g.endBattle(); playMusic('menu'); this.mode = 'select'; this.vs();
      }));
      else if (T.over === 'won') b.appendChild(this.btn('Team Trophy', 'primary', () => this.teamTrophy()));
      else b.appendChild(this.btn(T.daily ? 'Try Again' : 'New Team Battle', 'primary', () => { this.ctx = { kind: 'team', daily: T.daily }; g.endBattle(); playMusic('menu'); this.select(); }));
      b.appendChild(this.btn('Challenges', 'ghost', () => this.challenges()));
    } else if (kind === 'trials') {
      // after a win, offer the next trial that still has stars to earn (same critter)
      const i = TRIALS.findIndex((t) => t.arena === this.ctx.arena);
      const next = won && [...TRIALS.slice(i + 1), ...TRIALS.slice(0, i)].find((t) => (save.trials?.[t.arena] || 0) < 3);
      if ((this.ctx.stars || 0) < 3) b.appendChild(this.btn('Try Again', 'primary', () => g.startBattle(pDef, cDef, { ...opts, playerLevel: save.critters[pDef.id].level })));
      if (next) b.appendChild(this.btn('Next Trial', (this.ctx.stars || 0) < 3 ? 'ghost' : 'primary', () => { this.ctx = { kind: 'trials', arena: next.arena, foe: next.foe }; g.endBattle(); playMusic('menu'); this.mode = 'select'; this.vs(); }));
      b.appendChild(this.btn('Trials', 'ghost', () => { this.challenges(); this.trialSheet(); }));
    } else if (kind === 'daily') {
      if (!won) b.appendChild(this.btn('Try Again', 'primary', () => g.startBattle(pDef, cDef, { ...opts, playerLevel: save.critters[pDef.id].level })));
      b.appendChild(this.btn('Challenges', won ? 'primary' : 'ghost', () => this.challenges()));
    } else if (cup) {
      if (won && !cupDone) b.appendChild(this.btn('Next Battle', 'primary', () => { cup.idx++; g.endBattle(); playMusic('menu'); this.ladder(); }));
      else if (!won) {
        b.appendChild(this.btn('Try Again', 'primary', () => g.startBattle(pDef, cDef, { ...opts, playerLevel: save.critters[pDef.id].level })));
        b.appendChild(this.btn('Give Up', 'ghost', () => (cup.adv ? this.adventure() : this.cups())));
      } else b.appendChild(this.btn('Collect Trophy', 'primary', () => this.trophy(cup.cup)));
    } else {
      b.appendChild(this.btn('Rematch', 'primary', () => g.startBattle(withGear(skinned(byId(pDef.id), pDef.skin), save.critters[pDef.id].level), cDef, { ...opts, playerLevel: save.critters[pDef.id].level }))); // fresh def: it may have grown
      b.appendChild(this.btn('Change Critter', '', () => { g.endBattle(); this.select(); playMusic('menu'); }));
      b.appendChild(this.btn('Title', 'ghost', () => this.title()));
    }
    if (joined) setTimeout(() => this.recruit(cDef), 1600);
  }

  // squeeze the results column until its buttons fit on screen (short phones, a quote plus a gear callout...)
  fitResults() {
    const R = this.root.querySelector('.results');
    if (!R) return;
    R.classList.remove('tight', 'tighter');
    const over = () => R.scrollHeight > R.clientHeight + 1;
    if (over()) R.classList.add('tight');
    if (over()) R.classList.add('tighter');
  }

  // callout when a level-up earns a new piece of gear
  gearGet(def, gear) {
    if (this.mode !== 'results') return;
    const card = this.root.querySelector('.res-stats');
    if (!card) return;
    card.querySelector('.gear-get')?.remove();
    const el = document.createElement('div');
    el.className = 'gear-get';
    el.innerHTML = `<i>${gear.icon}</i><span><small>New gear!</small><b>${gear.name}</b><em>${def.name} puts it on!</em></span>`;
    card.appendChild(el); this.fitResults();
    sfx.jingle(3);
    // dress the celebrating winner right away, with a little sparkle
    const f = this.game.battle?.player;
    if (f && f.def.id === def.id) {
      f.critter.buildGear(GEAR.findIndex((x) => x.lv === gear.lv) + 1);
      const p = f.headPos();
      this.game.fx.burst(p, { n: 16, speed: 3, up: 2, color: 0xffd04a, size: 0.2, life: 0.6, shape: 'star', additive: false, grav: 3 });
      f.critter.emote('happy', 'grin', 1.2);
    }
  }

  // "What? X is growing!": flickering white silhouettes of the old and new forms, a flash, then the new form's card
  // unlocked critters that reached a new stage without the player seeing them grow
  // (tapped past results, levelled before growth existed, ...); each plays its growing scene once
  owedGrowth() {
    const seen = save.seenStage || {};
    return save.unlocked.filter((id) => stageFor(save.critters[id]?.level) > (seen[id] || 1));
  }

  growUp(id, lv, done) {
    if (this.growing) return;
    this.growing = true;
    const g = this.game, base = byId(id), skin = save.skins?.[id];
    const stage = stageFor(lv), seenSt = Math.min(stage - 1, save.seenStage?.[id] || 1);
    const from = withGear(skinned(base, skin), GROW_LV[seenSt - 1] - 1), to = withGear(skinned(base, skin), lv);
    // mark it seen at once, so leaving mid-scene can't replay it forever
    (save.seenStage ||= {})[id] = stage; persist();
    const pre = from.name;
    const d = document.createElement('div');
    d.className = 'modal-wrap grow-wrap';
    d.innerHTML = `<div class="grow" style="--tc:${TYPES[base.type].color}">
      <div class="grow-rays"></div>
      <p class="grow-msg">What? <b>${pre}</b> is growing!</p>
      <div class="grow-pics"><img class="g-old" src="${g.portrait(from, 512, true)}" alt=""><img class="g-new" src="${g.portrait(to, 512, true)}" alt=""></div>
      <div class="grow-card"></div>
    </div>`;
    this.root.appendChild(d);
    this.growEl = d;
    const G = d.querySelector('.grow');
    let k = 0, revealed = false, closed = false;
    const steps = [520, 470, 420, 370, 320, 280, 240, 200, 170, 140, 115, 95, 80, 70, 60, 55, 50];
    const close = () => {
      if (closed) return; closed = true;
      d.remove(); g.modalClose = null; this.growing = false;
      const img = this.mode === 'results' && this.root.querySelector('.res-card > img');
      if (img) img.src = g.portrait(to);
      // the celebrating winner turns into the new form too
      const f = g.battle?.player;
      if (f && f.def.id === id && f.root.visible) {
        f.regrow(to);
        const hp = f.headPos();
        g.fx.burst(hp, { n: 26, speed: 4, up: 3, color: 0xffffff, size: 0.24, life: 0.7, shape: 'star', grav: 2 });
        g.fx.spawn({ ...f.chestPos(), color: TYPES[base.type].glow, size: 4, life: 0.4, shape: 'ring', grow: 2 });
        f.critter.emote('happy', 'grin', 1.5);
      }
      done?.();
    };
    const reveal = () => {
      if (revealed || closed) return; revealed = true;
      G.classList.add('done');
      sfx.grown(); sfx.voice(to.voice, 'win'); buzz('heavy');
      const T = (n) => `<span class="mini-type" style="background:${TYPES[base.type].color}">${n}</span>`;
      d.querySelector('.grow-msg').innerHTML = `<b>${pre}</b> grew into <b>${to.name}</b>!`;
      d.querySelector('.grow-card').innerHTML = `<div class="gc-sp">${to.species} · Stage ${stage}${FORMS[id] ? ` · ${FORMS[id].path} path` : ''}</div>
        <div class="gc-moves"><div><small>Special</small><b>${to.moves.special}</b></div><div><small>Super</small><b>${to.moves.super}</b></div></div>
        <div class="gc-up">${T(`+${stage === 2 ? 6 : 12}% Health`)}${T(`Moves +${stage === 2 ? 12 : 25}% power`)}${T('Faster specials')}</div>`;
      d.querySelector('.grow-card').appendChild(this.btn('Awesome!', 'primary', close));
      save.stats.grown = (save.stats.grown || 0) + 1; persist();
    };
    const tick = () => {
      if (revealed || closed || !d.isConnected) return;
      G.classList.toggle('alt');
      sfx.shimmer(k / steps.length);
      if (k >= steps.length) { reveal(); return; }
      setTimeout(tick, steps[k++]);
    };
    sfx.jingle(1);
    setTimeout(tick, 900);
    d.addEventListener('click', () => { if (!revealed) { k = steps.length; } }); // tap to hurry it along
    g.modalClose = () => (revealed ? close() : (k = steps.length));
  }

  recruit(def) {
    const d = document.createElement('div');
    d.className = 'modal-wrap recruit';
    d.innerHTML = `<div class="modal" style="--tc:${TYPES[def.type].color}">
      <div class="burst"></div>
      <img src="${this.game.portrait(def)}" alt="">
      <h2>${def.name} joined your team!</h2>
      <p>${def.blurb}</p></div>`;
    d.querySelector('.modal').appendChild(this.btn('Yay!', 'primary', () => d.remove()));
    d.addEventListener('click', (e) => { if (e.target === d) d.remove(); }); // tapping outside closes it too
    this.root.appendChild(d);
    sfx.voice(def.voice, 'win');
    sfx.cheer(1);
  }

  trophy(cup) {
    const g = this.game;
    g.endBattle();
    this.mode = 'trophy';
    g.setShowcase([skinOf(CRITTERS[this.sel])], 'single');
    g.showcase[0].cheer = 99;
    playMusic('victory');
    this.root.innerHTML = `
      <div class="trophy-screen" style="--tc:${cup.color}">
        <div class="big-trophy">🏆</div>
        <h1>${cup.name} Champion!</h1>
        <p>${CRITTERS[this.sel].name} and you are the talk of the stadium.</p>
        ${this.ctx.newShinies?.length ? `<div class="shiny-unlock"><small>✦ Shiny palettes unlocked ✦</small><div>${this.ctx.newShinies.map((id) => `<img src="${g.portrait(skinned(byId(id), 'shiny'))}" alt="">`).join('')}</div><small>Equip them in the Critterdex</small></div>` : ''}
        <div class="res-btns"></div>
      </div>`;
    const btns = this.root.querySelector('.res-btns');
    // Continue is there from the start, so nothing (a popup, a slow phone) can leave you stuck here
    // clearing the last cup rolls the finale once
    const next = () => (this.ctx.adv ? this.adventure() : CUPS.every((c) => save.cups[c.id]) && !save.finaleSeen ? this.finale() : this.cups());
    btns.appendChild(this.btn('Continue', 'primary big', () => { this.root.querySelector('.prof-wrap')?.remove(); next(); }));
    this.backFn = next;
    sfx.cheer(1.5);
    if (cup.outro) setTimeout(() => { if (this.mode === 'trophy') this.profTalk(cup.outro); }, 1400);
  }

  // ---------- Team Battle won: the whole trio celebrates together ----------
  teamTrophy() {
    const g = this.game, T = this.ctx;
    g.endBattle();
    this.mode = 'teamwin';
    g.setShowcase(T.team.map((id) => skinOf(byId(id))), 'line');
    g.showcase.forEach((c) => (c.cheer = 99));
    playMusic('victory');
    const alive = T.php.filter((h) => h > 0).length;
    this.root.innerHTML = `
      <div class="trophy-screen" style="--tc:#ffb03a">
        <div class="big-trophy">🤝</div>
        <h1>Team Victory!</h1>
        <p>${T.team.map((id) => byId(id).name).join(', ')}: ${alive === 3 ? 'a flawless sweep, nobody even fainted!' : alive === 2 ? 'two still standing at the end.' : 'a last-critter-standing comeback!'}</p>
        <div class="team-vs">${this.teamRow(T.team, T.php, -1)}</div>
        <div class="res-btns"></div>
      </div>`;
    const btns = this.root.querySelector('.res-btns');
    const again = () => { this.ctx = { kind: 'team' }; playMusic('menu'); this.select(); };
    if (T.daily) btns.appendChild(this.btn('Challenges', 'primary big', () => this.challenges()));
    else {
      btns.appendChild(this.btn('New Team Battle', 'primary big', again));
      btns.appendChild(this.btn('Challenges', 'ghost', () => this.challenges()));
    }
    this.backFn = () => this.challenges();
    sfx.cheer(1.5);
  }

  // ---------- every cup cleared: a parade of the whole team and the credits ----------
  finale() {
    const g = this.game;
    g.endBattle();
    this.mode = 'finale';
    save.finaleSeen = true; persist();
    g.setArena('meadow');
    g.setShowcase([]);
    playMusic('victory');
    const team = CRITTERS.filter((c) => save.unlocked.includes(c.id));
    const rivals = [...new Set(CUPS.flatMap((c) => c.matches.map((m) => m.name)))].filter((n) => n !== 'Professor Pecan');
    const name = save.trainer?.name || 'Trainer';
    this.root.innerHTML = `
      <div class="finale">
        <div class="credits"><div class="roll">
          <div class="logo-top ol">CRITTER</div><div class="logo-bot ol">CLASH!</div>
          <h2>🌟 Critter Master 🌟</h2><p class="cr-big">${name}</p>
          <h3>Starring</h3>${CRITTERS.map((c) => `<p><b>${c.name}</b> <small>${c.species}</small></p>`).join('')}
          <h3>Rivals</h3><p>${rivals.join(' · ')}</p>
          <h3>Special thanks</h3><p>Professor Pecan, as himself</p><p>The crowd, for all the cheering</p>
          <h3>And you</h3><p>for playing!</p>
          <p class="cr-big">Thanks for playing!</p>
        </div></div>
        <div class="res-btns"></div>
      </div>`;
    const S = this.root.firstElementChild;
    S.querySelector('.res-btns').appendChild(this.btn('Back to Title', 'primary', () => this.title()));
    this.backFn = () => this.title();
    // the team parades by, four at a time, cheering
    let wave = 0;
    const parade = () => {
      if (this.mode !== 'finale') return;
      const group = team.slice(wave * 4, wave * 4 + 4);
      if (!group.length) wave = 0;
      g.setShowcase((group.length ? group : team.slice(0, 4)).map(skinOf), 'line');
      const wide = innerWidth > innerHeight;
      for (const c of g.showcase) { c.cheer = 2.4; if (wide) c.root.position.x -= 2.4; }
      sfx.cheer(0.8);
      wave++;
      setTimeout(parade, 3200);
    };
    this.profTalk([
      "You did it, {name}! Every single cup has your name on it.",
      "Sprout, Thunder, Champion, Glowcap, Midnight, Legend AND Sky... Even I couldn't stop you!",
      "From today you're a Critter Master. That calls for a parade!",
    ], () => { S.classList.add('rolling'); parade(); });
  }

  moveModal(def) {
    const d = document.createElement('div');
    d.className = 'modal-wrap movelist';
    d.innerHTML = `<div class="modal"><h2>${def.name}'s Moves</h2>${moveList(def, document.body.classList.contains('is-touch'))}</div>`;
    d.querySelector('.modal').appendChild(this.btn('Got it', 'primary', () => d.remove()));
    d.addEventListener('click', (e) => { if (e.target === d) d.remove(); });
    this.root.appendChild(d);
    sfx.ui('ok');
  }

  pauseMenu(on) {
    let p = this.root.querySelector('.pause');
    if (!on) { p?.remove(); return; }
    p = document.createElement('div');
    p.className = 'modal-wrap pause';
    p.innerHTML = '<div class="modal"><h2>Paused</h2><div class="col"></div></div>';
    const col = p.querySelector('.col');
    col.appendChild(this.btn('Resume', 'primary', () => this.game.pause()));
    // restart the same fight (not in runs where damage carries over, so it can't be used to dodge a loss)
    const g = this.game, k = this.ctx?.kind;
    // Adventure: a wild fight can be fled (no running from trainers), back to the same spot in the world
    if (k === 'world' && this.ctx.fight === 'wild') col.appendChild(this.btn('🏃 Run Away', '', () => {
      this.pauseMenu(false); g.paused = false; sfx.ui('back'); this.adventure(); this.toast('Got away safely!');
    }));
    if (g.lastStart && !['survival', 'bossrush', 'team'].includes(k)) col.appendChild(this.btn('Restart', '', () => {
      this.pauseMenu(false); g.paused = false; g.startBattle(...g.lastStart);
    }));
    const tr = this.game.battle?.training;
    if (tr) {
      col.appendChild(this.btn('Move List', '', () => this.moveModal(this.game.battle.player.def)));
      const dm = this.btn(`Dummy: ${DUMMY[tr.mode].name}`, '', () => { tr.cycle(); dm.textContent = `Dummy: ${DUMMY[tr.mode].name}`; });
      col.appendChild(dm);
    } else {
      col.appendChild(this.btn('Move List', '', () => this.moveModal(this.game.battle.player.def)));
      col.appendChild(this.btn('How to Play', '', () => this.howTo()));
    }
    col.appendChild(this.btn('Photo Mode', '', () => {
      const g = this.game;
      p.remove();
      g.photo = new PhotoMode(g, () => { g.photo = null; g.hud.show(true); g.input.showTouch(true); this.pauseMenu(true); });
    }));
    col.appendChild(this.btn('Settings', '', () => openSettings(this.game, this.root)));
    if (tr) col.appendChild(this.btn('Exit Training', 'ghost-dark', () => { this.game.paused = false; this.game.endBattle(); playMusic('menu'); this.select(); }));
    col.appendChild(this.btn('Quit to Title', 'ghost-dark', () => { this.game.paused = false; this.title(); }));
    p.addEventListener('click', (e) => { if (e.target === p) this.game.pause(); });
    this.root.appendChild(p);
  }

  update(dt) {
    // a growth the player hasn't seen yet plays on the next calm screen (one at a time)
    if (this.growing && !this.growEl?.isConnected) this.growing = false; // a screen change wiped it
    this.growCheck = (this.growCheck || 0) - dt;
    if (this.growCheck <= 0 && !this.growing && !this.game.autoplay) {
      this.growCheck = 0.5;
      const calm = ['title', 'cups', 'ladder', 'select', 'dex', 'challenges'].includes(this.mode) || (this.mode === 'results' && this.resDone && performance.now() - this.resDone > 1600);
      const owed = calm && !this.root.querySelector('.modal-wrap, .prof-wrap, .welcome') && this.owedGrowth();
      if (owed?.length) this.growUp(owed[0], save.critters[owed[0]].level);
    }
    this.t += dt;
    const cam = this.game.camera;
    if (this.mode === 'camp') { this.campObj?.update(dt); return; }
    if (this.campObj) { this.campObj.dispose(); this.campObj = null; }
    if (this.mode === 'world') { this.worldObj?.update(dt); return; }
    if (this.worldObj) this.leaveWorld();
    // trophy screens: fireworks pop in the sky behind the winners
    if (this.mode === 'trophy' || this.mode === 'teamwin') {
      this.fwT = (this.fwT ?? 0.4) - dt;
      if (this.fwT <= 0) {
        this.fwT = 0.5 + Math.random() * 0.6;
        // pick a spot in the upper part of the screen, about 10 m out from the camera
        const fx = this.game.fx, v = (this.fwV ||= cam.position.clone());
        v.set((Math.random() - 0.5) * 1.6, 0.4 + Math.random() * 0.4, 0.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(9 + Math.random() * 3).add(cam.position);
        const at = { x: v.x, y: v.y, z: v.z };
        const pal = [[0xff4fa0, 0xffe14d], [0x4fd8ff, 0xffffff], [0x9aff4f, 0xffe14d], [0xffa030, 0xff4f4f], [0xc87aff, 0x7af0ff]][Math.floor(Math.random() * 5)];
        for (let k = 0; k < 36; k++) {
          const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = 4.5 * (0.85 + Math.random() * 0.3);
          fx.spawn({ ...at, vx: r * Math.cos(a) * sp, vy: u * sp + 0.6, vz: r * Math.sin(a) * sp, color: pal[k % 2], size: k % 3 ? 0.55 : 0.75, life: 1.0, shape: k % 3 ? 'spark' : 'star', additive: k % 3 !== 0, grav: 2.5, rot: Math.random() * 6 });
        }
        fx.spawn({ ...at, color: 0xffffff, size: 3.5, life: 0.2, shape: 'glow' });
        fx.spawn({ ...at, color: pal[0], size: 3.2, life: 0.3, shape: 'ring' });
      }
    }
    if (this.mode === 'title') {
      const a = Math.sin(this.t * 0.15) * 0.35;
      const D = cam.aspect < 1 ? 11 : 7.5;
      cam.position.set(Math.sin(a) * D, 2.2, Math.cos(a) * D);
      cam.lookAt(0, cam.aspect < 1 ? 1.6 : 1.1, 0);
      cam.fov = Math.min(78, 40 * Math.max(1, 1.6 / cam.aspect));
      cam.updateProjectionMatrix();
    } else if (this.mode === 'teamwin') {
      // pulled back so the whole trio fits above the banner
      const portrait = cam.aspect < 1;
      this.game.showcase.forEach((c, k) => (c.root.rotation.y = Math.sin(this.t * 0.8 + k) * 0.25));
      cam.position.set(0, 1.9, portrait ? 12 : 6.6);
      cam.lookAt(0, portrait ? -0.4 : 0.45, 0);
      cam.fov = Math.min(70, 40 * Math.max(1, 1.4 / cam.aspect));
      cam.updateProjectionMatrix();
    } else if (['select', 'vs', 'ladder', 'trophy', 'cups', 'dex'].includes(this.mode)) {
      const c = this.game.showcase[0];
      if (c && this.mode === 'dex') { if (!this.dexDrag) this.dexYaw += dt * 0.25; c.root.rotation.y = this.dexYaw; }
      else if (c) c.root.rotation.y = Math.sin(this.t * 0.6) * 0.5 + (this.mode === 'ladder' ? -0.3 : 0.2);
      const portrait = cam.aspect < 1;
      // frame the critter off-centre so the side card has room
      const ox = portrait ? 0 : this.mode === 'ladder' ? -1.1 : this.mode === 'trophy' ? 0 : this.mode === 'dex' ? 0.35 : 1.0;
      cam.position.set(ox, 1.3, portrait ? 4.6 : 4.4);
      cam.lookAt(ox, portrait ? (this.mode === 'dex' ? -0.55 : this.mode === 'select' ? -0.4 : 0.35) : this.mode === 'trophy' ? 1.25 : 0.75, 0);
      cam.fov = Math.min(70, 40 * Math.max(1, 1.4 / cam.aspect));
      cam.updateProjectionMatrix();
    }
  }
}
