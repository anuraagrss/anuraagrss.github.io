// My darkroom: one place at a time, its prints pinned to a drying line under the safelight,
// developing one after another as you watch. Lift one off the line and it clears in the tray,
// then I write about it, in pencil, at the pace you'd read it.
import { esc, loadJournals, fmtDate } from './late-sun-data.js';
import { LINES, POEMS, PHOTO_PHILOSOPHY } from './late-sun-content.js';
import { pencil, emphasize } from './book.js';

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let places = [], cur = 0, seq = [], si = 0, pen = null, devT = [], lastFocus = null, noteWritten = false;

$('drHis').textContent = LINES.photography;
pencil(document.querySelector('.dr-head'));

async function main() {
  try { places = (await loadJournals()).filter(j => j.photos.length); }
  catch { $('prints').innerHTML = '<p class="loading">the developer went bad. try again in a bit.</p>'; return; }

  $('places').innerHTML = places.map((j, pi) => `<button type="button" data-pi="${pi}">${esc(j.name.toLowerCase())}<small>${j.photos.length}</small></button>`).join('');
  $('places').querySelectorAll('button').forEach(b => b.onclick = () => showPlace(+b.dataset.pi));
  $('pPrev').onclick = () => showPlace(cur - 1);
  $('pNext').onclick = () => showPlace(cur + 1);

  const q = new URLSearchParams(location.hash.slice(1));   // hash, so clean-URL redirects keep it
  let start = 0, photo = null;
  if (q.get('photo')) places.some((j, pi) => { const k = j.photos.findIndex(p => p.id === q.get('photo')); if (k >= 0) { start = pi; photo = k; return true; } });
  else if (q.get('place')) { const pi = places.findIndex(j => j.name.toLowerCase() === q.get('place').toLowerCase()); if (pi >= 0) start = pi; }
  showPlace(start);
  if (photo !== null) open(photo);
}

// ── the drying line ──
function showPlace(pi) {
  if (pi < 0 || pi >= places.length) return;
  cur = pi; const j = places[pi];
  devT.forEach(clearTimeout); devT = [];
  // first on every line: a note pinned up, how I take pictures
  $('prints').innerHTML = `
    <div class="print note" style="--r:-2deg;--d:.3s">
      <span class="pin" aria-hidden="true"></span>
      <p class="n-k">how I take pictures</p>
      ${PHOTO_PHILOSOPHY.map(l => `<p data-pen="w">${esc(l)}</p>`).join('')}
      <p class="n-sig">— <span class="arey">Arey<span class="arey-dots">...<i></i></span></span></p>
    </div>` + j.photos.map((p, k) => `
    <button class="print" type="button" data-k="${k}" style="--r:${((k * 53) % 9) - 4}deg;--d:${(k % 5) * .7}s" aria-label="${esc(p.title)}">
      <span class="pin" aria-hidden="true"></span>
      <img src="${esc(p.image_url)}" alt="" loading="lazy">
      <span class="p-cap">${esc(p.title)}</span>
    </button>`).join('');
  $('prints').scrollLeft = 0;
  // develop one after another, the way they'd come up in the tray
  [...$('prints').querySelectorAll('.print:not(.note)')].forEach((el, k) => devT.push(setTimeout(() => el.classList.add('dev'), reduced ? 0 : 900 + k * 450)));
  if (pi === cur && !noteWritten) { noteWritten = true; pencil($('prints').querySelector('.note'), { speed: 1.2 }); }
  $('prints').querySelectorAll('.print:not(.note)').forEach(b => b.onclick = () => open(+b.dataset.k));
  $('places').querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === pi));
  const on = $('places').querySelector('.on'); on && on.scrollIntoView({ block: 'nearest', inline: 'center' });
  $('pPrev').disabled = pi === 0; $('pNext').disabled = pi === places.length - 1;
  $('drPoem').innerHTML = esc(POEMS[pi % POEMS.length]).replace(/\n/g, '<br>');
  history.replaceState(null, '', '#place=' + encodeURIComponent(j.name));
}

// ── a print, lifted out ──
function open(k) {
  if ($('viewer').hidden) lastFocus = document.activeElement;
  seq = places[cur].photos; si = k;
  $('viewer').hidden = false; document.body.classList.add('locked');
  show(); $('vClose').focus();
}
function show() {
  const p = seq[si];
  pen && pen.finish();
  $('vPhoto').classList.remove('clear'); void $('vPhoto').offsetWidth;
  $('vImg').src = p.image_url; $('vImg').alt = p.description || p.title || '';
  setTimeout(() => $('vPhoto').classList.add('clear'), 120);          // it comes up in the tray
  $('vWhere').textContent = [p.location, fmtDate(p.date)].filter(Boolean).join(' · ');
  $('vCap').textContent = p.title || '';
  $('vCap').dataset.pen = 'c';
  $('vStory').innerHTML = p.story ? p.story.split(/\n\s*\n/).map(t => `<p>${esc(t)}</p>`).join('') : '';
  const paras = [...$('vStory').querySelectorAll('p')];
  emphasize(paras);                                   // set the way every story on the site is set
  paras.forEach(q => q.dataset.pen = 'w');
  // the honesty stamp: what the camera recorded, and what I changed
  const ex = p.exif && p.exif.camera && p.exif.camera !== 'Unknown' ? p.exif : null;
  $('vStamp').textContent = (ex ? `${ex.camera}${ex.settings ? ' · ' + ex.settings : ''}` : 'camera not recorded')
    + ' · ' + (p.edits ? `edits: ${p.edits}` : "I haven't written down my edits yet");
  $('vPos').textContent = `${si + 1} of ${seq.length}`;
  $('vPrev').disabled = si === 0; $('vNext').disabled = si === seq.length - 1;
  $('vPaper').scrollTop = 0;
  setTimeout(() => { pen = pencil($('vPaper'), { follow: $('vPaper') }); }, reduced ? 0 : 1600);   // once it has cleared
}
function close() {
  pen && pen.finish();
  $('viewer').hidden = true; document.body.classList.remove('locked');
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
}
$('vClose').onclick = close;
$('vPrev').onclick = () => { if (si > 0) { si--; show(); } };
$('vNext').onclick = () => { if (si < seq.length - 1) { si++; show(); } };
$('vStory').addEventListener('click', () => pen && pen.finish());
addEventListener('keydown', e => {
  if ($('viewer').hidden) { if (e.key === 'ArrowLeft') showPlace(cur - 1); if (e.key === 'ArrowRight') showPlace(cur + 1); return; }
  if (e.key === 'Escape') close();
  if (e.key === 'ArrowLeft') $('vPrev').click();
  if (e.key === 'ArrowRight') $('vNext').click();
});

main();
