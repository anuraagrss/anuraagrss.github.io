import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { ZNMDAmbient, speakPoem, stopSpeech } from './znmd-ambient.js';

// ── FIREBASE ──────────────────────────────────────────
const app = initializeApp({
  apiKey: "AIzaSyCESqunM9b_Yc-5Dj0qJJFxGALmEGm0Rd0",
  authDomain: "nomad-404.firebaseapp.com",
  projectId: "nomad-404",
  appId: "1:638331724572:web:baa0d70108e920099150d9"
});
const db = getFirestore(app);

// ── PHOTO PROTECTION ──────────────────────────────────
document.addEventListener('contextmenu', e => { if(e.target.tagName==='IMG') { e.preventDefault(); return false; } });
document.addEventListener('dragstart', e => { if(e.target.tagName==='IMG') { e.preventDefault(); return false; } });
window.addEventListener('beforeprint', e => e.preventDefault());

// ── STATE ─────────────────────────────────────────────
let allPhotos = [], view = [], activeTag = 'all';
const $ = id => document.getElementById(id);

// ── INTRO ─────────────────────────────────────────────
let introDone = false;
function dismissIntro() {
  if(introDone) return;
  introDone = true;
  clearTimeout(introTimer);
  $('intro').classList.add('gone');
  $('page').classList.add('vis');
  setTimeout(revealOnScroll, 120);   // first reveal once the light is up
}
const introTimer = setTimeout(dismissIntro, 6500);
$('intro').addEventListener('click', e => { if(e.target.id !== 'introSkip') dismissIntro(); });
$('introSkip').addEventListener('click', dismissIntro);

// ── TAG HELPERS ───────────────────────────────────────
// Custom text tags live on `tags` — either a comma-separated string or an array.
// (The old `element` field is intentionally ignored.)
function tagsOf(p) {
  const raw = p.tags;
  let arr = [];
  if(Array.isArray(raw)) arr = raw;
  else if(typeof raw === 'string') arr = raw.split(',');
  return [...new Set(arr.map(x => String(x).toLowerCase().trim()).filter(Boolean))];
}
function placeOf(p) { return (p.location || '').split(',').pop().trim() || p.country_id || ''; }

// ── LOAD PHOTOS ───────────────────────────────────────
async function loadPhotos() {
  try {
    const snap = await getDocs(collection(db, 'photos'));
    allPhotos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    allPhotos.sort((a,b) => {
      if(a.featured && !b.featured) return -1;
      if(!a.featured && b.featured) return 1;
      return (b.date||'').localeCompare(a.date||'');
    });
  } catch(e) {
    console.error('Photos load failed:', e);
  }
  allPhotos.forEach(p => { p._tags = tagsOf(p); });
  buildFilmTicker();
  filterTag('all');
  updateStats();
}

function updateStats() {
  const places = new Set(allPhotos.map(placeOf).filter(Boolean)).size;
  const tags = new Set(allPhotos.flatMap(p => p._tags)).size;
  $('statPhotos').innerHTML = `${allPhotos.length}<span class="a">+</span>`;
  $('statCountries').textContent = places || '—';
  $('statTags').textContent = tags || '—';
}

// ── FILM TICKER — 35mm strip + split-flap ────────────
function buildFilmTicker() {
  const track = $('ftTrack');
  if(!track) return;
  const counts = {};
  allPhotos.forEach(p => p._tags.forEach(t => counts[t] = (counts[t]||0)+1));
  const topTags = Object.keys(counts).sort((a,b) => counts[b]-counts[a]).slice(0, 18);
  const tags = ['all', ...topTags];

  track.innerHTML = tags.map((t, i) => {
    const label = t === 'all' ? 'ALL' : t;
    const cnt   = t === 'all' ? allPhotos.length : (counts[t] || 0);
    const isActive = t === activeTag;
    return `<div class="ft-frame${isActive?' active':''}" data-tag="${t}">
      <div class="ft-holes"><div class="ft-hole"></div><div class="ft-hole"></div><div class="ft-hole"></div><div class="ft-hole"></div></div>
      <div class="ft-content">
        <div class="ft-half ft-half--top"><span class="ft-tag">${label}</span></div>
        <div class="ft-divider"></div>
        <div class="ft-half ft-half--bot"><span class="ft-cnt">${cnt}</span></div>
        <span class="ft-fno">${String(i+1).padStart(2,'0')}</span>
      </div>
      <div class="ft-holes"><div class="ft-hole"></div><div class="ft-hole"></div><div class="ft-hole"></div><div class="ft-hole"></div></div>
    </div>`;
  }).join('');

  track.addEventListener('click', e => {
    const frame = e.target.closest('.ft-frame');
    if(frame) filterTag(frame.dataset.tag);
  });
}

