// node shots/r30marks.mjs [region] [out] [lang]: the Round 30 task markers. Lists what the maps show at the start (givers
// offering work), takes the region's Round 29 chain and runs to its meet step, then checks the marker, the minimap and
// the big map (a tap on the marker opens its card; Track switches the trail to it).
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'sawad', out, lang = 'en'] = process.argv.slice(2);
const ID = { sawad: 'seed', marsh: 'mashuf', karkh: 'copper', docks: 'pilot', hamrin: 'flock' }[region];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
if (lang === 'ar') await pg.addInitScript(() => { try { localStorage.setItem('sob.settings.v1', JSON.stringify({ lang: 'ar' })); } catch { /* */ } });
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
const shot = async (n) => { if (!out) return; await pg.screenshot({ path: `${out}/${region}-${lang}-mk-${n}.png`, timeout: 180000 }); console.log('shot', n); };
const list = () => pg.evaluate(() => (__game.questMarks?.() || []).map((m) => `${m.kind}${m.on ? '*' : ''}:${m.name}@${m.pos.x.toFixed(0)},${m.pos.z.toFixed(0)}`));
await pg.evaluate((ID) => { const g = __game; g.briefed = true; g.tutorialOn = false; g.player.invuln = 1e9; window.Q = g.__side.Q.find((q) => q.id === ID); __sim(0.5); }, ID);
console.log('start:', JSON.stringify(await list()));
// take the chain, run its steps until the meet step is live
await pg.evaluate(() => { const g = __game, n = Q.npc; g.player.pos.set(n.pos.x + 1.6, 0, n.pos.z + 1.2); __sim(0.3); n.talk(); __sim(0.2); document.querySelector('#dialog .dchoice')?.click(); __sim(0.3); });
for (let i = 0; i < 6; i++) {
  const k = await pg.evaluate(() => { const g = __game, s = g.player.side[Q.id], st = Q.steps[s]; return st?.kind || null; });
  if (!k || k === 'meet') break;
  await pg.evaluate(() => {
    const g = __game, L = g.__side.live.get(Q.id); for (const e of g.enemies) if (e.sideTag === Q.id && !e.dead) { e.hidden = false; e.riseT = 1; g.killEnemy(e, e.pos); }
    __sim(0.5); const it = g.interactables.find((x) => L?.acts?.includes(x)); if (it) { it.act(); let n = 0; while (__director.def && n++ < 80) { __director.skip(); __sim(0.4); } }
  });
}
const r = await pg.evaluate(() => { const g = __game, s = g.player.side[Q.id]; return { step: s, kind: Q.steps[s]?.kind, tracked: g.trackedKey?.() }; });
console.log('chain:', JSON.stringify(r));
console.log('now:', JSON.stringify(await list()));
await pg.evaluate(() => { __sim(0.3); }); await pg.waitForTimeout(800);
await shot('minimap');
// the big map: tap the meet marker and use its card
await pg.evaluate(() => __game.openMap());
await pg.waitForFunction(() => __game.__mapView?.s > 0, null, { timeout: 120000 });
const tap = await pg.evaluate(() => {
  const g = __game, cv = document.querySelector('#shop.bigmap canvas'), R = cv.getBoundingClientRect(), m = g.questMarks().find((x) => x.key === 'q:' + Q.id);
  if (!m) return { err: 'no marker' };
  // the map is centred on the hero; scale is min(w,h)/190 px per metre
  const V = g.__mapView, s = V.s, x = R.left + R.width / 2 + (m.pos.x - V.cx) * s, y = R.top + R.height / 2 + (m.pos.z - V.cz) * s;
  const top = document.elementFromPoint(x, y); return { x, y, onScreen: x > R.left && x < R.right && y > R.top && y < R.bottom, top: top?.tagName + '#' + top?.id + '.' + top?.className, view: JSON.stringify(g.__mapView), s };
});
if (tap.onScreen) await pg.mouse.click(tap.x, tap.y);
await pg.waitForTimeout(300);
tap.card = await pg.evaluate(() => { const card = document.querySelector('#shop .mapcard'); return card && !card.classList.contains('hidden') ? card.textContent : null; });
console.log('tap:', JSON.stringify(tap));
await pg.waitForTimeout(2500);
await shot('bigmap');
const tr = await pg.evaluate(() => { const b = document.querySelector('#shop .mapcard .tr'); const before = __game.trackedKey(); b?.click(); return { before, after: __game.trackedKey(), label: document.querySelector('#shop .mapcard .tr')?.textContent }; });
console.log('track button:', JSON.stringify(tr));
console.log('errors:', errs.join('\n') || 'none'); await b.close();
