import * as THREE from 'three';

// One shader for every sculpted character piece. Each vertex carries a region id (aMat) that picks
// colour, roughness, metalness and a procedural micro-detail: woven cloth, riveted mail, leather
// grain, skin pores (with wrap-around subsurface light), hair strands, felt or brushed steel.
// Detail is computed in bind-pose space, so it sticks to the body as it deforms.
export const R = { CLOTH: 0, CLOTH2: 1, GOLD: 2, LEATHER: 3, MAIL: 4, SKIN: 5, LIPS: 6, HAIR: 7, STEEL: 8, DARK: 9, SASH: 10, FELT: 11, WRAP: 12, BROW: 13, MOUTH: 14, MASK: 15 };
const K = { none: 0, weave: 1, mail: 2, leather: 3, skin: 4, hair: 5, steel: 6, felt: 7, gold: 8 };
const N = 16;

export function defaultPalette() {
  const p = [];
  const set = (id, c, r, m, k) => { p[id] = { c: new THREE.Color(c), r, m, k }; };
  set(R.CLOTH, 0x17171a, 0.92, 0, K.weave);
  set(R.CLOTH2, 0xb8913e, 0.85, 0, K.weave);
  set(R.GOLD, 0xb08436, 0.5, 0.7, K.gold);
  set(R.LEATHER, 0x3e2616, 0.68, 0, K.leather);
  set(R.MAIL, 0x70757b, 0.5, 0.8, K.mail);
  set(R.SKIN, 0xa8714a, 0.52, 0, K.skin);
  set(R.LIPS, 0x8a4a3a, 0.42, 0, K.skin);
  set(R.HAIR, 0x1c120c, 0.62, 0, K.hair);
  set(R.STEEL, 0x8c939b, 0.4, 0.8, K.steel);
  set(R.DARK, 0x2c241e, 0.95, 0, K.weave);
  set(R.SASH, 0x9a2a1c, 0.88, 0, K.weave);
  set(R.FELT, 0x2a2620, 0.97, 0, K.felt);
  set(R.WRAP, 0x1a1814, 0.95, 0, K.weave);
  set(R.BROW, 0x1c120c, 0.7, 0, K.hair);
  set(R.MOUTH, 0x2a0c08, 0.6, 0, K.none);
  set(R.MASK, 0x1e1a16, 0.95, 0, K.weave);
  return p;
}

const GLSL_COMMON = /* glsl */`
varying vec3 vRest; varying vec3 vRestN; varying float vMat;
uniform vec3 uCol[${N}]; uniform vec3 uPBR[${N}]; uniform vec3 uRimC, uRimG; uniform float uDetail;
float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float weave2(vec2 t){ vec2 f = fract(t) - 0.5; float c = mod(floor(t.x) + floor(t.y), 2.0);
  float a = 1.0 - abs(f.x) * 2.0, b = 1.0 - abs(f.y) * 2.0; return mix(sqrt(a), sqrt(b), c); }
float mail2(vec2 t){ float row = floor(t.y); t.x += mod(row, 2.0) * 0.5; vec2 f = fract(t) - 0.5; float r = length(f * vec2(1.0, 1.25));
  return smoothstep(0.52, 0.4, r) * smoothstep(0.12, 0.26, r); }
float tri3(vec3 p, vec3 n, float s, int kind){ vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z);
  if (kind == 1) return weave2(p.zy * s) * w.x + weave2(p.xz * s) * w.y + weave2(p.xy * s) * w.z;
  return mail2(p.zy * s) * w.x + mail2(p.xz * s) * w.y + mail2(p.xy * s) * w.z; }
vec3 perturbN(vec3 sp, vec3 sn, float H, float fd){
  vec3 sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, sn), r2 = cross(sn, sx); float det = dot(sx, r1) * fd;
  vec2 dh = vec2(dFdx(H), dFdy(H)); vec3 g = sign(det) * (dh.x * r1 + dh.y * r2); return normalize(abs(det) * sn - g); }
`;

