// node tools/glidechain.mjs [WxH]: plays Hana's Kite Glider chain (Bluffs → Cloudtop → Neon → Bluffs), glides to Windcrest Stack, opens the nest, glides back
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
const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,cup_coral,cup_gale,cup_sky,cup_midnight'.split(',').map((k) => [k, true]));
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate'] });
  __save.adv = { hero: 'cindermunch', map: 'bluffs', x: 24, y: 12, dir: 's', flags, spawn: { map: 'village', x: 4, y: 6 } };
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
await step('bluffs', 'updraft', 24, 12);
console.log('marks bluffs:', await marks());
await step('bluffs', 'hana_b', 24, 12);
await step('cloudtop', 'kite', 18, 6); console.log('marks cloudtop:', await marks());
await step('cloudtop', 'kite', 18, 6);
await step('cloudtop', 'kite', 18, 6);
await step('neon', 'tinker', 17, 13);
await step('neon', 'tinker', 17, 13);
await step('bluffs', 'hana_b', 24, 12);
await step('bluffs', 'hana_b', 24, 12);
console.log('glider:', await pg.evaluate(() => __save.adv.flags.glider));
await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.load('bluffs', 24, 13, 'e'); __sim(0.3); });
await step('bluffs', 'updraft', 24, 13);
for (let i = 0; i < 6; i++) { await pg.evaluate(() => __sim(0.25)); if (i === 2) await pg.screenshot({ path: 'tools/out/glide-up.png' }); }
await pg.waitForTimeout(1200); await pg.evaluate(() => __sim(0.5));
console.log('now on:', await pg.evaluate(() => __game.screens.worldObj.key + ' ' + __game.screens.worldObj.hx + ',' + __game.screens.worldObj.hy));
await pg.waitForTimeout(800); await pg.evaluate(() => __sim(0.5));
await pg.screenshot({ path: 'tools/out/stack.png' });
await step('stack', 'nest', 11, 4);
console.log('shiny:', await pg.evaluate(() => __save.shinies?.join() + ' / unlocked skimray ' + __save.unlocked.includes('skimray')));
await step('stack', 'updraft', 9, 9);
for (let i = 0; i < 6; i++) await pg.evaluate(() => __sim(0.25));
await pg.waitForTimeout(1200); await pg.evaluate(() => __sim(0.5));
console.log('back on:', await pg.evaluate(() => __game.screens.worldObj.key + ' ' + __game.screens.worldObj.hx + ',' + __game.screens.worldObj.hy + ' hero y ' + __game.screens.worldObj.hero.root.position.y.toFixed(2)));
// the Ember Isle thermal → the Caldera Rim and its chest, then back
await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.load('ember_isle', 19, 2, 'n'); __sim(0.3); });
await step('ember_isle', 'updraft', 19, 2);
for (let i = 0; i < 6; i++) await pg.evaluate(() => __sim(0.25));
await pg.waitForTimeout(1200); await pg.evaluate(() => __sim(0.5));
console.log('now on:', await pg.evaluate(() => __game.screens.worldObj.key + ' ' + __game.screens.worldObj.hx + ',' + __game.screens.worldObj.hy));
await step('rim', 'nest', 10, 2);
console.log('hats:', await pg.evaluate(() => __save.adv.hats.join()));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
