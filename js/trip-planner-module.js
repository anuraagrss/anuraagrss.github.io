import { initializeApp }   from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithPopup, signOut as fbSignOut, onAuthStateChanged, GoogleAuthProvider }
                           from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
         doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
         collection, getDocs, serverTimestamp }
                           from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── FIREBASE ──
const FB = {
  apiKey: 'AIzaSyCESqunM9b_Yc-5Dj0qJJFxGALmEGm0Rd0',
  authDomain: 'nomad-404.firebaseapp.com',
  projectId: 'nomad-404',
  storageBucket: 'nomad-404.firebasestorage.app',
  messagingSenderId: '638331724572',
  appId: '1:638331724572:web:baa0d70108e920099150d9',
};
const app      = initializeApp(FB);
const auth     = getAuth(app);
const db       = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
const provider = new GoogleAuthProvider();

// ── ONLINE/OFFLINE ──
const syncDot     = document.getElementById('syncDot');
const offlineBanner = document.getElementById('offlineBanner');
function setOnlineStatus(online) {
  if (syncDot) syncDot.className = 'sync-dot' + (online ? '' : ' offline');
  if (offlineBanner) offlineBanner.classList.toggle('show', !online);
  if (syncDot) syncDot.title = online ? 'Online — syncing to cloud' : 'Offline — changes saved locally';
}
window.addEventListener('online',  () => setOnlineStatus(true));
window.addEventListener('offline', () => setOnlineStatus(false));
setOnlineStatus(navigator.onLine);

// ── STATE ──
let currentUser  = null;
let currentTrip  = null;
let currentTripId = null;
let tripsCache   = [];
let linkedFlightsCache = [];
let activePackCategory = 'Documents';
let _amToken = null;
let _amTokenExpiry = 0;
let _flightKeys = { saKey: '', amId: '', amSecret: '', amEnv: 'test' };
let _awardResults = [];
let _cashResults  = [];
const THEMES = ['sakura','ocean','desert','midnight','forest','neon','ember'];

// ── AUTH ──
onAuthStateChanged(auth, async user => {
  if (!user) { showAuth(); return; }
  const snap = await getDoc(doc(db, 'admins', user.uid)).catch(() => null);
  if (!snap?.exists()) {
    document.getElementById('auth-error').textContent = '✗ Access denied.';
    document.getElementById('googleBtn').disabled = false;
    await fbSignOut(auth);
    return;
  }
  currentUser = user;
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.add('visible');
  await loadTripsIntoSelector();
  // Auto-load from URL param
  const params = new URLSearchParams(location.search);
  const preselect = params.get('id');
  if (preselect) {
    document.getElementById('tripSelector').value = preselect;
    await loadTrip(preselect);
  }
});

function showAuth() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.remove('visible');
}

window.signIn = async () => {
  document.getElementById('googleBtn').disabled = true;
  document.getElementById('auth-error').textContent = '';
  try { await signInWithPopup(auth, provider); }
  catch(e) {
    document.getElementById('auth-error').textContent = `✗ ${e.message}`;
    document.getElementById('googleBtn').disabled = false;
  }
};

// Stars
(function(){
  const c = document.getElementById('authStars');
  if (!c) return;
  Object.assign(c.style, { position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' });
  for (let i = 0; i < 55; i++) {
    const s = document.createElement('div'); s.className = 'auth-star';
    const sz = Math.random() * 1.8 + 0.4;
    s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation-duration:${5+Math.random()*10}s;animation-delay:${Math.random()*8}s;opacity:0`;
    c.appendChild(s);
  }
})();

// ── TRIPS SELECTOR ──
async function loadTripsIntoSelector() {
  try {
    const snap = await getDocs(collection(db, 'trips'));
    tripsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    tripsCache.sort((a, b) => (b.date_from || '').localeCompare(a.date_from || ''));
    const sel = document.getElementById('tripSelector');
    sel.innerHTML = '<option value="">— Select Trip —</option>';
    tripsCache.forEach(t => {
      const o = document.createElement('option');
      o.value = t.id;
      o.textContent = t.title + (t.date_from ? ` (${t.date_from.slice(0,7)})` : '');
      sel.appendChild(o);
    });
  } catch(e) { console.error(e); }
}

window.loadTrip = async function(id) {
  if (!id) { showEmptyState(); return; }
  currentTripId = id;
  try {
    // Update URL
    const url = new URL(location.href);
    url.searchParams.set('id', id);
    history.replaceState({}, '', url);

    syncDot.className = 'sync-dot syncing';
    const snap = await getDoc(doc(db, 'trips', id));
    syncDot.className = 'sync-dot';
    if (!snap.exists()) { toast('Trip not found', 'err'); return; }
    currentTrip = { id: snap.id, ...snap.data() };
    renderTripPlanner();
  } catch(e) {
    syncDot.className = 'sync-dot offline';
    console.error(e);
    // Try to render from cache
    const cached = tripsCache.find(t => t.id === id);
    if (cached) { currentTrip = cached; renderTripPlanner(); }
    else toast('Could not load trip — offline?', 'err');
  }
};

function showEmptyState() {
  currentTrip = null; currentTripId = null;
  document.getElementById('emptyState').style.display = 'flex';
  document.getElementById('plannerContent').style.display = 'none';
  document.getElementById('topbarName').textContent = 'TRIP PLANNER';
  const url = new URL(location.href);
  url.searchParams.delete('id');
  history.replaceState({}, '', url);
}

// ── RENDER FULL PLANNER ──
function renderTripPlanner() {
  const t = currentTrip;
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('plannerContent').style.display = 'block';
  document.getElementById('topbarName').textContent = (t.title || 'TRIP').toUpperCase();

  // Theme
  applyTripTheme(t.theme);

  // Hero
  document.getElementById('heroTitle').textContent = (t.title || '').toUpperCase();
  const statusClass = { upcoming:'upcoming', planning:'planning', done:'done' }[t.status] || 'planning';
  const dateRange = t.date_from && t.date_to
    ? `${fmtDate(t.date_from)} → ${fmtDate(t.date_to)}`
    : t.date_from ? `From ${fmtDate(t.date_from)}` : 'No dates set';
  document.getElementById('heroMeta').innerHTML =
    `<span class="status-pill ${statusClass}">${(t.status||'PLANNING').toUpperCase()}</span> ${dateRange}`;

  // Live countdown
  startCountdown(t.date_from);

  // Packing
  renderPacking();

  // Apple integration
  renderAppleSection();

  // Flight search pre-fill
  if (t.origin) document.getElementById('fs-origin').value = t.origin;
  if (t.destination) document.getElementById('fs-dest').value = t.destination;
  if (t.date_from) document.getElementById('fs-date').value = t.date_from;
  updateFlightPreview();

  // Readiness score
  renderReadiness();

  // Destination facts
  loadDestinationFacts(t.destination || t.origin);

  // Itinerary
  renderItinerary();

  // Booked flights
  renderBookedFlights();

  // Currency converter
  renderCurrencyConverter();

  // Simplifi embed
  renderSimplifiSection();

  // Links + folder
  renderLinks();
  renderFolderLink();
  renderFolderSuggestion();

  // Linked flights
  loadLinkedFlights();

  // Load API keys (non-blocking)
  loadFlightApiKeys();
}

// ── PACKING ──
const PACKING_DEFAULTS = {
  'Documents': [
    'Passport (valid ≥6 months)', 'Visa documents / e-Visa printout', 'Travel insurance certificate',
    'Hotel confirmations (offline)', 'Flight tickets (offline)', 'Emergency contacts list',
    'International driving permit (if needed)', 'Vaccine certificates (if required)',
  ],
  'Electronics': [
    'Phone + charger cable', 'Laptop + charger', 'Power bank (charged)', 'Universal power adapter',
    'Headphones / AirPods', 'Camera + memory cards', 'USB-C hub / dongles', 'Smartwatch + charger',
  ],
  'Clothes': [
    'Casual outfits (3-5)', 'Formal outfit', 'Comfortable walking shoes', 'Sandals / flip flops',
    'Underwear × days', 'Socks × days', 'Light jacket / hoodie', 'Sleepwear',
  ],
  'Health': [
    'Prescription medications (+ extra supply)', 'Pain reliever', 'Antacids', 'Band-aids / first-aid kit',
    'Sunscreen SPF 50+', 'Hand sanitizer', 'Insect repellent (if tropical)', 'Face masks',
  ],
  'Toiletries': [
    'Toothbrush + toothpaste', 'Deodorant', 'Shampoo / conditioner', 'Face wash + moisturizer',
    'Razor / shaving kit', 'Lip balm', 'Contact lenses / glasses', 'Hair products',
  ],
  'Misc': [
    'Cash in local currency', 'Snacks for flight', 'Neck pillow', 'Eye mask + earplugs',
    'TSA-approved luggage lock', 'Packing cubes', 'Reusable water bottle', 'Book / Kindle',
  ],
};
const PACK_CATS = Object.keys(PACKING_DEFAULTS);

function getPackingData() {
  return currentTrip?.packing || [];
}

function renderPackTabs() {
  const tabs = document.getElementById('packTabs');
  tabs.innerHTML = '';
  PACK_CATS.forEach(cat => {
    const items = getPackingData().filter(i => i.category === cat);
    const checked = items.filter(i => i.checked).length;
    const btn = document.createElement('button');
    btn.className = 'pack-tab' + (cat === activePackCategory ? ' active' : '');
    btn.textContent = `${cat} (${checked}/${items.length})`;
    btn.onclick = () => { activePackCategory = cat; renderPacking(); };
    tabs.appendChild(btn);
  });
}

function renderPacking() {
  renderPackTabs();
  const all  = getPackingData();
  const total   = all.length;
  const checked = all.filter(i => i.checked).length;
  const pct = total ? Math.round(checked / total * 100) : 0;
  document.getElementById('packProgressLabel').textContent = `${checked} / ${total} packed`;
  document.getElementById('packProgressPct').textContent   = `${pct}%`;
  document.getElementById('packProgressBar').style.width   = pct + '%';
  document.getElementById('heroPackedStat').textContent = pct + '%';
  document.getElementById('heroPackedStat').className =
    'hero-stat-num' + (pct === 100 ? ' ok' : pct > 60 ? '' : ' warn');

  const list = document.getElementById('packList');
  list.innerHTML = '';
  const catItems = getPackingData().filter(i => i.category === activePackCategory);
  if (!catItems.length) {
    // Seed defaults for this category
    const defaults = PACKING_DEFAULTS[activePackCategory] || [];
    if (defaults.length && !currentTrip.packing?.length) {
      seedDefaultPacking();
      return;
    }
    const ph = document.createElement('div');
    ph.style.cssText = 'font-size:11px;color:var(--muted);padding:20px 0;text-align:center';
    ph.textContent = 'No items in this category — add below.';
    list.appendChild(ph);
    return;
  }
  catItems.forEach(item => {
    const el = document.createElement('div');
    el.className = 'pack-item' + (item.checked ? ' checked' : '');
    el.innerHTML = `
      <div class="pack-check"><span class="pack-check-tick">✓</span></div>
      <div class="pack-text">${esc(item.item)}</div>
      <span class="pack-del" onclick="event.stopPropagation();deletePackingItem('${item.id}')">✕</span>`;
    el.addEventListener('click', () => togglePackingItem(item.id));
    list.appendChild(el);
  });
}

async function seedDefaultPacking() {
  const defaults = [];
  PACK_CATS.forEach(cat => {
    (PACKING_DEFAULTS[cat] || []).forEach(item => {
      defaults.push({ id: uid(), category: cat, item, checked: false });
    });
  });
  currentTrip.packing = defaults;
  await saveTrip({ packing: defaults });
  renderPacking();
}

window.addPackingItem = async function() {
  const input = document.getElementById('packNewItem');
  const text = input.value.trim();
  if (!text) return;
  const item = { id: uid(), category: activePackCategory, item: text, checked: false };
  const packing = [...getPackingData(), item];
  currentTrip.packing = packing;
  input.value = '';
  renderPacking();
  await saveTrip({ packing });
};

window.deletePackingItem = async function(itemId) {
  const packing = getPackingData().filter(i => i.id !== itemId);
  currentTrip.packing = packing;
  renderPacking();
  await saveTrip({ packing });
};

async function togglePackingItem(itemId) {
  const packing = getPackingData().map(i => i.id === itemId ? { ...i, checked: !i.checked } : i);
  currentTrip.packing = packing;
  renderPacking();
  await saveTrip({ packing });
}

window.resetPacking = async function() {
  if (!confirm('Reset packing list to defaults?')) return;
  currentTrip.packing = [];
  await saveTrip({ packing: [] });
  seedDefaultPacking();
};

window.copyPackingList = function() {
  const lines = ['# PACKING LIST — ' + (currentTrip?.title || '').toUpperCase(), ''];
  PACK_CATS.forEach(cat => {
    const items = getPackingData().filter(i => i.category === cat);
    if (!items.length) return;
    lines.push(`## ${cat}`);
    items.forEach(i => lines.push(`${i.checked ? '[x]' : '[ ]'} ${i.item}`));
    lines.push('');
  });
  copyToClipboard(lines.join('\n'));
  toast('Packing list copied!');
};

// ── QUICKEN SIMPLIFI EMBED ──
let simplifiFrameTimer = null;

function renderSimplifiSection() {
  const url = currentTrip?.simplifi_report_url || '';
  if (url) {
    document.getElementById('simplifiSetup').style.display  = 'none';
    document.getElementById('simplifiEmbed').style.display  = 'block';
    document.getElementById('editSimplifiUrlBtn').style.display = 'inline-flex';
    document.getElementById('openSimplifiBtn').style.display    = 'inline-flex';
    document.getElementById('simplifi-url').value = url;
    mountSimplifiFrame(url);
  } else {
    document.getElementById('simplifiSetup').style.display  = 'block';
    document.getElementById('simplifiEmbed').style.display  = 'none';
    document.getElementById('openSimplifiBtn').style.display = 'none';
  }
}

function mountSimplifiFrame(url) {
  const loading  = document.getElementById('simplifiLoading');
  const frame    = document.getElementById('simplifiFrame');
  const fallback = document.getElementById('simplifiFallback');
  const openLink = document.getElementById('simplifiOpenLink');
  const urlChip  = document.getElementById('simplifiUrlChip');

  loading.style.display  = 'flex';
  frame.style.display    = 'none';
  fallback.style.display = 'none';

  openLink.href    = url;
  urlChip.textContent = url;

  // Set src — if Simplifi blocks X-Frame-Options this will be a blank frame
  frame.src = url;

  // After 4s, try to detect if it actually loaded content
  clearTimeout(simplifiFrameTimer);
  simplifiFrameTimer = setTimeout(() => {
    let blocked = false;
    try {
      // Cross-origin access throws if content was blocked
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc || doc.body?.innerHTML === '') blocked = true;
    } catch (_) {
      blocked = true;
    }
    loading.style.display = 'none';
    if (blocked) {
      frame.style.display    = 'none';
      fallback.style.display = 'flex';
    } else {
      frame.style.display    = 'block';
      fallback.style.display = 'none';
    }
  }, 4000);
}

window.onSimplifiFrameLoad = function() {
  // Called by iframe onload — clear the timeout and do the check now
  clearTimeout(simplifiFrameTimer);
  const loading  = document.getElementById('simplifiLoading');
  const frame    = document.getElementById('simplifiFrame');
  const fallback = document.getElementById('simplifiFallback');
  let blocked = false;
  try {
    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc || doc.body?.innerHTML === '') blocked = true;
  } catch (_) {
    blocked = true;
  }
  loading.style.display = 'none';
  if (blocked) {
    frame.style.display    = 'none';
    fallback.style.display = 'flex';
  } else {
    frame.style.display    = 'block';
    fallback.style.display = 'none';
  }
};