function filterTag(t) {
  activeTag = t;
  view = t === 'all' ? [...allPhotos] : allPhotos.filter(p => p._tags.includes(t));
  document.querySelectorAll('.ft-frame').forEach(frame => {
    const isActive = frame.dataset.tag === t;
    if(isActive && !frame.classList.contains('active')) {
      frame.classList.add('flipping');
      setTimeout(() => { frame.classList.remove('flipping'); frame.classList.add('active'); }, 370);
    } else if(!isActive) {
      frame.classList.remove('active', 'flipping');
    }
  });
  buildWall();
}

// ── MATTED GALLERY WALL ───────────────────────────────
const wall = $('wall');
// subtle tilt pattern — alternating slight angles for an artful scattered feel
const TILTS = [0.25, 0, -0.3, 0.15, -0.15, 0.3, 0, -0.25, 0.2, -0.1, 0.1, 0];
function buildWall() {
  // only render photos that have an actual image — skip placeholders
  const rendered = view.map((p,i) => ({p,i})).filter(({p}) => p.image_url);
  if(!rendered.length) {
    wall.innerHTML = `<div class="wall-empty">NO FRAMES IN THIS CATEGORY YET</div>`;
    return;
  }
  wall.innerHTML = rendered.map(({p,i}, ri) => {
    const tilt = TILTS[ri % TILTS.length];
    return `
      <div class="print" data-idx="${i}">
        <div class="print-mat" style="--tilt:${tilt}deg">
          <div class="print-imgwrap"><img class="print-img" src="${p.image_url}" alt="${p.title||''}" loading="lazy"><div class="print-inspect">⌖ INSPECT</div></div>
          <div class="print-plate">
            <div><div class="pp-title">${p.title||'Untitled'}</div><div class="pp-loc">${p.location||'—'}</div></div>
            <div class="pp-no">${String(ri+1).padStart(2,'0')}</div>
          </div>
        </div>
      </div>`;
  }).join('');
  revealOnScroll();
}
wall.addEventListener('click', e => {
  const card = e.target.closest('.print');
  if(card) openLB(+card.dataset.idx);
});

// reveal-on-scroll with a gentle stagger (robust manual check)
function revealOnScroll() {
  const vh = window.innerHeight;
  let delay = 0;
  document.querySelectorAll('.print:not(.in)').forEach(el => {
    const r = el.getBoundingClientRect();
    if(r.top < vh*0.9 && r.bottom > 0) {
      el.style.animationDelay = delay + 'ms';
      el.classList.add('in');
      delay += 70;
    }
  });
}
window.addEventListener('scroll', revealOnScroll, { passive:true });
window.addEventListener('resize', revealOnScroll);

// ── LIGHTBOX + LOUPE ──────────────────────────────────
let lbIdx = 0;
const lb = $('lb'), lbImg = $('lbImg'), lbLoupe = $('lbLoupe');
function openLB(i) {
  if(i<0 || i>=view.length) return;
  lbIdx = i; const p = view[i];
  lbImg.classList.add('swapping');
  setTimeout(() => {
    lbImg.src = p.image_url || '';
    lbImg.classList.remove('swapping');
  }, 120);
  $('lbNo').textContent = `FRAME ${String(i+1).padStart(2,'0')} / ${view.length}`;
  $('lbTitle').textContent = p.title || 'Untitled';
  $('lbLoc').textContent = `${p.location||'—'}${p.date?' · '+p.date:''}`;
  $('lbStory').textContent = p.story || p.description || 'Story coming soon.';
  const exif = p.exif || {};
  $('lbExif').innerHTML = [
    ['CAMERA', exif.camera], ['LENS', exif.lens], ['SETTINGS', exif.settings], ['PLACE', placeOf(p)]
  ].filter(([,v]) => v).map(([l,v]) => `<div><div class="lab">${l}</div><div class="val">${v}</div></div>`).join('');
  $('lbTags').innerHTML = p._tags.map(t => `<span>${t}</span>`).join('');
  lbLoupe.style.backgroundImage = p.image_url ? `url("${p.image_url}")` : '';
  $('lbFull').style.display = p.image_url ? '' : 'none';
  lb.classList.add('open');
}
function closeLB() { lb.classList.remove('open'); }
function lbStep(d) { openLB((lbIdx+d+view.length)%view.length); }
$('lbClose').addEventListener('click', closeLB);
$('lbPrev').addEventListener('click', () => lbStep(-1));
$('lbNext').addEventListener('click', () => lbStep(1));
$('lbFull').addEventListener('click', () => openFullscreen(view[lbIdx].image_url, view[lbIdx].title));

