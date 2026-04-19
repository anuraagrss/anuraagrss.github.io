// js/terminal.js — Shared terminal component
// Usage: call initTerminal(config) from each page's JS after DOM is ready.
(function () {
  const NAV = {
    engineer: { url: 'Profile.html',      desc: 'Product leader · AI builder · Problem solver' },
    nomad:    { url: 'nomad.html',         desc: 'Capturing the world one frame at a time' },
    about:    { url: 'Professional.html',  desc: 'The full story — who I am & what drives me' },
    contact:  { url: 'Contact.html',       desc: 'Start a conversation worth having' },
    home:     { url: 'index.html',         desc: 'Back to the split' },
  };

  window.initTerminal = function (config) {
    config = config || {};
    var pageCommands = config.pageCommands || {};
    var pageHelp     = config.pageHelp     || null;   // { title, items: [[cmd, desc]] }
    // pageLS and bootLines accept arrays OR functions (called lazily when needed)
    var _pageLS      = config.pageLS       || [];
    var _bootLines   = config.bootLines    !== undefined ? config.bootLines : null;
    var bootChips    = config.bootChips    || [['engineer','nomad','about','contact'],['help','whoami','skills']];
    var getPageLS    = function () { return typeof _pageLS    === 'function' ? _pageLS()    : _pageLS; };
    var getBootLines = function () { return typeof _bootLines === 'function' ? _bootLines() : _bootLines; };

    var drawer   = document.getElementById('termDrawer');
    var backdrop = document.getElementById('termBackdrop');
    var trigger  = document.getElementById('termTrigger');
    var tBody    = document.getElementById('tBody');
    var tIn      = document.getElementById('tIn');
    if (!drawer) return;

    var booted = false;

    window.openTerm = function () {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      if (trigger) trigger.classList.add('away');
      if (!booted) { boot(); booted = true; }
      setTimeout(function () { tIn.focus(); }, 440);
    };
    window.closeTerm = function () {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      if (trigger) trigger.classList.remove('away');
    };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeTerm(); });
    drawer.addEventListener('click', function () { tIn.focus(); });

    // Clock
    var clk = document.getElementById('tClock');
    setInterval(function () { if (clk) clk.textContent = new Date().toLocaleTimeString(); }, 1000);

    // ── DOM helpers ──────────────────────────────────────────────
    var delay = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var add   = function (el) { tBody.appendChild(el); tBody.scrollTop = tBody.scrollHeight; return el; };
    var esc   = function (s)  { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };

    function ln(cls, html, indent) {
      if (indent === undefined) indent = true;
      var d = document.createElement('div');
      d.className = 'tl' + (indent ? ' out' : '');
      d.innerHTML = '<span class="' + cls + '">' + html + '</span>';
      return add(d);
    }
    function gap() { var d = document.createElement('div'); d.className = 'tl gap'; return add(d); }
    function pl(cmd) {
      var d = document.createElement('div'); d.className = 'tl pl';
      d.innerHTML = '<span class="ps">anuraag@world:~$</span><span class="tc"> ' + esc(cmd) + '</span>';
      return add(d);
    }
    function out(lines) { lines.forEach(function (l) { ln(l[0], l[1]); }); }
    function chips(primary, secondary) {
      primary   = primary   || [];
      secondary = secondary || [];
      var row = document.createElement('div'); row.className = 'chip-row';
      primary.forEach(function (c) {
        var b = document.createElement('button'); b.className = 'chip'; b.textContent = c;
        b.onclick = function () { run(c); }; row.appendChild(b);
      });
      secondary.forEach(function (c) {
        var b = document.createElement('button'); b.className = 'chip s'; b.textContent = c;
        b.onclick = function () { run(c); }; row.appendChild(b);
      });
      add(row);
    }
    function hints(pairs) {
      var row = document.createElement('div'); row.className = 'hint-row';
      pairs.forEach(function (p) {
        var h = document.createElement('div'); h.className = 'hint';
        h.innerHTML = '<span>' + p[0] + '</span> ' + p[1]; row.appendChild(h);
      });
      add(row);
    }
    function prog(name, val) {
      var row = document.createElement('div'); row.className = 'pr';
      var bars = Array.from({length:10}, function(_, i) {
        return '<div class="pb' + (i < val ? ' on' : '') + '"></div>';
      }).join('');
      row.innerHTML = '<div class="pn">' + name + '</div><div class="pb-row">' + bars + '</div>';
      add(row);
    }

    // ── Shared commands ──────────────────────────────────────────
    function cmdHelp() {
      gap(); ln('camb', '// NAVIGATE');
      out([
        ['ct', '&nbsp;&nbsp;engineer &nbsp;<span class="cd">→ product · AI · enterprise builds</span>'],
        ['ct', '&nbsp;&nbsp;nomad &nbsp;&nbsp;&nbsp;&nbsp;<span class="cd">→ travel · photography · the other side</span>'],
        ['ct', '&nbsp;&nbsp;about &nbsp;&nbsp;&nbsp;&nbsp;<span class="cd">→ full story · what drives me</span>'],
        ['ct', '&nbsp;&nbsp;contact &nbsp;&nbsp;<span class="cd">→ bring me a problem worth solving</span>'],
        ['ct', '&nbsp;&nbsp;home &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="cd">→ back to the split</span>'],
      ]);
      gap(); ln('camb', '// EXPLORE');
      out([
        ['cm', '&nbsp;&nbsp;whoami &nbsp;&nbsp;&nbsp;<span class="cd">→ who is this person</span>'],
        ['cm', '&nbsp;&nbsp;ls &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="cd">→ explore what\'s here</span>'],
        ['cm', '&nbsp;&nbsp;skills &nbsp;&nbsp;&nbsp;<span class="cd">→ what I can actually do</span>'],
        ['cm', '&nbsp;&nbsp;story &nbsp;&nbsp;&nbsp;&nbsp;<span class="cd">→ short version of a long journey</span>'],
        ['cm', '&nbsp;&nbsp;awards &nbsp;&nbsp;&nbsp;<span class="cd">→ recognition along the way</span>'],
        ['cm', '&nbsp;&nbsp;now &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="cd">→ what I\'m currently working on</span>'],
        ['cm', '&nbsp;&nbsp;quote &nbsp;&nbsp;&nbsp;&nbsp;<span class="cd">→ a thought worth sitting with</span>'],
        ['cm', '&nbsp;&nbsp;resume &nbsp;&nbsp;&nbsp;<span class="cd">→ open my resume</span>'],
        ['cm', '&nbsp;&nbsp;hire &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="cd">→ let\'s talk about working together</span>'],
        ['cm', '&nbsp;&nbsp;fun &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="cd">→ something unexpected</span>'],
        ['cm', '&nbsp;&nbsp;clear &nbsp;&nbsp;&nbsp;&nbsp;<span class="cd">→ clean slate</span>'],
      ]);
      if (pageHelp) {
        gap(); ln('camb', '// ' + pageHelp.title);
        pageHelp.items.forEach(function (item) {
          ln('cm', '&nbsp;&nbsp;' + item[0] + '&nbsp;&nbsp;<span class="cd">→ ' + item[1] + '</span>');
        });
      }
      gap(); chips(['engineer','nomad'], ['whoami','skills','story']);
    }

    function cmdLs() {
      gap(); ln('cd', 'drwxr-xr-x &nbsp;anuraag@world:~');
      var entries = [
        ['ct', '&nbsp;&nbsp;engineer/ &nbsp;&nbsp;&nbsp;<span class="cd">product · AI · $300M+ · 2,000 users</span>'],
        ['ct', '&nbsp;&nbsp;nomad/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="cd">35+ countries · stories · frames</span>'],
        ['cm', '&nbsp;&nbsp;about.md &nbsp;&nbsp;&nbsp;<span class="cd">MBA · MS CompSci · BCG · ExxonMobil</span>'],
        ['cm', '&nbsp;&nbsp;contact.sh &nbsp;<span class="cd">executable — start a conversation</span>'],
        ['cd', '&nbsp;&nbsp;.secrets &nbsp;&nbsp;&nbsp;<span class="cerr">permission denied</span>'],
      ].concat(getPageLS());
      out(entries);
      gap(); chips(['engineer','nomad'], ['about','contact']);
    }

    function cmdWhoami() {
      gap(); ln('cw', 'Anuraag Ravulaparthi');
      out([
        ['cm', '&nbsp;&nbsp;Role &nbsp;&nbsp;&nbsp;<span class="cd">:</span> Product leader · AI builder · Founder'],
        ['cm', '&nbsp;&nbsp;Stack &nbsp;&nbsp;<span class="cd">:</span> Systems thinking · People · Hard problems'],
        ['cm', '&nbsp;&nbsp;Origin &nbsp;<span class="cd">:</span> Built a company before a career'],
        ['cm', '&nbsp;&nbsp;Based &nbsp;&nbsp;<span class="cd">:</span> Houston, TX (usually)'],
        ['ct', '&nbsp;&nbsp;Status &nbsp;<span class="cd">:</span> <span class="cok">●</span> READY FOR THE NEXT BIG PROBLEM'],
      ]);
      gap(); chips(['about','engineer'], ['contact','hire']);
    }

    function cmdSkills() {
      gap(); ln('camb', '// SKILL MATRIX'); gap();
      [
        ['Product Strategy',   9],
        ['AI / ML Products',   8],
        ['Enterprise Arch',    9],
        ['RPA · Automation',   9],
        ['Founding / 0→1',     8],
        ['Systems Thinking',  10],
      ].forEach(function (s) { prog(s[0], s[1]); });
      gap(); chips(['engineer'], ['story','about']);
    }

    function cmdStory() {
      gap(); ln('cd', '// git log --oneline'); gap();
      out([
        ['cd', '&nbsp;&nbsp;<span class="camb">2011</span> &nbsp;Co-founded Northhill · $400K raised · 2,000 users'],
        ['cd', '&nbsp;&nbsp;<span class="camb">2016</span> &nbsp;Earned the exit · time to learn bigger'],
        ['cd', '&nbsp;&nbsp;<span class="camb">2018</span> &nbsp;BCG Platinion · Fortune 500 · $20M+ shaped'],
        ['cd', '&nbsp;&nbsp;<span class="camb">2018</span> &nbsp;Pioneer → ExxonMobil · AI+IoT+RPA · $600M'],
        ['ct', '&nbsp;&nbsp;<span class="ct">NOW &nbsp;</span> Looking for the next problem worth solving'],
      ]);
      gap(); chips(['about','engineer'], ['contact','hire']);
    }

    function cmdAwards() {
      gap(); ln('camb', '// RECOGNITION');
      out([
        ['cw', '&nbsp;&nbsp;Rotaract International Award for Innovation'],
        ['cd', '&nbsp;&nbsp;&nbsp;&nbsp;Asia region · earned before "product management" was a job title'],
        ['cm', '&nbsp;&nbsp;$600M+ integration lead · ExxonMobil / Pioneer merger'],
        ['cm', '&nbsp;&nbsp;ESG risk mitigation · $2M+ attributed · AI+IoT emissions platform'],
        ['cm', '&nbsp;&nbsp;RPA portfolio · $1.7M+ annual savings recognized internally'],
      ]);
      gap(); chips(['engineer'], ['story','about']);
    }

    function cmdNow() {
      gap(); ln('camb', '// CURRENTLY');
      out([
        ['ct', '&nbsp;&nbsp;Leading &nbsp;→ ExxonMobil / Pioneer integration ($600M+)'],
        ['cm', '&nbsp;&nbsp;Building → AI product roadmap for enterprise scale'],
        ['cm', '&nbsp;&nbsp;Exploring→ the next problem worth founding something around'],
        ['cd', '&nbsp;&nbsp;Open to &nbsp;→ the right conversation. Start one.'],
      ]);
      gap(); chips(['contact','hire'], ['engineer']);
    }

    var QUOTES = [
      '"The world is a book, and those who do not travel read only one page." — Augustine',
      '"Innovation is seeing what everybody has seen and thinking what nobody has thought." — Albert Szent-Györgyi',
      '"Not all those who wander are lost." — Tolkien',
      '"The best way to predict the future is to build it." — Alan Kay',
      '"Life is either a daring adventure or nothing at all." — Helen Keller',
      '"First, solve the problem. Then, write the code." — John Johnson',
      '"The greatest danger for most of us is not that our aim is too high, but that it is too low." — Michelangelo',
    ];
    var qi = 0;
    function cmdQuote() {
      gap(); ln('camb', '// QUOTE');
      ln('cw', '&nbsp;&nbsp;' + QUOTES[qi % QUOTES.length]); qi++;
      gap(); ln('cd', 'run <span class="ct">quote</span> again for another');
      chips([], ['fun','quote','whoami']);
    }

    function cmdResume() {
      gap();
      ln('ct', 'Opening resume ...');
      ln('cd', 'File: Anuraag_Ravulaparthi_Resume.pdf');
      var d = document.createElement('div'); d.className = 'tl out';
      d.innerHTML = '<span class="cok">✓</span> <span class="clnk" onclick="window.open(\'images/Resume.pdf\',\'_blank\')">Download / View →</span>';
      add(d); gap();
    }

    function cmdHire() {
      gap();
      ln('cw', "You're thinking about it. Good.");
      ln('cm', "I don't chase roles — I chase problems worth solving.");
      ln('ct', "If you have one that clears that bar, let's talk.");
      gap();
      var d = document.createElement('div'); d.className = 'tl out';
      d.innerHTML = '<span class="cok">→</span> <span class="clnk" onclick="window.location.href=\'Contact.html\'">Contact.html — open a conversation</span>';
      add(d); gap();
    }

    var FACTS = [
      "B.Tech in Chemical Engineering. My first 'platform' was a reaction vessel.",
      "The split avatar? Left is the suit. Right has the backpack. Both show up to the same meetings.",
      "I once reduced a 40-day payment cycle to 2 days. The vendors noticed.",
      "Won a Rotaract International Innovation Award in Asia — before I knew what product management was.",
      "Built healthcare systems, food platforms, blood donor alerts, and blockchain contracts. One person.",
      "I don't have a home city. I have coordinates.",
      "MBA + MS Computer Science + B.Tech Chemical Engineering. Each one added a different lens.",
    ];
    var fi = 0;
    function cmdFun() {
      gap(); ln('camb', '// RANDOM FACT');
      ln('cm', FACTS[fi % FACTS.length]); fi++;
      gap(); ln('cd', 'run <span class="ct">fun</span> again for another');
      chips([], ['fun','quote','whoami']);
    }

    function cmdHi() {
      gap();
      ln('ct', 'Hey. You typed hello. I respect that.');
      ln('cm', "Most people just click. You typed. That's the energy I work with.");
      gap(); chips(['whoami','story'], ['engineer','nomad']);
    }

    function cmdGo(dest) {
      var nav = NAV[dest];
      if (!nav) { out([['cerr', 'not found: ' + dest]]); return; }
      var cur = window.location.pathname.split('/').pop() || 'index.html';
      if (cur === nav.url || (dest === 'home' && (cur === '' || cur === 'index.html'))) {
        out([['camb', "You're already here. Try: ls"]]); return;
      }
      gap();
      ln('ct', 'Navigating to <span class="cw">' + dest + '</span> ...');
      ln('cd', nav.desc); gap();
      var d = document.createElement('div'); d.className = 'tl out';
      d.innerHTML = '<span class="cok">✓ Ready.</span> <span class="cm">Tap to go: </span><span class="clnk" onclick="window.location.href=\'' + nav.url + '\'">' + nav.url + ' →</span>';
      add(d);
    }

    function cmdClear() {
      tBody.innerHTML = '';
      ln('cd', 'Terminal cleared.', false); gap();
      chips(['engineer','nomad','about','contact'], ['help','whoami']);
    }

    // ── Merge shared + page-specific commands ────────────────────
    var CMDS = Object.assign({
      help: cmdHelp, ls: cmdLs, whoami: cmdWhoami,
      skills: cmdSkills, story: cmdStory, fun: cmdFun,
      awards: cmdAwards, now: cmdNow, quote: cmdQuote,
      resume: cmdResume, hire: cmdHire, work: cmdHire,
      clear: cmdClear,
      hello: cmdHi, hi: cmdHi, hey: cmdHi,
      engineer: function () { cmdGo('engineer'); },
      nomad:    function () { cmdGo('nomad'); },
      about:    function () { cmdGo('about'); },
      contact:  function () { cmdGo('contact'); },
      home:     function () { cmdGo('home'); },
      profile:  function () { cmdGo('engineer'); },
      chinni:   function () { window.location.href = 'rewards.html'; },
      pwd:  function () { out([['cd', '/anuraag/world/portfolio']]); },
      date: function () { out([['ct', new Date().toDateString() + ' · ' + new Date().toLocaleTimeString()]]); },
      ping: function () {
        out([['cd', 'PING anuraag.world: 56 bytes of data']]);
        setTimeout(function () { out([['cok', '64 bytes: icmp_seq=0 time=1ms — still alive out here.']]); }, 420);
      },
      sudo: function () { out([['cerr', "sudo: Nice try. You don't need root to be impressed."]]); },
      exit: function () { out([['camb', "You can't leave. The work is too interesting."]]); },
      man:  function () { out([['cerr', "No manual exists for this person. That's the point."]]); chips(['whoami'], ['help']); },
    }, pageCommands);

    var hist = []; var hi = -1;
    var ALL  = Object.keys(CMDS);

    function run(raw) {
      var parts = raw.trim().split(/\s+/);
      var cmd = parts[0].toLowerCase();
      if (!cmd) return;
      hist.unshift(raw.trim()); hi = -1;
      pl(raw.trim());
      if (CMDS[cmd]) CMDS[cmd](parts.slice(1).join(' '));
      else {
        ln('cerr', 'command not found: <span class="cw">' + esc(cmd) + '</span>');
        ln('cd', 'Try: <span class="ct">help</span>');
        chips(['engineer','nomad','about','contact'], ['help']);
      }
      tIn.value = ''; tBody.scrollTop = tBody.scrollHeight;
    }
    window._termRun = run;

    tIn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { run(tIn.value); }
      else if (e.key === 'Tab') {
        e.preventDefault();
        var v = tIn.value.toLowerCase(); if (!v) return;
        var m = ALL.find(function (c) { return c.startsWith(v); }); if (m) tIn.value = m;
      }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); if (hi < hist.length - 1) { hi++; tIn.value = hist[hi]; } }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if (hi > 0) { hi--; tIn.value = hist[hi]; } else { hi = -1; tIn.value = ''; } }
    });

    async function boot() {
      var bootLines = getBootLines();
      if (bootLines) {
        for (var i = 0; i < bootLines.length; i++) {
          await delay(bootLines[i][0]);
          ln('cd', bootLines[i][1], false);
        }
      } else {
        ln('cd', 'Initializing anuraag.sh ...', false);
        await delay(380); ln('cd', 'Loading personality modules ... <span class="cok">OK</span>');
        await delay(300); ln('cd', 'Mounting career data ......... <span class="cok">OK</span>');
        await delay(280); ln('cd', 'Attaching curiosity engine ... <span class="cok">OK</span>');
      }
      await delay(450); gap();
      ln('cw', 'Welcome. You found the terminal.', false);
      ln('cm', "I'm Anuraag — product builder, problem chaser, occasional nomad.");
      gap(); ln('ct', 'Where do you want to go?');
      chips(bootChips[0], bootChips[1]);
      hints([['Tab','autocomplete'], ['↑↓','history'], ['ls','explore'], ['Esc','close']]);
    }
  };
})();
