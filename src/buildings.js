import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mudBrick, girihTile, kuficBand, woodTex } from './textures.js';
import { mulberry32 } from './noise.js';
import { triplanarMaterial } from './triplanar.js';

export const colliders = []; // {type:'circle',x,z,r} | {type:'box',x,z,hw,hd,rot}
export function addBox(x, z, hw, hd, rot = 0) { colliders.push({ type: 'box', x, z, hw, hd, rot }); }
export function addCircle(x, z, r) { colliders.push({ type: 'circle', x, z, r }); }

let M = null;
export function mats() {
  if (M) return M;
  const mb = mudBrick(), pl = mudBrick([214, 188, 150]), gt = girihTile(), wt = woodTex();
  for (const t of [mb.map, mb.normalMap, pl.map, pl.normalMap]) t.repeat.set(0.3, 0.3);
  for (const t of [gt.map, gt.normalMap]) t.repeat.set(0.5, 0.5);
  M = {
    mud: triplanarMaterial({ map: mb.map, normalMap: mb.normalMap, scale: 0.42, roughness: 0.95, normalStrength: 1.2 }),
    plaster: triplanarMaterial({ map: pl.map, normalMap: pl.normalMap, scale: 0.42, roughness: 0.9, normalStrength: 0.6, grime: 0.45 }),
    tile: new THREE.MeshStandardMaterial({ map: gt.map, normalMap: gt.normalMap, roughness: 0.2, metalness: 0.1 }),
    kufic: new THREE.MeshStandardMaterial({ map: kuficBand(), roughness: 0.3, emissive: 0x000000 }),
    dome: (() => { const dm = gt.map.clone(); dm.repeat.set(10, 3); dm.needsUpdate = true; const dn = gt.normalMap.clone(); dn.repeat.set(10, 3); dn.needsUpdate = true; return new THREE.MeshStandardMaterial({ color: 0x8fd6cf, roughness: 0.3, metalness: 0.1, map: dm, normalMap: dn }); })(),
    domeGold: new THREE.MeshStandardMaterial({ color: 0xd8a640, roughness: 0.3, metalness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ map: wt, roughness: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 1 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xe0b050, roughness: 0.25, metalness: 1 }),
    stone: triplanarMaterial({ map: pl.map, normalMap: pl.normalMap, color: 0xa89a88, scale: 0.8, roughness: 0.9, grime: 0.2 }),
  };
  return M;
}

// Pointed (Abbasid) arch outline, centered at x=0, base at y=0.
export function archPath(path, w, h, steps = 14, reverse = false) {
  const r = w * 0.62, spring = h - Math.sqrt(r * r - (r - w / 2) ** 2) * 1.0;
  const pts = [];
  pts.push([-w / 2, 0], [-w / 2, spring]);
  // left arc: center at (-w/2 + r, spring)
  const cxL = -w / 2 + r, cxR = w / 2 - r;
  const topY = spring + Math.sqrt(r * r - cxL * cxL);
  for (let i = 1; i <= steps; i++) {
    const a = Math.PI - (i / steps) * Math.acos(cxL / r) ;
    pts.push([cxL + Math.cos(a) * r, spring + Math.sin(a) * r]);
  }
  for (let i = steps - 1; i >= 0; i--) {
    const a = (i / steps) * Math.acos(-cxR / r);
    pts.push([cxR + Math.cos(a) * r, spring + Math.sin(a) * r]);
  }
  pts.push([w / 2, 0]);
  const seq = reverse ? pts.reverse() : pts;
  seq.forEach(([x, y], i) => (i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)));
  return topY;
}

