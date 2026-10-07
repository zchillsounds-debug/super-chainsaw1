// node shots/r31wanted.mjs [region] [out] [lang]: Round 31's Wanted board: the board in the camp, the panel, each of the
// five hunts in turn (the captain and his men at his camp, the marker, the trail, the reward), the weekly captain after,
// and a save and reload with a hunt out
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'sawad', out, lang = 'en'] = process.argv.slice(2);
if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
if (lang === 'ar') await pg.addInitScript(() => { try { localStorage.setItem('sob.settings.v1', JSON.stringify({ lang: 'ar' })); } catch (e) { /* */ } });
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&q=${out ? 'high' : 'low'}&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
await pg.evaluate(() => { const p = __game.player; p.level = 12; __game.recalcStats(); p.hp = p.stats.maxHp; p.invuln = 1e9; __game.briefed = true; });
const shot = async (name) => { if (out) await pg.screenshot({ path: `${out}/${name}.png`, timeout: 180000 }); };
const res = [];
// the board: where it stands, then Salim walks up and reads it
res.push(await pg.evaluate(() => {
  const g = __game, W = g.__wanted, it = g.interactables.find((i) => i.label === 'Read the Wanted board');
  if (!W || !it) return { tag: 'board', err: 'no board' };
  g.player.pos.set(it.pos.x + Math.sin(W.board.group.rotation.y) * 2.6, 0, it.pos.z + Math.cos(W.board.group.rotation.y) * 2.6); g.player.facing = W.board.group.rotation.y + Math.PI; __sim(0.5);
  return { tag: 'board', at: [+it.pos.x.toFixed(1), +it.pos.z.toFixed(1)], prompt: document.getElementById('prompt')?.textContent, states: [0, 1, 2, 3, 4, 5].map((r) => W.state(r)) };
}));
await shot(`wanted-board-${region}`);
await pg.evaluate(() => __game.__wanted.openBoard()); await pg.waitForTimeout(400);
res.push(await pg.evaluate(() => ({ tag: 'panel', cards: document.querySelectorAll('#shop.wanted .wcard').length, buttons: document.querySelectorAll('#shop.wanted button[data-r]').length, scrollW: document.querySelector('#shop.wanted .wrow').scrollWidth, w: document.querySelector('#shop.wanted').clientWidth })));
await shot(`wanted-panel-${region}-${lang}`);
// the five hunts, then the weekly one
for (let r = 0; r <= 5; r++) {
  res.push(await pg.evaluate(async (r) => {
    const g = __game, W = g.__wanted, p = g.player;
    document.querySelector('#shop.wanted button[data-r]')?.click(); __sim(0.2);
    const L = W.live; if (!L) return { tag: 'hunt' + r, err: 'no hunt', state: W.state(r) };
    const marks = g.questMarks().filter((m) => m.kind === 'wanted').length, tr = g.trackTarget(), line = g.sideLines().find((l) => l.key === 'w31');
    const d0 = Math.round(L.boss.pos.distanceTo(p.pos)), gold0 = p.gold, ren0 = p.renown || 0, drops0 = g.drops.length;
    p.pos.copy(L.at); __sim(0.4);
    const info = { name: L.C.name, type: L.boss.type, affix: L.boss.affix, move: L.boss.m28key, level: L.boss.level, men: L.guard.length };
    for (const e of L.guard) if (!e.dead) g.killEnemy(e, e.pos); g.killEnemy(L.boss, L.boss.pos); __sim(0.5);
    const drop = g.drops.slice(drops0).map((d) => d.item?.rarity + ':' + (d.item?.name || d.item?.gold));
    const bag = (p.bag || []).filter(Boolean).map((i) => i.name); return { tag: 'hunt' + r, ...info, unique: bag.some((n) => /Canal Roads|Reed-Cutter|Karkh Market|Bridge of Boats|Hamrin Passes/.test(n)), dist: d0, marks, trail: !!tr?.pos, line: line?.text, over: !W.live, gold: p.gold - gold0, renown: (p.renown || 0) - ren0, drop, rank: W.S().rank, week: W.S().week.done };
  }, r));
  await pg.evaluate(() => __game.__wanted.openBoard()); await pg.waitForTimeout(200);
  if (r === 2) await shot(`wanted-panel-mid-${region}`);
}
await shot(`wanted-panel-done-${region}-${lang}`);
// a hunt out across a save and a reload
res.push(await pg.evaluate(async () => {
  const g = __game, W = g.__wanted, S = W.S(); S.week = { n: -1, done: false }; document.getElementById('shop')?.remove();
  W.startHunt(5); const n0 = W.live.C.name; const { saveGame } = await import('/src/save.js'); saveGame(g);
  g.restoreSide(); __sim(0.2);
  return { tag: 'reload', before: n0, after: W.live?.C.name, on: W.S().on, bossAlive: !!W.live && !W.live.boss.dead };
}));
for (const r of res) console.log(JSON.stringify(r));
console.log('errors:', errs.join('\n') || 'none'); await b.close();
