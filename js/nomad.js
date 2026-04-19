import { initializeApp }  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, getDocs }
                          from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── FIREBASE ──
const app = initializeApp({
  apiKey:"AIzaSyCESqunM9b_Yc-5Dj0qJJFxGALmEGm0Rd0",
  authDomain:"nomad-404.firebaseapp.com",
  projectId:"nomad-404",
  appId:"1:638331724572:web:baa0d70108e920099150d9"
});
const db = getFirestore(app);

// ── STATE ──
let countriesData=[], flightsData=[], cafesData=[], experiencesData=[];
let globeMode='countries', globeGlobe=null, globeFlightLines=[], globeCamera=null, globeRenderer=null;

// ── INTRO ──
const introSeq=[
  {el:'il1',d:800},{el:'il2',d:1800},{el:'ir1',d:2600},
  {el:'il3',d:3000},{el:'ir2',d:4000},
  {el:'il4',d:4500},{el:'il5',d:5400},{el:'ir3',d:6200},
  {el:'il6',d:6800},{el:'il7',d:7800}
];
let introDone=false;

function dismissIntro() {
  if(introDone) return;
  introDone = true;
  const intro = document.getElementById('intro');
  intro.classList.add('tearing');
  loadAllData();
  setTimeout(() => {
    intro.classList.add('gone');
    document.getElementById('page').classList.add('vis');
    requestAnimationFrame(() => requestAnimationFrame(() => initGlobeWhenReady()));
  }, 1000);
}

introSeq.forEach(({el,d}) => setTimeout(() => { const n=document.getElementById(el); if(n) n.classList.add('vis'); }, d));
setTimeout(dismissIntro, 9000);
document.getElementById('intro').addEventListener('click', dismissIntro);
document.getElementById('introSkip').addEventListener('click', e => { e.stopPropagation(); dismissIntro(); });

// ── LOAD ALL FROM FIRESTORE ──
let dataLoaded = false;
let globeInitPending = false;

async function loadAllData() {
  try {
    const results = await Promise.allSettled([
      getDocs(collection(db,'countries')),
      getDocs(collection(db,'flights')),
      getDocs(collection(db,'cafes')),
      getDocs(collection(db,'experiences')),
    ]);

    if(results[0].status==='fulfilled') {
      countriesData = results[0].value.docs.map(d => ({id:d.id,...d.data()}))
        .filter(c => c.status !== 'wishlist');
    }
    if(results[1].status==='fulfilled') {
      flightsData = results[1].value.docs.map(d => ({id:d.id,...d.data()}));
      flightsData.sort((a,b) => (b.date||'').localeCompare(a.date||''));
    }
    if(results[2].status==='fulfilled') {
      cafesData = results[2].value.docs.map(d => ({id:d.id,...d.data()}));
    }
    if(results[3].status==='fulfilled') {
      experiencesData = results[3].value.docs.map(d => ({id:d.id,...d.data()}));
    }

    dataLoaded = true;
    updateStats();
    buildFlights();
    buildAirports();
    buildReels();
    buildCafes();
    buildFlags();
    setupClosingPoem();
    if(globeInitPending) { globeInitPending=false; initGlobeWhenReady(); }
  } catch(e) {
    console.error('loadAllData failed:', e);
  }
}

function initGlobeWhenReady() {
  if(!dataLoaded) { globeInitPending=true; return; }
  const wrap = document.getElementById('globeWrap');
  if(!wrap || wrap.clientWidth === 0) { requestAnimationFrame(initGlobeWhenReady); return; }
  initGlobe();
}

// ── STATS ──
function animateCount(el, target, suffix='') {
  if(!el || !target) return;
  let current = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current + suffix;
    if(current >= target) clearInterval(timer);
  }, 30);
}

function updateStats() {
  const nc = countriesData.length;
  const nf = flightsData.length;
  const totalMiles = flightsData.reduce((s,f) => s+(f.distance_miles||0),0);
  const airlines = [...new Set(flightsData.map(f=>f.airline).filter(Boolean))].length;

  animateCount(document.getElementById('statCountries'), nc);
  animateCount(document.getElementById('statFlights'), nf);
  const vcEl = document.getElementById('visitCount');
  if(vcEl) vcEl.innerHTML = `<span>${nc}</span>`;
  const gsEl = document.getElementById('globeStampText');
  if(gsEl) gsEl.textContent = `${nc} COUNTRIES VISITED · EST. 2016`;
  const fcEl = document.getElementById('fCountries');
  if(fcEl) fcEl.innerHTML = `${nc}<span>+</span>`;
  const ffEl = document.getElementById('fFlights');
  if(ffEl) ffEl.textContent = nf;
  const fmEl = document.getElementById('fMiles');
  if(fmEl) fmEl.innerHTML = `${Math.round(totalMiles/1000)}<span>K+</span>`;
  const faEl = document.getElementById('fAirlines');
  if(faEl) faEl.textContent = airlines;
  const ccEl = document.getElementById('closingCount');
  if(ccEl) ccEl.textContent = nc;
  const hmEl = document.getElementById('statMilesTotal');
  if(hmEl) hmEl.innerHTML = `${Math.round(totalMiles/1000)}<span class="accent">K</span>`;
  // Update oracle portrait stats
  updateOracleStats();
}

// ── LETTERS ──
const LETTERS = [
  {
    from: 'Anuraag, age 17', fromSub: 'Small town, Andhra Pradesh',
    to: 'To: Himself', postmark: 'INDIA\n2008', stampIcon: '🇮🇳', stampLabel: 'ORIGINS',
    body: `Growing up, our world fit inside one town. I watched planes from far and felt they are very far for me to get on. The horizon felt like a wall, not a door. I didn't know then that every road that left town was an invitation — and that the only thing between me and the whole world was the decision to go.`,
    cite: '— Age 17, Andhra Pradesh'
  },
  {
    from: 'Anuraag, learning slowly', fromSub: 'No specific place — just time',
    to: 'To: 18-year-old Anuraag', postmark: 'INDIA\n2010s', stampIcon: '🪞', stampLabel: 'PERMISSION',
    body: `You are exhausting yourself for a version of you that nobody asked for.\n\nYou are doing it all — laughing loudest, answering first, dancing when you don't want to dance, staying when you want to leave. You think if you stop performing, people will see what's actually there and find it insufficient. A boy who likes silence. Who can sit still. Who doesn't always have something clever to say.\n\nHere is what took me years to tell you: that boy is not the problem. That boy is the whole point.\n\nYou are allowed to be boring. You are allowed to sit at the edge of a party and feel nothing and go home early. You are allowed to not top the class, not lead the room, not fill every silence with something impressive. Stillness is not emptiness. Quiet is not failure.\n\nThe exhausting version of you — the one who performed — he didn't disappear all at once. He faded slowly, the way a habit does, once you stop feeding it. And what was underneath was just you. Plain. Unhurried. Enough.\n\nI found peace with it. You will too.`,
    cite: '— Looking back, with relief'
  },
  {
    from: 'Anuraag, crossing continents', fromSub: 'Ushuaia',
    to: 'To: Everyone who said "you can\'t"', postmark: 'USHUAIA\n2024', stampIcon: '✈️', stampLabel: 'CONTINENTS',
    body: `I've now stood on every continent. Antarctica was last — a six-day voyage with 40-foot swells, penguins, and no phone signal. The world is enormous and also somehow small. The most important education happens when you sit across from someone whose life looks nothing like yours — and you realise you are the same.`,
    cite: '— JFK Airport, New York, 2019'
  },
  {
    from: 'Anuraag, somewhere unhurried', fromSub: 'A city I didn\'t fully see',
    to: 'To: Anyone who feels like they\'re doing travel wrong', postmark: 'SOMEWHERE\nALWAYS', stampIcon: '🧭', stampLabel: 'PERMISSION II',
    body: `You don't owe the Eiffel Tower a photograph.\n\nNobody told you this, so I will. You can stand at the most famous spot in the world, feel nothing in particular, put your phone away, and go find a plastic chair outside a small café and eat something familiar — something that tastes like home — and that can be the whole day. That can be the whole trip. And it will have been enough.\n\nTravel is not a checklist. It is not the dinner that looks good on a screen, or the schedule packed so tight there's no room to get lost, or the version of yourself performing wonder for an audience that isn't even there.\n\nThe realest travel I ever did was the day I skipped the thing I was supposed to see. I stayed in. I sat with myself. And something quiet opened up — a thought I hadn't had before, a question about who I was when nobody was watching, an answer that only arrives when you stop rushing toward the next thing.\n\nThat is what travel is for. Not the monuments. The interior ones.\n\nYou can wear the same t-shirt every day. You can eat dal in Barcelona. You can stay in your hotel room and stare at the ceiling of a city you flew twelve hours to reach — and come home having learned something true about yourself that no itinerary could have scheduled.\n\nThe world doesn't need your content. It needs your presence. There's a difference.`,
    cite: '— From someone who finally stopped performing tourism'
  },
  {
    from: 'Anuraag, to the future', fromSub: 'Somewhere at 38,000 feet',
    to: 'To: Future-Anuraag', postmark: 'IN FLIGHT\n∞', stampIcon: '✈️', stampLabel: 'STILL GOING',
    body: `You're reading this somewhere I haven't been yet. Keep going. The passport fills, the stories multiply, but the feeling of arriving somewhere new — that never gets old. Every takeoff is still a small act of faith. You are proof that curiosity, when followed all the way, becomes a life.`,
    cite: '— 38,000 feet, still counting'
  },
  {
    from: 'Anuraag, still standing', fromSub: 'Every room that ever had an opinion',
    to: 'To: Future-Anuraag', postmark: 'ALWAYS\nEVERYWHERE', stampIcon: '⚔️', stampLabel: 'DEFINE YOURSELF',
    body: `Jab jab badal garajte hain — whenever the clouds roar — we flinch. We assume they have come for us.\n\nJaved Akhtar wrote about fear the way only someone who has sat with it honestly could. The clouds boom and darken and the instinct is to shrink, to run, to let the noise decide something about you. But the poem knows what we forget in the moment — that the clouds pass. That the roar was never a verdict. It was just weather.\n\nOther people's judgment is like that. It comes from all directions, loud and certain. The ones who called you too much. The ones who called you not enough. The ones who watched one afternoon of your life and built a whole courthouse around it — judge, jury, verdict — before you even opened your mouth. It arrives with thunder. It feels permanent.\n\nIt is not permanent.\n\nThey are not wrong about what they saw. They are just not qualified to define what it means. A perspective built from one side of a coin is not a truth — it is a guess dressed in confidence. You are not the sum of what people needed you to be in the moments they observed you.\n\nYou are the only one who has lived every chapter. The quiet failures nobody witnessed. The private victories nobody clapped for. The decisions that cost something real — paid for alone, in full, with no audience. That is the only account that has earned the right to define you.\n\nThis is a war you will fight mostly alone. The clouds will come back. Some of them will be loud enough to make you doubt yourself for a while — and that is okay. Sit with it. Let the thunder pass. Then look around and notice you are still standing.\n\nStay honest to yourself. Not as a declaration. Not as defiance. Just quietly, consistently, in the way you make decisions when nobody is watching.\n\nBadal garajte hain — par tum wahi ho jo tum ho.\nThe clouds roar. But you remain who you are.`,
    cite: '— From the version of you that chose not to be defined'
  }
];

