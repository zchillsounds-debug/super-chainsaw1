// Save backup / restore (Settings): the whole save as a short text code the player can copy, share
// (to notes, chat, email) or keep as a file, then paste back after a reinstall or on another phone.
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { save, persist } from './save.js';
import { sfx } from './audio.js';

const native = Capacitor.isNativePlatform();
const PREFIX = 'CRITTERCLASH1:';

export function saveCode() {
  const bytes = new TextEncoder().encode(JSON.stringify(save));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return PREFIX + btoa(bin);
}

// accepts a code (or raw save JSON); returns the save object or null
export function parseCode(text) {
  try {
    const t = text.replace(/\s+/g, '');
    let json;
    if (t.startsWith(PREFIX)) { const bin = atob(t.slice(PREFIX.length)); json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))); }
    else json = text.trim();
    const s = JSON.parse(json);
    return s && typeof s === 'object' && s.critters && Array.isArray(s.unlocked) ? s : null;
  } catch { return null; }
}

function summary(s) {
  const lv = Object.values(s.critters || {}).reduce((m, c) => Math.max(m, c?.level || 1), 1);
  return `${s.trainer?.name || 'Trainer'} · ${s.unlocked.length} critters · best Lv ${lv} · ${Object.keys(s.cups || {}).length} cups`;
}

function sheet(root, html) {
  const d = document.createElement('div');
  d.className = 'modal-wrap backup';
  d.innerHTML = `<div class="modal">${html}</div>`;
  d.addEventListener('click', (e) => { if (e.target === d) d.remove(); });
  root.appendChild(d);
  return d;
}

export function backupSheet(root) {
  const code = saveCode();
  const d = sheet(root, `<h2>Back up your save</h2>
    <p class="bk-note">Keep this code somewhere safe (Notes, a chat with yourself, email). Paste it into <b>Restore</b> after reinstalling or on another phone.</p>
    <p class="bk-sum">${summary(save)}</p>
    <textarea class="bk-code" readonly rows="4">${code}</textarea>
    <p class="bk-status"></p>
    <div class="set-foot"><button class="btn ghost-dark bk-close">Close</button><span class="bk-acts"></span></div>`);
  const ta = d.querySelector('.bk-code'), status = (t) => (d.querySelector('.bk-status').textContent = t), acts = d.querySelector('.bk-acts');
  const mk = (label, cls, fn) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.addEventListener('click', fn); acts.appendChild(b); };
  d.querySelector('.bk-close').addEventListener('click', () => { sfx.ui('back'); d.remove(); });
  mk('Copy', '', async () => {
    try { await navigator.clipboard.writeText(code); } catch { ta.select(); document.execCommand('copy'); }
    status('Copied! Paste it somewhere safe.'); sfx.ui('ok');
  });
  if (native) {
    mk('Save file', '', async () => {
      try { await Filesystem.writeFile({ path: 'CritterClash/critter-clash-save.txt', data: code, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true }); status('Saved to Documents/CritterClash/critter-clash-save.txt'); sfx.ui('ok'); }
      catch { status("Couldn't save the file. Try Share or Copy instead."); sfx.ui('back'); }
    });
    mk('Share', 'primary', () => Share.share({ title: 'Critter Clash save', text: code }).catch(() => {}));
  } else if (navigator.share) mk('Share', 'primary', () => navigator.share({ title: 'Critter Clash save', text: code }).catch(() => {}));
  ta.addEventListener('focus', () => ta.select());
}

export function restoreSheet(root) {
  const d = sheet(root, `<h2>Restore a save</h2>
    <p class="bk-note">Paste your backup code, or pick the saved file. This replaces the progress on this phone.</p>
    <textarea class="bk-code" rows="4" placeholder="CRITTERCLASH1:..."></textarea>
    <p class="bk-status"></p>
    <div class="set-foot"><button class="btn ghost-dark bk-close">Cancel</button><span class="bk-acts"><label class="btn bk-file">Pick file<input type="file" accept=".txt,.json,text/plain" hidden></label><button class="btn primary bk-go">Restore</button></span></div>`);
  const ta = d.querySelector('.bk-code'), status = (t) => (d.querySelector('.bk-status').textContent = t), go = d.querySelector('.bk-go');
  let armed = null;
  const check = () => {
    const s = parseCode(ta.value);
    status(ta.value.trim() ? (s ? 'Found: ' + summary(s) : "That code doesn't look right. Copy the whole thing, starting with CRITTERCLASH1:") : '');
    return s;
  };
  const edited = () => { armed = null; go.textContent = 'Restore'; go.classList.remove('armed'); check(); };
  ta.addEventListener('input', edited);
  d.querySelector('.bk-file input').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (f) { ta.value = await f.text(); edited(); }
  });
  d.querySelector('.bk-close').addEventListener('click', () => { sfx.ui('back'); d.remove(); });
  go.addEventListener('click', () => {
    const s = check();
    if (!s) { sfx.ui('back'); return; }
    if (!armed) { armed = s; go.textContent = 'Tap again to replace'; go.classList.add('armed'); return; }
    for (const k of Object.keys(save)) delete save[k];
    Object.assign(save, armed); persist();
    location.reload(); // start fresh from the restored save
  });
}
