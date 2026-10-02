import * as THREE from 'three';
import { createTerrain, setBridge, heightAt, canalX, CANAL_W, roadDist, fertility, SITES, WORLD, ROADS } from './terrain.js';
import { createCanal } from './water.js';
import { colliders, house, suq, caravanserai, greatArch, palaceVault, kiln, roundCity, mats } from './buildings.js';
import { palms, grassField, rocks, shrubs, wind, acacias, reeds } from './vegetation.js';
import { lanternPost, firePit, tent, jar, crate, marketStall, cart, brickStack, deadTree, banner, bridge, waterwheel } from './props.js';
import { mulberry32 } from './noise.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Collapse a static group's meshes into one mesh per material (huge draw-call savings).
export function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMat = new Map(); const keep = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    if (o.userData.noMerge) { keep.push(o); return; }
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone());
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const key = o.material.uuid + (o.castShadow ? 's' : 'n');
    if (!byMat.has(key)) byMat.set(key, { mat: o.material, cast: o.castShadow, geos: [] });
    byMat.get(key).geos.push(g);
  });
  const userData = group.userData;
  for (const c of [...group.children]) group.remove(c);
  for (const { mat, cast, geos } of byMat.values()) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat); m.castShadow = cast; m.receiveShadow = true; group.add(m);
  }
  for (const k of keep) group.add(k);
  group.userData = userData;
  return group;
}

let OCC = null, CULL = null;
function place(scene, obj, x, z, rotY = 0, addCols = true, occ = false) {
  obj.position.set(x, heightAt(x, z), z); obj.rotation.y = rotY; scene.add(obj);
  CULL?.push(obj);
  if (obj.isGroup && !obj.userData.dynamic) mergeStatic(obj);
  if (occ && OCC) OCC.push(obj);
  if (addCols && obj.userData.colliders) {
    const c = Math.cos(rotY), s = Math.sin(rotY);
    for (const col of obj.userData.colliders) {
      const wx = x + col.x * c + col.z * s, wz = z - col.x * s + col.z * c;
      colliders.push({ ...col, x: wx, z: wz, rot: (col.rot || 0) + rotY });
    }
  }
  return obj;
}

function blocked(x, z, pad = 0) {
  for (const c of colliders) {
    if (c.type === 'circle') { if (Math.hypot(x - c.x, z - c.z) < c.r + pad) return true; }
    else {
      const cs = Math.cos(c.rot || 0), sn = Math.sin(c.rot || 0);
      const dx = x - c.x, dz = z - c.z;
      const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      if (Math.abs(lx) < c.hw + pad && Math.abs(lz) < c.hd + pad) return true;
    }
  }
  return false;
}

