// node tools/uishots.mjs [WxH] [step,step] : the C5 UI pass. Opens every Adventure menu, modal and Journal tab with an
// end-game save, screenshots each (tools/out/ui-<WxH>-<step>.png) and reports layout problems (text under 10 px, too): anything that spills
// out of the screen or out of its modal, text cut off sideways, and buttons under 26 px tall.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
import { endGameSave, STEPS } from './uisteps.mjs';
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number);
const only = process.argv[3]?.split(',');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?mobile&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.evaluate(endGameSave);
const CHECK = `(() => {
  const W = innerWidth, H = innerHeight, bad = [];
  const layers = [...document.querySelectorAll('.modal-wrap, .wd-box')].filter((e) => !e.matches('.wd-box') || !document.querySelector('.modal-wrap')); const top = layers[layers.length - 1];
  if (!top) return ['nothing open'];
  const box = (top.querySelector('.modal') || top).getBoundingClientRect();
  if (box.left < -1 || box.top < -1 || box.right > W + 1 || box.bottom > H + 1) bad.push('MODAL off-screen ' + [box.left, box.top, box.right, box.bottom].map(Math.round));
  for (const e of top.querySelectorAll('*')) {
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    // inside a scrolling list is fine vertically
    let sc = e.parentElement; while (sc && sc !== top && !/(auto|scroll)/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement;
    const name = (e.tagName + '.' + String(e.className).split(' ')[0] + ' "' + (e.textContent || '').trim().slice(0, 18) + '"');
    if (r.right > box.right + 2 || r.left < box.left - 2) bad.push('SIDE ' + name + ' ' + Math.round(r.left) + '..' + Math.round(r.right) + ' of ' + Math.round(box.left) + '..' + Math.round(box.right));
    else if ((!sc || sc === top) && (r.bottom > box.bottom + 2 || r.top < box.top - 2)) bad.push('VERT ' + name + ' ' + Math.round(r.top) + '..' + Math.round(r.bottom) + ' of ' + Math.round(box.top) + '..' + Math.round(box.bottom));
    if (e.scrollWidth > e.clientWidth + 2 && cs.textOverflow !== 'ellipsis' && (cs.webkitLineClamp || 'none') === 'none' && cs.overflowX !== 'visible' && !/(auto|scroll)/.test(cs.overflowX) && e.clientWidth > 0) bad.push('CUT ' + name + ' ' + e.scrollWidth + '>' + e.clientWidth);
    if ([...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && !e.closest('svg') && parseFloat(cs.fontSize) < 10) bad.push('TINY ' + name + ' ' + cs.fontSize);
    if ((e.tagName === 'BUTTON' || e.classList.contains('btn')) && r.height < 26 && !e.closest('.jr-album')) bad.push('SMALL ' + name + ' h' + Math.round(r.height));
  }
  return [...new Set(bad)].slice(0, 12);
})()`;
for (const [name, js] of STEPS) {
  if (only && !only.includes(name)) continue;
  try {
    await pg.evaluate(`(() => { const S = __game.screens; document.querySelectorAll('.modal-wrap, .prof-wrap, .wd-box').forEach((m) => m.remove()); __game.modalClose = null; if (S.worldObj) { S.worldObj.dialog = null; S.worldObj.busy = false; } ${js}; })()`);
    await pg.waitForTimeout(900); await pg.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) { /* infinite */ } }));
    await pg.evaluate(() => { const p = document.querySelector('.wd-box p'); const D = __game.screens.worldObj?.dialog; if (p && D && !document.querySelector('.wd-ask')) D.next(); }); // finish the typing
    await pg.waitForTimeout(200);
    const bad = await pg.evaluate(CHECK);
    console.log(`${w}x${h} ${name}: ${bad.length ? bad.join(' | ') : 'ok'}`);
    await pg.screenshot({ path: `tools/out/ui-${w}x${h}-${name}.png` });
  } catch (e) { console.log(`${w}x${h} ${name}: ERROR ${e.message.split('\n')[0]}`); }
}
if (errs.length) console.log('page errors:', errs.slice(0, 5).join(' | '));
await b.close();
