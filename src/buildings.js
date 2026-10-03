import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mudBrick, girihTile, kuficBand, woodTex, fabricTex } from './textures.js';
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
    tile: triplanarMaterial({ map: gt.map, normalMap: gt.normalMap, scale: 0.9, roughness: 0.22, grime: 0.08, normalStrength: 0.8 }),
    kufic: new THREE.MeshStandardMaterial({ map: kuficBand(), color: 0x9a8670, roughness: 0.7, emissive: 0x000000 }),
    dome: (() => { const dm = gt.map.clone(); dm.repeat.set(24, 7); dm.needsUpdate = true; const dn = gt.normalMap.clone(); dn.repeat.set(24, 7); dn.needsUpdate = true; return new THREE.MeshStandardMaterial({ color: 0x8fd6cf, roughness: 0.3, metalness: 0.1, map: dm, normalMap: dn }); })(),
    domeGold: new THREE.MeshStandardMaterial({ color: 0xd8a640, roughness: 0.3, metalness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ map: wt, roughness: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x120c08, roughness: 1 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xe0b050, roughness: 0.25, metalness: 1 }),
    limestone: triplanarMaterial({ map: pl.map, normalMap: pl.normalMap, color: 0xf0e8dc, scale: 1.2, roughness: 0.85, grime: 0.25, normalStrength: 0.5 }),
    stone: triplanarMaterial({ map: pl.map, normalMap: pl.normalMap, color: 0xa89a88, scale: 0.8, roughness: 0.9, grime: 0.2 }),
    // fired kiln brick: darker, with heavy soot grime
    fired: triplanarMaterial({ map: mb.map, normalMap: mb.normalMap, color: 0x8a5a48, scale: 0.42, roughness: 0.97, normalStrength: 1.4, grime: 0.95 }),
    soot: new THREE.MeshStandardMaterial({ color: 0x141010, roughness: 1 }),
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
  const kind = rnd();
  if (kind < 0.35) { // second storey set back, with a wooden mashrabiya balcony
    const w2 = w * 0.6, d2 = d * 0.6, h2 = 2.6;
    const up = mesh(new THREE.BoxGeometry(w2, h2, d2).translate(-w * 0.15, h + h2 / 2, -d * 0.12), wallMat); grp.add(up);
    const pg2 = [];
    for (const [px, pz, sx, sz] of [[0, d2 / 2, w2 + 0.2, 0.3], [0, -d2 / 2, w2 + 0.2, 0.3], [w2 / 2, 0, 0.3, d2], [-w2 / 2, 0, 0.3, d2]])
      pg2.push(new THREE.BoxGeometry(sx, 0.5, sz).translate(px - w * 0.15, h + h2 + 0.25, pz - d * 0.12));
    grp.add(mesh(mergeGeometries(pg2), wallMat));
    // mashrabiya: lattice box cantilevered from the upper floor
    const bal = new THREE.Group();
    bal.add(mesh(new THREE.BoxGeometry(1.8, 0.12, 0.8).translate(0, 0, 0.4), m.wood));
    bal.add(mesh(new THREE.BoxGeometry(1.8, 0.12, 0.85).translate(0, 1.5, 0.42), m.wood));
    const lat = [];
    for (let i = 0; i <= 8; i++) lat.push(new THREE.BoxGeometry(0.04, 1.4, 0.04).translate(-0.9 + i * 0.225, 0.75, 0.8));
    for (let j = 0; j <= 5; j++) lat.push(new THREE.BoxGeometry(1.8, 0.04, 0.04).translate(0, 0.1 + j * 0.27, 0.8));
    for (const sx of [-0.9, 0.9]) for (let j = 0; j <= 5; j++) lat.push(new THREE.BoxGeometry(0.04, 0.04, 0.8).translate(sx, 0.1 + j * 0.27, 0.4));
    bal.add(mesh(mergeGeometries(lat), m.wood));
    bal.position.set(-w * 0.15, h + 0.5, -d * 0.12 + d2 / 2); grp.add(bal);
  } else if (kind < 0.55) { // wind-catcher tower (badgir)
    const bx = w * 0.25, bz = -d * 0.2, bh = 3.4;
    grp.add(mesh(new THREE.BoxGeometry(1.2, bh, 1.2).translate(bx, h + bh / 2, bz), wallMat));
    for (const [ox, oz, ry] of [[0, 0.61, 0], [0, -0.61, 0], [0.61, 0, Math.PI / 2], [-0.61, 0, Math.PI / 2]]) {
      const sl = mesh(new THREE.BoxGeometry(0.22, 1.1, 0.04).translate(0, 0, 0), m.dark, false);
      for (const k of [-0.3, 0, 0.3]) { const c = sl.clone(); c.position.set(bx + ox + (ry ? 0 : k), h + bh - 0.8, bz + oz + (ry ? k : 0)); c.rotation.y = ry; grp.add(c); }
    }
    grp.add(mesh(new THREE.BoxGeometry(1.4, 0.18, 1.4).translate(bx, h + bh + 0.09, bz), wallMat));
  } else if (kind < 0.7) { // a wind-catcher (badgir) on the roof: a squat vented tower, not a dome
    const bx = w * 0.15, bz = -d * 0.1;
    grp.add(mesh(new THREE.BoxGeometry(1.5, 2.2, 1.5).translate(bx, h + 1.1, bz), wallMat));
    for (const [ox, oz, ry] of [[0, 0.76, 0], [0, -0.76, 0]]) for (const k of [-0.42, 0, 0.42]) { const v = mesh(new THREE.BoxGeometry(0.24, 1.0, 0.04), m.dark, false); v.position.set(bx + ox + k, h + 1.55, bz + oz); v.rotation.y = ry; grp.add(v); }
    grp.add(mesh(new THREE.BoxGeometry(1.75, 0.16, 1.75).translate(bx, h + 2.28, bz), wallMat));
  }
  if (rnd() > 0.5) { // external staircase to the roof
    const st = [];
    for (let i = 0; i < 8; i++) st.push(new THREE.BoxGeometry(0.9, (i + 1) * h / 8, 0.45).translate(w / 2 + 0.45, (i + 1) * h / 16, -d / 2 + 0.3 + i * 0.45));
    grp.add(mesh(mergeGeometries(st), wallMat));
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

// ---------------------------------------------------------------- covered market (suq) with a watchtower
export function suq() {
  const m = mats(), grp = new THREE.Group();
  const W = 20, D = 9, H = 5.2;
  // shop hall: plastered block with an open arcade of shop bays on the long side
  grp.add(mesh(new THREE.BoxGeometry(W, H, D).translate(0, H / 2, -1), m.plaster));
  const arc = arcadeWall(W, H + 0.4, 0.9, 6, 2.2, 3.8);
  const a = mesh(arc, m.mud); a.position.set(0, 0, D / 2 + 0.6); grp.add(a);
  // timber awning beams and striped cloth shades over the bays
  const shade = ['#8c2f24', '#2f5d7c', '#c28a2c'];
  for (let i = 0; i < 6; i++) {
    const x = -W / 2 + W / 12 + i * W / 6;
    const cl = new THREE.MeshStandardMaterial({ map: fabricTex(shade[i % 3], '#efe0b8'), roughness: 0.9, side: THREE.DoubleSide });
    const c = mesh(new THREE.PlaneGeometry(2.9, 2.0), cl); c.rotation.x = -Math.PI / 2 + 0.5; c.position.set(x, 3.3, D / 2 + 1.8); grp.add(c);
    grp.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.9).translate(x - 1.4, 1.45, D / 2 + 2.6), m.wood));
    grp.add(mesh(new THREE.BoxGeometry(2.2, 0.8, 1.0).translate(x, 0.4, D / 2 + 1.6), m.wood));
    const ware = [0xc0392b, 0xe67e22, 0xd9b65a, 0x7d5a3c, 0x6b8e23, 0x9a7a5a][i];
    for (let k = 0; k < 3; k++) grp.add(mesh(new THREE.ConeGeometry(0.22, 0.25, 10).translate(x - 0.6 + k * 0.6, 0.92, D / 2 + 1.6), new THREE.MeshStandardMaterial({ color: ware, roughness: 1 })));
  }
  // flat roof with parapet and timber rafter ends
  const crs = crenellations(W, H, 0.4, 0.45);
  if (crs) { grp.add(mesh(crs.clone().translate(0, 0, D / 2 - 1), m.plaster)); grp.add(mesh(crs.clone().translate(0, 0, -D / 2 - 1), m.plaster)); }
  for (let i = 0; i < 20; i++) grp.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.7, 6).rotateX(Math.PI / 2).translate(-W / 2 + 0.5 + i * (W - 1) / 19, H - 0.4, D / 2 - 0.6), m.wood));
  // squat mud-brick gate tower with a timber fighting platform: broad and low so it reads as military, not a minaret
  const T = new THREE.Group();
  T.add(mesh(new THREE.BoxGeometry(6, 8, 6).translate(0, 4, 0), m.mud));
  T.add(mesh(new THREE.BoxGeometry(6.8, 0.35, 6.8).translate(0, 8.2, 0), m.wood));
  for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3], [0, -3], [0, 3], [-3, 0], [3, 0]]) T.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8).translate(x, 9.2, z), m.wood));
  T.add(mesh(new THREE.BoxGeometry(6.8, 0.25, 6.8).translate(0, 10.2, 0), m.wood));
  for (const y of [3, 6]) T.add(mesh(new THREE.BoxGeometry(0.4, 1.0, 0.1).translate(0, y, 3.02), m.dark, false));
  const tc = crenellations(6, 7.6, 6.1, 0.4); if (tc) T.add(mesh(tc, m.mud));
  T.position.set(W / 2 + 3.5, 0, -2); grp.add(T);
  // well in the market square
  const wl = new THREE.Group();
  wl.add(mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.9, 14, 1, true).translate(0, 0.45, 0), m.mud));
  wl.add(mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.05, 14).translate(0, 0.6, 0), new THREE.MeshStandardMaterial({ color: 0x1a2a28, roughness: 0.1 })));
  for (const x of [-1.1, 1.1]) wl.add(mesh(new THREE.BoxGeometry(0.15, 2.0, 0.15).translate(x, 1.0, 0), m.wood));
  wl.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4).rotateZ(Math.PI / 2).translate(0, 1.9, 0), m.wood));
  wl.position.set(-3, 0, D / 2 + 8); grp.add(wl);
  grp.userData.colliders = [
    { type: 'box', x: 0, z: 0.3, hw: W / 2 + 0.2, hd: D / 2 + 2.4 },
    { type: 'box', x: W / 2 + 3.5, z: -2, hw: 2.3, hd: 2.3 },
    { type: 'circle', x: -3, z: D / 2 + 8, r: 1.5 },
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

// ---------------------------------------------------------------- ruined Sasanian palace vault (brick barrel vault, half collapsed)
export function palaceVault() {
  const m = mats(), grp = new THREE.Group();
  const span = 6, H = 4.5, L = 9, T = 0.8;
  const s = new THREE.Shape(), N = 16;
  for (let i = 0; i <= N; i++) { const a = Math.PI * i / N; s.lineTo(Math.cos(a) * (span / 2 + T), H + Math.sin(a) * (span / 2 + T) * 0.9); }
  s.lineTo(-(span / 2 + T), 0); s.lineTo(-span / 2, 0);
  for (let i = N; i >= 0; i--) { const a = Math.PI * i / N; s.lineTo(Math.cos(a) * span / 2, H + Math.sin(a) * span / 2 * 0.9); }
  s.lineTo(span / 2, 0); s.lineTo(span / 2 + T, 0);
  const v = new THREE.ExtrudeGeometry(s, { depth: L * 0.6, bevelEnabled: false, curveSegments: 2 }); v.translate(0, 0, -L / 2);
  grp.add(mesh(v, m.mud));
  // the far half has fallen: two wall stubs and a rubble field
  for (const sx of [-1, 1]) grp.add(mesh(new THREE.BoxGeometry(T, H * 0.7, L * 0.4).translate(sx * (span / 2 + T / 2), H * 0.35, L * 0.3), m.mud));
  const rub = [], rnd = mulberry32(7);
  for (let i = 0; i < 40; i++) { const z = 0.3 + rnd() * 0.6; const g = new THREE.BoxGeometry(0.6 + rnd(), 0.3 + rnd() * 0.4, 0.5 + rnd() * 0.6).rotateY(rnd() * 3).rotateX((rnd() - 0.5) * 0.6); g.translate((rnd() - 0.5) * (span + 2), 0.2, L * (z - 0.4) + 2); rub.push(g); }
  grp.add(mesh(mergeGeometries(rub), m.mud));
  // stucco frieze fragment over the entrance
  grp.add(mesh(new THREE.BoxGeometry(span + 2 * T, 0.6, 0.2).translate(0, H + span / 2 * 0.9 + 0.3, -L / 2 - 0.05), m.plaster));
  grp.userData.colliders = [
    { type: 'box', x: -(span / 2 + T / 2), z: 0, hw: T / 2 + 0.2, hd: L / 2 },
    { type: 'box', x: span / 2 + T / 2, z: 0, hw: T / 2 + 0.2, hd: L / 2 },
  ];
  return grp;
}

// ---------------------------------------------------------------- beehive brick kiln
export function kiln() {
  const m = mats(), grp = new THREE.Group();
  grp.add(mesh(domeGeo(2.6, 3.4, 20), m.fired));
  grp.add(mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.4, 10).translate(0, 3.8, 0), m.fired));
  // soot-blackened chimney lip and a scorched apron in front of the stoke-hole
  grp.add(mesh(new THREE.CylinderGeometry(0.56, 0.52, 0.3, 10).translate(0, 4.45, 0), m.soot));
  const apron = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }));
  apron.position.set(0, 0.04, 3.2); grp.add(apron);
  // stoke-hole: a brick arch around a glowing mouth
  const arch = mesh(new THREE.TorusGeometry(0.62, 0.16, 6, 12, Math.PI).translate(0, 0.6, 0), m.soot); arch.position.z = 2.42; grp.add(arch);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 1.1, 0.25), toneMapped: false }));
  hole.position.set(0, 0.6, 2.45); grp.add(hole);
  grp.userData.chimney = new THREE.Vector3(0, 4.6, 0); grp.userData.mouth = new THREE.Vector3(0, 0.7, 3.0);
  grp.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 2.8 }];
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
  // the caliph's palace in the centre: a broad, stepped audience hall with a low green roof (no pointed dome or finial)
  grp.add(mesh(new THREE.BoxGeometry(30, 14, 30).translate(0, 7, 0), m.plaster, false));
  grp.add(mesh(new THREE.BoxGeometry(20, 6, 20).translate(0, 17, 0), m.plaster, false));
  const gd = new THREE.MeshStandardMaterial({ color: 0x2f8f4e, roughness: 0.3, metalness: 0.2 });
  grp.add(mesh(new THREE.SphereGeometry(10, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.32, 1).translate(0, 20, 0), gd, false));
  for (let i = 0; i < 60; i++) { // houses inside
    const a = Math.random() * Math.PI * 2, r = 34 + Math.random() * 22, h = 4 + Math.random() * 6;
    grp.add(mesh(new THREE.BoxGeometry(5 + Math.random() * 5, h, 5 + Math.random() * 5).translate(Math.cos(a) * r, h / 2, Math.sin(a) * r), m.plaster, false));
  }
  return grp;
}
