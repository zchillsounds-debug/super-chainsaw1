// Adventure mode: a Red/Blue style tile world drawn with the game's 3D toon look.
// The hero (the critter the player picked) walks tile by tile; tall grass hides wild critters,
// some roam in plain sight; trainers spot you from a distance; stadiums are the gyms.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, inked, canvasTex } from './toon.js';
import { Critter, roleHat } from './critters.js';
import { CRITTERS, CUPS, withGear, skinned } from './data.js';
import { save, persist, grantXp, xpNeeded } from './save.js';
import { sfx, playMusic } from './audio.js';
import { rivalFor } from './worldmaps.js';
import { getMap } from './interiors.js';
import { ARENAS } from './arena.js';

export const TILE = 2;
const DIRS = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const YAW = { n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 };
// clock-of-day lighting for outdoor maps without their own mood
const PHASES = {
  day: null,
  evening: { sun: 0xffc896, sunI: 2.3, sky: 0xffe2cc, gnd: 0x6a5a48, hemiI: 1.05, fog: 0xffd8b8 },
  night: { sun: 0xbcc8ff, sunI: 1.3, sky: 0x8e9ad8, gnd: 0x3a4060, hemiI: 1.0, fog: 0x4a5888 },
};
const RAIN = {
  day: { sun: 0xb8c4dc, sunI: 0.85, sky: 0xaab8d0, gnd: 0x3a4a50, hemiI: 0.9, fog: 0x9aa8b8 },
  evening: { sun: 0xd0a898, sunI: 0.9, sky: 0xb0a4b8, gnd: 0x3a3a48, hemiI: 0.85, fog: 0x8a8898 },
};
const LIT = new THREE.MeshBasicMaterial({ color: 0xffd870 }); // a lamp-lit window at night

