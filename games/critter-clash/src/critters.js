// Procedural chibi critters: round toon bodies, anime decal eyes, a group-based rig
// driven by a springy pose so every motion squashes and overshoots.
import * as THREE from 'three';
import { toon, inked, canvasTex } from './toon.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TYPES } from './data.js';

const SEG = 36;
const sphere = (r = 1) => new THREE.SphereGeometry(r, SEG, Math.round(SEG * 0.75));
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 8, 18);

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
  return new THREE.LatheGeometry(pts, 20);
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

    const root = this.root = new THREE.Group();
    root.userData.critter = this;
    const scaleG = this.scaleG = new THREE.Group(); // global squash & stretch, pivot at feet
    root.add(scaleG);

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
    const eyeL = new THREE.Mesh(spherePatch(er, 0.36, -0.02, 0.28, 0.35, false), this.eyeMatL);
    const eyeR = new THREE.Mesh(spherePatch(er, -0.36, -0.02, 0.28, 0.35, true), this.eyeMatR);
    eyeL.renderOrder = eyeR.renderOrder = 2;
    skull.add(eyeL, eyeR);
    this.eyes = [eyeL, eyeR];
    const mouth = new THREE.Mesh(spherePatch(headR * 1.014, 0, def.extra === 'owl' || def.extra === 'penguin' ? -0.52 : -0.38, 0.27, 0.18), this.mouthMat);
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

    // gauzy insect wings on the back
    this.wings = [];
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
      } else if (def.extra === 'owl') {
        // stubby wings with a darker feather tip
        const w = inked(sphere(0.5), this.mats.body, OL * 0.8);
        w.scale.set(0.09, B.armLen * 1.7, 0.36);
        w.position.set(s * 0.02, -B.armLen * 0.7, -0.02);
        sh.add(w);
        const tip = new THREE.Mesh(sphere(0.5), this.mats.accent);
        tip.scale.set(0.08, B.armLen * 0.9, 0.3);
        tip.position.set(s * 0.025, -B.armLen * 1.12, -0.03);
        sh.add(tip);
      } else {
        const a = inked(capsule(0.075, B.armLen), this.mats.body, OL * 0.8);
        a.position.y = -B.armLen * 0.5;
        sh.add(a);
        const paw = new THREE.Mesh(sphere(0.085), this.mats.belly);
        paw.position.y = -B.armLen - 0.02;
        sh.add(paw);
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
      const l = inked(capsule(0.09, B.legLen * 0.6), this.mats.body, OL * 0.8);
      l.position.y = -B.legLen * 0.4;
      hp.add(l);
      const foot = inked(sphere(0.11), def.extra === 'penguin' ? this.mats.accent : this.mats.belly, OL * 0.8);
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
    if (from <= 1) {
    const ring = inked(new THREE.TorusGeometry(B.w * 0.5, 0.085, 10, 28), scarfMat, OL * 0.8);
    ring.rotation.x = Math.PI / 2 - 0.3;
    ring.scale.set(B.chubby * 1.05, 1, 1);
    ring.position.set(0, B.h * 0.84, B.w * 0.04);
    this.torso.add(ring);
    // two tails flapping off the back
    const tailG = new THREE.Group();
    tailG.position.set(B.w * 0.12, B.h * 0.76, -B.w * 0.34);
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
      this.skull.add(crown);
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
      const f = this.flames[i], base = i ? 0.27 : 0.42;
      f.scale.set(base * (1 + Math.sin(t * 23 + i) * 0.08), base * (1 + Math.sin(t * 17 + i * 2) * 0.16), base);
    }
    if (this.sprout) this.sprout.rotation.z = Math.sin(t * 2.2) * 0.15 + P.roll * 0.6;
    for (const w of this.wings) {
      const { s, k } = w.userData;
      w.rotation.y = s * (0.5 + Math.sin(t * (24 + P.tail * 14) + k * 1.4) * (0.35 + P.tail * 0.2));
      w.rotation.z = s * (k ? -0.25 : 0.15);
    }
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
