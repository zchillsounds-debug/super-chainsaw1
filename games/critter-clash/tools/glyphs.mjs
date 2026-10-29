// node tools/glyphs.mjs [WxH] : R903, Sirocco's glyph rubbings at the Sun Gate. Talks to Sirocco (he hands over paper and charcoal), takes a
// rubbing of each of the six carved pillars (a bot taps strokes; one by dragging the pointer), checks the marks, then hands them in for the
// Sun-Glyph Band. Shots: the pillars (tools/out/glyph-world-*), a rubbing half done and done (glyph-rub-*), the hat (glyph-hat-*)
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const flags = Object.fromEntries(('intro,quest,crowned,ending,isle_arrive,sunstone,rail_open,sands_arrive,cup_mirage,cup_canyon,cup_sandstorm,devils1,sunshard,dash_canyon,citymap,baron,gate_open,sungate_arrive,dunecamp_arrive,' + [1, 2, 3, 4].map((k) => `sirocco${k}_asked,sirocco${k}_found,sirocco${k}_done`).join(',')).split(',').map((k) => [k, true]));
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  __save.adv = { hero: 'cindermunch', map: 'sungate', x: 17, y: 9, dir: 'n', flags, hats: [], spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false };
  __game.screens.adventure(); __sim(0.5);
}, flags);
const text = () => pg.evaluate(() => document.querySelector('.wd-box')?.textContent?.slice(0, 150));
const close = async () => { const out = []; for (let k = 0; k < 12 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { out.push(await text()); await pg.evaluate(() => { const o = __game.screens.worldObj; o.dialog?.next(); __sim(0.3); }); await pg.waitForTimeout(80); } return out; };
const at = (x, y, d) => pg.evaluate(([x, y, d]) => { const o = __game.screens.worldObj; o.hx = x; o.hy = y; o.dir = d; o.placeHero(); __sim(0.4); }, [x, y, d]);
const mark = () => pg.evaluate(() => { const a = __game.screens.worldObj.npcs.find((q) => q.n.id === 'baron_g2'); return a?.mark ? a.markKind : null; });
await pg.waitForTimeout(1500); await close();
const hint = () => pg.evaluate(() => __game.screens.worldObj.aHint());
await at(7, 10, 'n'); console.log('hint before:', await hint()); await pg.evaluate(() => { __game.screens.worldObj.interact(); }); console.log('look:', (await close()).join(' / '));
await at(18, 9, 'n'); console.log('mark:', await mark()); await pg.evaluate(() => { __game.screens.worldObj.interact(); }); console.log('ask:', (await close()).join(' / ').slice(0, 300));
console.log('mark after ask:', await mark());
await at(8, 12, 'n'); await pg.waitForTimeout(900); await pg.screenshot({ path: `tools/out/glyph-world-${tag}.png`, timeout: 120000 });
const spots = await pg.evaluate(() => __game.screens.worldObj.M.glyphs.spots);
for (const [i, [x, y, id]] of spots.entries()) {
  await at(x, y + 1, 'n'); const hn = await hint();
  await pg.evaluate(() => { __game.screens.worldObj.interact(); __sim(0.2); });
  for (let k = 0; k < 6 && !(await pg.evaluate(() => !!document.querySelector('.arcade.rubbing'))); k++) { await pg.evaluate(() => { __game.screens.worldObj.dialog?.next(); __sim(0.2); }); await pg.waitForTimeout(120); }
  if (!await pg.evaluate(() => !!document.querySelector('.arcade.rubbing'))) { console.log(id, 'did not open', hn); continue; }
  let taps = 0;
  if (i === 1) { // drag the pointer back and forth like a finger would
    const r = await pg.evaluate(() => { const q = document.querySelector('.arcade.rubbing canvas').getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; });
    await pg.mouse.move(r.x + r.w * 0.25, r.y + r.h * 0.15); await pg.mouse.down();
    for (let k = 0; k < 10; k++) { const yy = r.y + r.h * (0.15 + k * 0.075); await pg.mouse.move(r.x + r.w * (k % 2 ? 0.25 : 0.77), yy, { steps: 6 }); }
    await pg.mouse.up();
  } else {
    for (; taps < 40 && !(await pg.evaluate(() => document.querySelector('.arcade-wrap')?.__arcade?.S.done ?? true)); taps++) {
      await pg.evaluate(() => document.querySelector('.arcade-wrap').__arcade.tap());
      if (i === 0 && taps === 4) { await pg.waitForTimeout(900); await pg.screenshot({ path: `tools/out/glyph-rub-half-${tag}.png`, timeout: 120000 }); }
    }
  }
  const cover = await pg.evaluate(() => document.querySelector('.arcade-wrap')?.__arcade?.S.cover);
  if (i === 0) { await pg.waitForTimeout(250); await pg.screenshot({ path: `tools/out/glyph-rub-done-${tag}.png`, timeout: 120000 }); }
  await pg.waitForTimeout(1800);
  console.log(id, 'hint', hn, 'taps', taps, 'cover', cover?.toFixed(2), '|', (await close()).join(' / ').slice(0, 160));
}
console.log('mark with all six:', await mark());
await at(18, 9, 'n'); await pg.evaluate(() => { __game.screens.worldObj.interact(); }); console.log('hand in:', (await close()).join(' / '));
console.log('again:', await pg.evaluate(() => { __game.screens.worldObj.interact(); return document.querySelector('.wd-box')?.textContent?.slice(0, 120); })); await close();
console.log('save:', await pg.evaluate(() => JSON.stringify({ g: __save.adv.glyphs, done: __save.adv.flags.glyph_done, hat: __save.adv.hats.includes('glyphband'), berries: __save.berries, n: __save.adv.cnt?.glyph })));
await pg.evaluate(() => { __save.adv.hat = 'glyphband'; __game.screens.adventure(); __sim(1); const o = __game.screens.worldObj; o.hx = 13; o.hy = 10; o.dir = 's'; o.placeHero(); __sim(0.5); });
await pg.waitForTimeout(1200); await close(); await pg.screenshot({ path: `tools/out/glyph-hat-${tag}.png`, timeout: 120000 });
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
