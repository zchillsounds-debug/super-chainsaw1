import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Arena } from './arena.js';
import { FX } from './fx.js';
import { Input, isTouch } from './input.js';
import { Hud } from './hud.js';
import { Battle } from './battle.js';
import { Critter, shopHat } from './critters.js';
import { CRITTERS, CUPS, withGear } from './data.js';
import { Screens } from './screens.js';
import { initAudio, playMusic, sfx } from './audio.js';
import { save } from './save.js';
import { applySettings } from './settings.js';

const Q = new URLSearchParams(location.search);

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uImpact: { value: 0 }, uVig: { value: 0.9 }, uSat: { value: 1.12 }, uFlash: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uImpact, uVig, uSat, uFlash; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, uSat);
      vec2 q = vUv - 0.5;
      c *= 1.0 - dot(q, q) * uVig * 0.55;
      if (uImpact > 0.0) {
        float m = step(0.42, l);
        vec3 imp = mix(vec3(1.0, 0.96, 0.9), vec3(0.09, 0.03, 0.14), m);
        c = mix(c, imp, uImpact);
      }
      c = mix(c, vec3(1.0), uFlash);
      gl_FragColor = vec4(c, 1.0);
    }`,
};

class Game {
  constructor() {
    const canvas = document.getElementById('c');
    this.ui = document.getElementById('ui');
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    // 'auto' starts at medium on phones and steps down if frames run long
    this.qualityPref = Q.get('q') || save.settings.quality;
    this.quality = this.qualityPref === 'auto' ? (isTouch ? 'med' : 'high') : this.qualityPref;
    this.perf = { acc: 0, n: 0, slow: 0 };
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 900);
    this.camera.position.set(0, 6, 16);

    this.arena = new Arena(this.scene, 'meadow');
    this.arena.key = 'meadow';
    this.fx = new FX(this.scene, this.ui, this.camera);
    this.input = new Input(this.ui);
    this.hud = new Hud(this.ui, this);

    // post: MSAA scene target -> bloom -> tone map/sRGB -> anime grade
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: this.quality === 'low' ? 0 : 4 });
    this.composer = new EffectComposer(r, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.4, 0.92);
    this.bloom.enabled = this.quality !== 'low';
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.impactT = 0;

    this.portraits = new Map();
    this.resize();
    addEventListener('resize', () => this.resize());

    document.body.classList.toggle('is-touch', isTouch);
    const rh = document.createElement('div');
    rh.className = 'rotate-hint';
    rh.innerHTML = '<div><svg viewBox="0 0 64 64"><rect x="18" y="4" width="28" height="56" rx="6" fill="none" stroke="#fff" stroke-width="4"/><circle cx="32" cy="52" r="3" fill="#fff"/></svg><b>Turn your phone sideways</b><span>Critter Clash plays best in landscape.</span></div>';
    this.ui.appendChild(rh);
    this.screens = new Screens(this);
    this.battle = null;
    applySettings(this);
    this.setupLifecycle();
    this.paused = false;
    this.clock = new THREE.Clock();
    this.t = 0;
    this.showcase = [];

    const unlock = () => { initAudio(); this.screens.onAudioUnlocked?.(); };
    addEventListener('pointerdown', unlock, { once: false });
    addEventListener('keydown', unlock, { once: false });

    this.autoplay = Q.has('auto');
    r.setAnimationLoop(() => this.frame());
    window.__game = this;
    window.__save = save;
    window.__critters = CRITTERS; window.__cups = CUPS; window.__grow = withGear;
    // headless helper: advance the simulation in fixed steps without rendering
    window.__sim = (sec, dt = 1 / 60) => { for (let t = 0; t < sec; t += dt) this.step(dt); this.clock.getDelta(); };
    this.boot();
  }

  // splash: bake portraits and compile every critter's shaders up front so the first fight doesn't hitch
  async boot() {
    const splash = document.getElementById('splash');
    const bar = splash?.querySelector('.sp-bar i'), msg = splash?.querySelector('.sp-msg');
    const lines = ['Waking up the critters...', 'Fluffing tails...', 'Polishing the stadium...', 'Warming up the crowd...'];
    const tick = () => new Promise((res) => setTimeout(res, 0));
    const jobs = CRITTERS.length + 2;
    let done = 0;
    const progress = () => { done++; if (bar) bar.style.width = Math.round(done / jobs * 100) + '%'; if (msg) msg.textContent = lines[Math.min(lines.length - 1, Math.floor(done / jobs * lines.length))]; };
    try {
      await document.fonts?.ready;
      const warm = [];
      for (const def of CRITTERS) {
        this.portrait(def);
        const c = new Critter(def);
        c.root.position.set(0, -40, 0);
        this.scene.add(c.root);
        warm.push(c);
        progress();
        await tick();
      }
      this.renderer.compile(this.scene, this.camera);
      progress();
      await tick();
      this.composer.render();
      for (const c of warm) this.scene.remove(c.root);
      progress();
    } catch (e) { console.warn('prewarm', e); }
    if (Q.has('play')) {
      // &pl= / &cl= give each side a level, which also picks its grown form (Lv 7 / Lv 14)
      const p = withGear(CRITTERS.find((c) => c.id === Q.get('p')) || CRITTERS[0], +(Q.get('pl') || 1));
      const c = withGear(CRITTERS.find((c) => c.id === Q.get('c')) || CRITTERS[1], +(Q.get('cl') || 1));
      this.startBattle(p, c, { playerLevel: +(Q.get('pl') || 1), cpuLevel: +(Q.get('cl') || 1), difficulty: +(Q.get('d') ?? 0.5), mods: Q.get('mods')?.split(',') || [], training: Q.has('train') });
    } else this.screens.title();
    if (splash) { splash.classList.add('out'); setTimeout(() => splash.remove(), 500); }
    this.booted = true;
    this.clock.getDelta();
    window.__ready = true;
  }

  setQuality(pref) {
    this.qualityPref = pref;
    const q = pref === 'auto' ? this.quality : pref;
    this.quality = q;
    this.bloom.enabled = q !== 'low';
    const sm = q === 'low' ? 1024 : 2048;
    const sun = this.arena.sun;
    if (sun.shadow.mapSize.x !== sm) { sun.shadow.mapSize.set(sm, sm); sun.shadow.map?.dispose(); sun.shadow.map = null; }
    this.arena.setDetail(q);
    this.resize();
  }

  // frame-time watchdog for 'auto' quality
  trackPerf(dt) {
    const world = this.screens?.mode === 'world' && !this.battle;
    if (this.qualityPref !== 'auto' || !world && (!this.battle || this.battle.phase !== 'fight')) return;
    if (world && (dt > 0.25 || this.ui.querySelector('.wd-fade'))) return; // a map load is one slow frame on purpose, not a slow phone
    const P = this.perf;
    P.acc += dt; P.n++;
    if (P.acc < 2) return;
    const avg = P.acc / P.n;
    P.acc = 0; P.n = 0;
    if (avg > 1 / 42) P.slow++; else P.slow = 0;
    if (P.slow >= 2 && this.quality !== 'low') {
      P.slow = 0;
      this.quality = this.quality === 'high' ? 'med' : 'low';
      this.setQuality('auto');
    }
  }

  // Android back button (history), app switching, audio suspend
  setupLifecycle() {
    history.replaceState({ base: true }, '');
    history.pushState({ guard: true }, '');
    addEventListener('popstate', () => {
      history.pushState({ guard: true }, '');
      this.back();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.battle && !this.paused && this.battle.phase !== 'done') this.pause();
    });
  }

  back() {
    const modal = this.ui.querySelector('.modal-wrap:not(.pause)');
    if (this.modalClose) { this.modalClose(); return; }
    if (modal) { modal.remove(); return; }
    // Professor Pecan's dialog: back moves it on (its last line runs whatever comes next), so nothing gets skipped
    const prof = this.ui.querySelector('.prof-wrap');
    if (prof) { prof.click(); return; } // same as tapping it: finish the line, then move on
    if (this.battle && this.battle.phase !== 'done') { this.pause(); return; }
    this.screens.backFn?.();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    const dprCap = this.quality === 'low' ? 1 : this.quality === 'med' ? 1.5 : 2;
    const dpr = Math.min(devicePixelRatio || 1, dprCap);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px';
    this.renderer.domElement.style.height = h + 'px';
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    document.body.classList.toggle('portrait', h > w);
  }

  setArena(key) {
    if (this.arena.key === key) return;
    const sun = this.arena.sun;
    this.arena.dispose();
    this.arena = new Arena(this.scene, key);
    this.arena.key = key;
    void sun;
    this.setQuality(this.qualityPref);
  }

  impactFrame(t) { if (!this.reduceFlash) this.impactT = Math.max(this.impactT, t); }

  // 3D-rendered portrait of a critter's head, cached as a data URL
  // full: frame the whole body (the growing scene) instead of the head
  portrait(def, S = 256, full = false, hat = null) {
    const key = def.id + (def.skin || '') + (def.gear || '') + (def.stage ? 's' + def.stage : '') + (S !== 256 ? '@' + S : '') + (full ? 'F' : '') + (hat ? 'h' + hat : '');
    if (this.portraits.has(key)) return this.portraits.get(key);
    const scene = new THREE.Scene();
    const cr = new Critter(def);
    if (hat && shopHat(cr, hat) && cr.gearCrown) cr.gearCrown.visible = false; // Adventure hat picker: the hero wearing each hat
    cr.update(0.016);
    cr.root.rotation.y = -0.35;
    scene.add(cr.root);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8888aa, 1.6));
    const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(-2, 3, 4); scene.add(d);
    const B = def.body;
    const Z = def.size || 1, headY = (B.legLen * 0.9 + B.h * 0.82 + B.headR * (hat ? 1.05 : 0.78)) * Z, zoom = Z * (def.portraitZoom || 1) * (hat ? 1.18 : 1);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    if (full) {
      const H = (B.legLen + B.h + B.headR * 2.3) * Z + 0.2, dist = H * 1.85;
      cam.position.set(-0.3 * dist / 2.6, H * 0.55, dist);
      cam.lookAt(0, H * 0.47, 0);
    } else {
      cam.position.set(-0.35 * zoom, headY + 0.15 * zoom + (zoom - Z) * 0.6, 2.6 * zoom);
      cam.lookAt(0, headY - 0.05 + (zoom - Z) * 0.6, 0);
    }
    const rt = new THREE.WebGLRenderTarget(S, S, { samples: 4 });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    const r = this.renderer;
    const prevTM = r.toneMapping;
    r.setRenderTarget(rt);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(scene, cam);
    const px = new Uint8Array(S * S * 4);
    r.readRenderTargetPixels(rt, 0, 0, S, S, px);
    r.setRenderTarget(null);
    r.toneMapping = prevTM;
    const c = document.createElement('canvas'); c.width = c.height = S;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) img.data.set(px.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
    ctx.putImageData(img, 0, 0);
    const url = c.toDataURL();
    rt.dispose();
    this.portraits.set(key, url);
    return url;
  }

  // ---- showcase critters on the field (title / select) ----
  setShowcase(defs, layout = 'line') {
    for (const s of this.showcase) this.scene.remove(s.root);
    this.showcase = defs.map((def, i) => {
      const c = new Critter(def);
      this.scene.add(c.root);
      const n = defs.length;
      // a gentle arc; big teams squeeze closer and curve deeper
      const gap = n > 6 ? 1.5 : 1.9, k = i - (n - 1) / 2;
      if (layout === 'line') c.root.position.set(k * gap, 0, -k * k * (n > 6 ? 0.16 : 0.12) - Math.abs(k) * 0.2);
      else c.root.position.set(0, 0, 0);
      c.idx = i;
      return c;
    });
  }

  updateShowcase(dt) {
    for (const c of this.showcase) {
      if (c.camp) continue; // Critter Camp animates its own wanderers
      const t = c.t, P = c.pose;
      c.resetPose();
      const ph = t * 5 + c.idx * 1.3;
      const hop = Math.max(0, Math.sin(ph));
      P.y = hop * 0.25; P.sy = 1 + Math.sin(ph * 2) * 0.05; P.sx = 1 - Math.sin(ph * 2) * 0.03;
      P.armLz = P.armRz = 0.3 + hop * 0.8; P.tail = 0.8;
      P.headRoll = Math.sin(t * 2 + c.idx) * 0.12;
      if (c.cheer > 0) { c.cheer -= dt; P.y = Math.abs(Math.sin(t * 9)) * 0.6; P.armLz = P.armRz = 2.4; c.emote('happy', 'open', 0.2); }
      c.update(dt);
    }
  }

  // ---- battles ----
  startBattle(pDef, cDef, opts = {}) {
    this.endBattle();
    this.lastStart = [pDef, cDef, opts];
    this.setArena(opts.arena || Q.get('arena') || 'meadow');
    this.setShowcase([]);
    this.screens.hideAll();
    this.input.showTouch(true);
    document.body.classList.add('in-battle'); document.body.classList.remove('at-results');
    screen.orientation?.lock?.('landscape').catch(() => {});
    this.battle = new Battle(this, pDef, cDef, {
      ...opts,
      onEnd: (won, stats) => setTimeout(() => this.screens.results(won, stats, pDef, cDef, opts), 900),
    });
  }

  endBattle() {
    if (this.battle) { this.battle.dispose(); this.battle = null; }
    this.arena.setOpen(false);
    this.arena.tint(null);
    this.hud.show(false);
    this.input.showTouch(false);
    document.body.classList.remove('in-battle', 'at-results');
  }

  pause() {
    if (this.photo) { this.photo.close(); return; }
    if (!this.battle || this.battle.phase === 'done') return;
    this.paused = !this.paused;
    this.screens.pauseMenu(this.paused);
    sfx.ui(this.paused ? 'ok' : 'back');
  }

  frame() {
    const rawDt = Math.min(this.clock.getDelta(), 0.1);
    if (this.booted) this.trackPerf(rawDt); // boot frames are slow on purpose; don't let them lower the quality
    this.step(rawDt);
    this.grade.uniforms.uImpact.value = this.impactT > 0 ? 1 : 0;
    this.composer.render(rawDt);
  }

  step(rawDt) {
    this.t += rawDt;
    this.impactT -= rawDt; // counted here so __sim steps it too
    this.input.poll();
    if (this.input.pressed.pause) this.pause();
    if (this.photo) this.photo.update();
    if (!this.paused) {
      if (this.battle) {
        this.battle.update(rawDt);
        // the shower followed us off the route: rain over the open field
        if (this.arena.rainy) for (let n = Math.floor(rawDt * 120 + Math.random()); n > 0; n--) this.fx.spawn({ x: (Math.random() - 0.5) * 30, y: 7 + Math.random() * 3, z: (Math.random() - 0.5) * 22, vy: -15, vx: -1.2, color: 0xe8f0ff, alpha: 0.6, size: 1.2, stretch: 0.05, rot: Math.PI / 2 + 0.08, life: 0.6, shape: 'spark', additive: false });
      } else {
        this.screens.update(rawDt);
        // menus: same soft camera-side fill the battle uses in backlit arenas
        const fill = this.arena.fill, cp = this.camera.position;
        fill.position.set(cp.x, cp.y + 3, cp.z); fill.target.position.set(0, 0.8, 0);
        fill.intensity = (this.arena.A.fillI || 0) + 0.15;
      }
      this.updateShowcase(rawDt);
      this.arena.update(rawDt, this.t);
      this.fx.update(rawDt);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => new Game());
export { playMusic };
