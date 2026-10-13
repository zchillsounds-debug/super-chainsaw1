// Persistent progress in localStorage (wrapped: storage can be blocked or wiped).
import { CRITTERS, STARTERS } from './data.js';

const KEY = 'critter-clash-save-v1';

const fresh = () => ({
  unlocked: [...STARTERS],
  critters: Object.fromEntries(CRITTERS.map((c) => [c.id, { level: 1, xp: 0, wins: 0 }])),
  cups: {},
  settings: { music: 0.55, sfx: 0.9, vibrate: true, quality: 'auto', reduceFlash: false, hazards: true },
  stats: { battles: 0, wins: 0, bestCombo: 0, perfects: 0, supers: 0 },
  shinies: [],
  trainer: { name: '', partner: null },
  skins: {},
  berries: 3,
});

export const save = load();

function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch { /* blocked */ }
  const f = fresh();
  if (!s) return f;
  // merge so new critters/settings appear in old saves
  return { ...f, ...s, critters: { ...f.critters, ...s.critters }, settings: { ...f.settings, ...s.settings }, stats: { ...f.stats, ...s.stats }, trainer: { ...f.trainer, ...s.trainer } };
}

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* ignore */ }
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
