// Persistent progress in localStorage (wrapped: storage can be blocked or wiped).
import { CRITTERS, STARTERS } from './data.js';

const KEY = 'critter-clash-save-v1';

const fresh = () => ({
  unlocked: [...STARTERS],
  critters: Object.fromEntries(CRITTERS.map((c) => [c.id, { level: 1, xp: 0, wins: 0 }])),
  cups: {},
  settings: { music: 0.55, sfx: 0.9, vibrate: true, quality: 'auto', reduceFlash: false, hazards: true, btnSize: 'm' },
  stats: { battles: 0, wins: 0, bestCombo: 0, perfects: 0, supers: 0 },
  shinies: [],
  trainer: { name: '', partner: null },
  skins: {},
  berries: 3,
});

// a save that parses but has the wrong shape (an old version, a bad restore, a hand edit) is repaired field by field,
// so one broken value never stops the game from starting
const obj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const num = (v, d, lo = 0, hi = 1e9) => (typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
function repair(s, f) {
  const ids = new Set(CRITTERS.map((c) => c.id));
  const r = { ...f, ...s };
  r.unlocked = [...new Set([...STARTERS, ...(Array.isArray(s.unlocked) ? s.unlocked.filter((id) => ids.has(id)) : [])])];
  r.critters = { ...f.critters };
  if (obj(s.critters)) for (const [id, c] of Object.entries(s.critters)) if (obj(c)) r.critters[id] = { ...c, level: Math.round(num(c.level, 1, 1, 30)), xp: num(c.xp, 0), wins: num(c.wins, 0) };
  r.settings = { ...f.settings, ...(obj(s.settings) ? s.settings : {}) };
  for (const k of ['music', 'sfx']) r.settings[k] = num(r.settings[k], f.settings[k], 0, 1);
  r.stats = { ...f.stats, ...(obj(s.stats) ? s.stats : {}) };
  r.trainer = { ...f.trainer, ...(obj(s.trainer) ? s.trainer : {}) };
  if (typeof r.trainer.name !== 'string') r.trainer.name = '';
  for (const k of ['cups', 'skins']) if (!obj(r[k])) r[k] = f[k];
  if (!Array.isArray(r.shinies)) r.shinies = [];
  r.berries = Math.round(num(s.berries, f.berries));
  if (r.adv !== undefined && !obj(r.adv)) delete r.adv;
  if (r.adv) {
    const A = r.adv;
    for (const k of ['flags', 'seen']) if (!obj(A[k])) A[k] = {};
    if (!Array.isArray(A.hats)) A.hats = [];
    if (A.hero && !ids.has(A.hero)) A.hero = r.trainer.partner && ids.has(r.trainer.partner) ? r.trainer.partner : STARTERS[0];
  }
  return r;
}

function read(key) {
  try { const s = JSON.parse(localStorage.getItem(key)); return obj(s) ? s : null; } catch { return null; } // blocked storage, or not JSON
}

function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { /* blocked */ }
  let s = read(KEY);
  if (!s && raw) { // the save is there but broken: keep a copy for recovery and fall back to the last good one
    try { localStorage.setItem(KEY + '-broken', raw); } catch { /* full */ }
    s = read(KEY + '-bak');
    if (s) console.warn('Critter Clash: the save was damaged, so the last good copy was loaded.');
  }
  const f = fresh();
  if (!s) return f;
  // merge so new critters/settings appear in old saves
  // R732: WAVE RIDER's Surfer's Visor shared the shop Surf Visor's id; a 300+ ride earns the real one
  if (s.adv?.surfHi >= 300 && Array.isArray(s.adv.hats) && !s.adv.hats.includes('surfervisor')) s.adv.hats.push('surfervisor');
  return repair(s, f);
}

export const save = load(); // (after the helpers above: load() uses them)

let bakAt = -1e9;
export function persist() {
  try {
    const j = JSON.stringify(save);
    localStorage.setItem(KEY, j);
    if (performance.now() - bakAt > 60000) { bakAt = performance.now(); localStorage.setItem(KEY + '-bak', j); } // a last good copy, at most once a minute
  } catch { /* blocked or full */ }
}

export const xpNeeded = (lvl) => 80 + lvl * 40;

// returns { levels: number gained, from, to }
export function grantXp(id, xp) {
  const c = save.critters[id];
  const from = c.level;
  c.xp += xp;
  while (c.level < 30 && c.xp >= xpNeeded(c.level)) { c.xp -= xpNeeded(c.level); c.level++; }
  persist();
  return { from, to: c.level };
}

export function unlock(id) {
  if (save.unlocked.includes(id)) return false;
  save.unlocked.push(id);
  persist();
  return true;
}

export function resetSave() {
  Object.assign(save, fresh());
  persist();
}
