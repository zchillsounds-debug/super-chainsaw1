import * as THREE from 'three';
import { humanoid, animateHumanoid, animateIfrit, scimitar, camel, animateCamel } from './characters.js';
import { heightAt, SITES, canalX } from './terrain.js';
import { resolve, buildGrid } from './collision.js';
import { buildNav, findPath, navClear } from './nav.js';
import { makeEnemy } from './entities.js';
import { makeItem, rollRarity, RARITY } from './items.js';
import { sigilTex, glowDecal, splatTex } from './textures.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const rand = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

const SKILLS = {
  naft: { cd: 0.9, mana: 12 },
  whirl: { cd: 7, mana: 22 },
  dash: { cd: 4, mana: 10 },
  ward: { cd: 16, mana: 25 },
  potion: { cd: 1.2, mana: 0 },
};

export class Game {
  constructor({ scene, camera, renderer, world, fx, ui, audio }) {
    Object.assign(this, { scene, camera, renderer, world, fx, ui, audio });
    buildGrid();
    buildNav();
    this.t = 0; this.enemies = []; this.projectiles = []; this.hazards = []; this.drops = []; this.trails = [];
    this.mouse = new THREE.Vector2(); this.mouseScreen = { x: 0, y: 0 };
    this.keys = {}; this.lmb = false; this.shake = 0; this.camZoom = 1; this.hitStop = 0;
    this.camPos = new THREE.Vector3(); this.started = false;
    this.createPlayer();
    this.spawnEnemies();
    this.quests = [
      { id: 'serai', text: 'Slay Abu Jahm at the old caravanserai', done: false },
      { id: 'graves', text: 'Put the Ghul of the Tombs to rest', done: false },
      { id: 'boss', text: 'Confront the Ifrit at the Ruined Arch', done: false },
    ];
    this.ui.quest(this.quests);
    this.makeMinimap();
    this.bindInput();
    this.pois = [
      { x: SITES.village.x, z: SITES.village.z, icon: '☪', color: '#9fe0d0' },
      { x: SITES.serai.x, z: SITES.serai.z, icon: '⚔', color: '#ffd040' },
      { x: SITES.graveyard.x, z: SITES.graveyard.z, icon: '✝', color: '#c0c0a0' },
      { x: SITES.arch.x, z: SITES.arch.z, icon: '♨', color: '#ff7020' },
    ];
    this.pois[2].icon = '☾';
    this.setupOccluders(this.world.occluders);
    this.decals = []; this.splatTexs = [splatTex(1), splatTex(2), splatTex(3)]; this.scorchTex = splatTex(4, true);
  }

