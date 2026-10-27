'use strict';
// ---------------------------------------------------------------------------
// Procedurele isometrische sprites.  Lokale coördinaten: (u, v) in tegels
// binnen de footprint, z in pixels omhoog.  Tegel = 64 x 32.
// ---------------------------------------------------------------------------
const C = {
  wood: '#a3703f', woodD: '#7a5230', woodL: '#c9955e', white: '#f4f1e8', cream: '#efe7d2', roofRed: '#b7452c',
  roofGrey: '#5f6670', roofGreen: '#4b6a3a', canvas: '#e9dfc4', glass: '#9fd3ee', glassD: '#5aa0c8', metal: '#9aa3ad',
  dark: '#2b2b2b', sand: '#e6d7a3', water: '#4f94cf', asphalt: '#5c5c60',
  tents: ['#e0532f', '#3a7bd5', '#4caf50', '#f2c53d', '#8e44ad', '#16a085'],
  cars: ['#c0392b', '#2980b9', '#7f8c8d', '#2c3e50', '#e8e8e8', '#27ae60', '#d35400'],
  shirts: ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#ff7eb6', '#34495e', '#7fdbff'],
  skins: ['#f6d4b8', '#e8b998', '#d9a070', '#b07a4a', '#8a5a33', '#f0c8a8'],
  hairs: ['#2b1b0e', '#5a3818', '#a56a2a', '#e6c36a', '#1b1b1b', '#c44d2b'],
};

class S {
  constructor(c, w, h, ox, oy, mirror) { this.c = c; this.w = w; this.h = h; this.ox = ox; this.oy = oy; this.mirror = !!mirror; }
  // mirror: spiegeling over de diagonaal (u<->v). Daarmee 'draait' een object; beide voorgevels blijven zichtbaar.
  iso(u, v, z) { if (this.mirror) { const t = u; u = v; v = t; } return [this.ox + (u - v) * 32, this.oy + (u + v) * 16 - (z || 0)]; }
  P(pts, fill, stroke, lw) {
    const c = this.c; c.beginPath();
    for (let i = 0; i < pts.length; i++) i ? c.lineTo(pts[i][0], pts[i][1]) : c.moveTo(pts[i][0], pts[i][1]);
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
  }
  flat(u0, v0, u1, v1, z, fill, stroke, lw) {
    this.P([this.iso(u0, v0, z), this.iso(u1, v0, z), this.iso(u1, v1, z), this.iso(u0, v1, z)], fill, stroke, lw);
  }
  box(u0, v0, u1, v1, z0, z1, col, o) {
    o = o || {};
    const top = o.top || Util.shade(col, 0.18); let left = o.left || Util.shade(col, -0.06), right = o.right || Util.shade(col, -0.26);
    if (this.mirror) { const t = left; left = right; right = t; }
    this.P([this.iso(u0, v1, z0), this.iso(u1, v1, z0), this.iso(u1, v1, z1), this.iso(u0, v1, z1)], left);
    this.P([this.iso(u1, v0, z0), this.iso(u1, v1, z0), this.iso(u1, v1, z1), this.iso(u1, v0, z1)], right);
    this.P([this.iso(u0, v0, z1), this.iso(u1, v0, z1), this.iso(u1, v1, z1), this.iso(u0, v1, z1)], top, o.stroke, 0.7);
  }
  // rechthoek op een gevel. face 'L' = vlak v=fixed (linkervoorgevel), 'R' = vlak u=fixed (rechtervoorgevel)
  faceRect(face, fixed, a, b, z0, z1, fill, stroke) {
    if (face === 'L') this.P([this.iso(a, fixed, z0), this.iso(b, fixed, z0), this.iso(b, fixed, z1), this.iso(a, fixed, z1)], fill, stroke);
    else this.P([this.iso(fixed, a, z0), this.iso(fixed, b, z0), this.iso(fixed, b, z1), this.iso(fixed, a, z1)], fill, stroke);
  }
  // zadeldak. alongU: nok loopt in u-richting.
  gable(u0, v0, u1, v1, z0, z1, alongU, col) {
    let dark = Util.shade(col, -0.3), light = Util.shade(col, 0.08);
    if (this.mirror) { const t = dark; dark = light; light = t; }
    if (alongU) {
      const vm = (v0 + v1) / 2;
      if (z1 - z0 < (vm - v0) * 16) this.P([this.iso(u0, v0, z0), this.iso(u1, v0, z0), this.iso(u1, vm, z1), this.iso(u0, vm, z1)], dark);
      this.P([this.iso(u0, v1, z0), this.iso(u1, v1, z0), this.iso(u1, vm, z1), this.iso(u0, vm, z1)], light);
      this.P([this.iso(u1, v1, z0), this.iso(u1, vm, z1)], null, Util.shade(col, -0.4), 1);
    } else {
      const um = (u0 + u1) / 2;
      if (z1 - z0 < (um - u0) * 16) this.P([this.iso(u0, v0, z0), this.iso(u0, v1, z0), this.iso(um, v1, z1), this.iso(um, v0, z1)], light);
      this.P([this.iso(u1, v0, z0), this.iso(u1, v1, z0), this.iso(um, v1, z1), this.iso(um, v0, z1)], dark);
    }
  }
  gableEnd(u0, v0, u1, v1, z0, z1, alongU, col) {
    const cR = this.mirror ? -0.06 : -0.26, cL = this.mirror ? -0.26 : -0.06;
    if (alongU) { const vm = (v0 + v1) / 2; this.P([this.iso(u1, v0, z0), this.iso(u1, v1, z0), this.iso(u1, vm, z1)], Util.shade(col, cR)); }
    else { const um = (u0 + u1) / 2; this.P([this.iso(u0, v1, z0), this.iso(u1, v1, z0), this.iso(um, v1, z1)], Util.shade(col, cL)); }
  }
  pyramid(u0, v0, u1, v1, z0, z1, col) {
    const a = this.iso((u0 + u1) / 2, (v0 + v1) / 2, z1);
    this.P([this.iso(u0, v1, z0), this.iso(u1, v1, z0), a], Util.shade(col, this.mirror ? -0.3 : 0.05));
    this.P([this.iso(u1, v0, z0), this.iso(u1, v1, z0), a], Util.shade(col, this.mirror ? 0.05 : -0.3));
  }
  cyl(u, v, r, z0, z1, col) {
    const [x, y0] = this.iso(u, v, z0), y1 = y0 - (z1 - z0), rx = r * 45, ry = r * 22.5, c = this.c;
    const g = c.createLinearGradient(x - rx, 0, x + rx, 0);
    g.addColorStop(0, Util.shade(col, -0.1)); g.addColorStop(0.35, Util.shade(col, 0.12)); g.addColorStop(1, Util.shade(col, -0.4));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - rx, y0); c.lineTo(x + rx, y0); c.lineTo(x + rx, y1); c.lineTo(x - rx, y1); c.fill();
    this.ell(x, y0, rx, ry, g);
    this.ell(x, y1, rx, ry, Util.shade(col, 0.2));
  }
  ell(x, y, rx, ry, fill, stroke, lw) {
    const c = this.c; c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
  }
  circ(x, y, r, fill, stroke, lw) { this.ell(x, y, r, r, fill, stroke, lw); }
  shadow(u, v, rx, ry, a) { const [x, y] = this.iso(u, v, 0); this.ell(x, y, rx, ry, 'rgba(0,0,0,' + (a || 0.18) + ')'); }
  line(x0, y0, x1, y1, col, lw) { const c = this.c; c.strokeStyle = col; c.lineWidth = lw || 1; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
  lineIso(u0, v0, z0, u1, v1, z1, col, lw) { const a = this.iso(u0, v0, z0), b = this.iso(u1, v1, z1); this.line(a[0], a[1], b[0], b[1], col, lw); }
  // boom met ronde kruin (billboard)
  treeRound(u, v, trunkH, r, cols, trunkCol) {
    const [x, y] = this.iso(u, v, 0);
    this.shadow(u, v, r * 0.9, r * 0.45, 0.2);
    this.c.fillStyle = trunkCol || '#6b4a2b'; this.c.fillRect(x - 2.5, y - trunkH, 5, trunkH);
    const cy = y - trunkH - r * 0.6;
    this.circ(x + r * 0.2, cy + r * 0.2, r, cols[0]);
    this.circ(x - r * 0.25, cy - r * 0.05, r * 0.85, cols[1]);
    this.circ(x - r * 0.1, cy - r * 0.35, r * 0.65, cols[2]);
  }
  bare(u, v, trunkH) {
    const [x, y] = this.iso(u, v, 0); const c = this.c;
    this.shadow(u, v, 10, 5, 0.12);
    c.strokeStyle = '#6b4a2b'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - trunkH); c.stroke();
    c.lineWidth = 2;
    const br = [[-10, -12], [11, -14], [-7, -22], [8, -24], [0, -30], [-14, -5], [13, -4]];
    for (const b of br) { c.beginPath(); c.moveTo(x, y - trunkH + 4 + b[1] * 0.3); c.lineTo(x + b[0], y - trunkH + b[1]); c.stroke(); }
    c.lineCap = 'butt';
  }
  pine(u, v, snow) {
    const [x, y] = this.iso(u, v, 0); const c = this.c;
    this.shadow(u, v, 11, 5.5, 0.2);
    c.fillStyle = '#5a3a1e'; c.fillRect(x - 2, y - 10, 4, 10);
    const tiers = [[y - 8, 18, 22, '#2f6b3a'], [y - 22, 14, 19, '#3b8048'], [y - 35, 10, 16, '#4a955a']];
    for (const t of tiers) {
      this.P([[x - t[1], t[0]], [x + t[1], t[0]], [x, t[0] - t[2]]], t[3]);
      if (snow) this.P([[x - t[1] * 0.7, t[0] - 4], [x + t[1] * 0.7, t[0] - 4], [x, t[0] - t[2] + 3]], 'rgba(255,255,255,0.75)');
    }
  }
  fence(u0, v0, u1, v1, back, col) { // hekje rondom; back=true tekent de achterste twee zijden
    col = col || C.woodD;
    const edges = back ? [[u0, v0, u1, v0], [u0, v0, u0, v1]] : [[u0, v1, u1, v1], [u1, v0, u1, v1]];
    for (const e of edges) {
      const len = Math.max(Math.abs(e[2] - e[0]), Math.abs(e[3] - e[1])), n = Math.max(1, Math.round(len * 3));
      for (let i = 0; i <= n; i++) {
        const t = i / n, u = e[0] + (e[2] - e[0]) * t, v = e[1] + (e[3] - e[1]) * t;
        const [x, y] = this.iso(u, v, 0);
        this.c.fillStyle = col; this.c.fillRect(x - 1, y - 10, 2, 10);
      }
      this.lineIso(e[0], e[1], 7, e[2], e[3], 7, col, 1.2);
      this.lineIso(e[0], e[1], 3.5, e[2], e[3], 3.5, col, 1.2);
    }
  }
  parasol(u, v, col) {
    const [x, y] = this.iso(u, v, 0);
    this.line(x, y, x, y - 22, '#777', 1.5);
    const c = this.c; c.fillStyle = col; c.beginPath(); c.ellipse(x, y - 20, 13, 6.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.moveTo(x, y - 25); c.lineTo(x - 13, y - 20); c.lineTo(x - 4, y - 14.5); c.fill();
    c.beginPath(); c.moveTo(x, y - 25); c.lineTo(x + 13, y - 20); c.lineTo(x + 4, y - 14.5); c.fill();
    this.line(x - 13, y - 20, x, y - 26, '#555', 1); this.line(x + 13, y - 20, x, y - 26, '#555', 1);
  }
  flag(u, v, h, col) {
    const [x, y] = this.iso(u, v, 0);
    this.line(x, y, x, y - h, '#ddd', 1.5);
    this.P([[x, y - h], [x + 12, y - h + 4], [x, y - h + 8]], col);
  }
  bunting(u0, v0, u1, v1, z) {
    const a = this.iso(u0, v0, z), b = this.iso(u1, v1, z), n = 8, cols = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#e67e22'];
    this.line(a[0], a[1], b[0], b[1], '#444', 1);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t + 1;
      this.P([[x - 2.5, y], [x + 2.5, y], [x, y + 5]], cols[i % cols.length]);
    }
  }
  tentShape(u0, v0, u1, v1, hgt, col) { // nok langs u
    const vm = (v0 + v1) / 2; let dark = Util.shade(col, -0.3), light = Util.shade(col, 0.1);
    if (this.mirror) { const t = dark; dark = light; light = t; }
    this.P([this.iso(u0, v0, 0), this.iso(u1, v0, 0), this.iso(u1, vm, hgt), this.iso(u0, vm, hgt)], dark);
    this.P([this.iso(u0, v1, 0), this.iso(u1, v1, 0), this.iso(u1, vm, hgt), this.iso(u0, vm, hgt)], light);
    this.P([this.iso(u1, v0, 0), this.iso(u1, v1, 0), this.iso(u1, vm, hgt)], Util.shade(col, -0.15));
    // deuropening
    this.P([this.iso(u1, vm - (v1 - v0) * 0.2, 0), this.iso(u1, vm + (v1 - v0) * 0.2, 0), this.iso(u1, vm, hgt * 0.7)], Util.shade(col, -0.55));
    this.lineIso(u0, vm, hgt, u1, vm, hgt, Util.shade(col, 0.35), 1);
  }
  caravan(u0, v0, u1, v1, col, stripe) {
    col = col || '#f5f5f0';
    const z0 = 7, z1 = 27;
    this.shadow((u0 + u1) / 2, (v0 + v1) / 2, (u1 - u0) * 28, (v1 - v0) * 22, 0.2);
    this.box(u0, v0, u1, v1, z0, z1, col);
    // afgeronde bovenkant / dak
    this.flat(u0 + 0.05, v0 + 0.05, u1 - 0.05, v1 - 0.05, z1 + 2, Util.shade(col, 0.25));
    // streep en raam
    this.faceRect('L', v1, u0 + 0.05, u1 - 0.05, z0 + 7, z0 + 9.5, stripe || '#4a78c2');
    this.faceRect('L', v1, u0 + 0.15, u0 + 0.5, z0 + 11, z0 + 17, C.glassD);
    this.faceRect('L', v1, u1 - 0.55, u1 - 0.15, z0 + 11, z0 + 17, C.glassD);
    this.faceRect('R', u1, v0 + 0.12, v1 - 0.12, z0 + 10, z0 + 17, C.glassD);
    // wiel
    const [wx, wy] = this.iso((u0 + u1) / 2, v1, 1); this.circ(wx, wy, 4.5, '#222'); this.circ(wx, wy, 2, '#999');
    // dissel
    this.lineIso(u1, (v0 + v1) / 2, z0, u1 + 0.25, (v0 + v1) / 2, z0 - 3, '#777', 2);
  }
  camper(u0, v0, u1, v1, col) {
    col = col || '#f0ede4';
    const z0 = 5, z1 = 32;
    this.shadow((u0 + u1) / 2, (v0 + v1) / 2, (u1 - u0) * 28, (v1 - v0) * 22, 0.22);
    // cabine (rechts, lager)
    const uc = u1 - 0.45;
    this.box(u0, v0, uc, v1, z0, z1, col);
    this.box(uc, v0 + 0.03, u1, v1 - 0.03, z0, z1 - 10, '#d9d6cc');
    this.faceRect('R', u1, v0 + 0.08, v1 - 0.08, z0 + 8, z1 - 12, C.glass);  // voorruit
    this.faceRect('L', v1, u0 + 0.1, uc - 0.1, z0 + 12, z0 + 20, C.glassD);
    this.faceRect('L', v1, u0 + 0.05, uc - 0.05, z0 + 5, z0 + 7.5, '#c0392b');
    for (const u of [u0 + 0.22, uc - 0.12]) { const [wx, wy] = this.iso(u, v1, 1); this.circ(wx, wy, 4.5, '#222'); this.circ(wx, wy, 2, '#aaa'); }
    const [hx, hy] = this.iso(u1, v1 - 0.12, z0 + 3); this.circ(hx, hy, 1.8, '#fff3b0');
  }
  car(u0, v0, u1, v1, col) {
    col = col || Util.pick(C.cars);
    this.shadow((u0 + u1) / 2, (v0 + v1) / 2, (u1 - u0) * 26, (v1 - v0) * 20, 0.2);
    this.box(u0, v0, u1, v1, 4, 12, col);
    this.box(u0 + (u1 - u0) * 0.2, v0 + 0.05, u1 - (u1 - u0) * 0.3, v1 - 0.05, 12, 20, col, { left: C.glassD, right: C.glass });
    for (const u of [u0 + 0.17, u1 - 0.17]) { const [wx, wy] = this.iso(u, v1, 0); this.circ(wx, wy, 3.2, '#222'); this.circ(wx, wy, 1.3, '#aaa'); }
  }
  window(face, fixed, a, b, z0, z1) {
    this.faceRect(face, fixed, a, b, z0, z1, C.glassD, '#fff');
    this.faceRect(face, fixed, a, a + (b - a) * 0.45, z0 + (z1 - z0) * 0.5, z1, 'rgba(255,255,255,0.35)');
  }
  door(face, fixed, a, b, z1, col) { this.faceRect(face, fixed, a, b, 0, z1, col || C.woodD, Util.shade(col || C.woodD, -0.3)); }
  text(x, y, s, size, col) { const c = this.c; c.fillStyle = col; c.font = 'bold ' + size + 'px sans-serif'; c.textAlign = 'center'; c.fillText(s, x, y); }
}

