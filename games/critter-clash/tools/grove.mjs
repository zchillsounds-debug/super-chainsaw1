// node tools/grove.mjs [WxH]: the Heartseed chain (Fern → Pecan → Oakley → Rosa → Mama Squeak), then Verdelk's boss battle in Glowcap Woods; screenshots the elk and the Journal
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: +(process.argv[2] || '915x412').split('x')[0], height: +(process.argv[2] || '915x412').split('x')[1] } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,cup_coral,cup_gale,cup_caldera,skua_b,morra,sunstone,atoll,glider,fern'.split(',').map((k) => [k, true]));
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate'] });
  __save.critters.cindermunch.level = 34;
  __save.adv = { hero: 'cindermunch', map: 'glowwood', x: 19, y: 20, dir: 'n', flags, clock: 12, spawn: { map: 'village', x: 4, y: 6 } };
  __game.screens.adventure(); __sim(0.3);
}, flags);
const talk = async (id) => {
  await pg.evaluate((id) => { const wo = __game.screens.worldObj; const a = wo.npcs.find((q) => q.n.id === id); if (!a) throw new Error('no ' + id); wo.talk(a); }, id);
  const said = [];
  for (let i = 0; i < 50; i++) {
    await pg.waitForTimeout(250);
    const st = await pg.evaluate(() => {
      const S = __game.screens, wo = S.worldObj;
      if (S.mode === 'world' && wo) { const t = document.querySelector('.wd-box')?.textContent?.slice(0, 100); if (wo.dialog) { wo.dialog.next(); wo.dialog?.next(); return 'say: ' + t; } return wo.busy ? 'busy' : 'calm'; }
      if (S.mode === 'results') { document.querySelector('.recruit .btn, .modal-wrap .btn')?.click(); [...document.querySelectorAll('button')].find((x) => /Continue/.test(x.textContent))?.click(); return 'results'; }
      const bt = __game.battle;
      if (bt) { const p = bt.fighters[0], q = bt.fighters[1]; for (let i = 0; i < 120 && bt.phase !== 'done'; i++) { p.hp = p.maxHp; if (bt.phase === 'fight') q.hp = 1; __sim(0.5); } __sim(2); return 'battle vs ' + q.def.name; }
      return S.mode;
    });
    if (said[said.length - 1] !== st) said.push(st);
    if (st === 'calm' && i > 3) break;
  }
  return said.map((x) => x.slice(0, 90)).join('\n');
};
const go = (map, x, y) => pg.evaluate(([map, x, y]) => { const wo = __game.screens.worldObj; wo.load(map, x, y, 's'); __sim(0.3); }, [map, x, y]);
const steps = [['glowwood', 19, 20, 'fern'], ['village', 16, 12, 'pecan'], ['village', 16, 12, 'pecan'], ['glowcap', 12, 6, 'oakley'], ['glowcap', 12, 6, 'oakley'], ['cloudtop', 19, 8, 'petal'], ['cloudtop', 19, 8, 'petal'], ['glowwood', 12, 4, 'mama']];
for (const [m, x, y, id] of steps) { await go(m, x, y); console.log(`--- ${id} @ ${m}`); console.log(await talk(id)); }
console.log('flags:', await pg.evaluate(() => ['grove1_done', 'grove2_done', 'grove3_done', 'grove4_done'].map((f) => f + '=' + !!__save.adv.flags[f]).join(' ') + ' · hat ' + __save.adv.hats?.includes('grovecrown') + ' · goal ' + __game.screens.worldObj && ''));
await go('glowwood', 14, 12);
await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.dir = 'e'; __sim(0.5); });
await pg.screenshot({ path: 'tools/out/verdelk-world.png' });
console.log('--- verdelk'); console.log(await talk('verdelk_g'));
console.log('unlocked:', await pg.evaluate(() => __save.unlocked.includes('verdelk') + ' · flag ' + __save.adv.flags.legend_verdelk));
for (let i = 0; i < 4; i++) { await pg.evaluate(() => { [...document.querySelectorAll('button')].find((x) => /Yay|OK|Continue/.test(x.textContent) && x.offsetParent)?.click(); __game.screens.worldObj?.dialog?.next(); }); await pg.waitForTimeout(300); }
await pg.evaluate(() => { __game.screens.worldJournal('champ'); }); await pg.waitForTimeout(400);
await pg.evaluate(() => { document.getAnimations().forEach((a) => { try { a.finish(); } catch { a.currentTime = 2000; } }); const l = document.querySelector('.jr-list'); const h = [...l.querySelectorAll('.jr-head')].find((x) => /Legendary/.test(x.textContent)); h?.scrollIntoView(); });
await pg.screenshot({ path: 'tools/out/verdelk-journal-' + (process.argv[2] || '915x412') + '.png' });
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await b.close();