window.saveSimplifiUrl = async function() {
  const url = document.getElementById('simplifi-url').value.trim();
  if (!url || !url.startsWith('http')) { toast('Enter a valid Simplifi report URL', 'err'); return; }
  currentTrip.simplifi_report_url = url;
  document.getElementById('simplifiSetup').style.display = 'none';
  document.getElementById('simplifiEmbed').style.display = 'block';
  document.getElementById('openSimplifiBtn').style.display = 'inline-flex';
  mountSimplifiFrame(url);
  await saveTrip({ simplifi_report_url: url });
  toast('Simplifi report URL saved');
};

window.toggleSimplifiUrlEdit = function() {
  const setup = document.getElementById('simplifiSetup');
  const isHidden = setup.style.display === 'none';
  setup.style.display = isHidden ? 'block' : 'none';
};

window.openSimplifiReport = function() {
  const url = currentTrip?.simplifi_report_url || 'https://app.simplifimoney.com';
  window.open(url, '_blank');
};

// ── COUNTDOWN ──
let _countdownTimer = null;
function startCountdown(dateFrom) {
  if (_countdownTimer) clearInterval(_countdownTimer);
  const update = () => {
    const el = document.getElementById('heroDays');
    if (!el) return;
    if (!dateFrom) { el.textContent = '—'; el.className = 'hero-stat-num'; return; }
    const diff = new Date(dateFrom + 'T00:00:00') - new Date();
    if (diff < 0) { el.textContent = 'DONE'; el.className = 'hero-stat-num ok'; return; }
    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000) / 60000);
    if (days === 0) { el.textContent = `${hours}h ${mins}m`; el.className = 'hero-stat-num warn'; }
    else if (days <= 7) { el.textContent = `${days}d ${hours}h`; el.className = 'hero-stat-num warn'; }
    else { el.textContent = days; el.className = 'hero-stat-num' + (days < 14 ? ' warn' : ''); }
  };
  update();
  _countdownTimer = setInterval(update, 60000);
}

// ── READINESS SCORE ──
function calcReadiness() {
  const t = currentTrip;
  if (!t) return 0;
  let s = 0;
  if (t.date_from && t.date_to) s += 15;
  if ((t.booked_flights || []).length > 0) s += 25;
  const pack = getPackingData();
  if (pack.length) s += Math.round(pack.filter(i => i.checked).length / pack.length * 25);
  if ((t.links || []).length >= 2) s += 15;
  if (t.simplifi_report_url) s += 10;
  if (t.folder_url) s += 10;
  return Math.min(s, 100);
}
function renderReadiness() {
  const pct = calcReadiness();
  const el  = document.getElementById('heroReady');
  if (!el) return;
  el.textContent = pct + '%';
  el.className = 'hero-stat-num' + (pct === 100 ? ' ok' : pct >= 60 ? '' : ' warn');
}

