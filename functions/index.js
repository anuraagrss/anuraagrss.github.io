const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();

/**
 * Simple fixed-window rate limiter backed by Firestore, keyed by an
 * arbitrary string (typically caller IP). Throws 'resource-exhausted'
 * once `limit` calls have been made within `windowMs`.
 */
async function checkRateLimit(db, key, limit, windowMs) {
  const ref = db.doc(`rate_limits/${key}`);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    if (!data || now - data.windowStart > windowMs) {
      tx.set(ref, { windowStart: now, count: 1 });
      return;
    }
    if (data.count >= limit) {
      throw new HttpsError('resource-exhausted', 'Too many requests — please slow down and try again shortly.');
    }
    tx.update(ref, { count: FieldValue.increment(1) });
  });
}

/**
 * Verifies the caller is signed in and listed in the admins collection.
 * Returns the Firestore instance for convenience.
 */
async function requireAdmin(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in');
  }
  const db = getFirestore();
  const adminDoc = await db.doc(`admins/${request.auth.uid}`).get();
  if (!adminDoc.exists) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
  return db;
}

/**
 * Proxy for Anthropic Claude API — generates photo description + tags.
 * Called from owner.html photo upload queue.
 * API key is read server-side from Firestore config/claude.api_key.
 */
exports.generatePhotoDescription = onCall({ region: 'us-central1' }, async (request) => {
  // Auth check — must be a signed-in user
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in');
  }

  const db = getFirestore();

  // Admin check — must exist in admins collection
  const adminDoc = await db.doc(`admins/${request.auth.uid}`).get();
  if (!adminDoc.exists) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }

  // Read Claude API key from Firestore (never exposed to client)
  const configDoc = await db.doc('config/claude').get();
  if (!configDoc.exists || !configDoc.data().api_key) {
    throw new HttpsError('failed-precondition', 'Claude API key not configured in Firestore config/claude');
  }
  const apiKey = configDoc.data().api_key;

  const { metadata, prompt } = request.data;
  if (!metadata) {
    throw new HttpsError('invalid-argument', 'metadata is required');
  }

  const descPrompt = prompt || 'Generate a concise, poetic description of this photography. Focus on mood, lighting, and what story the technical settings tell about the moment captured.';

  const anthropicBody = {
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: 'You are a photography description specialist. Respond ONLY with valid JSON — no markdown, no explanation, no code fences.',
    messages: [{
      role: 'user',
      content: `Based on the photo metadata below, generate a JSON object with exactly two fields:\n- "description": ${descPrompt}\n- "tags": 4-6 comma-separated tags describing the photo (subjects, mood, lighting conditions, location type, elements like water/ice/sky/fire/earth)\n\nPhoto metadata: ${JSON.stringify(metadata)}`
    }]
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(anthropicBody)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new HttpsError('internal', err.error?.message || `Anthropic error ${res.status}`);
  }

  const data = await res.json();
  const text = data.content[0].text.trim();

  try {
    const parsed = JSON.parse(text);
    return { description: parsed.description || '', tags: parsed.tags || '' };
  } catch {
    // If Claude didn't return clean JSON, return the raw text as description
    return { description: text, tags: '' };
  }
});

/**
 * Known-good system prompt preambles for chatWithClaude, one per public
 * caller (Profile.html, nomad.html). nomad.html's prompt is templated with
 * live Firestore data (country count, travel context) so we only pin the
 * static preamble, not the whole string. This stops the endpoint being
 * used as a general-purpose, unauthenticated LLM proxy with an arbitrary
 * persona/topic — the one thing an open `system` field would otherwise allow.
 */
const ALLOWED_SYSTEM_PREFIXES = [
  "You are Anuraag Ravulaparthi's professional AI assistant, embedded in his executive portfolio website.",
  'You are Anuraag Ravulaparthi — a nomad, engineer and storyteller who has visited ',
];
const MAX_SYSTEM_LEN = 8000;
const MAX_MESSAGE_LEN = 4000;
const MAX_MESSAGES = 20;

/**
 * Proxy for Anthropic Claude API — public AI chat used by Profile.html and nomad.html.
 * API key is read server-side from Firestore config/claude.api_key.
 * Unauthenticated by design (public chat widgets), so it's locked down by
 * system-prompt allow-listing, payload size caps, and per-IP rate limiting
 * instead of an auth check.
 */
exports.chatWithClaude = onCall({ region: 'us-central1' }, async (request) => {
  const db = getFirestore();

  const ip = request.rawRequest?.ip || request.rawRequest?.headers?.['x-forwarded-for'] || 'unknown';
  await checkRateLimit(db, `chatWithClaude_${ip}`, 20, 10 * 60 * 1000); // 20 calls / 10 min / IP

  const configDoc = await db.doc('config/claude').get();
  if (!configDoc.exists || !configDoc.data().api_key) {
    throw new HttpsError('failed-precondition', 'Claude API key not configured in Firestore config/claude');
  }
  const apiKey = configDoc.data().api_key;

  const { system, messages, max_tokens } = request.data;
  if (!system || typeof system !== 'string' || system.length > MAX_SYSTEM_LEN) {
    throw new HttpsError('invalid-argument', 'system is required and must be a reasonably sized string');
  }
  if (!ALLOWED_SYSTEM_PREFIXES.some((p) => system.startsWith(p))) {
    throw new HttpsError('permission-denied', 'system prompt not recognized');
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    throw new HttpsError('invalid-argument', `messages must be a non-empty array of at most ${MAX_MESSAGES} items`);
  }
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string' || m.content.length > MAX_MESSAGE_LEN) {
      throw new HttpsError('invalid-argument', 'each message needs a role of user/assistant and a bounded string content');
    }
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: Math.min(max_tokens || 300, 700),
      system,
      messages: messages.slice(-8)
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new HttpsError('internal', err.error?.message || `Anthropic error ${res.status}`);
  }

  const data = await res.json();
  return { reply: data.content?.[0]?.text || '' };
});

