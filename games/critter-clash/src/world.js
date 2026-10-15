// Adventure mode: a Red/Blue style tile world drawn with the game's 3D toon look.
// The hero (the critter the player picked) walks tile by tile; tall grass hides wild critters,
// some roam in plain sight; trainers spot you from a distance; stadiums are the gyms.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, inked, canvasTex } from './toon.js';
import { Critter } from './critters.js';
import { CRITTERS, CUPS, withGear } from './data.js';
import { save, persist } from './save.js';
import { sfx, playMusic } from './audio.js';
import { MAPS, rivalFor } from './worldmaps.js';

export const TILE = 2;
const DIRS = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const YAW = { n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 };
const STEP = 0.23; // seconds per tile
const OL = 0.035;
const CS = 1.4; // critters stand a bit taller than in battle so they read from the overhead camera
const byId = (id) => CRITTERS.find((c) => c.id === id);
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const hash = (s) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 2147483647; return h || 1; };
const wpos = (x, y) => [x * TILE + TILE / 2, (y * TILE) + TILE / 2];

// save.adv: { hero, map, x, y, dir, flags, spawn: {map, x, y} }
export function newAdventure(hero) {
  save.adv = { hero, map: 'village', x: 4, y: 6, dir: 's', flags: {}, spawn: { map: 'village', x: 4, y: 6 }, steps: 0 };
  persist();
}

export function heroDef() {
  const id = save.adv.hero, lv = save.critters[id]?.level || 1;
  return withGear(byId(id), lv);
}

export class World {
  constructor(screens) {
    this.S = screens;
    this.g = screens.game;
    this.t = 0;
    this.busy = false; // dialogue / cut-scene: no walking
    const A = this.g.arena;
    this.base = { sun: A.sun.color.getHex(), sunI: A.sun.intensity, sky: A.hemi.color.getHex(), gnd: A.hemi.groundColor.getHex(), hemiI: A.hemi.intensity };
    this.hideArena(true);
    this.load(save.adv.map, save.adv.x, save.adv.y, save.adv.dir);
  }

  // ---------- stadium visibility: the world reuses the arena's lights (no shader recompiles) ----------
  hideArena(hide) {
    const A = this.g.arena;
    if (hide) {
      this.hidden = [];
      for (const o of A.group.children) {
        if (o.isLight || o === A.sky || o === A.sun?.target || o === A.fill?.target) continue;
        if (o.visible) { o.visible = false; this.hidden.push(o); }
      }
      this.fogWas = this.g.scene.fog;
      this.g.scene.fog = new THREE.Fog(0xcfeeff, 38, 80);
      A.fill.intensity = 0.35;
    } else {
      for (const o of this.hidden || []) o.visible = true;
      this.hidden = [];
      this.mood(null);
      if (this.fogWas) this.g.scene.fog = this.fogWas;
      const sun = A.sun;
      sun.position.set(...A.A.sunDir).multiplyScalar(30); sun.target.position.set(0, 0, 0);
    }
  }

  // per-map light: the Glowcap woods sit in a violet dusk; null restores the meadow daylight
  mood(m) {
    const A = this.g.arena, B = this.base;
    A.sun.color.setHex(m?.sun ?? B.sun); A.sun.intensity = m?.sunI ?? B.sunI;
    A.hemi.color.setHex(m?.sky ?? B.sky); A.hemi.groundColor.setHex(m?.gnd ?? B.gnd); A.hemi.intensity = m?.hemiI ?? B.hemiI;
    if (this.g.scene.fog && this.hidden?.length) this.g.scene.fog.color.setHex(m?.fog ?? 0xcfeeff);
  }

  dispose() {
    this.unload();
    this.follower = null;
    this.hideArena(false);
    this.dialogEl?.remove();
  }

  // ---------- map building ----------
  load(key, x, y, dir = 's') {
    this.unload();
    const M = this.M = MAPS[key];
    this.key = key;
    this.W = M.tiles[0].length; this.H = M.tiles.length;
    this.group = new THREE.Group();
    this.g.scene.add(this.group);
    this.solid = new Set();
    const rand = rng(hash(key));
    const shut = M.bramble && !save.adv.flags[M.bramble];
    for (let ty = 0; ty < this.H; ty++) for (let tx = 0; tx < this.W; tx++) {
      const t = this.tile(tx, ty);
      if ('TP~#Rhm'.includes(t) || (t === 'B' && shut)) this.solid.add(tx + ',' + ty);
    }
    for (const s of M.signs || []) this.solid.add(s.x + ',' + s.y);
    this.buildGround(rand);
    this.buildTrees(rand);
    this.buildGrass(rand);
    this.buildProps(rand);
    this.buildForest(rand);
    this.buildBuildings();
    this.buildActors();
    // hero
    this.hero = new Critter(heroDef());
    this.hero.root.scale.setScalar(CS);
    this.group.add(this.hero.root);
    this.hx = x; this.hy = y; this.dir = dir; this.moveT = 0; this.from = null;
    this.placeHero();
    this.makeFollower();
    this.camAt = null;
    this.steps = 0;
    this.encCool = 4;
    save.adv.map = key; save.adv.x = x; save.adv.y = y; save.adv.dir = dir; persist();
    playMusic(M.music || 'camp');
    this.mood(M.mood);
    this.banner(M.name);
  }

  unload() {
    if (!this.group) return;
    this.g.scene.remove(this.group);
    const maps = new Set();
    this.group.traverse((o) => {
      if (o.userData.critter) return;
      if (o.geometry && !o.userData.shared) o.geometry.dispose();
      for (const m of [].concat(o.material || [])) { if (m.map) maps.add(m.map); if (m.userData?.own) m.dispose(); }
    });
    for (const t of maps) if (t.userData?.own) t.dispose();
    this.group = null;
  }

  tile(x, y) { return this.M.tiles[y]?.[x] ?? 'T'; }

