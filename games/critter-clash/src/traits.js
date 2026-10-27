// passive traits: one per critter, always on in every battle (battle.js / fighter.js read f.trait)
// k: the mechanic; each critter's line says what it does in plain words
export const TRAITS = {
  cindermunch: { k: 'meter', icon: '🌰', name: 'Cheek Stash', desc: 'Its super meter fills 15% faster.' },
  bubbalotl: { k: 'regen', icon: '💧', name: 'Regrowth', desc: 'Slowly heals after 3 seconds without being hit (up to 60% health).' },
  clovebun: { k: 'lucky', icon: '🍀', name: 'Lucky Clover', desc: 'One hit in eight only grazes it, for half damage.' },
  voltferret: { k: 'dodgecd', icon: '👟', name: 'Quick Feet', desc: 'Its dodge roll recharges 35% faster.' },
  rolladillo: { k: 'guard', icon: '🛡️', name: 'Curl Up', desc: 'Its guard lasts 35% longer before it breaks.' },
  hootsy: { k: 'night', icon: '🌙', name: 'Night Owl', desc: '12% faster and 8% stronger in night fights.' },
  pengsicle: { k: 'resist', icon: '🧊', name: 'Cold Blooded', desc: 'Takes 25% less from super-effective hits.' },
  emberfly: { k: 'specialcd', icon: '🏮', name: 'Bright Spark', desc: 'Its special recharges 20% faster.' },
  pricklepuff: { k: 'thorns', icon: '🌵', name: 'Prickly', desc: 'Rivals who hit it up close take 10% of the damage back.' },
  woolt: { k: 'kb', icon: '🐑', name: 'Thick Fur', desc: 'Gets knocked back 30% less.' },
  pebblepup: { k: 'endure', icon: '💪', name: 'Hang On', desc: 'Once a battle, it holds on with 1 HP after a knockout blow.' },
  whirlwhisk: { k: 'tailwind', icon: '🍃', name: 'Tailwind', desc: 'Always runs 7% faster.' },
  lilypop: { k: 'rain', icon: '☔', name: 'Rain Dance', desc: '12% stronger in the rain and by the sea.' },
  diggles: { k: 'sturdy', icon: '⛑️', name: 'Hard Hat', desc: 'Takes 20% less from projectiles.' },
  ripples: { k: 'combo', icon: '🌊', name: 'Playful', desc: 'Combo hits from the third on do 15% more.' },
  jiggawatt: { k: 'dizzy', icon: '⚡', name: 'Static Cling', desc: 'Its hits make rivals 35% dizzier.' },
  kindlekit: { k: 'hothead', icon: '🔥', name: 'Hot Head', desc: 'Its flame trail burns 50% longer.' },
  squeakwing: { k: 'night', icon: '🦇', name: 'Night Flyer', desc: '12% faster and 8% stronger in night fights.' },
  snoozlo: { k: 'calm', icon: '😴', name: 'Deep Sleeper', desc: 'Shrugs off dizziness: 45% less.' },
  smokeshell: { k: 'shell', icon: '🐚', name: 'Hard Shell', desc: 'Takes 10% less damage while above half health.' },
  blowfin: { k: 'laststand', icon: '🐡', name: 'Puff Up', desc: '20% stronger below 30% health.' },
  mossloth: { k: 'heavy', icon: '💤', name: 'Big Swing', desc: 'Its hits knock rivals back 20% further.' },
  toucharge: { k: 'first', icon: '📣', name: 'Loud Opener', desc: 'Its first hit each round does 50% more.' },
  pumicub: { k: 'rage', icon: '🐻', name: 'Riled Up', desc: '12% faster below half health.' },
  skimray: { k: 'slip', icon: '💨', name: 'Slipstream', desc: 'A dodge leaves it 15% faster for 2 seconds.' },
  solmoth: { k: 'sun', icon: '☀️', name: 'Sunlit', desc: '8% stronger in daytime fights.' },
  moonwhal: { k: 'moon', icon: '🌕', name: 'Moon Child', desc: 'At night its special recharges 30% faster and it hits 8% harder.' },
  sizzlard: { k: 'sun', icon: '🦎', name: 'Sunbask', desc: '8% stronger in daytime fights.' },
  humpdrop: { k: 'regen', icon: '🐪', name: 'Water Hump', desc: 'Slowly heals after 3 seconds without being hit (up to 60% health).' },
  cactortle: { k: 'thorns', icon: '🌵', name: 'Spiny Shell', desc: 'Rivals who hit it up close take 10% of the damage back.' },
  fennzap: { k: 'dodgecd', icon: '👂', name: 'Big Ears', desc: 'Hears blows coming: its dodge roll recharges 35% faster.' },
  scarabold: { k: 'kb', icon: '🪲', name: 'Dug In', desc: 'Gets knocked back 30% less.' },
  aurelark: { k: 'sunrise', icon: '🌅', name: 'Sunrise Song', desc: 'Once a battle, a knockout blow can\'t keep it down: it rises again with 20% health.' },
  siroccat: { k: 'slip', icon: '🥽', name: 'Sand Runner', desc: 'A dodge leaves it 15% faster for 2 seconds.' },
  verdelk: { k: 'roots', icon: '🌳', name: 'Deep Roots', desc: 'Heals 15% of the damage its specials and supers deal.' },
};

export const traitOf = (def) => TRAITS[def?.base || def?.id] || null;

// a small chip for info cards and the Move List
export const traitChip = (def) => { const t = traitOf(def); return t ? `<div class="trait"><i>${t.icon}</i><div><small>Trait</small><b>${t.name}</b><p>${t.desc}</p></div></div>` : ''; };
