// The question at the bench: "what's the proof you're still alive?"
// A stranger's answer is kept (Firestore `proofs`), waiting until I've read it. The ones I've
// approved stay at the bench, faint, like pencil — carried with mine.
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, query, where, limit, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { pencil } from './book.js';

const app = getApps()[0] || initializeApp({
  apiKey: "AIzaSyCESqunM9b_Yc-5Dj0qJJFxGALmEGm0Rd0", authDomain: "nomad-404.firebaseapp.com",
  projectId: "nomad-404", appId: "1:638331724572:web:baa0d70108e920099150d9"
});
const db = getFirestore(app);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'proof-left';

// builds the answer box + the faint proofs others left, inside `box`, after the question
export function proofHere(box, page) {
  const wrap = document.createElement('div');
  wrap.className = 'proof no-turn';
  wrap.innerHTML = `
    <form class="pf-form">
      <textarea maxlength="280" placeholder="no name. no account. just your proof." aria-label="your proof" required></textarea>
      <div class="pf-row"><span class="pf-count">280</span><button type="submit">leave it here</button></div>
    </form>
    <p class="pf-note">I read every one before it stays here. then I carry it with mine, faint, like pencil.</p>
    <div class="pf-traces" aria-label="proofs others left"></div>`;
  box.appendChild(wrap);
  const form = wrap.querySelector('form'), ta = wrap.querySelector('textarea'), count = wrap.querySelector('.pf-count');
  ta.addEventListener('input', () => { count.textContent = 280 - ta.value.length; });

  let mine = null;
  try { mine = localStorage.getItem(KEY); } catch {}
  if (mine) carried(mine);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = ta.value.trim().slice(0, 280);
    if (!text) return;
    form.querySelector('button').disabled = true;
    try {
      await addDoc(collection(db, 'proofs'), { text, page, approved: false, createdAt: serverTimestamp() });
      try { localStorage.setItem(KEY, text); } catch {}
      carried(text, true);
    } catch {
      form.querySelector('button').disabled = false;
      wrap.querySelector('.pf-note').textContent = "it didn't reach me. try once more in a moment.";
    }
  });

  function carried(text, fresh) {
    form.outerHTML = `<p class="pf-mine" data-pen="w">${esc(text)}</p><p class="pf-thanks" data-pen="c">carried. — thank you, stranger.</p>`;
    if (fresh) pencil(wrap);
  }

  // the ones I've read, faint
  getDocs(query(collection(db, 'proofs'), where('approved', '==', true), limit(40))).then(snap => {
    const all = snap.docs.map(d => d.data().text).filter(Boolean).sort(() => Math.random() - .5).slice(0, 6);
    wrap.querySelector('.pf-traces').innerHTML = all.map((t, i) => `<p style="--r:${(i % 2 ? 1 : -1) * (.4 + i * .15)}deg">${esc(t)}</p>`).join('');
  }).catch(() => {});
}
