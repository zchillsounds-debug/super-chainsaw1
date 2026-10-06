import * as THREE from 'three';
import { createRenderer, createComposer, skyDome, envFromSky, QUALITY } from './graphics.js';
import { buildWorld } from './world.js';
import { bakeGround } from './groundtex.js';
import { FX } from './fx.js';
import { UI } from './ui.js';
import { Audio } from './audio2.js';
import { Game } from './game.js';
import { heightAt, SITES } from './terrain.js';
import { makeItem } from './items.js';
import { IS_TOUCH, setupMobile } from './mobile.js';
import { Director } from './cinema.js';
import * as SCENES from './scenes.js';
import { loadSave, applySave, saveGame } from './save.js';
import { preloadGeo, flushGeo } from './geocache.js';
import { Lighting } from './lighting.js';
import { RIM_G } from './charmats.js';
import { showOutlines } from './outline.js';
import { setupCombat25 } from './combat25.js';
import { setupEncounters25 } from './encounters25.js';
import { setupStory25 } from './story25.js';
import { setupFoes26 } from './foes26.js';
import { setupStory26 } from './story26.js';
import { WEATHER } from './triplanar.js';
import { PlanarReflection, reflects, REFL, REFLECT_LAYER } from './reflect.js';
import { canalX, WATER_Y } from './terrain.js';
import { LightPool } from './lights.js';
import { setupSheets } from './sheets.js';
import { Guide } from './guide.js';
import { setupHub, animateHub, openPanel, closePanel, panelOpen } from './hub.js';
import { Zones } from './zones.js';
import { Atmos } from './atmos.js';
import { PerfHUD } from './perf.js';
import { setupProgression, qanatBurnTick, ASPECTS, SETS } from './progression.js';
import { CLASSES } from './classes.js';
import { lineClear } from './collision.js';
import { setupNarrative, journalPanel, converse } from './narrative.js';
import { Settings } from './settings.js';
import { Gamepads } from './gamepad.js';
import { Tutorial } from './tutorial.js';
import { setupContent, restoreContent, applyNG, startNewGamePlus } from './content.js';
import { setupSideQuests } from './sidequests.js';
import { setupDungeons } from './dungeons.js';
import { setupBuild } from './build.js';
import { setupTravel } from './travel.js';
import { setupMount } from './mount.js';
import { setupCompanion } from './companion.js';
import { setupTrials } from './trials.js';
import { setupCraft } from './craft.js';
import { setupBench } from './bench.js';
import { setupRivals } from './rivals.js';
import { setupHamrin } from './hamrin.js';
import { setupHolds } from './holds.js';
import { setupStoryHolds } from './storyholds.js';
import { setupHubLife } from './hublife.js';
import { CombatFX } from './combatfx.js';
import { Ambient } from './ambient.js';
import { regionForAct } from './region.js';
import { t as tr24, LANG } from './i18n.js';
import { REGION, IS_SAWAD, IS_MARSH, IS_KARKH, IS_DOCKS, IS_CITY, FIRST_ACT, STORY, REGION_NAME } from './region.js';

const P = new URLSearchParams(location.search);
await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30))); // let the loader paint first
const __cached = await preloadGeo(); console.debug('LOG geo cache ' + __cached);
const renderer = createRenderer(document.getElementById('game'));
bakeGround(renderer, QUALITY);
WEATHER.uDustCol.value.set(IS_MARSH ? 0x6a604a : IS_CITY ? 0x6e655a : 0xa8835a);
const scene = new THREE.Scene();
renderer.info.autoReset = false;
const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.5, 1400);
let __t0 = performance.now();
const world = buildWorld(scene);
console.debug('LOG world ' + (performance.now() - __t0).toFixed(0)); __t0 = performance.now();
scene.fog = new THREE.FogExp2(0xd4a47a, 0.0048);
{ const sky = skyDome(world.sunDir); sky.userData.sky = true; scene.add(sky); }
scene.environment = envFromSky(renderer, world.sunDir);
scene.environmentIntensity = 0.4;

const sun = new THREE.DirectionalLight(0xffc488, 3.3);
sun.castShadow = true;
const SM = QUALITY === 'low' ? 2048 : 4096;
sun.shadow.mapSize.set(SM, SM);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 220 });
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.05; sun.shadow.radius = 3;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xc4c2c4, 0x7a5236, 0.5); scene.add(hemi);
// the hero's own soft light: in the dark it keeps Salim and the ground around him readable (made at load: no recompiles)
const heroLight = new THREE.PointLight(0xffd8b0, 0, 14, 1.3); scene.add(heroLight);

