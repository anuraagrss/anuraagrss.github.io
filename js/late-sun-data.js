// Shared data for the Late Sun pages (late-sun, logbook, darkroom).
// Read-only. Everything a stranger sees is grouped into journals — one per country —
// so stories, photographs, cafes and flights find each other.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, getDocs }
                         from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const app = initializeApp({
  apiKey:"AIzaSyCESqunM9b_Yc-5Dj0qJJFxGALmEGm0Rd0",
  authDomain:"nomad-404.firebaseapp.com",
  projectId:"nomad-404",
  appId:"1:638331724572:web:baa0d70108e920099150d9"
});
const db = getFirestore(app);

// ── the visitor's sky ──
export function setSky() {
  const h = new Date().getHours();
  document.body.dataset.sky = h < 6 ? 'predawn' : h < 10 ? 'late' : h < 16 ? 'day' : h < 20 ? 'golden' : 'night';
}

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

// ── places ──
export const BETWEEN = 'in between';
const BETWEEN_RE = /ocean|on the road|over the|north atlantic|in flight/i;
const NAME_ALIAS = {
  ire: 'Ireland', 'united states': 'USA', texas: 'USA', illinois: 'USA', minnosota: 'USA', minnesota: 'USA',
  rome: 'Italy', 'bosnia and herzegovina': 'Bosnia & Herzegovina', 'easter island': 'Chile',
  'united kingdom': 'UK', england: 'UK',
};
const EXTRA_CODES = { FO: 'Faroe Islands', HR: 'Croatia', MA: 'Morocco', NO: 'Norway', IE: 'Ireland', DK: 'Denmark', CO: 'Colombia', ZA: 'South Africa', CL_EI: 'Chile' };

// Airports he has flown through → country code. Add a line when a new airport shows up.
export const AIRPORT_COUNTRY = {
  DFW:'US',MCI:'US',CLT:'US',IAH:'US',SLC:'US',ATL:'US',ORD:'US',BOS:'US',SEA:'US',ANC:'US',PIT:'US',EWR:'US',FLL:'US',MCO:'US',
  SFO:'US',DTW:'US',DEN:'US',TPA:'US',HOU:'US',CLE:'US',OKC:'US',MIA:'US',MAF:'US',AVP:'US',DAL:'US',STL:'US',MSY:'US',LAS:'US',
  SJU:'PR',YYC:'CA',PTY:'PA',SJO:'CR',MEX:'MX',MID:'MX',EZE:'AR',AEP:'AR',IGR:'AR',
  DEL:'IN',BOM:'IN',HYD:'IN',TIR:'IN',BLR:'IN',ATQ:'IN',VTZ:'IN',RJA:'IN',MAA:'IN',VGA:'IN',SAG:'IN',
  DXB:'AE',DOH:'QA',CMB:'LK',BKK:'TH',ICN:'KR',SYD:'AU',CNS:'AU',ADD:'ET',RAK:'MA',
  AMS:'NL',CPH:'DK',FAE:'FO',FRA:'DE',MUC:'DE',BER:'DE',BVA:'FR',ORY:'FR',CDG:'FR',MRS:'FR',RNS:'FR',SAW:'TR',IST:'TR',VIE:'AT',
  OSL:'NO',LHR:'GB',LTU:'GB',BFS:'GB',PRG:'CZ',WAW:'PL',LIS:'PT',BCN:'ES',MAD:'ES',FCO:'IT',MXP:'IT',GVA:'CH',DUB:'IE',LUX:'LU',
  BRU:'BE',ATH:'GR',JTR:'GR',ZAG:'HR',SJJ:'BA',OMO:'BA',BEG:'RS',KEF:'IS',
};

let nameByCode = {}, canonical = {};
function buildNames(countries) {
  nameByCode = { ...EXTRA_CODES };
  countries.forEach(c => { if (c.id && c.name) nameByCode[c.id] = c.name; });
  canonical = {};
  Object.values(nameByCode).forEach(n => canonical[n.toLowerCase()] = n);
}
export function placeFromName(raw) {
  if (!raw) return null;
  if (BETWEEN_RE.test(raw)) return BETWEEN;
  const last = raw.split(',').pop().trim(), k = last.toLowerCase();
  if (!k || k === 'unknown') return null;
  if (NAME_ALIAS[k]) return NAME_ALIAS[k];
  if (canonical[k]) return canonical[k];
  return last.replace(/\b\w/g, c => c.toUpperCase()).replace(/\B\w+/g, w => w.toLowerCase());
}
export const placeFromCode = code => (code && nameByCode[code]) || null;

// ── loading ──
let cache = null;
export function loadAll() {
  if (cache) return cache;
  const get = async name => (await getDocs(collection(db, name))).docs.map(d => ({ id: d.id, ...d.data() }));
  cache = Promise.allSettled(['experiences', 'photos', 'cafes', 'flights', 'countries'].map(get)).then(r => {
    const [experiences, photos, cafes, flights, countries] = r.map(x => x.status === 'fulfilled' ? x.value : []);
    if (r[0].status !== 'fulfilled' && r[1].status !== 'fulfilled') throw new Error('nothing loaded');
    buildNames(countries);
    return { experiences: experiences.filter(x => !x._seeded_at), photos, cafes: cafes.filter(c => !c._seeded_at),
             flights: flights.sort((a, b) => (a.date || '').localeCompare(b.date || '')), countries};
  });
  return cache;
}

