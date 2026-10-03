import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mats } from './buildings.js';
import { mudBrick, fabricTex } from './textures.js';
import { triplanarMaterial } from './triplanar.js';

// Round 15 set dressing: the Nahrawan marshes (reed halls, boats, fish racks, the old weir) and burned al-Karkh
// (gutted houses, charred stalls, the paper-sellers' lane, the scholars' courtyard, the Round City wall).

function mesh(g, m, cast = true) { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; return o; }
const V2 = (x, y) => new THREE.Vector2(x, y);

let RM = null;
export function rmats() {
  if (RM) return RM;
  const mb = mudBrick(), dark = mudBrick([120, 96, 76]);
  for (const t of [mb.map, mb.normalMap, dark.map, dark.normalMap]) t.repeat.set(0.3, 0.3);
  RM = {
    reedMat: new THREE.MeshStandardMaterial({ map: reedMatTex(), roughness: 0.95, side: THREE.DoubleSide }),
    reedRib: new THREE.MeshStandardMaterial({ color: 0xa08452, roughness: 0.95 }),
    reedPale: new THREE.MeshStandardMaterial({ color: 0xcbb07a, roughness: 1 }),
    bitumen: new THREE.MeshStandardMaterial({ color: 0x1c1813, roughness: 0.38, metalness: 0.05, side: THREE.DoubleSide }),
    pole: new THREE.MeshStandardMaterial({ color: 0x6a5236, roughness: 0.9 }),
    fish: new THREE.MeshStandardMaterial({ color: 0x9aa0a0, roughness: 0.35, metalness: 0.4 }),
    net: new THREE.MeshStandardMaterial({ map: netTex(), alphaTest: 0.18, side: THREE.DoubleSide, roughness: 1, color: 0x6a5a40 }),
    // fire-blackened mud brick: soot climbs the walls from the burned roofs
    charred: triplanarMaterial({ map: dark.map, normalMap: dark.normalMap, color: 0x5a4a3e, scale: 0.42, roughness: 1, normalStrength: 1.3, grime: 1.0 }),
    char: new THREE.MeshStandardMaterial({ color: 0x15110e, roughness: 0.92 }),
    ember: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.9, 0.25), toneMapped: false }),
    ash: new THREE.MeshStandardMaterial({ color: 0x5c5650, roughness: 1 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9, side: THREE.DoubleSide }),
    twine: new THREE.MeshStandardMaterial({ color: 0x8a6a40, roughness: 1 }),
    leather: [0x6a3a22, 0x4a2a1a, 0x7a5030, 0x3a2a24, 0x8a3a2a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 })),
    brass: new THREE.MeshStandardMaterial({ color: 0xc89b45, metalness: 0.9, roughness: 0.32 }),
  };
  return RM;
}

function reedMatTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#b89a62'; x.fillRect(0, 0, 128, 128);
  // woven reed matting: alternating over-under strips
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
    const v = (i + j) % 2, l = 150 + ((i * 37 + j * 91) % 40);
    x.fillStyle = `rgb(${l + 30},${l + 6},${l - 50})`;
    if (v) x.fillRect(i * 8, j * 8 + 1, 8, 6); else x.fillRect(i * 8 + 1, j * 8, 6, 8);
    x.fillStyle = 'rgba(60,40,20,0.35)'; if (v) x.fillRect(i * 8, j * 8 + 6, 8, 1); else x.fillRect(i * 8 + 6, j * 8, 1, 8);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(9, 7); t.anisotropy = 4;
  return t;
}
function netTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.strokeStyle = '#fff'; x.lineWidth = 2;
  for (let i = 0; i <= 64; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 64); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke(); }
  // white everywhere, alpha only on the cords: mip levels stay light instead of fading to a dark sheet
  const img = x.getImageData(0, 0, 64, 64); for (let i = 0; i < img.data.length; i += 4) { img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; }
  const t = new THREE.DataTexture(img.data, 64, 64, THREE.RGBAFormat); t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  return t;
}

