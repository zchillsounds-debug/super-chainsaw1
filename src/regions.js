import * as THREE from 'three';
import { emberBed } from './ember.js';
import { heightAt, canalX, CANAL_W, roadDist, SITES, WORLD, ROADS, WATER_Y, DEEP_Y, setBridge } from './terrain.js';
import { colliders, house, roundCity, mats } from './buildings.js';
import { palms, grassField, rocks, shrubs, reeds, tallReeds } from './vegetation.js';
import { lanternPost, firePit, tent, jar, crate, marketStall, banner, bridge, deadTree, cart } from './props.js';
import { mudhif, mashuf, fishRack, netPoles, reedStack, weir, burnedHouse, burnedStall, beamPile, paperStack, warraqShop, scholarTable, bookShelf, pyre, compoundWall, awning, cityWall, wellHead } from './regionprops.js';
import { place, blocked, mergeStatic } from './world.js';

// Round 15: the two new regions. Each builder dresses its sites and scatters its vegetation; buildWorld does the
// rest (terrain, water, chunk merging, culling) exactly as for the Sawad.

const inSite = (x, z, k = 0.9) => Object.values(SITES).some((s) => Math.hypot(x - s.x, z - s.z) < s.r * k);
const inBounds = (x, z, m = 128) => Math.abs(x) < m && Math.abs(z) < m;
const col = (o) => o; // readability: place() adds userData.colliders itself

function brazier(scene, out, x, z, boss = true) {
  const stoneM = mats().stone, bronze = new THREE.MeshStandardMaterial({ color: 0x8a5a2a, metalness: 0.9, roughness: 0.4 });
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.2, 10).translate(0, 1.1, 0), stoneM); c.castShadow = true; g.add(c);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.35, 0.45, 12, 1, true).translate(0, 2.4, 0), bronze); bowl.castShadow = true; g.add(bowl);
  g.add(new THREE.Mesh(new THREE.CircleGeometry(0.62, 12).rotateX(-Math.PI / 2).translate(0, 2.5, 0), emberBed()));
  place(scene, g, x, z, 0, false);
  colliders.push({ type: 'circle', x, z, r: 0.6 });
  out.fires.push({ pos: g.position.clone().add(new THREE.Vector3(0, 2.55, 0)), intensity: 0.75, boss });
}
function fire(scene, out, x, z, k = 1) {
  const f = place(scene, firePit(), x, z, 0, false);
  out.fires.push({ pos: f.position.clone().add(new THREE.Vector3(0, 0.3, 0)), intensity: k });
  colliders.push({ type: 'circle', x, z, r: 1.1 });
}
function lantern(scene, out, x, z, rnd) { const l = place(scene, lanternPost(), x, z, rnd() * 6, false); out.lanterns.push(l); }
function scatterJars(scene, rnd, S, n, spread, kinds = ['jar', 'crate']) {
  for (let i = 0; i < n; i++) {
    const x = S.x + (rnd() - 0.5) * spread, z = S.z + (rnd() - 0.5) * spread;
    if (blocked(x, z, 0.8) || roadDist(x, z) < 2.5) continue;
    const k = kinds[Math.floor(rnd() * kinds.length)];
    const o = k === 'jar' ? jar([0xa8643c, 0x8c5a3a, 0xb98a5e][i % 3], 0.8 + rnd() * 0.5) : k === 'paper' ? paperStack(rnd, rnd() < 0.4) : crate();
    place(scene, o, x, z, rnd() * 6, false); colliders.push({ type: 'circle', x, z, r: 0.5 });
  }
}
// far ground ring beyond the playable map
function farRing(scene, color, y = -3, amp = 6) {
  const farG = new THREE.RingGeometry(WORLD * 0.45, 1200, 64, 4).rotateX(-Math.PI / 2), fp = farG.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i), r = Math.hypot(x, z); fp.setY(i, y + Math.sin(x * 0.02) * Math.cos(z * 0.017) * amp * Math.min(1, (r - WORLD * 0.45) / 60)); }
  farG.computeVertexNormals();
  scene.add(new THREE.Mesh(farG, new THREE.MeshStandardMaterial({ color, roughness: 1 })));
}

