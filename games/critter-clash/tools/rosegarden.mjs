// node tools/rosegarden.mjs [WxH] [preset] : R893, Salt Carver Yara's rose-salt statues (after the eight white ones). Starts with all
// eight white statues and [preset] rose ones (default 3): first without shiny colours (her hint), then in shiny colours (pose; at four
// the Rose Salt Tiara), then the same-day reply. Shots tools/out/rg-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`, preset = +(process.argv[3] ?? 3);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=high' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const shot = async (n) => { await pg.waitForTimeout(600); await pg.screenshot({ path: `tools/out/rg-${n}-${tag}.png`, timeout: 120000 }); };
const text = async () => { await pg.waitForTimeout(900); return pg.evaluate(() => { __sim(1); return document.querySelector('.wd-box')?.textContent.replace('▼', '').slice(0, 130); }); };
const tap = () => pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.3); });
const close = async () => { for (let k = 0; k < 14 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await tap(); await pg.waitForTimeout(80); } };
await pg.evaluate((preset) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of 'intro,quest,crowned,ending,sunstone,rail_open,sands_arrive,cup_mirage,cup_canyon'.split(',')) f[k] = true;
  const now = new Date(); __save.critters.cindermunch.level = 40;
  __save.adv = { hero: 'cindermunch', map: 'flats', x: 13, y: 10, dir: 'n', flags: f, hats: [], saltStat: ['sizzlard', 'humpdrop', 'fennzap', 'scarabold', 'cactortle', 'siroccat', 'pebblepup', 'bubbalotl'], roseStat: ['sizzlard', 'humpdrop', 'fennzap'].slice(0, preset), spawn: { map: 'oasis', x: 14, y: 12 }, sandstorm: false, shift: { day: now.toISOString().slice(0, 10), h: (11 - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(1.5); const o = __game.screens.worldObj; o.hx = 13; o.hy = 10; o.dir = 'n'; o.placeHero(); __sim(0.3);
}, preset);
console.log('mark (hint not seen):', await pg.evaluate(() => { const a = __game.screens.worldObj.npcs.find((q) => q.n.id === 'yara_f'); return a?.mark ? a.markKind : null; }));
await tap(); console.log('no shiny:', await text()); await close();
await pg.evaluate(() => { (__save.skins ||= {}).cindermunch = 'shiny'; __game.screens.worldObj.questMarks(); });
console.log('mark (shiny lead):', await pg.evaluate(() => { const a = __game.screens.worldObj.npcs.find((q) => q.n.id === 'yara_f'); return a?.mark ? a.markKind : null; }));
await shot('before');
await tap(); console.log('ask:', await text());
await pg.evaluate(() => { __game.screens.worldObj.dialog?.next?.(); __sim(0.3); });
for (let k = 0; k < 4; k++) { await tap(); await pg.waitForTimeout(500); }
await pg.waitForTimeout(800); await pg.evaluate(() => __sim(1));
console.log('after:', await text());
await close();
console.log('state:', await pg.evaluate(() => [__save.adv.roseStat.join(','), __save.adv.saltDay, (__save.adv.hats || []).join(','), __save.berries]));
await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 13; o.hy = 10; o.dir = 's'; o.placeHero(); __sim(0.5); });
await shot('garden');
await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 13; o.hy = 10; o.dir = 'n'; o.placeHero(); __sim(0.3); });
await tap(); console.log('again:', await text()); await close();
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
