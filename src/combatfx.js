import * as THREE from 'three';
import { heightAt } from './terrain.js';

// Round 19: combat effects.
//  - swing trails: a ribbon of light behind every fast-moving blade (meshes made at load, pooled)
//  - impacts: a crescent slash at the hit point, a shock ring and a flash on crits
//  - dust bursts when a blow knocks a foe back or staggers him
//  - ground cracks under heavy blows (pooled decals that fade)
const N = 26, POOL = 10, TRAIL_LIFE = 0.16, CRACKS = 8, SLASHES = 8;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _v = new THREE.Vector3();

function crackTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.clearRect(0, 0, S, S); x.lineCap = 'round'; x.lineJoin = 'round';
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const branch = (px, py, ang, len, w, depth) => {
    x.lineWidth = w; x.strokeStyle = `rgba(0,0,0,${0.55 + depth * 0.1})`; x.beginPath(); x.moveTo(px, py);
    let cx = px, cy = py;
    const steps = 6;
    for (let i = 0; i < steps; i++) { ang += (rnd() - 0.5) * 0.7; cx += Math.cos(ang) * len / steps; cy += Math.sin(ang) * len / steps; x.lineTo(cx, cy); }
    x.stroke();
    if (depth > 0) for (let k = 0; k < 2; k++) if (rnd() < 0.7) branch(cx, cy, ang + (rnd() - 0.5) * 1.6, len * 0.55, w * 0.6, depth - 1);
  };
  // a crushed centre, then fissures running out
  const g = x.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, 34); g.addColorStop(0, 'rgba(0,0,0,0.7)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 9; i++) branch(S / 2, S / 2, i / 9 * Math.PI * 2 + rnd() * 0.5, 60 + rnd() * 50, 4.5, 2);
  const t = new THREE.CanvasTexture(c); return t;
}
function slashTexture() {
  const W = 256, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  // a thin crescent: bright core, soft glow, tapering at both ends
  for (let i = 0; i < W; i++) {
    const u = i / W, taper = Math.sin(u * Math.PI), y = H * 0.5 + Math.sin(u * Math.PI) * -14;
    const gr = x.createLinearGradient(0, y - 14, 0, y + 14);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.45, `rgba(255,255,255,${0.35 * taper})`); gr.addColorStop(0.5, `rgba(255,255,255,${taper})`); gr.addColorStop(0.55, `rgba(255,255,255,${0.35 * taper})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(i, y - 14, 1, 28);
  }
  return new THREE.CanvasTexture(c);
}

export class CombatFX {
  constructor(game) {
    this.g = game; const scene = game.scene;
    // ---- swing trails
    this.trailMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
      uniforms: {},
      vertexShader: 'attribute vec2 aTS; attribute vec3 color; varying vec2 vTS; varying vec3 vC; void main(){ vTS = aTS; vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec2 vTS; varying vec3 vC;
        void main(){
          float age = vTS.x, s = vTS.y;
          float fade = pow(max(1.0 - age, 0.0), 2.2) * smoothstep(0.0, 0.08, age + 0.02);
          float edge = smoothstep(0.0, 0.5, s) * (0.2 + 0.8 * s * s) * (1.0 + 2.0 * smoothstep(0.9, 1.0, s));
          float a = fade * edge;
          gl_FragColor = vec4(vC * a, a);
        }`,
    });
    this.trails = [];
    for (let i = 0; i < POOL; i++) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(N * 2 * 3), ts = new Float32Array(N * 2 * 2), col = new Float32Array(N * 2 * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aTS', new THREE.BufferAttribute(ts, 2).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
      const idx = []; for (let k = 0; k < N - 1; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      geo.setIndex(idx);
      const m = new THREE.Mesh(geo, this.trailMat); m.frustumCulled = false; m.renderOrder = 4; m.visible = false; m.userData.noAO = true;
      scene.add(m);
      this.trails.push({ m, pos, ts, col, samples: [], owner: null, color: new THREE.Color() });
    }
    this.owned = new Map(); // trail spec -> trail
    // ---- impact slashes (camera-facing crescents)
    const sm = new THREE.MeshBasicMaterial({ map: slashTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide, color: new THREE.Color(3, 2.6, 2) });
    this.slashes = [];
    for (let i = 0; i < SLASHES; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), sm.clone()); m.visible = false; m.renderOrder = 5; m.userData.noAO = true; scene.add(m); this.slashes.push({ m, t: 1 }); }
    this.slashI = 0;
    // ---- shock rings on crits (flat on the ground, additive)
    const rm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 1.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
    this.shocks = [];
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.88, 1, 40).rotateX(-Math.PI / 2), rm.clone()); m.visible = false; m.renderOrder = 5; m.userData.noAO = true; scene.add(m); this.shocks.push({ m, t: 1 }); }
    this.shockI = 0;
    // ---- ground cracks
    const ct = crackTexture();
    this.cracks = [];
    for (let i = 0; i < CRACKS; i++) {
      const mat = new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false, color: 0x1a120c, polygonOffset: true, polygonOffsetFactor: -3, opacity: 0 });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat); m.visible = false; m.renderOrder = 1; m.userData.noAO = true; scene.add(m);
      this.cracks.push({ m, t: 99 });
    }
    this.crackI = 0;
    this.hook();
  }
  // ---------------------------------------------------------------- impacts
  hook() {
    const g = this.g, base = g.damageEnemy.bind(g);
    g.damageEnemy = (e, dmg, crit, src, kind = 'normal', o = {}) => {
      const hp0 = e.hp, st0 = e.staggerT || 0;
      base(e, dmg, crit, src, kind, o);
      if (kind === 'dot' || e.hp === hp0 || !src) return;
      const w = o.weight ?? g.kit?.weight ?? 0.5;
      const at = _a.copy(e.pos); at.y += e.boss ? 2.6 : 1.15;
      const ranged = g.kit?.attack?.kind !== 'melee' && src.distanceTo?.(e.pos) > 3;
      if (!ranged) this.slash(at, src, crit ? 1.35 : 0.9 + w * 0.25, crit);
      if (crit) { this.shock(e.pos, 2.4 + w); g.fx.flash(at, 0xffe0b0, 18, 0.18, 7); g.fx.burst(at, 18, { speed: 9, life: 0.28, size: 0.1, size1: 0.01, color: new THREE.Color(5, 3.6, 2), gravity: 6, drag: 3 }); }
      // knocked back or staggered: dust kicked up at his feet
      if ((e.staggerT || 0) > st0 || (e.knock && e.knock.length() > 3)) { g.fx.dust(e.pos, 7, 0.9 + w * 0.4); g.fx.ring(e.pos, new THREE.Color(0.4, 0.33, 0.24), 0.3, 1.1 + w * 0.6, 0.4, 0.16); }
      if (w >= 0.9 && (crit || (e.staggerT || 0) > st0 || o.heavy)) this.crack(e.pos, 1.6 + w * 0.8);
    };
  }
  slash(at, src, size, crit) {
    const s = this.slashes[this.slashI = (this.slashI + 1) % SLASHES];
    s.t = 0; s.m.visible = true; s.size = size; s.crit = crit;
    s.m.position.copy(at);
    // face the camera, rolled along the blow's direction across the screen
    const cam = this.g.camera; s.m.quaternion.copy(cam.quaternion);
    const d = _v.copy(at).sub(src).setY(0).normalize();
    const sd = d.clone().project(cam), so = new THREE.Vector3(0, 0, 0).project(cam);
    s.m.rotateZ(Math.atan2(sd.y - so.y, sd.x - so.x) + (Math.random() - 0.5) * 0.9);
    s.m.material.color.setRGB(crit ? 4 : 2.6, crit ? 3 : 2.2, crit ? 2 : 1.7);
  }
  shock(pos, r) { const s = this.shocks[this.shockI = (this.shockI + 1) % this.shocks.length]; s.t = 0; s.r = r; s.m.visible = true; s.m.position.set(pos.x, heightAt(pos.x, pos.z) + 0.12, pos.z); }
  crack(pos, size) {
    if (this.g.interior) return; // interior floors are flat at their own height; the terrain height is wrong there
    const c = this.cracks[this.crackI = (this.crackI + 1) % CRACKS];
    c.t = 0; c.m.visible = true; c.m.scale.setScalar(size); c.m.rotation.y = Math.random() * 6.28;
    c.m.position.set(pos.x, heightAt(pos.x, pos.z) + 0.04, pos.z);
  }
  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.g;
    // which actors are swinging: the hero and visible foes in an action, blade moving fast
    const actors = [g.player, ...g.enemies];
    const live = new Set();
    for (const a of actors) {
      const P = a.rig?.userData?.parts; if (!P?.trails || !a.rig.visible || a.dead) continue;
      if (a !== g.player && a.pos.distanceToSquared(g.player.pos) > 900) continue;
      const busy = a.st?.action || a.whirlT > 0 || a.flurry;
      for (const spec of P.trails) {
        spec.obj.updateWorldMatrix(true, false);
        _a.set(0, spec.a, 0).applyMatrix4(spec.obj.matrixWorld); _b.set(0, spec.b, 0).applyMatrix4(spec.obj.matrixWorld);
        const last = spec.lastTip || (spec.lastTip = _b.clone());
        const speed = _v.copy(_b).sub(last).length() / Math.max(dt, 1e-3); last.copy(_b);
        let tr = this.owned.get(spec);
        const emit = busy && speed > 6.5;
        if (emit && !tr) {
          tr = this.trails.find((x) => !x.owner) || null;
          if (tr) { tr.owner = spec; tr.samples.length = 0; this.owned.set(spec, tr); tr.color.copy(spec.fire ? new THREE.Color(2.6, 0.9, 0.25) : a === g.player ? this.heroColor() : new THREE.Color(0.9, 0.85, 0.8)); }
        }
        if (!tr) continue;
        live.add(tr);
        if (emit) {
          // fill fast swings with in-between samples so the ribbon bends with the arc instead of cutting a chord
          const prev = tr.samples[0];
          if (prev && prev.t < 0.05) {
            const gap = prev.b.distanceTo(_b), steps = Math.min(4, Math.floor(gap / 0.22));
            const pivot = _v.copy(prev.a).lerp(_a, 0.5), r0 = prev.b.distanceTo(prev.a), r1 = _b.distanceTo(_a);
            for (let k = 1; k <= steps; k++) {
              const u = k / (steps + 1), ia = prev.a.clone().lerp(_a, u), dir = prev.b.clone().sub(prev.a).normalize().lerp(_b.clone().sub(_a).normalize(), u).normalize();
              tr.samples.unshift({ a: ia, b: ia.clone().addScaledVector(dir, r0 + (r1 - r0) * u), t: prev.t * (1 - u) });
            }
          }
          tr.samples.unshift({ a: _a.clone(), b: _b.clone(), t: 0 });
        }
        if (tr.samples.length > N) tr.samples.length = N;
      }
    }
    for (const tr of this.trails) {
      if (!tr.owner) { tr.m.visible = false; continue; }
      for (const s of tr.samples) s.t += dt;
      while (tr.samples.length && tr.samples[tr.samples.length - 1].t > TRAIL_LIFE) tr.samples.pop();
      if (tr.samples.length < 2) { if (!live.has(tr) || !tr.samples.length) { this.owned.delete(tr.owner); tr.owner = null; } tr.m.visible = false; continue; }
      const n = tr.samples.length;
      for (let i = 0; i < N; i++) {
        const s = tr.samples[Math.min(i, n - 1)], k = i * 2;
        tr.pos.set([s.a.x, s.a.y, s.a.z, s.b.x, s.b.y, s.b.z], k * 3);
        const age = Math.min(1, s.t / TRAIL_LIFE + (i >= n ? 1 : 0));
        tr.ts.set([age, 0, age, 1], k * 2);
        tr.col.set([tr.color.r, tr.color.g, tr.color.b, tr.color.r, tr.color.g, tr.color.b], k * 3);
      }
      const G = tr.m.geometry; G.attributes.position.needsUpdate = G.attributes.aTS.needsUpdate = G.attributes.color.needsUpdate = true;
      tr.m.visible = true;
    }
    for (const s of this.slashes) {
      if (!s.m.visible) continue; s.t += dt; const k = s.t / 0.16;
      if (k >= 1) { s.m.visible = false; continue; }
      s.m.scale.set(s.size * (0.6 + k * 0.7), s.size * (1 - k * 0.5), 1); s.m.material.opacity = (1 - k) * (1 - k);
    }
    for (const s of this.shocks) {
      if (!s.m.visible) continue; s.t += dt; const k = s.t / 0.35;
      if (k >= 1) { s.m.visible = false; continue; }
      s.m.scale.setScalar(0.3 + s.r * (1 - Math.pow(1 - k, 3))); s.m.material.opacity = (1 - k) * 0.9;
    }
    for (const c of this.cracks) {
      if (!c.m.visible) continue; c.t += dt;
      c.m.material.opacity = Math.min(1, c.t * 12) * Math.max(0, 1 - Math.max(0, c.t - 4) / 2) * 0.85;
      if (c.t > 6) c.m.visible = false;
    }
  }
  heroColor() {
    // each discipline's blade light: warm steel for the Faris, a cold glint for the 'Ayyar's knives
    const c = this.g.player.cls;
    return c === 'ayyar' ? new THREE.Color(0.75, 0.9, 1.4) : c === 'naffat' ? new THREE.Color(2.2, 0.8, 0.22) : new THREE.Color(1.6, 1.15, 0.6);
  }
}
