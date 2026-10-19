// All sound is synthesised: squeaky critter voices, cartoon impacts and a chiptune-pop battle theme.
let ctx = null, master = null, sfxBus = null, musBus = null, comp = null, synthBus = null;
let noiseBuf = null;
export const vol = { master: 0.9, sfx: 0.9, music: 0.55 };

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  master = ctx.createGain(); master.gain.value = vol.master;
  sfxBus = ctx.createGain(); sfxBus.gain.value = vol.sfx;
  musBus = ctx.createGain(); musBus.gain.value = vol.music;
  sfxBus.connect(comp); musBus.connect(comp); comp.connect(master); master.connect(ctx.destination);
  // melodic parts go through a bus that ducks under each kick (sidechain pump) and under big impacts
  synthBus = ctx.createGain(); synthBus.connect(musBus);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export function setVolumes() {
  if (!ctx) return;
  master.gain.value = vol.master; sfxBus.gain.value = vol.sfx; musBus.gain.value = vol.music;
}

const now = () => ctx.currentTime;

function env(g, t, a, peak, d, sus = 0, hold = false) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  // held sounds (drones, wind) stay up and only fade over their last 0.4 s
  if (hold && d > 0.5) g.gain.setValueAtTime(peak, t + a + d - 0.4);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus || 0.0001), t + a + d);
}

function osc(type, f0, f1, dur, peak = 0.3, { t = now(), bus = sfxBus, attack = 0.005, curve = 'exp', detune = 0, hold = false } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.detune.value = detune;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) curve === 'exp' ? o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur) : o.frequency.linearRampToValueAtTime(f1, t + dur);
  env(g, t, attack, peak, dur, 0, hold);
  o.connect(g); g.connect(bus);
  o.start(t); o.stop(t + attack + dur + 0.05);
  return o;
}

function noise(dur, peak, { t = now(), type = 'bandpass', f0 = 1000, f1 = f0, q = 1, bus = sfxBus, attack = 0.003, hold = false } = {}) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; // the buffer is 1 s; long sounds loop it
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain(); env(g, t, attack, peak, dur, 0, hold);
  s.connect(f); f.connect(g); g.connect(bus);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.1);
}

