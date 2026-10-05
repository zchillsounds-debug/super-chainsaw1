import * as THREE from 'three';
import { fabricTex } from './textures.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const lathe = (pts, seg = 14) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
// Fresnel rim light so characters read clearly against the bright desert.
export function addRim(mat, color = new THREE.Color(1.0, 0.75, 0.45), power = 3.0, strength = 0.6) {
  if (mat.userData.rim) return mat;
  mat.userData.rim = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev && prev(sh, r);
    sh.uniforms.uRimC = { value: color.clone().multiplyScalar(strength) };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRimC;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float rim = 1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0);
          totalEmissiveRadiance += uRimC * pow(rim, ${power.toFixed(1)}); }`);
  };
  mat.customProgramCacheKey = () => 'rim' + (prev ? prev.toString() : '');
  return mat;
}
function mesh(g, m) { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; }
function limb(len, r0, r1, mat) {
  const g = new THREE.CapsuleGeometry((r0 + r1) / 2, len - (r0 + r1), 4, 8).translate(0, -len / 2, 0);
  const p = g.attributes.position; // taper
  for (let i = 0; i < p.count; i++) { const t = -p.getY(i) / len; const k = THREE.MathUtils.lerp(r0, r1, t) / ((r0 + r1) / 2); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
  g.computeVertexNormals();
  return mesh(g, mat);
}
function pivot(parent, x, y, z) { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; }

const steel = new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 0.9, roughness: 0.3 });
let _lam = null;
function lamellar() {
  if (_lam) return _lam;
  const W = 256, c = document.createElement('canvas'); c.width = c.height = W; const x = c.getContext('2d');
  const hc = document.createElement('canvas'); hc.width = hc.height = W; const hx = hc.getContext('2d');
  x.fillStyle = '#222'; x.fillRect(0, 0, W, W); hx.fillStyle = '#000'; hx.fillRect(0, 0, W, W);
  const pw = 16, ph = 32;
  for (let r = 0; r < W / ph * 2 + 1; r++) for (let k = -1; k < W / pw + 1; k++) {
    const px = k * pw + (r % 2) * pw / 2, py = r * ph * 0.5 - 8;
    const g = x.createLinearGradient(px, 0, px + pw, 0); g.addColorStop(0, '#5a5e62'); g.addColorStop(0.5, '#c8ccd0'); g.addColorStop(1, '#4a4e52');
    x.fillStyle = g; x.beginPath(); x.roundRect(px + 1, py + 1, pw - 2, ph - 2, [2, 2, 7, 7]); x.fill();
    x.fillStyle = '#8a5a2a'; x.fillRect(px + pw / 2 - 1, py + 4, 2, 3); // leather lacing
    hx.fillStyle = '#ddd'; hx.beginPath(); hx.roundRect(px + 1, py + 1, pw - 2, ph - 2, [2, 2, 7, 7]); hx.fill();
  }
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(3, 2);
  const d = hx.getImageData(0, 0, W, W).data, nc = document.createElement('canvas'); nc.width = nc.height = W; const nx = nc.getContext('2d'), img = nx.createImageData(W, W);
  const H = (i, j) => d[(((j + W) % W) * W + ((i + W) % W)) * 4] / 255;
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const dx = (H(i - 1, j) - H(i + 1, j)) * 3, dy = (H(i, j - 1) - H(i, j + 1)) * 3, l = Math.hypot(dx, dy, 1), k = (j * W + i) * 4; img.data[k] = (dx / l * .5 + .5) * 255; img.data[k + 1] = (dy / l * .5 + .5) * 255; img.data[k + 2] = (1 / l * .5 + .5) * 255; img.data[k + 3] = 255; }
  nx.putImageData(img, 0, 0);
  const normal = new THREE.CanvasTexture(nc); normal.wrapS = normal.wrapT = THREE.RepeatWrapping; normal.repeat.set(3, 2);
  _lam = { map, normal };
  return _lam;
}
const goldM = new THREE.MeshStandardMaterial({ color: 0xb8893a, metalness: 0.85, roughness: 0.48 });
const leather = new THREE.MeshStandardMaterial({ color: 0x4a2e1a, roughness: 0.75 });

// Straight double-edged sword (sayf), the blade of the early Abbasid period.
function swordRaw() {
  const s = new THREE.Shape();
  s.moveTo(-0.032, 0); s.lineTo(-0.028, 0.88); s.lineTo(0, 1.0); s.lineTo(0.028, 0.88); s.lineTo(0.032, 0); s.closePath();
  const blade = new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.008, bevelSegments: 1 });
  const g = new THREE.Group();
  const b = mesh(blade, steel); b.position.set(0, 0.12, -0.003); g.add(b);
  g.add(mesh(new THREE.BoxGeometry(0.004, 0.7, 0.014).translate(0, 0.5, 0.008), steel)); // fuller
  g.add(mesh(new THREE.BoxGeometry(0.2, 0.03, 0.05).translate(0, 0.11, 0), goldM));
  g.add(mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.2, 8).translate(0, 0.0, 0), leather));
  g.add(mesh(new THREE.SphereGeometry(0.035, 8, 6).scale(1, 0.7, 1).translate(0, -0.11, 0), goldM));
  return g;
}
function daggerRaw() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(0.03, 0.34, 4).scale(1, 1, 0.25).translate(0, 0.27, 0), steel));
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.02, 0.03).translate(0, 0.1, 0), leather));
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6).translate(0, 0.03, 0), leather));
  return g;
}
function torchRaw() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.7, 6).translate(0, 0.25, 0), leather));
  const f = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 7).translate(0, 0.7, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.3, 0.3), toneMapped: false }));
  g.add(f);
  return g;
}
function spearRaw() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 6).translate(0, 0.6, 0), leather));
  g.add(mesh(new THREE.ConeGeometry(0.06, 0.35, 4).translate(0, 1.95, 0), steel));
  return g;
}
// Round 20: a foot crossbow (qaws al-rijl): a wooden stock with a short composite prod and its cord
function crossbowRaw() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(0.05, 0.78, 0.06).translate(0, 0.3, 0), leather));
  const prod = mesh(new THREE.TorusGeometry(0.32, 0.02, 5, 16, Math.PI * 0.7), leather); prod.rotation.z = Math.PI / 2 - Math.PI * 0.35; prod.position.y = 0.36; g.add(prod);
  g.add(mesh(new THREE.BoxGeometry(0.58, 0.006, 0.006).translate(0, 0.505, 0.0), new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.9 })));
  g.add(mesh(new THREE.BoxGeometry(0.03, 0.06, 0.08).translate(0, 0.5, 0.03), steel)); // the nut that holds the cord
  return g;
}
// a siege carpenter's wooden mallet
function malletRaw() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.62, 6).translate(0, 0.22, 0), leather));
  g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 8).rotateZ(Math.PI / 2).translate(0, 0.55, 0), new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.85 })));
  return g;
}
function bowRaw() {
  const g = new THREE.Group();
  const c = new THREE.TorusGeometry(0.6, 0.02, 5, 20, Math.PI * 0.9);
  const b = mesh(c, leather); b.rotation.z = Math.PI / 2 - Math.PI * 0.45; g.add(b);
  return g;
}
function shieldRaw() {
  const g = new THREE.Group();
  const d = mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.05, 20).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7a4a24, roughness: 0.6, map: fabricTex('#6b3f1e', '#b08040', false) }));
  g.add(d);
  g.add(mesh(new THREE.TorusGeometry(0.31, 0.03, 6, 24), goldM));
  g.add(mesh(new THREE.SphereGeometry(0.09, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).translate(0, 0, 0.03), steel));
  return g;
}

// Round 23: the Byzantine company's kit. Shields are painted in unit colours with plain bands only (no device that
// could read as a sign): the tall oval skoutarion of the line infantry and the small round shield of the light troops.
// Four colours, each its own material (same shader program as the old round shield).
const UNIT = [['#8a1e18', '#d8cdb0'], ['#1e3a6a', '#d8cdb0'], ['#d8cdb0', '#7a1a14'], ['#b8862a', '#2a1e16']];
function bandTex(field, band, oval) {
  const W = 128, c = document.createElement('canvas'); c.width = c.height = W; const x = c.getContext('2d');
  x.fillStyle = field; x.fillRect(0, 0, W, W);
  // weathering: a little grime and scuffing on the paint
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,240,210'},${Math.random() * 0.07})`; x.fillRect(Math.random() * W, Math.random() * W, 2 + Math.random() * 6, 1 + Math.random() * 3); }
  // a single painted band inside the rim (an inner ring as well read as an archery target)
  x.strokeStyle = band; x.lineWidth = oval ? 10 : 12; x.beginPath(); x.ellipse(W / 2, W / 2, W / 2 - 9, W / 2 - 9, 0, 0, Math.PI * 2); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function byzShieldRaw(oval, k) {
  const g = new THREE.Group(), [field, band] = UNIT[k];
  const face = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, map: bandTex(field, band, oval) });
  const r = oval ? 0.28 : 0.24, sx = oval ? 1.6 : 1; // the forearm runs along local y: the long axis is x
  // a shallow dished board: the disc is domed a little so the light rolls across it
  const disc = new THREE.CylinderGeometry(r, r, 0.04, 28, 1).rotateX(Math.PI / 2), dp = disc.attributes.position;
  for (let i = 0; i < dp.count; i++) { const px = dp.getX(i), py = dp.getY(i), q = (px * px + py * py) / (r * r); dp.setZ(i, dp.getZ(i) + (1 - q) * 0.035); }
  disc.computeVertexNormals(); disc.scale(sx, 1, 1);
  g.add(mesh(disc, face));
  g.add(mesh(new THREE.TorusGeometry(r, 0.018, 6, 32).scale(sx, 1, 1), leather)); // rawhide edging
  g.add(mesh(new THREE.SphereGeometry(oval ? 0.07 : 0.065, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).translate(0, 0, 0.05), steel));
  return g;
}
// the menavlion: a short, very stout pike with a long blade, for stopping horsemen
function pikeRaw() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.034, 0.038, 2.2, 7).translate(0, 0.55, 0), leather));
  g.add(mesh(new THREE.ConeGeometry(0.075, 0.55, 4).scale(1, 1, 0.35).translate(0, 1.92, 0), steel));
  g.add(mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 7).translate(0, 1.64, 0), goldM));
  return g;
}
// a hand siphon of liquid fire: a bronze tube with a nozzle, the flame burning at its mouth
function siphonRaw() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.62, 8).translate(0, 0.22, 0), goldM));
  g.add(mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.16, 8).translate(0, 0.6, 0), goldM));
  g.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 8).translate(0, 0.0, 0), steel));
  g.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 5).rotateZ(Math.PI / 2).translate(0.05, -0.02, 0), leather)); // the plunger grip
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 5).scale(1, 1.6, 1).translate(0, 0.71, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.8, 0.18), toneMapped: false })); // the pilot flame at the nozzle
  g.add(f);
  return g;
}
// the solenarion: a short bow shot through a wooden arrow-guide, so short darts fly far and flat
function solenRaw() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.72, 7).translate(0, 0.32, 0), leather)); // the guide tube
  const prod = mesh(new THREE.TorusGeometry(0.36, 0.016, 5, 16, Math.PI * 0.75), leather); prod.rotation.z = Math.PI / 2 - Math.PI * 0.375; prod.position.y = 0.3; g.add(prod);
  g.add(mesh(new THREE.BoxGeometry(0.66, 0.005, 0.005).translate(0, 0.44, 0.0), new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.9 })));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 7).translate(0, 0.66, 0), goldM));
  return g;
}

