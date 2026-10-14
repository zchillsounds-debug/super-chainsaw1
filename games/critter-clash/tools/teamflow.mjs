// node tools/teamflow.mjs [WxH] [pattern] : taps through a whole Team Battle like a player.
// pattern is a string of w/l for each fight's forced outcome (default "wlww" = win, lose, win, win...).
// Prints the screen path, or STUCK at <mode> + a screenshot (tools/out/teamflow-stuck.png).
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '740x360').split('x').map(Number), pattern = process.argv[3] || 'wlwww';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?mobile&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const mode = () => pg.evaluate(() => (__game.screens.mode || 'battle') + (__game.battle ? ':' + __game.battle.phase : ''));
await pg.evaluate(() => { __save.trainer = { name: 'Zee', partner: 'bubbalotl' }; __save.tutorialDone = true; __save.news = ['grove', 'otter', 'frogmole', 'jelly', 'team'];
  for (const id of ['bubbalotl', 'cindermunch', 'clovebun', 'voltferret']) if (!__save.unlocked.includes(id)) __save.unlocked.push(id); __game.screens.title(); });
await pg.waitForTimeout(800);
const tap = async (sel, text) => {
  const l = text ? pg.locator(sel, { hasText: text }).first() : pg.locator(sel).first();
  if (!(await l.count()) || !(await l.isVisible())) return false;
  try { await l.tap({ timeout: 8000 }); } catch (e) { console.log('tap failed', sel, String(text), 'on', last); return false; }
  await pg.waitForTimeout(450); return true;
};
const log = []; let last = '', same = 0, fight = 0, ok = false;
for (let step = 0; step < 200; step++) {
  const m = await mode();
  if (m !== last) { log.push(m); last = m; same = 0; } else same++;
  if (same > 12) { console.log('STUCK at', m); await pg.screenshot({ path: 'tools/out/teamflow-stuck.png' }); console.log('visible buttons:', (await pg.locator('button:visible').allTextContents()).join(' | ')); break; }
  if (m.startsWith('battle:') && !m.endsWith(':done')) {
    const win = pattern[fight] !== 'l';
    const r = await pg.evaluate((win) => { const bt = __game.battle; for (let i = 0; i < 8 && bt.phase !== 'done'; i++) { if (bt.phase === 'fight') { const [p, c] = bt.fighters; const loser = win ? c : p; loser.hp = 0; bt.onKO(win ? p : c, loser); } __sim(1); } return bt.phase; }, win);
    if (r === 'done') fight++;
    await pg.waitForTimeout(300); continue;
  }
  if (m === 'teamwin') { ok = true; console.log('team trophy screen buttons:', (await pg.locator('button:visible').allTextContents()).join(' | ')); break; }
  if (await tap('button:visible', /New Team Battle/)) { ok = true; break; }
  if (await tap('button:visible', /Team Trophy/)) continue;
  if (await tap('.prof-wrap')) continue;
  if (await tap('.modal-wrap:not(.train-pick) button.btn')) continue;
  if (await tap('.team-pick button', /FIGHT/)) continue;
  if (m === 'title') { await tap('button:visible', /Challenges/); continue; }
  if (m === 'challenges' || m === 'cups') { if (await tap('.cup', /Team Battle/)) continue; }
  if (m === 'select') { await tap('.rcard'); if (await tap('button:visible', /GO|FIGHT|Choose|Battle/)) continue; }
  for (const re of [/Next Rival/, /Send Next/, /Battle!/, /FIGHT/, /GO/, /Continue/, /Yay/]) if (await tap('button:visible', re)) break;
  await pg.waitForTimeout(300);
}
console.log(ok ? `TEAM BATTLE FINISHED after ${fight} fights` : 'did not finish');
console.log('result:', await pg.evaluate(() => JSON.stringify({ over: __game.screens.ctx.over, pi: __game.screens.ctx.pi, fi: __game.screens.ctx.fi, wins: __save.stats.teamWins })));
console.log('path:', log.join(' > '));
console.log('errors:', errs.slice(0, 6).join(' | ') || 'none');
await b.close();