// ── DESTINATION FACTS ──
const IATA_CITY = {
  HYD:'Hyderabad',NRT:'Tokyo',HND:'Tokyo',LAX:'Los Angeles',JFK:'New York City',
  LHR:'London',CDG:'Paris',FRA:'Frankfurt',DXB:'Dubai',SIN:'Singapore',
  HKG:'Hong Kong',ICN:'Seoul',FAE:'Faroe Islands',CPH:'Copenhagen',AMS:'Amsterdam',
  BCN:'Barcelona',FCO:'Rome',VIE:'Vienna',ZRH:'Zürich',MAD:'Madrid',LIS:'Lisbon',
  ATH:'Athens',IST:'Istanbul',BKK:'Bangkok',KUL:'Kuala Lumpur',MNL:'Manila',
  SYD:'Sydney',MEL:'Melbourne',ORD:'Chicago',MIA:'Miami',DFW:'Dallas',
  IAH:'Houston',SFO:'San Francisco',SEA:'Seattle',BOS:'Boston',ATL:'Atlanta',
  DEN:'Denver',MEX:'Mexico City',GRU:'São Paulo',EZE:'Buenos Aires',
  DEL:'New Delhi',BOM:'Mumbai',BLR:'Bengaluru',MAA:'Chennai',
  TYO:'Tokyo',OSA:'Osaka',NAN:'Fiji',CMB:'Colombo',NBO:'Nairobi',CAI:'Cairo',
};
const FUNNY = {
  FAE: "The Faroe Islands have more sheep than people — ~70,000 sheep for 50,000 humans. The sheep technically outvote you.",
  CPH: "Copenhagen has more bikes than people. Copenhageners cycle 1.4 million km daily — enough to orbit the moon and back.",
  NRT: "Japan has one vending machine per 23 people. They sell everything — including hot canned coffee, umbrellas, and yes, used schoolgirl socks (it's complicated).",
  DXB: "Dubai has indoor ski slopes. In a shopping mall. In the desert. At 45°C outside. Mankind peaked here.",
  SIN: "Singapore bans chewing gum. You can be fined S$1,000 for importing it. The streets are spotless. Worth it.",
  LHR: "London has 72 billionaires — more than any city on Earth. Yet the Tube still smells like 1987.",
  CDG: "France only officially allowed women to wear trousers in 2013. Liberté, égalité, fraternité... eventually.",
  HKG: "Hong Kong's famous outdoor escalator goes uphill 8am–10am and downhill the rest of the day. The city literally reverses direction twice a day.",
  BKK: "Bangkok's full ceremonial name is 169 letters long. It holds the Guinness World Record. Nobody uses it.",
  IST: "Istanbul is the only city spanning two continents. You can have breakfast in Europe and lunch in Asia without a passport.",
  HYD: "Hyderabad locals can identify which restaurant made the biryani by smell alone. It's a superpower developed over generations.",
  IAH: "Houston is so flat that flooding is basically built into the city plan. It floods during light rain. Residents barely notice.",
  ICN: "South Korea has the world's fastest internet. They are functionally living 5 years in the future.",
};

async function loadDestinationFacts(iata) {
  const city = IATA_CITY[(iata || '').toUpperCase()];
  if (!city) return;
  const cardEl   = document.getElementById('destinationFacts');
  const listEl   = document.getElementById('factsList');
  const headEl   = document.getElementById('factsHeading');
  if (!cardEl || !listEl) return;
  try {
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city)}`);
    if (!r.ok) return;
    const d = await r.json();
    const sentences = (d.extract || '').match(/[^.!?]+[.!?]+/g) || [];
    const facts = sentences.slice(0, 3).map(s => s.trim()).filter(s => s.length > 40);
    if (!facts.length) return;
    headEl.textContent = `// FUN FACTS — ${city.toUpperCase()}`;
    const emojis = ['📍','🎭','🗺️'];
    listEl.innerHTML = facts.map((f, i) => `<div class="fact-item">${emojis[i]||'•'} ${f}</div>`).join('');
    const funny = FUNNY[(iata||'').toUpperCase()];
    if (funny) listEl.innerHTML += `<div class="fact-item funny">🤪 ${funny}</div>`;
    cardEl.style.display = 'block';
  } catch { /* offline */ }
}

// ── ITINERARY ──
function getItinerary() {
  return (currentTrip?.itinerary || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

function renderItinerary() {
  const rows   = getItinerary();
  const empty  = document.getElementById('itinEmpty');
  const table  = document.getElementById('itineraryTable');
  const tbody  = document.getElementById('itineraryBody');
  if (!tbody) return;
  if (!rows.length) {
    if (empty) empty.style.display = 'block';
    if (table) table.style.display = 'none';
    return;
  }
  if (empty) empty.style.display = 'none';
  if (table) table.style.display = 'table';

  tbody.innerHTML = rows.map(r => `
    <tr data-id="${r.id}">
      <td class="itin-date-td" contenteditable="true" onblur="saveItineraryCell(this,'${r.id}','date')">${r.date ? fmtDate(r.date) : ''}</td>
      <td contenteditable="true" onblur="saveItineraryCell(this,'${r.id}','activity')">${esc(r.activity||'')}</td>
      <td contenteditable="true" onblur="saveItineraryCell(this,'${r.id}','location')">${esc(r.location||'')}</td>
      <td contenteditable="true" onblur="saveItineraryCell(this,'${r.id}','notes')">${esc(r.notes||'')}</td>
      <td style="text-align:center"><button class="itin-del" onclick="deleteItineraryRow('${r.id}')">✕</button></td>
    </tr>`).join('');
}

window.toggleAddItineraryForm = function() {
  const f = document.getElementById('addItineraryForm');
  if (!f) return;
  const show = f.style.display === 'none';
  f.style.display = show ? 'flex' : 'none';
  if (show) {
    // Pre-fill next day after last entry
    const rows = getItinerary();
    if (rows.length) {
      const last = new Date(rows[rows.length-1].date + 'T12:00:00');
      last.setDate(last.getDate() + 1);
      document.getElementById('itin-date').value = last.toISOString().slice(0,10);
    } else if (currentTrip?.date_from) {
      document.getElementById('itin-date').value = currentTrip.date_from;
    }
    document.getElementById('itin-activity').focus();
  }
};

window.saveItineraryRow = async function() {
  const date     = document.getElementById('itin-date')?.value;
  const activity = document.getElementById('itin-activity')?.value.trim();
  const location = document.getElementById('itin-location')?.value.trim();
  const notes    = document.getElementById('itin-notes')?.value.trim();
  if (!date && !activity) { toast('Enter at least a date or activity', 'err'); return; }
  const row = { id: uid(), date, activity, location, notes };
  const itinerary = [...getItinerary(), row];
  currentTrip.itinerary = itinerary;
  renderItinerary();
  ['itin-date','itin-activity','itin-location','itin-notes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('addItineraryForm').style.display = 'none';
  await saveTrip({ itinerary });
  toast('Day added');
};

window.saveItineraryCell = async function(cell, rowId, field) {
  const raw = cell.textContent.trim();
  let value = raw;
  // If editing date field, try to parse what the user typed and convert to YYYY-MM-DD
  if (field === 'date' && raw) {
    const parsed = new Date(raw);
    if (!isNaN(parsed)) {
      value = parsed.toISOString().slice(0, 10);
      cell.textContent = fmtDate(value);
    } else {
      // revert
      const original = getItinerary().find(r => r.id === rowId)?.date;
      cell.textContent = original ? fmtDate(original) : '';
      return;
    }
  }
  const itinerary = (currentTrip.itinerary || []).map(r =>
    r.id === rowId ? { ...r, [field]: value } : r
  );
  currentTrip.itinerary = itinerary;
  await saveTrip({ itinerary });
};

window.deleteItineraryRow = async function(rowId) {
  const itinerary = (currentTrip.itinerary || []).filter(r => r.id !== rowId);
  currentTrip.itinerary = itinerary;
  renderItinerary();
  await saveTrip({ itinerary });
};

// ── XLSX EXPORT (opens in Apple Numbers) ──
window.exportItineraryXLSX = function() {
  if (!window.XLSX) { toast('Export library loading — try again in a moment', 'info'); return; }
  const t    = currentTrip;
  const rows = getItinerary();
  if (!rows.length) { toast('Add itinerary days first', 'err'); return; }

  const tealHex  = '5BC0BE';
  const whiteHex = 'FFFFFF';
  const hStyle   = (bold = true) => ({
    font: { bold, sz: 10, color: { rgb: whiteHex }, name: 'Arial' },
    fill: { patternType: 'solid', fgColor: { rgb: tealHex } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: { bottom: { style: 'thin', color: { rgb: '4aa8a6' } } },
  });
  const titleStyle = {
    font: { bold: true, sz: 32, color: { rgb: tealHex }, name: 'Arial' },
    alignment: { horizontal: 'left', vertical: 'center' },
  };
  const subStyle = {
    font: { bold: true, sz: 14, name: 'Arial' },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const cellStyle = (isDate = false) => ({
    font: { sz: 11, name: 'Arial' },
    alignment: { horizontal: isDate ? 'center' : 'left', vertical: 'center', wrapText: true },
    border: {
      bottom: { style: 'thin', color: { rgb: 'EEEEEE' } },
      left:   { style: 'thin', color: { rgb: 'EEEEEE' } },
      right:  { style: 'thin', color: { rgb: 'EEEEEE' } },
    },
    numFmt: isDate ? 'mmm d, yyyy' : '@',
  });

  // Sheet data (row-major: aoa)
  const aoa = [
    [{ v: (t.title || 'TRIP').toUpperCase(), t: 's', s: titleStyle }, '', '', ''],
    ['', '', '', ''],
    [{ v: 'Itinerary', t: 's', s: subStyle }, '', '', ''],
    ['', '', '', ''],
    [
      { v: 'Date',     t: 's', s: hStyle() },
      { v: 'Activity', t: 's', s: hStyle() },
      { v: 'Location', t: 's', s: hStyle() },
      { v: 'Notes',    t: 's', s: hStyle() },
    ],
    ...rows.map(r => {
      const d = r.date ? new Date(r.date + 'T12:00:00') : null;
      return [
        d ? { v: d, t: 'd', s: cellStyle(true), z: 'mmm d, yyyy' } : { v: '', t: 's', s: cellStyle(true) },
        { v: r.activity || '', t: 's', s: cellStyle() },
        { v: r.location || '', t: 's', s: cellStyle() },
        { v: r.notes    || '', t: 's', s: cellStyle() },
      ];
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 14 }, { wch: 36 }, { wch: 20 }, { wch: 24 }];
  ws['!rows'] = [{ hpt: 44 }, { hpt: 6 }, { hpt: 22 }, { hpt: 6 }, { hpt: 22 }, ...rows.map(() => ({ hpt: 20 }))];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Itinerary');
  XLSX.writeFile(wb, `${slugify(t.title || 'trip')}-itinerary.xlsx`);
  toast('Exported — open with Apple Numbers');
};

// ── FLIGHT SEARCH ──

function applyTripTheme(theme) {
  document.body.dataset.theme = theme || '';
}

window.updateFlightPreview = window.updateFlightSearch = function() {
  const origin = document.getElementById('fs-origin')?.value.toUpperCase().trim();
  const dest   = document.getElementById('fs-dest')?.value.toUpperCase().trim();
  const date   = document.getElementById('fs-date')?.value;
  const row    = document.getElementById('flightPreviewRow');
  if (!row) return;
  if (origin?.length >= 3 && dest?.length >= 3) {
    row.style.display = 'flex';
    document.getElementById('fsRoute').textContent = `${origin} → ${dest}`;
    const cabinMap = { Y:'Economy', W:'Premium Eco', J:'Business', F:'First Class' };
    const cabin = cabinMap[document.getElementById('fs-cabin')?.value] || 'Business';
    document.getElementById('fsMeta').textContent =
      `${cabin} · ${document.getElementById('fs-pax')?.value || 1} pax${date ? ' · ' + fmtDate(date) : ''}`;
  } else {
    row.style.display = 'none';
  }
};

window.openPointMe = function() {
  const origin = (document.getElementById('fs-origin')?.value || currentTrip?.origin || '').toUpperCase().trim();
  const dest   = (document.getElementById('fs-dest')?.value  || currentTrip?.destination || '').toUpperCase().trim();
  const date   = document.getElementById('fs-date')?.value || currentTrip?.date_from || '';
  const cabin  = document.getElementById('fs-cabin')?.value || 'J';
  const pax    = document.getElementById('fs-pax')?.value || '1';
  if (!origin || !dest) { toast('Set origin and destination first', 'err'); return; }
  const params = new URLSearchParams({ origin, destination: dest, cabin, passengers: pax });
  if (date) params.set('departureDate', date);
  window.open(`https://app.point.me/search?${params}`, '_blank');
};

window.openGoogleFlights = function() {
  const origin = (document.getElementById('fs-origin')?.value || currentTrip?.origin || '').toUpperCase().trim();
  const dest   = (document.getElementById('fs-dest')?.value  || currentTrip?.destination || '').toUpperCase().trim();
  const date   = document.getElementById('fs-date')?.value || currentTrip?.date_from || '';
  if (!origin || !dest) { toast('Set origin and destination first', 'err'); return; }
  let q = `Flights from ${origin} to ${dest}`;
  if (date) { const d = new Date(date + 'T12:00:00'); q += ' on ' + d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }); }
  window.open(`https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`, '_blank');
};

window.saveFlightSearchConfig = async function() {
  const origin = document.getElementById('fs-origin')?.value.toUpperCase().trim();
  const dest   = document.getElementById('fs-dest')?.value.toUpperCase().trim();
  if (!origin || !dest) { toast('Fill in origin and destination first', 'err'); return; }
  await saveTrip({ origin, destination: dest });
  toast('Saved as trip default');
};

// ── FLIGHT API KEYS ──
async function loadFlightApiKeys() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'api_keys'));
    if (snap.exists()) {
      _flightKeys = { ..._flightKeys, ...snap.data() };
      const amIdEl = document.getElementById('am-id');
      const amEnvEl = document.getElementById('am-env');
      if (amIdEl && _flightKeys.amId) amIdEl.value = _flightKeys.amId;
      if (amEnvEl && _flightKeys.amEnv) amEnvEl.value = _flightKeys.amEnv;
    }
  } catch(e) { /* offline ok */ }
}

