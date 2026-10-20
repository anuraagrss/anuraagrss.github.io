#!/usr/bin/env node
/**
 * upload-cafes.js — Bulk upload cafe/place entries to Firestore `cafes` collection,
 * with their source photos uploaded to Firebase Storage under cafes/.
 *
 * Reads /tmp/cafes_data.json (array of cafe docs + _source_files list of jpeg
 * filenames living in /Users/arey/Desktop/untitled folder/).
 *
 * ONE-TIME SETUP: functions/service-account.json must already exist (it does,
 * same one used by upload-photos.js).
 *
 * Run from the functions/ directory:
 *   node upload-cafes.js
 */

'use strict';

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

// ── CONFIG ──────────────────────────────────────────────────────────────────
const DATA_FILE   = '/tmp/cafes_data.json';
const PHOTOS_DIR  = '/Users/arey/Desktop/untitled folder';
const SA_PATH     = path.join(__dirname, 'service-account.json');
const BUCKET       = 'nomad-404.firebasestorage.app';
const STORAGE_PATH = 'cafes';
const COLLECTION   = 'cafes';
// ────────────────────────────────────────────────────────────────────────────

if (!fs.existsSync(SA_PATH)) {
  console.error(`\n✗  Service account key not found at:\n   ${SA_PATH}\n`);
  process.exit(1);
}
if (!fs.existsSync(DATA_FILE)) {
  console.error(`\n✗  Data file not found at:\n   ${DATA_FILE}\n`);
  process.exit(1);
}

admin.initializeApp({
  credential:    admin.credential.cert(JSON.parse(fs.readFileSync(SA_PATH))),
  storageBucket: BUCKET
});
const db     = admin.firestore();
const bucket = admin.storage().bucket();

function slugify(name) {
  return (name || 'cafe').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'cafe';
}

function storageUrl(destPath) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(destPath)}?alt=media`;
}

async function uploadOneImage(srcPath, nameSlug, i) {
  const rand = Math.random().toString(36).slice(2, 8);
  const destPath = `${STORAGE_PATH}/${Date.now()}_${nameSlug}_${i}_${rand}.jpg`;
  await bucket.upload(srcPath, {
    destination: destPath,
    metadata: { contentType: 'image/jpeg' }
  });
  await bucket.file(destPath).makePublic();
  return { url: storageUrl(destPath), path: destPath };
}

async function main() {
  const cafes = JSON.parse(fs.readFileSync(DATA_FILE));
  console.log(`\n☕  Starting bulk cafe upload — ${cafes.length} entries → ${BUCKET}\n`);

  let done = 0, failed = 0;

  for (let i = 0; i < cafes.length; i++) {
    const cafe = cafes[i];
    const tag  = `[${String(i + 1).padStart(2, '0')}/${cafes.length}]`;
    const slug = slugify(cafe.name);

    process.stdout.write(`  ⬆  ${tag} ${cafe.name} (${cafe.city || '?'}) … `);

    try {
      const files = cafe._source_files || [];
      const images = [], image_paths = [];

      for (let j = 0; j < files.length; j++) {
        const srcPath = path.join(PHOTOS_DIR, files[j]);
        if (!fs.existsSync(srcPath)) {
          console.log(`\n     ⚠  missing source file: ${files[j]}`);
          continue;
        }
        const { url, path: storedPath } = await uploadOneImage(srcPath, slug, j);
        images.push(url);
        image_paths.push(storedPath);
      }

      const doc = {
        name:        cafe.name || null,
        type:        cafe.type || null,
        city:        cafe.city || null,
        country:     cafe.country || null,
        ordered:     cafe.ordered || null,
        rating:      cafe.rating != null ? String(cafe.rating) : null,
        vibe:        cafe.vibe || null,
        story:       cafe.story || null,
        images,
        image_paths,
        trip_id:     cafe.trip_id || null,
        addedAt:     admin.firestore.FieldValue.serverTimestamp(),
        addedBy:     'bulk-upload-script'
      };

      await db.collection(COLLECTION).add(doc);
      console.log(`✓ (${images.length} photo${images.length === 1 ? '' : 's'})`);
      done++;
    } catch (e) {
      console.log(`✗  ${e.message}`);
      failed++;
    }
  }

  console.log(`
✅  Cafe upload complete
    ${done} created   ${failed} failed

    Nomad page → https://404-nomad.com/nomad.html
`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
