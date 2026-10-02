import { colliders } from './buildings.js';

// Spatial hash over static colliders.
const CELL = 8;
let grid = null;
function key(i, j) { return i * 10007 + j; }
export function buildGrid() {
  grid = new Map();
  for (const c of colliders) {
    const r = c.type === 'circle' ? c.r : Math.hypot(c.hw, c.hd);
    const i0 = Math.floor((c.x - r) / CELL), i1 = Math.floor((c.x + r) / CELL);
    const j0 = Math.floor((c.z - r) / CELL), j1 = Math.floor((c.z + r) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(c);
    }
  }
}

// Push a circle (pos.x, pos.z, radius) out of static colliders. Returns true if it collided.
export function resolve(pos, radius, ignoreCanal = false) {
  let hit = false;
  const i = Math.floor(pos.x / CELL), j = Math.floor(pos.z / CELL);
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    const list = grid.get(key(i + di, j + dj)); if (!list) continue;
    for (const c of list) {
      if (ignoreCanal && c.canal) continue;
      if (c.type === 'circle') {
        const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), m = c.r + radius;
        if (d < m && d > 1e-5) { pos.x = c.x + dx / d * m; pos.z = c.z + dz / d * m; hit = true; }
      } else {
        const cs = Math.cos(c.rot || 0), sn = Math.sin(c.rot || 0);
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
        const qx = Math.max(-c.hw, Math.min(c.hw, lx)), qz = Math.max(-c.hd, Math.min(c.hd, lz));
        let ex = lx - qx, ez = lz - qz, d = Math.hypot(ex, ez);
        if (d < radius) {
          let nx, nz;
          if (d > 1e-5) { nx = ex / d; nz = ez / d; }
          else { // inside: push along smallest axis
            const px = c.hw - Math.abs(lx), pz = c.hd - Math.abs(lz);
            if (px < pz) { nx = Math.sign(lx) || 1; nz = 0; d = -px; } else { nx = 0; nz = Math.sign(lz) || 1; d = -pz; }
          }
          const push = radius - d;
          const wx = nx * cs + nz * sn, wz = -nx * sn + nz * cs;
          pos.x += wx * push; pos.z += wz * push; hit = true;
        }
      }
    }
  }
  return hit;
}

// Line-of-sight check by sampling.
export function lineClear(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 1.0);
  const p = { x: 0, z: 0 };
  for (let k = 1; k < n; k++) {
    p.x = ax + (bx - ax) * k / n; p.z = az + (bz - az) * k / n;
    const ox = p.x, oz = p.z;
    if (resolve(p, 0.05, true) && Math.hypot(p.x - ox, p.z - oz) > 0.01) return false;
  }
  return true;
}
