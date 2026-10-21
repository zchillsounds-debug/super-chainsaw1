// node tools/tower.mjs [wins] [WxH]: walks into the Battle Tower on Starfall Atoll and plays a streak (battles forced to wins, then one loss); prints what Morra says
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [wins = '8', size = '915x412'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,cup_coral,cup_gale,cup_caldera,skua_b,morra,sunstone,atoll'.split(',').map((k) => [k, true]));
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate'] });
  __save.critters.cindermunch.level = 30;
  __save.adv = { hero: 'cindermunch', map: 'atoll', x: 10, y: 8, dir: 'n', flags, spawn: { map: 'village', x: 4, y: 6 } };
  __game.screens.adventure(); __sim(0.3);
  const wo = __game.screens.worldObj; wo.load('in:atoll:hideout_a', 7, 4, 'n'); __sim(0.3);
}, flags);
await pg.waitForTimeout(500);
await pg.screenshot({ path: 'tools/out/tower-in.png' });
const talk = async (lose) => {
  await pg.evaluate(() => { const wo = __game.screens.worldObj; const a = wo.npcs.find((q) => q.n.story === 'tower'); wo.talk(a); });
  const said = [];
  for (let i = 0; i < 60; i++) {
    await pg.waitForTimeout(250);
    const st = await pg.evaluate((lose) => {
      const S = __game.screens, wo = S.worldObj;
      if (S.mode === 'world' && wo) { const t = document.querySelector('.wd-box')?.textContent?.slice(0, 110); if (wo.dialog) { wo.dialog.next(); wo.dialog?.next(); return 'say: ' + t; } return wo.busy ? 'busy' : 'calm'; }
      if (S.mode === 'results') { [...document.querySelectorAll('button')].find((x) => /Continue/.test(x.textContent))?.click(); return 'results'; }
      const bt = __game.battle;
      if (bt) { const p = bt.fighters[0], q = bt.fighters[1]; for (let i = 0; i < 120 && bt.phase !== 'done'; i++) { if (lose) { q.hp = q.maxHp; if (bt.phase === 'fight') p.hp = 1; } else { p.hp = p.maxHp; if (bt.phase === 'fight') q.hp = 1; } __sim(0.5); } __sim(2); return 'battle vs ' + q.def.name + ' Lv ' + (q.level ?? ''); }
      return S.mode;
    }, lose);
    if (said[said.length - 1] !== st) said.push(st);
    if (st === 'calm' && i > 3) break;
  }
  return said.filter((x) => x.startsWith('say') || x.startsWith('battle')).map((x) => x.slice(0, 100));
};
for (let k = 0; k <= +wins; k++) {
  const lose = k === +wins;
  const r = await talk(lose);
  console.log(`--- talk ${k}${lose ? ' (lose)' : ''}`); console.log(r.join('\n'));
  // back in the world: if a loss sent the hero away, walk back into the tower
  await pg.evaluate(() => { const wo = __game.screens.worldObj; if (wo && wo.key !== 'in:atoll:hideout_a') { wo.load('in:atoll:hideout_a', 7, 4, 'n'); __sim(0.3); } });
}
const r = await talk(false); console.log('--- after the loss'); console.log(r.slice(0, 3).join('\n'));
console.log('tower:', await pg.evaluate(() => JSON.stringify(__save.adv.tower) + ' hats ' + (__save.adv.hats || []).join()));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
