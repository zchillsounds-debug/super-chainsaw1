import { t } from './i18n.js';
import * as THREE from 'three';
import { RARITY, statLines } from './items.js';
import { SKILL_ICONS, SLOT_KEYS, CLASSES, CLASS_ORDER } from './classes.js';

const ICONS = {
  attack: `<svg viewBox="0 0 64 64"><path d="M14 52 L46 12 Q52 8 54 10 Q52 18 48 20 L18 56 Z" fill="#dfe6ee" stroke="#6a5530" stroke-width="2"/><path d="M10 46 L22 58" stroke="#d9a441" stroke-width="5" stroke-linecap="round"/></svg>`,
  whirl: `<svg viewBox="0 0 64 64"><g fill="none" stroke="#f0c070" stroke-width="4" stroke-linecap="round"><path d="M32 32 m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0 a16 16 0 1 1 -32 0 a20 20 0 1 1 40 0"/></g></svg>`,
  naft: `<svg viewBox="0 0 64 64"><path d="M26 10h12v8c8 4 12 10 12 18 0 10-8 18-18 18S14 46 14 36c0-8 4-14 12-18z" fill="#7a3d1e" stroke="#e8b060" stroke-width="2"/><path d="M32 22c6 8 10 12 6 20-3 6-12 6-14 0-2-6 4-8 8-20z" fill="#ff7a20"/><path d="M32 32c2 4 4 6 2 9-2 2-5 1-5-1 0-3 2-4 3-8z" fill="#ffe08a"/></svg>`,
  dash: `<svg viewBox="0 0 64 64"><g stroke="#e8d0a0" stroke-width="4" stroke-linecap="round"><path d="M8 20h22M4 32h30M8 44h22"/></g><path d="M36 14 L58 32 L36 50 Z" fill="#f0c070"/></svg>`,
  ward: `<svg viewBox="0 0 64 64"><g fill="none" stroke="#ffd870" stroke-width="2.5"><circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="10"/><path d="M32 8v48M8 32h48"/><circle cx="32" cy="32" r="17" stroke-dasharray="4 3"/></g></svg>`,
  potion: `<svg viewBox="0 0 64 64"><path d="M26 8h12v10c8 4 12 10 12 18 0 10-8 18-18 18S14 46 14 36c0-8 4-14 12-18z" fill="#3a0d14" stroke="#e8b060" stroke-width="2"/><path d="M17 36c4 3 26 3 30 0 0 9-6 15-15 15s-15-6-15-15z" fill="#d0203a"/></svg>`,
};

const ITEM_SVG = {
  weapon: (c) => `<svg viewBox="0 0 64 64"><path d="M12 54 L44 14 Q50 8 55 9 Q54 16 48 21 L17 57 Z" fill="url(#bl)" stroke="${c}" stroke-width="1.5"/><path d="M8 48 L20 60" stroke="#d9a441" stroke-width="5" stroke-linecap="round"/><circle cx="9" cy="58" r="3" fill="#d9a441"/><defs><linearGradient id="bl" x1="0" x2="1"><stop offset="0" stop-color="#8a9098"/><stop offset=".5" stop-color="#f0f4f8"/><stop offset="1" stop-color="#9aa0a8"/></linearGradient></defs></svg>`,
  armor: (c) => `<svg viewBox="0 0 64 64"><path d="M18 10 L26 6 L32 12 L38 6 L46 10 L56 20 L50 28 L46 24 L46 56 L18 56 L18 24 L14 28 L8 20 Z" fill="#6a7078" stroke="${c}" stroke-width="2"/><g stroke="#3a3e44" stroke-width="1.2">${[20, 26, 32, 38, 44, 50].map((y) => `<path d="M18 ${y} H46"/>`).join('')}</g><path d="M30 12 V56" stroke="#d9a441" stroke-width="2"/></svg>`,
  helm: (c) => `<svg viewBox="0 0 64 64"><path d="M32 4 L36 14 Q50 18 52 36 L12 36 Q14 18 28 14 Z" fill="#a8aeb6" stroke="${c}" stroke-width="2"/><path d="M10 34 Q32 44 54 34 L54 42 Q32 52 10 42 Z" fill="#e8dcc0" stroke="#8a7a5a"/><path d="M14 44 L14 56 L50 56 L50 44" fill="none" stroke="#6a7078" stroke-width="3" stroke-dasharray="2 2"/></svg>`,
  ring: (c) => `<svg viewBox="0 0 64 64"><circle cx="32" cy="38" r="15" fill="none" stroke="#d9a441" stroke-width="6"/><path d="M24 22 L32 10 L40 22 L32 28 Z" fill="${c}" stroke="#fff8" stroke-width="1"/></svg>`,
  belt: (c) => `<svg viewBox="0 0 64 64"><path d="M6 26 Q32 34 58 26 L58 38 Q32 46 6 38 Z" fill="#6a4428" stroke="${c}" stroke-width="2"/><rect x="26" y="27" width="12" height="12" rx="2" fill="none" stroke="#d9a441" stroke-width="3"/><path d="M46 40 L46 50 Q46 58 52 58 Q58 58 58 50 L58 42" fill="#a82a3a" stroke="#3a1a10" stroke-width="2"/></svg>`,
  amulet: (c) => `<svg viewBox="0 0 64 64"><path d="M14 6 Q32 34 50 6" fill="none" stroke="#d9a441" stroke-width="2"/><circle cx="32" cy="40" r="14" fill="#1a2a5a" stroke="#d9a441" stroke-width="3"/><ellipse cx="32" cy="40" rx="7" ry="9" fill="${c}"/><ellipse cx="30" cy="36" rx="2" ry="3" fill="#fff8"/></svg>`,
};
export function itemIcon(it) { return (ITEM_SVG[it.slot] || ITEM_SVG.ring)(RARITY[it.rarity].color); }

