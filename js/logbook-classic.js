// The logbook's classic view: buildFlights / buildFleet / buildAirports copied verbatim
// from js/nomad.js, so these sections look and behave exactly as they do on the old page.
import { loadAll } from './late-sun-data.js';

let flightsData = [];

function buildFlights() {
  const totalMiles = flightsData.reduce((s,f) => s+(f.distance_miles||0),0);
  const airlines   = [...new Set(flightsData.map(f=>f.airline).filter(Boolean))];
  const airports   = [...new Set([...flightsData.map(f=>f.from),...flightsData.map(f=>f.to)].filter(Boolean))];
  const topAirline = airlines.reduce((best,a) => {
    const cnt = flightsData.filter(f=>f.airline===a).length;
    return cnt>(best.count||0)?{name:a,count:cnt}:best;
  },{});

  const statsEl = document.getElementById('flightStats');
  if(statsEl) [
    {num:flightsData.length,label:'TOTAL FLIGHTS'},
    {num:Math.round(totalMiles).toLocaleString()+' MI',label:'TOTAL MILES'},
    {num:Math.round(totalMiles*1.60934).toLocaleString()+' KM',label:'TOTAL KM'},
    {num:airlines.length,label:'AIRLINES'},
    {num:airports.length,label:'AIRPORTS'},
    {num:topAirline.name||'—',label:'MOST FLOWN'}
  ].forEach(b => {
    const el = document.createElement('div');
    el.className = 'fs-block';
    el.innerHTML = `<div class="fs-num">${b.num}</div><div class="fs-label">${b.label}</div>`;
    statsEl.appendChild(el);
  });

  buildFleet();

  const grid = document.getElementById('boardingGrid');
  if(!grid) return;
  const INITIAL_BP = 4;
  flightsData.forEach((f,idx) => {
    const card = document.createElement('div');
    card.className = 'bp-card';
    if(idx >= INITIAL_BP) { card.classList.add('bp-hidden'); card.style.display='none'; }
    const miles = f.distance_miles ? Math.round(f.distance_miles).toLocaleString() : '—';
    const km    = f.distance_miles ? Math.round(f.distance_miles*1.60934).toLocaleString() : '—';
    card.innerHTML = `<div class="bp-bar"></div><div class="bp-face"><div class="bp-header"><div class="bp-flight-no">${f.flight_number||'—'}</div><div class="bp-date-badge">${f.date||'—'}</div></div><div class="bp-route-row"><div><div class="bp-iata-big">${f.from||'???'}</div><div class="bp-city-name">${f.from_city||''}</div></div><div class="bp-route-mid"><div class="bp-route-plane">✈</div><div class="bp-route-line"></div></div><div><div class="bp-iata-big" style="text-align:right">${f.to||'???'}</div><div class="bp-city-name" style="text-align:right">${f.to_city||''}</div></div></div><div class="bp-meta-strip"><div class="bp-meta-cell"><span class="bp-meta-label">CARRIER</span><span class="bp-meta-val">${f.airline||'—'}</span></div><div class="bp-meta-cell"><span class="bp-meta-label">TIME</span><span class="bp-meta-val">${f.time||'—'}</span></div><div class="bp-meta-cell"><span class="bp-meta-label">MILES</span><span class="bp-meta-val teal">${miles}</span></div></div></div><hr class="bp-perf"><div class="bp-toggle">FLIGHT DETAILS <span class="bp-toggle-arrow">▾</span></div><div class="bp-detail"><div class="bp-detail-inner"><div class="bp-detail-title">// FULL FLIGHT DATA</div><div class="bp-detail-grid"><div class="bp-detail-item"><span class="bp-detail-label">AIRCRAFT TYPE</span><span class="bp-detail-value">${f.aircraft_type||'—'}</span></div><div class="bp-detail-item"><span class="bp-detail-label">TAIL NUMBER</span><span class="bp-detail-value mono">${f.tail_number||'—'}</span></div><div class="bp-detail-item"><span class="bp-detail-label">DURATION</span><span class="bp-detail-value">${f.duration_mins?Math.floor(f.duration_mins/60)+'h '+f.duration_mins%60+'m':'—'}</span></div><div class="bp-detail-item"><span class="bp-detail-label">DISTANCE</span><span class="bp-detail-value">${miles} mi · ${km} km</span></div></div><div class="bp-route-mini"><div class="bp-route-mini-dot"></div><div class="bp-route-mini-line"></div><span>${f.from||'?'} → ${f.to||'?'}</span><div class="bp-route-mini-line"></div><div class="bp-route-mini-dot"></div></div>${f.notes?`<div class="bp-notes">"${f.notes}"</div>`:''}</div></div>`;
    card.addEventListener('click', () => card.classList.toggle('open'));
    grid.appendChild(card);
  });

  if(flightsData.length > INITIAL_BP) {
    const wrap = document.getElementById('bpMoreWrap');
    if(wrap) wrap.style.display = 'block';
    const lbl = document.getElementById('bpMoreLabel');
    if(lbl) lbl.textContent = `+ ${flightsData.length-INITIAL_BP} MORE BOARDING PASSES`;
  }

  const tbody = document.getElementById('flightLog');
  if(!tbody) return;
  flightsData.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="route">${f.from||'?'} → ${f.to||'?'}<br><span style="font-size:10px;color:var(--muted)">${f.from_city||''} → ${f.to_city||''}</span></td><td class="airline">${f.airline||'—'}</td><td class="date">${f.date||'—'}</td><td class="aircraft">${f.aircraft_type||'—'}</td><td class="miles">${f.distance_miles?Math.round(f.distance_miles).toLocaleString():'—'}</td>`;
    tbody.appendChild(tr);
  });
}

let bpExpanded = false;
window.expandBoardingPasses = function() {
  bpExpanded = !bpExpanded;
  document.querySelectorAll('.bp-hidden').forEach(el => { el.style.display = bpExpanded ? '' : 'none'; });
  const lbl = document.getElementById('bpMoreLabel');
  const arrow = document.getElementById('bpPeekArrow');
  const peek = document.getElementById('bpStackPeek');
  if(lbl) lbl.textContent = bpExpanded ? '▴  SHOW LESS' : `+ ${flightsData.length-4} MORE BOARDING PASSES`;
  if(arrow) arrow.classList.toggle('open', bpExpanded);
  if(peek) { peek.style.opacity = bpExpanded ? '0' : '1'; peek.style.pointerEvents = bpExpanded ? 'none' : 'auto'; }
};

let logExpanded = false;
window.toggleFlightLog = function() {
  logExpanded = !logExpanded;
  const wrap = document.getElementById('flightLogWrap');
  const arrow = document.getElementById('logArrow');
  if(wrap) wrap.style.display = logExpanded ? 'block' : 'none';
  if(arrow) arrow.classList.toggle('open', logExpanded);
};

// ── AIRCRAFT FLEET ──
// ── AIRCRAFT BLUEPRINT IMAGE MAPPING ──
// Maps normalised model key → Firebase Storage filename in /flights/ folder
// Filenames match the uploaded blueprints exactly
// ── FLEET BLUEPRINTS ──
// Naming convention: EVERY space → underscore, hyphens kept → Boeing_737-800
// (matches the aircraft_type string FR24's enrichFlight returns, verbatim,
// with .replace(/\s+/g,'_') applied — see getBlueprintUrl below).
// "Boeing 737 MAX 8" → Boeing_737_MAX_8.png, NOT "Boeing_737 MAX 8.png".
// Files live in Firebase Storage /flights/ folder — when uploading a new
// blueprint, run the model name through the same replace before naming the file.
const STORAGE_BASE   = 'https://firebasestorage.googleapis.com/v0/b/nomad-404.firebasestorage.app/o/flights%2F';
const STORAGE_SUFFIX = '?alt=media';

// Derive Storage filename from model name using the convention
// e.g. "Boeing 737-800" → "Boeing_737-800.png"
function getBlueprintUrl(modelName) {
  const filename = modelName.trim().replace(/\s+/g, '_') + '.png';
  return STORAGE_BASE + encodeURIComponent(filename) + STORAGE_SUFFIX;
}

// CDN fallbacks — used only when a model has no blueprint uploaded yet
// (checked via the <img onerror> handler in renderFleetCard)
const CDN_FALLBACKS = {
  '777':     'https://images.unsplash.com/photo-1587019158091-1a103c5dd17f?w=900&q=80&fit=crop',
  '787':     'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80&fit=crop',
  'a380':    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=900&q=80&fit=crop',
  'a350':    'https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=900&q=80&fit=crop',
  'a330':    'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=900&q=80&fit=crop',
  'a320':    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&q=80&fit=crop',
  '737':     'https://images.unsplash.com/photo-1540974695-0b6a73c7e3a4?w=900&q=80&fit=crop',
  '747':     'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=900&q=80&fit=crop',
  'atr':     'https://images.unsplash.com/photo-1572979926960-c5b685fc1fc7?w=900&q=80&fit=crop',
  'default': 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&q=80&fit=crop',
};

// Always try the storage blueprint first, for every manufacturer —
// the <img onerror> handler in renderFleetCard falls back to CDN_FALLBACKS
// if that specific model has no blueprint uploaded yet.
function getFleetImageSrc(modelName) {
  return getBlueprintUrl(modelName);
}

// Per-model nicknames and stories
const AIRCRAFT_META = {
  'Boeing 737-900':   {nickname:'Triple Nine',      story:`The stretched workhorse of the 737NG family — 189 seats and quiet reliability.`},
  'Boeing 737 MAX 8': {nickname:'MAX 8',            story:`LEAP engines, advanced winglets, 20% better fuel burn. The 737 bloodline reimagined.`},
  'Boeing 737 MAX 9': {nickname:'MAX 9',            story:`7 metres longer than the MAX 8, same revolution under the wings.`},
  'Boeing 737-700':   {nickname:'Seven-Three-Seven',story:`The compact sibling. Gets into airports other 737s hesitate at.`},
  'Boeing 737-800':   {nickname:'The Bus',          story:`The overhead bin is too small. It has taken me to more places than any other aircraft.`},
  'Boeing 747-8':     {nickname:'Queen of Skies',   story:`Raked wingtips. GEnx engines. The last of the 747 line — still the most majestic thing in the sky.`},
  'Boeing 747-400':   {nickname:'Jumbo Classic',    story:`Four engines. Two decks on the nose. The aircraft that made mass international travel real.`},
  'Boeing 757-300':   {nickname:'The Pencil',       story:`Narrow body, massive range — punches well above its weight class.`},
  'Boeing 767-300ER': {nickname:'The Warhorse',     story:`First flew 1981. Twin-engine transoceanic flight made commercially viable. Old school in the best sense.`},
  'Boeing 777-9':     {nickname:'Nine',             story:`Folding wingtips. The largest twin-engine airliner ever built.`},
  'Boeing 777-200ER': {nickname:'Triple Seven ER',  story:`The aircraft that opened ultra-long-haul routes to twin jets.`},
  'Boeing 777-300ER': {nickname:'Triple Seven',     story:`The backbone of ultra-long-haul. 13,000 km non-stop without breaking a sweat.`},
  'Boeing 787-8':     {nickname:'Dreamliner',       story:`Electronically dimmable windows. Higher cabin pressure. You land feeling genuinely rested.`},
  'Boeing 787-9':     {nickname:'Dreamliner',       story:`The sweet spot of the Dreamliner family — stretched 6 metres, more range.`},
  'Boeing 787-10':    {nickname:'Stretched Dream',  story:`The longest Dreamliner. 330 passengers, 11,000 km range. Composite airframe nose to tail.`},
  'Airbus A380':      {nickname:'The Superjumbo',   story:`Double-deck, four engines. You don't board it — you enter it.`},
  'Airbus A350':      {nickname:'Xtra Wide Body',   story:`53% composite materials. You land after 14 hours feeling genuinely rested.`},
  'Airbus A350-900':  {nickname:'Xtra Wide Body',   story:`Carbon-fibre from nose to tail. The base variant of Airbus's masterpiece.`},
  'Airbus A350-1000': {nickname:'Xtra Wide Body XL',story:`The stretched, longer-range sibling of the A350-900.`},
  'Airbus A330':      {nickname:'Medium Hauler',    story:`An analogue warmth the newer jets lack. Two engines, wide body, 13,000 km range.`},
  'Airbus A330-200':  {nickname:'Medium Hauler',    story:`The shorter-body A330, tuned for range over capacity.`},
  'Airbus A330-300':  {nickname:'Medium Hauler',    story:`The original A330 — a widebody workhorse on medium-haul routes.`},
  'Airbus A330neo':   {nickname:'Medium Hauler NEO',story:`New engines, new wingtips, same trusted A330 airframe.`},
  'Airbus A340-300':  {nickname:'Four-Holer',       story:`Four engines, long range — built for routes where diversion airports are scarce.`},
  'Airbus A340-400':  {nickname:'Four-Holer',       story:`Stretched A340 variant. Rare now — most of the fleet has been retired.`},
  'Airbus A340-600':  {nickname:'Four-Holer XL',    story:`The longest airliner of its era. Four engines, unmistakable silhouette.`},
  'Airbus A320':      {nickname:'The Narrowbody',   story:`Introduced fly-by-wire sidestick controls to commercial aviation.`},
  'Airbus A320neo':   {nickname:'New Engine Option',story:`20% better fuel burn. Sharklet wingtips. Flying IndiGo, this is your aircraft.`},
  'Airbus A321':      {nickname:'The Stretch',      story:`The longest of the A320 family, more seats on the same narrowbody DNA.`},
  'Airbus A321neo':   {nickname:'The Stretch NEO',  story:`New-engine A321 — the backbone of modern narrowbody long-haul.`},
  'Airbus A319':      {nickname:'The Shortbody',    story:`The compact sibling in the A320 family, built for shorter routes.`},
  'Airbus A318':      {nickname:'The Baby Bus',     story:`The smallest of the A320 family — rare, and increasingly hard to find.`},
  'Airbus A220-100':  {nickname:'C Series',         story:`Started life as the Bombardier CSeries. A clean-sheet narrowbody, all curves.`},
  'Airbus A220-300':  {nickname:'C Series',         story:`The stretched A220, quietly replacing older regional jets worldwide.`},
  'Boeing 737':       {nickname:'The Bus',          story:`First flew 1967. Most produced commercial aircraft in history. It goes everywhere.`},
  'Boeing 767-200ER': {nickname:'The Warhorse',     story:`The original 767 — shorter body, still flying transoceanic routes decades on.`},
  'Boeing 767-400ER': {nickname:'The Warhorse XL',  story:`The stretched, longest-range member of the 767 family.`},
  'Boeing 777-8':     {nickname:'Eight',            story:`The smaller sibling of the 777X family — folding wingtips, ultra-long range.`},
  'ATR 72':           {nickname:'The Turboprop',    story:`Two turboprop engines. Goes to airports jets cannot. The most honest flying there is.`},
  'ATR 42':           {nickname:'The Small Turboprop', story:`The compact ATR — regional flying at its most honest.`},
  'Embraer 170':      {nickname:'The Regional',     story:`The original E-Jet — brought jet comfort to routes turboprops used to own.`},
  'Embraer 175':      {nickname:'The Regional',     story:`The most common E-Jet in the sky — a regional-jet mainstay for airlines worldwide.`},
  'Embraer 190':      {nickname:'The Bigger Regional', story:`Stretched E-Jet, blurring the line between regional and mainline.`},
  'Embraer 195':      {nickname:'The Bigger Regional', story:`The largest of the original E-Jet family.`},
  'Embraer E175-E2':  {nickname:'E-Jet E2',         story:`New engines, new wing — the second-generation E-Jet.`},
  'Embraer E190-E2':  {nickname:'E-Jet E2',         story:`Quieter, more efficient successor to the E190.`},
  'Embraer E195-E2':  {nickname:'E-Jet E2',         story:`The largest E-Jet E2 — encroaching on narrowbody mainline territory.`},
  'Bombardier CRJ700': {nickname:'The Regional Jet', story:`Compact, twin-engine, built for thinner regional routes.`},
  'Bombardier CRJ900': {nickname:'The Regional Jet', story:`The stretched CRJ — a regional-jet staple across North America.`},
  'Bombardier CRJ1000':{nickname:'The Regional Jet', story:`The largest CRJ — pushing regional-jet capacity to its limit.`},
  'Bombardier Dash 8 Q200': {nickname:'The Dash',    story:`Compact turboprop, built for short regional hops.`},
  'Bombardier Dash 8 Q300': {nickname:'The Dash',    story:`Stretched Dash 8 — more seats, same twin-turboprop reliability.`},
  'Bombardier Dash 8 Q400': {nickname:'The Dash',    story:`The largest Dash 8 — fast for a turboprop, built for short-runway airports.`},
};