const lbStage = $('lbStage');
lbStage.addEventListener('mousemove', e => {
  const r = lbImg.getBoundingClientRect();
  if(!lbImg.src || e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom) { lbLoupe.style.opacity = 0; return; }
  const px = (e.clientX-r.left)/r.width, py = (e.clientY-r.top)/r.height, zoom = 2.4;
  lbLoupe.style.left = e.clientX+'px';
  lbLoupe.style.top  = e.clientY+'px';
  lbLoupe.style.backgroundSize = `${r.width*zoom}px ${r.height*zoom}px`;
  lbLoupe.style.backgroundPosition = `${-(px*r.width*zoom - 95)}px ${-(py*r.height*zoom - 95)}px`;
  lbLoupe.style.opacity = 1;
});
lbStage.addEventListener('mouseleave', () => lbLoupe.style.opacity = 0);

// ── STORY MODE ────────────────────────────────────────
const SLIDE_MS = 7000;
let stIdx = 0, stTimer = null, stPlaying = true;
const story = $('story'), storyImg = $('storyImg');
function openStory(i) {
  if(!view.length) return;
  stIdx = i; stPlaying = true;
  $('storyPlayBtn').textContent = '❚❚';
  story.classList.add('open');
  $('storyProg').innerHTML = view.map(() => `<div class="sp-seg"><span class="fill"></span></div>`).join('');
  renderStory();
  // start ambient music on story open; bump volume slightly
  if (!musicPlaying) {
    ambient.start(0.45);
    musicPlaying = true;
    $('musicBtn')?.classList.add('playing');
    startPoems();
  } else {
    ambient.setVol(0.45);
  }
}
function closeStory() {
  story.classList.remove('open');
  clearTimeout(stTimer);
  // settle back to gallery volume if music was playing
  if (musicPlaying) ambient.setVol(0.38);
}
function renderStory() {
  const p = view[stIdx];
  storyImg.classList.remove('kb'); void storyImg.offsetWidth;
  storyImg.src = p.image_url || '';
  const sb = $('storyBg'); if(sb) sb.src = p.image_url || '';
  storyImg.classList.add('kb');
  $('storyEyebrow').textContent = `// ${(placeOf(p)||p.location||'').toUpperCase()}`;
  $('storyTitle').textContent = p.title || 'Untitled';
  $('storyBody').textContent = p.story || p.description || '';
  $('storyDate').textContent = p.date || '';
  $('storyCounter').textContent = `${String(stIdx+1).padStart(2,'0')} / ${String(view.length).padStart(2,'0')}`;
  ['storyEyebrow','storyTitle','storyBody','storyDate'].forEach(id => { const el = $(id); el.style.animation='none'; void el.offsetWidth; el.style.animation=''; });
  updateProg();
  if(stPlaying) schedule();
}
function updateProg() {
  [...document.querySelectorAll('.sp-seg')].forEach((s,i) => {
    s.classList.remove('done');
    const fill = s.querySelector('.fill');
    if(i < stIdx) { s.classList.add('done'); fill.style.animation='none'; }
    else if(i === stIdx) { fill.style.animation='none'; void fill.offsetWidth; fill.style.animation = stPlaying ? `segfill ${SLIDE_MS}ms linear forwards` : 'none'; }
    else { fill.style.animation='none'; fill.style.width='0'; }
  });
}
function schedule() { clearTimeout(stTimer); stTimer = setTimeout(() => storyStep(1), SLIDE_MS); }
function storyStep(d) {
  clearTimeout(stTimer);
  stIdx += d;
  if(stIdx >= view.length) { closeStory(); return; }
  if(stIdx < 0) stIdx = 0;
  renderStory();
}
function toggleStoryPlay() {
  stPlaying = !stPlaying;
  $('storyPlayBtn').textContent = stPlaying ? '❚❚' : '▶';
  if(stPlaying) { updateProg(); schedule(); }
  else clearTimeout(stTimer);
}
// ── AVATAR PLAY BUTTON + CAMERA FLASH ────────────────
function cameraFlashAndPlay() {
  const flash = $('cameraFlash');
  if(!flash) { openStory(0); return; }
  flash.classList.remove('flash');
  void flash.offsetWidth;              // force reflow to restart animation
  flash.classList.add('flash');
  setTimeout(() => openStory(0), 420);
}
$('avatarPlay')?.addEventListener('click', cameraFlashAndPlay);
$('storyClose').addEventListener('click', closeStory);
$('storyTap').addEventListener('click', () => storyStep(1));
$('storyPrev').addEventListener('click', e => { e.stopPropagation(); storyStep(-1); });
$('storyNext').addEventListener('click', e => { e.stopPropagation(); storyStep(1); });
$('storyPlayBtn').addEventListener('click', e => { e.stopPropagation(); toggleStoryPlay(); });