// Wall panel with arches cut through (extruded). Returns geometry in local space, wall along X, thickness along Z.
export function arcadeWall(len, h, thick, nArch, archW, archH, blind = false) {
  const s = new THREE.Shape();
  s.moveTo(-len / 2, 0); s.lineTo(len / 2, 0); s.lineTo(len / 2, h); s.lineTo(-len / 2, h); s.closePath();
  const step = len / nArch;
  if (!blind) for (let i = 0; i < nArch; i++) {
    const hole = new THREE.Path();
    const cx = -len / 2 + step * (i + 0.5);
    const tmp = new THREE.Path(); archPath(tmp, archW, archH);
    const pts = tmp.getPoints();
    pts.forEach((p, k) => (k === 0 ? hole.moveTo(p.x + cx, p.y + 0.001) : hole.lineTo(p.x + cx, p.y + 0.001)));
    s.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -thick / 2);
  return g;
}

function blindArchRecess(w, h, depth) {
  const s = new THREE.Shape(); archPath(s, w, h);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  return g;
}

// Pointed dome profile via lathe.
export function domeGeo(r, height = r * 1.25, seg = 32) {
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const y = Math.sin(t * Math.PI / 2) ** 0.9 * height;
    const x = r * Math.cos(t * Math.PI / 2) ** 0.85 * (1 + 0.08 * Math.sin(t * Math.PI));
    pts.push(new THREE.Vector2(Math.max(x, 0.001), y));
  }
  pts.push(new THREE.Vector2(0.001, height + r * 0.05));
  return new THREE.LatheGeometry(pts, seg);
}

function finial(scale = 1) {
  const pts = [[0.12, 0], [0.12, 0.3], [0.25, 0.4], [0.12, 0.55], [0.18, 0.7], [0.05, 0.9], [0.1, 1.05], [0.01, 1.6]].map(([x, y]) => new THREE.Vector2(x * scale, y * scale));
  return new THREE.LatheGeometry(pts, 12);
}

function crenellations(len, y, thick, size = 0.6) {
  const geos = [];
  const n = Math.floor(len / (size * 2));
  for (let i = 0; i < n; i++) {
    // stepped merlon (typical Abbasid/Persian)
    const g = new THREE.BoxGeometry(size, size * 0.9, thick); g.translate(-len / 2 + size + i * size * 2, y + size * 0.45, 0);
    const g2 = new THREE.BoxGeometry(size * 0.5, size * 0.5, thick); g2.translate(-len / 2 + size + i * size * 2, y + size * 1.1, 0);
    geos.push(g, g2);
  }
  return geos.length ? mergeGeometries(geos) : null;
}

function mesh(g, m, cast = true) { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; return o; }

