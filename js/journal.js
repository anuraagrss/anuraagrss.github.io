// The journal: a book turned page by page — the start page, letters, the road, the depth, the bench.
import { esc, countLine, boyLetter, setSky } from './late-sun-data.js';
import { LETTERS, LINES, ZNMD } from './late-sun-content.js';
import { createBook, pencil } from './book.js';
import { proofHere } from './proof.js';
import { S, ICONS, initReading, threadList, openThread, openCafes, openJournal, openRead, show } from './reading.js';

setSky();

const $ = id => document.getElementById(id);
let data = null, book = null;

// ── PAGES ──
const letterPage = l => l ? `
  <p class="lt-to" data-pen="c">${esc(l.to)}</p>
  <div class="lt-body">${l.body.split(/\n\s*\n/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}</div>
  <p class="lt-cite" data-pen="c">${esc(l.cite)}</p>${l.link ? `<a class="lt-link" href="${l.link}">open the logbook →</a>` : ''}` : '';

// The ways in, said the way he'd say them. Draft lines — his to change.
const WAYS = [
  { k: 'people',     line: 'for the strangers who became a story',   what: 'people I met' },
  { k: 'hard',       line: 'for the days nobody posts',              what: 'hard days I lived' },
  { k: 'moments',    line: 'for a moment that stopped time',         what: 'moments that stayed' },
  { k: 'adventures', line: 'for the jump, before the fear caught up', what: 'times I jumped' },
  { k: 'cafes',      line: 'for a chair, a cup, and nowhere to be',  what: 'cafes I sat in' },
  { k: 'photos',     line: 'for just the light',                     what: 'photographs I took' },
];
// ── THE NUMBERS the cover strap and the closing page both carry ──
function stats() {
  const F = data.flights;
  return { continents: 7, countries: data.countries.length, flights: F.length,
           miles: Math.round(F.reduce((s, f) => s + (f.distance_miles || 0), 0) / 1000),
           airlines: new Set(F.map(f => f.airline).filter(Boolean)).size };
}

// ── THE COVER: leather, the headline pressed in, ALIVE in gold, me as a sticker, the strap with the numbers ──
function renderCover() {
  const n = stats();
  $('cvTag').textContent = 'AREY · DREAMER';
  $('cvLabel').textContent = LINES.hero;
  $('cvStrap').innerHTML = `
    <span class="sx"><b>${n.continents} <em>continents</em></b><small>including Antarctica</small></span>
    <span class="sx"><b>${n.countries}<i>+</i></b><small>countries visited</small></span>
    <span class="sx"><b>${n.flights}</b><small>flights taken</small></span>
    <span class="sx"><b>${n.miles}<i>K+</i></b><small>miles in the air</small></span>
    <span class="sx"><b>${n.airlines}</b><small>airlines flown</small></span>`;
}

