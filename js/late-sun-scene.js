// The arrival: the fire, his words in the dark, the walk, the light.
import { setSky, loadAll } from './late-sun-data.js';
import { INTRO_LINES } from './late-sun-content.js';

// Optional assets. Each one upgrades the scene when it exists; nothing breaks when it doesn't.
const ASSETS = {
  plate:  'images/late-sun/shore.jpg',   // the shore, the fire, no person
  figure: 'images/late-sun/figure.png',  // Arey from behind, transparent background
  fire:   'images/late-sun/fire.mp3',    // only if he recorded it
  video:  'images/late-sun/walk.mp4',    // the walk, from key.jpg to shore.jpg
  key:    'images/late-sun/key.jpg',     // the walk's first frame
};

const $ = id => document.getElementById(id);
const scene = $('scene');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

setSky();

// ── GEOMETRY ──
// Fractions of the shore plate, measured on images/late-sun/shore.jpg.
// The path follows the sand strip from beside the fire out to the horizon.
const G = {
  horizon: .464,
  fire:  [.215, .80],             // where the embers rise from
  door:  [.515, .464],            // where the strip meets the sky
  path:  [[.36, .84], [.43, .76], [.475, .66], [.50, .56], [.515, .468]],
  figureK: 1.2,                   // figure height = K × distance below the horizon
};
let plate = null;                 // natural size of the plate, once it has loaded

function frame() {
  const w = scene.clientWidth, h = scene.clientHeight;
  if (!plate) return { map: (fx, fy) => ({ x: fx * w, y: fy * h }), H: h };
  const s = Math.max(w / plate.W, h / plate.H);
  const bx = w / h < 1 ? .47 : .5;                       // on phones, keep the strip and the door in view
  const ox = (w - plate.W * s) * bx, oy = (h - plate.H * s) / 2;
  $('plate').style.backgroundPosition = `${bx * 100}% 50%`;
  return { map: (fx, fy) => ({ x: ox + fx * plate.W * s, y: oy + fy * plate.H * s }), H: plate.H * s };
}

// ── ASSETS ──
function loadImage(src) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
const plateReady = loadImage(ASSETS.plate).then(img => {
  if (!img) return;
  plate = { W: img.naturalWidth, H: img.naturalHeight };
  $('plate').style.backgroundImage = `url("${ASSETS.plate}")`;
  scene.classList.add('has-plate');
});
const figureReady = loadImage(ASSETS.figure).then(img => {
  if (!img) return;
  $('walkerImg').src = ASSETS.figure; $('walkerImg').hidden = false; $('walkerSvg').remove();
  scene.classList.add('has-figure');
});
fetch(ASSETS.fire, { method: 'HEAD' }).then(r => {
  if (!r.ok) return;
  const btn = $('fireSound'), audio = $('fireAudio');
  audio.src = ASSETS.fire; btn.hidden = false;
  btn.onclick = () => {   // never plays on its own
    if (audio.paused) { audio.volume = .5; audio.play(); btn.textContent = '■ the fire, the wind'; }
    else { audio.pause(); btn.textContent = '▸ the fire, the wind'; }
  };
}).catch(() => {});

// Door sits on the horizon wherever the plate puts it.
function layout() {
  const f = frame(), d = f.map(...G.door);
  const door = $('door'); door.style.left = d.x + 'px'; door.style.top = d.y + 'px';
  $('walkVideo').style.objectPosition = $('plate').style.backgroundPosition || '50% 50%';
  sizeCanvas();
  if (walkDone) placeWalker(STAND);
}

// ── EMBERS ──
const cv = $('embers'), cx = cv.getContext('2d');
let embers = [];
function sizeCanvas() { cv.width = scene.clientWidth * devicePixelRatio; cv.height = scene.clientHeight * devicePixelRatio; }
function tickEmbers() {
  const d = devicePixelRatio, p = frame().map(...G.fire), f = { x: p.x * d, y: p.y * d };
  if (embers.length < 50 && Math.random() < .4)
    embers.push({ x: f.x + (Math.random() - .5) * 30 * d, y: f.y, vx: (.25 + Math.random() * .7) * d, vy: -(.5 + Math.random() * 1) * d, life: 1 });
  cx.clearRect(0, 0, cv.width, cv.height);
  embers = embers.filter(e => (e.life -= .006) > 0);
  for (const e of embers) {
    e.x += e.vx + Math.sin(e.y / 40) * .3 * d; e.y += e.vy;   // the wind pushes them along the shore
    cx.fillStyle = `rgba(236,170,90,${e.life * .8})`;
    cx.fillRect(e.x, e.y, 1.6 * d, 1.6 * d);
  }
  if (!reduced) requestAnimationFrame(tickEmbers);
}

// ── THE WALK ──
// With images/late-sun/walk.mp4 present, the video is the walk. Without it, the cut-out figure walks.
const walker = $('walker'), stepsEl = $('sceneSteps'), video = $('walkVideo');
let walkDone = false, useVideo = false, timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));