// ---------------------------------------------------------------------------
// Tekenfuncties per object-id.  (s = S-context, v = variant)
// ---------------------------------------------------------------------------
const DRAW = {};
const ZONES = {}; // sta-zones voor gasten binnen footprint [[u0,v0,u1,v1],...]

const grassCol = (light) => ({ lente: light ? '#86c266' : '#7fbb5f', zomer: light ? '#80bc60' : '#78b458', herfst: light ? '#a9b865' : '#9fb05e', winter: light ? '#eef2f6' : '#e6ebf0' })[Sprites.season];
const leafCols = () => ({
  lente: ['#5fa63a', '#7cc24e', '#9ad96a'], zomer: ['#3f7d2f', '#4f9a3a', '#62b347'],
  herfst: ['#a85f22', '#c97b2a', '#e0a23a'], winter: null,
})[Sprites.season];

DRAW.eik = s => { const lc = leafCols(); if (!lc) return s.bare(0.5, 0.5, 20); s.treeRound(0.5, 0.5, 18, 17, lc); };
DRAW.den = s => s.pine(0.5, 0.5, Sprites.season === 'winter');
DRAW.berk = s => {
  const lc = leafCols(); if (!lc) { s.bare(0.5, 0.5, 24); return; }
  const [x, y] = s.iso(0.5, 0.5, 0); s.shadow(0.5, 0.5, 12, 6, 0.18);
  s.c.fillStyle = '#eee'; s.c.fillRect(x - 2, y - 30, 4, 30); s.c.fillStyle = '#333';
  for (let i = 0; i < 5; i++) s.c.fillRect(x - 2 + (i % 2) * 2, y - 26 + i * 5, 2, 1.2);
  const cols = lc.map(h => Util.shade(h, 0.15));
  s.circ(x + 3, y - 36, 11, cols[0]); s.circ(x - 4, y - 40, 10, cols[1]); s.circ(x + 1, y - 47, 8, cols[2]);
};
DRAW.wilg = s => {
  const lc = leafCols(); if (!lc) { s.bare(0.5, 0.5, 18); return; }
  const [x, y] = s.iso(0.5, 0.5, 0); s.shadow(0.5, 0.5, 18, 8, 0.18);
  s.c.fillStyle = '#6b4a2b'; s.c.fillRect(x - 3, y - 20, 6, 20);
  s.ell(x, y - 34, 24, 15, lc[1]);
  s.c.strokeStyle = lc[0]; s.c.lineWidth = 1.5;
  for (let i = -5; i <= 5; i++) { const sx = x + i * 4.3; s.c.beginPath(); s.c.moveTo(sx, y - 34); s.c.quadraticCurveTo(sx + i * 0.8, y - 20, sx + i * 1.2, y - 8 + Math.abs(i)); s.c.stroke(); }
  s.ell(x - 4, y - 38, 14, 9, lc[2]);
};
DRAW.fruitboom = s => {
  const lc = leafCols(); if (!lc) { s.bare(0.5, 0.5, 14); return; }
  s.treeRound(0.5, 0.5, 12, 13, lc);
  if (Sprites.season !== 'lente') { const [x, y] = s.iso(0.5, 0.5, 0); for (let i = 0; i < 7; i++) s.circ(x - 9 + Util.hash2(i, 3) * 18, y - 14 - Util.hash2(i, 7) * 16, 1.8, Sprites.season === 'herfst' ? '#d62f2f' : '#e04545'); }
  else { const [x, y] = s.iso(0.5, 0.5, 0); for (let i = 0; i < 7; i++) s.circ(x - 9 + Util.hash2(i, 3) * 18, y - 14 - Util.hash2(i, 7) * 16, 1.6, '#fff0f5'); }
};
DRAW.struik = (s, v) => { const [x, y] = s.iso(0.5, 0.5, 0); s.shadow(0.5, 0.5, 13, 6, 0.15); s.circ(x + 6, y - 6, 9, '#3f7d2f'); s.circ(x - 6, y - 7, 9, '#4f9a3a'); s.circ(x, y - 12, 8, '#62b347'); if (v === 1) { s.circ(x + 12, y - 3, 5, '#3a6b2a'); s.circ(x - 12, y - 11, 4.5, '#3a6b2a'); s.circ(x + 3, y - 20, 4, '#4a7d33'); s.circ(x - 7, y - 1, 4, '#3a6b2a'); } };
DRAW.heg = (s, v) => { s.box(0.08, 0.08, 0.92, 0.92, 0, 14, '#4e8c3a', { top: '#6cb04e' }); if (v === 1) { for (let i = 0; i < 7; i++) { const [x, y] = s.iso(0.1 + Util.hash2(i, 51) * 0.8, 0.1 + Util.hash2(i, 52) * 0.8, 14); s.circ(x, y - 2 - Util.hash2(i, 53) * 6, 3.5, '#3f7d2f'); } } };
DRAW.bloemperk = (s, v) => {
  s.flat(0.1, 0.1, 0.9, 0.9, 0, '#6b4a2b', '#4a3219', 1);
  const cols = v === 1 ? ['#b07a5a', '#c9b06a', '#b89a8a', '#d9d0c0', '#8a7a90'] : ['#e74c3c', '#f1c40f', '#ff7eb6', '#ffffff', '#9b59b6'];
  for (let i = 0; i < (v === 1 ? 7 : 14); i++) { const [x, y] = s.iso(0.18 + Util.hash2(i, 1) * 0.64, 0.18 + Util.hash2(i, 2) * 0.64, 3); s.circ(x, y, 2.2, cols[i % 5]); s.circ(x, y, 0.8, '#ffe'); }
};
DRAW.bloemen = (s, v) => {
  const cols = v === 1 ? ['#b07a5a', '#c9b06a', '#d9d0c0', '#b89a8a', '#9a9ab0'] : ['#e74c3c', '#f1c40f', '#ffffff', '#ff7eb6', '#8e9bff'];
  for (let i = 0; i < (v === 1 ? 5 : 9); i++) {
    const [x, y] = s.iso(0.15 + Util.hash2(i, 11) * 0.7, 0.15 + Util.hash2(i, 12) * 0.7, 0);
    s.line(x, y, x, y - 6, '#4f9a3a', 1); s.circ(x, y - 7, 2, cols[i % 5]); s.circ(x, y - 7, 0.7, '#ffd');
  }
};
DRAW.rotsblok = s => { const [x, y] = s.iso(0.5, 0.5, 0); s.shadow(0.5, 0.5, 14, 7, 0.2); s.P([[x - 14, y - 2], [x - 8, y - 14], [x + 2, y - 18], [x + 13, y - 10], [x + 14, y - 1], [x + 4, y + 4], [x - 8, y + 3]], '#8d8f93', '#6a6c70'); s.P([[x - 8, y - 14], [x + 2, y - 18], [x + 6, y - 10], [x - 4, y - 8]], '#a9abb0'); };