// Round 21: every weapon is built once, its pieces merged by material (a sword was five draws, now three), and each
// copy shares those geometries. Unlit pieces (the torch flame) stay separate.
const _wcache = new Map();
function mergedGear(name, build) {
  let parts = _wcache.get(name);
  if (!parts) {
    const src = build(); src.updateMatrixWorld(true);
    const byMat = new Map(); parts = [];
    src.traverse((o) => {
      if (!o.isMesh) return;
      if (o.material.isMeshBasicMaterial) { parts.push({ geo: o.geometry.clone().applyMatrix4(o.matrixWorld), mat: o.material, shadow: false }); return; }
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
      for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a);
      if (!byMat.has(o.material)) byMat.set(o.material, []); byMat.get(o.material).push(g);
    });
    for (const [mat, gs] of byMat) parts.push({ geo: gs.length > 1 ? mergeGeometries(gs) : gs[0], mat, shadow: true });
    _wcache.set(name, parts);
  }
  const g = new THREE.Group();
  for (const q of parts) { const m = new THREE.Mesh(q.geo, q.mat); m.castShadow = q.shadow; m.receiveShadow = q.shadow; g.add(m); }
  return g;
}
export const sword = () => mergedGear('sword', swordRaw), dagger = () => mergedGear('dagger', daggerRaw), torch = () => mergedGear('torch', torchRaw);
export const spear = () => mergedGear('spear', spearRaw), crossbow = () => mergedGear('crossbow', crossbowRaw), mallet = () => mergedGear('mallet', malletRaw);
export const bow = () => mergedGear('bow', bowRaw), shield = () => mergedGear('shield', shieldRaw);
export const byzShield = (oval, k = 0) => mergedGear('bshield' + (oval ? 'o' : 'r') + k, () => byzShieldRaw(oval, k));
export const pike = () => mergedGear('pike', pikeRaw), siphon = () => mergedGear('siphon', siphonRaw), solenarion = () => mergedGear('solen', solenRaw);

// Humanoids are sculpted, skinned and animated in human.js / anim.js.
export { humanoid, animateHumanoid, setCharLOD } from './human.js';
export { CharLOD } from './anim.js';

// --------------------------------------------------------------------- dromedary camel (sculpted, see creatures.js)
export { camel, animateCamel, buffalo, animateBuffalo, horse, animateHorse, saluki, animateSaluki, SALUKI_COATS } from './creatures.js';
