// Adventure story: the hero critter dreams of the Critter Crown, worn by the strongest critter
// of all. Professor Pecan sets the quest; a rival, Dash, keeps turning up to test the hero;
// the cup stadiums are the gyms. Every beat is keyed on save.adv.flags.
import { save, persist, grantXp, xpNeeded } from './save.js';
import { CUPS, ISLE_CUPS, CRITTERS, TYPES, withGear, skinned, cupById } from './data.js';
const skinnedShiny = (id) => skinned(CRITTERS.find((c) => c.id === id), 'shiny');
import { unlock } from './save.js';
import { sfx } from './audio.js';
import { grown } from './growth.js';
import { rivalFor, MAPS } from './worldmaps.js';
import { getMap } from './interiors.js';
import { SHOP_HATS } from './critters.js';
import { arcadeGame, skyHop } from './arcade.js';
import { canRain, rainAt, stormAt, LOST_SPOTS, derbyOf, isWinter, SEASON_FISH, seasonKey } from './world.js';

const flags = () => save.adv.flags;
const byId = (id) => CRITTERS.find((c) => c.id === id);

// opening narration, the first time the world loads
export function storyIntro(S, w) {
  const F = flags();
  // back from beating the day's Alpha: its Power Snack
  const due = save.adv.snackDue;
  if (due && F[due]) {
    delete save.adv.snackDue;
    const h = save.adv.hero, c = save.critters[h], r = grantXp(h, Math.round(xpNeeded(c.level) * 0.4)); persist();
    setTimeout(() => S.toast(r.to > r.from ? `⭐ Power Snack! {hero} grew to Lv ${r.to}!`.replace('{hero}', w.hero?.def?.name || '') : '⭐ The Alpha dropped a Power Snack! (+XP)'), 700);
  }
  // the first time you're back in a town after winning its cup, fireworks go up over the stadium
  const st = (getMap(w.key)?.buildings || []).find((b) => b.stadium);
  if (st && F['cup_' + st.stadium] && !F['fw_' + st.stadium]) { F['fw_' + st.stadium] = true; persist(); w.fireworks?.(st); }
  if (F.cup_sprout && !F.post_sprout && w.key === 'bloom') {
    F.post_sprout = true; persist();
    w.say([
      '{hero}: I did it... I really won the Sprout Cup!',
      'Dash: Hmph. Not bad, for a beginner.',
      "Dash: The next stadium is in Seashell Town, east along Route 2. But there's a HUGE critter asleep on the bridge. Nobody can wake it up.",
      "Dash: Every critter who wants the Crown has to pass the Trial of Strength. Let's see if you can even get across! Later!",
    ]);
    return;
  }
  if (F.cup_thunder && !F.post_thunder && w.key === 'seashell') {
    F.post_thunder = true; persist();
    w.say([
      '{hero}: Two cups! The crowd was chanting my name!',
      'Prof. Pecan (on the phone): {hero}! I watched the whole thing on the jumbotron. Marvellous!',
      'Prof. Pecan: Your next stop is the Glowcap Cup. Take the path north of town into the Glowcap Woods.',
      "Prof. Pecan: The woods are full of brambles, though. Strength alone won't get you through. Hmm... I'm sure you'll figure it out!",
    ]);
    return;
  }
  if (w.key === 'glowwood' && F.pip_saved && !F.pip_found) {
    F.pip_found = true; save.adv.follow = 'squeakwing'; persist();
    w.removeNpc('pip'); w.refreshFollower();
    w.say([
      'Pip: Squeak... squeak? (The little Squeakwing peeks out from behind {hero}.)',
      "{hero}: It's okay, Pip. That grumpy Thistlehog is gone. Let's get you home to your mama!",
      'Pip: SQUEAK! (Pip flutters along right behind {hero}.)',
    ]);
    return;
  }
  if (F.cup_champion && !F.post_champion && w.key === 'ember') {
    F.post_champion = true; persist();
    w.say([
      'The ground rumbles... and the volcano puffs out a giant smoke ring!',
      'Big Boulder: HA! The volcano only does that for a true champion. Four cups, {hero}!',
      'Prof. Pecan (on the phone): {hero}! The whole of Clashara is talking about you now.',
      'Prof. Pecan: Three cups remain: the Midnight Cup, the Legend Cup and the Sky Cup. Then... Champion\'s Peak.',
      'Prof. Pecan: The road east of Cinder Town leads to Neon City and its Midnight Cup. Off you go!',
    ]);
    return;
  }
  if (w.key === 'frostpeak' && !F.frostpeak) {
    F.frostpeak = true; persist();
    w.say(["{hero}: Brrr! So THIS is Frostpeak. And that mountain... that's Champion's Peak!", 'Captain Puff: The Legend Cup is the toughest of them all. Good luck, {hero}!']);
    return;
  }
  if (F.cup_coral && !F.post_coral && w.key === 'coral') {
    F.post_coral = true; persist();
    w.say([
      'Marina: The reef chose well, {hero}. Wear that Coral Cup with pride!',
      'Marina: The Gale Cup is next, up on Breezy Bluffs, east along Palm Path past the rope bridge.',
      "Marina: And keep your eyes on the sky. Gloom Gull balloons have been circling the islands. Whatever they want, it can't be good.",
    ]);
    return;
  }
  if (w.key === 'bluffs' && !F.bluffs) {
    F.bluffs = true; persist();
    w.say(['The rope bridge sways in the wind... and then you are across! Windmills turn on the cliff tops, and kites dance over the town.', '{hero}: So this is Breezy Bluffs. Hold on to your hat!']);
    return;
  }
  if (w.key === 'ember_isle' && !F.ember_isle) {
    F.ember_isle = true; persist();
    w.say(['Black sand, warm wind, and a huge volcano puffing smoke over the rooftops. This is Ember Isle!', '{hero}: The Caldera Cup is inside THAT? ...Okay. Deep breaths.']);
    return;
  }
  if (F.cup_caldera && !F.post_caldera && w.key === 'ember_isle') {
    F.post_caldera = true; persist();
    w.say([
      'Magda: The mountain has never rumbled for a mainlander before, {hero}. All three island cups... the isles are proud of you.',
      "Magda: But a champion's work isn't done. The Gloom Gulls hide on Starfall Atoll with the Sunstone. Every night without its light, a ship loses its way.",
      'Magda: Captain Gill knows the waters out there. Talk to him at Port Coral. Go and bring the light home.',
    ]);
    return;
  }
  if (F.cup_gale && !F.post_gale && w.key === 'bluffs') {
    F.post_gale = true; persist();
    w.say([
      'Zephyra: The wind spoke true, {hero}. The Gale Cup suits you.',
      'Zephyra: The last island cup is the Caldera Cup, inside the sleepy volcano on Ember Isle. The Ash Trail runs east to it.',
      'Zephyra: And the wind carries other news. The Gloom Gulls took the Sunstone, the heart of the Starfall lighthouse. Without it, ships lose their way at night.',
    ]);
    return;
  }
  if (w.key === 'coral' && !F.isle_arrive) {
    F.isle_arrive = true; persist();
    w.say([
      'The Sunny Gull bumps gently against the pier. Warm wind, turquoise water, and palm trees as far as the eye can see!',
      '{hero}: So these are the Sunscatter Isles...',
      'Captain Gill: Welcome to Port Coral, Champion! Three islands, three stadiums: the Coral Cup right here, the Gale Cup on Breezy Bluffs, and the Caldera Cup on Ember Isle.',
      'Captain Gill: The critters out here are all new to mainland folk. Smokeshells, Blowfins, Toucharges... you will love them.',
      'Captain Gill: Just watch out for the Gloom Gulls. A gang of sky pirates. Since they came, the great lighthouse on Starfall Atoll has gone dark...',
      'Captain Gill: Whenever you want to go home, I will be right here on the pier. Off you go!',
    ]);
    return;
  }
  if (CUPS.every((c) => F['cup_' + c.id]) && !F.seven && w.key === 'frostpeak') {
    F.seven = true; persist();
    w.say([
      'Far above, something CRACKS. The frozen gate on the mountain trail shatters into sparkles!',
      'Prof. Pecan (on the phone): Seven cups... {hero}, you did it. The way to Champion\'s Peak is open.',
      'Prof. Pecan: At the top waits the Crown Keeper. Nobody has beaten them in a hundred years.',
      "Prof. Pecan: And {hero}... I have a feeling a certain rival got there first. Go!",
    ]);
    return;
  }
  if (w.key === 'peak' && F.crowned && !F.ending) {
    F.ending = true; persist();
    w.crownScene?.();
    w.say([
      'King Snooze: ...Zzz... Hm? I lost? Hoo hoo... I mean... yawn. I lost.',
      'King Snooze: A hundred years I have guarded this crown, waiting for a critter strong enough, brave enough, and kind enough to wear it.',
      'King Snooze: It\'s yours, {hero}. Wear it well. I am going to have a VERY long nap.',
      'The Critter Crown floats down from the pedestal... and settles on {hero}\'s head!',
      'Dash: ...Hmph. Congratulations, champ. Enjoy it while it lasts. I\'m coming for that crown!',
      'Prof. Pecan: {hero}, Champion of Clashara! I knew it from the very first day.',
      '{hero}: I did it... I really did it! But Dash is right. There are always stronger critters out there...',
      "{hero}: So I'll keep training! Every route, every stadium. Let's go!",
    ], () => (w.credits ? w.credits(() => w.say(['★ THE END ★  Thanks for playing! The world is yours to explore. Wild critters are still out there, and every stadium welcomes a rematch.', 'Psst... down on the pier in Seashell Town, a little ferry is getting ready to sail somewhere new. Chapter 2 awaits!'])) : null));
    return;
  }
  if (w.key === 'cloudtop' && !F.cloudtop) {
    F.cloudtop = true; persist();
    w.say(["{hero}: We're ABOVE the clouds! Everything smells like flowers up here.", "Captain Puff: Welcome to Cloudtop Gardens! The Sky Stadium's just up the path. I'll wait here with the balloon."]);
    return;
  }
  if (F.cup_sky && !F.post_sky && w.key === 'cloudtop') {
    F.post_sky = true; persist();
    w.say([
      'Prof. Pecan: Hoo! You beat me fair and square, {hero}. My Thornhulk is still dizzy.',
      "Prof. Pecan: I had to see it for myself. You're ready... nearly.",
      'Prof. Pecan: One cup is left: the Legend Cup, in Frostpeak at the foot of Champion\'s Peak. Every old rival returns there at full power.',
      "Prof. Pecan: Captain Puff can fly you to Frostpeak now. Dress warmly!",
    ]);
    return;
  }
  if (w.key === 'neon' && F.trial_heart && !F.post_heart) {
    F.post_heart = true; persist();
    w.say([
      'Dash: ...Why? Why did you help me? I\'ve been nothing but a pain since Route 1.',
      "{hero}: Because chasing the Crown wouldn't be any fun without my rival.",
      "Dash: ...Heh. You're weird, you know that?",
      "Dash: Thanks, {hero}. I mean it. I'll see you on Champion's Peak. And when we meet there, I won't hold anything back!",
      'Dash dashes off into the neon night...',
    ]);
    return;
  }
  if (w.key === 'neon' && !F.neon) {
    F.neon = true; persist();
    w.say(['{hero}: Whoa... so many lights! Neon City never sleeps!', "Somewhere to the south, someone is shouting. It sounds like... Dash?"]);
    return;
  }
  if (w.key === 'cinder' && !F.cinder) {
    F.cinder = true; persist();
    w.say(['{hero}: Phew, it\'s HOT out here! The Champion Stadium is inside that volcano...', "{hero}: There's someone big sitting by the lava bridge."]);
    return;
  }
  if (w.key === 'glowwood' && !F.woods) {
    F.woods = true; persist();
    w.say(["{hero}: Whoa... it's so dark in here. But the mushrooms are glowing!", '{hero}: Glowcap Hollow and its stadium should be somewhere north.']);
    return;
  }
  if (F.cup_grove && !F.post_grove && w.key === 'glowcap') {
    F.post_grove = true; persist();
    w.say([
      '{hero}: Three cups! And Elder Oakley gave me a real glowcap!',
      'Pip (far away): SQUEAK SQUEAK! (Somewhere in the woods, a whole family of bats is cheering.)',
      'Prof. Pecan (on the phone): {hero}, splendid! Next is the Champion Cup, at the stadium inside the volcano.',
      "Prof. Pecan: I'm still mapping the volcano road. Train up in the meantime. It gets HOT out there!",
    ]);
    return;
  }
  if (F.intro) return;
  flags().intro = true; persist();
  w.say([
    'In the land of Clashara, every critter dreams of one thing: the Critter Crown.',
    'Only one critter can wear it: the strongest critter of all, crowned on top of Champion\'s Peak.',
    '{hero}: One day... that crown is going to be MINE!',
    '{hero}: But first... Mom said Professor Pecan wanted to see me. His lab is the big white building!',
    document.body.classList.contains('is-touch')
      ? '(Walk with the stick on the left; push it all the way to run. Tap A to talk, read signs and open doors. ☰ has the menu and the Town Map.)'
      : '(Walk with WASD or the arrow keys; hold Shift to run. Press J or Space to talk, read signs and open doors. Esc opens the menu.)',
  ]);
}

