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
  const cd = Math.abs(x - canalX(z));
  return clamp(1 - smooth(6, 34 + fbm(x * 0.03, z * 0.03) * 20, cd), 0, 1);
}

function makeMask() {
  const S = 512, data = new Uint8Array(S * S * 4);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = i / S * WORLD - HALF, z = j / S * WORLD - HALF;
    const rd = roadDist(x, z);
    const road = 1 - smooth(2.4, 4.6 + noise2(x * 0.3, z * 0.3) * 1.0, rd);
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
        vec4 gMask; float gRock; float gStoneEdge; vec2 gStoneGrad;
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
        // packed road with cart ruts and stones
        vec3 road = mix(vec3(0.36,0.27,0.19), vec3(0.45,0.35,0.25), n3);
        float stones = smoothstep(0.68,0.74,fb(vWPos.xz*1.6));
        road = mix(road, vec3(0.50,0.46,0.40), stones*0.6);
        // worn ruts: darker bands where the mask is strongest, lighter crown between
        float rut = smoothstep(0.75,0.95,gMask.r) * (0.5+0.5*sin(gMask.r*40.0));
        road *= 1.0 - rut*0.18;
        // edge debris/pebbles at the transition to sand
        float edge = smoothstep(0.15,0.35,gMask.r) * smoothstep(0.65,0.4,gMask.r);
        road = mix(road, vec3(0.38,0.30,0.22), edge * smoothstep(0.5,0.8,fb(vWPos.xz*3.0)) * 0.7);
        // courtyard flagstones in sites
        vec2 sp = vWPos.xz*1.05;
        vec2 vc = vor2(sp);
        gStoneEdge = vc.x;
        float e2 = 0.05; gStoneGrad = vec2(vor2(sp+vec2(e2,0.)).x - vc.x, vor2(sp+vec2(0.,e2)).x - vc.x)/e2;
        float grout = smoothstep(0.02,0.12,vc.x);
        vec3 stoneCol = mix(vec3(0.60,0.50,0.38), vec3(0.74,0.62,0.47), vc.y);
        stoneCol = mix(stoneCol, vec3(0.55,0.42,0.30), step(0.85, h21(vec2(vc.y*91.0,3.0)))*0.6);
        stoneCol *= 0.85 + 0.25*n3;
        vec3 flag = mix(vec3(0.33,0.26,0.19), stoneCol, grout);
        // sand drifts settling over the courtyard
        flag = mix(flag, sand*0.95, smoothstep(0.5,0.75,n1 + (1.0-grout)*0.15)*0.85);
        vec3 col = sand;
        col = mix(col, dirt, smoothstep(0.2,0.7,gMask.g)*0.8);
        col = mix(col, grass, smoothstep(0.45,0.9,gMask.g + (n2-0.5)*0.5));
        col = mix(col, mud, gMask.b*0.9);
        float site = smoothstep(0.3,0.8,gMask.a + (n2-0.5)*0.4);
        col = mix(col, flag, site*0.85);
        {
          // contrast-adaptive road: darker than bright sand, paler & dustier than dark fertile soil
          float lum = dot(col, vec3(0.3,0.59,0.11));
          vec3 adapt = mix(col*vec3(1.55,1.45,1.35) + vec3(0.04), col*vec3(0.66,0.62,0.6), smoothstep(0.38,0.52,lum));
          vec3 rc = mix(adapt, road, 0.35);
          rc = mix(rc, vec3(0.55,0.5,0.44)*(0.85+0.3*n2), stones*0.5);
          col = mix(col, rc, smoothstep(0.15,0.6,gMask.r + (n3-0.5)*0.3)*(1.0-site*0.6));
        }
        // slope -> exposed rock
        gRock = smoothstep(0.82,0.62,vNormal.y);
        col = mix(col, vec3(0.55,0.47,0.38)*(0.8+0.4*n3), 0.0);
        float macro = fb(vWPos.xz*0.012+11.0);
        col *= mix(vec3(0.82,0.74,0.66), vec3(1.08,1.02,0.95), smoothstep(0.25,0.75,macro));
        col = mix(col, col*vec3(1.05,0.86,0.72), smoothstep(0.55,0.8,fb(vWPos.xz*0.04+5.0))*0.5*(1.0-gMask.g));
        col *= 0.9 + 0.2*n3; // micro variation
        diffuseColor.rgb *= col;
      `)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness - gMask.b*0.45 - smoothstep(0.3,0.8,gMask.a)*0.1;`)
      .replace('#include <normal_fragment_maps>', `
        {
          vec2 q = vWPos.xz;
          // procedural wind ripples (non-repeating): warped sine with sharp crests
          float rip = (1.0-gMask.g)*(1.0-smoothstep(0.1,0.5,gMask.r))*(1.0-smoothstep(0.2,0.6,gMask.a));
          float amp = rip * (0.35 + 0.65*smoothstep(0.35,0.7,fb(q*0.025+3.0)));
          vec2 dir = normalize(vec2(0.82,0.57) + vec2(fb(q*0.01)-0.5, fb(q*0.012+7.0)-0.5)*0.8);
          float warp = fb(q*0.07)*5.0;
          float ph = dot(q, dir)*2.6 + warp;
          float c = cos(ph), sn = sin(ph);
          float sharp = 0.6 + 0.4*sn; // asymmetric crest
          vec2 g = dir * c * 2.6 * sharp * amp * 0.42;
          vec3 dn = texture2D(uDetail, q*0.35).xyz*2.0-1.0;
          float peb = 0.35 + 0.65*(1.0-rip);
          g += dn.xy * 0.5 * peb;
          // macro undulation normals (small dunes) from noise gradient
          float e = 0.6; float h0 = fb(q*0.18);
          g += vec2(fb((q+vec2(e,0.))*0.18)-h0, fb((q+vec2(0.,e))*0.18)-h0) / e * 0.35 * rip;
          float siteK = smoothstep(0.3,0.8,gMask.a);
          g += -gStoneGrad * smoothstep(0.14,0.0,gStoneEdge) * 0.35 * siteK;
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