window.saveFlightApiKeys = async function() {
  const saRaw = document.getElementById('sa-key')?.value.trim();
  const amId  = document.getElementById('am-id')?.value.trim();
  const amSec = document.getElementById('am-secret')?.value.trim();
  const amEnv = document.getElementById('am-env')?.value || 'test';
  if (saRaw && saRaw !== '••••••••') _flightKeys.saKey = saRaw;
  if (amId)  _flightKeys.amId     = amId;
  if (amSec) _flightKeys.amSecret = amSec;
  _flightKeys.amEnv = amEnv;
  try {
    await setDoc(doc(db, 'settings', 'api_keys'), _flightKeys);
    _amToken = null; // reset cached token
    toast('API keys saved');
    document.getElementById('flightApiConfig').style.display = 'none';
  } catch(e) { toast('Save failed', 'err'); }
};

window.toggleFlightApiConfig = function() {
  const el = document.getElementById('flightApiConfig');
  if (!el) return;
  const show = el.style.display === 'none';
  el.style.display = show ? 'block' : 'none';
  if (show && _flightKeys.saKey) document.getElementById('sa-key').value = '••••••••';
};

// ── AMADEUS TOKEN ──
async function getAmadeusToken() {
  if (_amToken && Date.now() < _amTokenExpiry) return _amToken;
  const base = _flightKeys.amEnv === 'production' ? 'https://api.amadeus.com' : 'https://test.api.amadeus.com';
  const resp = await fetch(`${base}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${encodeURIComponent(_flightKeys.amId)}&client_secret=${encodeURIComponent(_flightKeys.amSecret)}`,
  });
  if (!resp.ok) throw new Error(`Amadeus auth ${resp.status}: ${await resp.text()}`);
  const d = await resp.json();
  _amToken = d.access_token;
  _amTokenExpiry = Date.now() + (d.expires_in - 60) * 1000;
  return _amToken;
}

// ── SEARCH ORCHESTRATOR ──
const AWARD_PROGRAMS = {
  united:'United MileagePlus', delta:'Delta SkyMiles', american:'AA AAdvantage',
  aircanada:'Aeroplan', emirates:'Emirates Skywards', alaska:'Alaska Mileage Plan',
  ana:'ANA Mileage Club', singapore:'KrisFlyer', cathay:'Asia Miles',
  turkish:'Miles & Smiles', etihad:'Etihad Guest', virginatlantic:'Virgin Points',
  british:'Avios', iberia:'Iberia Avios', qantas:'Qantas Points',
  flyingblue:'Flying Blue', sas:'EuroBonus', tap:'TAP Miles&Go',
};

window.searchAllFlights = async function() {
  const origin = document.getElementById('fs-origin')?.value.toUpperCase().trim();
  const dest   = document.getElementById('fs-dest')?.value.toUpperCase().trim();
  const date   = document.getElementById('fs-date')?.value;
  const cabin  = document.getElementById('fs-cabin')?.value || 'J';
  const pax    = parseInt(document.getElementById('fs-pax')?.value) || 1;

  if (!origin || !dest || !date) { toast('Fill origin, destination and date', 'err'); return; }
  if (!_flightKeys.saKey && !(_flightKeys.amId && _flightKeys.amSecret)) {
    toast('Configure API keys first (⚙ API KEYS)', 'err');
    document.getElementById('flightApiConfig').style.display = 'block';
    return;
  }

  const resultsEl = document.getElementById('flightResults');
  resultsEl.style.display = 'block';
  const loading = `<div class="flight-results-loading"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>`;
  ['ftAward','ftCash','ftValue'].forEach(id => { document.getElementById(id).innerHTML = loading; });
  showFlightTab('award');
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const [awardRes, cashRes] = await Promise.allSettled([
    _flightKeys.saKey ? searchSeatsAero({ origin, dest, date, cabin }) : Promise.reject(new Error('seats.aero key not configured')),
    (_flightKeys.amId && _flightKeys.amSecret) ? searchAmadeus({ origin, dest, date, cabin, pax }) : Promise.reject(new Error('Amadeus credentials not configured')),
  ]);

  // Parse award results
  if (awardRes.status === 'fulfilled') {
    const rows = awardRes.value?.data || [];
    const cabinKey = { Y:'Y', W:'W', J:'J', F:'F' }[cabin] || 'J';
    _awardResults = rows
      .filter(d => d[`${cabinKey}Available`])
      .map(d => ({
        source:     d.Source || d.source || '',
        sourceName: AWARD_PROGRAMS[d.Source || d.source] || (d.Source || d.source || ''),
        airlines:   d[`${cabinKey}Airlines`] || '',
        miles:      parseInt(d[`${cabinKey}MileageCost`]) || 0,
        seats:      d[`${cabinKey}RemainingSeats`] || 1,
        date:       d.Date || date,
      }))
      .filter(d => d.miles > 0)
      .sort((a, b) => a.miles - b.miles);
  } else {
    _awardResults = [{ error: awardRes.reason?.message || 'Unknown error' }];
  }

  // Parse cash results
  if (cashRes.status === 'fulfilled') {
    const offers = cashRes.value?.data || [];
    _cashResults = offers.map(o => {
      const itin    = o.itineraries?.[0];
      const segs    = itin?.segments || [];
      const seg0    = segs[0];
      const segLast = segs[segs.length - 1];
      const dur     = (itin?.duration || '').replace('PT','').replace('H','h ').replace('M','m').trim();
      const dep     = seg0?.departure?.at    ? new Date(seg0.departure.at)    : null;
      const arr     = segLast?.arrival?.at   ? new Date(segLast.arrival.at)   : null;
      return {
        price:    parseFloat(o.price?.total) || 0,
        currency: o.price?.currency || 'USD',
        airline:  (o.validatingAirlineCodes?.[0] || seg0?.carrierCode || '—'),
        flightNum: seg0 ? `${seg0.carrierCode}${seg0.number}` : '—',
        departure: dep ? dep.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '—',
        arrival:   arr ? arr.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}) : '—',
        stops:     segs.length - 1,
        duration:  dur,
      };
    }).sort((a, b) => a.price - b.price);
  } else {
    _cashResults = [{ error: cashRes.reason?.message || 'Unknown error' }];
  }

  renderAwardTab();
  renderCashTab();
  renderValueTab();
};