// ---------------------------------------------------------------- house
export function house(rnd, w, d, h) {
  const m = mats(), grp = new THREE.Group();
  const wallMat = rnd() > 0.5 ? m.mud : m.plaster;
  grp.add(mesh(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), wallMat));
  // parapet with slightly inset roof
  const par = 0.6;
  const pg = [];
  pg.push(new THREE.BoxGeometry(w + 0.2, par, 0.3).translate(0, h + par / 2, d / 2 - 0.05));
  pg.push(new THREE.BoxGeometry(w + 0.2, par, 0.3).translate(0, h + par / 2, -d / 2 + 0.05));
  pg.push(new THREE.BoxGeometry(0.3, par, d).translate(w / 2 - 0.05, h + par / 2, 0));
  pg.push(new THREE.BoxGeometry(0.3, par, d).translate(-w / 2 + 0.05, h + par / 2, 0));
  grp.add(mesh(mergeGeometries(pg), wallMat));
  // protruding roof beams (vigas)
  const beams = [];
  for (let x = -w / 2 + 0.6; x < w / 2 - 0.3; x += 0.9) {
    beams.push(new THREE.CylinderGeometry(0.09, 0.1, 0.7, 6).rotateX(Math.PI / 2).translate(x + rnd() * 0.1, h - 0.25, d / 2 + 0.25));
  }
  grp.add(mesh(mergeGeometries(beams), m.wood));
  // door: arched recess + wooden door
  const dw = 1.3, dh = 2.3;
  const door = blindArchRecess(dw, dh, 0.12);
  grp.add(mesh(door.clone().translate(0, 0, d / 2 + 0.005), m.wood, false));
  const frame = blindArchRecess(dw + 0.4, dh + 0.3, 0.06);
  grp.add(mesh(frame.translate(0, 0, d / 2 - 0.02), m.plaster, false));
  // windows with lattice
  const win = [];
  for (const side of [-1, 1]) {
    if (w > 4) win.push(new THREE.BoxGeometry(0.7, 0.9, 0.08).translate(side * w * 0.3, h * 0.62, d / 2 + 0.02));
  }
  if (win.length) grp.add(mesh(mergeGeometries(win), m.dark, false));
  // rooftop clutter
  if (rnd() > 0.4) {
    const jar = new THREE.LatheGeometry([[0, 0], [0.25, 0.05], [0.35, 0.35], [0.2, 0.7], [0.14, 0.8], [0.18, 0.85]].map(([a, b]) => new THREE.Vector2(a, b)), 10);
    const jm = new THREE.MeshStandardMaterial({ color: 0xa0603a, roughness: 0.8 });
    for (let i = 0; i < 3; i++) { const j = mesh(jar, jm); j.position.set((rnd() - 0.5) * w * 0.6, h, (rnd() - 0.5) * d * 0.6); grp.add(j); }
  }
  if (rnd() > 0.5) { // awning cloth over door
    const cl = new THREE.MeshStandardMaterial({ color: [0x8c2f24, 0x2f5d7c, 0xc28a2c, 0x5a7d3a][rnd() * 4 | 0], roughness: 0.9, side: THREE.DoubleSide });
    const ag = new THREE.PlaneGeometry(2.4, 1.4, 6, 3); const ap = ag.attributes.position;
    for (let i = 0; i < ap.count; i++) ap.setZ(i, Math.sin((ap.getY(i) + 0.7) / 1.4 * Math.PI) * 0.15);
    ag.computeVertexNormals();
    const aw = mesh(ag, cl); aw.rotation.x = -Math.PI / 2 + 0.45; aw.position.set(0, dh + 0.45, d / 2 + 0.6); grp.add(aw);
    const pole = new THREE.CylinderGeometry(0.04, 0.04, dh + 0.3, 5);
    for (const s of [-1, 1]) { const p = mesh(pole, m.wood); p.position.set(s * 1.15, (dh + 0.3) / 2, d / 2 + 1.2); grp.add(p); }
  }
  return grp;
}

// ---------------------------------------------------------------- spiral minaret (Malwiya-style)
export function spiralMinaret(baseR = 3, height = 16, turns = 4.5) {
  const m = mats(), grp = new THREE.Group();
  const top = baseR * 0.38;
  // core tapered tower
  grp.add(mesh(new THREE.CylinderGeometry(top, baseR, height, 28, 1).translate(0, height / 2, 0), m.mud));
  // helical ramp
  const seg = 260, pos = [], idx = [];
  const rampW = 0.7, rampH = 0.35;
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, a = t * turns * Math.PI * 2;
    const y = t * height * 0.93;
    const r = THREE.MathUtils.lerp(baseR, top, y / height);
    const ca = Math.cos(a), sa = Math.sin(a);
    const rin = r - 0.05, rout = r + rampW;
    pos.push(ca * rin, y, sa * rin, ca * rout, y, sa * rout, ca * rout, y - rampH, sa * rout, ca * rin, y - rampH * 2.5, sa * rin);
    if (i < seg) {
      const b = i * 4, n = b + 4;
      idx.push(b, n, b + 1, b + 1, n, n + 1); // top
      idx.push(b + 1, n + 1, b + 2, b + 2, n + 1, n + 2); // outer
      idx.push(b + 2, n + 2, b + 3, b + 3, n + 2, n + 3); // under
    }
  }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setIndex(idx); rg.computeVertexNormals();
  const uv = []; for (let i = 0; i <= seg; i++) uv.push(i * 0.2, 0, i * 0.2, 0.3, i * 0.2, 0.5, i * 0.2, 0.8);
  rg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  grp.add(mesh(rg, m.plaster));
  // pavilion on top
  const pav = new THREE.CylinderGeometry(top * 1.1, top * 1.1, 2, 12, 1, true).translate(0, height + 1, 0);
  grp.add(mesh(pav, m.plaster));
  const pd = domeGeo(top * 1.15, top * 1.4, 16).translate(0, height + 2, 0);
  grp.add(mesh(pd, m.dome));
  grp.add(mesh(finial(0.8).translate(0, height + 2 + top * 1.4, 0), m.gold));
  // square base
  grp.add(mesh(new THREE.BoxGeometry(baseR * 2.6, 1.2, baseR * 2.6).translate(0, 0.6, 0), m.mud));
  return grp;
}

