// Reading, shared by the journey and the journal: a trip's journal, a thread read in one go,
// the contents, and a story written in as you read it. The sheets are injected into the page.
import { esc, loadAll, loadJournals, tripDays, countLine, fmtDate, TYPE, BETWEEN } from './late-sun-data.js';
import { LINES, THREADS, HARD_TITLES } from './late-sun-content.js';
import { pencil, emphasize } from './book.js';

const $ = id => document.getElementById(id);
// Hand-drawn chapter marks, used in the contents, on the thread pages and on the cards.
const svg = d => `<svg class="ch-ic" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
export const ICONS = {
  people:     svg('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c3 .2 5.5 2.6 5.5 5.8"/>'),
  // an hourglass with one grain caught mid-fall: a moment that stopped time
  moments:    svg('<path d="M6.5 3h11M6.5 21h11"/><path d="M8 3c0 5 3 7 4 9 1-2 4-4 4-9"/><path d="M8 21c0-5 3-7 4-9 1 2 4 4 4 9"/><path d="M9.6 20.6q2.4-2.4 4.8 0"/><circle cx="12" cy="15.2" r=".8" fill="currentColor" stroke="none"/>'),
  adventures: svg('<path d="M3 11a9 7 0 0 1 18 0"/><path d="M3 11l9 7 9-7M8 11l4 7 4-7"/><circle cx="12" cy="20" r="1.5"/>'),
  hard:       svg('<path d="M7 15a4 4 0 1 1 1-7.9A5 5 0 0 1 18 9a3 3 0 0 1 0 6z"/><path d="M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5"/>'),
  cafes:      svg('<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 11h2a2 2 0 0 1 0 4h-2"/><path d="M8 3c0 2 2 2 2 4M12 3c0 2 2 2 2 4"/>'),
  photos:     svg('<path d="M4 7h3.2l1.6-2.2h6.4L16.8 7H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="12.5" r="3.6"/>'),
};

const escH = t => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export const S = { journals: [], all: [], cafesAll: [], photoCount: 0, data: null, journalOf: new Map() };

const SHEET_HTML = `  <!-- ── A JOURNAL, OPENED ── -->
  <div class="sheet" id="journal" role="dialog" aria-modal="true" aria-labelledby="jTitle" hidden>
    <div class="page paper ruled">
      <button class="close" data-close="journal" type="button">close ✕</button>
      <div class="stamp" id="jStamp"></div>
      <h2 id="jTitle"></h2>
      <p class="j-meta" id="jMeta"></p>

      <div class="j-days" id="jDays" hidden>
        <p class="j-sub" id="jDaysTitle"></p>
        <div class="choc" id="jChoc"></div>
        <div class="day-read" id="jDayRead"></div>
      </div>

      <div id="jPages">
        <p class="j-sub">what I wrote here</p>
        <ol class="entries" id="jEntries"></ol>
      </div>

      <div id="jPhotos">
        <p class="j-sub">what I saw</p>
        <div class="snaps" id="jPhotoStrip"></div>
        <p class="j-more" id="jPhotoMore"></p>
      </div>

      <div id="jCafes">
        <p class="j-sub">where I sat</p>
        <p class="j-line" id="jCafeLine"></p>
        <div class="pins" id="jCafeWall"></div>
      </div>

      <div id="jPasses">
        <p class="j-sub">how I got here</p>
        <div class="passes" id="jPassList"></div>
        <p class="j-more" id="jPassMore"></p>
      </div>

      <p class="j-count" id="jCount"></p>
    </div>
  </div>

  <!-- ── A THREAD, READ IN ONE GO ── -->
  <div class="sheet" id="thread" role="dialog" aria-modal="true" aria-labelledby="tTitle" hidden>
    <div class="page paper">
      <button class="close" data-close="thread" type="button">close ✕</button>
      <p class="j-meta" id="tMeta"></p>
      <h2 id="tTitle"></h2>
      <div class="t-list" id="tList"></div>
    </div>
  </div>

  <!-- ── THE CONTENTS ── -->
  <div class="sheet" id="contents" role="dialog" aria-modal="true" aria-labelledby="cTitle" hidden>
    <div class="page paper ruled">
      <button class="close" data-close="contents" type="button">close ✕</button>
      <h2 id="cTitle">contents</h2>
      <div id="cList"></div>
    </div>
  </div>

  <!-- ── A STORY, WRITTEN AS YOU READ ── -->
  <div class="sheet" id="reader" role="dialog" aria-modal="true" aria-labelledby="rTitle" hidden>
    <article class="page paper story">
      <button class="close" data-close="reader" type="button">← back</button>
      <p class="r-meta" id="rMeta"></p>
      <h2 id="rTitle"></h2>
      <figure class="r-img" id="rFig" hidden><img id="rImg" alt=""></figure>
      <div class="r-body" id="rBody"></div>
      <div class="r-foot">
        <p class="r-pos" id="rPos"></p>
        <button class="r-next" id="rNext" type="button" hidden></button>
        <button class="r-through" id="rThrough" type="button" hidden></button>
      </div>
    </article>
  </div>`;

export async function initReading() {
  document.body.insertAdjacentHTML('beforeend', SHEET_HTML);
  wireSheets();
  const [d, js] = await Promise.all([loadAll(), loadJournals()]);
  S.data = d; S.journals = js;
  js.forEach(j => j.stories.forEach(x => S.journalOf.set(x, j)));
  S.all = js.flatMap(j => j.stories);                 // the whole book, in walking order
  S.cafesAll = js.flatMap(j => j.cafes.map(c => ({ ...c, place: j.name })));
  S.photoCount = d.photos.length;
  renderContents();
  return S;
}

// ── THREADS: read by what you need, not by where ──
const isHard = x => x.hard === true || HARD_TITLES.includes(x.title);
const THREAD = {
  people:     { chip: 'a stranger',                        noun: 'person I met', plural: 'people I met',  pick: x => x.tab === 'people' },
  hard:       { chip: 'a hard day',                        noun: 'hard day', plural: 'hard days I lived through',  pick: isHard, line: 'the ones nobody posts' },
  moments:    { chip: 'a moment that changed something',   noun: 'moment', plural: 'moments that stayed with me',    pick: x => x.tab === 'moments' },
  adventures: { chip: 'something brave',                   noun: 'dare', plural: 'times I jumped anyway', pick: x => x.tab === 'adventures' },
};
export const threadList = k => S.all.filter(THREAD[k].pick);
export const threadLine = k => (THREAD[k].line || THREADS[k] || '').toLowerCase();

const firstLine = x => {
  const t = document.createElement('div'); t.innerHTML = x.story || '';
  const s = (t.textContent || '').replace(/\s+/g, ' ').trim();
  const m = s.match(/^.{20,180}?[.!?](\s|$)/);
  return m ? m[0].trim() : s.slice(0, 160) + (s.length > 160 ? '…' : '');
};

export function openThread(k) {
  const list = threadList(k), t = THREAD[k];
  $('tMeta').textContent = `${list.length} ${list.length > 1 ? t.plural : t.noun}, one after another`;
  $('tTitle').innerHTML = `${ICONS[k] || ''}<span>${esc(threadLine(k))}</span>`;
  $('tList').innerHTML = list.map((x, i) => `
    <button class="t-card" type="button" data-i="${i}">
      <span class="m">${esc(x.loc || '')}</span>
      <span class="h">${esc(x.title || x.label || '')}</span>
      <span class="f">${esc(firstLine(x))}</span>
    </button>`).join('');
  $('tList').querySelectorAll('.t-card').forEach(b => b.onclick = () => openRead(list, +b.dataset.i, { kind: 'thread', label: threadLine(k), noun: t.noun }));
  show('thread'); $('thread').scrollTop = 0;
}
export function openCafes() {
  $('tMeta').textContent = `${S.cafesAll.length} places I sat`;
  $('tTitle').innerHTML = `${ICONS.cafes}<span>${esc(LINES.cafes.toLowerCase())}</span>`;
  $('tList').innerHTML = `<div class="pins">${S.cafesAll.map(c => {
    const img = (c.images && c.images[0]) || c.image || '';
    return `<figure class="pin">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}<figcaption>${esc(c.vibe || c.name)}<small>${esc(c.name)}${c.city ? ' · ' + esc(c.city) : ''} · ${esc(c.place.toLowerCase())}</small></figcaption></figure>`;
  }).join('')}</div>`;
  show('thread'); $('thread').scrollTop = 0;
}

// ── THE CONTENTS ──
export function renderContents() {
  $('cList').innerHTML = ['people', 'moments', 'adventures', 'hard'].map(k => {
    const list = threadList(k); if (!list.length) return '';
    return `<p class="c-th">${ICONS[k] || ''}<span>${esc(threadLine(k))}</span></p><ol class="entries">${list.map((x, i) =>
      `<li tabindex="0" data-k="${k}" data-i="${i}"><span>${esc(x.title || x.label || '')}</span><em>${esc((S.journalOf.get(x) || {}).name || '')}</em></li>`).join('')}</ol>`;
  }).join('');
  $('cList').querySelectorAll('li[data-k]').forEach(li => {
    const go = () => openRead(threadList(li.dataset.k), +li.dataset.i, { kind: 'thread', label: threadLine(li.dataset.k), noun: THREAD[li.dataset.k].noun });
    li.onclick = go; li.onkeydown = e => { if (e.key === 'Enter') go(); };
  });
}


// ── A JOURNAL ──
let openJ = null, lastFocus = null;
export function openJournal(i) {
  const j = S.journals[i]; openJ = j;
  $('jTitle').textContent = j.name.toLowerCase();
  $('jMeta').textContent = countLine(j);
  const c = j.country;
  $('jStamp').innerHTML = `<b>${esc((c && c.name) || j.name)}</b>${c && c.notes ? esc(c.notes) : (c && c.status === 'transiting' ? 'passed through' : 'entered')}`;
  $('jStamp').hidden = j.name === BETWEEN;

  // the days, if the trip has real dates
  const days = tripDays(j), bar = $('jDays');
  bar.hidden = !days.length;
  if (days.length) {
    $('jDaysTitle').textContent = `${fmtDate(days[0].iso)} → ${fmtDate(days.at(-1).iso)} · ${days.length} days`;
    $('jChoc').innerHTML = '';
    days.forEach((d, k) => {
      const c = document.createElement('button'); c.type = 'button';
      c.className = 'cube' + (d.gold ? ' g' : '');
      c.innerHTML = `<i>${k + 1}</i>`;
      c.title = fmtDate(d.iso);
      c.onclick = () => {
        $('jDayRead').innerHTML = `<span class="d">day ${k + 1} · ${esc(fmtDate(d.iso))}</span>`
          + (d.photos.length ? `<span class="h">${esc(d.photos.map(p => p.title).join(' · '))}</span>` : '')
          + (d.photos.length ? `<span class="thumbs">${d.photos.map(p => `<a href="darkroom.html#photo=${encodeURIComponent(p.id)}"><img src="${esc(p.image_url)}" alt="${esc(p.title)}" loading="lazy"></a>`).join('')}</span>`
                             : `<span class="h quiet">no photographs. the road.</span>`);
      };
      $('jChoc').appendChild(c);
    });
    $('jDayRead').innerHTML = '<span class="d">a square is a day. gold is a day I kept close. grey is the road.</span>';
  }

  // pages — the stories, grouped under his own lines for each thread
  const ol = $('jEntries'); ol.innerHTML = '';
  ['people', 'moments', 'adventures'].forEach(tab => {
    const items = j.stories.map((x, k) => [x, k]).filter(([x]) => x.tab === tab);
    if (!items.length) return;
    const h = document.createElement('li'); h.className = 'thread'; h.textContent = (THREADS[tab] || '').toLowerCase();
    ol.appendChild(h);
    items.forEach(([x, k]) => {
      const li = document.createElement('li'); li.tabIndex = 0;
      li.innerHTML = `<span>${esc(x.title || x.label || '')}</span><em>${TYPE[x.tab] || ''}</em>`;
      li.onclick = () => openStory(k);
      li.onkeydown = e => { if (e.key === 'Enter') openStory(k); };
      ol.appendChild(li);
    });
  });
  $('jPages').hidden = !j.stories.length;

  // photographs pasted in
  $('jPhotos').hidden = !j.photos.length;
  $('jPhotoStrip').innerHTML = j.photos.slice(0, 8).map(p =>
    `<a class="snap" href="darkroom.html#photo=${encodeURIComponent(p.id)}"><img src="${esc(p.image_url)}" alt="" loading="lazy"><span>${esc(p.title)}</span></a>`).join('');
  $('jPhotoMore').innerHTML = `<a href="darkroom.html#place=${encodeURIComponent(j.name)}">${j.photos.length > 8 ? `all ${j.photos.length} in the darkroom →` : 'see them in the darkroom →'}</a>`;

  // cafes pinned in
  $('jCafeLine').textContent = LINES.cafes;
  $('jCafes').hidden = !j.cafes.length;
  $('jCafeWall').innerHTML = j.cafes.map(c => {
    const img = (c.images && c.images[0]) || c.image || '';
    return `<figure class="pin">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}<figcaption>${esc(c.vibe || c.name)}<small>${esc(c.name)}${c.city ? ' · ' + esc(c.city) : ''}</small></figcaption></figure>`;
  }).join('');

  // boarding passes, pasted where they landed
  $('jPasses').hidden = !j.flights.length;
  $('jPassList').innerHTML = j.flights.slice(-6).reverse().map(f =>
    `<div class="pass"><b>${esc(f.from)} → ${esc(f.to)}</b><span>${esc((f.from_city || '').toLowerCase())} to ${esc((f.to_city || '').toLowerCase())}</span><small>${esc(f.flight_number || '')} · ${esc(fmtDate(f.date))}${f.seat ? ' · seat ' + esc(f.seat) : ''}</small></div>`).join('');
  $('jPassMore').innerHTML = j.flights.length > 6 ? `<a href="logbook.html">${j.flights.length - 6} more in the logbook →</a>` : '';

  $('jCount').textContent = countLine(j);
  show('journal');
  $('journal').scrollTop = 0;
}

// ── A STORY ──
// Every story is read inside a context: its journal, a thread, or the whole book.
// "Next" stays in that context; "read straight through" always continues the whole book.
function openStory(k) { openRead(openJ.stories, k, { kind: 'journal', label: openJ.name.toLowerCase(), noun: 'page', journal: openJ }); }

let readerPen = null;
export function openRead(list, i, ctx) {
  const x = list[i];
  $('rMeta').textContent = [x.loc, TYPE[x.tab]].filter(Boolean).join(' · ');
  $('rTitle').textContent = x.title || x.label || '';
  if (x.img) { $('rImg').src = x.img; $('rImg').alt = x.label || ''; $('rFig').hidden = false; } else $('rFig').hidden = true;

  const body = $('rBody'); body.innerHTML = '';
  const tmp = document.createElement('div'); tmp.innerHTML = x.story || '';
  let paras = [...tmp.querySelectorAll('p')];
  if (!paras.length) paras = (x.story || '').split(/\n\s*\n/).filter(Boolean).map(t => { const p = document.createElement('p'); p.textContent = t.trim(); return p; });
  paras.forEach(p => body.appendChild(p));

  emphasize(paras);   // the same weight every story gets, everywhere on the site

  // the story is written in as you read it; a tap anywhere finishes the writing
  $('rTitle').dataset.pen = 'c';
  paras.forEach(p => p.dataset.pen = 'w');
  readerPen && readerPen.finish();
  readerPen = pencil($('reader').querySelector('article'), { follow: $('reader') });   // at the pace of reading, following the words down

  $('rPos').textContent = `${i + 1} of ${list.length} · ${ctx.label}`;
  const next = $('rNext'), nx = list[i + 1];
  if (nx) {
    next.textContent = ctx.kind === 'all' ? `next: ${nx.title || nx.label} →` : `next ${ctx.noun}: ${nx.title || nx.label} →`;
    next.onclick = () => openRead(list, i + 1, ctx); next.hidden = false;
  } else if (ctx.kind === 'journal') {
    const ji = S.journals.indexOf(ctx.journal), nj = S.journals.slice(ji + 1).find(j => j.stories.length);
    if (nj) { next.textContent = `walk on to ${nj.name.toLowerCase()} →`; next.onclick = () => { hide('reader'); openJournal(S.journals.indexOf(nj)); }; next.hidden = false; }
    else next.hidden = true;
  } else { next.textContent = 'that was the last one. back to the walk ↑'; next.onclick = () => closeAll(); next.hidden = false; }

  // read straight through: the next story in the whole book, wherever this one sits
  const through = $('rThrough'), gi = S.all.indexOf(x), gx = S.all[gi + 1];
  if (ctx.kind !== 'all' && gx && gx !== nx) {
    through.textContent = `or read straight through: ${gx.title || gx.label} →`;
    through.onclick = () => openRead(S.all, gi + 1, { kind: 'all', label: 'the whole book' }); through.hidden = false;
  } else through.hidden = true;

  show('reader');
  $('reader').scrollTop = 0;
}

// ── SHEETS ──
const SHEETS = ['reader', 'thread', 'contents', 'journal'];       // topmost first
export function show(id) {
  if ($(id).hidden && !document.querySelector('.sheet:not([hidden])')) lastFocus = document.activeElement;
  $(id).hidden = false; document.body.classList.add('locked');
  $(id).querySelector('.close').focus();
}
export function hide(id) {
  if (id === 'reader') readerPen && readerPen.finish();
  $(id).hidden = true;
  if (!document.querySelector('.sheet:not([hidden])')) {
    document.body.classList.remove('locked');
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
}
function closeAll() { SHEETS.forEach(id => { $(id).hidden = true; }); hide('reader'); }
function wireSheets() {
$('rBody').addEventListener('click', () => readerPen && readerPen.finish());
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => hide(b.dataset.close));
document.querySelectorAll('.sheet').forEach(s => s.addEventListener('click', e => { if (e.target === s) hide(s.id); }));
}
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const top = SHEETS.find(id => !$(id).hidden);
  if (top) hide(top);
});

