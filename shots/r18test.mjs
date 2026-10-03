// node shots/r18test.mjs [cls] [shots]   loadout, alt skills, aspects, sets, gems, stash tabs, level cap (headless)
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [cls = 'faris', shots = ''] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1])); pg.on('console', (m) => m.type() === 'error' && !m.text().includes('CERT') && errs.push(m.text()));
await pg.goto(`http://localhost:5173/?play&noadapt&q=low&mobile&cls=${cls}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
const r = await pg.evaluate(async () => {
  const g = __game, p = g.player, out = {}; try {
  out.slots14 = Object.keys(g.slotDefs()).join(',');
  while (p.level < 30) g.levelUp(); p.xp = 1e9; g.killEnemy(g.enemies.find((e) => !e.dead), p.pos); out.level = p.level;
  out.slots30 = Object.entries(g.slotDefs()).map(([k, d]) => k + ':' + d.id).join(',');
  out.buttons = document.querySelectorAll('#tskills .skill').length;
  // use every skill incl. the alternates
  p.mp = 1e4; p.stats.maxMp = 1e4; const e = g.enemies.find((x) => !x.dead); e.pos.copy(p.pos).add({ x: 2, y: 0, z: 0 }); g.hover = e;
  const used = [];
  for (const id of ['s4']) { g.useSkill(id); __sim(0.6); used.push(id + ':' + (p.cds[id] > 0)); }
  // swap s4 to the other alternate through the panel
  g.openPanel('skills'); document.querySelector('.loslot[data-s="s4"]').click(); const picks = [...document.querySelectorAll('.lopick')].map((x) => x.dataset.id);
  document.querySelector(`.lopick[data-id="${picks[picks.length - 1]}"]`).click(); out.afterSwap = g.slotDefs().s4.id; p.cds = {}; g.useSkill('s4'); __sim(0.6); used.push('alt2:' + (p.cds.s4 > 0));
  out.used = used.join(' ');
  // aspects only of own class
  const asp = new Set(); for (let i = 0; i < 60; i++) { const it = { ...__mk(20, 'legendary', 'ring') }; delete it.aspect; g.dropItem(it, p.pos.clone().add({ x: 50, y: 0, z: 50 })); }
  for (const d of g.drops) if (d.item.aspect) asp.add(d.item.aspect); out.aspects = [...asp].sort().join(',');
  // gems
  p.gold = 1e5; for (let i = 0; i < 3; i++) (await import('/src/build.js')).addGem(g, 'ruby', 1, true);
  const w = __mk(20, 'rare', 'weapon'); w.cls = p.cls; p.equip.weapon = w; g.recalcStats(); const d0 = p.stats.max;
  g.closePanels(); g.openPanel('smith'); document.querySelector('.stabs button[data-t="gems"]').click(); document.querySelector('.comb')?.click(); out.gemsAfterCombine = JSON.stringify(p.gems);
  document.querySelector('.srow .sock').click(); document.querySelector('.srow .set').click();
  out.gemmed = JSON.stringify(p.equip.weapon.gem) + ' dmg ' + d0 + '→' + p.stats.max;
  // stash tabs
  g.closePanels(); g.openPanel('stash'); document.querySelector('.stabs button[data-t="1"]').click(); out.tabs = p.stashTabs + ' gold ' + p.gold;
  // save round trip of new state
  (await import('/src/save.js')).saveGame(g); const s = JSON.parse(localStorage.getItem('sob.save.v1')).player; out.saved = ['rb', 'loadout', 'gems', 'stashTabs', 'stashPages', 'slain'].filter((k) => s[k] !== undefined).join(',');
  } catch (er) { out.ERR = er.message + ' @ ' + er.stack.split('\n')[1]; out.html = document.querySelector('#shop')?.innerText.slice(0, 300); } return out;
});
for (const [k, v] of Object.entries(r)) console.log(k, v);
if (shots) {
  await pg.addStyleTag({ content: '*{animation-duration:0s!important;transition:none!important}' }); await pg.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
  await pg.evaluate(() => { __game.closePanels(); __game.openPanel('skills'); document.querySelector('.loslot[data-s="s4"]').click(); });
  await pg.waitForTimeout(800); await pg.screenshot({ path: `shots/r17/r18-skills-${cls}.png` });
  await pg.evaluate(() => { __game.closePanels?.(); __game.openPanel('smith'); document.querySelector('.stabs button[data-t="gems"]').click(); }); await pg.waitForTimeout(800); await pg.screenshot({ path: `shots/r17/r18-gems-${cls}.png` });
  await pg.evaluate(() => { __game.closePanels?.(); }); await pg.waitForTimeout(800); await pg.screenshot({ path: `shots/r17/r18-hud-${cls}.png` });
}
console.log('errors:', errs.join(' | ') || 'none'); await b.close();