let letterIdx = 0;

function buildLetterDots() {
  const dots = document.getElementById('letterDots');
  if(!dots) return;
  dots.innerHTML = '';
  LETTERS.forEach((_,i) => {
    const d = document.createElement('div');
    d.className = 'letter-dot' + (i===letterIdx?' active':'');
    d.onclick = () => goToLetter(i);
    dots.appendChild(d);
  });
}

function renderLetter(idx) {
  const l = LETTERS[idx];
  const card = document.getElementById('letterCard');
  if(!card) return;
  card.innerHTML = `
    <div class="letter-card-header">
      <div class="letter-to">
        <div>To: ${l.to.replace('To: ','')}</div>
        <div style="margin-top:3px;opacity:0.6">${l.fromSub}</div>
      </div>
      <div class="letter-stamp-img">
        <div class="stamp-globe">${l.stampIcon}</div>
        <div>${l.stampLabel}</div>
      </div>
    </div>
    <div class="letter-postmark">${l.postmark.replace('\n','<br>')}</div>
    <div class="letter-body">${l.body}</div>
    <div class="letter-cite">${l.cite}</div>`;
  const peeks = document.querySelectorAll('.letter-peek-card');
  const remaining = LETTERS.length - 1 - idx;
  peeks.forEach((p,i) => { p.style.display = i < remaining ? 'block' : 'none'; });
  const prev = document.getElementById('letterPrev');
  const next = document.getElementById('letterNext');
  if(prev) prev.disabled = idx === 0;
  if(next) next.disabled = idx === LETTERS.length - 1;
  buildLetterDots();
}

function goToLetter(newIdx) {
  if(newIdx < 0 || newIdx >= LETTERS.length || newIdx === letterIdx) return;
  const wrap = document.getElementById('letterCardWrap');
  if(!wrap) return;
  wrap.classList.add('flipping');
  setTimeout(() => {
    letterIdx = newIdx;
    renderLetter(letterIdx);
    wrap.classList.remove('flipping');
  }, 350);
}

window.letterStep = function(dir) { goToLetter(letterIdx + dir); };
document.getElementById('letterCardWrap')?.addEventListener('click', () => {
  if(letterIdx < LETTERS.length - 1) goToLetter(letterIdx + 1);
});
renderLetter(0);

// ════════════════════════════════════════════
// GLOBE — reads from countriesData & flightsData
// ════════════════════════════════════════════
function latLonToVec(lat, lon, r=1.025) {
  const la=lat*Math.PI/180, lo=lon*Math.PI/180;
  return new THREE.Vector3(r*Math.cos(la)*Math.cos(lo), r*Math.sin(la), r*Math.cos(la)*Math.sin(lo));
}

function initGlobe() {
  const wrap=document.getElementById('globeWrap');
  const canvas=document.getElementById('globeCanvas');
  const W=wrap.clientWidth, H=wrap.clientHeight;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setSize(W,H);
  renderer.setClearColor(0x030608,1);
  globeRenderer=renderer;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(45,W/H,0.1,1000);
  camera.position.z=2.8;
  globeCamera=camera;

  // Stars
  const sv=[];
  for(let i=0;i<3000;i++){const t=Math.random()*Math.PI*2,p=Math.acos(2*Math.random()-1),r=6+Math.random()*4;sv.push(r*Math.sin(p)*Math.cos(t),r*Math.cos(p),r*Math.sin(p)*Math.sin(t));}
  const sGeo=new THREE.BufferGeometry();
  sGeo.setAttribute('position',new THREE.Float32BufferAttribute(sv,3));
  scene.add(new THREE.Points(sGeo,new THREE.PointsMaterial({color:0xffffff,size:0.011,transparent:true,opacity:0.5})));

  // Globe base
  const gGeo=new THREE.SphereGeometry(1,72,72);
  const gMat=new THREE.MeshPhongMaterial({shininess:80,specular:new THREE.Color(0x223344)});
  // Try to load marble texture, fall back to canvas
  try {
    new THREE.TextureLoader().load(
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      tex=>{tex.anisotropy=4;gMat.map=tex;gMat.needsUpdate=true;}
    );
  } catch(_) {}

  const globe=new THREE.Mesh(gGeo,gMat);scene.add(globe);globeGlobe=globe;

  const aGeo=new THREE.SphereGeometry(1.12,64,64);
  const aMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,vertexShader:'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vN;void main(){float i=pow(0.72-dot(vN,vec3(0,0,1)),4.);gl_FragColor=vec4(0.15,0.5,0.85,1.)*i;}'});
  scene.add(new THREE.Mesh(aGeo,aMat));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(1.002,24,24),new THREE.MeshBasicMaterial({color:0x2E8B7A,wireframe:true,transparent:true,opacity:0.05})));
  scene.add(new THREE.AmbientLight(0x334455,1.6));
  const sun=new THREE.DirectionalLight(0x88aacc,1.4);sun.position.set(4,2,5);scene.add(sun);

  // ── COUNTRY DOTS from Firestore countriesData ──
  const dotGeo=new THREE.SphereGeometry(0.02,10,10);
  const dotMat=new THREE.MeshBasicMaterial({color:0xD4792A});
  const transitMat=new THREE.MeshBasicMaterial({color:0xC8913A});
  const pulseMat=new THREE.MeshBasicMaterial({color:0xD4792A,transparent:true,opacity:0.25});
  const pulseGeo=new THREE.SphereGeometry(0.032,10,10);

  // Only countries with lat/lon
  const validCountries = countriesData.filter(c => c.lat && c.lon);
  const dotCount = Math.max(1, validCountries.length);
  const dotMesh = new THREE.InstancedMesh(dotGeo, dotMat, dotCount);
  const dotData = [];
  const dummy = new THREE.Object3D();

  validCountries.forEach((c,i) => {
    const pos = latLonToVec(c.lat, c.lon);
    dummy.position.copy(pos);
    dummy.updateMatrix();
    dotMesh.setMatrixAt(i, dummy.matrix);
    // Transit dots slightly different color
    dotMesh.setColorAt?.(i, c.status==='transiting' ? new THREE.Color(0xC8913A) : new THREE.Color(0xD4792A));
    dotData.push({name:c.name, id:c.id, pos, status:c.status});
  });
  dotMesh.instanceMatrix.needsUpdate = true;
  globe.add(dotMesh);

  // Pulse rings on first 12 countries
  const rings = [];
  validCountries.slice(0,12).forEach((c,i) => {
    const r = new THREE.Mesh(pulseGeo, pulseMat.clone());
    r.position.copy(latLonToVec(c.lat, c.lon));
    r._phase = i * 0.7;
    globe.add(r);
    rings.push(r);
  });

  // ── FLIGHT ROUTES from Firestore flightsData ──
  buildFlightLines(globe);

  // Tooltip
  const tip=document.getElementById('globeTip');
  let isDragging=false,prevX=0,prevY=0,autoRotate=true,hintHidden=false;
  const wrap2=document.getElementById('globeWrap');
  wrap2.addEventListener('mousedown',e=>{isDragging=true;autoRotate=false;prevX=e.clientX;prevY=e.clientY;if(!hintHidden){document.getElementById('globeHint').style.opacity='0';hintHidden=true;}});
  window.addEventListener('mouseup',()=>{isDragging=false;setTimeout(()=>autoRotate=true,2500);});
  wrap2.addEventListener('mousemove',e=>{
    if(isDragging){globe.rotation.y+=(e.clientX-prevX)*0.005;globe.rotation.x=Math.max(-Math.PI/2,Math.min(Math.PI/2,globe.rotation.x+(e.clientY-prevY)*0.003));prevX=e.clientX;prevY=e.clientY;}
    const rect=wrap2.getBoundingClientRect();const mx=((e.clientX-rect.left)/W)*2-1,my=-((e.clientY-rect.top)/H)*2+1;
    const ray=new THREE.Raycaster();ray.setFromCamera({x:mx,y:my},camera);const hits=ray.intersectObject(dotMesh);
    if(hits.length>0&&dotData[hits[0].instanceId]){const d=dotData[hits[0].instanceId];tip.textContent=d.name+(d.status==='transiting'?' (transit)':'');tip.style.left=(e.clientX-rect.left+14)+'px';tip.style.top=(e.clientY-rect.top-32)+'px';tip.style.opacity='1';}
    else tip.style.opacity='0';
  });
  wrap2.addEventListener('mouseleave',()=>tip.style.opacity='0');
  wrap2.addEventListener('wheel',e=>{e.preventDefault();camera.position.z=Math.max(1.5,Math.min(5,camera.position.z+e.deltaY*0.003));},{passive:false});
  wrap2.addEventListener('touchstart',e=>{isDragging=true;autoRotate=false;prevX=e.touches[0].clientX;prevY=e.touches[0].clientY;},{passive:true});
  wrap2.addEventListener('touchend',()=>{isDragging=false;setTimeout(()=>autoRotate=true,2000);});
  wrap2.addEventListener('touchmove',e=>{if(!isDragging)return;globe.rotation.y+=(e.touches[0].clientX-prevX)*0.005;globe.rotation.x=Math.max(-Math.PI/2,Math.min(Math.PI/2,globe.rotation.x+(e.touches[0].clientY-prevY)*0.003));prevX=e.touches[0].clientX;prevY=e.touches[0].clientY;},{passive:true});
  window.addEventListener('resize',()=>{const nW=wrap2.clientWidth,nH=wrap2.clientHeight;camera.aspect=nW/nH;camera.updateProjectionMatrix();renderer.setSize(nW,nH);});

  let clock=0;
  (function animate(){
    requestAnimationFrame(animate);
    clock+=0.016;
    if(autoRotate&&!isDragging)globe.rotation.y+=0.0015;
    rings.forEach(r=>{const s=1+Math.sin(clock*1.4+r._phase)*0.28;r.scale.setScalar(s);r.material.opacity=0.2*(1-Math.abs(Math.sin(clock*1.4+r._phase))*0.75);});
    globeFlightLines.forEach(fl=>{if(fl.userData.animate){fl.userData.dashOffset=(fl.userData.dashOffset||0)-0.007;fl.material.dashOffset=fl.userData.dashOffset;}});
    renderer.render(scene,camera);
  })();
}

