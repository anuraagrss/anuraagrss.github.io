import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

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
document.addEventListener('touchstart', e => { if(e.target.tagName==='IMG') e.preventDefault(); }, { passive: false });
window.addEventListener('beforeprint', e => e.preventDefault());
document.addEventListener('keydown', e => { if(e.key==='Escape') { closeFullscreen(); } });

// ── ELEMENT CONFIG ─────────────────────────────────────
const EL_LABELS = { water:'WATER', sky:'SKY', earth:'EARTH', ice:'ICE', fire:'FIRE' };

// ── STATE ──────────────────────────────────────────────
let allPhotos = [], filteredPhotos = [], currentIdx = 0, activeEl = 'all';
let introDone = false;

// ── INTRO ──────────────────────────────────────────────
function dismissIntro() {
  if(introDone) return;
  introDone = true;
  clearTimeout(introTimer);
  document.getElementById('intro').classList.add('gone');
  document.getElementById('page').classList.add('vis');
}
const introTimer = setTimeout(dismissIntro, 5500);
document.getElementById('intro').addEventListener('click', e => { if(e.target.id!=='introSkip') dismissIntro(); });
document.getElementById('introSkip').addEventListener('click', dismissIntro);

// ── BUILD PERFORATION ROWS ─────────────────────────────
function buildPerfs() {
  const N = 120;
  ['perfTop','perfTop2','perfBot','perfBot2'].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    // Duplicate for seamless loop
    for(let pass=0; pass<2; pass++) {
      for(let i=0; i<N; i++) {
        const h = document.createElement('div');
        h.className = 'perf-hole';
        el.appendChild(h);
      }
    }
  });
}
buildPerfs();

// Build sprocket holes
function buildSprockets() {
  const N = 200;
  ['sprocketTop','sprocketBot'].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    for(let i=0; i<N; i++) {
      const h = document.createElement('div');
      h.className = 'sprocket-hole';
      el.appendChild(h);
    }
  });
}
buildSprockets();

// ── LOAD PHOTOS ────────────────────────────────────────
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
  applyFilter('all');
  updateStats();
}
loadPhotos();

function updateStats() {
  const countries = [...new Set(allPhotos.map(p=>p.country_id).filter(Boolean))].length;
  const sp = document.getElementById('statPhotos');
  const sc = document.getElementById('statCountries');
  if(sp) sp.innerHTML = `${allPhotos.length}<span class="acc">+</span>`;
  if(sc) sc.innerHTML = `${countries || '—'}`;
}

// ── FILTER ─────────────────────────────────────────────
function applyFilter(el) {
  activeEl = el;
  filteredPhotos = el === 'all' ? [...allPhotos] : allPhotos.filter(p => (p.element||'earth') === el);
  currentIdx = 0;

  // Update filter buttons
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.el === el);
  });

  buildReel();
  if(filteredPhotos.length > 0) selectPhoto(0);
  else showEmpty();
}

document.querySelectorAll('.filter-btn').forEach(b => {
  b.addEventListener('click', () => applyFilter(b.dataset.el));
});

// ── BUILD REEL ─────────────────────────────────────────
function buildReel() {
  const row = document.getElementById('framesRow');
  const counter = document.getElementById('reelCounter');
  if(!row) return;
  row.innerHTML = '';

  if(counter) counter.textContent = `${filteredPhotos.length} FRAME${filteredPhotos.length!==1?'S':''}`;

  if(!filteredPhotos.length) { showEmpty(); return; }

  filteredPhotos.forEach((photo, i) => {
    const frame = document.createElement('div');
    frame.className = 'film-frame' + (i===0?' active':'');
    frame.dataset.idx = i;

    const frameNo = String(i+1).padStart(3,'0');
    const imgSrc = photo.image_url || '';

    frame.innerHTML = `
      <div class="film-print">
        <div class="film-img-wrap">
          ${imgSrc
            ? `<img src="${imgSrc}" alt="${photo.title||''}" loading="lazy">`
            : ``
          }
        </div>
        <div class="film-caption">
          <span class="fc-num">${frameNo}</span>
          <span class="fc-name">${photo.title||''}</span>
        </div>
      </div>`;

    frame.addEventListener('click', () => selectPhoto(i));
    row.appendChild(frame);
  });

  // Drag-to-scroll on reel
  initReelDrag();
  // Sync sprocket animation to scroll
  syncSprockets();
}

