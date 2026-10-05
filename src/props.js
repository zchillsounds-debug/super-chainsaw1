import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mats, archPath } from './buildings.js';
import { fabricTex } from './textures.js';
import { emberBed } from './ember.js';

function mesh(g, m, cast = true) { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; return o; }
const lathe = (pts, seg = 12) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb347, toneMapped: false });

// Pierced brass lantern on a post; returns group with userData.lightPos.
export function lanternPost() {
  const m = mats(), g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.2, 6).translate(0, 1.6, 0), m.wood));
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06).translate(0.4, 3.1, 0), m.wood));
  const body = lathe([[0, 0], [0.18, 0.05], [0.22, 0.25], [0.16, 0.45], [0.06, 0.55], [0.03, 0.7]], 8);
  const brass = new THREE.MeshStandardMaterial({ color: 0xc89b45, metalness: 0.9, roughness: 0.35, emissive: 0xffa040, emissiveIntensity: 0.0 });
  const l = mesh(body, brass); l.position.set(0.75, 2.35, 0); g.add(l);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.2, 0.45), toneMapped: false }));
  glow.position.set(0.75, 2.55, 0); g.add(glow);
  g.userData.lightPos = new THREE.Vector3(0.75, 2.5, 0);
  return g;
}

export function firePit() {
  const m = mats(), g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2;
    const s = mesh(new THREE.DodecahedronGeometry(0.28, 0), m.stone); s.position.set(Math.cos(a) * 0.8, 0.12, Math.sin(a) * 0.8); s.rotation.set(a, a * 2, 0); g.add(s);
  }
  for (let i = 0; i < 4; i++) {
    const lg = mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 5), m.wood); lg.rotation.z = Math.PI / 2 - 0.3; lg.rotation.y = i * Math.PI / 2; lg.position.y = 0.2; g.add(lg);
  }
  g.add(new THREE.Mesh(new THREE.CircleGeometry(0.6, 16).rotateX(-Math.PI / 2).translate(0, 0.03, 0), emberBed()));
  g.userData.firePos = new THREE.Vector3(0, 0.4, 0);
  return g;
}

export function tent(color = '#6b2a20') {
  const g = new THREE.Group(), m = mats();
  const cloth = new THREE.MeshStandardMaterial({ map: fabricTex(color, '#d6b26a'), side: THREE.DoubleSide, roughness: 0.95 });
  // Bedouin black-tent style: sagging roof between poles
  const geo = new THREE.PlaneGeometry(6, 4.5, 12, 8);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const sag = Math.cos(x / 3 * Math.PI * 1.5) * 0.25 + Math.abs(y) * 0.5;
    p.setZ(i, 2.4 - sag - (Math.abs(y) > 2 ? 0.9 : 0));
  }
  geo.rotateX(-Math.PI / 2); geo.computeVertexNormals();
  // flip sign since rotateX moves Z->-Y; fix heights
  const pp = geo.attributes.position; for (let i = 0; i < pp.count; i++) pp.setY(i, Math.abs(pp.getY(i)));
  geo.computeVertexNormals();
  g.add(mesh(geo, cloth));
  const back = new THREE.PlaneGeometry(6, 1.6).translate(0, 0.8, -2.25);
  g.add(mesh(back, cloth));
  for (const x of [-2.8, 0, 2.8]) for (const z of [-2.1, 2.1]) g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3).translate(x, 1.15, z * 0.95), m.wood));
  // rug
  const rug = new THREE.MeshStandardMaterial({ map: fabricTex('#8a1f2a', '#e0c070'), roughness: 1 });
  g.add(mesh(new THREE.PlaneGeometry(3, 2).rotateX(-Math.PI / 2).translate(0, 0.03, 0), rug, false));
  return g;
}

export function jar(color = 0xa8643c, s = 1) {
  const g = lathe([[0, 0], [0.22, 0.02], [0.38, 0.3], [0.36, 0.6], [0.16, 0.85], [0.12, 0.95], [0.17, 1.0]], 12);
  return mesh(g.scale(s, s, s), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
}

export function crate() {
  const m = mats();
  return mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9).translate(0, 0.35, 0), m.wood);
}