// ── BUILD FLIGHT LINES from Firestore flightsData ──
const AIRPORT_COORDS={
  DEL:[28.5562,77.1],BOM:[19.09,72.87],HYD:[17.24,78.43],MAA:[12.99,80.17],BLR:[13.20,77.71],
  DXB:[25.25,55.37],AUH:[24.43,54.65],DOH:[25.26,51.61],SIN:[1.36,103.99],BKK:[13.68,100.75],
  HKG:[22.31,113.92],NRT:[35.77,140.39],HND:[35.55,139.78],ICN:[37.46,126.44],
  SYD:[-33.94,151.18],MEL:[-37.67,144.84],LHR:[51.47,-0.45],LGW:[51.15,-0.18],
  CDG:[49.01,2.55],AMS:[52.31,4.76],FRA:[50.04,8.56],MUC:[48.35,11.78],
  MAD:[40.49,-3.57],BCN:[41.30,2.08],FCO:[41.80,12.24],ZRH:[47.46,8.55],
  VIE:[48.11,16.57],IST:[41.28,28.75],JFK:[40.64,-73.78],EWR:[40.69,-74.17],
  LAX:[33.94,-118.41],ORD:[41.97,-87.91],DFW:[32.90,-97.04],MIA:[25.80,-80.29],
  SFO:[37.62,-122.38],IAH:[29.99,-95.34],BOS:[42.37,-71.01],ATL:[33.64,-84.43],
  SEA:[47.45,-122.31],GRU:[-23.44,-46.47],EZE:[-34.82,-58.54],LIM:[-12.02,-77.11],
  SCL:[-33.39,-70.79],BOG:[4.70,-74.15],MEX:[19.44,-99.07],GIG:[-22.81,-43.25],
  NBO:[-1.32,36.93],JNB:[-26.14,28.25],CPT:[-33.96,18.60],CAI:[30.12,31.41],
  ADD:[8.98,38.80],BEG:[44.82,20.31],ZAG:[45.74,16.07],SJJ:[43.82,18.33],
  OMO:[43.28,17.85],BVA:[49.45,2.11],ORY:[48.72,2.38],MCI:[39.30,-94.71],
  DTW:[42.21,-83.35],IAD:[38.95,-77.46],YYZ:[43.68,-79.62],YVR:[49.20,-123.18],
  KUL:[2.75,101.71],MNL:[14.51,121.02],KTM:[27.70,85.36],CMB:[7.18,79.88],
};

function buildFlightLines(globe) {
  // Build unique route set to avoid duplicate lines
  const drawnRoutes = new Set();
  flightsData.forEach(f => {
    if(!f.from || !f.to) return;
    const routeKey = [f.from, f.to].sort().join('-');
    if(drawnRoutes.has(routeKey)) return;
    drawnRoutes.add(routeKey);

    const fc = AIRPORT_COORDS[f.from];
    const tc = AIRPORT_COORDS[f.to];
    if(!fc || !tc) return;

    const start = latLonToVec(fc[0],fc[1]);
    const end   = latLonToVec(tc[0],tc[1]);
    const mid   = new THREE.Vector3().addVectors(start,end).multiplyScalar(0.5);
    const dist  = start.distanceTo(end);
    mid.normalize().multiplyScalar(1.025 + dist * 0.35);

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const geo   = new THREE.BufferGeometry().setFromPoints(curve.getPoints(50));
    const mat   = new THREE.LineDashedMaterial({color:0xC8913A,dashSize:0.04,gapSize:0.03,transparent:true,opacity:0.65});
    const line  = new THREE.Line(geo, mat);
    line.computeLineDistances();
    line.userData.animate = true;
    line.userData.dashOffset = 0;
    line.visible = false;
    globe.add(line);
    globeFlightLines.push(line);
  });
}

window.setGlobeMode = function(mode, btn) {
  globeMode = mode;
  document.querySelectorAll('.gtog').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const showFlights = (mode === 'flights');
  globeFlightLines.forEach(l => l.visible = showFlights);
  const leg = document.getElementById('globeLegend');
  if(showFlights) {
    leg.innerHTML = '<div class="leg-item"><div class="leg-dot" style="background:#C8913A"></div>FLIGHT ROUTE</div><div class="leg-item"><div class="leg-dot" style="background:#D4792A"></div>COUNTRY</div>';
  } else {
    leg.innerHTML = '<div class="leg-item"><div class="leg-dot" style="background:#D4792A"></div>VISITED</div><div class="leg-item"><div class="leg-dot" style="background:rgba(246,241,233,0.18)"></div>NOT YET</div>';
  }
};