// --- staplekken ---
const wildCol = () => ({ lente: '#7aa34a', zomer: '#75a044', herfst: '#98984a', winter: '#dfe4e8' })[Sprites.season];
// hoog gras: donkerder/geler vlak met plukjes
function tufts(s, w, h, n) { s.c.strokeStyle = '#4f7d2a'; s.c.lineWidth = 1.2; for (let i = 0; i < n; i++) { const [x, y] = s.iso(0.15 + Util.hash2(i, 41) * (w - 0.3), 0.15 + Util.hash2(i, 42) * (h - 0.3), 0); s.c.beginPath(); s.c.moveTo(x - 2, y); s.c.lineTo(x - 1, y - 6); s.c.moveTo(x, y); s.c.lineTo(x + 1, y - 7); s.c.moveTo(x + 2, y); s.c.lineTo(x + 3, y - 5); s.c.stroke(); } }
function pitchGround(s, w, h, col, wild) {
  s.flat(0, 0, w, h, 0, wild ? wildCol() : (col || grassCol(false)));
  if (wild) tufts(s, w, h, w * h * 5);
  s.c.setLineDash([3, 3]); s.flat(0.05, 0.05, w - 0.05, h - 0.05, 0, null, '#5a8c42', 1); s.c.setLineDash([]);
  // nummerpaaltje
  const [x, y] = s.iso(0.15, h - 0.15, 0); s.c.fillStyle = '#eee'; s.c.fillRect(x - 1.5, y - 12, 3, 12); s.c.fillStyle = '#c0392b'; s.c.fillRect(x - 2.5, y - 14, 5, 4);
}
function powerPole(s, u, v) { const [x, y] = s.iso(u, v, 0); s.c.fillStyle = '#777'; s.c.fillRect(x - 2, y - 16, 4, 16); s.c.fillStyle = '#555'; s.c.fillRect(x - 4, y - 20, 8, 6); s.circ(x, y - 17, 1.5, '#ffd500'); }
function tap(s, u, v) { const [x, y] = s.iso(u, v, 0); s.c.fillStyle = '#888'; s.c.fillRect(x - 1, y - 12, 2, 12); s.c.fillRect(x - 1, y - 12, 5, 2); s.circ(x + 1, y - 10, 1.6, '#3a7bd5'); }
DRAW.tentplek = (s, v) => { pitchGround(s, 2, 2, null, v === 1); };
DRAW.caravanplek = (s, v) => { pitchGround(s, 2, 2, null, v === 1); powerPole(s, 1.85, 0.15); };
DRAW.comfortplek = (s, v) => { pitchGround(s, 3, 3, grassCol(true), v === 1); powerPole(s, 2.85, 0.15); tap(s, 0.15, 0.15); s.box(0.05, 1.2, 0.2, 1.8, 0, 12, '#4e8c3a', { top: '#6cb04e' }); };
ZONES.tentplek = [[0.1, 0.1, 1.9, 0.45], [0.1, 1.55, 1.9, 1.9], [0.1, 0.1, 0.45, 1.9], [1.55, 0.1, 1.9, 1.9]];
ZONES.caravanplek = ZONES.tentplek;
ZONES.comfortplek = [[0.2, 0.2, 2.8, 0.5], [0.2, 2.5, 2.8, 2.8], [0.2, 0.2, 0.5, 2.8], [2.5, 0.2, 2.8, 2.8]];

// --- verhuur ---
DRAW.trekkershut = (s, v) => {
  s.flat(0, 0, 2, 2, 0, v === 1 ? wildCol() : grassCol(false)); if (v === 1) tufts(s, 2, 2, 8);
  s.flat(0.25, 1.55, 1.75, 1.95, 1, C.woodL, C.woodD, 0.5); // terrasje
  s.box(0.3, 0.35, 1.7, 1.55, 0, 26, C.wood);
  for (let i = 0; i < 5; i++) s.lineIso(0.3, 1.55, 5 + i * 5, 1.7, 1.55, 5 + i * 5, Util.shade(C.wood, -0.25), 0.6);
  s.door('L', 1.55, 0.55, 0.9, 18, '#5a3a1e');
  s.window('L', 1.55, 1.1, 1.5, 8, 18);
  s.window('R', 1.7, 0.6, 1.1, 8, 18);
  s.gableEnd(0.3, 0.35, 1.7, 1.55, 26, 40, true, C.wood);
  s.gable(0.2, 0.25, 1.8, 1.65, 25, 40, true, C.roofGreen);
};
ZONES.trekkershut = [[0.2, 1.6, 1.8, 1.95], [1.75, 0.2, 1.95, 1.9]];
DRAW.glampingtent = (s, v) => {
  s.flat(0, 0, 2, 2, 0, v === 1 ? wildCol() : grassCol(false)); if (v === 1) tufts(s, 2, 2, 8);
  s.box(0.15, 0.15, 1.85, 1.85, 0, 4, C.woodL, { top: '#d9b07a' });
  for (let i = 1; i < 8; i++) s.lineIso(0.15 + i * 0.2125, 0.15, 4, 0.15 + i * 0.2125, 1.85, 4, '#c29a63', 0.6);
  s.tentShape(0.35, 0.35, 1.65, 1.35, 30, C.canvas);
  // luifel aan de voorkant (v-zijde)
  s.P([s.iso(0.35, 1.35, 22), s.iso(1.65, 1.35, 22), s.iso(1.65, 1.8, 14), s.iso(0.35, 1.8, 14)], Util.shade(C.canvas, -0.08), Util.shade(C.canvas, -0.3), 0.6);
  s.lineIso(0.4, 1.8, 0, 0.4, 1.8, 14, C.woodD, 1.5); s.lineIso(1.6, 1.8, 0, 1.6, 1.8, 14, C.woodD, 1.5);
  const [lx, ly] = s.iso(1.0, 1.6, 0); s.circ(lx, ly - 3, 2.5, '#f6d365');
};
ZONES.glampingtent = [[0.2, 1.4, 1.8, 1.85], [1.7, 0.2, 1.85, 1.85]];
DRAW.stacaravan = (s, v) => {
  s.flat(0, 0, 3, 2, 0, v === 1 ? wildCol() : grassCol(false)); if (v === 1) tufts(s, 3, 2, 10);
  s.flat(0.2, 1.45, 2.8, 1.95, 2, C.woodL, C.woodD, 0.5);
  s.fence(0.2, 1.45, 2.8, 1.95, false, C.woodD);
  s.box(0.2, 0.35, 2.8, 1.45, 3, 30, C.cream);
  s.faceRect('L', 1.45, 0.2, 2.8, 3, 7, '#8fa3b5');
  s.window('L', 1.45, 0.4, 1.0, 14, 25); s.window('L', 1.45, 1.9, 2.6, 14, 25); s.door('L', 1.45, 1.25, 1.6, 24, '#6b7c8f');
  s.window('R', 2.8, 0.5, 1.2, 14, 25);
  s.flat(0.1, 0.25, 2.9, 1.55, 31, '#8a9199', '#6e747a', 0.7);
  s.box(0.5, 0.5, 0.7, 0.7, 31, 40, '#777');
};
ZONES.stacaravan = [[0.3, 1.5, 2.7, 1.9]];
DRAW.chalet = (s, v) => {
  s.flat(0, 0, 3, 3, 0, v === 1 ? wildCol() : grassCol(false)); if (v === 1) tufts(s, 3, 3, 14);
  s.flat(0.2, 2.2, 2.8, 2.9, 2, C.woodL, C.woodD, 0.5);
  s.fence(0.2, 2.2, 2.8, 2.9, false, '#8a6a4a');
  s.box(0.3, 0.3, 2.7, 2.2, 0, 42, '#c48b55');
  for (let i = 0; i < 8; i++) s.lineIso(0.3, 2.2, 4 + i * 5, 2.7, 2.2, 4 + i * 5, '#9c6a3c', 0.6);
  s.window('L', 2.2, 0.5, 1.1, 10, 26); s.window('L', 2.2, 1.9, 2.5, 10, 26); s.door('L', 2.2, 1.3, 1.7, 26, '#5a3a1e');
  s.window('R', 2.7, 0.5, 1.0, 10, 26); s.window('R', 2.7, 1.3, 1.9, 10, 26);
  s.gableEnd(0.3, 0.3, 2.7, 2.2, 42, 68, true, '#c48b55');
  s.gable(0.15, 0.15, 2.85, 2.35, 40, 68, true, C.roofRed);
  s.box(2.1, 0.6, 2.4, 0.9, 50, 76, '#7d7d7d');
};
ZONES.chalet = [[0.3, 2.3, 2.7, 2.85], [2.75, 0.3, 2.95, 2.8]];
DRAW.pipowagen = (s, v) => {
  s.flat(0, 0, 2, 1, 0, v === 1 ? wildCol() : grassCol(false)); if (v === 1) tufts(s, 2, 1, 5);
  const cols = ['#c0392b', '#27ae60', '#f1c40f'];
  s.shadow(1, 0.5, 30, 12, 0.2);
  s.box(0.35, 0.2, 1.75, 0.8, 9, 30, '#c0392b');
  s.faceRect('L', 0.8, 0.4, 1.7, 12, 15, '#f1c40f'); s.faceRect('L', 0.8, 0.4, 1.7, 22, 25, '#27ae60');
  s.window('L', 0.8, 0.55, 0.85, 16, 26); s.window('L', 0.8, 1.25, 1.55, 16, 26);
  s.door('R', 1.75, 0.3, 0.7, 28, '#27ae60');
  // tonnen dak
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const v0 = 0.15 + i * 0.7 / steps, v1 = v0 + 0.7 / steps, zz = (v) => 30 + Math.sin(Math.PI * (v - 0.15) / 0.7) * 9;
    s.P([s.iso(0.3, v0, zz(v0)), s.iso(1.8, v0, zz(v0)), s.iso(1.8, v1, zz(v1)), s.iso(0.3, v1, zz(v1))], Util.shade('#2d7fc1', -0.3 + i * 0.07));
  }
  s.P([s.iso(1.75, 0.2, 30), s.iso(1.75, 0.5, 39), s.iso(1.75, 0.8, 30)], '#f1c40f');
  for (const [u, v] of [[0.6, 0.8], [1.5, 0.8]]) { const [x, y] = s.iso(u, v, 2); s.circ(x, y, 6, '#f1c40f', '#8a6a1a', 1.5); s.circ(x, y, 1.5, '#8a6a1a'); }
  s.box(1.78, 0.35, 1.95, 0.65, 0, 6, C.wood);
};
ZONES.pipowagen = [[0.1, 0.82, 1.9, 0.98], [1.9, 0.1, 1.98, 0.9]];