world.staticRoots = scene.children.filter((o) => !o.isLight); // hidden while underground
const fx = new FX(scene);
const { composer, grade, gtao, bokeh, bloom, vol, resize } = createComposer(renderer, scene, camera, sun);
// water reflections (High only): terrain, sky, buildings, palms, lights and characters are drawn mirrored
const reflection = QUALITY !== 'low' ? new PlanarReflection(renderer, scene, camera, { scale: 0.4, y: IS_MARSH ? WATER_Y + 0.0 : -0.55 }) : null;
if (reflection) {
  for (const o of scene.children) if (o.name === 'terrain' || o.isLight || o.renderOrder === -10) reflects(o);
  for (const g of world.occluders) reflects(g);
  sun.layers.enable(REFLECT_LAYER); sun.target.layers.enable(REFLECT_LAYER); hemi.layers.enable(REFLECT_LAYER); heroLight.layers.enable(REFLECT_LAYER);
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); resize(); reflection?.resize(); });

// torch light pool: every fire and lantern is an emitter; only the nearest few get a real light
const lightPool = new LightPool(scene, QUALITY === 'low' ? 4 : 8);
for (const f of world.fires) lightPool.add({ pos: f.pos.clone().add(new THREE.Vector3(0, f.kiln ? 0.4 : f.boss ? 2.4 : 1.2, 0)), color: f.kiln ? 0xff6a20 : 0xff9838, power: f.kiln ? 14 : f.boss ? 26 : 22, dist: f.kiln ? 8 : 13 });
for (const l of world.lanterns) { l.updateMatrixWorld(); lightPool.add({ pos: l.localToWorld(l.userData.lightPos.clone()), color: 0xffa850, power: 7, dist: 9, flicker: 0.4, lantern: true }); }

const ui = new UI(document.getElementById('ui'));
const audio = new Audio();
const game = new Game({ scene, camera, renderer, world, fx, ui, audio });
console.debug('LOG game ' + (performance.now() - __t0).toFixed(0)); __t0 = performance.now();
game.grade = grade; game.lightPool = lightPool;
const lighting = game.lighting = new Lighting({ scene, renderer, sun, hemi, world, grade });
const atmos = new Atmos(scene, QUALITY);
lighting.onAct = (a) => audio.setAct?.(a);
const perf = game.perf = new PerfHUD(renderer, () => `q ${QUALITY}${perfLevel ? ' −' + perfLevel : ''} · lights ${lightPool.lights.filter((l) => l.intensity > 0).length}/${lightPool.lights.length} · foes ${game.enemies.filter((e) => e.rig.visible && !e.dead).length} · ${lighting.name}`);
game.addNpc();
game.addAmbientLife();
setupHub(game); game.openPanel = (k) => (panelOpen() ? closePanel() : openPanel(game, k)); game.closePanels = closePanel; game.hubTick = (dt) => animateHub(game, dt);
game.zones = new Zones(game);
setupProgression(game);
game.tickExtra = (dt) => qanatBurnTick(game, dt);
setupNarrative(game);
game.journal = (t) => { if (document.getElementById('journal')) { document.getElementById('journal').remove(); document.body.classList.remove('inshop'); } else journalPanel(game, t); };
setupContent(game);
setupSideQuests(game);
setupDungeons(game);
setupBuild(game);
setupTravel(game);
setupMount(game);
setupCompanion(game);
setupTrials(game);
setupCraft(game);
setupRivals(game);
setupHamrin(game);
setupHolds(game);
setupStoryHolds(game);
setupHubLife(game);
setupStory25(game); game.converse25 = (n) => converse(game, n); // Round 25: barks, choices' effects, Ishaq, leaves and letters
setupFoes26(game); // Round 26: standard-bearers, shield walls, horse archers
setupStory26(game); // Round 26: the Hamrin story (scout, arrow, Tatzates' choice)
setupEncounters25(game); // Round 25: ambushes and champions on the main path
setupCombat25(game); // Round 25: boss stagger, combos, signature moves (wraps last)
const combatFx = game.combatFx = new CombatFX(game);
const ambient = game.ambient = new Ambient(game, QUALITY);
const tutorial = new Tutorial(game);
const guide = game.guide = new Guide(game);
const prevExtra = game.tickExtra; game.tickExtra = (dt) => { prevExtra(dt); guide.update(dt); game.discover(dt); tutorial.update(dt); game.contentTick?.(dt); game.sideTick?.(dt); game.travelTick?.(dt); };
game.newGamePlus = () => startNewGamePlus(game); ui.onNewGamePlus = game.newGamePlus;
const settings = game.settings = new Settings({ renderer, audio, game, grade, perf, gfx: { quality: QUALITY, sun, gtao, bloom, atmos, resize } });
setupBench(game, renderer, settings);
fx.reduce = settings.s.reduceFlash;
const sheets = game.sheets = setupSheets(ui, {
  inv: () => ui.toggleInventory(false), settings: () => settings.close(), journal: () => document.getElementById('journal')?.remove(),
  shop: () => { closePanel(); document.getElementById('shop')?.remove(); }, tmenupop: () => document.getElementById('tmenupop')?.classList.add('hidden'),
});
const closeAll = sheets.closeAll;
game.pad = new Gamepads(game, { settings: () => (settings.isOpen ? settings.close() : settings.open()), journal: () => game.journal('journal'), closeAll });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && game.started && !game.cinematic) { const any = sheets.open || ui.invOpen; if (any) closeAll(); else settings.open(); } });
{ const sb = document.createElement('button'); sb.id = 'setbtn'; sb.textContent = 'Settings'; sb.onclick = () => settings.open(); document.getElementById('startbtn').parentNode.appendChild(sb); }
audio.occluded = (pos) => !lineClear(game.player.pos.x, game.player.pos.z, pos.x, pos.z);
ui.aspects = ASPECTS; ui.sets = SETS; ui.classNames = Object.fromEntries(Object.entries(CLASSES).map(([k, c]) => [k, c.name]));
if (IS_TOUCH) setupMobile(game, ui);
if (gtao) game.holeInGBuffer(gtao.normalMaterial);
// Round 21: compile whatever a hold just added, against the real targets, while the screen is still faded out
game.warmCompile = async () => { const prev = renderer.getRenderTarget(); try { renderer.setRenderTarget(composer.readBuffer); await renderer.compileAsync(scene, camera); } catch (e) { /* lazily */ } renderer.setRenderTarget(prev); };
const director = game.director = new Director({ game, camera, ui, audio, grade, bokeh, renderer, scene });

