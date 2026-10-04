// node shots/progwho.mjs <query> <js>: which objects make a new shader program after load
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
await pg.evaluate(() => { const r = window.__renderer, orig = r.renderBufferDirect.bind(r); window.__who = [];
  r.renderBufferDirect = (cam, scene, geo, mat, obj, grp) => { const n0 = r.info.programs.length; const out = orig(cam, scene, geo, mat, obj, grp); if (r.info.programs.length > n0) { let o = obj, path = []; while (o && o.type !== 'Scene') { path.push((o.name || o.type) + (o.isInstancedMesh ? '[inst]' : '')); o = o.parent; } window.__who.push(`key=${(mat.customProgramCacheKey?.()||"").slice(0,60)} verts=${geo.attributes.position.count} kids=${obj.parent?.children.length} pid=${obj.parent?.id} oid=${obj.id} ${cam.layers.mask === 2 ? 'REFL' : cam.isOrthographicCamera ? 'SHADOW' : 'MAIN'} ${mat.type} ${geo.type} vis=${obj.visible} pos=${obj.getWorldPosition(new obj.position.constructor()).toArray().map(Math.round)} ${path.join('<')}`); } return out; }; });
for (const step of js.split(';;')) { await pg.evaluate(step); await pg.waitForTimeout(1200); }
console.log(await pg.evaluate(() => window.__who.join('\n')));
console.log('errors:', errs.slice(0, 4).join(' | ') || 'none'); await b.close();