// Known Firestore data-entry variants that don't fuzzy-match their canonical
// AIRCRAFT_META key on their own (typos, alternate naming) — map them here
// instead of touching historical flight records.
const AIRCRAFT_ALIASES = {
  'Embraer ERJ-175': 'Embraer 175',
  'Airbus 350-900':  'Airbus A350-900',
};

// Normalise aircraft_type from Firestore to a known model key
function normaliseAircraft(type) {
  if(!type) return null;
  const t = type.trim();
  if(AIRCRAFT_ALIASES[t]) return AIRCRAFT_ALIASES[t];
  if(AIRCRAFT_META[t]) return t;
  for(const key of Object.keys(AIRCRAFT_META)) {
    if(t.startsWith(key) || key.startsWith(t)) return key;
    const ts = t.replace(/[-\s]/g,'').toUpperCase();
    const ks = key.replace(/[-\s]/g,'').toUpperCase();
    if(ts.includes(ks) || ks.includes(ts)) return key;
  }
  // Return raw type as fallback so unknown aircraft still show
  return t;
}

const FLEET_VISIBLE = 8; // 2 rows × 4 columns
let fleetExpanded = false;

function buildFleet() {
  const grid       = document.getElementById('fleetGrid');
  const gridExtra  = document.getElementById('fleetGridExtra');
  const expandWrap = document.getElementById('fleetExpandWrap');
  const gridWrap   = document.getElementById('fleetGridWrap');
  if(!grid) return;

  // Count aircraft types from Firestore flightsData
  const counts = {};
  flightsData.forEach(f => {
    // Prefer the full descriptive name (e.g. "Boeing 737-800") over aircraft_type,
    // which for AeroDataBox-enriched flights is often a short IATA/ICAO code (e.g. "738")
    // that the schema matcher below can't resolve to a blueprint.
    const raw = f.aircraft_name || f.aircraft_type;
    if(!raw) return;
    const key = normaliseAircraft(raw);
    if(key) counts[key] = (counts[key]||0)+1;
  });

  // Sort by count descending
  let ranked = Object.entries(counts).sort((a,b) => b[1]-a[1]);

  // If Firestore has no data yet, show the uploaded blueprints as placeholders
  if(!ranked.length) {
    ranked = [
      'Boeing 737-800','Boeing 777-300ER','Boeing 787-9','Boeing 787-8',
      'Boeing 777-200ER','Boeing 747-400','Boeing 767-300ER','Boeing 737-700',
      'Boeing 737 MAX 8','Boeing 737 MAX 9','Boeing 787-10','Boeing 747-8',
      'Boeing 737-900','Boeing 757-300','Boeing 777-9'
    ].map(k => [k, 0]);
  }

  // Render first 8 into main visible grid
  ranked.slice(0, FLEET_VISIBLE).forEach(([key, count]) => {
    renderFleetCard(grid, key, count);
  });

  // Render extras into hidden grid
  const extra = ranked.slice(FLEET_VISIBLE);
  if(extra.length > 0) {
    extra.forEach(([key, count]) => renderFleetCard(gridExtra, key, count));
    if(expandWrap) {
      expandWrap.style.display = 'flex';
      const countEl = document.getElementById('fleetExpandCount');
      if(countEl) countEl.textContent = `+${extra.length}`;
    }
  }
}

