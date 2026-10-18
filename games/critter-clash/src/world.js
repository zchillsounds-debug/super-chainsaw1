// Adventure mode: a Red/Blue style tile world drawn with the game's 3D toon look.
// The hero (the critter the player picked) walks tile by tile; tall grass hides wild critters,
// some roam in plain sight; trainers spot you from a distance; stadiums are the gyms.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, inked, canvasTex } from './toon.js';
import { Critter, roleHat, shopHat, hatModel, SHOP_HATS } from './critters.js';
import { CRITTERS, CUPS, withGear, skinned } from './data.js';
import { save, persist, grantXp, xpNeeded } from './save.js';
import { sfx, playMusic } from './audio.js';
import { rivalFor } from './worldmaps.js';
import { getMap, CUP_ORDER } from './interiors.js';
import { countUp, deliveryFor, deliveredLine } from './story.js';
import { ARENAS } from './arena.js';
import { PhotoMode } from './photo.js';

export const TILE = 2;
const DIRS = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const YAW = { n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 };
// clock-of-day lighting for outdoor maps without their own mood
const PHASES = {
  day: null,
  evening: { sun: 0xffc896, sunI: 2.3, sky: 0xffe2cc, gnd: 0x6a5a48, hemiI: 1.05, fog: 0xffd8b8 },
  night: { sun: 0xa8b8ff, sunI: 0.95, sky: 0x7484cc, gnd: 0x2a3050, hemiI: 0.82, fog: 0x3a4878 },
};
const RAIN = {
  day: { sun: 0xb8c4dc, sunI: 0.85, sky: 0xaab8d0, gnd: 0x3a4a50, hemiI: 0.9, fog: 0x9aa8b8 },
  evening: { sun: 0xd0a898, sunI: 0.9, sky: 0xb0a4b8, gnd: 0x3a3a48, hemiI: 0.85, fog: 0x8a8898 },
};
// the snowy maps keep their own crisp daylight, but follow the clock after that: pink evenings, moonlit blue nights (with an aurora)
const SNOWY = {
  evening: { sun: 0xffb8c8, sunI: 2.0, sky: 0xffd6e4, gnd: 0x7a6aa8, hemiI: 1.1, fog: 0xf0d4e4 },
  night: { sun: 0x9ab4ff, sunI: 1.05, sky: 0x7088d8, gnd: 0x2a3a78, hemiI: 0.95, fog: 0x2a3668 },
};
// the volcano maps follow the clock too after daytime: an ember-red dusk, then a dark ash night where the magma glows brighter
const LAVA = {
  evening: { sun: 0xffa080, sunI: 1.5, sky: 0xffb0a0, gnd: 0x5a2a3a, hemiI: 1.0, fog: 0x6a3a40 },
  night: { sun: 0xc89aff, sunI: 0.95, sky: 0x8a6ab8, gnd: 0x3a1a2a, hemiI: 0.85, fog: 0x2a1424 },
};
let AUR;
const auroraTex = () => AUR ||= canvasTex(256, 128, (c) => {
  for (let x = 0; x < 256; x += 2) { // soft vertical streaks, brightest along a wavy middle band, fading out top and bottom
    const k = 0.15 + 0.85 * Math.pow(Math.abs(Math.sin(x * 0.09) * Math.sin(x * 0.031 + 1)), 1.6) + (x % 14 === 0 ? 0.3 : 0), g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45, `rgba(255,255,255,${0.35 * k})`); g.addColorStop(0.8, `rgba(255,255,255,${0.9 * k})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(x, 0, 2, 128);
  }
});
const LIT = new THREE.MeshBasicMaterial({ color: 0xffd870 }); // a lamp-lit window at night
let GLOW = null; // a soft radial glow (shared, never disposed)
const glowTex = () => GLOW ||= canvasTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
let PANEL = null; // solar panel cells on the lab roof (shared, never disposed)
const panelTex = () => PANEL ||= canvasTex(64, 64, (c) => {
  c.fillStyle = '#1f3a78'; c.fillRect(0, 0, 64, 64);
  c.strokeStyle = '#7fa6ff'; c.lineWidth = 2;
  for (let k = 0; k <= 64; k += 16) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, 64); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(64, k); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(22, 0); c.lineTo(0, 22); c.fill();
});

const MARKS = {}; // quest bubble materials (shared, never disposed)
const markMat = (k) => MARKS[k] ||= new THREE.SpriteMaterial({ depthTest: false, map: canvasTex(64, 64, (c) => {
  c.fillStyle = '#2a1630'; c.beginPath(); c.arc(32, 30, 27, 0, 7); c.fill();
  c.fillStyle = k === '!' ? '#ffd84d' : '#7ae0ff'; c.beginPath(); c.arc(32, 30, 23, 0, 7); c.fill();
  c.fillStyle = '#2a1630'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(k, 32, 32);
}) });
// where each side quest's lost thing turns up: a solid tile (tree, rock, palm) you face from next door
// what bites where (name, min cm, max cm; the last of each list is the rare one). The ☰ Journal lists them as a fish album.
export const FISH = {
  pond: [['Pond Minnow', 5, 14], ['Speckled Trout', 18, 45], ['Puffgill', 12, 28], ['Lantern Pike', 35, 75]],
  sea: [['Sandy Sprat', 8, 20], ['Silverfin', 18, 40], ['Bluegill Bop', 15, 32], ['Sunscale', 30, 70]],
  lava: [['Cinder Carp', 20, 45], ['Ember Eel', 30, 80]],
  cold: [['Cloud Minnow', 6, 16], ['Frostfin', 15, 35]],
};
export const LOST_SPOTS = { kite: { map: 'frostpeak', x: 22, y: 10 }, camera: { map: 'cinder', x: 28, y: 2 }, pearl: { map: 'route2', x: 27, y: 7 }, carrot: { map: 'cloudtop', x: 16, y: 9 }, binos: { map: 'glowwood', x: 11, y: 10 }, can: { map: 'route1', x: 4, y: 21 }, ball: { map: 'route1', x: 7, y: 9 }, phones: { map: 'ember', x: 23, y: 1 }, blink: { map: 'route2', x: 12, y: 10 } };

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

// weather: the grassy outdoor maps get the same few rainy 3-hour slots for everyone, picked from the date
export const canRain = (M) => !M.indoor && !M.mood && !M.city && !M.snow && !M.lava && M.border !== 'cloud';
export function rainAt(key, d, hr = d.getHours()) {
  return hash(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${Math.floor(hr / 3)}` + key) % 5 === 0;
}

// which visited town Trader Tock is in today (none before the Sprout Cup)
export function traderTown() {
  const towns = ['village', 'bloom', 'seashell', 'glowcap', 'ember', 'neon', 'cloudtop', 'frostpeak'].filter((k) => save.adv?.seen?.[k]);
  if (!save.adv?.flags?.cup_sprout || !towns.length) return null;
  return towns[hash(new Date().toISOString().slice(0, 10)) % towns.length];
}

// an umbrella held over a critter's head in the rain
function brolly(cr, col) {
  const U = new THREE.Group(), r = cr.def.body.headR;
  const can = inked(new THREE.ConeGeometry(r * 1.6, r * 0.75, 8, 1, true), toon(col, { rim: 0.4, side: THREE.DoubleSide }), OL * 0.3); can.position.y = r * 0.45; U.add(can);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 0.12, 6, 4), toon(0xffffff)); tip.position.y = r * 0.92; U.add(tip);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.05, r * 0.05, r * 2.2, 5), toon(0x5a3a2a)); stick.position.y = -r * 0.6; U.add(stick);
  U.position.set(r * 0.2, cr.def.body.h * 0.82 + r * 2.0, -r * 0.6); U.rotation.set(-0.4, 0, -0.12); cr.root.add(U);
  return U;
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

  // the hero's hat from the Bloom Town Hat Shop (it covers the Lv 15 gear crown while worn)
  wearHat() {
    const H = this.hero; if (!H) return;
    if (H.shopHat) { H.skull.remove(H.shopHat); H.shopHat = null; }
    H.shopHat = save.adv.hat ? shopHat(H, save.adv.hat) : null;
    if (H.gearCrown) H.gearCrown.visible = !H.shopHat;
    this.spinner = H.shopHat?.getObjectByName('spin') || null; // the Propeller Cap's spinner turns as you walk
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
    const wet = this.rain && !this.M?.indoor; // came in out of the rain: shake off once inside
    this.unload();
    this.g.fx.clear?.(); // last map's smoke, rain and sparkles don't follow you indoors
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
    this.outPhase = hr >= 17 && hr < 20 ? 'evening' : hr >= 20 || hr < 6 ? 'night' : 'day'; // what the room windows show
    this.phase = M.indoor || (M.mood && !M.snow && !M.lava && M.border !== 'cloud') ? 'day' : this.outPhase;
    // now and then a shower rolls over the grassy outdoor maps (the same few hours for everyone, picked from the date)
    this.rain = canRain(M) && (save.adv.rain ?? rainAt(key, new Date(), hr));
    const shut = M.bramble && !save.adv.flags[M.bramble];
    for (let ty = 0; ty < this.H; ty++) for (let tx = 0; tx < this.W; tx++) {
      const t = this.tile(tx, ty);
      if ('TP~#RhmvlWCXQDOKHUucFAb'.includes(t) || (t === 'B' && shut)) this.solid.add(tx + ',' + ty);
    }
    for (const s of M.signs || []) this.solid.add(s.x + ',' + s.y);
    this.buildGround(rand);
    this.buildTrees(rand);
    this.buildGrass(rand);
    this.buildProps(rand);
    this.buildForest(rand);
    this.buildVolcano(rand);
    this.buildFish();
    this.buildGulls();
    this.buildButterflies();
    this.buildMist();
    this.buildAurora();
    this.buildLamps();
    this.buildBonfire();
    this.buildThanks();
    this.buildBuildings();
    this.buildInterior();
    this.buildActors();
    // hero
    this.hero = new Critter(heroDef());
    this.hero.root.scale.setScalar(CS);
    this.group.add(this.hero.root);
    this.wearHat();
    if (this.rain) brolly(this.hero, 0xffd84d);
    this.shakeT = wet && M.indoor ? 1.1 : 0;
    this.hx = x; this.hy = y; this.dir = dir; this.moveT = 0; this.from = null;
    this.placeHero();
    this.buildItems(x, y);
    this.buildBush(x, y);
    this.buildLost();
    this.buildChamp();
    this.buildDig();
    this.makeFollower();
    this.camAt = null;
    this.steps = 0;
    this.encCool = 4;
    save.adv.map = key; save.adv.x = x; save.adv.y = y; save.adv.dir = dir;
    if (!key.startsWith('in:')) (save.adv.seen ||= {})[key] = true;
    persist();
    playMusic(M.music || 'camp');
    const B = this.base, lamp = M.indoor && this.outPhase !== 'day' && M.indoor !== 'arcade' && { sun: 0xffd2a0, sunI: B.sunI * (this.outPhase === 'night' ? 0.72 : 0.85), sky: 0xffe2c4, gnd: B.gnd, hemiI: B.hemiI * 0.85, fog: 0xcfeeff }; // lamplight indoors after dark
    this.mood(((M.snow || M.border === 'cloud') && SNOWY[this.phase]) || (M.lava && LAVA[this.phase]) || M.mood || lamp || (this.rain && RAIN[this.phase]) || PHASES[this.phase]);
    this.banner(M.name + (this.rain ? ' 🌧️' : ''));
  }

  unload() {
    if (!this.group) return;
    if (this.fishing) { this.fishing = null; this.busy = false; }
    this.fw = null;
    this.g.scene.remove(this.group);
    const maps = new Set();
    this.group.traverse((o) => {
      if (o.userData.critter) return;
      if (o.geometry && !o.userData.shared) o.geometry.dispose();
      for (const m of [].concat(o.material || [])) { if (m.map) maps.add(m.map); if (m.userData?.own) m.dispose(); }
    });
    for (const t of maps) if (t.userData?.own) t.dispose();
    this.group = null; this.grassGeo = null; this.prints = null; this.forgeFire = null; this.forgePool = null; this.lampPools = null; this.jars = null; this.pendulum = null; this.thanksFan = null; this.rocker = null; this.bonfire = null;
  }

  tile(x, y) { return this.M.tiles[y]?.[x] ?? 'T'; }

  buildGround(rand) {
    const P = 32, W = this.W, H = this.H, C = { a: '#7ad259', b: '#77cf56', tall: '#4fae3e', path: '#e8c98a', dark: 'rgba(40,120,40,0.35)', lite: 'rgba(200,255,150,0.4)', ...this.M.palette };
    if (this.phase === 'night' && !this.M.palette?.a) Object.assign(C, { a: '#5cae78', b: '#59ab75', tall: '#3e8a62', lite: 'rgba(170,230,210,0.35)' }); // moonlit grass leans blue-green
    // building footprints take the ground of the tile in front of their door row
    const under = (x, y) => { let k = y; while (this.tile(x, k) === 'h' && k < H) k++; const t = this.tile(x, k); return t === 'h' || t === 'T' ? '.' : t; };
    const tex = canvasTex(W * P, H * P, (c) => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let t = this.tile(x, y);
        if (t === 'h') t = under(x, y);
        if (t === 'R' || t === 'l' || t === 'v' || t === 'u' || t === 'c') { // lone props sit on whatever ground surrounds them (no grass squares on the beach)
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
          c.fillStyle = this.phase === 'night' ? ((x + y) % 2 ? '#eeeadc' : '#ebe6d6') : (x + y) % 2 ? '#f4dc9a' : '#f1d894'; /* moonlit sand reads silver, not mud */ c.beginPath(); c.roundRect(x * P, y * P, P, P, [g(-1, 0) && g(0, -1) ? rr : 0, g(1, 0) && g(0, -1) ? rr : 0, g(1, 0) && g(0, 1) ? rr : 0, g(-1, 0) && g(0, 1) ? rr : 0]); c.fill(); for (let k = 0; k < 6; k++) { c.fillStyle = rand() < 0.5 ? 'rgba(190,140,70,0.35)' : 'rgba(255,255,235,0.6)'; c.fillRect(x * P + rand() * P, y * P + rand() * P, 2, 2); } }
      }
      // ice sheets fill the inside of their bends with a curve too, so a pond reads as a pond, not a plus sign
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if ('iRT'.includes(this.tile(x, y))) continue;
        for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          if (this.tile(x + dx, y) !== 'i' || this.tile(x, y + dy) !== 'i') continue;
          const cx = (x + (dx > 0)) * P, cy = (y + (dy > 0)) * P, r = 12;
          c.fillStyle = C.ice || '#b8e4ff'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx - dx * r, cy); c.arc(cx - dx * r, cy - dy * r, r, dy > 0 ? Math.PI / 2 : -Math.PI / 2, dx > 0 ? 0 : Math.PI, (dx > 0) === (dy > 0)); c.closePath(); c.fill();
        }
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
        const night = this.phase === 'night';
        if (night) { c.fillStyle = this.M.palette?.water ? 'rgba(20,30,90,0.45)' : '#2f68b0'; c.fillRect(0, 0, w, h); } // night water: deeper blue, with starlight glinting on it
        c.strokeStyle = night ? 'rgba(200,220,255,0.35)' : 'rgba(255,255,255,0.55)'; c.lineWidth = 3;
        for (let k = 0; k < 7; k++) { const x = (k * 37) % w, y = (k * 53) % h; c.beginPath(); c.arc(x, y, 9, 0.2, 2.6); c.stroke(); }
        if (night) { c.fillStyle = 'rgba(255,248,200,0.95)'; for (let k = 0; k < 6; k++) { const x = (k * 47 + 11) % w, y = (k * 31 + 23) % h; c.fillRect(x, y, 3, 3); c.fillRect(x - 3, y + 1, 9, 1); } }
      }, { repeat: [1, 1] });
      wt.userData.own = true;
      const m = lava ? new THREE.MeshBasicMaterial({ map: wt, color: 0xffb080 }) : toon(0xffffff, { map: wt, rim: 0.2 });
      m.userData.own = true;
      this.waterTex = wt;
      const mesh = new THREE.Mesh(mergeGeometries(water), m);
      water.forEach((g) => g.dispose());
      this.group.add(mesh);
    }
    this.glowTide = null;
    if (water.length && this.phase === 'night' && this.M.arena === 'beach') { // after dark the surf along the beach glows blue (tiny sea sparks)
      const P = 32, br = rng(hash(this.key + ':tide'));
      const tex = canvasTex(W * P, H * P, (c) => {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (this.tile(x, y) !== '~') continue;
          for (const [dx, dy] of Object.values(DIRS)) {
            if (wet(x + dx, y + dy)) continue;
            const ex = (x + 0.5 + dx * 0.5) * P, ey = (y + 0.5 + dy * 0.5) * P, ix = (x + 0.5 + dx * 0.15) * P, iy = (y + 0.5 + dy * 0.15) * P;
            const g = c.createLinearGradient(ex, ey, ix, iy); g.addColorStop(0, 'rgba(90,240,255,0)'); g.addColorStop(0.25, 'rgba(90,240,255,0.85)'); g.addColorStop(1, 'rgba(60,160,255,0)');
            c.fillStyle = g; c.fillRect(Math.min(ex, ix) - (dy ? P / 2 : 0), Math.min(ey, iy) - (dx ? P / 2 : 0), dx ? Math.abs(ex - ix) : P, dy ? Math.abs(ey - iy) : P);
            c.fillStyle = 'rgba(200,255,255,0.9)';
            for (let k = 0; k < 4; k++) { const u = br(), v = 0.15 + br() * 0.25; c.fillRect(dx ? ex - dx * v * P : x * P + u * P, dy ? ey - dy * v * P : y * P + u * P, 2, 2); }
          }
        }
      });
      tex.userData.own = true;
      const gm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }); gm.userData.own = true;
      const gp = this.glowTide = new THREE.Mesh(new THREE.PlaneGeometry(W * TILE, H * TILE), gm);
      gp.rotation.x = -Math.PI / 2; gp.position.set(W * TILE / 2, 0.075, H * TILE / 2); this.group.add(gp);
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
    const TC = this.M.trees || (this.phase === 'night' ? [0x2f8a5a, 0x3a9a66, 0x6a4a3a] : [0x3fae4a, 0x4cc25a, 0x8a5a3a]); // moonlit canopies at night
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
    // neon glow pooled on the wet street, and delivery drones blinking across the sky
    const pools = [[], []];
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) if ('.:'.includes(this.tile(x, y)) && rand() < 0.1) {
      const [px, pz] = wpos(x, y), c = new THREE.CircleGeometry(0.5 + rand() * 0.5, 16); c.rotateX(-Math.PI / 2); c.scale(1.6, 1, 1); c.translate(px + (rand() - 0.5), 0.03, pz + (rand() - 0.5)); pools[rand() < 0.5 ? 0 : 1].push(c);
    }
    [0xff5ad8, 0x3af0ff].forEach((col, k) => { if (!pools[k].length) return; const pm = new THREE.MeshBasicMaterial({ color: col, map: glowTex(), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }); pm.userData.own = true; this.group.add(new THREE.Mesh(mergeGeometries(pools[k]), pm)); pools[k].forEach((g) => g.dispose()); });
    this.drones = [];
    for (let k = 0; k < 3; k++) {
      const g = new THREE.Group();
      g.add(inked(new THREE.BoxGeometry(0.5, 0.16, 0.5), toon(0xe8e4f4), OL * 0.4));
      for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 10), toon(0xb8b0d0)); r.position.set(ax * 0.36, 0.1, az * 0.36); g.add(r); }
      const lm = new THREE.MeshBasicMaterial({ color: k % 2 ? 0x3af0ff : 0xff5ad8 }); lm.userData.own = true;
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), lm); light.position.y = -0.12; g.add(light);
      const pk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.3), toon(0xffc870)); pk.position.y = -0.3; g.add(pk);
      g.scale.setScalar(1.5); this.group.add(g);
      this.drones.push({ g, light, y: 3.4 + k * 0.5, z: (0.2 + k * 0.3) * this.H * TILE, sp: 2.2 + k * 0.6, ph: k * 9 });
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
    const rocks = [], posts = [], rails = [], boards = [], sticks = [], snow = [], coal = [], carrot = [], drifts = [], frostRocks = [], caps = [], shards = [];
    const UMB = [[0xff5a7a, 0xffffff], [0x3ac8e8, 0xfff2a0], [0xffb030, 0xffffff]], canopy = [[], [], [], [], [], []], towels = [[], [], [], [], [], []], sand = [], sandD = [], flags = []; let nu = 0;
    const snowmen = this.M.snow && this.key !== 'peak'; // Frostpeak's rocks are snowmen; the Peak's lake keeps its boulders
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      const t = this.tile(x, y), [px, pz] = wpos(x, y);
      if (t === 'R' && snowmen) {
        for (const [r, h] of [[0.62, 0.5], [0.46, 1.2], [0.34, 1.75]]) { const g = new THREE.SphereGeometry(r, 16, 12); g.translate(px, h, pz); snow.push(g); }
        for (const ex of [-0.12, 0.12]) { const e = new THREE.SphereGeometry(0.055, 6, 5); e.translate(px + ex, 1.82, pz + 0.3); coal.push(e); }
        for (let k = 0; k < 3; k++) { const b = new THREE.SphereGeometry(0.06, 6, 5); b.translate(px, 1.05 + k * 0.17, pz + 0.45 - Math.abs(k - 1) * 0.02); coal.push(b); }
        const n = new THREE.ConeGeometry(0.07, 0.34, 8); n.rotateX(Math.PI / 2); n.translate(px, 1.72, pz + 0.48); carrot.push(n);
        for (const sd of [-1, 1]) { const a = new THREE.CylinderGeometry(0.03, 0.04, 0.8, 5); a.rotateZ(sd * 1.1); a.translate(px + sd * 0.72, 1.4, pz); sticks.push(a); }
        continue;
      }
      if (snowmen && t === '.' && rand() < 0.09 && this.tile(x, y + 1) !== ':' ) { // soft wind-blown drifts
        const g = new THREE.SphereGeometry(0.7 + rand() * 0.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1.4, 0.32, 0.9); g.rotateY(rand() * 3); g.translate(px + (rand() - 0.5), 0, pz + (rand() - 0.5)); drifts.push(g);
      }
      if (t === 'u') { // a striped beach umbrella with a towel laid out beside it
        const k = nu++ % UMB.length, pole = new THREE.CylinderGeometry(0.05, 0.05, 2.3, 6); pole.rotateZ(0.12); pole.translate(px, 1.15, pz); sticks.push(pole);
        for (let j = 0; j < 8; j++) { const c = new THREE.ConeGeometry(1.35, 0.55, 2, 1, true, j * Math.PI / 4, Math.PI / 4); c.rotateZ(0.12); c.translate(px - 0.27, 2.3, pz); canopy[k * 2 + (j % 2)].push(c); }
        const sd = this.tile(x + 1, y) === 's' ? 1 : -1;
        for (let j = 0; j < 4; j++) { const tw = new THREE.BoxGeometry(0.95, 0.04, 0.4); tw.translate(px + sd * 1.2, 0.03, pz - 0.6 + j * 0.4); towels[k * 2 + (j % 2)].push(tw); }
        continue;
      }
      if (t === 'c') { // Diggles' sandcastle: a keep, four towers, a gate, and a little flag
        const keep = new THREE.BoxGeometry(1.0, 0.6, 1.0); keep.translate(px, 0.3, pz); sand.push(keep);
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const tw = new THREE.CylinderGeometry(0.2, 0.24, 0.85, 8); tw.translate(px + dx * 0.55, 0.42, pz + dz * 0.55); sand.push(tw); const cr = new THREE.ConeGeometry(0.24, 0.3, 8); cr.translate(px + dx * 0.55, 1.0, pz + dz * 0.55); sandD.push(cr); }
        const top = new THREE.CylinderGeometry(0.28, 0.32, 0.45, 8); top.translate(px, 0.82, pz); sand.push(top);
        const gate = new THREE.BoxGeometry(0.3, 0.32, 0.06); gate.translate(px, 0.16, pz + 0.51); sandD.push(gate);
        const fp = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4); fp.translate(px, 1.3, pz); sticks.push(fp);
        const fl = new THREE.BoxGeometry(0.3, 0.18, 0.02); fl.translate(px + 0.16, 1.5, pz); flags.push(fl);
        if (save.adv.flags.seeds_done) { // Rosa's cloud flower puffs up beside the flag
          const cf = new THREE.Group(); cf.position.set(px - 0.12, 1.2, pz + 0.1); cf.scale.setScalar(1.7); this.group.add(cf);
          const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.3, 5), toon(0x4cba4a)); st.position.y = 0.15; cf.add(st);
          for (let k = 0; k < 5; k++) { const pf = inked(new THREE.IcosahedronGeometry(k ? 0.12 : 0.16, 1), toon(0xffffff, { rim: 0.6 }), 0.012); pf.position.set(k ? Math.cos(k * 1.57) * 0.13 : 0, 0.36 + (k ? 0 : 0.04), k ? Math.sin(k * 1.57) * 0.13 : 0); cf.add(pf); }
        }
        continue;
      }
      if (t === 'R' && this.M.snow) { // the Peak's boulders: frosted blue stone under a snow cap, with ice crystals growing out of them
        const sc = 0.9 + rand() * 0.25, ry = rand() * 3, r = new THREE.DodecahedronGeometry(0.75 * sc, 0); r.scale(1.1, 0.8, 1); r.rotateY(ry); r.translate(px, 0.48 * sc, pz); frostRocks.push(r);
        const c = new THREE.SphereGeometry(0.56 * sc, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); c.scale(1.1, 0.36, 1.0); c.rotateY(ry); c.translate(px, 0.9 * sc, pz); caps.push(c);
        for (let k = 0; k < 3; k++) { const a = ry + (k - 1) * 0.55, h = (k === 1 ? 1.5 : 1.0) + rand() * 0.3, sh = new THREE.CylinderGeometry(0, 0.2 + rand() * 0.08, h, 6); sh.translate(0, h / 2, 0); sh.rotateZ(-(k === 1 ? 0.3 : 0.55)); sh.rotateY(a); sh.translate(px + Math.cos(a) * 0.55 * sc, 0.3, pz - Math.sin(a) * 0.55 * sc); shards.push(sh); }
        continue;
      }
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
    put(rocks, 0x9a94a8); put(frostRocks, 0x7a8aa8); put(caps, 0xf8fbff, OL * 0.6); put(snow, 0xffffff);
    if (shards.length) { const m = inked(mergeGeometries(shards), toon(0xa8eaff, { rim: 1 }), OL * 0.5); m.castShadow = true; this.group.add(m); shards.forEach((g) => g.dispose()); } put(coal, 0x2a2a34, 0); put(carrot, 0xff8a2a, OL * 0.4);
    if (drifts.length) { const m = new THREE.Mesh(mergeGeometries(drifts), toon(0xf6faff, { rim: 0.8 })); m.receiveShadow = true; this.group.add(m); drifts.forEach((g) => g.dispose()); }
    put(posts, 0xfff4e0, OL * 0.6); put(rails, 0xfff4e0, OL * 0.5); put(sticks, 0x8a5a3a, OL * 0.5); put(boards, 0xc8925a);
    canopy.forEach((l, i) => { if (!l.length) return; const m = new THREE.Mesh(mergeGeometries(l), toon(UMB[i >> 1][i & 1], { side: THREE.DoubleSide })); m.castShadow = true; this.group.add(m); l.forEach((g) => g.dispose()); });
    towels.forEach((l, i) => { if (!l.length) return; const m = new THREE.Mesh(mergeGeometries(l), toon(UMB[i >> 1][i & 1])); m.receiveShadow = true; this.group.add(m); l.forEach((g) => g.dispose()); });
    put(sand, 0xfbe6aa, OL * 0.6); put(sandD, 0xc2924e, OL * 0.5); put(flags, 0xff4a5a, 0);
  }

  // the Glowcap woods: giant glowing toadstools (m), little glowcap clusters (g), bramble walls (B)
  buildForest(rand) {
    const stems = [], caps = [[], [], []], spots = [], tiny = [[], [], []], thorns = [], vines = [];
    const CAP = [0xff5a8a, 0x8a6aff, 0x2fd8b8];
    this.shrooms = [];
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      const t = this.tile(x, y), [px, pz] = wpos(x, y);
      if (t === 'm') {
        const s = 0.95 + rand() * 0.35, k = Math.floor(rand() * 3), lean = (rand() - 0.5) * 0.25;
        this.shrooms.push([px - lean * 1.8 * s, 1.9 * s + 0.6, pz, CAP[k]]);
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

  // now and then a little fish leaps out of open water (and plops back in)
  buildFish() {
    this.pond = []; this.fishJump = null; this.fishMesh = null;
    if (this.M.lava || this.M.border === 'cloud' || this.M.indoor) return;
    const wet = (x, y) => '~='.includes(this.tile(x, y));
    for (let y = 1; y < this.H - 1; y++) for (let x = 1; x < this.W - 1; x++) if (this.tile(x, y) === '~' && wet(x + 1, y) && wet(x - 1, y) && wet(x, y + 1) && wet(x, y - 1)) this.pond.push(wpos(x, y));
    if (!this.pond.length) return;
    const g = new THREE.Group(), M = toon(this.M.snow ? 0x8ad0ff : 0xff8a3a, { rim: 0.8 });
    const body = inked(new THREE.SphereGeometry(0.22, 12, 8), M, OL * 0.4); body.scale.set(0.7, 0.8, 1.5); g.add(body);
    const tail = inked(new THREE.ConeGeometry(0.16, 0.28, 4), M, OL * 0.4); tail.rotation.x = -Math.PI / 2; tail.scale.x = 0.3; tail.position.z = -0.42; g.add(tail);
    for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), toon(0x1a1a2a)); e.position.set(sd * 0.12, 0.06, 0.2); g.add(e); }
    g.scale.setScalar(1.6); g.visible = false; this.group.add(g); this.fishMesh = g;
  }

  // seagulls wheel over the beach maps, wings flapping, shadows on the sand
  buildGulls() {
    this.gulls = [];
    if (this.M.arena !== 'beach' || this.M.indoor || this.phase === 'night') return; // gulls roost at night
    const W = toon(0xffffff, { rim: 0.6 }), T = toon(0x9aa4b4);
    for (let k = 0; k < 3; k++) {
      const g = new THREE.Group();
      const body = inked(new THREE.SphereGeometry(0.16, 10, 8), W, OL * 0.4); body.scale.set(0.8, 0.8, 1.8); g.add(body);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), toon(0xffb030)); beak.rotation.x = Math.PI / 2; beak.position.z = 0.34; g.add(beak);
      const wings = [];
      for (const sd of [-1, 1]) {
        const wg = new THREE.Group(); wg.position.x = sd * 0.08;
        const wm = inked(new THREE.BoxGeometry(0.7, 0.03, 0.26), W, OL * 0.3); wm.position.x = sd * 0.35; wg.add(wm);
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 0.22), T); tip.position.x = sd * 0.62; wg.add(tip);
        g.add(wg); wings.push([wg, sd]);
      }
      g.scale.setScalar(1.4);
      this.group.add(g);
      this.gulls.push({ g, wings, r: 5 + k * 2.5, sp: 0.35 + k * 0.08, ph: k * 2.1, y: 4 + k * 0.6 });
    }
  }

  // butterflies flutter over the flower beds on fine days
  // low mist drifting between the trees of the glowing woods (and over any map at night after rain... just the woods for now)
  // little after-touches of finished deliveries: Puff's glowcap night-light by the picnic blanket
  buildThanks() {
    this.thanksFan = null;
    if (this.key === 'ember' && save.adv.flags.fan_done) { // Tinker Volt's pocket fan, whirring beside Pengsicle at the hot springs
      const n = (this.M.npcs || []).find((x) => x.id === 'spa'); if (!n) return;
      const [px, pz] = wpos(n.x, n.y), g = new THREE.Group(); g.position.set(px + 0.9, 0, pz + 0.75); g.rotation.y = -2.3; g.scale.setScalar(1.7);
      const body = toon(0x6ad8ff), wh = toon(0xffffff);
      const base = inked(new THREE.CylinderGeometry(0.22, 0.26, 0.12, 12), body, OL * 0.4); base.position.y = 0.06; g.add(base);
      const st = inked(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), wh, OL * 0.3); st.position.y = 0.36; g.add(st);
      const head = new THREE.Group(); head.position.y = 0.66; head.rotation.x = -0.75; g.add(head);
      const cage = inked(new THREE.TorusGeometry(0.26, 0.03, 6, 20), body, OL * 0.3); head.add(cage);
      const hub = inked(new THREE.SphereGeometry(0.07, 10, 8), body, OL * 0.3); hub.position.z = 0.02; head.add(hub);
      const blades = new THREE.Group(); blades.position.z = 0.03; head.add(blades);
      for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), wh); b.scale.set(0.4, 1, 0.08); b.position.set(0, 0.12, 0); const pv = new THREE.Group(); pv.rotation.z = k / 3 * Math.PI * 2; pv.add(b); blades.add(pv); }
      this.group.add(g); this.thanksFan = blades;
      return;
    }
    if (this.key !== 'cloudtop' || !save.adv.flags.lamp_done) return;
    const n = (this.M.npcs || []).find((x) => x.id === 'picnic'); if (!n) return;
    const [px, pz] = wpos(n.x, n.y), g = new THREE.Group(); g.position.set(px + 1.0, 0, pz - 0.7);
    const st = inked(new THREE.CylinderGeometry(0.07, 0.1, 0.4, 8), toon(0xf4e4d0), OL * 0.4); st.position.y = 0.2; g.add(st);
    const cp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff7ab8 })); cp.material.userData.own = true; cp.scale.y = 0.65; cp.position.y = 0.38; g.add(cp);
    const sm = new THREE.SpriteMaterial({ map: glowTex(), color: 0xff6ab0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: this.phase === 'night' ? 0.9 : 0.5 }); sm.userData.own = true;
    const sp = new THREE.Sprite(sm); sp.scale.setScalar(1.6); sp.position.y = 0.45; g.add(sp);
    this.group.add(g);
  }

  // street lamps at the edges of town paths (on tile corners, so they never block a step); lit from dusk
  buildLamps() {
    const M = this.M;
    if (M.indoor || M.city || !(M.buildings || []).some((b) => b.heal)) return;
    const ok = (x, y) => '.:"sf'.includes(this.tile(x, y)) && !this.solid.has(x + ',' + y), cand = [];
    for (let y = 1; y < this.H - 1; y++) for (let x = 1; x < this.W - 1; x++) { // corner between tiles (x-1..x, y-1..y)
      const q = [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]];
      if (!q.every(([a, b]) => ok(a, b))) continue;
      const n = q.filter(([a, b]) => this.tile(a, b) === ':').length;
      if (n === 2 && (this.tile(x - 1, y - 1) === ':') === (this.tile(x, y) === ':') === false) cand.push([x, y]); // a straight path edge
    }
    const r = rng(hash(this.key + ':lamps')); cand.sort(() => r() - 0.5);
    const picked = [];
    for (const c of cand) { if (picked.length >= 6) break; if (picked.every((p) => Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]) >= 8)) picked.push(c); }
    if (!picked.length) return;
    const lit = this.phase !== 'day', iron = [], glass = [];
    for (const [cx, cy] of picked) {
      const px = cx * TILE, pz = cy * TILE;
      // a stout Victorian lamp: stepped base, fluted post with a collar, a framed lantern, a peaked cap and a finial
      const b = new THREE.CylinderGeometry(0.22, 0.28, 0.3, 8); b.translate(px, 0.15, pz); iron.push(b);
      const b2 = new THREE.CylinderGeometry(0.14, 0.2, 0.22, 8); b2.translate(px, 0.41, pz); iron.push(b2);
      const p = new THREE.CylinderGeometry(0.09, 0.11, 2.1, 8); p.translate(px, 1.55, pz); iron.push(p);
      const col = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8); col.translate(px, 1.2, pz); iron.push(col);
      const top = new THREE.CylinderGeometry(0.24, 0.12, 0.14, 4); top.rotateY(Math.PI / 4); top.translate(px, 2.62, pz); iron.push(top);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const f = new THREE.BoxGeometry(0.05, 0.5, 0.05); f.translate(px + dx * 0.19, 2.94, pz + dz * 0.19); iron.push(f); }
      const cap = new THREE.ConeGeometry(0.36, 0.32, 4); cap.rotateY(Math.PI / 4); cap.translate(px, 3.35, pz); iron.push(cap);
      const fin = new THREE.SphereGeometry(0.07, 6, 4); fin.translate(px, 3.56, pz); iron.push(fin);
      const g = new THREE.BoxGeometry(0.34, 0.46, 0.34); g.translate(px, 2.94, pz); glass.push(g);
      if (lit) {
        const sm = new THREE.SpriteMaterial({ map: glowTex(), color: 0xffc060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: this.phase === 'night' ? 0.9 : 0.55 }); sm.userData.own = true;
        const sp = new THREE.Sprite(sm); sp.scale.setScalar(2); sp.position.set(px, 2.94, pz); this.group.add(sp);
        const pm = new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xffb050, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: this.phase === 'night' ? 0.45 : 0.25 }); pm.userData.own = true;
        const pool = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), pm); pool.rotation.x = -Math.PI / 2; pool.position.set(px, 0.05, pz); this.group.add(pool);
      }
    }
    const im = inked(mergeGeometries(iron), toon(0x3a3a4a), OL * 0.5); im.castShadow = true; this.group.add(im); iron.forEach((g) => g.dispose());
    const gm = new THREE.Mesh(mergeGeometries(glass), lit ? LIT : toon(0xfff4d0, { rim: 0.8 })); this.group.add(gm); glass.forEach((g) => g.dispose());
  }

  // a beach bonfire in Seashell Town after dusk: logs, flickering flames, sparks and a warm pool of light on the sand
  buildBonfire() {
    this.bonfire = null;
    const at = { seashell: [13, 15, 's'], frostpeak: [9, 10, '.'] }[this.key]; // Seashell: between the umbrellas by the water; Frostpeak: in the open snow by the ice pond
    if (!at || this.phase === 'day' || this.M.indoor) return;
    const taken = new Set([...(this.M.npcs || []).map((n) => n.x + ',' + n.y), ...this.doors.map((d) => d.x + ',' + (d.y + 1)), ...this.itemSpots, ...(this.M.signs || []).map((g) => g.x + ',' + g.y), this.hx + ',' + this.hy, this.dig ? this.dig.x + ',' + this.dig.y : '']);
    const spot = at.slice(0, 2);
    if (this.tile(...spot) !== at[2] || taken.has(spot.join(','))) return;
    const [x, y] = spot, [px, pz] = wpos(x, y), g = new THREE.Group(); g.position.set(px, 0, pz); g.scale.setScalar(1.35);
    this.solid.add(x + ',' + y);
    const wood = toon(0x7a4a2a), stone = toon(0x9a94a0);
    if (this.M.snow) { const wet = new THREE.Mesh(new THREE.CircleGeometry(0.95, 18), toon(0x8a94b8)); wet.rotation.x = -Math.PI / 2; wet.position.y = 0.03; wet.receiveShadow = true; g.add(wet); } // the snow has melted round the fire
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, st = inked(new THREE.SphereGeometry(0.16, 7, 5), stone, OL * 0.3); st.scale.y = 0.6; st.position.set(Math.cos(a) * 0.62, 0.06, Math.sin(a) * 0.62); g.add(st); }
    for (let k = 0; k < 3; k++) { const l = inked(new THREE.CylinderGeometry(0.08, 0.09, 0.9, 7), wood, OL * 0.3); l.rotation.z = Math.PI / 2; l.rotation.y = k / 3 * Math.PI; l.position.y = 0.12 + k * 0.05; g.add(l); }
    const flames = [];
    const fire = new THREE.Group(); fire.rotation.x = -0.5; fire.position.y = 0.18; g.add(fire); // leans away a little, so the flames read from the high camera
    [[0xff4a1a, 0.34, 1.25, 0, 0], [0xff7a2a, 0.16, 0.8, 0.22, 0.1], [0xff7a2a, 0.15, 0.7, -0.2, -0.05], [0xffb040, 0.22, 0.95, 0, 0.05], [0xfff0a0, 0.12, 0.55, 0, 0.1]].forEach(([c, r, h, ox, oz]) => { const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.95 }); m.userData.own = true; const geo = new THREE.ConeGeometry(r, h, 8); geo.translate(0, h / 2, 0); const f = new THREE.Mesh(geo, m); f.position.set(ox, 0, oz); f.rotation.z = -ox * 1.2; fire.add(f); flames.push(f); });
    const sm = new THREE.SpriteMaterial({ map: glowTex(), color: 0xff9a40, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 }); sm.userData.own = true;
    const sp = new THREE.Sprite(sm); sp.scale.setScalar(3.2); sp.position.y = 0.8; g.add(sp);
    const pm = new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xff9040, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55 }); pm.userData.own = true;
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), pm); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.05; g.add(pool);
    if ((save.adv.fire || {})[this.key] !== new Date().toISOString().slice(0, 10)) { // tonight's bag of marshmallows (gone once you've had one)
      const bag = inked(new THREE.BoxGeometry(0.34, 0.4, 0.22), toon(0xffd8ec), OL * 0.3); bag.position.set(0.85, 0.2, 0.45); bag.rotation.y = 0.4; g.add(bag);
      for (let k = 0; k < 2; k++) { const m = inked(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10), toon(0xffffff, { rim: 0.6 }), OL * 0.2); m.position.set(0.72 + k * 0.2, 0.05, 0.75 - k * 0.05); g.add(m); }
    }
    this.group.add(g);
    this.bonfire = { g, flames, sp, pool, px, pz, x, y };
  }

  // aurora ribbons hang over the snowy maps at night, waving slowly (they follow the camera, high up)
  buildAurora() {
    this.aurora = [];
    if (!this.M.snow || this.phase !== 'night' || this.M.indoor) return;
    [[0x5affb0, 0], [0x6ad8ff, 1], [0xc08aff, 2]].forEach(([col, k]) => {
      const m = new THREE.MeshBasicMaterial({ map: auroraTex(), color: col, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }); m.userData.own = true;
      const geo = new THREE.PlaneGeometry(44, 3.6, 44, 1), q = new THREE.Mesh(geo, m); q.rotation.x = -0.75; q.renderOrder = 5;
      this.group.add(q); this.aurora.push({ q, base: Float32Array.from(geo.attributes.position.array), k });
    });
  }

  buildMist() {
    this.mist = [];
    if (!this.M.fireflies) return;
    const mr = rng(hash(this.key + ':mist'));
    for (let k = 0; k < 14; k++) {
      const m = new THREE.MeshBasicMaterial({ map: glowTex(), color: k % 3 ? 0xc8fff4 : 0xe0ccff, transparent: true, depthWrite: false, fog: false, opacity: 0.3 + mr() * 0.15 }); m.userData.own = true;
      const q = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
      q.rotation.x = -Math.PI / 2; q.scale.set(5 + mr() * 4, 2.6 + mr() * 1.6, 1);
      q.position.set(mr() * this.W * TILE, 1.2 + k * 0.05, mr() * this.H * TILE); this.group.add(q);
      this.mist.push({ q, v: (mr() < 0.5 ? -1 : 1) * (0.25 + mr() * 0.3), ph: mr() * 6 });
    }
  }

  buildButterflies() {
    this.flies = [];
    if (this.M.indoor || this.M.snow || this.M.city || this.M.lava || this.rain || this.phase === 'night') return;
    const spots = [];
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) if (this.tile(x, y) === 'f') spots.push(wpos(x, y));
    if (!spots.length) return;
    const cols = [0xffd84d, 0xff8ac8, 0x8ad8ff, 0xffffff, 0xff9a4a];
    for (let k = 0; k < Math.min(6, spots.length); k++) {
      const g = new THREE.Group(), col = cols[k % cols.length], M = toon(col, { rim: 0.6, side: THREE.DoubleSide }), wings = [];
      for (const sd of [-1, 1]) {
        const wg = new THREE.Group();
        const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(sd * 0.3, 0.25, sd * 0.42, 0.05, sd * 0.3, -0.05); sh.bezierCurveTo(sd * 0.35, -0.2, sd * 0.1, -0.25, 0, 0);
        const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), M); m.rotation.x = -Math.PI / 2; wg.add(m); g.add(wg); wings.push([wg, sd]);
      }
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 5), toon(0x3a2a2a)); b.rotation.x = Math.PI / 2; g.add(b);
      g.scale.setScalar(2); this.group.add(g);
      const [sx, sz] = spots[(k * 7) % spots.length];
      this.flies.push({ g, wings, sx, sz, ph: k * 1.7 });
    }
  }

  updateFish2(dt) {
    const F = this.fishJump, G = this.fishMesh;
    if (!G) return;
    const splash = (x, z) => { for (let k = 0; k < 6; k++) this.g.fx.spawn({ x, y: 0.1, z, vx: (Math.random() - 0.5) * 1.6, vy: 1 + Math.random(), vz: (Math.random() - 0.5) * 1.6, color: 0xe8f6ff, size: 0.14, life: 0.45, shape: 'glow', additive: false, grav: 8 }); this.g.fx.spawn({ x, y: 0.06, z, color: 0xe8f2ff, alpha: 0.7, size: 0.4, life: 0.5, shape: 'ring', additive: false, grow: 2 }); };
    if (!F) {
      if (Math.random() > dt * 0.3) return;
      const p = this.hero.root.position, near = this.pond.filter(([x, z]) => Math.abs(x - p.x) < 14 && z - p.z > -10 && z - p.z < 7);
      if (!near.length) return;
      const [x, z] = near[Math.floor(Math.random() * near.length)], a = Math.random() * Math.PI * 2;
      this.fishJump = { t: 0, x, z, dx: Math.cos(a), dz: Math.sin(a) };
      G.visible = true; G.rotation.set(0, Math.atan2(Math.cos(a), Math.sin(a)), 0); splash(x, z);
      return;
    }
    F.t += dt;
    const k = Math.min(1, F.t / 0.75);
    G.position.set(F.x + F.dx * k * 1.3, Math.sin(k * Math.PI) * 1.0 - 0.15, F.z + F.dz * k * 1.3);
    G.rotation.x = -Math.cos(k * Math.PI) * 0.9;
    if (k >= 1) { G.visible = false; this.fishJump = null; splash(G.position.x, G.position.z); }
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
    this.cracks = null;
    if (!this.M.lava) return;
    // magma glows up through cracks in the dark rock (an unlit layer just above the ground, its own dice)
    const cr = rng(hash(this.key + ':cracks')), P = 32, W = this.W, H = this.H;
    const tex = canvasTex(W * P, H * P, (c) => {
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (this.tile(x, y) !== '.' || cr() > 0.2) continue;
        let px = (x + 0.2 + cr() * 0.6) * P, py = (y + 0.2 + cr() * 0.6) * P, a = cr() * 6.28;
        const pts = [[px, py]], fork = [];
        for (let k = 0, n = 4 + Math.floor(cr() * 3); k < n; k++) {
          a += (k % 2 ? 1 : -1) * (0.4 + cr() * 0.7); const l = 5 + cr() * 6; px += Math.cos(a) * l; py += Math.sin(a) * l; pts.push([px, py]);
          if (k === 2) { const b = a + (cr() < 0.5 ? 1 : -1) * 1.1; fork.push([px, py], [px + Math.cos(b) * 7, py + Math.sin(b) * 7], [px + Math.cos(b + 0.5) * 12, py + Math.sin(b + 0.5) * 12]); }
        }
        for (const [wd, col] of [[6, 'rgba(255,90,20,0.3)'], [2.6, 'rgba(255,130,40,0.85)'], [1, 'rgba(255,230,150,1)']]) {
          c.strokeStyle = col; c.lineWidth = wd;
          for (const L of [pts, fork]) { c.beginPath(); L.forEach(([u, v], k) => k ? c.lineTo(u, v) : c.moveTo(u, v)); c.stroke(); }
        }
      }
    });
    tex.userData.own = true;
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }); m.userData.own = true;
    const plane = this.cracks = new THREE.Mesh(new THREE.PlaneGeometry(W * TILE, H * TILE), m);
    plane.rotation.x = -Math.PI / 2; plane.position.set(W * TILE / 2, 0.025, H * TILE / 2); this.group.add(plane);
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
    this.doors = []; this.chimneys = []; this.pennants = []; this.medals = []; this.labDish = this.beacon = null;
    if (!this.M.city) this.drones = null;
    for (const b of this.M.buildings || []) {
      const x0 = b.x * TILE, z0 = b.y * TILE, w = b.w * TILE, d = b.h * TILE;
      const G = new THREE.Group();
      G.position.set(x0 + w / 2, 0, z0 + d / 2);
      if (b.stadium) { this.stadiumModel(G, b, w, d); this.stadiumLights(G, w, d); }
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
          // the dish sits on a turning mount; a parapet, solar panels, a glass skylight and a blinking aerial make the flat roof read as a lab
          const mount = new THREE.Group(); mount.position.set(w * 0.28, wallH + 0.35, -d * 0.12); G.add(mount);
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.5, 8), toon(0x9aa4b4)); pole.position.y = 0.25; mount.add(pole);
          dish.rotation.x = -0.6; dish.position.set(0, 0.6, 0); mount.add(dish);
          this.labDish = mount;
          const rim = [], pw = w - 0.1, pd = d - 0.2;
          for (const [sx, sz, gx, gz] of [[pw, 0.14, 0, pd / 2 - 0.07], [pw, 0.14, 0, -pd / 2 + 0.07], [0.14, pd, pw / 2 - 0.07, 0], [0.14, pd, -pw / 2 + 0.07, 0]]) {
            const g = new THREE.BoxGeometry(sx, 0.22, sz); g.translate(gx, wallH + 0.45, gz); rim.push(g);
          }
          G.add(inked(mergeGeometries(rim), toon(0xc8d2de), OL * 0.6)); rim.forEach((g) => g.dispose());
          const pm = toon(0xffffff, { map: panelTex(), rim: 0.6 });
          for (const k of [-1, 0]) {
            const panel = inked(new THREE.BoxGeometry(1.5, 0.08, 1.0), pm, OL * 0.5);
            panel.rotation.x = 0.35; panel.position.set(-w * 0.22 + k * 1.75, wallH + 0.62, d * 0.12); G.add(panel);
            const leg = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 0.08), toon(0x8a94a4)); leg.position.set(panel.position.x, wallH + 0.45, d * 0.12 - 0.35); G.add(leg);
          }
          const sky = inked(new THREE.SphereGeometry(0.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x9ad8ff, { rim: 1 }), OL * 0.5);
          sky.scale.set(1.3, 0.6, 1); sky.position.set(w * 0.05, wallH + 0.34, d * 0.18); G.add(sky);
          const aer = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.6, 6), toon(0x9aa4b4)); aer.position.set(w * 0.4, wallH + 1.15, d * 0.25); G.add(aer);
          const bm = new THREE.MeshBasicMaterial({ color: 0xff4040 }); bm.userData.own = true;
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), bm); bulb.position.set(w * 0.4, wallH + 1.98, d * 0.25); G.add(bulb);
          this.beacon = bulb;

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
        if (b.lab || b.hatShop) { // a name board over the door
          const ltex = canvasTex(256, 48, (c) => {
            c.fillStyle = b.hatShop ? '#5a2a8a' : '#2a4a7a'; c.beginPath(); c.roundRect(2, 2, 252, 44, 10); c.fill();
            c.fillStyle = '#ffffff'; c.font = 'bold 30px Lilita One, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText((b.label || 'LAB').toUpperCase(), 128, 26);
          });
          ltex.userData.own = true;
          const lm = new THREE.MeshBasicMaterial({ map: ltex, transparent: true }); lm.userData.own = true;
          const plate = new THREE.Mesh(new THREE.PlaneGeometry(b.hatShop ? 2.2 : 2.6, b.hatShop ? 0.42 : 0.48), lm);
          plate.position.set(dx, wallH - 0.3, d / 2 - 0.17); G.add(plate);
        }
        if (b.hatShop) { // a giant top hat perched on the ridge, and a striped awning over the door
          const sk = new THREE.Group(); sk.position.set(-w * 0.18, wallH + 1.25, 0); sk.rotation.x = -0.25; G.add(sk);
          const big = hatModel({ def: { body: { headR: 1.25 } }, skull: sk }, 'top', 0x2a2438, 0xff3a5a); big.position.y = 0;
          const aw = [];
          for (let k = 0; k < 6; k++) { const g = new THREE.BoxGeometry(0.28, 0.06, 0.8); g.translate(dx - 0.7 + k * 0.28, 0, 0); aw.push(g); }
          const A0 = new THREE.Mesh(mergeGeometries(aw.filter((_, k) => k % 2)), toon(0xffffff)), A1 = new THREE.Mesh(mergeGeometries(aw.filter((_, k) => !(k % 2))), toon(0xb07aff));
          for (const m of [A0, A1]) { m.position.set(0, 1.55, front + 0.42); m.rotation.x = 0.45; G.add(m); }
          aw.forEach((g) => g.dispose());
        }
        const door = inked(new THREE.BoxGeometry(0.9, 1.3, 0.12), toon(0x8a5a3a), OL * 0.5); door.position.set(dx, 0.65, front + 0.03); G.add(door);
        if (!b.hatShop) { // a little wall lantern beside the door: dark glass by day, a warm glow at dusk and after dark
          const lx = dx + (b.door === b.w - 1 ? -0.78 : 0.78), lit = this.phase !== 'day';
          const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), toon(0x3a3440)); arm.position.set(lx, 1.42, front + 0.25); G.add(arm);
          const cage = inked(new THREE.BoxGeometry(0.3, 0.36, 0.3), lit ? LIT : toon(0xfff0c0, { rim: 0.8 }), OL * 0.4); cage.position.set(lx, 1.2, front + 0.5); G.add(cage);
          const cap = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.12, 4), toon(0x3a3440)); cap.rotation.y = Math.PI / 4; cap.position.set(lx, 1.44, front + 0.5); G.add(cap);
          if (lit) {
            const sm = new THREE.SpriteMaterial({ map: glowTex(), color: 0xffc060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: this.phase === 'night' ? 0.85 : 0.5 }); sm.userData.own = true;
            const glow = new THREE.Sprite(sm); glow.userData.shared = true; glow.scale.setScalar(1.6); glow.position.set(lx, 1.2, front + 0.62); G.add(glow);
          }
        }
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
    this.items = []; this.itemSpots = [];
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
      this.itemSpots.push(tx + ',' + ty);
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

  // a berry bush at the edge of the trees in every outdoor map: shake it once a day for berries (and now and then a sleepy wild critter)
  // lost things for townsfolk side quests (flags <id>_asked → <id>_found → <id>_done; the lines live in story.js LOST)
  buildLost() {
    for (const L of this.lost || []) { this.group.remove(L.g); L.g.traverse((o) => o.geometry?.dispose()); }
    this.lost = [];
    const F = save.adv.flags;
    for (const [id, Q] of Object.entries(LOST_SPOTS)) {
      if (Q.map !== this.key || !F[id + '_asked'] || F[id + '_found']) continue;
      const [px, pz] = wpos(Q.x, Q.y), g = new THREE.Group();
      if (id === 'kite') { // red and yellow, with a bow tail, tangled in the branches
        const half = (col, f) => { const q = new THREE.Shape(); q.moveTo(0, 0.7); q.lineTo(0.42 * f, 0); q.lineTo(0, -0.9); q.closePath(); g.add(new THREE.Mesh(new THREE.ShapeGeometry(q), toon(col, { side: THREE.DoubleSide }))); };
        half(0xff4a4a, 1); half(0xffd84d, -1);
        const sh = new THREE.Shape(); sh.moveTo(0, 0.7); sh.lineTo(0.42, 0); sh.lineTo(0, -0.9); sh.lineTo(-0.42, 0); sh.closePath();
        const ink = new THREE.Mesh(new THREE.ShapeGeometry(sh), toon(0x2a1630, { side: THREE.DoubleSide })); ink.scale.setScalar(1.08); ink.position.z = -0.01; g.add(ink);
        for (const [w2, h2] of [[0.03, 1.6], [0.84, 0.03]]) { const st = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, 0.03), toon(0x8a5a3a)); st.position.set(0, h2 > 1 ? -0.1 : 0, 0.02); g.add(st); }
        for (let k = 0; k < 4; k++) { const bow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.03), toon(k % 2 ? 0xff4a4a : 0xffd84d)); bow.position.set(Math.sin(k * 1.3) * 0.15, -1.05 - k * 0.3, 0.02); bow.rotation.z = 0.6 * (k % 2 ? 1 : -1); g.add(bow); }
        g.position.set(px - 0.5, 2.6, pz + 0.8); g.rotation.set(-0.9, 0.2, 0.5); g.scale.setScalar(1.4);
      } else if (id === 'camera') { // a tourist's camera left on a warm rock
        g.add(inked(new THREE.BoxGeometry(0.6, 0.38, 0.3), toon(0x3a3a4a), OL * 0.4));
        const lens = inked(new THREE.CylinderGeometry(0.13, 0.15, 0.2, 14), toon(0x8a94a4), OL * 0.3); lens.rotation.x = Math.PI / 2; lens.position.z = 0.22; g.add(lens);
        const gl = new THREE.Mesh(new THREE.CircleGeometry(0.1, 14), toon(0x5ad8ff, { rim: 1 })); gl.position.z = 0.33; g.add(gl);
        const bt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.1), toon(0xff5a5a)); bt.position.set(0.18, 0.22, 0); g.add(bt);
        const strap = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 4, 16, Math.PI), toon(0xff9a3a)); strap.position.y = 0.15; g.add(strap);
        g.position.set(px, 1.0, pz + 0.3); g.rotation.set(-0.3, 0.4, 0.1);
      } else if (id === 'pearl') { // a lucky pearl in an open shell, by a palm
        const sh = inked(new THREE.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xffc8d8), OL * 0.3); sh.scale.y = 0.4; sh.rotation.x = Math.PI; sh.position.y = 0.13; g.add(sh);
        const lid = inked(new THREE.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xffd8e4), OL * 0.3); lid.scale.y = 0.4; lid.position.set(0, 0.14, -0.22); lid.rotation.x = -1.1; g.add(lid);
        const pe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), toon(0xfffaf0, { rim: 1 })); pe.position.set(0, 0.2, 0.02); g.add(pe);
        g.position.set(px - 0.3, 0.02, pz + 0.75); g.scale.setScalar(1.6);
      }
      else if (id === 'carrot') { // a snowman's carrot nose, dropped on a rock (with a nibble out of it)
        const c = inked(new THREE.ConeGeometry(0.13, 0.7, 10), toon(0xff8a2a), OL * 0.3); c.rotation.z = Math.PI / 2; g.add(c);
        for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 5), toon(0x4cba4a)); l.position.set(0.38, 0.05, (k - 1) * 0.07); l.rotation.z = -Math.PI / 2 + (k - 1) * 0.4; g.add(l); }
        g.position.set(px, 0.95, pz + 0.3); g.rotation.y = 0.5;
      } else if (id === 'binos') { // binoculars hanging by their strap from a low branch
        for (const sd of [-1, 1]) { const b = inked(new THREE.CylinderGeometry(0.12, 0.14, 0.42, 12), toon(0xffb03a), OL * 0.3); b.position.x = sd * 0.15; g.add(b); const ln = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), toon(0x9ad8ff, { rim: 1 })); ln.rotation.x = Math.PI / 2; ln.position.set(sd * 0.15, -0.22, 0); g.add(ln); }
        const strap = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 4, 16, Math.PI), toon(0xc8743a)); strap.position.y = 0.2; g.add(strap);
        g.position.set(px + 0.8, 1.15, pz + 1.25); g.rotation.set(0.4, 0, 0.15); g.scale.setScalar(1.3);
      } else if (id === 'ball') { // a red and white bouncy ball against the rock
        const top = inked(new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xff4a4a), OL * 0.3); g.add(top);
        const bot = inked(new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(0xffffff), OL * 0.3); g.add(bot);
        const st = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 6, 20), toon(0xffd84d)); st.rotation.x = Math.PI / 2; g.add(st);
        g.position.set(px + 0.55, 0.28, pz + 0.85); g.rotation.set(0.5, 0, 0.4); g.scale.setScalar(1.3);
      } else if (id === 'can') { // a green watering can with a sunflower, left on a rock
        g.add(inked(new THREE.CylinderGeometry(0.24, 0.27, 0.42, 14), toon(0x4cba6a), OL * 0.35));
        const sp = inked(new THREE.CylinderGeometry(0.04, 0.06, 0.5, 8), toon(0x4cba6a), OL * 0.25); sp.position.set(0.3, 0.12, 0); sp.rotation.z = -0.9; g.add(sp);
        const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.06, 10), toon(0x3a9a5a)); rose.position.set(0.5, 0.27, 0); rose.rotation.z = -0.9; g.add(rose);
        const hd = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 14, Math.PI), toon(0x3a9a5a)); hd.position.y = 0.2; hd.rotation.y = Math.PI / 2; g.add(hd);
        const sf = new THREE.Mesh(new THREE.CircleGeometry(0.1, 10), toon(0xffd84d)); sf.position.z = 0.265; g.add(sf);
        const ce = new THREE.Mesh(new THREE.CircleGeometry(0.045, 8), toon(0x8a5a2a)); ce.position.z = 0.27; g.add(ce);
        g.position.set(px, 1.05, pz + 0.3); g.rotation.y = -0.5; g.scale.setScalar(1.3);
      } else if (id === 'phones') { // pink headphones on a warm rock by the springs
        const bd = inked(new THREE.TorusGeometry(0.3, 0.04, 6, 18, Math.PI), toon(0xff5ad8), OL * 0.25); g.add(bd);
        for (const sd of [-1, 1]) { const c = inked(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 14), toon(0x2a2438), OL * 0.3); c.rotation.z = Math.PI / 2; c.position.set(sd * 0.3, -0.02, 0); g.add(c); const pd = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12), toon(0xff5ad8, { rim: 1 })); pd.position.set(sd * 0.36, -0.02, 0); pd.rotation.y = sd * Math.PI / 2; g.add(pd); }
        g.position.set(px, 1.0, pz + 0.3); g.rotation.set(-1.1, 0.3, 0); g.scale.setScalar(1.3);
      } else if (id === 'blink') { // Flo's firefly friend, resting on the rock and glowing softly
        const body = inked(new THREE.SphereGeometry(0.16, 10, 8), toon(0x3a2a20), OL * 0.3); body.scale.set(1, 0.8, 1.4); g.add(body);
        const tail = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0xe8ff6a })); tail.material.userData.own = true; tail.position.z = -0.22; g.add(tail);
        for (const sd of [-1, 1]) { const wg = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), toon(0xd8f0ff, { side: THREE.DoubleSide })); wg.rotation.set(-Math.PI / 2, 0, sd * 0.5); wg.position.set(sd * 0.15, 0.12, -0.02); g.add(wg); }
        const sm = new THREE.SpriteMaterial({ map: glowTex(), color: 0xe8ff6a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }); sm.userData.own = true;
        const sp = new THREE.Sprite(sm); sp.scale.setScalar(1.4); sp.position.z = -0.22; g.add(sp);
        g.position.set(px, 1.05, pz + 0.1); g.rotation.y = 0.6; g.scale.setScalar(1.3);
      }
      this.group.add(g);
      this.lost.push({ id, x: Q.x, y: Q.y, g });
    }
  }

  // a stadium lobby whose cup you've won: bunting along the back wall, a CHAMPION banner on the front desk, and confetti the first time you walk in
  buildChamp() {
    const M = this.M, cup = M.indoor === 'lobby' && CUPS.find((c) => c.id === M.cup), F = save.adv.flags;
    if (!cup || !F['cup_' + cup.id]) return;
    const col = new THREE.Color(cup.color).getHex(), [, bz] = wpos(0, 0), tri = [];
    for (let x = 1.2 * TILE; x < (this.W - 1.2) * TILE; x += 0.62) {
      const u = (x - 1.2 * TILE) / ((this.W - 2.4) * TILE), y = 3.02 - Math.sin(u * Math.PI * 3) ** 2 * 0.18, g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([x - 0.26, y, bz + 1.08, x + 0.26, y, bz + 1.08, x, y - 0.42, bz + 1.12], 3)); g.computeVertexNormals();
      tri.push([g, [col, 0xffd23f, 0xffffff][tri.length % 3]]);
    }
    for (const [g, c] of tri) this.group.add(new THREE.Mesh(g, toon(c, { side: THREE.DoubleSide })));
    const h = heroDef(), [dx, dz] = wpos(7, 2);
    const tex = canvasTex(512, 96, (c) => {
      c.fillStyle = '#ffd23f'; c.fillRect(0, 0, 512, 96); c.fillStyle = cup.color; c.fillRect(7, 7, 498, 82);
      c.fillStyle = '#ffffff'; c.font = 'bold 42px Lilita One, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(`🏆 CHAMPION: ${h.name.toUpperCase()} 🏆`, 256, 50, 490);
    });
    tex.userData.own = true;
    const mat = new THREE.MeshBasicMaterial({ map: tex }); mat.userData.own = true;
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.08), mat); ban.position.set(dx, 0.58, dz + 0.68); this.group.add(ban);
    if (!F['lb_' + cup.id]) { // the first time back after the win: the lobby cheers
      F['lb_' + cup.id] = true; persist();
      setTimeout(() => {
        if (this.M !== M || !this.hero) return;
        const p = this.hero.root.position;
        for (let i = 0; i < 46; i++) this.g.fx.spawn({ x: p.x + (Math.random() - 0.5) * 6, y: 4 + Math.random() * 1.5, z: p.z - 2 + (Math.random() - 0.5) * 3, vx: (Math.random() - 0.5) * 2, vy: Math.random() * 1.5, vz: (Math.random() - 0.5) * 2, color: [col, 0xffd23f, 0xffffff, 0x5ad8ff][i % 4], size: 0.32, life: 2.2, shape: 'confetti', additive: false, grav: 3, spin: 8, rot: Math.random() * 6 });
        sfx.jingle?.(3); setTimeout(() => this.M === M && this.S.toast(`🎉 The lobby cheers for the ${cup.name} champion!`), 1400);
        for (const a of this.npcs || []) if (a.n.id === 'fan1' || a.n.id === 'fan2') a.n.lines = [`Fan: You're the ${cup.name} champion! Can I have your autograph? On my head? Please?`, 'Fan: I saw the whole thing from the top row. That final move... WOW!'];
      }, 500);
    } else for (const a of this.npcs || []) if (a.n.id === 'fan1' || a.n.id === 'fan2') a.n.lines = [`Fan: The ${cup.name} champion, right here in the lobby! Everyone, look!`, `Fan: ${h.name} beat the whole line-up. I made a poster of YOU now!`];
  }

  // beaches hide one sparkly dig spot a day (a new place each day): A on it or facing it digs up a treasure
  buildDig() {
    this.dig = null;
    const snow = this.M.snow && this.key !== 'peak'; // Frostpeak has one too: an ice gem under the snow
    const lava = this.key === 'ember'; // and Cinder Town: an ember gem in the warm ash
    if ((this.M.arena !== 'beach' && !snow && !lava) || this.M.indoor) return;
    const day = new Date().toISOString().slice(0, 10), r = rng(hash(this.key + day));
    if ((save.adv.dig ||= {})[this.key] === day) return;
    const taken = new Set([...(this.M.npcs || []).map((n) => n.x + ',' + n.y), ...this.doors.map((d) => d.x + ',' + (d.y + 1)), ...this.itemSpots, ...(this.M.signs || []).map((g) => g.x + ',' + g.y), this.hx + ',' + this.hy]);
    const ok = [];
    const seen = new Set([this.hx + ',' + this.hy]), q = [[this.hx, this.hy]]; // only sand you can walk to, and not tucked behind a building or the trees
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of Object.values(DIRS)) { const nx = q[i][0] + dx, ny = q[i][1] + dy, k = nx + ',' + ny; if (!seen.has(k) && this.walkable(nx, ny)) { seen.add(k); q.push([nx, ny]); } }
    for (const [x, y] of q) if (this.tile(x, y) === (snow || lava ? '.' : 's') && x > 1 && y > 1 && x < this.W - 2 && y < this.H - 1 && !taken.has(x + ',' + y) && !'hTP'.includes(this.tile(x, y + 1)) && !'hTP'.includes(this.tile(x, y + 2))) ok.push([x, y]);
    ok.sort((a, b) => a[1] - b[1] || a[0] - b[0]); // the same spot all day, wherever you walked in from
    if (!ok.length) return;
    const [x, y] = ok[Math.floor(r() * ok.length)], [px, pz] = wpos(x, y);
    const g = new THREE.Group(); g.position.set(px, 0, pz); // a little heap of turned sand with a pirate's X beside it
    const heap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon(snow ? 0xf4f8ff : lava ? 0x5a4a50 : 0xd8b068)); heap.scale.set(1, 0.38, 0.8); heap.position.set(-0.35, 0, -0.35); heap.receiveShadow = true; g.add(heap);
    for (const a of [0.78, -0.78]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.17), lava ? new THREE.MeshBasicMaterial({ color: 0xff8a2a }) : toon(snow ? 0x4a8ad8 : 0xa8743a)); if (lava) b.material.userData.own = true; b.rotation.y = a; b.position.set(0.25, 0.02, 0.2); g.add(b); }
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(snow || lava ? 0.16 : 0.12), toon(snow ? 0xa8eaff : lava ? 0xff6a3a : 0xfff4a0, { rim: 1, emissive: snow ? 0x2a6a90 : lava ? 0x902a10 : 0x806a20 })); gem.position.set(-0.3, 0.22, -0.2); g.add(gem);
    this.group.add(g);
    if (lava) { const sm = new THREE.SpriteMaterial({ map: glowTex(), color: 0xff6a2a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }); sm.userData.own = true; const sp = new THREE.Sprite(sm); sp.scale.setScalar(1.3); sp.position.set(0.2, 0.15, 0.2); g.add(sp); }
    this.dig = { x, y, g, px, pz, snow, lava };
  }
  digUp() {
    const D = this.dig; this.dig = null;
    (save.adv.dig ||= {})[this.key] = new Date().toISOString().slice(0, 10); countUp('dig');
    this.group.remove(D.g); D.g.traverse((o) => o.geometry?.dispose());
    for (let k = 0; k < 14; k++) this.g.fx.spawn({ x: D.px + (Math.random() - 0.5) * 0.8, y: 0.3, z: D.pz + (Math.random() - 0.5) * 0.8, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 2.5, vz: (Math.random() - 0.5) * 3, color: D.snow ? 0xffffff : D.lava ? 0x6a5a5a : 0xe8c87a, alpha: 0.8, size: 0.3, life: 0.8, shape: 'puff', additive: false, grav: 8 });
    sfx.foot?.(D.snow ? 'snow' : D.lava ? 'stone' : 'sand'); sfx.pickup?.();
    const roll = Math.random(), hero = save.adv.hero;
    if (D.snow) { // under the snow: a sleepy Pengsicle, or an ice gem (gems are counted; every third one comes with a Power Snack)
      if (roll < 0.15) { persist(); return this.say(['{hero} digs into the snow... and it digs back! A wild Pengsicle was napping in there!'], () => this.startWild('pengsicle', Math.max(3, (save.critters[hero]?.level || 4) - 1), null, Math.random() < SHINY_RATE)); }
      const n = (save.adv.gems = (save.adv.gems || 0) + 1), b = 2 + (n % 3 === 0 ? 0 : 1); save.berries = (save.berries || 0) + b;
      const lines = [`{hero} digs up an ICE GEM! It glitters like frozen starlight. 💎 (${n} found) The Lodge Keeper swaps it for ${b} berries. +${b} 🍓`];
      if (n % 3 === 0) { const rr = grantXp(hero, Math.round(xpNeeded(save.critters[hero].level) * 0.4)); lines.push('Three gems! The Lodge Keeper throws in a Power Snack too! ⭐', ...(rr.to > rr.from ? [`{hero} grew to Lv ${rr.to}!`] : [])); }
      persist(); sfx.jingle?.(3);
      for (let k = 0; k < 10; k++) this.g.fx.spawn({ x: D.px, y: 0.5, z: D.pz, vx: (Math.random() - 0.5) * 2, vy: 1.5 + Math.random() * 2, vz: (Math.random() - 0.5) * 2, color: 0xa8eaff, size: 0.4, life: 0.9, shape: 'star', grav: 4 });
      return this.say([...lines, 'Another glint will show in the snow tomorrow.']);
    }
    if (D.lava) { // in the warm ash: a grumpy Kindlekit, or an ember gem (Smith Ash buys them; every third one comes with a Power Snack)
      if (roll < 0.15) { persist(); return this.say(['{hero} digs into the warm ash... and a tail flicks out! A wild Kindlekit was keeping cosy in there!'], () => this.startWild('kindlekit', Math.max(3, (save.critters[hero]?.level || 4) - 1), null, Math.random() < SHINY_RATE)); }
      const n = (save.adv.emberGems = (save.adv.emberGems || 0) + 1), b = 2 + (n % 3 === 0 ? 0 : 1); save.berries = (save.berries || 0) + b;
      const lines = [`{hero} digs up an EMBER GEM! It's warm, and it glows like a coal. 🔥 (${n} found) Smith Ash swaps it for ${b} berries. +${b} 🍓`];
      if (n % 3 === 0) { const rr = grantXp(hero, Math.round(xpNeeded(save.critters[hero].level) * 0.4)); lines.push('Three ember gems! Smith Ash throws in a Power Snack too! ⭐', ...(rr.to > rr.from ? [`{hero} grew to Lv ${rr.to}!`] : [])); }
      persist(); sfx.jingle?.(3);
      for (let k = 0; k < 10; k++) this.g.fx.spawn({ x: D.px, y: 0.5, z: D.pz, vx: (Math.random() - 0.5) * 2, vy: 1.5 + Math.random() * 2, vz: (Math.random() - 0.5) * 2, color: 0xff8a3a, size: 0.4, life: 0.9, shape: 'spark', grav: 4 });
      return this.say([...lines, 'Another warm glow will show in the ash tomorrow.']);
    }
    if (roll < 0.15) { // a Diggles was already down there
      const lv = Math.max(3, (save.critters[hero]?.level || 4) - 1);
      persist();
      return this.say(['{hero} digs and digs... and finds a nose! A wild Diggles pops up, cross about its ceiling!'], () => this.startWild('diggles', lv, null, Math.random() < SHINY_RATE));
    }
    if (roll < 0.3) {
      const c = save.critters[hero], rr = grantXp(hero, Math.round(xpNeeded(c.level) * 0.4)); persist(); sfx.jingle?.(2);
      return this.say(['{hero} digs up a sealed picnic tin. Inside: a Power Snack! ⭐', ...(rr.to > rr.from ? [`{hero} grew to Lv ${rr.to}!`] : [])]);
    }
    const n = roll < 0.55 ? 3 : 1 + Math.floor(Math.random() * 2);
    save.berries = (save.berries || 0) + n; persist(); sfx.jingle?.(n > 2 ? 3 : 1);
    this.say([n > 2 ? `{hero} digs up a little treasure chest! It's full of berries! +${n} 🍓` : `{hero} digs in the sparkly sand and finds ${n === 1 ? 'a berry' : 'two berries'}, wrapped in seaweed. +${n} 🍓`, 'Another sparkle will turn up somewhere on the beach tomorrow.']);
  }

  buildBush(x, y) {
    this.bush = null;
    if (this.M.indoor || this.key === 'peak') return;
    const reach = (sx, sy) => {
      const seen = new Set([sx + ',' + sy]), q = [[sx, sy]];
      for (let i = 0; i < q.length; i++) for (const [dx, dy] of Object.values(DIRS)) {
        const nx = q[i][0] + dx, ny = q[i][1] + dy, k = nx + ',' + ny;
        if (!seen.has(k) && this.walkable(nx, ny) && this.tile(nx, ny) !== 'i') { seen.add(k); q.push([nx, ny]); }
      }
      return q;
    };
    const all = reach(x, y), N4 = Object.values(DIRS);
    const taken = new Set([...(this.M.npcs || []).map((n) => n.x + ',' + n.y), ...this.doors.map((d) => d.x + ',' + (d.y + 1)), ...this.itemSpots]);
    const near = (tx, ty, ch, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (this.tile(tx + dx, ty + dy) === ch) return true; return false; };
    const ok = all.filter(([tx, ty]) => '."'.includes(this.tile(tx, ty)) && tx > 0 && ty > 0 && tx < this.W - 1 && ty < this.H - 1 && !taken.has(tx + ',' + ty)
      && N4.some(([dx, dy]) => 'TP'.includes(this.tile(tx + dx, ty + dy))) && !'TPh#'.includes(this.tile(tx, ty + 1)) && near(tx, ty, ':', 2) && !(this.M.signs || []).some((s) => Math.abs(s.x - tx) + Math.abs(s.y - ty) < 2))
      .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const rand = rng(hash(this.key + ':bush'));
    while (ok.length) {
      const [tx, ty] = ok.splice(Math.floor(rand() * ok.length), 1)[0], k = tx + ',' + ty;
      this.solid.add(k);
      const nb = N4.map(([dx, dy]) => [tx + dx, ty + dy]).find(([a, b]) => this.walkable(a, b));
      if (nb && reach(...nb).length === all.length - 1) { if (k !== x + ',' + y) this.makeBush(tx, ty); else this.solid.delete(k); return; }
      this.solid.delete(k);
    }
  }

  makeBush(tx, ty) {
    const g = new THREE.Group(), [px, pz] = wpos(tx, ty), leaf = this.M.snow ? 0x5aa88a : 0x6ad050;
    for (const [bx, by, bz, r] of [[0, 0.55, 0, 0.62], [-0.4, 0.38, 0.18, 0.45], [0.4, 0.36, 0.16, 0.45], [0.05, 0.34, 0.38, 0.42]]) {
      const m = inked(new THREE.SphereGeometry(r, 14, 10), toon(leaf), OL * 0.6); m.position.set(bx, by, bz); g.add(m);
    }
    const bg = [];
    const br = rng(hash(this.key + ':berries'));
    for (let k = 0; k < 15; k++) {
      const a = br() * Math.PI * 2, e = 0.15 + br() * 0.9, r = 0.68;
      const s = new THREE.SphereGeometry(0.13, 8, 6); s.translate(Math.cos(a) * Math.cos(e) * r * 0.85, 0.55 + Math.sin(e) * r * 0.8, Math.sin(a) * Math.cos(e) * r * 0.85 + 0.12); bg.push(s);
    }
    const berries = new THREE.Mesh(mergeGeometries(bg), toon(this.M.snow ? 0x7a5aff : 0xff3a5a, { rim: 0.9 })); bg.forEach((s) => s.dispose());
    g.add(berries);
    g.position.set(px, 0, pz); this.group.add(g);
    this.bush = { x: tx, y: ty, g, berries, shake: 0 };
    berries.visible = save.adv.bush?.[this.key] !== new Date().toISOString().slice(0, 10);
  }

  shakeBush() {
    const B = this.bush, day = new Date().toISOString().slice(0, 10);
    B.shake = 0.7; sfx.foot?.('grass');
    if (!B.berries.visible) return this.say(['The berry bush rustles. No ripe berries left... They grow back by tomorrow!']);
    B.berries.visible = false;
    (save.adv.bush ||= {})[this.key] = day;
    const n = 1 + Math.floor(Math.random() * 2) + (Math.random() < 0.15 ? 1 : 0);
    save.berries = (save.berries || 0) + n; countUp('bush'); persist();
    const [px, pz] = wpos(B.x, B.y), col = this.M.snow ? 0x7a5aff : 0xff3a5a;
    for (let k = 0; k < 10; k++) this.g.fx.spawn({ x: px + (Math.random() - 0.5) * 1.2, y: 1 + Math.random() * 0.5, z: pz + 0.3, vx: (Math.random() - 0.5) * 2.5, vy: 1.5 + Math.random() * 2, vz: 0.5 + Math.random(), color: col, size: 0.24, life: 0.9, shape: 'glow', additive: false, grav: 7 });
    sfx.pickup?.();
    const W = this.M.wild?.list;
    if (W && Math.random() < 0.15) { // something was napping in there
      const [id, lo, hi] = W[Math.floor(Math.random() * W.length)];
      return this.say([`{hero} shook the berry bush! ${n} berr${n > 1 ? 'ies' : 'y'} fell out! 🍓`, 'Huh? Something grumpy tumbles out of the leaves!'], () => this.startWild(id, lo + Math.floor(Math.random() * (hi - lo + 1))));
    }
    this.say([`{hero} shook the berry bush! ${n} berr${n > 1 ? 'ies' : 'y'} fell out! 🍓`]);
  }

  // fishing with Fisher Finn's old rod: face water, press A, wait for the bobber to dip, then press A again
  cast() {
    this.busy = true;
    const g = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 2.6, 6), toon(0x8a5a3a)); rod.rotation.x = 1.05; rod.position.set(0, 0.7, 1.2); g.add(rod);
    const lm = new THREE.MeshBasicMaterial({ color: 0xffffff }); lm.userData.own = true;
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.5, 4), lm); line.position.set(0, 0.8, 2.3); g.add(line);
    const bob = inked(new THREE.SphereGeometry(0.13, 10, 8), toon(0xff4a4a), OL * 0.4); bob.position.set(0, 0.08, 2.3); g.add(bob);
    this.hero.root.add(g);
    this.fishing = { t: 0, bite: 1.4 + Math.random() * 2.6, phase: 'wait', rod: g, bob };
    sfx.ui?.('ok');
  }

  updateFish(dt, act) {
    const F = this.fishing; F.t += dt;
    F.bob.position.y = F.phase === 'bite' ? -0.06 + Math.sin(F.t * 30) * 0.05 : 0.08 + Math.sin(F.t * 2.2) * 0.03;
    if (F.phase === 'wait') {
      if (act) return this.reel('early');
      if (F.t >= F.bite) {
        F.phase = 'bite'; F.t = 0; sfx.warn?.(); this.bubble({ root: this.hero.root }, '❗');
        const p = new THREE.Vector3(); F.bob.getWorldPosition(p);
        for (let k = 0; k < 8; k++) this.g.fx.spawn({ x: p.x, y: 0.1, z: p.z, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 1.5, vz: (Math.random() - 0.5) * 2, color: 0xe8f6ff, size: 0.18, life: 0.5, shape: 'glow', additive: false, grav: 8 });
      }
    } else if (act) this.reel('catch');
    else if (F.t > 0.85) this.reel('miss');
  }

  reel(how) {
    const F = this.fishing; this.fishing = null;
    this.hero.root.remove(F.rod);
    F.rod.traverse((o) => o.geometry?.dispose());
    this.busy = false;
    if (how === 'early') return this.say(['Too soon! The ripples fade away... Wait for the bobber to dip, then press A!']);
    if (how === 'miss') return this.say(['The bobber popped back up. Whatever it was got away!']);
    countUp('fish'); persist();
    const r = Math.random(), W = (this.M.wild?.list || []).filter(([i]) => byId(i)?.type === 'water');
    if (r < 0.45) {
      const lv = Math.max(2, (save.critters[save.adv.hero]?.level || 3) - 1);
      const [id, lo, hi] = W.length ? W[Math.floor(Math.random() * W.length)] : [['bubbalotl', 'ripples', 'lilypop', 'pengsicle'][Math.floor(Math.random() * 4)], lv, lv];
      const name = byId(id)?.name || 'critter';
      return this.say([`{hero} reels it in... It's a wild ${name}! And it's not happy about it!`], () => this.startWild(id, lo + Math.floor(Math.random() * (hi - lo + 1)), null, Math.random() < SHINY_RATE));
    }
    if (r < 0.7) { // a fish! measured, and Fisher Finn keeps the record book
      const kinds = FISH[this.M.arena === 'beach' ? 'sea' : this.M.lava ? 'lava' : this.M.snow || this.M.border === 'cloud' ? 'cold' : 'pond'];
      const k = Math.random() < 0.12 ? kinds.length - 1 : Math.floor(Math.random() * (kinds.length - 1)), [name, lo, hi] = kinds[k];
      const cm = Math.round(lo + (hi - lo) * Math.pow(Math.random(), 1.6)), L = save.adv.fishLog ||= { n: 0, best: null };
      L.n++; const rec = !L.best || cm > L.best.cm, sp = (L.sp ||= {}); sp[name] = Math.max(sp[name] || 0, cm);
      if (rec) { L.best = { name, cm }; save.berries = (save.berries || 0) + 2; }
      persist(); sfx.jingle?.(rec ? 3 : 1);
      return this.say([`{hero} reeled in a ${name}! It's ${cm} cm long! 🐟`, ...(rec ? [`That's {hero}'s biggest catch ever! Fisher Finn would be proud. +2 🍓`] : [`{hero}'s record is still the ${L.best.name} (${L.best.cm} cm). Splash! Back it goes.`])]);
    }
    if (r < 0.88) {
      const n = 1 + (Math.random() < 0.4 ? 1 : 0);
      save.berries = (save.berries || 0) + n; persist(); sfx.jingle?.(2);
      return this.say([`{hero} fished up a little net of berries! +${n} 🍓`]);
    }
    this.say([['{hero} fished up... an old boot. Squelch.', '{hero} fished up a soggy sock. Whose is this?!', '{hero} fished up a tin can. Into the bin it goes!'][Math.floor(Math.random() * 3)]]);
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
      let t = this.tile(x, y); const [px, pz] = wpos(x, y);
      if (t === 'W') {
        const back = y === 0, front = y === H - 1, h = back ? 3.2 : front ? 0.5 : 1.4;
        box(back ? 'wall' : 'wall2', TILE, h, TILE, px, h / 2, pz);
        box('trim', TILE + 0.02, 0.16, TILE + 0.02, px, h, pz);
        if (back) box('base', TILE + 0.01, 0.35, 0.12, px, 0.17, pz + 1.02);
        if (back && this.M.indoor === 'arcade') { box('neon', TILE + 0.01, 0.12, 0.08, px, 2.7, pz + 1.04); box('neon2', TILE + 0.01, 0.08, 0.08, px, 0.5, pz + 1.08); }
        if (back && this.M.indoor === 'lobby' && x >= 5 && x <= 9) this.poster(x - 5 - Math.floor((5 - (CUPS.find((c) => c.id === this.M.cup)?.matches.length || 5)) / 2), px, pz);
        if (back && this.M.indoor !== 'lobby' && x % 3 !== 2 && (x % 3 === 0 || x % 4 === 1) && x > 1 && x < W - 2 && '.QOD'.includes(this.tile(x, 1)) && x % 3 !== 2 && this.M.indoor !== 'arcade' && this.M.indoor !== 'cabin') { // a little framed landscape between the windows
          box('frame', 1.4, 1.05, 0.08, px, 2.05, pz + 1.02); box('art' + (x % 2), 1.18, 0.83, 0.06, px, 2.05, pz + 1.06); box('hill', 1.18, 0.28, 0.07, px, 1.77, pz + 1.07); box('sunny', 0.22, 0.22, 0.07, px + 0.32, 2.25, pz + 1.075);
        }
        if (back && this.M.indoor === 'center' && x === (W >> 1)) { box('trim', 1.3, 1.3, 0.08, px, 2.45, pz + 1.02); box('top', 0.36, 1.0, 0.08, px, 2.45, pz + 1.06); box('top', 1.0, 0.36, 0.08, px, 2.45, pz + 1.06); } // the Berry Center cross behind the nurse
        if (back && this.M.indoor === 'cabin' && x > 0 && x < W - 1) { // a ship's cabin: round brass portholes, and the old ship's wheel on the wall
          if (x % 3 === 2 && this.tile(x, 1) !== 'C') { const pg = new THREE.CircleGeometry(0.42, 18); pg.translate(px, 1.95, pz + 1.04); add('glass', pg); const rg = new THREE.TorusGeometry(0.45, 0.08, 6, 18); rg.translate(px, 1.95, pz + 1.05); add('gold', rg); }
          if (x === 6) { const wh = new THREE.TorusGeometry(0.5, 0.06, 6, 20); wh.translate(px, 2.0, pz + 1.08); add('wood', wh); for (let k = 0; k < 4; k++) { const sp = new THREE.BoxGeometry(1.35, 0.07, 0.07); sp.rotateZ(k * Math.PI / 4); sp.translate(px, 2.0, pz + 1.09); add('wood', sp); } const hb = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 10); hb.rotateX(Math.PI / 2); hb.translate(px, 2.0, pz + 1.1); add('gold', hb); }
        }
        if (back && x % 3 === 2 && x > 0 && x < W - 1 && this.tile(x, 1) !== 'C' && this.M.indoor !== 'lobby' && this.M.indoor !== 'cabin') { box('glass', 1.1, 0.9, 0.08, px, 1.9, pz + 1.02); box('trim', 1.3, 0.12, 0.14, px, 1.4, pz + 1.04); if (this.outPhase === 'night') { box('stars', 0.07, 0.07, 0.1, px - 0.3, 2.15, pz + 1.04); box('stars', 0.05, 0.05, 0.1, px + 0.1, 2.0, pz + 1.04); box('stars', 0.06, 0.06, 0.1, px + 0.32, 2.2, pz + 1.04); box('moon', 0.2, 0.2, 0.1, px + 0.25, 1.75, pz + 1.04); } }
        if (back && this.M.indoor === 'cottage' && x > 0 && x < W - 1 && x % 2 === 0) box('wood', 0.22, 3.1, 0.1, px - 1, 1.55, pz + 1.04); // old timber beams
        if (back && this.M.indoor === 'kidroom' && x > 0 && x < W - 1) { // fairy lights strung along the back wall, dipping between pins
          box('soot', TILE + 0.02, 0.03, 0.04, px, 2.86, pz + 1.05);
          for (let k = 0; k < 2; k++) { const b = new THREE.SphereGeometry(0.14, 8, 6); b.translate(px - 0.5 + k, 2.72 - (k ? 0 : 0.08), pz + 1.1); add(['lit', 'neon', 'neon2'][(x * 2 + k) % 3], b); }
        }
        if (back && this.M.cityView && x % 3 === 2 && x > 0 && x < W - 1 && this.tile(x, 1) !== 'C') for (let k = 0; k < 4; k++) { // Neon City outside the window: a skyline with lit windows
          const bh = 0.25 + ((x * 7 + k * 5) % 6) * 0.08; box('skyline', 0.24, bh, 0.04, px - 0.39 + k * 0.26, 1.45 + bh / 2, pz + 1.07);
          if ((x + k) % 2) box('lit', 0.06, 0.06, 0.03, px - 0.39 + k * 0.26, 1.5 + bh * 0.6, pz + 1.09);
        }
      }
      if (t === 'C' && this.M.indoor === 'center' && x === 1) { // the request board: cork, pinned notes
        box('wood', 1.9, 1.5, 0.2, px, 1.9, pz - 0.85); box('cork', 1.7, 1.3, 0.22, px, 1.9, pz - 0.84);
        for (let k = 0; k < 3; k++) { box('note' + k, 0.42, 0.5, 0.24, px - 0.5 + k * 0.5, 1.95 + (k % 2) * 0.15, pz - 0.82); box('pin', 0.08, 0.08, 0.27, px - 0.5 + k * 0.5, 2.15 + (k % 2) * 0.15, pz - 0.8); }
        continue;
      }
      if (t === 'C' && this.key === 'in:village:home') { // the hero's wardrobe (hats live here)
        box('wood', 1.8, 2.7, 0.95, px, 1.35, pz - 0.4); box('door' + (x % 2), 0.8, 2.3, 0.06, px - 0.42, 1.4, pz + 0.09); box('door' + (x % 2), 0.8, 2.3, 0.06, px + 0.42, 1.4, pz + 0.09);
        box('pin', 0.08, 0.2, 0.1, px - 0.08, 1.4, pz + 0.14); box('pin', 0.08, 0.2, 0.1, px + 0.08, 1.4, pz + 0.14);
        continue;
      }
      if (t === 'C' && this.M.indoor === 'forge') { // a pegboard of hammers and tongs
        box('wood', 1.8, 2.3, 0.2, px, 1.3, pz - 0.75);
        for (let k = 0; k < 3; k++) { box('iron', 0.1, 0.8, 0.08, px - 0.55 + k * 0.55, 1.75, pz - 0.6); box('iron', 0.42, 0.2, 0.14, px - 0.55 + k * 0.55, 2.15, pz - 0.58); }
        for (let k = 0; k < 2; k++) { box('iron', 0.06, 0.9, 0.06, px - 0.35 + k * 0.6, 0.85, pz - 0.6); box('iron', 0.06, 0.9, 0.06, px - 0.25 + k * 0.6, 0.85, pz - 0.6); }
        box('coal', 1.4, 0.4, 0.7, px, 0.2, pz - 0.2);
        continue;
      }
      if (t === 'C') { // shelf with coloured book spines
        box('wood', 1.8, 2.5, 0.9, px, 1.25, pz - 0.4);
        for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) box('book' + ((x + r + k) % 3), 0.32, 0.55, 0.2, px - 0.6 + k * 0.4, 0.55 + r * 0.75, pz + 0.08);
      }
      if (t === 'S') { // the hero's trophy shelf: a mini trophy for each cup won (the crown on top once crowned)
        box('wood', 1.9, 0.12, 0.6, px, 1.3, pz - 0.65); box('wood', 1.9, 0.12, 0.6, px, 2.1, pz - 0.65); box('wood', 0.1, 1.4, 0.6, px - 0.92, 1.65, pz - 0.65); box('wood', 0.1, 1.4, 0.6, px + 0.92, 1.65, pz - 0.65);
        CUP_ORDER.forEach((cid, n) => { const won = save.adv.flags['cup_' + cid], tx = px - 0.66 + (n % 4) * 0.44, ty = n < 4 ? 1.36 : 2.16, col = won ? 'gold' : 'ghost';
          const c1 = new THREE.CylinderGeometry(0.13, 0.05, 0.2, 10); c1.translate(tx, ty + 0.26, pz - 0.6); add(col, c1); const c2 = new THREE.CylinderGeometry(0.03, 0.03, 0.1, 6); c2.translate(tx, ty + 0.11, pz - 0.6); add(col, c2); const c3 = new THREE.BoxGeometry(0.18, 0.06, 0.12); c3.translate(tx, ty + 0.04, pz - 0.6); add(col, c3); });
        if (save.adv.flags.crowned) { const cr = new THREE.CylinderGeometry(0.2, 0.17, 0.2, 8, 1, true); cr.translate(px + 0.66, 2.38, pz - 0.6); add('gold', cr); const gm = new THREE.SphereGeometry(0.06, 8, 6); gm.translate(px + 0.66, 2.4, pz - 0.39); add('gem0', gm); }
        continue;
      }
      if (t === 'X' && this.M.indoor === 'lab' && x > W / 2) { // the growth chamber: a tall glass tube of bubbling green, a little critter shape floating inside
        const base = new THREE.CylinderGeometry(0.75, 0.85, 0.5, 16); base.translate(px, 0.25, pz - 0.3); add('metal', base);
        const top = new THREE.CylinderGeometry(0.8, 0.75, 0.35, 16); top.translate(px, 2.9, pz - 0.3); add('metal', top);
        const tube = new THREE.CylinderGeometry(0.65, 0.65, 2.3, 16); tube.translate(px, 1.6, pz - 0.3); add('pane', tube);
        const fl = new THREE.CylinderGeometry(0.58, 0.58, 1.9, 16); fl.translate(px, 1.45, pz - 0.3); add('goo', fl);
        const bod = new THREE.SphereGeometry(0.3, 12, 10); bod.scale(1, 0.9, 1); bod.translate(px, 1.6, pz - 0.3); add('ghostc', bod);
        for (const sd of [-1, 1]) { const e = new THREE.SphereGeometry(0.11, 8, 6); e.translate(px + sd * 0.2, 1.9, pz - 0.3); add('ghostc', e); }
        box('btn', 0.5, 0.15, 0.1, px, 0.35, pz + 0.38);
        (this.jars ||= []).push([px, 0.7, pz - 0.3, 0xd8ffe0, 'ring']); (this.lampPools ||= []).push([px, pz, 0x5aff9a]);
        continue;
      }
      if (t === 'X' && this.M.indoor === 'home') { // a TV on a low cabinet, playing battle highlights
        box('wood', 1.7, 0.7, 0.8, px, 0.35, pz - 0.4); box('soot', 1.6, 1.0, 0.12, px, 1.3, pz - 0.55); box('screen', 1.42, 0.82, 0.04, px, 1.3, pz - 0.48);
        box('fire', 0.22, 0.22, 0.03, px - 0.3, 1.22, pz - 0.45); box('btn', 0.2, 0.26, 0.03, px + 0.32, 1.25, pz - 0.45); box('pillow', 0.06, 0.25, 0.03, px, 1.48, pz - 0.45);
        continue;
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
      const town = this.M.indoor === 'center' && this.M.exit?.map;
      if (t === 'o' && town === 'seashell') { // a round-cornered fish tank on a stand, bubbling
        box('wood', 1.5, 0.6, 1.0, px, 0.3, pz - 0.2); box('pane', 1.45, 1.1, 0.95, px, 1.17, pz - 0.2); box('aqua', 1.35, 0.9, 0.85, px, 1.1, pz - 0.2); box('sandy', 1.35, 0.12, 0.85, px, 0.67, pz - 0.2);
        for (let k = 0; k < 2; k++) { const f = new THREE.ConeGeometry(0.1, 0.3, 6); f.rotateZ(k ? Math.PI / 2 : -Math.PI / 2); f.translate(px - 0.3 + k * 0.55, 1.05 + k * 0.25, pz + 0.27); add(k ? 'fire' : 'sunny', f); }
        for (let k = 0; k < 3; k++) { const w2 = new THREE.CylinderGeometry(0.03, 0.05, 0.5 + k * 0.15, 5); w2.translate(px + 0.35 - k * 0.15, 0.95 + k * 0.07, pz - 0.4); add('weed', w2); }
        (this.jars ||= []).push([px, 1.0, pz - 0.2, 0xd8f4ff, 'ring']); (this.lampPools ||= []).push([px, pz, 0x3ab8ff]);
        continue;
      }
      if (t === 'o' && town === 'ember') { // a lava lamp, blobs glowing in the glass
        const b0 = new THREE.CylinderGeometry(0.22, 0.4, 0.5, 12); b0.translate(px, 0.25, pz); add('gold', b0);
        const gl = new THREE.CylinderGeometry(0.2, 0.34, 1.2, 12); gl.translate(px, 1.1, pz); add('pane', gl);
        const lq = new THREE.CylinderGeometry(0.17, 0.3, 1.1, 12); lq.translate(px, 1.1, pz); add('lava', lq);
        for (const [dy, r] of [[0.75, 0.16], [1.15, 0.12], [1.45, 0.09]]) { const bl = new THREE.SphereGeometry(r, 10, 8); bl.translate(px, dy, pz); add('fire', bl); }
        const c0 = new THREE.CylinderGeometry(0.12, 0.2, 0.25, 12); c0.translate(px, 1.82, pz); add('gold', c0);
        (this.lampPools ||= []).push([px, pz, 0xff6a2a]);
        continue;
      }
      if (t === 'o' && town === 'neon') { // a neon cactus in a pot
        const p = new THREE.CylinderGeometry(0.4, 0.3, 0.6, 10); p.translate(px, 0.3, pz); add('pot', p);
        const tr = new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8); tr.translate(px, 1.3, pz); add('neon2', tr);
        for (const sd of [-1, 1]) { const ar = new THREE.CylinderGeometry(0.09, 0.09, 0.5, 8); ar.translate(px + sd * 0.32, 1.35 + (sd > 0 ? 0.2 : 0), pz); add('neon2', ar); const el = new THREE.CylinderGeometry(0.09, 0.09, 0.3, 8); el.rotateZ(Math.PI / 2); el.translate(px + sd * 0.2, 1.12 + (sd > 0 ? 0.2 : 0), pz); add('neon2', el); }
        (this.lampPools ||= []).push([px, pz, 0x3af0ff]);
        continue;
      }
      if (t === 'o' && town === 'frostpeak') { // a little potted pine with snow on it
        const p = new THREE.CylinderGeometry(0.4, 0.3, 0.6, 10); p.translate(px, 0.3, pz); add('pot', p);
        for (let k = 0; k < 3; k++) { const c = new THREE.ConeGeometry(0.55 - k * 0.13, 0.6, 8); c.translate(px, 0.9 + k * 0.4, pz); add('pine', c); const sn = new THREE.ConeGeometry(0.4 - k * 0.1, 0.25, 8); sn.translate(px, 1.15 + k * 0.4, pz); add('pillow', sn); }
        continue;
      }
      if (t === 'o' && town === 'cloudtop') { // a cloud tree: fluffy white puffs on a thin stem
        const p = new THREE.CylinderGeometry(0.4, 0.3, 0.6, 10); p.translate(px, 0.3, pz); add('pot', p);
        const st = new THREE.CylinderGeometry(0.05, 0.07, 0.9, 6); st.translate(px, 1.0, pz); add('wood', st);
        for (let k = 0; k < 4; k++) { const c = new THREE.IcosahedronGeometry(0.34 - (k % 2) * 0.06, 1); c.translate(px + Math.cos(k * 1.6) * 0.25, 1.55 + (k % 2) * 0.2, pz + Math.sin(k * 1.6) * 0.2); add('pillow', c); }
        continue;
      }
      if (t === 'o' && town !== 'glowcap') { // a pot of pink blossoms
        const p = new THREE.CylinderGeometry(0.4, 0.3, 0.6, 10); p.translate(px, 0.3, pz); add('pot', p);
        const l = new THREE.IcosahedronGeometry(0.45, 1); l.translate(px, 0.85, pz); add('leaf', l);
        for (let k = 0; k < 5; k++) { const f = new THREE.SphereGeometry(0.13, 8, 6); f.translate(px + Math.cos(k * 1.26) * 0.3, 1.1 + (k % 2) * 0.12, pz + Math.sin(k * 1.26) * 0.3); add(k % 2 ? 'top' : 'sunny', f); }
        continue;
      }
      if (t === 'o') t = 'O';
      if (t === 'O' && this.M.shroom) { // a glowcap lamp: a tall stem under a softly glowing spotted cap (it breathes out spores)
        const k = (this.lampPools?.length || 0) % 2, st = new THREE.CylinderGeometry(0.14, 0.22, 1.5, 8); st.translate(px, 0.75, pz); add('head', st);
        const cp = new THREE.SphereGeometry(0.62, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2); cp.scale(1, 0.6, 1); cp.translate(px, 1.45, pz); add('cap' + k, cp);
        this.shrooms.push([px, 1.7, pz, k ? 0xff7ab8 : 0x5affd8]); (this.lampPools ||= []).push([px, pz, k ? 0xff5aa8 : 0x3affd0]);
        continue;
      }
      if (t === 'O') {
        const p = new THREE.CylinderGeometry(0.4, 0.3, 0.6, 10); p.translate(px, 0.3, pz); add('pot', p);
        for (let k = 0; k < 3; k++) { const l = new THREE.IcosahedronGeometry(0.45 - k * 0.08, 1); l.translate(px + Math.sin(k * 2.1) * 0.2, 0.9 + k * 0.38, pz + Math.cos(k * 2.1) * 0.2); add('leaf', l); }
      }
      if (t === 'U') { // a trophy case: the cup's trophy shines inside once it's won
        const n = [...this.M.tiles[y]].slice(0, x).filter((c) => c === 'U').length, cid = CUP_ORDER[n], won = save.adv.flags['cup_' + cid];
        box('wood', 1.7, 0.7, 1.2, px, 0.35, pz - 0.3); box('trim', 1.75, 0.1, 1.25, px, 0.72, pz - 0.3);
        box('pane', 1.6, 1.25, 1.1, px, 1.4, pz - 0.3);
        const col = won ? 'gold' : 'dim';
        const c1 = new THREE.CylinderGeometry(0.42, 0.16, 0.58, 14); c1.translate(px, 1.45, pz - 0.3); add(col, c1);
        const c2 = new THREE.CylinderGeometry(0.08, 0.08, 0.28, 8); c2.translate(px, 1.02, pz - 0.3); add(col, c2);
        const c3 = new THREE.CylinderGeometry(0.28, 0.3, 0.14, 12); c3.translate(px, 0.84, pz - 0.3); add(col, c3);
        for (const sd of [-1, 1]) { const h = new THREE.TorusGeometry(0.16, 0.04, 6, 12); h.translate(px + sd * 0.44, 1.5, pz - 0.3); add(col, h); }
        if (won) { const gem = new THREE.SphereGeometry(0.12, 8, 6); gem.translate(px, 1.45, pz + 0.08); add('gem' + n % 3, gem); }
      }
      if (t === 'H') { // a hat stand wearing one of the shop's hats
        const p = new THREE.CylinderGeometry(0.07, 0.07, 1.3, 8); p.translate(px, 0.65, pz - 0.2); add('wood', p);
        const f = new THREE.CylinderGeometry(0.4, 0.45, 0.1, 12); f.translate(px, 0.05, pz - 0.2); add('wood', f);
        const k = new THREE.SphereGeometry(0.4, 12, 8); k.translate(px, 1.5, pz - 0.2); add('head', k);
        const sold = SHOP_HATS.filter((s) => !s.trader && !s.gift), h = sold[(x * 3 + y) % sold.length], sk = new THREE.Group(); sk.position.set(px, 1.42, pz - 0.2); this.group.add(sk);
        hatModel({ def: { body: { headR: 0.62 } }, skull: sk }, h.kind, h.col, h.band);
      }
      if (t === 'K') { box('counter', TILE + 0.02, 1.1, 1.3, px, 0.55, pz); box('top', TILE + 0.04, 0.12, 1.45, px, 1.15, pz); }
      if (t === 'F' && this.tile(x - 1, y) !== 'F' && this.M.indoor === 'lodge') { // a stone fireplace with a log fire and a wooden mantel
        const cx = px + TILE / 2;
        box('stone', TILE * 2 - 0.3, 1.8, 1.0, cx, 0.9, pz - 0.45); box('stone', 1.6, 1.4, 0.7, cx, 2.5, pz - 0.6); box('wood', TILE * 2 + 0.1, 0.18, 1.15, cx, 1.85, pz - 0.38);
        box('soot', 1.5, 1.05, 0.05, cx, 0.62, pz + 0.07); box('fire', 1.1, 0.55, 0.05, cx, 0.42, pz + 0.09);
        for (const dx of [-0.35, 0.05, 0.4]) box('wood', 0.75, 0.14, 0.14, cx + dx * 0.4, 0.13, pz + 0.12 - Math.abs(dx) * 0.2);
        box('mug', 0.16, 0.2, 0.16, cx - 0.9, 2.05, pz - 0.2); box('gold', 0.3, 0.42, 0.12, cx + 0.8, 2.15, pz - 0.25);
        (this.forgeFire ||= []).push([cx, 0.5, pz + 0.2, 0.5]);
      }
      else if (t === 'F' && this.tile(x - 1, y) !== 'F') { // the forge furnace: a brick oven two tiles wide with a roaring mouth
        const cx = px + TILE / 2;
        box('brick', TILE * 2 - 0.2, 2.2, 1.6, cx, 1.1, pz - 0.1); box('brick2', TILE * 2, 0.2, 1.75, cx, 2.3, pz - 0.1); box('brick', 1.1, 1.2, 1.1, cx, 3.0, pz - 0.3);
        box('fire', 1.5, 0.9, 0.05, cx, 0.75, pz + 0.71); box('coal', 1.7, 0.18, 0.3, cx, 0.3, pz + 0.62);
        for (let k = 0; k < 5; k++) box('brick2', 0.3, 0.12, 0.06, cx - 1.6 + k * 0.8 + (k % 2) * 0.2, 1.5 + (k % 3) * 0.32, pz + 0.72);
        (this.forgeFire ||= []).push([cx, 0.8, pz + 0.8]);
      }
      if (t === 'G') { // a grandfather clock: a tall case, a round face, and a pendulum that swings slowly
        box('wood', 1.2, 3.1, 0.8, px, 1.55, pz - 0.5); box('trim', 1.3, 0.14, 0.9, px, 3.12, pz - 0.5); box('stool', 1.0, 0.2, 0.85, px, 0.1, pz - 0.5);
        const fc = new THREE.CylinderGeometry(0.42, 0.42, 0.06, 18); fc.rotateX(Math.PI / 2); fc.translate(px, 2.55, pz - 0.08); add('plate', fc);
        const rim = new THREE.TorusGeometry(0.43, 0.05, 6, 18); rim.translate(px, 2.55, pz - 0.06); add('gold', rim);
        box('soot', 0.05, 0.3, 0.04, px, 2.66, pz - 0.03); box('soot', 0.22, 0.05, 0.04, px + 0.1, 2.55, pz - 0.03);
        box('soot', 0.7, 1.4, 0.04, px, 1.25, pz - 0.09); box('gold', 0.78, 0.06, 0.06, px, 1.97, pz - 0.08); box('gold', 0.78, 0.06, 0.06, px, 0.53, pz - 0.08);
        const pend = new THREE.Group(); pend.position.set(px, 1.9, pz - 0.05);
        const rod = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.03), toon(0xffc93a, { rim: 0.3 })); rod.position.y = -0.5; pend.add(rod);
        const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 14), toon(0xffc93a, { rim: 0.5 })); bob.rotation.x = Math.PI / 2; bob.position.y = -1.05; pend.add(bob);
        this.group.add(pend); this.pendulum = pend;
      }
      if (t === 'r') { // a rocking chair with a knitted blanket over the back
        const RK = (this.rocker = { L: {}, px, pz }).L, add = (k, g) => (RK[k] ||= []).push(g), box = (k, w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); add(k, g); }; // its own group, so it can rock
        for (const sd of [-1, 1]) { const rk = new THREE.TorusGeometry(1.1, 0.06, 5, 14, 1.2); rk.rotateZ(-Math.PI / 2 - 0.6); rk.rotateY(Math.PI / 2); rk.translate(px + sd * 0.45, 1.15, pz); add('wood', rk); }
        box('wood', 1.05, 0.12, 1.0, px, 0.62, pz); for (const sd of [-1, 1]) { box('wood', 0.1, 1.5, 0.1, px + sd * 0.45, 1.3, pz - 0.45); box('wood', 0.1, 0.55, 0.1, px + sd * 0.45, 0.9, pz + 0.4); box('wood', 0.1, 0.08, 0.95, px + sd * 0.45, 1.15, pz); }
        for (let k = 0; k < 3; k++) box('wood', 0.08, 1.2, 0.06, px - 0.25 + k * 0.25, 1.35, pz - 0.47);
        box('wood', 1.0, 0.12, 0.1, px, 2.0, pz - 0.47);
        box('knit', 0.9, 0.9, 0.1, px, 1.55, pz - 0.38); box('knit2', 0.9, 0.12, 0.12, px, 1.75, pz - 0.36); box('knit2', 0.9, 0.12, 0.12, px, 1.4, pz - 0.36); box('knit', 0.7, 0.08, 0.7, px, 0.72, pz + 0.05);
            }
      if (t === 'k') { // a basket of yarn, with one ball rolled away
        const bk = new THREE.CylinderGeometry(0.5, 0.4, 0.5, 12, 1, true); bk.translate(px, 0.25, pz); add('stool', bk);
        const bt = new THREE.CircleGeometry(0.4, 12); bt.rotateX(-Math.PI / 2); bt.translate(px, 0.05, pz); add('stool', bt);
        for (let k = 0; k < 3; k++) { const yb = new THREE.SphereGeometry(0.22, 10, 8); yb.translate(px + Math.cos(k * 2.1) * 0.2, 0.52, pz + Math.sin(k * 2.1) * 0.2); add(['berry', 'book1', 'knit2'][k], yb); }
        const nd = new THREE.CylinderGeometry(0.025, 0.025, 0.9, 5); nd.rotateZ(0.5); nd.translate(px + 0.1, 0.8, pz); add('iron', nd);
        const lone = new THREE.SphereGeometry(0.18, 10, 8); lone.translate(px + 0.6, 0.18, pz - 1.2); add('book2', lone);
      }
      if (t === 'j') { // a jar of fireflies on a stool: they blink inside the glass and light the floor
        box('stool', 0.9, 0.12, 0.9, px, 0.85, pz - 0.2); for (const [lx, lz] of [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]]) box('wood', 0.09, 0.82, 0.09, px + lx, 0.41, pz - 0.2 + lz);
        const jar = new THREE.CylinderGeometry(0.48, 0.5, 1.05, 14); jar.translate(px, 1.45, pz - 0.2); add('pane', jar);
        const lid = new THREE.CylinderGeometry(0.38, 0.4, 0.14, 14); lid.translate(px, 2.03, pz - 0.2); add('gold', lid);
        for (let k = 0; k < 6; k++) { const fl = new THREE.SphereGeometry(0.08, 6, 4); fl.translate(px + Math.cos(k * 1.9) * 0.28, 1.1 + (k % 3) * 0.3, pz - 0.2 + Math.sin(k * 1.9) * 0.22); add('flies', fl); }
        (this.jars ||= []).push([px, 1.35, pz - 0.2]); (this.lampPools ||= []).push([px, pz, 0xd8ff5a]);
      }
      if (t === 't') { // a toy chest with a ball and a paper crown on top
        box('top', 1.5, 0.8, 1.0, px, 0.4, pz - 0.2); box('trim', 1.56, 0.14, 1.06, px, 0.82, pz - 0.2); box('gold', 0.2, 0.22, 0.06, px, 0.65, pz + 0.31);
        const ball = new THREE.SphereGeometry(0.26, 12, 8); ball.translate(px - 0.35, 1.15, pz - 0.2); add('book1', ball);
        const cr = new THREE.CylinderGeometry(0.22, 0.2, 0.22, 8, 1, true); cr.translate(px + 0.35, 1.0, pz - 0.2); add('sunny', cr);
      }
      if (t === 'b') { // a ship's barrel with iron hoops
        const g = new THREE.CylinderGeometry(0.55, 0.55, 1.1, 12); g.translate(px, 0.55, pz); add('wood', g);
        for (const h of [0.22, 0.88]) { const r = new THREE.CylinderGeometry(0.57, 0.57, 0.08, 12); r.translate(px, h, pz); add('iron', r); }
        const lid = new THREE.CylinderGeometry(0.5, 0.5, 0.04, 12); lid.translate(px, 1.11, pz); add('stool', lid);
      }
      if (t === 'A') { // an anvil on a stump, with a half-made trophy
        box('stump', 0.9, 0.55, 0.9, px, 0.28, pz); box('iron', 1.1, 0.25, 0.55, px, 0.68, pz); box('iron', 0.5, 0.18, 0.4, px, 0.47, pz);
        const horn = new THREE.ConeGeometry(0.2, 0.55, 8); horn.rotateZ(Math.PI / 2); horn.translate(px + 0.8, 0.7, pz); add('iron', horn);
        const cup = new THREE.CylinderGeometry(0.16, 0.08, 0.3, 10); cup.translate(px - 0.2, 0.95, pz); add('gold', cup);
      }
    }
    const C = { wall: this.M.wall, wall2: this.M.wall, trim: 0xffffff, base: 0x8a5a3a, glass: (this.M.cityView ? { day: 0xb8a0ff, evening: 0xff8aa8, night: 0x3a2a7a } : { day: 0xbfe6ff, evening: 0xffa070, night: 0x1c2450 })[this.outPhase], stars: 0xffffff, moon: 0xfff0b0, wood: 0xa8703a, brick: 0x9a4a3a, brick2: 0x6a2a24, cap0: 0x3affd0, cap1: 0xff6ab0, skyline: 0x2a2048, lit: 0xffe070, stone: 0xa8a4b4, soot: 0x2a2228, fire: 0xffa030, coal: 0x2a1a1a, stump: 0x8a5a3a, iron: 0x4a4a5a, book0: 0xff6a5a, book1: 0x5a9aff, book2: 0xffd84d, metal: this.M.indoor === 'arcade' ? 0x5a3aa8 : 0xd0d8e8, screen: 0x6affd8, btn: 0xff5a8a, blanket: 0x5a9aff, pillow: 0xffffff, berry: 0xff3a6a, pot: 0xc86a4a, leaf: 0x4cc25a, counter: 0xffffff, top: 0xff7aa8, neon: 0xff5ad8, neon2: 0x3af0ff, frame: 0x8a5a3a, art0: 0x9ad8ff, art1: 0xffc8a0, hill: 0x5ac24a, sunny: 0xffe14d, stool: 0xd88a4a, mug: 0xffffff, plate: 0xf4f0e8, beaker: 0xd8f0ff, fluid0: 0x6aff9a, fluid1: 0xff7ad8, head: 0xf4e4d0, gold: 0xffc93a, dim: 0x9a94a8, gem0: 0xff4f8a, gem1: 0x48b8ff, gem2: 0x6ad050, cork: 0xc8925a, note0: 0xfff6c8, note1: 0xc8f0ff, note2: 0xffd8e8, pin: 0xff4a4a, ghost: 0x8a7464, ghostc: 0x2a8a5a, aqua: 0x3ab8ff, weed: 0x4cc25a, sandy: 0xf4dc9a, lava: 0xff5a2a, pine: 0x2f7a5a, knit: 0xd86a8a, knit2: 0xfff0d8, flies: 0xe8ff6a, door0: 0xc8845a, door1: 0xd8946a };
    for (const k in L) {
      if (k === 'pane' || k === 'goo') { const m = new THREE.Mesh(mergeGeometries(L[k]), new THREE.MeshBasicMaterial({ color: k === 'goo' ? 0x5aff9a : 0xd8f0ff, transparent: true, opacity: k === 'goo' ? 0.5 : 0.22, depthWrite: false })); if (k === 'goo') m.renderOrder = 2; m.material.userData.own = true; this.group.add(m); L[k].forEach((g) => g.dispose()); continue; }
      const glow = k === 'cap0' || k === 'cap1' || k === 'lit' || k === 'fire' || k === 'screen' || k === 'glass' || k === 'stars' || k === 'moon' || k === 'neon' || k === 'neon2' || k === 'fluid0' || k === 'fluid1' || k === 'flies' || k === 'aqua' || k === 'lava';
      const m = glow ? new THREE.Mesh(mergeGeometries(L[k]), new THREE.MeshBasicMaterial({ color: k === 'screen' && this.M.indoor === 'arcade' ? 0xff8ae8 : C[k] })) : inked(mergeGeometries(L[k]), toon(C[k] ?? 0xffffff, { rim: 0.3 }), k === 'book0' || k === 'book1' || k === 'book2' ? OL * 0.3 : OL * 0.6);
      if (glow) m.material.userData.own = true;
      m.castShadow = !glow && k !== 'trim'; m.receiveShadow = true;
      this.group.add(m);
      L[k].forEach((g) => g.dispose());
    }
    if (this.rocker) { // the rocking chair rocks on its own little pivot
      const { L: RK, px, pz } = this.rocker, g = new THREE.Group(); g.position.set(px, 0.05, pz);
      for (const k in RK) { const geo = mergeGeometries(RK[k]); geo.translate(-px, -0.05, -pz); const m = inked(geo, toon(C[k] ?? 0xffffff, { rim: 0.3 }), OL * 0.6); m.castShadow = true; m.receiveShadow = true; g.add(m); RK[k].forEach((q) => q.dispose()); }
      this.group.add(g); this.rocker = g;
    }
    this.roomLamp();
    for (const [lx, lz, col] of this.lampPools || []) { // glowcap lamps light the floor around them
      const m = new THREE.MeshBasicMaterial({ map: glowTex(), color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.35 }); m.userData.own = true;
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), m); pool.rotation.x = -Math.PI / 2; pool.position.set(lx, 0.04, lz); this.group.add(pool);
    }
    for (const [fx, , fz, k = 1] of this.forgeFire || []) { // the furnace lights the floor in front of it
      const m = new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xff7a2a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.5 }); m.userData.own = true;
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(6 * k + 1, 4.5 * k + 1), m); pool.rotation.x = -Math.PI / 2; pool.position.set(fx, 0.04, fz + 1.4 * k + 0.4); this.group.add(pool); this.forgePool = pool;
    }
  }

  // after dark a warm pool of lamplight on the room's floor (the arcade keeps its neon)
  roomLamp() {
    if (this.outPhase === 'day' || this.M.indoor === 'arcade') return;
    const m = new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xffb860, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: this.outPhase === 'night' ? 0.26 : 0.16 }); m.userData.own = true;
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(this.W * TILE * 0.8, this.H * TILE * 0.9), m);
    const [px, pz] = wpos((this.W - 1) / 2, (this.H - 1) / 2 + 0.5);
    pool.rotation.x = -Math.PI / 2; pool.position.set(px, 0.03, pz); this.group.add(pool);
  }

  // stadium lobbies: a poster of each of the cup's trainers' critters along the back wall
  poster(k, px, pz) {
    const cup = CUPS.find((c) => c.id === this.M.cup), m = k >= 0 && cup?.matches[k];
    if (!m) return;
    const tex = new THREE.TextureLoader().load(this.g.portrait(withGear(byId(m.critter), m.level)));
    tex.colorSpace = THREE.SRGBColorSpace; tex.userData.own = true;
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.8), toon(new THREE.Color(cup.color).getHex(), { rim: 0 }));
    bg.position.set(px, 2.05, pz + 1.04); this.group.add(bg);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true }); mat.userData.own = true;
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), mat); pic.position.set(px, 2.15, pz + 1.05); this.group.add(pic);
    const ntex = canvasTex(192, 40, (c) => { c.fillStyle = '#ffffff'; c.font = 'bold 28px Lilita One, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(m.name.toUpperCase(), 96, 22); });
    ntex.userData.own = true;
    const nm = new THREE.MeshBasicMaterial({ map: ntex, transparent: true }); nm.userData.own = true;
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.29), nm); lab.position.set(px, 1.32, pz + 1.05); this.group.add(lab);
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

  // after dusk the stadium's floodlights come on: four masts on the rim, and the pitch glows
  stadiumLights(G, w, d) {
    if (this.phase === 'day') return;
    const iron = [];
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = sx * (w / 2 - 0.5) * 0.72, z = sz * (d / 2 - 0.4) * 0.72;
      const p = new THREE.CylinderGeometry(0.08, 0.12, 2.2, 6); p.translate(x, 3.6, z); iron.push(p);
      const h = new THREE.BoxGeometry(0.8, 0.45, 0.2); h.translate(x, 4.75, z); iron.push(h);
      const sm = new THREE.SpriteMaterial({ map: glowTex(), color: 0xfff0c8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.95 }); sm.userData.own = true;
      const sp = new THREE.Sprite(sm); sp.scale.setScalar(2.4); sp.position.set(x, 4.8, z + 0.15); G.add(sp);
    }
    const im = inked(mergeGeometries(iron), toon(0x4a4a5a), OL * 0.5); G.add(im); iron.forEach((g) => g.dispose());
    const pm = new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xd8ffd0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: this.phase === 'night' ? 0.45 : 0.25 }); pm.userData.own = true;
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.85, d * 0.85), pm); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.6; G.add(pool);
  }

  stadiumModel(G, b, w, d) {
    const cup = CUPS.find((c) => c.id === b.stadium), won = save.adv.flags['cup_' + b.stadium];
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
      const fg = new THREE.PlaneGeometry(0.7, 0.4); fg.translate(0.35, 0, 0); // hinged at the pole so it can flutter
      const fl = new THREE.Mesh(fg, toon(won && k % 2 ? 0xffd23f : new THREE.Color(cup.color).getHex(), { side: THREE.DoubleSide })); fl.position.set(px, 3.7, pz); G.add(fl);
      this.pennants.push(fl);
    }
    if (won) { // a cup you've won: a gold star spins over the gate and every other pennant turns gold
      const st = new THREE.Shape();
      for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.26 : 0.6, a = k / 10 * Math.PI * 2 + Math.PI / 2; k ? st.lineTo(Math.cos(a) * r, Math.sin(a) * r) : st.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      const sg = new THREE.ExtrudeGeometry(st, { depth: 0.16, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1 }); sg.translate(0, 0, -0.08);
      const star = inked(sg, toon(0xffd23f, { rim: 1 }), OL * 0.5); star.position.set((b.door + 0.5) * TILE - w / 2, 4.15, d / 2 + 0.05); G.add(star);
      this.medals.push(star);
    }
    // the cup's emblem on a sign over the gate
    const sign = canvasTex(256, 64, (c, W, H) => { c.fillStyle = '#2a1630'; c.beginPath(); c.roundRect(0, 0, W, H, 16); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(cup.name.toUpperCase(), W / 2, H / 2 + 2); });
    sign.userData.own = true;
    const sm = new THREE.MeshBasicMaterial({ map: sign, transparent: true }); sm.userData.own = true;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), sm); s.position.set((b.door + 0.5) * TILE - w / 2, 3.0, d / 2 + 0.05); G.add(s);
  }

  // a bobbing ! over townsfolk with a favour to ask, and a ? when you've found what they lost
  questMarks() {
    const F = save.adv.flags;
    for (const a of this.npcs) {
      if (a.mark) { this.group.remove(a.mark); a.mark = null; }
      const id = a.n.story?.startsWith('lost:') && a.n.story.slice(5);
      const k = deliveryFor(a.n.id) ? '?' : !id ? null : !F[id + '_asked'] ? '!' : F[id + '_found'] && !F[id + '_done'] ? '?' : null;
      if (!k) continue;
      const m = new THREE.Sprite(markMat(k)); m.userData.shared = true; m.scale.setScalar(1.35);
      this.group.add(m); a.mark = m;
    }
  }

  // ---------- NPCs, trainers, wild critters ----------
  buildActors() {
    this.npcs = [];
    const F = save.adv.flags;
    for (const n of [...(this.M.npcs || []), ...this.traderSpot()]) {
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
        if (this.rain && n.act !== 'fish' && n.act !== 'sleep') brolly(cr, [0xff5a8a, 0x5ab8ff, 0xffd84d, 0x8a6aff][(n.x + n.y) % 4]); // a brolly up in the rain
      }
      root.userData.critter = true;
      this.group.add(root);
      const a = { n, root, cr, x: n.x, y: n.y, dir: n.dir || 's', moveT: 0, from: null, wanderT: 1 + Math.random() * 3, home: [n.x, n.y] };
      this.setPos(a);
      this.npcs.push(a);
    }
    this.questMarks();
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
    if (this.fishing && !this.dialog) this.updateFish(dt, act);
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
      if (this.fishing) { P.armLx = P.armRx = -1.1 + Math.sin(this.t * 0.8) * 0.06; P.armLz = P.armRz = 0.2; if (this.fishing.phase === 'bite') { P.lean = 0.2; H.emote('happy', 'open', 0.1); } }
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
    if (this.shakeT > 0 && !this.from) { // a wet-dog shake on the doormat, droplets flying
      this.shakeT -= dt; P.roll = Math.sin(this.shakeT * 38) * 0.35 * Math.min(1, this.shakeT * 2); P.headYaw = -P.roll; H.emote('closed', 'grin', 0.1);
      if (Math.random() < dt * 40) { const p = H.root.position, a = Math.random() * Math.PI * 2; this.g.fx.spawn({ x: p.x, y: 1.2 + Math.random() * 0.6, z: p.z, vx: Math.cos(a) * 3.5, vy: 1.5 + Math.random() * 1.5, vz: Math.sin(a) * 3.5, color: 0xbfe6ff, size: 0.16, life: 0.5, shape: 'glow', additive: false, grav: 9 }); }
      if (this.shakeT <= 0) P.roll = 0;
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
    // the giant toadstools breathe out glowing spores, each in its cap's colour
    if (this.shrooms?.length && Math.random() < dt * 6) {
      const [x, y, z, c] = this.shrooms[Math.floor(Math.random() * this.shrooms.length)];
      this.g.fx.spawn({ x: x + (Math.random() - 0.5) * 1.6, y, z: z + (Math.random() - 0.5) * 1.6, vy: 0.35 + Math.random() * 0.3, vx: (Math.random() - 0.5) * 0.3, vz: (Math.random() - 0.5) * 0.3, color: c, size: 0.22, life: 3, shape: 'glow', fadeIn: 0.4, hold: 0.5 });
    }
    if (this.M.snow && !this.M.indoor && Math.random() < dt * 10) { // the snow glitters in the light
      const p = this.hero.root.position;
      this.g.fx.spawn({ x: p.x + (Math.random() - 0.5) * 22, y: 0.08, z: p.z + (Math.random() - 0.6) * 15, color: 0xffffff, size: 0.2, life: 0.5, shape: 'star', fadeIn: 0.2 });
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
    for (const [fx, fy, fz, k = 1] of this.forgeFire || []) if (Math.random() < dt * 9 * k) this.g.fx.spawn({ x: fx + (Math.random() - 0.5) * 1.4 * k, y: fy, z: fz, vy: 1.2 + Math.random() * 1.6, vx: (Math.random() - 0.5) * 0.6, vz: 0.3 + Math.random() * 0.6, color: Math.random() < 0.6 ? 0xffa030 : 0xffe060, size: 0.14 + Math.random() * 0.1, life: 0.9, shape: 'glow' });
    if (this.thanksFan) { this.thanksFan.rotation.z -= dt * 14; if (Math.random() < dt * 3) this.g.fx.spawn({ shape: 'star', x: this.thanksFan.parent.parent.position.x + (Math.random() - 0.5) * 0.3, y: 0.55 + Math.random() * 0.3, z: this.thanksFan.parent.parent.position.z + (Math.random() - 0.5) * 0.3, vx: -1.1, vz: -0.65, vy: 0.15, life: 0.9, size: 0.18, color: 0xdff6ff }); }
    if (this.rocker?.isObject3D) { const near = this.hero && Math.hypot(this.hero.root.position.x - this.rocker.position.x, this.hero.root.position.z - this.rocker.position.z) < 3.2; this.rockA = (this.rockA ?? 0.04) + ((near ? 0.13 : 0.04) - (this.rockA ?? 0.04)) * Math.min(1, dt * 2); this.rocker.rotation.x = Math.sin(this.t * 1.7) * this.rockA; } // creak... creak...
    if (this.bonfire) { const B = this.bonfire; B.flames.forEach((f, k) => { const q = 1 + Math.sin(this.t * (9 + k * 3) + k) * 0.12 + Math.sin(this.t * 23 + k * 2) * 0.06; f.scale.set(1 / Math.sqrt(q), q, 1 / Math.sqrt(q)); }); const fl = 0.85 + Math.sin(this.t * 13) * 0.08 + Math.sin(this.t * 31) * 0.05; B.sp.material.opacity = 0.5 * fl; B.pool.material.opacity = 0.7 * fl; if (Math.random() < dt * 6) this.g.fx.spawn({ x: B.px + (Math.random() - 0.5) * 0.4, y: 0.9, z: B.pz + (Math.random() - 0.5) * 0.4, vx: (Math.random() - 0.5) * 0.6, vy: 1.6 + Math.random() * 1.2, vz: (Math.random() - 0.5) * 0.6, color: 0xffb040, size: 0.14, life: 1.1, shape: 'spark' }); }
    if (this.pendulum) this.pendulum.rotation.z = Math.sin(this.t * 2.2) * 0.22; // tick... tock...
    for (const [jx, jy, jz, col, sh] of this.jars || []) if (Math.random() < dt * 5) this.g.fx.spawn(sh ? { x: jx + (Math.random() - 0.5) * 1.0, y: jy, z: jz + (Math.random() - 0.5) * 0.6, vy: 0.6, color: col, size: 0.14, life: 0.7, shape: sh } : { x: jx + (Math.random() - 0.5) * 0.5, y: jy + (Math.random() - 0.5) * 0.6, z: jz + (Math.random() - 0.5) * 0.5, color: 0xe8ff6a, size: 0.3, life: 0.8, shape: 'glow', fadeIn: 0.3 });
    if (this.forgePool) this.forgePool.material.opacity = 0.42 + Math.sin(this.t * 7) * 0.05 + Math.sin(this.t * 17) * 0.04;
    if (this.dig && Math.random() < dt * 4) { const D = this.dig; this.g.fx.spawn({ x: D.px + (Math.random() - 0.5) * 0.9, y: 0.25 + Math.random() * 0.3, z: D.pz + (Math.random() - 0.5) * 0.7, vy: 0.4, color: Math.random() < 0.5 ? 0xffffff : 0xfff0a0, size: 0.45, life: 0.7, shape: 'star' }); }
    if (this.bush?.shake > 0) { const B = this.bush; B.shake -= dt; B.g.rotation.z = Math.sin(B.shake * 40) * B.shake * 0.18; B.g.scale.y = 1 + Math.sin(B.shake * 30) * B.shake * 0.08; }
    for (let k = 0; k < (this.pennants?.length || 0); k++) this.pennants[k].rotation.y = Math.sin(this.t * 3.1 + k * 1.7) * 0.35; // stadium pennants flap in the breeze
    for (const m of this.medals || []) m.rotation.y = this.t * 1.6;
    if (this.spinner) this.spinner.rotation.y += dt * (this.moveT > 0 ? 18 : 3);
    this.ambience(dt);
    this.updateFireworks(dt);
    for (const a of this.npcs || []) if (a.mark) a.mark.position.set(a.root.position.x, a.root.position.y + 2.7 + Math.sin(this.t * 4) * 0.12, a.root.position.z);
    if ((this.M.snow || this.M.border === 'cloud') && this.phase === 'night' && !this.M.indoor && Math.random() < dt * 0.18) { // now and then a shooting star streaks across the top of the view
      const p = this.hero.root.position, port = this.g.camera.aspect < 1, sx = p.x + (Math.random() - 0.5) * 14, sz = p.z + (port ? -9 : -4) - Math.random() * 2, dir = Math.random() < 0.5 ? 1 : -1;
      for (let k = 0; k < 12; k++) this.g.fx.spawn({ x: sx - dir * k * 0.28, y: 6 + k * 0.1, z: sz, vx: dir * 9, vy: -1, color: k ? 0xd8ecff : 0xffffff, size: k ? 0.32 - k * 0.02 : 0.5, life: 0.55 - k * 0.03, shape: k ? 'glow' : 'star' });
    }
    for (const A of this.aurora || []) { // curtains of light ripple across the top of the view
      const p = this.hero.root.position, q = A.q, a = q.geometry.attributes.position, B = A.base;
      const port = this.g.camera.aspect < 1; q.position.set(p.x + Math.sin(this.t * 0.07 + A.k) * 3, (port ? 10 : 8.5) + A.k * 0.5, p.z + (port ? -6.5 : 1.2) - A.k * 1.1);
      for (let i = 0; i < a.count; i++) { const x = B[i * 3]; a.array[i * 3 + 2] = Math.sin(x * 0.16 + this.t * (0.35 + A.k * 0.1) + A.k * 2) * 1.6 + Math.sin(x * 0.05 - this.t * 0.2) * 1.2; a.array[i * 3 + 1] = B[i * 3 + 1] + Math.sin(x * 0.11 + this.t * 0.5 + A.k) * 0.4; }
      a.needsUpdate = true; q.material.opacity = 0.55 + Math.sin(this.t * 0.6 + A.k * 1.7) * 0.18;
    }
    for (const m of this.mist || []) { // mist banks drift and wrap round the map, breathing in and out
      const q = m.q, Wd = this.W * TILE; q.position.x += m.v * dt; if (q.position.x > Wd + 4) q.position.x = -4; if (q.position.x < -4) q.position.x = Wd + 4;
      q.position.z += Math.sin(this.t * 0.3 + m.ph) * dt * 0.15; q.scale.y = q.scale.y * 0.999 + (2.8 + Math.sin(this.t * 0.4 + m.ph) * 0.8) * 0.001;
    }
    if (this.glowTide) this.glowTide.material.opacity = 0.6 + Math.sin(this.t * 1.1) * 0.3 + Math.sin(this.t * 2.9) * 0.1; // waves of sea sparks
    if (this.cracks) this.cracks.material.opacity = (this.phase === 'day' ? 0.75 : 0.88) + Math.sin(this.t * 1.7) * (this.phase === 'day' ? 0.25 : 0.12); // the magma breathes
    if (this.labDish) this.labDish.rotation.y = Math.sin(this.t * 0.4) * 1.2;
    if (this.beacon) this.beacon.material.color.setHex(this.t % 1.6 < 0.25 ? 0xff5050 : 0x5a1818);
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
    this.updateFish2(dt);
    for (const B of this.flies || []) {
      const a = this.t * 0.9 + B.ph, x = B.sx + Math.sin(a) * 1.4 + Math.sin(a * 2.3) * 0.4, z = B.sz + Math.cos(a * 0.8) * 1.0;
      B.g.position.set(x, 0.7 + Math.abs(Math.sin(a * 3)) * 0.5, z);
      B.g.rotation.y = Math.atan2(Math.cos(a) * 1.4, -Math.sin(a * 0.8) * 0.8);
      const f = 0.2 + Math.abs(Math.sin(this.t * 14 + B.ph)) * 1.1; for (const [wg, sd] of B.wings) wg.rotation.z = sd * f;
    }
    for (const B of this.gulls || []) {
      const c = this.hero.root.position, a = this.t * B.sp + B.ph;
      B.g.position.set(c.x + Math.cos(a) * B.r, B.y + Math.sin(a * 2) * 0.3, c.z - 3 + Math.sin(a) * B.r * 0.6);
      B.g.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a) * 0.6); B.g.rotation.z = 0.25;
      const f = Math.sin(this.t * 7 + B.ph) * 0.6; for (const [wg, sd] of B.wings) wg.rotation.z = sd * f;
    }
    for (const D of this.drones || []) { // they zip past over the hero's part of town
      const c = this.hero.root.position, u = this.t * D.sp + D.ph * 4, x = (u % 36) - 18, dir = Math.floor(u / 36) % 2 ? -1 : 1;
      D.g.position.set(c.x + x * dir, D.y + Math.sin(this.t * 2 + D.ph) * 0.15, c.z - 7 + D.ph * 0.4 + Math.sin(this.t * 0.5 + D.ph) * 1.5);
      D.g.rotation.z = -dir * 0.15; D.light.visible = (this.t * 2 + D.ph) % 1 < 0.5;
    }
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
        } else if (a.wild && this.phase === 'night') { // wild critters curl up in the grass at night
          P.sy = 0.82 + Math.sin(this.t * 1.3 + a.x) * 0.04; P.lean = -0.2; P.head = 0.35; P.armLz = P.armRz = 0.05;
          a.cr.emote('closed', 'o', 0.2);
          if (Math.random() < dt * 0.35) this.g.fx.text?.({ x: a.root.position.x + 0.4, y: 2.1, z: a.root.position.z }, 'z', 'zz');
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
      if ((a.n?.wander && !this.dozing(a.n) || a.wild && this.phase !== 'night') && a.wanderT <= 0) {
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

  // a cup won: a volley of fireworks over the stadium
  fireworks(b) { this.fw = { t: 0, k: 0, x: (b.x + b.w / 2) * TILE, z: (b.y + b.h * 0.8) * TILE }; }
  updateFireworks(dt) {
    const F = this.fw; if (!F) return;
    F.t += dt;
    while (F.k < 12 && F.t > F.k * 0.3) {
      const col = [0xff5a8a, 0xffd84d, 0x5ad8ff, 0x8aff7a, 0xc89aff][F.k % 5], p = { x: F.x + (Math.random() - 0.5) * 7, y: 5 + Math.random() * 1.6, z: F.z + (Math.random() - 0.5) * 3 };
      this.g.fx.burst(p, { n: 36, speed: 7, up: 0.8, color: col, size: 0.62, life: 1.4, shape: F.k % 2 ? 'star' : 'spark', grav: 2.2, drag: 1.3, spread: 1.2, grow: -0.5 });
      this.g.fx.spawn({ ...p, color: col, size: 2.6, life: 0.3, shape: 'glow' });
      sfx.ambient?.('pop'); F.k++;
    }
    if (F.k >= 12) this.fw = null;
  }

  // ☰ → 📸 Photo: a close, low snapshot of the hero (and buddy) where they stand, in a keepsake frame
  snapshot() {
    const g = this.g, H = this.hero; if (!H || this.busy || this.dialog) return;
    const cam = g.camera, keep = { pos: cam.position.clone(), quat: cam.quaternion.clone(), fov: cam.fov, yaw: H.root.rotation.y }, p = H.root.position;
    H.root.rotation.y = 0.25; H.emote?.('happy', 'grin', 1.2);
    const port = cam.aspect < 1;
    cam.position.set(p.x + 1.1, p.y + (port ? 5.6 : 3.1), p.z + (port ? 7 : 4.1)); cam.lookAt(p.x, p.y + 0.8, p.z); cam.fov = port ? 38 : 34; cam.updateProjectionMatrix();
    g.composer.render(0);
    const src = g.renderer.domElement, W = src.width, Hh = src.height, pad = Math.round(Math.min(W, Hh) * 0.045), foot = pad * 3.2;
    const out = document.createElement('canvas'); out.width = W + pad * 2; out.height = Hh + pad + foot;
    const x = out.getContext('2d'), sc = Math.min(W, Hh) / 400;
    x.fillStyle = '#fffaf0'; x.fillRect(0, 0, out.width, out.height);
    x.drawImage(src, pad, pad);
    x.font = `${Math.round(26 * sc)}px 'Lilita One', system-ui, sans-serif`; x.textBaseline = 'middle'; x.fillStyle = '#2a1630';
    const when = { day: '☀️', evening: '🌇', night: '🌙' }[this.outPhase] + (this.rain ? '🌧️' : '');
    const label = `${H.def.name} · ${this.M.name} ${when}`, fy = out.height - foot / 2;
    if (x.measureText(label + ' CRITTER CLASH! ').width + pad * 3 < out.width) {
      x.fillText(label, pad * 1.2, fy);
      x.textAlign = 'right'; x.fillStyle = '#ff5a8a'; x.fillText('CRITTER CLASH!', out.width - pad * 1.2, fy);
    } else { // a narrow (portrait) photo: the caption and the brand on two lines
      x.textAlign = 'center'; x.fillText(label, out.width / 2, fy - foot * 0.17);
      x.font = `${Math.round(18 * sc)}px 'Lilita One', system-ui, sans-serif`; x.fillStyle = '#ff5a8a'; x.fillText('CRITTER CLASH!', out.width / 2, fy + foot * 0.22);
    }
    cam.position.copy(keep.pos); cam.quaternion.copy(keep.quat); cam.fov = keep.fov; cam.updateProjectionMatrix(); H.root.rotation.y = keep.yaw;
    sfx.shutter?.();
    const fl = document.createElement('div'); fl.className = 'ph-flash go'; g.ui.appendChild(fl); setTimeout(() => fl.remove(), 600);
    PhotoMode.prototype.preview.call({ game: g }, out.toDataURL('image/png'), out); // the photo mode's Save/Share card
  }

  updateCamera(dt) {
    const cam = this.g.camera, p = this.hero.root.position;
    const port = cam.aspect < 1;
    const H = port ? 21 : 17, D = port ? 10 : 11.5;
    const want = new THREE.Vector3(p.x, H, p.z + D);
    // rooms are small: hold the whole room in view (portrait backs off far enough to fit the room's width)
    const vw = Math.min(this.W, 7.5); // wide rooms: portrait shows 7.5 tiles and pans with the hero
    const fit = port ? (vw * TILE + 1.2) / (2 * Math.tan(Math.min(80, 2 * Math.atan(Math.tan(0.38) / cam.aspect) * 180 / Math.PI) * Math.PI / 360) * cam.aspect) : 0;
    const rx = vw < this.W ? Math.max(vw * TILE / 2, Math.min((this.W - vw / 2) * TILE, p.x)) : this.W * TILE / 2;
    if (this.M.indoor) want.set(port ? rx : this.W * TILE / 2, port ? Math.max(19, fit * 0.93) : 16, this.H * TILE / 2 + (port ? Math.max(4, fit * 0.24) : 9.8));
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
    if (a?.wild && !this.busy) { // poke a roaming wild critter (a sleeping one wakes up grumpy)
      return this.say([this.phase === 'night' ? `The wild ${a.cr.def.name} was fast asleep... and now it's wide awake and grumpy!` : `The wild ${a.cr.def.name} puffs up for a fight!`], () => this.wildFight(a));
    }
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
    if (this.bush && this.bush.x === fx && this.bush.y === fy) return this.shakeBush();
    if (this.bonfire && this.bonfire.x === fx && this.bonfire.y === fy) { // warm your paws by the beach fire
      const B = this.bonfire; for (let k = 0; k < 12; k++) this.g.fx.spawn({ x: B.px + (Math.random() - 0.5) * 0.5, y: 1, z: B.pz, vx: (Math.random() - 0.5) * 1.5, vy: 2 + Math.random() * 2, vz: (Math.random() - 0.5) * 1.5, color: 0xffc050, size: 0.18, life: 1.2, shape: 'spark' });
      const snow = !!this.M.snow, day = new Date().toISOString().slice(0, 10);
      if ((save.adv.fire ||= {})[this.key] !== day) { // the first warm-up of the day: a toasted marshmallow (a little XP)
        save.adv.fire[this.key] = day; const hero = save.adv.hero, rr = grantXp(hero, Math.round(xpNeeded(save.critters[hero].level) * 0.15)); persist(); sfx.jingle?.(1);
        return this.say([snow ? 'Someone left a bag of marshmallows by the fire. {hero} toasts one on a stick until it\'s golden... and gobbles it up! (+XP)' : 'A bag of marshmallows sits by the fire. {hero} toasts one until it\'s gooey and golden... mmm! (+XP)', ...(rr.to > rr.from ? [`{hero} grew to Lv ${rr.to}!`] : []), 'One marshmallow a night is the rule. The fire will be here tomorrow too.']);
      }
      return this.say([(snow ? ['The campfire crackles in the snow. {hero} holds out their paws. Ahh, that\'s better!', 'Sparks float up into the cold, starry sky. Somewhere, a snowman looks jealous.', '{hero} warms up by the fire until even their ears feel toasty.'] : ['The bonfire crackles and pops. {hero} holds out their paws. Toasty!', 'Sparks float up and wink out among the stars. The waves hush on the sand.', '{hero} watches the flames dance for a while. A perfect beach night.'])[Math.floor(Math.random() * 3)]]);
    }
    if (this.dig && ((this.dig.x === fx && this.dig.y === fy) || (this.dig.x === this.hx && this.dig.y === this.hy))) return this.digUp();
    const lost = this.lost?.find((L) => L.x === fx && L.y === fy); if (lost) return this.S.worldStory('found:' + lost.id, this, null);
    if (this.tile(fx, fy) === '~' && save.adv.flags.rod && !this.M.indoor && !this.M.lava) return this.cast();
    const sign = (this.M.signs || []).find((s) => s.x === fx && s.y === fy);
    if (sign?.act) return this.S.worldStory(sign.act, this, null);
    if (sign) return this.say([sign.text], null, sign.hide ? '' : '📜 Sign');
    const door = this.doors.find((d) => d.x === fx && d.y === fy);
    if (door && this.dir === 'n') return this.S.worldDoor(door.b, this);
  }

  // Trader Tock visits one town a day (once the first cup is won), standing beside a path
  traderSpot() {
    const day = new Date().toISOString().slice(0, 10);
    if (traderTown() !== this.key) return [];
    const busy = new Set([...(this.M.npcs || []).map((n) => n.x + ',' + n.y), ...(this.M.signs || []).map((n) => n.x + ',' + n.y), ...(this.M.buildings || []).map((b) => (b.x + b.door) + ',' + (b.y + b.h))]);
    const N4 = Object.values(DIRS), ok = [];
    for (let y = 2; y < this.H - 2; y++) for (let x = 2; x < this.W - 2; x++) {
      if (!'.s'.includes(this.tile(x, y)) || busy.has(x + ',' + y) || !this.walkable(x, y)) continue;
      if (N4.some(([dx, dy]) => this.tile(x + dx, y + dy) === ':') && N4.filter(([dx, dy]) => this.walkable(x + dx, y + dy)).length === 4) ok.push([x, y]);
    }
    if (!ok.length) return [];
    const [x, y] = ok[hash(day + this.key) % ok.length];
    return [{ id: 'trader', x, y, critter: 'pebblepup', name: 'Trader Tock', dir: 's', story: 'trader', act: 'wave' }];
  }

  // a soundscape of one-shots: birds by day, crickets at night, surf on the beach, rain, mountain wind, city hum, lava bubbling
  ambience(dt) {
    const M = this.M; if (!M || M.indoor || this.busy) return;
    const A = this.amb ||= { bird: 3, cricket: 2, surf: 1, rain: 0, wind: 2, hum: 1, bubble: 2, owl: 6 }, due = [];
    if (this.rain) due.push(['rain', 1.5]);
    else if (M.snow || M.border === 'cloud') due.push(['wind', 3.5]);
    else if (M.city) due.push(['hum', 2.2]);
    else if (this.phase === 'night' || M.fireflies) { due.push(['cricket', 1.1]); if (this.phase === 'night' && !M.city && !M.lava) due.push(['owl', 14]); }
    else if (!M.lava) due.push(['bird', 2.6]);
    if (M.arena === 'beach') due.push(['surf', 3.2]);
    if (M.lava) due.push(['bubble', 1.8]);
    for (const [k, gap] of due) if ((A[k] -= dt) <= 0) { A[k] = gap * (0.6 + Math.random() * 0.9); sfx.ambient?.(k); }
  }

  // the bouncy town kids nod off outdoors at night
  dozing(n) { return this.phase === 'night' && (n.act === 'hop' || n.act === 'cheer') && !n.story && !n.trainer; }

  talk(a) {
    const n = a.n;
    if (this.dozing(n)) return this.say([`${n.name} is fast asleep, snoring softly. Better let them dream. Zzz...`]);
    a.dir = { n: 's', s: 'n', e: 'w', w: 'e' }[this.dir];
    if (n.story) return this.S.worldStory(n.story, this, a);
    const dq = deliveryFor(n.id); if (dq) return this.S.worldStory('deliver:' + dq, this, a);
    const dl = !n.trainer && deliveredLine(n.id); if (dl && Math.random() < 0.6) return this.say(dl);
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
    el.className = 'wd-box wd-ask' + (opts.length > 3 ? ' many' : '');
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
      diff: T.diff ?? Math.min(0.75, 0.22 + T.lv * 0.03), // route trainers get sharper as the journey goes on (a touch above the wild critters there)
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
    countUp('wild');
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
  const act = w.dozing(a.n) ? 'sleep' : a.n.act, cr = a.cr;
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
  } else if (act === 'water') { // tending the flower beds with a watering can
    const pour = (t % 4) < 2.2;
    P.armRx = pour ? -1.0 : -0.4; P.armRz = 0.5; P.lean = pour ? 0.15 : 0; P.head = pour ? 0.25 : 0;
    if (!a.prop) {
      const g = new THREE.Group(), M = toon(0x5ab8e8);
      const can = inked(new THREE.CylinderGeometry(0.18, 0.2, 0.3, 12), M, OL * 0.4); g.add(can);
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.4, 6), M); sp.rotation.x = 1.0; sp.position.set(0, 0.06, 0.26); g.add(sp);
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 10, Math.PI), M); h.position.y = 0.15; g.add(h);
      g.position.set(0.55, 0.75, 0.45); a.root.add(g); a.prop = g;
    }
    a.prop.rotation.x = pour ? 0.6 : 0;
    if (pour && Math.random() < dt * 14) { const p = new THREE.Vector3(0.55, 0.7, 0.9); a.root.localToWorld(p); w.g.fx.spawn({ x: p.x, y: p.y, z: p.z, vy: -1.5, vx: (Math.random() - 0.5) * 0.4, vz: (Math.random() - 0.5) * 0.4, color: 0x9ad8ff, size: 0.1, life: 0.45, shape: 'glow', additive: false, grav: 6 }); }
  } else if (act === 'read') { // nose in a book, turning a page now and then
    P.armLx = P.armRx = -1.2; P.armLz = P.armRz = 0.5; P.head = 0.35;
    if (!a.prop) {
      const g = new THREE.Group();
      for (const sd of [-1, 1]) { const pg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.4), toon(0xfff8e8)); pg.position.x = sd * 0.15; pg.rotation.z = sd * -0.25; g.add(pg); }
      const cv = inked(new THREE.BoxGeometry(0.66, 0.02, 0.44), toon(0x8a3a5a), OL * 0.3); cv.position.y = -0.03; g.add(cv);
      g.position.set(0, 0.95, 0.55); g.rotation.x = -0.7; a.root.add(g); a.prop = g;
    }
    if ((t % 6) < 0.3) cr.emote('happy', 'o', 0.1);
  } else if (act === 'skate') { // gliding figure-eights on the spot, arms out
    const k = Math.sin(t * 1.6);
    P.lean = 0.2; P.roll = k * 0.25; P.yaw = k * 0.5; P.armLz = P.armRz = 1.3; P.legL = k * 0.4; P.legR = -k * 0.4;
    cr.emote('happy', 'smile', 0.1);
    if (Math.random() < dt * 3) w.g.fx.spawn({ x: a.root.position.x + (Math.random() - 0.5), y: 0.1, z: a.root.position.z + (Math.random() - 0.5), color: 0xffffff, size: 0.2, life: 0.5, shape: 'star' });
  } else if (act === 'flex') { // showing off
    const on = (t % 3.5) < 1.4;
    if (on) { P.armLz = P.armRz = 2.0; P.armLx = P.armRx = 0.6; P.sy = 1.05; cr.emote('angry', 'grin', 0.1); }
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