// ---------------------------------------------------------------- mosque
export function mosque() {
  const m = mats(), grp = new THREE.Group();
  const W = 18, D = 14, H = 6.5;
  // prayer hall
  grp.add(mesh(new THREE.BoxGeometry(W, H, D).translate(0, H / 2, 0), m.plaster));
  // facade: arcade in front
  const arc = arcadeWall(W, H + 0.8, 1.0, 5, 2.4, 4.8);
  const a = mesh(arc, m.plaster); a.position.set(0, 0, D / 2 + 2.2); grp.add(a);
  // roof of portico
  grp.add(mesh(new THREE.BoxGeometry(W, 0.4, 2.4).translate(0, H + 0.6, D / 2 + 1.1), m.plaster));
  // tile frieze & kufic band
  grp.add(mesh(new THREE.BoxGeometry(W, 0.9, 0.06).translate(0, H + 0.1, D / 2 + 2.75), m.kufic, false));
  grp.add(mesh(new THREE.BoxGeometry(W + 0.1, 0.5, D + 0.1).translate(0, H - 0.6, 0), m.tile, false));
  // pishtaq (tall portal) with tile
  const pw = 6, ph = 10.5;
  grp.add(mesh(new THREE.BoxGeometry(pw, ph, 1.6).translate(0, ph / 2, D / 2 + 2.6), m.plaster));
  const recess = blindArchRecess(3.6, 7.5, 0.9); grp.add(mesh(recess.translate(0, 0, D / 2 + 2.95), m.tile, false));
  const inner = blindArchRecess(1.8, 3.4, 0.2); grp.add(mesh(inner.translate(0, 0, D / 2 + 3.35), m.wood, false));
  grp.add(mesh(new THREE.BoxGeometry(pw - 0.6, 0.7, 0.08).translate(0, ph - 1.2, D / 2 + 3.42), m.kufic, false));
  const cr = crenellations(pw, ph, 1.6, 0.4); if (cr) grp.add(mesh(cr.translate(0, 0, D / 2 + 2.6), m.plaster));
  // drum + dome
  grp.add(mesh(new THREE.CylinderGeometry(4.6, 4.8, 2.2, 32).translate(0, H + 1.1, -1), m.plaster));
  grp.add(mesh(new THREE.CylinderGeometry(4.65, 4.65, 0.5, 32).translate(0, H + 2.0, -1), m.tile, false));
  grp.add(mesh(domeGeo(4.6, 6.2).translate(0, H + 2.2, -1), m.dome));
  grp.add(mesh(finial(1.4).translate(0, H + 8.4, -1), m.gold));
  // small corner domes
  for (const sx of [-1, 1]) {
    grp.add(mesh(new THREE.CylinderGeometry(1.6, 1.6, 1, 16).translate(sx * 6.5, H + 0.5, -3), m.plaster));
    grp.add(mesh(domeGeo(1.6, 2).translate(sx * 6.5, H + 1, -3), m.dome));
  }
  const crs = crenellations(W, H, 0.4, 0.45);
  if (crs) { grp.add(mesh(crs.clone().translate(0, 0, D / 2), m.plaster)); grp.add(mesh(crs.clone().translate(0, 0, -D / 2), m.plaster)); }
  // spiral minaret
  const mn = spiralMinaret(2.6, 17, 4.5); mn.position.set(W / 2 + 5, 0, -D / 2 + 2); grp.add(mn);
  // courtyard fountain
  const ft = new THREE.Group();
  ft.add(mesh(new THREE.CylinderGeometry(2, 2.1, 0.6, 8), m.tile)); ft.children[0].position.y = 0.3;
  const wtr = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0x2c6e6a, roughness: 0.05, metalness: 0.3 }));
  wtr.position.y = 0.55; ft.add(wtr);
  ft.add(mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.4, 8).translate(0, 0.7, 0), m.plaster));
  ft.position.set(0, 0, D / 2 + 8); grp.add(ft);
  grp.userData.colliders = [
    { type: 'box', x: 0, z: 0.8, hw: W / 2 + 0.2, hd: D / 2 + 2.8 },
    { type: 'circle', x: W / 2 + 5, z: -D / 2 + 2, r: 3.6 },
    { type: 'circle', x: 0, z: D / 2 + 8, r: 2.2 },
  ];
  return grp;
}

