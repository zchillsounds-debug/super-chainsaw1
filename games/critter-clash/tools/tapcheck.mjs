// node tools/tapcheck.mjs [WxH ...] : opens every screen and modal and reports buttons that are off-screen or covered
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const sizes = (process.argv.slice(2).length ? process.argv.slice(2) : ['740x360', '915x412', '360x640', '412x915']).map((s) => s.split('x').map(Number));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
// each step: [name, js that opens it]
const STEPS = [
  ['title', 'S.title()'],
  ['howto', 'S.title(); S.howTo()'],
  ['settings', "S.title(); document.querySelector('.gear').click()"],
  ['cups', 'S.cups()'],
  ['select', "S.ctx={kind:'quick'}; S.select()"],
  ['matchsetup', "S.ctx={kind:'quick'}; S.select(); S.matchSheet(false)"],
  ['teampick', "S.ctx={kind:'team'}; S.sel=0; S.teamSheet()"],
  ['teamvs', "S.ctx={kind:'team', team:['cindermunch','bubbalotl','clovebun'], foes:['hootsy','woolt','diggles'], pi:1, fi:0, php:[0,0.6,1], fhp:[0.4,1,1], arena:'meadow', sent:'you'}; S.sel=1; S.vs()"],
  ['challenges', 'S.challenges()'],
  ['training', 'S.training()'],
  ['quicksetup', "S.ctx={kind:'quick'}; S.select(); S.matchSheet(false)"],
  ['teampick', "__save.unlocked=__critters.map(c=>c.id); S.ctx={kind:'team'}; S.select(); S.teamSheet()"],
  ['dex', 'S.dex()'],
  ['badges', 'S.dex(); S.badgeModal()'],
  ['camp', 'S.camp()'],
  ['prof', "S.title(); S.profTalk(['Hello {name}, this is a fairly long line of dialogue from the professor to check wrapping on small phones.'], ()=>{})"],
  ['ladder', "S.ctx={kind:'cup', cup: __cups[2], idx: 0}; S.sel=0; S.ladder()"],
  ['recruit', "S.title(); S.recruit(__critters[14])"],
  ['trophy', "S.sel=0; S.trophy(__cups[1])"],
  ['moves', "S.title(); S.moveModal(__critters[14])"],
  ['grow', "S.title(); S.growUp('clovebun', 14); __game.modalClose()"],
  ['pause', "__game.startBattle(__critters[14], __critters[3], { difficulty: 0.5 }); __sim(6); __game.screens.pauseMenu(true)"],
  ['results', "S.pauseMenu(false); __game.paused=false; const b=__game.battle; for(let i=0;i<60&&b.phase!=='done';i++){ if(b.phase==='fight'){ const c=b.fighters[1]; c.hp=0; b.onKO(b.fighters[0], c);} __sim(1); } __sim(3)"],
];
const CHECK = `(() => {
  const W = innerWidth, H = innerHeight, bad = [];
  const layers = [...document.querySelectorAll('.modal-wrap, .prof-wrap')]; const top = layers[layers.length - 1] || document;
  const els = [...top.querySelectorAll('button, .btn, [role=button]')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; });
  for (const e of els) {
    // scroll it into view inside any scrolling parent first (scrollable lists are fine)
    e.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const r = e.getBoundingClientRect();
    const name = (e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 24);
    if (r.right < 4 || r.bottom < 4 || r.left > W - 4 || r.top > H - 4) { bad.push('OFF ' + name + ' @' + Math.round(r.left) + ',' + Math.round(r.top)); continue; }
    const cx = Math.min(W - 2, Math.max(2, r.left + r.width / 2)), cy = Math.min(H - 2, Math.max(2, r.top + r.height / 2));
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || !(e === hit || e.contains(hit) || hit.contains(e))) bad.push('COVERED ' + name + ' by ' + (hit ? hit.tagName + '.' + String(hit.className).slice(0, 30) : 'null'));
    else if (r.top < 0 || r.bottom > H + 1 || r.left < 0 || r.right > W + 1) bad.push('CLIPPED ' + name + ' ' + Math.round(r.top) + '..' + Math.round(r.bottom) + '/' + H);
  }
  return bad;
})()`;
for (const [w, h] of sizes) {
  const mobile = true;
  const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1 });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?mobile&q=low');
  await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
  await pg.evaluate(() => { __save.trainer = { name: 'Samantha', partner: 'cindermunch' }; __save.unlocked = __critters.map((c) => c.id); __save.news = ['tricks', 'grove', 'otter', 'frogmole', 'grow']; __save.tutorialDone = true; __critters.forEach((c, i) => { __save.critters[c.id].level = [1, 8, 15][i % 3]; }); });
  for (const [name, js] of STEPS) {
    try {
      await pg.evaluate(`(() => { const S = __game.screens; document.querySelectorAll('.modal-wrap, .prof-wrap').forEach((m) => m.remove()); ${js}; })()`);
      await pg.waitForTimeout(name === 'results' ? 2500 : name === 'grow' ? 2600 : 700);
      const bad = await pg.evaluate(CHECK);
      if (bad.length) console.log(`${w}x${h} ${name}: ${bad.join(' | ')}`);
      if (process.env.SHOTS) await pg.screenshot({ path: `tools/out/tc-${w}x${h}-${name}.png` });
    } catch (e) { console.log(`${w}x${h} ${name}: ERROR ${e.message.split('\n')[0]}`); }
  }
  if (errs.length) console.log(`${w}x${h} page errors: ${errs.slice(0, 4).join(' | ')}`);
  await pg.close();
}
console.log('done');
await b.close();
