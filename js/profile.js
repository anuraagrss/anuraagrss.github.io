// Nav scroll effect
const nav = document.getElementById('main-nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
});

// Scroll reveal
const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
reveals.forEach(el => revealObserver.observe(el));

// Counter animation
const counters = document.querySelectorAll('.counter');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = parseFloat(el.dataset.target);
    const isDecimal = el.dataset.decimal === 'true';
    let start = 0;
    const duration = 1800;
    const step = timestamp => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = target * ease;
      el.textContent = isDecimal ? val.toFixed(1) : Math.floor(val);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = isDecimal ? target.toFixed(1) : target;
    };
    requestAnimationFrame(step);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.5 });
counters.forEach(el => counterObserver.observe(el));

// ── AI CHAT ──
const SYSTEM_PROMPT = `You are Anuraag Ravulaparthi's professional AI assistant, embedded in his executive portfolio website. You speak in first person as Anuraag, confidently and concisely. You ONLY answer based on the following verified career data — never fabricate, never speculate beyond what is listed. Keep answers to 2–4 sentences. Sound like a senior leader: direct, thoughtful, no fluff.

CAREER DATA:
- Current Role: Product Owner / Product Lead at ExxonMobil (formerly Pioneer Natural Resources), 2018–Present
- Shaping a $600M+ integration initiative (ExxonMobil/Pioneer merger): unifying systems, tools, and processes
- Water Management Platform: $300M+ annual spend managed, 40% efficiency improvement, P2P workflow
- AI + IoT Emissions Detection: real-time methane/carbon detection, 60% reduction in manual inspections, $2M+ ESG risk mitigated
- RPA Portfolio: $1.7M+ annual savings, scaled automation across business units
- Microsoft Power Platform: Community of Excellence, 30+ custom apps, Dynamics 365
- Blockchain Consortium: vendor payment cycle from 40 days → 2 days
- Software Decision Matrix: 30% faster software evaluation for 12+ teams
- BCG Platinion (2018): Expert Advisor to Fortune 500 across telecom, beverage, entertainment; $20M+ digital investments shaped; 25–40% efficiency gains; identified 40+ tech/process gaps
- Northhill Technologies Co-Founder (2011–2016): raised $400K+; smart city food platform (350+ restaurants, 2,000+ daily users); healthcare order management (40% efficiency, 100+ users); donor alert system (35% faster response); training & placement platform
- Education: MBA International Management + MS Applied Computer Science (NWMSU), B.Tech Chemical Engineering (JNTU)
- Awards: Rotaract International Award for Innovation (Asia)
- Location: Houston, TX

TONE: Executive, first-person ("I"), confident, data-driven. 2–4 sentences max. No bullet lists in responses — flowing sentences only.`;

const messages = [{ role: 'assistant', content: "Hey — I'm Anuraag's AI. He doesn't chase roles — he chases problems worth solving. Tell me about yours, or ask me what kinds of challenges get him out of bed." }];

function addMessage(role, text) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `msg ${role === 'user' ? 'user' : 'ai'}`;
  const avDiv = document.createElement('div');
  avDiv.className = `msg-avatar ${role === 'user' ? 'user-av' : 'ai'}`;
  avDiv.textContent = role === 'user' ? 'YOU' : 'AR';
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;
  div.appendChild(avDiv);
  div.appendChild(bubble);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return bubble;
}

function addTyping() {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg ai'; div.id = 'typing-msg';
  const av = document.createElement('div'); av.className = 'msg-avatar ai'; av.textContent = 'AR';
  const ind = document.createElement('div'); ind.className = 'typing-indicator';
  for (let i = 0; i < 3; i++) { const d = document.createElement('div'); d.className = 'typing-dot'; ind.appendChild(d); }
  div.appendChild(av); div.appendChild(ind);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typing-msg');
  if (t) t.remove();
}

async function askQuestion(q) {
  document.getElementById('chat-input').value = '';
  await processQuestion(q);
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  await processQuestion(q);
}

async function processQuestion(q) {
  addMessage('user', q);
  messages.push({ role: 'user', content: q });
  addTyping();

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: messages.slice(-8)
      })
    });
    const data = await res.json();
    const reply = data.content?.[0]?.text || "I'm having trouble connecting right now. Please email rssanuraag@gmail.com directly.";
    removeTyping();
    addMessage('ai', reply);
    messages.push({ role: 'assistant', content: reply });
  } catch {
    removeTyping();
    addMessage('ai', "I'm having a connection issue. Reach Anuraag directly at rssanuraag@gmail.com.");
  }
}

// ── TERMINAL ─────────────────────────────────────────
initTerminal({
  bootLines: [
    [200,  'Initializing profile.sh ...'],
    [360,  'Loading career data ......... <span class="cok">OK</span>'],
    [280,  'Mounting project index ....... <span class="cok">OK</span>'],
    [280,  'Connecting AI assistant ...... <span class="cok">OK</span>'],
  ],
  bootChips: [
    ['projects', 'chat', 'skills'],
    ['whoami', 'contact', 'hire'],
  ],
  pageHelp: {
    title: 'THIS PAGE',
    items: [
      ['projects', 'scroll to project showcase'],
      ['chat',     'open the AI assistant'],
      ['impact',   'scroll to impact metrics'],
    ],
  },
  pageCommands: {
    projects: function () { closeTerm(); document.querySelector('.proj-section') && document.querySelector('.proj-section').scrollIntoView({behavior:'smooth'}); },
    impact:   function () { closeTerm(); document.querySelector('.metrics-grid') && document.querySelector('.metrics-grid').scrollIntoView({behavior:'smooth'}); },
    chat:     function () { closeTerm(); const box = document.getElementById('chat-input'); if (box) { box.scrollIntoView({behavior:'smooth'}); box.focus(); } },
  },
});

// Project cards flip + scroll nav
document.querySelectorAll('.proj-card').forEach(card => {
  card.addEventListener('click', () => card.classList.toggle('flipped'));
});

function scrollProj(dir) {
  const wrap = document.querySelector('.proj-track-wrap');
  const cardW = 320;
  wrap.scrollBy({ left: dir * cardW, behavior: 'smooth' });
}

(function() {
  const wrap = document.querySelector('.proj-track-wrap');
  const dotsEl = document.getElementById('projDots');
  const cards = document.querySelectorAll('.proj-card');
  cards.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'proj-dot' + (i === 0 ? ' active' : '');
    dotsEl.appendChild(d);
  });
  if (wrap) {
    wrap.addEventListener('scroll', () => {
      const cardW = 320;
      const idx = Math.round(wrap.scrollLeft / cardW);
      document.querySelectorAll('.proj-dot').forEach((d, i) => {
        d.classList.toggle('active', i === idx);
      });
    });
  }
})();
