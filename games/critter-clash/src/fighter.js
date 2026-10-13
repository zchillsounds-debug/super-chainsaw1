// A critter in battle: movement, combo/special/super state machine, hit reactions.
import * as THREE from 'three';
import { Critter } from './critters.js';
import { COMBO, TYPES } from './data.js';
import { ARENA_R } from './arena.js';
import { sfx } from './audio.js';
import { introAnim, winAnim } from './personality.js';

const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

export const SPECIALS = {
  comet:   { cd: 4.2, range: [2, 7] },
  bubble:  { cd: 3.6, range: [3, 9] },
  leafrang:{ cd: 3.8, range: [3, 8] },
  zipzap:  { cd: 4.0, range: [1.5, 6] },
  rollout: { cd: 4.5, range: [2, 8] },
  gale:    { cd: 3.8, range: [3, 9] },
  iceslide:{ cd: 4.2, range: [2, 8] },
  wisps:   { cd: 4.0, range: [3, 9] },
};

// translucent fresnel bubble shown while guarding
function makeShield(color, h) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 20), new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uAmt: { value: 0.6 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uAmt; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        float f = pow(1.0 - abs(dot(vN, vV)), 2.2);
        float hex = step(0.86, fract(vP.y * 9.0 + sin(vP.x * 14.0) * 0.15)) * 0.25;
        float a = (f * 0.9 + 0.08 + hex * f) * uAmt;
        gl_FragColor = vec4(uColor * (0.6 + f) + vec3(f * 0.5), a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  m.position.y = h * 0.5;
  m.scale.setScalar(0.001);
  m.userData = { k: 0, flash: 0 };
  m.visible = false;
  m.renderOrder = 5;
  return m;
}

export class Fighter {
  constructor(battle, def, { level = 1, cpu = false, side = 0 } = {}) {
    this.battle = battle;
    this.def = def;
    this.cpu = cpu;
    this.side = side;
    this.level = level;
    this.critter = new Critter(def);
    this.root = this.critter.root;
    battle.scene.add(this.root);
    const lv = 1 + (level - 1) * 0.06;
    this.maxHp = Math.round(def.stats.hp * lv);
    this.power = def.stats.power * lv;
    this.speed = def.stats.speed;
    this.weight = def.stats.weight;
    this.type = def.type;
    this.ctl = { mx: 0, mz: 0, attack: false, special: false, dodge: false, super: false, guard: false };
    this.shield = makeShield(TYPES[def.type].glow, def.body.h + def.body.headR + 0.35);
    this.root.add(this.shield);
    this.reset(side ? 4.5 : -4.5, 0);
  }

  reset(x, z) {
    this.x = x; this.z = z; this.y = 0;
    this.vx = this.vz = this.vy = 0;
    this.face = this.x < 0 ? Math.PI / 2 : -Math.PI / 2;
    this.hp = this.maxHp;
    this.dmgTrail = this.maxHp;
    this.superM = this.superM ?? 0;
    this.specCd = 0; this.dodgeCd = 0;
    this.state = 'idle'; this.st = 0;
    this.combo = 0; this.queued = false;
    this.invuln = 0;
    this.dizzy = 0; this.dizzyT = 0;
    this.hitIds = new Set();
    this.atkId = 0;
    this.paralyze = 0;
    this.guardHp = 100; this.guardRegenT = 0;
    this.speedBoost = 0;
    this.stepT = 0;
    this.spinX = 0;
    this.critter.resetPose();
    this.critter.emote('open', 'smile');
    this.syncRoot();
  }

  get opp() { return this.battle.fighters[1 - this.side]; }
  get alive() { return this.hp > 0; }
  get busy() { return !['idle', 'run'].includes(this.state); }
  get actionable() { return ['idle', 'run'].includes(this.state) || (this.state === 'attack' && this.st > this.atkEnd()); }
  get airborne() { return this.y > 0.02; }

  setState(s) { this.state = s; this.st = 0; this.fxOnce = null; }

  distTo(o) { return Math.hypot(o.x - this.x, o.z - this.z); }
  angleTo(o) { return Math.atan2(o.x - this.x, o.z - this.z); }

  atk() { return COMBO[this.combo]; }
  atkEnd() { const a = this.atk(); return a.startup + a.active; }

  // -------- per-frame --------
  update(dt) {
    this.st += dt;
    this.specCd = Math.max(0, this.specCd - dt);
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.dmgTrail = Math.max(this.hp, this.dmgTrail - this.maxHp * 0.35 * dt * (this.dmgDelay > 0 ? 0 : 1));
    this.dmgDelay = (this.dmgDelay || 0) - dt;
    this.dizzy = Math.max(0, this.dizzy - dt * 9);
    const c = this.ctl, P = this.critter.pose;
    this.critter.resetPose();
    const o = this.opp;
    const S = this.state;

    // gravity & air
    if (this.y > 0 || this.vy > 0) {
      this.vy -= this.battle.grav * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.onLand(); }
    }

    if (S === 'idle' || S === 'run') {
      const ml = Math.hypot(c.mx, c.mz);
      if (this.paralyze > 0) { this.paralyze -= dt; }
      if (ml > 0.15 && this.paralyze <= 0) {
        if (S !== 'run') this.setState('run');
        const sp = this.speed * Math.min(1, ml) * (this.speedBoost > 0 ? 1.3 : 1);
        this.vx = THREE.MathUtils.damp(this.vx, c.mx / ml * sp, 14, dt);
        this.vz = THREE.MathUtils.damp(this.vz, c.mz / ml * sp, 14, dt);
        this.turnTo(Math.atan2(c.mx, c.mz), 14, dt);
      } else {
        if (S !== 'idle') this.setState('idle');
        this.vx = THREE.MathUtils.damp(this.vx, 0, 12, dt);
        this.vz = THREE.MathUtils.damp(this.vz, 0, 12, dt);
        if (o && o.alive) this.turnTo(this.angleTo(o), 6, dt);
      }
      if (c.guard && this.guardHp > 15 && this.paralyze <= 0) this.startGuard();
      else if (c.super && this.superM >= 100) this.battle.startSuper(this);
      else if (c.special && this.specCd <= 0) this.startSpecial();
      else if (c.dodge && this.dodgeCd <= 0) this.startDodge();
      else if (c.attack) this.startAttack(0);
    } else if (S === 'guard') {
      this.vx = THREE.MathUtils.damp(this.vx, 0, 10, dt);
      this.vz = THREE.MathUtils.damp(this.vz, 0, 10, dt);
      if (o && o.alive) this.turnTo(this.angleTo(o), 10, dt);
      this.guardHp = Math.max(0, this.guardHp - dt * 6); // holding it forever wears it down
      if (!c.guard && this.st > 0.12) { this.setState('idle'); this.critter.emote('open', 'smile'); }
      else if (c.dodge && this.dodgeCd <= 0) this.startDodge();
    } else if (S === 'attack') this.updateAttack(dt, c);
    else if (S === 'dodge') this.updateDodge(dt);
    else if (S === 'special') this.updateSpecial(dt);
    else if (S === 'super') this.battle.updateSuper(this, dt);
    else if (S === 'hit') {
      this.vx = THREE.MathUtils.damp(this.vx, 0, 6, dt);
      this.vz = THREE.MathUtils.damp(this.vz, 0, 6, dt);
      if (this.st > this.hitstun) this.recover();
    } else if (S === 'launched') {
      this.spinX += dt * 14;
      if (!this.airborne && this.st > 0.1) { /* handled by onLand */ }
    } else if (S === 'down') {
      this.vx = THREE.MathUtils.damp(this.vx, 0, 8, dt);
      this.vz = THREE.MathUtils.damp(this.vz, 0, 8, dt);
      if (this.alive && this.st > 0.55) { this.setState('getup'); this.invuln = 0.5; }
    } else if (S === 'getup') {
      if (this.st > 0.3) this.recover();
    } else if (S === 'dizzy') {
      this.vx = this.vz = 0;
      // mashing shortens the daze
      if (c.attack || c.special || c.dodge) this.dizzyT -= 0.12;
      if (this.st > this.dizzyT) { this.dizzy = 0; this.setState('idle'); this.critter.emote('open', 'smile'); }
    }

    // guard meter refills after a short rest; the bubble scales with what's left
    this.speedBoost = Math.max(0, this.speedBoost - dt);
    if (this.state !== 'guard') { this.guardRegenT -= dt; if (this.guardRegenT <= 0) this.guardHp = Math.min(100, this.guardHp + dt * 28); }
    else this.guardRegenT = 0.8;
    const sh = this.shield, on = this.state === 'guard';
    sh.userData.k = THREE.MathUtils.damp(sh.userData.k, on ? 1 : 0, 18, dt);
    sh.userData.flash = Math.max(0, sh.userData.flash - dt * 5);
    sh.visible = sh.userData.k > 0.02;
    sh.scale.setScalar(sh.userData.k * (0.75 + 0.25 * this.guardHp / 100) * (1 + sh.userData.flash * 0.12));
    sh.material.uniforms.uAmt.value = 0.55 + sh.userData.flash * 1.5 + (this.guardHp < 35 ? Math.sin(this.critter.t * 30) * 0.25 : 0);

    // integrate
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.collide();
    this.animate(dt);
    this.syncRoot();
  }

  recover() {
    if (this.dizzy >= 100 && this.alive) {
      this.setState('dizzy'); this.dizzyT = 2.2; this.dizzy = 0;
      this.battle.fx.text(this.headPos(), 'DIZZY!', 'dizzy', 1.1);
      sfx.bonk();
      return;
    }
    this.setState('idle');
    this.critter.emote('open', 'smile');
  }

  turnTo(a, rate, dt) { this.face += angDiff(this.face, a) * Math.min(1, rate * dt); }

  collide() {
    const r = Math.hypot(this.x, this.z), lim = ARENA_R - 0.45;
    if (r > lim) {
      const nx = this.x / r, nz = this.z / r;
      this.x = nx * lim; this.z = nz * lim;
      const vn = this.vx * nx + this.vz * nz;
      if (vn > 0) {
        if ((this.state === 'launched' || this.state === 'hit') && vn > 6) {
          this.battle.wallSplat(this, vn);
          this.vx -= 1.6 * vn * nx; this.vz -= 1.6 * vn * nz;
        } else { this.vx -= vn * nx; this.vz -= vn * nz; }
      }
    }
    const o = this.opp;
    if (o && this.state !== 'dodge' && o.state !== 'dodge' && this.state !== 'super' && o.state !== 'super') {
      const dx = this.x - o.x, dz = this.z - o.z, d = Math.hypot(dx, dz), min = 0.95;
      if (d < min && d > 1e-4 && Math.abs(this.y - o.y) < 0.8) {
        const push = (min - d) * 0.5;
        this.x += dx / d * push; this.z += dz / d * push;
      }
    }
  }

  onLand() {
    if (this.state === 'launched') {
      sfx.land();
      this.battle.fx.dust(this, 10, 1.2);
      this.battle.shake(0.25);
      if (Math.abs(this.vyAtLaunch) > 7 && !this.bounced) {
        // one comedic bounce
        this.bounced = true;
        this.vy = 4.5; this.y = 0.01;
        return;
      }
      this.setState('down');
      this.critter.emote(this.alive ? 'hurt' : 'dizzy', this.alive ? 'wobbly' : 'o', 1);
      if (!this.alive) this.battle.onKOLand(this);
    } else if (this.state === 'special' && this.def.special === 'comet') {
      // nothing
    } else if (this.state === 'super') {
      this.battle.superLand?.(this);
    } else {
      sfx.land();
      this.battle.fx.dust(this, 5, 0.8);
    }
  }

  // -------- attacks --------
  startAttack(i) {
    this.combo = i;
    this.setState('attack');
    this.queued = false;
    this.atkId++;
    this.hitIds.clear();
    const o = this.opp;
    // soft auto-aim
    if (o && this.distTo(o) < 5) this.face = this.face + angDiff(this.face, this.angleTo(o)) * 0.85;
    const a = this.atk();
    const dirX = Math.sin(this.face), dirZ = Math.cos(this.face);
    let lunge = a.lunge;
    if (o) { const d = this.distTo(o); if (d < 1.3) lunge *= 0.25; }
    this.vx = dirX * lunge; this.vz = dirZ * lunge;
    sfx.whoosh(1 + i * 0.15);
    if (i === 2) sfx.voice(this.def.voice, 'attack');
    this.critter.emote('angry', i === 2 ? 'yell' : 'open', 0.4);
  }

  updateAttack(dt, c) {
    const a = this.atk();
    this.vx = THREE.MathUtils.damp(this.vx, 0, 9, dt);
    this.vz = THREE.MathUtils.damp(this.vz, 0, 9, dt);
    if (c.attack && this.st > 0.04) this.queued = true;
    if (this.st >= a.startup && this.st < a.startup + a.active) this.tryHit(a);
    const total = a.startup + a.active + a.recover;
    if (this.queued && this.combo < 2 && this.st > a.startup + a.active * 0.5) {
      this.startAttack(this.combo + 1);
      return;
    }
    // dodge-cancel out of recovery
    if (c.dodge && this.dodgeCd <= 0 && this.st > a.startup + a.active) { this.startDodge(); return; }
    if (this.st >= total) { this.combo = 0; this.setState('idle'); this.critter.emote('open', 'smile'); }
  }

  tryHit(a) {
    const o = this.opp;
    if (!o || this.hitIds.has(o) || !o.alive) return;
    const d = this.distTo(o);
    if (d > a.range + 0.3) return;
    if (Math.abs(angDiff(this.face, this.angleTo(o))) > a.arc * 0.5 + (d < 0.9 ? 1.5 : 0)) return;
    if (Math.abs(o.y - this.y) > 1.3) return;
    this.hitIds.add(o);
    const ang = this.angleTo(o);
    this.battle.applyHit(this, o, {
      dmg: a.dmg * this.power, kb: a.kb, lift: a.lift, stun: a.stun, dirX: Math.sin(ang), dirZ: Math.cos(ang),
      heavy: !!a.launch, type: 'normal', launch: !!a.launch, dizzy: a.launch ? 26 : 14,
    });
  }

  startGuard() {
    this.setState('guard');
    this.vx *= 0.3; this.vz *= 0.3;
    this.critter.emote('angry', 'grin', 0.2);
  }

  // returns 'parry' | 'block' | 'break'
  blockHit(h, att) {
    const parry = this.st < 0.2 && !h.unblockable;
    if (parry) return 'parry';
    this.guardHp -= h.dmg * (h.unblockable ? 0.9 : 0.4);
    this.shield.userData.flash = 1;
    this.face = Math.atan2(-h.dirX, -h.dirZ);
    this.vx = h.dirX * h.kb * 0.35 / this.weight; this.vz = h.dirZ * h.kb * 0.35 / this.weight;
    void att;
    if (this.guardHp <= 0) {
      this.guardHp = 0; this.guardRegenT = 2;
      this.setState('dizzy'); this.dizzyT = 1.3; this.dizzy = 0;
      return 'break';
    }
    return 'block';
  }

  startDodge() {
    const c = this.ctl;
    const ml = Math.hypot(c.mx, c.mz);
    let dx, dz;
    if (ml > 0.2) { dx = c.mx / ml; dz = c.mz / ml; } else { dx = -Math.sin(this.face); dz = -Math.cos(this.face); }
    this.setState('dodge');
    this.dodgeDir = [dx, dz];
    this.dodgeCd = 0.55;
    this.invuln = 0.3;
    this.vx = dx * 15; this.vz = dz * 15;
    this.critter.emote('closed', 'o', 0.3);
    sfx.dodge();
    this.battle.fx.dust(this, 6, 0.9);
  }

  updateDodge(dt) {
    this.vx = THREE.MathUtils.damp(this.vx, 0, 7, dt);
    this.vz = THREE.MathUtils.damp(this.vz, 0, 7, dt);
    if (this.st < 0.25 && Math.random() < 0.5) {
      this.battle.fx.spawn({ x: this.x, y: 0.5 + Math.random() * 0.4, z: this.z, color: TYPES[this.type].glow, size: 0.5, life: 0.25, shape: 'glow', alpha: 0.5 });
    }
    if (this.st > 0.36) { this.setState('idle'); this.critter.emote('open', 'smile'); }
  }

  // -------- specials --------
  startSpecial() {
    const id = this.def.special;
    this.setState('special');
    this.specCd = SPECIALS[id].cd;
    this.atkId++;
    this.hitIds.clear();
    this.specFired = false;
    const o = this.opp;
    if (o) this.face = this.angleTo(o);
    this.vx = this.vz = 0;
    this.critter.emote('angry', 'yell', 0.6);
    sfx.voice(this.def.voice, 'special');
  }

  updateSpecial(dt) {
    const id = this.def.special, B = this.battle, o = this.opp;
    const fx = Math.sin(this.face), fz = Math.cos(this.face);
    const tcol = TYPES[this.type].glow;
    if (id === 'comet') {
      if (this.st < 0.28) {
        if (o) this.turnTo(this.angleTo(o), 10, dt);
        this.vx = this.vz = 0;
        if (Math.random() < 0.6) B.fx.spawn({ x: this.x + (Math.random() - 0.5), y: 0.2, z: this.z + (Math.random() - 0.5), vy: 3, color: 0xff8a30, size: 0.4, life: 0.35, shape: 'glow' });
      } else if (this.st < 0.68) {
        if (!this.specFired) { this.specFired = true; sfx.fire(); }
        this.vx = fx * 17; this.vz = fz * 17;
        this.trail(0xff7a2a, 0xffe060);
        if (o && !this.hitIds.has(o) && this.distTo(o) < 1.35 && o.alive) {
          this.hitIds.add(o);
          const ang = this.angleTo(o);
          B.applyHit(this, o, { dmg: 125 * this.power, kb: 11, lift: 6, stun: 0.6, dirX: Math.sin(ang), dirZ: Math.cos(ang), heavy: true, type: this.type, launch: true, dizzy: 30 });
          this.vx *= -0.3; this.vz *= -0.3; this.st = 0.68;
        }
      } else {
        this.vx = THREE.MathUtils.damp(this.vx, 0, 8, dt);
        this.vz = THREE.MathUtils.damp(this.vz, 0, 8, dt);
        if (this.st > 1.0) this.endSpecial();
      }
    } else if (id === 'bubble') {
      const shots = [0.22, 0.38, 0.54];
      this.shotN = this.shotN || 0;
      if (this.st < 0.2 && o) this.turnTo(this.angleTo(o), 12, dt);
      if (this.shotN < 3 && this.st > shots[this.shotN]) {
        const spread = (this.shotN - 1) * 0.22;
        const a = this.face + spread;
        B.spawnProjectile(this, { kind: 'bubble', x: this.x + Math.sin(a) * 0.7, z: this.z + Math.cos(a) * 0.7, y: 0.7, vx: Math.sin(a) * 9, vz: Math.cos(a) * 9, r: 0.45, life: 1.2,
          hit: { dmg: 48 * this.power, kb: 3.5, lift: 0, stun: 0.42, type: this.type, dizzy: 12 } });
        sfx.water();
        this.shotN++;
      }
      if (this.st > 0.85) { this.shotN = 0; this.endSpecial(); }
    } else if (id === 'leafrang') {
      if (this.st < 0.2 && o) this.turnTo(this.angleTo(o), 12, dt);
      if (!this.specFired && this.st > 0.2) {
        this.specFired = true;
        const a = this.face;
        B.spawnProjectile(this, { kind: 'leafrang', x: this.x + fx * 0.6, z: this.z + fz * 0.6, y: 0.75, vx: Math.sin(a) * 15, vz: Math.cos(a) * 15, r: 0.65, life: 1.7, returning: true,
          hit: { dmg: 62 * this.power, kb: 4, lift: 0, stun: 0.4, type: this.type, dizzy: 14 } });
        sfx.leaf();
      }
      if (this.st > 0.5) this.endSpecial();
    } else if (id === 'zipzap') {
      if (this.st < 0.16) {
        this.vx = this.vz = 0;
        if (o) this.turnTo(this.angleTo(o), 14, dt);
      } else if (this.st < 0.5) {
        if (!this.specFired) { this.specFired = true; sfx.spark(); this.invuln = 0.4; }
        // zig-zag dash
        const zig = Math.sin(this.st * 40) * 8;
        this.vx = fx * 19 + fz * zig; this.vz = fz * 19 - fx * zig;
        this.trail(0xfff060, 0x6ae0ff);
        if (Math.random() < 0.5) B.fx.spawn({ x: this.x, y: 0.6, z: this.z, color: 0xfff060, size: 1.2, life: 0.15, shape: 'bolt', rot: Math.random() * 6, stretch: 1.5 });
        if (o && !this.hitIds.has(o) && this.distTo(o) < 1.4 && o.alive) {
          this.hitIds.add(o);
          const ang = this.angleTo(o);
          B.applyHit(this, o, { dmg: 95 * this.power, kb: 2, lift: 0, stun: 0.9, dirX: Math.sin(ang), dirZ: Math.cos(ang), heavy: true, type: this.type, paralyze: 0.6, dizzy: 24 });
        }
      } else {
        this.vx = THREE.MathUtils.damp(this.vx, 0, 10, dt);
        this.vz = THREE.MathUtils.damp(this.vz, 0, 10, dt);
        if (this.st > 0.75) this.endSpecial();
      }
    } else if (id === 'rollout') {
      if (this.st < 0.3) {
        // curl up and rev in place
        this.vx = this.vz = 0;
        if (o) this.turnTo(this.angleTo(o), 10, dt);
        if (Math.random() < 0.5) B.fx.dust(this, 1, 0.6);
      } else if (this.st < 1.45) {
        if (!this.specFired) { this.specFired = true; sfx.land(); }
        if (o && o.alive) this.turnTo(this.angleTo(o), 2.6, dt);
        this.vx = Math.sin(this.face) * 13; this.vz = Math.cos(this.face) * 13;
        if (Math.random() < 0.6) B.fx.dust(this, 1, 0.8);
        if (o && !this.hitIds.has(o) && this.distTo(o) < 1.3 && o.alive) {
          this.hitIds.add(o);
          const ang = this.angleTo(o);
          B.applyHit(this, o, { dmg: 115 * this.power, kb: 9, lift: 5, stun: 0.6, dirX: Math.sin(ang), dirZ: Math.cos(ang), heavy: true, type: this.type, launch: true, dizzy: 28 });
          this.vx *= -0.4; this.vz *= -0.4; this.st = 1.45;
        }
      } else {
        this.vx = THREE.MathUtils.damp(this.vx, 0, 6, dt);
        this.vz = THREE.MathUtils.damp(this.vz, 0, 6, dt);
        if (this.st > 1.8) this.endSpecial();
      }
    } else if (id === 'gale') {
      if (this.st < 0.22 && o) this.turnTo(this.angleTo(o), 12, dt);
      if (!this.specFired && this.st > 0.22) {
        this.specFired = true;
        const a = this.face;
        // the puff kicks Hootsy backwards a little
        this.vx = -Math.sin(a) * 5; this.vz = -Math.cos(a) * 5;
        B.spawnProjectile(this, { kind: 'gale', x: this.x + fx * 0.8, z: this.z + fz * 0.8, y: 0.1, vx: Math.sin(a) * 7.5, vz: Math.cos(a) * 7.5, r: 0.9, life: 1.5, multi: 0.28,
          hit: { dmg: 30 * this.power, kb: 1, lift: 0, stun: 0.32, type: this.type, dizzy: 9 } });
        sfx.leaf();
      }
      this.vx = THREE.MathUtils.damp(this.vx, 0, 6, dt);
      this.vz = THREE.MathUtils.damp(this.vz, 0, 6, dt);
      if (this.st > 0.6) this.endSpecial();
    } else if (id === 'iceslide') {
      // flop onto the belly and toboggan at the foe, freezing on contact
      if (this.st < 0.2) {
        if (o) this.turnTo(this.angleTo(o), 12, dt);
        this.vx = this.vz = 0;
      } else if (this.st < 0.85) {
        if (!this.specFired) { this.specFired = true; sfx.water(); sfx.whoosh(0.8); }
        if (o) this.turnTo(this.angleTo(o), 1.6, dt);
        const sp = 14 * (1 - (this.st - 0.2) * 0.6);
        this.vx = Math.sin(this.face) * sp; this.vz = Math.cos(this.face) * sp;
        if (Math.random() < 0.8) B.fx.spawn({ x: this.x + (Math.random() - 0.5) * 0.5, y: 0.08, z: this.z + (Math.random() - 0.5) * 0.5, vy: 1.2, color: Math.random() < 0.5 ? 0xdff6ff : 0x9fe0ff, size: 0.3, life: 0.5, shape: 'star', additive: false, grav: 3, spin: 6 });
        if (Math.random() < 0.3) B.fx.spawn({ x: this.x, y: 0.03, z: this.z, color: 0xbfeaff, size: 1.2, life: 0.8, shape: 'ring', alpha: 0.5, floor: true });
        if (o && !this.hitIds.has(o) && this.distTo(o) < 1.3 && o.alive) {
          this.hitIds.add(o);
          const ang = this.angleTo(o);
          B.applyHit(this, o, { dmg: 105 * this.power, kb: 7, lift: 0, stun: 0.55, dirX: Math.sin(ang), dirZ: Math.cos(ang), heavy: true, type: this.type, paralyze: 0.7, dizzy: 24 });
          if (o.paralyze > 0 && o.alive) B.fx.text(o.headPos(), 'BRRR!', 'big', 0.7);
          this.vx *= 0.3; this.vz *= 0.3;
        }
      } else {
        this.vx = THREE.MathUtils.damp(this.vx, 0, 8, dt);
        this.vz = THREE.MathUtils.damp(this.vz, 0, 8, dt);
        if (this.st > 1.1) this.endSpecial();
      }
    } else if (id === 'wisps') {
      // three homing fire-wisps fanned out from the lantern
      if (o) this.turnTo(this.angleTo(o), 10, dt);
      this.vx = THREE.MathUtils.damp(this.vx, 0, 8, dt);
      this.vz = THREE.MathUtils.damp(this.vz, 0, 8, dt);
      const n = Math.floor((this.st - 0.18) / 0.12);
      if (this.st > 0.18 && n >= 0 && n < 3 && (this.wispN || 0) <= n) {
        this.wispN = n + 1;
        const a = this.face + (n - 1) * 0.7;
        B.spawnProjectile(this, { kind: 'wisp', x: this.x - fx * 0.3, z: this.z - fz * 0.3, y: 0.9, vx: Math.sin(a) * 6, vz: Math.cos(a) * 6, r: 0.35, life: 2.2, home: 7,
          hit: { dmg: 36 * this.power, kb: 2, lift: 0, stun: 0.3, type: this.type, dizzy: 9 } });
        sfx.fire();
      }
      if (this.st > 0.75) { this.wispN = 0; this.endSpecial(); }
    }
    void tcol;
  }

  endSpecial() { this.setState('idle'); this.critter.emote('open', 'smile'); }

  trail(c1, c2) {
    const B = this.battle;
    B.fx.spawn({ x: this.x + (Math.random() - 0.5) * 0.4, y: 0.55 + Math.random() * 0.3, z: this.z + (Math.random() - 0.5) * 0.4, vy: 1, color: c1, size: 0.9, life: 0.3, shape: 'glow', grow: -1 });
    B.fx.spawn({ x: this.x, y: 0.6, z: this.z, color: c2, size: 0.5, life: 0.2, shape: 'glow', grow: -1 });
  }

  // -------- receiving hits --------
  takeHit(h) {
    this.hp = Math.max(0, this.hp - h.dmg);
    this.dmgDelay = 0.45;
    this.dizzy += h.dizzy || 0;
    this.critter.flash(0.09);
    const kb = h.kb / this.weight;
    this.face = Math.atan2(-h.dirX, -h.dirZ);
    if (h.paralyze) this.paralyze = h.paralyze;
    if (!this.alive || h.launch || h.lift > 0) {
      this.setState('launched');
      this.bounced = false;
      this.vy = Math.max(h.lift || 0, this.alive ? 0 : 8);
      this.vyAtLaunch = this.vy;
      this.y = Math.max(this.y, 0.02);
      this.vx = h.dirX * kb * (this.alive ? 1 : 1.4); this.vz = h.dirZ * kb * (this.alive ? 1 : 1.4);
      this.spinX = 0;
      this.critter.emote('hurt', 'yell', 1.2);
      sfx.voice(this.def.voice, this.alive ? 'hurt' : 'ko');
    } else {
      this.setState('hit');
      this.hitstun = h.stun;
      this.vx = h.dirX * kb; this.vz = h.dirZ * kb;
      this.critter.emote('hurt', 'o', h.stun + 0.1);
      if (Math.random() < 0.4) sfx.voice(this.def.voice * 1.1, 'hurt');
    }
    this.combo = 0;
  }

  headPos() { return { x: this.x, y: this.y + this.def.body.h + this.def.body.headR * 1.8 + 0.2, z: this.z }; }
  chestPos() { return { x: this.x, y: this.y + this.def.body.h * 0.8, z: this.z }; }

  // -------- procedural animation --------
  animate(dt) {
    const P = this.critter.pose, t = this.critter.t, S = this.state;
    const sp = Math.hypot(this.vx, this.vz);
    if (S === 'idle' || S === 'getup') {
      const b = Math.sin(t * 5.5);
      P.sy = 1 + b * 0.035; P.sx = 1 - b * 0.025;
      P.armLx = Math.sin(t * 5.5) * 0.15; P.armRx = -P.armLx;
      P.head = Math.sin(t * 2.7) * 0.05; P.headRoll = Math.sin(t * 1.9) * 0.07;
      P.tail = 0.3;
      if (S === 'getup') { P.sy = 0.8 + this.st * 0.7; P.lean = 0.3; }
      if (this.paralyze > 0) { P.roll = (Math.random() - 0.5) * 0.25; P.sx = 1 + (Math.random() - 0.5) * 0.1; }
    } else if (S === 'run') {
      const f = t * 16 * (0.6 + sp / this.speed * 0.5);
      const s = Math.sin(f), b = Math.abs(Math.cos(f));
      P.y = b * 0.13;
      P.sy = 0.92 + b * 0.14; P.sx = 1.04 - b * 0.06;
      P.lean = 0.22; P.roll = s * 0.08;
      P.legL = s * 0.9; P.legR = -s * 0.9;
      P.armLx = -s * 1.0; P.armRx = s * 1.0;
      P.ear = 0.4; P.tail = 0.8; P.head = -0.1;
      if (this.speedBoost > 0 && Math.random() < 0.6) this.battle.fx.spawn({ x: this.x + (Math.random() - 0.5) * 0.3, y: 0.15 + Math.random() * 0.5, z: this.z + (Math.random() - 0.5) * 0.3, color: 0x5ad8ff, size: 0.45, life: 0.3, shape: 'glow', grow: -1, alpha: 0.7 });
      this.stepT -= dt;
      if (this.stepT <= 0) { this.stepT = 0.2; sfx.step(); if (Math.random() < 0.3) this.battle.fx.dust(this, 1, 0.5); }
    } else if (S === 'attack') {
      const a = this.atk(), k = this.st / a.startup, i = this.combo;
      const wind = Math.min(1, k), strike = this.st > a.startup ? 1 : 0;
      const sideArm = i === 1 ? 'L' : 'R';
      if (!strike) {
        P.sy = 1 - wind * 0.12; P.sx = 1 + wind * 0.08; P.lean = -0.15 * wind; P.yaw = (i === 1 ? -0.5 : 0.5) * wind;
        P['arm' + sideArm + 'x'] = -2.2 * wind;
        if (i === 2) { P.armLx = P.armRx = -2.6 * wind; P.y = 0.05; }
      } else {
        P.sy = 1.12; P.sx = 0.92; P.lean = 0.45; P.yaw = i === 1 ? 0.6 : -0.6;
        P['arm' + sideArm + 'x'] = -1.4; P['arm' + sideArm + 'z'] = 0.2;
        P.legL = 0.5; P.legR = -0.4;
        if (i === 2) { P.yaw = 0; P.armLx = P.armRx = -1.5; P.lean = 0.7; P.y = 0.15; P.sy = 1.18; }
      }
      P.ear = 0.6; P.tail = 1;
    } else if (S === 'guard') {
      P.sy = 0.88; P.sx = 1.06; P.lean = 0.12; P.armLx = P.armRx = -1.5; P.armLz = P.armRz = -0.7; P.head = 0.15; P.ear = 0.7; P.tail = 0.2;
      P.legL = 0.3; P.legR = -0.3;
      if (this.shield.userData.flash > 0.5) { P.lean = -0.15; P.sy = 0.8; }
    } else if (S === 'dodge') {
      P.sy = 0.75; P.sx = 1.2; P.lean = 0.5; P.y = 0.05;
      P.legL = 1; P.legR = 1; P.armLx = P.armRx = 1.2; P.ear = 1;
      P.roll = this.st * 18;
    } else if (S === 'special' && this.def.special === 'rollout') {
      P.sx = 1.05; P.sy = 0.78; P.head = 0.9; P.armLx = P.armRx = -2.4; P.legL = P.legR = -1.6; P.ear = 1;
      this.rollSpin = (this.rollSpin || 0) + dt * (this.st < 0.3 ? 30 * this.st : 22);
      P.lean = 0.9;
      this.critter.P.lean = this.rollSpin; this.critter.V.lean = 0;
    } else if (S === 'special' && this.def.special === 'iceslide' && this.st >= 0.2 && this.st < 0.95) {
      P.lean = 1.45; P.y = 0.12; P.armLz = P.armRz = 1.2; P.armLx = P.armRx = 0.6; P.legL = P.legR = 1.2; P.head = -0.9; P.sx = 1.1; P.sy = 0.95;
      this.critter.emote('happy', 'grin', 0.1);
    } else if (S === 'special' || S === 'super') {
      if (this.st < 0.28) { P.sy = 0.8; P.sx = 1.15; P.lean = -0.25; P.armLz = P.armRz = 0.8; P.ear = 0.8; }
      else { P.sy = 1.15; P.sx = 0.9; P.lean = 0.6; P.armLx = P.armRx = -1.8; P.ear = 1; P.legL = 0.7; P.legR = 0.7; }
      P.tail = 1;
    } else if (S === 'hit') {
      const k = this.st / this.hitstun;
      P.lean = -0.55 * (1 - k); P.sy = 0.86 + k * 0.14; P.sx = 1.1 - k * 0.1;
      P.armLz = P.armRz = 1.2 * (1 - k); P.head = -0.4 * (1 - k); P.ear = 1;
      P.roll = Math.sin(this.st * 50) * 0.08 * (1 - k);
    } else if (S === 'launched') {
      P.lean = -this.spinX; P.armLz = P.armRz = 1.6; P.legL = P.legR = -0.6; P.ear = 1.2; P.sy = 1.05;
    } else if (S === 'down') {
      P.lean = -1.45; P.y = 0.05; P.sy = 0.9; P.sx = 1.08; P.armLz = P.armRz = 1.4; P.ear = 1.3; P.legL = P.legR = -0.4;
      if (!this.alive) { P.armLz = P.armRz = 1.6 + Math.sin(t * 2) * 0.05; }
    } else if (S === 'dizzy') {
      P.roll = Math.sin(t * 4) * 0.3; P.headRoll = Math.sin(t * 4 + 1) * 0.3; P.lean = 0.05;
      P.armLz = P.armRz = 0.5 + Math.sin(t * 4) * 0.2; P.ear = 0.8;
      this.critter.emote('dizzy', 'wobbly', 0.1);
      if (Math.random() < 0.25) {
        const hp = this.headPos(), a = t * 6 + Math.random();
        this.battle.fx.spawn({ x: hp.x + Math.cos(a) * 0.5, y: hp.y - 0.15, z: hp.z + Math.sin(a) * 0.5, color: 0xffe14d, size: 0.32, life: 0.4, shape: 'star', additive: false, spin: 6 });
      }
    } else if (S === 'win') {
      winAnim(this, P, this.st, dt);
      const cam = this.battle.camera.position;
      this.turnTo(Math.atan2(cam.x - this.x, cam.z - this.z), 4, dt);
    } else if (S === 'intro') {
      const k = this.st - (this.introDelay || 0) + (this.introK0 || 0);
      if (k < 0) {
        const b = Math.sin(t * 5.5);
        P.sy = 1 + b * 0.035; P.armLx = Math.sin(t * 5.5) * 0.15; P.armRx = -P.armLx;
      } else introAnim(this, P, k, dt);
      // play to the camera while it is on us, then square up to the rival
      const B = this.battle, cam = B.camera.position;
      const onMe = B.introFocus === this;
      this.turnTo(onMe ? Math.atan2(cam.x - this.x, cam.z - this.z) : this.angleTo(this.opp), onMe ? 5 : 7, dt);
    } else if (S === 'lose') {
      P.lean = 0.5; P.head = 0.5; P.sy = 0.85; P.ear = 1.5; P.armLz = P.armRz = -0.1;
      this.critter.emote('closed', 'wobbly', 0.2);
    }
    this.critter.update(dt);
  }

  syncRoot() {
    this.root.position.set(this.x, this.y, this.z);
    this.root.rotation.y = this.face;
  }

  dispose() { this.battle.scene.remove(this.root); }
}
