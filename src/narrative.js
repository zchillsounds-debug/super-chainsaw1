import * as SCENES from './scenes.js';
import { makeItem } from './items.js';
import { saveGame } from './save.js';
import { t } from './i18n.js';

// Dialogue with choices, side quests, the journal and a codex of (secular) Abbasid history.

// ------------------------------------------------------------------ codex
// Short, factual entries. Unlocked by places, people and finds.
export const CODEX = {
  siege: { t: 'The Siege of Baghdad, 812–813', cat: 'History', x: 'After Harun al-Rashid died in 809, his sons al-Amin (in Baghdad) and al-Ma\'mun (in Khurasan) fought for the caliphate. Al-Ma\'mun\'s general Tahir ibn al-Husayn besieged Baghdad from August 812. The fighting wrecked whole quarters of the city. It ended in September 813 with al-Amin\'s death. Soldiers of both sides were left loose in the countryside.' },
  round: { t: 'The Round City', cat: 'Places', x: 'Madinat al-Salam, the "City of Peace", was founded by the caliph al-Mansur in 762 on the west bank of the Tigris. Its plan was a perfect circle about two kilometres across, with double walls, a moat and four gates: the Kufa, Basra, Khurasan and Syria gates. Markets were later moved out to the suburb of al-Karkh. Much of the siege\'s damage fell on these outer quarters.' },
  wisdom: { t: 'The House of Wisdom', cat: 'Learning', x: 'Bayt al-Hikma began as a palace library under Harun al-Rashid. After al-Ma\'mun entered Baghdad in 819 it grew into a centre for translating Greek, Persian and Indian works on astronomy, mathematics, medicine and philosophy into Arabic. Scholars such as al-Khwarizmi worked in this circle, and in the 820s and 830s his astronomers made observations to check the tables of Ptolemy.' },
  astrolabe: { t: 'The Astrolabe', cat: 'Learning', x: 'A brass instrument that models the sky on a flat plate. By sighting a star or the sun and turning the rete, an astronomer can find the time, latitude and the heights of stars. Abbasid makers refined the Greek design. Treatises on its use, such as the one attributed to Masha\'allah, were among the early scientific works written in Arabic.' },
  sawad: { t: 'The Sawad', cat: 'Places', x: '"The Black Land": the dark, irrigated plain of central and lower Iraq between the Tigris and Euphrates, so called for its green fields against the desert. Its canals, date palms and grain fed Baghdad. Its taxes were the treasury\'s backbone, so keeping its roads open mattered to whoever held the city.' },
  qanat: { t: 'Qanats', cat: 'Places', x: 'Underground channels that carry groundwater by gravity over many kilometres. They are marked on the surface by a line of access shafts. The technique came from Iran and spread across the Islamic world. Building and cleaning them took specialists who worked deep below ground by lamplight.' },
  naft: { t: 'Naft and the Naffatun', cat: 'War', x: 'Crude oil from seeps in Iraq and Persia was distilled into "white naft", a fierce incendiary. Specialist troops called naffatun threw it in clay pots or projected it from tubes. They wore protective clothing of felt and leather. Chroniclers record fire and mangonels wrecking whole streets in the siege of Baghdad.' },
  ayyarun: { t: 'The \'Ayyarun', cat: 'War', x: 'Bands of young men from Baghdad\'s poorer quarters. During the siege of 812–813 they fought for al-Amin, often nearly naked, with little armour, makeshift shields and stones. They were brave street fighters who knew every alley. Chroniclers describe them with a mix of scorn and admiration.' },
  khurasan: { t: 'The Khurasani Regiments', cat: 'War', x: 'Troops from Khurasan in the far east of the empire, the heartland of the Abbasid revolution of 750. Under Tahir they formed the core of al-Ma\'mun\'s army. They were known for mounted archery and disciplined infantry.' },
  kilns: { t: 'Baked Brick', cat: 'Craft', x: 'Mesopotamia has little stone and timber, so it has built in brick for thousands of years. Sun-dried mud brick served for ordinary walls. Kiln-fired brick, harder and costlier, faced palaces, bridges and the gates of the Round City. Kiln yards outside the city burned day and night.' },
  khan: { t: 'Caravanserais', cat: 'Places', x: 'Walled inns along the trade roads, built around a courtyard ringed with rooms, storerooms and stables. A single gate could be shut at night. Merchants, couriers and their animals rested in them, roughly a day\'s march apart.' },
  barid: { t: 'The Barid', cat: 'History', x: 'The caliphal post and intelligence service. Relays of horses and couriers carried official letters along the main roads. Its local masters also sent the capital reports on governors, prices and unrest.' },
  dinar: { t: 'Dinars and Dirhams', cat: 'Trade', x: 'The gold dinar (about 4.25 g) and the silver dirham were the coins of the caliphate. After the reform of the 690s they carried only inscriptions, with no images. Bills of exchange (suftaja) and cheques (sakk) let merchants move money without carrying coin across the empire.' },
  paper: { t: 'Paper in Baghdad', cat: 'Craft', x: 'Papermaking reached the Islamic world from Central Asia. Later writers credit the Barmakid al-Fadl ibn Yahya with founding a paper mill in Baghdad in the 790s. Cheaper than parchment or papyrus, paper fed the bureaucracy, the book markets of the city and, soon, the translators of the House of Wisdom.' },
  barmakids: { t: 'The Barmakids', cat: 'History', x: 'A family of Persian administrators from Balkh. As viziers under Harun al-Rashid they ran the empire\'s government and patronised scholars and poets. In 803 Harun abruptly had them arrested and their leader Ja\'far executed. The reasons are still debated.' },
};
export function unlock(game, id) {
  const p = game.player; p.codex ||= {};
  if (!CODEX[id] || p.codex[id]) return;
  p.codex[id] = true; game.ui.toast(`${t('Codex')}: <b>${t(CODEX[id].t)}</b>`, 'codex'); game.audio.pickup?.();
}

