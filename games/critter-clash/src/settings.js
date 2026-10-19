// Settings modal: audio, vibration, graphics quality, accessibility, save reset.
import { save, persist, resetSave } from './save.js';
import { backupSheet, restoreSheet } from './backup.js';
import { vol, setVolumes, sfx } from './audio.js';

export function applySettings(game) {
  const s = save.settings;
  vol.music = s.music; vol.sfx = s.sfx;
  setVolumes();
  game.reduceFlash = s.reduceFlash;
  game.setQuality(s.quality);
  document.body.style.setProperty('--bs', { s: 0.85, m: 1, l: 1.15 }[s.btnSize] || 1);
}

// dialogue typing: [ms per tick, characters per tick] for the Text speed setting
export const typeSpeed = () => { const v = save.settings.textSpeed || 'm'; return v === 'i' ? [16, 9999] : [{ s: 34, m: 18, f: 8 }[v] || 18, 1]; };

export function openSettings(game, root) {
  const s = save.settings;
  const d = document.createElement('div');
  d.className = 'modal-wrap settings';
  const q = ['auto', 'low', 'med', 'high'];
  d.innerHTML = `<div class="modal">
    <h2>Settings</h2>
    <div class="set-list">
      <label class="set"><span>Music</span><input type="range" min="0" max="1" step="0.05" data-k="music" value="${s.music}"></label>
      <label class="set"><span>Sound effects</span><input type="range" min="0" max="1" step="0.05" data-k="sfx" value="${s.sfx}"></label>
      <div class="set"><span>Graphics</span><div class="seg" data-k="quality">${q.map((v) => `<button data-v="${v}" class="${s.quality === v ? 'on' : ''}">${{ auto: 'Auto', low: 'Low', med: 'Medium', high: 'High' }[v]}</button>`).join('')}</div></div>
      <div class="set"><span>Button size</span><div class="seg" data-k="btnSize">${['s', 'm', 'l'].map((v) => `<button data-v="${v}" class="${(s.btnSize || 'm') === v ? 'on' : ''}">${{ s: 'Small', m: 'Normal', l: 'Large' }[v]}</button>`).join('')}</div></div>
      <div class="set"><span>Text speed</span><div class="seg" data-k="textSpeed">${['s', 'm', 'f', 'i'].map((v) => `<button data-v="${v}" class="${(s.textSpeed || 'm') === v ? 'on' : ''}">${{ s: 'Slow', m: 'Normal', f: 'Fast', i: 'Instant' }[v]}</button>`).join('')}</div></div>
      <label class="set"><span>Battle tips</span><input type="checkbox" class="tog" data-k="tips" ${save.tutorialDone ? '' : 'checked'}></label>
      <label class="set"><span>Vibration</span><input type="checkbox" class="tog" data-k="vibrate" ${s.vibrate ? 'checked' : ''}></label>
      <label class="set"><span>Arena hazards</span><input type="checkbox" class="tog" data-k="hazards" ${s.hazards !== false ? 'checked' : ''}></label>
      <label class="set"><span>Reduce flashing</span><input type="checkbox" class="tog" data-k="reduceFlash" ${s.reduceFlash ? 'checked' : ''}></label>
      <div class="set"><span>Save</span><div class="seg bk"><button class="bk-up">Back up</button><button class="bk-in">Restore</button></div></div>
    </div>
    <div class="set-foot"><button class="btn ghost-dark reset">Reset progress</button><button class="btn primary done">Done</button></div>
  </div>`;
  const close = () => { d.remove(); game.modalClose = null; };
  game.modalClose = close;
  d.addEventListener('click', (e) => { if (e.target === d) close(); });
  d.querySelectorAll('input[type=range]').forEach((el) => el.addEventListener('input', () => {
    s[el.dataset.k] = +el.value; applySettings(game); persist();
    if (el.dataset.k === 'sfx') sfx.ui('move');
  }));
  d.querySelectorAll('input.tog').forEach((el) => el.addEventListener('change', () => {
    if (el.dataset.k === 'tips') {
      // tips on = the first-battle coach runs again next battle; off = hide it now
      save.tutorialDone = !el.checked;
      if (!el.checked && game.battle?.tutorial) { game.battle.tutorial.dispose(); game.battle.tutorial = null; }
    } else s[el.dataset.k] = el.checked;
    applySettings(game); persist(); sfx.ui('move');
  }));
  d.querySelectorAll('.seg[data-k] button').forEach((b) => b.addEventListener('click', () => {
    const seg = b.parentElement;
    s[seg.dataset.k] = b.dataset.v; persist(); applySettings(game); sfx.ui('ok');
    seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  }));
  d.querySelector('.done').addEventListener('click', () => { sfx.ui('ok'); close(); });
  d.querySelector('.bk-up').addEventListener('click', () => { sfx.ui('ok'); backupSheet(root); });
  d.querySelector('.bk-in').addEventListener('click', () => { sfx.ui('ok'); restoreSheet(root); });
  const reset = d.querySelector('.reset');
  reset.addEventListener('click', () => {
    if (!reset.classList.contains('armed')) { reset.classList.add('armed'); reset.textContent = 'Tap again to erase everything'; return; }
    resetSave(); close(); game.screens.title();
  });
  root.appendChild(d);
}
