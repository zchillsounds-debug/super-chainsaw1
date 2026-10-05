// node shots/r21hub.mjs <region> [shotdir]: Round 21 hub life: the kennel and mews (buy the saluki and the falcon, a coat,
// the hound fetching dinars, the falcon on the arm and marking archers), the camp's needs (all three upgrades and
// their perks), fishing (marsh / docks: cast, bite, strike, play, land; eat; sell to Yusuf)
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'marsh', out] = process.argv.slice(2); if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await pg.goto(`http://localhost:5173/?play&mobile&noadapt&q=${out ? 'high' : 'low'}${region === 'sawad' ? '' : '&region=' + region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
const shot = async (n) => { if (!out) return; await pg.waitForTimeout(900); await pg.screenshot({ path: `${out}/${region}-${n}.png` }); };
const log = [];
const progs = () => pg.evaluate(() => __game.renderer.info.programs.length);
await pg.evaluate(() => __sim(0.5)); const P0 = await progs();
log.push(await pg.evaluate(() => { const g = __game, H = g.hubLife, p = g.player; p.level = 20; p.gold = 99999; p.mats = { scrap: 99, silk: 99, gem: 20 }; g.recalcStats();
  const [kx, kz] = H.kennel; p.pos.set(kx, 0, kz + 2.5); __sim(0.2); H.mewsPanel(); document.querySelector('#shop .hbuy').click(); document.querySelector('#shop .fbuy').click();
  document.querySelector('#shop [data-coat=blacktan]').click(); document.getElementById('shop')?.remove();
  return `kennel at ${H.kennel.map((v) => v.toFixed(0))} hound ${JSON.stringify(p.hound)} falcon ${JSON.stringify(p.falcon)} gold ${p.gold}`; }));
log.push(await pg.evaluate(() => { const g = __game, H = g.hubLife, p = g.player; for (let i = 0; i < 6; i++) { g.joy = { x: 0, y: -1 }; __sim(0.2); } g.joy = null; __sim(1.5);
  return `hound visible ${H.hound.visible} dist ${H.HD.pos.distanceTo(p.pos).toFixed(1)} | falcon ${H.falcon.visible} mode ${H.FC.mode} on-arm ${H.falcon.position.distanceTo(p.pos).toFixed(2)}`; }));
await shot('mews');
// the hound fetches dinars
log.push(await pg.evaluate(() => { const g = __game, H = g.hubLife, p = g.player, g0 = p.gold; g.dropItem({ gold: 77, rarity: 'common' }, p.pos.clone().add(new p.pos.constructor(6, 0, 3))); const d = g.drops[g.drops.length - 1]; d.noAuto = true; let n = 0; while (g.drops.includes(d) && n++ < 80) __sim(0.1); return `fetched ${!g.drops.includes(d)} in ${(n * 0.1).toFixed(1)} s, gold +${p.gold - g0}`; }));
// the camp's needs
log.push(await pg.evaluate(() => { const g = __game, H = g.hubLife, p = g.player; const cap0 = p.stats.potCapB || 0, heal0 = p.stats.potHeal || 0; H.campPanel(); for (const k of ['well', 'stalls', 'forge']) document.querySelector(`#shop [data-up=${k}]`).click(); document.getElementById('shop')?.remove();
  return `hubUp ${JSON.stringify(p.hubUp)} potCapB ${cap0}->${p.stats.potCapB} potHeal ${heal0}->${p.stats.potHeal} visible ${Object.values(H.spots).map((s) => (s.b.visible && !s.a.visible ? 1 : 0)).join('')}`; }));
log.push(await pg.evaluate(() => { const g = __game, p = g.player; p.equip.weapon.rank = 0; g.openPanel('smith'); const txt = document.querySelector('#shop .srow small')?.textContent; document.getElementById('shop')?.remove(); return `temper with the forge: "${txt}" (base ${40 * (1 + p.equip.weapon.level * 0.2) | 0} dinars)`; }));
if (out) { await pg.evaluate(() => { const g = __game, s = g.hubLife.spots.forge; g.player.pos.set(s.x - 1, 0, s.z + 4); __sim(0.4); }); await shot('forge'); await pg.evaluate(() => { const g = __game, s = g.hubLife.spots.stalls; g.player.pos.set(s.x, 0, s.z + 4); __sim(0.4); }); await shot('stalls'); await pg.evaluate(() => { const g = __game, s = g.hubLife.spots.well; g.player.pos.set(s.x, 0, s.z + 4); __sim(0.4); }); await shot('well'); }
// the falcon out in the country: marks archers
log.push(await pg.evaluate(() => { const g = __game, H = g.hubLife, p = g.player; const a = g.enemies.filter((e) => !e.dead && e.T?.ranged).sort((x, y) => y.pos.distanceTo(p.pos) - x.pos.distanceTo(p.pos))[0]; if (!a) return 'no archer on the map';
  p.pos.set(a.pos.x + 14, 0, a.pos.z + 8); a.alerted = false; H.FC.scanT = 0.1; p.invuln = 1e9; __sim(0.5); __sim(1.0); const M = H.marks.find((m) => m.t > 0);
  return `falcon mode ${H.FC.mode} height ${(H.falcon.position.y - p.pos.y).toFixed(1)} marked ${H.marks.filter((m) => m.t > 0).length} (${M?.e?.name}) mark over head ${M ? (M.m.position.y - M.e.pos.y).toFixed(1) : '-'}`; }));
