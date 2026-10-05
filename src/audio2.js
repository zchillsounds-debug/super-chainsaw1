import { Audio } from './audio.js';

// Round 7 audio: per-act score colour, positional SFX with occlusion, footsteps by surface, ambience beds.
const P = Audio.prototype;
const ACTS = {
  1: { ex: 'rast', bpm: 76, cbpm: 108, dens: 0.45, oct: 1, qan: 0.15 },        // afternoon on the caravan road
  2: { ex: 'bayati', bpm: 66, cbpm: 112, dens: 0.38, oct: 1, qan: 0.1 },       // dusk at the kilns: Bayati, slower
  3: { ex: 'bayati', bpm: 58, cbpm: 118, dens: 0.3, oct: 0.5, qan: 0.06 },     // night under the arch: low register, sparse
  4: { ex: 'rast', bpm: 70, cbpm: 110, dens: 0.4, oct: 1, qan: 0.22 },         // the marshes: Rast, unhurried, the qanun like light on water
  5: { ex: 'bayati', bpm: 62, cbpm: 120, dens: 0.34, oct: 0.5, qan: 0.08 },    // burned al-Karkh: low Bayati, tense
  6: { ex: 'rast', bpm: 72, cbpm: 114, dens: 0.42, oct: 1, qan: 0.26 },         // Round 20, the river quays: Rast on the water at dawn
  7: { ex: 'rast', bpm: 84, cbpm: 108, dens: 0.55, oct: 1, qan: 0.3 },         // the chronicle closes: Rast, bright qanun
  8: { ex: 'bayati', bpm: 68, cbpm: 116, dens: 0.36, oct: 0.5, qan: 0.14 },       // Round 21, the Hamrin hills: Bayati, spare and low, the oud alone in the gorges
  under: { ex: 'rast', bpm: 54, cbpm: 104, dens: 0.22, oct: 0.5, qan: 0.05 },  // tunnels and qanats
};
P.setAct = function (act) { this.actCfg = ACTS[act] || ACTS[1]; };

// ------------------------------------------------------------------ positional SFX
// audio.at(pos, () => audio.hit()) plays any SFX from a world position: distance falloff, stereo pan,
// and a low-pass when a wall stands between the listener and the source.
P.setListener = function (pos, yaw = 0) {
  if (!this.ctx) return; const L = this.ctx.listener, t = this.ctx.currentTime;
  if (L.positionX) { L.positionX.setValueAtTime(pos.x, t); L.positionY.setValueAtTime(pos.y + 8, t); L.positionZ.setValueAtTime(pos.z + 6, t); L.forwardX.setValueAtTime(0, t); L.forwardY.setValueAtTime(-0.8, t); L.forwardZ.setValueAtTime(-0.6, t); L.upX.setValueAtTime(0, t); L.upY.setValueAtTime(0.6, t); L.upZ.setValueAtTime(-0.8, t); }
  else L.setPosition(pos.x, pos.y + 8, pos.z + 6);
  this.lpos = pos;
};
P.at = function (pos, fn) {
  if (!this.ctx || !pos) return fn();
  const c = this.ctx, pn = c.createPanner(); pn.panningModel = 'equalpower'; pn.distanceModel = 'inverse'; pn.refDistance = 6; pn.rolloffFactor = 1.2; pn.maxDistance = 60;
  if (pn.positionX) { pn.positionX.value = pos.x; pn.positionY.value = pos.y + 1; pn.positionZ.value = pos.z; } else pn.setPosition(pos.x, pos.y + 1, pos.z);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = this.occluded?.(pos) ? 700 : 20000;
  lp.connect(pn); pn.connect(this.sfx);
  const prev = this._dest; this._dest = lp;
  try { fn(); } finally { this._dest = prev; }
  setTimeout(() => { try { lp.disconnect(); pn.disconnect(); } catch { /* already gone */ } }, 2500);
};
// route the base SFX helpers through the current positional destination
const baseNoise = P.noise, baseTone = P.tone;
P.noise = function (dur, f0, f1, q, gain, type, dest) { return baseNoise.call(this, dur, f0, f1, q ?? 1, gain ?? 0.5, type ?? 'bandpass', dest ?? this._dest ?? this.sfx); };
P.tone = function (freq, dur, type, gain, slide, dest) { return baseTone.call(this, freq, dur, type ?? 'sine', gain ?? 0.3, slide ?? 1, dest ?? this._dest ?? this.sfx); };

// ------------------------------------------------------------------ footsteps
P.step = function (surface, k = 1) {
  if (!this.ctx) return; const v = (0.7 + Math.random() * 0.5) * k * (this.stepVol ?? 1);
  if (surface === 'sand') { this.noise(0.12, 900 + Math.random() * 300, 250, 0.9, 0.09 * v, 'lowpass'); }
  else if (surface === 'brick') { this.noise(0.05, 2200, 1200, 2, 0.08 * v); this.tone(140 + Math.random() * 30, 0.05, 'triangle', 0.04 * v, 0.7); }
  else if (surface === 'water') { this.noise(0.22, 2600, 900, 1.2, 0.09 * v, 'highpass'); this.tone(500 + Math.random() * 400, 0.08, 'sine', 0.025 * v, 1.6); }
  else if (surface === 'stone') { this.noise(0.06, 1700, 900, 1.6, 0.08 * v); }
  else if (surface === 'wood') { this.noise(0.05, 900, 500, 1.4, 0.07 * v); this.tone(95 + Math.random() * 20, 0.08, 'triangle', 0.06 * v, 0.6); } // Round 20: jetty planks
};

