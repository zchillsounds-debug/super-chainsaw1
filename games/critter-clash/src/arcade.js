// The Neon City arcade cabinets, drawn on a 2D canvas.
// CRITTER CLASH TURBO (left wall): a 30-second catch game; the hero slides along the bottom catching falling berries
// (gold ones are worth more) and dodging zap bombs. SKY HOP (right wall): tap to flap through gaps in neon pillars.
import { sfx } from './audio.js';
import { buzz } from './haptics.js';

const LEN = 30; // seconds a round lasts
const W = 320, H = 240;
const jolt = (el, big) => { const cv = el.querySelector('canvas'); cv.classList.remove('jolt', 'big'); void cv.offsetWidth; cv.classList.add('jolt'); if (big) cv.classList.add('big'); }; // the cabinet screen shakes on a hit // the cabinet's screen, in canvas pixels (scaled up to fit)

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
    if (S.ready > 0) { const was = S.ready; S.ready -= dt; if (was > 0.5 && S.ready <= 0.5) sfx.arc('go'); return; }
    if (S.over) return;
    const sec = Math.ceil(S.t); S.t -= dt; S.hurt = Math.max(0, S.hurt - dt);
    if (S.t > 0 && S.t <= 5 && Math.ceil(S.t) < sec) sfx.arc('tick'); // the last five seconds tick down
    if (S.t <= 0 || S.lives <= 0) { S.t = Math.max(0, S.t); S.over = true; sfx.arc(S.lives <= 0 ? 'crash' : 'time'); buzz(S.lives <= 0 ? 'heavy' : 'medium'); finish(); return; }
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
        if (it.k === 'zap') { if (S.hurt <= 0) { S.lives--; S.hurt = 1; S.combo = 0; pop(it.x, it.y, 'ZAP!', '#7ae0ff'); sfx.arc('zap'); buzz('medium'); jolt(el); } }
        else { S.combo++; const v = (it.k === 'gold' ? 25 : 5) * (1 + Math.floor(S.combo / 8)); S.score += v; pop(it.x, it.y, '+' + v, it.k === 'gold' ? '#ffd84d' : '#ff8ab0'); it.k === 'gold' ? (sfx.arc('gold'), buzz('light')) : sfx.arc('grab', S.combo); }
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

// SKY HOP: tap (or Space / ↑) to flap. Each pillar passed is 10, a berry in a gap is 5, and the gaps tighten as you go.
// One bump and it's over (a run is endless, but the pillars speed up).
export function skyHop(root, face, onDone) {
  const el = document.createElement('div');
  el.className = 'modal-wrap arcade-wrap';
  el.innerHTML = `<div class="arcade hop"><div class="arc-top"><b>SKY HOP</b><span class="arc-hud"></span></div>
    <canvas width="${W}" height="${H}"></canvas>
    <p class="arc-tip">Tap (or Space) to flap. Fly through the gaps, grab 🍓, don't bump the pillars!</p></div>`;
  root.appendChild(el);
  const cv = el.querySelector('canvas'), c = cv.getContext('2d'), hud = el.querySelector('.arc-hud');
  const img = new Image(); img.src = face;
  const S = { y: H / 2, vy: 0, t: 0, score: 0, passed: 0, pipes: [], pops: [], next: 1.1, over: false, ready: 1.2, started: false, crash: 0 };
  const stars = Array.from({ length: 40 }, (_, i) => [(i * 73) % W, (i * 41) % (H - 40), 0.3 + (i % 3) * 0.3]);
  const flap = () => { if (S.over) return; if (S.ready > 0) S.ready = 0; S.started = true; S.vy = -190; sfx.arc('flap'); };
  const onKey = (e) => {
    if (!['Space', 'ArrowUp', 'KeyW', 'Enter'].includes(e.code)) return;
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'keydown' && !e.repeat) flap();
  };
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); flap(); });
  const pop = (x, y, txt, col) => S.pops.push({ x, y, txt, col, t: 0.8 });
  const X = 80, R = 13; // the hero's column and hit radius
  const speed = () => 92 + Math.min(70, S.passed * 3.5);

  const step = (dt) => {
    if (S.ready > 0) { S.ready -= dt; S.y = H / 2 + Math.sin(S.t * 4) * 6; S.t += dt; return; }
    if (S.over) { S.crash += dt; if (S.y < H - 22) { S.vy += 520 * dt; S.y = Math.min(H - 22, S.y + S.vy * dt); } return; }
    S.t += dt;
    if (!S.started) { S.y = H / 2 + Math.sin(S.t * 4) * 6; return; }
    S.vy = Math.min(320, S.vy + 520 * dt); S.y += S.vy * dt;
    const v = speed();
    S.next -= dt;
    if (S.next <= 0) {
      const gap = Math.max(62, 92 - S.passed * 1.6), gy = 40 + gap / 2 + Math.random() * (H - 80 - gap);
      S.pipes.push({ x: W + 20, gy, gap, berry: Math.random() < 0.55, hue: S.pipes.length % 2 });
      S.next = 150 / v + 0.45;
    }
    for (const p of S.pipes) {
      p.x -= v * dt;
      if (!p.done && p.x < X - 18) { p.done = true; S.passed++; S.score += 10; pop(X, S.y - 18, '+10', '#7ae0ff'); sfx.arc('pass'); }
      if (p.berry && Math.abs(p.x - X) < R + 8 && Math.abs(p.gy - S.y) < R + 8) { p.berry = false; S.score += 5; pop(p.x, p.gy - 14, '+5', '#ff8ab0'); sfx.arc('grab', 4); }
      if (Math.abs(p.x - X) < 18 + R - 4 && Math.abs(S.y - p.gy) > p.gap / 2 - R + 3) die();
    }
    S.pipes = S.pipes.filter((p) => p.x > -40);
    if (S.y > H - 22 || S.y < 6) die();
    for (const p of S.pops) { p.t -= dt; p.y -= 30 * dt; }
    S.pops = S.pops.filter((p) => p.t > 0);
  };
  function die() { if (S.over) return; S.over = true; S.vy = -120; sfx.arc('crash'); buzz('heavy'); jolt(el, true); setTimeout(close, 1800); }

  const draw = () => {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a1040'); g.addColorStop(1, '#3a1a5a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (const [sx, sy, k] of stars) { c.fillStyle = `rgba(255,255,255,${k})`; c.fillRect((sx - S.t * 12 * k + W * 4) % W, sy, 2, 2); }
    c.fillStyle = '#2a1a50'; // the city skyline scrolling slowly behind
    for (let k = 0; k < 9; k++) { const bx = ((k * 46 - S.t * 18) % (W + 46) + W + 46) % (W + 46) - 46, bh = 30 + ((k * 37) % 50); c.fillRect(bx, H - 18 - bh, 38, bh); }
    for (const p of S.pipes) {
      const col = p.hue ? '#ff5ad8' : '#7ae0ff', top = p.gy - p.gap / 2, bot = p.gy + p.gap / 2;
      c.fillStyle = '#20163e'; c.fillRect(p.x - 18, 0, 36, top); c.fillRect(p.x - 18, bot, 36, H - bot);
      c.strokeStyle = col; c.lineWidth = 3; c.shadowColor = col; c.shadowBlur = 8;
      c.strokeRect(p.x - 18, -4, 36, top + 4); c.strokeRect(p.x - 18, bot, 36, H - bot + 4);
      c.fillStyle = col; c.fillRect(p.x - 22, top - 8, 44, 8); c.fillRect(p.x - 22, bot, 44, 8);
      c.shadowBlur = 0;
      if (p.berry) { c.fillStyle = '#ff4a6a'; c.beginPath(); c.arc(p.x, p.gy, 7, 0, 7); c.fill(); c.fillStyle = '#4ad86a'; c.fillRect(p.x - 1.5, p.gy - 11, 3, 5); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(p.x - 2.5, p.gy - 2.5, 2, 0, 7); c.fill(); }
    }
    c.fillStyle = '#ff5ad8'; c.fillRect(0, H - 18, W, 3); c.fillStyle = '#140e2a'; c.fillRect(0, H - 15, W, 15);
    // the hero: their portrait with flapping little wings, tilted by how fast they're falling
    const tilt = Math.max(-0.5, Math.min(1.1, S.vy / 300)), wing = Math.sin(S.t * (S.vy < 0 ? 30 : 12)) * 6;
    c.save(); c.translate(X, S.y); c.rotate(S.over ? Math.min(1.6, tilt + S.crash * 3) : tilt);
    c.fillStyle = '#fff6ff'; c.beginPath(); c.ellipse(-14, -4 + wing * 0.4, 9, 5, -0.4 - wing * 0.06, 0, 7); c.fill(); c.beginPath(); c.ellipse(14, -4 + wing * 0.4, 9, 5, 0.4 + wing * 0.06, 0, 7); c.fill();
    if (img.complete && img.naturalWidth) c.drawImage(img, -16, -16, 32, 32); else { c.fillStyle = '#ff9a40'; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill(); }
    c.restore();
    c.textAlign = 'center'; c.font = 'bold 13px sans-serif';
    for (const p of S.pops) { c.globalAlpha = Math.min(1, p.t * 2); c.fillStyle = p.col; c.fillText(p.txt, p.x, p.y); }
    c.globalAlpha = 1;
    if (S.ready > 0 || !S.started) { c.fillStyle = '#fff36b'; c.font = 'bold 26px sans-serif'; c.fillText(S.ready > 0 ? 'READY?' : 'TAP TO FLAP!', W / 2, H / 2 - 40); }
    if (S.over) { c.fillStyle = 'rgba(20,14,42,0.6)'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff36b'; c.font = 'bold 28px sans-serif'; c.fillText('BONK!', W / 2, H / 2 - 10); c.fillStyle = '#fff'; c.font = 'bold 16px sans-serif'; c.fillText(`Score ${S.score}`, W / 2, H / 2 + 16); }
    hud.textContent = `🏛️ ${S.passed}  ⭐ ${S.score}`;
  };
  let last = performance.now(), raf = 0;
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    step(dt); draw();
    if (el.isConnected) raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  let closed = false;
  function close() {
    if (closed) return; closed = true;
    cancelAnimationFrame(raf); el.remove();
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true);
    onDone(S.score);
  }
  el.__arcade = { S, flap, step: (sec) => { for (let t = 0; t < sec; t += 1 / 60) step(1 / 60); draw(); }, close };
  return el;
}

