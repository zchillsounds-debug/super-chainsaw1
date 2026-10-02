// Controller support (standard mapping): left stick moves, face buttons and shoulders fire the kit.
// A attack (locks the nearest foe) · B evade · X right-click skill · Y / LB / RB skills 1–3 · RT sherbet
// Start settings · Back journal · D-pad up/down cycles dialogue choices, A picks · A also uses the context prompt.
export class Gamepads {
  constructor(game, hooks) { this.g = game; this.h = hooks; this.prev = []; this.active = false; addEventListener('gamepadconnected', () => { this.active = true; game.ui.toast('Controller connected'); }); }
  update() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []; const pad = [...pads].find((p) => p && p.connected);
    if (!pad) { if (this.wasJoy) { this.g.joy = null; this.wasJoy = false; } return; }
    const g = this.g, b = pad.buttons.map((x) => x.pressed), was = this.prev; this.prev = b;
    const down = (i) => b[i] && !was[i];
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0, mag = Math.hypot(ax, ay);
    const ui = document.querySelector('#dialog:not(.hidden)');
    if (ui) { // dialogue: d-pad selects, A confirms
      const ch = [...ui.querySelectorAll('.dchoice')]; this.sel = Math.max(0, Math.min(ch.length - 1, (this.sel || 0) + (down(13) ? 1 : 0) - (down(12) ? 1 : 0)));
      ch.forEach((c, i) => c.classList.toggle('pad', i === this.sel));
      if (down(0)) { if (ch.length) ch[this.sel]?.click(); else ui.querySelector('.dbtn')?.click(); this.sel = 0; }
      return;
    }
    if (g.cinematic) { if (down(0)) g.director?.advance(); if (down(9)) g.director?.skip(); return; }
    if (mag > 0.18) { g.joy = { x: ax, y: ay }; this.wasJoy = true; } else if (this.wasJoy) { g.joy = null; this.wasJoy = false; }
    if (down(9)) this.h.settings();
    if (down(8)) this.h.journal();
    if (document.body.classList.contains('inshop')) { if (down(1)) this.h.closeAll(); return; }
    if (down(0)) { if (g.zones?.cur) g.zones.cur.act(); else { const e = g.pickTarget(9); if (e) { g.player.target = e; g.player.moveTo = null; } } }
    if (b[0] && !down(0)) { const e = g.player.target || g.pickTarget(9); if (e) g.player.target = e; }
    const aim = () => g.aimAuto();
    if (down(1)) g.useSkill('dodge');
    if (down(2)) { aim(); g.useSkill('rmb'); }
    if (down(3)) { aim(); g.useSkill('s1'); }
    if (down(4)) { aim(); g.useSkill('s2'); }
    if (down(5)) { aim(); g.useSkill('s3'); }
    if (down(7)) g.useSkill('potion');
  }
}
