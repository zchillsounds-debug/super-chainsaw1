import * as THREE from 'three';
import { fabricTex } from './textures.js';

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
export function sword() {
  const s = new THREE.Shape();
  s.moveTo(-0.032, 0); s.lineTo(-0.028, 0.88); s.lineTo(0, 1.0); s.lineTo(0.028, 0.88); s.lineTo(0.032, 0); s.closePath();
  const blade = new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.008, bevelSegments: 1 });
  const g = new THREE.Group();
  const b = mesh(blade, steel); b.position.set(0, 0.12, -0.003); g.add(b);
  g.add(mesh(new THREE.BoxGeometry(0.004, 0.7, 0.014).translate(0, 0.5, 0.008), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 1, roughness: 0.35 }))); // fuller
  g.add(mesh(new THREE.BoxGeometry(0.2, 0.03, 0.05).translate(0, 0.11, 0), goldM));
  g.add(mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.2, 8).translate(0, 0.0, 0), leather));
  g.add(mesh(new THREE.SphereGeometry(0.035, 8, 6).scale(1, 0.7, 1).translate(0, -0.11, 0), goldM));
  return g;
}
export function dagger() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.ConeGeometry(0.03, 0.34, 4).scale(1, 1, 0.25).translate(0, 0.27, 0), steel));
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.02, 0.03).translate(0, 0.1, 0), leather));
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6).translate(0, 0.03, 0), leather));
  return g;
}
export function torch() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.7, 6).translate(0, 0.25, 0), leather));
  const f = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 7).translate(0, 0.7, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.3, 0.3), toneMapped: false }));
  g.add(f);
  return g;
}
export function spear() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 6).translate(0, 0.6, 0), leather));
  g.add(mesh(new THREE.ConeGeometry(0.06, 0.35, 4).translate(0, 1.95, 0), steel));
  return g;
}
export function bow() {
  const g = new THREE.Group();
  const c = new THREE.TorusGeometry(0.6, 0.02, 5, 20, Math.PI * 0.9);
  const b = mesh(c, leather); b.rotation.z = Math.PI / 2 - Math.PI * 0.45; g.add(b);
  return g;
}
export function shield() {
  const g = new THREE.Group();
  const d = mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.05, 20).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7a4a24, roughness: 0.6, map: fabricTex('#6b3f1e', '#b08040', false) }));
  g.add(d);
  g.add(mesh(new THREE.TorusGeometry(0.31, 0.03, 6, 24), goldM));
  g.add(mesh(new THREE.SphereGeometry(0.09, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).translate(0, 0, 0.03), steel));
  return g;
}

// Humanoids are sculpted, skinned and animated in human.js / anim.js.
export { humanoid, animateHumanoid, setCharLOD } from './human.js';
export { CharLOD } from './anim.js';

// --------------------------------------------------------------------- dromedary camel (sculpted, see creatures.js)
export { camel, animateCamel, buffalo, animateBuffalo } from './creatures.js';
