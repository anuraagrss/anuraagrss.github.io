
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, updateDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const app = initializeApp({
  apiKey:"AIzaSyCESqunM9b_Yc-5Dj0qJJFxGALmEGm0Rd0",
  authDomain:"nomad-404.firebaseapp.com",
  projectId:"nomad-404",
  appId:"1:638331724572:web:baa0d70108e920099150d9"
});
const db   = getFirestore(app);
const auth = getAuth(app);

const sleep     = ms => new Promise(r => setTimeout(r, ms));
const kmToMiles = km => Math.round(Number(km) * 0.621371);
let running = false;
let stats   = { enriched:0, skipped:0, failed:0, total:0 };

function log(msg, type='default') {
  const wrap = document.getElementById('logWrap');
  const now  = new Date().toTimeString().slice(0,8);
  const line = document.createElement('div');
  line.className = `log-line log-${type}`;
  line.innerHTML = `<span class="log-time">${now}</span><span class="log-msg">${msg}</span>`;
  wrap.appendChild(line);
  wrap.scrollTop = wrap.scrollHeight;
}

function updateProgress(processed, total, label) {
  const pct = total > 0 ? Math.round((processed/total)*100) : 0;
  document.getElementById('progressBar').style.width     = pct+'%';
  document.getElementById('progressCounter').textContent = `${processed} / ${total}`;
  document.getElementById('progressLabel').textContent   = label || `Enriching… ${pct}%`;
  document.getElementById('cntEnriched').textContent = stats.enriched;
  document.getElementById('cntSkipped').textContent  = stats.skipped;
  document.getElementById('cntFailed').textContent   = stats.failed;
}

