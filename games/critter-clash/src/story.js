// Adventure story: the hero critter dreams of the Critter Crown, worn by the strongest critter
// of all. Professor Pecan sets the quest; a rival, Dash, keeps turning up to test the hero;
// the cup stadiums are the gyms. Every beat is keyed on save.adv.flags.
import { save, persist, grantXp, xpNeeded } from './save.js';
import { CUPS, CRITTERS, TYPES, withGear, skinned } from './data.js';
const skinnedShiny = (id) => skinned(CRITTERS.find((c) => c.id === id), 'shiny');
import { unlock } from './save.js';
import { sfx } from './audio.js';
import { rivalFor } from './worldmaps.js';
import { getMap } from './interiors.js';
import { SHOP_HATS } from './critters.js';

const flags = () => save.adv.flags;
const byId = (id) => CRITTERS.find((c) => c.id === id);

// opening narration, the first time the world loads
export function storyIntro(S, w) {
  const F = flags();
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
      '★ THE END ★  Thanks for playing! The world is yours to explore. Wild critters are still out there, and every stadium welcomes a rematch.',
    ]);
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
  if (F.crowned) return 'You\'re the Champion! Rematch trainers and Dash, and find every gift box.';
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
    w.say([F.crowned ? 'Prof. Pecan: Our very own Champion of Clashara! Come back and tell me everything sometime.'
      : nx ? `Prof. Pecan: ${F.cup_sprout ? 'Marvellous work so far! ' : ''}Your next goal is the ${cup.name}, in ${nx[1]}.`
      : "Prof. Pecan: Seven cups! Champion's Peak is north of Frostpeak. The Crown is waiting!"]);
    return;
  }
  if (id === 'hatshop') return hatShop(w);
  if (id === 'smoothie') { // the Berry Center blender turns a berry into XP for the hero
    const n = save.berries || 0;
    if (!n) { w.say(["A berry smoothie blender. Bring a berry 🍓 and it'll whip up a smoothie for {hero}!"]); return; }
    w.ask(`Blend a berry smoothie for {hero}? (1 🍓 of ${n}, +XP)`, ['Blend!', 'Not now'], (i) => {
      if (i !== 0) return;
      const h = save.adv.hero, c = save.critters[h];
      save.berries = n - 1;
      const r = grantXp(h, Math.round(xpNeeded(c.level) * 0.25)); persist();
      sfx.jingle(2);
      w.say(['Whirrrr... *slurp*! A berry smoothie! 🍓', r.to > r.from ? `{hero} grew to Lv ${r.to}!` : '{hero} feels refreshed! (+XP)']);
    });
    return;
  }
  if (id === 'nurse' || id === 'rest') {
    save.adv.spawn = { ...w.M.exit }; persist();
    sfx.jingle(2);
    w.say(id === 'rest' ? ['{hero} hops into bed for a quick nap...', 'Mom: Sweet dreams! (If you lose a battle, you\'ll come back home.)']
      : ['Nurse Lilypop: Welcome to the Berry Center! Let me fix you a berry smoothie...', 'Nurse Lilypop: All better! If you ever lose a battle, you\'ll wake up right here.', ...(save.berries > 0 ? ['Nurse Lilypop: Got spare berries? The blender over there makes smoothies that help critters grow!'] : [])], null, id === 'nurse' ? 'Nurse Lilypop' : '');
    return;
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

// Milliner Mo's Hat Shop in Bloom Town: buy hats with berries, then wear any you own
function hatShop(w) {
  const A = save.adv, own = (A.hats ||= []), who = 'Milliner Mo';
  const menu = () => w.ask(`Milliner Mo: Welcome to the Hat Shop! A hat for every head. (You have ${save.berries || 0} 🍓)`, ['Buy a hat', 'Wear a hat', 'Bye'], (i) => {
    if (i === 0) {
      const left = SHOP_HATS.filter((h) => !own.includes(h.id));
      if (!left.length) return w.say(['Milliner Mo: You own every hat in the shop! A true hat collector. I\'m honoured!'], null, who);
      return pickPaged(w, 'Milliner Mo: Which one catches your eye?', left.map((h) => `${h.name} ${h.price}🍓`), (k) => {
        if (k < 0) return menu();
        const h = left[k];
        if ((save.berries || 0) < h.price) return w.say([`Milliner Mo: The ${h.name} is ${h.price} berries. Shake a few berry bushes and come back!`], menu, who);
        save.berries -= h.price; own.push(h.id); A.hat = h.id; persist();
        sfx.jingle(2); w.wearHat();
        w.say([`{hero} got the ${h.name}! 🎩`, `Milliner Mo: Oh, it suits {hero} perfectly! Pop it on and off here any time.`], null, who);
      }, who);
    }
    if (i === 1) {
      if (!own.length) return w.say(["Milliner Mo: You don't have any hats yet! Have a look around."], menu, who);
      const mine = SHOP_HATS.filter((h) => own.includes(h.id));
      return pickPaged(w, 'Milliner Mo: Which hat today?', [...mine.map((h) => (A.hat === h.id ? '✓ ' : '') + h.name), 'No hat'], (k) => {
        if (k < 0) return menu();
        A.hat = k < mine.length ? mine[k].id : null; persist(); w.wearHat(); sfx.ui('ok');
        w.say([A.hat ? `{hero} puts on the ${mine[k].name}. Looking sharp!` : '{hero} takes the hat off. The wind feels nice!'], null, who);
      }, who);
    }
    w.say(['Milliner Mo: Come again! Hats off to you!'], null, who);
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
  const front = { map: w.key, x: b.x + b.door, y: b.y + b.h };
  if (b.lab && !F.quest) { w.say(['The door is locked. A note says: "Out front! - Prof. Pecan"']); return; }
  if (!b.stadium && !b.altar) { // walk inside
    sfx.door(!!b.heal);
    const key = `in:${w.key}:${b.id}`;
    const E = getMap(key).enter;
    w.fade(() => w.load(key, E.x, E.y, 'n'));
    return;
  }
  if (b.stadium === 'thunder' && !F.rival2) {
    const a = w.npcs.find((n) => n.n.id === 'rival2');
    w.say(['Dash: NOT so fast!'], () => rival2(S, w, a));
    return;
  }
  if (b.stadium) {
    const cup = CUPS.find((c) => c.id === b.stadium);
    if (F['cup_' + cup.id]) { w.say([`The ${cup.name} trophy shines in the lobby. {hero} is the champion here!`, 'Want to battle the cup again? Use Tournament on the title screen.']); return; }
    w.say([
      `Welcome to the ${cup.name}! ${cup.matches.length} battles stand between you and the trophy.`,
      Object.keys(F).some((k) => k.startsWith('cup_')) ? "{hero}: Another cup, another trophy. Let's go!" : '{hero}: This is it. My first real cup. Let\'s go!',
    ], () => S.worldCup(cup, front));
    return;
  }
  w.say(['Nobody seems to be home.']);
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