// ── THE INSIDE COVER: Letters Across Time — a bundle of envelopes tied with twine ──
// Pick one up: it opens, the letter unfolds, and the pencil writes it in. Fold it back to put it away.
let letters = [], openLt = null, letterPen = null;
function pocketPage() {
  return `<p class="lt-eyebrow">— // letters across time</p><div class="letter-desk" id="letterDesk"></div>`;
}
function renderLetter(root = document) {
  const desk = root.querySelector('#letterDesk'); if (!desk) return;
  letterPen && letterPen.finish();
  if (openLt === null) {
    desk.innerHTML = `<div class="bundle">${letters.map((l, i) => `
        <button type="button" class="env" data-env="${i}" style="--i:${i};--r:${((i * 37) % 7) - 3}deg" aria-label="open the letter ${esc(l.to)}">
          <span class="env-stamp"><b>${esc(l.stampIcon || '✈')}</b><small>${esc(l.stampLabel || '')}</small></span>
          <span class="env-pm">${esc((l.postmark || '').replace('\n', ' · '))}</span>
          <span class="env-to">${esc(l.to)}</span>
          ${l.fromSub ? `<span class="env-from">${esc(l.fromSub)}</span>` : ''}
        </button>`).join('')}
        <span class="twine" aria-hidden="true"></span></div>
      <p class="lt-hint">pick one up</p>`;
    return;
  }
  const l = letters[openLt];
  desk.innerHTML = `<div class="opened">
      <div class="env-open" aria-hidden="true"><span class="flap"></span><span class="env-to">${esc(l.to)}</span></div>
      <article class="unfolded">
        <p class="lc-to">${esc(l.to)}</p>${l.fromSub ? `<p class="lc-from">${esc(l.fromSub)}</p>` : ''}
        <div class="lc-body">${l.body.split(/\n\s*\n/).map(p => `<p data-pen="w">${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}</div>
        <p class="lc-cite" data-pen="c">${esc(l.cite)}</p>${l.link ? `<a class="lt-link" href="${l.link}">open my logbook →</a>` : ''}
      </article>
      <div class="lt-actions"><button type="button" data-lt="back">← fold it back</button>
        ${openLt < letters.length - 1 ? `<button type="button" data-lt="next">the next letter →</button>` : ''}</div>
    </div>`;
  desk.closest('.pg').scrollTop = 0;
  setTimeout(() => { letterPen = pencil(desk.querySelector('.unfolded'), { follow: desk.closest('.pg') }); }, 1150);   // after it unfolds
}

// ── THE FIRST PAGE: what are you looking for, as cards that flip ──
function waysPage() {
  const count = k => k === 'cafes' ? S.cafesAll.length : k === 'photos' ? S.photoCount : threadList(k).length;
  const cards = WAYS.filter(w => count(w.k)).map(w => {
    const back = w.k === 'photos' ? `<a href="darkroom.html" class="fc-go">open the darkroom →</a>`
      : `<button type="button" class="fc-go" data-k="${w.k}">read them →</button>`;
    return `<div class="fcard" tabindex="0" role="button" aria-label="${esc(w.line)}">
      <div class="fc-in"><div class="fc-front">${ICONS[w.k] || ''}<span>${esc(w.line)}</span></div>
      <div class="fc-back"><b>${count(w.k)}</b><small>${esc(w.what)}</small>${back}</div></div></div>`;
  }).join('');
  // a first page, said the way I'd say it — draft lines, mine to change
  return `<p class="bg-k">if you found this journal,</p>
    <p class="bg-poem" data-pen="w">it holds the roads I walked,<br>the strangers who stayed,<br>and the mornings the light came late.</p>
    <p class="bg-poem small" data-pen="w">read it slowly. I lived it that way.</p>
    <p class="bg-name" data-pen="c">— <span class="arey">Arey<span class="arey-dots">...<i></i></span></span></p>
    <p class="wi-h" data-pen="c">Dil kya dhoondh raha hai aaj?</p>
    <p class="wi-sub">what is your heart looking for today? open any page, I'll walk you there.</p>
    <div class="fcards">${cards}</div>
    <p class="wi-alt"><button type="button" data-act="contents">the contents</button><span>·</span><button type="button" data-act="fall">let it fall open</button><span>·</span>or turn the page →</p>`;
}

// ── THE CLOSING PAGE: this journal, so far — then the back cover ──
function colophon() {
  const n = stats();
  return `<div class="colophon">
      <p class="cl-k">my journey, so far</p>
      <div class="cl-row"><b>${n.continents} <em>continents</em></b><small>including Antarctica</small></div>
      <div class="cl-row"><b>${n.countries}<i>+</i></b><small>countries visited</small></div>
      <div class="cl-row"><b>${n.flights}</b><small>flights taken</small></div>
      <div class="cl-row"><b>${n.miles}<i>K+</i></b><small>miles in the air</small></div>
      <div class="cl-row"><b>${n.airlines}</b><small>airlines flown</small></div>
      <p class="cl-sig" data-pen="c">still counting. — <span class="arey">Arey<span class="arey-dots">...<i></i></span></span></p>
    </div>`;
}
function backCover() {
  return `<div class="backcover">
      <p class="bc-line">the rest of my journal is still empty. I'm still walking.</p>
      <button type="button" class="bc-close" data-act="close">close my journal</button>
      <p class="bc-nav"><a href="nomad.html">walk with me again</a> · <a href="logbook.html">my logbook</a> · <a href="darkroom.html">my darkroom</a></p>
    </div>`;
}

function countUp(R) {
  R.querySelectorAll('[data-to]').forEach(el => {
    const to = +el.dataset.to, suf = el.dataset.suffix || '', t0 = performance.now(), dur = 1400;
    const tick = now => { const p = Math.min(1, (now - t0) / dur), v = Math.round(to * (1 - Math.pow(1 - p, 3))); el.textContent = v.toLocaleString('en-US') + suf; if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}

function placeBlock(j, pos) {
  const i = S.journals.indexOf(j);
  const snap = (j.photos[0] && j.photos[0].image_url) || (j.stories.find(x => x.img) || {}).img || '';
  const note = j.country && j.country.notes ? j.country.notes : j.stories[0].title;
  return `<button class="place p${pos}" type="button" data-j="${i}">
    ${snap ? `<img class="pl-snap pen-after" src="${esc(snap)}" alt="" loading="lazy">` : ''}
    <span class="pl-name" data-pen="c">${esc(j.name.toLowerCase())}</span>
    <span class="pl-meta pen-after">${esc(countLine(j))}</span>
    <span class="pl-note pen-after">${esc(note)}</span>
  </button>`;
}

// Footprints in pencil, from place to place across a page.
function stepsOn(page) {
  page.querySelectorAll('.pfp').forEach(f => f.remove());
  const box = page.getBoundingClientRect(), pts = [];
  page.querySelectorAll('.place .pl-name').forEach(n => { const r = n.getBoundingClientRect(); pts.push({ x: r.left - box.left + r.width / 2, y: r.top - box.top + page.scrollTop - 14 }); });
  if (!pts.length) return;
  pts.unshift({ x: pts[0].x < box.width / 2 ? box.width * .75 : box.width * .25, y: 8 });
  pts.push({ x: pts.at(-1).x < box.width / 2 ? box.width * .8 : box.width * .2, y: page.scrollHeight - 10 });
  let n = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = { x: pts[k + 1].x, y: pts[k + 1].y - (k + 1 < pts.length - 1 ? 24 : 0) };
    const a2 = { x: a.x, y: a.y + (k > 0 ? 70 : 0) };
    const dx = b.x - a2.x, dy = b.y - a2.y, len = Math.hypot(dx, dy); if (len < 30) continue;
    const ang = Math.atan2(dy, dx) * 180 / Math.PI + 90, nx = -dy / len, ny = dx / len;
    for (let d = 10; d < len - 10; d += 26) {
      const side = n++ % 2 ? 4 : -4, wob = Math.sin(d / 70) * 8;
      const f = document.createElement('i'); f.className = 'pfp';
      f.style.left = (a2.x + dx * d / len + nx * (side + wob)) + 'px';
      f.style.top = (a2.y + dy * d / len + ny * (side + wob)) + 'px';
      f.style.transform = `translate(-50%,-50%) rotate(${ang}deg)`;
      f.style.animationDelay = (n * 90) + 'ms';
      page.appendChild(f);
    }
  }
}

// How far I've come, on one page: the earth, a loop for every time around it, a dotted line to the moon,
// and the numbers written along the drawing like notes in the margin.
function depthPage() {
  const F = data.flights, miles = F.reduce((s, f) => s + (f.distance_miles || 0), 0);
  const earth = miles / 24901, moon = miles / 238855, days = Math.round(miles / 500 / 24);
  const visited = data.countries.filter(c => c.status === 'visited').length, passed = data.countries.filter(c => c.status === 'transiting').length;
  const met = S.all.filter(x => x.tab === 'people').length, first = F[0], loops = Math.floor(earth);
  const ring = i => { const rx = 70 + i * 4.2, ry = 26 + i * 2.6, rot = -16 + i * 2.6; return `<ellipse class="orbit" cx="160" cy="262" rx="${rx}" ry="${ry}" transform="rotate(${rot} 160 262)" style="--d:${i * 110}ms"/>`; };
  const outer = { rx: 70 + loops * 4.2, ry: 26 + loops * 2.6 };
  return `<p class="dp-k">how far I've come</p>
    <div class="omap">
      <svg class="orbits" viewBox="0 0 400 440" aria-label="${earth.toFixed(1)} times around the earth, and to the moon">
        <circle class="earth" cx="160" cy="262" r="40"/>
        <path class="land" d="M140 245c8-6 18-4 22 2s-2 12 6 16 4 12-6 12-12-8-20-6-14-4-10-12 2-8 8-12z"/>
        ${Array.from({ length: loops }, (_, i) => ring(i)).join('')}
        <path class="halfring" d="M ${160 - outer.rx} 262 A ${outer.rx} ${outer.ry} 0 0 1 ${160 + outer.rx} 262" transform="rotate(${-16 + loops * 2.6} 160 262)" style="--d:${loops * 110}ms"/>
        <path class="tomoon" d="M 250 200 C 290 130, 320 100, 344 78" style="--d:${loops * 110 + 500}ms"/>
        <path class="back" d="M 352 90 C 340 130, 330 150, 318 160" style="--d:${loops * 110 + 1500}ms"/>
        <circle class="moon" cx="352" cy="70" r="13"/>
        <g class="plane" transform="translate(286 300) rotate(-28) scale(.7)" style="--d:${loops * 110 + 900}ms"><path d="M21 15.5v-1.8l-8-5V3.2a1.5 1.5 0 0 0-3 0v5.5l-8 5v1.8l8-2.4v4.6l-2 1.5v1.4l3.5-1 3.5 1v-1.4l-2-1.5v-4.6z" transform="translate(-12 -12)"/></g>
      </svg>
      <p class="ann a1" data-pen="c">${miles.toLocaleString('en-US')} miles.</p>
      ${moon >= 1 ? `<p class="ann a3" data-pen="c">to the moon${moon >= 1.4 ? ', and halfway back' : ''}.</p>` : ''}
      <p class="ann a4"><span data-pen="c">about ${days} days of my life, up in the air.</span><small>counted at roughly 500 miles an hour</small></p>
      <p class="ann a2" data-pen="c">around the earth, ${earth.toFixed(1)} times. every loop is me.</p>
      <p class="ann a5" data-pen="c">${visited} countries stood in · ${passed} only passed through.</p>
      <p class="ann a6" data-pen="c">${met} people I met who aren't strangers anymore. ${S.photoCount} photographs. ${S.cafesAll.length} chairs in ${S.cafesAll.length} cafes.</p>
      ${first ? `<p class="ann a7" data-pen="c">it began in ${first.date.slice(0, 4)}, with one flight: ${esc((first.from_city || first.from).toLowerCase())} to ${esc((first.to_city || first.to).toLowerCase())}.</p>` : ''}
    </div>`;
}

// Other places: a contact strip of prints. Each one opens that place's photographs in the darkroom.
function otherPlacesPage(quiet, only) {
  return `<p class="q-h" data-pen="c">other places</p>
    <div class="cstrip">${quiet.map((j, i) => {
      const p = j.photos[0];
      return `<a class="cs" href="darkroom.html#place=${encodeURIComponent(j.name)}" style="--r:${((i * 41) % 9) - 4}deg">
        ${p ? `<img src="${esc(p.image_url)}" alt="" loading="lazy">` : '<span class="cs-blank"></span>'}
        <span>${esc(j.name.toLowerCase())}</span></a>`;
    }).join('')}</div>
    ${only.length ? `<p class="q-h small" data-pen="c">the list</p><p class="q-sub">places I've only passed through. the list ends when this is empty.</p>
      <p class="q-pass-inline">${only.map(c => esc((c.name || '').toLowerCase())).join(' · ')}</p>` : ''}`;
}

const BENCH = `<svg class="bench-sk" viewBox="0 0 220 120" aria-hidden="true">
  <path d="M20 58 L200 54"/><path d="M18 66 L202 62"/><path d="M22 40 Q110 30 198 36"/><path d="M24 48 L196 44"/>
  <path d="M40 66 L36 108"/><path d="M180 62 L184 106"/><path d="M48 66 L50 104"/><path d="M172 62 L170 104"/>
  <path d="M6 110 Q110 104 214 110" class="ground"/></svg>`;
let benchTimer = null, benchPen = null;
function benchPoem(R) {
  const box = R.querySelector('#benchPoem'); if (!box || box.dataset.done) return;
  box.dataset.done = '1';
  box.innerHTML = ZNMD.couplets.map(c => `<p class="bp" data-pen="c">${esc(c)}</p>`).join('')
    + `<p class="bp-final" data-pen="c">${esc(ZNMD.final.toLowerCase().replace(/^\w/, c => c.toUpperCase()))}</p>`
    + `<p class="bp-credit" data-pen="c">${esc(ZNMD.credit)}</p>`
    + `<p class="bq" data-pen="c">and you — what's the proof you're still alive?</p>`
    + `<p class="bench-sig" data-pen="c">— <span class="arey">Arey<span class="arey-dots">...<i></i></span></span></p>`;
  benchPen = pencil(box, { follow: box.closest('.pg') });
  proofHere(box.querySelector('.bq').insertAdjacentElement('afterend', Object.assign(document.createElement('div'), { className: 'late' })), 'journal');
}

// as many places as the page has room for — three on a laptop, more on a tall screen
function perPage() {
  const pg = document.querySelector('#book .pg-l'), h = pg ? pg.clientHeight : 600;
  return Math.max(2, Math.min(6, Math.floor((h - 40) / 175)));
}
let lastPer = 0;
addEventListener('resize', () => {
  clearTimeout(perPage.t);
  perPage.t = setTimeout(() => { if (book && data && perPage() !== lastPer) { lastPer = perPage(); book.setSpreads(spreads()); } }, 250);
});

function spreads() {
  lastPer = perPage();
  const out = [];
  letters = LETTERS.map(l => ({ ...l }));
  const boy = boyLetter(data.flights); if (boy) letters.push({ ...boy, stampIcon: '✈', stampLabel: 'THE LOGBOOK', postmark: 'IN FLIGHT' });
  out.push({ key: 'begin', left: pocketPage(), right: waysPage(), onShow: L => renderLetter(L) });

  const places = S.journals.filter(j => j.stories.length), PER = perPage();
  const pages = [];
  for (let i = 0; i < places.length; i += PER) pages.push(places.slice(i, i + PER));
  for (let i = 0; i < pages.length; i += 2) {
    const page = ps => (ps || []).map((j, k) => placeBlock(j, k)).join('');
    out.push({ key: i === 0 ? 'road' : 'road-' + i, group: 'road',
      left: (i === 0 ? `<p class="rd-line" data-pen="w">${esc(LINES.experiences)}</p>` : '') + page(pages[i]),
      right: page(pages[i + 1]),
      onShow: (L, R) => setTimeout(() => { stepsOn(L); stepsOn(R); }, 650) });   // after the page has finished turning
  }

  const quiet = S.journals.filter(j => !j.stories.length);
  const only = data.countries.filter(c => c.status === 'transiting' || /airport only/i.test(c.notes || '')).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  out.push({ key: 'depth', left: depthPage(), right: otherPlacesPage(quiet, only),
    onShow: L => setTimeout(() => L.querySelector('.orbits') && L.querySelector('.orbits').classList.add('draw'), 650) });

  out.push({ key: 'bench',
    left: `${BENCH}<p class="bn-h" data-pen="c">stay a while.</p><p class="bn-sub">the road will wait. so will the light.</p>`,
    right: `<div id="benchPoem" class="bench-poem"></div>`,
    onShow: (L, R) => { clearTimeout(benchTimer); benchTimer = setTimeout(() => benchPoem(R), 3500); } });
  out.push({ key: 'end', left: colophon(), right: backCover() });
  return out;
}

async function loadPage() {
  try {
    data = (await initReading()).data;
    renderCover();
    book = createBook({
      root: $('book'), spreads: spreads(),
      tabs: [],
      onTurn: s => { if (s.key !== 'bench') { clearTimeout(benchTimer); benchPen && benchPen.finish(); } },
    });
  } catch (e) {
    console.error(e);
    document.querySelector('#book .pg-l').innerHTML = '<p>the journal didn\'t open. try again in a bit.</p>';
  }
}

$('book').addEventListener('keydown', e => {
  const fc = e.target.closest && e.target.closest('.fcard');
  if (fc && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fc.classList.toggle('flipped'); }
});

// everything on the pages is clickable through one listener, since pages are redrawn on every turn
$('book').addEventListener('click', e => {
  const fc = e.target.closest('.fcard');
  if (fc && !e.target.closest('.fc-go')) { fc.classList.toggle('flipped'); return; }
  const k = e.target.closest('[data-k]'), j = e.target.closest('[data-j]'), act = e.target.closest('[data-act]');
  if (k) { k.dataset.k === 'cafes' ? openCafes() : openThread(k.dataset.k); }
  else if (j) openJournal(+j.dataset.j);
  else if (act && act.dataset.act === 'contents') show('contents');
  else if (act && act.dataset.act === 'close') closeBook();
  else if (e.target.closest('[data-env]')) { openLt = +e.target.closest('[data-env]').dataset.env; renderLetter(); }
  else if (e.target.closest('[data-lt]')) { const d = e.target.closest('[data-lt]').dataset.lt; openLt = d === 'next' ? openLt + 1 : null; renderLetter(); }
  else if (act && act.dataset.act === 'fall' && S.all.length) openRead(S.all, Math.floor(Math.random() * S.all.length), { kind: 'all', label: 'the whole book' });
});

// ── OPENING AND CLOSING THE JOURNAL ──
// Closed, you see the leather cover. Unhook the strap (or tap the cover) and it swings open on its spine.
const bookEl = $('book'), cover = $('cover');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
function openBook() {
  if (!bookEl.classList.contains('closed') || bookEl.classList.contains('opening') || !data) return;
  bookEl.classList.add('opening');
  // the cover swings slowly; once it has passed the spine the pages are uncovered,
  // and only after it has settled does the pencil begin
  setTimeout(() => { bookEl.classList.remove('closed'); book.repaint({ wait: still ? 0 : 1300 }); }, still ? 0 : 1000);
  setTimeout(() => { bookEl.classList.remove('opening'); cover.hidden = true; }, still ? 0 : 2200);
}
function closeBook() {
  if (bookEl.classList.contains('closed')) return;
  book.go(0);
  setTimeout(() => {
    cover.hidden = false; bookEl.classList.add('closed', 'opening'); void cover.offsetWidth;
    bookEl.classList.remove('opening');
  }, still ? 0 : 1400);
}
cover.addEventListener('click', openBook);
cover.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBook(); } });
let csx = null;
cover.addEventListener('touchstart', e => { csx = e.touches[0].clientX; }, { passive: true });
cover.addEventListener('touchend', e => { if (csx !== null && e.changedTouches[0].clientX - csx < -50) openBook(); csx = null; });

loadPage();
