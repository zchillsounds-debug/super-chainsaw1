import * as THREE from 'three';
import { RARITY, statLines } from './items.js';
import { SKILL_ICONS, SLOT_KEYS, CLASSES, CLASS_ORDER } from './classes.js';

const ICONS = {
  attack: `<svg viewBox="0 0 64 64"><path d="M14 52 L46 12 Q52 8 54 10 Q52 18 48 20 L18 56 Z" fill="#dfe6ee" stroke="#6a5530" stroke-width="2"/><path d="M10 46 L22 58" stroke="#d9a441" stroke-width="5" stroke-linecap="round"/></svg>`,
  whirl: `<svg viewBox="0 0 64 64"><g fill="none" stroke="#f0c070" stroke-width="4" stroke-linecap="round"><path d="M32 32 m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0 a16 16 0 1 1 -32 0 a20 20 0 1 1 40 0"/></g></svg>`,
  naft: `<svg viewBox="0 0 64 64"><path d="M26 10h12v8c8 4 12 10 12 18 0 10-8 18-18 18S14 46 14 36c0-8 4-14 12-18z" fill="#7a3d1e" stroke="#e8b060" stroke-width="2"/><path d="M32 22c6 8 10 12 6 20-3 6-12 6-14 0-2-6 4-8 8-20z" fill="#ff7a20"/><path d="M32 32c2 4 4 6 2 9-2 2-5 1-5-1 0-3 2-4 3-8z" fill="#ffe08a"/></svg>`,
  dash: `<svg viewBox="0 0 64 64"><g stroke="#e8d0a0" stroke-width="4" stroke-linecap="round"><path d="M8 20h22M4 32h30M8 44h22"/></g><path d="M36 14 L58 32 L36 50 Z" fill="#f0c070"/></svg>`,
  ward: `<svg viewBox="0 0 64 64"><g fill="none" stroke="#ffd870" stroke-width="2.5"><circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="10"/><path d="M32 8v48M8 32h48"/><rect x="15" y="15" width="34" height="34"/><rect x="15" y="15" width="34" height="34" transform="rotate(45 32 32)"/></g></svg>`,
  potion: `<svg viewBox="0 0 64 64"><path d="M26 8h12v10c8 4 12 10 12 18 0 10-8 18-18 18S14 46 14 36c0-8 4-14 12-18z" fill="#3a0d14" stroke="#e8b060" stroke-width="2"/><path d="M17 36c4 3 26 3 30 0 0 9-6 15-15 15s-15-6-15-15z" fill="#d0203a"/></svg>`,
};

const ITEM_SVG = {
  weapon: (c) => `<svg viewBox="0 0 64 64"><path d="M12 54 L44 14 Q50 8 55 9 Q54 16 48 21 L17 57 Z" fill="url(#bl)" stroke="${c}" stroke-width="1.5"/><path d="M8 48 L20 60" stroke="#d9a441" stroke-width="5" stroke-linecap="round"/><circle cx="9" cy="58" r="3" fill="#d9a441"/><defs><linearGradient id="bl" x1="0" x2="1"><stop offset="0" stop-color="#8a9098"/><stop offset=".5" stop-color="#f0f4f8"/><stop offset="1" stop-color="#9aa0a8"/></linearGradient></defs></svg>`,
  armor: (c) => `<svg viewBox="0 0 64 64"><path d="M18 10 L26 6 L32 12 L38 6 L46 10 L56 20 L50 28 L46 24 L46 56 L18 56 L18 24 L14 28 L8 20 Z" fill="#6a7078" stroke="${c}" stroke-width="2"/><g stroke="#3a3e44" stroke-width="1.2">${[20, 26, 32, 38, 44, 50].map((y) => `<path d="M18 ${y} H46"/>`).join('')}</g><path d="M30 12 V56" stroke="#d9a441" stroke-width="2"/></svg>`,
  helm: (c) => `<svg viewBox="0 0 64 64"><path d="M32 4 L36 14 Q50 18 52 36 L12 36 Q14 18 28 14 Z" fill="#a8aeb6" stroke="${c}" stroke-width="2"/><path d="M10 34 Q32 44 54 34 L54 42 Q32 52 10 42 Z" fill="#e8dcc0" stroke="#8a7a5a"/><path d="M14 44 L14 56 L50 56 L50 44" fill="none" stroke="#6a7078" stroke-width="3" stroke-dasharray="2 2"/></svg>`,
  ring: (c) => `<svg viewBox="0 0 64 64"><circle cx="32" cy="38" r="15" fill="none" stroke="#d9a441" stroke-width="6"/><path d="M24 22 L32 10 L40 22 L32 28 Z" fill="${c}" stroke="#fff8" stroke-width="1"/></svg>`,
  amulet: (c) => `<svg viewBox="0 0 64 64"><path d="M14 6 Q32 34 50 6" fill="none" stroke="#d9a441" stroke-width="2"/><circle cx="32" cy="40" r="14" fill="#1a2a5a" stroke="#d9a441" stroke-width="3"/><path d="M32 30 L35 37 L42 40 L35 43 L32 50 L29 43 L22 40 L29 37 Z" fill="${c}"/></svg>`,
};
export function itemIcon(it) { return (ITEM_SVG[it.slot] || ITEM_SVG.ring)(RARITY[it.rarity].color); }

