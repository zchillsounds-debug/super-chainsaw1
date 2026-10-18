// Night things kept in the Journal. Sprout Village's stargazing telescope: a night sky drawn on a 2D canvas, with tonight's critter constellation
// tracing itself star by star. Each constellation is a list of stars (x, y in 0..1 of the sky) and the lines between them.
import { sfx } from './audio.js';

export const CONSTELLATIONS = [
  { id: 'kite', name: 'The Kite', tip: 'Whirlwhisk fans say it points the way to Cloudtop.', s: [[0.5, 0.12], [0.62, 0.32], [0.5, 0.52], [0.38, 0.32], [0.54, 0.66], [0.47, 0.78], [0.55, 0.9]], l: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [2, 4], [4, 5], [5, 6]] },
  { id: 'bubble', name: "Bubbalotl's Bubble", tip: 'A ring of seven stars. Sailors call it good luck.', s: [[0.5, 0.18], [0.66, 0.26], [0.72, 0.46], [0.63, 0.66], [0.45, 0.7], [0.32, 0.56], [0.34, 0.32]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]] },
  { id: 'crown', name: 'The Critter Crown', tip: 'It hangs right over Champion\'s Peak on clear nights.', s: [[0.2, 0.62], [0.28, 0.3], [0.38, 0.52], [0.5, 0.2], [0.62, 0.52], [0.72, 0.3], [0.8, 0.62]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]] },
  { id: 'ember', name: 'The Great Ember', tip: 'A fire-tailed critter leaping across the sky. Cinder Town folk wave at it.', s: [[0.22, 0.4], [0.32, 0.3], [0.44, 0.36], [0.56, 0.42], [0.68, 0.36], [0.8, 0.22], [0.86, 0.34], [0.4, 0.6], [0.6, 0.62]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 7], [3, 8]] },
  { id: 'pillow', name: "Snoozlo's Pillow", tip: 'Four stars and a sleepy little Z. Look at it too long and you yawn.', s: [[0.28, 0.4], [0.62, 0.36], [0.66, 0.66], [0.3, 0.7], [0.72, 0.14], [0.82, 0.14], [0.72, 0.26], [0.82, 0.26]], l: [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7]] },
  { id: 'hoot', name: 'The Owl\'s Eyes', tip: 'Two bright stars that never blink. Hootsy swears they\'re watching.', s: [[0.36, 0.42], [0.64, 0.42], [0.5, 0.56], [0.26, 0.24], [0.74, 0.24], [0.5, 0.82]], l: [[3, 0], [0, 2], [2, 1], [1, 4], [2, 5]] },
  { id: 'berry', name: 'The Berry Bunch', tip: 'Five fat stars and a leaf. It shows up in berry season. (Every season is berry season.)', s: [[0.42, 0.5], [0.56, 0.48], [0.5, 0.64], [0.36, 0.66], [0.62, 0.66], [0.5, 0.32], [0.62, 0.22]], l: [[5, 0], [5, 1], [0, 1], [0, 3], [1, 4], [0, 2], [1, 2], [5, 6]] },
  { id: 'toad', name: 'The Toadstool', tip: 'A big round cap on a stubby stem. Glowcap folk say it sings if you hum to it.', s: [[0.3, 0.52], [0.36, 0.32], [0.5, 0.2], [0.64, 0.32], [0.7, 0.52], [0.44, 0.52], [0.56, 0.52], [0.43, 0.8], [0.57, 0.8]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 4], [5, 7], [6, 8], [7, 8]] },
  { id: 'ferret', name: 'The Zipping Ferret', tip: 'A zig-zag of stars, like a bolt of lightning. Faster than it looks.', s: [[0.18, 0.24], [0.36, 0.36], [0.3, 0.5], [0.54, 0.56], [0.48, 0.7], [0.82, 0.82]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]] },
];

// the notes that wash up in Seashell Town's bottles (one a night, picked by the date); the Journal keeps the ones you've read
export const BOTTLE_NOTES = [
  'If you find this, know that the Alpha of the day roams wherever the 💥 is on the Town Map. Big, red and grumpy. Bring snacks. (signed) A worried hiker',
  'Dear finder, the moon is the best bait. Moonfins bite in any water after dark. (signed) F.',
  'Gold berries in TURBO are worth five red ones. Do NOT tell Volt. (signed) Pixel',
  'Trader Tock never stays in one town two days running. Follow the 🎩 on the Town Map! (signed) A hat lover',
  'Shake every berry bush once a day. Sometimes a sleepy critter tumbles out! (signed) Gardener Bea',
  'I tried to surf all the way to Frostpeak. Do not try to surf all the way to Frostpeak. (signed) A cold Pengsicle',
  'Danced with DJ Tumble in Neon City last night. Best night of my life. My feet still flash. (signed) A Jiggawatt',
  'Each week the Peak Gauntlet has a theme. Bring a critter that beats both types! (signed) Keeper Orla',
  'There is a telescope in Sprout Village, by the trees. Nine constellations, one a night. I have seen eight. EIGHT. (signed) A tired stargazer',
  'Roses are red, berries are too, I lost my rod somewhere, have you seen it? Boo hoo. (signed) Not a poet',
  'The ice lanterns in Frostpeak were carved by Skater Ivy. Every single one. Tell her they look nice. (signed) A friend',
  'If a bush rustles and nothing comes out, it is shy. Come back tomorrow. (signed) Old Snoozlo (I think)',
];

