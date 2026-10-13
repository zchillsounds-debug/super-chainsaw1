// Photo mode (from the pause menu): orbit the frozen battle, pick a frame and filter, snap and save.
import * as THREE from 'three';
import { sfx } from './audio.js';

const FILTERS = [
  { id: 'none', name: 'Normal', css: 'none' },
  { id: 'vivid', name: 'Vivid', css: 'saturate(1.5) contrast(1.08)' },
  { id: 'mono', name: 'Mono', css: 'grayscale(1) contrast(1.2)' },
  { id: 'retro', name: 'Retro', css: 'sepia(.55) saturate(1.4) hue-rotate(-12deg) contrast(1.05)' },
];
const FRAMES = [
  { id: 'none', name: 'None' },
  { id: 'polaroid', name: 'Snapshot' },
  { id: 'comic', name: 'Comic' },
  { id: 'sparkle', name: 'Sparkle' },
];

export class PhotoMode {
  constructor(game, onClose) {
    this.game = game;
    this.onClose = onClose;
    const cam = game.camera, b = game.battle;
    this.saved = { pos: cam.position.clone(), quat: cam.quaternion.clone(), fov: cam.fov };
    this.focus = 0; // 0 both, 1 player, 2 rival
    this.target = new THREE.Vector3();
    this.aimTarget();
    const off = cam.position.clone().sub(this.target);
    this.dist = THREE.MathUtils.clamp(off.length(), 2, 16);
    this.yaw = Math.atan2(off.x, off.z);
    this.pitch = Math.asin(THREE.MathUtils.clamp(off.y / off.length(), -0.2, 1.3));
    this.fov = 40;
    this.filter = 0; this.frame = 0;
    game.hud.show(false);
    game.input.showTouch(false);
    game.modalClose = () => this.close();
    this.names = b.fighters.map((f) => f.def.name);
    this.build();
  }

  aimTarget() {
    const [p, c] = this.game.battle.fighters;
    const f = this.focus === 1 ? p : this.focus === 2 ? c : null;
    if (f) this.target.set(f.x, f.y + 0.7, f.z);
    else this.target.set((p.x + c.x) / 2, 0.8 + (p.y + c.y) / 4, (p.z + c.z) / 2);
  }

