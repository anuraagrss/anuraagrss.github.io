// Pencil outlines of countries, drawn from Natural Earth (world-atlas 110m) the first time they're needed.
// Only the main landmass is drawn, so each country reads as the shape you'd sketch from memory.
const ATLAS = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';
const TOPO = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm';
const ALIAS = { 'usa': 'United States of America', 'uae': 'United Arab Emirates', 'uk': 'United Kingdom',
                'bosnia & herzegovina': 'Bosnia and Herz.', 'czech republic': 'Czechia' };

let shapes = null;
function load() {
  if (shapes) return shapes;
  shapes = Promise.all([fetch(ATLAS).then(r => r.json()), import(TOPO)]).then(([topo, { feature }]) => {
    const fc = feature(topo, topo.objects.countries), byName = new Map();
    fc.features.forEach(f => byName.set(f.properties.name.toLowerCase(), f));
    return byName;
  }).catch(() => new Map());
  return shapes;
}

// the biggest ring of a (multi)polygon, by area in degrees
function mainRing(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  let best = null, area = -1;
  polys.forEach(p => {
    const r = p[0]; let a = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
    if (Math.abs(a) > area) { area = Math.abs(a); best = r; }
  });
  return best;
}

export async function outline(name, size = 64) {
  const byName = await load();
  const f = byName.get((ALIAS[name.toLowerCase()] || name).toLowerCase());
  if (!f) return '';
  const ring = mainRing(f.geometry); if (!ring) return '';
  const midLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const k = Math.cos(Math.max(-75, Math.min(75, midLat)) * Math.PI / 180);
  const pts = ring.map(([x, y]) => [x * k, -y]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys), w = Math.max(...xs) - minX, h = Math.max(...ys) - minY;
  const pad = 4, s = (size - pad * 2) / Math.max(w, h), ox = (size - w * s) / 2, oy = (size - h * s) / 2;
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(ox + (x - minX) * s).toFixed(1)} ${(oy + (y - minY) * s).toFixed(1)}`).join('') + 'Z';
  return `<svg class="outline" viewBox="0 0 ${size} ${size}" aria-hidden="true"><path d="${d}" pathLength="1"/><path class="o2" d="${d}" pathLength="1"/></svg>`;
}