async function searchSeatsAero({ origin, dest, date, cabin }) {
  const cabinMap = { Y:'economy', W:'premium', J:'business', F:'first' };
  const params = new URLSearchParams({
    origin_airport: origin, destination_airport: dest,
    cabin: cabinMap[cabin] || 'business',
    start_date: date, end_date: date,
  });
  const resp = await fetch(`https://seats.aero/partnerapi/availability?${params}`, {
    headers: { 'Partner-Authorization': _flightKeys.saKey },
  });
  if (!resp.ok) throw new Error(`seats.aero ${resp.status}`);
  return resp.json();
}

async function searchAmadeus({ origin, dest, date, cabin, pax }) {
  const cabinMap = { Y:'ECONOMY', W:'PREMIUM_ECONOMY', J:'BUSINESS', F:'FIRST' };
  const token = await getAmadeusToken();
  const base  = _flightKeys.amEnv === 'production' ? 'https://api.amadeus.com' : 'https://test.api.amadeus.com';
  const params = new URLSearchParams({
    originLocationCode: origin, destinationLocationCode: dest,
    departureDate: date, adults: String(pax),
    travelClass: cabinMap[cabin] || 'BUSINESS',
    max: '10', currencyCode: 'USD',
  });
  const resp = await fetch(`${base}/v2/shopping/flight-offers?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Amadeus ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

// ── RESULT RENDERERS ──
function renderAwardTab() {
  const el = document.getElementById('ftAward');
  if (!el) return;
  if (_awardResults[0]?.error) {
    el.innerHTML = `<div class="api-notice">⚠ seats.aero: ${esc(_awardResults[0].error)}</div>`; return;
  }
  if (!_awardResults.length) {
    el.innerHTML = '<div class="flight-empty">No award space found for this route / date.</div>'; return;
  }
  const cheapestCash = _cashResults.find(c => !c.error && c.price > 0);
  el.innerHTML = _awardResults.map(a => {
    let valueBadge = '';
    if (cheapestCash && a.miles) {
      const cpp = cheapestCash.price / a.miles * 100;
      const cls = cpp >= 2 ? 'great' : cpp >= 1.2 ? 'good' : 'ok';
      const lbl = cpp >= 2 ? '🔥 GREAT — ' : cpp >= 1.2 ? '✓ GOOD — ' : '';
      valueBadge = `<span class="value-badge ${cls}">${lbl}${cpp.toFixed(2)}¢/pt</span>`;
    }
    return `<div class="award-card">
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:8px">
        <div style="flex:1">
          <div class="award-source">${esc(a.sourceName || a.source)}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">via ${esc(a.airlines)||'—'} · ${esc(a.date)}</div>
        </div>
        <div style="text-align:right">
          <div class="award-miles">${a.miles.toLocaleString()}</div>
          <div class="award-miles-label">MILES</div>
        </div>
      </div>
      <div class="bfc-chips">
        <span class="bfc-chip accent">${esc(String(a.seats))} seat${a.seats!==1?'s':''}</span>
        ${valueBadge}
      </div>
      <div class="bfc-actions">
        <button class="btn btn-ghost" style="font-size:10px;padding:5px 12px" onclick="openPointMeProgram('${esc(a.source)}')">BOOK VIA POINT.ME →</button>
      </div>
    </div>`;
  }).join('');
}

function renderCashTab() {
  const el = document.getElementById('ftCash');
  if (!el) return;
  if (_cashResults[0]?.error) {
    el.innerHTML = `<div class="api-notice">⚠ Amadeus: ${esc(_cashResults[0].error)}<br><span style="font-size:10px;opacity:.7">Check API credentials and environment setting</span></div>`; return;
  }
  if (!_cashResults.length) {
    el.innerHTML = '<div class="flight-empty">No cash fares found for this route.</div>'; return;
  }
  el.innerHTML = _cashResults.slice(0, 8).map((c, i) => `
    <div class="cash-card">
      <div style="display:flex;align-items:flex-start;gap:14px">
        <div style="flex:1">
          <div style="font-family:var(--disp);font-size:18px;color:var(--text);letter-spacing:1px">${esc(c.airline)} <span style="font-family:var(--mono);font-size:11px;color:var(--muted)">${esc(c.flightNum)}</span></div>
          <div class="cash-details">${esc(c.departure)} → ${esc(c.arrival)} · ${esc(c.duration)||'—'} · ${c.stops===0?'Nonstop':c.stops+' stop'+(c.stops!==1?'s':'')}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="cash-price">$${c.price.toLocaleString()}</div>
          <div style="font-size:9px;color:var(--muted);letter-spacing:1px">USD / PAX</div>
          ${i===0?'<div style="font-size:9px;color:var(--green);letter-spacing:2px;margin-top:2px">CHEAPEST</div>':''}
        </div>
      </div>
    </div>`).join('');
}

function renderValueTab() {
  const el = document.getElementById('ftValue');
  if (!el) return;
  const cheapestCash = _cashResults.find(c => !c.error && c.price > 0);
  const awardsOk = _awardResults.length && !_awardResults[0]?.error;

  let html = '';

  if (cheapestCash) {
    html += `<div class="award-card" style="margin-bottom:16px;border-color:rgba(91,192,190,.2)">
      <div style="font-size:10px;letter-spacing:2px;color:var(--muted);margin-bottom:8px">// CASH BENCHMARK</div>
      <div style="display:flex;align-items:center;gap:16px">
        <div class="cash-price">$${cheapestCash.price.toLocaleString()}</div>
        <div class="cash-details">${esc(cheapestCash.airline)} ${esc(cheapestCash.flightNum)} · ${esc(cheapestCash.duration)||'—'} · ${cheapestCash.stops===0?'Nonstop':cheapestCash.stops+' stop(s)'}</div>
      </div>
    </div>`;
  }

  if (awardsOk && cheapestCash) {
    const ranked = _awardResults
      .filter(a => a.miles > 0)
      .map(a => ({ ...a, cpp: cheapestCash.price / a.miles * 100 }))
      .sort((a, b) => b.cpp - a.cpp);

    html += `<div style="font-size:10px;letter-spacing:2px;color:var(--muted);margin-bottom:10px">// AWARD RANKING — highest ¢/point = best value vs cash</div>`;
    html += ranked.map((a, i) => {
      const cls = a.cpp >= 2 ? 'great' : a.cpp >= 1.2 ? 'good' : 'ok';
      const medal = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
      return `<div class="award-card">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <div style="font-size:18px;flex-shrink:0">${medal}</div>
          <div style="flex:1">
            <div class="award-source">${esc(a.sourceName)}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px">${a.miles.toLocaleString()} miles · ${a.seats} seat${a.seats!==1?'s':''}</div>
          </div>
          <div style="text-align:right">
            <div class="cpp-big">${a.cpp.toFixed(2)}¢</div>
            <div style="font-size:9px;color:var(--muted);letter-spacing:1px">PER POINT</div>
          </div>
          <span class="value-badge ${cls}">${a.cpp>=2?'GREAT':a.cpp>=1.2?'GOOD':'OK'}</span>
        </div>
        <div class="bfc-actions">
          <button class="btn btn-ghost" style="font-size:10px;padding:5px 12px" onclick="openPointMeProgram('${esc(a.source)}')">BOOK →</button>
        </div>
      </div>`;
    }).join('');
  } else if (!cheapestCash && awardsOk) {
    html += '<div class="api-notice" style="margin-bottom:12px">Configure Amadeus to see cash vs award comparison</div>';
    html += _awardResults.map(a => `<div class="award-card"><div class="award-source">${esc(a.sourceName)}</div><div class="award-miles" style="margin-top:4px">${a.miles.toLocaleString()} <span style="font-size:14px;color:var(--muted)">miles</span></div></div>`).join('');
  } else if (!html) {
    html = '<div class="flight-empty">Run a search to see value comparison.</div>';
  }

  el.innerHTML = html;
}

window.showFlightTab = function(tab) {
  document.getElementById('ftAward').style.display = tab === 'award' ? 'block' : 'none';
  document.getElementById('ftCash').style.display  = tab === 'cash'  ? 'block' : 'none';
  document.getElementById('ftValue').style.display = tab === 'value' ? 'block' : 'none';
  document.querySelectorAll('#flightTabs .pack-tab').forEach((btn, i) => {
    btn.classList.toggle('active', ['award','cash','value'][i] === tab);
  });
};