// ── FLIGHTS ──
function buildFlights() {
  const totalMiles = flightsData.reduce((s,f) => s+(f.distance_miles||0),0);
  const airlines   = [...new Set(flightsData.map(f=>f.airline).filter(Boolean))];
  const airports   = [...new Set([...flightsData.map(f=>f.from),...flightsData.map(f=>f.to)].filter(Boolean))];
  const topAirline = airlines.reduce((best,a) => {
    const cnt = flightsData.filter(f=>f.airline===a).length;
    return cnt>(best.count||0)?{name:a,count:cnt}:best;
  },{});

  const statsEl = document.getElementById('flightStats');
  if(statsEl) [
    {num:flightsData.length,label:'TOTAL FLIGHTS'},
    {num:Math.round(totalMiles).toLocaleString()+' MI',label:'TOTAL MILES'},
    {num:Math.round(totalMiles*1.60934).toLocaleString()+' KM',label:'TOTAL KM'},
    {num:airlines.length,label:'AIRLINES'},
    {num:airports.length,label:'AIRPORTS'},
    {num:topAirline.name||'—',label:'MOST FLOWN'}
  ].forEach(b => {
    const el = document.createElement('div');
    el.className = 'fs-block';
    el.innerHTML = `<div class="fs-num">${b.num}</div><div class="fs-label">${b.label}</div>`;
    statsEl.appendChild(el);
  });

  buildFleet();

  const grid = document.getElementById('boardingGrid');
  if(!grid) return;
  const INITIAL_BP = 4;
  flightsData.forEach((f,idx) => {
    const card = document.createElement('div');
    card.className = 'bp-card';
    if(idx >= INITIAL_BP) { card.classList.add('bp-hidden'); card.style.display='none'; }
    const miles = f.distance_miles ? Math.round(f.distance_miles).toLocaleString() : '—';
    const km    = f.distance_miles ? Math.round(f.distance_miles*1.60934).toLocaleString() : '—';
    card.innerHTML = `<div class="bp-bar"></div><div class="bp-face"><div class="bp-header"><div class="bp-flight-no">${f.flight_number||'—'}</div><div class="bp-date-badge">${f.date||'—'}</div></div><div class="bp-route-row"><div><div class="bp-iata-big">${f.from||'???'}</div><div class="bp-city-name">${f.from_city||''}</div></div><div class="bp-route-mid"><div class="bp-route-plane">✈</div><div class="bp-route-line"></div></div><div><div class="bp-iata-big" style="text-align:right">${f.to||'???'}</div><div class="bp-city-name" style="text-align:right">${f.to_city||''}</div></div></div><div class="bp-meta-strip"><div class="bp-meta-cell"><span class="bp-meta-label">CARRIER</span><span class="bp-meta-val">${f.airline||'—'}</span></div><div class="bp-meta-cell"><span class="bp-meta-label">TIME</span><span class="bp-meta-val">${f.time||'—'}</span></div><div class="bp-meta-cell"><span class="bp-meta-label">MILES</span><span class="bp-meta-val teal">${miles}</span></div></div></div><hr class="bp-perf"><div class="bp-toggle">FLIGHT DETAILS <span class="bp-toggle-arrow">▾</span></div><div class="bp-detail"><div class="bp-detail-inner"><div class="bp-detail-title">// FULL FLIGHT DATA</div><div class="bp-detail-grid"><div class="bp-detail-item"><span class="bp-detail-label">AIRCRAFT TYPE</span><span class="bp-detail-value">${f.aircraft_type||'—'}</span></div><div class="bp-detail-item"><span class="bp-detail-label">TAIL NUMBER</span><span class="bp-detail-value mono">${f.tail_number||'—'}</span></div><div class="bp-detail-item"><span class="bp-detail-label">DURATION</span><span class="bp-detail-value">${f.duration_mins?Math.floor(f.duration_mins/60)+'h '+f.duration_mins%60+'m':'—'}</span></div><div class="bp-detail-item"><span class="bp-detail-label">DISTANCE</span><span class="bp-detail-value">${miles} mi · ${km} km</span></div></div><div class="bp-route-mini"><div class="bp-route-mini-dot"></div><div class="bp-route-mini-line"></div><span>${f.from||'?'} → ${f.to||'?'}</span><div class="bp-route-mini-line"></div><div class="bp-route-mini-dot"></div></div>${f.notes?`<div class="bp-notes">"${f.notes}"</div>`:''}</div></div>`;
    card.addEventListener('click', () => card.classList.toggle('open'));
    grid.appendChild(card);
  });

  if(flightsData.length > INITIAL_BP) {
    const wrap = document.getElementById('bpMoreWrap');
    if(wrap) wrap.style.display = 'block';
    const lbl = document.getElementById('bpMoreLabel');
    if(lbl) lbl.textContent = `+ ${flightsData.length-INITIAL_BP} MORE BOARDING PASSES`;
  }

  const tbody = document.getElementById('flightLog');
  if(!tbody) return;
  flightsData.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="route">${f.from||'?'} → ${f.to||'?'}<br><span style="font-size:10px;color:var(--muted)">${f.from_city||''} → ${f.to_city||''}</span></td><td class="airline">${f.airline||'—'}</td><td class="date">${f.date||'—'}</td><td class="aircraft">${f.aircraft_type||'—'}</td><td class="miles">${f.distance_miles?Math.round(f.distance_miles).toLocaleString():'—'}</td>`;
    tbody.appendChild(tr);
  });
}

let bpExpanded = false;
window.expandBoardingPasses = function() {
  bpExpanded = !bpExpanded;
  document.querySelectorAll('.bp-hidden').forEach(el => { el.style.display = bpExpanded ? '' : 'none'; });
  const lbl = document.getElementById('bpMoreLabel');
  const arrow = document.getElementById('bpPeekArrow');
  const peek = document.getElementById('bpStackPeek');
  if(lbl) lbl.textContent = bpExpanded ? '▴  SHOW LESS' : `+ ${flightsData.length-4} MORE BOARDING PASSES`;
  if(arrow) arrow.classList.toggle('open', bpExpanded);
  if(peek) { peek.style.opacity = bpExpanded ? '0' : '1'; peek.style.pointerEvents = bpExpanded ? 'none' : 'auto'; }
};

let logExpanded = false;
window.toggleFlightLog = function() {
  logExpanded = !logExpanded;
  const wrap = document.getElementById('flightLogWrap');
  const arrow = document.getElementById('logArrow');
  if(wrap) wrap.style.display = logExpanded ? 'block' : 'none';
  if(arrow) arrow.classList.toggle('open', logExpanded);
};

// ── AIRCRAFT FLEET ──
// ── AIRCRAFT BLUEPRINT IMAGE MAPPING ──
// Maps normalised model key → Firebase Storage filename in /flights/ folder
// Filenames match the uploaded blueprints exactly
// ── FLEET BLUEPRINTS ──
// Naming convention: spaces → underscores, hyphens kept → Boeing_737-800
// Files live in Firebase Storage /flights/ folder
const STORAGE_BASE   = 'https://firebasestorage.googleapis.com/v0/b/nomad-404.firebasestorage.app/o/flights%2F';
const STORAGE_SUFFIX = '?alt=media';

// Derive Storage filename from model name using the convention
// e.g. "Boeing 737-800" → "Boeing_737-800.png"
function getBlueprintUrl(modelName) {
  const filename = modelName.trim().replace(/\s+/g, '_') + '.png';
  return STORAGE_BASE + encodeURIComponent(filename) + STORAGE_SUFFIX;
}

// CDN fallbacks for Airbus / unknown aircraft (no blueprints uploaded)
const CDN_FALLBACKS = {
  '777':     'https://images.unsplash.com/photo-1587019158091-1a103c5dd17f?w=900&q=80&fit=crop',
  '787':     'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80&fit=crop',
  'a380':    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=900&q=80&fit=crop',
  'a350':    'https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=900&q=80&fit=crop',
  'a330':    'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=900&q=80&fit=crop',
  'a320':    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&q=80&fit=crop',
  '737':     'https://images.unsplash.com/photo-1540974695-0b6a73c7e3a4?w=900&q=80&fit=crop',
  '747':     'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=900&q=80&fit=crop',
  'atr':     'https://images.unsplash.com/photo-1572979926960-c5b685fc1fc7?w=900&q=80&fit=crop',
  'default': 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&q=80&fit=crop',
};

// Try storage URL, fallback to CDN on image load error
function getFleetImageSrc(modelName) {
  // Only Boeing models have blueprints uploaded — return storage URL for them
  if(/^boeing/i.test(modelName.trim())) {
    return getBlueprintUrl(modelName);
  }
  // For Airbus/ATR/others, use CDN fallback immediately
  const lower = modelName.toLowerCase();
  for(const [key, url] of Object.entries(CDN_FALLBACKS)) {
    if(lower.includes(key)) return url;
  }
  return CDN_FALLBACKS.default;
}

// Per-model nicknames and stories
const AIRCRAFT_META = {
  'Boeing 737-900':   {nickname:'Triple Nine',      story:`The stretched workhorse of the 737NG family — 189 seats and quiet reliability.`},
  'Boeing 737 MAX 8': {nickname:'MAX 8',            story:`LEAP engines, advanced winglets, 20% better fuel burn. The 737 bloodline reimagined.`},
  'Boeing 737 MAX 9': {nickname:'MAX 9',            story:`7 metres longer than the MAX 8, same revolution under the wings.`},
  'Boeing 737-700':   {nickname:'Seven-Three-Seven',story:`The compact sibling. Gets into airports other 737s hesitate at.`},
  'Boeing 737-800':   {nickname:'The Bus',          story:`The overhead bin is too small. It has taken me to more places than any other aircraft.`},
  'Boeing 747-8':     {nickname:'Queen of Skies',   story:`Raked wingtips. GEnx engines. The last of the 747 line — still the most majestic thing in the sky.`},
  'Boeing 747-400':   {nickname:'Jumbo Classic',    story:`Four engines. Two decks on the nose. The aircraft that made mass international travel real.`},
  'Boeing 757-300':   {nickname:'The Pencil',       story:`Narrow body, massive range — punches well above its weight class.`},
  'Boeing 767-300ER': {nickname:'The Warhorse',     story:`First flew 1981. Twin-engine transoceanic flight made commercially viable. Old school in the best sense.`},
  'Boeing 777-9':     {nickname:'Nine',             story:`Folding wingtips. The largest twin-engine airliner ever built.`},
  'Boeing 777-200ER': {nickname:'Triple Seven ER',  story:`The aircraft that opened ultra-long-haul routes to twin jets.`},
  'Boeing 777-300ER': {nickname:'Triple Seven',     story:`The backbone of ultra-long-haul. 13,000 km non-stop without breaking a sweat.`},
  'Boeing 787-8':     {nickname:'Dreamliner',       story:`Electronically dimmable windows. Higher cabin pressure. You land feeling genuinely rested.`},
  'Boeing 787-9':     {nickname:'Dreamliner',       story:`The sweet spot of the Dreamliner family — stretched 6 metres, more range.`},
  'Boeing 787-10':    {nickname:'Stretched Dream',  story:`The longest Dreamliner. 330 passengers, 11,000 km range. Composite airframe nose to tail.`},
  'Airbus A380':      {nickname:'The Superjumbo',   story:`Double-deck, four engines. You don't board it — you enter it.`},
  'Airbus A350':      {nickname:'Xtra Wide Body',   story:`53% composite materials. You land after 14 hours feeling genuinely rested.`},
  'Airbus A350-900':  {nickname:'Xtra Wide Body',   story:`Carbon-fibre from nose to tail. The base variant of Airbus's masterpiece.`},
  'Airbus A330':      {nickname:'Medium Hauler',    story:`An analogue warmth the newer jets lack. Two engines, wide body, 13,000 km range.`},
  'Airbus A320':      {nickname:'The Narrowbody',   story:`Introduced fly-by-wire sidestick controls to commercial aviation.`},
  'Airbus A320neo':   {nickname:'New Engine Option',story:`20% better fuel burn. Sharklet wingtips. Flying IndiGo, this is your aircraft.`},
  'Boeing 737':       {nickname:'The Bus',          story:`First flew 1967. Most produced commercial aircraft in history. It goes everywhere.`},
  'ATR 72':           {nickname:'The Turboprop',    story:`Two turboprop engines. Goes to airports jets cannot. The most honest flying there is.`},
};

