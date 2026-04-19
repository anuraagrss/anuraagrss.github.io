import { initializeApp }   from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithPopup, signOut as fbSignOut, onAuthStateChanged, GoogleAuthProvider }
                           from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
         collection, getDocs, serverTimestamp }
                           from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL }
                           from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

const FB={apiKey:"AIzaSyCESqunM9b_Yc-5Dj0qJJFxGALmEGm0Rd0",authDomain:"nomad-404.firebaseapp.com",projectId:"nomad-404",storageBucket:"nomad-404.firebasestorage.app",messagingSenderId:"638331724572",appId:"1:638331724572:web:baa0d70108e920099150d9"};
const app=initializeApp(FB),auth=getAuth(app),db=getFirestore(app),storage=getStorage(app),provider=new GoogleAuthProvider();
let currentUser=null,currentRole=null,tripsCache=[];

// ─── COUNTRY DATA ────────────────────────────────────────────────
const COUNTRIES=[
  ['AF','Afghanistan'],['AL','Albania'],['DZ','Algeria'],['AD','Andorra'],['AO','Angola'],
  ['AR','Argentina'],['AM','Armenia'],['AU','Australia'],['AT','Austria'],['AZ','Azerbaijan'],
  ['BS','Bahamas'],['BH','Bahrain'],['BD','Bangladesh'],['BY','Belarus'],['BE','Belgium'],
  ['BZ','Belize'],['BO','Bolivia'],['BA','Bosnia and Herzegovina'],['BW','Botswana'],['BR','Brazil'],
  ['BN','Brunei'],['BG','Bulgaria'],['KH','Cambodia'],['CM','Cameroon'],['CA','Canada'],
  ['CL','Chile'],['CN','China'],['CO','Colombia'],['CR','Costa Rica'],['HR','Croatia'],
  ['CU','Cuba'],['CY','Cyprus'],['CZ','Czech Republic'],['DK','Denmark'],['DO','Dominican Republic'],
  ['EC','Ecuador'],['EG','Egypt'],['SV','El Salvador'],['EE','Estonia'],['ET','Ethiopia'],
  ['FJ','Fiji'],['FI','Finland'],['FR','France'],['GE','Georgia'],['DE','Germany'],
  ['GH','Ghana'],['GR','Greece'],['GT','Guatemala'],['HT','Haiti'],['HN','Honduras'],
  ['HU','Hungary'],['IS','Iceland'],['IN','India'],['ID','Indonesia'],['IR','Iran'],
  ['IQ','Iraq'],['IE','Ireland'],['IL','Israel'],['IT','Italy'],['JM','Jamaica'],
  ['JP','Japan'],['JO','Jordan'],['KZ','Kazakhstan'],['KE','Kenya'],['XK','Kosovo'],
  ['KW','Kuwait'],['KG','Kyrgyzstan'],['LA','Laos'],['LV','Latvia'],['LB','Lebanon'],
  ['LT','Lithuania'],['MK','North Macedonia'],['MG','Madagascar'],['MY','Malaysia'],
  ['MV','Maldives'],['MT','Malta'],['MX','Mexico'],['MD','Moldova'],['MC','Monaco'],
  ['MN','Mongolia'],['ME','Montenegro'],['MA','Morocco'],['MZ','Mozambique'],['MM','Myanmar'],
  ['NA','Namibia'],['NP','Nepal'],['NL','Netherlands'],['NZ','New Zealand'],['NI','Nicaragua'],
  ['NG','Nigeria'],['NO','Norway'],['OM','Oman'],['PK','Pakistan'],['PA','Panama'],
  ['PG','Papua New Guinea'],['PY','Paraguay'],['PE','Peru'],['PH','Philippines'],['PL','Poland'],
  ['PT','Portugal'],['QA','Qatar'],['RO','Romania'],['RU','Russia'],['RW','Rwanda'],
  ['SA','Saudi Arabia'],['RS','Serbia'],['SG','Singapore'],['SK','Slovakia'],['SI','Slovenia'],
  ['ZA','South Africa'],['KR','South Korea'],['ES','Spain'],['LK','Sri Lanka'],['SE','Sweden'],
  ['CH','Switzerland'],['TW','Taiwan'],['TJ','Tajikistan'],['TZ','Tanzania'],['TH','Thailand'],
  ['TL','East Timor'],['TN','Tunisia'],['TR','Turkey'],['TM','Turkmenistan'],['UG','Uganda'],
  ['UA','Ukraine'],['AE','United Arab Emirates'],['GB','United Kingdom'],['US','United States'],
  ['UY','Uruguay'],['UZ','Uzbekistan'],['VE','Venezuela'],['VN','Vietnam'],['YE','Yemen'],
  ['ZM','Zambia'],['ZW','Zimbabwe']
].sort((a,b)=>a[1].localeCompare(b[1]));
const CODE_TO_NAME=Object.fromEntries(COUNTRIES);

// ─── COUNTRY SEARCH DROPDOWN FACTORY ────────────────────────────
// Returns an object with setValue(code) / getValue()
function makeCountryDropdown(wrapId, hiddenId, placeholder='Search country…'){
  const wrap=document.getElementById(wrapId);
  const hidden=document.getElementById(hiddenId);
  if(!wrap||!hidden)return{getValue:()=>'',setValue:()=>{}};

  // Build DOM
  const input=document.createElement('input');
  input.className='country-search-input';
  input.placeholder=placeholder;
  input.autocomplete='off';

  const dd=document.createElement('div');
  dd.className='country-dropdown';

  const renderOptions=(filter='')=>{
    dd.innerHTML='';
    const q=filter.toLowerCase();
    COUNTRIES.filter(([code,name])=>!q||name.toLowerCase().includes(q)||code.toLowerCase().includes(q))
      .forEach(([code,name])=>{
        const opt=document.createElement('div');
        opt.className='country-option';
        opt.dataset.code=code;
        opt.innerHTML=`<img class="country-flag" src="https://flagcdn.com/16x12/${code.toLowerCase()}.png" onerror="this.style.opacity=0"><span class="country-code-badge">${code}</span><span>${name}</span>`;
        opt.addEventListener('mousedown',e=>{
          e.preventDefault();
          hidden.value=code;
          input.value=`${name} (${code})`;
          dd.classList.remove('open');
        });
        dd.appendChild(opt);
      });
  };

  input.addEventListener('focus',()=>{renderOptions(input.value);dd.classList.add('open');});
  input.addEventListener('input',()=>renderOptions(input.value));
  input.addEventListener('blur',()=>setTimeout(()=>dd.classList.remove('open'),150));

  wrap.appendChild(input);
  wrap.appendChild(dd);

  const setValue=(code)=>{
    if(!code){input.value='';hidden.value='';return;}
    const name=CODE_TO_NAME[code]||code;
    input.value=`${name} (${code})`;
    hidden.value=code;
  };
  const getValue=()=>hidden.value||'';
  return{setValue,getValue};
}

// Store dropdown controllers keyed by hiddenId
const dropdowns={};

// ─── CLOCK ───────────────────────────────────────────────────────
setInterval(()=>{const el=document.getElementById('topbarTime');if(el)el.textContent=new Date().toLocaleTimeString();},1000);

// ─── AUTH ────────────────────────────────────────────────────────
onAuthStateChanged(auth,async user=>{
  if(!user){showAuth();return;}
  const snap=await getDoc(doc(db,'admins',user.uid)).catch(()=>null);
  if(!snap?.exists()){document.getElementById('auth-error').textContent='✗ Access denied.';document.getElementById('googleBtn').disabled=false;await fbSignOut(auth);return;}
  currentUser=user;currentRole=snap.data().role;showApp(snap.data());
});
function showAuth(){document.getElementById('auth-screen').classList.remove('hidden');document.getElementById('app').classList.remove('visible');}
function showApp(adminData){
  document.getElementById('auth-screen').classList.add('hidden');document.getElementById('app').classList.add('visible');
  document.getElementById('userName').textContent=adminData.name||currentUser.displayName||'User';
  document.getElementById('userRole').textContent=adminData.role.toUpperCase();
  const av=document.getElementById('userAvatar');
  if(currentUser.photoURL)av.innerHTML=`<img src="${currentUser.photoURL}" alt="">`;else av.textContent=(adminData.name||'U')[0].toUpperCase();
  if(currentRole!=='super-admin'){['journalNav','usersNav','privateSection','configNav'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});}
  document.getElementById('welcomeSub').textContent=`Signed in as ${currentUser.email} · ${currentRole}`;
  // Init country dropdowns on add forms
  dropdowns['c-country']=makeCountryDropdown('c-country-wrap','c-country');
  dropdowns['adv-country']=makeCountryDropdown('adv-country-wrap','adv-country');
  dropdowns['p-country']=makeCountryDropdown('p-country-wrap','p-country');
  dropdowns['ph-country']=makeCountryDropdown('ph-country-wrap','ph-country');
  loadAllCounts();loadTripsCache();loadAdbKey();loadFlightsTable();
}
window.signIn=async function(){document.getElementById('googleBtn').disabled=true;document.getElementById('auth-error').textContent='';try{await signInWithPopup(auth,provider);}catch(e){document.getElementById('auth-error').textContent=`✗ ${e.message}`;document.getElementById('googleBtn').disabled=false;}};
window.signOut=async function(){await fbSignOut(auth);currentUser=null;currentRole=null;showAuth();};

