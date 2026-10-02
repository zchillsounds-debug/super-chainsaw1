import * as THREE from 'three';
import { fbm, noise2, smooth, clamp, mulberry32 } from './noise.js';

export const WORLD = 280; // terrain size (units ~ meters)
const HALF = WORLD / 2;

// Canal centerline: x as a function of z.
export const canalX = (z) => -22 + Math.sin(z * 0.025) * 9 + Math.sin(z * 0.061) * 3;
export const CANAL_W = 7;

// Road polyline (village -> caravanserai -> bridge -> graveyard, and south to the arch).
export const ROADS = [
  [[14, 95], [12, 70], [10, 48], [14, 28], [30, 12], [52, 2]],
  [[14, 28], [4, 10], [-10, -2], [canalX(-6), -6], [-38, -14], [-52, -32]],
  [[4, 10], [6, -20], [8, -50], [10, -78]],
];

function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
export function roadDist(x, z) {
  let d = 1e9;
  for (const r of ROADS) for (let i = 0; i < r.length - 1; i++) d = Math.min(d, distSeg(x, z, ...r[i], ...r[i + 1]));
  return d;
}

// Flattened plateaus for key locations.
export const SITES = {
  village: { x: 18, z: 58, r: 26 },
  serai: { x: 56, z: 0, r: 24 },
  graveyard: { x: -56, z: -36, r: 22 },
  arch: { x: 10, z: -88, r: 30 },
};

export function rawHeight(x, z) {
  // gentle undulation + dunes towards the edges
  const edge = smooth(70, HALF - 6, Math.max(Math.abs(x), Math.abs(z)));
  let h = fbm(x * 0.012, z * 0.012, 4) * 3.2 + edge * (6 + fbm(x * 0.03 + 9, z * 0.03, 3) * 8);
  // dune ridges
  h += edge * Math.abs(noise2(x * 0.02, z * 0.05)) * 5;
  // canal trench
  const cd = Math.abs(x - canalX(z));
  h = h * smooth(CANAL_W * 0.5, CANAL_W * 2.2, cd) + (-1.6) * (1 - smooth(CANAL_W * 0.35, CANAL_W * 0.8, cd));
  // roads & sites flatten
  const rd = roadDist(x, z);
  h = THREE.MathUtils.lerp(h * 0.4, h, smooth(2.5, 9, rd));
  for (const s of Object.values(SITES)) {
    const d = Math.hypot(x - s.x, z - s.z);
    h = THREE.MathUtils.lerp(0.15, h, smooth(s.r * 0.75, s.r * 1.3, d));
  }
  return h;
}

// Height lookup grid (fast, bilinear) used by gameplay.
const GRID = 256;
const heights = new Float32Array((GRID + 1) * (GRID + 1));
for (let j = 0; j <= GRID; j++) for (let i = 0; i <= GRID; i++) {
  heights[j * (GRID + 1) + i] = rawHeight(i / GRID * WORLD - HALF, j / GRID * WORLD - HALF);
}
export function heightAt(x, z) {
  const fx = clamp((x + HALF) / WORLD * GRID, 0, GRID - 0.001), fz = clamp((z + HALF) / WORLD * GRID, 0, GRID - 0.001);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  const a = heights[j * (GRID + 1) + i], b = heights[j * (GRID + 1) + i + 1];
  const c = heights[(j + 1) * (GRID + 1) + i], d = heights[(j + 1) * (GRID + 1) + i + 1];
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

// Fertility (irrigated green land near the canal).
export function fertility(x, z) {
  const cd = Math.abs(x - canalX(z));
  return clamp(1 - smooth(6, 34 + fbm(x * 0.03, z * 0.03) * 20, cd), 0, 1);
}

function makeMask() {
  const S = 512, data = new Uint8Array(S * S * 4);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = i / S * WORLD - HALF, z = j / S * WORLD - HALF;
    const rd = roadDist(x, z);
    const road = 1 - smooth(1.6, 3.6 + noise2(x * 0.3, z * 0.3) * 0.8, rd);
    const cd = Math.abs(x - canalX(z));
    const wet = 1 - smooth(CANAL_W * 0.4, CANAL_W * 1.1, cd);
    let site = 0;
    for (const s of [SITES.village, SITES.serai]) site = Math.max(site, 1 - smooth(s.r * 0.5, s.r * 0.9, Math.hypot(x - s.x, z - s.z)));
    const k = (j * S + i) * 4;
    data[k] = road * 255; data[k + 1] = fertility(x, z) * (1 - road) * 255; data[k + 2] = wet * 255; data[k + 3] = site * 255;
  }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.needsUpdate = true; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  return t;
}

