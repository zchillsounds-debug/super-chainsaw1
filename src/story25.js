// Round 25: story state (the three choices) and the systems that carry the story between scenes:
// - what the choices change outside the scenes (Renown, a gift from the marsh, a map from Photeinos)
// - short spoken lines while playing ("barks"): Salim remembering Jabir as he reaches each region, the hired guard
//   reacting to fights, ambushes, champions and low health, and the hub people's lines changing act by act
// - Ishaq's confession, once the story leaves the Sawad
// - Leaves and Letters: twelve pieces of writing lying where the story happened (burned leaves of the Pages,
//   soldiers' letters, Arsaber's dispatches). Finding all twelve earns the Teacher's Inkwell.
import * as THREE from 'three';
import { SITES, heightAt, waterDepth } from './terrain.js';
import { resolve } from './collision.js';
import { REGION, HUB } from './region.js';
import { makeItem } from './items.js';
import { t } from './i18n.js';

export const S25 = (g) => (g.player.s25 ||= { ch: {}, leaves: {}, mem: {}, said: {} });
export function choose(g, k, v) { S25(g).ch[k] = v; g.onChoice25?.(k, v); }
export function chosen(g, k) { return g.player?.s25?.ch?.[k]; }

// ---------------------------------------------------------------- the writing lying about
// kind: leaf (of the Pages) · letter (a soldier's) · dispatch (Arsaber's). at: the site and an offset from it.
export const LEAVES = {
  sawad: [
    { id: 's1', kind: 'leaf', at: ['serai', 9, 7], text: 'A burned leaf of the Pages. One line survives: "A man who will not share water with his enemy has already lost the argument."' },
    { id: 's2', kind: 'letter', at: ['kiln', -10, 8], text: 'A letter, never sent: "Mother, this country is flat and hot and the bread is good. The officers say we go home by spring. Tell Eirene I have not forgotten her. Doukitzes."' },
    { id: 's3', kind: 'dispatch', at: ['arch', 12, 10], text: 'Arsaber to the Logothete: "The brothers\' war serves us. No one guards the roads. They say the Teacher\'s Pages are worth more than all the astronomer\'s brass. I will see for myself."' },
  ],
  marsh: [
    { id: 'm1', kind: 'leaf', at: ['serai', 8, -8], text: 'A water-stained leaf of the Pages: "Write down what you saw before you write down what you think."' },
    { id: 'm2', kind: 'letter', at: ['kiln', -9, -7], text: 'A marine\'s note, pushed into a tally stick: "Three days in the reeds. Kallinikos says the fire on the water frightens them more than it hurts them. It frightens me."' },
    { id: 'm3', kind: 'dispatch', at: ['arch', -12, 9], text: 'Arsaber to the Logothete: "Kallinikos burns too freely. I told him we came for books, not for a burned country. He laughed at me."' },
  ],
  karkh: [
    { id: 'k1', kind: 'leaf', at: ['serai', -8, 9], text: 'A scorched leaf of the Pages: "A city is its copyists. Burn the copyists and you have only walls."' },
    { id: 'k2', kind: 'letter', at: ['kiln', 9, -9], text: 'A dice score scratched on a board, and under it: "Krateros says if it comes to it we burn everything. Then what did we march all this way for?"' },
    { id: 'k3', kind: 'dispatch', at: ['arch', 10, 11], text: 'Arsaber, unsent: "I walked the paper-sellers\' lane today. Ash to the ankle. If my own city burned like this, I would want someone to carry its books away. Perhaps that is all I am doing."' },
  ],
  docks: [
    { id: 'd1', kind: 'leaf', at: ['serai', 9, 8], text: 'A leaf of the Pages, folded small: "Teach the one who will forget you. The lesson stays."' },
    { id: 'd2', kind: 'letter', at: ['kiln', -9, 9], text: 'A ship\'s manifest: "Cedar chest, one. Brass instruments, eleven. Copyists, none." In another hand: "The envoy asked for copyists. Not one would come."' },
    { id: 'd3', kind: 'dispatch', at: ['arch', -11, -9], text: 'Arsaber\'s last dispatch, never sent: "The guard who hunts us does not want gold. I have nothing else to offer a man like that."' },
  ],
}[REGION] || [];
const KIND_NAME = { leaf: 'A leaf of the Pages', letter: 'A soldier\'s letter', dispatch: 'Arsaber\'s dispatch' };
export const LEAVES_TOTAL = 12;

