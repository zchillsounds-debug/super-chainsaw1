import * as THREE from 'three';

// Signed-distance sculpting: characters are modelled as smooth unions of simple shapes
// (tapered capsules, ellipsoids, tori), meshed with narrow-band surface nets, and skinned
// by letting each shape "own" the vertices it generated (soft-blended where shapes meet).

const _v = new THREE.Vector3(), _m = new THREE.Matrix4();

// Primitive constructors. All coordinates are in model (bind-pose) space.
// opts: { bone, k (blend radius), sub (subtract), mat (region id), w (weight scale, 0 = not used for skinning) }
export function capsule(a, b, r1, r2 = r1, opts = {}) {
  const A = a.clone(), B = b.clone(), ba = B.clone().sub(A), bb = ba.dot(ba) || 1e-9, rm = Math.max(r1, r2);
  return Object.assign({
    f(x, y, z) {
      const px = x - A.x, py = y - A.y, pz = z - A.z;
      let h = (px * ba.x + py * ba.y + pz * ba.z) / bb; h = h < 0 ? 0 : h > 1 ? 1 : h;
      const dx = px - ba.x * h, dy = py - ba.y * h, dz = pz - ba.z * h;
      return Math.sqrt(dx * dx + dy * dy + dz * dz) - (r1 + (r2 - r1) * h);
    },
    t(x, y, z) { // segment parameter (used for painting)
      let h = ((x - A.x) * ba.x + (y - A.y) * ba.y + (z - A.z) * ba.z) / bb; return h < 0 ? 0 : h > 1 ? 1 : h;
    },
    box: new THREE.Box3().setFromPoints([A, B]).expandByScalar(rm),
  }, opts);
}
// Ellipsoid with optional rotation (Euler) about its centre.
export function ellipsoid(c, r, rot = null, opts = {}) {
  const inv = new THREE.Matrix4();
  if (rot) (rot.isQuaternion ? inv.makeRotationFromQuaternion(rot) : inv.makeRotationFromEuler(rot)).setPosition(c).invert(); else inv.makeTranslation(-c.x, -c.y, -c.z);
  const e = inv.elements, rx = r.x, ry = r.y, rz = r.z, R = Math.max(rx, ry, rz);
  return Object.assign({
    f(x, y, z) {
      const lx = e[0] * x + e[4] * y + e[8] * z + e[12], ly = e[1] * x + e[5] * y + e[9] * z + e[13], lz = e[2] * x + e[6] * y + e[10] * z + e[14];
      const ax = lx / rx, ay = ly / ry, az = lz / rz, k0 = Math.sqrt(ax * ax + ay * ay + az * az);
      const bx = ax / rx, by = ay / ry, bz = az / rz, k1 = Math.sqrt(bx * bx + by * by + bz * bz) || 1e-9;
      return k0 * (k0 - 1) / k1;
    },
    box: new THREE.Box3(c.clone().subScalar(R), c.clone().addScalar(R)),
  }, opts);
}
// Torus around local Y (major radius R, minor r), positioned and rotated; sy squashes it vertically.
export function torus(c, R, r, rot = null, opts = {}, sy = 1) {
  const inv = new THREE.Matrix4();
  if (rot) (rot.isQuaternion ? inv.makeRotationFromQuaternion(rot) : inv.makeRotationFromEuler(rot)).setPosition(c).invert(); else inv.makeTranslation(-c.x, -c.y, -c.z);
  const e = inv.elements;
  return Object.assign({
    f(x, y, z) {
      const lx = e[0] * x + e[4] * y + e[8] * z + e[12], ly = (e[1] * x + e[5] * y + e[9] * z + e[13]) / sy, lz = e[2] * x + e[6] * y + e[10] * z + e[14];
      const q = Math.sqrt(lx * lx + lz * lz) - R;
      return Math.sqrt(q * q + ly * ly) - r;
    },
    box: new THREE.Box3(c.clone().subScalar(R + r), c.clone().addScalar(R + r)),
  }, opts);
}
// Plane half-space (keeps the side opposite the normal) - used with sub/intersect to trim.
export function halfspace(p, n, opts = {}) {
  const N = n.clone().normalize(), d0 = N.dot(p);
  return Object.assign({ f(x, y, z) { return N.x * x + N.y * y + N.z * z - d0; }, box: new THREE.Box3(new THREE.Vector3(-9, -9, -9), new THREE.Vector3(9, 9, 9)), w: 0 }, opts);
}

