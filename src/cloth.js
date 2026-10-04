import * as THREE from 'three';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _m = new THREE.Matrix4();

// Verlet cloth patch: rows x cols particles. Row 0 is pinned to a bone. Simulated in world space
// with distance + tether constraints and collisions against body capsules and the ground.
// kinematic mode (low quality / far away): particles ride the bone with a cheap swing and leg push-out.
// Cloth shader add-on: folds that follow the cloth's compression (bump from screen-space derivatives).
export function addWrinkles(mat) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev && prev(sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aWr; varying float vWr; varying vec3 vWp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWr = aWr; vWp = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying float vWr; varying vec3 vWp;
      float wh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float wn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(wh(i), wh(i + vec2(1, 0)), f.x), mix(wh(i + vec2(0, 1)), wh(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { float ang = atan(vWp.x, vWp.z);
        float H = (sin(ang * 26.0 + wn(vec2(ang * 4.0, vWp.y * 6.0)) * 5.0) * 0.5 + 0.5) * (0.0012 + 0.006 * vWr) + wn(vec2(ang * 9.0, vWp.y * 30.0)) * 0.0008;
        vec3 sp = -vViewPosition, sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1) * faceDirection;
        vec2 dh = vec2(dFdx(H), dFdy(H)); normal = normalize(abs(det) * normal - sign(det) * (dh.x * r1 + dh.y * r2)); }`);
  };
  const key = mat.customProgramCacheKey?.() || '';
  mat.customProgramCacheKey = () => 'wr' + key;
  return mat;
}

export class Cloth {
  constructor({ rows, cols, rest, anchor, material, closed = false, uvRepeat = 1, stiff = 1, gravity = 1, carry = 0.45, maxSwing = 0, outside = false, slack = 1, shape = 0 }) {
    this.carry = carry; this.maxSwing = maxSwing; this.outside = outside; this.shape = shape; this.rows = rows; this.cols = cols; this.anchor = anchor; this.closed = closed; this.gravity = gravity;
    const n = rows * cols;
    this.p = new Float32Array(n * 3); this.q = new Float32Array(n * 3);
    this.local = new Float32Array(n * 3); // rest positions in the anchor bone's bind space
    const inv = new THREE.Matrix4().copy(anchor.userData.bindWorld).invert();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const v = rest(r, c).applyMatrix4(inv), i = (r * cols + c) * 3;
      this.local[i] = v.x; this.local[i + 1] = v.y; this.local[i + 2] = v.z;
    }
    // constraints: [i, j, restLen]
    const cons = [], L = (i, j) => Math.hypot(this.local[i * 3] - this.local[j * 3], this.local[i * 3 + 1] - this.local[j * 3 + 1], this.local[i * 3 + 2] - this.local[j * 3 + 2]);
    const id = (r, c) => r * cols + ((c + cols) % cols);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (r + 1 < rows) cons.push(id(r, c), id(r + 1, c), L(id(r, c), id(r + 1, c)));
      // slack > 1: the cloth round the body only resists stretching past slack x its rest width (stored negative), so a
      // robe gathers as it hangs and spreads when a leg pushes it
      if (c + 1 < cols || closed) cons.push(id(r, c), id(r, c + 1), r && slack > 1 ? -L(id(r, c), id(r, c + 1)) * slack : L(id(r, c), id(r, c + 1)));
      if (r + 2 < rows) cons.push(id(r, c), id(r + 2, c), L(id(r, c), id(r + 2, c)));
      if (r > 0 && (c + 2 < cols || closed)) cons.push(id(r, c), id(r, c + 2), slack > 1 ? -L(id(r, c), id(r, c + 2)) * slack : L(id(r, c), id(r, c + 2)));
    }
    this.cons = new Float32Array(cons); this.stiff = stiff;
    // tether: maximum distance of each particle to its column's pinned particle
    this.tether = new Float32Array(n);
    for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++) this.tether[r * cols + c] = L(id(r, c), id(0, c)) * 1.03;
    // render geometry
    // a closed tube gets one extra seam column (a copy of column 0) so its texture wraps without a smeared strip
    const g = new THREE.BufferGeometry(), nv = closed ? n + rows : n, uw = closed ? cols : cols - 1;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
    const uv = new Float32Array(nv * 2);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { uv[(r * cols + c) * 2] = c / uw * uvRepeat; uv[(r * cols + c) * 2 + 1] = 1 - r / (rows - 1); }
    for (let r = 0; closed && r < rows; r++) { uv[(n + r) * 2] = uvRepeat; uv[(n + r) * 2 + 1] = 1 - r / (rows - 1); }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const idx = [], vid = (r, c) => c === cols ? n + r : r * cols + c;
    const cc = closed ? cols : cols - 1;
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cc; c++) { const a = vid(r, c), b = vid(r, c + 1), d = vid(r + 1, c), e = vid(r + 1, c + 1); idx.push(a, d, b, b, d, e); }
    g.setIndex(idx);
    // compression per particle (0 = at rest, 1 = bunched up): drives the wrinkle normal in the cloth shader
    g.setAttribute('aWr', new THREE.BufferAttribute(new Float32Array(nv), 1));
    this.restV = new Float32Array(n); this.restH = new Float32Array(n);
    for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++) this.restV[r * cols + c] = L(id(r, c), id(r - 1, c));
    for (let r = 0; r < rows; r++) for (let c = 1; c < cols; c++) this.restH[r * cols + c] = L(id(r, c), id(r, c - 1));
    this.geo = g;
    this.mesh = new THREE.Mesh(g, material); this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    this.inited = false; this.acc = 0; this.colliders = []; this.damp = 0.94;
  }
  pinWorld(i, out) { return out.set(this.local[i * 3], this.local[i * 3 + 1], this.local[i * 3 + 2]).applyMatrix4(this.anchor.matrixWorld); }
  reset() {
    const n = this.rows * this.cols;
    for (let i = 0; i < n; i++) { this.pinWorld(i, _a); this.p[i * 3] = this.q[i * 3] = _a.x; this.p[i * 3 + 1] = this.q[i * 3 + 1] = _a.y; this.p[i * 3 + 2] = this.q[i * 3 + 2] = _a.z; }
    this.inited = true;
  }
  collide(i, ground) {
    const P = this.p, out = this.outside;
    if (out) this.anchor.getWorldPosition(_c);
    for (let ci = 0; ci < this.colliders.length; ci++) {
      const cap = this.colliders[ci];
      // closest point on segment a-b
      const ax = cap.a.x, ay = cap.a.y, az = cap.a.z, bx = cap.b.x - ax, by = cap.b.y - ay, bz = cap.b.z - az;
      const px = P[i * 3] - ax, py = P[i * 3 + 1] - ay, pz = P[i * 3 + 2] - az;
      let t = (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz || 1); t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = px - bx * t, dy = py - by * t, dz = pz - bz * t, d = Math.sqrt(dx * dx + dy * dy + dz * dz), r = cap.r;
      // a closed robe (outside): each column keeps outside the legs in its own direction (out from the hips through
      // its pin), however far a stride or a kicked-up heel reaches. Plain push-out lets a leg that has passed a
      // particle shove it inward, and the leg pokes through
      if (out && ci < 4) {
        const c0 = (i % this.cols) * 3; let nx = P[c0] - _c.x, nz = P[c0 + 2] - _c.z; const nl = Math.sqrt(nx * nx + nz * nz) || 1; nx /= nl; nz /= nl;
        const qx = ax + bx * t - P[i * 3], qz = az + bz * t - P[i * 3 + 2], lat = Math.abs(qx * nz - qz * nx);
        if (lat < r * 2 && Math.abs(dy) < r * 2.5) { const face = qx * nx + qz * nz + Math.sqrt(Math.max(0, r * r - lat * lat)); if (face > 0) { P[i * 3] += nx * face; P[i * 3 + 2] += nz * face; } }
        continue;
      }
      if (d < r && d > 1e-6) { const k = (r - d) / d; P[i * 3] += dx * k; P[i * 3 + 1] += dy * k; P[i * 3 + 2] += dz * k; }
    }
    if (ground !== undefined && P[i * 3 + 1] < ground) P[i * 3 + 1] = ground;
  }
  // swing: {x, z} extra rotation (radians) applied to the hanging rows in kinematic mode
  update(dt, sim, groundY, swing, wind = 0) {
    const n = this.rows * this.cols, cols = this.cols, P = this.p, Q = this.q;
    if (!this.inited) this.reset();
    if (!sim) {
      // ride the bone, swinging rows about the pinned edge, then push out of the legs
      _m.copy(this.anchor.matrixWorld);
      for (let r = 0; r < this.rows; r++) {
        const t = r / (this.rows - 1), ax = swing.x * t, az = swing.z * t;
        const cx = Math.cos(ax), sx = Math.sin(ax), cz = Math.cos(az), sz = Math.sin(az);
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c, i0 = c;
          let lx = this.local[i * 3] - this.local[i0 * 3], ly = this.local[i * 3 + 1] - this.local[i0 * 3 + 1], lz = this.local[i * 3 + 2] - this.local[i0 * 3 + 2];
          let y2 = ly * cx - lz * sx, z2 = ly * sx + lz * cx; ly = y2; lz = z2;
          const x2 = lx * cz - ly * sz; y2 = lx * sz + ly * cz; lx = x2; ly = y2;
          _a.set(this.local[i0 * 3] + lx, this.local[i0 * 3 + 1] + ly, this.local[i0 * 3 + 2] + lz).applyMatrix4(_m);
          P[i * 3] = Q[i * 3] = _a.x; P[i * 3 + 1] = Q[i * 3 + 1] = _a.y; P[i * 3 + 2] = Q[i * 3 + 2] = _a.z;
          if (r > 0) this.collide(i, groundY);
        }
      }
    } else {
      this.acc = Math.min(this.acc + dt, 0.05);
      const h = 1 / 60, g = -9.8 * this.gravity * h * h, ws = this.anchor.matrixWorld.getMaxScaleOnAxis();
      while (this.acc >= h) {
        this.acc -= h;
        // the pinned edge's motion this step; free particles are partly carried along with it (heavy wool and
        // felt hang off a running body rather than streaming out behind it like a flag)
        let mx = 0, mz = 0;
        for (let c = 0; c < cols; c++) { this.pinWorld(c, _a); mx += _a.x - P[c * 3]; mz += _a.z - P[c * 3 + 2]; P[c * 3] = Q[c * 3] = _a.x; P[c * 3 + 1] = Q[c * 3 + 1] = _a.y; P[c * 3 + 2] = Q[c * 3 + 2] = _a.z; }
        mx /= cols; mz /= cols; if (mx * mx + mz * mz > 0.04) mx = mz = 0; // teleports
        const carry = this.carry;
        for (let i = cols; i < n; i++) {
          const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], damp = this.damp;
          P[i * 3] += mx * carry; P[i * 3 + 2] += mz * carry;
          P[i * 3] += (x - Q[i * 3]) * damp + wind * h * h * (Math.sin(i * 1.7 + performance.now() * 0.004) * 6);
          P[i * 3 + 1] += (y - Q[i * 3 + 1]) * damp + g;
          P[i * 3 + 2] += (z - Q[i * 3 + 2]) * damp + wind * h * h * (Math.cos(i * 2.3 + performance.now() * 0.003) * 6);
          Q[i * 3] = x; Q[i * 3 + 1] = y; Q[i * 3 + 2] = z;
        }
        // shape: a light pull (across, not up or down) toward the draped rest shape, so a robe stays centred on the body
        if (this.shape) for (let i = cols; i < n; i++) { this.pinWorld(i, _a); P[i * 3] += (_a.x - P[i * 3]) * this.shape; P[i * 3 + 2] += (_a.z - P[i * 3 + 2]) * this.shape; }
        const C = this.cons;
        for (let it = 0; it < 3; it++) {
          for (let k = 0; k < C.length; k += 3) {
            const a = C[k], b = C[k + 1]; let L = C[k + 2];
            const dx = P[b * 3] - P[a * 3], dy = P[b * 3 + 1] - P[a * 3 + 1], dz = P[b * 3 + 2] - P[a * 3 + 2];
            const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
            if (L < 0) { L = -L; if (d < L * ws) continue; }
            const diff = (d - L * ws) / d * 0.5 * this.stiff;
            const wa = a < cols ? 0 : 1, wb = b < cols ? 0 : 1, s = wa + wb; if (!s) continue;
            const fa = diff * 2 * wa / s, fb = diff * 2 * wb / s;
            P[a * 3] += dx * fa; P[a * 3 + 1] += dy * fa; P[a * 3 + 2] += dz * fa;
            P[b * 3] -= dx * fb; P[b * 3 + 1] -= dy * fb; P[b * 3 + 2] -= dz * fb;
          }
          for (let i = cols; i < n; i++) {
            const c0 = i % cols, mx = this.tether[i] * ws;
            const dx = P[i * 3] - P[c0 * 3], dy = P[i * 3 + 1] - P[c0 * 3 + 1], dz = P[i * 3 + 2] - P[c0 * 3 + 2], d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (d > mx) { const k = mx / d; P[i * 3] = P[c0 * 3] + dx * k; P[i * 3 + 1] = P[c0 * 3 + 1] + dy * k; P[i * 3 + 2] = P[c0 * 3 + 2] + dz * k; }
            // Round 20: a long robe can't swing up like a flag (a striding leg pushed the front of the Naffat's robe
            // up and out in front of him): keep each particle within maxSwing of hanging straight down from its pin
            if (this.maxSwing) {
              const hx = P[i * 3] - P[c0 * 3], hz = P[i * 3 + 2] - P[c0 * 3 + 2], drop = P[c0 * 3 + 1] - P[i * 3 + 1], hh = Math.sqrt(hx * hx + hz * hz);
              if (hh > 1e-5 && Math.atan2(hh, drop) > this.maxSwing) {
                const L = Math.sqrt(hh * hh + drop * drop), nh = L * Math.sin(this.maxSwing) / hh;
                P[i * 3] = P[c0 * 3] + hx * nh; P[i * 3 + 2] = P[c0 * 3 + 2] + hz * nh; P[i * 3 + 1] = P[c0 * 3 + 1] - L * Math.cos(this.maxSwing);
              }
            }
            // collide last, so the swing limit can't pull the cloth back into a leg (Round 21)
            this.collide(i, groundY);
          }
        }
      }
    }
    // write into the mesh (local to its parent)
    const parentInv = _m.copy(this.mesh.parent.matrixWorld).invert(), pos = this.geo.attributes.position;
    for (let i = 0; i < n; i++) { _a.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).applyMatrix4(parentInv); pos.setXYZ(i, _a.x, _a.y, _a.z); }
    if (this.closed) for (let r = 0; r < this.rows; r++) pos.setXYZ(n + r, pos.getX(r * cols), pos.getY(r * cols), pos.getZ(r * cols));
    pos.needsUpdate = true;
    this.geo.computeVertexNormals();
    if (this.closed) {
      // the seam's two copies share one normal, so no shading line runs down the back
      const nr = this.geo.attributes.normal;
      for (let r = 0; r < this.rows; r++) { const a = r * cols, b = n + r; _a.set(nr.getX(a) + nr.getX(b), nr.getY(a) + nr.getY(b), nr.getZ(a) + nr.getZ(b)).normalize(); nr.setXYZ(a, _a.x, _a.y, _a.z); nr.setXYZ(b, _a.x, _a.y, _a.z); }
    }
    // wrinkles: where an edge is shorter than at rest, the cloth has bunched
    const wr = this.geo.attributes.aWr, ws2 = this.anchor.matrixWorld.getMaxScaleOnAxis(), dist = (a, b) => Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]);
    for (let i = cols; i < n; i++) {
      const cv = 1 - dist(i, i - cols) / (this.restV[i] * ws2 || 1), ch = i % cols ? 1 - dist(i, i - 1) / (this.restH[i] * ws2 || 1) : 0;
      const w = Math.min(1, Math.max(0, cv * 5) + Math.max(0, ch * 4));
      wr.array[i] = wr.array[i] * 0.7 + w * 0.3;
    }
    if (this.closed) for (let r = 0; r < this.rows; r++) wr.array[n + r] = wr.array[r * cols];
    wr.needsUpdate = true;
  }
}

// Spring bone: a pivot whose rest axis is pulled by a damped point mass (beard, scabbard, sash ends).
export class Jiggle {
  constructor(pivot, axis = new THREE.Vector3(0, -1, 0), len = 0.3, { stiff = 60, damp = 8, grav = 3, limit = 1.0 } = {}) {
    this.pivot = pivot; this.axis = axis.clone().normalize(); this.len = len; this.stiff = stiff; this.damp = damp; this.grav = grav; this.limit = limit;
    this.restQ = pivot.quaternion.clone(); this.tip = null; this.vel = new THREE.Vector3();
  }
  update(dt) {
    dt = Math.min(dt, 1 / 30);
    const pv = this.pivot, par = pv.parent;
    pv.quaternion.copy(this.restQ); pv.updateMatrixWorld();
    const origin = _a.setFromMatrixPosition(pv.matrixWorld);
    const target = _b.copy(this.axis).multiplyScalar(this.len).applyMatrix4(pv.matrixWorld);
    if (!this.tip) { this.tip = target.clone(); return; }
    // spring toward the animated target plus a little gravity
    const f = _c.copy(target).sub(this.tip).multiplyScalar(this.stiff);
    f.y -= this.grav;
    this.vel.addScaledVector(f, dt).multiplyScalar(Math.max(0, 1 - this.damp * dt));
    this.tip.addScaledVector(this.vel, dt);
    // keep length, limit the angle
    const dir = _c.copy(this.tip).sub(origin); const l = dir.length() || 1e-6; dir.divideScalar(l);
    const rest = target.sub(origin).normalize();
    const ang = Math.acos(THREE.MathUtils.clamp(dir.dot(rest), -1, 1));
    if (ang > this.limit) { const axis = _b.crossVectors(rest, dir).normalize(); dir.copy(rest).applyAxisAngle(axis, this.limit); }
    this.tip.copy(origin).addScaledVector(dir, this.len);
    // rotate the pivot so its axis points at the tip (in parent space)
    const wq = new THREE.Quaternion().setFromUnitVectors(rest, dir);
    const pq = par.getWorldQuaternion(new THREE.Quaternion());
    const cur = pq.clone().multiply(this.restQ);
    pv.quaternion.copy(pq.invert().multiply(wq.multiply(cur)));
  }
}
