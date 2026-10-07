import * as THREE from 'three';
import { particleSprite } from './textures.js';

// Pooled CPU particle system with two blend layers (additive glow + alpha smoke).
export const FX_TIME = { value: 0 };
class Layer {
  constructor(max, additive) {
    this.max = max; this.n = 0;
    this.p = []; // particle structs
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    // Round 19: particles are shaded, not stamped. Glow (fire, sparks, embers) gets a hot core and a flickering,
    // noise-torn edge; smoke gets wispy, billowing breakup that turns slowly. Each particle carries its own seed.
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: particleSprite() }, uScale: { value: 600 }, uTime: FX_TIME },
      vertexShader: `attribute float size; attribute vec4 color; varying vec4 vC; varying float vSeed, vPx; uniform float uScale;
        void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize = size*uScale/(-mv.z); vPx = gl_PointSize;
          vSeed = fract(sin(dot(floor(position.xz*3.0) + color.rg*7.0, vec2(12.9898,78.233)))*43758.5453); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D uTex; uniform float uTime; varying vec4 vC; varying float vSeed, vPx;
        float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
        void main(){
          vec2 pc = gl_PointCoord - 0.5; float r = length(pc) * 2.0;
          float base = texture2D(uTex, gl_PointCoord).a;
          if (vPx < 6.0) { gl_FragColor = vec4(vC.rgb, vC.a * base); if (gl_FragColor.a < 0.003) discard; return; } // tiny motes: plain
          #if ${additive ? 1 : 0}
            // flame: a hot core, an edge torn by rising noise
            float tn = n(pc * 3.5 + vec2(vSeed * 17.0, -uTime * 2.6)) * 0.65 + n(pc * 8.0 + vec2(-vSeed * 9.0, -uTime * 4.0)) * 0.35;
            float body = smoothstep(1.0, 0.25, r + (tn - 0.5) * 0.7);
            float core = pow(max(0.0, 1.0 - r), 3.0);
            vec3 col = vC.rgb * (0.55 + core * 0.8);
            gl_FragColor = vec4(col, vC.a * body * (0.6 + 0.4 * tn));
          #else
            // smoke: soft billows that roll as they rise
            float a = vSeed * 6.28 + uTime * 0.25 * (vSeed - 0.5); mat2 R = mat2(cos(a), -sin(a), sin(a), cos(a));
            vec2 q = R * pc;
            float b = n(q * 3.0 + vSeed * 31.0) * 0.6 + n(q * 7.0 - vSeed * 13.0 + uTime * 0.2) * 0.4;
            float shape = smoothstep(1.0, 0.35, r + (b - 0.5) * 0.9);
            gl_FragColor = vec4(vC.rgb * (0.85 + 0.3 * b), vC.a * shape * (0.55 + 0.6 * b));
          #endif
          if (gl_FragColor.a < 0.003) discard;
        }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false,
    });
    this.points = new THREE.Points(g, mat); this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 3 : 2;
  }
  spawn(o) {
    if (this.p.length >= this.max) this.p.shift();
    this.p.push({
      x: o.pos.x, y: o.pos.y, z: o.pos.z, vx: o.vel?.x || 0, vy: o.vel?.y || 0, vz: o.vel?.z || 0,
      life: o.life || 1, age: 0, s0: o.size || 0.5, s1: o.size1 ?? (o.size || 0.5), r: o.color.r, g: o.color.g, b: o.color.b,
      a: o.alpha ?? 1, grav: o.gravity || 0, drag: o.drag ?? 0.5, fadeIn: o.fadeIn || 0.05,
    });
  }
  update(dt) {
    const P = this.p;
    let w = 0;
    for (let i = 0; i < P.length; i++) {
      const q = P[i]; q.age += dt;
      if (q.age >= q.life) continue;
      q.vy -= q.grav * dt; const d = Math.exp(-q.drag * dt); q.vx *= d; q.vy *= d; q.vz *= d;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      P[w++] = q;
    }
    P.length = w;
    for (let i = 0; i < w; i++) {
      const q = P[i], t = q.age / q.life;
      this.pos[i * 3] = q.x; this.pos[i * 3 + 1] = q.y; this.pos[i * 3 + 2] = q.z;
      const fa = Math.min(1, t / q.fadeIn) * (1 - t) * (1 - t * 0.3);
      this.col[i * 4] = q.r; this.col[i * 4 + 1] = q.g; this.col[i * 4 + 2] = q.b; this.col[i * 4 + 3] = q.a * fa;
      this.size[i] = q.s0 + (q.s1 - q.s0) * t;
    }
    this.geo.setDrawRange(0, w);
    for (const k of ['position', 'color', 'size']) this.geo.attributes[k].needsUpdate = true;
  }
}

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.glow = new Layer(5000, true); this.smoke = new Layer(3000, false);
    scene.add(this.glow.points, this.smoke.points);
    // flash lights are allocated up front: adding a light later changes the light count, which recompiles
    // every lit shader in the scene (a long freeze, worst in the boss fight)
    this.rings = []; this.lights = [];
    for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 2); l.userData.busy = false; this.lights.push(l); this.scene.add(l); }
    this.flashes = [];
    // compile the ring shader at load: one ring parked far below the ground
    this.ring(new THREE.Vector3(0, -80, 0), 0x000000, 0.1, 0.1, 1e9, 0);
  }
  setScale(h) { this.glow.points.material.uniforms.uScale.value = h * 0.9; this.smoke.points.material.uniforms.uScale.value = h * 0.9; }
  update(dt) {
    FX_TIME.value += dt;
    this.glow.update(dt); this.smoke.update(dt);
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.t += dt;
      const k = r.t / r.life;
      r.mesh.scale.setScalar(r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 3)));
      r.mesh.material.opacity = (1 - k) * r.a;
      if (k >= 1) { this.scene.remove(r.mesh); r.mesh.material.dispose(); this.rings.splice(i, 1); }
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]; f.t += dt;
      f.light.intensity = f.i * Math.max(0, 1 - f.t / f.life);
      if (f.t >= f.life) { f.light.intensity = 0; f.light.userData.busy = false; this.flashes.splice(i, 1); }
    }
  }
  // dynamic light flash from a small pool
  flash(pos, color, intensity = 30, life = 0.3, dist = 10) {
    if (this.reduce) { intensity *= 0.25; life *= 1.5; }
    let l = this.lights.find((x) => !x.userData.busy);
    if (!l) return;
    l.userData.busy = true; l.color.set(color); l.distance = dist; l.position.copy(pos);
    this.flashes.push({ light: l, t: 0, life, i: intensity });
  }
  ring(pos, color, r0, r1, life = 0.5, alpha = 1) {
    // a shockwave: bright leading edge, a soft glow trailing inside it, torn slightly by noise
    if (!this.ringGeo) {
      this.ringGeo = new THREE.CircleGeometry(1, 56).rotateX(-Math.PI / 2);
      this.ringMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
        uniforms: { color: { value: new THREE.Color() }, opacity: { value: 1 } },
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform vec3 color; uniform float opacity; varying vec2 vP;
          float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
          void main(){ float r = length(vP); float a = atan(vP.y, vP.x);
            float tear = 0.85 + 0.15 * h(vec2(floor(a * 9.0), 3.0));
            float edge = smoothstep(0.8, 0.97, r) * smoothstep(1.0, 0.965, r);
            float trail = pow(r, 4.0) * 0.35 * smoothstep(1.0, 0.95, r);
            gl_FragColor = vec4(color * (edge * 0.75 + trail * 0.6) * tear * opacity, 1.0); }`,
      });
    }
    const m = this.ringMat.clone(); m.uniforms.color.value = new THREE.Color(color); m.uniforms.opacity.value = alpha;
    Object.defineProperty(m, 'opacity', { get: () => m.uniforms.opacity.value, set: (v) => { m.uniforms.opacity.value = v; }, configurable: true });
    const mesh = new THREE.Mesh(this.ringGeo, m); mesh.position.copy(pos); mesh.position.y += 0.1; mesh.userData.noAO = true;
    this.scene.add(mesh); this.rings.push({ mesh, t: 0, life, r0, r1, a: alpha });
  }
  burst(pos, n, o) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * Math.PI * 0.5, sp = (o.speed || 4) * (0.4 + Math.random() * 0.8);
      (o.smoke ? this.smoke : this.glow).spawn({
        pos: { x: pos.x + (Math.random() - 0.5) * (o.spread || 0), y: pos.y + (Math.random() - 0.5) * (o.spread || 0) * 0.5, z: pos.z + (Math.random() - 0.5) * (o.spread || 0) },
        vel: { x: Math.cos(a) * Math.cos(e) * sp, y: Math.sin(e) * sp + (o.up || 0), z: Math.sin(a) * Math.cos(e) * sp },
        life: (o.life || 0.6) * (0.6 + Math.random() * 0.8), size: o.size || 0.3, size1: o.size1, color: o.color, alpha: o.alpha, gravity: o.gravity, drag: o.drag,
      });
    }
  }
  // Round 33: the moment of contact: one bright pop where the blow lands (a crit adds a light flash and a shockwave
  // at the feet), and a puff of dust kicked up from the ground under a heavy blow
  impact(pos, feet, crit = false, heavy = false) {
    this.glow.spawn({ pos: { x: pos.x, y: pos.y, z: pos.z }, vel: { x: 0, y: 0, z: 0 }, life: crit ? 0.16 : 0.1, size: crit ? 1.25 : 0.7, size1: 0.05, color: crit ? new THREE.Color(6, 5, 3.2) : new THREE.Color(3.2, 2.4, 1.4) });
    if (crit) { this.flash(pos, 0xffd9a0, 22, 0.16, 7); this.ring(feet, 0xffc070, 0.3, 1.8, 0.32, 0.7); }
    if (heavy || crit) this.burst({ x: feet.x, y: feet.y + 0.1, z: feet.z }, 4, { speed: 1.2, life: 0.9, size: 0.5, size1: 1.4, color: new THREE.Color(0.72, 0.6, 0.45), alpha: 0.3, up: 0.5, drag: 1.8, smoke: true, spread: 0.5 });
  }
  sparks(pos, color = new THREE.Color(4, 2.4, 1)) { this.burst(pos, 14, { speed: 7, life: 0.35, size: 0.12, size1: 0.02, color, gravity: 12, drag: 2 }); }
  blood(pos, color = new THREE.Color(0.35, 0.02, 0.02)) { this.burst(pos, 16, { speed: 4, life: 0.6, size: 0.18, size1: 0.1, color, gravity: 14, drag: 1, smoke: true, alpha: 0.9 }); }
  dust(pos, n = 10, scale = 1) { this.burst(pos, n, { speed: 1.5 * scale, life: 1.4, size: 0.8 * scale, size1: 2.2 * scale, color: new THREE.Color(0.75, 0.62, 0.46), alpha: 0.35, up: 0.6, drag: 1.5, smoke: true, spread: 0.6 }); }
  fire(pos, intensity = 1) {
    this.glow.spawn({ pos: { x: pos.x + (Math.random() - 0.5) * 0.5 * intensity, y: pos.y, z: pos.z + (Math.random() - 0.5) * 0.5 * intensity }, vel: { x: (Math.random() - 0.5) * 0.4, y: 1.6 + Math.random() * 1.6, z: (Math.random() - 0.5) * 0.4 }, life: 0.5 + Math.random() * 0.5, size: 0.6 * intensity, size1: 0.1, color: new THREE.Color(1.9, 0.55 + Math.random() * 0.35, 0.1), drag: 0.6 });
    if (Math.random() < 0.25) this.smoke.spawn({ pos: { x: pos.x, y: pos.y + 1.2 * intensity, z: pos.z }, vel: { x: 0.3, y: 1.2, z: 0.1 }, life: 2.2, size: 0.6 * intensity, size1: 2.4 * intensity, color: new THREE.Color(0.12, 0.1, 0.09), alpha: 0.35, drag: 0.3 });
    if (Math.random() < 0.2) this.glow.spawn({ pos: { x: pos.x, y: pos.y + 0.4, z: pos.z }, vel: { x: (Math.random() - 0.5) * 1.5, y: 2 + Math.random() * 2, z: (Math.random() - 0.5) * 1.5 }, life: 1.5, size: 0.08, size1: 0.02, color: new THREE.Color(4, 1.8, 0.4), drag: 0.4 });
  }
}
