import * as THREE from 'three';
import { IS_HAMRIN, IS_DOCKS, IS_EPILOGUE, HUB } from './region.js';
import { heightAt, SITES } from './terrain.js';
import { S25, chosen } from './story25.js';
import * as SCENES from './scenes.js';
import { saveGame } from './save.js';
import { freeSpot } from './sidequests.js';
import { t } from './i18n.js';

// Round 29: the epilogue. Once Tatzates has fallen, Salim can ride home from the Hamrin camp (or start it from the
// quays). The river quays load at dusk with no fighting: Yusuf, Bishr and 'Amr each tell how their road ends (their
// words follow the camp stories and Salim's choices), then Ishaq on the quay, the last lamp, the card, and the
// victory screen with New Game+. State: p.s25.said.ep29_<who> (cleared by New Game+, so it plays again).
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const MEN = [
  { key: 'yusuf', name: 'Yusuf' }, { key: 'bishr', name: 'Bishr' }, { key: 'amr', name: '\'Amr' },
];
function lines(g, key) {
  const camp = S25(g).camp || {}, done = (camp[key] || 0) >= 3, L = [];
  if (key === 'yusuf') {
    if (done) L.push(['Yusuf', 'I go down to Wasit on the next barge. Sulayk has a stall, a cough, and nobody to argue with about prices. That is a partnership.']);
    else L.push(['Yusuf', 'I will open my old stall in al-Karkh again. Somebody has to keep the prices honest, now that the roads are open.']);
    if (chosen(g, 'photeinos') === 'free') L.push(['Yusuf', 'A boatman from Wasit says a quiet Greek copies ledgers for the scribes there now. He never says where he learned his letters.']);
    if (chosen(g, 'marsh') === 'stay') L.push(['Yusuf', 'And the reed village sends me mats to sell. They always ask after you.']);
    L.push(['Salim', 'Then I will know where to find good dates, and bad prices.'], ['Yusuf', 'Ha! Go with a full purse, guard.']);
  } else if (key === 'bishr') {
    if (done) L.push(['Bishr', 'The soldier who paid me works my bellows now, one arm and all. Best striker I have had in twenty years.']);
    else L.push(['Bishr', 'I will light the forge in the Karkh lanes again. Iron forgets a war faster than men do.']);
    if (chosen(g, 'photeinos') === 'qadi') L.push(['Bishr', 'They read the Greek\'s testimony at the qadi\'s court. Half the market went to hear it. I went for the shouting.']);
    L.push(['Bishr', 'Bring me that blade of yours once a year. I want to see what the road does to my work.']);
  } else {
    if (done) L.push(['\'Amr', 'Nasim holds a line better than half the men I trained for al-Amin. I will make a teacher of him. Not a soldier.']);
    else L.push(['\'Amr', 'I will teach again. The river guard, the boys on the quays. Holding a line is a good thing to know, if you never have to.']);
    if (chosen(g, 'tatzates') === 'chains') L.push(['\'Amr', 'You brought the bowman back in chains. Good. Let a court do what a sword cannot.']);
    if (chosen(g, 'tatzates') === 'free') L.push(['\'Amr', 'You let the bowman go. I would not have. Maybe that is why they will remember you, and not me.']);
    L.push(['Salim', 'They will remember who taught the boys, \'Amr.']);
  }
  return L;
}