// ------------------------------------------------------------------ quests
export const SIDE = {
  astrolabe: { t: 'The Lost Astrolabe', giver: 'Ishaq', steps: ['Ishaq\'s finest astrolabe was taken with the caravan. Search the kiln tunnels beneath Hisham\'s yard.', 'You found the astrolabe. Bring it back to Ishaq.', 'Ishaq has his astrolabe again.'] },
  water: { t: 'Sweet Water', giver: 'Yusuf', steps: ['Renegades are fouling the qanat that feeds the suq. Clear a descent of the ruined qanats.', 'The galleries are quiet. Tell Yusuf.', 'The water runs clean, and the suq owes you.'] },
  captains: { t: '\'Amr\'s Wager', giver: '\'Amr', steps: ['\'Amr wagers you cannot defeat three captains of the renegades (elite foes) in the field.', 'Three captains have fallen. Collect your winnings from \'Amr.', 'You won the wager.'] },
};
export function questState(p, id) { return (p.side ||= {})[id] ?? -1; }
export function setQuest(game, id, step) {
  const p = game.player; (p.side ||= {})[id] = step;
  const Q = SIDE[id]; if (step === 0) game.ui.toast(`${t('New task')}: <b>${t(Q.t)}</b>`, 'quest'); else if (step === Q.steps.length - 1) game.ui.banner(t(Q.t), t('Task complete'), 2600); else game.ui.toast(`<b>${t(Q.t)}</b>: ${t(Q.steps[step])}`, 'quest');
  game.audio.pickup?.(); refreshTracker(game); saveGame(game);
}
function refreshTracker(game) {
  const p = game.player, side = Object.entries(p.side || {}).filter(([id, s]) => s < SIDE[id].steps.length - 1).map(([id, s]) => ({ text: `${t(SIDE[id].t)}: ${t(SIDE[id].steps[s]).split(/\. |\. /)[0]}`, done: false, side: true }));
  game.ui.quest([...game.quests, ...side]);
}

// ------------------------------------------------------------------ dialogue with choices
// Uses the dialog panel; each node is { who, text, choices: [{ label, to?, fx? }] }.
export function converse(game, nodes, start = 'start') {
  const ui = game.ui, d = ui.root.querySelector('#dialog');
  return new Promise((res) => {
    const show = (id) => {
      const n = typeof nodes[id] === 'function' ? nodes[id]() : nodes[id];
      if (!n) { d.classList.add('hidden'); document.body.classList.remove('indialog'); d.querySelector('.dchoices')?.remove(); res(); return; }
      d.classList.remove('hidden'); document.body.classList.add('indialog');
      d.querySelector('.dname').textContent = t(n.who); d.querySelector('.dtext').innerHTML = t(n.text);
      d.querySelector('.dbtn').style.display = 'none';
      d.querySelector('.dchoices')?.remove();
      const box = document.createElement('div'); box.className = 'dchoices';
      const ch = n.choices || [{ label: 'Farewell' }];
      ch.forEach((c, i) => { const b = document.createElement('button'); b.className = 'dchoice'; b.innerHTML = `<span>${i + 1}.</span> ${t(c.label)}`; b.onclick = () => { c.fx?.(); show(c.to); }; box.appendChild(b); });
      d.appendChild(box);
      const key = (e) => { const k = +e.key; if (k >= 1 && k <= ch.length) { removeEventListener('keydown', key); box.children[k - 1].click(); } };
      addEventListener('keydown', key);
      box.addEventListener('click', () => removeEventListener('keydown', key), { once: true });
    };
    show(start);
  }).then(() => { d.querySelector('.dbtn').style.display = ''; });
}