// Normalise aircraft_type from Firestore to a known model key
function normaliseAircraft(type) {
  if(!type) return null;
  const t = type.trim();
  if(AIRCRAFT_META[t]) return t;
  for(const key of Object.keys(AIRCRAFT_META)) {
    if(t.startsWith(key) || key.startsWith(t)) return key;
    const ts = t.replace(/[-\s]/g,'').toUpperCase();
    const ks = key.replace(/[-\s]/g,'').toUpperCase();
    if(ts.includes(ks) || ks.includes(ts)) return key;
  }
  // Return raw type as fallback so unknown aircraft still show
  return t;
}

const FLEET_VISIBLE = 8; // 2 rows × 4 columns
let fleetExpanded = false;

function buildFleet() {
  const grid       = document.getElementById('fleetGrid');
  const gridExtra  = document.getElementById('fleetGridExtra');
  const expandWrap = document.getElementById('fleetExpandWrap');
  const gridWrap   = document.getElementById('fleetGridWrap');
  if(!grid) return;

  // Count aircraft types from Firestore flightsData
  const counts = {};
  flightsData.forEach(f => {
    if(!f.aircraft_type) return;
    const key = normaliseAircraft(f.aircraft_type);
    if(key) counts[key] = (counts[key]||0)+1;
  });

  // Sort by count descending
  let ranked = Object.entries(counts).sort((a,b) => b[1]-a[1]);

  // If Firestore has no data yet, show the uploaded blueprints as placeholders
  if(!ranked.length) {
    ranked = [
      'Boeing 737-800','Boeing 777-300ER','Boeing 787-9','Boeing 787-8',
      'Boeing 777-200ER','Boeing 747-400','Boeing 767-300ER','Boeing 737-700',
      'Boeing 737 MAX 8','Boeing 737 MAX 9','Boeing 787-10','Boeing 747-8',
      'Boeing 737-900','Boeing 757-300','Boeing 777-9'
    ].map(k => [k, 0]);
  }

  // Render first 8 into main visible grid
  ranked.slice(0, FLEET_VISIBLE).forEach(([key, count]) => {
    renderFleetCard(grid, key, count);
  });

  // Render extras into hidden grid
  const extra = ranked.slice(FLEET_VISIBLE);
  if(extra.length > 0) {
    extra.forEach(([key, count]) => renderFleetCard(gridExtra, key, count));
    if(expandWrap) {
      expandWrap.style.display = 'flex';
      const countEl = document.getElementById('fleetExpandCount');
      if(countEl) countEl.textContent = `+${extra.length}`;
    }
  }
}

function renderFleetCard(container, modelKey, count) {
  const meta = AIRCRAFT_META[modelKey] || { nickname: modelKey, story: '' };
  const imgSrc = getFleetImageSrc(modelKey);
  // Short display name
  const displayName = modelKey.replace('Boeing ','').replace('Airbus ','').replace('ATR ','ATR ');

  const card = document.createElement('div');
  card.className = 'fleet-card';
  card.innerHTML = `
    <div class="fleet-blueprint-grid"></div>
    <img class="fleet-blueprint-img"
         src="${imgSrc}"
         alt="${modelKey} blueprint"
         loading="lazy"
         onerror="this.src='${CDN_FALLBACKS[Object.keys(CDN_FALLBACKS).find(k=>modelKey.toLowerCase().includes(k))||'default']}'">
    <div class="fleet-info">
      <div class="fleet-model-name">${displayName}</div>
      <div class="fleet-nickname">"${meta.nickname}"</div>
      <div class="fleet-meta-row">
        ${count > 0 ? `<div class="fleet-count">${count} FLIGHT${count!==1?'S':''}</div>` : '<div></div>'}
        ${meta.story ? `<button class="fleet-story-toggle" onclick="this.closest('.fleet-card').classList.toggle('story-open')">INFO ▸</button>` : ''}
      </div>
      <div class="fleet-story">${meta.story}</div>
    </div>`;
  container.appendChild(card);
}

window.toggleFleetExpand = function() {
  fleetExpanded = !fleetExpanded;
  const hidden    = document.getElementById('fleetGridHidden');
  const gridWrap  = document.getElementById('fleetGridWrap');
  const label     = document.getElementById('fleetExpandLabel');
  const countEl   = document.getElementById('fleetExpandCount');
  const planeIcon = document.getElementById('fleetPlaneIcon');
  const extra     = document.getElementById('fleetGridExtra');

  if(hidden)   hidden.classList.toggle('open', fleetExpanded);
  if(gridWrap) gridWrap.classList.toggle('expanded', fleetExpanded);
  if(label)    label.textContent = fleetExpanded ? 'SHOW LESS' : 'MORE AIRCRAFT';
  if(countEl)  countEl.textContent = fleetExpanded ? '' : `+${extra?.children.length||0}`;

  if(planeIcon) {
    planeIcon.classList.remove('flying','landing');
    void planeIcon.offsetWidth;
    planeIcon.classList.add(fleetExpanded ? 'flying' : 'landing');
  }
};

// ── AIRPORTS from flight data ──
const AIRPORT_META = {
  DXB:{name:'Dubai International',city:'Dubai',country:'UAE',story:`Terminal 3 at 2am — the whole world is passing through.`},
  HND:{name:'Haneda Airport',city:'Tokyo',country:'Japan',story:`Clean enough to eat off the floor. Tokyo starts the moment you land.`},
  SIN:{name:'Changi Airport',city:'Singapore',country:'Singapore',story:`Changi has a waterfall. A seven-story indoor waterfall. I've seen it four times.`},
  DEL:{name:'Indira Gandhi Intl',city:'New Delhi',country:'India',story:`Terminal 3 is the airport I grew up through. Every time I land here I remember being seventeen.`},
  LHR:{name:'London Heathrow',city:'London',country:'UK',story:`Terminal 5 at dawn, coffee in hand, there's a quiet dignity to it.`},
  JFK:{name:'JFK International',city:'New York',country:'USA',story:`JFK is barely functional and somehow still iconic.`},
  CDG:{name:'Charles de Gaulle',city:'Paris',country:'France',story:`CDG at 6am. The smell of coffee and croissants drifts past baggage claim.`},
  GRU:{name:'Guarulhos Intl',city:'São Paulo',country:'Brazil',story:`The gateway to South America. I've arrived here more disoriented than anywhere else — and left more alive.`},
  DOH:{name:'Hamad International',city:'Doha',country:'Qatar',story:`The world's best airport. The lamp bear. The indoor gardens.`},
  IAH:{name:'Bush Intercontinental',city:'Houston',country:'USA',story:`Houston's gateway. The international terminal at night when everything is quiet.`},
  AUH:{name:'Zayed International',city:'Abu Dhabi',country:'UAE',story:`The quieter, more composed sibling of DXB. The architecture alone is worth the connection.`},
};

