'use strict';
// ---------------------------------------------------------------------------
// Rendering: camera, wereld, overlays, nacht, weer, minimap
// ---------------------------------------------------------------------------
// platte objecten waar gasten op staan: worden vóór alles getekend (sleutel = achterste hoek)
const FLAT_TYPES = new Set(['tentplek', 'caravanplek', 'comfortplek', 'zwembad', 'speeltuin', 'volleybalveld', 'midgetgolf', 'jeudeboules', 'trampoline']);
const VEH_BOX = { tent: [-0.55, -0.42, 0.55, 0.42], caravan: [-0.75, -0.65, 0.55, 0.95], camper: [-0.8, -0.1, 0.7, 0.8] };
const vehBox = (o, p) => { const b = VEH_BOX[p.vehicle]; return o.mirror ? [b[1], b[0], b[3], b[2]] : b; };

const Render = {
  canvas: null, ctx: null, nightCv: null, nctx: null, mini: null, mctx: null,
  W: 0, H: 0, cam: { x: 0, y: 0, zoom: 1 }, hover: null, rain: [], miniTimer: 0, drawables: [],

  init() {
    this.canvas = document.getElementById('game'); this.ctx = this.canvas.getContext('2d');
    this.nightCv = document.createElement('canvas'); this.nctx = this.nightCv.getContext('2d');
    this.mini = document.getElementById('minimap'); this.mctx = this.mini.getContext('2d');
    window.addEventListener('resize', () => this.resize()); this.resize();
    for (let i = 0; i < 160; i++) this.rain.push({ x: Math.random(), y: Math.random(), s: Util.rand(0.6, 1.2) });
  },
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width = this.W * dpr; this.canvas.height = this.H * dpr; this.canvas.style.width = this.W + 'px'; this.canvas.style.height = this.H + 'px';
    this.nightCv.width = this.W; this.nightCv.height = this.H; this.dpr = dpr;
  },
  centerOnMap() { const o = World.owned, cx = (o.x0 + o.x1) / 2, cy = (o.y0 + o.y1) / 2; this.cam.x = (cx - cy) * 32; this.cam.y = (cx + cy) * 16; this.cam.zoom = Math.max(0.6, Math.min(1.4, this.W / (World.ownedW() * 40))); },
  tileToWorld(tx, ty) { return [(tx - ty) * 32, (tx + ty) * 16]; },
  worldToScreen(wx, wy) { const z = this.cam.zoom; return [(wx - this.cam.x) * z + this.W / 2, (wy - this.cam.y) * z + this.H / 2]; },
  tileToScreen(tx, ty) { const [wx, wy] = this.tileToWorld(tx, ty); return this.worldToScreen(wx, wy); },
  screenToTile(mx, my) {
    const z = this.cam.zoom, wx = (mx - this.W / 2) / z + this.cam.x, wy = (my - this.H / 2) / z + this.cam.y;
    return [wx / 64 + wy / 32, wy / 32 - wx / 64];
  },
  clampCamera() {
    const m = 200; const [x0, y0] = this.tileToWorld(0, 0), [x1] = this.tileToWorld(World.W, 0), [x2] = this.tileToWorld(0, World.H), [, y3] = this.tileToWorld(World.W, World.H);
    this.cam.x = Util.clamp(this.cam.x, x2 - m, x1 + m); this.cam.y = Util.clamp(this.cam.y, y0 - m, y3 + m);
  },
  darkness() {
    const t = Game.t;
    if (t < 0.2) return 1; if (t < 0.27) return 1 - (t - 0.2) / 0.07; if (t < 0.88) return 0; if (t < 0.95) return (t - 0.88) / 0.07; return 1;
  },

  groundKind(i) {
    const t = World.terrain[i];
    if (t === 2) return 'water'; if (t === 1) return 'zand';
    const s = Sprites.season; return s === 'winter' ? 'sneeuw' : s === 'herfst' ? 'herfst' : 'gras';
  },

  draw(time, dt) {
    const c = this.ctx, z = this.cam.zoom, W = this.W, H = this.H;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = Sprites.season === 'winter' ? '#3a4a3a' : '#2e4a2b'; c.fillRect(0, 0, W, H);
    c.setTransform(z * this.dpr, 0, 0, z * this.dpr, (W / 2 - this.cam.x * z) * this.dpr, (H / 2 - this.cam.y * z) * this.dpr);
    c.imageSmoothingEnabled = true;
    const left = this.cam.x - W / 2 / z - 70, right = this.cam.x + W / 2 / z + 70, top = this.cam.y - H / 2 / z - 120, bottom = this.cam.y + H / 2 / z + 60;
    // omliggend terrein
    const [ax, ay] = this.tileToWorld(0, 0), [bx, by] = this.tileToWorld(World.W, 0), [cx2, cy2] = this.tileToWorld(World.W, World.H), [dx, dy] = this.tileToWorld(0, World.H);
    c.fillStyle = Sprites.season === 'winter' ? '#dfe6ec' : '#5f9a48'; c.beginPath(); c.moveTo(ax, ay - 1); c.lineTo(bx + 1, by); c.lineTo(cx2, cy2 + 1); c.lineTo(dx - 1, dy); c.closePath(); c.fill();
    // grond
    const WW = World.W, HH = World.H, waterFrame = Math.floor(time * 1.5) % 3;
    const showGrid = UI.tool && UI.tool.kind !== 'demolish' && UI.tool.kind !== 'staff';
    for (let y = 0; y < HH; y++) for (let x = 0; x < WW; x++) {
      const sx = (x - y) * 32, sy = (x + y) * 16;
      if (sx < left || sx > right || sy < top || sy > bottom) continue;
      const i = y * WW + x;
      let kind = this.groundKind(i), variant = (x * 7 + y * 13) % 4;
      if (kind === 'water') variant = (waterFrame + x + y) % 3;
      c.drawImage(Sprites.ground(kind, variant), sx - 33, sy - 1, 66, 34);
      if (!World.isOwned(x, y)) { c.drawImage(Sprites.ground('unowned', 0), sx - 33, sy - 1, 66, 34); continue; }
      const p = World.path[i];
      if (p) {
        c.drawImage(Sprites.ground(p === 2 ? 'tegel' : 'grind', variant), sx - 33, sy - 1, 66, 34);
        // randen waar geen pad grenst
        c.strokeStyle = p === 2 ? '#8d8d89' : '#a89878'; c.lineWidth = 1.2; c.beginPath();
        if (!World.hasPath(x, y - 1)) { c.moveTo(sx, sy); c.lineTo(sx + 32, sy + 16); }
        if (!World.hasPath(x + 1, y)) { c.moveTo(sx + 32, sy + 16); c.lineTo(sx, sy + 32); }
        if (!World.hasPath(x, y + 1)) { c.moveTo(sx, sy + 32); c.lineTo(sx - 32, sy + 16); }
        if (!World.hasPath(x - 1, y)) { c.moveTo(sx - 32, sy + 16); c.lineTo(sx, sy); }
        c.stroke();
        const l = World.litter[i];
        if (l) { for (let k = 0; k < l; k++) { const lx = sx - 18 + Util.hash2(x * 3 + k, y, 1) * 36, ly = sy + 6 + Util.hash2(x, y * 5 + k, 2) * 20; c.fillStyle = ['#e74c3c', '#f1c40f', '#ecf0f1', '#8e44ad'][k % 4]; c.fillRect(lx, ly, 3, 2); } }
      }
    }
    // ingang: weg en bord
    const ex = World.entrance.x, ey = World.entrance.y;
    for (let k = 1; k <= 3; k++) { const [sx, sy] = this.tileToWorld(ex, ey + k); c.drawImage(Sprites.ground('asfalt', k), sx - 33, sy - 1, 66, 34); }
    { const [sx, sy] = this.tileToWorld(ex, ey + 1); c.strokeStyle = '#eee'; c.lineWidth = 1; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - 96, sy + 48); c.stroke(); c.setLineDash([]); }
    this.drawSign(c);
    // eigendomsgrens
    const ow = World.owned;
    if (ow.x0 > 0 || ow.y0 > 0 || ow.x1 < WW || ow.y1 < HH) {
      const [ax2, ay2] = this.tileToWorld(ow.x0, ow.y0), [bx2, by2] = this.tileToWorld(ow.x1, ow.y0), [cx3, cy3] = this.tileToWorld(ow.x1, ow.y1), [dx3, dy3] = this.tileToWorld(ow.x0, ow.y1);
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1.5; c.setLineDash([8, 6]); c.beginPath(); c.moveTo(ax2, ay2); c.lineTo(bx2, by2); c.lineTo(cx3, cy3); c.lineTo(dx3, dy3); c.closePath(); c.stroke(); c.setLineDash([]);
    }
    if (showGrid) {
      c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 0.8; c.beginPath();
      for (let x = ow.x0; x <= ow.x1; x++) { const [x0, y0] = this.tileToWorld(x, ow.y0), [x1, y1] = this.tileToWorld(x, ow.y1); c.moveTo(x0, y0); c.lineTo(x1, y1); }
      for (let y = ow.y0; y <= ow.y1; y++) { const [x0, y0] = this.tileToWorld(ow.x0, y), [x1, y1] = this.tileToWorld(ow.x1, y); c.moveTo(x0, y0); c.lineTo(x1, y1); }
      c.stroke();
    }
    // objecten + entiteiten verzamelen
    const D = this.drawables; D.length = 0;
    const evening = Game.isEvening() || this.darkness() > 0;
    for (const o of World.objects.values()) {
      const sx = (o.x - o.y) * 32, sy = (o.x + o.y) * 16;
      if (sx < left - 100 || sx > right + 100 || sy < top - 40 || sy > bottom + 120) continue;
      o._key = FLAT_TYPES.has(o.type) ? o.x + o.y + 0.5 : o.x + o.y + o.w + o.h;
      D.push({ k: o._key, t: 0, o });
      if (o.occupant) {
        const p = Guests.parties.get(o.occupant);
        if (p && p.vehicle) { const b = vehBox(o, p); o._vk = o.x + o.w / 2 + b[2] + o.y + o.h / 2 + b[3]; D.push({ k: o._vk, t: 1, o, p }); }
        else o._vk = -1;
      } else o._vk = -1;
    }
    const pushEnt = (e, t) => {
      if (e.hidden) return;
      const sx = (e.x - e.y) * 32, sy = (e.x + e.y) * 16;
      if (sx < left || sx > right || sy < top || sy > bottom) return;
      let k = e.x + e.y + 0.01;
      // correctie: entiteit vóór een gebouw/voertuig waar hij naast staat
      const tx = Math.floor(e.x), ty = Math.floor(e.y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = tx + dx, ny = ty + dy; if (!World.inb(nx, ny)) continue;
        const id = World.obj[ny * WW + nx]; if (!id) continue;
        const o = World.objects.get(id); if (!o) continue;
        // binnen de voetafdruk (terras, zwembad, veld) of vóór de voorgevels: ná het object tekenen
        if ((dx === 0 && dy === 0) || e.x >= o.x + o.w - 0.05 || e.y >= o.y + o.h - 0.05) k = Math.max(k, o._key + 0.5);
        if (o._vk > 0) { const p = Guests.parties.get(o.occupant); const b = vehBox(o, p); const vx1 = o.x + o.w / 2 + b[2], vy1 = o.y + o.h / 2 + b[3]; if (e.x >= vx1 - 0.05 || e.y >= vy1 - 0.05) k = Math.max(k, o._vk + 0.5); }
      }
      D.push({ k, t, e });
    };
    for (const g of Guests.guests.values()) pushEnt(g, 2);
    for (const s of Staff.list.values()) pushEnt(s, 3);
    for (const a of Animals.list.values()) pushEnt(a, 4);
    D.sort((a, b) => a.k - b.k || a.t - b.t);
    for (const d of D) {
      if (d.t === 0) this.drawObject(c, d.o, evening);
      else if (d.t === 1) { const dd = DATA.items[d.o.type]; const sp = Sprites.vehicle(d.p.vehicle, dd.w, dd.h, d.p.color, d.o.mirror); const [sx, sy] = this.tileToWorld(d.o.x, d.o.y); c.drawImage(sp.cv, sx - sp.ox, sy - sp.oy, sp.w, sp.h); }
      else if (d.t === 2 || d.t === 3) { const e = d.e; const [sx, sy] = this.tileToWorld(e.x, e.y); const to = World.objAt(Math.floor(e.x), Math.floor(e.y)); const inWater = to && to.type === 'zwembad' && e.x > to.x + 0.5 && e.x < to.x + 2.5 && e.y > to.y + 0.5 && e.y < to.y + 2.5; Sprites.drawPerson(c, sx, sy, { shirt: e.shirt, skin: e.skin, hair: e.hair, pants: e.pants, kid: e.kid, dress: e.dress, longHair: e.longHair, hat: e.hat, cap: e.cap, dir: e.dir, walking: e.walking, phase: e.phase, sitting: e.sitting, swim: e.swim || inWater, bounce: e.bounce, item: e.item, tool: d.t === 3 ? (e.role === 'schoonmaker' ? 'bezem' : e.role === 'monteur' ? 'kist' : 'vlag') : null, vest: d.t === 3 && e.role === 'monteur' ? '#ff8c00' : null, armsUp: d.t === 3 && e.state === 'work' && (e.task === 'perform' || e.task === 'campfire') }, time); }
      else { const a = d.e; const [sx, sy] = this.tileToWorld(a.x, a.y); Sprites.drawAnimal(c, sx, sy, a.kind, a.dir, a.state === 'walk' ? time + a.phase : 0); }
    }
    this.drawStatusIcons(c);
    this.drawSelection(c, time);
    this.drawGhost(c);
    // scherm-overlays
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawNight(c);
    this.drawWeather(c, dt);
    this.miniTimer -= dt; if (this.miniTimer <= 0) { this.miniTimer = 0.5; this.drawMinimap(); }
  },
  drawObject(c, o, evening) {
    let variant = o.variant; const def = DATA.items[o.type];
    if (o.type === 'kampvuurplaats') variant = (evening && o.users.length > 0) || (evening && Game.isEvening()) ? 1 : 0;
    else if ((def.kind === 'pathobj' && o.type !== 'slagboom') || (def.onPath && World.path[World.idx(o.x, o.y)])) variant = World.edgeVariant(o);
    const sp = Sprites.get(o.type, variant, o.mirror);
    const [sx, sy] = this.tileToWorld(o.x, o.y);
    const dim = !World.isOwned(o.x, o.y); if (dim) c.globalAlpha = 0.55;
    c.drawImage(sp.cv, sx - sp.ox, sy - sp.oy, sp.w, sp.h);
    if (dim) c.globalAlpha = 1;
  },
  drawSign(c) {
    const [sx, sy] = this.tileToWorld(World.entrance.x + 1, World.entrance.y + 1.2);
    c.fillStyle = '#5a3a1e'; c.fillRect(sx - 14, sy - 34, 3, 34); c.fillRect(sx + 11, sy - 34, 3, 34);
    c.fillStyle = '#f6e7c1'; c.fillRect(sx - 22, sy - 44, 44, 16); c.strokeStyle = '#5a3a1e'; c.lineWidth = 1; c.strokeRect(sx - 22, sy - 44, 44, 16);
    c.fillStyle = '#2b5a2b'; c.font = 'bold 5px sans-serif'; c.textAlign = 'center'; c.fillText('CAMPING', sx, sy - 38);
    c.font = 'bold 4.2px sans-serif'; c.fillText((Game.name || '').toUpperCase().slice(0, 20), sx, sy - 32);
  },
  drawStatusIcons(c) {
    for (const o of World.objects.values()) {
      const d = DATA.items[o.type];
      let icon = null, col = null;
      if (o.broken) { icon = '!'; col = '#e74c3c'; }
      else if (d.dirtRate && o.dirt > 60) { icon = '~'; col = '#8e5a2b'; }
      else if ((d.kind === 'spot' || (d.kind === 'facility' && d.service)) && !World.isReachable(o)) { icon = '×'; col = '#7f8c8d'; }
      if (!icon) continue;
      const [sx, sy] = this.tileToWorld(o.x + o.w / 2, o.y + o.h / 2);
      const yy = sy - (d.sh || 40) - 10;
      c.fillStyle = col; c.beginPath(); c.arc(sx, yy, 7, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#fff'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(icon, sx, yy + 0.5); c.textBaseline = 'alphabetic';
    }
  },
  diamond(c, x, y, w, h) { const [ax, ay] = this.tileToWorld(x, y), [bx, by] = this.tileToWorld(x + w, y), [cx, cy] = this.tileToWorld(x + w, y + h), [dx, dy] = this.tileToWorld(x, y + h); c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(cx, cy); c.lineTo(dx, dy); c.closePath(); },
  drawSelection(c, time) {
    const s = UI.selected; if (!s) return;
    if (s.kind === 'obj') { const o = World.objects.get(s.id); if (!o) return; this.diamond(c, o.x, o.y, o.w, o.h); c.strokeStyle = '#ffd54a'; c.lineWidth = 2; c.stroke(); }
    else {
      const e = s.kind === 'guest' ? Guests.guests.get(s.id) : s.kind === 'staff' ? Staff.list.get(s.id) : Animals.list.get(s.id); if (!e) return;
      const [sx, sy] = this.tileToWorld(e.x, e.y); const yy = sy - 34 - Math.sin(time * 5) * 3;
      c.fillStyle = '#ffd54a'; c.beginPath(); c.moveTo(sx, yy + 6); c.lineTo(sx - 5, yy - 2); c.lineTo(sx + 5, yy - 2); c.closePath(); c.fill();
      c.strokeStyle = '#ffd54a'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(sx, sy + 1, 8, 4, 0, 0, Math.PI * 2); c.stroke();
    }
  },
  drawGhost(c) {
    if (UI.landHover) { const r = World.landStrip(UI.landHover); if (r) { this.diamond(c, r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); c.fillStyle = 'rgba(241,196,15,0.3)'; c.fill(); c.strokeStyle = '#f1c40f'; c.lineWidth = 2; c.stroke(); } }
    const t = UI.tool, h = this.hover; if (!t || !h) return;
    const [x, y] = h;
    if (t.kind === 'staff') return;
    if (t.kind === 'demolish') {
      const o = World.objAt(x, y);
      if (o) { this.diamond(c, o.x, o.y, o.w, o.h); c.fillStyle = 'rgba(231,76,60,0.35)'; c.fill(); c.strokeStyle = '#e74c3c'; c.lineWidth = 2; c.stroke(); }
      else if (World.inb(x, y)) { this.diamond(c, x, y, 1, 1); c.strokeStyle = '#e74c3c'; c.lineWidth = 1.5; c.stroke(); }
      return;
    }
    const m = UI.toolMirror, r = World.canPlace(t, x, y, m);
    this.diamond(c, x, y, m ? t.h : t.w, m ? t.w : t.h); c.fillStyle = r.ok ? (r.warn ? 'rgba(241,196,15,0.35)' : 'rgba(46,204,113,0.35)') : 'rgba(231,76,60,0.4)'; c.fill();
    c.strokeStyle = r.ok ? (r.warn ? '#f1c40f' : '#2ecc71') : '#e74c3c'; c.lineWidth = 1.5; c.stroke();
    c.globalAlpha = 0.65;
    if (t.kind === 'path') { const [sx, sy] = this.tileToWorld(x, y); c.drawImage(Sprites.ground(t.pathType === 2 ? 'tegel' : 'grind', 0), sx - 33, sy - 1, 66, 34); }
    else if (t.kind === 'terrain') { const [sx, sy] = this.tileToWorld(x, y); c.drawImage(Sprites.ground(t.terrain === 2 ? 'water' : t.terrain === 1 ? 'zand' : 'gras', 0), sx - 33, sy - 1, 66, 34); }
    else if (t.kind === 'animal') { const [sx, sy] = this.tileToWorld(x + 0.5, y + 0.5); Sprites.drawAnimal(c, sx, sy, t.id, 1, 0); }
    else { const sp = Sprites.get(t.id, 0, m); const [sx, sy] = this.tileToWorld(x, y); c.drawImage(sp.cv, sx - sp.ox, sy - sp.oy, sp.w, sp.h); }
    c.globalAlpha = 1;
  },
  drawNight(c) {
    const dark = this.darkness(); if (dark <= 0) return;
    const n = this.nctx, W = this.W, H = this.H, z = this.cam.zoom;
    n.setTransform(1, 0, 0, 1, 0, 0); n.globalCompositeOperation = 'source-over'; n.clearRect(0, 0, W, H);
    n.fillStyle = 'rgba(8,14,50,' + (0.58 * dark).toFixed(3) + ')'; n.fillRect(0, 0, W, H);
    n.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => { const g = n.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); n.fillStyle = g; n.fillRect(x - r, y - r, r * 2, r * 2); };
    const lights = [];
    for (const o of World.objects.values()) {
      if (o.type === 'lantaarn') { const [sx, sy] = this.tileToScreen(o.x + 0.5, o.y + 0.5); if (sx > -100 && sx < W + 100 && sy > -100 && sy < H + 100) { hole(sx, sy - 30 * z, 75 * z, 0.9); lights.push([sx, sy - 30 * z, 75 * z, '255,220,120']); } }
      else if (o.type === 'kampvuurplaats' && Game.isEvening()) { const [sx, sy] = this.tileToScreen(o.x + 0.5, o.y + 0.5); hole(sx, sy - 8 * z, 60 * z, 0.85); lights.push([sx, sy - 8 * z, 60 * z, '255,150,60']); }
      else if (DATA.items[o.type].indoor || DATA.items[o.type].acc) { const [sx, sy] = this.tileToScreen(o.x + o.w / 2, o.y + o.h / 2); if (sx > -100 && sx < W + 100 && sy > -100 && sy < H + 100) hole(sx, sy - 10 * z, 45 * z, 0.5); }
    }
    c.drawImage(this.nightCv, 0, 0);
    c.globalCompositeOperation = 'lighter';
    for (const l of lights) { const g = c.createRadialGradient(l[0], l[1], 0, l[0], l[1], l[2]); g.addColorStop(0, 'rgba(' + l[3] + ',' + (0.22 * dark) + ')'); g.addColorStop(1, 'rgba(' + l[3] + ',0)'); c.fillStyle = g; c.fillRect(l[0] - l[2], l[1] - l[2], l[2] * 2, l[2] * 2); }
    c.globalCompositeOperation = 'source-over';
  },
  drawWeather(c, dt) {
    if (Game.weather !== 'regen') { if (Game.weather === 'bewolkt') { c.fillStyle = 'rgba(120,130,150,0.12)'; c.fillRect(0, 0, this.W, this.H); } return; }
    const snow = Sprites.season === 'winter', W = this.W, H = this.H, sp = Game.speed > 0 ? 1 : 0;
    c.fillStyle = snow ? 'rgba(200,210,225,0.18)' : 'rgba(90,110,140,0.22)'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(210,225,255,0.55)'; c.lineWidth = 1; c.fillStyle = 'rgba(255,255,255,0.85)';
    for (const r of this.rain) {
      if (snow) { r.y += dt * 0.08 * r.s * sp; r.x += Math.sin(r.y * 20) * dt * 0.02; if (r.y > 1) { r.y = -0.02; r.x = Math.random(); } c.beginPath(); c.arc(r.x * W, r.y * H, 1.5 + r.s, 0, Math.PI * 2); c.fill(); }
      else { r.y += dt * 0.9 * r.s * sp; r.x -= dt * 0.15 * r.s * sp; if (r.y > 1) { r.y = -0.05; r.x = Math.random() * 1.2; } if (r.x < -0.1) r.x += 1.2; c.beginPath(); c.moveTo(r.x * W, r.y * H); c.lineTo(r.x * W - 3, r.y * H + 12 * r.s); c.stroke(); }
    }
  },
  drawMinimap() {
    const m = this.mctx, s = Math.max(2, Math.floor(130 / World.W)), W = World.W, H = World.H;
    this.mini.width = W * s; this.mini.height = H * s;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let col;
      if (World.obj[i]) { const d = DATA.items[World.objects.get(World.obj[i]).type]; col = d.kind === 'spot' ? '#f1c40f' : d.kind === 'deco' ? '#2d6b2a' : d.kind === 'pathobj' ? '#c9b99a' : '#e67e22'; }
      else if (World.path[i]) col = '#d8ccb0';
      else if (World.terrain[i] === 2) col = '#4f94cf'; else if (World.terrain[i] === 1) col = '#e6d7a3'; else col = Sprites.season === 'winter' ? '#dfe6ec' : '#6aa84f';
      m.fillStyle = col; m.fillRect(x * s, y * s, s, s);
    }
    const ow = World.owned; m.fillStyle = 'rgba(0,0,0,0.5)';
    m.fillRect(0, 0, W * s, ow.y0 * s); m.fillRect(0, ow.y1 * s, W * s, (H - ow.y1) * s); m.fillRect(0, ow.y0 * s, ow.x0 * s, (ow.y1 - ow.y0) * s); m.fillRect(ow.x1 * s, ow.y0 * s, (W - ow.x1) * s, (ow.y1 - ow.y0) * s);
    m.fillStyle = '#fff'; for (const g of Guests.guests.values()) if (!g.hidden) m.fillRect(g.x * s - 1, g.y * s - 1, 2, 2);
    // zichtveld
    const pts = [[0, 0], [this.W, 0], [this.W, this.H], [0, this.H]].map(p => this.screenToTile(p[0], p[1]));
    m.strokeStyle = '#fff'; m.lineWidth = 1.5; m.beginPath(); pts.forEach((p, i) => i ? m.lineTo(p[0] * s, p[1] * s) : m.moveTo(p[0] * s, p[1] * s)); m.closePath(); m.stroke();
  },
};
