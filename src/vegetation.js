import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32, noise2 } from './noise.js';
import { triplanarMaterial } from './triplanar.js';
import { mudBrick } from './textures.js';

// Shared wind uniform for all swaying foliage.
export const wind = { uTime: { value: 0 } };

function addWind(mat, strength = 1, pivotY = 0) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = wind.uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec4 ip = vec4(0.0,0.0,0.0,1.0);
          #ifdef USE_INSTANCING
            ip = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
          #endif
          float hgt = max(position.y - ${pivotY.toFixed(2)}, 0.0);
          float ph = ip.x*0.37 + ip.z*0.21;
          float sway = sin(uTime*1.6 + ph) * 0.6 + sin(uTime*3.7 + ph*2.0)*0.25;
          transformed.x += sway * hgt * hgt * ${(0.012 * strength).toFixed(4)};
          transformed.z += cos(uTime*1.3 + ph) * hgt * hgt * ${(0.008 * strength).toFixed(4)};
        }`);
  };
}

function colorize(geo, fn) {
  const p = geo.attributes.position, c = [];
  for (let i = 0; i < p.count; i++) { const col = fn(p.getX(i), p.getY(i), p.getZ(i)); c.push(col.r, col.g, col.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  return geo;
}

// ---------------------------------------------------------------- date palm
function palmTrunk(h) {
  const segs = 22, pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, ring = (i % 2) ? 0.0 : 0.04;
    pts.push(new THREE.Vector2(0.32 - t * 0.12 + ring + (t < 0.05 ? 0.12 * (1 - t / 0.05) : 0), t * h));
  }
  const g = new THREE.LatheGeometry(pts, 9);
  // gentle curve
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + (y / h) ** 2 * 1.2); }
  g.computeVertexNormals();
  return colorize(g, (x, y) => new THREE.Color().setHSL(0.08, 0.35, 0.22 + ((Math.floor(y * 3.5) % 2) ? 0.06 : 0)));
}

function frond(len, rnd) {
  const geos = [];
  const N = 22;
  const droop = 0.6 + rnd() * 0.5;
  const spine = (t) => new THREE.Vector3(t * len, Math.sin(t * Math.PI * 0.55) * len * 0.35 - t * t * len * droop, 0);
  const pos = [], col = [], idx = [];
  let v = 0;
  for (let i = 1; i < N; i++) {
    const t = i / N, p = spine(t), p2 = spine(t + 1 / N);
    const ll = len * 0.28 * Math.sin(t * Math.PI) ** 0.6 + 0.1;
    for (const s of [-1, 1]) {
      const dir = new THREE.Vector3(0.35, -0.55, s).normalize();
      const tip = p.clone().addScaledVector(dir, ll);
      pos.push(p.x, p.y, p.z, p2.x, p2.y, p2.z, tip.x, tip.y, tip.z);
      const c1 = new THREE.Color().setHSL(0.22 - t * 0.04, 0.45, 0.2 + t * 0.06), c2 = new THREE.Color().setHSL(0.17 - t * 0.05, 0.5, 0.32 + t * 0.1);
      col.push(c1.r, c1.g, c1.b, c1.r, c1.g, c1.b, c2.r, c2.g, c2.b);
      idx.push(v, v + 1, v + 2); v += 3;
    }
  }
  // spine
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function palmCrown(h, rnd) {
  const geos = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const f = frond(3.2 + rnd() * 1.2, rnd);
    const up = i < 5 ? 0.6 : (i < 11 ? 0.15 : -0.35);
    f.rotateZ(up + (rnd() - 0.5) * 0.3);
    f.rotateY(i / n * Math.PI * 2 * 2.618);
    geos.push(f);
  }
  // date clusters
  for (let i = 0; i < 4; i++) {
    const g = new THREE.SphereGeometry(0.28, 6, 5).scale(1, 1.4, 1);
    const a = i / 4 * Math.PI * 2;
    g.translate(Math.cos(a) * 0.4, -0.5, Math.sin(a) * 0.4);
    g.deleteAttribute('uv'); geos.push(colorize(g.toNonIndexed(), () => new THREE.Color(0x8a3d12)));
  }
  const all = mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)));
  all.translate(1.2, h, 0);
  return all;
}

export function palms(positions, seed = 1) {
  const rnd = mulberry32(seed), grp = new THREE.Group();
  const variants = 3, H = 9;
  const trunkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
  addWind(leafMat, 0.6, H - 2); addWind(trunkMat, 0.05, 0);
  const buckets = Array.from({ length: variants }, () => []);
  positions.forEach((p, i) => buckets[i % variants].push(p));
  const dummy = new THREE.Object3D();
  for (let v = 0; v < variants; v++) {
    const list = buckets[v]; if (!list.length) continue;
    const tg = palmTrunk(H), cg = palmCrown(H, rnd);
    const tm = new THREE.InstancedMesh(tg, trunkMat, list.length), cm = new THREE.InstancedMesh(cg, leafMat, list.length);
    list.forEach((p, i) => {
      dummy.position.set(p.x, p.y - 0.2, p.z); dummy.rotation.set(0, rnd() * Math.PI * 2, 0);
      const s = 0.75 + rnd() * 0.5; dummy.scale.set(s, s * (0.85 + rnd() * 0.4), s); dummy.updateMatrix();
      tm.setMatrixAt(i, dummy.matrix); cm.setMatrixAt(i, dummy.matrix);
    });
    for (const m of [tm, cm]) { m.castShadow = true; m.receiveShadow = true; grp.add(m); }
  }
  return grp;
}

// ---------------------------------------------------------------- grass / wheat clumps
function clumpGeo(blades, h, w, rnd, colFn) {
  const pos = [], col = [];
  for (let i = 0; i < blades; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * 0.35;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, bh = h * (0.6 + rnd() * 0.6);
    const lean = (rnd() - 0.5) * 0.5, la = rnd() * Math.PI * 2;
    const dx = Math.cos(la) * w, dz = Math.sin(la) * w;
    const tx = x + Math.cos(a) * lean, tz = z + Math.sin(a) * lean;
    pos.push(x - dx, 0, z - dz, x + dx, 0, z + dz, tx, bh, tz);
    const [c0, c1] = colFn(rnd);
    col.push(c0.r, c0.g, c0.b, c0.r, c0.g, c0.b, c1.r, c1.g, c1.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  // point normals upward for soft, uniform shading
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}

export function grassField(points, kind = 'grass', seed = 2) {
  const rnd = mulberry32(seed);
  const wheat = kind === 'wheat';
  const g = wheat
    ? clumpGeo(26, 1.1, 0.03, rnd, (r) => [new THREE.Color().setHSL(0.11, 0.5, 0.3), new THREE.Color().setHSL(0.12 + r() * 0.02, 0.65, 0.62 + r() * 0.1)])
    : clumpGeo(18, 0.55, 0.05, rnd, (r) => [new THREE.Color().setHSL(0.2, 0.45, 0.14), new THREE.Color().setHSL(0.17 + r() * 0.05, 0.45, 0.38 + r() * 0.12)]);
  if (wheat) { // ear heads
    const p = g.attributes.position;
    for (let i = 2; i < p.count; i += 3) p.setY(i, p.getY(i) + 0.15);
  }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
  addWind(mat, wheat ? 3.0 : 4.0, 0);
  const m = new THREE.InstancedMesh(g, mat, points.length);
  const d = new THREE.Object3D();
  points.forEach((p, i) => {
    d.position.set(p.x, p.y, p.z); d.rotation.y = rnd() * 6.28; const s = 0.8 + rnd() * 0.6; d.scale.set(s, s, s);
    d.updateMatrix(); m.setMatrixAt(i, d.matrix);
  });
  m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- rocks
export function rocks(points, seed = 3, color = 0xb09a84) {
  const rnd = mulberry32(seed);
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const n = 1 + noise2(v.x * 2 + 3, v.y * 2 + v.z) * 0.35 + noise2(v.x * 5, v.z * 5) * 0.1;
    v.multiplyScalar(n); v.y *= 0.6; p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  
  const rt = rockTex();
  const mat = triplanarMaterial({ map: rt.map, normalMap: rt.normal, color, scale: 0.6, roughness: 0.95, normalStrength: 1.5, grime: 0.6 });
  const m = new THREE.InstancedMesh(g, mat, points.length);
  const d = new THREE.Object3D();
  points.forEach((pt, i) => {
    d.position.set(pt.x, pt.y, pt.z); d.rotation.set(rnd(), rnd() * 6, rnd() * 0.4);
    const s = pt.s ?? (0.3 + rnd() * 1.2); d.scale.set(s * (0.8 + rnd() * 0.5), s, s * (0.8 + rnd() * 0.5)); d.updateMatrix();
    m.setMatrixAt(i, d.matrix);
  });
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- shrubs (tamarisk-like)
export function shrubs(points, seed = 4) {
  // thorny camel-thorn / tamarisk bushes: dense spiky clumps
  const rnd = mulberry32(seed);
  const g = clumpGeo(70, 1.0, 0.06, rnd, (r) => [new THREE.Color().setHSL(0.12, 0.3, 0.1), new THREE.Color().setHSL(0.15 + r() * 0.06, 0.32, 0.26 + r() * 0.12)]);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { p.setX(i, p.getX(i) * 2.2); p.setZ(i, p.getZ(i) * 2.2); }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });
  addWind(mat, 1.5, 0);
  const m = new THREE.InstancedMesh(g, mat, points.length);
  const d = new THREE.Object3D();
  points.forEach((pt, i) => { d.position.set(pt.x, pt.y, pt.z); d.rotation.y = rnd() * 6; const s = 0.6 + rnd() * 0.8; d.scale.set(s, s * (0.7 + rnd() * 0.6), s); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

let _rock = null;
function rockTex() {
  if (_rock) return _rock;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), img = x.createImageData(S, S), H = new Float32Array(S * S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = i / S * 8, v = j / S * 8;
    // periodic-ish layered noise via sin warps (strata)
    const n = Math.sin(v * 3.0 + Math.sin(u * 1.3) * 1.2) * 0.3 + Math.sin(u * 5.1 + v * 2.3) * 0.15 + Math.sin(u * 13 + v * 11) * 0.08 + (Math.random() - 0.5) * 0.12;
    H[j * S + i] = n;
    const k = (j * S + i) * 4, val = 0.75 + n * 0.35;
    img.data[k] = 168 * val; img.data[k + 1] = 146 * val; img.data[k + 2] = 120 * val; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const nc = document.createElement('canvas'); nc.width = nc.height = S; const nx = nc.getContext('2d'), ni = nx.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const dx = (H[j * S + (i + S - 1) % S] - H[j * S + (i + 1) % S]) * 3, dy = (H[((j + S - 1) % S) * S + i] - H[((j + 1) % S) * S + i]) * 3;
    const l = Math.hypot(dx, dy, 1), k = (j * S + i) * 4;
    ni.data[k] = (dx / l * .5 + .5) * 255; ni.data[k + 1] = (dy / l * .5 + .5) * 255; ni.data[k + 2] = (1 / l * .5 + .5) * 255; ni.data[k + 3] = 255;
  }
  nx.putImageData(ni, 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const normal = new THREE.CanvasTexture(nc); normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  _rock = { map, normal };
  return _rock;
}