// ------------------------------------------------------------------ ambience beds
P.startAmbience = function () {
  if (!this.ctx || this.amb) return;
  const c = this.ctx;
  this.amb = c.createGain(); this.amb.gain.value = this.ambVol ?? 1; this.amb.connect(this.master);
  // suq crowd: a murmur of band-limited noise, slow swells, and now and then a voice rising out of it
  const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.7;
  const bp2 = c.createBiquadFilter(); bp2.type = 'peaking'; bp2.frequency.value = 1100; bp2.gain.value = 5;
  this.crowd = c.createGain(); this.crowd.gain.value = 0;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.21; const lg = c.createGain(); lg.gain.value = 140; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
  s.connect(bp); bp.connect(bp2); bp2.connect(this.crowd); this.crowd.connect(this.amb); s.start();
  // underground: dripping water and a low draught
  this.under = c.createGain(); this.under.gain.value = 0; this.under.connect(this.amb);
  const u = c.createBufferSource(); u.buffer = this.noiseBuf; u.loop = true; const ul = c.createBiquadFilter(); ul.type = 'lowpass'; ul.frequency.value = 160; u.connect(ul); ul.connect(this.under); u.start();
  this.crowdLevel = 0; this.underLevel = 0;
  const tick = () => {
    if (this.crowdLevel > 0.05 && Math.random() < 0.35 * this.crowdLevel) {
      // a merchant's call or a laugh: a short formant voice, panned somewhere in the square
      const kinds = ['hm', 'shout', 'effort', 'breath'], k = kinds[Math.floor(Math.random() * kinds.length)];
      const t = c.currentTime + 0.01, g = c.createGain(), pn = c.createStereoPanner ? c.createStereoPanner() : null;
      g.gain.value = 0.18 * this.crowdLevel; if (pn) { pn.pan.value = Math.random() * 1.6 - 0.8; g.connect(pn); pn.connect(this.amb); } else g.connect(this.amb);
      const prevSfx = this.sfx; this.sfx = g; this.vocal(k, 0.8 + Math.random() * 0.6); this.sfx = prevSfx;
      void t;
    }
    if (this.underLevel > 0.05 && Math.random() < 0.4) {
      const t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; const f = 900 + Math.random() * 1400;
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.8, t + 0.06);
      g.gain.setValueAtTime(0.05 * this.underLevel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); o.connect(g); g.connect(this.under); g.connect(this.verb); o.start(t); o.stop(t + 0.15);
    }
    setTimeout(tick, 400 + Math.random() * 500);
  };
  tick();
};
P.setAmbience = function (crowd, under) {
  if (!this.ctx) return; this.startAmbience();
  const t = this.ctx.currentTime; this.crowdLevel = crowd; this.underLevel = under;
  this.crowd.gain.setTargetAtTime(crowd * 0.07, t, 0.8); this.under.gain.setTargetAtTime(under * 0.05, t, 0.8);
};
P.setVolumes = function ({ master, music, sfx, amb }) {
  this.musicVol = music; this.ambVol = amb; this.masterLevel = 0.55 * master;
  if (!this.ctx) return; const t = this.ctx.currentTime;
  this.master.gain.setTargetAtTime(0.55 * master, t, 0.1); this.sfx.gain.setTargetAtTime(0.8 * sfx, t, 0.1);
  this.music.gain.setTargetAtTime((0.17 + (this.intensity || 0) * 0.07) * music, t, 0.1); this.amb?.gain.setTargetAtTime(amb, t, 0.1);
};
// ------------------------------------------------------------------ Round 24: transitions
// Browsers start an AudioContext made without a tap suspended (after a region reload nothing has been tapped yet):
// resume it on the first touch or key. The music ducks while the screen is black between places, and the whole mix
// fades out before a reload and back in after it.
const baseInit = P.init;
P.init = function () {
  baseInit.call(this);
  if (!this.ctx || this.duckG) return;
  // music -> duck -> master (the duck is only ever moved by transitions, so it never fights the volume settings)
  this.duckG = this.ctx.createGain(); this.music.disconnect(); this.music.connect(this.duckG); this.duckG.connect(this.master);
  if (this.ctx.state === 'suspended') {
    const wake = () => { this.ctx.resume?.(); if (this.ctx.state !== 'suspended') for (const e of ['pointerdown', 'keydown', 'touchend']) removeEventListener(e, wake, true); };
    for (const e of ['pointerdown', 'keydown', 'touchend']) addEventListener(e, wake, true);
  }
};
P.duck = function (on, sec = 0.5) { if (!this.duckG) return; this.duckG.gain.setTargetAtTime(on ? 0.3 : 1, this.ctx.currentTime, Math.max(0.05, sec / 3)); };
P.fadeOutAll = function (sec = 0.8) { if (!this.ctx) return; const t = this.ctx.currentTime; this.master.gain.cancelScheduledValues(t); this.master.gain.setTargetAtTime(0, t, sec / 3); };
P.fadeInAll = function (sec = 2) {
  if (!this.ctx) return; const t = this.ctx.currentTime, to = this.masterLevel ?? 0.55;
  this.master.gain.cancelScheduledValues(t); this.master.gain.setValueAtTime(0.0001, t); this.master.gain.linearRampToValueAtTime(to, t + sec);
};
export { Audio };