/**
 * Proxy for FlightRadar24 historic flight-summary lookups — used by owner.html
 * to enrich saved flights with aircraft type, tail number, terminals/gates.
 * API key is read server-side from Firestore config/fr24.
 */
exports.enrichFlight = onCall({ region: 'us-central1' }, async (request) => {
  const db = await requireAdmin(request);

  const { flightNum, date } = request.data;
  if (!flightNum || !date) {
    throw new HttpsError('invalid-argument', 'flightNum and date are required');
  }

  const configDoc = await db.doc('config/fr24').get();
  if (!configDoc.exists || !configDoc.data().api_key) {
    throw new HttpsError('failed-precondition', 'FR24 API key not configured in Firestore config/fr24');
  }
  const apiKey = configDoc.data().api_key;

  const fn = flightNum.replace(/\s+/g, '').toUpperCase();
  const dateStr = date.split('T')[0];
  const url = `https://fr24api.flightradar24.com/api/v1/historic/flight-summaries/full?flight_number=${encodeURIComponent(fn)}&date_from=${encodeURIComponent(dateStr + 'T00:00:00Z')}&date_to=${encodeURIComponent(dateStr + 'T23:59:59Z')}`;

  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' } });
  if (!res.ok) return null;

  const data = await res.json();
  const flights = data.data || data.results || data;
  const flight = Array.isArray(flights) ? flights[0] : flights;
  if (!flight) return null;

  const dep = flight.departure || flight.orig || {};
  const arr = flight.arrival || flight.dest || {};
  return {
    fr24_id: flight.fr24_id || flight.fid || flight.id || null,
    aircraft_type: (flight.aircraft?.model || flight.aircraft?.type) || null,
    tail_number: (flight.aircraft?.registration || flight.aircraft?.reg) || null,
    duration_mins: flight.duration || null,
    dep_terminal: dep.terminal || null,
    dep_gate: dep.gate || null,
    arr_terminal: arr.terminal || null,
    arr_gate: arr.gate || null,
  };
});

/**
 * Proxy for seats.aero partner API — used by award-search.html and trip-planner.html
 * to search award availability. API key is read server-side from Firestore
 * config/seats_aero (falling back to settings/api_keys.saKey for trip-planner).
 */
exports.searchSeatsAero = onCall({ region: 'us-central1' }, async (request) => {
  const db = await requireAdmin(request);

  const { origin, destination, cabin, start_date, end_date, endpoint } = request.data;
  if (!origin || !destination || !start_date) {
    throw new HttpsError('invalid-argument', 'origin, destination and start_date are required');
  }

  let apiKey = null;
  const saDoc = await db.doc('config/seats_aero').get();
  if (saDoc.exists && saDoc.data().api_key) {
    apiKey = saDoc.data().api_key;
  } else {
    const settingsDoc = await db.doc('settings/api_keys').get();
    if (settingsDoc.exists && settingsDoc.data().saKey) apiKey = settingsDoc.data().saKey;
  }
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'seats.aero API key not configured');
  }

  const path = endpoint === 'search' ? 'search' : 'availability';
  const params = new URLSearchParams({
    origin_airport: origin,
    destination_airport: destination,
    cabin: cabin || 'business',
    start_date,
    end_date: end_date || start_date,
  });

  const res = await fetch(`https://seats.aero/partnerapi/${path}?${params}`, {
    headers: { 'Partner-Authorization': apiKey },
  });
  if (!res.ok) {
    throw new HttpsError('internal', `seats.aero error ${res.status}`);
  }
  return res.json();
});

/**
 * Proxy for Amadeus flight-offers search — used by trip-planner.html.
 * Client credentials are read server-side from Firestore settings/api_keys
 * (amId, amSecret, amEnv); OAuth token is fetched server-side too.
 */
exports.searchAmadeus = onCall({ region: 'us-central1' }, async (request) => {
  const db = await requireAdmin(request);

  const { origin, dest, date, cabin, pax } = request.data;
  if (!origin || !dest || !date) {
    throw new HttpsError('invalid-argument', 'origin, dest and date are required');
  }

  const settingsDoc = await db.doc('settings/api_keys').get();
  const keys = settingsDoc.exists ? settingsDoc.data() : {};
  if (!keys.amId || !keys.amSecret) {
    throw new HttpsError('failed-precondition', 'Amadeus credentials not configured');
  }

  const base = keys.amEnv === 'production' ? 'https://api.amadeus.com' : 'https://test.api.amadeus.com';

  const tokenRes = await fetch(`${base}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${encodeURIComponent(keys.amId)}&client_secret=${encodeURIComponent(keys.amSecret)}`,
  });
  if (!tokenRes.ok) {
    throw new HttpsError('internal', `Amadeus auth error ${tokenRes.status}`);
  }
  const { access_token } = await tokenRes.json();

  const cabinMap = { Y: 'ECONOMY', W: 'PREMIUM_ECONOMY', J: 'BUSINESS', F: 'FIRST' };
  const params = new URLSearchParams({
    originLocationCode: origin,
    destinationLocationCode: dest,
    departureDate: date,
    adults: String(pax || 1),
    travelClass: cabinMap[cabin] || 'BUSINESS',
    max: '10',
    currencyCode: 'USD',
  });

  const res = await fetch(`${base}/v2/shopping/flight-offers?${params}`, {
    headers: { 'Authorization': `Bearer ${access_token}` },
  });
  if (!res.ok) {
    throw new HttpsError('internal', `Amadeus error ${res.status}`);
  }
  return res.json();
});