// Stars
(function(){const c=document.getElementById('authStars');if(!c)return;Object.assign(c.style,{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none'});for(let i=0;i<55;i++){const s=document.createElement('div');s.className='auth-star';const sz=Math.random()*1.8+0.4;s.style.cssText=`width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation-duration:${5+Math.random()*10}s;animation-delay:${Math.random()*8}s;opacity:0`;c.appendChild(s);}})();

// ─── PANEL NAV ───────────────────────────────────────────────────
window.showPanel=function(name){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const panel=document.getElementById('panel-'+name);if(panel)panel.classList.add('active');
  document.querySelectorAll(`.nav-item[onclick="showPanel('${name}')"]`).forEach(n=>n.classList.add('active'));
  const titles={home:'DASHBOARD',flights:'FLIGHTS',cafes:'CAFES',experiences:'EXPERIENCES',adventures:'ADVENTURES',people:'PEOPLE',photos:'PHOTOGRAPHY',trips:'TRIPS',countries:'COUNTRIES',content:'PAGE CONTENT',travel:'TRAVEL PLANS',journal:'JOURNAL',users:'USERS',config:'CONFIG & API KEYS'};
  document.getElementById('topbarTitle').textContent=titles[name]||name.toUpperCase();
  const loaders={flights:loadFlightsTable,cafes:loadCafesTable,experiences:loadExpTable,adventures:loadAdvTable,people:loadPeopleTable,photos:loadPhotoGrid,trips:loadTripsTable,countries:loadCountries,travel:loadTravelTable,journal:loadJournal,users:loadUsers,content:loadContent,config:loadConfig};
  if(loaders[name])loaders[name]();
};

// ─── TOAST ───────────────────────────────────────────────────────
window.toast=function(msg,type='ok'){const t=document.getElementById('toast');t.textContent=msg;t.className='show '+type;setTimeout(()=>t.className='',3000);};

// ─── HOME COUNTS ─────────────────────────────────────────────────
async function loadAllCounts(){
  const cols=['flights','countries','cafes','experiences','photos','adventures'];
  if(currentRole==='super-admin')cols.push('journal');
  for(const col of cols){try{const s=await getDocs(collection(db,col));const el=document.getElementById('stat-'+col);if(el)el.textContent=s.size;}catch(_){}}
}

// ─── TRIPS CACHE ─────────────────────────────────────────────────
async function loadTripsCache(){
  try{const s=await getDocs(collection(db,'trips'));tripsCache=s.docs.map(d=>({id:d.id,...d.data()}));populateTripSelects();}catch(_){}
}
function populateTripSelects(){
  ['f-trip','c-trip','e-trip','adv-trip','p-trip','ph-trip'].forEach(id=>{
    const sel=document.getElementById(id);if(!sel)return;
    const cur=sel.value;sel.innerHTML='<option value="">— no trip —</option>';
    tripsCache.forEach(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=t.title;sel.appendChild(o);});
    sel.value=cur||'';
  });
}

// ─── CLEAR FORMS ─────────────────────────────────────────────────
window.clearForm=function(type){
  const maps={
    flight:['f-fn','f-from','f-to','f-airline','f-fromCity','f-toCity','f-date','f-seat','f-aircraft','f-tail','f-notes'],
    cafe:['c-name','c-type','c-city','c-ordered','c-vibe','c-story'],
    experience:['e-loc','e-label','e-title','e-story','e-img-url'],
    adventure:['adv-title','adv-loc','adv-story'],
    person:['p-name','p-met','p-story'],
    photo:['ph-title','ph-story','ph-location','ph-camera','ph-lens','ph-settings'],
    trip:['tr-title','tr-notes'],
    country:['cn-name','cn-id','cn-lat','cn-lon','cn-emoji','cn-notes'],
    travel:['tp-dest','tp-date','tp-with','tp-notes'],
    journal:['j-title','j-body','j-loc'],
  };
  (maps[type]||[]).forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  if(type==='photo'){document.getElementById('photoPreview').innerHTML='';selectedPhotoFile=null;}
  if(type==='experience'){document.getElementById('e-img-preview').style.display='none';document.getElementById('e-img-filename').textContent='No file selected';selectedExpFile=null;}
  // clear country hidden fields
  const cMap={cafe:'c-country',adventure:'adv-country',person:'p-country',photo:'ph-country'};
  if(cMap[type]){const h=document.getElementById(cMap[type]);if(h)h.value='';if(dropdowns[cMap[type]])dropdowns[cMap[type]].setValue('');}
};

// ═══════════════════════════════════════════════════════════════
// EDIT MODAL
// ═══════════════════════════════════════════════════════════════
let modalSaveFn=null;
function openModal(title,bodyHTML,saveFn){
  document.getElementById('modalTitle').textContent=title;
  document.getElementById('modalBody').innerHTML=bodyHTML;
  modalSaveFn=saveFn;
  document.getElementById('editModal').classList.add('open');
}
window.closeModal=function(){document.getElementById('editModal').classList.remove('open');modalSaveFn=null;};
window.saveModal=async function(){if(modalSaveFn){await modalSaveFn();closeModal();}};

// Helper: read modal field value
const mval=id=>{const el=document.getElementById(id);return el?(el.value||'').trim():'';};

// ─── FR24 ────────────────────────────────────────────────────────
const FR24_BASE='https://fr24api.flightradar24.com/api';
let adbApiKey=null;
async function loadAdbKey(){
  try{const s=await getDoc(doc(db,'config','fr24'));if(s.exists()&&s.data().api_key){adbApiKey=s.data().api_key;document.getElementById('adbKey').placeholder='FR24 token saved ✓';}}catch(_){}
}
window.saveAdbKey=async function(){
  const key=document.getElementById('adbKey').value.trim();if(!key)return;
  await setDoc(doc(db,'config','fr24'),{api_key:key,saved_by:currentUser.uid,saved_at:new Date().toISOString()});
  adbApiKey=key;document.getElementById('adbKey').value='';document.getElementById('adbKey').placeholder='FR24 token saved ✓';toast('✓ FR24 token saved');
};

const AIRPORT_COORDS={DEL:[28.5562,77.1],BOM:[19.09,72.87],HYD:[17.24,78.43],MAA:[12.99,80.17],BLR:[13.20,77.71],DXB:[25.25,55.37],AUH:[24.43,54.65],DOH:[25.26,51.61],SIN:[1.36,103.99],BKK:[13.68,100.75],HKG:[22.31,113.92],NRT:[35.77,140.39],HND:[35.55,139.78],ICN:[37.46,126.44],SYD:[-33.94,151.18],MEL:[-37.67,144.84],LHR:[51.47,-0.45],LGW:[51.15,-0.18],CDG:[49.01,2.55],AMS:[52.31,4.76],FRA:[50.04,8.56],MUC:[48.35,11.78],MAD:[40.49,-3.57],BCN:[41.30,2.08],FCO:[41.80,12.24],ZRH:[47.46,8.55],VIE:[48.11,16.57],IST:[41.28,28.75],JFK:[40.64,-73.78],EWR:[40.69,-74.17],LAX:[33.94,-118.41],ORD:[41.97,-87.91],DFW:[32.90,-97.04],MIA:[25.80,-80.29],SFO:[37.62,-122.38],IAH:[29.99,-95.34],BOS:[42.37,-71.01],ATL:[33.64,-84.43],SEA:[47.45,-122.31],GRU:[-23.44,-46.47],EZE:[-34.82,-58.54],LIM:[-12.02,-77.11],SCL:[-33.39,-70.79],BOG:[4.70,-74.15],MEX:[19.44,-99.07],NBO:[-1.32,36.93],JNB:[-26.14,28.25],CAI:[30.12,31.41],ADD:[8.98,38.80],KUL:[2.75,101.71],MNL:[14.51,121.02],KTM:[27.70,85.36],CMB:[7.18,79.88],BEG:[44.82,20.31],ZAG:[45.74,16.07]};
function haversine(la1,lo1,la2,lo2){const R=3958.8,dr=(la2-la1)*Math.PI/180,dl=(lo2-lo1)*Math.PI/180;const a=Math.sin(dr/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dl/2)**2;return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));}
function getDistance(from,to){const fc=AIRPORT_COORDS[from],tc=AIRPORT_COORDS[to];return(fc&&tc)?haversine(fc[0],fc[1],tc[0],tc[1]):null;}
const AIRLINE_NAMES={AF:'Air France',UA:'United Airlines',W6:'Wizz Air',JU:'Air Serbia',OU:'Croatia Airlines',KL:'KLM',AA:'American Airlines',EK:'Emirates',QR:'Qatar Airways',SQ:'Singapore Airlines',AI:'Air India',BA:'British Airways',LH:'Lufthansa',TK:'Turkish Airlines',EY:'Etihad',DL:'Delta',WN:'Southwest',B6:'JetBlue',NK:'Spirit',F9:'Frontier',AS:'Alaska',AC:'Air Canada',FR:'Ryanair',U2:'easyJet',IB:'Iberia',AZ:'ITA Airways',LX:'Swiss',OS:'Austrian',SK:'SAS',AY:'Finnair','6E':'IndiGo',MS:'EgyptAir',ET:'Ethiopian',NH:'ANA',JL:'Japan Airlines',KE:'Korean Air',CX:'Cathay Pacific',QF:'Qantas'};

async function enrichFlight(flightNum,date){
  if(!adbApiKey||!flightNum||!date)return null;
  try{
    const fn=flightNum.replace(/\s+/g,'').toUpperCase(),dateStr=date.split('T')[0];
    const url=`${FR24_BASE}/v1/historic/flight-summaries/full?flight_number=${encodeURIComponent(fn)}&date_from=${encodeURIComponent(dateStr+'T00:00:00Z')}&date_to=${encodeURIComponent(dateStr+'T23:59:59Z')}`;
    const res=await fetch(url,{headers:{'Authorization':`Bearer ${adbApiKey}`,'Accept':'application/json'}});
    if(!res.ok)return null;
    const data=await res.json();const flights=data.data||data.results||data;const flight=Array.isArray(flights)?flights[0]:flights;if(!flight)return null;
    const dep=flight.departure||flight.orig||{},arr=flight.arrival||flight.dest||{};
    return{fr24_id:flight.fr24_id||flight.fid||flight.id||null,aircraft_type:(flight.aircraft?.model||flight.aircraft?.type)||null,tail_number:(flight.aircraft?.registration||flight.aircraft?.reg)||null,duration_mins:flight.duration||null,dep_terminal:dep.terminal||null,dep_gate:dep.gate||null,arr_terminal:arr.terminal||null,arr_gate:arr.gate||null};
  }catch(_){return null;}
}

// ─── FLIGHTS IMPORT ──────────────────────────────────────────────
let parsedFlights=[];
window.handleDrop=function(e){e.preventDefault();document.getElementById('dropZone').classList.remove('over');const file=e.dataTransfer.files[0];if(file)handleFile(file);};
window.handleFile=async function(file){
  const ext=file.name.split('.').pop().toLowerCase();
  if(ext==='csv'){parseCSV(await file.text());}
  else if(['xlsx','xls'].includes(ext)){
    if(!window.XLSX)await new Promise(r=>{const s=document.createElement('script');s.src='https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';s.onload=r;document.head.appendChild(s);});
    const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array',cellDates:true});
    parseRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{raw:false,dateNF:'yyyy-mm-dd'}));
  }else toast('Upload .xlsx or .csv','err');
};
function parseCSV(text){const lines=text.trim().split('\n');const hdrs=lines[0].split(',').map(h=>h.trim().replace(/^"|"$/g,''));const rows=lines.slice(1).map(line=>{const vals=line.split(',').map(v=>v.trim().replace(/^"|"$/g,''));const obj={};hdrs.forEach((h,i)=>obj[h]=vals[i]||'');return obj;}).filter(r=>Object.values(r).some(v=>v));parseRows(rows);}
function normalizeRow(row){
  const get=(...keys)=>{for(const k of keys){const f=Object.keys(row).find(rk=>rk.toLowerCase().includes(k.toLowerCase()));if(f&&row[f]&&String(row[f]).trim()!=='-')return String(row[f]).trim();}return null;};
  const parseAP=s=>{if(!s)return{city:null,iata:null};const m=s.match(/^(.+?)\s*\(([A-Z]{3})\)\s*$/);return m?{city:m[1].trim(),iata:m[2]}:{city:s,iata:null};};
  const fn=get('Flight Number','flight_number','flight');const from=parseAP(get('From','from','origin'));const to=parseAP(get('To','to','destination'));
  let date=get('Date','date','departure date');if(date&&!date.match(/^\d{4}-\d{2}-\d{2}$/)){try{const d=new Date(date);if(!isNaN(d))date=d.toISOString().split('T')[0];}catch(_){}}
  let airline=null,airlineCode=null;if(fn){const m=fn.match(/^([A-Z]{1,2}[0-9]?|[A-Z0-9]{2})\s*\d+/i);if(m){airlineCode=m[1].toUpperCase();airline=AIRLINE_NAMES[airlineCode]||airlineCode;}}
  const distRaw=get('Distance','miles','distance miles');let dist=distRaw?parseFloat(distRaw):null;if((!dist||isNaN(dist))&&from.iata&&to.iata)dist=getDistance(from.iata,to.iata);
  return{flight_number:fn,airline_code:airlineCode,airline,from:from.iata,from_city:from.city,to:to.iata,to_city:to.city,date,aircraft_type:get('Aircraft Type','aircraft'),distance_miles:dist};
}
function parseRows(rows){parsedFlights=rows.map(normalizeRow).filter(f=>f.from||f.to||f.flight_number);renderPreview();}
function renderPreview(){
  if(!parsedFlights.length)return;
  document.getElementById('importPreview').style.display='block';
  document.getElementById('previewLabel').textContent=`// PREVIEW — ${parsedFlights.length} FLIGHTS`;
  document.getElementById('previewBody').innerHTML=parsedFlights.map((f,i)=>`<tr id="prev-${i}"><td class="mono">${f.flight_number||'—'}<br><span style="color:var(--muted);font-size:10px">${f.airline||''}</span></td><td class="mono">${f.from||'?'}<br><span style="color:var(--muted);font-size:10px">${f.from_city||''}</span></td><td class="mono">${f.to||'?'}<br><span style="color:var(--muted);font-size:10px">${f.to_city||''}</span></td><td class="muted">${f.date||'—'}</td><td class="muted">${f.aircraft_type||'<span style="opacity:.4">enrich</span>'}</td><td class="teal">${f.distance_miles?Math.round(f.distance_miles).toLocaleString():'—'}</td><td id="ps-${i}" style="font-size:10px;color:var(--muted)">—</td></tr>`).join('');
  document.getElementById('dropZone').style.borderColor='rgba(63,185,80,0.4)';
}
window.importFlights=async function(){
  if(!parsedFlights.length)return;
  const doEnrich=document.getElementById('enrichToggle').checked&&adbApiKey;
  const btn=document.getElementById('importBtn');btn.disabled=true;btn.textContent='IMPORTING…';
  document.getElementById('importProgress').style.display='block';
  const log=document.getElementById('importLog');let done=0,errors=0;
  for(let i=0;i<parsedFlights.length;i++){
    const f={...parsedFlights[i]};
    document.getElementById('importProgressLabel').textContent=`${i+1} / ${parsedFlights.length}`;
    document.getElementById('importProgressBar').style.width=`${Math.round((i/parsedFlights.length)*100)}%`;
    document.getElementById('ps-'+i).textContent='saving…';document.getElementById('ps-'+i).style.color='var(--gold)';
    if(doEnrich&&f.flight_number&&f.date){const en=await enrichFlight(f.flight_number,f.date);if(en){if(!f.aircraft_type&&en.aircraft_type)f.aircraft_type=en.aircraft_type;if(en.tail_number)f.tail_number=en.tail_number;if(en.fr24_id)f.fr24_id=en.fr24_id;}await new Promise(r=>setTimeout(r,300));}
    if(!f.distance_miles&&f.from&&f.to)f.distance_miles=getDistance(f.from,f.to);
    try{const save={};Object.entries(f).forEach(([k,v])=>{if(v!==null&&v!==undefined&&v!=='null')save[k]=v;});save.addedAt=serverTimestamp();save.addedBy=currentUser.uid;save.source='import';await addDoc(collection(db,'flights'),save);done++;document.getElementById('ps-'+i).textContent='✓';document.getElementById('ps-'+i).style.color='var(--green)';const m=document.createElement('div');m.textContent=`✓ ${f.flight_number||''} ${f.from}→${f.to} ${f.date||''}`;m.style.color='var(--green)';log.appendChild(m);log.scrollTop=log.scrollHeight;}
    catch(e){errors++;document.getElementById('ps-'+i).textContent='✗';document.getElementById('ps-'+i).style.color='var(--red)';}
  }
  document.getElementById('importProgressBar').style.width='100%';document.getElementById('importProgressLabel').textContent=`${done} saved · ${errors} errors`;
  btn.textContent=`✓ ${done} IMPORTED`;toast(`✓ ${done} flights imported`);parsedFlights=[];loadAllCounts();loadFlightsTable();
};

