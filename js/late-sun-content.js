// Copied verbatim from js/nomad.js so the new pages stand alone.
// When the old nomad page is retired, this becomes the only copy.

export const LETTERS = [
  {
    from: 'Anuraag, age 17', fromSub: 'Small town, Andhra Pradesh',
    to: 'To: me, at seventeen', postmark: 'INDIA\n2008', stampIcon: '🇮🇳', stampLabel: 'ORIGINS',
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

export const AIRCRAFT_META = {
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
  'Airbus A350-1000': {nickname:'Xtra Wide Body XL',story:`The stretched, longer-range sibling of the A350-900.`},
  'Airbus A330':      {nickname:'Medium Hauler',    story:`An analogue warmth the newer jets lack. Two engines, wide body, 13,000 km range.`},
  'Airbus A330-200':  {nickname:'Medium Hauler',    story:`The shorter-body A330, tuned for range over capacity.`},
  'Airbus A330-300':  {nickname:'Medium Hauler',    story:`The original A330 — a widebody workhorse on medium-haul routes.`},
  'Airbus A330neo':   {nickname:'Medium Hauler NEO',story:`New engines, new wingtips, same trusted A330 airframe.`},
  'Airbus A340-300':  {nickname:'Four-Holer',       story:`Four engines, long range — built for routes where diversion airports are scarce.`},
  'Airbus A340-400':  {nickname:'Four-Holer',       story:`Stretched A340 variant. Rare now — most of the fleet has been retired.`},
  'Airbus A340-600':  {nickname:'Four-Holer XL',    story:`The longest airliner of its era. Four engines, unmistakable silhouette.`},
  'Airbus A320':      {nickname:'The Narrowbody',   story:`Introduced fly-by-wire sidestick controls to commercial aviation.`},
  'Airbus A320neo':   {nickname:'New Engine Option',story:`20% better fuel burn. Sharklet wingtips. Flying IndiGo, this is your aircraft.`},
  'Airbus A321':      {nickname:'The Stretch',      story:`The longest of the A320 family, more seats on the same narrowbody DNA.`},
  'Airbus A321neo':   {nickname:'The Stretch NEO',  story:`New-engine A321 — the backbone of modern narrowbody long-haul.`},
  'Airbus A319':      {nickname:'The Shortbody',    story:`The compact sibling in the A320 family, built for shorter routes.`},
  'Airbus A318':      {nickname:'The Baby Bus',     story:`The smallest of the A320 family — rare, and increasingly hard to find.`},
  'Airbus A220-100':  {nickname:'C Series',         story:`Started life as the Bombardier CSeries. A clean-sheet narrowbody, all curves.`},
  'Airbus A220-300':  {nickname:'C Series',         story:`The stretched A220, quietly replacing older regional jets worldwide.`},
  'Boeing 737':       {nickname:'The Bus',          story:`First flew 1967. Most produced commercial aircraft in history. It goes everywhere.`},
  'Boeing 767-200ER': {nickname:'The Warhorse',     story:`The original 767 — shorter body, still flying transoceanic routes decades on.`},
  'Boeing 767-400ER': {nickname:'The Warhorse XL',  story:`The stretched, longest-range member of the 767 family.`},
  'Boeing 777-8':     {nickname:'Eight',            story:`The smaller sibling of the 777X family — folding wingtips, ultra-long range.`},
  'ATR 72':           {nickname:'The Turboprop',    story:`Two turboprop engines. Goes to airports jets cannot. The most honest flying there is.`},
  'ATR 42':           {nickname:'The Small Turboprop', story:`The compact ATR — regional flying at its most honest.`},
  'Embraer 170':      {nickname:'The Regional',     story:`The original E-Jet — brought jet comfort to routes turboprops used to own.`},
  'Embraer 175':      {nickname:'The Regional',     story:`The most common E-Jet in the sky — a regional-jet mainstay for airlines worldwide.`},
  'Embraer 190':      {nickname:'The Bigger Regional', story:`Stretched E-Jet, blurring the line between regional and mainline.`},
  'Embraer 195':      {nickname:'The Bigger Regional', story:`The largest of the original E-Jet family.`},
  'Embraer E175-E2':  {nickname:'E-Jet E2',         story:`New engines, new wing — the second-generation E-Jet.`},
  'Embraer E190-E2':  {nickname:'E-Jet E2',         story:`Quieter, more efficient successor to the E190.`},
  'Embraer E195-E2':  {nickname:'E-Jet E2',         story:`The largest E-Jet E2 — encroaching on narrowbody mainline territory.`},
  'Bombardier CRJ700': {nickname:'The Regional Jet', story:`Compact, twin-engine, built for thinner regional routes.`},
  'Bombardier CRJ900': {nickname:'The Regional Jet', story:`The stretched CRJ — a regional-jet staple across North America.`},
  'Bombardier CRJ1000':{nickname:'The Regional Jet', story:`The largest CRJ — pushing regional-jet capacity to its limit.`},
  'Bombardier Dash 8 Q200': {nickname:'The Dash',    story:`Compact turboprop, built for short regional hops.`},
  'Bombardier Dash 8 Q300': {nickname:'The Dash',    story:`Stretched Dash 8 — more seats, same twin-turboprop reliability.`},
  'Bombardier Dash 8 Q400': {nickname:'The Dash',    story:`The largest Dash 8 — fast for a turboprop, built for short-runway airports.`},
};

export const AIRCRAFT_ALIASES = {
  'Embraer ERJ-175': 'Embraer 175',
  'Airbus 350-900':  'Airbus A350-900',
};

export function normaliseAircraft(type) {
  if(!type) return null;
  const t = type.trim();
  if(AIRCRAFT_ALIASES[t]) return AIRCRAFT_ALIASES[t];
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

export const AIRPORT_META = {
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

// ── His words from the old pages, kept (copied from nomad.html / photography.html) ──
export const INTRO_LINES = [
  "I grew up in a small town in India.",
  "Our world was the street, the school, the neighbours.",
  "\"I thought that was the whole world.\"",
  "Then I left. And I never stopped leaving.",
  "Every country was a classroom. Every stranger, a mirror."
];

// The closing poem from nomad.html, credited the way the old page credits it.
export const ZNMD = {
  couplets: [
    "You carry your restlessness in your heart as you walk on",
    "You carry lightning of dreams in your eyes as you walk on",
    "Free as gusts of wind — you are",
    "You who carry wonder in your eyes as you walk on"
],
  final: "TOH ZINDA HO TUM.",
  credit: "— JAVED AKHTAR, ZINDAGI NA MILEGI DOBARA",
};

// The lines he wrote under each section of the old nomad page.
export const LINES = {
  hero: "From a small town in India to every continent on earth — one stamp, one stranger, one story at a time.",
  experiences: "The proof that turning up is enough. The rest writes itself.",
  flights: "Every takeoff is a small act of faith. Every landing, proof you made it.",
  airports: "Some cities you enter through their airports. The airport is already the story.",
  cafes: "Every cup is a city. Every city, a cup.",
  photography: "I don't take photographs. I keep the stories — and hand them back to you, one frame at a time.",
};
export const THREADS = { adventures: "The adrenaline chapter", people: "Human connections", moments: "The quiet ones" };

// The ZNMD lines from the photography page.
export const POEMS = [
  "Zindagi mil ke bitaane ke liye hoti hai,\nyaad karke muskaraane ke liye hoti hai.",
  "Dilon mein tum apni betabiyaan\nleke chal rahe ho — toh zinda ho tum.",
  "Har lamha badata ja raha hun main,\nzindagi chhoti si lag rahi hai.",
  "Senorita... yeh jo hai zindagi,\nkuch khwaab hain, kuch armaan hain.",
  "Ik junoon tha, ik deewaangi thi,\naaj bhi wahi rang hain mere.",
  "Do dil mil rahe hain,\nmagar chupke chupke.",
  "Nazar mein khwabon ki bijliyan\nleke chal rahe ho — toh zinda ho tum.",
  "Har ek pal ka shukrana karo,\nyeh lamha tera hai.",
];

// Stories he has called hard days. A story can also carry `hard: true` in Firestore.
export const HARD_TITLES = ['Nobody talks about this part'];

// How I photograph — from what I said about my camera; mine to change.
export const PHOTO_PHILOSOPHY = [
  "I don't take pictures to make a place prettier.",
  "When you look at one, I want you to feel what I felt standing there — the world as it is, already beautiful.",
  "I only touch the light: brightness, contrast, shadows. What my eyes saw is what you see.",
  "And sometimes I don't lift the camera at all. In Antarctica I sat on the bow and kept it behind my eyes.",
];

// What each place was to me, as the title on the journey — drawn from my own stories there.
// The country's name sits small above it. Mine to change; a place not listed falls back to its first story's title.
export const PLACE_LINES = {
  'India':       'where it began, and where I come home to',
  'USA':         'a counter where two old friends keep my seat',
  'Antarctica':  'the bottom of the world, where strangers became family',
  'Chile':       'an island at the edge of the map, and a yes I didn’t think about',
  'Spain':       'the morning I ran because the whole street did',
  'Greece':      'where the sea held me, and a stranger spoke of passion and desire',
  'Peru':        'below the mountain, I met my alchemist',
  'Slovenia':    'a son chasing his mother down a mountain',
  'France':      'five euros, and the best thing in the world',
  'Croatia':     'gate 26, where an old friend told the world about us',
  'Ireland':     'the birthday I never planned',
  'Argentina':   'a late breakfast that led me to the end of the world',
  'Ethiopia':    'two hours, no names, one running goodbye',
  'UAE':         'the sky asked if I’d jump again. I said yes.',
  'Mexico':      'the days nobody talks about',
  'Iceland':     'the morning I let them all go',
  'Portugal':    'a letter with no language between us',
  'Vietnam':     'a stranger gave a name to what I was already doing',
  'Netherlands': 'the wrong cafe, the right conversation',
  'in between':  'the places between places, where my heart kept moving',
};