// ---------------------------------------------------------------- caravanserai (ruined)
export function caravanserai(rnd) {
  const m = mats(), grp = new THREE.Group();
  const S = 34, H = 7, T = 1.6;
  const cols = [];
  const sides = [
    { x: 0, z: -S / 2, r: 0 }, { x: S / 2, z: 0, r: Math.PI / 2 }, { x: -S / 2, z: 0, r: Math.PI / 2 },
  ];
  for (const sd of sides) {
    // split into broken segments
    const n = 6, seglen = S / n;
    for (let i = 0; i < n; i++) {
      if (rnd() < 0.18) continue; // collapsed gap
      const hh = H * (0.45 + rnd() * 0.55);
      const g = new THREE.BoxGeometry(seglen + 0.02, hh, T).translate(-S / 2 + seglen * (i + 0.5), hh / 2, 0);
      // jagged top: add rubble blocks
      const o = mesh(g, m.mud); o.position.set(sd.x, 0, sd.z); o.rotation.y = sd.r; grp.add(o);
      const lx = -S / 2 + seglen * (i + 0.5);
      const c = Math.cos(sd.r), s = Math.sin(sd.r);
      cols.push({ type: 'box', x: sd.x + lx * c, z: sd.z - lx * s, hw: sd.r ? T / 2 : seglen / 2, hd: sd.r ? seglen / 2 : T / 2 });
      if (hh > H * 0.8) {
        const cr = crenellations(seglen, hh, T, 0.5);
        if (cr) { const co = mesh(cr.translate(lx, 0, 0), m.mud); co.position.copy(o.position); co.rotation.y = sd.r; grp.add(co); }
      }
    }
  }
  // front wall with grand iwan gate (south side z=+S/2)
  const fl = (S - 9) / 2;
  for (const sx of [-1, 1]) {
    const g = new THREE.BoxGeometry(fl, H * 0.9, T).translate(sx * (S / 2 - fl / 2), H * 0.45, S / 2);
    grp.add(mesh(g, m.mud));
    cols.push({ type: 'box', x: sx * (S / 2 - fl / 2), z: S / 2, hw: fl / 2, hd: T / 2 });
  }
  const gate = arcadeWall(9, H * 1.5, T * 1.5, 1, 5, 8);
  const go = mesh(gate, m.plaster); go.position.set(0, 0, S / 2); grp.add(go);
  grp.add(mesh(new THREE.BoxGeometry(8, 0.8, 0.06).translate(0, H * 1.5 - 1.2, S / 2 + T * 0.76), m.kufic, false));
  cols.push({ type: 'box', x: -3.7, z: S / 2, hw: 0.9, hd: 1.2 }, { type: 'box', x: 3.7, z: S / 2, hw: 0.9, hd: 1.2 });
  // corner towers (round, some broken)
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const th = H * (0.7 + rnd() * 0.7);
    grp.add(mesh(new THREE.CylinderGeometry(2.0, 2.4, th, 16).translate(cx * S / 2, th / 2, cz * S / 2), m.mud));
    cols.push({ type: 'circle', x: cx * S / 2, z: cz * S / 2, r: 2.5 });
  }
  // inner arcade along back wall
  const arc = arcadeWall(S - 4, 4.6, 0.8, 7, 2.6, 3.6);
  const ao = mesh(arc, m.plaster); ao.position.set(0, 0, -S / 2 + 4); grp.add(ao);
  grp.add(mesh(new THREE.BoxGeometry(S - 4, 0.35, 4).translate(0, 4.6, -S / 2 + 2), m.mud));
  cols.push({ type: 'box', x: 0, z: -S / 2 + 2.4, hw: S / 2 - 2, hd: 2.4 });
  // rubble piles
  const rub = [];
  for (let i = 0; i < 60; i++) {
    const s = 0.3 + rnd() * 0.8;
    const g = new THREE.BoxGeometry(s * 1.6, s * 0.7, s).rotateY(rnd() * 3).rotateX((rnd() - 0.5) * 0.6);
    const edge = rnd() * 4 | 0, t = (rnd() - 0.5) * S;
    const off = 1.6 + rnd() * 2.5;
    const p = [[t, -S / 2 + off], [S / 2 - off, t], [-S / 2 + off, t], [t, S / 2 - off]][edge];
    g.translate(p[0], s * 0.3, p[1]); rub.push(g);
  }
  grp.add(mesh(mergeGeometries(rub), m.mud));
  // central well
  grp.add(mesh(new THREE.CylinderGeometry(1.4, 1.5, 1.0, 12, 1, true).translate(0, 0.5, 2), m.stone));
  grp.add(mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.05, 12).translate(0, 0.1, 2), m.dark));
  cols.push({ type: 'circle', x: 0, z: 2, r: 1.6 });
  grp.userData.colliders = cols;
  return grp;
}