function buildAirports() {
  const visGrid = document.getElementById('airportGridVisible');
  const hidGrid = document.getElementById('airportGridHidden');
  if(!visGrid || !hidGrid) return;

  // Count visits from flight data
  const visitCounts = {};
  const cityMap = {};
  flightsData.forEach(f => {
    if(f.from) {
      visitCounts[f.from] = (visitCounts[f.from]||0)+1;
      if(f.from_city && !cityMap[f.from]) cityMap[f.from] = f.from_city;
    }
    if(f.to) {
      visitCounts[f.to] = (visitCounts[f.to]||0)+1;
      if(f.to_city && !cityMap[f.to]) cityMap[f.to] = f.to_city;
    }
  });

  if(!Object.keys(visitCounts).length) return;

  const airports = Object.entries(visitCounts).sort((a,b) => b[1]-a[1]);

  airports.forEach(([code,visits],i) => {
    const meta = AIRPORT_META[code];
    const card = document.createElement('div');
    card.className = 'airport-stamp-card';
    const cityLine = meta
      ? `${meta.name}<br>${meta.city}, ${meta.country}`
      : (cityMap[code] || code);
    card.innerHTML = `<div class="asc-inkmark">✈</div><div class="asc-code">${code}</div><div class="asc-name">${cityLine}</div><div class="asc-visits">${visits} visit${visits!==1?'s':''}</div>`;
    if(meta) card.title = meta.story;
    if(i < 8) visGrid.appendChild(card);
    else hidGrid.appendChild(card);
  });
}

window.togglePassport = function() {
  const wrap = document.getElementById('passportFoldWrap');
  const lbl  = document.getElementById('foldLabel');
  const arrow = document.getElementById('foldArrow');
  if(!wrap) return;
  const isExpanded = wrap.classList.toggle('expanded');
  if(lbl) lbl.textContent = isExpanded ? 'FOLD PASSPORT' : 'UNFOLD PASSPORT';
  if(arrow) arrow.classList.toggle('open', isExpanded);
};

// ── FILM REELS ──
function makeSprockets(id,n) {
  const row = document.getElementById(id);
  if(!row) return;
  for(let i=0; i<n+2; i++) {
    const s = document.createElement('div'); s.className='sprocket';
    const h = document.createElement('div'); h.className='sprocket-hole';
    s.appendChild(h); row.appendChild(s);
  }
}

function buildReel(tab) {
  const data = experiencesData.filter(e => e.tab===tab);
  const reel  = document.getElementById('reel-'+tab);
  const TRACK_IDS = {adventures:'adv',people:'ppl',moments:'mom'};
  const track = document.getElementById('track-'+(TRACK_IDS[tab]||tab));
  if(!reel) return;
  if(!track) return;
  const pfx = {adventures:'adv',people:'ppl',moments:'mom'}[tab];
  makeSprockets('spr-t-'+pfx, data.length);
  makeSprockets('spr-b-'+pfx, data.length);
  if(!data.length) {
    const ph = document.createElement('div');
    ph.style.cssText = 'font-family:var(--mono);font-size:10px;letter-spacing:2px;color:rgba(246,241,233,0.2);padding:40px 24px;text-align:center';
    ph.textContent = 'No '+tab+' yet — add from the dashboard.';
    reel.appendChild(ph);
    return;
  }
  data.forEach((item,i) => {
    const frame = document.createElement('div'); frame.className='film-frame';
    const print = document.createElement('div'); print.className='film-print';
    const iw = document.createElement('div'); iw.className='film-img-wrap';
    if(item.img) { const img=document.createElement('img'); img.src=item.img; img.alt=item.label||''; img.loading='lazy'; iw.appendChild(img); }
    else { iw.classList.add('film-placeholder'); const ph=document.createElement('div'); ph.className='film-ph-text'; ph.innerHTML='✦<br>'+(item.label||tab.toUpperCase()); iw.appendChild(ph); }
    const grain=document.createElement('div'); grain.className='film-grain';
    const ov=document.createElement('div'); ov.className='film-overlay';
    const lc=document.createElement('div'); lc.className='film-loc'; lc.textContent=item.loc||'';
    iw.appendChild(grain); iw.appendChild(ov); iw.appendChild(lc); print.appendChild(iw);
    const cap=document.createElement('div'); cap.className='film-caption'; cap.textContent=item.label||'';
    print.appendChild(cap); frame.appendChild(print);
    frame.addEventListener('click', () => openLightbox(tab,i));
    reel.appendChild(frame);
  });
  // Drag scroll
  let isDown=false,startX=0,sl=0;
  track.addEventListener('mousedown', e => { isDown=true; startX=e.pageX-track.offsetLeft; sl=track.scrollLeft; });
  window.addEventListener('mouseup', () => isDown=false);
  track.addEventListener('mousemove', e => { if(!isDown)return; e.preventDefault(); track.scrollLeft=sl-(e.pageX-track.offsetLeft-startX); });
}

function buildReels() { ['adventures','people','moments'].forEach(buildReel); }

