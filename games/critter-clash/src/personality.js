// Per-critter personality: signature intro and victory animations plus their catchphrases.
// Each anim gets (f, P, k, dt): the fighter, its pose targets, seconds into the anim, frame dt.
import { sfx } from './audio.js';

const sin = Math.sin, abs = Math.abs;
const once = (f, key) => { if (f.fxOnce?.[key]) return false; (f.fxOnce ||= {})[key] = true; return true; };
const head = (f, up = 0) => { const h = f.headPos(); h.y += up; return h; };
const mouth = (f) => ({ x: f.x + Math.sin(f.face) * 0.45, y: f.y + f.def.body.h + f.def.body.headR * 0.8, z: f.z + Math.cos(f.face) * 0.45 });
const rnd = (s) => (Math.random() - 0.5) * s;

export const LINES = {
  snoozlo:     { intro: ['*yawn* ...is it time?', 'Five more minutes...', 'Mmh. Fine. I am awake.'], win: ['Nap time. Earned it.', 'Zzz... huh? We won?', 'Sweet dreams!'] },
  squeakwing:  { intro: ['EEEEEK! ...hi!', 'Ready to squeak!', 'Ears up, wings out!'], win: ['Did you hear that? I WON!', 'Squeak-tacular!', 'Wing-wing!'] },
  kindlekit:   { intro: ["Let's light it up!", 'Festival time!', "Tail's warmed up!"], win: ['Ka-BOOM! Ta-da!', 'What a show!', 'Encore? Encore!'] },
  cindermunch: { intro: ['Snack time!', "I'm fired up!", 'Toasty!'], win: ['Delicious!', 'Well done. Extra crispy!', 'Munch munch!'] },
  bubbalotl:   { intro: ['Bloop bloop!', 'Hug incoming!', 'Splish splash!'], win: ['Group hug!', 'Totally bubbly!', 'Bloop-tastic!'] },
  clovebun:    { intro: ['Hop to it!', 'Lucky me!', 'Ready, set, hop!'], win: ['Four-leaf win!', 'Hoppy days!', 'Too fast!'] },
  voltferret:  { intro: ['Bzzt! Ready!', 'Feel the static!', 'Zip zap zoom!'], win: ['Shockingly good!', 'Bzzt! Too easy!', 'Charged up!'] },
  rolladillo:  { intro: ["Rock 'n' roll!", 'Roll call!', 'Solid as a rock.'], win: ['Rolled you over!', 'Rock solid.', 'Nap time now.'] },
  hootsy:      { intro: ['Hoo-ray!', 'Whoosh!', 'Wings up!'], win: ['Hoo-hoo-hooray!', 'Blown away!', 'Owl always win.'] },
  pengsicle:   { intro: ['Ice to meet you!', 'Chill out!', 'Slide time!'], win: ['Cool, cool, cool.', 'Snow problem!', 'Ice and easy!'] },
  emberfly:    { intro: ['Light it up!', 'Glow time!', 'Bzz... I mean, hi!'], win: ['Glowing victory!', 'Lights out!', 'Not a bug. A STAR.'] },
};

Object.assign(LINES, {
  smokeshell:  { intro: ['*puff puff* Ready!', 'Shell is HOT today!', 'Snip snap, here I come!'], win: ['*happy smoke ring*', 'Too hot to handle!', 'Snip! Snap! Done!'] },
  blowfin:     { intro: ['Blub! Do not poke me!', '*gulp* ...ready!', 'I can get bigger, you know.'], win: ['Pfffff... phew.', 'Puffed up and proud!', 'Blub blub hooray!'] },
  mossloth:    { intro: ['Hiii... thereee...', 'No rush. No rush at all.', 'Mmh... let us begin... slowly.'], win: ['Wow... I won... nice...', 'Slow and steady...', 'Nap... in the sun... now.'] },
  toucharge:   { intro: ['SQUAWK! Charged up!', 'Beak? Loaded!', 'Feel the tropic thunder!'], win: ['SQUAWK-tacular!', 'Beak-ause I rule!', 'Zzzap! Tweet tweet!'] },
  pumicub:     { intro: ['Grr! Rock solid!', 'I float, but I hit hard!', 'Bear hug? Stone hug!'], win: ['Grr-eat win!', 'Rock-a-bye, rival.', 'Bobbing with joy!'] },
  skimray:     { intro: ['Catch the trade wind!', 'Skim, skim, skim!', 'Smooth sailing ahead.'], win: ['Breezed through it!', 'Home on the wind!', 'Wheee! Loop-de-loop!'] },
  pricklepuff: { intro: ["Don't touch the spines!", 'Prickly and proud!', "Hmph. Fine. Let's go."], win: ['Told you. Prickly.', 'Leaf me alone now.', 'Hmph! Too easy.'] },
  pebblepup:   { intro: ['Arf! Rock and ruff!', 'Fetch THIS!', 'Bark is worse than my bite. Bite is rocks.'], win: ['Good pup! Me!', 'Ruff day for you!', 'Stone cold. Arf!'] },
  whirlwhisk:  { intro: ['Wheee! Incoming!', 'Nuts to you!', 'Catch the breeze!'], win: ['Blown away!', "Nuttin' to it!", 'Wind beneath my tail!'] },
  diggles:     { intro: ['Dig it!', 'Hard hat? Check!', 'Mind the hole!'], win: ['Struck gold!', 'You dig?', 'Hole in one!'] },
  jiggawatt:   { intro: ['Bzzzloop!', 'Feeling jiggly!', 'Ready to wobble!'], win: ['Shocking, right?', 'Watt a win!', 'Jiggle jiggle, zap!'] },
  ripples:     { intro: ['Splish! Ready!', "Mind the puddles!", 'Otter-ly ready!'], win: ['Otter-ly amazing!', 'Clam-tastic!', 'Making waves!'] },
  lilypop:     { intro: ['Ribbit! Ready!', 'Hop hop, here I come!', "Don't make me lick you."], win: ['Toad-ally awesome!', 'Ribbit-ing win!', 'Snack caught!'] },
  woolt:       { intro: ['Baa-zzt!', 'Static cling, incoming!', 'Fluffed up and ready!'], win: ['Shear power!', 'Baa-rilliant!', 'Hair-raising!'] },
});

