import { setLanguage } from './i18n.js';
import { SHARP_RATIO } from './graphics.js';
import { saveGame } from './save.js';

// Settings: graphics, audio, controls, accessibility, language. Stored per device in localStorage.
const KEY = 'sob.settings.v1';
export const DEFAULTS = {
  quality: null, res: 1, sharp: 'smooth', shadows: true, ao: true, bloom: true, atmos: true, fps: false,
  master: 1, music: 1, sfx: 1, amb: 1,
  attackMode: 'hold', shake: 1, tscale: 0.85, topa: 0.65,
  subs: 1, cvd: 0, reduceFlash: false, tutorial: true,
  lang: 'en',
};
export function loadSettings() { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; } }
// Round 29: back up and restore every 'sob.*' key as one text code, so progress survives a reinstall of the app
const CODE_TAG = 'MAS1:';
export function exportSave() {
  const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('sob.')) o[k] = localStorage.getItem(k); }
  const u = new TextEncoder().encode(JSON.stringify(o)); let bin = '';
  for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return CODE_TAG + btoa(bin);
}
export function importSave(code) {
  const c = String(code || '').replace(/\s+/g, '');
  if (!c.startsWith(CODE_TAG)) return false;
  let o; try { const bin = atob(c.slice(CODE_TAG.length)); o = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)))); } catch { return false; }
  if (!o || typeof o !== 'object' || !o['sob.save.v1']) return false;
  window.__noSave = true; // the game must not write its current state over the restored one before the reload
  for (const k of Object.keys(localStorage)) if (k.startsWith('sob.')) localStorage.removeItem(k);
  for (const [k, v] of Object.entries(o)) if (k.startsWith('sob.') && typeof v === 'string') localStorage.setItem(k, v);
  return true;
}
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
      const base = Math.min(devicePixelRatio, SHARP_RATIO[s.sharp] || 2);
      renderer.setPixelRatio(base * s.res); gfx.resize();
      gfx.sun.castShadow = s.shadows; renderer.shadowMap.enabled = s.shadows;
      if (gfx.gtao) gfx.gtao.enabled = s.ao; if (gfx.bloom) gfx.bloom.enabled = s.bloom;
      if (gfx.atmos) gfx.atmos.enabled = s.atmos;
    }
    perf?.toggle(s.fps);
    audio.setVolumes?.({ master: s.master, music: s.music, sfx: s.sfx, amb: s.amb });
    // accessibility
    document.body.style.setProperty('--subscale', s.subs);
    document.body.style.setProperty('--tscale', s.tscale); document.body.style.setProperty('--topa', s.topa);
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
    w.innerHTML = `<div class="ptitle">Settings <span class="close" role="button" aria-label="Close">✕</span></div><div class="sgrid2">
      <section><h4>Graphics</h4>${sel('quality', 'Quality', [['low', 'Low'], ['high', 'High']]).replace(`value="${q}"`, `value="${q}" selected`)}<small class="note">Reload to apply</small>
        ${sel('sharp', 'Sharpness', [['smooth', 'Smooth (sharpest)'], ['balanced', 'Balanced'], ['fast', 'Fast (best frame rate)']])}${range('res', 'Resolution', 0.5, 1.5, 0.05)}${tog('shadows', 'Shadows')}${tog('ao', 'Ambient occlusion')}${tog('bloom', 'Bloom')}${tog('atmos', 'Atmosphere')}${tog('fps', 'Show FPS')}<button class="sbtn benchbtn">Run benchmark (30 s)</button><small class="note">A short fly-through and fight that measures this device and suggests settings.</small></section>
      <section><h4>Audio</h4>${range('master', 'Master', 0, 1, 0.05)}${range('music', 'Music', 0, 1, 0.05)}${range('sfx', 'Effects', 0, 1, 0.05)}${range('amb', 'Ambience', 0, 1, 0.05)}</section>
      <section><h4>Controls</h4>${sel('attackMode', 'Attack button', [['hold', 'Hold to repeat'], ['toggle', 'Tap to toggle']])}${range('shake', 'Camera shake', 0, 1, 0.1)}${document.body.classList.contains('touch') ? range('tscale', 'Button size', 0.7, 1.2, 0.05) + range('topa', 'Button opacity', 0.3, 1, 0.05) : ''}
        <div class="note">Gamepad: left stick move · A attack · B evade · X right skill · Y / LB / RB skills 1–3 · RT sherbet · Start settings · Back journal</div></section>
      <section><h4>Accessibility</h4>${sel('subs', 'Subtitle size', [[0.85, 'Small'], [1, 'Medium'], [1.25, 'Large'], [1.55, 'Huge']])}${sel('cvd', 'Colour vision', [[0, 'Off'], [1, 'Protanopia'], [2, 'Deuteranopia'], [3, 'Tritanopia']])}${tog('reduceFlash', 'Reduce flashing')}${tog('tutorial', 'Tutorial hints')}</section>
      <section><h4>Language</h4>${sel('lang', 'Language', [['en', 'English'], ['ar', 'العربية']])}</section>
      <section><h4>Saved game</h4><small class="note">Back up your progress before reinstalling the app, then restore it after.</small><div class="row2"><button class="sbtn sbak">Back up save</button><button class="sbtn sres">Restore save</button></div>
        <div class="savebox hidden"><textarea rows="4" spellcheck="false" autocomplete="off"></textarea><small class="note sbnote"></small><div class="row2"><button class="sbtn sbgo"></button></div></div></section>
    </div>`;
    document.getElementById('ui').appendChild(w); document.body.classList.add('inshop');
    w.querySelector('.close').onclick = () => this.close();
    w.querySelector('.benchbtn').onclick = () => this.ctx.game.runBench?.();
    const box = w.querySelector('.savebox'), ta = box.querySelector('textarea'), note = box.querySelector('.sbnote'), go = box.querySelector('.sbgo');
    w.querySelector('.sbak').onclick = () => {
      if (document.body.classList.contains('playing') && this.ctx.game) saveGame(this.ctx.game); /* never from the title, where it would overwrite the save */ box.classList.remove('hidden'); ta.readOnly = true; ta.value = exportSave(); go.textContent = 'Copy code';
      note.textContent = 'Copy this code and keep it somewhere safe (a note or a message to yourself).';
      go.onclick = async () => { ta.select(); let ok = false; try { await navigator.clipboard.writeText(ta.value); ok = true; } catch { try { ok = document.execCommand('copy'); } catch { /* no clipboard */ } } note.textContent = ok ? 'Copied.' : 'Select the code and copy it by hand.'; };
    };
    w.querySelector('.sres').onclick = () => {
      box.classList.remove('hidden'); ta.readOnly = false; ta.value = ''; go.textContent = 'Restore';
      note.textContent = 'Paste a backup code. This replaces the progress on this device.';
      go.onclick = () => { if (importSave(ta.value)) { note.textContent = 'Restored. Reloading…'; setTimeout(() => location.reload(), 400); } else note.textContent = 'That code is not a valid backup.'; };
    };
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
