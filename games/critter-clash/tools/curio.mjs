// node tools/curio.mjs [WxH] : R819: the Mirage Merchant's daily curio (after the Mirage Turban). For each of the three curios (Date.now shifted a day
// at a time) it buys it at 13 h on the Glass Flats, then: the Glass Lure → a catch in the Sunwell pool is a glassfish (at 10 h); the Shimmer Mirror →
// the next wild spawn on Dune Road is shiny; Bottled Haze → XP. A second talk the same day says it's sold. Shots tools/out/curio-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const story = ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'post_mirage', 'redrock_arrive', 'cup_canyon', 'devils1', 'sunshard', 'dash_canyon', 'rod'];
const start = (map, x, y, dir, hour) => pg.evaluate(([map, x, y, dir, flags, hour]) => {
  const keep = __save.adv?.hats?.length ? __save.adv : null;
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of flags) f[k] = true;
  __save.critters.cindermunch.level = 44;
  const now = new Date();
  __save.adv = { ...(keep || { hats: ['mirageturban'], flags: f }), hero: 'cindermunch', map, x, y, dir, spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false, shift: { day: now.toISOString().slice(0, 10), h: (hour - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(0.5);
}, [map, x, y, dir, story, hour]).then(close);
const close = async () => { await pg.waitForTimeout(1200); for (let k = 0; k < 14 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.6); }); await pg.waitForTimeout(80); } await pg.evaluate(() => __sim(1.5)); };
const say = async () => { await pg.waitForTimeout(800); return pg.evaluate(() => { __sim(1.5); return document.querySelector('.wd-box')?.textContent.replace('▼', '').slice(0, 130); }); };
const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `tools/out/curio-${n}-${tag}.png`, timeout: 120000 }); };
const talk = async (buy) => {
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 14; o.hy = 4; o.dir = 'n'; o.placeHero(); __sim(0.3); o.tapA = true; __sim(0.3); });
  const lines = [await say()];
  for (let k = 0; k < 4 && !(await pg.evaluate(() => [...document.querySelectorAll('button')].some((b) => /Buy it/.test(b.textContent)))); k++) { const l = await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.6); return document.querySelector('.wd-box')?.textContent.replace('▼', '').slice(0, 130); }); if (!l) break; lines.push(l); }
  if (buy) { await shot('ask'); await pg.evaluate(() => { [...document.querySelectorAll('button')].find((b) => /Buy it/.test(b.textContent))?.click(); __sim(0.5); }); lines.push('BUY → ' + await say()); }
  await close(); return lines.join(' / ');
};
const base = await pg.evaluate(() => Date.now());
for (let k = 0; k < 3; k++) {
  await pg.evaluate(([base, k]) => { const day = Math.floor(base / 86400000); let d = day; while (d % 3 !== k) d++; const off = (d - day) * 86400000; Date.now = () => base + off + performance.now(); }, [base, k]);
  await start('flats', 14, 7, 'n', 13);
  await pg.evaluate(() => { for (const f of Object.keys(__save.adv.flags)) if (f.startsWith('curio_')) delete __save.adv.flags[f]; __save.berries = 40; });
  console.log(`day ${k}:`, await talk(true));
  console.log('  again:', (await talk(false)).slice(0, 140));
  const A = await pg.evaluate(() => ({ lure: __save.adv.glassLure, shimmer: __save.adv.shimmer, berries: __save.berries, curios: __save.adv.curios, lv: __save.critters.cindermunch.level, xp: __save.critters.cindermunch.xp }));
  console.log('  state:', JSON.stringify(A));
  if (A.lure) {
    await start('oasis', 16, 9, 'n', 10);
    console.log('  lure catch:', await pg.evaluate(() => { const o = __game.screens.worldObj; o.fishing = { rod: new o.hero.root.constructor() }; o.hero.root.add(o.fishing.rod); o.reel('catch'); }).then(say), 'lure left', await pg.evaluate(() => !!__save.adv.glassLure));
    await close();
  }
  if (A.shimmer) {
    await start('duneroad', 8, 7, 'e', 10);
    console.log('  mirror spawn (the map\'s first wild critter on load takes it):', await pg.evaluate(() => { const o = __game.screens.worldObj; return `wild ${o.wild.length} shiny ${o.wild.filter((a) => a.shiny).map((a) => a.id).join(',') || 'none'} mirror left ${!!__save.adv.shimmer}`; }));
    await pg.evaluate(() => __sim(1)); await shot('shiny');
  }
}
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no errors');
await b.close();