window.addFlight=async function(){
  const from=(document.getElementById('f-from').value||'').toUpperCase().trim(),to=(document.getElementById('f-to').value||'').toUpperCase().trim();
  if(!from||!to){toast('FROM and TO required','err');return;}
  const data={flight_number:document.getElementById('f-fn').value.trim()||null,from,to,airline:document.getElementById('f-airline').value.trim()||null,from_city:document.getElementById('f-fromCity').value.trim()||null,to_city:document.getElementById('f-toCity').value.trim()||null,date:document.getElementById('f-date').value||null,cabin:document.getElementById('f-cabin').value||null,seat:document.getElementById('f-seat').value.trim()||null,aircraft_type:document.getElementById('f-aircraft').value.trim()||null,tail_number:(document.getElementById('f-tail').value||'').toUpperCase().trim()||null,distance_miles:getDistance(from,to),notes:document.getElementById('f-notes').value.trim()||null,trip_id:document.getElementById('f-trip').value||null,addedAt:serverTimestamp(),addedBy:currentUser.uid};
  try{await addDoc(collection(db,'flights'),data);toast('✓ Flight saved');clearForm('flight');loadFlightsTable();loadAllCounts();}catch(e){toast('✗ '+e.message,'err');}
};
window.enrichSingle=async function(){
  const fn=document.getElementById('f-fn').value.trim(),date=document.getElementById('f-date').value;
  if(!fn||!date){toast('Enter flight number and date first','err');return;}if(!adbApiKey){toast('No FR24 token','err');return;}
  toast('Enriching…','info');const en=await enrichFlight(fn,date);
  if(en){if(en.aircraft_type)document.getElementById('f-aircraft').value=en.aircraft_type;if(en.tail_number)document.getElementById('f-tail').value=en.tail_number;toast('✓ Enriched');}else toast('No data found','err');
};