// called after every step; returns true if it started an event
export function storyStep(S, w) {
  const F = flags();
  if (w.key === 'village' && !F.quest && w.hy <= 3) {
    const g = w.npcs.find((a) => a.n.id === 'guard');
    if (g) g.dir = 'w';
    w.busy = true;
    w.say(['Pebblepup: Woof! Wait! The tall grass on Route 1 is full of wild critters.', 'Pebblepup: Professor Pecan made me promise: nobody goes out there without talking to him first!'], () => {
      w.busy = false;
      w.from = [w.hx, w.hy]; w.hy += 1; w.dir = 's'; w.moveT = 0.23;
    });
    return true;
  }
  if (w.key === 'frostpeak' && w.hy <= 1 && !CUPS.every((c) => F['cup_' + c.id])) {
    w.busy = true;
    const left = CUPS.filter((c) => !F['cup_' + c.id]).map((c) => c.name).join(', ');
    w.say([`A frozen gate blocks the trail. Carved in the ice: "Seven cups, or turn back." Still to win: ${left}.`], () => {
      w.busy = false;
      w.from = [w.hx, w.hy]; w.hy += 1; w.dir = 's'; w.moveT = 0.23;
    });
    return true;
  }
  if (w.key === 'peak' && w.hy <= 7 && !F.dash5) {
    const a = w.npcs.find((n) => n.n.id === 'dash5');
    if (!a) return false;
    w.busy = true; sfx.warn?.(); w.bubble(a, '❗');
    setTimeout(() => { w.busy = false; dashFinal(S, w); }, 700);
    return true;
  }
  if (w.key === 'ember' && !F.cup_champion && w.hx >= 24) {
    w.busy = true;
    w.say(["{hero}: That road goes to Neon City... Big Boulder said nobody gets in without the Champion Cup. Back to the stadium!"], () => {
      w.busy = false;
      w.from = [w.hx, w.hy]; w.hx -= 1; w.dir = 'w'; w.moveT = 0.23;
    });
    return true;
  }
  if (w.key === 'glowcap' && !F.cup_grove && w.hx >= 22) {
    w.busy = true;
    w.say(["{hero}: The volcano road! But the Champion Stadium only lets in critters with three cups. Glowcap Cup first!"], () => {
      w.busy = false;
      w.from = [w.hx, w.hy]; w.hx -= 1; w.dir = 'w'; w.moveT = 0.23;
    });
    return true;
  }
  if (w.key === 'seashell' && !F.cup_thunder && w.hy <= 1) {
    w.busy = true;
    w.say(["{hero}: Those woods look spooky... and they say the Glowcap Cup only lets in Thunder Cup winners. I'll win here first!"], () => {
      w.busy = false;
      w.from = [w.hx, w.hy]; w.hy += 1; w.dir = 's'; w.moveT = 0.23;
    });
    return true;
  }
  if (w.key === 'bloom' && !F.cup_sprout && w.hx >= 21) {
    w.busy = true;
    w.say(["{hero}: Route 2 leads to the Thunder Cup... but they only let Sprout Cup winners in. I'd better win here first!"], () => {
      w.busy = false;
      w.from = [w.hx, w.hy]; w.hx -= 1; w.dir = 'w'; w.moveT = 0.23;
    });
    return true;
  }
  if (w.key === 'route1' && !F.rival1 && w.hy <= 6) {
    const a = w.npcs.find((n) => n.n.id === 'rival1');
    if (!a) return false;
    w.busy = true;
    sfx.warn?.();
    w.bubble(a, '❗');
    // Dash dashes over to stand right in front of the hero
    const spots = [[w.hx, w.hy - 1], [w.hx - 1, w.hy], [w.hx + 1, w.hy], [w.hx, w.hy + 1]];
    const [tx, ty] = spots.find(([x, y]) => w.walkable(x, y) && !w.occupied(x, y, a)) || [a.x, a.y];
    setTimeout(() => {
      a.from = [a.x, a.y]; a.x = tx; a.y = ty; a.moveT = 0.23 * 1.3; a.walking = true;
      a.dir = tx < w.hx ? 'e' : tx > w.hx ? 'w' : ty < w.hy ? 's' : 'n';
      w.dir = { n: 's', s: 'n', e: 'w', w: 'e' }[a.dir];
      a.arrived = () => { a.walking = false; rivalTalk(S, w, a); };
    }, 600);
    return true;
  }
  return false;
}

function rivalTalk(S, w, a) {
  const rid = rivalFor(save.adv.hero), rdef = byId(rid);
  w.say([
    `Dash: Hold it! So YOU'RE the one Professor Pecan keeps talking about?`,
    `Dash: I'm Dash, the fastest ${rdef.name} in Clashara. And I'M going to wear the Critter Crown.`,
    `Dash: Every critter who wants the Crown has to pass the trials. Here's your first one: get past ME!`,
  ], () => S.worldFight({
    foe: withGear(rdef, 4), lv: 4, kind: 'story', flag: 'rival1', name: 'Rival Dash', diff: 0.32,
    trainer: { name: 'Dash', critter: rid, title: 'Your rival', beat: "Hmph! Lucky shot. I'll be waiting at the Sprout Stadium, and next time I won't go easy!", gloat: 'Ha! Too slow! Come back when you can keep up.' },
    note: '🏃 Trial of Courage passed: you beat your rival Dash!',
  }));
}

// the ☰ menu's one-line "what now?" for players coming back after a break
const GOAL_AT = { sprout: 'Bloom Town, north along Route 1', thunder: 'Seashell Town, east along Route 2', grove: 'Glowcap Hollow, through the woods north of Seashell Town', champion: 'Cinder Town, down the volcano road', midnight: 'Neon City, east of Cinder Town', sky: 'Cloudtop Gardens (Captain Puff\'s balloon, Neon City)', legend: 'Frostpeak (Captain Puff\'s balloon, Cloudtop)' };
export function nextGoal(F) {
  if (F.crowned) {
    // Chapter 2: the Sunscatter Isles
    if (!F.isle_arrive) return F.ending ? 'Chapter 2: take the Sunny Gull ferry from the pier in Seashell Town to the Sunscatter Isles!' : 'You\'re the Champion! Rematch trainers and Dash, and find every gift box.';
    const ISLE_AT = { coral: 'Port Coral', gale: 'Breezy Bluffs, past Palm Path', caldera: 'Ember Isle, down the Ash Trail from Breezy Bluffs' };
    const nx = ISLE_CUPS.find((c) => !F['cup_' + c.id]);
    if (nx?.id === 'caldera' && !F.skua_b) return 'A Gloom Gull is blocking the Ash Trail at the east edge of Breezy Bluffs. Chase it off!';
    if (nx) return `Win the ${nx.name} in ${ISLE_AT[nx.id]}.`;
    return 'All three island cups are yours! The Starfall lighthouse is still dark...';
  }
  if (!F.quest) return 'Visit Professor Pecan\'s lab in Sprout Village.';
  const nx = Object.keys(GOAL_AT).find((id) => !F['cup_' + id]);
  if (!nx) return 'Climb Champion\'s Peak, north of Frostpeak. The Crown is waiting!';
  if (nx === 'grove' && !F.trial_friendship) return 'Brambles block Glowcap Woods. Someone in the woods needs a friend.';
  if (nx === 'champion' && !F.trial_wisdom) return 'Cross the bridge on Cinder Road. The Stone Sage will test what you know.';
  return `Win the ${CUPS.find((c) => c.id === nx).name} in ${GOAL_AT[nx]}.`;
}

