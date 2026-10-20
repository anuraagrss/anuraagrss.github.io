// The journey: after the walk-in, the path. Trips stand on both sides of it, joined by footprints;
// each one opens its journal. Places I told only in photographs wait as a faint line at the end.
import { esc, countLine } from './late-sun-data.js';
import { LINES, ZNMD, PLACE_LINES } from './late-sun-content.js';
import { pencil } from './book.js';
import { proofHere } from './proof.js';
import { outline } from './outlines.js';
import { S, initReading, openJournal } from './reading.js';

const $ = id => document.getElementById(id);
$('epiHero').textContent = LINES.hero;
$('epiExp').textContent = LINES.experiences;

function renderStops() {
  const stops = $('stops'); stops.innerHTML = '';
  S.journals.forEach((j, i) => {
    if (!j.stories.length) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'stop' + (j.stories.every(x => x.let_go) ? ' let-go' : '');
    const note = j.country && j.country.notes ? j.country.notes : j.stories[0].title || '';
    const snap = (j.photos[0] && j.photos[0].image_url) || (j.stories.find(x => x.img) || {}).img || '';
    // my emoji for a place, as a sticker — only where I've set one
    const emoji = j.country && j.country.emoji ? j.country.emoji : '';
    b.innerHTML = `${snap ? `<img class="st-snap" src="${esc(snap)}" alt="" loading="lazy">` : ''}
                   <span class="st-outline" data-place="${esc(j.name)}"></span>
                   <span class="st-country">${esc(j.name === 'in between' ? 'in between' : j.name)}${emoji ? `<span class="st-emoji" aria-hidden="true">${esc(emoji)}</span>` : ''}</span>
                   <span class="name">${esc(PLACE_LINES[j.name] || (j.stories[0].title || '').toLowerCase())}</span>
                   <span class="meta">${esc(countLine(j))}</span>
                   ${note ? `<span class="note">${esc(note)}</span>` : ''}`;
    b.onclick = () => openJournal(i);
    stops.appendChild(b);
  });
  const quiet = S.journals.map((j, i) => [j, i]).filter(([j]) => !j.stories.length);
  if (quiet.length) {
    $('faint').hidden = false;
    $('faint').innerHTML = `<span class="f-head">other places</span>`
      + quiet.map(([j, i]) => `<button type="button" data-j="${i}">${esc(j.name.toLowerCase())}</button>`).join('');
    $('faint').querySelectorAll('button').forEach(b => b.onclick = () => openJournal(+b.dataset.j));
  }
  document.fonts.ready.then(() => requestAnimationFrame(drawTrail));
  drawOutlines();
  reveal();
}

// the path and its trips rise into view as you come down to them
function reveal() {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .2 });
  document.querySelectorAll('.epigraph, .stop, .faint-places').forEach(el => io.observe(el));
}

// a pencil sketch of each country beside its name, drawn when it comes into view
function drawOutlines() {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('draw'); io.unobserve(e.target); } }), { threshold: .4 });
  document.querySelectorAll('.st-outline').forEach(async el => {
    el.innerHTML = await outline(el.dataset.place);
    if (el.innerHTML) io.observe(el); else el.remove();
  });
}

// The trail: footprints wandering from one trip to the next, side to side.
function drawTrail() {
  const trail = $('trail'), box = trail.getBoundingClientRect(), layer = $('trailSteps');
  layer.innerHTML = '';
  const pts = [{ x: box.width / 2, y: 0 }];
  document.querySelectorAll('.stop').forEach(s => {
    const r = s.querySelector('.name').getBoundingClientRect();
    const right = s.matches(':nth-child(even)');
    pts.push({ x: (right ? r.left - 30 : r.right + 30) - box.left, y: r.top - box.top + r.height / 2 });
  });
  const f = $('faint');
  pts.push({ x: box.width / 2, y: f.hidden ? box.height : f.getBoundingClientRect().top - box.top - 20 });
  let n = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx) * 180 / Math.PI - 90, nx = -dy / len, ny = dx / len;
    for (let d = 14; d < len - 14; d += 30) {
      const side = n++ % 2 ? 5 : -5, wob = Math.sin(d / 90) * 10;
      const fp = document.createElement('i'); fp.className = 'fp on';
      fp.style.left = (a.x + dx * d / len + nx * (side + wob)) + 'px';
      fp.style.top = (a.y + dy * d / len + ny * (side + wob)) + 'px';
      fp.style.transform = `translate(-50%,-50%) rotate(${ang + 180}deg)`;
      layer.appendChild(fp);
    }
  }
}
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawTrail, 200); });

initReading().then(renderStops).catch(e => {
  console.error(e);
  $('stops').innerHTML = '<p class="loading">the journals didn\'t open. try again in a bit.</p>';
});

// ── THE BENCH ──
// stay on it for a few seconds and the poem writes itself, then the question
let benchT = null, benchDone = false;
new IntersectionObserver(es => es.forEach(e => {
  clearTimeout(benchT);
  if (e.isIntersecting && !benchDone) benchT = setTimeout(sit, 3000);
}), { threshold: .55 }).observe($('jBench'));
function sit() {
  benchDone = true;
  const box = $('jbPoem');
  box.innerHTML = ZNMD.couplets.map(c => `<p class="bp" data-pen="c">${esc(c)}</p>`).join('')
    + `<p class="bp-final" data-pen="c">${esc(ZNMD.final.toLowerCase().replace(/^\w/, c => c.toUpperCase()))}</p>`
    + `<p class="bp-credit" data-pen="c">${esc(ZNMD.credit)}</p>`
    + `<p class="bq" data-pen="c">and you — what's the proof you're still alive?</p>`
    + `<p class="bench-sig" data-pen="c">— <span class="arey">Arey<span class="arey-dots">...<i></i></span></span></p>`;
  pencil(box);
  proofHere(box.querySelector('.bq').insertAdjacentElement('afterend', Object.assign(document.createElement('div'), { className: 'late' })), 'journey');
}
