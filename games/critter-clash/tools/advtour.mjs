// node tools/advtour.mjs <WxH> <prefix> '<json [[map,x,y,clock,rain,js?],...]>' : one page load, one screenshot per stop (tools/out/<prefix>-<i>.png)
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [size, prefix, stopsJson] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const stops = JSON.parse(stopsJson);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h || process.env.MOBILE ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.evaluate(() => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate', 'adventure', 'adv2', 'adv3', 'adv4', 'adv5', 'adv6', 'adv7', 'adv8', 'adv9', 'adv10', 'adv11', 'adv12', 'adv13', 'adv14', 'adv15', 'adv16', 'adv17', 'adv18', 'adv19', 'adv20', 'adv21', 'adv22', 'adv23', 'adv24', 'adv25', 'adv26', 'adv27', 'adv28', 'adv29'] });
  for (const id of ['cindermunch', 'squeakwing', 'rolladillo']) if (!__save.unlocked.includes(id)) __save.unlocked.push(id);
  const flags = {}; for (const k of 'intro quest rival1 trial_strength cup_sprout cup_thunder woods'.split(' ')) flags[k] = true;
  __save.adv = { hero: 'cindermunch', map: 'village', x: 9, y: 9, dir: 's', flags, spawn: { map: 'village', x: 4, y: 6 } };
  __game.screens.adventure(); __sim(0.5);
});
let i = 0;
for (const [map, x, y, clock = 12, rain = false, js = ''] of stops) {
  const r = await pg.evaluate(([map, x, y, clock, rain, js]) => {
    const w = __game.screens.worldObj; __save.adv.clock = clock; __save.adv.rain = rain;
    w.load(map, x, y, 's'); __sim(0.6); let r = null; if (js) r = eval(js); __sim(0.3); return r;
  }, [map, x, y, clock, rain, js]);
  if (r != null) console.log(i, JSON.stringify(r));
  await pg.waitForTimeout(800);
  await pg.screenshot({ path: `tools/out/${prefix}-${i++}.png` });
}
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
