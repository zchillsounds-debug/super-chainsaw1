import { setLanguage } from './i18n.js';

// Settings: graphics, audio, controls, accessibility, language. Stored per device in localStorage.
const KEY = 'sob.settings.v1';
export const DEFAULTS = {
  quality: null, res: 1, shadows: true, ao: true, bloom: true, atmos: true, fps: false,
  master: 1, music: 1, sfx: 1, amb: 1,
  attackMode: 'hold', shake: 1,
  subs: 1, cvd: 0, reduceFlash: false, tutorial: true,
  lang: 'en',
};
export function loadSettings() { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; } }
function store(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } }

export class Settings {
  constructor(ctx) {
    this.ctx = ctx; this.s = loadSettings();
    this.apply(true);
  }
  set(k, v) { this.s[k] = v; store(this.s); this.apply(); }
  apply(first = false) {
    const { s } = this, { renderer, gfx, audio, game, grade, perf } = this.ctx;
    // graphics
    if (gfx) {
      const base = Math.min(devicePixelRatio, gfx.quality === 'low' ? 1 : 1.5);
      renderer.setPixelRatio(base * s.res); gfx.resize();
      gfx.sun.castShadow = s.shadows; renderer.shadowMap.enabled = s.shadows;
      if (gfx.gtao) gfx.gtao.enabled = s.ao; if (gfx.bloom) gfx.bloom.enabled = s.bloom;
      if (gfx.atmos) gfx.atmos.enabled = s.atmos;
    }
    perf?.toggle(s.fps);
    audio.setVolumes?.({ master: s.master, music: s.music, sfx: s.sfx, amb: s.amb });
    // accessibility
    document.body.style.setProperty('--subscale', s.subs);
    if (grade) grade.uniforms.uCVD.value = s.cvd;
    if (game) { game.shakeScale = s.reduceFlash ? 0 : s.shake; game.reduceFlash = s.reduceFlash; game.attackMode = s.attackMode; game.tutorialOn = s.tutorial; }
    document.body.classList.toggle('noflash', s.reduceFlash);
    if (first || document.documentElement.lang !== s.lang) setLanguage(s.lang);
  }
  open() {
    const s = this.s; document.getElementById('settings')?.remove();
    const w = document.createElement('div'); w.id = 'settings'; w.className = 'panel';
    const range = (k, label, min, max, step) => `<label class="srange">${label}<input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${s[k]}"></label>`;
    const tog = (k, label) => `<label class="stog"><span>${label}</span><input type="checkbox" data-k="${k}" ${s[k] ? 'checked' : ''}></label>`;
    const sel = (k, label, opts) => `<label class="ssel"><span>${label}</span><select data-k="${k}">${opts.map(([v, t]) => `<option value="${v}" ${String(s[k]) === String(v) ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
    const q = new URLSearchParams(location.search).get('q') || this.ctx.gfx?.quality;
    w.innerHTML = `<div class="ptitle">Settings <span class="close">✕</span></div><div class="sgrid2">
      <section><h4>Graphics</h4>${sel('quality', 'Quality', [['low', 'Low'], ['high', 'High']]).replace(`value="${q}"`, `value="${q}" selected`)}<small class="note">Reload to apply</small>
        ${range('res', 'Resolution', 0.5, 1.5, 0.05)}${tog('shadows', 'Shadows')}${tog('ao', 'Ambient occlusion')}${tog('bloom', 'Bloom')}${tog('atmos', 'Atmosphere')}${tog('fps', 'Show FPS')}</section>
      <section><h4>Audio</h4>${range('master', 'Master', 0, 1, 0.05)}${range('music', 'Music', 0, 1, 0.05)}${range('sfx', 'Effects', 0, 1, 0.05)}${range('amb', 'Ambience', 0, 1, 0.05)}</section>
      <section><h4>Controls</h4>${sel('attackMode', 'Attack button', [['hold', 'Hold to repeat'], ['toggle', 'Tap to toggle']])}${range('shake', 'Camera shake', 0, 1, 0.1)}
        <div class="note">Gamepad: left stick move · A attack · B evade · X right skill · Y / LB / RB skills 1–3 · RT sherbet · Start settings · Back journal</div></section>
      <section><h4>Accessibility</h4>${sel('subs', 'Subtitle size', [[0.85, 'Small'], [1, 'Medium'], [1.25, 'Large'], [1.55, 'Huge']])}${sel('cvd', 'Colour vision', [[0, 'Off'], [1, 'Protanopia'], [2, 'Deuteranopia'], [3, 'Tritanopia']])}${tog('reduceFlash', 'Reduce flashing')}${tog('tutorial', 'Tutorial hints')}</section>
      <section><h4>Language</h4>${sel('lang', 'Language', [['en', 'English'], ['ar', 'العربية']])}<small class="note">The Arabic interface covers menus and the HUD; story dialogue and the codex are in English for now.</small></section>
    </div>`;
    document.getElementById('ui').appendChild(w); document.body.classList.add('inshop');
    w.querySelector('.close').onclick = () => this.close();
    w.querySelectorAll('[data-k]').forEach((i) => {
      const k = i.dataset.k;
      const read = () => i.type === 'checkbox' ? i.checked : i.type === 'range' ? +i.value : (isNaN(+i.value) ? i.value : +i.value);
      i.addEventListener(i.type === 'range' ? 'input' : 'change', () => {
        if (k === 'quality') { const u = new URL(location.href); u.searchParams.set('q', i.value); this.set(k, i.value); location.href = u.toString(); return; }
        this.set(k, read());
      });
    });
  }
  close() { document.getElementById('settings')?.remove(); document.body.classList.remove('inshop'); }
  get isOpen() { return !!document.getElementById('settings'); }
}
