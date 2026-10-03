// node shots/r17test.mjs <region>   enters each Round 17 dungeon, exercises its hazard, buys Renown, runs a contract (headless)
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'sawad', shots = ''] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !m.text().includes('CERT') && errs.push(m.text()));
await pg.goto(`http://localhost:5173/?play&noadapt&q=low&mobile&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
const W = (ms) => pg.waitForTimeout(ms);
const ids = await pg.evaluate(() => __game.interactables.filter((i) => ['cistern', 'kiln2', 'grainvault', 'warren', 'salt', 'palace'].includes(i.area)).map((i) => i.area));
console.log('entrances', ids.join(','));
for (const id of ids) {
  await pg.evaluate((id) => { const g = __game; g.briefed = true; g.player.stats.maxHp = 1e6; g.player.hp = 1e6; g.interactables.find((i) => i.area === id).act(); }, id);
  await W(1500);
  const r = await pg.evaluate(async (id) => {
    const g = __game, I = g.interior.I, p = g.player, kinds = {};
    for (const h of I.hazards) kinds[h.kind] = (kinds[h.kind] || 0) + 1;
    const hp0 = p.hp; let note = '';
    p.stats.maxHp = 1e6; p.hp = 1e6;
    for (const e of g.interior.enemies) { e.alerted = false; e.dmg = 0; }
    const h = I.hazards.find((x) => x.kind !== 'landing');
    if (id === 'cistern') { for (let i = 0; i < 40; i++) __sim(0.25); note = 'water y ' + I.water[0].position.y.toFixed(2); }
    else if (h) {
      p.pos.set(h.x + (h.kind === 'hut' ? 2 : 0.1), 0, h.z + (h.kind === 'hut' ? 0 : 0.2));
      if (h.kind === 'stack') { p.pos.set(h.x + 1.8, 0, h.z); p.st.action = 'attack'; __sim(0.05); p.st.action = null; }
      const before = p.hp; for (let i = 0; i < 60; i++) { if (h.kind === 'hut' || h.kind === 'glare' || h.kind === 'vent' || h.kind === 'plate') p.pos.set(h.x + (h.kind === 'hut' ? 2 : 0.1), 0, h.z + 0.2); __sim(0.25); }
      note = `${h.kind}: dmg ${Math.round(before - p.hp)}${h.kind === 'stack' ? ' fallen ' + h.done : ''}${h.kind === 'hut' ? ' burnt ' + !!h.burn : ''}`;
    }
    return { kinds, note, style: I.style, rooms: I.rooms.length, foes: g.interior.enemies.length };
  }, id);
  if (shots) {
    await pg.evaluate(() => { const g = __game, I = g.interior.I, c = I.center(I.rooms[2] || I.rooms[1]); g.player.pos.set(c.x, 0, c.z + 2); g.camInit = false; __sim(0.5); });
    await W(2500); await pg.screenshot({ path: `shots/r17/${id}.png` });
  }
  const done = await pg.evaluate(async () => {
    const g = __game; for (const e of g.interior.enemies) if (!e.dead) g.killEnemy(e, e.pos);
    g.zones.openChest(); const opened = g.interior.I.chest.opened; await g.zones.exit(); return { opened, out: !g.interior };
  });
  await W(900);
  console.log(id, JSON.stringify(r), JSON.stringify(done));
}
// renown
const rn = await pg.evaluate(() => {
  const g = __game, p = g.player; p.renown = 2000; const hp0 = p.stats.maxHp; g.renownPanel();
  let n = 0; for (let k = 0; k < 40; k++) { const btn = document.querySelector('#shop.renown button[data-r]:not([disabled])'); if (!btn) break; btn.click(); n++; }
  return { bought: n, left: p.renown, rb: JSON.stringify(p.rb), hp: hp0 + '→' + p.stats.maxHp, potCap: p.potCap, evadeK: p.evadeK };
});
console.log('renown', JSON.stringify(rn));
if (shots) { await W(800); await pg.screenshot({ path: `shots/r17/renown-${region}.png` }); }
// contract
await pg.evaluate(() => { const g = __game; g.player.slain = { Wahb: { type: 'spearman' }, Qays: { type: 'archer' } }; document.getElementById('shop')?.remove(); g.interactables.find((i) => /contracts/.test(i.label)).act(); });
await pg.evaluate(() => { document.querySelector('[data-m="hardened"]').click(); }); await pg.evaluate(() => { document.querySelector('[data-m="gilded"]').click(); });
if (shots) { await W(800); await pg.screenshot({ path: `shots/r17/contracts-${region}.png` }); }
const ren0 = await pg.evaluate(() => { const g = __game; const r = g.player.renown; document.querySelector('#shop .go').click(); return r; });
await W(1500);
const cr = await pg.evaluate(async (ren0) => {
  const g = __game, d = g.interior.def; const boss = g.interior.enemies.find((e) => e.elite);
  for (const e of g.interior.enemies) if (!e.dead) g.killEnemy(e, e.pos);
  g.zones.openChest(); const res = { title: d.title, sub: d.sub, boss: boss?.name, won: d.contract.won, renown: g.player.renown - ren0 };
  await g.zones.exit(); return res;
}, ren0);
console.log('contract', JSON.stringify(cr));
console.log('errors:', errs.join(' | ') || 'none'); await b.close();
