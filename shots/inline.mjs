// node shots/inline.mjs out.html : inline the built JS and CSS into one file and drop the PWA links (for the Artifact)
import fs from 'fs';
const out = process.argv[2] || 'out.html';
let h = fs.readFileSync('dist/index.html', 'utf8');
h = h.replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n?/g, '');
h = h.replace(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+)">/, (_, f) => `<style>${fs.readFileSync('dist/' + f, 'utf8')}</style>`);
let js = '';
h = h.replace(/<script type="module" crossorigin src="\.\/(assets\/[^"]+)"><\/script>/, (_, f) => { js = fs.readFileSync('dist/' + f, 'utf8'); return ''; });
// the module goes at the end of body so the DOM exists; escape any closing script tags inside it
h = h.replace('</body>', () => `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>\n</body>`);
fs.writeFileSync(out, h);
console.log(out, (h.length / 1024).toFixed(0) + ' KB');