export function storyTalk(S, id, w, a) {
  const F = flags();
  if (id === 'pecan') {
    if (!F.quest) {
      w.say([
        'Prof. Pecan: Ah, {hero}! There you are. Your mom tells me you want to be the strongest critter in Clashara.',
        'Prof. Pecan: Then listen closely. Seven stadiums stand across the land. Each one holds a cup.',
        'Prof. Pecan: Win all seven cups and the gate to Champion\'s Peak opens. The Critter Crown waits at the top.',
        'Prof. Pecan: But the road is full of trials: wild critters, tough trainers, and rivals who want the Crown just as badly.',
        'Prof. Pecan: Your first stop is Bloom Town, north along Route 1. Its Sprout Stadium is perfect for a brand-new challenger.',
        'Prof. Pecan: Take these berries for the road. And {hero}... believe in yourself. I do!',
      ], () => {
        F.quest = true;
        save.berries = (save.berries || 0) + 3;
        persist();
        S.toast('🍓 Got 3 berries!'); sfx.jingle(2);
        w.removeNpc('guard');
      });
      return;
    }
    // where the next cup is, in story order
    const WHERE = [['sprout', 'Bloom Town, north along Route 1'], ['thunder', 'Seashell Town, east along Route 2 from Bloom Town'], ['grove', 'Glowcap Hollow, through the woods north of Seashell Town'], ['champion', 'Cinder Town, down the volcano road east of Glowcap Hollow'], ['midnight', 'Neon City, east of Cinder Town'], ['sky', 'Cloudtop Gardens. Captain Puff flies there from Neon City'], ['legend', 'Frostpeak. Captain Puff flies there from Cloudtop']];
    const nx = WHERE.find(([id]) => !F['cup_' + id]), cup = nx && CUPS.find((c) => c.id === nx[0]);
    w.say([...forecast(), F.crowned ? 'Prof. Pecan: Our very own Champion of Clashara! Come back and tell me everything sometime.'
      : nx ? `Prof. Pecan: ${F.cup_sprout ? 'Marvellous work so far! ' : ''}Your next goal is the ${cup.name}, in ${nx[1]}.`
      : "Prof. Pecan: Seven cups! Champion's Peak is north of Frostpeak. The Crown is waiting!"]);
    return;
  }
  if (id === 'hatshop') return hatShop(w);
  if (id === 'board') return requestBoard(S, w);
  if (id === 'pcbox') { // the Berry Center's Critter Box: any critter on the team can take the lead
    if (save.unlocked.length < 2) return w.say(['The CRITTER BOX hums. "Team: 1. Recruit more critters to swap who leads the way!"']);
    return w.say(['The CRITTER BOX blinks on. "Who leads the way?"'], () => S.leadPick(w));
  }
  if (id === 'daycare') return daycare(S, w);
  if (id === 'trader') return trader(w);
  if (id === 'noodles') return noodleCart(w);
  if (id === 'arcade') return arcade(S, w);
  if (id === 'arcade:hop') return arcade(S, w, true);
  if (id.startsWith('lost:') || id.startsWith('found:') || id.startsWith('deliver:')) return lostQuest(S, w, a, id);

  if (id === 'wish') { // Cloudtop's wishing fountain: toss in a berry, make a wish; the clouds grant one a day
    const A = save.adv, day = new Date().toISOString().slice(0, 10);
    if (A.wish === day) return w.say(['The fountain bubbles happily. One wish a day is plenty, says a little sign. (Come back tomorrow!)']);
    if ((save.berries || 0) < 1) return w.say(['A wishing fountain! A sign says: "One berry, one wish." {hero} has no berries to toss in.']);
    return w.ask('Toss a berry into the wishing fountain?', ['Make a wish!', 'Not now'], (i) => {
      if (i) return;
      save.berries -= 1; A.wish = day; countUp('wish'); const r = Math.floor(Math.random() * 10);
      let out;
      if (r < 2) { save.berries += 5; out = 'The fountain gurgles... and spits out FIVE berries! The clouds must like {hero}. +5 🍓'; sfx.jingle(3); }
      else if (r < 6) { const hero = A.hero, rr = grantXp(hero, Math.round(xpNeeded(save.critters[hero].level) * 0.3)); out = `A warm breeze swirls around {hero}. They feel stronger! ${rr.to > rr.from ? `{hero} grew to Lv ${rr.to}!` : '(+XP)'}`; sfx.jingle(2); }
      else { save.berries += 2; out = 'Plip! Two shiny berries bob up out of the water. +2 🍓 (A good deal!)'; sfx.jingle(1); }
      persist();
      w.say(['Plop! {hero} tosses a berry into the fountain and makes a wish...', out]);
    });
  }
  if (id === 'skates') { // Skater Ivy's night spot on the frozen pond: she lends out a pair of skates for keeps
    const who = 'Skater Ivy', npc = MAPS.frostpeak.npcs.find((n) => n.id === 'aurora');
    if (!save.adv.skates) return w.say([`${who}: Oh! You want to skate too? Here, I always carry a spare pair. Tiny ones, just your size!`, `${who}: With skates on, you don't bonk at the end of a slide. You TWIRL. Try the pond!`], () => { save.adv.skates = true; persist(); S.toast('⛸️ Got Ivy\'s spare skates!'); sfx.jingle(2); }, who);
    const L = npc?.night?.lines || [];
    return w.say([Math.random() < 0.4 ? `${who}: Nice skates! Slide across the pond and finish with a twirl. The first twirl of the night makes you stronger. Probably.` : L[Math.floor(Math.random() * L.length)]], null, who);
  }
  if (id === 'wardrobe') return wearMenu(w, '', null);
  if (id === 'mirror') { // the Hat Shop's dressing mirror: try on any hat you own
    if (!(save.adv.hats || []).length) return w.say(['{hero} strikes a pose in the mirror. Looking good! ...A hat would look even better.']);
    return w.say(['{hero} strikes a pose in the mirror. Time for a new look?'], () => wearMenu(w, '', null));
  }
  if (id === 'shelf') { // the trophy shelf at home fills up as you win
    const F = flags(), won = CUPS.filter((c) => F['cup_' + c.id]);
    return w.say([won.length ? `{hero}'s trophy shelf: ${won.length} of ${CUPS.length} cups. ${won.map((c) => c.name).join(', ')}.` : 'An empty trophy shelf, dusted and waiting. Mom says it\'s for {hero}\'s first cup.', ...(F.crowned ? ['And on top, in pride of place: the Critter Crown. 👑'] : won.length < CUPS.length ? ['There\'s still room for more!'] : [])]);
  }
  if (id.startsWith('case:')) { // a lobby trophy case
    const cup = cupById(id.slice(5));
    w.say([F['cup_' + cup.id] ? `The ${cup.name} trophy! {hero}'s name is engraved on it. ✨` : `An empty stand. A little card says: "${cup.name}".`]);
    return;
  }
  if (id === 'cupdesk') { // the stadium's front desk signs you up for its cup
    const cup = cupById(w.M.cup), front = w.M.exit, who = 'Front Desk';
    if (F['cup_' + cup.id]) { w.say([`Front Desk: Hoo! The ${cup.name} champion! Your trophy has pride of place in the case.`, 'Front Desk: Want to battle the cup again? Use Tournament on the title screen.'], null, who); return; }
    w.say([`Front Desk: Hoo! Welcome to the ${cup.name}! ${cup.matches.length} battles stand between you and the trophy.`], () => w.ask(`Front Desk: Shall I sign {hero} up for the ${cup.name}?`, ["Let's go!", 'Not yet'], (i) => {
      if (i) { w.say(['Front Desk: No rush. Rest up at the Berry Center first!'], null, who); return; }
      w.say([Object.keys(F).some((k) => k.startsWith('cup_')) ? "{hero}: Another cup, another trophy. Let's go!" : '{hero}: This is it. My first real cup. Let\'s go!'], () => {
        save.adv.map = front.map; // the cup comes back out to the stadium door, not the lobby
        S.worldCup(cup, front);
      });
    }, who), who);
    return;
  }
  if (id === 'fisher') { // Fisher Finn hands over his old rod: any pond, river or sea can be fished
    if (F.rod) {
      const L = save.adv.fishLog, D = derbyOf(gauntletWeek());
      w.say([a.n.lines[Math.floor(Math.random() * a.n.lines.length)], save.adv.derbyWk === D.wk ? `Fisher Finn: You won this week's Derby! Come back Monday for a new fish to chase.` : `Fisher Finn: This week's FISHING DERBY: land a ${D.name} of ${D.cm} cm or more (try ${D.where}). Win and the prize is yours!`, L?.best ? `Fisher Finn: Your record is a ${L.best.name}, ${L.best.cm} cm! ${L.best.cm >= 50 ? 'A monster! I\'m jealous.' : 'Not bad. The big ones bite in deep water. Every place has its own fish!'} (${L.n} caught)` : 'Fisher Finn: Remember: wait for the bobber to dip, THEN press A. Patience!', ...(seasonKey() && !L?.season?.[SEASON_FISH[seasonKey()][0]] ? [`Fisher Finn: It's ${seasonKey()}, so keep an eye out for the ${SEASON_FISH[seasonKey()][0]}! It only visits this time of year.`] : []), ...(!L?.sp?.Moonfin ? ['Fisher Finn: Psst. After dark, Moonfins bite in any water. Some say a Glimmer Ray too... glowing like the moon!'] : [])], null, 'Fisher Finn');
      return;
    }
    w.say(['Fisher Finn: Shh! ...Oh, it\'s you. You look like a natural angler.', 'Fisher Finn: Here, take my old rod! I\'ve got a new one anyway.', 'Fisher Finn: Face any water and press A to cast. When the bobber dips, press A again, quick! You might hook a big fish, berries... or a grumpy water critter!'], () => {
      F.rod = true; persist(); sfx.jingle(2); S.toast('🎣 Got the Old Rod!');
    }, 'Fisher Finn');
    return;
  }
  if (id === 'smoothie') { // the Berry Center blender turns a berry into XP for the hero
    const n = save.berries || 0;
    if (!n) { w.say(["A berry smoothie blender. Bring a berry 🍓 and it'll whip up a smoothie for {hero}!"]); return; }
    w.ask(`Blend a berry smoothie for {hero}? (1 🍓 of ${n}, +XP)`, ['Blend!', 'Not now'], (i) => {
      if (i !== 0) return;
      const h = save.adv.hero, c = save.critters[h];
      save.berries = n - 1;
      const r = grantXp(h, Math.round(xpNeeded(c.level) * 0.25)); countUp('smoothie'); persist();
      sfx.jingle(2);
      w.say(['Whirrrr... *slurp*! A berry smoothie! 🍓', r.to > r.from ? `{hero} grew to Lv ${r.to}!` : '{hero} feels refreshed! (+XP)']);
    });
    return;
  }
  if (id === 'rest') { // the hero's own bed: a nap, or sleep on until evening, night or morning (the world clock moves on for the rest of the real day)
    save.adv.spawn = { ...w.M.exit }; persist();
    const opts = ['💤 Just a nap', '🌇 Evening', '🌙 Night', '🌅 Morning'];
    w.ask('{hero} hops into bed. Sleep until...?', opts, (i) => {
      sfx.jingle(2);
      if (!i) return w.say(['{hero} has a quick nap... Ahh, refreshed!', 'Mom: Sweet dreams! (If you lose a battle, you\'ll come back home.)']);
      const now = new Date(), target = [0, 17, 21, 7][i], h = (target - now.getHours() + 24) % 24;
      save.adv.shift = h ? { day: now.toISOString().slice(0, 10), h } : null; persist();
      w.fade(() => w.load(w.key, w.hx, w.hy, w.dir));
      setTimeout(() => w.say([['', '{hero} snoozes until the sky turns gold...', '{hero} sleeps until the stars come out...', '{hero} sleeps right through until morning...'][i], ['', 'The window glows gold. Good evening, sleepyhead!', 'Hoo-hoo... The night owls are out, and the stars are twinkling.', 'Birds are singing outside. Good morning!'][i]]), 500);
    });
    return;
  }
  if (id === 'nurse' || id === 'rest') {
    save.adv.spawn = { ...w.M.exit }; persist();
    sfx.jingle(2);
    w.say(id === 'rest' ? ['{hero} hops into bed for a quick nap...', 'Mom: Sweet dreams! (If you lose a battle, you\'ll come back home.)']
      : ['Nurse Lilypop: Welcome to the Berry Center! Let me fix you a berry smoothie...', 'Nurse Lilypop: All better! If you ever lose a battle, you\'ll wake up right here.', ...(save.berries > 0 ? ['Nurse Lilypop: Got spare berries? The blender over there makes smoothies that help critters grow!'] : []), ...(save.unlocked.length > 1 && !save.adv.flags.boxTip ? ((save.adv.flags.boxTip = true), ['Nurse Lilypop: See the Critter Box in the corner? Any critter on your team can take the lead from there.']) : []), ...(save.unlocked.length > 1 && save.adv.flags.boxTip && !save.adv.flags.careTip && !save.adv.care ? ((save.adv.flags.careTip = true), ['Nurse Lilypop: Have you met Nanny Nell by the sofa? She runs the Critter Daycare. Leave a critter with her and it trains while you walk!']) : []), ...(save.adv.req?.day !== new Date().toISOString().slice(0, 10) ? ['Nurse Lilypop: Oh, and there are new requests on the cork board by the door. Berries for little jobs!'] : [])], null, id === 'nurse' ? 'Nurse Lilypop' : '');
    return;
  }
  if (id === 'gauntlet') return gauntlet(S, w);
  if (id === 'gauntsign') { // the signpost, with this week's theme chalked underneath
    const th = gauntletTheme(gauntletWeek()), sg = getMap('peak').signs.find((q) => q.act === 'gauntsign');
    return w.say([sg.text, `Someone has chalked a note underneath. "THIS WEEK: ${TYPES[th[0]].name.toUpperCase()} & ${TYPES[th[1]].name.toUpperCase()}!"`], null, '📜 Sign');
  }
  if (id === 'dashpost') { // post-game: a daily rematch with Dash at the hero's level, for berries
    const day = new Date().toISOString().slice(0, 10), rid = rivalFor(save.adv.hero), lv = save.critters[save.adv.hero].level + 2;
    if (F['dashday_' + day]) { w.say(['Dash: Okay, okay, you win today. Same time tomorrow, Champ. I\'ll be ready this time!']); return; }
    w.say([
      'Dash: Hey, Champ! Being crowned doesn\'t mean you get to stop training. I sure haven\'t.',
      'Dash: One battle a day. Every day. Until I win that Crown back. Ready?',
    ], () => S.worldFight({
      foe: withGear(byId(rid), lv), lv, kind: 'story', flag: 'dashday_' + day, name: 'Rival Dash', diff: 0.8, berries: 3,
      trainer: { name: 'Dash', critter: rid, title: 'Your rival', beat: 'AGAIN?! ...Tomorrow. Tomorrow for sure.', gloat: 'HA! Did you see that?! See you tomorrow, Champ!' },
      note: '⚡ You beat Dash again! +3 🍓 (He\'ll be back tomorrow.)',
    }), 'Dash');
    return;
  }
  if (id === 'guard') {
    w.say(['Pebblepup: Woof! Talk to Professor Pecan first. He\'s standing outside his lab.']);
    return;
  }
  if (id === 'rival1') { w.say(['Dash: ...']); }
  if (id === 'boulder') {
    const def = withGear(byId('rolladillo'), 8);
    w.say([
      `A huge ${def.name} is snoring across the bridge. It's blocking the whole way!`,
      '{hero}: Hey! HEY! Wake up! ...',
      `${def.name}: ...Zzz... who dares... wake the mighty ${def.name}...?`,
      '{hero}: This must be the Trial of Strength. Here goes!',
    ], () => S.worldFight({
      foe: def, lv: 8, kind: 'story', flag: 'trial_strength', name: def.name, diff: 0.42, recruit: true,
      trainer: { name: def.name, critter: 'rolladillo', title: 'Trial of Strength', beat: '...Hmph. Strong little thing. Fine, I\'ll nap somewhere else.', gloat: 'Zzz... too weak... zzz...' },
      note: `💪 Trial of Strength passed! ${def.name} rolls off the bridge.`,
    }));
  }
  if (id === 'rival2') rival2(S, w);
  if (id === 'ferry') return ferry(S, w);
  if (id === 'dashisle') return dashIsle(S, w);
  if (id === 'skua') return skua(S, w);
  if (id === 'dash3') {
    w.say([
      "Dash: Don't bother. I already tried to bash through those brambles. Twelve times.",
      "Dash: Some old frog told me they only open for a 'friend of the forest'. What does THAT even mean?!",
      "Dash: Whatever. I'll figure it out before you do!",
    ]);
  }
  if (id === 'pip') {
    if (F.pip_saved) return;
    const def = withGear(byId('pricklepuff'), 9);
    w.say([
      'Pip: Squeeeak! (A tiny Squeakwing is backed up against a mushroom, shaking.)',
      `${def.name}: Grrr! These glowcaps are MINE. Scram, little bat!`,
      '{hero}: Hey! Leave Pip alone! Pick on someone your own size!',
      `${def.name}: ...You? You're not my size either. But fine!`,
    ], () => S.worldFight({
      foe: def, lv: 9, kind: 'story', flag: 'pip_saved', name: def.name, diff: 0.45,
      trainer: { name: def.name, critter: 'pricklepuff', title: 'Grumpy bully', beat: 'Hmph! Keep your silly bat. I was leaving anyway.', gloat: 'Hah! These glowcaps stay MINE.' },
      note: '🦇 You chased the bully away! Pip is safe.',
    }));
  }
  if (id === 'mama') mama(S, w, a);
  if (id === 'sage') sage(S, w);
  if (id === 'heart') heart(S, w);
  if (id === 'balloon') balloon(S, w, a);
  if (id === 'dash5') { if (!F.dash5) dashFinal(S, w); else w.say(["Dash: Go on. The Crown Keeper's waiting. Show 'em what beat me."]); }
  if (id === 'king') king(S, w);
}

