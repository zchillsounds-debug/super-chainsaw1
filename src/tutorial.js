// First-run hints: one card at a time, each cleared by doing the thing it teaches. Remembered per device.
const KEY = 'sob.tutorial.v1';
const STEPS = [
  { id: 'move', pc: 'Click the ground to walk. Hold the button to keep moving.', touch: 'Drag on the left of the screen to walk.' },
  { id: 'attack', pc: 'Click a foe to attack. Your discipline sets the weapon.', touch: 'Tap the large button (or a foe) to attack.' },
  { id: 'evade', pc: 'Space to evade. Evade just as a blade glints and you will parry.', touch: 'The curved arrow evades. Evade just as a blade glints and you will parry.' },
  { id: 'skill', pc: 'Right-click and 1, 2, 3 use your skills. Each costs your resource.', touch: 'The ring of buttons holds your skills. Each costs your resource.' },
  { id: 'potion', pc: 'Wounded: press Q to drink pomegranate sherbet.', touch: 'Wounded: tap the red flask to drink sherbet.', when: (g) => g.player.hp < g.player.stats.maxHp * 0.5 },
  { id: 'suq', pc: 'The suq: talk (E) to Yusuf, Bishr and \'Amr. The well leads to the qanats.', touch: 'The suq: walk up to Yusuf, Bishr and \'Amr and tap the prompt. The well leads to the qanats.', when: (g) => Math.hypot(g.player.pos.x - 18, g.player.pos.z - 64) < 14 },
  { id: 'level', pc: 'A discipline point to spend: press K.', touch: 'A discipline point to spend: Menu ☰, then Disciplines.', when: (g) => g.player.level >= 2 },
];
export class Tutorial {
  constructor(game) {
    this.g = game; try { this.done = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { this.done = new Set(); }
    this.el = document.createElement('div'); this.el.id = 'hint'; this.el.className = 'hidden';
    this.el.innerHTML = '<span class="ht"></span><button class="hx" aria-label="Dismiss">✕</button>';
    game.ui.root.appendChild(this.el);
    this.el.querySelector('.hx').onclick = () => this.finish(this.cur?.id);
    this.moved = 0; this.last = null;
    const prevHit = game.onHit; game.onHit = (...a) => { prevHit?.(...a); this.finish('attack'); };
    const prevEv = game.onEvade; game.onEvade = (...a) => { prevEv?.(...a); this.finish('evade'); };
    const prevPot = game.onPotion; game.onPotion = (...a) => { prevPot?.(...a); this.finish('potion'); };
    const use = game.useSkill.bind(game); game.useSkill = (slot) => { const r = use(slot); if (['rmb', 's1', 's2', 's3'].includes(slot)) this.finish('skill'); return r; };
  }
  finish(id) { if (!id || this.done.has(id)) return; this.done.add(id); try { localStorage.setItem(KEY, JSON.stringify([...this.done])); } catch { /* */ } if (this.cur?.id === id) { this.cur = null; this.el.classList.add('hidden'); } }
  update(dt) {
    const g = this.g;
    if (!g.tutorialOn || !g.started || g.cinematic || !g.briefed || g.interior && !this.cur) { this.el.classList.add('hidden'); return; }
    const p = g.player.pos; if (this.last) this.moved += Math.hypot(p.x - this.last.x, p.z - this.last.z); this.last = { x: p.x, z: p.z };
    if (this.moved > 8) this.finish('move');
    if (g.player.level >= 3) this.finish('level');
    if (!this.cur) {
      this.cur = STEPS.find((s) => !this.done.has(s.id) && (!s.when || s.when(g)));
      if (this.cur && this.cur.when === undefined && STEPS.indexOf(this.cur) > 0 && !this.done.has(STEPS[STEPS.indexOf(this.cur) - 1].id) && !STEPS[STEPS.indexOf(this.cur) - 1].when) this.cur = null;
      if (this.cur) { this.el.querySelector('.ht').textContent = g.isTouch ? this.cur.touch : this.cur.pc; this.el.classList.remove('hidden'); }
    }
  }
}
