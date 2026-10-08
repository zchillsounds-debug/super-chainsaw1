import * as THREE from 'three';
import { QUALITY } from './graphics.js';
import { t } from './i18n.js';

// Cinematic director: plays a list of shots with eased camera moves, letterbox bars, a subtitle bar
// with a speaker portrait, act title cards, slow motion, depth of field and a warm film grade.
// Round 34: nothing is skipped. A tap (or Space/Enter) moves on only once the current line has been shown in full
// and held a moment; a caption once it has been up long enough to read. Choices wait for an answer.
const sm = (t) => t * t * (3 - 2 * t);
const EASE = { io: sm, lin: (t) => t, out: (t) => 1 - Math.pow(1 - t, 3), in: (t) => t * t * t, io2: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) };
const _q = new THREE.Quaternion();
const v3 = (a) => (a.isVector3 ? a.clone() : Array.isArray(a) ? new THREE.Vector3(...a) : typeof a === 'function' ? a() : a);

// Round 21: faces act the lines. A line may name its expression (line.expr); otherwise it is read from the words.
// The speaker wears it; everyone else in the scene reacts (grief softens to sadness, anger to a stern look).
const MOODS = [
  ['grief', /\b(died|dead|dies|death|grave|bur(y|ied)|mourn|last words|lost|gone|weep|tears|sorry)\b/i],
  ['fear', /\b(afraid|fear|mercy|spare me|please)\b/i],
  ['anger', /\b(burn(s|ed|ing)?|fire|thie(f|ves)|traitor|betray(ed)?|fouled|poison(ed)?|kill(ed)?|murder|enough|how dare|you will pay)\b|!/i],
  ['warm', /\b(thank(s| you)?|well done|friend|peace|welcome|sweet|glad|home|bread|keep the account|it is done)\b/i],
  ['surprise', /\b(what|who|how)\b[^.]*\?$/i],
  ['resolve', /\b(I will|we will|I'll|we'll|promise|swear|must|find him|stop (him|them)|follow|I am coming)\b/i],
];
const REACT = { grief: 'sad', anger: 'stern', fear: 'wary', warm: 'warm', surprise: 'surprise', resolve: 'resolve' };
export function moodOf(text = '') { for (const [m, re] of MOODS) if (re.test(text)) return m; return 'neutral'; }

export class Director {
  constructor({ game, camera, ui, audio, grade, bokeh, renderer, scene }) {
    Object.assign(this, { game, camera, ui, audio, grade, bokeh, renderer, scene });
    this.def = null; this.i = 0; this.t = 0; this.timeScale = 1; this.portraits = new Map();
    const el = this.el = document.createElement('div'); el.id = 'cine'; el.className = 'hidden';
    el.innerHTML = `<div class="lb top"></div><div class="lb bot"></div>
      <div class="sub"><div class="por"><canvas width="96" height="96"></canvas></div><div class="stx"><div class="sname"></div><div class="sline"></div></div></div>
      <div class="card"><div class="ar"></div><div class="rule"><i></i><b></b><i></i></div><div class="en"></div><div class="csub"></div></div>
      <div class="caption"></div>
      <div class="cchoice"></div>
      <div class="tapnext"><span>Tap to continue</span><i>▸</i></div>
      <div class="cfade"></div>`;
    document.getElementById('ui').appendChild(el);
    this.$ = (s) => el.querySelector(s);
    // tap-to-advance (Round 34: no hold-to-skip)
    this.downAt = 0;
    const down = (e) => { if (!this.def) return; e.preventDefault?.(); this.downAt = performance.now(); this.audio.init(); };
    const up = () => { if (!this.def || !this.downAt) return; const tap = performance.now() - this.downAt < 600; this.downAt = 0; if (tap) this.advance(); };
    el.addEventListener('pointerdown', down); addEventListener('pointerup', up); addEventListener('pointercancel', () => { this.downAt = 0; });
    addEventListener('keydown', (e) => { if (this.def && (e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); this.advance(); } });
    this.p0 = new THREE.Vector3(); this.t0 = new THREE.Vector3(); this.p1 = new THREE.Vector3(); this.t1 = new THREE.Vector3(); this.look = new THREE.Vector3();
  }
  get active() { return !!this.def; }

