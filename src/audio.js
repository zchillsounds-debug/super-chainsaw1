// Procedural WebAudio: SFX, ambient wind, vocal cues and an Abbasid-court style score:
// oud and qanun voices improvising in maqam Rast (exploring) and Bayati (combat) over daff rhythms.
export class Audio {
  constructor() { this.ctx = null; this.enabled = true; }
  init() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    this.ctx = new C();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.8; this.sfx.connect(this.master);
    this.music = this.ctx.createGain(); this.music.gain.value = 0.22; this.music.connect(this.master);
    // reverb (generated impulse)
    this.verb = this.ctx.createConvolver();
    const len = this.ctx.sampleRate * 2.4, buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.verb.buffer = buf; const vg = this.ctx.createGain(); vg.gain.value = 0.35; this.verb.connect(vg); vg.connect(this.master);
    this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.startWind(); this.startMusic();
  }
  noise(dur, f0, f1, q = 1, gain = 0.5, type = 'bandpass', dest = this.sfx) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.05);
  }
  tone(freq, dur, type = 'sine', gain = 0.3, slide = 1, dest = this.sfx) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur);
  }
  swing() { this.noise(0.22, 600, 2400, 1.2, 0.35); }
  hit() { this.noise(0.12, 1800, 400, 0.8, 0.6); this.tone(110, 0.12, 'triangle', 0.4, 0.5); }
  crit() { this.hit(); this.tone(1400, 0.25, 'square', 0.08, 0.6); }
  clang() { this.tone(1800, 0.3, 'triangle', 0.12, 0.97); this.tone(2650, 0.25, 'sine', 0.08, 1); }
  boom() { this.noise(0.9, 900, 60, 0.7, 0.9, 'lowpass'); this.tone(60, 0.6, 'sine', 0.6, 0.4); }
  whoosh() { this.noise(0.5, 300, 1600, 0.8, 0.4); }
  pickup() { this.tone(880, 0.12, 'sine', 0.15); setTimeout(() => this.tone(1320, 0.2, 'sine', 0.12), 70); }
  gold() { for (let i = 0; i < 3; i++) setTimeout(() => this.tone(2000 + Math.random() * 800, 0.08, 'triangle', 0.06), i * 40); }
  legendary() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.6, 'triangle', 0.12), i * 90)); }
  stagger() { this.tone(220, 0.35, 'triangle', 0.18, 0.6); this.noise(0.3, 900, 300, 1.5, 0.35); }
  denied() { this.tone(160, 0.12, 'square', 0.05, 0.9); }
  grunt() { this.noise(0.25, 400, 200, 3, 0.4); }
  death() { this.noise(0.6, 500, 120, 2, 0.4); }
  roar() { this.noise(1.6, 200, 70, 2, 0.9, 'lowpass'); this.tone(55, 1.6, 'sawtooth', 0.15, 0.7); }
  levelUp() { [392, 494, 587, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.8, 'triangle', 0.14), i * 120)); }
  potion() { for (let i = 0; i < 4; i++) setTimeout(() => this.tone(300 + i * 60, 0.15, 'sine', 0.1, 1.3), i * 60); }
  startWind() {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.6;
    const g = this.ctx.createGain(); g.gain.value = 0.05;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = this.ctx.createGain(); lg.gain.value = 250;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    s.connect(f); f.connect(g); g.connect(this.master); s.start();
  }

  // ---------------------------------------------------------------- instruments
  // Karplus-Strong string; buffers are cached per pitch and timbre.
  ksBuffer(freq, bright, decay) {
    const key = Math.round(freq * 4) + ':' + bright + ':' + decay;
    this._ks ??= new Map();
    if (this._ks.has(key)) return this._ks.get(key);
    const sr = this.ctx.sampleRate, N = Math.max(2, Math.round(sr / freq)), len = Math.floor(sr * (decay > 0.997 ? 2.2 : 1.3));
    const buf = this.ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), ring = new Float32Array(N);
    // plectrum (risha) excitation: a short noise burst, smoothed for the oud, raw for the qanun
    let prev = 0; for (let i = 0; i < N; i++) { const n = Math.random() * 2 - 1; prev = prev + (n - prev) * bright; ring[i] = prev; }
    let p = 0;
    for (let i = 0; i < len; i++) { const n = (p + 1) % N; ring[p] = (ring[p] + ring[n]) * 0.5 * decay; d[i] = ring[p]; p = n; }
    this._ks.set(key, buf); return buf;
  }
  string(freq, t, { gain = 0.2, bright = 0.35, decay = 0.996, cutoff = 2600, body = true, pan = 0, dest = this.musicBus } = {}) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.ksBuffer(freq, bright, decay);
    const g = c.createGain(); g.gain.value = gain;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
    s.connect(f);
    let out = f;
    if (body) { const b = c.createBiquadFilter(); b.type = 'peaking'; b.frequency.value = 180; b.Q.value = 1.2; b.gain.value = 6; f.connect(b); out = b; }
    const pn = c.createStereoPanner ? c.createStereoPanner() : null;
    out.connect(g); if (pn) { pn.pan.value = pan; g.connect(pn); pn.connect(dest); pn.connect(this.verb); } else { g.connect(dest); g.connect(this.verb); }
    s.start(t);
  }
  oud(freq, t, gain = 0.22) { this.string(freq, t, { gain, bright: 0.22, decay: 0.9975, cutoff: 1900, pan: -0.15 }); }
  qanun(freq, t, gain = 0.1, trem = 0) {
    for (let i = 0; i <= trem; i++) for (const dt of [0, 0.004]) this.string(freq * (dt ? 1.003 : 1), t + i * 0.075 + dt, { gain: gain * (i ? 0.7 : 1), bright: 0.75, decay: 0.994, cutoff: 5200, body: false, pan: 0.25 });
  }
  // daff frame drum: dum (deep centre stroke), tak (rim), and the jingle of its rings
  drum(kind, t, gain = 1, dest = this.drumBus) {
    const c = this.ctx;
    if (kind === 'dum') {
      const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
      g.gain.setValueAtTime(0.5 * gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.45);
    }
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(), g = c.createGain();
    if (kind === 'dum') { f.type = 'lowpass'; f.frequency.value = 500; g.gain.setValueAtTime(0.18 * gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); }
    else if (kind === 'tak') { f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 1.4; g.gain.setValueAtTime(0.22 * gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); }
    else { f.type = 'bandpass'; f.frequency.value = 7200; f.Q.value = 3; g.gain.setValueAtTime(0.07 * gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); }
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + 0.5);
  }

  // ---------------------------------------------------------------- score
  // Maqam scales in cents from the tonic (quarter tones included): Rast on C, Bayati on D.
  startMusic() {
    const c = this.ctx;
    this.musicBus = c.createGain(); this.musicBus.gain.value = 1; this.musicBus.connect(this.music);
    this.drumBus = c.createGain(); this.drumBus.gain.value = 0.7; this.drumBus.connect(this.music);
    this.combatBus = c.createGain(); this.combatBus.gain.value = 0; this.combatBus.connect(this.music);
    this.intensity = 0;
    const MAQ = {
      rast: { tonic: 130.81, cents: [0, 200, 350, 500, 700, 900, 1050, 1200] },
      bayati: { tonic: 146.83, cents: [0, 150, 300, 500, 700, 800, 1000, 1200] },
    };
    const freq = (m, deg) => { const n = m.cents.length - 1, o = Math.floor(deg / n), i = ((deg % n) + n) % n; return m.tonic * Math.pow(2, o + m.cents[i] / 1200); };
    // low drone on the tonic and fifth (a bowed, kamancheh-like tone) under combat
    const drone = (f) => { const o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = 420; g.gain.value = 0.045; o.connect(fl); fl.connect(g); g.connect(this.combatBus); o.start(); };
    drone(73.42); drone(110);
    // rhythms (16th grid): wahda for exploring, maqsum for combat
    const WAHDA = 'D...........t.t.', MAQSUM = 'D.t...t.D...t...';
    let next = c.currentTime + 0.6, step = 0, deg = 7, phraseLeft = 0, rest = 0;
    const sched = () => {
      const combat = this.intensity > 0.5, m = combat ? MAQ.bayati : MAQ.rast, bpm = combat ? 108 : 76, s16 = 60 / bpm / 4;
      while (next < c.currentTime + 0.25) {
        const pat = combat ? MAQSUM : WAHDA, ch = pat[step % 16];
        if (ch === 'D') this.drum('dum', next, combat ? 1 : 0.7);
        if (ch === 't') this.drum('tak', next, combat ? 0.9 : 0.5);
        if (combat && step % 2 === 1 && Math.random() < 0.35) this.drum('tak', next, 0.35);
        if (step % 8 === 4 && Math.random() < 0.6) this.drum('zil', next, combat ? 1 : 0.6);
        // melody: stepwise phrases resolving to the tonic; the qanun answers an octave up
        if (step % 2 === 0) {
          if (rest > 0) rest--;
          else if (Math.random() < (combat ? 0.8 : 0.55)) {
            if (phraseLeft <= 0) { phraseLeft = 6 + Math.floor(Math.random() * 6); deg = combat ? 3 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 4); }
            phraseLeft--;
            const target = phraseLeft <= 1 ? 0 : deg + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.8 ? 1 : 2);
            deg = Math.max(-2, Math.min(9, phraseLeft <= 1 ? Math.round((deg + 0) / 2) : target));
            const f = freq(m, deg);
            this.oud(f, next, combat ? 0.2 : 0.18);
            if (Math.random() < 0.18) this.oud(f, next + s16, 0.1); // risha double stroke
            if (phraseLeft <= 0) { this.qanun(freq(m, 7), next + s16 * 2, 0.07, 4); this.qanun(freq(m, 9), next + s16 * 3, 0.05, 2); rest = combat ? 2 : 4; }
            else if (Math.random() < (combat ? 0.3 : 0.15)) this.qanun(f * 2, next + s16, 0.05, Math.random() < 0.4 ? 3 : 0);
          }
        }
        next += s16; step++;
      }
      setTimeout(sched, 80);
    };
    sched();
  }
  setMusicIntensity(v) {
    if (!this.ctx) return; this.intensity = v;
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(0.2 + v * 0.08, t, 1);
    this.combatBus?.gain.setTargetAtTime(v > 0.5 ? 1 : 0, t, 1.5);
  }
  // short orchestral punctuation for cinematics
  stinger(kind) {
    if (!this.ctx) return; const t = this.ctx.currentTime + 0.02, R = 130.81, B = 146.83;
    const roll = (n, gap, g) => { for (let i = 0; i < n; i++) this.drum(i % 4 ? 'tak' : 'dum', t + i * gap, g * (0.4 + i / n)); };
    if (kind === 'title') { [0, 200, 350, 500, 700, 1200].forEach((ct, i) => this.qanun(R * 2 * Math.pow(2, ct / 1200), t + i * 0.09, 0.08)); this.drum('dum', t + 0.6, 1.4); this.oud(R, t + 0.6, 0.3); }
    if (kind === 'ambush') { roll(14, 0.06, 1); this.boom(); [1200, 1000, 800, 700, 500].forEach((ct, i) => this.qanun(B * 2 * Math.pow(2, ct / 1200), t + 0.8 + i * 0.06, 0.07)); }
    if (kind === 'boss') { roll(20, 0.07, 1.2); setTimeout(() => this.boom(), 1400); this.tone(55, 2.4, 'sawtooth', 0.12, 1, this.music); }
    if (kind === 'phase') { roll(10, 0.05, 1.3); this.boom(); }
    if (kind === 'victory') { [0, 350, 700, 1200, 700, 1200].forEach((ct, i) => { this.oud(R * Math.pow(2, ct / 1200), t + i * 0.22, 0.25); this.qanun(R * 2 * Math.pow(2, ct / 1200), t + i * 0.22 + 0.11, 0.06, 2); }); this.drum('dum', t + 1.32, 1.5); }
  }
  // non-verbal vocal cues: a formant-filtered voice (hum, shout, grunt of effort, pain, growl, a soft sigh)
  vocal(kind, pitch = 1) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + 0.01;
    const P = { hm: [110, 0.35, [300, 900], 0.5], shout: [170, 0.4, [750, 1250], 1], effort: [150, 0.25, [650, 1150], 0.9], hurt: [190, 0.35, [600, 1050], 0.8], growl: [85, 0.6, [450, 900], 1], breath: [0, 0.5, [900, 1800], 0.35] }[kind] || [120, 0.3, [500, 1000], 0.6];
    const [f0, dur, form, amp] = P;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * amp, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const mix = c.createGain(); mix.gain.value = 1;
    for (const ff of form) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff * (0.9 + pitch * 0.1); bp.Q.value = 6; mix.connect(bp); bp.connect(g); }
    if (f0) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0 * pitch, t);
      o.frequency.exponentialRampToValueAtTime(f0 * pitch * (kind === 'shout' ? 0.8 : kind === 'hurt' ? 0.7 : 0.92), t + dur);
      o.connect(mix); o.start(t); o.stop(t + dur + 0.05);
    }
    const n = c.createBufferSource(); n.buffer = this.noiseBuf; const ng = c.createGain(); ng.gain.value = f0 ? 0.25 : 1; n.connect(ng); ng.connect(mix); n.start(t, Math.random()); n.stop(t + dur + 0.05);
    g.connect(this.sfx); g.connect(this.verb);
  }
}