// ─── FLIGHTS TABLE ───────────────────────────────────────────────
let allFlightDocs=[];
async function loadFlightsTable(){
  const el=document.getElementById('flightsTable');el.innerHTML='<div class="loading-row"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div><span>Loading…</span></div>';
  try{
    const snap=await getDocs(collection(db,'flights'));
    allFlightDocs=snap.docs.map(d=>({id:d.id,...d.data()}));allFlightDocs.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const stats=document.getElementById('flightStats');
    if(stats&&!stats.children.length){const totalMiles=allFlightDocs.reduce((s,f)=>s+(f.distance_miles||0),0);[{num:allFlightDocs.length,label:'FLIGHTS'},{num:Math.round(totalMiles).toLocaleString()+' MI',label:'TOTAL MILES'},{num:[...new Set(allFlightDocs.map(f=>f.airline).filter(Boolean))].length,label:'AIRLINES'}].forEach(b=>{const c=document.createElement('div');c.className='stat-card';c.innerHTML=`<div class="stat-card-num teal">${b.num}</div><div class="stat-card-label">${b.label}</div>`;stats.appendChild(c);});}
    renderFlightLog(allFlightDocs);
  }catch(e){el.innerHTML=`<div class="empty-state"><div class="empty-state-text">✗ ${e.message}</div></div>`;}
}
function renderFlightLog(docs){
  const el=document.getElementById('flightsTable');if(!docs.length){el.innerHTML='<div class="empty-state"><div class="empty-state-text">No flights yet</div></div>';return;}
  el.innerHTML=`<div class="data-table-wrap"><table><thead><tr><th>FLIGHT</th><th>ROUTE</th><th>DATE</th><th>AIRCRAFT</th><th>TAIL</th><th>DIST MI</th><th></th></tr></thead><tbody>${docs.map(f=>`<tr><td class="mono">${f.flight_number||'—'}<br><span style="font-size:10px;color:var(--muted)">${f.airline||''}</span></td><td class="mono">${f.from||'?'}→${f.to||'?'}<br><span style="font-size:10px;color:var(--muted)">${f.from_city||''}→${f.to_city||''}</span></td><td class="muted">${f.date||'—'}</td><td class="muted" style="font-size:11px;max-width:120px">${f.aircraft_type||'—'}</td><td class="teal" style="font-size:11px">${f.tail_number||'—'}</td><td class="teal">${f.distance_miles?Math.round(f.distance_miles).toLocaleString():'—'}</td><td><div class="tbl-actions"><button class="tbl-btn edit" onclick="editFlight('${f.id}')">EDIT</button><button class="tbl-btn" onclick="enrichAndUpdate('${f.id}','${f.flight_number||''}','${f.date||''}')">ENRICH</button><button class="tbl-btn del" onclick="deleteEntry('flights','${f.id}',loadFlightsTable)">DEL</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
window.filterFlights=function(q){renderFlightLog(allFlightDocs.filter(f=>!q||[f.flight_number,f.from,f.to,f.airline,f.aircraft_type,f.tail_number].some(v=>v&&v.toLowerCase().includes(q.toLowerCase()))));};
window.sortFlights=function(v){const s=[...allFlightDocs];if(v==='date-asc')s.sort((a,b)=>(a.date||'').localeCompare(b.date||''));else if(v==='date-desc')s.sort((a,b)=>(b.date||'').localeCompare(a.date||''));else if(v==='airline')s.sort((a,b)=>(a.airline||'').localeCompare(b.airline||''));else if(v==='miles')s.sort((a,b)=>(b.distance_miles||0)-(a.distance_miles||0));renderFlightLog(s);};

window.editFlight=function(id){
  const f=allFlightDocs.find(d=>d.id===id);if(!f)return;
  const cabinOpts=['','Economy','Premium Economy','Business','First'].map(o=>`<option${f.cabin===o?' selected':''}>${o}</option>`).join('');
  openModal('EDIT FLIGHT',`
    <div class="form-grid cols-3"><div class="form-group"><label class="form-label">FLIGHT #</label><input class="form-input" id="m-fn" value="${f.flight_number||''}"></div><div class="form-group"><label class="form-label">FROM</label><input class="form-input" id="m-from" value="${f.from||''}" maxlength="3" style="text-transform:uppercase"></div><div class="form-group"><label class="form-label">TO</label><input class="form-input" id="m-to" value="${f.to||''}" maxlength="3" style="text-transform:uppercase"></div></div>
    <div class="form-grid cols-3"><div class="form-group"><label class="form-label">AIRLINE</label><input class="form-input" id="m-airline" value="${f.airline||''}"></div><div class="form-group"><label class="form-label">FROM CITY</label><input class="form-input" id="m-fromCity" value="${f.from_city||''}"></div><div class="form-group"><label class="form-label">TO CITY</label><input class="form-input" id="m-toCity" value="${f.to_city||''}"></div></div>
    <div class="form-grid cols-3"><div class="form-group"><label class="form-label">DATE</label><input class="form-input" id="m-date" type="date" value="${f.date||''}"></div><div class="form-group"><label class="form-label">CABIN</label><select class="form-select" id="m-cabin">${cabinOpts}</select></div><div class="form-group"><label class="form-label">SEAT</label><input class="form-input" id="m-seat" value="${f.seat||''}"></div></div>
    <div class="form-grid cols-3"><div class="form-group"><label class="form-label">AIRCRAFT</label><input class="form-input" id="m-aircraft" value="${f.aircraft_type||''}"></div><div class="form-group"><label class="form-label">TAIL #</label><input class="form-input" id="m-tail" value="${f.tail_number||''}"></div><div class="form-group"><label class="form-label">DIST MI</label><input class="form-input" id="m-dist" type="number" value="${f.distance_miles||''}"></div></div>
    <div class="form-grid cols-1"><div class="form-group"><label class="form-label">NOTES</label><input class="form-input" id="m-notes" value="${(f.notes||'').replace(/"/g,'&quot;')}"></div></div>`,
    async()=>{
      const updates={flight_number:mval('m-fn')||null,from:mval('m-from').toUpperCase()||null,to:mval('m-to').toUpperCase()||null,airline:mval('m-airline')||null,from_city:mval('m-fromCity')||null,to_city:mval('m-toCity')||null,date:mval('m-date')||null,cabin:mval('m-cabin')||null,seat:mval('m-seat')||null,aircraft_type:mval('m-aircraft')||null,tail_number:mval('m-tail').toUpperCase()||null,distance_miles:parseFloat(mval('m-dist'))||null,notes:mval('m-notes')||null};
      await updateDoc(doc(db,'flights',id),updates);toast('✓ Flight updated');loadFlightsTable();
    }
  );
};
window.enrichAndUpdate=async function(docId,fn,date){
  if(!adbApiKey){toast('No FR24 token','err');return;}if(!fn||!date){toast('Flight number and date needed','err');return;}
  toast('Enriching…','info');const en=await enrichFlight(fn,date);if(!en){toast('No data found','err');return;}
  const updates={};['aircraft_type','tail_number','duration_mins','dep_terminal','dep_gate','arr_terminal','arr_gate','fr24_id'].forEach(k=>{if(en[k])updates[k]=en[k];});
  if(Object.keys(updates).length){await updateDoc(doc(db,'flights',docId),updates);toast('✓ Enriched');loadFlightsTable();}else toast('Nothing new','err');
};

// ─── CAFES ───────────────────────────────────────────────────────
let allCafeDocs=[];
window.addCafe=async function(){
  const name=document.getElementById('c-name').value.trim();if(!name){toast('Name required','err');return;}
  await addDoc(collection(db,'cafes'),{name,type:document.getElementById('c-type').value.trim()||null,city:document.getElementById('c-city').value.trim()||null,country:dropdowns['c-country'].getValue()||null,ordered:document.getElementById('c-ordered').value.trim()||null,rating:document.getElementById('c-rating').value,vibe:document.getElementById('c-vibe').value.trim()||null,story:document.getElementById('c-story').value.trim()||null,trip_id:document.getElementById('c-trip').value||null,addedAt:serverTimestamp(),addedBy:currentUser.uid});
  toast('✓ Cafe saved');clearForm('cafe');loadCafesTable();loadAllCounts();
};
async function loadCafesTable(){
  const el=document.getElementById('cafesTable');
  try{
    const snap=await getDocs(collection(db,'cafes'));allCafeDocs=snap.docs.map(d=>({id:d.id,...d.data()}));
    if(!allCafeDocs.length){el.innerHTML='<div class="empty-state"><div class="empty-state-text">No cafes yet</div></div>';return;}
    const flag=code=>code?`<img src="https://flagcdn.com/16x12/${code.toLowerCase()}.png" style="width:16px;height:11px;object-fit:cover;border-radius:1px;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">`:'';
    el.innerHTML=`<div class="data-table-wrap"><table><thead><tr><th>NAME</th><th>CITY</th><th>COUNTRY</th><th>TYPE</th><th>RATING</th><th></th></tr></thead><tbody>${allCafeDocs.map(c=>`<tr><td>${c.name}</td><td class="muted">${c.city||'—'}</td><td class="muted">${c.country?flag(c.country)+(CODE_TO_NAME[c.country]||c.country):'—'}</td><td class="muted">${c.type||'—'}</td><td>${c.rating||'—'}</td><td><div class="tbl-actions"><button class="tbl-btn edit" onclick="editCafe('${c.id}')">EDIT</button><button class="tbl-btn del" onclick="deleteEntry('cafes','${c.id}',loadCafesTable)">DEL</button></div></td></tr>`).join('')}</tbody></table></div>`;
  }catch(e){el.innerHTML=`<div class="empty-state"><div class="empty-state-text">✗ ${e.message}</div></div>`;}
}
window.editCafe=function(id){
  const c=allCafeDocs.find(d=>d.id===id);if(!c)return;
  const ratingOpts=['★★★★★','★★★★☆','★★★☆☆','★★☆☆☆','★☆☆☆☆'].map(o=>`<option${c.rating===o?' selected':''}>${o}</option>`).join('');
  openModal('EDIT CAFE',`
    <div class="form-grid"><div class="form-group"><label class="form-label">NAME</label><input class="form-input" id="m-name" value="${(c.name||'').replace(/"/g,'&quot;')}"></div><div class="form-group"><label class="form-label">TYPE</label><input class="form-input" id="m-type" value="${c.type||''}"></div></div>
    <div class="form-grid"><div class="form-group"><label class="form-label">CITY</label><input class="form-input" id="m-city" value="${c.city||''}"></div><div class="form-group"><label class="form-label">COUNTRY</label><div class="country-search-wrap" id="m-country-wrap"></div><input type="hidden" id="m-country" value="${c.country||''}"></div></div>
    <div class="form-grid"><div class="form-group"><label class="form-label">ORDERED</label><input class="form-input" id="m-ordered" value="${c.ordered||''}"></div><div class="form-group"><label class="form-label">RATING</label><select class="form-select" id="m-rating">${ratingOpts}</select></div></div>
    <div class="form-grid cols-1"><div class="form-group"><label class="form-label">VIBE</label><textarea class="form-textarea" id="m-vibe">${c.vibe||''}</textarea></div></div>
    <div class="form-grid cols-1"><div class="form-group"><label class="form-label">STORY</label><textarea class="form-textarea" id="m-story" style="min-height:110px">${c.story||''}</textarea></div></div>`,
    async()=>{
      const dd=makeCountryDropdown('m-country-wrap','m-country');dd.setValue(c.country||'');
      const updates={name:mval('m-name')||null,type:mval('m-type')||null,city:mval('m-city')||null,country:document.getElementById('m-country').value||null,ordered:mval('m-ordered')||null,rating:mval('m-rating')||null,vibe:mval('m-vibe')||null,story:mval('m-story')||null};
      await updateDoc(doc(db,'cafes',id),updates);toast('✓ Cafe updated');loadCafesTable();
    }
  );
  // Init the country dropdown after modal is in DOM
  setTimeout(()=>{const dd=makeCountryDropdown('m-country-wrap','m-country');dd.setValue(c.country||'');},50);
};

// ─── EXPERIENCES (with Firebase Storage image upload) ────────────
let allExpDocs=[],selectedExpFile=null;

window.previewExpImg=function(input){
  const file=input.files[0];if(!file)return;
  selectedExpFile=file;
  document.getElementById('e-img-filename').textContent=file.name;
  const reader=new FileReader();reader.onload=e=>{const img=document.getElementById('e-img-preview');img.src=e.target.result;img.style.display='block';};reader.readAsDataURL(file);
  document.getElementById('e-img-url').value=''; // clear URL if file chosen
};

window.addExperience=async function(){
  const title=document.getElementById('e-title').value.trim();if(!title){toast('Title required','err');return;}
  let imgUrl=document.getElementById('e-img-url').value.trim()||null;
  let storagePath=null;

  // Upload file if selected
  if(selectedExpFile){
    toast('Uploading image…','info');
    try{
      const ext=selectedExpFile.name.split('.').pop();
      storagePath=`experiences/${Date.now()}_${title.toLowerCase().replace(/\s+/g,'-').slice(0,40)}.${ext}`;
      const storageRef=ref(storage,storagePath);
      const task=uploadBytesResumable(storageRef,selectedExpFile);
      const prog=document.getElementById('e-img-progress'),bar=document.getElementById('e-img-bar');
      prog.style.display='block';
      imgUrl=await new Promise((resolve,reject)=>{task.on('state_changed',snap=>{bar.style.width=Math.round(snap.bytesTransferred/snap.totalBytes*100)+'%';},reject,async()=>resolve(await getDownloadURL(task.snapshot.ref)));});
      prog.style.display='none';
    }catch(e){toast('✗ Upload failed: '+e.message,'err');return;}
  }

  await addDoc(collection(db,'experiences'),{tab:document.getElementById('e-tab').value,loc:document.getElementById('e-loc').value.trim()||null,label:(document.getElementById('e-label').value.trim()||'').toUpperCase(),title,story:document.getElementById('e-story').value.trim()||null,img:imgUrl,img_storage_path:storagePath,trip_id:document.getElementById('e-trip').value||null,addedAt:serverTimestamp(),addedBy:currentUser.uid});
  toast('✓ Experience saved');clearForm('experience');loadExpTable();loadAllCounts();
};

async function loadExpTable(){
  const el=document.getElementById('expTable');
  try{
    const snap=await getDocs(collection(db,'experiences'));allExpDocs=snap.docs.map(d=>({id:d.id,...d.data()}));
    if(!allExpDocs.length){el.innerHTML='<div class="empty-state"><div class="empty-state-text">No experiences yet</div></div>';return;}
    el.innerHTML=`<div class="data-table-wrap"><table><thead><tr><th>TAB</th><th>TITLE</th><th>LOCATION</th><th>IMAGE</th><th></th></tr></thead><tbody>${allExpDocs.map(e=>`<tr><td class="mono" style="text-transform:uppercase">${e.tab||'—'}</td><td>${e.title||'—'}</td><td class="muted">${e.loc||'—'}</td><td>${e.img?`<img src="${e.img}" style="width:52px;height:34px;object-fit:cover;border-radius:3px">`:'—'}</td><td><div class="tbl-actions"><button class="tbl-btn edit" onclick="editExp('${e.id}')">EDIT</button><button class="tbl-btn del" onclick="deleteEntry('experiences','${e.id}',loadExpTable)">DEL</button></div></td></tr>`).join('')}</tbody></table></div>`;
  }catch(e){el.innerHTML=`<div class="empty-state"><div class="empty-state-text">✗ ${e.message}</div></div>`;}
}
window.editExp=function(id){
  const e=allExpDocs.find(d=>d.id===id);if(!e)return;
  const tabOpts=['adventures','people','moments'].map(o=>`<option value="${o}"${e.tab===o?' selected':''}>${o.charAt(0).toUpperCase()+o.slice(1)}</option>`).join('');
  openModal('EDIT EXPERIENCE',`
    <div class="form-grid cols-3"><div class="form-group"><label class="form-label">TAB</label><select class="form-select" id="m-tab">${tabOpts}</select></div><div class="form-group"><label class="form-label">LOCATION</label><input class="form-input" id="m-loc" value="${e.loc||''}"></div><div class="form-group"><label class="form-label">FILM LABEL</label><input class="form-input" id="m-label" value="${e.label||''}" maxlength="12"></div></div>
    <div class="form-grid cols-1"><div class="form-group"><label class="form-label">TITLE</label><input class="form-input" id="m-title" value="${(e.title||'').replace(/"/g,'&quot;')}"></div></div>
    <div class="form-grid cols-1"><div class="form-group"><label class="form-label">STORY</label><textarea class="form-textarea" id="m-story" style="min-height:120px">${e.story||''}</textarea></div></div>
    <div class="form-group" style="margin-top:8px">
      <label class="form-label">IMAGE URL (current shown below)</label>
      <input class="form-input" id="m-img" value="${e.img||''}" placeholder="https://… or leave blank">
      ${e.img?`<img src="${e.img}" style="width:100%;max-height:120px;object-fit:cover;border-radius:6px;margin-top:8px" onerror="this.style.display='none'">`:''}
    </div>`,
    async()=>{
      const updates={tab:mval('m-tab'),loc:mval('m-loc')||null,label:mval('m-label').toUpperCase()||null,title:mval('m-title')||null,story:mval('m-story')||null,img:mval('m-img')||null};
      await updateDoc(doc(db,'experiences',id),updates);toast('✓ Experience updated');loadExpTable();
    }
  );
};

// ─── ADVENTURES ──────────────────────────────────────────────────
let allAdvDocs=[];
window.addAdventure=async function(){
  const title=document.getElementById('adv-title').value.trim();if(!title){toast('Title required','err');return;}
  await addDoc(collection(db,'adventures'),{title,location:document.getElementById('adv-loc').value.trim()||null,country:dropdowns['adv-country'].getValue()||null,date:document.getElementById('adv-date').value||null,category:document.getElementById('adv-cat').value,story:document.getElementById('adv-story').value.trim()||null,trip_id:document.getElementById('adv-trip').value||null,addedAt:serverTimestamp(),addedBy:currentUser.uid});
  toast('✓ Adventure saved');clearForm('adventure');loadAdvTable();loadAllCounts();
};
async function loadAdvTable(){
  const el=document.getElementById('advTable');
  try{
    const snap=await getDocs(collection(db,'adventures'));allAdvDocs=snap.docs.map(d=>({id:d.id,...d.data()}));
    if(!allAdvDocs.length){el.innerHTML='<div class="empty-state"><div class="empty-state-text">No adventures yet</div></div>';return;}
    const flag=code=>code?`<img src="https://flagcdn.com/16x12/${code.toLowerCase()}.png" style="width:16px;height:11px;object-fit:cover;border-radius:1px;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">`:'';
    el.innerHTML=`<div class="data-table-wrap"><table><thead><tr><th>TITLE</th><th>LOCATION</th><th>COUNTRY</th><th>CATEGORY</th><th>DATE</th><th></th></tr></thead><tbody>${allAdvDocs.map(a=>`<tr><td>${a.title}</td><td class="muted">${a.location||'—'}</td><td class="muted">${a.country?flag(a.country)+(CODE_TO_NAME[a.country]||a.country):'—'}</td><td class="muted">${a.category||'—'}</td><td class="muted">${a.date||'—'}</td><td><div class="tbl-actions"><button class="tbl-btn edit" onclick="editAdv('${a.id}')">EDIT</button><button class="tbl-btn del" onclick="deleteEntry('adventures','${a.id}',loadAdvTable)">DEL</button></div></td></tr>`).join('')}</tbody></table></div>`;
  }catch(e){el.innerHTML=`<div class="empty-state"><div class="empty-state-text">✗ ${e.message}</div></div>`;}
}
window.editAdv=function(id){
  const a=allAdvDocs.find(d=>d.id===id);if(!a)return;
  const cats=['adrenaline','trek','expedition','road','wonder','geopolitical','natural','cultural'];
  const catOpts=cats.map(c=>`<option value="${c}"${a.category===c?' selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('');
  openModal('EDIT ADVENTURE',`
    <div class="form-grid cols-1"><div class="form-group"><label class="form-label">TITLE</label><input class="form-input" id="m-title" value="${(a.title||'').replace(/"/g,'&quot;')}"></div></div>
    <div class="form-grid cols-3"><div class="form-group"><label class="form-label">LOCATION</label><input class="form-input" id="m-loc" value="${a.location||''}"></div><div class="form-group"><label class="form-label">COUNTRY</label><div class="country-search-wrap" id="m-country-wrap"></div><input type="hidden" id="m-country" value="${a.country||''}"></div><div class="form-group"><label class="form-label">DATE</label><input class="form-input" id="m-date" type="date" value="${a.date||''}"></div></div>
    <div class="form-grid"><div class="form-group"><label class="form-label">CATEGORY</label><select class="form-select" id="m-cat">${catOpts}</select></div><div class="form-group"></div></div>
    <div class="form-grid cols-1"><div class="form-group"><label class="form-label">STORY</label><textarea class="form-textarea" id="m-story" style="min-height:130px">${a.story||''}</textarea></div></div>`,
    async()=>{
      const updates={title:mval('m-title')||null,location:mval('m-loc')||null,country:document.getElementById('m-country').value||null,date:mval('m-date')||null,category:mval('m-cat')||null,story:mval('m-story')||null};
      await updateDoc(doc(db,'adventures',id),updates);toast('✓ Adventure updated');loadAdvTable();
    }
  );
  setTimeout(()=>{const dd=makeCountryDropdown('m-country-wrap','m-country');dd.setValue(a.country||'');},50);
};

// ─── PEOPLE ──────────────────────────────────────────────────────
let allPeopleDocs=[];
window.addPerson=async function(){
  const name=document.getElementById('p-name').value.trim();if(!name){toast('Name required','err');return;}
  await addDoc(collection(db,'people'),{name,met_at:document.getElementById('p-met').value.trim()||null,country:dropdowns['p-country'].getValue()||null,story:document.getElementById('p-story').value.trim()||null,trip_id:document.getElementById('p-trip').value||null,addedAt:serverTimestamp(),addedBy:currentUser.uid});
  toast('✓ Person saved');clearForm('person');loadPeopleTable();
};
async function loadPeopleTable(){
  const el=document.getElementById('peopleTable');
  try{
    const snap=await getDocs(collection(db,'people'));allPeopleDocs=snap.docs.map(d=>({id:d.id,...d.data()}));
    if(!allPeopleDocs.length){el.innerHTML='<div class="empty-state"><div class="empty-state-text">No people yet</div></div>';return;}
    const flag=code=>code?`<img src="https://flagcdn.com/16x12/${code.toLowerCase()}.png" style="width:16px;height:11px;object-fit:cover;border-radius:1px;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">`:'';
    el.innerHTML=`<div class="data-table-wrap"><table><thead><tr><th>NAME</th><th>MET AT</th><th>COUNTRY</th><th></th></tr></thead><tbody>${allPeopleDocs.map(p=>`<tr><td>${p.name}</td><td class="muted">${p.met_at||'—'}</td><td class="muted">${p.country?flag(p.country)+(CODE_TO_NAME[p.country]||p.country):'—'}</td><td><div class="tbl-actions"><button class="tbl-btn edit" onclick="editPerson('${p.id}')">EDIT</button><button class="tbl-btn del" onclick="deleteEntry('people','${p.id}',loadPeopleTable)">DEL</button></div></td></tr>`).join('')}</tbody></table></div>`;
  }catch(e){el.innerHTML=`<div class="empty-state"><div class="empty-state-text">✗ ${e.message}</div></div>`;}
}
window.editPerson=function(id){
  const p=allPeopleDocs.find(d=>d.id===id);if(!p)return;
  openModal('EDIT PERSON',`
    <div class="form-grid cols-1"><div class="form-group"><label class="form-label">NAME</label><input class="form-input" id="m-name" value="${(p.name||'').replace(/"/g,'&quot;')}"></div></div>
    <div class="form-grid"><div class="form-group"><label class="form-label">MET AT</label><input class="form-input" id="m-met" value="${p.met_at||''}"></div><div class="form-group"><label class="form-label">COUNTRY</label><div class="country-search-wrap" id="m-country-wrap"></div><input type="hidden" id="m-country" value="${p.country||''}"></div></div>
    <div class="form-grid cols-1"><div class="form-group"><label class="form-label">STORY</label><textarea class="form-textarea" id="m-story" style="min-height:110px">${p.story||''}</textarea></div></div>`,
    async()=>{
      const updates={name:mval('m-name')||null,met_at:mval('m-met')||null,country:document.getElementById('m-country').value||null,story:mval('m-story')||null};
      await updateDoc(doc(db,'people',id),updates);toast('✓ Person updated');loadPeopleTable();
    }
  );
  setTimeout(()=>{const dd=makeCountryDropdown('m-country-wrap','m-country');dd.setValue(p.country||'');},50);
};

// ─── PHOTOGRAPHY ─────────────────────────────────────────────────
let selectedPhotoFile=null;
window.handlePhotoDrop=function(e){e.preventDefault();document.getElementById('photoDropZone').classList.remove('over');const file=e.dataTransfer.files[0];if(file)handlePhotoSelect(file);};
window.handlePhotoSelect=function(file){
  if(!file)return;if(file.size>10*1024*1024){toast('Max 10MB','err');return;}
  selectedPhotoFile=file;
  const reader=new FileReader();reader.onload=e=>{document.getElementById('photoPreview').innerHTML=`<div class="upload-preview-item"><img src="${e.target.result}" alt="preview"><button class="remove-btn" onclick="selectedPhotoFile=null;document.getElementById('photoPreview').innerHTML=''">×</button></div>`;};reader.readAsDataURL(file);
  if(!document.getElementById('ph-date').value)document.getElementById('ph-date').value=new Date().toISOString().split('T')[0];
};
window.uploadPhoto=async function(){
  const title=document.getElementById('ph-title').value.trim();if(!title){toast('Title required','err');return;}if(!selectedPhotoFile){toast('Select a photo first','err');return;}
  const btn=document.getElementById('uploadBtn');btn.disabled=true;btn.textContent='UPLOADING…';
  try{
    const ext=selectedPhotoFile.name.split('.').pop();const path=`photos/${Date.now()}_${title.toLowerCase().replace(/\s+/g,'-').slice(0,40)}.${ext}`;
    const storageRef=ref(storage,path);const task=uploadBytesResumable(storageRef,selectedPhotoFile);
    const imageUrl=await new Promise((resolve,reject)=>{task.on('state_changed',snap=>{const pct=Math.round(snap.bytesTransferred/snap.totalBytes*100);document.getElementById('uploadProgress').style.display='block';document.getElementById('uploadBar').style.width=pct+'%';document.getElementById('uploadPercent').textContent=pct+'%';},reject,async()=>resolve(await getDownloadURL(task.snapshot.ref)));});
    const exif={};['camera','lens','settings'].forEach(k=>{const v=document.getElementById(`ph-${k}`).value.trim();if(v)exif[k]=v;});
    await addDoc(collection(db,'photos'),{title,story:document.getElementById('ph-story').value.trim()||null,image_url:imageUrl,location:document.getElementById('ph-location').value.trim()||null,country_id:dropdowns['ph-country'].getValue()||null,date:document.getElementById('ph-date').value||null,element:document.getElementById('ph-element').value,featured:document.getElementById('ph-featured').value==='true',trip_id:document.getElementById('ph-trip').value||null,exif:Object.keys(exif).length?exif:null,addedAt:serverTimestamp(),addedBy:currentUser.uid});
    toast('✓ Photo saved');clearForm('photo');document.getElementById('uploadProgress').style.display='none';loadPhotoGrid();loadAllCounts();
  }catch(e){toast('✗ '+e.message,'err');}
  finally{btn.disabled=false;btn.textContent='UPLOAD & SAVE';}
};
async function loadPhotoGrid(){
  const grid=document.getElementById('photoGrid');grid.innerHTML='<div class="loading-row"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div><span>Loading…</span></div>';
  try{
    const snap=await getDocs(collection(db,'photos'));
    if(snap.empty){grid.innerHTML='<div class="empty-state"><div class="empty-state-text">No photos yet</div></div>';return;}
    grid.innerHTML=snap.docs.map(d=>{const p=d.data();return`<div class="photo-thumb">${p.image_url?`<img src="${p.image_url}" alt="${p.title||''}" loading="lazy">`:'<div style="width:100%;height:100%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--muted)">NO IMG</div>'}${p.featured?'<div class="photo-featured-badge">FEATURED</div>':''}<div class="photo-thumb-overlay"><div class="photo-thumb-title">${p.title||'—'}</div><button class="tbl-btn del" style="font-size:9px" onclick="deleteEntry('photos','${d.id}',loadPhotoGrid)">DELETE</button></div></div>`;}).join('');
  }catch(e){grid.innerHTML=`<div class="empty-state"><div class="empty-state-text">✗ ${e.message}</div></div>`;}
}

// ─── TRIPS ───────────────────────────────────────────────────────
let allTripDocs=[];
window.addTrip=async function(){
  const title=document.getElementById('tr-title').value.trim();if(!title){toast('Trip name required','err');return;}
  await addDoc(collection(db,'trips'),{title,date_from:document.getElementById('tr-from').value||null,date_to:document.getElementById('tr-to').value||null,status:document.getElementById('tr-status').value,notes:document.getElementById('tr-notes').value.trim()||null,addedAt:serverTimestamp(),addedBy:currentUser.uid});
  toast('✓ Trip saved');clearForm('trip');loadTripsTable();loadTripsCache();
};
async function loadTripsTable(){
  const el=document.getElementById('tripsTable');
  try{
    const snap=await getDocs(collection(db,'trips'));allTripDocs=snap.docs.map(d=>({id:d.id,...d.data()}));
    if(!allTripDocs.length){el.innerHTML='<div class="empty-state"><div class="empty-state-text">No trips yet</div></div>';return;}
    const SC={done:'var(--green)',upcoming:'var(--teal)',planning:'var(--gold)'};
    el.innerHTML=`<div class="data-table-wrap"><table><thead><tr><th>TRIP</th><th>FROM</th><th>TO</th><th>STATUS</th><th></th></tr></thead><tbody>${allTripDocs.map(t=>`<tr><td>${t.title}</td><td class="muted">${t.date_from||'—'}</td><td class="muted">${t.date_to||'—'}</td><td><span style="color:${SC[t.status]||'var(--muted)'};font-size:10px;letter-spacing:1px">${(t.status||'').toUpperCase()}</span></td><td><div class="tbl-actions"><button class="tbl-btn edit" onclick="editTrip('${t.id}')">EDIT</button><button class="tbl-btn del" onclick="deleteEntry('trips','${t.id}',()=>{loadTripsTable();loadTripsCache();})">DEL</button></div></td></tr>`).join('')}</tbody></table></div>`;
  }catch(e){el.innerHTML=`<div class="empty-state"><div class="empty-state-text">✗ ${e.message}</div></div>`;}
}
window.editTrip=function(id){
  const t=allTripDocs.find(d=>d.id===id);if(!t)return;
  const stOpts=['done','upcoming','planning'].map(s=>`<option value="${s}"${t.status===s?' selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('');
  openModal('EDIT TRIP',`
    <div class="form-grid cols-1"><div class="form-group"><label class="form-label">TRIP NAME</label><input class="form-input" id="m-title" value="${(t.title||'').replace(/"/g,'&quot;')}"></div></div>
    <div class="form-grid cols-3"><div class="form-group"><label class="form-label">DATE FROM</label><input class="form-input" id="m-from" type="date" value="${t.date_from||''}"></div><div class="form-group"><label class="form-label">DATE TO</label><input class="form-input" id="m-to" type="date" value="${t.date_to||''}"></div><div class="form-group"><label class="form-label">STATUS</label><select class="form-select" id="m-status">${stOpts}</select></div></div>
    <div class="form-grid cols-1"><div class="form-group"><label class="form-label">NOTES</label><textarea class="form-textarea" id="m-notes">${t.notes||''}</textarea></div></div>`,
    async()=>{
      await updateDoc(doc(db,'trips',id),{title:mval('m-title')||null,date_from:mval('m-from')||null,date_to:mval('m-to')||null,status:mval('m-status')||null,notes:mval('m-notes')||null});
      toast('✓ Trip updated');loadTripsTable();loadTripsCache();
    }
  );
};