export function tonightConst(day, hash) { return CONSTELLATIONS[hash(day + ':stars') % CONSTELLATIONS.length]; }

const W = 320, H = 200;

// opens the eyepiece view; onDone() runs when it's closed (tap anywhere once the constellation is traced)
export function stargaze(root, C, seed, onDone, onCatch) {
  const el = document.createElement('div');
  el.className = 'modal-wrap stars-wrap';
  el.innerHTML = `<div class="stars"><p class="st-hint">Tap a 🌠 shooting star to catch it!</p><canvas width="${W * 2}" height="${H * 2}"></canvas><div class="st-name">${C.name}</div><p class="st-tip">${C.tip}</p><p class="st-tap">Tap to look away</p><b class="st-catch">🌠 Caught a shooting star!</b></div>`;
  root.appendChild(el);
  const cv = el.querySelector('canvas'), c = cv.getContext('2d');
  c.scale(2, 2);
  let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const field = Array.from({ length: 140 }, () => ({ x: rnd() * W, y: rnd() * H, r: 0.3 + rnd() * 1.1, p: rnd() * 6.28, sp: 1 + rnd() * 3 }));
  const pts = C.s.map(([x, y]) => [x * W * 0.9 + W * 0.05, y * H * 0.9 + H * 0.05]);
  let t = 0, last = performance.now(), raf = 0, shoot = null, closed = false, chimed = 0, caught = false;
  const step = (dt) => {
    t += dt;
    if (!shoot && rnd() < dt * 0.4) shoot = { x: rnd() * W * 0.7 + W * 0.3, y: rnd() * H * 0.3, t: 0 };
    if (shoot && (shoot.t += dt) > 0.9) shoot = null;
    const g = c.createRadialGradient(W / 2, H * 1.2, 20, W / 2, H * 0.6, W * 0.8);
    g.addColorStop(0, '#2a3a7a'); g.addColorStop(0.6, '#141c48'); g.addColorStop(1, '#070a22');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(160,140,255,0.08)'; c.beginPath(); c.ellipse(W * 0.5, H * 0.45, W * 0.7, H * 0.13, -0.35, 0, 6.28); c.fill(); // a faint milky band
    for (const f of field) { c.globalAlpha = 0.45 + Math.sin(t * f.sp + f.p) * 0.35; c.fillStyle = '#fff'; c.beginPath(); c.arc(f.x, f.y, f.r, 0, 6.28); c.fill(); }
    c.globalAlpha = 1;
    if (shoot) { const k = shoot.t / 0.9, x = shoot.x - k * 90, y = shoot.y + k * 45; const sg = c.createLinearGradient(x, y, x + 40, y - 20); sg.addColorStop(0, 'rgba(255,255,255,0.95)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = sg; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 40, y - 20); c.stroke(); }
    const trace = Math.max(0, t - 0.6) * 2.2; // lines draw in one after another
    c.strokeStyle = 'rgba(140,220,255,0.75)'; c.lineWidth = 1.4; c.shadowColor = '#7ad8ff'; c.shadowBlur = 6;
    C.l.forEach(([a, b], i) => {
      const k = Math.min(1, Math.max(0, trace - i)); if (!k) return;
      const [ax, ay] = pts[a], [bx, by] = pts[b];
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + (bx - ax) * k, ay + (by - ay) * k); c.stroke();
      if (k === 1 && chimed <= i) { chimed = i + 1; sfx.shimmer?.(i); }
    });
    c.shadowBlur = 10; c.shadowColor = '#fff6c0';
    pts.forEach(([x, y], i) => { const tw = 2.1 + Math.sin(t * 3 + i) * 0.4; c.fillStyle = '#fff6d0'; c.beginPath(); c.arc(x, y, tw, 0, 6.28); c.fill(); });
    c.shadowBlur = 0;
    const v = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.85)'); // the round eyepiece
    c.fillStyle = v; c.fillRect(0, 0, W, H);
    if (trace >= C.l.length) el.classList.add('done');
  };
  const loop = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; step(dt); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  const close = () => { if (closed) return; closed = true; cancelAnimationFrame(raf); el.remove(); onDone?.(); };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (shoot && !caught && shoot.t < 0.75) { caught = true; shoot.t = 0.9; el.classList.add('caught'); sfx.jingle?.(2); onCatch?.(); return; } // tap a shooting star as it streaks past
    if (el.classList.contains('done')) close();
  });
  el.__stars = { step, close, get shoot() { return shoot; }, set shoot(v) { shoot = v; } };
  return el;
}
