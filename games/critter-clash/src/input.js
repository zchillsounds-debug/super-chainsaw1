// Unified input: keyboard, a floating touch joystick + action buttons, and gamepads.
export const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || /[?&]mobile/.test(location.search);

const ICONS = {
  attack: '<svg viewBox="0 0 64 64"><path d="M18 30c0-6 4-10 9-10h12c6 0 9 4 9 9v9c0 9-7 15-15 15h-3c-7 0-12-5-12-12z" fill="#fff"/><path d="M22 22v-6a4 4 0 0 1 8 0v6M30 21v-8a4 4 0 0 1 8 0v8M38 22v-6a4 4 0 0 1 8 0v8" fill="#fff" stroke="#fff" stroke-width="2"/><path d="M24 34h18" stroke="#ff6a8a" stroke-width="3" stroke-linecap="round"/></svg>',
  special: '<svg viewBox="0 0 64 64"><path d="M34 6L14 36h14l-4 22 22-32H32z" fill="#fff"/></svg>',
  dodge: '<svg viewBox="0 0 64 64"><path d="M10 40c10-16 28-22 44-16" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M14 50c10-10 22-14 34-12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/><path d="M46 14l10 10-14 4z" fill="#fff"/></svg>',
  super: '<svg viewBox="0 0 64 64"><path d="M32 4l8 18 20 2-15 13 5 20-18-11-18 11 5-20L4 24l20-2z" fill="#fff"/></svg>',
};

export class Input {
  constructor(ui) {
    this.keys = new Set();
    this.move = { x: 0, y: 0 };
    this.held = { attack: false, special: false, dodge: false, super: false };
    this.pressed = { attack: false, special: false, dodge: false, super: false, pause: false, confirm: false };
    this._queued = {};
    this.enabled = true;
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      const b = this.keyMap(e.code);
      if (b) this._queued[b] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    this.joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.touchHeld = {};
    this.buildTouch(ui);
    this.padPrev = {};
  }

  keyMap(code) {
    return { KeyJ: 'attack', KeyK: 'special', KeyL: 'dodge', ShiftLeft: 'dodge', KeyI: 'super', Space: 'attack', KeyU: 'super',
      Escape: 'pause', KeyP: 'pause', Enter: 'confirm' }[code];
  }

  buildTouch(ui) {
    const root = this.touchRoot = document.createElement('div');
    root.className = 'touch' + (isTouch ? ' on' : '');
    root.innerHTML = `
      <div class="joyzone"><div class="joybase"><div class="joyknob"></div></div></div>
      <div class="btns">
        <button class="tb tb-attack" data-b="attack">${ICONS.attack}</button>
        <button class="tb tb-special" data-b="special">${ICONS.special}<i class="cd"></i></button>
        <button class="tb tb-dodge" data-b="dodge">${ICONS.dodge}<i class="cd"></i></button>
        <button class="tb tb-super" data-b="super">${ICONS.super}<i class="ring"></i></button>
      </div>`;
    ui.appendChild(root);
    const zone = root.querySelector('.joyzone'), base = root.querySelector('.joybase'), knob = root.querySelector('.joyknob');
    this.joyEls = { base, knob };
    const R = 56;
    zone.addEventListener('pointerdown', (e) => {
      if (this.joy.id !== null) return;
      this.joy.id = e.pointerId; this.joy.ox = e.clientX; this.joy.oy = e.clientY;
      zone.setPointerCapture(e.pointerId);
      base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px';
      base.classList.add('active');
      knob.style.transform = 'translate(-50%,-50%)';
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joy.id) return;
      let dx = e.clientX - this.joy.ox, dy = e.clientY - this.joy.oy;
      const l = Math.hypot(dx, dy);
      // drag the base along when the thumb goes far past the rim
      if (l > R * 1.6) {
        const k = (l - R * 1.6) / l;
        this.joy.ox += dx * k; this.joy.oy += dy * k;
        base.style.left = this.joy.ox + 'px'; base.style.top = this.joy.oy + 'px';
        dx = e.clientX - this.joy.ox; dy = e.clientY - this.joy.oy;
      }
      const cl = Math.min(R, Math.hypot(dx, dy));
      const a = Math.atan2(dy, dx);
      const kx = Math.cos(a) * cl, ky = Math.sin(a) * cl;
      knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
      const mag = cl < 8 ? 0 : (cl - 8) / (R - 8);
      this.joy.x = Math.cos(a) * mag; this.joy.y = -Math.sin(a) * mag;
    });
    const end = (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.joy.id = null; this.joy.x = this.joy.y = 0;
      base.classList.remove('active');
      knob.style.transform = 'translate(-50%,-50%)';
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    this.btnEls = {};
    for (const btn of root.querySelectorAll('.tb')) {
      const b = btn.dataset.b;
      this.btnEls[b] = btn;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btn.setPointerCapture(e.pointerId);
        this._queued[b] = true; this.touchHeld[b] = true;
        btn.classList.add('down');
        navigator.vibrate?.(12);
      });
      const up = () => { this.touchHeld[b] = false; btn.classList.remove('down'); };
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  showTouch(on) { this.touchRoot.style.display = on ? '' : 'none'; }

  // cooldown fractions 0..1 (1 = ready) for the button overlays
  setCooldowns(spec, dodge, superFrac, superReady) {
    if (!isTouch) return;
    const e = this.btnEls;
    e.special.style.setProperty('--cd', (1 - spec) * 360 + 'deg');
    e.dodge.style.setProperty('--cd', (1 - dodge) * 360 + 'deg');
    e.special.classList.toggle('cooling', spec < 1);
    e.dodge.classList.toggle('cooling', dodge < 1);
    e.super.style.setProperty('--fill', superFrac * 360 + 'deg');
    e.super.classList.toggle('ready', superReady);
  }

  poll() {
    const k = this.keys;
    let x = 0, y = 0;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    const held = { attack: k.has('KeyJ') || k.has('Space'), special: k.has('KeyK'), dodge: k.has('KeyL') || k.has('ShiftLeft'), super: k.has('KeyI') || k.has('KeyU') };
    for (const b in this.touchHeld) held[b] = held[b] || this.touchHeld[b];
    if (this.joy.id !== null) { x += this.joy.x; y += this.joy.y; }

    // gamepad
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.hypot(ax, ay) > 0.18) { x += ax; y -= ay; }
      const bmap = { attack: [0, 2], special: [1, 3], dodge: [4, 5, 6], super: [7, 3], pause: [9], confirm: [0] };
      for (const name in bmap) {
        const down = bmap[name].some((i) => p.buttons[i]?.pressed);
        if (name in held) held[name] = held[name] || down;
        if (down && !this.padPrev[name]) this._queued[name] = true;
        this.padPrev[name] = down;
      }
      if (p.buttons[12]?.pressed) y += 1;
      if (p.buttons[13]?.pressed) y -= 1;
      if (p.buttons[14]?.pressed) x -= 1;
      if (p.buttons[15]?.pressed) x += 1;
      break;
    }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    this.move.x = x; this.move.y = y;
    this.held = held;
    for (const b in this.pressed) this.pressed[b] = !!this._queued[b];
    this._queued = {};
  }
}