  play(def) {
    return new Promise((resolve) => {
      if (this.def) this.end(true);
      this.def = def; this.resolve = resolve; this.i = -1; this.t = 0; this.timeScale = 1;
      // Round 24: remember the play camera, so the first shot glides out of it (or dips to black if it is far)
      this.inPos = this.camera.position.clone(); this.inQuat = this.camera.quaternion.clone(); this.inFov = this.camera.fov; this.inK = def.noBlend ? 1 : 0; this.inChecked = false; this.outBlend = null;
      this.el.classList.remove('hidden'); document.body.classList.add('incine');
      // Round 35: straight on from a scene that ended on black: the black stays, as the director's own fade, which the
      // first shot lifts (the screen fade it leaves up was only lifted when no scene followed, so the next scene played black)
      if (this.endedBlack && !this.ui.holdBlack) { this.fadeCur = 1; this.$('.cfade').style.opacity = 1; this.fade(0, 0.8); this.ui.fade(0, 0); }
      this.ui.hud?.classList.add('cinehide');
      this.game.setLootBeams?.(false);
      this.game.cinematic = true; this.game.joy = null; this.game.lmb = false; this.game.player.moveTo = null; this.game.player.target = null;
      requestAnimationFrame(() => this.el.classList.add('on'));
      def.start?.(this);
      this.next();
    });
  }
  next() {
    const d = this.def; if (!d) return;
    this.i++;
    if (this.i >= d.shots.length) { this.end(false); return; }
    const s = this.shot = d.shots[this.i]; this.t = 0; this.lineDone = false; this.doneAt = null;
    if (s.when && !s.when()) { this.next(); return; } // Round 25: shots that only play after a given choice
    s.enter?.(this, s);
    const cam = s.cam || {};
    this.p0.copy(v3(cam.p0 || this.camera.position)); this.t0.copy(v3(cam.t0 || this.look));
    this.p1.copy(v3(cam.p1 || cam.p0 || this.p0)); this.t1.copy(v3(cam.t1 || cam.t0 || this.t0));
    this.fov0 = cam.fov0 ?? cam.fov ?? 36; this.fov1 = cam.fov1 ?? cam.fov ?? this.fov0;
    this.timeScale = s.slow ?? 1;
    this.setLine(s.line); this.setCard(s.card); this.setCaption(s.caption); this.setChoice(s);
    // Round 34: the bars close in at the turns of the story (a shot marked tight), and open again after
    this.el.classList.toggle('tight', !!(s.tight ?? d.tight));
    if (s.beat) this.audio.heart?.(s.beat);
    if (s.stinger) this.audio.stinger?.(s.stinger);
    if (s.fadeIn != null) { this.fadeCur = 1; this.fade(0, s.fadeIn); }
  }
  // Round 25: a choice shot shows its options as buttons and waits for one (keys 1 and 2 work too)
  setChoice(s) {
    const box = this.$('.cchoice'); box.innerHTML = ''; box.classList.toggle('show', !!s?.choice);
    if (!s?.choice) return;
    s.chosen = null;
    const pick = (i) => { if (s.chosen != null || this.shot !== s) return; s.chosen = i; removeEventListener('keydown', key); box.classList.remove('show'); s.choice.options[i].fx?.(); this.audio.click?.(); this.next(); };
    const key = (e) => { const k = +e.key; if (k >= 1 && k <= s.choice.options.length) pick(k - 1); };
    addEventListener('keydown', key);
    if (s.choice.prompt) { const h = document.createElement('div'); h.className = 'cprompt'; h.textContent = t(s.choice.prompt); box.appendChild(h); }
    s.choice.options.forEach((o, i) => {
      const b = document.createElement('button'); b.className = 'copt'; b.innerHTML = `<span>${i + 1}</span>${t(o.label)}`;
      b.addEventListener('pointerdown', (e) => e.stopPropagation()); b.addEventListener('pointerup', (e) => e.stopPropagation());
      b.addEventListener('click', (e) => { e.stopPropagation(); pick(i); }); box.appendChild(b);
    });
  }
  // Round 34: can this shot be moved on yet? A line once it is fully shown and has held 0.6 s; a caption once it has
  // been up long enough to read; a shot with neither once it has run its length
  ready() {
    const s = this.shot; if (!s || s.choice) return false;
    if (s.line) return this.lineDone && this.doneAt != null && this.t - this.doneAt >= 0.6;
    if (s.caption) return this.t >= Math.min(s.dur, 1.4 + s.caption.length / 28);
    return this.t >= s.dur;
  }
  advance() {
    if (!this.ready()) return; // nothing is skipped: not even a typed line is hurried
    if (this.shot?.line || this.shot?.caption || this.shot?.tapNext) this.next();
  }
  // headless tests only (there is no control for it in the game): run the rest of the scene out, choices taking option 1
  skip() {
    const d = this.def; if (!d) return;
    if (this.shot?.choice && this.shot.chosen == null) return;
    for (let i = this.i; i < d.shots.length; i++) { const s = d.shots[i]; if (s.choice && s.chosen == null) { s.chosen = 0; s.choice.options[0].fx?.(); } s.skip?.(this); }
    this.end(true);
  }
  end(skipped) {
    const d = this.def; if (!d) return;
    for (const r of this.faces()) r.userData.expr = null;
    this.def = null; this.shot = null; this.timeScale = 1; this.$('.cchoice').classList.remove('show');
    this.endedBlack = this.fadeCur > 0.9;
    // Round 24: hand the camera back gently: the play camera eases out of the last shot instead of cutting to it
    this.outBlend = d.noBlend || this.endedBlack ? null : { pos: this.camera.position.clone(), quat: this.camera.quaternion.clone(), fov: this.camera.fov, t: 0, dur: 0.9 };
    this.el.classList.remove('on'); setTimeout(() => { if (!this.def) this.el.classList.add('hidden'); }, 700);
    document.body.classList.remove('incine'); this.ui.hud?.classList.remove('cinehide');
    // a scene that ended on black comes back up softly (unless travel keeps it black for the reload)
    if (this.endedBlack) { this.ui.fade(1, 0); setTimeout(() => { if (!this.ui.holdBlack && !this.def) this.ui.fade(0, 0.8); }, 60); }
    this.setLine(null); this.setCard(null); this.setCaption(null); this.fade(0, 0);
    if (this.bokeh) this.bokeh.enabled = false;
    this.game.cinematic = false; this.game.camInit = false; this.game.setLootBeams?.(true);
    d.end?.(this, skipped);
    this.resolve?.(skipped);
  }
  // fades are stepped in update() (CSS transitions are unreliable right after the overlay is shown)
  fade(v, sec = 0.8) { this.fadeTo = v; this.fadeRate = sec > 0.02 ? 1 / sec : 1e9; if (!this.def) { this.fadeCur = v; this.$('.cfade').style.opacity = v; } }

