// node tools/advcredits.mjs [WxH] : plays the Adventure ending credits tour (all towns seen, all cups won) and takes a shot every few seconds
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=low' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.evaluate(() => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate', 'adventure', 'adv2', 'adv3', 'adv4', 'adv5', 'adv6', 'adv7', 'adv8', 'adv9', 'adv10', 'adv11', 'adv12', 'adv13', 'adv14', 'adv15', 'adv16', 'adv17', 'adv18', 'adv19'] });
  const flags = { intro: true, quest: true, crowned: true, ending: true };
  for (const c of ['sprout', 'thunder', 'grove', 'champion', 'midnight', 'sky', 'legend']) flags['cup_' + c] = true;
  __save.adv = { hero: 'cindermunch', map: 'peak', x: 9, y: 7, dir: 's', flags, steps: 4321, hats: ['cap', 'boppers'], spawn: { map: 'village', x: 4, y: 6 }, seen: { village: 1, bloom: 1, seashell: 1, glowcap: 1, ember: 1, neon: 1, cloudtop: 1, frostpeak: 1, peak: 1 } };
  __game.screens.adventure(); __sim(0.5);
  window.__cdone = 0; __game.screens.worldObj.credits(() => { window.__cdone = 1; });
});
for (let i = 0; i < 12; i++) {
  await pg.waitForTimeout(4500);
  await pg.evaluate(() => __sim(0.2));
  await pg.screenshot({ path: `tools/out/cred-${i}.png` });
  const st = await pg.evaluate(() => [__game.screens.worldObj.key, __game.screens.worldObj.busy, window.__cdone]);
  console.log(i, JSON.stringify(st));
  if (st[2]) break;
}
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