// ================================================================== Act IV: the Nahrawan marshes
export function buildMarsh(scene, rnd, out) {
  out.boats = [];
  const boat = (x, z, ry, afloat = true) => {
    const b = mashuf(4.6 + rnd() * 1.4); b.userData.dynamic = true;
    place(scene, b, x, z, ry, false);
    if (afloat) { b.position.y = WATER_Y - 0.2; out.boats.push({ m: b, ph: rnd() * 6, y: b.position.y }); } else { b.rotation.z = 0.12; colliders.push({ type: 'circle', x, z, r: 0.9 }); }
    return b;
  };
  // moor a boat at the nearest water's edge to a point
  const moor = (x0, z0, r0 = 10) => {
    for (let k = 0; k < 40; k++) {
      const a = rnd() * 6.28, r = r0 * (0.6 + rnd() * 0.8), x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r, h = heightAt(x, z);
      if (h < WATER_Y - 0.25 && h > WATER_Y - 0.9 && !blocked(x, z, 1.5)) { const g = new THREE.Vector2(heightAt(x + 1, z) - heightAt(x - 1, z), heightAt(x, z + 1) - heightAt(x, z - 1)); return boat(x, z, Math.atan2(g.x, g.y) + Math.PI / 2); }
    }
    return null;
  };

  // ---------------- the fishing village (hub corner)
  const V = SITES.village;
  place(scene, mudhif(15, 6.4, 5.2), V.x, V.z - 19, 0, true, true);
  for (const [dx, dz, r, s] of [[-19, -12, 0.35, 0.62], [21, -9, -0.4, 0.6], [24, 16, Math.PI + 0.25, 0.55], [-21, 15, Math.PI - 0.3, 0.58]]) place(scene, mudhif(15 * s, 6.4 * s, 5.2 * s), V.x + dx, V.z + dz, r, true, true);
  for (const [dx, dz, r] of [[-12, 0, 0.2], [26, 2, -1.2]]) place(scene, col(fishRack(rnd)), V.x + dx, V.z + dz, r);
  for (const [dx, dz, r] of [[-15, 8, 1.1], [17, -2, -0.3]]) place(scene, col(netPoles()), V.x + dx, V.z + dz, r);
  for (const [dx, dz, r] of [[6, -10, 0.1], [-6, -8, -0.3]]) place(scene, col(reedStack(rnd)), V.x + dx, V.z + dz, r);
  place(scene, col(wellHead()), V.x - 1, V.z + 6.5, 0.3);
  fire(scene, out, V.x + 3, V.z - 3, 0.8);
  for (const [dx, dz] of [[-5, 4], [8, 10], [-3, -12], [14, -6]]) lantern(scene, out, V.x + dx, V.z + dz, rnd);
  scatterJars(scene, rnd, V, 16, 34, ['jar', 'jar', 'crate']);
  for (let i = 0; i < 6; i++) moor(V.x, V.z, 30);

  // ---------------- the reed camp (Marwan)
  const S = SITES.serai;
  for (const [dx, dz, r] of [[-8, -9, 0.4], [9, -8, -0.5], [-10, 8, 2.7]]) place(scene, mudhif(7.5, 3.8, 3.3), S.x + dx, S.z + dz, r, true, true);
  for (const [dx, dz, r, c] of [[8, 7, -2.6, '#2a2420'], [0, -14, 0.1, '#3a1c18']]) { place(scene, tent(c), S.x + dx, S.z + dz, r, false); colliders.push({ type: 'box', x: S.x + dx, z: S.z + dz, hw: 3, hd: 2.3, rot: r }); }
  fire(scene, out, S.x, S.z + 2); fire(scene, out, S.x + 5, S.z - 4, 0.7);
  for (const [dx, dz] of [[-4, 14], [6, 13], [12, -2]]) place(scene, banner('#151515'), S.x + dx, S.z + dz, rnd() * 6, false);
  for (const [dx, dz, r] of [[-14, 0, 1.3], [3, 12, 0.2]]) place(scene, col(reedStack(rnd)), S.x + dx, S.z + dz, r);
  scatterJars(scene, rnd, S, 10, 26);
  for (let i = 0; i < 4; i++) moor(S.x, S.z, 24);

  // ---------------- the fish racks: Rawh's boats, kept by Sahl
  const G = SITES.kiln;
  for (const [dx, dz, r] of [[-8, -6, 0.3], [-2, -9, 0.1], [5, -7, -0.2], [9, 2, 1.4], [-10, 5, 1.7], [2, 9, 0.05]]) place(scene, col(fishRack(rnd)), G.x + dx, G.z + dz, r);
  for (const [dx, dz, r] of [[-14, -2, 0.9], [13, 8, -0.8], [0, -15, 0.2], [14, -9, 2.2]]) place(scene, col(netPoles()), G.x + dx, G.z + dz, r);
  for (const [dx, dz, r] of [[4, 3, 0.4], [-4, 1, -0.9], [7, -1, 1.9], [-6, 11, 0.2]]) boat(G.x + dx, G.z + dz, r, false); // hauled up for caulking
  for (const [dx, dz, r] of [[16, -16, -0.6], [-16, -13, 0.7]]) place(scene, mudhif(7, 3.6, 3.1), G.x + dx, G.z + dz, r, true, true);
  fire(scene, out, G.x - 1, G.z - 2, 0.8);
  scatterJars(scene, rnd, G, 12, 28, ['jar', 'jar', 'crate']);
  for (let i = 0; i < 6; i++) moor(G.x, G.z, 24);

  // ---------------- the old weir (Rawh)
  const A = SITES.arch;
  place(scene, col(weir()), A.x + 1.5, A.z - 25, 0, true, true);
  for (const [dx, dz] of [[-12, 8], [12, 8], [-12, -10], [12, -10], [-6, 13], [6, 13]]) brazier(scene, out, A.x + dx, A.z + dz);
  for (const [dx, dz, r] of [[-17, 4, 1.4], [16, -3, -1.6]]) place(scene, col(reedStack(rnd)), A.x + dx, A.z + dz, r);
  for (const [dx, dz] of [[-5, -17], [7, -18], [18, 8]]) place(scene, banner('#151515'), A.x + dx, A.z + dz, rnd() * 6, false);
  scatterJars(scene, rnd, A, 10, 34, ['crate', 'crate', 'jar']);
  for (let i = 0; i < 5; i++) moor(A.x, A.z, 30);

  // ---------------- along the causeways: lone huts, racks and boats
  for (let i = 0, n = 0; i < 400 && n < 16; i++) {
    const r0 = ROADS[Math.floor(rnd() * ROADS.length)], k = Math.floor(rnd() * (r0.length - 1)), t = rnd();
    const ax = r0[k][0] + (r0[k + 1][0] - r0[k][0]) * t, az = r0[k][1] + (r0[k + 1][1] - r0[k][1]) * t, ang = Math.atan2(r0[k + 1][1] - r0[k][1], r0[k + 1][0] - r0[k][0]);
    const side = rnd() < 0.5 ? -1 : 1, off = 6 + rnd() * 6, x = ax - Math.sin(ang) * off * side, z = az + Math.cos(ang) * off * side;
    if (inSite(x, z, 1.25) || blocked(x, z, 3) || heightAt(x, z) < WATER_Y + 0.08 || !inBounds(x, z, 118)) continue;
    const kind = rnd();
    if (kind < 0.35) place(scene, mudhif(6 + rnd() * 2, 3.4, 3), x, z, -ang + Math.PI / 2 * side, true, true);
    else if (kind < 0.6) place(scene, col(fishRack(rnd)), x, z, -ang);
    else if (kind < 0.8) place(scene, col(reedStack(rnd)), x, z, rnd() * 3);
    else moor(x, z, 8);
    n++;
  }

  // ---------------- deep water is a wall: rings of colliders along every deep edge (arrows still fly over it)
  for (let z = -WORLD / 2 + 1; z < WORLD / 2; z += 2) for (let x = -WORLD / 2 + 1; x < WORLD / 2; x += 2) {
    if (heightAt(x, z) >= DEEP_Y) continue;
    if (heightAt(x + 2, z) >= DEEP_Y || heightAt(x - 2, z) >= DEEP_Y || heightAt(x, z + 2) >= DEEP_Y || heightAt(x, z - 2) >= DEEP_Y) colliders.push({ type: 'circle', x, z, r: 1.25, canal: true });
  }

  // ---------------- vegetation: giant reed beds, cattails at the water line, grass and a few palms on the islands
  const tall = [], cat = [], grass = [], palmPts = [], lily = [], rockPts = [];
  for (let i = 0; i < 70000; i++) {
    const x = (rnd() - 0.5) * (WORLD - 8), z = (rnd() - 0.5) * (WORLD - 8), h = heightAt(x, z), rd = roadDist(x, z);
    if (rd < 3.2 || inSite(x, z, 0.92)) { if (h > WATER_Y + 0.1 && rd > 2.6 && rnd() < 0.1 && grass.length < 9000 && !blocked(x, z, 0.3)) grass.push({ x, y: h, z }); continue; }
    const patch = Math.sin(x * 0.07 + Math.sin(z * 0.05) * 2) * Math.cos(z * 0.06 - x * 0.02);
    if (h < WATER_Y + 0.25 && h > WATER_Y - 0.7 && patch > -0.25 && tall.length < 5200 && rnd() < 0.55) { tall.push({ x, y: Math.max(h, WATER_Y - 0.5), z }); continue; }
    if (h < WATER_Y + 0.35 && h > WATER_Y - 0.25 && cat.length < 1800 && rnd() < 0.3) { cat.push({ x, y: Math.max(h, WATER_Y - 0.3), z }); continue; }
    if (h < WATER_Y - 0.3 && h > DEEP_Y - 0.4 && lily.length < 1600 && patch < -0.35 && rnd() < 0.4) { lily.push({ x, z }); continue; }
    if (h > WATER_Y + 0.1 && grass.length < 9000 && rnd() < 0.45 && !blocked(x, z, 0.2)) { grass.push({ x, y: h, z }); continue; }
    if (h > WATER_Y + 0.35 && palmPts.length < 60 && rnd() < 0.02 && !blocked(x, z, 1.5)) { palmPts.push({ x, y: h, z }); colliders.push({ type: 'circle', x, z, r: 0.45 }); continue; }
    if (h > WATER_Y + 0.2 && rockPts.length < 140 && rnd() < 0.01) rockPts.push({ x, y: h - 0.1, z });
  }
  // a wall of reeds round the horizon (beyond the playable map)
  for (let i = 0; i < 1400; i++) { const a = rnd() * 6.28, r = 126 + rnd() * 70, x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x) > 122 || Math.abs(z) > 122) tall.push({ x, y: WATER_Y - 0.3, z }); }
  const reedG = tallReeds(tall); scene.add(reedG);
  scene.add(reeds(cat));
  scene.add(grassField(grass, 'grass', 7));
  if (palmPts.length) { const pg = palms(palmPts, 5); scene.add(pg); out.occluders.push(pg); }
  if (rockPts.length) scene.add(rocks(rockPts, 8));
  // water-lily pads floating in the still shallows
  {
    const geo = new THREE.CircleGeometry(0.32, 9, 0.3, Math.PI * 1.85).rotateX(-Math.PI / 2);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x3a5a24, roughness: 0.4 }), lily.length * 3);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), ps = new THREE.Vector3(); let n = 0;
    for (const p of lily) for (let k = 0; k < 3; k++) { q.setFromAxisAngle(up, rnd() * 6.28); m4.compose(ps.set(p.x + (rnd() - 0.5) * 1.6, WATER_Y + 0.015, p.z + (rnd() - 0.5) * 1.6), q, sc.setScalar(0.7 + rnd() * 0.7)); im.setMatrixAt(n++, m4); }
    im.count = n; im.receiveShadow = true; scene.add(im);
  }
  // boats bob on the water
  out.updaters.push((t) => { for (const b of out.boats) { b.m.position.y = b.y + Math.sin(t * 1.3 + b.ph) * 0.03; b.m.rotation.z = Math.sin(t * 0.9 + b.ph) * 0.03; } });
}