export function marketStall(color) {
  const m = mats(), g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(3, 0.9, 1.4).translate(0, 0.45, 0), m.wood));
  for (const x of [-1.4, 1.4]) for (const z of [-0.65, 0.65]) g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6).translate(x, 1.3, z), m.wood));
  const cloth = new THREE.MeshStandardMaterial({ map: fabricTex(color, '#f0e0b0'), side: THREE.DoubleSide, roughness: 0.9 });
  const cg = new THREE.PlaneGeometry(3.4, 1.9, 8, 2); const cp = cg.attributes.position;
  for (let i = 0; i < cp.count; i++) cp.setZ(i, -Math.cos(cp.getX(i) / 3.4 * Math.PI * 3) * 0.06);
  cg.computeVertexNormals();
  const c = mesh(cg, cloth); c.rotation.x = -Math.PI / 2 + 0.15; c.position.y = 2.6; g.add(c);
  // wares: spice mounds & fruit
  const spices = [0xc0392b, 0xe67e22, 0xf1c40f, 0x7d5a3c, 0x6b8e23];
  for (let i = 0; i < 5; i++) {
    const b = mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.15, 10), m.wood); b.position.set(-1.1 + i * 0.55, 0.97, 0.2); g.add(b);
    const s = mesh(new THREE.ConeGeometry(0.2, 0.22, 10), new THREE.MeshStandardMaterial({ color: spices[i], roughness: 1 })); s.position.set(-1.1 + i * 0.55, 1.15, 0.2); g.add(s);
  }
  return g;
}

export function cart() {
  const m = mats(), g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.15, 1.3).translate(0, 0.8, 0), m.wood));
  for (const z of [-0.65, 0.65]) g.add(mesh(new THREE.BoxGeometry(2.2, 0.4, 0.08).translate(0, 1.05, z), m.wood));
  for (const z of [-0.75, 0.75]) {
    const w = mesh(new THREE.TorusGeometry(0.55, 0.07, 6, 16), m.wood); w.position.set(0, 0.58, z); g.add(w);
    for (let i = 0; i < 4; i++) { const s = mesh(new THREE.BoxGeometry(1.05, 0.05, 0.05), m.wood); s.rotation.z = i * Math.PI / 4; s.position.set(0, 0.58, z); g.add(s); }
  }
  g.add(mesh(new THREE.BoxGeometry(2.0, 0.06, 0.06).translate(2.0, 0.7, 0.3), m.wood));
  g.add(mesh(new THREE.BoxGeometry(2.0, 0.06, 0.06).translate(2.0, 0.7, -0.3), m.wood));
  for (let i = 0; i < 4; i++) { const s = mesh(new THREE.SphereGeometry(0.3, 8, 6).scale(1.2, 0.8, 1), new THREE.MeshStandardMaterial({ color: 0xcfb58a, roughness: 1 })); s.position.set(-0.6 + (i % 2) * 0.7, 1.05, -0.3 + (i >> 1) * 0.6); g.add(s); }
  return g;
}

// Stack of sun-dried and fired bricks at the kiln yard.
export function brickStack(rnd) {
  const m = mats(), g = new THREE.Group(), geos = [];
  const rows = 3 + (rnd() * 4 | 0);
  for (let r = 0; r < rows; r++) for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) {
    const b = new THREE.BoxGeometry(0.34, 0.12, 0.34);
    b.translate(-0.55 + i * 0.37 + (r % 2) * 0.05, 0.06 + r * 0.13, -0.18 + k * 0.37); geos.push(b);
  }
  const fired = new THREE.MeshStandardMaterial({ color: rnd() > 0.5 ? 0xa0593a : 0xc9a172, roughness: 0.95 });
  g.add(mesh(mergeGeometries(geos), fired));
  return g;
}

