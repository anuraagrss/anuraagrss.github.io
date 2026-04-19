
import { initializeApp }  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged }
                          from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc }
                          from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const app  = initializeApp({
  apiKey:"AIzaSyCESqunM9b_Yc-5Dj0qJJFxGALmEGm0Rd0",
  authDomain:"nomad-404.firebaseapp.com",
  projectId:"nomad-404",
  appId:"1:638331724572:web:baa0d70108e920099150d9"
});
const auth = getAuth(app);
const db   = getFirestore(app);

let API_KEY = null, currentUID = null;
let tripType = 'one-way', cabin = 'business';
const fromAirports = [], toAirports = [];
let allRows = [], activeFilter = 'all', sortCol = 'miles';

// ── AUTH ──────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  if (!user) { window.location.href = 'owner.html'; return; }
  const snap = await getDoc(doc(db,'admins',user.uid)).catch(()=>null);
  if (!snap?.exists()) { window.location.href = 'owner.html'; return; }
  currentUID = user.uid;
  await loadApiKey();
});

async function loadApiKey() {
  setStatus('loading','checking key…');
  try {
    const snap = await getDoc(doc(db,'config','seats_aero'));
    if (snap.exists() && snap.data().api_key) {
      API_KEY = snap.data().api_key;
      setStatus('ok','seats.aero connected');
      document.getElementById('keyNotice').classList.remove('show');
      updateSearchBtn();
    } else {
      setStatus('err','api key needed');
      document.getElementById('keyNotice').classList.add('show');
    }
  } catch { setStatus('err','api key needed'); document.getElementById('keyNotice').classList.add('show'); }
}

window.saveApiKey = async function() {
  const key = document.getElementById('keyInput').value.trim();
  if (!key) return;
  try {
    await setDoc(doc(db,'config','seats_aero'),{api_key:key,saved_by:currentUID,saved_at:new Date().toISOString()});
    API_KEY = key;
    setStatus('ok','seats.aero connected');
    document.getElementById('keyNotice').classList.remove('show');
    document.getElementById('keyInput').value = '';
    toast('✓ Key saved','ok');
    updateSearchBtn();
  } catch(e) { toast('✗ '+e.message,'err'); }
};

function setStatus(t,txt) {
  document.getElementById('statusDot').className = 'status-dot '+t;
  document.getElementById('statusText').textContent = txt;
}

