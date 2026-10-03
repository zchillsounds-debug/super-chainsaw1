import { resolve } from './collision.js';
import { WORLD } from './terrain.js';

// Grid navigation: 1m cells, A* with octile heuristic + line-of-sight smoothing.
// The grid spans the overworld plus the interior region east of it (x 150..290: kiln tunnels and qanats).
export const INTERIOR_X = 150;
const CELL = 1, HALF = WORLD / 2, X0 = -HALF, Z0 = -HALF, NX = Math.floor((290 - X0) / CELL), NZ = Math.floor(WORLD / CELL), N = NX;
let blocked = null;
let floorFn = null; // interior floor test: cells east of INTERIOR_X are solid unless an interior says otherwise
export function setInteriorFloor(fn) { floorFn = fn; }

// x0..x1 limits a rebuild to one band (used when an interior is regenerated)
export function buildNav(x0 = X0, x1 = X0 + NX * CELL) {
  if (!blocked) blocked = new Uint8Array(NX * NZ);
  const p = { x: 0, z: 0 };
  const i0 = Math.max(0, Math.floor((x0 - X0) / CELL)), i1 = Math.min(NX, Math.ceil((x1 - X0) / CELL));
  for (let j = 0; j < NZ; j++) for (let i = i0; i < i1; i++) {
    blocked[j * N + i] = 0;
    p.x = i * CELL + X0 + 0.5; p.z = j * CELL + Z0 + 0.5;
    if (p.x >= INTERIOR_X && !(floorFn && floorFn(p.x, p.z))) { blocked[j * N + i] = 1; continue; }
    const ox = p.x, oz = p.z;
    resolve(p, 0.55);
    if (Math.hypot(p.x - ox, p.z - oz) > 0.05) blocked[j * N + i] = 1;
  }
}
const idx = (x, z) => { const i = Math.floor((x - X0) / CELL), j = Math.floor((z - Z0) / CELL); return (i < 0 || j < 0 || i >= NX || j >= NZ) ? -1 : j * N + i; };
const isBlocked = (k) => k < 0 || blocked[k] === 1;

export function navClear(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.5);
  for (let s = 1; s <= n; s++) { const t = s / n; if (isBlocked(idx(ax + (bx - ax) * t, az + (bz - az) * t))) return false; }
  return true;
}

// simple binary heap
class Heap { constructor() { this.a = []; } push(k, f) { const a = this.a; a.push([k, f]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][1] <= a[i][1]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l][1] < a[m][1]) m = l; if (r < a.length && a[r][1] < a[m][1]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } get size() { return this.a.length; } }

const g = new Float32Array(NX * NZ), came = new Int32Array(NX * NZ), stamp = new Uint32Array(NX * NZ); let cur = 1;
export function findPath(from, to, maxIter = 12000) {
  if (!blocked) return null;
  let s = idx(from.x, from.z), t = idx(to.x, to.z);
  if (s < 0 || t < 0) return null;
  if (isBlocked(t)) { // snap goal to nearest free cell
    const ti = t % N, tj = (t / N) | 0; let best = -1;
    for (let r = 1; r < 6 && best < 0; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const k = (tj + dj) * N + ti + di; if (!isBlocked(k)) { best = k; break; } }
    if (best < 0) return null; t = best;
  }
  cur++; const open = new Heap();
  const ti = t % N, tj = (t / N) | 0;
  const hfn = (k) => { const dx = Math.abs(k % N - ti), dz = Math.abs(((k / N) | 0) - tj); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  stamp[s] = cur; g[s] = 0; came[s] = -1; open.push(s, hfn(s));
  let it = 0, found = false;
  while (open.size && it++ < maxIter) {
    const [k] = open.pop();
    if (k === t) { found = true; break; }
    const ki = k % N, kj = (k / N) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ki + di, nj = kj + dj; if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue;
      const nk = nj * N + ni; if (blocked[nk]) continue;
      if (di && dj && (blocked[kj * N + ni] || blocked[nj * N + ki])) continue; // no corner cutting
      const ng = g[k] + (di && dj ? 1.414 : 1);
      if (stamp[nk] !== cur || ng < g[nk]) { stamp[nk] = cur; g[nk] = ng; came[nk] = k; open.push(nk, ng + hfn(nk)); }
    }
  }
  if (!found) return null;
  const raw = []; for (let k = t; k !== -1; k = came[k]) raw.push({ x: (k % N) * CELL + X0 + 0.5, z: ((k / N) | 0) * CELL + Z0 + 0.5 });
  raw.reverse();
  // string-pulling
  const out = []; let a = { x: from.x, z: from.z };
  let i = 0;
  while (i < raw.length) {
    let j = raw.length - 1;
    while (j > i && !navClear(a.x, a.z, raw[j].x, raw[j].z)) j--;
    out.push(raw[j]); a = raw[j]; i = j + 1;
  }
  out[out.length - 1] = { x: to.x, z: to.z };
  if (isBlocked(idx(to.x, to.z))) out[out.length - 1] = raw[raw.length - 1];
  return out;
}
// the nav grid as a map layer: true where a wall, building or deep water blocks the way
export function blockedAt(x, z) { if (!blocked) return false; return isBlocked(idx(x, z)); }
