// Arena power-ups that drop in mid-round: berry (heal), star (super meter), shoe (speed burst).
// R826: the Amber Sands add two of their own on the desert arenas and in sandstorms: a water flask (a sip of HP, puts out a burn and clears the head) and a golden scarab (a shield that eats the next blow).
import * as THREE from 'three';
import { toon, inked } from './toon.js';
import { sfx } from './audio.js';
import { ARENA_R } from './arena.js';

const KINDS = {
  berry: { glow: 0xff5a8a, label: 'YUM! +HP' },
  star:  { glow: 0xffd23f, label: 'SUPER UP!' },
  shoe:  { glow: 0x5ad8ff, label: 'SPEED UP!' },
  flask: { glow: 0x4fe6ff, label: 'COOL WATER!' },
  scarab: { glow: 0xffc23a, label: 'SCARAB SHIELD!' },
  glowcap: { glow: 0x5affe0, label: 'GLOWCAP!' },
};
const DESERT = new Set(['oasis', 'canyon', 'saltflat', 'dunes', 'mesa', 'singing']); // (R888: + Redrock Mesa; R895: + the Singing Dunes)
// R846: the Sunwell Grotto grows its own: a glowcap mushroom (a bite of HP, and its glow shows where the cave drips: hazards miss you for 10 s)
const CAVE = new Set(['grotto']);

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
  } else if (kind === 'flask') {
    // a round canteen: a flat blue-teal water bottle with a cork and a leather strap
    const body = inked(new THREE.CylinderGeometry(0.26, 0.26, 0.16, 24), toon(0x2fb8d8), 0.02);
    body.rotation.x = Math.PI / 2; g.add(body);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 8, 28), toon(0xc8873a));
    g.add(band);
    const neck = inked(new THREE.CylinderGeometry(0.06, 0.08, 0.12, 12), toon(0x2fb8d8), 0.015);
    neck.position.y = 0.3; g.add(neck);
    const cork = inked(new THREE.CylinderGeometry(0.07, 0.06, 0.08, 12), toon(0xb07a45), 0.015);
    cork.position.y = 0.39; g.add(cork);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    shine.position.set(-0.1, 0.1, 0.08); g.add(shine);
  } else if (kind === 'scarab') {
    // a golden scarab: a domed shell split down the middle, a little head, six legs
    const shell = inked(new THREE.SphereGeometry(0.26, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xffbf2a), 0.02);
    shell.scale.set(0.85, 0.75, 1.1); g.add(shell);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.2, 0.56), toon(0x8a5a10));
    seam.position.y = 0.09; g.add(seam);
    const head = inked(new THREE.SphereGeometry(0.11, 12, 10), toon(0x5a3a10), 0.015);
    head.position.set(0, 0.03, 0.3); head.scale.set(1, 0.7, 0.8); g.add(head);
    for (let i = 0; i < 6; i++) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), toon(0x5a3a10));
      const sd = i % 2 ? 1 : -1, row = Math.floor(i / 2) - 1;
      leg.position.set(sd * 0.25, 0, row * 0.15); leg.rotation.y = row * sd * 0.4; g.add(leg);
    }
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
    shine.position.set(-0.08, 0.17, -0.05); g.add(shine);
    g.position.y = -0.08;
  } else if (kind === 'glowcap') {
    // a glowcap: a pale stalk under a domed, glowing teal cap with cream spots
    const stalk = inked(new THREE.CylinderGeometry(0.08, 0.11, 0.3, 12), toon(0xf2ead2), 0.015);
    stalk.position.y = -0.05; g.add(stalk);
    const capM = new THREE.MeshBasicMaterial({ color: 0x4ff0d6 });
    const cap = inked(new THREE.SphereGeometry(0.27, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), capM, 0.02);
    cap.scale.set(1, 0.72, 1); cap.position.y = 0.08; g.add(cap);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 6, 24), new THREE.MeshBasicMaterial({ color: 0x2fb8a8 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.08; g.add(rim);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26, up = i % 2 ? 0.55 : 0.85;
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfffbe0 }));
      sp.position.set(Math.cos(a) * 0.27 * Math.sin(up), 0.08 + 0.195 * Math.cos(up), Math.sin(a) * 0.27 * Math.sin(up)); g.add(sp);
    }
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 10), new THREE.MeshBasicMaterial({ color: 0x5affe0, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.y = 0.1; g.add(halo);
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
  if (kind === 'flask' || kind === 'scarab' || kind === 'glowcap') g.scale.setScalar(1.4); // (the desert two read small next to Lv 30 fighters)
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
    this.shields = [];
    this.glows = [];
    this.cave = CAVE.has(battle.arena?.key);
    this.aqua = battle.arena?.key === 'aqueduct'; // R872: the Old Aqueduct's cistern hall: water flasks (sluice water's cool and clean)
    this.desert = DESERT.has(battle.arena?.key) || !!battle.env?.sand;
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
        // out in the Amber Sands, about one drop in three is a desert one
        if (this.cave && Math.random() < 0.34) this.spawn('glowcap'); // down in the grotto, about one in three is a glowcap
        else if (this.aqua && Math.random() < 0.3) this.spawn('flask');
        else if (this.desert && Math.random() < 0.34) this.spawn(behind && Math.random() < 0.6 ? 'flask' : Math.random() < 0.5 ? 'flask' : 'scarab');
        else this.spawn(behind && r < 0.5 ? 'berry' : r < 0.4 ? 'berry' : r < 0.72 ? 'star' : 'shoe');
      }
    }
    for (let i = this.shields.length - 1; i >= 0; i--) {
      const sh = this.shields[i], f = sh.f;
      sh.t += dt;
      if (!(f.scarab > 0) || !f.alive) { this.dropShield(i); continue; }
      f.scarab -= dt;
      const left = f.scarab;
      sh.mesh.position.set(f.x, f.y + 0.75 * (f.def.size || 1), f.z);
      sh.mesh.rotation.y += dt * 1.4;
      const blink = left < 2 ? (Math.sin(sh.t * 18) > 0 ? 1 : 0.3) : 1;
      sh.mesh.material.opacity = (0.18 + Math.sin(sh.t * 5) * 0.05) * blink; sh.mesh.children[0].material.opacity = 0.75 * blink;
      if (Math.random() < dt * 5) B.fx.spawn({ x: f.x + (Math.random() - 0.5) * 1.4, y: f.y + 0.4 + Math.random() * 1.2, z: f.z + (Math.random() - 0.5) * 1.4, vy: 0.6, color: 0xffd36a, size: 0.14, life: 0.5, shape: 'star', additive: false });
    }
    for (let i = this.glows.length - 1; i >= 0; i--) { // a glowcap's light bobs over its fighter's head, blinking out in its last 2 s
      const gl = this.glows[i], f = gl.f;
      gl.t += dt;
      if (!(f.glowcap > 0) || !f.alive) { this.dropGlow(i); continue; }
      f.glowcap -= dt;
      const blink = f.glowcap < 2 ? (Math.sin(gl.t * 18) > 0 ? 1 : 0.3) : 1, hp = f.headPos();
      gl.mesh.position.set(f.x + Math.cos(gl.t * 2.4) * 0.7, hp.y + 0.1 + Math.sin(gl.t * 3.1) * 0.12, f.z + Math.sin(gl.t * 2.4) * 0.7);
      gl.mesh.material.opacity = 0.95 * blink; gl.mesh.children[0].material.opacity = (0.3 + Math.sin(gl.t * 6) * 0.08) * blink;
      if (Math.random() < dt * 4) B.fx.spawn({ x: f.x + (Math.random() - 0.5) * 1.2, y: f.y + 0.3 + Math.random() * 1.1, z: f.z + (Math.random() - 0.5) * 1.2, vy: 0.5, color: 0x8affea, size: 0.12, life: 0.6, shape: 'star', additive: false });
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
    } else if (it.kind === 'flask') {
      const heal = Math.round(f.maxHp * 0.08);
      f.hp = Math.min(f.maxHp, f.hp + heal);
      f.dmgTrail = Math.max(f.dmgTrail, f.hp);
      f.burnT = 0; f.dizzy = 0;
      B.fx.text({ x: hp.x, y: hp.y, z: hp.z }, '+' + heal, 'heal', 0.9);
      B.fx.burst({ x: f.x, y: hp.y, z: f.z }, { n: 14, speed: 2.5, up: 4, color: 0x8ff0ff, size: 0.2, life: 0.7, grav: 9 });
    } else if (it.kind === 'scarab') {
      f.scarab = 10;
      if (!this.shields.some((s) => s.f === f)) {
        // a gold shell: a see-through amber bubble with a brighter gold lattice over it, like a scarab's wing case
        const geo = new THREE.IcosahedronGeometry(1.05 * (f.def.size || 1), 1);
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.2, depthWrite: false }));
        mesh.add(new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.85 })));
        mesh.scale.set(1.1, 1, 1.1);
        this.b.scene.add(mesh);
        this.shields.push({ f, mesh, t: 0 });
      }
    } else if (it.kind === 'glowcap') {
      const heal = Math.round(f.maxHp * 0.06);
      f.hp = Math.min(f.maxHp, f.hp + heal);
      f.dmgTrail = Math.max(f.dmgTrail, f.hp);
      f.glowcap = 10;
      B.fx.text({ x: hp.x, y: hp.y, z: hp.z }, '+' + heal, 'heal', 0.9);
      if (!this.glows.some((q) => q.f === f)) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshBasicMaterial({ color: 0xc8fff4, transparent: true, opacity: 0.95, depthWrite: false }));
        mesh.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), new THREE.MeshBasicMaterial({ color: 0x1fd8b8, transparent: true, opacity: 0.3, depthWrite: false })));
        this.b.scene.add(mesh);
        this.glows.push({ f, mesh, t: 0 });
      }
    } else {
      f.speedBoost = 6;
    }
    B.fx.text({ x: hp.x, y: hp.y + 0.5, z: hp.z }, KINDS[it.kind].label, 'eff', 0.9);
    B.fx.burst({ x: it.x, y: 0.7, z: it.z }, { n: 16, speed: 4, up: 3, color: KINDS[it.kind].glow, size: 0.25, life: 0.6, shape: 'star', additive: false, grav: 6, spin: 10 });
    B.fx.spawn({ x: f.x, y: 0.8, z: f.z, color: KINDS[it.kind].glow, size: 2.4, life: 0.3, shape: 'ring', grow: 1.5 });
    f.critter.emote('happy', 'open', 0.6);
    sfx.pickup();
  }

  // a blow lands on a scarab shield: it shatters and the hit is gone (Battle.applyHit asks first)
  shieldHit(def) {
    if (!(def.scarab > 0)) return false;
    def.scarab = 0;
    const B = this.b, cp = def.chestPos();
    B.fx.text(def.headPos(), 'SHIELDED!', 'big', 0.9);
    B.fx.burst(cp, { n: 22, speed: 6, up: 3, color: 0xffc23a, size: 0.26, life: 0.6, shape: 'star', additive: false, grav: 7, spin: 10 });
    B.fx.spawn({ ...cp, color: 0xffd36a, size: 3, life: 0.25, shape: 'ring', grow: 1.6 });
    sfx.block?.();
    B.hitstop = Math.max(B.hitstop, 0.08);
    return true;
  }

  dropShield(i) {
    const sh = this.shields[i];
    this.b.scene.remove(sh.mesh);
    sh.mesh.geometry.dispose(); sh.mesh.material.dispose(); sh.mesh.children[0].geometry.dispose(); sh.mesh.children[0].material.dispose();
    this.shields.splice(i, 1);
  }

  dropGlow(i) {
    const gl = this.glows[i];
    this.b.scene.remove(gl.mesh);
    gl.mesh.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
    this.glows.splice(i, 1);
  }

  remove(i) {
    const it = this.list[i];
    this.b.scene.remove(it.mesh);
    it.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.list.splice(i, 1);
  }

  clear() {
    for (let i = this.list.length - 1; i >= 0; i--) this.remove(i);
    for (let i = this.shields.length - 1; i >= 0; i--) { this.shields[i].f.scarab = 0; this.dropShield(i); }
    for (let i = this.glows.length - 1; i >= 0; i--) { this.glows[i].f.glowcap = 0; this.dropGlow(i); }
    this.timer = 9 + Math.random() * 4;
  }
}
