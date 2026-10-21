// Procedural chibi critters: round toon bodies, anime decal eyes, a group-based rig
// driven by a springy pose so every motion squashes and overshoots.
import * as THREE from 'three';
import { toon, inked, canvasTex } from './toon.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TYPES } from './data.js';
import { buildGrowth, growthSeg } from './growth.js';

const SEG = 36;
let seg = SEG; // fewer segments for far-away world critters (lod 'low' / 'mid'); battles keep the full count
const sphere = (r = 1) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75));
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, seg < 20 ? 4 : seg < 30 ? 6 : 8, seg < 20 ? 10 : seg < 30 ? 14 : 18); // limbs follow the world LOD too (they were ~half a far critter's triangles)

// ---------- face textures ----------
function eyeCanvas(ctx, w, h, { eye, iris }, kind) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.58, rx = w * 0.36, ry = h * 0.36;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'happy') {
    ctx.strokeStyle = eye; ctx.lineWidth = w * 0.13;
    ctx.beginPath(); ctx.arc(cx, cy + ry * 0.45, rx * 0.85, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
    return;
  }
  if (kind === 'hurt') {
    ctx.strokeStyle = eye; ctx.lineWidth = w * 0.12;
    ctx.beginPath(); ctx.moveTo(cx + rx * 0.8, cy - ry * 0.55); ctx.lineTo(cx - rx * 0.6, cy); ctx.lineTo(cx + rx * 0.8, cy + ry * 0.55); ctx.stroke();
    return;
  }
  if (kind === 'dizzy') {
    ctx.strokeStyle = eye; ctx.lineWidth = w * 0.07;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.15) {
      const r = (a / (Math.PI * 5)) * rx;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * (ry / rx));
    }
    ctx.stroke();
    return;
  }
  if (kind === 'closed') {
    ctx.strokeStyle = eye; ctx.lineWidth = w * 0.1;
    ctx.beginPath(); ctx.moveTo(cx - rx * 0.85, cy + ry * 0.1); ctx.quadraticCurveTo(cx, cy + ry * 0.45, cx + rx * 0.85, cy + ry * 0.1); ctx.stroke();
    return;
  }
  // open anime eye: dark oval, iris gradient, pupil, sparkles
  ctx.fillStyle = eye;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
  g.addColorStop(0, eye); g.addColorStop(0.45, iris); g.addColorStop(1, '#ffffff');
  ctx.fillStyle = g; ctx.globalAlpha = 0.95;
  ctx.beginPath(); ctx.ellipse(cx, cy + ry * 0.12, rx * 0.74, ry * 0.76, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = eye;
  ctx.beginPath(); ctx.ellipse(cx, cy + ry * 0.05, rx * 0.38, ry * 0.44, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(cx - rx * 0.3, cy - ry * 0.36, rx * 0.3, ry * 0.25, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + rx * 0.34, cy + ry * 0.42, rx * 0.13, ry * 0.11, 0, 0, Math.PI * 2); ctx.fill();
  if (kind === 'angry') {
    // furrowed lid cut across the top
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, cy - ry * 0.75); ctx.lineTo(0, cy - ry * 0.05); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = eye; ctx.lineWidth = w * 0.09;
    ctx.beginPath(); ctx.moveTo(cx - rx * 1.05, cy - ry * 0.05); ctx.lineTo(cx + rx * 1.05, cy - ry * 0.75); ctx.stroke();
  } else {
    ctx.strokeStyle = eye; ctx.lineWidth = w * 0.08;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx * 1.02, ry * 1.02, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  }
}

function mouthCanvas(ctx, w, h, kind, col) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w * 0.07; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const cx = w / 2, cy = h * 0.4;
  if (kind === 'smile') {
    ctx.beginPath();
    ctx.arc(cx - w * 0.12, cy, w * 0.12, 0.1, Math.PI - 0.1);
    ctx.arc(cx + w * 0.12, cy, w * 0.12, 0.1, Math.PI - 0.1);
    ctx.stroke();
  } else if (kind === 'open' || kind === 'yell') {
    const s = kind === 'yell' ? 1.25 : 1;
    ctx.beginPath(); ctx.moveTo(cx - w * 0.24 * s, cy - h * 0.05);
    ctx.quadraticCurveTo(cx, cy - h * 0.02, cx + w * 0.24 * s, cy - h * 0.05);
    ctx.quadraticCurveTo(cx + w * 0.18 * s, cy + h * 0.45 * s, cx, cy + h * 0.46 * s);
    ctx.quadraticCurveTo(cx - w * 0.18 * s, cy + h * 0.45 * s, cx - w * 0.24 * s, cy - h * 0.05);
    ctx.fill();
    ctx.fillStyle = '#ff6f8e';
    ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.33 * s, w * 0.12 * s, h * 0.1 * s, 0, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'o') {
    ctx.beginPath(); ctx.ellipse(cx, cy + h * 0.12, w * 0.09, h * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'wobbly') {
    ctx.beginPath(); ctx.moveTo(cx - w * 0.25, cy + h * 0.1);
    for (let i = 1; i <= 6; i++) ctx.lineTo(cx - w * 0.25 + i * w * 0.083, cy + h * 0.1 + (i % 2 ? -1 : 1) * h * 0.07);
    ctx.stroke();
  } else if (kind === 'grin') {
    ctx.beginPath(); ctx.moveTo(cx - w * 0.28, cy); ctx.quadraticCurveTo(cx, cy + h * 0.5, cx + w * 0.28, cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(cx - w * 0.2, cy + 1, w * 0.4, h * 0.08);
  }
}

// curved decal that hugs a sphere of radius r: centred at yaw/pitch, half extents in radians
function spherePatch(r, yaw, pitch, hw, hh, flip = false, seg = 8) {
  const g = new THREE.BufferGeometry();
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= seg; j++) for (let i = 0; i <= seg; i++) {
    const u = i / seg * 2 - 1, v = j / seg * 2 - 1;
    const a = yaw + u * hw, b = pitch + v * hh;
    pos.push(Math.sin(a) * Math.cos(b) * r, Math.sin(b) * r, Math.cos(a) * Math.cos(b) * r);
    uv.push(flip ? 1 - i / seg : i / seg, j / seg);
  }
  for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) {
    const a = j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  g.setIndex(idx);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

const decalMat = (map) => new THREE.MeshBasicMaterial({
  map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
});

const faceTexCache = new Map();
function faceTextures(def) {
  const key = def.id + (def.skin || '');
  if (faceTexCache.has(key)) return faceTexCache.get(key);
  const eyes = {}, mouths = {};
  for (const k of ['open', 'happy', 'hurt', 'dizzy', 'closed', 'angry']) eyes[k] = canvasTex(128, 160, (c, w, h) => eyeCanvas(c, w, h, def.colors, k));
  for (const k of ['smile', 'open', 'yell', 'o', 'wobbly', 'grin']) mouths[k] = canvasTex(128, 96, (c, w, h) => mouthCanvas(c, w, h, k, '#2a1428'));
  const blush = canvasTex(64, 32, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,110,140,0.85)'); g.addColorStop(1, 'rgba(255,110,140,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(w * 0.3 + i * 9, h * 0.68); c.lineTo(w * 0.36 + i * 9, h * 0.32); c.stroke(); }
  });
  const out = { eyes, mouths, blush };
  faceTexCache.set(key, out);
  return out;
}

// ---------- parts ----------
function flameGeo() {
  // teardrop lathe, tip up
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    pts.push(new THREE.Vector2(Math.sin(t * Math.PI) ** 0.8 * (1 - t) ** 0.6 * 0.5 + 0.0001, t * 1.4 - 0.2));
  }
  return new THREE.LatheGeometry(pts, seg < 20 ? 12 : seg < 30 ? 16 : 20);
}

function boltGeo() {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(0.12, 0.28); s.lineTo(0.03, 0.3); s.lineTo(0.16, 0.6);
  s.lineTo(-0.06, 0.26); s.lineTo(0.04, 0.24); s.lineTo(-0.06, 0); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 });
  g.translate(0, 0, -0.035);
  return g;
}

function leafGeo() {
  const g = sphere(0.5);
  g.scale(0.55, 0.12, 1);
  g.translate(0, 0, 0.45);
  return g;
}

let _wingTex = null;
function wingTexture() {
  if (_wingTex) return _wingTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,246,210,0.95)'); g.addColorStop(0.45, 'rgba(170,240,255,0.75)');
  g.addColorStop(0.8, 'rgba(255,150,230,0.7)'); g.addColorStop(1, 'rgba(255,150,230,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(60,40,110,0.45)'; x.lineWidth = 2;
  for (let k = -2; k <= 2; k++) { x.beginPath(); x.moveTo(64, 64); x.quadraticCurveTo(64 + 40, 64 + k * 10, 124, 64 + k * 22); x.stroke(); x.beginPath(); x.moveTo(64, 64); x.quadraticCurveTo(24, 64 + k * 10, 4, 64 + k * 22); x.stroke(); }
  _wingTex = new THREE.CanvasTexture(c); _wingTex.colorSpace = THREE.SRGBColorSpace;
  return _wingTex;
}