// Pecan reads the weather: which places he's seen will get a shower in the next 3-hour slot
function forecast() {
  const later = new Date(Date.now() + 3 * 3600 * 1000), seen = Object.keys(save.adv.seen || {});
  const wet = seen.filter((k) => { const M = getMap(k); return M && canRain(M) && rainAt(k, later); }).map((k) => getMap(k).name);
  if (!seen.length) return [];
  if (wet.length && isWinter(later)) { // January and February: a shower over the green maps comes down as snow (world.js load)
    const snowy = seen.filter((k) => { const M = getMap(k); return M && canRain(M) && rainAt(k, later) && !M.indoor && !M.snow && !M.lava && !M.city && M.arena !== 'beach'; }).map((k) => getMap(k).name);
    if (snowy.length) return [`Prof. Pecan: Brr! My weather vane says snow is coming to ${snowy.slice(0, 3).join(', ')} soon. Wrap up warm, and watch for ice critters!`];
  }
  return [wet.length && stormAt(later) ? `Prof. Pecan: My weather vane is spinning! Thunderstorms are coming to ${wet.slice(0, 3).join(', ')} soon. Spark critters love a good storm!`
    : wet.length ? `Prof. Pecan: My weather vane says showers are coming to ${wet.slice(0, 3).join(', ')} soon. Water critters love the rain!`
    : 'Prof. Pecan: My weather vane says clear skies everywhere for the next few hours. Splendid!'];
}

// the Berry Center request board: three little jobs a day, a couple of berries each, and a Power Snack for all three
const REQUESTS = {
  wins: { text: 'Win 2 battles', n: 2, now: () => save.stats.wins || 0 },
  steps: { text: 'Take 150 steps', n: 150, now: () => save.adv.steps || 0 },
  bush: { text: 'Shake a berry bush', n: 1, now: () => save.adv.cnt?.bush || 0 },
  fish: { text: 'Reel in a catch', n: 1, now: () => save.adv.cnt?.fish || 0, need: 'rod' },
  smoothie: { text: 'Blend a berry smoothie', n: 1, now: () => save.adv.cnt?.smoothie || 0 },
  wild: { text: 'Battle 3 wild critters', n: 3, now: () => save.adv.cnt?.wild || 0 },
  dig: { text: 'Dig up a beach sparkle', n: 1, now: () => save.adv.cnt?.dig || 0, need: 'cup_sprout' },
};
// the Critter Daycare (Nanny Nell, in every Berry Center): leave a team critter and it trains while the hero walks.
// 1000 steps are worth one level (of the level it was dropped off at), up to two levels' worth
export const careXp = (c) => Math.round(xpNeeded(c.lv0 || 1) * Math.min(2000, Math.max(0, (save.adv.steps || 0) - c.at)) / 1000);
function daycare(S, w) {
  const A = save.adv, c = A.care, who = 'Nanny Nell';
  if (!c) {
    if (save.unlocked.length < 2) return w.say([`${who}: Welcome to the Critter Daycare! Once there's more than one critter on your team, leave one with me.`, `${who}: It plays and trains while you explore. The more you walk, the more it grows!`], null, who);
    return w.say([`${who}: Welcome to the Critter Daycare! Leave a critter with me and it plays and trains while you explore.`, `${who}: Every step you walk helps it grow. Pick it up again at any Berry Center. We're all one big family!`],
      () => w.ask('Leave a critter at the Daycare?', ['Choose a critter', 'Not now'], (i) => { if (!i) S.leadPick(w, 'care'); }, who), who);
  }
  const def = byId(c.id), name = grown(def, save.critters[c.id].level).name, steps = Math.max(0, (A.steps || 0) - c.at);
  // once a day, after a good long stay, Nell finds an egg by the cared critter's bed; it hatches after 250 more steps (world.js hatchEgg)
  const day = new Date().toISOString().slice(0, 10);
  if (steps >= 400 && !A.egg && A.eggDay !== day) return w.say([`${who}: Oh! I'm so glad you came by. Look what I found tucked in ${name}'s blanket this morning!`, `${who}: An egg! A little warm one, with spots. I've no idea how it got there. Critters are full of surprises!`],
    () => w.ask('Take the egg?', ['Take the egg', 'Leave it with Nell'], (i) => {
      if (i) return w.say([`${who}: I'll keep it warm by the heater, then. Ask me again any time today!`], null, who);
      A.egg = { at: A.steps || 0, id: c.id }; A.eggDay = day; persist(); sfx.jingle?.(1); w.wearEgg();
      w.say(['{hero} tucks the egg safely into the bag. 🥚', `${who}: Eggs love a good walk. Keep exploring and it'll hatch before you know it!`], null, who);
    }, who), who);
  const mood = steps < 60 ? 'It has only just settled in. Take it for a little walk first... well, take YOURSELF for a walk!' : steps < 600 ? 'It\'s been chasing the other critters round the rug all day.' : steps < 2000 ? 'It\'s grown so much stronger! It practises its moves on the sofa cushions.' : 'It\'s as strong as my lessons can make it. It misses you!';
  w.say([`${who}: ${name} is having a lovely time! You've walked ${steps} step${steps === 1 ? '' : 's'} since you left it with me.`, `${who}: ${mood}`],
    () => w.ask(`Take ${name} back?`, ['Take it back', 'Leave it longer'], (i) => {
      if (i) return w.say([`${who}: Righto! ${name} and I will be right here.`], null, who);
      const rr = grantXp(c.id, careXp(c)); A.care = null; countUp('care'); persist(); sfx.jingle?.(rr.to > rr.from ? 2 : 1);
      w.fade(() => { w.load(w.key, w.hx, w.hy, w.dir); w.say([`${name} bounds back to {hero} for a big hug!`, rr.to > rr.from ? `${name} grew to Lv ${rr.to}! Nanny Nell waves goodbye.` : `${name} picked up a little experience. (+XP)`]); });
    }, who), who);
}

export function countUp(k) { (save.adv.cnt ||= {})[k] = (save.adv.cnt[k] || 0) + 1; }
function requestBoard(S, w) {
  const day = new Date().toISOString().slice(0, 10), F = flags();
  let R = save.adv.req;
  if (R?.day !== day) {
    let h = 7; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) % 2147483647;
    const pool = Object.keys(REQUESTS).filter((k) => !REQUESTS[k].need || F[REQUESTS[k].need]), pick = [];
    while (pick.length < 3 && pool.length) { h = (h * 16807) % 2147483647; pick.push(pool.splice(h % pool.length, 1)[0]); }
    R = save.adv.req = { day, list: pick, base: Object.fromEntries(pick.map((k) => [k, REQUESTS[k].now()])), paid: [] };
    persist();
  }
  const prog = (k) => Math.min(REQUESTS[k].n, REQUESTS[k].now() - R.base[k]);
  const lines = R.list.map((k) => `${prog(k) >= REQUESTS[k].n ? '✅' : '⬜'} ${REQUESTS[k].text}${REQUESTS[k].n > 1 ? ` (${prog(k)}/${REQUESTS[k].n})` : ''}`);
  const fresh = R.list.filter((k) => prog(k) >= REQUESTS[k].n && !R.paid.includes(k));
  const out = ['📋 Today\'s requests:\n' + lines.join('\n')];
  if (fresh.length) {
    R.paid.push(...fresh); save.berries = (save.berries || 0) + fresh.length * 2;
    out.push(`Request${fresh.length > 1 ? 's' : ''} done! The board pays ${fresh.length * 2} 🍓.`);
    if (R.paid.length === R.list.length) {
      const h = save.adv.hero, c = save.critters[h], r = grantXp(h, Math.round(xpNeeded(c.level) * 0.4));
      out.push(`All three done! A Power Snack for {hero}! ⭐`, r.to > r.from ? `{hero} grew to Lv ${r.to}!` : '{hero} feels stronger! (+XP)');
    }
    persist(); sfx.jingle(2);
  } else out.push(R.paid.length === R.list.length ? 'All done for today. New requests tomorrow!' : 'Finish a request, then come back to this board for berries.');
  w.say(out);
}

// a list too long for one row of answer buttons: three to a page, then "More"
function pickPaged(w, q, labels, cb, who, page = 0) {
  const per = 3, n = labels.length, slice = labels.slice(page * per, page * per + per), more = n > per;
  const opts = [...slice, ...(more ? ['More ▶'] : []), 'Bye'];
  w.ask(q, opts, (i) => {
    if (i < slice.length) return cb(page * per + i);
    if (more && i === slice.length) return pickPaged(w, q, labels, cb, who, (page + 1) % Math.ceil(n / per));
    cb(-1);
  }, who);
}