// ------------------------------------------------------------------ marsh
// Mudhif: the marsh people's long reed guest hall. Arched ribs of bundled reed under woven mats, a latticed front.
export function mudhif(len = 12, w = 6, h = 5) {
  const R = rmats(), g = new THREE.Group();
  const prof = (v) => h * (1 - v * v) ** 0.8; // v in -1..1 across the hall
  // the mat skin
  const skin = new THREE.PlaneGeometry(len, 2, 10, 18); const p = skin.attributes.position;
  for (let i = 0; i < p.count; i++) { const L = p.getX(i), v = p.getY(i); p.setXYZ(i, v * w / 2, prof(v) + 0.05, L); }
  skin.computeVertexNormals(); g.add(mesh(skin, R.reedMat));
  // ribs: a thick bundle arch every metre or so, set just proud of the mats
  const ribs = [];
  const n = Math.max(3, Math.round(len / 1.4));
  for (let k = 0; k <= n; k++) {
    const z = -len / 2 + k * len / n, pts = [];
    for (let s = 0; s <= 12; s++) { const v = -1 + s / 6; pts.push(new THREE.Vector3(v * (w / 2 + 0.08), prof(v) + 0.14, z)); }
    ribs.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.16, 6));
  }
  // ridge and eave bundles running the length
  for (const v of [-0.97, 0, 0.97]) ribs.push(new THREE.CylinderGeometry(0.12, 0.12, len + 0.4, 6).rotateX(Math.PI / 2).translate(v * w / 2, prof(v) + 0.18, 0));
  g.add(mesh(mergeGeometries(ribs), R.reedRib));
  // latticed ends: tall bundle columns with a doorway in the middle of the front
  const lat = [];
  for (const end of [-1, 1]) {
    const z = end * len / 2;
    for (let c = -5; c <= 5; c++) {
      const v = c / 5.6, ht = prof(v);
      if (end === 1 && Math.abs(c) <= 1) { lat.push(new THREE.CylinderGeometry(0.07, 0.07, ht - 2.6, 5).translate(v * w / 2, 2.6 + (ht - 2.6) / 2, z)); continue; }
      lat.push(new THREE.CylinderGeometry(0.09, 0.11, ht, 5).translate(v * w / 2, ht / 2, z));
    }
    for (let r = 1; r < 5; r++) { const y = r * h / 5.4, half = Math.sqrt(Math.max(0, 1 - (y / h) ** 1.25)) * w / 2; if (end === 1 && y < 2.6) { lat.push(new THREE.BoxGeometry(half - 0.9, 0.06, 0.06).translate(-(half + 0.9) / 2, y, z + 0.05), new THREE.BoxGeometry(half - 0.9, 0.06, 0.06).translate((half + 0.9) / 2, y, z + 0.05)); } else lat.push(new THREE.BoxGeometry(half * 2, 0.06, 0.06).translate(0, y, z + end * 0.05)); }
    // the two great bundle pillars flanking the front
    if (end === 1) for (const sx of [-1, 1]) lat.push(new THREE.CylinderGeometry(0.28, 0.36, h * 1.08, 8).translate(sx * (w / 2 + 0.2), h * 0.54, z + 0.1), new THREE.SphereGeometry(0.3, 8, 6).translate(sx * (w / 2 + 0.2), h * 1.08, z + 0.1));
  }
  g.add(mesh(mergeGeometries(lat.map((x) => x.index ? x.toNonIndexed() : x).map((x) => { if (x.attributes.uv) x.deleteAttribute('uv'); return x; })), R.reedPale));
  // dark interior seen through the doorway
  g.add(mesh(new THREE.PlaneGeometry(1.6, 2.5).translate(0, 1.25, len / 2 - 0.3), new THREE.MeshBasicMaterial({ color: 0x0c0806 }), false));
  g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: w / 2 + 0.2, hd: len / 2 + 0.2 }];
  return g;
}

// Mashuf: the marsh canoe, long, narrow and coated black with bitumen, its ends swept up.
export function mashuf(len = 5.5) {
  const R = rmats(), pos = [], idx = [], N = 22, M = 7;
  for (let i = 0; i <= N; i++) {
    const t = i / N * 2 - 1, half = 0.42 * Math.sqrt(Math.max(0.0, 1 - t * t)) + 0.02, depth = 0.34 * Math.sqrt(Math.max(0, 1 - t ** 6)), lift = t ** 4 * 0.55;
    for (let j = 0; j <= M; j++) { const a = Math.PI * j / M; pos.push(Math.cos(a) * half, lift + 0.36 - Math.sin(a) * depth, t * len / 2); }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const g = new THREE.Group(); g.add(mesh(geo, R.bitumen));
  const pole = mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.2, 5).rotateZ(Math.PI / 2).rotateY(Math.PI / 2 - 0.08).translate(0.15, 0.42, 0), R.pole); g.add(pole);
  for (let k = 0; k < 2; k++) g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 6).rotateZ(Math.PI / 2).translate(0, 0.2, -0.9 + k * 0.6), R.reedPale)); // reed bundles in the bilge
  return g;
}