// --- voorzieningen ---
DRAW.receptie = s => {
  s.flat(0, 0, 2, 2, 0, '#b9b1a1');
  s.box(0.2, 0.2, 1.8, 1.8, 0, 30, C.white);
  s.faceRect('L', 1.8, 0.3, 1.0, 4, 24, C.glass); s.faceRect('L', 1.8, 1.0, 1.7, 4, 24, C.glass);
  s.door('L', 1.8, 0.95, 1.05, 24, '#889');
  s.window('R', 1.8, 0.3, 0.9, 10, 24); s.window('R', 1.8, 1.1, 1.6, 10, 24);
  s.flat(0.1, 0.1, 1.9, 1.9, 31, C.roofGrey, '#444', 0.7);
  s.faceRect('L', 1.85, 0.3, 1.7, 26, 32, '#2e86c1'); s.text(...s.iso(1.0, 1.85, 27), 'RECEPTIE', 5.5, '#fff');
  s.flag(1.9, 0.1, 46, '#e8771e');
};
DRAW.slagboom = (s, v) => {
  const along = v === 1; // bar langs v-as
  const [px, py] = along ? s.iso(0.5, 0.08, 0) : s.iso(0.08, 0.5, 0);
  s.c.fillStyle = '#666'; s.c.fillRect(px - 3, py - 20, 6, 20);
  s.box(0.4, 0.4, 0.6, 0.6, 0, 1, '#777');
  const segs = 8;
  for (let i = 0; i < segs; i++) {
    const t0 = 0.08 + i * 0.84 / segs, t1 = t0 + 0.84 / segs;
    const a = along ? s.iso(0.5, t0, 15) : s.iso(t0, 0.5, 15), b = along ? s.iso(0.5, t1, 15) : s.iso(t1, 0.5, 15);
    s.line(a[0], a[1], b[0], b[1], i % 2 ? '#fff' : '#e03030', 3.5);
  }
};
DRAW.sanitairgebouw = s => {
  s.flat(0, 0, 3, 2, 0, '#c8c0b0');
  s.box(0.15, 0.15, 2.85, 1.85, 0, 26, '#dfe8ec');
  for (let i = 0; i < 5; i++) s.faceRect('L', 1.85, 0.3 + i * 0.5, 0.6 + i * 0.5, 17, 22, C.glass, '#fff');
  s.door('L', 1.85, 0.8, 1.05, 20, '#3a7bd5'); s.door('L', 1.85, 1.9, 2.15, 20, '#e8528f');
  s.faceRect('R', 2.85, 0.3, 1.7, 17, 22, C.glass, '#fff');
  s.flat(0.05, 0.05, 2.95, 1.95, 27, '#8a9199', '#6e747a', 0.7);
  s.cyl(2.6, 0.4, 0.12, 27, 36, '#aaa');
  s.text(...s.iso(1.0, 1.9, 21), 'SANITAIR', 5, '#2e5f8c');
  tap(s, 0.08, 1.92);
};
DRAW.toiletunit = s => {
  s.box(0.25, 0.25, 0.75, 0.75, 0, 26, '#2e86c1');
  s.door('L', 0.75, 0.35, 0.65, 22, '#1f5f8b'); s.faceRect('L', 0.75, 0.45, 0.55, 18, 20, '#fff');
  s.flat(0.2, 0.2, 0.8, 0.8, 27, '#e8e8e8', '#bbb', 0.5);
};
DRAW.restaurant = s => {
  s.flat(0, 0, 3, 3, 0, '#c8c0b0');
  s.flat(2.0, 0.1, 2.95, 2.9, 1, C.woodL, C.woodD, 0.5); // terras rechts
  s.box(0.15, 0.15, 2.0, 2.85, 0, 34, '#e8d9b5');
  s.faceRect('L', 2.85, 0.3, 1.0, 6, 28, C.glass); s.faceRect('L', 2.85, 1.1, 1.85, 6, 28, C.glass);
  s.door('R', 2.0, 1.3, 1.7, 26, '#5a3a1e');
  s.window('R', 2.0, 0.3, 1.0, 10, 26); s.window('R', 2.0, 2.0, 2.7, 10, 26);
  s.gableEnd(0.15, 0.15, 2.0, 2.85, 34, 52, false, '#e8d9b5');
  s.gable(0.0, 0.0, 2.15, 3.0, 32, 52, false, C.roofRed);
  // tafels met parasols
  for (const [u, v] of [[2.5, 0.6], [2.5, 1.5], [2.5, 2.4]]) { s.cyl(u, v, 0.14, 1, 9, '#ddd'); s.parasol(u, v, '#e74c3c'); }
  s.faceRect('L', 2.85, 0.4, 1.7, 29, 34, '#5a3a1e'); s.text(...s.iso(1.05, 2.85, 30), 'RESTAURANT', 4.6, '#f6d365');
};
ZONES.restaurant = [[2.1, 0.2, 2.9, 2.8]];
DRAW.snackbar = s => {
  s.flat(0, 0, 2, 1, 0, '#c8c0b0');
  s.box(0.2, 0.15, 1.8, 0.75, 0, 24, '#f6d365');
  s.faceRect('L', 0.75, 0.35, 1.65, 10, 20, '#2b2b2b');  // luik
  s.faceRect('L', 0.75, 0.4, 1.6, 12, 18, '#fff3c4');
  // luifel gestreept
  for (let i = 0; i < 7; i++) s.P([s.iso(0.2 + i * 0.2286, 0.75, 24), s.iso(0.2 + (i + 1) * 0.2286, 0.75, 24), s.iso(0.2 + (i + 1) * 0.2286, 1.0, 19), s.iso(0.2 + i * 0.2286, 1.0, 19)], i % 2 ? '#fff' : '#e74c3c');
  s.flat(0.15, 0.1, 1.85, 0.8, 25, '#8a9199', '#6e747a', 0.6);
  s.text(...s.iso(1.0, 0.75, 21), 'SNACK', 5, '#c0392b');
  s.cyl(1.9, 0.9, 0.08, 0, 14, '#c0392b');
};
DRAW.winkeltje = s => {
  s.flat(0, 0, 2, 2, 0, '#c8c0b0');
  s.box(0.2, 0.2, 1.8, 1.8, 0, 28, '#f0e2c8');
  s.faceRect('L', 1.8, 0.3, 1.0, 4, 20, C.glass); s.door('L', 1.8, 1.15, 1.55, 22, '#4f7f3a');
  for (let i = 0; i < 6; i++) s.P([s.iso(0.2 + i * 0.2667, 1.8, 22), s.iso(0.2 + (i + 1) * 0.2667, 1.8, 22), s.iso(0.2 + (i + 1) * 0.2667, 2.0, 18), s.iso(0.2 + i * 0.2667, 2.0, 18)], i % 2 ? '#fff' : '#27ae60');
  s.window('R', 1.8, 0.4, 1.0, 10, 22);
  s.flat(0.1, 0.1, 1.9, 1.9, 29, '#6e747a', '#555', 0.6);
  s.faceRect('L', 1.85, 0.3, 1.7, 23, 28, '#27ae60'); s.text(...s.iso(1.0, 1.85, 24), 'WINKEL', 5, '#fff');
  s.box(1.85, 1.3, 2.0, 1.7, 0, 6, C.wood); const [fx, fy] = s.iso(1.92, 1.5, 6); for (let i = 0; i < 4; i++) s.circ(fx - 3 + i * 2, fy - 1 + (i % 2), 1.5, i % 2 ? '#e74c3c' : '#f1c40f');
};
DRAW.wasserette = s => {
  s.box(0.15, 0.15, 0.85, 0.85, 0, 22, '#bcd4e6');
  s.door('L', 0.85, 0.25, 0.5, 18, '#5d7a94');
  const [wx, wy] = s.iso(0.85, 0.5, 12); s.circ(wx, wy, 5, '#fff', '#5d7a94', 1.2); s.circ(wx, wy, 3, C.glassD);
  s.flat(0.1, 0.1, 0.9, 0.9, 23, '#6e747a', '#555', 0.5);
};
// Padobjecten staan aan de rand van het pad. variant: 0 midden, 1 v0-rand, 2 v1-rand, 3 u0-rand, 4 u1-rand.
const EDGE = { 0: [0.5, 0.5], 1: [0.5, 0.18], 2: [0.5, 0.82], 3: [0.18, 0.5], 4: [0.82, 0.5] };
function edgeFrame(s, v) { const m = v === 3 || v === 4; if (m) s.mirror = !s.mirror; return EDGE[m ? v - 2 : v] || EDGE[0]; }
DRAW.prullenbak = (s, v) => { const [cu, cv] = edgeFrame(s, v); s.cyl(cu, cv + 0.03, 0.16, 0, 12, '#2f7d3a'); const [x, y] = s.iso(cu, cv + 0.03, 12); s.ell(x, y, 7.5, 3.8, '#1f5a27'); };
DRAW.bankje = (s, v) => {
  const [, cv0] = edgeFrame(s, v); const cv = v ? cv0 : 0.6;
  const back = (v === 2 || v === 4) ? 1 : -1; // rugleuning naar de buitenkant van het pad
  const s0 = back < 0 ? cv - 0.05 : cv - 0.2, s1 = back < 0 ? cv + 0.2 : cv + 0.05, b0 = back < 0 ? cv - 0.12 : cv + 0.05, b1 = back < 0 ? cv - 0.05 : cv + 0.12;
  s.box(0.2, s0, 0.8, s1, 0, 7, C.woodD);
  s.box(0.2, s0, 0.8, s1, 7, 10, C.wood);
  s.box(0.2, b0, 0.8, b1, 10, 20, C.wood);
};
DRAW.lantaarn = (s, v) => { const [cu, cv] = edgeFrame(s, v); const [x, y] = s.iso(cu, cv, 0); s.c.fillStyle = '#444'; s.c.fillRect(x - 1.5, y - 34, 3, 34); s.c.fillRect(x - 4, y - 36, 8, 2); s.P([[x - 4, y - 36], [x + 4, y - 36], [x + 3, y - 42], [x - 3, y - 42]], '#fff1b0', '#444'); };
DRAW.picknicktafel = s => {
  s.box(0.2, 0.2, 0.8, 0.35, 0, 8, C.wood); s.box(0.2, 0.65, 0.8, 0.8, 0, 8, C.wood);
  s.box(0.2, 0.4, 0.8, 0.6, 10, 14, C.woodL); s.lineIso(0.5, 0.5, 0, 0.5, 0.5, 10, C.woodD, 2);
};
DRAW.informatiebord = (s, v) => {
  const [, cv] = edgeFrame(s, v); const d = cv - 0.5;
  s.box(0.2, 0.45 + d, 0.8, 0.55 + d, 12, 32, C.woodD);
  s.faceRect('L', 0.55 + d, 0.25, 0.75, 14, 30, '#f8f3e0', '#5a3a1e');
  s.faceRect('L', 0.55 + d, 0.3, 0.5, 16, 22, '#7fbb5f'); s.faceRect('L', 0.55 + d, 0.5, 0.7, 20, 28, '#4f94cf'); s.faceRect('L', 0.55 + d, 0.3, 0.7, 23, 24, '#c9b99a');
  s.lineIso(0.3, 0.5 + d, 0, 0.3, 0.5 + d, 12, C.woodD, 2); s.lineIso(0.7, 0.5 + d, 0, 0.7, 0.5 + d, 12, C.woodD, 2);
};
DRAW.fietsverhuur = s => {
  s.box(0.1, 0.1, 0.5, 0.9, 0, 18, C.wood); s.flat(0.05, 0.05, 0.55, 0.95, 19, C.roofGrey);
  for (let i = 0; i < 3; i++) { const [x, y] = s.iso(0.72, 0.25 + i * 0.25, 0); s.circ(x - 4, y, 3.5, null, '#333', 1.2); s.circ(x + 4, y, 3.5, null, '#333', 1.2); s.line(x - 4, y, x + 1, y - 6, ['#e74c3c', '#3498db', '#27ae60'][i], 1.5); s.line(x + 1, y - 6, x + 4, y, ['#e74c3c', '#3498db', '#27ae60'][i], 1.5); s.line(x - 4, y, x + 2, y, ['#e74c3c', '#3498db', '#27ae60'][i], 1.5); }
  s.faceRect('L', 0.9, 0.15, 0.45, 12, 16, '#f6d365');
};
DRAW.parkeerplaats = (s, v) => {
  s.flat(0, 0, 2, 2, 0, C.asphalt, '#444', 0.6);
  for (let i = 1; i < 4; i++) s.lineIso(0.1, i * 0.5, 0.3, 1.0, i * 0.5, 0.3, '#ddd', 1);
  for (let i = 1; i < 4; i++) s.lineIso(1.0, i * 0.5, 0.3, 1.9, i * 0.5, 0.3, '#ddd', 1);
  s.car(0.2, 0.15, 0.9, 0.45, C.cars[v % C.cars.length]); s.car(1.1, 1.1, 1.8, 1.4, C.cars[(v + 3) % C.cars.length]);
};

