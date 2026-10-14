// Arena hazards: a glowing warning ring appears on the floor, then the arena erupts there.
// Volcano: lava geyser (launches). Frost: falling icicle. Neon: shock tile (brief paralysis). Beach: coconut.
// Sky: updraft (launches, gently). Grove: spore puff (fills the dizzy meter).
// Each arena also has a second, signature pattern (SIGS): a fissure of geysers, an ice slick,
// a sweeping laser, a rogue wave, a crosswind, a lingering spore cloud.
// Hazards never KO (they leave at least 1 HP) and a guard soaks them fully.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, inked, canvasTex } from './toon.js';
import { sfx } from './audio.js';
import { ARENA_R } from './arena.js';
import { save } from './save.js';

export const HAZARDS = {
  volcano: { name: 'Lava geysers', color: 0xff7a1a, glow: 0xffb040, r: 1.25, warn: 1.3, dmg: 9, lift: 7.5, kb: 2, word: 'HOT!' },
  frost:   { name: 'Falling icicles', color: 0x1f6fe0, solid: true, glow: 0xd8f6ff, r: 1.0, warn: 1.2, dmg: 8, stun: 0.55, kb: 3, word: 'CLONK!' },
  neon:    { name: 'Shock tiles', color: 0xff3fd8, glow: 0x9af4ff, r: 1.3, warn: 1.1, dmg: 6, stun: 0.3, paralyze: 0.6, kb: 1.5, word: 'ZZAP!' },
  sky:     { name: 'Updrafts', color: 0x4aa8ff, solid: true, glow: 0xffffff, r: 1.2, warn: 1.3, dmg: 6, lift: 9, kb: 1, word: 'WHOOSH!' },
  grove:   { name: 'Spore puffs', color: 0x9adf4a, solid: true, glow: 0xe8ffa0, r: 1.3, warn: 1.2, dmg: 5, stun: 0.5, kb: 1, dizzy: 45, word: 'ACHOO!' },
  beach:   { name: 'Coconuts', color: 0xe0482a, solid: true, glow: 0xfff2c0, r: 0.9, warn: 1.2, dmg: 7, stun: 0.5, kb: 3, word: 'BONK!' },
};

export const SIGS = {
  volcano: { name: 'Fissures', word: 'FISSURE!', jumbo: 'FISSURE!', tip: 'Fissure! Get off the crack!' },
  frost:   { name: 'Ice slicks', word: 'SLIPPY!', jumbo: 'ICE SLICK!', tip: 'Ice slick! Slippery footing!' },
  neon:    { name: 'Laser sweeps', word: 'LASER!', jumbo: 'LASER!', tip: 'Laser! Guard or roll through it!' },
  beach:   { name: 'Rogue waves', word: 'SPLASH!', jumbo: 'ROGUE WAVE!', tip: 'Rogue wave! Step out of its lane!' },
  sky:     { name: 'Crosswinds', word: 'GUST!', jumbo: 'CROSSWIND!', tip: 'Crosswind! Hold your ground!' },
  grove:   { name: 'Spore clouds', word: 'ACHOO!', jumbo: 'SPORES!', tip: "Spore cloud! Don't breathe it in!" },
};