// A frame of poles hung with drying fish.
export function fishRack(rnd) {
  const R = rmats(), g = new THREE.Group(), geos = [], fish = [];
  for (const x of [-1.8, 1.8]) for (const s of [-1, 1]) geos.push(new THREE.CylinderGeometry(0.05, 0.06, 2.3, 5).rotateZ(s * 0.25).translate(x + s * 0.28, 1.1, 0));
  for (const y of [1.95, 1.4]) geos.push(new THREE.CylinderGeometry(0.035, 0.035, 4.2, 5).rotateZ(Math.PI / 2).translate(0, y, 0));
  g.add(mesh(mergeGeometries(geos), R.pole));
  for (const y of [1.95, 1.4]) for (let i = 0; i < 12; i++) {
    const f = new THREE.SphereGeometry(0.1, 6, 4).scale(0.45, 1.5, 0.16).translate(-1.6 + i * 0.29 + rnd() * 0.05, y - 0.2, 0);
    fish.push(f); fish.push(new THREE.ConeGeometry(0.07, 0.1, 4).rotateX(Math.PI).scale(1, 1, 0.3).translate(-1.6 + i * 0.29, y - 0.4, 0));
  }
  g.add(mesh(mergeGeometries(fish.map((x) => { x.deleteAttribute('uv'); return x.index ? x.toNonIndexed() : x; })), R.fish));
  g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 2, hd: 0.4 }];
  return g;
}

// Fishing net hung between poles to dry.
export function netPoles() {
  const R = rmats(), g = new THREE.Group();
  for (const x of [-1.6, 1.6]) g.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 5).translate(x, 1.3, 0), R.pole));
  const ng = new THREE.PlaneGeometry(3.2, 1.8, 8, 4); const p = ng.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / 3.2 + 0.5) * Math.PI) * 0.25 * (0.6 - p.getY(i) / 3));
  ng.computeVertexNormals();
  g.add(mesh(ng.translate(0, 1.5, 0), R.net, false));
  g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 1.7, hd: 0.2 }];
  return g;
}

// Stacked bundles of cut reed, ready for building.
export function reedStack(rnd) {
  const R = rmats(), geos = [];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) geos.push(new THREE.CylinderGeometry(0.22, 0.22, 3 + rnd() * 0.6, 7).rotateZ(Math.PI / 2).translate(0, 0.22 + r * 0.38, -0.66 + i * 0.44 + r * 0.22));
  const g = new THREE.Group(); g.add(mesh(mergeGeometries(geos), R.reedPale));
  g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 1.7, hd: 0.9 }];
  return g;
}

// The old weir on the Nahrawan: a Sasanian brick sluice with timber gates, across the channel by Rawh's landing.
export function weir() {
  const m = mats(), R = rmats(), g = new THREE.Group();
  const piers = [];
  for (let i = 0; i < 4; i++) piers.push(new THREE.BoxGeometry(2.2, 5.5, 5).translate(-9 + i * 6, 2.0, 0));
  g.add(mesh(mergeGeometries(piers), m.fired));
  // cutwaters on the upstream side
  const cw = []; for (let i = 0; i < 4; i++) cw.push(new THREE.CylinderGeometry(1.1, 1.1, 5.5, 3).rotateY(Math.PI / 6).translate(-9 + i * 6, 2.0, -2.9));
  g.add(mesh(mergeGeometries(cw), m.fired));
  // timber deck and gates
  g.add(mesh(new THREE.BoxGeometry(21, 0.35, 3.2).translate(-0, 4.85, 0), m.wood));
  for (let i = 0; i < 3; i++) {
    const x = -6 + i * 6;
    for (let k = 0; k < 6; k++) g.add(mesh(new THREE.BoxGeometry(3.8, 0.42, 0.18).translate(x, 0.2 + k * 0.45 + (i === 1 ? 1.4 : 0), 0.6), m.wood));
    for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.22, 4.8, 0.3).translate(x + sx * 1.95, 2.4, 0.6), R.pole));
  }
  // windlass posts on the deck
  for (let i = 0; i < 3; i++) { const x = -6 + i * 6; g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 6).rotateZ(Math.PI / 2).translate(x, 5.6, 0.2), R.pole)); for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2).translate(x + sx * 1.3, 5.6, 0.2), m.wood)); }
  g.userData.colliders = [{ type: 'box', x: -1.5, z: 0, hw: 11, hd: 3.6 }];
  return g;
}

