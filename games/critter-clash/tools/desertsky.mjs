// node tools/desertsky.mjs [WxH] [nights] : R896, Stargazer Nuri's telescope on the Singing Dunes after dark (the desert sky's own star log).
// Night after night (the date faked forward), looks through it, shoots the eyepiece and prints the lines; then the Journal's Night tab.
// Shots tools/out/dsky-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`, nights = +(process.argv[3] || 4);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=high' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `tools/out/dsky-${n}-${tag}.png`, timeout: 120000 }); };
const text = () => pg.evaluate(() => document.querySelector('.wd-box')?.textContent.replace('▼', '').slice(0, 160));
const close = async () => { const out = []; for (let k = 0; k < 12 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.waitForTimeout(500); await pg.evaluate(() => __sim(2)); out.push(await text()); await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.4); }); await pg.waitForTimeout(60); } return out; };
for (let d = 0; d < nights; d++) {
  const ph = await pg.evaluate(([d, keep]) => {
    const RD = Date; if (!window.__RD) window.__RD = RD; const off = d * 86400000; // fake the date forward a night at a time
    window.Date = class extends window.__RD { constructor(...a) { super(...(a.length ? a : [window.__RD.now() + off])); } static now() { return window.__RD.now() + off; } };
    const prev = keep ? (__save.adv?.dconsts || []) : [];
    Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
    const f = {}; for (const k of 'intro,quest,crowned,ending,sunstone,rail_open,sands_arrive,cup_mirage,cup_canyon,dash_canyon,cup_sandstorm,citymap,sunbird1,legend_aurelark'.split(',')) f[k] = true;
    const now = new Date(); __save.critters.cindermunch.level = 44;
    __save.adv = { hero: 'cindermunch', map: 'singing', x: 12, y: 5, dir: 'w', flags: f, hats: [], dconsts: prev, spawn: { map: 'oasis', x: 14, y: 12 }, sandstorm: false, seen: { singing: 1 }, shift: { day: now.toISOString().slice(0, 10), h: (22 - now.getHours() + 24) % 24 } };
    if (__game.screens.worldObj) __game.screens.worldObj.load('singing', 12, 5, 'w'); else __game.screens.adventure(); __sim(1); return __game.screens.worldObj.phase + ' scope=' + JSON.stringify(__game.screens.worldObj.scope && { x: __game.screens.worldObj.scope.x, d: __game.screens.worldObj.scope.desert });
  }, [d, d > 0]);
  if (!d) { console.log('phase', ph); await close(); await shot('scope'); }
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.3); });
  await pg.waitForTimeout(300);
  const open = await pg.evaluate(() => !!document.querySelector('.stars-wrap'));
  if (!open) { console.log('night', d, 'no eyepiece:', await text()); await close(); continue; }
  await pg.evaluate(() => __sim(6)); await pg.waitForTimeout(400);
  if (!d) await shot('eyepiece');
  console.log('night', d, await pg.evaluate(() => document.querySelector('.st-name')?.textContent));
  await pg.evaluate(() => document.querySelector('.stars-wrap').__stars?.close?.()); await pg.waitForTimeout(300);
  console.log('  ', (await close()).join(' / '));
}
console.log('dconsts', await pg.evaluate(() => JSON.stringify(__save.adv.dconsts)), 'consts', await pg.evaluate(() => JSON.stringify(__save.adv.consts || [])));
await pg.evaluate(() => __game.screens.worldJournal('night')); await pg.waitForTimeout(800);
console.log('night tab:', await pg.evaluate(() => [...document.querySelectorAll('.jr-list > *')].map((e) => e.textContent.trim()).filter((t) => /Desert sky|Sun-Bird|Caravan|Nuri/.test(t)).join(' | ')));
await shot('journal');
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