export const sfx = {
  hit(heavy = false) {
    if (!ctx) return;
    osc('sine', heavy ? 160 : 220, 40, heavy ? 0.22 : 0.12, heavy ? 0.7 : 0.5);
    noise(heavy ? 0.18 : 0.09, heavy ? 0.6 : 0.4, { f0: 3000, f1: 400, q: 0.7 });
    if (heavy) osc('square', 90, 30, 0.25, 0.18);
  },
  bonk() {
    if (!ctx) return;
    const t = now();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(700, t);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.32);
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 28; lg.gain.value = 60;
    lfo.connect(lg); lg.connect(o.frequency);
    env(g, t, 0.004, 0.35, 0.4);
    o.connect(g); g.connect(sfxBus);
    o.start(t); lfo.start(t); o.stop(t + 0.5); lfo.stop(t + 0.5);
  },
  whoosh(pitch = 1) {
    if (!ctx) return;
    noise(0.16, 0.22, { f0: 600 * pitch, f1: 2800 * pitch, q: 2, attack: 0.04 });
  },
  // stadium tricks (R179): laser sweep, rogue wave, crosswind, spore cloud
  laser(dur = 3.2) {
    if (!ctx) return;
    osc('sawtooth', 220, 1400, 0.25, 0.1); // charge-up zip
    osc('sawtooth', 110, 104, dur, 0.06, { attack: 0.08, hold: true }); // buzzing beam drone
    osc('square', 220, 214, dur, 0.035, { attack: 0.08, hold: true });
    noise(dur, 0.06, { f0: 3200, f1: 2600, q: 6, attack: 0.1, hold: true });
  },
  wave() {
    if (!ctx) return;
    noise(1.6, 0.32, { f0: 300, f1: 1400, q: 0.7, attack: 0.5, type: 'lowpass' }); // the swell rolling in
    noise(0.9, 0.22, { f0: 2400, f1: 900, q: 0.8, attack: 0.25 });
  },
  wind(dur = 4) {
    if (!ctx) return;
    noise(dur, 0.2, { f0: 500, f1: 1100, q: 3, attack: 0.6, hold: true });
    noise(dur * 0.8, 0.1, { f0: 1600, f1: 900, q: 5, attack: 0.8, hold: true });
  },
  spores() { if (ctx) { noise(0.6, 0.25, { f0: 1200, f1: 300, q: 1, attack: 0.03, type: 'lowpass' }); osc('sine', 300, 140, 0.3, 0.12); } },
  // a springy tongue: thwip out, slurp back
  thwip() { if (ctx) { osc('square', 300, 1400, 0.09, 0.07); noise(0.1, 0.12, { f0: 1800, f1: 4000, q: 4 }); } },
  slurp() { if (ctx) { osc('sine', 1200, 260, 0.18, 0.18); osc('triangle', 600, 180, 0.14, 0.08); } },
  dodge() { if (ctx) { noise(0.2, 0.25, { f0: 2400, f1: 500, q: 3, attack: 0.02 }); osc('sine', 900, 1500, 0.08, 0.06); } },
  // Snowball Toss: a throw whoosh, then a soft crunchy splat when it lands (a bright sparkle on a golden snowman)
  snowball(gold = false) {
    if (!ctx) return;
    const t = now() + 0.2;
    noise(0.12, 0.08, { f0: 900, f1: 2600, q: 2 });
    noise(0.16, 0.3, { t, f0: 1500, f1: 400, q: 0.8, type: 'lowpass' }); noise(0.08, 0.1, { t, f0: 4200, q: 2 }); osc('sine', 160, 70, 0.12, 0.15, { t });
    if (gold) [1320, 1760, 2200].forEach((f, i) => osc('triangle', f, f, 0.12, 0.06, { t: t + 0.05 + i * 0.06 }));
  },
  // a soft footfall that sounds like the ground under the hero
  foot(kind = 'grass') {
    if (!ctx) return;
    const v = 0.05;
    if (kind === 'sand') noise(0.07, v * 1.3, { f0: 2600, f1: 1400, q: 0.8 });
    else if (kind === 'snow') { noise(0.09, v * 1.5, { f0: 1800, f1: 700, q: 1.2 }); noise(0.05, v * 0.6, { f0: 5000, q: 2 }); }
    else if (kind === 'wood') { osc('sine', 210, 120, 0.06, v * 2.2); noise(0.03, v, { f0: 700, q: 2, type: 'lowpass' }); }
    else if (kind === 'stone') { osc('triangle', 520, 300, 0.03, v * 1.2); noise(0.03, v, { f0: 3200, q: 3 }); }
    else if (kind === 'ice') osc('sine', 1800, 2400, 0.04, v * 0.7);
    else noise(0.05, v, { f0: 1100, f1: 600, q: 1, type: 'lowpass' });
  },
  // world ambience: little one-shots the World sprinkles in now and then, by place, clock and weather
  ambient(kind) {
    if (!ctx) return;
    const t = now(), r = Math.random;
    if (kind === 'bird') { // a two- or three-note chirp
      const f = 2600 + r() * 1400, n = 2 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) osc('sine', f * (1 + (i % 2) * 0.18), f * (1.25 + r() * 0.2), 0.07, 0.035, { t: t + i * 0.11, attack: 0.008 });
    } else if (kind === 'owl') { // a far-off owl: hoo... hoo-hoo
      for (const [dt, d] of [[0, 0.32], [0.55, 0.16], [0.75, 0.3]]) osc('sine', 410, 360, d, 0.05, { t: t + dt, attack: 0.06 });
    } else if (kind === 'rooster') { // a far-off rooster: cock-a-doodle-doooo
      for (const [dt, f0, f1, d] of [[0, 520, 640, 0.12], [0.16, 600, 700, 0.1], [0.3, 640, 760, 0.12], [0.46, 780, 560, 0.55]]) { osc('sawtooth', f0, f1, d, 0.018, { t: t + dt, attack: 0.03 }); osc('sine', f0 * 2, f1 * 2, d, 0.012, { t: t + dt, attack: 0.03 }); }
    } else if (kind === 'cricket') { // a soft trill
      for (let i = 0; i < 6; i++) osc('triangle', 4300, 4200, 0.025, 0.012, { t: t + i * 0.045 + (i > 2 ? 0.12 : 0), attack: 0.004 });
    } else if (kind === 'surf') { // a wave washing up the beach and hissing back
      noise(2.2, 0.06, { f0: 350, f1: 1200, q: 0.6, attack: 0.9, type: 'lowpass' });
      noise(1.4, 0.025, { t: t + 1.0, f0: 3200, f1: 1600, q: 0.8, attack: 0.3 });
    } else if (kind === 'rain') noise(1.8, 0.035, { f0: 4200, f1: 3600, q: 0.5, attack: 0.5, type: 'highpass', hold: true });
    else if (kind === 'wind') noise(3, 0.04, { f0: 420, f1: 900, q: 2.5, attack: 1.0, hold: true });
    else if (kind === 'hum') noise(2.5, 0.025, { f0: 140, f1: 180, q: 1.5, attack: 0.8, type: 'lowpass', hold: true });
    else if (kind === 'pop') { noise(0.5, 0.12, { f0: 2400, f1: 300, q: 0.7, attack: 0.004, type: 'lowpass' }); osc('sine', 160, 60, 0.25, 0.1); for (let i = 0; i < 4; i++) noise(0.05, 0.03, { t: t + 0.15 + i * 0.07 + r() * 0.05, f0: 5000, q: 2 }); }
    else if (kind === 'bubble') for (let i = 0; i < 3; i++) osc('sine', 300 + r() * 200, 700 + r() * 300, 0.05, 0.03, { t: t + i * 0.09 + r() * 0.05 });
  },
  step() { if (ctx) noise(0.04, 0.06, { f0: 900, q: 1.5, type: 'lowpass' }); },
  land() { if (ctx) { osc('sine', 120, 50, 0.15, 0.4); noise(0.2, 0.25, { f0: 600, f1: 200, type: 'lowpass' }); } },
  voice(pitch = 1, kind = 'attack') {
    if (!ctx) return;
    // tiny formant-ish squeak: two detuned glides
    const t = now();
    const shapes = {
      attack: [[1.0, 1.35, 0.09], [1.3, 1.1, 0.07]],
      hurt: [[1.5, 0.8, 0.16]],
      ko: [[1.4, 1.6, 0.12], [1.6, 0.5, 0.45]],
      win: [[1.0, 1.5, 0.1], [1.25, 1.25, 0.08], [1.5, 2.0, 0.18]],
      special: [[1.0, 1.8, 0.2]],
      taunt: [[1.2, 1.0, 0.1], [1.2, 1.5, 0.1]],
    }[kind] || [[1, 1.2, 0.1]];
    let tt = t;
    const base = 520 * pitch;
    for (const [a, b, d] of shapes) {
      osc('square', base * a, base * b, d, 0.08, { t: tt, attack: 0.01 });
      osc('sine', base * a * 2, base * b * 2, d, 0.1, { t: tt, attack: 0.01 });
      tt += d * 0.9;
    }
  },
  fire() { if (!ctx) return; noise(0.45, 0.45, { f0: 400, f1: 1800, q: 0.8, attack: 0.02 }); osc('sawtooth', 120, 60, 0.4, 0.12); },
  water() {
    if (!ctx) return;
    const t = now();
    for (let i = 0; i < 5; i++) osc('sine', 400 + Math.random() * 600, 1400 + Math.random() * 800, 0.06, 0.18, { t: t + i * 0.045 });
  },
  leaf() { if (!ctx) return; noise(0.3, 0.3, { f0: 1500, f1: 4000, q: 4, attack: 0.03 }); osc('triangle', 600, 900, 0.15, 0.08); },
  spark() {
    if (!ctx) return;
    const t = now();
    for (let i = 0; i < 6; i++) osc('sawtooth', 1800 + Math.random() * 2000, 200, 0.05, 0.12, { t: t + i * 0.03 });
    noise(0.25, 0.3, { f0: 6000, f1: 2000, q: 1, type: 'highpass' });
  },
  superCharge() { if (!ctx) return; osc('sawtooth', 200, 1600, 0.8, 0.15, { attack: 0.1 }); noise(0.8, 0.2, { f0: 300, f1: 5000, q: 2, attack: 0.3 }); },
  // per-critter victory fanfare, pitched by the critter's voice
  fanfare(def) {
    if (!ctx) return;
    const t = now() + 0.05, v = Math.log2(def.voice || 1) * 12;
    const motif = FANFARES[def.type] || FANFARES.fire;
    motif.forEach(([n, d, at], i) => {
      const f = N(n + Math.round(v));
      osc('square', f, f, d, 0.09, { t: t + at, detune: -5, attack: 0.01 });
      osc('triangle', f / 2, f / 2, d, 0.12, { t: t + at });
      if (i === motif.length - 1) osc('sine', f * 2, f * 2, d * 1.4, 0.06, { t: t + at });
    });
    duck(0.25, 1.2);
  },
  boom() {
    if (!ctx) return;
    osc('sine', 120, 28, 0.9, 0.9);
    noise(0.9, 0.7, { f0: 2400, f1: 80, type: 'lowpass', q: 0.5 });
    duck(0.35, 0.7);
  },
  cheer(amount = 1) {
    if (!ctx) return;
    const t = now();
    for (let i = 0; i < 3; i++) noise(1.3 + i * 0.3, 0.07 * amount, { t: t + i * 0.08, f0: 900 + i * 400, f1: 1600 + i * 300, q: 0.6, attack: 0.25 });
  },
  aww() { if (ctx) noise(1.2, 0.08, { f0: 1200, f1: 500, q: 1.2, attack: 0.2 }); },
  shutter() {
    if (!ctx) return;
    noise(0.05, 0.35, { type: 'highpass', f0: 3000 });
    noise(0.07, 0.3, { type: 'bandpass', f0: 1800, q: 2, t: now() + 0.07 });
    osc('square', 1400, 900, 0.04, 0.08, { t: now() + 0.07 });
  },
  ui(kind = 'move') {
    if (!ctx) return;
    if (kind === 'move') osc('square', 880, 880, 0.04, 0.06);
    else if (kind === 'ok') { osc('square', 660, 660, 0.05, 0.08); osc('square', 990, 990, 0.09, 0.08, { t: now() + 0.06 }); }
    else if (kind === 'back') osc('square', 440, 330, 0.08, 0.07);
    else if (kind === 'bounce') osc('triangle', 320, 170, 0.09, 0.14);
  },
  beep(hi = false) { if (ctx) { osc('square', hi ? 1320 : 660, hi ? 1320 : 660, hi ? 0.4 : 0.15, 0.12); } },
  block() { if (!ctx) return; osc('triangle', 520, 380, 0.09, 0.18); noise(0.08, 0.15, { f0: 3000, f1: 1500, q: 2 }); },
  parry() {
    if (!ctx) return;
    const t = now();
    osc('square', 1400, 1400, 0.06, 0.12); osc('sine', 2100, 2000, 0.4, 0.14, { t: t + 0.03 });
    noise(0.15, 0.2, { f0: 6000, f1: 3000, q: 3 });
  },
  // a door: a soft wooden creak, plus a shop bell for the Berry Centers
  door(bell = false) {
    if (!ctx) return; const t = now();
    noise(0.18, 0.12, { t, type: 'bandpass', f0: 420, f1: 260, q: 6 });
    osc('triangle', 150, 110, 0.12, 0.1, { t: t + 0.02 });
    if (bell) [1568, 2093].forEach((f, i) => osc('sine', f, f, 0.5, 0.08, { t: t + 0.08 + i * 0.09 }));
  },
  pickup() { if (!ctx) return; const t = now(); [880, 1175, 1568].forEach((f, i) => osc('triangle', f, f, 0.12, 0.12, { t: t + i * 0.06 })); },
  // short rising arpeggio for announcer callouts; level 0..3 climbs higher
  jingle(level = 1) {
    if (!ctx) return;
    const t = now(), base = [523, 587, 659, 784][Math.min(3, level)];
    [1, 1.26, 1.5, 2].forEach((m, i) => osc('square', base * m, base * m, 0.09, 0.07, { t: t + i * 0.055 }));
    osc('triangle', base * 2, base * 2.02, 0.35, 0.08, { t: t + 0.22 });
  },
  // growing: a soft shimmer that climbs with k (0..1), then a bright chord when the new form appears
  shimmer(k = 0) { if (!ctx) return; const f = 520 + k * 900; osc('sine', f, f * 1.5, 0.16, 0.07); osc('triangle', f * 2, f * 2.6, 0.1, 0.03); },
  note(i = 0) { if (!ctx) return; const f = [523, 659, 784, 880, 1047][i % 5]; osc('sine', f, f, 0.5, 0.16); osc('triangle', f * 2, f * 2, 0.22, 0.04); }, // the fairy ring's toadstool bells
  firework() { if (!ctx) return; noise(0.35, 0.1, { f0: 900, f1: 120 }); osc('sine', 1400 + Math.random() * 600, 2600, 0.25, 0.025); },
  grown() {
    if (!ctx) return;
    const t = now();
    [523, 659, 784, 1047].forEach((f, i) => { osc('triangle', f, f, 0.9, 0.09, { t: t + i * 0.07 }); osc('square', f * 2, f * 2, 0.08, 0.03, { t: t + i * 0.07 }); });
    noise(0.8, 0.12, { f0: 6000, f1: 2000, q: 0.7 });
  },
  // arena hazard telegraph: a quick rising two-tone chirp
  warn() {
    if (!ctx) return;
    const t = now();
    osc('square', 880, 880, 0.07, 0.06, { t });
    osc('square', 1175, 1175, 0.09, 0.06, { t: t + 0.09 });
  },
  rumble() { if (!ctx) return; noise(0.5, 0.35, { f0: 200, f1: 60, q: 1 }); osc('sine', 70, 40, 0.5, 0.3); },
  gong() { if (!ctx) return; osc('triangle', 220, 210, 1.6, 0.35); osc('sine', 330, 320, 1.4, 0.2); osc('sine', 554, 540, 1.0, 0.1); },
  ko() { if (!ctx) return; osc('sawtooth', 600, 60, 1.0, 0.25); this.boom(); },
};