// townsfolk side quests: someone lost something; it turns up in another place (world.js LOST_SPOTS draws it there)
const LOST = {
  kite: {
    who: 'Kite Flyer Gale', item: 'kite', hat: 'aviator', berries: 3, toast: '🪁', hint: "look in Frostpeak's snowy trees", home: 'Cloudtop Gardens',
    ask: ['Kite Flyer Gale: Wheee... oh. Hello. Sorry, I\'m a bit down. A gust snatched my kite right out of my wings!', 'Kite Flyer Gale: It flew off over the clouds toward Frostpeak. If you ever go there, could you look in the snowy trees for it?', 'Kite Flyer Gale: Red and yellow, with a long bow tail. I\'d be ever so grateful!'],
    wait: ['Kite Flyer Gale: Any luck? It\'s red and yellow with a long bow tail. The wind blew it toward Frostpeak. Check the trees!'],
    found: ['There\'s a red and yellow kite tangled in the branches! {hero} wiggles it free.', 'Kite Flyer Gale in Cloudtop Gardens will be so happy!'],
    done: ['Kite Flyer Gale: Is that... MY KITE?! You found it! A bit frosty, but not a scratch!', 'Kite Flyer Gale: Here, my spare Aviator Cap, goggles and all. And some berries for the trip!', '{hero} got the Aviator Cap! 🧢 +3 🍓', 'Kite Flyer Gale: Wear it from the wardrobe at home or at the Hat Shop. Up, up and away!'],
  },
  camera: {
    who: 'Tourist Bo', item: 'camera', snack: true, berries: 3, toast: '📷', hint: "on a rock at the east end of Cinder Road", home: 'Cinder Town',
    ask: ['Tourist Bo: Oh no, oh no. My camera! I had it on Cinder Road, snapping the lava river... and then a vent went WHOOSH and I ran.', 'Tourist Bo: I think I put it down on a rock. Way out east, past the bridge. Could you have a look?'],
    wait: ['Tourist Bo: Still no camera? I left it on a rock at the far east end of Cinder Road, up near the top. Probably toasty by now!'],
    found: ['A camera sits on a warm rock, a bit sooty but fine. {hero} picks it up carefully.', 'Tourist Bo in Cinder Town must be missing it!'],
    done: ['Tourist Bo: MY CAMERA! And look, it still works! ...Oh, it took a photo of a very surprised Kindlekit.', 'Tourist Bo: You\'re a hero! Please, take these berries, and my emergency Power Snack.', '{hero} got 3 berries and a Power Snack! ⭐'],
  },
  pearl: {
    who: 'Shell Collector Mei', item: 'pearl', hat: 'sailor', berries: 2, toast: '🦪', hint: "under a palm on Route 2", home: 'Seashell Town',
    ask: ['Shell Collector Mei: My lucky pearl! I was showing it to the seagulls on Route 2 and one of them swooped and grabbed it!', 'Shell Collector Mei: Gulls drop shiny things by the palm trees across the river. Could you look there for me?'],
    wait: ['Shell Collector Mei: Did you find my pearl? Try the palms on Route 2, on the sandy side of the river.'],
    found: ['Tucked in a pink shell at the foot of a palm tree... a shining pearl! {hero} scoops it up.', 'Shell Collector Mei in Seashell Town will be thrilled!'],
    done: ['Shell Collector Mei: My lucky pearl! You found it! Oh, I could hug you. I won\'t. Sand everywhere.', 'Shell Collector Mei: Here, this Sailor Hat was my grandpa\'s. He\'d want an adventurer to wear it!', '{hero} got the Sailor Hat! ⚓ +2 🍓'],
  },
  carrot: {
    who: 'Snowball Kid Kip', item: 'carrot', hat: 'muffs', berries: 2, toast: '🥕', hint: "somewhere in Cloudtop Gardens", home: 'Frostpeak',
    ask: ['Snowball Kid Kip: Waaah! Somebody pinched my snowman\'s carrot nose! Now he just looks... surprised.', 'Snowball Kid Kip: I saw a critter fly off with it. Up toward the clouds! Cloudtop Gardens, maybe?'],
    wait: ['Snowball Kid Kip: My snowman is still noseless. Check Cloudtop Gardens! Somebody up there likes carrots.'],
    found: ['On a mossy rock: one carrot, with a tiny nibble out of the end. {hero} takes it.', 'Snowball Kid Kip in Frostpeak needs this back!'],
    done: ['Snowball Kid Kip: His NOSE! You found his nose! Ha ha, it has a bite out of it. He looks like he\'s winking now.', 'Snowball Kid Kip: Take my spare earmuffs! They\'re super toasty.', '{hero} got the Fluffy Earmuffs! +2 🍓'],
  },
  binos: {
    who: 'Owl Watcher Wren', item: 'binoculars', snack: true, berries: 2, toast: '🔭', hint: "on a low branch in Glowcap Woods", home: 'Glowcap Hollow',
    ask: ['Owl Watcher Wren: Hoo... hoo... where are my binoculars? I was critter-watching in Glowcap Woods and hung them on a branch...', 'Owl Watcher Wren: A low tree just west of the path, south of the old bridge. Could you fetch them for me?'],
    wait: ['Owl Watcher Wren: My binoculars should be hanging on a low branch in Glowcap Woods, west of the path. Hoo!'],
    found: ['A pair of binoculars dangles from a low branch by its strap. {hero} unhooks them.', 'Owl Watcher Wren in Glowcap Hollow will want these!'],
    done: ['Owl Watcher Wren: My binoculars! Hoo hoo hoo! Now I can see EVERYTHING again.', 'Owl Watcher Wren: Please, have my trail snack and some berries. You\'ve earned them.', '{hero} got 2 berries and a Power Snack! ⭐'],
  },
  ball: {
    who: 'Lilypop', item: 'bouncy ball', hat: 'propeller', berries: 2, toast: '⚽', hint: "by the rock in the middle of Route 1", home: 'Sprout Village',
    ask: ['Lilypop: Ribbit... I kicked my bouncy ball SO hard it bounced all the way up onto Route 1!', 'Lilypop: I\'m not allowed in the tall grass on my own. It stopped near the big rock in the middle, I think. Can you get it? Pleeease?'],
    wait: ['Lilypop: My ball is up on Route 1, by the big rock in the middle. Red and white! Ribbit!'],
    found: ['A red and white bouncy ball is wedged against the rock. {hero} gives it a test bounce. BOING!', 'Lilypop in Sprout Village will be so happy!'],
    done: ['Lilypop: My ball! My BALL! RIBBIT! Thank you thank you thank you!', 'Lilypop: You can have my Propeller Cap. It doesn\'t really fly. I checked. Twice.', '{hero} got the Propeller Cap! 🧢 +2 🍓', 'Lilypop: Wear it from the wardrobe at home!'],
  },
  can: {
    who: 'Gardener Bea', item: 'watering can', hat: 'straw', berries: 2, toast: '🪴', hint: "on a rock at the south end of Route 1", home: 'Bloom Town',
    ask: ['Gardener Bea: Oh, petals! I went to water the wild flowers on Route 1 and came back without my watering can.', 'Gardener Bea: I set it down on a rock near the bottom of the route, by the flowers. My knees aren\'t what they were. Could you fetch it?'],
    wait: ['Gardener Bea: My watering can should be on a rock at the south end of Route 1, on the west side. It\'s green with a sunflower on it!'],
    found: ['A green watering can with a painted sunflower sits on the rock, still half full. {hero} carries it carefully.', 'Gardener Bea in Bloom Town will be glad to see it!'],
    done: ['Gardener Bea: My watering can! And you didn\'t spill a drop. Well, only a few. The grass is grateful.', 'Gardener Bea: Take my old Straw Hat. It keeps the sun off while you\'re out exploring.', '{hero} got the Straw Hat! 👒 +2 🍓'],
  },
  phones: {
    who: 'DJ Tumble', item: 'headphones', hat: 'phones', berries: 3, toast: '🎧', hint: "on a rock by the hot springs in Cinder Town", home: 'Neon City',
    ask: ['DJ Tumble: Yo... the show must go on, but my headphones went OFF. Like, off my head. Gone.', 'DJ Tumble: I was chilling at the hot springs in Cinder Town before the gig. Put them on a rock up by the steam, top right corner. Then I forgot them!', 'DJ Tumble: Bring them back and I\'ll hook you up. DJ\'s honour.'],
    wait: ['DJ Tumble: No headphones yet? Cinder Town, the rock by the hot springs, top right. They\'re pink. You can\'t miss them. Probably.'],
    found: ['A pair of pink headphones sits on a warm rock by the steaming spring. A tiny beat still thumps out of them.', 'DJ Tumble in Neon City needs these for tonight\'s show!'],
    done: ['DJ Tumble: MY CANS! Aw yeah, the bass is back! Jiggawatt, cue the lights!', 'DJ Tumble: I\'ve got a spare pair. Pink and loud, just like the city. They\'re yours.', '{hero} got the DJ Headphones! 🎧 +3 🍓'],
  },
  seeds: { // a delivery, not a lost thing: carry the packet to someone in another town (they give the reward)
    who: 'Gardener Rosa', item: 'cloud seeds', hat: 'seedling', berries: 2, toast: '🌱', home: 'Cloudtop Gardens', to: { npc: 'castle', map: 'seashell', name: 'Diggles', home: 'Seashell Town' },
    ask: ['Gardener Rosa: Oh, hello! Could you do an old gardener a favour? These are cloud seeds. Plant one and a fluffy cloud flower pops up!', 'Gardener Rosa: Diggles in Seashell Town wrote to me. They want one for the top of their sandcastle. Could you carry the packet down there?', '{hero} got a packet of cloud seeds! 🌱 Take it to Diggles in Seashell Town.'],
    wait: ['Gardener Rosa: Did the seeds get to Diggles yet? Seashell Town, by the sandcastle. Keep them dry!'],
    done: ['Diggles: A packet... from Rosa?! CLOUD SEEDS! For MY castle?!', 'Diggles plants one right on top of the tallest tower. POOF! A little cloud flower puffs up!', 'Diggles: It\'s perfect. The greatest sandcastle in Clashara now has a CLOUD on it! Here, take this. I grew it on my head by accident.', '{hero} got the Seedling Sprout! 🌱 +2 🍓'],
  },
  cocoa: {
    who: 'Smith Ash', item: 'cocoa beans', hat: 'bobble', snack: true, berries: 0, toast: '☕', home: 'Cinder Town', to: { npc: 'cocoa', map: 'frostpeak', name: 'Cocoa Seller Cora', home: 'Frostpeak' },
    thanks: 'Smith Ash: Cora sent a postcard. It just says "COCOA!!!" in very big letters. I think she\'s happy.',
    after: ['Cocoa Seller Cora: Hot cocoa! Roasted in a volcano, sold on a mountain. Best in Clashara!'],
    ask: ['Smith Ash: Psst. You heading up to Frostpeak? Cocoa Seller Cora ran out of cocoa ages ago. Poor thing.', 'Smith Ash: I roast cocoa beans on the forge chimney. Nothing roasts like volcano heat! Could you take her this sack?', '{hero} got a sack of roasted cocoa beans! ☕ Take it to Cocoa Seller Cora in Frostpeak.'],
    wait: ['Smith Ash: Cora\'s the one by the Berry Center in Frostpeak. Go on, before the beans get cold! ...Well. Colder.'],
    done: ['Cocoa Seller Cora: Is that... COCOA BEANS? Roasted? From Smith Ash?! Oh, you lovely little courier!', 'Cora brews a mug on the spot and hands it to {hero}. It\'s warm all the way to the paws!', 'Cocoa Seller Cora: And take this. I knitted it while I had nothing to sell. Which was a long time!', '{hero} got the Cocoa Bobble Hat and a mug of cocoa (a Power Snack)! ☕'],
  },
  letter: {
    who: 'Pricklepuff', item: 'letter', berries: 3, snack: true, toast: '✉️', home: 'Bloom Town', to: { npc: 'elder', map: 'frostpeak', name: 'Old Snoozlo', home: 'Frostpeak' },
    thanks: 'Pricklepuff: Grandpa Snoozlo wrote back! Well, he drew a picture of himself asleep. Same thing!',
    after: ['Old Snoozlo: ...zzz... Little Pricklepuff\'s letter... I read it every morning... then I nap... zzz...'],
    ask: ['Pricklepuff: Spiky hello! My grandpa lives way up in Frostpeak. He\'s Old Snoozlo, the sleepy one.', 'Pricklepuff: I wrote him a letter, but the post critter says nobody delivers that far. Could YOU take it?', '{hero} got Pricklepuff\'s letter! ✉️ Take it to Old Snoozlo in Frostpeak.'],
    wait: ['Pricklepuff: Grandpa Snoozlo lives in Frostpeak, the very last town before the Peak. He\'s usually... asleep. Just wake him gently!'],
    done: ['Old Snoozlo: ...zzz... hm? A letter? From... little Pricklepuff? ...Oh my. Oh my my.', 'Old Snoozlo reads it three times, very slowly, and smiles.', 'Old Snoozlo: Thank you, young one... Here. Berries, and my secret Power Snack... zzz...', '{hero} got 3 berries and a Power Snack! ⭐'],
  },
  blink: {
    who: 'Firefly Flo', critter: 'emberfly', giverMap: 'bloom', item: 'firefly', berries: 3, snack: true, toast: '✨', hint: 'glowing on a rock on Route 2, south of the path', home: 'Bloom Town',
    ask: ['Firefly Flo: Bzz... one of my glow friends didn\'t come back this morning. Blink! The smallest one, with the brightest tail.', 'Firefly Flo: Blink loves warm rocks by the river. Could you look on Route 2? Blink glows, so you can\'t miss it!'],
    wait: ['Firefly Flo: Still no Blink? Try the rocks on Route 2, on the grassy side south of the path. Look for a little glow!'],
    found: ['A tiny firefly blinks hello from the warm rock. It\'s Blink! It hops onto {hero}\'s nose. Tickly!', 'Firefly Flo in Bloom Town will be so happy!'],
    done: ['Firefly Flo: BLINK! You found Blink! Bzz bzz bzz!', 'Blink zips round the room and dives back into the jar with the others. The whole jar glows brighter!', 'Firefly Flo: Thank you! Here: berries, and the honey snack I was saving. You earned it!', '{hero} got 3 berries and a Power Snack! ⭐'],
  },
  fan: {
    who: 'Tinker Volt', item: 'pocket fan', hat: 'visor', berries: 3, toast: '🌀', home: 'Neon City', to: { npc: 'spa', map: 'ember', name: 'Pengsicle', home: 'Cinder Town' },
    thanks: 'Tinker Volt: Pengsicle sent me a photo. It\'s just a very happy face and a lot of frost. Ten out of ten!',
    after: ['Pengsicle: Ahhh... the little fan hums all day. I can finally enjoy the hot springs! Chilly AND cosy!'],
    ask: ['Tinker Volt: Hey, you look like you travel! I built a thing. A pocket fan! It runs on one tiny spark and blows ice-cold air.', 'Tinker Volt: There\'s a Pengsicle melting at the hot springs in Cinder Town. It wrote to the city for help. Could you take the fan to it?', '{hero} got a pocket fan! 🌀 Take it to Pengsicle at the hot springs in Cinder Town.'],
    wait: ['Tinker Volt: The melting Pengsicle sits by the hot springs in Cinder Town, top right. Hurry, before it\'s a puddle!'],
    done: ['Pengsicle: Is that... a FAN? For ME? From the big city?!', 'Pengsicle switches it on. WHIRRR! A frosty breeze! Little snowflakes swirl around its beak.', 'Pengsicle: I can feel my flippers again! Here, take my visor. I won\'t need the shade any more!', '{hero} got the Frosty Visor! 🕶️ +3 🍓'],
  },
  charm: {
    who: 'Surfer Pengsicle', item: 'sea-glass charm', berries: 3, snack: true, toast: '🌊', home: 'Seashell Town', to: { npc: 'old', map: 'bloom', name: 'Old Snoozlo', home: 'Bloom Town' },
    thanks: 'Surfer Pengsicle: Old Snoozlo wrote back! He says he still floats like a log. A very proud log. Waddle waddle!',
    after: ['Old Snoozlo: See this charm? A Pengsicle I taught to float made it for me. Floating is mostly napping, you know. On water.'],
    ask: ['Surfer Pengsicle: Psst! You\'re going inland, right? When I was a chick, an old Snoozlo in Bloom Town taught me to float. I sank a LOT before that.', 'Surfer Pengsicle: I made him a charm out of sea glass to say thanks. Could you take it to him? He naps by the pond all day, so try after dark!', '{hero} got a sea-glass charm! 🌊 Take it to Old Snoozlo in Bloom Town.'],
    wait: ['Surfer Pengsicle: Old Snoozlo naps by the pond in Bloom Town. He only really wakes up after dark!'],
    done: ['Old Snoozlo: Mm? A charm... made of sea glass? From that little Pengsicle who kept sinking?!', 'Old Snoozlo holds it up to the lamplight. It glows sea-green. His sleepy eyes go a bit misty.', 'Old Snoozlo: Tell the young one... well, it\'s not so young now, is it? Here. Berries, and a snack for the road.', '{hero} got 3 berries and a Power Snack! ⭐'],
  },
  honey: {
    who: 'Elder Oakley', item: 'jar of glowcap honey', berries: 2, snack: true, toast: '🍯', home: 'Glowcap Hollow', to: { npc: 'mom', map: 'village', name: 'Mom', home: 'Sprout Village' },
    thanks: 'Elder Oakley: Hoo hoo. Your mother sent a stack of pancakes back with a squirrel. They were... mostly there. Delicious!',
    after: ['Mom: Glowcap honey on pancakes! Oakley always did have the best ideas. Want some? There\'s plenty!'],
    ask: ['Elder Oakley: Hoo hoo. You\'re from Sprout Village, aren\'t you? Then I know your mother! She sent me pancakes when I was poorly last winter.', 'Elder Oakley: The glowcaps make the sweetest honey in the Hollow. Would you take her a jar? It glows a little. Don\'t let that worry you.', '{hero} got a jar of glowcap honey! 🍯 Take it to Mom in Sprout Village.'],
    wait: ['Elder Oakley: Your mother is in Sprout Village, of course. Mind the jar, it\'s sticky.'],
    done: ['Mom: Is that honey from Elder Oakley? It\'s GLOWING! Oh, how lovely!', 'Mom dips a pinky in the jar. Then another pinky. Then a spoon.', 'Mom: Pancakes with glowcap honey tomorrow, I promise! Here, sweetie: some berries and a snack. Thank Oakley for me!', '{hero} got 2 berries and a Power Snack! ⭐'],
  },
  lamp: {
    who: 'Mushroom Fan Fen', item: 'glowcap night-light', hat: 'nightcap', berries: 2, toast: '🍄', home: 'Glowcap Hollow', to: { npc: 'picnic', map: 'cloudtop', name: 'Picnicker Puff', home: 'Cloudtop Gardens' },
    thanks: 'Mushroom Fan Fen: Puff says the night-light makes the clouds glow pink. Best. Naps. Ever. That\'s what the letter said!',
    after: ['Picnicker Puff: Zzz... the little glowcap glows all night... and I nap all day... perfect... zzz...'],
    ask: ['Mushroom Fan Fen: Ooh, a traveller! Do you ever go up to Cloudtop Gardens? Picnicker Puff naps up there all day.', 'Mushroom Fan Fen: Puff says the clouds get too dark at night to find the picnic basket. So I grew a tiny glowcap night-light! Could you carry it up?', '{hero} got a glowcap night-light! 🍄 Take it to Picnicker Puff in Cloudtop Gardens.'],
    wait: ['Mushroom Fan Fen: Picnicker Puff is the sleepy one on the picnic blanket in Cloudtop Gardens. You may have to wake them!'],
    done: ['Picnicker Puff: Zzz... mm? A present? ...A GLOWCAP?! It glows! Now I can find the basket in the dark!', 'Puff sets the little mushroom by the blanket. It glows a soft pink.', 'Picnicker Puff: Here, you should have my spare nightcap. Every good napper needs one... zzz...', '{hero} got the Sleepy Nightcap! 🌙 +2 🍓'],
  },
};
// the ☰ card's favour line: the first favour still open (found things first)
export function favourLine() {
  const F = flags(), open = Object.entries(LOST).filter(([id]) => F[id + '_asked'] && !F[id + '_done']).sort(([a], [b]) => !!F[b + '_found'] - !!F[a + '_found']);
  if (!open.length) return '';
  const [id, Q] = open[0], name = Q.who.split(' ').pop();
  return (Q.to ? `Take the ${Q.item} to ${Q.to.name} in ${Q.to.home}` : F[id + '_found'] ? `Take the ${Q.item} back to ${name} in ${Q.home}` : `${name}'s ${Q.item}: ${Q.hint}`) + (open.length > 1 ? ` (+${open.length - 1} more)` : '');
}
// the ☰ Journal's favour page: every favour you've been asked for (open first), and how many townsfolk still need a hand
export function favourList() {
  const F = flags(), rows = Object.entries(LOST).filter(([id]) => F[id + '_asked']).map(([id, Q]) => {
    const state = F[id + '_done'] ? 'done' : F[id + '_found'] ? 'found' : 'open';
    const name = Q.who.split(' ').pop();
    const home = Q.giverMap || Object.keys(MAPS).find((k) => (MAPS[k].npcs || []).some((n) => n.story === 'lost:' + id));
    return { id, who: Q.who, home: Q.home, item: Q.item, toast: Q.toast, state, deliver: !!Q.to, critter: Q.critter, at: state === 'done' ? null : Q.to ? Q.to.map : state === 'found' ? home : LOST_SPOTS[id]?.map, text: Q.to ? (state === 'done' ? `Delivered the ${Q.item} to ${Q.to.name}` : `Take the ${Q.item} to ${Q.to.name} in ${Q.to.home}`) : state === 'done' ? `Returned the ${Q.item}` : state === 'found' ? `Take the ${Q.item} back to ${name} in ${Q.home}` : `Find the ${Q.item}: ${Q.hint}` };
  });
  rows.sort((a, b) => ({ found: 0, open: 1, done: 2 })[a.state] - ({ found: 0, open: 1, done: 2 })[b.state]);
  return { rows, unasked: Object.keys(LOST).length - rows.length };
}
// a townsperson waiting for a delivery you're carrying (their talk turns into the hand-over)
export function deliveryFor(npc) {
  const F = flags(); return Object.keys(LOST).find((id) => LOST[id].to?.npc === npc && F[id + '_asked'] && !F[id + '_done']) || null;
}
// what a delivery's recipient says once they have it
export function deliveredLine(npc) {
  const F = flags(), id = Object.keys(LOST).find((k) => LOST[k].to?.npc === npc && F[k + '_done']); return id && LOST[id].after ? LOST[id].after : null;
}
function lostQuest(S, w, a, key) {
  const F = flags(), [kind, id] = key.split(':'), Q = LOST[id], who = Q.who;
  if (kind === 'deliver') { // hand the parcel over: the one you brought it to gives the reward
    F[id + '_found'] = F[id + '_done'] = true;
    if (Q.hat) { const own = (save.adv.hats ||= []); if (!own.includes(Q.hat)) own.push(Q.hat); }
    save.berries = (save.berries || 0) + (Q.berries || 0);
    const out = [...Q.done];
    if (Q.snack) { const h = save.adv.hero, c = save.critters[h], r = grantXp(h, Math.round(xpNeeded(c.level) * 0.4)); if (r.to > r.from) out.push(`{hero} grew to Lv ${r.to}!`); }
    persist(); w.questMarks?.(); sfx.jingle(3); S.toast(`${Q.toast} Delivered the ${Q.item}!`);
    return w.say(out, null, Q.to.name);
  }
  if (kind === 'found') {
    F[id + '_found'] = true; persist(); sfx.jingle(2); w.buildLost?.(); w.questMarks?.(); S.toast(`${Q.toast} Found the ${Q.item}!`);
    return w.say(Q.found);
  }
  if (F[id + '_done'] && id === 'kite' && w.flyKite) return w.flyKite(who); // Gale lends the kite back: fly it together
  if (F[id + '_done']) return w.say(Q.to ? [Q.thanks || `${who}: ${Q.to.name} sent me a drawing of the cloud flower on the castle. Thank you, little courier!`] : [a.n.lines[Math.floor(Math.random() * a.n.lines.length)]], null, who);
  if (F[id + '_found']) {
    F[id + '_done'] = true;
    if (Q.hat) { const own = (save.adv.hats ||= []); if (!own.includes(Q.hat)) own.push(Q.hat); }
    save.berries = (save.berries || 0) + (Q.berries || 0);
    const out = [...Q.done];
    if (Q.snack) { const h = save.adv.hero, c = save.critters[h], r = grantXp(h, Math.round(xpNeeded(c.level) * 0.4)); if (r.to > r.from) out.push(`{hero} grew to Lv ${r.to}!`); }
    persist(); w.questMarks?.(); sfx.jingle(3); S.toast(`${Q.toast} ${Q.item[0].toUpperCase() + Q.item.slice(1)} returned!`);
    return w.say(out, null, who);
  }
  if (F[id + '_asked']) return w.say(Q.wait, null, who);
  F[id + '_asked'] = true; persist(); w.questMarks?.();
  return w.say(Q.ask, null, who);
}

