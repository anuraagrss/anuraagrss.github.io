// The logbook: one book. The letter to the boy, a spread per year, the machines,
// the stamps, the tally. Turned page by page, written in pencil as each page opens.
import { setSky, esc, loadAll, loadJournals, boyLetter, fmtDate, placeFromCode, AIRPORT_COUNTRY } from './late-sun-data.js';
import { AIRCRAFT_META, AIRPORT_META, normaliseAircraft, LINES } from './late-sun-content.js';
import { createBook, pencil } from './book.js';

setSky();
const $ = id => document.getElementById(id);
$('lbEpi').textContent = LINES.flights;

// Blueprints live in Storage /flights/, named by the same rule as the old fleet section.
const blueprint = model => 'https://firebasestorage.googleapis.com/v0/b/nomad-404.firebasestorage.app/o/flights%2F'
  + encodeURIComponent(model.trim().replace(/\s+/g, '_') + '.png') + '?alt=media';

// Words he has given a year. Add more here — only his.
const YEAR_NOTES = { 2023: 'the year of wisdom' };
const LINES_PER_PAGE = 12;

// Pencil tallies: four strokes and a line through, counted one at a time.
function tally(n) {
  const groups = Math.floor(n / 5), rest = n % 5, out = [];
  const g = k => `<svg class="tg" viewBox="0 0 34 30" aria-hidden="true">${
    Array.from({ length: Math.min(k, 4) }, (_, i) => `<path d="M${5 + i * 7} ${3 + (i % 2)} q1 12 0 ${24 - (i % 2)}"/>`).join('')
  }${k === 5 ? '<path d="M1 22 L33 8"/>' : ''}</svg>`;
  for (let i = 0; i < groups; i++) out.push(g(5));
  if (rest) out.push(g(rest));
  return out.join('');
}

const flightLine = f => `<li><i>${esc(fmtDate(f.date).replace(/ \d{4}$/, ''))}</i>`
  + `<span data-pen="c">${esc((f.from_city || f.from || '').toLowerCase())} to ${esc((f.to_city || f.to || '').toLowerCase())}</span>`
  + `<em>${esc(f.from)} → ${esc(f.to)}${f.seat ? ' · ' + esc(f.seat) : ''}</em></li>`;

function sketch(flights) {
  const types = {};
  flights.forEach(f => { const t = normaliseAircraft(f.aircraft_type); if (t) types[t] = (types[t] || 0) + 1; });
  const top = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
  if (!top) return '';
  const m = AIRCRAFT_META[top[0]] || {};
  return `<figure class="margin"><img src="${blueprint(top[0])}" alt="" loading="lazy" onerror="this.remove()">
    <figcaption>${esc(top[0])}${m.nickname ? `, "${esc(m.nickname)}"` : ''}. ${top[1]} of these on this page.</figcaption></figure>`;
}
function stubFor(flights, storyJournals) {
  // the first flight on the spread that lands somewhere with a story gets its stub stuck in
  for (const f of flights) {
    const place = placeFromCode(AIRPORT_COUNTRY[f.to]), j = place && storyJournals.get(place);
    if (j) return `<div class="stub"><b>${esc(f.from)} → ${esc(f.to)}</b>
      <span>${esc((f.from_city || '').toLowerCase())} to ${esc((f.to_city || '').toLowerCase())}</span>
      <small>${esc(f.flight_number || '')} · ${esc(fmtDate(f.date))}${f.seat ? ' · seat ' + esc(f.seat) : ''}</small>
      <a href="journal.html">the way into ${esc(place.toLowerCase())}: ${esc(j.stories[0].title)}</a></div>`;
  }
  return '';
}

// ── the machines: pasted plates ──
function plate([t, n]) {
  const m = AIRCRAFT_META[t] || {};
  return `<figure class="mplate">
    <img src="${blueprint(t)}" alt="" loading="lazy" onerror="this.classList.add('none')">
    <figcaption><b>${esc(t)}</b>${m.nickname ? `<i data-pen="c">${esc(m.nickname.toLowerCase())}</i>` : ''}
    <span class="n">${n} flight${n > 1 ? 's' : ''}</span>${m.story ? `<span class="s">${esc(m.story)}</span>` : ''}</figcaption></figure>`;
}

