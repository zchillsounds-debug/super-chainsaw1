import * as THREE from 'three';
import { heightAt, SITES } from './terrain.js';
import { colliders } from './buildings.js';
import { buildGrid, resolve } from './collision.js';
import { buildInterior, destroyInterior, interiorNow, roomCenter, ORIGIN } from './interior.js';
import { makeItem, rollRarity } from './items.js';
import { saveGame } from './save.js';
import { IS_SAWAD } from './region.js';

// Interactables (talk, open, descend) with a single context prompt, and the trips into and out of interiors.
export class Zones {
  constructor(game) {
    this.g = game; game.interactables = game.interactables || [];
    this.prompt = document.createElement('button'); this.prompt.id = 'prompt'; this.prompt.className = 'hidden';
    game.ui.root.appendChild(this.prompt);
    const fire = (e) => { e.preventDefault(); e.stopPropagation(); this.cur?.act(); };
    this.prompt.addEventListener('pointerdown', fire);
    addEventListener('keydown', (e) => { if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && this.cur && !game.ui.dialogOpen && game.started && !game.cinematic) this.cur.act(); });
    if (IS_SAWAD) this.addKilnEntrance();
  }
  // a dark stair down among the kilns
  addKilnEntrance() {
    const G = SITES.kiln, p = new THREE.Vector3(G.x + 4, 0, G.z - 15); resolve(p, 2.2); p.y = heightAt(p.x, p.z);
    const grp = new THREE.Group();
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x050302 })); dark.position.y = 0.03; grp.add(dark);
    const brick = new THREE.MeshStandardMaterial({ color: 0x6a3a26, roughness: 1 });
    for (const sx of [-1.3, 1.3]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 3.2), brick); w.position.set(sx, 0.35, 0); w.castShadow = true; grp.add(w); }
    const back = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 0.4), brick); back.position.set(0, 0.7, -1.6); back.castShadow = true; grp.add(back);
    grp.position.copy(p); this.g.scene.add(grp);
    colliders.push({ type: 'box', x: p.x, z: p.z - 1.6, hw: 1.5, hd: 0.3, rot: 0 }); buildGrid();
    this.g.lightPool?.add({ pos: p.clone().add(new THREE.Vector3(0, 1, 0.5)), color: 0xff6a20, power: 6, dist: 6, flicker: 1.4 });
    this.g.interactables.push({ pos: p, r: 3, area: 'kiln', label: 'Descend into the kiln tunnels', act: () => this.enter({ kind: 'kiln', seed: 813, rooms: 7, level: 3, title: 'The Kiln Tunnels', sub: 'Brick galleries beneath the yard' }) });
    this.g.pois?.push({ x: p.x, z: p.z, icon: '▼', color: '#c08050' });
  }
  update(dt) {
    const g = this.g, p = g.player.pos;
    if (g.interior) for (const t of g.interior.I.torches) if (Math.random() < 0.5 && t.pos.distanceToSquared(p) < 900) g.fx.fire(t.pos, 0.35);
    if (g.interior) for (const f of g.interior.I.fades || []) { const d = Math.hypot(f.mesh.position.x - p.x, f.mesh.position.z - p.z); f.mesh.material.opacity = f.base * Math.max(0, Math.min(1, 1 - (d - 5) / 4)); f.mesh.visible = d < 9; }
    let best = null, bd = 1e9;
    if (g.started && !g.cinematic && !g.player.dead && !g.ui.dialogOpen) for (const it of g.interactables) {
      if (it.hidden) continue; const d = Math.hypot(it.pos.x - p.x, it.pos.z - p.z); if (d < it.r && d < bd) { bd = d; best = it; }
    }
    if (best !== this.cur) {
      this.cur = best;
      this.prompt.classList.toggle('hidden', !best);
      if (best) this.prompt.innerHTML = `<span class="k">${g.isTouch ? '☝' : 'E'}</span>${best.label}`;
    }
  }

  // ------------------------------------------------------------------ interiors
  async enter(def) {
    const g = this.g; if (g.interior) return;
    g.ui.fade(1); g.paused = true; await wait(600);
    g.returnPos = g.player.pos.clone();
    const I = buildInterior(g.scene, { seed: def.seed, rooms: def.rooms, style: def.style || (def.kind === 'qanat' ? 'qanat' : 'kiln'), styles: def.styles });
    g.setupOccluders([I.group]);
    g.interior = { def, I, enemies: [] };
    for (const t of I.torches) { t.interior = true; g.lightPool?.add({ pos: t.light, color: ({ vault: 0xffb878, cellar: 0xffa860, pit: 0xffa060, flood: 0xffb070, scorched: 0xff9040, cistern: 0xc8d0c0, grainvault: 0xffb870, salt: 0xfff0d8, kiln2: 0xff7030, palace: 0xffc890, warren: 0xffa850 })[def.style] || 0xff8a3a, power: 18, dist: 11, interior: true }); }
    for (const e of g.enemies) if (!e.dead) e.rig.visible = false;
    // foes per room; the deepest room holds an elite guarding the chest
    const pool = def.pool || (def.kind === 'qanat' ? ['bandit', 'deserter', 'archer', 'spearman', 'naffat'] : ['deserter', 'deserter', 'naffat', 'bandit']);
    I.rooms.forEach((r, i) => {
      if (i === 0) return;
      const c = roomCenter(r), last = i === I.rooms.length - 1;
      // Round 27: the new troops below ground (marsh dungeons on, and every contract and trial): a standard-bearer with the
      // pack in one room, a shield wall holding another with fewer men beside it. No horse archers: the rooms are too
      // tight for his circle.
      const lv = def.level + (def.mods?.levelUp || 0), troops = !last && (def.level >= 8 || def.kind === 'contract' || def.kind === 'trial') && I.rooms.length > 3;
      const stdRoom = troops && i === Math.max(1, Math.floor((I.rooms.length - 1) * 0.4)), wallRoom = troops && !stdRoom && !!g.spawnWall26 && i === Math.max(2, Math.floor((I.rooms.length - 1) * 0.75));
      const n = (last ? 3 : 2 + Math.floor(Math.random() * 3)) + (def.extraFoes || 0) - (wallRoom ? 2 : 0);
      const pack = n > 0 ? g.spawnPack(pool, c.x, c.z, n, lv, { spread: 3, interior: true }) : [];
      if (stdRoom) pack.push(...g.spawnPack('standard', c.x, c.z + 2, 1, lv, { spread: 1, interior: true }));
      if (wallRoom) pack.push(...g.spawnWall26(c.x, c.z + 1.5, lv, { interior: true }));
      // Round 29: from level 5 one middle room adds a surgeon, a caltrop man or a braced spear, and qanats and contracts get javelin men
      const supRoom = !last && lv >= 5 && !stdRoom && !wallRoom && i === Math.max(1, Math.floor((I.rooms.length - 1) * 0.6));
      if (supRoom) pack.push(...g.spawnPack(lv >= 6 ? ['deputatos', 'tribolos', 'kontaratos', 'kynegos'] : ['deputatos', 'tribolos', 'kontaratos'], c.x, c.z - 2, 1, lv, { spread: 1, interior: true }));
      if (!last && lv >= 4 && (def.kind === 'qanat' || def.kind === 'contract') && i === 1) pack.push(...g.spawnPack('akontistes', c.x + 2, c.z, 1, lv, { spread: 1, interior: true }));
      if (last) pack.push(...g.spawnPack(def.bossType || 'spearman', c.x, c.z - 1.5, 1, def.level + 1, { elite: true, interior: true, name: def.bossName }).map((e) => Object.assign(e, { bossOf: def.bossOf, dboss: true }))); // Round 28: dboss gets the ground's move (bosses28.js)
      for (const e of pack) { e.interior = true; def.mods?.apply?.(e); }
      g.interior.enemies.push(...pack);
    });
    g.interactables.push({ pos: I.entrance, r: 2.6, label: 'Climb back to the surface', act: () => this.exit(), interior: true });
    g.interactables.push({ pos: I.chest.pos, r: 2.2, label: 'Open the chest', act: () => this.openChest(), interior: true, chest: true });
    g.player.pos.copy(I.entrance).add(new THREE.Vector3(0, 0, -1.5)); g.player.target = null; g.player.moveTo = null; g.player.vel?.set(0, 0, 0);
    g.camInit = false; g.lighting?.set('underground', 0);
    for (const o of g.world.staticRoots || []) { o.userData.wasVis = o.visible; o.visible = false; }
    g.world.cullPaused = true;
    g.ui.setMapRegion?.('interior', I);
    g.paused = false; g.ui.fade(0); g.ui.banner(def.title, def.sub, 2800); g.audio.stinger?.('ambush');
    def.onEnter?.(g);
  }
  openChest() {
    const g = this.g, I = g.interior?.I; if (!I || I.chest.opened) return;
    if (g.interior.enemies.some((e) => !e.dead && e.elite)) { g.ui.toast('The guard still watches the chest'); g.audio.denied?.(); return; }
    I.chest.opened = true; I.chest.lid?.rotation && (I.chest.mesh.children[1].rotation.x = -1.1);
    g.audio.legendary();
    const lvl = g.interior.def.level + 1, bonus = g.interior.def.lootBonus || 0;
    const at = I.chest.pos.clone().add(new THREE.Vector3(0, 0.6, 1));
    for (let i = 0; i < 3 + bonus; i++) g.dropItem(makeItem(lvl, i === 0 ? (Math.random() < 0.35 + bonus * 0.1 ? 'legendary' : 'rare') : rollRarity(lvl, 0.15)), at);
    g.dropItem({ gold: Math.round(60 * lvl * (1 + bonus * 0.5)), rarity: 'common' }, at);
    g.interactables = g.interactables.filter((x) => !x.chest);
    g.interior.def.onChest?.(g);
  }
  async exit() {
    const g = this.g; if (!g.interior) return;
    g.ui.fade(1); g.paused = true; await wait(600);
    const def = g.interior.def;
    for (const e of g.enemies) if (e.interior) { g.scene.remove(e.rig); e.removed = true; }
    g.enemies = g.enemies.filter((e) => !e.removed);
    for (const d of [...g.drops]) if (d.to.x > 148) { g.scene.remove(d.mesh); g.ui.removeLootLabel(d); g.drops.splice(g.drops.indexOf(d), 1); }
    g.interactables = g.interactables.filter((x) => !x.interior);
    g.lightPool?.remove((e) => e.interior);
    destroyInterior(g.scene); buildGrid();
    g.interior = null; g.caltropsClear29?.();
    g.player.pos.copy(g.returnPos); g.player.pos.y = heightAt(g.player.pos.x, g.player.pos.z); g.player.target = null; g.player.moveTo = null;
    g.camInit = false; g.lighting?.forAct(g.act, 0);
    for (const o of g.world.staticRoots || []) o.visible = o.userData.wasVis ?? true;
    g.world.cullPaused = false; g.world.cull(g.player.pos);
    g.ui.setMapRegion?.('world');
    g.paused = false; g.ui.fade(0);
    def.onExit?.(g); saveGame(g);
  }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export { interiorNow, ORIGIN };
