// CPU opponent: spacing, combos, specials at their sweet-spot range, reactive dodges.
import { SPECIALS } from './fighter.js';

// trainer fighting styles tilt the same brain in different directions
export const STYLES = {
  balanced:  { aggro: 1, special: 1, guard: 1, dodge: 1, items: 1 },
  rushdown:  { aggro: 1.5, special: 0.6, guard: 0.5, dodge: 0.9, items: 0.6 },
  zoner:     { aggro: 0.6, special: 1.7, guard: 0.8, dodge: 1.3, items: 1 },
  turtle:    { aggro: 0.8, special: 0.9, guard: 2.2, dodge: 0.5, items: 1.2 },
  trickster: { aggro: 1.1, special: 1.2, guard: 0.6, dodge: 1.8, items: 1.6 },
};

export class CpuBrain {
  constructor(f, difficulty = 0.5, style = 'balanced') {
    this.f = f;
    this.diff = difficulty; // 0 = sleepy, 1 = champion
    this.S = STYLES[style] || STYLES.balanced;
    this.guardT = 0;
    this.think = 0;
    this.plan = 'approach';
    this.strafe = Math.random() < 0.5 ? 1 : -1;
    this.comboLen = 2;
    this.reactT = 0;
  }

  update(dt) {
    const f = this.f, o = f.opp, c = f.ctl, D = this.diff, S = this.S;
    c.attack = c.special = c.dodge = c.super = false;
    if (!f.alive || !o) return;
    // keep holding a guard for a beat once raised
    if (this.guardT > 0) {
      this.guardT -= dt;
      c.guard = this.guardT > 0 && f.guardHp > 20;
      c.mx = c.mz = 0;
      if (c.guard) return;
    } else c.guard = false;
    const d = f.distTo(o);
    const ax = (o.x - f.x) / (d || 1), az = (o.z - f.z) / (d || 1);

    // reactive dodge against a threat
    this.reactT -= dt;
    const threat = (o.state === 'attack' && o.st < 0.12 && d < 2.2) || (o.state === 'special' && d < 6) || (o.state === 'super' && o.superPhase !== 'cutin');
    if (threat && this.reactT <= 0 && f.actionable) {
      this.reactT = 0.5;
      const r = Math.random();
      const pDodge = (0.1 + D * 0.4) * S.dodge, pGuard = (0.06 + D * 0.35) * S.guard;
      if (r < pDodge && f.dodgeCd <= 0) {
        c.mx = -az * this.strafe; c.mz = ax * this.strafe;
        c.dodge = true;
        return;
      }
      if (r < pDodge + pGuard && f.guardHp > 40) { this.guardT = 0.35 + Math.random() * 0.4; c.guard = true; c.mx = c.mz = 0; return; }
    }
    // step out of an arena hazard's warning ring (sharper CPUs react sooner)
    const hz = f.battle.hazards?.danger(f.x, f.z);
    if (hz && f.actionable && hz.t > 0.5 - D * 0.4) {
      const hx = f.x - hz.x, hzz = f.z - hz.z, l = Math.hypot(hx, hzz) || 1;
      c.mx = hx / l; c.mz = hzz / l;
      return;
    }
    // grab a nearby power-up
    const item = f.battle.items?.nearest(f);
    if (item && f.actionable && item.d < 5 * S.items && item.d < d + 1 && Math.random() < 0.9) {
      const l = item.d || 1; c.mx = (item.x - f.x) / l; c.mz = (item.z - f.z) / l;
      return;
    }

    this.think -= dt;
    if (this.think <= 0) {
      this.think = 0.35 - D * 0.2 + Math.random() * 0.2;
      const sp = SPECIALS[f.def.special];
      // a rival who is reeling, knocked down or stuck in recovery is an opening; sharper CPUs pounce on it
      const open = o.state === 'dizzy' || o.state === 'getup' || o.state === 'hit' || (o.state === 'special' && o.st > 0.45);
      const lead = f.hp / f.maxHp - o.hp / o.maxHp, clock = f.battle.time;
      if (open && d < 5.5 && Math.random() < 0.25 + D * 0.65) {
        this.plan = o.state === 'dizzy' && f.superM >= 100 ? 'super' : 'attack';
        this.comboLen = 3;
        this.think = 0.15;
        // fall through to movement with the new plan
      } else if (f.superM >= 100 && d < 6 && Math.random() < (f.hp / f.maxHp < 0.3 ? 0.6 : 0.3) + D * 0.5) this.plan = 'super';
      // ahead late in the round: careful trainers play keep-away and run the clock down
      else if (lead > 0.2 && clock < 15 && S.aggro < 1.2 && Math.random() < 0.5 * S.guard) this.plan = 'retreat';
      else if (f.specCd <= 0 && d >= sp.range[0] && d <= sp.range[1] && Math.random() < (0.25 + D * 0.35) * S.special) this.plan = 'special';
      else if (d < 1.7) this.plan = Math.random() < (0.15 + (1 - D) * 0.2) / S.aggro ? 'retreat' : 'attack';
      else if (S.special > 1.3 && d < 3.5 && Math.random() < 0.4) this.plan = 'retreat';
      else if (Math.random() < 0.18) this.plan = 'circle';
      else this.plan = 'approach';
      if (Math.random() < 0.3) this.strafe *= -1;
      if (this.think !== 0.15) this.comboLen = Math.random() < 0.3 + D * 0.6 ? 3 : 1 + Math.floor(Math.random() * 2);
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
      else if (f.actionable) c.attack = Math.random() < Math.min(0.95, (0.35 + D * 0.5) * S.aggro);
    }
  }
}
