// First-battle coach: short prompts that advance when the player does the thing.
import { isTouch } from './input.js';
import { save, persist } from './save.js';
import { sfx } from './audio.js';

const STEPS = [
  { id: 'move', touch: 'Drag on the left side to move', keys: 'Move with WASD or the arrow keys', done: (b, s) => s.moved > 3 },
  { id: 'combo', touch: 'Tap the pink HIT button 3 times for a combo!', keys: 'Press J (or Space) 3 times for a combo!', done: (b) => b.player.state === 'attack' && b.player.combo === 2 },
  { id: 'dodge', touch: 'Tap the blue DODGE button to roll', keys: 'Press L (or Shift) to dodge-roll', done: (b) => b.player.state === 'dodge' },
  { id: 'special', touch: 'Tap the yellow SPECIAL for your signature move', keys: 'Press K for your signature special', done: (b) => b.player.state === 'special' },
  { id: 'guard', touch: 'Hold the purple GUARD to block. Tap it right as they hit to PARRY!', keys: 'Hold O to guard. Press it right as they hit to PARRY!', done: (b) => b.player.state === 'guard' && b.player.st > 0.3 },
  { id: 'fight', touch: 'Great! Now bonk them!', keys: 'Great! Now bonk them!', done: (b, s) => s.t > 3 },
];

export class Tutorial {
  constructor(battle) {
    this.b = battle;
    this.i = 0;
    this.s = { moved: 0, t: 0 };
    this.gap = 0.8;
    this.el = document.createElement('div');
    this.el.className = 'coach';
    battle.hud.el.appendChild(this.el);
    this.superShown = false;
  }

  show(text) {
    this.el.innerHTML = `<span>${text}</span>`;
    this.el.classList.remove('on'); void this.el.offsetWidth; this.el.classList.add('on');
  }

  update(dt) {
    const b = this.b;
    if (b.phase !== 'fight') return;
    const p = b.player;
    this.s.moved += Math.hypot(p.vx, p.vz) * dt * (p.state === 'run' ? 1 : 0);
    this.s.t += dt;
    // keep the CPU gentle while the lesson runs
    b.brain.diff = this.i < STEPS.length - 1 ? 0.02 : this.baseDiff ?? (this.baseDiff = 0.15);
    if (this.i < STEPS.length - 1) { b.cpu.ctl.attack = b.cpu.ctl.special = b.cpu.ctl.super = false; }
    if (!this.superShown && p.superM >= 100) {
      this.superShown = true;
      this.show(isTouch ? 'SUPER charged! Tap the glowing ★' : 'SUPER charged! Press I to unleash it');
      sfx.ui('ok');
    }
    if (this.i >= STEPS.length) return;
    if (this.gap > 0) { this.gap -= dt; if (this.gap <= 0) { this.show(isTouch ? STEPS[this.i].touch : STEPS[this.i].keys); this.s.t = 0; } return; }
    if (STEPS[this.i].done(b, this.s)) {
      sfx.ui('ok');
      this.el.classList.add('done');
      this.i++;
      this.gap = 0.7;
      if (this.i >= STEPS.length) { save.tutorialDone = true; persist(); setTimeout(() => this.el.classList.remove('on'), 600); }
    }
  }

  dispose() { this.el.remove(); }
}
