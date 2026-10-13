// Billboard particle pools (shapes drawn in the shader) and screen-space comic text.
import * as THREE from 'three';
import { TYPES } from './data.js';

const SHAPE = { glow: 0, star: 1, spark: 2, ring: 3, puff: 4, drop: 5, leaf: 6, bolt: 7, burst: 8, confetti: 9 };

const vert = `
attribute vec3 iPos; attribute vec4 iCol; attribute vec4 iData; // size, rot, shape, stretch
varying vec2 vUv; varying vec4 vCol; varying float vShape;
void main(){
  vUv = uv; vCol = iCol; vShape = iData.z;
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  float c = cos(iData.y), s = sin(iData.y);
  vec2 p = position.xy * iData.x;
  p.y *= iData.w;
  mv.xy += vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  gl_Position = projectionMatrix * mv;
}`;

const frag = `
varying vec2 vUv; varying vec4 vCol; varying float vShape;
float star(vec2 p, float n, float r1, float r2){
  float a = atan(p.y, p.x); float l = length(p);
  float k = 3.14159265 / n;
  float m = mod(a + 1.5707963, 2.0 * k) - k;
  float r = mix(r1, r2, pow(abs(m) / k, 0.7));
  return l - r;
}
void main(){
  vec2 p = vUv * 2.0 - 1.0;
  float a = 0.0; vec3 col = vCol.rgb;
  int sh = int(vShape + 0.5);
  if (sh == 0) { a = pow(max(1.0 - length(p), 0.0), 1.6); }
  else if (sh == 1) { float d = star(p, 5.0, 0.95, 0.42); a = smoothstep(0.06, -0.02, d); col = mix(vec3(0.15,0.08,0.2), col, smoothstep(0.02, -0.08, d)); }
  else if (sh == 2) { a = pow(max(1.0 - length(p * vec2(1.0, 0.25)), 0.0), 2.0) * smoothstep(1.0, 0.6, abs(p.y)); }
  else if (sh == 3) { float l = length(p); a = smoothstep(0.08, 0.0, abs(l - 0.82)) ; }
  else if (sh == 4) { float l = length(p); a = smoothstep(1.0, 0.94, l); col = mix(col * 0.72, col, smoothstep(-0.4, 0.5, p.y - p.x * 0.3)); col = mix(col * 0.5, col, smoothstep(1.0, 0.86, l)); }
  else if (sh == 5) { vec2 q = p; q.y += 0.25; float d = length(q * vec2(1.0, 0.8)) - 0.6 + max(p.y, 0.0) * 0.5; a = smoothstep(0.05, -0.05, d); col += smoothstep(0.0,-0.3,length(p - vec2(-0.2,-0.2)) - 0.18) * 0.6; }
  else if (sh == 6) { float d = length(p * vec2(1.8, 1.0)) - 0.9 + abs(p.x) * 0.2; a = smoothstep(0.05, -0.05, d); col *= 0.8 + 0.4 * step(abs(p.x), 0.05); }
  else if (sh == 8) { float d = star(p, 9.0, 1.0, 0.45); a = smoothstep(0.04, -0.04, d); float inner = smoothstep(0.02, -0.06, star(p, 9.0, 0.7, 0.3)); col = mix(vec3(0.16,0.07,0.2), mix(col, vec3(1.0), inner), smoothstep(0.0, -0.07, d)); }
  else if (sh == 9) { a = step(abs(p.x), 0.45) * step(abs(p.y), 0.9); col *= 0.85 + 0.3 * step(0.0, p.x); }
  else { vec2 q = p; float d = abs(q.x + sin(q.y * 6.0) * 0.35) - 0.16 * (1.0 - abs(q.y)); a = smoothstep(0.06, -0.02, d) * step(abs(q.y), 0.95); }
  a *= vCol.a;
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
}`;

