// node tools/sfxcheck.mjs [WxH] [step,step] : the C6 sound pass. Opens each uishots step (plus the title, Quick Battle select and
// the Critterdex), then taps every button and tappable thing on the top layer one at a time (re-opening the step before each tap)
// and lists the ones that play no sound effect at all. Needs window.__sfx (main.js).
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
import { endGameSave, STEPS } from './uisteps.mjs';
const [w, h] = (process.argv[2] || '740x360').split('x').map(Number);
const only = process.argv[3]?.split(',');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
// tag every element that gets a tap listener, so plain divs (hat tiles, map pins) count as tappable too
await pg.addInitScript(() => {
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, o) { if (this instanceof Element && /^(click|pointerdown|pointerup|touchstart)$/.test(type)) (this.__tap ||= new Set()).add(type); return add.call(this, type, fn, o); };
});
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?mobile&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.evaluate(endGameSave);
await pg.evaluate(() => { window.__calls = []; for (const k of Object.keys(__sfx)) { const f = __sfx[k]; if (typeof f === 'function') __sfx[k] = function (...a) { __calls.push(k); return f.apply(this, a); }; } });
const ALL = [...STEPS, ['title', 'S.leaveWorld(); S.title()'], ['select', "S.leaveWorld(); S.ctx = { kind: 'quick' }; S.select()"], ['howto', 'S.leaveWorld(); S.title(); S.howTo?.()']];
const open = (js) => `(() => { const S = __game.screens; document.querySelectorAll('.modal-wrap, .prof-wrap, .wd-box').forEach((m) => m.remove()); __game.modalClose = null; if (S.worldObj) { S.worldObj.dialog = null; S.worldObj.busy = false; } ${js}; })()`;
// the tappable things on the top layer: a modal, the dialog box, or else the whole screen UI
const LIST = `(() => {
  const layers = [...document.querySelectorAll('.modal-wrap, .wd-box')]; const top = layers[layers.length - 1] || document.querySelector('#ui') || document.body;
  return [...top.querySelectorAll('*')].filter((e) => (e.tagName === 'BUTTON' || e.__tap) && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.disabled)
    .map((e, i) => { e.dataset.sfxi = i; return (e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0] + ' "' + (e.textContent || e.title || '').trim().slice(0, 22) + '"'); });
})()`;
const silent = [];
for (const [name, js] of ALL) {
  if (only && !only.includes(name)) continue;
  try {
    await pg.evaluate(open(js)); await pg.waitForTimeout(500);
    const items = await pg.evaluate(LIST);
    const quiet = [];
    for (let i = 0; i < Math.min(items.length, 40); i++) {
      await pg.evaluate(open(js)); await pg.waitForTimeout(250);
      await pg.evaluate(LIST);
      const got = await pg.evaluate(async (i) => {
        const e = document.querySelector(`[data-sfxi="${i}"]`); if (!e) return null;
        __calls.length = 0;
        const r = e.getBoundingClientRect(), o = { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, pointerId: 1, pointerType: 'touch', isPrimary: true };
        if (e.__tap?.has('pointerdown') || e.__tap?.has('touchstart')) e.dispatchEvent(new PointerEvent('pointerdown', o));
        if (e.__tap?.has('pointerup')) e.dispatchEvent(new PointerEvent('pointerup', o));
        if (e.tagName === 'BUTTON' || e.__tap?.has('click')) e.dispatchEvent(new MouseEvent('click', o));
        await new Promise((res) => setTimeout(res, 350));
        return [...new Set(__calls)];
      }, i);
      if (got && !got.length) quiet.push(items[i]);
    }
    console.log(`${name}: ${items.length} tappable, ${quiet.length ? 'SILENT ' + quiet.join(' | ') : 'all make a sound'}`);
    silent.push(...quiet.map((q) => name + ' ' + q));
  } catch (e) { console.log(`${name}: ERROR ${e.message.split('\n')[0]}`); }
}
console.log(`\n${silent.length} silent taps`);
if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 5).join(' | '));
await b.close();