const SLOT_NAMES = { weapon: 'Weapon', armor: 'Armor', helm: 'Helm', ring: 'Ring', amulet: 'Amulet', belt: 'Belt' };
// a plain standing figure behind the equipment slots
const DOLL = `<svg class="doll" viewBox="0 0 120 200" aria-hidden="true"><g fill="#d9a44114" stroke="#d9a44140" stroke-width="1.5"><circle cx="60" cy="26" r="15"/><path d="M38 50 Q60 42 82 50 L92 108 L80 110 L76 72 L74 120 L80 192 L64 192 L60 132 L56 192 L40 192 L46 120 L44 72 L40 110 L28 108 Z"/></g></svg>`;
const avgDmg = (it) => it && it.min ? (it.min + it.max) / 2 : 0;

// Round 28: write an inline style only when it changes (each write costs a style recalc on a phone)
function setS(el, k, v) { const c = el._s || (el._s = {}); if (c[k] !== v) { c[k] = v; el.style[k] = v; } }
export class UI {
  constructor(root) {
    this.root = root;
    root.innerHTML = `
      <div id="hud" class="hidden">
        <div id="target"><div class="tname"></div><div class="tbar"><div class="tfill"></div></div></div>
        <div id="bossbar" class="hidden"><div class="bname"></div><div class="bbar"><div class="bfill"></div><div class="bghost"></div></div><div class="bcall"></div></div>
        <div id="quest"><div class="qtitle">The Teacher's Pages</div><div class="qnow hidden"><i>◆</i><span class="qtx"></span><b class="qd"></b></div><div class="qlines"></div></div>
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
        <div class="ptitle">Inventory <span class="close" role="button" aria-label="Close">✕</span></div>
        <div class="invbody">
          <div class="invleft"><div id="equip"></div><div id="stats"></div></div>
          <div class="invright"><div class="baghead"><span class="bagn"></span><span id="gold"></span></div><div id="grid"></div></div>
        </div>
      </div>
      <div id="tooltip" class="hidden"></div>
      <div id="dialog" class="hidden panel"><div class="dname"></div><div class="dtext"></div><button class="dbtn">Continue</button></div>
      <div id="banner" class="hidden"><div class="btitle"></div><div class="bsub"></div></div>
      <div id="title">
        <div class="tlogo"><div class="ar">مدينة السلام</div><div class="en">Madinat al-Salam</div><div class="sub">— Year 813 of the Common Era · The Abbasid Caliphate —</div></div>
        <button id="startbtn">Enter the Sands</button>
        <div class="controls"><span class="pc">Left-click: move / attack · Right-click: Naft Flask · 1–4: Skills · Q: Potion · I: Inventory · Alt: show loot</span><span class="mob">Left thumb: joystick · Tap: move / attack · Right buttons: skills</span></div>
      </div>
      <div id="death" class="hidden"><div class="dt">You Have Fallen</div><button id="respawn">Rise Again</button></div>
      <div id="victory" class="hidden"><div class="vt">Victory</div><div class="vs">The Teacher's Pages are safe, and the lamps for the fallen still drift on the canal.<br/>Ishaq keeps the account.</div><div class="vstats"></div><button id="vcont">Continue Exploring</button><button id="vng">New Game+</button><div class="vngnote">Keep your hero, gear and disciplines. The Sawad resets, and its foes grow stronger.</div></div>
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
  show() { document.body.classList.add('playing'); this.hud.classList.remove('hidden'); const t = this.$('#title'); t.classList.add('gone'); setTimeout(() => { t.style.display = 'none'; }, 1300); }
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
    // small touch orbs carry just the current value
    const tch = document.body.classList.contains('touch');
    this.$('#hporb .orbtxt').textContent = tch ? Math.ceil(hp) : `${Math.ceil(hp)} / ${maxHp}`;
    this.$('#mporb .orbtxt').textContent = tch ? Math.floor(mp) : `${Math.floor(mp)} / ${maxMp}`;
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
  // Round 27: a master's callout ("Fire the reeds!") as a line under his bar; floating over him it landed on his name
  bossCall(text) {
    const c = this.$('#bossbar .bcall'); if (!c) return false;
    c.textContent = text; c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
    clearTimeout(this.bcallT); this.bcallT = setTimeout(() => c.classList.remove('show'), 1800);
    return true;
  }
  // side tasks, bounties and events can be tapped to put them on the trail (data-k); the tracked one is marked
  quest(lines) { this.$('#quest .qlines').innerHTML = lines.map((l) => `<div class="${l.done ? 'done' : ''} ${l.side ? 'side' : ''} ${l.on ? 'on' : ''}"${l.key ? ` data-k="${l.key}"` : ''}>${l.done ? '✦' : l.on ? '➤' : l.side ? '·' : '◇'} ${t(l.text)}</div>`).join(''); }
  // the active objective and how far it is (kept in step with the ground trail)
  objective(text, dist) {
    const el = this.$('#quest .qnow'); el.classList.toggle('hidden', !text); if (!text) return;
    const tx = t(text), dd = dist == null ? '' : dist < 1000 ? `${Math.round(dist)} m` : '';
    if (this._oT !== tx) { this._oT = tx; el.querySelector('.qtx').textContent = tx; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
    if (this._oD !== dd) { this._oD = dd; el.querySelector('.qd').textContent = dd; }
  }
  toast(text, cls = '') {
    const el = document.createElement('div'); el.className = 'toast ' + cls; el.innerHTML = text;
    const box = this.$('#toasts');
    // Round 30: on a phone the stack keeps to three lines (the oldest goes first) and the same line never shows twice
    for (const o of box.children) if (o.innerHTML === el.innerHTML && !o.classList.contains('out')) o.remove();
    if (document.body.classList.contains('touch')) { const live = [...box.children].filter((o) => !o.classList.contains('out')); for (const o of live.slice(0, Math.max(0, live.length - 2))) { o.classList.add('out'); setTimeout(() => o.remove(), 500); } }
    box.appendChild(el); setTimeout(() => el.classList.add('out'), 3200); setTimeout(() => el.remove(), 4000);
    // Round 24: never more than four at once (a burst of pickups used to stack a wall of text over the fight)
    const live = [...box.children].filter((c) => !c.classList.contains('out')); for (const c of live.slice(0, Math.max(0, live.length - 4))) { c.classList.add('out'); setTimeout(() => c.remove(), 800); }
  }
  banner(title, sub, ms = 3500) {
    const b = this.$('#banner'); b.querySelector('.btitle').textContent = title; b.querySelector('.bsub').textContent = sub || '';
    b.classList.remove('hidden'); b.classList.remove('out'); void b.offsetWidth; b.classList.add('in');
    clearTimeout(this._bt); this._bt = setTimeout(() => { b.classList.add('out'); setTimeout(() => b.classList.add('hidden'), 900); }, ms);
  }
  buffs(list) { const h = list.map((b) => b.icon + Math.ceil(b.t)).join(); if (h === this._bh) return; this._bh = h; this.$('#buffs').innerHTML = list.map((b) => `<div class="buff">${SKILL_ICONS[b.icon] || ICONS[b.icon] || ''}<span>${Math.ceil(b.t)}</span></div>`).join(''); }
  dialog(name, text, cb) {
    const d = this.$('#dialog'); d.classList.remove('hidden'); document.body.classList.add('indialog');
    d.querySelector('.dname').textContent = t(name); d.querySelector('.dtext').innerHTML = t(text);
    d.querySelector('.dbtn').onclick = () => { d.classList.add('hidden'); document.body.classList.remove('indialog'); cb && cb(); };
  }
  get dialogOpen() { return !this.$('#dialog').classList.contains('hidden'); }
  death(show, cb) { const d = this.$('#death'); d.classList.toggle('hidden', !show); document.body.classList.toggle('overlay', show); if (cb) this.$('#respawn').onclick = cb; }
  victory(st) {
    const v = this.$('#victory'); v.classList.remove('hidden'); document.body.classList.add('overlay');
    v.querySelector('.vstats').innerHTML = `<div><b>${st.level}</b>Level</div><div><b>${st.kills}</b>Foes Slain</div><div><b>${st.gold}</b>Dinars</div><div><b>${st.time}</b>Time</div>`;
    this.$('#vcont').onclick = () => { v.classList.add('hidden'); document.body.classList.remove('overlay'); };
    this.$('#vng').onclick = () => { v.classList.add('hidden'); document.body.classList.remove('overlay'); this.onNewGamePlus?.(); };
  }
  // Round 24: fades to black are quick (0.5 s, so the swap behind them is always covered), fades back are slower
  fade(v, sec = v ? 0.5 : 0.8) { const f = this.$('#fade'); f.style.transition = `opacity ${sec}s`; f.style.opacity = v; this.onFade?.(v, sec); }

  // ---------------- world-anchored elements
  // Round 28: one reused result (callers read it at once), so projecting no longer makes garbage every frame
  project(pos, camera) {
    this.v.copy(pos).project(camera); const r = this._pr || (this._pr = { x: 0, y: 0, vis: false });
    r.x = (this.v.x * 0.5 + 0.5) * innerWidth; r.y = (-this.v.y * 0.5 + 0.5) * innerHeight; r.vis = this.v.z < 1 && this.v.z > -1 && Math.abs(this.v.x) < 1.3 && Math.abs(this.v.y) < 1.3; return r;
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
    el.onmouseenter = () => !drop.item.gold && !drop.item.potion && !drop.item.recipe && this.showTooltip(drop.item, el.getBoundingClientRect());
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
    const used = this._used || (this._used = []); used.length = 0; const cp = camera.position;
    for (const [drop, el] of this.labelMap) {
      const show = showAll || drop.item.rarity !== 'common' || drop.item.gold || drop.age < 4;
      const mp = drop.mesh.position, far = Math.abs(mp.x - cp.x) > 60 || Math.abs(mp.z - cp.z) > 60;
      const p = !show || far ? null : this.project(mp, camera);
      if (!p || !p.vis) { setS(el, 'display', 'none'); continue; }
      setS(el, 'display', 'block');
      let y = p.y - 26; const x = Math.round(p.x);
      // naive label stacking to avoid overlap
      for (const u of used) if (Math.abs(u.x - x) < 90 && Math.abs(u.y - y) < 20) y = u.y - 22;
      used.push({ x, y });
      setS(el, 'transform', `translate(${x}px, ${Math.round(y)}px) translate(-50%,-50%)`);
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
      setS(b, 'display', 'block'); const cn = e.elite ? 'ehp el' : 'ehp'; if (b.className !== cn) b.className = cn;
      setS(b, 'transform', `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%,-50%)`);
      setS(b.firstChild, 'width', Math.round(e.hp / e.maxHp * 100) + '%');
      n++;
    }
    for (let i = n; i < (this.barPool?.length || 0); i++) setS(this.barPool[i], 'display', 'none');
  }
  drawMinimap(player, enemies, drops, pois, marks) {
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
    // Round 30: task markers; one beyond the rim waits on the rim, pointing the way
    if (marks) for (const m of marks) {
      let x = tx(m.pos.x) - S / 2, y = tz(m.pos.z) - S / 2; const d = Math.hypot(x, y), R0 = S / 2 - 18, out = d > R0;
      if (out) { x *= R0 / d; y *= R0 / d; }
      drawMark(c, S / 2 + x, S / 2 + y, m.kind, m.on, (out ? 1.25 : 1.5) * (document.body.classList.contains('touch') ? 1.3 : 1)); // the minimap shows at half size on a phone
    }
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
  toggleInventory(v) { const el = this.$('#inv'); const show = v ?? el.classList.contains('hidden'); el.classList.toggle('hidden', !show); if (!show) { this.hideTooltip(); this.closeCard(); } return show; }
  get invOpen() { return !this.$('#inv').classList.contains('hidden'); }
  itemHTML(it, cmp) {
    const r = RARITY[it.rarity];
    let s = `<div class="tt-name" style="color:${r.color}">${it.name}${it.rank ? ' +' + it.rank : ''}</div><div class="tt-base">${it.rarity !== 'common' && it.base !== it.name ? it.base + ' · ' : ''}${r.name} ${SLOT_NAMES[it.slot]}</div>`;
    if (it.min) s += `<div class="tt-main">${it.min} – ${it.max} Damage</div>`;
    if (it.armor) s += `<div class="tt-main">${it.armor} Armor</div>`;
    s += statLines(it).map((l) => `<div class="tt-aff">${l}</div>`).join('');
    if (it.aspect && this.aspects) s += `<div class="tt-asp"><b>${this.aspects[it.aspect].name}</b><br>${this.aspects[it.aspect].desc}</div>`;
    if (it.socket && this.gemLine) s += this.gemLine(it);
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
  // inventory sheet: paper-doll and stats on the left, the pack on the right; a tap opens the item card
  refreshInventory(player, h) {
    const eq = this.$('#equip');
    eq.innerHTML = DOLL + Object.keys(SLOT_NAMES).map((s) => {
      const it = player.equip[s];
      return `<button class="eslot s-${s} ${it ? 'r-' + it.rarity : ''}" data-s="${s}" aria-label="${SLOT_NAMES[s]}">${it ? `<span class="ic">${itemIcon(it)}</span>${it.rank ? `<i class="rk">+${it.rank}</i>` : ''}` : `<span class="lbl">${SLOT_NAMES[s]}</span>`}</button>`;
    }).join('');
    const hover = (el, it, cmp) => { if (document.body.classList.contains('touch')) return; el.onmouseenter = () => this.showTooltip(it, el.getBoundingClientRect(), cmp); el.onmouseleave = () => this.hideTooltip(); };
    for (const el of eq.querySelectorAll('.eslot')) {
      const s = el.dataset.s, it = player.equip[s]; if (!it) continue;
      hover(el, it);
      el.onclick = () => { this.hideTooltip(); this.itemCard(it, { actions: s === 'weapon' ? [] : [{ label: 'Unequip', fn: () => h.unequip(s) }] }); };
    }
    const g = this.$('#grid'); const cells = [];
    for (let i = 0; i < 40; i++) { const it = player.bag[i]; cells.push(`<button class="cell ${it ? 'r-' + it.rarity : ''} ${it && h.better?.(it) ? 'up' : ''}" data-i="${i}">${it ? `<span class="ic">${itemIcon(it)}</span>${it.rank ? `<i class="rk">+${it.rank}</i>` : ''}` : ''}</button>`); }
    g.innerHTML = cells.join('');
    for (const el of g.querySelectorAll('.cell')) {
      const i = +el.dataset.i, it = player.bag[i]; if (!it) continue;
      hover(el, it, player.equip[it.slot]);
      el.onclick = () => {
        this.hideTooltip();
        const quest = !!it.questId, acts = [{ label: 'Equip', fn: () => h.equip(i), main: true }];
        if (!quest) acts.push({ label: `Sell · ${h.price(it)}`, fn: () => h.sell(i) }, { label: 'Salvage', fn: () => h.salvage(i) });
        this.itemCard(it, { cmp: player.equip[it.slot], actions: acts });
      };
      el.oncontextmenu = (e) => { e.preventDefault(); this.hideTooltip(); h.equip(i); };
    }
    this.$('.bagn').textContent = `Pack ${player.bag.filter(Boolean).length} / 40`;
    const st = player.stats;
    this.$('#stats').innerHTML = `<div><b>Level</b> ${player.level}</div><div><b>Damage</b> ${st.min}–${st.max}</div><div><b>Armor</b> ${st.armor}</div><div><b>Life</b> ${st.maxHp}</div><div><b>Mana</b> ${st.maxMp}</div><div><b>Crit</b> ${st.crit}%</div><div><b>Atk Speed</b> +${st.speed}%</div><div><b>Life/Hit</b> ${st.leech}</div>`;
    this.$('#gold').textContent = `◉ ${player.gold} Dinars`;
  }
  // item card: full details, a side-by-side comparison with what is worn, and the actions for the item
  itemCard(it, { cmp = null, actions = [] } = {}) {
    this.closeCard();
    const w = document.createElement('div'); w.id = 'icard';
    const delta = (a, b, label) => { const d = Math.round(a - b); return d ? `<div class="dl ${d > 0 ? 'pos' : 'neg'}">${d > 0 ? '▲ +' : '▼ '}${d} ${label}</div>` : ''; };
    const diff = cmp ? delta(avgDmg(it), avgDmg(cmp), 'Damage') + delta(it.armor || 0, cmp.armor || 0, 'Armor') : '';
    const col = (x, tag) => `<div class="iccol" style="border-color:${RARITY[x.rarity].color}"><div class="ictag">${tag}</div><div class="icic">${itemIcon(x)}</div>${this.itemHTML(x)}</div>`;
    w.innerHTML = `<div class="icwrap"><div class="iccols">${col(it, cmp ? 'Selected' : SLOT_NAMES[it.slot])}${cmp ? `<div class="iccmp hidden">${col(cmp, 'Equipped')}</div>` : ''}</div>
      ${diff ? `<div class="icdiff">${diff}</div>` : ''}
      <div class="icacts">${actions.map((a, k) => `<button class="${a.main ? 'main' : 'sbtn'}" data-a="${k}">${a.label}</button>`).join('')}${cmp ? '<button class="sbtn" data-a="cmp">Compare</button>' : ''}<button class="sbtn" data-a="x">Close</button></div></div>`;
    this.root.appendChild(w);
    w.addEventListener('pointerdown', (e) => { if (e.target === w) { e.preventDefault(); e.stopPropagation(); this.closeCard(); } });
    w.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'x') return this.closeCard();
      if (a === 'cmp') { const c = w.querySelector('.iccmp'); c.classList.toggle('hidden'); b.classList.toggle('on', !c.classList.contains('hidden')); return; }
      this.closeCard(); actions[+a].fn();
    });
  }
  closeCard() { this.root.querySelector('#icard')?.remove(); }

}

// Round 30: one marker style for the minimap and the big map. offer: a task to take (!), meet/return/task: the
// tracked task's next place (a diamond, bright when tracked), bounty: crossed blades, event: a red flag
export const MARK_COL = { offer: '#ffd24a', meet: '#7fd0ff', return: '#ffd24a', task: '#7fd0ff', bounty: '#ff9a3a', event: '#ff5040' };
export function drawMark(c, x, y, kind, on, k = 1) {
  const col = MARK_COL[kind] || '#fff', r = (on ? 7.5 : 6) * k;
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(14,9,5,0.88)'; c.strokeStyle = col; c.lineWidth = on ? 2.2 * k : 1.5 * k;
  if (kind === 'meet' || kind === 'task') { c.beginPath(); c.moveTo(0, -r - 1); c.lineTo(r + 1, 0); c.lineTo(0, r + 1); c.lineTo(-r - 1, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = col; c.beginPath(); c.arc(0, 0, r * 0.32, 0, 7); c.fill(); }
  else {
    c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.stroke(); c.fillStyle = col; c.strokeStyle = col;
    if (kind === 'offer' || kind === 'return') { c.font = `bold ${Math.round(r * 1.5)}px Cinzel, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(kind === 'offer' ? '!' : '?', 0, r * 0.08); }
    else if (kind === 'bounty') { c.lineWidth = 1.6 * k; c.beginPath(); c.moveTo(-r * 0.5, -r * 0.5); c.lineTo(r * 0.5, r * 0.5); c.moveTo(r * 0.5, -r * 0.5); c.lineTo(-r * 0.5, r * 0.5); c.stroke(); }
    else { c.fillRect(-r * 0.35, -r * 0.55, r * 0.14, r * 1.1); c.beginPath(); c.moveTo(-r * 0.21, -r * 0.55); c.lineTo(r * 0.55, -r * 0.3); c.lineTo(-r * 0.21, -r * 0.05); c.fill(); }
  }
  if (on) { c.strokeStyle = col; c.globalAlpha = 0.45; c.lineWidth = 1.2 * k; c.beginPath(); c.arc(0, 0, r + 4 * k, 0, 7); c.stroke(); }
  c.restore();
}