const STEP = 0.23; // seconds per tile
const SHINY_RATE = 1 / 30; // a rare shiny wild critter: beat it to unlock its shiny palette
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

  // swap the walking buddy without reloading the map
  refreshFollower() {
    if (this.follower) this.group.remove(this.follower.root);
    this.makeFollower();
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
    const M = this.M = getMap(key) || getMap('village');
    if (M !== getMap(key)) { key = 'village'; x = 4; y = 6; }
    this.key = key;
    this.W = M.tiles[0].length; this.H = M.tiles.length;
    this.group = new THREE.Group();
    this.g.scene.add(this.group);
    this.solid = new Set();
    const rand = rng(hash(key));
    // the phone's clock tints outdoor maps that have no mood of their own: golden evenings, soft blue nights
    const hr = save.adv.clock ?? new Date().getHours();
    this.phase = M.indoor || M.mood ? 'day' : hr >= 17 && hr < 20 ? 'evening' : hr >= 20 || hr < 6 ? 'night' : 'day';
    // now and then a shower rolls over the grassy outdoor maps (the same few hours for everyone, picked from the date)
    const d = new Date(), slot = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${Math.floor(hr / 3)}`;
    this.rain = !M.indoor && !M.mood && !M.city && !M.snow && !M.lava && M.border !== 'cloud' && (save.adv.rain ?? hash(slot + key) % 5 === 0);
    const shut = M.bramble && !save.adv.flags[M.bramble];
    for (let ty = 0; ty < this.H; ty++) for (let tx = 0; tx < this.W; tx++) {
      const t = this.tile(tx, ty);
      if ('TP~#RhmvlWCXQDOK'.includes(t) || (t === 'B' && shut)) this.solid.add(tx + ',' + ty);
    }
    for (const s of M.signs || []) this.solid.add(s.x + ',' + s.y);
    this.buildGround(rand);
    this.buildTrees(rand);
    this.buildGrass(rand);
    this.buildProps(rand);
    this.buildForest(rand);
    this.buildVolcano(rand);
    this.buildBuildings();
    this.buildInterior();
    this.buildActors();
    // hero
    this.hero = new Critter(heroDef());
    this.hero.root.scale.setScalar(CS);
    this.group.add(this.hero.root);
    this.hx = x; this.hy = y; this.dir = dir; this.moveT = 0; this.from = null;
    this.placeHero();
    this.buildItems(x, y);
    this.makeFollower();
    this.camAt = null;
    this.steps = 0;
    this.encCool = 4;
    save.adv.map = key; save.adv.x = x; save.adv.y = y; save.adv.dir = dir;
    if (!key.startsWith('in:')) (save.adv.seen ||= {})[key] = true;
    persist();
    playMusic(M.music || 'camp');
    this.mood(M.mood || (this.rain && RAIN[this.phase]) || PHASES[this.phase]);
    this.banner(M.name + (this.rain ? ' 🌧️' : ''));
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
    this.group = null; this.grassGeo = null; this.prints = null;
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
        if (t === 'R' || t === 'l' || t === 'v') { // lone props sit on whatever ground surrounds them (no grass squares on the beach)
          const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => this.tile(x + dx, y + dy));
          if (n.filter((k) => k === 's' || k === 'P').length >= 2) t = 's';
          else if (n.filter((k) => k === 'i').length >= 2) t = 'i'; // boulders frozen into the ice lake sit on ice, not snow squares
        }
        c.fillStyle = (x + y) % 2 ? C.a : C.b;
        c.fillRect(x * P, y * P, P, P);
        if (t === '"') { // tall-grass patches round off at their outer corners
          const o = (dx, dy) => this.tile(x + dx, y + dy) !== '"', rr = 10;
          c.fillStyle = C.tall; c.beginPath(); c.roundRect(x * P, y * P, P, P, [o(-1, 0) && o(0, -1) ? rr : 0, o(1, 0) && o(0, -1) ? rr : 0, o(1, 0) && o(0, 1) ? rr : 0, o(-1, 0) && o(0, 1) ? rr : 0]); c.fill();
        }
        if (this.M.indoor) { // wooden floorboards, staggered seams
          c.strokeStyle = 'rgba(90,50,20,0.3)'; c.lineWidth = 1.5;
          for (let k = 0; k < 2; k++) { const sy = y * P + k * P / 2; c.beginPath(); c.moveTo(x * P, sy); c.lineTo(x * P + P, sy); c.stroke(); const sx = x * P + ((y * 2 + k) % 3) * P / 3; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx, sy + P / 2); c.stroke(); }
        }
        if (t === 'i') {
          const o = (dx, dy) => !'iR'.includes(this.tile(x + dx, y + dy)), rr = 10; // ice sheets round off at their outer corners
          c.fillStyle = C.ice || '#b8e4ff'; c.beginPath(); c.roundRect(x * P, y * P, P, P, [o(-1, 0) && o(0, -1) ? rr : 0, o(1, 0) && o(0, -1) ? rr : 0, o(1, 0) && o(0, 1) ? rr : 0, o(-1, 0) && o(0, 1) ? rr : 0]); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x * P + ((x * 7 + y * 3) % 3) * 8 + 4, y * P + 3, 3, P - 6); // a glint
          c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2;
          for (let k = 0; k < 2; k++) { const gx = x * P + 4 + rand() * (P - 12), gy = y * P + 4 + rand() * (P - 12); c.beginPath(); c.moveTo(gx, gy + 6); c.lineTo(gx + 6, gy); c.stroke(); }
        }
        if (t === '~' || t === '=') { // the muddy bank, rounded at outer corners like the water on top
          const dry = (dx, dy) => { const X = x + dx, Y = y + dy; return X < 0 || Y < 0 || X >= W || Y >= H ? this.M.outer === undefined : !'~='.includes(this.tile(X, Y)); };
          const rr = 9, q = [dry(-1, 0) && dry(0, -1) ? rr : 0, dry(1, 0) && dry(0, -1) ? rr : 0, dry(1, 0) && dry(0, 1) ? rr : 0, dry(-1, 0) && dry(0, 1) ? rr : 0];
          c.fillStyle = C.bank || '#8a7a5a'; c.beginPath(); c.roundRect(x * P, y * P, P, P, q); c.fill();
          // inner corners: where the water bends round a dry corner, the bank fills it in with a curve instead of a notch
          for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) if (!dry(dx, 0) && !dry(0, dy) && dry(dx, dy)) {
            const r = 8, X = (x + (dx > 0)) * P, Y = (y + (dy > 0)) * P, cx = X + dx * r, cy = Y + dy * r;
            const a0 = Math.atan2(0, -dx), a1 = Math.atan2(-dy, 0), d = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
            c.beginPath(); c.moveTo(X, Y); c.lineTo(cx - dx * r, cy); c.arc(cx, cy, r, a0, a1, d < 0); c.closePath(); c.fill();
          }
        }
        if (t === 's' || t === 'P') { // sand rounds off where it meets grass on two sides
          const g = (dx, dy) => { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) return false; const k = this.tile(X, Y); return !'sP~=RlvhB'.includes(k) || (k === 'h' && !'sP'.includes(under(X, Y))); }, rr = 10;
          c.fillStyle = (x + y) % 2 ? '#f4dc9a' : '#f1d894'; c.beginPath(); c.roundRect(x * P, y * P, P, P, [g(-1, 0) && g(0, -1) ? rr : 0, g(1, 0) && g(0, -1) ? rr : 0, g(1, 0) && g(0, 1) ? rr : 0, g(-1, 0) && g(0, 1) ? rr : 0]); c.fill(); for (let k = 0; k < 6; k++) { c.fillStyle = rand() < 0.5 ? 'rgba(190,140,70,0.35)' : 'rgba(255,255,235,0.6)'; c.fillRect(x * P + rand() * P, y * P + rand() * P, 2, 2); } }
      }
      // a doormat on the way out
      if (this.M.exit) { const dx = this.M.enter.x * P, dy = (H - 1) * P; c.fillStyle = '#8a3a2a'; c.beginPath(); c.roundRect(dx + 3, dy + 4, P - 6, P - 8, 4); c.fill(); c.fillStyle = '#ffd84d'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('▼', dx + P / 2, dy + P / 2 + 5); }
      // a rug over the Y tiles
      const rug = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.tile(x, y) === 'Y') rug.push([x, y]);
      if (rug.length) {
        const x0 = Math.min(...rug.map((r) => r[0])) * P, y0 = Math.min(...rug.map((r) => r[1])) * P, x1 = (Math.max(...rug.map((r) => r[0])) + 1) * P, y1 = (Math.max(...rug.map((r) => r[1])) + 1) * P;
        c.fillStyle = this.M.rug; c.beginPath(); c.roundRect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4, 8); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3; c.setLineDash([6, 5]); c.beginPath(); c.roundRect(x0 + 8, y0 + 8, x1 - x0 - 16, y1 - y0 - 16, 5); c.stroke(); c.setLineDash([]);
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
      // at dusk and after dark, lamplight spills out of every doorway onto the ground
      if (this.phase !== 'day') for (const b of this.M.buildings || []) {
        const x = (b.x + b.door + 0.5) * P, y = (b.y + b.h) * P + 4, g = c.createRadialGradient(x, y, 2, x, y, P * 1.3);
        g.addColorStop(0, `rgba(255,214,120,${this.phase === 'night' ? 0.8 : 0.45})`); g.addColorStop(1, 'rgba(255,220,140,0)');
        c.fillStyle = g; c.fillRect(x - P * 1.4, y - P * 1.4, P * 2.8, P * 2.8);
      }
      // starfish and shells washed up on the sand (their own dice, so nothing else on the map moves)
      const br = rng(hash(this.key + ':beach'));
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.tile(x, y) === 's' && br() < 0.1) {
        const px = x * P + 6 + br() * 20, py = y * P + 6 + br() * 20;
        c.save(); c.translate(px, py); c.rotate(br() * 6); c.scale(1.3, 1.3);
        if (br() < 0.5) { c.fillStyle = ['#ff7a5a', '#ff9a4a', '#ff6a8a'][Math.floor(br() * 3)]; c.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 2.5 : 6.5; c.lineTo(Math.cos(k * Math.PI / 5) * r, Math.sin(k * Math.PI / 5) * r); } c.closePath(); c.fill(); }
        else { c.fillStyle = '#fff4e4'; c.beginPath(); c.moveTo(0, 4); c.arc(0, 0, 5, Math.PI * 0.15, Math.PI * 0.85, true); c.closePath(); c.fill(); c.strokeStyle = '#e0b090'; c.lineWidth = 1; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(0, 4); c.lineTo(k * 2.5, -4); c.stroke(); } }
        c.restore();
      }
      // puddles collect on the paths in the rain
      const pr = rng(hash(this.key + ':rain')); // its own dice, so a rainy day doesn't shuffle the trees
      if (this.rain) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.tile(x, y) === ':' && pr() < 0.28) {
        const px = x * P + 8 + pr() * 16, py = y * P + 8 + pr() * 16, rx = 9 + pr() * 6, ry = 5 + pr() * 3;
        c.fillStyle = 'rgba(96,116,150,0.6)'; c.beginPath(); c.ellipse(px, py, rx, ry, pr() * 0.6, 0, 7); c.fill();
        c.fillStyle = 'rgba(220,235,255,0.55)'; c.beginPath(); c.ellipse(px - rx * 0.3, py - ry * 0.35, rx * 0.35, ry * 0.25, 0, 0, 7); c.fill();
      }
      // grass speckles and flowers
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const t = this.tile(x, y);
        if ('.fTmgB'.includes(t) && !this.M.indoor) for (let k = 0; k < 5; k++) { c.fillStyle = rand() < 0.5 ? C.dark : C.lite; c.fillRect(x * P + rand() * P, y * P + rand() * P, 2, 4); }
        if (t === 'l') {
          const g = c.createRadialGradient(x * P + P / 2, y * P + P / 2, 2, x * P + P / 2, y * P + P / 2, P * 1.6);
          g.addColorStop(0, 'rgba(255,230,160,0.55)'); g.addColorStop(1, 'rgba(255,230,160,0)');
          c.fillStyle = g; c.fillRect(x * P - P * 1.5, y * P - P * 1.5, P * 4, P * 4);
        }
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
    // water: each tile pulls in from dry neighbours so ponds have a muddy bank, not a hard square edge
    const wet = (x, y) => x < 0 || y < 0 || x >= W || y >= H ? this.M.outer === undefined ? false : true : '~='.includes(this.tile(x, y));
    const pads = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.tile(x, y) === '~' || this.tile(x, y) === '=') {
      const i = 0.22, l = wet(x - 1, y) ? 0 : i, r = wet(x + 1, y) ? 0 : i, t = wet(x, y - 1) ? 0 : i, b = wet(x, y + 1) ? 0 : i;
      // outer corners (dry on both sides) are rounded so ponds and rivers don't look like cut-out squares
      const R = 0.75, x0 = x * TILE + l, x1 = (x + 1) * TILE - r, z0 = y * TILE + t, z1 = (y + 1) * TILE - b;
      const rTL = l && t ? R : 0, rTR = r && t ? R : 0, rBR = r && b ? R : 0, rBL = l && b ? R : 0;
      let g;
      if (rTL + rTR + rBR + rBL) {
        const sh = new THREE.Shape(); // shape y = -z
        sh.moveTo(x0 + rBL, -z1); sh.lineTo(x1 - rBR, -z1); if (rBR) sh.quadraticCurveTo(x1, -z1, x1, -z1 + rBR);
        sh.lineTo(x1, -z0 - rTR); if (rTR) sh.quadraticCurveTo(x1, -z0, x1 - rTR, -z0);
        sh.lineTo(x0 + rTL, -z0); if (rTL) sh.quadraticCurveTo(x0, -z0, x0, -z0 - rTL);
        sh.lineTo(x0, -z1 + rBL); if (rBL) sh.quadraticCurveTo(x0, -z1, x0 + rBL, -z1);
        g = new THREE.ShapeGeometry(sh, 4); g.rotateX(-Math.PI / 2); g.translate(0, 0.06, 0);
        // match the plane's 0..1 UVs per tile so the ripple texture lines up
        const P = g.attributes.position, U = g.attributes.uv;
        for (let k = 0; k < P.count; k++) U.setXY(k, (P.getX(k) - x * TILE) / TILE, 1 - (P.getZ(k) - y * TILE) / TILE);
      } else { g = new THREE.PlaneGeometry(TILE - l - r, TILE - t - b); g.rotateX(-Math.PI / 2); g.translate(x * TILE + 1 + (l - r) / 2, 0.06, y * TILE + 1 + (t - b) / 2); }
      water.push(g);
      // inner corners: a curved fillet so the water rounds the dry corner instead of stepping round it
      for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) if (wet(x + dx, y) && wet(x, y + dy) && !wet(x + dx, y + dy)) {
        const c = 0.5, r = c + i, X = (x + (dx > 0)) * TILE, Z = (y + (dy > 0)) * TILE, cx = X + dx * c, cz = Z + dy * c;
        const pts = [[X - dx * i, Z - dy * i]];
        for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI / 2; pts.push([cx - dx * r * Math.cos(a), cz - dy * r * Math.sin(a)]); }
        const pos = [], uv = [], nor = [], idx = [];
        for (const [px, pz] of pts) { pos.push(px, 0.06, pz); nor.push(0, 1, 0); uv.push((px - x * TILE) / TILE, 1 - (pz - y * TILE) / TILE); }
        for (let k = 1; k < pts.length - 1; k++) {
          const [ax, az] = pts[0], [bx, bz] = pts[k], [qx, qz] = pts[k + 1];
          (bz - az) * (qx - ax) - (bx - ax) * (qz - az) > 0 ? idx.push(0, k, k + 1) : idx.push(0, k + 1, k);
        }
        const f = new THREE.BufferGeometry(); f.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); f.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); f.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); f.setIndex(idx);
        water.push(f);
      }
      if (this.M.pads && this.tile(x, y) === '~' && rand() < 0.45) {
        const p = new THREE.CylinderGeometry(0.42, 0.42, 0.05, 12, 1, false, 0.4, Math.PI * 1.8); p.translate(x * TILE + 0.5 + rand(), 0.1, y * TILE + 0.5 + rand()); pads.push(p);
      }
    }
    if (pads.length) { this.group.add(inked(mergeGeometries(pads), toon(0x4cba6a, { rim: 0.4 }), OL * 0.4)); pads.forEach((g) => g.dispose()); }
    if (water.length) {
      const lava = this.M.lava;
      const wt = canvasTex(128, 128, (c, w, h) => {
        c.fillStyle = this.M.palette?.water || '#4aa8f0'; c.fillRect(0, 0, w, h);
        if (lava) { // glowing cracks between dark cooling crust plates
          c.fillStyle = 'rgba(255,230,120,0.7)'; for (let k = 0; k < 9; k++) { c.beginPath(); c.arc((k * 41) % w, (k * 67) % h, 6 + (k % 3) * 3, 0, 7); c.fill(); }
          c.fillStyle = 'rgba(70,20,10,0.55)'; for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse((k * 53 + 20) % w, (k * 29 + 10) % h, 14, 8, k, 0, 7); c.fill(); }
          return;
        }
        c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 3;
        for (let k = 0; k < 7; k++) { const x = (k * 37) % w, y = (k * 53) % h; c.beginPath(); c.arc(x, y, 9, 0.2, 2.6); c.stroke(); }
      }, { repeat: [1, 1] });
      wt.userData.own = true;
      const m = lava ? new THREE.MeshBasicMaterial({ map: wt, color: 0xffb080 }) : toon(0xffffff, { map: wt, rim: 0.2 });
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
      if (this.M.snow) { const c = new THREE.SphereGeometry(0.62 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.4); c.scale(1, 0.7, 1); c.translate(px + jx, 2.62 * s, pz + jz); caps.push(c); }
    };
    const caps = [];
    const fronds = [], ptrunks = [], nuts = [], puffs = [];
    const puff = (x, y, s = 1) => {
      const [px, pz] = wpos(x, y);
      for (let k = 0; k < 3; k++) { const g = new THREE.IcosahedronGeometry((0.7 + rand() * 0.6) * s, 1); g.scale(1, 0.6, 1); g.translate(px + (rand() - 0.5) * 1.6, -0.2 + rand() * 0.5, pz + (rand() - 0.5) * 1.6); puffs.push(g); }
    };
    const palm = (x, y) => {
      const [px, pz] = wpos(x, y), s = 0.9 + rand() * 0.25, lean = (rand() - 0.5) * 0.5;
      const pts = []; for (let k = 0; k <= 6; k++) pts.push(new THREE.Vector3(px + Math.sin(k / 6 * 1.2) * lean, k / 6 * 3.2 * s, pz));
      const tr = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.18 * s, 6); ptrunks.push(tr);
      const top = pts[6], n = 7 + Math.floor(rand() * 2);
      for (let k = 0; k < n; k++) {
        const f = frond(s * (0.9 + rand() * 0.3), k % 3 === 0 ? 0.5 : 0.25 + rand() * 0.15);
        f.rotateY(k / n * Math.PI * 2 + rand() * 0.3); f.translate(top.x, top.y - 0.05, top.z); (k % 2 ? fronds : fronds2).push(f);
      }
      for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + rand(); const nut = new THREE.IcosahedronGeometry(0.2 * s, 1); nut.translate(top.x + Math.cos(a) * 0.22, top.y - 0.28, top.z + Math.sin(a) * 0.22); nuts.push(nut); }
      for (let k = 1; k < 6; k++) { const r = new THREE.TorusGeometry(0.19 * s, 0.045 * s, 4, 8); r.rotateX(Math.PI / 2); r.translate(pts[k].x, pts[k].y - 0.25 * s, pts[k].z); rings.push(r); }
    };
    // an arching palm leaf: a folded strip that rises then droops, widest in the middle
    const frond = (s, rise) => {
      const L = 2.0 * s, N = 7, pos = [], idx = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N, x = 0.15 + u * L, y = Math.sin(u * Math.PI) * rise * L * 0.5 - u * u * L * 0.45;
        const w = 0.38 * s * Math.sin(Math.PI * Math.min(1, 0.12 + u * 0.95)) + 0.02;
        pos.push(x, y - w * 0.25, -w, x, y + 0.04, 0, x, y - w * 0.25, w);
      }
      for (let i = 0; i < N; i++) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      return g;
    };
    const fronds2 = [], rings = [];
    if (this.M.city) return this.buildCity(rand);
    if (this.M.indoor) return;
    for (let y = -3; y < this.H + 3; y++) for (let x = -3; x < this.W + 3; x++) {
      const inside = x >= 0 && y >= 0 && x < this.W && y < this.H;
      const t = inside ? this.tile(x, y) : null;
      if (!inside && this.M.border === 'cloud') { if (rand() < 0.45) puff(x, y); continue; }
      if (t === '~' && this.M.border === 'cloud' && rand() < 0.12) { puff(x, y, 0.6); continue; }
      if (t === 'P' || (!inside && this.M.border === 'palm' && rand() < 0.3)) palm(x, y);
      else if (inside ? t === 'T' : rand() < 0.85) add(x, y);
    }
    if (puffs.length) { this.group.add(inked(mergeGeometries(puffs), toon(0xffffff, { rim: 0.8 }), OL * 0.5)); puffs.forEach((g) => g.dispose()); }
    if (ptrunks.length) { this.group.add(inked(mergeGeometries(ptrunks), toon(0xa8784a), OL * 0.6)); ptrunks.forEach((g) => g.dispose()); }
    if (nuts.length) { this.group.add(inked(mergeGeometries(nuts), toon(0x7a4a2a), OL * 0.4)); nuts.forEach((g) => g.dispose()); }
    if (rings.length) { this.group.add(inked(mergeGeometries(rings), toon(0x8a5e38), 0)); rings.forEach((g) => g.dispose()); }
    for (const [list, c] of [[fronds, 0x3fbf5a], [fronds2, 0x2f9e4a]]) if (list.length) { this.group.add(inked(mergeGeometries(list), toon(c, { rim: 0.4, side: THREE.DoubleSide }), OL * 0.35)); list.forEach((g) => g.dispose()); }
    const put = (list, color, ink) => { if (!list.length) return; const m = inked(mergeGeometries(list), toon(color, { rim: 0.4 }), ink); m.castShadow = true; this.group.add(m); list.forEach((g) => g.dispose()); };
    const TC = this.M.trees || [0x3fae4a, 0x4cc25a, 0x8a5a3a];
    put(can, TC[0], OL); put(can2, TC[1], OL); put(trunks, TC[2], OL * 0.6); put(caps, 0xffffff, OL * 0.6);
  }

  // Neon City: blocks of lit skyscrapers where other maps have trees, street lamps (l)
  windowTex() {
    const t = canvasTex(64, 64, (c, w, h) => {
      c.fillStyle = '#2a2448'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const r = Math.random();
        c.fillStyle = r < 0.45 ? '#ffd88a' : r < 0.6 ? '#8ae8ff' : '#3a3460';
        c.fillRect(x * 16 + 4, y * 16 + 4, 8, 9);
      }
    }, { repeat: [1, 1] });
    t.userData.own = true;
    return t;
  }

  buildCity(rand) {
    const boxes = [], roofs = [[], [], []], vents = [];
    const box = (px, pz, w, d, h) => {
      const b = new THREE.BoxGeometry(w, h, d), uv = b.attributes.uv;
      // windows repeat with the wall size instead of stretching
      for (let i = 0; i < uv.count; i++) { const f = Math.floor(i / 4); const sx = f < 2 ? d : w, sy = f === 2 || f === 3 ? d : h; uv.setXY(i, uv.getX(i) * sx / 2, uv.getY(i) * sy / 2); }
      b.translate(px, h / 2, pz); boxes.push(b);
      const r = new THREE.BoxGeometry(w + 0.2, 0.25, d + 0.2); r.translate(px, h + 0.12, pz); roofs[Math.floor(rand() * 3)].push(r);
      if (rand() < 0.35) { const v = new THREE.BoxGeometry(0.6, 0.4, 0.5); v.translate(px + (rand() - 0.5) * 0.8, h + 0.45, pz + (rand() - 0.5) * 0.8); vents.push(v); }
    };
    for (let y = -3; y < this.H + 3; y++) for (let x = -3; x < this.W + 3; x++) {
      const inside = x >= 0 && y >= 0 && x < this.W && y < this.H;
      if (inside ? this.tile(x, y) !== 'T' : false) continue;
      const [px, pz] = wpos(x, y);
      // low along the streets so the overhead camera can see past them, taller further out
      const edge = Math.min(x + 1, y + 1, this.W - x, this.H - y), out = edge <= 0 ? 1 - edge : 0;
      box(px, pz, TILE * 0.98, TILE * 0.98, (y >= this.H - 2 ? 1.2 : 1.8) + Math.floor(rand() * 3) * 0.6 + out * 1.6);
    }
    const wm = new THREE.MeshBasicMaterial({ map: this.windowTex(), color: 0xc8c0e8 }); wm.userData.own = true;
    const m = new THREE.Mesh(mergeGeometries(boxes), wm); this.group.add(m); boxes.forEach((g) => g.dispose());
    [0x7a6ab8, 0x5a7ab8, 0x9a6aa8].forEach((c, k) => { if (roofs[k].length) { this.group.add(inked(mergeGeometries(roofs[k]), toon(c, { rim: 0.3 }), OL * 0.6)); roofs[k].forEach((g) => g.dispose()); } });
    if (vents.length) { this.group.add(inked(mergeGeometries(vents), toon(0xb8b0d0), OL * 0.4)); vents.forEach((g) => g.dispose()); }
    // street lamps with glowing heads
    const posts = [], heads = [];
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) if (this.tile(x, y) === 'l') {
      const [px, pz] = wpos(x, y);
      const p = new THREE.CylinderGeometry(0.08, 0.12, 2.6, 6); p.translate(px, 1.3, pz); posts.push(p);
      const h = new THREE.SphereGeometry(0.3, 10, 8); h.translate(px, 2.75, pz); heads.push(h);
    }
    if (posts.length) {
      this.group.add(inked(mergeGeometries(posts), toon(0x3a3458), OL * 0.5)); posts.forEach((g) => g.dispose());
      const hm = new THREE.MeshBasicMaterial({ color: 0xfff0b0 }); hm.userData.own = true;
      this.group.add(new THREE.Mesh(mergeGeometries(heads), hm)); heads.forEach((g) => g.dispose());
      this.lamps = true;
    }
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
    const geo = mergeGeometries(blades);
    const m = inked(geo, toon(this.M.blades || 0x2f9a3a, { rim: 0.5 }), OL * 0.4);
    blades.forEach((g) => g.dispose());
    this.group.add(m);
    // the blades sway in the breeze and part around whoever walks through them (CPU, shared by the ink hull)
    const pos = geo.attributes.position; pos.setUsage(THREE.DynamicDrawUsage);
    this.grassGeo = geo; this.grassBase = Float32Array.from(pos.array);
  }

  swayGrass() {
    const geo = this.grassGeo; if (!geo) return;
    if (this.g.quality === 'low' && (this.swayK = (this.swayK || 0) + 1) % 2) return; // low quality: every other frame
    const a = geo.attributes.position.array, B = this.grassBase, t = this.t;
    // everyone walking through the grass pushes it aside: the hero, the buddy, the roaming wild critters
    const push = [this.hero.root.position, this.follower?.root.position, ...(this.wild || []).map((w) => w.root.position)].filter(Boolean);
    for (let i = 0; i < a.length; i += 3) {
      const y = B[i + 1]; if (y < 0.15) continue;
      const x = B[i], z = B[i + 2], k = (y - 0.1) * (y - 0.1);
      let ox = Math.sin(t * 1.7 + x * 0.35 + z * 0.2) * 0.12 * k, oz = Math.sin(t * 1.3 + z * 0.3) * 0.05 * k, oy = 0;
      for (const p of push) {
        const dx = x - p.x, dz = z - p.z, d2 = dx * dx + dz * dz;
        if (d2 < 1.6) { const d = Math.sqrt(d2) + 0.05, f = (1.3 - Math.min(1.25, d)) * 0.9 * k / d; ox += dx * f; oz += dz * f; oy = Math.max(oy, (1.3 - Math.min(1.25, d)) * 0.35 * k); }
      }
      a[i] = x + ox; a[i + 1] = y - oy; a[i + 2] = z + oz;
    }
    geo.attributes.position.needsUpdate = true;
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
      if (s.hide) continue;
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

  // volcano country: steaming vents (v) and glowing lava
  buildVolcano(rand) {
    this.vents = []; this.lavaTiles = [];
    const cones = [];
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      const t = this.tile(x, y), [px, pz] = wpos(x, y);
      if (t === 'v') { const c = new THREE.CylinderGeometry(0.35, 0.85, 0.7, 9); c.translate(px, 0.35, pz); cones.push(c); this.vents.push([px, pz]); }
      if (t === '~' && this.M.lava) this.lavaTiles.push([px, pz]);
    }
    if (cones.length) {
      this.group.add(inked(mergeGeometries(cones), toon(0x4a3a3a), OL * 0.6)); cones.forEach((g) => g.dispose());
      const holes = this.vents.map(([px, pz]) => { const h = new THREE.CircleGeometry(0.3, 10); h.rotateX(-Math.PI / 2); h.translate(px, 0.71, pz); return h; });
      const hm = new THREE.MeshBasicMaterial({ color: 0xffa040 }); hm.userData.own = true; this.group.add(new THREE.Mesh(mergeGeometries(holes), hm)); holes.forEach((g) => g.dispose());
    }
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
    // Pip during the Trial of Friendship, otherwise the walking buddy picked in the ☰ menu
    const id = save.adv.follow || (save.adv.buddy && save.adv.buddy !== save.adv.hero && save.unlocked.includes(save.adv.buddy) ? save.adv.buddy : null);
    if (!id) { this.follower = null; return; }
    const pip = !!save.adv.follow, def = byId(id);
    const cr = new Critter(withGear(pip ? def : skinned(def, save.skins?.[id]), pip ? 2 : save.critters[id]?.level || 1));
    cr.root.userData.critter = true;
    cr.root.scale.setScalar(CS * (pip ? 0.7 : 0.85));
    this.group.add(cr.root);
    // start on a free tile behind the hero
    const [dx, dy] = DIRS[this.dir];
    let x = this.hx - dx, y = this.hy - dy;
    if (!this.walkable(x, y)) { x = this.hx; y = this.hy; }
    this.follower = { cr, root: cr.root, x, y, dir: this.dir, from: null, moveT: 0 };
    this.setPos(this.follower);
  }

  buildBuildings() {
    this.doors = []; this.chimneys = [];
    for (const b of this.M.buildings || []) {
      const x0 = b.x * TILE, z0 = b.y * TILE, w = b.w * TILE, d = b.h * TILE;
      const G = new THREE.Group();
      G.position.set(x0 + w / 2, 0, z0 + d / 2);
      if (b.stadium) this.stadiumModel(G, b, w, d);
      else if (b.shroom) this.shroomHouse(G, b, w, d);
      else if (b.tower) this.towerModel(G, b, w, d);
      else if (b.altar) this.altarModel(G, b, w, d);
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
          // shingle bands down each slope and a ridge cap, so the roof reads as tiles from above instead of a flat slab
          const half = d / 2 + 0.15, ang = Math.atan2(1.5, half), len = Math.hypot(1.5, half), bands = [];
          for (const sd of [-1, 1]) for (const f of [0.18, 0.5, 0.82]) {
            const g = new THREE.BoxGeometry(w - 0.06, 0.05, len * 0.14); g.rotateX(sd * ang);
            g.translate(0, wallH + 1.5 * (1 - f) + 0.04, sd * half * f); bands.push(g);
          }
          const rc = new THREE.CylinderGeometry(0.13, 0.13, w + 0.05, 8); rc.rotateZ(Math.PI / 2); rc.translate(0, wallH + 1.52, 0); bands.push(rc);
          const shade = new THREE.Color(b.roof).multiplyScalar(0.78).getHex();
          G.add(new THREE.Mesh(mergeGeometries(bands), toon(shade))); bands.forEach((g) => g.dispose());
          const ch = inked(new THREE.BoxGeometry(0.4, 0.9, 0.4), toon(0xc86a4a), OL * 0.6); ch.position.set(w * 0.25, wallH + 1.1, -d * 0.12); G.add(ch);
          // a wisp of smoke from the chimney (thicker in the cold, at night, and from the forge)
          this.chimneys.push({ x: x0 + w / 2 + w * 0.25, z: z0 + d / 2 - d * 0.12, y: wallH + 1.6, rate: b.id === 'forge' ? 3 : this.M.snow || this.phase !== 'day' ? 1.4 : 0.7, forge: b.id === 'forge' });
        }
        // door and windows on the south face
        const dx = (b.door + 0.5) * TILE - w / 2, front = d / 2 - 0.25;
        const door = inked(new THREE.BoxGeometry(0.9, 1.3, 0.12), toon(0x8a5a3a), OL * 0.5); door.position.set(dx, 0.65, front + 0.03); G.add(door);
        for (let k = 0; k < b.w; k++) if (k !== b.door) {
          const win = inked(new THREE.BoxGeometry(0.8, 0.7, 0.1), this.phase === 'day' ? toon(0xbfe6ff, { rim: 0.9 }) : LIT, OL * 0.5);
          win.position.set((k + 0.5) * TILE - w / 2, 1.25, front + 0.03); G.add(win);
        }
        if (b.heal && !b.lab) { // a big round Berry Center sign on the ridge, tipped toward the camera so it reads from above
          const tex = canvasTex(128, 128, (c) => {
            c.fillStyle = '#ffffff'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill();
            c.fillStyle = '#ff5a8a'; c.beginPath(); c.arc(64, 64, 52, 0, 7); c.fill();
            c.fillStyle = '#ffffff'; c.fillRect(52, 28, 24, 72); c.fillRect(28, 52, 72, 24);
          });
          tex.userData.own = true;
          const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true }); m.userData.own = true;
          const disc = new THREE.Mesh(new THREE.CircleGeometry(0.75, 28), m);
          disc.position.set(dx, wallH + 1.95, 0.15); disc.rotation.x = -0.55; G.add(disc);
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), toon(0xffffff)); post.position.set(dx, wallH + 1.45, 0); G.add(post);
        }
        if (b.heal) { const cr = inked(new THREE.BoxGeometry(0.9, 0.9, 0.1), toon(0xffffff), OL * 0.5); cr.position.set(dx, wallH - 0.1, front + 0.04); G.add(cr); const h = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.12), toon(0xff5a8a)); h.position.copy(cr.position); h.position.z += 0.03; G.add(h); const v2 = h.clone(); v2.rotation.z = Math.PI / 2; G.add(v2); }
      }
      this.group.add(G);
      this.doors.push({ x: b.x + b.door, y: b.y + b.h - 1, b });
    }
  }

  // hidden treasures: two gift boxes per outdoor map, on reachable open tiles off the beaten path; walk over one to open it
  buildItems(x, y) {
    this.items = [];
    if (this.M.indoor || this.key === 'peak') return;
    const seen = new Set([x + ',' + y]), q = [[x, y]];
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of Object.values(DIRS)) {
      const nx = q[i][0] + dx, ny = q[i][1] + dy, k = nx + ',' + ny;
      if (!seen.has(k) && (this.walkable(nx, ny) || this.tile(nx, ny) === 'B') && this.tile(nx, ny) !== 'i') { seen.add(k); q.push([nx, ny]); }
    }
    const rand = rng(hash(this.key + ':items'));
    const npcAt = new Set((this.M.npcs || []).map((n) => n.x + ',' + n.y)), doors = new Set(this.doors.map((d) => d.x + ',' + (d.y + 1)));
    const ok = q.filter(([tx, ty]) => '.fsg"'.includes(this.tile(tx, ty)) && !npcAt.has(tx + ',' + ty) && !doors.has(tx + ',' + ty)
      && tx > 0 && ty > 0 && tx < this.W - 1 && ty < this.H - 1 && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.tile(tx + dx, ty + dy) === ':'));
    for (let k = 0; k < 2 && ok.length; k++) {
      const [tx, ty] = ok.splice(Math.floor(rand() * ok.length), 1)[0];
      for (let i = ok.length - 1; i >= 0; i--) if (Math.abs(ok[i][0] - tx) + Math.abs(ok[i][1] - ty) < 7) ok.splice(i, 1); // spread them out
      const flag = `it_${this.key}_${k}`;
      if (save.adv.flags[flag]) continue;
      const g = new THREE.Group(), [px, pz] = wpos(tx, ty);
      const box = inked(new THREE.BoxGeometry(0.62, 0.5, 0.62), toon(k ? 0x5ad8ff : 0xff6aa8, { rim: 0.6 }), OL * 0.5); box.position.y = 0.25; g.add(box);
      const lid = inked(new THREE.BoxGeometry(0.7, 0.14, 0.7), toon(k ? 0x5ad8ff : 0xff6aa8, { rim: 0.6 }), OL * 0.5); lid.position.y = 0.55; g.add(lid);
      for (const r of [0, Math.PI / 2]) { const rb = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.66, 0.12), toon(0xffd84d, { rim: 0.6 })); rb.position.y = 0.32; rb.rotation.y = r; g.add(rb); }
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 6, 12), toon(0xffd84d)); bow.position.y = 0.7; g.add(bow);
      g.position.set(px, 0, pz); g.scale.setScalar(1.25);
      this.group.add(g);
      this.items.push({ x: tx, y: ty, g, flag, kind: k });
    }
  }

  pickItem() {
    const it = this.items?.find((i) => i.x === this.hx && i.y === this.hy);
    if (!it) return false;
    this.items.splice(this.items.indexOf(it), 1);
    this.group.remove(it.g);
    save.adv.flags[it.flag] = true;
    const [px, pz] = wpos(it.x, it.y);
    for (let k = 0; k < 14; k++) this.g.fx.spawn({ x: px, y: 0.6, z: pz, vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 3, vz: (Math.random() - 0.5) * 4, color: [0xffd84d, 0xff6aa8, 0x5ad8ff][k % 3], size: 0.3, life: 0.9, shape: 'star', grav: 6 });
    sfx.jingle?.(2);
    const hero = heroDef();
    if (it.kind === 0) {
      const n = 2 + Math.floor(Math.random() * 2);
      save.berries = (save.berries || 0) + n; persist();
      this.say([`{hero} found a gift box! Inside: ${n} berries! 🍓`]);
    } else {
      const c = save.critters[hero.id], r = grantXp(hero.id, Math.round(xpNeeded(c.level) * 0.4));
      this.say([`{hero} found a gift box! Inside: a Power Snack! ⭐`, r.to > r.from ? `{hero} munched it and grew to Lv ${r.to}!` : '{hero} munched it and feels stronger! (+XP)']);
    }
    return true;
  }

  // indoor rooms: walls (tall at the back, low at the front so the camera sees in) and furniture
  buildInterior() {
    if (!this.M.indoor) return;
    const L = {}, add = (k, g) => (L[k] ||= []).push(g);
    const box = (k, w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); add(k, g); };
    const W = this.W, H = this.H;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = this.tile(x, y), [px, pz] = wpos(x, y);
      if (t === 'W') {
        const back = y === 0, front = y === H - 1, h = back ? 3.2 : front ? 0.5 : 1.4;
        box(back ? 'wall' : 'wall2', TILE, h, TILE, px, h / 2, pz);
        box('trim', TILE + 0.02, 0.16, TILE + 0.02, px, h, pz);
        if (back) box('base', TILE + 0.01, 0.35, 0.12, px, 0.17, pz + 1.02);
        if (back && this.M.indoor === 'arcade') { box('neon', TILE + 0.01, 0.12, 0.08, px, 2.7, pz + 1.04); box('neon2', TILE + 0.01, 0.08, 0.08, px, 0.5, pz + 1.08); }
        if (back && x % 3 !== 2 && (x % 3 === 0 || x % 4 === 1) && x > 1 && x < W - 2 && '.QOD'.includes(this.tile(x, 1)) && x % 3 !== 2 && this.M.indoor !== 'arcade') { // a little framed landscape between the windows
          box('frame', 1.4, 1.05, 0.08, px, 2.05, pz + 1.02); box('art' + (x % 2), 1.18, 0.83, 0.06, px, 2.05, pz + 1.06); box('hill', 1.18, 0.28, 0.07, px, 1.77, pz + 1.07); box('sunny', 0.22, 0.22, 0.07, px + 0.32, 2.25, pz + 1.075);
        }
        if (back && this.M.indoor === 'center' && x === (W >> 1)) { box('trim', 1.3, 1.3, 0.08, px, 2.45, pz + 1.02); box('top', 0.36, 1.0, 0.08, px, 2.45, pz + 1.06); box('top', 1.0, 0.36, 0.08, px, 2.45, pz + 1.06); } // the Berry Center cross behind the nurse
        if (back && x % 3 === 2 && x > 0 && x < W - 1 && this.tile(x, 1) !== 'C') { box('glass', 1.1, 0.9, 0.08, px, 1.9, pz + 1.02); box('trim', 1.3, 0.12, 0.14, px, 1.4, pz + 1.04); }
      }
      if (t === 'C') { // shelf with coloured book spines
        box('wood', 1.8, 2.5, 0.9, px, 1.25, pz - 0.4);
        for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) box('book' + ((x + r + k) % 3), 0.32, 0.55, 0.2, px - 0.6 + k * 0.4, 0.55 + r * 0.75, pz + 0.08);
      }
      if (t === 'X') { box('metal', 1.4, 2.0, 1.0, px, 1.0, pz - 0.3); box('screen', 1.0, 0.7, 0.06, px, 1.45, pz + 0.22); box('btn', 0.8, 0.12, 0.3, px, 0.95, pz + 0.3); }
      if (t === 'Q') {
        const head = this.tile(x, y - 1) !== 'Q';
        box('wood', 1.7, 0.45, TILE, px, 0.22, pz);
        box('blanket', 1.6, 0.18, head ? 1.1 : TILE, px, 0.52, pz + (head ? 0.45 : 0));
        if (head) { box('pillow', 1.2, 0.25, 0.6, px, 0.6, pz - 0.55); box('wood', 1.7, 1.0, 0.14, px, 0.5, pz - 0.95); }
      }
      if (t === 'D') { // tables join up with their D neighbours; legs only at the outer corners
        const n = (dx, dy) => this.tile(x + dx, y + dy) === 'D', l = n(-1, 0), r = n(1, 0), u = n(0, -1), d = n(0, 1);
        const x0 = px - (l ? 1 : 0.85), x1 = px + (r ? 1 : 0.85), z0 = pz - (u ? 1 : 0.85), z1 = pz + (d ? 1 : 0.85);
        box('wood', x1 - x0, 0.14, z1 - z0, (x0 + x1) / 2, 0.9, (z0 + z1) / 2);
        for (const [cx, cz, ok] of [[x0, z0, !l && !u], [x1, z0, !r && !u], [x0, z1, !l && !d], [x1, z1, !r && !d]]) if (ok) box('wood', 0.14, 0.9, 0.14, cx + (cx < px ? 0.12 : -0.12), 0.45, cz + (cz < pz ? 0.12 : -0.12));
        if (r && d) { const b = new THREE.SphereGeometry(0.3, 10, 8); b.translate(px + 1, 1.15, pz + 1); add('berry', b); }
        if (!l && !r && !u && !d) { const b = new THREE.SphereGeometry(0.22, 8, 6); b.translate(px, 1.1, pz); add('berry', b); }
        // stools pulled up at the open ends, and a little something on the table top
        for (const sd of [-1, 1]) if (this.tile(x + sd, y) === '.' && !n(sd, 0)) {
          const sx = px + sd * 1.2; box('stool', 0.7, 0.12, 0.7, sx, 0.55, pz);
          for (const [lx, lz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) box('wood', 0.08, 0.5, 0.08, sx + lx, 0.25, pz + lz);
        }
        const v = (x * 7 + y * 3) % 4;
        if (!(r && d) && (l || r || u || d)) {
          if (this.M.indoor === 'lab') { // beakers of bubbling colour
            for (let k = 0; k < 2; k++) { const gx = px - 0.3 + k * 0.6, c = new THREE.CylinderGeometry(0.12, 0.15, 0.2, 10); c.translate(gx, 1.3, pz - 0.1); add('beaker', c); const q = new THREE.CylinderGeometry(0.15, 0.16, 0.24, 10); q.translate(gx, 1.08, pz - 0.1); add('fluid' + ((x + k) % 2), q); }
          } else if (v === 0) { const c = new THREE.CylinderGeometry(0.13, 0.11, 0.26, 10); c.translate(px - 0.2, 1.1, pz); add('mug', c); }
          else if (v === 1) { for (let k = 0; k < 3; k++) box('book' + ((x + k) % 3), 0.55 - k * 0.05, 0.1, 0.4, px + 0.1, 1.02 + k * 0.1, pz + 0.05); }
          else if (v === 2) { const pl = new THREE.CylinderGeometry(0.34, 0.3, 0.05, 14); pl.translate(px, 0.99, pz); add('plate', pl); for (let k = 0; k < 3; k++) { const b = new THREE.SphereGeometry(0.11, 8, 6); b.translate(px + Math.cos(k * 2.1) * 0.12, 1.08, pz + Math.sin(k * 2.1) * 0.12); add('berry', b); } }
        }
      }
      if (t === 'O') {
        const p = new THREE.CylinderGeometry(0.4, 0.3, 0.6, 10); p.translate(px, 0.3, pz); add('pot', p);
        for (let k = 0; k < 3; k++) { const l = new THREE.IcosahedronGeometry(0.45 - k * 0.08, 1); l.translate(px + Math.sin(k * 2.1) * 0.2, 0.9 + k * 0.38, pz + Math.cos(k * 2.1) * 0.2); add('leaf', l); }
      }
      if (t === 'K') { box('counter', TILE + 0.02, 1.1, 1.3, px, 0.55, pz); box('top', TILE + 0.04, 0.12, 1.45, px, 1.15, pz); }
    }
    const C = { wall: this.M.wall, wall2: this.M.wall, trim: 0xffffff, base: 0x8a5a3a, glass: 0xbfe6ff, wood: 0xa8703a, book0: 0xff6a5a, book1: 0x5a9aff, book2: 0xffd84d, metal: this.M.indoor === 'arcade' ? 0x5a3aa8 : 0xd0d8e8, screen: 0x6affd8, btn: 0xff5a8a, blanket: 0x5a9aff, pillow: 0xffffff, berry: 0xff3a6a, pot: 0xc86a4a, leaf: 0x4cc25a, counter: 0xffffff, top: 0xff7aa8, neon: 0xff5ad8, neon2: 0x3af0ff, frame: 0x8a5a3a, art0: 0x9ad8ff, art1: 0xffc8a0, hill: 0x5ac24a, sunny: 0xffe14d, stool: 0xd88a4a, mug: 0xffffff, plate: 0xf4f0e8, beaker: 0xd8f0ff, fluid0: 0x6aff9a, fluid1: 0xff7ad8 };
    for (const k in L) {
      const glow = k === 'screen' || k === 'glass' || k === 'neon' || k === 'neon2' || k === 'fluid0' || k === 'fluid1';
      const m = glow ? new THREE.Mesh(mergeGeometries(L[k]), new THREE.MeshBasicMaterial({ color: k === 'screen' && this.M.indoor === 'arcade' ? 0xff8ae8 : C[k] })) : inked(mergeGeometries(L[k]), toon(C[k] ?? 0xffffff, { rim: 0.3 }), k === 'book0' || k === 'book1' || k === 'book2' ? OL * 0.3 : OL * 0.6);
      if (glow) m.material.userData.own = true;
      m.castShadow = !glow && k !== 'trim'; m.receiveShadow = true;
      this.group.add(m);
      L[k].forEach((g) => g.dispose());
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

  // Neon City: a lit tower with a neon band and a glowing sign over the door
  towerModel(G, b, w, d) {
    const h = 3.4;
    const bx = new THREE.BoxGeometry(w - 0.4, h, d - 0.5), uv = bx.attributes.uv;
    for (let i = 0; i < uv.count; i++) { const f = Math.floor(i / 4); const sx = f < 2 ? d : w, sy = f === 2 || f === 3 ? d : h; uv.setXY(i, uv.getX(i) * sx / 2, uv.getY(i) * sy / 2); }
    const wm = new THREE.MeshBasicMaterial({ map: this.windowTex(), color: 0xd8d0f0 }); wm.userData.own = true;
    const body = new THREE.Mesh(bx, wm); body.position.y = h / 2; G.add(body);
    const neon = new THREE.MeshBasicMaterial({ color: b.tower }); neon.userData.own = true;
    for (const y of [1.9, h - 0.15]) { const band = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.14, d - 0.4), neon); band.position.y = y; G.add(band); }
    const roof = inked(new THREE.BoxGeometry(w - 0.2, 0.3, d - 0.3), toon(0x8a7ac8, { rim: 0.3 }), OL * 0.6); roof.position.y = h + 0.15; G.add(roof);
    // a rooftop billboard in the building's neon colour
    const bb = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.9, 0.12), neon); bb.position.set(0, h + 0.75, 0); G.add(bb);
    const dx = (b.door + 0.5) * TILE - w / 2, front = d / 2 - 0.25;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), new THREE.MeshBasicMaterial({ color: 0x1a1430 })); door.material.userData.own = true; door.position.set(dx, 0.75, front + 0.02); G.add(door);
    if (b.label) {
      const tex = canvasTex(256, 64, (c, W, H) => { c.fillStyle = '#1a1430'; c.beginPath(); c.roundRect(0, 0, W, H, 14); c.fill(); c.strokeStyle = new THREE.Color(b.tower).getStyle(); c.lineWidth = 6; c.stroke(); c.fillStyle = '#fff'; c.font = 'bold 32px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = c.strokeStyle; c.shadowBlur = 10; c.fillText(b.label.toUpperCase(), W / 2, H / 2 + 2); });
      tex.userData.own = true;
      const sm = new THREE.MeshBasicMaterial({ map: tex, transparent: true }); sm.userData.own = true;
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75), sm); sg.position.set(dx, 2.5, front + 0.05); G.add(sg);
    }
    if (b.heal) { const cr = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.1), neon); cr.position.set(dx + 1.4, 1.2, front + 0.05); G.add(cr); const v2 = cr.clone(); v2.rotation.z = Math.PI / 2; G.add(v2); }
  }

  // Champion's Peak: stone steps up to a pedestal where the Critter Crown spins in a sunbeam
  altarModel(G, b, w, d) {
    for (let k = 0; k < 3; k++) { const st = inked(new THREE.BoxGeometry(w - 0.3 - k * 1.1, 0.35, d - 0.2 - k * 0.8), toon(k % 2 ? 0xd8dcef : 0xc4c8e0), OL * 0.6); st.position.y = 0.17 + k * 0.35; G.add(st); }
    const ped = inked(new THREE.CylinderGeometry(0.45, 0.6, 1.0, 10), toon(0xe8ecff), OL * 0.6); ped.position.y = 1.55; G.add(ped);
    if (save.adv.flags.crowned) { this.crown = null; return; }
    const crown = new THREE.Group();
    const band = inked(new THREE.CylinderGeometry(0.5, 0.45, 0.35, 16, 1, true), toon(0xffd23f, { rim: 0.9, emissive: 0x6a4a00, side: THREE.DoubleSide }), OL * 0.6); crown.add(band);
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, sp = inked(new THREE.ConeGeometry(0.12, 0.38, 6), toon(0xffd23f, { emissive: 0x6a4a00 }), OL * 0.4); sp.position.set(Math.cos(a) * 0.46, 0.33, Math.sin(a) * 0.46); crown.add(sp);
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), toon([0xff5a8a, 0x5ad8ff, 0x8aff6a, 0xb08aff, 0xff9a3a][k], { emissive: 0x3a1a2a })); gem.position.set(Math.cos(a) * 0.5, 0.52, Math.sin(a) * 0.5); crown.add(gem); }
    crown.position.y = 2.6; G.add(crown);
    this.crown = crown;
  }

  stadiumModel(G, b, w, d) {
    const cup = CUPS.find((c) => c.id === b.stadium);
    const stripes = canvasTex(256, 32, (c, W, H) => { for (let k = 0; k < 16; k++) { c.fillStyle = k % 2 ? '#fff4e0' : cup.color; c.fillRect(k * W / 16, 0, W / 16 + 1, H); } });
    stripes.userData.own = true;
    const wm = toon(0xffffff, { map: stripes }); wm.userData.own = true;
    const bowl = inked(new THREE.CylinderGeometry(1, 0.94, 2.6, 40, 1, true), wm, OL);
    bowl.scale.set(w / 2 - 0.2, 1, d / 2 - 0.1); bowl.position.y = 1.3; G.add(bowl);
    // inside: a sloped bank of seat rows with a speckled crowd, so the top-down view looks into a stadium, not a dark hole
    const seats = canvasTex(512, 64, (c, W, H) => {
      for (let r = 0; r < 4; r++) { c.fillStyle = r % 2 ? '#3a4a8a' : '#4a5aa0'; c.fillRect(0, r * H / 4, W, H / 4); }
      const fans = ['#ff6a8a', '#ffe14d', '#ffffff', '#7ad0ff', cup.color, '#ffb070'];
      for (let k = 0; k < 420; k++) { c.fillStyle = fans[k % fans.length]; c.beginPath(); c.arc(Math.random() * W, (Math.floor(Math.random() * 4) + 0.45) * H / 4, 2.4, 0, 7); c.fill(); }
    });
    seats.userData.own = true; seats.wrapS = THREE.RepeatWrapping; seats.repeat.set(3, 1);
    const smat = toon(0xffffff, { map: seats, side: THREE.DoubleSide, rim: 0 }); smat.userData.own = true;
    const bank = new THREE.Mesh(new THREE.CylinderGeometry(0.93, 0.8, 2.4, 40, 1, true), smat);
    bank.scale.set(w / 2 - 0.2, 1, d / 2 - 0.1); bank.position.y = 1.25; G.add(bank);
    const rim = inked(new THREE.TorusGeometry(1, 0.08, 6, 48), toon(0xffd23f), 0);
    rim.rotation.x = Math.PI / 2; rim.scale.set(w / 2 - 0.2, d / 2 - 0.1, 1); rim.position.y = 2.6; G.add(rim);
    const field = new THREE.Mesh(new THREE.CircleGeometry(1, 40), toon(new THREE.Color(ARENAS[cup.arena]?.fieldA || '#5ac24a').getHex())); field.rotation.x = -Math.PI / 2; field.scale.set((w / 2 - 0.2) * 0.8, (d / 2 - 0.1) * 0.8, 1); field.position.y = 0.05; G.add(field);
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
      else if (n.balloon) { root = balloonModel(n.balloon); }
      else {
        const id = n.critter === '$hero' ? save.adv.hero : n.rival ? rivalFor(save.adv.hero) : n.critter;
        cr = new Critter(withGear(n.shiny ? skinned(byId(id), 'shiny') : byId(id), n.rival ? (n.rlv || 4) : (n.lv || n.trainer?.lv || 3)));
        root = cr.root;
        root.scale.setScalar(CS * (n.scale || 1));
        roleHat(cr, n.name || '');
        if (this.rain && n.act !== 'fish' && n.act !== 'sleep') { // a brolly up in the rain
          const U = new THREE.Group(), r = cr.def.body.headR, col = [0xff5a8a, 0x5ab8ff, 0xffd84d, 0x8a6aff][(n.x + n.y) % 4];
          const can = inked(new THREE.ConeGeometry(r * 1.6, r * 0.75, 8, 1, true), toon(col, { rim: 0.4, side: THREE.DoubleSide }), OL * 0.3); can.position.y = r * 0.45; U.add(can);
          const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 0.12, 6, 4), toon(0xffffff)); tip.position.y = r * 0.92; U.add(tip);
          const stick = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.05, r * 0.05, r * 2.2, 5), toon(0x5a3a2a)); stick.position.y = -r * 0.6; U.add(stick);
          U.position.set(r * 0.2, cr.def.body.h * 0.82 + r * 2.0, -r * 0.6); U.rotation.set(-0.4, 0, -0.12); cr.root.add(U);
        }
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
    const lv = lo + Math.floor(Math.random() * (hi - lo + 1)), shiny = Math.random() < SHINY_RATE;
    const cr = new Critter(withGear(shiny ? skinned(byId(id), 'shiny') : byId(id), lv));
    cr.root.userData.critter = true;
    cr.root.scale.setScalar(CS * 0.9);
    this.group.add(cr.root);
    const a = { id, lv, cr, root: cr.root, x, y, dir: 's', moveT: 0, from: null, wanderT: 0.5 + Math.random() * 2, wild: true, shiny };
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
      const X = this.M.exit;
      if (X && dir === 's') { sfx.door(); this.fade(() => this.load(X.map, X.x, X.y, 's')); return; }
      return this.bump();
    }
    const who = this.occupied(nx, ny, 'hero');
    if (who?.wild) { this.wildFight(who); return; }
    if (who || !this.walkable(nx, ny)) return this.bump();
    this.from = [this.hx, this.hy];
    this.hx = nx; this.hy = ny;
    // run: stick pushed all the way on a phone, or Shift held on a keyboard
    const inp = this.g.input, m = Math.hypot(inp.move.x, inp.move.y);
    this.running = !this.M.indoor && (inp.keys.has('ShiftLeft') || inp.keys.has('ShiftRight') || (document.body.classList.contains('is-touch') && m > 0.9));
    this.stepLen = this.running ? STEP * 0.62 : STEP;
    this.moveT = this.stepLen;
    if (this.running && this.tile(this.hx, this.hy) !== '"') { const [px, pz] = wpos(...this.from); this.g.fx.spawn({ x: px, y: 0.2, z: pz, vy: 0.6, color: this.M.snow ? 0xffffff : 0xe8d8b8, alpha: 0.6, size: 0.45, life: 0.45, shape: 'puff', additive: false, grow: 1.4 }); }
    const F = this.follower;
    if (F && (F.x !== this.from[0] || F.y !== this.from[1])) {
      F.dir = F.x < this.from[0] ? 'e' : F.x > this.from[0] ? 'w' : F.y < this.from[1] ? 's' : 'n';
      F.from = [F.x, F.y]; F.x = this.from[0]; F.y = this.from[1]; F.moveT = F.len = this.stepLen;
    }
  }

  bump() {
    if (this.bumpT > 0) return;
    this.bumpT = 0.35;
    sfx.ui('back');
  }

  goTo(e, dir, nx, ny) {
    const M2 = getMap(e.to);
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
    // little footprints left behind in snow and sand, fading after a few seconds
    if (!this.M.indoor && (this.M.snow && t !== 'i' && t !== ':' || t === 's' || t === 'P')) {
      const [px, pz] = wpos(this.hx, this.hy), [dx, dy] = DIRS[this.dir];
      for (const sd of [-1, 1]) this.footprint(px - dy * sd * 0.22 - dx * 0.5 * (sd > 0), pz + dx * sd * 0.22 - dy * 0.5 * (sd > 0), this.M.snow ? 0x7a8ac0 : 0xa87a40);
    }
    if (!this.sliding && t !== '"') sfx.foot(this.M.indoor || t === '=' ? 'wood' : t === 's' || t === 'P' ? 'sand' : t === 'i' ? 'ice' : this.M.snow ? 'snow' : this.M.city || this.M.lava ? 'stone' : 'grass');
    // ice: keep sliding the same way until something solid is in the way
    if (t === 'i') {
      const [dx, dy] = DIRS[this.dir], nx = this.hx + dx, ny = this.hy + dy;
      if (this.walkable(nx, ny) && !this.occupied(nx, ny, 'hero')) {
        this.from = [this.hx, this.hy]; this.hx = nx; this.hy = ny; this.moveT = STEP * 0.6; this.sliding = true;
        if (this.follower) { const F = this.follower; F.from = [F.x, F.y]; F.x = this.from[0]; F.y = this.from[1]; F.moveT = F.len = STEP * 0.6; }
        return;
      }
      if (this.sliding) { sfx.ui('back'); this.bumpT = 0.35; }
    }
    this.sliding = false;
    // stepping on the doormat goes back outside
    const X = this.M.exit;
    if (X && this.hy === this.H - 1) { sfx.door(); this.fade(() => this.load(X.map, X.x, X.y, 's')); return; }
    if (this.pickItem()) return;
    if (t === '"') {
      const [px, pz] = wpos(this.hx, this.hy);
      for (let k = 0; k < 5; k++) this.g.fx.spawn({ x: px + (Math.random() - 0.5), y: 0.4, z: pz + (Math.random() - 0.5), vy: 2 + Math.random() * 2, vx: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2, color: 0x3fae4a, size: 0.22, life: 0.5, shape: 'leaf', additive: false, grav: 6, rot: Math.random() * 6 });
      sfx.step?.();
      if (this.M.wild && this.encCool <= 0 && Math.random() < (this.M.wild.rate || 0.1)) { this.ambush(); return; }
    }
    if (this.storyCheck()) return;
    this.trainerCheck();
  }

  // a flat print pressed into the ground (a small pool of decals per map, oldest reused first)
  footprint(x, z, color) {
    if (!this.prints) {
      this.prints = [];
      const geo = new THREE.CircleGeometry(0.17, 10); geo.scale(1, 1.35, 1);
      for (let k = 0; k < 24; k++) { const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }); m.userData.own = true; const o = new THREE.Mesh(geo, m); o.rotation.x = -Math.PI / 2; o.position.y = 0.035; o.visible = false; o.userData.shared = k > 0; this.group.add(o); this.prints.push({ o, age: 9 }); }
      this.printK = 0;
    }
    const P = this.prints[this.printK++ % this.prints.length];
    P.o.position.x = x; P.o.position.z = z; P.o.rotation.z = -YAW[this.dir]; P.o.material.color.setHex(color); P.o.visible = true; P.age = 0;
  }

  // ---------- update loop ----------
  update(dt) {
    this.t += dt;
    this.bumpT = (this.bumpT || 0) - dt;
    const inp = this.g.input;
    const act = inp.pressed.attack || inp.pressed.confirm || this.tapA;
    this.tapA = false;
    if (this.dialog) { this.dialog.steer?.(inp.move); if (act) this.dialog.next(); }
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
      const k = 1 - this.moveT / (this.sliding ? STEP * 0.6 : this.stepLen || STEP), [ax, az] = wpos(...this.from), [bx, bz] = wpos(this.hx, this.hy);
      H.root.position.set(ax + (bx - ax) * k, 0, az + (bz - az) * k);
      if (this.sliding) { idlePose(P, this.t); P.lean = -0.15; P.armLz = P.armRz = 1.2; H.emote?.('happy', 'o', 0.1); } else { walkPose(P, this.running ? this.t * 1.5 : this.t); if (this.running) P.lean = 0.3; }
    } else {
      idlePose(P, this.t);
      // left alone, the hero gets bored: looks around, stretches, yawns, then dozes off
      const idle = this.dialog || this.busy ? 0 : (this.idleT = (this.idleT || 0) + dt);
      if (idle > 5) {
        const ph = (idle - 5) % 14;
        if (ph < 3) { P.headYaw = Math.sin(ph * 2.2) * 0.7; }
        else if (ph < 4.5) { P.armLz = P.armRz = 2.6; P.sy = 1.08; P.lean = -0.15; H.emote('closed', 'open', 0.1); }
        else if (ph < 6) { P.head = -0.25; H.emote('closed', 'o', 0.1); }
        else { P.sy = 0.88 + Math.sin(this.t * 1.5) * 0.04; P.head = 0.3; P.lean = -0.1; P.armLz = P.armRz = 0.05; H.emote('closed', 'smile', 0.1); if (Math.random() < dt * 0.7) this.g.fx.text?.({ x: H.root.position.x + 0.5, y: 2.3, z: H.root.position.z }, 'z', 'zz'); }
      }
    }
    if (this.from || this.dialog) this.idleT = 0;
    H.root.rotation.y = turnTo(H.root.rotation.y, YAW[this.dir], dt * 18);
    H.update(dt);
    this.updateActors(dt);
    this.updateFollower(dt);
    // fireflies drift up out of the woods around the hero
    if ((this.M.fireflies || this.phase === 'night' && !this.M.snow) && Math.random() < dt * (this.M.fireflies ? 9 : 4)) {
      const p = this.hero.root.position;
      this.g.fx.spawn({ x: p.x + (Math.random() - 0.5) * 24, y: 0.4 + Math.random() * 2.2, z: p.z + (Math.random() - 0.7) * 16, vx: (Math.random() - 0.5) * 0.6, vy: 0.2 + Math.random() * 0.3, vz: (Math.random() - 0.5) * 0.6, color: Math.random() < 0.7 ? 0xd8ff6a : 0x8affe0, size: 0.28, life: 2.6, shape: 'glow', fadeIn: 0.3, hold: 0.5 });
    }
    if (this.rain) {
      const p = this.hero.root.position;
      for (let n = Math.floor(dt * 150 + Math.random()); n > 0; n--) this.g.fx.spawn({ x: p.x + (Math.random() - 0.5) * 30, y: 6 + Math.random() * 3, z: p.z + (Math.random() - 0.6) * 20, vy: -16, vx: -1.5, color: 0xe8f0ff, alpha: 0.75, size: 1.4, stretch: 0.05, rot: Math.PI / 2 + 0.08, life: 0.5, shape: 'spark', additive: false });
      if (Math.random() < dt * 22) this.g.fx.spawn({ x: p.x + (Math.random() - 0.5) * 24, y: 0.08, z: p.z + (Math.random() - 0.6) * 16, color: 0xe8f2ff, alpha: 0.6, size: 0.35, life: 0.35, shape: 'ring', additive: false, grow: 1.6 });
    }
    // autumn leaves on the volcano road, blossom petals in Cloudtop: the trees' own colour drifting down
    const TC = this.M.trees?.[0];
    if (TC && (TC >> 16 & 255) > (TC >> 8 & 255) + 20 && !this.M.indoor && Math.random() < dt * 5) {
      const p = this.hero.root.position;
      this.g.fx.spawn({ x: p.x + (Math.random() - 0.5) * 26, y: 5 + Math.random() * 2, z: p.z + (Math.random() - 0.65) * 18, vy: -0.9, vx: 0.6 + Math.random() * 0.5, vz: (Math.random() - 0.5) * 0.4, color: Math.random() < 0.5 ? TC : this.M.trees[1], size: 0.32, life: 5.5, shape: 'leaf', additive: false, spin: (Math.random() - 0.5) * 4, rot: Math.random() * 6, floor: true });
    }
    if (this.M.snow && Math.random() < dt * 16) {
      const p = this.hero.root.position;
      this.g.fx.spawn({ x: p.x + (Math.random() - 0.5) * 26, y: 7, z: p.z + (Math.random() - 0.65) * 18, vy: -1.2, vx: 0.3 + (Math.random() - 0.5) * 0.4, color: 0xffffff, size: 0.16, life: 5, shape: 'glow', additive: false, floor: true });
    }
    // embers off the lava and the vents, smoke from the volcano
    if (this.lavaTiles?.length && Math.random() < dt * 14) {
      const [px, pz] = this.lavaTiles[Math.floor(Math.random() * this.lavaTiles.length)];
      this.g.fx.spawn({ x: px + (Math.random() - 0.5) * 2, y: 0.2, z: pz + (Math.random() - 0.5) * 2, vy: 1.2 + Math.random() * 1.5, vx: (Math.random() - 0.5) * 0.5, color: Math.random() < 0.5 ? 0xffa030 : 0xff5a1a, size: 0.18, life: 1.2, shape: 'glow' });
    }
    for (const c of this.chimneys || []) if (Math.random() < dt * c.rate) {
      this.g.fx.spawn({ x: c.x, y: c.y, z: c.z, vy: 0.9, vx: 0.25, color: c.forge ? 0xb8a8a8 : 0xf0f0f0, alpha: 0.55, size: 0.45, life: 2.2, shape: 'puff', additive: false, grow: 1.4 });
      if (c.forge && Math.random() < 0.5) this.g.fx.spawn({ x: c.x, y: c.y, z: c.z, vy: 1.6, vx: (Math.random() - 0.5) * 0.6, color: 0xffa030, size: 0.16, life: 0.9, shape: 'glow' });
    }
    for (const [px, pz] of this.vents || []) if (Math.random() < dt * 3) this.g.fx.spawn({ x: px, y: 0.8, z: pz, vy: 1.4, vx: 0.2, color: 0xd8d0d0, alpha: 0.5, size: 0.7, life: 1.8, shape: 'puff', additive: false, grow: 1.2 });
    if (this.crown) {
      this.crown.rotation.y += dt * 1.2; this.crown.position.y = 2.6 + Math.sin(this.t * 2) * 0.12;
      if (Math.random() < dt * 5) { const p = new THREE.Vector3(); this.crown.getWorldPosition(p); this.g.fx.spawn({ x: p.x + (Math.random() - 0.5) * 1.4, y: p.y + Math.random(), z: p.z + (Math.random() - 0.5) * 1.4, vy: 0.6, color: 0xffe070, size: 0.3, life: 1, shape: 'star' }); }
    }
    if (this.brambleT > 0 && this.brambles) {
      this.brambleT -= dt;
      const k = Math.max(0, this.brambleT / 1.2), c = this.brambles.userData.c;
      this.brambles.scale.set(k, k * k, k); this.brambles.position.set(c.x * (1 - k), 0, c.z * (1 - k));
      if (this.brambleT <= 0) { this.brambles.visible = false; }
    }
    for (const a of this.wild || []) if (a.shiny && Math.random() < dt * 4) { const p = a.root.position; this.g.fx.spawn({ x: p.x + (Math.random() - 0.5) * 1.2, y: 0.4 + Math.random() * 1.4, z: p.z + (Math.random() - 0.5) * 1.2, vy: 0.4, color: 0xfff6a0, size: 0.26, life: 0.8, shape: 'star' }); }
    for (const it of this.items || []) {
      it.g.position.y = Math.abs(Math.sin(this.t * 2.5 + it.x)) * 0.12; it.g.rotation.y = Math.sin(this.t * 1.2 + it.y) * 0.4;
      if (Math.random() < dt * 2.5) this.g.fx.spawn({ x: it.g.position.x + (Math.random() - 0.5) * 0.8, y: 0.5 + Math.random() * 0.6, z: it.g.position.z + (Math.random() - 0.5) * 0.8, vy: 0.5, color: 0xfff0a0, size: 0.22, life: 0.7, shape: 'star' });
    }
    this.swayGrass();
    for (const P of this.prints || []) if (P.o.visible) { P.age += dt; P.o.material.opacity = 0.6 * Math.max(0, Math.min(1, (6 - P.age) / 2)); if (P.age > 6) P.o.visible = false; }
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
        } else if (a.n?.act && !this.dialog) actPose(this, a, P, this.t + a.x * 0.7, dt);
        else idlePose(P, this.t + a.x);
        if (a.excl > 0) { a.excl -= dt; P.y = Math.max(P.y, Math.sin(Math.min(1, 1 - a.excl) * Math.PI) * 0.4); }
        a.root.rotation.y = turnTo(a.root.rotation.y, YAW[a.dir], dt * 14);
        a.cr.update(dt);
      } else if (a.n.balloon) {
        // a moored balloon sways; when it takes off it rises (a.fly) with the hero aboard
        if (a.fly != null) { a.fly += dt; a.root.position.y = a.fly * a.fly * 2.2; }
        else a.root.position.y = Math.sin(this.t * 1.3) * 0.08;
        a.root.rotation.z = Math.sin(this.t * 0.9) * 0.03;
        continue;
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
      const k = 1 - Math.max(0, F.moveT) / (F.len || STEP), [ax, az] = wpos(...F.from), [bx, bz] = wpos(F.x, F.y);
      F.root.position.set(ax + (bx - ax) * k, 0, az + (bz - az) * k);
      walkPose(P, this.t + 0.3);
      if (F.moveT <= 0) { F.from = null; this.setPos(F); }
    } else { idlePose(P, this.t + 1); P.y = Math.abs(Math.sin(this.t * 3)) * 0.1; if (F.hop > 0) { F.hop -= dt; P.y = Math.sin((0.6 - F.hop) / 0.6 * Math.PI * 2) ** 2 * 0.6; P.armLz = P.armRz = 2; } if (!this.from) F.dir = F.x < this.hx ? 'e' : F.x > this.hx ? 'w' : F.y < this.hy ? 's' : 'n'; }
    F.root.rotation.y = turnTo(F.root.rotation.y, YAW[F.dir], dt * 14);
    F.cr.update(dt);
  }

  updateCamera(dt) {
    const cam = this.g.camera, p = this.hero.root.position;
    const port = cam.aspect < 1;
    const H = port ? 21 : 17, D = port ? 10 : 11.5;
    const want = new THREE.Vector3(p.x, H, p.z + D);
    // rooms are small: hold the whole room in view (portrait backs off far enough to fit the room's width)
    const fit = port ? (this.W * TILE + 1.2) / (2 * Math.tan(Math.min(80, 2 * Math.atan(Math.tan(0.38) / cam.aspect) * 180 / Math.PI) * Math.PI / 360) * cam.aspect) : 0;
    if (this.M.indoor) want.set(this.W * TILE / 2, port ? Math.max(19, fit * 0.93) : 16, this.H * TILE / 2 + (port ? Math.max(6, fit * 0.36) : 9.8));
    if (!this.camAt) this.camAt = want.clone(); else this.camAt.lerp(want, 1 - Math.exp(-dt * 8));
    cam.position.copy(this.camAt);
    if (this.M.indoor && port) cam.lookAt(this.camAt.x, 0.4, this.H * TILE / 2 + 1.2);
    else cam.lookAt(this.camAt.x, 0.4, this.camAt.z - D + (port ? 0.6 : 0.3));
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
    let a = this.occupied(fx, fy, 'hero');
    // talk across a counter
    if (!a && this.tile(fx, fy) === 'K') { const [dx, dy] = DIRS[this.dir]; a = this.occupied(fx + dx, fy + dy, 'hero'); }
    if (a && a.n) return this.talk(a);
    const B = this.follower;
    if (B && B.x === fx && B.y === fy && !B.from) { // pet your buddy
      B.dir = { n: 's', s: 'n', e: 'w', w: 'e' }[this.dir]; B.hop = 0.6;
      B.cr.emote('happy', 'open', 1);
      for (let k = 0; k < 5; k++) this.g.fx.spawn({ x: B.root.position.x + (Math.random() - 0.5), y: 1.6 + Math.random() * 0.5, z: B.root.position.z, vy: 1 + Math.random(), color: 0xff6aa8, size: 0.35, life: 0.9, shape: 'star' });
      sfx.pickup?.();
      const name = B.cr.def?.name || 'Your buddy';
      const lines = save.adv.follow ? ['Pip: Squeak! (Pip nuzzles {hero}.)'] : [[`${name} looks really happy to be out exploring with {hero}!`, `${name} bounces on the spot. Adventure!`, `${name} gives {hero} a big hug.`, `${name} sniffs the air. Something good is cooking somewhere...`][Math.floor(Math.random() * 4)]];
      return this.say(lines);
    }
    const sign = (this.M.signs || []).find((s) => s.x === fx && s.y === fy);
    if (sign?.act) return this.S.worldStory(sign.act, this, null);
    if (sign) return this.say([sign.text], null, sign.hide ? '' : '📜 Sign');
    const door = this.doors.find((d) => d.x === fx && d.y === fy);
    if (door && this.dir === 'n') return this.S.worldDoor(door.b, this);
  }

  talk(a) {
    const n = a.n;
    a.dir = { n: 's', s: 'n', e: 'w', w: 'e' }[this.dir];
    if (n.story) return this.S.worldStory(n.story, this, a);
    if (n.trainer) {
      if (save.adv.flags[n.id]) {
        // after the crowning, route trainers want a rematch with the Champion once a day, at the hero's level
        const day = new Date().toISOString().slice(0, 10), rf = `re_${n.id}_${day}`;
        if (!save.adv.flags.ending || save.adv.flags[rf]) return this.say([save.adv.flags[rf] ? `${n.name}: Phew. Same time tomorrow, Champ?` : n.trainer.after], null, n.name);
        return this.say([`${n.name}: It's the new Champion! I've trained every day since our battle. Rematch?`], () => this.ask('Battle again?', ['Let\'s go!', 'Not now'], (i) => {
          if (i) return this.say([`${n.name}: Aw. I'll be right here!`], null, n.name);
          const lv = save.critters[save.adv.hero].level;
          this.S.worldFight({
            foe: withGear(byId(n.critter), lv), lv, kind: 'trainer', flag: rf, name: n.name, berries: 1, diff: 0.55,
            trainer: { name: n.name, critter: n.critter, beat: n.trainer.beat.replace(/^[^:]+: /, ''), gloat: 'Ha! Training pays off!' },
            note: `🔁 Rematch won! +1 🍓 (${n.name.split(' ').pop()} will be back tomorrow.)`,
          });
        }, n.name), n.name);
      }
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

  // a question with answer buttons (tap one, or steer with the stick/arrows and press A)
  ask(q, opts, cb, who = '') {
    q = q.replaceAll('{hero}', heroDef().name);
    this.dialogEl?.remove();
    const el = this.dialogEl = document.createElement('div');
    el.className = 'wd-box wd-ask';
    const m = /^([^:]{1,20}): (.*)$/s.exec(q);
    el.innerHTML = `<small>${m ? m[1] : who}</small><p>${m ? m[2] : q}</p><div class="wd-opts">${opts.map((o, i) => `<button data-i="${i}">${o}</button>`).join('')}</div>`;
    this.S.root.appendChild(el);
    const btns = [...el.querySelectorAll('button')];
    let sel = 0, held = false;
    const mark = () => btns.forEach((b, i) => b.classList.toggle('on', i === sel));
    mark();
    const pick = (i) => {
      if (!el.isConnected) return;
      el.remove(); this.dialog = null; this.dialogEl = null; this.g.input._queued = {};
      sfx.ui('ok'); cb(i);
    };
    this.dialog = {
      next: () => pick(sel),
      steer: (mv) => {
        const d = Math.abs(mv.x) > 0.5 ? Math.sign(mv.x) : Math.abs(mv.y) > 0.5 ? -Math.sign(mv.y) : 0;
        if (d && !held) { sel = (sel + d + btns.length) % btns.length; mark(); sfx.ui('move'); }
        held = !!d;
      },
    };
    btns.forEach((b) => b.addEventListener('pointerdown', (e) => { e.stopPropagation(); pick(+b.dataset.i); }));
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
    const W = this.M.wild, wet = this.rain ? W.list.filter(([i]) => byId(i)?.type === 'water') : [];
    const L = wet.length && Math.random() < 0.5 ? wet : W.list; // water critters come out to play in the rain
    const [id, lo, hi] = L[Math.floor(Math.random() * L.length)];
    const lv = lo + Math.floor(Math.random() * (hi - lo + 1));
    this.encCool = 6;
    this.startWild(id, lv, null, Math.random() < SHINY_RATE);
  }

  wildFight(a) {
    if (this.busy) return;
    this.wild.splice(this.wild.indexOf(a), 1);
    a.excl = 1;
    this.startWild(a.id, a.lv, a, a.shiny);
  }

  startWild(id, lv, a, shiny = false) {
    this.busy = true;
    sfx.warn?.();
    if (a) this.bubble(a, '❗');
    const foe = withGear(shiny ? skinned(byId(id), 'shiny') : byId(id), lv);
    this.S.root.querySelector('.wd-flash')?.remove();
    const f = document.createElement('div'); f.className = 'wd-flash'; this.S.root.appendChild(f);
    setTimeout(() => this.S.worldFight({ foe, lv, kind: 'wild', name: `Wild ${foe.name}`, diff: 0.18 + lv * 0.03 + (shiny ? 0.1 : 0), shiny }), 900);
    if (shiny) this.S.toast('✨ A shiny critter!');
  }

  storyCheck() { return this.S.worldStoryStep?.(this) || false; }

  // the Critter Crown floats off the pedestal onto the hero's head
  crownScene() {
    const c = this.crown; if (!c) return;
    this.crown = null;
    const from = new THREE.Vector3(); c.getWorldPosition(from);
    c.parent.remove(c); this.group.add(c); c.position.copy(from);
    let t = 0;
    const tick = () => {
      if (!c.parent) return;
      t += 1 / 60;
      const k = Math.min(1, t / 1.6), p = this.hero.root.position, hy = 2.2 * CS;
      c.position.set(from.x + (p.x - from.x) * k, from.y + (hy - from.y) * k + Math.sin(k * Math.PI) * 1.5, from.z + (p.z - from.z) * k);
      c.rotation.y += 0.12;
      if (k < 1) requestAnimationFrame(tick);
      else {
        c.parent.remove(c);
        for (let i = 0; i < 40; i++) this.g.fx.spawn({ x: p.x, y: 2.5, z: p.z, vx: (Math.random() - 0.5) * 8, vy: 3 + Math.random() * 5, vz: (Math.random() - 0.5) * 8, color: [0xffd23f, 0xff5a8a, 0x5ad8ff, 0x8aff6a][i % 4], size: 0.35, life: 1.6, shape: 'confetti', additive: false, grav: 6, spin: 8, rot: Math.random() * 6 });
        sfx.fanfare?.(heroDef()); this.banner('👑 Champion of Clashara!');
      }
    };
    tick();
  }

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

