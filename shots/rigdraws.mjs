// node shots/rigdraws.mjs <query>: draws per frame split into passes, and what a character rig spends them on
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const q = process.argv[2] || 'play&q=high&noadapt';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
await pg.goto('http://localhost:5173/?' + q);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
await pg.waitForTimeout(4000);
console.log(await pg.evaluate(() => new Promise((res) => {
  const r = window.__renderer, cnt = {}, pass = {}; const orig = r.renderBufferDirect.bind(r);
  r.renderBufferDirect = (cam, scene, geo, mat, obj, grp) => {
    const P = mat.isMeshDepthMaterial || mat.type === 'MeshDistanceMaterial' ? 'shadow' : mat.type === 'MeshNormalMaterial' || mat.name === 'gbuf' || (mat.isShaderMaterial && /gbufhole/.test(mat.customProgramCacheKey?.() || '')) ? 'ao' : 'main';
    pass[P] = (pass[P] || 0) + 1;
    let o = obj, inRig = false; while (o) { if (o.userData?.parts) { inRig = true; break; } o = o.parent; }
    if (inRig) { const k = P + ' ' + (obj.isSkinnedMesh ? 'skin' : obj.parent?.isBone ? 'onbone:' + obj.parent.name : obj.parent?.parent?.isBone ? 'gear:' + obj.parent.parent.name : obj.type) + ' ' + (geo.type || ''); cnt[k] = (cnt[k] || 0) + 1; }
    return orig(cam, scene, geo, mat, obj, grp); };
  requestAnimationFrame(() => requestAnimationFrame(() => { r.renderBufferDirect = orig; res(JSON.stringify({ pass, rigs: Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 40) })); }));
})));
await b.close();
