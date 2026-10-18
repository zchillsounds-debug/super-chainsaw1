// Glowcap Hollow's fairy ring (after dark): four singing toadstools play a little tune, and you tap it back.
// Three rounds (3, 4, then 5 notes); a sour note ends the song. Plain DOM, stepped by step(dt) so tests can drive it.
import { sfx } from './audio.js';

const CAPS = [['#ff6aa8', 'Pink'], ['#ffd84d', 'Gold'], ['#5ae8c8', 'Mint'], ['#a88aff', 'Violet']];
const LENS = [3, 4, 5];

// onDone(won, rounds) runs when the overlay closes
export function fairyRing(root, seed, onDone) {
  const el = document.createElement('div');
  el.className = 'modal-wrap ring-wrap';
  el.innerHTML = `<div class="ring"><h3>🍄 The Fairy Ring</h3><p class="rg-msg">Listen...</p>
    <div class="rg-caps">${CAPS.map(([c, n], i) => `<button class="rg-cap" data-i="${i}" style="--cc:${c}" aria-label="${n} toadstool"><i></i><b></b></button>`).join('')}</div>
    <div class="rg-dots">${LENS.map(() => '<span></span>').join('')}</div><p class="rg-tap">Tap to leave</p></div>`;
  root.appendChild(el);
  let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const tune = Array.from({ length: LENS[LENS.length - 1] }, () => Math.floor(rnd() * 4));
  const caps = [...el.querySelectorAll('.rg-cap')], msg = el.querySelector('.rg-msg'), dots = [...el.querySelectorAll('.rg-dots span')];
  let round = 0, phase = 'show', t = -0.6, pos = 0, raf = 0, last = performance.now(), closed = false, won = false;
  const flash = (i) => { const c = caps[i]; c.classList.remove('on'); void c.offsetWidth; c.classList.add('on'); sfx.note?.(i); setTimeout(() => c.classList.remove('on'), 380); };
  const step = (dt) => {
    if (phase !== 'show') return;
    t += dt;
    const k = Math.floor(t / 0.62); // one note every 0.62 s
    if (t >= 0 && k >= pos && pos < LENS[round]) { flash(tune[pos]); pos++; }
    if (pos >= LENS[round] && t > LENS[round] * 0.62 + 0.2) { phase = 'play'; pos = 0; msg.textContent = 'Your turn! Tap the toadstools in the same order.'; el.classList.add('yours'); }
  };
  const next = () => { phase = 'show'; t = -0.7; pos = 0; el.classList.remove('yours'); msg.textContent = 'Listen...'; };
  const end = (ok) => {
    phase = 'end'; won = ok; el.classList.remove('yours'); el.classList.add('done', ok ? 'won' : 'lost');
    msg.textContent = ok ? '✨ The whole ring sings along! ✨' : 'A sour note! The toadstools giggle and go quiet.';
    if (ok) sfx.jingle?.(2); else sfx.ui?.('back');
  };
  const tap = (i) => {
    if (phase !== 'play') return;
    flash(i);
    if (i !== tune[pos]) return end(false);
    if (++pos < LENS[round]) return;
    dots[round].classList.add('got'); round++;
    if (round >= LENS.length) return end(true);
    phase = 'wait'; msg.textContent = 'Lovely! Now a longer one...'; el.classList.remove('yours'); setTimeout(() => !closed && next(), 650);
  };
  caps.forEach((c) => c.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); tap(+c.dataset.i); }));
  const loop = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; step(dt); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  const close = () => { if (closed) return; closed = true; cancelAnimationFrame(raf); el.remove(); onDone?.(won, round); };
  el.addEventListener('pointerdown', (e) => { if (phase === 'end') close(); });
  el.__ring = { step, tap, close, get tune() { return tune.slice(0, LENS[round]); }, get phase() { return phase; } };
  return el;
}