// ---------------------------------------------------------------- ruined great arch (Taq Kasra inspired)
export function greatArch() {
  const m = mats(), grp = new THREE.Group();
  const span = 16, archH = 24, depth = 22, T = 3;
  // parabolic vault: build as extruded shape (ring) of parabola
  const s = new THREE.Shape();
  const N = 30, outer = [], inner = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N * 2 - 1;
    outer.push([t * (span / 2 + T), (1 - t * t) * (archH + T)]);
    inner.push([t * span / 2, (1 - t * t) * archH]);
  }
  outer.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  inner.reverse().forEach(([x, y]) => s.lineTo(x, y));
  s.closePath();
  const vault = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 4 });
  vault.translate(0, 0, -depth / 2);
  grp.add(mesh(vault, m.mud));
  // facade wing (left only — the right wing has collapsed)
  const fw = 22, fh = 26;
  const fac = new THREE.Group();
  for (let row = 0; row < 4; row++) {
    const rh = fh / 4;
    const w = arcadeWall(fw, rh, 2.2, 5 + row, (fw / (5 + row)) * 0.55, rh * 0.75, false);
    const o = mesh(w, m.mud); o.position.set(0, row * rh, 0); fac.add(o);
    // string course
    fac.add(mesh(new THREE.BoxGeometry(fw + 0.4, 0.4, 2.6).translate(0, row * rh + rh, 0), m.plaster));
  }
  fac.position.set(-(span / 2 + T + fw / 2), 0, depth / 2 - 1.1);
  grp.add(fac);
  // stub of collapsed right wing
  const stub = mesh(arcadeWall(10, 9, 2.2, 2, 2.6, 6), m.mud);
  stub.position.set(span / 2 + T + 5, 0, depth / 2 - 1.1); grp.add(stub);
  const rub = [], rnd = mulberry32(99);
  for (let i = 0; i < 90; i++) {
    const sz = 0.5 + rnd() * 1.5;
    const g = new THREE.BoxGeometry(sz * 1.5, sz * 0.8, sz).rotateY(rnd() * 3).rotateZ((rnd() - 0.5) * 0.8);
    g.translate(span / 2 + T + 4 + rnd() * 18, sz * 0.3, depth / 2 - 4 + rnd() * 10); rub.push(g);
  }
  grp.add(mesh(mergeGeometries(rub), m.mud));
  grp.userData.colliders = [
    { type: 'box', x: -(span / 2 + T / 2), z: 0, hw: T / 2 + 0.3, hd: depth / 2 },
    { type: 'box', x: (span / 2 + T / 2), z: 0, hw: T / 2 + 0.3, hd: depth / 2 },
    { type: 'box', x: -(span / 2 + T + fw / 2), z: depth / 2 - 1.1, hw: fw / 2, hd: 1.2 },
    { type: 'box', x: span / 2 + T + 5, z: depth / 2 - 1.1, hw: 5, hd: 1.2 },
  ];
  return grp;
}

