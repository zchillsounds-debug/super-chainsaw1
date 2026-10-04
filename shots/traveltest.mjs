// node shots/traveltest.mjs   Sawad -> marshes -> al-Karkh -> river quays (Round 20) -> Hamrin hills and back (Round 21) through saves and reloads
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:5173/?noadapt&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await pg.evaluate(() => { localStorage.clear(); const g = __game; g.started = true; g.setClass('rami', true); g.player.level = 8; g.act = 3; g.checkpoint(4); g.travel(); });
const step = async (label) => {
  await pg.waitForEvent('load', { timeout: 60000 }).catch(() => {});
  await pg.waitForFunction(() => window.__ready && window.__game, null, { timeout: 240000 });
  await pg.waitForTimeout(3000);
  return pg.evaluate((label) => { const g = __game; return `${label}: act=${g.act} quests=${g.quests.map((q) => q.id)} cls=${g.player.cls} lvl=${g.player.level} scene=${!!__director.def} started=${g.started}`; }, label);
};
console.log(await step('marsh'));
await pg.evaluate(() => { __director.skip(); __sim(1); });
console.log(await pg.evaluate(() => `after arrival: arrived=${JSON.stringify(__game.arrived)} pos=${__game.player.pos.x.toFixed(0)},${__game.player.pos.z.toFixed(0)}`));
await pg.evaluate(() => { const g = __game; g.checkpoint(5); g.travel(); });
console.log(await step('karkh'));
await pg.evaluate(() => { __director.skip(); __sim(1); });
console.log(await pg.evaluate(() => `save act=${JSON.parse(localStorage.getItem('sob.save.v1')).act} arrived=${JSON.stringify(__game.arrived)}`));
await pg.evaluate(() => { const g = __game; g.checkpoint(6); g.travel(); });
console.log(await step('docks'));
await pg.evaluate(() => { __director.skip(); __sim(1); });
console.log(await pg.evaluate(() => `docks: save act=${JSON.parse(localStorage.getItem('sob.save.v1')).act} arrived=${JSON.stringify(__game.arrived)} pos=${__game.player.pos.x.toFixed(0)},${__game.player.pos.z.toFixed(0)}`));
// Round 21: after the chronicle, ride north to the Hamrin hills and back down to the quays
await pg.evaluate(() => { const g = __game; g.act = 7; g.checkpoint?.(7); g.interactables.find((i) => /Hamrin hills/.test(i.label)).act(); });
console.log(await step('hamrin'));
await pg.evaluate(() => { __director.skip?.(); __sim(1); });
console.log(await pg.evaluate(() => `hamrin: endgame=${localStorage.getItem('sob.endgame')} act=${__game.act} pos=${__game.player.pos.x.toFixed(0)},${__game.player.pos.z.toFixed(0)}`));
await pg.evaluate(() => { __game.interactables.find((i) => /river quays/.test(i.label)).act(); });
console.log(await step('docks again'));
console.log(await pg.evaluate(() => `back: endgame=${localStorage.getItem('sob.endgame')} act=${__game.act}`));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
