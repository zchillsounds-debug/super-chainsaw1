import * as THREE from 'three';

// Round 19: ground materials baked once at load on the GPU. Each material is a seamless tile with
//   detail  (r: brightness, g: feature mask, b: per-feature variation, a: height)
//   surface (rg: tangent-space normal, b: cavity occlusion, a: wetness/flatness hint)
// The terrain shader colours them per region, so one bake serves every map.
//   0: sand with pebbles and grit      1: dry cracked earth      2: worn flagstones
//   3: packed road (ruts, embedded stones)
const COMMON = `
precision highp float;
varying vec2 vUv; uniform float uMat, uPass, uRes;
float P; // period in lattice cells, set per call
vec2 hash2(vec2 p){ p = mod(p, P); p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
float hash1(vec2 p){ return hash2(p).x; }
float vnoise(vec2 x, float per){ P = per; vec2 i = floor(x), f = fract(x); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash1(i), hash1(i+vec2(1,0)), u.x), mix(hash1(i+vec2(0,1)), hash1(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 uv, float per, int oct){ float s = 0., a = .5, tot = 0.; for (int i = 0; i < 7; i++){ if (i >= oct) break; s += a*vnoise(uv*per, per); tot += a; per *= 2.; a *= .5; } return s/tot; }
// voronoi on a periodic lattice: x = F1, y = F2-F1 (edge distance), z = cell id hash, w = id hash 2
vec4 vor(vec2 uv, float per, float jit){ P = per; vec2 x = uv*per; vec2 i = floor(x), f = fract(x); float d1 = 9., d2 = 9.; vec2 id = vec2(0); vec2 best = vec2(0);
  for (int y = -2; y <= 2; y++) for (int xx = -2; xx <= 2; xx++){ vec2 g = vec2(xx,y); vec2 o = hash2(i+g)*jit + (1.-jit)*.5; vec2 r = g + o - f; float d = dot(r,r);
    if (d < d1){ d2 = d1; d1 = d; id = i+g; best = r; } else if (d < d2) d2 = d; }
  // true edge distance (second pass)
  float md = 9.;
  for (int y = -2; y <= 2; y++) for (int xx = -2; xx <= 2; xx++){ vec2 g = vec2(xx,y); vec2 o = hash2(i+g)*jit + (1.-jit)*.5; vec2 r = g + o - f;
    if (dot(r-best,r-best) > 1e-5) md = min(md, dot(0.5*(best+r), normalize(r-best))); }
  P = per; vec2 h = hash2(id + 17.);
  return vec4(sqrt(d1), md, h.x, h.y); }

// pebbles scattered on a cell grid: returns (height, mask, tint)
vec3 pebbles(vec2 uv, float per, float density, float rmin, float rmax){
  // warp the lookup so stones come out lumpy and angular rather than round
  vec2 w = vec2(fbm(uv + 0.17, per * 0.9, 3), fbm(uv + 0.53, per * 0.9, 3)) - 0.5;
  vec4 v = vor(uv + w * (0.55 / per), per, 0.85);
  float on = step(1. - density, v.z);
  float r = mix(rmin, rmax, v.w * v.w);
  float d = v.x / r;
  // squashed profile: flat-topped stones half sunk in the sand
  float dome = on * pow(max(0., 1. - d*d), 0.35) * smoothstep(1.0, 0.75, d);
  return vec3(dome * (0.35 + 0.35*v.w), on * smoothstep(1.0, 0.8, d), fract(v.z*37.));
}

// material channels at uv
vec4 material(vec2 uv){
  float m = uMat;
  if (m < 0.5) {
    // sand: fine grain, soft drift undulation, two scales of pebbles and dark grit
    float grain = fbm(uv, 64., 4);
    float drift = fbm(uv + 0.31, 4., 4);
    vec3 pb = pebbles(uv, 12., 0.16, 0.16, 0.42);
    vec3 pb2 = pebbles(uv + 0.5, 30., 0.22, 0.14, 0.36);
    float grit = smoothstep(0.72, 0.8, fbm(uv + 0.7, 96., 2));
    float h = drift*0.35 + grain*0.08 + pb.x*0.55 + pb2.x*0.28;
    float mask = max(pb.y, pb2.y*0.85);
    float tint = pb.y > 0.0 ? pb.z : pb2.z;
    float lum = 0.86 + grain*0.22 + drift*0.1 - grit*0.25;
    return vec4(lum, max(mask, grit*0.4), tint, h);
  } else if (m < 1.5) {
    // dry cracked earth: curled plates split by dark fissures, fine dust in the cracks
    vec4 v = vor(uv + 0.05*vec2(fbm(uv, 8., 3), fbm(uv+0.4, 8., 3)) - 0.025, 9., 0.9);
    vec4 v2 = vor(uv, 26., 0.9);
    float crack = 1. - smoothstep(0.0, 0.06, v.y);
    float crack2 = (1. - smoothstep(0.0, 0.04, v2.y)) * smoothstep(0.45, 0.6, fbm(uv + 0.2, 6., 3));
    float plate = smoothstep(0.0, 0.25, v.y);
    float curl = smoothstep(0.02, 0.12, v.y) * (1. - smoothstep(0.12, 0.3, v.y)) * 0.25; // plate edges lift
    float grain = fbm(uv, 48., 4);
    vec3 pb = pebbles(uv + 0.13, 22., 0.12, 0.2, 0.4);
    float h = plate*0.45 + curl + grain*0.1 - crack2*0.25 + pb.x*0.4 + v.z*0.06;
    h = max(h, 0.0);
    float lum = 0.78 + grain*0.2 + v.z*0.16 - crack*0.55 - crack2*0.3;
    return vec4(lum, max(crack, crack2*0.7), pb.y > 0. ? pb.z : v.z, h);
  } else if (m < 2.5) {
    // flagstones: staggered courses of cut stone, chipped edges, worn tops, sand in the joints
    // courses of uneven stones: each row has its own stone count (3-6 across the tile)
    float row = floor(uv.y * 6.); P = 6.;
    float cols = 3. + floor(hash1(vec2(row, 3.)) * 4.);
    vec2 g = vec2(uv.x * cols + hash1(vec2(row, 9.)), uv.y * 6.);
    vec2 c = floor(g); vec2 f = fract(g);
    f.x = f.x * 6. / cols; // keep joints the same width whatever the stone length
    float fx1 = 6. / cols;
    float wob = (fbm(uv + 0.11, 20., 3) - 0.5) * 0.08;
    vec2 e = vec2(min(f.x, fx1 - f.x), min(f.y, 1. - f.y)) + wob;
    float joint = min(e.x, e.y);
    P = 64.; float id = hash2(vec2(mod(c.x, cols), row)).x;
    float chip = smoothstep(0.55, 0.75, fbm(uv + id, 24., 4)) * (1. - smoothstep(0.0, 0.14, joint));
    float stone = smoothstep(0.02, 0.06, joint - chip * 0.06);
    float wear = fbm(uv * 1. + id * 3., 12., 5);
    float bevel = smoothstep(0.02, 0.1, joint);
    float h = stone * (0.55 + bevel * 0.25 + wear * 0.2 + id * 0.08) + (1. - stone) * fbm(uv, 64., 3) * 0.12;
    float pits = smoothstep(0.78, 0.86, fbm(uv + 0.3, 40., 3));
    h -= pits * 0.08 * stone;
    float lum = mix(0.6, 0.86 + wear * 0.22 - pits * 0.2, stone);
    return vec4(lum, 1. - stone, id, h);
  } else {
    // packed road: two worn ruts, pressed-in stones, hoof-scuffed dust
    float grain = fbm(uv, 64., 4);
    float scuff = fbm(uv + 0.6, 10., 5);
    vec3 pb = pebbles(uv, 18., 0.35, 0.2, 0.45);
    vec3 pb2 = pebbles(uv + 0.27, 44., 0.4, 0.2, 0.4);
    float h = scuff*0.35 + grain*0.1 + pb.x*0.32 + pb2.x*0.18;
    float lum = 0.8 + grain*0.15 + scuff*0.2;
    return vec4(lum, max(pb.y, pb2.y*0.8), pb.y > 0. ? pb.z : pb2.z, h);
  }
}
void main(){
  if (uPass < 0.5) { gl_FragColor = material(vUv); return; }
  // surface pass: normal from height differences, cavity from height vs. its blurred surroundings
  float t = 1.0 / uRes;
  float hl = material(vUv - vec2(t,0)).a, hr = material(vUv + vec2(t,0)).a;
  float hd = material(vUv - vec2(0,t)).a, hu = material(vUv + vec2(0,t)).a;
  float h0 = material(vUv).a;
  vec3 n = normalize(vec3((hl - hr) * uRes * 0.012, (hd - hu) * uRes * 0.012, 1.0));
  float avg = 0.0;
  for (int i = 0; i < 12; i++) { float a = float(i) * 2.39996; float r = (3.0 + float(i) * 0.9) * t; avg += material(vUv + vec2(cos(a), sin(a)) * r).a; }
  avg /= 12.0;
  float cav = clamp(1.0 + (h0 - avg) * 2.2, 0.35, 1.0);
  gl_FragColor = vec4(n.xy * 0.5 + 0.5, cav, 1.0);
}`;

