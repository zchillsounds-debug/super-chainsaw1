// Per-critter personality: signature intro and victory animations plus their catchphrases.
// Each anim gets (f, P, k, dt): the fighter, its pose targets, seconds into the anim, frame dt.
import { sfx } from './audio.js';

const sin = Math.sin, abs = Math.abs;
const once = (f, key) => { if (f.fxOnce?.[key]) return false; (f.fxOnce ||= {})[key] = true; return true; };
const head = (f, up = 0) => { const h = f.headPos(); h.y += up; return h; };
const mouth = (f) => ({ x: f.x + Math.sin(f.face) * 0.45, y: f.y + f.def.body.h + f.def.body.headR * 0.8, z: f.z + Math.cos(f.face) * 0.45 });
const rnd = (s) => (Math.random() - 0.5) * s;

export const LINES = {
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
  pricklepuff: { intro: ["Don't touch the spines!", 'Prickly and proud!', "Hmph. Fine. Let's go."], win: ['Told you. Prickly.', 'Leaf me alone now.', 'Hmph! Too easy.'] },
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
