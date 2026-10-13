// Arena power-ups that drop in mid-round: berry (heal), star (super meter), shoe (speed burst).
import * as THREE from 'three';
import { toon, inked } from './toon.js';
import { sfx } from './audio.js';
import { ARENA_R } from './arena.js';

const KINDS = {
  berry: { glow: 0xff5a8a, label: 'YUM! +HP' },
  star:  { glow: 0xffd23f, label: 'SUPER UP!' },
  shoe:  { glow: 0x5ad8ff, label: 'SPEED UP!' },
};

function buildMesh(kind) {
  const g = new THREE.Group();
  if (kind === 'berry') {
    const b = inked(new THREE.SphereGeometry(0.26, 24, 16), toon(0xff3f6c), 0.02);
    b.scale.set(1, 0.92, 1);
    g.add(b);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    shine.position.set(-0.1, 0.1, 0.18); g.add(shine);
    for (let i = 0; i < 3; i++) {
      const leaf = inked(new THREE.SphereGeometry(0.1, 10, 8), toon(0x4fd35a), 0.015);
      leaf.scale.set(1, 0.35, 0.5);
      leaf.position.set(Math.cos(i * 2.1) * 0.08, 0.26, Math.sin(i * 2.1) * 0.08);
      leaf.rotation.y = -i * 2.1;
      g.add(leaf);
    }
  } else if (kind === 'star') {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.14 : 0.32, a = i / 10 * Math.PI * 2 + Math.PI / 2;
      i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 });
    geo.center();
    g.add(inked(geo, toon(0xffd23f), 0.02));
  } else {
    const body = inked(new THREE.CapsuleGeometry(0.13, 0.22, 6, 14), toon(0x3d9bff), 0.02);
    body.rotation.z = Math.PI / 2; body.scale.set(1, 1, 0.85);
    g.add(body);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.24), toon(0xffffff));
    sole.position.y = -0.12; g.add(sole);
    for (let i = 0; i < 2; i++) {
      const w = inked(new THREE.SphereGeometry(0.09, 10, 8), toon(0xffffff), 0.015);
      w.scale.set(0.4, 1, 1.2); w.position.set(-0.12, 0.08, (i ? 1 : -1) * 0.13); w.rotation.x = (i ? 1 : -1) * 0.5;
      g.add(w);
    }
  }
  // soft glow disc underneath
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshBasicMaterial({ color: KINDS[kind].glow, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  disc.rotation.x = -Math.PI / 2;
  disc.userData.disc = true;
  const root = new THREE.Group();
  root.add(g, disc);
  root.userData.model = g;
  root.userData.disc = disc;
  return root;
}

export class Items {
  constructor(battle) {
    this.b = battle;
    this.list = [];
    this.timer = 9 + Math.random() * 4;
  }

  nearest(f) {
    let best = null;
    for (const it of this.list) {
      if (it.t < 0.6) continue;
      const d = Math.hypot(it.x - f.x, it.z - f.z);
      if (!best || d < best.d) best = { x: it.x, z: it.z, d };
    }
    return best;
  }

  spawn(kind) {
    const [p, c] = this.b.fighters;
    // land somewhere fair: away from the walls, roughly between the two fighters
    const mx = (p.x + c.x) / 2, mz = (p.z + c.z) / 2;
    let x = mx + (Math.random() - 0.5) * 5, z = mz + (Math.random() - 0.5) * 4;
    const r = Math.hypot(x, z), lim = ARENA_R - 2;
    if (r > lim) { x *= lim / r; z *= lim / r; }
    const it = { kind, x, z, t: 0, mesh: buildMesh(kind) };
    it.mesh.position.set(x, 6, z);
    this.b.scene.add(it.mesh);
    this.list.push(it);
    this.b.fx.burst({ x, y: 0.2, z }, { n: 10, speed: 3, up: 3, color: KINDS[kind].glow, size: 0.3, life: 0.6, shape: 'star', additive: false, grav: 6, spin: 8 });
  }

  update(dt) {
    const B = this.b;
    if (B.phase === 'fight' && B.time > 6) {
      this.timer -= dt;
      const rain = B.mods.has('itemrain');
      if (this.timer <= 0 && this.list.length < (rain ? 4 : 2)) {
        this.timer = rain ? 3.5 + Math.random() * 2 : 11 + Math.random() * 6;
        const [p, c] = B.fighters;
        // whoever is behind is a little more likely to see a berry
        const behind = Math.min(p.hp / p.maxHp, c.hp / c.maxHp) < 0.5;
        const r = Math.random();
        this.spawn(behind && r < 0.5 ? 'berry' : r < 0.4 ? 'berry' : r < 0.72 ? 'star' : 'shoe');
      }
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const it = this.list[i];
      it.t += dt;
      const fall = Math.max(0, 1 - it.t / 0.6);
      const y = 0.55 + fall * fall * 6 + Math.sin(it.t * 3) * 0.08;
      it.mesh.position.set(it.x, y, it.z);
      it.mesh.userData.model.rotation.y += dt * 2.2;
      it.mesh.userData.disc.position.y = -y + 0.03;
      it.mesh.userData.disc.material.opacity = 0.25 + Math.sin(it.t * 6) * 0.1;
      if (it.t > 0.6 && Math.random() < dt * 6) B.fx.spawn({ x: it.x + (Math.random() - 0.5) * 0.6, y: y + (Math.random() - 0.2) * 0.4, z: it.z + (Math.random() - 0.5) * 0.6, vy: 0.8, color: KINDS[it.kind].glow, size: 0.18, life: 0.6, shape: 'star', additive: false });
      // blink out after a while
      if (it.t > 12) it.mesh.visible = Math.sin(it.t * 20) > 0;
      if (it.t > 14) { this.remove(i); continue; }
      if (it.t < 0.6) continue;
      for (const f of B.fighters) {
        if (!f.alive || f.state === 'launched' || f.state === 'down') continue;
        if (Math.hypot(f.x - it.x, f.z - it.z) < 0.85) { this.collect(f, it); this.remove(i); break; }
      }
    }
  }

  collect(f, it) {
    const B = this.b, hp = f.headPos();
    if (it.kind === 'berry') {
      const heal = Math.round(f.maxHp * 0.14);
      f.hp = Math.min(f.maxHp, f.hp + heal);
      f.dmgTrail = Math.max(f.dmgTrail, f.hp);
      B.fx.text({ x: hp.x, y: hp.y, z: hp.z }, '+' + heal, 'heal', 0.9);
    } else if (it.kind === 'star') {
      f.superM = Math.min(100, f.superM + 40);
    } else {
      f.speedBoost = 6;
    }
    B.fx.text({ x: hp.x, y: hp.y + 0.5, z: hp.z }, KINDS[it.kind].label, 'eff', 0.9);
    B.fx.burst({ x: it.x, y: 0.7, z: it.z }, { n: 16, speed: 4, up: 3, color: KINDS[it.kind].glow, size: 0.25, life: 0.6, shape: 'star', additive: false, grav: 6, spin: 10 });
    B.fx.spawn({ x: f.x, y: 0.8, z: f.z, color: KINDS[it.kind].glow, size: 2.4, life: 0.3, shape: 'ring', grow: 1.5 });
    f.critter.emote('happy', 'open', 0.6);
    sfx.pickup();
  }

  remove(i) {
    const it = this.list[i];
    this.b.scene.remove(it.mesh);
    it.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.list.splice(i, 1);
  }

  clear() { for (let i = this.list.length - 1; i >= 0; i--) this.remove(i); this.timer = 9 + Math.random() * 4; }
}
