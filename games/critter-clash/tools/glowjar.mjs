// node tools/glowjar.mjs [WxH] : R868, Pim's jar of glowcap spores for Lantern Maker Yusra. Talks to Pim in Glowcap Hollow (the ask),
// walks the jar to the night market at 21h (the hand-over: the Glowcap Lantern Hat), re-enters the market and shoots the strings with
// their new teal glowcap lanterns, then sends up a sky lantern (teal now). Shots tools/out/glowjar-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const flags = 'intro,quest,crowned,ending,isle_arrive,sunstone,rail_open,sands_arrive,cup_mirage,post_mirage,cup_canyon,spring_arrive,odjournal_done,hollow_arrive,gcap_asked,gcap_done'.split(',');
const go = (map, x, y, dir, hour) => pg.evaluate(([map, x, y, dir, flags, hour]) => {
  const keep = __save.adv?.cnt ? __save.adv : null, now = new Date();
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  __save.adv = { ...(keep || { hats: ['glowcaphat'], flags: Object.fromEntries(flags.map((k) => [k, true])), cnt: {}, seen: { oasis: true } }), hero: 'cindermunch', map, x, y, dir, spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false, rain: false, shift: { day: now.toISOString().slice(0, 10), h: (hour - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(0.5);
}, [map, x, y, dir, flags, hour]);
const read = async () => { const t = []; for (let k = 0; k < 12; k++) { const l = await pg.evaluate(() => { __sim(1.2); return document.querySelector('.wd-box')?.textContent.replace('▼', '').slice(0, 110); }); if (!l) break; if (t[t.length - 1] !== l) t.push(l); await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.4); }); } return t.join(' / '); };
const talk = async (id) => { await pg.evaluate((id) => { const o = __game.screens.worldObj; o.talk(o.npcs.find((a) => a.n.id === id)); }, id); return read(); };
const mark = (id) => pg.evaluate((id) => { const a = __game.screens.worldObj.npcs.find((q) => q.n.id === id); return a ? (a.mark ? a.markKind : '-') : 'absent'; }, id);
await go('glowhollow', 11, 9, 'e', 12); await read();
console.log('Pim mark:', await mark('pim_h'));
console.log('Pim:', await talk('pim_h'));
console.log('asked:', await pg.evaluate(() => !!__save.adv.flags.glowjar_asked), '· Pim mark after:', await mark('pim_h'));
await go('oasis', 12, 12, 'n', 21); await read();
console.log('Yusra mark:', await mark('yusra_o'));
console.log('Yusra:', await talk('yusra_o'));
console.log('done:', await pg.evaluate(() => JSON.stringify({ done: !!__save.adv.flags.glowjar_done, hat: __save.adv.hats.includes('glowlantern'), berries: __save.berries })));
await go('oasis', 12, 12, 'n', 21); await read(); await pg.evaluate(() => { __save.adv.hat = 'glowlantern'; __game.screens.worldObj.dressHero?.(); __sim(2); });
await pg.waitForTimeout(600); await pg.screenshot({ path: `tools/out/glowjar-market-${tag}.png`, timeout: 120000 });
console.log('Yusra again:', await talk('yusra_o'));
console.log('Pim after:', await (async () => { await go('glowhollow', 11, 9, 'e', 12); await read(); return talk('pim_h'); })());
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