window.openPointMeProgram = function(source) {
  const origin = (document.getElementById('fs-origin')?.value || currentTrip?.origin || '').toUpperCase();
  const dest   = (document.getElementById('fs-dest')?.value  || currentTrip?.destination || '').toUpperCase();
  const date   = document.getElementById('fs-date')?.value || currentTrip?.date_from || '';
  const cabin  = document.getElementById('fs-cabin')?.value || 'J';
  const pax    = document.getElementById('fs-pax')?.value || '1';
  const params = new URLSearchParams({ origin, destination: dest, cabin, passengers: pax });
  if (date) params.set('departureDate', date);
  window.open(`https://app.point.me/search?${params}`, '_blank');
};

// ── CURRENCY CONVERTER ──
const IATA_CURRENCY = {
  // Japan
  NRT:'JPY',HND:'JPY',KIX:'JPY',ITM:'JPY',CTS:'JPY',OKA:'JPY',
  // UK
  LHR:'GBP',LGW:'GBP',STN:'GBP',MAN:'GBP',EDI:'GBP',
  // Europe (EUR)
  CDG:'EUR',ORY:'EUR',FRA:'EUR',MUC:'EUR',AMS:'EUR',BCN:'EUR',
  MAD:'EUR',FCO:'EUR',VIE:'EUR',ATH:'EUR',LIS:'EUR',HEL:'EUR',
  DUB:'EUR',BRU:'EUR',MXP:'EUR',LIN:'EUR',BLQ:'EUR',NAP:'EUR',
  // Non-EUR Europe
  ZRH:'CHF',GVA:'CHF',BSL:'CHF',
  CPH:'DKK',FAE:'DKK',
  OSL:'NOK',BGO:'NOK',
  ARN:'SEK',GOT:'SEK',
  WAW:'PLN',KRK:'PLN',
  PRG:'CZK',BUD:'HUF',
  // Middle East
  DXB:'AED',AUH:'AED',SHJ:'AED',
  DOH:'QAR',BAH:'BHD',
  RUH:'SAR',JED:'SAR',
  TLV:'ILS',AMM:'JOD',
  IST:'TRY',ESB:'TRY',
  // Asia
  SIN:'SGD',HKG:'HKD',
  ICN:'KRW',GMP:'KRW',
  BKK:'THB',KUL:'MYR',
  CGK:'IDR',MNL:'PHP',
  TPE:'TWD',RMQ:'TWD',
  CMB:'LKR',DAC:'BDT',KTM:'NPR',
  // India
  HYD:'INR',DEL:'INR',BOM:'INR',MAA:'INR',BLR:'INR',CCU:'INR',
  AMD:'INR',PNQ:'INR',GOI:'INR',COK:'INR',
  // Oceania
  SYD:'AUD',MEL:'AUD',BNE:'AUD',PER:'AUD',ADL:'AUD',
  AKL:'NZD',CHC:'NZD',WLG:'NZD',
  // Americas — USA
  JFK:'USD',LAX:'USD',ORD:'USD',MIA:'USD',SFO:'USD',
  IAH:'USD',DFW:'USD',ATL:'USD',DEN:'USD',BOS:'USD',
  SEA:'USD',LAS:'USD',PHX:'USD',EWR:'USD',MSP:'USD',
  MCO:'USD',DTW:'USD',CLT:'USD',PHL:'USD',SLC:'USD',
  // Canada
  YYZ:'CAD',YVR:'CAD',YUL:'CAD',YYC:'CAD',YEG:'CAD',
  // LatAm
  MEX:'MXN',GDL:'MXN',
  GRU:'BRL',GIG:'BRL',BSB:'BRL',
  EZE:'ARS',AEP:'ARS',
  SCL:'CLP',LIM:'PEN',BOG:'COP',
  // Africa
  JNB:'ZAR',CPT:'ZAR',DUR:'ZAR',
  NBO:'KES',ADD:'ETB',CAI:'EGP',CMN:'MAD',
};

const CONV_CURRENCIES = [
  'USD','EUR','GBP','JPY','INR','AUD','CAD','SGD','AED','CHF',
  'HKD','KRW','THB','MYR','IDR','PHP','TWD','DKK','NOK','SEK',
  'NZD','MXN','BRL','TRY','ZAR','QAR','SAR','PLN','CZK','HUF',
];

let _convRates = {};
let _convBase  = null;

async function _fetchRates(base) {
  const b = base.toLowerCase();
  if (_convBase === base && Object.keys(_convRates).length) return _convRates;
  try {
    const r = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${b}.json`);
    if (!r.ok) throw new Error('primary failed');
    const d = await r.json();
    _convRates = d[b] || {};
  } catch {
    try {
      const r = await fetch(`https://latest.currency-api.pages.dev/v1/currencies/${b}.json`);
      const d = await r.json();
      _convRates = d[b] || {};
    } catch { return {}; }
  }
  _convBase = base;
  return _convRates;
}

function _buildConvSelects(homeCur, destCur) {
  const all = [...new Set([homeCur, destCur, ...CONV_CURRENCIES])];
  const opts = all.map(c => `<option value="${c}">${c}</option>`).join('');
  const fromSel = document.getElementById('conv-from-cur');
  const toSel   = document.getElementById('conv-to-cur');
  if (!fromSel || !toSel) return;
  fromSel.innerHTML = opts;
  toSel.innerHTML   = opts;
  fromSel.value = homeCur;
  toSel.value   = destCur;
}

async function _runConversion() {
  const from   = document.getElementById('conv-from-cur')?.value;
  const to     = document.getElementById('conv-to-cur')?.value;
  const amount = parseFloat(document.getElementById('conv-from')?.value) || 0;
  const statusEl = document.getElementById('convStatus');
  const rateEl   = document.getElementById('convRateDisplay');
  if (!from || !to) return;
  if (statusEl) statusEl.textContent = 'Fetching rates…';
  const rates = await _fetchRates(from);
  const key   = to.toLowerCase();
  if (!rates[key]) {
    if (statusEl) statusEl.textContent = 'Could not load rates — check connection';
    return;
  }
  const rate   = rates[key];
  const result = amount * rate;
  const toEl   = document.getElementById('conv-to');
  if (toEl) toEl.value = result ? result.toFixed(result < 1 ? 4 : result < 100 ? 2 : 0) : '';
  const fmt = (n) => n < 0.001 ? n.toFixed(6) : n < 1 ? n.toFixed(4) : n < 100 ? n.toFixed(2) : n.toFixed(0);
  if (rateEl)   rateEl.innerHTML  = `1 ${from} = <strong style="color:var(--teal)">${fmt(rate)} ${to}</strong>`;
  if (statusEl) statusEl.textContent = 'Rates updated daily · currency-api.pages.dev';
}

function renderCurrencyConverter() {
  const t       = currentTrip;
  const homeCur = t?.budget_currency || 'USD';
  const destCur = IATA_CURRENCY[(t?.destination || '').toUpperCase()] ||
                  IATA_CURRENCY[(t?.origin || '').toUpperCase()] ||
                  (homeCur === 'USD' ? 'EUR' : 'USD');
  _buildConvSelects(homeCur, destCur);
  _convBase = null; // force fresh fetch
  _runConversion();
}

window.convertFromTo       = _runConversion;
window.onConvCurrencyChange = async function() { _convBase = null; await _runConversion(); };

window.convertToFrom = async function() {
  const from   = document.getElementById('conv-from-cur')?.value;
  const to     = document.getElementById('conv-to-cur')?.value;
  const amount = parseFloat(document.getElementById('conv-to')?.value) || 0;
  if (!from || !to) return;
  const rates = await _fetchRates(from);
  const key   = to.toLowerCase();
  if (!rates[key]) return;
  const result = amount / rates[key];
  const fromEl = document.getElementById('conv-from');
  if (fromEl) fromEl.value = result ? result.toFixed(result < 1 ? 4 : result < 100 ? 2 : 0) : '';
};

window.swapCurrencies = async function() {
  const fromSel = document.getElementById('conv-from-cur');
  const toSel   = document.getElementById('conv-to-cur');
  if (!fromSel || !toSel) return;
  [fromSel.value, toSel.value] = [toSel.value, fromSel.value];
  _convBase = null;
  const fromEl = document.getElementById('conv-from');
  const toEl   = document.getElementById('conv-to');
  if (fromEl && toEl) [fromEl.value, toEl.value] = [toEl.value, fromEl.value];
  await _runConversion();
};

// ── BOOKED FLIGHTS ──
function getBookedFlights() { return currentTrip?.booked_flights || []; }

function renderBookedFlights() {
  const el = document.getElementById('bookedFlightsList');
  if (!el) return;
  const flights = getBookedFlights();
  if (!flights.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:20px 0">No confirmed bookings yet — add your booked flights above.</div>';
    return;
  }
  el.innerHTML = flights.map(f => `
    <div class="booked-flight-card">
      <div class="bfc-header">
        <span class="bfc-num">${esc(f.flight_num||'—')}</span>
        <span class="bfc-airline">${esc(f.airline||'')}</span>
        <span class="bfc-route">${esc(f.origin||'?')} → ${esc(f.dest||'?')}</span>
      </div>
      <div class="bfc-chips">
        ${f.dep_date?`<span class="bfc-chip accent">✈ ${esc(f.dep_date)}${f.dep_time?' '+esc(f.dep_time):''}</span>`:''}
        ${f.arr_time?`<span class="bfc-chip">🛬 ${f.arr_date?esc(f.arr_date)+' ':''}${esc(f.arr_time)}</span>`:''}
        ${f.cabin?`<span class="bfc-chip">${esc(f.cabin)}</span>`:''}
        ${f.booking_ref?`<span class="bfc-chip accent">REF: ${esc(f.booking_ref)}</span>`:''}
        ${f.email_ref?`<span class="bfc-chip">📧 ${esc(f.email_ref)}</span>`:''}
        ${f.doc?`<span class="bfc-chip">📄 ${esc(f.doc)}</span>`:''}
      </div>
      <div class="bfc-actions">
        ${f.url?`<a href="${esc(f.url)}" target="_blank" rel="noopener" class="btn btn-ghost" style="font-size:10px;padding:5px 12px;text-decoration:none">MANAGE BOOKING →</a>`:''}
        <button class="btn btn-danger" style="font-size:10px;padding:5px 12px" onclick="deleteBookedFlight('${f.id}')">REMOVE</button>
      </div>
    </div>`).join('');
}