// ── AIRPORTS ──────────────────────────────────────────────────────────────
const AIRPORTS = [
  {code:'DEL',city:'New Delhi',name:'Indira Gandhi Intl',country:'IN'},
  {code:'BOM',city:'Mumbai',name:'Chhatrapati Shivaji',country:'IN'},
  {code:'HYD',city:'Hyderabad',name:'Rajiv Gandhi Intl',country:'IN'},
  {code:'MAA',city:'Chennai',name:'Chennai Intl',country:'IN'},
  {code:'BLR',city:'Bengaluru',name:'Kempegowda Intl',country:'IN'},
  {code:'CCU',city:'Kolkata',name:'Netaji Subhas',country:'IN'},
  {code:'DXB',city:'Dubai',name:'Dubai Intl',country:'AE'},
  {code:'AUH',city:'Abu Dhabi',name:'Zayed Intl',country:'AE'},
  {code:'DOH',city:'Doha',name:'Hamad Intl',country:'QA'},
  {code:'SIN',city:'Singapore',name:'Changi',country:'SG'},
  {code:'BKK',city:'Bangkok',name:'Suvarnabhumi',country:'TH'},
  {code:'HKG',city:'Hong Kong',name:'HK Intl',country:'HK'},
  {code:'NRT',city:'Tokyo',name:'Narita',country:'JP'},
  {code:'HND',city:'Tokyo',name:'Haneda',country:'JP'},
  {code:'ICN',city:'Seoul',name:'Incheon',country:'KR'},
  {code:'SYD',city:'Sydney',name:'Kingsford Smith',country:'AU'},
  {code:'MEL',city:'Melbourne',name:'Tullamarine',country:'AU'},
  {code:'LHR',city:'London',name:'Heathrow',country:'GB'},
  {code:'LGW',city:'London',name:'Gatwick',country:'GB'},
  {code:'CDG',city:'Paris',name:'Charles de Gaulle',country:'FR'},
  {code:'AMS',city:'Amsterdam',name:'Schiphol',country:'NL'},
  {code:'FRA',city:'Frankfurt',name:'Frankfurt',country:'DE'},
  {code:'MUC',city:'Munich',name:'Munich',country:'DE'},
  {code:'MAD',city:'Madrid',name:'Adolfo Suárez',country:'ES'},
  {code:'FCO',city:'Rome',name:'Leonardo da Vinci',country:'IT'},
  {code:'ZRH',city:'Zurich',name:'Zurich',country:'CH'},
  {code:'VIE',city:'Vienna',name:'Vienna',country:'AT'},
  {code:'IST',city:'Istanbul',name:'Istanbul',country:'TR'},
  {code:'JFK',city:'New York',name:'JFK',country:'US'},
  {code:'EWR',city:'New York',name:'Newark',country:'US'},
  {code:'LAX',city:'Los Angeles',name:'LAX',country:'US'},
  {code:'ORD',city:'Chicago',name:"O'Hare",country:'US'},
  {code:'DFW',city:'Dallas',name:'Dallas Fort Worth',country:'US'},
  {code:'MIA',city:'Miami',name:'Miami Intl',country:'US'},
  {code:'SFO',city:'San Francisco',name:'SFO',country:'US'},
  {code:'IAH',city:'Houston',name:'George Bush',country:'US'},
  {code:'BOS',city:'Boston',name:'Logan',country:'US'},
  {code:'YYZ',city:'Toronto',name:'Pearson',country:'CA'},
  {code:'GRU',city:'São Paulo',name:'Guarulhos',country:'BR'},
  {code:'EZE',city:'Buenos Aires',name:'Ezeiza',country:'AR'},
  {code:'LIM',city:'Lima',name:'Jorge Chávez',country:'PE'},
  {code:'NBO',city:'Nairobi',name:'Jomo Kenyatta',country:'KE'},
  {code:'JNB',city:'Johannesburg',name:'OR Tambo',country:'ZA'},
  {code:'CAI',city:'Cairo',name:'Cairo Intl',country:'EG'},
  {code:'KUL',city:'Kuala Lumpur',name:'KLIA',country:'MY'},
  {code:'KTM',city:'Kathmandu',name:'Tribhuvan',country:'NP'},
  {code:'CMB',city:'Colombo',name:'Bandaranaike',country:'LK'},
  {code:'KEF',city:'Reykjavik',name:'Keflavik',country:'IS'},
  {code:'PRG',city:'Prague',name:'Václav Havel',country:'CZ'},
  {code:'ATH',city:'Athens',name:'Eleftherios Venizelos',country:'GR'},
  {code:'LIS',city:'Lisbon',name:'Humberto Delgado',country:'PT'},
];
const AMAP = {}; AIRPORTS.forEach(a=>AMAP[a.code]=a);

function setupSuggest(inputId,suggestId,side){
  const inp=document.getElementById(inputId), list=document.getElementById(suggestId);
  inp.addEventListener('input',()=>{
    const q=inp.value.toUpperCase().trim();
    if(!q){list.classList.remove('open');return;}
    const hits=AIRPORTS.filter(a=>a.code.startsWith(q)||a.city.toUpperCase().includes(q)||a.country===q).slice(0,7);
    if(!hits.length){list.classList.remove('open');return;}
    list.innerHTML=hits.map(a=>`
      <div class="suggest-item" onclick="selectAirport('${side}','${a.code}')">
        <div class="s-code">${a.code}</div>
        <div><div class="s-city">${a.city}</div><div class="s-name">${a.name}</div></div>
        <div class="s-country">${a.country}</div>
      </div>`).join('');
    list.classList.add('open');
  });
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){addAirport(side);list.classList.remove('open');}if(e.key==='Escape')list.classList.remove('open');});
}
setupSuggest('fromInput','fromSuggest','from');
setupSuggest('toInput','toSuggest','to');
document.addEventListener('click',e=>{if(!e.target.closest('.airport-input-wrap'))document.querySelectorAll('.suggest-list').forEach(s=>s.classList.remove('open'));});