// WAVE RIDER (Ember Isle's Surf Shack, Surfer Malia): the hero rides a surfboard along the waves. Tap to hop over rocks,
// grab shells (some float in the air), and don't hop into a gull. It speeds up the longer you ride.
export function waveRider(root, face, onDone, night = false) { // (night: a starry sky, the moon, the lit lighthouse far off and glowing plankton in the spray)
  const el = document.createElement('div');
  el.className = 'modal-wrap arcade-wrap';
  el.innerHTML = `<div class="arcade surf"><div class="arc-top"><b>WAVE RIDER</b><span class="arc-hud"></span></div>
    <canvas width="${W}" height="${H}"></canvas>
    <p class="arc-tip">Tap (or Space) to hop. Jump the rocks, grab 🐚, don't hop into the gulls!</p></div>`;
  root.appendChild(el);
  const cv = el.querySelector('canvas'), c = cv.getContext('2d'), hud = el.querySelector('.arc-hud');
  const img = new Image(); img.src = face;
  const S = { y: 0, vy: 0, air: false, t: 0, dist: 0, shells: 0, score: 0, things: [], pops: [], spray: [], next: 1.4, over: false, ready: 1.2, started: false, crash: 0 };
  const X = 84, R = 13, SEA = H - 64; // the hero's column, hit radius and the calm sea line
  const sea = (x) => SEA + Math.sin(x * 0.045 + S.t * 2.2) * 6 + Math.sin(x * 0.11 - S.t * 1.3) * 3; // the wave surface under any x
  const speed = () => 110 + Math.min(110, S.dist * 0.45);
  const hop = () => { if (S.over) return; if (S.ready > 0) S.ready = 0; S.started = true; if (!S.air) { S.air = true; S.vy = -270; sfx.arc('hop'); for (let k = 0; k < 6; k++) S.spray.push({ x: X - 10 + Math.random() * 20, y: S.y + 10, vx: -40 - Math.random() * 60, vy: -60 - Math.random() * 60, t: 0.5 }); } };
  const onKey = (e) => {
    if (!['Space', 'ArrowUp', 'KeyW', 'Enter'].includes(e.code)) return;
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'keydown' && !e.repeat) hop();
  };
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); hop(); });
  const pop = (x, y, txt, col) => S.pops.push({ x, y, txt, col, t: 0.8 });
  S.y = sea(X) - R;

  const step = (dt) => {
    S.t += dt;
    if (S.ready > 0 || !S.started) { if (S.ready > 0) S.ready -= dt; S.y = sea(X) - R; return; }
    if (S.over) { S.crash += dt; S.y = Math.min(SEA + 20, S.y + 60 * dt); return; }
    const v = speed(); S.dist += v * dt / 10;
    if (S.air) { S.vy += 640 * dt; S.y += S.vy * dt; if (S.y >= sea(X) - R) { S.air = false; S.vy = 0; sfx.arc('splash'); for (let k = 0; k < 5; k++) S.spray.push({ x: X - 14 + Math.random() * 28, y: sea(X), vx: (Math.random() - 0.5) * 80, vy: -50 - Math.random() * 40, t: 0.45 }); } }
    else S.y = sea(X) - R;
    S.next -= dt;
    if (S.next <= 0) { // what comes next: a rock, a gull, a shell on the water or a shell up in the air
      const r = Math.random(), lvl = Math.min(1, S.dist / 400);
      if (r < 0.42) S.things.push({ k: 'rock', x: W + 20, w: 14 + Math.random() * 10 });
      else if (r < 0.42 + 0.18 + lvl * 0.12) S.things.push({ k: 'gull', x: W + 20, y: SEA - 70 - Math.random() * 18, f: Math.random() * 6 });
      else S.things.push({ k: 'shell', x: W + 20, up: Math.random() < 0.5 });
      if (Math.random() < 0.35) S.things.push({ k: 'shell', x: W + 60, up: true }); // a bonus shell over the next thing
      S.next = Math.max(0.55, 1.25 - lvl * 0.5) + Math.random() * 0.5;
    }
    for (const o of S.things) {
      o.x -= v * dt * (o.k === 'gull' ? 1.25 : 1);
      if (o.k === 'gull') o.f += dt * 10;
      const dx = Math.abs(o.x - X);
      if (o.k === 'rock' && dx < o.w * 0.6 + R - 4 && S.y + R > sea(o.x) - 12) die();
      if (o.k === 'gull' && dx < R + 10 && Math.abs(o.y - S.y) < R + 6) die();
      if (o.k === 'shell' && !o.got) { const sy = o.up ? SEA - 64 : sea(o.x) - 6; if (dx < R + 8 && Math.abs(sy - S.y) < R + 10) { o.got = true; S.shells++; S.score += 5; pop(o.x, sy - 12, '+5', '#ffb0d0'); sfx.arc('grab', S.shells % 8); } }
      if (o.k === 'rock' && !o.done && o.x < X - 20) { o.done = true; S.score += 3; pop(X, S.y - 18, '+3', '#9ae8ff'); }
    }
    S.things = S.things.filter((o) => o.x > -40);
    for (const p of S.pops) { p.t -= dt; p.y -= 30 * dt; }
    S.pops = S.pops.filter((p) => p.t > 0);
    for (const p of S.spray) { p.t -= dt; p.x += p.vx * dt; p.vy += 300 * dt; p.y += p.vy * dt; }
    S.spray = S.spray.filter((p) => p.t > 0);
    S.score = Math.max(S.score, 0);
  };
  function die() { if (S.over) return; S.over = true; sfx.arc('crash'); buzz('heavy'); jolt(el, true); setTimeout(close, 1800); }
  const total = () => Math.floor(S.dist / 2) + S.score;

  const draw = () => {
    const g = c.createLinearGradient(0, 0, 0, SEA); g.addColorStop(0, night ? '#0e1640' : '#5ac8f0'); g.addColorStop(1, night ? '#3a3a7a' : '#ffd8a0');
    c.fillStyle = g; c.fillRect(0, 0, W, SEA + 10);
    if (night) { // stars twinkling, a big moon, and the Starfall lighthouse sweeping its beam far away
      for (let k = 0; k < 40; k++) { const x = (k * 73) % W, y = (k * 37) % (SEA - 70); c.fillStyle = `rgba(255,250,220,${0.4 + 0.5 * Math.abs(Math.sin(S.t * 2 + k))})`; c.fillRect(x, y, k % 5 ? 1.5 : 2.5, k % 5 ? 1.5 : 2.5); }
      c.fillStyle = '#fff8dc'; c.beginPath(); c.arc(250, 44, 18, 0, 7); c.fill(); c.fillStyle = '#0e1640'; c.beginPath(); c.arc(258, 40, 15, 0, 7); c.fill();
    } else { c.fillStyle = '#fff2b0'; c.beginPath(); c.arc(250, 44, 18, 0, 7); c.fill(); } // the sun
    // the volcano far behind, with a puff of smoke, scrolling very slowly
    const vx = ((200 - S.dist * 0.3) % (W + 200) + W + 200) % (W + 200) - 100;
    c.fillStyle = '#6a5a6a'; c.beginPath(); c.moveTo(vx - 90, SEA); c.lineTo(vx - 18, SEA - 82); c.lineTo(vx + 18, SEA - 82); c.lineTo(vx + 90, SEA); c.fill();
    c.fillStyle = '#ff8a3a'; c.fillRect(vx - 16, SEA - 84, 32, 4);
    c.fillStyle = 'rgba(230,220,220,0.7)'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(vx + 6 + k * 12 + Math.sin(S.t + k) * 3, SEA - 96 - k * 12, 9 + k * 3, 0, 7); c.fill(); }
    if (night) { // the Starfall lighthouse on its islet far off to the right, sweeping its beam across the bay
      const lx = W - 44, ly = SEA - 40, a = Math.PI + Math.sin(S.t * 0.9) * 0.9;
      c.fillStyle = 'rgba(255,240,170,0.16)'; c.beginPath(); c.moveTo(lx, ly - 3); c.lineTo(lx + Math.cos(a - 0.08) * 220, ly - 3 + Math.sin(a - 0.08) * 220); c.lineTo(lx + Math.cos(a + 0.08) * 220, ly - 3 + Math.sin(a + 0.08) * 220); c.fill();
      c.fillStyle = '#26284a'; c.beginPath(); c.moveTo(lx - 30, SEA); c.quadraticCurveTo(lx, SEA - 22, lx + 30, SEA); c.fill(); // the islet
      c.fillStyle = '#e8e0e8'; c.beginPath(); c.moveTo(lx - 5, ly + 30); c.lineTo(lx - 3.5, ly); c.lineTo(lx + 3.5, ly); c.lineTo(lx + 5, ly + 30); c.fill();
      c.fillStyle = '#e84a4a'; c.fillRect(lx - 4.5, ly + 8, 9, 5); c.fillRect(lx - 5, ly + 19, 10, 5);
      c.fillStyle = '#fff4a0'; c.beginPath(); c.arc(lx, ly - 3, 4.5, 0, 7); c.fill(); c.fillStyle = 'rgba(255,244,160,0.3)'; c.beginPath(); c.arc(lx, ly - 3, 10, 0, 7); c.fill();
      const cg = c.createRadialGradient(vx, SEA - 84, 2, vx, SEA - 84, 20); cg.addColorStop(0, 'rgba(255,150,60,0.55)'); cg.addColorStop(1, 'rgba(255,120,40,0)');
      c.fillStyle = cg; c.beginPath(); c.ellipse(vx, SEA - 84, 20, 9, 0, 0, 7); c.fill(); // the crater glows after dark
    }
    // two layers of sea: a darker one behind, then the wave the hero rides
    c.fillStyle = night ? '#1a3a7a' : '#2a9ad0'; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 8) c.lineTo(x, SEA - 8 + Math.sin(x * 0.03 + S.t * 1.4) * 4); c.lineTo(W, H); c.fill();
    c.fillStyle = night ? '#2a5aa8' : '#3ac0e8'; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 6) c.lineTo(x, sea(x)); c.lineTo(W, H); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= W; x += 6) (x ? c.lineTo : c.moveTo).call(c, x, sea(x)); c.stroke();
    for (const o of S.things) {
      if (o.k === 'rock') { const sy = sea(o.x); c.fillStyle = '#4a4246'; c.beginPath(); c.moveTo(o.x - o.w, sy + 6); c.lineTo(o.x - o.w * 0.5, sy - 18); c.lineTo(o.x + o.w * 0.3, sy - 22); c.lineTo(o.x + o.w, sy + 6); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(o.x - o.w, sy + 2, o.w * 2, 3); }
      if (o.k === 'gull') { const fl = Math.sin(o.f) * 6; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(o.x - 12, o.y - fl); c.quadraticCurveTo(o.x - 5, o.y - 6, o.x, o.y); c.quadraticCurveTo(o.x + 5, o.y - 6, o.x + 12, o.y - fl); c.stroke(); c.fillStyle = '#ffb030'; c.fillRect(o.x - 6, o.y - 1, 4, 2); }
      if (o.k === 'shell' && !o.got) { const sy = o.up ? SEA - 64 : sea(o.x) - 6; c.fillStyle = '#ffb0c8'; c.beginPath(); c.moveTo(o.x - 7, sy + 4); c.quadraticCurveTo(o.x, sy - 10, o.x + 7, sy + 4); c.closePath(); c.fill(); c.strokeStyle = '#e07a9a'; c.lineWidth = 1; for (const k of [-3, 0, 3]) { c.beginPath(); c.moveTo(o.x, sy + 4); c.lineTo(o.x + k, sy - 4); c.stroke(); } }
    }
    if (night) for (let k = 0; k < 14; k++) { const x = ((k * 53 - S.dist * 2) % W + W) % W, y = sea(x) + 8 + (k * 13) % 30; c.fillStyle = `rgba(120,255,230,${0.3 + 0.4 * Math.abs(Math.sin(S.t * 3 + k))})`; c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill(); } // glowing plankton
    for (const p of S.spray) { c.globalAlpha = Math.min(1, p.t * 3); c.fillStyle = night ? '#8affe8' : '#fff'; c.beginPath(); c.arc(p.x, p.y, 2.5, 0, 7); c.fill(); }
    c.globalAlpha = 1;
    // the hero on an orange board with a white stripe, tilting with the wave (or tumbling after a crash)
    const tilt = S.air ? Math.max(-0.4, Math.min(0.4, S.vy / 600)) : (sea(X + 6) - sea(X - 6)) / 14;
    c.save(); c.translate(X, S.y); c.rotate(S.over ? S.crash * 6 : tilt);
    c.fillStyle = '#ff7a3a'; c.beginPath(); c.ellipse(0, R + 2, 22, 4.5, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.fillRect(-18, R + 1, 36, 2);
    if (img.complete && img.naturalWidth) c.drawImage(img, -16, -18, 32, 32); else { c.fillStyle = '#ff9a40'; c.beginPath(); c.arc(0, -2, R, 0, 7); c.fill(); }
    c.restore();
    c.textAlign = 'center'; c.font = 'bold 13px sans-serif';
    for (const p of S.pops) { c.globalAlpha = Math.min(1, p.t * 2); c.fillStyle = p.col; c.fillText(p.txt, p.x, p.y); }
    c.globalAlpha = 1;
    if (S.ready > 0 || !S.started) { c.fillStyle = '#fff36b'; c.strokeStyle = '#2a5a8a'; c.lineWidth = 4; c.font = 'bold 26px sans-serif'; const t = S.ready > 0 ? 'READY?' : 'TAP TO HOP!'; c.strokeText(t, W / 2, H / 2 - 50); c.fillText(t, W / 2, H / 2 - 50); }
    if (S.over) { c.fillStyle = 'rgba(20,40,70,0.55)'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff36b'; c.font = 'bold 28px sans-serif'; c.fillText('WIPEOUT!', W / 2, H / 2 - 10); c.fillStyle = '#fff'; c.font = 'bold 16px sans-serif'; c.fillText(`Score ${total()}`, W / 2, H / 2 + 16); }
    hud.textContent = `🌊 ${Math.floor(S.dist)} m  🐚 ${S.shells}  ⭐ ${total()}`;
  };
  let last = performance.now(), raf = 0;
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    step(dt); draw();
    if (el.isConnected) raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  let closed = false;
  function close() {
    if (closed) return; closed = true;
    cancelAnimationFrame(raf); el.remove();
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true);
    onDone(total());
  }
  el.__arcade = { S, flap: hop, step: (sec) => { for (let t = 0; t < sec; t += 1 / 60) step(1 / 60); draw(); }, close };
  return el;
}

