# anuraagrss.github.io
my portfolio
# Nomad — Anuraag Ravulaparthi · Technical Documentation

> Complete technical reference for the 404-nomad.com portfolio ecosystem.
> Last updated: March 2026.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Hosting & Deployment](#3-hosting--deployment)
4. [Firebase Configuration](#4-firebase-configuration)
5. [Pages Reference](#5-pages-reference)
6. [Firestore Data Model](#6-firestore-data-model)
7. [Firestore Security Rules](#7-firestore-security-rules)
8. [Firebase Storage](#8-firebase-storage)
9. [External APIs](#9-external-apis)
10. [Owner Dashboard](#10-owner-dashboard)
11. [Authentication & Roles](#11-authentication--roles)
12. [Design System](#12-design-system)
13. [Setup & First-Time Bootstrap](#13-setup--first-time-bootstrap)
14. [Common Tasks](#14-common-tasks)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Project Overview

A personal portfolio and travel documentation website for Anuraag Ravulaparthi — engineer, nomad, photographer. The site documents travel across 53+ countries, 116+ flights, 7 continents, and photography from every continent.

**Philosophy:** Inspired by *Zindagi Na Milegi Dobara* and Javed Akhtar's poem *Toh Zinda Ho Tum* — every page is structured as proof of a life fully lived.

**Stack:**
- Pure HTML/CSS/JS — no framework, no build step, no npm
- Firebase (Auth, Firestore, Storage) as the backend
- GitHub Pages as the host
- All pages are single-file HTML — everything self-contained

---

## 2. Architecture

```
GitHub Pages (404-nomad.com)
├── home.html          ← Entry point, terminal navigation
├── nomad.html         ← Travel page (globe, flights, experiences, cafes, countries)
├── profile.html       ← Professional portfolio
├── photography.html   ← Photography gallery (reads from Firestore photos collection)
├── award-search.html  ← Award flight search tool (Seats.aero API)
└── owner.html         ← Private dashboard (Firebase Auth protected)

Firebase Backend
├── Authentication     ← Google Sign-In, UID-based admin check
├── Firestore          ← All content data (14 collections)
├── Storage            ← Photography images
└── config collection  ← API keys + site settings
```

**Data flow:**
- Public pages (`nomad.html`, `photography.html`) read directly from Firestore on page load with no authentication — public read rules allow this
- `owner.html` requires Google Sign-In and a matching document in the `admins` collection
- All writes go through `owner.html` — public pages are read-only
- API keys (FR24, Seats.aero) are stored in Firestore `config` collection, never hardcoded in HTML

---

## 3. Hosting & Deployment

**Host:** GitHub Pages  
**Domain:** `404-nomad.com` (custom domain on GitHub Pages)  
**Repository:** Push HTML files to the `main` branch root  
**Deployment:** Automatic on push — no CI/CD pipeline needed

### Deploying changes

```bash
# Just copy updated HTML files into the repo root and push
git add nomad.html owner.html photography.html
git commit -m "update: nomad flights section"
git push origin main
```

GitHub Pages serves from the repo root. Changes are live within ~60 seconds.

### Files that must NOT be committed

- `bootstrap-all.html` — contains all seeded travel data inline. Deploy temporarily, run once, then delete and push again immediately.
- `bootstrap-admin.html` — creates super-admin. Same — delete after use.

### firebase.json

Firebase is not used for hosting — only for Auth, Firestore, and Storage. The `firebase.json` in the repo is a reference for Firebase CLI usage (functions, emulators) only. GitHub Pages handles all static file serving.

---

## 4. Firebase Configuration

**Project ID:** `nomad-404`  
**Auth Domain:** `nomad-404.firebaseapp.com`  
**Storage Bucket:** `nomad-404.firebasestorage.app`  
**Messaging Sender ID:** `638331724572`  
**App ID:** `1:638331724572:web:baa0d70108e920099150d9`  
**API Key:** `AIzaSyCESqunM9b_Yc-5Dj0qJJFxGALmEGm0Rd0`

This config is safe to be public — Firebase security is enforced by Firestore Security Rules and Storage Rules, not by keeping the config secret.

**Firebase SDK version:** `10.12.0` (imported via CDN from `gstatic.com`)

### Services used

| Service | Used for |
|---|---|
| Firebase Auth | Google Sign-In for owner dashboard |
| Firestore | All content data (flights, cafes, countries, photos, etc.) |
| Firebase Storage | Photography image hosting |

---

## 5. Pages Reference

### home.html

Entry point. Dark-themed page with a split avatar hero. Features a terminal emulator in the right sidebar. Typing `sudo anuraag` triggers Google Sign-In and redirects to `owner.html` if authenticated as admin. Other commands navigate to different pages.

**Terminal navigation commands:** `ls`, `whoami`, `engineer`, `nomad`, `contact`, `about`, `sudo anuraag`

**Theme switching:** Hovering the navigation links switches between two colour themes in real-time.

**Dependencies:** Google Fonts (JetBrains Mono, Bebas Neue, DM Sans)

---

### nomad.html

The main travel page. Reads all data from Firestore on load. No authentication required.

**Sections in order:**
1. **Intro** — full-screen darkroom sequence. Urdu ghost text `تو زندہ ہو تم`. Lines appear sequentially (800ms → 1800ms → 3000ms → 4500ms → 6800ms → 7800ms). Auto-dismisses at 9s. Envelope-tear transition into page.
2. **Hero** — `THE WORLD IS PROOF / I AM ALIVE.` with live stats counting up from Firestore
3. **Globe** — Three.js r128 sphere. Satellite texture (NASA blue marble via unpkg CDN with procedural canvas fallback). Amber ember dots for visited countries. Toggle between Countries and Flight Routes mode. Flight routes rendered as animated dashed gold arcs using ADS-B `flight_path` if available, haversine great circle otherwise.
4. **Origin postcard** — styled as a physical postcard with red margin line, ruled paper, postmark, addressed to "Anuraag, age 17"
5. **Facts strip** — dark band with live stats (continents, countries, flights, miles, airlines)
6. **Aircraft fleet** — 3-column hero photo mosaic of aircraft types flown. Ranked by flight count from Firestore. Hover reveals technical description and story.
7. **Boarding passes** — latest 4 shown. Remaining stacked as a visual card peek. Click-to-expand per pass shows full FR24-enriched flight data.
8. **Full flight log** — hidden by default, expand button reveals complete table
9. **Experiences film reel** — Three tabs: Adventures / People / Moments. Physical Polaroid-style tilted prints in a dark film strip. Click opens postcard lightbox.
10. **Airports** — hero photo mosaic of most-visited airports (3-column grid). Photos from Unsplash CDN. Stories appear on hover.
11. **Cafes** — thermal receipt cards with uncurl-on-click story reveal
12. **Countries** — postage stamp grid with flag, ISO code, visited/transit status
13. **Closing poem** — dark section. Javed Akhtar's *Toh Zinda Ho Tum* in Urdu with English transliteration. Scroll-triggered reveal per couplet. Final line: `TOH ZINDA HO TUM.`

**Firestore reads:** `countries`, `flights`, `cafes`, `experiences` — all loaded in parallel via `Promise.allSettled` on dismiss of intro. Each collection loads independently; one failure doesn't break others.

**Globe error protection:** `InstancedMesh` count clamped to `Math.max(1, countriesData.length)` to prevent WebGL crash when data is empty.

**Dependencies:** Three.js r128 (cdnjs), Google Fonts (Lora, JetBrains Mono, Bebas Neue), NASA blue marble texture (unpkg — loads if available, degrades to canvas fallback), flagcdn.com (country flags), Unsplash CDN (airport photos, aircraft photos — static permanent URLs, no API key)

---

### photography.html

Photography gallery. Dark-themed. Reads from `photos` Firestore collection. No authentication required.

**Concept:** Darkroom developing session. Photos start as near-black and develop to full colour as you scroll past them — simulating silver halide activation in developer solution.

**Sections:**
- **Intro** — red safelight glow, projector grain animation, film developing metaphor
- **Hero** — full-bleed, most recent `featured:true` photo as background. Develops from black to colour on page load.
- **Chapters** — one per element (ICE → SKY → WATER → FIRE → EARTH), rendered in that order. Each chapter only appears if photos exist for that element.
- **Spreads** — alternating 65/35 layout. Photo panel (left or right) with darkroom grain overlay + watermark. Journal panel (warm paper, red margin line, ruled lines) with story, location, date, EXIF data.
- **Scroll develop effect** — `IntersectionObserver` at `threshold: 0.25` triggers: CSS filter transitions from `saturate(0) brightness(0.08)` to `saturate(0.85) brightness(0.75)` over 1.8s. A ripple div sweeps down first.
- **Fullscreen viewer** — `requestFullscreen()` on the viewer div. Cursor hidden. Watermark `© ANURAAG RAVULAPARTHI · anuraag.me` in corner. ESC or click to exit.

**Photo protection:**
- Right-click disabled on all images
- Drag-to-save blocked
- Long-press disabled on mobile (touchstart preventDefault)
- Print attempted to be blocked (beforeprint event)
- `pointer-events: none` on img elements
- `draggable="false"` attribute
- `user-select: none` on body

Note: browser-level screenshots cannot be prevented. The above stops casual copying. A determined user with DevTools can still access URLs.

**Dependencies:** Firebase Firestore, Firebase Auth (for write access via owner.html)

---

### award-search.html

Award flight search tool. Light-themed boarding pass aesthetic. Navy topbar, sky gradient background.

**API:** Seats.aero Partner API  
**Endpoint:** `GET https://seats.aero/partnerapi/search`  
**Auth header:** `Partner-Authorization: {api_key}`  
**Key storage:** `config/seats_aero` in Firestore — loaded on page init, never in HTML  
**Requires:** Seats.aero Pro account

**Features:**
- Multi-airport search (generates all FROM × TO combinations, searches in parallel)
- Filter by program (airline loyalty program) and nonstop only
- Sort by miles / date / stops / seats
- Boarding pass result cards with tear-line divider
- Summary strip: lowest miles, nonstop count, programs found

---

### owner.html

Private dashboard. Requires Google Sign-In and `admins/{uid}` document in Firestore.

Full panel reference in [Section 10](#10-owner-dashboard).

---

### profile.html

Professional engineering portfolio. Static content. No Firestore reads.

---

## 6. Firestore Data Model

### admins/{uid}

Access control. Document ID = Firebase Auth UID.

```js
{
  email: "anuraag@example.com",
  name: "Anuraag",
  role: "super-admin",          // "super-admin" | "editor" | "viewer"
  photoURL: null,
  addedAt: "2024-01-01T00:00:00Z",
  addedBy: "{uid}"
}
```

---

### countries/{ISO_code}

One document per country. Document ID = ISO 2-letter code (e.g. `IN`, `US`, `AQ`). Special cases: `CL_EI` for Easter Island.

```js
{
  id: "IN",
  name: "India",
  lat: 20.6,
  lon: 78.9,
  status: "visited",            // "visited" | "transiting" | "wishlist"
  emoji: "❤️",                  // optional
  notes: "Home",                // optional
  visited_year: null            // optional
}
```

Used by: `nomad.html` globe (dots), countries stamp grid, terminal stats.

---

### flights/{auto_id}

One document per flight.

```js
{
  // Core (from Excel import or manual entry)
  flight_number: "EK 202",
  airline_code: "EK",
  airline: "Emirates",
  from: "DEL",
  from_city: "New Delhi",
  to: "DXB",
  to_city: "Dubai",
  date: "2024-03-15",
  time: "02:20",
  cabin: "Economy",
  seat: "34A",
  aircraft_type: "Boeing 777-300ER",
  distance_miles: 1200,
  notes: "Window seat",
  trip_id: "{trips_doc_id}",    // optional

  // Added by FR24 enrichment (via ENRICH button in dashboard)
  tail_number: "A6-EGE",
  fr24_id: "abc123",
  duration_mins: 195,
  distance_km: 1931,
  dep_terminal: "3",
  dep_gate: "C22",
  dep_scheduled: "02:20",
  dep_actual: "02:28",
  arr_terminal: "3",
  arr_gate: "A14",
  arr_scheduled: "04:30",
  arr_actual: "04:22",
  runway_dep: "28R",
  runway_arr: "12L",
  flight_path: [                // ADS-B GPS track (array of points)
    { lat: 28.55, lon: 77.1, alt: 0, spd: 0 },
    // ...
  ],

  // Added by Planespotters lookup
  aircraft_photo: {
    url: "https://cdn.planespotters.net/...",
    photographer: "John Smith",
    source: "planespotters.net"
  },

  // Metadata
  addedAt: Timestamp,
  addedBy: "{uid}",
  source: "import"              // "import" | "manual"
}
```

---

### trips/{auto_id}

Named trips — the hub collection. Everything else references `trip_id`.

```js
{
  title: "South America Grand Loop",
  date_from: "2022-11-01",
  date_to: "2023-01-15",
  status: "done",               // "done" | "upcoming" | "planning"
  notes: "75 days. Inca Trail, Easter Island, Patagonia.",
  cover_photo: null,
  addedAt: Timestamp,
  addedBy: "{uid}"
}
```

---

### cafes/{auto_id}

```js
{
  name: "Onibus Coffee",
  type: "Specialty Coffee",
  city: "Tokyo",
  country: "JP",
  ordered: "Single origin pour-over",
  rating: "★★★★★",
  vibe: "Minimalist timber interior…",
  story: "Found this tucked into a backstreet…",
  trip_id: null,
  addedAt: Timestamp,
  addedBy: "{uid}"
}
```

---

### experiences/{auto_id}

Film reel entries for `nomad.html` three-tab section.

```js
{
  tab: "adventures",            // "adventures" | "people" | "moments"
  label: "SKYDIVE",            // uppercase, ≤12 chars, shown on film frame
  loc: "DUBAI, UAE",           // shown bottom-left of photo
  title: "Jump out of a plane — twice.",
  story: "<p>HTML content…</p>",
  img: "images/skydive.jpeg",  // relative path or URL, null if no photo
  trip_id: null,
  addedAt: Timestamp,
  addedBy: "{uid}"
}
```

---

### adventures/{auto_id}

Raw adventure log — separate from the curated `experiences` collection.

```js
{
  title: "Skydive over Palm Jumeirah",
  location: "Dubai, UAE",
  country: "AE",
  date: "2023-06-15",
  category: "adrenaline",      // "adrenaline"|"trek"|"expedition"|"road"|"wonder"|"geopolitical"|"natural"|"cultural"
  story: "14,000 feet…",
  trip_id: null,
  addedAt: Timestamp,
  addedBy: "{uid}"
}
```

---

### people/{auto_id}

People met while traveling.

```js
{
  name: "Carlos",
  met_at: "Salsa class, Cartagena",
  country: "CO",
  story: "Spoke no English. I spoke no Spanish…",
  photo_url: null,
  trip_id: null,
  addedAt: Timestamp,
  addedBy: "{uid}"
}
```

---

### photos/{auto_id}

Photography collection — used by `photography.html`.

```js
{
  title: "Sunrise at Ahu Tongariki",
  story: "4:30am alarm. The silence was the loudest…",
  image_url: "https://firebasestorage.googleapis.com/v0/b/…",
  location: "Easter Island, Chile",
  country_id: "CL",
  date: "2023-03-21",
  element: "fire",             // "water"|"sky"|"earth"|"ice"|"fire"
  featured: true,              // if true, used as hero on photography.html
  trip_id: null,
  exif: {
    camera: "Sony A7III",
    lens: "24-70mm f/2.8",
    settings: "f/8 · 1/250s · ISO 400"
  },
  addedAt: Timestamp,
  addedBy: "{uid}"
}
```

Element ordering on `photography.html`: ICE → SKY → WATER → FIRE → EARTH

---

### travel_plans/{auto_id}

```js
{
  destination: "Patagonia, Chile",
  status: "wishlist",          // "wishlist"|"planning"|"booked"|"done"
  date: "2025-Q1",
  with: "Solo",
  notes: "Torres del Paine W-trek…",
  addedAt: Timestamp,
  addedBy: "{uid}"
}
```

---

### journal/{auto_id}

Super-admin only. Never public.

```js
{
  title: "Entry title",
  body: "Free text…",
  mood: "✦ Reflective",        // one of 6 mood options
  loc: "Somewhere on earth",
  date: "2024-01-15T10:30:00Z",
  addedAt: Timestamp
}
```

---

### content/{field_name}

Page copy editable from dashboard. Document ID = field name.

```js
// content/heroHeadline
{ value: "Engineer. Nomad. Storyteller.", updatedAt: Timestamp, updatedBy: "{uid}" }

// content/heroSub
{ value: "Building things by day…", updatedAt: Timestamp, updatedBy: "{uid}" }

// content/originQuote
{ value: "Growing up, a household income of ₹1,200…", updatedAt: Timestamp, updatedBy: "{uid}" }
```

---

### config/{service_name}

API keys and site settings. Super-admin read/write only.

**API key documents** — document ID = service name:

```js
// config/fr24
{
  api_key: "…",                // also stored as bearer_token
  bearer_token: "…",
  key_type: "bearer_token",
  notes: "Sandbox plan, 500 req/month",
  saved_at: "2024-01-01T00:00:00Z",
  saved_by: "{uid}"
}

// config/seats_aero
{ api_key: "…", key_type: "api_key", saved_at: "…", saved_by: "…" }
```

**Site settings document:**

```js
// config/site_settings
{
  maintenance_mode: false,
  photography_visible: true,
  show_flights: true,
  tagline: "Nomad · Engineer · Storyteller",
  contact_email: "hello@404-nomad.com",
  updated_at: "2024-01-01T00:00:00Z",
  updated_by: "{uid}"
}
```

---

## 7. Firestore Security Rules

```
Collection          Read                Write
─────────────────────────────────────────────────────
admins              own doc OR super    super-admin
countries           public              editor+
photos              public              editor+
flights             public              editor+
cafes               public              editor+
adventures          public              editor+
experiences         public              editor+
trips               admin+              editor+
people              admin+              editor+
travel_plans        admin+              editor+
journal             super-admin only    super-admin
config              super-admin only    super-admin
(everything else)   denied              denied
```

**Role hierarchy:**
- `super-admin` — full access including journal, config, user management
- `editor` — can write all content collections (flights, cafes, experiences, adventures, people, photos, trips, countries, travel_plans, content)
- `viewer` — read-only access to admin-protected collections

**Deploy rules:**
```bash
firebase deploy --only firestore:rules
```

Or paste `firestore.rules` content into Firebase console → Firestore → Rules → Publish.

---

## 8. Firebase Storage

**Bucket:** `nomad-404.firebasestorage.app`  
**Used for:** Photography images uploaded via `owner.html` Photography panel  
**Upload path:** `photos/{timestamp}_{slug}.{ext}`

### CORS Configuration

Required for uploads from `404-nomad.com` to work. Apply once via Google Cloud CLI:

```bash
# Switch to Firebase project
gcloud config set project nomad-404

# Apply CORS (run from folder containing cors.json)
gcloud storage buckets update gs://nomad-404.firebasestorage.app --cors-file=cors.json
```

**cors.json** allows:
- Origins: `https://404-nomad.com`, `https://www.404-nomad.com`, `http://localhost`
- Methods: GET, POST, PUT, DELETE, HEAD, OPTIONS
- Headers: Content-Type, Content-Length, Content-Disposition, ETag, Access-Control-Allow-Origin
- Max age: 3600 seconds

If the bucket isn't visible in `gcloud storage buckets list`, go to Firebase console → Storage → Get Started to initialise it first.

### Storage Rules

Default rules — authenticated users can write, public can read:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Deploy via Firebase console → Storage → Rules, or:
```bash
firebase deploy --only storage
```

---

## 9. External APIs

### FlightRadar24 (FR24)

**Base URL:** `https://fr24api.flightradar24.com/api`  
**Auth:** `Authorization: Bearer {token}` header  
**Key stored in:** `config/fr24` Firestore document  
**Plan required:** FR24 API sandbox or paid plan

**Endpoints used:**

```
GET /v1/historic/flight-summaries/full
  ?flight_number={EK202}
  &date_from={YYYY-MM-DDTHH:MM:SSZ}
  &date_to={YYYY-MM-DDTHH:MM:SSZ}

Returns: aircraft type, tail number, duration, dep/arr terminals,
         gates, scheduled/actual times, runway assignments

GET /v1/historic/flight-tracks/{fr24_id}

Returns: ADS-B GPS track array [{lat, lon, alt, spd}, ...]
```

**Usage:** Called from owner.html dashboard when ENRICH button is clicked on a flight. Never called from public pages.

---

### Planespotters

**URL:** `https://api.planespotters.net/pub/photos/reg/{tail_number}`  
**Auth:** None (public API)  
**Returns:** Aircraft photo thumbnails indexed by tail number  
**Used for:** Enriched flight photos in dashboard flight log

---

### Seats.aero

**Base URL:** `https://seats.aero/partnerapi`  
**Auth:** `Partner-Authorization: {api_key}` header  
**Key stored in:** `config/seats_aero` Firestore document  
**Plan required:** Seats.aero Pro ($99/month or annual)

**Endpoint used:**
```
GET /search
  ?origin_airport={JFK}
  &destination_airport={LHR}
  &cabin={business}
  &start_date={YYYY-MM-DD}
  &end_date={YYYY-MM-DD}
```

**Used on:** `award-search.html` only

---

### flagcdn.com

**URL:** `https://flagcdn.com/{iso_code}.svg`  
**Auth:** None (public CDN)  
**Used for:** Country flags in nomad.html stamps grid and owner.html countries panel

---

### Unsplash CDN

**URL format:** `https://images.unsplash.com/photo-{id}?w=900&q=80&fit=crop`  
**Auth:** None (permanent CDN URLs — no API key for direct hotlinking)  
**Used for:** Airport hero photos and aircraft fleet photos in nomad.html

These are static hardcoded Unsplash photo IDs chosen to show distinctive visual features of each airport/aircraft. They are permanent CDN URLs that do not expire and require no API key.

---

### Google Fonts

**Used fonts across all pages:**
- `Lora` — primary serif (body text, quotes, italic copy)
- `JetBrains Mono` — monospace (labels, metadata, terminal, code)
- `Bebas Neue` — display (hero titles, section titles, stats)

---

## 10. Owner Dashboard

**URL:** `/owner.html`  
**Access:** Google Sign-In required. UID must exist in `admins` collection.  
**Visible to public:** No — login screen shown to unauthenticated users

### Panels

| Panel | Access | Description |
|---|---|---|
| Dashboard | All admins | Stats overview, quick actions |
| Flights | Editor+ | Bulk Excel/CSV import, manual add, FR24 enrichment, full log |
| Cafes | Editor+ | Add/manage cafe entries |
| Experiences | Editor+ | Film reel entries (adventures/people/moments tabs) |
| Adventures | Editor+ | Raw adventure log |
| People | Editor+ | People met traveling |
| Photography | Editor+ | Upload to Firebase Storage, manage photo library |
| Trips | Editor+ | Named trips (hub for all other content) |
| Countries | Editor+ | Globe data — ISO code as document ID |
| Page Content | Editor+ | Edit live copy (hero, quotes) |
| Travel Plans | Editor+ | Wishlist/upcoming trips |
| Config & API Keys | Super-admin | All API keys + site settings |
| Journal | Super-admin | Private notes |
| User Management | Super-admin | Add/remove admin users |

### Flights import

Accepts `.xlsx`, `.xls`, `.csv`. Column headers auto-detected (case-insensitive, partial match). Expected columns:

```
Flight Number  |  From  |  To  |  Date  |  Time  |  Aircraft Type  |  Distance (Miles)
```

From/To can be in `City (IATA)` format (e.g. `New Delhi (DEL)`) or bare IATA code.  
Distances calculated via haversine if not provided — 70+ airport coordinates built in.  
Optional FR24 enrichment runs per-flight after save (requires saved FR24 token).

### Countries panel

- Loads from `countries` collection (one doc per ISO code)
- Inline status toggle: Visited / Transit / Wishlist
- Emoji picker (❤️ 😍 📸 🙉 😀)
- Notes inline edit
- SAVE ALL writes all changes as `setDoc` with ISO code as document ID
- Search + filter by status

### Photography upload flow

1. Select/drag photo (max 10MB — jpg, png, webp)
2. Fill: title, story, location, country code, date, element, featured flag, EXIF
3. Click UPLOAD & SAVE
4. File uploads to Firebase Storage `photos/{timestamp}_{slug}.{ext}`
5. `getDownloadURL` retrieves permanent URL
6. Document saved to `photos` collection with `image_url` = Storage URL
7. Live on `photography.html` immediately

---

## 11. Authentication & Roles

### Sign-in flow

1. User clicks "Sign in with Google" on `owner.html`
2. Firebase Auth Google popup
3. On success: check `admins/{uid}` in Firestore
4. If document missing → access denied, signed out
5. If document exists → role loaded from `admins/{uid}.role`
6. UI adapts: Journal and Users panels hidden from non-super-admins, Config panel hidden from non-super-admins

### Adding a new admin

The new user must attempt sign-in first (fails), which creates their Firebase Auth account. Find their UID in Firebase console → Authentication → Users. Then in the dashboard → Users panel, paste their UID, email, name, and select role.

### Roles

```
super-admin → full access (all panels, journal, config, user management)
editor      → content access (flights, cafes, experiences, adventures, people,
               photos, trips, countries, travel_plans, page content)
viewer      → read-only (dashboard stats only — no write access anywhere)
```

---

## 12. Design System

Consistent across all pages except `owner.html` (dark dashboard) and `photography.html` (dark gallery).

### Colour tokens (nomad/profile/home pages)

```css
--paper:  #F6F1E9   /* warm parchment — page background */
--paper2: #EDE7DC   /* slightly darker parchment — cards, sections */
--paper3: #E3DBCD   /* borders, dividers */
--ink:    #1C1109   /* near-black ink — primary text */
--ink2:   #3D2B1A   /* warm dark brown — body text */
--muted:  #7A6A54   /* warm medium — labels, metadata */
--faint:  rgba(28,17,9,0.09)  /* barely-there dividers */
--teal:   #2E8B7A   /* primary accent — links, eyebrows, highlights */
--gold:   #C8913A   /* secondary accent — important callouts */
--amber:  #D4792A   /* warm orange — proof-of-aliveness word, CTAs */
--dark:   #0C0804   /* pure dark — intro, closing section, globe */
```

### Colour tokens (owner.html dashboard)

```css
--bg:    #0d1117   /* main background */
--bg2:   #161b22   /* sidebar, cards */
--bg3:   #1e2738   /* inputs, secondary surfaces */
--teal:  #5bc0be   /* primary accent */
--gold:  #f59e0b   /* warnings, editor badge */
--red:   #f85149   /* errors, delete */
--green: #3fb950   /* success */
```

### Typography

| Token | Family | Usage |
|---|---|---|
| `--disp` | Bebas Neue | Hero titles, section titles, stats numbers, IATA codes |
| `--serif` | Lora | Body text, quotes, journal entries, cafe stories |
| `--mono` | JetBrains Mono | Labels, metadata, eyebrows, terminal, code |

### Spacing & layout principles

- Max content width: `1120px` for most sections
- Section padding: `0 56px` desktop, `0 20px` mobile
- All sections fluid — no fixed heights
- Dark sections (globe, closing poem) use torn-paper edge CSS `clip-path` to transition from light page background

---

## 13. Setup & First-Time Bootstrap

### Prerequisites

1. Firebase project `nomad-404` created
2. Firestore database created (production mode)
3. Firebase Authentication enabled with Google provider
4. Firebase Storage initialised (Firebase console → Storage → Get Started)
5. GitHub repository with GitHub Pages enabled

### Step-by-step setup

**1. Deploy Firestore rules**

Paste `firestore.rules` into Firebase console → Firestore → Rules → Publish.

**2. Create super-admin**

Deploy `bootstrap-admin.html` to GitHub Pages. Open it, sign in with your Google account. It creates `admins/{your_uid}` with `role: "super-admin"`. Delete the file immediately after.

**3. Seed all collections**

Deploy `bootstrap-all.html` to GitHub Pages. Open it, sign in. It seeds:
- 53 countries → `countries` collection
- 116 flights → `flights` collection
- 5 trips → `trips` collection
- 6 cafes → `cafes` collection
- 7 adventures → `adventures` collection
- 11 experiences → `experiences` collection
- 2 people → `people` collection

Delete the file immediately after — it contains all travel data inline.

**4. Configure Firebase Storage CORS**

```bash
gcloud config set project nomad-404
gcloud storage buckets update gs://nomad-404.firebasestorage.app --cors-file=cors.json
```

**5. Add API keys**

Open `owner.html` → Config & API Keys panel:
- FR24 bearer token → service: FR24, type: Bearer Token
- Seats.aero API key → service: Seats.aero, type: API Key

**6. Deploy all HTML files**

```bash
git add *.html cors.json firestore.rules
git commit -m "initial deploy"
git push origin main
```

---

## 14. Common Tasks

### Add a new flight

`owner.html` → Flights → Add Single Flight form → fill IATA codes, date, airline → SAVE FLIGHT → optionally click ENRICH from FR24 to get tail number, GPS track, gate/terminal data.

### Rotate an API key

`owner.html` → Config & API Keys → find the service row → click EDIT → paste new value → SAVE KEY. Updates Firestore immediately. In-memory key refreshed for FR24 without page reload.

### Add a new country

`owner.html` → Countries → Add Country form → fill name, ISO code, lat/lon → ADD COUNTRY → scroll down to find it in list → set status, emoji, notes → SAVE ALL.

### Upload a photo

`owner.html` → Photography → drag photo → fill title, story ("what nature said"), location, element, date → UPLOAD & SAVE. Live on `photography.html` immediately.

### Write a journal entry

`owner.html` → Journal (super-admin only) → fill title, body, mood, location → SAVE ENTRY.

### Check if CORS is working

`owner.html` → Config & API Keys → Firebase Project Info → click CHECK CORS. Green = working, Red = need to apply cors.json via gcloud.

### Enrich a flight with FR24 data

`owner.html` → Flights → scroll to flight in log → click ENRICH button. Requires saved FR24 token in Config panel. Adds tail number, aircraft type, gate/terminal, GPS track.

---

## 15. Troubleshooting

### "Missing or insufficient permissions" on nomad.html

Firestore rules haven't been published, or were published before `flights` was changed to public read. Go to Firebase console → Firestore → Rules → verify `flights`, `cafes`, `countries`, `adventures`, `experiences` all have `allow read: if true` → Publish.

### Globe not loading / data not appearing

Open browser DevTools → Console. You should see:
```
✓ countries: 53 docs
✓ flights: 116 docs
✓ cafes: 6 docs
✓ experiences: 11 docs
```
Any `✗` line shows which collection failed and the Firestore error code (`permission-denied`, `unavailable`, etc.).

### Photos not uploading (CORS error)

```
Access to XMLHttpRequest blocked by CORS policy
```

Run:
```bash
gcloud config set project nomad-404
gcloud storage buckets update gs://nomad-404.firebasestorage.app --cors-file=cors.json
```

Or use Google Cloud Shell at console.cloud.google.com (no install needed).

### "0 buckets" in Cloud Shell

You're on the wrong GCP project. Run `gcloud config set project nomad-404` first. If still 0 buckets, Firebase Storage hasn't been initialised — go to Firebase console → Storage → Get Started.

### FR24 enrichment returns no data

- Verify FR24 token is saved in Config panel
- FR24 historic data requires the flight to have already departed
- Sandbox plan has rate limits — allow 300ms between calls (the dashboard does this automatically)
- Some older/regional flights have no ADS-B track data — enrichment will still return aircraft type and terminals if available

### Award search not returning results

- Verify Seats.aero key is saved in Config panel
- Check that the Pro subscription is active at seats.aero
- Some route combinations have no award space — try different dates or cabin class

### Boarding pass stack not showing

The stack peek only appears when there are more than 4 flights in Firestore. If you have ≤ 4 flights loaded, no stack is shown (by design).

### Bootstrap files accidentally committed

Remove them immediately:
```bash
git rm bootstrap-all.html bootstrap-admin.html
git commit -m "remove: bootstrap files"
git push origin main
```

Change your FR24 and Seats.aero API keys immediately if either bootstrap file was publicly accessible, as they contain flight data. API keys are in Firestore, not the bootstrap files, so they aren't directly exposed — but rotate as a precaution.

---

*Built with care. Every stamp earned.*
