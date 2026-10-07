// node shots/r32story.mjs <region> [out] [pick 1|2] [lang]: Round 32 story check. The scene inside the act, Arsaber's lane
// (al-Karkh), the family, the deserter, the hired guard's three talks, a soldier's shout, a letter on a body, a find.
// Every scene is played to the end (choices take option <pick>) and its lines are printed.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'sawad', out, pick = '1', lang = 'en'] = process.argv.slice(2);
if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
if (lang === 'ar') await pg.addInitScript(() => { try { localStorage.setItem('sob.settings.v1', JSON.stringify({ lang: 'ar' })); } catch (e) { /* none */ } });
await pg.goto(`http://localhost:5173/?play&mobile&q=high&noadapt&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
const shot = async (n) => { if (out) await pg.screenshot({ path: `${out}/${region}-${n}.png`, timeout: 180000 }); };
const ev = (f, a) => pg.evaluate(f, a);
await ev(() => { window.__runScene = (pick, steps = 400) => { const lines = []; let n = 0, last = null; while (__director.def && n++ < steps) { const s = __director.shot; if (s && s !== last) { last = s; if (s.line) lines.push(s.line.who + ': ' + document.querySelector('#cine .csub, #cine .line, #cine')?.textContent?.slice(0, 0) + s.line.text); if (s.caption) lines.push('[' + s.caption + ']'); if (s.choice) lines.push('<choice ' + pick + '>'); } if (s?.choice && s.chosen == null) dispatchEvent(new KeyboardEvent('keydown', { key: String(pick) })); __sim(0.3); __director.advance(); } return { lines, done: !__director.def }; };
  const g = __game; g.player.invuln = 1e9; window.__calm = () => { for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(g.player.pos) < 40) { e.dead = true; e.hp = 0; e.rig.visible = false; } }; });


const play = async (name, js) => {
  const r = await ev(js); if (!r) { console.log(name, 'not started'); return; }
  await ev(() => { __sim(1.2); __director.advance(); __sim(0.6); }); await shot(name);
  const res = await ev((p) => __runScene(p), +pick); console.log(name, JSON.stringify(res));
};
console.log('setup', JSON.stringify(await ev(() => { const g = __game; return { family: ['Umayma', 'Nadr', 'Qays', 'Nasim'].map((n) => !!g.npcs.find((x) => x.name === n)), deserter: g.npcs.find((x) => x.title && /Deserter|فارّ/.test(x.title))?.name || null, examine: g.interactables.filter((i) => /Examine|تفحّص/.test(i.label)).length, glints: g.s32test.glints() }; })));
// ---- the scene inside the act
await play('mid', () => { const g = __game, p = g.player, H = { sawad: [-2, 84], marsh: [8, 80], karkh: [-64, 86], docks: [-50, 98], hamrin: [-10, 84] }[new URLSearchParams(location.search).get('region')];
  const F = { sawad: 'dam', marsh: 'stockade', karkh: 'quarter', docks: 'shipyard' }[new URLSearchParams(location.search).get('region')]; if (F && g.holds) g.holds.state(F).done = true; if (g.holds) { const s = g.holds.state('quarry'); if (s) s.done = true; } g.player.s25 ||= { ch: {}, leaves: {}, mem: {}, said: {} }; g.player.s25.said.h26scout = true;
  p.pos.set(H[0] + 2, 0, H[1] + 2); __calm(); __sim(0.2); return g.s32test.mid(); });
// ---- Arsaber's lane
if (region === 'karkh') await play('lane', () => { const g = __game, p = g.player; p.pos.set(-30, 0, 40); __calm(); __sim(0.2); return g.s32test.lane(); });
// ---- the family
await play('family', () => { const g = __game, n = g.npcs.find((x) => x.name === 'Umayma'); if (!n) return false; g.player.pos.set(n.pos.x + 1.5, 0, n.pos.z + 1); __calm(); n.talk(); return !!__director.def; });
// ---- the deserter
await play('deserter', () => { const g = __game, n = g.npcs.find((x) => x.title && /Deserter|فارّ/.test(x.title)); if (!n) return false; g.player.pos.set(n.pos.x + 1.6, 0, n.pos.z + 0.8); __calm(); n.talk(); return !!__director.def; });
console.log('choices', JSON.stringify(await ev(() => __game.player.s25?.ch)));
// ---- the hired guard's three talks
const kind = { sawad: 'spear', marsh: 'bow', karkh: 'naft', docks: 'knives', hamrin: 'spear' }[region];
await ev((k) => { const g = __game; g.player.companion = { kind: k, order: 'follow' }; __sim(1.0); }, kind);
for (const i of [1, 2, 3]) {
  await play('guard' + i, () => { const g = __game, C = g.companion; if (!C) return false; const A = g.player.s25.g32?.[C.kind]; if (A) A.at = null; C.pos.copy(g.player.pos).add({ x: 2, y: 0, z: 1, isVector3: true }); __calm(); return g.s32test.arc(); });
}
console.log('guard', JSON.stringify(await ev(() => ({ g32: __game.player.s25.g32, toast: [...document.querySelectorAll('#toasts > *, .toast')].map((x) => x.textContent).slice(-3) }))));
// ---- a soldier's shout
const sh = await ev(() => { const g = __game, p = g.player; const pk = g.spawnPack(['spearman', 'archer', 'bandit'], p.pos.x + 9, p.pos.z + 4, 3, 5); let bark = ''; for (let i = 0; i < 40 && !bark; i++) { for (const e of pk) e.alerted = true; __sim(0.5); const el = document.querySelector('#bark25'); if (el?.classList.contains('show')) bark = el.textContent; } for (const e of pk) { e.dead = true; e.hp = 0; e.rig.visible = false; } return bark; });
console.log('shout', JSON.stringify(sh));
await shot('shout');
// ---- a letter on a body
const lt = await ev(() => { const g = __game, p = g.player; const e = g.spawnPack('spearman', p.pos.x + 3, p.pos.z, 1, 3)[0]; const R = Math.random; Math.random = () => 0; g.damageEnemy(e, 1e6, false, p.pos); Math.random = R; __sim(4); p.pos.set(e.pos.x, 0, e.pos.z); __sim(0.6); const d = document.querySelector('#dialog'); const r = { open: g.ui.dialogOpen, name: d.querySelector('.dname').textContent, text: d.querySelector('.dtext').textContent }; return r; });
console.log('letter', JSON.stringify(lt));
await shot('letter');
await ev(() => document.querySelector('#dialog .dbtn')?.click());
// ---- a find
const fd = await ev(() => { const g = __game, it = g.interactables.find((i) => /Examine|تفحّص/.test(i.label)); if (!it) return 'none'; g.player.pos.set(it.pos.x + 1, 0, it.pos.z); __sim(0.3); it.act(); const d = document.querySelector('#dialog'); return { label: it.label, name: d.querySelector('.dname').textContent, text: d.querySelector('.dtext').textContent.slice(0, 90) }; });
console.log('find', JSON.stringify(fd));
await shot('find');
await ev(() => document.querySelector('#dialog .dbtn')?.click());
console.log('codex', JSON.stringify(await ev(() => Object.keys(__game.player.codex || {}).filter((k) => k.startsWith('f32_')))));
console.log('errors:', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
await b.close();