// REEF DIVE (Dive Coach Nami, in the Sunken Wreck): tap to kick upward, the hero sinks gently between kicks. Swim through the wreck's
// water collecting gold coins (+5) and rare pearls (+15), dodge the bobbing jellyfish (they sting away 4 seconds of air) and grab
// air bubbles (+3 s). The dive ends when the air runs out.
export function reefDive(root, face, onDone) {
  const el = document.createElement('div');
  el.className = 'modal-wrap arcade-wrap';
  el.innerHTML = `<div class="arcade dive"><div class="arc-top"><b>REEF DIVE</b><span class="arc-hud"></span></div>
    <canvas width="${W}" height="${H}"></canvas>
    <p class="arc-tip">Tap (or Space) to kick up. Grab 🪙 and pearls, catch air bubbles, don't touch the jellies!</p></div>`;
  root.appendChild(el);
  const cv = el.querySelector('canvas'), c = cv.getContext('2d'), hud = el.querySelector('.arc-hud');
  const img = new Image(); img.src = face;
  const S = { y: H / 2, vy: 0, t: 0, dist: 0, air: 20, coins: 0, pearls: 0, score: 0, things: [], pops: [], bub: [], next: 1, over: false, ready: 1.2, started: false, hurt: 0 };
  const X = 76, R = 12, TOP = 18, FLOOR = H - 26;
  const speed = () => 80 + Math.min(80, S.dist * 0.25);
  const kick = () => { if (S.over) return; if (S.ready > 0) S.ready = 0; S.started = true; S.vy = -150; sfx.arc('kick'); for (let k = 0; k < 3; k++) S.bub.push({ x: X - 10, y: S.y + 6, vx: -30 - Math.random() * 30, vy: -20 - Math.random() * 30, r: 2 + Math.random() * 2, t: 0.9 }); };
  const onKey = (e) => {
    if (!['Space', 'ArrowUp', 'KeyW', 'Enter'].includes(e.code)) return;
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'keydown' && !e.repeat) kick();
  };
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); kick(); });
  const pop = (x, y, txt, col) => S.pops.push({ x, y, txt, col, t: 0.8 });

  const step = (dt) => {
    S.t += dt;
    for (const b of S.bub) { b.t -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vy -= 20 * dt; }
    S.bub = S.bub.filter((b) => b.t > 0);
    if (S.ready > 0 || !S.started) { if (S.ready > 0) S.ready -= dt; S.y = H / 2 + Math.sin(S.t * 2) * 4; return; }
    if (S.over) { S.y = Math.max(TOP, S.y - 40 * dt); return; } // out of air: float up to the surface
    S.vy = Math.min(70, S.vy + 260 * dt); S.y = Math.max(TOP + R, Math.min(FLOOR - R, S.y + S.vy * dt));
    S.hurt = Math.max(0, S.hurt - dt);
    const v = speed(); S.dist += v * dt / 10;
    S.air -= dt; if (S.air <= 0) { S.air = 0; S.over = true; sfx.arc('crash'); buzz('heavy'); jolt(el, true); setTimeout(close, 1800); return; }
    S.next -= dt;
    if (S.next <= 0) {
      const r = Math.random(), lvl = Math.min(1, S.dist / 300), y = TOP + 24 + Math.random() * (FLOOR - TOP - 48);
      if (r < 0.3 + lvl * 0.15) S.things.push({ k: 'jelly', x: W + 20, y0: y, y, ph: Math.random() * 6, amp: 14 + Math.random() * 18 });
      else if (r < 0.72) for (let k = 0; k < 3; k++) S.things.push({ k: 'coin', x: W + 20 + k * 22, y: y + Math.sin(k) * 10 }); // a little row of coins
      else if (r < 0.86) S.things.push({ k: 'air', x: W + 20, y });
      else S.things.push({ k: 'pearl', x: W + 20, y });
      S.next = Math.max(0.45, 1.0 - lvl * 0.35) + Math.random() * 0.4;
    }
    for (const o of S.things) {
      o.x -= v * dt;
      if (o.k === 'jelly') { o.ph += dt * 2.2; o.y = o.y0 + Math.sin(o.ph) * o.amp; }
      if (o.got) continue;
      const near = Math.hypot(o.x - X, o.y - S.y);
      if (o.k === 'jelly' && near < R + 11 && !S.hurt) { o.got = true; S.hurt = 1; S.air = Math.max(0.1, S.air - 4); pop(X, S.y - 16, '-4s', '#ff8ab0'); sfx.arc('zap'); buzz('medium'); jolt(el); }
      if (o.k === 'coin' && near < R + 8) { o.got = true; S.coins++; S.score += 5; pop(o.x, o.y - 10, '+5', '#ffd84d'); sfx.arc('grab', S.coins % 8); }
      if (o.k === 'pearl' && near < R + 9) { o.got = true; S.pearls++; S.score += 15; pop(o.x, o.y - 10, '+15', '#fff4f8'); sfx.arc('pearl'); buzz('light'); }
      if (o.k === 'air' && near < R + 12) { o.got = true; S.air = Math.min(20, S.air + 3); pop(o.x, o.y - 10, '+3s', '#bff4ff'); sfx.arc('air'); }
    }
    S.things = S.things.filter((o) => o.x > -30);
    for (const p of S.pops) { p.t -= dt; p.y -= 30 * dt; }
    S.pops = S.pops.filter((p) => p.t > 0);
  };
  const total = () => Math.floor(S.dist / 3) + S.score;

  const draw = () => {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#4ac8e8'); g.addColorStop(1, '#0e4a7a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(200,250,255,0.08)'; for (let k = 0; k < 4; k++) { const x = ((k * 97 - S.dist * 0.6) % (W + 80) + W + 80) % (W + 80) - 40; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 30, 0); c.lineTo(x - 20, H); c.lineTo(x - 50, H); c.fill(); } // light shafts
    // the sea floor: sand, coral heads and swaying weed scrolling by
    c.fillStyle = '#c8b88a'; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 8) c.lineTo(x, FLOOR + 4 + Math.sin((x + S.dist * 3) * 0.05) * 3); c.lineTo(W, H); c.fill();
    for (let k = 0; k < 6; k++) { const x = ((k * 71 - S.dist * 3) % (W + 60) + W + 60) % (W + 60) - 30; c.fillStyle = ['#ff7a9a', '#ffa05a', '#b07aff'][k % 3]; c.beginPath(); c.arc(x, FLOOR + 2, 9 + (k % 2) * 4, Math.PI, 0); c.fill(); c.strokeStyle = '#2aa080'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 18, FLOOR + 4); c.quadraticCurveTo(x + 18 + Math.sin(S.t * 2 + k) * 6, FLOOR - 14, x + 16, FLOOR - 28); c.stroke(); }
    for (const o of S.things) {
      if (o.got) continue;
      if (o.k === 'coin') { c.fillStyle = '#ffd84d'; c.beginPath(); c.ellipse(o.x, o.y, 6 * Math.abs(Math.cos(S.t * 4 + o.x * 0.05)) + 1, 6, 0, 0, 7); c.fill(); c.strokeStyle = '#c08a1a'; c.lineWidth = 1.5; c.stroke(); }
      if (o.k === 'pearl') { c.fillStyle = '#e8a0c0'; c.beginPath(); c.arc(o.x, o.y + 3, 9, 0, Math.PI); c.fill(); c.fillStyle = '#fff8fc'; c.beginPath(); c.arc(o.x, o.y, 6, 0, 7); c.fill(); }
      if (o.k === 'air') { c.strokeStyle = 'rgba(230,250,255,0.9)'; c.lineWidth = 2; c.beginPath(); c.arc(o.x, o.y, 9 + Math.sin(S.t * 5) * 1.5, 0, 7); c.stroke(); c.fillStyle = 'rgba(230,250,255,0.25)'; c.fill(); }
      if (o.k === 'jelly') { c.fillStyle = 'rgba(255,140,200,0.85)'; c.beginPath(); c.arc(o.x, o.y, 11, Math.PI, 0); c.fill(); c.strokeStyle = 'rgba(255,170,220,0.9)'; c.lineWidth = 2; for (const k of [-6, -2, 2, 6]) { c.beginPath(); c.moveTo(o.x + k, o.y); c.quadraticCurveTo(o.x + k + Math.sin(S.t * 6 + k) * 3, o.y + 9, o.x + k, o.y + 17); c.stroke(); } }
    }
    for (const b of S.bub) { c.globalAlpha = Math.min(1, b.t * 2); c.strokeStyle = '#e8fbff'; c.lineWidth = 1; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.stroke(); }
    c.globalAlpha = S.hurt > 0 && Math.floor(S.hurt * 10) % 2 ? 0.4 : 1;
    // the hero with a little snorkel mask, tilting with its kick
    c.save(); c.translate(X, S.y); c.rotate(Math.max(-0.4, Math.min(0.4, S.vy / 300)));
    if (img.complete && img.naturalWidth) c.drawImage(img, -16, -16, 32, 32); else { c.fillStyle = '#ff9a40'; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill(); }
    c.fillStyle = 'rgba(160,230,255,0.55)'; c.strokeStyle = '#3ac0e8'; c.lineWidth = 2; c.beginPath(); c.ellipse(4, -3, 9, 5, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#ffd84d'; c.fillRect(-12, -18, 3, 12);
    c.restore(); c.globalAlpha = 1;
    // the air bar
    c.fillStyle = 'rgba(0,30,60,0.5)'; c.fillRect(10, 8, 104, 8); c.fillStyle = S.air < 5 ? '#ff6a6a' : '#bff4ff'; c.fillRect(12, 10, 100 * S.air / 20, 4);
    c.textAlign = 'center'; c.font = 'bold 13px sans-serif';
    for (const p of S.pops) { c.globalAlpha = Math.min(1, p.t * 2); c.fillStyle = p.col; c.fillText(p.txt, p.x, p.y); }
    c.globalAlpha = 1;
    if (S.ready > 0 || !S.started) { c.fillStyle = '#fff36b'; c.strokeStyle = '#0e4a7a'; c.lineWidth = 4; c.font = 'bold 26px sans-serif'; const t = S.ready > 0 ? 'READY?' : 'TAP TO KICK!'; c.strokeText(t, W / 2, H / 2 - 50); c.fillText(t, W / 2, H / 2 - 50); }
    if (S.over) { c.fillStyle = 'rgba(10,40,70,0.55)'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff36b'; c.font = 'bold 28px sans-serif'; c.fillText('OUT OF AIR!', W / 2, H / 2 - 10); c.fillStyle = '#fff'; c.font = 'bold 16px sans-serif'; c.fillText(`Score ${total()}`, W / 2, H / 2 + 16); }
    hud.textContent = `🫧 ${Math.ceil(S.air)}s  🪙 ${S.coins}  ⭐ ${total()}`;
  };
  let last = performance.now(), raf = 0;
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    step(dt); draw();
    if (el.isConnected) raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  let closed = false;
  function close() {
    if (closed) return; closed = true;
    cancelAnimationFrame(raf); el.remove();
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true);
    onDone(total());
  }
  el.__arcade = { S, flap: kick, step: (sec) => { for (let t = 0; t < sec; t += 1 / 60) step(1 / 60); draw(); }, close };
  return el;
}

