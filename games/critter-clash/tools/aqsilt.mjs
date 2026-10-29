// node tools/aqsilt.mjs [WxH] : R871, the Old Aqueduct's silt dig. After the Sun Sluice opens, a silt mound sits in one drained channel
// bed each day: walk onto it and dig (a Sun City coin, or now and then a wild Lilypop). Shut sluice: no mound. Shot tools/out/aqsilt-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=high' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const go = (flow, dig) => pg.evaluate(([flow, dig]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of 'intro,quest,crowned,ending,sunstone,sands_arrive,gcap_done,aq_arrive,aq_asked,aq_green'.split(',')) f[k] = true; if (flow) Object.assign(f, { aqueduct_flow: true, aq_done: true });
  __save.adv = { hero: 'cindermunch', map: 'aqueduct', x: 5, y: 5, dir: 'e', flags: f, hats: [], spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false, sluice: 0, dig: dig || {} };
  __game.screens.adventure(); __sim(0.5); const o = __game.screens.worldObj; return o.dig ? [o.dig.x, o.dig.y] : null;
}, [flow, dig]);
console.log('shut sluice, mound:', await go(false));
const at = await go(true); console.log('flow, mound at:', at);
if (at) {
  await pg.evaluate(([x, y]) => { const o = __game.screens.worldObj; o.hx = x; o.hy = y + 1; o.dir = 'n'; o.placeHero(); __sim(1); }, at);
  await pg.waitForTimeout(500); await pg.screenshot({ path: `tools/out/aqsilt-${tag}.png`, timeout: 120000 });
  const r = await pg.evaluate(() => { const o = __game.screens.worldObj, R = Math.random; Math.random = () => 0.5; o.digUp(); Math.random = R; __sim(3); return document.querySelector('.wd-box')?.textContent.replace('▼', '').slice(0, 220); });
  console.log('dig:', r);
  console.log('coins:', await pg.evaluate(() => __save.adv.aqCoins), 'dug today:', !!(await pg.evaluate(() => __save.adv.dig?.aqueduct)), 'mound left:', await pg.evaluate(() => !!__game.screens.worldObj.dig));
  console.log('dug again same day, mound:', await go(true, { aqueduct: new Date().toISOString().slice(0, 10) }));
}
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