class Pool {
  constructor(scene, max, blending) {
    this.max = max;
    const g = new THREE.InstancedBufferGeometry();
    const base = new THREE.PlaneGeometry(1, 1);
    g.index = base.index;
    g.setAttribute('position', base.attributes.position);
    g.setAttribute('uv', base.attributes.uv);
    this.pos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.col = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.dat = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.pos); g.setAttribute('iCol', this.col); g.setAttribute('iData', this.dat);
    g.instanceCount = 0;
    const m = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending });
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = blending === THREE.AdditiveBlending ? 6 : 5;
    scene.add(this.mesh);
    this.parts = [];
  }
  add(p) { if (this.parts.length < this.max) this.parts.push(p); }
  update(dt) {
    const ps = this.parts;
    let n = 0;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.age += dt;
      if (p.age >= p.life) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
    }
    for (const p of ps) {
      const k = p.age / p.life;
      p.vy -= p.grav * dt;
      const dr = Math.exp(-p.drag * dt);
      p.vx *= dr; p.vy *= dr; p.vz *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.floor && p.y < 0.05) { p.y = 0.05; p.vy *= -0.4; }
      p.rot += p.spin * dt;
      const size = p.size * (p.grow >= 0 ? 1 + p.grow * k : (1 - k) ** (-p.grow));
      const fade = p.fadeIn ? Math.min(1, p.age / p.fadeIn) : 1;
      const alpha = p.alpha * fade * (k < p.hold ? 1 : 1 - (k - p.hold) / (1 - p.hold));
      this.pos.array.set([p.x, p.y, p.z], n * 3);
      this.col.array.set([p.r, p.g, p.b, alpha], n * 4);
      this.dat.array.set([size, p.rot, p.shape, p.stretch], n * 4);
      n++;
    }
    this.mesh.geometry.instanceCount = n;
    this.pos.needsUpdate = this.col.needsUpdate = this.dat.needsUpdate = true;
    this.pos.clearUpdateRanges(); this.col.clearUpdateRanges(); this.dat.clearUpdateRanges();
  }
  clear() { this.parts.length = 0; }
}

const tmpC = new THREE.Color();

// elemental flavour layered on top of the generic impact
const TYPE_SPARKS = {
  fire(fx, p, s) {
    fx.burst(p, { n: 7 * s, speed: 3, up: 3.5, color: 0xff7a1a, size: 0.6, life: 0.45, shape: 'glow', grav: -3, drag: 3, grow: -0.6 });
    fx.burst(p, { n: 8 * s, speed: 6, up: 4, color: 0xffd040, size: 0.12, life: 0.7, shape: 'glow', grav: 6, drag: 1 });
    fx.burst(p, { n: 3 * s, speed: 1.5, up: 2, color: 0x5a4a48, size: 0.5, life: 0.8, shape: 'puff', additive: false, grav: -2, drag: 3, grow: 1 });
  },
  water(fx, p, s) {
    fx.burst(p, { n: 12 * s, speed: 6, up: 4, color: 0x7fd4ff, size: 0.28, life: 0.6, shape: 'drop', additive: false, grav: 16, drag: 1, stretch: 1 });
    fx.spawn({ ...p, color: 0xbfeaff, size: 2.2 * s, life: 0.3, shape: 'ring', additive: false, grow: 1.2, alpha: 0.8 });
  },
  leaf(fx, p, s) {
    fx.burst(p, { n: 9 * s, speed: 5, up: 3, color: 0x6cdc5a, size: 0.34, life: 0.9, shape: 'leaf', additive: false, grav: 4, drag: 3, spin: 12, grow: 0 });
    fx.burst(p, { n: 4 * s, speed: 4, up: 3, color: 0xfff1a8, size: 0.26, life: 0.7, shape: 'star', additive: false, grav: 5, drag: 2, spin: 8 });
  },
  spark(fx, p, s) {
    for (let i = 0; i < 4 * s; i++) fx.spawn({ x: p.x + (Math.random() - 0.5) * 0.8, y: p.y + (Math.random() - 0.5) * 0.8, z: p.z + (Math.random() - 0.5) * 0.8, color: 0xfff060, size: 1.1, life: 0.16, shape: 'bolt', rot: Math.random() * 6 });
    fx.burst(p, { n: 10 * s, speed: 9, up: 1, color: 0xbff4ff, size: 0.14, life: 0.25, shape: 'glow', grav: 0, drag: 6 });
  },
  stone(fx, p, s) {
    fx.burst(p, { n: 9 * s, speed: 6, up: 5, color: 0x9a7350, size: 0.24, life: 0.8, shape: 'star', additive: false, grav: 20, drag: 0.5, spin: 16, grow: 0 });
    fx.burst({ x: p.x, y: p.y - 0.3, z: p.z }, { n: 5 * s, speed: 2.5, up: 1, color: 0xd8c0a0, size: 0.6, life: 0.6, shape: 'puff', additive: false, grav: -1, drag: 4, grow: 1 });
  },
  gust(fx, p, s) {
    for (let i = 0; i < 3; i++) fx.spawn({ ...p, color: 0xe0e8ff, size: (1.2 + i * 0.7) * s, life: 0.25 + i * 0.07, shape: 'ring', grow: 1.6, alpha: 0.7 });
    fx.burst(p, { n: 6 * s, speed: 5, up: 1.5, color: 0xf2f4ff, size: 0.45, life: 0.45, shape: 'puff', additive: false, grav: 0, drag: 5, grow: 1.2 });
  },
};

