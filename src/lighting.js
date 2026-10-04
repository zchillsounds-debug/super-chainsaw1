import * as THREE from 'three';
import { IS_HAMRIN } from './region.js';
import { SKY, envFromSky } from './graphics.js';

// Time-of-day presets, one per act, blended over a few seconds.
// golden: Act I afternoon · dusk: Act II at the kilns · night: Act III under the arch · dawn: after the victory
// underground: kiln tunnels and qanats (no sky, warm torchlight only)
const c = (h) => new THREE.Color(h);
const v = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
export const PRESETS = {
  golden: { sun: v(-0.55, 0.62, 0.35), sunCol: c(0xffc488), sunI: 3.3, hemiSky: c(0xc4c2c4), hemiGnd: c(0x7a5236), hemiI: 0.5, fog: c(0xd4a47a), fogD: 0.0048, exp: 0.95, env: 0.4, hero: 0.0, vol: 0.022, fire: 1,
    sky: { zen: c(0x2e5ca8), mid: c(0xc7a88f), hor: c(0xffad66), gnd: c(0x805c3d), glow: c(0xff8c40), cloud: c(0xffc79a), stars: 0, disk: 20 }, water: c(0xf3c999), dusk: 0, lut: 0 },
  dusk: { sun: v(-0.85, 0.26, 0.35), sunCol: c(0xffa070), sunI: 2.7, hemiSky: c(0x6a84a8), hemiGnd: c(0x4a3a30), hemiI: 0.6, fog: c(0x8a7c84), fogD: 0.0055, exp: 1.0, env: 0.3, hero: 5, vol: 0.03, fire: 1.3,
    sky: { zen: c(0x1c2450), mid: c(0x8a5a70), hor: c(0xff6a3a), gnd: c(0x4a2a20), glow: c(0xff5a20), cloud: c(0xff8a6a), stars: 0.15, disk: 14 }, water: c(0xd09070), dusk: 0.12, lut: 1 },
  night: { sun: v(0.45, 0.72, -0.3), sunCol: c(0x9db0cf), sunI: 0.8, hemiSky: c(0x3c4860), hemiGnd: c(0x2a2018), hemiI: 0.4, fog: c(0x1a2234), fogD: 0.0068, exp: 1.3, env: 0.18, hero: 12, vol: 0.02, fire: 1.7,
    sky: { zen: c(0x060a18), mid: c(0x18203a), hor: c(0x2a3050), gnd: c(0x10121a), glow: c(0x6a80b0), cloud: c(0x3a4460), stars: 1, disk: 6 }, water: c(0x4a5a80), dusk: 0, lut: 2 },
  dawn: { sun: v(0.7, 0.24, 0.45), sunCol: c(0xffb090), sunI: 2.6, hemiSky: c(0xb0b8d0), hemiGnd: c(0x6a4a3a), hemiI: 0.5, fog: c(0xd8a898), fogD: 0.0052, exp: 1.0, env: 0.35, hero: 2.5, vol: 0.032, fire: 0.8,
    sky: { zen: c(0x3a5a98), mid: c(0xc8a0a8), hor: c(0xffb490), gnd: c(0x705048), glow: c(0xffa070), cloud: c(0xffd0c0), stars: 0, disk: 16 }, water: c(0xe8b0a0), dusk: 0.1, lut: 3 },
  // Act IV: a hazy marsh morning, the sun low and white through the mist off the water
  mist: { sun: v(0.6, 0.42, 0.5), sunCol: c(0xfff0d0), sunI: 2.4, hemiSky: c(0xb8c8c8), hemiGnd: c(0x4a5038), hemiI: 0.62, fog: c(0xb4bcb0), fogD: 0.0072, exp: 1.02, env: 0.42, hero: 2, vol: 0.05, fire: 0.8,
    sky: { zen: c(0x5a7a98), mid: c(0xb8c4c0), hor: c(0xe8e0c8), gnd: c(0x5a6050), glow: c(0xfff0c8), cloud: c(0xf0ece0), stars: 0, disk: 14 }, water: c(0xd8dcd0), dusk: 0, lut: 5 },
  // Act V: al-Karkh in the late afternoon, the light thick and amber with smoke
  haze: { sun: v(-0.7, 0.36, 0.42), sunCol: c(0xffc090), sunI: 2.7, hemiSky: c(0xa8a098), hemiGnd: c(0x4a3e34), hemiI: 0.55, fog: c(0x8a7c70), fogD: 0.0066, exp: 1.0, env: 0.32, hero: 4, vol: 0.04, fire: 1.25,
    sky: { zen: c(0x3e4458), mid: c(0x9a8478), hor: c(0xd8a078), gnd: c(0x4a3a30), glow: c(0xff9a50), cloud: c(0xb09080), stars: 0, disk: 12 }, water: c(0xc89a78), dusk: 0.08, lut: 6 },
  // Round 21: the Hamrin hills in the late afternoon: clear high air, a cooler sky, long shadows off the ridges
  highland: { sun: v(-0.62, 0.48, 0.42), sunCol: c(0xffd2a0), sunI: 3.1, hemiSky: c(0xb4c0d4), hemiGnd: c(0x5a4434), hemiI: 0.48, fog: c(0xa8a098), fogD: 0.0034, exp: 0.9, // Round 22: less washed out env: 0.4, hero: 1.5, vol: 0.028, fire: 1,
    sky: { zen: c(0x2a5aa0), mid: c(0xa8b0c0), hor: c(0xf0c8a0), gnd: c(0x6a5440), glow: c(0xffb070), cloud: c(0xf8e0c8), stars: 0, disk: 18 }, water: c(0xc8d0d8), dusk: 0.02, lut: 0 },
  // inside the holds: the gorges at evening, deep in shadow under a bright strip of sky
  gorge: { sun: v(-0.4, 0.72, 0.55), sunCol: c(0xffc490), sunI: 2.8, hemiSky: c(0xa4acc4), hemiGnd: c(0x6a5440), hemiI: 1.0, fog: c(0x9a8a80), fogD: 0.0085, exp: 1.12, env: 0.36, hero: 5, vol: 0.035, fire: 1.3,
    sky: { zen: c(0x1e3460), mid: c(0x7a6a78), hor: c(0xe8906a), gnd: c(0x3a2a22), glow: c(0xff8a50), cloud: c(0xd89070), stars: 0.08, disk: 12 }, water: c(0x8a8478), dusk: 0.1, lut: 1 },
  underground: { sun: v(-0.3, 0.9, 0.2), sunCol: c(0x403028), sunI: 0.0, hemiSky: c(0x8a6a50), hemiGnd: c(0x302018), hemiI: 0.95, fog: c(0x0a0705), fogD: 0.022, exp: 1.45, env: 0.12, hero: 9, vol: 0.0, fire: 1.6,
    sky: { zen: c(0x000000), mid: c(0x000000), hor: c(0x080504), gnd: c(0x000000), glow: c(0x000000), cloud: c(0x000000), stars: 0, disk: 0 }, water: c(0x302820), dusk: 0, lut: 4 },
};
export const ACT_PRESET = { 1: 'golden', 2: 'dusk', 3: 'night', 4: 'mist', 5: 'haze', 6: 'golden', 7: 'dusk' };

