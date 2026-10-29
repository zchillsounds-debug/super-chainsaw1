// node tools/coincase.mjs [WxH] : R881, the Sunwell Museum's Sun City coin case (0 / 5 / 12 coins): the case, its Look text,
// Curator Petra's thank-yous at 4, 8, 12 (the Sun-Coin Crown). Shots tools/out/cc-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=high' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `tools/out/cc-${n}-${tag}.png`, timeout: 120000 }); };
const all = ['intro', 'quest', 'crowned', 'ending', 'sunstone', 'rail_open', 'sands_arrive', 'gcap_done', 'aq_arrive', 'aqueduct_flow', 'aq_done'];
const close = async () => { for (let k = 0; k < 10 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.6); }); await pg.waitForTimeout(60); } };
const text = async () => { const out = []; for (let k = 0; k < 6; k++) { await pg.waitForTimeout(900); const t = await pg.evaluate(() => { __sim(1); return document.querySelector('.wd-box')?.textContent.replace('▼', '').slice(0, 150); }); if (!t || out.includes(t)) break; out.push(t); await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.4); }); } return out.join('\n     '); };
for (const n of [0, 5, 12]) {
  await pg.evaluate(([flags, n]) => {
    Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
    const f = {}; for (const k of flags) f[k] = true; __save.critters.cindermunch.level = 40;
    __save.adv = { hero: 'cindermunch', map: 'in:oasis:museum_o', x: 6, y: 5, dir: 'n', flags: f, hats: [], fossils: [], aqCoins: n, spawn: { map: 'oasis', x: 12, y: 12 }, sandstorm: false };
    __game.screens.adventure(); __sim(0.5);
  }, [all, n]);
  await pg.waitForTimeout(1500); await pg.evaluate(() => { __sim(3); const o = __game.screens.worldObj; o.hx = 6; o.hy = 5; o.dir = 'n'; o.placeHero(); __sim(0.5); });
  console.log(n, 'coins in', await pg.evaluate(() => __game.screens.worldObj.key), 'hint:', await pg.evaluate(() => __game.screens.worldObj.aHint?.()));
  await shot('case' + n);
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.3); }); console.log('  case:', await text()); await close();
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 6; o.hy = 3; o.dir = 'n'; o.placeHero(); o.tapA = true; __sim(0.3); }); console.log('  Petra:', await text()); await close();
}
console.log('flags:', await pg.evaluate(() => ['coin4', 'coin8', 'coin12'].map((k) => k + '=' + !!__save.adv.flags[k]).join(' ')), 'hat:', await pg.evaluate(() => __save.adv.hats.includes('coincrown')));
await pg.evaluate(() => { __save.adv.hat = 'coincrown'; const o = __game.screens.worldObj; o.load('oasis', 21, 12, 's'); __sim(1); });
await shot('crown');
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