// shared art for the ice slick (made once, never disposed)
let iceTex;
const getIceTex = () => iceTex ||= canvasTex(256, 64, (c, w, h) => {
  c.fillStyle = '#e4f8ff'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    c.strokeStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`; c.lineWidth = 1 + Math.random() * 2;
    const x = Math.random() * w, y = Math.random() * h;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + 20 + Math.random() * 50, y + (Math.random() - 0.5) * 8); c.stroke();
  }
  c.fillStyle = 'rgba(120,200,255,0.35)'; c.fillRect(0, 0, w, 5); c.fillRect(0, h - 5, w, 5);
}, { repeat: [5, 1] });

function bandMesh(len, wid, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, wid), mat);
  m.rotation.x = -Math.PI / 2;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

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
    this.S = SIGS[battle.arena.key];
    this.sig = null;
    this.timer = 10;
  }

  // is this spot inside a live warning ring? (the CPU uses it to step out)
  // Returns something with x/z to walk away from and t (how long it has been warning).
  danger(x, z) {
    for (const h of this.list) if (!h.fired && h.t >= 0 && Math.hypot(x - h.x, z - h.z) < this.H.r + 0.4) return h;
    const s = this.sig;
    if (!s) return null;
    if (s.kind === 'grove' && Math.hypot(x - s.x, z - s.z) < s.r + 0.4) return s;
    if (s.kind === 'beach' && !s.passed) {
      // in the wave's lane and not yet behind it: sidestep out of the lane
      const along = (x - s.cx) * s.dx + (z - s.cz) * s.dz, side = (x - s.cx) * -s.dz + (z - s.cz) * s.dx;
      if (Math.abs(side) < s.half + 0.5 && along > s.pos - 0.8) return { x: s.cx + -s.dz * (side - Math.sign(side || 1)), z: s.cz + s.dx * (side - Math.sign(side || 1)), t: s.t };
    }
    if (s.kind === 'frost' && s.t < s.warn + s.dur - 0.5) {
      const side = (x - s.cx) * -s.dz + (z - s.cz) * s.dx;
      if (Math.abs(side) < s.half + 0.3) return { x: s.cx + -s.dz * (side - Math.sign(side || 1)), z: s.cz + s.dx * (side - Math.sign(side || 1)), t: s.t };
    }
    return null;
  }

  // the laser can't be outrun, only guarded or dodged: true just before the beam reaches f
  incoming(f) {
    const s = this.sig;
    if (!s || s.kind !== 'neon' || s.t < s.warn - 0.25 || s.hit.has(f)) return false;
    const fa = Math.atan2(f.z, f.x), a = s.ang;
    // angle the beam still has to turn (the beam is a full line, so it also arrives from the other side)
    let da = ((fa - a) * s.dir) % Math.PI; if (da < 0) da += Math.PI;
    return da / s.speed < 0.3 || Math.hypot(f.x, f.z) < 1;
  }

  spawn() {
    const B = this.b;
    // aim near one of the fighters so it matters, but not right on top of them
    const f = B.fighters[Math.random() < 0.5 ? 0 : 1];
    const a = Math.random() * Math.PI * 2, d = 0.6 + Math.random() * 1.6;
    this.spawnAt(f.x + Math.cos(a) * d, f.z + Math.sin(a) * d);
  }

  // boss storm: a staggered row of rings sweeps across the player's path
  volley() {
    const B = this.b, p = B.player, o = B.cpu;
    const ax = p.x - o.x, az = p.z - o.z, al = Math.hypot(ax, az) || 1;
    // row runs across the line between the fighters, centred a step behind the player
    const nx = -az / al, nz = ax / al, cx = p.x + ax / al * 0.8, cz = p.z + az / al * 0.8;
    const side = Math.random() < 0.5 ? -1 : 1, gap = this.H.r * 1.9;
    for (let k = 0; k < 3; k++) this.spawnAt(cx + nx * (k - 1) * gap * side, cz + nz * (k - 1) * gap * side, -k * 0.35, k > 0);
  }

  // the arena picks on one fighter: rings land on them one after another, so standing still is a bad idea
  chase() {
    const B = this.b, f = B.fighters[Math.random() < 0.5 ? 0 : 1];
    for (let k = 0; k < 3; k++) this.spawnAt(f.x, f.z, -k * 0.85, k > 0, f);
    const hp = f.headPos();
    B.fx.text({ x: hp.x, y: hp.y + 0.4, z: hp.z }, 'RUN!', 'eff', 0.9);
  }

  // ---------- the arena's signature pattern ----------
  signature() {
    const B = this.b, key = B.arena.key;
    const f = B.fighters[Math.random() < 0.5 ? 0 : 1];
    const ang = Math.random() * Math.PI * 2, dx = Math.cos(ang), dz = Math.sin(ang);
    const sg = { kind: key, t: 0, meshes: [], mats: [], hit: new Set() };
    const add = (m) => { B.scene.add(m); sg.meshes.push(m); m.traverse((o) => o.material && !sg.mats.includes(o.material) && o.material.userData.own && sg.mats.push(o.material)); return m; };
    const own = (m) => { m.userData.own = true; return m; };
    const hp = f.headPos();
    if (key === 'volcano') {
      // a crack opens across the floor through one fighter, then erupts end to end
      sg.warn = 0; sg.dur = 2.6;
      const n = 5, gap = this.H.r * 1.8, cx = f.x, cz = f.z, off = (Math.random() - 0.5) * gap;
      const crack = add(bandMesh(gap * (n - 1) + 1.2, 0.28, own(new THREE.MeshBasicMaterial({ color: 0xff6a10, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }))));
      crack.position.set(cx + dx * off, 0.04, cz + dz * off); crack.rotation.y = -ang;
      sg.crack = crack;
      for (let k = 0; k < n; k++) { const a = (k - (n - 1) / 2) * gap + off; this.spawnAt(cx + dx * a, cz + dz * a, -0.5 - k * 0.24, k > 0); }
      B.fx.text({ x: hp.x, y: hp.y + 0.4, z: hp.z }, 'FISSURE!', 'eff', 1);
      sfx.rumble();
    } else if (key === 'frost') {
      // a strip of the floor glazes over: footing there turns slippery for a while
      sg.warn = 1.3; sg.dur = 6; sg.half = 1.3;
      const along = Math.random() * 1.2 - 0.6;
      sg.cx = f.x + -dz * along; sg.cz = f.z + dx * along;
      // the strip runs along (dx, dz) through (cx, cz); centre it on the arena line through that point
      const t0 = sg.cx * dx + sg.cz * dz; sg.cx -= dx * t0; sg.cz -= dz * t0;
      sg.dx = dx; sg.dz = dz;
      const len = 2 * Math.sqrt(Math.max(4, ARENA_R * ARENA_R - (sg.cx * sg.cx + sg.cz * sg.cz)));
      sg.mat = own(new THREE.MeshBasicMaterial({ map: getIceTex(), transparent: true, opacity: 0, depthWrite: false }));
      const band = add(bandMesh(len, sg.half * 2, sg.mat));
      band.position.set(sg.cx, 0.03, sg.cz); band.rotation.y = -ang;
      // crisp blue edges so the strip reads from the low fight camera on a white floor
      sg.edgeMat = own(new THREE.MeshBasicMaterial({ color: 0x3a9cff, transparent: true, opacity: 0, depthWrite: false }));
      for (const sd of [-1, 1]) { const ed = add(bandMesh(len, 0.12, sg.edgeMat)); ed.position.set(sg.cx - dz * sg.half * sd, 0.035, sg.cz + dx * sg.half * sd); ed.rotation.y = -ang; }
      sg.len = len;
      sfx.warn();
    } else if (key === 'neon') {
      // a laser line through the centre of the roof, then it sweeps half a turn
      sg.warn = 1.3; sg.dur = 3.2; sg.ang = Math.atan2(f.z, f.x) + (Math.random() < 0.5 ? 1 : -1) * (0.9 + Math.random() * 0.6);
      sg.dir = Math.random() < 0.5 ? 1 : -1; sg.speed = Math.PI / sg.dur;
      const L = ARENA_R * 2;
      sg.line = own(new THREE.MeshBasicMaterial({ color: 0xff3fd8, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      sg.beamMat = own(new THREE.MeshBasicMaterial({ color: 0xffa0f0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      const g = new THREE.Group();
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.22), sg.line); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.05;
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.75), sg.beamMat); beam.position.y = 0.55;
      const core = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.16), sg.beamMat); core.position.y = 0.55; core.scale.y = 1;
      const beamH = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.75), sg.beamMat); beamH.rotation.x = -Math.PI / 2; beamH.position.y = 0.55;
      g.add(floor, beam, core, beamH);
      sg.group = add(g); g.rotation.y = -sg.ang;
      B.fx.text({ x: 0, y: 1.6, z: 0 }, 'LASER!', 'eff', 1);
      sfx.warn();
    } else if (key === 'beach') {
      // a rogue wave rolls in from the bay down one lane of the arena
      sg.warn = 1.4; sg.half = 2.4; sg.speed = 8.5;
      const side = (f.x * -dz + f.z * dx) + (Math.random() - 0.5) * 1.5;
      sg.cx = -dz * side; sg.cz = dx * side; sg.dx = dx; sg.dz = dz;
      const reach = Math.sqrt(Math.max(4, ARENA_R * ARENA_R - side * side));
      sg.start = -reach; sg.end = reach; sg.pos = sg.start; sg.dur = (sg.end - sg.start) / sg.speed + 0.4;
      sg.laneMat = own(new THREE.MeshBasicMaterial({ color: 0x2a9fe0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      const lane = add(bandMesh(reach * 2, sg.half * 2, sg.laneMat));
      lane.position.set(sg.cx, 0.03, sg.cz); lane.rotation.y = -ang;
      // the wave: a curling toon-water wall with a foam lip
      const w = new THREE.Group();
      // side profile of a breaking wave (back slope, crest, curl), extruded across the lane
      const sh = new THREE.Shape();
      sh.moveTo(-2.2, 0); sh.bezierCurveTo(-1.2, 0.2, -0.4, 1.4, 0.3, 2.0);
      sh.bezierCurveTo(0.8, 2.25, 1.35, 1.95, 1.25, 1.45);
      sh.bezierCurveTo(1.0, 1.65, 0.65, 1.5, 0.7, 1.0);
      sh.bezierCurveTo(0.75, 0.55, 0.95, 0.2, 1.1, 0);
      sh.lineTo(-2.2, 0);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: sg.half * 2, bevelEnabled: false, curveSegments: 10 });
      geo.translate(0, 0, -sg.half);
      geo.rotateY(-Math.PI / 2); // profile x -> travel (+z), extrusion -> across the lane (x)
      // deep blue at the foot, bright aqua up the face, near-white at the lip
      const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c0 = new THREE.Color(0x1670c8), c1 = new THREE.Color(0x5fd8f0), c2 = new THREE.Color(0xd8fbff), c = new THREE.Color();
      for (let q = 0; q < pos.count; q++) { const y = pos.getY(q) / 2.1; (y < 0.7 ? c.lerpColors(c0, c1, y / 0.7) : c.lerpColors(c1, c2, (y - 0.7) / 0.3)).toArray(col, q * 3); }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const body = inked(geo, toon(0xffffff, { rim: 0.7, vertexColors: true }), 0.03);
      // foam lip: seven puffs merged into one mesh (two draw calls with its outline)
      const puffs = [];
      for (let q = 0; q < 7; q++) puffs.push(new THREE.SphereGeometry(0.3 + (q % 3) * 0.06, 12, 8).translate((q / 6 - 0.5) * (sg.half * 2 - 0.3), 2.0 + (q % 2) * 0.12, 0.75 + (q % 3) * 0.1));
      const foam = inked(mergeGeometries(puffs), toon(0xffffff, { rim: 0.4 }), 0.02);
      puffs.forEach((g) => g.dispose());
      w.add(body, foam);
      w.scale.setScalar(0.01);
      sg.wave = add(w); w.rotation.y = Math.PI / 2 - ang;
      sg.wave.position.set(sg.cx + dx * sg.start, 0, sg.cz + dz * sg.start);
      B.fx.text({ x: sg.wave.position.x, y: 2, z: sg.wave.position.z }, 'WAVE!', 'eff', 1.1);
      sfx.warn();
    } else if (key === 'sky') {
      // a crosswind sweeps the gardens and shoves everyone one way
      sg.warn = 1.1; sg.dur = 4; sg.dx = dx; sg.dz = dz;
      sfx.whoosh?.(0.5);
    } else if (key === 'grove') {
      // a big spore cloud settles near one fighter and lingers; breathing it in makes you dizzy
      sg.warn = 1.2; sg.dur = 5.5; sg.r = 1.8;
      const a = Math.random() * Math.PI * 2, d = 0.5 + Math.random() * 1.2;
      sg.x = f.x + Math.cos(a) * d; sg.z = f.z + Math.sin(a) * d;
      const r = Math.hypot(sg.x, sg.z), lim = ARENA_R - 2.2;
      if (r > lim) { sg.x *= lim / r; sg.z *= lim / r; }
      const ring = add(ringMesh(0x9adf4a, true));
      ring.position.set(sg.x, 0.035, sg.z); ring.scale.setScalar(sg.r);
      ring.traverse((o) => o.material && sg.mats.push(o.material));
      sg.ring = ring;
      sfx.warn();
    }
    // the first one each match gets a callout that says what to do about it
    if (!this.told) { this.told = true; B.hud.callout?.(this.S.tip, 0, 1); }
    this.sig = sg;
    B.stats.hazardsSeen = (B.stats.hazardsSeen || 0) + 1;
  }

  updateSig(dt) {
    const sg = this.sig, B = this.b, fx = B.fx;
    sg.t += dt;
    const t = sg.t, k = Math.min(1, t / Math.max(0.01, sg.warn)), live = t >= sg.warn, e = t - sg.warn;
    if (sg.kind === 'volcano') {
      sg.crack.children[0].material.opacity = Math.min(0.9, t * 2) * (1 - Math.max(0, (t - 2.1) / 0.5)) * (0.7 + 0.3 * Math.sin(t * 30));
      if (Math.random() < dt * 20) { const a = (Math.random() - 0.5) * 9; fx.spawn({ x: sg.crack.position.x + Math.cos(-sg.crack.rotation.y) * a, y: 0.1, z: sg.crack.position.z + Math.sin(-sg.crack.rotation.y) * a, vy: 1.5, color: 0xffb040, size: 0.18, life: 0.5, shape: 'glow' }); }
    } else if (sg.kind === 'frost') {
      const fade = Math.min(1, Math.max(0, (sg.warn + sg.dur - t) / 0.6));
      sg.mat.opacity = (live ? 0.85 : 0.25 + 0.35 * k * (0.6 + 0.4 * Math.sin(t * 18))) * fade;
      sg.edgeMat.opacity = (live ? 0.9 : 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(t * 18))) * fade;
      if (Math.random() < dt * 10) { const a = (Math.random() - 0.5) * sg.len * 0.9, w = (Math.random() - 0.5) * sg.half * 2; fx.spawn({ x: sg.cx + sg.dx * a - sg.dz * w, y: 0.15, z: sg.cz + sg.dz * a + sg.dx * w, vy: 0.4, color: 0xffffff, size: 0.2, life: 0.6, shape: 'star', additive: false }); }
      if (live) for (const f of B.fighters) {
        const side = (f.x - sg.cx) * -sg.dz + (f.z - sg.cz) * sg.dx;
        if (!f.alive || f.under || f.y > 0.3 || Math.abs(side) > sg.half) continue;
        f.slick = Math.max(f.slick || 0, 0.25);
        if (!sg.hit.has(f)) { sg.hit.add(f); const hp = f.headPos(); fx.text({ x: hp.x, y: hp.y + 0.3, z: hp.z }, 'SLIPPY!', 'eff', 0.8); if (f === B.player) B.stats.hazardHits = (B.stats.hazardHits || 0) + 1; }
      }
    } else if (sg.kind === 'neon') {
      if (!live) {
        sg.line.opacity = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * (10 + k * 25)));
        sg.beamMat.opacity = k * 0.12;
      } else {
        if (!sg.on) { sg.on = true; sfx.spark(); sfx.laser(sg.dur); B.shake(0.15); }
        sg.ang += sg.dir * sg.speed * dt;
        sg.group.rotation.y = -sg.ang;
        const fade = Math.min(1, (sg.dur - e) / 0.3);
        sg.line.opacity = 0.9 * fade; sg.beamMat.opacity = (0.6 + 0.25 * Math.sin(t * 50)) * fade;
        const ca = Math.cos(sg.ang), sa = Math.sin(sg.ang);
        if (Math.random() < dt * 30) { const a = (Math.random() - 0.5) * ARENA_R * 2; fx.spawn({ x: ca * a, y: 0.55, z: sa * a, color: 0x9af4ff, size: 0.5, life: 0.15, shape: 'spark' }); }
        for (const f of B.fighters) {
          if (sg.hit.has(f)) continue;
          const perp = f.x * sa - f.z * ca;
          if (Math.abs(perp) > 0.45 || f.y > 1.1) continue;
          const pushX = -sa * sg.dir * Math.sign(Math.cos(Math.atan2(f.z, f.x) - sg.ang) || 1), pushZ = ca * sg.dir * Math.sign(Math.cos(Math.atan2(f.z, f.x) - sg.ang) || 1);
          const r = this.hurt(f, pushX, pushZ, { dmg: 7, kb: 2, stun: 0.3, paralyze: 0.6 }, 'ZZAP!');
          if (r) { sg.hit.add(f); if (r === true) for (let q = 0; q < 4; q++) fx.spawn({ x: f.x + (Math.random() - 0.5), y: 0.6 + Math.random() * 0.8, z: f.z + (Math.random() - 0.5), color: 0x9af4ff, size: 1, life: 0.2, shape: 'bolt', rot: Math.random() * 6 }); }
        }
      }
    } else if (sg.kind === 'beach') {
      const grow = Math.min(1, t / sg.warn);
      sg.laneMat.opacity = live ? Math.max(0, 0.22 * (1 - e / sg.dur)) : 0.12 + 0.15 * (0.5 + 0.5 * Math.sin(t * (8 + k * 20)));
      if (live) sg.pos = Math.min(sg.end, sg.start + e * sg.speed);
      sg.wave.scale.setScalar(Math.max(0.01, live ? Math.min(1, 1.6 * (sg.end - sg.pos) / 2.5 + 0.0) : grow * 0.9));
      sg.wave.position.set(sg.cx + sg.dx * sg.pos, 0, sg.cz + sg.dz * sg.pos);
      if (live) {
        if (!sg.on) { sg.on = true; sfx.wave(); }
        const wx = sg.wave.position.x, wz = sg.wave.position.z;
        // spray flying off the lip
        if (Math.random() < dt * 30) { const w = (Math.random() - 0.5) * sg.half * 2; fx.spawn({ x: wx - sg.dz * w + sg.dx * 0.8, y: 2.1, z: wz + sg.dx * w + sg.dz * 0.8, vx: sg.dx * 5, vz: sg.dz * 5, vy: 2.5, color: 0xffffff, size: 0.4, life: 0.5, shape: 'puff', additive: false, grav: 7, alpha: 0.9 }); }
        if (Math.random() < dt * 40) fx.spawn({ x: wx - sg.dz * (Math.random() - 0.5) * sg.half * 2, y: 0.3 + Math.random() * 1.4, z: wz + sg.dx * (Math.random() - 0.5) * sg.half * 2, vx: sg.dx * 4, vz: sg.dz * 4, vy: 3, color: 0xe8fbff, size: 0.35, life: 0.5, shape: 'drop', additive: false, grav: 9 });
        for (const f of B.fighters) {
          if (sg.hit.has(f)) continue;
          const along = (f.x - sg.cx) * sg.dx + (f.z - sg.cz) * sg.dz, side = (f.x - sg.cx) * -sg.dz + (f.z - sg.cz) * sg.dx;
          if (Math.abs(side) > sg.half || Math.abs(along - sg.pos) > 0.7 || f.y > 1.2) continue;
          const r = this.hurt(f, sg.dx, sg.dz, { dmg: 7, kb: 7, stun: 0.55 }, 'SPLASH!');
          if (r === 'block') { f.vx += sg.dx * 4; f.vz += sg.dz * 4; }
          if (r) { sg.hit.add(f); fx.burst({ x: f.x, y: 0.6, z: f.z }, { n: 14, speed: 4, up: 4, color: 0xe8fbff, size: 0.3, life: 0.6, shape: 'drop', additive: false, grav: 9 }); sfx.bonk(); }
        }
        if (sg.pos >= sg.end) sg.passed = true;
      }
    } else if (sg.kind === 'sky') {
      const strength = live ? Math.min(1, e * 3) * Math.min(1, (sg.dur - e) * 2) : 0;
      // leaves and streaks blow across the gardens (a few in the warning, a gale once it's live)
      const rate = live ? 26 : 6;
      const proj = (x, z) => new THREE.Vector3(x, 1, z).project(B.camera);
      const a0 = proj(0, 0), a1 = proj(sg.dx, sg.dz), rot = Math.atan2((a1.y - a0.y) / B.camera.aspect, a1.x - a0.x) - Math.PI / 2;
      for (let q = 0; q < Math.floor(rate * dt + Math.random()); q++) {
        const w = (Math.random() - 0.5) * ARENA_R * 2, back = -ARENA_R + Math.random() * ARENA_R;
        const x = sg.dx * back - sg.dz * w, z = sg.dz * back + sg.dx * w;
        if (Math.random() < 0.6) fx.spawn({ x, y: 0.3 + Math.random() * 2, z, vx: sg.dx * 14, vz: sg.dz * 14, color: 0xffffff, size: 0.26, stretch: 9, rot, life: 0.5, shape: 'spark', additive: false, alpha: 0.9 });
        else fx.spawn({ x, y: 0.4 + Math.random() * 1.5, z, vx: sg.dx * 9, vz: sg.dz * 9, color: Math.random() < 0.5 ? 0xffc4de : 0xb8f0a0, size: 0.3, life: 1, shape: 'leaf', additive: false, spin: 10 });
      }
      if (strength > 0) for (const f of B.fighters) {
        if (!f.alive || f.under || f.state === 'super' || f.state === 'down') continue;
        const push = 2.6 * strength * (f.state === 'guard' ? 0.4 : 1) / Math.max(0.7, f.weight || 1);
        f.x += sg.dx * push * dt; f.z += sg.dz * push * dt;
        if (!sg.hit.has(f)) { sg.hit.add(f); const hp = f.headPos(); fx.text({ x: hp.x, y: hp.y + 0.3, z: hp.z }, 'WHOOSH!', 'eff', 0.8); }
      }
      if (live && !sg.on) { sg.on = true; sfx.wind(sg.dur); }
    } else if (sg.kind === 'grove') {
      const { ring, fill } = sg.ring.userData;
      const fade = Math.min(1, Math.max(0, (sg.warn + sg.dur - t) / 0.8));
      ring.material.opacity = (live ? 0.5 : 0.45 + 0.5 * (0.5 + 0.5 * Math.sin(t * (8 + k * 20)))) * fade;
      fill.material.opacity = (live ? 0.22 : 0.1 + k * 0.2) * fade;
      if (live) {
        if (!sg.on) { sg.on = true; fx.burst({ x: sg.x, y: 0.3, z: sg.z }, { n: 26, speed: 3, up: 3, color: 0xc8ff7a, size: 0.7, life: 1.2, shape: 'puff', additive: false, grav: -0.4, grow: 1.4, alpha: 0.7 }); sfx.spores(); }
        if (Math.random() < dt * 14 * fade) { const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * sg.r; fx.spawn({ x: sg.x + Math.cos(a) * d, y: 0.2 + Math.random() * 0.8, z: sg.z + Math.sin(a) * d, vy: 0.5, color: Math.random() < 0.7 ? 0xc8ff7a : 0xfff6a0, size: 0.6 + Math.random() * 0.4, life: 1.2, shape: 'puff', additive: false, grow: 1, alpha: 0.55 }); }
        if (fade > 0.3) for (const f of B.fighters) {
          if (!f.alive || f.under || f.state === 'dizzy' || f.state === 'super' || Math.hypot(f.x - sg.x, f.z - sg.z) > sg.r) continue;
          f.dizzy += 30 * dt;
          if (!sg.hit.has(f) || Math.random() < dt * 0.8) { sg.hit.add(f); const hp = f.headPos(); fx.text({ x: hp.x, y: hp.y + 0.3, z: hp.z }, 'ACHOO!', 'eff', 0.7); if (f === B.player) B.stats.hazardHits = (B.stats.hazardHits || 0) + 1; }
        }
      }
    }
    if (t >= sg.warn + sg.dur) this.clearSig();
  }

  clearSig() {
    const sg = this.sig;
    if (!sg) return;
    for (const m of sg.meshes) { this.b.scene.remove(m); m.traverse((o) => o.geometry?.dispose()); }
    for (const m of sg.mats) m.dispose();
    this.sig = null;
  }

  spawnAt(x, z, t0 = 0, quiet = false, follow = null) {
    const B = this.b, H = this.H;
    const r = Math.hypot(x, z), lim = ARENA_R - 1.6;
    if (r > lim) { x *= lim / r; z *= lim / r; }
    const mesh = ringMesh(H.color, H.solid);
    mesh.position.set(x, 0.035, z);
    mesh.scale.setScalar(H.r);
    B.scene.add(mesh);
    const h = { x, z, t: t0, fired: false, mesh, follow };
    mesh.visible = t0 >= 0;
    if (B.arena.key === 'frost' || B.arena.key === 'beach') {
      h.drop = dropMesh(B.arena.key);
      h.drop.position.set(x, 9, z);
      B.scene.add(h.drop);
    }
    this.list.push(h);
    B.stats.hazardsSeen = (B.stats.hazardsSeen || 0) + 1;
    if (!this.warned) { this.warned = true; B.fx.text({ x, y: 1.4, z }, 'WATCH OUT!', 'eff', 1.1); }
    if (!quiet) sfx.warn();
  }

  // the boss's second wind turns the arena against the challenger
  storm() {
    if (!this.H || (this.b.training && !this.b.trainHazards) || save.settings.hazards === false) return false;
    this.stormy = true;
    this.timer = Math.min(this.timer, 2);
    return true;
  }

  update(dt) {
    // off in the meadow, in training (unless Sparring Setup switched them on), and when switched off in Settings
    if (!this.H || (this.b.training && !this.b.trainHazards) || save.settings.hazards === false) return;
    const B = this.b, H = this.H;
    if (B.phase === 'fight' && B.time > 8) {
      this.timer -= dt * (B.mods?.has('mayhem') ? 2 : 1);
      if (this.timer <= 0 && this.list.length < (this.stormy ? 4 : 2)) {
        if (this.stormy) { this.timer = 3.5 + Math.random() * 2; const r = Math.random(); if (!this.sig && this.S && r < 0.3) this.signature(); else r < 0.7 ? this.volley() : this.spawn(); }
        else if (!this.sig && this.S && Math.random() < (this.sigN ? 0.4 : 0.65)) { this.sigN = (this.sigN || 0) + 1; this.timer = 10 + Math.random() * 4; this.signature(); }
        else if (Math.random() < 0.35) { this.timer = 9 + Math.random() * 4; this.chase(); }
        else { this.timer = 6.5 + Math.random() * 4.5; this.spawn(); }
      }
    }
    if (this.sig) this.updateSig(dt);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const h = this.list[i];
      h.t += dt;
      if (h.t < 0) continue; // staggered volley rings wait their turn
      if (h.follow) {
        // a chasing ring lands wherever its target is standing when it appears
        const r = Math.hypot(h.follow.x, h.follow.z), lim = ARENA_R - 1.6, sc = r > lim ? lim / r : 1;
        h.x = h.follow.x * sc; h.z = h.follow.z * sc; h.follow = null;
        h.mesh.position.set(h.x, 0.035, h.z);
        if (h.drop) h.drop.position.set(h.x, 9, h.z);
        sfx.warn();
      }
      h.mesh.visible = true;
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
        if (B.arena.key === 'sky' && e < 0.8) B.fx.spawn({ x: h.x + (Math.random() - 0.5) * 1.2, y: 0.2, z: h.z + (Math.random() - 0.5) * 1.2, vy: 10 + Math.random() * 4, color: 0xffffff, size: 0.28, stretch: 5, life: 0.4, shape: 'spark', additive: false, alpha: 0.85 });
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
      sfx.boom(); sfx.rumble();
    } else if (key === 'sky') {
      B.fx.burst({ x: h.x, y: 0.4, z: h.z }, { n: 14, speed: 3, up: 9, color: 0xffffff, size: 0.5, life: 0.7, shape: 'puff', additive: false, grav: 4, grow: 1.2 });
      for (let k = 0; k < 6; k++) B.fx.spawn({ x: h.x + (Math.random() - 0.5), y: 0.6, z: h.z + (Math.random() - 0.5), vy: 7, color: 0xffc4de, size: 0.3, life: 1, shape: 'leaf', additive: false, spin: 8, drag: 1 });
      sfx.whoosh?.(1.2);
    } else if (key === 'frost') {
      B.fx.burst(p, { n: 16, speed: 5, up: 3, color: 0xd8f6ff, size: 0.22, life: 0.5, shape: 'star', additive: false, grav: 8 });
      sfx.bonk();
    } else if (key === 'grove') {
      B.fx.burst({ x: h.x, y: 0.3, z: h.z }, { n: 22, speed: 3.5, up: 4, color: 0xc8ff7a, size: 0.55, life: 1.1, shape: 'puff', additive: false, grav: -0.5, grow: 1.3, alpha: 0.7 });
      B.fx.burst({ x: h.x, y: 0.5, z: h.z }, { n: 10, speed: 2, up: 3, color: 0xfff6a0, size: 0.2, life: 1, shape: 'star', additive: true, grav: 0.5 });
      sfx.whoosh?.(0.4);
    } else if (key === 'neon') {
      for (let k = 0; k < 6; k++) B.fx.spawn({ x: h.x + (Math.random() - 0.5) * H.r * 1.4, y: 0.6 + Math.random() * 0.8, z: h.z + (Math.random() - 0.5) * H.r * 1.4, color: H.glow, size: 1.1, life: 0.22, shape: 'bolt', rot: Math.random() * 6 });
      sfx.spark();
    } else {
      B.fx.burst(p, { n: 12, speed: 4, up: 3, color: 0xfff2c0, size: 0.25, life: 0.5, shape: 'puff', additive: false, grav: 6 });
      sfx.bonk();
    }
    B.shake(0.25);
    for (const f of B.fighters) {
      const dx = f.x - h.x, dz = f.z - h.z, d = Math.hypot(dx, dz);
      if (d > H.r + 0.25) continue;
      this.hurt(f, d > 0.05 ? dx / d : Math.random() - 0.5, d > 0.05 ? dz / d : 0.5, H, H.word);
    }
  }

  // one hazard hit on one fighter (never a KO; a guard soaks it)
  hurt(f, dirX, dirZ, H, word) {
    const B = this.b;
    if (!f.alive || f.invuln > 0 || f.state === 'down' || f.state === 'super' || f.state === 'launched') return false;
    if (f.state === 'guard') { f.shield.userData.flash = 1; B.fx.text(f.headPos(), 'BLOCK', '', 0.5); return 'block'; }
    const dmg = Math.min(H.dmg, f.hp - 1);
    f.takeHit({ dmg: Math.max(0, dmg), kb: H.kb, dirX, dirZ, stun: H.stun || 0.4, lift: H.lift || 0, launch: !!H.lift, paralyze: H.paralyze, dizzy: H.dizzy || 0 });
    f.dmgDelay = 0.3;
    if (f === B.player) { B.roundDmgTaken += Math.max(0, dmg); B.stats.hazardHits = (B.stats.hazardHits || 0) + 1; }
    const hp = f.headPos();
    B.fx.text({ x: hp.x, y: hp.y + 0.3, z: hp.z }, word, 'big', 0.8);
    B.fx.text({ x: hp.x, y: hp.y - 0.1, z: hp.z }, String(Math.max(0, dmg)), 'dmg', 0.7);
    B.arena.cheer(0.4);
    return true;
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

  clear() { this.clearSig(); for (let i = this.list.length - 1; i >= 0; i--) this.remove(i); this.timer = this.stormy ? 4 : 10; }
}