// ─── COUNTRIES ───────────────────────────────────────────────────
let countryList=[];
const STATUS_META={visited:{label:'VISITED',color:'var(--teal)',bg:'rgba(91,192,190,0.1)',border:'rgba(91,192,190,0.25)'},transiting:{label:'TRANSIT*',color:'var(--gold)',bg:'rgba(245,158,11,0.1)',border:'rgba(245,158,11,0.25)'},wishlist:{label:'WISHLIST',color:'var(--muted)',bg:'rgba(255,255,255,0.04)',border:'var(--border)'}};
async function loadCountries(){
  const el=document.getElementById('countriesList');el.innerHTML='<div class="loading-row"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div><span>Loading…</span></div>';
  try{const snap=await getDocs(collection(db,'countries'));countryList=snap.docs.map(d=>({_docId:d.id,...d.data()}));countryList.sort((a,b)=>a.name.localeCompare(b.name));renderCountries(countryList);renderCountryStats();}
  catch(e){el.innerHTML=`<div class="empty-state"><div class="empty-state-text">✗ ${e.message}</div></div>`;}
}
function renderCountryStats(){
  const el=document.getElementById('countryStats');if(!el)return;
  const v=countryList.filter(c=>c.status==='visited').length,t=countryList.filter(c=>c.status==='transiting').length,w=countryList.filter(c=>c.status==='wishlist').length;
  el.innerHTML=`<div class="stat-card"><div class="stat-card-num teal">${v}</div><div class="stat-card-label">VISITED</div></div><div class="stat-card"><div class="stat-card-num" style="color:var(--gold)">${t}</div><div class="stat-card-label">TRANSIT</div></div><div class="stat-card"><div class="stat-card-num" style="color:var(--muted)">${w}</div><div class="stat-card-label">WISHLIST</div></div><div class="stat-card"><div class="stat-card-num">${countryList.length}</div><div class="stat-card-label">TOTAL</div></div>`;
}
function renderCountries(list){
  const el=document.getElementById('countriesList');if(!el)return;
  if(!list.length){el.innerHTML='<div class="empty-state"><div class="empty-state-text">No countries match</div></div>';return;}
  el.innerHTML='';
  list.forEach((c)=>{
    const gIdx=countryList.indexOf(c),m=STATUS_META[c.status]||STATUS_META.visited,flagId=(c._docId||'').toLowerCase();
    const row=document.createElement('div');row.className='country-row';
    row.innerHTML=`<img class="flag-img" src="https://flagcdn.com/${flagId}.svg" onerror="this.style.display='none'" loading="lazy"><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:6px"><span style="font-size:13px;color:var(--text)">${c.name}</span>${c.emoji?`<span style="font-size:14px">${c.emoji}</span>`:''}<span style="font-family:var(--mono);font-size:9px;color:var(--muted);background:var(--bg3);padding:1px 5px;border-radius:2px">${c._docId||c.id}</span></div>${c.notes?`<div style="font-size:11px;color:var(--muted);font-style:italic">${c.notes}</div>`:''}</div><div style="display:flex;gap:3px">${['visited','transiting','wishlist'].map(s=>{const sm=STATUS_META[s];const active=c.status===s;return`<button class="status-btn ${active?'active-'+s:''}" onclick="toggleStatus(${gIdx},'${s}')" style="${active?`background:${sm.bg};border-color:${sm.border};color:${sm.color}`:''}">${sm.label}</button>`;}).join('')}</div><div style="display:flex;gap:2px">${['❤️','😍','📸','🙉','😀',''].map(e=>`<button class="emoji-btn ${c.emoji===e&&e?'active':''}" onclick="setEmoji(${gIdx},'${e}')" title="${e||'clear'}">${e||'✕'}</button>`).join('')}</div><input class="notes-input" value="${c.notes||''}" placeholder="notes…" oninput="setNotes(${gIdx},this.value)"><button onclick="removeCountry(${gIdx})" style="font-size:9px;padding:3px 8px;background:transparent;border:1px solid var(--border);border-radius:3px;cursor:pointer;color:var(--muted);transition:all .15s" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--muted)'">DEL</button>`;
    el.appendChild(row);
  });
}
window.filterCountries=function(q){const sf=document.getElementById('countryFilter')?.value||'all';let filtered=countryList;if(sf!=='all')filtered=filtered.filter(c=>c.status===sf);if(q){const ql=q.toLowerCase();filtered=filtered.filter(c=>c.name.toLowerCase().includes(ql)||(c._docId||'').toLowerCase().includes(ql)||(c.notes||'').toLowerCase().includes(ql));}renderCountries(filtered);};
window.toggleStatus=function(idx,status){if(countryList[idx]){countryList[idx].status=status;renderCountries(countryList);renderCountryStats();}};
window.setEmoji=function(idx,emoji){if(countryList[idx]){countryList[idx].emoji=emoji;renderCountries(countryList);}};
window.setNotes=function(idx,notes){if(countryList[idx])countryList[idx].notes=notes;};
window.removeCountry=function(idx){if(!confirm(`Remove ${countryList[idx]?.name}?`))return;countryList.splice(idx,1);renderCountries(countryList);renderCountryStats();};
window.addCountry=function(){
  const name=document.getElementById('cn-name').value.trim(),id=document.getElementById('cn-id').value.toUpperCase().trim();
  if(!name||!id){toast('Name and code required','err');return;}if(countryList.find(c=>(c._docId||c.id)===id)){toast(`${id} already in list`,'err');return;}
  countryList.push({_docId:id,id,name,lat:parseFloat(document.getElementById('cn-lat').value)||0,lon:parseFloat(document.getElementById('cn-lon').value)||0,status:document.getElementById('cn-status').value,emoji:document.getElementById('cn-emoji').value.trim(),notes:document.getElementById('cn-notes').value.trim()});
  clearForm('country');renderCountries(countryList);renderCountryStats();toast(`✓ ${name} added — hit Save All to persist`);
};
window.saveCountries=async function(){
  try{for(const c of countryList){const{_docId,...data}=c;await setDoc(doc(db,'countries',_docId||data.id||c.name),data);}toast(`✓ ${countryList.length} countries saved`);}
  catch(e){toast('✗ '+e.message,'err');}
};

