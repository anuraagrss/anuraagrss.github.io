// A journal you turn page by page, and a pencil that writes on it.
// Used by the journal (journal.html) and the logbook. No endless scrolling: the book fits
// the screen; a turned page brings the next spread, and its words are written in as you look.

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PENCIL = '<svg class="pencil" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21l2.5-7.5L16 3l5 5L10.5 18.5z" fill="#d8b46a" stroke="#3f3125" stroke-width="1"/><path d="M3 21l2.5-7.5 5 5z" fill="#f2e3c4" stroke="#3f3125" stroke-width="1"/><path d="M3 21l1.2-3.4 2.2 2.2z" fill="#3f3125"/></svg>';

// ── the pencil ──
// Elements marked data-pen="c" are written letter by letter (handwriting),
// data-pen="w" word by word (longer prose). They are written in document order.
export function pencil(root, { speed = 1, follow = null, wait = 0 } = {}) {
  let cancelled = false, userMoved = false;
  const items = [...root.querySelectorAll('[data-pen]')];
  // Everything on the page that isn't written waits its turn:
  //  .pen-after — appears when the pencil reaches it, in reading order (after whatever is written before it)
  //  .pen-with  — appears once the words in its own block are written (a place's photo after its name)
  const showAfter = scope => scope.querySelectorAll('.pen-after, .pen-with').forEach(a => a.classList.add('shown'));
  const revealBefore = next => root.querySelectorAll('.pen-after:not(.shown)').forEach(a => {
    if (!next || (a.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING)) a.classList.add('shown');
  });
  const finishAll = () => { cancelled = true; root.querySelectorAll('.pen-u').forEach(s => s.classList.add('in')); root.querySelectorAll('.pen-tip').forEach(p => p.remove()); showAfter(root); };
  if (reduced) { showAfter(root); return { cancel: () => { cancelled = true; }, finish: finishAll }; }
  if (!items.length) {
    const t = setTimeout(() => { if (!cancelled) showAfter(root); }, wait);
    return { cancel: () => { cancelled = true; clearTimeout(t); }, finish: () => { clearTimeout(t); finishAll(); } };
  }

  // wrap every letter/word in a hidden span, keeping any markup inside
  items.forEach(el => {
    const mode = el.dataset.pen;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const parts = mode === 'c' ? [...n.textContent] : n.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach(t => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
            const s = document.createElement('span'); s.className = 'pen-u'; s.textContent = t; frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('no-pen')) walk(n);
      });
    };
    walk(el);
  });

  // if the reader scrolls on their own, stop following the pencil
  if (follow) {
    const stop = () => { userMoved = true; };
    follow.addEventListener('wheel', stop, { passive: true, once: true });
    follow.addEventListener('touchmove', stop, { passive: true, once: true });
  }

  // the pace of someone reading: a word at a time, longer at a comma, longest at the end of a thought
  const pause = (t, mode) => {
    const base = mode === 'c' ? 62 : 190;
    if (mode === 'c') return (/[.!?]/.test(t) ? 360 : /[,;:—–-]/.test(t) ? 180 : base) / speed;
    return (base + t.length * 6 + (/[.!?]["')]*$/.test(t) ? 520 : /[,;:—–]["')]*$/.test(t) ? 220 : 0)) / speed;
  };
  (async () => {
    if (wait) await new Promise(r => setTimeout(r, wait));   // let the page settle before the pencil touches it
    if (cancelled) return;
    const tip = document.createElement('span'); tip.className = 'pen-tip'; tip.innerHTML = PENCIL;
    revealBefore(items[0]);                                   // what comes before the first written line
    for (const [k, el] of items.entries()) {
      const units = [...el.querySelectorAll('.pen-u')], mode = el.dataset.pen;
      for (const u of units) {
        if (cancelled) return;
        u.classList.add('in'); u.after(tip);
        if (follow && !userMoved) {
          const r = tip.getBoundingClientRect(), box = follow.getBoundingClientRect();
          if (r.bottom > box.bottom - 140) follow.scrollBy({ top: r.bottom - box.bottom + 220, behavior: 'smooth' });
        }
        await new Promise(r => setTimeout(r, pause(u.textContent, mode)));
      }
      if (cancelled) return;
      if (el.parentElement) el.parentElement.querySelectorAll(':scope > .pen-with').forEach(a => a.classList.add('shown'));
      revealBefore(items[k + 1]);                               // what sits between this line and the next
      await new Promise(r => setTimeout(r, (mode === 'c' ? 240 : 650) / speed));   // a breath between lines
    }
    tip.remove();
    showAfter(root);
  })();
  return { cancel: () => { cancelled = true; }, finish: finishAll };
}

// ── how a story is set: one word, pause, the big statement ──
// Short lines get room; the shortest true sentence of a long paragraph is lifted out in handwriting;
// one line goes gold; a short last line is set as the ending. Used for every story on the site.
const escH = t => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export function emphasize(paras) {
  // one word, pause, the big statement: short lines get room; one of them gets the gold
  const ones = paras.filter(p => p.textContent.trim().length < 70);
  ones.forEach(p => p.classList.add('one'));
  const mid = paras.length / 2, gold = ones.filter(p => p !== paras.at(-1))
    .sort((a, b) => Math.abs(paras.indexOf(a) - mid) - Math.abs(paras.indexOf(b) - mid))[0];
  if (gold) gold.classList.add('gold');
  const last = paras.at(-1);
  if (last && last.textContent.trim().length < 90) { last.classList.remove('one', 'gold'); last.classList.add('end'); }

  // long paragraphs get the same weight: their short, true sentences are lifted out in the line,
  // one per paragraph, so every story reads with the pauses the short ones have
  const lifted = [];
  paras.filter(p => !p.classList.contains('one') && !p.classList.contains('end')).forEach(p => {
    if (p.children.length) return;                                   // leave anything with markup alone
    const parts = p.textContent.split(/(?<=[.!?])\s+/);
    const pick = parts.map((t, i) => [t, i]).filter(([t]) => t.length >= 14 && t.length <= 72).sort((a, b) => a[0].length - b[0].length)[0];
    if (!pick || parts.length < 2) return;
    p.innerHTML = parts.map((t, i) => i === pick[1] ? `<span class="lift">${escH(t)}</span>` : escH(t)).join(' ');
    lifted.push(p.querySelector('.lift'));
  });
  if (!gold && lifted.length) lifted[Math.floor(lifted.length / 2)].classList.add('gold');
}

// ── the book ──
// spreads: [{ key, left: html, right: html, onShow?(leftEl, rightEl) }]
export function createBook({ root, spreads, tabs = [], onTurn }) {
  const L = root.querySelector('.pg-l'), R = root.querySelector('.pg-r');
  const prev = root.querySelector('[data-turn="prev"]'), next = root.querySelector('[data-turn="next"]');
  const pos = root.querySelector('[data-turn="pos"]'), tabBox = root.querySelector('[data-turn="tabs"]');
  const single = () => matchMedia('(max-width: 760px)').matches;
  let at = 0, side = 0, pen = null;          // side: 0 = left page, 1 = right page (single-page mode)

  tabBox && (tabBox.innerHTML = tabs.map(t => t.href
    ? `<a class="ribbon" href="${t.href}">${t.label}</a>`
    : `<button class="ribbon" type="button" data-key="${t.key}">${t.label}</button>`).join(''));
  tabBox && tabBox.querySelectorAll('[data-key]').forEach(b => b.onclick = () => goKey(b.dataset.key));

  function paint({ wait = 0 } = {}) {
    const s = spreads[at];
    pen && pen.finish();
    L.innerHTML = s.left || ''; R.innerHTML = s.right || '';
    root.classList.toggle('show-right', single() && side === 1);
    L.scrollTop = 0; R.scrollTop = 0;
    const shown = single() ? (side ? R : L) : root.querySelector('.spread');
    // nothing is written while the journal is closed — the pencil waits for the cover to open
    pen = root.classList.contains('closed') ? null : pencil(shown, { wait });
    s.onShow && s.onShow(L, R);
    if (prev) prev.disabled = at === 0 && side === 0;
    if (next) next.disabled = at === spreads.length - 1 && (!single() || side === 1);
    if (pos) pos.textContent = `${at + 1} / ${spreads.length}`;
    tabBox && tabBox.querySelectorAll('[data-key]').forEach(b => b.classList.toggle('on', s.key === b.dataset.key || (s.group && s.group === b.dataset.key)));
    onTurn && onTurn(s, at);
  }
  function turn(dir, to) {
    const sp = root.querySelector('.spread');
    if (reduced) { to(); paint(); return; }
    sp.classList.remove('flip-next', 'flip-prev'); void sp.offsetWidth;
    sp.classList.add(dir > 0 ? 'flip-next' : 'flip-prev');
    setTimeout(() => { to(); paint({ wait: 700 }); }, 520);                 // the new page lands, then the pencil starts
    setTimeout(() => sp.classList.remove('flip-next', 'flip-prev'), 1300);
  }
  function step(dir) {
    if (single()) {
      if (dir > 0) { if (side === 0) return turn(1, () => { side = 1; }); if (at < spreads.length - 1) return turn(1, () => { at++; side = 0; }); }
      else { if (side === 1) return turn(-1, () => { side = 0; }); if (at > 0) return turn(-1, () => { at--; side = 1; }); }
      return;
    }
    const n = at + dir; if (n < 0 || n >= spreads.length) return;
    turn(dir, () => { at = n; });
  }
  function go(i) { if (i < 0 || i >= spreads.length || (i === at && side === 0)) return; const d = i >= at ? 1 : -1; turn(d, () => { at = i; side = 0; }); }
  function goKey(k) { go(spreads.findIndex(s => s.key === k || s.group === k)); }

  prev && (prev.onclick = () => step(-1));
  next && (next.onclick = () => step(1));
  // click the outer edge of a page to turn it, like a real corner
  root.querySelector('.spread').addEventListener('click', e => {
    if (e.target.closest('button, a, input, textarea, [data-k], li[tabindex], .no-turn')) return;
    const r = e.currentTarget.getBoundingClientRect(), x = e.clientX - r.left;
    if (x > r.width - 46) step(1); else if (x < 46) step(-1); else pen && pen.finish();
  });
  addEventListener('keydown', e => {
    if (document.querySelector('.sheet:not([hidden])') || /input|textarea/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1);
  });
  let sx = null;
  root.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1); sx = null; });
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { side = 0; paint(); }, 200); });

  paint();
  // swap in a new set of spreads (e.g. the page got taller and fits more), staying on the same spread
  function setSpreads(next) {
    const key = spreads[at] && spreads[at].key;
    spreads = next; at = Math.max(0, spreads.findIndex(s => s.key === key)); side = 0; paint();
  }
  return { go, goKey, step, setSpreads, repaint: paint, get at() { return at; } };
}