export function deadTree(rnd) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1 });
  const branch = (len, r, depth) => {
    const o = new THREE.Group();
    const c = mesh(new THREE.CylinderGeometry(r * 0.6, r, len, 5).translate(0, len / 2, 0), mat); o.add(c);
    if (depth > 0) for (let i = 0; i < 2 + (rnd() * 2 | 0); i++) {
      const b = branch(len * (0.55 + rnd() * 0.2), r * 0.6, depth - 1);
      b.position.y = len * (0.6 + rnd() * 0.4); b.rotation.z = (rnd() - 0.5) * 1.6; b.rotation.y = rnd() * 6; o.add(b);
    }
    return o;
  };
  g.add(branch(3, 0.25, 3));
  return g;
}

export function banner(color = '#1d1d1d') {
  const m = mats(), g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 5).translate(0, 2.5, 0), m.wood));
  const cloth = new THREE.MeshStandardMaterial({ map: fabricTex(color, '#a02020', false), side: THREE.DoubleSide, roughness: 0.78, emissive: 0x0a0806 }); // Round 24: a woven sheen, so the black banner never reads as a hole
  const cg = new THREE.PlaneGeometry(1.4, 2.2, 6, 8);
  const cl = mesh(cg, cloth); cl.position.set(0.72, 3.7, 0); g.add(cl);
  g.userData.cloth = cl; g.userData.dynamic = true;
  return g;
}

export function bridge(len = 12) {
  const m = mats(), g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-len / 2, -2); s.lineTo(len / 2, -2); s.lineTo(len / 2, 0.6);
  for (let i = 0; i <= 20; i++) { const t = i / 20; s.lineTo(len / 2 - t * len, 0.6 + Math.sin(t * Math.PI) * 0.6); }
  s.lineTo(-len / 2, -2);
  const hole = new THREE.Path(); archPath(hole, 3.6, 2.2); hole.getPoints().forEach((p, i) => (i === 0 ? hole.moveTo(p.x, p.y - 2) : null));
  const h2 = new THREE.Path(); const tmp = new THREE.Path(); archPath(tmp, 3.6, 2.4); tmp.getPoints().forEach((p, i) => (i === 0 ? h2.moveTo(p.x, p.y - 2.05) : h2.lineTo(p.x, p.y - 2.05)));
  s.holes.push(h2);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 3.4, bevelEnabled: false }).translate(0, 0, -1.7);
  g.add(mesh(geo, m.plaster));
  for (const z of [-1.75, 1.75]) {
    const pg = new THREE.Shape(); pg.moveTo(-len / 2, 0.6);
    for (let i = 0; i <= 20; i++) { const t = i / 20; pg.lineTo(-len / 2 + t * len, 0.6 + Math.sin(t * Math.PI) * 0.6); }
    for (let i = 20; i >= 0; i--) { const t = i / 20; pg.lineTo(-len / 2 + t * len, 1.3 + Math.sin(t * Math.PI) * 0.6); }
    g.add(mesh(new THREE.ExtrudeGeometry(pg, { depth: 0.25, bevelEnabled: false }).translate(0, 0, z - 0.12), m.plaster));
  }
  return g;
}

export function waterwheel() {
  const m = mats(), g = new THREE.Group();
  const wheel = new THREE.Group();
  wheel.add(mesh(new THREE.TorusGeometry(2.6, 0.1, 6, 28), m.wood));
  wheel.add(mesh(new THREE.TorusGeometry(1.6, 0.08, 6, 24), m.wood));
  for (let i = 0; i < 12; i++) {
    const s = mesh(new THREE.BoxGeometry(5.2, 0.1, 0.1), m.wood); s.rotation.z = i / 12 * Math.PI; wheel.add(s);
    const pot = mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0xa0603a, roughness: 0.8 }));
    const a = i / 12 * Math.PI * 2; pot.position.set(Math.cos(a) * 2.7, Math.sin(a) * 2.7, 0); wheel.add(pot);
  }
  wheel.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 1, 8).rotateX(Math.PI / 2), m.wood));
  wheel.position.y = 1.4; g.add(wheel); g.userData.dynamic = true;
  for (const z of [-0.6, 0.6]) g.add(mesh(new THREE.BoxGeometry(0.3, 3.6, 0.3).translate(0, 0.6, z), m.mud));
  g.userData.wheel = wheel;
  return g;
}
