// Adventure story: the hero critter dreams of the Critter Crown, worn by the strongest critter
// of all. Professor Pecan sets the quest; a rival, Dash, keeps turning up to test the hero;
// the cup stadiums are the gyms. Every beat is keyed on save.adv.flags.
import { save, persist } from './save.js';
import { CUPS, CRITTERS, withGear } from './data.js';
import { sfx } from './audio.js';
import { rivalFor } from './worldmaps.js';

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
      "Prof. Pecan: The road beyond Seashell Town is still being charted. Rest up, train in the tall grass, and I'll call when it's ready.",
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
    const next = CUPS.find((c) => !F['cup_' + c.id]);
    w.say([F.cup_sprout
      ? `Prof. Pecan: The Sprout Cup! Marvellous! ${next ? `Next, the ${next.name}. I'm still mapping the road there, so check back soon!` : ''}`
      : 'Prof. Pecan: Bloom Town is north along Route 1. The Sprout Stadium is waiting for you!']);
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
}

// facing a door and pressing A
export function doorAction(S, b, w) {
  const F = flags();
  const front = { map: w.key, x: b.x + b.door, y: b.y + b.h };
  if (b.id === 'home') {
    save.adv.spawn = front; persist();
    w.say(['Mom: Welcome home, sweetie! Have a snack and a nap.', '{hero} feels refreshed! (If you lose a battle, you\'ll come back here.)']);
    return;
  }
  if (b.heal) {
    save.adv.spawn = front; persist();
    sfx.jingle(2);
    w.say(['Nurse Lilypop: Welcome to the Berry Center! Let me fix you a berry smoothie...', 'Nurse Lilypop: All better! If you ever lose a battle, you\'ll wake up right here.']);
    return;
  }
  if (b.lab) {
    w.say([F.quest ? 'The lab is full of bubbling beakers. Professor Pecan is outside.' : 'The door is locked. A note says: "Out front! - Prof. Pecan"']);
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
      '{hero}: This is it. My first real cup. Let\'s go!',
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
