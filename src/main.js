import * as THREE from 'three';
import { createRenderer, createComposer, skyDome, envFromSky, QUALITY } from './graphics.js';
import { buildWorld } from './world.js';
import { FX } from './fx.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';
import { Game } from './game.js';
import { heightAt, SITES } from './terrain.js';
import { makeItem } from './items.js';
import { IS_TOUCH, setupMobile } from './mobile.js';
import { Director } from './cinema.js';
import * as SCENES from './scenes.js';
import { loadSave, applySave, saveGame } from './save.js';
import { preloadGeo, flushGeo } from './geocache.js';
import { Lighting } from './lighting.js';
import { LightPool } from './lights.js';
import { setupHub, animateHub } from './hub.js';
import { Zones } from './zones.js';
import { Atmos } from './atmos.js';
import { PerfHUD } from './perf.js';

const P = new URLSearchParams(location.search);
await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30))); // let the loader paint first
const __cached = await preloadGeo(); console.debug('LOG geo cache ' + __cached);
const renderer = createRenderer(document.getElementById('game'));
const scene = new THREE.Scene();
renderer.info.autoReset = false;
const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.5, 1400);
let __t0 = performance.now();
const world = buildWorld(scene);
console.debug('LOG world ' + (performance.now() - __t0).toFixed(0)); __t0 = performance.now();
scene.fog = new THREE.FogExp2(0xd4a47a, 0.0048);
scene.add(skyDome(world.sunDir));
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

const fx = new FX(scene);
const { composer, grade, gtao, bokeh, resize } = createComposer(renderer, scene, camera);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); resize(); });

// torch light pool: every fire and lantern is an emitter; only the nearest few get a real light
const lightPool = new LightPool(scene, QUALITY === 'low' ? 4 : 8);
for (const f of world.fires) lightPool.add({ pos: f.pos.clone().add(new THREE.Vector3(0, f.kiln ? 0.4 : 1.2, 0)), color: f.kiln ? 0xff6a20 : 0xff8a3a, power: f.kiln ? 14 : 22, dist: f.kiln ? 8 : 13 });
for (const l of world.lanterns) { l.updateMatrixWorld(); lightPool.add({ pos: l.localToWorld(l.userData.lightPos.clone()), color: 0xffa850, power: 7, dist: 9, flicker: 0.4, lantern: true }); }

const ui = new UI(document.getElementById('ui'));
const audio = new Audio();
const game = new Game({ scene, camera, renderer, world, fx, ui, audio });
console.debug('LOG game ' + (performance.now() - __t0).toFixed(0)); __t0 = performance.now();
game.grade = grade; game.lightPool = lightPool;
const lighting = game.lighting = new Lighting({ scene, renderer, sun, hemi, world, grade });
const atmos = new Atmos(scene, QUALITY);
const perf = game.perf = new PerfHUD(renderer, () => `q ${QUALITY}${perfLevel ? ' −' + perfLevel : ''} · lights ${lightPool.lights.filter((l) => l.intensity > 0).length}/${lightPool.lights.length} · foes ${game.enemies.filter((e) => e.rig.visible && !e.dead).length} · ${lighting.name}`);
game.addNpc();
game.addAmbientLife();
setupHub(game); game.hubTick = (dt) => animateHub(game, dt);
game.zones = new Zones(game);
if (IS_TOUCH) setupMobile(game, ui);
const director = game.director = new Director({ game, camera, ui, audio, grade, bokeh, renderer, scene });

// title-screen cinematic camera
let mode = 'title';
const titleCam = (t) => {
  const a = t * 0.04 + 0.6, V = SITES.village;
  const cx = V.x + Math.sin(a) * 46, cz = V.z + 20 + Math.cos(a) * 46;
  camera.position.set(cx, heightAt(cx, cz) + 14, cz);
  camera.lookAt(V.x, 9, V.z - 10);
};
function start(cont) {
  if (mode !== 'title') return;
  audio.init();
  ui.fade(1);
  setTimeout(async () => {
    mode = 'game'; game.started = true; ui.show(); ui.fade(0);
    if (cont) { applySave(game, cont); lighting.forAct(cont.act, 0); ui.banner('The Chronicle Continues', ['', 'The road from the village', 'The kiln yard', 'The road to the arch', 'The grain road'][Math.min(4, cont.act)], 3500); return; }
    const cls = P.get('cls') || await ui.classPick();
    game.setClass(cls, true);
    await director.play(SCENES.prologue(game));
    await director.play(SCENES.briefing(game));
    game.act = 1; saveGame(game);
  }, 800);
}
// Continue button when a save exists
const saved = loadSave();
if (saved) {
  const cb = document.createElement('button'); cb.id = 'contbtn'; cb.textContent = 'Continue'; cb.onclick = () => start(saved);
  document.getElementById('startbtn').after(cb);
  document.getElementById('startbtn').textContent = 'New Chronicle';
}
document.getElementById('startbtn').onclick = () => start();
if (P.get('tod')) lighting.set(P.get('tod'), 0);
if (P.has('play')) { mode = 'game'; game.started = true; ui.show(); if (P.get('cls')) game.setClass(P.get('cls'), true); }
if (P.has('x')) { game.player.pos.set(+P.get('x'), 0, +P.get('z')); }