function renderFleetCard(container, modelKey, count) {
  const meta = AIRCRAFT_META[modelKey] || { nickname: modelKey, story: '' };
  const imgSrc = getFleetImageSrc(modelKey);
  // Short display name
  const displayName = modelKey.replace('Boeing ','').replace('Airbus ','').replace('ATR ','ATR ');

  const card = document.createElement('div');
  card.className = 'fleet-card';
  card.innerHTML = `
    <div class="fleet-blueprint-grid"></div>
    <img class="fleet-blueprint-img"
         src="${imgSrc}"
         alt="${modelKey} blueprint"
         loading="lazy"
         onerror="this.src='${CDN_FALLBACKS[Object.keys(CDN_FALLBACKS).find(k=>modelKey.toLowerCase().includes(k))||'default']}'">
    <div class="fleet-info">
      <div class="fleet-model-name">${displayName}</div>
      <div class="fleet-nickname">"${meta.nickname}"</div>
      <div class="fleet-meta-row">
        ${count > 0 ? `<div class="fleet-count">${count} FLIGHT${count!==1?'S':''}</div>` : '<div></div>'}
        ${meta.story ? `<button class="fleet-story-toggle" onclick="this.closest('.fleet-card').classList.toggle('story-open')">INFO ▸</button>` : ''}
      </div>
      <div class="fleet-story">${meta.story}</div>
    </div>`;
  container.appendChild(card);
}