export function buildWorld(scene) {
  const rnd = mulberry32(2024);
  const out = { fires: [], updaters: [], lanterns: [], occluders: [] };

  OCC = out.occluders; CULL = out.cullables = [];
  const sunDir = new THREE.Vector3(-0.55, 0.62, 0.35).normalize();
  out.sunDir = sunDir;
  scene.add(createTerrain());
  const canal = out.canal = createCanal(sunDir); scene.add(canal); out.updaters.push((t) => canal.update(t, scene));

  // ---------------- village
  const V = SITES.village;
  place(scene, suq(), V.x + 2, V.z - 6, 0, true, true);
  const houseSpots = [[-14, 8, 0.1], [-13, 18, -0.05], [-4, 22, Math.PI], [8, 22, Math.PI + 0.1], [17, 14, -Math.PI / 2], [18, 3, -Math.PI / 2], [-16, -2, Math.PI / 2], [20, -10, -Math.PI / 2], [-6, 32, Math.PI], [12, 32, Math.PI]];
  for (const [dx, dz, r] of houseSpots) {
    const w = 4 + rnd() * 3, d = 4 + rnd() * 2.5, h = 3.2 + rnd() * 2.2;
    const hs = house(rnd, w, d, h);
    const x = V.x + dx, z = V.z + dz;
    place(scene, hs, x, z, r, false, true);
    colliders.push({ type: 'box', x, z, hw: w / 2 + 0.2, hd: d / 2 + 0.3, rot: r });
  }
  const stallCols = ['#8c2f24', '#2f5d7c', '#c28a2c', '#5a7d3a'];
  [[-4, 12, 0.2], [3, 13, -0.1], [-8, 2, Math.PI / 2]].forEach(([dx, dz, r], i) => {
    place(scene, marketStall(stallCols[i % 4]), V.x + dx, V.z + dz, r, false);
    colliders.push({ type: 'box', x: V.x + dx, z: V.z + dz, hw: 1.6, hd: 0.8, rot: r });
  });
  place(scene, cart(), V.x + 8, V.z + 9, 0.7, false); colliders.push({ type: 'circle', x: V.x + 8, z: V.z + 9, r: 1.3 });
  for (let i = 0; i < 14; i++) {
    const x = V.x + (rnd() - 0.5) * 36, z = V.z + (rnd() - 0.5) * 36;
    if (blocked(x, z, 0.8) || roadDist(x, z) < 2.5) continue;
    const o = rnd() > 0.4 ? jar([0xa8643c, 0x8c5a3a, 0xb98a5e][i % 3], 0.8 + rnd() * 0.5) : crate();
    place(scene, o, x, z, rnd() * 6, false); colliders.push({ type: 'circle', x, z, r: 0.5 });
  }
  // lanterns along the village road
  const lanternSpots = [[V.x - 5, V.z + 6], [V.x + 6, V.z + 18], [V.x - 3, V.z - 22], [V.x + 4, V.z + 2]];
  for (const [x, z] of lanternSpots) { const l = place(scene, lanternPost(), x, z, rnd() * 6, false); out.lanterns.push(l); }

  // ---------------- canal side: bridge, waterwheel (noria)
  const bz = -6, bx = canalX(bz);
  const dxdz = canalX(bz + 0.5) - canalX(bz - 0.5);
  place(scene, bridge(13), bx, bz, 0, false).position.y = 0.0;
  setBridge(bx, bz, 13, 3.4, 0.0);
  const ww = waterwheel(); place(scene, ww, canalX(40) + 0.5, 40, Math.PI / 2, false);
  out.updaters.push((t) => { ww.userData.wheel.rotation.z = t * 0.5; });
  colliders.push({ type: 'circle', x: canalX(40), z: 40, r: 1.6 });

  // bridge parapets keep walkers on the deck
  for (const sz of [-1.9, 1.9]) colliders.push({ type: 'box', x: bx, z: bz + sz, hw: 6.2, hd: 0.2 });
  // canal is impassable except at the bridge (segments of circles)
  for (let z = -WORLD / 2; z < WORLD / 2; z += 2.5) {
    if (Math.abs(z - bz) < 4.8) continue;
    colliders.push({ type: 'circle', x: canalX(z), z, r: CANAL_W * 0.45, canal: true });
  }

  // ---------------- caravanserai bandit camp
  const S = SITES.serai;
  place(scene, caravanserai(rnd), S.x, S.z, 0, true, true);
  for (const [dx, dz, r, c] of [[-8, -6, 0.3, '#2a2420'], [7, -7, -0.4, '#3a1c18'], [-9, 6, 2.6, '#2a2420']]) {
    place(scene, tent(c), S.x + dx, S.z + dz, r, false); colliders.push({ type: 'box', x: S.x + dx, z: S.z + dz, hw: 3, hd: 2.3, rot: r });
  }
  for (const [dx, dz] of [[0, 8], [3, -2], [24, 16]]) {
    const f = place(scene, firePit(), S.x + dx, S.z + dz, 0, false);
    out.fires.push({ pos: f.position.clone().add(new THREE.Vector3(0, 0.3, 0)), intensity: 1.0 });
    colliders.push({ type: 'circle', x: S.x + dx, z: S.z + dz, r: 1.1 });
  }
  for (const [dx, dz] of [[-4, 20], [4, 20], [10, -12]]) place(scene, banner('#151515'), S.x + dx, S.z + dz, rnd() * 6, false);
  for (let i = 0; i < 10; i++) { const x = S.x + (rnd() - 0.5) * 26, z = S.z + (rnd() - 0.5) * 26; if (!blocked(x, z, 0.8)) { place(scene, rnd() > 0.5 ? crate() : jar(0x7a5a3a), x, z, rnd() * 6, false); colliders.push({ type: 'circle', x, z, r: 0.5 }); } }

  // ---------------- brick kilns & clay quarry (with the ruined Sasanian vault the deserters hide in)
  const G = SITES.kiln;
  place(scene, palaceVault(), G.x - 4, G.z - 8, 0.3, true, true);
  for (const [dx, dz] of [[9, -4], [-12, 6], [6, 9]]) {
    const ry = rnd() * 6, k = kiln(), chim = k.userData.chimney.clone(), mouth = k.userData.mouth.clone();
    place(scene, k, G.x + dx, G.z + dz, ry, true, true);
    const rot = (v) => v.applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(k.position);
    (out.kilns = out.kilns || []).push({ chimney: rot(chim), mouth: rot(mouth) });
    out.fires.push({ pos: rot(k.userData.mouth.clone().setY(0.5)), intensity: 0.5, kiln: true });
  }
  for (let i = 0; i < 26; i++) {
    const x = G.x + (rnd() - 0.5) * 34, z = G.z + (rnd() - 0.5) * 30;
    if (blocked(x, z, 1.4) || roadDist(x, z) < 2) continue;
    place(scene, brickStack(rnd), x, z, rnd() * 6, false);
    colliders.push({ type: 'circle', x, z, r: 0.9 });
  }
  for (let i = 0; i < 6; i++) { const x = G.x + (rnd() - 0.5) * 40, z = G.z + (rnd() - 0.5) * 36; if (!blocked(x, z, 1.5)) { place(scene, deadTree(rnd), x, z, rnd() * 6, false); colliders.push({ type: 'circle', x, z, r: 0.5 }); } }

  // ---------------- great arch boss arena
  const A = SITES.arch;
  place(scene, greatArch(), A.x, A.z - 10, 0, true, true);
  // tall braziers on stone pillars
  const stoneM = mats().stone, bronze = new THREE.MeshStandardMaterial({ color: 0x8a5a2a, metalness: 0.9, roughness: 0.4 });
  for (const [dx, dz] of [[-11, 7], [11, 7], [-11, -9], [11, -9], [-6, 12], [6, 12]]) {
    const g = new THREE.Group();
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.2, 10).translate(0, 1.1, 0), stoneM); col.castShadow = true; g.add(col);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.35, 0.45, 12, 1, true).translate(0, 2.4, 0), bronze); bowl.castShadow = true; g.add(bowl);
    g.add(new THREE.Mesh(new THREE.CircleGeometry(0.62, 12).rotateX(-Math.PI / 2).translate(0, 2.5, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.45, 0.1), toneMapped: false })));
    place(scene, g, A.x + dx, A.z + dz, 0, false);
    colliders.push({ type: 'circle', x: A.x + dx, z: A.z + dz, r: 0.6 });
    out.fires.push({ pos: g.position.clone().add(new THREE.Vector3(0, 2.55, 0)), intensity: 0.75, boss: true });
  }
  // broken columns & fallen drums around the arena
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + 0.3, r = 15 + rnd() * 4;
    const x = A.x + Math.cos(a) * r, z = A.z - 2 + Math.sin(a) * r;
    if (blocked(x, z, 1.5)) continue;
    const h = 1 + rnd() * 3.5;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, h, 12).translate(0, h / 2, 0), stoneM); c.castShadow = true; c.receiveShadow = true;
    c.position.set(x, heightAt(x, z), z); c.rotation.z = (rnd() - 0.5) * 0.15; scene.add(c);
    colliders.push({ type: 'circle', x, z, r: 0.7 });
    if (rnd() > 0.4) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 12), stoneM); d.rotation.z = Math.PI / 2; d.rotation.y = rnd() * 3; d.position.set(x + 1.6, heightAt(x + 1.6, z) + 0.5, z + 0.8); d.castShadow = true; scene.add(d); }
  }

  // ---------------- distant Baghdad (north, beyond the dunes)
  const city = roundCity(); city.position.set(-90, 4, -300); city.scale.setScalar(1.5); scene.add(city);
  // far desert plain out to the horizon (beyond the playable terrain)
  const farG = new THREE.RingGeometry(WORLD * 0.45, 1200, 64, 4).rotateX(-Math.PI / 2);
  const fp = farG.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i), r = Math.hypot(x, z); fp.setY(i, 5 + Math.sin(x * 0.02) * Math.cos(z * 0.017) * 6 * Math.min(1, (r - WORLD * 0.45) / 60) - 3); }
  farG.computeVertexNormals();
  const far = new THREE.Mesh(farG, new THREE.MeshStandardMaterial({ color: 0xb08458, roughness: 1 }));
  far.receiveShadow = false; scene.add(far);

  // ---------------- vegetation scatter
  const palmPts = [], grassPts = [], wheatPts = [], rockPts = [], shrubPts = [];
  for (let i = 0; i < 26000; i++) {
    const x = (rnd() - 0.5) * (WORLD - 10), z = (rnd() - 0.5) * (WORLD - 10);
    const f = fertility(x, z), rd = roadDist(x, z), cd = Math.abs(x - canalX(z));
    if (cd < CANAL_W * 0.6 || rd < 2.2 || (Math.abs(z - bz) < 2.6 && Math.abs(x - bx) < 8)) continue;
    let inSite = false; for (const s of Object.values(SITES)) if (Math.hypot(x - s.x, z - s.z) < s.r * 0.85) inSite = true;
    const y = heightAt(x, z);
    const r = rnd();
    if (palmPts.length < 220 && f > 0.35 && r < 0.035 && !inSite && cd > CANAL_W * 0.75 && !blocked(x, z, 1)) { palmPts.push({ x, y, z }); colliders.push({ type: 'circle', x, z, r: 0.45 }); continue; }
    if (f > 0.55 && !inSite && r < 0.5 && cd > 12 && x > canalX(z) && Math.sin(x * 0.11) * Math.cos(z * 0.09) > 0.15) { wheatPts.push({ x, y, z }); continue; }
    if (f > 0.25 && r < 0.6 && grassPts.length < 9000 && !blocked(x, z, 0.2)) { grassPts.push({ x, y, z }); continue; }
    if (f < 0.4 && r < 0.035 && !inSite) { shrubPts.push({ x, y, z }); continue; }
    if (r < 0.025 && !inSite && !blocked(x, z, 0.5)) rockPts.push({ x, y: y - 0.1, z });
  }
  // dense reeds/grass hugging the canal banks
  for (let z = -WORLD / 2; z < WORLD / 2; z += 0.6) for (const s of [-1, 1]) {
    const x = canalX(z) + s * (CANAL_W * 0.55 + rnd() * 2.2);
    if (rnd() < 0.8 && roadDist(x, z) > 2.5 && Math.abs(z - bz) > 2.6) grassPts.push({ x, y: heightAt(x, z), z });
  }
  // rocks scattered heavily in the desert edges & near the arch
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2, r = 60 + rnd() * 70;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    let near = false; for (const st of Object.values(SITES)) if (Math.hypot(x - st.x, z - st.z) < st.r * 1.25) near = true;
    if (!near && roadDist(x, z) > 4 && Math.abs(x) < WORLD / 2 - 4 && Math.abs(z) < WORLD / 2 - 4) rockPts.push({ x, y: heightAt(x, z) - 0.2, z, s: 0.5 + rnd() * 2.5 });
  }
  const palmGrp = palms(palmPts, 5); scene.add(palmGrp); out.occluders.push(palmGrp);
  if (wheatPts.length) scene.add(grassField(wheatPts, 'wheat', 6));
  scene.add(grassField(grassPts, 'grass', 7));
  scene.add(rocks(rockPts, 8));
  // small pebbles & stones littering the ground
  const pebbles = [];
  for (let i = 0; i < 5000; i++) {
    const x = (rnd() - 0.5) * (WORLD - 20), z = (rnd() - 0.5) * (WORLD - 20);
    if (Math.abs(x - canalX(z)) < CANAL_W * 0.7) continue;
    const rd = roadDist(x, z);
    if (rnd() < (rd < 4 ? 0.9 : 0.35)) pebbles.push({ x, y: heightAt(x, z) - 0.03, z, s: 0.06 + rnd() * 0.16 });
  }
  const peb = rocks(pebbles, 21, 0xe8dccb); peb.castShadow = false; scene.add(peb);
  scene.add(shrubs(shrubPts, 9));
  for (const p of rockPts) if ((p.s || 0) > 1.4) colliders.push({ type: 'circle', x: p.x, z: p.z, r: p.s * 0.8 });
  // acacias dotting the semi-arid land between the fields and the dunes
  const acPts = [];
  for (let i = 0; i < 4000 && acPts.length < 40; i++) {
    const x = (rnd() - 0.5) * (WORLD - 30), z = (rnd() - 0.5) * (WORLD - 30);
    const f = fertility(x, z); if (f > 0.35 || f < 0.05 || roadDist(x, z) < 5) continue;
    let near = false; for (const st of Object.values(SITES)) if (Math.hypot(x - st.x, z - st.z) < st.r * 1.1) near = true;
    if (near || blocked(x, z, 2.5)) continue;
    acPts.push({ x, y: heightAt(x, z), z }); colliders.push({ type: 'circle', x, z, r: 0.4 });
  }
  const acG = acacias(acPts); scene.add(acG); out.occluders.push(acG);
  // reeds hugging the water line
  const reedPts = [];
  for (let z = -WORLD / 2 + 4; z < WORLD / 2 - 4; z += 0.9) for (const sd of [-1, 1]) {
    if (rnd() > 0.55 || Math.abs(z - bz) < 4) continue;
    const x = canalX(z) + sd * (CANAL_W * 0.42 + rnd() * 0.9);
    reedPts.push({ x, y: Math.max(heightAt(x, z), -0.6), z });
  }
  scene.add(reeds(reedPts));
  // roadside ruins: broken mud-brick wall stubs and fallen blocks
  const M = mats();
  for (let i = 0; i < 2000 && i < 9999; i++) {
    const r0 = ROADS[Math.floor(rnd() * ROADS.length)], k = Math.floor(rnd() * (r0.length - 1));
    const t = rnd(), ax = r0[k][0] + (r0[k + 1][0] - r0[k][0]) * t, az = r0[k][1] + (r0[k + 1][1] - r0[k][1]) * t;
    const ang = Math.atan2(r0[k + 1][1] - r0[k][1], r0[k + 1][0] - r0[k][0]);
    const side = rnd() < 0.5 ? -1 : 1, off = 6 + rnd() * 5;
    const x = ax - Math.sin(ang) * off * side, z = az + Math.cos(ang) * off * side;
    let near = false; for (const st of Object.values(SITES)) if (Math.hypot(x - st.x, z - st.z) < st.r * 1.2) near = true;
    if (near || blocked(x, z, 3) || Math.abs(x - canalX(z)) < 9) continue;
    const g = new THREE.Group();
    const len = 3 + rnd() * 4, h = 0.8 + rnd() * 2.2;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.7).translate(0, h / 2, 0), M.mud);
    g.add(wall);
    const stub = new THREE.Mesh(new THREE.BoxGeometry(0.7, h * 0.6, 2 + rnd() * 2).translate(len / 2 - 0.35, h * 0.3, 1), M.mud); g.add(stub);
    for (let b = 0; b < 5; b++) { const s = 0.3 + rnd() * 0.5; const bl = new THREE.Mesh(new THREE.BoxGeometry(s * 1.5, s * 0.6, s).rotateY(rnd() * 3).translate((rnd() - 0.5) * len, s * 0.25, 1 + rnd() * 1.5), M.mud); g.add(bl); }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    place(scene, g, x, z, -ang + (rnd() - 0.5) * 0.3, false, true);
    colliders.push({ type: 'box', x, z, hw: len / 2, hd: 0.5, rot: -ang });
    if (out.ruinCount = (out.ruinCount || 0) + 1, out.ruinCount >= 14) break;
  }

  clutter(scene, rnd, out);
  out.updaters.push((t) => { wind.uTime.value = t; });
  tileInstances(scene);
  out.update = (t, dt) => { for (const u of out.updaters) u(t, dt); };
  // zone streaming (lite): placed props and buildings beyond view range are hidden, so they cost neither draw calls nor shadow passes
  for (const o of CULL) { const b = new THREE.Box3().setFromObject(o); o.userData.cullR = b.getSize(new THREE.Vector3()).length() / 2; }
  out.cull = (focus, range = 95) => { for (const o of CULL) o.visible = Math.hypot(o.position.x - focus.x, o.position.z - focus.z) - o.userData.cullR < range; };
  return out;
}

