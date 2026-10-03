// Panels as sheets: one open at a time, over a dimmed backdrop. A sheet closes from its ✕, a tap on the
// backdrop, the Android back button (a history entry is pushed while a sheet is open) or a swipe down on
// its header. Panels are built by several modules, so open sheets are found in the DOM rather than registered.
const SHEETS = ['#inv:not(.hidden)', '#shop', '#journal', '#settings', '#tmenupop:not(.hidden)'];
export const haptic = (ms = 8) => { try { if (document.body.classList.contains('touch')) navigator.vibrate?.(ms); } catch { /* unsupported */ } };

export function setupSheets(ui, closers) {
  const root = ui.root;
  const bg = document.createElement('div'); bg.id = 'sheetbg'; root.appendChild(bg);
  const openList = () => { const out = []; for (const s of SHEETS) out.push(...root.querySelectorAll(s)); return out; };
  const closeEl = (el) => { (closers[el.id] || (() => el.remove()))(); };
  const closeAll = () => { ui.closeCard?.(); for (const el of openList()) closeEl(el); document.body.classList.remove('mapopen'); sync(); };
  let prev = [];
  function sync() {
    const list = openList();
    // a newly opened sheet replaces whatever was open before it
    const fresh = list.filter((el) => !prev.includes(el));
    if (fresh.length && list.length > fresh.length) for (const el of list) if (!fresh.includes(el)) closeEl(el);
    const now = openList(); prev = now;
    const open = now.length > 0 || document.body.classList.contains('mapopen');
    bg.classList.toggle('on', open);
    document.body.classList.toggle('insheet', open);
    document.body.classList.toggle('inshop', now.length > 0);
    for (const el of now) if (!el.dataset.sheet) { el.dataset.sheet = '1'; el.classList.add('sheet'); }
    if (fresh.length) haptic(10);
    // one history entry stands for "a sheet is open"; it is reused rather than popped on close (popping it
    // from code races the next open), so Back closes the open sheet and never leaves the game
    if (open && history.state?.sheet !== 1) { try { history.pushState({ sheet: 1 }, ''); } catch { /* sandboxed frame */ } }
  }
  addEventListener('popstate', () => { if (bg.classList.contains('on')) closeAll(); });
  new MutationObserver(sync).observe(root, { childList: true });
  const watch = (el) => el && new MutationObserver(sync).observe(el, { attributes: true, attributeFilter: ['class'] });
  watch(root.querySelector('#inv')); watch(document.body);
  bg.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); closeAll(); });

  // swipe down on a sheet's header (or the menu sheet's handle) to close it
  let sw = null;
  root.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('.sheet .ptitle, #tmenupop .grab'); if (!h || e.target.closest('.close,button')) return;
    sw = { id: e.pointerId, y: e.clientY, el: h.closest('.sheet'), dy: 0 };
  });
  addEventListener('pointermove', (e) => {
    if (!sw || e.pointerId !== sw.id) return; sw.dy = Math.max(0, e.clientY - sw.y);
    sw.el.style.translate = `0 ${sw.dy}px`; sw.el.style.transition = 'none';
  });
  const end = (e) => {
    if (!sw || e.pointerId !== sw.id) return; const { el, dy } = sw; sw = null;
    el.style.transition = ''; el.style.translate = '';
    if (dy > 70) { haptic(12); closeEl(el); sync(); }
  };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);
  // pressed-state haptics for everything tappable inside a sheet
  root.addEventListener('pointerdown', (e) => { if (e.target.closest('.sheet button, .sheet .cell, .sheet .eslot, .sheet .close, .sheet summary, #icard button')) haptic(6); }, true);

  return { closeAll, sync, watch, get open() { return bg.classList.contains('on'); } };
}
