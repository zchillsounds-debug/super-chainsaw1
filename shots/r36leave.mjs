// node shots/r36leave.mjs [out.png] [port]: Round 36. The Season One cold open up to "Leave me, Salim. Run!", one screenshot of that shot
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out = 'leave.png', port = '5173'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* none */ } });
await pg.goto(`http://localhost:${port}/?play&drama&mobile&q=high&noadapt&region=sawad&cls=faris`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
for (let i = 0; i < 200; i++) {
  const t = await pg.evaluate(() => { const d = __director; if (d.shot?.line?.text === 'Leave me, Salim. Run!') { __sim(0.8); return 'at'; } if (d.def) { __sim(0.3); d.advance(); } else __sim(0.3); return d.shot?.line?.text || ''; });
  if (t === 'at') break;
}
await pg.screenshot({ path: out, timeout: 180000 });
console.log('errors:', errs.length ? errs.join(' | ') : 'none');
await b.close();