  decal(pos, size, kind) {
    const blood = kind !== 'scorch';
    const col = kind === 'ghoul' ? new THREE.Color(0.08, 0.1, 0.03) : kind === 'fire' ? new THREE.Color(0.25, 0.08, 0.02) : new THREE.Color(0.11, 0.008, 0.008);
    const mat = new THREE.MeshStandardMaterial({ map: blood ? this.splatTexs[Math.floor(Math.random() * 3)] : this.scorchTex, color: blood ? col : 0xffffff, transparent: true, depthWrite: false, roughness: blood ? 0.25 : 1, polygonOffset: true, polygonOffsetFactor: -2, alphaTest: 0.02 });
    if (blood) { mat.alphaMap = mat.map; mat.map = null; }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), mat);
    m.position.set(pos.x, heightAt(pos.x, pos.z) + 0.03 + Math.random() * 0.01, pos.z); m.rotation.y = Math.random() * 6.28;
    m.renderOrder = 1; this.scene.add(m);
    this.decals.push({ m, t: 0, life: 25 });
    if (this.decals.length > 60) { const d = this.decals.shift(); this.scene.remove(d.m); d.m.material.dispose(); }
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
              float f = smoothstep(uHoleR*${hs.toFixed(2)}, uHoleR*${(hs * 0.55).toFixed(2)}, d) * step(dz, uPDepth - 1.2) * ${hs > 1 ? '0.94' : '0.85'};
              if (f > bayer4(gl_FragCoord.xy)) discard; }`);
      };
      const key = (mat.customProgramCacheKey ? mat.customProgramCacheKey() : '') + (base ? base.toString() : '');
      m.customProgramCacheKey = () => 'occ' + hs + ':' + key;
      patched.set(mat, m);
      return m;
    };
    for (const g of groups) g.traverse((o) => { if (o.isMesh) o.material = patch(o.material, scaleOf(o)); });
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
  createPlayer() {
    const rig = humanoid({ robe: '#1f2c44', robe2: '#c9a24a', hem: true, mail: true, turban: 0xece2c8, helmet: true, offhand: 'shield', beard: 0x2a1a10, cloak: 0x7a1a14, skin: 0xa8714a });
    this.scene.add(rig);
    const p = this.player = {
      rig, pos: new THREE.Vector3(13, 0, 80), facing: Math.PI, st: { phase: 0, walkBlend: 0, action: null, actionT: 0, hitT: 0, dead: false, deadT: 0, fallDir: 1 },
      hp: 100, mp: 60, level: 1, xp: 0, gold: 0, potions: 3, equip: {}, bag: new Array(40).fill(null), cds: {}, buffs: {},
      target: null, moveTo: null, actionDur: 0.6, hitApplied: false, dead: false, whirlT: 0, dashT: 0, invuln: 0,
    };
    p.equip.weapon = { id: 0, slot: 'weapon', rarity: 'common', name: 'Rusted Scimitar', base: 'Scimitar', min: 4, max: 9, level: 1, stats: {}, icon: '⚔' };
    this.recalcStats();
    p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
    // selection ring under the player
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.35, depthWrite: false }));
    ring.position.y = 0.06; rig.add(ring);
    // ward sigil
    const sm = new THREE.MeshBasicMaterial({ map: sigilTex(), color: new THREE.Color(1.1, 0.8, 0.3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.wardSigil = new THREE.Mesh(new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2), sm);
    this.scene.add(this.wardSigil);
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
  }

  recalcStats() {
    const p = this.player, s = { min: 1, max: 3, armor: 2, maxHp: 80 + p.level * 20, maxMp: 50 + p.level * 6, crit: 5, speed: 0, leech: 0, move: 0, fire: 0, dmgPct: 0, regen: 2 };
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
    const S = SITES.serai, G = SITES.graveyard;
    this.spawnPack(['bandit', 'bandit', 'archer'], 22, 36, 3, 1);
    this.spawnPack(['bandit', 'spearman'], 38, 14, 4, 1);
    this.spawnPack(['bandit', 'archer', 'spearman'], S.x, S.z + 6, 5, 2, { spread: 6 });
    this.spawnPack(['archer'], S.x - 10, S.z - 10, 2, 2);
    this.spawnPack(['bandit', 'spearman'], S.x + 8, S.z - 4, 3, 2);
    this.chief = this.spawnPack('spearman', S.x, S.z - 6, 1, 3, { elite: true, name: 'Abu Jahm the Cutthroat' })[0];
    this.chief.quest = 'serai';
    this.spawnPack(['bandit', 'bandit'], S.x + 2, S.z - 6, 2, 2);
    // road to the bridge and beyond
    this.spawnPack(['bandit', 'archer'], 0, 6, 3, 2);
    this.spawnPack(['ghoul'], -36, -16, 3, 2);
    // graveyard: ghouls hidden in the ground, rising when approached
    for (let i = 0; i < 4; i++) this.spawnPack('ghoul', G.x + rand(-13, 13), G.z + rand(-11, 11), 2, 3, { hidden: true, spread: 3 });
    this.matriarch = this.spawnPack('ghoul', G.x - 4, G.z - 2, 1, 4, { elite: true, name: 'The Ghul of the Tombs' })[0];
    this.matriarch.quest = 'graves';
    // road south toward the arch
    this.spawnPack(['ghoul', 'bandit'], 6, -30, 4, 3);
    this.spawnPack(['ghoul', 'archer', 'spearman'], 8, -58, 5, 4, { spread: 5 });
    this.spawnPack('ghoul', 20, -66, 1, 4, { elite: true });
    this.bossSpawned = false;
  }

  makeMinimap() {
    const c = document.createElement('canvas'); c.width = c.height = 280; const x = c.getContext('2d');
    for (let j = 0; j < 280; j += 2) for (let i = 0; i < 280; i += 2) {
      const wx = i - 140, wz = j - 140;
      const cd = Math.abs(wx - canalX(wz));
      x.fillStyle = cd < 3 ? '#2a6a6a' : (cd < 25 ? '#4a4a26' : '#6a5032');
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
        if (this.hoverNpc) { this.talkToNpc(); return; }
        if (this.hover) { this.player.target = this.hover; this.player.moveTo = null; }
        else { this.player.target = null; this.setMoveTarget(); this.showMarker(); }
      } else if (e.button === 2) this.useSkill('naft');
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.lmb = false; });
    addEventListener('wheel', (e) => { this.camZoom = THREE.MathUtils.clamp(this.camZoom + Math.sign(e.deltaY) * 0.08, 0.7, 1.35); });
    addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (!this.started) return;
      if (e.key === 'Alt') e.preventDefault();
      const k = e.key.toLowerCase();
      if (k === '1') this.useSkill('whirl');
      if (k === '2') this.useSkill('dash');
      if (k === '3') this.useSkill('ward');
      if (k === '4') this.useSkill('naft');
      if (k === 'q') this.useSkill('potion');
      if (k === 'i' || k === 'c') { this.ui.toggleInventory(); this.refreshInv(); }
      if (k === 'escape') this.ui.toggleInventory(false);
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
  setMoveTarget() { this.player.moveTo = this.groundPoint(); }
  showMarker() { const g = this.player.moveTo; if (!g) return; this.marker.position.set(g.x, g.y + 0.08, g.z); this.marker.material.opacity = 1; this.marker.scale.setScalar(1.6); }

  pickHover() {
    let best = null, bd = 46;
    for (const e of this.enemies) {
      if (e.dead || e.hidden || e.rig.visible === false) continue;
      const sp = this.ui.project(tmp.copy(e.pos).setY(e.pos.y + (e.boss ? 4 : 1.1)), this.camera);
      const d = Math.hypot(sp.x - this.mouseScreen.x, sp.y - this.mouseScreen.y) / (e.boss ? 3 : 1);
      if (d < bd) { bd = d; best = e; }
    }
    this.hover = best;
    this.hoverNpc = false;
    if (!best && this.npc) {
      const sp = this.ui.project(tmp.copy(this.npc.position).setY(this.npc.position.y + 1.2), this.camera);
      this.hoverNpc = Math.hypot(sp.x - this.mouseScreen.x, sp.y - this.mouseScreen.y) < 40;
    }
    this.renderer.domElement.style.cursor = best ? 'crosshair' : (this.hoverNpc ? 'help' : 'default');
  }

  // ------------------------------------------------------------------ combat helpers
  rollDamage(mult = 1, fire = false) {
    const s = this.player.stats;
    let d = rand(s.min, s.max) * mult * (fire ? 1 + s.fire / 100 : 1);
    const crit = Math.random() * 100 < s.crit;
    if (crit) d *= 2;
    return { d: Math.max(1, Math.round(d)), crit };
  }

  damageEnemy(e, dmg, crit, src, kind = 'normal') {
    if (e.dead || e.hidden) return;
    const tick = kind === 'dot';
    e.hp -= dmg; e.flash = tick ? Math.max(e.flash, 0.4) : 1; e.alerted = true;
    if (tick) { if (e.hp <= 0) this.killEnemy(e, src); return; }
    if (!e.boss) { e.st.hitT = 1; const k = tmp.copy(e.pos).sub(src).setY(0).normalize().multiplyScalar(crit ? 0.8 : 0.35); e.pos.add(k); }
    this.ui.damageNumber(e.pos, dmg + (crit ? '!' : ''), crit ? 'crit' : kind);
    const hp = tmp2.copy(e.pos); hp.y += e.boss ? 3.5 : 1.2;
    if (e.type === 'ifrit' || e.type === 'imp') this.fx.sparks(hp, new THREE.Color(4, 1.4, 0.3));
    else if (e.type === 'ghoul') this.fx.blood(hp, new THREE.Color(0.15, 0.2, 0.08));
    else { this.fx.blood(hp); if (crit) this.fx.sparks(hp); }
    if (crit) { this.audio.crit(); this.hitStop = 0.05; this.shake = Math.max(this.shake, 0.25); } else this.audio.hit();
    if (this.player.stats.leech) this.player.hp = Math.min(this.player.stats.maxHp, this.player.hp + this.player.stats.leech);
    this.lastTarget = e; this.lastTargetT = 3;
    // alert nearby allies
    for (const o of this.enemies) if (!o.dead && o.pos.distanceTo(e.pos) < 12) o.alerted = true;
    if (e.hp <= 0) this.killEnemy(e, src);
  }

  killEnemy(e, src) {
    e.dead = true; e.st.dead = true; e.st.deadT = 0; e.hp = 0;
    e.st.fallDir = Math.random() < 0.5 ? 1 : -1;
    this.audio.death();
    const p = this.player; p.xp += e.xp;
    this.fx.dust(e.pos, 6);
    if (!e.boss) this.decal(e.pos, 1.6 + Math.random(), e.type === 'ghoul' ? 'ghoul' : e.type === 'imp' ? 'fire' : 'blood');
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
    if (e.quest) this.completeQuest(e.quest);
    if (e.boss) this.onBossDeath(e);
  }

  xpFor(l) { return Math.round(90 * Math.pow(l, 1.6)); }
  levelUp() {
    const p = this.player; p.level++; this.recalcStats(); p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
    this.ui.toast(`Level ${p.level}`, 'lvl'); this.audio.levelUp();
    this.fx.ring(p.pos, new THREE.Color(3, 2.4, 1), 0.5, 4, 0.9);
    this.fx.burst(tmp.copy(p.pos).setY(p.pos.y + 1), 50, { speed: 3, life: 1.4, size: 0.18, size1: 0.02, color: new THREE.Color(3, 2.4, 1), up: 3, drag: 1 });
  }

  completeQuest(id) {
    const q = this.quests.find((x) => x.id === id); if (!q || q.done) return;
    q.done = true; this.ui.quest(this.quests);
    const msgs = { serai: ['The Raiders Scatter', 'Abu Jahm lies dead among the ruins'], graves: ['The Tombs Fall Silent', 'The restless dead return to the earth'], boss: ['The Ifrit is Vanquished', 'Baghdad sleeps safely tonight'] };
    this.ui.banner(...msgs[id]);
  }

  damagePlayer(dmg, src) {
    const p = this.player; if (p.dead || p.invuln > 0) return;
    const s = p.stats;
    let red = s.armor / (s.armor + 40 + p.level * 6);
    if (p.buffs.ward > 0) red = 1 - (1 - red) * 0.5;
    const d = Math.max(1, Math.round(dmg * (1 - red)));
    p.hp -= d; p.st.hitT = 0.6;
    this.ui.damageNumber(p.pos, d, 'player');
    this.fx.blood(tmp.copy(p.pos).setY(p.pos.y + 1.2));
    this.shake = Math.max(this.shake, Math.min(0.5, d / 40));
    this.audio.grunt();
    if (p.hp <= 0) this.playerDeath();
  }

  playerDeath() {
    const p = this.player; p.dead = true; p.hp = 0; p.st.dead = true; p.st.deadT = 0;
    setTimeout(() => this.ui.death(true, () => this.respawn()), 1500);
  }
  respawn() {
    const p = this.player; this.ui.death(false);
    p.dead = false; p.st.dead = false; p.rig.children[0].rotation.x = 0; p.rig.children[0].position.y = 0;
    p.hp = p.stats.maxHp; p.mp = p.stats.maxMp; p.pos.set(13, 0, 78); p.target = null; p.moveTo = null; p.invuln = 2;
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
      if (item.slot === 'weapon') { m = scimitar(); m.rotation.z = Math.PI / 2; m.position.y = 0.06; m.scale.setScalar(1.1); }
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

  tryPickup(d) {
    const p = this.player;
    if (d.item.gold) { p.gold += d.item.gold; this.audio.gold(); }
    else if (d.item.potion) { if (p.potions >= 5) return false; p.potions++; this.audio.pickup(); }
    else {
      const slot = p.bag.indexOf(null);
      if (slot < 0) { this.ui.toast('Your pack is full'); return false; }
      p.bag[slot] = d.item; this.audio.pickup();
      // auto-equip into empty slots
      if (!p.equip[d.item.slot]) { p.equip[d.item.slot] = d.item; p.bag[slot] = null; this.recalcStats(); this.ui.toast(`Equipped ${d.item.name}`); }
    }
    this.scene.remove(d.mesh); this.ui.removeLootLabel(d);
    this.drops.splice(this.drops.indexOf(d), 1);
    this.refreshInv();
    return true;
  }

  refreshInv() {
    if (!this.ui.invOpen) return;
    const p = this.player;
    this.ui.refreshInventory(p,
      (i) => { const it = p.bag[i]; const old = p.equip[it.slot]; p.equip[it.slot] = it; p.bag[i] = old || null; this.recalcStats(); this.audio.clang(); this.refreshInv(); },
      (i) => { p.bag[i] = null; this.refreshInv(); },
      (s) => { const k = p.bag.indexOf(null); if (k < 0 || s === 'weapon') return; p.bag[k] = p.equip[s]; p.equip[s] = null; this.recalcStats(); this.refreshInv(); });
  }

  // ------------------------------------------------------------------ skills
  useSkill(name) {
    const p = this.player; if (p.dead || !this.started) return;
    const S = SKILLS[name];
    if ((p.cds[name] || 0) > 0) return;
    if (p.mp < S.mana) { this.ui.toast('Not enough mana'); return; }
    if (name === 'potion') {
      if (p.potions <= 0) { this.ui.toast('No sherbet left'); return; }
      p.potions--; p.buffs.heal = 1.2; this.audio.potion();
      this.fx.burst(tmp.copy(p.pos).setY(p.pos.y + 1), 24, { speed: 1.5, life: 1, size: 0.2, size1: 0.02, color: new THREE.Color(2, 0.3, 0.4), up: 2 });
    } else if (name === 'naft') {
      const g = this.groundPoint();
      const from = p.pos.clone(); from.y += 1.6;
      const dist = Math.min(14, Math.hypot(g.x - p.pos.x, g.z - p.pos.z));
      const dir = tmp.set(g.x - p.pos.x, 0, g.z - p.pos.z).normalize();
      const target = p.pos.clone().addScaledVector(dir, dist); target.y = heightAt(target.x, target.z);
      p.facing = Math.atan2(dir.x, dir.z);
      p.st.action = 'throw'; p.st.actionT = 0; p.actionDur = 0.45;
      this.throwFlask(from, target);
      this.audio.whoosh();
    } else if (name === 'whirl') {
      p.whirlT = 2.0; p.whirlTick = 0; this.audio.whoosh();
    } else if (name === 'dash') {
      const g = this.groundPoint();
      const dir = new THREE.Vector3(g.x - p.pos.x, 0, g.z - p.pos.z); if (dir.lengthSq() < 0.01) dir.set(Math.sin(p.facing), 0, Math.cos(p.facing));
      dir.normalize(); p.dashDir = dir; p.dashT = 0.28; p.dashHit = new Set(); p.facing = Math.atan2(dir.x, dir.z); p.invuln = 0.3;
      this.audio.whoosh(); this.fx.dust(p.pos, 12, 1.2);
    } else if (name === 'ward') {
      p.buffs.ward = 8; p.wardTick = 0; this.audio.levelUp();
      this.fx.ring(p.pos, new THREE.Color(3, 2.2, 0.8), 0.5, 5, 0.7);
    }
    p.mp -= S.mana; p.cds[name] = S.cd;
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
    this.hazards.push({ kind: 'firepool', pos: pos.clone(), r: 3, t: 0, life: 3.5, tick: 0, mesh: decal });
  }

  // ------------------------------------------------------------------ boss
  spawnBoss() {
    this.bossSpawned = true;
    const A = SITES.arch;
    const b = this.spawnPack('ifrit', A.x, A.z - 2, 1, 6, { spread: 0 })[0];
    b.st.action = null; b.phase = 1; b.summoned = false; b.meteorCd = 6; b.volleyCd = 3; b.rise = 0;
    this.boss = b; b.quest = 'boss'; b.alerted = true;
    this.ui.banner('Ifrit, the Unbound', 'Born of smokeless fire, freed from Sulayman\'s seal', 4000);
    this.audio.roar(); this.shake = 0.8; this.bossActive = true;
    this.fx.flash(tmp.copy(b.pos).setY(4), 0xff6020, 60, 1.2, 30);
    for (let i = 0; i < 3; i++) this.fx.ring(b.pos, new THREE.Color(1.6, 0.6, 0.15), 1 + i, 6 + i * 2.5, 0.8 + i * 0.25, 0.8);
    this.bossLight = new THREE.PointLight(0xff6a20, 25, 20, 2); this.scene.add(this.bossLight);
    this.audio.setMusicIntensity(1);
  }
  onBossDeath(b) {
    this.ui.bossBar(null); this.bossActive = false;
    this.fx.flash(tmp.copy(b.pos).setY(4), 0xffa040, 300, 2.5, 50);
    for (let i = 0; i < 6; i++) setTimeout(() => { this.fx.ring(b.pos, new THREE.Color(4, 2, 0.5), 1, 14, 1.2); this.audio.boom(); this.shake = 0.6; }, i * 250);
    this.fx.burst(tmp.copy(b.pos).setY(4), 200, { speed: 10, life: 2, size: 0.8, size1: 0.05, color: new THREE.Color(4, 1.6, 0.4), up: 3, drag: 1.2 });
    setTimeout(() => this.ui.banner('Victory', 'The Ifrit is bound once more. The House of Wisdom honours you.', 6000), 2500);
    if (this.bossLight) setTimeout(() => { this.scene.remove(this.bossLight); }, 2000);
  }

  bossAI(b, dt) {
    const p = this.player, d = b.pos.distanceTo(p.pos);
    if (b.rise < 1) { b.rise = Math.min(1, b.rise + dt * 0.5); b.rig.children[0].scale.setScalar((0.2 + b.rise * 0.8) * 0.8); return; }
    this.ui.bossBar(b.name, b.hp / b.maxHp);
    if (this.bossLight) this.bossLight.position.set(b.pos.x, b.pos.y + 5, b.pos.z);
    for (let i = 0; i < 3; i++) this.fx.fire(tmp.set(b.pos.x + rand(-1, 1), b.pos.y + 0.5, b.pos.z + rand(-1, 1)), 1.5);
    const face = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
    b.facing += angDiff(b.facing, face) * Math.min(1, dt * 3);
    if (b.st.action) {
      b.st.actionT += dt / b.actionDur;
      if (b.st.action === 'slam' && b.st.actionT > 0.55 && !b.didHit) {
        b.didHit = true;
        const c = b.slamPos;
        this.audio.boom(); this.shake = 0.7;
        this.fx.ring(c, new THREE.Color(4, 1.4, 0.3), 1, 7, 0.6);
        this.fx.burst(tmp.copy(c).setY(c.y + 0.3), 80, { speed: 9, life: 0.8, size: 0.8, size1: 0.1, color: new THREE.Color(3, 1, 0.2), up: 1, drag: 2 });
        this.fx.dust(c, 20, 2);
        if (p.pos.distanceTo(c) < 6) this.damagePlayer(b.dmg * 1.4, c);
      }
      if (b.st.action === 'cast' && b.st.actionT > 0.5 && !b.didHit) {
        b.didHit = true;
        if (b.castKind === 'volley') {
          const n = b.phase >= 2 ? 7 : 5;
          for (let i = 0; i < n; i++) {
            const a = face + (i - (n - 1) / 2) * 0.22;
            this.fireball(tmp.copy(b.pos).setY(b.pos.y + 4.5), new THREE.Vector3(Math.sin(a), 0, Math.cos(a)));
          }
          this.audio.whoosh();
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
          const imps = this.spawnPack('imp', b.pos.x, b.pos.z + 3, 4, 5, { spread: 5 });
          for (const i of imps) { i.alerted = true; this.fx.burst(tmp.copy(i.pos).setY(i.pos.y + 0.5), 30, { speed: 4, life: 0.6, size: 0.5, size1: 0.05, color: new THREE.Color(4, 1.4, 0.3), up: 2 }); }
          this.audio.roar();
        }
      }
      if (b.st.actionT >= 1) b.st.action = null;
      return;
    }
    if (b.hp < b.maxHp * 0.6) b.phase = 2;
    b.volleyCd -= dt; b.meteorCd -= dt;
    if (!b.summoned && b.hp < b.maxHp * 0.4) { b.summoned = true; this.bossCast(b, 'summon'); return; }
    if (b.phase >= 2 && b.meteorCd <= 0) { b.meteorCd = 9; this.bossCast(b, 'meteor'); return; }
    if (d < 6.5 && b.atkCd <= 0) {
      b.st.action = 'slam'; b.st.actionT = 0; b.actionDur = 1.6; b.didHit = false; b.atkCd = 2.6;
      b.slamPos = tmp.copy(b.pos).addScaledVector(new THREE.Vector3(Math.sin(face), 0, Math.cos(face)), 3).clone();
      b.slamPos.y = heightAt(b.slamPos.x, b.slamPos.z);
      this.telegraph(b.slamPos, 6, 0.88, null);
      return;
    }
    if (b.volleyCd <= 0 && d < 24) { b.volleyCd = b.phase >= 2 ? 3.5 : 5; this.bossCast(b, 'volley'); return; }
    // drift towards the player
    if (d > 5) { const dir = tmp.copy(p.pos).sub(b.pos).setY(0).normalize(); b.pos.addScaledVector(dir, b.speed * dt); }
  }
  bossCast(b, kind) { b.st.action = 'cast'; b.castKind = kind; b.st.actionT = 0; b.actionDur = kind === 'volley' ? 1.1 : 1.6; b.didHit = false; }

  fireball(from, dir) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2, 0.4), toneMapped: false }));
    m.position.copy(from); this.scene.add(m);
    const v = dir.clone().multiplyScalar(12); v.y = -2.2;
    this.projectiles.push({ mesh: m, vel: v, grav: 0, life: 3, owner: 'enemy', kind: 'fireball', dmg: this.boss.dmg * 0.6 });
  }

  telegraph(pos, r, delay, onDone, meteor = false) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.22, 0.05), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.92, r, 48).rotateX(-Math.PI / 2), mat);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(r, 48).rotateX(-Math.PI / 2), mat.clone());
    ring.position.copy(pos).setY(pos.y + 0.1); fill.position.copy(ring.position);
    this.scene.add(ring, fill);
    this.hazards.push({ kind: 'telegraph', ring, fill, t: 0, life: delay, onDone, meteor, pos: pos.clone() });
  }

  // ------------------------------------------------------------------ NPC
  addNpc() {
    const npc = humanoid({ robe: '#e6dcc4', robe2: '#2a6a5a', turban: 0x2a7a6a, beard: 0xd8d0c0, weapon: null, skin: 0x9a6a48, sash: 0x2a6a5a });
    const x = 9, z = 74; npc.position.set(x, heightAt(x, z), z); npc.rotation.y = 0.6;
    this.scene.add(npc); this.npc = npc; this.npcSt = { phase: 0, walkBlend: 0, action: null, actionT: 0, hitT: 0 };
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
    for (const [x, z, c] of [[30, 66, 0xb88a58], [33, 70, 0xa07040], [-8, 40, 0xc49a68], [70, 22, 0x9a6a3a], [74, 18, 0xb08050]]) add(camel(c), x, z, 'camel', { range: 4, speed: 0.9 });
    const garb = [['#e8dcc0', '#2a6a5a', 0xf0ead8], ['#6a3a2a', '#d0a040', 0x2a2420], ['#2a4a6a', '#e0c070', 0xe8e0d0], ['#8a6a3a', '#3a2a1a', 0x6a3020]];
    const V = SITES.village;
    for (let i = 0; i < 6; i++) {
      const [r1, r2, tb] = garb[i % garb.length];
      add(humanoid({ robe: r1, robe2: r2, turban: tb, weapon: null, beard: i % 2 ? 0x2a1a10 : null, skin: [0xa8714a, 0x8a5a3a, 0xb88a60][i % 3] }), V.x + rand(-12, 12), V.z + rand(-6, 22), 'villager', { range: 8, speed: 1.3 });
    }
  }
  updateAmbientLife(dt) {
    if (!this.critters) return;
    const p = this.player.pos;
    for (const c of this.critters) {
      const d = c.pos.distanceTo(p); c.rig.visible = d < 50; if (d > 50) continue;
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
    const lines = [
      'Peace be upon you, traveller. I am <b>Ishaq al-Munajjim</b>, astronomer of the <i>Bayt al-Hikma</i>. Three nights past, a raider named <b>Abu Jahm</b> broke the old seal beneath the ruined arch of the Persian kings — and something of smokeless fire walked free.',
      'The dead in the southern tombs no longer rest, and the raiders grow bold. Drive them from the caravanserai to the east, still the <b>ghul</b> across the canal, then face the <b>Ifrit</b> at the great arch to the south. Take this sherbet — and may the stars guide your blade.',
    ];
    let i = 0;
    const next = () => { if (i < lines.length) this.ui.dialog('Ishaq al-Munajjim', lines[i++], next); };
    next();
    if (this.npcMark) this.npcMark.visible = false;
  }

  // ------------------------------------------------------------------ update loop
  update(dt) {
    if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.1; }
    this.t += dt;
    const p = this.player;
    if (this.started) this.pickHover();
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
    if (this.started) this.updateOccluders(); else this.occU.uHole.value.set(-9999, -9999);
    if (this.npc) {
      animateHumanoid(this.npc, this.npcSt, this.t, dt);
      if (this.npcMark) { this.npcMark.rotation.y += dt * 2; this.npcMark.position.y = 2.6 + Math.sin(this.t * 3) * 0.1; }
    }
    // UI
    this.ui.setOrbs(p.hp, p.stats.maxHp, p.mp, p.stats.maxMp, this.t);
    this.ui.setXP(p.xp / this.xpFor(p.level), p.level);
    this.ui.setSkill('attack', 0, true);
    for (const k of Object.keys(SKILLS)) this.ui.setSkill(k, Math.max(0, (p.cds[k] || 0) / SKILLS[k].cd), p.mp >= SKILLS[k].mana, k === 'potion' ? p.potions : null);
    const tgt = this.hover || (this.lastTargetT > 0 && !this.lastTarget?.dead ? this.lastTarget : null);
    this.lastTargetT -= dt;
    if (tgt && !tgt.boss) this.ui.showTarget(tgt.name + (tgt.level ? `  ·  Lv ${tgt.level}` : ''), tgt.hp / tgt.maxHp, tgt.elite ? 'elite' : ''); else this.ui.hideTarget();
    const buffs = []; if (p.buffs.ward > 0) buffs.push({ icon: 'ward', t: p.buffs.ward }); if (p.whirlT > 0) buffs.push({ icon: 'whirl', t: p.whirlT });
    this.ui.buffs(buffs);
    this.ui.updateWorld(this.camera, dt, this.keys['alt']);
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
    const speed = 6.4 * (1 + s.move / 100) * (p.whirlT > 0 ? 0.75 : 1);
    if (p.dead) { p.st.deadT += dt; }
    else if (p.dashT > 0) {
      p.dashT -= dt;
      p.pos.addScaledVector(p.dashDir, 34 * dt);
      this.fx.dust(p.pos, 2, 0.8);
      this.fx.burst(tmp.copy(p.pos).setY(p.pos.y + 1), 4, { speed: 1, life: 0.4, size: 0.4, size1: 0.05, color: new THREE.Color(2.2, 1.6, 0.8) });
      for (const e of this.enemies) if (!e.dead && !e.hidden && !p.dashHit.has(e) && e.pos.distanceTo(p.pos) < 1.6 + e.radius) {
        p.dashHit.add(e); const r = this.rollDamage(1.3); this.damageEnemy(e, r.d, r.crit, p.pos);
        if (!e.boss) e.pos.addScaledVector(p.dashDir, 1.5);
      }
      moving = true;
    } else {
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
          for (const e of this.enemies) if (!e.dead && !e.hidden && e.pos.distanceTo(p.pos) < 3.2 + e.radius) { const r = this.rollDamage(0.65); this.damageEnemy(e, r.d, r.crit, p.pos); }
        }
        if (p.whirlT <= 0) p.st.action = null;
      }
      // target/attack
      let goal = null;
      if (p.target && (p.target.dead || p.target.hidden)) p.target = null;
      if (p.target && p.whirlT <= 0) {
        const d = Math.hypot(p.target.pos.x - p.pos.x, p.target.pos.z - p.pos.z);
        if (d <= 1.6 + p.target.radius) {
          p.facing += angDiff(p.facing, Math.atan2(p.target.pos.x - p.pos.x, p.target.pos.z - p.pos.z)) * Math.min(1, dt * 20);
          if (!p.st.action) { p.st.action = 'attack'; p.st.actionT = 0; p.actionDur = 0.62 / (1 + s.speed / 100); p.hitApplied = false; this.audio.swing(); }
        } else if (!p.st.action || p.st.action === 'throw') goal = p.target.pos;
      } else if (p.moveTo && !(p.st.action === 'attack')) goal = p.moveTo;
      if (p.pickup && this.drops.includes(p.pickup) && p.pos.distanceTo(p.pickup.to) < 1.5) { this.tryPickup(p.pickup); p.pickup = null; p.moveTo = null; }
      if (goal) goal = this.steer(p, goal);
      if (goal) {
        const dx = goal.x - p.pos.x, dz = goal.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.2) {
          const step = Math.min(d, speed * dt);
          p.pos.x += dx / d * step; p.pos.z += dz / d * step; moving = true;
          if (p.whirlT <= 0) p.facing += angDiff(p.facing, Math.atan2(dx, dz)) * Math.min(1, dt * 14);
        } else if (p.moveTo && Math.hypot(p.moveTo.x - p.pos.x, p.moveTo.z - p.pos.z) < 0.3) p.moveTo = null;
      }
      // attack resolution
      if (p.st.action && p.st.action !== 'spin') {
        p.st.actionT += dt / p.actionDur;
        if (p.st.action === 'attack' && !p.hitApplied && p.st.actionT > 0.55) {
          p.hitApplied = true;
          this.slashTrail();
          const fwd = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
          for (const e of this.enemies) {
            if (e.dead || e.hidden) continue;
            const v = tmp.copy(e.pos).sub(p.pos).setY(0), d = v.length();
            if (d < 2.4 + e.radius && v.normalize().dot(fwd) > 0.2) { const r = this.rollDamage(1); this.damageEnemy(e, r.d, r.crit, p.pos); }
          }
        }
        if (p.st.actionT >= 1) { p.st.action = null; }
      }
    }
    // auto-pickup gold & potions on walk-over
    for (const d of this.drops) if ((d.item.gold || d.item.potion) && d.t >= 1 && p.pos.distanceTo(d.mesh.position) < 1.2) { this.tryPickup(d); break; }
    resolve(p.pos, 0.45);
    p.pos.y = heightAt(p.pos.x, p.pos.z);
    p.st.walkBlend = THREE.MathUtils.lerp(p.st.walkBlend, moving ? 1 : 0, Math.min(1, dt * 10));
    p.st.phase += dt * (moving ? speed * 1.55 : 0);
    // footstep dust puffs
    if (moving && p.dashT <= 0) { const step = Math.floor(p.st.phase / Math.PI); if (step !== p.lastStep) { p.lastStep = step; this.fx.dust(tmp.copy(p.pos).add(new THREE.Vector3(0, 0.1, 0)), 2, 0.45); } }
    p.rig.position.copy(p.pos); p.rig.rotation.y = p.facing;
    animateHumanoid(p.rig, p.st, this.t, dt);
    this.pLight.position.set(p.pos.x, p.pos.y + 3, p.pos.z + 1);
    // whirl vortex
    const vu = this.vortex.material.uniforms; vu.uT.value = this.t;
    vu.uA.value = THREE.MathUtils.lerp(vu.uA.value, p.whirlT > 0 ? 1 : 0, Math.min(1, dt * 10));
    this.vortex.position.copy(p.pos); this.vortex.visible = vu.uA.value > 0.01;
    // ward visuals
    const w = p.buffs.ward > 0 ? Math.min(1, p.buffs.ward * 2) : 0;
    this.wardSigil.material.opacity = THREE.MathUtils.lerp(this.wardSigil.material.opacity, w * 0.75, dt * 6);
    this.wardSigil.position.set(p.pos.x, p.pos.y + 0.12, p.pos.z); this.wardSigil.rotation.y += dt * 0.6;
    this.wardRings.forEach((r, i) => {
      r.material.opacity = this.wardSigil.material.opacity;
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
    if (!this.bossSpawned && Math.hypot(p.pos.x - SITES.arch.x, p.pos.z - SITES.arch.z) < 24) this.spawnBoss();
  }

  // Follow an A* path when the straight line to the goal is blocked.
  steer(ent, goal) {
    const pos = ent.pos;
    if (navClear(pos.x, pos.z, goal.x, goal.z)) { ent.path = null; return goal; }
    ent.pathT = (ent.pathT || 0) - 1;
    const moved = !ent.pathGoal || Math.hypot(ent.pathGoal.x - goal.x, ent.pathGoal.z - goal.z) > 1.5;
    if (!ent.path || moved || ent.pathT <= 0) {
      ent.path = findPath(pos, goal); ent.pathGoal = { x: goal.x, z: goal.z }; ent.pathT = 40;
    }
    if (!ent.path || !ent.path.length) return goal;
    while (ent.path.length > 1 && Math.hypot(ent.path[0].x - pos.x, ent.path[0].z - pos.z) < 0.6) ent.path.shift();
    const w = ent.path[0];
    return { x: w.x, z: w.z, y: goal.y };
  }

  slashTrail() {
    const p = this.player;
    const g = new THREE.RingGeometry(1.0, 2.3, 32, 1, -Math.PI * 0.45, Math.PI * 0.9);
    const pos = g.attributes.position;
    // fade along the arc via vertex colors
    const col = [];
    for (let i = 0; i < pos.count; i++) { const a = Math.atan2(pos.getY(i), pos.getX(i)); const k = (a + Math.PI * 0.45) / (Math.PI * 0.9); col.push(k, k, k); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.2, 1.8), vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const mesh = new THREE.Mesh(g, m);
    mesh.rotation.set(-Math.PI / 2, 0, 0);
    const grp = new THREE.Group(); grp.add(mesh); grp.position.set(p.pos.x, p.pos.y + 1.1, p.pos.z);
    grp.rotation.y = p.facing - Math.PI / 2;
    grp.rotateZ(0.18);
    this.scene.add(grp);
    this.trails.push({ obj: grp, t: 0, life: 0.18 });
  }

  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      const dist = e.pos.distanceTo(p.pos);
      e.rig.visible = dist < 45;
      if (e.dead) {
        e.st.deadT += dt; e.deadT += dt;
        if (e.boss) animateIfrit(e.rig, e.st, this.t); else animateHumanoid(e.rig, e.st, this.t, dt);
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
      // hidden ghouls rise
      if (e.hidden) {
        if (dist < 13) { e.hidden = false; e.riseT = 0; e.alerted = true; this.fx.dust(e.pos, 14, 1.2); this.audio.grunt(); }
        else { e.rig.position.set(e.pos.x, e.pos.y - 2.2, e.pos.z); continue; }
      }
      if (e.riseT < 1) {
        e.riseT = Math.min(1, e.riseT + dt * 0.9);
        e.rig.position.set(e.pos.x, e.pos.y - 2.2 * (1 - e.riseT), e.pos.z);
        if (Math.random() < 0.3) this.fx.dust(e.pos, 1, 0.8);
        animateHumanoid(e.rig, e.st, this.t, dt);
        continue;
      }
      if (e.boss) { this.bossAI(e, dt); e.pos.y = heightAt(e.pos.x, e.pos.z); e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; animateIfrit(e.rig, e.st, this.t); continue; }
      if (!e.alerted && dist < (e.T.ranged ? 16 : 13) && !p.dead) e.alerted = true;
      let moving = false;
      if (e.st.action) {
        e.st.actionT += dt / e.T.atk * 1.6;
        if (!e.didHit && e.st.actionT > 0.6) {
          e.didHit = true;
          if (e.T.ranged) this.shootArrow(e);
          else if (dist < e.range + 0.9 && !p.dead) this.damagePlayer(e.dmg, e.pos);
        }
        if (e.st.actionT >= 1) e.st.action = null;
      } else if (e.alerted && !p.dead) {
        const face = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
        e.facing += angDiff(e.facing, face) * Math.min(1, dt * 8);
        if (dist > e.range) {
          const wp = this.steer(e, p.pos);
          const dir = tmp.set(wp.x - e.pos.x, 0, wp.z - e.pos.z).normalize();
          e.pos.addScaledVector(dir, e.speed * dt); moving = true;
          if (e.path) e.facing += angDiff(e.facing, Math.atan2(dir.x, dir.z)) * Math.min(1, dt * 8);
        } else if (e.T.ranged && dist < 6) {
          const dir = tmp.copy(e.pos).sub(p.pos).setY(0).normalize();
          e.pos.addScaledVector(dir, e.speed * 0.7 * dt); moving = true;
        } else if (e.atkCd <= 0) {
          e.st.action = e.T.action; e.st.actionT = 0; e.didHit = false; e.atkCd = e.T.atk * rand(0.9, 1.3);
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
      resolve(e.pos, e.radius);
      e.pos.y = heightAt(e.pos.x, e.pos.z);
      e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend, moving ? (e.alerted ? 1 : 0.5) : 0, Math.min(1, dt * 8));
      e.st.phase += dt * (moving ? (e.alerted ? e.speed : 1.2) * 1.6 : 0);
      e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing;
      animateHumanoid(e.rig, e.st, this.t, dt);
    }
    // cleanup removed
    if (this.enemies.some((e) => e.removed)) this.enemies = this.enemies.filter((e) => !e.removed);
  }

  shootArrow(e) {
    const p = this.player;
    const from = e.pos.clone(); from.y += 1.4;
    const to = p.pos.clone(); to.y += 1.0;
    const dir = to.sub(from).normalize();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a2a1a }));
    m.position.copy(from); m.lookAt(from.clone().add(dir)); this.scene.add(m);
    this.projectiles.push({ mesh: m, vel: dir.multiplyScalar(22), grav: 0, life: 1.5, owner: 'enemy', kind: 'arrow', dmg: e.dmg });
    this.audio.whoosh();
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
      } else if (q.kind === 'arrow') {
        if (p.pos.distanceTo(tmp.copy(mp).setY(p.pos.y)) < 0.6) { this.damagePlayer(q.dmg, mp); dead = true; }
        const c = mp.clone(); if (resolve(c, 0.05, true)) dead = true;
      }
      if (dead) { this.scene.remove(q.mesh); this.projectiles.splice(i, 1); }
    }
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const tr = this.trails[i]; tr.t += dt;
      tr.obj.children[0].material.opacity = 0.85 * (1 - tr.t / tr.life);
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
      } else if (h.kind === 'telegraph') {
        h.ring.material.opacity = 0.85; h.fill.material.opacity = 0.06 + k * 0.22;
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
    const dist = 13.5 * this.camZoom * this.autoZoom;
    const target = tmp.set(p.x, p.y + dist * 1.0, p.z + dist * 0.78);
    if (!this.camInit) { this.camPos.copy(target); this.camInit = true; }
    this.camPos.lerp(target, Math.min(1, dt * 6));
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 1.8);
      const s = this.shake * this.shake * 0.8;
      this.camera.position.x += (Math.random() - 0.5) * s; this.camera.position.y += (Math.random() - 0.5) * s; this.camera.position.z += (Math.random() - 0.5) * s;
    }
    this.camera.lookAt(this.camPos.x, this.camPos.y - dist * 1.0 + 1.0, this.camPos.z - dist * 0.78);
  }
}