// ── FULLSCREEN VIEWER ─────────────────────────────────
function openFullscreen(url, title) {
  if(!url) return;
  const v = $('fullscreen-viewer');
  $('fv-img').src = url;
  $('fv-caption').textContent = title || '';
  v.classList.add('open');
  if(v.requestFullscreen) v.requestFullscreen().catch(()=>{});
}
function closeFullscreen() {
  $('fullscreen-viewer').classList.remove('open');
  $('fv-img').src = '';
  if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(()=>{});
}
$('fv-close').addEventListener('click', closeFullscreen);

// ── NAV + CLOUD OVERLAY + KEYS ────────────────────────
let heroThreshold = 300;
function updateOnScroll() {
  const sy = window.scrollY;
  $('topNav').classList.toggle('scrolled', sy > 50);
  // show cloud overlay once hero scrolls past 80% out of view
  const hero = document.getElementById('hero');
  if(hero) heroThreshold = hero.offsetHeight * 0.8;
  $('filmTicker')?.classList.toggle('show', sy > heroThreshold);
}
window.addEventListener('scroll', updateOnScroll, { passive:true });
document.addEventListener('keydown', e => {
  if($('fullscreen-viewer').classList.contains('open')) { if(e.key==='Escape') closeFullscreen(); return; }
  if(story.classList.contains('open')) {
    if(e.key==='ArrowRight') storyStep(1);
    if(e.key==='ArrowLeft') storyStep(-1);
    if(e.key==='Escape') closeStory();
    return;
  }
  if(lb.classList.contains('open')) {
    if(e.key==='ArrowRight') lbStep(1);
    if(e.key==='ArrowLeft') lbStep(-1);
    if(e.key==='Escape') closeLB();
  }
});

// ── ZNMD POEMS ────────────────────────────────────────
const POEMS = [
  "Zindagi mil ke bitaane ke liye hoti hai,\nyaad karke muskaraane ke liye hoti hai.",
  "Dilon mein tum apni betabiyaan\nleke chal rahe ho — toh zinda ho tum.",
  "Har lamha badata ja raha hun main,\nzindagi chhoti si lag rahi hai.",
  "Senorita... yeh jo hai zindagi,\nkuch khwaab hain, kuch armaan hain.",
  "Ik junoon tha, ik deewaangi thi,\naaj bhi wahi rang hain mere.",
  "Do dil mil rahe hain,\nmagar chupke chupke.",
  "Nazar mein khwabon ki bijliyan\nleke chal rahe ho — toh zinda ho tum.",
  "Har ek pal ka shukrana karo,\nyeh lamha tera hai.",
];
let poemIdx = 0, poemTimer = null;
function showNextPoem() {
  const el = $('poemText'); if (!el) return;
  el.classList.remove('visible');
  stopSpeech();
  setTimeout(() => {
    const text = POEMS[poemIdx % POEMS.length];
    poemIdx++;
    el.textContent = text;
    el.classList.add('visible');
    if (musicPlaying) speakPoem(text);
  }, 2800);
}
function startPoems() {
  if (poemTimer) return;
  showNextPoem();
  poemTimer = setInterval(showNextPoem, 26000);
}
function stopPoems() {
  clearInterval(poemTimer); poemTimer = null;
  stopSpeech();
  const el = $('poemText'); if (el) el.classList.remove('visible');
}

// ── ZNMD AMBIENT ENGINE ───────────────────────────────
const ambient = new ZNMDAmbient();
let musicPlaying = false;

$('musicBtn')?.addEventListener('click', () => {
  const btn = $('musicBtn');
  if (musicPlaying) {
    ambient.stop();
    musicPlaying = false;
    btn.classList.remove('playing');
    stopPoems();
  } else {
    ambient.start(0.38);
    musicPlaying = true;
    btn.classList.add('playing');
    startPoems();
  }
});

loadPhotos();