// Trader Tock turns up in a different town each day with hats the shop doesn't sell
function trader(w) {
  const A = save.adv, own = (A.hats ||= []), who = 'Trader Tock';
  // two of the rare hats in the bag each week (Monday to Sunday), rotating through all of them
  const all = SHOP_HATS.filter((h) => h.trader), wk = Math.floor((Date.now() / 86400000 + 3) / 7);
  const week = [all[(wk * 2) % all.length], all[(wk * 2 + 1) % all.length]];
  const stock = week.filter((h) => !own.includes(h.id));
  if (!stock.length) return w.say([all.every((h) => own.includes(h.id)) ? 'Trader Tock: Tock tock! You own every hat I\'ve ever found. A true collector!' : 'Trader Tock: Tock tock! You bought this week\'s hats. Come back next week. I\'ll have new ones in the bag!'], null, who);
  w.say(['Trader Tock: Tock tock! A traveller, like me! I wander a new town every day, and my bag changes every week.'], () => { w.busy = true; w.S.hatGrid('Trader Tock: Rare hats from far away!', stock, (id) => {
    w.busy = false;
    const h = stock.find((x) => x.id === id);
    if ((save.berries || 0) < h.price) return w.say([`Trader Tock: ${h.price} berries, friend. Shake some bushes and catch me before the day is out!`], null, who);
    save.berries -= h.price; own.push(h.id); A.hat = h.id; persist(); sfx.jingle(2); w.wearHat();
    w.say([`{hero} got the ${h.name}! 🎩`, 'Trader Tock: Splendid! Nobody else in Clashara has one of those.'], null, who);
  }, () => { w.busy = false; w.say(['Trader Tock: Look for me tomorrow. Different town, and new hats every week!'], null, who); }, true); }, who);
}

// the Neon City arcade cabinets: a 30-second berry-catching game; the first good score each day pays out in berries
// post-game: the Peak Gauntlet. Five Ace battles in a row on the summit, a new line-up every week (Monday to Sunday).
// Each win is saved, so a loss only means trying that battle again. Clearing all five pays 8 berries, and the first clear ever the Golden Laurel.
const ACES = ['Ace Juno', 'Ace Rocco', 'Ace Tamsin', 'Ace Kenji', 'Ace Willa', 'Ace Ozzie', 'Ace Priya', 'Ace Bram', 'Ace Suki', 'Ace Leif'];
export function gauntletWeek(now = Date.now()) { return Math.floor((now / 864e5 + 3) / 7); } // weeks start on a Monday
// each week has a theme: two types, so the five Aces come from those two (topped up from the rest if the hero is one of them)
export function gauntletTheme(wk) {
  const t = Object.keys(TYPES), pairs = [];
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) pairs.push([t[i], t[j]]);
  return pairs[((wk * 7) % pairs.length + pairs.length) % pairs.length];
}
export function gauntletFoes(wk, hero) {
  let h = (wk * 2654435761) >>> 0; const r = () => ((h = (h * 1103515245 + 12345) >>> 0) >>> 8) / 16777216;
  const th = gauntletTheme(wk), all = CRITTERS.filter((c) => c.id !== hero);
  const pool = all.filter((c) => th.includes(c.type)).map((c) => c.id), rest = all.filter((c) => !th.includes(c.type)).map((c) => c.id), out = [];
  while (out.length < 5) { const from = pool.length ? pool : rest, id = from.splice(Math.floor(r() * from.length), 1)[0]; out.push({ id, name: ACES[(wk + out.length * 3) % ACES.length] }); }
  return out;
}
function gauntlet(S, w) {
  const F = save.adv.flags, A = save.adv, wk = gauntletWeek(), foes = gauntletFoes(wk, A.hero), th = gauntletTheme(wk), who = 'Keeper Orla';
  const n = foes.findIndex((_, i) => !F[`gaunt_${wk}_${i}`]);
  if (n < 0) {
    if (!F['gauntpay_' + wk]) { // paid out once per week, the first time you talk after the fifth win
      F['gauntpay_' + wk] = true; save.berries = (save.berries || 0) + 8;
      const first = !(A.hats || []).includes('laurel');
      if (first) (A.hats ||= []).push('laurel');
      A.gauntWins = (A.gauntWins || 0) + 1; persist(); sfx.jingle(3);
      return w.say([`${who}: All five Aces, down in one week! You really are the Champion.`, '{hero} got 8 🍓!', ...(first ? ['{hero} got the Golden Laurel! 🏅 (Wear it from ☰ → 🎩 Hats.)'] : []), `${who}: A new line-up climbs the mountain every Monday. See you then!`], null, who);
    }
    return w.say([`${who}: This week's Gauntlet is cleared. The next five Aces arrive on Monday!`], null, who);
  }
  const f = foes[n], lv = Math.min(50, save.critters[A.hero].level + 1 + n), def = byId(f.id);
  w.say([
    ...(n === 0 ? [`${who}: Hoo-hoo! Welcome to the Peak Gauntlet, Champion. Five Ace trainers, one after another. A new five every week.`, `${who}: This is ${TYPES[th[0]].name} & ${TYPES[th[1]].name} week! The Aces bring ${foes.map((q) => byId(q.id).name).slice(0, 4).join(', ')} and ${byId(foes[4].id).name}. Win them all this week and the mountain rewards you. Lose, and you simply try that one again.`] : []),
    `${who}: Battle ${n + 1} of 5: ${f.name} and ${def.name}, Lv ${lv}. Ready?`,
  ], () => S.worldFight({
    foe: withGear(def, lv), lv, kind: 'story', flag: `gaunt_${wk}_${n}`, name: f.name, diff: Math.min(0.92, 0.74 + n * 0.04), berries: 2,
    trainer: { name: f.name, critter: f.id, title: `Gauntlet ${n + 1}/5`, beat: n === 4 ? 'The last Ace falls! Go tell Orla!' : 'Well fought. The next Ace is waiting.', gloat: 'The Gauntlet stands! Come back and try again.' },
    note: n === 4 ? '🏔️ Peak Gauntlet cleared! Talk to Keeper Orla.' : `🏔️ Gauntlet ${n + 1}/5 won! +2 🍓`,
  }), who);
}

