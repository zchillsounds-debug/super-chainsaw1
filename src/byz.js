// Round 23: the look of Arsaber's company. Every adversary is Byzantine: lamellar klibania over padded kavadia
// (the qaba coat), crested and aventailed helmets for the line, felt caps for light troops, oval and round shields
// painted in unit colours with plain bands, cropped hair and beards. No turbans, no qalansuwa, no veils, and no
// sign or emblem of any kind (the design rule): shields carry bands only, banners are plain.
const pick = (a) => a[Math.floor(Math.random() * a.length)];
// Anatolian, Greek and Armenian complexions; dark hair and beards, now and then a grey one
export const SKINS = [0xb07a52, 0xa06c46, 0xc08a60, 0x9a6440];
const BEARDS = [0x1a120c, 0x2a1c12, 0x3a2a1a, 0x24180e, 0x6a6058];
// coats in the company's colours: madder red, woad blue, ochre, undyed wool, a little green
const COATS = [['#7a2a22', '#c8b48a'], ['#2a3a5a', '#b89a5a'], ['#8a6a3a', '#5a2a1e'], ['#b8ac90', '#6a2a20'], ['#3a4a32', '#a08a5a'], ['#5a2a2a', '#2a2a3a']];
const base = () => {
  const c = pick(COATS);
  return { robe: c[0], robe2: c[1], turban: null, mask: null, skin: pick(SKINS), beard: pick(BEARDS), hair: 'crop', qaba: true, sash: 0x3a2a1e, trousers: 0x2a2620 };
};
const tint = () => Math.floor(Math.random() * 4);
// felt: undyed brown, tan, madder red, grey
const felt = () => pick([0x7a5a3a, 0x9a7a52, 0x7a2a1e, 0x6a625a]);

export const LOOK = {
  // psilos: light infantry, spear and small round shield, a felt cap, no armour but the padded coat
  psilos: () => ({ ...base(), pilos: felt(), weapon: 'spear', offhand: 'shield', shieldKind: 'round', shieldTint: tint(), armour: Math.random() < 0.4 ? 'leather' : null, leather: 0x4a3420 }),
  // skoutatos: the line, spathion and the tall oval shield, helmet with aventail, steel lamellar
  skoutatos: () => ({ ...base(), helm: 'byz', mail: true, weapon: 'sword', offhand: 'shield', shieldKind: 'oval', shieldTint: tint(), armour: 'lamellar', leather: 0x5a5e62, build: 1.08 }),
  // menavlatos: the pikeman with the heavy menavlion
  menavlatos: () => ({ ...base(), helm: 'byz', mail: true, weapon: 'spear', pike: true, armour: 'lamellar', leather: 0x54585c, build: 1.12, belly: 0.1 }),
  // toxotes: an archer in a felt cap and padded coat
  toxotes: () => ({ ...base(), pilos: felt(), weapon: 'bow', armour: 'leather', leather: 0x5a3e24 }),
  // trapezites: a raider of the frontier, knives, lightly dressed, a dark cap
  trapezites: () => ({ ...base(), robe: pick(['#3a3428', '#2e2a24', '#4a3a2a']), robe2: '#2a2018', pilos: felt(), weapon: 'dagger', hunch: 0.25, armour: 'leather', leather: 0x2a1c14 }),
  // the same raiders in the reeds, in dun marsh dress
  reed: () => ({ ...base(), robe: '#4a5236', robe2: '#2a3020', pilos: felt(), weapon: 'spear', hunch: 0.2, armour: 'reed', leather: 0x7a7444 }),
  // siphon-bearer: a hand siphon of liquid fire, a leather hood-cap, a scorched coat
  siphon: () => ({ ...base(), robe: '#3a2418', robe2: '#8a4a1a', pilos: felt(), weapon: 'torch', siphon: true, armour: 'leather', leather: 0x3a2214, sash: 0x5a2a10 }),
  // sphendonistes: a slinger
  slinger: () => ({ ...base(), robe: pick(['#6a5a40', '#8a7a5a']), robe2: '#3a4a3a', pilos: felt(), weapon: 'sling', build: 0.9, armour: Math.random() < 0.5 ? 'leather' : null, leather: 0x6a5030 }),
  // a marine of the river fleet with a weighted net
  marine: () => ({ ...base(), robe: pick(['#2a3a5a', '#3a4a6a']), robe2: '#b8ac90', pilos: felt(), weapon: 'net', build: 1.05, armour: 'leather', leather: 0x4a3a28 }),
  // solenarion archer: kneels to shoot short darts far and flat through the arrow-guide
  solen: () => ({ ...base(), helm: 'byz', weapon: 'crossbow', solen: true, armour: 'leather', leather: 0x3a2a1a }),
  // mechanikos: the company's engineer, a mallet and a leather apron
  mechanikos: () => ({ ...base(), robe: '#5a4a34', robe2: '#8a6a3a', pilos: felt(), weapon: 'mallet', build: 1.08, belly: 0.2, armour: 'leather', leather: 0x5a3a1e }),
  // kataphraktos: an armoured horseman (the horse is added by foes20.js)
  kataphraktos: () => ({ ...base(), helm: 'byz', mail: true, weapon: 'spear', armour: 'scale', leather: 0x2a2a2c, cloak: Math.random() < 0.5 ? 0x5a1a14 : null }),
  // the company's commanders and officers: heavy lamellar, a cloak, the plumed helmet (captainLook adds the crest)
  officer: (coat = '#5a1a14', cloak = 0x5a0e0a) => ({ ...base(), robe: '#1e1a18', robe2: coat, helm: 'byz', mail: true, weapon: 'sword', offhand: 'shield', shieldKind: 'oval', shieldTint: 0, armour: 'heavy', leather: 0x2a2220, cloak, hem: true, detail: 'hi', crest: 'plume' }),
};