export function sayLine(f, kind) {
  const L = LINES[f.def.id]?.[kind];
  if (!L) return;
  const line = L[Math.floor(Math.random() * L.length)];
  f.battle.fx.say(f, line, f.def.type);
}

// ---------------- intros (about 1.5 s, then a held "ready" pose) ----------------
const INTRO = {
  snoozlo(f, P, k) {
    if (k < 1.0) { // dozing on its feet, head nodding
      P.sy = 0.92; P.head = 0.35 + sin(k * 5) * 0.12; P.armLz = P.armRz = 0.15; P.headRoll = sin(k * 2.5) * 0.15;
      f.critter.emote('closed', 'o', 0.1);
      if (once(f, 'zz')) f.battle.fx.text(head(f, 0.3), 'z z z', 'zz', 0.9);
    } else if (k < 1.6) { // jolts awake with a big stretch
      P.sy = 1.15; P.armLz = P.armRz = 2.7; P.head = -0.4; P.ear = 1;
      f.critter.emote('closed', 'open', 0.1);
      if (once(f, 'yawn')) sfx.voice(f.def.voice, 'special');
    } else ready(f, P, k);
  },
  squeakwing(f, P, k) {
    const fx = f.battle.fx;
    if (k < 0.9) { // flutters down from above, wings beating
      P.y = (0.9 - k) * 2.6 + sin(k * 20) * 0.08; P.tail = 1.6; P.armLz = P.armRz = 1.3 + sin(k * 20) * 0.4;
      f.critter.emote('happy', 'o', 0.1);
    } else if (k < 1.6) { // lands and lets out a tiny squeak ring
      P.y = 0; P.sy = 1.08; P.armLz = P.armRz = 2; P.ear = 1; P.head = -0.2;
      f.critter.emote('closed', 'yell', 0.1);
      if (once(f, 'eek')) { sfx.voice(f.def.voice * 1.4, 'special'); fx.spawn({ x: f.x, y: 0.6, z: f.z, color: 0xe8f4ff, size: 3.5, life: 0.4, shape: 'ring' }); }
    } else ready(f, P, k);
  },
  kindlekit(f, P, k) {
    const fx = f.battle.fx;
    if (k < 0.7) { // curled up asleep in its own tail, the tail flame flickering
      P.sy = 0.7; P.sx = 1.15; P.head = 0.35; P.tail = 0.1; P.armLz = P.armRz = 0.2;
      f.critter.emote('closed', 'smile', 0.1);
      if (Math.random() < 0.2) fx.spawn({ ...head(f, 0.4), vy: 0.8, color: 0xffffff, size: 0.3, life: 0.6, shape: 'glow', alpha: 0.4 });
    } else if (k < 1.6) { // pops awake and fires a sparkler spin
      const j = Math.min(1, (k - 0.7) * 4);
      P.y = sin(Math.min(1, (k - 0.7) / 0.5) * Math.PI) * 0.6; P.yaw = j * Math.PI * 2; P.armLz = P.armRz = 2.5; P.tail = 1.5;
      f.critter.emote('happy', 'grin', 0.1);
      if (once(f, 'pop')) { sfx.fire(); fx.spawn({ ...head(f, 0.2), color: 0xffc23a, size: 2.5, life: 0.25, shape: 'glow' }); }
      if (Math.random() < 0.6) fx.spawn({ ...head(f, rnd(0.6)), x: f.x + rnd(1.6), z: f.z + rnd(1.6), vy: 2, color: [0xff4fa0, 0xffe14d, 0x4fd8ff][Math.floor(Math.random() * 3)], size: 0.35, life: 0.4, shape: 'star' });
    } else ready(f, P, k);
  },
  pricklepuff(f, P, k) {
    const fx = f.battle.fx;
    if (k < 0.8) { // curled-up spiky ball, rolling on the spot
      P.lean = k * 16; P.sy = 0.72; P.sx = 1.12; P.head = 0.9; P.armLx = P.armRx = 1.4; P.legL = P.legR = 1.2; P.y = 0.12;
      f.critter.emote('closed', 'o', 0.1);
      if (Math.random() < 0.3) fx.dust(f, 1, 0.5);
    } else if (k < 1.4) { // POP! spines out, little grumpy huff
      if (once(f, 'pop')) { sfx.leaf(); fx.burst({ x: f.x, y: 0.7, z: f.z }, { n: 14, speed: 5, up: 3, color: 0x7cff6a, shape: 'leaf', additive: false, size: 0.26, life: 0.7, grav: 6, spin: 8 }); sfx.voice(f.def.voice, 'attack'); }
      const j = Math.max(0, 1 - (k - 0.8) * 4);
      P.y = j * 0.4; P.sx = 1.15; P.sy = 1.05; P.armLz = P.armRz = 1.2; P.head = -0.2;
      f.critter.emote('angry', 'grin', 0.1);
    } else ready(f, P, k);
  },
  woolt(f, P, k) {
    const fx = f.battle.fx;
    if (k < 0.9) { // wet-dog shake to build up static
      const w = sin(k * 38);
      P.roll = w * 0.22; P.yaw = w * 0.3; P.headRoll = -w * 0.3; P.ear = 0.8 + w * 0.6; P.sx = 1.05;
      f.critter.emote('closed', 'wobbly', 0.1);
      if (Math.random() < 0.5) { const h = head(f, 0.1); fx.spawn({ x: h.x + rnd(1.4), y: h.y + rnd(1), z: h.z + rnd(1.4), color: 0xffe14d, size: 0.35, life: 0.12, shape: 'bolt', rot: Math.random() * 6 }); }
      if (once(f, 'shake')) sfx.whoosh?.(1.3);
    } else if (k < 1.4) { // ZAP! fluff stands on end
      if (once(f, 'zap')) { sfx.spark(); fx.burst(head(f), { n: 16, speed: 6, color: 0xffe14d, size: 0.24, life: 0.4, shape: 'spark' }); sfx.voice(f.def.voice, 'attack'); }
      P.sy = 1.18; P.sx = 1.1; P.armLz = P.armRz = 2.4; P.ear = -0.6;
      f.critter.emote('happy', 'open', 0.1);
    } else ready(f, P, k);
  },
  cindermunch(f, P, k) {
    const fx = f.battle.fx;
    if (k < 0.7) { // chew chew chew
      const c = abs(sin(k * 22));
      P.sx = 1 + c * 0.1; P.sy = 1 - c * 0.07; P.head = -0.15 + c * 0.2; P.armLx = P.armRx = -1.4; P.armLz = P.armRz = -0.5;
      f.critter.emote('happy', c > 0.5 ? 'o' : 'grin', 0.1);
    } else if (k < 1.3) { // big fiery burp
      P.head = -0.5; P.lean = -0.25; P.sy = 1.12; P.armLz = P.armRz = 1.4; P.tail = 1.6;
      f.critter.emote('closed', 'yell', 0.1);
      if (once(f, 'burp')) { sfx.fire(); sfx.voice(f.def.voice, 'attack'); }
      if (Math.random() < 0.7) { const m = mouth(f); fx.spawn({ ...m, vx: rnd(1.4), vy: 4 + Math.random() * 2, vz: rnd(1.4), color: Math.random() < 0.5 ? 0xff7a1a : 0xffd040, size: 0.55, life: 0.5, shape: 'glow', grow: -0.6, drag: 1 }); }
    } else ready(f, P, k);
  },
  bubbalotl(f, P, k) {
    const fx = f.battle.fx;
    if (k < 1.3) { // wave hello with both arms, bubbles everywhere
      const w = sin(k * 12);
      P.armLz = 2.2 + w * 0.4; P.armRz = 2.2 - w * 0.4; P.roll = w * 0.1; P.headRoll = -w * 0.15; P.ear = 0.6 + w * 0.3; P.tail = 1.2;
      P.y = abs(sin(k * 6)) * 0.12;
      f.critter.emote('happy', 'open', 0.1);
      if (Math.random() < 0.3) { const h = head(f, -0.3); fx.spawn({ x: h.x + rnd(1.4), y: h.y + rnd(0.6), z: h.z + rnd(1.4), vy: 1.2, color: 0x9fe6ff, size: 0.28 + Math.random() * 0.2, life: 1.1, shape: 'ring', additive: false, grow: 0.3, hold: 0.8 }); }
      if (once(f, 'bloop')) sfx.water();
    } else ready(f, P, k);
  },
  clovebun(f, P, k) {
    const fx = f.battle.fx;
    if (k < 1.3) { // two bunny hops, the second with a twirl
      const h = k % 0.65, j = sin(h / 0.65 * Math.PI);
      P.y = j * 0.9; P.sy = h < 0.08 || h > 0.58 ? 0.8 : 1.1; P.ear = -0.4 + j * 0.8;
      P.legL = P.legR = j * -0.8; P.armLz = P.armRz = 1 + j;
      if (k > 0.65) P.yaw = (h / 0.65) * Math.PI * 2;
      f.critter.emote('happy', 'grin', 0.1);
      if (h > 0.6 && once(f, 'land' + (k > 0.65 ? 2 : 1))) { fx.dust(f, 6, 0.8); sfx.leaf(); fx.burst(head(f, -0.2), { n: 8, speed: 2.5, up: 2.5, color: 0x6cdc5a, size: 0.32, life: 1, shape: 'leaf', additive: false, grav: 2, drag: 2, spin: 8, grow: 0 }); }
    } else ready(f, P, k);
  },
  voltferret(f, P, k) {
    const fx = f.battle.fx;
    if (k < 0.8) { // rub up static: low crouch, frantic jitter
      P.sy = 0.85; P.sx = 1.08; P.lean = 0.2; P.roll = rnd(0.3); P.yaw = rnd(0.3); P.armLx = rnd(2); P.armRx = rnd(2); P.ear = 1;
      f.critter.emote('angry', 'grin', 0.1);
      if (Math.random() < 0.5) { const h = f.chestPos(); fx.spawn({ x: h.x + rnd(1), y: h.y + rnd(1), z: h.z + rnd(1), color: 0xfff060, size: 0.7, stretch: 0.15, rot: Math.random() * 6, life: 0.12, shape: 'spark' }); }
    } else if (k < 1.4) { // ZAP! star pose
      P.sy = 1.15; P.armLz = P.armRz = 2.4; P.legL = 0.4; P.legR = -0.4; P.ear = -0.4; P.tail = 1.8; P.y = 0.15;
      f.critter.emote('happy', 'open', 0.1);
      if (once(f, 'zap')) { sfx.spark(); const c = f.chestPos(); fx.hit(c, 0xfff060, false, 'spark'); }
    } else ready(f, P, k);
  },
  whirlwhisk(f, P, k) {
    const fx = f.battle.fx;
    if (k < 1.0) { // drifts down from the sky on its glider flaps
      const h = Math.max(0, 1 - k) * 2.5;
      P.y = h; P.armLz = P.armRz = 1.5 + sin(k * 9) * 0.15; P.legL = 0.6; P.legR = -0.6; P.lean = 0.2; P.roll = sin(k * 5) * 0.2; P.tail = 1.6;
      f.critter.emote('happy', 'open', 0.1);
      if (Math.random() < 0.3) fx.spawn({ x: f.x + rnd(1.4), y: f.y + h + 0.6, z: f.z + rnd(1.4), vx: rnd(2), color: 0xffffff, size: 0.35, life: 0.4, shape: 'glow', alpha: 0.5 });
    } else if (k < 1.6) { // lands, cheeks stuffed, tail flick
      P.sy = 0.9 + abs(sin(k * 12)) * 0.15; P.tail = 2.2 + sin(k * 20) * 0.4; P.armLx = P.armRx = -1.2;
      f.critter.emote('happy', 'grin', 0.1);
      if (once(f, 'land')) { sfx.land(); fx.dust(f, 6, 0.8); }
    } else ready(f, P, k);
  },
  diggles(f, P, k) {
    const fx = f.battle.fx;
    if (k < 0.5) { // still underground: just a wobbling mound
      P.y = -1.4; P.sy = 0.6;
      if (Math.random() < 0.5) fx.spawn({ x: f.x + rnd(0.6), y: 0.1, z: f.z + rnd(0.6), vy: 1.5, color: 0x8a6a4a, size: 0.4, life: 0.4, shape: 'puff', additive: false, grav: 5 });
    } else if (k < 1.2) { // POP! out of the dirt, helmet lamp flashing
      const u = Math.min(1, (k - 0.5) / 0.18);
      P.y = -1.4 + u * 1.7 - Math.max(0, k - 0.68) * 0.6; P.sy = 1.15; P.armLz = P.armRz = 2.5;
      f.critter.emote('happy', 'open', 0.1);
      if (once(f, 'pop')) { sfx.boom(); fx.burst({ x: f.x, y: 0.2, z: f.z }, { n: 12, speed: 5, up: 6, color: 0x9a7a5a, size: 0.26, life: 0.6, shape: 'puff', additive: false, grav: 14 }); fx.spawn({ ...head(f, 0.1), color: 0xfff6b0, size: 2.2, life: 0.25, shape: 'glow' }); }
    } else ready(f, P, k);
  },
  jiggawatt(f, P, k) {
    const fx = f.battle.fx;
    if (k < 0.8) { // floats down from above, tentacles trailing
      P.y = (0.8 - k) * 3; P.armLz = P.armRz = 1.2 + sin(k * 10) * 0.4; P.sy = 1.1;
      f.critter.emote('happy', 'o', 0.1);
    } else if (k < 1.6) { // lights up with a crackle
      P.y = 0.15 + sin(k * 8) * 0.05; P.armLz = P.armRz = 2.4; P.sx = 1 + abs(sin(k * 30)) * 0.05;
      f.critter.emote('happy', 'grin', 0.1);
      if (once(f, 'zap')) { sfx.spark(); fx.spawn({ ...head(f, 0.2), color: 0xfff060, size: 3, life: 0.3, shape: 'glow' }); }
      if (Math.random() < 0.5) fx.spawn({ ...head(f, rnd(1)), x: f.x + rnd(1.4), z: f.z + rnd(1.4), color: 0xfff060, size: 0.5, life: 0.1, shape: 'bolt', rot: Math.random() * 6 });
    } else ready(f, P, k);
  },
  ripples(f, P, k) {
    const fx = f.battle.fx;
    if (k < 0.7) { // belly-slides in on a stream of water
      P.lean = 1.35; P.y = 0.05; P.armLz = P.armRz = 2.6; P.legL = P.legR = -1.1; P.sx = 1.1;
      f.critter.emote('happy', 'open', 0.1);
      if (Math.random() < 0.8) fx.spawn({ x: f.x + rnd(0.6), y: 0.1, z: f.z + rnd(0.6), vy: 2 + Math.random() * 2, color: 0xbfeaff, size: 0.22, life: 0.4, shape: 'drop', additive: false, grav: 10 });
    } else if (k < 1.6) { // pops up and claps
      P.sy = 1.08; P.armLz = P.armRz = 1.3 + abs(sin(k * 16)) * 0.5; P.armLx = P.armRx = -1.2;
      f.critter.emote('happy', 'grin', 0.1);
      if (once(f, 'up')) { sfx.water?.(); fx.burst({ x: f.x, y: 0.3, z: f.z }, { n: 10, speed: 3, up: 4, color: 0xa8e4ff, size: 0.2, life: 0.5, shape: 'drop', additive: false, grav: 12 }); }
    } else ready(f, P, k);
  },
  lilypop(f, P, k) {
    const fx = f.battle.fx;
    if (k < 0.9) { // big frog hops into place
      const ph = (k / 0.45) % 1;
      P.y = sin(ph * Math.PI) * 0.9; P.legL = P.legR = ph < 0.5 ? -0.9 : 0.6; P.sy = ph > 0.85 || ph < 0.1 ? 0.8 : 1.1; P.armLz = P.armRz = 0.9;
      f.critter.emote('happy', 'open', 0.1);
      if (ph > 0.9 && once(f, 'h' + Math.floor(k / 0.45))) { sfx.land(); fx.dust(f, 4, 0.6); }
    } else if (k < 1.6) { // catches a fly mid-air: thwip!
      P.head = -0.4; P.sy = 1.08;
      f.critter.emote(k < 1.2 ? 'open' : 'happy', k < 1.2 ? 'open' : 'grin', 0.1);
      if (once(f, 'fly')) { sfx.thwip(); fx.burst(head(f, 0.4), { n: 6, speed: 2, up: 2, color: 0xffffff, size: 0.18, life: 0.4, shape: 'star', additive: false, grav: 3 }); }
    } else ready(f, P, k);
  },
  pebblepup(f, P, k) {
    const fx = f.battle.fx;
    if (k < 0.8) { // dig dig dig, rocks flying out behind
      P.lean = 0.7; P.head = 0.4; P.armLx = -1.6 + sin(k * 30) * 0.9; P.armRx = -1.6 - sin(k * 30) * 0.9; P.tail = 1.5 + sin(k * 25) * 0.5;
      f.critter.emote('happy', 'grin', 0.1);
      if (Math.random() < 0.35) fx.spawn({ x: f.x - Math.sin(f.face) * 0.4, y: 0.3, z: f.z - Math.cos(f.face) * 0.4, vy: 4, vx: -Math.sin(f.face) * 2 + rnd(2), vz: -Math.cos(f.face) * 2 + rnd(2), color: 0x9a8a7a, size: 0.18, life: 0.6, shape: 'puff', additive: false, grav: 12 });
    } else if (k < 1.5) { // found one! holds a crystal up proudly
      P.sy = 1.1; P.armLz = P.armRz = 2.5; P.y = abs(sin(k * 10)) * 0.12; P.tail = 2;
      f.critter.emote('happy', 'open', 0.1);
      if (once(f, 'gem')) { sfx.jingle?.(1); fx.burst(head(f, 0.6), { n: 10, speed: 2, up: 1, color: 0x9ae4ff, size: 0.2, life: 0.5, shape: 'star', additive: false, grav: 2 }); }
    } else ready(f, P, k);
  },
  rolladillo(f, P, k) {
    const fx = f.battle.fx;
    if (k < 0.9) { // curled up, rocking in place
      P.sx = 1.05; P.sy = 0.78; P.head = 0.9; P.armLx = P.armRx = -2.4; P.legL = P.legR = -1.6;
      P.lean = 0.9 + sin(k * 14) * 0.5;
      f.critter.emote('closed', 'smile', 0.1);
      if (Math.random() < 0.15) fx.dust(f, 1, 0.6);
    } else if (k < 1.5) { // POP! out of the shell, flexing
      P.sy = 1.12; P.sx = 0.95; P.armLz = P.armRz = 1.2; P.armLx = P.armRx = -1.2; P.lean = -0.1;
      f.critter.emote('happy', 'grin', 0.1);
      if (once(f, 'pop')) { sfx.land(); fx.dust(f, 7, 0.8); fx.shock(f, 0xffd9a0, 2.2, 0.4); }
    } else ready(f, P, k);
  },
  hootsy(f, P, k) {
    const fx = f.battle.fx;
    if (k < 1.3) { // flap flap flap, hovering up in a little whirlwind
      const w = sin(k * 30);
      P.armLz = P.armRz = 1.4 + w * 1.0; P.y = Math.min(1, k * 1.6) * 0.7 + sin(k * 8) * 0.06; P.legL = P.legR = 0.5; P.ear = 0.8;
      P.yaw = k > 0.6 ? (k - 0.6) * 9 : 0;
      f.critter.emote(k < 0.6 ? 'open' : 'happy', 'o', 0.1);
      if (Math.random() < 0.3) fx.spawn({ x: f.x, y: 0.1 + Math.random() * 0.3, z: f.z, vy: 1, color: 0xe6ecff, alpha: 0.5, size: 1.2, life: 0.4, shape: 'ring', grow: 1.2 });
      if (once(f, 'whoosh')) sfx.whoosh(1.2);
    } else ready(f, P, k);
  },
  pengsicle(f, P, k) {
    const fx = f.battle.fx;
    if (k < 0.9) { // belly spin on the spot
      P.lean = 1.4; P.y = 0.1; P.yaw = k * 14; P.armLz = P.armRz = 1.3; P.legL = P.legR = 1.1; P.head = -0.9;
      f.critter.emote('happy', 'grin', 0.1);
      if (Math.random() < 0.5) fx.spawn({ x: f.x + rnd(1), y: 0.1, z: f.z + rnd(1), vy: 1.5, color: 0xdff6ff, size: 0.22, life: 0.6, shape: 'star', additive: false, grav: 3, spin: 6 });
      if (once(f, 'swish')) sfx.whoosh(0.9);
    } else if (k < 1.5) { // pop up and salute with a flipper
      P.sy = 1.1; P.armRz = 2.6; P.armRx = -0.4; P.headRoll = -0.15; P.y = Math.max(0, sin((k - 0.9) * 8)) * 0.2;
      f.critter.emote('happy', 'open', 0.1);
      if (once(f, 'pop')) { fx.burst(head(f, -0.2), { n: 10, speed: 2.5, up: 2, color: 0xffffff, size: 0.25, life: 0.9, shape: 'star', additive: false, grav: 2, spin: 6 }); sfx.water(); }
    } else ready(f, P, k);
  },
  emberfly(f, P, k) {
    const fx = f.battle.fx;
    if (k < 1.4) { // flutter up, lantern blazing, loop-de-loop
      P.y = Math.min(1, k * 1.8) * 0.8 + sin(k * 7) * 0.06; P.tail = 2.5; P.legL = P.legR = 0.6; P.armLz = P.armRz = 1 + sin(k * 9) * 0.3;
      if (k > 0.6) { P.lean = -(k - 0.6) / 0.8 * Math.PI * 2; }
      f.critter.emote('happy', k > 0.6 ? 'open' : 'grin', 0.1);
      if (Math.random() < 0.6) { const c = f.chestPos(); fx.spawn({ x: c.x + rnd(0.6), y: f.y + P.y + 0.5 + rnd(0.4), z: c.z + rnd(0.6), vy: 0.6, color: Math.random() < 0.5 ? 0xffc93a : 0xff8a20, size: 0.3, life: 0.7, shape: 'glow', grow: -0.6 }); }
      if (once(f, 'glow')) sfx.fire();
    } else ready(f, P, k);
  },
};

