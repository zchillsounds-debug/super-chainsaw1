// Stadium arenas: painted field, cheering crowd stands, toon sky and clouds.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, inked, canvasTex, outlineMat } from './toon.js';

export const ARENA_R = 11.5;

export const ARENAS = {
  meadow: {
    name: 'Sunny Meadow Stadium',
    skyTop: 0x2f7fe8, skyHorizon: 0xbfe8ff, sun: 0xfff2d8, sunDir: [-0.5, 0.8, 0.35],
    hemiSky: 0xcfe8ff, hemiGround: 0x9a7cc8, fieldA: '#6cc84a', fieldB: '#5cb842', line: '#ffffff',
    wallA: 0xff5a6e, wallB: 0xffffff, ground: 0x7ccf5a, fog: 0xbfe8ff,
    accent: 0xffc940, seat: [0x3d7bff, 0xff5a6e, 0xffc940, 0x4fd38a],
    hill: 0x6fbf55, trunk: 0x8a5a3a, leaves: [0x47b04a, 0x5cc85a, 0x3a9a48], scenery: 'trees', cloud: 0xffffff, cloudShade: 0x5a6a90, sunI: 2.4,
    drift: 'seeds',
  },
  beach: {
    name: 'Seashell Bay Arena',
    skyTop: 0x4a6ad8, skyHorizon: 0xffc9a0, sun: 0xffe0b8, sunDir: [0.6, 0.45, -0.5],
    hemiSky: 0xffe4d0, hemiGround: 0x9a7cc8, fieldA: '#e9c784', fieldB: '#dfba74', line: '#ffffff', floor: 'sand',
    wallA: 0x2fb8d8, wallB: 0xfff4dc, ground: 0xf3d9a0, fog: 0xffd2b0,
    accent: 0xff7a5a, seat: [0x2fb8d8, 0xff7a5a, 0xffe066, 0xffffff],
    hill: 0xe8c890, trunk: 0x9a6a40, leaves: [0x3cb86a, 0x52c870, 0x2f9a58], scenery: 'palms', cloud: 0xfff0e8, cloudShade: 0x9a6a8a, sunI: 2.2,
    water: 0x2ab0d8,
  },
  volcano: {
    name: 'Magma Crater Coliseum',
    skyTop: 0x1a0f3a, skyHorizon: 0xff7a3a, sun: 0xffe0c8, sunDir: [-0.3, 0.55, -0.7],
    hemiSky: 0xffd0c0, hemiGround: 0x6a3a8a, fieldA: '#5a4c66', fieldB: '#52465e', line: '#ffd06a', floor: 'basalt',
    wallA: 0xff5a2a, wallB: 0x3a2a4a, ground: 0x4a3a52, fog: 0x5a2a4a,
    accent: 0xff7a2a, seat: [0xff5a2a, 0xffc940, 0x8a5aff, 0x3a2a4a],
    hill: 0x3a2a40, trunk: 0x3a2a30, leaves: [0x5a4a5a, 0x6a5a6a, 0x4a3a4a], scenery: 'rocks', cloud: 0x6a4a6a, cloudShade: 0x2a1a3a, sunI: 1.8,
    lava: 0xff5a1a, fillI: 0.45, drift: 'embers',
  },
  frost: {
    name: 'Frostpeak Dome',
    skyTop: 0x060c34, skyHorizon: 0x34509a, sun: 0xdfe8ff, sunDir: [0.45, 0.55, -0.6],
    hemiSky: 0xb0c4ff, hemiGround: 0x5a6aa8, fieldA: '#eef4ff', fieldB: '#e3ecfb', line: '#5ab8ff', floor: 'snow',
    wallA: 0x5ab8ff, wallB: 0xffffff, ground: 0xe8f0ff, fog: 0x24346e,
    accent: 0x9ad8ff, seat: [0x5ab8ff, 0xffffff, 0xb39cff, 0x3a4a8a],
    hill: 0xeef4ff, trunk: 0x5a3a2a, leaves: [0x2f6a5a, 0x3a7a64, 0x24584a], scenery: 'pines', cloud: 0x8a9ac8, cloudShade: 0x2a3060, sunI: 1.7,
    aurora: true, snow: true, fillI: 0.35,
  },
  neon: {
    name: 'Neon Rooftop Arena',
    skyTop: 0x0a0624, skyHorizon: 0x7a2a9a, sun: 0xfff0d8, sunDir: [-0.55, 0.5, -0.65],
    hemiSky: 0xe4d8ff, hemiGround: 0x4a3a8a, fieldA: '#2c2452', fieldB: '#262048', line: '#ff5ad8', floor: 'neon',
    wallA: 0x2a1f5a, wallB: 0xff4fb8, ground: 0x1c1838, fog: 0x2a1a52,
    accent: 0x3af0ff, seat: [0xff4fb8, 0x3af0ff, 0xffd84a, 0x8a5aff],
    hill: 0x1a1434, trunk: 0x2a2244, leaves: [0x2a2450, 0x241e46, 0x30285a], scenery: 'city', cloud: 0x3a2a6a, cloudShade: 0x5a2a6a, sunI: 2.1,
    stars: true, beam: 0xff8ae0, fillI: 0.5, rain: true,
  },
  sky: {
    name: 'Cloudtop Gardens',
    skyTop: 0x3f86f0, skyHorizon: 0xffe0ee, sun: 0xfff2e0, sunDir: [0.45, 0.7, -0.5],
    hemiSky: 0xe8f0ff, hemiGround: 0xa08ad8, fieldA: '#f3eee4', fieldB: '#e8e0d2', line: '#ff9ac8', floor: 'marble',
    wallA: 0xffffff, wallB: 0xff9ac8, ground: 0xf4f2ff, fog: 0xf2e8ff,
    accent: 0xffb0d4, seat: [0xff9ac8, 0x8ad0ff, 0xffe08a, 0xc4a4ff],
    hill: 0xffffff, trunk: 0x9a6a4a, leaves: [0xff9ac8, 0xffc4de, 0x7cd07a], scenery: 'islands', cloud: 0xffffff, cloudShade: 0x8a90c8, sunI: 2.3,
    fogNear: 150, fogFar: 520, back: 0xa890d8, drift: 'petals',
  },
  grove: {
    name: 'Glowcap Grove',
    skyTop: 0x1c1656, skyHorizon: 0xff9a7a, sun: 0xffe0c0, sunDir: [-0.5, 0.45, -0.6],
    hemiSky: 0xece4ff, hemiGround: 0x5a7a6a, fieldA: '#3f8a5a', fieldB: '#387f52', line: '#d8ff9a',
    wallA: 0x8a5ad8, wallB: 0xfff0d0, ground: 0x3a6a3a, fog: 0x3a2a5a,
    accent: 0xc8ff6a, seat: [0x8a5ad8, 0xff7ab0, 0xc8ff6a, 0xffb04a],
    hill: 0x2f5a3a, trunk: 0xf4e8d0, leaves: [0xff5a6a, 0x8a6aff, 0xffa040], scenery: 'mushrooms', cloud: 0x7a5a9a, cloudShade: 0x2a1a4a, sunI: 1.9,
    stars: true, fireflies: true, fillI: 0.6,
  },
};