// ── the stamps: a passport, every airport inked in ──
const INKS = ['#2f4a7a', '#8a2f2f', '#2f6a4a', '#5a3f7a', '#3f3125', '#7a5a2f'];
const SHAPES = ['rect', 'circle', 'oval', 'rect2', 'hex'];
function stamp([code, v], i) {
  const m = AIRPORT_META[code], ink = INKS[(code.charCodeAt(0) + code.charCodeAt(2)) % INKS.length];
  const shape = SHAPES[(code.charCodeAt(1) + i) % SHAPES.length], rot = ((code.charCodeAt(0) * 7 + i * 13) % 22) - 11;
  return `<button type="button" class="st st-${shape}${m ? ' told' : ''}" data-code="${code}" style="--ink:${ink};--r:${rot}deg">
    <small>${esc(fmtDate(v.first).toUpperCase())}</small><b>${esc(code)}</b><span>${esc((((m && m.city) || v.city || '')).toUpperCase())}</span><small>×${v.n}</small>
  </button>`;
}

function build(F, countries, storyJournals) {
  const S = [];
  const boy = boyLetter(F);
  const byYear = {};
  F.forEach(f => { const y = (f.date || '????').slice(0, 4); (byYear[y] = byYear[y] || []).push(f); });
  const years = Object.keys(byYear).sort();

  // the letter, and the years as contents
  S.push({ key: 'letter',
    left: `<p class="lt-to" data-pen="c">To: the boy who watched planes</p><div class="lt-body">${boy ? boy.body.split(/\n\s*\n/).map(p => `<p>${esc(p)}</p>`).join('') : ''}</div>
           <p class="lt-cite" data-pen="c">— every one of them is written down in here.</p>`,
    right: `<p class="pg-k">in my logbook</p><ol class="years">${years.map(y =>
             `<li><button type="button" data-y="${y}"><span data-pen="c">${y}</span><em>${byYear[y].length} flight${byYear[y].length > 1 ? 's' : ''}${YEAR_NOTES[y] ? ' · ' + esc(YEAR_NOTES[y]) : ''}</em></button></li>`).join('')}</ol>
           <p class="pg-k later">and at the back</p>
           <ol class="years back"><li><button type="button" data-go="machines"><span>the machines</span></button></li>
             <li><button type="button" data-go="stamped"><span>stamped</span></button></li><li><button type="button" data-go="tally"><span>the tally</span></button></li></ol>` });

  // a spread per year — more if the year ran long
  years.forEach(y => {
    const fl = byYear[y];
    for (let i = 0; i < fl.length; i += LINES_PER_PAGE * 2) {
      const a = fl.slice(i, i + LINES_PER_PAGE), b = fl.slice(i + LINES_PER_PAGE, i + LINES_PER_PAGE * 2), first = i === 0;
      S.push({ key: first ? 'y' + y : `y${y}-${i}`, group: 'years', year: y,
        left: `${first ? `<p class="yr" data-pen="c">${y}</p><p class="yr-sub">${fl.length} flight${fl.length > 1 ? 's' : ''}${YEAR_NOTES[y] ? ' · ' + esc(YEAR_NOTES[y]) : ''}</p>`
                       : `<p class="yr small">${y}, continued</p>`}
               <ol class="lines">${a.map(flightLine).join('')}</ol>${b.length ? '' : sketch(a)}`,
        right: b.length ? `<ol class="lines">${b.map(flightLine).join('')}</ol>${sketch(a.concat(b))}${stubFor(a.concat(b), storyJournals)}`
                        : stubFor(a, storyJournals) });
    }
  });

  // the machines: four plates a page
  const types = {};
  F.forEach(f => { const t = normaliseAircraft(f.aircraft_type); if (t) types[t] = (types[t] || 0) + 1; });
  const fleet = Object.entries(types).sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < fleet.length; i += 8) {
    S.push({ key: i === 0 ? 'machines' : 'machines-' + i, group: 'machines',
      left: (i === 0 ? `<p class="pg-k">the machines</p><p class="pg-line" data-pen="w">the ones that carried me. the engineer in me pinned them in.</p>` : '')
            + `<div class="plates">${fleet.slice(i, i + 4).map(plate).join('')}</div>`,
      right: `<div class="plates">${fleet.slice(i + 4, i + 8).map(plate).join('')}</div>` });
  }

  // stamped: a passport of every airport
  const visits = {};
  F.forEach(f => [[f.from, f.from_city], [f.to, f.to_city]].forEach(([c, n]) => {
    if (!c) return; visits[c] = visits[c] || { n: 0, city: n, first: f.date }; visits[c].n++;
  }));
  const ports = Object.entries(visits).sort((a, b) => b[1].n - a[1].n);
  const PER = 16;
  for (let i = 0; i < ports.length; i += PER * 2) {
    S.push({ key: i === 0 ? 'stamped' : 'stamped-' + i, group: 'stamped',
      left: (i === 0 ? `<p class="pg-k">stamped</p><p class="pg-line" data-pen="w">${esc(LINES.airports)}</p>` : '')
            + `<div class="visa">${ports.slice(i, i + PER).map(stamp).join('')}</div><p class="told-note" aria-live="polite"></p>`,
      right: `<div class="visa">${ports.slice(i + PER, i + PER * 2).map(stamp).join('')}</div><p class="told-note" aria-live="polite"></p>` });
  }

  // the tally
  const visited = countries.filter(c => c.status === 'visited').length;
  const miles = F.reduce((s, f) => s + (f.distance_miles || 0), 0);
  S.push({ key: 'tally',
    left: `<p class="pg-k">the tally</p>
           <div class="tally-row"><span class="t-label" data-pen="c">flights</span><span class="t-marks">${tally(F.length)}</span><span class="t-num">${F.length}</span></div>
           <div class="tally-row"><span class="t-label" data-pen="c">countries stood in</span><span class="t-marks">${tally(visited)}</span><span class="t-num">${visited}</span></div>`,
    right: `<p class="still" data-pen="c">still counting.</p>
            <p class="sum">${miles.toLocaleString('en-US')} miles · ${ports.length} airports · ${new Set(F.map(f => f.airline).filter(Boolean)).size} airlines</p>
            <a class="lt-link" href="journal.html">← back to the journal</a>` });
  return S;
}