  buildGround(rand) {
    const P = 32, W = this.W, H = this.H, C = { a: '#7ad259', b: '#77cf56', tall: '#4fae3e', path: '#e8c98a', dark: 'rgba(40,120,40,0.35)', lite: 'rgba(200,255,150,0.4)', ...this.M.palette };
    // building footprints take the ground of the tile in front of their door row
    const under = (x, y) => { let k = y; while (this.tile(x, k) === 'h' && k < H) k++; const t = this.tile(x, k); return t === 'h' || t === 'T' ? '.' : t; };
    const tex = canvasTex(W * P, H * P, (c) => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let t = this.tile(x, y);
        if (t === 'h') t = under(x, y);
        c.fillStyle = (x + y) % 2 ? C.a : C.b;
        c.fillRect(x * P, y * P, P, P);
        if (t === '"') { c.fillStyle = C.tall; c.fillRect(x * P, y * P, P, P); }
        if (t === '~' || t === '=') { c.fillStyle = '#3a9ae0'; c.fillRect(x * P, y * P, P, P); }
        if (t === 's' || t === 'P') { c.fillStyle = (x + y) % 2 ? '#f4dc9a' : '#f1d894'; c.fillRect(x * P, y * P, P, P); for (let k = 0; k < 6; k++) { c.fillStyle = rand() < 0.5 ? 'rgba(190,140,70,0.35)' : 'rgba(255,255,235,0.6)'; c.fillRect(x * P + rand() * P, y * P + rand() * P, 2, 2); } }
      }
      // paths: rounded blobs so corners look worn in, not tiled
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (this.tile(x, y) !== ':' && this.tile(x, y) !== 'h') continue;
        if (this.tile(x, y) === 'h') continue;
        c.fillStyle = C.path;
        c.beginPath(); c.roundRect(x * P - 3, y * P - 3, P + 6, P + 6, 10); c.fill();
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (this.tile(x, y) !== ':') continue;
        for (let k = 0; k < 6; k++) { c.fillStyle = rand() < 0.5 ? 'rgba(160,110,60,0.35)' : 'rgba(255,240,200,0.5)'; c.fillRect(x * P + rand() * P, y * P + rand() * P, 3, 2); }
      }
      // grass speckles and flowers
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const t = this.tile(x, y);
        if ('.fTmgB'.includes(t)) for (let k = 0; k < 5; k++) { c.fillStyle = rand() < 0.5 ? C.dark : C.lite; c.fillRect(x * P + rand() * P, y * P + rand() * P, 2, 4); }
        if (t === 'g') { // a ring of moss round the little glowcaps
          const g = c.createRadialGradient(x * P + P / 2, y * P + P / 2, 2, x * P + P / 2, y * P + P / 2, P * 0.7);
          g.addColorStop(0, 'rgba(160,255,200,0.45)'); g.addColorStop(1, 'rgba(160,255,200,0)');
          c.fillStyle = g; c.fillRect(x * P - P / 2, y * P - P / 2, P * 2, P * 2);
        }
        if (t === 'f') for (let k = 0; k < 5; k++) {
          const fx = x * P + 5 + rand() * (P - 10), fy = y * P + 5 + rand() * (P - 10);
          c.fillStyle = ['#ff6a8a', '#ffe14d', '#ffffff', '#b07aff'][Math.floor(rand() * 4)];
          for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(fx + Math.cos(p * 1.26) * 2.6, fy + Math.sin(p * 1.26) * 2.6, 2, 0, 7); c.fill(); }
          c.fillStyle = '#ffb030'; c.beginPath(); c.arc(fx, fy, 1.6, 0, 7); c.fill();
        }
      }
    });
    tex.userData.own = true;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(W * TILE, H * TILE), toon(0xffffff, { map: tex, rim: 0 }));
    ground.material.userData.own = true; // map-specific texture, so this material isn't shared
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(W * TILE / 2, 0, H * TILE / 2);
    ground.receiveShadow = true;
    this.group.add(ground);
    // the world beyond the map: forest floor
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), toon(this.M.outer || 0x3f8a3a, { rim: 0 }));
    outer.rotation.x = -Math.PI / 2; outer.position.set(W * TILE / 2, -0.03, H * TILE / 2);
    outer.receiveShadow = true;
    this.group.add(outer);
    // water surface with drifting ripples
    const water = [];
    const planks = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.tile(x, y) === '=') {
      for (let k = 0; k < 4; k++) { const b = new THREE.BoxGeometry(0.42, 0.14, TILE * 0.98); b.translate(x * TILE + 0.27 + k * 0.49, 0.16, y * TILE + 1); planks.push(b); }
      for (const side of [0.1, TILE - 0.1]) { const r = new THREE.BoxGeometry(TILE, 0.14, 0.12); r.translate(x * TILE + 1, 0.55, y * TILE + side); planks.push(r); const p = new THREE.BoxGeometry(0.14, 0.6, 0.14); p.translate(x * TILE + 0.1, 0.3, y * TILE + side); planks.push(p); }
    }
    if (planks.length) { this.group.add(inked(mergeGeometries(planks), toon(0xb8865a), OL * 0.5)); planks.forEach((g) => g.dispose()); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.tile(x, y) === '~' || this.tile(x, y) === '=') {
      const g = new THREE.PlaneGeometry(TILE, TILE); g.rotateX(-Math.PI / 2); g.translate(...[x * TILE + 1, 0.06, y * TILE + 1]); water.push(g);
    }
    if (water.length) {
      const wt = canvasTex(128, 128, (c, w, h) => {
        c.fillStyle = this.M.palette?.water || '#4aa8f0'; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 3;
        for (let k = 0; k < 7; k++) { const x = (k * 37) % w, y = (k * 53) % h; c.beginPath(); c.arc(x, y, 9, 0.2, 2.6); c.stroke(); }
      }, { repeat: [1, 1] });
      wt.userData.own = true;
      const m = toon(0xffffff, { map: wt, rim: 0.2 });
      m.userData.own = true;
      this.waterTex = wt;
      const mesh = new THREE.Mesh(mergeGeometries(water), m);
      water.forEach((g) => g.dispose());
      this.group.add(mesh);
    }
  }

  buildTrees(rand) {
    const can = [], can2 = [], trunks = [];
    const add = (x, y) => {
      const [px, pz] = wpos(x, y), s = 0.85 + rand() * 0.3, jx = (rand() - 0.5) * 0.4, jz = (rand() - 0.5) * 0.4;
      const tr = new THREE.CylinderGeometry(0.2 * s, 0.28 * s, 1.0 * s, 6); tr.translate(px + jx, 0.5 * s, pz + jz); trunks.push(tr);
      const a = new THREE.IcosahedronGeometry(1.05 * s, 1); a.scale(1, 0.85, 1); a.translate(px + jx, 1.55 * s, pz + jz); (rand() < 0.5 ? can : can2).push(a);
      const b = new THREE.IcosahedronGeometry(0.72 * s, 1); b.translate(px + jx + (rand() - 0.5) * 0.3, 2.35 * s, pz + jz); (rand() < 0.5 ? can : can2).push(b);
    };
    const fronds = [], ptrunks = [], nuts = [];
    const palm = (x, y) => {
      const [px, pz] = wpos(x, y), s = 0.9 + rand() * 0.25, lean = (rand() - 0.5) * 0.5;
      const pts = []; for (let k = 0; k <= 6; k++) pts.push(new THREE.Vector3(px + Math.sin(k / 6 * 1.2) * lean, k / 6 * 3.2 * s, pz));
      const tr = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.18 * s, 6); ptrunks.push(tr);
      const top = pts[6];
      for (let k = 0; k < 6; k++) {
        const f = new THREE.ConeGeometry(0.42 * s, 2.1 * s, 4); f.scale(0.22, 1, 1); f.rotateZ(Math.PI / 2 + 0.35); f.translate(1.0 * s, -0.2, 0);
        f.rotateY(k / 6 * Math.PI * 2 + rand() * 0.4); f.translate(top.x, top.y, top.z); fronds.push(f);
      }
      const nut = new THREE.IcosahedronGeometry(0.22 * s, 0); nut.translate(top.x + 0.15, top.y - 0.2, top.z + 0.1); nuts.push(nut);
    };
    for (let y = -3; y < this.H + 3; y++) for (let x = -3; x < this.W + 3; x++) {
      const inside = x >= 0 && y >= 0 && x < this.W && y < this.H;
      const t = inside ? this.tile(x, y) : null;
      if (t === 'P' || (!inside && this.M.border === 'palm' && rand() < 0.3)) palm(x, y);
      else if (inside ? t === 'T' : rand() < 0.85) add(x, y);
    }
    if (ptrunks.length) { this.group.add(inked(mergeGeometries(ptrunks), toon(0xa8784a), OL * 0.6)); ptrunks.forEach((g) => g.dispose()); }
    if (nuts.length) { this.group.add(inked(mergeGeometries(nuts), toon(0x7a4a2a), OL * 0.4)); nuts.forEach((g) => g.dispose()); }
    if (fronds.length) { this.group.add(inked(mergeGeometries(fronds), toon(0x3fbf5a, { rim: 0.4, side: THREE.DoubleSide }), OL * 0.4)); fronds.forEach((g) => g.dispose()); }
    const put = (list, color, ink) => { if (!list.length) return; const m = inked(mergeGeometries(list), toon(color, { rim: 0.4 }), ink); m.castShadow = true; this.group.add(m); list.forEach((g) => g.dispose()); };
    const TC = this.M.trees || [0x3fae4a, 0x4cc25a, 0x8a5a3a];
    put(can, TC[0], OL); put(can2, TC[1], OL); put(trunks, TC[2], OL * 0.6);
  }

  buildGrass(rand) {
    const blades = [];
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      if (this.tile(x, y) !== '"') continue;
      const [px, pz] = wpos(x, y);
      for (let k = 0; k < 7; k++) {
        const c = new THREE.ConeGeometry(0.16, 0.75 + rand() * 0.35, 4);
        c.rotateZ((rand() - 0.5) * 0.4); c.rotateY(rand() * 3);
        c.translate(px + (rand() - 0.5) * 1.6, 0.4, pz + (rand() - 0.5) * 1.6);
        blades.push(c);
      }
    }
    if (!blades.length) return;
    const m = inked(mergeGeometries(blades), toon(this.M.blades || 0x2f9a3a, { rim: 0.5 }), OL * 0.4);
    blades.forEach((g) => g.dispose());
    this.group.add(m);
  }

  buildProps(rand) {
    const rocks = [], posts = [], rails = [], boards = [], sticks = [];
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      const t = this.tile(x, y), [px, pz] = wpos(x, y);
      if (t === 'R') { const r = new THREE.DodecahedronGeometry(0.75, 0); r.scale(1.1, 0.75, 1); r.rotateY(rand() * 3); r.translate(px, 0.45, pz); rocks.push(r); }
      if (t === '#') {
        const p = new THREE.BoxGeometry(0.22, 1.0, 0.22); p.translate(px, 0.5, pz); posts.push(p);
        for (const [dx, dy] of [[1, 0], [0, 1]]) if (this.tile(x + dx, y + dy) === '#') {
          for (const h of [0.35, 0.75]) { const r = new THREE.BoxGeometry(dx ? TILE : 0.1, 0.12, dy ? TILE : 0.1); r.translate(px + dx, h, pz + dy); rails.push(r); }
        }
      }
    }
    for (const s of this.M.signs || []) {
      const [px, pz] = wpos(s.x, s.y);
      const st = new THREE.BoxGeometry(0.16, 0.9, 0.16); st.translate(px, 0.45, pz); sticks.push(st);
      const b = new THREE.BoxGeometry(1.2, 0.7, 0.14); b.translate(px, 1.05, pz + 0.05); boards.push(b);
    }
    const put = (list, color, ink = OL) => { if (!list.length) return; const m = inked(mergeGeometries(list), toon(color), ink); this.group.add(m); list.forEach((g) => g.dispose()); };
    put(rocks, 0x9a94a8); put(posts, 0xfff4e0, OL * 0.6); put(rails, 0xfff4e0, OL * 0.5); put(sticks, 0x8a5a3a, OL * 0.5); put(boards, 0xc8925a);
  }

  // the Glowcap woods: giant glowing toadstools (m), little glowcap clusters (g), bramble walls (B)
  buildForest(rand) {
    const stems = [], caps = [[], [], []], spots = [], tiny = [[], [], []], thorns = [], vines = [];
    const CAP = [0xff5a8a, 0x8a6aff, 0x2fd8b8];
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      const t = this.tile(x, y), [px, pz] = wpos(x, y);
      if (t === 'm') {
        const s = 0.95 + rand() * 0.35, k = Math.floor(rand() * 3), lean = (rand() - 0.5) * 0.25;
        const st = new THREE.CylinderGeometry(0.32 * s, 0.45 * s, 2.0 * s, 8); st.rotateZ(lean); st.translate(px, 1.0 * s, pz); stems.push(st);
        const cap = new THREE.SphereGeometry(1.25 * s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); cap.scale(1, 0.62, 1); cap.translate(px - lean * 1.8 * s, 1.9 * s, pz); caps[k].push(cap);
        for (let j = 0; j < 5; j++) {
          const a = rand() * Math.PI * 2, r = (0.3 + rand() * 0.55) * s, sp = new THREE.SphereGeometry(0.16 * s, 6, 4); sp.scale(1, 0.4, 1);
          const h = Math.sqrt(Math.max(0, 1 - (r / (1.25 * s)) ** 2)) * 0.62 * 1.25 * s;
          sp.translate(px - lean * 1.8 * s + Math.cos(a) * r, 1.9 * s + h, pz + Math.sin(a) * r); spots.push(sp);
        }
      }
      if (t === 'g') for (let j = 0; j < 4; j++) {
        const k = Math.floor(rand() * 3), ox = px + (rand() - 0.5) * 1.3, oz = pz + (rand() - 0.5) * 1.3, h = 0.25 + rand() * 0.25;
        const st = new THREE.CylinderGeometry(0.05, 0.07, h, 5); st.translate(ox, h / 2, oz); stems.push(st);
        const cp = new THREE.SphereGeometry(0.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2); cp.scale(1, 0.7, 1); cp.translate(ox, h, oz); tiny[k].push(cp);
      }
      if (t === 'B') {
        for (let j = 0; j < 6; j++) {
          const v = new THREE.TorusGeometry(0.6 + rand() * 0.3, 0.13, 6, 16); v.rotateY(rand() * 3); v.rotateX(Math.PI / 2 + (rand() - 0.5) * 1.6);
          v.translate(px + (rand() - 0.5) * 0.7, 0.5 + j * 0.22, pz + (rand() - 0.5) * 0.7); vines.push(v);
        }
        for (let j = 0; j < 20; j++) {
          const a = rand() * Math.PI * 2, r = 0.55 + rand() * 0.35, c = new THREE.ConeGeometry(0.1, 0.42, 4); c.rotateZ(-Math.PI / 2); c.rotateY(a);
          c.translate(px + Math.cos(a) * r, 0.3 + rand() * 1.4, pz - Math.sin(a) * r); thorns.push(c);
        }
      }
    }
    const put = (list, mat, ink = OL, group = this.group) => { if (!list.length) return null; const m = inked(mergeGeometries(list), mat, ink); m.castShadow = true; group.add(m); list.forEach((g) => g.dispose()); return m; };
    put(stems, toon(0xf4e8d0), OL * 0.6);
    caps.forEach((l, k) => put(l, toon(CAP[k], { emissive: new THREE.Color(CAP[k]).multiplyScalar(0.55).getHex(), rim: 0.6 })));
    tiny.forEach((l, k) => put(l, toon(CAP[k], { emissive: new THREE.Color(CAP[k]).multiplyScalar(0.9).getHex(), rim: 0 }), OL * 0.4));
    put(spots, toon(0xffffff, { emissive: 0xb0a898, rim: 0 }), 0);
    // brambles live in their own group so the Trial of Friendship can shrink them away
    if (vines.length && !(this.M.bramble && save.adv.flags[this.M.bramble])) {
      this.brambles = new THREE.Group(); this.group.add(this.brambles);
      put(vines, toon(0x6a3a7a, { rim: 0.6 }), OL * 0.6, this.brambles); put(thorns, toon(0xffc8f0, { emissive: 0x5a2a5a }), OL * 0.3, this.brambles);
    } else this.brambles = null;
  }

  // the brambles curl back into the ground (Trial of Friendship)
  openBrambles() {
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) if (this.tile(x, y) === 'B') this.solid.delete(x + ',' + y);
    const B = this.brambles; if (!B) return;
    this.brambleT = 1.2;
    B.children[0].geometry.computeBoundingSphere();
    const c = B.children[0].geometry.boundingSphere.center;
    B.userData.c = c.clone();
    for (let k = 0; k < 24; k++) this.g.fx.spawn({ x: c.x + (Math.random() - 0.5) * 3, y: 0.5 + Math.random() * 1.5, z: c.z + (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2, color: [0xff8ac8, 0xb08aff, 0x8affd8][k % 3], size: 0.35, life: 1.4, shape: 'star', drag: 1 });
    sfx.shimmer?.();
  }

  // a friend who tags along one tile behind the hero (save.adv.follow)
  makeFollower() {
    const id = save.adv.follow;
    if (!id) { this.follower = null; return; }
    const cr = new Critter(withGear(byId(id), 2));
    cr.root.userData.critter = true;
    cr.root.scale.setScalar(CS * 0.7);
    this.group.add(cr.root);
    // start on a free tile behind the hero
    const [dx, dy] = DIRS[this.dir];
    let x = this.hx - dx, y = this.hy - dy;
    if (!this.walkable(x, y)) { x = this.hx; y = this.hy; }
    this.follower = { cr, root: cr.root, x, y, dir: this.dir, from: null, moveT: 0 };
    this.setPos(this.follower);
  }

  buildBuildings() {
    this.doors = [];
    for (const b of this.M.buildings || []) {
      const x0 = b.x * TILE, z0 = b.y * TILE, w = b.w * TILE, d = b.h * TILE;
      const G = new THREE.Group();
      G.position.set(x0 + w / 2, 0, z0 + d / 2);
      if (b.stadium) this.stadiumModel(G, b, w, d);
      else if (b.shroom) this.shroomHouse(G, b, w, d);
      else {
        const wallH = b.lab ? 2.4 : 2.0;
        const walls = inked(new THREE.BoxGeometry(w - 0.4, wallH, d - 0.5), toon(b.wall || 0xfff1d8), OL);
        walls.position.y = wallH / 2; G.add(walls);
        if (b.lab) {
          const roof = inked(new THREE.BoxGeometry(w - 0.1, 0.35, d - 0.2), toon(b.roof), OL);
          roof.position.y = wallH + 0.17; G.add(roof);
          const dish = inked(new THREE.SphereGeometry(0.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xd0d8e8), OL * 0.6);
          dish.rotation.x = -0.6; dish.position.set(w * 0.25, wallH + 0.7, 0); G.add(dish);
        } else {
          // gable roof: a triangle extruded along the house
          const sh = new THREE.Shape(); sh.moveTo(-d / 2 - 0.15, 0); sh.lineTo(0, 1.5); sh.lineTo(d / 2 + 0.15, 0); sh.closePath();
          const rg = new THREE.ExtrudeGeometry(sh, { depth: w - 0.1, bevelEnabled: false });
          rg.rotateY(Math.PI / 2); rg.translate(-(w - 0.1) / 2, 0, 0);
          const roof = inked(rg, toon(b.roof), OL); roof.position.y = wallH; G.add(roof);
          const ch = inked(new THREE.BoxGeometry(0.4, 0.9, 0.4), toon(0xc86a4a), OL * 0.6); ch.position.set(w * 0.25, wallH + 1.1, -d * 0.12); G.add(ch);
        }
        // door and windows on the south face
        const dx = (b.door + 0.5) * TILE - w / 2, front = d / 2 - 0.25;
        const door = inked(new THREE.BoxGeometry(0.9, 1.3, 0.12), toon(0x8a5a3a), OL * 0.5); door.position.set(dx, 0.65, front + 0.03); G.add(door);
        for (let k = 0; k < b.w; k++) if (k !== b.door) {
          const win = inked(new THREE.BoxGeometry(0.8, 0.7, 0.1), toon(0xbfe6ff, { rim: 0.9 }), OL * 0.5);
          win.position.set((k + 0.5) * TILE - w / 2, 1.25, front + 0.03); G.add(win);
        }
        if (b.heal) { const cr = inked(new THREE.BoxGeometry(0.9, 0.9, 0.1), toon(0xffffff), OL * 0.5); cr.position.set(dx, wallH - 0.1, front + 0.04); G.add(cr); const h = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.12), toon(0xff5a8a)); h.position.copy(cr.position); h.position.z += 0.03; G.add(h); const v2 = h.clone(); v2.rotation.z = Math.PI / 2; G.add(v2); }
      }
      this.group.add(G);
      this.doors.push({ x: b.x + b.door, y: b.y + b.h - 1, b });
    }
  }

  // Glowcap Hollow homes: a fat toadstool stem with a round door under a spotted glowing cap
  shroomHouse(G, b, w, d) {
    const rx = w / 2 - 0.45, rz = d / 2 - 0.55;
    const stem = inked(new THREE.CylinderGeometry(1, 1.08, 2.2, 24), toon(b.wall || 0xfff1d8), OL);
    stem.scale.set(rx, 1, rz); stem.position.y = 1.1; G.add(stem);
    const glow = new THREE.Color(b.roof).multiplyScalar(0.4).getHex();
    const cap = inked(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(b.roof, { emissive: glow, rim: 0.6 }), OL);
    const cx = rx + 0.55, cz = rz + 0.5, ch = 1.45;
    cap.scale.set(cx, ch, cz); cap.position.y = 2.05; G.add(cap);
    const under = new THREE.Mesh(new THREE.CircleGeometry(1, 24), toon(0xf4d8c8)); under.rotation.x = Math.PI / 2; under.scale.set(cx, cz, 1); under.position.y = 2.04; G.add(under);
    const dots = [];
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * Math.PI * 2 + 0.3, r = k % 2 ? 0.5 : 0.78, sp = new THREE.SphereGeometry(0.45, 10, 5); sp.scale(1, 1, 0.3);
      const nx = Math.cos(a) * r, nz = Math.sin(a) * r, ny = Math.sqrt(1 - r * r);
      sp.lookAt(new THREE.Vector3(nx * ch / cx, ny, nz * ch / cz)); sp.translate(nx * cx, 2.05 + ny * ch, nz * cz); dots.push(sp);
    }
    { const sp = new THREE.SphereGeometry(0.55, 10, 5); sp.scale(1, 0.3, 1); sp.translate(0, 2.05 + ch, 0); dots.push(sp); }
    G.add(inked(mergeGeometries(dots), toon(0xfff8e8, { emissive: 0x5a5048 }), 0)); dots.forEach((g) => g.dispose());
    const dx = (b.door + 0.5) * TILE - w / 2, front = rz * Math.sqrt(Math.max(0, 1 - (dx / rx) ** 2));
    const door = inked(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 16, 1, false, -Math.PI / 2, Math.PI), toon(0x8a5a3a), OL * 0.5);
    door.rotation.x = -Math.PI / 2; door.position.set(dx, 0.62, front + 0.05); G.add(door);
    const doorBox = inked(new THREE.BoxGeometry(1.0, 0.62, 0.12), toon(0x8a5a3a), OL * 0.5); doorBox.position.set(dx, 0.31, front + 0.05); G.add(doorBox);
    const win = inked(new THREE.CircleGeometry(0.32, 14), toon(0xfff0a0, { emissive: 0x8a7a30, rim: 0 }), 0);
    win.position.set(dx + (b.door === 0 ? 1.1 : -1.1), 1.35, front - 0.05); G.add(win);
    if (b.heal) { const cr = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.12), toon(0xff5a8a)); cr.position.set(dx, 1.55, front + 0.08); G.add(cr); const v2 = cr.clone(); v2.rotation.z = Math.PI / 2; G.add(v2); }
  }

  stadiumModel(G, b, w, d) {
    const cup = CUPS.find((c) => c.id === b.stadium);
    const stripes = canvasTex(256, 32, (c, W, H) => { for (let k = 0; k < 16; k++) { c.fillStyle = k % 2 ? '#fff4e0' : cup.color; c.fillRect(k * W / 16, 0, W / 16 + 1, H); } });
    stripes.userData.own = true;
    const wm = toon(0xffffff, { map: stripes }); wm.userData.own = true;
    const bowl = inked(new THREE.CylinderGeometry(1, 0.94, 2.6, 40, 1, true), wm, OL);
    bowl.scale.set(w / 2 - 0.2, 1, d / 2 - 0.1); bowl.position.y = 1.3; G.add(bowl);
    const rim = inked(new THREE.TorusGeometry(1, 0.08, 6, 48), toon(0xffd23f), 0);
    rim.rotation.x = Math.PI / 2; rim.scale.set(w / 2 - 0.2, d / 2 - 0.1, 1); rim.position.y = 2.6; G.add(rim);
    const field = new THREE.Mesh(new THREE.CircleGeometry(1, 40), toon(0x5ac24a)); field.rotation.x = -Math.PI / 2; field.scale.set(w / 2 - 0.4, d / 2 - 0.3, 1); field.position.y = 0.05; G.add(field);
    // arch over the gate
    const arch = inked(new THREE.TorusGeometry(0.9, 0.18, 8, 16, Math.PI), toon(0xffd23f), OL * 0.6); arch.position.set((b.door + 0.5) * TILE - w / 2, 1.6, d / 2 - 0.1); G.add(arch);
    const gate = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.6), toon(0x2a1630)); gate.position.set(arch.position.x, 0.8, d / 2 - 0.05); G.add(gate);
    // pennants
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2, px = Math.cos(a) * (w / 2 - 0.2), pz = Math.sin(a) * (d / 2 - 0.1);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 5), toon(0xffffff)); pole.position.set(px, 3.2, pz); G.add(pole);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4), toon(new THREE.Color(cup.color).getHex(), { side: THREE.DoubleSide })); fl.position.set(px + 0.35, 3.7, pz); G.add(fl);
    }
    // the cup's emblem on a sign over the gate
    const sign = canvasTex(256, 64, (c, W, H) => { c.fillStyle = '#2a1630'; c.beginPath(); c.roundRect(0, 0, W, H, 16); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(cup.name.toUpperCase(), W / 2, H / 2 + 2); });
    sign.userData.own = true;
    const sm = new THREE.MeshBasicMaterial({ map: sign, transparent: true }); sm.userData.own = true;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), sm); s.position.set((b.door + 0.5) * TILE - w / 2, 3.0, d / 2 + 0.05); G.add(s);
  }

  // ---------- NPCs, trainers, wild critters ----------
  buildActors() {
    this.npcs = [];
    const F = save.adv.flags;
    for (const n of this.M.npcs || []) {
      if (n.hideFlag && F[n.hideFlag]) continue;
      if (n.showFlag && !F[n.showFlag]) continue;
      let root, cr = null;
      if (n.pecan) { root = pecanModel(); root.scale.setScalar(CS); }
      else {
        const id = n.critter === '$hero' ? save.adv.hero : n.rival ? rivalFor(save.adv.hero) : n.critter;
        cr = new Critter(withGear(byId(id), n.rival ? (n.rlv || 4) : (n.lv || n.trainer?.lv || 3)));
        root = cr.root;
        root.scale.setScalar(CS * (n.scale || 1));
      }
      root.userData.critter = true;
      this.group.add(root);
      const a = { n, root, cr, x: n.x, y: n.y, dir: n.dir || 's', moveT: 0, from: null, wanderT: 1 + Math.random() * 3, home: [n.x, n.y] };
      this.setPos(a);
      this.npcs.push(a);
    }
    // wild critters you can see, roaming the tall grass
    this.wild = [];
    const W = this.M.wild;
    if (W?.roam) {
      const grass = [];
      for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) if (this.tile(x, y) === '"') grass.push([x, y]);
      for (let k = 0; k < W.roam && grass.length; k++) {
        const [x, y] = grass.splice(Math.floor(Math.random() * grass.length), 1)[0];
        this.spawnWild(x, y);
      }
    }
  }

  spawnWild(x, y) {
    const [id, lo, hi] = this.M.wild.list[Math.floor(Math.random() * this.M.wild.list.length)];
    const lv = lo + Math.floor(Math.random() * (hi - lo + 1));
    const cr = new Critter(withGear(byId(id), lv));
    cr.root.userData.critter = true;
    cr.root.scale.setScalar(CS * 0.9);
    this.group.add(cr.root);
    const a = { id, lv, cr, root: cr.root, x, y, dir: 's', moveT: 0, from: null, wanderT: 0.5 + Math.random() * 2, wild: true };
    this.setPos(a);
    this.wild.push(a);
  }

  removeNpc(id) {
    const a = this.npcs.find((n) => n.n.id === id);
    if (!a) return;
    this.group.remove(a.root);
    this.npcs.splice(this.npcs.indexOf(a), 1);
  }

  setPos(a) {
    const [px, pz] = wpos(a.x, a.y);
    a.root.position.set(px, 0, pz);
    a.root.rotation.y = YAW[a.dir];
  }

  occupied(x, y, self) {
    if (this.hero && self !== 'hero' && this.hx === x && this.hy === y) return 'hero';
    for (const a of this.npcs) if (a !== self && a.x === x && a.y === y) return a;
    for (const a of this.wild) if (a !== self && a.x === x && a.y === y) return a;
    return null;
  }

  walkable(x, y) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return false;
    return !this.solid.has(x + ',' + y);
  }

  // ---------- hero ----------
  placeHero() {
    const [px, pz] = wpos(this.hx, this.hy);
    this.hero.root.position.set(px, 0, pz);
    this.hero.root.rotation.y = YAW[this.dir];
  }

  tryMove(dir) {
    this.dir = dir;
    const [dx, dy] = DIRS[dir], nx = this.hx + dx, ny = this.hy + dy;
    // off the edge of the map: on to the next one
    if (nx < 0 || ny < 0 || nx >= this.W || ny >= this.H) {
      const e = this.M.edges?.[nx < 0 ? 'w' : nx >= this.W ? 'e' : ny < 0 ? 'n' : 's'];
      if (e && this.tile(this.hx, this.hy) !== 'T') { this.goTo(e, dir, nx, ny); return; }
      return this.bump();
    }
    const who = this.occupied(nx, ny, 'hero');
    if (who?.wild) { this.wildFight(who); return; }
    if (who || !this.walkable(nx, ny)) return this.bump();
    this.from = [this.hx, this.hy];
    this.hx = nx; this.hy = ny;
    this.moveT = STEP;
    const F = this.follower;
    if (F && (F.x !== this.from[0] || F.y !== this.from[1])) {
      F.dir = F.x < this.from[0] ? 'e' : F.x > this.from[0] ? 'w' : F.y < this.from[1] ? 's' : 'n';
      F.from = [F.x, F.y]; F.x = this.from[0]; F.y = this.from[1]; F.moveT = STEP;
    }
  }

  bump() {
    if (this.bumpT > 0) return;
    this.bumpT = 0.35;
    sfx.ui('back');
  }

  goTo(e, dir, nx, ny) {
    const M2 = MAPS[e.to];
    let x = nx, y = ny;
    if (dir === 'n') { x = nx + e.off; y = M2.tiles.length - 1; }
    if (dir === 's') { x = nx + e.off; y = 0; }
    if (dir === 'w') { x = M2.tiles[0].length - 1; y = ny + e.off; }
    if (dir === 'e') { x = 0; y = ny + e.off; }
    this.fade(() => this.load(e.to, x, y, dir));
  }

  fade(fn) {
    this.busy = true;
    const f = document.createElement('div');
    f.className = 'wd-fade';
    this.S.root.appendChild(f);
    setTimeout(() => { fn(); f.classList.add('out'); this.busy = false; setTimeout(() => f.remove(), 400); }, 260);
  }

  arrive() {
    // finished a step
    save.adv.x = this.hx; save.adv.y = this.hy; save.adv.dir = this.dir;
    save.adv.steps = (save.adv.steps || 0) + 1;
    if (save.adv.steps % 8 === 0) persist();
    this.steps++;
    this.encCool--;
    const t = this.tile(this.hx, this.hy);
    if (t === '"') {
      const [px, pz] = wpos(this.hx, this.hy);
      for (let k = 0; k < 5; k++) this.g.fx.spawn({ x: px + (Math.random() - 0.5), y: 0.4, z: pz + (Math.random() - 0.5), vy: 2 + Math.random() * 2, vx: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2, color: 0x3fae4a, size: 0.22, life: 0.5, shape: 'leaf', additive: false, grav: 6, rot: Math.random() * 6 });
      sfx.step?.();
      if (this.M.wild && this.encCool <= 0 && Math.random() < (this.M.wild.rate || 0.1)) { this.ambush(); return; }
    }
    if (this.storyCheck()) return;
    this.trainerCheck();
  }

  // ---------- update loop ----------
  update(dt) {
    this.t += dt;
    this.bumpT = (this.bumpT || 0) - dt;
    const inp = this.g.input;
    const act = inp.pressed.attack || inp.pressed.confirm || this.tapA;
    this.tapA = false;
    if (this.dialog) { if (act) this.dialog.next(); }
    else if (!this.busy) {
      if (this.moveT > 0) {
        this.moveT -= dt;
        if (this.moveT <= 0) { this.moveT = 0; this.from = null; this.placeHero(); this.arrive(); }
      }
      if (this.moveT <= 0 && !this.busy && !this.dialog) {
        const mx = inp.move.x, my = inp.move.y;
        if (Math.max(Math.abs(mx), Math.abs(my)) > 0.4) this.tryMove(Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'e' : 'w') : (my > 0 ? 'n' : 's'));
        else if (act) this.interact();
      }
    }
    // hero position and walk cycle
    const H = this.hero, P = H.pose;
    H.resetPose();
    if (this.from) {
      const k = 1 - this.moveT / STEP, [ax, az] = wpos(...this.from), [bx, bz] = wpos(this.hx, this.hy);
      H.root.position.set(ax + (bx - ax) * k, 0, az + (bz - az) * k);
      walkPose(P, this.t);
    } else idlePose(P, this.t);
    H.root.rotation.y = turnTo(H.root.rotation.y, YAW[this.dir], dt * 18);
    H.update(dt);
    this.updateActors(dt);
    this.updateFollower(dt);
    // fireflies drift up out of the woods around the hero
    if (this.M.fireflies && Math.random() < dt * 9) {
      const p = this.hero.root.position;
      this.g.fx.spawn({ x: p.x + (Math.random() - 0.5) * 24, y: 0.4 + Math.random() * 2.2, z: p.z + (Math.random() - 0.7) * 16, vx: (Math.random() - 0.5) * 0.6, vy: 0.2 + Math.random() * 0.3, vz: (Math.random() - 0.5) * 0.6, color: Math.random() < 0.7 ? 0xd8ff6a : 0x8affe0, size: 0.28, life: 2.6, shape: 'glow', fadeIn: 0.3, hold: 0.5 });
    }
    if (this.brambleT > 0 && this.brambles) {
      this.brambleT -= dt;
      const k = Math.max(0, this.brambleT / 1.2), c = this.brambles.userData.c;
      this.brambles.scale.set(k, k * k, k); this.brambles.position.set(c.x * (1 - k), 0, c.z * (1 - k));
      if (this.brambleT <= 0) { this.brambles.visible = false; }
    }
    // water ripples drift
    if (this.waterTex) this.waterTex.offset.set(this.t * 0.02, this.t * 0.03);
    this.updateCamera(dt);
  }

  updateActors(dt) {
    for (const a of [...this.npcs, ...this.wild]) {
      if (a.cr) {
        const P = a.cr.pose; a.cr.resetPose();
        if (a.from) {
          a.moveT -= dt;
          const k = 1 - Math.max(0, a.moveT) / (a.wild ? STEP * 1.6 : STEP * 1.3), [ax, az] = wpos(...a.from), [bx, bz] = wpos(a.x, a.y);
          a.root.position.set(ax + (bx - ax) * k, 0, az + (bz - az) * k);
          walkPose(P, this.t + (a.wild ? 0.5 : 0));
          if (a.moveT <= 0) { a.from = null; this.setPos(a); if (a.arrived) { const f = a.arrived; a.arrived = null; f(); } }
        } else if (a.n?.story === 'boulder') { // fast asleep across the bridge
          P.sy = 0.85 + Math.sin(this.t * 1.4) * 0.05; P.lean = -0.25; P.armLz = P.armRz = 0.1; P.head = 0.25;
          a.cr.emote('closed', 'o', 0.2);
          if (Math.random() < dt * 0.8) this.g.fx.text?.({ x: a.root.position.x + 0.5, y: 2.6, z: a.root.position.z }, 'z', 'zz');
        } else idlePose(P, this.t + a.x);
        if (a.excl > 0) { a.excl -= dt; P.y = Math.max(P.y, Math.sin(Math.min(1, 1 - a.excl) * Math.PI) * 0.4); }
        a.root.rotation.y = turnTo(a.root.rotation.y, YAW[a.dir], dt * 14);
        a.cr.update(dt);
      } else {
        // Pecan: gentle bob
        a.root.position.y = Math.abs(Math.sin(this.t * 2.2)) * 0.08;
        a.root.rotation.y = turnTo(a.root.rotation.y, YAW[a.dir], dt * 10);
      }
      if (this.busy || this.dialog || a.from || a.walking) continue;
      // wandering: town folk shuffle near home; wild critters roam their grass
      a.wanderT -= dt;
      if ((a.n?.wander || a.wild) && a.wanderT <= 0) {
        a.wanderT = (a.wild ? 0.8 : 2) + Math.random() * 2.5;
        const ds = Object.keys(DIRS), d = ds[Math.floor(Math.random() * 4)], [dx, dy] = DIRS[d], nx = a.x + dx, ny = a.y + dy;
        a.dir = d;
        if (a.wild) {
          if (nx === this.hx && ny === this.hy && !this.moveT) { this.wildFight(a); return; }
          if (this.tile(nx, ny) !== '"' || this.occupied(nx, ny, a)) continue;
        } else {
          if (Math.abs(nx - a.home[0]) + Math.abs(ny - a.home[1]) > a.n.wander || !this.walkable(nx, ny) || this.occupied(nx, ny, a) || (this.from && this.from[0] === nx && this.from[1] === ny)) continue;
        }
        a.from = [a.x, a.y]; a.x = nx; a.y = ny; a.moveT = a.wild ? STEP * 1.6 : STEP * 1.3;
      }
    }
  }

  updateFollower(dt) {
    const F = this.follower; if (!F) return;
    const P = F.cr.pose; F.cr.resetPose();
    if (F.from) {
      F.moveT -= dt;
      const k = 1 - Math.max(0, F.moveT) / STEP, [ax, az] = wpos(...F.from), [bx, bz] = wpos(F.x, F.y);
      F.root.position.set(ax + (bx - ax) * k, 0, az + (bz - az) * k);
      walkPose(P, this.t + 0.3);
      if (F.moveT <= 0) { F.from = null; this.setPos(F); }
    } else { idlePose(P, this.t + 1); P.y = Math.abs(Math.sin(this.t * 3)) * 0.1; if (!this.from) F.dir = F.x < this.hx ? 'e' : F.x > this.hx ? 'w' : F.y < this.hy ? 's' : 'n'; }
    F.root.rotation.y = turnTo(F.root.rotation.y, YAW[F.dir], dt * 14);
    F.cr.update(dt);
  }

  updateCamera(dt) {
    const cam = this.g.camera, p = this.hero.root.position;
    const port = cam.aspect < 1;
    const H = port ? 21 : 17, D = port ? 10 : 11.5;
    const want = new THREE.Vector3(p.x, H, p.z + D);
    if (!this.camAt) this.camAt = want.clone(); else this.camAt.lerp(want, 1 - Math.exp(-dt * 8));
    cam.position.copy(this.camAt);
    cam.lookAt(this.camAt.x, 0.4, this.camAt.z - D + (port ? 0.6 : 0.3));
    // portrait keeps about the same width of world in view as landscape shows in height
    cam.fov = port ? Math.min(80, 2 * Math.atan(Math.tan(0.38) / cam.aspect) * 180 / Math.PI) : 40; cam.updateProjectionMatrix();
    // the sun's shadow box follows the hero
    const sun = this.g.arena.sun;
    sun.position.set(p.x - 8, 26, p.z + 10); sun.target.position.set(p.x, 0, p.z);
    const fill = this.g.arena.fill; fill.position.copy(cam.position); fill.target.position.set(p.x, 0, p.z);
  }

  // ---------- interaction ----------
  front() { const [dx, dy] = DIRS[this.dir]; return [this.hx + dx, this.hy + dy]; }

  interact() {
    const [fx, fy] = this.front();
    const a = this.occupied(fx, fy, 'hero');
    if (a && a.n) return this.talk(a);
    const sign = (this.M.signs || []).find((s) => s.x === fx && s.y === fy);
    if (sign) return this.say([sign.text], null, '📜 Sign');
    const door = this.doors.find((d) => d.x === fx && d.y === fy);
    if (door && this.dir === 'n') return this.S.worldDoor(door.b, this);
  }

  talk(a) {
    const n = a.n;
    a.dir = { n: 's', s: 'n', e: 'w', w: 'e' }[this.dir];
    if (n.story) return this.S.worldStory(n.story, this, a);
    if (n.trainer) {
      if (save.adv.flags[n.id]) return this.say([n.trainer.after], null, n.name);
      return this.challenge(a);
    }
    this.say(n.lines.map((l) => l), null, n.name);
  }

  // ---------- dialogue box (Red/Blue style, bottom of the screen) ----------
  say(lines, done, who = '') {
    const hero = heroDef().name;
    lines = lines.map((l) => l.replaceAll('{hero}', hero).replaceAll('{name}', save.trainer?.name || 'Trainer'));
    this.dialogEl?.remove();
    const el = this.dialogEl = document.createElement('div');
    el.className = 'wd-box';
    el.innerHTML = '<small></small><p></p><i class="wd-more">▼</i>';
    this.S.root.appendChild(el);
    const p = el.querySelector('p'), sm = el.querySelector('small');
    let k = 0, timer = null, full = '';
    const show = () => {
      let line = lines[k], name = who;
      const m = /^([^:]{1,20}): (.*)$/s.exec(line);
      if (m) { name = m[1]; line = m[2]; }
      sm.textContent = name; sm.style.display = name ? '' : 'none';
      full = line; let i = 0; p.textContent = '';
      clearInterval(timer);
      timer = setInterval(() => { p.textContent = full.slice(0, ++i); if (i % 3 === 0) sfx.ui('move'); if (i >= full.length) clearInterval(timer); }, 18);
    };
    const D = this.dialog = {
      next: () => {
        if (p.textContent !== full) { clearInterval(timer); p.textContent = full; return; }
        k++;
        if (k < lines.length) return show();
        clearInterval(timer); el.remove(); this.dialog = null; this.dialogEl = null;
        this.g.input._queued = {}; // the closing tap mustn't also act in the world
        done?.();
      },
    };
    el.addEventListener('pointerdown', (e) => { e.stopPropagation(); D.next(); });
    show();
  }

  // a trainer spots the hero: "!" then they walk up and challenge
  trainerCheck() {
    for (const a of this.npcs) {
      const T = a.n.trainer;
      if (!T || save.adv.flags[a.n.id]) continue;
      const [dx, dy] = DIRS[a.dir];
      for (let k = 1; k <= T.sight; k++) {
        const x = a.x + dx * k, y = a.y + dy * k;
        if (x === this.hx && y === this.hy) { this.spotted(a, k - 1); return true; }
        if (!this.walkable(x, y) || this.occupied(x, y, a)) break;
      }
    }
    return false;
  }

  spotted(a, steps, then) {
    this.busy = true;
    a.excl = 1; a.walking = true;
    sfx.warn?.();
    this.bubble(a, '❗');
    this.dir = { n: 's', s: 'n', e: 'w', w: 'e' }[a.dir];
    const walk = (n) => {
      if (n <= 0) { a.walking = false; this.busy = false; return then ? then() : this.challenge(a); }
      const [dx, dy] = DIRS[a.dir];
      a.from = [a.x, a.y]; a.x += dx; a.y += dy; a.moveT = STEP * 1.3;
      a.arrived = () => walk(n - 1);
    };
    setTimeout(() => walk(steps), 700);
  }

  bubble(a, txt) {
    const el = document.createElement('div');
    el.className = 'wd-bubble';
    el.textContent = txt;
    this.S.root.appendChild(el);
    const v = new THREE.Vector3(), cam = this.g.camera;
    const place = () => {
      if (!el.isConnected) return;
      v.copy(a.root.position); v.y += 2.4; v.project(cam);
      el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
      requestAnimationFrame(place);
    };
    place();
    setTimeout(() => el.remove(), 1100);
  }

  challenge(a) {
    const n = a.n, T = n.trainer;
    this.say([T.intro], () => this.S.worldFight({
      foe: withGear(byId(n.critter), T.lv), lv: T.lv, kind: 'trainer', flag: n.id, name: n.name,
      trainer: { name: n.name, critter: n.critter, beat: T.beat.replace(/^[^:]+: /, ''), gloat: 'Better luck next time!' },
      diff: 0.3,
    }), n.name);
  }

  // a wild critter jumps out of the tall grass
  ambush() {
    const W = this.M.wild, [id, lo, hi] = W.list[Math.floor(Math.random() * W.list.length)];
    const lv = lo + Math.floor(Math.random() * (hi - lo + 1));
    this.encCool = 6;
    this.startWild(id, lv);
  }

  wildFight(a) {
    if (this.busy) return;
    this.wild.splice(this.wild.indexOf(a), 1);
    a.excl = 1;
    this.startWild(a.id, a.lv, a);
  }

  startWild(id, lv, a) {
    this.busy = true;
    sfx.warn?.();
    if (a) this.bubble(a, '❗');
    const foe = withGear(byId(id), lv);
    this.S.root.querySelector('.wd-flash')?.remove();
    const f = document.createElement('div'); f.className = 'wd-flash'; this.S.root.appendChild(f);
    setTimeout(() => this.S.worldFight({ foe, lv, kind: 'wild', name: `Wild ${foe.name}`, diff: 0.18 + lv * 0.03 }), 900);
  }

  storyCheck() { return this.S.worldStoryStep?.(this) || false; }

  banner(text) {
    this.S.root.querySelector('.wd-banner')?.remove();
    const b = document.createElement('div');
    b.className = 'wd-banner'; b.textContent = text;
    this.S.root.appendChild(b);
    setTimeout(() => b.remove(), 2600);
  }
}