// title-screen cinematic camera
let mode = 'title';
const titleCam = (t) => {
  const a = t * 0.04 + 0.6, V = SITES.village;
  const cx = V.x + Math.sin(a) * 46, cz = V.z + 20 + Math.cos(a) * 46;
  camera.position.set(cx, heightAt(cx, cz) + 14, cz);
  camera.lookAt(V.x, 9, V.z - 10);
};
function start(cont, fromTravel = false) {
  if (mode !== 'title') return;
  audio.init(); if (fromTravel) audio.fadeInAll?.(2.5);
  if (!fromTravel) ui.fade(1);
  setTimeout(async () => {
    mode = 'game'; game.started = true; ui.show(); ui.fade(0);
    if (cont) {
      applySave(game, cont); restoreContent(game); applyNG(game); game.restoreSide?.(); lighting.forAct(cont.act, 0); game.briefed = true; game.refreshTracker?.();
      // first time in a new region: the arrival scene; otherwise a banner
      if (!IS_SAWAD && !game.arrived?.[REGION]) { game.act = Math.max(game.act, FIRST_ACT[REGION]); await director.play(SCENES.arrival(game)); (game.arrived ||= {})[REGION] = true; game.refreshTracker?.(); saveGame(game); }
      else ui.banner('The Chronicle Continues', STORY.banner[cont.act] || REGION_NAME, 3500);
      return;
    }
    if (!IS_SAWAD) { // a new chronicle always begins in the Sawad: reload into it
      try { sessionStorage.setItem('sob.newgame', '1'); } catch { /* ignore */ }
      location.reload(); return;
    }
    const cls = P.get('cls') || await ui.classPick();
    game.setClass(cls, true);
    await director.play(SCENES.prologue(game));
    await director.play(SCENES.briefing(game));
    game.act = 1; game.briefed = true; game.refreshTracker?.(); saveGame(game);
  }, fromTravel ? 0 : 800);
}
// Travel to the next region: save, then reload the page into it (see region.js)
// Round 24: the loader shows where Salim is going while the next map is raised (index.html reads sob.travelcard),
// the score fades out with the picture, and a scene that already ended on black stays black (no flash of the HUD)
const TRAVEL_CARD = {
  marsh: { ar: 'الأهوار', en: 'Act IV · The Marshes', sub: 'Kallinikos has the last Pages. Follow him into the reeds.' },
  karkh: { ar: 'الكرخ', en: 'Act V · Al-Karkh', sub: 'Krateros will burn the Pages. Get there first.' },
  docks: { ar: 'الشطّ', en: 'Act VI · The River Quays', sub: 'Arsaber means to carry the copies north before they sail.' },
  hamrin: { ar: 'حمرين', en: 'The Hamrin Hills', sub: 'What is left of Arsaber\'s company holds the road north.' },
  back: { ar: 'الشطّ', en: 'The River Quays', sub: 'Back to the Tigris, and the camp on the quays.' },
};
ui.onFade = (v, sec) => audio.duck?.(v > 0.5, sec); // Round 24: the score dips while the screen is black
game.travel = () => {
  saveGame(game);
  const to = regionForAct(game.act || 1), C = to === REGION ? null : to === 'docks' && REGION === 'hamrin' ? TRAVEL_CARD.back : TRAVEL_CARD[to];
  try {
    sessionStorage.setItem('sob.autocontinue', '1');
    if (C) sessionStorage.setItem('sob.travelcard', JSON.stringify({ ar: C.ar, en: tr24(C.en), sub: tr24(C.sub), rtl: LANG === 'ar' }));
  } catch { /* ignore */ }
  audio.fadeOutAll?.(0.8); ui.holdBlack = true;
  ui.fade(1, director.endedBlack ? 0 : 0.5); setTimeout(() => location.reload(), 900);
};
// Continue button when a save exists
let newGame = false; try { newGame = !!sessionStorage.getItem('sob.newgame'); sessionStorage.removeItem('sob.newgame'); } catch { /* ignore */ }
const saved = loadSave();
if (newGame) setTimeout(() => start(), 50);
let autoCont = false; try { autoCont = sessionStorage.getItem('sob.autocontinue') === '1'; sessionStorage.removeItem('sob.autocontinue'); } catch { /* ignore */ }
// Round 24: arriving from another region, resume straight out of the loader (no second fade to black), and only once
// the map is ready, so the arrival scene is not half-played under the loading screen
const resumeTravel = saved && autoCont ? () => { if (mode === 'title') start(saved, true); else { applySave(game, saved); restoreContent(game); applyNG(game); game.restoreSide?.(); lighting.forAct(saved.act, 0); game.briefed = true; game.refreshTracker?.(); } } : null;
if (saved) {
  const cb = document.createElement('button'); cb.id = 'contbtn'; cb.textContent = 'Continue'; cb.onclick = () => start(saved);
  document.getElementById('startbtn').after(cb);
  document.getElementById('startbtn').textContent = 'New Chronicle';
}
document.getElementById('startbtn').onclick = () => start();
if (P.get('tod')) lighting.set(P.get('tod'), 0);
if (P.has('play')) { mode = 'game'; game.started = true; ui.show(); if (P.get('cls')) game.setClass(P.get('cls'), true); if (!IS_SAWAD) { game.act = FIRST_ACT[REGION]; game.briefed = true; if (!P.get('tod')) lighting.forAct(game.act, 0); game.refreshTracker?.(); } }
if (P.has('x')) { game.player.pos.set(+P.get('x'), 0, +P.get('z')); }