// ── SELECT PHOTO ───────────────────────────────────────
function selectPhoto(idx) {
  if(idx < 0 || idx >= filteredPhotos.length) return;
  currentIdx = idx;

  const photo = filteredPhotos[idx];
  const frameNo = String(idx+1).padStart(3,'0');

  // Update active frame in reel
  document.querySelectorAll('.film-frame').forEach((f,i) => {
    f.classList.toggle('active', i === idx);
  });

  // Scroll active frame into view in reel
  const activeFrame = document.querySelector('.film-frame.active');
  if(activeFrame) {
    const row = document.getElementById('framesRow');
    const frameLeft = activeFrame.offsetLeft;
    const frameWidth = activeFrame.offsetWidth;
    const rowWidth = row.clientWidth;
    row.scrollTo({ left: frameLeft - rowWidth/2 + frameWidth/2, behavior: 'smooth' });
  }

  // Animate main photo transition
  const mainImg = document.getElementById('mainImg');
  const storyText = document.getElementById('storyText');

  mainImg.classList.add('changing');
  storyText.classList.add('changing');

  setTimeout(() => {
    mainImg.src = photo.image_url || '';
    mainImg.alt = photo.title || '';
    mainImg.classList.remove('changing');
    storyText.classList.remove('changing');

    document.getElementById('mainFrameNo').textContent = `FRAME ${frameNo}`;
    document.getElementById('mainTitle').textContent = photo.title || 'Untitled';
    document.getElementById('mainLocation').textContent = photo.location || '—';
    document.getElementById('mainElement').textContent = `// ${EL_LABELS[photo.element||'earth']||'NATURE'}`;
    document.getElementById('mainDate').textContent = photo.date || '—';
    storyText.textContent = photo.story || 'Story coming soon.';

    // EXIF
    const exifEl = document.getElementById('storyExif');
    const exif = photo.exif || {};
    exifEl.innerHTML = '';
    const exifFields = [
      ['CAMERA', exif.camera],
      ['LENS',   exif.lens],
      ['SETTINGS', exif.settings],
      ['COUNTRY', photo.country_id],
    ].filter(([,v]) => v);
    exifFields.forEach(([label, val]) => {
      exifEl.innerHTML += `<div class="exif-row"><span class="exif-label">${label}</span><span class="exif-val">${val}</span></div>`;
    });
  }, 250);

  // Prev / Next buttons
  const prev = document.getElementById('mainPrev');
  const next = document.getElementById('mainNext');
  if(prev) prev.disabled = idx === 0;
  if(next) next.disabled = idx === filteredPhotos.length - 1;

  // Fullscreen button
  document.getElementById('btnFullscreen').onclick = () => openFullscreen(photo.image_url, photo.title);
}

// ── EMPTY STATE ────────────────────────────────────────
function showEmpty() {
  const mainImg = document.getElementById('mainImg');
  if(mainImg) { mainImg.src=''; }
  document.getElementById('mainTitle').textContent = 'No photos';
  document.getElementById('mainLocation').textContent = '—';
  document.getElementById('mainElement').textContent = '—';
  document.getElementById('mainDate').textContent = '—';
  document.getElementById('storyText').textContent = 'No photographs in this category yet.';
  document.getElementById('storyExif').innerHTML = '';
  document.getElementById('framesRow').innerHTML = `
    <div style="padding:40px 24px;font-family:var(--mono);font-size:10px;letter-spacing:2px;color:rgba(245,168,0,0.2)">
      NO FRAMES IN THIS CATEGORY
    </div>`;
}