// ------------------------------------------------------------------ al-Karkh
// A house gutted by the siege fires: blackened walls of uneven height, no roof, charred beams fallen inside.
export function burnedHouse(rnd, w, d, h) {
  const R = rmats(), g = new THREE.Group(), walls = [], beams = [];
  const wall = (len, ht, x, z, along) => {
    // a ragged top: the wall is built from a few vertical sections of different heights
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const sl = len / n, hh = Math.max(0.6, ht * (0.55 + rnd() * 0.5) - (rnd() < 0.2 ? ht * 0.4 : 0)), o = -len / 2 + sl * (i + 0.5);
      walls.push(new THREE.BoxGeometry(along ? sl + 0.02 : 0.45, hh, along ? 0.45 : sl + 0.02).translate(along ? x + o : x, hh / 2, along ? z : z + o));
    }
  };
  wall(w, h, 0, d / 2, true); wall(w, h, 0, -d / 2, true); wall(d, h, w / 2, 0, false); wall(d, h, -w / 2, 0, false);
  g.add(mesh(mergeGeometries(walls), R.charred));
  for (let i = 0; i < 4; i++) {
    const L = w * (0.7 + rnd() * 0.4), b = new THREE.CylinderGeometry(0.11, 0.13, L, 6).rotateZ(Math.PI / 2);
    b.rotateZ((rnd() - 0.5) * 0.7).rotateY((rnd() - 0.5) * 0.8).translate((rnd() - 0.5) * w * 0.3, 0.2 + rnd() * h * 0.45, (rnd() - 0.5) * d * 0.6);
    beams.push(b);
  }
  // stubs of the roof beams still in the wall tops
  for (let x = -w / 2 + 0.7; x < w / 2 - 0.4; x += 1.1) if (rnd() < 0.5) beams.push(new THREE.CylinderGeometry(0.09, 0.1, 0.8, 6).rotateX(Math.PI / 2).translate(x, h * 0.62, d / 2 + 0.2));
  g.add(mesh(mergeGeometries(beams), R.char));
  // ash and rubble heaped inside
  g.add(mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(w * 0.3, 0.5, d * 0.3).translate((rnd() - 0.5), 0, (rnd() - 0.5)), R.ash, false));
  return g;
}

