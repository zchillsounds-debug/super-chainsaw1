// node shots/r33women.mjs <region> [out] [lang]: the camp women and the village woman: talk to each, screenshots of them
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'sawad', out = '/tmp/claude-0/r33w', lang = 'en'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => { errs.push(e.message); console.log('PAGEERR', e.stack); });
if (lang === 'ar') await pg.addInitScript(() => { try { localStorage.setItem('sob.settings.v1', JSON.stringify({ lang: 'ar' })); } catch (e) { /* none */ } });
await pg.goto(`http://localhost:5173/?play&mobile&q=high&noadapt&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
const W = await pg.evaluate(() => { const g = __game; const names = ['Hind', 'Su\'da', 'Khawla', 'Layla', 'Asma\'', 'Barra', 'Fakhita']; return g.npcs.filter((n) => names.includes(n.name)).map((n) => n.name); });
console.log('women', JSON.stringify(W), 'villagers', await pg.evaluate(() => __game.critters.filter((c) => c.kind === 'villager').length));
for (const who of W) {
  const r = await pg.evaluate((who) => { const g = __game, n = g.npcs.find((x) => x.name === who), p = g.player; p.pos.set(n.pos.x + Math.sin(n.rig.rotation.y) * 2, n.pos.y, n.pos.z + Math.cos(n.rig.rotation.y) * 2); __sim(0.6);
    const it = g.interactables.find((i) => i.npc === n); const label = it ? (typeof it.label === 'string' ? it.label : '') : ''; n.talk(); __sim(0.3);
    const d = document.querySelector('#dialog'); return { label, name: d.querySelector('.dname').textContent, text: d.querySelector('.dtext').textContent.slice(0, 160) }; }, who);
  console.log('talk', who, JSON.stringify(r));
  await pg.screenshot({ path: `${out}/${who.replace(/'/g, '')}.png`, timeout: 180000 });
  await pg.evaluate(() => { document.querySelector('#dialog .dbtn')?.click(); __sim(0.3); });
}
console.log('errors:', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
await b.close();
