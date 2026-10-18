// CRITTER CLASH TURBO: the Neon City arcade cabinet. A 30-second catch game drawn on a 2D canvas:
// the hero slides along the bottom catching falling berries (gold ones are worth more) and dodging zap bombs.
import { sfx } from './audio.js';

const LEN = 30; // seconds a round lasts
const W = 320, H = 240; // the cabinet's screen, in canvas pixels (scaled up to fit)

export function arcadeGame(root, face, onDone) {
  const el = document.createElement('div');
  el.className = 'modal-wrap arcade-wrap';
  el.innerHTML = `<div class="arcade"><div class="arc-top"><b>CRITTER CLASH TURBO</b><span class="arc-hud"></span></div>
    <canvas width="${W}" height="${H}"></canvas>
    <p class="arc-tip">Touch and drag (or ← →) to move. Catch 🍓, grab the gold ones, dodge ⚡!</p></div>`;
  root.appendChild(el);
  const cv = el.querySelector('canvas'), c = cv.getContext('2d'), hud = el.querySelector('.arc-hud');
  const img = new Image(); img.src = face;
  const S = { x: W / 2, vx: 0, t: LEN, score: 0, lives: 3, combo: 0, items: [], pops: [], spawn: 0.4, hurt: 0, over: false, ready: 1.2 };
  const keys = new Set();
  let target = null, last = performance.now(), raf = 0;
  const onKey = (e) => {
    const k = e.code;
    if (!['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(k)) return;
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'keydown') keys.add(k); else keys.delete(k);
  };
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  const toX = (e) => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture?.(e.pointerId); target = toX(e); });
  cv.addEventListener('pointermove', (e) => { if (target != null) target = toX(e); });
  const up = () => { target = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  const drop = () => {
    const r = Math.random(), k = r < 0.16 + Math.min(0.14, (LEN - S.t) * 0.006) ? 'zap' : r < 0.27 ? 'gold' : 'berry';
    S.items.push({ k, x: 16 + Math.random() * (W - 32), y: -12, vy: 70 + (LEN - S.t) * 3.2 + Math.random() * 40, wob: Math.random() * 6 });
  };
  const pop = (x, y, txt, col) => S.pops.push({ x, y, txt, col, t: 0.8 });

  const step = (dt) => {
    if (S.ready > 0) { S.ready -= dt; return; }
    if (S.over) return;
    S.t -= dt; S.hurt = Math.max(0, S.hurt - dt);
    if (S.t <= 0 || S.lives <= 0) { S.t = Math.max(0, S.t); S.over = true; finish(); return; }
    let ax = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) ax -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) ax += 1;
    if (target != null) S.x += Math.max(-1, Math.min(1, (target - S.x) / 6)) * 330 * dt;
    else S.x += ax * 260 * dt;
    S.x = Math.max(18, Math.min(W - 18, S.x));
    S.spawn -= dt;
    if (S.spawn <= 0) { drop(); S.spawn = Math.max(0.26, 0.62 - (LEN - S.t) * 0.012); }
    for (const it of S.items) {
      it.y += it.vy * dt; it.wob += dt * 5;
      if (!it.hit && it.y > H - 40 && it.y < H - 14 && Math.abs(it.x - S.x) < 22) {
        it.hit = true;
        if (it.k === 'zap') { if (S.hurt <= 0) { S.lives--; S.hurt = 1; S.combo = 0; pop(it.x, it.y, 'ZAP!', '#7ae0ff'); sfx.ui?.('back'); } }
        else { S.combo++; const v = (it.k === 'gold' ? 25 : 5) * (1 + Math.floor(S.combo / 8)); S.score += v; pop(it.x, it.y, '+' + v, it.k === 'gold' ? '#ffd84d' : '#ff8ab0'); sfx.ui?.('move'); }
      }
      if (!it.hit && it.y > H + 10 && it.k !== 'zap') S.combo = 0;
    }
    S.items = S.items.filter((it) => !it.hit && it.y < H + 20);
    for (const p of S.pops) { p.t -= dt; p.y -= 30 * dt; }
    S.pops = S.pops.filter((p) => p.t > 0);
  };

  const berry = (x, y, gold, s = 1) => {
    c.fillStyle = gold ? '#ffd84d' : '#ff4a6a'; c.beginPath(); c.arc(x, y, 8 * s, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(x - 3 * s, y - 3 * s, 2.4 * s, 0, 7); c.fill();
    c.fillStyle = '#4ad86a'; c.fillRect(x - 1.5 * s, y - 12 * s, 3 * s, 5 * s);
    if (gold) { c.strokeStyle = '#fff6b0'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 11, 0, 7); c.stroke(); }
  };
  const draw = () => {
    c.fillStyle = '#140e2a'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(192,90,255,0.25)'; c.lineWidth = 1; // the neon grid floor
    for (let k = 0; k <= 10; k++) { c.beginPath(); c.moveTo(W / 2 + (k - 5) * 14, H - 60); c.lineTo(W / 2 + (k - 5) * 64, H); c.stroke(); }
    for (let k = 0; k < 5; k++) { const y = H - 60 + k * k * 3.6; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    for (const it of S.items) {
      if (it.k === 'zap') {
        c.fillStyle = '#2a2438'; c.beginPath(); c.arc(it.x, it.y, 9, 0, 7); c.fill();
        c.strokeStyle = '#7ae0ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(it.x - 3, it.y - 6); c.lineTo(it.x + 2, it.y - 1); c.lineTo(it.x - 2, it.y + 1); c.lineTo(it.x + 3, it.y + 6); c.stroke();
        c.fillStyle = Math.sin(it.wob * 3) > 0 ? '#ffe04a' : '#ff5ad8'; c.beginPath(); c.arc(it.x + 6, it.y - 8, 2.5, 0, 7); c.fill();
      } else berry(it.x + Math.sin(it.wob) * 1.5, it.y, it.k === 'gold');
    }
    // the hero: their portrait on a little hover board
    const bx = S.x, by = H - 26, blink = S.hurt > 0 && Math.floor(S.hurt * 12) % 2;
    c.fillStyle = '#ff5ad8'; c.fillRect(bx - 20, by + 10, 40, 5); c.fillStyle = '#7ae0ff'; c.fillRect(bx - 16, by + 15, 32, 2);
    if (!blink) { if (img.complete && img.naturalWidth) c.drawImage(img, bx - 20, by - 28, 40, 40); else { c.fillStyle = '#ff9a40'; c.beginPath(); c.arc(bx, by - 8, 16, 0, 7); c.fill(); } }
    c.textAlign = 'center'; c.font = 'bold 13px sans-serif';
    for (const p of S.pops) { c.globalAlpha = Math.min(1, p.t * 2); c.fillStyle = p.col; c.fillText(p.txt, p.x, p.y); }
    c.globalAlpha = 1;
    if (S.ready > 0) { c.fillStyle = '#fff36b'; c.font = 'bold 30px sans-serif'; c.fillText(S.ready > 0.5 ? 'READY?' : 'GO!', W / 2, H / 2); }
    if (S.over) { c.fillStyle = 'rgba(20,14,42,0.7)'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff36b'; c.font = 'bold 28px sans-serif'; c.fillText(S.lives <= 0 ? 'ZAPPED!' : 'TIME!', W / 2, H / 2 - 10); c.fillStyle = '#fff'; c.font = 'bold 16px sans-serif'; c.fillText(`Score ${S.score}`, W / 2, H / 2 + 16); }
    hud.textContent = `⏱ ${Math.ceil(S.t)}  ❤️ ${'●'.repeat(Math.max(0, S.lives))}${'○'.repeat(3 - Math.max(0, S.lives))}  ⭐ ${S.score}${S.combo >= 8 ? `  x${1 + Math.floor(S.combo / 8)}` : ''}`;
  };
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    step(dt); draw();
    if (el.isConnected) raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  let closed = false;
  const close = () => {
    if (closed) return; closed = true;
    cancelAnimationFrame(raf); el.remove();
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true);
    onDone(S.score);
  };
  function finish() { setTimeout(close, 1600); }
  // test hook: step the game without waiting for real time
  el.__arcade = { S, step: (sec) => { for (let t = 0; t < sec; t += 1 / 60) step(1 / 60); draw(); }, close };
  return el;
}