const _lm = new THREE.Matrix4(), _li = new THREE.Matrix4(), _lp = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _o = new THREE.Vector3();
function shadowSnap(c) {
  const sc = sun.shadow.camera, texel = (sc.right - sc.left) / sun.shadow.mapSize.x;
  _lm.lookAt(_o, world.sunDir, Math.abs(world.sunDir.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : _up); _li.copy(_lm).invert();
  _lp.copy(c).applyMatrix4(_li); _lp.x = Math.round(_lp.x / texel) * texel; _lp.y = Math.round(_lp.y / texel) * texel; _lp.applyMatrix4(_lm);
  sun.target.position.copy(_lp); sun.position.copy(_lp).addScaledVector(world.sunDir, 100);
}
const clock = new THREE.Clock(); let t = 0;
let fireFlick = 0, cullT = 0;
// adaptive quality: if the frame rate stays low, shed the most expensive effects
let perfT = 0, perfN = 0, perfAcc = 0, perfLevel = 0;
function adaptQuality(dt) {
  if (P.has('noadapt') || mode !== 'game') return;
  perfT += dt; perfAcc += dt; perfN++;
  if (perfT < 3) return;
  const avg = perfAcc / perfN; perfT = 0; perfAcc = 0; perfN = 0;
  if (avg > 1 / 40 && perfLevel === 0) { if (gtao) gtao.enabled = false; perfLevel = 1; console.info('quality: AO off'); }
  else if (avg > 1 / 40 && perfLevel === 1) { renderer.setPixelRatio(1); resize(); perfLevel = 2; console.info('quality: 1x resolution'); }
  else if (avg > 1 / 35 && perfLevel === 2) { renderer.shadowMap.type = THREE.PCFShadowMap; sun.shadow.mapSize.set(2048, 2048); sun.shadow.map?.dispose(); sun.shadow.map = null; perfLevel = 3; console.info('quality: shadows reduced'); }
}
function frame() {
  const rawDt = clock.getDelta(); const dt = Math.min(rawDt, 0.05); t += dt;
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
  if (focus.x < -25 && focus.z < -10 && Math.random() < 0.6) { const G = SITES.kiln; fx.smoke.spawn({ pos: { x: G.x + (Math.random() - 0.5) * 40, y: heightAt(G.x, G.z) + 0.3, z: G.z + (Math.random() - 0.5) * 36 }, vel: { x: 0.4, y: 0.05, z: 0.15 }, life: 7, size: 3, size1: 6, color: new THREE.Color(0.55, 0.5, 0.46), alpha: 0.16, drag: 0.1, fadeIn: 0.4 }); }
  if (Math.random() < 0.5) fx.smoke.spawn({ pos: { x: focus.x + (Math.random() - 0.5) * 50, y: (focus.y || 0) + Math.random() * 6, z: focus.z + (Math.random() - 0.5) * 40 }, vel: { x: 1.5, y: 0.1, z: 0.4 }, life: 4, size: 0.06, size1: 0.06, color: new THREE.Color(1, 0.9, 0.7), alpha: 0.6, drag: 0, fadeIn: 0.3 });
  if (mode === 'title') { titleCam(t); game.t += dt; game.updateAmbientLife(dt); } else if (director.update(dt)) game.cineTick(dt * director.timeScale); else game.update(dt * (game.timeScale ?? 1));
  lighting.update(dt);
  cullT -= rawDt; if (cullT <= 0) { cullT = 0.4; world.cull(mode === 'game' ? game.player.pos : camera.position, mode === 'game' ? 95 : 200); }
  lightPool.update(dt, mode === 'game' ? game.player.pos : camera.position, lighting.fireScale);
  fx.update(dt); fx.setScale(renderer.getDrawingBufferSize(new THREE.Vector2()).y);
  const c = mode === 'game' ? game.player.pos : new THREE.Vector3(SITES.village.x, 0, SITES.village.z);
  // shadow map follows the hero, snapped to whole shadow texels so edges don't crawl as the camera moves
  shadowSnap(c);
  atmos.update(dt, c, lighting, camera, !!game.interior);
  grade.uniforms.uTime.value = t;
  renderer.info.reset();
  composer.render();
  perf.frame(rawDt);
  requestAnimationFrame(frame);
}
frame();
// debug: advance the simulation without rendering (used by automated screenshot tests)
window.__director = director; window.__SCENES = SCENES;
window.__sim = (sec, step = 1 / 30) => { world.cull(game.player.pos); for (let i = 0; i < sec / step; i++) { t += step; world.update(t, step); if (director.update(step)) game.cineTick(step * director.timeScale); else game.update(step); fx.update(step); for (const f of world.fires) if (Math.random() < 0.7) fx.fire(f.pos, f.intensity); } };
try { await renderer.compileAsync(scene, camera); } catch (e) { /* older drivers: compile lazily */ }
document.getElementById('loader')?.classList.add('done'); setTimeout(() => document.getElementById('loader')?.remove(), 1200);
window.__mk = makeItem; window.__game = game; window.__ready = true;
setTimeout(flushGeo, 4000); setInterval(flushGeo, 60000);