// every foe's look passes through here last, so no older look (a captain's turban, a reed hat, a veil) survives:
// felt caps become the pilos, helmets become the ribbed helmet, shields are painted in a unit colour
export function byzify(o) {
  const r = { ...o };
  r.turban = null; r.mask = null;
  if (r.cap || r.hat) { r.pilos = r.cap || r.hat; r.cap = null; r.hat = null; }
  if (r.helm) { r.helm = 'byz'; r.pilos = false; }
  if (!r.keepHair) r.hair = 'crop';
  if (r.beard == null) r.beard = pick(BEARDS);
  if (r.offhand === 'shield' && !r.shieldKind) r.shieldKind = r.helm ? 'oval' : 'round';
  if (r.offhand === 'shield' && r.shieldTint == null) r.shieldTint = tint();
  r.qaba = true;
  return r;
}

// Round 23: the old (pre-Byzantine) captain names, as they sit in older saves' list of slain captains (p.slain,
// the contract targets). save.js maps them to the new names on load.
export const OLD_NAMES = {
  Farud: 'Photeinos', Hisham: 'Olbianos', Ghassan: 'Bardanes', Marwan: 'Katakylas', Sahl: 'Petronas', Rawh: 'Kallinikos',
  "'Asim": 'Narses', Layth: 'Kalokyros', "'Utba": 'Krateros', Bilal: 'Rhentakios', "Mus'ab": 'Skleros', Ghanim: 'Arsaber', Zubayr: 'Tatzates',
  Durayd: 'Lalakon', Mazin: 'Bryennios', Farqad: 'Kourkouas', Shibl: 'Tzantzes', Hajib: 'Mousele', Ghiyath: 'Gongylios', Hawtha: 'Aetios', Murra: 'Monomachos',
  "'Uqba": 'Kalamanos', Nasr: 'Doukas', Bakr: 'Chalkoutzes', Hamdan: 'Pegonites', "Rabi'a": 'Kamoulianos', Jarir: 'Bourtzes',
  Zuhayr: 'Kontoleon', Muhriz: 'Rhangabes', Hammad: 'Kontomytes', Shabib: 'Triphyllios', Kulayb: 'Tzourakes', Dhuhl: 'Melissenos', Asbagh: 'Karteroukas', Kahmas: 'Baanes',
  Qays: 'Kamateros', Thabit: 'Argyros', Mundhir: 'Tornikios', Ghalib: 'Kourtikios', Sawwar: 'Dalassenos', Qutayba: 'Sarantapechos',
  Wahb: 'Taronites', Bujayr: 'Artabasdos', Hurayth: 'Krenites', Sinan: 'Rhadenos', Unays: 'Bringas', Habib: 'Xylinites', Hubaysh: 'Boilas', Mudrik: 'Gabalas',
  Malik: 'Kekaumenos', "Sa'd": 'Kaballarios', "'Ubayd": 'Maniakes', Hani: 'Alyates', Mukhariq: 'Exazenos',
  Sakhr: 'Phobenos', Ghaylan: 'Krambonites', Shaddad: 'Tarchaneiotes', Jabala: 'Charsianites', Dhuayb: 'Apokaukos', Hanzala: 'Pankalos', Nahshal: 'Brachamios',
  Kharija: 'Spondyles', Shamir: 'Apsimar', Tarafa: 'Garidas', Zafir: 'Mavrianos', Hawshab: 'Chalkeus', Qurra: 'Barys',
  "Ka'b": 'Sphenos', Suhaym: 'Pastilas', Juwayn: 'Tzoulas', Qatada: 'Kolybas', Bistam: 'Gouber', Ruzayq: 'Rodophyles', "'Umayr": 'Maleses', Dirar: 'Petzeas', Sharik: 'Chasanes',
  Fadl: 'Bryas', Khalid: 'Kamytzes', Hudhayl: 'Melias', Harith: 'Tzirithon',
};
export function renameSlain(slain) {
  if (!slain) return slain;
  const out = {};
  for (const [k, v] of Object.entries(slain)) out[OLD_NAMES[k] || k] = v;
  return out;
}