// A market stall that burned where it stood.
export function burnedStall(rnd) {
  const R = rmats(), g = new THREE.Group(), geos = [];
  geos.push(new THREE.BoxGeometry(3, 0.7, 1.4).translate(0, 0.35, 0).rotateZ((rnd() - 0.5) * 0.12));
  for (const x of [-1.4, 1.4]) for (const z of [-0.65, 0.65]) { const ht = rnd() < 0.35 ? 0.8 + rnd() : 2.6; geos.push(new THREE.CylinderGeometry(0.06, 0.07, ht, 5).translate(x, ht / 2, z)); }
  geos.push(new THREE.BoxGeometry(3.2, 0.08, 0.1).rotateZ(0.5).translate(0.4, 1.3, 0.7));
  g.add(mesh(mergeGeometries(geos), R.char));
  // a scrap of scorched awning hanging from the one beam left
  const cloth = new THREE.MeshStandardMaterial({ map: fabricTex(['#3a1a14', '#2a2420', '#3a3020'][Math.floor(rnd() * 3)], '#5a4a30'), side: THREE.DoubleSide, roughness: 1 });
  const cg = new THREE.PlaneGeometry(1.6, 1.2, 4, 3); const p = cg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 2) * 0.08);
  cg.computeVertexNormals(); const c = mesh(cg, cloth); c.position.set(-1.0, 2.0, -0.65); c.rotation.set(0.05, 0.1, 0.12); g.add(c);
  g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 1.6, hd: 0.8 }];
  return g;
}
export function beamPile(rnd) {
  const R = rmats(), geos = [];
  for (let i = 0; i < 6; i++) geos.push(new THREE.CylinderGeometry(0.12, 0.14, 2.4 + rnd() * 1.6, 6).rotateZ(Math.PI / 2 + (rnd() - 0.5) * 0.3).rotateY(rnd() * 3).translate((rnd() - 0.5) * 0.6, 0.15 + i * 0.12, (rnd() - 0.5) * 0.6));
  const g = new THREE.Group(); g.add(mesh(mergeGeometries(geos), R.char));
  g.add(mesh(new THREE.ConeGeometry(1.3, 0.35, 10).translate(0, 0.1, 0), R.ash, false));
  g.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 1.1 }];
  return g;
}
// Bundles of paper tied with twine, as the warraqin stacked them outside their shops.
export function paperStack(rnd, burnt = false) {
  const R = rmats(), g = new THREE.Group(), geos = [], ties = [];
  const n = 2 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) { const w = 0.5 + rnd() * 0.15, y = 0.11 + i * 0.22; geos.push(new THREE.BoxGeometry(w, 0.2, 0.36).rotateY((rnd() - 0.5) * 0.4).translate(0, y, 0)); ties.push(new THREE.BoxGeometry(0.03, 0.21, 0.38).translate(0, y, 0), new THREE.BoxGeometry(w + 0.01, 0.21, 0.03).translate(0, y, 0)); }
  g.add(mesh(mergeGeometries(geos), burnt ? R.char : R.paper));
  g.add(mesh(mergeGeometries(ties), R.twine, false));
  return g;
}
// A shop front of the paper-sellers' lane: a shallow open room, shelves of bundles, sheets drying on a line.
export function warraqShop(rnd) {
  const m = mats(), R = rmats(), g = new THREE.Group();
  const walls = [new THREE.BoxGeometry(4.6, 3.4, 0.4).translate(0, 1.7, -1.6), new THREE.BoxGeometry(0.4, 3.4, 3.2).translate(-2.1, 1.7, 0), new THREE.BoxGeometry(0.4, 3.4, 3.2).translate(2.1, 1.7, 0)];
  g.add(mesh(mergeGeometries(walls), rnd() < 0.5 ? R.charred : m.plaster));
  // the roof burned away; a scorched awning still hangs over the counter
  g.add(mesh(new THREE.BoxGeometry(4.8, 0.2, 0.3).translate(0, 3.4, 1.4), R.char));
  { const cl = new THREE.MeshStandardMaterial({ map: fabricTex(['#5a3a24', '#3a3a30', '#6a4a2a'][Math.floor(rnd() * 3)], '#c8b088'), side: THREE.DoubleSide, roughness: 1 });
    const cg = new THREE.PlaneGeometry(4.4, 1.6, 6, 2); cg.rotateX(-Math.PI / 2 + 0.35).translate(0, 3.0, 1.9); g.add(mesh(cg, cl)); }
  const shelves = []; for (let k = 0; k < 3; k++) shelves.push(new THREE.BoxGeometry(3.6, 0.06, 0.5).translate(0, 0.8 + k * 0.75, -1.2));
  g.add(mesh(mergeGeometries(shelves), m.wood));
  for (let k = 0; k < 3; k++) for (let i = 0; i < 5; i++) if (rnd() < 0.7) { const s = paperStack(rnd, rnd() < 0.3); s.scale.setScalar(0.55); s.position.set(-1.4 + i * 0.7, 0.83 + k * 0.75, -1.2); g.add(s); }
  // sheets hung on a line across the front
  const sheets = []; for (let i = 0; i < 6; i++) sheets.push(new THREE.PlaneGeometry(0.42, 0.56).translate(-1.5 + i * 0.6, 2.4, 1.3).rotateY((rnd() - 0.5) * 0.2));
  g.add(mesh(mergeGeometries(sheets), R.paper, false));
  g.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 4.2, 3).rotateZ(Math.PI / 2).translate(0, 2.7, 1.3), R.twine, false));
  g.userData.colliders = [{ type: 'box', x: 0, z: -1.6, hw: 2.4, hd: 0.3 }, { type: 'box', x: -2.1, z: 0, hw: 0.25, hd: 1.6 }, { type: 'box', x: 2.1, z: 0, hw: 0.25, hd: 1.6 }];
  return g;
}
// A scholar's table: open codex, inkwell, an astrolabe on its stand.
export function scholarTable() {
  const m = mats(), R = rmats(), g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.08, 1.0).translate(0, 0.72, 0), m.wood));
  for (const x of [-1, 1]) for (const z of [-0.4, 0.4]) g.add(mesh(new THREE.BoxGeometry(0.08, 0.72, 0.08).translate(x, 0.36, z), m.wood));
  const book = new THREE.Group(); book.add(mesh(new THREE.BoxGeometry(0.5, 0.04, 0.36).translate(0, 0.78, 0), R.leather[0]));
  for (const s of [-1, 1]) { const pg = mesh(new THREE.BoxGeometry(0.23, 0.02, 0.32).translate(s * 0.12, 0.81, 0), R.paper); pg.rotation.z = -s * 0.08; book.add(pg); }
  book.position.x = -0.4; g.add(book);
  const ast = new THREE.Group(); ast.add(mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 24), R.brass), mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 20).rotateX(Math.PI / 2), R.brass));
  ast.position.set(0.6, 1.08, 0); g.add(ast); g.add(mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.32, 6).translate(0.6, 0.9, 0), R.brass));
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 8).translate(0.1, 0.8, 0.25), R.leather[3]));
  g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 1.15, hd: 0.55 }];
  return g;
}
// Shelving of bound codices and rolled scrolls.
export function bookShelf(rnd) {
  const m = mats(), R = rmats(), g = new THREE.Group();
  const frame = [new THREE.BoxGeometry(2.4, 0.06, 0.5).translate(0, 2.2, 0)];
  for (let k = 0; k < 4; k++) frame.push(new THREE.BoxGeometry(2.4, 0.05, 0.5).translate(0, 0.12 + k * 0.55, 0));
  for (const x of [-1.2, 1.2]) frame.push(new THREE.BoxGeometry(0.07, 2.25, 0.5).translate(x, 1.12, 0));
  g.add(mesh(mergeGeometries(frame), m.wood));
  for (let k = 0; k < 4; k++) {
    let x = -1.1;
    while (x < 1.05) {
      if (rnd() < 0.35) { const n = 3; for (let i = 0; i < n; i++) g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 6).rotateX(Math.PI / 2).translate(x + 0.06, 0.2 + k * 0.55 + i * 0.1, 0), R.paper)); x += 0.16; continue; }
      const th = 0.06 + rnd() * 0.05, ht = 0.3 + rnd() * 0.12; // codices lie flat in short stacks, as they were kept
      const st = 2 + Math.floor(rnd() * 3); for (let i = 0; i < st; i++) g.add(mesh(new THREE.BoxGeometry(0.3, th, ht).translate(x + 0.15, 0.15 + k * 0.55 + i * th, 0), R.leather[Math.floor(rnd() * 5)]));
      x += 0.36;
    }
  }
  g.userData.colliders = [{ type: 'box', x: 0, z: 0, hw: 1.25, hd: 0.3 }];
  return g;
}
// The stack the buyer's men built to burn the Pages: faggots of wood, paper bundles on top.
export function pyre(rnd) {
  const m = mats(), R = rmats(), g = new THREE.Group(), geos = [];
  for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, r = rnd() * 1.4; geos.push(new THREE.CylinderGeometry(0.07, 0.09, 1.8 + rnd(), 5).rotateZ(Math.PI / 2 - 0.2 - rnd() * 0.5).rotateY(a).translate(Math.cos(a) * r, 0.2 + rnd() * 0.9, Math.sin(a) * r)); }
  g.add(mesh(mergeGeometries(geos), m.wood));
  for (let i = 0; i < 5; i++) { const s = paperStack(rnd); s.position.set((rnd() - 0.5) * 1.2, 1.1, (rnd() - 0.5) * 1.2); s.rotation.y = rnd() * 3; g.add(s); }
  g.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 1.8 }];
  return g;
}
// A plain enclosure wall with a doorway (the khan where Salim's company lodges in al-Karkh).
export function compoundWall(len, h = 3.6, door = 0) {
  const m = mats(), geos = [];
  if (door) { const s = (len - door) / 2; geos.push(new THREE.BoxGeometry(s, h, 0.6).translate(-(door + s) / 2, h / 2, 0), new THREE.BoxGeometry(s, h, 0.6).translate((door + s) / 2, h / 2, 0), new THREE.BoxGeometry(door + 0.4, 0.8, 0.7).translate(0, h - 0.4, 0)); }
  else geos.push(new THREE.BoxGeometry(len, h, 0.6).translate(0, h / 2, 0));
  geos.push(new THREE.BoxGeometry(len + 0.1, 0.25, 0.75).translate(0, h + 0.12, 0));
  const g = new THREE.Group(); g.add(mesh(mergeGeometries(geos), m.plaster));
  g.userData.colliders = door ? [{ type: 'box', x: -(len + door) / 4, z: 0, hw: (len - door) / 4, hd: 0.35 }, { type: 'box', x: (len + door) / 4, z: 0, hw: (len - door) / 4, hd: 0.35 }] : [{ type: 'box', x: 0, z: 0, hw: len / 2, hd: 0.35 }];
  return g;
}
// A cloth awning on four posts (the scholars' courtyard; the khan).
export function awning(color = '#2f5d7c', w = 4, d = 3) {
  const m = mats(), g = new THREE.Group();
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 5).translate(x, 1.4, z), m.wood));
  const cloth = new THREE.MeshStandardMaterial({ map: fabricTex(color, '#e8d8a8'), side: THREE.DoubleSide, roughness: 0.9 });
  const cg = new THREE.PlaneGeometry(w + 0.4, d + 0.4, 8, 6); const p = cg.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, -0.18 * Math.cos(p.getX(i) / (w + 0.4) * Math.PI) * Math.cos(p.getY(i) / (d + 0.4) * Math.PI));
  cg.computeVertexNormals(); const c = mesh(cg, cloth); c.rotation.x = -Math.PI / 2; c.position.y = 2.85; g.add(c);
  return g;
}
// A stretch of the Round City's outer wall with its round towers, for the skyline north-east of al-Karkh.
export function cityWall(len = 160) {
  const m = mats(), geos = [], tow = [];
  geos.push(new THREE.BoxGeometry(len, 18, 7).translate(0, 9, 0));
  // broad half-round towers, barely taller than the curtain wall
  for (let x = -len / 2 + 7; x <= len / 2 - 7; x += 16) { if (Math.abs(x) < 14) continue; tow.push(new THREE.CylinderGeometry(5.5, 6, 19.5, 18).translate(x, 9.75, 3.5)); }
  // crenellated parapet blocks
  for (let x = -len / 2; x < len / 2; x += 2.4) geos.push(new THREE.BoxGeometry(1.4, 1.4, 1).translate(x, 18.7, 3));
  const g = new THREE.Group(); g.add(mesh(mergeGeometries(geos), m.mud, false)); g.add(mesh(mergeGeometries(tow), m.mud, false));
  // the gatehouse (the Kufa road gate): a deep, plain portal between two big towers
  g.add(mesh(new THREE.BoxGeometry(22, 21, 12).translate(0, 10.5, 4), m.mud, false));
  for (let x = -10; x < 10.5; x += 2.4) g.add(mesh(new THREE.BoxGeometry(1.4, 1.4, 1).translate(x, 21.7, 9.6), m.mud, false));
  g.add(mesh(new THREE.BoxGeometry(5, 9, 0.5).translate(0, 4.5, 10.3), new THREE.MeshBasicMaterial({ color: 0x0a0806 }), false));
  return g;
}
// A low well-head with a timber frame and bucket (marks the descent into the qanats in the new regions).
export function wellHead() {
  const m = mats(), g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.8, 16, 1, true).translate(0, 0.4, 0), m.stone));
  g.add(mesh(new THREE.TorusGeometry(0.98, 0.1, 6, 20).rotateX(Math.PI / 2).translate(0, 0.8, 0), m.stone));
  g.add(mesh(new THREE.CircleGeometry(0.9, 16).rotateX(-Math.PI / 2).translate(0, 0.3, 0), new THREE.MeshBasicMaterial({ color: 0x050403 }), false));
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.14, 2, 0.14).translate(s * 0.95, 1, 0), m.wood));
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.1, 6).rotateZ(Math.PI / 2).translate(0, 1.9, 0), m.wood));
  g.add(mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.26, 8).translate(0.2, 1.2, 0), m.wood));
  g.userData.colliders = [{ type: 'circle', x: 0, z: 0, r: 1.15 }];
  return g;
}