// DUNE SLED (Dune Kid Kai at the Dune Camp, after the Sandstorm Cup): the hero rides a tea tray over endless dunes until sunset.
// Hold (tap and hold, or Space) to press down: heavy on the way down a dune you pick up speed, but heavy on a crest you stay
// glued to the sand. Let go at a crest and a fast tray flies; land along a downslope for a SWOOSH (a boost), land into an upslope
// for a THUD. Grab dates (+5) and sun gems (+15, up high), and don't ride into a cactus (it halves your speed). 40 seconds of sun.
export function duneSled(root, face, onDone) {
  const el = document.createElement('div');
  el.className = 'modal-wrap arcade-wrap';
  el.innerHTML = `<div class="arcade sled"><div class="arc-top"><b>DUNE SLED</b><span class="arc-hud"></span></div>
    <canvas width="${W}" height="${H}"></canvas>
    <p class="arc-tip">Hold to dig in going downhill, let go at the top to fly! Land on a downslope. 🌴 dates, ☀️ gems, no cacti!</p></div>`;
  root.appendChild(el);
  const cv = el.querySelector('canvas'), c = cv.getContext('2d'), hud = el.querySelector('.arc-hud');
  const img = new Image(); img.src = face;
  const SUN = 40, X = 92, R = 12; // seconds of daylight; the hero's screen column and size
  const S = { x: 0, y: 0, v: 120, vy: 0, air: false, hold: false, t: 0, left: SUN, dates: 0, gems: 0, swoosh: 0, combo: 0, things: [], pops: [], dust: [], over: false, ready: 1.2, started: false, end: 0, camY: 0, next: 260, best: 0 };
  // the dunes: two long swells and a ripple, always rideable (the first stretch is a gentle run-in)
  const ty = (x) => { const k = Math.min(1, x / 500); return 168 + k * (40 * Math.sin(x * 0.0105) + 16 * Math.sin(x * 0.027 + 1.3)) + 5 * Math.sin(x * 0.06); };
  const slope = (x) => (ty(x + 1) - ty(x - 1)) / 2, curve = (x) => ty(x + 2) - 2 * ty(x) + ty(x - 2);
  const press = (on) => { if (S.over) return; if (on && S.ready > 0) S.ready = 0; if (on) S.started = true; S.hold = on && S.started; };
  const onKey = (e) => {
    if (!['Space', 'ArrowDown', 'KeyS', 'Enter'].includes(e.code)) return;
    e.preventDefault(); e.stopPropagation();
    if (!e.repeat) press(e.type === 'keydown');
  };
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture?.(e.pointerId); press(true); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(ev, () => press(false));
  const pop = (x, y, txt, col) => S.pops.push({ x, y, txt, col, t: 0.9 });
  S.y = ty(0);

  const step = (dt) => {
    S.t += dt;
    if (S.ready > 0 || !S.started) { if (S.ready > 0) S.ready -= dt; return; }
    if (S.over) { S.end += dt; S.v = Math.max(0, S.v - 160 * dt); S.x += S.v * dt; if (!S.air) S.y = ty(S.x); else { S.vy += 520 * dt; S.y = Math.min(ty(S.x), S.y + S.vy * dt); if (S.y >= ty(S.x)) S.air = false; } return; }
    S.left -= dt; if (S.left <= 0) { S.left = 0; S.over = true; sfx.arc('crash'); setTimeout(close, 2200); return; }
    const G = S.hold ? 1500 : 560;
    if (!S.air) {
      const s = slope(S.x), cs = 1 / Math.sqrt(1 + s * s);
      S.v += G * s * cs * dt * 0.55 - (S.hold && s < 0 ? 30 : 6) * dt; // downhill (s > 0) speeds you up, pressing harder; pressing uphill only drags
      S.v = Math.max(70, Math.min(430, S.v));
      S.x += S.v * cs * dt; S.y = ty(S.x); S.vy = S.v * slope(S.x) * cs;
      if (!S.hold && curve(S.x) / 4 * S.v * S.v > G * 0.9 && slope(S.x) < 0.25) { S.air = true; sfx.arc('hop'); } // over a crest too fast to follow the sand: airborne
      if (S.v > 180 && Math.random() < dt * 30) S.dust.push({ x: S.x - 8, y: S.y, vx: -S.v * 0.3 - Math.random() * 40, vy: -30 - Math.random() * 50, t: 0.5 });
    } else {
      S.vy += G * dt; S.x += S.v * dt; S.y += S.vy * dt; S.v = Math.max(70, S.v - 4 * dt);
      if (S.y >= ty(S.x)) { // touchdown: how well does the tray meet the sand?
        const a = Math.atan2(S.vy, S.v), b = Math.atan(slope(S.x)), off = Math.abs(a - b);
        S.air = false; S.y = ty(S.x);
        if (off < 0.32 && slope(S.x) > 0.05) { S.swoosh++; S.combo++; S.v = Math.min(430, S.v + 45); pop(S.x, S.y - 26, S.combo > 1 ? `SWOOSH ×${S.combo}` : 'SWOOSH!', '#fff36b'); sfx.arc('grab', Math.min(7, S.combo)); }
        else if (off > 0.7) { S.combo = 0; S.v *= 0.6; pop(S.x, S.y - 26, 'THUD', '#ffb0a0'); sfx.arc('splash'); buzz('light'); jolt(el); }
        else S.combo = 0;
        for (let k = 0; k < 6; k++) S.dust.push({ x: S.x + (Math.random() - 0.5) * 20, y: S.y, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 60, t: 0.5 });
      }
    }
    S.best = Math.max(S.best, ty(S.x) - S.y);
    while (S.next < S.x + W + 60) { // lay out the dunes ahead: dates over the crests, gems high up, cacti in the troughs
      const x = S.next, r = Math.random();
      if (r < 0.5) for (let k = 0; k < 3; k++) S.things.push({ k: 'date', x: x + k * 22, y: ty(x + k * 22) - 26 - Math.sin(k / 2 * Math.PI) * 18 - Math.random() * 40 });
      else if (r < 0.66) S.things.push({ k: 'gem', x, y: ty(x) - 55 - Math.random() * 40 });
      else if (S.x > 300) S.things.push({ k: 'cactus', x, y: ty(x) });
      S.next += 120 + Math.random() * 110;
    }
    for (const o of S.things) {
      if (o.got) continue;
      if (o.k === 'cactus') { if (!S.air && Math.abs(o.x - S.x) < 10) { o.got = true; S.combo = 0; S.v = Math.max(70, S.v * 0.5); pop(S.x, S.y - 26, 'OUCH!', '#9af07a'); sfx.arc('crash'); buzz('medium'); jolt(el, true); } continue; }
      if (Math.hypot(o.x - S.x, o.y - (S.y - R)) < R + 10) { o.got = true; if (o.k === 'date') { S.dates++; pop(o.x, o.y - 10, '+5', '#ffd0a0'); sfx.arc('grab', S.dates % 8); } else { S.gems++; pop(o.x, o.y - 10, '+15', '#fff36b'); sfx.arc('grab', 7); buzz('light'); } }
    }
    S.things = S.things.filter((o) => o.x > S.x - X - 40);
    for (const p of S.pops) { p.t -= dt; p.y -= 30 * dt; }
    S.pops = S.pops.filter((p) => p.t > 0);
    for (const p of S.dust) { p.t -= dt; p.x += p.vx * dt; p.vy += 200 * dt; p.y += p.vy * dt; }
    S.dust = S.dust.filter((p) => p.t > 0);
  };
  const total = () => Math.floor(S.x / 40) + S.dates * 5 + S.gems * 15 + S.swoosh * 5;

  const draw = () => {
    const cx = S.x - X, want = Math.min(0, S.y - 70); S.camY += (want - S.camY) * 0.15; const cy = S.camY; // the view rises to follow a big jump
    const k = 1 - S.left / SUN; // the sun goes down as the run goes on
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, k < 0.7 ? '#5ab8e8' : '#4a5aa8'); g.addColorStop(0.55, k < 0.7 ? '#ffd8a0' : '#ff9a6a'); g.addColorStop(1, '#ffb070');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const sx = 40 + k * 220, sy = 40 + k * k * 110 - cy * 0.1;
    c.fillStyle = k < 0.7 ? '#fff2b0' : '#ffb040'; c.beginPath(); c.arc(sx, sy, 16, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,240,180,0.25)'; c.beginPath(); c.arc(sx, sy, 26, 0, 7); c.fill();
    // far mesas and a back row of dunes, scrolling slowly
    c.fillStyle = '#c8784a'; for (let i = 0; i < 4; i++) { const mx = ((i * 140 - cx * 0.12) % 560 + 560) % 560 - 100, my = 150 - cy * 0.3; c.fillRect(mx, my - 30 - (i % 2) * 14, 60 + (i % 3) * 12, 60); c.fillRect(mx - 6, my - 34 - (i % 2) * 14, 72 + (i % 3) * 12, 6); }
    c.fillStyle = '#e8b87a'; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 8) c.lineTo(x, 172 - cy * 0.5 + 14 * Math.sin((x + cx * 0.5) * 0.017)); c.lineTo(W, H); c.fill();
    // the dune the tray rides: a warm sand gradient with wind ripples
    c.fillStyle = '#f4d090'; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 4) c.lineTo(x, ty(x + cx) - cy); c.lineTo(W, H); c.fill();
    c.strokeStyle = '#d8a860'; c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= W; x += 4) (x ? c.lineTo : c.moveTo).call(c, x, ty(x + cx) - cy); c.stroke();
    c.strokeStyle = 'rgba(200,150,80,0.45)'; c.lineWidth = 1; for (let r = 1; r <= 3; r++) { c.beginPath(); for (let x = 0; x <= W; x += 6) { const y = ty(x + cx) - cy + r * 14 + Math.sin((x + cx) * 0.08 + r) * 2; (x ? c.lineTo : c.moveTo).call(c, x, y); } c.stroke(); }
    for (const o of S.things) {
      if (o.got && o.k !== 'cactus') continue;
      const x = o.x - cx, y = o.y - cy; if (x < -30 || x > W + 30) continue;
      if (o.k === 'date') { c.fillStyle = '#8a4a22'; c.beginPath(); c.ellipse(x, y, 4, 6, 0.3, 0, 7); c.fill(); c.fillStyle = 'rgba(255,220,180,0.7)'; c.fillRect(x - 1, y - 4, 2, 3); }
      if (o.k === 'gem') { const b = 1 + Math.sin(S.t * 6) * 0.15; c.fillStyle = 'rgba(255,240,120,0.35)'; c.beginPath(); c.arc(x, y, 12 * b, 0, 7); c.fill(); c.fillStyle = '#ffd84d'; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 3.5 : 8 * b, a = i / 10 * Math.PI * 2 - Math.PI / 2; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.fill(); }
      if (o.k === 'cactus') { c.fillStyle = o.got ? '#7aa858' : '#3a8a4a'; c.fillRect(x - 3, y - 22, 6, 24); c.fillRect(x - 9, y - 14, 4, 8); c.fillRect(x - 9, y - 10, 7, 3); c.fillRect(x + 5, y - 18, 4, 9); c.fillRect(x + 2, y - 12, 7, 3); c.fillStyle = '#ff7aa0'; c.fillRect(x - 2, y - 25, 4, 3); }
    }
    for (const p of S.dust) { c.globalAlpha = Math.min(1, p.t * 2); c.fillStyle = '#f8e0b0'; c.beginPath(); c.arc(p.x - cx, p.y - cy, 2.5, 0, 7); c.fill(); }
    c.globalAlpha = 1;
    // the hero on a silver tea tray, tilted with the sand (or with the flight)
    const tilt = S.air ? Math.atan2(S.vy, S.v) * 0.8 : Math.atan(slope(S.x));
    c.save(); c.translate(X, S.y - cy); c.rotate(tilt);
    c.fillStyle = '#c8ccd8'; c.beginPath(); c.ellipse(0, -2, 18, 4, 0, 0, 7); c.fill(); c.strokeStyle = '#8a90a8'; c.lineWidth = 1.5; c.stroke();
    if (img.complete && img.naturalWidth) c.drawImage(img, -15, -32, 30, 30); else { c.fillStyle = '#ff9a40'; c.beginPath(); c.arc(0, -16, R, 0, 7); c.fill(); }
    c.restore();
    if (S.hold && !S.over) { c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.fillText('▼', X, S.y - cy - 38); }
    c.textAlign = 'center'; c.font = 'bold 13px sans-serif';
    for (const p of S.pops) { c.globalAlpha = Math.min(1, p.t * 2); c.fillStyle = p.col; c.strokeStyle = 'rgba(90,50,20,0.8)'; c.lineWidth = 3; c.strokeText(p.txt, p.x - cx, p.y - cy); c.fillText(p.txt, p.x - cx, p.y - cy); }
    c.globalAlpha = 1;
    // the sun timer along the top
    c.fillStyle = 'rgba(90,50,20,0.35)'; c.fillRect(10, 8, W - 20, 6); c.fillStyle = S.left < 8 ? '#ff7a3a' : '#ffd84d'; c.fillRect(10, 8, (W - 20) * S.left / SUN, 6);
    if (S.ready > 0 || !S.started) { c.fillStyle = '#fff36b'; c.strokeStyle = '#8a4a1a'; c.lineWidth = 4; c.font = 'bold 24px sans-serif'; const t = S.ready > 0 ? 'READY?' : 'HOLD TO SLED!'; c.strokeText(t, W / 2, H / 2 - 50); c.fillText(t, W / 2, H / 2 - 50); }
    if (S.over && S.end > 0.3) { c.fillStyle = 'rgba(70,30,40,0.55)'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff36b'; c.font = 'bold 28px sans-serif'; c.fillText('SUNSET!', W / 2, H / 2 - 10); c.fillStyle = '#fff'; c.font = 'bold 16px sans-serif'; c.fillText(`Score ${total()}`, W / 2, H / 2 + 16); }
    hud.textContent = `🏜️ ${Math.floor(S.x / 10)} m  🌴 ${S.dates}  ☀️ ${S.gems}  ⭐ ${total()}`;
  };
  let last = performance.now(), raf = 0;
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    step(dt); draw();
    if (el.isConnected) raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  let closed = false;
  function close() {
    if (closed) return; closed = true;
    cancelAnimationFrame(raf); el.remove();
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true);
    onDone(total());
  }
  el.__arcade = { S, press, slope: (x) => slope(x), step: (sec) => { for (let t = 0; t < sec; t += 1 / 60) step(1 / 60); draw(); }, close };
  return el;
}

