import * as THREE from 'three';
import { heightAt, canalX } from './terrain.js';
import { IS_SAWAD, IS_MARSH, IS_KARKH, IS_CITY, IS_DOCKS } from './region.js';
import { wind } from './vegetation.js';
import { navClear } from './nav.js';

// Round 19: life and weather.
//  - footprints that stay in the sand behind the hero (one instanced mesh, pooled, fading)
//  - wind-blown sand: thin streaks skimming the ground downwind, animated entirely on the GPU
//  - birds (pigeons, sparrows; egrets in the marsh) that feed on the ground and flush when the hero comes near
//  - the occasional light sandstorm: visibility drops, foes see less far, the wind rises (never in cutscenes)
const FP = 72, STREAKS = 90, BIRDS = 18;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _c = new THREE.Color();

function footTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
  // a sandal print: heel and ball pressed in, a darker rim of pushed-up sand
  const blob = (cx, cy, rx, ry, a) => { const g = x.createRadialGradient(cx, cy, 1, cx, cy, Math.max(rx, ry)); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.75, `rgba(0,0,0,${a * 0.85})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.save(); x.translate(cx, cy); x.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); x.translate(-cx, -cy); x.beginPath(); x.arc(cx, cy, Math.max(rx, ry), 0, 7); x.fill(); x.restore(); };
  blob(32, 92, 15, 22, 0.75); blob(32, 42, 18, 30, 0.8); blob(33, 70, 11, 14, 0.4);
  return new THREE.CanvasTexture(c);
}

export class Ambient {
  constructor(game, quality) {
    this.g = game; const scene = game.scene; this.t = 0; this.storm = 0; this.stormT = 240 + Math.random() * 180; this.stormOn = false;
    // ---- footprints
    const fm = new THREE.MeshBasicMaterial({ map: footTexture(), transparent: true, depthWrite: false, color: 0x2a1a0c, opacity: 0.6, polygonOffset: true, polygonOffsetFactor: -4 });
    this.fp = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.2, 0.36).rotateX(-Math.PI / 2), fm, FP);
    this.fp.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.fp.count = 0; this.fp.frustumCulled = false; this.fp.renderOrder = 1; this.fp.userData.noAO = true;
    this.fpFade = new THREE.InstancedBufferAttribute(new Float32Array(FP), 1).setUsage(THREE.DynamicDrawUsage); this.fp.geometry.setAttribute('aFade', this.fpFade);
    fm.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aFade; varying float vFade;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFade;').replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= vFade;');
    };
    fm.customProgramCacheKey = () => 'foot1';
    scene.add(this.fp); this.fps = []; this.fpI = 0;
    game.onStep = (p, sf, step) => {
      if (sf !== 'sand' || this.g.interior) return;
      const side = step % 2 ? 1 : -1, f = p.facing, ox = Math.cos(f) * 0.13 * side, oz = -Math.sin(f) * 0.13 * side;
      const x = p.pos.x + ox, z = p.pos.z + oz;
      const rec = { x, z, y: Math.max(heightAt(x, z), p.pos.y) + 0.12, f, t: 0 };
      if (this.fps.length < FP) this.fps.push(rec); else this.fps[this.fpI = (this.fpI + 1) % FP] = rec;
    };
    // ---- wind-blown sand streaks (desert regions only)
    this.streakU = { uTime: { value: 0 }, uFocus: { value: new THREE.Vector3() }, uDir: wind.uWindDir, uK: { value: 0.0 }, uCol: { value: new THREE.Color(0.95, 0.8, 0.6) } };
    if (!IS_MARSH) {
      const geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
      const seeds = new Float32Array(STREAKS * 4); for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
      geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4)); geo.instanceCount = STREAKS;
      const mat = new THREE.ShaderMaterial({
        uniforms: this.streakU, transparent: true, depthWrite: false, fog: false,
        vertexShader: `uniform float uTime, uK; uniform vec3 uFocus; uniform vec2 uDir; attribute vec4 aSeed; varying vec2 vUv; varying float vA;
          float hgt(vec2 p){ return 0.0; }
          void main(){
            vUv = uv;
            float L = 2.5 + aSeed.z * 5.0, W = 0.18 + aSeed.w * 0.35, speed = 6.0 + aSeed.z * 6.0;
            float life = 2.4 + aSeed.w * 2.0, ph = fract(uTime / life + aSeed.x);
            vec2 side = vec2(-uDir.y, uDir.x);
            // spawn on a box around the hero, then skim downwind
            vec2 base = uFocus.xz + side * (aSeed.y - 0.5) * 60.0 + uDir * ((aSeed.x - 0.5) * 50.0 - 12.0 + ph * speed * life);
            base -= uDir * floor(dot(base - uFocus.xz, uDir) / 50.0 + 0.5) * 50.0;
            vec2 q = base + uDir * position.z * -L + side * position.x * W;
            vA = sin(ph * 3.14159) * uK * (0.4 + 0.6 * aSeed.y);
            gl_Position = projectionMatrix * viewMatrix * vec4(q.x, uFocus.y + 0.06 + aSeed.w * 0.3, q.y, 1.0);
          }`,
        fragmentShader: `uniform vec3 uCol; varying vec2 vUv; varying float vA;
          void main(){ float a = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.5, vUv.y) * smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
            gl_FragColor = vec4(uCol, a * vA * 0.32); }`,
      });
      this.streaks = new THREE.Mesh(geo, mat); this.streaks.frustumCulled = false; this.streaks.renderOrder = 2; this.streaks.userData.noAO = true; scene.add(this.streaks);
    }
    // ---- birds
    const bg = new THREE.BufferGeometry();
    // body + two wings (wing vertices carry aWing = +-1 at the tip so the shader can flap them)
    const P = [0, 0.05, 0.12, -0.03, 0.04, -0.1, 0.03, 0.04, -0.1, 0, 0.07, 0.04, -0.025, 0.03, -0.02, 0.025, 0.03, -0.02,
      0, 0.05, 0.04, -0.22, 0.06, -0.02, 0, 0.05, -0.06, 0, 0.05, 0.04, 0.22, 0.06, -0.02, 0, 0.05, -0.06];
    const Wg = [0, 0, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0];
    bg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); bg.setAttribute('aWing', new THREE.Float32BufferAttribute(Wg, 1)); bg.computeVertexNormals();
    const bm = new THREE.MeshStandardMaterial({ color: IS_MARSH ? 0xe8e4dc : 0x6a6260, roughness: 0.9, side: THREE.DoubleSide });
    bm.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aWing; attribute vec2 aFly;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          { float fl = aFly.x, ph = aFly.y * 6.2832;
            transformed.y += aWing * aWing * sin(ph) * 0.12 * fl - aWing * aWing * 0.02 * (1.0 - fl);
            transformed.x *= mix(0.35, 1.0, fl * abs(aWing) + (1.0 - abs(aWing))); }`);
    };
    bm.customProgramCacheKey = () => 'bird1';
    this.birds = new THREE.InstancedMesh(bg, bm, BIRDS); this.birds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.fly = new THREE.InstancedBufferAttribute(new Float32Array(BIRDS * 2), 2).setUsage(THREE.DynamicDrawUsage); bg.setAttribute('aFly', this.fly);
    this.birds.frustumCulled = false; this.birds.castShadow = true; scene.add(this.birds);
    this.flock = []; for (let i = 0; i < BIRDS; i++) this.flock.push({ state: 'off', p: new THREE.Vector3(), v: new THREE.Vector3(), yaw: 0, ph: Math.random() * 6, hop: 0, t: 0 });
    this.flockT = 0;
    if (quality === 'low') this.streaks && (this.streaks.visible = false);
  }
  // land a small flock on open ground somewhere near (but not on top of) the hero
  seedFlock() {
    const P = this.g.player.pos, idle = this.flock.filter((b) => b.state === 'off'); if (idle.length < 5) return;
    for (let tries = 0; tries < 8; tries++) {
      const a = Math.random() * 6.28, r = 14 + Math.random() * 14, cx = P.x + Math.cos(a) * r, cz = P.z + Math.sin(a) * r;
      if (Math.abs(cx) > 132 || Math.abs(cz) > 132 || (!IS_MARSH && Math.abs(cx - canalX(cz)) < (IS_DOCKS ? 25 : 5)) || !navClear(cx, cz, cx + 0.2, cz + 0.2)) continue;
      const n = 4 + Math.floor(Math.random() * Math.min(5, idle.length - 3));
      for (let i = 0; i < n; i++) { const b = idle[i]; const x = cx + (Math.random() - 0.5) * 3, z = cz + (Math.random() - 0.5) * 3; b.state = 'ground'; b.p.set(x, heightAt(x, z) + 0.08, z); b.yaw = Math.random() * 6.28; b.t = 0; b.hop = Math.random() * 2; }
      return;
    }
  }
  update(dt, focus, lighting) {
    const g = this.g; this.t += dt;
    // ---- footprints fade over 25 s
    let n = 0;
    for (const f of this.fps) {
      f.t += dt; if (f.t > 25) continue;
      _q.setFromAxisAngle(_up, f.f); _p.set(f.x, f.y, f.z); _s.setScalar(1); _m.compose(_p, _q, _s);
      this.fp.setMatrixAt(n, _m); this.fpFade.array[n] = Math.min(1, f.t * 4) * (1 - f.t / 25); n++;
    }
    this.fp.count = n; this.fp.instanceMatrix.needsUpdate = true; this.fpFade.needsUpdate = true;
    this.fp.material.opacity = 0.55; this.fp.visible = !g.interior;
    // ---- sandstorm
    const can = IS_SAWAD || IS_KARKH;
    if (can && !g.interior && !g.cinematic && !g.bossActive && g.started) {
      this.stormT -= dt;
      if (this.stormT <= 0 && !this.stormOn) { this.stormOn = true; this.stormT = 70 + Math.random() * 40; g.ui.toast('A sandstorm rises'); }
      else if (this.stormT <= 0 && this.stormOn) { this.stormOn = false; this.stormT = 360 + Math.random() * 240; g.ui.toast('The storm passes'); }
    }
    if (g.cinematic || g.interior) this.stormOn = this.stormOn && !g.cinematic;
    const target = this.stormOn && !g.interior && !g.cinematic ? 1 : 0;
    this.storm += (target - this.storm) * Math.min(1, dt * 0.25);
    const S = this.storm;
    g.sightK = 1 - 0.45 * S; g.storm = S;
    wind.uWindK.value = 1 + S * 2.2;
    // streaks: a light drift always in the desert, a river of sand in the storm
    const U = this.streakU; U.uTime.value = this.t; U.uFocus.value.copy(focus);
    U.uK.value = g.interior ? 0 : (IS_CITY ? 0.25 : 0.55) + S * 2.2;
    if (lighting) U.uCol.value.copy(lighting.cur.fog).lerp(lighting.cur.sunCol, 0.35);
    // ---- birds
    if ((this.flockT -= dt) <= 0) { this.flockT = 6; if (!g.interior && !g.cinematic) this.seedFlock(); }
    const P = g.player.pos;
    for (let i = 0; i < BIRDS; i++) {
      const b = this.flock[i];
      if (b.state === 'ground') {
        b.hop -= dt; b.t += dt;
        if (b.hop <= 0) { b.hop = 0.6 + Math.random() * 2; b.yaw += (Math.random() - 0.5) * 2; const s = 0.15; b.p.x += Math.sin(b.yaw) * s; b.p.z += Math.cos(b.yaw) * s; b.p.y = heightAt(b.p.x, b.p.z) + 0.08; }
        const d = Math.hypot(b.p.x - P.x, b.p.z - P.z);
        const fight = g.enemies.some((e) => !e.dead && e.alerted && Math.abs(e.pos.x - b.p.x) < 8 && Math.abs(e.pos.z - b.p.z) < 8);
        if (d < 6.5 + Math.random() * 0.5 || fight || S > 0.5 || g.interior) {
          b.state = 'fly'; b.t = 0;
          const away = Math.atan2(b.p.x - P.x, b.p.z - P.z) + (Math.random() - 0.5) * 1.2;
          b.v.set(Math.sin(away) * (5 + Math.random() * 3), 3.5 + Math.random() * 2, Math.cos(away) * (5 + Math.random() * 3)); b.yaw = away;
          if (i % 3 === 0) g.audio.flutter?.(b.p);
        }
      } else if (b.state === 'fly') {
        b.t += dt; b.p.addScaledVector(b.v, dt); b.v.y = Math.max(0.6, b.v.y - dt * 0.8); b.v.x *= 1 + dt * 0.15; b.v.z *= 1 + dt * 0.15;
        b.ph += dt * (b.t < 1.2 ? 26 : 14);
        if (b.t > 7 || Math.hypot(b.p.x - P.x, b.p.z - P.z) > 70) b.state = 'off';
      }
      if (b.state === 'off') { _m.makeScale(0, 0, 0); this.birds.setMatrixAt(i, _m); continue; }
      const sc = IS_MARSH ? 1.6 : 1;
      _q.setFromAxisAngle(_up, b.yaw); _p.copy(b.p); if (b.state === 'ground') _p.y += 0.0; _s.setScalar(sc * (b.state === 'ground' ? 1 : 1.15));
      _m.compose(_p, _q, _s); this.birds.setMatrixAt(i, _m);
      this.fly.array[i * 2] = b.state === 'fly' ? 1 : 0; this.fly.array[i * 2 + 1] = (b.ph % 6.2832) / 6.2832;
    }
    this.birds.instanceMatrix.needsUpdate = true; this.fly.needsUpdate = true;
  }
}