// Tileable detail normal (sand ripples + pebbles) generated on a canvas.
function detailNormal() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), img = x.createImageData(S, S);
  const H = new Float32Array(S * S), rnd = mulberry32(9);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = i / S * Math.PI * 2, v = j / S * Math.PI * 2;
    // periodic ripples
    let h = Math.sin(u * 6 + Math.sin(v * 2) * 1.5 + Math.sin(u * 2 + v) * 0.8) * 0.35;
    h += Math.sin(u * 13 + v * 3) * 0.08;
    H[j * S + i] = h;
  }
  for (let p = 0; p < 500; p++) { // pebbles
    const cx = rnd() * S, cy = rnd() * S, r = 1.5 + rnd() * 3.5;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx, dy) / r; if (d > 1) continue;
      const ii = ((cx + dx + S) % S) | 0, jj = ((cy + dy + S) % S) | 0;
      H[jj * S + ii] = Math.max(H[jj * S + ii], 0.6 * Math.sqrt(1 - d * d));
    }
  }
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const dx = (H[j * S + (i + S - 1) % S] - H[j * S + (i + 1) % S]) * 2.2;
    const dy = (H[((j + S - 1) % S) * S + i] - H[((j + 1) % S) * S + i]) * 2.2;
    const l = Math.hypot(dx, dy, 1), k = (j * S + i) * 4;
    img.data[k] = (dx / l * .5 + .5) * 255; img.data[k + 1] = (dy / l * .5 + .5) * 255; img.data[k + 2] = (1 / l * .5 + .5) * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

export function createTerrain() {
  const seg = 320;
  const geo = new THREE.PlaneGeometry(WORLD, WORLD, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, rawHeight(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
  const uniforms = { uMask: { value: makeMask() }, uDetail: { value: detailNormal() }, uWorld: { value: WORLD } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; uniform sampler2D uMask; uniform sampler2D uDetail; uniform float uWorld;
        float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
        float fb(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vn(p); p*=2.03; a*=.5; } return s; }
        vec4 gMask; float gRock;`)
      .replace('#include <map_fragment>', `
        gMask = texture2D(uMask, vWPos.xz/uWorld + 0.5);
        float n1 = fb(vWPos.xz*0.08), n2 = fb(vWPos.xz*0.6), n3 = fb(vWPos.xz*2.5);
        vec3 sand = mix(vec3(0.62,0.45,0.29), vec3(0.72,0.55,0.36), n1);
        sand = mix(sand, vec3(0.55,0.39,0.25), smoothstep(0.55,0.8,n2)*0.5);
        vec3 dirt = mix(vec3(0.46,0.34,0.22), vec3(0.58,0.44,0.30), n2);
        vec3 grass = mix(vec3(0.30,0.36,0.14), vec3(0.46,0.47,0.20), n1);
        grass = mix(grass, vec3(0.55,0.50,0.26), smoothstep(0.45,0.75,n2));
        vec3 mud = vec3(0.28,0.22,0.15);
        // packed road with cart ruts and stones
        vec3 road = mix(vec3(0.64,0.52,0.38), vec3(0.74,0.62,0.46), n3);
        float stones = smoothstep(0.62,0.7,fb(vWPos.xz*1.4));
        road = mix(road, vec3(0.58,0.53,0.47), stones*0.7);
        // courtyard flagstones in sites
        vec2 fl = vWPos.xz*0.55; vec2 fi = floor(fl + vec2(0.0, floor(fl.x)*0.5)); vec2 ff = fract(fl + vec2(0.0, floor(fl.x)*0.5));
        float grout = smoothstep(0.0,0.06,min(min(ff.x,1.-ff.x),min(ff.y,1.-ff.y)));
        vec3 flag = mix(vec3(0.50,0.42,0.33), vec3(0.62,0.53,0.41), h21(fi)) * mix(0.5,1.0,grout) * (0.8+0.3*n2);
        vec3 col = sand;
        col = mix(col, dirt, smoothstep(0.2,0.7,gMask.g)*0.8);
        col = mix(col, grass, smoothstep(0.45,0.9,gMask.g + (n2-0.5)*0.5));
        col = mix(col, mud, gMask.b*0.9);
        float site = smoothstep(0.3,0.8,gMask.a + (n2-0.5)*0.4);
        col = mix(col, flag, site*0.85);
        col = mix(col, road, smoothstep(0.25,0.75,gMask.r + (n3-0.5)*0.3)*(1.0-site*0.6));
        // slope -> exposed rock
        gRock = smoothstep(0.82,0.62,vNormal.y);
        col = mix(col, vec3(0.55,0.47,0.38)*(0.8+0.4*n3), 0.0);
        col *= 0.88 + 0.24*n3; // micro variation / AO feel
        diffuseColor.rgb *= col;
      `)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness - gMask.b*0.45 - smoothstep(0.3,0.8,gMask.a)*0.1;`)
      .replace('#include <normal_fragment_maps>', `
        {
          vec2 duv = vWPos.xz*0.35;
          vec3 dn = texture2D(uDetail, duv).xyz*2.0-1.0;
          vec3 dn2 = texture2D(uDetail, vWPos.xz*0.09 + 0.37).xyz*2.0-1.0;
          float rip = (1.0-gMask.g)*(1.0-gMask.r)*(1.0-gMask.a);
          vec2 d = dn.xy*mix(0.35,1.0,rip) + dn2.xy*0.6*rip;
          vec3 wn = normalize(vec3(d.x, 1.0, d.y));
          vec3 vn2 = normalize((viewMatrix * vec4(wn,0.0)).xyz);
          // blend detail into geometric normal (approximate for low-slope terrain)
          normal = normalize(normal + (vn2 - (viewMatrix*vec4(0,1,0,0)).xyz));
        }
      `);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}
