import { heightAt, SITES } from './terrain.js';

// Auto-save at each act checkpoint (localStorage). Continue restores the hero and the story so far.
const KEY = 'sob.save.v1';
const CHECKPOINTS = { 1: [1, 88], 2: [SITES.serai.x - 8, SITES.serai.z + 6], 3: [SITES.kiln.x + 10, SITES.kiln.z + 6], 4: [1, 88] };

export function saveGame(g) {
  const p = g.player;
  const data = {
    act: g.act || 1, t: g.t, kills: g.kills || 0, quests: Object.fromEntries(g.quests.map((q) => [q.id, q.done])),
    player: { cls: p.cls, mats: p.mats, stash: p.stash, tree: p.tree, worldTier: p.worldTier, unlockedTier: p.unlockedTier, level: p.level, xp: p.xp, gold: p.gold, potions: p.potions, equip: p.equip, bag: p.bag },
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
  if (s.player.tree) p.tree = s.player.tree; p.worldTier = s.player.worldTier || 1; p.unlockedTier = s.player.unlockedTier || 1;
  g.recalcStats(); p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
  g.act = s.act; g.t = s.t || 0; g.kills = s.kills || 0;
  for (const q of g.quests) q.done = !!s.quests?.[q.id];
  g.ui.quest(g.quests);
  // lieutenants already beaten stay beaten
  for (const [id, e] of [['serai', g.chief], ['graves', g.matriarch]]) if (s.quests?.[id] && e) { e.dead = true; e.st.dead = true; e.st.deadT = 9; e.hp = 0; e.rig.visible = false; }
  const [x, z] = CHECKPOINTS[Math.min(4, s.act)] || CHECKPOINTS[1];
  p.pos.set(x, heightAt(x, z), z);
  if (g.npcMark) g.npcMark.visible = false;
  g.refreshInv?.();
}
