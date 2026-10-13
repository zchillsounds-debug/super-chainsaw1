// renders public/icon-512.png from in-game critter portraits
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 800, height: 600 } });
await pg.goto('http://localhost:5180/');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.evaluate(() => document.fonts.ready);
const url = await pg.evaluate(async () => {
  const g = window.__game;
  const { CRITTERS } = await import('/src/data.js');
  const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const ham = await load(g.portrait(CRITTERS[0]));
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(256, 200, 40, 256, 256, 360);
  gr.addColorStop(0, '#ffe36b'); gr.addColorStop(0.55, '#ff7a3d'); gr.addColorStop(1, '#6b2cc0');
  x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
  // burst rays
  x.save(); x.translate(256, 240); x.globalAlpha = 0.18; x.fillStyle = '#fff';
  for (let i = 0; i < 16; i++) { x.rotate(Math.PI / 8); x.beginPath(); x.moveTo(0, 0); x.lineTo(-40, -400); x.lineTo(40, -400); x.fill(); }
  x.restore();
  x.drawImage(ham, 6, 10, 500, 500);
  x.font = '400 110px "Lilita One"'; x.textAlign = 'center';
  x.lineJoin = 'round'; x.lineWidth = 22; x.strokeStyle = '#2a1630'; x.strokeText('CLASH!', 256, 480);
  x.fillStyle = '#fff'; x.fillText('CLASH!', 256, 480);
  return c.toDataURL('image/png');
});
fs.writeFileSync('public/icon-512.png', Buffer.from(url.split(',')[1], 'base64'));
console.log('ok');
await b.close();