// determined, slightly bouncing "let's go" stance after the signature bit
function ready(f, P, k) {
  const b = sin(k * 7);
  P.sy = 0.95 + b * 0.03; P.lean = 0.2; P.armLx = P.armRx = -0.9; P.armLz = P.armRz = -0.3; P.ear = 0.2;
  f.critter.emote('angry', 'grin', 0.1);
}

// ---------------- victories (loop for the winpose) ----------------
const WIN = {
  snoozlo(f, P, k) { // flops into a happy sway, then curls up for a nap with drifting z's
    const nap = k % 6 > 4;
    if (nap) { P.sy = 0.88; P.sx = 1.08; P.head = 0.12; P.headRoll = 0.35; P.armLz = P.armRz = 0.1; f.critter.emote('closed', 'smile', 0.1); if (Math.random() < 0.03) f.battle.fx.text(head(f, 0.3), 'z', 'zz', 0.8); }
    else { P.roll = sin(k * 3) * 0.2; P.armLz = 2 + sin(k * 6) * 0.4; P.armRz = 2 - sin(k * 6) * 0.4; P.y = abs(sin(k * 3)) * 0.12; f.critter.emote('happy', 'grin', 0.1); }
  },
  squeakwing(f, P, k) { // loop-the-loop hovering, with notes of happy squeaks
    P.y = 0.4 + sin(k * 3) * 0.25; P.tail = 1.6; P.roll = sin(k * 1.6) * 0.3; P.armLz = P.armRz = 1.8 + sin(k * 16) * 0.5;
    f.critter.emote('happy', 'grin', 0.1);
    if (Math.random() < 0.08) f.battle.fx.spawn({ ...head(f, 0.4), x: f.x + rnd(1.2), vy: 1.5, color: [0xe8f4ff, 0xffb0c8, 0xffd23a][Math.floor(Math.random() * 3)], size: 0.4, life: 0.6, shape: 'star', additive: false });
  },
  kindlekit(f, P, k) { // twirls its tail like a sparkler while little fireworks pop overhead
    P.y = abs(sin(k * 5)) * 0.2; P.armLz = 2.2 + sin(k * 10) * 0.4; P.armRz = 2.2 - sin(k * 10) * 0.4; P.tail = 1.6; P.yaw = sin(k * 2) * 0.4;
    f.critter.emote('happy', 'grin', 0.1);
    if (Math.random() < 0.06) {
      const at = { x: f.x + rnd(2.4), y: 2.6 + Math.random(), z: f.z + rnd(2.4) }, c = [0xff4fa0, 0xffe14d, 0x4fd8ff, 0x9aff4f][Math.floor(Math.random() * 4)];
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; f.battle.fx.spawn({ ...at, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, vz: rnd(1), color: c, size: 0.25, life: 0.5, shape: 'spark', grav: 3 }); }
    }
  },
  pricklepuff(f, P, k) { // arms folded, proud little hops, leaves drifting
    const j = abs(sin(k * 4));
    P.y = j * 0.25; P.armLx = P.armRx = -1.1; P.armLz = P.armRz = -0.9; P.head = -0.25; P.headYaw = sin(k * 1.3) * 0.4; P.sx = 1.06;
    f.critter.emote('closed', 'grin', 0.1);
    if (Math.random() < 0.08) f.battle.fx.spawn({ x: f.x + rnd(1.6), y: f.y + 2, z: f.z + rnd(1.6), vy: -0.5, color: 0x7cff6a, size: 0.28, life: 1.5, shape: 'leaf', additive: false, spin: 4, drag: 2 });
  },
  woolt(f, P, k) { // bouncy fluffball, crackling with joy
    const j = abs(sin(k * 5));
    P.y = j * 0.45; P.sy = j > 0.2 ? 1.08 : 0.85; P.armLz = P.armRz = 1.8 + sin(k * 10) * 0.4; P.ear = 0.4 + j;
    f.critter.emote('happy', 'open', 0.1);
    if (Math.random() < 0.15) { const h = head(f, 0.3); f.battle.fx.spawn({ x: h.x + rnd(1), y: h.y + rnd(0.6), z: h.z + rnd(1), color: 0xffe14d, size: 0.3, life: 0.12, shape: 'bolt', rot: Math.random() * 6 }); }
  },
  cindermunch(f, P, k) { // happy munching with flame puffs
    const c = abs(sin(k * 9));
    P.y = abs(sin(k * 4.5)) * 0.3; P.sx = 1 + c * 0.12; P.sy = 1 - c * 0.06; P.armLx = P.armRx = -1.6; P.armLz = P.armRz = -0.4;
    P.yaw = sin(k * 2) * 0.4; P.tail = 1.6;
    f.critter.emote('happy', c > 0.5 ? 'open' : 'grin', 0.1);
    if (Math.random() < 0.2) { const h = head(f); f.battle.fx.spawn({ x: h.x + rnd(0.6), y: h.y, z: h.z + rnd(0.6), vy: 2, color: 0xff8a2a, size: 0.4, life: 0.5, shape: 'glow', grow: -0.5 }); }
  },
  bubbalotl(f, P, k) { // twirling dance
    P.yaw = k * 6; P.y = abs(sin(k * 6)) * 0.25; P.armLz = 2.3; P.armRz = 0.6 + abs(sin(k * 6)) * 1.4; P.roll = sin(k * 6) * 0.12; P.tail = 1.5;
    f.critter.emote('happy', 'open', 0.1);
    if (Math.random() < 0.15) { const h = head(f); f.battle.fx.spawn({ x: h.x + rnd(1.5), y: h.y - 0.6, z: h.z + rnd(1.5), vy: 1, color: 0x9fe6ff, size: 0.3, life: 1.2, shape: 'ring', additive: false, hold: 0.8 }); }
  },
  clovebun(f, P, k) { // backflip hops
    const h = k % 0.9, j = sin(h / 0.9 * Math.PI);
    P.y = j * 1.2; P.lean = -(h / 0.9) * Math.PI * 2; P.ear = -0.4 + j; P.legL = P.legR = -j; P.armLz = P.armRz = 2;
    f.critter.emote('happy', 'grin', 0.1);
    if (h < 0.05 && once(f, 'h' + Math.floor(k / 0.9))) f.battle.fx.dust(f, 5, 0.7);
  },
  voltferret(f, P, k) { // finger-guns and crackles
    P.yaw = sin(k * 3) * 0.6; P.armRx = -1.6; P.armLz = 1.6 + sin(k * 12) * 0.2; P.lean = -0.1; P.tail = 2; P.headRoll = 0.2;
    P.y = abs(sin(k * 5)) * 0.12;
    f.critter.emote('happy', 'grin', 0.1);
    if (Math.random() < 0.25) { const c = f.chestPos(); f.battle.fx.spawn({ x: c.x + rnd(1.2), y: c.y + rnd(1.2), z: c.z + rnd(1.2), color: 0xfff060, size: 0.6, stretch: 0.15, rot: Math.random() * 6, life: 0.12, shape: 'spark' }); }
  },
  whirlwhisk(f, P, k) { // twirls on one foot, tail swirling, little gusts
    P.yaw = (k * 4) % (Math.PI * 2); P.armLz = P.armRz = 1.4; P.legL = 0.5; P.tail = 1.8 + sin(k * 10) * 0.4; P.y = 0.1 + abs(sin(k * 8)) * 0.08;
    if ((k % 3) > 1.6) P.yaw = 0; // pause facing front between spins
    f.critter.emote('happy', 'open', 0.1);
    if (Math.random() < 0.15) f.battle.fx.spawn({ x: f.x + rnd(1.5), y: f.y + 0.4 + Math.random(), z: f.z + rnd(1.5), vy: 1.5, color: 0xffffff, size: 0.3, life: 0.5, shape: 'leaf', additive: false, spin: 6 });
  },
  diggles(f, P, k) { // holds up a shiny find, then polishes the helmet
    const show = (k % 3) < 1.7;
    if (show) { P.armLz = 2.6; P.armRz = 0.5 + abs(sin(k * 4)) * 0.3; P.sy = 1.08; P.y = abs(sin(k * 5)) * 0.1; P.headRoll = 0.15; }
    else { P.armLz = P.armRz = 2.2; P.armLx = P.armRx = -1.4 + sin(k * 18) * 0.4; P.head = 0.2; }
    f.critter.emote('happy', show ? 'open' : 'grin', 0.1);
    if (show && Math.random() < 0.2) { const h = head(f, 0.5); f.battle.fx.spawn({ x: h.x + rnd(1.2), y: h.y + rnd(0.6), z: h.z + rnd(1.2), color: 0x9ae4ff, size: 0.35, life: 0.4, shape: 'star', additive: false }); }
  },
  jiggawatt(f, P, k) { // bobs and pulses like a disco light
    P.y = 0.2 + sin(k * 3) * 0.15; P.yaw = sin(k * 1.5) * 0.6; P.armLz = 1.4 + sin(k * 6) * 0.8; P.armRz = 1.4 - sin(k * 6) * 0.8;
    f.critter.emote('happy', 'grin', 0.1);
    if (Math.random() < 0.25) f.battle.fx.spawn({ ...head(f, 0.3), x: f.x + rnd(1.6), z: f.z + rnd(1.6), color: [0xfff060, 0xc8a8ff, 0xff8ad8][Math.floor(Math.random() * 3)], size: 0.4, life: 0.4, shape: 'star', additive: true });
  },
  ripples(f, P, k) { // floats on its back, cracking a clam on its tummy
    P.lean = -0.55; P.y = 0.15 + sin(k * 2) * 0.05; P.legL = P.legR = -0.8;
    P.armLx = P.armRx = -1.6; P.armLz = P.armRz = 0.4 + abs(sin(k * 10)) * 0.5; P.head = 0.4;
    f.critter.emote(sin(k * 10) > 0.6 ? 'closed' : 'happy', 'grin', 0.1);
    if (abs(sin(k * 10)) > 0.97 && Math.random() < 0.5) f.battle.fx.spawn({ ...head(f, -0.2), vy: 2, vx: rnd(2), color: 0xffffff, size: 0.28, life: 0.35, shape: 'star', additive: false, grav: 6 });
  },
  lilypop(f, P, k) { // happy hops in a little circle, croaking
    const ph = (k * 1.6) % 1;
    P.y = sin(ph * Math.PI) * 0.45; P.yaw = sin(k * 1.4) * 0.45; P.legL = P.legR = ph < 0.5 ? -0.7 : 0.4; P.armLz = P.armRz = 1.2 + sin(ph * Math.PI) * 1.0;
    P.sx = 1 + abs(sin(k * 9)) * 0.06;
    f.critter.emote('happy', 'grin', 0.1);
    if (ph > 0.92 && once(f, 'w' + Math.floor(k * 1.6))) f.battle.fx.spawn({ x: f.x, y: 0.05, z: f.z, color: 0x9fe0ff, size: 1.6, life: 0.35, shape: 'ring', alpha: 0.6 });
  },
  pebblepup(f, P, k) { // zoomies: tail-wag spin and happy hops
    P.tail = 1.5 + sin(k * 30) * 0.8; P.y = abs(sin(k * 6)) * 0.2; P.yaw = sin(k * 2.2) * 0.8; P.armLz = P.armRz = 0.8 + abs(sin(k * 6)) * 0.6; P.ear = sin(k * 12) * 0.6;
    f.critter.emote('happy', 'open', 0.1);
    if (abs(sin(k * 6)) < 0.05 && once(f, 'h' + Math.floor(k * 6 / Math.PI))) f.battle.fx.dust(f, 3, 0.6);
  },
  rolladillo(f, P, k) { // proud flex, alternating arms
    const s = sin(k * 3.5) > 0;
    P.armLx = -1.2; P.armRx = -1.2; P.armLz = s ? 1.6 : 0.4; P.armRz = s ? 0.4 : 1.6; P.sy = 1.05 + abs(sin(k * 7)) * 0.05; P.lean = -0.15;
    P.yaw = s ? 0.3 : -0.3;
    f.critter.emote('happy', 'grin', 0.1);
  },
  hootsy(f, P, k) { // hovering spin with feathers
    const w = sin(k * 26);
    P.y = 0.6 + sin(k * 3) * 0.15; P.armLz = P.armRz = 1.3 + w; const sp = Math.min(1, (k % 2.6) / 1.1); P.yaw = (1 - Math.cos(Math.PI * sp)) * Math.PI; // spin bursts, then face front P.legL = P.legR = 0.5;
    f.critter.emote('happy', 'open', 0.1);
    if (Math.random() < 0.12) f.battle.fx.spawn({ x: f.x + rnd(1.5), y: f.y + 1.6, z: f.z + rnd(1.5), vy: -0.5, color: 0xb8c4ff, size: 0.3, life: 1.6, shape: 'leaf', additive: false, spin: 4, drag: 2 });
  },
  pengsicle(f, P, k) { // side-to-side waddle with flapping flippers
    const w = sin(k * 7);
    P.roll = w * 0.25; P.yaw = w * 0.2; P.armLz = 1.2 + abs(sin(k * 14)) * 0.9; P.armRz = 1.2 + abs(sin(k * 14 + 1)) * 0.9;
    P.legL = w > 0 ? 0.4 : 0; P.legR = w < 0 ? 0.4 : 0; P.y = abs(w) * 0.06;
    f.critter.emote('happy', 'open', 0.1);
    if (Math.random() < 0.15) { const h = head(f, 0.5); f.battle.fx.spawn({ x: h.x + rnd(2), y: h.y + 1, z: h.z + rnd(2), vy: -1, color: 0xffffff, size: 0.22, life: 1.6, shape: 'star', additive: false, spin: 3, drag: 1 }); }
  },
  emberfly(f, P, k) { // figure-eight hover with glowing trail
    P.y = 0.7 + sin(k * 4) * 0.2; P.yaw = sin(k * 2) * 0.8; P.roll = sin(k * 4) * 0.25; P.tail = 2.5; P.armLz = P.armRz = 1.6;
    f.critter.emote('happy', 'open', 0.1);
    if (Math.random() < 0.5) f.battle.fx.spawn({ x: f.x + rnd(0.4), y: f.y + P.y + 0.45, z: f.z + rnd(0.4), color: 0xffc93a, size: 0.35, life: 0.8, shape: 'glow', grow: -0.5, alpha: 0.8 });
  },
};

export function introAnim(f, P, k, dt) { (INTRO[f.def.id] || ready)(f, P, k, dt); }
export function winAnim(f, P, k, dt) {
  const fn = WIN[f.def.id];
  if (fn) fn(f, P, k, dt);
  else { const j = abs(sin(k * 6)); P.y = j * 0.5; P.armLz = P.armRz = 2.4; f.critter.emote('happy', 'open', 0.2); }
}
