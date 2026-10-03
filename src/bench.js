import * as THREE from 'three';
import { SITES } from './terrain.js';
import { QUALITY } from './graphics.js';
import { t } from './i18n.js';

// Round 20: Settings → Graphics → Run benchmark. A 30-second fly-through on the player's own phone: a slow orbit of
// the hub, a fight on the road with a pack of foes and their effects, then the widest zoom. It reports the average
// frame rate, the 1% low, frame time and draw calls, and suggests (and can apply) a quality and sharpness that fit.
const DUR = 30;
export function setupBench(game, renderer, settings) {
  let B = null;
  const tmp = new THREE.Vector3();
  game.runBench = () => {
    if (B || !game.started || game.interior || game.cinematic) { game.ui.toast(t('Start the benchmark from the overworld, outside a fight.')); return; }
    settings.close();
    const p = game.player, home = p.pos.clone(), V = SITES.village, S = SITES.serai;
    B = { t: 0, dts: [], draws: 0, n: 0, foes: [], cam: game.updateCamera, zoom: game.camZoom, inv: p.invuln, home };
    p.invuln = 1e9;
    document.body.classList.add('benching');
    const banner = document.createElement('div'); banner.id = 'benchbar'; banner.innerHTML = `<b>${t('Benchmark')}</b> <span>0 / ${DUR} s</span>`; document.getElementById('ui').appendChild(banner); B.bar = banner;
    game.updateCamera = function () {
      const k = B.t;
      if (k < 10) { // orbit the hub
        const a = k * 0.35, r = 26; this.camera.position.set(V.x + Math.cos(a) * r, 14, V.z + Math.sin(a) * r); this.camera.lookAt(V.x, 1, V.z);
      } else if (k < 20) { // over the hero's shoulder in a fight
        const q = p.pos; this.camera.position.set(q.x + 4, q.y + 9, q.z + 10); this.camera.lookAt(q.x, q.y + 1, q.z);
      } else { // the widest overhead view
        const q = p.pos; this.camera.position.set(q.x, q.y + 34, q.z + 18); this.camera.lookAt(q.x, q.y, q.z);
      }
    };
  };
  game.benchTick = (rawDt) => {
    if (!B) return;
    B.t += rawDt; B.dts.push(rawDt); B.draws += renderer.info.render.calls; B.n++;
    B.bar.querySelector('span').textContent = `${Math.min(DUR, Math.floor(B.t))} / ${DUR} s`;
    const p = game.player;
    if (B.t >= 10 && !B.fight) { // a pack of foes on the road, alerted and fighting
      B.fight = true; p.pos.set(SITES.serai.x - 14, 0, SITES.serai.z + 18); game.camInit = false;
      B.foes = game.spawnPack(['bandit', 'spearman', 'archer', 'naffat', 'crossbow'], p.pos.x, p.pos.z - 5, 7, p.level, { spread: 5 });
      for (const e of B.foes) e.alerted = true;
    }
    if (B.fight && B.t < 20 && Math.random() < 0.08) { const d = game.slotDefs?.(); const k = ['s1', 's2', 's3'][Math.floor(Math.random() * 3)]; if (d?.[k]) { p.mp = p.stats.maxMp; p.cds = {}; game.aimAuto?.(); game.useSkill(k); } }
    if (B.t >= 20 && !B.wide) { B.wide = true; for (const e of B.foes) if (!e.dead) { e.hp = 0; game.killEnemy(e, p.pos); } }
    if (B.t >= DUR) finish();
  };
  function finish() {
    const r = B; B = null;
    game.updateCamera = r.cam; game.camZoom = r.zoom; game.player.invuln = r.inv; game.player.pos.copy(r.home); game.camInit = false;
    for (const e of r.foes) if (!e.dead) { game.scene.remove(e.rig); e.removed = true; }
    r.bar.remove(); document.body.classList.remove('benching');
    const dts = r.dts.slice(Math.min(30, Math.floor(r.dts.length * 0.05))).sort((a, b) => a - b); // skip the warm-up
    const avg = dts.reduce((a, b) => a + b, 0) / dts.length, fps = 1 / avg, low = 1 / dts[Math.floor(dts.length * 0.99)];
    const draws = Math.round(r.draws / r.n), px = renderer.getDrawingBufferSize(new THREE.Vector2());
    const sug = fps >= 50 ? { q: 'high', sharp: 'smooth', text: 'Runs smoothly. Keep High quality and Smooth sharpness.' }
      : fps >= 36 ? { q: 'high', sharp: 'balanced', text: 'Good. High quality with Balanced sharpness gives headroom in big fights.' }
      : fps >= 26 ? { q: 'high', sharp: 'fast', text: 'Playable. Fast sharpness will steady the frame rate.' }
      : { q: 'low', sharp: 'fast', text: 'Heavy for this device. Low quality and Fast sharpness are recommended.' };
    const line = `${Math.round(fps)} fps · 1% ${Math.round(low)} · ${(avg * 1000).toFixed(1)} ms · ${draws} draws · ${px.x}×${px.y} · ${QUALITY} / ${settings.s.sharp}`;
    document.getElementById('shop')?.remove();
    const w = document.createElement('div'); w.id = 'shop'; w.className = 'panel bench';
    w.innerHTML = `<div class="ptitle">${t('Benchmark')} <span class="close" role="button" aria-label="Close">✕</span></div><div class="sbody">
      <div class="benchbig"><b>${Math.round(fps)}</b><small>${t('frames per second')}</small></div>
      <div class="slabel">${t('Slowest 1%')}: <b>${Math.round(low)} fps</b> · ${t('Frame time')}: <b>${(avg * 1000).toFixed(1)} ms</b> · ${t('Draw calls')}: <b>${draws}</b></div>
      <div class="slabel">${t(sug.text)}</div>
      <div class="note benchline">${line}</div>
      <div class="row2"><button class="sbtn go">${t('Apply suggestion')}</button></div></div>`;
    game.ui.root.appendChild(w);
    w.querySelector('.close').onclick = () => w.remove();
    w.querySelector('.go').onclick = () => { settings.set('sharp', sug.sharp); w.remove(); if (sug.q !== QUALITY) { const u = new URL(location.href); u.searchParams.set('q', sug.q); settings.set('quality', sug.q); location.href = u.toString(); } else game.ui.toast(t('Applied')); };
    console.info('benchmark', line);
    game.lastBench = { fps, low, avg, draws, line };
  }
}