// ================================================================== Act V: al-Karkh
export function buildKarkh(scene, rnd, out) {
  out.smokers = [];
  // ---------------- the Sarat canal, crossed by two bridges
  const bridges = [-20, 62];
  for (const bz of bridges) {
    const bx = canalX(bz);
    place(scene, bridge(13), bx, bz, 0, false).position.y = 0.0;
    setBridge(bx, bz, 13, 3.4, 0.0);
    for (const sz of [-1.9, 1.9]) colliders.push({ type: 'box', x: bx, z: bz + sz, hw: 6.2, hd: 0.2 });
  }
  for (let z = -WORLD / 2; z < WORLD / 2; z += 2.5) { if (bridges.some((bz) => Math.abs(z - bz) < 4.8)) continue; colliders.push({ type: 'circle', x: canalX(z), z, r: CANAL_W * 0.45, canal: true }); }

  // ---------------- the khan where the company lodges (hub corner)
  const V = SITES.village;
  place(scene, col(compoundWall(34)), V.x - 3, V.z - 17, 0, true, true);
  place(scene, col(compoundWall(32)), V.x - 20, V.z + 0, Math.PI / 2, true, true);
  place(scene, col(compoundWall(22, 3.6, 4)), V.x + 16, V.z + 5, Math.PI / 2, true, true);
  for (const [dx, dz, c, r] of [[10, -8, '#2f5d7c', 0.05], [-12, -9, '#8c2f24', -0.05], [-13, 5, '#c28a2c', 0]]) place(scene, awning(c, 5, 3.4), V.x + dx, V.z + dz, r, false);
  // the scholars' corner: shelves of codices and scrolls, tables with an astrolabe (the finale is played here)
  for (const [dx, dz, r] of [[-17.8, -4, Math.PI / 2], [-17.8, 1, Math.PI / 2]]) place(scene, col(bookShelf(rnd)), V.x + dx, V.z + dz, r);
  place(scene, col(scholarTable()), V.x - 12, V.z - 1.5, Math.PI / 2 + 0.1);
  place(scene, col(wellHead()), V.x - 1, V.z + 6.5, 0.3);
  fire(scene, out, V.x + 3, V.z - 4, 0.7);
  for (const [dx, dz] of [[-6, 2], [7, 9], [-2, -12], [13, -2]]) lantern(scene, out, V.x + dx, V.z + dz, rnd);
  scatterJars(scene, rnd, V, 14, 30);
  place(scene, cart(), V.x + 12, V.z + 10, 0.7, false); colliders.push({ type: 'circle', x: V.x + 12, z: V.z + 10, r: 1.3 });

  // ---------------- the burned suq ('Asim)
  const S = SITES.serai;
  for (let i = 0; i < 14; i++) {
    const row = i % 2 ? 1 : -1, k = Math.floor(i / 2), x = S.x + row * 6.5 + (rnd() - 0.5), z = S.z - 16 + k * 5;
    if (blocked(x, z, 1.5)) continue;
    const ry = Math.PI / 2 * row + (rnd() - 0.5) * 0.2;
    if (rnd() < 0.8) place(scene, burnedStall(rnd), x, z, ry);
    else { place(scene, marketStall('#5a3020'), x, z, ry, false); colliders.push({ type: 'box', x, z, hw: 1.6, hd: 0.8, rot: ry }); }
  }
  for (const [dx, dz] of [[-12, -10], [12, 6], [-2, 14], [14, -14]]) place(scene, col(beamPile(rnd)), S.x + dx, S.z + dz, rnd() * 6);
  for (const [dx, dz, k] of [[-11, -3, 0.5], [11, -7, 0.4], [-4, 10, 0.45]]) { fire(scene, out, S.x + dx, S.z + dz, k); out.smokers.push(new THREE.Vector3(S.x + dx, heightAt(S.x + dx, S.z + dz) + 0.5, S.z + dz)); }
  scatterJars(scene, rnd, S, 10, 30, ['jar', 'crate']);

  // ---------------- the paper-sellers' lane (Layth)
  const G = SITES.kiln, ga = Math.atan2(-6 - -24, -32 - -58); // the lane runs along the road into the site
  for (let k = -3; k <= 3; k++) for (const side of [-1, 1]) {
    const along = k * 5.2, x = G.x + Math.cos(ga) * along - Math.sin(ga) * side * 6.4, z = G.z + Math.sin(ga) * along + Math.cos(ga) * side * 6.4;
    if (blocked(x, z, 1)) continue;
    place(scene, col(warraqShop(rnd)), x, z, -ga + (side > 0 ? Math.PI : 0) + Math.PI / 2, true, true);
  }
  scatterJars(scene, rnd, G, 14, 22, ['paper', 'paper', 'jar']);
  { const f = [G.x + 3, G.z + 2]; fire(scene, out, f[0], f[1], 0.5); out.smokers.push(new THREE.Vector3(f[0], heightAt(...f) + 0.5, f[1])); }

  // ---------------- the square by the Kufa road ('Utba): a pyre of paper and a ring of stalls
  const A = SITES.arch;
  place(scene, col(pyre(rnd)), A.x, A.z - 13, 0);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + 0.2, x = A.x + Math.cos(a) * 17.5, z = A.z - 2 + Math.sin(a) * 17.5;
    if (roadDist(x, z) < 3 || blocked(x, z, 1.5)) continue;
    place(scene, i % 3 ? col(burnedStall(rnd)) : marketStall(['#8c2f24', '#2f5d7c', '#c28a2c'][i % 3]), x, z, -a + Math.PI / 2);
    if (!(i % 3)) colliders.push({ type: 'box', x, z, hw: 1.6, hd: 0.8, rot: -a + Math.PI / 2 });
  }
  for (const [dx, dz] of [[-9, 6], [9, 6], [-9, -8], [9, -8]]) brazier(scene, out, A.x + dx, A.z + dz);
  for (const [dx, dz] of [[-6, -18], [6, -18]]) place(scene, banner('#151515'), A.x + dx, A.z + dz, rnd() * 6, false);

  // ---------------- streets of houses, most of them gutted by the siege fires
  const tryHouse = (x, z, ry, burnt) => {
    const w = 4 + rnd() * 3.2, d = 4 + rnd() * 2.4, h = 3.2 + rnd() * 2.2;
    const r = Math.hypot(w, d) / 2 + 0.6;
    if (!inBounds(x, z, 127) || inSite(x, z, 1.05) || blocked(x, z, r - 0.6) || roadDist(x, z) < r * 0.75 + 1.2 || Math.abs(x - canalX(z)) < CANAL_W + r) return false;
    const hs = burnt ? burnedHouse(rnd, w, d, h) : house(rnd, w, d, h); hs.userData.occChunk = true;
    place(scene, hs, x, z, ry, false, false);
    colliders.push({ type: 'box', x, z, hw: w / 2 + 0.2, hd: d / 2 + 0.25, rot: ry });
    if (burnt && rnd() < 0.08) out.smokers.push(new THREE.Vector3(x, heightAt(x, z) + 1, z));
    return true;
  };
  for (const r0 of ROADS) for (let k = 0; k < r0.length - 1; k++) {
    const [ax, az] = r0[k], [bx, bz] = r0[k + 1], L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
    for (let s = 3; s < L; s += 5.6) for (const side of [-1, 1]) {
      const off = 6.4 + rnd() * 1.6, x = ax + Math.cos(ang) * s - Math.sin(ang) * off * side, z = az + Math.sin(ang) * s + Math.cos(ang) * off * side;
      tryHouse(x, z, -ang + (rnd() - 0.5) * 0.08, rnd() < 0.72);
    }
  }
  for (let i = 0, n = 0; i < 2400 && n < 110; i++) { const x = (rnd() - 0.5) * 250, z = (rnd() - 0.5) * 250; if (roadDist(x, z) > 11 && tryHouse(x, z, Math.round(rnd() * 4) * Math.PI / 2 + (rnd() - 0.5) * 0.1, rnd() < 0.6)) n++; }
  for (let i = 0, n = 0; i < 400 && n < 22; i++) { const x = (rnd() - 0.5) * 240, z = (rnd() - 0.5) * 240; if (!inSite(x, z, 1.1) && !blocked(x, z, 1.6) && roadDist(x, z) > 3.5 && Math.abs(x - canalX(z)) > 9) { place(scene, col(beamPile(rnd)), x, z, rnd() * 6); n++; } }

  // ---------------- skyline: the Round City's wall and gate to the north-east, the city beyond
  const wall = cityWall(220); wall.position.set(170, heightAt(120, -120) - 1, -160); wall.rotation.y = Math.atan2(-170, 160); scene.add(wall);
  const city = mergeStatic(roundCity()); city.position.set(260, 2, -300); city.scale.setScalar(1.7); scene.add(city);
  farRing(scene, 0x6a5a48, -2, 4);
  // distant rooftops of the unburned quarters (a cheap silhouette ring)
  {
    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), im = new THREE.InstancedMesh(geo, mats().plaster, 420), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < 420; i++) { const a = rnd() * 6.28, r = 150 + rnd() * 140, x = Math.cos(a) * r, z = Math.sin(a) * r; q.setFromAxisAngle(up, rnd() * 3); m4.compose(new THREE.Vector3(x, -1, z), q, new THREE.Vector3(5 + rnd() * 8, 4 + rnd() * 7, 5 + rnd() * 8)); im.setMatrixAt(i, m4); }
    im.castShadow = false; im.frustumCulled = false; scene.add(im);
  }

  // ---------------- vegetation: palms and grass along the canal, weeds in the ruins, rubble everywhere
  const palmPts = [], grass = [], rubble = [], shrubPts = [], pebbles = [];
  for (let i = 0; i < 26000; i++) {
    const x = (rnd() - 0.5) * (WORLD - 10), z = (rnd() - 0.5) * (WORLD - 10), cd = Math.abs(x - canalX(z)), rd = roadDist(x, z), y = heightAt(x, z);
    if (cd < CANAL_W * 0.6 || bridges.some((bz) => Math.abs(z - bz) < 2.6 && cd < 8)) continue;
    if (cd < 18 && rd > 3 && palmPts.length < 70 && rnd() < 0.03 && !blocked(x, z, 1.2) && !inSite(x, z)) { palmPts.push({ x, y, z }); colliders.push({ type: 'circle', x, z, r: 0.45 }); continue; }
    if ((cd < 14 || rnd() < 0.08) && rd > 2.5 && grass.length < 5000 && rnd() < 0.5 && !blocked(x, z, 0.2)) { grass.push({ x, y, z }); continue; }
    if (rd > 3 && !inSite(x, z) && shrubPts.length < 400 && rnd() < 0.02) { shrubPts.push({ x, y, z }); continue; }
    if (rnd() < 0.03 && !inSite(x, z, 0.6)) rubble.push({ x, y: y - 0.12, z, s: 0.3 + rnd() * 0.9 });
  }
  for (let i = 0; i < 6000; i++) { const x = (rnd() - 0.5) * (WORLD - 20), z = (rnd() - 0.5) * (WORLD - 20); if (Math.abs(x - canalX(z)) < CANAL_W * 0.7) continue; if (rnd() < (roadDist(x, z) < 4 ? 0.5 : 0.8)) pebbles.push({ x, y: heightAt(x, z) - 0.03, z, s: 0.06 + rnd() * 0.18 }); }
  const pg = palms(palmPts, 5); scene.add(pg); out.occluders.push(pg);
  scene.add(grassField(grass, 'grass', 7));
  scene.add(rocks(rubble, 8, 0xc8b8a4));
  const peb = rocks(pebbles, 21, 0x9a8a7a); peb.castShadow = false; scene.add(peb);
  scene.add(shrubs(shrubPts, 9));
  for (let i = 0, n = 0; i < 300 && n < 14; i++) { const x = (rnd() - 0.5) * 230, z = (rnd() - 0.5) * 230; if (!inSite(x, z, 1.1) && !blocked(x, z, 1.5) && roadDist(x, z) > 4) { place(scene, deadTree(rnd), x, z, rnd() * 6, false); colliders.push({ type: 'circle', x, z, r: 0.5 }); n++; } }
}
