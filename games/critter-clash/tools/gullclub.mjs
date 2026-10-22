// node tools/gullclub.mjs [WxH]: the Gull Fishing Club on Starfall Atoll (after Morra's Amends): talk to Petrel, fake today's catch, get paid; five catches give the cap; screenshots the shore
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [W, H] = (process.argv[2] || '915x412').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,cup_coral,cup_gale,cup_caldera,skua_b,morra,sunstone,rod,amends1_done,amends2_done,amends3_done'.split(',').map((k) => [k, true]));
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate'] });
  __save.critters.cindermunch.level = 30;
  __save.adv = { hero: 'cindermunch', map: 'atoll', x: 10, y: 12, dir: 'e', flags, clock: 12, spawn: { map: 'village', x: 4, y: 6 } };
  __game.screens.adventure(); __sim(0.5);
}, flags);
await pg.screenshot({ path: 'tools/out/gull-shore.png' });
const talk = (id) => pg.evaluate((id) => { const wo = __game.screens.worldObj, a = wo.npcs.find((q) => q.n.id === id); if (!a) return 'no ' + id; wo.talk(a); const out = []; for (let i = 0; i < 12 && wo.dialog; i++) { out.push(document.querySelector('.wd-box')?.textContent?.slice(0, 110)); wo.dialog.next(); } return out.join('\n'); }, id);
console.log('--- first talk'); console.log(await talk('petrel_f'));
console.log('--- trainers hidden:', await pg.evaluate(() => __game.screens.worldObj.npcs.filter((q) => /_a$/.test(q.n.id) && /petrel|shag/.test(q.n.id)).length));
for (let d = 0; d < 5; d++) {
  await pg.evaluate(() => { __save.adv.gullFish = new Date().toISOString().slice(0, 10); __save.adv.gullPaid = null; });
  console.log(`--- catch ${d + 1}`); console.log(await talk('petrel_f'));
}
console.log('again:', await talk('petrel_f'));
console.log('hat:', await pg.evaluate(() => __save.adv.hats.includes('gullcap') + ' · cnt ' + __save.adv.cnt.gull));
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await b.close();