// ------------------------------------------------------------------ the people of the suq
export function setupNarrative(game) {
  const p = game.player; p.codex ||= {}; p.side ||= {};
  const npc = (name) => game.npcs.find((n) => n.name === name);
  const play = (n, lines) => game.director ? game.director.play(SCENES.conversation(game, n, lines)) : Promise.resolve();
  // Ishaq: topics and the astrolabe
  const ishaq = npc('Ishaq'), ishaqTalk = ishaq.talk;
  ishaq.talk = () => {
    if (!game.briefed) { game.briefed = true; return ishaqTalk(); }
    const s = questState(p, 'astrolabe');
    converse(game, {
      start: { who: 'Ishaq', text: s === 1 ? 'Salim! Is that... the brass glints in your pack!' : 'The stars do not hurry, Salim, but Ghassan does. What do you need?',
        choices: [
          ...(s === 1 ? [{ label: 'Your astrolabe, teacher. Recovered from the kiln tunnels.', to: null, fx: () => returnAstrolabe() }] : []),
          ...(s === -1 ? [{ label: 'You seem troubled. What did the raiders take?', to: 'lost' }] : []),
          { label: 'Tell me about the House of Wisdom.', to: 'wisdom', fx: () => unlock(game, 'wisdom') },
          { label: 'How did the siege come to this?', to: 'siege', fx: () => unlock(game, 'siege') },
          { label: 'Who were the men fighting in the streets?', to: 'ayyar', fx: () => unlock(game, 'ayyarun') },
          { label: 'Farewell.' },
        ] },
      lost: { who: 'Ishaq', text: 'My best astrolabe, with a rete cut like lace. I made it myself over three winters. The raiders will have dragged it to their tunnels under the kilns. Hisham\'s men hoard brass to melt.', choices: [{ label: 'I will find it.', fx: () => { setQuest(game, 'astrolabe', 0); unlock(game, 'astrolabe'); } }, { label: 'Another time, teacher.' }] },
      wisdom: { who: 'Ishaq', text: 'A library that became a workshop. We copy, we translate Ptolemy and the Indian tables, and we argue about them. The caliph pays for paper; we pay with sleep.', choices: [{ label: 'Back.', to: 'start', fx: () => unlock(game, 'paper') }] },
      siege: { who: 'Ishaq', text: 'Two brothers, one throne. Tahir\'s Khurasanis came from the east. The city was burned street by street. Now al-Amin is dead, and men who learned to loot do not unlearn it.', choices: [{ label: 'Back.', to: 'start', fx: () => unlock(game, 'khurasan') }] },
      ayyar: { who: 'Ishaq', text: 'The \'ayyarun: boys from the poor quarters with reed shields and slings, holding alleys against armoured men. Some of them are on the roads now too. Not all of them are Ghassan\'s.', choices: [{ label: 'Back.', to: 'start' }] },
    });
  };
  const returnAstrolabe = async () => {
    const bi = p.bag.findIndex((it) => it?.questId === 'astrolabe'); if (bi >= 0) p.bag[bi] = null;
    await play(ishaq, [
      { who: 'Salim', text: 'It was in a chest, among Hisham\'s brass. Not a scratch.' },
      { who: 'Ishaq', text: 'Three winters... and the rete is whole. Look, the star-pointers still sit true. You have saved more than brass, Salim.', act: 'cast' },
      { who: 'Ishaq', text: 'I have little coin. But take this: a sky-chart I drew of the Sawad. With it, no road at night will lose you.' },
    ]);
    converse(game, { start: { who: 'Ishaq', text: 'Or, if you would rather, I can pay you in dinars from the House\'s purse.', choices: [
      { label: 'The chart. I would rather know the stars.', fx: () => { const it = makeItem(p.level + 1, 'rare', 'amulet'); it.name = 'Ishaq\'s Sky-Chart'; it.stats.crit = (it.stats.crit || 0) + 6; it.flavor = '"The heavens turn; so do the roads."'; giveItem(game, it); } },
      { label: 'Dinars, teacher. The road is expensive.', fx: () => { p.gold += 150 + p.level * 20; game.audio.gold(); } },
    ] } }).then(() => setQuest(game, 'astrolabe', 2));
  };
  // Yusuf: sweet water
  const yusuf = npc('Yusuf'), yTalk = yusuf.talk;
  yusuf.talk = () => {
    const s = questState(p, 'water');
    if (s === 1) return play(yusuf, [{ who: 'Salim', text: 'The galleries are quiet. Whoever was fouling the channel will not be back.' }, { who: 'Yusuf', text: 'Then the cisterns will fill sweet by the end of the week. The suq does not forget: from today my prices are yours at a discount.' }]).then(() => { p.discount = 0.15; p.gold += 80; setQuest(game, 'water', 2); unlock(game, 'qanat'); });
    converse(game, { start: { who: 'Yusuf', text: s === -1 ? 'Peace on your road, guard. Buying, selling... or listening? There is trouble in the water.' : 'Spices from Basra, steel from the Yemen, silk thread from Merv. What will it be?', choices: [
      { label: 'Show me your wares.', fx: () => setTimeout(yTalk, 0) },
      ...(s === -1 ? [{ label: 'Trouble in the water?', to: 'water' }] : []),
      { label: 'How does a merchant pay, out here?', to: 'coin', fx: () => unlock(game, 'dinar') },
      { label: 'Farewell.' },
    ] },
    water: { who: 'Yusuf', text: 'The qanat under the well feeds this whole suq. Renegades camp in its galleries, and the water comes up foul. Clear them out, and I will remember it.', choices: [{ label: 'I will go down.', fx: () => setQuest(game, 'water', 0) }, { label: 'Not now.' }] },
    coin: { who: 'Yusuf', text: 'Gold dinars for the great deals, silver dirhams for bread. And for long roads, a suftaja: a letter my cousin in Basra will honour. Paper weighs less than gold, and bandits cannot spend it.', choices: [{ label: 'Back.', to: 'start' }] },
    });
  };
  // 'Amr: the wager
  const amr = npc('\'Amr'), aTalk = amr.talk;
  amr.talk = () => {
    const s = questState(p, 'captains');
    if (s === 1) return play(amr, [{ who: '\'Amr', text: 'Three captains! I watched you from the walls, and I have lost good silver. Here. And take my old bayda. It turned a Khurasani lance once.' }]).then(() => { p.gold += 200; const it = makeItem(p.level + 1, 'rare', 'helm'); it.name = '\'Amr\'s Dented Bayda'; giveItem(game, it); setQuest(game, 'captains', 2); });
    converse(game, { start: { who: '\'Amr', text: 'A soldier rests his arm between fights, not his mind. Train, change your way, or make a wager?', choices: [
      { label: 'Training.', fx: () => setTimeout(aTalk, 0) },
      ...(s === -1 ? [{ label: 'What wager?', to: 'wager' }] : []),
      { label: 'You fought in the siege?', to: 'siege', fx: () => unlock(game, 'khurasan') },
      { label: 'Farewell.' },
    ] },
    wager: { who: '\'Amr', text: 'Ghassan\'s captains ride with a golden ring of men around them. Kill three of them in the field, and my purse is yours.', choices: [{ label: 'Done.', fx: () => { setQuest(game, 'captains', 0); game.captainKills = 0; } }, { label: 'Not today.' }] },
    siege: { who: '\'Amr', text: 'On Tahir\'s side. Khurasani archers, mangonels, naft... and still the \'ayyarun held the Harbiyya for weeks. I do not boast about that year.', choices: [{ label: 'Back.', to: 'start', fx: () => unlock(game, 'naft') }] },
    });
  };
  // progress hooks
  const prevKill = game.onKill;
  game.onKill = (e) => {
    prevKill?.(e);
    if (e.elite && !e.interior && questState(p, 'captains') === 0 && (game.captainKills = (game.captainKills || 0) + 1) >= 3) setQuest(game, 'captains', 1);
  };
  // the astrolabe sits in the kiln tunnels' chest while the task is open
  const zones = game.zones, openChest = zones.openChest.bind(zones);
  zones.openChest = () => {
    const kind = game.interior?.def.kind; openChest();
    if (kind === 'kiln' && questState(p, 'astrolabe') === 0) { giveItem(game, { id: 9001, slot: 'amulet', rarity: 'legendary', name: 'Ishaq\'s Astrolabe', base: 'Quest item', level: 1, stats: {}, questId: 'astrolabe', flavor: '"Bring it home."' }); setQuest(game, 'astrolabe', 1); }
    if (kind === 'qanat' && questState(p, 'water') === 0) setQuest(game, 'water', 1);
  };
  // places teach history as you reach them
  game.discoverT = 0;
  game.discover = (dt) => {
    if ((game.discoverT -= dt) > 0) return; game.discoverT = 1;
    const P = p.pos; const near = (s, r) => Math.hypot(P.x - s.x, P.z - s.z) < r;
    if (game.interior) { unlock(game, game.interior.def.kind === 'qanat' ? 'qanat' : 'kilns'); return; }
    if (near({ x: 56, z: 0 }, 26)) unlock(game, 'khan');
    if (near({ x: -56, z: -36 }, 26)) unlock(game, 'kilns');
    if (near({ x: 10, z: -88 }, 32)) unlock(game, 'barmakids');
    if (game.t > 30) unlock(game, 'sawad');
    if (P.z < -60) unlock(game, 'round');
  };
  refreshTracker(game);
  game.refreshTracker = () => refreshTracker(game);
}
export function giveItem(game, it) {
  const p = game.player, k = p.bag.indexOf(null);
  if (k < 0) { game.dropItem(it, p.pos); return; }
  p.bag[k] = it; game.ui.toast(`Received <b>${it.name}</b>`); game.audio.legendary?.(); game.refreshInv();
}