export class Critter {
  constructor(def, { lod = 'high' } = {}) {
    this.def = def;
    seg = lod === 'low' ? 14 : lod === 'mid' ? 22 : SEG; growthSeg(lod === 'low' ? 12 : lod === 'mid' ? 18 : 28);
    const C = def.colors, B = def.body;
    // shiny skins get a warm golden rim so they read as special at a glance
    this.rim = { uRimColor: { value: def.skin ? new THREE.Color(1.3, 1.05, 0.5) : new THREE.Color(1, 0.95, 0.85) }, uRimPower: { value: 3 } };
    const U = this.rim;
    this.mats = {
      body: toon(C.body, { uniforms: U }),
      belly: toon(C.belly, { uniforms: U }),
      accent: toon(C.accent, { uniforms: U }),
      dark: toon(C.dark, { uniforms: U }),
      pink: toon(0xffa0b4, { uniforms: U }),
    };
    this.flashT = 0;
    const OL = 0.02;
    const LB = B.limb || 1; // grown forms have thicker arms and legs

    const root = this.root = new THREE.Group();
    root.userData.critter = this;
    // grown forms are bigger overall (def.size); squash & stretch happens inside
    const sizeG = this.sizeG = new THREE.Group();
    sizeG.scale.setScalar(def.size || 1);
    root.add(sizeG);
    const scaleG = this.scaleG = new THREE.Group(); // global squash & stretch, pivot at feet
    sizeG.add(scaleG);

    const hipY = B.legLen * 0.9;
    const pelvis = this.pelvis = new THREE.Group();
    pelvis.position.y = hipY;
    scaleG.add(pelvis);

    // torso
    const torso = this.torso = new THREE.Group();
    pelvis.add(torso);
    const bodyGeo = sphere(0.5);
    const body = inked(bodyGeo, this.mats.body, OL);
    body.scale.set(B.w * B.chubby, B.h, B.w * 0.95);
    body.position.y = B.h * 0.48;
    torso.add(body);
    const belly = new THREE.Mesh(sphere(0.5), this.mats.belly);
    belly.scale.set(B.w * B.chubby * 0.78, B.h * 0.8, B.w * 0.6);
    belly.position.set(0, B.h * 0.43, B.w * 0.21);
    belly.castShadow = true;
    torso.add(belly);

    // head
    const headR = B.headR;
    const neck = this.neck = new THREE.Group();
    neck.position.y = B.h * 0.82;
    torso.add(neck);
    const head = this.head = new THREE.Group();
    head.position.y = headR * 0.78;
    neck.add(head);
    const skull = this.skull = new THREE.Group();
    skull.scale.set(1.08, 0.94, 0.98);
    head.add(skull);
    skull.add(inked(sphere(headR), this.mats.body, OL));
    if (def.extra === 'owl') {
      const beak = inked(new THREE.ConeGeometry(headR * 0.11, headR * 0.26, 12), toon(0xffb020, { uniforms: U }), OL * 0.6);
      beak.rotation.x = Math.PI * 0.62;
      beak.position.set(0, -headR * 0.2, headR * 1.0);
      skull.add(beak);
    } else if (def.extra === 'penguin') {
      // short wide beak, upper and lower halves
      for (const k of [0, 1]) {
        const b = inked(new THREE.ConeGeometry(headR * 0.16, headR * 0.3, 14), this.mats.accent, OL * 0.6);
        b.scale.set(1.3, 1, k ? 0.45 : 0.6);
        b.rotation.x = Math.PI / 2;
        b.position.set(0, -headR * (0.16 + k * 0.1), headR * 1.02);
        skull.add(b);
      }
    } else if (def.extra === 'mole') {
      // pink star nose and a miner's hard hat with a lamp
      const nose = new THREE.Group();
      nose.position.set(0, -headR * 0.2, headR * 0.98);
      const pink = toon(C.accent, { uniforms: U });
      const nb = inked(sphere(headR * 0.13), pink, OL * 0.5);
      nb.scale.set(1.2, 1, 0.8); nose.add(nb);
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2, t = new THREE.Mesh(sphere(headR * 0.06), pink);
        t.position.set(Math.cos(a) * headR * 0.15, Math.sin(a) * headR * 0.13, headR * 0.02);
        nose.add(t);
      }
      skull.add(nose);
      const hat = new THREE.Group();
      hat.position.set(0, headR * 0.42, -headR * 0.04); hat.rotation.x = -0.12;
      const hatM = toon(0xffc83a, { uniforms: U });
      const dome = inked(new THREE.SphereGeometry(headR * 0.86, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), hatM, OL * 0.8);
      hat.add(dome);
      const brim = inked(new THREE.CylinderGeometry(headR * 1.0, headR * 1.0, headR * 0.07, 24), hatM, OL * 0.6);
      brim.scale.set(1, 1, 1.08); brim.position.z = headR * 0.08;
      hat.add(brim);
      const ridge = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.6, headR * 0.06, 6, 20, Math.PI), toon(0xe0a020, { uniforms: U }));
      ridge.rotation.y = Math.PI / 2; hat.add(ridge);
      const lamp = inked(new THREE.CylinderGeometry(headR * 0.17, headR * 0.2, headR * 0.16, 14), toon(0x5a5a6a, { uniforms: U }), OL * 0.5);
      lamp.rotation.x = Math.PI / 2; lamp.position.set(0, headR * 0.38, headR * 0.74);
      hat.add(lamp);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(headR * 0.14, 16), new THREE.MeshBasicMaterial({ color: 0xfff6b0 }));
      lens.position.set(0, headR * 0.38, headR * 0.83);
      hat.add(lens);
      skull.add(hat);
    } else if (def.extra === 'jelly') {
      // a see-through jelly bell over the head, frilled rim and glowing spots
      const bellM = new THREE.MeshToonMaterial({ color: C.body, emissive: C.body, emissiveIntensity: 0.25, transparent: true, opacity: 0.42, depthWrite: false });
      const cap = Math.PI * 0.36, rimR = headR * 1.14 * Math.sin(cap), rimY = headR * 0.06 + headR * 1.14 * Math.cos(cap);
      const bell = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.14, 28, 12, 0, Math.PI * 2, 0, cap), bellM);
      bell.position.y = headR * 0.06; bell.renderOrder = 3;
      skull.add(bell);
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * Math.PI * 2, fr = new THREE.Mesh(sphere(headR * 0.08), this.mats.accent);
        fr.scale.set(1, 0.7, 1); fr.position.set(Math.cos(a) * rimR, rimY - headR * 0.03, Math.sin(a) * rimR);
        skull.add(fr);
      }
      for (const [x, y, z, r] of [[0.3, 1.0, 0.36, 0.1], [-0.36, 0.96, 0.3, 0.075], [0.0, 1.12, 0.0, 0.085]]) {
        const sp = new THREE.Mesh(sphere(headR * r), new THREE.MeshBasicMaterial({ color: C.accent }));
        sp.position.set(x * headR, y * headR, z * headR);
        skull.add(sp);
        (this.glows ||= []).push(sp);
      }
      const nose = new THREE.Mesh(sphere(headR * 0.05), this.mats.dark);
      nose.position.set(0, -headR * 0.2, headR * 0.99);
      skull.add(nose);
    } else if (def.extra === 'otter') {
      // puffy cream muzzle with whiskers, a dark button nose, and a scallop shell clipped behind one ear
      const cream = this.mats.belly;
      for (const s of [-1, 1]) {
        const m = inked(sphere(headR * 0.2), cream, OL * 0.5);
        m.scale.set(1, 0.75, 0.7); m.position.set(s * headR * 0.15, -headR * 0.36, headR * 0.84);
        skull.add(m);
        for (let k = 0; k < 3; k++) {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.012, headR * 0.012, headR * 0.5, 4), this.mats.dark);
          w.rotation.z = s * (Math.PI / 2 + (k - 1) * 0.2); w.position.set(s * headR * 0.48, -headR * (0.33 + k * 0.05), headR * 0.84);
          skull.add(w);
        }
      }
      const nose = inked(sphere(headR * 0.085), this.mats.dark, OL * 0.4);
      nose.scale.set(1.3, 0.85, 0.9); nose.position.set(0, -headR * 0.26, headR * 1.0);
      skull.add(nose);
      const shell = new THREE.Group();
      shell.position.set(-headR * 0.3, headR * 0.92, headR * 0.3); shell.rotation.set(-0.5, -0.1, 0.35);
      const shM = toon(C.accent, { uniforms: U });
      for (let k = 0; k < 5; k++) {
        const r = inked(sphere(headR * 0.1), shM, OL * 0.4);
        const a = (k - 2) * 0.32;
        r.scale.set(0.55, 1.6, 0.5); r.position.set(Math.sin(a) * headR * 0.1, Math.cos(a) * headR * 0.1, 0); r.rotation.z = -a;
        shell.add(r);
      }
      const hinge = new THREE.Mesh(sphere(headR * 0.06), shM);
      hinge.scale.set(1.6, 0.8, 0.8); shell.add(hinge);
      skull.add(shell);
    } else if (def.extra === 'koala') {
      // a big dark leathery nose and a eucalyptus sprig tucked behind one ear
      const nose = inked(sphere(headR * 0.2), this.mats.dark, OL * 0.6);
      nose.scale.set(0.85, 1.05, 0.62); nose.position.set(0, -headR * 0.22, headR * 0.94);
      skull.add(nose);
      const shine = new THREE.Mesh(sphere(headR * 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
      shine.scale.set(1, 1.4, 0.5); shine.position.set(-headR * 0.06, -headR * 0.13, headR * 1.07);
      skull.add(shine);
      const sprig = new THREE.Group();
      sprig.position.set(headR * 0.35, headR * 0.86, headR * 0.1); sprig.rotation.z = -0.5;
      const leafM = toon(C.accent, { uniforms: U });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.02, headR * 0.02, headR * 0.5, 5), this.mats.dark);
      stem.position.y = headR * 0.2; sprig.add(stem);
      for (let k = 0; k < 3; k++) {
        const leaf = inked(sphere(headR * 0.13), leafM, OL * 0.4);
        leaf.scale.set(0.5, 1.2, 0.2);
        leaf.position.set((k % 2 ? 1 : -1) * headR * 0.09, headR * (0.12 + k * 0.14), 0);
        leaf.rotation.z = (k % 2 ? -1 : 1) * 0.8;
        sprig.add(leaf);
      }
      skull.add(sprig);
    } else if (def.extra === 'fox') {
      // cream cheek ruffs that flick out to points, and a little button nose
      for (const s of [-1, 1]) {
        const g = new THREE.ConeGeometry(headR * 0.24, headR * 0.5, 14);
        g.rotateZ(s * 2.2);
        const ruff = inked(g, this.mats.belly, OL * 0.6);
        ruff.scale.set(1, 1, 0.5); ruff.position.set(s * headR * 0.74, -headR * 0.42, headR * 0.5);
        ruff.rotation.y = s * 0.5;
        skull.add(ruff);
      }
      const nose = inked(sphere(headR * 0.075), this.mats.dark, OL * 0.4);
      nose.scale.set(1.3, 0.85, 0.9); nose.position.set(0, -headR * 0.2, headR * 1.0);
      skull.add(nose);
    } else if (def.extra === 'frog') {
      // wide flat head with two eye domes on top and a pink lily flower on one of them
      skull.scale.set(1.2, 0.86, 1.0);
      for (const s of [-1, 1]) {
        const dome = inked(sphere(headR * 0.38), this.mats.body, OL * 0.8);
        dome.position.set(s * headR * 0.44, headR * 0.74, headR * 0.36);
        skull.add(dome);
      }
      const flower = new THREE.Group();
      flower.position.set(-headR * 0.56, headR * 1.08, headR * 0.2); flower.rotation.set(-0.2, 0, 0.45); flower.scale.setScalar(1.5);
      const petal = toon(C.accent, { uniforms: U });
      for (let k = 0; k < 5; k++) {
        const pt = inked(sphere(headR * 0.13), petal, OL * 0.4);
        const a = k / 5 * Math.PI * 2;
        pt.scale.set(1, 0.5, 1.5); pt.position.set(Math.sin(a) * headR * 0.13, headR * 0.06, Math.cos(a) * headR * 0.13); pt.rotation.set(-0.6, a, 0, 'YXZ');
        flower.add(pt);
      }
      const ctr = new THREE.Mesh(sphere(headR * 0.07), toon(0xffe066));
      ctr.position.y = headR * 0.04; flower.add(ctr);
      skull.add(flower);
    } else if (def.extra === 'hermit') {
      // crab feelers bobbing up from the brow, and a tiny pinched mouth line under a dark nose dot
      for (const s of [-1, 1]) {
        const pts = [];
        for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push(new THREE.Vector3(s * (0.05 + t * 0.22) * headR, (0.7 + t * 0.55) * headR, (0.55 - t * 0.35) * headR)); }
        const stalk = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, headR * 0.03, 5), this.mats.dark);
        skull.add(stalk);
        const tip = inked(sphere(headR * 0.07), this.mats.accent, OL * 0.4);
        tip.position.copy(pts[6]); skull.add(tip);
      }
      const nose = new THREE.Mesh(sphere(headR * 0.06), this.mats.dark);
      nose.scale.set(1.3, 0.8, 1); nose.position.set(0, -headR * 0.17, headR * 0.985);
      skull.add(nose);
    } else if (def.extra === 'puffer') {
      // pouty fish lips and a crown of soft spines over the top and back of the head
      const lips = inked(new THREE.TorusGeometry(headR * 0.1, headR * 0.05, 8, 16), this.mats.accent, OL * 0.4);
      lips.scale.set(1.2, 0.9, 1); lips.position.set(0, -headR * 0.34, headR * 0.93); lips.rotation.x = -0.35;
      skull.add(lips);
      const cone = (r, h) => { const g = new THREE.ConeGeometry(r, h, 6); g.translate(0, h / 2, 0); return g; };
      const hp = [];
      for (let i = 0; i < 30; i++) {
        const y = 1 - (i + 0.5) / 30 * 1.4, r = Math.sqrt(1 - y * y), a = i * 2.39996;
        const d = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
        if (d.z > 0.35 && d.y < 0.55) continue; // keep the face clear
        const g = cone(headR * 0.08, headR * 0.3);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d));
        g.translate(d.x * headR * 0.95, d.y * headR * 0.95, d.z * headR * 0.95);
        hp.push(g);
      }
      this.spines = inked(mergeGeometries(hp), this.mats.accent, OL * 0.5);
      skull.add(this.spines);
    } else if (def.extra === 'sloth') {
      // big dark nose and a little hibiscus flower tucked over one ear
      const nose = inked(sphere(headR * 0.12), this.mats.dark, OL * 0.5);
      nose.scale.set(1.25, 0.85, 0.8); nose.position.set(0, -headR * 0.16, headR * 0.97);
      skull.add(nose);
      const flower = new THREE.Group();
      flower.position.set(headR * 0.62, headR * 0.72, headR * 0.25); flower.rotation.set(-0.4, 0.3, -0.5); flower.scale.setScalar(1.4);
      const petal = toon(C.flower ?? 0xff6a8a, { uniforms: U });
      for (let k = 0; k < 5; k++) {
        const pt = inked(sphere(headR * 0.12), petal, OL * 0.4);
        const a = k / 5 * Math.PI * 2;
        pt.scale.set(1, 0.45, 1.5); pt.position.set(Math.sin(a) * headR * 0.12, 0, Math.cos(a) * headR * 0.12); pt.rotation.set(-0.5, a, 0, 'YXZ');
        flower.add(pt);
      }
      const ctr = new THREE.Mesh(sphere(headR * 0.06), toon(0xffe066)); ctr.position.y = headR * 0.03; flower.add(ctr);
      skull.add(flower);
    } else if (def.extra === 'toucan') {
      // a huge banana beak: sunny yellow with a dark stripe at the base and a hot orange tip
      const beak = new THREE.Group();
      beak.position.set(0, -headR * 0.12, headR * 0.86);
      const mk = (r1, r2, len, mat, z) => {
        const g = new THREE.CylinderGeometry(r2, r1, len, 16); g.rotateX(Math.PI / 2); g.translate(0, 0, len / 2 + z);
        const m = inked(g, mat, OL * 0.6); m.scale.set(0.8, 1.15, 1); beak.add(m); return m;
      };
      mk(headR * 0.32, headR * 0.3, headR * 0.14, this.mats.dark, 0);
      mk(headR * 0.3, headR * 0.15, headR * 0.9, this.mats.accent, headR * 0.14);
      const tip = inked(new THREE.ConeGeometry(headR * 0.15, headR * 0.3, 14).rotateX(Math.PI / 2).translate(0, 0, headR * 1.19), toon(C.tip ?? 0xff6a2a, { uniforms: U }), OL * 0.6);
      tip.scale.set(0.8, 1.15, 1); beak.add(tip);
      beak.rotation.x = 0.28;
      skull.add(beak);
      this.beak = beak;
    } else if (def.extra === 'pumice') {
      // a round snout patch with a dark nose, and a little ash puff on top of the head
      const snout = inked(sphere(headR * 0.26), this.mats.belly, OL * 0.5);
      snout.scale.set(1.15, 0.8, 0.6); snout.position.set(0, -headR * 0.3, headR * 0.82);
      skull.add(snout);
      const nose = inked(sphere(headR * 0.09), this.mats.dark, OL * 0.4);
      nose.scale.set(1.35, 0.85, 0.9); nose.position.set(0, -headR * 0.2, headR * 1.0);
      skull.add(nose);
      const ash = [];
      for (const [x, y, z, r] of [[0, 1.02, -0.05, 0.22], [0.2, 0.95, 0.05, 0.16], [-0.18, 0.97, -0.02, 0.17], [0.05, 1.2, -0.1, 0.14]]) { const g = sphere(headR * r); g.translate(x * headR, y * headR, z * headR); ash.push(g); }
      skull.add(inked(mergeGeometries(ash), toon(C.ash ?? 0xd8d4d0, { uniforms: U }), OL * 0.5));
    } else if (def.extra === 'manta') {
      // a wide flat manta head, with two curled cephalic fins up front like horns
      skull.scale.set(1.28, 0.82, 1.0);
      for (const s of [-1, 1]) {
        const pts = [];
        for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push(new THREE.Vector3(s * (0.55 + t * 0.18) * headR, (-0.25 + t * 0.4) * headR, (0.55 + Math.sin(t * 2.6) * 0.55) * headR)); }
        const fin = inked(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, headR * 0.11, 7), this.mats.dark, OL * 0.5);
        skull.add(fin);
      }
      const nose = new THREE.Mesh(sphere(headR * 0.05), this.mats.dark);
      nose.position.set(0, -headR * 0.18, headR * 0.99);
      skull.add(nose);
    } else {
      const nose = new THREE.Mesh(sphere(headR * 0.08), this.mats.dark);
      nose.scale.set(1.3, 0.8, 1);
      nose.position.set(0, -headR * 0.17, headR * 0.985);
      skull.add(nose);
    }

    // face decals
    const ft = this.faceTex = faceTextures(def);
    this.eyeMatL = decalMat(ft.eyes.open);
    this.eyeMatR = decalMat(ft.eyes.open);
    this.mouthMat = decalMat(ft.mouths.smile);
    const er = headR * 1.012;
    if (def.extra === 'mask') {
      const maskTex = canvasTex(256, 96, (c, w, h) => {
        c.fillStyle = '#3a3048';
        c.beginPath(); c.ellipse(w * 0.3, h * 0.5, w * 0.24, h * 0.42, 0.15, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(w * 0.7, h * 0.5, w * 0.24, h * 0.42, -0.15, 0, Math.PI * 2); c.fill();
        c.fillRect(w * 0.3, h * 0.3, w * 0.4, h * 0.3);
      });
      skull.add(new THREE.Mesh(spherePatch(headR * 1.006, 0, 0.0, 0.95, 0.36), decalMat(maskTex)));
    }
    if (def.extra === 'sloth') {
      // sleepy sloth face: dark tear-drop patches that slant down from each eye on a pale face disc
      const pale = '#' + new THREE.Color(C.belly).getHexString(), dk = '#' + new THREE.Color(C.dark).getHexString();
      const slothTex = canvasTex(256, 128, (c, w, h) => {
        c.fillStyle = pale; c.beginPath(); c.ellipse(w * 0.5, h * 0.56, w * 0.47, h * 0.44, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = dk;
        for (const s of [-1, 1]) { c.beginPath(); c.ellipse(w * (0.5 + s * 0.2), h * 0.6, w * 0.15, h * 0.2, s * -0.55, 0, Math.PI * 2); c.fill(); }
      });
      skull.add(new THREE.Mesh(spherePatch(headR * 1.005, 0, -0.08, 1.0, 0.55), decalMat(slothTex)));
    }
    if (def.extra === 'owl') {
      // pale facial disc around both eyes
      const belly = '#' + new THREE.Color(C.belly).getHexString();
      const diskTex = canvasTex(256, 128, (c, w, h) => {
        c.fillStyle = belly;
        c.beginPath(); c.ellipse(w * 0.3, h * 0.5, w * 0.27, h * 0.46, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(w * 0.7, h * 0.5, w * 0.27, h * 0.46, 0, 0, Math.PI * 2); c.fill();
      });
      skull.add(new THREE.Mesh(spherePatch(headR * 1.006, 0, -0.04, 0.95, 0.5), decalMat(diskTex)));
    }
    if (def.extra === 'penguin') {
      // white heart-shaped face over the dark head
      const belly = '#' + new THREE.Color(C.belly).getHexString();
      const faceTex = canvasTex(256, 160, (c, w, h) => {
        c.fillStyle = belly;
        c.beginPath();
        c.moveTo(w * 0.5, h * 0.3);
        c.bezierCurveTo(w * 0.36, h * 0.0, w * 0.0, h * 0.1, w * 0.06, h * 0.55);
        c.bezierCurveTo(w * 0.12, h * 0.9, w * 0.4, h * 1.0, w * 0.5, h * 1.0);
        c.bezierCurveTo(w * 0.6, h * 1.0, w * 0.88, h * 0.9, w * 0.94, h * 0.55);
        c.bezierCurveTo(w * 1.0, h * 0.1, w * 0.64, h * 0.0, w * 0.5, h * 0.3);
        c.fill();
      });
      skull.add(new THREE.Mesh(spherePatch(headR * 1.005, 0, -0.18, 1.05, 0.75), decalMat(faceTex)));
    }
    const frog = def.extra === 'frog';
    let eyeL, eyeR;
    if (frog) {
      // the eyes sit on the front of the domes
      const dr = headR * 0.38 * 1.015;
      eyeL = new THREE.Mesh(spherePatch(dr, 0.28, -0.1, 0.82, 0.95, false), this.eyeMatL);
      eyeR = new THREE.Mesh(spherePatch(dr, -0.28, -0.1, 0.82, 0.95, true), this.eyeMatR);
      eyeL.position.set(headR * 0.44, headR * 0.74, headR * 0.36);
      eyeR.position.set(-headR * 0.44, headR * 0.74, headR * 0.36);
    } else {
      eyeL = new THREE.Mesh(spherePatch(er, 0.36, -0.02, 0.28, 0.35, false), this.eyeMatL);
      eyeR = new THREE.Mesh(spherePatch(er, -0.36, -0.02, 0.28, 0.35, true), this.eyeMatR);
    }
    eyeL.renderOrder = eyeR.renderOrder = 2;
    skull.add(eyeL, eyeR);
    this.eyes = [eyeL, eyeR];
    const mouth = new THREE.Mesh(spherePatch(headR * 1.014, 0, def.extra === 'owl' || def.extra === 'penguin' || def.extra === 'mole' ? -0.52 : def.extra === 'toucan' ? -0.62 : def.extra === 'otter' || def.extra === 'pumice' ? -0.5 : def.extra === 'puffer' ? -0.44 : def.extra === 'koala' ? -0.6 : frog ? -0.12 : -0.38, frog ? 0.46 : 0.27, 0.18), this.mouthMat);
    mouth.renderOrder = 2;
    skull.add(mouth);
    const blushMat = decalMat(ft.blush);
    for (const s of [-1, 1]) {
      const b = new THREE.Mesh(spherePatch(er, s * 0.82, -0.32, 0.22, 0.12), blushMat);
      b.renderOrder = 1;
      skull.add(b);
    }

    // cheeks
    if (def.extra === 'cheeks') {
      for (const s of [-1, 1]) {
        const ch = new THREE.Mesh(sphere(headR * 0.36), this.mats.body);
        ch.position.set(s * headR * 0.6, -headR * 0.4, headR * 0.42);
        ch.scale.set(1, 0.82, 0.85);
        skull.add(ch);
      }
    }

    // ears
    this.ears = [];
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      skull.add(ear);
      this.ears.push(ear);
      ear.userData.side = s;
      if (def.ears === 'round') {
        ear.position.set(s * headR * 0.62, headR * 0.72, -headR * 0.05);
        ear.rotation.z = -s * 0.5;
        const e = inked(sphere(headR * 0.3), this.mats.body, OL);
        e.scale.set(1, 1, 0.45);
        ear.add(e);
        const inner = new THREE.Mesh(sphere(headR * 0.2), this.mats.pink);
        inner.scale.set(1, 1, 0.3); inner.position.z = headR * 0.08;
        ear.add(inner);
        if (def.extra === 'otter') { ear.scale.setScalar(0.66); ear.position.set(s * headR * 0.72, headR * 0.6, -headR * 0.02); }
        if (def.extra === 'koala') {
          // big fluffy koala ears with white tufts poking out
          ear.scale.setScalar(1.45); ear.position.set(s * headR * 0.8, headR * 0.5, -headR * 0.05); ear.rotation.z = -s * 0.75;
          for (let k = 0; k < 4; k++) {
            const tuft = new THREE.Mesh(sphere(headR * 0.07), this.mats.belly);
            tuft.position.set((k - 1.5) * headR * 0.08, (k % 2 ? 0.05 : -0.03) * headR, headR * 0.11);
            ear.add(tuft);
          }
        }
      } else if (def.ears === 'long') {
        ear.position.set(s * headR * 0.36, headR * 0.82, -headR * 0.08);
        ear.rotation.z = -s * 0.18;
        const e = inked(capsule(headR * 0.2, headR * 1.1), this.mats.body, OL);
        e.scale.set(1, 1, 0.55); e.position.y = headR * 0.72;
        ear.add(e);
        const inner = new THREE.Mesh(capsule(headR * 0.12, headR * 0.9), this.mats.pink);
        inner.scale.set(1, 1, 0.4); inner.position.set(0, headR * 0.72, headR * 0.07);
        ear.add(inner);
      } else if (def.ears === 'pointy') {
        ear.position.set(s * headR * 0.58, headR * 0.66, -headR * 0.05);
        ear.rotation.z = -s * 0.42;
        const e = inked(new THREE.ConeGeometry(headR * 0.3, headR * 0.62, 20), this.mats.body, OL);
        e.scale.set(1, 1, 0.5); e.position.y = headR * 0.24;
        ear.add(e);
        const inner = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.18, headR * 0.42, 16), this.mats.accent);
        inner.scale.set(1, 1, 0.4); inner.position.set(0, headR * 0.2, headR * 0.07);
        ear.add(inner);
      } else if (def.ears === 'bat') {
        // tall rounded bat ears
        ear.position.set(s * headR * 0.52, headR * 0.7, -headR * 0.05);
        ear.rotation.z = -s * 0.32;
        const e = inked(new THREE.ConeGeometry(headR * 0.36, headR * 0.95, 20), this.mats.body, OL);
        e.scale.set(1, 1, 0.42); e.position.y = headR * 0.36;
        ear.add(e);
        const inner = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.22, headR * 0.66, 16), this.mats.accent);
        inner.scale.set(1, 1, 0.3); inner.position.set(0, headR * 0.3, headR * 0.08);
        ear.add(inner);
      } else if (def.ears === 'tufts') {
        ear.position.set(s * headR * 0.62, headR * 0.7, 0);
        ear.rotation.z = -s * 0.75;
        const e = inked(new THREE.ConeGeometry(headR * 0.16, headR * 0.6, 14), this.mats.accent, OL);
        e.scale.set(1, 1, 0.55); e.position.y = headR * 0.24;
        ear.add(e);
      } else if (def.ears === 'antennae') {
        ear.position.set(s * headR * 0.32, headR * 0.86, headR * 0.05);
        ear.rotation.z = -s * 0.35;
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, headR * 0.7, 6), this.mats.dark);
        stalk.position.y = headR * 0.35;
        ear.add(stalk);
        const bulb = inked(sphere(headR * 0.12), new THREE.MeshBasicMaterial({ color: C.accent }), OL * 0.6);
        bulb.position.y = headR * 0.72;
        ear.add(bulb);
        (this.glows ||= []).push(bulb);
      } else if (def.ears === 'floppy') {
        // sheepy ears that droop out sideways
        ear.position.set(s * headR * 0.78, headR * 0.28, -headR * 0.05);
        const e = inked(capsule(headR * 0.14, headR * 0.42), this.mats.body, OL);
        e.scale.set(1, 1, 0.55); e.rotation.z = s * 1.9; e.position.x = s * headR * 0.22;
        ear.add(e);
        const inner = new THREE.Mesh(capsule(headR * 0.08, headR * 0.3), this.mats.accent);
        inner.scale.set(1, 1, 0.4); inner.rotation.z = s * 1.9; inner.position.set(s * headR * 0.22, -headR * 0.02, headR * 0.06);
        ear.add(inner);
      } else if (def.ears === 'pug') {
        // soft flaps that hang from the top of the head and flop outward
        ear.position.set(s * headR * 0.7, headR * 0.66, 0);
        const eg = sphere(headR * 0.28);
        eg.scale(0.8, 1.35, 0.35);
        eg.translate(0, -headR * 0.28, 0); // hang from the top
        const e = inked(eg, this.mats.dark, OL);
        e.rotation.set(0.15, 0, s * 0.95);
        ear.add(e);
      } else if (def.ears === 'gills') {
        ear.position.set(s * headR * 0.86, headR * 0.05, -headR * 0.1);
        for (let k = 0; k < 3; k++) {
          const f = new THREE.Group();
          f.rotation.z = -s * (0.25 + k * 0.55) + (s < 0 ? Math.PI : 0) * 0;
          f.rotation.z = s * (-0.9 + k * 0.75);
          ear.add(f);
          const fr = inked(capsule(headR * 0.1, headR * 0.5), this.mats.accent, OL * 0.8);
          fr.position.x = s * headR * 0.36;
          fr.rotation.z = Math.PI / 2;
          f.add(fr);
          // feathery nubs
          for (let n = 0; n < 3; n++) {
            const nub = new THREE.Mesh(sphere(headR * 0.07), this.mats.accent);
            nub.position.set(s * headR * (0.2 + n * 0.17), headR * 0.08, 0);
            f.add(nub);
          }
        }
      }
    }

    // sprout on head
    if (def.extra === 'sprout') {
      const sp = this.sprout = new THREE.Group();
      sp.position.set(0, headR * 0.92, headR * 0.1);
      skull.add(sp);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, headR * 0.35, 8), this.mats.dark);
      stem.position.y = headR * 0.17;
      sp.add(stem);
      for (let k = 0; k < 3; k++) {
        const lf = inked(leafGeo().scale(headR * 0.55, headR * 0.55, headR * 0.55), this.mats.accent, OL * 0.6);
        lf.position.y = headR * 0.34;
        lf.rotation.set(-0.5, k * Math.PI * 2 / 3, 0);
        sp.add(lf);
      }
    }

    // armadillo shell bands over the back
    if (def.extra === 'shell') {
      const shellMat = toon(C.accent, { uniforms: U });
      for (let k = 0; k < 4; k++) {
        // great-circle bands over the dome, fanned from front to back
        const band = inked(new THREE.TorusGeometry(0.5, 0.06, 8, 28, Math.PI), this.mats.dark, OL * 0.6);
        const g = new THREE.Group();
        g.scale.set(B.w * B.chubby * 1.08, B.h * 1.04, B.w * 0.92);
        g.position.set(0, B.h * 0.5, -B.w * 0.12);
        band.rotation.x = -0.15 - k * 0.38;
        g.add(band);
        torso.add(g);
      }
      const dome = inked(sphere(0.5), shellMat, OL);
      dome.scale.set(B.w * B.chubby * 1.06, B.h * 1.02, B.w * 0.9);
      dome.position.set(0, B.h * 0.5, -B.w * 0.12);
      torso.add(dome);
    }

    // fluffy static wool: merged puffs over the body and a big tuft on the head
    if (def.extra === 'wool') {
      const parts = [], add = (r, x, y, z) => { const g = sphere(r); g.translate(x, y, z); parts.push(g); };
      const ex = B.w * B.chubby * 0.5, ey = B.h * 0.5, ez = B.w * 0.95 * 0.5, cy = B.h * 0.48;
      for (let i = 0; i < 44; i++) {
        // golden-spiral points over the body, skipping the belly window
        const y = 1 - (i + 0.5) / 44 * 1.75, r = Math.sqrt(1 - y * y), a = i * 2.39996;
        const dx = Math.cos(a) * r, dz = Math.sin(a) * r;
        if (dz > 0.45 && y < 0.5 && y > -0.7) continue;
        add(0.13 + (i % 3) * 0.025, dx * ex * 0.97, cy + y * ey * 0.97, dz * ez * 0.97);
      }
      const torsoWool = inked(mergeGeometries(parts), this.mats.belly, OL);
      torso.add(torsoWool);
      const hp = [];
      for (let i = 0; i < 11; i++) {
        const a = i / 11 * Math.PI * 2, pol = i % 2 ? 0.55 : 0.8;
        if (Math.sin(a) > 0.2 && pol > 0.6) continue; // keep the brow clear
        const g = sphere(headR * (0.26 + (i % 3) * 0.03));
        g.translate(Math.cos(a) * Math.sin(pol) * headR, Math.cos(pol) * headR + headR * 0.04, Math.sin(a) * Math.sin(pol) * headR * 0.95 - headR * 0.05);
        hp.push(g);
      }
      const top = sphere(headR * 0.36); top.translate(0, headR * 0.98, -headR * 0.05); hp.push(top);
      const bang = sphere(headR * 0.24); bang.translate(0, headR * 0.86, headR * 0.42); hp.push(bang);
      skull.add(inked(mergeGeometries(hp), this.mats.belly, OL));
      // a little static spark poking out of the tuft
      const spark = inked(boltGeo(), new THREE.MeshBasicMaterial({ color: C.accent }), OL * 0.6);
      spark.scale.setScalar(0.55); spark.position.set(headR * 0.22, headR * 1.12, 0); spark.rotation.z = -0.3;
      skull.add(spark);
      (this.glows ||= []).push(spark);
      this.spark = spark;
    }

    // leafy hedgehog spines: one merged mesh over the back of the body and head
    if (def.extra === 'spines') {
      const cone = (r, h) => { const g = new THREE.ConeGeometry(r, h, 6); g.translate(0, h / 2, 0); return g; };
      const place = (list, g, pos, nrm) => { g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm)); g.translate(pos.x, pos.y, pos.z); list.push(g); };
      const bp = [], hp = [];
      const ex = B.w * B.chubby * 0.5, ey = B.h * 0.5, ez = B.w * 0.95 * 0.5, cy = B.h * 0.48;
      for (let i = 0; i < 40; i++) {
        const y = 1 - (i + 0.5) / 40 * 1.6, r = Math.sqrt(1 - y * y), a = i * 2.39996;
        const d = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
        if (d.z > -0.15 || d.y < -0.55) continue;
        const n = new THREE.Vector3(d.x / ex, d.y / ey, d.z / ez).normalize().lerp(new THREE.Vector3(0, 0.3, -1), 0.35).normalize();
        place(bp, cone(0.075, 0.26 + (i % 3) * 0.04), new THREE.Vector3(d.x * ex * 0.92, cy + d.y * ey * 0.92, d.z * ez * 0.92), n);
      }
      for (let i = 0; i < 46; i++) {
        const y = 1 - (i + 0.5) / 46 * 1.5, r = Math.sqrt(1 - y * y), a = i * 2.39996;
        const d = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
        if (d.z > -0.05 + Math.max(0, d.y - 0.6) * -1 || d.y < -0.35) continue;
        const n = d.clone().lerp(new THREE.Vector3(0, 0.4, -1), 0.4).normalize();
        place(hp, cone(headR * 0.15, headR * (0.5 + (i % 3) * 0.08)), d.clone().multiplyScalar(headR * 0.9), n);
      }
      torso.add(inked(mergeGeometries(bp), this.mats.accent, OL * 0.7));
      skull.add(inked(mergeGeometries(hp), this.mats.accent, OL * 0.7));
      // a single clover leaf tucked behind one ear
      const lf = inked(leafGeo().scale(headR * 0.5, headR * 0.5, headR * 0.5), this.mats.dark, OL * 0.6);
      lf.position.set(headR * 0.55, headR * 0.7, 0); lf.rotation.set(-1.1, 0.6, 0.3);
      skull.add(lf);
    }

    // flying squirrel: soft glider flaps from wrist to hip on each side
    if (def.extra === 'glider') {
      for (const s of [-1, 1]) {
        const g = sphere(1);
        g.scale(0.07, B.h * 0.36, B.w * 0.3);
        const flap = inked(g, this.mats.accent, OL * 0.6);
        flap.position.set(s * B.w * B.chubby * 0.5, B.h * 0.45, -B.w * 0.02);
        flap.rotation.z = s * 0.25;
        torso.add(flap);
      }
      // stuffed acorn cheeks
      for (const s of [-1, 1]) {
        const ch = inked(sphere(headR * 0.2), this.mats.belly, OL * 0.5);
        ch.scale.set(1, 0.85, 0.8); ch.position.set(s * headR * 0.62, -headR * 0.32, headR * 0.6);
        skull.add(ch);
      }
    }

    // pebble pug: glassy crystals sprouting from the back, one on the head
    if (def.extra === 'crystals') {
      const gem = (r, h) => { const g = new THREE.OctahedronGeometry(r, 0); g.scale(1, h / r, 1); g.translate(0, h * 0.55, 0); return g; };
      const up = new THREE.Vector3(0, 1, 0), parts = [];
      for (const [x, y, z, r, h, tx, tz] of [[0, 0.95, -0.36, 0.14, 0.46, -0.55, 0], [0.2, 0.84, -0.38, 0.11, 0.34, -0.5, 0.9], [-0.19, 0.86, -0.37, 0.115, 0.36, -0.5, -0.9], [0.05, 0.6, -0.47, 0.08, 0.22, -1.1, 0.2]]) {
        const g = gem(r, h);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(tz * 0.6, 1, tx).normalize()));
        g.translate(x * B.w * 1.6, y * B.h, z * B.w * 1.5);
        parts.push(g);
      }
      const cm = toon(def.colors.accent, { uniforms: U, rim: 1 });
      torso.add(inked(mergeGeometries(parts), cm, OL * 0.6));
      const hg = gem(headR * 0.13, headR * 0.38);
      const hc = inked(hg, cm, OL * 0.6);
      hc.position.set(headR * 0.2, headR * 0.86, -headR * 0.1); hc.rotation.set(-0.3, 0, -0.35);
      skull.add(hc);
      // little button nose
      const nose = inked(sphere(headR * 0.085), this.mats.dark, OL * 0.4);
      nose.scale.set(1.3, 0.9, 0.8); nose.position.set(0, -headR * 0.02, headR * 0.97);
      skull.add(nose);
    }

    // volcano hermit crab: a little volcano worn as a shell, with a glowing crater and a lava stripe spiralling round it
    if (def.extra === 'hermit') {
      const pts = [];
      for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push(new THREE.Vector2(Math.max(0.12, 0.5 * (1 - t) ** 0.85 + 0.12 * t), t * 0.95 - 0.05)); }
      const shellG = new THREE.Group();
      // big enough that the vent peeks up over one shoulder, even from the front
      shellG.position.set(B.w * 0.12, B.h * 0.3, -B.w * 0.5); shellG.rotation.set(-0.5, 0, -0.3);
      shellG.scale.set(B.w * 1.55, B.h * 2.3, B.w * 1.4);
      const rockM = toon(C.rock ?? 0x5a4a52, { uniforms: U });
      shellG.add(inked(new THREE.LatheGeometry(pts, seg < 20 ? 10 : 16), rockM, OL * 0.8));
      // lava spiral band
      const sp = [];
      for (let k = 0; k <= 40; k++) { const t = k / 40, a = t * Math.PI * 4.2, y = 0.05 + t * 0.8, r = (0.5 * (1 - (y + 0.05) / 0.95) ** 0.85 + 0.12 * (y + 0.05) / 0.95) * 1.02; sp.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)); }
      const lavaM = new THREE.MeshBasicMaterial({ color: C.accent });
      shellG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), 60, 0.035, 5), lavaM));
      const crater = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 14), lavaM);
      crater.position.y = 0.91; shellG.add(crater);
      (this.glows ||= []).push(crater);
      torso.add(shellG);
      this.hermitShell = shellG; this.craterY = 0.91;
    }

    // pufferfish: soft spines all over the back and sides, and a few dark spots
    if (def.extra === 'puffer') {
      const cone = (r, h) => { const g = new THREE.ConeGeometry(r, h, 6); g.translate(0, h / 2, 0); return g; };
      const bp = [];
      const ex = B.w * B.chubby * 0.5, ey = B.h * 0.5, ez = B.w * 0.95 * 0.5, cy = B.h * 0.48;
      for (let i = 0; i < 36; i++) {
        const y = 1 - (i + 0.5) / 36 * 1.7, r = Math.sqrt(1 - y * y), a = i * 2.39996;
        const d = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
        if (d.z > 0.4 && y > -0.75) continue; // belly window stays smooth
        const n = new THREE.Vector3(d.x / ex, d.y / ey, d.z / ez).normalize();
        const g = cone(0.06, 0.22);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n));
        g.translate(d.x * ex * 0.95, cy + d.y * ey * 0.95, d.z * ez * 0.95);
        bp.push(g);
      }
      this.bodySpines = inked(mergeGeometries(bp), this.mats.accent, OL * 0.5);
      torso.add(this.bodySpines);
      const spots = [];
      for (const [a, y] of [[2.2, 0.3], [2.8, -0.1], [3.5, 0.25], [4.1, -0.05], [-0.9, 0.35], [3.14, 0.55]]) {
        const g = sphere(0.055); g.scale(1, 1, 0.3);
        const d = new THREE.Vector3(Math.sin(a) * Math.sqrt(1 - y * y), y, Math.cos(a) * Math.sqrt(1 - y * y));
        g.lookAt(d); g.translate(d.x * ex * 1.0, cy + d.y * ey * 1.0, d.z * ez * 1.0); spots.push(g);
      }
      torso.add(new THREE.Mesh(mergeGeometries(spots), this.mats.dark));
    }

    // moss sloth: a shaggy mossy cape over the back and head, sprinkled with tiny flowers
    if (def.extra === 'sloth') {
      const mp = [], hp = [];
      const ex = B.w * B.chubby * 0.5, ey = B.h * 0.5, ez = B.w * 0.95 * 0.5, cy = B.h * 0.48;
      for (let i = 0; i < 30; i++) {
        const y = 1 - (i + 0.5) / 30 * 1.5, r = Math.sqrt(1 - y * y), a = i * 2.39996;
        const dx = Math.cos(a) * r, dz = Math.sin(a) * r;
        if (dz > -0.2) continue;
        const g = sphere(0.1 + (i % 3) * 0.025); g.scale(1, 0.7, 1); g.translate(dx * ex * 0.98, cy + y * ey * 0.98, dz * ez * 0.98); mp.push(g);
      }
      for (let i = 0; i < 16; i++) {
        const y = 1 - (i + 0.5) / 16 * 0.9, r = Math.sqrt(1 - y * y), a = i * 2.39996;
        const dx = Math.cos(a) * r, dz = Math.sin(a) * r;
        if (dz > 0.15) continue;
        const g = sphere(headR * (0.17 + (i % 3) * 0.03)); g.scale(1, 0.65, 1); g.translate(dx * headR * 0.92, y * headR * 0.92, dz * headR * 0.92); hp.push(g);
      }
      const mossM = toon(C.accent, { uniforms: U });
      torso.add(inked(mergeGeometries(mp), mossM, OL * 0.6));
      skull.add(inked(mergeGeometries(hp), mossM, OL * 0.6));
      const fl = [];
      for (const [x, y, z] of [[0.18, 0.75, -0.3], [-0.2, 0.55, -0.32], [0.05, 0.35, -0.34]]) { const g = sphere(0.045); g.translate(x * B.w * 1.4, y * B.h, z * B.w * 1.4); fl.push(g); }
      torso.add(new THREE.Mesh(mergeGeometries(fl), toon(0xfff2a0)));
    }

    // pumice cub: porous stone fur; a few of the pores glow like embers
    if (def.extra === 'pumice') {
      const ex = B.w * B.chubby * 0.5, ey = B.h * 0.5, ez = B.w * 0.95 * 0.5, cy = B.h * 0.48;
      const pore = [], hot = [], hpore = [];
      for (let i = 0; i < 26; i++) {
        const y = 1 - (i + 0.5) / 26 * 1.8, r = Math.sqrt(1 - y * y), a = i * 2.39996;
        const d = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
        if (d.z > 0.7 && y < 0.3 && y > -0.6) continue;
        const g = new THREE.CircleGeometry(0.05 + (i % 3) * 0.016, 8);
        g.lookAt(d); g.translate(d.x * ex * 1.005, cy + d.y * ey * 1.005, d.z * ez * 1.005);
        (i % 4 === 1 ? hot : pore).push(g);
      }
      for (let i = 0; i < 12; i++) {
        const y = 1 - (i + 0.5) / 12 * 1.2, r = Math.sqrt(1 - y * y), a = i * 2.39996 + 1;
        const d = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
        if (d.z > 0.35 && y < 0.5) continue;
        const g = new THREE.CircleGeometry(headR * (0.08 + (i % 2) * 0.03), 8);
        g.lookAt(d); g.translate(d.x * headR * 1.004, d.y * headR * 1.004, d.z * headR * 1.004);
        hpore.push(g);
      }
      const poreM = new THREE.MeshBasicMaterial({ color: C.dark, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const hotM = new THREE.MeshBasicMaterial({ color: C.accent, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      torso.add(new THREE.Mesh(mergeGeometries(pore), poreM));
      if (hot.length) { const hm = new THREE.Mesh(mergeGeometries(hot), hotM); torso.add(hm); (this.glows ||= []).push(hm); }
      if (hpore.length) skull.add(new THREE.Mesh(mergeGeometries(hpore), poreM));
    }

    // gauzy insect wings on the back
    this.wings = [];
    if (def.extra === 'bat') {
      // scalloped membrane wings (flap in update) and one tiny fang
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.12);
      shape.quadraticCurveTo(0.36, 0.46, 0.8, 0.26);
      shape.quadraticCurveTo(0.66, 0.06, 0.6, -0.12);
      shape.quadraticCurveTo(0.48, -0.0, 0.36, -0.14);
      shape.quadraticCurveTo(0.24, -0.02, 0.1, -0.08);
      shape.lineTo(0, 0.12);
      const geo = new THREE.ShapeGeometry(shape, 10);
      const memb = toon(C.wing ?? C.dark, { side: THREE.DoubleSide });
      for (const s of [-1, 1]) {
        const w = new THREE.Group();
        w.position.set(s * 0.1, B.h * 0.62, -B.w * 0.34);
        w.userData = { s, k: 0 };
        const m = new THREE.Mesh(geo, memb);
        m.scale.set(s, 1, 1);
        // the ink edge sits in the same plane, pushed back in depth so the membrane wins from either side
        const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x1a1020, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 }));
        o.scale.set(s * 1.06, 1.08, 1); o.position.set(-s * 0.01, -0.01, 0);
        w.add(o, m);
        w.rotation.y = s * 0.5;
        torso.add(w);
        this.wings.push(w);
      }
      const fang = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.05, headR * 0.12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      fang.rotation.x = Math.PI; fang.position.set(headR * 0.12, -headR * 0.5, headR * 0.92);
      skull.add(fang);
    }
    if (def.extra === 'wings') {
      // iridescent membrane: warm core, cyan-pink sheen, inked veins
      const wingTex = wingTexture();
      const wingMat = new THREE.MeshBasicMaterial({ map: wingTex, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
      const veinMat = new THREE.MeshBasicMaterial({ color: C.dark, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
      for (const s of [-1, 1]) for (const k of [0, 1]) {
        const w = new THREE.Group();
        w.position.set(s * 0.08, B.h * (0.72 - k * 0.2), -B.w * 0.38);
        w.userData = { s, k };
        const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), wingMat);
        leaf.scale.set(k ? 0.5 : 0.72, k ? 0.22 : 0.3, 1);
        leaf.position.x = s * (k ? 0.24 : 0.36);
        const edge = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.5, 24), veinMat);
        edge.scale.copy(leaf.scale); edge.position.copy(leaf.position);
        w.add(leaf, edge);
        w.rotation.y = s * 0.5;
        torso.add(w);
        this.wings.push(w);
      }
    }

    // arms
    this.arms = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group();
      sh.position.set(s * B.w * B.chubby * 0.45, B.h * 0.66, B.w * 0.1);
      torso.add(sh);
      if (def.extra === 'penguin') {
        // flat flippers
        const w = inked(sphere(0.5), this.mats.body, OL * 0.8);
        w.scale.set(0.07, B.armLen * 1.9, 0.26);
        w.position.set(s * 0.03, -B.armLen * 0.78, 0);
        sh.add(w);
      } else if (def.extra === 'manta') {
        // broad flat wing fins that spread out sideways (the arm swing flaps them)
        const g = sphere(0.5); g.scale(0.62, 0.07, 0.46); g.translate(s * 0.28, 0, -0.02);
        const w = inked(g, this.mats.body, OL * 0.8);
        w.rotation.z = -s * 0.25;
        sh.add(w);
        const tip = new THREE.Mesh(sphere(0.5), this.mats.dark);
        tip.scale.set(0.2, 0.05, 0.16); tip.position.set(s * 0.54, -s * 0.06, -0.1); tip.rotation.z = -s * 0.25;
        sh.add(tip);
      } else if (def.extra === 'owl' || def.extra === 'toucan') {
        // stubby wings with a darker feather tip
        const w = inked(sphere(0.5), this.mats.body, OL * 0.8);
        w.scale.set(0.09, B.armLen * 1.7, 0.36);
        w.position.set(s * 0.02, -B.armLen * 0.7, -0.02);
        sh.add(w);
        const tip = new THREE.Mesh(sphere(0.5), def.extra === 'toucan' ? this.mats.dark : this.mats.accent);
        tip.scale.set(0.08, B.armLen * 0.9, 0.3);
        tip.position.set(s * 0.025, -B.armLen * 1.12, -0.03);
        sh.add(tip);
      } else {
        const a = inked(capsule(0.075 * LB, B.armLen), this.mats.body, OL * 0.8);
        a.position.y = -B.armLen * 0.5;
        sh.add(a);
        if (def.extra === 'hermit') {
          // chunky crab pincers: a fat claw with a hinged top finger
          const claw = new THREE.Group();
          claw.position.y = -B.armLen - 0.04;
          const palm = inked(sphere(0.13 * LB), this.mats.accent, OL * 0.7);
          palm.scale.set(0.9, 1.1, 0.8); claw.add(palm);
          for (const [k, rz] of [[1, 0.35], [-1, -0.2]]) {
            const f = inked(new THREE.ConeGeometry(0.06 * LB, 0.2 * LB, 10), this.mats.accent, OL * 0.6);
            f.position.set(k * 0.045, -0.16 * LB, 0.02); f.rotation.set(Math.PI, 0, rz * k);
            claw.add(f);
          }
          sh.add(claw);
        } else {
          const paw = new THREE.Mesh(sphere(0.085 * LB), def.extra === 'pumice' ? this.mats.dark : this.mats.belly);
          paw.position.y = -B.armLen - 0.02;
          sh.add(paw);
          if (def.extra === 'sloth') {
            // three long hooked claws for hanging off branches
            for (let k = -1; k <= 1; k++) {
              const c = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.16, 6), this.mats.belly);
              c.position.set(k * 0.035, -B.armLen - 0.11, 0.04); c.rotation.x = Math.PI - 0.5;
              sh.add(c);
            }
          }
          if (def.extra === 'puffer') { a.visible = false; paw.visible = false; const fin = inked(sphere(0.5), this.mats.accent, OL * 0.6); fin.scale.set(0.05, 0.16, 0.22); fin.position.set(s * 0.05, -0.06, 0); fin.rotation.z = s * 0.4; sh.add(fin); }
        }
      }
      sh.rotation.z = s * 0.35;
      sh.userData.side = s;
      this.arms.push(sh);
    }
    // legs
    this.legs = [];
    for (const s of [-1, 1]) {
      const hp = new THREE.Group();
      hp.position.set(s * B.w * 0.26, 0.04, 0);
      pelvis.add(hp);
      const l = inked(capsule(0.09 * LB, B.legLen * 0.6), this.mats.body, OL * 0.8);
      l.position.y = -B.legLen * 0.4;
      hp.add(l);
      const foot = inked(sphere(0.11 * Math.sqrt(LB)), def.extra === 'penguin' ? this.mats.accent : this.mats.belly, OL * 0.8);
      foot.scale.set(1, 0.6, 1.35);
      foot.position.set(0, -hipY + 0.06, 0.05);
      hp.add(foot);
      this.legs.push(hp);
    }

    // tail
    const tail = this.tail = new THREE.Group();
    tail.position.set(0, B.h * 0.25, -B.w * 0.42);
    torso.add(tail);
    this.flames = [];
    if (def.tail === 'flame') {
      tail.position.y = B.h * 0.4;
      tail.rotation.x = -0.7;
      const outer = new THREE.Mesh(flameGeo(), new THREE.MeshBasicMaterial({ color: C.flame ?? 0xff5a1e }));
      const inner = new THREE.Mesh(flameGeo(), new THREE.MeshBasicMaterial({ color: C.flameIn ?? 0xffe066 }));
      outer.scale.setScalar(0.42); inner.scale.setScalar(0.27); inner.position.set(0, 0.02, 0.03);
      tail.add(outer, inner);
      this.flames.push(outer, inner);
      const stub = inked(sphere(0.09), this.mats.body, OL);
      stub.position.y = -0.04;
      tail.add(stub);
    } else if (def.tail === 'fin') {
      tail.position.y = B.h * 0.18;
      const f = inked(sphere(0.5), this.mats.body, OL);
      f.scale.set(0.12, 0.3, 0.75); f.position.z = -0.28;
      tail.add(f);
      const fin = new THREE.Mesh(sphere(0.5), this.mats.accent);
      fin.scale.set(0.05, 0.42, 0.7); fin.position.set(0, 0.06, -0.33);
      tail.add(fin);
    } else if (def.tail === 'puff') {
      const p = inked(sphere(0.15), this.mats.belly, OL);
      tail.add(p);
    } else if (def.tail === 'bushy') {
      // big fluffy squirrel tail curling up the back
      tail.position.y = B.h * 0.2;
      tail.rotation.x = 0.12;
      const pieces = [];
      for (let k = 0; k < 5; k++) {
        const a = k / 4, r = 0.17 + Math.sin(a * Math.PI) * 0.1;
        const g = sphere(r);
        g.translate(0, 0.12 + a * 0.62, -Math.sin(a * 2.4) * 0.26);
        pieces.push(g);
      }
      tail.add(inked(mergeGeometries(pieces), this.mats.body, OL));
      const tip = inked(sphere(0.15), this.mats.belly, OL * 0.8);
      tip.position.set(0, 0.8, 0.02);
      tail.add(tip);
    } else if (def.tail === 'foxfire') {
      // a big fluffy fox brush sweeping out and up, with a little campfire burning on the cream tip
      tail.position.y = B.h * 0.12;
      tail.rotation.x = -0.25;
      const pieces = [];
      for (let k = 0; k < 11; k++) {
        const a = k / 10, r = 0.12 + Math.sin(Math.min(1, a * 1.15) * Math.PI) * 0.12;
        const g = sphere(r);
        g.translate(0, 0.05 + a * a * 0.55, -0.12 - Math.sin(a * 1.9) * 0.42);
        pieces.push(g);
      }
      tail.add(inked(mergeGeometries(pieces), this.mats.body, OL));
      const tip = inked(sphere(0.15), this.mats.belly, OL * 0.8);
      tip.scale.set(1, 1.15, 1); tip.position.set(0, 0.66, -0.36);
      tail.add(tip);
      const outer = new THREE.Mesh(flameGeo(), new THREE.MeshBasicMaterial({ color: C.flame ?? 0xff5a1e }));
      const inner = new THREE.Mesh(flameGeo(), new THREE.MeshBasicMaterial({ color: C.flameIn ?? 0xffe066 }));
      outer.userData.base = 0.34; inner.userData.base = 0.22;
      outer.position.set(0, 0.8, -0.36); inner.position.set(0, 0.81, -0.33);
      tail.add(outer, inner);
      this.flames.push(outer, inner);
    } else if (def.tail === 'tentacles') {
      // a skirt of wobbly tentacles hanging from under the body (they sway in update)
      this.tentacles = [];
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + 0.2, g = new THREE.Group();
        g.position.set(Math.sin(a) * B.w * 0.36, B.h * 0.12, Math.cos(a) * B.w * 0.3);
        const pieces = [];
        for (let j = 0; j < 5; j++) { const sp = new THREE.SphereGeometry(0.07 - j * 0.009, 14, 10); sp.translate(Math.sin(j * 1.3) * 0.03, -j * 0.075, 0); pieces.push(sp); }
        g.add(inked(mergeGeometries(pieces), k % 2 ? this.mats.body : this.mats.belly, OL * 0.6));
        g.userData.k = k;
        pelvis.add(g);
        this.tentacles.push(g);
      }
    } else if (def.tail === 'otter') {
      // thick tapered rudder tail that sweeps out behind
      tail.position.y = B.h * 0.12;
      tail.rotation.x = -1.25;
      const pieces = [];
      for (let k = 0; k < 4; k++) {
        const a = k / 3, g = sphere(0.15 - a * 0.07);
        g.scale(1.15, 1, 0.85); g.translate(0, 0.08 + a * 0.5, -a * a * 0.12);
        pieces.push(g);
      }
      tail.add(inked(mergeGeometries(pieces), this.mats.dark, OL));
    } else if (def.tail === 'stub') {
      tail.position.y = B.h * 0.18;
      tail.rotation.x = -1.9;
      const t = inked(new THREE.ConeGeometry(0.1, 0.42, 12), this.mats.dark, OL);
      t.position.y = 0.2;
      tail.add(t);
    } else if (def.tail === 'feathers') {
      tail.position.y = B.h * 0.2;
      for (let k = -1; k <= 1; k++) {
        const f = inked(sphere(0.5), k ? this.mats.body : this.mats.accent, OL * 0.8);
        f.scale.set(0.14, 0.05, 0.42);
        f.position.set(k * 0.1, 0, -0.16);
        f.rotation.y = k * 0.45;
        tail.add(f);
      }
    } else if (def.tail === 'lantern') {
      // glowing firefly abdomen
      tail.position.set(0, B.h * 0.32, -B.w * 0.3);
      tail.rotation.x = -0.5;
      const seg = inked(sphere(0.5), this.mats.dark, OL);
      seg.scale.set(0.3, 0.3, 0.3); seg.position.z = -0.06;
      tail.add(seg);
      const bulb = inked(sphere(0.5), new THREE.MeshBasicMaterial({ color: C.accent }), OL);
      bulb.scale.set(0.42, 0.4, 0.5); bulb.position.z = -0.3;
      tail.add(bulb);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.position.z = -0.3;
      tail.add(halo);
      this.lantern = halo;
      (this.glows ||= []).push(bulb);
    } else if (def.tail === 'whip') {
      // a long thin manta tail that tapers to a point, with a tiny barb fin
      tail.position.y = B.h * 0.2;
      tail.rotation.x = -1.35;
      const pts = [];
      for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new THREE.Vector3(0, t * 0.85, -Math.sin(t * 2.2) * 0.12)); }
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.04, 6);
      const pos = g.attributes.position, nrm = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), k = 1 - Math.min(1, Math.max(0, y / 0.85)) * 0.8; const c = pts[Math.round(Math.min(1, Math.max(0, y / 0.85)) * 8)]; nrm.set(pos.getX(i) - c.x, 0, pos.getZ(i) - c.z); pos.setX(i, c.x + nrm.x * k); pos.setZ(i, c.z + nrm.z * k); }
      g.computeVertexNormals();
      tail.add(inked(g, this.mats.dark, OL * 0.6));
      const barb = inked(new THREE.ConeGeometry(0.05, 0.14, 4), this.mats.accent, OL * 0.4);
      barb.position.set(0, 0.32, 0.03); barb.rotation.x = 0.6;
      tail.add(barb);
    } else if (def.tail === 'bolt') {
      tail.position.y = B.h * 0.3;
      tail.rotation.x = -0.9;
      const b = inked(boltGeo(), this.mats.body, OL);
      b.scale.setScalar(1.25);
      tail.add(b);
      const tip = new THREE.Mesh(sphere(0.07), this.mats.accent);
      tip.position.y = 0.72;
      tail.add(tip);
    }

    // springy pose state: current and velocity per channel
    this.P = {};
    if (def.tailScale) tail.scale.setScalar(def.tailScale);
    if (def.earScale) for (const e of this.ears) e.scale.setScalar(def.earScale);
    buildGrowth(this, def, U, OL, { flameGeo, leafGeo, boltGeo });
    if (def.gear) this.buildGear(def.gear, U, OL);
    this.V = {};
    this.pose = {};
    this.resetPose();
    for (const k in this.pose) { this.P[k] = this.pose[k]; this.V[k] = 0; }
    this.blinkT = 2 + Math.random() * 2;
    this.eyeKind = 'open';
    this.mouthKind = 'smile';
    this.emoteHold = 0;
    this.t = Math.random() * 10;

    root.traverse((o) => { if (o.isMesh && !o.userData.hull && o.material && !o.material.transparent) o.castShadow = true; });
    this.built = true;
    seg = SEG; growthSeg(28);
  }

  // level-up gear: 1 = type-coloured scarf, 2 = gold star pin, 3 = tiny crown
  buildGear(n, U = this.rim, OL = 0.02) {
    const from = (this.gearN || 0) + 1;
    if (n < from) return;
    this.gearN = n;
    const B = this.def.body, headR = B.headR;
    const col = new THREE.Color(TYPES[this.def.type].color);
    const scarfMat = toon(col.getHex(), { uniforms: U });
    const gold = toon(0xffc93a, { uniforms: U, rim: 0.9 });
    // the giant stage 3 forms outgrow the scarf (pin and crown still show)
    if (from <= 1 && (this.def.stage || 1) < 3) {
    // grown forms wear it just under the chin (their heads overlap the base neckline)
    const sy = this.def.stage ? B.h * 0.82 - headR * 0.26 : B.h * 0.84;
    // ...and snug: sized to the body's slice at that height, so it reads as a scarf and not a hoop floating round the tummy
    const t = (sy - B.h * 0.48) / (B.h * 0.5), snug = this.def.stage ? Math.sqrt(Math.max(0.3, 1 - t * t)) * 1.06 : 1;
    const ring = inked(new THREE.TorusGeometry(B.w * 0.5 * snug, this.def.stage ? 0.06 : 0.085, seg < 20 ? 6 : 10, seg < 20 ? 18 : 28), scarfMat, OL * 0.8);
    ring.rotation.x = Math.PI / 2 - 0.3;
    ring.scale.set(this.def.stage ? Math.min(B.chubby * 0.86, 0.36 / (B.w * 0.5 * snug)) : B.chubby * 1.05, 1, this.def.stage ? 1.7 : 1); // grown forms: a flat cloth band, not a round tube, narrowed so its ends tuck into the sides (a collar under the chin, not a belt; never wider than 0.36 a side, or the widest bodies like Snoozalot wear a belt again)
    ring.position.set(0, sy, B.w * 0.04);
    this.torso.add(ring);
    if (this.def.stage) {
      // grown forms: a knot under the chin with a short end hanging down, so the band reads as a tied scarf from any angle
      const R = B.w * 0.5 * snug, fy = sy + R * 0.296, fz = B.w * 0.04 + R * 0.955;
      const knot = inked(new THREE.SphereGeometry(0.075, 10, 8), scarfMat, OL * 0.6);
      knot.scale.set(1.15, 0.9, 0.7); knot.position.set(R * 0.18, fy - 0.01, fz + 0.02); this.torso.add(knot);
      const end = inked(new THREE.BoxGeometry(0.11, 0.2, 0.035), scarfMat, OL * 0.6);
      end.geometry.translate(0, -0.1, 0); end.position.set(R * 0.18, fy - 0.05, fz + 0.03); end.rotation.set(-0.35, 0, 0.18); this.torso.add(end);
    }
    // two tails flapping off the back
    const tailG = new THREE.Group();
    tailG.position.set(B.w * 0.12, sy - B.h * 0.08, -B.w * 0.34);
    for (const [x, rz, len] of [[0, 0.25, 0.26], [0.07, -0.15, 0.2]]) {
      const t = inked(new THREE.BoxGeometry(0.1, len, 0.035), scarfMat, OL * 0.6);
      t.geometry.translate(0, -len / 2, 0);
      t.position.x = x; t.rotation.set(0.5, 0, rz);
      tailG.add(t);
    }
    this.torso.add(tailG);
    this.scarfTails = tailG;
    }
    if (n >= 2 && from <= 2) {
      const sh = new THREE.Shape();
      for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.035 : 0.08, a = k * Math.PI / 5 + Math.PI / 2; sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      const star = inked(new THREE.ExtrudeGeometry(sh, { depth: 0.025, bevelEnabled: false }), gold, OL * 0.6);
      star.position.set(B.w * 0.2, B.h * 0.66, B.w * 0.4);
      star.rotation.set(-0.25, 0.35, 0.15);
      this.torso.add(star);
    }
    if (n >= 3 && from <= 3) {
      const crown = new THREE.Group();
      const band = inked(new THREE.CylinderGeometry(headR * 0.3, headR * 0.32, headR * 0.16, 16, 1, true), gold, OL * 0.6);
      crown.add(band);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        const sp = inked(new THREE.ConeGeometry(headR * 0.07, headR * 0.2, 6), gold, OL * 0.5);
        sp.position.set(Math.sin(a) * headR * 0.3, headR * 0.15, Math.cos(a) * headR * 0.3);
        crown.add(sp);
        const gem = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.035, 8, 6), toon(k % 2 ? 0xff4f8a : 0x48b8ff, { uniforms: U }));
        gem.position.set(Math.sin(a) * headR * 0.315, 0, Math.cos(a) * headR * 0.315);
        crown.add(gem);
      }
      crown.position.set(headR * 0.14, headR * 1.0, headR * 0.05);
      crown.scale.setScalar(1.25);
      crown.rotation.set(0.12, 0, -0.22);
      this.skull.add(crown); this.gearCrown = crown;
    }
    if (this.built) this.root.traverse((o) => { if (o.isMesh && !o.userData.hull && o.material && !o.material.transparent) o.castShadow = true; });
  }

  resetPose() {
    Object.assign(this.pose, {
      y: 0, sx: 1, sy: 1, lean: 0, roll: 0, yaw: 0,
      armLx: 0, armRx: 0, armLz: 0, armRz: 0, legL: 0, legR: 0,
      head: 0, headRoll: 0, headYaw: 0, ear: 0, tail: 0,
    });
  }

  // eyes / mouth; hold keeps it from being overridden by blinks for `hold` seconds
  emote(eye, mouth, hold = 0) {
    if (eye) this.eyeKind = eye;
    if (mouth) this.mouthKind = mouth;
    this.emoteHold = Math.max(this.emoteHold, hold);
  }

  flash(t = 0.12) { this.flashT = t; }

  update(dt) {
    this.t += dt;
    if (this.scarfTails) this.scarfTails.rotation.x = 0.15 + Math.sin(this.t * 7) * 0.12 + Math.min(0.6, Math.abs(this.P.lean || 0));
    const t = this.t;
    // spring every channel toward its target (critically under-damped for overshoot)
    // fixed substeps keep the stiff springs stable through frame hitches
    const k = 260, d = 20;
    const n = Math.min(12, Math.ceil(dt / (1 / 120))), h = dt / n;
    for (let i = 0; i < n; i++) {
      for (const key in this.pose) {
        const a = (this.pose[key] - this.P[key]) * k - this.V[key] * d;
        this.V[key] += a * h;
        this.P[key] += this.V[key] * h;
      }
    }
    const P = this.P;
    this.scaleG.scale.set(P.sx, P.sy, P.sx);
    this.scaleG.position.y = P.y;
    this.pelvis.rotation.set(P.lean, P.yaw, P.roll);
    this.head.rotation.set(P.head, P.headYaw, P.headRoll);
    this.arms[0].rotation.set(P.armLx, 0, -0.35 - P.armLz);
    this.arms[1].rotation.set(P.armRx, 0, 0.35 + P.armRz);
    this.legs[0].rotation.x = P.legL;
    this.legs[1].rotation.x = P.legR;
    for (const e of this.ears) {
      const s = e.userData.side;
      const base = this.def.ears === 'long' ? -s * 0.18 : this.def.ears === 'round' ? -s * 0.5 : this.def.ears === 'pointy' ? -s * 0.42 : this.def.ears === 'antennae' ? -s * 0.35 : 0;
      e.rotation.z = base - s * P.ear * 0.6 + Math.sin(t * 3 + s) * 0.04;
      e.rotation.x = this.def.ears === 'long' ? -P.ear * 0.9 - 0.15 : 0;
    }
    this.tail.rotation.y = Math.sin(t * (4 + P.tail * 10)) * (0.25 + P.tail * 0.35);
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i], base = f.userData.base ?? (i ? 0.27 : 0.42);
      f.scale.set(base * (1 + Math.sin(t * 23 + i) * 0.08), base * (1 + Math.sin(t * 17 + i * 2) * 0.16), base);
    }
    if (this.spinners) for (const g of this.spinners) g.rotation[g.userData.axis || 'z'] += dt * g.userData.spin;
    if (this.sprout) this.sprout.rotation.z = Math.sin(t * 2.2) * 0.15 + P.roll * 0.6;
    for (const w of this.wings) {
      const { s, k } = w.userData;
      w.rotation.y = s * (0.5 + Math.sin(t * (24 + P.tail * 14) + k * 1.4) * (0.35 + P.tail * 0.2));
      w.rotation.z = s * (k ? -0.25 : 0.15);
    }
    if (this.tentacles) for (const g of this.tentacles) { const k = g.userData.k; g.rotation.x = Math.sin(t * 3.2 + k) * 0.25 - (P.lean || 0) * 0.5; g.rotation.z = Math.cos(t * 2.6 + k * 1.7) * 0.2; }
    if (this.lantern) {
      const pulse = 0.8 + Math.sin(t * 4) * 0.2;
      this.lantern.scale.setScalar(1.15 + pulse * 0.35);
      this.lantern.material.opacity = 0.16 + pulse * 0.12;
    }

    // blinking unless an emote is being held
    this.emoteHold -= dt;
    this.blinkT -= dt;
    let eye = this.eyeKind;
    if (this.emoteHold <= 0 && eye === 'open' && this.blinkT < 0.09) eye = 'closed';
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 3;
    this.eyeMatL.map = this.eyeMatR.map = this.faceTex.eyes[eye];
    this.mouthMat.map = this.faceTex.mouths[this.mouthKind];

    // hit flash: push emissive white
    this.flashT -= dt;
    const fl = this.flashT > 0 ? 0.85 : 0;
    for (const m of Object.values(this.mats)) m.emissive.setScalar(fl);
  }

  setRim(color, amt = 1) {
    this.rim.uRimColor.value.set(color).multiplyScalar(amt);
  }
}

