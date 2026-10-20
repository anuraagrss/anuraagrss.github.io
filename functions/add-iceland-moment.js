#!/usr/bin/env node
/**
 * add-iceland-moment.js — one-off: the Iceland sunrise moment in
 * experiences (tab: 'moments'). Re-run to update the story in place.
 * Photo added later by the user.
 *
 * Run from functions/:  node add-iceland-moment.js
 */
'use strict';

const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./service-account.json')) });
const db = admin.firestore();
db.settings({ preferRest: true });

const DOC_ID = 'tkX2a4p4usZshU4pDYET';

const story = [
  `In December the sun in Iceland does not come up until almost
11:30 in the morning. Nobody warns you about that. You sit there
at 9am in complete darkness thinking okay. Any minute now. And it
just does not come.`,

  `I was pulled over on the side of Route 1 up near Hvalfjörður.
Car plugged into a charger. Heater running. Wind hitting the side
of the car hard enough to rock it. Black road going both
directions and not one person on it. Not one headlight. Just me
and the dark and a clock that would not move.`,

  `And I sat there and did the thing I always did back then.`,

  `Replayed it. The whole conversation. Every conversation. Built
the argument again from the beginning. Hunting for that one
perfect sentence, the one that would finally make somebody
understand why I did what I did. I had been doing that for years.
Years. Explaining. Defending. Rewriting myself for people who had
already made up their mind about me. Waiting for someone to turn
around and go yeah okay. You were right.`,

  `Nobody ever says that. I need you to know that. Nobody ever
turns around and says it.`,

  `And then the sky cracked open.`,

  `Not gently. It was violent honestly. This line of orange tearing
the horizon apart over the water and everything that was black
going gold all at once, the whole fjord catching fire, and I was
the only person alive to see it happen.`,

  `And I stopped. Mid sentence. In my own head.`,

  `Because the sun was not explaining itself to anybody. It was not
asking permission. It came up late, on its own time, over an empty
road with one witness, and it did not care even slightly whether
anyone approved of it.`,

  `And it hit me so hard I said it out loud in the car.`,

  `I am done. I am done explaining myself.`,

  `If I know what I did was right then that is the end of it. That
is the whole verdict. I do not need a second signature on it. I do
not need anybody co-signing my life.`,

  `And then the other half landed and that is the one that actually
broke me — if people want to leave because I will not explain
myself to them anymore, then let them leave. Let them go. All of
them. I am not chasing anybody down a road to hand them a reason.`,

  `And I swear something physically left my body. Like a weight I
had been carrying in my chest for years just stood up and walked
out of the car. I could breathe. Sitting frozen on the side of a
road in Iceland at 11:30 in the morning, I could finally breathe.`,

  `I stayed until the light was all the way up. Then I drove.`,

  `There is a me before that sunrise and a me after it and they are
not the same person. The one after is quieter. Explains nothing.
Chases nobody. And you would not believe how light he is.`
].map(p => `<p>${p}</p>`).join('\n\n');

const doc = {
  tab: 'moments',
  loc: 'Hvalfjörður, Iceland',
  label: 'ROUTE 1',
  title: 'The morning I let them all go',
  story,
  img: null,
  img_storage_path: null,
  trip_id: null,
  addedBy: '9aHUiUedgBUn09RH5NnW9lqhX9G2'
};

(async () => {
  const ref = db.collection('experiences').doc(DOC_ID);
  const snap = await ref.get();
  if (snap.exists) {
    await ref.update(doc);
    console.log('✓ updated moment:', DOC_ID);
  } else {
    doc.addedAt = admin.firestore.FieldValue.serverTimestamp();
    const created = await db.collection('experiences').add(doc);
    console.log('✓ added moment:', created.id);
  }
  console.log('  story chars:', story.length);
  process.exit(0);
})();
