// Title, tournament cups/ladder, critter select, VS splash, results and pause overlays.
import { CRITTERS, TYPES, CUPS, SHINY, BADGES, MODS, STARTERS, skinned, dailyChallenge } from './data.js';
import { sfx, playMusic } from './audio.js';
import { save, persist, grantXp, unlock, xpNeeded } from './save.js';
import { openSettings } from './settings.js';

const STYLE_TAG = { balanced: '⚖️ Balanced', rushdown: '🔥 Aggressive', zoner: '🎯 Keeps away', turtle: '🛡️ Defensive', trickster: '🌀 Tricky' };
const ARENA_NAME = { meadow: 'Sunny Meadow', beach: 'Seashell Bay', volcano: 'Magma Crater', frost: 'Frostpeak Dome' };
const ARENA_KEYS = Object.keys(ARENA_NAME);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const DIFFS = [{ name: 'Easy', v: 0.2 }, { name: 'Normal', v: 0.5 }, { name: 'Hard', v: 0.85 }];
const byId = (id) => CRITTERS.find((c) => c.id === id);

// which cup match unlocks a critter (for the locked-card hint)
const skinOf = (c) => skinned(c, save.skins?.[c.id]);
const cupOfShiny = (id) => CUPS.find((cup) => cup.matches.some((m) => m.critter === id));

// badges newly satisfied by the save; marks them earned
export function newBadges() {
  save.badges ||= {};
  const out = BADGES.filter((b) => !save.badges[b.id] && b.test(save));
  for (const b of out) save.badges[b.id] = true;
  if (out.length) persist();
  return out;
}