// ─── CONTENT ─────────────────────────────────────────────────────
async function loadContent(){for(const f of['heroHeadline','heroSub','originQuote']){try{const d=await getDoc(doc(db,'content',f));if(d.exists()){const el=document.getElementById('ct-'+f);if(el)el.value=d.data().value||'';}}catch(_){}}}
window.saveContent=async function(field){const el=document.getElementById('ct-'+field);if(!el)return;await setDoc(doc(db,'content',field),{value:el.value.trim(),updatedAt:serverTimestamp(),updatedBy:currentUser.uid});toast(`✓ ${field} saved`);};

// ─── TRAVEL PLANS ────────────────────────────────────────────────
let allTravelDocs=[];
window.addTravelPlan=async function(){
  const dest=document.getElementById('tp-dest').value.trim();if(!dest){toast('Destination required','err');return;}
  await addDoc(collection(db,'travel_plans'),{destination:dest,status:document.getElementById('tp-status').value,date:document.getElementById('tp-date').value.trim()||null,with:document.getElementById('tp-with').value.trim()||null,notes:document.getElementById('tp-notes').value.trim()||null,addedAt:serverTimestamp(),addedBy:currentUser.uid});
  toast('✓ Plan saved');clearForm('travel');loadTravelTable();
};
const STATUS_COLORS={wishlist:'var(--muted)',planning:'var(--gold)',booked:'var(--teal)',done:'var(--green)'};
async function loadTravelTable(){
  const el=document.getElementById('travelTable');
  try{
    const snap=await getDocs(collection(db,'travel_plans'));allTravelDocs=snap.docs.map(d=>({id:d.id,...d.data()}));
    if(!allTravelDocs.length){el.innerHTML='<div class="empty-state"><div class="empty-state-text">No plans yet</div></div>';return;}
    el.innerHTML=`<div class="data-table-wrap"><table><thead><tr><th>DESTINATION</th><th>STATUS</th><th>DATE</th><th>WITH</th><th></th></tr></thead><tbody>${allTravelDocs.map(t=>`<tr><td>${t.destination}</td><td><span style="color:${STATUS_COLORS[t.status]||'var(--muted)'};font-size:10px;letter-spacing:1px">${(t.status||'').toUpperCase()}</span></td><td class="muted">${t.date||'—'}</td><td class="muted">${t.with||'—'}</td><td><div class="tbl-actions"><button class="tbl-btn edit" onclick="editTravel('${t.id}')">EDIT</button><button class="tbl-btn del" onclick="deleteEntry('travel_plans','${t.id}',loadTravelTable)">DEL</button></div></td></tr>`).join('')}</tbody></table></div>`;
  }catch(e){el.innerHTML=`<div class="empty-state"><div class="empty-state-text">✗ ${e.message}</div></div>`;}
}
window.editTravel=function(id){
  const t=allTravelDocs.find(d=>d.id===id);if(!t)return;
  const stOpts=['wishlist','planning','booked','done'].map(s=>`<option value="${s}"${t.status===s?' selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('');
  openModal('EDIT TRAVEL PLAN',`
    <div class="form-grid"><div class="form-group"><label class="form-label">DESTINATION</label><input class="form-input" id="m-dest" value="${(t.destination||'').replace(/"/g,'&quot;')}"></div><div class="form-group"><label class="form-label">STATUS</label><select class="form-select" id="m-status">${stOpts}</select></div></div>
    <div class="form-grid"><div class="form-group"><label class="form-label">DATE</label><input class="form-input" id="m-date" value="${t.date||''}"></div><div class="form-group"><label class="form-label">WITH</label><input class="form-input" id="m-with" value="${t.with||''}"></div></div>
    <div class="form-grid cols-1"><div class="form-group"><label class="form-label">NOTES</label><textarea class="form-textarea" id="m-notes">${t.notes||''}</textarea></div></div>`,
    async()=>{
      await updateDoc(doc(db,'travel_plans',id),{destination:mval('m-dest')||null,status:mval('m-status')||null,date:mval('m-date')||null,with:mval('m-with')||null,notes:mval('m-notes')||null});
      toast('✓ Plan updated');loadTravelTable();
    }
  );
};

// ─── JOURNAL ─────────────────────────────────────────────────────
let allJournalDocs=[];
window.addJournalEntry=async function(){
  if(currentRole!=='super-admin'){toast('✗ Super-admin only','err');return;}
  const title=document.getElementById('j-title').value.trim();if(!title){toast('Title required','err');return;}
  await addDoc(collection(db,'journal'),{title,body:document.getElementById('j-body').value.trim()||null,mood:document.getElementById('j-mood').value,loc:document.getElementById('j-loc').value.trim()||null,date:new Date().toISOString(),addedAt:serverTimestamp()});
  toast('✓ Entry saved');clearForm('journal');loadJournal();loadAllCounts();
};
async function loadJournal(){
  if(currentRole!=='super-admin')return;
  const el=document.getElementById('journalEntries');
  try{
    const snap=await getDocs(collection(db,'journal'));allJournalDocs=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    if(!allJournalDocs.length){el.innerHTML='<div class="empty-state"><div class="empty-state-text">No entries yet</div></div>';return;}
    el.innerHTML='';
    allJournalDocs.forEach(j=>{
      const dateStr=j.date?new Date(j.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
      const div=document.createElement('div');div.className='journal-entry';
      div.innerHTML=`<div class="journal-entry-date">${dateStr} · ${j.mood||''} ${j.loc?'· '+j.loc:''}</div><div class="journal-entry-title">${j.title}</div><div class="journal-entry-preview">${(j.body||'').substring(0,120)}${(j.body||'').length>120?'…':''}</div><div style="margin-top:10px;display:flex;gap:8px"><button class="tbl-btn edit" onclick="editJournal('${j.id}')">EDIT</button><button class="tbl-btn del" onclick="deleteEntry('journal','${j.id}',loadJournal)">DELETE</button></div>`;
      el.appendChild(div);
    });
  }catch(e){el.innerHTML=`<div class="empty-state"><div class="empty-state-text">✗ ${e.message}</div></div>`;}
}
window.editJournal=function(id){
  const j=allJournalDocs.find(d=>d.id===id);if(!j)return;
  const moods=['✦ Reflective','⚡ Energised','✈ Wandering','⏸ Still','◎ Focused','☁ Uncertain'];
  const moodOpts=moods.map(m=>`<option${j.mood===m?' selected':''}>${m}</option>`).join('');
  openModal('EDIT JOURNAL ENTRY',`
    <div class="form-grid cols-1"><div class="form-group"><label class="form-label">TITLE</label><input class="form-input" id="m-title" value="${(j.title||'').replace(/"/g,'&quot;')}"></div></div>
    <div class="form-grid cols-1"><div class="form-group"><label class="form-label">ENTRY</label><textarea class="form-textarea" id="m-body" style="min-height:180px">${j.body||''}</textarea></div></div>
    <div class="form-grid"><div class="form-group"><label class="form-label">MOOD</label><select class="form-select" id="m-mood">${moodOpts}</select></div><div class="form-group"><label class="form-label">LOCATION</label><input class="form-input" id="m-loc" value="${j.loc||''}"></div></div>`,
    async()=>{
      await updateDoc(doc(db,'journal',id),{title:mval('m-title')||null,body:mval('m-body')||null,mood:mval('m-mood')||null,loc:mval('m-loc')||null});
      toast('✓ Entry updated');loadJournal();
    }
  );
};

// ─── USERS ───────────────────────────────────────────────────────
window.addUser=async function(){
  if(currentRole!=='super-admin'){toast('✗ Super-admin only','err');return;}
  const uid=document.getElementById('u-uid').value.trim(),email=document.getElementById('u-email').value.trim(),name=document.getElementById('u-name').value.trim(),role=document.getElementById('u-role').value;
  if(!uid||!email){toast('UID and email required','err');return;}
  await setDoc(doc(db,'admins',uid),{email,name,role,addedAt:new Date().toISOString(),addedBy:currentUser.uid,photoURL:null});
  toast(`✓ ${name||email} added as ${role}`);['u-uid','u-name','u-email'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});loadUsers();
};
async function loadUsers(){
  if(currentRole!=='super-admin')return;
  const el=document.getElementById('usersTable');
  try{
    const snap=await getDocs(collection(db,'admins'));
    el.innerHTML=`<div class="data-table-wrap"><table><thead><tr><th>NAME</th><th>EMAIL</th><th>ROLE</th><th>ADDED</th><th></th></tr></thead><tbody>${snap.docs.map(d=>{const u=d.data();const rc=u.role==='super-admin'?'role-super':u.role==='editor'?'role-editor':'role-viewer';const date=u.addedAt?new Date(u.addedAt).toLocaleDateString('en-GB'):'—';const isSelf=d.id===currentUser.uid;return`<tr><td>${u.name||'—'}</td><td class="muted">${u.email}</td><td><span class="role-badge ${rc}">${u.role}</span></td><td class="muted">${date}</td><td>${isSelf?'<span style="font-size:10px;color:var(--muted)">YOU</span>':`<button class="tbl-btn del" onclick="deleteEntry('admins','${d.id}',loadUsers)">REMOVE</button>`}</td></tr>`;}).join('')}</tbody></table></div>`;
  }catch(e){el.innerHTML=`<div class="empty-state"><div class="empty-state-text">✗ ${e.message}</div></div>`;}
}

// ─── DELETE ──────────────────────────────────────────────────────
window.deleteEntry=async function(col,docId,reloadFn){if(!confirm('Delete? Cannot be undone.'))return;try{await deleteDoc(doc(db,col,docId));toast('✓ Deleted');if(typeof reloadFn==='function')reloadFn();}catch(e){toast('✗ '+e.message,'err');}};

// ─── CONFIG ──────────────────────────────────────────────────────
const SERVICE_LABELS={fr24:'FR24 — FlightRadar24',seats_aero:'Seats.aero',planespotters:'Planespotters',unsplash:'Unsplash',google_maps:'Google Maps',openai:'OpenAI'};
async function loadConfig(){if(currentRole!=='super-admin')return;loadApiKeys();loadSiteSettings();}
async function loadApiKeys(){
  const el=document.getElementById('apiKeysList');if(!el)return;
  try{
    const snap=await getDocs(collection(db,'config'));
    const keyDocs=snap.docs.map(d=>({id:d.id,...d.data()})).filter(d=>d.api_key||d.bearer_token||d.client_id||d.client_secret||d.value);
    if(!keyDocs.length){el.innerHTML=`<div class="empty-state" style="padding:20px 0"><div class="empty-state-text">No API keys saved yet</div></div>`;return;}
    el.innerHTML='';
    keyDocs.forEach(d=>{
      const label=SERVICE_LABELS[d.id]||d.id,keyType=d.key_type||'api_key',rawVal=d.api_key||d.bearer_token||d.client_id||d.client_secret||d.value||'';
      const masked=rawVal.length>8?rawVal.substring(0,4)+'••••••••'+rawVal.slice(-4):'••••••••';
      const savedAt=d.saved_at?new Date(d.saved_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'';
      const row=document.createElement('div');row.className='api-key-row';row.dataset.docId=d.id;row.dataset.val=rawVal;row.dataset.shown='false';
      row.innerHTML=`<div class="api-key-service">${label.toUpperCase()}</div><div class="api-key-type">${keyType.replace('_',' ').toUpperCase()}</div><input class="api-key-value" id="kv-${d.id}" value="${masked}" readonly style="color:var(--muted);cursor:default" autocomplete="off">${d.notes?`<div class="api-key-notes" title="${d.notes}">${d.notes}</div>`:''}<div class="api-key-date">${savedAt}</div><div style="display:flex;gap:6px;margin-left:auto;flex-shrink:0"><button class="tbl-btn" onclick="toggleKeyVisibility('${d.id}')" id="vis-${d.id}">SHOW</button><button class="tbl-btn del" onclick="deleteConfigKey('${d.id}')">DEL</button></div>`;
      el.appendChild(row);
    });
  }catch(e){el.innerHTML=`<div class="empty-state"><div class="empty-state-text">✗ ${e.message}</div></div>`;}
}
window.toggleKeyVisibility=function(docId){const row=document.querySelector(`[data-doc-id="${docId}"]`),inp=document.getElementById(`kv-${docId}`),btn=document.getElementById(`vis-${docId}`);if(!row||!inp)return;const shown=row.dataset.shown==='true';if(shown){const raw=row.dataset.val;inp.value=raw.length>8?raw.substring(0,4)+'••••••••'+raw.slice(-4):'••••••••';inp.style.color='var(--muted)';btn.textContent='SHOW';row.dataset.shown='false';}else{inp.value=row.dataset.val;inp.style.color='var(--text)';btn.textContent='HIDE';row.dataset.shown='true';}};
window.onConfigServiceChange=function(){document.getElementById('cfg-custom-wrap').style.display=document.getElementById('cfg-service').value==='custom'?'':'none';};
window.toggleCfgVisibility=function(){const inp=document.getElementById('cfg-value'),btn=document.getElementById('cfg-vis-btn');if(inp.type==='password'){inp.type='text';btn.textContent='HIDE';}else{inp.type='password';btn.textContent='SHOW';}};
window.saveApiKey=async function(){
  if(currentRole!=='super-admin'){toast('✗ Super-admin only','err');return;}
  const svcEl=document.getElementById('cfg-service'),svc=svcEl.value==='custom'?(document.getElementById('cfg-custom').value.trim().toLowerCase().replace(/\s+/g,'_')):svcEl.value;
  if(!svc){toast('Select a service','err');return;}const keyType=document.getElementById('cfg-type').value,value=document.getElementById('cfg-value').value.trim();if(!value){toast('Value required','err');return;}
  const save={key_type:keyType,notes:document.getElementById('cfg-notes').value.trim()||null,saved_at:new Date().toISOString(),saved_by:currentUser.uid};save[keyType]=value;if(keyType!=='api_key')save.api_key=value;
  try{await setDoc(doc(db,'config',svc),save,{merge:true});toast(`✓ ${svc} key saved`);clearConfigForm();loadApiKeys();if(svc==='fr24'){adbApiKey=value;document.getElementById('adbKey').placeholder='FR24 token saved ✓';}}catch(e){toast('✗ '+e.message,'err');}
};
window.deleteConfigKey=async function(docId){if(!confirm(`Delete ${docId} key?`))return;try{await deleteDoc(doc(db,'config',docId));toast(`✓ ${docId} deleted`);loadApiKeys();}catch(e){toast('✗ '+e.message,'err');}};
window.clearConfigForm=function(){['cfg-service','cfg-custom','cfg-value','cfg-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById('cfg-custom-wrap').style.display='none';document.getElementById('cfg-value').type='password';document.getElementById('cfg-vis-btn').textContent='SHOW';};
async function loadSiteSettings(){
  try{const snap=await getDoc(doc(db,'config','site_settings'));if(!snap.exists())return;const d=snap.data();const fields={'cfg-maintenance':'maintenance_mode','cfg-photo-visible':'photography_visible'};Object.entries(fields).forEach(([elId,key])=>{const el=document.getElementById(elId);if(el&&d[key]!==undefined)el.checked=!!d[key];});const tagEl=document.getElementById('cfg-tagline'),emailEl=document.getElementById('cfg-email');if(tagEl&&d.tagline)tagEl.value=d.tagline;if(emailEl&&d.contact_email)emailEl.value=d.contact_email;}catch(_){}
}
window.saveSiteSetting=async function(key,value){try{await setDoc(doc(db,'config','site_settings'),{[key]:value,updated_at:new Date().toISOString(),updated_by:currentUser.uid},{merge:true});toast(`✓ ${key.replace(/_/g,' ')} ${value?'enabled':'disabled'}`);}catch(e){toast('✗ '+e.message,'err');}};
window.saveSiteText=async function(key){const elMap={tagline:'cfg-tagline',contact_email:'cfg-email'};const el=document.getElementById(elMap[key]);if(!el)return;const value=el.value.trim();if(!value){toast('Value required','err');return;}try{await setDoc(doc(db,'config','site_settings'),{[key]:value,updated_at:new Date().toISOString(),updated_by:currentUser.uid},{merge:true});toast(`✓ ${key.replace(/_/g,' ')} saved`);}catch(e){toast('✗ '+e.message,'err');}};
window.checkCors=async function(){const el=document.getElementById('corsStatus');if(el){el.textContent='Checking…';el.style.color='var(--muted)';}try{const res=await fetch('https://firebasestorage.googleapis.com/v0/b/nomad-404.firebasestorage.app/o',{method:'OPTIONS'});const ao=res.headers.get('access-control-allow-origin');if(el){el.textContent=ao?`✓ CORS OK — ${ao}`:'✗ CORS not configured';el.style.color=ao?'var(--green)':'var(--red)';}}catch(e){if(el){el.textContent='✗ CORS blocked';el.style.color='var(--red)';}}};

