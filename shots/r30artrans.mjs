// node shots/r30artrans.mjs [files...]: list t('...') strings in src/ that have no Arabic (STORY_AR or i18n AR)
import fs from 'fs';
const src = '/home/user/super-chainsaw1/src/';
const { STORY_AR } = await import(src + 'story_ar.js');
const i18n = fs.readFileSync(src + 'i18n.js', 'utf8');
const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(src).filter((f) => f.endsWith('.js') && !f.includes('_ar'));
const strip = (s) => s.trim();
const miss = new Map();
for (const f of files) {
  const s = fs.readFileSync(src + f, 'utf8');
  for (const m of s.matchAll(/\bt\((['"])((?:\\.|(?!\1).)*)\1\)/g)) {
    const k = strip(m[2].replace(/\\'/g, "'").replace(/\\"/g, '"'));
    if (!k || STORY_AR[k] || i18n.includes(`'${k.replace(/'/g, "\\'")}'`) || i18n.includes(`"${k}"`)) continue;
    if (!miss.has(k)) miss.set(k, f);
  }
}
for (const [k, f] of miss) console.log(f + '\t' + k);
console.log('missing:', miss.size);
