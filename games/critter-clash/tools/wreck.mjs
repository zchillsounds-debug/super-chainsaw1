// node tools/wreck.mjs [WxH]: Snorkeller Pia dives you to the Sunken Wreck (after Morra's Amends 1), opens the captain's chest, swims back up; screenshots the wreck
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [W, H] = (process.argv[2] || '915x412').split('x').map(Number), tag = process.argv[2] || '915x412';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,cup_coral,cup_gale,cup_caldera,skua_b,morra,sunstone,amends1_asked,amends1_done'.split(',').map((k) => [k, true]));
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate'] });
  __save.critters.cindermunch.level = 32;
  __save.adv = { hero: 'cindermunch', map: 'coral', x: 19, y: 13, dir: 'e', flags, clock: 12, rain: false, spawn: { map: 'village', x: 4, y: 6 } };
  __game.screens.adventure(); __sim(0.3);
}, flags);
// talk, step through lines, answer the first ask with button `pick`
const talk = (id, pick) => pg.evaluate(([id, pick]) => { const wo = __game.screens.worldObj, a = wo.npcs.find((q) => q.n.id === id); if (!a) return 'no ' + id; wo.talk(a); const out = []; for (let i = 0; i < 12; i++) { if (wo.dialog) { out.push(document.querySelector('.wd-box')?.textContent?.slice(0, 100)); wo.dialog.next(); continue; } const bt = [...document.querySelectorAll('.wd-ask button')]; if (bt.length) { out.push('ask: ' + bt.map((x) => x.textContent).join('/')); bt.find((x) => x.textContent === pick)?.click(); continue; } break; } return out.join('\n'); }, [id, pick]);
console.log(await talk('snorkel', 'Dive!'));
await pg.waitForTimeout(1500); await pg.evaluate(() => __sim(1));
console.log('now in:', await pg.evaluate(() => __game.screens.worldObj.key));
await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.load('wreck', 9, 9, 'n'); __sim(2); });
await pg.screenshot({ path: `tools/out/wreck-${tag}-a.png` });
await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.load('wreck', 14, 4, 'w'); __sim(1.5); });
await pg.screenshot({ path: `tools/out/wreck-${tag}-b.png` });
console.log('chest:', await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.dir = 'w'; wo.interact(); const t = []; for (let i = 0; i < 4 && wo.dialog; i++) { t.push(document.querySelector('.wd-box')?.textContent?.slice(0, 90)); wo.dialog.next(); } return t.join(' | ') + ' · hat ' + __save.adv.hats?.includes('diverhelm'); }));
await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.load('wreck', 10, 11, 's'); __sim(0.5); });
console.log(await talk('pia_w', 'Swim up'));
await pg.waitForTimeout(1500); await pg.evaluate(() => __sim(1));
console.log('back in:', await pg.evaluate(() => __game.screens.worldObj.key));
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await b.close();
