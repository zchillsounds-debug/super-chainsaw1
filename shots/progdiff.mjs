// node shots/progdiff.mjs <query> <js>: shader programs compiled after load while <js> runs (should be none)
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [q, js] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:5173/?' + q);
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await pg.waitForTimeout(2500);
await pg.evaluate(() => { window.__p0 = new Set(window.__renderer.info.programs.map((p) => p.cacheKey)); });
for (const step of js.split(';;')) { await pg.evaluate(step); await pg.waitForTimeout(1200); }
console.log(await pg.evaluate(() => { const n = window.__renderer.info.programs.filter((p) => !window.__p0.has(p.cacheKey)); const old = [...window.__p0]; return `programs ${window.__p0.size} -> ${window.__renderer.info.programs.length}\n` + n.map((p) => { const a = p.cacheKey.split(','); let best = null, bd = 1e9; for (const k of old) { const b = k.split(','); if (b.length !== a.length) continue; let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; if (d < bd) { bd = d; best = b; } } const diff = best ? a.map((x, i) => x !== best[i] ? i + ':' + best[i].slice(0, 30) + '->' + x.slice(0, 30) : null).filter(Boolean).join(' ; ') : 'no match'; return 'NEW ' + p.cacheKey.split(',').slice(0, 56).join(',') + '\nOLD ' + (best || []).slice(0, 56).join(',') + '\n   DIFF ' + diff; }).join('\n') + '\nSLOG ' + JSON.stringify(window.__slog || {}); }));
console.log('errors:', errs.slice(0, 4).join(' | ') || 'none'); await b.close();