// town folk doing their own thing: fishing, napping, dancing, hopping, cheering, waving, fanning themselves
function actPose(w, a, P, t, dt) {
  const act = a.n.act, cr = a.cr;
  idlePose(P, t);
  if (act === 'sleep') {
    P.sy = 0.88 + Math.sin(t * 1.4) * 0.05; P.lean = -0.18; P.head = 0.3; P.armLz = P.armRz = 0.05;
    cr.emote('closed', 'o', 0.2);
    if (Math.random() < dt * 0.6) w.g.fx.text?.({ x: a.root.position.x + 0.5, y: 2.4, z: a.root.position.z }, 'z', 'zz');
  } else if (act === 'dance') {
    const b = Math.abs(Math.sin(t * 6));
    P.y = b * 0.18; P.roll = Math.sin(t * 3) * 0.2; P.yaw = Math.sin(t * 1.5) * 0.6;
    P.armLz = 1.2 + Math.sin(t * 6) * 0.6; P.armRz = 1.2 - Math.sin(t * 6) * 0.6; P.legL = Math.sin(t * 6) * 0.5; P.legR = -P.legL;
    cr.emote('happy', 'grin', 0.2);
  } else if (act === 'hop') {
    const ph = (t * 1.3) % 2, up = ph < 0.5 ? Math.sin(ph / 0.5 * Math.PI) : 0;
    P.y = up * 0.55; P.sy = up ? 1.08 : 0.94 + Math.sin(t * 2) * 0.02; P.armLz = P.armRz = 0.3 + up * 1.2; P.legL = P.legR = -up * 0.4;
    if (up) cr.emote('happy', 'open', 0.1);
  } else if (act === 'cheer') {
    const k = Math.sin(t * 4);
    P.armLz = P.armRz = 2.2 + k * 0.3; P.y = Math.max(0, k) * 0.12; P.head = -0.15;
    cr.emote('happy', 'open', 0.1);
  } else if (act === 'wave') {
    const on = (t % 5) < 1.6;
    if (on) { P.armRz = 2.4; P.armRx = Math.sin(t * 10) * 0.5; P.headRoll = 0.15; cr.emote('happy', 'smile', 0.1); }
  } else if (act === 'fan') { // melting in the heat
    P.sy = 0.92 + Math.sin(t * 1.2) * 0.03; P.sx = 1.06; P.armRz = 1.4 + Math.sin(t * 9) * 0.5; P.head = 0.15; P.lean = -0.1;
    cr.emote('dizzy', 'wobbly', 0.1);
  } else if (act === 'fish') {
    P.armLx = P.armRx = -1.1 + Math.sin(t * 0.8) * 0.06; P.armLz = P.armRz = 0.2; P.lean = 0.05;
    if (!a.rod) { // a rod, a line and a bobber out over the water in front of them
      const g = new THREE.Group();
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 2.6, 6), toon(0x8a5a3a)); rod.rotation.x = 1.05; rod.position.set(0, 0.7, 1.2); g.add(rod);
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })); line.position.set(0, 0.8, 2.3); g.add(line);
      const bob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), toon(0xff4a4a)); bob.position.set(0, 0.08, 2.3); g.add(bob);
      g.userData.bob = bob; a.root.add(g); a.rod = g;
    }
    a.rod.userData.bob.position.y = 0.08 + Math.sin(t * 2.2) * 0.03;
    a.rod.rotation.x = Math.sin(t * 0.8) * 0.05;
  }
}
function idlePose(P, t) {
  P.sy = 1 + Math.sin(t * 2.4) * 0.025; P.sx = 1 - Math.sin(t * 2.4) * 0.015;
  P.armLz = P.armRz = 0.25; P.tail = 0.5 + Math.sin(t * 1.7) * 0.3;
  P.headRoll = Math.sin(t * 0.9) * 0.06;
}