const _lm = new THREE.Matrix4(), _li = new THREE.Matrix4(), _lp = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _o = new THREE.Vector3();
function shadowSnap(c) {
  const sc = sun.shadow.camera, texel = (sc.right - sc.left) / sun.shadow.mapSize.x;
  _lm.lookAt(_o, world.sunDir, Math.abs(world.sunDir.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : _up); _li.copy(_lm).invert();
  _lp.copy(c).applyMatrix4(_li); _lp.x = Math.round(_lp.x / texel) * texel; _lp.y = Math.round(_lp.y / texel) * texel; _lp.applyMatrix4(_lm);
  sun.target.position.copy(_lp); sun.position.copy(_lp).addScaledVector(world.sunDir, 100);
}
const clock = new THREE.Clock(); let t = 0;
const _ck = new THREE.Vector3(), _frus = new THREE.Frustum(), _pm = new THREE.Matrix4(), _pp = new THREE.Vector3();
let fireFlick = 0, cullT = 0, shFrame = 0, reflTagT = 0, stormWas = false; const STORM_COL = new THREE.Color(0.78, 0.6, 0.42); const _shLast = new THREE.Vector3();
// adaptive quality (Round 21): sheds the most expensive effects one small step at a time when the frame rate stays
// low, and gives them back when there is headroom again. Each 3 s window is one vote; two slow windows in a row step
// down, four fast ones step back up, and a step is never retried for 20 s after being taken back (no see-sawing).
//   level 1-2: render resolution x0.87 each (Smooth never drops under 1.5x on high-density screens)
//   level 3: AO and volumetric light off      level 4: smaller, softer shadow map
let perfT = 0, perfN = 0, perfAcc = 0, perfLevel = 0, slowN = 0, fastN = 0, basePR = 0, holdUntil = 0;
const QSTEPS = [
  { down: () => setPR(0.87), up: () => setPR(1), name: 'resolution 87%' },
  { down: () => setPR(0.76), up: () => setPR(0.87), name: 'resolution 76%' },
  { down: () => { if (gtao) gtao.enabled = false; }, up: () => { if (gtao) gtao.enabled = settings.s.ao !== false; }, name: 'AO and volumetric light off' },
  { down: () => { renderer.shadowMap.type = THREE.PCFShadowMap; setShadow(2048); }, up: () => { renderer.shadowMap.type = THREE.PCFSoftShadowMap; setShadow(SM); }, name: 'shadows reduced' },
];
function setPR(k) { const floor = settings.s.sharp === 'smooth' && devicePixelRatio >= 2 ? 1.5 : 1; renderer.setPixelRatio(Math.max(Math.min(floor, basePR), basePR * k)); resize(); reflection?.resize(); }
function setShadow(n) { sun.shadow.mapSize.set(n, n); sun.shadow.map?.dispose(); sun.shadow.map = null; }
function adaptQuality(dt) {
  if (P.has('noadapt') || mode !== 'game' || settings.s.res !== 1 || document.body.classList.contains('benching') || game.cinematic) { perfT = perfAcc = perfN = 0; return; }
  if (!basePR || perfLevel === 0) basePR = renderer.getPixelRatio();
  perfT += dt; perfAcc += dt; perfN++;
  if (perfT < 3) return;
  const avg = perfAcc / perfN; perfT = 0; perfAcc = 0; perfN = 0;
  if (avg > 1 / 24) { slowN++; fastN = 0; } else if (avg < 1 / 40) { fastN++; slowN = 0; } else { slowN = 0; fastN = 0; }
  if (slowN >= 2 && perfLevel < QSTEPS.length) { QSTEPS[perfLevel].down(); console.info('quality: ' + QSTEPS[perfLevel].name); perfLevel++; slowN = 0; }
  else if (fastN >= 4 && perfLevel > 0 && clock.elapsedTime > holdUntil) { perfLevel--; QSTEPS[perfLevel].up(); console.info('quality: restored ' + QSTEPS[perfLevel].name); fastN = 0; holdUntil = clock.elapsedTime + 20; }
  game.perfLevel = perfLevel;
}
function frame() {
  const rawDt = clock.getDelta(); const dt = Math.min(rawDt, 0.05); t += dt;
  game.benchTick?.(rawDt);
  adaptQuality(rawDt);
  world.update(t, dt);
  fireFlick += dt;
  for (const f of world.fires) {
    if (Math.random() < 0.7) fx.fire(f.pos, f.intensity);
  }
  // drifting dust motes / sand in the air around the camera focus
  const focus = mode === 'game' ? game.player.pos : SITES.village;
  // kiln chimneys: a thick column of smoke from each, and the stoke-hole embers
  if (world.kilns && Math.hypot(focus.x - SITES.kiln.x, focus.z - SITES.kiln.z) < 70) for (const k of world.kilns) {
    if (Math.random() < 0.5) fx.smoke.spawn({ pos: { x: k.chimney.x, y: k.chimney.y, z: k.chimney.z }, vel: { x: 0.5 + Math.random() * 0.3, y: 1.6, z: 0.2 }, life: 6, size: 0.8, size1: 4.5, color: new THREE.Color(0.16, 0.14, 0.13), alpha: 0.42, drag: 0.25, fadeIn: 0.15 });
    if (Math.random() < 0.25) fx.glow.spawn({ pos: { x: k.mouth.x, y: k.mouth.y, z: k.mouth.z }, vel: { x: (Math.random() - 0.5), y: 1.5 + Math.random(), z: (Math.random() - 0.5) }, life: 1.2, size: 0.07, size1: 0.02, color: new THREE.Color(4, 1.6, 0.4), drag: 0.5 });
  }
  // kiln smoke drifting over the brick yard
  if (IS_SAWAD && focus.x < -25 && focus.z < -10 && Math.random() < 0.6) { const G = SITES.kiln; fx.smoke.spawn({ pos: { x: G.x + (Math.random() - 0.5) * 40, y: heightAt(G.x, G.z) + 0.3, z: G.z + (Math.random() - 0.5) * 36 }, vel: { x: 0.4, y: 0.05, z: 0.15 }, life: 7, size: 3, size1: 6, color: new THREE.Color(0.55, 0.5, 0.46), alpha: 0.16, drag: 0.1, fadeIn: 0.4 }); }
  if (IS_DOCKS) {
    // the river quays: pitch smoke from the boatyard cauldrons, mist lifting off the Tigris at dawn
    if (world.smokers) for (const sm of world.smokers) if (Math.abs(sm.x - focus.x) < 60 && Math.abs(sm.z - focus.z) < 60 && Math.random() < 0.3) fx.smoke.spawn({ pos: { x: sm.x + (Math.random() - 0.5) * 0.5, y: sm.y, z: sm.z + (Math.random() - 0.5) * 0.5 }, vel: { x: 0.5, y: 1.2, z: 0.2 }, life: 6, size: 0.6, size1: 3.5, color: new THREE.Color(0.12, 0.11, 0.1), alpha: 0.4, drag: 0.2, fadeIn: 0.2 });
    if (Math.random() < 0.5) { const z = focus.z + (Math.random() - 0.5) * 60, x = canalX(z) + (Math.random() - 0.5) * 40; fx.smoke.spawn({ pos: { x, y: -0.3 + Math.random() * 0.6, z }, vel: { x: 0.25, y: 0.08, z: -0.3 }, life: 9, size: 3, size1: 7, color: new THREE.Color(0.85, 0.82, 0.78), alpha: 0.1, drag: 0, fadeIn: 0.5 }); }
  } else if (IS_KARKH) {
    // al-Karkh: smoke still rising from the ruins, ash drifting down, the odd ember
    if (world.smokers) for (const sm of world.smokers) if (Math.abs(sm.x - focus.x) < 60 && Math.abs(sm.z - focus.z) < 60 && Math.random() < 0.35) fx.smoke.spawn({ pos: { x: sm.x + (Math.random() - 0.5), y: sm.y, z: sm.z + (Math.random() - 0.5) }, vel: { x: 0.6, y: 1.4, z: 0.25 }, life: 7, size: 0.9, size1: 5, color: new THREE.Color(0.2, 0.18, 0.17), alpha: 0.35, drag: 0.2, fadeIn: 0.2 });
    if (Math.random() < 0.6) fx.smoke.spawn({ pos: { x: focus.x + (Math.random() - 0.5) * 50, y: (focus.y || 0) + 3 + Math.random() * 6, z: focus.z + (Math.random() - 0.5) * 40 }, vel: { x: 0.5, y: -0.35, z: 0.2 }, life: 6, size: 0.07, size1: 0.05, color: new THREE.Color(0.55, 0.52, 0.5), alpha: 0.7, drag: 0, fadeIn: 0.4 });
    if (Math.random() < 0.08) fx.glow.spawn({ pos: { x: focus.x + (Math.random() - 0.5) * 30, y: (focus.y || 0) + Math.random() * 3, z: focus.z + (Math.random() - 0.5) * 24 }, vel: { x: 0.4, y: 0.7, z: 0.1 }, life: 2.5, size: 0.05, size1: 0.01, color: new THREE.Color(4, 1.4, 0.3), drag: 0.2 });
  } else if (IS_MARSH) {
    // the marshes: midges and reed fluff hanging in the still air
    if (Math.random() < 0.45) fx.smoke.spawn({ pos: { x: focus.x + (Math.random() - 0.5) * 44, y: (focus.y || 0) + 0.5 + Math.random() * 3, z: focus.z + (Math.random() - 0.5) * 36 }, vel: { x: 0.3 * (Math.random() - 0.5), y: 0.05, z: 0.3 * (Math.random() - 0.5) }, life: 5, size: 0.05, size1: 0.05, color: new THREE.Color(1, 0.98, 0.9), alpha: 0.55, drag: 0, fadeIn: 0.5 });
  } else if (Math.random() < 0.5) fx.smoke.spawn({ pos: { x: focus.x + (Math.random() - 0.5) * 50, y: (focus.y || 0) + Math.random() * 6, z: focus.z + (Math.random() - 0.5) * 40 }, vel: { x: 1.5, y: 0.1, z: 0.4 }, life: 4, size: 0.06, size1: 0.06, color: new THREE.Color(1, 0.9, 0.7), alpha: 0.6, drag: 0, fadeIn: 0.3 });
  if (mode === 'title') { titleCam(t); game.t += dt; game.updateAmbientLife(dt); } else if (director.update(dt)) game.cineTick(dt * director.timeScale); else game.update(dt * (game.timeScale ?? 1));
  director.blendOut(rawDt);
  lighting.update(dt);
  // no blade ribbons or slashes in cutscenes: a trail caught mid-swing as a scene starts hung beside Salim
  if (mode === 'game') { if (director.active) combatFx.clear(); else combatFx.update(dt * (game.timeScale ?? 1)); }
  ambient.update(dt, mode === 'game' ? game.player.pos : SITES.village, lighting);
  { // a sandstorm thickens the air: denser, sandier fog, a dimmer sun, dust driven along the ground
    const S = ambient.storm, L = lighting.cur;
    if (S > 0.001 || stormWas) {
      scene.fog.density = L.fogD * (1 + 3.5 * S); scene.fog.color.copy(L.fog).lerp(STORM_COL, 0.55 * S);
      sun.intensity = L.sunI * (1 - 0.45 * S); stormWas = S > 0.001;
      if (S > 0.05 && mode === 'game') for (let i = 0; i < 3; i++) if (Math.random() < S) fx.smoke.spawn({ pos: { x: game.player.pos.x + (Math.random() - 0.5) * 40, y: (game.player.pos.y || 0) + Math.random() * 4, z: game.player.pos.z + (Math.random() - 0.5) * 34 }, vel: { x: 7 * 0.82, y: 0.2, z: 7 * 0.57 }, life: 3, size: 1.5, size1: 3.5, color: STORM_COL, alpha: 0.22 * S, drag: 0, fadeIn: 0.3 });
    }
  }
  cullT -= rawDt; if (cullT <= 0) { cullT = 0.4; world.cull(mode === 'game' ? game.player.pos : camera.position, mode === 'game' ? 95 * Math.max(1, game.camZoom * 0.8) : 200); }
  lightPool.update(dt, mode === 'game' ? game.player.pos : camera.position, lighting.fireScale);
  fx.update(dt); fx.setScale(renderer.getDrawingBufferSize(new THREE.Vector2()).y);
  const c = mode === 'game' ? game.player.pos : new THREE.Vector3(SITES.village.x, 0, SITES.village.z);
  // shadow map follows the hero, snapped to whole shadow texels so edges don't crawl as the camera moves
  { // Round 20: a wider shadow box when zoomed far out (the overhead view sees further)
    const ext = Math.round(40 * Math.max(1, (mode === 'game' ? game.camZoom : 1) / 1.5) * (innerWidth < innerHeight ? 1.2 : 1)), sc = sun.shadow.camera;
    if (sc.right !== ext) { Object.assign(sc, { left: -ext, right: ext, top: ext, bottom: -ext }); sc.updateProjectionMatrix(); renderer.shadowMap.needsUpdate = true; }
  }
  shadowSnap(c);
  // phones: the sun's shadow map is redrawn at half rate (the sun is static; only actors move), unless the frame moved it
  shFrame++;
  const halfRate = QUALITY === 'low' || perfLevel >= 2;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = !halfRate || !sun.shadow.map || (shFrame & 1) === 0 || !sun.target.position.equals(_shLast);
  _shLast.copy(sun.target.position);
  atmos.update(dt, c, lighting, camera, !!game.interior);
  if (vol?.enabled !== false && vol) for (const r of atmos.rays) r.visible = false; // real god rays replace the old slabs
  {
    const L = lighting.cur, hk = (L.hero || 0) * (game.interior ? 1.2 : 1);
    if (game.cinematic && mode === 'game') {
      // cutscenes: the same light becomes a soft key beside the camera, so faces never go to silhouette
      _ck.set(1.6, 0.9, -0.6).applyQuaternion(camera.quaternion).add(camera.position);
      heroLight.position.copy(_ck); heroLight.intensity = 7 + hk * 0.5;
    } else { heroLight.intensity = mode === 'game' ? hk : 0; heroLight.position.set(c.x, (c.y || 0) + 3.4, c.z + 1.2); }
    // Round 24: from the overhead play camera figures are small: a brighter rim lifts them off the ground (scenes keep the softer one)
    showOutlines(camera, mode === 'game' && !game.cinematic); // Round 25: outlines in play only
    RIM_G.value.copy(L.sunCol).lerp(L.hemiSky, 0.35).multiplyScalar((0.9 + (L.hero || 0) / 12) * (game.cinematic || mode !== 'game' ? 1 : 1.6));
  }
  if (vol) {
    const L = lighting.cur, U = vol.u; vol.enabled = (!gtao || gtao.enabled) && !game.interior && (L.vol ?? 0.02) > 0.001 && settings.s.volumetric !== false;
    U.uSun.value.copy(world.sunDir); U.uSunCol.value.copy(L.sunCol); U.uSunI.value = L.sunI * 0.55; U.uAmb.value.copy(L.fog).multiplyScalar(0.06 * L.hemiI);
    U.uDens.value = (L.vol ?? 0.02) * (1 + 2.5 * ambient.storm); U.uGround.value = c.y || 0; U.uTime.value = t; vol.amount = 1;
  }
  grade.uniforms.uTime.value = t;
  renderer.info.reset();
  if (reflection) {
    // only when water could be on screen: the marsh always, elsewhere near the canal
    let near = IS_MARSH;
    if (!near && !game.interior) { // is any stretch of the canal inside the view?
      _frus.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      for (let z = c.z - 60; z <= c.z + 30 && !near; z += 3) if (_frus.containsPoint(_pp.set(canalX(z), -0.55, z))) near = true;
    }
    reflection.active = near && !game.interior && settings.s.reflections !== false;
    if ((reflTagT -= dt) <= 0) { reflTagT = 1.5; scene.traverse((o) => { if (o.isSkinnedMesh && !o.userData.outline && !o.layers.isEnabled(REFLECT_LAYER)) o.layers.enable(REFLECT_LAYER); }); }
    reflection.update(perfLevel >= 2 ? 3 : 2);
  }
  REFL.uRipT.value = t;
  composer.render();
  perf.frame(rawDt);
  requestAnimationFrame(frame);
}
frame();
// debug: advance the simulation without rendering (used by automated screenshot tests)
window.__director = director; window.__SCENES = SCENES;
window.__sim = (sec, step = 1 / 30) => { world.cull(game.player.pos); for (let i = 0; i < sec / step; i++) { t += step; world.update(t, step); if (director.update(step)) game.cineTick(step * director.timeScale); else game.update(step); fx.update(step); for (const f of world.fires) if (Math.random() < 0.7) fx.fire(f.pos, f.intensity); } };
// compile every material up front, including props the distance cull has hidden, so walking up to a new site never hitches
for (const o of world.cullables || []) o.visible = true;
// pooled effects start hidden, and compile skips hidden objects: show everything for the compile, then restore
const hiddenForCompile = []; scene.traverse((o) => { if (!o.visible && (o.isMesh || o.isPoints || o.isGroup)) { hiddenForCompile.push(o); o.visible = true; } });
// Round 21: compile for the targets the frame really draws into. The composer renders the scene into a linear
// half-float target (not the screen), the water reflection into its own target and sees fewer lights, and the
// shadow and AO passes have their own programs: compiling against the screen alone left all of those to compile
// the first time something came into view mid-fight (the Rawh hitch, now Kallinikos). So: compile against each target, then draw
// one real frame of the whole map (no culling, wide shadow box, reflection on) while the loader is still up.
// the reflection shares the renderer's light state with the shadow pass: if it saw fewer lights, every shadow and
// mirrored material needed a second variant, built by turns mid-game. It sees all of them now (one variant).
if (reflection) scene.traverse((o) => { if (o.isLight) o.layers.enable(REFLECT_LAYER); });
{
  world.cullPaused = true; // the loop keeps running while the compile awaits: don't let it hide far props again
  const prevRT = renderer.getRenderTarget();
  showOutlines(camera, true);
  try { renderer.setRenderTarget(composer.readBuffer); await renderer.compileAsync(scene, camera); } catch (e) { /* compile lazily */ }
  if (reflection) try { renderer.setRenderTarget(reflection.rt); await renderer.compileAsync(scene, reflection.cam); } catch (e) { /* compile lazily */ }
  renderer.setRenderTarget(prevRT);
  // the loop also re-hides rigs out of view while the compile awaits: show everything again, synchronously
  const hid2 = []; scene.traverse((o) => { if (!o.visible && (o.isMesh || o.isPoints || o.isGroup)) { hid2.push(o); o.visible = true; } });
  const fc = []; scene.traverse((o) => { if (o.frustumCulled) { fc.push(o); o.frustumCulled = false; } });
  const sc = sun.shadow.camera, keep = { left: sc.left, right: sc.right, top: sc.top, bottom: sc.bottom, far: sc.far };
  Object.assign(sc, { left: -170, right: 170, top: 170, bottom: -170, far: 420 }); sc.updateProjectionMatrix();
  shadowSnap(new THREE.Vector3(0, 0, 0)); sun.position.copy(sun.target.position).addScaledVector(world.sunDir, 200); sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
  try {
    if (reflection) { const was = reflection.active; reflection.active = true; reflection.update(1); reflection.active = was; }
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; composer.render();
  } catch (e) { console.warn('warm-up frame', e); }
  for (const o of fc) o.frustumCulled = true; for (const o of hid2) o.visible = false;
  Object.assign(sc, keep); sc.updateProjectionMatrix(); renderer.shadowMap.needsUpdate = true;
  world.cullPaused = false;
}
for (const o of hiddenForCompile) o.visible = false;
world.cull(mode === 'game' ? game.player.pos : camera.position, mode === 'game' ? 95 : 200);
resumeTravel?.();
document.getElementById('loader')?.classList.add('done'); setTimeout(() => document.getElementById('loader')?.remove(), 1200);
// installable PWA: register the offline worker on the standalone build (not in dev, not inside an embedding frame)
if (import.meta.env.PROD && 'serviceWorker' in navigator && window.top === window && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { /* offline install unavailable */ });
window.__mk = makeItem; window.__game = game; window.__vol = vol; window.__refl = reflection; window.__lighting = lighting; window.__renderer = renderer; window.__ready = true;
setTimeout(flushGeo, 4000); setInterval(flushGeo, 60000);
