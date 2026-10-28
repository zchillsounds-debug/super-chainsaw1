// node tools/flats.mjs [WxH] : R814: the Glass Flats (south of Dune Road, after the Canyon Cup). HOURS=13,10,21: the salt crust, the mirage town and
// the Mirage Merchant at 13 h (buys the Mirage Turban), none of it at 10 h. Shots in tools/out/flats-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const story = ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'post_mirage', 'redrock_arrive', 'cup_canyon', 'devils1', 'sunshard', 'dash_canyon'];
const start = (map, x, y, dir, hour, flags = story) => pg.evaluate(([map, x, y, dir, flags, hour]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [], berries: 40 });
  const f = {}; for (const k of flags) f[k] = true;
  __save.critters.cindermunch.level = 44;
  const now = new Date();
  __save.adv = { hero: 'cindermunch', map, x, y, dir, flags: f, hats: [], spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false, shift: { day: now.toISOString().slice(0, 10), h: (hour - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(0.5);
}, [map, x, y, dir, flags, hour]).then(close);
const close = async () => { await pg.waitForTimeout(1200); for (let k = 0; k < 14 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.6); }); await pg.waitForTimeout(80); } await pg.evaluate(() => __sim(1.5)); };
const say = async () => { await pg.waitForTimeout(800); return pg.evaluate(() => { __sim(1.5); return document.querySelector('.wd-box')?.textContent.replace('▼', '').slice(0, 110); }); };
const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `tools/out/flats-${n}-${tag}.png`, timeout: 120000 }); };
for (const hr of (process.env.HOURS || '13,10,21').split(',').map(Number)) {
  await start('flats', 14, +(process.env.Y || 7), 'n', hr);
  console.log(hr + 'h:', await pg.evaluate(() => { const o = __game.screens.worldObj; return `mirage ${o.mirageHour()} town ${(o.mirages || []).filter((q) => q.town).length} merchant ${o.npcs.some((a) => a.n.id === 'merchant_f')}`; }));
  await pg.evaluate(() => __sim(3)); await shot('h' + hr);
  if (hr === 13) {
    await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 14; o.hy = 4; o.dir = 'n'; o.placeHero(); __sim(0.3); o.tapA = true; __sim(0.3); });
    console.log('merchant:', await say()); await shot('merchant');
    for (let k = 0; k < 3 && !(await pg.evaluate(() => !!document.querySelector('.wd-ask, .wd-opts button, .wd-choice'))); k++) await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.6); });
    await pg.evaluate(() => { const bt = [...document.querySelectorAll('button')].find((b) => /Buy it/.test(b.textContent)); bt?.click(); __sim(0.5); });
    console.log('after buy:', await say()); await close();
    console.log('hat:', await pg.evaluate(() => __save.adv.hats.includes('mirageturban')), 'berries', await pg.evaluate(() => __save.berries));
    await pg.evaluate(() => { __save.adv.hat = 'mirageturban'; const o = __game.screens.worldObj; o.load?.('flats', 14, 6, 'n'); __sim(1); }).catch(() => {});
    await pg.evaluate(() => __sim(1)); await shot('turban');
  }
}
// R815: the salt road (SALT=0 skips): Hamid → Zahra → Hamid, the Salt Miner's Helmet
if (process.env.SALT !== '0') {
  const talk = async (map, x, y, dir, hr = 10) => { await pg.evaluate(([map]) => { const o = __game.screens.worldObj; if (o.key !== map) o.load(map, 5, 5, 's'); __sim(1); }, [map]); await pg.waitForTimeout(1500); await pg.evaluate(([map, x, y, dir]) => { const o = __game.screens.worldObj; __sim(1); o.hx = x; o.hy = y; o.dir = dir; o.placeHero(); __sim(0.3); o.tapA = true; __sim(0.3); }, [map, x, y, dir]); const t = []; for (let k = 0; k < 14; k++) { const l = await pg.evaluate(() => { __sim(1.5); const b = document.querySelector('.wd-box'); const t = b?.textContent.replace('▼', '').slice(0, 90); if (b) { __game.screens.worldObj.tapA = true; __sim(0.4); } return t; }); if (!l) break; t.push(l); } await close(); return t.join(' / '); };
  await start('flats', 6, 9, 'e', 10);
  console.log('Hamid 1:', await talk('flats', 6, 9, 'e'));
  console.log('Zahra 1:', await talk('dunecamp', 7, 6, 'n'));
  console.log('Zahra 2:', await talk('dunecamp', 7, 6, 'n'));
  await pg.waitForTimeout(1500); await pg.evaluate(() => __sim(2));
  console.log('Zahra hint:', await pg.evaluate(() => { const o = __game.screens.worldObj; return o.aHint() + ' busy ' + o.busy + ' box ' + !!document.querySelector('.wd-box'); }));
  console.log('Zahra 3:', await talk('dunecamp', 7, 6, 'n'));
  console.log('Hamid 2:', await talk('flats', 6, 9, 'e'));
  console.log('Hamid 3:', await talk('flats', 6, 9, 'e'));
  await shot('salt');
  console.log('salt flags:', await pg.evaluate(() => Object.keys(__save.adv.flags).filter((k) => k.startsWith('salt')).join(',')), 'helmet', await pg.evaluate(() => __save.adv.hats.includes('minerhelm')));
}
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no errors');
await b.close();
