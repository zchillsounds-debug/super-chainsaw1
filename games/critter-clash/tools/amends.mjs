// node tools/glidechain.mjs [WxH]: plays Morra's Amends (Starfall Atoll hub: goggles to Pia, stick to Old Tutu, letter to Lumi)
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [size = '915x412'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,cup_coral,cup_gale,cup_caldera,morra,sunstone,atoll,skua_b'.split(',').map((k) => [k, true]));
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate'] });
  __save.adv = { hero: 'cindermunch', map: 'atoll', x: 13, y: 4, dir: 's', clock: 13, flags, spawn: { map: 'village', x: 4, y: 6 } };
  __game.screens.adventure(); __sim(0.3);
}, flags);
const drain = () => pg.evaluate(() => { const wo = __game.screens.worldObj, out = []; for (let i = 0; i < 30 && wo.dialog; i++) { out.push(document.querySelector('.wd-box')?.textContent?.slice(0, 90)); wo.dialog.next(); __sim(0.05); } return out; });
const step = async (map, npc, x, y) => {
  await pg.evaluate(([map, npc, x, y]) => { const wo = __game.screens.worldObj; if (wo.key !== map) { wo.load(map, x, y, 's'); __sim(0.3); }
    if (npc === 'updraft') return wo.updraftTalk(wo.updrafts[0]);
    if (npc === 'nest') return wo.openChest();
    const a = wo.npcs.find((q) => q.n.id === npc); if (!a) throw new Error('no npc ' + npc); wo.talk(a); }, [map, npc, x, y]);
  await pg.waitForTimeout(300);
  const said = await drain();
  console.log(`[${map}:${npc}]`, said.filter(Boolean).map((t) => t.slice(0, 70)).join(' / '));
};
const marks = () => pg.evaluate(() => __game.screens.worldObj.npcs.filter((a) => a.mark).map((a) => a.n.id).join());
await step('atoll', 'morra_b', 13, 4); console.log('marks atoll:', await marks());
await step('coral', 'snorkel', 19, 13);
await step('atoll', 'morra_b', 13, 4);
await step('atoll', 'morra_b', 13, 4);
await step('ember_isle', 'tutu_e', 14, 10);
await step('atoll', 'morra_b', 13, 4);
await step('atoll', 'keeper_a', 11, 4);
await step('atoll', 'morra_b', 13, 4);
console.log('result:', await pg.evaluate(() => JSON.stringify({ hats: __save.adv.hats, shinies: __save.shinies, hootsy: __save.unlocked.includes('hootsy'), done: ['amends1', 'amends2', 'amends3'].map((k) => !!__save.adv.flags[k + '_done']) })));
await pg.evaluate(() => __game.screens.worldJournal('fav')); await pg.waitForTimeout(300);
console.log('journal:', await pg.evaluate(() => document.querySelector('.jr-list')?.textContent.slice(0, 300)));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