// --- recreatie ---
DRAW.speeltuin = s => {
  s.flat(0, 0, 2, 2, 0, C.sand, '#c9b872', 0.8);
  // glijbaan
  s.box(0.3, 0.3, 0.6, 0.6, 0, 20, '#e74c3c');
  s.P([s.iso(0.6, 0.3, 20), s.iso(0.6, 0.6, 20), s.iso(1.5, 0.6, 2), s.iso(1.5, 0.3, 2)], '#f1c40f', '#c9a227', 0.6);
  for (let i = 0; i < 4; i++) s.lineIso(0.3, 0.6, 4 + i * 5, 0.3, 0.3, 4 + i * 5, '#ccc', 1);
  // schommel
  s.lineIso(0.4, 1.3, 0, 0.5, 1.5, 26, '#3498db', 2); s.lineIso(0.6, 1.7, 0, 0.5, 1.5, 26, '#3498db', 2);
  s.lineIso(1.4, 1.3, 0, 1.5, 1.5, 26, '#3498db', 2); s.lineIso(1.6, 1.7, 0, 1.5, 1.5, 26, '#3498db', 2);
  s.lineIso(0.5, 1.5, 26, 1.5, 1.5, 26, '#3498db', 2.5);
  for (const u of [0.8, 1.2]) { s.lineIso(u, 1.5, 26, u, 1.5, 8, '#888', 1); s.box(u - 0.08, 1.45, u + 0.08, 1.55, 7, 9, '#e67e22'); }
  // klimrek
  s.box(1.5, 0.9, 1.9, 1.3, 0, 1, '#27ae60'); s.lineIso(1.5, 0.9, 0, 1.5, 0.9, 18, '#27ae60', 1.5); s.lineIso(1.9, 0.9, 0, 1.9, 0.9, 18, '#27ae60', 1.5); s.lineIso(1.5, 1.3, 0, 1.5, 1.3, 18, '#27ae60', 1.5); s.lineIso(1.9, 1.3, 0, 1.9, 1.3, 18, '#27ae60', 1.5);
  s.flat(1.5, 0.9, 1.9, 1.3, 18, null, '#27ae60', 1.5);
};
ZONES.speeltuin = [[0.7, 0.7, 1.4, 1.3], [0.2, 0.8, 0.6, 1.2], [1.0, 0.2, 1.4, 0.5]];
DRAW.zwembad = s => {
  s.flat(0, 0, 3, 3, 0, '#d9d4c7', '#b5b0a3', 0.8);
  s.flat(0.35, 0.35, 2.65, 2.65, 1, '#8fb9c9');
  s.flat(0.4, 0.4, 2.6, 2.6, 1, '#3aa0d8');
  s.c.setLineDash([4, 6]); for (let i = 1; i < 4; i++) s.lineIso(0.4 + i * 0.55, 0.45, 1, 0.4 + i * 0.55, 2.55, 1, 'rgba(255,255,255,0.6)', 1); s.c.setLineDash([]);
  for (let i = 0; i < 12; i++) { const [x, y] = s.iso(0.5 + Util.hash2(i, 21) * 2, 0.5 + Util.hash2(i, 22) * 2, 1); s.line(x - 3, y, x + 3, y, 'rgba(255,255,255,0.5)', 1); }
  // trap
  s.lineIso(2.6, 1.3, 1, 2.6, 1.3, 10, '#ddd', 1.5); s.lineIso(2.6, 1.55, 1, 2.6, 1.55, 10, '#ddd', 1.5); s.lineIso(2.6, 1.3, 10, 2.85, 1.3, 10, '#ddd', 1.5); s.lineIso(2.6, 1.55, 10, 2.85, 1.55, 10, '#ddd', 1.5);
  // ligstoelen
  for (const v of [0.6, 1.6]) { s.box(0.05, v, 0.3, v + 0.55, 0, 4, '#fff', { top: '#3498db' }); }
  s.parasol(0.18, 1.3, '#f1c40f');
};
ZONES.zwembad = [[0.6, 0.6, 2.4, 2.4]];
DRAW.trampoline = s => {
  const [x, y] = s.iso(0.5, 0.5, 0);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; s.line(x + Math.cos(a) * 20, y + Math.sin(a) * 10, x + Math.cos(a) * 20, y + Math.sin(a) * 10 - 10, '#888', 1.5); }
  s.ell(x, y - 10, 22, 11, '#3498db'); s.ell(x, y - 10, 16, 8, '#222');
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; s.line(x + Math.cos(a) * 20, y + Math.sin(a) * 10 - 10, x + Math.cos(a) * 20, y + Math.sin(a) * 10 - 34, '#bbb', 1); }
  s.ell(x, y - 34, 20, 10, null, '#bbb', 1);
};
ZONES.trampoline = [[0.35, 0.35, 0.65, 0.65]];
DRAW.midgetgolf = s => {
  s.flat(0, 0, 2, 2, 0, grassCol(true));
  const lanes = [[0.15, 0.15, 0.6, 1.85], [0.8, 0.15, 1.25, 1.0], [0.8, 1.15, 1.85, 1.6], [1.4, 0.15, 1.85, 1.0]];
  for (const l of lanes) { s.flat(l[0], l[1], l[2], l[3], 2, '#2ecc71', '#777', 1.2); }
  for (const [u, v] of [[0.37, 1.7], [1.0, 0.85], [1.7, 1.4]]) { const [x, y] = s.iso(u, v, 2); s.circ(x, y, 1.8, '#222'); s.line(x, y, x, y - 10, '#eee', 1); s.P([[x, y - 10], [x + 5, y - 8], [x, y - 6]], '#e74c3c'); }
  // molentje
  const [mx, my] = s.iso(1.62, 0.3, 2); s.P([[mx - 5, my], [mx + 5, my], [mx + 3, my - 14], [mx - 3, my - 14]], '#8a6a4a'); s.P([[mx - 4, my - 14], [mx + 4, my - 14], [mx, my - 19]], '#c0392b');
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; s.line(mx, my - 15, mx + Math.cos(a) * 9, my - 15 + Math.sin(a) * 9, '#eee', 1.5); }
};
ZONES.midgetgolf = [[0.2, 0.2, 0.55, 1.8], [0.85, 0.2, 1.2, 0.95], [0.85, 1.2, 1.8, 1.55]];
DRAW.volleybalveld = s => {
  s.flat(0, 0, 2, 2, 0, C.sand, '#c9b872', 0.8);
  s.flat(0.15, 0.15, 1.85, 1.85, 0.5, null, '#fff', 1.2);
  s.lineIso(0.15, 1.0, 0.5, 1.85, 1.0, 0.5, '#fff', 1);
  s.lineIso(0.1, 1.0, 0, 0.1, 1.0, 22, '#555', 2); s.lineIso(1.9, 1.0, 0, 1.9, 1.0, 22, '#555', 2);
  s.P([s.iso(0.1, 1.0, 22), s.iso(1.9, 1.0, 22), s.iso(1.9, 1.0, 12), s.iso(0.1, 1.0, 12)], 'rgba(255,255,255,0.45)', '#eee', 0.8);
  const [bx, by] = s.iso(0.6, 0.5, 3); s.circ(bx, by, 2.5, '#fff', '#c0392b', 0.8);
};
ZONES.volleybalveld = [[0.3, 0.2, 1.7, 0.8], [0.3, 1.2, 1.7, 1.8]];
DRAW.jeudeboules = s => {
  s.flat(0, 0, 2, 1, 0, grassCol(true));
  s.box(0.1, 0.15, 1.9, 0.85, 0, 3, C.woodD, { top: '#cdbf9f' });
  for (let i = 0; i < 5; i++) { const [x, y] = s.iso(0.4 + Util.hash2(i, 31) * 1.2, 0.3 + Util.hash2(i, 32) * 0.4, 3); s.circ(x, y, 2.2, '#9aa3ad', '#555', 0.6); }
  const [cx, cy] = s.iso(1.5, 0.5, 3); s.circ(cx, cy, 1, '#e74c3c');
};
ZONES.jeudeboules = [[0.15, 0.2, 0.5, 0.8]];
DRAW.kampvuurplaats = (s, v) => {
  const [x, y] = s.iso(0.5, 0.5, 0);
  s.ell(x, y, 16, 8, '#8a7a6a');
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; s.circ(x + Math.cos(a) * 15, y + Math.sin(a) * 7.5 - 1, 2.6, i % 2 ? '#777' : '#999'); }
  s.line(x - 7, y - 1, x + 7, y - 4, '#5a3a1e', 3); s.line(x - 6, y - 5, x + 6, y, '#6b4a2b', 3);
  if (v === 1) { s.P([[x - 6, y - 3], [x + 6, y - 3], [x + 2, y - 14], [x, y - 20], [x - 3, y - 12]], '#f39c12'); s.P([[x - 3, y - 3], [x + 3, y - 3], [x + 1, y - 10], [x - 1, y - 13]], '#f7dc6f'); }
  else { for (let i = 0; i < 3; i++) s.circ(x - 4 + i * 4, y - 5, 1.5, '#333'); }
};
ZONES.kampvuurplaats = [[-0.6, -0.6, 1.6, 1.6]];
DRAW.recreatiezaal = s => {
  s.flat(0, 0, 2, 2, 0, '#c8c0b0');
  s.box(0.15, 0.15, 1.85, 1.85, 0, 30, '#d6b98c');
  s.door('L', 1.85, 0.7, 1.3, 24, '#6b4a2b'); s.lineIso(1.0, 1.85, 0, 1.0, 1.85, 24, '#4a3219', 1);
  s.window('L', 1.85, 0.3, 0.55, 12, 24); s.window('L', 1.85, 1.45, 1.7, 12, 24);
  s.window('R', 1.85, 0.3, 0.8, 12, 24); s.window('R', 1.85, 1.1, 1.6, 12, 24);
  s.gableEnd(0.15, 0.15, 1.85, 1.85, 30, 46, false, '#d6b98c');
  s.gable(0.05, 0.05, 1.95, 1.95, 29, 46, false, C.roofGrey);
  s.bunting(0.1, 1.95, 1.95, 1.95, 30); s.bunting(1.95, 0.1, 1.95, 1.95, 30);
};
DRAW.dierenweide = s => {
  s.flat(0, 0, 3, 2, 0, grassCol(true));
  s.fence(0.1, 0.1, 2.9, 1.9, true);
  s.box(2.2, 0.2, 2.9, 0.8, 0, 12, C.wood); s.P([s.iso(2.15, 0.15, 12), s.iso(2.95, 0.15, 12), s.iso(2.95, 0.85, 16), s.iso(2.15, 0.85, 16)], C.roofGrey);
  s.cyl(0.5, 0.5, 0.18, 0, 9, '#d9b25a');
  const [tx, ty] = s.iso(1.3, 1.3, 0); s.ell(tx, ty, 9, 4.5, '#5a6a7a'); s.ell(tx, ty - 1, 7, 3.3, '#4f94cf');
  Sprites.drawAnimal(s.c, ...s.iso(1.0, 0.7, 0), 'geit', 1, 0);
  Sprites.drawAnimal(s.c, ...s.iso(2.0, 1.4, 0), 'schaap', -1, 0);
  Sprites.drawAnimal(s.c, ...s.iso(0.8, 1.6, 0), 'kip', 1, 0);
  Sprites.drawAnimal(s.c, ...s.iso(1.8, 0.5, 0), 'kip', -1, 0);
  s.fence(0.1, 0.1, 2.9, 1.9, false);
};
ZONES.dierenweide = [[-0.5, 2.0, 3.5, 2.5], [3.0, -0.5, 3.5, 2.5]];
DRAW.skelterverhuur = s => {
  s.box(0.1, 0.1, 0.8, 0.9, 0, 18, C.wood); s.flat(0.05, 0.05, 0.85, 0.95, 19, C.roofGreen);
  s.faceRect('L', 0.9, 0.15, 0.75, 12, 16, '#f6d365');
  for (let i = 0; i < 2; i++) {
    const u0 = 1.0 + i * 0.5, col = ['#e74c3c', '#3498db'][i];
    s.box(u0, 0.3, u0 + 0.4, 0.7, 3, 8, col);
    for (const [u, v] of [[u0 + 0.05, 0.7], [u0 + 0.35, 0.7], [u0 + 0.4, 0.35]]) { const [x, y] = s.iso(u, v, 1); s.circ(x, y, 2.8, '#222'); }
    s.box(u0 + 0.05, 0.35, u0 + 0.2, 0.6, 8, 13, Util.shade(col, -0.2));
  }
};
DRAW.tafeltennis = s => {
  s.box(0.2, 0.35, 0.8, 0.65, 0, 2, '#777');
  s.box(0.15, 0.3, 0.85, 0.7, 10, 13, '#1e8449', { top: '#27ae60' });
  s.lineIso(0.15, 0.5, 13, 0.85, 0.5, 13, '#fff', 0.7);
  s.P([s.iso(0.5, 0.3, 13), s.iso(0.5, 0.7, 13), s.iso(0.5, 0.7, 17), s.iso(0.5, 0.3, 17)], 'rgba(255,255,255,0.6)', '#ccc', 0.6);
};
ZONES.tafeltennis = [[-0.4, 0.2, 0.05, 0.8], [0.95, 0.2, 1.4, 0.8]];

