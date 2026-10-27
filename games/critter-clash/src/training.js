// Training mode: an endless practice match with a configurable dummy, a combo readout and an input display.
import { CpuBrain } from './ai.js';
import { COMBO, MOVE_DESC, TYPES, typeMult } from './data.js';
import { traitOf } from './traits.js';
import { sfx } from './audio.js';

export const DUMMY = [
  { id: 'stand', name: 'Stand' },
  { id: 'guard', name: 'Guard' },
  { id: 'dodge', name: 'Dodge' },
  { id: 'cpu', name: 'Fight back' },
];

const KEYS = { attack: 'J', special: 'K', dodge: 'L', guard: 'O', super: 'I' };

// Move list for a critter, as HTML (shared by the training pause menu and the Critterdex)
export function moveList(def, touch) {
  const k = (a, label) => `<kbd>${touch ? label : KEYS[a]}</kbd>`;
  const combo = COMBO.reduce((s, h) => s + h.dmg, 0);
  return `<div class="mlist" style="--tc:${TYPES[def.type].color}">
    <div class="mv"><div class="mv-in">${k('attack', 'HIT')} ${k('attack', 'HIT')} ${k('attack', 'HIT')}</div><div><b>Triple Combo</b><p>Two quick strikes and a launcher. ${combo} damage if all three land.</p></div></div>
    <div class="mv sp"><div class="mv-in">${k('special', 'SPECIAL')}</div><div><b>${def.moves.special}</b> <i class="ty">${TYPES[def.type].name}</i><p>${MOVE_DESC[def.special] || ''}</p></div></div>
    <div class="mv su"><div class="mv-in">${k('super', 'SUPER')}</div><div><b>${def.moves.super}</b> <i class="ty">Full meter</i><p>${MOVE_DESC[def.super] || ''}</p></div></div>
    ${traitOf(def) ? `<div class="mv tr-row"><div class="mv-in"><kbd>${traitOf(def).icon}</kbd></div><div><b>${traitOf(def).name}</b> <i class="ty">Trait</i><p>${traitOf(def).desc} Always on.</p></div></div>` : ''}
    <div class="mv"><div class="mv-in">${k('dodge', 'DODGE')}</div><div><b>Dodge Roll</b><p>Untouchable for a moment. Cancels the end of your attacks.</p></div></div>
    <div class="mv"><div class="mv-in">${k('guard', 'GUARD')}</div><div><b>Guard &amp; Parry</b><p>Hold to block. Raise it just before a hit lands to <b>parry</b> and stun the rival.</p></div></div>
    <div class="mv ty-row"><div><b>Type matchups</b><p>${TYPES[def.type].name} hits ${Object.keys(TYPES).filter((t) => typeMult(def.type, t) > 1).map((t) => TYPES[t].name).join(' and ')} for extra damage.</p></div></div>
  </div>`;
}

export class Training {
  constructor(b) {
    this.b = b;
    this.mode = 0;
    this.cpu = new CpuBrain(b.cpu, 0.5);
    this.quiet = 0; // seconds since anyone was hit
    this.comboDmg = 0;
    this.lastCombo = { hits: 0, dmg: 0 };
    this.inputs = [];
    this.el = document.createElement('div');
    this.el.className = 'train';
    this.el.innerHTML = `
      <div class="train-box"><small>Training</small>
        <div class="train-combo"><b class="tc-hits">0</b> hits <b class="tc-dmg">0</b> dmg</div>
        <div class="train-best">Best: <span class="tc-best">0</span> dmg</div>
        <button class="chip on train-dummy"></button>
      </div>
      <div class="train-inputs"></div>`;
    this.best = 0;
    this.dummyBtn = this.el.querySelector('.train-dummy');
    this.dummyBtn.addEventListener('click', (e) => { e.stopPropagation(); this.cycle(); });
    this.refreshDummy();
    b.hud.el.appendChild(this.el);
    this.onKey = (e) => { if (e.code === 'KeyT' && !b.game.paused) this.cycle(); };
    addEventListener('keydown', this.onKey);
  }

  get dummy() { return DUMMY[this.mode].id; }

  cycle() {
    this.mode = (this.mode + 1) % DUMMY.length;
    this.refreshDummy();
    sfx.ui('move');
  }

  refreshDummy() { this.dummyBtn.innerHTML = `🎯 Dummy: <b>${DUMMY[this.mode].name}</b>`; }

  // called from Battle.applyHit before damage lands: never let anyone get KO'd
  guardKO(def, dmg) {
    if (def.hp - dmg <= 0) { def.hp = def.maxHp; def.dmgTrail = def.maxHp; }
  }

  onHit(att, dmg) {
    this.quiet = 0;
    if (att !== this.b.player) return;
    this.comboDmg = this.b.comboCount <= 1 ? dmg : this.comboDmg + dmg;
    this.lastCombo = { hits: this.b.comboCount, dmg: this.comboDmg };
    if (this.comboDmg > this.best) this.best = this.comboDmg;
    this.el.querySelector('.tc-hits').textContent = this.lastCombo.hits;
    this.el.querySelector('.tc-dmg').textContent = this.lastCombo.dmg;
    this.el.querySelector('.tc-best').textContent = this.best;
  }

  logInput(inp) {
    const names = { attack: 'HIT', special: 'SPC', dodge: 'DGE', super: 'SUP' };
    for (const a in names) if (inp.pressed[a]) this.inputs.unshift(`<span class="in-${a}">${names[a]}</span>`);
    if (inp.held.guard && !this.guarding) this.inputs.unshift('<span class="in-guard">GRD</span>');
    this.guarding = inp.held.guard;
    if (this.inputs.length > 8) this.inputs.length = 8;
    const html = this.inputs.join('');
    if (html !== this.lastHtml) { this.lastHtml = html; this.el.querySelector('.train-inputs').innerHTML = html; }
  }

  // drives the dummy's controls; returns nothing, writes cpu.ctl
  update(dt) {
    const b = this.b, d = b.cpu, p = b.player, c = d.ctl;
    this.quiet += dt;
    // health and meters refill once things calm down
    if (this.quiet > 1.6) for (const f of b.fighters) {
      f.hp = Math.min(f.maxHp, f.hp + f.maxHp * dt * 0.8);
      if (f === d) f.superM = Math.min(100, f.superM + dt * 40);
    }
    p.superM = Math.min(100, p.superM + dt * 8);
    if (this.dummy === 'cpu') { this.cpu.update(dt); return; }
    Object.assign(c, { mx: 0, mz: 0, attack: false, special: false, dodge: false, super: false, guard: false });
    const near = d.distTo(p) < 2.6;
    const threat = near && (p.state === 'attack' || p.state === 'special');
    if (this.dummy === 'guard') c.guard = d.guardHp > 15;
    else if (this.dummy === 'dodge' && threat && d.dodgeCd <= 0 && Math.random() < 0.15) {
      // roll away sideways
      const ax = (d.x - p.x), az = (d.z - p.z), l = Math.hypot(ax, az) || 1;
      c.mx = -az / l; c.mz = ax / l; c.dodge = true;
    }
    // drift back to the middle if knocked far away
    if (!near && Math.hypot(d.x, d.z) > 6 && this.dummy !== 'guard') { c.mx = -d.x / 8; c.mz = -d.z / 8; }
  }

  dispose() {
    removeEventListener('keydown', this.onKey);
    this.el.remove();
  }
}
