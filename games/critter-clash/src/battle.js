// One match: two fighters, rounds, hit resolution, projectiles, supers, camera direction.
import * as THREE from 'three';
import { Fighter, SPECIALS } from './fighter.js';
import { CpuBrain } from './ai.js';
import { TYPES, typeMult, MODS } from './data.js';
import { ARENA_R } from './arena.js';
import { sfx, playMusic, setIntensity } from './audio.js';
import { Tutorial } from './tutorial.js';
import { save } from './save.js';
import { sayLine } from './personality.js';
import { Items } from './items.js';

const ROUND_TIME = 60;
const INTRO_FIRST = 3.6, INTRO_FOCUS = 1.6; // first-round intro: rival close-up, then ours, then wide

export class Battle {
  constructor(game, pDef, cDef, { cpuLevel = 1, difficulty = 0.5, rounds = 2, playerLevel = 1, onEnd, trainer = null, mods = [], playerHp = 1 } = {}) {
    this.game = game;
    this.scene = game.scene;
    this.fx = game.fx;
    this.hud = game.hud;
    this.camera = game.camera;
    this.arena = game.arena;
    this.onEnd = onEnd;
    this.trainer = trainer;
    this.mods = new Set(mods);
    this.grav = this.mods.has('lowgrav') ? 10 : 24;
    this.superMult = this.mods.has('supercharged') ? 2 : 1;
    this.speedMult = this.mods.has('turbo') ? 1.25 : 1;
    this.playerHp = playerHp; // survival runs carry damage between fights
    this.fighters = [];
    this.fighters.push(new Fighter(this, pDef, { level: playerLevel, side: 0 }));
    this.fighters.push(new Fighter(this, cDef, { level: cpuLevel, cpu: true, side: 1 }));
    if (this.mods.has('bighead')) for (const f of this.fighters) f.critter.head.scale.setScalar(1.5);
    if (this.mods.size) {
      this.modChip = document.createElement('div');
      this.modChip.className = 'mod-chip';
      this.modChip.innerHTML = [...this.mods].map((m) => `<span>${MODS[m].icon} ${MODS[m].name}</span>`).join('');
      this.hud.el.appendChild(this.modChip);
    }
    this.brain = new CpuBrain(this.fighters[1], difficulty, trainer?.style);
    this.pbrain = game.autoplay ? new CpuBrain(this.fighters[0], 0.7) : null;
    this.projectiles = [];
    this.items = new Items(this);
    this.winsNeeded = rounds;
    this.wins = [0, 0];
    this.round = 0;
    this.hitstop = 0;
    this.slowmo = 0;
    this.timeScale = 1;
    this.shakeAmt = 0;
    this.camState = { pos: new THREE.Vector3(0, 6, 16), look: new THREE.Vector3(0, 1, 0), fov: 42 };
    this.camOverride = null;
    this.stats = { dmgDealt: 0, maxCombo: 0, supers: 0, perfect: false };
    this.comboCount = 0;
    this.comboT = 0;
    this.hud.setup(this);
    // jumbotron shows the matchup and live health
    this.screenImgs = this.fighters.map((f) => { const im = new Image(); im.src = game.portrait(f.def); return im; });
    this.screenNames = this.fighters.map((f) => f.def.name);
    this.screenT = 0;
    this.tutorial = !save.tutorialDone && !game.autoplay ? new Tutorial(this) : null;
    this.startRound();
  }

  get player() { return this.fighters[0]; }
  get cpu() { return this.fighters[1]; }

  startRound() {
    this.round++;
    const [p, c] = this.fighters;
    p.reset(-4, 0.5); c.reset(4, -0.5);
    p.face = Math.PI / 2; c.face = -Math.PI / 2;
    for (const pr of this.projectiles) this.scene.remove(pr.mesh);
    this.projectiles.length = 0;
    this.items.clear();
    this.fx.clear();
    this.time = ROUND_TIME;
    this.phase = 'intro';
    this.phaseT = 0;
    this.roundDmgTaken = 0;
    if (this.round === 1 && this.playerHp < 1) { p.hp = Math.max(1, Math.round(p.maxHp * this.playerHp)); p.dmgTrail = p.hp; }
    p.setState('intro'); c.setState('intro');
    const first = this.round === 1;
    p.introDelay = first ? INTRO_FOCUS : 0; c.introDelay = 0;
    p.introK0 = c.introK0 = first ? 0 : 1.5;
    this.introFocus = first ? c : null;
    this.introSaid = 0;
    this.tense = 0;
    this.camFocusWas = undefined;
    this.hud.roundIntro(this.round, this.wins, first);
    if (this.round === 1) playMusic(this.trainer?.boss ? 'boss' : { beach: 'beach', volcano: 'volcano', frost: 'frost' }[this.arena.key] || 'battle');
    setIntensity(0);
  }

