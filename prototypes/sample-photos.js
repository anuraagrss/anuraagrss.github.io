// Shared sample landscape photos for the photography redesign prototypes.
// Standalone — no Firebase. Swap image_url for real Storage URLs later.
window.SAMPLE_PHOTOS = [
  { seed:'glacier', title:'Glacier Tongue', location:'Vatnajökull, Iceland', date:'2025-02-11',
    tags:['landscape','ice','dawn'], story:'Minus nineteen and the ice was older than every language I speak. I waited an hour for the cloud to crack.',
    exif:{ camera:'Sony A7 IV', lens:'16-35 f/2.8', settings:'1/250 · f/9 · ISO100' } },
  { seed:'dunes', title:'The Long Light', location:'Sossusvlei, Namibia', date:'2024-11-03',
    tags:['landscape','desert','golden-hour'], story:'The dunes are 60 million years of patience. I climbed one and felt briefly, usefully small.',
    exif:{ camera:'Sony A7 IV', lens:'70-200 f/4', settings:'1/500 · f/11 · ISO200' } },
  { seed:'fjord', title:'Where Water Folds', location:'Geirangerfjord, Norway', date:'2025-06-21',
    tags:['landscape','water','blue-hour'], story:'A fjord at midnight in June never fully goes dark. Neither did I.',
    exif:{ camera:'Sony A7 IV', lens:'24-70 f/2.8', settings:'4s · f/8 · ISO100' } },
  { seed:'terraces', title:'Stairs to Nowhere', location:'Banaue, Philippines', date:'2024-09-14',
    tags:['landscape','green','rain'], story:'Two thousand years of rice carved into a mountain. The fog arrived exactly on cue, like it had read the script.',
    exif:{ camera:'Sony A7 IV', lens:'35 f/1.4', settings:'1/160 · f/5.6 · ISO400' } },
  { seed:'salt', title:'Mirror of the Sky', location:'Salar de Uyuni, Bolivia', date:'2025-01-29',
    tags:['landscape','reflection','dusk'], story:'When the salt floods, the horizon disappears. You stop knowing which way is up. Highly recommended.',
    exif:{ camera:'Sony A7 IV', lens:'16-35 f/2.8', settings:'1/320 · f/10 · ISO100' } },
  { seed:'volcano', title:'The Furnace', location:'Fagradalsfjall, Iceland', date:'2024-08-02',
    tags:['landscape','fire','night'], story:'Close enough to feel the heat on my face. The earth was being born and it did not care that I was watching.',
    exif:{ camera:'Sony A7 IV', lens:'70-200 f/4', settings:'1/60 · f/4 · ISO800' } },
  { seed:'forest', title:'Cathedral of Moss', location:'Hoh Rainforest, USA', date:'2025-04-18',
    tags:['landscape','green','mist'], story:'It rains here 300 days a year. Everything that can be green, is. Some things that should not be, also are.',
    exif:{ camera:'Sony A7 IV', lens:'24-70 f/2.8', settings:'1/40 · f/8 · ISO640' } },
  { seed:'aurora', title:'Combustion', location:'Tromsø, Norway', date:'2025-03-07',
    tags:['landscape','sky','night'], story:'The sky caught fire in colours that do not have honest names. I forgot to breathe and forgot to care.',
    exif:{ camera:'Sony A7 IV', lens:'14 f/1.8', settings:'8s · f/1.8 · ISO1600' } },
  { seed:'canyon', title:'Cut by Time', location:'Antelope Canyon, USA', date:'2024-10-22',
    tags:['landscape','earth','noon'], story:'Light only falls into this slot for a few minutes a day. Everyone there was holding their breath for the same beam.',
    exif:{ camera:'Sony A7 IV', lens:'16-35 f/2.8', settings:'1/30 · f/8 · ISO320' } },
  { seed:'lake', title:'Still', location:'Moraine Lake, Canada', date:'2025-07-09',
    tags:['landscape','water','dawn'], story:'I got there before the buses. For twenty minutes the lake belonged to me and one very judgmental marmot.',
    exif:{ camera:'Sony A7 IV', lens:'24-70 f/2.8', settings:'1/125 · f/11 · ISO100' } },
  { seed:'mountains', title:'The Spine', location:'Torres del Paine, Chile', date:'2024-12-15',
    tags:['landscape','mountain','golden-hour'], story:'The wind here can knock you over mid-sentence. The granite has been standing through it for 12 million years.',
    exif:{ camera:'Sony A7 IV', lens:'70-200 f/4', settings:'1/400 · f/9 · ISO200' } },
  { seed:'coast', title:'Edge of the Map', location:'Cliffs of Moher, Ireland', date:'2025-05-30',
    tags:['landscape','water','storm'], story:'214 metres of nothing below my toes. The Atlantic was in a mood and frankly so was I.',
    exif:{ camera:'Sony A7 IV', lens:'16-35 f/2.8', settings:'1/640 · f/8 · ISO200' } },
];
// Varied aspect ratios so the matted wall shows landscape-wide vs portrait-tall.
const SAMPLE_DIMS = [
  [1600,1000],[1600,900],[1000,1400],[1100,1400],[1600,900],[1000,1300],
  [1000,1500],[1600,1000],[1000,1500],[1600,1000],[1600,1000],[1600,900],
];
window.SAMPLE_PHOTOS.forEach((p,i) => {
  const [w,h] = SAMPLE_DIMS[i] || [1600,1000];
  p.w = w; p.h = h;
  p.image_url = `https://picsum.photos/seed/${p.seed}/${w}/${h}`;
});