  build() {
    const el = this.el = document.createElement('div');
    el.className = 'photo';
    const chips = (list, cls) => list.map((x, i) => `<button class="chip ${cls}${i === 0 ? ' on' : ''}" data-i="${i}">${x.name}</button>`).join('');
    el.innerHTML = `
      <div class="ph-frame"></div>
      <div class="ph-top"><span class="ph-hint">Drag to orbit · pinch or scroll to zoom</span><button class="icon-btn ph-x" aria-label="Close photo mode">✕</button></div>
      <div class="ph-side">${chips([{ name: 'Both' }, { name: this.names[0] }, { name: this.names[1] }], 'ph-focus')}</div>
      <div class="ph-bottom">
        <div class="ph-row"><small>Frame</small>${chips(FRAMES, 'ph-fr')}</div>
        <div class="ph-row"><small>Filter</small>${chips(FILTERS, 'ph-fi')}</div>
      </div>
      <button class="ph-snap" aria-label="Take photo"><i></i></button>
      <div class="ph-flash"></div>`;
    const pick = (sel, fn) => el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      el.querySelectorAll(sel).forEach((x) => x.classList.toggle('on', x === b));
      fn(+b.dataset.i); sfx.ui('move');
    }));
    pick('.ph-focus', (i) => {
      this.focus = i; this.aimTarget();
      // swing round to the critter's face, nice and close
      if (i) { const f = this.game.battle.fighters[i - 1]; this.yaw = f.face + 0.35; this.pitch = 0.18; this.dist = Math.min(this.dist, 3.6); }
    });
    pick('.ph-fr', (i) => { this.frame = i; el.querySelector('.ph-frame').className = 'ph-frame f-' + FRAMES[i].id; });
    pick('.ph-fi', (i) => { this.filter = i; this.game.renderer.domElement.style.filter = FILTERS[i].css; });
    el.querySelector('.ph-x').addEventListener('click', () => this.close());
    el.querySelector('.ph-snap').addEventListener('click', () => this.snap());
    // orbit / pinch / wheel
    const pts = new Map();
    let pinch = 0;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    });
    el.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      if (pts.size === 1) {
        this.yaw -= (e.clientX - p.x) * 0.008;
        this.pitch = THREE.MathUtils.clamp(this.pitch + (e.clientY - p.y) * 0.006, -0.05, 1.3);
      }
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) this.dist = THREE.MathUtils.clamp(this.dist * pinch / d, 1.6, 16);
        pinch = d;
      }
    });
    const up = (e) => { pts.delete(e.pointerId); pinch = 0; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => { e.preventDefault(); this.dist = THREE.MathUtils.clamp(this.dist * (1 + Math.sign(e.deltaY) * 0.1), 1.6, 16); }, { passive: false });
    this.game.ui.appendChild(el);
  }

  update() {
    const cam = this.game.camera;
    const cp = Math.cos(this.pitch);
    cam.position.set(this.target.x + Math.sin(this.yaw) * cp * this.dist, Math.max(0.25, this.target.y + Math.sin(this.pitch) * this.dist), this.target.z + Math.cos(this.yaw) * cp * this.dist);
    cam.lookAt(this.target);
    cam.fov = this.fov * Math.max(1, 1.6 / cam.aspect);
    cam.updateProjectionMatrix();
  }

  snap() {
    const g = this.game;
    this.update();
    g.composer.render(0);
    const src = g.renderer.domElement;
    // the drawing buffer is only valid right after a render, so copy it now
    const W = src.width, H = src.height;
    const fr = FRAMES[this.frame].id;
    const pad = fr === 'none' ? 0 : Math.round(Math.min(W, H) * 0.045), foot = fr === 'polaroid' ? pad * 3.2 : pad;
    const out = document.createElement('canvas');
    out.width = W + pad * 2; out.height = H + pad + foot;
    const x = out.getContext('2d');
    this.drawFrameBack(x, out.width, out.height, pad, fr);
    x.filter = FILTERS[this.filter].css;
    x.drawImage(src, pad, pad);
    x.filter = 'none';
    this.drawFrameFront(x, out.width, out.height, pad, foot, W, H, fr);
    const flash = this.el.querySelector('.ph-flash');
    flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
    sfx.shutter();
    this.preview(out.toDataURL('image/png'), out);
  }

  drawFrameBack(x, w, h, pad, fr) {
    if (fr === 'polaroid') { x.fillStyle = '#fffaf0'; x.fillRect(0, 0, w, h); }
    else if (fr === 'comic') { x.fillStyle = '#ffd23f'; x.fillRect(0, 0, w, h); }
    else if (fr === 'sparkle') {
      const gr = x.createLinearGradient(0, 0, w, h);
      ['#ff7eb6', '#ffd23f', '#7ad36b', '#3dc8ff', '#a77dff'].forEach((c, i) => gr.addColorStop(i / 4, c));
      x.fillStyle = gr; x.fillRect(0, 0, w, h);
    }
  }

  drawFrameFront(x, w, h, pad, foot, W, H, fr) {
    const s = Math.min(W, H) / 400;
    const font = (px) => `${Math.round(px * s)}px 'Lilita One', system-ui, sans-serif`;
    const label = `${this.names[0]} vs ${this.names[1]}`;
    if (fr === 'polaroid') {
      x.fillStyle = '#2a1630'; x.font = font(26); x.textBaseline = 'middle';
      x.fillText(label, pad * 1.2, h - foot / 2);
      x.textAlign = 'right'; x.fillStyle = '#ff5a8a'; x.fillText('CRITTER CLASH!', w - pad * 1.2, h - foot / 2); x.textAlign = 'left';
    } else if (fr === 'comic') {
      x.lineWidth = 6 * s; x.strokeStyle = '#2a1630'; x.strokeRect(pad, pad, W, H);
      // halftone corners
      x.fillStyle = 'rgba(42,22,48,.35)';
      for (let i = 0; i < 9; i++) for (let j = 0; j < 9 - i; j++) {
        const r = (9 - i - j) * 0.55 * s;
        x.beginPath(); x.arc(pad + 8 * s + i * 11 * s, pad + 8 * s + j * 11 * s, r, 0, 7); x.fill();
        x.beginPath(); x.arc(w - pad - 8 * s - i * 11 * s, h - pad - 8 * s - j * 11 * s, r, 0, 7); x.fill();
      }
      // starburst caption
      const cx = w - pad - 80 * s, cy = pad + 52 * s;
      x.beginPath();
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = (i % 2 ? 40 : 58) * s; x.lineTo(cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r); }
      x.closePath(); x.fillStyle = '#ff5a3d'; x.fill(); x.lineWidth = 4 * s; x.stroke();
      x.font = font(30); x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineWidth = 6 * s; x.strokeText('BONK!', cx, cy); x.fillStyle = '#fff'; x.fillText('BONK!', cx, cy);
      x.textAlign = 'left';
    } else if (fr === 'sparkle') {
      const star = (cx, cy, r) => { x.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, rr = i % 2 ? r * 0.3 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); };
      x.fillStyle = '#fff';
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 26; i++) {
        const edge = rnd() * 4 | 0, t = rnd();
        const px = edge === 0 ? t * w : edge === 1 ? w - pad / 2 : edge === 2 ? t * w : pad / 2;
        const py = edge === 0 ? pad / 2 : edge === 1 ? t * h : edge === 2 ? h - pad / 2 : t * h;
        star(px, py, (6 + rnd() * 10) * s);
      }
      x.font = font(22); x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineWidth = 5 * s; x.strokeStyle = '#2a1630';
      x.strokeText('✦ ' + label + ' ✦', w / 2, h - pad - 22 * s); x.fillText('✦ ' + label + ' ✦', w / 2, h - pad - 22 * s);
      x.textAlign = 'left';
    }
  }

  preview(url, canvas) {
    const d = document.createElement('div');
    d.className = 'modal-wrap ph-prev';
    d.innerHTML = `<div class="modal"><h2>Nice shot!</h2><img alt="Your photo"><div class="row"></div></div>`;
    d.querySelector('img').src = url;
    const row = d.querySelector('.row');
    const name = `critter-clash-${Date.now()}.png`;
    const mk = (label, cls, fn) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.addEventListener('click', fn); row.appendChild(b); };
    canvas.toBlob((blob) => {
      const file = blob && new File([blob], name, { type: 'image/png' });
      if (file && navigator.canShare?.({ files: [file] })) mk('Share', 'primary', () => navigator.share({ files: [file], title: 'Critter Clash' }).catch(() => {}));
      mk('Save', file && navigator.canShare?.({ files: [file] }) ? '' : 'primary', () => {
        const a = document.createElement('a'); a.href = url; a.download = name; a.click();
        sfx.ui('ok');
      });
      mk('Back', 'ghost-dark', () => d.remove());
    }, 'image/png');
    d.addEventListener('click', (e) => { if (e.target === d) d.remove(); });
    this.game.ui.appendChild(d);
    this.prev = d;
  }

  close() {
    if (this.prev?.isConnected) { this.prev.remove(); return; }
    const g = this.game, cam = g.camera;
    cam.position.copy(this.saved.pos); cam.quaternion.copy(this.saved.quat); cam.fov = this.saved.fov; cam.updateProjectionMatrix();
    g.renderer.domElement.style.filter = '';
    this.el.remove();
    g.modalClose = null;
    sfx.ui('back');
    this.onClose?.();
  }
}