// Round 19: one rim colour for every character, set from the time of day (lighting.js), so figures read against
// the ground in every light
export const RIM_G = { value: new THREE.Color(1, 1, 1) };
export function charMaterial(palette = defaultPalette(), { rim = new THREE.Color(1.0, 0.78, 0.5), rimK = 0.75, side = THREE.FrontSide } = {}) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, side });
  const cols = [], pbr = [];
  for (let i = 0; i < N; i++) { const q = palette[i] || palette[0]; cols.push(q.c.clone()); pbr.push(new THREE.Vector3(q.r, q.m, q.k)); }
  const uni = { uCol: { value: cols }, uPBR: { value: pbr }, uRimC: { value: rim.clone().multiplyScalar(rimK) }, uRimG: RIM_G, uDetail: { value: 1 } };
  mat.userData.uni = uni;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aMat; varying vec3 vRest; varying vec3 vRestN; varying float vMat;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvRestN = objectNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position; vMat = aMat;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL_COMMON)
      .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
        int mid = int(vMat + 0.5); vec3 pb = uPBR[mid]; int kind = int(pb.z + 0.5);
        diffuseColor.rgb = uCol[mid];
        float fw = length(fwidth(vRest)) + 1e-5; float H = 0.0, cav = 0.0;
        if (kind == 1) { float s = 220.0; float a = clamp(1.6 - fw * s * 1.5, 0.0, 1.0); float t = tri3(vRest, vRestN, s, 1); float sl = vn(vRest * 40.0);
          H = (t * 0.00025 + sl * 0.0002) * a * uDetail; cav = (1.0 - t) * 0.22 * a + (sl - 0.5) * 0.12; }
        else if (kind == 2) { float s = 115.0; float a = clamp(1.6 - fw * s * 1.5, 0.0, 1.0); float t = tri3(vRest, vRestN, s, 2);
          H = t * 0.0012 * a * uDetail; cav = (1.0 - t) * 0.55 * a; }
        else if (kind == 3) { float g = vn(vRest * 160.0) * 0.6 + vn(vRest * 520.0) * 0.4; H = g * 0.00035 * uDetail; cav = (0.5 - g) * 0.25; }
        else if (kind == 4) { float a = clamp(1.6 - fw * 700.0, 0.0, 1.0); float g = vn(vRest * 900.0) * 0.55 + vn(vRest * 260.0) * 0.45; H = g * 0.00012 * a * uDetail;
          float bl = vn(vRest * 30.0); diffuseColor.rgb *= 0.92 + bl * 0.14; diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.08, 0.9, 0.86), smoothstep(0.55, 0.8, vn(vRest * 18.0 + 3.0))); }
        else if (kind == 5) { // hair and beard: fine strands running down, gathered into clumps
          float g = vn(vec3(vRest.x * 900.0, vRest.y * 90.0, vRest.z * 900.0)), cl = vn(vec3(vRest.x * 80.0, vRest.y * 10.0, vRest.z * 80.0));
          H = (g * 0.7 + cl * 0.3) * 0.0006 * uDetail; cav = (0.5 - g) * 0.5 + (0.5 - cl) * 0.25; diffuseColor.rgb *= 0.88 + 0.24 * cl; }
        else if (kind == 6) { float g = vn(vec3(vRest.x * 30.0, vRest.y * 900.0, vRest.z * 30.0)); H = g * 0.00008; cav = (0.5 - vn(vRest * 25.0)) * 0.2; }
        else if (kind == 7) { float g = vn(vRest * 300.0) * 0.5 + vn(vRest * 60.0) * 0.5; H = g * 0.0003 * uDetail; cav = (0.5 - g) * 0.2; }
        else if (kind == 8) { float s = 160.0; float a = clamp(1.6 - fw * s * 1.5, 0.0, 1.0); float st = step(0.5, fract(vRest.y * 70.0 + floor(vRest.x * 90.0 + vRest.z * 90.0) * 0.5));
          float t = tri3(vRest, vRestN, s, 1); H = (t * 0.0002 + st * 0.0002) * a; cav = (1.0 - st) * 0.35 * a; }
        diffuseColor.rgb *= 1.0 - cav;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = pb.x;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = pb.y;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nif (H != 0.0) normal = perturbN(-vViewPosition, normal, H, faceDirection);')
      .replace('#include <emissivemap_fragment>', /* glsl */`#include <emissivemap_fragment>
        { float rimF = 1.0 - max(dot(normal, normalize(vViewPosition)), 0.0); float rk = kind == 4 ? 0.35 : kind == 5 ? 0.12 : kind == 7 ? 0.1 : (kind == 2 || kind == 6 || kind == 8) ? 0.45 : 0.85;
        totalEmissiveRadiance += uRimC * uRimG * pow(rimF, 2.6) * rk; }`)
      .replace('#include <lights_fragment_end>', /* glsl */`#include <lights_fragment_end>
        #if NUM_DIR_LIGHTS > 0
        if (kind == 5) { // Kajiya-Kay strand highlights: a sharp white lobe and a broad tinted one, shifted along the strand
          vec3 L = directionalLights[0].direction, Vv = normalize(vViewPosition), Hh = normalize(L + Vv);
          vec3 up = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz), T = normalize(up - normal * dot(up, normal));
          float sh = vn(vRest * 300.0) - 0.5;
          float th1 = dot(normalize(T + normal * (0.08 + sh * 0.2)), Hh), th2 = dot(normalize(T - normal * 0.12), Hh);
          float s1 = pow(sqrt(max(0.0, 1.0 - th1 * th1)), 90.0), s2 = pow(sqrt(max(0.0, 1.0 - th2 * th2)), 18.0);
          float vis = clamp(dot(normal, L) * 0.5 + 0.5, 0.0, 1.0);
          reflectedLight.directSpecular += directionalLights[0].color * (s1 * 0.22 + s2 * 0.1 * diffuseColor.rgb * 4.0) * vis;
        }
        if (kind == 4) { vec3 L = directionalLights[0].direction; float ndl = dot(normal, L);
          float wrapL = max(0.0, (ndl + 0.6) / 1.6) - max(0.0, ndl);
          reflectedLight.directDiffuse += diffuseColor.rgb * vec3(1.0, 0.42, 0.3) * wrapL * directionalLights[0].color * 0.22; }
        #endif`);
  };
  mat.customProgramCacheKey = () => 'charmat4';
  return mat;
}