window.selectAirport=function(side,code){
  document.getElementById(side+'Input').value=code;
  document.getElementById(side+'Suggest').classList.remove('open');
  addAirport(side);
};
window.addAirport=function(side){
  const arr=side==='from'?fromAirports:toAirports;
  const val=document.getElementById(side+'Input').value.toUpperCase().trim();
  if(!val||val.length<2)return;
  if(arr.find(a=>a.code===val)){document.getElementById(side+'Input').value='';return;}
  arr.push(AMAP[val]||{code:val,city:val,name:val,country:'??'});
  document.getElementById(side+'Input').value='';
  renderTags(side); updateSearchBtn();
};
window.removeAirport=function(side,code){
  const arr=side==='from'?fromAirports:toAirports;
  const i=arr.findIndex(a=>a.code===code); if(i>-1)arr.splice(i,1);
  renderTags(side); updateSearchBtn();
};
function renderTags(side){
  const arr=side==='from'?fromAirports:toAirports;
  document.getElementById(side+'Tags').innerHTML=arr.map(a=>`
    <div class="airport-tag">
      <span>${a.code}</span>
      <span class="tag-city">${a.city!==a.code?a.city:''}</span>
      <button onclick="removeAirport('${side}','${a.code}')">×</button>
    </div>`).join('');
}
window.swapAirports=function(){
  const fCopy=[...fromAirports], tCopy=[...toAirports];
  fromAirports.length=0; toAirports.length=0;
  fCopy.forEach(a=>toAirports.push(a));
  tCopy.forEach(a=>fromAirports.push(a));
  renderTags('from'); renderTags('to'); updateSearchBtn();
};