// --- extra eetgelegenheden ---
DRAW.pizzeria = s => {
  s.flat(0, 0, 3, 2, 0, '#c8c0b0');
  s.box(0.15, 0.15, 2.85, 1.85, 0, 28, '#f3e2c0');
  s.window('L', 1.85, 0.3, 1.0, 8, 22); s.door('L', 1.85, 1.3, 1.65, 22, '#8a3a2a'); s.window('L', 1.85, 1.9, 2.6, 8, 22);
  s.window('R', 2.85, 0.4, 1.4, 8, 22);
  for (let i = 0; i < 9; i++) s.P([s.iso(0.15 + i * 0.3, 1.85, 24), s.iso(0.15 + (i + 1) * 0.3, 1.85, 24), s.iso(0.15 + (i + 1) * 0.3, 2.05, 19), s.iso(0.15 + i * 0.3, 2.05, 19)], i % 2 ? '#fff' : '#c0392b');
  s.flat(0.05, 0.05, 2.95, 1.95, 29, '#b5542f', '#8a3a2a', 0.7);
  const [px, py] = s.iso(1.5, 0.5, 29); s.circ(px, py - 8, 9, '#f6d365', '#c0392b', 2); s.circ(px - 3, py - 10, 1.8, '#c0392b'); s.circ(px + 3, py - 7, 1.8, '#c0392b'); s.circ(px + 1, py - 12, 1.5, '#c0392b');
  s.faceRect('L', 1.9, 0.3, 2.7, 25, 30, '#2e7d32'); s.text(...s.iso(1.5, 1.9, 26), 'PIZZERIA', 5, '#fff');
};
DRAW.bakker = s => {
  s.flat(0, 0, 2, 1, 0, '#c8c0b0');
  s.box(0.15, 0.15, 1.85, 0.85, 0, 24, '#e8c9a0');
  s.faceRect('L', 0.85, 0.3, 1.1, 6, 18, C.glass, '#fff'); s.door('L', 0.85, 1.3, 1.65, 20, '#6b4a2b');
  for (let i = 0; i < 6; i++) s.P([s.iso(0.15 + i * 0.2833, 0.85, 21), s.iso(0.15 + (i + 1) * 0.2833, 0.85, 21), s.iso(0.15 + (i + 1) * 0.2833, 1.05, 16), s.iso(0.15 + i * 0.2833, 1.05, 16)], i % 2 ? '#f6e7c1' : '#8a5a2b');
  s.flat(0.05, 0.05, 1.95, 0.95, 25, '#7d5a3a', '#5a3a1e', 0.6);
  s.faceRect('L', 0.9, 0.3, 1.7, 25, 30, '#5a3a1e'); s.text(...s.iso(1.0, 0.9, 26), 'BAKKER', 5, '#f6d365');
  const [bx, by] = s.iso(0.5, 0.9, 32); s.ell(bx, by, 5, 3, '#d9a060', '#8a5a2b', 0.8);
};
DRAW.ijssalon = s => {
  s.cyl(0.5, 0.5, 0.36, 0, 18, '#f7c6d9');
  const [x, y] = s.iso(0.5, 0.5, 18);
  s.ell(x, y, 19, 9.5, '#e8528f'); s.ell(x, y - 2, 14, 7, '#fff');
  s.P([[x - 4, y - 4], [x + 4, y - 4], [x, y - 16]], '#d9a060'); s.circ(x, y - 15, 4, '#f7c6d9'); s.circ(x - 2.5, y - 19, 3.5, '#fff'); s.circ(x + 2.5, y - 18, 3.2, '#8d5a3a');
  s.text(x, y + 10, 'IJS', 5, '#8a2a5a');
};
// --- binnenvoorzieningen ---
DRAW.binnenzwembad = s => {
  s.flat(0, 0, 3, 3, 0, '#c8c0b0');
  s.box(0.15, 0.15, 2.85, 2.85, 0, 34, '#cfe7f2');
  s.faceRect('L', 2.85, 0.3, 2.7, 6, 26, '#3aa0d8', '#fff'); s.faceRect('R', 2.85, 0.3, 2.7, 6, 26, '#2f8fc4', '#fff');
  for (let i = 1; i < 5; i++) { s.lineIso(0.3 + i * 0.48, 2.85, 6, 0.3 + i * 0.48, 2.85, 26, '#fff', 0.8); s.lineIso(2.85, 0.3 + i * 0.48, 6, 2.85, 0.3 + i * 0.48, 26, '#fff', 0.8); }
  s.door('L', 2.85, 1.3, 1.7, 24, '#2e6f9a');
  s.gableEnd(0.15, 0.15, 2.85, 2.85, 34, 50, true, '#cfe7f2');
  s.gable(0.05, 0.05, 2.95, 2.95, 33, 50, true, '#8a9199');
  s.P([s.iso(0.4, 2.3, 38), s.iso(2.6, 2.3, 38), s.iso(2.6, 1.7, 47), s.iso(0.4, 1.7, 47)], 'rgba(159,211,238,0.9)', '#6e747a', 0.6);
  s.faceRect('L', 2.9, 0.4, 2.6, 27, 33, '#2e86c1'); s.text(...s.iso(1.5, 2.9, 28.5), 'ZWEMPARADIJS', 4.6, '#fff');
};
DRAW.binnenspeeltuin = s => {
  s.flat(0, 0, 2, 2, 0, '#c8c0b0');
  s.box(0.15, 0.15, 1.85, 1.85, 0, 30, '#f6d365');
  s.faceRect('L', 1.85, 0.3, 1.0, 6, 24, C.glass, '#fff'); s.door('L', 1.85, 1.2, 1.6, 24, '#e74c3c');
  const [wx, wy] = s.iso(0.65, 1.85, 6); s.P([[wx - 6, wy - 2], [wx + 6, wy - 8], [wx + 6, wy - 12], [wx - 6, wy - 6]], '#e74c3c'); s.circ(wx - 2, wy - 14, 2.5, '#3498db'); s.circ(wx + 3, wy - 16, 2, '#2ecc71');
  s.window('R', 1.85, 0.3, 0.9, 8, 22); s.window('R', 1.85, 1.1, 1.6, 8, 22);
  s.flat(0.05, 0.05, 1.95, 1.95, 31, '#c0392b', '#8a2a1a', 0.6);
  s.bunting(0.1, 1.95, 1.95, 1.95, 31);
  s.faceRect('L', 1.9, 0.3, 1.7, 25, 30, '#3498db'); s.text(...s.iso(1.0, 1.9, 26), 'SPEELPARADIJS', 4.2, '#fff');
};
DRAW.bowlingbaan = s => {
  s.flat(0, 0, 3, 2, 0, '#c8c0b0');
  s.box(0.15, 0.15, 2.85, 1.85, 0, 30, '#3b3b55');
  s.door('L', 1.85, 1.3, 1.7, 24, '#e74c3c'); s.faceRect('L', 1.85, 0.3, 1.1, 14, 22, '#f1c40f', '#fff');
  s.faceRect('R', 2.85, 0.4, 1.4, 14, 22, '#9b59b6', '#fff');
  s.flat(0.05, 0.05, 2.95, 1.95, 31, '#2b2b40', '#1b1b2a', 0.6);
  s.faceRect('L', 1.9, 0.3, 2.7, 25, 31, '#111'); s.text(...s.iso(1.9, 1.9, 26), 'BOWLING', 5, '#ff5fa2');
  for (let i = 0; i < 3; i++) { const [kx, ky] = s.iso(0.55 + i * 0.22, 1.92, 27); s.ell(kx, ky - 1, 2.2, 3, '#fff'); s.circ(kx, ky - 4.5, 1.6, '#fff'); s.c.fillStyle = '#e74c3c'; s.c.fillRect(kx - 2, ky - 2.5, 4, 1); }
};
DRAW.fitness = s => {
  s.flat(0, 0, 2, 2, 0, '#c8c0b0');
  s.box(0.15, 0.15, 1.85, 1.85, 0, 30, '#dfe4ea');
  s.faceRect('L', 1.85, 0.3, 1.1, 6, 24, C.glass, '#fff'); s.door('L', 1.85, 1.3, 1.65, 24, '#2c3e50');
  s.faceRect('R', 1.85, 0.3, 1.6, 6, 24, C.glass, '#fff');
  s.flat(0.05, 0.05, 1.95, 1.95, 31, '#6e747a', '#555', 0.6);
  s.faceRect('L', 1.9, 0.3, 1.7, 25, 31, '#2c3e50'); s.text(...s.iso(1.0, 1.9, 26), 'FITNESS', 5, '#2ecc71');
  const [dx, dy] = s.iso(0.5, 1.92, 34); s.line(dx - 6, dy, dx + 6, dy, '#2ecc71', 2); s.c.fillStyle = '#2ecc71'; s.c.fillRect(dx - 8, dy - 3, 3, 6); s.c.fillRect(dx + 5, dy - 3, 3, 6);
};
DRAW.bioscoop = s => {
  s.flat(0, 0, 2, 2, 0, '#c8c0b0');
  s.box(0.15, 0.15, 1.85, 1.85, 0, 34, '#6b2f3a');
  s.door('L', 1.85, 0.8, 1.2, 24, '#2b2b2b'); s.faceRect('L', 1.85, 0.85, 1.15, 10, 22, '#f6d365');
  for (let i = 0; i < 2; i++) s.faceRect('L', 1.85, 0.3 + i * 1.1, 0.6 + i * 1.1, 8, 20, ['#3498db', '#e67e22'][i], '#fff');
  s.flat(0.05, 0.05, 1.95, 1.95, 35, '#4a1f28', '#2b0f15', 0.6);
  s.P([s.iso(0.1, 1.85, 26), s.iso(1.9, 1.85, 26), s.iso(1.9, 2.1, 21), s.iso(0.1, 2.1, 21)], '#f6d365', '#c9a227', 0.8);
  s.faceRect('L', 1.9, 0.2, 1.8, 27, 34, '#fff'); s.text(...s.iso(1.0, 1.9, 28.5), 'CINEMA', 5.5, '#c0392b');
  const [fx, fy] = s.iso(1.0, 0.3, 35); s.circ(fx, fy - 6, 6, '#2b2b2b'); s.circ(fx, fy - 6, 2, '#6b2f3a'); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; s.circ(fx + Math.cos(a) * 3.5, fy - 6 + Math.sin(a) * 3.5, 1, '#6b2f3a'); }
};
// --- afval en camperservice ---
DRAW.afvalstation = s => {
  s.flat(0.05, 0.05, 1.95, 0.95, 0, '#9a9a96', '#777', 0.6);
  const cols = ['#2f7d3a', '#2e86c1', '#555'];
  for (let i = 0; i < 3; i++) { const u0 = 0.15 + i * 0.58; s.box(u0, 0.2, u0 + 0.45, 0.8, 0, 16, cols[i]); const [lx, ly] = s.iso(u0 + 0.225, 0.5, 16); s.ell(lx, ly, 9, 4.5, Util.shade(cols[i], -0.3)); s.circ(lx, ly, 2.5, '#222'); }
  s.lineIso(1.9, 0.9, 0, 1.9, 0.9, 20, '#555', 1.5); s.faceRect('L', 0.9, 1.75, 2.05, 14, 20, '#f6e7c1', '#555'); s.text(...s.iso(1.9, 0.9, 15.5), 'AFVAL', 3.5, '#333');
};
DRAW.camperservice = s => {
  s.flat(0.05, 0.05, 0.95, 0.95, 0, '#9a9a96', '#777', 0.6);
  s.flat(0.3, 0.3, 0.7, 0.7, 0.5, '#444'); for (let i = 1; i < 4; i++) s.lineIso(0.3 + i * 0.1, 0.3, 0.6, 0.3 + i * 0.1, 0.7, 0.6, '#777', 0.6);
  tap(s, 0.2, 0.8);
  s.lineIso(0.85, 0.15, 0, 0.85, 0.15, 22, '#555', 1.5); s.faceRect('L', 0.15, 0.6, 1.1, 14, 24, '#2e86c1', '#fff');
  const [cx, cy] = s.iso(0.85, 0.15, 19); s.c.fillStyle = '#fff'; s.c.fillRect(cx - 6, cy - 2, 12, 5); s.c.fillRect(cx + 2, cy - 5, 4, 3); s.circ(cx - 3, cy + 3, 1.5, '#fff'); s.circ(cx + 3, cy + 3, 1.5, '#fff');
};