// ---------- music ----------
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);

// [midi note, duration s, start s] motifs per type
const FANFARES = {
  fire:  [[72, 0.1, 0], [76, 0.1, 0.1], [79, 0.1, 0.2], [84, 0.45, 0.3]],
  water: [[79, 0.08, 0], [77, 0.08, 0.08], [76, 0.08, 0.16], [79, 0.08, 0.24], [84, 0.5, 0.32]],
  leaf:  [[76, 0.12, 0], [79, 0.12, 0.14], [81, 0.12, 0.28], [79, 0.1, 0.42], [84, 0.45, 0.54]],
  spark: [[84, 0.06, 0], [79, 0.06, 0.07], [84, 0.06, 0.14], [79, 0.06, 0.21], [88, 0.4, 0.28]],
  stone: [[60, 0.18, 0], [60, 0.1, 0.22], [67, 0.18, 0.34], [72, 0.5, 0.56]],
  gust:  [[74, 0.12, 0], [79, 0.12, 0.12], [83, 0.12, 0.24], [86, 0.5, 0.36]],
};

// briefly pull the music down (big hits, fanfares)
export function duck(amount = 0.4, dur = 0.5) {
  if (!ctx) return;
  const g = musBus.gain, t = now();
  g.cancelScheduledValues(t);
  g.setValueAtTime(vol.music * amount, t + 0.01);
  g.linearRampToValueAtTime(vol.music, t + dur);
}

