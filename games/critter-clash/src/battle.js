// One match: two fighters, rounds, hit resolution, projectiles, supers, camera direction.
import { buzz } from './haptics.js';
import * as THREE from 'three';
import { Fighter, SPECIALS } from './fighter.js';
import { Training } from './training.js';
import { CpuBrain } from './ai.js';
import { TYPES, typeMult, MODS } from './data.js';
import { ARENA_R } from './arena.js';
import { sfx, playMusic, setIntensity } from './audio.js';
import { Tutorial } from './tutorial.js';
import { save } from './save.js';
import { sayLine } from './personality.js';
import { Items } from './items.js';
import { Hazards } from './hazards.js';
import { toon, inked, canvasTex } from './toon.js';

// shared art for Ripples' puddles and whirlpool (made once, never disposed)
let puddleTex, swirlTex;
const getPuddleTex = () => puddleTex ||= canvasTex(256, 256, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(120,210,255,0.85)'); g.addColorStop(0.75, 'rgba(70,170,240,0.75)'); g.addColorStop(0.92, 'rgba(220,245,255,0.9)'); g.addColorStop(1, 'rgba(220,245,255,0)');
  c.fillStyle = g; c.beginPath();
  for (let k = 0; k <= 40; k++) { const a = k / 40 * Math.PI * 2, r = w * (0.44 + Math.sin(a * 5) * 0.03 + Math.sin(a * 3 + 1) * 0.02); c[k ? 'lineTo' : 'moveTo'](w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); }
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.8)';
  for (const [x, y, rx, ry] of [[0.36, 0.34, 0.1, 0.035], [0.6, 0.62, 0.07, 0.025], [0.3, 0.6, 0.04, 0.02]]) { c.beginPath(); c.ellipse(x * w, y * h, rx * w, ry * h, -0.5, 0, Math.PI * 2); c.fill(); }
});
const getSwirlTex = () => swirlTex ||= canvasTex(256, 256, (c, w, h) => {
  c.translate(w / 2, h / 2);
  for (let arm = 0; arm < 5; arm++) {
    c.beginPath();
    for (let k = 0; k <= 60; k++) { const t = k / 60, a = arm / 5 * Math.PI * 2 + t * 4.2, r = 8 + t * (w / 2 - 12); c[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    c.strokeStyle = arm % 2 ? 'rgba(220,248,255,0.95)' : 'rgba(110,200,255,0.9)'; c.lineWidth = 14; c.lineCap = 'round'; c.stroke();
  }
});

const ROUND_TIME = 60;
const INTRO_FIRST = 4.2, INTRO_FOCUS = 1.6; // first-round intro: rival close-up, then ours, then wide

export class Battle {
  constructor(game, pDef, cDef, { cpuLevel = 1, difficulty = 0.5, rounds = 2, playerLevel = 1, onEnd, trainer = null, mods = [], playerHp = 1, cpuHp = 1, training = false, stageSub = '' } = {}) {
    this.stageSub = stageSub;
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
    this.cpuHp = cpuHp; // team battles carry the rival's damage too
    this.fighters = [];
    this.fighters.push(new Fighter(this, pDef, { level: playerLevel, side: 0 }));
    this.fighters.push(new Fighter(this, cDef, { level: cpuLevel, cpu: true, side: 1 }));
    // best friends (5 hearts in Critter Camp) start the match with a head start on their super
    this.bestFriend = !training && (save.critters[pDef.id]?.pets || 0) >= 20;
    if (this.bestFriend) this.fighters[0].superM = 25;
    if (this.mods.has('bighead')) for (const f of this.fighters) f.critter.head.scale.setScalar(1.5);
    if (this.mods.size) {
      this.modChip = document.createElement('div');
      this.modChip.className = 'mod-chip';
      this.modChip.innerHTML = [...this.mods].map((m) => `<span>${MODS[m].icon}<b> ${MODS[m].name}</b></span>`).join('');
      this.hud.el.appendChild(this.modChip);
    }
    this.brain = new CpuBrain(this.fighters[1], difficulty, trainer?.style);
    this.pbrain = game.autoplay ? new CpuBrain(this.fighters[0], 0.7) : null;
    this.projectiles = [];
    this.items = new Items(this);
    this.hazards = new Hazards(this);
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
    this.training = training ? new Training(this) : null;
    this.tutorial = !save.tutorialDone && !game.autoplay && !training ? new Tutorial(this) : null;
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
    this.hazards.clear();
    this.fx.clear();
    this.time = ROUND_TIME;
    this.phase = 'intro';
    this.phaseT = 0;
    this.roundDmgTaken = 0;
    if (this.round === 1 && this.playerHp < 1) { p.hp = Math.max(1, Math.round(p.maxHp * this.playerHp)); p.dmgTrail = p.hp; }
    if (this.round === 1 && this.cpuHp < 1) { c.hp = Math.max(1, Math.round(c.maxHp * this.cpuHp)); c.dmgTrail = c.hp; }
    p.setState('intro'); c.setState('intro');
    const first = this.round === 1;
    p.introDelay = first ? INTRO_FOCUS : 0; c.introDelay = 0;
    p.introK0 = c.introK0 = first ? 0 : 1.5;
    this.introFocus = first ? c : null;
    this.introSaid = 0;
    if (first) {
      const hz = !this.training && save.settings.hazards !== false && this.hazards?.H;
      this.hud.stageCard(this.arena.A.name, this.training ? 'Training' : this.stageSub || (hz ? `⚠ ${hz.name}` : ''));
    }
    this.tense = 0;
    this.camFocusWas = undefined;
    if (this.training) {
      this.phase = 'fight'; this.time = Infinity;
      p.setState('idle'); c.setState('idle');
      this.hud.announce('TRAINING', 'round', 1200);
      playMusic('battle'); setIntensity(0);
      return;
    }
    this.hud.roundIntro(this.round, this.wins, first);
    if (this.round === 1) playMusic(this.trainer?.boss ? 'boss' : { beach: 'beach', volcano: 'volcano', frost: 'frost', neon: 'neon', sky: 'sky', grove: 'grove' }[this.arena.key] || 'battle');
    setIntensity(0);
  }

  // -------- hit resolution --------
  applyHit(att, def, h) {
    // Power Nap: a rival's blow on a napping Snoozlo is shrugged off and answered with a counter slam (Fighter.updateSpecial)
    if (def.state === 'special' && def.def.special === 'powernap' && !def.napHit && def.st < 0.95 && att && att !== def && att.state !== 'super' && def.alive) {
      def.napHit = true; def.st = 0; def.specFired = false; def.invuln = 0.55;
      if (def === this.player && !this.training) this.stats.counters = (this.stats.counters || 0) + 1;
      this.fx.text(def.headPos(), 'COUNTER!', 'big', 1);
      this.fx.spawn({ ...def.chestPos(), color: 0x9aff6a, size: 3.2, life: 0.25, shape: 'ring', grow: 1.6 });
      this.hud.callout('COUNTER!', def.side, 2);
      sfx.block?.(); sfx.voice(def.def.voice, 'special');
      this.hitstop = Math.max(this.hitstop, 0.12);
      return false;
    }
    // grown forms: specials, supers and their projectiles hit harder
    if (att && att !== def && att.movePow > 1 && (h.projectile || att.state === 'special' || att.state === 'super')) h = { ...h, dmg: h.dmg * att.movePow };
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
    this.training?.guardKO(def, dmg);
    def.takeHit(h);
    if (def === this.player) this.roundDmgTaken += dmg;
    // super meter: attacker gains more than defender
    att.superM = Math.min(100, att.superM + dmg * 0.09 * this.superMult);
    def.superM = Math.min(100, def.superM + dmg * 0.05 * this.superMult);
    const heavy = h.heavy || dmg > 90;
    this.hitstop = heavy ? 0.13 : 0.065;
    // feel the big ones in your hands: landing them or taking them
    if (heavy && (att === this.player || def === this.player) && !this.game.autoplay) buzz('medium');
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
    this.training?.onHit(att, dmg);
    if (!this.firstHit) { this.firstHit = true; this.hud.callout('FIRST STRIKE!', att.side, att === this.player ? 1 : 0); }
    // comic text
    const words = heavy ? ['BONK!', 'POW!', 'WHAM!', 'KAPOW!', 'BOOF!'] : ['bap!', 'pok!', 'tap!', 'bop!'];
    if (heavy || Math.random() < 0.4) this.fx.text({ x: p.x, y: p.y + 0.7, z: p.z }, words[Math.floor(Math.random() * words.length)], heavy ? 'big' : '', 0.7);
    this.fx.text({ x: p.x, y: p.y + 0.3, z: p.z }, String(dmg), 'dmg' + (eff > 1 ? ' super-eff' : eff < 1 ? ' weak' : ''), 0.75);
    // one "super effective" pill at a time
    if (eff > 1 && Math.random() < 0.6 && !(this.clock - this.effAt < 0.9)) {
      this.effAt = this.clock;
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
    if (this.hazards.storm()) { let t = 0; this.anim((dt) => { t += dt; if (t < 1.6) return true; if (this.phase === 'fight') this.hud.callout('The arena goes wild!', 0, 2); return false; }); }
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
    else if (p.kind === 'seed') {
      const sd = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshToonMaterial({ color: 0x9a6a34, emissive: 0x2a1808 }));
      sd.scale.set(0.8, 0.8, 1.6);
      const lf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshToonMaterial({ color: 0x5bd36a, emissive: 0x1d5a20 }));
      lf.scale.set(1, 0.25, 1.4); lf.position.set(0, 0.06, -0.18);
      mesh.add(sd, lf);
      mesh.rotation.y = Math.atan2(p.vx, p.vz);
    } else if (p.kind === 'fuzz') {
      const wool = new THREE.MeshToonMaterial({ color: 0xfff6d6, emissive: 0x3a3010 });
      const ball = new THREE.Group();
      for (let k = 0; k < 7; k++) {
        const w = new THREE.Mesh(new THREE.SphereGeometry(k ? 0.2 : 0.34, 12, 9), wool);
        if (k) { const a = k * 2.4, y = Math.cos(k * 1.7) * 0.22; w.position.set(Math.cos(a) * 0.24, y, Math.sin(a) * 0.24); }
        ball.add(w);
      }
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
      mesh.add(ball, halo);
    }
    else if (p.kind === 'splash') {
      // a wobbly water blob with a highlight
      const blob = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), new THREE.MeshToonMaterial({ color: 0x5ac8ff, emissive: 0x1a4a7a, transparent: true, opacity: 0.85 }));
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(-0.13, 0.16, 0.2); hl.scale.set(1, 0.6, 0.6);
      mesh.add(blob, hl);
    } else if (p.kind === 'puddle') {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(p.r, 32), new THREE.MeshBasicMaterial({ map: getPuddleTex(), transparent: true, depthWrite: false, opacity: 0 }));
      disc.rotation.x = -Math.PI / 2; disc.scale.setScalar(1 / 0.88);
      disc.renderOrder = 1;
      mesh.add(disc);
    } else if (p.kind === 'ember') {
      // a scorched patch with a hot glowing core; the flames themselves are particles
      const scorch = new THREE.Mesh(new THREE.CircleGeometry(p.r, 20), new THREE.MeshBasicMaterial({ color: 0x2a1008, transparent: true, opacity: 0, depthWrite: false }));
      const core = new THREE.Mesh(new THREE.CircleGeometry(p.r * 0.6, 20), new THREE.MeshBasicMaterial({ color: 0xff7a20, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      scorch.rotation.x = core.rotation.x = -Math.PI / 2; core.position.y = 0.01;
      scorch.renderOrder = core.renderOrder = 1;
      mesh.add(scorch, core);
    } else if (p.kind === 'sonic') {
      // two stacked rings of sound; scaled up as they travel outward
      for (const [y, o] of [[0.45, 0.85], [1.05, 0.55]]) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.88, 1, 56), new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: o, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = y - p.y; ring.userData.o = o;
        mesh.add(ring);
      }
    } else if (p.kind === 'shell') {
      // a firework shell: a bright ball with a little paper cap
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.26 * (p.size || 1), 12, 9), new THREE.MeshToonMaterial({ color: p.color, emissive: p.color, emissiveIntensity: 0.5 }));
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.12 * (p.size || 1), 0.2 * (p.size || 1), 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      cap.position.y = 0.2 * (p.size || 1);
      mesh.add(ball, cap);
    } else if (p.kind === 'cloud') {
      // a grumpy little thundercloud
      const cm = new THREE.MeshToonMaterial({ color: 0x6a6a8a, emissive: 0x1a1a2a });
      const puffs = new THREE.Group();
      for (const [x, y, z, r] of [[0, 0, 0, 0.75], [0.7, -0.1, 0.1, 0.55], [-0.7, -0.08, -0.05, 0.6], [0.3, 0.35, -0.2, 0.55], [-0.3, 0.3, 0.25, 0.5], [0, -0.2, 0.5, 0.5]]) {
        const pf = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), cm);
        pf.position.set(x, y, z); puffs.add(pf);
      }
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff060, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.set(1.6, 0.6, 1.4); glow.position.y = -0.3;
      mesh.add(puffs, glow);
      mesh.scale.setScalar(0.01);
    } else if (p.kind === 'whirl') {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ map: getSwirlTex(), transparent: true, depthWrite: false, opacity: 0 }));
      disc.rotation.x = -Math.PI / 2;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 40), new THREE.MeshBasicMaterial({ color: 0xdff6ff, transparent: true, opacity: 0 }));
      rim.rotation.x = -Math.PI / 2;
      mesh.add(disc, rim);
    }
    else if (p.kind === 'boulder') {
      // chunky rock with a glinting crystal and a cartoon outline (shared toon materials, kept on removal)
      const rock = inked(new THREE.DodecahedronGeometry(0.42, 0), toon(0xb8a690, { rim: 0.7 }), 0.03);
      rock.scale.set(1, 0.85, 0.95);
      const gem = inked(new THREE.OctahedronGeometry(0.14, 0), toon(0x9ae4ff, { rim: 1 }), 0.02);
      gem.scale.set(0.7, 1.5, 0.7); gem.position.set(0.18, 0.3, 0.1); gem.rotation.z = -0.4;
      const spin = new THREE.Group();
      spin.add(rock, gem);
      mesh.add(spin);
      mesh.scale.setScalar(p.size || 1);
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
      } else if (pr.kind === 'seed') {
        pr.vx *= Math.exp(-1.5 * dt); pr.vz *= Math.exp(-1.5 * dt);
        if (Math.random() < 0.4) this.fx.spawn({ x: pr.x, y: pr.y, z: pr.z, color: 0xc8ff9a, size: 0.18, life: 0.2, shape: 'glow', grow: -1 });
        if (pr.hitOnce.size) { this.fx.burst({ x: pr.x, y: pr.y, z: pr.z }, { n: 5, speed: 3, color: 0x7cff6a, shape: 'leaf', additive: false, size: 0.16, life: 0.35, grav: 5 }); this.removeProjectile(i); continue; }
      } else if (pr.kind === 'fuzz') {
        const sp = Math.hypot(pr.vx, pr.vz);
        pr.mesh.children[0].rotation.x += dt * sp / 0.42; // roll along the ground
        pr.mesh.rotation.y = Math.atan2(pr.vx, pr.vz);
        pr.mesh.children[1].scale.setScalar(1 + Math.sin(pr.t * 30) * 0.12);
        if (Math.random() < 0.45) this.fx.spawn({ x: pr.x + (Math.random() - 0.5) * 0.8, y: pr.y + (Math.random() - 0.3) * 0.8, z: pr.z + (Math.random() - 0.5) * 0.8, color: 0xffe14d, size: 0.32, life: 0.12, shape: 'bolt', rot: Math.random() * 6 });
        if (Math.random() < 0.25) this.fx.dust({ x: pr.x, z: pr.z }, 1, 0.5);
        if (pr.hitOnce.size) { this.fx.burst({ x: pr.x, y: pr.y, z: pr.z }, { n: 12, speed: 6, color: 0xffe14d, size: 0.22, life: 0.35, shape: 'spark' }); this.removeProjectile(i); continue; }
      } else if (pr.kind === 'boulder') {
        // a lob under gravity; it only hurts where it lands
        pr.vy -= pr.g * dt;
        pr.y += pr.vy * dt;
        pr.mesh.children[0].rotation.x += dt * 9; pr.mesh.children[0].rotation.z += dt * 5;
        if (pr.y > 2.5 && Math.random() < 0.3) this.fx.spawn({ x: pr.x, y: pr.y, z: pr.z, color: 0xd8c8b0, size: 0.4 * (pr.size || 1), life: 0.3, shape: 'puff', additive: false, alpha: 0.5 });
        if (pr.vy < 0 && pr.y <= 0.35 * (pr.size || 1)) { this.boulderLand(pr, target); this.removeProjectile(i); continue; }
      } else if (pr.kind === 'splash') {
        pr.vy -= pr.g * dt;
        pr.y += pr.vy * dt;
        pr.mesh.scale.set(1 + Math.sin(pr.t * 25) * 0.12, 1 - Math.sin(pr.t * 25) * 0.12, 1);
        if (Math.random() < 0.6) this.fx.spawn({ x: pr.x, y: pr.y, z: pr.z, color: 0xbfeaff, size: 0.2, life: 0.3, shape: 'drop', additive: false, grav: 6 });
        if (pr.vy < 0 && pr.y <= 0.3) { this.splashLand(pr, target); this.removeProjectile(i); continue; }
      } else if (pr.kind === 'cloud') {
        // drifts after the rival and zaps down every so often; the last strike is a big one
        const grow = Math.min(1, pr.t * 4, (pr.life - pr.t) * 5);
        pr.mesh.scale.setScalar(Math.max(0.01, grow) * 1.25 * (1 + Math.sin(pr.t * 5) * 0.04));
        pr.mesh.children[0].rotation.y += dt * 0.6;
        const glow = pr.mesh.children[1].material;
        glow.opacity = Math.max(0, glow.opacity - dt * 3);
        if (target.alive) {
          const dx = target.x - pr.x, dz = target.z - pr.z, dl = Math.hypot(dx, dz) || 1, sp = Math.min(4.4, dl * 3);
          pr.vx = THREE.MathUtils.damp(pr.vx, dx / dl * sp, 3, dt); pr.vz = THREE.MathUtils.damp(pr.vz, dz / dl * sp, 3, dt);
        }
        if (Math.random() < 0.15) this.fx.spawn({ x: pr.x + (Math.random() - 0.5), y: pr.y - 0.5, z: pr.z + (Math.random() - 0.5), vy: -6, color: 0x9fd8ff, size: 0.15, life: 0.4, shape: 'drop', additive: false });
        pr.zapT = (pr.zapT ?? 0.55) - dt;
        const last = !pr.bigDone && pr.t > pr.life - 0.45;
        if (pr.zapT <= 0 || last) {
          pr.zapT = 0.62;
          if (last) pr.bigDone = true;
          glow.opacity = 0.7;
          const d = Math.hypot(target.x - pr.x, target.z - pr.z);
          this.lightning(pr.x, pr.z, last, pr.y - 0.4);
          sfx.spark(); if (last) { sfx.boom(); this.shake(0.5); }
          if (target.alive && !target.under && d < (last ? 1.6 : 1.15)) {
            const a = Math.atan2(target.x - pr.x, target.z - pr.z) || 0;
            this.applyHit(pr.owner, target, { dmg: (last ? 70 : 26) * pr.owner.power, kb: last ? 7 : 0.8, lift: last ? 8 : 0, stun: last ? 0.45 : 0.25, dirX: Math.sin(a), dirZ: Math.cos(a), heavy: last, type: pr.owner.type, launch: last, dizzy: last ? 20 : 8, projectile: true });
          }
        }
      } else if (pr.kind === 'ember') {
        // Kindlekit's flame trail: burns whoever stands in it (one shared burn tick per owner)
        const fade = Math.max(0, Math.min(1, pr.t * 8, (pr.life - pr.t) * 2));
        pr.mesh.children[0].material.opacity = 0.45 * fade;
        pr.mesh.children[1].material.opacity = (0.5 + Math.sin(pr.t * 14 + pr.x) * 0.15) * fade;
        if (Math.random() < 0.45 * fade) this.fx.spawn({ x: pr.x + (Math.random() - 0.5) * pr.r, y: 0.15, z: pr.z + (Math.random() - 0.5) * pr.r, vy: 2.2 + Math.random() * 1.5, color: Math.random() < 0.5 ? 0xff6a1e : 0xffc23a, size: 0.45 + Math.random() * 0.3, life: 0.4, shape: 'glow', grow: -1 });
        if (Math.random() < 0.08 * fade) this.fx.spawn({ x: pr.x, y: 0.3, z: pr.z, vy: 4, vx: (Math.random() - 0.5) * 2, color: 0xfff07a, size: 0.12, life: 0.5, shape: 'spark' });
        const d = Math.hypot(target.x - pr.x, target.z - pr.z), O = pr.owner;
        if (target.alive && !target.under && target.y < 0.5 && d < pr.r + 0.3 && pr.t < pr.life - 0.25 && this.clock - (O.burnAt ?? -9) > 0.6) {
          O.burnAt = this.clock;
          const a = Math.atan2(target.x - pr.x, target.z - pr.z) || 0;
          this.applyHit(O, target, { dmg: 11 * O.power, kb: 0.7, lift: 0, stun: 0.16, dirX: Math.sin(a), dirZ: Math.cos(a), heavy: false, type: O.type, dizzy: 4, projectile: true });
        }
      } else if (pr.kind === 'sonic') {
        // the ring grows fast then slows; it hits once as it sweeps past the rival
        const k = Math.min(1, pr.t / pr.dur), R = 0.5 + (pr.maxR - 0.5) * (1 - (1 - k) ** 2);
        pr.mesh.scale.set(R, 1, R);
        pr.mesh.children.forEach((c) => (c.material.opacity = c.userData.o * (1 - k)));
        pr.x = pr.owner.x; pr.z = pr.owner.z; pr.vx = pr.vz = 0; // stays centred on the squeaker
        const d = Math.hypot(target.x - pr.x, target.z - pr.z);
        if (!pr.hitOnce.has(target) && target.alive && !target.under && target.y < 2 && d < R + 0.45 && d > R - 1.1) {
          pr.hitOnce.add(target);
          const dx = d > 0.05 ? (target.x - pr.x) / d : Math.sin(pr.owner.face), dz = d > 0.05 ? (target.z - pr.z) / d : Math.cos(pr.owner.face);
          this.applyHit(pr.owner, target, { ...pr.hit, dirX: dx, dirZ: dz, heavy: !!pr.hit.launch, projectile: true });
        }
        // the sound wave knocks small shots out of the air
        for (let j = this.projectiles.length - 1; j >= 0; j--) {
          const q = this.projectiles[j];
          if (q !== pr && q.owner !== pr.owner && !q.big && Math.abs(Math.hypot(q.x - pr.x, q.z - pr.z) - R) < 0.6) { this.fx.burst({ x: q.x, y: q.y, z: q.z }, { n: 6, speed: 3, color: 0xe8f4ff, size: 0.2, life: 0.3 }); this.removeProjectile(j); if (j < i) i--; }
        }
        if (pr.t >= pr.dur) { this.removeProjectile(i); continue; }
      } else if (pr.kind === 'shell') {
        // lobbed up, bursts in the air above its mark
        pr.vy -= pr.g * dt;
        pr.y += pr.vy * dt;
        pr.mesh.rotation.z = Math.atan2(-pr.vx, pr.vy) * 0.6;
        this.fx.spawn({ x: pr.x, y: pr.y - 0.1, z: pr.z, color: Math.random() < 0.5 ? 0xffe9a0 : pr.color, size: 0.3 * (pr.size || 1), life: 0.3, shape: 'spark', grow: -1 });
        if (pr.vy < 0 && pr.y <= pr.burstY) { this.shellBurst(pr, target); this.removeProjectile(i); continue; }
      } else if (pr.kind === 'puddle') {
        // a lingering slippery zone: the rival slides around inside it
        const m = pr.mesh.children[0].material, fade = Math.min(1, pr.t * 6, (pr.life - pr.t) * 2);
        m.opacity = Math.max(0, fade);
        pr.mesh.scale.setScalar(0.6 + 0.4 * Math.min(1, pr.t * 5) + Math.sin(pr.t * 3) * 0.02);
        const d = Math.hypot(target.x - pr.x, target.z - pr.z);
        if (target.alive && !target.under && target.y < 0.3 && d < pr.r * 0.92 && pr.t < pr.life - 0.3) target.slick = Math.max(target.slick || 0, 0.25);
        if (Math.random() < 0.08) this.fx.spawn({ x: pr.x + (Math.random() - 0.5) * pr.r * 1.4, y: 0.06, z: pr.z + (Math.random() - 0.5) * pr.r * 1.4, color: 0xdff6ff, size: 0.5, life: 0.5, shape: 'ring', alpha: 0.5 });
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

  boulderLand(pr, target) {
    const big = (pr.size || 1) > 1.5, p = { x: pr.x, y: 0.05, z: pr.z };
    this.fx.shock(p, 0xd8c8a8, pr.landR * 2, 0.35);
    this.fx.dust(p, big ? 12 : 6, big ? 1.4 : 0.9);
    this.fx.burst({ x: pr.x, y: 0.4, z: pr.z }, { n: big ? 18 : 8, speed: big ? 6 : 4, up: 4, color: 0x9a8a7a, size: big ? 0.3 : 0.2, life: 0.6, shape: 'puff', additive: false, grav: 14 });
    this.shake(big ? 0.7 : 0.25);
    big ? sfx.boom() : sfx.land();
    const d = Math.hypot(target.x - pr.x, target.z - pr.z);
    if (target.alive && d < pr.landR + 0.35 && target.y < 1.6) {
      const dx = d > 0.05 ? (target.x - pr.x) / d : Math.sin(pr.owner.face), dz = d > 0.05 ? (target.z - pr.z) / d : Math.cos(pr.owner.face);
      this.applyHit(pr.owner, target, { ...pr.hit, dirX: dx, dirZ: dz, heavy: big, projectile: true });
    }
  }

  // Squeakwing's ring of sound, centred on the squeaker
  sonic(f, maxR, hit, big = false) {
    this.spawnProjectile(f, { kind: 'sonic', big: true, x: f.x, z: f.z, y: 0.02, vx: 0, vz: 0, r: 0.1, life: 2, dur: big ? 0.6 : 0.45, maxR, hit });
    const h = f.headPos();
    this.fx.spawn({ ...h, color: 0xffffff, size: big ? 3 : 2, life: 0.15, shape: 'glow' });
    for (let k = 0; k < 5; k++) this.fx.spawn({ x: h.x + (Math.random() - 0.5), y: h.y + Math.random() * 0.6, z: h.z + (Math.random() - 0.5), vy: 2, color: 0xe8f4ff, size: 0.35, life: 0.5, shape: 'star', additive: false, rot: Math.random() * 6 });
    sfx.voice(f.def.voice * 1.4, 'special'); sfx.whoosh?.(2);
    if (big) { sfx.boom(); this.shake(0.5); } else this.shake(0.15);
  }

  shellBurst(pr, target) {
    const big = (pr.size || 1) > 1.4, at = { x: pr.x, y: pr.y, z: pr.z };
    const cols = [pr.color, pr.color2];
    const n = big ? 46 : 22;
    for (let k = 0; k < n; k++) {
      // a sphere of stars that droop under gravity, like real fireworks
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = (big ? 8 : 5.5) * (0.8 + Math.random() * 0.3);
      this.fx.spawn({ ...at, vx: r * Math.cos(a) * sp, vy: u * sp + 1, vz: r * Math.sin(a) * sp, color: cols[k % 2], size: (big ? 0.5 : 0.36) * (k % 3 ? 1 : 1.3), life: big ? 0.9 : 0.6, shape: k % 3 ? 'spark' : 'star', additive: k % 3 !== 0, grav: 5, rot: Math.random() * 6 });
    }
    this.fx.spawn({ ...at, color: 0xffffff, size: big ? 6 : 3, life: 0.18, shape: 'glow' });
    this.fx.spawn({ ...at, color: pr.color, size: big ? 5 : 2.8, life: 0.35, shape: 'ring' });
    this.fx.shock({ x: pr.x, y: 0.05, z: pr.z }, pr.color, pr.landR * 2, 0.3);
    if (big) { sfx.boom(); this.shake(0.6); } else sfx.fire();
    const d = Math.hypot(target.x - pr.x, target.z - pr.z);
    if (target.alive && !target.under && d < pr.landR + 0.35) {
      const dx = d > 0.05 ? (target.x - pr.x) / d : Math.sin(pr.owner.face), dz = d > 0.05 ? (target.z - pr.z) / d : Math.cos(pr.owner.face);
      this.applyHit(pr.owner, target, { ...pr.hit, dirX: dx, dirZ: dz, heavy: big, projectile: true });
    }
  }

  splashLand(pr, target) {
    const p = { x: pr.x, y: 0.05, z: pr.z };
    this.fx.shock(p, 0x8fd8ff, pr.landR * 2, 0.3);
    this.fx.burst({ x: pr.x, y: 0.3, z: pr.z }, { n: 14, speed: 4, up: 4, color: 0xa8e4ff, size: 0.22, life: 0.55, shape: 'drop', additive: false, grav: 14 });
    sfx.water?.();
    const d = Math.hypot(target.x - pr.x, target.z - pr.z);
    if (target.alive && !target.under && d < pr.landR + 0.35 && target.y < 1.6) {
      const dx = d > 0.05 ? (target.x - pr.x) / d : Math.sin(pr.owner.face), dz = d > 0.05 ? (target.z - pr.z) / d : Math.cos(pr.owner.face);
      this.applyHit(pr.owner, target, { ...pr.hit, dirX: dx, dirZ: dz, heavy: false, projectile: true });
    }
    // only one puddle per owner at a time
    for (let k = this.projectiles.length - 1; k >= 0; k--) if (this.projectiles[k].kind === 'puddle' && this.projectiles[k].owner === pr.owner) this.projectiles[k].life = Math.min(this.projectiles[k].life, this.projectiles[k].t + 0.4);
    this.spawnProjectile(pr.owner, { kind: 'puddle', big: true, x: pr.x, z: pr.z, y: 0.035, vx: 0, vz: 0, r: 1.7, life: 4.5, hit: {} });
  }

  removeProjectile(i) {
    const pr = this.projectiles[i];
    this.scene.remove(pr.mesh);
    // toon/outline materials are shared from a cache, so only per-projectile materials are freed
    pr.mesh.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); if (pr.kind !== 'boulder') o.material.dispose(); } });
    this.projectiles.splice(i, 1);
  }

  // -------- supers --------
  startSuper(f) {
    if (f === this.player && !this.game.autoplay) buzz('heavy');
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
    else if (id === 'bramble') {
      if (f.superPhase === 'go') {
        f.superPhase = 'vines'; f.st = 0; f.vineN = 0;
        f.vine = { x: f.x, z: f.z, a: f.angleTo(o) };
        sfx.leaf(); this.shake(0.3);
      }
      if (f.superPhase === 'vines') {
        const P = f.critter.pose;
        P.armLz = P.armRz = 2.2; P.sy = 0.9; P.lean = -0.2;
        // a line of thorns bursts up, curling toward the rival as it goes
        const n = Math.floor(t / 0.055);
        while (f.vineN <= n && f.vineN < 14) {
          const V = f.vine;
          const want = Math.atan2(o.x - V.x, o.z - V.z);
          let da = want - V.a; da = Math.atan2(Math.sin(da), Math.cos(da));
          V.a += THREE.MathUtils.clamp(da, -0.35, 0.35);
          V.x += Math.sin(V.a) * 0.75; V.z += Math.cos(V.a) * 0.75;
          const big = f.vineN === 13;
          this.thorns(V.x, V.z, big);
          if (f.vineN % 3 === 0) sfx.hit(false);
          if (!f.hitIds.has(o) && !o.airborne && Math.hypot(o.x - V.x, o.z - V.z) < 1.05) {
            f.hitIds.add(o);
            const a = V.a;
            this.applyHit(f, o, { dmg: 250 * f.power, kb: 4, lift: 13, stun: 0.8, dirX: Math.sin(a), dirZ: Math.cos(a), heavy: true, type: f.type, launch: true, dizzy: 40 });
            fx.burst({ x: o.x, y: 0.8, z: o.z }, { n: 24, speed: 8, up: 6, color: 0xff7eb6, shape: 'leaf', additive: false, size: 0.3, life: 0.9, grav: 6, spin: 8 });
            fx.shock({ x: o.x, z: o.z }, 0x7cff6a, 3, 0.4);
            sfx.boom(); this.shake(0.6); this.game.impactFrame(0.08);
          }
          f.vineN++;
        }
        if (t > 1.15) this.endSuper(f);
      }
    } else if (id === 'jetstream') {
      const P = f.critter.pose;
      if (f.superPhase === 'go') { f.superPhase = 'blow'; f.st = 0; f.gustN = 0; sfx.whoosh?.(0.6); }
      if (f.superPhase === 'blow') {
        // cheeks puffed, a long gust shoves the rival back; ticks of damage, a launch to finish
        const a = f.face, dx = Math.sin(a), dz = Math.cos(a);
        P.sx = 1.12; P.lean = -0.25; P.armLz = P.armRz = 1.1; P.tail = 2.2 + Math.sin(t * 30) * 0.3;
        f.critter.emote('closed', 'o', 0.2);
        f.vx = -dx * 1.2; f.vz = -dz * 1.2; // braced, sliding back a touch
        for (let k = 0; k < 4; k++) {
          const r = 0.8 + Math.random() * 8, w = (Math.random() - 0.5) * r * 0.35;
          fx.spawn({ x: f.x + dx * r + dz * w, y: 0.4 + Math.random() * 1.4, z: f.z + dz * r - dx * w, vx: dx * 16, vz: dz * 16, color: 0xffffff, size: 0.35 + Math.random() * 0.3, life: 0.25, shape: 'glow', alpha: 0.55 });
        }
        if (Math.random() < 0.5) fx.spawn({ x: f.x + dx * (1 + Math.random() * 6), y: 0.5 + Math.random(), z: f.z + dz * (1 + Math.random() * 6), vx: dx * 12, vz: dz * 12, color: 0xd8ffd0, size: 0.3, life: 0.4, shape: 'leaf', additive: false, spin: 10 });
        // long anime wind streaks, rotated to the gust's on-screen direction
        const a0 = new THREE.Vector3(f.x, 1, f.z).project(this.camera), a1 = new THREE.Vector3(f.x + dx, 1, f.z + dz).project(this.camera);
        const rot = Math.atan2((a1.y - a0.y) / this.camera.aspect, a1.x - a0.x) - Math.PI / 2;
        for (let k = 0; k < 3; k++) {
          // born just ahead of the cheeks so they sweep across the gap toward the rival
          const r = 0.5 + Math.random() * 4, w = (Math.random() - 0.5) * (1 + r * 0.35);
          fx.spawn({ x: f.x + dx * r + dz * w, y: 0.3 + Math.random() * 1.8, z: f.z + dz * r - dx * w, vx: dx * 13, vz: dz * 13, color: 0xffffff, size: 0.26, stretch: 9, rot, life: 0.3, shape: 'spark', additive: false, alpha: 0.95 });
        }
        // is the rival inside the gust cone?
        const ox = o.x - f.x, oz = o.z - f.z, along = ox * dx + oz * dz, side = Math.abs(ox * dz - oz * dx);
        const inCone = along > 0 && along < 12 && side < 1.2 + along * 0.2;
        if (inCone && o.alive && o.state !== 'dodge') {
          o.x += dx * dt * 2.5; o.z += dz * dt * 2.5;
          const due = Math.floor(t / 0.2);
          if (due > f.gustN && f.gustN < 6) {
            f.gustN = due;
            this.applyHit(f, o, { dmg: 24 * f.power, kb: 0.6, lift: 0, stun: 0.3, dirX: dx, dirZ: dz, heavy: false, type: f.type, dizzy: 5 });
          }
        }
        if (t > 1.45) {
          if (inCone && o.alive) { this.applyHit(f, o, { dmg: 90 * f.power, kb: 12, lift: 9, stun: 0.8, dirX: dx, dirZ: dz, heavy: true, type: f.type, launch: true, dizzy: 30 }); this.shake(0.6); this.game.impactFrame(0.07); }
          fx.shock({ x: f.x + dx * 2, z: f.z + dz * 2 }, 0xeaffea, 3, 0.4);
          f.superPhase = 'recover'; f.st = 0;
        }
      } else if (f.superPhase === 'recover') {
        P.sy = 0.9;
        if (t > 0.4) this.endSuper(f);
      }
    } else if (id === 'molerush') {
      const P = f.critter.pose;
      if (f.superPhase === 'go') { f.superPhase = 'dive'; f.st = 0; f.popN = 0; sfx.rumble?.(); }
      if (f.superPhase === 'dive') {
        P.lean = 1.2; P.armLx = P.armRx = -2.6; P.sy = Math.max(0.3, 1 - t * 3); P.y = -t * 3;
        if (t > 0.2) { f.superPhase = 'tunnel'; f.st = 0; f.under = true; f.root.visible = false; this.fx.dust(f, 8, 1.2); this.shake(0.3); }
      } else if (f.superPhase === 'tunnel') {
        // race underground to the rival, faster each time; the ground rumbles
        const a = f.angleTo(o), sp = 15 + f.popN * 3;
        f.face = a; f.vx = Math.sin(a) * sp; f.vz = Math.cos(a) * sp;
        if (Math.random() < 0.9) fx.spawn({ x: f.x + (Math.random() - 0.5) * 0.7, y: 0.12, z: f.z + (Math.random() - 0.5) * 0.7, vy: 2, color: 0x8a6a4a, size: 0.5, life: 0.5, shape: 'puff', additive: false, grav: 6 });
        if (f.distTo(o) < 0.5 || t > 0.8) {
          const last = f.popN === 2;
          f.superPhase = 'pop'; f.st = 0; f.under = false; f.root.visible = true;
          f.vx = f.vz = 0; f.vy = last ? 12 : 8; f.y = 0.05;
          sfx.boom(); this.shake(last ? 0.8 : 0.45); this.game.impactFrame(last ? 0.1 : 0.05);
          fx.burst({ x: f.x, y: 0.2, z: f.z }, { n: last ? 26 : 14, speed: last ? 9 : 6, up: 8, color: 0x9a7a5a, size: 0.3, life: 0.8, shape: 'puff', additive: false, grav: 16 });
          fx.burst({ x: f.x, y: 0.3, z: f.z }, { n: 8, speed: 5, up: 6, color: 0xffc83a, size: 0.25, life: 0.6, shape: 'star', additive: false, grav: 10 });
          fx.shock({ x: f.x, z: f.z }, 0xc08a55, last ? 4 : 2.6, 0.35);
          if (o.alive && f.distTo(o) < 1.6) {
            const ang = f.angleTo(o);
            this.applyHit(f, o, last
              ? { dmg: 130 * f.power, kb: 6, lift: 13, stun: 0.8, dirX: Math.sin(ang), dirZ: Math.cos(ang), heavy: true, type: f.type, launch: true, dizzy: 35 }
              : { dmg: 60 * f.power, kb: 0.5, lift: 0, stun: 1.0, dirX: Math.sin(ang), dirZ: Math.cos(ang), heavy: true, type: f.type, dizzy: 12 });
          }
          f.popN++;
        }
      } else if (f.superPhase === 'pop') {
        P.sy = 1.25; P.armLz = P.armRz = 2.6; P.legL = P.legR = 0.5; P.head = -0.3;
        f.critter.emote('happy', 'grin', 0.2);
        if (t > 0.1 && f.y <= 0) {
          if (f.popN < 3) { f.superPhase = 'dive'; f.st = 0; } else { f.superPhase = 'recover'; f.st = 0; }
        }
      } else if (f.superPhase === 'recover') {
        P.sy = 0.9;
        if (t > 0.45) this.endSuper(f);
      }
    } else if (id === 'lilysplash') {
      const P = f.critter.pose;
      if (f.superPhase === 'go') { f.superPhase = 'leap'; f.st = 0; f.vy = 17; f.y = 0.05; f.target = { x: o.x, z: o.z }; sfx.whoosh(0.8); sfx.voice(f.def.voice, 'win'); }
      if (f.superPhase === 'leap' || f.superPhase === 'flop') {
        // home in on the spot the rival was standing, tucked going up, sprawled coming down
        const tx = f.target.x - f.x, tz = f.target.z - f.z;
        f.vx = tx * 1.7; f.vz = tz * 1.7;
        if (f.superPhase === 'leap') {
          P.sy = 1.2; P.legL = P.legR = 0.9; P.armLz = P.armRz = 0.3; P.lean = -0.3;
          f.critter.emote('happy', 'grin', 0.2);
          if (t > 0.3) fx.spawn({ x: f.target.x, y: 0.06, z: f.target.z, color: 0x48b8ff, size: 4.8, life: 0.12, shape: 'ring', alpha: 0.6 });
          if (f.vy < 0) { f.vy = -24; f.superPhase = 'flop'; sfx.whoosh(0.5); }
        } else {
          P.lean = 1.25; P.armLz = P.armRz = 2.2; P.legL = P.legR = -1.0; P.sx = 1.2; P.sy = 0.9;
          f.critter.emote('closed', 'open', 0.2);
          if (Math.random() < 0.7) fx.spawn({ x: f.x + (Math.random() - 0.5), y: f.y + 0.5, z: f.z + (Math.random() - 0.5), vy: 4, color: 0x9fe0ff, size: 0.35, life: 0.3, shape: 'drop', additive: false });
        }
      } else if (f.superPhase === 'splash') {
        P.lean = 1.25; P.sy = 0.6; P.sx = 1.4; P.armLz = P.armRz = 2.2; P.legL = P.legR = -1.0;
        // a second ring of water rolls outward and catches anyone who dodged the flop
        const R = 1 + t * 9;
        if (!f.hitIds.has(o) && o.alive && Math.abs(f.distTo(o) - R) < 0.8 && o.y < 1 && R < 6) {
          f.hitIds.add(o);
          const a = f.angleTo(o);
          this.applyHit(f, o, { dmg: 95 * f.power, kb: 9, lift: 6, stun: 0.6, dirX: Math.sin(a), dirZ: Math.cos(a), heavy: true, type: f.type, launch: true, dizzy: 20 });
        }
        if (t > 0.65) { f.superPhase = 'recover'; f.st = 0; }
      } else if (f.superPhase === 'recover') {
        P.sy = 1.05; P.lean = 0;
        if (t > 0.35) this.endSuper(f);
      }
    } else if (id === 'lullaby') {
      // sways and sings until the rival nods off, then rolls right over them
      const P = f.critter.pose;
      if (f.superPhase === 'go') { f.superPhase = 'sing'; f.st = 0; f.slept = false; }
      if (f.superPhase === 'sing') {
        f.turnTo(f.angleTo(o), 6, dt);
        const sw = Math.sin(t * 4);
        P.roll = sw * 0.25; P.armLz = 1.9 + sw * 0.4; P.armRz = 1.9 - sw * 0.4; P.head = -0.2; P.ear = 0.6; P.y = Math.abs(sw) * 0.08;
        f.critter.emote('happy', 'o', 0.1);
        if (Math.random() < dt * 14) {
          const dx = o.x - f.x, dz = o.z - f.z;
          fx.spawn({ x: f.x + (Math.random() - 0.5) * 0.6, y: 1.4, z: f.z + (Math.random() - 0.5) * 0.6, vx: dx * 0.9, vy: 0.4, vz: dz * 0.9, color: [0xb49aff, 0x8ae0ff, 0xffb0d8][Math.floor(Math.random() * 3)], size: 0.7, life: 1.0, shape: 'heart', additive: false });
        }
        if (!f.slept && t > 0.9) {
          f.slept = true;
          if (o.alive && o.state !== 'super' && !(o.invuln > 0)) {
            o.setState('dizzy'); o.asleep = true; o.dizzyT = 1.8; o.dizzy = 0; o.vx = o.vz = 0;
            o.critter.emote('closed', 'o', 1.5);
            fx.text(o.headPos(), 'Zzz...', 'dizzy', 1.1);
          }
        }
        if (t > 1.1) { f.superPhase = 'roll'; f.st = 0; f.hitIds.clear(); f.rollSpin = 0; sfx.whoosh?.(0.6); }
      } else if (f.superPhase === 'roll') {
        f.turnTo(f.angleTo(o), 5, dt);
        f.vx = Math.sin(f.face) * 13; f.vz = Math.cos(f.face) * 13;
        P.sx = 1.05; P.sy = 0.78; P.head = 0.9; P.armLx = P.armRx = -2.4; P.legL = P.legR = -1.6; P.roll = 0;
        f.rollSpin += dt * 24;
        f.critter.P.lean = f.rollSpin; f.critter.V.lean = 0;
        if (Math.random() < 0.5) fx.dust({ x: f.x, y: 0, z: f.z }, 2);
        if (!f.hitIds.has(o) && o.alive && f.distTo(o) < 1.45) {
          f.hitIds.add(o);
          const ang = f.angleTo(o);
          this.applyHit(f, o, { dmg: 165 * f.power, kb: 10, lift: 9, stun: 0.8, dirX: Math.sin(ang), dirZ: Math.cos(ang), heavy: true, type: f.type, launch: true, dizzy: 30 });
          f.superPhase = 'recover'; f.st = 0;
        } else if (t > 0.9) { f.superPhase = 'recover'; f.st = 0; }
      } else if (f.superPhase === 'recover') {
        f.vx = f.vz = 0;
        f.critter.P.lean = 0; P.lean = 0; P.sy = 1.05; P.armLz = P.armRz = 1.2;
        f.critter.emote('happy', 'grin', 0.1);
        if (t > 0.4) this.endSuper(f);
      }
    } else if (id === 'echoboom') {
      // hovers up on beating wings and lets out three huge squeaks, the last one a sonic boom
      const P = f.critter.pose;
      if (f.superPhase === 'go') { f.superPhase = 'boom'; f.st = 0; f.boomN = 0; }
      if (f.superPhase === 'boom') {
        f.turnTo(f.angleTo(o), 6, dt);
        const pulse = f.boomN > 0 && t - (0.25 + (f.boomN - 1) * 0.45) < 0.15;
        P.y = 0.5 + Math.sin(t * 9) * 0.12; P.tail = 1.6; P.ear = 1; P.head = -0.25;
        P.armLz = P.armRz = pulse ? 2.6 : 1.6; P.sx = pulse ? 1.15 : 1; P.sy = pulse ? 0.92 : 1.05;
        f.critter.emote(pulse ? 'angry' : 'closed', pulse ? 'yell' : 'o', 0.1);
        if (f.boomN < 3 && t > 0.25 + f.boomN * 0.45) {
          const last = f.boomN === 2;
          this.sonic(f, last ? 6.2 : 5.2, last ? { dmg: 125 * f.power, kb: 9, lift: 10, stun: 0.8, type: f.type, launch: true, dizzy: 30 } : { dmg: 42 * f.power, kb: 3, lift: 0, stun: 0.45, type: f.type, dizzy: 10 }, last);
          f.boomN++;
        }
        if (f.boomN >= 3 && t > 1.55) { f.superPhase = 'recover'; f.st = 0; }
      } else if (f.superPhase === 'recover') {
        P.y = 0; P.sy = 1.05;
        if (t > 0.3) this.endSuper(f);
      }
    } else if (id === 'fireworks') {
      // a festival finale: shells launched off the tail flame, bursting all around the rival, the big one last
      const P = f.critter.pose;
      if (f.superPhase === 'go') { f.superPhase = 'launch'; f.st = 0; f.shellN = 0; sfx.voice(f.def.voice, 'win'); sfx.whoosh?.(1.4); }
      if (f.superPhase === 'launch') {
        const N = 8, PAL = [[0xff4fa0, 0xffe14d], [0x4fd8ff, 0xffffff], [0x9aff4f, 0xffe14d], [0xffa030, 0xff4f4f], [0xc87aff, 0x7af0ff]];
        f.turnTo(f.angleTo(o), 8, dt);
        P.armLz = P.armRz = 2.4 + Math.sin(t * 18) * 0.3; P.head = -0.35; P.tail = 1.2; P.y = Math.abs(Math.sin(t * 9)) * 0.12;
        f.critter.emote('happy', 'grin', 0.2);
        if (f.shellN < N && t > 0.1 + f.shellN * 0.16) {
          const last = f.shellN === N - 1, sp = last ? 0 : 2.6, c = PAL[f.shellN % PAL.length];
          const tx = o.x + (Math.random() - 0.5) * sp + o.vx * 0.35, tz = o.z + (Math.random() - 0.5) * sp + o.vz * 0.35;
          const T = last ? 1.0 : 0.75, g = 18, y0 = 1.3, by = last ? 1.6 : 1.1;
          this.spawnProjectile(f, { kind: 'shell', big: true, x: f.x, z: f.z, y: y0, vx: (tx - f.x) / T, vz: (tz - f.z) / T, vy: (by - y0 + 0.5 * g * T * T) / T, g, burstY: by, landR: last ? 2.2 : 1.15, r: 0.2, life: 3, size: last ? 1.8 : 1, color: last ? 0xffd23a : c[0], color2: last ? 0xff4fa0 : c[1],
            hit: last ? { dmg: 115 * f.power, kb: 6, lift: 11, stun: 0.8, type: f.type, launch: true, dizzy: 30 } : { dmg: 27 * f.power, kb: 1.6, lift: 0, stun: 0.4, type: f.type, dizzy: 8 } });
          fx.spawn({ x: tx, y: 0.06, z: tz, color: 0xffc23a, size: last ? 4.4 : 2.3, life: 0.6, shape: 'ring', alpha: 0.5 });
          fx.spawn({ x: f.x, y: 1.4, z: f.z, color: 0xfff07a, size: 1.6, life: 0.15, shape: 'glow' });
          sfx.whoosh?.(1.8);
          f.shellN++;
        }
        if (f.shellN >= N && !this.projectiles.some((p) => p.owner === f && p.kind === 'shell')) { f.superPhase = 'recover'; f.st = 0; }
      } else if (f.superPhase === 'recover') {
        P.armLz = P.armRz = 1.2; P.sy = 1.05;
        if (t > 0.4) this.endSuper(f);
      }
    } else if (id === 'stormcloud') {
      // summon a thundercloud over the rival, then get straight back to fighting while it hunts them
      const P = f.critter.pose;
      if (f.superPhase === 'go') {
        f.superPhase = 'summon'; f.st = 0;
        sfx.spark(); sfx.superCharge();
        for (const pr of this.projectiles) if (pr.kind === 'cloud' && pr.owner === f) pr.life = Math.min(pr.life, pr.t + 0.3);
        this.spawnProjectile(f, { kind: 'cloud', big: true, x: o.x, z: o.z, y: 3.1, vx: 0, vz: 0, r: 0.1, life: 4.4, hit: {} });
      }
      P.armLz = P.armRz = 2.7; P.y = 0.25 + Math.sin(t * 10) * 0.1; P.head = -0.4;
      f.critter.emote('happy', 'open', 0.2);
      if (Math.random() < 0.6) fx.spawn({ x: f.x + (Math.random() - 0.5), y: 1.8 + Math.random(), z: f.z + (Math.random() - 0.5), vy: 3, color: 0xfff060, size: 0.6, life: 0.15, shape: 'bolt', rot: Math.random() * 6 });
      if (t > 0.6) this.endSuper(f);
    } else if (id === 'whirlpool') {
      // a whirlpool opens under the rival, spins them round and round, then a geyser blasts them up
      const P = f.critter.pose;
      if (f.superPhase === 'go') {
        f.superPhase = 'swirl'; f.st = 0; f.whirlN = 0;
        sfx.water(); sfx.superCharge();
        this.spawnProjectile(f, { kind: 'whirl', big: true, x: o.x, z: o.z, y: 0.04, vx: 0, vz: 0, r: 0.1, life: 2.3, hit: {} });
        f.whirl = this.projectiles[this.projectiles.length - 1];
        f.whirlA = Math.atan2(o.x - f.whirl.x, o.z - f.whirl.z) || 0;
      }
      const W = f.whirl;
      if (W && f.superPhase !== 'go') {
        // the disc grows, spins, and fades out at the end
        const R = Math.min(2.6, 0.3 + W.t * 5), fade = Math.min(1, W.t * 4, (2.2 - W.t) * 3);
        W.mesh.scale.setScalar(R);
        W.mesh.children[0].rotation.z = W.t * 9;
        W.mesh.children[0].material.opacity = Math.max(0, fade) * 0.9;
        W.mesh.children[1].material.opacity = Math.max(0, fade) * 0.7;
        if (Math.random() < 0.8) {
          const a = Math.random() * Math.PI * 2, r = R * (0.5 + Math.random() * 0.5);
          fx.spawn({ x: W.x + Math.sin(a) * r, y: 0.15, z: W.z + Math.cos(a) * r, vx: Math.cos(a) * 5, vz: -Math.sin(a) * 5, vy: 1.5, color: Math.random() < 0.5 ? 0x8fd8ff : 0xffffff, size: 0.3, life: 0.35, shape: 'drop', additive: false, grav: 6 });
        }
      }
      if (f.superPhase === 'swirl') {
        // the otter spins on the spot to drive the current
        P.yaw = t * 18; P.armLz = P.armRz = 2.4; P.y = 0.1 + Math.abs(Math.sin(t * 9)) * 0.1;
        f.critter.emote('happy', 'grin', 0.2);
        const d = Math.hypot(o.x - W.x, o.z - W.z);
        if (o.alive && !o.under && d < 3.2 && o.state !== 'dodge') {
          // caught: orbit inward
          f.whirlA += dt * 7;
          const r = THREE.MathUtils.damp(d, 0.7, 3, dt);
          o.x = W.x + Math.sin(f.whirlA) * r; o.z = W.z + Math.cos(f.whirlA) * r;
          o.vx = o.vz = 0; o.face += dt * 9;
          const times = [0.3, 0.55, 0.8, 1.05];
          if (f.whirlN < times.length && t > times[f.whirlN]) {
            f.whirlN++;
            this.applyHit(f, o, { dmg: 24 * f.power, kb: 0, lift: 0, stun: 0.5, dirX: Math.sin(f.whirlA), dirZ: Math.cos(f.whirlA), heavy: false, type: f.type, dizzy: 6 });
          }
        }
        if (t > 1.3) {
          f.superPhase = 'geyser'; f.st = 0;
          sfx.boom(); sfx.water(); this.shake(0.7); this.game.impactFrame(0.08);
          fx.shock({ x: W.x, z: W.z }, 0x8fd8ff, 4, 0.5);
          for (let k = 0; k < 46; k++) {
            const a = Math.random() * Math.PI * 2, s = Math.random() * 2.5;
            fx.spawn({ x: W.x + Math.sin(a) * s * 0.3, y: 0.2, z: W.z + Math.cos(a) * s * 0.3, vx: Math.sin(a) * s, vz: Math.cos(a) * s, vy: 10 + Math.random() * 10,
              color: [0x48b8ff, 0xdff6ff, 0x8fd8ff][k % 3], size: 0.35 + Math.random() * 0.45, life: 1.1, shape: 'drop', additive: false, grav: 16 });
          }
          const dd = Math.hypot(o.x - W.x, o.z - W.z);
          if (o.alive && !o.under && dd < 2.2) {
            const a = Math.atan2(o.x - W.x, o.z - W.z) || 0;
            this.applyHit(f, o, { dmg: 135 * f.power, kb: 2, lift: 15, stun: 0.8, dirX: Math.sin(a), dirZ: Math.cos(a), heavy: true, type: f.type, launch: true, dizzy: 36 });
          }
        }
      } else if (f.superPhase === 'geyser') {
        P.armLz = P.armRz = 2.8; P.y = Math.abs(Math.sin(t * 8)) * 0.25;
        f.critter.emote('happy', 'open', 0.2);
        if (t < 0.4) for (let k = 0; k < 4; k++) fx.spawn({ x: W.x + (Math.random() - 0.5) * 0.8, y: Math.random() * 5, z: W.z + (Math.random() - 0.5) * 0.8, vy: 12, color: 0xdff6ff, size: 0.5, life: 0.4, shape: 'drop', additive: false, grav: 10 });
        if (t > 0.9) { f.whirl = null; this.endSuper(f); }
      }
    } else if (id === 'avalanche') {
      const P = f.critter.pose;
      if (f.superPhase === 'go') { f.superPhase = 'rain'; f.st = 0; f.rockN = 0; sfx.voice(f.def.voice, 'win'); sfx.rumble?.(); this.shake(0.5); }
      if (f.superPhase === 'rain') {
        // howl at the sky, stomping, while the rocks come down around the rival
        P.head = -0.6; P.armLz = P.armRz = 2.4; P.sy = 1.08; P.y = Math.abs(Math.sin(t * 14)) * 0.1;
        f.critter.emote('closed', 'yell', 0.2);
        const N = 7;
        if (f.rockN < N && t > 0.12 + f.rockN * 0.17) {
          const last = f.rockN === N - 1, sp = last ? 0 : 2.2;
          const x = o.x + (Math.random() - 0.5) * sp + o.vx * 0.25, z = o.z + (Math.random() - 0.5) * sp + o.vz * 0.25;
          this.spawnProjectile(f, { kind: 'boulder', big: true, x, z, y: last ? 13 : 10, vx: 0, vz: 0, vy: -4, g: 34, landR: last ? 2.1 : 1.1, life: 4, size: last ? 2.4 : 1 + Math.random() * 0.3,
            hit: last ? { dmg: 110 * f.power, kb: 6, lift: 11, stun: 0.8, type: f.type, launch: true, dizzy: 30 } : { dmg: 30 * f.power, kb: 2, lift: 0, stun: 0.45, type: f.type, dizzy: 8 } });
          // a shadow-ring marks each landing spot
          fx.spawn({ x, y: 0.06, z, color: 0x6a5a4a, size: last ? 4.4 : 2.4, life: 0.5, shape: 'ring', additive: false, alpha: 0.6 });
          f.rockN++;
        }
        if (Math.random() < 0.4) fx.spawn({ x: o.x + (Math.random() - 0.5) * 4, y: 9, z: o.z + (Math.random() - 0.5) * 4, vy: -8, color: 0xb8a890, size: 0.25, life: 1, shape: 'puff', additive: false });
        if (f.rockN >= N && !this.projectiles.some((p) => p.owner === f && p.kind === 'boulder')) { f.superPhase = 'recover'; f.st = 0; }
      } else if (f.superPhase === 'recover') {
        if (t > 0.45) this.endSuper(f);
      }
    } else if (id === 'megafluff') {
      const P = f.critter.pose;
      if (f.superPhase === 'go') { f.superPhase = 'inflate'; f.st = 0; f.bounceN = 0; sfx.superCharge(); }
      if (f.superPhase === 'inflate') {
        const k = Math.min(1, t / 0.45);
        f.root.scale.setScalar(1 + k * 0.9 + Math.sin(t * 40) * 0.04 * (1 - k));
        P.armLz = P.armRz = 1.6; P.sx = 1.15;
        f.critter.emote('angry', 'grin', 0.2);
        if (Math.random() < 0.6) fx.spawn({ x: f.x + (Math.random() - 0.5) * 2, y: Math.random() * 2.2, z: f.z + (Math.random() - 0.5) * 2, color: 0xffe14d, size: 0.5, life: 0.12, shape: 'bolt', rot: Math.random() * 6 });
        if (t > 0.5) this.fluffHop(f, o);
      } else if (f.superPhase === 'hop') {
        P.legL = P.legR = -0.6; P.armLz = P.armRz = 2.3; P.sy = f.vy > 0 ? 1.1 : 0.95;
        if (Math.random() < 0.5) fx.spawn({ x: f.x + (Math.random() - 0.5) * 1.6, y: f.y + Math.random() * 2, z: f.z + (Math.random() - 0.5) * 1.6, color: 0xffe14d, size: 0.45, life: 0.12, shape: 'bolt', rot: Math.random() * 6 });
      } else if (f.superPhase === 'squash') {
        P.sy = 0.7; P.sx = 1.3;
        if (t > 0.12) { if (f.bounceN < 3) this.fluffHop(f, o); else { f.superPhase = 'deflate'; f.st = 0; sfx.whoosh?.(0.5); } }
      } else if (f.superPhase === 'deflate') {
        f.root.scale.setScalar(Math.max(1, 1.9 - t * 2.4));
        if (t > 0.4) { f.root.scale.setScalar(1); this.endSuper(f); }
      }
    }
    void tcol;
  }

  fluffHop(f, o) {
    f.superPhase = 'hop'; f.st = 0;
    f.vy = 10; f.y = 0.05;
    const T = 2 * f.vy / this.grav, tx = o.x - f.x, tz = o.z - f.z;
    f.vx = tx / T; f.vz = tz / T;
    f.face = Math.atan2(tx, tz);
    sfx.whoosh?.(0.6);
  }

  thorns(x, z, big) {
    const mat = this.thornMat ||= new THREE.MeshToonMaterial({ color: 0x3fae4a });
    const geo = this.thornGeo ||= new THREE.ConeGeometry(0.16, 1, 5);
    const g = new THREE.Group();
    const n = big ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, mat);
      const a = Math.random() * 6.28, r = Math.random() * (big ? 0.6 : 0.3);
      m.position.set(x + Math.cos(a) * r, -0.6, z + Math.sin(a) * r);
      m.rotation.set((Math.random() - 0.5) * 0.7, 0, (Math.random() - 0.5) * 0.7);
      m.scale.set(1, (big ? 1.8 : 1) * (0.7 + Math.random() * 0.6), 1);
      m.castShadow = true;
      g.add(m);
    }
    this.scene.add(g);
    this.fx.dust({ x, z }, big ? 6 : 2, big ? 1.4 : 0.8);
    this.fx.burst({ x, y: 0.3, z }, { n: big ? 10 : 3, speed: 3, up: 3, color: 0x7cff6a, shape: 'leaf', additive: false, size: 0.22, life: 0.5, grav: 6, spin: 6 });
    let t = 0;
    this.anim((dt) => {
      t += dt;
      const up = t < 0.08 ? t / 0.08 : t > 0.7 ? Math.max(0, 1 - (t - 0.7) / 0.3) : 1;
      g.children.forEach((m) => { m.position.y = -0.6 + up * 0.95 * m.scale.y; });
      if (t < 1.0) return true;
      this.scene.remove(g);
      return false;
    });
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
    if (f.def.super === 'megafluff' && f.superPhase === 'hop') {
      const o = f.opp;
      f.bounceN++;
      f.superPhase = 'squash'; f.st = 0; f.vx = f.vz = 0;
      const last = f.bounceN >= 3;
      sfx.boom(); sfx.spark(); this.shake(last ? 0.8 : 0.45); this.game.impactFrame(last ? 0.1 : 0.05);
      this.fx.shock(f, 0xffe14d, last ? 4.5 : 3, 0.4);
      this.fx.dust(f, 12, 1.8);
      this.fx.burst({ x: f.x, y: 0.4, z: f.z }, { n: 14, speed: 8, up: 3, color: 0xffe14d, size: 0.25, life: 0.4, shape: 'spark' });
      if (o.alive && f.distTo(o) < (last ? 2.8 : 2.3) && o.y < 1.4) {
        const a = f.angleTo(o);
        this.applyHit(f, o, last
          ? { dmg: 140 * f.power, kb: 9, lift: 10, stun: 0.8, dirX: Math.sin(a), dirZ: Math.cos(a), heavy: true, type: f.type, launch: true, dizzy: 30 }
          : { dmg: 70 * f.power, kb: 1.5, lift: 0, stun: 1.1, dirX: Math.sin(a), dirZ: Math.cos(a), heavy: true, type: f.type, paralyze: 0.5, dizzy: 12 });
      }
      return;
    }
    if (f.def.super === 'quake' && f.superPhase === 'hop') {
      f.superPhase = 'quake'; f.st = 0; f.ringN = 0;
      this.game.impactFrame(0.08);
      return;
    }
    if (f.def.super === 'lilysplash' && f.superPhase === 'flop') {
      // BELLY FLOP: water and lily pads everywhere
      f.superPhase = 'splash'; f.st = 0; f.vx = f.vz = 0;
      const o = f.opp;
      sfx.boom(); sfx.water(); this.shake(0.9); this.game.impactFrame(0.1);
      this.fx.shock(f, 0x48b8ff, 6, 0.6);
      this.fx.shock(f, 0x6cff6a, 3.4, 0.4);
      this.fx.burst({ x: f.x, y: 0.3, z: f.z }, { n: 34, speed: 9, up: 9, color: 0x9fe0ff, size: 0.4, life: 0.8, shape: 'drop', additive: false, grav: 18 });
      this.fx.burst({ x: f.x, y: 0.4, z: f.z }, { n: 18, speed: 7, up: 7, color: 0x5ad04a, size: 0.42, life: 1.0, shape: 'leaf', additive: false, grav: 10, spin: 6 });
      this.fx.burst({ x: f.x, y: 0.6, z: f.z }, { n: 8, speed: 5, up: 8, color: 0xff8ac0, size: 0.3, life: 1.1, shape: 'leaf', additive: false, grav: 8, spin: 8 });
      this.fx.dust(f, 10, 1.6);
      if (o.alive && f.distTo(o) < 2.6 && o.y < 1.6) {
        f.hitIds.add(o);
        const a = f.angleTo(o);
        this.applyHit(f, o, { dmg: 240 * f.power, kb: 10, lift: 11, stun: 0.8, dirX: Math.sin(a), dirZ: Math.cos(a), heavy: true, type: f.type, launch: true, dizzy: 40 });
      }
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

  lightning(x, z, big, top = 14) {
    const pts = [];
    let px = x, pz = z;
    for (let y = top; y >= 0; y -= 1.4) { pts.push(new THREE.Vector3(px, y, pz)); px = x + (Math.random() - 0.5) * 1.2; pz = z + (Math.random() - 0.5) * 1.2; }
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
    f.root.scale.setScalar(1);
    f.superInvuln = false;
    f.invuln = 0.3;
    f.y = Math.max(0, f.y);
    f.setState('idle');
    f.critter.emote('open', 'grin', 0.6);
    // only clear our own super: the rival may have started one this same frame (its cut-in is still playing)
    if (this.superUser === f) this.superUser = null;
  }

  // -------- KO & rounds --------
  onKO(att, def) {
    if (!this.game.autoplay) buzz('heavy');
    this.phase = 'ko';
    this.phaseT = 0;
    this.slowmo = 1.6;
    this.koWinner = att;
    this.koLoser = def;
    // the match-deciding KO gets a frozen, tilted impact close-up before the orbit
    this.finisher = this.wins[att.side] + 1 >= this.winsNeeded && !this.training;
    this.hud.announce(this.finisher ? 'FINAL K.O.!' : 'K.O.!', 'ko');
    if (this.finisher) {
      this.camSnap = true;
      // lock the framing to where the blow landed so a long knockback can't drag the shot behind the attacker
      this.finFrame = { ax: att.x, az: att.z, dx: def.x, dz: def.z, dy: def.y };
      this.hitstop = Math.max(this.hitstop, 0.32);
      const cp = def.chestPos();
      this.fx.shock({ x: def.x, y: 0.05, z: def.z }, 0xffffff);
      this.fx.burst(cp, { n: 26, speed: 11, up: 3, color: TYPES[att.type].glow, size: 0.22, life: 0.5, grav: 6 });
      this.fx.spawn({ ...cp, color: 0xffffff, size: 5, life: 0.3, shape: 'burst', grow: 2 });
    }
    sfx.ko();
    sfx.cheer(1.2);
    this.arena.cheer(1);
    this.game.impactFrame(this.finisher ? 0.26 : 0.14);
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
    this.clock = (this.clock || 0) + dt;
    if (this.cutinT > 0 && !this.superUser) this.cutinT = 0;
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
    // modifier chips stay hidden over the intro close-ups (they sat on the rival's face), then show at the countdown
    if (this.modChip) this.modChip.style.visibility = this.phase === 'intro' ? 'hidden' : '';
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
      // modifier chips shrink to small icons once the fight is under way, so they stay out of the action
      if (this.modChip && !this.modMini && this.phaseT > 2.5) { this.modMini = true; this.modChip.classList.add('mini'); }
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
      fill.intensity = THREE.MathUtils.damp(fill.intensity, Math.min(0.65, (this.arena.A.fillI || 0) + 0.25), 3, dt); // just enough to lift the face; more washes the toon colours out under bloom
    } else if (fill) {
      // backlit night/volcano arenas get a soft camera-side fill so faces stay readable
      fill.position.set(this.camera.position.x, this.camera.position.y + 3, this.camera.position.z);
      fill.target.position.set(0, 0.8, 0);
      fill.intensity = this.arena.A.fillI || 0;
    }

    // controls
    const fighting = this.phase === 'fight';
    const inp = this.game.input;
    if (fighting && this.pbrain) { this.pbrain.update(sdt); if (this.training) this.training.update(sdt); else this.brain.update(sdt); }
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
      if (this.training) { this.training.update(sdt); this.training.logInput(inp); } else this.brain.update(sdt);
      if (this.tutorial) this.tutorial.update(sdt);
    } else {
      for (const f of this.fighters) Object.assign(f.ctl, { mx: 0, mz: 0, attack: false, special: false, dodge: false, super: false, guard: false });
    }
    for (const f of this.fighters) { f.perfectT = (f.perfectT || 0) - dt; f.update(sdt); }
    this.updateProjectiles(sdt);
    this.runAnims(sdt);
    this.items.update(sdt);
    this.hazards.update(sdt);
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
    let look, pos, fov = 42, roll = 0;
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
        // low establishing shot that tilts up enough to catch the jumbotron over the far stands
        look = new THREE.Vector3(mid.x, 4.6, mid.z); pos = new THREE.Vector3(mid.x, 3.2, mid.z + 17);
      }
    } else if (this.phase === 'ko' && this.finisher && this.phaseT < 0.75) {
      // finisher: low dutch angle from the side, both fighters in frame
      const a = this.koWinner, F = this.finFrame;
      // follow the loser only a little, so the attacker stays in frame
      const ddx = F.dx + (this.koLoser.x - F.dx) * 0.25, ddz = F.dz + (this.koLoser.z - F.dz) * 0.25;
      const mx = (F.ax + ddx) / 2, mz = (F.az + ddz) / 2, dx = ddx - F.ax, dz = ddz - F.az, len = Math.hypot(dx, dz) || 1;
      const dist = Math.max(3.6, len * 0.95 + 1.8);
      look = new THREE.Vector3(ddx * 0.6 + F.ax * 0.4, F.dy * 0.5 + 0.8, ddz * 0.6 + F.az * 0.4);
      pos = new THREE.Vector3(mx - dz / len * dist, 0.55, mz + dx / len * dist);
      if (pos.z < mz) { pos.x = mx + dz / len * dist; pos.z = mz - dx / len * dist; }
      // swing toward the loser's side for a three-quarter view of the attacker's face
      pos.x += dx / len * dist * 0.45; pos.z += dz / len * dist * 0.45;
      fov = 34; roll = 0.2 * (a.side ? -1 : 1);
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
      // a slightly flatter angle than a top-down view, so each arena's skyline shows above the HUD
      const pitch = 0.3;
      look = new THREE.Vector3(mx, 1.25, mz - 0.4);
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
    this.camRoll = THREE.MathUtils.damp(this.camRoll || 0, roll, 6, dt);
    if (Math.abs(this.camRoll) > 1e-3) cam.rotateZ(this.camRoll);
    // narrow aspect (portrait-ish phones) need a wider fov
    const aspectFix = Math.max(1, 1.6 / cam.aspect);
    cam.fov = Math.min(80, cs.fov * aspectFix);
    cam.updateProjectionMatrix();
  }

  dispose() {
    this.modChip?.remove();
    this.items.clear();
    this.hazards.clear();
    if (this.anims) { for (const fn of this.anims) fn(99); this.anims.length = 0; }
    this.arena.drawScreen();
    this.hud.speedLines(false);
    this.tutorial?.dispose();
    this.training?.dispose();
    for (const f of this.fighters) f.dispose();
    for (let i = this.projectiles.length - 1; i >= 0; i--) this.removeProjectile(i);
    this.fx.clear();
    if (this.arena.fill) this.arena.fill.intensity = 0;
  }
}
