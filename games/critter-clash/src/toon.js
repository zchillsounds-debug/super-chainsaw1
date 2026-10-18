// Anime toon shading: stepped light ramp, rim light, inked inverted-hull outlines.
import * as THREE from 'three';

function ramp(steps) {
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => { data.set([v, v, v, 255], i * 4); });
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

// two hard bands (shadow / lit) plus a narrow highlight band reads as anime cel
export const RAMP_CHAR = ramp([95, 95, 205, 205, 205, 255]);
export const RAMP_ENV = ramp([120, 190, 235, 255]);

export const rimUniforms = {
  uRimColor: { value: new THREE.Color(1, 0.96, 0.88) },
  uRimPower: { value: 3.0 },
};

const toonCache = new Map();

// Toon material with a view-space rim light. `rim` scales its strength (0 for terrain).
export function toon(color, { rim = 0.55, emissive = 0x000000, env = false, map = null, vertexColors = false, side, uniforms = null } = {}) {
  const key = [color, rim, emissive, env, map ? map.uuid : '', vertexColors, side].join('|');
  if (!uniforms && toonCache.has(key)) return toonCache.get(key);
  const U = uniforms || rimUniforms;
  const m = new THREE.MeshToonMaterial({
    color, gradientMap: env ? RAMP_ENV : RAMP_CHAR, emissive, map, vertexColors,
    side: side ?? THREE.FrontSide,
  });
  if (rim > 0) {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uRimColor = U.uRimColor;
      sh.uniforms.uRimPower = U.uRimPower;
      sh.uniforms.uRimAmt = { value: rim };
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor; uniform float uRimPower; uniform float uRimAmt;')
        .replace('#include <opaque_fragment>', `
          float rimF = 1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
          rimF = smoothstep(0.55, 0.62, pow(rimF, uRimPower * 0.5));
          outgoingLight += uRimColor * rimF * uRimAmt * 0.55;
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'rim' + rim;
  }
  m.userData.rimU = U; m.userData.toon = { rim, env, side }; // lets the world merge look-alike parts (bakeStatic in world.js)
  if (!uniforms) toonCache.set(key, m);
  return m;
}

// Inverted hull: back faces pushed out along normals, drawn flat dark.
const outlineMats = new Map();
export function outlineMat(width = 0.022, color = 0x2a1630) {
  const key = width + '|' + color;
  if (outlineMats.has(key)) return outlineMats.get(key);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uW = { value: width };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uW;')
      .replace('#include <begin_vertex>', `
        vec3 transformed = position;
        // keep a near-constant screen width: scale by view distance
        vec4 mvp = modelViewMatrix * vec4(position, 1.0);
        float dScale = clamp(-mvp.z * 0.09, 0.6, 2.6);
        transformed += normalize(normal) * uW * dScale;`);
  };
  m.customProgramCacheKey = () => 'outline' + width;
  m.userData.ow = width; m.userData.oc = color;
  outlineMats.set(key, m);
  return m;
}
// the same hull, with its width per vertex (attribute aOW), so merged parts can keep their own outline widths
export function outlineMatW(color = 0x2a1630) {
  const key = 'w|' + color;
  if (outlineMats.has(key)) return outlineMats.get(key);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aOW;')
      .replace('#include <begin_vertex>', `
        vec3 transformed = position;
        vec4 mvp = modelViewMatrix * vec4(position, 1.0);
        float dScale = clamp(-mvp.z * 0.09, 0.6, 2.6);
        transformed += normalize(normal) * aOW * dScale;`);
  };
  m.customProgramCacheKey = () => 'outlineW';
  outlineMats.set(key, m);
  return m;
}

// Mesh + outline hull as a pair. Returns the colored mesh (hull is its child).
export function inked(geo, mat, width = 0.022, color) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  if (width > 0) {
    const hull = new THREE.Mesh(geo, outlineMat(width, color));
    hull.castShadow = false;
    hull.userData.hull = true;
    mesh.add(hull);
  }
  return mesh;
}

// Canvas texture helper
export function canvasTex(w, h, draw, { repeat = null, srgb = true, nearest = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  if (nearest) t.magFilter = THREE.NearestFilter;
  t.anisotropy = 4;
  return t;
}