window.toggleFleetExpand = function() {
  fleetExpanded = !fleetExpanded;
  const hidden    = document.getElementById('fleetGridHidden');
  const gridWrap  = document.getElementById('fleetGridWrap');
  const label     = document.getElementById('fleetExpandLabel');
  const countEl   = document.getElementById('fleetExpandCount');
  const planeIcon = document.getElementById('fleetPlaneIcon');
  const extra     = document.getElementById('fleetGridExtra');

  if(hidden)   hidden.classList.toggle('open', fleetExpanded);
  if(gridWrap) gridWrap.classList.toggle('expanded', fleetExpanded);
  if(label)    label.textContent = fleetExpanded ? 'SHOW LESS' : 'MORE AIRCRAFT';
  if(countEl)  countEl.textContent = fleetExpanded ? '' : `+${extra?.children.length||0}`;

  if(planeIcon) {
    planeIcon.classList.remove('flying','landing');
    void planeIcon.offsetWidth;
    planeIcon.classList.add(fleetExpanded ? 'flying' : 'landing');
  }
};

// ── AIRPORTS from flight data ──
const AIRPORT_META = {
  DXB:{name:'Dubai International',city:'Dubai',country:'UAE',story:`Terminal 3 at 2am — the whole world is passing through.`},
  HND:{name:'Haneda Airport',city:'Tokyo',country:'Japan',story:`Clean enough to eat off the floor. Tokyo starts the moment you land.`},
  SIN:{name:'Changi Airport',city:'Singapore',country:'Singapore',story:`Changi has a waterfall. A seven-story indoor waterfall. I've seen it four times.`},
  DEL:{name:'Indira Gandhi Intl',city:'New Delhi',country:'India',story:`Terminal 3 is the airport I grew up through. Every time I land here I remember being seventeen.`},
  LHR:{name:'London Heathrow',city:'London',country:'UK',story:`Terminal 5 at dawn, coffee in hand, there's a quiet dignity to it.`},
  JFK:{name:'JFK International',city:'New York',country:'USA',story:`JFK is barely functional and somehow still iconic.`},
  CDG:{name:'Charles de Gaulle',city:'Paris',country:'France',story:`CDG at 6am. The smell of coffee and croissants drifts past baggage claim.`},
  GRU:{name:'Guarulhos Intl',city:'São Paulo',country:'Brazil',story:`The gateway to South America. I've arrived here more disoriented than anywhere else — and left more alive.`},
  DOH:{name:'Hamad International',city:'Doha',country:'Qatar',story:`The world's best airport. The lamp bear. The indoor gardens.`},
  IAH:{name:'Bush Intercontinental',city:'Houston',country:'USA',story:`Houston's gateway. The international terminal at night when everything is quiet.`},
  AUH:{name:'Zayed International',city:'Abu Dhabi',country:'UAE',story:`The quieter, more composed sibling of DXB. The architecture alone is worth the connection.`},
};

