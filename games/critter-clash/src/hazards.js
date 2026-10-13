// Arena hazards: a glowing warning ring appears on the floor, then the arena erupts there.
// Volcano: lava geyser (launches). Frost: falling icicle. Neon: shock tile (brief paralysis). Beach: coconut.
// Hazards never KO (they leave at least 1 HP) and a guard soaks them fully.
import * as THREE from 'three';
import { toon, inked } from './toon.js';
import { sfx } from './audio.js';
import { ARENA_R } from './arena.js';
import { save } from './save.js';

export const HAZARDS = {
  volcano: { name: 'Lava geysers', color: 0xff7a1a, glow: 0xffb040, r: 1.25, warn: 1.3, dmg: 9, lift: 7.5, kb: 2, word: 'HOT!' },
  frost:   { name: 'Falling icicles', color: 0x1f6fe0, solid: true, glow: 0xd8f6ff, r: 1.0, warn: 1.2, dmg: 8, stun: 0.55, kb: 3, word: 'CLONK!' },
  neon:    { name: 'Shock tiles', color: 0xff3fd8, glow: 0x9af4ff, r: 1.3, warn: 1.1, dmg: 6, stun: 0.3, paralyze: 0.6, kb: 1.5, word: 'ZZAP!' },
  beach:   { name: 'Coconuts', color: 0xe0482a, solid: true, glow: 0xfff2c0, r: 0.9, warn: 1.2, dmg: 7, stun: 0.5, kb: 3, word: 'BONK!' },
};

function ringMesh(color, solid) {
  const g = new THREE.Group();
  // bright floors (ice, sand) need a normal-blended ring; dark ones glow additively
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, blending: solid ? THREE.NormalBlending : THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), mat);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 48), mat.clone());
  fill.material.opacity = 0.2;
  for (const m of [ring, fill]) { m.rotation.x = -Math.PI / 2; g.add(m); }
  g.userData = { ring, fill };
  return g;
}

function dropMesh(kind) {
  if (kind === 'frost') {
    const m = inked(new THREE.ConeGeometry(0.22, 1.1, 8), toon(0xbfeeff, { rim: 0.9 }), 0.02);
    m.rotation.x = Math.PI; // point down
    return m;
  }
  const g = new THREE.Group();
  const nut = inked(new THREE.SphereGeometry(0.3, 18, 14), toon(0x7a4a26), 0.02);
  nut.scale.set(1, 0.9, 1);
  g.add(nut);
  for (let i = 0; i < 3; i++) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0x3a2312 }));
    const a = i * 0.5 - 0.5;
    eye.position.set(Math.sin(a) * 0.29, 0.12, Math.cos(a) * 0.29 * 0.9);
    g.add(eye);
  }
  return g;
}

export class Hazards {
  constructor(battle) {
    this.b = battle;
    this.list = [];
    this.H = HAZARDS[battle.arena.key];
    this.timer = 10;
  }

  // is this spot inside a live warning ring? (the CPU uses it to step out)
  danger(x, z) {
    for (const h of this.list) if (!h.fired && Math.hypot(x - h.x, z - h.z) < this.H.r + 0.4) return h;
    return null;
  }

  spawn() {
    const B = this.b, H = this.H;
    // aim near one of the fighters so it matters, but not right on top of them
    const f = B.fighters[Math.random() < 0.5 ? 0 : 1];
    const a = Math.random() * Math.PI * 2, d = 0.6 + Math.random() * 1.6;
    let x = f.x + Math.cos(a) * d, z = f.z + Math.sin(a) * d;
    const r = Math.hypot(x, z), lim = ARENA_R - 1.6;
    if (r > lim) { x *= lim / r; z *= lim / r; }
    const mesh = ringMesh(H.color, H.solid);
    mesh.position.set(x, 0.035, z);
    mesh.scale.setScalar(H.r);
    B.scene.add(mesh);
    const h = { x, z, t: 0, fired: false, mesh };
    if (B.arena.key === 'frost' || B.arena.key === 'beach') {
      h.drop = dropMesh(B.arena.key);
      h.drop.position.set(x, 9, z);
      B.scene.add(h.drop);
    }
    this.list.push(h);
    B.stats.hazardsSeen = (B.stats.hazardsSeen || 0) + 1;
    if (!this.warned) { this.warned = true; B.fx.text({ x, y: 1.4, z }, 'WATCH OUT!', 'eff', 1.1); }
    sfx.ui('move');
  }