export class Lighting {
  constructor({ scene, renderer, sun, hemi, world, grade }) {
    Object.assign(this, { scene, renderer, sun, hemi, world, grade });
    this.cur = this.snapshot(PRESETS.golden); this.from = null; this.to = null; this.k = 1; this.name = 'golden';
  }
  snapshot(p) {
    const s = { sun: p.sun.clone(), sunCol: p.sunCol.clone(), hemiSky: p.hemiSky.clone(), hemiGnd: p.hemiGnd.clone(), fog: p.fog.clone(), water: p.water.clone(), sky: {} };
    for (const k in p.sky) s.sky[k] = p.sky[k].clone ? p.sky[k].clone() : p.sky[k];
    for (const k of ['sunI', 'hemiI', 'fogD', 'exp', 'env', 'fire', 'dusk', 'lut', 'vol', 'hero']) s[k] = p[k];
    return s;
  }
  set(name, secs = 3) {
    if (name === 'underground') this.onAct?.('under');
    if (!PRESETS[name] || (name === this.name && this.k >= 1)) return;
    this.name = name; this.from = this.snapshot(this.cur); this.to = PRESETS[name]; this.k = secs > 0 ? 0 : 1; this.dur = secs;
    if (secs <= 0) { this.apply(1); this.bakeEnv(); }
  }
  forAct(act, secs) { if (IS_HAMRIN) { this.set('highland', secs); this.onAct?.(8); return; } this.set(ACT_PRESET[Math.min(7, act || 1)] || 'golden', secs); this.onAct?.(act || 1); }
  bakeEnv() { const old = this.scene.environment; this.scene.environment = envFromSky(this.renderer, this.world.sunDir); old?.dispose?.(); }
  apply(k) {
    const f = this.from, t = this.to, o = this.cur, L = THREE.MathUtils.lerp;
    o.sun.copy(f.sun).lerp(t.sun, k).normalize(); o.sunCol.copy(f.sunCol).lerp(t.sunCol, k);
    o.hemiSky.copy(f.hemiSky).lerp(t.hemiSky, k); o.hemiGnd.copy(f.hemiGnd).lerp(t.hemiGnd, k); o.fog.copy(f.fog).lerp(t.fog, k); o.water.copy(f.water).lerp(t.water, k);
    for (const key of ['sunI', 'hemiI', 'fogD', 'exp', 'env', 'fire', 'dusk', 'vol', 'hero']) o[key] = L(f[key], t[key], k);
    for (const key in t.sky) { if (o.sky[key]?.isColor) o.sky[key].copy(f.sky[key]).lerp(t.sky[key], k); else o.sky[key] = L(f.sky[key], t.sky[key], k); }
    o.lut = k > 0.5 ? t.lut : f.lut;
    // push to the scene
    this.world.sunDir.copy(o.sun);
    this.sun.color.copy(o.sunCol); this.sun.intensity = o.sunI; this.sun.castShadow = o.sunI > 0.05;
    this.hemi.color.copy(o.hemiSky); this.hemi.groundColor.copy(o.hemiGnd); this.hemi.intensity = o.hemiI;
    this.scene.fog.color.copy(o.fog); this.scene.fog.density = o.fogD;
    this.renderer.toneMappingExposure = o.exp; this.scene.environmentIntensity = o.env;
    SKY.uZen.value.copy(o.sky.zen); SKY.uMid.value.copy(o.sky.mid); SKY.uHor.value.copy(o.sky.hor); SKY.uGnd.value.copy(o.sky.gnd);
    SKY.uGlow.value.copy(o.sky.glow); SKY.uCloud.value.copy(o.sky.cloud); SKY.uStars.value = o.sky.stars; SKY.uDisk.value = o.sky.disk;
    const wu = this.world.canal?.material.uniforms; if (wu) { wu.uSky.value.copy(o.water); wu.uSpec.value.copy(o.sunCol); }
    if (this.grade) { this.grade.uniforms.uDuskAct && (this.grade.uniforms.uDuskAct.value = o.dusk); this.grade.uniforms.uLut && (this.grade.uniforms.uLut.value = o.lut); this.grade.uniforms.uLutMix && (this.grade.uniforms.uLutMix.value = 1); }
  }
  update(dt) {
    if (this.k >= 1 || !this.to) return;
    this.k = Math.min(1, this.k + dt / this.dur);
    const e = this.k * this.k * (3 - 2 * this.k);
    this.apply(e);
    if (this.k >= 1) this.bakeEnv();
  }
  get fireScale() { return this.cur.fire; }
}