export class FX {
  constructor(scene, ui, camera) {
    this.add = new Pool(scene, 1400, THREE.AdditiveBlending);
    this.norm = new Pool(scene, 900, THREE.NormalBlending);
    this.ui = ui;
    this.camera = camera;
    this.texts = [];
    this.layer = document.createElement('div');
    this.layer.className = 'fxtext-layer';
    ui.appendChild(this.layer);
    this.shocks = [];
    this.scene = scene;
    this.ringGeo = new THREE.RingGeometry(0.85, 1, 48);
    this.ringGeo.rotateX(-Math.PI / 2);
  }

  spawn({ x = 0, y = 0, z = 0, vx = 0, vy = 0, vz = 0, color = 0xffffff, alpha = 1, size = 0.3, life = 0.5, shape = 'glow',
    grav = 0, drag = 0, spin = 0, rot = 0, grow = 0, stretch = 1, hold = 0.4, additive = true, floor = false, fadeIn = 0 }) {
    tmpC.set(color);
    (additive ? this.add : this.norm).add({ x, y, z, vx, vy, vz, r: tmpC.r, g: tmpC.g, b: tmpC.b, alpha, size, life, age: 0,
      shape: SHAPE[shape] ?? 0, grav, drag, spin, rot, grow, stretch, hold, floor, fadeIn });
  }

  // radial burst helper
  burst(p, { n = 12, speed = 5, up = 2, color = 0xffffff, size = 0.25, life = 0.45, shape = 'glow', grav = 6, drag = 2, additive = true, spread = 1, spin = 0, grow = -1, stretch = 1 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, b = (Math.random() - 0.3) * spread;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.spawn({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * s, vy: up + b * s, vz: Math.sin(a) * s, color, size: size * (0.6 + Math.random() * 0.8),
        life: life * (0.6 + Math.random() * 0.7), shape, grav, drag, additive, spin: spin * (Math.random() - 0.5), rot: Math.random() * 6, grow, stretch });
    }
  }

  hit(p, color = 0xffe070, big = false, type = null) {
    if (type && TYPE_SPARKS[type]) TYPE_SPARKS[type](this, p, big ? 1.4 : 1);
    this.spawn({ ...p, color: 0xffffff, size: big ? 2.4 : 1.5, life: 0.14, shape: 'glow', grow: 0.6, alpha: 0.9 });
    // anime impact star
    this.spawn({ ...p, color, size: big ? 2.6 : 1.5, life: big ? 0.2 : 0.13, shape: 'burst', additive: false, rot: Math.random() * 6, grow: 0.35, hold: 0.6 });
    this.spawn({ ...p, color, size: big ? 3.2 : 2.0, life: 0.22, shape: 'ring', grow: 1.4 });
    for (let i = 0; i < (big ? 10 : 6); i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn({ ...p, color, size: big ? 1.2 : 0.8, stretch: 0.18, rot: a, life: 0.16 + Math.random() * 0.08, shape: 'spark', grow: 0.8 });
    }
    this.burst(p, { n: big ? 14 : 7, speed: big ? 9 : 6, up: 2, color, size: 0.16, life: 0.4, grav: 10 });
    this.burst(p, { n: big ? 5 : 3, speed: 3, up: 3, color: 0xffe14d, size: 0.42, life: 0.7, shape: 'star', additive: false, grav: 9, spin: 14, grow: -0.5 });
  }

