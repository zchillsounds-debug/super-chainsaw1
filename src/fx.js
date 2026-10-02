import * as THREE from 'three';
import { particleSprite } from './textures.js';

// Pooled CPU particle system with two blend layers (additive glow + alpha smoke).
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
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: particleSprite() }, uScale: { value: 600 } },
      vertexShader: `attribute float size; attribute vec4 color; varying vec4 vC; uniform float uScale;
        void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize = size*uScale/(-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D uTex; varying vec4 vC; void main(){ vec4 t=texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC.rgb, vC.a*t.a); if(gl_FragColor.a<0.003) discard; }`,
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
    this.rings = []; this.lights = [];
    this.flashes = [];
  }
  setScale(h) { this.glow.points.material.uniforms.uScale.value = h * 0.9; this.smoke.points.material.uniforms.uScale.value = h * 0.9; }
  update(dt) {
    this.glow.update(dt); this.smoke.update(dt);
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.t += dt;
      const k = r.t / r.life;
      r.mesh.scale.setScalar(r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 3)));
      r.mesh.material.opacity = (1 - k) * r.a;
      if (k >= 1) { this.scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); this.rings.splice(i, 1); }
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
    if (!l) { if (this.lights.length >= 4) return; l = new THREE.PointLight(0xffffff, 0, dist, 2); this.lights.push(l); this.scene.add(l); }
    l.userData.busy = true; l.color.set(color); l.distance = dist; l.position.copy(pos);
    this.flashes.push({ light: l, t: 0, life, i: intensity });
  }
  ring(pos, color, r0, r1, life = 0.5, alpha = 1) {
    const g = new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2);
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: alpha, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m); mesh.position.copy(pos); mesh.position.y += 0.1;
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
  sparks(pos, color = new THREE.Color(4, 2.4, 1)) { this.burst(pos, 14, { speed: 7, life: 0.35, size: 0.12, size1: 0.02, color, gravity: 12, drag: 2 }); }
  blood(pos, color = new THREE.Color(0.35, 0.02, 0.02)) { this.burst(pos, 16, { speed: 4, life: 0.6, size: 0.18, size1: 0.1, color, gravity: 14, drag: 1, smoke: true, alpha: 0.9 }); }
  dust(pos, n = 10, scale = 1) { this.burst(pos, n, { speed: 1.5 * scale, life: 1.4, size: 0.8 * scale, size1: 2.2 * scale, color: new THREE.Color(0.75, 0.62, 0.46), alpha: 0.35, up: 0.6, drag: 1.5, smoke: true, spread: 0.6 }); }
  fire(pos, intensity = 1) {
    this.glow.spawn({ pos: { x: pos.x + (Math.random() - 0.5) * 0.5 * intensity, y: pos.y, z: pos.z + (Math.random() - 0.5) * 0.5 * intensity }, vel: { x: (Math.random() - 0.5) * 0.4, y: 1.6 + Math.random() * 1.6, z: (Math.random() - 0.5) * 0.4 }, life: 0.5 + Math.random() * 0.5, size: 0.6 * intensity, size1: 0.1, color: new THREE.Color(2.6, 0.9 + Math.random() * 0.5, 0.2), drag: 0.6 });
    if (Math.random() < 0.25) this.smoke.spawn({ pos: { x: pos.x, y: pos.y + 1.2 * intensity, z: pos.z }, vel: { x: 0.3, y: 1.2, z: 0.1 }, life: 2.2, size: 0.6 * intensity, size1: 2.4 * intensity, color: new THREE.Color(0.12, 0.1, 0.09), alpha: 0.35, drag: 0.3 });
    if (Math.random() < 0.2) this.glow.spawn({ pos: { x: pos.x, y: pos.y + 0.4, z: pos.z }, vel: { x: (Math.random() - 0.5) * 1.5, y: 2 + Math.random() * 2, z: (Math.random() - 0.5) * 1.5 }, life: 1.5, size: 0.08, size1: 0.02, color: new THREE.Color(4, 1.8, 0.4), drag: 0.4 });
  }
}
