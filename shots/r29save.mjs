// node shots/r29save.mjs [out]: Settings > Back up save makes a code; wiping storage and restoring it brings the save back
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const PORT = process.env.PORT || 5173; const [out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true, permissions: ['clipboard-read', 'clipboard-write'] });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`http://localhost:${PORT}/?play&mobile&q=low&noadapt`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
const before = await pg.evaluate(() => { const g = __game; g.player.gold = 4321; g.player.level = 9; g.settings.open(); return { gold: g.player.gold }; });
await pg.click('#settings .sbak');
const code = await pg.$eval('#settings .savebox textarea', (t) => t.value);
await pg.click('#settings .sbgo'); await pg.waitForTimeout(500); const copied = await pg.$eval('#settings .sbnote', (n) => n.textContent);
if (out) await pg.screenshot({ path: `${out}/backup.png` });
console.log('code length', code.length, 'starts', code.slice(0, 5), 'note:', copied);
// wipe and restore
await pg.evaluate(() => { localStorage.clear(); });
await pg.reload(); await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
const wiped = await pg.evaluate(() => __game.player.gold);
await pg.evaluate(() => __game.settings.open()); await pg.click('#settings .sres');
await pg.fill('#settings .savebox textarea', 'garbage'); await pg.click('#settings .sbgo');
const bad = await pg.$eval('#settings .sbnote', (n) => n.textContent);
await pg.fill('#settings .savebox textarea', code);
await Promise.all([pg.waitForNavigation({ timeout: 300000 }), pg.click('#settings .sbgo')]);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
const after = await pg.evaluate(() => { const s = JSON.parse(localStorage.getItem('sob.save.v1')); return { gold: s.player.gold, level: s.player.level, cont: !!document.getElementById('contbtn') }; }); // ?play starts fresh, so read the stored save
console.log('before', JSON.stringify(before), 'wiped gold', wiped, 'bad code note:', bad, 'after', JSON.stringify(after));
console.log(after.gold === 4321 && after.level === 9 ? 'restore ok' : 'RESTORE FAILED');
console.log('errors:', errs.join('\n') || 'none'); await b.close();
