#!/usr/bin/env node
/**
 * upload-photos.js — Bulk upload 86 photos to Firebase Storage + Firestore
 *
 * ONE-TIME SETUP:
 *   1. Firebase Console → Project Settings → Service Accounts tab
 *      → "Generate new private key" → save as:
 *      functions/service-account.json   (already gitignored)
 *   2. Run from the functions/ directory:
 *      node upload-photos.js
 *
 * Re-run safe: already-uploaded docs are detected and skipped.
 */

'use strict';

const admin  = require('firebase-admin');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const { execSync } = require('child_process');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const PHOTOS_DIR    = path.join(os.homedir(), 'Downloads', 'iCloud Photos from Swami sai anuraag Ravulaparthi');
const JSON_FILE     = path.join(PHOTOS_DIR, 'photo_data.json');
const SA_PATH       = path.join(__dirname, 'service-account.json');
const BUCKET        = 'nomad-404.firebasestorage.app';
const STORAGE_PATH  = 'photos';   // folder inside the bucket
const COLLECTION    = 'photos';   // Firestore collection
// ─────────────────────────────────────────────────────────────────────────────

if (!fs.existsSync(SA_PATH)) {
  console.error(`\n✗  Service account key not found at:\n   ${SA_PATH}\n`);
  console.error('   Firebase Console → Project Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

admin.initializeApp({
  credential:    admin.credential.cert(JSON.parse(fs.readFileSync(SA_PATH))),
  storageBucket: BUCKET
});
const db     = admin.firestore();
const bucket = admin.storage().bucket();

// ── HEIC → JPEG via macOS sips ───────────────────────────────────────────────
function toJpeg(srcPath, key) {
  const ext = path.extname(srcPath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return { path: srcPath, temp: false };
  const tmp = path.join(os.tmpdir(), `${key}_upload.jpg`);
  execSync(`sips -s format jpeg "${srcPath}" --out "${tmp}" -s formatOptions 90`, { stdio: 'pipe' });
  return { path: tmp, temp: true };
}

// ── FIND SOURCE FILE ──────────────────────────────────────────────────────────
function findSource(key) {
  for (const ext of ['HEIC', 'heic', 'JPG', 'jpg', 'jpeg', 'JPEG']) {
    const p = path.join(PHOTOS_DIR, `${key}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ── FIREBASE STORAGE URL (public, no token needed) ───────────────────────────
function storageUrl(destPath) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(destPath)}?alt=media`;
}

// ── UPLOAD ONE PHOTO ──────────────────────────────────────────────────────────
async function uploadOne(key, data) {
  const src = findSource(key);
  if (!src) throw new Error(`Source file not found for key: ${key}`);

  const jpeg = toJpeg(src, key);
  const destPath = `${STORAGE_PATH}/${key}.jpg`;

  try {
    await bucket.upload(jpeg.path, {
      destination: destPath,
      metadata: { contentType: 'image/jpeg' }
    });
    await bucket.file(destPath).makePublic();
  } finally {
    if (jpeg.temp && fs.existsSync(jpeg.path)) fs.unlinkSync(jpeg.path);
  }

  return storageUrl(destPath);
}

// ── BUILD FIRESTORE DOC ───────────────────────────────────────────────────────
function buildDoc(data, imageUrl) {
  const exif = data.exif && data.exif.camera !== 'Unknown' ? data.exif : null;
  return {
    title:       data.title       || null,
    story:       data.story       || data.description || null,
    description: data.description || null,
    image_url:   imageUrl,
    location:    data.location    || null,
    country_id:  data.country_id  || null,
    date:        data.date        || null,
    tags:        data.tags        || null,
    element:     data.element     || null,
    featured:    data.featured === true,
    trip_id:     data.trip_id     || null,
    exif:        exif,
    addedAt:     admin.firestore.FieldValue.serverTimestamp(),
    addedBy:     'bulk-upload'
  };
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const { photos } = JSON.parse(fs.readFileSync(JSON_FILE));
  const keys = Object.keys(photos);
  console.log(`\n📸  Starting bulk upload — ${keys.length} photos → ${BUCKET}\n`);

  let done = 0, skipped = 0, failed = 0;

  for (let i = 0; i < keys.length; i++) {
    const key  = keys[i];
    const data = photos[key];
    const tag  = `[${String(i + 1).padStart(2, '0')}/${keys.length}]`;

    // Idempotency: skip if already has a real URL in Firestore
    const docRef  = db.collection(COLLECTION).doc(key);
    const existing = await docRef.get();
    if (existing.exists) {
      const url = existing.data().image_url;
      if (url && url !== 'PENDING_UPLOAD') {
        console.log(`  ⏭  ${tag} Skip (exists): ${data.title}`);
        skipped++;
        continue;
      }
    }

    process.stdout.write(`  ⬆  ${tag} ${data.title} … `);
    try {
      const imageUrl = await uploadOne(key, data);
      await docRef.set(buildDoc(data, imageUrl));
      console.log('✓');
      done++;
    } catch (e) {
      console.log(`✗  ${e.message}`);
      failed++;
    }
  }

  const featuredCount = Object.values(photos).filter(p => p.featured).length;
  console.log(`
✅  Upload complete
    ${done} uploaded   ${skipped} skipped   ${failed} failed
    ${featuredCount} photos marked featured

    Photography page → https://404-nomad.com/photography.html
`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