export { colliders, blocked };

// ---------------------------------------------------------------- vegetation streaming
// Whole-map instanced batches (grass, pebbles, rocks, palms) are split into 36 m tiles, so the frustum test drops
// everything off-screen in both the main and the shadow pass.
function tileInstances(root, T = 36) {
  const list = []; root.traverse((o) => { if (o.isInstancedMesh && o.count > 120) list.push(o); });
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), col = new THREE.Color();
  for (const im of list) {
    const tiles = new Map();
    for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, m); p.setFromMatrixPosition(m); const k = Math.floor(p.x / T) + ',' + Math.floor(p.z / T); if (!tiles.has(k)) tiles.set(k, []); tiles.get(k).push(i); }
    if (tiles.size < 2) continue;
    const parent = im.parent;
    for (const idx of tiles.values()) {
      const t = new THREE.InstancedMesh(im.geometry, im.material, idx.length);
      idx.forEach((src, j) => { im.getMatrixAt(src, m); t.setMatrixAt(j, m); if (im.instanceColor) { im.getColorAt(src, col); t.setColorAt(j, col); } });
      Object.assign(t, { castShadow: im.castShadow, receiveShadow: im.receiveShadow, customDepthMaterial: im.customDepthMaterial, customDistanceMaterial: im.customDistanceMaterial, renderOrder: im.renderOrder, frustumCulled: true });
      t.position.copy(im.position); t.quaternion.copy(im.quaternion); t.scale.copy(im.scale); t.userData = im.userData;
      t.computeBoundingSphere(); parent.add(t);
    }
    parent.remove(im);
  }
}