window.toggleAddFlightForm = function() {
  const form = document.getElementById('addFlightForm');
  if (!form) return;
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

window.saveBookedFlight = async function() {
  const f = {
    id:          uid(),
    flight_num:  document.getElementById('bf-num')?.value.trim().toUpperCase(),
    airline:     document.getElementById('bf-airline')?.value.trim(),
    origin:      document.getElementById('bf-origin')?.value.trim().toUpperCase(),
    dest:        document.getElementById('bf-dest')?.value.trim().toUpperCase(),
    cabin:       document.getElementById('bf-cabin')?.value,
    dep_date:    document.getElementById('bf-dep-date')?.value,
    dep_time:    document.getElementById('bf-dep-time')?.value,
    arr_date:    document.getElementById('bf-arr-date')?.value,
    arr_time:    document.getElementById('bf-arr-time')?.value,
    booking_ref: document.getElementById('bf-ref')?.value.trim().toUpperCase(),
    email_ref:   document.getElementById('bf-email-ref')?.value.trim(),
    doc:         document.getElementById('bf-doc')?.value.trim(),
    url:         document.getElementById('bf-url')?.value.trim(),
  };
  if (!f.flight_num && !f.airline) { toast('Enter at least a flight number or airline', 'err'); return; }
  const flights = [...getBookedFlights(), f];
  currentTrip.booked_flights = flights;
  renderBookedFlights();
  ['bf-num','bf-airline','bf-origin','bf-dest','bf-dep-date','bf-dep-time','bf-arr-date','bf-arr-time','bf-ref','bf-email-ref','bf-doc','bf-url']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('addFlightForm').style.display = 'none';
  await saveTrip({ booked_flights: flights });
  toast('Flight saved');
};

window.deleteBookedFlight = async function(id) {
  const flights = getBookedFlights().filter(f => f.id !== id);
  currentTrip.booked_flights = flights;
  renderBookedFlights();
  await saveTrip({ booked_flights: flights });
};

// ── FOLDER LINK ──
function renderFolderLink() {
  const url    = currentTrip?.folder_url;
  const setup  = document.getElementById('folderLinkSetup');
  const saved  = document.getElementById('folderLinkSaved');
  if (!setup || !saved) return;
  if (url) {
    setup.style.display = 'none';
    saved.style.display = 'flex';
    document.getElementById('folderLinkDisplay').textContent = url.length > 70 ? url.slice(0, 67) + '…' : url;
    document.getElementById('folderLinkOpen').href = url;
  } else {
    setup.style.display = 'block';
    saved.style.display = 'none';
  }
}

window.saveFolderLink = async function() {
  const url = document.getElementById('folder-url-input')?.value.trim();
  if (!url) { toast('Enter a folder URL', 'err'); return; }
  currentTrip.folder_url = url;
  renderFolderLink();
  await saveTrip({ folder_url: url });
  toast('Folder link saved');
};

window.toggleFolderLinkEdit = function() {
  const setup = document.getElementById('folderLinkSetup');
  const saved = document.getElementById('folderLinkSaved');
  if (!setup || !saved) return;
  setup.style.display = 'block';
  saved.style.display = 'none';
  const input = document.getElementById('folder-url-input');
  if (input) input.value = currentTrip?.folder_url || '';
};

// ── LINKS ──
function getLinks() { return currentTrip?.links || []; }

function renderLinks() {
  const list = document.getElementById('linksList');
  list.innerHTML = '';
  const links = getLinks();
  if (!links.length) {
    list.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:16px 0">No links saved yet.</div>';
    return;
  }
  links.forEach(lnk => {
    const row = document.createElement('div');
    row.className = 'link-row';
    row.innerHTML = `
      <span class="link-type-badge">${(lnk.type || 'other').toUpperCase()}</span>
      <span class="link-label">${esc(lnk.label)}</span>
      <a class="link-open" href="${esc(lnk.url)}" target="_blank" rel="noopener">OPEN →</a>
      <button class="link-del" onclick="deleteLink('${lnk.id}')">✕</button>`;
    list.appendChild(row);
  });
}

window.addLink = async function() {
  const label = document.getElementById('lnk-label').value.trim();
  const url   = document.getElementById('lnk-url').value.trim();
  const type  = document.getElementById('lnk-type').value;
  if (!label || !url) { toast('Enter label and URL', 'err'); return; }
  const lnk = { id: uid(), label, url, type };
  const links = [...getLinks(), lnk];
  currentTrip.links = links;
  ['lnk-label','lnk-url'].forEach(id => document.getElementById(id).value = '');
  renderLinks();
  await saveTrip({ links });
};

window.deleteLink = async function(linkId) {
  const links = getLinks().filter(l => l.id !== linkId);
  currentTrip.links = links;
  renderLinks();
  await saveTrip({ links });
};

function renderFolderSuggestion() {
  const name = currentTrip?.apple_folder || currentTrip?.title || null;
  const el   = document.getElementById('folderSuggestion');
  if (name) {
    el.style.display = 'block';
    document.getElementById('folderName').textContent = `📁  ${name}`;
  } else {
    el.style.display = 'none';
  }
}

// ── LINKED FLIGHTS ──
async function loadLinkedFlights() {
  const el = document.getElementById('linkedFlights');
  try {
    const snap = await getDocs(collection(db, 'flights'));
    const flights = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(f => f.trip === currentTripId);
    linkedFlightsCache = flights;
    document.getElementById('heroFlights').textContent = flights.length || '—';
    if (!flights.length) {
      el.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;padding:16px 0">No flights tagged to this trip yet. Tag flights in the Dashboard → Flights panel.</div>';
      return;
    }
    el.innerHTML = `
      <div class="linked-table-wrap">
        <table class="linked-table">
          <thead><tr><th>ROUTE</th><th>AIRLINE</th><th>DATE</th><th>AIRCRAFT</th><th>MILES</th></tr></thead>
          <tbody>${flights.map(f => `
            <tr>
              <td><span class="route-badge teal">${f.from||'?'} → ${f.to||'?'}</span><br><span class="muted" style="font-size:10px">${f.from_city||''} → ${f.to_city||''}</span></td>
              <td class="muted">${f.airline||'—'}</td>
              <td class="muted">${f.date||'—'}</td>
              <td class="muted">${f.aircraft_type||'—'}</td>
              <td class="teal">${f.distance_miles ? Math.round(f.distance_miles).toLocaleString()+' mi' : '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch(e) {
    el.innerHTML = '<div style="font-size:11px;color:var(--muted);padding:16px 0">Could not load flights — offline mode.</div>';
  }
}

// ── APPLE INTEGRATION ──
function buildPreTripReminders() {
  const t = currentTrip;
  if (!t?.date_from) return [];
  const dep = new Date(t.date_from);
  const offset = (days) => {
    const d = new Date(dep);
    d.setDate(d.getDate() - days);
    return d;
  };
  return [
    { title: `Start packing for ${t.title}`,           due: offset(7),  desc: 'Review packing list on Trip Planner' },
    { title: `Check visa status — ${t.title}`,          due: offset(14), desc: 'Verify visa is valid for all destinations' },
    { title: `Book travel insurance — ${t.title}`,      due: offset(21), desc: 'Compare plans on InsureMyTrip or World Nomads' },
    { title: `Notify bank of travel — ${t.title}`,      due: offset(3),  desc: 'Call or use app to enable international use' },
    { title: `Enable international phone plan`,          due: offset(2),  desc: 'Add international plan on carrier app' },
    { title: `Download offline maps — ${t.title}`,      due: offset(3),  desc: 'Download Google Maps offline for all destinations' },
    { title: `Charge all devices — ${t.title}`,         due: offset(1),  desc: 'Phone, laptop, power bank, camera' },
    { title: `Confirm all bookings — ${t.title}`,       due: offset(2),  desc: 'Hotels, flights, transfers, activities' },
    { title: `Set phone to airplane mode on departure`, due: dep,        desc: `Depart ${t.date_from}` },
  ];
}

function renderAppleSection() {
  const reminders = buildPreTripReminders();
  const listEl = document.getElementById('reminderPreviewList');
  listEl.innerHTML = '';
  const show = reminders.slice(0, 5);
  show.forEach(r => {
    const el = document.createElement('div');
    el.className = 'reminder-item';
    el.innerHTML = `<span class="reminder-item-title">${esc(r.title)}</span><span class="reminder-item-date">${r.due ? r.due.toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}</span>`;
    listEl.appendChild(el);
  });
  if (reminders.length > 5) {
    const more = document.createElement('div');
    more.style.cssText = 'font-size:10px;color:var(--muted);padding:4px 0 0;text-align:center';
    more.textContent = `+ ${reminders.length - 5} more reminders in the .ics download`;
    listEl.appendChild(more);
  }

  // Notes preview
  document.getElementById('notesPreview').textContent = buildNotesTemplate();
}

window.downloadRemindersICS = function() {
  const reminders = buildPreTripReminders();
  if (!reminders.length) { toast('Set trip dates first', 'err'); return; }
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//Anuraag Trip Planner//EN', 'METHOD:PUBLISH',
  ];
  reminders.forEach((r, i) => {
    const dts = icsDate(r.due);
    lines.push(
      'BEGIN:VTODO',
      `UID:trip-reminder-${i}-${currentTripId}@nomad`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DUE:${dts}`,
      `SUMMARY:${r.title}`,
      `DESCRIPTION:${r.desc || ''}`,
      'STATUS:NEEDS-ACTION',
      'BEGIN:VALARM', 'TRIGGER:-PT0S', 'ACTION:DISPLAY',
      `DESCRIPTION:${r.title}`,
      'END:VALARM',
      'END:VTODO',
    );
  });
  lines.push('END:VCALENDAR');
  downloadFile(`reminders-${slugify(currentTrip?.title)}.ics`, 'text/calendar', lines.join('\r\n'));
  toast('Reminders .ics downloaded — open on iPhone or Mac to add to Reminders');
};

window.downloadCalendarICS = function() {
  const t = currentTrip;
  if (!t?.date_from) { toast('Set trip dates first', 'err'); return; }
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//Anuraag Trip Planner//EN', 'METHOD:PUBLISH',
  ];
  // Departure event
  const depFlights = linkedFlightsCache.filter(f => f.date === t.date_from);
  const depFlight  = depFlights[0];
  lines.push(
    'BEGIN:VEVENT',
    `UID:depart-${currentTripId}@nomad`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART;VALUE=DATE:${t.date_from?.replace(/-/g,'')}`,
    `DTEND;VALUE=DATE:${t.date_from?.replace(/-/g,'')}`,
    `SUMMARY:✈ Depart — ${t.title}`,
    `DESCRIPTION:${depFlight ? `Flight: ${depFlight.flight_number||''} ${depFlight.from}→${depFlight.to}` : `Trip: ${t.title}`}`,
    `LOCATION:${depFlight ? (depFlight.from_city || depFlight.from || '') + ' Airport' : ''}`,
    'BEGIN:VALARM', 'TRIGGER:-PT3H', 'ACTION:DISPLAY',
    'DESCRIPTION:3 hours until departure — leave for airport',
    'END:VALARM',
    'END:VEVENT',
  );
  // Return event
  if (t.date_to) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:return-${currentTripId}@nomad`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART;VALUE=DATE:${t.date_to?.replace(/-/g,'')}`,
      `DTEND;VALUE=DATE:${t.date_to?.replace(/-/g,'')}`,
      `SUMMARY:🏠 Return — ${t.title}`,
      `DESCRIPTION:Return from ${t.title}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  downloadFile(`calendar-${slugify(currentTrip?.title)}.ics`, 'text/calendar', lines.join('\r\n'));
  toast('Calendar events .ics downloaded');
};

window.downloadAllICS = function() {
  downloadRemindersICS();
};

window.downloadPackingICS = function() {
  const t = currentTrip;
  const depDate = t?.date_from ? new Date(t.date_from) : null;
  if (!depDate) { toast('Set a departure date to export packing reminder', 'err'); return; }
  const packDue = new Date(depDate);
  packDue.setDate(packDue.getDate() - 2);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Anuraag Trip Planner//EN',
    'BEGIN:VTODO',
    `UID:packing-${currentTripId}@nomad`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DUE:${icsDate(packDue)}`,
    `SUMMARY:Pack bags for ${t.title}`,
    `DESCRIPTION:${getPackingData().map(i => (i.checked ? '[x]' : '[ ]') + ' ' + i.item).join('\\n')}`,
    'STATUS:NEEDS-ACTION',
    'BEGIN:VALARM', 'TRIGGER:-PT0S', 'ACTION:DISPLAY', 'DESCRIPTION:Pack bags!', 'END:VALARM',
    'END:VTODO',
    'END:VCALENDAR',
  ];
  downloadFile(`packing-${slugify(t.title)}.ics`, 'text/calendar', lines.join('\r\n'));
  toast('Packing reminder .ics downloaded');
};

// Apple URL schemes
window.openAppleReminders = function() {
  window.location.href = 'x-apple-reminderkit://';
};
window.openAppleCalendar = function() {
  window.location.href = 'calshow://';
};
window.openAppleNotes = function() {
  window.location.href = 'mobilenotes://';
};

function buildShortcutInputText() {
  const t = currentTrip;
  const reminders = buildPreTripReminders();
  const lines = [
    `TRIP: ${t?.title || ''}`,
    `DATES: ${t?.date_from || '—'} to ${t?.date_to || '—'}`,
    '',
    'REMINDERS:',
    ...reminders.map(r => `- ${r.title} [${r.due ? r.due.toISOString().slice(0,10) : ''}]`),
    '',
    'PACKING:',
    ...getPackingData().filter(i => !i.checked).map(i => `- ${i.category}: ${i.item}`),
  ];
  return lines.join('\n');
}

window.runShortcut = function() {
  const input = encodeURIComponent(buildShortcutInputText());
  window.location.href = `shortcuts://x-callback-url/run-shortcut?name=Trip%20Planner&input=${input}`;
};

window.copyShortcutInput = function() {
  copyToClipboard(buildShortcutInputText());
  toast('Shortcut input text copied — paste into your Trip Planner shortcut');
};

function buildNotesTemplate() {
  const t = currentTrip;
  if (!t) return '';
  const lines = [
    `📍 ${(t.title || '').toUpperCase()}`,
    `📅 ${t.date_from || '—'} → ${t.date_to || '—'}`,
    `💰 Expenses: ${t.simplifi_report_url ? 'Simplifi report saved' : 'Not configured'}`,
    '',
    '── PACKING ──',
  ];
  PACK_CATS.forEach(cat => {
    const items = getPackingData().filter(i => i.category === cat);
    if (!items.length) return;
    lines.push(`\n${cat}:`);
    items.forEach(i => lines.push(`  ${i.checked ? '☑' : '☐'} ${i.item}`));
  });
  const booked = getBookedFlights();
  if (booked.length) {
    lines.push('\n── BOOKED FLIGHTS ──');
    booked.forEach(f => lines.push(`${f.flight_num||'?'} ${f.origin}→${f.dest} | ${f.dep_date||'?'} ${f.dep_time||''} | REF: ${f.booking_ref||'?'}`));
  }
  if (getLinks().length) {
    lines.push('\n── LINKS ──');
    getLinks().forEach(l => lines.push(`${(l.type||'').toUpperCase()}: ${l.label}\n  ${l.url}`));
  }
  lines.push(`\n── NOTES ──\n${t.notes || ''}`);
  return lines.join('\n');
}

window.copyNotesTemplate = function() {
  copyToClipboard(buildNotesTemplate());
  toast('Trip note copied — paste into Apple Notes');
};

// ── NEW TRIP FORM ──
window.toggleNewTripForm = function() {
  const c = document.getElementById('newTripCard');
  const show = c.style.display === 'none';
  c.style.display = show ? 'block' : 'none';
  if (show) c.scrollIntoView({ behavior: 'smooth' });
};

window.createTrip = async function() {
  const title    = document.getElementById('nt-title').value.trim();
  const dateFrom = document.getElementById('nt-from').value;
  const dateTo   = document.getElementById('nt-to').value;
  const status   = document.getElementById('nt-status').value;
  const origin   = document.getElementById('nt-origin').value.toUpperCase().trim();
  const dest     = document.getElementById('nt-dest').value.toUpperCase().trim();
  const folder   = document.getElementById('nt-folder').value.trim();
  const budget   = parseFloat(document.getElementById('nt-budget').value) || 0;
  const currency = document.getElementById('nt-currency').value;
  const program  = document.getElementById('nt-points').value;
  const themeRaw = document.getElementById('nt-theme')?.value;
  const theme    = themeRaw || THEMES[Math.floor(Math.random() * THEMES.length)];
  if (!title) { toast('Enter a trip name', 'err'); return; }
  try {
    syncDot.className = 'sync-dot syncing';
    const ref = await addDoc(collection(db, 'trips'), {
      title, date_from: dateFrom, date_to: dateTo, status,
      origin, destination: dest, apple_folder: folder || title,
      budget_total: budget, budget_currency: currency,
      point_me_program: program, theme,
      packing: [], links: [], booked_flights: [],
      created_at: serverTimestamp(),
    });
    syncDot.className = 'sync-dot';
    toast('Trip created!');
    document.getElementById('newTripCard').style.display = 'none';
    await loadTripsIntoSelector();
    document.getElementById('tripSelector').value = ref.id;
    await loadTrip(ref.id);
  } catch(e) {
    syncDot.className = 'sync-dot offline';
    toast('Save failed — offline?', 'err');
  }
};

// ── SAVE TRIP DATA ──
async function saveTrip(fields) {
  if (!currentTripId) return;
  try {
    syncDot.className = 'sync-dot syncing';
    await updateDoc(doc(db, 'trips', currentTripId), { ...fields, updated_at: serverTimestamp() });
    syncDot.className = 'sync-dot';
  } catch(e) {
    syncDot.className = 'sync-dot offline';
    // Firebase offline persistence queues the write — no action needed
  }
}

// ── HELPERS ──
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function fmtMoney(n) {
  if (!n && n !== 0) return '0';
  return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:0 });
}

function icsDate(d) {
  if (!d) return '';
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function slugify(s) {
  return (s || 'trip').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

function downloadFile(name, mime, content) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

window.toast = function(msg, type = 'ok') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show ' + type;
  setTimeout(() => t.className = '', 3200);
};