  confetti(p, n = 90) {
    const cols = [0xff5a8a, 0xffd23f, 0x3dc8ff, 0x6cff6a, 0xb39cff, 0xffffff];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 6;
      this.spawn({ x: p.x + (Math.random() - 0.5) * 3, y: p.y + Math.random() * 2, z: p.z + (Math.random() - 0.5) * 3, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: 5 + Math.random() * 7,
        color: cols[i % cols.length], size: 0.22, stretch: 0.6, life: 2.2 + Math.random(), shape: 'confetti', additive: false, grav: 5, drag: 1.6, spin: (Math.random() - 0.5) * 20, rot: Math.random() * 6, hold: 0.75 });
    }
  }

  dust(p, n = 6, s = 1) {
    this.burst({ x: p.x, y: 0.12, z: p.z }, { n, speed: 2.4 * s, up: 0.9, color: 0xf3e6c8, size: 0.42 * s, life: 0.55, shape: 'puff', grav: -0.5, drag: 4, additive: false, spread: 0.2, grow: 0.8 });
  }

  shock(p, color = 0xffffff, r = 3, life = 0.35) {
    const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.set(p.x, 0.08, p.z);
    this.scene.add(m);
    this.shocks.push({ m, t: 0, life, r });
  }

  // speech bubble that rides above a fighter's head
  say(f, str, type) {
    for (const t of this.texts) if (t.follow === f) t.life = Math.min(t.life, t.t + 0.1);
    const el = document.createElement('div');
    el.className = 'fxtext say';
    el.textContent = str;
    el.style.setProperty('--tc', TYPES[type]?.color || '#fff');
    this.layer.appendChild(el);
    this.texts.push({ el, p: new THREE.Vector3(), t: 0, life: 1.5, dx: 0, rot: (Math.random() - 0.5) * 6, follow: f });
  }

  // comic text popping at a world position
  text(p, str, cls = '', life = 0.8) {
    const el = document.createElement('div');
    el.className = 'fxtext ' + cls;
    el.textContent = str;
    this.layer.appendChild(el);
    this.texts.push({ el, p: new THREE.Vector3(p.x, p.y, p.z), t: 0, life, dx: (Math.random() - 0.5) * 40, rot: (Math.random() - 0.5) * 18 });
  }

  update(dt) {
    this.add.update(dt);
    this.norm.update(dt);
    for (let i = this.shocks.length - 1; i >= 0; i--) {
      const s = this.shocks[i];
      s.t += dt;
      const k = s.t / s.life;
      if (k >= 1) { this.scene.remove(s.m); s.m.material.dispose(); this.shocks.splice(i, 1); continue; }
      s.m.scale.setScalar(0.3 + (1 - (1 - k) ** 3) * s.r);
      s.m.material.opacity = 1 - k;
    }
    const v = new THREE.Vector3();
    const W = innerWidth, H = innerHeight;
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const tx = this.texts[i];
      tx.t += dt;
      if (tx.t > tx.life) { tx.el.remove(); this.texts.splice(i, 1); continue; }
      if (tx.follow) { const h = tx.follow.headPos(); tx.p.set(h.x, h.y + 0.45, h.z); }
      v.copy(tx.p).project(this.camera);
      const k = tx.t / tx.life;
      const pop = k < 0.15 ? 0.4 + (k / 0.15) * 0.9 : k < 0.25 ? 1.3 - (k - 0.15) * 3 : 1;
      const x = (v.x * 0.5 + 0.5) * W + tx.dx * k, y = (-v.y * 0.5 + 0.5) * H - (tx.follow ? 0 : k * 50);
      tx.el.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%) rotate(${tx.rot}deg) scale(${pop})`;
      tx.el.style.opacity = k > 0.75 ? (1 - k) / 0.25 : 1;
      if (tx.follow) {
        // bubble above the head; in tight close-ups it would leave the screen, so it moves beside the head
        const side = y < 150;
        let bx = x, by = y;
        if (side) { const h = tx.follow.headPos(); v.set(h.x, h.y - 0.45, h.z).project(this.camera); bx = (v.x * 0.5 + 0.5) * W + 150; by = (-v.y * 0.5 + 0.5) * H; }
        bx = Math.min(W - 110, Math.max(110, bx)); by = Math.max(110, by);
        tx.el.classList.toggle('side', side);
        tx.el.style.transform = `translate(${bx}px, ${by}px) translate(-50%,${side ? '-50%' : '-100%'}) rotate(${tx.rot}deg) scale(${Math.min(1, pop)})`;
      }
    }
  }

  clear() {
    this.add.clear(); this.norm.clear();
    for (const t of this.texts) t.el.remove();
    this.texts.length = 0;
    for (const s of this.shocks) this.scene.remove(s.m);
    this.shocks.length = 0;
  }
}
