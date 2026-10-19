// Frostpeak's snow fort: Snowball Kid Kip's target practice. Snowmen pop up behind six snow mounds; tap them to hit them
// with a snowball before they duck. A golden snowman is worth 3. Don't hit Kip! 20 seconds. Plain DOM, stepped by step(dt) so tests can drive it.
import { sfx } from './audio.js';

const LEN = 20, GOAL = 12;

// kip: Kip's portrait (an image url); onDone(score) runs when the overlay closes
export function snowballToss(root, kip, seed, onDone) {
  const el = document.createElement('div');
  el.className = 'modal-wrap snow-wrap';
  el.innerHTML = `<div class="snowb"><h3>❄️ Snowball Toss</h3><p class="sb-msg">Hit the snowmen before they duck! Don't hit Kip!</p>
    <div class="sb-bar"><span class="sb-score">0</span><i><b></b></i><span class="sb-goal">Goal ${GOAL}</span></div>
    <div class="sb-field">${Array.from({ length: 6 }, (_, i) => `<button class="sb-hole" data-i="${i}" aria-label="Snow mound ${i + 1}"><span class="sb-pop"><span class="sb-man"><i></i><i></i><em></em></span><img src="${kip}" alt=""></span><span class="sb-splat"></span><span class="sb-mound"></span></button>`).join('')}</div>
    <p class="sb-tap">Tap to leave</p></div>`;
  root.appendChild(el);
  let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const holes = [...el.querySelectorAll('.sb-hole')], msg = el.querySelector('.sb-msg'), scoreEl = el.querySelector('.sb-score'), bar = el.querySelector('.sb-bar b');
  const up = holes.map(() => null); // { kind: 'man' | 'gold' | 'kip', t: time left up }
  let t = 0, next = 0.8, score = 0, phase = 'play', raf = 0, last = performance.now(), closed = false;
  const set = (i, q) => { up[i] = q; const h = holes[i]; h.classList.toggle('up', !!q); if (q) { h.classList.remove('man', 'gold', 'kip', 'hit'); h.classList.add(q.kind); } };
  const step = (dt) => {
    if (phase !== 'play') return;
    t += dt; bar.style.width = `${Math.max(0, 1 - t / LEN) * 100}%`;
    up.forEach((q, i) => { if (q && (q.t -= dt) <= 0) set(i, null); });
    if ((next -= dt) <= 0) { // pop up somewhere free; faster as time runs out
      const k = t / LEN, free = up.map((q, i) => (q ? -1 : i)).filter((i) => i >= 0);
      next = 0.72 - k * 0.32;
      if (free.length) { const r = rnd(); set(free[Math.floor(rnd() * free.length)], { kind: r < 0.1 ? 'gold' : r < 0.32 ? 'kip' : 'man', t: 1.25 - k * 0.5 }); }
    }
    if (t >= LEN) end();
  };
  const end = () => {
    phase = 'end'; up.forEach((q, i) => q && set(i, null)); el.classList.add('done', score >= GOAL ? 'won' : 'lost');
    msg.textContent = score >= GOAL ? `⛄ ${score} hits! Kip cheers: "You're a snowball champ!"` : `${score} hits. Kip giggles: "So close! Again?"`;
    if (score >= GOAL) sfx.jingle?.(2); else sfx.ui?.('back');
  };
  const tap = (i) => {
    if (phase !== 'play') return;
    const q = up[i]; if (!q) return;
    const h = holes[i], box = el.querySelector('.snowb').getBoundingClientRect(), hr = h.getBoundingClientRect(); // a snowball flies from the bottom of the panel to the target
    const ball = document.createElement('i'); ball.className = 'sb-ball'; ball.style.setProperty('--dx', `${hr.left + hr.width / 2 - (box.left + box.width / 2)}px`); ball.style.setProperty('--dy', `${hr.top + hr.height * 0.35 - box.bottom}px`);
    el.querySelector('.snowb').appendChild(ball); setTimeout(() => ball.remove(), 260);
    set(i, null); h.classList.add('hit', q.kind);
    setTimeout(() => h.classList.remove('hit'), 380);
    if (q.kind === 'kip') { score = Math.max(0, score - 2); msg.textContent = 'Kip: "HEY! Not me!" (−2)'; sfx.snowball?.(); sfx.ui?.('back'); }
    else { score += q.kind === 'gold' ? 3 : 1; msg.textContent = q.kind === 'gold' ? '✨ A golden snowman! +3' : ['Splat!', 'Bullseye!', 'Got him!', 'Poof!'][score % 4]; sfx.snowball?.(q.kind === 'gold'); }
    scoreEl.textContent = score;
  };
  holes.forEach((h) => h.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); tap(+h.dataset.i); }));
  const loop = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; step(dt); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  const close = () => { if (closed) return; closed = true; cancelAnimationFrame(raf); el.remove(); onDone?.(score); };
  el.addEventListener('pointerdown', () => { if (phase === 'end') close(); });
  el.__snow = { step, tap, close, get up() { return up.map((q) => q?.kind || null); }, get phase() { return phase; }, get score() { return score; } };
  return el;
}

export const SNOW_GOAL = GOAL;