function boxDist(b, x, y, z) {
  const dx = Math.max(b.min.x - x, 0, x - b.max.x), dy = Math.max(b.min.y - y, 0, y - b.max.y), dz = Math.max(b.min.z - z, 0, z - b.max.z);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Evaluate the combined field at a point. ops are applied in order (smooth union / subtraction / intersection).
function makeField(all) {
  return (x, y, z, prims = all) => {
    let d = 1e9;
    for (let i = 0, n = prims.length; i < n; i++) {
      const p = prims[i], k = p.k ?? 0.02;
      if (p.sub) {
        if (boxDist(p.box, x, y, z) >= k - d) continue;
        const b = -p.f(x, y, z), h = Math.max(k - Math.abs(d - b), 0) / k;
        d = Math.max(d, b) + h * h * k * 0.25;
      } else if (p.inter) {
        const b = p.f(x, y, z), h = Math.max(k - Math.abs(d - b), 0) / k;
        d = Math.max(d, b) + h * h * k * 0.25;
      } else {
        if (boxDist(p.box, x, y, z) >= d + k) continue;
        const b = p.f(x, y, z), h = Math.max(k - Math.abs(d - b), 0) / k;
        d = Math.min(d, b) - h * h * k * 0.25;
      }
    }
    return d;
  };
}

// Narrow-band surface nets. Returns a skinned BufferGeometry.
// bones: array of bone indices referenced by prims[i].bone; paint(x,y,z,dominantPrim) -> region id override.
export function sculpt(prims, { voxel = 0.012, pad = 0.03, paint = null, blend = 0.025 } = {}) {
  const field = makeField(prims);
  const bb = new THREE.Box3();
  for (const p of prims) if (!p.sub && !p.inter) bb.union(p.box);
  bb.expandByScalar(pad);
  const h = voxel, nx = Math.ceil((bb.max.x - bb.min.x) / h) + 1, ny = Math.ceil((bb.max.y - bb.min.y) / h) + 1, nz = Math.ceil((bb.max.z - bb.min.z) / h) + 1;
  const ox = bb.min.x, oy = bb.min.y, oz = bb.min.z;
  // coarse pass (every C-th sample) to find the band around the surface
  const C = 4, cx = Math.ceil((nx - 1) / C) + 1, cy = Math.ceil((ny - 1) / C) + 1, cz = Math.ceil((nz - 1) / C) + 1;
  const coarse = new Float32Array(cx * cy * cz);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) coarse[(k * cy + j) * cx + i] = field(ox + i * C * h, oy + j * C * h, oz + k * C * h);
  const band = C * h * 1.9, kmax = Math.max(...prims.map((p) => p.k ?? 0.02));
  // per coarse cell: only the shapes that can influence the field near the surface there (keeps order)
  const lists = new Map(), CS = C * h, reach = band + kmax + CS;
  const cellList = (x, y, z) => {
    const i = Math.min(cx - 2, Math.max(0, Math.floor((x - ox) / CS))), j = Math.min(cy - 2, Math.max(0, Math.floor((y - oy) / CS))), k = Math.min(cz - 2, Math.max(0, Math.floor((z - oz) / CS)));
    const key = (k * cy + j) * cx + i;
    let L = lists.get(key);
    if (!L) {
      const mx = ox + (i + 0.5) * CS, my = oy + (j + 0.5) * CS, mz = oz + (k + 0.5) * CS;
      L = prims.filter((p) => p.inter || boxDist(p.box, mx, my, mz) < reach);
      lists.set(key, L);
    }
    return L;
  };
  const S = nx * ny, vals = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) {
    const ck = k / C, k0 = Math.min(cz - 2, Math.floor(ck)), fk = ck - k0;
    for (let j = 0; j < ny; j++) {
      const cj = j / C, j0 = Math.min(cy - 2, Math.floor(cj)), fj = cj - j0;
      for (let i = 0; i < nx; i++) {
        const ci = i / C, i0 = Math.min(cx - 2, Math.floor(ci)), fi = ci - i0;
        const c000 = coarse[(k0 * cy + j0) * cx + i0], c100 = coarse[(k0 * cy + j0) * cx + i0 + 1], c010 = coarse[(k0 * cy + j0 + 1) * cx + i0], c110 = coarse[(k0 * cy + j0 + 1) * cx + i0 + 1];
        const c001 = coarse[((k0 + 1) * cy + j0) * cx + i0], c101 = coarse[((k0 + 1) * cy + j0) * cx + i0 + 1], c011 = coarse[((k0 + 1) * cy + j0 + 1) * cx + i0], c111 = coarse[((k0 + 1) * cy + j0 + 1) * cx + i0 + 1];
        const lin = ((c000 * (1 - fi) + c100 * fi) * (1 - fj) + (c010 * (1 - fi) + c110 * fi) * fj) * (1 - fk) + ((c001 * (1 - fi) + c101 * fi) * (1 - fj) + (c011 * (1 - fi) + c111 * fi) * fj) * fk;
        const X = ox + i * h, Y = oy + j * h, Z = oz + k * h;
        vals[k * S + j * nx + i] = Math.abs(lin) < band ? field(X, Y, Z, cellList(X, Y, Z)) : lin;
      }
    }
  }
  // one vertex per sign-changing cell
  const cellIdx = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const pos = [];
  const corner = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const v = vals[(k + corner[c][2]) * S + (j + corner[c][1]) * nx + i + corner[c][0]]; cv[c] = v; if (v < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, cnt = 0;
    for (const [a, b] of edges) {
      const va = cv[a], vb = cv[b]; if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb), A = corner[a], B = corner[b];
      sx += A[0] + (B[0] - A[0]) * t; sy += A[1] + (B[1] - A[1]) * t; sz += A[2] + (B[2] - A[2]) * t; cnt++;
    }
    cellIdx[(k * (ny - 1) + j) * (nx - 1) + i] = pos.length / 3;
    pos.push(ox + (i + sx / cnt) * h, oy + (j + sy / cnt) * h, oz + (k + sz / cnt) * h);
  }
  const ci = (i, j, k) => cellIdx[(k * (ny - 1) + j) * (nx - 1) + i];
  const idx = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const v0 = vals[k * S + j * nx + i] < 0;
    if (i < nx - 1 && v0 !== (vals[k * S + j * nx + i + 1] < 0)) quad(ci(i, j - 1, k - 1), ci(i, j, k - 1), ci(i, j, k), ci(i, j - 1, k), !v0);
    if (j < ny - 1 && v0 !== (vals[k * S + (j + 1) * nx + i] < 0)) quad(ci(i - 1, j, k - 1), ci(i - 1, j, k), ci(i, j, k), ci(i, j, k - 1), !v0);
    if (k < nz - 1 && v0 !== (vals[(k + 1) * S + j * nx + i] < 0)) quad(ci(i - 1, j - 1, k), ci(i, j - 1, k), ci(i, j, k), ci(i - 1, j, k), !v0);
  }
  // project onto the surface and take analytic normals from the field gradient
  const nv = pos.length / 3, P = new Float32Array(pos), N = new Float32Array(nv * 3), e = h * 0.5;
  for (let v = 0; v < nv; v++) {
    let x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    const L = cellList(x, y, z), d = field(x, y, z, L);
    let gx = field(x + e, y, z, L) - field(x - e, y, z, L), gy = field(x, y + e, z, L) - field(x, y - e, z, L), gz = field(x, y, z + e, L) - field(x, y, z - e, L);
    const gl = Math.hypot(gx, gy, gz) || 1; gx /= gl; gy /= gl; gz /= gl;
    const sd = Math.max(-h, Math.min(h, d)); x -= gx * sd; y -= gy * sd; z -= gz * sd;
    N[v * 3] = gx; N[v * 3 + 1] = gy; N[v * 3 + 2] = gz;
    P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = z;
  }
  // skin weights: shapes close to the vertex own it, softly blended near joints
  const SI = new Uint16Array(nv * 4), SW = new Float32Array(nv * 4), MAT = new Float32Array(nv);
  const isAdd = (p) => !p.sub && !p.inter && p.w !== 0, addCache = new Map();
  const acc = new Map(), ds = new Float32Array(prims.length);
  for (let v = 0; v < nv; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
    const CL = cellList(x, y, z); let adds = addCache.get(CL); if (!adds) { adds = CL.filter(isAdd); addCache.set(CL, adds); }
    let dmin = 1e9, dom = null;
    for (let a = 0; a < adds.length; a++) { const p = adds[a]; const d = boxDist(p.box, x, y, z) > dmin + blend * 6 ? 1e9 : p.f(x, y, z); ds[a] = d; if (d < dmin) { dmin = d; dom = p; } }
    acc.clear();
    for (let a = 0; a < adds.length; a++) {
      const d = ds[a]; if (d > dmin + blend * 5) continue;
      const p = adds[a], w = Math.exp(-(d - dmin) / (p.blend ?? blend)) * (p.w ?? 1);
      if (p.bones) for (const [b, f] of p.bones) acc.set(b, (acc.get(b) || 0) + w * f);
      else acc.set(p.bone, (acc.get(p.bone) || 0) + w);
    }
    const top = [...acc].sort((m, n) => n[1] - m[1]).slice(0, 4);
    const sum = top.reduce((s, q) => s + q[1], 0) || 1;
    top.forEach(([b, w], q) => { SI[v * 4 + q] = b; SW[v * 4 + q] = w / sum; });
    MAT[v] = paint ? paint(x, y, z, dom) ?? (dom?.mat ?? 0) : (dom?.mat ?? 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
  g.setAttribute('aMat', new THREE.BufferAttribute(MAT, 1));
  g.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