await shot('falcon');
// fishing
log.push(await pg.evaluate(() => { const g = __game, H = g.hubLife, p = g.player; for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(p.pos) < 40) { e.dead = true; e.rig.visible = false; } return `fishing spots ${H.fishSpots.length} ${H.fishSpots.map((s) => s.x.toFixed(0) + ',' + s.z.toFixed(0)).join(' ')}`; }));
const hasSpots = await pg.evaluate(() => __game.hubLife.fishSpots.length > 0);
if (hasSpots) {
  log.push(await pg.evaluate(() => { const g = __game, H = g.hubLife, p = g.player, S = H.fishSpots[0]; p.pos.set(S.x, 0, S.z); __sim(0.2); H.fishPanel(S); document.querySelector('#shop .go').click(); __sim(0.3);
    const F = H.F; return `cast: phase ${F?.phase} fish ${F?.fish} float ${F?.at.toArray().map((v) => v.toFixed(1))} msg "${document.querySelector('#fishing .fmsg').textContent}"`; }));
  await shot('cast');
  log.push(await pg.evaluate(() => { const g = __game, H = g.hubLife; if (!H.F) H.cast(H.fishSpots[0]); let n = 0; while (H.F?.phase === 'wait' && n++ < 100) __sim(0.1); const ph = H.F?.phase; H.strike(); return `after ${(n * 0.1).toFixed(1)} s: ${ph}, struck -> ${H.F?.phase}`; }));
  // play it: tap only when the needle is in the zone
  log.push(await pg.evaluate(() => { const g = __game, H = g.hubLife, p = g.player, S = H.fishSpots[0]; if (!H.F) throw new Error(`the cast ended before play: msg "${document.querySelector('#fishing .fmsg').textContent}" off spot ${Math.hypot(p.pos.x - S.x, p.pos.z - S.z).toFixed(2)} m, foes within 30 m [${g.enemies.filter((e) => !e.dead && e.pos.distanceTo(p.pos) < 30).map((e) => e.type + '@' + e.pos.distanceTo(p.pos).toFixed(1) + (e.alerted ? ' alerted' : ''))}] dead ${p.dead} cine ${!!g.cinematic}`); const f = H.F.fish; let n = 0; const c0 = p.fish[f] || 0;
    while (H.F && n++ < 400) { __sim(0.03); const F = H.F; if (F && Math.abs(F.nd - F.zone) < F.zw / 2 * 0.6) H.strike(); }
    return `landed ${f}: ${c0} -> ${p.fish[f]} msg "${document.querySelector('#fishing .fmsg').textContent}"`; }));
  await shot('landed');
  // a too-soon strike and a missed bite
  log.push(await pg.evaluate(() => { const g = __game, H = g.hubLife, S = H.fishSpots[0]; H.cast(S); __sim(0.2); H.strike(); const a = document.querySelector('#fishing .fmsg').textContent; H.cast(S); let n = 0; while (H.F?.phase === 'wait' && n++ < 100) __sim(0.1); __sim(1.2); return `too soon: "${a}" | slow: "${document.querySelector('#fishing .fmsg').textContent}" cast over ${!H.F}`; }));
  log.push(await pg.evaluate(() => { const g = __game, H = g.hubLife, p = g.player; const f = Object.keys(p.fish).find((k) => p.fish[k] > 0); const s0 = { ...p.stats }; H.eat(f); return `ate ${f}: food ${JSON.stringify(p.food)} maxHp ${s0.maxHp}->${p.stats.maxHp} regen ${s0.regen}->${p.stats.regen} move ${s0.move}->${p.stats.move} dmg ${s0.max}->${p.stats.max}`; }));
  log.push(await pg.evaluate(() => { const g = __game, p = g.player; p.fish.himri = (p.fish.himri || 0) + 2; const g0 = p.gold; g.openPanel('merchant'); const b2 = document.querySelector('#shop [data-sell=himri]'); b2?.click(); document.getElementById('shop')?.remove(); return `sold a himri to Yusuf: ${!!b2} gold +${p.gold - g0}`; }));
}
log.push(await pg.evaluate(async () => { const { saveGame } = await import('/src/save.js'); saveGame(__game); const k = Object.keys(localStorage).find((x) => x.includes('save')); const s = JSON.parse(localStorage.getItem(k)); return 'saved ' + JSON.stringify({ hound: s.player.hound, falcon: s.player.falcon, fish: s.player.fish, hubUp: s.player.hubUp, food: !!s.player.food }); }));
log.push(`shader programs ${P0} -> ${await progs()}`);
console.log(log.join('\n'));
console.log('errors:', errs.slice(0, 6).join(' | ') || 'none'); await b.close();
