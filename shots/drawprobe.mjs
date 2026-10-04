// node shots/drawprobe.mjs <query>: draws per frame, before and after the distance cull has run (__sim), split by render target
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const q = process.argv[2] || 'play&noadapt&q=high';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
await pg.goto('http://localhost:5173/?' + q);
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
const measure = () => pg.evaluate(() => new Promise((res) => {
  const r = window.__renderer, orig = r.renderBufferDirect.bind(r), by = {}; let n = 0;
  r.renderBufferDirect = (cam, sc, geo, mat, obj, grp) => { const rt = r.getRenderTarget(); const k = mat.isMeshDepthMaterial || mat.type === 'MeshDistanceMaterial' ? 'shadow/depth' : rt ? (rt.texture?.name || `rt${rt.width}x${rt.height}`) : 'screen'; by[k] = (by[k] || 0) + 1; return orig(cam, sc, geo, mat, obj, grp); };
  const step = () => { if (++n < 4) requestAnimationFrame(step); else { r.renderBufferDirect = orig; for (const k in by) by[k] = Math.round(by[k] / 3); res(JSON.stringify({ calls: r.info.render.calls, by })); } };
  requestAnimationFrame(() => { for (const k in by) delete by[k]; requestAnimationFrame(step); });
}));
await pg.waitForTimeout(6000);
console.log('settled 6s:', await measure());
await pg.evaluate(() => window.__sim(3));
console.log('after __sim(3):', await measure());
await b.close();
