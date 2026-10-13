// Settings modal: audio, vibration, graphics quality, accessibility, save reset.
import { save, persist, resetSave } from './save.js';
import { vol, setVolumes, sfx } from './audio.js';

export function applySettings(game) {
  const s = save.settings;
  vol.music = s.music; vol.sfx = s.sfx;
  setVolumes();
  game.reduceFlash = s.reduceFlash;
  game.setQuality(s.quality);
}

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
      <label class="set"><span>Vibration</span><input type="checkbox" class="tog" data-k="vibrate" ${s.vibrate ? 'checked' : ''}></label>
      <label class="set"><span>Arena hazards</span><input type="checkbox" class="tog" data-k="hazards" ${s.hazards !== false ? 'checked' : ''}></label>
      <label class="set"><span>Reduce flashing</span><input type="checkbox" class="tog" data-k="reduceFlash" ${s.reduceFlash ? 'checked' : ''}></label>
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
  d.querySelectorAll('input.tog').forEach((el) => el.addEventListener('change', () => { s[el.dataset.k] = el.checked; applySettings(game); persist(); sfx.ui('move'); }));
  d.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
    s.quality = b.dataset.v; persist(); applySettings(game); sfx.ui('ok');
    d.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b));
  }));
  d.querySelector('.done').addEventListener('click', () => { sfx.ui('ok'); close(); });
  const reset = d.querySelector('.reset');
  reset.addEventListener('click', () => {
    if (!reset.classList.contains('armed')) { reset.classList.add('armed'); reset.textContent = 'Tap again to erase everything'; return; }
    resetSave(); close(); game.screens.title();
  });
  root.appendChild(d);
}
