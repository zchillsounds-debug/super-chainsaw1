import { sellPrice, SALVAGE, MAT_NAMES } from './hub.js';
import * as THREE from 'three';
import { humanoid, animateHumanoid, setCharLOD, sword, camel, animateCamel, CharLOD } from './characters.js';
import { heightAt, SITES, canalX, mapColor, waterDepth } from './terrain.js';
import { resolve, buildGrid } from './collision.js';
import { buildNav, findPath, navClear } from './nav.js';
import { makeEnemy, TYPES } from './entities.js';
import * as SCENES from './scenes.js';
import { saveGame } from './save.js';
import { makeItem, rollRarity, RARITY, setWeaponPool } from './items.js';
import { glowDecal, splatTex } from './textures.js';
import { CLASSES, COMMON } from './classes.js';
import { REGION, IS_SAWAD, IS_MARSH, IS_KARKH, STORY, HUB } from './region.js';
import { LIEUT, BOSS, ISHAQ_TALK } from './story15.js';
import { WATER_Y, roadDist } from './terrain.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const BOUND = 132;
const rand = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

const MAX_TOKENS = 3; // melee foes allowed to press the attack at once; the rest circle and flank

export class Game {
  constructor({ scene, camera, renderer, world, fx, ui, audio }) {
    Object.assign(this, { scene, camera, renderer, world, fx, ui, audio });
    buildGrid();
    buildNav();
    this.stats = {}; this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || location.search.includes('mobile');
    this.npcs = []; this.interactables = [];
    this.t = 0; this.enemies = []; this.projectiles = []; this.hazards = []; this.drops = []; this.trails = [];
    this.mouse = new THREE.Vector2(); this.mouseScreen = { x: 0, y: 0 };
    this.keys = {}; this.lmb = false; this.shake = 0; this.camZoom = 1; this.hitStop = 0;
    this.camPos = new THREE.Vector3(); this.started = false;
    this.createPlayer();
    this.spawnEnemies();
    this.quests = STORY.quests.map((q) => ({ ...q, done: false }));
    this.ui.quest(this.quests);
    this.makeMinimap();
    this.bindInput();
    this.pois = [
      { x: SITES.village.x, z: SITES.village.z, icon: '⌂', color: '#9fe0d0' },
      { x: SITES.serai.x, z: SITES.serai.z, icon: '⚔', color: '#ffd040' },
      { x: SITES.kiln.x, z: SITES.kiln.z, icon: '▲', color: '#d0a070' },
      { x: SITES.arch.x, z: SITES.arch.z, icon: '♨', color: '#ff7020' },
    ];
    this.setupOccluders(this.world.occluders);
    this.decals = []; this.splatTexs = [splatTex(1), splatTex(2), splatTex(3)]; this.scorchTex = splatTex(4, true);
    this.fires2 = [];
    // a casting net that can pin the hero (made at load, shown when a net-thrower lands one)
    const nc = document.createElement('canvas'); nc.width = nc.height = 64; const nx = nc.getContext('2d'); nx.strokeStyle = '#fff'; nx.lineWidth = 3;
    for (let i = 0; i <= 64; i += 9) { nx.beginPath(); nx.moveTo(i, 0); nx.lineTo(i, 64); nx.stroke(); nx.beginPath(); nx.moveTo(0, i); nx.lineTo(64, i); nx.stroke(); }
    const nt = new THREE.CanvasTexture(nc); nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(5, 3);
    this.netMat = new THREE.MeshStandardMaterial({ map: nt, alphaTest: 0.4, side: THREE.DoubleSide, color: 0x9a8a68, roughness: 1 });
    this.netMesh = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(1, 2.1, 1), this.netMat); this.netMesh.visible = false; this.scene.add(this.netMesh);
    this.netGeo = new THREE.CircleGeometry(0.9, 12);
    this.stoneGeo = new THREE.DodecahedronGeometry(0.09, 0); this.stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.9 });
    this.arrowGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4).rotateX(Math.PI / 2); this.arrowMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
    // shader warm-up: one of each projectile sits far under the ground, so the load-time compile covers them
    const warm = new THREE.Group(); warm.position.set(0, -60, 0);
    warm.add(new THREE.Mesh(this.stoneGeo, this.stoneMat), new THREE.Mesh(this.arrowGeo, this.arrowMat), new THREE.Mesh(this.netGeo, this.netMat), new THREE.Mesh(this.netMesh.geometry, this.netMat));
    this.scene.add(warm);
  }

  decal(pos, size, kind) {
    const blood = kind !== 'scorch';
    const col = kind === 'fire' ? new THREE.Color(0.25, 0.08, 0.02) : new THREE.Color(0.11, 0.008, 0.008);
    const mat = new THREE.MeshStandardMaterial({ map: blood ? this.splatTexs[Math.floor(Math.random() * 3)] : this.scorchTex, color: blood ? col : 0xffffff, transparent: true, depthWrite: false, roughness: blood ? 0.25 : 1, polygonOffset: true, polygonOffsetFactor: -2, alphaTest: 0.02 });
    if (blood) { mat.alphaMap = mat.map; mat.map = null; }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), mat);
    m.position.set(pos.x, heightAt(pos.x, pos.z) + 0.03 + Math.random() * 0.01, pos.z); m.rotation.y = Math.random() * 6.28;
    m.renderOrder = 1; this.scene.add(m);
    this.decals.push({ m, t: 0, life: 25 });
    if (this.decals.length > 40) { const d = this.decals.shift(); this.scene.remove(d.m); d.m.material.dispose(); d.m.geometry.dispose(); }
  }

  // Diablo-style see-through: a soft dithered hole around the hero cut into any building surface in front of them.
  setupOccluders(groups) {
    const U = this.occU = { uHole: { value: new THREE.Vector2(-999, -999) }, uHoleR: { value: 160 }, uPDepth: { value: 0 } };
    const scaleOf = (o) => (o.isInstancedMesh ? 3.2 : 1.0);
    const patched = new Map();
    const patch = (mat, hs = 1) => {
      if (patched.has(mat)) return patched.get(mat);
      const m = mat.clone();
      const base = mat.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => {
        base && base.call(m, sh, r);
        Object.assign(sh.uniforms, U);
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', `#include <common>
            uniform vec2 uHole; uniform float uHoleR, uPDepth;
            float bayer4(vec2 p){ ivec2 i = ivec2(mod(p,4.0)); int k = i.x + i.y*4;
              float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return (m[k]+0.5)/16.0; }`)
          .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
            { float dz = vViewPosition.z; float d = length(gl_FragCoord.xy - uHole);
              float f = smoothstep(uHoleR*${hs.toFixed(2)}, uHoleR*${(hs * 0.55).toFixed(2)}, d) * step(dz, uPDepth - 1.2) * ${hs > 1 ? '1.0' : '0.85'};
              if (f > bayer4(gl_FragCoord.xy)) discard; }`);
      };
      const key = (mat.customProgramCacheKey ? mat.customProgramCacheKey() : '') + (base ? base.toString() : '');
      m.customProgramCacheKey = () => 'occ' + hs + ':' + key;
      patched.set(mat, m);
      return m;
    };
    for (const g of groups) g.traverse((o) => { if (o.isMesh && !o.userData.noOcc && !o.material.isMeshBasicMaterial) o.material = patch(o.material, scaleOf(o)); });
  }
  updateOccluders() {
    const p = this.player.pos;
    const sp = this.ui.project(tmp.set(p.x, p.y + 1.0, p.z), this.camera);
    const dpr = this.renderer.getPixelRatio();
    this.occU.uHole.value.set(sp.x * dpr, (innerHeight - sp.y) * dpr);
    this.occU.uHoleR.value = 200 * dpr * (13.5 / (13.5 * this.camZoom));
    tmp2.copy(tmp).applyMatrix4(this.camera.matrixWorldInverse);
    this.occU.uPDepth.value = -tmp2.z;
  }

  // ------------------------------------------------------------------ setup
  createPlayer(cls = 'faris') {
    const p = this.player = {
      rig: null, pos: new THREE.Vector3(HUB.spawn[0], 0, HUB.spawn[1]), facing: Math.PI, st: { phase: 0, walkBlend: 0, action: null, actionT: 0, hitT: 0, dead: false, deadT: 0, fallDir: 1 },
      hp: 100, mp: 60, level: 1, xp: 0, gold: 0, potions: 3, equip: {}, bag: new Array(40).fill(null), cds: {}, buffs: {},
      target: null, moveTo: null, actionDur: 0.6, hitApplied: false, dead: false, whirlT: 0, dashT: 0, invuln: 0,
    };
    this.setClass(cls, true);
    p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
    this.wardRings = [];
    for (let i = 0; i < 2; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.03, 6, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 0.4), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, toneMapped: false }));
      this.scene.add(r); this.wardRings.push(r);
    }
    // whirlwind sand vortex
    const vm = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uA: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform float uT, uA; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
        void main(){
          vec2 p = vec2(vUv.x*8.0 + uT*6.0 + vUv.y*3.0, vUv.y*3.0 - uT*1.5);
          float s = n(p)*0.6 + n(p*2.3)*0.4;
          float streak = smoothstep(0.38, 0.8, s);
          float a = streak * smoothstep(0.0,0.25,vUv.y) * smoothstep(1.0,0.6,vUv.y) * uA;
          gl_FragColor = vec4(mix(vec3(0.55,0.42,0.28), vec3(1.0,0.88,0.66), streak), min(1.0, a*1.3));
        }`,
    });
    this.vortex = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 1.2, 2.6, 32, 1, true).translate(0, 1.3, 0), vm);
    this.vortex.renderOrder = 4; this.scene.add(this.vortex);
    // cursor marker
    this.marker = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.35, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.6, 0.6), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    this.scene.add(this.marker);
    // player light (keeps the hero readable)
    this.pLight = new THREE.PointLight(0xffc890, 6, 9, 2); this.scene.add(this.pLight);
    this.bossLight = new THREE.PointLight(0xff8a40, 0, 16, 2); this.scene.add(this.bossLight);
  }

  // Swap Salim's discipline: rebuilds the rig, the kit and the starting weapon.
  setClass(cls, fresh = false) {
    const p = this.player, K = this.kit = CLASSES[cls] || CLASSES.faris; p.cls = cls in CLASSES ? cls : 'faris'; this.ui.curCls = p.cls;
    if (p.rig) this.scene.remove(p.rig);
    const rig = p.rig = humanoid(K.look); this.scene.add(rig);
    rig.position.copy(p.pos); rig.rotation.y = p.facing;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.35, depthWrite: false }));
    ring.position.y = 0.06; rig.add(ring);
    if (fresh || !p.equip.weapon || p.equip.weapon.cls !== p.cls) p.equip.weapon = { id: 0, slot: 'weapon', rarity: 'common', name: K.weapon.name, base: K.weapon.base, min: K.weapon.min, max: K.weapon.max, level: 1, stats: {}, cls: p.cls };
    setWeaponPool(p.cls, K.weapons);
    p.cds = {}; this.recalcStats(); p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
    this.ui.buildSkills?.(this.slotDefs());
    this.onClassChange?.();
  }
  slotDefs() { const K = this.kit; return { attack: K.attack, ...K.skills, potion: COMMON.potion, dodge: COMMON.dodge }; }

  recalcStats() {
    const p = this.player, B = this.kit.base, s = { min: 1, max: 3, armor: B.armor, maxHp: B.hp - 20 + p.level * 20, maxMp: B.mp + p.level * 6, crit: 5, speed: 0, leech: 0, move: 0, fire: 0, dmgPct: 0, regen: 2 };
    for (const it of Object.values(p.equip)) {
      if (!it) continue;
      if (it.min) { s.min = it.min; s.max = it.max; }
      if (it.armor) s.armor += it.armor;
      for (const [k, v] of Object.entries(it.stats)) {
        if (k === 'life') s.maxHp += v; else if (k === 'mana') s.maxMp += v; else s[k] = (s[k] || 0) + v;
      }
    }
    s.min = Math.round(s.min * (1 + s.dmgPct / 100) + p.level); s.max = Math.round(s.max * (1 + s.dmgPct / 100) + p.level * 1.5);
    p.stats = s;
    p.hp = Math.min(p.hp ?? s.maxHp, s.maxHp); p.mp = Math.min(p.mp ?? s.maxMp, s.maxMp);
  }

  spawnPack(type, x, z, n, level, opts = {}) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = Array.isArray(type) ? type[Math.floor(Math.random() * type.length)] : type;
      const e = makeEnemy(t, level, opts);
      const a = Math.random() * Math.PI * 2, r = Math.random() * (opts.spread ?? 4);
      e.pos.set(x + Math.cos(a) * r, 0, z + Math.sin(a) * r);
      resolve(e.pos, e.radius);
      e.pos.y = heightAt(e.pos.x, e.pos.z);
      e.home.copy(e.pos); e.facing = Math.random() * 6;
      this.scene.add(e.rig); this.enemies.push(e); out.push(e);
    }
    return out;
  }

  spawnEnemies() {
    TYPES[BOSS.type].build(); // sculpt the boss's geometry during loading so his entrance doesn't hitch
    this.bossSpawned = false;
    if (IS_MARSH) return this.spawnMarsh();
    if (IS_KARKH) return this.spawnKarkh();
    const S = SITES.serai, G = SITES.kiln;
    this.spawnPack(['bandit', 'bandit', 'archer'], 22, 36, 3, 1);
    this.spawnPack(['bandit', 'spearman'], 38, 14, 4, 1);
    this.spawnPack(['bandit', 'archer', 'spearman'], S.x, S.z + 6, 5, 2, { spread: 6 });
    this.spawnPack(['archer'], S.x - 10, S.z - 10, 2, 2);
    this.spawnPack(['bandit', 'spearman'], S.x + 8, S.z - 4, 3, 2);
    this.chief = this.spawnPack('spearman', S.x, S.z - 6, 1, 3, { elite: true, name: 'Farud' })[0];
    this.chief.quest = 'serai';
    this.spawnPack(['bandit', 'bandit'], S.x + 2, S.z - 6, 2, 2);
    // road to the bridge and beyond
    this.spawnPack(['bandit', 'archer'], 0, 6, 3, 2);
    this.spawnPack(['deserter'], -36, -16, 3, 2);
    // kiln yard: knife-men crouched behind the brick stacks, springing up when approached
    for (let i = 0; i < 4; i++) this.spawnPack('deserter', G.x + rand(-13, 13), G.z + rand(-11, 11), 2, 3, { hidden: true, spread: 3 });
    this.matriarch = this.spawnPack('spearman', G.x - 4, G.z - 2, 1, 4, { elite: true, name: 'Hisham' })[0];
    this.matriarch.quest = 'graves';
    // road south toward the arch
    this.spawnPack(['deserter', 'bandit'], 6, -30, 4, 3);
    this.spawnPack(['naffat', 'archer', 'spearman'], 8, -58, 5, 4, { spread: 5 });
    this.spawnPack('naffat', 20, -66, 1, 4, { elite: true });
  }
  // Act IV: Rawh's hired marsh men hold the causeways; ambushers crouch in the reed beds beside them
  spawnMarsh() {
    const S = SITES.serai, G = SITES.kiln, A = SITES.arch;
    this.spawnPack(['bandit', 'slinger'], -6, 62, 3, 6);
    this.spawnPack('reedman', -18, 58, 2, 6, { hidden: true, spread: 3 });
    this.spawnPack(['slinger', 'netter', 'bandit'], -30, 46, 4, 6);
    // the reed camp
    this.spawnPack(['bandit', 'slinger', 'netter'], S.x, S.z + 6, 5, 7, { spread: 6 });
    this.spawnPack(['slinger'], S.x - 9, S.z - 2, 2, 7);
    this.spawnPack('reedman', S.x + 12, S.z + 10, 2, 7, { hidden: true, spread: 4 });
    this.chief = this.spawnPack('netter', S.x + 1, S.z - 4, 1, 8, { elite: true, name: 'Marwan' })[0];
    this.chief.quest = STORY.chief;
    this.spawnPack(['bandit', 'spearman'], S.x + 3, S.z - 5, 2, 7);
    // the east causeway and the fish racks
    this.spawnPack(['slinger', 'bandit'], 28, 52, 3, 7);
    this.spawnPack('reedman', 40, 34, 3, 7, { hidden: true, spread: 4 });
    this.spawnPack(['spearman', 'netter', 'slinger'], G.x - 4, G.z + 4, 5, 8, { spread: 6 });
    this.spawnPack('slinger', G.x + 8, G.z - 8, 2, 8);
    this.matriarch = this.spawnPack('spearman', G.x + 2, G.z - 3, 1, 9, { elite: true, name: 'Sahl' })[0];
    this.matriarch.quest = STORY.second;
    // the two roads south to the weir
    this.spawnPack(['netter', 'slinger', 'bandit'], -48, 0, 4, 8);
    this.spawnPack('reedman', -38, -22, 3, 8, { hidden: true, spread: 4 });
    this.spawnPack(['spearman', 'slinger', 'netter'], -24, -52, 5, 9, { spread: 5 });
    this.spawnPack(['bandit', 'slinger'], 50, -34, 4, 9);
    this.spawnPack(['spearman', 'netter'], 28, -62, 4, 9);
    this.spawnPack('slinger', A.x + 14, A.z + 16, 1, 9, { elite: true });
  }
  // Act V: the buyer's guards hold the lanes of burned al-Karkh; knife-men hide in the ruins
  spawnKarkh() {
    const S = SITES.serai, G = SITES.kiln, A = SITES.arch;
    this.spawnPack(['guard', 'archer'], -40, 70, 3, 9);
    this.spawnPack(['deserter'], -26, 60, 2, 9, { hidden: true, spread: 3 });
    // the burned suq
    this.spawnPack(['guard', 'deserter', 'archer'], S.x, S.z + 8, 4, 10, { spread: 6 });
    for (let i = 0; i < 2; i++) this.spawnPack('deserter', S.x + rand(-9, 9), S.z + rand(-12, 12), 2, 10, { hidden: true, spread: 3 });
    this.chief = this.spawnPack('guard', S.x, S.z - 4, 1, 11, { elite: true, name: '\'Asim' })[0];
    this.chief.quest = STORY.chief;
    this.spawnPack(['guard', 'archer'], S.x - 3, S.z - 6, 2, 10);
    // the paper-sellers' lane
    this.spawnPack(['naffat', 'guard', 'archer'], -32, -6, 4, 10);
    this.spawnPack(['naffat', 'guard', 'archer', 'naffat'], G.x + 4, G.z + 3, 5, 11, { spread: 6 });
    this.matriarch = this.spawnPack('naffat', G.x - 2, G.z - 2, 1, 12, { elite: true, name: 'Layth' })[0];
    this.matriarch.quest = STORY.second;
    // the east lanes and the way to the square
    this.spawnPack(['guard', 'spearman'], 8, 62, 3, 10);
    this.spawnPack(['guard', 'archer', 'naffat'], 60, 10, 4, 11);
    this.spawnPack(['guard', 'deserter'], 20, -20, 4, 11);
    this.spawnPack(['guard', 'spearman', 'archer'], 44, -40, 5, 11, { spread: 5 });
    this.spawnPack('naffat', A.x - 16, A.z + 14, 1, 11, { elite: true });
  }

  makeMinimap() {
    const c = document.createElement('canvas'); c.width = c.height = 280; const x = c.getContext('2d');
    for (let j = 0; j < 280; j += 2) for (let i = 0; i < 280; i += 2) {
      x.fillStyle = mapColor(i - 140, j - 140);
      x.fillRect(i, j, 2, 2);
    }
    this.ui.mapImg = c;
  }

  // ------------------------------------------------------------------ input
  bindInput() {
    const el = this.renderer.domElement;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => { this.mouseScreen.x = e.clientX; this.mouseScreen.y = e.clientY; this.mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); });
    el.addEventListener('mousedown', (e) => {
      if (!this.started || this.player.dead || this.ui.dialogOpen) return;
      this.audio.init();
      if (e.button === 0) {
        this.lmb = true;
        if (this.hoverNpc) { this.hoverNpc.talk(); return; }
        if (this.hover) { this.player.target = this.hover; this.player.moveTo = null; }
        else { this.player.target = null; this.setMoveTarget(); this.showMarker(); }
      } else if (e.button === 2) this.useSkill('rmb');
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.lmb = false; });
    addEventListener('wheel', (e) => { this.camZoom = THREE.MathUtils.clamp(this.camZoom + Math.sign(e.deltaY) * 0.08, 0.7, 1.35); });
    addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (!this.started) return;
      if (e.key === 'Alt') e.preventDefault();
      const k = e.key.toLowerCase();
      if (this.paused) return;
      if (k === '1') this.useSkill('s1');
      if (k === '2') this.useSkill('s2');
      if (k === '3') this.useSkill('s3');
      if (k === '4') this.useSkill('rmb');
      if (k === 'q') this.useSkill('potion');
      if (k === ' ') { e.preventDefault(); this.useSkill('dodge'); }
      if (k === 'i' || k === 'c') { this.ui.toggleInventory(); this.refreshInv(); }

      if (k === 'k') this.openPanel?.('skills');
      if (k === 'j') this.journal?.('journal');
    });
    addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
  }

  groundPoint(ndc = this.mouse) {
    const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, this.camera);
    const o = rc.ray.origin, d = rc.ray.direction;
    let t = 0, prev = 0;
    for (let i = 0; i < 200; i++) {
      const p = tmp.copy(o).addScaledVector(d, t);
      if (p.y < heightAt(p.x, p.z)) { // refine
        let a = prev, b = t;
        for (let k = 0; k < 8; k++) { const m = (a + b) / 2; const q = tmp2.copy(o).addScaledVector(d, m); if (q.y < heightAt(q.x, q.z)) b = m; else a = m; }
        return o.clone().addScaledVector(d, b);
      }
      prev = t; t += 1.0;
    }
    return o.clone().addScaledVector(d, -o.y / d.y);
  }
  // what the hero is walking on (footstep sounds and dust)
  surfaceAt(pos) {
    if (this.interior) { const I = this.interior.I; if (I.style === 'qanat') { const c = I.center(I.rooms.reduce((a, r) => (Math.hypot(I.center(r).x - pos.x, I.center(r).z - pos.z) < Math.hypot(I.center(a).x - pos.x, I.center(a).z - pos.z) ? r : a))); if (Math.abs(pos.x - (c.x + 3.6)) < 0.9) return 'water'; return 'stone'; } return 'brick'; }
    if (IS_MARSH) return waterDepth(pos.x, pos.z) > 0.04 ? 'water' : roadDist(pos.x, pos.z) < 3 ? 'sand' : 'grass';
    if (Math.abs(pos.x - canalX(pos.z)) < 5.2) return 'water';
    if (IS_KARKH) return roadDist(pos.x, pos.z) < 3.5 || Object.values(SITES).some((s) => Math.hypot(pos.x - s.x, pos.z - s.z) < s.r * 0.7) ? 'brick' : 'sand';
    const V = SITES.village; if (Math.hypot(pos.x - V.x, pos.z - V.z) < 16) return 'brick';
    const S = SITES.serai; if (Math.abs(pos.x - S.x) < 11 && Math.abs(pos.z - S.z) < 11) return 'brick';
    return 'sand';
  }
  // touch aiming: point the virtual cursor at the nearest foe, else straight ahead
  aimAuto() {
    const p = this.player, e = this.pickTarget(14);
    const at = e ? e.pos.clone() : p.pos.clone().add(new THREE.Vector3(Math.sin(p.facing) * 6, 0, Math.cos(p.facing) * 6));
    const v = at.project(this.camera); this.mouse.set(v.x, v.y);
  }
  setMoveTarget() { this.player.moveTo = this.groundPoint(); }
  showMarker() { const g = this.player.moveTo; if (!g) return; this.marker.position.set(g.x, g.y + 0.08, g.z); this.marker.material.opacity = 1; this.marker.scale.setScalar(1.6); }

  pickHover() {
    let best = null, bd = 46;
    for (const e of this.enemies) {
      if (e.dead || e.hidden || e.rig.visible === false) continue;
      if (e.pos.distanceTo(this.player.pos) > 40) continue;
      const sp = this.ui.project(tmp.copy(e.pos).setY(e.pos.y + (e.boss ? 4 : 1.1)), this.camera);
      const d = Math.hypot(sp.x - this.mouseScreen.x, sp.y - this.mouseScreen.y) / (e.boss ? 3 : 1);
      if (d < bd) { bd = d; best = e; }
    }
    this.hover = best;
    this.hoverNpc = null;
    if (!best) for (const n of this.npcs) {
      if (n.pos.distanceTo(this.player.pos) > 30) continue;
      const sp = this.ui.project(tmp.copy(n.pos).setY(n.pos.y + 1.2), this.camera);
      if (Math.hypot(sp.x - this.mouseScreen.x, sp.y - this.mouseScreen.y) < 40) { this.hoverNpc = n; break; }
    }
    this.renderer.domElement.style.cursor = best ? 'crosshair' : (this.hoverNpc ? 'help' : 'default');
  }

  // ------------------------------------------------------------------ combat helpers
  rollDamage(mult = 1, fire = false) {
    const s = this.player.stats;
    let d = rand(s.min, s.max) * mult * (fire ? 1 + s.fire / 100 : 1);
    let crit = Math.random() * 100 < s.crit;
    if (this.player.nextCrit) { crit = true; this.player.nextCrit = false; }
    if (this.player.buffs.stealth > 0) { d *= 1.5; crit = true; this.player.buffs.stealth = 0; }
    if (crit) d *= 2;
    return { d: Math.max(1, Math.round(d)), crit };
  }

  // o: { weight (hit-stop / kick / knockback scale), stagger (poise damage), knock (metres), unblockable }
  damageEnemy(e, dmg, crit, src, kind = 'normal', o = {}) {
    if (e.dead || e.hidden) return;
    const tick = kind === 'dot';
    const p = this.player, w = o.weight ?? this.kit.weight;
    e.alerted = true; e.lost = 0;
    if (tick) { e.hp -= dmg; e.flash = Math.max(e.flash, 0.4); if (e.hp <= 0) this.killEnemy(e, src); return; }
    const from = tmp.copy(src).sub(e.pos).setY(0); const fl = from.length() || 1; from.divideScalar(fl);
    const front = from.dot(tmp2.set(Math.sin(e.facing), 0, Math.cos(e.facing)));
    // shield-bearers turn aside frontal blows unless staggered, attacking, or the blow is a bash
    if (e.shield && !o.unblockable && !e.staggerT && !e.st.action && front > 0.45 && Math.random() < 0.65) {
      dmg = Math.max(1, Math.round(dmg * 0.2)); crit = false;
      e.flash = 0.4; this.audio.at(e.pos, () => this.audio.clang()); this.fx.sparks(tmp2.copy(e.pos).setY(e.pos.y + 1.2).addScaledVector(from, 0.5), new THREE.Color(4, 3, 1.6));
      this.ui.damageNumber(e.pos, 'Blocked', 'block'); e.hp -= dmg; e.poise -= w * 4; e.st.hitT = 0.3;
      if (e.hp <= 0) this.killEnemy(e, src); return;
    }
    // backstab: knives in the back hit harder
    let back = false;
    if (this.kit.attack.backstab && front < -0.3 && kind === 'normal' && !e.boss) { dmg = Math.round(dmg * this.kit.attack.backstab); back = true; }
    if (e.staggerT > 0) dmg = Math.round(dmg * 1.5);
    if (this.dmgMod) dmg = Math.round(dmg * this.dmgMod(e));
    e.hp -= dmg; e.flash = 1;
    // stagger meter: poise drains with weight; empty → reeling, open to heavy hits
    e.poise -= (o.stagger ?? (8 + dmg * 1.4) * w) * (e.boss ? 0.15 : 1);
    if (e.poise <= 0 && !e.boss) { e.staggerT = e.elite ? 1.0 : 1.4; e.poise = e.maxPoise; e.st.action = null; this.ui.damageNumber(e.pos, 'Staggered', 'stagger'); this.audio.stagger?.(); }
    if (!e.boss) { e.st.hitT = 1; const k = (o.knock ?? 0.25 + w * 0.35) * (crit ? 1.6 : 1) * (e.elite ? 0.5 : 1); e.knock = (e.knock || new THREE.Vector3()).addScaledVector(from, -k * 9); }
    this.ui.damageNumber(e.pos, dmg + (crit ? '!' : back ? '◂' : ''), crit ? 'crit' : back ? 'back' : kind);
    const hp = tmp2.copy(e.pos); hp.y += e.boss ? 3.5 : 1.2;
    if (e.T.fiery) this.fx.sparks(hp, new THREE.Color(4, 1.4, 0.3));
    this.fx.blood(hp); if (crit || w > 0.8) this.fx.sparks(hp);
    if (Math.random() < 0.25 + w * 0.2) this.decal(e.pos, 0.5 + Math.random() * 0.6, 'blood');
    // hit-stop and camera kick scale with weapon weight
    this.hitStop = Math.max(this.hitStop, (crit ? 0.07 : 0.035) * (0.4 + w));
    if (kind !== 'fire') this.impulse(tmp.copy(from).negate(), 0.06 * w + (crit ? 0.08 : 0));
    if (crit) { this.audio.at(e.pos, () => this.audio.crit()); this.shake = Math.max(this.shake, 0.2 + w * 0.1); } else this.audio.at(e.pos, () => this.audio.hit(w));
    if (p.stats.leech) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.leech);
    this.onHit?.(e, dmg, crit);
    this.lastTarget = e; this.lastTargetT = 3;
    for (const o2 of this.enemies) if (!o2.dead && o2.pos.distanceTo(e.pos) < 12) o2.alerted = true;
    if (e.hp <= 0) this.killEnemy(e, src);
  }

  killEnemy(e, src) {
    e.dead = true; e.st.dead = true; e.st.deadT = 0; e.hp = 0; this.kills = (this.kills || 0) + 1;
    e.st.fallDir = Math.random() < 0.5 ? 1 : -1;
    this.audio.at(e.pos, () => this.audio.death());
    const p = this.player; p.xp += e.xp;
    this.fx.dust(e.pos, 6);
    if (!e.boss) this.decal(e.pos, 1.6 + Math.random(), 'blood');
    if (e.aura) e.aura.visible = false;
    while (p.xp >= this.xpFor(p.level)) { p.xp -= this.xpFor(p.level); this.levelUp(); }
    // loot
    const n = e.boss ? 6 : e.elite ? 3 : (Math.random() < 0.35 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const rar = e.boss && i === 0 ? 'legendary' : e.elite && i === 0 ? (Math.random() < 0.3 ? 'legendary' : 'rare') : rollRarity(e.level, e.elite ? 0.1 : 0);
      this.dropItem(makeItem(e.level + (e.elite ? 1 : 0), rar), e.pos);
    }
    if (Math.random() < (e.elite ? 1 : 0.45)) this.dropItem({ gold: Math.round(rand(3, 9) * e.level * (e.elite ? 5 : 1)), rarity: 'common' }, e.pos);
    if (Math.random() < (e.elite ? 1 : 0.1)) this.dropItem({ potion: true, rarity: 'common' }, e.pos);
    this.onKill?.(e); e.onDeath?.(e);
    if (e.quest) this.completeQuest(e.quest, !!this.director);
    for (const [foe, L] of [[this.chief, LIEUT.chief], [this.matriarch, LIEUT.second]]) if (e === foe && this.director) this.director.play(SCENES.lieutenantFalls(this, e, L)).then(() => this.checkpoint(L.act));
    if (e.boss) this.onBossDeath(e);
  }
  checkpoint(act) { this.act = Math.max(this.act || 1, act); if (!this.interior) this.lighting?.forAct(this.act, 4); saveGame(this); }
  anim(rig, st, dt) { animateHumanoid(rig, st, this.t, dt); }
  // skinning budget: rigs off-screen or far from the hero animate at a lower rate (dt accumulates)
  animEnemy(e, dt, dist) {
    if (!e.rig.visible) { e.animAcc = (e.animAcc || 0) + dt; return; }
    e.animAcc = (e.animAcc || 0) + dt;
    const every = dist > 30 ? 3 : dist > 18 ? 2 : 1;
    if (((this.frameN || 0) + (e.animSlot ??= Math.floor(Math.random() * 3))) % every) return;
    animateHumanoid(e.rig, e.st, this.t, e.animAcc); e.animAcc = 0;
  }
  // while a cinematic plays: the world keeps breathing, everyone else holds still
  cineTick(dt) {
    // no see-through hole in cutscenes: the camera is free, and the dither read as grain on walls
    if (this.occU) this.occU.uHole.value.set(-9999, -9999);
    if (this.guide) { this.guide.mesh.count = 0; this.guide.vis = 0; }
    if (this.npcMark) this.npcMark.visible = false;
    this.t += dt;
    const actors = this.director?.def?.actors || [];
    const busy = new Set(actors.map((a) => a.rig));
    for (const e of this.enemies) if (!busy.has(e.rig) && !e.hidden) { if (e.dead) e.st.deadT += dt; animateHumanoid(e.rig, e.st, this.t, dt); }
    if (this.npc && !busy.has(this.npc)) animateHumanoid(this.npc, this.npcSt, this.t, dt);
    this.updateAmbientLife(dt);
    this.updateDrops(dt);
  }

  xpFor(l) { return Math.round(90 * Math.pow(l, 1.6)); }
  levelUp() {
    const p = this.player; p.level++; this.recalcStats(); p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
    this.ui.toast(`Level ${p.level} · a discipline point to spend (K)`, 'lvl'); this.audio.levelUp();
    this.fx.ring(p.pos, new THREE.Color(3, 2.4, 1), 0.5, 4, 0.9);
    this.fx.burst(tmp.copy(p.pos).setY(p.pos.y + 1), 50, { speed: 3, life: 1.4, size: 0.18, size1: 0.02, color: new THREE.Color(3, 2.4, 1), up: 3, drag: 1 });
  }

  completeQuest(id, silent) {
    const q = this.quests.find((x) => x.id === id); if (!q || q.done) return;
    q.done = true; this.refreshTracker ? this.refreshTracker() : this.ui.quest(this.quests);
    if (silent) return;
    const msgs = { serai: ['Farud Confesses', 'The buyer\'s name was Ghassan'], graves: ['The Kilns Fall Silent', 'Some pages were saved from the fire'], boss: ['The Silence Is Broken', 'The Pages are recovered; the water runs again'] };
    this.ui.banner(...msgs[id]);
  }

  damagePlayer(dmg, src, attacker = null) {
    const p = this.player; if (p.dead) return;
    // parry: an evade started just before a melee blow lands turns it aside and leaves the attacker reeling
    if (attacker && p.rollT > 0 && p.rollAge < 0.2 && !attacker.boss) {
      attacker.staggerT = 1.6; attacker.st.action = null; attacker.st.hitT = 1; attacker.poise = attacker.maxPoise;
      this.ui.damageNumber(p.pos, 'Parry!', 'parry'); this.audio.clang(); this.audio.stagger?.();
      this.fx.sparks(tmp.copy(p.pos).lerp(attacker.pos, 0.5).setY(p.pos.y + 1.3), new THREE.Color(5, 4, 2.4));
      this.hitStop = 0.12; this.slowMo = 0.45; this.player.nextCrit = true; this.stats.parries = (this.stats.parries || 0) + 1; this.onParry?.();
      return;
    }
    if (p.invuln > 0) { if (p.rollT > 0) this.ui.damageNumber(p.pos, 'Evaded', 'block'); return; }
    const s = p.stats;
    let red = s.armor / (s.armor + 40 + p.level * 6);
    if (p.buffs.ward > 0) { red = 1 - (1 - red) * 0.5; if (attacker && !attacker.boss) { const r = this.rollDamage(0.3); this.damageEnemy(attacker, r.d, false, p.pos, 'normal', { weight: 0.5 }); } }
    const d = Math.max(1, Math.round(dmg * (1 - red)));
    p.hp -= d; p.st.hitT = 0.6; this.impulse(tmp.copy(p.pos).sub(src).setY(0).normalize(), Math.min(0.4, d / 40));
    this.ui.damageNumber(p.pos, d, 'player');
    this.fx.blood(tmp.copy(p.pos).setY(p.pos.y + 1.2));
    this.shake = Math.max(this.shake, Math.min(0.5, d / 40));
    this.audio.grunt(); this.onPlayerHurt?.(d);
    if (p.hp <= 0) this.playerDeath();
  }

  playerDeath() {
    const p = this.player; p.dead = true; p.hp = 0; p.st.dead = true; p.st.deadT = 0;
    setTimeout(() => { if (this.player.dead) this.ui.death(true, () => this.respawn()); }, 1500);
  }
  async respawn() {
    const p = this.player; this.ui.death(false);
    if (this.interior) await this.zones.exit();
    p.dead = false; p.st.dead = false; p.rig.children[0].rotation.x = 0; p.rig.children[0].position.y = 0;
    p.hp = p.stats.maxHp; p.mp = p.stats.maxMp; p.pos.set(1, 0, 88); p.target = null; p.moveTo = null; p.invuln = 2;
    p.gold = Math.floor(p.gold * 0.9);
    for (const e of this.enemies) if (!e.dead) { e.alerted = false; e.hp = e.maxHp; e.pos.copy(e.home); }
    if (this.boss && !this.boss.dead) { this.boss.hp = this.boss.maxHp; this.ui.bossBar(null); this.bossActive = false; }
  }

  // ------------------------------------------------------------------ loot
  dropItem(item, at) {
    const grp = new THREE.Group();
    const r = RARITY[item.rarity];
    if (item.gold) {
      const cm = new THREE.MeshStandardMaterial({ color: 0xffc840, metalness: 1, roughness: 0.3, emissive: 0x402800 });
      for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 12), cm); c.position.set(rand(-0.15, 0.15), i * 0.02, rand(-0.15, 0.15)); c.rotation.set(rand(-0.3, 0.3), 0, rand(-0.3, 0.3)); grp.add(c); }
    } else if (item.potion) {
      const pm = new THREE.MeshStandardMaterial({ color: 0x8a0a1a, emissive: 0x500010, roughness: 0.1 });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), pm); b.position.y = 0.16; grp.add(b);
      const n = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.15, 8), pm); n.position.y = 0.34; grp.add(n);
    } else {
      let m;
      if (item.slot === 'weapon') { m = sword(); m.rotation.z = Math.PI / 2; m.position.y = 0.06; m.scale.setScalar(1.1); }
      else {
        const col = { armor: 0x7a7d80, helm: 0x9a9da0, ring: 0xe0b050, amulet: 0x3a6ac8 }[item.slot];
        const geo = item.slot === 'ring' ? new THREE.TorusGeometry(0.12, 0.035, 8, 16) : item.slot === 'amulet' ? new THREE.OctahedronGeometry(0.15) : item.slot === 'helm' ? new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2) : new THREE.BoxGeometry(0.5, 0.15, 0.4);
        m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, metalness: 0.9, roughness: 0.35 }));
        m.position.y = 0.12;
      }
      grp.add(m);
      if (item.rarity !== 'common') {
        const bh = item.rarity === 'legendary' ? 9 : item.rarity === 'rare' ? 6 : 3.5;
        const bm = new THREE.ShaderMaterial({
          uniforms: { uC: { value: new THREE.Color(r.beam).multiplyScalar(2.5) }, uT: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
          vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
          fragmentShader: 'uniform vec3 uC; varying vec2 vUv; void main(){ float a = (1.0-vUv.y)*(1.0-vUv.y) * (0.5+0.5*sin(vUv.x*6.283*1.0)) ; a *= smoothstep(0.0,0.05,vUv.y); gl_FragColor = vec4(uC, a*0.55); }',
        });
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, bh, 16, 1, true).translate(0, bh / 2, 0), bm);
        grp.add(beam);
        const gm = new THREE.MeshBasicMaterial({ map: glowDecal(), color: new THREE.Color(r.beam).multiplyScalar(1.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4).rotateX(-Math.PI / 2), gm); gl.position.y = 0.04; grp.add(gl);
      }
    }
    grp.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const a = Math.random() * Math.PI * 2, r0 = rand(0.8, 2.2);
    const to = new THREE.Vector3(at.x + Math.cos(a) * r0, 0, at.z + Math.sin(a) * r0);
    resolve(to, 0.3); to.y = heightAt(to.x, to.z);
    const drop = { item, mesh: grp, from: at.clone(), to, t: 0, age: 0 };
    grp.position.copy(at);
    this.scene.add(grp); this.drops.push(drop);
    this.ui.addLootLabel(drop, (d) => { this.player.pickup = d; this.player.target = null; this.player.moveTo = d.to.clone(); });
    if (item.rarity === 'legendary') { this.audio.legendary(); this.ui.toast(`★ ${item.name} ★`, 'leg'); }
  }

  // loot beams and glow decals step aside during cinematics
  setLootBeams(on) { for (const d of this.drops) d.mesh.children.forEach((c) => { if (c.material?.blending === THREE.AdditiveBlending) c.visible = on; }); this.ui.labels.style.display = on ? '' : 'none'; }
  tryPickup(d) {
    const p = this.player;
    if (d.item.gold) { p.gold += d.item.gold; this.audio.gold(); }
    else if (d.item.potion) { if (p.potions >= 5) return false; p.potions++; this.audio.pickup(); }
    else {
      const slot = p.bag.indexOf(null);
      if (slot < 0) { this.ui.toast('Your pack is full'); return false; }
      p.bag[slot] = d.item; this.audio.pickup();
      // auto-equip into empty slots
      if (!p.equip[d.item.slot] && !(d.item.cls && d.item.cls !== p.cls)) { p.equip[d.item.slot] = d.item; p.bag[slot] = null; this.recalcStats(); this.ui.toast(`Equipped ${d.item.name}`); }
    }
    this.scene.remove(d.mesh); this.ui.removeLootLabel(d);
    this.drops.splice(this.drops.indexOf(d), 1);
    this.refreshInv();
    return true;
  }

  refreshInv() {
    if (!this.ui.invOpen) return;
    const p = this.player;
    const equip = (i) => { const it = p.bag[i]; if (it.slot === 'weapon' && it.cls && it.cls !== p.cls) { this.ui.toast(`Only a ${CLASSES[it.cls].name} can wield that`); return; } const old = p.equip[it.slot]; p.equip[it.slot] = it; p.bag[i] = old || null; this.recalcStats(); this.audio.clang(); this.refreshInv(); };
    this.ui.refreshInventory(p, {
      equip,
      unequip: (s) => { const k = p.bag.indexOf(null); if (k < 0) { this.ui.toast('Your pack is full'); return; } p.bag[k] = p.equip[s]; p.equip[s] = null; this.recalcStats(); this.refreshInv(); },
      price: (it) => sellPrice(it),
      sell: (i) => { p.gold += sellPrice(p.bag[i]); p.bag[i] = null; this.audio.gold(); this.refreshInv(); },
      salvage: (i) => { const g = SALVAGE[p.bag[i].rarity] || SALVAGE.common; p.mats ||= {}; for (const k in g) p.mats[k] = (p.mats[k] || 0) + g[k]; p.bag[i] = null; this.audio.clang(); this.ui.toast('Salvaged: ' + Object.entries(g).map(([k, v]) => `${v} ${MAT_NAMES[k]}`).join(', ')); this.refreshInv(); },
      // an upgrade arrow on pack items that beat what is worn in that slot
      better: (it) => { const c = p.equip[it.slot]; if (it.cls && it.cls !== p.cls) return false; if (!c) return true; return it.min ? (it.min + it.max) > (c.min + c.max) : (it.armor || 0) > (c.armor || 0); },
    });
  }

  // ------------------------------------------------------------------ skills
  useSkill(slot) {
    const p = this.player; if (p.dead || !this.started || this.paused) return;
    const S = this.slotDefs()[slot]; if (!S || slot === 'attack') return;
    if ((p.cds[slot] || 0) > 0) return;
    if (p.mp < S.mana) { this.ui.toast('Not enough ' + this.kit.resource.toLowerCase()); this.audio.denied?.(); return; }
    if (slot === 'potion') {
      if (p.potions <= 0) { this.ui.toast('No sherbet left'); return; }
      p.potions--; p.buffs.heal = 1.2; this.audio.potion(); this.onPotion?.();
      this.fx.burst(tmp.copy(p.pos).setY(p.pos.y + 1), 24, { speed: 1.5, life: 1, size: 0.2, size1: 0.02, color: new THREE.Color(2, 0.3, 0.4), up: 2 });
    } else if (slot === 'dodge') {
      if (p.rollT > 0 || p.dashT > 0) return;
      let dir;
      if (this.joy && Math.hypot(this.joy.x, this.joy.y) > 0.2) dir = new THREE.Vector3(this.joy.x, 0, this.joy.y);
      else if (p.vel && Math.hypot(p.vel.x, p.vel.z) > 1) dir = new THREE.Vector3(p.vel.x, 0, p.vel.z);
      else if (!this.isTouch) { const g = this.groundPoint(); dir = new THREE.Vector3(g.x - p.pos.x, 0, g.z - p.pos.z); }
      if (!dir || dir.lengthSq() < 0.01) dir = new THREE.Vector3(-Math.sin(p.facing), 0, -Math.cos(p.facing));
      dir.normalize(); p.rollDir = dir; p.rollT = 0.42; p.rollAge = 0; p.invuln = Math.max(p.invuln, 0.34); p.st.action = null; p.whirlT = 0;
      p.facing = Math.atan2(dir.x, dir.z); this.audio.whoosh(); this.fx.dust(p.pos, 8, 0.9);
      this.stats.dodges = (this.stats.dodges || 0) + 1; p.mp -= S.mana; p.cds[slot] = S.cd; this.onEvade?.(); return;
    } else { p.atkTarget = null; p.pendingHit = null; if (S.use(this, p) === false) return; }
    p.mp -= S.mana; p.cds[slot] = S.cd * (slot === 'potion' ? 1 : 1 - Math.min(50, p.stats.cdr || 0) / 100);
    if (p.buffs.stealth > 0 && slot !== 's3' && slot !== 'potion' && slot !== 'dodge') p.buffs.stealth = Math.min(p.buffs.stealth, 0.3);
  }

  // a glint on the attacker's blade as a melee blow winds up: the cue for a parry
  telegraphTell(e) {
    const h = tmp.copy(e.pos).setY(e.pos.y + 1.7 * (e.elite ? 1.3 : 1));
    this.fx.glow.spawn({ pos: { x: h.x, y: h.y, z: h.z }, life: 0.35, size: 0.9, size1: 0.1, color: new THREE.Color(3.2, 2.6, 1.6) });
  }
  // nearest live foe to the cursor, else to the hero
  pickTarget(r) {
    const p = this.player;
    if (this.hover && !this.hover.dead && this.hover.pos.distanceTo(p.pos) < r) return this.hover;
    if (p.target && !p.target.dead && p.target.pos.distanceTo(p.pos) < r) return p.target;
    let best = null, bd = r;
    for (const e of this.enemies) { if (e.dead || e.hidden) continue; const d = e.pos.distanceTo(p.pos); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  // camera impulse in world space (decays in updateCamera)
  impulse(dir, k) { this.camKick = this.camKick || new THREE.Vector3(); this.camKick.addScaledVector(dir, k); }

  playerShot(dir, o) {
    const p = this.player;
    const from = p.pos.clone(); from.y += 1.35; from.addScaledVector(dir, 0.6);
    let m;
    if (o.kind === 'fire') m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.3), toneMapped: false }));
    else if (o.kind === 'knife') m = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.3, 4).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 1, roughness: 0.25 }));
    else m = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.85, 4).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x4a3420, emissive: o.glow ? 0x806040 : 0 }));
    m.position.copy(from); m.lookAt(from.clone().add(dir)); this.scene.add(m);
    this.projectiles.push({ mesh: m, vel: dir.clone().multiplyScalar(o.speed || 28), grav: 0, life: o.life ?? 0.75, owner: 'player', kind: 'pshot', o, hit: new Set(), pierce: o.pierce || 0 });
  }

  // lingering ground effects: fire pools, caltrops, smoke clouds
  spawnZone(z) {
    z.t = 0; z.tick = 0; z.kind2 = z.kind; z.pos = z.pos.clone();
    if (z.kind === 'fire') {
      const gm = new THREE.MeshBasicMaterial({ map: glowDecal(), color: new THREE.Color(2.5, 0.8, 0.15), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      z.mesh = new THREE.Mesh(new THREE.PlaneGeometry(z.r * 2.2, z.r * 2.2).rotateX(-Math.PI / 2), gm); z.mesh.position.copy(z.pos).setY(z.pos.y + 0.06);
      this.decal(z.pos, z.r * 2, 'scorch');
    } else if (z.kind === 'caltrops') {
      const g = new THREE.Group(), mm = new THREE.MeshStandardMaterial({ color: 0x8a8e94, metalness: 0.9, roughness: 0.45 });
      const geo = new THREE.TetrahedronGeometry(0.09);
      for (let i = 0; i < 36; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * z.r; const c = new THREE.Mesh(geo, mm); c.position.set(z.pos.x + Math.cos(a) * r, 0, z.pos.z + Math.sin(a) * r); c.position.y = heightAt(c.position.x, c.position.z) + 0.05; c.rotation.set(Math.random() * 6, Math.random() * 6, 0); g.add(c); }
      z.mesh = g;
    }
    if (z.mesh) this.scene.add(z.mesh);
    this.hazards.push({ ...z, kind: 'zone' });
  }

  throwFlask(from, to) {
    const jar = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8).scale(1, 1.3, 1), new THREE.MeshStandardMaterial({ color: 0x7a3d1e, roughness: 0.6, emissive: 0xff5010, emissiveIntensity: 0.4 }));
    jar.position.copy(from); this.scene.add(jar);
    const T = 0.55, vel = new THREE.Vector3((to.x - from.x) / T, 0, (to.z - from.z) / T);
    vel.y = (to.y - from.y + 0.5 * 22 * T * T) / T;
    this.projectiles.push({ mesh: jar, vel, grav: 22, life: T, owner: 'player', kind: 'flask', target: to });
  }

  explodeFlask(pos) {
    this.audio.boom(); this.shake = Math.max(this.shake, 0.35);
    this.fx.flash(tmp.copy(pos).setY(pos.y + 1.5), 0xff7a30, 80, 0.5, 16);
    this.fx.ring(pos, new THREE.Color(4, 1.6, 0.4), 0.5, 4.2, 0.45);
    this.fx.burst(tmp.copy(pos).setY(pos.y + 0.5), 60, { speed: 7, life: 0.7, size: 0.9, size1: 0.1, color: new THREE.Color(3, 1.1, 0.25), up: 2, drag: 2.5 });
    this.fx.burst(tmp.copy(pos).setY(pos.y + 0.5), 20, { speed: 3, life: 2, size: 1.2, size1: 3.5, color: new THREE.Color(0.1, 0.08, 0.07), alpha: 0.5, up: 2, smoke: true, drag: 1 });
    this.fx.sparks(tmp.copy(pos).setY(pos.y + 0.5), new THREE.Color(5, 2.5, 0.6));
    for (const e of this.enemies) if (!e.dead && !e.hidden && e.pos.distanceTo(pos) < 3.6 + e.radius) { const r = this.rollDamage(1.8, true); this.damageEnemy(e, r.d, r.crit, pos, 'fire'); e.burn = 3; }
    this.decal(pos, 6.5, 'scorch');
    // lingering fire pool
    const gm = new THREE.MeshBasicMaterial({ map: glowDecal(), color: new THREE.Color(2.5, 0.8, 0.15), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5).rotateX(-Math.PI / 2), gm); decal.position.copy(pos).setY(pos.y + 0.06);
    this.scene.add(decal);
    const big = this.player.flags?.flaskBig; if (big) decal.scale.setScalar(1.4);
    this.hazards.push({ kind: 'firepool', pos: pos.clone(), r: big ? 4.2 : 3, t: 0, life: big ? 5 : 3.5, tick: 0, mesh: decal });
  }

  // ------------------------------------------------------------------ boss
  spawnBoss() {
    this.bossSpawned = true;
    const A = SITES.arch;
    const b = this.spawnPack(BOSS.type, A.x, A.z - 2, 1, BOSS.level, { spread: 0 })[0];
    b.st.action = null; b.phase = 1; b.summoned = false; b.meteorCd = 6; b.volleyCd = 3; b.rise = 0; b.kit = BOSS;
    this.boss = b; b.quest = STORY.boss; b.alerted = true;
    if (this.director) this.director.play(SCENES.bossIntro(this, b, BOSS.intro)); else this.ui.banner(BOSS.banner[0], BOSS.banner[1], 4000);
    this.audio.roar(); this.shake = 0.8; this.bossActive = true;
    this.fx.flash(tmp.copy(b.pos).setY(4), 0xff6020, 60, 1.2, 30);
    for (let i = 0; i < 3; i++) this.fx.ring(b.pos, new THREE.Color(1.6, 0.6, 0.15), 1 + i, 6 + i * 2.5, 0.8 + i * 0.25, 0.8);
    // the boss light exists from the start (dark), so lighting it never recompiles the scene's shaders
    this.bossLight.intensity = 10;
    this.audio.setMusicIntensity(1);
  }
  onBossDeath(b) {
    this.ui.bossBar(null); this.bossActive = false;
    this.player.invuln = 8;
    for (const e of this.enemies) if (!e.dead && e.T.summoned) { e.hp = 0; this.killEnemy(e, b.pos); }
    for (const h of this.hazards) if (h.kind === 'telegraph') { this.scene.remove(h.ring, h.fill); h.onDone = null; h.t = h.life; }
    for (const q of this.projectiles) if (q.owner === 'enemy') q.life = 0;
    this.audio.setMusicIntensity(0);
    this.fx.flash(tmp.copy(b.pos).setY(4), 0xffa040, 300, 2.5, 50);
    for (let i = 0; i < 6; i++) setTimeout(() => { this.fx.ring(b.pos, new THREE.Color(4, 2, 0.5), 1, 14, 1.2); this.audio.boom(); this.shake = 0.6; }, i * 250);
    this.fx.burst(tmp.copy(b.pos).setY(4), 200, { speed: 10, life: 2, size: 0.8, size1: 0.05, color: new THREE.Color(4, 1.6, 0.4), up: 3, drag: 1.2 });
    const mins = Math.floor(this.t / 60), secs = Math.floor(this.t % 60);
    const win = () => this.ui.victory({ level: this.player.level, gold: this.player.gold, kills: this.kills || 0, time: `${mins}m ${String(secs).padStart(2, '0')}s` });
    // each region's last fight closes its act: the Sawad and the marshes travel on, al-Karkh ends the chronicle
    const ending = IS_SAWAD ? [SCENES.epilogue, 4, () => this.travel?.()] : IS_MARSH ? [SCENES.rawhFalls, 5, () => this.travel?.()] : [SCENES.finale, 6, win];
    if (this.director) setTimeout(() => this.director.play(ending[0](this, b)).then(() => { this.checkpoint(ending[1]); ending[2](); }), 1200);
    else { setTimeout(() => this.ui.banner('Victory', 'The Pages are recovered.', 5000), 2500); setTimeout(() => { this.checkpoint(ending[1]); ending[2](); }, 8000); }
    if (this.bossLight) setTimeout(() => { this.bossLight.intensity = 0; }, 2000);
  }

  bossAI(b, dt) {
    const p = this.player, d = b.pos.distanceTo(p.pos);
    if (b.rise < 1) { b.rise = Math.min(1, b.rise + dt * 0.5); if (!b.st.action) { b.st.action = 'command'; b.st.actionT = 0; } b.st.actionT = b.rise; if (b.rise >= 1) b.st.action = null; return; }
    this.ui.bossBar(b.name, b.hp / b.maxHp);
    if (this.bossLight) this.bossLight.position.set(b.pos.x, b.pos.y + 5, b.pos.z);
    const face = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
    b.facing += angDiff(b.facing, face) * Math.min(1, dt * 3);
    if (b.st.action) {
      // a cutscene can hand him an action (his roar) without a duration: never let that freeze him
      if (!(b.actionDur > 0) || !Number.isFinite(b.st.actionT)) { b.actionDur = 1.2; b.st.actionT = Number.isFinite(b.st.actionT) ? b.st.actionT : 0; }
      b.st.actionT += dt / b.actionDur;
      if (b.st.action === 'slam' && b.st.actionT > 0.55 && !b.didHit) {
        b.didHit = true;
        const c = b.slamPos;
        this.audio.boom(); this.shake = 0.7;
        this.fx.ring(c, new THREE.Color(2.2, 1.8, 1.2), 0.6, 4, 0.4);
        this.fx.sparks(tmp.copy(c).setY(c.y + 0.5), new THREE.Color(4, 3, 1.6));
        this.fx.dust(c, 20, 2);
        if (p.pos.distanceTo(c) < 3.4) this.damagePlayer(b.dmg * 1.4, c);
      }
      if (b.st.action === 'command' && b.st.actionT > 0.5 && !b.didHit) {
        b.didHit = true;
        const K = b.kit || BOSS;
        if (b.castKind === 'volley' && K.volley === 'stones') {
          // his slingers loose together: stones drop on and around the hero, each landing spot marked
          const n = b.phase >= 2 ? 7 : 5;
          for (let i = 0; i < n; i++) { const q = new THREE.Vector3(p.pos.x + (i ? rand(-5, 5) : 0), 0, p.pos.z + (i ? rand(-5, 5) : 0)); q.y = heightAt(q.x, q.z); this.lobStone(tmp.copy(b.pos).setY(b.pos.y + 2.6), q, b.dmg * 0.55, 1.0 + i * 0.1); }
          this.audio.whoosh();
        } else if (b.castKind === 'volley' && K.volley === 'arrows') {
          const n = b.phase >= 2 ? 9 : 6;
          for (let i = 0; i < n; i++) { const a = face + (i - (n - 1) / 2) * 0.16; this.shootArrow(b, new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), b.dmg * 0.45); }
        } else if (b.castKind === 'volley') {
          const n = b.phase >= 2 ? 7 : 5;
          for (let i = 0; i < n; i++) {
            const a = face + (i - (n - 1) / 2) * 0.22;
            this.fireball(tmp.copy(b.pos).setY(b.pos.y + 2.4), new THREE.Vector3(Math.sin(a), 0, Math.cos(a)));
          }
          this.audio.whoosh();
        } else if (b.castKind === 'meteor' && K.barrage === 'nets') {
          for (let i = 0; i < 3; i++) { const a = face + (i - 1) * 0.35; this.throwNet(b, new THREE.Vector3(Math.sin(a), 0, Math.cos(a))); }
        } else if (b.castKind === 'meteor' && K.barrage === 'firepots') {
          // naft pots thrown by his torch-bearers: marked circles that burn for a few seconds
          for (let i = 0; i < 6; i++) {
            const pos = new THREE.Vector3(p.pos.x + (i ? rand(-6, 6) : 0), 0, p.pos.z + (i ? rand(-6, 6) : 0)); pos.y = heightAt(pos.x, pos.z);
            this.telegraph(pos, 2.2, 1.1 + i * 0.15, () => { this.fx.flash(tmp.copy(pos).setY(pos.y + 1.5), 0xff6020, 20, 0.3, 10); this.audio.boom(); this.decal(pos, 4.4, 'scorch'); this.fires2.push({ pos: pos.clone(), r: 2.2, life: 4.5, t: 0, tick: 0, dmg: b.dmg * 0.3 }); });
          }
        } else if (b.castKind === 'meteor') {
          for (let i = 0; i < 9; i++) {
            const pos = new THREE.Vector3(p.pos.x + rand(-7, 7), 0, p.pos.z + rand(-7, 7)); if (i === 0) pos.set(p.pos.x, 0, p.pos.z);
            pos.y = heightAt(pos.x, pos.z);
            this.telegraph(pos, 2.6, 1.3 + i * 0.12, () => {
              this.fx.flash(tmp.copy(pos).setY(pos.y + 2), 0xff6020, 40, 0.4, 12);
              this.fx.burst(tmp.copy(pos).setY(pos.y + 0.3), 40, { speed: 6, life: 0.6, size: 0.7, size1: 0.1, color: new THREE.Color(3.5, 1.2, 0.25), up: 2, drag: 2 });
              this.fx.dust(pos, 8, 1.4); this.audio.boom(); this.shake = Math.max(this.shake, 0.3);
              this.decal(pos, 4, 'scorch');
              if (p.pos.distanceTo(pos) < 2.6) this.damagePlayer(b.dmg * 0.8, pos);
            }, true);
          }
        } else if (b.castKind === 'summon') {
          const guard = this.spawnPack((b.kit || BOSS).summon, b.pos.x, b.pos.z + 3, 4, b.level - 1, { spread: 6 });
          for (const i of guard) { i.alerted = true; i.T = { ...i.T, summoned: true }; this.fx.dust(i.pos, 10, 1.2); }
          this.audio.roar();
        }
      }
      if (b.st.actionT >= 1) b.st.action = null;
      return;
    }
    if (b.hp < b.maxHp * (b.kit?.phaseAt ?? 0.6) && b.phase < 2) { b.phase = 2; if (this.director) { this.director.play(SCENES.bossPhase(this, b, (this.player.enginesBurnt || 0) >= 3, b.kit?.phase)); return; } }
    b.volleyCd -= dt; b.meteorCd -= dt;
    if (!b.summoned && b.hp < b.maxHp * 0.4) { b.summoned = true; this.bossCast(b, 'summon'); return; }
    if (b.phase >= 2 && b.meteorCd <= 0 && !(IS_SAWAD && (this.player.enginesBurnt || 0) >= 3)) { b.meteorCd = b.kit?.barrage === 'nets' ? 7 : 9; this.bossCast(b, 'meteor'); return; }
    if (d < 5 && b.atkCd <= 0) {
      b.moving = false; b.st.action = 'slam'; b.st.actionT = 0; b.actionDur = 1.4; b.didHit = false; b.atkCd = 2.6;
      b.slamPos = tmp.copy(b.pos).addScaledVector(new THREE.Vector3(Math.sin(face), 0, Math.cos(face)), 2.2).clone();
      b.slamPos.y = heightAt(b.slamPos.x, b.slamPos.z);
      this.telegraph(b.slamPos, 3.2, 0.77, null);
      return;
    }
    if (b.volleyCd <= 0 && d < 24) { b.volleyCd = b.phase >= 2 ? 3.5 : 5; this.bossCast(b, 'volley'); return; }
    // drift towards the player
    b.moving = d > 3.5;
    if (b.moving) { const dir = tmp.copy(p.pos).sub(b.pos).setY(0).normalize(); b.pos.addScaledVector(dir, b.speed * dt); resolve(b.pos, b.radius); }
  }
  bossCast(b, kind) { b.moving = false; b.st.action = 'command'; b.castKind = kind; b.st.actionT = 0; b.actionDur = kind === 'volley' ? 1.1 : 1.6; b.didHit = false; }

  fireball(from, dir) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8).scale(1, 1.3, 1), new THREE.MeshStandardMaterial({ color: 0x7a3d1e, roughness: 0.6, emissive: 0xff5010, emissiveIntensity: 0.6 }));
    m.position.copy(from); this.scene.add(m);
    const v = dir.clone().multiplyScalar(12); v.y = -2.2;
    this.projectiles.push({ mesh: m, vel: v, grav: 0, life: 3, owner: 'enemy', kind: 'fireball', dmg: this.boss.dmg * 0.6 });
  }

  telegraph(pos, r, delay, onDone, meteor = false, friendly = false) {
    const mat = new THREE.MeshBasicMaterial({ color: friendly ? new THREE.Color(0.9, 0.8, 0.4) : new THREE.Color(1.1, 0.22, 0.05), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.92, r, 48).rotateX(-Math.PI / 2), mat);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(r, 48).rotateX(-Math.PI / 2), mat.clone());
    ring.position.copy(pos).setY(pos.y + 0.1); fill.position.copy(ring.position);
    this.scene.add(ring, fill);
    this.hazards.push({ kind: 'telegraph', ring, fill, t: 0, life: delay, onDone, meteor, friendly, pos: pos.clone() });
  }

  // ------------------------------------------------------------------ NPC
  addNpc() {
    const npc = humanoid({ robe: '#e6dcc4', robe2: '#2a6a5a', turban: 0x2a7a6a, beard: 0xd8d0c0, beardLen: 1, weapon: null, skin: 0x9a6a48, sash: 0x2a6a5a, build: 0.92, belly: 0.25, tiraz: true, detail: 'hi' });
    const [x, z] = HUB.ishaq; npc.position.set(x, heightAt(x, z), z); npc.rotation.y = 0.6;
    this.scene.add(npc); this.npc = npc; this.npcSt = { phase: 0, walkBlend: 0, action: null, actionT: 0, hitT: 0 };
    const ishaq = { rig: npc, st: this.npcSt, name: 'Ishaq', pos: npc.position, talk: () => this.talkToNpc() };
    this.npcs.push(ishaq); this.interactables.push({ pos: npc.position, r: 3.2, label: 'Talk to Ishaq', act: () => ishaq.talk(), npc: ishaq });
    // astrolabe in hand
    const ast = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 6, 24), new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 1, roughness: 0.3 }));
    npc.userData.parts.handL.add(ast); ast.position.y = -0.12;
    const mark = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshStandardMaterial({ color: 0xffd060, emissive: 0xffa020, emissiveIntensity: 1.2, metalness: 0.8, roughness: 0.3 }));
    mark.position.y = 2.6; npc.add(mark); this.npcMark = mark;
  }
  addAmbientLife() {
    this.critters = [];
    const add = (rig, x, z, kind, opts = {}) => {
      const pos = new THREE.Vector3(x, heightAt(x, z), z);
      rig.position.copy(pos); this.scene.add(rig);
      this.critters.push({ rig, pos, home: pos.clone(), kind, st: { phase: 0, walkBlend: 0, action: null, actionT: 0, hitT: 0, seed: Math.random() * 10, graze: kind === 'camel' }, facing: Math.random() * 6, wanderT: 0, range: opts.range || 6, speed: opts.speed || 1.2 });
    };
    const V0 = SITES.village;
    const camels = IS_SAWAD ? [[30, 66, 0xb88a58], [33, 70, 0xa07040], [-8, 40, 0xc49a68], [70, 22, 0x9a6a3a], [74, 18, 0xb08050]] : IS_KARKH ? [[V0.x + 9, V0.z - 9, 0xb88a58], [V0.x + 12, V0.z - 6, 0xa07040]] : [];
    for (const [x, z, c] of camels) add(camel(c), x, z, 'camel', { range: 4, speed: 0.9 });
    const garb = [['#e8dcc0', '#2a6a5a', 0xf0ead8], ['#6a3a2a', '#d0a040', 0x2a2420], ['#2a4a6a', '#e0c070', 0xe8e0d0], ['#8a6a3a', '#3a2a1a', 0x6a3020]];
    const V = SITES.village;
    for (let i = 0; i < 6; i++) {
      const [r1, r2, tb] = garb[i % garb.length];
      add(humanoid({ robe: r1, robe2: r2, turban: tb, weapon: null, beard: i % 2 ? 0x2a1a10 : null, skin: [0xa8714a, 0x8a5a3a, 0xb88a60][i % 3] }), V.x + rand(-12, 12), V.z + (IS_SAWAD ? rand(-6, 22) : rand(-8, 10)), 'villager', { range: IS_SAWAD ? 8 : 6, speed: 1.3 });
    }
  }
  updateAmbientLife(dt) {
    if (!this.critters) return;
    const p = this.player.pos;
    for (const c of this.critters) {
      const d = c.pos.distanceTo(p); if (c.kind !== 'camel') setCharLOD(c.rig, d > 15 && !this.cinematic); c.rig.visible = this.cinematic || Math.abs(c.pos.x - p.x) < 32 && c.pos.z - p.z > -38 && c.pos.z - p.z < 22; if (d > 50) continue;
      c.wanderT -= dt;
      if (c.wanderT <= 0) { c.wanderT = rand(4, 10); c.goal = Math.random() < 0.5 ? null : c.home.clone().add(new THREE.Vector3(rand(-c.range, c.range), 0, rand(-c.range, c.range))); }
      let moving = false;
      if (c.goal) {
        const dx = c.goal.x - c.pos.x, dz = c.goal.z - c.pos.z, dd = Math.hypot(dx, dz);
        if (dd > 0.4) { c.pos.x += dx / dd * c.speed * dt; c.pos.z += dz / dd * c.speed * dt; moving = true; c.facing += angDiff(c.facing, Math.atan2(dx, dz)) * Math.min(1, dt * 3); }
        else c.goal = null;
      }
      resolve(c.pos, c.kind === 'camel' ? 1.0 : 0.4);
      c.pos.y = heightAt(c.pos.x, c.pos.z);
      c.st.walkBlend = THREE.MathUtils.lerp(c.st.walkBlend, moving ? (c.kind === 'camel' ? 1 : 0.5) : 0, Math.min(1, dt * 5));
      c.st.phase += dt * (moving ? c.speed * 2.6 : 0); c.st.graze = c.kind === 'camel' && !moving;
      c.rig.position.copy(c.pos);
      if (c.kind === 'camel') { c.rig.rotation.y = c.facing - Math.PI / 2; animateCamel(c.rig, c.st, this.t); }
      else { c.rig.rotation.y = c.facing; animateHumanoid(c.rig, c.st, this.t, dt); }
    }
  }
  talkToNpc() {
    const lines = ISHAQ_TALK;
    let i = 0;
    const next = () => { if (i < lines.length) this.ui.dialog('Ishaq', lines[i++], next); };
    next();
    if (this.npcMark) this.npcMark.visible = false;
  }

  // ------------------------------------------------------------------ update loop
  update(dt) {
    if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.1; }
    if (this.slowMo > 0) { this.slowMo -= dt; dt *= 0.35; }
    this.t += dt; this.frameN = (this.frameN || 0) + 1;
    const p = this.player;
    if (this.started) this.pickHover();
    this.pad?.update();
    // tap-to-toggle attack mode: keep swinging at the nearest foe until toggled off
    if (this.autoAttack && !p.dead && !p.target) { const e = this.pickTarget(9); if (e) p.target = e; }
    if (this.started && this.lmb && !p.dead && !this.ui.dialogOpen) {
      if (this.hover && !p.target) p.target = this.hover;
      if (!p.target && !p.pickup) this.setMoveTarget();
    }
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateHazards(dt);
    this.updateDrops(dt);
    this.updateDecals(dt);
    this.updateAmbientLife(dt);
    this.updateCamera(dt);
    this.zones?.update(dt); this.hubTick?.(dt); this.tickExtra?.(dt);
    // listener rides the hero; the suq crowd swells near the square, drips and draughts underground
    this.audio.setListener?.(p.pos);
    this.ambT = (this.ambT || 0) - dt;
    if (this.ambT <= 0) { this.ambT = 0.5; const V = SITES.village, dv = Math.hypot(p.pos.x - V.x, p.pos.z - V.z); this.audio.setAmbience?.(this.interior ? 0 : Math.max(0, Math.min(1, (40 - dv) / 25)), this.interior ? 1 : 0); }
    if (this.started) this.updateOccluders(); else this.occU.uHole.value.set(-9999, -9999);
    if (this.npc) {
      animateHumanoid(this.npc, this.npcSt, this.t, dt);
      if (this.npcMark) { this.npcMark.rotation.y += dt * 2; this.npcMark.position.y = 2.6 + Math.sin(this.t * 3) * 0.1; }
    }
    // music: Bayati combat layer while foes are close and alert
    this.musicT = (this.musicT || 0) - dt;
    if (this.musicT <= 0) {
      this.musicT = 1;
      const fight = this.bossActive || this.enemies.some((e) => !e.dead && e.alerted && e.pos.distanceTo(p.pos) < 16);
      if (fight !== this.inFight) { this.inFight = fight; this.audio.setMusicIntensity(fight ? 1 : 0); }
    }
    // UI
    this.ui.setOrbs(p.hp, p.stats.maxHp, p.mp, p.stats.maxMp, this.t);
    this.ui.setXP(p.xp / this.xpFor(p.level), p.level);
    const defs = this.slotDefs();
    this.ui.setSkill('attack', 0, true);
    for (const k in defs) if (k !== 'attack') this.ui.setSkill(k, Math.max(0, (p.cds[k] || 0) / defs[k].cd), p.mp >= defs[k].mana, k === 'potion' ? p.potions : null);
    const tgt = this.hover || (this.lastTargetT > 0 && !this.lastTarget?.dead ? this.lastTarget : null);
    this.lastTargetT -= dt;
    if (tgt && !tgt.boss) this.ui.showTarget(tgt.name + (tgt.level ? `  ·  Lv ${tgt.level}` : ''), tgt.hp / tgt.maxHp, tgt.elite ? 'elite' : ''); else this.ui.hideTarget();
    const buffs = []; if (p.buffs.ward > 0) buffs.push({ icon: 'wall', t: p.buffs.ward }); if (p.whirlT > 0) buffs.push({ icon: 'whirl', t: p.whirlT }); if (p.buffs.stealth > 0) buffs.push({ icon: 'vanish', t: p.buffs.stealth });
    this.ui.buffs(buffs);
    this.ui.updateWorld(this.camera, dt, this.keys['alt']);
    this.ui.enemyBars(this.enemies, this.camera);
    this.minimapT = (this.minimapT || 0) - dt;
    if (this.minimapT <= 0) { this.minimapT = 0.1; this.ui.drawMinimap(p.pos, this.enemies, this.drops, this.pois); }
    this.marker.material.opacity = Math.max(0, this.marker.material.opacity - dt * 2.5);
    this.marker.scale.setScalar(Math.max(0.6, this.marker.scale.x - dt * 3));
    this.grade && (this.grade.uniforms.uLowHp.value = THREE.MathUtils.lerp(this.grade.uniforms.uLowHp.value, p.hp / p.stats.maxHp < 0.3 ? 1 : 0, dt * 3));
  }

  updatePlayer(dt) {
    const p = this.player, s = p.stats;
    for (const k in p.cds) p.cds[k] = Math.max(0, p.cds[k] - dt);
    for (const k in p.buffs) p.buffs[k] = Math.max(0, p.buffs[k] - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    if (!p.dead) {
      p.mp = Math.min(s.maxMp, p.mp + s.regen * dt);
      p.hp = Math.min(s.maxHp, p.hp + 0.6 * dt + (p.buffs.heal > 0 ? s.maxHp * 0.5 / 1.2 * dt : 0));
    }
    p.st.hitT = Math.max(0, p.st.hitT - dt * 3);
    let moving = false;
    // wading through marsh water slows the hero to a heavy stride
    const wet = waterDepth(p.pos.x, p.pos.z); p.wading = wet > 0.08;
    const speed = 6.4 * (1 + s.move / 100) * (p.whirlT > 0 ? 0.75 : 1) * (p.wading ? 0.62 : 1);
    if (p.dead) { p.st.deadT += dt; }
    else if (p.rollT > 0) {
      // evade: a low, quick roll with invulnerability frames; starting it as a blow lands is a parry
      p.rollT -= dt; p.rollAge += dt;
      const k = Math.max(0, p.rollT / 0.42);
      p.pos.addScaledVector(p.rollDir, (5 + 13 * k) * dt);
      p.st.crouch = Math.sin(Math.min(1, p.rollAge / 0.42) * Math.PI) * 0.9; p.st.fwdLean = 1;
      if (Math.random() < 0.5) this.fx.dust(p.pos, 1, 0.6);
      if (p.rollT <= 0) p.st.crouch = 0;
      moving = true;
    }
    else if (p.dashT > 0) {
      p.dashT -= dt;
      p.pos.addScaledVector(p.dashDir, (p.dashDmg ? 34 : 24) * dt);
      this.fx.dust(p.pos, 2, 0.8);
      if (p.dashDmg) this.fx.burst(tmp.copy(p.pos).setY(p.pos.y + 1), 4, { speed: 1, life: 0.4, size: 0.4, size1: 0.05, color: new THREE.Color(2.2, 1.6, 0.8) });
      if (p.dashDmg) for (const e of this.enemies) if (!e.dead && !e.hidden && !p.dashHit.has(e) && e.pos.distanceTo(p.pos) < 1.6 + e.radius) {
        p.dashHit.add(e); const r = this.rollDamage(p.dashDmg); this.damageEnemy(e, r.d, r.crit, p.pos, 'normal', { weight: 1.3, knock: 1.6, stagger: p.dashStagger ? 999 : undefined });
      }
      if (p.dashT <= 0) p.st.crouch = 0;
      moving = true;
    } else {
      // flurry: a burst of knife cuts on one foe
      if (p.flurry) {
        const f = p.flurry; f.t -= dt;
        if (f.e.dead || f.n <= 0) p.flurry = null;
        else if (f.t <= 0) { f.t = 0.09; f.n--; p.st.action = 'attack'; p.st.actionT = 0.45; p.actionDur = 0.2; p.hitApplied = true; this.slashTrail(); this.audio.swing(); const r = this.rollDamage(0.6); this.damageEnemy(f.e, r.d, r.crit, p.pos, 'normal', { weight: 0.25 }); }
      }
      // whirlwind
      if (p.whirlT > 0) {
        p.whirlT -= dt; p.whirlTick -= dt; p.st.action = 'spin';
        p.facing += dt * 18;
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 2.2;
          this.fx.smoke.spawn({ pos: { x: p.pos.x + Math.cos(a) * r, y: p.pos.y + Math.random() * 1.6, z: p.pos.z + Math.sin(a) * r }, vel: { x: -Math.sin(a) * 9, y: 1, z: Math.cos(a) * 9 }, life: 0.5, size: 0.8, size1: 1.6, color: new THREE.Color(0.8, 0.66, 0.48), alpha: 0.5, drag: 3 });
        }
        this.fx.burst(tmp.copy(p.pos).setY(p.pos.y + 1.1), 2, { speed: 6, life: 0.3, size: 0.12, size1: 0.02, color: new THREE.Color(3, 2.6, 1.6), drag: 3 });
        if (p.whirlTick <= 0) {
          p.whirlTick = 0.25; this.audio.swing();
          for (const e of this.enemies) if (!e.dead && !e.hidden && e.pos.distanceTo(p.pos) < (p.whirlPull ? 5 : 3.2) + e.radius) {
            if (p.whirlPull && !e.boss) e.pos.lerp(p.pos, 0.18);
            const r = this.rollDamage(0.65); this.damageEnemy(e, r.d, r.crit, p.pos);
          }
        }
        if (p.whirlT <= 0) p.st.action = null;
      }
      // target/attack
      let goal = null;
      // fluid combat: attacking no longer roots you. While attack is held (or auto-attack is on) the target is kept
      // and shots/swings fire as you steer; how freely you move mid-swing depends on the class (kit.mobility).
      const atkHeld = this.autoAttack || (this.t - (this.atkPressT ?? -9)) < 0.5;
      const joyOn = this.joy && Math.hypot(this.joy.x, this.joy.y) > 0.15;
      if (this.joy) { // virtual joystick: camera looks toward -z, so screen-up is -z
        if (!atkHeld) p.target = null; p.moveTo = null; p.pickup = null;
        if (joyOn) goal = { x: p.pos.x + this.joy.x * 3, y: p.pos.y, z: p.pos.z + this.joy.y * 3 };
        if (atkHeld && !p.target) { const e = this.pickTarget(this.kit.attack.kind === 'melee' ? 4 : this.kit.attack.range); if (e) p.target = e; }
      }
      if (p.target && (p.target.dead || p.target.hidden)) p.target = null;
      if (p.target) { const dd = p.pos.distanceTo(p.target.pos); if (dd < (p.tgtBest ?? 1e9) - 0.5) { p.tgtBest = dd; p.tgtStall = 0; } else p.tgtStall = (p.tgtStall || 0) + dt; if (p.tgtStall > 4 && dd > 3) { p.target = null; p.tgtStall = 0; p.tgtBest = undefined; } } else { p.tgtBest = undefined; p.tgtStall = 0; }
      const A = this.kit.attack;
      const steering = !!goal;
      if (p.target && p.whirlT <= 0 && !p.flurry) {
        const d = Math.hypot(p.target.pos.x - p.pos.x, p.target.pos.z - p.pos.z);
        const inRange = A.kind === 'melee' ? d <= A.range + p.target.radius + (steering ? 0.4 : 0) : (d <= A.range && navClear(p.pos.x, p.pos.z, p.target.pos.x, p.target.pos.z));
        if (inRange) {
          p.facing += angDiff(p.facing, Math.atan2(p.target.pos.x - p.pos.x, p.target.pos.z - p.pos.z)) * Math.min(1, dt * 20);
          if (!p.st.action) { p.st.action = A.kind === 'melee' ? 'attack' : A.action; p.st.actionT = 0; p.actionDur = A.dur / (1 + s.speed / 100); p.hitApplied = false; p.atkTarget = p.target; if (A.kind === 'melee') this.audio.swing(); }
        } else if (!steering) goal = p.target.pos;
      } else if (!goal && p.moveTo) goal = p.moveTo;
      // how freely the hero moves while an attack plays: ranged kits walk and shoot, heavy blades commit until the blow lands
      const acting = p.st.action === 'attack' || p.st.action === 'shoot' || p.st.action === 'throw' || p.st.action === 'cast';
      const mob = this.kit.mobility ?? (A.kind === 'melee' ? 0.5 : 0.85);
      let moveK = 1;
      if (acting) moveK = p.hitApplied ? 1 : mob;
      // moving cancels an attack's recovery once its blow has landed
      if (acting && p.hitApplied && steering && p.st.actionT > 0.6) p.st.action = null;
      if (p.pickup && this.drops.includes(p.pickup) && p.pos.distanceTo(p.pickup.to) < 1.5) { this.tryPickup(p.pickup); p.pickup = null; p.moveTo = null; }
      if (goal) goal = this.steer(p, goal);
      const want = tmp2.set(0, 0, 0);
      if (goal) {
        const dx = goal.x - p.pos.x, dz = goal.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.2) {
          const arrive = Math.min(1, d / 1.2); // ease into the destination instead of snapping
          want.set(dx / d, 0, dz / d).multiplyScalar(speed * (this.joy ? Math.min(1, Math.hypot(this.joy.x, this.joy.y) * 1.4) : Math.max(0.35, arrive)));
          // backpedalling while keeping the bow on a target is a little slower than walking forward
          const back = acting && p.target && (dx * Math.sin(p.facing) + dz * Math.cos(p.facing)) < 0 ? 0.8 : 1;
          want.multiplyScalar(moveK * back);
          // while shooting at a target, keep the bow on it (strafe/kite); otherwise face the way you walk
          if (p.whirlT <= 0 && !(acting && p.target)) p.facing += angDiff(p.facing, Math.atan2(dx, dz)) * Math.min(1, dt * 11);
        } else if (p.moveTo && Math.hypot(p.moveTo.x - p.pos.x, p.moveTo.z - p.pos.z) < 0.3) p.moveTo = null;
      }
      if (!p.vel) p.vel = new THREE.Vector3();
      const accel = want.lengthSq() > 0 ? 34 : 26;
      const prevYaw = p.prevFacing ?? p.facing;
      p.vel.x += THREE.MathUtils.clamp(want.x - p.vel.x, -accel * dt, accel * dt);
      p.vel.z += THREE.MathUtils.clamp(want.z - p.vel.z, -accel * dt, accel * dt);
      const vlen = Math.hypot(p.vel.x, p.vel.z);
      if (vlen > 0.05) { p.pos.x += p.vel.x * dt; p.pos.z += p.vel.z * dt; moving = vlen > 0.6; } else p.vel.set(0, 0, 0);
      // lean into turns (yaw rate) and forward into acceleration
      const yawRate = dt > 0 ? angDiff(prevYaw, p.facing) / dt : 0; p.prevFacing = p.facing;
      p.st.lean = THREE.MathUtils.lerp(p.st.lean || 0, p.whirlT > 0 ? 0 : THREE.MathUtils.clamp(yawRate * vlen / speed * 0.18, -0.5, 0.5), Math.min(1, dt * 8));
      p.st.fwdLean = THREE.MathUtils.lerp(p.st.fwdLean || 0, THREE.MathUtils.clamp(vlen / speed, 0, 1) * 0.6 + (want.length() - vlen) / speed * 0.5, Math.min(1, dt * 6));
      p.st.speedK = vlen / 6.4;
      // attack resolution
      if (p.st.action && p.st.action !== 'spin') {
        p.st.actionT += dt / p.actionDur;
        if (p.pendingHit && p.st.actionT > p.pendingHit.at) { const f = p.pendingHit.fn; p.pendingHit = null; f(); }
        if (!p.hitApplied && p.st.actionT > 0.55 && (p.st.action === 'attack' || ((p.st.action === 'shoot' || p.st.action === 'throw') && p.atkTarget))) {
          p.hitApplied = true;
          if (A.kind === 'melee') {
            this.slashTrail();
            const fwd = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
            for (const e of this.enemies) {
              if (e.dead || e.hidden) continue;
              const v = tmp.copy(e.pos).sub(p.pos).setY(0), d = v.length();
              if (d < A.reach + e.radius && v.normalize().dot(fwd) > A.arc) { const r = this.rollDamage(1); this.damageEnemy(e, r.d, r.crit, p.pos); }
            }
          } else if (p.atkTarget && !p.atkTarget.dead) {
            const t = p.atkTarget, dir = new THREE.Vector3(t.pos.x - p.pos.x, 0, t.pos.z - p.pos.z).normalize();
            this.playerShot(dir, { ...A.proj, weight: this.kit.weight });
            this.audio.whoosh();
          }
          p.atkTarget = null;
        }
        if (p.st.actionT >= 1) { p.st.action = null; }
      }
    }
    // walk-over pickup: gold, sherbet and anything better than common (white items wait for a tap)
    for (const d of this.drops) {
      if (d.t < 0.6 || d.noAuto || !(d.item.gold || d.item.potion || d.item.rarity !== 'common')) continue;
      if (p.pos.distanceTo(d.mesh.position) > 1.6) continue;
      if (!d.item.gold && !d.item.potion && p.bag.indexOf(null) < 0) { if (!d.fullWarned) { d.fullWarned = true; this.ui.toast('Pack full: salvage or sell to make room'); this.audio.denied?.(); } continue; }
      if (this.tryPickup(d)) break;
    }
    // a net pins the hero in place (he can still strike); an evade tears free at once
    if (p.netT > 0) {
      p.netT -= dt;
      if (p.rollT > 0 || p.dead) { p.netT = 0; this.fx.burst(tmp.copy(p.pos).setY(p.pos.y + 1), 12, { speed: 3, life: 0.5, size: 0.15, size1: 0.05, color: new THREE.Color(0.6, 0.5, 0.35) }); }
      else if (p.netPos) { p.pos.x = p.netPos.x; p.pos.z = p.netPos.z; }
    }
    this.netMesh.visible = p.netT > 0;
    if (this.netMesh.visible) { this.netMesh.position.set(p.pos.x, p.pos.y, p.pos.z); this.netMesh.rotation.y += dt * 0.5; this.netMesh.scale.setScalar(Math.min(1, 0.6 + p.netT)); }
    if (!this.interior) { p.pos.x = THREE.MathUtils.clamp(p.pos.x, -BOUND, BOUND); p.pos.z = THREE.MathUtils.clamp(p.pos.z, -BOUND, BOUND); }
    resolve(p.pos, 0.45);
    p.pos.y = heightAt(p.pos.x, p.pos.z);
    p.st.walkBlend = THREE.MathUtils.lerp(p.st.walkBlend, moving ? Math.min(1, (p.st.speedK ?? 1) * 1.1) : 0, Math.min(1, dt * 8));
    p.st.phase += dt * (p.dashT > 0 ? speed * 1.55 : Math.hypot(p.vel?.x || 0, p.vel?.z || 0) * 1.55);
    // footstep dust puffs
    if (moving && p.dashT <= 0) { const step = Math.floor(p.st.phase / Math.PI); if (step !== p.lastStep) { p.lastStep = step; const sf = this.surfaceAt(p.pos); if (sf === 'sand') this.fx.dust(tmp.copy(p.pos).add(new THREE.Vector3(0, 0.1, 0)), 2, 0.45); else if (p.wading) this.splash(p.pos); this.audio.step?.(sf, p.rollT > 0 ? 1.4 : 1); } }
    p.rig.position.copy(p.pos); p.rig.rotation.y = p.facing;
    CharLOD.center.copy(p.pos);
    animateHumanoid(p.rig, p.st, this.t, dt);
    this.pLight.position.set(p.pos.x, p.pos.y + 3, p.pos.z + 1);
    // whirl vortex
    const vu = this.vortex.material.uniforms; vu.uT.value = this.t;
    vu.uA.value = THREE.MathUtils.lerp(vu.uA.value, p.whirlT > 0 ? 1 : 0, Math.min(1, dt * 10));
    this.vortex.position.copy(p.pos); this.vortex.visible = vu.uA.value > 0.01;
    // ward visuals
    const w = p.buffs.ward > 0 ? Math.min(1, p.buffs.ward * 2) : 0;
    this.wardA = THREE.MathUtils.lerp(this.wardA || 0, w * 0.5, dt * 6);
    this.wardRings.forEach((r, i) => {
      r.material.opacity = this.wardA;
      r.position.set(p.pos.x, p.pos.y + 1.1, p.pos.z);
      r.rotation.set(this.t * (1.5 + i) + i, this.t * (1.1 - i * 0.3), 0);
    });
    if (p.buffs.ward > 0) {
      p.wardTick -= dt;
      if (p.wardTick <= 0) {
        p.wardTick = 1;
        this.fx.ring(p.pos, new THREE.Color(3, 2.2, 0.8), 0.5, 4.2, 0.5, 0.7);
        for (const e of this.enemies) if (!e.dead && !e.hidden && e.pos.distanceTo(p.pos) < 4.2) { const r = this.rollDamage(0.45); this.damageEnemy(e, r.d, r.crit, p.pos); }
      }
    }
    // boss trigger
    if (!this.bossSpawned && !this.quests.find((q) => q.id === STORY.boss)?.done && Math.hypot(p.pos.x - SITES.arch.x, p.pos.z - SITES.arch.z) < 24) this.spawnBoss();
  }

  // Follow an A* path when the straight line to the goal is blocked.
  steer(ent, goal) {
    const pos = ent.pos;
    if (navClear(pos.x, pos.z, goal.x, goal.z)) { ent.path = null; return goal; }
    ent.pathT = (ent.pathT || 0) - 1;
    const moved = !ent.pathGoal || Math.hypot(ent.pathGoal.x - goal.x, ent.pathGoal.z - goal.z) > 1.5;
    if (!ent.path || moved || ent.pathT <= 0) {
      ent.path = findPath(pos, goal, ent === this.player ? 80000 : 5000); ent.pathGoal = { x: goal.x, z: goal.z }; ent.pathT = ent === this.player ? 40 : 30 + Math.random() * 20;
    }
    if (!ent.path || !ent.path.length) return goal;
    while (ent.path.length > 1 && Math.hypot(ent.path[0].x - pos.x, ent.path[0].z - pos.z) < 0.6) ent.path.shift();
    const w = ent.path[0];
    return { x: w.x, z: w.z, y: goal.y };
  }

  slashTrail() {
    const p = this.player;
    if (!this.slashMat) {
      this.slashMat = new THREE.ShaderMaterial({
        uniforms: { uA: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
        vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: `uniform float uA; varying vec3 vP;
          void main(){
            float r = length(vP.xy); float a = atan(vP.y, vP.x);
            float k = clamp((a + 1.41) / 2.83, 0.0, 1.0);            // 0 = tail, 1 = leading edge
            float band = smoothstep(1.15, 2.0, r) * smoothstep(2.35, 2.05, r);
            float edge = smoothstep(2.0, 2.18, r) * smoothstep(2.35, 2.2, r);
            float alpha = (band * 0.45 + edge * 1.2) * pow(k, 1.6) * uA;
            vec3 col = mix(vec3(1.0,0.75,0.4), vec3(1.6,1.5,1.3), edge);
            gl_FragColor = vec4(col * alpha, alpha);
          }`,
      });
    }
    const g = new THREE.RingGeometry(1.1, 2.35, 40, 1, -Math.PI * 0.45, Math.PI * 0.9);
    const m = this.slashMat.clone();
    const mesh = new THREE.Mesh(g, m);
    mesh.rotation.set(-Math.PI / 2, 0, 0);
    const grp = new THREE.Group(); grp.add(mesh); grp.position.set(p.pos.x, p.pos.y + 1.1, p.pos.z);
    grp.rotation.y = p.facing - Math.PI / 2;
    grp.rotateZ(0.18);
    this.scene.add(grp);
    this.trails.push({ obj: grp, t: 0, life: 0.2 });
  }

  updateEnemies(dt) {
    const p = this.player;
    // attack tokens: only the nearest few melee foes press in; the others circle at a distance and look for the flank
    const melee = this.enemies.filter((e) => !e.dead && !e.hidden && e.alerted && !e.boss && !e.T.ranged && e.riseT >= 1);
    melee.sort((a, b) => a.pos.distanceToSquared(p.pos) - b.pos.distanceToSquared(p.pos));
    melee.forEach((e, i) => { e.token = i < MAX_TOKENS; e.ringSlot = i; });
    const stealthed = p.buffs.stealth > 0;
    for (const e of this.enemies) {
      const dist = e.pos.distanceTo(p.pos);
      // only rigs inside the top-down view (plus a margin) are drawn and skinned
      const vdx = Math.abs(e.pos.x - p.pos.x), vdz = e.pos.z - p.pos.z;
      e.rig.visible = vdx < 30 * this.camZoom && vdz > -36 * this.camZoom && vdz < 20 || (e.boss && dist < 60);
      if (e.rig.visible) setCharLOD(e.rig, dist > 15 && !this.cinematic);
      if (e.dead) {
        e.st.deadT += dt; e.deadT += dt;
        this.animEnemy(e, dt, dist);
        if (e.deadT > 5) { e.rig.position.y -= dt * 0.4; }
        if (e.deadT > 8) { this.scene.remove(e.rig); e.removed = true; }
        continue;
      }
      if (dist > 70) continue;
      e.atkCd -= dt; e.st.hitT = Math.max(0, e.st.hitT - dt * 4);
      // hit flash
      if (e.flash > 0) { e.flash = Math.max(0, e.flash - dt * 6); e.mats.forEach((m, i) => m.emissive.copy(e.baseEmissive[i]).lerp(new THREE.Color(1, 0.55, 0.3), e.flash * 0.35)); }
      if (e.burn > 0) {
        e.burn -= dt; e.burnTick = (e.burnTick || 0) - dt;
        if (Math.random() < 0.5) this.fx.fire(tmp.copy(e.pos).setY(e.pos.y + 0.6), 0.5);
        if (e.burnTick <= 0) { e.burnTick = 0.5; const r = this.rollDamage(0.15, true); this.damageEnemy(e, r.d, false, e.pos, 'dot'); if (e.dead) continue; }
      }
      if (e.aura) { e.aura.rotation.y += dt; e.aura.material.opacity = 0.4 + Math.sin(this.t * 4) * 0.2; }
      // ambushers spring up
      if (e.hidden) {
        if (dist < 13) { e.hidden = false; e.riseT = 0; e.alerted = true; this.fx.dust(e.pos, 14, 1.2); this.audio.at(e.pos, () => this.audio.grunt()); }
        else { e.st.crouch = 1; e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; this.animEnemy(e, dt, dist); continue; }
      }
      if (e.riseT < 1) {
        e.riseT = Math.min(1, e.riseT + dt * 3.0);
        e.st.crouch = 1 - e.riseT; e.rig.position.copy(e.pos);
        this.animEnemy(e, dt, dist);
        continue;
      }
      if (e.boss) { this.bossAI(e, dt); e.pos.y = heightAt(e.pos.x, e.pos.z); e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend, e.moving ? 1 : 0, Math.min(1, dt * 6)); e.st.phase += dt * (e.moving ? e.speed * 1.2 : 0); animateHumanoid(e.rig, e.st, this.t, dt); continue; }
      e.lost = Math.max(0, (e.lost || 0) - dt);
      if (!e.alerted && !e.lost && dist < (stealthed ? 2.5 : e.T.ranged ? 16 : 13) && !p.dead) e.alerted = true;
      if (stealthed && e.alerted && dist > 4 && !e.boss) { e.alerted = false; e.lost = 1; }
      let moving = false;
      const slow = e.slowT > 0 ? 1 - e.slowK : 1; e.slowT = Math.max(0, (e.slowT || 0) - dt);
      if (e.knock && e.knock.lengthSq() > 0.0001) { e.pos.addScaledVector(e.knock, dt); e.knock.multiplyScalar(Math.max(0, 1 - dt * 10)); }
      if (e.staggerT > 0) {
        // reeling: no attacks, stumble, open to heavy hits
        e.staggerT -= dt; e.st.hitT = Math.max(e.st.hitT, 0.8); e.st.action = null;
        if (Math.random() < 0.08) this.fx.burst(tmp.copy(e.pos).setY(e.pos.y + 2.1), 1, { speed: 1, life: 0.6, size: 0.12, size1: 0.02, color: new THREE.Color(2.5, 2.2, 1.2), up: 0.5 });
        if (e.staggerT <= 0) e.staggerT = 0;
      } else if (e.st.action) {
        e.st.actionT += dt / e.T.atk * 1.6;
        if (!e.didHit && e.st.actionT > 0.6) {
          e.didHit = true;
          if (e.T.ranged === 'stone') { const q = p.pos.clone().addScaledVector(p.vel || tmp.set(0, 0, 0), 0.5); q.y = heightAt(q.x, q.z); this.lobStone(tmp.copy(e.pos).setY(e.pos.y + 2.2), q, e.dmg, 0.95); }
          else if (e.T.ranged === 'net') this.throwNet(e, tmp.copy(p.pos).sub(e.pos).setY(0).normalize().clone());
          else if (e.T.ranged) this.shootArrow(e);
          else if (dist < e.range + 0.9 && !p.dead) this.damagePlayer(e.dmg, e.pos, e);
        }
        if (e.st.actionT >= 1) e.st.action = null;
      } else if (e.alerted && !p.dead) {
        const face = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
        e.facing += angDiff(e.facing, face) * Math.min(1, dt * 8);
        // where this foe wants to stand
        let want = null;
        if (e.T.ranged) {
          // archers hold 8–13 m, backing off from a closing hero and side-stepping to keep a clear line
          const [h0, h1] = e.T.hold || [7.5, 13];
          if (dist > h1 || !navClear(e.pos.x, e.pos.z, p.pos.x, p.pos.z)) want = p.pos;
          else if (dist < h0) { const away = tmp.copy(e.pos).sub(p.pos).setY(0).normalize(); want = { x: e.pos.x + away.x * 4 + away.z * (e.ringSlot % 2 ? 2 : -2), z: e.pos.z + away.z * 4 - away.x * (e.ringSlot % 2 ? 2 : -2) }; }
        } else if (!e.token) {
          // no token: orbit at 4.5 m, spread around the hero, drifting toward the hero's back
          const back = p.facing + Math.PI, n = Math.max(1, melee.length - MAX_TOKENS);
          const slot = (e.ringSlot - MAX_TOKENS) / n - 0.5;
          const a = back + slot * 2.6 + Math.sin(this.t * 0.4 + e.ringSlot) * 0.25;
          want = { x: p.pos.x + Math.sin(a) * 4.5, z: p.pos.z + Math.cos(a) * 4.5 };
        } else if (dist > e.range) {
          // token holder: approach, angled toward the flank when others already engage the front
          const flank = (e.ringSlot % 2 ? 1 : -1) * Math.min(1, e.ringSlot) * 1.4;
          want = { x: p.pos.x + Math.cos(p.facing) * flank, z: p.pos.z - Math.sin(p.facing) * flank };
        }
        if (want && Math.hypot(want.x - e.pos.x, want.z - e.pos.z) > 0.5) {
          const wp = this.steer(e, want);
          const dir = tmp.set(wp.x - e.pos.x, 0, wp.z - e.pos.z).normalize();
          const sp = (e.token || e.T.ranged ? e.speed : e.speed * 0.6) * slow * (IS_MARSH && waterDepth(e.pos.x, e.pos.z) > 0.08 ? 0.65 : 1);
          e.pos.addScaledVector(dir, sp * dt); moving = true;
          if (e.path || dist > 6) e.facing += angDiff(e.facing, Math.atan2(dir.x, dir.z)) * Math.min(1, dt * 8);
        } else if (e.atkCd <= 0 && (e.T.ranged || (e.token && dist <= e.range + 0.4))) {
          e.st.action = e.T.action; e.st.actionT = 0; e.didHit = false; e.atkCd = e.T.atk * rand(0.9, 1.3);
          if (!e.T.ranged) this.telegraphTell?.(e);
        }
      } else if (!e.alerted) {
        // idle wander near home
        e.wanderT = (e.wanderT || 0) - dt;
        if (e.wanderT <= 0) { e.wanderT = rand(3, 7); e.wander = e.home.clone().add(new THREE.Vector3(rand(-3, 3), 0, rand(-3, 3))); }
        if (e.wander) {
          const dx = e.wander.x - e.pos.x, dz = e.wander.z - e.pos.z, d = Math.hypot(dx, dz);
          if (d > 0.3) { e.pos.x += dx / d * 1.2 * dt; e.pos.z += dz / d * 1.2 * dt; e.facing += angDiff(e.facing, Math.atan2(dx, dz)) * Math.min(1, dt * 4); moving = true; e.slowWalk = true; }
        }
      }
      // separation
      for (const o of this.enemies) {
        if (o === e || o.dead || o.hidden) continue;
        const dx = e.pos.x - o.pos.x, dz = e.pos.z - o.pos.z, d = Math.hypot(dx, dz), m = e.radius + o.radius;
        if (d < m && d > 0.001) { e.pos.x += dx / d * (m - d) * 0.5; e.pos.z += dz / d * (m - d) * 0.5; }
      }
      { const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz), m = e.radius + 0.45; if (d < m && d > 0.001) { e.pos.x += dx / d * (m - d); e.pos.z += dz / d * (m - d); } }
      if (e.alerted && !e.boss && e.pos.distanceTo(e.home) > 34) { e.alerted = false; e.wander = e.home.clone(); e.wanderT = 6; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.5); }
      if (!e.interior) { e.pos.x = THREE.MathUtils.clamp(e.pos.x, -BOUND, BOUND); e.pos.z = THREE.MathUtils.clamp(e.pos.z, -BOUND, BOUND); }
      resolve(e.pos, e.radius);
      e.pos.y = heightAt(e.pos.x, e.pos.z);
      e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend, moving ? (e.alerted ? 1 : 0.5) : 0, Math.min(1, dt * 8));
      e.st.phase += dt * (moving ? (e.alerted ? e.speed : 1.2) * 1.6 : 0);
      e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing;
      this.animEnemy(e, dt, dist);
    }
    // cleanup removed
    if (this.enemies.some((e) => e.removed)) this.enemies = this.enemies.filter((e) => !e.removed);
  }

  shootArrow(e, aim = null, dmg = e.dmg) {
    const p = this.player;
    const from = e.pos.clone(); from.y += e.boss ? 2.6 : 1.4;
    const to = p.pos.clone(); to.y += 1.0;
    const dir = aim ? aim.clone().setY((to.y - from.y) / Math.max(1, from.distanceTo(to))).normalize() : to.sub(from).normalize();
    const m = new THREE.Mesh(this.arrowGeo, this.arrowMat);
    m.position.copy(from); m.lookAt(from.clone().add(dir)); this.scene.add(m);
    this.projectiles.push({ mesh: m, vel: dir.multiplyScalar(22), grav: 0, life: 1.5, owner: 'enemy', kind: 'arrow', dmg });
    this.audio.whoosh();
  }
  // a sling stone lobbed high onto a marked spot (the ring shows where it lands)
  lobStone(from, to, dmg, T = 0.95) {
    const m = new THREE.Mesh(this.stoneGeo, this.stoneMat); m.position.copy(from); this.scene.add(m);
    const vel = new THREE.Vector3((to.x - from.x) / T, 0, (to.z - from.z) / T); vel.y = (to.y - from.y + 0.5 * 18 * T * T) / T;
    this.projectiles.push({ mesh: m, vel, grav: 18, life: T, owner: 'enemy', kind: 'stone' });
    const at = to.clone();
    this.telegraph(at, 1.25, T, () => { this.fx.dust(at, 6, 0.8); this.audio.at(at, () => this.audio.hit?.(0.4)); if (!this.player.dead && this.player.pos.distanceTo(at) < 1.35) this.damagePlayer(dmg, at); });
    this.audio.at(from, () => this.audio.whoosh());
  }
  // a weighted casting net, flung flat and spinning; it pins the hero unless he evades through it
  throwNet(e, dir) {
    const m = new THREE.Mesh(this.netGeo, this.netMat); m.rotation.x = -Math.PI / 2;
    m.position.copy(e.pos).setY(e.pos.y + 1.5); this.scene.add(m);
    this.projectiles.push({ mesh: m, vel: dir.clone().multiplyScalar(13), grav: 0, life: 0.85, owner: 'enemy', kind: 'net', dmg: e.dmg * 0.4 });
    this.audio.at(e.pos, () => this.audio.whoosh());
  }
  splash(pos) {
    this.fx.ring(tmp.copy(pos).setY(WATER_Y + 0.02), new THREE.Color(0.7, 0.8, 0.8), 0.15, 0.9, 0.6, 0.35);
    this.fx.burst(tmp.copy(pos).setY(WATER_Y + 0.05), 5, { speed: 1.4, life: 0.45, size: 0.09, size1: 0.02, color: new THREE.Color(0.85, 0.9, 0.95), up: 2.2, drag: 1 });
  }

  updateProjectiles(dt) {
    const p = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const q = this.projectiles[i];
      q.life -= dt; q.vel.y -= q.grav * dt;
      q.mesh.position.addScaledVector(q.vel, dt);
      let dead = q.life <= 0;
      const mp = q.mesh.position;
      if (q.kind === 'flask') {
        q.mesh.rotation.x += dt * 12;
        this.fx.fire(mp, 0.25);
        if (dead || mp.y < heightAt(mp.x, mp.z)) { this.explodeFlask(q.target); dead = true; }
      } else if (q.kind === 'fireball') {
        this.fx.fire(mp, 0.6);
        if (p.pos.distanceTo(tmp.copy(mp).setY(p.pos.y)) < 0.9 && Math.abs(mp.y - p.pos.y - 1) < 1.6) { this.damagePlayer(q.dmg, mp); dead = true; this.fx.burst(mp, 30, { speed: 5, life: 0.5, size: 0.5, size1: 0.05, color: new THREE.Color(4, 1.4, 0.3) }); }
        if (mp.y < heightAt(mp.x, mp.z) + 0.2) { dead = true; this.fx.burst(mp, 20, { speed: 4, life: 0.5, size: 0.5, size1: 0.05, color: new THREE.Color(4, 1.4, 0.3), up: 2 }); }
      } else if (q.kind === 'pshot') {
        const o = q.o;
        if (o.kind === 'fire') { this.fx.fire(mp, 0.3); }
        else if (o.glow && Math.random() < 0.7) this.fx.glow.spawn({ pos: { x: mp.x, y: mp.y, z: mp.z }, life: 0.25, size: 0.25, size1: 0.02, color: o.glow });
        for (const e of this.enemies) {
          if (e.dead || e.hidden || q.hit.has(e)) continue;
          if (Math.hypot(e.pos.x - mp.x, e.pos.z - mp.z) < e.radius + 0.35 && mp.y - e.pos.y < (e.boss ? 5 : 2.2)) {
            q.hit.add(e); const r = this.rollDamage(o.mult || 1, !!o.fire);
            this.damageEnemy(e, r.d, r.crit, tmp2.copy(mp).sub(q.vel).setY(e.pos.y), o.fire ? 'fire' : 'normal', { weight: o.weight });
            if (o.burn) e.burn = Math.max(e.burn || 0, o.burn);
            if (o.fire) this.fx.burst(mp, 10, { speed: 3, life: 0.4, size: 0.4, size1: 0.05, color: new THREE.Color(3.5, 1.3, 0.3) });
            if (q.pierce-- <= 0) { dead = true; break; }
          }
        }
        const c = mp.clone(); if (resolve(c, 0.05, true) || mp.y < heightAt(mp.x, mp.z)) dead = true;
      } else if (q.kind === 'stone') {
        q.mesh.rotation.x += dt * 9;
      } else if (q.kind === 'net') {
        q.mesh.rotation.z += dt * 9; q.mesh.scale.setScalar(0.6 + (0.85 - q.life) * 0.8);
        if (!p.dead && p.pos.distanceTo(tmp.copy(mp).setY(p.pos.y)) < 1.1) {
          dead = true;
          if (p.invuln > 0 || p.rollT > 0) { this.ui.damageNumber(p.pos, 'Evaded', 'block'); }
          else {
            p.netT = 1.5; p.netPos = p.pos.clone(); this.damagePlayer(q.dmg, mp); this.audio.denied?.();
            if (!this.netWarned) { this.netWarned = true; this.ui.toast('Caught in a net! Evade to tear free'); }
          }
        }
        const c = mp.clone(); if (resolve(c, 0.05, true)) dead = true;
      } else if (q.kind === 'arrow') {
        if (p.pos.distanceTo(tmp.copy(mp).setY(p.pos.y)) < 0.6) { this.damagePlayer(q.dmg, mp); dead = true; }
        const c = mp.clone(); if (resolve(c, 0.05, true)) dead = true;
      }
      if (dead) { this.scene.remove(q.mesh); this.projectiles.splice(i, 1); }
    }
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const tr = this.trails[i]; tr.t += dt;
      tr.obj.children[0].material.uniforms.uA.value = 1 - tr.t / tr.life;
      tr.obj.scale.setScalar(1 + tr.t * 1.5);
      if (tr.t >= tr.life) { this.scene.remove(tr.obj); this.trails.splice(i, 1); }
    }
  }

  updateHazards(dt) {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i]; h.t += dt;
      const k = h.t / h.life;
      if (h.kind === 'firepool') {
        h.mesh.material.opacity = Math.min(1, (1 - k) * 2) * (0.8 + Math.random() * 0.2);
        for (let j = 0; j < 3; j++) { const a = Math.random() * Math.PI * 2, r = Math.random() * h.r; this.fx.fire(tmp.set(h.pos.x + Math.cos(a) * r, h.pos.y + 0.1, h.pos.z + Math.sin(a) * r), 0.7); }
        h.tick -= dt;
        if (h.tick <= 0) { h.tick = 0.5; for (const e of this.enemies) if (!e.dead && !e.hidden && e.pos.distanceTo(h.pos) < h.r + e.radius) { const r = this.rollDamage(0.3, true); this.damageEnemy(e, r.d, false, h.pos, 'dot'); } }
        if (k >= 1) { this.scene.remove(h.mesh); this.hazards.splice(i, 1); }
      } else if (h.kind === 'zone') {
        const k2 = h.t / h.life;
        if (h.kind2 === 'fire') {
          h.mesh.material.opacity = Math.min(1, (1 - k2) * 2) * (0.8 + Math.random() * 0.2);
          if (Math.random() < 0.8) { const a = Math.random() * 6.28, r = Math.random() * h.r; this.fx.fire(tmp.set(h.pos.x + Math.cos(a) * r, h.pos.y + 0.1, h.pos.z + Math.sin(a) * r), 0.6); }
        } else if (h.kind2 === 'smoke') {
          if (Math.random() < 0.6) { const a = Math.random() * 6.28, r = Math.random() * h.r; this.fx.smoke.spawn({ pos: { x: h.pos.x + Math.cos(a) * r, y: h.pos.y + Math.random(), z: h.pos.z + Math.sin(a) * r }, vel: { x: 0.2, y: 0.4, z: 0.1 }, life: 2.5, size: 1.4, size1: 3.2, color: new THREE.Color(0.42, 0.4, 0.38), alpha: 0.5, drag: 0.5, fadeIn: 0.3 }); }
        }
        h.tick -= dt;
        if (h.tick <= 0) {
          h.tick = 0.5;
          for (const e of this.enemies) if (!e.dead && !e.hidden && e.pos.distanceTo(h.pos) < h.r + e.radius) {
            if (h.tickDmg) { const r = this.rollDamage(h.tickDmg, h.kind2 === 'fire'); this.damageEnemy(e, r.d, false, h.pos, 'dot'); }
            if (h.burn) e.burn = Math.max(e.burn || 0, h.burn);
            if (h.slow) { e.slowT = 0.6; e.slowK = h.slow; }
            if (h.kind2 === 'smoke' && !e.boss) { e.alerted = false; e.lost = 1.5; e.st.action = null; }
          }
        }
        if (k2 >= 1) { if (h.mesh) this.scene.remove(h.mesh); this.hazards.splice(i, 1); }
      } else if (h.kind === 'telegraph') {
        const fa = h.friendly ? 0.18 : 1;
        h.ring.material.opacity = 0.85 * fa; h.fill.material.opacity = (0.06 + k * 0.22) * fa;
        h.fill.scale.setScalar(Math.max(0.01, k));
        if (h.meteor && k > 0.6) { // falling meteor streak
          const y = (1 - (k - 0.6) / 0.4) * 18;
          this.fx.glow.spawn({ pos: { x: h.pos.x + y * 0.4, y: h.pos.y + y, z: h.pos.z - y * 0.2 }, life: 0.25, size: 1.4, size1: 0.3, color: new THREE.Color(5, 2, 0.5) });
        }
        if (k >= 1) { this.scene.remove(h.ring, h.fill); this.hazards.splice(i, 1); h.onDone && h.onDone(); }
      }
    }
  }

  updateDecals(dt) {
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i]; d.t += dt;
      if (d.t > d.life - 4) d.m.material.opacity = Math.max(0, (d.life - d.t) / 4);
      if (d.t >= d.life) { this.scene.remove(d.m); d.m.material.dispose(); this.decals.splice(i, 1); }
    }
  }
  updateDrops(dt) {
    for (const d of this.drops) {
      d.age += dt;
      if (d.t < 1) {
        d.t = Math.min(1, d.t + dt * 2);
        d.mesh.position.lerpVectors(d.from, d.to, d.t);
        d.mesh.position.y += Math.sin(d.t * Math.PI) * 2.0;
        d.mesh.rotation.y += dt * 10;
      }
    }
  }

  updateCamera(dt) {
    const p = this.player.pos;
    this.autoZoom = THREE.MathUtils.lerp(this.autoZoom || 1, this.bossActive ? 1.3 : 1, Math.min(1, dt * 1.5));
    const dist = 13.5 * this.camZoom * this.autoZoom * (innerWidth < innerHeight ? 1.45 : 1);
    const target = tmp.set(p.x, p.y + dist * 1.0, p.z + dist * 0.78);
    if (!this.camInit) { this.camPos.copy(target); this.camInit = true; }
    this.camPos.lerp(target, Math.min(1, dt * 6));
    this.camera.position.copy(this.camPos);
    if (this.camKick) { this.camera.position.addScaledVector(this.camKick, this.shakeScale ?? 1); this.camKick.multiplyScalar(Math.max(0, 1 - dt * 12)); }
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 1.8);
      const s = this.shake * this.shake * 0.8 * (this.shakeScale ?? 1);
      this.camera.position.x += (Math.random() - 0.5) * s; this.camera.position.y += (Math.random() - 0.5) * s; this.camera.position.z += (Math.random() - 0.5) * s;
    }
    this.camera.lookAt(this.camPos.x + (this.camKick?.x || 0) * 0.5, this.camPos.y - dist * 1.0 + 1.0, this.camPos.z - dist * 0.78 + (this.camKick?.z || 0) * 0.5);
  }
}
