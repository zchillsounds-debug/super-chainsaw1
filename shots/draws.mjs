import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const q = process.argv[2] || 'play&q=low';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
await pg.goto('http://localhost:5173/?' + q);
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await pg.waitForTimeout(5000);
console.log(await pg.evaluate(() => {
  const r = window.__renderer, cnt = {}; const orig = r.renderBufferDirect.bind(r);
  let shadow = 0, main = 0;
  r.renderBufferDirect = (cam, scene, geo, mat, obj, grp) => { const isSh = cam.isOrthographicCamera && mat.isMeshDepthMaterial || mat.type === 'MeshDistanceMaterial' || mat.isMeshDepthMaterial; if (isSh) shadow++; else main++;
    let o = obj, path = obj.name || obj.type; while (o.parent && o.parent.type !== 'Scene') { o = o.parent; } const key = (isSh ? 'S ' : 'M ') + (o.name || o.type) + '@' + Math.round(o.position.x) + ',' + Math.round(o.position.z) + ':' + o.children.length + '/' + (obj.isInstancedMesh ? 'inst' : obj.isSkinnedMesh ? 'skin' : obj.type) + '/' + mat.type; cnt[key] = (cnt[key] || 0) + 1; return orig(cam, scene, geo, mat, obj, grp); };
  return new Promise((res) => setTimeout(() => { r.renderBufferDirect = orig; res(JSON.stringify({ main, shadow, top: Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 30) }, null, 0)); }, 3000));
}));
await b.close();
