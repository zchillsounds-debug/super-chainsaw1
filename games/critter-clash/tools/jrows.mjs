// node tools/jrows.mjs <tab> <regex> [WxH] : opens a Journal tab with uisteps' end-game save and prints the rows matching the regex,
// then scrolls the first match into view and saves tools/out/jrows-<tab>-<WxH>.png (quick checks for new Today/Records rows).
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
import { endGameSave, world } from './uisteps.mjs';
const [tab, re, size = '360x640'] = process.argv.slice(2), [w, h] = size.split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?mobile&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.evaluate(endGameSave);
await pg.evaluate(`(() => { const S = __game.screens; ${world} S.worldJournal(${JSON.stringify(tab)}); })()`);
await pg.waitForTimeout(500);
const rows = await pg.evaluate((re) => { const R = new RegExp(re, 'i'), out = []; for (const e of document.querySelectorAll('.jr-list > *')) if (R.test(e.textContent)) { out.push(e.textContent.trim().replace(/\s+/g, ' ').slice(0, 120)); if (out.length === 1) e.scrollIntoView({ block: 'center' }); } return out; }, re);
console.log(rows.join('\n') || 'no match');
await pg.waitForTimeout(300); await pg.screenshot({ path: `tools/out/jrows-${tab}-${size}.png` });
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