// Eyeball texture: white sclera with veins, brown iris with radial fibres, dark pupil, limbal ring.
let _eye = null;
export function eyeTexture() {
  if (_eye) return _eye;
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.fillStyle = '#e8ddd0'; x.fillRect(0, 0, S, S);
  x.strokeStyle = 'rgba(170,60,50,0.25)'; x.lineWidth = 0.6;
  for (let i = 0; i < 18; i++) { x.beginPath(); const a = Math.random() * 6.28; x.moveTo(S / 2 + Math.cos(a) * 60, S / 2 + Math.sin(a) * 60); x.quadraticCurveTo(S / 2 + Math.cos(a + 0.3) * 40, S / 2 + Math.sin(a + 0.3) * 40, S / 2 + Math.cos(a) * 26, S / 2 + Math.sin(a) * 26); x.stroke(); }
  const cx = S / 2, cy = S / 2, ir = 22;
  const g = x.createRadialGradient(cx, cy, 2, cx, cy, ir); g.addColorStop(0, '#3a2210'); g.addColorStop(0.45, '#5a3818'); g.addColorStop(0.85, '#3a2410'); g.addColorStop(1, '#140a04');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, ir, 0, 7); x.fill();
  for (let i = 0; i < 90; i++) { const a = i / 90 * 6.28; x.strokeStyle = `rgba(${120 + Math.random() * 60},${80 + Math.random() * 30},30,0.35)`; x.beginPath(); x.moveTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8); x.lineTo(cx + Math.cos(a) * (ir - 2), cy + Math.sin(a) * (ir - 2)); x.stroke(); }
  x.fillStyle = '#050302'; x.beginPath(); x.arc(cx, cy, 7.5, 0, 7); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.arc(cx - 6, cy - 7, 2.6, 0, 7); x.fill();
  _eye = new THREE.CanvasTexture(c); _eye.colorSpace = THREE.SRGBColorSpace;
  return _eye;
}

// Soft dark ellipse used as contact shadow / ambient occlusion under feet.
let _blob = null;
export function blobTexture() {
  if (_blob) return _blob;
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.5, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  _blob = new THREE.CanvasTexture(c);
  return _blob;
}
