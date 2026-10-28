// node tools/skychip.mjs [WxH] : R813: Quick Battle's sky chip. Opens Match Setup (Sandstorm Cup won), cycles the chip through every sky,
// then fights in each SKIES=night@dunes,sandstorm@meadow,rain@beach (sky@arena) and screenshots mid-fight. Shots in tools/out/sky-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `tools/out/sky-${n}-${tag}.png`, timeout: 120000 }); };
const setup = async () => {
  await pg.evaluate(() => { Object.assign(__save, { tutorialDone: true }); __save.adv = { flags: { cup_mirage: true, cup_canyon: true, cup_sandstorm: true } }; __game.screens.title(); });
  await pg.waitForTimeout(600);
  await pg.evaluate(() => { const S = __game.screens; S.ctx = { kind: 'quick' }; S.select(); S.sel = 0; S.matchSheet(false); });
  await pg.waitForTimeout(600);
};
await setup();
const chip = () => pg.evaluate(() => document.querySelector('.tp-sky')?.textContent.trim());
const seen = [await chip()];
for (let k = 0; k < 5; k++) { await pg.evaluate(() => document.querySelector('.tp-sky').click()); seen.push(await chip()); }
console.log('sky chip cycles:', seen.join(' → '));
await pg.evaluate(() => { while (!/Evening/.test(document.querySelector('.tp-sky').textContent)) document.querySelector('.tp-sky').click(); });
console.log('modal open:', await pg.evaluate(() => !!document.querySelector('.train-pick')));
await shot('setup');
for (const run of (process.env.SKIES || 'night@dunes,sandstorm@meadow,rain@beach').split(',').filter((r) => r.includes('@'))) {
  const [sky, ar] = run.split('@');
  await pg.evaluate(() => document.querySelector('.train-pick')?.remove());
  await setup();
  await pg.evaluate(([sky, ar]) => {
    for (let k = 0; k < 6 && !document.querySelector('.tp-sky').textContent.toLowerCase().includes(sky); k++) document.querySelector('.tp-sky').click();
    [...document.querySelectorAll('.tp-ar')].find((b) => b.dataset.k === ar)?.click();
    [...document.querySelectorAll('.train-pick button')].find((b) => /FIGHT/.test(b.textContent))?.click();
  }, [sky, ar]);
  await pg.waitForFunction(() => !!__game.battle, null, { timeout: 60000 }).catch(() => {});
  console.log(run, '→', await pg.evaluate(() => { const B = __game.battle; return B ? `${__game.arena.key} env ${JSON.stringify(B.env)} rainy ${__game.arena.rainy}` : 'no battle'; }));
  await pg.evaluate(() => { __game.autoplay = true; __sim(12); });
  await shot(sky);
  await pg.evaluate(() => __game.endBattle());
}
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no errors');
await b.close();