  // -------- hit resolution --------
  applyHit(att, def, h) {
    if (def.invuln > 0 || def.state === 'super' && def.superInvuln || !def.alive) {
      if (def.state === 'dodge' && def.invuln > 0) this.perfectDodge(def);
      return false;
    }
    if (def.state === 'guard') {
      if (att.state === 'super') h.unblockable = true;
      const r = def.blockHit(h, att);
      const cp = def.chestPos();
      if (r === 'parry') { this.parry(def, att, h); return false; }
      const chip = Math.max(1, Math.round(h.dmg * (h.unblockable ? 0.3 : 0.12)));
      def.hp = Math.max(1, def.hp - chip);
      def.dmgDelay = 0.3;
      att.superM = Math.min(100, att.superM + chip * 0.15 * this.superMult);
      this.fx.spawn({ ...cp, color: TYPES[def.type].glow, size: 1.6, life: 0.16, shape: 'ring', grow: 1.2 });
      this.fx.burst(cp, { n: 6, speed: 5, up: 1.5, color: 0xffffff, size: 0.14, life: 0.25, grav: 4 });
      sfx.block?.();
      this.hitstop = 0.04;
      if (r === 'break') {
        this.fx.text(def.headPos(), 'GUARD BREAK!', 'big', 1);
        this.fx.hit(cp, 0xffffff, true);
        sfx.bonk(); this.shake(0.5); this.game.impactFrame(0.06);
        this.hud.callout('GUARD BREAK!', att.side, 2);
      } else if (Math.random() < 0.5) this.fx.text({ x: cp.x, y: cp.y + 0.6, z: cp.z }, 'BLOCK', '', 0.5);
      return false;
    }
    let dmg = h.dmg;
    let eff = 1;
    if (h.type && h.type !== 'normal') { eff = typeMult(h.type, def.type); dmg *= eff; }
    if (def.state === 'down') dmg *= 0.5;
    dmg = Math.round(dmg * (0.92 + Math.random() * 0.16));
    h.dmg = dmg;
    def.takeHit(h);
    if (def === this.player) this.roundDmgTaken += dmg;
    // super meter: attacker gains more than defender
    att.superM = Math.min(100, att.superM + dmg * 0.09 * this.superMult);
    def.superM = Math.min(100, def.superM + dmg * 0.05 * this.superMult);
    const heavy = h.heavy || dmg > 90;
    this.hitstop = heavy ? 0.13 : 0.065;
    this.shake(heavy ? 0.5 : 0.18);
    const p = def.chestPos();
    p.x -= h.dirX * 0.2; p.z -= h.dirZ * 0.2;
    const tcol = h.type && h.type !== 'normal' ? TYPES[h.type].glow : 0xffe070;
    this.fx.hit(p, tcol, heavy, h.type && h.type !== 'normal' ? h.type : heavy ? att.type : null);
    sfx.hit(heavy);
    if (heavy) { sfx.bonk(); this.game.impactFrame(0.07); }
    // combo counter (player only)
    if (att === this.player) {
      this.comboCount = this.comboT > 0 ? this.comboCount + 1 : 1;
      this.comboT = 1.1;
      this.stats.maxCombo = Math.max(this.stats.maxCombo, this.comboCount);
      this.stats.dmgDealt += dmg;
      this.hud.combo(this.comboCount);
      const cc = { 5: ['NICE!', 1], 8: ['GREAT COMBO!', 2], 12: ['UNSTOPPABLE!', 3] }[this.comboCount];
      if (cc) this.hud.callout(cc[0], 0, cc[1]);
    }
    if (!this.firstHit) { this.firstHit = true; this.hud.callout('FIRST STRIKE!', att.side, att === this.player ? 1 : 0); }
    // comic text
    const words = heavy ? ['BONK!', 'POW!', 'WHAM!', 'KAPOW!', 'BOOF!'] : ['bap!', 'pok!', 'tap!', 'bop!'];
    if (heavy || Math.random() < 0.4) this.fx.text({ x: p.x, y: p.y + 0.7, z: p.z }, words[Math.floor(Math.random() * words.length)], heavy ? 'big' : '', 0.7);
    this.fx.text({ x: p.x, y: p.y + 0.3, z: p.z }, String(dmg), 'dmg' + (eff > 1 ? ' super-eff' : eff < 1 ? ' weak' : ''), 0.75);
    // one "super effective" pill at a time (the round clock counts down)
    if (eff > 1 && Math.random() < 0.6 && !(this.effAt - this.time < 0.9)) {
      this.effAt = this.time;
      this.fx.text({ x: p.x, y: p.y + 1.3, z: p.z }, "It's super effective!", 'eff', 1.1);
    }
    this.arena.cheer(heavy ? 0.35 : 0.12);
    if (heavy) sfx.cheer(0.6);
    if (!def.alive) this.onKO(att, def);
    return true;
  }

  // the champion's second wind: a short cinematic, then a faster, angrier rival
  enrage(f) {
    this.bossRage = true;
    f.speed *= 1.15; f.power *= 1.1;
    f.superM = 100;
    this.brain.diff = Math.min(1, this.brain.diff + 0.15);
    this.slowmo = 0.6;
    this.shake(0.6);
    this.game.impactFrame(0.1);
    this.fx.shock(f, 0xff5a8a, 5, 0.6);
    this.fx.burst(f.chestPos(), { n: 30, speed: 7, up: 3, color: 0xff7ab0, size: 0.3, life: 0.8, shape: 'star', additive: false, grav: 3, spin: 10 });
    this.fx.say(f, 'No more holding back!', f.def.type);
    this.hud.callout(`${this.trainer.name} gets serious!`, 1, 3);
    f.critter.emote('angry', 'yell', 1.2);
    f.critter.setRim(0xff5a8a, 2.2);
    sfx.boom(); sfx.cheer(1.2);
    this.arena.cheer(1);
  }

  // guard pressed just in time: no damage, attacker staggered, defender gets meter
  parry(def, att, h) {
    def.superM = Math.min(100, def.superM + 12);
    def.setState('idle'); def.invuln = 0.2;
    def.critter.emote('angry', 'grin', 0.6);
    if (att.state !== 'super' && att.alive && !h.projectile) {
      att.setState('hit'); att.hitstun = 0.55;
      att.vx = h.dirX * -3; att.vz = h.dirZ * -3;
      att.critter.emote('hurt', 'o', 0.6);
    }
    const cp = def.chestPos();
    this.fx.spawn({ ...cp, color: 0xffffff, size: 3, life: 0.2, shape: 'ring', grow: 1.6 });
    this.fx.hit(cp, 0x9ff6ff, true);
    this.fx.text(def.headPos(), 'PARRY!', 'big', 0.9);
    sfx.parry?.();
    this.hitstop = 0.16; this.slowmo = 0.3;
    this.game.impactFrame(0.05);
    if (def === this.player) { this.hud.callout('PARRY!', 0, 2); this.stats.parries = (this.stats.parries || 0) + 1; }
  }

  perfectDodge(f) {
    if (f.perfectT > 0) return;
    f.perfectT = 0.5;
    f.superM = Math.min(100, f.superM + 8);
    this.fx.text(f.headPos(), 'NICE DODGE!', 'eff', 0.8);
    this.slowmo = 0.35;
  }

