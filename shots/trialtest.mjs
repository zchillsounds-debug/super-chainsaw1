// node shots/trialtest.mjs [shotdir]: open the Siege Trials board, run tier 1 (kill everything), check the timer, record and unlock
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2]; if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:5173/?play&mobile&noadapt');
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
await pg.evaluate(() => { __game.__trials.panel(); });
await pg.waitForTimeout(800); if (out) await pg.screenshot({ path: `${out}/board.png` });
await pg.evaluate(() => { document.querySelector('#shop .go').click(); });
await pg.waitForTimeout(2500);
const r1 = await pg.evaluate(() => { const g = __game; __sim(3); const I = g.interior; return { kind: I?.def.kind, styles: I?.def.styles.join(','), foes: I?.enemies.length, timer: document.getElementById('trialtimer').textContent, run: JSON.stringify(g.__trials.run) }; });
console.log('in', JSON.stringify(r1));
if (out) { await pg.evaluate(() => { const g = __game, I = g.interior.I, c = I.center(I.rooms[2]); g.player.pos.set(c.x, 0, c.z + 2); g.camInit = false; __sim(0.6); }); await pg.waitForTimeout(1500); await pg.screenshot({ path: `${out}/room.png` }); }
const r2 = await pg.evaluate(() => { const g = __game; g.player.invuln = 1e9; for (const e of g.interior.enemies) if (!e.dead) g.damageEnemy(e, 1e9, false, g.player.pos); __sim(1); return { timer: document.getElementById('trialtimer').textContent, rift: JSON.stringify(g.player.rift), gems: JSON.stringify(g.player.gems) }; });
console.log('done', JSON.stringify(r2));
await pg.evaluate(() => __game.zones.exit()); await pg.waitForTimeout(2000);
console.log('after exit', await pg.evaluate(() => `${!!__game.interior} timer hidden ${document.getElementById('trialtimer').classList.contains('hide')}`));
console.log('errors:', errs.slice(0, 4).join(' | ') || 'none'); await b.close();