// route trainers dress for the job, so a Hiker, a Fisher and a Skater read apart at a glance
const HATS = [ // townsfolk hats by role (Mom wears a flower crown: she's the hero's own species, so it tells them apart)
  [/^Mom$/, 'flower', 0x5ac24a, 0xff8ac8], [/^Hiker/, 'bucket', 0x9a7240], [/^(Camper|Picker)/, 'cap', 0x4aa04a], [/^Fisher/, 'wide', 0xf0d27a], [/^(Picnicker|Gardener)/, 'wide', 0xfff2c8, 0xff6a9a],
  [/^(Kite Flyer|Sky Diver)/, 'cap', 0x5a8ad8], [/^Swimmer/, 'swim', 0x3ac8ff], [/^Skater/, 'back', 0xff5a8a], [/^Firewalker/, 'band', 0xff4a2a], [/^Gang/, 'band', 0x3a2a4a], [/^Milliner/, 'top', 0x2a2438, 0xff3a5a], [/^Trader/, 'tricorn', 0x6a3a2a, 0xffd84d], [/^Ace/, 'beanie', 0xf4f8ff, 0x3a6ad8],
];
export function roleHat(cr, name) {
  const h = HATS.find(([re]) => re.test(name)); if (!h) return false;
  hatModel(cr, h[1], h[2], h[3]); return true;
}
// hats the hero can buy at the Bloom Town Hat Shop (Adventure), priced in berries
export const SHOP_HATS = [
  { id: 'cap', name: 'Red Cap', kind: 'cap', col: 0xff4a4a, price: 3 },
  { id: 'explorer', name: 'Explorer Hat', kind: 'bucket', col: 0x9a7240, price: 4 },
  { id: 'sun', name: 'Sun Hat', kind: 'wide', col: 0xfff2c8, band: 0xff6a9a, price: 4 },
  { id: 'beanie', name: 'Cosy Beanie', kind: 'beanie', col: 0x5ad8ff, band: 0xffffff, price: 5 },
  { id: 'party', name: 'Party Hat', kind: 'party', col: 0xff5ad8, band: 0xffd84d, price: 5 },
  { id: 'flower', name: 'Flower Crown', kind: 'flower', col: 0x5ac24a, band: 0xff8ac8, price: 6 },
  { id: 'top', name: 'Top Hat', kind: 'top', col: 0x2a2438, band: 0xff3a5a, price: 8 },
  // Chapter 2: only the Shell Hats stall in Port Coral sells these
  { id: 'boater', name: 'Straw Boater', kind: 'wide', col: 0xf0d080, band: 0x3ad0d8, price: 8, isle: true },
  { id: 'lei', name: 'Hibiscus Crown', kind: 'flower', col: 0x3ab86a, band: 0xff5a7a, price: 9, isle: true },
  { id: 'captain', name: "Captain's Cap", kind: 'sailor', col: 0xffffff, band: 0x2a4a8a, price: 10, isle: true },
  { id: 'surfvisor', name: 'Surf Visor', kind: 'visor', col: 0x3ad0d8, band: 0xffa64a, price: 8, isle: true },
  // only Trader Tock has these (a different town each day)
  { id: 'pirate', name: 'Pirate Hat', kind: 'tricorn', col: 0x2a2438, band: 0xffd84d, price: 10, trader: true },
  { id: 'wizard', name: 'Wizard Hat', kind: 'wizard', col: 0x5a3ab8, band: 0xffe14d, price: 12, trader: true },
  { id: 'chef', name: 'Chef Hat', kind: 'chef', col: 0xffffff, band: 0xe8e8f0, price: 9, trader: true },
  { id: 'cowpoke', name: 'Ranger Hat', kind: 'ranger', col: 0xb07a40, band: 0x5a3a20, price: 10, trader: true },
  { id: 'helm', name: 'Horned Helm', kind: 'helm', col: 0xa8b4c8, band: 0xfff2d8, price: 12, trader: true },
  { id: 'bunny', name: 'Bunny Band', kind: 'bunny', col: 0xffffff, band: 0xff9ac8, price: 9, trader: true },
  // gifts (never sold)
  { id: 'aviator', name: 'Aviator Cap', kind: 'aviator', col: 0x8a5a3a, band: 0x9ad8ff, price: 0, gift: true },
  { id: 'sailor', name: 'Sailor Hat', kind: 'sailor', col: 0xffffff, band: 0x3a6aff, price: 0, gift: true },
  { id: 'muffs', name: 'Fluffy Earmuffs', kind: 'muffs', col: 0xff8ac8, band: 0xfff4fa, price: 0, gift: true },
  { id: 'straw', name: 'Straw Hat', kind: 'wide', col: 0xe8c870, band: 0x4cba4a, price: 0, gift: true },
  { id: 'propeller', name: 'Propeller Cap', kind: 'propeller', col: 0x5a8aff, band: 0xffd84d, price: 0, gift: true },
  { id: 'phones', name: 'DJ Headphones', kind: 'phones', col: 0x2a2438, band: 0xff5ad8, price: 0, gift: true },
  { id: 'seedling', name: 'Seedling Sprout', kind: 'seedling', col: 0x5ac24a, band: 0xffffff, price: 0, gift: true },
  { id: 'bobble', name: 'Cocoa Bobble Hat', kind: 'beanie', col: 0x8a4a2a, band: 0xfff4e0, price: 0, gift: true },
  { id: 'visor', name: 'Frosty Visor', kind: 'visor', col: 0x6ad8ff, band: 0xffffff, price: 0, gift: true },
  { id: 'boppers', name: 'Neon Boppers', kind: 'boppers', col: 0x2a2438, band: 0xff5ad8, price: 8, market: true }, // only at Chef Rumi's noodle cart in Neon City
  { id: 'nightcap', name: 'Sleepy Nightcap', kind: 'nightcap', col: 0x6a8aff, band: 0xffffff, price: 0, gift: true },
  { id: 'twinkle', name: 'Twinkle Bobble', kind: 'nightcap', col: 0xe8384a, band: 0xffffff, price: 0, gift: true, season: true }, // three Twinkle Week gifts from under the town trees (seasonal)
  { id: 'seasons', name: 'Four Seasons Crown', kind: 'seasons', col: 0x5aa84a, band: 0xffffff, price: 0, gift: true, season: true }, // seen every season in Clashara (a year-long goal, so not counted towards the hat total)
  { id: 'pumpkin', name: 'Pumpkin Head', kind: 'pumpkin', col: 0xff8a1a, band: 0x4a7a2a, price: 0, gift: true, season: true }, // three Pumpkin Nights treats (seasonal, so not counted towards the hat total)
  { id: 'shutter', name: 'Shutterbug Cap', kind: 'cap', col: 0x3a9a6a, band: 0xffd84d, price: 0, gift: true }, // a photo of every town's landmark
  { id: 'sunbloom', name: 'Sunbloom Hat', kind: 'sunflower', col: 0xffd23a, band: 0x8a5a2a, price: 0, gift: true }, // the first flower grown in Bloom Town's garden plot
  { id: 'angler', name: "Angler's Bucket", kind: 'bucket', col: 0x4a8a8a, band: 0xffd84d, price: 0, gift: true }, // Fisher Finn's weekly Fishing Derby, first win
  { id: 'koi', name: 'Koi Bucket Hat', kind: 'koi', col: 0x4a7ab8, band: 0xffd84d, price: 0, gift: true, season: true }, // all four seasonal visitor fish (a year-long goal, so not counted towards the hat total)
  { id: 'eggshell', name: 'Eggshell Cap', kind: 'eggshell', col: 0xfff6e4, band: 0x8ad8a0, price: 0, gift: true }, // the first egg hatched at Nanny Nell's Daycare
  { id: 'laurel', name: 'Golden Laurel', kind: 'laurel', col: 0xe8b830, band: 0xfff2a0, price: 0, gift: true }, // the Peak Gauntlet's first clear
];
export function shopHat(cr, id) {
  const h = SHOP_HATS.find((x) => x.id === id); if (!h) return null;
  return hatModel(cr, h.kind, h.col, h.band);
}
// builds a hat on cr.skull (anything with def.body.headR and a skull group works, e.g. a shop's hat stand)
export function hatModel(cr, kind, col, band) {
  const r = cr.def.body.headR, M = toon(col, { rim: 0.4 }), G = new THREE.Group();
  const add = (geo, m = M, ink = 0.02) => { const o = inked(geo, m, ink); G.add(o); return o; };
  if (kind === 'koi') { // a bucket hat with a koi leaping off the top (all four seasonal fish)
    add(new THREE.CylinderGeometry(r * 0.55, r * 0.72, r * 0.42, 16)).position.y = r * 0.18; add(new THREE.CylinderGeometry(r * 1.0, r * 1.0, r * 0.05, 18)); add(new THREE.CylinderGeometry(r * 0.73, r * 0.73, r * 0.1, 16), toon(band), 0).position.y = r * 0.04;
    const F = new THREE.Group(); F.position.set(0, r * 0.62, 0); F.rotation.z = 0.6; F.scale.setScalar(1.45); G.add(F); const fm = toon(0xff4a2a, { rim: 0.6 }), wm = toon(0xfff8f0, { rim: 0.6 }); // a white koi with red-orange patches (reads on orange heroes too)
    const body = inked(new THREE.SphereGeometry(r * 0.2, 12, 8), wm, 0.015); body.scale.set(1.6, 0.85, 0.7); F.add(body);
    for (const [px, py, pz, sr] of [[0.08, 0.1, 0.04, 0.1], [-0.13, 0.08, -0.03, 0.08], [0.0, 0.02, 0.1, 0.07]]) { const sp = new THREE.Mesh(new THREE.SphereGeometry(r * sr, 8, 6), fm); sp.scale.set(1.3, 0.7, 0.9); sp.position.set(r * px, r * py, r * pz); F.add(sp); }
    const tail = inked(new THREE.ConeGeometry(r * 0.13, r * 0.22, 8), fm, 0.015); tail.rotation.z = Math.PI / 2; tail.scale.set(1, 1, 0.35); tail.position.x = -r * 0.38; F.add(tail);
    for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(r * 0.03, 6, 5), toon(0x1a1a24)); e.position.set(r * 0.22, r * 0.05, sd * r * 0.12); F.add(e); }
  }
  if (kind === 'bucket') { add(new THREE.CylinderGeometry(r * 0.55, r * 0.72, r * 0.42, 16)).position.y = r * 0.18; add(new THREE.CylinderGeometry(r * 1.0, r * 1.0, r * 0.05, 18)); }
  if (kind === 'wide') { add(new THREE.SphereGeometry(r * 0.62, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)).scale.y = 0.7; add(new THREE.CylinderGeometry(r * 1.3, r * 1.3, r * 0.04, 22)); if (band) { add(new THREE.CylinderGeometry(r * 0.63, r * 0.63, r * 0.1, 16), toon(band), 0).position.y = r * 0.06; const f = add(new THREE.SphereGeometry(r * 0.13, 8, 6), toon(band), 0.012); f.position.set(r * 0.5, r * 0.15, r * 0.3); } }
  if (kind === 'cap' || kind === 'back') { add(new THREE.SphereGeometry(r * 0.72, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)).scale.y = 0.6; const v = add(new THREE.CylinderGeometry(r * 0.5, r * 0.5, r * 0.04, 16, 1, false, -Math.PI / 2, Math.PI)); v.position.z = r * 0.45 * (kind === 'back' ? -1 : 1); v.rotation.y = kind === 'back' ? Math.PI : 0; }
  if (kind === 'swim') { add(new THREE.SphereGeometry(r * 0.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)).scale.y = 0.75; G.position.y -= r * 0.25; }
  if (kind === 'band') { add(new THREE.TorusGeometry(r * 0.95, r * 0.08, 6, 20)).rotation.x = Math.PI / 2; G.position.y -= r * 0.45; }
  if (kind === 'beanie') { add(new THREE.SphereGeometry(r * 0.78, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)).scale.y = 0.82; add(new THREE.TorusGeometry(r * 0.76, r * 0.1, 6, 20), toon(band), 0.012).rotation.x = Math.PI / 2; add(new THREE.SphereGeometry(r * 0.2, 10, 8), toon(band)).position.y = r * 0.68; G.position.y -= r * 0.2; }
  if (kind === 'boppers') { G.position.y -= r * 0.16; add(new THREE.TorusGeometry(r * 0.8, r * 0.08, 6, 24)).rotation.x = Math.PI / 2; [[-1, band], [1, 0x5ae8ff]].forEach(([sd, c]) => { const st = add(new THREE.CylinderGeometry(r * 0.05, r * 0.05, r * 0.75, 6), toon(c), 0.01); st.position.set(sd * r * 0.42, r * 0.4, 0); st.rotation.z = -sd * 0.35; const b = new THREE.Mesh(new THREE.SphereGeometry(r * 0.17, 10, 8), new THREE.MeshBasicMaterial({ color: c })); b.position.set(sd * r * 0.56, r * 0.78, 0); G.add(b); }); }
  if (kind === 'visor') { G.position.y -= r * 0.32; add(new THREE.TorusGeometry(r * 0.86, r * 0.08, 6, 24), toon(band), 0.012).rotation.x = Math.PI / 2; const v = add(new THREE.CylinderGeometry(r * 0.95, r * 0.95, r * 0.05, 20, 1, false, -Math.PI * 0.42, Math.PI * 0.84)); v.position.set(0, r * 0.02, r * 0.12); v.rotation.x = 0.18; for (const sd of [-1, 1]) { const f = add(new THREE.OctahedronGeometry(r * 0.13), toon(band), 0); f.position.set(sd * r * 0.5, r * 0.08, r * 0.82); } }
  if (kind === 'nightcap') { G.position.y -= r * 0.12; const a = add(new THREE.CylinderGeometry(r * 0.36, r * 0.76, r * 0.72, 16)); a.position.y = r * 0.3; const b = add(new THREE.ConeGeometry(r * 0.36, r * 1.0, 12)); b.position.set(r * 0.4, r * 0.76, 0); b.rotation.z = -1.1; const p = add(new THREE.SphereGeometry(r * 0.2, 10, 8), toon(band)); p.position.set(r * 0.92, r * 0.52, 0); const ring = add(new THREE.TorusGeometry(r * 0.74, r * 0.1, 6, 20), toon(band)); ring.rotation.x = Math.PI / 2; }
  if (kind === 'party') { add(new THREE.ConeGeometry(r * 0.42, r * 1.0, 16)).position.y = r * 0.5; for (let k = 0; k < 3; k++) { const s = add(new THREE.TorusGeometry(r * (0.34 - k * 0.1), r * 0.04, 4, 16), toon(band), 0); s.rotation.x = Math.PI / 2; s.position.y = r * (0.18 + k * 0.25); } add(new THREE.SphereGeometry(r * 0.13, 8, 6), toon(band)).position.y = r * 1.02; G.rotation.z = 0.15; }
  if (kind === 'pumpkin') { // a little carved pumpkin worn like a cap: ribbed lobes, a curly stem and a leaf
    G.position.y -= r * 0.2;
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, l = add(new THREE.SphereGeometry(r * 0.42, 12, 8), M, 0.014); l.scale.set(0.7, 0.85, 1); l.position.set(Math.cos(a) * r * 0.3, r * 0.32, Math.sin(a) * r * 0.3); l.rotation.y = -a; }
    const st = add(new THREE.CylinderGeometry(r * 0.07, r * 0.1, r * 0.3, 6), toon(band), 0.01); st.position.y = r * 0.78; st.rotation.z = 0.3;
    const lf = add(new THREE.SphereGeometry(r * 0.2, 8, 6), toon(0x5aa83a), 0.01); lf.scale.set(1, 0.25, 0.6); lf.position.set(r * 0.2, r * 0.72, 0);
  }
  if (kind === 'laurel') { // a ring of golden leaves, two by two, with a bright gem at the front
    add(new THREE.TorusGeometry(r * 0.78, r * 0.045, 6, 22)).rotation.x = Math.PI / 2;
    const L = toon(col, { rim: 0.8 }), leaf = new THREE.SphereGeometry(r * 0.14, 8, 6);
    for (let k = 0; k < 14; k++) { const a = Math.PI * 0.62 + k / 14 * Math.PI * 1.76, f = add(leaf.clone(), L, 0.012); f.position.set(Math.cos(a) * r * 0.8, r * 0.07, Math.sin(a) * r * 0.8); f.scale.set(0.7, 0.45, 1.45); f.rotation.y = -a + (k % 2 ? 0.5 : -0.5); }
    add(new THREE.OctahedronGeometry(r * 0.13), toon(0xff4a6a, { rim: 0.9 }), 0.012).position.set(0, r * 0.1, r * 0.82); leaf.dispose();
    G.position.y -= r * 0.02; G.rotation.x = 0.38; G.scale.setScalar(1.15); // tipped forward like a real wreath, so it reads from the front
  }
  if (kind === 'flower') { add(new THREE.TorusGeometry(r * 0.78, r * 0.07, 6, 22)).rotation.x = Math.PI / 2; const P = [toon(band), toon(0xffe14d), toon(0xffffff)]; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, f = add(new THREE.SphereGeometry(r * 0.15, 8, 6), P[k % 3], 0.012); f.position.set(Math.cos(a) * r * 0.78, r * 0.06, Math.sin(a) * r * 0.78); f.scale.y = 0.6; } G.position.y -= r * 0.12; G.rotation.x = 0.32; }
  if (kind === 'tricorn') { const b = add(new THREE.CylinderGeometry(r * 1.0, r * 1.0, r * 0.3, 3)); b.rotation.y = Math.PI; b.scale.z = 0.85; add(new THREE.CylinderGeometry(r * 1.02, r * 1.02, r * 0.05, 3), toon(band), 0).position.y = r * 0.14; add(new THREE.SphereGeometry(r * 0.55, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)).scale.y = 0.75; const sk = add(new THREE.SphereGeometry(r * 0.13, 8, 6), toon(0xffffff), 0.012); sk.position.set(0, r * 0.2, r * 0.5); }
  if (kind === 'wizard') { add(new THREE.CylinderGeometry(r * 1.15, r * 1.15, r * 0.05, 22)); const c = add(new THREE.ConeGeometry(r * 0.6, r * 1.5, 16)); c.position.y = r * 0.75; c.rotation.z = 0.18; for (let k = 0; k < 4; k++) { const st = add(new THREE.OctahedronGeometry(r * 0.09), toon(band), 0); const a = k * 1.7; st.position.set(Math.cos(a) * r * 0.42, r * (0.35 + k * 0.22), Math.sin(a) * r * 0.42 * (1 - k * 0.2)); } }
  if (kind === 'chef') { add(new THREE.CylinderGeometry(r * 0.56, r * 0.56, r * 0.4, 18)).position.y = r * 0.18; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, p = add(new THREE.SphereGeometry(r * 0.32, 12, 8), M, 0.015); p.position.set(Math.cos(a) * r * 0.3, r * 0.52, Math.sin(a) * r * 0.3); } add(new THREE.SphereGeometry(r * 0.34, 12, 8), M, 0.015).position.y = r * 0.66; add(new THREE.CylinderGeometry(r * 0.575, r * 0.575, r * 0.06, 18), toon(band), 0).position.y = r * 0.06; }
  if (kind === 'ranger') { const b = add(new THREE.CylinderGeometry(r * 1.05, r * 1.05, r * 0.05, 22)); b.scale.z = 0.85; b.rotation.z = 0.08; const c = add(new THREE.SphereGeometry(r * 0.52, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)); c.scale.set(1, 0.95, 0.85); const dent = add(new THREE.BoxGeometry(r * 0.12, r * 0.18, r * 0.7), toon(new THREE.Color(col).multiplyScalar(0.8).getHex()), 0); dent.position.y = r * 0.46; add(new THREE.CylinderGeometry(r * 0.53, r * 0.53, r * 0.1, 18), toon(band), 0).position.y = r * 0.07; }
  if (kind === 'helm') { add(new THREE.SphereGeometry(r * 0.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)).scale.y = 0.85; add(new THREE.TorusGeometry(r * 0.8, r * 0.07, 6, 22), toon(0xd8a040), 0).rotation.x = Math.PI / 2; for (const sd of [-1, 1]) { const h = add(new THREE.ConeGeometry(r * 0.16, r * 0.62, 10), toon(band), 0.015); h.position.set(sd * r * 0.82, r * 0.38, 0); h.rotation.z = -sd * 0.75; } G.position.y -= r * 0.16; }
  if (kind === 'bunny') { add(new THREE.TorusGeometry(r * 0.78, r * 0.05, 6, 22, Math.PI), toon(band), 0).position.y = r * 0.0; for (const sd of [-1, 1]) { const e = new THREE.Group(); e.position.set(sd * r * 0.32, r * 0.1, 0); e.rotation.set(-0.4, 0, -sd * 0.3); G.add(e); const o = inked(new THREE.CapsuleGeometry(r * 0.18, r * 0.95, 4, 10), M, 0.02); o.position.y = r * 0.6; o.scale.z = 0.6; e.add(o); const n = inked(new THREE.CapsuleGeometry(r * 0.1, r * 0.7, 4, 8), toon(band), 0); n.position.set(0, r * 0.6, r * 0.07); n.scale.z = 0.5; e.add(n); } G.position.y -= r * 0.25; }
  if (kind === 'aviator') { add(new THREE.SphereGeometry(r * 0.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)).scale.y = 0.8; for (const sd of [-1, 1]) { const f = add(new THREE.SphereGeometry(r * 0.24, 10, 8)); f.position.set(sd * r * 0.74, -r * 0.18, 0); f.scale.set(0.5, 1.2, 0.9); const gg = add(new THREE.TorusGeometry(r * 0.17, r * 0.06, 6, 14), toon(0x5a4a3a), 0.012); gg.position.set(sd * r * 0.22, r * 0.5, r * 0.5); gg.rotation.x = -0.9; const lens = add(new THREE.CircleGeometry(r * 0.15, 14), toon(band, { rim: 1 }), 0); lens.position.set(sd * r * 0.22, r * 0.51, r * 0.51); lens.rotation.x = -0.9; } add(new THREE.BoxGeometry(r * 0.2, r * 0.05, r * 0.08), toon(0x5a4a3a), 0).position.set(0, r * 0.52, r * 0.53); G.position.y -= r * 0.12; }
  if (kind === 'sailor') { const c = add(new THREE.CylinderGeometry(r * 0.62, r * 0.5, r * 0.36, 18)); c.position.y = r * 0.16; add(new THREE.TorusGeometry(r * 0.56, r * 0.1, 8, 20), M, 0.015).rotation.x = Math.PI / 2; add(new THREE.CylinderGeometry(r * 0.63, r * 0.63, r * 0.06, 18), toon(band), 0).position.y = r * 0.3; const ank = add(new THREE.BoxGeometry(r * 0.08, r * 0.2, r * 0.04), toon(band), 0); ank.position.set(0, r * 0.12, r * 0.6); G.rotation.z = 0.18; }
  if (kind === 'muffs') { add(new THREE.TorusGeometry(r * 0.86, r * 0.06, 6, 22, Math.PI), toon(band), 0.012).position.y = -r * 0.1; for (const sd of [-1, 1]) { const m = add(new THREE.SphereGeometry(r * 0.3, 12, 10), M, 0.015); m.position.set(sd * r * 0.86, -r * 0.12, 0); m.scale.set(0.7, 1, 1); } G.position.y -= r * 0.3; }
  if (kind === 'propeller') { const P = [toon(col), toon(0xff5a5a), toon(band), toon(0x5ac24a)]; for (let k = 0; k < 4; k++) add(new THREE.SphereGeometry(r * 0.72, 8, 8, k * Math.PI / 2, Math.PI / 2, 0, Math.PI / 2), P[k], 0.012).scale.y = 0.62; G.position.y -= r * 0.12; add(new THREE.CylinderGeometry(r * 0.04, r * 0.04, r * 0.3, 6), toon(0x8a94a4), 0).position.y = r * 0.55; const pr = new THREE.Group(); pr.name = 'spin'; pr.position.y = r * 0.7; G.add(pr); for (const sd of [-1, 1]) { const bl = inked(new THREE.BoxGeometry(r * 0.62, r * 0.03, r * 0.14), toon(band), 0.012); bl.position.x = sd * r * 0.31; bl.rotation.x = sd * 0.3; pr.add(bl); } pr.rotation.y = 0.6; }
  if (kind === 'phones') { add(new THREE.TorusGeometry(r * 0.84, r * 0.07, 6, 22, Math.PI), toon(band), 0.012).position.y = -r * 0.12; for (const sd of [-1, 1]) { const c = add(new THREE.CylinderGeometry(r * 0.3, r * 0.3, r * 0.2, 16)); c.rotation.z = Math.PI / 2; c.position.set(sd * r * 0.86, -r * 0.14, 0); const p = add(new THREE.CircleGeometry(r * 0.2, 16), toon(band, { rim: 1 }), 0); p.position.set(sd * r * 0.97, -r * 0.14, 0); p.rotation.y = sd * Math.PI / 2; } G.position.y -= r * 0.3; }
  if (kind === 'seasons') { add(new THREE.TorusGeometry(r * 0.78, r * 0.06, 6, 22)).rotation.x = Math.PI / 2; const P = [toon(0xf6a8c8, { rim: 0.8 }), toon(0xffcc22, { rim: 0.8 }), toon(0xe8842e, { rim: 0.8 }), toon(0xeef6ff, { rim: 0.9 })]; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, f = add(new THREE.SphereGeometry(r * 0.21, 10, 8), P[k % 4], 0.012); f.position.set(Math.cos(a) * r * 0.8, r * 0.08, Math.sin(a) * r * 0.8); f.scale.set(1, 0.65, 1); } G.rotation.x = 0.34; G.scale.setScalar(1.12); } // blossom, sunflower, autumn leaf and snow, round and round
  if (kind === 'eggshell') { G.position.y -= r * 0.05; const sh = add(new THREE.SphereGeometry(r * 0.66, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42)); sh.scale.y = 1.15; for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, t = add(new THREE.ConeGeometry(r * 0.13, r * 0.24, 4), M, 0); t.position.set(Math.cos(a) * r * 0.6, r * 0.1, Math.sin(a) * r * 0.6); t.rotation.x = Math.PI; } for (const [a, h] of [[0.6, 0.5], [2.4, 0.38], [4.2, 0.55]]) { const d = add(new THREE.SphereGeometry(r * 0.1, 8, 6), toon(band), 0); d.position.set(Math.cos(a) * r * 0.5, r * h, Math.sin(a) * r * 0.5); d.scale.set(1, 0.6, 1); } }
  if (kind === 'sunflower') { G.position.y -= r * 0.1; const st = add(new THREE.CylinderGeometry(r * 0.05, r * 0.06, r * 0.4, 6), toon(0x5ac24a), 0.01); st.position.y = r * 0.2; const head = new THREE.Group(); head.position.set(0, r * 0.5, r * 0.08); head.rotation.x = -0.5; G.add(head); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, pt = add(new THREE.SphereGeometry(r * 0.16, 8, 6), toon(col), 0.01); head.add(pt); pt.scale.set(0.5, 1, 0.22); pt.position.set(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, 0); pt.rotation.z = a - Math.PI / 2; } const c = add(new THREE.SphereGeometry(r * 0.2, 12, 8), toon(band), 0.012); head.add(c); c.scale.z = 0.4; c.position.z = r * 0.02; }
  if (kind === 'seedling') { G.position.y -= r * 0.12; const st = add(new THREE.CylinderGeometry(r * 0.05, r * 0.07, r * 0.55, 6), toon(col), 0.01); st.position.y = r * 0.28; for (const sd of [-1, 1]) { const lf = add(new THREE.SphereGeometry(r * 0.36, 12, 8), toon(col), 0.012); lf.scale.set(1, 0.28, 0.55); lf.position.set(sd * r * 0.32, r * 0.58, 0); lf.rotation.z = sd * 0.5; } add(new THREE.IcosahedronGeometry(r * 0.13, 1), toon(band, { rim: 0.6 }), 0.01).position.y = r * 0.62; }
  if (kind === 'top') { add(new THREE.CylinderGeometry(r * 0.5, r * 0.46, r * 0.85, 18)).position.y = r * 0.42; add(new THREE.CylinderGeometry(r * 0.9, r * 0.9, r * 0.05, 22)); add(new THREE.CylinderGeometry(r * 0.475, r * 0.47, r * 0.14, 18), toon(band), 0).position.y = r * 0.12; G.rotation.z = -0.12; }
  G.position.y += r * 0.72; G.rotation.x = -0.1;
  cr.skull.add(G);
  G.traverse((o) => { if (o.isMesh && !o.userData.hull) o.castShadow = true; });
  return G;
}