  setLine(line) {
    const sub = this.$('.sub');
    if (!line) { sub.classList.remove('show'); return; }
    this.$('.sname').textContent = t(line.who || '');
    this.lineText = t(line.text); this.typed = 0; this.$('.sline').innerHTML = '';
    const por = this.$('.por'); por.style.display = line.rig ? '' : 'none';
    if (line.rig) this.portrait(line.rig, this.$('.por canvas'));
    sub.classList.add('show');
    if (line.cue) this.audio.vocal?.(line.cue, line.pitch || 1);
    // faces: the speaker shows the line's feeling, the others react to it
    const mood = line.expr || moodOf(line.text);
    for (const r of this.faces()) r.userData.expr = r === line.rig ? mood : line.react || REACT[mood] || 'listen';
  }
  faces() { const out = new Set(); for (const a of this.def?.actors || []) if (a?.rig?.userData?.parts) out.add(a.rig); if (this.shot?.line?.rig) out.add(this.shot.line.rig); if (this.game.player?.rig) out.add(this.game.player.rig); if (this.game.npc) out.add(this.game.npc); return out; }
  setCard(c) {
    const card = this.$('.card');
    if (!c) { card.classList.remove('show'); return; }
    this.$('.card .ar').textContent = c.ar || ''; this.$('.card .en').textContent = t(c.en || ''); this.$('.card .csub').textContent = t(c.sub || '');
    card.classList.add('show'); this.cardT = 0;
  }
  setCaption(text) { const c = this.$('.caption'); c.textContent = t(text || ''); c.classList.toggle('show', !!text); }