window.switchTab = function(key,btn) {
  document.querySelectorAll('.reel-wrap.active').forEach(r => r.classList.remove('active'));
  document.querySelectorAll('.exp-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  setTimeout(() => { const target=document.getElementById('tab-'+key); if(target)target.classList.add('active'); }, 50);
};

// ── LIGHTBOX ──
let lbTab='adventures', lbIdx=0;
function getTabData(tab) { return experiencesData.filter(e=>e.tab===tab); }
function openLightbox(tab,idx) { lbTab=tab; lbIdx=idx; renderLB(); document.getElementById('lightbox').classList.add('open'); document.body.style.overflow='hidden'; }
function renderLB() {
  const data=getTabData(lbTab); const item=data[lbIdx]; if(!item)return;
  const img=document.getElementById('lbImg'), ph=document.getElementById('lbImgPlaceholder');
  if(item.img){img.src=item.img;img.style.display='block';ph.style.display='none';}
  else{img.style.display='none';ph.style.display='flex';}
  document.getElementById('lbLoc').textContent=item.loc||'';
  document.getElementById('lbTab').textContent=lbTab.toUpperCase();
  document.getElementById('lbTitle').textContent=item.title||'';
  document.getElementById('lbStory').innerHTML=item.story||'';
}
function closeLightbox() { document.getElementById('lightbox').classList.remove('open'); document.body.style.overflow=''; }
window.closeLightbox=closeLightbox;
window.closeLB=function(e){if(e.target===document.getElementById('lightbox'))closeLightbox();};
window.lbStep=function(dir){const data=getTabData(lbTab);lbIdx=(lbIdx+dir+data.length)%data.length;renderLB();};

// ════════════════════════════════════════════
// CAFES — 2 rows visible + curtain pull-down
// ════════════════════════════════════════════
const CARDS_PER_ROW = 3; // matches grid auto-fill at ~300px min
const VISIBLE_ROWS  = 2;
const VISIBLE_CARDS = CARDS_PER_ROW * VISIBLE_ROWS; // 6 cards

function buildCafes() {
  const visGrid  = document.getElementById('cafeGridVisible');
  const hidGrid  = document.getElementById('cafeGridHidden');
  const seemore  = document.getElementById('cafeSeeMore');
  const countEl  = document.getElementById('cafeSeeMoreCount');
  if(!visGrid || !hidGrid) return;
  if(!cafesData.length) {
    visGrid.innerHTML = '<div style="font-family:var(--mono);font-size:11px;letter-spacing:2px;color:var(--muted);padding:24px 0">No cafes yet — add from the dashboard.</div>';
    return;
  }

  cafesData.forEach((c,i) => {
    const card = buildCafeCard(c);
    if(i < VISIBLE_CARDS) visGrid.appendChild(card);
    else hidGrid.appendChild(card);
  });

  const hidden = cafesData.length - VISIBLE_CARDS;
  if(hidden > 0 && seemore) {
    seemore.style.display = 'flex';
    if(countEl) countEl.textContent = `+${hidden} MORE`;
  }
}

function buildCafeCard(c) {
  const card = document.createElement('div');
  card.className = 'cafe-receipt';
  card.innerHTML = `
    <div class="receipt-header">
      <div class="receipt-type">${c.type||'CAFE'}</div>
      <div class="receipt-name">${c.name}</div>
      <div class="receipt-city">${c.city||''}, ${c.country||''}</div>
    </div>
    <div class="receipt-body">
      <div class="receipt-line"><span class="rl-label">ORDERED</span><span class="rl-val">${c.ordered||'—'}</span></div>
      <div class="receipt-line"><span class="rl-label">RATING</span><span class="rl-val">${c.rating||'—'}</span></div>
    </div>
    <div class="receipt-vibe">${c.vibe||''}</div>
    <div class="receipt-perf"></div>
    <div class="receipt-story-wrap"><div class="receipt-story">${c.story||''}</div></div>
    <div class="receipt-footer">
      <div class="receipt-rating">${c.rating||''}</div>
      <button class="receipt-expand" onclick="const w=this.closest('.cafe-receipt').querySelector('.receipt-story-wrap');w.classList.toggle('open');this.textContent=w.classList.contains('open')?'READ LESS ↑':'THE STORY ↓';">THE STORY ↓</button>
    </div>`;
  return card;
}

let cafeCurtainOpen = false;
window.toggleCafeCurtain = function() {
  cafeCurtainOpen = !cafeCurtainOpen;
  const wrap  = document.getElementById('cafeCurtainWrap');
  const label = document.getElementById('cafeSeeMoreLabel');
  const count = document.getElementById('cafeSeeMoreCount');
  const hidden = cafesData.length - VISIBLE_CARDS;
  if(wrap) wrap.classList.toggle('open', cafeCurtainOpen);
  if(label) label.textContent = cafeCurtainOpen ? 'FOLD AWAY' : 'SEE MORE CAFES';
  if(count) count.textContent = cafeCurtainOpen ? '' : `+${hidden} MORE`;
};

// ── FLAGS / COUNTRIES ──
function buildFlags() {
  const grid = document.getElementById('flagsGrid');
  if(!grid) return;
  if(!countriesData.length) {
    grid.innerHTML = '<div style="font-family:var(--mono);font-size:11px;letter-spacing:2px;color:var(--muted);padding:24px 0">Countries data loading…</div>';
    return;
  }
  const rots = [-2.5,-1.5,-0.5,0.5,1.5,2.5];
  countriesData.forEach((c,i) => {
    const card = document.createElement('div');
    card.className = 'flag-card';
    const rot = rots[i%rots.length];
    card.style.setProperty('--flag-rot', rot+'deg');
    card.style.animationDelay = (i*0.04)+'s';
    card.style.transform = `rotate(${rot}deg)`;
    const flagId = c.id.toLowerCase().replace(/_/g,'-');
    card.innerHTML = `${c.emoji?`<div class="flag-emoji">${c.emoji}</div>`:''}
      <img class="flag-img" src="https://flagcdn.com/${flagId}.svg" onerror="this.style.display='none'" alt="${c.name}" loading="lazy">
      <div class="flag-name">${c.name}</div>
      <div class="flag-status ${c.status||'visited'}">${c.status==='transiting'?'TRANSIT':'VISITED'}</div>`;
    grid.appendChild(card);
  });
}

// ── CLOSING POEM ──
function setupClosingPoem() {
  const couplets = ['pc1','pc2','pc3','pc4','poemFinal'];
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting) {
        const idx = couplets.indexOf(e.target.id);
        setTimeout(() => e.target.classList.add('vis'), idx * 350);
        obs.unobserve(e.target);
      }
    });
  }, {threshold: 0.2, rootMargin: '0px 0px -50px 0px'});
  couplets.forEach(id => { const el = document.getElementById(id); if(el) obs.observe(el); });
}

// ── NAV SCROLL ──
window.addEventListener('scroll', () => {
  document.getElementById('topNav').classList.toggle('scrolled', window.scrollY>60);
});

// ════════════════════════════════════════════════════════════
// NOMAD ORACLE — full-screen editorial conversation
// ════════════════════════════════════════════════════════════
let aiChatOpen     = false;
let aiIsThinking   = false;
let aiNomadContext = null;
let aiConvoHistory = []; // keep multi-turn context

// Populate portrait stats when data loads
function updateOracleStats() {
  const sc = document.getElementById('aiStatC');
  const sf = document.getElementById('aiStatF');
  if(sc) sc.textContent = countriesData.length || '—';
  if(sf) sf.textContent = flightsData.length || '—';
}

window.openAiChat = function() {
  aiChatOpen = true;
  updateOracleStats();
  document.getElementById('aiOracleOverlay').classList.add('open');
  document.getElementById('aiChatTrigger').style.opacity = '0';
  document.getElementById('aiChatTrigger').style.pointerEvents = 'none';
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('aiInput').focus(), 550);
};

window.closeAiChat = function() {
  aiChatOpen = false;
  document.getElementById('aiOracleOverlay').classList.remove('open');
  document.getElementById('aiChatTrigger').style.opacity = '1';
  document.getElementById('aiChatTrigger').style.pointerEvents = 'auto';
  document.body.style.overflow = '';
};

window.sendAiChip = function(el) {
  document.getElementById('aiInput').value = el.textContent;
  // Hide idle state
  const idle = document.getElementById('aiOracleIdle');
  if(idle) idle.classList.add('hidden');
  sendAiMessage();
};

window.handleAiKeydown = function(e) {
  if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); }
};

window.autoResizeAiInput = function(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 80) + 'px';
};

// Build Firestore context
async function buildAiContext() {
  if(aiNomadContext) return aiNomadContext;
  try {
    const [journalSnap, expSnap] = await Promise.allSettled([
      getDocs(collection(db,'journal')),
      getDocs(collection(db,'experiences')),
    ]);
    const journal     = journalSnap.status==='fulfilled' ? journalSnap.value.docs.map(d=>d.data()).slice(0,8) : [];
    const experiences = expSnap.status==='fulfilled'     ? expSnap.value.docs.map(d=>d.data()).slice(0,12)   : [];

    const flightSummary    = flightsData.slice(0,20).map(f=>`${f.flight_number||''} ${f.from||'?'}→${f.to||'?'} on ${f.date||'?'} (${f.airline||''}, ${f.aircraft_type||''})`).join('\n');
    const visitedCountries = countriesData.filter(c=>c.status==='visited').map(c=>c.name).join(', ');
    const journalText      = journal.map(j=>`[${j.date?.substring(0,10)||'?'}] ${j.title}: ${(j.body||'').substring(0,300)}`).join('\n\n');
    const expText          = experiences.map(e=>`${e.tab?.toUpperCase()||'EXP'} — ${e.title||''}: ${(e.story||'').substring(0,200)}`).join('\n\n');
    const totalMiles       = Math.round(flightsData.reduce((s,f)=>s+(f.distance_miles||0),0)/1000);

    aiNomadContext = `
ABOUT ANURAAG RAVULAPARTHI:
- Born Andhra Pradesh, India. Grew up watching planes from rooftops.
- ${countriesData.length}+ countries, all 7 continents including Antarctica
- ${flightsData.length}+ flights, ~${totalMiles}K miles in the air
COUNTRIES VISITED: ${visitedCountries}
RECENT FLIGHTS:\n${flightSummary}
JOURNAL (private reflections):\n${journalText}
EXPERIENCES:\n${expText}`.trim();

    return aiNomadContext;
  } catch(e) {
    return `Anuraag — nomad, ${countriesData.length}+ countries, ${flightsData.length}+ flights.`;
  }
}

// Detect if answer mentions travel data worth visualising
function detectInfographic(answer, question) {
  const lower = answer.toLowerCase() + ' ' + question.toLowerCase();
  const totalMiles = Math.round(flightsData.reduce((s,f)=>s+(f.distance_miles||0),0)/1000);

  // Flight stats mention
  if(/flight|mile|aircraft|airline|sky|takeoff|landing|altitude/i.test(lower)) {
    const airlines = [...new Set(flightsData.map(f=>f.airline).filter(Boolean))].length;
    return {
      type: 'statbar',
      stats: [
        { num: flightsData.length+'', label: 'FLIGHTS TAKEN' },
        { num: totalMiles+'K', label: 'MILES IN THE AIR' },
        { num: airlines+'', label: 'AIRLINES FLOWN' },
      ]
    };
  }
  // Country / place mention
  if(/countr|world|passport|border|continent/i.test(lower)) {
    // Pick a few random visited countries with flag emoji
    const sample = countriesData.filter(c=>c.status==='visited' && c.emoji).slice(0,6);
    if(sample.length >= 3) return { type: 'stamps', countries: sample };
  }
  // Specific flight route
  if(/route|journey|from .+ to|flew/i.test(lower) && flightsData.length > 0) {
    const f = flightsData.find(f => f.from && f.to) || flightsData[0];
    if(f) return {
      type: 'route',
      from: f.from, to: f.to,
      fromCity: f.from_city||f.from,
      toCity:   f.to_city||f.to,
      airline:  f.airline||'',
      date:     f.date||''
    };
  }
  return null;
}