// ---------------------------------------------------------------- lines spoken while playing
// Salim, as each region opens: Jabir, a little at a time (the grief is said once and briefly)
const ENTER = {
  sawad: 'Two more days to Baghdad, he said. Two more days.',
  marsh: 'Jabir hated boats. He said water keeps no promises.',
  karkh: 'He wanted to see the paper-sellers\' lane. He said I should learn to read.',
  docks: 'Jabir would have counted every barge on this river, and argued the tolls.',
  hamrin: 'Tatzates is up here somewhere. The one who loosed the arrow.',
};
// the hired guard, by context (two lines each, picked in turn)
const GUARD = {
  spear: {
    fight: ['That is the last of them. Breathe.', 'Shield up next time. You took one on the arm.'],
    ambush: ['Ambush! Back to back!', 'They were waiting for us. Close up!'],
    champion: ['A big one. I\'ll keep his men off you.', 'That one wants you, not me. Good.'],
    hurt: ['You are bleeding badly. Drink!', 'Fall back to me!'],
    boss: ['That is their captain. Watch his shoulders before he swings.', 'When he staggers, go in. Not before.'],
  },
  bow: {
    fight: ['Clear. I count no more.', 'Quiet again. I don\'t trust it.'],
    ambush: ['In the cover, there! I\'ll take the far ones.', 'Archers on the flank. Mine.'],
    champion: ['He is armoured. I\'ll aim for the joints.', 'Keep him busy. I have a clear line.'],
    hurt: ['Get out of there! Drink!', 'You are hit. Back off, I\'ll cover you.'],
    boss: ['Their captain. Make him turn, I\'ll find his back.', 'He leaves himself open after the big swing.'],
  },
  naft: {
    fight: ['Done. Mind the embers.', 'Smoke clears, and so do they.'],
    ambush: ['Down! Let me throw first!', 'Keep them bunched. Bunched burns.'],
    champion: ['Pull him onto the fire, guard.', 'Big men burn the same.'],
    hurt: ['Drink, guard! Now!', 'You are no good to me dead. Drink.'],
    boss: ['That one has fire of his own. Keep moving.', 'Watch the ground. Where it\'s marked, don\'t stand.'],
  },
  knives: {
    fight: ['Over. They never saw me.', 'Clean work. Mostly yours.'],
    ambush: ['Hah. They think they ambush us.', 'I\'ll go round. Keep their eyes on you.'],
    champion: ['Make him angry. I like them angry.', 'I\'ll find his back. You find his front.'],
    hurt: ['Drink, brother. Quickly.', 'Out of the press! Drink!'],
    boss: ['Their master. Every master has a slow hand.', 'Parry him once and he is ours.'],
  },
};
// the hub people, act by act (said once per act when Salim walks by)
const HUBLINE = {
  merchant: { sawad: 'Prices are up. Everything is up. The war, you understand.', marsh: 'Fish, reed mats and rumours. The rumours are cheapest.', karkh: 'I sold paper on this lane once. Now I sell what did not burn.', docks: 'Every barge that leaves takes my best customers with it.' },
  smith: { sawad: 'Bring me iron and I will make it worth something.', marsh: 'The damp gets into everything here. Oil your blade, guard.', karkh: 'The fire tempered half the iron in this quarter. Badly.', docks: 'Ships\' nails. Good iron, if you can pry it out.' },
  trainer: { sawad: 'You fight like your brother. Too straight. Learn to step aside.', marsh: 'Mud is a teacher. Lift your feet.', karkh: 'In the lanes, watch the roofs, not the street.', docks: 'On the jetties, keep your back off the water.' },
};
const HUBWHO = { merchant: 'Yusuf', smith: 'Bishr', trainer: '\'Amr' };