export function setupEpilogue29(g) {
  const p = g.player;
  const fallen = () => !!p.rival?.final;
  const said = () => S25(g).said;
  const start = () => { try { localStorage.setItem('sob.endgame', 'epilogue'); } catch { /* storage unavailable */ } saveGame(g); g.travel(); };
  // the way in: from the Hamrin camp's south gate, or beside Ishaq on the quays, once Tatzates has fallen
  if (IS_HAMRIN || (IS_DOCKS && !IS_EPILOGUE)) {
    const base = IS_HAMRIN ? [SITES.village.x - 4, SITES.village.z + 26] : [HUB.ishaq[0] + 5, HUB.ishaq[1] - 4];
    const [x, z] = freeSpot(base[0], base[1], 1.2);
    const it = { pos: V(x, heightAt(x, z), z), r: 2.8, get label() { return IS_HAMRIN ? 'Ride home to Baghdad' : 'Walk the quays at dusk'; }, act: () => start() };
    let on = false;
    const prev = g.tickExtra;
    g.tickExtra = (dt) => {
      prev?.(dt);
      const want = fallen() && !said().ep29_done;
      if (want !== on) { on = want; if (on) { g.interactables.push(it); g.pois?.push(it.poi = { x, z, icon: '☾', color: '#f0c070' }); } else { g.interactables = g.interactables.filter((i) => i !== it); if (it.poi) g.pois = g.pois.filter((q) => q !== it.poi); } }
    };
  }
  if (!IS_EPILOGUE) return;

  // ---------------- the quays at dusk: no fighting
  g.epilogue29 = true;
  const forAct = g.lighting?.forAct?.bind(g.lighting);
  if (g.lighting) g.lighting.forAct = () => g.lighting.set('dusk', 0);
  g.lighting?.set?.('dusk', 0);
  const clearFoes = () => { for (const e of g.enemies) if (!e.dead || e.rig.parent) { e.dead = true; e.removed = true; e.rig.visible = false; g.scene.remove(e.rig); } g.enemies = g.enemies.filter((e) => !e.removed); };
  if (g.__side?.ev) g.__side.ev.next = 1e12;
  let banner = false, ending = false;
  const goal = () => {
    const s = said(); const man = MEN.find((m) => !s['ep29_' + m.key]);
    if (man) { const n = g.npcs.find((x) => x.name === man.name); return n ? { pos: n.pos, text: t('Say farewell to') + ' ' + t(man.name) } : null; }
    if (!s.ep29_done) return { pos: g.npc.position, text: 'Find Ishaq on the quay' };
    return null;
  };
  const tr = g.trackTarget; g.trackTarget = () => goal() || tr?.();
  // the camp men: one farewell each, then they go back to their trade
  for (const m of MEN) {
    const n = g.npcs.find((x) => x.name === m.name); if (!n) continue;
    const prevTalk = n.talk;
    n.talk = () => {
      if (said()['ep29_' + m.key] || ending) return prevTalk?.();
      g.director.play(SCENES.conversation(g, n, lines(g, m.key).map(([who, text]) => ({ who, text })))).then(() => { said()['ep29_' + m.key] = true; saveGame(g); g.refreshTracker?.(); });
    };
  }
  // Ishaq: after the three, the last scene
  const ish = g.npcs.find((x) => x.name === 'Ishaq');
  if (ish) {
    const prevTalk = ish.talk;
    ish.talk = () => {
      const s = said();
      if (s.ep29_done || ending) return prevTalk?.();
      if (MEN.some((m) => !s['ep29_' + m.key])) { g.ui.toast(t('Say farewell to the camp first')); return; }
      ending = true;
      g.director.play(SCENES.quaysAtDusk(g)).then(() => {
        s.ep29_done = true; ending = false;
        try { localStorage.removeItem('sob.endgame'); } catch { /* storage unavailable */ } // a reload comes back to the quays as they are
        if (forAct) g.lighting.forAct = forAct;
        saveGame(g);
        const mins = Math.floor(g.t / 60), secs = Math.floor(g.t % 60);
        g.ui.victory({ level: p.level, gold: p.gold, kills: g.kills || 0, time: `${mins}m ${String(secs).padStart(2, '0')}s` });
      });
    };
  }
  const prev = g.tickExtra;
  g.tickExtra = (dt) => {
    prev?.(dt);
    if (!said().ep29_done) clearFoes();
    if (!banner && g.briefed && !g.cinematic) { banner = true; g.ui.banner(t('Baghdad, at dusk'), t('Say farewell to the camp, then find Ishaq on the quay'), 4200); }
  };
}
