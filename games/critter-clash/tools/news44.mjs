// node tools/news43.mjs [WxH] : R867: Pecan news adv44 (WATERWORKS, the goggles, the moss critters) on the title; shot tools/out/news44-*.png
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=low' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
await pg.evaluate(() => { const N = []; for (let k = 1; k <= 43; k++) N.push('adv' + k); Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['tricks', 'grove', 'otter', 'frogmole', 'jelly', 'team', 'grow', ...N] });
  __save.adv = { hero: 'cindermunch', flags: { cup_sprout: true, sands_arrive: true, spring_arrive: true, gate_open: true, sirocco4_done: true, caravan3_done: true, odjournal_done: true, hollow_arrive: true, gcap_done: true, aq_arrive: true, aqueduct_flow: true, aq_done: true }, cnt: {}, pipeHi: 640, caravanHi: 512, hats: ['caravanturban', 'glowcaphat'] }; __game.screens.title(); });
const lines = [];
for (let k = 0; k < 8; k++) { await pg.waitForTimeout(1200); const t = await pg.evaluate(() => document.querySelector('.prof-talk, .pecan, .news')?.textContent?.slice(0, 160) || document.querySelector('.modal-wrap')?.textContent?.slice(0, 160)); if (t && !lines.includes(t)) lines.push(t); if (k === 1) await pg.screenshot({ path: `tools/out/news44-${w}x${h}.png` }); await pg.evaluate(() => { const b = [...document.querySelectorAll('.modal-wrap button, .prof-talk, .pecan')].pop(); b?.click(); }); }
console.log(lines.join('\n'));
console.log('news has adv44:', await pg.evaluate(() => __save.news.includes('adv44')));
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no errors');
await b.close();