// --- Voertuigen op staplekken (zelfde footprint als de plek) ---
const VEH = {
  tent(s, w, h, col) {
    const cu = w / 2, cv = h / 2;
    if (w >= 3) s.car(0.3, 0.25, 1.1, 0.65, C.cars[(C.tents.indexOf(col) + 2) % C.cars.length]);
    s.shadow(cu, cv, 24, 12, 0.18);
    s.tentShape(cu - 0.55, cv - 0.42, cu + 0.55, cv + 0.42, 22, col);
    if (w < 3) { const [x, y] = s.iso(cu + 0.7, cv + 0.6, 0); s.circ(x - 4, y, 3, null, '#333', 1); s.circ(x + 3, y, 3, null, '#333', 1); s.line(x - 4, y, x, y - 5, '#555', 1.2); s.line(x, y - 5, x + 3, y, '#555', 1.2); }
  },
  caravan(s, w, h, col) {
    const cu = w / 2, cv = h / 2;
    s.car(cu - 0.6, cv - 0.65, cu + 0.2, cv - 0.25, C.cars[(C.tents.indexOf(col) + 1) % C.cars.length]);
    s.caravan(cu - 0.75, cv + 0.05, cu + 0.55, cv + 0.6, '#f5f5f0', col);
    // luifel + stoeltjes
    s.P([s.iso(cu - 0.7, cv + 0.6, 24), s.iso(cu + 0.4, cv + 0.6, 24), s.iso(cu + 0.4, cv + 0.95, 16), s.iso(cu - 0.7, cv + 0.95, 16)], 'rgba(255,255,255,0.85)', '#aaa', 0.5);
    s.lineIso(cu - 0.65, cv + 0.95, 0, cu - 0.65, cv + 0.95, 16, '#999', 1); s.lineIso(cu + 0.35, cv + 0.95, 0, cu + 0.35, cv + 0.95, 16, '#999', 1);
  },
  camper(s, w, h, col) {
    const cu = w / 2, cv = h / 2;
    s.camper(cu - 0.8, cv - 0.1, cu + 0.7, cv + 0.5, '#f0ede4');
    s.box(cu - 0.3, cv + 0.6, cu - 0.1, cv + 0.8, 0, 6, col); s.box(cu + 0.1, cv + 0.6, cu + 0.3, cv + 0.8, 0, 6, col);
  },
};

