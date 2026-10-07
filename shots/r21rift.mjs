// node shots/r21rift.mjs [shotdir]: Round 21 rift seasons and crafting: the week's season, a tier-4 trial with its
// modifiers and the sure trial legendary, the four trial aspects, a recipe scroll dropped and picked up, a set piece
// forged at Bishr
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2]; if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await pg.goto('http://localhost:5173/?play&mobile&noadapt');
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
const log = [];
log.push(await pg.evaluate(() => { const T = __game.__trials, a = T.season(new Date(2026, 9, 4)), b2 = T.season(new Date(2026, 9, 5)), c = T.season(new Date(2026, 9, 1));
  return `season 4 Oct ${a.id} ${a.mods} | 5 Oct ${b2.id} ${b2.mods} | 1 Oct ${c.id} ${c.mods} (same week as 4 Oct: ${a.id === c.id && a.mods.join() === c.mods.join()})`; }));
await pg.evaluate(() => { const p = __game.player; p.level = 26; __game.recalcStats(); p.rift = { tier: 4, best: {}, runs: [] }; __game.__trials.panel(4); });
await pg.waitForTimeout(700); if (out) await pg.screenshot({ path: `${out}/board.png` });
log.push(await pg.evaluate(() => document.querySelector('#shop .season').innerText.replace(/\n/g, ' / ')));
await pg.evaluate(() => document.querySelector('#shop .go').click());
await pg.waitForTimeout(2500);
log.push(await pg.evaluate(() => { const g = __game; __sim(1); const r = g.__trials.run; return `in trial ${g.interior?.def.kind} sub "${g.interior?.def.sub}" limit ${r.limit} burn ${!!g.qanatBurn} timer ${document.getElementById('trialtimer').textContent}`; }));
log.push(await pg.evaluate(() => { const g = __game, p = g.player; p.invuln = 1e9; const n0 = g.drops.length; for (const e of g.interior.enemies) if (!e.dead) g.damageEnemy(e, 1e9, false, p.pos); __sim(1);
  const leg = [...g.drops.map((d) => d.item), ...p.bag, ...Object.values(p.equip)].filter((it) => it?.trial); return `cleared: rift ${JSON.stringify({ tier: p.rift.tier, season: p.rift.season, won: p.rift.won })} trial legendary ${leg.map((it) => it.name + ' [' + it.aspect + ']').join(',') || 'NONE'}`; }));
if (out) { await pg.waitForTimeout(800); await pg.screenshot({ path: `${out}/legendary.png` }); }
await pg.evaluate(() => __game.zones.exit()); await pg.waitForTimeout(2000);
// the four aspects
log.push(await pg.evaluate(async () => { const { makeTrialUnique } = await import('/src/items.js'); const g = __game, p = g.player; p.invuln = 0;
  const r = [];
  for (const k of ['breach', 'lastgate', 'clock', 'sapper']) { const it = makeTrialUnique(30, k); p.equip[it.slot] = it; }
  g.recalcStats();
  const foe = g.enemies.find((e) => !e.dead && !e.elite && !e.boss), cap = g.enemies.find((e) => !e.dead && (e.elite));
  r.push(`dmgMod plain ${g.dmgMod(foe).toFixed(2)} captain ${g.dmgMod(cap).toFixed(2)}`);
  p.hp = p.stats.maxHp * 0.2; const h0 = p.hp; g.damagePlayer(100, p.pos.clone()); const lost = h0 - p.hp; p.hp = p.stats.maxHp; const h1 = p.hp; g.damagePlayer(100, p.pos.clone()); r.push(`lastgate low ${lost.toFixed(0)} vs high ${(h1 - p.hp).toFixed(0)}`);
  p.cds = { s1: 5, s2: 3, potion: 4 }; g.onKill(foe); r.push(`clock cds ${JSON.stringify(p.cds)}`);
  foe.pos.copy(p.pos).add(new p.pos.constructor(2, 0, 0)); foe.alerted = false; g.onPotion(); r.push(`sapper knock ${foe.knock?.length().toFixed(1)} stagger ${foe.staggerT}`);
  return r.join(' | '); }));
// a recipe scroll: drop, walk over it, learned
log.push(await pg.evaluate(() => { const g = __game, p = g.player; p.recipes = []; g.dropRecipe(p.pos.clone(), 26); const d = g.drops.find((x) => x.item.recipe); __sim(1.2); p.pos.copy(d.mesh.position); __sim(0.3); return `recipe ${d.item.name} picked ${!g.drops.includes(d)} known ${JSON.stringify(p.recipes)}`; }));
if (out) { await pg.evaluate(() => { const g = __game; g.dropRecipe(g.player.pos.clone().add(new g.player.pos.constructor(4, 0, 1)), 26); __sim(1.2); }); await pg.waitForTimeout(800); await pg.screenshot({ path: `${out}/scroll.png` }); }
// forge it at Bishr
await pg.evaluate(() => { const p = __game.player; p.gold = 99999; p.mats = { scrap: 99, silk: 99, gem: 9 }; p.bag = p.bag.map(() => null); __game.openPanel('smith'); });
await pg.evaluate(() => document.querySelector('#shop .stabs [data-t=craft]').click());
await pg.waitForTimeout(600); if (out) await pg.screenshot({ path: `${out}/setcraft.png` });
log.push(await pg.evaluate(() => { const g = __game, p = g.player; document.querySelector('#shop .goset').click(); const it = p.bag.find((x) => x?.set); return `forged ${it?.name} set ${it?.set} rarity ${it?.rarity} lvl ${it?.level} gold left ${p.gold} gems ${p.mats.gem}`; }));
log.push(await pg.evaluate(async () => { const { saveGame, loadGame } = await import('/src/save.js'); saveGame(__game); const s = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.includes('save')) || '') || '{}'); return 'saved recipes ' + JSON.stringify(s.player?.recipes) + ' rift.won ' + JSON.stringify(s.player?.rift?.won); }));
console.log(log.join('\n'));
console.log('errors:', errs.slice(0, 6).join(' | ') || 'none'); await b.close();