// ---------------------------------------------------------------- environment dressing
// Instanced clutter around the inhabited sites (sacks, baskets, shards, straw, rope) and soot/stain decals.
function clutter(scene, rnd, out) {
  const kinds = {
    sack: { geo: new THREE.SphereGeometry(0.32, 8, 6).scale(1, 0.75, 0.8).translate(0, 0.2, 0), mat: new THREE.MeshStandardMaterial({ color: 0xb8a078, roughness: 1 }) },
    basket: { geo: new THREE.CylinderGeometry(0.32, 0.24, 0.34, 10, 1, true).translate(0, 0.17, 0), mat: new THREE.MeshStandardMaterial({ color: 0x9a7a48, roughness: 1, side: THREE.DoubleSide }) },
    shard: { geo: new THREE.BoxGeometry(0.22, 0.03, 0.14), mat: new THREE.MeshStandardMaterial({ color: 0xa8643c, roughness: 0.9 }) },
    straw: { geo: new THREE.ConeGeometry(0.6, 0.45, 9).translate(0, 0.2, 0), mat: new THREE.MeshStandardMaterial({ color: 0xc8a860, roughness: 1 }) },
    rope: { geo: new THREE.TorusGeometry(0.2, 0.05, 5, 12).rotateX(Math.PI / 2).translate(0, 0.05, 0), mat: new THREE.MeshStandardMaterial({ color: 0x8a6a40, roughness: 1 }) },
  };
  const spots = { sack: [], basket: [], shard: [], straw: [], rope: [] };
  const mix = { village: ['sack', 'basket', 'basket', 'shard', 'straw', 'rope'], serai: ['sack', 'shard', 'shard', 'straw', 'rope'], kiln: ['shard', 'shard', 'shard', 'straw', 'sack'] };
  for (const [site, list] of Object.entries(mix)) {
    const S = SITES[site];
    for (let i = 0; i < 220; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * S.r * 1.05, x = S.x + Math.cos(a) * r, z = S.z + Math.sin(a) * r;
      if (blocked(x, z, 0.3) || roadDist(x, z) < 1.6 || Math.abs(x - canalX(z)) < 6) continue;
      // cluster near walls and props: keep spots that are close to something solid
      if (!blocked(x, z, 2.2) && rnd() < 0.75) continue;
      const k = list[Math.floor(rnd() * list.length)];
      spots[k].push([x, heightAt(x, z), z, rnd() * 6, 0.7 + rnd() * 0.6]);
    }
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (const [k, list] of Object.entries(spots)) {
    if (!list.length) continue;
    const im = new THREE.InstancedMesh(kinds[k].geo, kinds[k].mat, list.length);
    list.forEach(([x, y, z, r, s], i) => { q.setFromAxisAngle(up, r); m4.compose(ps.set(x, y, z), q, sc.setScalar(s)); im.setMatrixAt(i, m4); });
    im.castShadow = k !== 'shard'; im.receiveShadow = true; scene.add(im);
  }
  // soot and stains: dark blotches round fire pits and kilns, dark wheel ruts at the village gate
  const blot = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  const pts = [];
  for (const f of out.fires) pts.push([f.pos.x, f.pos.z, 2.4 + rnd()]);
  for (let i = 0; i < 40; i++) { const S = Object.values(SITES)[i % 4]; const a = rnd() * 6.28, r = rnd() * S.r; pts.push([S.x + Math.cos(a) * r, S.z + Math.sin(a) * r, 0.6 + rnd() * 1.4]); }
  const g = new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2);
  const im = new THREE.InstancedMesh(g, blot, pts.length);
  pts.forEach(([x, z, s], i) => { m4.compose(ps.set(x, heightAt(x, z) + 0.035, z), q.identity(), sc.set(s, 1, s * (0.6 + rnd() * 0.5))); im.setMatrixAt(i, m4); });
  im.renderOrder = 1; scene.add(im);
}