// SKY HOP (the right-hand cabinets) keeps its own best score and its own daily prize
function arcade(S, w, hop) {
  const A = save.adv, day = new Date().toISOString().slice(0, 10), HI = hop ? 'hopHi' : 'arcadeHi', DAY = hop ? 'hopDay' : 'arcadeDay', hi = A[HI] || 0;
  const [lo, mid, top] = hop ? [40, 100, 200] : [60, 150, 300];
  w.ask(hop ? `SKY HOP! The high score board says VOLT, 8,888 (he says so, anyway). ${hi ? `{hero}'s best: ${hi}.` : 'Tap to flap through the gaps!'}${A[DAY] !== day ? ' Today\'s first good score wins berries!' : ''}`
    : `CRITTER CLASH TURBO! Top score: VOLT, 999,999 (he says). ${hi ? `{hero}'s best: ${hi}.` : 'Catch berries, dodge the zaps!'}${A[DAY] !== day ? ' Today\'s first good score wins berries!' : ''}`, ['Play!', 'Not now'], (i) => {
    if (i) return;
    w.busy = true;
    const el = (hop ? skyHop : arcadeGame)(S.root, S.game.portrait(w.hero.def), (score) => {
      S.game.modalClose = null; w.busy = false;
      const best = score > hi; if (best) A[HI] = score;
      let prize = 0;
      if (A[DAY] !== day) { prize = score >= top ? 3 : score >= mid ? 2 : score >= lo ? 1 : 0; if (prize) { A[DAY] = day; save.berries = (save.berries || 0) + prize; } }
      persist(); if (best || prize) sfx.jingle(2);
      w.say([`GAME OVER! Score: ${score}.${best ? ' A new best! 🏆' : ''}`, ...(prize ? [`The cabinet rattles... and drops ${prize} 🍓! (One prize a day.)`] : A[DAY] !== day ? [`Score ${lo} or more to win berries! (One prize a day.)`] : [])]);
    });
    S.game.modalClose = () => el.__arcade.close();
  });
}

// Chef Rumi's noodle cart in Neon City: a bowl of spark noodles once a day (berries for XP), and a hat you can't get anywhere else
function noodleCart(w) {
  const A = save.adv, who = 'Noodle Chef Rumi', day = new Date().toISOString().slice(0, 10), own = (A.hats ||= []);
  const hat = SHOP_HATS.find((h) => h.id === 'boppers'), ate = A.noodles === day;
  const opts = [ate ? 'Noodles (tomorrow!)' : 'Spark Noodles (2 🍓)', ...(own.includes(hat.id) ? [] : [`${hat.name} (${hat.price} 🍓)`]), 'Bye'];
  w.ask(`${who}: Slurp up! Fresh spark noodles, hot all night. (You have ${save.berries || 0} 🍓)`, opts, (i) => {
    const pick = opts[i];
    if (pick === 'Bye') return w.say([`${who}: Come back hungry!`], null, who);
    if (pick.startsWith('Noodles')) return w.say([`${who}: One bowl a day, friend! Any more and {hero} would float away on the fizz.`], null, who);
    if (pick.startsWith('Spark')) {
      if ((save.berries || 0) < 2) return w.say([`${who}: Two berries a bowl! Shake a bush or two and come back.`], null, who);
      const h = A.hero, c = save.critters[h] || (save.critters[h] = { level: 1, xp: 0 });
      save.berries -= 2; A.noodles = day;
      const r = grantXp(h, Math.round(xpNeeded(c.level) * 0.4)); persist(); sfx.jingle(2);
      for (let k = 0; k < 10; k++) w.g.fx.spawn({ x: w.hero.root.position.x + (Math.random() - 0.5) * 0.8, y: 1.6, z: w.hero.root.position.z, vx: (Math.random() - 0.5) * 1.4, vy: 1.5 + Math.random() * 1.5, vz: (Math.random() - 0.5) * 1.4, color: Math.random() < 0.5 ? 0xffe04a : 0x5ae8ff, size: 0.16, life: 0.9, shape: 'spark' });
      return w.say(['*SLURRRP* Spark noodles! They fizz all the way down. 🍜⚡', r.to > r.from ? `{hero} grew to Lv ${r.to}!` : '{hero} is buzzing with energy! (+XP)'], null, who);
    }
    if ((save.berries || 0) < hat.price) return w.say([`${who}: The ${hat.name}? ${hat.price} berries. I made them from old arcade lights!`], null, who);
    save.berries -= hat.price; own.push(hat.id); A.hat = hat.id; persist(); sfx.jingle(2); w.wearHat();
    w.say([`{hero} got the ${hat.name}! 🎩`, `${who}: Now {hero} glows like a real Neon City local!`], null, who);
  }, who);
}

// pick a hat you own (from the Hat Shop, the wardrobe at home, or the ☰ menu)
export function wearHats(w) { return wearMenu(w, '', null); }
function wearMenu(w, who, back) {
  const A = save.adv, own = A.hats || [];
  if (!own.length) return w.say([who ? `${who}: You don't have any hats yet! Have a look around.` : 'The wardrobe is empty. The Hat Shop in Bloom Town sells hats for berries!'], back, who);
  const mine = SHOP_HATS.filter((h) => own.includes(h.id));
  // a grid of the hero wearing each hat: tap to try one on, Done to close
  w.busy = true;
  w.S.hatGrid(who ? `${who}: Which hat today?` : 'Which hat will {hero} wear?'.replace('{hero}', w.hero?.def?.name || 'your hero'), mine, (id) => { A.hat = id; persist(); w.wearHat(); }, () => {
    w.busy = false;
    const h = mine.find((x) => x.id === A.hat);
    w.say([h ? `{hero} is wearing the ${h.name}. Looking sharp!` : '{hero} goes without a hat. The wind feels nice!'], back, who);
  });
}

// Milliner Mo's Hat Shop in Bloom Town: buy hats with berries, then wear any you own
function hatShop(w) {
  const A = save.adv, own = (A.hats ||= []), isle = !!MAPS[w.key.split(':')[1]]?.isle, who = isle ? 'Shellkeeper Sandy' : 'Milliner Mo';
  const menu = () => w.ask(isle ? `Shellkeeper Sandy: Aloha! Island hats, woven by hand. (You have ${save.berries || 0} 🍓)` : `Milliner Mo: Welcome to the Hat Shop! A hat for every head. (You have ${save.berries || 0} 🍓)`, ['Buy a hat', 'Wear a hat', 'Bye'], (i) => {
    if (i === 0) {
      const left = SHOP_HATS.filter((h) => !own.includes(h.id) && !h.trader && !h.gift && !h.market && !!h.isle === isle);
      if (!left.length) return w.say([`${who}: You own every hat in the shop! A true hat collector. I\'m honoured!`], null, who);
      w.busy = true;
      return w.S.hatGrid(`${who}: Which one catches your eye?`, left, (id) => {
        w.busy = false;
        const h = left.find((x) => x.id === id);
        if ((save.berries || 0) < h.price) return w.say([`${who}: The ${h.name} is ${h.price} berries. Shake a few berry bushes and come back!`], menu, who);
        save.berries -= h.price; own.push(h.id); A.hat = h.id; persist();
        sfx.jingle(2); w.wearHat();
        w.say([`{hero} got the ${h.name}! 🎩`, `${who}: Oh, it suits {hero} perfectly! Swap hats here any time, or in the wardrobe at home.`], null, who);
      }, () => { w.busy = false; menu(); }, true);
    }
    if (i === 1) return wearMenu(w, who, menu);
    w.say([`${who}: Come again! Hats off to you!`], null, who);
  }, who);
  menu();
}

const heroLv = () => save.critters[save.adv.hero]?.level || 1;

// Champion's Peak: Dash's last stand before the Crown
function dashFinal(S, w) {
  const rid = rivalFor(save.adv.hero), rdef = byId(rid), lv = Math.max(18, heroLv() + 1);
  w.say([
    "Dash: There you are. I've been waiting up here for HOURS. My ears are frozen.",
    "Dash: Route 1, the Thunder Stadium, the woods, Neon City... you beat me every time. And you even saved my tail.",
    "Dash: But this is the top of the world. The Crown is RIGHT THERE. One more battle, {hero}. Everything we've got!",
    '{hero}: Everything we\'ve got. Let\'s go, Dash!',
  ], () => S.worldFight({
    foe: withGear(rdef, lv), lv, kind: 'story', flag: 'dash5', name: 'Rival Dash', diff: 0.78,
    trainer: { name: 'Dash', critter: rid, title: 'Your rival, all out', beat: "...Heh. Of course. You're the real deal, {name}. Go get that crown.", gloat: "I WON? I won! ...Come back and fight me again. It doesn't count unless you're at your best!" },
    note: '⚡ You beat Dash at the top of the world!',
  }));
}

function king(S, w) {
  const F = flags();
  if (F.crowned) { w.say(['King Snooze: Zzz... zzz... (The old king is sound asleep.)']); return; }
  if (!F.dash5) { w.say(['King Snooze: Zzz...']); return; }
  const lv = Math.max(22, heroLv() + 2);
  w.say([
    'King Snooze: ...Zzz... Hm? A challenger. Seven cups, a rival beaten, four trials passed... courage, strength, friendship, wisdom... and heart.',
    'King Snooze: I am the Crown Keeper. Wake me fully... and the Critter Crown is yours.',
    'King Snooze: *YAWWWN* ...Let us begin.',
  ], () => S.worldFight({
    foe: withGear(skinnedShiny('snoozlo'), lv), lv, kind: 'story', flag: 'crowned', name: 'King Snooze', diff: 0.88,
    trainer: { name: 'King Snooze', critter: 'snoozlo', title: 'The Crown Keeper', boss: true, beat: 'Hoo hoo... I am awake now. Truly awake. The Crown is yours.', gloat: 'Zzz... come back... when you can keep me up past my bedtime...' },
    note: "👑 You beat the Crown Keeper! The Critter Crown is yours!",
  }));
}

// Captain Puff flies the hero between Neon City, Cloudtop Gardens and Frostpeak
function balloon(S, w, a) {
  const F = flags(), dests = a.n.dest, open = dests.filter((d) => !d.need || F[d.need]);
  if (!open.length) {
    w.say(["Captain Puff: Ahoy! This balloon flies to Cloudtop Gardens, way up above the clouds.", "Captain Puff: But only Midnight Cup winners get a ticket. Rules of the sky!"]);
    return;
  }
  const go = (d) => {
    w.busy = true;
    w.say([`Captain Puff: Next stop, ${d.name}! Hold on to your ears!`], () => {
      w.busy = true;
      w.hero.root.visible = false; if (w.follower) w.follower.root.visible = false;
      a.fly = 0; sfx.jingle?.(2);
      setTimeout(() => w.fade(() => w.load(d.map, d.x, d.y, d.dir)), 1500);
    });
  };
  if (open.length === 1) {
    w.ask(`Captain Puff: Ahoy, {hero}! Fancy a ride to ${open[0].name}?`, ['Fly!', 'Not yet'], (i) => i === 0 && go(open[0]));
    return;
  }
  w.ask('Captain Puff: Ahoy, {hero}! Where to?', [...open.map((d) => d.name), 'Stay here'], (i) => open[i] && go(open[i]));
}