  wallSplat(f, v) {
    this.shake(0.4);
    sfx.bonk();
    this.fx.text(f.headPos(), 'SPLAT!', 'big', 0.8);
    this.fx.burst(f.chestPos(), { n: 10, speed: 5, color: 0xffffff, shape: 'star', additive: false, size: 0.35, life: 0.6, spin: 10 });
    if (f.alive) { f.hp = Math.max(1, f.hp - Math.round(v * 3)); f.dizzy += 18; }
    this.arena.cheer(0.4);
  }

  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }

  // -------- projectiles --------
  spawnProjectile(owner, p) {
    const mesh = new THREE.Group();
    if (p.kind === 'bubble') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), new THREE.MeshToonMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.55, emissive: 0x1a5a9a }));
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(-0.17, 0.2, 0.25);
      const rimm = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 14), new THREE.MeshBasicMaterial({ color: 0xdff4ff, side: THREE.BackSide, transparent: true, opacity: 0.6 }));
      mesh.add(b, hl, rimm);
    } else if (p.kind === 'gale') {
      // stacked translucent cones read as a cartoon twister
      for (let k = 0; k < 4; k++) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.35 + k * 0.22, 0.12 + k * 0.2, 0.55, 14, 1, true),
          new THREE.MeshBasicMaterial({ color: k % 2 ? 0xdfe8ff : 0xb8c8ff, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false }));
        c.position.y = 0.3 + k * 0.45;
        mesh.add(c);
      }
    } else if (p.kind === 'wisp') {
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffa020, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
      mesh.add(core, halo);
    } else if (p.kind === 'leafrang') {
      const mat = new THREE.MeshToonMaterial({ color: 0x5bd36a, emissive: 0x1d5a20 });
      for (let k = 0; k < 4; k++) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), mat);
        l.scale.set(0.7, 0.15, 1.2);
        l.position.set(Math.sin(k * Math.PI / 2) * 0.3, 0, Math.cos(k * Math.PI / 2) * 0.3);
        l.rotation.y = k * Math.PI / 2;
        mesh.add(l);
      }
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshToonMaterial({ color: 0xffe066 }));
      mesh.add(c);
    }
    mesh.position.set(p.x, p.y, p.z);
    this.scene.add(mesh);
    this.projectiles.push({ ...p, owner, mesh, t: 0, hitOnce: new Set(), outbound: true });
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.t += dt;
      const target = this.fighters[1 - pr.owner.side];
      if (pr.kind === 'wisp') {
        // lazy homing: steer toward the target, a bit of wobble
        const tx = target.x - pr.x, tz = target.z - pr.z, tl = Math.hypot(tx, tz) || 1;
        const sp = Math.hypot(pr.vx, pr.vz);
        if (pr.t > 0.15 && target.alive) { pr.vx += (tx / tl * 8 - pr.vx) * Math.min(1, dt * pr.home * 0.4); pr.vz += (tz / tl * 8 - pr.vz) * Math.min(1, dt * pr.home * 0.4); }
        const ns = Math.hypot(pr.vx, pr.vz) || 1, want = Math.min(9, sp + dt * 4);
        pr.vx *= want / ns; pr.vz *= want / ns;
        pr.y = 0.9 + Math.sin(pr.t * 9) * 0.15;
        pr.mesh.children[1].scale.setScalar(1 + Math.sin(pr.t * 20) * 0.15);
        if (Math.random() < 0.7) this.fx.spawn({ x: pr.x, y: pr.y, z: pr.z, color: 0xff9020, size: 0.45, life: 0.3, shape: 'glow', grow: -1 });
        if (pr.hitOnce.size) { this.fx.burst({ x: pr.x, y: pr.y, z: pr.z }, { n: 8, speed: 3, color: 0xffc040, size: 0.18, life: 0.4 }); this.removeProjectile(i); continue; }
      }
      if (pr.kind === 'leafrang') {
        pr.mesh.rotation.y += dt * 22;
        if (pr.outbound && pr.t > 0.5) { pr.outbound = false; pr.hitOnce.clear(); }
        if (!pr.outbound) {
          // home back to owner
          const dx = pr.owner.x - pr.x, dz = pr.owner.z - pr.z, d = Math.hypot(dx, dz);
          const sp = 16;
          pr.vx = THREE.MathUtils.damp(pr.vx, dx / d * sp, 5, dt);
          pr.vz = THREE.MathUtils.damp(pr.vz, dz / d * sp, 5, dt);
          if (d < 0.7) { this.removeProjectile(i); continue; }
        } else { pr.vx *= Math.exp(-2.6 * dt); pr.vz *= Math.exp(-2.6 * dt); }
        if (Math.random() < 0.5) this.fx.spawn({ x: pr.x, y: pr.y, z: pr.z, color: 0x7cff6a, size: 0.25, life: 0.3, shape: 'leaf', additive: false, rot: Math.random() * 6, grav: 2, spin: 5 });
      } else if (pr.kind === 'gale') {
        pr.mesh.rotation.y += dt * 16;
        pr.mesh.children.forEach((c, k) => { c.position.x = Math.sin(pr.t * 9 + k) * 0.12; });
        if (Math.random() < 0.6) this.fx.spawn({ x: pr.x + (Math.random() - 0.5), y: Math.random() * 2, z: pr.z + (Math.random() - 0.5), vy: 2, color: 0xffffff, size: 0.3, life: 0.4, shape: 'glow', alpha: 0.5 });
        // re-hit every `multi` seconds and drag the target along
        if (pr.multi && pr.t - (pr.lastHit || 0) > pr.multi) pr.hitOnce.clear();
        const tg = this.fighters[1 - pr.owner.side];
        const dd = Math.hypot(tg.x - pr.x, tg.z - pr.z);
        if (dd < 2.2 && tg.state !== 'dodge') { tg.x += (pr.x - tg.x) * dt * 3; tg.z += (pr.z - tg.z) * dt * 3; }
      } else if (pr.kind === 'bubble') {
        pr.mesh.scale.setScalar(1 + Math.sin(pr.t * 12) * 0.06);
        pr.y = 0.7 + Math.sin(pr.t * 6) * 0.1;
      }
      pr.x += pr.vx * dt; pr.z += pr.vz * dt;
      pr.mesh.position.set(pr.x, pr.y, pr.z);
      // hit check
      if (!pr.big && target.alive && !pr.hitOnce.has(target)) {
        const d = Math.hypot(target.x - pr.x, target.z - pr.z);
        if (d < pr.r + 0.45 && Math.abs(target.y + 0.6 - pr.y) < 1.2) {
          pr.hitOnce.add(target);
          pr.lastHit = pr.t;
          const l = Math.hypot(pr.vx, pr.vz) || 1;
          const landed = this.applyHit(pr.owner, target, { ...pr.hit, dirX: pr.vx / l, dirZ: pr.vz / l, heavy: false, projectile: true });
          if (pr.kind === 'bubble' && (landed || target.state !== 'dodge')) {
            this.fx.burst({ x: pr.x, y: pr.y, z: pr.z }, { n: 10, speed: 4, color: 0xa8e4ff, shape: 'drop', additive: false, size: 0.2, life: 0.5, grav: 9 });
            this.removeProjectile(i); continue;
          }
        }
      }
      if (pr.t > pr.life || Math.hypot(pr.x, pr.z) > ARENA_R + 1) {
        if (pr.kind === 'bubble') this.fx.burst({ x: pr.x, y: pr.y, z: pr.z }, { n: 6, speed: 3, color: 0xa8e4ff, shape: 'drop', additive: false, size: 0.15, life: 0.4, grav: 9 });
        this.removeProjectile(i);
      }
    }
  }

  removeProjectile(i) {
    const pr = this.projectiles[i];
    this.scene.remove(pr.mesh);
    pr.mesh.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    this.projectiles.splice(i, 1);
  }

  // -------- supers --------
  startSuper(f) {
    f.superM = 0;
    f.setState('super');
    f.superPhase = 'cutin';
    f.superInvuln = true;
    f.invuln = 99;
    f.vx = f.vz = 0;
    f.hitIds.clear();
    if (f === this.player) this.stats.supers++;
    const o = f.opp;
    f.face = f.angleTo(o);
    f.critter.emote('angry', 'yell', 1.5);
    sfx.superCharge();
    sfx.voice(f.def.voice, 'special');
    this.hud.cutIn(f);
    this.cutinT = 1.25;
    this.superUser = f;
    this.arena.cheer(0.6);
  }

  updateSuper(f, dt) {
    const o = f.opp, id = f.def.super;
    const fx = this.fx, tcol = TYPES[f.type].glow;
    if (f.superPhase === 'cutin') {
      // the world is frozen while the cut-in plays (see update)
      return;
    }
    const t = f.st;
    if (id === 'meteor') {
      if (f.superPhase === 'go') {
        f.superPhase = 'rise'; f.vy = 16; f.y = 0.05; f.st = 0;
        f.target = { x: o.x, z: o.z };
        sfx.fire();
      }
      if (f.superPhase === 'rise') {
        f.trail(0xff6a20, 0xffe060);
        // drift toward the target spot while airborne
        const tx = f.target.x - f.x, tz = f.target.z - f.z;
        f.vx = tx * 1.6; f.vz = tz * 1.6;
        f.critter.pose.lean = -t * 20;
        if (t > 0.35) this.fx.spawn({ x: f.target.x, y: 0.06, z: f.target.z, color: 0xff5a20, size: 4.5, life: 0.12, shape: 'ring', alpha: 0.7 });
        if (f.vy < 0) { f.vy = -30; f.superPhase = 'fall'; }
      } else if (f.superPhase === 'fall') {
        f.trail(0xff6a20, 0xffe060);
        f.trail(0xff3010, 0xffa040);
      } else if (f.superPhase === 'recover') {
        if (t > 0.6) this.endSuper(f);
      }
    } else if (id === 'tsunami') {
      if (f.superPhase === 'go') { f.superPhase = 'wave'; f.st = 0; this.waveR = 0.5; sfx.water(); sfx.boom(); }
      if (f.superPhase === 'wave') {
        const prev = this.waveR;
        this.waveR = Math.min(10, 0.5 + t * 11);
        for (let k = 0; k < 14; k++) {
          const a = Math.random() * Math.PI * 2;
          fx.spawn({ x: f.x + Math.cos(a) * this.waveR, y: 0.3 + Math.random() * 1.6, z: f.z + Math.sin(a) * this.waveR, vy: 2 + Math.random() * 3, vx: Math.cos(a) * 3, vz: Math.sin(a) * 3,
            color: Math.random() < 0.5 ? 0x48b8ff : 0xdff6ff, size: 0.5 + Math.random() * 0.5, life: 0.5, shape: 'drop', additive: false, grav: 12 });
        }
        if (Math.random() < 0.3) this.fx.shock(f, 0x8fd8ff, this.waveR, 0.25);
        const d = f.distTo(o);
        if (!f.hitIds.has(o) && d < this.waveR + 0.5 && d > prev - 0.8) {
          f.hitIds.add(o);
          const a = f.angleTo(o);
          this.applyHit(f, o, { dmg: 250 * f.power, kb: 12, lift: 9, stun: 0.8, dirX: Math.sin(a), dirZ: Math.cos(a), heavy: true, type: f.type, launch: true, dizzy: 40 });
        }
        if (t > 1.0) this.endSuper(f);
      }
    } else if (id === 'bloom') {
      if (f.superPhase === 'go') { f.superPhase = 'mark'; f.st = 0; f.target = { x: o.x, z: o.z }; sfx.leaf(); }
      if (f.superPhase === 'mark') {
        // the flower bud tracks the foe briefly, then locks
        if (t < 0.5) { f.target.x += (o.x - f.target.x) * 0.15; f.target.z += (o.z - f.target.z) * 0.15; }
        fx.spawn({ x: f.target.x, y: 0.06, z: f.target.z, color: 0x6cff6a, size: 3.4 + Math.sin(t * 20) * 0.3, life: 0.1, shape: 'ring' });
        if (Math.random() < 0.5) fx.spawn({ x: f.target.x + (Math.random() - 0.5) * 2.5, y: 0.1, z: f.target.z + (Math.random() - 0.5) * 2.5, vy: 2, color: 0x9bff7a, size: 0.25, life: 0.5, shape: 'leaf', additive: false, spin: 6 });
        if (t > 0.9) {
          f.superPhase = 'burst'; f.st = 0;
          sfx.boom(); this.shake(0.7); this.game.impactFrame(0.08);
          fx.shock({ x: f.target.x, z: f.target.z }, 0x9bff7a, 4, 0.5);
          for (let k = 0; k < 40; k++) {
            const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 7;
            fx.spawn({ x: f.target.x, y: 0.3, z: f.target.z, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: 6 + Math.random() * 8,
              color: [0xff8fc8, 0xffe14d, 0xffffff, 0x9bff7a][k % 4], size: 0.3 + Math.random() * 0.3, life: 1.2, shape: k % 4 === 3 ? 'leaf' : 'star', additive: false, grav: 10, spin: 10, drag: 1 });
          }
          const d = Math.hypot(o.x - f.target.x, o.z - f.target.z);
          if (d < 2.4) {
            const a = Math.atan2(o.x - f.target.x, o.z - f.target.z);
            this.applyHit(f, o, { dmg: 265 * f.power, kb: 3, lift: 13, stun: 0.8, dirX: Math.sin(a) || 0, dirZ: Math.cos(a) || 1, heavy: true, type: f.type, launch: true, dizzy: 40 });
          }
        }
      } else if (f.superPhase === 'burst' && t > 0.6) this.endSuper(f);
    } else if (id === 'thunder') {
      if (f.superPhase === 'go') { f.superPhase = 'strikes'; f.st = 0; f.strikeN = 0; }
      if (f.superPhase === 'strikes') {
        const times = [0.15, 0.4, 0.65, 0.9, 1.3];
        if (f.strikeN < times.length && t > times[f.strikeN]) {
          const last = f.strikeN === times.length - 1;
          const sx = o.x + (last ? 0 : (Math.random() - 0.5) * 1.4), sz = o.z + (last ? 0 : (Math.random() - 0.5) * 1.4);
          this.lightning(sx, sz, last);
          sfx.spark(); if (last) { sfx.boom(); this.game.impactFrame(0.09); }
          this.shake(last ? 0.7 : 0.3);
          const d = Math.hypot(o.x - sx, o.z - sz);
          if (d < (last ? 2.2 : 1.6)) {
            const a = f.angleTo(o);
            this.applyHit(f, o, { dmg: (last ? 110 : 45) * f.power, kb: last ? 9 : 1, lift: last ? 8 : 0, stun: 0.5, dirX: Math.sin(a), dirZ: Math.cos(a), heavy: last, type: f.type, launch: last, paralyze: last ? 0 : 0.4, dizzy: 10 });
          }
          f.strikeN++;
        }
        if (t > 1.8) this.endSuper(f);
      }
    } else if (id === 'quake') {
      if (f.superPhase === 'go') { f.superPhase = 'hop'; f.st = 0; f.vy = 9; f.y = 0.05; sfx.whoosh(0.7); }
      if (f.superPhase === 'hop') { f.critter.pose.sy = 0.8; f.critter.pose.armLz = f.critter.pose.armRz = 2.5; }
      if (f.superPhase === 'quake') {
        // three expanding rings of rock spikes
        const rings = [0, 0.35, 0.7];
        f.ringN = f.ringN || 0;
        if (f.ringN < 3 && t > rings[f.ringN]) {
          const R = 2.2 + f.ringN * 2.2;
          this.rockRing(f.x, f.z, R);
          sfx.boom(); this.shake(0.6);
          const d = f.distTo(o);
          if (!o.airborne && d > R - 1.6 && d < R + 1.2 && !f.hitIds.has(o)) {
            f.hitIds.add(o);
            const a = f.angleTo(o);
            this.applyHit(f, o, { dmg: 255 * f.power, kb: 6, lift: 12, stun: 0.8, dirX: Math.sin(a), dirZ: Math.cos(a), heavy: true, type: f.type, launch: true, dizzy: 40 });
          }
          f.ringN++;
        }
        if (t > 1.3) { f.ringN = 0; this.endSuper(f); }
      }
    } else if (id === 'cyclone') {
      if (f.superPhase === 'go') {
        f.superPhase = 'twist'; f.st = 0;
        f.target = { x: o.x, z: o.z };
        sfx.leaf(); sfx.superCharge();
        this.spawnProjectile(f, { kind: 'gale', x: o.x, z: o.z, y: 0, vx: 0, vz: 0, r: 0.1, life: 1.6, hit: { dmg: 0 }, big: true });
        this.cyclone = this.projectiles[this.projectiles.length - 1];
        this.cyclone.mesh.scale.set(2.2, 2.6, 2.2);
      }
      if (f.superPhase === 'twist') {
        const cy = this.cyclone;
        if (t < 0.7) { f.target.x += (o.x - f.target.x) * 0.06; f.target.z += (o.z - f.target.z) * 0.06; }
        cy.x = f.target.x; cy.z = f.target.z;
        for (let k = 0; k < 4; k++) {
          const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 2.5;
          this.fx.spawn({ x: cy.x + Math.cos(a) * r, y: Math.random() * 4, z: cy.z + Math.sin(a) * r, vx: -Math.sin(a) * 6, vz: Math.cos(a) * 6, vy: 3, color: 0xe8eeff, size: 0.4, life: 0.4, shape: 'leaf', additive: false, spin: 12 });
        }
        if (t > 0.95 && !f.hitIds.has(o)) {
          f.hitIds.add(o);
          const d = Math.hypot(o.x - cy.x, o.z - cy.z);
          sfx.boom(); this.shake(0.6);
          if (d < 2.6) {
            const a = Math.atan2(o.x - cy.x, o.z - cy.z) || 0;
            this.applyHit(f, o, { dmg: 260 * f.power, kb: 2, lift: 15, stun: 0.8, dirX: Math.sin(a), dirZ: Math.cos(a), heavy: true, type: f.type, launch: true, dizzy: 40 });
          }
        }
        if (t > 1.5) { this.cyclone = null; this.endSuper(f); }
      }
    } else if (id === 'blizzard') {
      if (f.superPhase === 'go') { f.superPhase = 'storm'; f.st = 0; f.target = { x: o.x, z: o.z }; f.strikeN = 0; sfx.water(); }
      if (f.superPhase === 'storm') {
        // a snow cloud chases the foe, pelting it with ice, then one huge icicle
        if (t < 1.0) { f.target.x += (o.x - f.target.x) * 0.08; f.target.z += (o.z - f.target.z) * 0.08; }
        const T = f.target;
        for (let k = 0; k < 5; k++) fx.spawn({ x: T.x + (Math.random() - 0.5) * 4, y: 4 + Math.random() * 2, z: T.z + (Math.random() - 0.5) * 4, vy: -9, vx: 2, color: k % 2 ? 0xffffff : 0xbfeaff, size: 0.22, life: 0.6, shape: 'star', additive: false, spin: 8 });
        if (Math.random() < 0.4) fx.spawn({ x: T.x + (Math.random() - 0.5) * 3, y: 5.2, z: T.z + (Math.random() - 0.5) * 3, color: 0xdde8f8, size: 2.4, life: 0.5, shape: 'puff', additive: false, grow: 0.5, alpha: 0.85 });
        fx.spawn({ x: T.x, y: 0.06, z: T.z, color: 0x9fe0ff, size: 3.6, life: 0.1, shape: 'ring', alpha: 0.6 });
        const times = [0.2, 0.42, 0.64, 0.86, 1.2];
        if (f.strikeN < times.length && t > times[f.strikeN]) {
          const last = f.strikeN === times.length - 1;
          const sx = T.x + (last ? 0 : (Math.random() - 0.5) * 1.2), sz = T.z + (last ? 0 : (Math.random() - 0.5) * 1.2);
          this.icicle(sx, sz, last);
          if (last) { sfx.boom(); this.shake(0.7); this.game.impactFrame(0.08); fx.shock({ x: sx, z: sz }, 0xbfeaff, 3.5, 0.5); }
          else { sfx.hit(false); this.shake(0.2); }
          if (Math.hypot(o.x - sx, o.z - sz) < (last ? 2.2 : 1.5)) {
            const a = Math.atan2(o.x - sx, o.z - sz) || 0;
            this.applyHit(f, o, { dmg: (last ? 150 : 30) * f.power, kb: last ? 6 : 1, lift: last ? 11 : 0, stun: 0.5, dirX: Math.sin(a), dirZ: Math.cos(a), heavy: last, type: f.type, launch: last, paralyze: last ? 0 : 0.35, dizzy: 10 });
          }
          f.strikeN++;
        }
        if (t > 1.7) this.endSuper(f);
      }
    } else if (id === 'supernova') {
      if (f.superPhase === 'go') { f.superPhase = 'charge'; f.st = 0; sfx.superCharge(); }
      const P = f.critter.pose;
      if (f.superPhase === 'charge') {
        // float up, glow brighter and brighter while sucking the foe in
        f.y = Math.min(1.6, t * 2.2); f.vy = 0;
        P.armLz = P.armRz = 2.5; P.legL = P.legR = 0.6; P.tail = 2; P.y = 0;
        const k = Math.min(1, t / 0.9);
        fx.spawn({ x: f.x, y: f.y + 0.6, z: f.z, color: 0xffd060, size: 1.5 + k * 4, life: 0.08, shape: 'glow', alpha: 0.5 + k * 0.4 });
        for (let n = 0; n < 4; n++) {
          const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 2;
          fx.spawn({ x: f.x + Math.cos(a) * r, y: f.y + 0.6 + (Math.random() - 0.5) * 2, z: f.z + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.5, vz: -Math.sin(a) * r * 2.5, color: 0xffb030, size: 0.3, life: 0.38, shape: 'glow' });
        }
        if (o.alive && !o.airborne && o.state !== 'dodge') {
          const d = f.distTo(o) || 1, pull = 3.2 * k;
          o.x += (f.x - o.x) / d * pull * dt; o.z += (f.z - o.z) / d * pull * dt;
        }
        if (t > 0.95) {
          f.superPhase = 'nova'; f.st = 0;
          sfx.boom(); sfx.fire(); this.shake(0.9); this.game.impactFrame(0.12);
          fx.shock(f, 0xffd060, 5.5, 0.6); fx.shock(f, 0xff6a20, 4, 0.45);
          fx.spawn({ x: f.x, y: f.y + 0.6, z: f.z, color: 0xffffff, size: 9, life: 0.3, shape: 'glow', grow: 0.4 });
          fx.burst({ x: f.x, y: f.y + 0.6, z: f.z }, { n: 40, speed: 12, up: 2, color: 0xffb030, size: 0.35, life: 0.7, grav: 4, spread: 1.2 });
          fx.burst({ x: f.x, y: f.y + 0.6, z: f.z }, { n: 16, speed: 7, up: 4, color: 0xffe14d, size: 0.45, life: 1, shape: 'star', additive: false, grav: 6, spin: 12 });
          const d = f.distTo(o);
          if (d < 4.6) {
            const a = f.angleTo(o);
            this.applyHit(f, o, { dmg: 270 * f.power, kb: 11, lift: 9, stun: 0.8, dirX: Math.sin(a), dirZ: Math.cos(a), heavy: true, type: f.type, launch: true, dizzy: 40 });
          }
        }
      } else if (f.superPhase === 'nova') {
        f.vy = Math.min(f.vy, 0);
        if (!f.airborne && t > 0.5) this.endSuper(f);
        else if (t > 1.2) { f.y = 0; this.endSuper(f); }
      }
    }
    void tcol;
  }

  // short-lived scene effects that run on game time (so they pause and slow with the fight)
  anim(fn) { (this.anims ||= []).push(fn); }
  runAnims(dt) {
    if (!this.anims) return;
    for (let i = this.anims.length - 1; i >= 0; i--) if (!this.anims[i](dt)) this.anims.splice(i, 1);
  }

  // a falling icicle that shatters on the ground
  icicle(x, z, big) {
    const s = big ? 2.2 : 1;
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.22 * s, 1.1 * s, 6), new THREE.MeshToonMaterial({ color: 0xbfeaff, emissive: 0x3a7ab0, transparent: true, opacity: 0.9 }));
    m.rotation.x = Math.PI;
    m.position.set(x, 0.5 * s, z);
    this.scene.add(m);
    this.fx.burst({ x, y: 0.3, z }, { n: big ? 24 : 9, speed: big ? 7 : 4, up: 4, color: 0xdff6ff, size: big ? 0.3 : 0.2, life: 0.6, shape: 'star', additive: false, grav: 14, spin: 10 });
    this.fx.spawn({ x, y: 0.4, z, color: 0xffffff, size: big ? 3 : 1.4, life: 0.15, shape: 'glow' });
    let t = 0;
    this.anim((dt) => {
      t += dt;
      m.scale.setScalar(Math.max(0.01, 1 - Math.max(0, t - 0.4) * 3));
      if (t < 0.75) return true;
      this.scene.remove(m); m.geometry.dispose(); m.material.dispose();
      return false;
    });
  }

  rockRing(x, z, R) {
    const n = Math.round(R * 3.2);
    const mat = new THREE.MeshToonMaterial({ color: 0xa88358 });
    const geo = new THREE.ConeGeometry(0.32, 1.2, 5);
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x + Math.cos(a) * R, -0.6, z + Math.sin(a) * R);
      m.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 3, (Math.random() - 0.5) * 0.5);
      m.scale.setScalar(0.7 + Math.random() * 0.7);
      m.castShadow = true;
      g.add(m);
    }
    this.scene.add(g);
    this.fx.shock({ x, z }, 0xffc080, R + 0.6, 0.35);
    for (let i = 0; i < n; i += 2) {
      const a = (i / n) * Math.PI * 2;
      this.fx.dust({ x: x + Math.cos(a) * R, z: z + Math.sin(a) * R }, 2, 1.2);
    }
    let t = 0;
    this.anim((dt) => {
      t += dt;
      const up = t < 0.12 ? t / 0.12 : t > 0.8 ? Math.max(0, 1 - (t - 0.8) / 0.3) : 1;
      g.children.forEach((m) => { m.position.y = -0.6 + up * 0.9 * m.scale.y; });
      if (t < 1.1) return true;
      this.scene.remove(g); geo.dispose(); mat.dispose();
      return false;
    });
  }

  superLand(f) {
    if (f.def.super === 'quake' && f.superPhase === 'hop') {
      f.superPhase = 'quake'; f.st = 0; f.ringN = 0;
      this.game.impactFrame(0.08);
      return;
    }
    if (f.def.super !== 'meteor' || f.superPhase !== 'fall') return;
    f.superPhase = 'recover'; f.st = 0;
    const o = f.opp;
    sfx.boom(); this.shake(0.9); this.game.impactFrame(0.1);
    this.fx.shock(f, 0xff7a30, 5, 0.5);
    this.fx.shock(f, 0xffe060, 3.2, 0.35);
    this.fx.burst({ x: f.x, y: 0.3, z: f.z }, { n: 40, speed: 12, up: 6, color: 0xff7a30, size: 0.4, life: 0.7, grav: 14 });
    this.fx.dust(f, 18, 2);
    const d = f.distTo(o);
    if (d < 3.6) {
      const a = f.angleTo(o);
      this.applyHit(f, o, { dmg: 285 * f.power, kb: 10, lift: 10, stun: 0.8, dirX: Math.sin(a), dirZ: Math.cos(a), heavy: true, type: f.type, launch: true, dizzy: 40 });
    }
  }

  lightning(x, z, big) {
    const pts = [];
    let px = x, pz = z;
    for (let y = 14; y >= 0; y -= 1.4) { pts.push(new THREE.Vector3(px, y, pz)); px = x + (Math.random() - 0.5) * 1.2; pz = z + (Math.random() - 0.5) * 1.2; }
    pts.push(new THREE.Vector3(x, 0, z));
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), 40, big ? 0.22 : 0.13, 5);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xfffbd0 }));
    const g = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffe040, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.scale.set(1, 1, 1);
    this.scene.add(m, g);
    this.fx.shock({ x, z }, 0xfff060, big ? 3.5 : 2, 0.3);
    this.fx.burst({ x, y: 0.2, z }, { n: big ? 24 : 10, speed: 7, up: 4, color: 0xfff060, size: 0.25, life: 0.4, grav: 12 });
    this.fx.spawn({ x, y: 1, z, color: 0xffffaa, size: big ? 7 : 4, life: 0.2, shape: 'glow' });
    let life = 0.22;
    this.anim((dt) => {
      life -= dt;
      if (life > 0) return true;
      this.scene.remove(m, g); geo.dispose(); m.material.dispose(); g.material.dispose();
      return false;
    });
  }

  endSuper(f) {
    f.superInvuln = false;
    f.invuln = 0.3;
    f.y = Math.max(0, f.y);
    f.setState('idle');
    f.critter.emote('open', 'grin', 0.6);
    this.superUser = null;
  }

  // -------- KO & rounds --------
  onKO(att, def) {
    this.phase = 'ko';
    this.phaseT = 0;
    this.slowmo = 1.6;
    this.koWinner = att;
    this.koLoser = def;
    this.hud.announce('K.O.!', 'ko');
    sfx.ko();
    sfx.cheer(1.2);
    this.arena.cheer(1);
    this.game.impactFrame(0.14);
    this.fx.confetti({ x: def.x, y: 4, z: def.z }, 70);
    if (def === this.cpu && this.roundDmgTaken === 0) this.stats.perfect = true;
  }

  onKOLand() {}

  timeUp() {
    const [p, c] = this.fighters;
    const pf = p.hp / p.maxHp, cf = c.hp / c.maxHp;
    this.phase = 'ko'; this.phaseT = 0;
    this.koWinner = pf >= cf ? p : c;
    this.koLoser = pf >= cf ? c : p;
    this.hud.announce('TIME!', 'ko');
    sfx.gong();
  }

  endRound() {
    const w = this.koWinner, l = this.koLoser;
    this.wins[w.side]++;
    if (w === this.player && this.roundDmgTaken === 0) this.hud.callout('PERFECT!', 0, 3);
    else if (w.alive && w.hp / w.maxHp < 0.15) this.hud.callout('CLUTCH!', w.side, 2);
    this.hud.setWins(this.wins);
    w.setState('win'); w.vx = w.vz = 0;
    if (l.alive) { l.setState('lose'); l.vx = l.vz = 0; }
    sfx.voice(w.def.voice, 'win');
    sayLine(w, 'win');
    if (w === this.player) sfx.fanfare(w.def);
    setIntensity(0);
    this.phase = 'winpose'; this.phaseT = 0;
    if (this.wins[w.side] >= this.winsNeeded) {
      this.hud.announce(w === this.player ? 'YOU WIN!' : 'YOU LOSE...', w === this.player ? 'win' : 'lose');
      if (w === this.player) { playMusic('victory'); sfx.cheer(1.5); this.fx.confetti({ x: w.x, y: 5, z: w.z }, 140); } else sfx.aww();
    }
  }

  // -------- main update --------
  update(rawDt) {
    const dt = Math.min(rawDt, 1 / 20) * (this.phase === 'fight' ? this.speedMult : 1);
    this.phaseT += dt;
    if (this.cutinT > 0) {
      this.cutinT -= dt;
      const f = this.superUser;
      f.critter.update(dt);
      // isolate the super user for the close-up, like an anime cut-in
      for (const o of this.fighters) o.root.visible = o === f || this.cutinT <= 0;
      this.camOverride = { look: new THREE.Vector3(f.x, f.y + 0.9, f.z), pos: new THREE.Vector3(f.x + Math.sin(f.face) * 2.4 + Math.cos(f.face) * 0.9, f.y + 1.25, f.z + Math.cos(f.face) * 2.4 - Math.sin(f.face) * 0.9), fov: 34 };
      if (this.cutinT <= 0) { for (const o of this.fighters) o.root.visible = true; f.superPhase = 'go'; f.st = 0; this.camOverride = null; this.shake(0.4); }
      this.updateCamera(dt);
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop -= rawDt;
      // jitter the struck fighters while frozen
      for (const f of this.fighters) if (f.state === 'hit' || f.state === 'launched') {
        f.root.position.x = f.x + (Math.random() - 0.5) * 0.08;
        f.root.position.z = f.z + (Math.random() - 0.5) * 0.08;
      }
      this.updateCamera(dt);
      return;
    }

    let sdt = dt;
    if (this.slowmo > 0) { this.slowmo -= dt; sdt = dt * (this.phase === 'ko' ? 0.28 : 0.45); }

    const [p, c] = this.fighters;
    if (this.phase === 'intro') {
      if (this.round === 1) {
        this.introFocus = this.phaseT < INTRO_FOCUS ? c : this.phaseT < INTRO_FOCUS * 2 ? p : null;
        if (this.introSaid === 0 && this.phaseT > 0.15) { this.introSaid = 1; sayLine(c, 'intro'); this.hud.nameCard(c, this.trainer); }
        if (this.introSaid === 1 && this.phaseT > INTRO_FOCUS + 0.15) { this.introSaid = 2; sayLine(p, 'intro'); this.hud.nameCard(p, null); }
      }
      if (this.phaseT > (this.round === 1 ? INTRO_FIRST : 0.9)) { this.introFocus = null; this.phase = 'countdown'; this.phaseT = 0; this.hud.countdown(); p.setState('idle'); c.setState('idle'); }
    } else if (this.phase === 'countdown') {
      if (this.phaseT > 1.9) { this.phase = 'fight'; this.phaseT = 0; }
    } else if (this.phase === 'fight') {
      this.time -= sdt;
      if (this.time <= 0) { this.time = 0; this.timeUp(); }
    } else if (this.phase === 'ko') {
      if (this.phaseT > 2.2) this.endRound();
    } else if (this.phase === 'winpose') {
      if (this.phaseT > 2.6) {
        if (Math.max(...this.wins) >= this.winsNeeded) {
          this.phase = 'done'; this.phaseT = 0; this.camSnap = true;
          this.stats.hpLeft = Math.max(0, this.player.hp / this.player.maxHp);
          this.onEnd?.(this.wins[0] > this.wins[1], this.stats);
        }
        else this.startRound();
      }
    }

    const fill = this.arena.fill;
    if (this.phase === 'done' && this.koWinner) {
      for (const f of this.fighters) f.root.visible = f === this.koWinner;
      const w = this.koWinner;
      fill.position.set(this.camera.position.x + 1, this.camera.position.y + 2, this.camera.position.z);
      fill.target.position.set(w.x, w.y + 0.8, w.z);
      fill.intensity = THREE.MathUtils.damp(fill.intensity, 0.65, 3, dt);
    } else if (fill) fill.intensity = 0;

    // controls
    const fighting = this.phase === 'fight';
    const inp = this.game.input;
    if (fighting && this.pbrain) { this.pbrain.update(sdt); this.brain.update(sdt); }
    else if (fighting) {
      const yaw = this.camYaw ?? 0;
      const rx = Math.cos(yaw), rz = -Math.sin(yaw), fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      p.ctl.mx = inp.move.x * rx + inp.move.y * fx;
      p.ctl.mz = inp.move.x * rz + inp.move.y * fz;
      p.ctl.attack = inp.pressed.attack || (inp.held.attack && p.state === 'attack');
      p.ctl.special = inp.pressed.special;
      p.ctl.dodge = inp.pressed.dodge;
      p.ctl.guard = inp.held.guard;
      p.ctl.super = inp.pressed.super;
      this.brain.update(sdt);
      if (this.tutorial) this.tutorial.update(sdt);
    } else {
      for (const f of this.fighters) Object.assign(f.ctl, { mx: 0, mz: 0, attack: false, special: false, dodge: false, super: false, guard: false });
    }
    for (const f of this.fighters) { f.perfectT = (f.perfectT || 0) - dt; f.update(sdt); }
    this.updateProjectiles(sdt);
    this.runAnims(sdt);
    this.items.update(sdt);
    if (fighting) {
      const tense = p.hp / p.maxHp < 0.25 || c.hp / c.maxHp < 0.25 || this.time < 10 ? 1 : 0;
      if (tense !== this.tense) { this.tense = tense; setIntensity(tense); }
    }
    if (fighting && this.trainer?.boss && !this.bossRage && c.alive && c.hp < c.maxHp * 0.5) this.enrage(c);
    if (this.bossRage && c.alive && Math.random() < 0.5) {
      const a = Math.random() * Math.PI * 2;
      this.fx.spawn({ x: c.x + Math.cos(a) * 0.5, y: 0.1 + Math.random() * 0.4, z: c.z + Math.sin(a) * 0.5, vy: 2.5 + Math.random() * 1.5, color: Math.random() < 0.5 ? 0xff5a8a : 0xb39cff, size: 0.5, life: 0.5, shape: 'glow', grow: -0.6 });
    }
    this.comboT -= sdt;
    if (this.comboT <= 0 && this.comboCount) { this.comboCount = 0; this.hud.combo(0); }
    this.hud.update(this);
    this.screenT -= dt;
    if (this.screenT <= 0) {
      this.screenT = 0.5;
      this.arena.drawScreen({ imgs: this.screenImgs, names: this.screenNames, hp: this.fighters.map((f) => f.hp / f.maxHp) });
    }
    this.hud.speedLines(this.superUser && this.cutinT > 0 || this.fighters.some((f) => f.state === 'launched' && f.vy > 4) || this.phase === 'ko' && this.phaseT < 0.6);
    inp.setCooldowns(1 - p.specCd / SPECIALS[p.def.special].cd, 1 - p.dodgeCd / 0.55, p.superM / 100, p.superM >= 100);
    this.updateCamera(dt);
  }

  updateCamera(dt) {
    const cam = this.camera, [p, c] = this.fighters;
    const cs = this.camState;
    let look, pos, fov = 42;
    if (this.camOverride) ({ look, pos, fov } = this.camOverride);
    else if (this.phase === 'intro') {
      // close-up on the rival, then on us, then pull out wide
      const f = this.introFocus;
      if (f !== this.camFocusWas) { this.camFocusWas = f; if (f) this.camSnap = true; }
      if (f) {
        const side = f === c ? -1 : 1;
        const hy = f.critter.P.y * 0.8;
        look = new THREE.Vector3(f.x, 1.1 + hy, f.z);
        pos = new THREE.Vector3(f.x + side * 2.8, 1.4 + hy, f.z + 4.1);
        fov = 42;
      } else {
        const mid = new THREE.Vector3((p.x + c.x) / 2, 1, (p.z + c.z) / 2);
        look = mid; pos = new THREE.Vector3(mid.x, 6, mid.z + 15);
      }
    } else if ((this.phase === 'ko' || this.phase === 'winpose') && this.koWinner) {
      const f = this.phase === 'ko' ? this.koLoser : this.koWinner;
      look = new THREE.Vector3(f.x, f.y + 0.8, f.z);
      const a = this.phaseT * 0.3;
      pos = new THREE.Vector3(f.x + Math.sin(a) * 5, 2.4, f.z + Math.cos(a) * 5 + 1);
      fov = 38;
    } else if (this.phase === 'done' && this.koWinner) {
      // results backdrop: the winner keeps celebrating in a close-up off to the side of the card
      const f = this.koWinner, port = cam.aspect < 1;
      const hy = f.critter.P.y * 0.5, drift = Math.sin(this.phaseT * 0.25) * 0.25;
      look = new THREE.Vector3(f.x + (port ? 0 : 1.5), (port ? 0.3 : 0.95) + hy, f.z);
      pos = new THREE.Vector3(f.x - 0.5 + drift, 1.45 + hy * 0.6, f.z + (port ? 7 : 5.6));
      fov = (port ? 46 : 36) / Math.max(1, 1.6 / cam.aspect); // undo the narrow-aspect widening below
    } else {
      const mx = (p.x + c.x) / 2, mz = (p.z + c.z) / 2;
      const sep = Math.hypot(p.x - c.x, p.z - c.z);
      // gentle yaw so the fighters' line stays across the screen
      const dx = c.x - p.x, dz = c.z - p.z;
      const want = Math.max(-0.35, Math.min(0.35, Math.atan(-dz / (Math.abs(dx) < 1e-3 ? 1e-3 : dx)))) * (Math.abs(dx) / (sep || 1));
      this.camYaw = THREE.MathUtils.damp(this.camYaw ?? 0, want, 1.2, dt);
      const yaw = this.camYaw;
      // frame tight: the horizontal view is wide on landscape phones, so distance can grow slower than separation
      const wide = Math.min(1.3, Math.max(0.8, cam.aspect / 1.9));
      const dist = Math.min(13.5, Math.max(6.6, (4.6 + sep * 0.8) / wide));
      const pitch = 0.36;
      look = new THREE.Vector3(mx, 0.9, mz - 0.4);
      pos = new THREE.Vector3(mx + Math.sin(yaw) * Math.cos(pitch) * dist, 0.9 + Math.sin(pitch) * dist, mz + Math.cos(yaw) * Math.cos(pitch) * dist);
      // never back the camera into the stands: pull it in and lift it instead
      const pr = Math.hypot(pos.x, pos.z), lim = ARENA_R + 4;
      if (pr > lim) { const k = lim / pr; pos.x *= k; pos.z *= k; pos.y += (pr - lim) * 0.45; }
    }
    const rate = this.camOverride ? 10 : this.phase === 'intro' ? 3 : 4;
    if (this.camSnap) { this.camSnap = false; cs.pos.copy(pos); cs.look.copy(look); cs.fov = fov; }
    cs.pos.x = THREE.MathUtils.damp(cs.pos.x, pos.x, rate, dt);
    cs.pos.y = THREE.MathUtils.damp(cs.pos.y, pos.y, rate, dt);
    cs.pos.z = THREE.MathUtils.damp(cs.pos.z, pos.z, rate, dt);
    cs.look.x = THREE.MathUtils.damp(cs.look.x, look.x, rate * 1.5, dt);
    cs.look.y = THREE.MathUtils.damp(cs.look.y, look.y, rate * 1.5, dt);
    cs.look.z = THREE.MathUtils.damp(cs.look.z, look.z, rate * 1.5, dt);
    cs.fov = THREE.MathUtils.damp(cs.fov, fov, 5, dt);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.2);
    const s = this.shakeAmt * this.shakeAmt * 0.6;
    cam.position.set(cs.pos.x + (Math.random() - 0.5) * s, cs.pos.y + (Math.random() - 0.5) * s, cs.pos.z + (Math.random() - 0.5) * s);
    cam.lookAt(cs.look);
    // narrow aspect (portrait-ish phones) need a wider fov
    const aspectFix = Math.max(1, 1.6 / cam.aspect);
    cam.fov = Math.min(80, cs.fov * aspectFix);
    cam.updateProjectionMatrix();
  }

  dispose() {
    this.modChip?.remove();
    this.items.clear();
    if (this.anims) { for (const fn of this.anims) fn(99); this.anims.length = 0; }
    this.arena.drawScreen();
    this.hud.speedLines(false);
    this.tutorial?.dispose();
    for (const f of this.fighters) f.dispose();
    for (let i = this.projectiles.length - 1; i >= 0; i--) this.removeProjectile(i);
    this.fx.clear();
    if (this.arena.fill) this.arena.fill.intensity = 0;
  }
}
