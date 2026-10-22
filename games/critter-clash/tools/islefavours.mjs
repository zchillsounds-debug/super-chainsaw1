// node tools/islefavours.mjs [WxH]: the three single-step island favours (Mossloth's coconut cup, Pumicub's lucky pebble, Kite Kid Mele's kite tail): ask, find, return; screenshots each lost thing
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [W, H] = (process.argv[2] || '915x412').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,cup_coral,cup_gale,cup_caldera,skua_b,morra,sunstone'.split(',').map((k) => [k, true]));
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate'] });
  __save.critters.cindermunch.level = 30;
  __save.adv = { hero: 'cindermunch', map: 'coral', x: 6, y: 8, dir: 'n', flags, clock: 12, rain: false, spawn: { map: 'village', x: 4, y: 6 } };
  __game.screens.adventure(); __sim(0.3);
}, flags);
const go = (m, x, y, d) => pg.evaluate(([m, x, y, d]) => { const wo = __game.screens.worldObj; wo.load(m, x, y, d); wo.dir = d; __sim(1); }, [m, x, y, d]);
const talk = (id) => pg.evaluate((id) => { const wo = __game.screens.worldObj, a = wo.npcs.find((q) => q.n.id === id); if (!a) return 'no ' + id; wo.talk(a); const out = []; for (let i = 0; i < 12 && wo.dialog; i++) { out.push(document.querySelector('.wd-box')?.textContent?.slice(0, 80)); wo.dialog.next(); } return out.join(' | '); }, id);
const grab = () => pg.evaluate(() => { const wo = __game.screens.worldObj; wo.interact(); const out = []; for (let i = 0; i < 6 && wo.dialog; i++) { out.push(document.querySelector('.wd-box')?.textContent?.slice(0, 80)); wo.dialog.next(); } return out.join(' | '); });
for (const [id, giver, gm, gx, gy, lm, lx, ly] of [['cocomug', 'kid_c', 'coral', 6, 8, 'palmpath', 30, 3], ['pebble', 'vent_kid', 'ember_isle', 9, 13, 'ashtrail', 26, 3], ['kitetail', 'mele_b', 'bluffs', 6, 6, 'atoll', 15, 3]]) {
  await go(gm, gx, gy, 'n');
  console.log(`--- ${id} ask:`, await talk(giver));
  await go(lm, lx - 1, ly, 'e');
  await pg.screenshot({ path: `tools/out/fav-${id}.png` });
  console.log('state:', await pg.evaluate(() => { const wo = __game.screens.worldObj; return [wo.key, wo.hx, wo.hy, wo.dir, wo.busy, !!wo.dialog, __game.screens.mode].join(); }));
  console.log('find:', await grab());
  await go(gm, gx, gy, 'n');
  console.log('return:', await talk(giver));
  console.log('done:', await pg.evaluate((id) => !!__save.adv.flags[id + '_done'], id));
}
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await b.close();
