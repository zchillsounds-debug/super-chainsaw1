import * as THREE from 'three';

// Sculpted character geometry persisted in IndexedDB, so a second visit skips the slow SDF meshing.
// Key = piece key + VERSION; bump VERSION whenever sculpt.js / human.js change what they produce.
const VERSION = 'r21.0';
const DB = 'sob-geo', STORE = 'geo';
const loaded = new Map(), fresh = new Map();
let db = null;

function open() {
  return new Promise((res) => {
    try {
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore(STORE);
      rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null);
    } catch { res(null); }
  });
}
export async function preloadGeo() {
  db = await Promise.race([open(), new Promise((r) => setTimeout(() => r(null), 1500))]);
  if (!db) return 0;
  await new Promise((res) => {
    try {
      const tx = db.transaction(STORE, 'readonly'), st = tx.objectStore(STORE), rq = st.openCursor();
      rq.onsuccess = () => { const c = rq.result; if (!c) return res(); if (String(c.key).endsWith('@' + VERSION)) loaded.set(String(c.key).split('@')[0], c.value); c.continue(); };
      rq.onerror = () => res();
    } catch { res(); }
  });
  return loaded.size;
}
const ATTRS = ['position', 'normal', 'skinIndex', 'skinWeight', 'aMat'];
export function cachedGeo(key, make) {
  const v = loaded.get(key);
  if (v) {
    const g = new THREE.BufferGeometry();
    for (const a of ATTRS) if (v[a]) g.setAttribute(a, new THREE.BufferAttribute(v[a].array, v[a].size));
    g.setIndex(new THREE.BufferAttribute(v.index, 1)); g.computeBoundingSphere();
    return g;
  }
  const g = make(); fresh.set(key, g); return g;
}
// write the pieces sculpted this session (call once loading is done)
export function flushGeo() {
  if (!db || !fresh.size) return;
  try {
    const tx = db.transaction(STORE, 'readwrite'), st = tx.objectStore(STORE);
    for (const [k, g] of fresh) {
      const v = { index: g.index.array };
      for (const a of ATTRS) { const at = g.getAttribute(a); if (at) v[a] = { array: at.array, size: at.itemSize }; }
      st.put(v, k + '@' + VERSION);
    }
    fresh.clear();
  } catch { /* quota or private mode: no cache */ }
}
