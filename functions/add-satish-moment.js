#!/usr/bin/env node
/**
 * add-satish-moment.js — one-off: the Satish / Gate 26 moment in
 * experiences (tab: 'moments'). Re-run to update the story in place
 * (matched by tab + label). Photo added later by the user.
 *
 * Run from functions/:  node add-satish-moment.js
 */
'use strict';

const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./service-account.json')) });
const db = admin.firestore();
db.settings({ preferRest: true });

const story = [
  `I did not expect this one to hit me the way it did honestly.`,

  `New Year's Eve. I was somewhere in Eastern Europe, far from home,
and I did what I always do when a year ends. Sat with it. The whole
year. Then my whole life. And I kept thinking about the people who
stayed. Through all of it. And how I never once told them.`,

  `So this year I decided I would.`,

  `Satish was one of them.`,

  `We have been friends since school. And we are opposite people
honestly. He says everything. I say nothing. He is loud about what
he feels and I keep all of it inside. Our lives went completely
different ways. Nothing alike.`,

  `But he has seen me in every phase. The best of me. The worst of
me. And I have seen his. And we have never talked about any of it.
Never. When we talk it is just blank mind. No pretending. No catching
up on who we are supposed to be now. Years can go by and the call
feels exactly the same. No change. Not even a little.`,

  `That is the bond. That is the whole thing.`,

  `So I wrote him a long message. Happy new year and then everything
I had never said to him in all those years. I sent it and I felt so
good. He did too. And I thought okay. That is it.`,

  `I had no idea it was not.`,

  `2nd of January. I am sitting at Gate 26 in Zagreb waiting for my
flight to Sarajevo. I turn my internet on and open our friends group.
Randomly. Not looking for anything.`,

  `And it is full. Message after message. All about it. All about us.`,

  `And I am scrolling and confused and then it lands. He had put my
message up as his WhatsApp status. For everyone to see. And I did not
even know.`,

  `I just sat there and read every single message. Every one. Because
I am not that person. I do not show what is inside me to anybody. And
he took the most honest thing I have ever said to him and put it in
front of the whole world. Because he was proud of it. Proud of us.`,

  `I cannot explain what that does to you. It is not happiness
exactly. It is not pride exactly. It is like being told by your
oldest friend, without him saying one word, you matter to me. And I
want everyone to know it.`,

  `So right there at the gate. Earphones in. I video call him.`,

  `And I am trying to tell him why I wrote it. What that night was.
What he means to me. My hands going everywhere because the words were
not coming out fast enough.`,

  `And somewhere in that call we both just went back. All the way
back. Two silly last-bench boys in 9th class. Small town. Small
school. No idea about anything. No idea about life.`,

  `And I thought — look at us now. Look how far we came. Both of us.`,

  `I always believed real friendship does not need to be shown to
anybody. If the two of you know, that is enough. But that call
changed something in me. Sometimes you need to let the world know who
stands with you when it matters. That is what true friendship
actually looks like.`,

  `I still relive that moment. Sitting at that gate. Smiling at my
phone like an idiot. Talking to the same boy from that last bench.`,

  `Some friendships you have to keep working on. Ours never needed
that. It just needed to be said out loud once.`
].map(p => `<p>${p}</p>`).join('\n\n');

const doc = {
  tab: 'moments',
  loc: 'Zagreb, Croatia',
  label: 'LAST BENCH',
  title: 'He told the whole world about us',
  story,
  img: null,
  img_storage_path: null,
  trip_id: null,
  addedBy: '9aHUiUedgBUn09RH5NnW9lqhX9G2'
};

(async () => {
  const existing = await db.collection('experiences')
    .where('tab', '==', doc.tab).where('label', '==', doc.label).limit(1).get();
  if (!existing.empty) {
    const ref = existing.docs[0].ref;
    await ref.update(doc);
    console.log('✓ updated moment:', ref.id);
  } else {
    doc.addedAt = admin.firestore.FieldValue.serverTimestamp();
    const created = await db.collection('experiences').add(doc);
    console.log('✓ added moment:', created.id);
  }
  console.log('  story chars:', story.length);
  process.exit(0);
})();