function unlockHint(id) {
  for (const cup of CUPS) for (const m of cup.matches) if (m.critter === id) return `Beat ${m.name} in the ${cup.name}`;
  return 'Keep battling!';
}

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
  }

  hideAll() { this.root.innerHTML = ''; this.mode = null; }

  onAudioUnlocked() {
    if (['title', 'select', 'cups', 'ladder', 'dex'].includes(this.mode)) playMusic('menu');
  }

  btn(label, cls, fn) {
    const b = document.createElement('button');
    b.className = 'btn ' + cls;
    b.innerHTML = label;
    b.addEventListener('click', (e) => { e.stopPropagation(); sfx.ui('ok'); if (save.settings.vibrate) navigator.vibrate?.(10); fn(); });
    return b;
  }

  // ---------- title ----------
  title() {
    const g = this.game;
    if (!save.trainer?.name && !g.autoplay) { this.welcome(); return; }
    g.endBattle();
    g.setArena('meadow');
    this.mode = 'title';
    this.t = 0;
    this.backFn = null;
    g.setShowcase(CRITTERS.filter((c) => save.unlocked.includes(c.id)), 'line');
    const trophies = CUPS.filter((c) => save.cups[c.id]).length;
    this.root.innerHTML = `
      <div class="title-screen">
        <div class="logo">
          <div class="logo-top">CRITTER</div>
          <div class="logo-bot">CLASH!</div>
          <div class="logo-sub">Tiny critters. Huge bonks.</div>
        </div>
        <div class="title-menu"></div>
        <div class="title-foot"><span>🧢 ${save.trainer.name}</span><span>Team ${save.unlocked.length}/${CRITTERS.length}</span><span>🏆 ${trophies}/${CUPS.length}</span></div>
      </div>`;
    const m = this.root.querySelector('.title-menu');
    m.appendChild(this.btn('Tournament', 'primary big', () => this.cups()));
    const row = document.createElement('div');
    row.className = 'row';
    row.appendChild(this.btn('Quick Battle', '', () => { this.ctx = { kind: 'quick' }; this.select(); }));
    row.appendChild(this.btn('Challenges', '', () => this.challenges()));
    row.appendChild(this.btn('Critterdex', '', () => this.dex()));
    row.appendChild(this.btn('How to Play', 'ghost', () => this.howTo()));
    m.appendChild(row);
    const gear = this.btn('<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.4 3.5c0-.5 0-1-.1-1.4l2-1.6-2-3.4-2.4 1a8 8 0 0 0-2.4-1.4L15 2.6h-4l-.4 2.6A8 8 0 0 0 8.2 6.6l-2.4-1-2 3.4 2 1.6a8 8 0 0 0 0 2.8l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 2.4 1.4l.4 2.6h4l.4-2.6a8 8 0 0 0 2.4-1.4l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.4z"/></svg>', 'icon-btn gear', () => openSettings(g, this.root));
    gear.setAttribute('aria-label', 'Settings');
    this.root.querySelector('.title-screen').appendChild(gear);
    playMusic('menu');
  }

  // ---------- first launch: the professor, a trainer name and a partner ----------
  welcome() {
    const g = this.game;
    g.endBattle();
    g.setArena('meadow');
    this.mode = 'title';
    this.backFn = null;
    const starters = STARTERS.map(byId);
    g.setShowcase(starters, 'line');
    playMusic('menu');
    this.root.innerHTML = `
      <div class="welcome">
        <div class="prof">
          <div class="prof-icon"><svg viewBox="0 0 64 64"><ellipse cx="32" cy="40" rx="20" ry="18" fill="#c98a4a" stroke="#2a1630" stroke-width="3"/><path d="M12 30c0-12 9-20 20-20s20 8 20 20z" fill="#7a4a2a" stroke="#2a1630" stroke-width="3"/><path d="M32 4v8" stroke="#2a1630" stroke-width="4" stroke-linecap="round"/><circle cx="25" cy="40" r="3" fill="#2a1630"/><circle cx="39" cy="40" r="3" fill="#2a1630"/><path d="M27 48q5 4 10 0" stroke="#2a1630" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="25" cy="40" r="7" fill="none" stroke="#2a1630" stroke-width="2"/><circle cx="39" cy="40" r="7" fill="none" stroke="#2a1630" stroke-width="2"/></svg></div>
          <div class="prof-box"><small>Professor Pecan</small><p class="prof-text"></p><div class="prof-ctrl"></div></div>
        </div>
      </div>`;
    const text = this.root.querySelector('.prof-text'), ctrl = this.root.querySelector('.prof-ctrl');
    const say = (msg, buttons) => {
      text.textContent = '';
      ctrl.innerHTML = '';
      let i = 0;
      clearInterval(this._typeT);
      this._typeT = setInterval(() => {
        text.textContent = msg.slice(0, ++i);
        if (i % 3 === 0) sfx.ui('move');
        if (i >= msg.length) { clearInterval(this._typeT); buttons(); }
      }, 22);
      text.onclick = () => { if (i < msg.length) { i = msg.length - 1; } };
    };
    const next = (label, fn) => ctrl.appendChild(this.btn(label, 'primary', fn));
    let name = '';
    const askName = () => say("First things first. What's your name, trainer?", () => {
      const inp = document.createElement('input');
      inp.className = 'name-in'; inp.maxLength = 12; inp.placeholder = 'Your name'; inp.autocomplete = 'off';
      ctrl.appendChild(inp);
      const ok = () => { name = inp.value.trim().slice(0, 12) || 'Sam'; inp.blur(); pickPartner(); };
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') ok(); });
      next('OK!', ok);
      setTimeout(() => inp.focus(), 50);
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
    if (!save.unlocked.includes(CRITTERS[this.sel].id)) this.sel = CRITTERS.findIndex((c) => save.unlocked.includes(c.id));
    const cup = this.ctx.kind === 'cup';
    const chal = this.ctx.kind === 'survival' || this.ctx.kind === 'daily';
    const badge = cup ? `<div class="cup-badge" style="--tc:${this.ctx.cup.color}">${this.ctx.cup.name}</div>`
      : chal ? `<div class="cup-badge" style="--tc:${this.ctx.kind === 'daily' ? '#3dc8ff' : '#ff7a3d'}">${this.ctx.kind === 'daily' ? 'Daily Challenge' : 'Survival'}</div>` : '<div class="diff"></div>';
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
      for (let k = 0; k < CRITTERS.length; k++) { i = (i + d + CRITTERS.length) % CRITTERS.length; if (save.unlocked.includes(CRITTERS[i].id)) break; }
      this.pick(i);
    };
    R.querySelector('.arrow.l').addEventListener('click', () => step(-1));
    R.querySelector('.arrow.r').addEventListener('click', () => step(1));
    const roster = R.querySelector('.roster');
    CRITTERS.forEach((c, i) => {
      const locked = !save.unlocked.includes(c.id);
      const b = document.createElement('button');
      b.className = 'rcard' + (locked ? ' locked' : '');
      b.style.setProperty('--tc', TYPES[c.type].color);
      b.innerHTML = `<img src="${g.portrait(c)}" alt=""><span>${save.trainer?.partner === c.id ? '♥ ' : ''}${locked ? '???' : c.name}</span>${locked ? '<em>🔒</em>' : `<i>Lv${save.critters[c.id].level}</i>`}`;
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
    R.querySelector('.go').appendChild(this.btn(cup ? 'GO!' : 'FIGHT!', 'primary big', () => (cup ? this.ladder() : this.vs())));
    this.pick(this.sel, true);
    removeEventListener('keydown', this._kn);
    addEventListener('keydown', this._kn = (e) => {
      if (this.mode !== 'select') return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') step(-1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') step(1);
      if (e.code === 'Enter') cup ? this.ladder() : this.vs();
    });
  }

  toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
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
    this.root.querySelector('.sel-info').innerHTML = this.infoCard(c);
    this.root.querySelectorAll('.rcard').forEach((b, k) => b.classList.toggle('on', k === i));
  }

  infoCard(c, extra = '') {
    const T = TYPES[c.type];
    const st = c.stats, prog = save.critters[c.id];
    const bar = (label, v) => `<div class="stat"><span>${label}</span><i><b style="width:${Math.round(Math.max(0.08, Math.min(1, v)) * 100)}%"></b></i></div>`;
    const beats = T.beats.map((b) => `<span class="mini-type" style="background:${TYPES[b].color}">${TYPES[b].name}</span>`).join('');
    return `
      <div class="info-card" style="--tc:${T.color}">
        <div class="ic-row"><span class="ic-type">${T.name} type</span><span class="ic-lv">Lv ${prog.level}</span></div>
        <h2>${c.name}</h2>
        <div class="ic-species">${c.species}</div>
        <p>${c.blurb}</p>
        <div class="stats">${bar('Health', (st.hp - 800) / 400)}${bar('Speed', (st.speed - 5) / 3)}${bar('Power', (st.power - 0.85) / 0.3)}${bar('Weight', (st.weight - 0.6) / 0.8)}</div>
        <div class="ic-beats"><small>Strong vs</small>${beats}</div>
        <div class="moves"><div><small>Special</small><b>${c.moves.special}</b></div><div><small>Super</small><b>${c.moves.super}</b></div></div>
        ${extra}
        <div class="xpbar"><i style="width:${(prog.xp / xpNeeded(prog.level)) * 100}%"></i></div>
      </div>`;
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
      <p>One fight after another. Damage carries over and every rival is tougher. How far can you go?</p>
      <div class="cup-meta">Best streak: <b>${save.stats.bestStreak || 0}</b></div>`,
    () => { this.ctx = { kind: 'survival', streak: 0, hp: 1, last: null }; this.select(); });
    card('daily' + (doneToday ? ' done' : ''), '#3dc8ff', `
      <div class="cup-trophy">${doneToday ? '✅' : '📅'}</div>
      <h2>Daily Challenge</h2>
      <p>${mod.icon} <b>${mod.name}</b>: ${mod.desc}</p>
      <div class="cup-foes"><img src="${g.portrait(skinned(foe, d.shiny ? 'shiny' : 'base'))}" alt=""></div>
      <div class="cup-meta">vs ${d.shiny ? '✦ ' : ''}${foe.name} · ${ARENA_NAME[d.arena]} · ${doneToday ? 'Cleared today!' : 'Double XP'}</div>`,
    () => { this.ctx = { kind: 'daily', d }; this.select(); });
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
    CRITTERS.forEach((c, k) => {
      const locked = !save.unlocked.includes(c.id);
      const b = document.createElement('button');
      b.className = 'dcard' + (locked ? ' locked' : '') + (save.shinies?.includes(c.id) ? ' has-shiny' : '');
      b.style.setProperty('--tc', TYPES[c.type].color);
      b.innerHTML = `<i>#${String(k + 1).padStart(3, '0')}</i><div class="pic"><img src="${g.portrait(c)}" alt=""></div><span>${locked ? '???' : c.name}</span>`;
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
      ${hasShiny ? '' : `<div class="dex-hint">Clear the ${cup ? cup.name : 'tournament'} to unlock.</div>`}` : '';
    const record = `<div class="dex-record"><span><b>${prog.wins || 0}</b> wins</span><span>Lv <b>${prog.level}</b></span><span>${TYPES[c.type].name}</span></div>`;
    const info = this.root.querySelector('.dex-info');
    info.innerHTML = this.infoCard(c, record + skins);
    info.querySelectorAll('.skin').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.skin === 'shiny' && !hasShiny) { sfx.ui('back'); this.toast(`Clear the ${cup ? cup.name : 'tournament'} to unlock`); return; }
      sfx.ui('ok');
      (save.skins ||= {})[c.id] = b.dataset.skin;
      persist();
      this.dexPick(i, b.dataset.skin === 'base');
      if (b.dataset.skin === 'shiny') { g.showcase[0].cheer = 1.2; sfx.jingle(2); }
    }));
    this.root.querySelectorAll('.dcard').forEach((b, k) => b.classList.toggle('on', k === i));
  }

  badgeModal() {
    const d = document.createElement('div');
    d.className = 'modal-wrap';
    d.innerHTML = `<div class="modal badges-modal"><h2>Badges</h2><div class="badge-grid">${BADGES.map((b) => {
      const got = save.badges?.[b.id];
      return `<div class="badge ${got ? 'got' : ''}"><i>${got ? b.icon : '🔒'}</i><b>${b.name}</b><small>${b.desc}</small></div>`;
    }).join('')}</div></div>`;
    d.querySelector('.modal').appendChild(this.btn('Close', 'primary', () => d.remove()));
    d.addEventListener('click', (e) => { if (e.target === d) d.remove(); });
    this.root.appendChild(d);
  }

  // ---------- tournament ladder ----------
  ladder() {
    const g = this.game;
    const { cup, idx } = this.ctx;
    this.mode = 'ladder';
    const m = cup.matches[idx];
    const foe = skinned(byId(m.critter), m.skin);
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
          <div class="tc-title">${m.boss ? 'CHAMPION · ' : ''}${m.title}</div>
          <h2>${m.name}</h2>
          <div class="bubble">“${m.taunt}”</div>
          <div class="tc-critter"><span class="mini-type" style="background:${TYPES[foe.type].color}">${TYPES[foe.type].name}</span> ${m.skin ? '✦ Shiny ' : ''}${foe.name} · Lv ${m.level}</div>
          <div class="tc-style">${STYLE_TAG[m.style] || ''}</div>${(m.mods || []).map((k) => `<div class="tc-style mod">${MODS[k].icon} ${MODS[k].name}</div>`).join('')}
          <div class="go"></div>
        </div>
      </div>`;
    this.root.firstElementChild.prepend(this.header(`${cup.name} · Battle ${idx + 1}/${cup.matches.length}`, () => this.select()));
    this.root.querySelector('.go').appendChild(this.btn('Battle!', 'primary big', () => this.vs()));
    sfx.voice(foe.voice, 'taunt');
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
      c = skinned(byId(m.critter), m.skin);
      const k = cup.matches.length > 1 ? idx / (cup.matches.length - 1) : 1;
      opts = { cpuLevel: m.level, difficulty: cup.diff[0] + (cup.diff[1] - cup.diff[0]) * k, playerLevel: save.critters[p.id].level, trainer: m, arena: cup.arena, mods: m.mods || [] };
      label = `${m.name} · Lv ${m.level}${m.mods?.length ? ' · ' + m.mods.map((k) => MODS[k].icon).join('') : ''}`;
    } else if (this.ctx.kind === 'survival') {
      const S = this.ctx, n = S.streak;
      const pool = CRITTERS.filter((x) => x.id !== p.id && x.id !== S.last);
      c = skinned(pick(pool), n >= 4 && Math.random() < 0.25 ? 'shiny' : 'base');
      S.last = c.id;
      const pl = save.critters[p.id].level;
      const mods = n >= 3 && Math.random() < 0.5 ? [pick(Object.keys(MODS))] : [];
      opts = { cpuLevel: pl + Math.floor(n / 2), difficulty: Math.min(0.95, 0.35 + n * 0.07), playerLevel: pl, arena: pick(ARENA_KEYS), rounds: 1, playerHp: S.hp, mods };
      label = `Challenger #${n + 1}${mods.length ? ' · ' + MODS[mods[0]].icon : ''}`;
    } else if (this.ctx.kind === 'daily') {
      const d = this.ctx.d;
      c = skinned(byId(d.foe), d.shiny ? 'shiny' : 'base');
      const pl = save.critters[p.id].level;
      opts = { cpuLevel: pl + 1, difficulty: 0.6, playerLevel: pl, arena: d.arena, mods: [d.mod] };
      label = `Daily · ${MODS[d.mod].icon} ${MODS[d.mod].name}`;
    } else {
      const others = CRITTERS.filter((x) => x.id !== p.id);
      c = others[Math.floor(Math.random() * others.length)];
      const pl = save.critters[p.id].level;
      opts = { cpuLevel: Math.max(1, pl + (this.diff - 1) * 2), difficulty: DIFFS[this.diff].v, playerLevel: pl, arena: pick(ARENA_KEYS) };
      label = `CPU · ${DIFFS[this.diff].name}`;
    }
    this.root.innerHTML = `
      <div class="vs-screen">
        <div class="vs-side l" style="--tc:${TYPES[p.type].color}"><img src="${g.portrait(p)}" alt=""><b>${p.name}</b><small>YOU · Lv ${opts.playerLevel}</small></div>
        <div class="vs-mark">VS</div>
        <div class="vs-side r" style="--tc:${TYPES[c.type].color}"><img src="${g.portrait(c)}" alt=""><b>${c.name}</b><small>${label}</small></div>
      </div>`;
    sfx.boom();
    setTimeout(() => g.startBattle(p, c, opts), 1900);
  }

  // ---------- results ----------
  results(won, stats, pDef, cDef, opts) {
    const g = this.game;
    this.mode = 'results';
    g.input.showTouch(false);
    g.hud.show(false);
    save.stats.battles++;
    if (won) save.stats.wins++;
    const cup = this.ctx.kind === 'cup' ? this.ctx : null;
    // XP: winning pays more, tougher foes pay more
    const kind = this.ctx.kind;
    const xp = Math.round(((won ? 50 : 18) + opts.cpuLevel * (won ? 14 : 5) + stats.maxCombo * 2 + (stats.perfect ? 30 : 0)) * (kind === 'daily' && won ? 2 : 1));
    // survival bookkeeping: streak, carried health, personal best
    let streakNote = '';
    if (kind === 'survival') {
      const S = this.ctx, pf = g.battle?.player;
      if (won) {
        S.streak++;
        S.hp = Math.min(1, (pf ? pf.hp / pf.maxHp : 1) + 0.3);
        save.stats.bestStreak = Math.max(save.stats.bestStreak || 0, S.streak);
        streakNote = `<div class="streak">🔥 Streak ${S.streak} · ${Math.round(S.hp * 100)}% health for the next fight</div>`;
      } else {
        const best = save.stats.bestStreak || 0;
        streakNote = `<div class="streak">Run over at <b>${S.streak}</b> win${S.streak === 1 ? '' : 's'}${S.streak >= best && S.streak > 0 ? ' · NEW BEST!' : ` · Best ${best}`}</div>`;
      }
    }
    if (kind === 'daily' && won) { (save.daily ||= {})[this.ctx.d.key] = true; streakNote = '<div class="streak">📅 Daily Challenge cleared! Double XP</div>'; }
    const prog = save.critters[pDef.id];
    const before = { level: prog.level, xp: prog.xp };
    if (won) prog.wins++;
    const lv = grantXp(pDef.id, xp);
    save.stats.bestCombo = Math.max(save.stats.bestCombo || 0, stats.maxCombo);
    save.stats.supers = (save.stats.supers || 0) + stats.supers;
    if (stats.perfect) save.stats.perfects = (save.stats.perfects || 0) + 1;
    let joined = false, cupDone = false, shinies = [];
    if (won && cup) {
      joined = unlock(cDef.id);
      if (cup.idx === cup.cup.matches.length - 1) {
        cupDone = true; save.cups[cup.cup.id] = true;
        save.shinies ||= [];
        shinies = [...new Set(cup.cup.matches.map((m) => m.critter))].filter((id) => !save.shinies.includes(id));
        save.shinies.push(...shinies);
      }
    }
    persist();
    this.ctx.newShinies = shinies;
    const badges = newBadges();
    badges.forEach((b, k) => setTimeout(() => { if (this.mode === 'results') { this.toast(`${b.icon} Badge earned: ${b.name}`); sfx.jingle(2); } }, 2600 + k * 2300));
    this.root.innerHTML = `
      <div class="results ${won ? 'won' : 'lost'}">
        <h1>${won ? 'VICTORY!' : 'DEFEAT'}</h1>
        <div class="res-card">
          <img src="${g.portrait(pDef)}" alt="">
          <div class="res-stats">
            <div class="res-grid">
              <div><small>Damage</small><b>${stats.dmgDealt}</b></div>
              <div><small>Best combo</small><b>${stats.maxCombo}</b></div>
              <div><small>Supers</small><b>${stats.supers}</b></div>
            </div>
            ${stats.perfect ? '<div class="perfect">PERFECT ROUND!</div>' : ''}
            ${streakNote}
            <div class="res-xp"><span>+${xp} XP</span><span class="res-lv">Lv ${before.level}</span></div>
            <div class="xpbar big"><i style="width:${(before.xp / xpNeeded(before.level)) * 100}%"></i></div>
          </div>
        </div>
        <div class="res-btns"></div>
      </div>`;
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
          bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth; bar.style.transition = '';
          fill();
        }, 700);
      } else bar.style.width = (prog.xp / xpNeeded(prog.level)) * 100 + '%';
    };
    setTimeout(fill, 500);

    const b = this.root.querySelector('.res-btns');
    if (kind === 'survival') {
      if (won) b.appendChild(this.btn('Next Challenger', 'primary', () => { g.endBattle(); playMusic('menu'); this.mode = 'select'; this.vs(); }));
      else b.appendChild(this.btn('New Run', 'primary', () => { this.ctx = { kind: 'survival', streak: 0, hp: 1, last: null }; g.endBattle(); playMusic('menu'); this.select(); }));
      b.appendChild(this.btn('Challenges', 'ghost', () => this.challenges()));
    } else if (kind === 'daily') {
      if (!won) b.appendChild(this.btn('Try Again', 'primary', () => g.startBattle(pDef, cDef, { ...opts, playerLevel: save.critters[pDef.id].level })));
      b.appendChild(this.btn('Challenges', won ? 'primary' : 'ghost', () => this.challenges()));
    } else if (cup) {
      if (won && !cupDone) b.appendChild(this.btn('Next Battle', 'primary', () => { cup.idx++; g.endBattle(); playMusic('menu'); this.ladder(); }));
      else if (!won) {
        b.appendChild(this.btn('Try Again', 'primary', () => g.startBattle(pDef, cDef, { ...opts, playerLevel: save.critters[pDef.id].level })));
        b.appendChild(this.btn('Give Up', 'ghost', () => this.cups()));
      } else b.appendChild(this.btn('Collect Trophy', 'primary', () => this.trophy(cup.cup)));
    } else {
      b.appendChild(this.btn('Rematch', 'primary', () => g.startBattle(pDef, cDef, { ...opts, playerLevel: save.critters[pDef.id].level })));
      b.appendChild(this.btn('Change Critter', '', () => { g.endBattle(); this.select(); playMusic('menu'); }));
      b.appendChild(this.btn('Title', 'ghost', () => this.title()));
    }
    if (joined) setTimeout(() => this.recruit(cDef), 1600);
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
    this.root.querySelector('.res-btns').appendChild(this.btn('Continue', 'primary big', () => this.cups()));
    sfx.cheer(1.5);
  }

  pauseMenu(on) {
    let p = this.root.querySelector('.pause');
    if (!on) { p?.remove(); return; }
    p = document.createElement('div');
    p.className = 'modal-wrap pause';
    p.innerHTML = '<div class="modal"><h2>Paused</h2><div class="col"></div></div>';
    const col = p.querySelector('.col');
    col.appendChild(this.btn('Resume', 'primary', () => this.game.pause()));
    col.appendChild(this.btn('How to Play', '', () => this.howTo()));
    col.appendChild(this.btn('Settings', '', () => openSettings(this.game, this.root)));
    col.appendChild(this.btn('Quit to Title', 'ghost', () => { this.game.paused = false; this.title(); }));
    p.addEventListener('click', (e) => { if (e.target === p) this.game.pause(); });
    this.root.appendChild(p);
  }

  update(dt) {
    this.t += dt;
    const cam = this.game.camera;
    if (this.mode === 'title') {
      const a = Math.sin(this.t * 0.15) * 0.35;
      const D = cam.aspect < 1 ? 11 : 7.5;
      cam.position.set(Math.sin(a) * D, 2.2, Math.cos(a) * D);
      cam.lookAt(0, cam.aspect < 1 ? 1.6 : 1.1, 0);
      cam.fov = Math.min(78, 40 * Math.max(1, 1.6 / cam.aspect));
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