// R837: CARAVAN RUN (Caravan Master Hakim in Sunwell Oasis, once his caravan road is open): the hero leads three Humpdrops along
// three lanes of desert. Tap above or below the leader (or ↑/↓) to change lanes; the Humpdrops follow in your tracks. Dates +5,
// golden scarabs +15, water skins top up the water (+4 s). A cactus or a sand twister scares off a Humpdrop; lose all three, or
// run out of water, and the run is over. Halfway through a sandstorm blows in and you can only see what's close. Reach the next
// camp, 1000 m off, for +60 (and every Humpdrop still with you is +20).
export function caravanRun(root, face, onDone) {
  const el = document.createElement('div');
  el.className = 'modal-wrap arcade-wrap';
  el.innerHTML = `<div class="arcade caravan"><div class="arc-top"><b>CARAVAN RUN</b><span class="arc-hud"></span></div>
    <canvas width="${W}" height="${H}"></canvas>
    <p class="arc-tip">Tap above or below to change lanes! 🌴 dates, 🪲 scarabs, 💧 water. Keep your Humpdrops away from cacti!</p></div>`;
  root.appendChild(el);
  const cv = el.querySelector('canvas'), c = cv.getContext('2d'), hud = el.querySelector('.arc-hud');
  const img = new Image(); img.src = face;
  const LANES = [118, 166, 214], X = 128, WATER = 40, CAMP = 10000;
  const S = { x: 0, v: 110, lane: 1, y: LANES[1], t: 0, water: WATER, humps: 3, lost: [], dates: 0, scarabs: 0, skins: 0, things: [], pops: [], trail: [], over: false, ready: 1.2, started: false, end: 0, next: 220, storm: 16 + Math.random() * 8, stormT: 0, hurt: 0 };
  const lane = (d) => { if (S.over) return; if (S.ready > 0) S.ready = 0; S.started = true; const n = Math.max(0, Math.min(2, S.lane + d)); if (n !== S.lane) { S.lane = n; sfx.arc('hop'); } };
  const onKey = (e) => {
    const d = { ArrowUp: -1, KeyW: -1, ArrowDown: 1, KeyS: 1 }[e.code];
    if (d == null && e.code !== 'Space') return;
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'keydown' && !e.repeat) d == null ? lane(0) : lane(d);
  };
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(), y = (e.clientY - r.top) / r.height * H; lane(y < S.y - 14 ? -1 : y > S.y + 14 ? 1 : 0); });
  const pop = (x, y, txt, col) => S.pops.push({ x, y, txt, col, t: 0.9 });
  const scare = () => { // a Humpdrop bolts off the back of the line
    S.humps--; S.hurt = 0.6; sfx.arc('crash'); buzz('medium'); jolt(el, true);
    S.lost.push({ x: X - 30 * (S.humps + 1), y: S.y, vy: -60, t: 1.2 });
    pop(X, S.y - 30, S.humps ? 'MROOO!' : 'NO HUMPDROPS!', '#ffb0a0');
    if (S.humps <= 0) end();
  };
  const end = () => { if (S.over) return; S.over = true; setTimeout(close, 2400); };

  const step = (dt) => {
    S.t += dt;
    if (S.ready > 0 || !S.started) { if (S.ready > 0) S.ready -= dt; return; }
    S.y += (LANES[S.lane] - S.y) * Math.min(1, dt * 12);
    S.trail.unshift(S.y); if (S.trail.length > 90) S.trail.pop();
    if (S.over) { S.end += dt; S.v = Math.max(0, S.v - 140 * dt); S.x += S.v * dt; return; }
    S.water -= dt; if (S.water <= 0) { S.water = 0; pop(X, S.y - 30, 'OUT OF WATER!', '#9ad8ff'); sfx.arc('crash'); end(); return; }
    S.hurt = Math.max(0, S.hurt - dt);
    S.v = Math.min(250, 110 + S.t * 3.2); S.x += S.v * dt;
    if (S.x >= CAMP) { S.arrived = true; pop(X, S.y - 30, 'CAMP! +60', '#fff36b'); sfx.arc('grab', 7); buzz('light'); end(); return; }
    if (S.storm > 0) { S.storm -= dt; if (S.storm <= 0) { S.stormT = 7; pop(W / 2, 70, 'SANDSTORM!', '#ffd08a'); sfx.whoosh?.(0.7); } } else if (S.stormT > 0) S.stormT -= dt;
    while (S.next < Math.min(S.x + W, CAMP - 300)) { // a row of trouble and treats: never all three lanes blocked
      const x = S.next, cact = Math.floor(Math.random() * 3), r = Math.random();
      if (S.x > 150) S.things.push({ k: 'cactus', x, l: cact });
      const free = [0, 1, 2].filter((l) => l !== cact);
      const pick = free[Math.floor(Math.random() * free.length)];
      if (r < 0.45) for (let k = 0; k < 3; k++) S.things.push({ k: 'date', x: x + 26 + k * 20, l: pick });
      else if (r < 0.57) S.things.push({ k: 'skin', x: x + 40, l: pick });
      else if (r < 0.69) S.things.push({ k: 'scarab', x: x + 40, l: pick });
      else if (r < 0.88 && S.x > 600) S.things.push({ k: 'twister', x: x + 90, l: pick, y: LANES[pick], dir: Math.random() < 0.5 ? -1 : 1 });
      S.next += 150 + Math.random() * 90 - Math.min(50, S.t * 1.2);
    }
    for (const o of S.things) {
      if (o.got) continue;
      if (o.k === 'twister') { // it wanders between lanes as it comes
        o.y += o.dir * 34 * dt; if (o.y < LANES[0] || o.y > LANES[2]) { o.dir *= -1; o.y = Math.max(LANES[0], Math.min(LANES[2], o.y)); }
      }
      const sx = o.x - S.x + X, oy = o.k === 'twister' ? o.y : LANES[o.l];
      if (Math.abs(sx - X) > 14 || Math.abs(oy - S.y) > 18) continue;
      o.got = true;
      if (o.k === 'cactus' || o.k === 'twister') { if (S.hurt > 0) { o.got = false; continue; } scare(); }
      else if (o.k === 'date') { S.dates++; pop(X, S.y - 24, '+5', '#ffd0a0'); sfx.arc('grab', S.dates % 8); }
      else if (o.k === 'scarab') { S.scarabs++; pop(X, S.y - 24, '+15', '#fff36b'); sfx.arc('grab', 7); buzz('light'); }
      else if (o.k === 'skin') { S.skins++; S.water = Math.min(WATER, S.water + 4); pop(X, S.y - 24, '+4 s 💧', '#9ad8ff'); sfx.arc('splash'); }
    }
    S.things = S.things.filter((o) => o.x - S.x + X > -30);
    for (const p of S.pops) { p.t -= dt; p.y -= 30 * dt; }
    S.pops = S.pops.filter((p) => p.t > 0);
    for (const L of S.lost) { L.t -= dt; L.x -= 120 * dt; L.vy += 160 * dt; L.y += L.vy * dt * 0.4; }
    S.lost = S.lost.filter((L) => L.t > 0);
  };
  const total = () => Math.floor(S.x / 40) + S.dates * 5 + S.scarabs * 15 + S.skins * 3 + S.humps * 20 + (S.arrived ? 60 : 0);

  const hump = (x, y, k, ph) => { // a Humpdrop seen side-on, plodding: tan body, a hump, a little head, a teal saddle blanket
    const b = Math.sin(ph) * 2;
    c.fillStyle = '#9a6a3a'; for (const lx of [-8, 6]) c.fillRect(x + lx, y - 4 + (lx > 0 ? b : -b) * 0.5, 4, 9);
    c.fillStyle = '#d8a868'; c.beginPath(); c.ellipse(x, y - 10 + b * 0.3, 14, 8, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(x - 1, y - 19 + b * 0.3, 7, 6, 0, 0, 7); c.fill();
    c.fillStyle = ['#2ab0a8', '#d8643a', '#ffc040'][k % 3]; c.fillRect(x - 9, y - 15 + b * 0.3, 14, 5);
    c.fillStyle = '#d8a868'; c.beginPath(); c.ellipse(x + 15, y - 14 + b * 0.3, 6, 5, 0, 0, 7); c.fill();
    c.fillStyle = '#3a2214'; c.fillRect(x + 17, y - 16 + b * 0.3, 2, 2);
  };
  const draw = () => {
    const storm = S.stormT > 0 ? Math.min(1, S.stormT, (7 - S.stormT) * 2) : 0;
    const g = c.createLinearGradient(0, 0, 0, 90); g.addColorStop(0, '#4aa0e8'); g.addColorStop(1, '#ffe0a8');
    c.fillStyle = g; c.fillRect(0, 0, W, 92);
    c.fillStyle = '#fff2b0'; c.beginPath(); c.arc(270, 30, 14, 0, 7); c.fill();
    c.fillStyle = '#c8784a'; for (let i = 0; i < 4; i++) { const mx = ((i * 130 - S.x * 0.08) % 520 + 520) % 520 - 90, my = 92; c.fillRect(mx, my - 26 - (i % 2) * 12, 54 + (i % 3) * 10, 30); c.fillRect(mx - 5, my - 30 - (i % 2) * 12, 64 + (i % 3) * 10, 5); }
    c.fillStyle = '#ecc488'; c.fillRect(0, 88, W, H - 88);
    c.fillStyle = 'rgba(200,150,80,0.35)'; for (let k = 0; k < 2; k++) { const y = (LANES[k] + LANES[k + 1]) / 2; for (let x = -((S.x * 1) % 24); x < W; x += 24) c.fillRect(x, y, 12, 2); } // the tracks between lanes
    c.fillStyle = 'rgba(255,240,210,0.4)'; for (let i = 0; i < 18; i++) { const x = ((i * 53 - S.x) % (W + 40) + W + 40) % (W + 40) - 20, y = 96 + (i * 37) % 140; c.fillRect(x, y, 6, 2); }
    const cx = CAMP - S.x + X + 30; // the next camp: striped tents and a palm rolling in from the right
    if (cx < W + 80) for (const [dx, dy, col] of [[0, 120, '#2ab0a8'], [40, 172, '#d8643a'], [10, 222, '#ffc040']]) {
      const x = cx + dx, y = dy; c.fillStyle = '#f4e4c4'; c.beginPath(); c.moveTo(x - 22, y); c.lineTo(x, y - 30); c.lineTo(x + 22, y); c.fill();
      c.fillStyle = col; c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x, y - 30); c.lineTo(x + 8, y); c.fill(); c.fillStyle = '#5a3a22'; c.fillRect(x - 3, y - 9, 6, 9);
    }
    for (const o of S.things) {
      if (o.got) continue;
      const x = o.x - S.x + X, y = o.k === 'twister' ? o.y : LANES[o.l]; if (x < -30 || x > W + 30) continue;
      const vis = storm ? Math.max(0.08, 1 - storm * Math.max(0, (x - X - 40) / 90)) : 1; c.globalAlpha = vis;
      if (o.k === 'cactus') { c.fillStyle = '#3a8a4a'; c.fillRect(x - 4, y - 28, 8, 30); c.fillRect(x - 11, y - 18, 5, 10); c.fillRect(x - 11, y - 12, 9, 4); c.fillRect(x + 6, y - 23, 5, 11); c.fillRect(x + 2, y - 15, 9, 4); c.fillStyle = '#ff7aa0'; c.fillRect(x - 2, y - 31, 4, 3); }
      if (o.k === 'date') { c.fillStyle = '#8a4a22'; c.beginPath(); c.ellipse(x, y - 10, 4, 6, 0.3, 0, 7); c.fill(); c.fillStyle = 'rgba(255,220,180,0.7)'; c.fillRect(x - 1, y - 14, 2, 3); }
      if (o.k === 'skin') { c.fillStyle = '#7a5a3a'; c.beginPath(); c.ellipse(x, y - 10, 7, 9, 0, 0, 7); c.fill(); c.fillStyle = '#5ac8e8'; c.beginPath(); c.arc(x, y - 9, 4, 0, 7); c.fill(); c.fillStyle = '#5a3a22'; c.fillRect(x - 2, y - 22, 4, 4); }
      if (o.k === 'scarab') { const b = 1 + Math.sin(S.t * 6) * 0.15; c.fillStyle = 'rgba(255,230,120,0.35)'; c.beginPath(); c.arc(x, y - 10, 12 * b, 0, 7); c.fill(); c.fillStyle = '#e8b020'; c.beginPath(); c.ellipse(x, y - 10, 6, 8, 0, 0, 7); c.fill(); c.strokeStyle = '#8a5a10'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y - 18); c.lineTo(x, y - 2); c.stroke(); }
      if (o.k === 'twister') { for (let k = 0; k < 6; k++) { const w2 = 4 + k * 3.2, yy = y - 4 - k * 6, wob = Math.sin(S.t * 9 + k) * 3; c.fillStyle = `rgba(200,150,80,${0.75 - k * 0.08})`; c.beginPath(); c.ellipse(x + wob, yy, w2, 3, 0, 0, 7); c.fill(); } }
      c.globalAlpha = 1;
    }
    // the caravan: Humpdrops trailing in the leader's tracks, the hero out in front
    for (let k = S.humps - 1; k >= 0; k--) { const y = S.trail[Math.min(S.trail.length - 1, (k + 1) * 9)] ?? S.y; hump(X - 32 * (k + 1), y, k, S.x * 0.08 + k); }
    for (const L of S.lost) { c.globalAlpha = Math.min(1, L.t); hump(L.x, L.y, 0, S.t * 12); c.globalAlpha = 1; }
    c.save(); c.translate(X, S.y);
    if (S.hurt > 0 && Math.floor(S.hurt * 12) % 2) c.globalAlpha = 0.4;
    c.fillStyle = 'rgba(0,0,0,0.15)'; c.beginPath(); c.ellipse(0, 2, 13, 4, 0, 0, 7); c.fill();
    if (img.complete && img.naturalWidth) c.drawImage(img, -15, -30 + Math.abs(Math.sin(S.x * 0.08)) * -2, 30, 30); else { c.fillStyle = '#ff9a40'; c.beginPath(); c.arc(0, -14, 12, 0, 7); c.fill(); }
    c.restore();
    if (storm) { // blowing sand: an amber wall that only the near tiles show through
      const sg = c.createLinearGradient(X + 30, 0, W, 0); sg.addColorStop(0, `rgba(220,170,100,${0.15 * storm})`); sg.addColorStop(1, `rgba(210,160,90,${0.85 * storm})`);
      c.fillStyle = sg; c.fillRect(0, 0, W, H);
      c.fillStyle = `rgba(255,235,190,${0.5 * storm})`; for (let i = 0; i < 40; i++) { const x = ((i * 71 - S.t * 420) % W + W) % W, y = (i * 29 + S.t * 10) % H; c.fillRect(x, y, 14, 1.5); }
    }
    c.textAlign = 'center'; c.font = 'bold 13px sans-serif';
    for (const p of S.pops) { c.globalAlpha = Math.min(1, p.t * 2); c.fillStyle = p.col; c.strokeStyle = 'rgba(90,50,20,0.8)'; c.lineWidth = 3; c.strokeText(p.txt, p.x, p.y); c.fillText(p.txt, p.x, p.y); }
    c.globalAlpha = 1;
    // the water timer along the top
    c.fillStyle = 'rgba(30,60,90,0.35)'; c.fillRect(10, 8, W - 20, 6); c.fillStyle = S.water < 8 ? '#ff7a3a' : '#5ac8e8'; c.fillRect(10, 8, (W - 20) * S.water / WATER, 6);
    if (S.ready > 0 || !S.started) { c.fillStyle = '#fff36b'; c.strokeStyle = '#8a4a1a'; c.lineWidth = 4; c.font = 'bold 24px sans-serif'; const t = S.ready > 0 ? 'READY?' : 'TAP TO SET OFF!'; c.strokeText(t, W / 2, H / 2 - 50); c.fillText(t, W / 2, H / 2 - 50); }
    if (S.over && S.end > 0.3) { c.fillStyle = 'rgba(70,40,20,0.55)'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff36b'; c.font = 'bold 26px sans-serif'; c.fillText(S.arrived ? 'CAMP!' : S.humps > 0 ? 'OUT OF WATER!' : 'SCATTERED!', W / 2, H / 2 - 10); c.fillStyle = '#fff'; c.font = 'bold 16px sans-serif'; c.fillText(`Score ${total()}`, W / 2, H / 2 + 16); }
    hud.textContent = `🐪×${S.humps}  ${Math.floor(Math.min(S.x, CAMP) / 10)}/${CAMP / 10} m  🌴 ${S.dates}  ⭐ ${total()}`;
  };
  let last = performance.now(), raf = 0;
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    step(dt); draw();
    if (el.isConnected) raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  let closed = false;
  function close() {
    if (closed) return; closed = true;
    cancelAnimationFrame(raf); el.remove();
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true);
    onDone(total());
  }
  el.__arcade = { S, lane, step: (sec) => { for (let t = 0; t < sec; t += 1 / 60) step(1 / 60); draw(); }, close };
  return el;
}

