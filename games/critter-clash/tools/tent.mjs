// node tools/tent.mjs [WxH] [hour] : R813: the Dune Camp's nomad tents (ROOM=tent_w,tent_s): striped canvas, cushions, the tea tray, lanterns, rolled rugs.
// Reads the new furniture lines (A in front of each) and screenshots each room. Shots in tools/out/tent-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`, hour = +(process.argv[3] || 11);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
for (const room of (process.env.ROOM || 'tent_w,tent_s').split(',')) {
  await pg.evaluate(([room, hour]) => {
    Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
    __save.critters.cindermunch.level = 44;
    const f = {}; for (const k of ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'redrock_arrive', 'cup_canyon', 'devils1', 'sunshard', 'dash_canyon', 'dunecamp_arrive']) f[k] = true;
    const now = new Date();
    __save.adv = { hero: 'cindermunch', map: 'in:dunecamp:' + room, x: 5, y: 6, dir: 'n', flags: f, hats: [], sandstorm: false, shift: { day: now.toISOString().slice(0, 10), h: (hour - now.getHours() + 24) % 24 } };
    __game.screens.adventure(); __sim(1);
  }, [room, hour]);
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => { for (let k = 0; k < 10 && document.querySelector('.wd-box'); k++) { __game.screens.worldObj.tapA = true; __sim(0.6); } __sim(1); });
  await pg.waitForTimeout(800);
  await pg.screenshot({ path: `tools/out/tent-${room}-${tag}.png`, timeout: 120000 });
  console.log(room, await pg.evaluate(() => __game.screens.worldObj.M.signs.filter((g) => g.text).map((g) => `${g.x},${g.y}: ${g.text.slice(0, 50)}`).join(' | ')));

}
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no errors');
await b.close();
