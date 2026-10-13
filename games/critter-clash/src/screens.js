// Title, critter select, VS splash, results and pause overlays.
import * as THREE from 'three';
import { CRITTERS, TYPES } from './data.js';
import { SPECIALS } from './fighter.js';
import { sfx, playMusic } from './audio.js';

const DIFFS = [{ name: 'Easy', v: 0.2 }, { name: 'Normal', v: 0.5 }, { name: 'Hard', v: 0.85 }];

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
  }

  hideAll() { this.root.innerHTML = ''; this.mode = null; }

  onAudioUnlocked() {
    if (this.mode === 'title' || this.mode === 'select') playMusic('menu');
  }

  btn(label, cls, fn) {
    const b = document.createElement('button');
    b.className = 'btn ' + cls;
    b.innerHTML = label;
    b.addEventListener('click', (e) => { e.stopPropagation(); sfx.ui('ok'); navigator.vibrate?.(10); fn(); });
    return b;
  }

  title() {
    const g = this.game;
    g.endBattle();
    this.mode = 'title';
    this.t = 0;
    g.setShowcase(CRITTERS, 'line');
    this.root.innerHTML = `
      <div class="title-screen">
        <div class="logo">
          <div class="logo-top" data-t="CRITTER">CRITTER</div>
          <div class="logo-bot" data-t="CLASH!">CLASH!</div>
          <div class="logo-sub">Tiny critters. Huge bonks.</div>
        </div>
        <div class="title-menu"></div>
        <div class="title-foot">v0.1 · Round 1 build</div>
      </div>`;
    const m = this.root.querySelector('.title-menu');
    m.appendChild(this.btn('Quick Battle', 'primary big', () => this.select()));
    m.appendChild(this.btn('How to Play', 'ghost', () => this.howTo()));
    playMusic('menu');
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
        <li><b>Super</b><span>Fills as you trade hits. When it glows, unleash it! · I</span></li>
        <li><b>Types</b><span>Blaze &gt; Sprout &gt; Splash &gt; Blaze, and Zap &gt; Splash. Hitting a weakness deals extra damage.</span></li>
        <li><b>Dizzy</b><span>Too many hits in a row makes a critter see stars. Mash buttons to shake it off!</span></li>
      </ul></div>`;
    const close = this.btn('Got it!', 'primary', () => d.remove());
    d.querySelector('.modal').appendChild(close);
    d.addEventListener('click', (e) => { if (e.target === d) d.remove(); });
    this.root.appendChild(d);
  }

  select() {
    const g = this.game;
    this.mode = 'select';
    this.t = 0;
    g.setShowcase([CRITTERS[this.sel]], 'single');
    this.root.innerHTML = `
      <div class="select-screen">
        <div class="sel-head"><button class="icon-btn back" aria-label="Back">‹</button><h1>Choose your Critter</h1></div>
        <div class="sel-info"></div>
        <div class="sel-arrows"><button class="arrow l" aria-label="Previous">‹</button><button class="arrow r" aria-label="Next">›</button></div>
        <div class="sel-bottom">
          <div class="roster"></div>
          <div class="sel-actions">
            <div class="diff"></div>
            <div class="go"></div>
          </div>
        </div>
      </div>`;
    const R = this.root;
    R.querySelector('.back').addEventListener('click', () => { sfx.ui('back'); this.title(); });
    R.querySelector('.arrow.l').addEventListener('click', () => this.pick((this.sel + CRITTERS.length - 1) % CRITTERS.length));
    R.querySelector('.arrow.r').addEventListener('click', () => this.pick((this.sel + 1) % CRITTERS.length));
    const roster = R.querySelector('.roster');
    CRITTERS.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'rcard';
      b.style.setProperty('--tc', TYPES[c.type].color);
      b.innerHTML = `<img src="${g.portrait(c)}" alt=""><span>${c.name}</span>`;
      b.addEventListener('click', () => this.pick(i));
      roster.appendChild(b);
    });
    const diff = R.querySelector('.diff');
    DIFFS.forEach((d, i) => {
      const b = document.createElement('button');
      b.className = 'chip' + (i === this.diff ? ' on' : '');
      b.textContent = d.name;
      b.addEventListener('click', () => { this.diff = i; sfx.ui('move'); diff.querySelectorAll('.chip').forEach((x, k) => x.classList.toggle('on', k === i)); });
      diff.appendChild(b);
    });
    R.querySelector('.go').appendChild(this.btn('FIGHT!', 'primary big', () => this.vs()));
    this.pick(this.sel, true);
    this.keyNav = (e) => {
      if (this.mode !== 'select') return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.pick((this.sel + CRITTERS.length - 1) % CRITTERS.length);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.pick((this.sel + 1) % CRITTERS.length);
      if (e.code === 'Enter' || e.code === 'Space') this.vs();
    };
    removeEventListener('keydown', this._kn);
    addEventListener('keydown', this._kn = this.keyNav);
  }

  pick(i, silent) {
    const g = this.game;
    this.sel = i;
    const c = CRITTERS[i];
    if (!silent) { sfx.ui('move'); sfx.voice(c.voice, 'taunt'); }
    g.setShowcase([c], 'single');
    g.showcase[0].cheer = 0.8;
    const T = TYPES[c.type];
    const st = c.stats;
    const bar = (label, v) => `<div class="stat"><span>${label}</span><i><b style="width:${Math.round(v * 100)}%"></b></i></div>`;
    this.root.querySelector('.sel-info').innerHTML = `
      <div class="info-card" style="--tc:${T.color}">
        <div class="ic-type">${T.name} type</div>
        <h2>${c.name}</h2>
        <div class="ic-species">${c.species}</div>
        <p>${c.blurb}</p>
        ${bar('Health', (st.hp - 800) / 300)}${bar('Speed', (st.speed - 5) / 3)}${bar('Power', (st.power - 0.8) / 0.35)}${bar('Weight', (st.weight - 0.6) / 0.5)}
        <div class="moves"><div><small>Special</small><b>${c.moves.special}</b></div><div><small>Super</small><b>${c.moves.super}</b></div></div>
      </div>`;
    this.root.querySelectorAll('.rcard').forEach((b, k) => b.classList.toggle('on', k === i));
    void SPECIALS;
  }

  vs() {
    const g = this.game;
    if (this.mode !== 'select') return;
    this.mode = 'vs';
    const p = CRITTERS[this.sel];
    const others = CRITTERS.filter((c) => c !== p);
    const c = others[Math.floor(Math.random() * others.length)];
    this.root.innerHTML = `
      <div class="vs-screen">
        <div class="vs-side l" style="--tc:${TYPES[p.type].color}"><img src="${g.portrait(p)}" alt=""><b>${p.name}</b><small>YOU</small></div>
        <div class="vs-mark">VS</div>
        <div class="vs-side r" style="--tc:${TYPES[c.type].color}"><img src="${g.portrait(c)}" alt=""><b>${c.name}</b><small>CPU · ${DIFFS[this.diff].name}</small></div>
      </div>`;
    sfx.boom();
    setTimeout(() => g.startBattle(p, c, { difficulty: DIFFS[this.diff].v }), 1900);
  }

  results(won, stats, pDef, cDef, opts) {
    const g = this.game;
    this.mode = 'results';
    g.input.showTouch(false);
    g.hud.show(false);
    this.root.innerHTML = `
      <div class="results ${won ? 'won' : 'lost'}">
        <h1 data-t="${won ? 'VICTORY!' : 'DEFEAT'}">${won ? 'VICTORY!' : 'DEFEAT'}</h1>
        <div class="res-card">
          <img src="${g.portrait(pDef)}" alt="">
          <div class="res-stats">
            <div><small>Damage dealt</small><b>${stats.dmgDealt}</b></div>
            <div><small>Best combo</small><b>${stats.maxCombo} hits</b></div>
            <div><small>Supers used</small><b>${stats.supers}</b></div>
            ${stats.perfect ? '<div class="perfect">PERFECT ROUND!</div>' : ''}
          </div>
        </div>
        <div class="res-btns"></div>
      </div>`;
    const b = this.root.querySelector('.res-btns');
    b.appendChild(this.btn('Rematch', 'primary', () => g.startBattle(pDef, cDef, opts)));
    b.appendChild(this.btn('Change Critter', '', () => { g.endBattle(); this.select(); playMusic('menu'); }));
    b.appendChild(this.btn('Title', 'ghost', () => this.title()));
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
    } else if (this.mode === 'select' || this.mode === 'vs') {
      const c = this.game.showcase[0];
      if (c) c.root.rotation.y = Math.sin(this.t * 0.6) * 0.5 + 0.2;
      const portrait = cam.aspect < 1;
      // frame the critter off-centre so the info card has room
      const ox = portrait ? 0 : 1.0;
      cam.position.set(ox, 1.3, portrait ? 4.6 : 4.4);
      cam.lookAt(ox, portrait ? 0.35 : 0.75, 0);
      cam.fov = Math.min(70, 40 * Math.max(1, 1.4 / cam.aspect));
      cam.updateProjectionMatrix();
    }
  }
}
