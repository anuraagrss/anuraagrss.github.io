#!/usr/bin/env node
/**
 * read-proofs.js — read the proofs strangers left at the bench, and keep the ones you want.
 *
 * Run from functions/:
 *   node read-proofs.js                 list every proof still waiting to be read
 *   node read-proofs.js keep <id> ...   approve: it starts showing at the bench, faint
 *   node read-proofs.js drop <id> ...   delete it
 */
'use strict';

const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./service-account.json')) });
const db = admin.firestore();
db.settings({ preferRest: true });

(async () => {
  const [cmd, ...ids] = process.argv.slice(2);
  const col = db.collection('proofs');
  if (cmd === 'keep' || cmd === 'drop') {
    for (const id of ids) {
      if (cmd === 'keep') await col.doc(id).update({ approved: true });
      else await col.doc(id).delete();
      console.log(`✓ ${cmd === 'keep' ? 'kept' : 'dropped'} ${id}`);
    }
  } else {
    const snap = await col.where('approved', '==', false).get();
    if (snap.empty) console.log('nothing waiting.');
    snap.docs
      .sort((a, b) => (a.data().createdAt?.seconds || 0) - (b.data().createdAt?.seconds || 0))
      .forEach(d => {
        const p = d.data(), when = p.createdAt ? new Date(p.createdAt.seconds * 1000).toISOString().slice(0, 16).replace('T', ' ') : '';
        console.log(`\n${d.id}  ·  ${p.page}  ·  ${when}\n  "${p.text}"`);
      });
    console.log('\nkeep:  node read-proofs.js keep <id>   ·   drop:  node read-proofs.js drop <id>');
  }
  process.exit(0);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
