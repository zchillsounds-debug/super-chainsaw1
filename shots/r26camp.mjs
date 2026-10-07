// node shots/r26camp.mjs [region] [out] [beat 0..2]: the Round 26 camp stories: stand by Yusuf, Bishr and 'Amr in turn and
// read the beat each tells (beat 2 also drops the gift and adds the camp prop); a shot of each in [out]
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'docks', out, beat = '2'] = process.argv.slice(2);
if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
for (const [k, at] of [['yusuf', 'merchant'], ['bishr', 'smith'], ['amr', 'trainer']]) {
  const r = await pg.evaluate(async ([k, at, beat]) => {
    const g = __game, p = g.player; g.briefed = true; p.invuln = 1e9;
    for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(p.pos) < 40) { e.dead = true; e.rig.visible = false; }
    const s = g.player.s25 ||= { ch: {}, leaves: {}, mem: {}, said: {} }; s.camp ||= { yusuf: 0, bishr: 0, amr: 0, at: {} }; s.camp[k] = beat; delete s.camp.at[k];
    const { HUB } = await import('/src/region.js'); const [x, z] = HUB[at]; p.pos.set(x + 1.2, 0, z + 1.2);
    const kids = g.scene.children.length, drops = g.drops.length;
    for (let i = 0; i < 30 && document.querySelector('#dialog').classList.contains('hidden'); i++) __sim(0.1);
    const txt = document.querySelector('#dialog .dtext')?.innerText?.slice(0, 140);
    return { k, open: !document.querySelector('#dialog').classList.contains('hidden'), txt, n: s.camp[k] };
  }, [k, at, +beat]);
  console.log(JSON.stringify(r));
  if (out) await pg.screenshot({ path: `${out}/camp-${region}-${k}.png`, timeout: 180000 });
  console.log('  after:', JSON.stringify(await pg.evaluate(() => { const g = __game, k0 = g.scene.children.length, d0 = g.drops.length; document.querySelector('#dialog .dbtn')?.click(); __sim(0.3); return { closed: document.querySelector('#dialog').classList.contains('hidden'), newObjects: g.scene.children.length - k0, newDrops: g.drops.length - d0 }; })));
}
console.log('errors:', errs.join('\n') || 'none'); await b.close();