export function setupStory25(g) {
  const tmp = new THREE.Vector3();
  // ---------------------------------------------------------------- bark box
  const box = document.createElement('div'); box.id = 'bark25'; box.innerHTML = '<b></b><span></span>';
  document.getElementById('ui').appendChild(box);
  let barkT = 0, barkCd = 0;
  g.bark = (who, text, ms = 4200, force = false) => {
    if (!force && (barkCd > 0 || g.cinematic)) return false;
    box.querySelector('b').textContent = t(who); box.querySelector('span').textContent = t(text);
    // Round 26: a context prompt sits where the bark would be on a phone: then the bark goes under the tracker
    const pr = document.getElementById('prompt'); box.classList.toggle('top', !!pr && !pr.classList.contains('hidden') && document.body.classList.contains('touch'));
    box.classList.add('show'); barkT = ms / 1000 + text.length / 40; barkCd = barkT + 4; return true;
  };
  const guardSay = (ctx) => {
    const C = g.companion; if (!C || C.down) return false;
    const L = GUARD[C.kind]?.[ctx]; if (!L) return false;
    const s = S25(g); const i = (s.said['g_' + ctx] = ((s.said['g_' + ctx] ?? -1) + 1) % L.length);
    return g.bark(C.K.name, L[i]);
  };
  g.guardSay = guardSay;

  // ---------------------------------------------------------------- choices: what they change outside the scenes
  g.onChoice25 = (k, v) => {
    const p = g.player;
    if (k === 'photeinos' && v === 'qadi') { p.renown = (p.renown || 0) + 15; setTimeout(() => g.ui.toast(t('The qadi\'s men will take Photeinos to Baghdad.') + ' (+15 ' + t('Renown') + ')', 'quest'), 4000); }
    if (k === 'marsh' && v === 'chase') p.renown = (p.renown || 0) + 10;
  };
  const later = () => {
    const s = S25(g), p = g.player, lv = Math.max(1, p.level);
    // the marsh-folk's thanks find Salim in al-Karkh
    if (REGION === 'karkh' && s.ch.marsh === 'stay' && !s.said.marshGift) {
      s.said.marshGift = true;
      try { const it = makeItem(lv, 'legendary'); it.flavor = '"' + t('From the reed village, for the night you stayed.') + '"'; g.dropItem(it, tmp.copy(p.pos).add(new THREE.Vector3(1.2, 0, 0.6))); } catch (e) { /* none */ }
      g.ui.toast(t('A boatman from the Nahrawan brought a gift: the reed village remembers the night you stayed.'), 'quest');
    }
    // Photeinos, let go, repays it on the quays
    if (REGION === 'docks' && s.ch.photeinos === 'free' && !s.said.mapP) {
      s.said.mapP = true;
      g.dropItem({ gold: Math.round(60 * lv), rarity: 'common' }, tmp.copy(p.pos).add(new THREE.Vector3(-1, 0, 1)));
      try { g.dropItem(makeItem(lv, 'rare'), tmp.copy(p.pos).add(new THREE.Vector3(1, 0, 1))); } catch (e) { /* none */ }
      g.ui.toast(t('Someone left a purse at the khan for you, with a note signed only "P.": "One page was enough."'), 'quest');
    }
  };

  // ---------------------------------------------------------------- Ishaq's confession (first talk outside the Sawad)
  const baseTalk = g.talkToNpc.bind(g);
  g.talkToNpc = () => {
    const s = S25(g);
    if (REGION === 'sawad' || REGION === 'hamrin' || s.said.ishaq) return baseTalk();
    s.said.ishaq = true;
    const L = [
      'Salim. Before we go on, there is something I owe you.',
      'I put the chest in your caravan because no one searches a caravan guard\'s mules. I chose your brother\'s road for the Pages.',
      'I did not know about the envoy. But I chose, and Jabir paid for it.',
    ];
    let i = 0;
    const next = () => {
      if (i < L.length) { g.ui.dialog('Ishaq', L[i++], next); return; }
      g.converse25?.({
        start: { who: 'Ishaq', text: 'Say what you need to say.', choices: [
          { label: 'You should have told us.', to: 'told' },
          { label: 'He would have carried it anyway. That was Jabir.', to: 'anyway' }] },
        told: { who: 'Ishaq', text: 'Yes. I should have. I will carry that with the rest of the account.', choices: [{ label: 'Then we carry it together.' }] },
        anyway: { who: 'Ishaq', text: 'Perhaps. It is kind of you to say it. It does not make it lighter.', choices: [{ label: 'It is not meant to.' }] },
      }).then(() => { s.ch.ishaq = 'heard'; });
    };
    next();
    if (g.npcMark) g.npcMark.visible = false;
  };

  // ---------------------------------------------------------------- Leaves and Letters
  const items = [];
  const paperM = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9, emissive: 0x403020, emissiveIntensity: 0.6 });
  const sealM = new THREE.MeshStandardMaterial({ color: 0x7a1a12, roughness: 0.6 });
  for (const L of LEAVES) {
    const S = SITES[L.at[0]]; if (!S) continue;
    const pos = new THREE.Vector3(S.x + L.at[1], 0, S.z + L.at[2]);
    for (let k = 0; k < 8 && waterDepth?.(pos.x, pos.z) > 0.25; k++) pos.lerp(new THREE.Vector3(S.x, 0, S.z), 0.25);
    resolve(pos, 0.5); pos.y = heightAt(pos.x, pos.z);
    const grp = new THREE.Group();
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.26), paperM); sheet.position.y = 0.05; sheet.rotation.y = 0.4; grp.add(sheet);
    if (L.kind !== 'leaf') { const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 10), sealM); seal.position.set(0.04, 0.07, 0.02); grp.add(seal); }
    grp.position.copy(pos); g.scene.add(grp);
    items.push({ L, grp, pos, sparkT: Math.random() });
  }
  const showLeaf = (L) => {
    const s = S25(g); s.leaves[L.id] = true;
    const n = Object.keys(s.leaves).length;
    g.audio.pickup?.();
    g.ui.dialog(t(KIND_NAME[L.kind]) + ` · ${n}/${LEAVES_TOTAL}`, L.text, () => {
      g.ui.toast(`${t('Leaves and Letters')}: ${n}/${LEAVES_TOTAL}`, 'codex');
      if (n >= LEAVES_TOTAL && !s.said.inkwell) {
        s.said.inkwell = true;
        try { const it = makeItem(Math.max(1, g.player.level), 'legendary', 'amulet'); it.name = 'The Teacher\'s Inkwell'; it.flavor = '"' + t('Every word you found, kept.') + '"'; g.dropItem(it, g.player.pos.clone().add(new THREE.Vector3(1, 0, 0.5))); } catch (e) { /* none */ }
        g.ui.toast(t('All twelve found. The Teacher\'s Inkwell is yours.'), 'quest');
      }
    });
  };

  // ---------------------------------------------------------------- per-frame
  let hurtCd = 0, lastHp = 1, enterT = 0, fightWas = false;
  const prevTick = g.tickExtra;
  g.tickExtra = (dt) => {
    prevTick?.(dt);
    if (barkT > 0 && (barkT -= dt) <= 0) box.classList.remove('show');
    if (g.cinematic || g.ui.dialogOpen) box.classList.remove('show');
    barkCd -= dt; hurtCd -= dt;
    if (!g.started || g.cinematic) return;
    const s = S25(g), p = g.player;
    // Salim remembers, once per region, a few seconds into play
    if (!s.said['enter_' + REGION] && ENTER[REGION] && !g.interior && !fightWas && (enterT += dt) > 6 && !g.ui.dialogOpen) {
      if (g.bark('Salim', ENTER[REGION], 5000)) s.said['enter_' + REGION] = true;
    }
    later();
    // the hired guard: low health, the end of a fight, a boss in sight
    const hp = p.hp / (p.stats?.maxHp || 1);
    if (hp < 0.3 && lastHp >= 0.3 && hurtCd <= 0 && !p.dead) { if (guardSay('hurt')) hurtCd = 45; }
    lastHp = hp;
    let fight = false; for (const e of g.enemies) if (!e.dead && e.alerted && Math.abs(e.pos.x - p.pos.x) < 18 && Math.abs(e.pos.z - p.pos.z) < 18) { fight = true; break; }
    if (fightWas && !fight && !p.dead && Math.random() < 0.5) guardSay('fight');
    fightWas = fight;
    if (g.bossActive && !s.said['boss_' + REGION] && g.boss && !g.boss.dead && g.boss.rise >= 1) { if (guardSay('boss')) s.said['boss_' + REGION] = true; }
    // hub people, once per act each
    if (!g.interior && HUB) for (const k of ['merchant', 'smith', 'trainer']) {
      const at = HUB[k], line = HUBLINE[k][REGION]; if (!at || !line) continue;
      const key = 'hub_' + k + '_' + REGION + '_' + (g.act || 0);
      if (!s.said[key] && Math.hypot(p.pos.x - at[0], p.pos.z - at[1]) < 4.2 && g.bark(HUBWHO[k], line)) s.said[key] = true;
    }
    // leaves and letters: a faint glint, picked up by walking over them
    for (const it of items) {
      if (s.leaves[it.L.id]) { if (it.grp.visible) it.grp.visible = false; continue; }
      const d = Math.hypot(p.pos.x - it.pos.x, p.pos.z - it.pos.z);
      if (d < 26 && (it.sparkT -= dt) <= 0) { it.sparkT = 0.7; g.fx.glow.spawn({ pos: { x: it.pos.x, y: it.pos.y + 0.35, z: it.pos.z }, life: 0.6, size: 0.45, size1: 0.1, color: new THREE.Color(2.4, 2.0, 1.2) }); }
      if (d < 1.5 && !g.ui.dialogOpen && !p.dead && !fightWas) showLeaf(it.L); // never mid-fight: it waits on the ground
    }
  };
  // a memory of Jabir by the first hold fire in each region (holds.js puts it at the top of the rest panel)
  const MEM = {
    sawad: 'By the fire, Salim remembers Jabir teaching him to hold a spear: "Not like a stick, little brother. Like a promise."',
    marsh: 'By the fire, Salim remembers the year the river flooded, and Jabir wading through it with their mother\'s loom on his back.',
    karkh: 'By the fire, Salim remembers Jabir counting out coins for a book neither of them could read. "For when you learn."',
    docks: 'By the fire, Salim remembers the night before the caravan left. Jabir, laughing: "Two more days to Baghdad, and then we rest."',
    hamrin: 'By the fire, Salim tries to remember Jabir\'s voice, and for a moment cannot. Then it comes back.',
  };
  g.memory25 = () => { const s = S25(g); if (s.mem[REGION] || !MEM[REGION]) return null; s.mem[REGION] = true; return t(MEM[REGION]); };
  // ambushes and champions speak through the guard too
  g.enc25Say = (ctx) => guardSay(ctx);
}