// R854: SPORE DRIFT (Forager Pim, Glowcap Hollow): the hero rides a glowcap's spore puff up a pitch-dark shaft. The puff's own glow is the
// only light: it fades as you rise, and glowing motes (+5) and glowcaps (+15) top it up. Rock ledges jut out from the walls (only seen
// inside the light, though motes and glowcaps shine through the dark) and drips fall: a bump dims the light. Light out, the run ends;
// reach daylight at the top of the shaft (600 m) for +60. Drag (or ←/→) to steer. Score: metres climbed + pickups.
export function sporeDrift(root, face, onDone) {
  const el = document.createElement('div');
  el.className = 'modal-wrap arcade-wrap';
  el.innerHTML = `<div class="arcade spore"><div class="arc-top"><b>SPORE DRIFT</b><span class="arc-hud"></span></div>
    <canvas width="${W}" height="${H}"></canvas>
    <p class="arc-tip">Drag (or ←/→) to steer up the dark shaft. ✨ motes and 🍄 glowcaps keep your light alive. Mind the rock!</p></div>`;
  root.appendChild(el);
  const cv = el.querySelector('canvas'), c = cv.getContext('2d'), hud = el.querySelector('.arc-hud');
  const img = new Image(); img.src = face;
  const Y = 170, R = 12, TOP = 600, WALL = 34; // the hero's row, hit radius, the shaft's height in metres, the wall width
  const S = { x: W / 2, vx: 0, h: 0, light: 1, score: 0, motes: 0, caps: 0, things: [], pops: [], next: 40, over: false, won: false, ready: 1.2, started: false, end: 0, hurt: 0, t: 0 };
  const keys = new Set(); let target = null;
  const onKey = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) return;
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'keydown') { keys.add(e.code); start(); } else keys.delete(e.code);
  };
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  const toX = (e) => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
  const start = () => { if (S.ready > 0) S.ready = 0; if (!S.started) { S.started = true; sfx.arc('go'); } };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture?.(e.pointerId); target = toX(e); start(); });
  cv.addEventListener('pointermove', (e) => { if (target != null) target = toX(e); });
  const up = () => { target = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  const pop = (x, y, txt, col) => S.pops.push({ x, y, txt, col, t: 0.8 });
  const speed = () => 34 + Math.min(30, S.h * 0.06); // px a second the shaft scrolls (4 px = 1 m)
  const spawn = () => {
    const m = S.h, r = Math.random(), gap = Math.max(70, 120 - m * 0.06);
    if (r < 0.5) { // a ledge from one wall (or both, with a gap)
      const side = Math.random() < 0.5 ? -1 : 1, both = m > 150 && Math.random() < 0.4;
      if (both) { const gx = WALL + gap / 2 + Math.random() * (W - 2 * WALL - gap); S.things.push({ k: 'rock', x0: WALL, x1: gx - gap / 2, y: -14 }, { k: 'rock', x0: gx + gap / 2, x1: W - WALL, y: -14 }); S.things.push({ k: Math.random() < 0.35 ? 'cap' : 'mote', x: gx, y: -14 }); }
      else { const len = 70 + Math.random() * (W - 2 * WALL - gap - 70); S.things.push(side < 0 ? { k: 'rock', x0: WALL, x1: WALL + len, y: -14 } : { k: 'rock', x0: W - WALL - len, x1: W - WALL, y: -14 }); S.things.push({ k: 'mote', x: side < 0 ? WALL + len + 24 + Math.random() * 30 : W - WALL - len - 24 - Math.random() * 30, y: -30 }); }
    } else if (r < 0.75) { for (let k = 0; k < 3; k++) S.things.push({ k: 'mote', x: WALL + 20 + Math.random() * (W - 2 * WALL - 40), y: -14 - k * 26 }); }
    else if (r < 0.88) S.things.push({ k: 'cap', x: WALL + 24 + Math.random() * (W - 2 * WALL - 48), y: -14 });
    else S.things.push({ k: 'drip', x: WALL + 20 + Math.random() * (W - 2 * WALL - 40), y: -14, vy: 50 + Math.random() * 30 });
    S.next = 46 + Math.random() * 30;
  };
  const bump = (txt) => { if (S.hurt > 0) return; S.hurt = 0.9; S.light = Math.max(0, S.light - 0.28); pop(S.x, Y - 22, txt, '#ff8a6a'); sfx.arc('zap'); buzz('medium'); jolt(el); };
  function finish(won) { if (S.over) return; S.over = true; S.won = won; if (won) { S.score += 60; sfx.arc('gold'); } else { sfx.arc('crash'); buzz('heavy'); } setTimeout(close, 2000); }
  const step = (dt) => {
    S.t += dt;
    if (S.ready > 0) { S.ready -= dt; return; }
    if (!S.started || S.over) { if (S.over) S.end += dt; return; }
    const tgt = target != null ? target : null, k = (keys.has('ArrowLeft') || keys.has('KeyA') ? -1 : 0) + (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0);
    if (tgt != null) S.vx += (Math.max(-1, Math.min(1, (tgt - S.x) / 30)) * 260 - S.vx) * Math.min(1, dt * 6);
    else S.vx += (k * 200 - S.vx) * Math.min(1, dt * 5);
    S.x = Math.max(WALL + R, Math.min(W - WALL - R, S.x + S.vx * dt + Math.sin(S.t * 1.7) * 6 * dt)); // a gentle drift
    const v = speed(), dy = v * dt; S.h += dy / 4; S.score += dy / 4;
    S.light = Math.max(0, S.light - dt * (0.066 + Math.min(0.03, S.h * 0.00006)));
    S.hurt = Math.max(0, S.hurt - dt);
    S.next -= dy; if (S.next <= 0 && S.h < TOP - 30) spawn();
    for (const o of S.things) {
      o.y += dy + (o.vy ? o.vy * dt : 0);
      if (o.gone) continue;
      if (o.k === 'rock') { if (o.y > Y - R - 7 && o.y < Y + R + 7 && S.x > o.x0 - R + 3 && S.x < o.x1 + R - 3) { o.gone = true; bump('BONK!'); } }
      else if (Math.abs(o.x - S.x) < R + 9 && Math.abs(o.y - Y) < R + 9) {
        o.gone = true;
        if (o.k === 'mote') { S.motes++; S.score += 5; S.light = Math.min(1, S.light + 0.12); pop(o.x, o.y - 12, '+5', '#bfffee'); sfx.arc('grab', 3 + (S.motes % 5)); }
        else if (o.k === 'cap') { S.caps++; S.score += 15; S.light = Math.min(1, S.light + 0.35); pop(o.x, o.y - 12, '+15 🍄', '#5affe0'); sfx.arc('pearl'); }
        else bump('DRIP!');
      }
    }
    S.things = S.things.filter((o) => o.y < H + 30 && !(o.gone && o.k !== 'rock'));
    for (const p of S.pops) { p.t -= dt; p.y -= 26 * dt; }
    S.pops = S.pops.filter((p) => p.t > 0);
    if (S.h >= TOP) { S.h = TOP; finish(true); } else if (S.light <= 0) finish(false);
  };
  const draw = () => {
    const sky = Math.max(0, (S.h - (TOP - 80)) / 80); // daylight creeps in near the top
    c.fillStyle = '#0a141a'; c.fillRect(0, 0, W, H);
    // the shaft walls: jagged slate columns scrolling down
    c.fillStyle = '#26363e';
    for (const sd of [0, 1]) { c.beginPath(); c.moveTo(sd ? W : 0, 0); for (let y = -20; y <= H + 20; y += 10) { const q = Math.floor((y - S.h * 4) / 10), j = ((q * 37 + sd * 11) % 13 + 13) % 13; c.lineTo(sd ? W - WALL + 4 - j : WALL - 4 + j, y + (S.h * 4) % 10); } c.lineTo(sd ? W : 0, H); c.fill(); }
    for (const o of S.things) if (o.k === 'rock' && !o.gone) { c.fillStyle = '#3a4c56'; c.fillRect(o.x0, o.y - 7, o.x1 - o.x0, 14); c.fillStyle = '#4e646e'; c.fillRect(o.x0, o.y - 7, o.x1 - o.x0, 4); c.fillStyle = '#1a262e'; for (let x = o.x0 + 8; x < o.x1 - 4; x += 16) c.fillRect(x, o.y + 7, 6, 4 + (x % 3) * 2); }
    for (const o of S.things) if (o.k === 'drip' && !o.gone) { c.fillStyle = '#7adff0'; c.beginPath(); c.moveTo(o.x, o.y - 9); c.quadraticCurveTo(o.x + 6, o.y + 2, o.x, o.y + 5); c.quadraticCurveTo(o.x - 6, o.y + 2, o.x, o.y - 9); c.fill(); }
    // the dark: everything outside the spore's light is black, then the glowing things shine through it
    const rad = 26 + S.light * 110, gx = S.x, gy = Y;
    const g = c.createRadialGradient(gx, gy, rad * 0.35, gx, gy, rad); g.addColorStop(0, 'rgba(4,10,14,0)'); g.addColorStop(1, `rgba(4,10,14,${0.93 - sky * 0.8})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (sky > 0) { const sg = c.createLinearGradient(0, 0, 0, H * 0.6); sg.addColorStop(0, `rgba(255,236,170,${sky * 0.85})`); sg.addColorStop(1, 'rgba(255,236,170,0)'); c.fillStyle = sg; c.fillRect(0, 0, W, H); }
    for (const o of S.things) {
      if (o.gone) continue;
      if (o.k === 'mote') { const tw = 0.7 + Math.sin(S.t * 6 + o.x) * 0.3; c.fillStyle = `rgba(160,255,230,${0.25 * tw})`; c.beginPath(); c.arc(o.x, o.y, 9, 0, 7); c.fill(); c.fillStyle = `rgba(230,255,248,${tw})`; c.beginPath(); c.arc(o.x, o.y, 3.2, 0, 7); c.fill(); }
      if (o.k === 'cap') { c.fillStyle = 'rgba(90,255,224,0.22)'; c.beginPath(); c.arc(o.x, o.y, 16, 0, 7); c.fill(); c.fillStyle = '#f2ead2'; c.fillRect(o.x - 2.5, o.y, 5, 9); c.fillStyle = '#46f2d6'; c.beginPath(); c.ellipse(o.x, o.y, 11, 7, 0, Math.PI, 0); c.fill(); c.fillStyle = '#fffbe0'; for (const dx of [-5, 0, 5]) { c.beginPath(); c.arc(o.x + dx, o.y - 3 - (dx ? 0 : 2), 1.6, 0, 7); c.fill(); } }
    }
    // the hero on a glowing spore puff, its own halo
    c.fillStyle = `rgba(90,255,224,${0.18 + S.light * 0.25})`; c.beginPath(); c.arc(S.x, Y, 22 + Math.sin(S.t * 3) * 2, 0, 7); c.fill();
    c.fillStyle = 'rgba(220,255,248,0.9)'; for (let k = 0; k < 6; k++) { const a = k * 1.05 + S.t * 0.8; c.beginPath(); c.arc(S.x + Math.cos(a) * 12, Y + 12 + Math.sin(a) * 3, 5, 0, 7); c.fill(); }
    if (!(S.hurt > 0 && Math.sin(S.t * 30) > 0)) { if (img.complete && img.naturalWidth) c.drawImage(img, S.x - 15, Y - 18, 30, 30); else { c.fillStyle = '#ff9a40'; c.beginPath(); c.arc(S.x, Y - 3, R, 0, 7); c.fill(); } }
    // the light meter down the right wall
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(W - 14, 30, 7, H - 60); c.fillStyle = S.light < 0.25 ? '#ff8a6a' : '#5affe0'; const lh = (H - 60) * S.light; c.fillRect(W - 14, 30 + (H - 60) - lh, 7, lh);
    c.textAlign = 'center'; c.font = 'bold 13px sans-serif';
    for (const p of S.pops) { c.globalAlpha = Math.min(1, p.t * 2); c.fillStyle = p.col; c.fillText(p.txt, p.x, p.y); }
    c.globalAlpha = 1;
    if (S.ready > 0 || !S.started) { c.fillStyle = '#5affe0'; c.font = 'bold 24px sans-serif'; c.fillText(S.ready > 0 ? 'READY?' : 'DRAG TO DRIFT!', W / 2, 70); }
    if (S.over) { c.fillStyle = 'rgba(4,10,14,0.6)'; c.fillRect(0, 0, W, H); c.fillStyle = S.won ? '#fff36b' : '#5affe0'; c.font = 'bold 26px sans-serif'; c.fillText(S.won ? 'DAYLIGHT!' : 'LIGHTS OUT!', W / 2, H / 2 - 12); c.fillStyle = '#fff'; c.font = 'bold 16px sans-serif'; c.fillText(`Score ${Math.floor(S.score)}`, W / 2, H / 2 + 14); }
    hud.textContent = `⛰️ ${Math.floor(S.h)} m  ⭐ ${Math.floor(S.score)}`;
  };
  let last = performance.now(), raf = 0;
  const loop = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; step(dt); draw(); if (el.isConnected) raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  let closed = false;
  function close() {
    if (closed) return; closed = true;
    cancelAnimationFrame(raf); el.remove();
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true);
    onDone(Math.floor(S.score));
  }
  el.__arcade = { S, start, steer: (x) => { target = x; }, step: (sec) => { for (let t = 0; t < sec; t += 1 / 60) step(1 / 60); draw(); }, close };
  return el;
}

// R865: WATERWORKS (Waterwright Osei, the Old Aqueduct, after the Sun Sluice): tap stone channel tiles to turn them and lead the
// water from the sun-bird spout (left) to the cistern (right). Each board solved scores and adds time; the boards grow harder.
export function waterworks(root, face, onDone) {
  const el = document.createElement('div');
  el.className = 'modal-wrap arcade-wrap';
  el.innerHTML = `<div class="arcade pipes"><div class="arc-top"><b>WATERWORKS</b><span class="arc-hud"></span></div>
    <canvas width="${W}" height="${H}"></canvas>
    <p class="arc-tip">Tap a stone to turn it. Lead the water from the spout to the cistern! Fewer turns score more.</p></div>`;
  root.appendChild(el);
  const cv = el.querySelector('canvas'), c = cv.getContext('2d'), hud = el.querySelector('.arc-hud');
  const img = new Image(); img.src = face;
  const C = 7, R = 5, T = 34, X0 = (W - C * T) / 2, Y0 = 44; // the grid: 7 × 5 tiles of 34 px
  const N = 1, E = 2, S_ = 4, Wb = 8, DIR = [[0, -1, N, S_], [1, 0, E, Wb], [0, 1, S_, N], [-1, 0, Wb, E]];
  const rot = (m) => ((m << 1) | (m >> 3)) & 15;
  const S = { time: 45, score: 0, boards: 0, moves: 0, grid: [], sol: [], inR: 2, outR: 2, wet: new Set(), flood: 0, pops: [], over: false, ready: 1.2, started: false, t: 0, cur: [3, 2] };
  const pop = (x, y, txt, col) => S.pops.push({ x, y, txt, col, t: 1 });
  function newBoard() {
    const lvl = S.boards; S.inR = Math.floor(Math.random() * R); S.outR = Math.floor(Math.random() * R);
    // a wandering path from the spout's tile to the cistern's tile (a self-avoiding random walk, longer on later boards)
    const want = Math.min(C + 10, C + 1 + lvl * 2);
    let path = null;
    for (let tries = 0; tries < 400 && !path; tries++) {
      const p = [[0, S.inR]], seen = new Set(['0,' + S.inR]);
      while (p.length < 60) {
        const [x, y] = p[p.length - 1];
        if (x === C - 1 && y === S.outR) break;
        const opts = DIR.map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < C && b < R && !seen.has(a + ',' + b));
        if (!opts.length) break;
        opts.sort(() => Math.random() - 0.5);
        const east = opts.find(([a]) => a > x), pick = p.length < want && Math.random() < 0.6 ? opts[0] : (east && Math.random() < 0.7 ? east : opts[0]);
        p.push(pick); seen.add(pick.join());
      }
      const [lx, ly] = p[p.length - 1];
      if (lx === C - 1 && ly === S.outR && p.length >= Math.min(want, C + 4) - 2) path = p;
    }
    if (!path) { path = []; for (let x = 0; x < C; x++) path.push([x, S.inR]); for (let y = S.inR; y !== S.outR; y += Math.sign(S.outR - S.inR)) path.push([C - 1, y + Math.sign(S.outR - S.inR)]); }
    const g = Array.from({ length: R }, () => Array(C).fill(0));
    path.forEach(([x, y], i) => {
      let m = 0;
      const nb = [path[i - 1] || [-1, S.inR], path[i + 1] || [C, S.outR]];
      for (const [a, b] of nb) for (const [dx, dy, bit] of DIR) if (x + dx === a && y + dy === b) m |= bit;
      if (lvl >= 2 && Math.random() < 0.18) m |= DIR[Math.floor(Math.random() * 4)][2]; // a tee now and then (a spare outlet)
      g[y][x] = m;
    });
    const fill = [5, 3, 3, 6, 7, 5, 9, 11];
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) if (!g[y][x]) g[y][x] = fill[Math.floor(Math.random() * fill.length)];
    S.sol = g.map((r) => r.slice());
    S.grid = g.map((r) => r.map((m) => { for (let k = Math.floor(Math.random() * 4); k > 0; k--) m = rot(m); return m; }));
    S.path = path; S.flood = 0; S.moves = 0;
    S.need = path.reduce((n, [x, y]) => { let m = S.grid[y][x], k = 0; while (m !== S.sol[y][x] && k < 4) { m = rot(m); k++; } return n + k; }, 0); // the fewest turns that fix it (for the tidy bonus)
    flow(); if (S.solved) newBoard();
  }
  function flow() { // which tiles the water reaches from the spout
    const wet = new Set(), q = [];
    if (S.grid[S.inR][0] & Wb) { wet.add('0,' + S.inR); q.push([0, S.inR]); }
    for (let i = 0; i < q.length; i++) { const [x, y] = q[i], m = S.grid[y][x]; for (const [dx, dy, bit, back] of DIR) { const a = x + dx, b = y + dy; if (!(m & bit) || a < 0 || b < 0 || a >= C || b >= R || wet.has(a + ',' + b) || !(S.grid[b][a] & back)) continue; wet.add(a + ',' + b); q.push([a, b]); } }
    S.wet = wet; S.solved = wet.has((C - 1) + ',' + S.outR) && !!(S.grid[S.outR][C - 1] & E);
  }
  const start = () => { if (S.ready > 0) S.ready = 0; if (!S.started) { S.started = true; sfx.arc('go'); } };
  function turn(x, y) {
    if (S.over || S.flood > 0 || x < 0 || y < 0 || x >= C || y >= R) return;
    start(); S.grid[y][x] = rot(S.grid[y][x]); S.moves++; S.cur = [x, y];
    flow(); sfx.arc('tick');
    if (S.solved) { // the water runs through: score, a little time back, then a fresh (harder) board
      const pts = 40 + S.wet.size * 4 + Math.max(0, S.need + 6 - S.moves) * 3, add = Math.max(1, 6 - S.boards); // (the time back shrinks: 6 s, 5, 4... then 1)
      S.score += pts; S.boards++; S.time = Math.min(60, S.time + add); S.flood = 0.9;
      pop(W / 2, Y0 + R * T / 2, `+${pts}  +${add} s`, '#9ff0ff'); sfx.arc('gold'); buzz('light');
    }
  }
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W, py = (e.clientY - r.top) / r.height * H; turn(Math.floor((px - X0) / T), Math.floor((py - Y0) / T)); if (S.ready > 0 || !S.started) start(); });
  const onKey = (e) => {
    const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.code];
    if (!mv && e.code !== 'Space' && e.code !== 'Enter') return;
    e.preventDefault(); e.stopPropagation(); if (e.type !== 'keydown') return;
    if (mv) { S.cur = [Math.max(0, Math.min(C - 1, S.cur[0] + mv[0])), Math.max(0, Math.min(R - 1, S.cur[1] + mv[1]))]; start(); } else turn(S.cur[0], S.cur[1]);
  };
  addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
  newBoard();
  function finish() { if (S.over) return; S.over = true; sfx.arc('time'); setTimeout(close, 2200); }
  const step = (dt) => {
    S.t += dt;
    for (const p of S.pops) { p.t -= dt; p.y -= 20 * dt; }
    S.pops = S.pops.filter((p) => p.t > 0);
    if (S.ready > 0) { S.ready -= dt; return; }
    if (!S.started || S.over) return;
    if (S.flood > 0) { S.flood -= dt; if (S.flood <= 0) newBoard(); return; } // (the clock waits while the water runs through)
    const was = Math.ceil(S.time); S.time -= dt;
    if (S.time <= 5 && Math.ceil(S.time) < was) sfx.arc('tick');
    if (S.time <= 0) { S.time = 0; finish(); }
  };
  const draw = () => {
    c.fillStyle = '#2a1c12'; c.fillRect(0, 0, W, H);
    // sandstone blocks behind the grid
    for (let y = 0; y < H; y += 16) for (let x = (y / 16) % 2 ? -12 : 0; x < W; x += 24) { c.fillStyle = (x * 7 + y * 3) % 5 ? '#4a3220' : '#523826'; c.fillRect(x + 1, y + 1, 22, 14); }
    c.fillStyle = 'rgba(20,12,6,0.55)'; c.fillRect(X0 - 6, Y0 - 6, C * T + 12, R * T + 12);
    const wave = S.t * 3;
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
      const px = X0 + x * T, py = Y0 + y * T, m = S.grid[y][x], wet = S.wet.has(x + ',' + y), cx = px + T / 2, cy = py + T / 2;
      c.fillStyle = (x + y) % 2 ? '#b88a58' : '#c4965e'; c.fillRect(px + 1, py + 1, T - 2, T - 2);
      c.fillStyle = 'rgba(255,240,200,0.18)'; c.fillRect(px + 1, py + 1, T - 2, 3);
      // the carved channel: a dark groove from the middle to each open side, blue when water runs in it
      const arms = DIR.filter(([, , bit]) => m & bit);
      for (const pass of [0, 1]) {
        c.strokeStyle = pass ? (wet ? `hsl(${195 + Math.sin(wave + x + y) * 6},85%,${S.flood > 0 ? 66 : 58}%)` : '#5a3e26') : '#3a2616'; c.lineWidth = pass ? 8 : 13; c.lineCap = 'round';
        c.beginPath(); for (const [dx, dy] of arms) { c.moveTo(cx, cy); c.lineTo(cx + dx * T / 2, cy + dy * T / 2); } c.stroke();
      }
      if (wet) { c.fillStyle = 'rgba(220,250,255,0.75)'; for (const [dx, dy] of arms) { const k = (S.t * 1.6 + (x + y) * 0.3) % 1; c.beginPath(); c.arc(cx + dx * T / 2 * k, cy + dy * T / 2 * k, 1.6, 0, 7); c.fill(); } }
    }
    // the grid's cursor (keyboard) and the spout and cistern at either end
    if (S.started && !S.over) { c.strokeStyle = 'rgba(255,240,160,0.7)'; c.lineWidth = 2; c.strokeRect(X0 + S.cur[0] * T + 2, Y0 + S.cur[1] * T + 2, T - 4, T - 4); }
    const sy = Y0 + S.inR * T + T / 2, oy = Y0 + S.outR * T + T / 2;
    c.fillStyle = '#d8a040'; c.beginPath(); c.moveTo(X0 - 4, sy - 7); c.lineTo(X0 - 16, sy - 13); c.lineTo(X0 - 24, sy - 9); c.lineTo(X0 - 26, sy + 2); c.lineTo(X0 - 18, sy + 12); c.lineTo(X0 - 4, sy + 7); c.fill(); // the bronze sun-bird spout: a head, an eye and a beak
    c.fillStyle = '#a8742a'; c.beginPath(); c.moveTo(X0 - 16, sy - 13); c.lineTo(X0 - 12, sy - 20); c.lineTo(X0 - 9, sy - 11); c.fill(); // (its crest)
    c.fillStyle = '#2a1a10'; c.beginPath(); c.arc(X0 - 17, sy - 4, 2.2, 0, 7); c.fill();
    c.fillStyle = `hsl(195,85%,58%)`; c.fillRect(X0 - 6, sy - 4, 7, 8);
    const full = S.flood > 0 ? 1 : 0;
    c.fillStyle = '#2a9ab0'; c.fillRect(X0 + C * T + 1, oy - 15, 24, 30); // (a teal-tiled rim, so the goal reads at a glance) c.fillStyle = full ? '#7adfff' : '#2a1a10'; c.fillRect(X0 + C * T + 5, oy - 10, 16, 21);
    if (full) { c.fillStyle = 'rgba(200,250,255,0.8)'; c.fillRect(X0 + C * T + 5, oy - 10 + Math.sin(S.t * 8) * 1.5, 16, 3); }
    // the hero waits by the cistern, cheering when it fills
    if (img.complete && img.naturalWidth) c.drawImage(img, W - 30, H - 34 - (full ? Math.abs(Math.sin(S.t * 10)) * 6 : 0), 26, 26);
    // the clock bar
    c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(X0, 18, C * T, 10); c.fillStyle = S.time < 10 ? '#ff8a6a' : '#5ad0ff'; c.fillRect(X0, 18, C * T * Math.min(1, S.time / 60), 10);
    c.textAlign = 'center'; c.font = 'bold 13px sans-serif';
    for (const p of S.pops) { c.globalAlpha = Math.min(1, p.t * 2); c.fillStyle = p.col; c.strokeStyle = '#1a1008'; c.lineWidth = 3; c.strokeText(p.txt, p.x, p.y); c.fillText(p.txt, p.x, p.y); }
    c.globalAlpha = 1;
    if (S.ready > 0 || !S.started) { c.fillStyle = 'rgba(20,12,6,0.55)'; c.fillRect(0, H / 2 - 26, W, 44); c.fillStyle = '#9ff0ff'; c.font = 'bold 22px sans-serif'; c.fillText(S.ready > 0 ? 'READY?' : 'TAP A STONE!', W / 2, H / 2 + 4); }
    if (S.over) { c.fillStyle = 'rgba(20,12,6,0.7)'; c.fillRect(0, 0, W, H); c.fillStyle = '#9ff0ff'; c.font = 'bold 26px sans-serif'; c.fillText("TIME'S UP!", W / 2, H / 2 - 14); c.fillStyle = '#fff'; c.font = 'bold 16px sans-serif'; c.fillText(`${S.boards} fixed · Score ${S.score}`, W / 2, H / 2 + 14); }
    hud.textContent = `⏱️ ${Math.ceil(S.time)}  💧 ${S.boards}  ⭐ ${S.score}`;
  };
  let last = performance.now(), raf = 0;
  const loop = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; step(dt); draw(); if (el.isConnected) raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  let closed = false;
  function close() {
    if (closed) return; closed = true;
    cancelAnimationFrame(raf); el.remove();
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true);
    onDone(S.score);
  }
  // (for the bots: solve() turns every wrong tile on the path once more until the board runs, counting the turns)
  const solve = () => { for (const [x, y] of S.path) { let k = 0; while (S.grid[y][x] !== S.sol[y][x] && k++ < 4 && !S.solved) turn(x, y); } };
  el.__arcade = { S, start, turn, solve, step: (sec) => { for (let t = 0; t < sec; t += 1 / 60) step(1 / 60); draw(); }, close };
  return el;
}
