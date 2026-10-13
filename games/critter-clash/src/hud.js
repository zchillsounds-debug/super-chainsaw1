// Battle HUD: health/super bars with damage trail, timer, combo counter, announcer and super cut-ins.
import { TYPES } from './data.js';
import { sfx } from './audio.js';

export class Hud {
  constructor(ui, game) {
    this.game = game;
    const el = this.el = document.createElement('div');
    el.className = 'hud hidden';
    el.innerHTML = `
      <div class="hud-top">
        ${[0, 1].map((i) => `
        <div class="pbar p${i + 1}">
          <div class="portrait"><img alt=""></div>
          <div class="pbar-body">
            <div class="pname"><span class="nm"></span><span class="lv"></span><span class="type-chip"></span></div>
            <div class="hp"><div class="hp-trail"></div><div class="hp-fill"></div><div class="hp-shine"></div></div>
            <div class="sm"><div class="sm-fill"></div><span class="sm-label">SUPER</span></div>
            <div class="wins"><i></i><i></i></div>
          </div>
        </div>`).join('')}
        <div class="timer"><span>60</span></div>
      </div>
      <button class="pause-btn" aria-label="Pause"><svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg></button>
      <div class="combo"><b>0</b><span>HITS!</span></div>
      <div class="announce"></div>
      <div class="callouts"></div>
      <div class="namecard"><div class="nc-band"><small></small><b></b><span class="nc-type"></span></div></div>
      <div class="cutin"><div class="cutin-band"><div class="cutin-lines"></div><img alt=""><div class="cutin-text"><small></small><b></b></div></div></div>
      <div class="impact"></div><div class="speedlines"></div>`;
    ui.appendChild(el);
    this.q = (s) => el.querySelector(s);
    this.bars = [0, 1].map((i) => {
      const r = el.querySelector('.p' + (i + 1));
      return { r, fill: r.querySelector('.hp-fill'), trail: r.querySelector('.hp-trail'), sm: r.querySelector('.sm-fill'), smWrap: r.querySelector('.sm'), wins: r.querySelectorAll('.wins i'), img: r.querySelector('img'), nm: r.querySelector('.nm'), lv: r.querySelector('.lv'), chip: r.querySelector('.type-chip') };
    });
    this.timerEl = this.q('.timer span');
    this.comboEl = this.q('.combo');
    this.annEl = this.q('.announce');
    this.cutEl = this.q('.cutin');
    this.q('.pause-btn').addEventListener('click', () => game.pause());
    this.lastTime = -1;
  }

  speedLines(on) {
    if (on === this._sl) return;
    this._sl = on;
    this.q('.speedlines').classList.toggle('on', !!on);
  }

  show(on) { this.el.classList.toggle('hidden', !on); }

  setup(b) {
    b.fighters.forEach((f, i) => {
      const B = this.bars[i];
      B.img.src = this.game.portrait(f.def);
      B.nm.textContent = i === 1 && b.trainer ? `${b.trainer.name}'s ${f.def.name}` : f.def.name;
      B.lv.textContent = 'Lv' + f.level;
      B.chip.textContent = TYPES[f.type].name;
      B.chip.style.background = TYPES[f.type].color;
      B.r.style.setProperty('--tc', TYPES[f.type].color);
      B.wins.forEach((w) => w.classList.remove('on'));
    });
    this.show(true);
  }

  setWins(w) { this.bars.forEach((B, i) => B.wins.forEach((el, k) => el.classList.toggle('on', k < w[i]))); }

  update(b) {
    b.fighters.forEach((f, i) => {
      const B = this.bars[i];
      const hp = f.hp / f.maxHp;
      B.fill.style.transform = `scaleX(${hp})`;
      B.trail.style.transform = `scaleX(${f.dmgTrail / f.maxHp})`;
      B.r.classList.toggle('low', hp < 0.3);
      B.sm.style.transform = `scaleX(${f.superM / 100})`;
      B.smWrap.classList.toggle('ready', f.superM >= 100);
    });
    const t = Math.ceil(b.time);
    if (t !== this.lastTime) {
      this.lastTime = t;
      this.timerEl.textContent = t;
      this.timerEl.parentElement.classList.toggle('hurry', t <= 10 && b.phase === 'fight');
      if (t <= 5 && t > 0 && b.phase === 'fight') sfx.beep(false);
    }
  }

  combo(n) {
    const c = this.comboEl;
    if (n < 2) { c.classList.remove('on'); return; }
    c.querySelector('b').textContent = n;
    c.classList.remove('on', 'pop');
    void c.offsetWidth;
    c.classList.add('on', 'pop');
  }

  announce(text, cls = '', life = 1400) {
    const a = document.createElement('div');
    a.className = 'ann ' + cls;
    a.innerHTML = `<span data-t="${text}">${text}</span>`;
    this.annEl.appendChild(a);
    setTimeout(() => a.remove(), life);
  }

  // smaller praise banner on one side of the screen ("NICE COMBO!", "PERFECT!")
  callout(text, side = 0, level = 1) {
    const box = this.q('.callouts');
    const a = document.createElement('div');
    a.className = `callout s${side} l${level}`;
    a.innerHTML = `<span>${text}</span>`;
    box.appendChild(a);
    while (box.children.length > 2) box.firstChild.remove();
    sfx.jingle(level);
    setTimeout(() => a.remove(), 1500);
  }

  roundIntro(round, wins, first) {
    this.setWins(wins);
    const final = wins[0] === wins[1] && wins[0] > 0;
    setTimeout(() => { this.announce(final ? 'FINAL ROUND' : 'ROUND ' + round, 'round', 1300); sfx.gong(); }, first ? 3300 : 150);
  }

  countdown() {
    const steps = ['3', '2', '1'];
    steps.forEach((s, i) => setTimeout(() => { this.announce(s, 'count', 600); sfx.beep(false); }, i * 450));
    setTimeout(() => { this.announce('CLASH!', 'fight', 1000); sfx.beep(true); sfx.cheer(1); this.game.arena.cheer(1); }, 1350);
  }

  // anime-style lower-third introducing a critter during the intro close-ups
  nameCard(f, trainer) {
    const c = this.q('.namecard');
    c.style.setProperty('--tc', TYPES[f.type].color);
    c.classList.toggle('right', f.side === 1);
    c.querySelector('small').textContent = trainer ? `${trainer.title} ${trainer.name}'s` : f.side ? 'Rival' : 'Your partner';
    c.querySelector('b').textContent = f.def.name;
    c.querySelector('.nc-type').textContent = `${TYPES[f.type].name} type · Lv${f.level} ${f.def.species}`;
    c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
    clearTimeout(this.ncT);
    this.ncT = setTimeout(() => c.classList.remove('on'), 1450);
  }

  cutIn(f) {
    const c = this.cutEl;
    c.style.setProperty('--tc', TYPES[f.type].color);
    c.querySelector('img').src = this.game.portrait(f.def);
    c.querySelector('small').textContent = f.def.name + ' unleashes';
    c.querySelector('b').textContent = f.def.moves.super + '!';
    c.classList.toggle('right', f.side === 1);
    c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
    setTimeout(() => c.classList.remove('on'), 1250);
  }
}
