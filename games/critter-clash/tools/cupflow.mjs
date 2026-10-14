// node tools/cupflow.mjs [WxH] [cupIndex] : taps through a whole cup like a player (wins forced) and reports where it gets stuck
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '740x360').split('x').map(Number), cupI = +(process.argv[3] || 0);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?mobile&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const mode = () => pg.evaluate(() => __game.screens.mode + (__game.battle ? ':' + __game.battle.phase : ''));
// GROW=<lv> starts the partner just below that level, so the growing scene plays mid-cup
await pg.evaluate(([ci, gl]) => { __save.trainer = { name: 'Zee', partner: 'bubbalotl' }; __save.tutorialDone = true; __save.news = ['grove', 'otter', 'frogmole', 'jelly', 'team', 'grow']; if (gl) { __save.critters.cindermunch.level = gl - 1; __save.critters.cindermunch.xp = 140 + gl * 40; } if (ci) for (const c of __cups.slice(0, ci)) __save.cups[c.id] = true; __game.screens.title(); }, [cupI, +(process.env.GROW || 0)]);
await pg.waitForTimeout(800);
const tap = async (sel, text) => {
  const l = text ? pg.locator(sel, { hasText: text }).first() : pg.locator(sel).first();
  if (!(await l.count()) || !(await l.isVisible())) return false;
  const cover = await l.evaluate((el) => { const r = el.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    const anim = el.getAnimations({ subtree: false }).map((a) => a.animationName || a.constructor.name).join(',');
    return (t && !el.contains(t) ? 'covered by ' + t.tagName + '.' + t.className : '') + (anim ? ' anim:' + anim : '') + ' rect:' + [r.x, r.y, r.width, r.height].map(Math.round); });
  try { await l.tap({ timeout: 8000 }); } catch (e) { console.log('tap failed', sel, String(text), 'on', last, cover, String(e.message).split('\n').slice(-3).join(' / ')); return false; } await pg.waitForTimeout(450); return true;
};
const log = [];
let grew = 0;
let last = '', same = 0, trophy = false;
for (let step = 0; step < 160; step++) {
  const m = await mode();
  if (m !== last) { log.push(m); last = m; same = 0; } else same++;
  if (same > 12) { console.log('STUCK at', m); await pg.screenshot({ path: 'tools/out/cupflow-stuck.png' }); console.log('visible buttons:', (await pg.locator('button:visible').allTextContents()).join(' | ')); break; }
  if (m.startsWith('null:') || m.includes(':fight') || m.includes(':intro') || m.includes(':ko') || m.includes(':round')) {
    await pg.evaluate(() => { const bt = __game.battle; for (let i = 0; i < 6 && bt.phase !== 'done'; i++) { if (bt.phase === 'fight') { const c = bt.fighters[1]; c.hp = 0; bt.onKO(bt.fighters[0], c); } __sim(1); } });
    await pg.waitForTimeout(300); continue;
  }
  if (m === 'trophy') trophy = true;
  if (trophy && (m === 'cups' || m === 'title')) { console.log('CUP CLEARED'); break; }
  // the topmost thing to press, like a player would
  if (await tap('.prof-wrap')) continue;
  if (await pg.locator('.grow-wrap').count()) { grew++; await pg.waitForTimeout(600); if (grew === 1) console.log('growing scene showed on', last); }
  if (await tap('.modal-wrap button.btn')) continue;
  if (m === 'cups') { const l = pg.locator('.cup').nth(cupI); try { await l.tap({ timeout: 20000 }); } catch (e) { console.log('cup tap failed'); } await pg.waitForTimeout(450); continue; }
  if (m === 'cupselect' || m === 'select') { await tap('.rcard'); if (await tap('button', /GO|FIGHT|Choose|Battle/)) continue; }
  for (const re of [/Next Battle/, /Collect/, /Battle!/, /FIGHT/, /GO/, /Continue/, /Yay/, /Tournament/, /Back to Title/]) if (await tap('button:visible', re)) break;
  await pg.waitForTimeout(300);
}
console.log('path:', log.join(' > '));
console.log('errors:', errs.slice(0, 6).join(' | ') || 'none');
await b.close();