// ── journals ──
export async function loadJournals() {
  const d = await loadAll();
  const map = new Map();
  const J = name => {
    if (!map.has(name)) map.set(name, { name, stories: [], photos: [], cafes: [], flights: [], country: null });
    return map.get(name);
  };
  d.experiences.forEach(x => { const n = placeFromName(x.loc) || BETWEEN; J(n).stories.push(x); });
  d.photos.forEach(p => { const n = placeFromCode(p.country_id) || placeFromName(p.location); if (n) J(n).photos.push(p); });
  d.cafes.forEach(c => { const n = placeFromCode(c.country); if (n) J(n).cafes.push(c); });
  d.flights.forEach(f => { const n = placeFromCode(AIRPORT_COUNTRY[f.to]); if (n && map.has(n)) J(n).flights.push(f); });

  for (const j of map.values()) {
    j.country = d.countries.find(c => (c.name || '').toLowerCase() === j.name.toLowerCase()) || null;
    j.photos.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const TAB_ORDER = { people: 0, moments: 1, adventures: 2 };   // pages read in the order the journal shows them
    j.stories.sort((a, b) => (TAB_ORDER[a.tab] ?? 3) - (TAB_ORDER[b.tab] ?? 3));
    j.weight = j.stories.length * 4 + j.photos.length + j.cafes.length;
  }
  const rank = j => j.name === 'India' ? -1 : j.name === BETWEEN ? 1 : 0;   // start at home, end in the air
  return [...map.values()].filter(j => j.stories.length || j.photos.length || j.cafes.length)
    .sort((a, b) => rank(a) - rank(b) || b.weight - a.weight);
}

// A trip's days. Trips aren't public, so the days come from the photographs:
// the longest run of dated photos (gaps of up to 3 days), first to last.
// Gold = a day with a photograph he marked featured. Grey = the road.
export function tripDays(j) {
  const dates = [...new Set(j.photos.map(p => p.date).filter(Boolean))].sort();
  if (dates.length < 2) return [];
  const day = iso => new Date(iso + 'T12:00:00').getTime() / 864e5;
  let runs = [[dates[0]]];
  for (let i = 1; i < dates.length; i++) {
    if (day(dates[i]) - day(dates[i - 1]) <= 3) runs.at(-1).push(dates[i]); else runs.push([dates[i]]);
  }
  const run = runs.sort((a, b) => (day(b.at(-1)) - day(b[0])) - (day(a.at(-1)) - day(a[0])) || b.length - a.length)[0];
  if (day(run.at(-1)) - day(run[0]) < 2) return [];
  const days = [], end = new Date(run.at(-1) + 'T12:00:00');
  for (let d = new Date(run[0] + 'T12:00:00'); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10), photos = j.photos.filter(p => p.date === iso);
    days.push({ iso, photos, gold: photos.some(p => p.featured) });
  }
  return days;
}

// The letter that answers the boy who watched planes, from the real log.
export function boyLetter(flights) {
  if (!flights.length) return null;
  const miles = flights.reduce((s, f) => s + (f.distance_miles || 0), 0);
  const earth = miles / 24901, moon = miles / 238855;
  const airports = new Set(flights.flatMap(f => [f.from, f.to])).size;
  const airlines = new Set(flights.map(f => f.airline).filter(Boolean)).size;
  const first = flights.find(f => f.date);
  const moonLine = moon >= 1 ? ` To the moon${moon >= 1.4 ? ', and halfway back' : ''}.` : '';
  return {
    to: 'To: the boy who watched planes', from: 'Arey',
    body: `You said they felt very far for you to get on.\n\nYou got on ${flights.length} of them.\n\n${miles.toLocaleString('en-US')} miles. Around the Earth ${earth.toFixed(1)} times.${moonLine}\n\n${airports} airports. ${airlines} airlines. The first one in the log is from ${first.date.slice(0, 4)}.`,
    cite: '— every one of them is written down.', link: 'logbook.html',
  };
}

// ── small words ──
export const TYPE = { people: 'someone I met', moments: 'a moment I lived', adventures: 'something I dared' };
export function countLine(j) {
  const c = k => j.stories.filter(x => x.tab === k).length, out = [];
  const add = (n, one, many) => n && out.push(n > 1 ? many.replace('#', n) : one);
  add(c('people'), 'met 1 person', 'met # people'); add(c('moments'), '1 moment', '# moments'); add(c('adventures'), '1 dare', '# dares');
  add(j.photos.length, '1 photograph', '# photographs'); add(j.cafes.length, 'sat in 1 cafe', 'sat in # cafes'); add(j.flights.length, 'landed here once', 'landed here # times');
  return out.join(' · ');
}
export const fmtDate = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toLowerCase() : '';
