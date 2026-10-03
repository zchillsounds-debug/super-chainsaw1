// node shots/crit.mjs <outdir> [only]  — the Round 19 critique set: one shot per scene, landscape + portrait
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out, only] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const NOANIM = "{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}";
const fight = (x, z) => `__game.player.pos.set(${x},0,${z});__sim(0.2);for(const e of __game.enemies){if(!e.dead&&e.pos.distanceTo(__game.player.pos)<26)e.alerted=true};__sim(2.2);`;
const SC = [
  ['hub', 915, 412, 'play&mobile&q=high&noadapt', '__sim(0.5)'],
  ['fight', 915, 412, 'play&mobile&q=high&noadapt', fight(56, 14) + "__game.lmb=true;__game.autoAttack=true;__sim(0.6)"],
  ['kiln', 915, 412, 'play&mobile&q=high&noadapt&tod=dusk', fight(-50, -24)],
  ['night', 915, 412, 'play&mobile&q=high&noadapt&tod=night&x=12&z=-70', '__sim(0.5)'],
  ['hero', 915, 412, 'play&mobile&q=high&noadapt', '__close(25,3.4,1.7,1.1);__sim(0.3)'],
  ['marsh', 915, 412, 'play&mobile&q=high&noadapt&region=marsh', '__sim(0.5)'],
  ['karkh', 915, 412, 'play&mobile&q=high&noadapt&region=karkh', '__sim(0.5)'],
  ['portrait', 412, 915, 'play&mobile&q=high&noadapt', fight(56, 14)],
];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [name, w, h, q, js] of SC) {
  if (only && !only.split(',').includes(name)) continue;
  const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:5173/?' + q);
  await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
  await pg.evaluate(NOANIM); await pg.evaluate(fs.readFileSync(new URL('./close.js', import.meta.url), 'utf8'));
  await pg.evaluate(js); await pg.waitForTimeout(1500);
  await pg.screenshot({ path: `${out}/${name}.png`, timeout: 90000 });
  console.log(name, errs.slice(0, 3).join(' | ') || 'ok');
  await pg.close();
}
await b.close();