export const GROUND = { sandD: { value: null }, sandN: { value: null }, earthD: { value: null }, earthN: { value: null }, flagD: { value: null }, flagN: { value: null }, roadD: { value: null }, roadN: { value: null } };
export function bakeGround(renderer, quality) {
  const res = quality === 'low' ? 512 : 1024;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMat: { value: 0 }, uPass: { value: 0 }, uRes: { value: res } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: COMMON,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const out = [], rts = [];
  const prev = renderer.getRenderTarget();
  for (let m = 0; m < 4; m++) {
    const pair = [];
    for (let pass = 0; pass < 2; pass++) {
      const rt = new THREE.WebGLRenderTarget(res, res, { type: THREE.UnsignedByteType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, anisotropy: 8, colorSpace: THREE.NoColorSpace });
      mat.uniforms.uMat.value = m; mat.uniforms.uPass.value = pass;
      renderer.setRenderTarget(rt); renderer.render(scene, cam);
      rt.texture.anisotropy = 8;
      pair.push(rt.texture); rts.push(rt);
    }
    out.push(pair);
  }
  renderer.setRenderTarget(prev);
  mat.dispose(); quad.geometry.dispose();
  GROUND.rts = rts;
  const r = { sandD: out[0][0], sandN: out[0][1], earthD: out[1][0], earthN: out[1][1], flagD: out[2][0], flagN: out[2][1], roadD: out[3][0], roadN: out[3][1] };
  for (const k in r) GROUND[k].value = r[k];
  return r;
}