function turnTo(a, b, k) {
  let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * Math.min(1, k);
}

function walkPose(P, t) {
  const f = t * 15, s = Math.sin(f), b = Math.abs(Math.cos(f));
  P.y = b * 0.12; P.sy = 0.94 + b * 0.1; P.sx = 1.03 - b * 0.05;
  P.lean = 0.12; P.roll = s * 0.06;
  P.legL = s * 0.8; P.legR = -s * 0.8;
  P.armLx = -s * 0.9; P.armRx = s * 0.9;
  P.ear = 0.3; P.tail = 0.7;
}

function idlePose(P, t) {
  P.sy = 1 + Math.sin(t * 2.4) * 0.025; P.sx = 1 - Math.sin(t * 2.4) * 0.015;
  P.armLz = P.armRz = 0.25; P.tail = 0.5 + Math.sin(t * 1.7) * 0.3;
  P.headRoll = Math.sin(t * 0.9) * 0.06;
}

// Professor Pecan in the world: a round acorn with a cap, a stem and a lab-coat collar
function pecanModel() {
  const G = new THREE.Group();
  const body = inked(new THREE.SphereGeometry(0.55, 20, 14), toon(0xc98a4a), OL);
  body.scale.set(1, 1.1, 1); body.position.y = 0.62; G.add(body);
  const cap = inked(new THREE.SphereGeometry(0.6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x7a4a2a), OL);
  cap.position.y = 0.92; G.add(cap);
  const stem = inked(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6), toon(0x5a3a1a), OL * 0.5); stem.position.y = 1.6; G.add(stem);
  const coat = inked(new THREE.CylinderGeometry(0.5, 0.58, 0.45, 20, 1, true), toon(0xffffff, { side: THREE.DoubleSide }), OL * 0.6); coat.position.y = 0.3; G.add(coat);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), toon(0x2a1630)); eye.position.set(s * 0.18, 0.78, 0.5); G.add(eye);
    const gl = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 16), toon(0x2a1630)); gl.position.set(s * 0.18, 0.78, 0.53); G.add(gl);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 6, 12, Math.PI), toon(0x2a1630)); smile.rotation.z = Math.PI; smile.position.set(0, 0.6, 0.55); G.add(smile);
  G.traverse((o) => { if (o.isMesh) o.castShadow = !o.userData.hull; });
  return G;
}