  // render a small lit head-and-shoulders portrait of the speaker into the subtitle bar
  portrait(rig, canvas) {
    if (this.portraits.has(rig)) { canvas.getContext('2d').drawImage(this.portraits.get(rig), 0, 0); return; }
    try {
      const S = 96, rt = new THREE.WebGLRenderTarget(S, S, { samples: 0 });
      const head = rig.userData.parts.head; rig.updateMatrixWorld(true);
      const hp = head.getWorldPosition(new THREE.Vector3()), q = head.getWorldQuaternion(new THREE.Quaternion());
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q).setY(0).normalize();
      const s = rig.userData.parts.body.scale.x;
      const cam = new THREE.PerspectiveCamera(24, 1, 0.05, 30);
      cam.position.copy(hp).addScaledVector(fwd, 0.85 * s).add(new THREE.Vector3(0, 0.12 * s, 0)).add(new THREE.Vector3(-fwd.z, 0, fwd.x).multiplyScalar(0.25 * s));
      cam.lookAt(hp.x, hp.y + 0.1 * s, hp.z);
      const r = this.renderer, prevT = r.getRenderTarget(), prevTone = r.toneMapping;
      r.setRenderTarget(rt); r.render(this.scene, cam); r.setRenderTarget(prevT);
      const px = new Uint8Array(S * S * 4); r.readRenderTargetPixels(rt, 0, 0, S, S, px); rt.dispose();
      const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), img = x.createImageData(S, S);
      for (let y = 0; y < S; y++) for (let i = 0; i < S * 4; i++) {
        let v = px[(S - 1 - y) * S * 4 + i];
        if (i % 4 !== 3) v = Math.min(255, Math.pow(v / 255, 1 / 2.2) * 255 * 1.05); // linear -> display
        img.data[y * S * 4 + i] = i % 4 === 3 ? 255 : v;
      }
      x.putImageData(img, 0, 0);
      this.portraits.set(rig, c); canvas.getContext('2d').drawImage(c, 0, 0);
      void prevTone;
    } catch (e) { /* portraits are decoration only */ }
  }

  // Round 24: after a scene, ease the play camera out of the last shot's framing and let the film grade fall away
  blendOut(rawDt) {
    if (this.def) return;
    const g = this.grade.uniforms; if (g.uCine.value > 0) g.uCine.value = Math.max(0, g.uCine.value - rawDt * 1.2);
    const B = this.outBlend; if (!B) return;
    B.t += rawDt; const k = Math.min(1, B.t / B.dur), w = sm(k);
    if (B.pos.distanceTo(this.camera.position) > 30) { this.outBlend = null; return; } // the scene moved Salim far away: cut
    this.camera.position.lerpVectors(B.pos, this.camera.position, w);
    _q.copy(this.camera.quaternion); this.camera.quaternion.copy(B.quat).slerp(_q, w);
    const f = B.fov + (this.camera.fov - B.fov) * w; if (Math.abs(this.camera.fov - f) > 1e-3) { this.camera.fov = f; this.camera.updateProjectionMatrix(); }
    if (k >= 1) this.outBlend = null;
  }
  update(rawDt) {
    if (!this.def) return false;
    const s = this.shot; if (!s) return true;
    const dt = rawDt * this.timeScale;
    this.t += rawDt;
    const k = Math.min(1, this.t / s.dur), e = EASE[s.cam?.ease || 'io'](k);
    // camera: follow targets can be functions evaluated every frame
    const cam = s.cam || {};
    const P1 = cam.follow ? v3(cam.p1 || cam.p0) : this.p1, T1 = cam.follow ? v3(cam.t1 || cam.t0) : this.t1;
    const P0 = cam.follow ? v3(cam.p0) : this.p0, T0 = cam.follow ? v3(cam.t0) : this.t0;
    this.camera.position.lerpVectors(P0, P1, e);
    this.look.lerpVectors(T0, T1, e);
    if (cam.shake) { const a = cam.shake * (1 - k); this.camera.position.x += (Math.random() - 0.5) * a; this.camera.position.y += (Math.random() - 0.5) * a; }
    this.camera.lookAt(this.look);
    let fov = this.fov0 + (this.fov1 - this.fov0) * e;
    // Round 24: blend in from the play camera on the first shot. A shot that opens on black needs no blend; a shot far
    // from where the camera was (another part of the map) dips through black instead of sweeping across the world.
    if (this.inK < 1) {
      if (!this.inChecked) {
        this.inChecked = true;
        if (this.i > 0 || s.fadeIn != null || this.fadeCur > 0.5) this.inK = 1;
        else if (this.inPos.distanceTo(this.camera.position) > 28) { this.inK = 1; this.fadeCur = 1; this.fade(0, 0.45); }
      }
      if (this.inK < 1) {
        this.inK = Math.min(1, this.inK + rawDt / 0.85); const w = sm(this.inK);
        this.camera.position.lerpVectors(this.inPos, this.camera.position, w);
        _q.copy(this.camera.quaternion); this.camera.quaternion.copy(this.inQuat).slerp(_q, w);
        fov = this.inFov + (fov - this.inFov) * w;
      }
    }
    if (Math.abs(this.camera.fov - fov) > 1e-3) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    // grade + depth of field
    const g = this.grade.uniforms; g.uCine.value = Math.min(1, g.uCine.value + rawDt * 1.5); g.uDusk.value = this.def.dusk ?? 0;
    if (this.bokeh) {
      const focus = s.dof ? v3(s.dof) : null;
      this.bokeh.enabled = !!focus && QUALITY !== 'low';
      if (focus) { const u = this.bokeh.uniforms; u.focus.value = this.camera.position.distanceTo(focus); u.aperture.value = (s.aperture ?? 1.2) * 0.0001; u.maxblur.value = 0.009; }
    }
    // title card envelope: blur/spacing in, hold, fade out
    if (this.cardT != null && this.shot.card) {
      this.cardT += rawDt; const c = this.$('.card'), u = this.cardT / 5.2;
      const a = u < 0.18 ? u / 0.18 : u > 0.78 ? Math.max(0, 1 - (u - 0.78) / 0.22) : 1;
      c.style.opacity = a; c.style.letterSpacing = (4 + 8 * Math.max(0, 1 - u / 0.18)) + 'px'; c.style.filter = `blur(${Math.max(0, 1 - u / 0.18) * 6}px)`;
    }
    this.fadeCur ??= 0; this.fadeTo ??= 0;
    if (this.fadeCur !== this.fadeTo) { const st = rawDt * this.fadeRate; this.fadeCur = this.fadeCur < this.fadeTo ? Math.min(this.fadeTo, this.fadeCur + st) : Math.max(this.fadeTo, this.fadeCur - st); }
    this.$('.cfade').style.opacity = this.fadeCur;
    // typed subtitle
    if (this.lineText != null && this.shot.line) {
      this.typed += rawDt * 42;
      const n = Math.min(this.lineText.length, Math.floor(this.typed));
      this.$('.sline').textContent = this.lineText.slice(0, n);
      this.lineDone = n >= this.lineText.length;
      if (this.lineDone && this.doneAt == null) this.doneAt = this.t;
    }
    s.run?.(this, k, dt, s);
    this.def?.tick?.(this, dt);
    // spoken lines and captions hold until tapped, so nothing is missed (they move on by themselves after 20 s)
    const waits = !!(s.line || s.caption) && !s.noWait;
    const ready = this.t >= s.dur && (!s.line || this.lineDone);
    this.$('.tapnext').classList.toggle('show', waits && this.ready());
    if (this.def && this.shot === s && ready && !s.choice && (!waits || this.t >= s.dur + 20)) this.next();
    return true;
  }
}
