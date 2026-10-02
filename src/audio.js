// Procedural WebAudio: SFX + ambient wind + a plucked oud-like melody in maqam Hijaz.
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
  // Karplus-Strong pluck
  pluck(freq, t, gain = 0.25) {
    const sr = this.ctx.sampleRate, N = Math.round(sr / freq), len = Math.floor(sr * 1.6);
    const buf = this.ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const ring = new Float32Array(N); for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    let p = 0;
    for (let i = 0; i < len; i++) { const n = (p + 1) % N; ring[p] = (ring[p] + ring[n]) * 0.4985; d[i] = ring[p]; p = n; }
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = gain;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400;
    s.connect(f); f.connect(g); g.connect(this.music); g.connect(this.verb); s.start(t);
  }
  startMusic() {
    // D Hijaz: D Eb F# G A Bb C D
    const base = 146.83, steps = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16];
    const f = (i) => base * Math.pow(2, steps[(i + steps.length * 4) % steps.length] / 12 + Math.floor(i / steps.length));
    const phrases = [[0, 1, 2, 1, 0, -1, 0], [2, 3, 4, 3, 2, 1, 2, 1, 0], [4, 5, 4, 3, 2, 3, 1, 0], [7, 6, 5, 4, 5, 4, 3, 2, 1, 0]];
    let next = this.ctx.currentTime + 1, pi = 0;
    // drone
    const dr = this.ctx.createOscillator(); dr.type = 'sawtooth'; dr.frequency.value = base / 2;
    const df = this.ctx.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 300;
    const dg = this.ctx.createGain(); dg.gain.value = 0.05; dr.connect(df); df.connect(dg); dg.connect(this.music); dr.start();
    const sched = () => {
      while (next < this.ctx.currentTime + 2) {
        const ph = phrases[pi % phrases.length]; pi++;
        for (let k = 0; k < ph.length; k++) {
          const dur = (k === ph.length - 1) ? 0.9 : (Math.random() < 0.3 ? 0.18 : 0.36);
          this.pluck(f(ph[k] + 7), next, 0.22);
          if (Math.random() < 0.3) this.pluck(f(ph[k] + 7) * 2, next + 0.09, 0.08); // tremolo flourish
          next += dur;
        }
        // frame drum (daf) pattern
        for (let b = 0; b < 4; b++) { const tt = next + b * 0.36; setTimeout(() => this.noise(b === 0 ? 0.35 : 0.12, b === 0 ? 140 : 900, b === 0 ? 60 : 500, 1, b === 0 ? 0.35 : 0.12, 'lowpass', this.music), (tt - this.ctx.currentTime) * 1000); }
        next += 1.6;
      }
      setTimeout(sched, 500);
    };
    sched();
  }
  setMusicIntensity(v) { if (this.music) this.music.gain.setTargetAtTime(0.18 + v * 0.12, this.ctx.currentTime, 1); }
}
