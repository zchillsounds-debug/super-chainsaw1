import * as THREE from 'three';
import { mulberry32, fbm } from './noise.js';

// Procedural canvas textures: albedo + derived normal maps.
function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

function heightToNormal(src, strength = 2) {
  const w = src.width, h = src.height;
  const sd = src.getContext('2d').getImageData(0, 0, w, h).data;
  const [c, ctx] = canvas(w, h);
  const out = ctx.createImageData(w, h);
  const H = (x, y) => sd[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x - 1, y) - H(x + 1, y)) * strength;
    const dy = (H(x, y - 1) - H(x, y + 1)) * strength;
    const l = Math.hypot(dx, dy, 1);
    const i = (y * w + x) * 4;
    out.data[i] = (dx / l * 0.5 + 0.5) * 255; out.data[i + 1] = (dy / l * 0.5 + 0.5) * 255;
    out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

function tex(c, srgb = true, rep = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
  t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function grain(ctx, w, h, rnd, amt, alpha = 0.08) {
  for (let i = 0; i < amt; i++) {
    const v = rnd() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * rnd()})`;
    ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
}

// Sun-dried mud brick with plaster patches.
export function mudBrick(base = [176, 140, 98]) {
  const S = 512, rnd = mulberry32(7);
  const [c, x] = canvas(S); const [hc, hx] = canvas(S);
  x.fillStyle = `rgb(${base})`; x.fillRect(0, 0, S, S);
  hx.fillStyle = '#222'; hx.fillRect(0, 0, S, S);
  const bw = 64, bh = 28;
  for (let row = 0; row < S / bh + 1; row++) {
    const off = (row % 2) * bw / 2;
    for (let col = -1; col < S / bw + 1; col++) {
      const px = col * bw + off, py = row * bh;
      const k = 0.85 + rnd() * 0.25;
      x.fillStyle = `rgb(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k * 0.97 | 0})`;
      x.fillRect(px + 2, py + 2, bw - 4, bh - 4);
      const hv = 150 + rnd() * 60 | 0;
      hx.fillStyle = `rgb(${hv},${hv},${hv})`; hx.fillRect(px + 3, py + 3, bw - 6, bh - 6);
    }
  }
  // plaster patches (smooth, lighter) using noise
  const img = x.getImageData(0, 0, S, S), himg = hx.getImageData(0, 0, S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const n = fbm(i / 90, j / 90, 4), d = fbm(i / 12 + 50, j / 12, 3);
    const k = (j * S + i) * 4;
    if (n > 0.08) {
      const t = Math.min(1, (n - 0.08) * 6);
      img.data[k] += (205 - img.data[k]) * t * 0.8; img.data[k + 1] += (178 - img.data[k + 1]) * t * 0.8; img.data[k + 2] += (138 - img.data[k + 2]) * t * 0.8;
      himg.data[k] = himg.data[k + 1] = himg.data[k + 2] = himg.data[k] * (1 - t) + 200 * t;
    }
    const g = d * 30;
    img.data[k] += g; img.data[k + 1] += g; img.data[k + 2] += g;
    himg.data[k] += d * 40; himg.data[k + 1] = himg.data[k + 2] = himg.data[k];
  }
  x.putImageData(img, 0, 0); hx.putImageData(himg, 0, 0);
  grain(x, S, S, rnd, 9000);
  return { map: tex(c), normalMap: tex(heightToNormal(hc, 3), false), roughness: 0.95 };
}

// Round 31: a face of cut earth in a mine: layered strata, the scars of the picks, pebbles in the clay.
export function cutEarth() {
  const S = 256, rnd = mulberry32(31);
  const [c, x] = canvas(S); const [hc, hx] = canvas(S);
  const img = x.createImageData(S, S), himg = hx.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const n = fbm(i / 40, j / 40, 4), band = Math.sin(j / S * Math.PI * 2 * 5 + fbm(i / 60, j / 30, 2) * 3) * 0.5 + 0.5, fine = fbm(i / 7 + 9, j / 7, 2);
    const k = (j * S + i) * 4, l = 0.78 + n * 0.35 + band * 0.12 + fine * 0.1;
    img.data[k] = 150 * l; img.data[k + 1] = 116 * l; img.data[k + 2] = 82 * l; img.data[k + 3] = 255;
    const h = 120 + n * 70 + fine * 40 + band * 20; himg.data[k] = himg.data[k + 1] = himg.data[k + 2] = h; himg.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0); hx.putImageData(himg, 0, 0);
  // pick scars: short curved grooves struck downward at a slant
  for (let q = 0; q < 90; q++) {
    const px = rnd() * S, py = rnd() * S, len = 10 + rnd() * 18, a = 1.1 + (rnd() - 0.5) * 0.6, bend = (rnd() - 0.5) * 6;
    for (const [ctx, col, w] of [[x, 'rgba(50,34,20,0.22)', 2.0], [hx, 'rgba(30,30,30,0.45)', 2.4]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + Math.cos(a) * len / 2 + bend, py + Math.sin(a) * len / 2, px + Math.cos(a) * len, py + Math.sin(a) * len); ctx.stroke();
    }
    x.strokeStyle = 'rgba(210,180,140,0.18)'; x.lineWidth = 1; x.beginPath(); x.moveTo(px + 1.5, py - 1); x.lineTo(px + 1.5 + Math.cos(a) * len, py - 1 + Math.sin(a) * len); x.stroke();
  }
  // pebbles
  for (let q = 0; q < 70; q++) {
    const px = rnd() * S, py = rnd() * S, r = 1.5 + rnd() * 3.5, v = 120 + rnd() * 60 | 0;
    x.fillStyle = `rgb(${v},${v * 0.92 | 0},${v * 0.8 | 0})`; x.beginPath(); x.ellipse(px, py, r, r * 0.75, rnd() * 3, 0, 7); x.fill();
    hx.fillStyle = 'rgba(240,240,240,0.9)'; hx.beginPath(); hx.ellipse(px, py, r, r * 0.75, 0, 0, 7); hx.fill();
  }
  grain(x, S, S, rnd, 5000);
  return { map: tex(c), normalMap: tex(heightToNormal(hc, 4), false), roughness: 1 };
}

// Glazed girih tile band: eight-pointed stars, turquoise/cobalt/white.
export function girihTile() {
  const S = 512, [c, x] = canvas(S), [hc, hx] = canvas(S);
  x.fillStyle = '#123e6b'; x.fillRect(0, 0, S, S);
  hx.fillStyle = '#888'; hx.fillRect(0, 0, S, S);
  const cell = S / 4;
  const star = (ctx, cx, cy, r, ri) => {
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2 + Math.PI / 8, rr = i % 2 ? ri : r;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
  };
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
    const cx = i * cell, cy = j * cell;
    x.fillStyle = '#e9e2cf'; star(x, cx, cy, cell * 0.5, cell * 0.36); x.fill();
    x.fillStyle = '#1aa3a8'; star(x, cx, cy, cell * 0.42, cell * 0.3); x.fill();
    x.fillStyle = '#e8b64a'; star(x, cx, cy, cell * 0.16, cell * 0.1); x.fill();
    hx.fillStyle = '#ddd'; star(hx, cx, cy, cell * 0.5, cell * 0.36); hx.fill();
    hx.strokeStyle = '#333'; hx.lineWidth = 4; star(hx, cx, cy, cell * 0.5, cell * 0.36); hx.stroke();
    // cross shapes between stars
    const mx = cx + cell / 2, my = cy + cell / 2;
    x.fillStyle = '#0f2f55'; x.save(); x.translate(mx, my); x.rotate(Math.PI / 4);
    x.fillRect(-cell * 0.12, -cell * 0.12, cell * 0.24, cell * 0.24); x.restore();
  }
  x.strokeStyle = 'rgba(240,230,210,0.9)'; x.lineWidth = 3;
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { star(x, i * cell, j * cell, cell * 0.5, cell * 0.36); x.stroke(); }
  grain(x, S, S, mulberry32(3), 4000, 0.06);
  return { map: tex(c), normalMap: tex(heightToNormal(hc, 1.5), false), roughness: 0.25 };
}

// Kufic calligraphy-like frieze (stylised geometric strokes, not real text).
export function kuficBand() {
  const W = 1024, H = 128, [c, x] = canvas(W, H);
  x.fillStyle = '#0d2a4a'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#e6c46a';
  const rnd = mulberry32(11);
  let px = 8;
  while (px < W - 20) {
    const w = 8 + (rnd() * 3 | 0) * 6, tall = rnd() > 0.45;
    x.fillRect(px, 30, w, 70);
    if (tall) x.fillRect(px, 14, 6, 90);
    if (rnd() > 0.6) x.fillRect(px, 92, w + 14, 8);
    if (rnd() > 0.7) { x.fillRect(px + w + 2, 50, 10, 6); }
    px += w + 8 + rnd() * 10;
  }
  x.strokeStyle = '#e6c46a'; x.lineWidth = 4; x.strokeRect(3, 3, W - 6, H - 6);
  const t = tex(c); t.repeat.set(2.2, 1); return t;
}

export function woodTex() {
  const S = 256, [c, x] = canvas(S), rnd = mulberry32(5);
  const img = x.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const n = fbm(i / 60, j / 6, 4) * 1.5 + Math.sin(i / 7 + fbm(i / 30, j / 30) * 6) * 0.3;
    const v = 0.55 + n * 0.25, k = (j * S + i) * 4;
    img.data[k] = 110 * v + 20; img.data[k + 1] = 72 * v + 12; img.data[k + 2] = 44 * v + 6; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0); grain(x, S, S, rnd, 2000);
  return tex(c);
}

// Woven fabric with a stripe / border pattern.
export function fabricTex(a = '#7a1e1e', b = '#d9b56a', stripes = true) {
  const S = 256, [c, x] = canvas(S);
  x.fillStyle = a; x.fillRect(0, 0, S, S);
  if (stripes === 'hem') { // embroidered hem band near one edge + subtle diamond weave
    x.fillStyle = b; x.fillRect(0, S - 30, S, 10); x.fillRect(0, S - 14, S, 3);
    for (let i = 0; i < S; i += 16) { x.beginPath(); x.moveTo(i, S - 20); x.lineTo(i + 8, S - 26); x.lineTo(i + 16, S - 20); x.lineTo(i + 8, S - 14); x.fill(); }
    x.fillStyle = 'rgba(255,255,255,0.04)'; for (let j = 0; j < S - 40; j += 12) for (let i = (j / 12 % 2) * 6; i < S; i += 12) x.fillRect(i, j, 3, 3);
  } else if (stripes) {
    x.fillStyle = b; for (let i = 0; i < S; i += 64) { x.fillRect(0, i + 4, S, 6); x.fillRect(0, i + 14, S, 2); }
  }
  for (let i = 0; i < S; i += 2) { x.fillStyle = `rgba(0,0,0,${0.05 + (i % 4 ? 0.04 : 0)})`; x.fillRect(i, 0, 1, S); x.fillRect(0, i, S, 1); }
  return tex(c);
}

// Soft round sprite for particles.
export function particleSprite() {
  const S = 64, [c, x] = canvas(S);
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

// Radial glow decal (ground glow under lamps, magic circles).
export function glowDecal() {
  const S = 128, [c, x] = canvas(S);
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

// Magic circle with eight-fold geometry (for Astrolabe Ward + boss sigils).
export function sigilTex() {
  const S = 512, [c, x] = canvas(S), C = S / 2;
  x.strokeStyle = '#fff'; x.lineWidth = 6;
  x.beginPath(); x.arc(C, C, C - 8, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 3; x.beginPath(); x.arc(C, C, C - 34, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(C, C, C * 0.42, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 2; x.beginPath(); x.arc(C, C, C * 0.7, 0, Math.PI * 2); x.stroke();
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2;
    x.save(); x.translate(C + Math.cos(a) * (C - 21), C + Math.sin(a) * (C - 21)); x.rotate(a);
    x.fillStyle = '#fff'; x.fillRect(-2, -6, 4, i % 4 ? 6 : 12); x.restore();
  }
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    x.beginPath(); x.arc(C + Math.cos(a) * C * 0.6, C + Math.sin(a) * C * 0.6, 14, 0, Math.PI * 2); x.stroke();
  }
  return new THREE.CanvasTexture(c);
}

// Irregular splat (blood / scorch) alpha texture.
export function splatTex(seed = 1, scorch = false) {
  const S = 256, [c, x] = canvas(S), rnd = mulberry32(seed);
  const C = S / 2;
  if (scorch) {
    const g = x.createRadialGradient(C, C, 0, C, C, C);
    g.addColorStop(0, 'rgba(10,8,6,0.95)'); g.addColorStop(0.5, 'rgba(20,14,10,0.75)'); g.addColorStop(1, 'rgba(30,20,12,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) { const a = rnd() * 6.28, r = C * (0.4 + rnd() * 0.55); x.fillStyle = `rgba(15,10,8,${0.3 * rnd()})`; x.beginPath(); x.arc(C + Math.cos(a) * r, C + Math.sin(a) * r, 4 + rnd() * 14, 0, 7); x.fill(); }
  } else {
    x.fillStyle = 'rgba(255,255,255,1)';
    x.beginPath(); x.arc(C, C, C * 0.35, 0, 7); x.fill();
    for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, r = C * (0.2 + rnd() * 0.65); x.globalAlpha = 0.6 + rnd() * 0.4; x.beginPath(); x.arc(C + Math.cos(a) * r, C + Math.sin(a) * r, 3 + rnd() * C * 0.18, 0, 7); x.fill(); }
    for (let i = 0; i < 10; i++) { const a = rnd() * 6.28; x.lineWidth = 2 + rnd() * 4; x.strokeStyle = '#fff'; x.beginPath(); x.moveTo(C, C); x.lineTo(C + Math.cos(a) * C * 0.9, C + Math.sin(a) * C * 0.9); x.stroke(); }
  }
  return new THREE.CanvasTexture(c);
}
