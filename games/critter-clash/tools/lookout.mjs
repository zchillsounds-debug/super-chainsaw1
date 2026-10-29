// node tools/lookout.mjs [WxH] [days] : R885, Lookout Omar's spyglass on Redrock Mesa. Talks to Omar by day, shoots the spyglass view, answers
// (right, unless WRONG=1), repeats for [days] days (faking the date) to earn the Lookout's Spyglass Cap; night falls through to his lines. Shots tools/out/lo-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`, days = +(process.argv[3] || 1);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=high' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const shot = async (n) => { await pg.waitForTimeout(600); await pg.screenshot({ path: `tools/out/lo-${n}-${tag}.png`, timeout: 120000 }); };
const text = async () => { await pg.waitForTimeout(900); return pg.evaluate(() => { __sim(1); return document.querySelector('.wd-box')?.textContent.replace('▼', '').slice(0, 130); }); };
const tap = () => pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.3); });
const start = (hr, keep) => pg.evaluate(([hr, keep]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of 'intro,quest,crowned,ending,sunstone,rail_open,sands_arrive,cup_mirage,cup_canyon,dash_canyon,redrock_arrive'.split(',')) f[k] = true;
  const now = new Date(), old = __save.adv || {};
  __save.adv = { hero: 'cindermunch', map: 'mesa', x: 11, y: 3, dir: 'n', flags: f, hats: keep ? old.hats || [] : [], scopeN: keep ? old.scopeN : 0, spawn: { map: 'oasis', x: 14, y: 12 }, sandstorm: false, shift: { day: now.toISOString().slice(0, 10), h: (hr - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(1.5); const o = __game.screens.worldObj; o.hx = 11; o.hy = 3; o.dir = 'n'; o.placeHero(); __sim(0.3); return o.phase;
}, [hr, keep]);
const RD = Date.prototype.toISOString;
for (let d = 0; d < days; d++) {
  if (d) await pg.evaluate((d) => { const R = Date.prototype.__iso ||= Date.prototype.toISOString; Date.prototype.toISOString = function () { return R.call(new Date(this.getTime() + d * 864e5)); }; }, d);
  console.log('day', d, await start(12, d > 0));
  await tap(); console.log(' omar:', await text());
  for (let k = 0; k < 5 && !(await pg.evaluate(() => !!document.querySelector('.wd-scope'))); k++) { await tap(); await pg.waitForTimeout(300); await pg.evaluate(() => __sim(0.5)); }
  console.log(' scope open:', await pg.evaluate(() => !!document.querySelector('.wd-scope')));
  if (!d || process.env.SHOTALL) { await pg.waitForTimeout(1200); await shot('view' + (d || '')); }
  for (let k = 0; k < 5 && !(await pg.evaluate(() => !!document.querySelector('.wd-opts'))); k++) { await tap(); await pg.waitForTimeout(300); await pg.evaluate(() => __sim(0.5)); }
  const opts = await pg.evaluate(() => [...document.querySelectorAll('.wd-opts button')].map((e) => e.textContent));
  console.log(' options:', opts.join(' / '));
  if (!d) await shot('ask');
  // the right answer: read it from the game's own day hash
  const right = await pg.evaluate(() => { const day = new Date().toISOString().slice(0, 10), h = [...day].reduce((v, c) => (v * 31 + c.charCodeAt(0)) >>> 0, 7); return ['Sunwell Oasis', 'Redrock Canyon', 'the Dune Camp', 'the Sun Gate', 'the Glass Flats', 'the Singing Dunes'][h % 6]; });
  const i = process.env.WRONG ? opts.findIndex((o) => o !== right) : opts.indexOf(right);
  await pg.click(`.wd-opts button[data-i="${i}"]`); await pg.evaluate(() => __sim(0.2));
  console.log(' answer', opts[i], '->', await text());
  for (let k = 0; k < 6 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await tap(); await pg.waitForTimeout(80); }
  await tap(); console.log(' again:', await text());
  for (let k = 0; k < 6 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await tap(); await pg.waitForTimeout(80); }
  console.log(' scopeN', await pg.evaluate(() => [__save.adv.scopeN, __save.adv.scopeDay, (__save.adv.hats || []).join(',')]));
}
console.log('night', await start(22)); await tap(); console.log(' omar:', await text());
if (days >= 5) { await pg.evaluate(() => { __save.adv.hat = 'scopecap'; const o = __game.screens.worldObj; o.load('mesa', 9, 6, 's'); __sim(1); }); await start(12, true); await pg.evaluate(() => { __save.adv.hat = 'scopecap'; const o = __game.screens.worldObj; o.load('mesa', 9, 6, 's'); __sim(1); }); await shot('cap'); }
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
