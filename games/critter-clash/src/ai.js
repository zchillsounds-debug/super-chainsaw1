// CPU opponent: spacing, combos, specials at their sweet-spot range, reactive dodges.
import { SPECIALS } from './fighter.js';

export class CpuBrain {
  constructor(f, difficulty = 0.5) {
    this.f = f;
    this.diff = difficulty; // 0 = sleepy, 1 = champion
    this.think = 0;
    this.plan = 'approach';
    this.strafe = Math.random() < 0.5 ? 1 : -1;
    this.comboLen = 2;
    this.reactT = 0;
  }

  update(dt) {
    const f = this.f, o = f.opp, c = f.ctl, D = this.diff;
    c.attack = c.special = c.dodge = c.super = false;
    if (!f.alive || !o) return;
    const d = f.distTo(o);
    const ax = (o.x - f.x) / (d || 1), az = (o.z - f.z) / (d || 1);

    // reactive dodge against a threat
    this.reactT -= dt;
    const threat = (o.state === 'attack' && o.st < 0.12 && d < 2.2) || (o.state === 'special' && d < 6) || (o.state === 'super' && o.superPhase !== 'cutin');
    if (threat && this.reactT <= 0 && f.actionable && f.dodgeCd <= 0) {
      this.reactT = 0.5;
      if (Math.random() < 0.12 + D * 0.5) {
        c.mx = -az * this.strafe; c.mz = ax * this.strafe;
        c.dodge = true;
        return;
      }
    }

    this.think -= dt;
    if (this.think <= 0) {
      this.think = 0.35 - D * 0.2 + Math.random() * 0.2;
      const sp = SPECIALS[f.def.special];
      if (f.superM >= 100 && d < 6 && Math.random() < 0.3 + D * 0.5) this.plan = 'super';
      else if (f.specCd <= 0 && d >= sp.range[0] && d <= sp.range[1] && Math.random() < 0.25 + D * 0.35) this.plan = 'special';
      else if (d < 1.7) this.plan = Math.random() < 0.15 + (1 - D) * 0.2 ? 'retreat' : 'attack';
      else if (Math.random() < 0.18) this.plan = 'circle';
      else this.plan = 'approach';
      if (Math.random() < 0.3) this.strafe *= -1;
      this.comboLen = Math.random() < 0.3 + D * 0.6 ? 3 : 1 + Math.floor(Math.random() * 2);
    }

    // movement intent
    let mx = 0, mz = 0;
    if (this.plan === 'approach' || this.plan === 'attack' && d > 1.4) { mx = ax; mz = az; }
    else if (this.plan === 'circle') { mx = -az * this.strafe + ax * 0.3; mz = ax * this.strafe + az * 0.3; }
    else if (this.plan === 'retreat') { mx = -ax * 0.8 - az * this.strafe * 0.5; mz = -az * 0.8 + ax * this.strafe * 0.5; }
    const slow = 0.75 + D * 0.25;
    c.mx = mx * slow; c.mz = mz * slow;

    if (this.plan === 'super') { c.super = true; this.plan = 'approach'; }
    else if (this.plan === 'special' && f.actionable) { c.special = true; this.plan = 'circle'; }
    else if (this.plan === 'attack' && d < 1.6) {
      if (f.state === 'attack') c.attack = f.combo + 1 < this.comboLen;
      else if (f.actionable) c.attack = Math.random() < 0.35 + D * 0.5;
    }
  }
}
