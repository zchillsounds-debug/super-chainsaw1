// node tools/teamsky.mjs [WxH] : R818: Team Battle's sky chip. Opens Pick Your Team (Sandstorm Cup won), cycles the chip,
// picks SKY (default night), fights, checks the battle env on fight 1 and fight 2, screenshots the setup and mid-fight (tools/out/teamsky-*).
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`, SKY = process.env.SKY || 'night';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `tools/out/teamsky-${n}-${tag}.png`, timeout: 120000 }); };
await pg.evaluate(() => { Object.assign(__save, { tutorialDone: true }); __save.adv = { flags: { cup_mirage: true, cup_canyon: true, cup_sandstorm: true } };
  for (const id of ['bubbalotl', 'cindermunch', 'clovebun', 'voltferret']) if (!__save.unlocked.includes(id)) __save.unlocked.push(id);
  __game.screens.title(); });
await pg.waitForTimeout(600);
await pg.evaluate(() => { const S = __game.screens; S.ctx = { kind: 'team' }; S.select(); S.sel = 0; S.teamSheet(); });
await pg.waitForTimeout(600);
const chip = () => pg.evaluate(() => document.querySelector('.tp-sky')?.textContent.trim());
const seen = [await chip()];
for (let k = 0; k < 5; k++) { await pg.evaluate(() => document.querySelector('.tp-sky').click()); seen.push(await chip()); }
console.log('team sky chip cycles:', seen.join(' → '));
await pg.evaluate((sky) => { for (let k = 0; k < 6 && !document.querySelector('.tp-sky').textContent.toLowerCase().includes(sky); k++) document.querySelector('.tp-sky').click(); }, SKY);
await pg.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); await shot('setup');
await pg.evaluate(() => [...document.querySelectorAll('.train-pick button')].find((b) => /FIGHT/.test(b.textContent))?.click());
for (let f = 1; f <= 2; f++) {
  await pg.waitForFunction(() => !!__game.battle, null, { timeout: 60000 }).catch(() => {});
  console.log('fight', f, '→', await pg.evaluate(() => { const B = __game.battle; return B ? `${__game.arena.key} env ${JSON.stringify(B.env)} label ${document.querySelector('.vs-side.r small')?.textContent || ''}` : 'no battle'; }));
  await pg.evaluate(() => { __game.autoplay = true; __sim(10); });
  if (f === 1) await shot('fight');
  await pg.evaluate(() => { const bt = __game.battle; const [p, c] = bt.fighters; c.hp = 0; bt.onKO(p, c); for (let i = 0; i < 8 && bt.phase !== 'done'; i++) __sim(1); });
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Next|Continue|Fight/i.test(b.textContent) && b.offsetParent)?.click());
  await pg.waitForTimeout(1500);
}
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no errors');
await b.close();