// ── PREV / NEXT ────────────────────────────────────────
document.getElementById('mainPrev').addEventListener('click', () => selectPhoto(currentIdx - 1));
document.getElementById('mainNext').addEventListener('click', () => selectPhoto(currentIdx + 1));

// Keyboard navigation
document.addEventListener('keydown', e => {
  if(e.key === 'ArrowLeft')  selectPhoto(currentIdx - 1);
  if(e.key === 'ArrowRight') selectPhoto(currentIdx + 1);
});

// ── DRAG-TO-SCROLL REEL ────────────────────────────────
function initReelDrag() {
  const row = document.getElementById('framesRow');
  if(!row) return;

  let isDown = false, startX = 0, scrollLeft = 0, didDrag = false;

  row.addEventListener('mousedown', e => {
    isDown = true; didDrag = false;
    startX = e.pageX - row.offsetLeft;
    scrollLeft = row.scrollLeft;
    row.style.cursor = 'grabbing';
  });
  window.addEventListener('mouseup', () => {
    isDown = false;
    row.style.cursor = 'grab';
  });
  row.addEventListener('mousemove', e => {
    if(!isDown) return;
    e.preventDefault();
    const x = e.pageX - row.offsetLeft;
    const walk = (x - startX) * 1.2;
    if(Math.abs(walk) > 4) didDrag = true;
    row.scrollLeft = scrollLeft - walk;
    animateSprockets(row.scrollLeft);
  });

  // Touch support
  let touchStartX = 0, touchScrollLeft = 0;
  row.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].pageX;
    touchScrollLeft = row.scrollLeft;
  }, { passive: true });
  row.addEventListener('touchmove', e => {
    const x = e.touches[0].pageX;
    row.scrollLeft = touchScrollLeft - (x - touchStartX) * 1.2;
    animateSprockets(row.scrollLeft);
  }, { passive: true });

  // Scroll event for trackpad / native scroll
  row.addEventListener('scroll', () => animateSprockets(row.scrollLeft));
}

// ── SPROCKET ANIMATION TIED TO SCROLL ─────────────────
let lastScrollPos = 0;
function animateSprockets(scrollPos) {
  const delta = scrollPos - lastScrollPos;
  lastScrollPos = scrollPos;

  // Move sprocket strips in opposite directions (top vs bottom)
  // Each hole is 40px wide, creating a clicking-reel effect
  const topEl  = document.getElementById('sprocketTop');
  const botEl  = document.getElementById('sprocketBot');

  if(topEl) topEl.style.transform = `translateX(${-scrollPos * 0.6}px)`;
  if(botEl) botEl.style.transform = `translateX(${-scrollPos * 0.6}px)`;
}

function syncSprockets() {
  const row = document.getElementById('framesRow');
  if(row) row.addEventListener('scroll', () => animateSprockets(row.scrollLeft));
}

// ── FULLSCREEN VIEWER ──────────────────────────────────
function openFullscreen(url, title) {
  if(!url) return;
  const viewer = document.getElementById('fullscreen-viewer');
  const img    = document.getElementById('fv-img');
  const cap    = document.getElementById('fv-caption');
  img.src = url;
  if(cap) cap.textContent = title || '';
  viewer.classList.add('open');
  document.body.style.overflow = 'hidden';

  if(viewer.requestFullscreen)            viewer.requestFullscreen();
  else if(viewer.webkitRequestFullscreen) viewer.webkitRequestFullscreen();
}
window.closeFullscreen = function() {
  const viewer = document.getElementById('fullscreen-viewer');
  viewer.classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('fv-img').src = '';
  if(document.exitFullscreen)            document.exitFullscreen().catch(()=>{});
  else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
};
document.getElementById('fullscreen-viewer').addEventListener('click', e => {
  if(e.target === document.getElementById('fullscreen-viewer') || e.target === document.getElementById('fv-img')) {
    window.closeFullscreen();
  }
});

// ── NAV SCROLL ─────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('topNav').classList.toggle('scrolled', window.scrollY > 60);
});