window.setTrip=function(t){
  tripType=t;
  document.getElementById('owTab').classList.toggle('active',t==='one-way');
  document.getElementById('rtTab').classList.toggle('active',t==='round-trip');
  document.getElementById('dateEnd').disabled=(t==='one-way');
};
window.setCabin=function(btn){
  document.querySelectorAll('.cabin-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); cabin=btn.dataset.cabin;
};

function updateSearchBtn(){
  const n=fromAirports.length*toAirports.length;
  document.getElementById('searchBtn').disabled=!API_KEY||n===0;
  document.getElementById('comboHint').innerHTML=n>0
    ?`<b>${fromAirports.length}</b> × <b>${toAirports.length}</b> = <b>${n}</b> route${n!==1?'s':''} to search`
    :'Add airports to begin';
}

// ── CABIN MAPS ────────────────────────────────────────────────────────────
const CABIN_CODE ={'economy':'Y','premium-economy':'W','business':'J','first':'F'};
const CABIN_API  ={'economy':'economy','premium-economy':'premium','business':'business','first':'first'};
const CABIN_LBL  ={Y:'Economy',W:'Premium Eco',J:'Business',F:'First'};

// ── SEARCH ────────────────────────────────────────────────────────────────
window.runSearch=async function(){
  if(!API_KEY){toast('No API key configured','err');return;}
  const ds=document.getElementById('dateStart').value;
  const de=document.getElementById('dateEnd').value||ds;
  if(!ds){toast('Select a departure date','err');return;}
  if(!fromAirports.length||!toAirports.length){toast('Add airports','err');return;}

  const combos=[];
  fromAirports.forEach(f=>toAirports.forEach(t=>{if(f.code!==t.code)combos.push({from:f,to:t});}));
  if(!combos.length){toast('Origin = destination','err');return;}

  const cc=CABIN_CODE[cabin], ca=CABIN_API[cabin];
  const pg=document.getElementById('searchProgress');
  const pgGrid=document.getElementById('progressGrid');
  pg.classList.add('show');
  pgGrid.innerHTML=combos.map((c,i)=>`
    <div class="progress-row" id="pr-${i}">
      <span class="p-route">${c.from.code} → ${c.to.code}</span>
      <div class="p-bar-wrap"><div class="p-bar" id="pb-${i}"></div></div>
      <span class="p-status" id="ps-${i}">searching…</span>
    </div>`).join('');
  document.getElementById('resultsArea').innerHTML='';
  let done=0;
  const upd=()=>{document.getElementById('progressLabel').textContent=`${done} / ${combos.length} routes complete`;};
  upd();

  const all=await Promise.all(combos.map(async(combo,i)=>{
    try{
      const params=new URLSearchParams({
        origin_airport:combo.from.code,
        destination_airport:combo.to.code,
        cabin:ca, start_date:ds, end_date:de
      });
      const res=await fetch(`https://seats.aero/partnerapi/search?${params}`,{
        headers:{'Partner-Authorization':API_KEY}
      });
      if(!res.ok){
        document.getElementById('pb-'+i).classList.add('err');
        document.getElementById('ps-'+i).textContent=res.status===401?'invalid key':'error';
        document.getElementById('ps-'+i).className='p-status err';
        done++;upd();return{combo,results:[],error:true};
      }
      const data=await res.json();
      const rows=(data.data||[]).filter(r=>r[cc+'Available']);
      document.getElementById('pb-'+i).classList.add('done');
      document.getElementById('ps-'+i).textContent=rows.length>0?`${rows.length} found`:'none';
      document.getElementById('ps-'+i).className='p-status'+(rows.length>0?' ok':'');
      done++;upd();return{combo,results:rows};
    }catch(e){
      document.getElementById('pb-'+i).classList.add('err');
      document.getElementById('ps-'+i).textContent='failed';
      document.getElementById('ps-'+i).className='p-status err';
      done++;upd();return{combo,results:[],error:true};
    }
  }));

  renderResults(all,cc,ca);
};

// ── RENDER ────────────────────────────────────────────────────────────────
function renderResults(allData,cc,ca){
  allRows=[];
  allData.forEach(({combo,results})=>results.forEach(r=>allRows.push({
    from:combo.from, to:combo.to,
    date:r.Date, source:r.Source,
    carriers:r.Carriers||'',
    miles:r[cc+'MileageCost']||0,
    taxes:r.TotalTaxes||0, taxesCur:r.TaxesCurrencySymbol||'$',
    stops:r.Stops??null, direct:r[cc+'Directs']>0,
    seats:r.RemainingSeats||0, cabin:cc,
    lastSeen:r.ComputedLastSeen||r.UpdatedAt
  })));

  if(!allRows.length){
    document.getElementById('resultsArea').innerHTML=`
      <div class="empty-state">
        <div class="empty-plane">✈</div>
        <div class="empty-title">NO AVAILABILITY</div>
        <div class="empty-sub">No award seats found for these routes · Try different dates or cabin</div>
      </div>`;
    return;
  }

  const programs=[...new Set(allRows.map(r=>r.source))].sort();
  const minMiles=Math.min(...allRows.map(r=>r.miles).filter(Boolean));
  const directs=allRows.filter(r=>r.direct).length;

  let html=`
    <div class="results-section">
      <div class="results-topbar">
        <div>
          <div class="results-count">${allRows.length} RESULTS</div>
          <div class="results-sub"><b>${allData.filter(d=>d.results?.length>0).length}</b> of ${allData.length} routes · <b>${programs.length}</b> programs</div>
        </div>
      </div>
      <div class="summary-row">
        <div class="sum-pill best"><b>${minMiles.toLocaleString()}</b> lowest miles</div>
        <div class="sum-pill"><b>${directs}</b> nonstop</div>
        <div class="sum-pill"><b>${programs.length}</b> programs</div>
        <div class="sum-pill"><b>${allRows.length}</b> total results</div>
      </div>
      <div class="filter-bar">
        <span class="filter-label">SHOW:</span>
        <button class="filter-btn active" onclick="setFilter('all',this)">ALL (${allRows.length})</button>
        <button class="filter-btn" onclick="setFilter('direct',this)">NONSTOP (${directs})</button>
        ${programs.map(p=>`<button class="filter-btn" onclick="setFilter('${p}',this)">${p}</button>`).join('')}
        <select class="sort-select" onchange="setSort(this.value)">
          <option value="miles">Sort: Miles low→high</option>
          <option value="date">Sort: Date</option>
          <option value="stops">Sort: Nonstop first</option>
          <option value="seats">Sort: Most seats</option>
        </select>
      </div>
      <div class="results-list" id="resultsList"></div>
    </div>`;

  document.getElementById('resultsArea').innerHTML=html;
  renderList();
}

window.setFilter=function(f,btn){
  activeFilter=f;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderList();
};
window.setSort=function(col){sortCol=col;renderList();};

function renderList(){
  let rows=[...allRows];
  if(activeFilter==='direct') rows=rows.filter(r=>r.direct);
  else if(activeFilter!=='all') rows=rows.filter(r=>r.source===activeFilter);
  rows.sort((a,b)=>{
    if(sortCol==='miles') return (a.miles||9e9)-(b.miles||9e9);
    if(sortCol==='date')  return new Date(a.date)-new Date(b.date);
    if(sortCol==='stops') return (a.direct?0:1)-(b.direct?0:1);
    if(sortCol==='seats') return (b.seats||0)-(a.seats||0);
    return 0;
  });

  const fmtDate=d=>{
    if(!d)return'—';
    const dt=new Date(d);
    return dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  };
  const fmtAge=d=>{
    if(!d)return'';
    const h=Math.round((Date.now()-new Date(d))/3600000);
    return h<1?'just now':h<24?`${h}h ago`:`${Math.round(h/24)}d ago`;
  };
  const seatsDots=n=>{
    const filled=Math.min(n,5);
    return Array.from({length:5},(_,i)=>`<div class="bp-seat-dot ${i<filled?'full':'empty'}"></div>`).join('');
  };

  const bookUrl=r=>`https://seats.aero/search?origin=${r.from.code}&destination=${r.to.code}&cabin=${r.cabin}&date=${(r.date||'').split('T')[0]}&source=${r.source}`;

  const html=rows.map(r=>`
    <div class="bp-card cab-${r.cabin}">
      <div class="bp-body">
        <div class="bp-route">
          <div>
            <div class="bp-iata">${r.from.code}</div>
            <div class="bp-city">${r.from.city}</div>
          </div>
          <div class="bp-arrow">
            <div class="bp-arrow-line">
              <div class="bp-arrow-dash"></div>
              <div class="bp-arrow-icon">
                <svg viewBox="0 0 18 18" fill="none">
                  <path d="M2 11l2-2h3L4 5h2l5 4h4a1.5 1.5 0 010 3h-4L6 16H4l3-4H4l-2-1z" fill="currentColor"/>
                </svg>
              </div>
              <div class="bp-arrow-dash"></div>
            </div>
            <div>${r.direct?`<span class="bp-direct-badge">DIRECT</span>`:r.stops>0?`<span class="bp-stops-badge">${r.stops} STOP${r.stops>1?'S':''}</span>`:''}</div>
          </div>
          <div>
            <div class="bp-iata">${r.to.code}</div>
            <div class="bp-city">${r.to.city}</div>
          </div>
        </div>

        <div class="bp-details">
          <div class="bp-detail">
            <div class="bp-detail-label">DATE</div>
            <div class="bp-detail-val">${fmtDate(r.date)}</div>
          </div>
          <div class="bp-detail">
            <div class="bp-detail-label">MILES</div>
            <div class="bp-miles-val">${r.miles?r.miles.toLocaleString():'—'} <span class="bp-miles-unit">mi</span></div>
          </div>
          <div class="bp-detail">
            <div class="bp-detail-label">TAXES</div>
            <div class="bp-detail-val">${r.taxes?r.taxesCur+r.taxes:'—'}</div>
          </div>
          <div class="bp-detail">
            <div class="bp-detail-label">CABIN</div>
            <div><span class="bp-cabin ${r.cabin}">${CABIN_LBL[r.cabin]||r.cabin}</span></div>
          </div>
          <div class="bp-detail">
            <div class="bp-detail-label">SEATS</div>
            <div class="bp-seats-bar">${seatsDots(r.seats)}</div>
            <div class="bp-detail-sub">${r.seats||0} avail</div>
          </div>
        </div>
      </div>

      <div class="bp-action">
        <div class="bp-program">
          <b>${r.source}</b>
          ${r.carriers?`<span>${r.carriers}</span>`:''}
        </div>
        <div class="bp-data-age">Updated ${fmtAge(r.lastSeen)}</div>
        <a class="btn-board" href="${bookUrl(r)}" target="_blank" rel="noopener">BOOK ↗</a>
      </div>
    </div>`).join('');

  document.getElementById('resultsList').innerHTML = html||
    `<div class="empty-state"><div class="empty-sub">No results match this filter</div></div>`;
}

window.toast=function(msg,type='ok'){
  const t=document.getElementById('toast');
  t.textContent=msg; t.className='show '+type;
  setTimeout(()=>t.className='',2800);
};

// Defaults
const today=new Date(), in30=new Date(today), in60=new Date(today);
in30.setDate(in30.getDate()+30); in60.setDate(in60.getDate()+60);
const fmt=d=>d.toISOString().split('T')[0];
document.getElementById('dateStart').value=fmt(in30);
document.getElementById('dateEnd').value=fmt(in60);
setTrip('one-way');
