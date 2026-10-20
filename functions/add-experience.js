#!/usr/bin/env node
/**
 * add-experience.js — add or update one entry in `experiences`
 * (tab: 'moments' | 'people' | 'adventures') from a JSON spec, optionally
 * uploading its image. Replaces the one-off add-*-moment.js scripts.
 *
 * Run from functions/:  node add-experience.js /path/to/spec.json
 *
 * spec.json:
 * {
 *   "tab":   "moments",                 // moments | people | adventures
 *   "label": "ROUTE 1",                 // short ALL-CAPS caption — also the match key
 *   "title": "The morning I let them all go",
 *   "loc":   "Hvalfjörður, Iceland",
 *   "story": ["paragraph one", "paragraph two"],   // rendered as <p> blocks
 *   "image": "/Users/arey/Desktop/route1.jpg",     // optional local file
 *   "doc_id": "tkX2a4p4usZshU4pDYET"               // optional; else matched by tab + label
 * }
 *
 * Re-run safe: an existing doc (by doc_id, or tab + label) is updated in place.
 */
'use strict';

const admin  = require('firebase-admin');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const BUCKET = 'nomad-404.firebasestorage.app';
const OWNER  = '9aHUiUedgBUn09RH5NnW9lqhX9G2';
// storage.rules only grants public read on these folders — keep it that way.
const FOLDER = { people: 'people', moments: 'experiences', adventures: 'experiences' };
const TYPES  = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const specPath = process.argv[2];
if (!specPath) { console.error('usage: node add-experience.js /path/to/spec.json'); process.exit(1); }
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

for (const k of ['tab', 'label', 'title', 'loc', 'story']) {
  if (!spec[k] || (Array.isArray(spec[k]) && !spec[k].length)) { console.error(`✗ spec is missing "${k}"`); process.exit(1); }
}
if (!FOLDER[spec.tab]) { console.error(`✗ unknown tab "${spec.tab}"`); process.exit(1); }

// macOS screenshot names can hold U+202F instead of a space — resolve by
// listing the folder and comparing with normalised whitespace.
function resolveImage(p) {
  if (fs.existsSync(p)) return p;
  const dir = path.dirname(p), want = path.basename(p).replace(/\s/g, ' ');
  const hit = fs.existsSync(dir) && fs.readdirSync(dir).find(f => f.replace(/\s/g, ' ') === want);
  return hit ? path.join(dir, hit) : null;
}

admin.initializeApp({
  credential: admin.credential.cert(require('./service-account.json')),
  storageBucket: BUCKET
});
const db = admin.firestore();
db.settings({ preferRest: true });   // gRPC hangs in this environment

(async () => {
  const story = (Array.isArray(spec.story) ? spec.story : [spec.story])
    .map(p => p.trim().startsWith('<p') ? p.trim() : `<p>${p.trim()}</p>`)
    .join('\n\n');

  const doc = { tab: spec.tab, label: spec.label, title: spec.title, loc: spec.loc, story, addedBy: OWNER };
  if ('trip_id' in spec) doc.trip_id = spec.trip_id;

  if (spec.image) {
    const src = resolveImage(spec.image);
    if (!src) { console.error('✗ image not found:', spec.image); process.exit(1); }
    const ext  = path.extname(src).toLowerCase();
    if (!TYPES[ext]) { console.error('✗ unsupported image type:', ext, '(convert HEIC with sips first)'); process.exit(1); }
    const stat = fs.statSync(src);
    console.log(`image: ${path.basename(src)}  ${(stat.size / 1024 / 1024).toFixed(2)} MB  modified ${stat.mtime.toISOString()}`);

    const slug  = spec.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const dest  = `${FOLDER[spec.tab]}/${Date.now()}_${slug}${ext}`;
    const token = crypto.randomUUID();
    await admin.storage().bucket().upload(src, {
      destination: dest,
      metadata: { contentType: TYPES[ext], metadata: { firebaseStorageDownloadTokens: token } }
    });
    doc.img = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;
    doc.img_storage_path = dest;
  }

  const col = db.collection('experiences');
  let ref = spec.doc_id ? col.doc(spec.doc_id) : null;
  if (!ref) {
    const hit = await col.where('tab', '==', spec.tab).where('label', '==', spec.label).limit(1).get();
    if (!hit.empty) ref = hit.docs[0].ref;
  }

  if (ref && (await ref.get()).exists) {
    await ref.update(doc);
    console.log(`✓ updated ${spec.tab}:`, ref.id);
  } else {
    if (!('img' in doc)) { doc.img = null; doc.img_storage_path = null; }
    if (!('trip_id' in doc)) doc.trip_id = null;
    doc.addedAt = admin.firestore.FieldValue.serverTimestamp();
    const created = await col.add(doc);
    console.log(`✓ added ${spec.tab}:`, created.id);
  }
  if (doc.img) console.log('  ', doc.img);
  console.log('   story chars:', story.length);
  process.exit(0);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
