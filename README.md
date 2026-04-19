# Anuraag Ravulaparthi — Portfolio & Nomad Site

> A personal portfolio and travel documentation site for an engineer, nomad, and photographer.
> Documenting life across 53+ countries, 116+ flights, 7 continents.
>
> *Inspired by Javed Akhtar's poem — Toh Zinda Ho Tum.*

---

## Quick Links

| Page | What it is |
|---|---|
| `index.html` | Entry point — split hero with terminal navigation |
| `nomad.html` | Travel page — globe, flights, experiences, cafes, countries |
| `Profile.html` | Professional portfolio — career, projects, AI chat |
| `Professional.html` | About page — story, skills |
| `photography.html` | Photography gallery — darkroom-style, element chapters |
| `Contact.html` | Contact form + social links |
| `award-search.html` | Award flight search tool (Seats.aero API) |
| `owner.html` | Private dashboard — Firebase Auth protected |

---

## Table of Contents

1. [Project Structure](#1-project-structure)
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

## 1. Project Structure

```
CC/
│
├── index.html                  ← Entry point
├── nomad.html                  ← Travel page
├── Profile.html                ← Professional portfolio
├── Professional.html           ← About page
├── photography.html            ← Photography gallery
├── Contact.html                ← Contact page
├── award-search.html           ← Award flight search
├── owner.html                  ← Private dashboard
├── enrich-historical.html      ← One-time flight enrichment tool
├── photo-uploader.html         ← Bulk photo upload tool
│
├── css/                        ← All stylesheets (one per page)
│   ├── index-styles.css
│   ├── contact.css
│   ├── professional.css
│   ├── profile.css
│   ├── nomad.css
│   ├── owner.css
│   ├── photography.css
│   ├── award-search.css
│   ├── enrich-historical.css
│   ├── photo-uploader.css
│   ├── styles.css
│   └── styles_create.css
│
├── js/                         ← All scripts (one per page)
│   ├── index.js
│   ├── contact.js
│   ├── profile.js
│   ├── nomad.js                ← Globe, flights, experiences, Firebase reads
│   ├── owner-module.js         ← Dashboard logic (Firebase module)
│   ├── photography-module.js   ← Gallery + Firebase reads
│   ├── award-search-module.js  ← Seats.aero search logic
│   ├── enrich-historical-module.js
│   ├── photo-uploader-module.js
│   └── photo-uploader.js
│
├── images/                     ← Local images (avatars, logos, etc.)
├── portfolio-workspace/        ← Separate sub-project
└── README.md
```

**Stack:** Pure HTML/CSS/JS — no framework, no build step, no npm.  
**Backend:** Firebase (Auth, Firestore, Storage).  
**Host:** GitHub Pages.

---

## 2. Architecture

```
GitHub Pages (404-nomad.com)
│
├── HTML pages load CSS from /css/ and JS from /js/
├── Public pages read Firestore directly (no auth)
└── owner.html requires Google Sign-In + admins/{uid} doc

Firebase Backend
├── Authentication     ← Google Sign-In, UID-based admin check
├── Firestore          ← All content data (14 collections)
├── Storage            ← Photography images
└── config collection  ← API keys + site settings
```

**Key data flow rules:**
- Public pages (`nomad.html`, `photography.html`) read Firestore on load — no auth needed
- `owner.html` requires Google Sign-In and a matching `admins` document
- All writes go through `owner.html` — public pages are strictly read-only
- API keys are stored in Firestore `config` collection, never in HTML or JS files

---

## 3. Hosting & Deployment

**Host:** GitHub Pages  
**Domain:** `404-nomad.com`  
**Repo:** Push files to `main` branch root — goes live in ~60 seconds

### Deploy changes

```bash
git add *.html css/ js/ images/
git commit -m "update: describe your change"
git push origin main
```

### Files that must NOT be committed

| File | Why |
|---|---|
| `bootstrap-all.html` | Contains all seeded travel data inline — deploy, run once, delete immediately |
| `bootstrap-admin.html` | Creates super-admin — delete after use |

### Notes

Firebase is not used for hosting — only Auth, Firestore, and Storage. GitHub Pages handles all static file serving.

---

## 4. Firebase Configuration

| Setting | Value |
|---|---|
| Project ID | `nomad-404` |
| Auth Domain | `nomad-404.firebaseapp.com` |
| Storage Bucket | `nomad-404.firebasestorage.app` |
| SDK Version | `10.12.0` (CDN via gstatic.com) |

The Firebase config is safe to be public — security is enforced by Firestore Security Rules and Storage Rules, not by hiding the config.

### Services used

| Service | Used for |
|---|---|
| Firebase Auth | Google Sign-In for owner dashboard |
| Firestore | All content data (flights, cafes, countries, photos, etc.) |
| Firebase Storage | Photography image hosting |

---

## 5. Terminal Component

A pull-tab terminal drawer (`TERMINAL` button on the right edge) is present on every public page. It is built as a shared component so commands and engine logic are maintained in one place.

| File | Purpose |
|---|---|
| `js/terminal.js` | Shared engine — call `initTerminal(config)` from each page's JS |
| `css/terminal.css` | Shared dark drawer styles (trigger, backdrop, body, syntax colours) |

Page-specific scripts call `initTerminal()` and pass a config object:

```js
initTerminal({
  bootLines:    [[delayMs, html], ...],  // or a function () => [...] for lazy data
  bootChips:    [primaryArray, secondaryArray],
  pageHelp:     { title: 'THIS PAGE', items: [[cmd, desc], ...] },
  pageLS:       [['cls', 'html'], ...],  // or a function () => [...]
  pageCommands: { cmdName: function () { ... } },
});
```

### Commands — all pages

| Category | Command | What it does |
|---|---|---|
| **Navigate** | `engineer` | Go to Profile.html |
| | `nomad` | Go to nomad.html |
| | `about` | Go to Professional.html |
| | `contact` | Go to Contact.html |
| | `home` | Go to index.html |
| | `profile` | Alias for `engineer` |
| **Explore** | `whoami` | Who is Anuraag — role, stack, status |
| | `ls` | Site directory listing |
| | `skills` | Animated skill matrix (progress bars) |
| | `story` | Career timeline as git log |
| | `awards` | Recognition and notable wins |
| | `now` | What he's currently working on |
| | `quote` | Rotating travel / engineering quote |
| | `fun` | Random fact — run again for another |
| | `clear` | Clear terminal output |
| **Action** | `resume` | Open resume PDF |
| | `hire` / `work` | Personalised pitch + link to contact |
| **Easter eggs** | `hello` / `hi` / `hey` | Greeting response |
| | `pwd` | Print working directory |
| | `date` | Current date and time |
| | `ping` | Latency check easter egg |
| | `sudo` | Nice try |
| | `exit` | You can't leave |
| | `man` | No manual exists for this person |

### Page-specific commands

| Page | Command | What it does |
|---|---|---|
| **nomad.html** | `globe` | Scroll to 3D globe |
| | `flights` | Scroll to flight log |
| | `stories` | Scroll to travel experiences |
| | `cafes` | Scroll to favourite cafes |
| | `countries` | Scroll to country flag grid |
| **Profile.html** | `projects` | Scroll to project showcase |
| | `impact` | Scroll to impact metrics |
| | `chat` | Open and focus the AI assistant |
| **Professional.html** | `facts` | Scroll to random facts section |
| | `skills` | Scroll to skills bar chart |
| **Contact.html** | `email` | Open email client directly |
| | `message` | Scroll to contact form |

---

## 6. Pages Reference

### index.html

Entry point. Split avatar hero — engineer left, nomad right. Terminal emulator in a pull-up drawer. Hover either half to switch colour theme live.

**CSS:** `css/index-styles.css` + `css/terminal.css` · **JS:** `js/terminal.js` + `js/index.js`

---

### nomad.html

The main travel page. Reads all data from Firestore on load. No authentication required.

**Sections:**
1. **Intro** — full-screen darkroom sequence with tear-paper transition
2. **Hero** — `THE WORLD IS PROOF / I AM ALIVE.` with live Firestore stats
3. **Globe** — interactive Three.js sphere with visited countries + flight routes
4. **Origin postcard** — styled physical postcard addressed to "Anuraag, age 17"
5. **Facts strip** — live stats (continents, countries, flights, miles, airlines)
6. **Aircraft fleet** — blueprint cards for every aircraft type flown
7. **Boarding passes** — latest 4 shown; remaining stacked as a visual card deck
8. **Full flight log** — collapsible complete table
9. **Experiences film reel** — Adventures / People / Moments tabs, Polaroid-style
10. **Airports** — photo mosaic of most-visited airports
11. **Cafes** — thermal receipt cards with story reveal
12. **Countries** — postage stamp grid with flag and visited status
13. **Closing poem** — Javed Akhtar's *Toh Zinda Ho Tum* in Urdu + English

**Firestore reads:** `countries`, `flights`, `cafes`, `experiences` — all parallel via `Promise.allSettled`  
**CSS:** `css/nomad.css` + `css/terminal.css` · **JS:** `js/terminal.js` + `js/nomad.js` (Firebase module)  
**External deps:** Three.js r128 (cdnjs), Google Fonts, flagcdn.com, Unsplash CDN

---

### Profile.html

Professional engineering portfolio. Static content — no Firestore reads.

**Sections:** Hero, Metrics, Logo rail, Identity card, Impact cards (flip), Projects carousel, Education, AI chat  
**AI chat:** Uses Claude API (`claude-sonnet-4-20250514`) with a grounded system prompt — only answers based on real career data  
**CSS:** `css/profile.css` + `css/terminal.css` · **JS:** `js/terminal.js` + `js/profile.js`

---

### Professional.html

About page. Story, random facts, skills bar chart.

**CSS:** `css/professional.css` + `css/terminal.css` · **JS:** `js/terminal.js` (inline `initTerminal` in HTML)

---

### photography.html

Photography gallery. Dark-themed. Reads from `photos` Firestore collection.

**Concept:** Darkroom developing session — photos start near-black and develop to full colour as you scroll past them.

**Sections:** Red safelight intro → Film hero → Chapters by element (ICE → SKY → WATER → FIRE → EARTH) → Fullscreen viewer

**Photo protection:** right-click disabled, drag blocked, long-press disabled on mobile, `pointer-events: none` on images.

**CSS:** `css/photography.css` · **JS:** `js/photography-module.js`

---

### Contact.html

Contact form (mailto handler) + social links (LinkedIn, Polarsteps, Twitter, Gmail).

**CSS:** `css/contact.css` + `css/terminal.css` · **JS:** `js/terminal.js` + `js/contact.js`

---

### award-search.html

Award flight search. Light-themed boarding pass aesthetic.

**API:** Seats.aero Partner API — key loaded from Firestore `config/seats_aero`, never in code  
**Features:** Multi-airport search, cabin filter, program filter, nonstop toggle, sort by miles/date/stops  
**CSS:** `css/award-search.css` · **JS:** `js/award-search-module.js`

---

### owner.html

Private dashboard. Requires Google Sign-In + `admins/{uid}` document in Firestore. Full panel reference in [Section 10](#10-owner-dashboard).

**CSS:** `css/owner.css` · **JS:** `js/owner-module.js`

---

### enrich-historical.html / photo-uploader.html

One-time utility tools. Not linked from the main site.

- `enrich-historical.html` — retroactively enriches flight records via AeroDataBox + OpenSky APIs
- `photo-uploader.html` — bulk photo upload to Firebase Storage with EXIF extraction

---

## 7. Firestore Data Model

### admins/{uid}

Access control. Document ID = Firebase Auth UID.

```js
{
  email: "anuraag@example.com",
  name: "Anuraag",
  role: "super-admin",   // "super-admin" | "editor" | "viewer"
  photoURL: null,
  addedAt: "2024-01-01T00:00:00Z",
  addedBy: "{uid}"
}
```

---

### countries/{ISO_code}

One document per country. ID = ISO 2-letter code (e.g. `IN`, `US`). Special: `CL_EI` for Easter Island.

```js
{
  id: "IN",
  name: "India",
  lat: 20.6, lon: 78.9,
  status: "visited",     // "visited" | "transiting" | "wishlist"
  emoji: "❤️",
  notes: "Home",
  visited_year: null
}
```

---

### flights/{auto_id}

```js
{
  // Core fields
  flight_number: "EK 202",
  airline: "Emirates",
  from: "DEL", from_city: "New Delhi",
  to: "DXB",   to_city: "Dubai",
  date: "2024-03-15", time: "02:20",
  cabin: "Economy", seat: "34A",
  aircraft_type: "Boeing 777-300ER",
  distance_miles: 1200,

  // Added by AeroDataBox enrichment
  tail_number: "A6-EGE",
  duration_mins: 195,
  dep_terminal: "3", dep_gate: "C22",
  dep_scheduled: "02:20", dep_actual: "02:28",
  arr_terminal: "3", arr_gate: "A14",
  runway_dep: "28R", runway_arr: "12L",
  flight_path: [{ lat: 28.55, lon: 77.1, alt: 0, spd: 0 }, ...],

  addedAt: Timestamp, addedBy: "{uid}", source: "import"
}
```

---

### trips/{auto_id}

Named trips — referenced by `trip_id` on other documents.

```js
{
  title: "South America Grand Loop",
  date_from: "2022-11-01", date_to: "2023-01-15",
  status: "done",   // "done" | "upcoming" | "planning"
  notes: "75 days. Inca Trail, Easter Island, Patagonia.",
  addedAt: Timestamp, addedBy: "{uid}"
}
```

---

### cafes/{auto_id}

```js
{
  name: "Onibus Coffee", type: "Specialty Coffee",
  city: "Tokyo", country: "JP",
  ordered: "Single origin pour-over", rating: "★★★★★",
  vibe: "Minimalist timber interior…",
  story: "Found this tucked into a backstreet…",
  trip_id: null, addedAt: Timestamp, addedBy: "{uid}"
}
```

---

### experiences/{auto_id}

Film reel entries for `nomad.html`.

```js
{
  tab: "adventures",   // "adventures" | "people" | "moments"
  label: "SKYDIVE",   // ≤12 chars, shown on film frame
  loc: "DUBAI, UAE",
  title: "Jump out of a plane — twice.",
  story: "<p>HTML content…</p>",
  img: "images/skydive.jpeg",
  trip_id: null, addedAt: Timestamp, addedBy: "{uid}"
}
```

---

### photos/{auto_id}

Used by `photography.html`.

```js
{
  title: "Sunrise at Ahu Tongariki",
  story: "4:30am alarm. The silence was the loudest…",
  image_url: "https://firebasestorage.googleapis.com/…",
  location: "Easter Island, Chile", country_id: "CL",
  date: "2023-03-21",
  element: "fire",   // "water" | "sky" | "earth" | "ice" | "fire"
  featured: true,    // used as hero on photography.html
  exif: { camera: "Sony A7III", lens: "24-70mm f/2.8", settings: "f/8 · 1/250s · ISO 400" },
  trip_id: null, addedAt: Timestamp, addedBy: "{uid}"
}
```

*Element order on photography.html: ICE → SKY → WATER → FIRE → EARTH*

---

### Other collections

| Collection | Used for |
|---|---|
| `adventures/{id}` | Raw adventure log (skydives, treks, etc.) |
| `people/{id}` | People met while traveling |
| `travel_plans/{id}` | Wishlist / upcoming / booked trips |
| `journal/{id}` | Private notes — super-admin only, never public |
| `content/{field}` | Live page copy editable from dashboard |
| `config/{service}` | API keys + site settings — super-admin only |

---

## 8. Firestore Security Rules

```
Collection          Read                Write
──────────────────────────────────────────────────
admins              own doc or super    super-admin
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

**Role hierarchy:** `super-admin` > `editor` > `viewer`

**Deploy rules:**
```bash
firebase deploy --only firestore:rules
```

Or paste `firestore.rules` into Firebase console → Firestore → Rules → Publish.

---

## 9. Firebase Storage

**Bucket:** `nomad-404.firebasestorage.app`  
**Upload path:** `photos/{timestamp}_{slug}.{ext}`

### CORS setup (required for uploads to work)

```bash
gcloud config set project nomad-404
gcloud storage buckets update gs://nomad-404.firebasestorage.app --cors-file=cors.json
```

**cors.json** allows: `https://404-nomad.com`, `https://www.404-nomad.com`, `http://localhost`

> If `gcloud storage buckets list` returns 0 results, go to Firebase console → Storage → Get Started to initialise the bucket first.

### Storage rules

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

---

## 10. External APIs

### Seats.aero

**Base URL:** `https://seats.aero/partnerapi`  
**Auth:** `Partner-Authorization: {api_key}` header  
**Key stored in:** `config/seats_aero` Firestore document  
**Plan required:** Seats.aero Pro  
**Used on:** `award-search.html`

```
GET /search?origin_airport=JFK&destination_airport=LHR&cabin=business&start_date=YYYY-MM-DD
```

---

### AeroDataBox

**URL:** `https://aerodatabox.p.api.market/flights/number/{fn}/{date}`  
**Auth:** `x-magicapi-key` header  
**Used on:** `enrich-historical.html` — retroactive flight enrichment only

---

### Planespotters

**URL:** `https://api.planespotters.net/pub/photos/reg/{tail_number}`  
**Auth:** None (public API)  
**Used for:** Aircraft photos in dashboard flight log

---

### Google Fonts

| Font | Usage |
|---|---|
| `Lora` | Body text, quotes, italic copy |
| `JetBrains Mono` | Labels, metadata, terminal |
| `Bebas Neue` | Hero titles, section titles, stats |
| `DM Sans` | Profile page body text |

---

### Other CDNs

| Service | Used for |
|---|---|
| Three.js r128 (cdnjs) | Globe on `nomad.html` |
| flagcdn.com | Country flags |
| Unsplash CDN | Airport + aircraft photos (static permanent URLs, no key needed) |

---

## 11. Owner Dashboard

**URL:** `/owner.html`  
**Access:** Google Sign-In required. UID must exist in `admins` collection.

### Panels

| Panel | Who can access | What it does |
|---|---|---|
| Dashboard | All admins | Stats overview, quick actions |
| Flights | Editor+ | Import Excel/CSV, manual add, enrichment, full log |
| Cafes | Editor+ | Add and manage cafe entries |
| Experiences | Editor+ | Film reel entries for nomad.html |
| Adventures | Editor+ | Raw adventure log |
| People | Editor+ | People met while traveling |
| Photography | Editor+ | Upload photos to Firebase Storage |
| Trips | Editor+ | Named trip management |
| Countries | Editor+ | Globe data — ISO code as document ID |
| Page Content | Editor+ | Edit live hero copy and quotes |
| Travel Plans | Editor+ | Wishlist and upcoming trips |
| Config & API Keys | Super-admin | All API keys + site settings |
| Journal | Super-admin | Private notes — never public |
| User Management | Super-admin | Add or remove admin users |

### Flights import

Accepts `.xlsx`, `.xls`, `.csv`. Expected columns:

```
Flight Number | From | To | Date | Time | Aircraft Type | Distance (Miles)
```

- From/To accepts `City (IATA)` format (e.g. `New Delhi (DEL)`) or bare IATA code
- Distances calculated via haversine if not provided — 70+ airport coordinates built in
- Optional AeroDataBox enrichment runs per-flight after save

### Photography upload flow

1. Drag or select a photo (max 10MB — jpg, png, webp)
2. Fill: title, story, location, country, date, element, featured flag
3. Click **UPLOAD & SAVE**
4. File uploads to Firebase Storage → URL saved to `photos` collection
5. Live on `photography.html` immediately — no rebuild needed

---

## 12. Authentication & Roles

### Sign-in flow

1. User clicks "Sign in with Google"
2. Firebase Auth Google popup
3. On success: check `admins/{uid}` in Firestore
4. If missing → access denied, signed out
5. If found → role loaded, UI panels shown/hidden accordingly

### Roles

| Role | Access |
|---|---|
| `super-admin` | Everything — including Journal, Config, User Management |
| `editor` | All content panels (flights, cafes, photos, countries, etc.) |
| `viewer` | Dashboard stats only — no writes |

### Adding a new admin

The new user signs in first (will be denied). Find their UID in Firebase console → Authentication → Users. Then in the dashboard → Users panel, add their UID, email, name, and role.

---

## 13. Design System

### Colour tokens — nomad / profile pages (light)

```css
--paper:  #F6F1E9   /* warm parchment background */
--paper2: #EDE7DC   /* cards, sections */
--paper3: #E3DBCD   /* borders, dividers */
--ink:    #1C1109   /* near-black primary text */
--ink2:   #3D2B1A   /* warm brown body text */
--muted:  #7A6A54   /* labels, metadata */
--teal:   #2E8B7A   /* primary accent */
--gold:   #C8913A   /* secondary accent */
--amber:  #D4792A   /* CTAs, proof word */
--dark:   #0C0804   /* intro, globe, closing section */
```

### Colour tokens — owner dashboard (dark)

```css
--bg:    #0d1117
--bg2:   #161b22
--bg3:   #1e2738
--teal:  #5bc0be
--gold:  #f59e0b
--red:   #f85149
--green: #3fb950
```

### Typography

| Variable | Font | Usage |
|---|---|---|
| `--disp` | Bebas Neue | Hero titles, stats, IATA codes |
| `--serif` | Lora | Body text, quotes, cafe stories |
| `--mono` | JetBrains Mono | Labels, eyebrows, terminal, metadata |

### Layout

- Max content width: `1120px`
- Section padding: `0 56px` desktop → `0 20px` mobile
- Dark sections use torn-paper `clip-path` edges to transition from light backgrounds

---

## 14. Setup & First-Time Bootstrap

### Prerequisites

1. Firebase project `nomad-404` created
2. Firestore database created (production mode)
3. Firebase Authentication enabled with Google provider
4. Firebase Storage initialised (Firebase console → Storage → Get Started)
5. GitHub repository with GitHub Pages enabled on `main` branch

### Step-by-step

**1. Deploy Firestore rules**

Paste `firestore.rules` into Firebase console → Firestore → Rules → Publish.

**2. Create super-admin**

Deploy `bootstrap-admin.html` to GitHub Pages. Open it, sign in with your Google account. It creates `admins/{your_uid}` with `role: "super-admin"`. **Delete the file immediately after.**

**3. Seed all collections**

Deploy `bootstrap-all.html`, open it, sign in. It seeds countries, flights, trips, cafes, adventures, experiences, people. **Delete the file immediately after.**

**4. Configure Firebase Storage CORS**

```bash
gcloud config set project nomad-404
gcloud storage buckets update gs://nomad-404.firebasestorage.app --cors-file=cors.json
```

**5. Add API keys via dashboard**

Open `owner.html` → Config & API Keys:
- Seats.aero API key → service: Seats.aero, type: API Key
- AeroDataBox key → service: AeroDataBox, type: API Key (if using enrichment)

**6. Push everything**

```bash
git add *.html css/ js/ images/ cors.json firestore.rules
git commit -m "initial deploy"
git push origin main
```

---

## 15. Common Tasks

**Add a flight**  
`owner.html` → Flights → Add Single Flight → fill IATA codes, date, airline → Save → optionally click Enrich for tail number + GPS track.

**Upload a photo**  
`owner.html` → Photography → drag photo → fill title, story, location, element → Upload & Save. Live immediately.

**Add a country**  
`owner.html` → Countries → Add Country → fill name, ISO code, lat/lon → set status, emoji, notes → Save All.

**Rotate an API key**  
`owner.html` → Config & API Keys → find service → Edit → paste new value → Save Key. In-memory key refreshes without page reload.

**Write a journal entry**  
`owner.html` → Journal (super-admin only) → fill title, body, mood, location → Save Entry.

**Check CORS is working**  
`owner.html` → Config & API Keys → Firebase Project Info → Check CORS. Green = working, Red = run the gcloud command above.

---

## 16. Troubleshooting

### "Missing or insufficient permissions" on nomad.html

Firestore rules haven't been published, or the public collections (`flights`, `cafes`, `countries`, `adventures`, `experiences`) don't have `allow read: if true`. Go to Firebase console → Firestore → Rules → verify and publish.

### Globe not loading

Open DevTools → Console. You should see:
```
✓ countries: 53 docs
✓ flights: 116 docs
✓ cafes: 6 docs
✓ experiences: 11 docs
```
Any `✗` line shows which collection failed and the Firestore error code.

### Photos not uploading (CORS error)

```bash
gcloud config set project nomad-404
gcloud storage buckets update gs://nomad-404.firebasestorage.app --cors-file=cors.json
```

You can also use Google Cloud Shell at `console.cloud.google.com` — no install needed.

### "0 buckets" in Cloud Shell

Run `gcloud config set project nomad-404` first. If still 0, go to Firebase console → Storage → Get Started to initialise the bucket.

### Award search returning no results

- Verify Seats.aero key is saved in Config panel
- Confirm Pro subscription is active at seats.aero
- Some route/date combinations genuinely have no award space — try different dates or cabin

### Boarding pass stack not showing

The stacked card peek only appears when there are more than 4 flights in Firestore. This is by design.

### Bootstrap files accidentally committed

```bash
git rm bootstrap-all.html bootstrap-admin.html
git commit -m "remove: bootstrap files"
git push origin main
```

API keys live in Firestore, not the bootstrap files, so they aren't directly exposed — but rotate as a precaution if the files were publicly accessible.

---

*Built with care. Every stamp earned.*
