// node shots/bakedump.mjs <outdir>: bake the ground materials in a page and save each as a PNG
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:5173/shots-blank.html').catch(() => {});
await pg.setContent('<html><body></body></html>');
await pg.goto('http://localhost:5173/');
const urls = await pg.evaluate(async () => {
  const THREE = await import('/node_modules/.vite/deps/three.js');
  const { bakeGround, GROUND } = await import('/src/groundtex.js');
  const r = new THREE.WebGLRenderer(); bakeGround(r, 'low');
  const res = 512, out = [];
  for (const rt of GROUND.rts) {
    const px = new Uint8Array(res * res * 4); r.readRenderTargetPixels(rt, 0, 0, res, res, px);
    const c = document.createElement('canvas'); c.width = res * 2; c.height = res; const x = c.getContext('2d');
    const im = x.createImageData(res, res); const im2 = x.createImageData(res, res);
    for (let i = 0; i < res * res; i++) { for (let k = 0; k < 3; k++) im.data[i * 4 + k] = px[i * 4 + k]; im.data[i * 4 + 3] = 255; const a = px[i * 4 + 3]; im2.data[i * 4] = im2.data[i * 4 + 1] = im2.data[i * 4 + 2] = a; im2.data[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0); x.putImageData(im2, res, 0); out.push(c.toDataURL());
  }
  return out;
});
urls.forEach((u, i) => fs.writeFileSync(`${out}/bake${i}.png`, Buffer.from(u.split(',')[1], 'base64')));
console.log('errors:', errs.join(' | ') || 'none'); await b.close();