const SLOT_NAMES = { weapon: 'Weapon', armor: 'Armor', helm: 'Helm', ring: 'Ring', amulet: 'Amulet' };

export class UI {
  constructor(root) {
    this.root = root;
    root.innerHTML = `
      <div id="hud" class="hidden">
        <div id="target"><div class="tname"></div><div class="tbar"><div class="tfill"></div></div></div>
        <div id="bossbar" class="hidden"><div class="bname"></div><div class="bbar"><div class="bfill"></div><div class="bghost"></div></div></div>
        <div id="quest"><div class="qtitle">The Renegade of the Sawad</div><div class="qlines"></div></div>
        <div id="toasts"></div>
        <div id="minimap"><canvas width="180" height="180"></canvas></div>
        <div id="bar">
          <div class="orb" id="hporb"><canvas width="150" height="150"></canvas><div class="orbtxt"></div></div>
          <div id="center">
            <div id="xp"><div class="xpfill"></div><div class="xptxt"></div></div>
            <div id="skills"></div>
          </div>
          <div class="orb" id="mporb"><canvas width="150" height="150"></canvas><div class="orbtxt"></div></div>
        </div>
        <div id="buffs"></div>
      </div>
      <div id="hpbars"></div>
      <div id="labels"></div>
      <div id="dmg"></div>
      <div id="inv" class="hidden panel">
        <div class="ptitle">Inventory <span class="close">✕</span></div>
        <div id="equip"></div>
        <div id="stats"></div>
        <div id="grid"></div>
        <div id="gold"></div>
        <div class="hint">Click to equip · Right-click to discard</div>
      </div>
      <div id="tooltip" class="hidden"></div>
      <div id="dialog" class="hidden panel"><div class="dname"></div><div class="dtext"></div><button class="dbtn">Continue</button></div>
      <div id="banner" class="hidden"><div class="btitle"></div><div class="bsub"></div></div>
      <div id="title">
        <div class="tlogo"><div class="ar">رمال بغداد</div><div class="en">Sands of Baghdad</div><div class="sub">— Year 813 of the Common Era · The Abbasid Caliphate —</div></div>
        <button id="startbtn">Enter the Sands</button>
        <div class="controls"><span class="pc">Left-click: move / attack · Right-click: Naft Flask · 1–4: Skills · Q: Potion · I: Inventory · Alt: show loot</span><span class="mob">Left thumb: joystick · Tap: move / attack · Right buttons: skills</span></div>
      </div>
      <div id="death" class="hidden"><div class="dt">You Have Fallen</div><button id="respawn">Rise Again</button></div>
      <div id="victory" class="hidden"><div class="vt">Victory</div><div class="vs">Ghassan has fallen beneath the ruined Persian arch.<br/>Ishaq records your deeds in the annals of the House of Wisdom.</div><div class="vstats"></div><button id="vcont">Continue Exploring</button></div>
      <div id="fade"></div>`;
    this.$ = (s) => root.querySelector(s);
    this.hud = this.$('#hud');
    this.labels = this.$('#labels'); this.dmg = this.$('#dmg');
    this.dmgPool = []; this.labelMap = new Map();
    this.hpCanvas = this.$('#hporb canvas').getContext('2d'); this.mpCanvas = this.$('#mporb canvas').getContext('2d');
    this.mini = this.$('#minimap canvas').getContext('2d');
    this.v = new THREE.Vector3();
    this.tooltip = this.$('#tooltip');
    this.$('#inv .close').onclick = () => this.toggleInventory(false);
  }
  show() { this.hud.classList.remove('hidden'); const t = this.$('#title'); t.classList.add('gone'); setTimeout(() => { t.style.display = 'none'; }, 1300); }
  // the skill bar follows the chosen class; on touch the same elements are moved into the thumb cluster
  buildSkills(defs) {
    const host = document.getElementById('tskills') || this.$('#skills');
    host.querySelectorAll('.skill').forEach((el) => el.remove());
    const html = Object.entries(defs).map(([k, d]) => `<div class="skill t-${k}" data-k="${k}" title="${d.name}">${SKILL_ICONS[d.icon] || ''}<div class="cd"></div><div class="key">${SLOT_KEYS[k]}</div><div class="cnt"></div></div>`).join('');
    host.insertAdjacentHTML('beforeend', html);
    this.skillEls = {}; for (const el of host.querySelectorAll('.skill')) this.skillEls[el.dataset.k] = el;
    this.onSkillsBuilt?.(this.skillEls);
  }
  // class choice before the prologue (returns a promise of the class id)
  classPick() {
    return new Promise((res) => {
      const el = document.createElement('div'); el.id = 'classpick';
      el.innerHTML = `<div class="cp-title">Choose Salim's Discipline</div><div class="cp-sub">You can change it later at the training yard in the suq.</div><div class="cp-row">${CLASS_ORDER.map((k) => { const c = CLASSES[k]; return `<button class="cp-card" data-k="${k}"><div class="cp-ic">${SKILL_ICONS[c.attack.icon]}</div><div class="cp-ar">${c.ar}</div><div class="cp-name">${c.name}</div><div class="cp-role">${c.role}</div><div class="cp-kit">${Object.values(c.skills).map((s) => `<span>${SKILL_ICONS[s.icon]}<i>${s.name}</i></span>`).join('')}</div></button>`; }).join('')}</div>`;
      this.root.appendChild(el);
      el.addEventListener('click', (e) => { const b = e.target.closest('.cp-card'); if (!b) return; el.classList.add('out'); setTimeout(() => el.remove(), 500); res(b.dataset.k); });
    });
  }
  setSkill(k, cdFrac, usable = true, count = null) {
    const el = this.skillEls[k]; if (!el) return;
    el.querySelector('.cd').style.height = (cdFrac * 100) + '%';
    el.classList.toggle('nomana', !usable);
    if (count !== null) el.querySelector('.cnt').textContent = count;
  }
  drawOrb(ctx, frac, c1, c2, t) {
    const S = 150, R = 66; ctx.clearRect(0, 0, S, S);
    ctx.save(); ctx.beginPath(); ctx.arc(S / 2, S / 2, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#080506'; ctx.fillRect(0, 0, S, S);
    const lvl = S / 2 + R - frac * R * 2;
    const g = ctx.createLinearGradient(0, lvl, 0, S); g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, S);
    for (let x = 0; x <= S; x += 4) ctx.lineTo(x, lvl + Math.sin(x * 0.06 + t * 2.4) * 3 + Math.sin(x * 0.11 - t * 1.7) * 2);
    ctx.lineTo(S, S); ctx.fill();
    // swirling inner glow
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = t * (0.4 + i * 0.2) + i * 2, rx = S / 2 + Math.cos(a) * 25, ry = Math.max(lvl + 20, S / 2 + Math.sin(a * 1.3) * 25);
      const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, 40); rg.addColorStop(0, c1 + '55'); rg.addColorStop(1, '#0000');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, S, S);
    }
    ctx.globalCompositeOperation = 'source-over';
    // glass highlight
    const hg = ctx.createRadialGradient(S * 0.38, S * 0.3, 2, S * 0.38, S * 0.3, R * 0.9);
    hg.addColorStop(0, 'rgba(255,255,255,0.45)'); hg.addColorStop(0.3, 'rgba(255,255,255,0.08)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, S, S);
    const sh = ctx.createRadialGradient(S / 2, S / 2, R * 0.6, S / 2, S / 2, R); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = sh; ctx.fillRect(0, 0, S, S);
    ctx.restore();
  }
  setOrbs(hp, maxHp, mp, maxMp, t) {
    this.drawOrb(this.hpCanvas, hp / maxHp, '#e0283a', '#4a0408', t);
    this.drawOrb(this.mpCanvas, mp / maxMp, '#3a6cff', '#06104a', t + 3);
    this.$('#hporb .orbtxt').textContent = `${Math.ceil(hp)} / ${maxHp}`;
    this.$('#mporb .orbtxt').textContent = `${Math.floor(mp)} / ${maxMp}`;
  }
  setXP(frac, level) { this.$('#xp .xpfill').style.width = (frac * 100) + '%'; this.$('#xp .xptxt').textContent = `Level ${level}`; }
  showTarget(name, frac, cls = '') {
    const t = this.$('#target'); t.className = 'show ' + cls;
    t.querySelector('.tname').textContent = name; t.querySelector('.tfill').style.width = Math.max(0, frac * 100) + '%';
  }
  hideTarget() { this.$('#target').className = ''; }
  bossBar(name, frac) {
    const b = this.$('#bossbar');
    if (name == null) { b.classList.add('hidden'); return; }
    b.classList.remove('hidden'); b.querySelector('.bname').textContent = name;
    b.querySelector('.bfill').style.width = (frac * 100) + '%';
    const gh = b.querySelector('.bghost'); const cur = parseFloat(gh.style.width || '100');
    gh.style.width = Math.max(frac * 100, cur - 0.4) + '%';
  }
  quest(lines) { this.$('#quest .qlines').innerHTML = lines.map((l) => `<div class="${l.done ? 'done' : ''}">${l.done ? '✦' : '◇'} ${l.text}</div>`).join(''); }
  toast(text, cls = '') {
    const el = document.createElement('div'); el.className = 'toast ' + cls; el.innerHTML = text;
    this.$('#toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 3200); setTimeout(() => el.remove(), 4000);
  }
  banner(title, sub, ms = 3500) {
    const b = this.$('#banner'); b.querySelector('.btitle').textContent = title; b.querySelector('.bsub').textContent = sub || '';
    b.classList.remove('hidden'); b.classList.remove('out'); void b.offsetWidth; b.classList.add('in');
    clearTimeout(this._bt); this._bt = setTimeout(() => { b.classList.add('out'); setTimeout(() => b.classList.add('hidden'), 900); }, ms);
  }
  buffs(list) { const h = list.map((b) => b.icon + Math.ceil(b.t)).join(); if (h === this._bh) return; this._bh = h; this.$('#buffs').innerHTML = list.map((b) => `<div class="buff">${SKILL_ICONS[b.icon] || ICONS[b.icon] || ''}<span>${Math.ceil(b.t)}</span></div>`).join(''); }
  dialog(name, text, cb) {
    const d = this.$('#dialog'); d.classList.remove('hidden'); document.body.classList.add('indialog');
    d.querySelector('.dname').textContent = name; d.querySelector('.dtext').innerHTML = text;
    d.querySelector('.dbtn').onclick = () => { d.classList.add('hidden'); document.body.classList.remove('indialog'); cb && cb(); };
  }
  get dialogOpen() { return !this.$('#dialog').classList.contains('hidden'); }
  death(show, cb) { const d = this.$('#death'); d.classList.toggle('hidden', !show); if (cb) this.$('#respawn').onclick = cb; }
  victory(st) {
    const v = this.$('#victory'); v.classList.remove('hidden');
    v.querySelector('.vstats').innerHTML = `<div><b>${st.level}</b>Level</div><div><b>${st.kills}</b>Foes Slain</div><div><b>${st.gold}</b>Dinars</div><div><b>${st.time}</b>Time</div>`;
    this.$('#vcont').onclick = () => v.classList.add('hidden');
  }
  fade(v) { this.$('#fade').style.opacity = v; }

  // ---------------- world-anchored elements
  project(pos, camera) {
    this.v.copy(pos).project(camera);
    return { x: (this.v.x * 0.5 + 0.5) * innerWidth, y: (-this.v.y * 0.5 + 0.5) * innerHeight, vis: this.v.z < 1 };
  }
  damageNumber(pos, text, kind = 'normal') {
    const el = this.dmgPool.find((d) => !d.active) || (() => { const e = { el: document.createElement('div') }; this.dmg.appendChild(e.el); this.dmgPool.push(e); return e; })();
    el.active = true; el.t = 0; el.pos = pos.clone(); el.pos.y += 2.2; el.dx = (Math.random() - 0.5) * 40;
    el.el.className = 'dn ' + kind; el.el.textContent = text; el.el.style.display = 'block';
  }
  addLootLabel(drop, onClick) {
    const el = document.createElement('div'); el.className = 'loot r-' + drop.item.rarity;
    el.textContent = drop.item.gold ? `${drop.item.gold} Dinars` : drop.item.potion ? 'Pomegranate Sherbet' : drop.item.name;
    el.onmousedown = (e) => { e.stopPropagation(); onClick(drop); };
    el.onmouseenter = () => !drop.item.gold && !drop.item.potion && this.showTooltip(drop.item, el.getBoundingClientRect());
    el.onmouseleave = () => this.hideTooltip();
    this.labels.appendChild(el); this.labelMap.set(drop, el);
  }
  removeLootLabel(drop) { const el = this.labelMap.get(drop); if (el) el.remove(); this.labelMap.delete(drop); this.hideTooltip(); }
  updateWorld(camera, dt, showAll) {
    for (const d of this.dmgPool) {
      if (!d.active) continue; d.t += dt;
      const p = this.project(d.pos, camera);
      const k = d.t / 1.0;
      d.el.style.transform = `translate(${p.x + d.dx * k}px, ${p.y - k * 70}px) translate(-50%,-50%) scale(${d.t < 0.1 ? 1.6 - d.t * 6 : 1})`;
      d.el.style.opacity = 1 - Math.max(0, k - 0.6) / 0.4;
      if (d.t > 1) { d.active = false; d.el.style.display = 'none'; }
    }
    const used = [];
    for (const [drop, el] of this.labelMap) {
      const show = showAll || drop.item.rarity !== 'common' || drop.item.gold || drop.age < 4;
      const p = this.project(drop.mesh.position, camera);
      if (!p.vis || !show) { el.style.display = 'none'; continue; }
      el.style.display = 'block';
      let y = p.y - 26;
      // naive label stacking to avoid overlap
      for (const u of used) if (Math.abs(u.x - p.x) < 90 && Math.abs(u.y - y) < 20) y = u.y - 22;
      used.push({ x: p.x, y });
      el.style.transform = `translate(${p.x}px, ${y}px) translate(-50%,-50%)`;
    }
  }
  enemyBars(enemies, camera) {
    if (!this.barPool) { this.barPool = []; this.barRoot = this.$('#hpbars'); }
    let n = 0;
    for (const e of enemies) {
      if (e.dead || e.boss || e.hidden || e.hp >= e.maxHp || !e.rig.visible) continue;
      const p = this.project(this.v.copy(e.pos).setY(e.pos.y + (e.elite ? 2.7 : 2.25)), camera);
      if (!p.vis) continue;
      let b = this.barPool[n];
      if (!b) { b = document.createElement('div'); b.className = 'ehp'; b.innerHTML = '<i></i>'; this.barRoot.appendChild(b); this.barPool.push(b); }
      b.style.display = 'block'; b.className = 'ehp' + (e.elite ? ' el' : '');
      b.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%,-50%)`;
      b.firstChild.style.width = (e.hp / e.maxHp * 100) + '%';
      n++;
    }
    for (let i = n; i < (this.barPool?.length || 0); i++) this.barPool[i].style.display = 'none';
  }
  drawMinimap(player, enemies, drops, pois) {
    const c = this.mini, S = 180, sc = 1.1;
    c.clearRect(0, 0, S, S);
    c.save(); c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2); c.clip();
    c.fillStyle = 'rgba(20,12,6,0.55)'; c.fillRect(0, 0, S, S);
    const tx = (x) => S / 2 + (x - player.x) * sc, tz = (z) => S / 2 + (z - player.z) * sc;
    const R = this.mapRect || { x0: -140, z0: -140, w: 280, h: 280 }, img = this.mapRegionImg || this.mapImg;
    if (img) c.drawImage(img, tx(R.x0), tz(R.z0), R.w * sc, R.h * sc);
    if (!this.mapRegionImg) for (const p of pois) { c.fillStyle = p.color; c.font = 'bold 13px Cinzel'; c.textAlign = 'center'; c.fillText(p.icon, tx(p.x), tz(p.z) + 4); }
    for (const e of enemies) if (!e.dead) { c.fillStyle = e.boss ? '#ff6020' : e.elite ? '#ffd040' : '#e03030'; c.beginPath(); c.arc(tx(e.pos.x), tz(e.pos.z), e.boss ? 4 : 2.2, 0, 7); c.fill(); }
    for (const d of drops) if (d.item.rarity !== 'common') { c.fillStyle = RARITY[d.item.rarity].color; c.fillRect(tx(d.mesh.position.x) - 1.5, tz(d.mesh.position.z) - 1.5, 3, 3); }
    c.restore();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(S / 2, S / 2, 3.2, 0, 7); c.fill();
  }

  // the minimap switches to the interior plan underground
  setMapRegion(kind, I) {
    if (kind !== 'interior') { this.mapRegionImg = null; this.mapRect = null; return; }
    const c = document.createElement('canvas'); c.width = 140; c.height = 280; const x = c.getContext('2d');
    x.fillStyle = '#0a0705'; x.fillRect(0, 0, 140, 280);
    x.fillStyle = I.style === 'qanat' ? '#6a6250' : '#5a3a28';
    for (const [x0, z0, x1, z1] of I.floors) x.fillRect(x0 - 150 + 1, z0 + 140 + 1, x1 - x0 - 2, z1 - z0 - 2);
    this.mapRegionImg = c; this.mapRect = { x0: 150, z0: -140, w: 140, h: 280 };
  }
  // ---------------- inventory
  toggleInventory(v) { const el = this.$('#inv'); const show = v ?? el.classList.contains('hidden'); el.classList.toggle('hidden', !show); if (!show) this.hideTooltip(); return show; }
  get invOpen() { return !this.$('#inv').classList.contains('hidden'); }
  itemHTML(it, cmp) {
    const r = RARITY[it.rarity];
    let s = `<div class="tt-name" style="color:${r.color}">${it.name}${it.rank ? ' +' + it.rank : ''}</div><div class="tt-base">${it.rarity !== 'common' && it.base !== it.name ? it.base + ' · ' : ''}${r.name} ${SLOT_NAMES[it.slot]}</div>`;
    if (it.min) s += `<div class="tt-main">${it.min} – ${it.max} Damage</div>`;
    if (it.armor) s += `<div class="tt-main">${it.armor} Armor</div>`;
    s += statLines(it).map((l) => `<div class="tt-aff">${l}</div>`).join('');
    if (it.aspect && this.aspects) s += `<div class="tt-asp"><b>${this.aspects[it.aspect].name}</b><br>${this.aspects[it.aspect].desc}</div>`;
    if (it.set && this.sets) { const S = this.sets[it.set]; s += `<div class="tt-set"><b>${S.name}</b><br>(2) ${S.b2}<br>(4) ${S.b4}</div>`; }
    if (it.cls && this.classNames && it.cls !== this.curCls) s += `<div class="tt-cls">${this.classNames[it.cls]} weapon</div>`;
    if (it.flavor && !it.set) s += `<div class="tt-flavor">${it.flavor}</div>`;
    s += `<div class="tt-lvl">Item Level ${it.level}</div>`;
    if (cmp) s += `<div class="tt-cmp">Equipped: <span style="color:${RARITY[cmp.rarity].color}">${cmp.name}</span></div>`;
    return s;
  }
  showTooltip(it, rect, cmp) {
    const t = this.tooltip; t.innerHTML = this.itemHTML(it, cmp); t.classList.remove('hidden');
    t.style.borderColor = RARITY[it.rarity].color;
    const w = t.offsetWidth, h = t.offsetHeight;
    let x = rect.left + rect.width / 2 - w / 2, y = rect.top - h - 10;
    if (y < 8) y = rect.bottom + 10; x = Math.max(8, Math.min(innerWidth - w - 8, x));
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }
  hideTooltip() { this.tooltip.classList.add('hidden'); }
  refreshInventory(player, onEquip, onDiscard, onUnequip) {
    const eq = this.$('#equip');
    eq.innerHTML = Object.keys(SLOT_NAMES).map((s) => {
      const it = player.equip[s];
      return `<div class="eslot s-${s} ${it ? 'r-' + it.rarity : ''}" data-s="${s}">${it ? `<span class="ic">${itemIcon(it)}</span>` : `<span class="lbl">${SLOT_NAMES[s]}</span>`}</div>`;
    }).join('');
    for (const el of eq.querySelectorAll('.eslot')) {
      const it = player.equip[el.dataset.s]; if (!it) continue;
      el.onmouseenter = () => this.showTooltip(it, el.getBoundingClientRect());
      el.onmouseleave = () => this.hideTooltip();
      el.onclick = () => { this.hideTooltip(); onUnequip(el.dataset.s); };
    }
    const g = this.$('#grid'); const cells = [];
    for (let i = 0; i < 40; i++) { const it = player.bag[i]; cells.push(`<div class="cell ${it ? 'r-' + it.rarity : ''}" data-i="${i}">${it ? `<span class="ic">${itemIcon(it)}</span>` : ''}</div>`); }
    g.innerHTML = cells.join('');
    for (const el of g.querySelectorAll('.cell')) {
      const it = player.bag[+el.dataset.i]; if (!it) continue;
      el.onmouseenter = () => this.showTooltip(it, el.getBoundingClientRect(), player.equip[it.slot]);
      el.onmouseleave = () => this.hideTooltip();
      el.onclick = () => { this.hideTooltip(); onEquip(+el.dataset.i); };
      el.oncontextmenu = (e) => { e.preventDefault(); this.hideTooltip(); onDiscard(+el.dataset.i); };
    }
    const st = player.stats;
    this.$('#stats').innerHTML = `<div><b>Level</b> ${player.level}</div><div><b>Damage</b> ${st.min}–${st.max}</div><div><b>Armor</b> ${st.armor}</div><div><b>Life</b> ${st.maxHp}</div><div><b>Mana</b> ${st.maxMp}</div><div><b>Crit</b> ${st.crit}%</div><div><b>Atk Speed</b> +${st.speed}%</div><div><b>Life/Hit</b> ${st.leech}</div>`;
    this.$('#gold').textContent = `◉ ${player.gold} Dinars`;
  }
}
