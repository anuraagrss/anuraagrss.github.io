#!/usr/bin/env node
/**
 * attach-iceland-photo.js — upload the Iceland sunrise illustration to Storage
 * and attach it to the Hvalfjörður moment doc.
 *
 * Run from functions/:  node attach-iceland-photo.js
 */
'use strict';

const admin  = require('firebase-admin');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const SRC_DIR  = '/Users/arey/Downloads';
// Resolve programmatically — the filename contains U+202F narrow no-break
// spaces, which silently break a hand-typed literal path.
const SRC_NAME = fs.readdirSync(SRC_DIR)
  .find(f => f.startsWith('ChatGPT Image Sep 7, 2026') && f.endsWith('.png'));
if (!SRC_NAME) { console.error('✗ source image not found in', SRC_DIR); process.exit(1); }
const SRC = path.join(SRC_DIR, SRC_NAME);

const BUCKET  = 'nomad-404.firebasestorage.app';
const DEST    = 'experiences/iceland-hvalfjordur-sunrise.png';
const DOC_ID  = 'tkX2a4p4usZshU4pDYET';

admin.initializeApp({
  credential: admin.credential.cert(require('./service-account.json')),
  storageBucket: BUCKET
});
const db = admin.firestore();
db.settings({ preferRest: true });

(async () => {
  const stat = fs.statSync(SRC);
  console.log('source:', SRC_NAME, `(${(stat.size / 1024 / 1024).toFixed(2)} MB)`);

  const token = crypto.randomUUID();
  await admin.storage().bucket().upload(SRC, {
    destination: DEST,
    metadata: {
      contentType: 'image/png',
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });

  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/`
            + encodeURIComponent(DEST) + `?alt=media&token=${token}`;

  await db.collection('experiences').doc(DOC_ID).update({
    img: url,
    img_storage_path: DEST
  });

  console.log('✓ uploaded to', DEST);
  console.log('✓ doc updated:', DOC_ID);
  console.log(url);
  process.exit(0);
})();