// Trial of Heart: the Night Gang has Dash cornered; the hero steps in to help the rival
function heart(S, w) {
  const F = flags(), rid = rivalFor(save.adv.hero), rdef = byId(rid);
  const vex = withGear(byId('kindlekit'), 16);
  w.say([
    `Vex: Ha! Look at your ${rdef.name}, Dash. Too tired to even spark!`,
    "Dash: Back off, Vex! We... we can still...",
    'Gang Grunt: The "fastest critter in Clashara" is all out of zoom!',
    '{hero}: HEY! Leave Dash alone!',
    "Dash: {hero}?! What are YOU doing here? I don't need your help!",
    `Vex: Ooh, a hero. Fine. My ${vex.name} will roast you both!`,
  ], () => S.worldFight({
    foe: vex, lv: 16, kind: 'story', flag: 'trial_heart', name: 'Vex', diff: 0.62,
    trainer: { name: 'Vex', critter: 'kindlekit', title: 'Night Gang boss', beat: "Tch. Whatever. C'mon, let's bail. This town's boring anyway.", gloat: 'Ha! Two losers for the price of one!' },
    note: '💖 Trial of Heart passed! You stood up for your rival.',
  }));
}

// Trial of Wisdom: the Stone Sage asks three questions; one wrong answer and it's a battle instead
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function typeQuiz(used) {
  const ids = Object.keys(TYPES).filter((t) => !used.includes(t)), x = ids[Math.floor(Math.random() * ids.length)];
  used.push(x);
  const right = Object.keys(TYPES).filter((t) => TYPES[t].beats.includes(x));
  const wrong = shuffle(Object.keys(TYPES).filter((t) => !right.includes(t))).slice(0, 2);
  const ans = right[Math.floor(Math.random() * right.length)];
  const opts = shuffle([ans, ...wrong]);
  return { q: `Stone Sage: A ${TYPES[x].name} critter blocks your path. Which type hits it hardest?`, opts: opts.map((t) => TYPES[t].name), right: opts.indexOf(ans) };
}
function sage(S, w) {
  const F = flags();
  if (F.trial_wisdom) return;
  const used = [];
  const tactic = shuffle(['Guard or dodge it!', 'Stand still and stare', 'Take a quick nap']);
  const qs = [typeQuiz(used), typeQuiz(used), { q: 'Stone Sage: Your rival is winding up a HUGE super move. What do you do?', opts: tactic, right: tactic.indexOf('Guard or dodge it!') }];
  const fail = () => {
    const def = withGear(byId('pebblepup'), 13);
    w.say([
      'Stone Sage: Hmm. No, no, no. Wrong!',
      'Stone Sage: Then show me your wisdom the other way. In battle!',
    ], () => S.worldFight({
      foe: def, lv: 13, kind: 'story', flag: 'trial_wisdom', name: 'Stone Sage', diff: 0.55,
      trainer: { name: 'Stone Sage', critter: 'pebblepup', title: 'Trial of Wisdom', beat: 'Hmm-hmm. You learn in battle what you missed in thought. Cross, young one.', gloat: 'Hmm. Think it over, and come back.' },
      note: '🧠 Trial of Wisdom passed! The Stone Sage steps aside.',
    }));
  };
  const askN = (k) => {
    if (k >= qs.length) {
      w.say(['Stone Sage: Hmm-hmm-hmm! Three for three. Wise AND strong.', 'Stone Sage: The bridge is yours. And take these berries. Thinking makes one hungry.'], () => {
        F.trial_wisdom = true; save.berries = (save.berries || 0) + 3; persist();
        sfx.jingle(3); S.toast('🧠 Trial of Wisdom passed! 🍓 +3 berries');
        const a = w.npcs.find((n) => n.n.id === 'sage');
        if (a) { const p = a.root.position; w.g.fx.burst({ x: p.x, y: 1, z: p.z }, { n: 16, speed: 3, color: 0xd8d0c8, size: 0.6, shape: 'puff', additive: false, grav: -1 }); }
        w.removeNpc('sage');
      });
      return;
    }
    const Q = qs[k];
    w.ask(Q.q, Q.opts, (i) => {
      if (i !== Q.right) return fail();
      sfx.jingle(1);
      w.say([['Stone Sage: Correct.', 'Stone Sage: Hmm. Correct again.', 'Stone Sage: ...Correct!'][k]], () => askN(k + 1));
    });
  };
  w.say([
    'Stone Sage: Hmmmm. Another young critter seeking the Crown.',
    'Stone Sage: Courage, strength, friendship... you have shown them all. But a champion also needs WISDOM.',
    'Stone Sage: Answer my three questions, and the bridge is yours.',
  ], () => askN(0));
}

// Trial of Friendship: bring Pip home and the brambles open
function mama(S, w, a) {
  const F = flags();
  if (F.trial_friendship) { w.say(['Mama Squeak: Thank you again, {hero}! Glowcap Hollow is just through there.']); return; }
  if (!save.adv.follow) {
    F.mama_asked = true; persist();
    w.say([
      "Mama Squeak: Squeak! Oh, please help! My baby Pip flew off chasing fireflies and hasn't come back!",
      'Mama Squeak: And now these brambles have grown shut. They only open for a true friend of the forest...',
      "{hero}: Don't worry! I'll find Pip and bring them home!",
      'Mama Squeak: Bless you! Pip loves the glowcaps in the hollow to the west.',
    ]);
    return;
  }
  const rid = rivalFor(save.adv.hero), rdef = byId(rid);
  w.say([
    'Pip: SQUEAK SQUEAK SQUEAK! (Pip zooms into Mama Squeak\'s wings.)',
    "Mama Squeak: Pip! Oh, Pip! Thank you, {hero}. You're a true friend of the forest.",
    'The glowcaps blaze bright... and the brambles curl back into the ground!',
  ], () => {
    F.trial_friendship = true; save.adv.follow = null;
    if (w.follower) { w.group.remove(w.follower.root); w.follower = null; }
    w.openBrambles();
    let joined = false;
    if (!save.unlocked.includes('squeakwing')) joined = unlock('squeakwing');
    persist();
    S.toast(joined ? '🦇 Squeakwing joined your team!' : '🤝 Trial of Friendship passed!');
    sfx.jingle(3);
    const d = w.npcs.find((n) => n.n.id === 'dash3');
    w.say([
      '🤝 Trial of Friendship passed!',
      ...(joined ? ["Mama Squeak: Pip's big sister wants to see the world and grow strong, just like you. Please take her along!", 'Squeakwing joined your team!'] : []),
      ...(d ? [
        'Dash: ...So THAT\'S what "friend of the forest" meant. Helping a crybaby bat?',
        "Dash: Fine. You opened the way. But you still have to get through ME!",
      ] : []),
    ], () => d && S.worldFight({
      foe: withGear(rdef, 10), lv: 10, kind: 'story', flag: 'dash3', name: 'Rival Dash', diff: 0.55,
      trainer: { name: 'Dash', critter: rid, title: 'Your rival', beat: "...Okay. Maybe being nice isn't ALL bad. Don't tell anyone I said that.", gloat: 'Ha! Friends are nice. Winning is nicer!' },
      note: '🌲 You beat Dash for the third time!',
    }));
  });
}

// facing a door and pressing A
export function doorAction(S, b, w) {
  const F = flags();
  if (b.lab && !F.quest) { w.say(['The door is locked. A note says: "Out front! - Prof. Pecan"']); return; }
  if (b.stadium === 'thunder' && !F.rival2) {
    const a = w.npcs.find((n) => n.n.id === 'rival2');
    w.say(['Dash: NOT so fast!'], () => rival2(S, w, a));
    return;
  }
  if (!b.altar) { // walk inside (a stadium opens into its lobby)
    sfx.door(!!b.heal);
    const key = `in:${w.key}:${b.id}`;
    const E = getMap(key).enter;
    w.fade(() => w.load(key, E.x, E.y, 'n'));
    return;
  }
  w.say(['Nobody seems to be home.']);
}

// Chapter 2: the Sunny Gull ferry between Seashell Town and Port Coral (post-game)
function ferry(S, w) {
  const F = flags(), home = w.key === 'seashell';
  if (home && !F.ending) {
    return w.say(['Captain Gill: Ahoy! The Sunny Gull sails to the Sunscatter Isles, far across the sea.', "Captain Gill: But the islanders only welcome a true Champion. Come back wearing the Critter Crown, and I'll take you myself!"], null, 'Captain Gill');
  }
  const q = home ? (F.isle_arrive ? 'Captain Gill: Back to the islands, Champion?' : 'Captain Gill: The Champion of Clashara! The Sunscatter Isles have been waiting for you. All aboard?')
    : 'Captain Gill: Sail back to Seashell Town?';
  w.ask(q, [home ? 'All aboard!' : 'Sail home', 'Not yet'], (i) => {
    if (i) return w.say([home ? 'Captain Gill: The sea will still be here. Take your time!' : 'Captain Gill: Enjoy the sunshine!'], null, 'Captain Gill');
    sfx.wave?.(); sfx.jingle?.(1);
    (save.adv.cnt ||= {}).ferry = (save.adv.cnt.ferry || 0) + 1;
    w.say([home ? 'The Sunny Gull blows its horn and chugs out of the bay. Seashell Town shrinks behind you...' : 'The Sunny Gull turns for home. The islands fade into the haze...'], () => w.fade(() => { w.load(home ? 'coral' : 'seashell', 12, 15, 'n'); if (home && !F.isle_arrive) setTimeout(() => storyIntro(S, w), 500); }));
  }, 'Captain Gill');
}

// Breezy Bluffs: a Gloom Gull lookout spying on the town from the cliff edge (the first grunt of the Chapter 2 villains)
function skua(S, w) {
  w.say([
    'Gloom Gull Skua: Caw! A mainland champion, snooping round the Bluffs? Captain Morra said you might turn up.',
    "Gloom Gull Skua: The Sunstone is ours now. Starfall's lighthouse stays dark, and the Gloom Gulls rule the night skies!",
    'Gloom Gull Skua: Squeakwing, show this tourist what gloom looks like!',
  ], () => S.worldFight({
    foe: withGear(byId('squeakwing'), 23), lv: 23, kind: 'story', flag: 'skua_b', name: 'Gloom Gull Skua', diff: 0.82,
    trainer: { name: 'Skua', critter: 'squeakwing', title: 'Gloom Gull lookout', beat: "Caw?! Fine, keep your cups. Captain Morra will deal with you on Starfall Atoll. Gloom Gulls, AWAY!", gloat: 'Caw caw! Back to the mainland with you!' },
    note: '🪶 You chased off a Gloom Gull lookout! Their hideout is on Starfall Atoll.',
  }));
}

function dashIsle(S, w) {
  const rid = rivalFor(save.adv.hero), rdef = byId(rid);
  w.say([
    "Dash: WHAT?! You're here too? I took the early ferry so I'd get here FIRST!",
    "Dash: Look, Champ. Back home you got the Crown. Out here, nobody's heard of either of us. Clean slate.",
    "Dash: So let's settle who's the real number one of the islands. Right now!",
  ], () => S.worldFight({
    foe: withGear(rdef, 22), lv: 22, kind: 'story', flag: 'dash_isle1', name: 'Rival Dash', diff: 0.82,
    trainer: { name: 'Dash', critter: rid, title: 'Island rival', beat: "Argh! Still?! Okay, listen. The Gloom Gulls stole the Sunstone from the Starfall lighthouse. Whoever gets it back is the hero of the isles. And that'll be ME!", gloat: 'Ha! The islands are MINE!' },
    note: '🏝️ You beat Dash in Port Coral! The race to the lighthouse is on.',
  }));
}

function rival2(S, w) {
  const rid = rivalFor(save.adv.hero), rdef = byId(rid);
  w.say([
    "Dash: So you got past the big sleeper. I'm... a LITTLE impressed.",
    "Dash: But the Thunder Cup is mine to win first. You'll have to beat me again to get through that gate!",
  ], () => S.worldFight({
    foe: withGear(rdef, 7), lv: 7, kind: 'story', flag: 'rival2', name: 'Rival Dash', diff: 0.48,
    trainer: { name: 'Dash', critter: rid, title: 'Your rival', beat: 'Grr... FINE. Go win your shiny cup. But the Crown is MINE, you hear me?!', gloat: 'Ha! Still too slow!' },
    note: '⚡ You beat Dash again! The Thunder Stadium gate is open.',
  }));
}
