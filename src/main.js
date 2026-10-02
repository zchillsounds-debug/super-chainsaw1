import * as THREE from 'three';
import { createRenderer, createComposer, skyDome, envFromSky, QUALITY } from './graphics.js';
import { buildWorld } from './world.js';
import { FX } from './fx.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';
import { Game } from './game.js';
import { heightAt, SITES } from './terrain.js';
import { makeItem } from './items.js';

const P = new URLSearchParams(location.search);
const renderer = createRenderer(document.getElementById('game'));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.5, 1400);
const world = buildWorld(scene);
scene.fog = new THREE.FogExp2(0xc99a72, 0.0065);
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
scene.add(new THREE.HemisphereLight(0xb8c0d4, 0x6a4a34, 0.45));

const fx = new FX(scene);
const { composer, grade, resize } = createComposer(renderer, scene, camera);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); resize(); });

// static fire / lantern lights (limited count)
for (const f of world.fires) { const l = new THREE.PointLight(0xff8a3a, 22, 13, 2); l.position.copy(f.pos).add(new THREE.Vector3(0, 1.2, 0)); scene.add(l); f.light = l; }
for (const l of world.lanterns) { l.updateMatrixWorld(); const pl = new THREE.PointLight(0xffa850, 7, 9, 2); pl.position.copy(l.localToWorld(l.userData.lightPos.clone())); scene.add(pl); }

const ui = new UI(document.getElementById('ui'));
const audio = new Audio();
const game = new Game({ scene, camera, renderer, world, fx, ui, audio });
game.grade = grade;
game.addNpc();

// title-screen cinematic camera
let mode = 'title';
const titleCam = (t) => {
  const a = t * 0.04 + 0.6, V = SITES.village;
  const cx = V.x + Math.sin(a) * 46, cz = V.z + 20 + Math.cos(a) * 46;
  camera.position.set(cx, heightAt(cx, cz) + 14, cz);
  camera.lookAt(V.x, 9, V.z - 10);
};
function start() {
  if (mode !== 'title') return;
  audio.init();
  ui.fade(1);
  setTimeout(() => {
    mode = 'game'; game.started = true; ui.show(); ui.fade(0);
    ui.banner('The Outskirts of Baghdad', 'Where the Tigris feeds the palms of the Sawad', 3500);
    setTimeout(() => game.talkToNpc(), 2600);
  }, 800);
}
document.getElementById('startbtn').onclick = start;
if (P.has('play')) { mode = 'game'; game.started = true; ui.show(); }
if (P.has('x')) { game.player.pos.set(+P.get('x'), 0, +P.get('z')); }

const clock = new THREE.Clock(); let t = 0;
let fireFlick = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05); t += dt;
  world.update(t, dt);
  fireFlick += dt;
  for (const f of world.fires) {
    if (Math.random() < 0.7) fx.fire(f.pos, f.intensity);
    if (f.light) f.light.intensity = 18 + Math.sin(t * 13 + f.pos.x) * 3 + Math.random() * 4;
  }
  // drifting dust motes / sand in the air around the camera focus
  const focus = mode === 'game' ? game.player.pos : SITES.village;
  if (Math.random() < 0.5) fx.smoke.spawn({ pos: { x: focus.x + (Math.random() - 0.5) * 50, y: (focus.y || 0) + Math.random() * 6, z: focus.z + (Math.random() - 0.5) * 40 }, vel: { x: 1.5, y: 0.1, z: 0.4 }, life: 4, size: 0.06, size1: 0.06, color: new THREE.Color(1, 0.9, 0.7), alpha: 0.6, drag: 0, fadeIn: 0.3 });
  if (mode === 'title') { titleCam(t); game.t += dt; } else game.update(dt);
  fx.update(dt); fx.setScale(renderer.getDrawingBufferSize(new THREE.Vector2()).y);
  const c = mode === 'game' ? game.player.pos : new THREE.Vector3(SITES.village.x, 0, SITES.village.z);
  sun.position.copy(c).addScaledVector(world.sunDir, 100); sun.target.position.copy(c);
  grade.uniforms.uTime.value = t;
  composer.render();
  requestAnimationFrame(frame);
}
frame();
// debug: advance the simulation without rendering (used by automated screenshot tests)
window.__sim = (sec, step = 1 / 30) => { for (let i = 0; i < sec / step; i++) { t += step; world.update(t, step); game.update(step); fx.update(step); for (const f of world.fires) if (Math.random() < 0.7) fx.fire(f.pos, f.intensity); } };
window.__mk = makeItem; window.__game = game; window.__ready = true;
