// node shots/r26hamrin.mjs [out] [option 0|1]: the Round 26 Hamrin story: the scout scene by Ishaq, the arrow after two
// holds, then Tatzates' last stand to his fall, the choice (0 chains, 1 free), the closing captions and Ishaq's word after.
// Prints every line and caption; shots of each beat in [out].
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out, pick = '0'] = process.argv.slice(2);
if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&region=hamrin`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
const shot = async (n) => { if (out) await pg.screenshot({ path: `${out}/hamrin-${n}.png`, timeout: 180000 }); };
// play the running scene to its end, logging lines/captions; shoot the shots named in `want` (by index); answer a choice
const play = async (tag, want = []) => {
  const seen = [];
  for (let i = 0; i < 80; i++) {
    const st = await pg.evaluate(() => { const d = __director; if (!d.def) return null; const s = d.shot || {}; return { i: d.i, line: s.line ? s.line.who + ': ' + s.line.text : null, cap: s.caption || null, card: s.card?.en || null, choice: !!s.choice && document.querySelector('.cchoice.show') ? s.choice.prompt : null }; });
    if (!st) break;
    const key = st.i + (st.line || st.cap || st.card || st.choice || '');
    if (!seen.includes(key)) { seen.push(key); console.log(`  [${tag} ${st.i}] ${st.line || (st.cap ? 'caption: ' + st.cap : st.card ? 'card: ' + st.card : st.choice ? 'CHOICE: ' + st.choice : '(shot)')}`); if (want.includes(st.i)) { await pg.evaluate(() => __sim(0.3)); await shot(`${tag}${st.i}`); } }
    if (st.choice) { await pg.evaluate((k) => { const bs = document.querySelectorAll('.cchoice.show button'); bs[k]?.click(); }, +pick); await pg.evaluate(() => __sim(0.2)); continue; }
    await pg.evaluate(() => { __director.next ? __director.next() : __director.skip(); __sim(0.1); });
  }
};
// 1. the scout, by Ishaq
console.log('scout:', await pg.evaluate(() => { const g = __game, p = g.player, I = g.npc.position; p.pos.set(I.x + 3, 0, I.z + 3); for (let i = 0; i < 40 && !__director.def; i++) __sim(0.1); return !!__director.def; }));
await play('scout', [2, 3]);
// 2. two holds broken: the arrow
console.log('arrow:', await pg.evaluate(() => { const g = __game, p = g.player; g.holds.state('quarry').done = true; g.holds.state('fort').done = true; const I = g.npc.position; p.pos.set(I.x + 8, 0, I.z - 2); for (let i = 0; i < 40 && !__director.def; i++) __sim(0.1); return !!__director.def; }));
await play('arrow', [0]);
// 3. Tatzates' ravine
console.log('enter:', await pg.evaluate(async () => { const g = __game, p = g.player; p.level = 26; g.recalcStats(); p.hp = p.stats.maxHp; p.invuln = 1e9; await g.holds.enter('rivalhold'); __sim(0.3);
  for (const e of g.interior.enemies) if (!e.holdBoss) { e.dead = true; e.removed = true; g.scene.remove(e.rig); }
  const B = g.interior.enemies.find((e) => e.holdKey === 'boss'); window.TZ = B; p.pos.set(B.pos.x, 0, B.pos.z + 9); for (let i = 0; i < 30 && !__director.def; i++) __sim(0.1); return !!__director.def; }));
await play('faceoff');
console.log('fall:', await pg.evaluate(() => { const g = __game, B = TZ; B.final = true; g.damageEnemy(B, B.hp + 10, false, g.player.pos, 'normal', { unblockable: true }); for (let i = 0; i < 30 && !__director.def; i++) __sim(0.1); return !!__director.def + ' dead ' + B.dead + ' spared ' + !!B.spared; }));
await play('fall', [1, 4, 5, 6]);
console.log('after:', JSON.stringify(await pg.evaluate(() => { const g = __game; return { choice: g.player.s25?.ch?.tatzates, rival: g.player.rival?.final, renown: g.player.renown }; })));
console.log('ishaq:', await pg.evaluate(async () => { const g = __game; await g.holds.exit?.(); __sim(0.3); const p = g.player, I = g.npc.position; p.pos.set(I.x + 3, 0, I.z + 3); for (let i = 0; i < 40; i++) __sim(0.1); return document.querySelector('#bark25')?.textContent; }));
console.log('errors:', errs.join('\n') || 'none'); await b.close();