// low-health tension: extra 16th hats and a busier bass
let intensity = 0;
export function setIntensity(v) { intensity = v; }
let musicTimer = null, musicStep = 0, nextT = 0, currentSong = null;

const SONGS = {
  battle: {
    bpm: 148,
    // A minor-ish pop: Am F C G | Am F G E
    chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]],
    // lead melody in 16ths per bar (null = rest), 8 bars
    lead: [
      [76, null, 74, 76, null, 79, null, 76, 74, null, 72, null, 69, null, 72, null],
      [74, null, 72, 74, null, 77, null, 74, 72, null, 69, null, 65, null, null, null],
      [72, null, 74, 76, null, 79, null, 81, 79, null, 76, null, 72, null, 74, null],
      [74, null, null, 71, null, 74, null, 79, 78, null, 79, null, 81, null, 83, null],
      [84, null, 83, 81, null, 79, null, 76, 79, null, 81, null, 76, null, 72, null],
      [77, null, 76, 74, null, 72, null, 69, 72, null, 74, null, 77, null, 81, null],
      [79, null, 77, 79, null, 81, null, 83, 86, null, 83, null, 79, null, 74, null],
      [80, null, null, 76, null, null, 80, null, 83, null, null, 80, 88, null, null, null],
    ],
    drums: 'k.h.s.hkk.h.s.hh',
  },
  menu: {
    bpm: 112,
    chords: [[48, 52, 55, 59], [45, 48, 52, 55], [53, 57, 60, 64], [55, 59, 62, 65]],
    lead: [
      [72, null, null, 76, null, null, 79, null, 77, null, 76, null, 74, null, null, null],
      [72, null, null, 69, null, null, 72, null, 76, null, null, null, null, null, null, null],
      [77, null, null, 76, null, null, 74, null, 72, null, 74, null, 76, null, null, null],
      [79, null, null, 77, null, 76, null, 74, 71, null, null, null, 74, null, null, null],
    ],
    drums: 'k...s..kk...s...',
  },
  // Critter Camp: a slow, cosy campfire tune
  camp: {
    bpm: 90,
    inst: { lead: 'triangle', lead2: 'sine', leadVol: 0.11, bass: 'sine', bassVol: 0.22, stab: 'sine' },
    chords: [[53, 57, 60, 64], [48, 52, 55, 59], [50, 53, 57, 60], [46, 50, 53, 57], [53, 57, 60, 64], [45, 48, 52, 55], [46, 50, 53, 57], [48, 52, 55, 58]],
    lead: [
      [72, null, null, 69, null, null, 72, null, 74, null, null, null, 72, null, null, null],
      [71, null, null, 67, null, null, 69, null, 71, null, 72, null, null, null, null, null],
      [74, null, null, 72, null, null, 69, null, 72, null, null, 69, null, null, null, null],
      [70, null, null, null, 69, null, 67, null, 65, null, null, null, null, null, null, null],
      [72, null, null, 76, null, null, 77, null, 76, null, 74, null, 72, null, null, null],
      [72, null, null, 69, null, null, 67, null, 64, null, null, null, null, null, null, null],
      [65, null, 67, null, 69, null, 70, null, 74, null, null, 72, null, null, null, null],
      [72, null, null, null, 70, null, null, null, 67, null, null, null, null, null, null, null],
    ],
    drums: 'k.......s.......',
  },
  // Cloudtop Gardens: a breezy, bouncy tune with a music-box lead
  sky: {
    bpm: 132,
    inst: { lead: 'triangle', lead2: 'square', leadVol: 0.1, bass: 'sine', bassVol: 0.2, stab: 'triangle' },
    chords: [[53, 57, 60, 64], [50, 53, 57, 60], [46, 50, 53, 57], [48, 52, 55, 58], [53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 60]],
    lead: [
      [77, null, 81, null, 84, null, 81, null, 79, null, 77, null, 76, null, 77, null],
      [74, null, 77, null, 81, null, 77, null, 76, null, 74, null, 72, null, null, null],
      [70, null, 74, null, 77, null, 82, null, 81, null, 79, null, 77, null, 74, null],
      [76, null, null, 79, null, null, 84, null, 82, null, 81, null, 79, null, null, null],
      [77, 79, 81, null, 84, null, 89, null, 88, null, 86, null, 84, null, 81, null],
      [83, null, 79, null, 76, null, 79, null, 83, null, 86, null, 84, null, null, null],
      [81, null, 77, null, 74, null, 77, null, 81, null, 84, null, 82, null, 81, null],
      [79, null, null, null, 76, null, null, null, 77, null, null, null, null, null, null, null],
    ],
    drums: 'k..hs.h.k.hhs.h.',
  },
  grove: {
    // a sleepy forest waltz-ish groove in D dorian, plinky like a music box
    bpm: 112,
    inst: { lead: 'sine', lead2: 'triangle', leadVol: 0.13, bass: 'triangle', bassVol: 0.22, stab: 'sine' },
    chords: [[50, 53, 57, 60], [48, 52, 55, 59], [50, 53, 57, 60], [55, 59, 62, 65], [53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 62], [52, 57, 59, 64]],
    lead: [
      [74, null, 77, null, 81, null, 79, 77, 76, null, 74, null, 72, null, 74, null],
      [72, null, 76, null, 79, null, 76, null, 74, null, 72, null, 71, null, null, null],
      [74, null, 77, null, 81, null, 84, null, 83, null, 81, null, 79, null, 77, null],
      [79, null, null, 83, null, null, 86, null, 84, null, 83, null, 81, null, null, null],
      [77, null, 81, null, 84, null, 81, null, 79, 77, 76, null, 77, null, 79, null],
      [76, null, 79, null, 83, null, 79, null, 76, null, 74, null, 71, null, null, null],
      [74, 77, 81, null, 86, null, 84, null, 81, null, 79, null, 77, null, 74, null],
      [76, null, null, null, 73, null, null, null, 74, null, null, null, null, null, null, null],
    ],
    drums: 'k...h.s.k.h.s.hh',
  },
  beach: {
    bpm: 120,
    inst: { lead: 'triangle', lead2: 'sine', leadVol: 0.12, steel: true, bass: 'sine', stab: 'triangle' },
    chords: [[48, 52, 55, 59], [45, 48, 52, 55], [53, 57, 60, 64], [55, 59, 62, 65], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62], [45, 48, 52, 55]],
    lead: [
      [72, null, 76, null, 79, null, 76, 74, 72, null, null, 69, null, 72, null, null],
      [74, null, 77, null, 81, null, 79, 77, 76, null, null, 72, null, null, null, null],
      [77, null, 81, null, 84, null, 81, 79, 77, null, 76, null, 74, null, 72, null],
      [79, null, null, 77, 79, null, 81, null, 83, null, null, null, 79, null, null, null],
      [81, null, 79, 77, null, 77, null, 76, 77, null, 81, null, 84, null, null, null],
      [83, null, 81, 79, null, 79, null, 77, 79, null, 83, null, 86, null, null, null],
      [84, null, 83, 81, 79, null, 76, null, 79, null, 77, null, 76, null, 74, null],
      [72, null, null, 76, null, null, 79, null, 84, null, null, null, null, null, null, null],
    ],
    drums: 'k..s..s.k..s..s.',
  },
  volcano: {
    bpm: 160,
    inst: { lead: 'sawtooth', lead2: 'square', leadVol: 0.06, bass: 'sawtooth', bassVol: 0.18, stab: 'sawtooth' },
    chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52], [50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]],
    lead: [
      [74, null, 74, 77, null, 74, null, 72, 74, null, null, 69, null, 72, null, null],
      [70, null, 70, 74, null, 77, null, 74, 72, null, 70, null, 69, null, null, null],
      [72, null, 72, 76, null, 79, null, 76, 77, null, 76, null, 74, null, 72, null],
      [73, null, null, 76, null, 81, null, null, 79, null, 77, null, 76, null, 73, null],
      [86, null, 84, 86, null, 81, null, 77, 79, null, 81, null, 82, null, null, null],
      [82, null, 81, 82, null, 77, null, 74, 77, null, 79, null, 81, null, null, null],
      [79, null, 77, 79, null, 74, null, 70, 74, null, 77, null, 79, null, 82, null],
      [81, null, null, null, 85, null, null, null, 88, null, null, null, null, null, null, null],
    ],
    drums: 'k.hkskh.k.hksk.s',
  },
  boss: {
    bpm: 170,
    inst: { lead: 'square', lead2: 'sawtooth', leadVol: 0.08, bass: 'sawtooth', bassVol: 0.2, stab: 'sawtooth' },
    chords: [[52, 55, 59], [48, 52, 55], [50, 54, 57], [47, 51, 54], [52, 55, 59], [48, 52, 55], [45, 48, 52], [47, 51, 54]],
    lead: [
      [76, null, null, 79, null, null, 83, null, 82, null, 79, null, 76, null, null, null],
      [76, null, null, 79, null, null, 84, null, 83, null, 79, null, 76, null, null, null],
      [74, null, null, 78, null, null, 81, null, 86, null, 84, null, 83, null, 81, null],
      [78, null, null, null, 75, null, null, null, 71, null, 75, null, 78, null, 83, null],
      [88, null, 86, 88, null, 83, null, 79, 84, null, 83, null, 79, null, 76, null],
      [84, null, 83, 84, null, 79, null, 76, 79, null, 81, null, 83, null, 84, null],
      [81, null, 79, 81, null, 76, null, 72, 76, null, 79, null, 81, null, 84, null],
      [87, null, null, null, 86, null, null, null, 83, null, null, 79, 78, null, 75, null],
    ],
    drums: 'kkhskhhkk.hsk.ss',
  },
  frost: {
    bpm: 136,
    inst: { lead: 'sine', leadVol: 0.13, steel: true, bass: 'triangle', stab: 'triangle' },
    chords: [[55, 59, 62], [52, 55, 59], [48, 52, 55], [50, 54, 57], [55, 59, 62], [52, 55, 59], [48, 52, 55, 59], [50, 54, 57, 60]],
    lead: [
      [79, null, 83, null, 86, null, 83, null, 81, null, 79, null, 78, null, 79, null],
      [76, null, 79, null, 83, null, 81, null, 79, null, null, null, 76, null, null, null],
      [72, null, 76, null, 79, null, 84, null, 83, null, 79, null, 76, null, 79, null],
      [78, null, 81, null, 86, null, 84, null, 81, null, null, null, 78, null, null, null],
      [91, null, 86, null, 83, null, 86, null, 88, null, 86, null, 83, null, 81, null],
      [83, null, 79, null, 76, null, 79, null, 83, null, 86, null, 88, null, null, null],
      [84, null, 83, null, 79, null, 76, null, 79, null, 83, null, 84, null, 86, null],
      [86, null, null, null, 90, null, null, null, 91, null, null, null, null, null, null, null],
    ],
    drums: 'k...s..hk.k.s..h',
  },
  neon: {
    // synthwave: Dm Bb F C | Dm Bb C A
    bpm: 124,
    inst: { lead: 'sawtooth', lead2: 'square', leadVol: 0.07, bass: 'sawtooth', bassVol: 0.2, stab: 'sawtooth' },
    chords: [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55], [50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]],
    lead: [
      [74, null, null, 77, null, null, 81, null, 79, null, 77, null, 76, null, 74, null],
      [74, null, null, 77, null, null, 82, null, 81, null, null, null, 77, null, null, null],
      [72, null, null, 77, null, null, 81, null, 84, null, 81, null, 79, null, 77, null],
      [76, null, null, 79, null, null, 84, null, 83, null, null, null, 79, null, null, null],
      [86, null, null, 84, null, 81, null, 77, 81, null, 84, null, 86, null, null, null],
      [82, null, null, 81, null, 77, null, 74, 77, null, 81, null, 82, null, null, null],
      [84, null, 83, 84, null, 79, null, 76, 79, null, 84, null, 88, null, null, null],
      [85, null, null, null, 81, null, null, null, 76, null, null, null, 73, null, null, null],
    ],
    drums: 'k.h.s.hkk.h.s.h.',
  },
  victory: {
    bpm: 132,
    chords: [[48, 52, 55], [53, 57, 60], [55, 59, 62], [48, 52, 55]],
    lead: [
      [72, null, 76, null, 79, null, 84, null, 84, null, 83, 84, 86, null, null, null],
      [81, null, 84, null, 81, null, 77, null, 81, null, 79, null, 77, null, null, null],
      [79, null, 83, null, 86, null, 83, null, 79, null, 81, null, 83, null, null, null],
      [84, null, null, null, 79, null, 76, null, 84, null, null, null, null, null, null, null],
    ],
    drums: 'k.h.s.h.k.h.s.hh',
  },
};

