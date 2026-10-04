import { heightAt, SITES } from './terrain.js';
import { IS_SAWAD, HUB } from './region.js';

// Auto-save at each act checkpoint (localStorage). Continue restores the hero and the story so far.
const KEY = 'sob.save.v1';
// later rounds' player state (Renown board, slain captains, skill loadouts, gems, stash tabs)
const EXTRA = ['rb', 'slain', 'loadout', 'gems', 'stashTabs', 'stashPages', 'visited', 'companion', 'rift', 'belt', 'rival', 'holds'];
// where Continue puts the hero: in the Sawad by act; in the later regions always at the hub corner
const CHECKPOINTS = IS_SAWAD ? { 1: [1, 88], 2: [SITES.serai.x - 8, SITES.serai.z + 6], 3: [SITES.kiln.x + 10, SITES.kiln.z + 6] } : {};

export function saveGame(g) {
  const p = g.player;
  const data = {
    act: g.act || 1, ng: g.ng || 0, t: g.t, kills: g.kills || 0, quests: { ...(g.savedQuests || {}), ...Object.fromEntries(g.quests.map((q) => [q.id, q.done])) }, arrived: g.arrived || {},
    player: { cls: p.cls, mats: p.mats, stash: p.stash, tree: p.tree, codex: p.codex, side: p.side, discount: p.discount, named: p.named, enginesBurnt: p.enginesBurnt, renown: p.renown, bounty: p.bounty, freeTemper: p.freeTemper, worldTier: p.worldTier, unlockedTier: p.unlockedTier, level: p.level, xp: p.xp, gold: p.gold, potions: p.potions, equip: p.equip, bag: p.bag, ...Object.fromEntries(EXTRA.map((k) => [k, p[k]])) },
  };
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage unavailable: play on without saving */ }
}
export function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.player ? s : null; } catch { return null; }
}
export function applySave(g, s) {
  const p = g.player;
  if (s.player.cls && s.player.cls !== p.cls) g.setClass(s.player.cls);
  Object.assign(p, { level: s.player.level, xp: s.player.xp, gold: s.player.gold, potions: s.player.potions, equip: s.player.equip || {}, bag: s.player.bag || new Array(40).fill(null) });
  if (s.player.mats) p.mats = s.player.mats; if (s.player.stash) p.stash = s.player.stash;
  if (s.player.tree) p.tree = s.player.tree; p.codex = s.player.codex || {}; p.side = s.player.side || {}; p.discount = s.player.discount || 0; p.worldTier = s.player.worldTier || 1; p.named = s.player.named || {}; p.enginesBurnt = s.player.enginesBurnt || 0; p.renown = s.player.renown || 0; p.bounty = s.player.bounty || {}; p.freeTemper = s.player.freeTemper || 0; g.ng = s.ng || 0; p.unlockedTier = s.player.unlockedTier || 1;
  for (const k of EXTRA) if (s.player[k] !== undefined) p[k] = s.player[k];
  g.recalcStats(); p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
  g.act = s.act; g.t = s.t || 0; g.kills = s.kills || 0; g.arrived = s.arrived || {}; g.savedQuests = s.quests || {};
  for (const q of g.quests) q.done = !!s.quests?.[q.id];
  g.ui.quest(g.quests);
  // lieutenants already beaten stay beaten
  for (const e of [g.chief, g.matriarch]) if (e && s.quests?.[e.quest]) { e.dead = true; e.st.dead = true; e.st.deadT = 9; e.hp = 0; e.rig.visible = false; }
  const [x, z] = CHECKPOINTS[s.act] || HUB.spawn;
  p.pos.set(x, heightAt(x, z), z);
  if (g.npcMark) g.npcMark.visible = false;
  g.refreshInv?.();
}