// ------------------------------------------------------------------ journal and codex panel
export function journalPanel(game, tab = 'journal') {
  const p = game.player; game.ui.root.querySelector('#journal')?.remove();
  document.body.classList.add('inshop');
  const w = document.createElement('div'); w.id = 'journal'; w.className = 'panel';
  const main = game.quests.map((q) => `<div class="jq ${q.done ? 'done' : ''}"><b>${q.done ? '✓' : '◇'} ${q.text}</b></div>`).join('');
  const side = Object.entries(SIDE).map(([id, Q]) => { const s = questState(p, id); if (s < 0) return ''; const done = s >= Q.steps.length - 1; return `<div class="jq ${done ? 'done' : ''}"><b>${done ? '✓' : '◇'} ${t(Q.t)}</b> <small>(${t(Q.giver)})</small><div>${t(Q.steps[s])}</div></div>`; }).join('') || '<div class="jq"><i>No tasks yet. The people of the suq may have work.</i></div>';
  const cats = {}; for (const [id, c] of Object.entries(CODEX)) (cats[c.cat] ||= []).push([id, c]);
  const known = Object.keys(p.codex || {}).length;
  const codex = Object.entries(cats).map(([cat, list]) => `<div class="ccat">${t(cat)}</div>` + list.map(([id, c]) => p.codex?.[id] ? `<details class="centry"><summary>${t(c.t)}</summary><p>${t(c.x)}</p></details>` : `<div class="centry locked">— undiscovered —</div>`).join('')).join('');
  const st = game.stats || {};
  w.innerHTML = `<div class="ptitle">${tab === 'journal' ? 'Journal' : 'Codex'} <span class="close">✕</span></div>
    <div class="stabs"><button data-t="journal" class="${tab === 'journal' ? 'on' : ''}">Journal</button><button data-t="codex" class="${tab === 'codex' ? 'on' : ''}">Codex (${known}/${Object.keys(CODEX).length})</button></div>
    <div class="jbody">${tab === 'journal' ? `<div class="slabel">The Renegade of the Sawad</div>${main}<div class="slabel">Tasks</div>${side}<div class="slabel">Deeds</div><div class="jq"><small>Foes slain ${game.kills || 0} · parries ${st.parries || 0} · qanats cleared ${st.qanats || 0} · gauntlets run ${st.rushes || 0}</small></div>` : codex}</div>`;
  game.ui.root.appendChild(w);
  const close = () => { w.remove(); document.body.classList.remove('inshop'); };
  w.querySelector('.close').onclick = close;
  w.querySelectorAll('.stabs button').forEach((b) => b.onclick = () => journalPanel(game, b.dataset.t));
  return close;
}
