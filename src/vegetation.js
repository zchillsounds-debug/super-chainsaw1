import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32, noise2 } from './noise.js';
import { triplanarMaterial } from './triplanar.js';
import { mudBrick } from './textures.js';

// Shared wind for all swaying foliage (Round 19): a steady lean along the wind, gusts that roll across the
// land as visible waves, and a quick flutter on top. uWindK rises in a sandstorm.
export const wind = { uTime: { value: 0 }, uWindK: { value: 1 }, uWindDir: { value: new THREE.Vector2(0.82, 0.57) } };

function addWind(mat, strength = 1, pivotY = 0) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = wind.uTime; sh.uniforms.uWindK = wind.uWindK; sh.uniforms.uWindDir = wind.uWindDir;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime, uWindK; uniform vec2 uWindDir;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec4 ip = vec4(0.0,0.0,0.0,1.0);
          vec3 wd = vec3(uWindDir.x, 0.0, uWindDir.y);
          #ifdef USE_INSTANCING
            ip = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
            wd = transpose(mat3(instanceMatrix)) * wd; // the wind in the instance's own frame
          #endif
          wd = normalize(vec3(wd.x, 0.0, wd.z) + 1e-5);
          vec3 wpI = (modelMatrix * ip).xyz;
          float hgt = max(position.y - ${pivotY.toFixed(2)}, 0.0);
          float ph = wpI.x*0.37 + wpI.z*0.21;
          // gust fronts travelling downwind
          float g = 0.5 + 0.5*sin(dot(wpI.xz, uWindDir)*0.09 - uTime*1.5 + sin(dot(wpI.xz, vec2(-uWindDir.y, uWindDir.x))*0.05)*1.5);
          g = g*g*g;
          float lean = (0.25 + g*1.25) * uWindK;
          float sway = sin(uTime*1.6 + ph) * (0.35 + 0.3*g) + sin(uTime*3.7 + ph*2.0)*0.18;
          float flutter = sin(uTime*8.3 + ph*5.0 + position.y*3.0) * 0.06 * (0.4 + g);
          float k = hgt * hgt * ${(0.012 * strength).toFixed(4)};
          vec3 side = vec3(-wd.z, 0.0, wd.x);
          transformed += wd * (lean + sway) * k + side * (cos(uTime*1.3 + ph) * 0.45 + flutter * 3.0) * k * 0.6;
          transformed.y -= (lean * k) * (lean * k) * 0.25 / max(hgt, 0.3); // bent stems droop a little
        }`);
  };
  mat.customProgramCacheKey = () => 'wind2:' + strength + ':' + pivotY;
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
  return colorize(g, (x, y) => new THREE.Color().setHSL(0.08, 0.2, 0.75 + ((Math.floor(y * 3.5) % 2) ? 0.08 : 0)));
}

function frond(len, rnd) {
  const geos = [];
  const N = 34;
  const droop = 0.6 + rnd() * 0.5;
  const spine = (t) => new THREE.Vector3(t * len, Math.sin(t * Math.PI * 0.55) * len * 0.35 - t * t * len * droop, 0);
  const pos = [], col = [], idx = [];
  let v = 0;
  for (let i = 1; i < N; i++) {
    const t = i / N, p = spine(t), p2 = spine(t + 1 / N);
    const ll = len * 0.3 * Math.sin(t * Math.PI) ** 0.6 + 0.1;
    for (const s of [-1, 1]) {
      const dir = new THREE.Vector3(0.35, -0.55, s).normalize();
      const tip = p.clone().addScaledVector(dir, ll);
      const mid = p.clone().lerp(p2, 0.45);
      pos.push(p.x, p.y, p.z, mid.x, mid.y, mid.z, tip.x, tip.y, tip.z);
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
  const bark = barkTex();
  const trunkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, map: bark.map, normalMap: bark.normal, normalScale: new THREE.Vector2(1.5, 1.5) });
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
    tm.userData.occlude = true; cm.userData.occlude = true;
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
export function rocks(points, seed = 3, color = 0xf4e6d4) {
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

function barkTex() {
  const W = 128, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); const hc = document.createElement('canvas'); hc.width = W; hc.height = H; const hx = hc.getContext('2d');
  x.fillStyle = '#7a5a3a'; x.fillRect(0, 0, W, H); hx.fillStyle = '#000'; hx.fillRect(0, 0, W, H);
  // overlapping diamond leaf-base scales typical of date palms
  const cw = W / 4, ch = H / 8;
  for (let r = -1; r < 9; r++) for (let k = -1; k < 5; k++) {
    const cx = k * cw + (r % 2) * cw / 2, cy = r * ch;
    for (const [ctx, fill, stroke] of [[x, `hsl(28,${30 + (r * 7 + k * 13) % 15}%,${26 + (r * 5 + k * 3) % 10}%)`, '#2a1a0e'], [hx, '#bbb', '#000']]) {
      ctx.beginPath(); ctx.moveTo(cx, cy - ch * 0.2); ctx.lineTo(cx + cw * 0.55, cy + ch * 0.5); ctx.lineTo(cx, cy + ch * 1.15); ctx.lineTo(cx - cw * 0.55, cy + ch * 0.5); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.stroke();
    }
  }
  // fibres
  for (let i = 0; i < 900; i++) { x.strokeStyle = `rgba(30,18,8,${Math.random() * 0.3})`; const px = Math.random() * W, py = Math.random() * H; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (Math.random() - 0.5) * 6, py + 4 + Math.random() * 6); x.stroke(); }
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(2, 3);
  // height -> normal
  const d = hx.getImageData(0, 0, W, H).data, nc = document.createElement('canvas'); nc.width = W; nc.height = H; const nx = nc.getContext('2d'), img = nx.createImageData(W, H);
  const Hh = (i, j) => d[(((j + H) % H) * W + ((i + W) % W)) * 4] / 255;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const dx = (Hh(i - 1, j) - Hh(i + 1, j)) * 2, dy = (Hh(i, j - 1) - Hh(i, j + 1)) * 2, l = Math.hypot(dx, dy, 1), k = (j * W + i) * 4; img.data[k] = (dx / l * .5 + .5) * 255; img.data[k + 1] = (dy / l * .5 + .5) * 255; img.data[k + 2] = (1 / l * .5 + .5) * 255; img.data[k + 3] = 255; }
  nx.putImageData(img, 0, 0);
  const normal = new THREE.CanvasTexture(nc); normal.wrapS = normal.wrapT = THREE.RepeatWrapping; normal.repeat.set(2, 3);
  return { map, normal };
}

// ---------------------------------------------------------------- umbrella acacia (flat-topped crown)
export function acacias(points, seed = 11) {
  const rnd = mulberry32(seed), grp = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1 });
  const leaf = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  addWind(leaf, 0.25, 3);
  // trunk: forked branches
  const tg = [];
  const branch = (from, dir, len, r, depth) => {
    const to = from.clone().addScaledVector(dir, len);
    const c = new THREE.CylinderGeometry(r * 0.65, r, len, 6);
    c.translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    c.applyQuaternion(q); c.translate(from.x, from.y, from.z); tg.push(c);
    if (depth > 0) for (let i = 0; i < 2; i++) {
      const nd = dir.clone().add(new THREE.Vector3((rnd() - 0.5) * 1.6, 0.25, (rnd() - 0.5) * 1.6)).normalize();
      branch(to, nd, len * 0.7, r * 0.6, depth - 1);
    }
    return to;
  };
  branch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 1, 0).normalize(), 2.4, 0.22, 2);
  const trunkGeo = mergeGeometries(tg.map((g) => g.toNonIndexed()));
  // crown: several flattened noisy blobs
  const cg = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.IcosahedronGeometry(1.4 + rnd() * 0.6, 2);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const v = new THREE.Vector3().fromBufferAttribute(p, k); v.multiplyScalar(1 + noise2(v.x * 2 + i, v.z * 2) * 0.25); p.setXYZ(k, v.x, v.y * 0.28, v.z); }
    const a = i / 6 * Math.PI * 2;
    g.translate(Math.cos(a) * 1.6 * rnd(), 4.4 + rnd() * 0.5, Math.sin(a) * 1.6 * rnd());
    cg.push(g.toNonIndexed());
  }
  const crownGeo = mergeGeometries(cg); crownGeo.computeVertexNormals();
  colorize(crownGeo, (x, y) => new THREE.Color().setHSL(0.2 + rnd() * 0.03, 0.35, 0.16 + (y - 4.2) * 0.25 + rnd() * 0.04));
  const tm = new THREE.InstancedMesh(trunkGeo, bark, points.length), cm = new THREE.InstancedMesh(crownGeo, leaf, points.length);
  const d = new THREE.Object3D();
  points.forEach((pt, i) => { d.position.set(pt.x, pt.y - 0.1, pt.z); d.rotation.y = rnd() * 6; const s = 0.8 + rnd() * 0.5; d.scale.set(s, s, s); d.updateMatrix(); tm.setMatrixAt(i, d.matrix); cm.setMatrixAt(i, d.matrix); });
  for (const m of [tm, cm]) { m.castShadow = true; m.receiveShadow = true; grp.add(m); }
  return grp;
}

// ---------------------------------------------------------------- tall reeds / cattails along the canal
export function reeds(points, seed = 12) {
  const rnd = mulberry32(seed);
  const g = clumpGeo(14, 2.0, 0.025, rnd, (r) => [new THREE.Color().setHSL(0.22, 0.4, 0.12), new THREE.Color().setHSL(0.16 + r() * 0.04, 0.4, 0.36 + r() * 0.1)]);
  // cattail heads
  const heads = [];
  for (let i = 0; i < 5; i++) { const h = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 5).translate((rnd() - 0.5) * 0.5, 1.9 + rnd() * 0.3, (rnd() - 0.5) * 0.5); h.deleteAttribute('uv'); heads.push(colorize(h.toNonIndexed(), () => new THREE.Color(0x4a2a14))); }
  const geo = mergeGeometries([g, ...heads].map((x) => { const y = x.index ? x.toNonIndexed() : x; if (y.attributes.uv) y.deleteAttribute('uv'); if (!y.attributes.normal) y.computeVertexNormals(); return y; }));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
  addWind(mat, 2.0, 0);
  const m = new THREE.InstancedMesh(geo, mat, points.length);
  const d = new THREE.Object3D();
  points.forEach((p, i) => { d.position.set(p.x, p.y, p.z); d.rotation.y = rnd() * 6; const s = 0.7 + rnd() * 0.6; d.scale.set(s, s, s); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// Giant marsh reed (qasab) in dense beds, taller than a man, with pale feathery plumes (Act IV).
export function tallReeds(points, seed = 15) {
  const rnd = mulberry32(seed);
  const g = clumpGeo(16, 3.6, 0.03, rnd, (r) => [new THREE.Color().setHSL(0.2, 0.35, 0.13), new THREE.Color().setHSL(0.12 + r() * 0.03, 0.35, 0.5 + r() * 0.12)]);
  const plumes = [];
  // soft drooping seed heads (panicles), each a slender spindle nodding off the stem tip
  for (let i = 0; i < 9; i++) {
    const h = new THREE.SphereGeometry(0.05, 5, 4).scale(1.3, 6, 1.0).translate(0, 0.2, 0).rotateZ(0.12 + rnd() * 0.3).rotateY(rnd() * 6.28).translate((rnd() - 0.5) * 0.6, 3.3 + rnd() * 0.6, (rnd() - 0.5) * 0.6);
    h.deleteAttribute('uv'); plumes.push(colorize(h.toNonIndexed(), (x, y) => new THREE.Color(0xc8b48c).multiplyScalar(0.85 + (y - 3) * 0.12)));
  }
  const geo = mergeGeometries([g, ...plumes].map((x) => { const y = x.index ? x.toNonIndexed() : x; if (y.attributes.uv) y.deleteAttribute('uv'); if (!y.attributes.normal) y.computeVertexNormals(); return y; }));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
  addWind(mat, 1.6, 0);
  const m = new THREE.InstancedMesh(geo, mat, points.length);
  const d = new THREE.Object3D();
  points.forEach((p, i) => { d.position.set(p.x, p.y, p.z); d.rotation.y = rnd() * 6; const s = 0.75 + rnd() * 0.5; d.scale.set(s, s * (0.85 + rnd() * 0.35), s); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