// ── AeroDataBox ───────────────────────────────────────────────────
async function fetchAeroDataBox(flightNumber, date, apiKey) {
  const fn      = flightNumber.replace(/\s+/g,'').toUpperCase();
  const dateStr = date.split('T')[0];
  const url     = `https://aerodatabox.p.api.market/flights/number/${encodeURIComponent(fn)}/${dateStr}`;
  const res     = await fetch(url, { headers:{ 'x-magicapi-key': apiKey, 'Accept':'application/json' } });
  if (res.status === 404) return null;
  if (res.status === 429) { await sleep(3000); return fetchAeroDataBox(flightNumber, date, apiKey); }
  if (!res.ok) throw new Error(`ADB ${res.status}: ${(await res.text()).slice(0,100)}`);
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

function parseAeroDataBox(item) {
  if (!item) return {};
  const u = {};
  // Aircraft
  if (item.aircraft?.reg)         u.tail_number   = item.aircraft.reg;
  if (item.aircraft?.model?.code) u.aircraft_type = item.aircraft.model.code;
  if (item.aircraft?.model?.text) u.aircraft_name = item.aircraft.model.text;
  if (item.aircraft?.hex)         u._icao24       = item.aircraft.hex.toLowerCase();
  // Airline
  if (item.airline?.iata||item.airline?.name) u.airline = item.airline.iata||item.airline.name;
  // Departure
  if (item.departure?.airport?.iata)      u.from          = item.departure.airport.iata;
  if (item.departure?.airport?.name)      u.from_city     = item.departure.airport.name;
  if (item.departure?.scheduledTime?.utc) u.dep_scheduled = item.departure.scheduledTime.utc;
  if (item.departure?.actualTime?.utc)    u.dep_actual    = item.departure.actualTime.utc;
  if (item.departure?.terminal)           u.dep_terminal  = String(item.departure.terminal);
  if (item.departure?.gate)               u.dep_gate      = String(item.departure.gate);
  if (item.departure?.runway)             u.runway_dep    = item.departure.runway;
  // Arrival
  if (item.arrival?.airport?.iata)        u.to            = item.arrival.airport.iata;
  if (item.arrival?.airport?.name)        u.to_city       = item.arrival.airport.name;
  if (item.arrival?.scheduledTime?.utc)   u.arr_scheduled = item.arrival.scheduledTime.utc;
  if (item.arrival?.actualTime?.utc)      u.arr_actual    = item.arrival.actualTime.utc;
  if (item.arrival?.terminal)             u.arr_terminal  = String(item.arrival.terminal);
  if (item.arrival?.gate)                 u.arr_gate      = String(item.arrival.gate);
  if (item.arrival?.runway)               u.runway_arr    = item.arrival.runway;
  // Distance & duration
  if (item.greatCircleDistance?.km) {
    u.distance_km    = Math.round(item.greatCircleDistance.km);
    u.distance_miles = kmToMiles(item.greatCircleDistance.km);
  }
  if (item.duration?.scheduledTime) {
    const parts = String(item.duration.scheduledTime).split(':');
    if (parts.length >= 2) u.duration_mins = parseInt(parts[0])*60+parseInt(parts[1]);
  }
  if (item.number) u.flight_number = item.number;
  return u;
}

// ── OpenSky ───────────────────────────────────────────────────────
async function fetchOpenSkyTrack(icao24, depTime) {
  if (!icao24||!depTime) return null;
  const ts = Math.floor(new Date(depTime).getTime()/1000);
  if (isNaN(ts)) return null;
  try {
    const res = await fetch(`https://opensky-network.org/api/tracks/all?icao24=${icao24.toLowerCase()}&time=${ts}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.path?.length) return null;
    return data.path
      .filter(p => p[1]!=null && p[2]!=null)
      .map(p => ({ lat:Number(p[1]), lon:Number(p[2]), alt:Number(p[3]??p[4]??0) }));
  } catch { return null; }
}

// ── Main loop ─────────────────────────────────────────────────────
window.startEnrichment = async function() {
  const apiKey  = document.getElementById('adbKey').value.trim();
  const mode    = document.getElementById('mode').value;
  const sources = document.getElementById('sources').value;
  const delay   = parseInt(document.getElementById('delay').value)||1000;

  if (!apiKey && sources !== 'opensky') { log('✗ Enter your AeroDataBox API key first.','err'); return; }
  if (!auth.currentUser) { log('✗ Not signed in. Open owner.html first, then return here.','err'); return; }

  running = true;
  stats   = { enriched:0, skipped:0, failed:0, total:0 };
  document.getElementById('startBtn').disabled = true;
  document.getElementById('stopBtn').disabled  = false;
  document.getElementById('progressWrap').classList.add('visible');
  document.getElementById('summaryBox').classList.remove('visible');
  document.getElementById('logWrap').innerHTML = '';

  log('Loading flights from Firestore…','info');

  try {
    const snap    = await getDocs(collection(db,'flights'));
    let   flights = snap.docs.map(d => ({id:d.id,...d.data()}));

    if (mode==='unenriched')     flights = flights.filter(f => !f.adb_enriched);
    else if (mode==='test')      flights = flights.filter(f => !f.adb_enriched).slice(0,3);

    stats.total = flights.length;
    log(`${flights.length} flights to process (${snap.docs.length} total in Firestore)`, 'info');
    if (mode==='test') log('TEST MODE — only first 3 unenriched flights','warn');
    updateProgress(0, flights.length, 'Starting…');

    for (let i=0; i<flights.length; i++) {
      if (!running) { log('⏹ Stopped.','warn'); break; }

      const f     = flights[i];
      const label = `[${i+1}/${flights.length}] ${f.flight_number||'?'} ${f.date||'?'} ${f.from||'?'}→${f.to||'?'}`;

      if (!f.flight_number||!f.date) {
        log(`– ${label} — skipped (missing flight_number or date)`,'skip');
        stats.skipped++; updateProgress(i+1,flights.length); continue;
      }

      try {
        const update = {};
        let icao24   = f._icao24||null;
        let depTime  = f.dep_actual||f.dep_scheduled||null;

        // AeroDataBox
        if (sources!=='opensky') {
          const raw = await fetchAeroDataBox(f.flight_number, f.date, apiKey);
          if (raw) {
            const parsed = parseAeroDataBox(raw);
            icao24  = parsed._icao24  || icao24;
            depTime = parsed.dep_actual||parsed.dep_scheduled||depTime;
            Object.assign(update, parsed);
            delete update._icao24;
            const fields = Object.keys(parsed).filter(k=>k[0]!=='_');
            log(`✓ ADB ${label} — ${fields.length} fields: ${fields.slice(0,5).join(', ')}${fields.length>5?'…':''}`, 'ok');
          } else {
            log(`– ADB ${label} — no data from AeroDataBox`, 'skip');
          }
        }

        // OpenSky track
        if (sources!=='adb' && icao24 && depTime) {
          await sleep(400);
          const track = await fetchOpenSkyTrack(icao24, depTime);
          if (track&&track.length>5) {
            update.flight_path = track;
            log(`  ↳ OpenSky: ${track.length} track points`,'ok');
          } else {
            log(`  ↳ OpenSky: no track found for ${icao24}`,'skip');
          }
        }

        if (Object.keys(update).length > 0) {
          update.adb_enriched    = true;
          update.adb_enriched_at = new Date().toISOString();
          await updateDoc(doc(db,'flights',f.id), update);
          stats.enriched++;
        } else {
          stats.skipped++;
        }
      } catch(err) {
        log(`✗ ${label} — ${err.message}`,'err');
        stats.failed++;
      }

      updateProgress(i+1, flights.length);
      await sleep(delay);
    }
  } catch(err) {
    log(`✗ Fatal: ${err.message}`,'err');
  }

  running = false;
  document.getElementById('startBtn').disabled = false;
  document.getElementById('stopBtn').disabled  = true;
  updateProgress(stats.total, stats.total, '✓ Done');
  document.getElementById('summaryBox').classList.add('visible');
  document.getElementById('sumEnriched').textContent = stats.enriched;
  document.getElementById('sumSkipped').textContent  = stats.skipped;
  document.getElementById('sumFailed').textContent   = stats.failed;
  document.getElementById('sumTotal').textContent    = stats.total;
  log(`Complete — ${stats.enriched} enriched · ${stats.skipped} skipped · ${stats.failed} failed`,'info');
};

window.stopEnrichment = function() {
  running = false;
  document.getElementById('stopBtn').disabled = true;
  log('Stopping after current flight…','warn');
};

onAuthStateChanged(auth, user => {
  if (user) {
    log(`Signed in as ${user.email} ✓`,'info');
  } else {
    log('⚠ Not signed in — open owner.html first to authenticate, then come back here.','warn');
    document.getElementById('startBtn').disabled = true;
  }
});
