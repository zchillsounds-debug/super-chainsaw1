// First-run hints: one card at a time, each cleared by doing the thing it teaches. Remembered per device.
const KEY = 'sob.tutorial.v1';
const STEPS = [
  { id: 'move', pc: 'Click the ground to walk. Hold the button to keep moving.', touch: 'Drag on the left of the screen to walk.' },
  // Round 25: each hint waits for the moment it is needed, and on touch the button it names pulses
  { id: 'attack', pc: 'Click a foe to attack. Your discipline sets the weapon.', touch: 'Tap the large button (or a foe) to attack.', when: (g) => near(g, 12) >= 1, btn: 't-attack' },
  { id: 'evade', ctx: true, pc: 'A blade glints: press Space now to evade. Timed with the glint, it parries.', touch: 'A blade glints: tap the curved arrow now. Timed with the glint, it parries.', btn: 't-dodge' },
  { id: 'skill', pc: 'Many foes: right-click or 1, 2, 3 for your skills. Each costs your resource.', touch: 'Many foes: use the skill buttons around the attack button. Each costs your resource.', when: (g) => near(g, 9) >= 3, btn: 't-s1' },
  { id: 'potion', pc: 'Wounded: press Q to drink pomegranate sherbet.', touch: 'Wounded: tap the red flask to drink sherbet.', when: (g) => g.player.hp < g.player.stats.maxHp * 0.5 },
  { id: 'suq', pc: 'The suq: talk (E) to Yusuf, Bishr and \'Amr. The well leads to the qanats.', touch: 'The suq: walk up to Yusuf, Bishr and \'Amr and tap the prompt. The well leads to the qanats.', when: (g) => Math.hypot(g.player.pos.x - 18, g.player.pos.z - 64) < 14 },
  { id: 'level', pc: 'A discipline point to spend: press K.', touch: 'A discipline point to spend: Menu ☰, then Disciplines.', when: (g) => g.player.level >= 2 },
];
function near(g, r) { const p = g.player.pos; let n = 0; for (const e of g.enemies) if (!e.dead && !e.hidden && e.alerted && Math.abs(e.pos.x - p.x) < r && Math.abs(e.pos.z - p.z) < r) n++; return n; }
export class Tutorial {
  constructor(game) {
    this.g = game; try { this.done = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { this.done = new Set(); }
    this.el = document.createElement('div'); this.el.id = 'hint'; this.el.className = 'hidden';
    this.el.innerHTML = '<span class="ht"></span><button class="hx" aria-label="Dismiss">✕</button>';
    game.ui.root.appendChild(this.el);
    this.el.querySelector('.hx').onclick = () => this.finish(this.cur?.id);
    this.moved = 0; this.last = null;
    const prevHit = game.onHit; game.onHit = (...a) => { prevHit?.(...a); this.finish('attack'); };
    const prevEv = game.onEvade; game.onEvade = (...a) => { prevEv?.(...a); if (this.glints >= 3) this.finish('evade'); };
    const prevPot = game.onPotion; game.onPotion = (...a) => { prevPot?.(...a); this.finish('potion'); };
    // the parry lesson: at the first glints near Salim, time slows a little and the evade button pulses
    this.glints = 0;
    const tell = game.telegraphTell.bind(game);
    game.telegraphTell = (e) => {
      tell(e);
      if (!game.tutorialOn || this.done.has('evade') || this.glints >= 3 || game.cinematic || !e || e.pos.distanceTo(game.player.pos) > 6) return;
      this.glints++; game.slowMo = Math.max(game.slowMo || 0, 0.7);
      const st = STEPS.find((x) => x.id === 'evade'); this.cur = st; this.show(st);
      clearTimeout(this._gT); this._gT = setTimeout(() => { if (this.cur === st) { this.cur = null; this.el.classList.add('hidden'); this.pulse(null); } }, 2600);
    };
    const prevParry = game.onParry; game.onParry = (...a) => { prevParry?.(...a); if (!this.done.has('evade')) { this.finish('evade'); game.ui.toast(game.isTouch ? 'Parried! Your next blow is a sure critical.' : 'Parried! Your next blow is a sure critical.', 'quest'); } };
    const use = game.useSkill.bind(game); game.useSkill = (slot) => { const r = use(slot); if (['rmb', 's1', 's2', 's3'].includes(slot)) this.finish('skill'); return r; };
  }
  finish(id) { if (!id || this.done.has(id)) return; this.done.add(id); try { localStorage.setItem(KEY, JSON.stringify([...this.done])); } catch { /* */ } if (this.cur?.id === id) { this.cur = null; this.el.classList.add('hidden'); this.pulse(null); } }
  show(st) { this.el.querySelector('.ht').textContent = this.g.isTouch ? st.touch : st.pc; this.el.classList.remove('hidden'); this.pulse(st.btn); }
  pulse(cls) {
    document.querySelectorAll('#tskills .tut-pulse').forEach((b) => b.classList.remove('tut-pulse'));
    if (cls) document.querySelector('#tskills .' + cls)?.classList.add('tut-pulse');
  }
  update(dt) {
    const g = this.g;
    if (!g.tutorialOn || !g.started || g.cinematic || !g.briefed || g.interior && !this.cur || g.bossActive) { this.el.classList.add('hidden'); return; } // Round 25: no cards over a boss bar
    const p = g.player.pos; if (this.last) this.moved += Math.hypot(p.x - this.last.x, p.z - this.last.z); this.last = { x: p.x, z: p.z };
    if (this.moved > 8) this.finish('move');
    if (g.player.level >= 3) this.finish('level');
    if (!this.cur) {
      this.cur = STEPS.find((s) => !s.ctx && !this.done.has(s.id) && (!s.when || s.when(g)));
      if (this.cur && this.cur.when === undefined && STEPS.indexOf(this.cur) > 0 && !this.done.has(STEPS[STEPS.indexOf(this.cur) - 1].id) && !STEPS[STEPS.indexOf(this.cur) - 1].when) this.cur = null;
      if (this.cur) this.show(this.cur);
    }
  }
}