function playStep(song, step, t) {
  const spb = 60 / song.bpm / 4;
  const I = song.inst || {};
  const bars = song.lead.length;
  const bar = Math.floor(step / 16) % bars, s = step % 16;
  const chord = song.chords[bar % song.chords.length];
  const bus = synthBus;
  // bass: root on 8ths, octave bounce (16ths when tense)
  if (s % 2 === 0 || intensity > 0 && song !== SONGS.menu && song !== SONGS.camp) {
    const n = chord[0] - 12 + (s % 4 === 2 ? 12 : 0);
    osc(I.bass || 'triangle', N(n), N(n), spb * (s % 2 ? 0.8 : 1.6), (I.bassVol || 0.32) * (s % 2 ? 0.6 : 1), { t, bus });
  }
  // offbeat chord stabs
  if (s % 4 === 2) for (const n of chord) osc(I.stab || 'square', N(n), N(n), spb * 1.1, 0.035, { t, bus, detune: 6 });
  // arpeggio sparkle
  if (s % 2 === 1) { const n = chord[(s >> 1) % chord.length] + 24; osc('sine', N(n), N(n), spb * 0.8, 0.035, { t, bus }); }
  const ln = song.lead[bar][s];
  if (ln) {
    let len = 1; while (s + len < 16 && song.lead[bar][s + len] === null && len < 4) len++;
    if (I.steel) {
      // steel-drum-ish: short bright pluck with an octave shimmer
      osc('triangle', N(ln), N(ln), spb * 2, I.leadVol, { t, bus, attack: 0.004 });
      osc('sine', N(ln + 12), N(ln + 12), spb * 1.2, I.leadVol * 0.4, { t, bus, attack: 0.004 });
    } else {
      const o = osc(I.lead || 'square', N(ln), N(ln), spb * len * 0.95, I.leadVol || 0.075, { t, bus, attack: 0.01, detune: -4 });
      osc(I.lead2 || 'sawtooth', N(ln), N(ln), spb * len * 0.9, (I.leadVol || 0.075) * 0.4, { t, bus, attack: 0.01, detune: 7 });
      // vibrato on longer notes
      if (len > 2) { const l = ctx.createOscillator(), g = ctx.createGain(); l.frequency.value = 6; g.gain.value = 5; l.connect(g); g.connect(o.frequency); l.start(t + spb); l.stop(t + spb * len); }
    }
  }
  const d = song.drums[s];
  if (d === 'k') {
    osc('sine', 150, 40, 0.16, 0.55, { t, bus: musBus });
    // sidechain pump
    synthBus.gain.setValueAtTime(0.5, t);
    synthBus.gain.linearRampToValueAtTime(1, t + spb * 1.8);
  }
  if (d === 's') { noise(0.14, 0.28, { t, bus: musBus, f0: 1800, f1: 900, q: 0.6 }); osc('triangle', 220, 160, 0.08, 0.15, { t, bus: musBus }); }
  if (d === 'h' || s % 2 === 1 || intensity > 0) noise(0.03, s % 2 ? 0.07 : 0.05, { t, bus: musBus, type: 'highpass', f0: 7000 });
}

export function playMusic(name) {
  if (!ctx || currentSong === name) return;
  stopMusic();
  currentSong = name;
  intensity = 0;
  const song = SONGS[name];
  if (!song) return;
  musicStep = 0;
  nextT = ctx.currentTime + 0.1;
  const spb = 60 / song.bpm / 4;
  musicTimer = setInterval(() => {
    while (nextT < ctx.currentTime + 0.25) {
      playStep(song, musicStep, nextT);
      musicStep++;
      nextT += spb;
    }
  }, 50);
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  currentSong = null;
}