// position along the path, by length in image space
function pathAt(p) {
  // on a phone the fire is off-frame, so he starts already on the strip
  const P = scene.clientWidth < scene.clientHeight ? G.path.slice(1) : G.path, seg = [];
  let total = 0;
  for (let i = 0; i < P.length - 1; i++) { const l = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); seg.push(l); total += l; }
  let d = total * p;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) { const t = Math.min(1, d / seg[i]); return [P[i][0] + (P[i + 1][0] - P[i][0]) * t, P[i][1] + (P[i + 1][1] - P[i][1]) * t]; }
    d -= seg[i];
  }
}
function placeWalker(p) {
  const f = frame(), e = 1 - Math.pow(1 - p, 1.5);          // slows as he gets far away
  const [fx, fy] = pathAt(e), at = f.map(fx, fy);
  const hpx = Math.max(2, G.figureK * (fy - G.horizon) * f.H);
  walker.style.left = at.x + 'px'; walker.style.top = at.y + 'px';
  walker.style.height = hpx + 'px'; walker.style.width = (hpx / 2) + 'px';
  walker.style.transform = 'translate(-50%, -100%)';
  return { x: at.x, y: at.y, h: hpx };
}
function dropStep(at, i) {
  const fp = document.createElement('i'); fp.className = 'fp';
  const side = i % 2 ? 1 : -1, k = Math.max(.2, at.h / 260);
  fp.style.left = (at.x + side * 7 * k) + 'px'; fp.style.top = at.y + 'px';
  fp.style.transform = `translate(-50%, -50%) scale(${k})`;
  stepsEl.appendChild(fp); requestAnimationFrame(() => fp.classList.add('on'));
}
const trailOfSteps = () => { if (!stepsEl.children.length) for (let i = 1; i < 20; i++) dropStep(placeWalker(i / 22), i); };

function walkFigure(done) {
  walker.classList.add('here');
  const dur = 10000, t0 = performance.now(); let stepped = 0;
  (function tick(now) {
    if (walkDone) return;
    const p = Math.min(1, (now - t0) / dur), at = placeWalker(p);
    if (p > .04 && p * 22 > stepped + 1) { stepped++; dropStep(placeWalker(Math.max(0, p - .05)), stepped); placeWalker(p); }
    if (p > .8) walker.style.opacity = String(Math.max(0, (1 - p) / .2));   // into the light
    if (p < 1) requestAnimationFrame(tick); else done();
  })(t0);
}
function walkVideo(done) {
  video.onended = () => { video.classList.add('gone'); trailOfSteps(); done(); };
  video.play().catch(() => { video.classList.add('gone'); walkFigure(done); });
}

// ── WORDS: set the way the production intro sets them ──
// small lines, the big quote, a gold rule between thoughts, then STILL COUNTING in gold.
const [l1, l2, quote, l4, l5] = INTRO_LINES;
$('intro').innerHTML = `
  <p class="il sm">${l1}</p><p class="il sm">${l2}</p><div class="ir"></div>
  <p class="il lg">${quote}</p><div class="ir"></div>
  <p class="il sm">${l4}</p><p class="il sm">${l5}</p><div class="ir"></div>
  <p class="il proof">STILL COUNTING.</p>
  <p class="il tag" id="introTag">7 CONTINENTS · STILL COUNTING</p>`;
loadAll().then(d => { $('introTag').textContent = `${d.countries.length} COUNTRIES · 7 CONTINENTS · STILL COUNTING`; }).catch(() => {});

// ── NO WALK: I appear on the sand, then fade into the light, and the page carries you into the journey ──
const STAND = .34;                       // where on the strip I stand, as in the key art
let userMoved = false;
function appear() {
  placeWalker(STAND);
  walker.classList.add('here', 'standing');
}
function intoTheLight() {
  scene.classList.add('open', 'bloom');  // the door opens and its light swells
  walker.classList.add('into-light');    // I fade into it
  later(() => { $('w3').classList.add('on'); walkDone = true; }, 1800);
  later(() => { if (!userMoved) carryDown(); }, 3200);
}
// an eased glide down to the start of the journey — stops the moment you take over
function carryDown() {
  const target = document.getElementById('epiHero'); if (!target) return;
  const from = scrollY, to = target.getBoundingClientRect().top + scrollY - 20, dur = 2600, t0 = performance.now();
  scene.classList.add('leaving');
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  (function step(now) {
    if (userMoved) return;
    const p = Math.min(1, (now - t0) / dur);
    scrollTo(0, from + (to - from) * ease(p));
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}
function play() {
  later(() => $('sig').classList.add('on'), 500);
  const seq = [...$('intro').children];
  const at = [800, 1800, 2600, 3000, 4000, 4500, 5400, 6200, 6800, 7800];   // the production intro's timing
  seq.forEach((el, i) => later(() => el.classList.add('vis'), at[i] ?? 7800 + (i - 9) * 600));
  later(appear, 8800);                  // the words stay; I appear below them
  later(intoTheLight, 13800);
}

// If you scroll, the page is yours: the words stay, the light is up, nothing pulls you anywhere.
function finish() {
  if (walkDone && $('w3').classList.contains('on')) return;
  walkDone = true;
  timers.forEach(clearTimeout);
  $('intro').querySelectorAll('.il, .ir').forEach(e => e.classList.add('vis'));
  placeWalker(STAND); walker.classList.add('here', 'into-light');
  scene.classList.add('open');
  document.querySelectorAll('#sig, #w3').forEach(e => e.classList.add('on'));
}

Promise.race([Promise.all([plateReady, figureReady]), new Promise(r => setTimeout(r, 2500))]).then(() => {
  layout(); addEventListener('resize', () => { layout(); placeWalker(STAND); });
  if (!reduced) tickEmbers();
  if (reduced) { finish(); return; }
  play();
  const take = () => { userMoved = true; if (!walkDone) finish(); };
  addEventListener('wheel', take, { passive: true }); addEventListener('touchmove', take, { passive: true }); addEventListener('keydown', take);
});

// walk in: the trips are just below
$('w3').onclick = () => document.getElementById('epiHero').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