function buildAirports() {
  const visGrid = document.getElementById('airportGridVisible');
  const hidGrid = document.getElementById('airportGridHidden');
  if(!visGrid || !hidGrid) return;

  // Count visits from flight data
  const visitCounts = {};
  const cityMap = {};
  flightsData.forEach(f => {
    if(f.from) {
      visitCounts[f.from] = (visitCounts[f.from]||0)+1;
      if(f.from_city && !cityMap[f.from]) cityMap[f.from] = f.from_city;
    }
    if(f.to) {
      visitCounts[f.to] = (visitCounts[f.to]||0)+1;
      if(f.to_city && !cityMap[f.to]) cityMap[f.to] = f.to_city;
    }
  });

  if(!Object.keys(visitCounts).length) return;

  const airports = Object.entries(visitCounts).sort((a,b) => b[1]-a[1]);

  airports.forEach(([code,visits],i) => {
    const meta = AIRPORT_META[code];
    const card = document.createElement('div');
    card.className = 'airport-stamp-card';
    const cityLine = meta
      ? `${meta.name}<br>${meta.city}, ${meta.country}`
      : (cityMap[code] || code);
    card.innerHTML = `<div class="asc-inkmark">✈</div><div class="asc-code">${code}</div><div class="asc-name">${cityLine}</div><div class="asc-visits">${visits} visit${visits!==1?'s':''}</div>`;
    if(meta) card.title = meta.story;
    if(i < 8) visGrid.appendChild(card);
    else hidGrid.appendChild(card);
  });
}

window.togglePassport = function() {
  const wrap = document.getElementById('passportFoldWrap');
  const lbl  = document.getElementById('foldLabel');
  const arrow = document.getElementById('foldArrow');
  if(!wrap) return;
  const isExpanded = wrap.classList.toggle('expanded');
  if(lbl) lbl.textContent = isExpanded ? 'FOLD PASSPORT' : 'UNFOLD PASSPORT';
  if(arrow) arrow.classList.toggle('open', isExpanded);
};

(async () => {
  flightsData = [...(await loadAll()).flights].sort((a, b) => (b.date || '').localeCompare(a.date || ''));   // newest boarding passes first
  buildFlights();
  buildAirports();
})();