  update(dt) {
    // off in the meadow, in training, and when switched off in Settings
    if (!this.H || this.b.training || save.settings.hazards === false) return;
    const B = this.b, H = this.H;
    if (B.phase === 'fight' && B.time > 8) {
      this.timer -= dt;
      if (this.timer <= 0 && this.list.length < 2) {
        this.timer = 6.5 + Math.random() * 4.5;
        this.spawn();
      }
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const h = this.list[i];
      h.t += dt;
      const k = Math.min(1, h.t / H.warn);
      const { ring, fill } = h.mesh.userData;
      if (!h.fired) {
        // ring tightens and blinks faster as it's about to go
        const pulse = 0.5 + 0.5 * Math.sin(h.t * (8 + k * 22));
        ring.material.opacity = 0.45 + pulse * 0.5;
        fill.material.opacity = 0.1 + k * 0.25;
        h.mesh.scale.setScalar(H.r * (1.25 - k * 0.25));
        if (Math.random() < dt * 14) B.fx.spawn({ x: h.x + (Math.random() - 0.5) * H.r * 1.6, y: 0.1, z: h.z + (Math.random() - 0.5) * H.r * 1.6, vy: 1.2, color: H.glow, size: 0.16, life: 0.5, shape: B.arena.key === 'neon' ? 'spark' : 'glow' });
        if (h.drop) { const f = Math.max(0, 1 - k); h.drop.position.y = 0.4 + f * f * 9; h.drop.rotation.y += dt * 3; }
        if (k >= 1) this.fire(h);
      } else {
        const e = (h.t - H.warn) / 0.5;
        ring.material.opacity = Math.max(0, 0.9 * (1 - e));
        fill.material.opacity = Math.max(0, 0.4 * (1 - e));
        h.mesh.scale.setScalar(H.r * (1 + e * 0.3));
        if (h.drop) { h.drop.scale.setScalar(Math.max(0.01, 1 - e)); }
        if (B.arena.key === 'volcano' && e < 0.8) B.fx.spawn({ x: h.x + (Math.random() - 0.5) * 0.7, y: 0.2, z: h.z + (Math.random() - 0.5) * 0.7, vy: 9 + Math.random() * 4, color: Math.random() < 0.5 ? 0xff7a1a : 0xffd040, size: 0.5, life: 0.5, shape: 'puff', grav: 9, grow: 1 });
        if (e >= 1) this.remove(i);
      }
    }
  }

  fire(h) {
    const B = this.b, H = this.H, key = B.arena.key;
    h.fired = true;
    const p = { x: h.x, y: 0.3, z: h.z };
    B.fx.shock({ x: h.x, y: 0.05, z: h.z }, H.color, H.r * 2, 0.35);
    if (key === 'volcano') {
      B.fx.burst({ x: h.x, y: 0.4, z: h.z }, { n: 20, speed: 3, up: 10, color: 0xff9a2a, size: 0.4, life: 0.7, shape: 'puff', grav: 10 });
      sfx.boom();
    } else if (key === 'frost') {
      B.fx.burst(p, { n: 16, speed: 5, up: 3, color: 0xd8f6ff, size: 0.22, life: 0.5, shape: 'star', additive: false, grav: 8 });
      sfx.bonk();
    } else if (key === 'neon') {
      for (let k = 0; k < 6; k++) B.fx.spawn({ x: h.x + (Math.random() - 0.5) * H.r * 1.4, y: 0.6 + Math.random() * 0.8, z: h.z + (Math.random() - 0.5) * H.r * 1.4, color: H.glow, size: 1.1, life: 0.22, shape: 'bolt', rot: Math.random() * 6 });
      sfx.spark();
    } else {
      B.fx.burst(p, { n: 12, speed: 4, up: 3, color: 0xfff2c0, size: 0.25, life: 0.5, shape: 'puff', additive: false, grav: 6 });
      sfx.bonk();
    }
    B.shake(0.25);
    for (const f of B.fighters) {
      if (!f.alive || f.invuln > 0 || f.state === 'down' || f.state === 'super' || f.state === 'launched') continue;
      const dx = f.x - h.x, dz = f.z - h.z, d = Math.hypot(dx, dz);
      if (d > H.r + 0.25) continue;
      if (f.state === 'guard') { f.shield.userData.flash = 1; B.fx.text(f.headPos(), 'BLOCK', '', 0.5); continue; }
      const dirX = d > 0.05 ? dx / d : Math.random() - 0.5, dirZ = d > 0.05 ? dz / d : 0.5;
      const dmg = Math.min(H.dmg, f.hp - 1);
      f.takeHit({ dmg: Math.max(0, dmg), kb: H.kb, dirX, dirZ, stun: H.stun || 0.4, lift: H.lift || 0, launch: !!H.lift, paralyze: H.paralyze });
      f.dmgDelay = 0.3;
      if (f === B.player) { B.roundDmgTaken += Math.max(0, dmg); B.stats.hazardHits = (B.stats.hazardHits || 0) + 1; }
      const hp = f.headPos();
      B.fx.text({ x: hp.x, y: hp.y + 0.3, z: hp.z }, H.word, 'big', 0.8);
      B.fx.text({ x: hp.x, y: hp.y - 0.1, z: hp.z }, String(Math.max(0, dmg)), 'dmg', 0.7);
      B.arena.cheer(0.4);
    }
  }

  remove(i) {
    const h = this.list[i];
    const { ring, fill } = h.mesh.userData;
    ring.material.dispose(); fill.material.dispose();
    // toon materials are shared from a cache, so only geometry is freed here
    for (const m of [h.mesh, h.drop]) {
      if (!m) continue;
      this.b.scene.remove(m);
      m.traverse((o) => o.geometry?.dispose());
    }
    this.list.splice(i, 1);
  }

  clear() { for (let i = this.list.length - 1; i >= 0; i--) this.remove(i); this.timer = 10; }
}
