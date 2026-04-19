// ─── THEME ───────────────────────────────────────────
const html = document.documentElement;
const eng  = document.querySelector('.half-engineer');
const nom  = document.querySelector('.half-nomad');

eng.addEventListener('mouseenter', () => html.setAttribute('data-theme', 'engineer'));
eng.addEventListener('mouseleave', () => html.setAttribute('data-theme', 'default'));
nom.addEventListener('mouseenter', () => html.setAttribute('data-theme', 'nomad'));
nom.addEventListener('mouseleave', () => html.setAttribute('data-theme', 'default'));

// ─── TERMINAL ────────────────────────────────────────
initTerminal({
  bootLines: [
    [200,  'Initializing anuraag.sh ...'],
    [380,  'Loading personality modules ... <span class="cok">OK</span>'],
    [300,  'Mounting career data ......... <span class="cok">OK</span>'],
    [280,  'Attaching curiosity engine ... <span class="cok">OK</span>'],
  ],
  bootChips: [
    ['engineer', 'nomad', 'about', 'contact'],
    ['help', 'whoami', 'skills'],
  ],
});