async function main() {
  let d, js;
  try { [d, js] = await Promise.all([loadAll(), loadJournals()]); }
  catch { document.querySelector('#book .pg-l').innerHTML = '<p>the logbook didn\'t open. try again in a bit.</p>'; return; }
  const storyJournals = new Map(js.filter(j => j.stories.length).map(j => [j.name, j]));
  const book = createBook({
    root: $('book'), spreads: build(d.flights, d.countries, storyJournals),
    tabs: [{ key: 'letter', label: 'the letter' }, { key: 'years', label: 'the years' }, { key: 'machines', label: 'the machines' },
           { key: 'stamped', label: 'stamped' }, { key: 'tally', label: 'the tally' }],
  });
  // years, contents and stamps are clickable on every page
  $('book').addEventListener('click', e => {
    const y = e.target.closest('[data-y]'), g = e.target.closest('[data-go]'), st = e.target.closest('.st');
    if (y) book.goKey('y' + y.dataset.y);
    else if (g) book.goKey(g.dataset.go);
    else if (st) {
      const m = AIRPORT_META[st.dataset.code], note = st.closest('.pg').querySelector('.told-note');
      note.innerHTML = m ? `<b>${esc(st.dataset.code)}</b> <span data-pen="c">${esc(m.story)}</span>` : `<b>${esc(st.dataset.code)}</b> <span data-pen="c">I haven't written this one down yet.</span>`;
      pencil(note, { speed: 1.4 });
    }
  });
}
main();

// ── TWO WAYS TO READ IT ──
// the journal (this book) or the classic sections from the old page: boarding passes, flights, airports.
function view(v) {
  const classic = v === 'classic';
  document.querySelectorAll('.views [data-view]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === v)));
  $('book').hidden = classic;
  const fr = $('classic');
  if (classic && !fr.src) fr.src = 'logbook-classic.html';
  fr.hidden = !classic;
  history.replaceState(null, '', classic ? '#classic' : location.pathname);
  try { localStorage.setItem('logbook-view', v); } catch {}
}
document.querySelectorAll('.views [data-view]').forEach(b => b.onclick = () => view(b.dataset.view));
let start = location.hash === '#classic' ? 'classic' : 'journal';
try { if (!location.hash && localStorage.getItem('logbook-view') === 'classic') start = 'classic'; } catch {}
if (start === 'classic') view('classic');
