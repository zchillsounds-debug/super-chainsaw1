import { HUB } from './region.js';
import { heightAt } from './terrain.js';
import { colliders } from './buildings.js';
import { buildGrid } from './collision.js';
import { freeSpot, boardProp } from './sidequests.js';
import { saveGame } from './save.js';
import { t } from './i18n.js';

// Round 20: the Siege Trials (the "Siege Rift" of the plan). A board in every hub posts timed runs through five
// rooms drawn from every dungeon in the chronicle, ending in a captain. Break him inside four minutes to clear the
// tier and open the next; each tier's foes are tougher and its rewards richer. The board keeps Salim's own best
// time for every tier and his last runs. State: p.rift = { tier, best: { [tier]: seconds }, runs: [...] }.
const LIMIT = 240, MAX_TIER = 10;
const STYLES = ['kiln', 'qanat', 'cellar', 'pit', 'vault', 'flood', 'scorched', 'cistern', 'grainvault', 'salt', 'kiln2', 'palace', 'warren'];
const POOL = ['bandit', 'spearman', 'archer', 'deserter', 'naffat', 'slinger', 'netter', 'guard', 'crossbow', 'engineer'];
const BOSSES = ['guard', 'spearman', 'crossbow', 'naffat', 'netter'];
const NAMES = ['Hudhayl', 'Sharik', 'Muzahim', 'Zufar', 'Labid', 'Mutarrif'];
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

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
    const tiers = Array.from({ length: MAX_TIER }, (_, i) => i + 1).map((n) => `<button class="chip ${n === sel ? 'on' : ''}" data-t="${n}" ${n > S.tier ? 'disabled' : ''}>${t('Tier')} ${n}${S.best[n] ? `<small>${fmt(S.best[n])}</small>` : ''}</button>`).join('');
    const runs = (S.runs || []).slice(-6).reverse().map((r) => `<div class="srow"><div class="bico">${r.ok ? '✓' : '✕'}</div><div class="sinfo"><span>${t('Tier')} ${r.tier} · ${fmt(r.t)}</span><small>${r.date}</small></div></div>`).join('') || `<div class="slabel">${t('No trials run yet.')}</div>`;
    const w = document.createElement('div'); w.id = 'shop'; w.className = 'panel trials';
    w.innerHTML = `<div class="ptitle">${t('Siege Trials')} <span class="close" role="button" aria-label="Close">✕</span></div><div class="sbody">
      <div class="slabel">${t('Five rooms from every dungeon in the chronicle, and a captain at the end. Break him inside four minutes to clear the tier and open the next.')}</div>
      <div class="cgroup"><div class="ch">${t('Tier')}</div><div class="chips">${tiers}</div></div>
      <div class="slabel creward">${t('Foes level')} ${lvl} · ${t('Time')} ${fmt(LIMIT)} · ◉ ${80 * lvl} · ${t('Renown')} +${15 + 5 * sel} · ${t('a gem')}${S.best[sel] ? ` · ${t('Your best')}: <b>${fmt(S.best[sel])}</b>` : ''}</div>
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
    const hpK = 1 + tier * 0.12, dmgK = 1 + tier * 0.08;
    g.zones.enter({
      kind: 'trial', style: styles[0], styles, seed: 3000 + Math.floor(rnd() * 9000), rooms: 6, level: lvl,
      title: `${t('Siege Trial')} · ${t('Tier')} ${tier}`, sub: t('Clear the rooms and break the captain before time runs out.'),
      pool: POOL, bossType: BOSSES[Math.floor(rnd() * BOSSES.length)], bossName: NAMES[Math.floor(rnd() * NAMES.length)],
      extraFoes: 1 + Math.floor(tier / 3), lootBonus: Math.floor(tier / 3),
      mods: { apply: (e) => { e.maxHp = e.hp = Math.round(e.maxHp * hpK); e.dmg *= dmgK; } },
      onEnter: () => { run = { tier, t: 0, done: false, late: false }; timer.classList.remove('hide'); },
      onExit: () => { if (run && !run.done) { g.ui.toast(t('Trial abandoned')); record(false); } run = null; timer.classList.add('hide'); },
    });
  }
  function record(ok) {
    const S = R(), d = new Date();
    S.runs = [...(S.runs || []), { tier: run.tier, t: Math.round(run.t), ok, date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }].slice(-12);
    saveGame(g);
  }
  function finish() {
    const S = R(), tier = run.tier, lvl = g.interior.def.level, ok = run.t <= LIMIT;
    run.done = true;
    const prev = S.best[tier], best = ok && (!prev || run.t < prev);
    if (best) S.best[tier] = Math.round(run.t);
    if (ok && tier === S.tier && S.tier < MAX_TIER) S.tier++;
    const gold = Math.round(80 * lvl * (ok ? 1 : 0.5));
    p.gold += gold; p.renown = (p.renown || 0) + (ok ? 15 + 5 * tier : 5);
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
    const left = LIMIT - run.t;
    timer.textContent = run.done ? `✓ ${fmt(run.t)}` : left >= 0 ? `⧗ ${fmt(left)}` : `⧗ +${fmt(-left)}`;
    timer.classList.toggle('low', !run.done && left < 30);
    if (!run.done && g.interior.enemies.some((e) => e.elite) && !g.interior.enemies.some((e) => e.elite && !e.dead)) finish();
  };
  g.__trials = { panel, begin, R, get run() { return run; } };
}