// Build infographic HTML
function buildInfographicHTML(info) {
  if(!info) return '';
  if(info.type === 'statbar') {
    const cells = info.stats.map(s => `
      <div class="ai-info-stat">
        <div class="ai-info-stat-num">${s.num}</div>
        <div class="ai-info-stat-label">${s.label}</div>
      </div>`).join('');
    return `<div class="ai-infograph"><div class="ai-info-statbar">${cells}</div></div>`;
  }
  if(info.type === 'stamps') {
    const stamps = info.countries.map(c => `
      <div class="ai-info-stamp">
        <div class="ai-stamp-flag">${c.emoji}</div>
        <div class="ai-stamp-name">${c.name.toUpperCase().substring(0,10)}</div>
      </div>`).join('');
    return `<div class="ai-infograph"><div class="ai-info-stamps">${stamps}</div></div>`;
  }
  if(info.type === 'route') {
    return `<div class="ai-infograph">
      <div class="ai-info-route">
        <div class="ai-route-iata">${info.from}</div>
        <div class="ai-route-arc">
          <svg class="ai-route-arc-svg" viewBox="0 0 200 30" preserveAspectRatio="none" fill="none">
            <path d="M 10 25 Q 100 0 190 25" stroke="rgba(200,145,58,0.5)" stroke-width="1.5" stroke-dasharray="4 3"/>
            <text x="98" y="12" fill="rgba(212,121,42,0.7)" font-size="10" text-anchor="middle" font-family="serif">✈</text>
          </svg>
          <div class="ai-route-meta">${info.airline} · ${info.date}</div>
        </div>
        <div class="ai-route-iata">${info.to}</div>
      </div>
    </div>`;
  }
  return '';
}

async function sendAiMessage() {
  const input = document.getElementById('aiInput');
  const q = (input.value || '').trim();
  if(!q || aiIsThinking) return;
  aiIsThinking = true;

  input.value = '';
  input.style.height = 'auto';
  document.getElementById('aiSendBtn').style.opacity = '0.35';

  // Hide idle state on first question
  const idle = document.getElementById('aiOracleIdle');
  if(idle) idle.classList.add('hidden');

  const thread = document.getElementById('aiThread');

  // Add question stamp
  const qDiv = document.createElement('div');
  qDiv.className = 'ai-q-block';
  qDiv.innerHTML = `
    <div class="ai-q-stamp">
      <div class="ai-q-label">// YOUR QUESTION</div>
      <div class="ai-q-text">${escHtml(q)}</div>
    </div>`;
  thread.appendChild(qDiv);

  // Thinking waveform
  const thinkDiv = document.createElement('div');
  thinkDiv.className = 'ai-a-spread';
  thinkDiv.innerHTML = `
    <div class="ai-a-avatar-col">
      <img class="ai-a-avatar" src="images/photographer.jpeg" alt="Anuraag">
      <div class="ai-a-thread-line"></div>
    </div>
    <div>
      <div class="ai-a-byline">ANURAAG · THINKING</div>
      <div class="ai-thinking-wave">
        ${Array.from({length:10},(_,i)=>`<div class="ai-wave-bar"></div>`).join('')}
        <span class="ai-thinking-label">composing from memory…</span>
      </div>
    </div>`;
  thread.appendChild(thinkDiv);
  thread.scrollTop = thread.scrollHeight;

  try {
    const context = await buildAiContext();

    const systemPrompt = `You are Anuraag Ravulaparthi — a nomad, engineer and storyteller who has visited ${countriesData.length}+ countries on all 7 continents. You speak in first person, from memory, from the road.

Your answers must be:
- Poetic, introspective, deeply personal — written like journal entries that became literature
- Grounded in real places, real feelings, real moments from the data below
- Never generic travel clichés. Always specific, surprising, human.
- 3-5 paragraphs. No bullet points. No lists. No headers.
- Reference specific countries, flights, people, moments from the context
- Draw connections between geography and the interior life — what a place teaches about the self
- Tone: warm, contemplative, wry, never performative. Drop-cap worthy first sentences.
- End with something that lands — an image, a realisation, a quiet truth.

Real data about your travels:
${context}

Answer only from this lived life.`;

    // Build multi-turn messages
    const messages = [
      ...aiConvoHistory,
      { role: 'user', content: q }
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 700,
        system: systemPrompt,
        messages
      })
    });

    const data   = await response.json();
    const answer = data.content?.[0]?.text || 'The road goes quiet sometimes. Ask me something else.';

    // Save to history
    aiConvoHistory.push({ role: 'user', content: q });
    aiConvoHistory.push({ role: 'assistant', content: answer });
    if(aiConvoHistory.length > 20) aiConvoHistory = aiConvoHistory.slice(-20);

    // Detect infographic
    const infograph  = detectInfographic(answer, q);
    const infoHTML   = buildInfographicHTML(infograph);

    // Format paragraphs
    const parasHTML = answer
      .split(/\n\n+/)
      .filter(p => p.trim())
      .map(p => `<div class="ai-a-para">${escHtml(p.replace(/\n/g,' '))}</div>`)
      .join('');

    // Remove thinking, inject answer
    thinkDiv.remove();

    const aDiv = document.createElement('div');
    aDiv.className = 'ai-a-spread';
    aDiv.innerHTML = `
      <div class="ai-a-avatar-col">
        <img class="ai-a-avatar" src="images/photographer.jpeg" alt="Anuraag">
        <div class="ai-a-thread-line"></div>
      </div>
      <div class="ai-a-content">
        <div class="ai-a-byline">ANURAAG RAVULAPARTHI</div>
        <div class="ai-a-body">${parasHTML}</div>
        ${infoHTML}
      </div>`;
    thread.appendChild(aDiv);
    thread.scrollTop = thread.scrollHeight;

  } catch(e) {
    console.error('Oracle error:', e);
    thinkDiv.remove();
    const errDiv = document.createElement('div');
    errDiv.className = 'ai-a-spread';
    errDiv.innerHTML = `
      <div class="ai-a-avatar-col">
        <img class="ai-a-avatar" src="images/photographer.jpeg" alt="Anuraag">
      </div>
      <div class="ai-a-content">
        <div class="ai-a-byline">ANURAAG RAVULAPARTHI</div>
        <div class="ai-a-body">
          <div class="ai-a-para" style="color:rgba(246,241,233,0.3);font-size:13px">
            The signal dropped somewhere over the Pacific. Check your connection and try again.
          </div>
        </div>
      </div>`;
    thread.appendChild(errDiv);
    thread.scrollTop = thread.scrollHeight;
  }

  aiIsThinking = false;
  document.getElementById('aiSendBtn').style.opacity = '1';
}

function escHtml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Oracle stats are updated inside updateStats() directly — see call above

// ── TERMINAL ──
// nomad-page commands scroll to sections on this page
initTerminal({
  bootLines: function () { return [
    [200,  'Initializing nomad.sh ...'],
    [360,  'Loading ' + countriesData.length + ' countries ......... <span class="cok">OK</span>'],
    [280,  'Mounting ' + flightsData.length + ' flights ............. <span class="cok">OK</span>'],
    [280,  'Brewing virtual coffee ............. <span class="cok">OK</span>'],
  ]; },
  bootChips: [
    ['globe', 'flights', 'stories'],
    ['whoami', 'home', 'engineer'],
  ],
  pageHelp: {
    title: 'THIS PAGE',
    items: [
      ['globe',     'jump to the 3D globe'],
      ['flights',   'jump to flight log'],
      ['stories',   'jump to travel experiences'],
      ['cafes',     'jump to favourite cafes'],
      ['countries', 'jump to country flag grid'],
    ],
  },
  pageLS: function () { return [
    ['ct', '&nbsp;&nbsp;globe/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="cd">' + countriesData.length + ' countries visited</span>'],
    ['ct', '&nbsp;&nbsp;flights/ &nbsp;&nbsp;&nbsp;<span class="cd">' + flightsData.length + ' flights logged</span>'],
    ['ct', '&nbsp;&nbsp;stories/ &nbsp;&nbsp;&nbsp;<span class="cd">' + experiencesData.length + ' travel entries</span>'],
    ['ct', '&nbsp;&nbsp;cafes/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="cd">' + cafesData.length + ' cafes saved</span>'],
  ]; },
  pageCommands: {
    globe:     function () { closeTerm(); document.querySelector('.globe-section').scrollIntoView({behavior:'smooth'}); },
    flights:   function () { closeTerm(); document.querySelector('.flights-section').scrollIntoView({behavior:'smooth'}); },
    stories:   function () { closeTerm(); document.querySelector('.experiences').scrollIntoView({behavior:'smooth'}); },
    cafes:     function () { closeTerm(); document.querySelector('.cafes-section').scrollIntoView({behavior:'smooth'}); },
    countries: function () { closeTerm(); document.querySelector('.countries-section').scrollIntoView({behavior:'smooth'}); },
  },
});
