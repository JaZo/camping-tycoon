'use strict';
// ---------------------------------------------------------------------------
// Algemene hulpfuncties
// ---------------------------------------------------------------------------
const Util = {
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  rand(a, b) { return a + Math.random() * (b - a); },
  randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  chance(p) { return Math.random() < p; },
  weighted(pairs) { // [[value, weight], ...]
    let total = 0;
    for (const p of pairs) total += p[1];
    let r = Math.random() * total;
    for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; }
    return pairs[pairs.length - 1][0];
  },
  // Mulberry32 seeded RNG
  rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  },
  // deterministic pseudo-random 0..1 for integer coordinates
  hash2(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + (s || 0) * 1274126177) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    h = h ^ (h >>> 16);
    return ((h >>> 0) % 10000) / 10000;
  },
  dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); },
  // colours ----------------------------------------------------------------
  hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },
  rgbToHex(r, g, b) {
    const c = v => ('0' + Util.clamp(Math.round(v), 0, 255).toString(16)).slice(-2);
    return '#' + c(r) + c(g) + c(b);
  },
  shade(hex, amt) { // amt -1 .. 1  (negative = darker)
    const [r, g, b] = Util.hexToRgb(hex);
    if (amt >= 0) return Util.rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
    return Util.rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
  },
  mix(h1, h2, t) {
    const a = Util.hexToRgb(h1), b = Util.hexToRgb(h2);
    return Util.rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  },
  // formatting --------------------------------------------------------------
  euro(n) {
    const neg = n < 0; n = Math.abs(Math.round(n));
    const s = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-€ ' : '€ ') + s;
  },
  pct(n) { return Math.round(n) + '%'; },
  cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); },
  // DOM ---------------------------------------------------------------------
  el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  },
  esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); },
};

// ---------------------------------------------------------------------------
// Namen
// ---------------------------------------------------------------------------
const Names = {
  surnames: ['Jansen', 'de Vries', 'van den Berg', 'van Dijk', 'Bakker', 'Janssen', 'Visser', 'Smit', 'Meijer', 'de Boer',
    'Mulder', 'de Groot', 'Bos', 'Vos', 'Peters', 'Hendriks', 'van Leeuwen', 'Dekker', 'Brouwer', 'de Wit', 'Dijkstra',
    'Smits', 'de Graaf', 'van der Meer', 'van der Linden', 'Kok', 'Jacobs', 'de Haan', 'Vermeulen', 'van den Heuvel',
    'van der Veen', 'van den Broek', 'de Bruijn', 'van der Heijden', 'Schouten', 'van Beek', 'Willems', 'van Vliet',
    'van de Ven', 'Hoekstra', 'Maas', 'Verhoeven', 'Koster', 'van Dam', 'Prins', 'Blom', 'Huisman', 'Peeters', 'de Jong',
    'van der Wal', 'Kuipers', 'Postma', 'Timmermans', 'Hermans', 'van der Laan', 'Evers', 'Kramer', 'Wolters', 'Mol',
    'Hofman', 'Schipper', 'Scholten', 'van Wijk', 'Sanders', 'Groen', 'Vink', 'Koning', 'de Lange', 'Boon'],
  male: ['Jan', 'Piet', 'Kees', 'Henk', 'Bram', 'Daan', 'Tim', 'Lars', 'Thijs', 'Joris', 'Ruben', 'Bas', 'Niels', 'Sander',
    'Jeroen', 'Mark', 'Koen', 'Floris', 'Wouter', 'Martijn', 'Erik', 'Stefan', 'Rick', 'Maarten', 'Tom'],
  female: ['Anna', 'Emma', 'Sanne', 'Lotte', 'Fleur', 'Sophie', 'Julia', 'Eva', 'Lisa', 'Iris', 'Noor', 'Femke', 'Maud',
    'Roos', 'Tess', 'Marieke', 'Anouk', 'Esther', 'Ilse', 'Lieke', 'Nienke', 'Marloes', 'Suzanne', 'Linda', 'Laura'],
  senior: ['Gerrit', 'Wim', 'Cor', 'Bertus', 'Ria', 'Truus', 'Ans', 'Nel', 'Dirk', 'Aad', 'Corrie', 'Greet', 'Toos',
    'Jopie', 'Hans', 'Joke', 'Theo', 'Rietje', 'Harry', 'Tiny'],
  kid: ['Finn', 'Milan', 'Sem', 'Luuk', 'Mees', 'Jesse', 'Noa', 'Saar', 'Fenna', 'Liv', 'Mila', 'Zoë', 'Lana', 'Nova',
    'Boaz', 'Siem', 'Pim', 'Guusje', 'Jip', 'Janneke', 'Teun', 'Lize'],
  youth: ['Jayden', 'Dylan', 'Kevin', 'Romy', 'Chantal', 'Dave', 'Nick', 'Britt', 'Senna', 'Sven', 'Joey', 'Demi', 'Kim',
    'Melissa', 'Rowan', 'Yara', 'Jordy', 'Tamara', 'Wesley', 'Nikki'],
  cities: ['Tilburg', 'Eindhoven', 'Utrecht', 'Zwolle', 'Groningen', 'Breda', 'Nijmegen', 'Haarlem', 'Leiden', 'Amersfoort',
    'Enschede', 'Den Bosch', 'Arnhem', 'Deventer', 'Alkmaar', 'Apeldoorn', 'Delft', 'Gouda', 'Leeuwarden', 'Maastricht',
    'Rotterdam', 'Amsterdam', 'Antwerpen', 'Gent', 'Zaandam', 'Emmen', 'Venlo', 'Almere'],
  campings: ['De Vrolijke Boom', 'Het Groene Veld', 'De Zonnehoek', 'Bosrust', 'De Wilde Eend', 'Het Lommerrijk',
    'De Koekoek', 'Zonnig Dal', 'De Hazelaar', 'De Blauwe Hemel', 'Beekzicht', 'De Kleine Weide'],
  adultName() { return Util.chance(0.5) ? Util.pick(Names.male) : Util.pick(Names.female); },
};