function skyDome(A) {
  const g = new THREE.SphereGeometry(400, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(A.skyTop) }, hor: { value: new THREE.Color(A.skyHorizon) },
      sunDir: { value: new THREE.Vector3(...A.sunDir).normalize() }, sunCol: { value: new THREE.Color(A.sun) },
      uAurora: { value: A.aurora ? 1 : 0 }, uStars: { value: A.aurora || A.stars ? 1 : 0 }, uTime: { value: 0 },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 top, hor, sunDir, sunCol; uniform float uAurora, uStars, uTime; varying vec3 vP;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        float h = clamp(vP.y, 0.0, 1.0);
        vec3 c = mix(hor, top, pow(h, 0.55));
        float s = max(dot(vP, sunDir), 0.0);
        c += sunCol * (smoothstep(0.9975, 0.998, s) * 1.6 + pow(s, 24.0) * 0.35);
        // stylised horizon band
        c = mix(c, hor * 1.08, smoothstep(0.08, 0.0, h) * 0.6);
        if (uStars > 0.0) {
          // twinkling stars
          vec2 sp = vec2(atan(vP.z, vP.x) * 60.0, vP.y * 60.0);
          vec2 cell = floor(sp);
          float st = step(0.985, hash(cell)) * smoothstep(0.1, 0.5, h);
          float tw = 0.6 + 0.4 * sin(uTime * 3.0 + hash(cell + 7.0) * 40.0);
          float d = length(fract(sp) - 0.5);
          c += vec3(st * tw * smoothstep(0.25, 0.0, d)) * 1.4;
        }
        if (uAurora > 0.0) {
          // soft ribbons of aurora
          float a = atan(vP.z, vP.x);
          float band = sin(a * 3.0 + uTime * 0.15 + sin(a * 7.0 + uTime * 0.3) * 0.6);
          float y0 = 0.32 + band * 0.08;
          float rib = smoothstep(0.16, 0.0, abs(h - y0)) * (0.55 + 0.45 * sin(a * 23.0 + uTime * 0.8));
          vec3 ac = mix(vec3(0.2, 1.0, 0.6), vec3(0.6, 0.4, 1.0), smoothstep(0.2, 0.5, h + band * 0.1));
          c += ac * rib * 0.55 * uAurora;
        }
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

function cloud(rand) {
  const parts = [];
  const n = 5 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const r = 4 + rand() * 5;
    const s = new THREE.SphereGeometry(r, 16, 12);
    s.translate((i - n / 2) * 4.5 + rand() * 2, rand() * 2.5 + (i % 2) * 1.5, rand() * 3);
    parts.push(s);
  }
  const g = mergeGeometries(parts);
  g.scale(1, 0.62, 0.8);
  return g;
}

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export class Arena {
  constructor(scene, key = 'meadow') {
    this.A = ARENAS[key];
    const A = this.A;
    this.group = new THREE.Group();
    scene.add(this.group);
    const G = this.group;
    const rand = rng(7);

    scene.fog = new THREE.Fog(A.fog, A.fogNear || 70, A.fogFar || 260);
    this.sky = skyDome(A);
    G.add(this.sky);

    // lights
    this.hemi = new THREE.HemisphereLight(A.hemiSky, A.hemiGround, 1.25);
    // lavender bounce reads as an anime shadow tint on the critters
    G.add(this.hemi);
    // camera-side fill for close-ups (results); always present so the light count never changes mid-game
    this.fill = new THREE.DirectionalLight(0xfff4e8, 0);
    G.add(this.fill, this.fill.target);
    const sun = this.sun = new THREE.DirectionalLight(A.sun, A.sunI);
    sun.position.set(...A.sunDir).multiplyScalar(30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -16; sc.right = sc.top = 16; sc.near = 1; sc.far = 80;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    G.add(sun, sun.target);

    // outer ground
    const ground = new THREE.Mesh(new THREE.CircleGeometry(300, 48), toon(A.ground, { env: true, rim: 0 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    G.add(ground);

    // field with mowed stripes, rings and a paw emblem
    const fieldTex = canvasTex(1024, 1024, (c, w, h) => {
      if (A.floor === 'sand') {
        c.fillStyle = A.fieldA; c.fillRect(0, 0, w, h);
        // wind ripples
        c.lineWidth = 5;
        for (let y = -40; y < h + 40; y += 26) {
          c.strokeStyle = (y / 26) % 2 ? 'rgba(160,110,50,0.18)' : 'rgba(255,245,215,0.22)';
          c.beginPath();
          for (let x = 0; x <= w; x += 16) c.lineTo(x, y + Math.sin(x * 0.012 + y * 0.05) * 14);
          c.stroke();
        }
        for (let i = 0; i < 7000; i++) {
          c.globalAlpha = 0.08 + Math.random() * 0.1;
          c.fillStyle = Math.random() < 0.5 ? '#fff6dc' : '#9a6a38';
          c.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }
        c.globalAlpha = 1;
        // shells and starfish scattered near the rim
        for (let i = 0; i < 26; i++) {
          const a = Math.random() * Math.PI * 2, r = w * (0.36 + Math.random() * 0.1);
          const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r;
          c.save(); c.translate(x, y); c.rotate(Math.random() * 6);
          if (i % 2) {
            c.fillStyle = ['#ff8a6a', '#ffb070', '#ff6a8a'][i % 3];
            c.beginPath();
            for (let k = 0; k < 10; k++) { const rr = k % 2 ? 6 : 15; c.lineTo(Math.cos(k * Math.PI / 5) * rr, Math.sin(k * Math.PI / 5) * rr); }
            c.fill();
          } else {
            c.fillStyle = '#fff1e0'; c.beginPath(); c.moveTo(0, 10); c.arc(0, 0, 12, Math.PI * 0.15, Math.PI * 0.85, true); c.closePath(); c.fill();
            c.strokeStyle = '#e0b090'; c.lineWidth = 2;
            for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(0, 10); c.lineTo(k * 5, -9); c.stroke(); }
          }
          c.restore();
        }
      } else if (A.floor === 'snow') {
        c.fillStyle = A.fieldA; c.fillRect(0, 0, w, h);
        // soft drifts and blue shadows
        for (let i = 0; i < 70; i++) {
          const x = Math.random() * w, y = Math.random() * h, r = 40 + Math.random() * 120;
          const g = c.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, Math.random() < 0.5 ? 'rgba(170,200,255,0.18)' : 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
        }
        // sparkles
        for (let i = 0; i < 2500; i++) { c.fillStyle = Math.random() < 0.7 ? 'rgba(255,255,255,0.9)' : 'rgba(150,200,255,0.6)'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
        // little paw-print trails
        c.fillStyle = 'rgba(120,150,210,0.25)';
        for (let t = 0; t < 4; t++) {
          let x = Math.random() * w, y = Math.random() * h; const a = Math.random() * 6;
          for (let k = 0; k < 14; k++) { x += Math.cos(a) * 26; y += Math.sin(a) * 26; c.beginPath(); c.ellipse(x + (k % 2 ? 6 : -6), y, 5, 6, a, 0, Math.PI * 2); c.fill(); }
        }
      } else if (A.floor === 'basalt') {
        c.fillStyle = A.fieldB; c.fillRect(0, 0, w, h);
        // hexagonal basalt columns
        const R = 46, hx = R * Math.sqrt(3);
        for (let row = -1; row < h / (R * 1.5) + 1; row++) for (let col = -1; col < w / hx + 1; col++) {
          const x = col * hx + (row % 2 ? hx / 2 : 0), y = row * R * 1.5;
          const l = 0.9 + Math.random() * 0.2;
          c.fillStyle = `rgba(${Math.round(90 * l)},${Math.round(76 * l)},${Math.round(104 * l)},1)`;
          c.beginPath();
          for (let k = 0; k < 6; k++) c.lineTo(x + Math.cos(k * Math.PI / 3 + Math.PI / 6) * (R - 3), y + Math.sin(k * Math.PI / 3 + Math.PI / 6) * (R - 3));
          c.fill();
          c.fillStyle = 'rgba(255,255,255,0.05)';
          c.beginPath(); c.ellipse(x - 8, y - 10, R * 0.5, R * 0.3, -0.4, 0, Math.PI * 2); c.fill();
        }
      } else if (A.floor === 'marble') {
        // pale garden flagstones with pink petals blown across them
        c.fillStyle = '#d8cfc0'; c.fillRect(0, 0, w, h);
        const T = 85;
        for (let y = 0; y < h; y += T) for (let x = 0; x < w; x += T) {
          const l = 0.96 + Math.random() * 0.06;
          c.fillStyle = (x / T + y / T) % 2 ? A.fieldA : A.fieldB;
          c.globalAlpha = l; c.fillRect(x + 3, y + 3, T - 6, T - 6); c.globalAlpha = 1;
          // faint marble veins
          c.strokeStyle = 'rgba(170,150,190,0.16)'; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(x + Math.random() * T, y + 3);
          c.bezierCurveTo(x + Math.random() * T, y + T * 0.4, x + Math.random() * T, y + T * 0.6, x + Math.random() * T, y + T - 3); c.stroke();
        }
        for (let i = 0; i < 260; i++) {
          c.save(); c.translate(Math.random() * w, Math.random() * h); c.rotate(Math.random() * 6);
          c.fillStyle = ['#ff9ac8', '#ffc4de', '#ffffff'][i % 3]; c.globalAlpha = 0.75;
          c.beginPath(); c.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2); c.fill();
          c.restore();
        }
        c.globalAlpha = 1;
      } else if (A.floor === 'neon') {
        // glossy rooftop tiles with soft reflections of the skyline
        c.fillStyle = A.fieldA; c.fillRect(0, 0, w, h);
        const T = 64;
        for (let y = 0; y < h; y += T) for (let x = 0; x < w; x += T) {
          c.fillStyle = ((x + y) / T) % 2 ? A.fieldB : A.fieldA; c.fillRect(x + 2, y + 2, T - 4, T - 4);
          c.fillStyle = 'rgba(255,255,255,0.04)'; c.fillRect(x + 4, y + 4, T - 8, 10);
        }
        for (let i = 0; i < 40; i++) {
          const x = Math.random() * w, y = Math.random() * h, r = 30 + Math.random() * 90;
          const g = c.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, ['rgba(255,90,216,0.14)', 'rgba(58,240,255,0.12)', 'rgba(255,216,74,0.08)'][i % 3]); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
        }
      } else {
        for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? A.fieldA : A.fieldB; c.fillRect(i * w / 16, 0, w / 16 + 1, h); }
        // subtle checker
        c.globalAlpha = 0.06; c.fillStyle = '#000';
        for (let i = 0; i < 16; i++) if (i % 2) c.fillRect(0, i * h / 16, w, h / 16);
        // painterly grass flecks
        for (let i = 0; i < 9000; i++) {
          const x = Math.random() * w, y = Math.random() * h;
          c.globalAlpha = 0.04 + Math.random() * 0.07;
          c.fillStyle = Math.random() < 0.5 ? '#ffffff' : '#000000';
          c.fillRect(x, y, 1.5, 3 + Math.random() * 4);
        }
        c.globalAlpha = 1;
      }
      const cx = w / 2, cy = h / 2;
      c.strokeStyle = A.line; c.lineWidth = 12;
      c.beginPath(); c.arc(cx, cy, w * 0.47, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 8;
      c.beginPath(); c.arc(cx, cy, w * 0.16, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(cx, cy - w * 0.47); c.lineTo(cx, cy + w * 0.47); c.stroke();
      // paw emblem
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath(); c.ellipse(cx, cy - 18, 46, 38, 0, 0, Math.PI * 2); c.fill();
      for (const [dx, dy, r] of [[-52, 30, 18], [-20, 62, 19], [20, 62, 19], [52, 30, 18]]) {
        c.beginPath(); c.ellipse(cx + dx, cy + dy, r, r * 1.2, dx * 0.006, 0, Math.PI * 2); c.fill();
      }
      // starting marks
      c.fillStyle = A.line;
      for (const s of [-1, 1]) c.fillRect(cx + s * w * 0.3 - 30, cy - 4, 60, 8);
    });
    const field = new THREE.Mesh(new THREE.CircleGeometry(ARENA_R + 0.5, 72), toon(0xffffff, { env: true, rim: 0, map: fieldTex }));
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    G.add(field);

    // volcano: glowing lava seams over the basalt, pulsing gently (blooms nicely)
    if (A.floor === 'basalt') {
      const crackTex = canvasTex(1024, 1024, (c, w, h) => {
        c.lineCap = 'round'; c.lineJoin = 'round';
        for (let i = 0; i < 18; i++) {
          let x = Math.random() * w, y = Math.random() * h, a = Math.random() * 6;
          const pts = [[x, y]];
          for (let k = 0; k < 9; k++) { a += (Math.random() - 0.5) * 1.4; x += Math.cos(a) * 34; y += Math.sin(a) * 34; pts.push([x, y]); }
          for (const [lw, col] of [[22, 'rgba(255,70,20,0.22)'], [11, 'rgba(255,110,30,0.6)'], [5, 'rgba(255,190,80,1)'], [2, 'rgba(255,250,210,1)']]) {
            c.strokeStyle = col; c.lineWidth = lw;
            c.beginPath(); pts.forEach(([px, py]) => c.lineTo(px, py)); c.stroke();
          }
        }
      });
      const cracks = new THREE.Mesh(new THREE.CircleGeometry(ARENA_R + 0.5, 72), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      cracks.rotation.x = -Math.PI / 2; cracks.position.y = 0.012;
      G.add(cracks);
      this.cracks = cracks;
    }

    // rooftop: glowing neon grid lines and rings that pulse with the music
    if (A.floor === 'neon') {
      const gridTex = canvasTex(1024, 1024, (c, w, h) => {
        const line = (col, lw, fn) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); fn(); c.stroke(); };
        for (const [lw, a] of [[10, 0.25], [4, 0.7], [1.5, 1]]) {
          for (let i = 128; i < w; i += 128) {
            line(`rgba(58,240,255,${a * 0.6})`, lw * 0.7, () => { c.moveTo(i, 0); c.lineTo(i, h); c.moveTo(0, i); c.lineTo(w, i); });
          }
          line(`rgba(255,90,216,${a})`, lw * 1.4, () => c.arc(w / 2, h / 2, w * 0.47, 0, Math.PI * 2));
          line(`rgba(255,90,216,${a})`, lw, () => c.arc(w / 2, h / 2, w * 0.16, 0, Math.PI * 2));
          line(`rgba(255,216,74,${a})`, lw, () => c.arc(w / 2, h / 2, w * 0.43, 0, Math.PI * 2));
        }
      });
      const grid = new THREE.Mesh(new THREE.CircleGeometry(ARENA_R + 0.5, 72), new THREE.MeshBasicMaterial({ map: gridTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      grid.rotation.x = -Math.PI / 2; grid.position.y = 0.012;
      G.add(grid);
      this.cracks = grid;
    }

    // dirt ring between field and wall
    const ring = new THREE.Mesh(new THREE.RingGeometry(ARENA_R + 0.5, ARENA_R + 1.4, 72), toon(A.floor === 'neon' ? 0x3a3060 : 0xd9b07a, { env: true, rim: 0 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; ring.receiveShadow = true;
    G.add(ring);

    // padded wall made of alternating colour segments
    const segN = 32;
    const wallGeos = [[], []];
    for (let i = 0; i < segN; i++) {
      const a0 = (i / segN) * Math.PI * 2, a1 = ((i + 1) / segN) * Math.PI * 2;
      const g = new THREE.CylinderGeometry(ARENA_R + 1.7, ARENA_R + 1.7, 0.9, 6, 1, true, a0, a1 - a0);
      g.translate(0, 0.45, 0);
      wallGeos[i % 2].push(g);
      const cap = new THREE.TorusGeometry(ARENA_R + 1.7, 0.16, 8, 6, a1 - a0);
      cap.rotateX(-Math.PI / 2);
      cap.rotateY(a0 - Math.PI / 2);
      cap.translate(0, 0.9, 0);
      wallGeos[(i + 1) % 2].push(cap);
    }
    const wallMats = [toon(A.wallA, { env: true, rim: 0.3, side: THREE.DoubleSide }), toon(A.wallB, { env: true, rim: 0.3, side: THREE.DoubleSide })];
    wallGeos.forEach((gs, k) => {
      const m = new THREE.Mesh(mergeGeometries(gs), wallMats[k]);
      m.castShadow = m.receiveShadow = true;
      G.add(m);
    });

    // stands: stepped tiers with seat colours
    const tiers = 7, r0 = ARENA_R + 3.4;
    // stepped profile lathed around the field (open toward the camera)
    const prof = [new THREE.Vector2(r0 - 0.3, 0)];
    for (let t = 0; t < tiers; t++) {
      const r = r0 + t * 1.25, y = 0.6 + t * 0.75;
      prof.push(new THREE.Vector2(r - 0.3 + (t ? 0 : 0), y), new THREE.Vector2(r + 0.95, y));
    }
    const rOut = r0 + tiers * 1.25 + 0.2;
    prof.push(new THREE.Vector2(rOut, 0.6 + (tiers - 1) * 0.75), new THREE.Vector2(rOut, 0));
    // lathe needs points in order; reverse so faces point outward/up
    const standGeo = new THREE.LatheGeometry(prof.reverse(), 72, Math.PI * 0.17, Math.PI * 1.66);
    {
      // seat rows: alternate the seat colours by tier, risers stay pale
      const pos = standGeo.attributes.position, cols = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getZ(i)), y = pos.getY(i);
        const t = Math.max(0, Math.min(tiers - 1, Math.floor((r - r0 + 0.3) / 1.25)));
        c.setHex(A.seat[t % A.seat.length]).lerp(new THREE.Color(0xffffff), 0.25);
        if (y < 0.3) c.setHex(0x8f7fd0);
        cols.set([c.r, c.g, c.b], i * 3);
      }
      standGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    }
    const standMat = toon(0xffffff, { env: true, rim: 0, side: THREE.DoubleSide, vertexColors: true });
    const stands = new THREE.Mesh(standGeo, standMat);
    stands.receiveShadow = true;
    // the gap in the stands (theta ~ 0, +z) is where the camera sits
    G.add(stands);
    // big back wall behind stands
    const back = new THREE.Mesh(new THREE.CylinderGeometry(r0 + tiers * 1.25 + 1.3, r0 + tiers * 1.25 + 1.6, 9, 64, 1, true, Math.PI * 0.17, Math.PI * 1.66), toon(A.back || 0x5a4c9a, { env: true, rim: 0, side: THREE.DoubleSide }));
    back.position.y = 4.5;
    G.add(back);
    // colour band on the top lip
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(r0 + tiers * 1.25 + 1.65, r0 + tiers * 1.25 + 1.65, 0.8, 64, 1, true, Math.PI * 0.17, Math.PI * 1.66), toon(A.accent, { env: true, rim: 0, side: THREE.DoubleSide }));
    lip.position.y = 9;
    G.add(lip);

    // crowd: instanced blobs (body + head) bouncing in the stands
    const body = new THREE.CapsuleGeometry(0.28, 0.35, 4, 8); body.translate(0, 0.45, 0);
    const head = new THREE.SphereGeometry(0.26, 10, 8); head.translate(0, 1.05, 0);
    const earL = new THREE.SphereGeometry(0.1, 6, 6); earL.translate(-0.17, 1.28, 0);
    const earR = earL.clone(); earR.translate(0.34, 0, 0);
    const crowdGeo = mergeGeometries([body, head, earL, earR]);
    crowdGeo.scale(0.85, 0.85, 0.85);
    const crowdMat = toon(0xffffff, { env: true, rim: 0.4 });
    const fans = [];
    for (let t = 0; t < tiers; t++) {
      const r = r0 + t * 1.25 + 0.55, y = 0.6 + t * 0.75;
      const n = Math.floor(r * 2.6);
      for (let i = 0; i < n; i++) {
        const a = Math.PI * 0.19 + (i / n) * Math.PI * 1.62 + (rand() - 0.5) * 0.02;
        if (rand() < 0.12) continue;
        fans.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, y, a, ph: rand() * 6.28, sp: 0.8 + rand() * 0.8, s: 0.8 + rand() * 0.35 });
      }
    }
    // shuffle so a reduced instance count on low quality thins the crowd evenly
    for (let i = fans.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [fans[i], fans[j]] = [fans[j], fans[i]]; }
    const crowd = this.crowd = new THREE.InstancedMesh(crowdGeo, crowdMat, fans.length);
    const col = new THREE.Color();
    const palette = [0xff8fa3, 0xffd166, 0x8fd3ff, 0xb39cff, 0x9be59b, 0xffb37a, 0xf4f4f4, 0x6b6b8f];
    fans.forEach((f, i) => { col.setHex(palette[Math.floor(rand() * palette.length)]); crowd.setColorAt(i, col); });
    this.fans = fans;
    crowd.castShadow = false;
    G.add(crowd);
    this.excite = 0.2;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this.updateCrowd(0);

    // floodlight towers
    const towerMat = toon(0xdedbe8, { env: true, rim: 0.2 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfffbe8 });
    for (const a of [0.25, 0.75, 1.25, 1.75]) {
      const ang = a * Math.PI;
      const R = r0 + tiers * 1.25 + 3;
      const tw = new THREE.Group();
      tw.position.set(Math.cos(ang) * R, 0, Math.sin(ang) * R);
      const pole = inked(new THREE.CylinderGeometry(0.35, 0.55, 20, 8), towerMat, 0.05);
      pole.position.y = 10;
      tw.add(pole);
      const panel = inked(new THREE.BoxGeometry(4, 2.4, 0.5), towerMat, 0.05);
      panel.position.y = 20.5;
      tw.add(panel);
      for (let ix = 0; ix < 3; ix++) for (let iy = 0; iy < 2; iy++) {
        const l = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), lampMat);
        l.position.set(-1.25 + ix * 1.25, 19.95 + iy * 1.1, 0.26);
        panel.add(l); l.position.y -= 20.5 - 0.0;
      }
      tw.lookAt(0, 0, 0);
      G.add(tw);
    }

    // pennant flags along the lip
    this.flags = [];
    const flagGeo = new THREE.PlaneGeometry(1.4, 0.9, 6, 3);
    flagGeo.translate(0.7, 0, 0);
    const flagMats = A.seat.map((c) => toon(c, { env: true, rim: 0, side: THREE.DoubleSide }));
    const R = r0 + tiers * 1.25 + 1.6;
    for (let i = 0; i < 20; i++) {
      const ang = Math.PI * 0.19 + (i / 19) * Math.PI * 1.62;
      const fl = new THREE.Group();
      fl.position.set(Math.sin(ang) * R, 9.4, Math.cos(ang) * R);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), towerMat);
      pole.position.y = 1.5;
      fl.add(pole);
      const f = new THREE.Mesh(flagGeo.clone(), flagMats[i % flagMats.length]);
      f.position.y = 2.5;
      fl.add(f);
      fl.userData.flag = f; fl.userData.ph = i * 0.7;
      fl.rotation.y = rand() * 6;
      this.flags.push(fl);
      G.add(fl);
    }

    // scenery: rolling hills and puffy toon trees, merged into a handful of draws
    const hillGeos = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rand() * 0.3;
      const r = 120 + rand() * 60;
      const h = new THREE.SphereGeometry(30 + rand() * 25, 20, 12);
      h.scale(1.6, 0.5 + rand() * 0.4, 1.2);
      h.translate(Math.cos(a) * r, -6, Math.sin(a) * r);
      hillGeos.push(h);
    }
    if (A.scenery !== 'city') G.add(new THREE.Mesh(mergeGeometries(hillGeos), toon(A.hill, { env: true, rim: 0 })));
    const trunks = [], tops = [[], [], []];
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3();
    for (let i = 0; i < (A.scenery === 'trees' ? 46 : 0); i++) {
      const a = rand() * Math.PI * 2;
      const r = 34 + rand() * 40;
      v4.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6);
      s4.setScalar(1.2 + rand() * 1.4);
      m4.compose(v4, q4, s4);
      const tr = new THREE.CylinderGeometry(0.25, 0.4, 2.6, 6); tr.translate(0, 1.3, 0); tr.applyMatrix4(m4);
      trunks.push(tr);
      for (let k = 0; k < 3; k++) {
        const sp = new THREE.SphereGeometry(1.6 - k * 0.3, 12, 10);
        sp.translate((k - 1) * 0.9, 3.2 + (k % 2) * 0.6, 0);
        sp.applyMatrix4(m4);
        tops[i % 3].push(sp);
      }
    }
    if (A.scenery === 'palms') {
      // curved palm trunks with drooping fronds
      for (let i = 0; i < 30; i++) {
        const a = rand() * Math.PI * 2, r = 34 + rand() * 26, sc = 1 + rand() * 0.8, lean = 0.2 + rand() * 0.3, yaw = rand() * 6;
        const base = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
        const pts = [0, 1, 2, 3, 4].map((k) => new THREE.Vector3(Math.sin(yaw) * k * k * lean * 0.35, k * 1.6, Math.cos(yaw) * k * k * lean * 0.35).multiplyScalar(sc).add(base));
        trunks.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.22 * sc, 6));
        const top = pts[4];
        for (let k = 0; k < 6; k++) {
          const fr = new THREE.SphereGeometry(1, 10, 6);
          fr.scale(0.5, 0.12, 2.2 * sc);
          fr.translate(0, -0.3, 1.9 * sc);
          fr.rotateX(0.35);
          fr.rotateY(k / 6 * Math.PI * 2 + rand());
          fr.translate(top.x, top.y, top.z);
          tops[k % 3].push(fr);
        }
      }
    } else if (A.scenery === 'pines') {
      // stacked-cone pines with snowy tips
      const snowCaps = [];
      for (let i = 0; i < 54; i++) {
        const a = rand() * Math.PI * 2, r = 33 + rand() * 45, sc = 1.1 + rand() * 1.3;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const tr = new THREE.CylinderGeometry(0.22 * sc, 0.3 * sc, 1.4 * sc, 6); tr.translate(x, 0.7 * sc, z);
        trunks.push(tr);
        for (let k = 0; k < 3; k++) {
          const cone = new THREE.ConeGeometry((1.9 - k * 0.5) * sc, 2.2 * sc, 8);
          cone.translate(x, (2 + k * 1.25) * sc, z);
          tops[i % 3].push(cone);
          const cap = new THREE.ConeGeometry((1.0 - k * 0.25) * sc, 1.0 * sc, 8);
          cap.translate(x, (2.6 + k * 1.25) * sc, z);
          snowCaps.push(cap);
        }
      }
      G.add(new THREE.Mesh(mergeGeometries(snowCaps), toon(0xffffff, { env: true, rim: 0.2 })));
    } else if (A.scenery === 'rocks') {
      for (let i = 0; i < 40; i++) {
        const a = rand() * Math.PI * 2, r = 32 + rand() * 50;
        const g = new THREE.DodecahedronGeometry(1.5 + rand() * 3, 0);
        g.scale(1, 0.6 + rand() * 1.4, 1);
        g.rotateY(rand() * 6);
        g.translate(Math.cos(a) * r, 0.5, Math.sin(a) * r);
        tops[i % 3].push(g);
      }
    }
    else if (A.scenery === 'mushrooms') {
      // a ring of giant toadstools with white spots, plus small glowing caps along the outer wall
      const spots = [], glow = [];
      for (let i = 0; i < 44; i++) {
        const a = rand() * Math.PI * 2, r = 36 + rand() * 46, sc = 2.4 + rand() * 2.8;
        const x = Math.cos(a) * r, z = Math.sin(a) * r, h = (2.2 + rand() * 1.6) * sc;
        const st = new THREE.CylinderGeometry(0.32 * sc, 0.5 * sc, h, 8); st.translate(x, h / 2, z);
        trunks.push(st);
        const cap = new THREE.SphereGeometry(1.5 * sc, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        cap.scale(1, 0.7, 1); cap.translate(x, h - 0.15 * sc, z);
        tops[i % 3].push(cap);
        for (let k = 0; k < 5; k++) {
          const sa = rand() * 6.28, sl = 0.25 + rand() * 0.9;
          const d = new THREE.SphereGeometry(0.22 * sc, 6, 4);
          d.scale(1, 0.4, 1);
          d.translate(x + Math.cos(sa) * Math.sin(sl) * 1.45 * sc, h - 0.15 * sc + Math.cos(sl) * 1.02 * sc, z + Math.sin(sa) * Math.sin(sl) * 1.45 * sc);
          spots.push(d);
        }
      }
      for (let i = 0; i < 60; i++) {
        const a = rand() * Math.PI * 2, r = r0 + tiers * 1.25 + 2 + rand() * 8, sc = 0.4 + rand() * 0.5;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const g = new THREE.SphereGeometry(sc, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.8, 1); g.translate(x, sc * 1.2, z);
        glow.push(g);
        const st = new THREE.CylinderGeometry(0.1 * sc, 0.14 * sc, sc * 1.3, 6); st.translate(x, sc * 0.6, z);
        trunks.push(st);
      }
      G.add(new THREE.Mesh(mergeGeometries(spots), toon(0xfff8ee, { env: true, rim: 0 })));
      G.add(new THREE.Mesh(mergeGeometries(glow), new THREE.MeshBasicMaterial({ color: 0x9affd8 })));
    }
    else if (A.scenery === 'city') this.buildCity(G, rand, r0 + tiers * 1.25);
    else if (A.scenery === 'islands') this.buildSky(G, rand, r0 + tiers * 1.25, ground, trunks, tops);
    if (trunks.length) G.add(new THREE.Mesh(mergeGeometries(trunks), toon(A.trunk, { env: true, rim: 0 })));
    A.leaves.forEach((c, k) => { if (tops[k].length) G.add(inked(mergeGeometries(tops[k]), toon(c, { env: true, rim: 0.3 }), 0.06)); });
    if (A.snow) {
      // drifting snowflakes in a box around the camera's usual view
      const n = 900, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { pos[i * 3] = (rand() - 0.5) * 60; pos[i * 3 + 1] = rand() * 22; pos[i * 3 + 2] = (rand() - 0.5) * 60; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const flakeTex = canvasTex(32, 32, (c, w, h) => {
        const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = gr; c.fillRect(0, 0, w, h);
      });
      this.snow = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.22, map: flakeTex, transparent: true, depthWrite: false, color: 0xffffff }));
      this.snow.frustumCulled = false;
      G.add(this.snow);
    }
    if (A.fireflies) {
      // drifting fireflies that glow through the bloom
      const n = 220, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = rand() * 6.28, r = 6 + rand() * 40; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 0.6 + rand() * 9; pos[i * 3 + 2] = Math.sin(a) * r; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const tex = canvasTex(32, 32, (c, w, h) => {
        const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gr.addColorStop(0, 'rgba(255,255,220,1)'); gr.addColorStop(0.3, 'rgba(220,255,140,0.8)'); gr.addColorStop(1, 'rgba(160,255,120,0)');
        c.fillStyle = gr; c.fillRect(0, 0, w, h);
      });
      this.flies = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.9, map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff }));
      this.flies.frustumCulled = false;
      this.flies.userData.base = pos.slice();
      G.add(this.flies);
    }
    if (A.drift) this.buildDrift(G, rand, A.drift);
    if (A.rain) {
      // a light city drizzle: slanted streaks that catch the neon through the bloom
      const n = 700, pos = new Float32Array(n * 6);
      for (let i = 0; i < n; i++) {
        const a = rand() * 6.28, r = 1 + rand() * 24, x = Math.cos(a) * r, z = Math.sin(a) * r, y = rand() * 16;
        pos.set([x, y, z, x + 0.12, y + 0.75, z], i * 6);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x9ad8ff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.rain.frustumCulled = false;
      G.add(this.rain);
    }
    if (A.water) {
      // shallow lagoon ring with bright foam edge
      const sea = new THREE.Mesh(new THREE.RingGeometry(62, 320, 64), toon(A.water, { env: true, rim: 0 }));
      sea.rotation.x = -Math.PI / 2; sea.position.y = 0.04;
      const foam = new THREE.Mesh(new THREE.RingGeometry(60, 63, 64), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      foam.rotation.x = -Math.PI / 2; foam.position.y = 0.05;
      G.add(sea, foam);
      this.foam = foam;
    }
    if (A.lava) {
      // glowing lava moat and a distant smoking volcano
      const lava = new THREE.Mesh(new THREE.RingGeometry(r0 + tiers * 1.25 + 4, r0 + tiers * 1.25 + 9, 64), new THREE.MeshBasicMaterial({ color: A.lava }));
      lava.rotation.x = -Math.PI / 2; lava.position.y = 0.06;
      G.add(lava);
      this.lava = lava;
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(8, 60, 55, 24, 1, true), toon(0x3a2a40, { env: true, rim: 0 }));
      cone.position.set(-40, 20, -170);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(8, 24), new THREE.MeshBasicMaterial({ color: 0xff7a2a }));
      glow.rotation.x = -Math.PI / 2; glow.position.set(-40, 47.4, -170);
      G.add(cone, glow);
      this.ventPos = new THREE.Vector3(-40, 48, -170);
    }

    // jumbotron above the far stands
    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = 1024; this.screenCanvas.height = 384;
    this.screenTex = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTex.colorSpace = THREE.SRGBColorSpace;
    const scr = new THREE.Group();
    const frame = inked(new THREE.BoxGeometry(13.6, 5.4, 0.6), toon(0x2a2050, { env: true, rim: 0.2 }), 0.06);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 4.8), new THREE.MeshBasicMaterial({ map: this.screenTex, toneMapped: false }));
    panel.position.z = 0.31;
    scr.add(frame, panel);
    for (const sx of [-4, 4]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 12, 8), toon(0xdedbe8, { env: true, rim: 0 }));
      leg.position.set(sx, -7.5, -0.2);
      scr.add(leg);
    }
    const rScr = r0 + tiers * 1.25 + 1.8;
    scr.position.set(0, 12, -rScr);
    G.add(scr);
    this.drawScreen();

    // soft volumetric beams from the floodlights
    const beamMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uCol: { value: new THREE.Color(A.beam || 0xfff4d0) } },
      vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uCol; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN, vV)), 1.5); gl_FragColor = vec4(uCol * f * vY * 0.11, 1.0); }',
    });
    for (const a of [0.75, 1.25]) {
      const ang = a * Math.PI;
      const R = r0 + tiers * 1.25 + 3;
      const top = new THREE.Vector3(Math.cos(ang) * R, 20.5, Math.sin(ang) * R);
      const target = new THREE.Vector3(Math.cos(ang) * 2, 0, Math.sin(ang) * 2);
      const len = top.distanceTo(target);
      const cone = new THREE.CylinderGeometry(1.8, 7, len, 24, 1, true);
      cone.translate(0, -len / 2, 0);
      const beam = new THREE.Mesh(cone, beamMat);
      beam.position.copy(top);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), target.clone().sub(top).normalize());
      beam.renderOrder = 4;
      G.add(beam);
    }

    // clouds
    this.clouds = [];
    const cloudMat = toon(A.cloud, { env: true, rim: 0, emissive: A.cloudShade });
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Mesh(cloud(rand), cloudMat);
      const a = rand() * Math.PI * 2, r = 120 + rand() * 120;
      c.position.set(Math.cos(a) * r, 35 + rand() * 40, Math.sin(a) * r);
      c.rotation.y = rand() * 3;
      c.scale.setScalar(1 + rand());
      c.userData.sp = 0.6 + rand();
      this.clouds.push(c);
      G.add(c);
    }
  }

  // Cloudtop Gardens: the stadium floats on a rock island above a sea of clouds,
  // with blossom-tree islets and hot-air balloons drifting past
  buildSky(G, rand, rOut, ground, trunks, tops) {
    ground.position.y = -16;
    const rock = toon(0xb4a4c8, { env: true, rim: 0.2 }), grass = toon(0x7cd07a, { env: true, rim: 0 });
    // the stadium's own island: a rocky underside under a grassy rim
    const baseG = new THREE.CylinderGeometry(rOut + 4, 5, 18, 28, 3);
    const bp = baseG.attributes.position;
    for (let i = 0; i < bp.count; i++) { if (bp.getY(i) < 8.9) { const k = 1 + (rand() - 0.5) * 0.18; bp.setX(i, bp.getX(i) * k); bp.setZ(i, bp.getZ(i) * k); } }
    baseG.computeVertexNormals();
    baseG.translate(0, -9.05, 0);
    const rocks = [baseG], caps = [];
    const lip = new THREE.CylinderGeometry(rOut + 4.4, rOut + 4.2, 0.5, 40); lip.translate(0, -0.27, 0); caps.push(lip);
    // floating islets, each with a blossom tree or two
    this.islands = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.4, r = 55 + rand() * 60, sc = 1.6 + rand() * 2.4;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = 4 + rand() * 22;
      const isl = new THREE.Group();
      isl.position.set(x, y, z);
      const cone = new THREE.ConeGeometry(3 * sc, 5 * sc, 7); cone.rotateX(Math.PI); cone.translate(0, -2.5 * sc, 0);
      const top = new THREE.CylinderGeometry(3.15 * sc, 3 * sc, 0.6 * sc, 14); top.translate(0, 0.1 * sc, 0);
      isl.add(new THREE.Mesh(cone, rock), new THREE.Mesh(top, grass));
      const tr = [], lv = [];
      for (let k = 0; k < 1 + (i % 2); k++) {
        const tx = (k ? 1.2 : -0.6) * sc, tz = (rand() - 0.5) * sc;
        const t = new THREE.CylinderGeometry(0.18 * sc, 0.28 * sc, 1.6 * sc, 6); t.translate(tx, 1.1 * sc, tz); tr.push(t);
        for (let j = 0; j < 3; j++) { const b = new THREE.SphereGeometry((1 - j * 0.15) * sc, 10, 8); b.translate(tx + (j - 1) * 0.6 * sc, (2.2 + (j % 2) * 0.4) * sc, tz); lv.push(b); }
      }
      isl.add(new THREE.Mesh(mergeGeometries(tr), toon(0x9a6a4a, { env: true, rim: 0 })));
      isl.add(inked(mergeGeometries(lv), toon(i % 3 ? 0xff9ac8 : 0xffc4de, { env: true, rim: 0.3 }), 0.05));
      isl.userData = { y, ph: rand() * 6 };
      G.add(isl);
      this.islands.push(isl);
    }
    G.add(new THREE.Mesh(mergeGeometries(rocks), rock));
    G.add(new THREE.Mesh(mergeGeometries(caps), grass));
    // the sea of clouds below
    const puffs = [];
    for (let i = 0; i < 70; i++) {
      const a = rand() * Math.PI * 2, r = 30 + rand() * 170;
      const g = new THREE.SphereGeometry(6 + rand() * 10, 12, 8);
      g.scale(1.6, 0.55, 1.2);
      g.translate(Math.cos(a) * r, -15 + rand() * 6, Math.sin(a) * r);
      puffs.push(g);
    }
    G.add(new THREE.Mesh(mergeGeometries(puffs), toon(0xffffff, { env: true, rim: 0, emissive: 0x6a70a8 })));
    // hot-air balloons with striped envelopes
    this.balloons = [];
    const cols = [['#ff6a8a', '#fff4e0'], ['#5ab8ff', '#ffe066'], ['#8a6aff', '#ffffff'], ['#ffb040', '#ff6a8a'], ['#5ad08a', '#fff4e0']];
    for (let i = 0; i < 6; i++) {
      const [c1, c2] = cols[i % cols.length];
      const tex = canvasTex(128, 64, (c, w, h) => { for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? c2 : c1; c.fillRect(k * w / 8, 0, w / 8 + 1, h); } });
      const b = new THREE.Group();
      const env = new THREE.SphereGeometry(2.4, 20, 14); env.scale(1, 1.18, 1);
      b.add(inked(env, toon(0xffffff, { map: tex, env: true, rim: 0.3 }), 0.06));
      const bask = inked(new THREE.CylinderGeometry(0.55, 0.45, 0.7, 10), toon(0x9a6a3a, { env: true, rim: 0 }), 0.04);
      bask.position.y = -3.9; b.add(bask);
      const ropeG = [];
      for (let k = 0; k < 4; k++) { const rg = new THREE.CylinderGeometry(0.03, 0.03, 1.4, 4); rg.translate(Math.cos(k * 1.57 + 0.78) * 0.45, -2.95, Math.sin(k * 1.57 + 0.78) * 0.45); ropeG.push(rg); }
      b.add(new THREE.Mesh(mergeGeometries(ropeG), toon(0x6a4a3a)));
      const a = rand() * Math.PI * 2, r = 40 + rand() * 50;
      b.userData = { a, r, y: 14 + rand() * 18, sp: (0.008 + rand() * 0.012) * (i % 2 ? 1 : -1), ph: rand() * 6 };
      b.scale.setScalar(1 + rand() * 0.6);
      G.add(b);
      this.balloons.push(b);
    }
    void trunks; void tops;
  }

  // night skyline: merged towers with lit windows, neon signs and sweeping searchlights
  buildCity(G, rand, rStands) {
    const winTex = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#141030'; c.fillRect(0, 0, w, h);
      const cols = ['#ffd98a', '#ffe9b8', '#7af0ff', '#ff9ae0', '#2a2450', '#2a2450', '#2a2450'];
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        c.fillStyle = cols[Math.floor(Math.random() * cols.length)];
        c.fillRect(x * 32 + 8, y * 32 + 7, 16, 18);
      }
    });
    winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
    const boxes = [], roofs = [];
    for (let i = 0; i < 70; i++) {
      const a = rand() * Math.PI * 2, r = 85 + rand() * 110;
      const bw = 8 + rand() * 10, bd = 8 + rand() * 10, bh = 18 + rand() * 50 + (r > 120 ? 20 : 0);
      const b = new THREE.BoxGeometry(bw, bh, bd);
      // tile windows to the face size; top faces sample a dark texel
      const uv = b.attributes.uv, nrm = b.attributes.normal;
      for (let k = 0; k < uv.count; k++) {
        const ny = nrm.getY(k), nx = nrm.getX(k);
        if (Math.abs(ny) > 0.5) uv.setXY(k, 0.02, 0.02);
        else uv.setXY(k, uv.getX(k) * (Math.abs(nx) > 0.5 ? bd : bw) / 8, uv.getY(k) * bh / 8);
      }
      b.rotateY(rand() * 3);
      b.translate(Math.cos(a) * r, bh / 2 - 8, Math.sin(a) * r);
      boxes.push(b);
      if (rand() < 0.4) {
        // blinking aircraft beacon on the tallest roofs
        const s = new THREE.SphereGeometry(0.6, 8, 6);
        s.translate(Math.cos(a) * r, bh - 7.4, Math.sin(a) * r);
        roofs.push(s);
      }
    }
    const towers = new THREE.Mesh(mergeGeometries(boxes), new THREE.MeshBasicMaterial({ map: winTex, color: 0x9a90c8 }));
    G.add(towers);
    this.beacons = new THREE.Mesh(mergeGeometries(roofs), new THREE.MeshBasicMaterial({ color: 0xff3a5a, toneMapped: false }));
    G.add(this.beacons);

    // neon signs above the stands (bloom does the glow)
    const sign = (draw, w, h, x, y, z) => {
      const tex = canvasTex(512, Math.round(512 * h / w), draw);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }));
      m.position.set(x, y, z);
      m.lookAt(0, y, 0);
      G.add(m);
      return m;
    };
    const glowText = (c, s, x, y, size, col) => {
      c.font = `400 ${size}px "Lilita One", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = col; c.shadowBlur = 24; c.lineWidth = size * 0.08; c.strokeStyle = col;
      c.strokeText(s, x, y); c.strokeText(s, x, y);
      c.shadowBlur = 0; c.fillStyle = '#fff'; c.fillText(s, x, y);
    };
    const R = rStands + 2.2;
    this.signs = [
      sign((c, w, h) => glowText(c, 'BONK!', w / 2, h / 2, 150, '#ff4fd0'), 9, 3.6, Math.cos(Math.PI * 1.25) * R, 13.2, Math.sin(Math.PI * 1.25) * R),
      sign((c, w, h) => glowText(c, 'CLASH', w / 2, h / 2, 150, '#3af0ff'), 9, 3.6, Math.cos(Math.PI * 1.75) * R, 13.2, Math.sin(Math.PI * 1.75) * R),
      sign((c, w, h) => {
        c.translate(w / 2, h / 2); c.strokeStyle = '#ffd84a'; c.shadowColor = '#ffd84a'; c.shadowBlur = 22; c.lineWidth = 12;
        c.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? 70 : 170; c.lineTo(Math.cos(k * Math.PI / 5 - Math.PI / 2) * rr, Math.sin(k * Math.PI / 5 - Math.PI / 2) * rr); } c.closePath(); c.stroke(); c.stroke();
        c.lineWidth = 4; c.shadowBlur = 0; c.strokeStyle = '#fff'; c.stroke();
      }, 6, 6, Math.cos(Math.PI * 0.95) * R, 14, Math.sin(Math.PI * 0.95) * R),
      sign((c, w, h) => {
        c.translate(w / 2, h / 2 + 20); c.strokeStyle = '#ff4fd0'; c.shadowColor = '#ff4fd0'; c.shadowBlur = 22; c.lineWidth = 12;
        c.beginPath(); c.moveTo(0, 150); c.bezierCurveTo(-260, -20, -110, -200, 0, -70); c.bezierCurveTo(110, -200, 260, -20, 0, 150); c.stroke(); c.stroke();
        c.lineWidth = 4; c.shadowBlur = 0; c.strokeStyle = '#fff'; c.stroke();
      }, 6, 6, Math.cos(Math.PI * 0.05 + Math.PI * 2) * R, 14, Math.sin(Math.PI * 2.05) * R),
    ];
    this.signs.forEach((m, i) => { m.userData.ph = i * 1.7; });

    // neon tubes along the wall cap
    const tubeMats = [0xff4fd0, 0x3af0ff].map((c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
    const wallTube = new THREE.Mesh(new THREE.TorusGeometry(ARENA_R + 1.7, 0.07, 6, 96), tubeMats[0]);
    wallTube.rotation.x = -Math.PI / 2; wallTube.position.y = 1.08;
    // the stands' lip follows the lathe's angles (x = sin, z = cos), leaving the camera gap open
    const lipPts = [];
    for (let i = 0; i <= 80; i++) { const a = Math.PI * 0.17 + (i / 80) * Math.PI * 1.66; lipPts.push(new THREE.Vector3(Math.sin(a) * (rStands + 1.7), 9.42, Math.cos(a) * (rStands + 1.7))); }
    G.add(wallTube, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lipPts), 120, 0.12, 6), tubeMats[1]));
    this.tubes = tubeMats;

    // searchlights sweeping the sky
    const beamMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uCol: { value: new THREE.Color(0xc8b8ff) } },
      vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uCol; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN, vV)), 2.0); gl_FragColor = vec4(uCol * f * (1.0 - vY) * 0.16, 1.0); }',
    });
    this.searchlights = [];
    for (const [x, z, ph] of [[-60, -110, 0], [70, -120, 2.1], [-120, -40, 4]]) {
      const cone = new THREE.CylinderGeometry(5, 0.8, 160, 16, 1, true);
      cone.translate(0, 80, 0);
      const b = new THREE.Mesh(cone, beamMat);
      b.position.set(x, 0, z);
      b.userData.ph = ph;
      b.renderOrder = 3;
      G.add(b);
      this.searchlights.push(b);
    }
  }

  // scoreboard: names, portraits and a live HP readout
  drawScreen(info) {
    const c = this.screenCanvas.getContext('2d'), w = 1024, h = 384;
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3a2a8a'); g.addColorStop(1, '#1b1140');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.globalAlpha = 0.1; c.fillStyle = '#fff';
    for (let y = 0; y < h; y += 6) c.fillRect(0, y, w, 2);
    c.globalAlpha = 1;
    c.textAlign = 'center'; c.lineJoin = 'round';
    const text = (s, x, y, size, fill = '#fff') => {
      c.font = `400 ${size}px "Lilita One", sans-serif`;
      c.lineWidth = size * 0.22; c.strokeStyle = '#2a1630'; c.strokeText(s, x, y);
      c.fillStyle = fill; c.fillText(s, x, y);
    };
    if (!info) {
      text('CRITTER', w / 2, 170, 120);
      text('CLASH!', w / 2, 300, 140, '#ffc940');
    } else {
      if (info.imgs) info.imgs.forEach((im, i) => { if (im.complete) c.drawImage(im, i ? w - 300 : 20, 40, 280, 280); });
      text('VS', w / 2, 220, 120, '#ffc940');
      info.names.forEach((n, i) => text(n, i ? w - 160 : 160, 360, 44));
      info.hp?.forEach((v, i) => {
        const x = i ? w / 2 + 90 : 330, bw = 160;
        c.fillStyle = '#2a1630'; c.fillRect(x, 260, bw, 22);
        c.fillStyle = v < 0.3 ? '#ff6a3d' : '#5ce06a'; c.fillRect(x + 3, 263, (bw - 6) * v, 16);
      });
    }
    this.screenTex.needsUpdate = true;
  }

  // ambient motes that drift through the bowl: dandelion seeds (meadow), rising embers (volcano), blossom petals (sky)
  buildDrift(G, rand, kind) {
    const K = {
      seeds:  { n: 160, size: 0.55, vy: 0.25, wind: 0.6, inner: 'rgba(255,255,255,1)', outer: 'rgba(255,255,240,0)', add: false },
      embers: { n: 260, size: 0.5, vy: 1.4, wind: 0.3, inner: 'rgba(255,240,180,1)', outer: 'rgba(255,90,20,0)', add: true },
      petals: { n: 200, size: 0.5, vy: -0.6, wind: 0.8, inner: 'rgba(255,190,220,1)', outer: 'rgba(255,150,200,0)', add: false },
    }[kind];
    const n = K.n, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = rand() * 6.28, r = 1 + rand() * 22; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = rand() * 14; pos[i * 3 + 2] = Math.sin(a) * r; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const tex = canvasTex(32, 32, (c, w, h) => {
      const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, K.inner); gr.addColorStop(kind === 'embers' ? 0.25 : 0.45, K.inner); gr.addColorStop(1, K.outer);
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
    });
    this.drift = new THREE.Points(g, new THREE.PointsMaterial({ size: K.size, map: tex, transparent: true, depthWrite: false, blending: K.add ? THREE.AdditiveBlending : THREE.NormalBlending, color: 0xffffff, opacity: kind === 'seeds' ? 0.85 : 1 }));
    this.drift.frustumCulled = false;
    this.drift.userData = K;
    G.add(this.drift);
  }

  // low quality: half the crowd and a third of the snow
  setDetail(q) {
    this.crowd.count = q === 'low' ? Math.floor(this.fans.length * 0.5) : this.fans.length;
    if (this.snow) this.snow.geometry.setDrawRange(0, q === 'low' ? 300 : 900);
    if (this.rain) this.rain.geometry.setDrawRange(0, q === 'low' ? 600 : Infinity);
    if (this.drift) this.drift.geometry.setDrawRange(0, q === 'low' ? this.drift.userData.n >> 1 : Infinity);
  }

  updateCrowd(t) {
    const ex = this.excite;
    const m = this._m, q = this._q, e = this._e, p = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < this.crowd.count; i++) {
      const f = this.fans[i];
      const hop = Math.max(0, Math.sin(t * (4 + ex * 6) * f.sp + f.ph)) * (0.08 + ex * 0.5);
      p.set(f.x, f.y + hop, f.z);
      e.set(0, Math.atan2(-f.x, -f.z), Math.sin(t * 2 * f.sp + f.ph) * 0.1 * (1 + ex));
      q.setFromEuler(e);
      s.setScalar(f.s);
      m.compose(p, q, s);
      this.crowd.setMatrixAt(i, m);
    }
    this.crowd.instanceMatrix.needsUpdate = true;
  }

  update(dt, t) {
    this.sky.material.uniforms.uTime.value = t;
    if (this.snow) {
      const p = this.snow.geometry.attributes.position, a = p.array;
      for (let i = 0; i < a.length; i += 3) {
        a[i + 1] -= dt * (1.2 + (i % 7) * 0.12);
        a[i] += Math.sin(t * 0.8 + i) * dt * 0.4;
        if (a[i + 1] < 0) a[i + 1] += 22;
      }
      p.needsUpdate = true;
    }
    if (this.rain) {
      const p = this.rain.geometry.attributes.position, a = p.array;
      for (let i = 0; i < a.length; i += 6) {
        const d = dt * (14 + (i % 5));
        a[i + 1] -= d; a[i + 4] -= d; a[i] -= d * 0.16; a[i + 3] -= d * 0.16;
        if (a[i + 1] < 0) { a[i + 1] += 16; a[i + 4] += 16; a[i] += 2.56; a[i + 3] += 2.56; }
      }
      p.needsUpdate = true;
    }
    if (this.drift) {
      const K = this.drift.userData, p = this.drift.geometry.attributes.position, a = p.array;
      for (let i = 0; i < a.length; i += 3) {
        const k = (i % 9) / 9;
        a[i + 1] += dt * K.vy * (0.6 + k);
        a[i] += (K.wind + Math.sin(t * 0.9 + i) * 0.6) * dt;
        a[i + 2] += Math.cos(t * 0.7 + i * 0.3) * dt * 0.5;
        if (a[i + 1] > 14) a[i + 1] -= 14; else if (a[i + 1] < 0) a[i + 1] += 14;
        if (a[i] > 26) a[i] -= 52;
      }
      p.needsUpdate = true;
    }
    if (this.flies) {
      const p = this.flies.geometry.attributes.position, a = p.array, b = this.flies.userData.base;
      for (let i = 0; i < a.length; i += 3) {
        a[i] = b[i] + Math.sin(t * 0.5 + i) * 1.2; a[i + 1] = b[i + 1] + Math.sin(t * 0.8 + i * 0.7) * 0.6; a[i + 2] = b[i + 2] + Math.cos(t * 0.45 + i * 1.3) * 1.2;
      }
      p.needsUpdate = true;
      this.flies.material.opacity = 0.75 + Math.sin(t * 3) * 0.2;
    }
    if (this.cracks) this.cracks.material.opacity = 0.75 + Math.sin(t * 1.7) * 0.2;
    this.excite = Math.max(0.15, this.excite - dt * 0.25);
    this.updateCrowd(t);
    for (const fl of this.flags) {
      const f = fl.userData.flag, pos = f.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setZ(i, Math.sin(t * 5 + fl.userData.ph + x * 3) * 0.15 * x);
      }
      pos.needsUpdate = true;
    }
    for (const c of this.clouds) c.position.x += dt * c.userData.sp;
    if (this.lava) this.lava.material.color.setHex(this.A.lava).multiplyScalar(1.1 + Math.sin(t * 2) * 0.25);
    if (this.searchlights) {
      for (const b of this.searchlights) b.rotation.set(0.5 + Math.sin(t * 0.35 + b.userData.ph) * 0.25, 0, Math.sin(t * 0.27 + b.userData.ph) * 0.5);
      this.beacons.visible = (t % 1.6) < 0.5;
      for (const m of this.signs) m.material.opacity = Math.sin(t * 7 + m.userData.ph) > 0.97 ? 0.35 : 1;
    }
    if (this.foam) this.foam.scale.setScalar(1 + Math.sin(t * 1.3) * 0.012);
    if (this.balloons) {
      for (const b of this.balloons) {
        const u = b.userData; u.a += u.sp * dt * 6;
        b.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * 0.6 + u.ph) * 0.8, Math.sin(u.a) * u.r);
        b.rotation.z = Math.sin(t * 0.8 + u.ph) * 0.04;
      }
      for (const isl of this.islands) isl.position.y = isl.userData.y + Math.sin(t * 0.4 + isl.userData.ph) * 0.6;
    }
  }

  dispose() {
    this.group.parent?.remove(this.group);
    this.group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    this.screenTex.dispose();
  }

  cheer(amount = 1) { this.excite = Math.min(1, this.excite + amount); }
}