// Captain Puff's hot-air balloon: a striped envelope over a wicker basket
function balloonModel(color) {
  const G = new THREE.Group();
  const stripes = canvasTex(256, 32, (c, W, H) => { for (let k = 0; k < 12; k++) { c.fillStyle = k % 2 ? '#fff4e0' : new THREE.Color(color).getStyle(); c.fillRect(k * W / 12, 0, W / 12 + 1, H); } });
  stripes.userData.own = true;
  const em = toon(0xffffff, { map: stripes, rim: 0.6 }); em.userData.own = true;
  const env = inked(new THREE.SphereGeometry(1.3, 24, 16), em, OL); env.scale.set(1, 1.12, 1); env.position.y = 3.75; G.add(env);
  const neck = inked(new THREE.CylinderGeometry(0.55, 0.3, 0.6, 16), em, OL * 0.6); neck.position.y = 2.6; G.add(neck);
  const basket = inked(new THREE.CylinderGeometry(0.62, 0.52, 0.7, 12), toon(0xc8925a), OL * 0.6); basket.position.y = 0.35; G.add(basket);
  const rim = inked(new THREE.TorusGeometry(0.62, 0.07, 6, 16), toon(0x8a5a3a), 0); rim.rotation.x = Math.PI / 2; rim.position.y = 0.7; G.add(rim);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.78, r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 4), toon(0x8a6a4a)); r.position.set(Math.cos(a) * 0.45, 1.65, Math.sin(a) * 0.45); r.rotation.set(Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08); G.add(r); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 8), toon(0xffb030, { emissive: 0xff7a00 })); flame.position.y = 2.15; flame.rotation.x = Math.PI; G.add(flame);
  G.traverse((o) => { if (o.isMesh) o.castShadow = !o.userData.hull; });
  return G;
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
