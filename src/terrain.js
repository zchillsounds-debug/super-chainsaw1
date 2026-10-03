import * as THREE from 'three';
import { GROUND } from './groundtex.js';
import { fbm, noise2, smooth, clamp, mulberry32 } from './noise.js';
import { REGION, IS_MARSH, IS_KARKH } from './region.js';

export const WORLD = 280; // terrain size (units ~ meters)
const HALF = WORLD / 2;

// Region layouts (Round 15): each act region is its own map; see region.js.
// Canal centerline: x as a function of z. (The marshes have open water instead of a canal.)
const CANAL = {
  sawad: (z) => -22 + Math.sin(z * 0.025) * 9 + Math.sin(z * 0.061) * 3,
  marsh: () => -9999,
  karkh: (z) => 21 + Math.sin(z * 0.03) * 5 + Math.sin(z * 0.071) * 1.5,
}[REGION];
export const canalX = CANAL;
export const CANAL_W = 7;
// the marshes' open water: the surface sits at WATER_Y; ground lower than DEEP_Y is too deep to wade
export const WATER_Y = IS_MARSH ? -0.45 : -0.55, DEEP_Y = -1.05;

// Road polylines (in the marshes: raised causeways; in al-Karkh: the market lanes).
export const ROADS = {
  // village -> caravanserai -> bridge -> kiln yard, and south to the arch
  sawad: [
    [[14, 95], [12, 70], [10, 48], [14, 28], [30, 12], [52, 2]],
    [[14, 28], [4, 10], [-10, -2], [canalX(-6), -6], [-38, -14], [-52, -32]],
    [[4, 10], [6, -20], [8, -50], [10, -78]],
  ],
  // fishing village -> reed camp (west) and fish racks (east), both on to the old weir in the south
  marsh: [
    [[10, 104], [10, 78], [-6, 62], [-30, 46], [-52, 28]],
    [[10, 78], [28, 52], [44, 26], [58, -6]],
    [[-52, 28], [-48, 2], [-36, -28], [-20, -56], [-6, -84]],
    [[58, -6], [52, -34], [30, -62], [-6, -84]],
  ],
  // khan courtyard -> burned suq -> bridge -> the square; branch west to the paper-sellers' lane
  karkh: [
    [[-62, 104], [-62, 84], [-40, 70], [-20, 56], [-8, 36], [-8, 10], [4, -20], [36, -20], [44, -40], [44, -62]],
    [[-8, 10], [-32, -6], [-58, -24]],
    [[-20, 56], [8, 62], [44, 62], [62, 40], [60, 0], [44, -40]],
    [[-58, -24], [-46, -56], [-14, -74]],
  ],
}[REGION];
// shallow fords where a causeway dips under the water (marsh)
const FORDS = IS_MARSH ? [[37, 37, 7], [-42, -14, 6], [41, -48, 6]] : [];

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

// Flattened plateaus for key locations. The keys are the same in every region:
// village = the hub corner, serai = the first captain's ground, kiln = the second's, arch = the act's last fight.
export const SITES = {
  sawad: { village: { x: 18, z: 58, r: 26 }, serai: { x: 56, z: 0, r: 24 }, kiln: { x: -56, z: -36, r: 22 }, arch: { x: 10, z: -88, r: 30 } },
  marsh: { village: { x: 12, z: 80, r: 24 }, serai: { x: -52, z: 28, r: 20 }, kiln: { x: 58, z: -6, r: 20 }, arch: { x: -6, z: -84, r: 26 } },
  karkh: { village: { x: -62, z: 86, r: 20 }, serai: { x: -8, z: 36, r: 24 }, kiln: { x: -58, z: -24, r: 20 }, arch: { x: 44, z: -62, r: 26 } },
}[REGION];

