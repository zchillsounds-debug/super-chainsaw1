// D3: the Amber Sands' fossils. Each desert map hides one dig spot a day (world.js buildDig); under the sand there's often a fossil,
// and every one goes on show in the Sunwell Museum (oasis:museum_o) on its own plinth. Curator Petra rewards 4, 8 and all 12.
// shape: how the plinth model is built (world.js fossilModel). gate: only the Sun Gate's sand hides it.
export const FOSSILS = [
  { id: 'sandshell', name: 'Spiral Sandshell', shape: 'shell', blurb: 'A coiled shell from long ago, when the Amber Sands were a warm, shallow sea.' },
  { id: 'sunbeetle', name: 'Old Sunbeetle', shape: 'beetle', blurb: 'A beetle as big as a dinner plate. Scarabold\'s great-great-great-(lots more greats)-grandparent?' },
  { id: 'rayfin', name: 'Dune Ray Wing', shape: 'wing', blurb: 'One wide fin of a ray that "flew" through the old sea. Skimray would be impressed.' },
  { id: 'mesatooth', name: 'Mesa Tooth', shape: 'tooth', blurb: 'A tooth longer than {hero}\'s paw. Whatever owned it was VERY good at eating.' },
  { id: 'tailspine', name: 'Great Tail Spine', shape: 'spine', blurb: 'A row of tail bones, still in order. It must have swished across the dunes.' },
  { id: 'sandclaw', name: 'Sandclaw', shape: 'claw', blurb: 'Three hooked claws, built for digging. The Dust Devils would have loved one.' },
  { id: 'thunderegg', name: 'Thunder Egg', shape: 'egg', blurb: 'A stone egg that crackles when you hold it near your ear. It never hatched. Probably.' },
  { id: 'hornskull', name: 'Horned Skull', shape: 'skull', blurb: 'A broad skull with two stubby horns. It looks a bit grumpy. Fossils often do.' },
  { id: 'fanfin', name: 'Fan Fin', shape: 'fan', blurb: 'A fin like a lady\'s fan, from a fish that swam where the Sunwell bubbles now.' },
  { id: 'stonecoil', name: 'Stone Coil', shape: 'coil', blurb: 'A tight stone spiral, bigger than a cartwheel when it was alive. Snail? Squid? Nobody agrees.' },
  { id: 'trilobug', name: 'Little Trilobug', shape: 'bug', blurb: 'A tiny segmented critter that crawled the old sea floor. Curator Petra calls it "the cutest rock in the world".' },
  { id: 'sunfeather', name: 'Sun-Bird Feather', shape: 'feather', gate: true, blurb: 'A single long feather turned to golden stone. It is still warm. The old songs say a great bird once slept under these sands...' },
];
export const fossilById = (id) => FOSSILS.find((f) => f.id === id);
