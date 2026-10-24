// renders the app icons from in-game critter portraits (dev server on 5180, or PORT=):
//  public/icon-512.png  the square icon (web, old launchers)
//  public/icon-round.png  the round launcher icon (everything inside the circle)
//  public/icon-fg.png / icon-bg.png  Android adaptive icon layers (108 dp, 432 px): the launcher shows only
//    the middle 72 dp and masks it to its own shape, so the critter and CLASH! sit inside the 66 dp safe circle
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 800, height: 600 } });
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.evaluate(() => document.fonts.ready);
const urls = await pg.evaluate(async () => {
  const g = window.__game;
  const { CRITTERS } = await import('/src/data.js');
  const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const ham = await load(g.portrait(CRITTERS[0], 512));
  const canvas = (n) => { const c = document.createElement('canvas'); c.width = c.height = n; return [c, c.getContext('2d')]; };
  // the sunburst backdrop, centred on (cx, cy), filling an n x n square
  const backdrop = (x, n, cx, cy, grad = [cx, cy - n * 0.1, n * 0.08, cx, cy, n * 0.7]) => {
    const gr = x.createRadialGradient(...grad);
    gr.addColorStop(0, '#ffe36b'); gr.addColorStop(0.55, '#ff7a3d'); gr.addColorStop(1, '#6b2cc0');
    x.fillStyle = gr; x.fillRect(0, 0, n, n);
    x.save(); x.translate(cx, cy); x.globalAlpha = 0.18; x.fillStyle = '#fff';
    for (let i = 0; i < 16; i++) { x.rotate(Math.PI / 8); x.beginPath(); x.moveTo(0, 0); x.lineTo(-n * 0.078, -n * 0.78); x.lineTo(n * 0.078, -n * 0.78); x.fill(); }
    x.restore();
  };
  const word = (x, size, cx, base) => {
    x.font = `400 ${size}px "Lilita One"`; x.textAlign = 'center';
    x.lineJoin = 'round'; x.lineWidth = size * 0.2; x.strokeStyle = '#2a1630'; x.strokeText('CLASH!', cx, base);
    x.fillStyle = '#fff'; x.fillText('CLASH!', cx, base);
  };
  // the critter and the word, fitted in a circle of radius r around (cx, cy)
  // the portrait is cut off at its bottom edge: fade that edge out so no hard line shows under the word
  const [hc, hx] = canvas(512);
  hx.drawImage(ham, 0, 0);
  const fade = hx.createLinearGradient(0, 400, 0, 500);
  fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
  hx.globalCompositeOperation = 'destination-in'; hx.fillStyle = fade; hx.fillRect(0, 0, 512, 512);
  const badge = (x, cx, cy, r) => {
    const s = r * 2.05;
    x.drawImage(hc, cx - s / 2, cy - r * 1.12, s, s);
    word(x, r * 0.5, cx, cy + r * 0.74);
  };
  const out = {};
  let [c, x] = canvas(512);
  backdrop(x, 512, 256, 240, [256, 200, 40, 256, 256, 360]);
  x.drawImage(ham, 6, 10, 500, 500);
  word(x, 110, 256, 480);
  out['icon-512'] = c.toDataURL('image/png');
  [c, x] = canvas(512);
  backdrop(x, 512, 256, 256, [256, 210, 40, 256, 256, 330]);
  badge(x, 256, 256, 228);
  out['icon-round'] = c.toDataURL('image/png');
  [c, x] = canvas(432);
  backdrop(x, 432, 216, 216, [216, 186, 28, 216, 216, 196]);
  out['icon-bg'] = c.toDataURL('image/png');
  [c, x] = canvas(432);
  badge(x, 216, 216, 128);
  out['icon-fg'] = c.toDataURL('image/png');
  // a preview: the adaptive layers through a circle and a squircle mask, as a launcher shows them
  [c, x] = canvas(600);
  x.fillStyle = '#334'; x.fillRect(0, 0, 600, 600);
  const bg = await load(out['icon-bg']), fg = await load(out['icon-fg']), rd = await load(out['icon-round']);
  const show = (px, py, mask) => {
    x.save(); x.beginPath(); mask(px, py); x.clip();
    x.drawImage(bg, px - 216, py - 216); x.drawImage(fg, px - 216, py - 216); x.restore();
  };
  show(150, 150, (px, py) => x.arc(px, py, 144, 0, 7));
  show(450, 150, (px, py) => x.roundRect(px - 144, py - 144, 288, 288, 70));
  x.save(); x.beginPath(); x.arc(150, 450, 144, 0, 7); x.clip(); x.drawImage(rd, 6, 306, 288, 288); x.restore();
  x.drawImage(await load(out['icon-512']), 306, 306, 288, 288);
  out.preview = c.toDataURL('image/png');
  return out;
});
for (const [k, u] of Object.entries(urls)) fs.writeFileSync(k === 'preview' ? (process.env.OUT || 'tools/out') + '/icon-preview.png' : `public/${k}.png`, Buffer.from(u.split(',')[1], 'base64'));
console.log('ok');
await b.close();