function sawadHeight(x, z) {
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
// land fraction of the marsh (1 = dry ground, 0 = open water)
export function marshLand(x, z) {
  const n = fbm(x * 0.017 + 4, z * 0.017, 4) + fbm(x * 0.05 + 3, z * 0.05, 2) * 0.12;
  let land = smooth(0.6, 0.7, n) * (1 - smooth(96, 118, Math.max(Math.abs(x), Math.abs(z))));
  land = Math.max(land, 1 - smooth(2.4, 6.5, roadDist(x, z)));
  for (const s of Object.values(SITES)) land = Math.max(land, 1 - smooth(s.r * 0.85, s.r * 1.25, Math.hypot(x - s.x, z - s.z)));
  return land;
}
function marshHeight(x, z) {
  // reed-fringed open water with wadeable shallows; causeways and islands stand just above it
  const edge = smooth(100, 124, Math.max(Math.abs(x), Math.abs(z)));
  const shallow = smooth(0.42, 0.56, fbm(x * 0.03 + 7, z * 0.03 - 2, 3)) * (1 - edge);
  const bed = THREE.MathUtils.lerp(-1.55 + fbm(x * 0.06, z * 0.06, 2) * 0.35, -0.82 + fbm(x * 0.1, z * 0.1, 2) * 0.2, shallow);
  const top = 0.12 + fbm(x * 0.04 + 1, z * 0.04, 3) * 0.55;
  let h = THREE.MathUtils.lerp(bed, top, marshLand(x, z));
  for (const [fx, fz, r] of FORDS) h = THREE.MathUtils.lerp(-0.74, h, smooth(r * 0.5, r, Math.hypot(x - fx, z - fz)));
  return h;
}
function karkhHeight(x, z) {
  // flat ground of the market suburb, heaped with rubble away from the lanes; the Sarat canal in its trench
  let h = fbm(x * 0.02, z * 0.02, 3) * 1.2 + Math.max(0, fbm(x * 0.09 + 5, z * 0.09, 2) - 0.55) * 2.4;
  const edge = smooth(96, HALF - 4, Math.max(Math.abs(x), Math.abs(z)));
  h += edge * (2 + fbm(x * 0.05, z * 0.05, 2) * 4);
  const cd = Math.abs(x - canalX(z));
  h = h * smooth(CANAL_W * 0.5, CANAL_W * 1.6, cd) + (-1.6) * (1 - smooth(CANAL_W * 0.35, CANAL_W * 0.8, cd));
  const rd = roadDist(x, z);
  h = THREE.MathUtils.lerp(h * 0.2, h, smooth(2.5, 7, rd));
  for (const s of Object.values(SITES)) h = THREE.MathUtils.lerp(0.1, h, smooth(s.r * 0.8, s.r * 1.2, Math.hypot(x - s.x, z - s.z)));
  return h;
}
export const rawHeight = IS_MARSH ? marshHeight : IS_KARKH ? karkhHeight : sawadHeight;

// Height lookup grid (fast, bilinear) used by gameplay.
const GRID = 256;
const heights = new Float32Array((GRID + 1) * (GRID + 1));
for (let j = 0; j <= GRID; j++) for (let i = 0; i <= GRID; i++) {
  heights[j * (GRID + 1) + i] = rawHeight(i / GRID * WORLD - HALF, j / GRID * WORLD - HALF);
}
export function heightAt(x, z) {
  if (x > 148) return 0; // interiors (kiln tunnels, qanats) sit on a flat floor east of the map
  const fx = clamp((x + HALF) / WORLD * GRID, 0, GRID - 0.001), fz = clamp((z + HALF) / WORLD * GRID, 0, GRID - 0.001);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  const a = heights[j * (GRID + 1) + i], b = heights[j * (GRID + 1) + i + 1];
  const c = heights[(j + 1) * (GRID + 1) + i], d = heights[(j + 1) * (GRID + 1) + i + 1];
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

// Raise the gameplay height field over a bridge deck (x-aligned span centred at bx,bz).
export function setBridge(bx, bz, len, width, base) {
  for (let j = 0; j <= GRID; j++) for (let i = 0; i <= GRID; i++) {
    const x = i / GRID * WORLD - HALF, z = j / GRID * WORLD - HALF;
    if (Math.abs(z - bz) > width / 2 || Math.abs(x - bx) > len / 2 + 1.5) continue;
    const t = clamp((x - (bx - len / 2)) / len, 0, 1);
    const deck = base + 0.6 + Math.sin(t * Math.PI) * 0.6;
    const k = j * (GRID + 1) + i;
    heights[k] = Math.max(heights[k], deck);
  }
}

// Fertility (irrigated green land near the canal).
export function fertility(x, z) {
  if (IS_MARSH) return clamp(0.35 + (heightAt(x, z) - WATER_Y) * 1.2, 0, 1);
  const cd = Math.abs(x - canalX(z));
  if (IS_KARKH) return clamp(1 - smooth(4, 12, cd), 0, 1) * 0.7;
  return clamp(1 - smooth(6, 34 + fbm(x * 0.03, z * 0.03) * 20, cd), 0, 1);
}

function makeMask() {
  const S = 512, data = new Uint8Array(S * S * 4);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = i / S * WORLD - HALF, z = j / S * WORLD - HALF;
    const rd = roadDist(x, z);
    const road = 1 - smooth(2.4, 4.6 + noise2(x * 0.3, z * 0.3) * 1.0, rd);
    const cd = Math.abs(x - canalX(z));
    const wet = IS_MARSH ? 1 - smooth(WATER_Y - 0.1, WATER_Y + 0.45, heightAt(x, z)) : 1 - smooth(CANAL_W * 0.4, CANAL_W * 1.1, cd);
    let site = 0;
    if (IS_KARKH) site = Math.max(site, (1 - smooth(2.2, 4.2, rd)) * 0.75);
    for (const s of IS_MARSH ? [] : IS_KARKH ? [SITES.village, SITES.serai, SITES.arch] : [SITES.village, SITES.serai]) site = Math.max(site, 1 - smooth(s.r * 0.5, s.r * 0.9, Math.hypot(x - s.x, z - s.z)));
    const k = (j * S + i) * 4;
    data[k] = road * 255; data[k + 1] = fertility(x, z) * (1 - road) * 255; data[k + 2] = wet * 255; data[k + 3] = site * 255;
  }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.needsUpdate = true; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
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
  const uniforms = { uMask: { value: makeMask() }, uWorld: { value: WORLD }, tSandD: GROUND.sandD, tSandN: GROUND.sandN, tEarthD: GROUND.earthD, tEarthN: GROUND.earthN, tFlagD: GROUND.flagD, tFlagN: GROUND.flagN, tRoadD: GROUND.roadD, tRoadN: GROUND.roadN };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        #define RG ${IS_MARSH ? 1 : IS_KARKH ? 2 : 0}
        varying vec3 vWPos; uniform sampler2D uMask; uniform float uWorld;
        float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
        float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
        float fb(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vn(p); p*=2.03; a*=.5; } return s; }
        vec4 gMask; float gRock; vec4 gDet; float gSand;
        uniform sampler2D tSandD, tSandN, tEarthD, tEarthN, tFlagD, tFlagN, tRoadD, tRoadN;
        // anti-tiling: a second lookup turned 90 degrees and shifted, blended in by low-frequency noise
        vec4 gTex(sampler2D t, vec2 uv, float k){ vec4 a = texture2D(t, uv); if (k <= 0.001) return a; vec4 b = texture2D(t, vec2(-uv.y, uv.x) + vec2(0.37, 0.61)); return mix(a, b, k); }
        vec4 gTexN(sampler2D t, vec2 uv, float k){ vec4 a = texture2D(t, uv); if (k <= 0.001) return a; vec4 b = texture2D(t, vec2(-uv.y, uv.x) + vec2(0.37, 0.61)); b.xy = vec2(b.y, 1.0 - b.x); return mix(a, b, k); }
        // height blend: near the transition the higher surface wins
        #if RG == 1
          const vec3 pebA = vec3(0.40,0.38,0.33), pebB = vec3(0.28,0.25,0.20), pebC = vec3(0.46,0.42,0.36);
        #elif RG == 2
          const vec3 pebA = vec3(0.44,0.42,0.40), pebB = vec3(0.24,0.22,0.21), pebC = vec3(0.56,0.42,0.32);
        #else
          const vec3 pebA = vec3(0.56,0.52,0.47), pebB = vec3(0.42,0.33,0.26), pebC = vec3(0.66,0.56,0.44);
        #endif
        vec3 peb(float t){ return t < 0.5 ? mix(pebA, pebB, t*2.0) : mix(pebB, pebC, t*2.0-1.0); }
        float hb(float k, float hA, float hB){ float t = clamp(k + (hB - hA) * 0.9 * (4.0*k*(1.0-k)), 0.0, 1.0); return smoothstep(0.3, 0.7, t) * step(0.001, k); }
        vec2 hh2(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
        // returns (edgeDist, cellId)
        vec2 vor2(vec2 p){ vec2 i=floor(p), f=fract(p); float d1=8., d2=8.; vec2 id=vec2(0.);
          for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 g=vec2(x,y); vec2 o=hh2(i+g)*0.85+0.075; float d=length(g+o-f); if(d<d1){d2=d1;d1=d;id=i+g;} else if(d<d2) d2=d; }
          return vec2(d2-d1, h21(id)); }`)
      .replace('#include <map_fragment>', `
        gMask = texture2D(uMask, vWPos.xz/uWorld + 0.5);
        float n1 = fb(vWPos.xz*0.08), n2 = fb(vWPos.xz*0.6), n3 = fb(vWPos.xz*2.5);
        vec3 sand = mix(vec3(0.62,0.45,0.29), vec3(0.72,0.55,0.36), n1);
        sand = mix(sand, vec3(0.55,0.39,0.25), smoothstep(0.55,0.8,n2)*0.5);
        vec3 dirt = mix(vec3(0.46,0.34,0.22), vec3(0.58,0.44,0.30), n2);
        vec3 grass = mix(vec3(0.30,0.36,0.14), vec3(0.46,0.47,0.20), n1);
        grass = mix(grass, vec3(0.55,0.50,0.26), smoothstep(0.45,0.75,n2));
        vec3 mud = vec3(0.28,0.22,0.15);
        #if RG == 1
          // marsh: grey-brown silt, lush grass, black wet mud at the water line
          sand = mix(vec3(0.36,0.33,0.26), vec3(0.45,0.41,0.31), n1); sand = mix(sand, vec3(0.30,0.27,0.21), smoothstep(0.5,0.8,n2)*0.5);
          dirt = mix(vec3(0.30,0.26,0.19), vec3(0.38,0.33,0.24), n2);
          grass = mix(vec3(0.22,0.32,0.12), vec3(0.36,0.42,0.16), n1); grass = mix(grass, vec3(0.44,0.44,0.22), smoothstep(0.5,0.8,n2)*0.6);
          mud = vec3(0.15,0.13,0.10);
        #elif RG == 2
          // al-Karkh: trodden earth and ash, black soot where the fires burned
          sand = mix(vec3(0.38,0.35,0.31), vec3(0.47,0.43,0.37), n1);
          sand = mix(sand, vec3(0.30,0.28,0.26), smoothstep(0.5,0.8,n2)*0.5);
          dirt = mix(vec3(0.36,0.31,0.26), vec3(0.44,0.38,0.31), n2);
          grass = mix(vec3(0.30,0.34,0.16), vec3(0.40,0.40,0.22), n1);
        #endif
        // ---- Round 19: baked ground materials (groundtex.js), coloured per region, blended by height
        vec2 wq = vWPos.xz;
        float tileMix = smoothstep(0.35, 0.65, fb(wq*0.045 + 21.0));
        vec4 dS = gTex(tSandD, wq/3.6, tileMix), dE = gTex(tEarthD, wq/4.6, tileMix), dF = gTex(tFlagD, wq/3.8, 0.0), dR = gTex(tRoadD, wq/3.2, tileMix);
        vec4 nS = gTexN(tSandN, wq/3.6, tileMix), nE = gTexN(tEarthN, wq/4.6, tileMix), nF = gTexN(tFlagN, wq/3.8, 0.0), nR = gTexN(tRoadN, wq/3.2, tileMix);
        // each layer: palette colour x baked brightness, features (pebbles, cracks, joints) on top
        vec3 cSand = sand * dS.r; cSand = mix(cSand, peb(dS.b), dS.g*0.85);
        // dry earth: soft trodden dirt, with patches where it has baked and cracked into plates
        float crackK = smoothstep(0.52, 0.68, fb(wq*0.05 + 4.0));
        #if RG == 1
          crackK *= 0.0; // the marsh never bakes dry
        #endif
        vec3 cDirt = dirt * mix(mix(0.92, 1.04, dS.r), dE.r * 1.08, crackK); cDirt = mix(cDirt, peb(dS.b), dS.g*0.6*(1.0-crackK));
        vec3 cGrass = grass * mix(1.0, mix(dS.r, dE.r, crackK), 0.5);
        vec3 cMud = mud * mix(0.85, 1.1, dE.r);
        vec3 road = mix(vec3(0.40,0.31,0.22), vec3(0.47,0.37,0.27), n3);
        #if RG == 1
          road = mix(vec3(0.34,0.29,0.22), vec3(0.40,0.34,0.26), n3);
        #elif RG == 2
          road = mix(vec3(0.40,0.35,0.30), vec3(0.47,0.41,0.34), n3);
        #endif
        vec3 cRoad = road * dR.r; cRoad = mix(cRoad, peb(dR.b) * 1.05, dR.g * 0.8);
        float rut = smoothstep(0.75,0.95,gMask.r) * (0.5+0.5*sin(gMask.r*40.0));
        cRoad *= 1.0 - rut*0.14;
        vec3 stoneCol = mix(vec3(0.62,0.52,0.40), vec3(0.76,0.64,0.49), dF.b);
        stoneCol = mix(stoneCol, vec3(0.55,0.42,0.30), step(0.85, fract(dF.b*7.3))*0.6);
        #if RG == 2
          stoneCol = mix(vec3(0.50,0.47,0.42), vec3(0.64,0.58,0.50), dF.b);
        #endif
        vec3 cFlag = mix(stoneCol * dF.r, sand * 0.62, dF.g);
        // height-aware blending: pebbles and stone tops poke through, sand settles into the low parts
        float kDirt = hb(smoothstep(0.2,0.7,gMask.g)*0.8, dS.a, dE.a);
        float kGrass = hb(smoothstep(0.45,0.9,gMask.g + (n2-0.5)*0.5), dE.a, dE.a*0.6 + 0.2);
        float kMud = gMask.b*0.9;
        float site = smoothstep(0.3,0.8,gMask.a + (n2-0.5)*0.4);
        // blown sand settles over the paving in drifts, deepest along the joints
        float drift = smoothstep(0.45, 0.8, n1 + (n2-0.5)*0.5);
        float kSite = hb(site*(0.97 - drift*0.75), 0.3 + dS.a*0.4 + drift*0.5, dF.a);
        float kRoad = hb(smoothstep(0.15,0.6,gMask.r + (n3-0.5)*0.3)*(1.0-site*0.6), dS.a, dR.a + 0.05);
        vec3 col = cSand;
        col = mix(col, cDirt, kDirt);
        col = mix(col, cGrass, kGrass);
        col = mix(col, cMud, kMud);
        col = mix(col, cRoad, kRoad);
        col = mix(col, cFlag, kSite);
        // the blended surface normal and cavity, carried to the normal stage
        vec4 nB = nS;
        vec4 nDirt = mix(nS, nE, crackK); nB = mix(nB, nDirt, kDirt); nB = mix(nB, nDirt, kGrass*0.6); nB = mix(nB, vec4(0.5,0.5,1.0,1.0), kMud*0.7); nB = mix(nB, nR, kRoad); nB = mix(nB, nF, kSite);
        gDet = nB; gSand = (1.0-kDirt)*(1.0-kGrass)*(1.0-kRoad)*(1.0-kSite)*(1.0-kMud);
        #if RG == 2
          // soot and ash where the fires burned (kept off the swept lanes and squares)
          col = mix(col, vec3(0.13,0.12,0.11) * mix(0.8, 1.2, dE.r), smoothstep(0.56,0.78,fb(vWPos.xz*0.11+3.0))*0.8*(1.0-site));
          col = mix(col, vec3(0.55,0.53,0.5), smoothstep(0.62,0.8,fb(vWPos.xz*0.35+9.0))*0.25*(1.0-site));
        #endif
        gRock = smoothstep(0.82,0.62,vNormal.y);
        float macro = fb(vWPos.xz*0.012+11.0);
        col *= mix(vec3(0.82,0.74,0.66), vec3(1.08,1.02,0.95), smoothstep(0.25,0.75,macro));
        col = mix(col, col*vec3(1.05,0.86,0.72), smoothstep(0.55,0.8,fb(vWPos.xz*0.04+5.0))*0.5*(1.0-gMask.g));
        col *= 0.94 + 0.12*n3;
        // baked cavity: dark crevices between stones, under pebbles and in cracks
        col *= mix(1.0, nB.b, 0.85);
        diffuseColor.rgb *= col;
      `)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness - gMask.b*0.45 - smoothstep(0.3,0.8,gMask.a)*0.1;`)
      .replace('#include <normal_fragment_maps>', `
        {
          vec2 q = vWPos.xz;
          // procedural wind ripples (non-repeating): warped sine with sharp crests
          float rip = gSand*(1.0-gMask.g)*(1.0-smoothstep(0.1,0.5,gMask.r))*(1.0-smoothstep(0.2,0.6,gMask.a));
          #if RG != 0
            rip *= 0.0; // wind ripples belong to the desert
          #endif
          float amp = rip * (0.35 + 0.65*smoothstep(0.35,0.7,fb(q*0.025+3.0)));
          vec2 dir = normalize(vec2(0.82,0.57) + vec2(fb(q*0.01)-0.5, fb(q*0.012+7.0)-0.5)*0.8);
          float warp = fb(q*0.07)*5.0;
          float ph = dot(q, dir)*2.6 + warp;
          float c = cos(ph), sn = sin(ph);
          float sharp = 0.6 + 0.4*sn; // asymmetric crest
          vec2 g = dir * c * 2.6 * sharp * amp * 0.42;
          // baked material normal (tangent space: x along world x, y along world z)
          vec2 tn = gDet.xy*2.0-1.0;
          g -= tn * 1.6;
          // macro undulation normals (small dunes) from noise gradient
          float e = 0.6; float h0 = fb(q*0.18);
          g += vec2(fb((q+vec2(e,0.))*0.18)-h0, fb((q+vec2(0.,e))*0.18)-h0) / e * 0.35 * rip;
          vec3 wn = normalize(vec3(-g.x, 1.0, -g.y));
          vec3 vn2 = normalize((viewMatrix * vec4(wn,0.0)).xyz);
          normal = normalize(normal + (vn2 - (viewMatrix*vec4(0,1,0,0)).xyz));
        }
      `);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

// Marsh water: how deep the hero stands (0 on dry ground). Used for wading speed, splashes and footsteps.
export function waterDepth(x, z) {
  if (!IS_MARSH || x > 148) return 0;
  return Math.max(0, WATER_Y - heightAt(x, z));
}
// Minimap colour for a world point in this region.
export function mapColor(x, z) {
  if (IS_MARSH) { const h = heightAt(x, z); return h < DEEP_Y ? '#1e4a4c' : h < WATER_Y ? '#3a6a5e' : roadDist(x, z) < 3 ? '#7a6644' : '#4a5a2a'; }
  const cd = Math.abs(x - canalX(z));
  if (IS_KARKH) return cd < 3 ? '#2a6a6a' : roadDist(x, z) < 3.5 ? '#8a7254' : '#4a3e34';
  return cd < 3 ? '#2a6a6a' : (cd < 25 ? '#4a4a26' : '#6a5032');
}
