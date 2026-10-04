import { HUB } from './region.js';
import { heightAt } from './terrain.js';
import { colliders } from './buildings.js';
import { buildGrid } from './collision.js';
import { freeSpot, boardProp } from './sidequests.js';
import { saveGame } from './save.js';
import { t } from './i18n.js';
import { mulberry32 } from './noise.js';
import { makeTrialUnique } from './items.js';
import { aspectsOf } from './progression.js';
import * as THREE from 'three';

// Round 20: the Siege Trials (the "Siege Rift" of the plan). A board in every hub posts timed runs through five
// rooms drawn from every dungeon in the chronicle, ending in a captain. Break him inside four minutes to clear the
// tier and open the next; each tier's foes are tougher and its rewards richer. The board keeps Salim's own best
// time for every tier and his last runs. State: p.rift = { tier, best: { [tier]: seconds }, runs: [...] }.
const LIMIT = 240, MAX_TIER = 10;
const STYLES = ['kiln', 'qanat', 'cellar', 'pit', 'vault', 'flood', 'scorched', 'cistern', 'grainvault', 'salt', 'kiln2', 'palace', 'warren'];
const POOL = ['bandit', 'spearman', 'archer', 'deserter', 'naffat', 'slinger', 'netter', 'guard', 'crossbow', 'engineer'];
const BOSSES = ['guard', 'spearman', 'crossbow', 'naffat', 'netter'];
const NAMES = ['Hudhayl', 'Sharik', 'Muzahim', 'Zufar', 'Labid', 'Mutarrif'];
// Round 21: rift seasons. Each ISO week draws two modifiers from this pool (the same for everyone that week); the
// board keeps a best time for the season. Clearing tiers can yield one of the four trial-only legendaries.
export const SEASON_MODS = {
  iron: { name: 'Iron Ranks', desc: 'Foes have 30% more life', apply: (e) => { e.maxHp = e.hp = Math.round(e.maxHp * 1.3); } },
  march: { name: 'Forced March', desc: 'Foes move 20% faster', apply: (e) => { e.speed *= 1.2; } },
  shields: { name: 'Shield Wall', desc: 'Foes who fight hand to hand carry shields', apply: (e) => { if (!e.T.ranged) e.shield = true; } },
  old: { name: 'Old Soldiers', desc: 'Foes are two levels higher, and pay 25% more', levelUp: 2, gold: 0.25 },
  blood: { name: 'Blood Price', desc: 'Foes strike 25% harder; dinars +40%', apply: (e) => { e.dmg *= 1.25; }, gold: 0.4 },
  fuse: { name: 'Short Fuse', desc: 'Twenty seconds less on the clock; Renown +10', limit: -20, renown: 10 },
  naft: { name: 'Naft Seeps', desc: 'Burning naft seeps from the floor', burning: true },
  tough: { name: 'Hard Men', desc: 'Foes are hard to stagger', apply: (e) => { e.maxPoise = (e.maxPoise || 20) * 1.8; e.poise = e.maxPoise; } },
};
export function isoWeek(d = new Date()) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return { year: x.getUTCFullYear(), week: Math.ceil(((x - y0) / 864e5 + 1) / 7) };
}
export function season(d) {
  const { year, week } = isoWeek(d), rnd = mulberry32(year * 100 + week), keys = Object.keys(SEASON_MODS);
  const a = Math.floor(rnd() * keys.length); let b = Math.floor(rnd() * (keys.length - 1)); if (b >= a) b++;
  return { id: `${year}-W${String(week).padStart(2, '0')}`, week, mods: [keys[a], keys[b]] };
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function modsOf(SE) {
  const o = { apply: [], levelUp: 0, gold: 0, renown: 0, limit: 0, burning: false };
  for (const k of SE.mods) { const m = SEASON_MODS[k]; if (m.apply) o.apply.push(m.apply); o.levelUp += m.levelUp || 0; o.gold += m.gold || 0; o.renown += m.renown || 0; o.limit += m.limit || 0; o.burning ||= !!m.burning; }
  return o;
}
const limitOf = (SE) => LIMIT + modsOf(SE).limit;

export function setupTrials(g) {
  const p = g.player;
  const R = () => (p.rift ||= { tier: 1, best: {}, runs: [] });
  let run = null; // { tier, t, done, late }

  // ---------------- the board, beside Ishaq
  {
    const [bx, bz] = freeSpot(HUB.ishaq[0] - 5, HUB.ishaq[1] + 4, 1.4), board = boardProp();
    board.position.set(bx, heightAt(bx, bz), bz); board.rotation.y = Math.atan2(HUB.spawn[0] - bx, HUB.spawn[1] - bz);
    board.traverse((o) => { if (o.isMesh && o.geometry.type === 'PlaneGeometry') { o.material = o.material.clone(); o.material.color.set(0xb8c8d8); } });
    g.scene.add(board); colliders.push({ type: 'box', x: bx, z: bz, hw: 1.1, hd: 0.3, rot: board.rotation.y }); buildGrid();
    g.interactables.push({ pos: board.position, r: 2.8, label: 'Read the siege trials', act: () => panel() });
    g.pois?.push({ x: bx, z: bz, icon: '⧗', color: '#a8c0e0' });
  }

  // ---------------- the timer on screen
  const timer = document.createElement('div'); timer.id = 'trialtimer'; timer.className = 'hide'; document.getElementById('ui').appendChild(timer);

  function panel(sel = null) {
    document.getElementById('shop')?.remove(); g.closePanels?.();
    const S = R(); sel ??= S.tier;
    const lvl = p.level + sel * 2 - 1; // foes scale from Salim's own level
    const SE = season(), sb = S.season?.id === SE.id ? S.season.best : {}, lim = limitOf(SE);
    const tiers = Array.from({ length: MAX_TIER }, (_, i) => i + 1).map((n) => `<button class="chip ${n === sel ? 'on' : ''}" data-t="${n}" ${n > S.tier ? 'disabled' : ''}>${t('Tier')} ${n}${S.best[n] ? `<small>${fmt(S.best[n])}</small>` : ''}</button>`).join('');
    const runs = (S.runs || []).slice(-6).reverse().map((r) => `<div class="srow"><div class="bico">${r.ok ? '✓' : '✕'}</div><div class="sinfo"><span>${t('Tier')} ${r.tier} · ${fmt(r.t)}</span><small>${r.date}</small></div></div>`).join('') || `<div class="slabel">${t('No trials run yet.')}</div>`;
    const w = document.createElement('div'); w.id = 'shop'; w.className = 'panel trials';
    w.innerHTML = `<div class="ptitle">${t('Siege Trials')} <span class="close" role="button" aria-label="Close">✕</span></div><div class="sbody">
      <div class="slabel">${t('Five rooms from every dungeon in the chronicle, and a captain at the end. Break him inside four minutes to clear the tier and open the next.')}</div>
      <div class="cgroup season"><div class="ch">${t('This week')} · ${t('Season')} ${SE.week}</div>${SE.mods.map((m) => `<div class="slabel"><b>${t(SEASON_MODS[m].name)}</b> · ${t(SEASON_MODS[m].desc)}</div>`).join('')}${sb[sel] ? `<div class="slabel">${t('Season best')}: <b>${fmt(sb[sel])}</b></div>` : ''}</div>
      <div class="cgroup"><div class="ch">${t('Tier')}</div><div class="chips">${tiers}</div></div>
      <div class="slabel creward">${t('Foes level')} ${lvl + modsOf(SE).levelUp} · ${t('Time')} ${fmt(lim)} · ◉ ${80 * lvl} · ${t('Renown')} +${15 + 5 * sel} · ${t('a gem')}${sel >= 3 ? ` · ${t('a chance at a trial legendary')}` : ''}${S.best[sel] ? ` · ${t('Your best')}: <b>${fmt(S.best[sel])}</b>` : ''}</div>
      <div class="row2"><button class="sbtn go">${t('Begin the trial')}</button></div>
      <div class="cgroup"><div class="ch">${t('Your last trials')}</div><div class="slist">${runs}</div></div></div>`;
    g.ui.root.appendChild(w);
    w.querySelector('.close').onclick = () => w.remove();
    w.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => panel(+b.dataset.t));
    w.querySelector('.go').onclick = () => { w.remove(); begin(sel); };
  }

  function begin(tier) {
    const lvl = p.level + tier * 2 - 1, rnd = Math.random;
    const styles = [...STYLES].sort(() => rnd() - 0.5).slice(0, 6);
    const hpK = 1 + tier * 0.12, dmgK = 1 + tier * 0.08, SE = season(), SM = modsOf(SE);
    g.zones.enter({
      kind: 'trial', style: styles[0], styles, seed: 3000 + Math.floor(rnd() * 9000), rooms: 6, level: lvl + SM.levelUp,
      title: `${t('Siege Trial')} · ${t('Tier')} ${tier}`, sub: SE.mods.map((m) => t(SEASON_MODS[m].name)).join(' · '),
      pool: POOL, bossType: BOSSES[Math.floor(rnd() * BOSSES.length)], bossName: NAMES[Math.floor(rnd() * NAMES.length)],
      extraFoes: 1 + Math.floor(tier / 3), lootBonus: Math.floor(tier / 3),
      mods: { apply: (e) => { e.maxHp = e.hp = Math.round(e.maxHp * hpK); e.dmg *= dmgK; for (const f of SM.apply) f(e); } },
      onEnter: () => { run = { tier, t: 0, done: false, late: false, season: SE.id, limit: limitOf(SE), SM }; timer.classList.remove('hide'); if (SM.burning) g.qanatBurn = true; },
      onExit: () => { if (run && !run.done) { g.ui.toast(t('Trial abandoned')); record(false); } run = null; timer.classList.add('hide'); g.qanatBurn = false; },
    });
  }
  function record(ok) {
    const S = R(), d = new Date();
    S.runs = [...(S.runs || []), { tier: run.tier, t: Math.round(run.t), ok, date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }].slice(-12);
    saveGame(g);
  }
  function finish() {
    const S = R(), tier = run.tier, lvl = g.interior.def.level, ok = run.t <= run.limit, SM = run.SM;
    run.done = true;
    const prev = S.best[tier], best = ok && (!prev || run.t < prev);
    if (best) S.best[tier] = Math.round(run.t);
    if (S.season?.id !== run.season) S.season = { id: run.season, best: {} };
    if (ok && (!S.season.best[tier] || run.t < S.season.best[tier])) S.season.best[tier] = Math.round(run.t);
    if (ok && tier === S.tier && S.tier < MAX_TIER) S.tier++;
    const gold = Math.round(80 * lvl * (ok ? 1 : 0.5) * (1 + SM.gold));
    p.gold += gold; p.renown = (p.renown || 0) + (ok ? 15 + 5 * tier + SM.renown : 5);
    // the trial legendaries: a chance from tier 3, sure on the first clear of tiers 4, 7 and 10
    if (ok && tier >= 3) {
      S.won ||= [];
      const first = [4, 7, 10].includes(tier) && !S.won.includes(tier);
      if (first || Math.random() < 0.1 + 0.04 * tier) {
        if (first) S.won.push(tier);
        const owned = new Set([...Object.values(p.equip), ...p.bag, ...(p.stash || [])].filter((it) => it?.trial).map((it) => it.aspect));
        const keys = ['breach', 'lastgate', 'clock', 'sapper'], fresh = keys.filter((k) => !owned.has(k));
        const key = (fresh.length ? fresh : keys)[Math.floor(Math.random() * (fresh.length || keys.length))];
        g.dropItem(makeTrialUnique(lvl, key), p.pos.clone());
      }
    }
    if (ok) { const k = ['ruby', 'lapis', 'carnelian'][Math.floor(Math.random() * 3)] + Math.min(3, 1 + Math.floor(tier / 4)); p.gems ||= {}; p.gems[k] = (p.gems[k] || 0) + 1; }
    g.audio.gold?.(); g.audio.legendary?.();
    g.ui.banner(ok ? t('Trial cleared') : t('Too slow'), `${fmt(run.t)}${best ? ' · ' + t('New best!') : ''} · +${gold} ${t('dinars')}${ok && tier === S.tier - 1 ? ' · ' + t('Tier') + ' ' + S.tier + ' ' + t('opened') : ''}`, 4200);
    record(ok); g.refreshTracker?.();
  }

  const prevTick = g.tickExtra;
  g.tickExtra = (dt) => {
    prevTick?.(dt);
    if (!run || !g.interior || g.interior.def.kind !== 'trial') return;
    if (!run.done && !g.paused && !g.player.dead) run.t += dt;
    const left = run.limit - run.t;
    timer.textContent = run.done ? `✓ ${fmt(run.t)}` : left >= 0 ? `⧗ ${fmt(left)}` : `⧗ +${fmt(-left)}`;
    timer.classList.toggle('low', !run.done && left < 30);
    if (!run.done && g.interior.enemies.some((e) => e.elite) && !g.interior.enemies.some((e) => e.elite && !e.dead)) finish();
  };
  // ---------------- the trial legendaries' aspects
  const A = () => aspectsOf(p);
  const dm = g.dmgMod; g.dmgMod = (e) => (dm ? dm(e) : 1) * (A().has('breach') && (e.elite || e.boss || e.holdBoss) ? 1.4 : 1);
  const dp = g.damagePlayer.bind(g); g.damagePlayer = (d, ...a) => dp(A().has('lastgate') && p.hp < p.stats.maxHp * 0.3 ? d * 0.6 : d, ...a);
  const ok0 = g.onKill; g.onKill = (e) => { ok0?.(e); if (A().has('clock')) for (const k in p.cds) if (k !== 'potion') p.cds[k] = Math.max(0, p.cds[k] - 1); };
  const op = g.onPotion; g.onPotion = () => { op?.(); if (!A().has('sapper')) return;
    const foes = g.interior ? g.interior.enemies : g.enemies;
    for (const e of foes) if (!e.dead && e.pos.distanceTo(p.pos) < 4) { const d = new THREE.Vector3().subVectors(e.pos, p.pos).setY(0).normalize(); e.knock = d.multiplyScalar(9); if (!e.boss) { e.staggerT = 1.2; e.st.action = null; } }
    g.fx.ring(p.pos, new THREE.Color(2.4, 1.6, 0.8), 0.4, 4.2, 0.4); g.fx.dust?.(p.pos, 16, 2); g.audio.boom?.(); g.shake = Math.max(g.shake, 0.4);
  };
  g.__trials = { panel, begin, R, finish: () => finish(), season, get run() { return run; } };
}
