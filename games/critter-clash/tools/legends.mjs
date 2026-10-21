// node tools/legends.mjs: meets Solmoth on the Caldera Rim and Moonwhal off Starfall Atoll (by day, then at night), forces the boss wins, checks they join
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,cup_coral,cup_gale,cup_caldera,skua_b,morra,sunstone,atoll,glider,festlamp_done,tower_bronze'.split(',').map((k) => [k, true]));
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate'] });
  __save.critters.cindermunch.level = 34;
  __save.adv = { hero: 'cindermunch', map: 'rim', x: 14, y: 3, dir: 'n', flags, clock: 12, spawn: { map: 'village', x: 4, y: 6 } };
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
await pg.screenshot({ path: 'tools/out/solmoth-world.png' });
console.log(await talk('solmoth_r'));
await pg.evaluate(() => { const wo = __game.screens.worldObj; __save.adv.clock = 12; wo.load('atoll', 14, 12, 's'); __sim(0.3); });
console.log('--- atoll by day'); console.log(await talk('moonwhal_a'));
await pg.evaluate(() => { const wo = __game.screens.worldObj; __save.adv.clock = 23; wo.load('atoll', 14, 12, 's'); __sim(0.5); });
await pg.screenshot({ path: 'tools/out/moonwhal-world.png' });
console.log('--- atoll at night'); console.log(await talk('moonwhal_a'));
console.log('unlocked:', await pg.evaluate(() => ['solmoth', 'moonwhal'].map((id) => id + ' ' + __save.unlocked.includes(id)).join(', ') + ' · flags ' + ['legend_solmoth', 'legend_moonwhal'].map((f) => __save.adv.flags[f]).join()));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