// ---------------------------------------------------------------------------
// Sprite-cache en grondtegels
// ---------------------------------------------------------------------------
const Sprites = {
  cache: new Map(),
  season: 'lente',
  make(w, h, sh, fn, variant, mirror) {
    const ph = mirror ? w : h;
    const SW = (w + h) * 32 + 16, SH = (w + h) * 16 + sh + 12;
    const cv = document.createElement('canvas'); cv.width = SW * 2; cv.height = SH * 2;
    const c = cv.getContext('2d'); c.scale(2, 2);
    const s = new S(c, w, h, ph * 32 + 8, sh + 6, mirror);
    fn(s, variant || 0);
    return { cv, ox: s.ox, oy: s.oy, w: SW, h: SH };
  },
  get(id, variant, mirror) {
    const def = DATA.items[id]; variant = variant || 0;
    const key = id + '|' + variant + (mirror ? '|m' : '') + (def.seasonal ? '|' + this.season : '');
    let sp = this.cache.get(key);
    if (!sp) { sp = this.make(def.w, def.h, def.sh || 48, (s, v) => DRAW[id](s, v), variant, mirror); this.cache.set(key, sp); }
    return sp;
  },
  vehicle(kind, w, h, colIdx, mirror) {
    const key = 'veh|' + kind + '|' + w + 'x' + h + '|' + colIdx + (mirror ? '|m' : '');
    let sp = this.cache.get(key);
    if (!sp) { sp = this.make(w, h, 44, s => VEH[kind](s, w, h, C.tents[colIdx % C.tents.length]), 0, mirror); this.cache.set(key, sp); }
    return sp;
  },
  clearSeasonal() { for (const k of [...this.cache.keys()]) if (k.includes('|lente') || k.includes('|zomer') || k.includes('|herfst') || k.includes('|winter')) this.cache.delete(k); },

  // ---- grondtegels (64x32, op 2x) ----
  groundCache: new Map(),
  ground(kind, variant) {
    const key = kind + variant;
    let cv = this.groundCache.get(key);
    if (cv) return cv;
    cv = document.createElement('canvas'); cv.width = 132; cv.height = 68;
    const c = cv.getContext('2d'); c.scale(2, 2); c.translate(1, 1);
    const dia = (exp) => { c.beginPath(); c.moveTo(32, -exp); c.lineTo(64 + exp * 2, 16); c.lineTo(32, 32 + exp); c.lineTo(-exp * 2, 16); c.closePath(); };
    const rnd = Util.rng(variant * 977 + kind.length * 31 + 7);
    const inDia = (x, y) => Math.abs(x - 32) / 32 + Math.abs(y - 16) / 16 < 0.85;
    const dots = (n, cols, w, h) => { for (let i = 0; i < n; i++) { const x = rnd() * 64, y = rnd() * 32; if (!inDia(x, y)) continue; c.fillStyle = cols[i % cols.length]; c.fillRect(x, y, w, h); } };
    switch (kind) {
      case 'gras': { const base = ['#6aa84f', '#6daf52', '#66a34b', '#70b256'][variant % 4]; dia(0.7); c.fillStyle = base; c.fill(); dots(10, [Util.shade(base, -0.12), Util.shade(base, 0.12)], 1.5, 3); break; }
      case 'herfst': { const base = ['#8aa550', '#90ab55', '#86a04c', '#95b05a'][variant % 4]; dia(0.7); c.fillStyle = base; c.fill(); dots(9, [Util.shade(base, -0.12), '#c9a23a'], 1.5, 3); break; }
      case 'sneeuw': { dia(0.7); c.fillStyle = variant % 2 ? '#eef2f6' : '#e9eef3'; c.fill(); dots(6, ['#dbe3ea', '#ffffff'], 2, 1.5); break; }
      case 'zand': { dia(0.7); c.fillStyle = variant % 2 ? '#e6d7a3' : '#e2d29c'; c.fill(); dots(8, ['#d6c48c', '#f0e4b8'], 1.5, 1.5); break; }
      case 'water': {
        dia(0.7); c.fillStyle = '#4f94cf'; c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 1;
        for (let i = 0; i < 3; i++) { const x = 12 + i * 16 + (variant * 5) % 10, y = 9 + ((i * 7 + variant * 4) % 14); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 4, y - 2, x + 8, y); c.stroke(); }
        break;
      }
      case 'grind': { dia(0.7); c.fillStyle = '#cfc2a3'; c.fill(); dots(26, ['#b8aa88', '#e0d5b8', '#c4b593'], 1.5, 1.5); break; }
      case 'tegel': { dia(0.7); c.fillStyle = '#b4b4b0'; c.fill(); c.strokeStyle = '#9a9a96'; c.lineWidth = 1; c.beginPath(); c.moveTo(16, 8); c.lineTo(48, 24); c.moveTo(48, 8); c.lineTo(16, 24); c.stroke(); dots(6, ['#c2c2be', '#a8a8a4'], 2, 1); break; }
      case 'asfalt': { dia(0.7); c.fillStyle = C.asphalt; c.fill(); dots(10, ['#666', '#555'], 1.5, 1.5); break; }
      case 'unowned': { dia(0.7); c.fillStyle = 'rgba(10,22,10,0.42)'; c.fill(); break; }
    }
    this.groundCache.set(key, cv);
    return cv;
  },

  // ---- personen (direct op de wereld-context) ----
  drawPerson(c, x, y, p, t) {
    const k = p.kid ? 0.7 : 1, H = 22 * k, dir = p.dir || 1;
    const walk = p.walking ? Math.sin(t * 14 + (p.phase || 0)) : 0;
    const bob = p.walking ? Math.abs(walk) * 1.2 : 0;
    if (p.swim) {
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(x, y, 7, 3, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = p.shirt; c.fillRect(x - 3.5 * k, y - 5 * k, 7 * k, 4 * k);
      c.fillStyle = p.skin; c.beginPath(); c.arc(x, y - 8 * k, 3.5 * k, 0, Math.PI * 2); c.fill();
      c.fillStyle = p.hair; c.beginPath(); c.arc(x, y - 9.5 * k, 3.4 * k, Math.PI, Math.PI * 2); c.fill();
      return;
    }
    const by = p.bounce ? y - Math.abs(Math.sin(t * 6 + (p.phase || 0))) * 14 : y;
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(x, y + 1, 5 * k, 2.2 * k, 0, 0, Math.PI * 2); c.fill();
    const legH = p.sitting ? 4 * k : 7 * k, yb = by - bob;
    // benen
    c.fillStyle = p.pants || '#3b4a6b';
    if (p.walking) { c.fillRect(x - 3 * k + walk * 1.5, yb - legH, 2.5 * k, legH); c.fillRect(x + 0.5 * k - walk * 1.5, yb - legH, 2.5 * k, legH); }
    else { c.fillRect(x - 3 * k, yb - legH, 2.5 * k, legH); c.fillRect(x + 0.5 * k, yb - legH, 2.5 * k, legH); }
    // lijf
    const bodyH = 8 * k, bodyY = yb - legH - bodyH;
    c.fillStyle = p.shirt;
    if (p.dress) { c.beginPath(); c.moveTo(x - 3 * k, bodyY); c.lineTo(x + 3 * k, bodyY); c.lineTo(x + 4.5 * k, bodyY + bodyH + 2 * k); c.lineTo(x - 4.5 * k, bodyY + bodyH + 2 * k); c.fill(); }
    else c.fillRect(x - 3.5 * k, bodyY, 7 * k, bodyH);
    if (p.vest) { c.fillStyle = p.vest; c.fillRect(x - 3.5 * k, bodyY, 7 * k, bodyH * 0.5); }
    // armen
    c.fillStyle = p.skin;
    if (p.armsUp) { c.fillRect(x - 5.5 * k, bodyY - 5 * k, 2 * k, 7 * k); c.fillRect(x + 3.5 * k, bodyY - 5 * k, 2 * k, 7 * k); }
    else { c.fillRect(x - 5.3 * k, bodyY + 1, 2 * k, 6 * k); c.fillRect(x + 3.3 * k, bodyY + 1, 2 * k, 6 * k); }
    // hoofd
    const hy = bodyY - 4 * k;
    c.beginPath(); c.arc(x, hy, 4 * k, 0, Math.PI * 2); c.fill();
    c.fillStyle = p.hair; c.beginPath(); c.arc(x, hy - 1 * k, 4 * k, Math.PI, Math.PI * 2); c.fill();
    if (p.longHair) c.fillRect(x - 4 * k, hy - 1 * k, 1.8 * k, 6 * k);
    if (p.hat) { c.fillStyle = p.hat; c.fillRect(x - 5 * k, hy - 3.5 * k, 10 * k, 1.6 * k); c.fillRect(x - 3.5 * k, hy - 7 * k, 7 * k, 4 * k); }
    if (p.cap) { c.fillStyle = p.cap; c.fillRect(x - 4 * k, hy - 4.5 * k, 8 * k, 2.5 * k); c.fillRect(x + (dir > 0 ? 2 : -6) * k, hy - 2.5 * k, 4 * k, 1.2 * k); }
    // voorwerpen
    if (p.tool === 'bezem') { c.strokeStyle = '#a3703f'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 6 * dir, yb - 2); c.lineTo(x + 4 * dir, yb - 18); c.stroke(); c.fillStyle = '#d9b25a'; c.fillRect(x + 6 * dir - 3, yb - 4, 6, 4); }
    if (p.tool === 'kist') { c.fillStyle = '#c0392b'; c.fillRect(x + 5 * dir - 3, yb - 7, 6, 5); c.fillStyle = '#333'; c.fillRect(x + 5 * dir - 1.5, yb - 8.5, 3, 1.5); }
    if (p.tool === 'hark') { const sw = p.working ? Math.sin(t * 8) * 4 : 0; c.strokeStyle = '#a3703f'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 6 * dir, yb - 1); c.lineTo(x + (4 + sw) * dir, yb - 19); c.stroke(); c.strokeStyle = '#888'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + 6 * dir - 3.5, yb - 1); c.lineTo(x + 6 * dir + 3.5, yb - 1); for (let i = -3; i <= 3; i += 1.5) { c.moveTo(x + 6 * dir + i, yb - 1); c.lineTo(x + 6 * dir + i, yb + 2); } c.stroke(); }
    if (p.tool === 'vlag') { c.strokeStyle = '#eee'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 6 * dir, yb - 4); c.lineTo(x + 6 * dir, yb - 26); c.stroke(); c.fillStyle = '#e74c3c'; c.beginPath(); c.moveTo(x + 6 * dir, yb - 26); c.lineTo(x + 6 * dir + 7 * dir, yb - 23); c.lineTo(x + 6 * dir, yb - 20); c.fill(); }
    if (p.item === 'eten') { c.fillStyle = '#f6d365'; c.beginPath(); c.arc(x + 5 * dir, bodyY + 5, 2.2, 0, Math.PI * 2); c.fill(); }
    if (p.item === 'tas') { c.fillStyle = '#e67e22'; c.fillRect(x + 5 * dir - 2, bodyY + 4, 4, 5); }
  },

  // ---- dieren ----
  drawAnimal(c, x, y, kind, dir, t) {
    dir = dir || 1;
    const sh = () => { c.fillStyle = 'rgba(0,0,0,0.15)'; c.beginPath(); c.ellipse(x, y + 0.5, 7, 3, 0, 0, Math.PI * 2); c.fill(); };
    const legs = (col, n, bx, w, h) => { c.fillStyle = col; for (let i = 0; i < n; i++) c.fillRect(x + bx + i * (w + 1.6) * (n > 2 ? 1 : 1), y - h, w, h); };
    const head = (col, hx, hy, r) => { c.fillStyle = col; c.beginPath(); c.arc(x + hx * dir, y - hy, r, 0, Math.PI * 2); c.fill(); };
    const eye = (hx, hy) => { c.fillStyle = '#222'; c.fillRect(x + hx * dir, y - hy, 1.2, 1.2); };
    const wob = Math.sin(t * 8) * 0.6;
    switch (kind) {
      case 'geit': sh(); legs('#c9b89a', 4, -5, 1.6, 5); c.fillStyle = '#e8dcc4'; c.beginPath(); c.ellipse(x, y - 7, 7, 4, 0, 0, Math.PI * 2); c.fill(); head('#e8dcc4', 7, 11 + wob, 3); c.fillStyle = '#555'; c.fillRect(x + 7 * dir - 1, y - 16, 1.2, 3); c.fillRect(x + 7 * dir + 1, y - 16, 1.2, 3); eye(8, 12); c.fillStyle = '#e8dcc4'; c.fillRect(x + 8 * dir, y - 10, 1.5, 3); break;
      case 'schaap': sh(); legs('#333', 4, -5, 1.6, 4); c.fillStyle = '#f4f1ea'; c.beginPath(); c.ellipse(x, y - 7, 8, 5, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(x - 3, y - 10, 3, 0, Math.PI * 2); c.arc(x + 3, y - 10, 3, 0, Math.PI * 2); c.fill(); head('#333', 8, 9 + wob, 2.8); eye(8.5, 10); break;
      case 'kip': c.fillStyle = 'rgba(0,0,0,0.12)'; c.beginPath(); c.ellipse(x, y, 3.5, 1.5, 0, 0, Math.PI * 2); c.fill(); legs('#e8a020', 2, -1.5, 1, 2.5); c.fillStyle = Util.hash2(x | 0, y | 0) > 0.5 ? '#b35a2a' : '#f3ecdc'; c.beginPath(); c.ellipse(x, y - 4.5, 4, 3, 0, 0, Math.PI * 2); c.fill(); head(c.fillStyle, 3, 8 + wob, 2); c.fillStyle = '#e03030'; c.fillRect(x + 3 * dir - 1, y - 11, 2, 1.5); c.fillStyle = '#f39c12'; c.fillRect(x + 4.5 * dir, y - 8, 1.5, 1); break;
      case 'koe': sh(); legs('#f4f1ea', 4, -8, 2, 6); c.fillStyle = '#f4f1ea'; c.beginPath(); c.ellipse(x, y - 10, 11, 6, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#222'; c.beginPath(); c.ellipse(x - 4, y - 11, 4, 3, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(x + 5, y - 8, 3, 2.5, 0, 0, Math.PI * 2); c.fill(); head('#f4f1ea', 11, 13 + wob, 4); c.fillStyle = '#f0a0b0'; c.fillRect(x + 12 * dir - 1.5, y - 12, 3, 2); eye(11.5, 15); c.fillStyle = '#ccc'; c.fillRect(x + 10 * dir, y - 18, 1.2, 2.5); break;
      case 'pony': sh(); legs('#5a3a1e', 4, -7, 1.8, 7); c.fillStyle = '#8a5a2b'; c.beginPath(); c.ellipse(x, y - 11, 10, 5, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#8a5a2b'; c.fillRect(x + 6 * dir - 2, y - 20 + wob, 4, 9); head('#8a5a2b', 9, 20 + wob, 3); c.fillStyle = '#3a2a1a'; c.fillRect(x + 3 * dir, y - 23 + wob, 5, 2); c.fillRect(x - 10 * dir - 1, y - 14, 2, 7); eye(9.5, 21); break;
      case 'konijn': c.fillStyle = 'rgba(0,0,0,0.12)'; c.beginPath(); c.ellipse(x, y, 4, 1.6, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#b9a58a'; c.beginPath(); c.ellipse(x, y - 3.5, 4.5, 3, 0, 0, Math.PI * 2); c.fill(); head('#b9a58a', 4, 6, 2.2); c.fillStyle = '#b9a58a'; c.fillRect(x + 3.5 * dir, y - 12, 1.3, 5); c.fillRect(x + 5 * dir, y - 12, 1.3, 5); c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 4 * dir, y - 4, 1.5, 0, Math.PI * 2); c.fill(); eye(4.5, 7); break;
      case 'eend': c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(x, y, 7, 2.5, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f3ecdc'; c.beginPath(); c.ellipse(x, y - 2.5, 5, 2.8, 0, 0, Math.PI * 2); c.fill(); head('#2e7d32', 4.5, 6 + wob, 2.2); c.fillStyle = '#f39c12'; c.fillRect(x + 6 * dir, y - 6, 3, 1.4); eye(5, 7); break;
    }
  },
};
