// The nav: a bookmark ribbon hanging from the top of the page. Pull it and the tabs fall open —
// each with a mark and a line that says what's there. The page you're on stays marked.
const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const MARKS = {
  journey:  svg('<path d="M8.5 4.5c1.6 0 2.4 1.6 2.2 3.4-.2 1.6-1.1 3-2.4 3s-2-1.3-1.9-3c.1-1.9.7-3.4 2.1-3.4z"/><path d="M7.4 12.6l2.6.3-.3 2.2c-.2 1-1.1 1.6-1.9 1.4-.8-.2-1.1-1-.9-1.8z"/><path d="M15.6 9.5c1.4 0 2 1.5 1.9 3.4-.1 1.7-.8 3-1.9 3-1.3 0-2.2-1.4-2.4-3-.2-1.8.6-3.4 2.4-3.4z"/><path d="M13.6 17.6l2.6-.3.3 1.9c.2.8-.1 1.6-.9 1.8-.8.2-1.7-.4-1.9-1.4z"/>'),
  journal:  svg('<path d="M12 6.5c-2-1.6-4.6-2.1-8-1.8v13c3.4-.3 6 .2 8 1.8 2-1.6 4.6-2.1 8-1.8v-13c-3.4-.3-6 .2-8 1.8z"/><path d="M12 6.5v13"/>'),
  logbook:  svg('<path d="M21 15.5v-1.8l-8-5V3.2a1.5 1.5 0 0 0-3 0v5.5l-8 5v1.8l8-2.4v4.6l-2 1.5v1.4l3.5-1 3.5 1v-1.4l-2-1.5v-4.6z"/>'),
  darkroom: svg('<path d="M4 7h3.2l1.6-2.2h6.4L16.8 7H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="12.5" r="3.6"/>'),
  classic:  svg('<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><path d="M3.5 9h17"/><circle cx="6" cy="7" r=".6"/><circle cx="8" cy="7" r=".6"/>'),
};
const TABS = [
  { n: 'journey',  href: 'nomad.html',    label: 'journey',  line: 'walk with me' },
  { n: 'journal',  href: 'journal.html',  label: 'journal',  line: 'read my pages' },
  { n: 'logbook',  href: 'logbook.html',  label: 'logbook',  line: 'every flight I took' },
  { n: 'darkroom', href: 'darkroom.html', label: 'darkroom', line: 'every photograph' },
  { n: 'classic',  href: 'nomad-classic.html', label: 'classic',  line: 'the site as it was' },
];

const page = location.pathname.replace(/^.*\//, '').replace(/\.html$/, '') || 'nomad';
const here = page.startsWith('logbook') ? 'logbook' : page === 'darkroom' ? 'darkroom' : page === 'journal' ? 'journal' : 'journey';
const cur = TABS.find(t => t.n === here);

const nav = document.createElement('nav');
nav.className = 'ribbon-nav';
nav.setAttribute('aria-label', 'where to go');
nav.innerHTML = `
  <button type="button" class="rb-pull" aria-expanded="false" aria-controls="rbTabs" title="pull the ribbon">
    <span class="rb-mark">${MARKS[here]}</span><span class="rb-here">${cur.label}</span>
  </button>
  <ul class="rb-tabs" id="rbTabs">${TABS.map(t => `
    <li><a href="${t.href}" class="${t.n === here ? 'on' : ''}" ${t.n === here ? 'aria-current="page"' : ''}>
      <span class="rb-mark">${MARKS[t.n]}</span><span class="rb-l"><b>${t.label}</b><small>${t.line}</small></span></a></li>`).join('')}
  </ul>`;
document.body.appendChild(nav);

const pull = nav.querySelector('.rb-pull');
const set = open => { nav.classList.toggle('open', open); pull.setAttribute('aria-expanded', String(open)); };
pull.addEventListener('click', e => { e.stopPropagation(); set(!nav.classList.contains('open')); });
document.addEventListener('click', e => { if (!nav.contains(e.target)) set(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
