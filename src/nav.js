import { resolve } from './collision.js';
import { WORLD } from './terrain.js';

// Grid navigation: 1m cells, A* with octile heuristic + line-of-sight smoothing.
const CELL = 1, N = Math.floor(WORLD / CELL), HALF = WORLD / 2;
let blocked = null;

export function buildNav() {
  blocked = new Uint8Array(N * N);
  const p = { x: 0, z: 0 };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    p.x = i * CELL - HALF + 0.5; p.z = j * CELL - HALF + 0.5;
    const ox = p.x, oz = p.z;
    resolve(p, 0.55);
    if (Math.hypot(p.x - ox, p.z - oz) > 0.05) blocked[j * N + i] = 1;
  }
}
const idx = (x, z) => { const i = Math.floor((x + HALF) / CELL), j = Math.floor((z + HALF) / CELL); return (i < 0 || j < 0 || i >= N || j >= N) ? -1 : j * N + i; };
const isBlocked = (k) => k < 0 || blocked[k] === 1;

export function navClear(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.5);
  for (let s = 1; s <= n; s++) { const t = s / n; if (isBlocked(idx(ax + (bx - ax) * t, az + (bz - az) * t))) return false; }
  return true;
}

// simple binary heap
class Heap { constructor() { this.a = []; } push(k, f) { const a = this.a; a.push([k, f]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][1] <= a[i][1]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l][1] < a[m][1]) m = l; if (r < a.length && a[r][1] < a[m][1]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } get size() { return this.a.length; } }

const g = new Float32Array(N * N), came = new Int32Array(N * N), stamp = new Uint32Array(N * N); let cur = 1;
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
      const ni = ki + di, nj = kj + dj; if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
      const nk = nj * N + ni; if (blocked[nk]) continue;
      if (di && dj && (blocked[kj * N + ni] || blocked[nj * N + ki])) continue; // no corner cutting
      const ng = g[k] + (di && dj ? 1.414 : 1);
      if (stamp[nk] !== cur || ng < g[nk]) { stamp[nk] = cur; g[nk] = ng; came[nk] = k; open.push(nk, ng + hfn(nk)); }
    }
  }
  if (!found) return null;
  const raw = []; for (let k = t; k !== -1; k = came[k]) raw.push({ x: (k % N) * CELL - HALF + 0.5, z: ((k / N) | 0) * CELL - HALF + 0.5 });
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