// ---------------------------------------------------------------- domed mausoleum (qubba)
export function mausoleum() {
  const m = mats(), grp = new THREE.Group();
  const S = 6, H = 5;
  for (let i = 0; i < 4; i++) {
    const w = arcadeWall(S, H, 0.7, 1, 2.4, 3.8);
    const o = mesh(w, m.plaster); o.rotation.y = i * Math.PI / 2;
    o.position.set(Math.sin(i * Math.PI / 2) * S / 2, 0, Math.cos(i * Math.PI / 2) * S / 2); grp.add(o);
  }
  grp.add(mesh(new THREE.CylinderGeometry(S / 2 + 0.2, S / 2 * 1.41, 1.2, 8).translate(0, H + 0.6, 0), m.plaster));
  grp.add(mesh(domeGeo(S / 2, S * 0.75, 24).translate(0, H + 1.2, 0), m.plaster));
  grp.add(mesh(finial(0.9).translate(0, H + 1.2 + S * 0.75, 0), m.gold));
  grp.add(mesh(new THREE.BoxGeometry(2.4, 0.8, 1).translate(0, 0.4, 0), m.tile));
  grp.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: S / 2 + 0.4, hd: S / 2 + 0.4 }];
  return grp;
}

// ---------------------------------------------------------------- distant round city of Baghdad (backdrop)
export function roundCity() {
  const m = mats(), grp = new THREE.Group();
  const R = 60;
  const wall = new THREE.CylinderGeometry(R, R, 10, 96, 1, true);
  grp.add(mesh(wall, m.mud, false));
  const inner = new THREE.CylinderGeometry(R * 0.7, R * 0.7, 14, 96, 1, true);
  grp.add(mesh(inner.translate(0, 2, 0), m.mud, false));
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2;
    grp.add(mesh(new THREE.CylinderGeometry(2.2, 2.6, 13, 10).translate(Math.cos(a) * R, 6.5, Math.sin(a) * R), m.mud, false));
  }
  // green dome palace in the center
  grp.add(mesh(new THREE.BoxGeometry(30, 14, 30).translate(0, 7, 0), m.plaster, false));
  grp.add(mesh(new THREE.CylinderGeometry(9, 9, 6, 24).translate(0, 17, 0), m.plaster, false));
  const gd = new THREE.MeshStandardMaterial({ color: 0x2f8f4e, roughness: 0.3, metalness: 0.2 });
  grp.add(mesh(domeGeo(9, 14).translate(0, 20, 0), gd, false));
  grp.add(mesh(finial(4).translate(0, 34, 0), m.gold, false));
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + 0.3;
    const mh = 20 + (i % 2) * 8;
    grp.add(mesh(new THREE.CylinderGeometry(0.9, 1.4, mh, 10).translate(Math.cos(a) * 30, mh / 2, Math.sin(a) * 30), m.plaster, false));
    grp.add(mesh(domeGeo(1.2, 2.2, 10).translate(Math.cos(a) * 30, mh, Math.sin(a) * 30), m.dome, false));
  }
  for (let i = 0; i < 60; i++) { // houses inside
    const a = Math.random() * Math.PI * 2, r = 34 + Math.random() * 22, h = 4 + Math.random() * 6;
    grp.add(mesh(new THREE.BoxGeometry(5 + Math.random() * 5, h, 5 + Math.random() * 5).translate(Math.cos(a) * r, h / 2, Math.sin(a) * r), m.plaster, false));
  }
  return grp;
}
