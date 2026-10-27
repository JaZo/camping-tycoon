'use strict';
// ---------------------------------------------------------------------------
// Wereld: tegelraster, objecten, plaatsing, bereikbaarheid, padvinding
// ---------------------------------------------------------------------------
const World = {
  W: 40, H: 40,
  terrain: null, path: null, obj: null, litter: null,
  objects: new Map(),
  nextId: 1,
  entrance: { x: 20, y: 39 },
  pathVersion: 0,
  reach: null,          // 1 als padtegel verbonden is met de ingang
  reachVersion: -1,
  _bfsVisit: null, _bfsPrev: null, _bfsStamp: 0, _queue: null,

  // owned: het gekochte deel van de kaart {x0,y0,x1,y1} (x1/y1 exclusief). entrance: optioneel, anders midden onderaan het eigendom.
  init(w, h, owned, entrance) {
    this.W = w; this.H = h;
    const n = w * h;
    this.terrain = new Uint8Array(n); this.path = new Uint8Array(n); this.obj = new Int32Array(n); this.litter = new Uint8Array(n);
    this.objects = new Map(); this.nextId = 1;
    this.owned = owned ? { x0: owned.x0, y0: owned.y0, x1: owned.x1, y1: owned.y1 } : { x0: 0, y0: 0, x1: w, y1: h };
    this.entrance = entrance ? { x: entrance.x, y: entrance.y } : { x: Math.floor((this.owned.x0 + this.owned.x1) / 2), y: this.owned.y1 - 1 };
    this.reach = new Uint8Array(n); this.reachVersion = -1; this.pathVersion = 0;
    this._bfsVisit = new Int32Array(n); this._bfsPrev = new Int32Array(n); this._dist = new Int32Array(n); this._queue = new Int32Array(n); this._distBuf = new Int32Array(n); this._bfsStamp = 0;
    this.path[this.idx(this.entrance.x, this.entrance.y)] = 1;
    this.path[this.idx(this.entrance.x, this.entrance.y - 1)] = 1;
  },
  idx(x, y) { return y * this.W + x; },
  inb(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; },
  isEntrance(x, y) { return x === this.entrance.x && y === this.entrance.y; },
  isOwned(x, y) { if (this.genMode) return true; const o = this.owned; return x >= o.x0 && x < o.x1 && y >= o.y0 && y < o.y1; },
  isOwnedStrict(x, y) { const o = this.owned; return x >= o.x0 && x < o.x1 && y >= o.y0 && y < o.y1; },
  ownedW() { return this.owned.x1 - this.owned.x0; }, ownedH() { return this.owned.y1 - this.owned.y0; },
  objAt(x, y) { if (!this.inb(x, y)) return null; const id = this.obj[this.idx(x, y)]; return id ? this.objects.get(id) : null; },
  hasPath(x, y) { return this.inb(x, y) && this.path[this.idx(x, y)] > 0; },
  // loopbaar voor gasten/personeel: padtegels, plus tegels van 'walkable' objecten op een pad (bankje, slagboom, lantaarn...)
  walkable(x, y) { return this.hasPath(x, y); },

  // ---- plaatsing ------------------------------------------------------------
  canPlace(def, x, y, mirror) {
    const NOT_OWNED = { ok: false, reason: 'Deze grond is niet van jou' };
    if (def.kind === 'path') {
      if (!this.inb(x, y)) return { ok: false, reason: 'Buiten het terrein' };
      if (!this.isOwned(x, y)) return NOT_OWNED;
      const i = this.idx(x, y);
      if (this.terrain[i] === 2) return { ok: false, reason: 'Niet op water' };
      if (this.obj[i]) { const o = this.objects.get(this.obj[i]); if (!(DATA.items[o.type].onPath || DATA.items[o.type].kind === 'pathobj')) return { ok: false, reason: 'Hier staat al iets' }; }
      if (this.path[i] === def.pathType) return { ok: false, reason: 'Hier ligt al zo\'n pad' };
      return { ok: true };
    }
    if (def.kind === 'terrain') {
      if (!this.inb(x, y)) return { ok: false, reason: 'Buiten het terrein' };
      if (!this.isOwned(x, y)) return NOT_OWNED;
      const i = this.idx(x, y);
      if (this.terrain[i] === def.terrain) return { ok: false, reason: 'Is al ' + def.name.toLowerCase() };
      if (this.obj[i] || this.path[i]) return { ok: false, reason: 'Eerst het object of pad weghalen' };
      if (this.isEntrance(x, y)) return { ok: false, reason: 'Dit is de ingang' };
      return { ok: true };
    }
    if (def.kind === 'animal') {
      if (!this.inb(x, y)) return { ok: false, reason: 'Buiten het terrein' };
      if (!this.isOwned(x, y)) return NOT_OWNED;
      const i = this.idx(x, y);
      if (def.water) { if (this.terrain[i] !== 2) return { ok: false, reason: 'Eenden horen op het water' }; return { ok: true }; }
      if (this.terrain[i] === 2) return { ok: false, reason: 'Niet op water' };
      if (this.obj[i] || this.path[i]) return { ok: false, reason: 'Zet het dier op vrij gras' };
      return { ok: true };
    }
    if (def.kind === 'pathobj') {
      if (!this.inb(x, y)) return { ok: false, reason: 'Buiten het terrein' };
      if (!this.isOwned(x, y)) return NOT_OWNED;
      const i = this.idx(x, y);
      if (!this.path[i]) return { ok: false, reason: 'Moet op een pad staan' };
      if (this.obj[i]) return { ok: false, reason: 'Hier staat al iets' };
      if (this.isEntrance(x, y)) return { ok: false, reason: 'Niet op de ingang' };
      return { ok: true };
    }
    // spot / facility / deco
    const w = mirror ? def.h : def.w, h = mirror ? def.w : def.h;
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
      const tx = x + dx, ty = y + dy;
      if (!this.inb(tx, ty)) return { ok: false, reason: 'Buiten het terrein' };
      if (!this.isOwned(tx, ty)) return NOT_OWNED;
      const i = this.idx(tx, ty);
      if (this.terrain[i] === 2) return { ok: false, reason: 'Niet op water' };
      if (this.obj[i]) return { ok: false, reason: 'Hier staat al iets' };
      if (this.path[i] && !def.onPath) return { ok: false, reason: 'Hier ligt een pad' };
      if (this.isEntrance(tx, ty)) return { ok: false, reason: 'Niet op de ingang' };
    }
    if (def.kind === 'facility' || def.kind === 'spot') {
      if (!this.adjacentToPath(x, y, w, h)) return { ok: true, warn: 'Grenst niet aan een pad: onbereikbaar' };
    }
    return { ok: true };
  },
  adjacentToPath(x, y, w, h) {
    for (let dx = 0; dx < w; dx++) { if (this.hasPath(x + dx, y - 1) || this.hasPath(x + dx, y + h)) return true; }
    for (let dy = 0; dy < h; dy++) { if (this.hasPath(x - 1, y + dy) || this.hasPath(x + w, y + dy)) return true; }
    return false;
  },
  place(def, x, y, variant, mirror) {
    const w = mirror ? def.h : def.w, h = mirror ? def.w : def.h;
    const o = { id: this.nextId++, type: def.id, x, y, w, h, mirror: !!mirror, variant: variant || 0, cond: 100, broken: false, dirt: 0, users: [], occupant: 0, open: true, built: Game.day, natural: !!this.genMode };
    this.objects.set(o.id, o);
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) this.obj[this.idx(x + dx, y + dy)] = o.id;
    if (def.id === 'slagboom') o.variant = (this.hasPath(x, y - 1) || this.hasPath(x, y + 1)) && !(this.hasPath(x - 1, y) || this.hasPath(x + 1, y)) ? 1 : 0;
    if (def.id === 'parkeerplaats') o.variant = Util.randInt(0, 6);
    this.pathVersion++;
    return o;
  },
  // bestaand object (met behoud van staat) opnieuw neerzetten, bijv. na verplaatsen of draaien
  placeExisting(o, x, y, mirror) {
    const def = DATA.items[o.type];
    o.x = x; o.y = y; o.mirror = !!mirror; o.w = mirror ? def.h : def.w; o.h = mirror ? def.w : def.h;
    this.objects.set(o.id, o);
    for (let dy = 0; dy < o.h; dy++) for (let dx = 0; dx < o.w; dx++) this.obj[this.idx(x + dx, y + dy)] = o.id;
    if (def.id === 'slagboom') o.variant = (this.hasPath(x, y - 1) || this.hasPath(x, y + 1)) && !(this.hasPath(x - 1, y) || this.hasPath(x + 1, y)) ? 1 : 0;
    o._doors = null; o._doorsV = -1; this.pathVersion++;
    return o;
  },
  // aan welke rand van het pad staat een padobject? 0 midden, 1 v0 (boven-rechts), 2 v1 (onder-links), 3 u0 (boven-links), 4 u1 (onder-rechts)
  edgeVariant(o) {
    const x = o.x, y = o.y; if (!this.hasPath(x, y)) return 0;
    const n = this.hasPath(x, y - 1), s = this.hasPath(x, y + 1), e = this.hasPath(x + 1, y), w = this.hasPath(x - 1, y);
    const free = []; if (!s) free.push(2); if (!e) free.push(4); if (!n) free.push(1); if (!w) free.push(3);
    return free.length ? free[0] : 2;
  },
  // ---- grond kopen ------------------------------------------------------------
  landStrip(dir) {
    const o = this.owned, S = DATA.LAND_STRIP;
    if (dir === 'n') return o.y0 - S >= 0 ? { x0: o.x0, y0: o.y0 - S, x1: o.x1, y1: o.y0 } : null;
    if (dir === 'w') return o.x0 - S >= 0 ? { x0: o.x0 - S, y0: o.y0, x1: o.x0, y1: o.y1 } : null;
    if (dir === 'e') return o.x1 + S <= this.W ? { x0: o.x1, y0: o.y0, x1: o.x1 + S, y1: o.y1 } : null;
    return null;
  },
  landCost(dir) { const r = this.landStrip(dir); return r ? (r.x1 - r.x0) * (r.y1 - r.y0) * DATA.LAND_PRICE : 0; },
  buyLand(dir) {
    const r = this.landStrip(dir); if (!r) return false;
    const o = this.owned; this.owned = { x0: Math.min(o.x0, r.x0), y0: Math.min(o.y0, r.y0), x1: Math.max(o.x1, r.x1), y1: Math.max(o.y1, r.y1) };
    this.pathVersion++; return true;
  },
  remove(o) {
    for (let dy = 0; dy < o.h; dy++) for (let dx = 0; dx < o.w; dx++) { const i = this.idx(o.x + dx, o.y + dy); if (this.obj[i] === o.id) this.obj[i] = 0; }
    this.objects.delete(o.id);
    this.pathVersion++;
  },
  setPath(x, y, type) { this.path[this.idx(x, y)] = type; this.pathVersion++; },
  clearPath(x, y) { this.path[this.idx(x, y)] = 0; this.pathVersion++; },
  setTerrain(x, y, t) { this.terrain[this.idx(x, y)] = t; },

  // ---- bereikbaarheid vanaf de ingang ----------------------------------------
  recomputeReach() {
    if (this.reachVersion === this.pathVersion) return;
    this.reachVersion = this.pathVersion;
    this.reach.fill(0);
    const q = this._queue; let qh = 0, qt = 0;
    const s = this.idx(this.entrance.x, this.entrance.y);
    if (!this.path[s]) return;
    this.reach[s] = 1; q[qt++] = s;
    const W = this.W, H = this.H;
    while (qh < qt) {
      const i = q[qh++], x = i % W, y = (i / W) | 0;
      const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
      for (const [nx, ny] of nb) { if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (this.path[j] && !this.reach[j]) { this.reach[j] = 1; q[qt++] = j; } }
    }
  },
  // padtegels die aan de footprint grenzen en met de ingang verbonden zijn
  doorTiles(o) {
    this.recomputeReach();
    if (o._doorsV === this.pathVersion) return o._doors;
    const res = [];
    const add = (x, y) => { if (this.inb(x, y) && this.path[this.idx(x, y)] && this.reach[this.idx(x, y)]) res.push([x, y]); };
    const def = DATA.items[o.type];
    if ((def.onPath || def.kind === 'pathobj') && this.path[this.idx(o.x, o.y)]) add(o.x, o.y);
    for (let dx = 0; dx < o.w; dx++) { add(o.x + dx, o.y - 1); add(o.x + dx, o.y + o.h); }
    for (let dy = 0; dy < o.h; dy++) { add(o.x - 1, o.y + dy); add(o.x + o.w, o.y + dy); }
    o._doors = res; o._doorsV = this.pathVersion;
    return res;
  },
  isReachable(o) { return this.doorTiles(o).length > 0; },
  // dichtstbijzijnde deur-tegel bij een punt
  nearestDoor(o, x, y) {
    const d = this.doorTiles(o); let best = null, bd = 1e9;
    for (const t of d) { const dd = Math.abs(t[0] - x) + Math.abs(t[1] - y); if (dd < bd) { bd = dd; best = t; } }
    return best;
  },

  // ---- BFS padvinding over padtegels --------------------------------------------
  // goals: Set van tile-indices of functie(i)->bool.  Geeft route [[x,y],...] (excl. start) of null.
  bfs(sx, sy, goals, maxDist) {
    if (!this.inb(sx, sy)) return null;
    const W = this.W, H = this.H, start = this.idx(sx, sy);
    if (!this.path[start]) return null;
    const stamp = ++this._bfsStamp, vis = this._bfsVisit, prev = this._bfsPrev, dist = this._dist, q = this._queue;
    let qh = 0, qt = 0; vis[start] = stamp; prev[start] = -1; dist[start] = 0; q[qt++] = start;
    const isGoal = typeof goals === 'function' ? goals : (i => goals.has(i));
    let found = -1;
    if (isGoal(start)) found = start;
    while (qh < qt && found < 0) {
      const i = q[qh++]; const x = i % W, y = (i / W) | 0, d = dist[i];
      if (maxDist && d >= maxDist) continue;
      const nbs = [i + 1, i - 1, i + W, i - W];
      for (let k = 0; k < 4; k++) {
        const j = nbs[k];
        if (k === 0 && x === W - 1) continue; if (k === 1 && x === 0) continue; if (k === 2 && y === H - 1) continue; if (k === 3 && y === 0) continue;
        if (vis[j] === stamp || !this.path[j]) continue;
        vis[j] = stamp; prev[j] = i; dist[j] = d + 1; q[qt++] = j;
        if (isGoal(j)) { found = j; break; }
      }
    }
    if (found < 0) return null;
    const route = [];
    for (let i = found; i !== start && i >= 0; i = prev[i]) route.push([i % W, (i / W) | 0]);
    route.reverse();
    return route;
  },
  // afstandsveld vanaf (sx,sy); -1 = onbereikbaar
  distField(sx, sy) {
    const W = this.W, H = this.H, start = this.idx(sx, sy);
    const dist = this._distBuf; dist.fill(-1); // hergebruikte buffer: direct gebruiken, niet bewaren
    if (!this.inb(sx, sy) || !this.path[start]) return dist;
    const q = this._queue; let qh = 0, qt = 0; dist[start] = 0; q[qt++] = start;
    while (qh < qt) {
      const i = q[qh++]; const x = i % W, y = (i / W) | 0, d = dist[i];
      if (x < W - 1 && this.path[i + 1] && dist[i + 1] < 0) { dist[i + 1] = d + 1; q[qt++] = i + 1; }
      if (x > 0 && this.path[i - 1] && dist[i - 1] < 0) { dist[i - 1] = d + 1; q[qt++] = i - 1; }
      if (y < H - 1 && this.path[i + W] && dist[i + W] < 0) { dist[i + W] = d + 1; q[qt++] = i + W; }
      if (y > 0 && this.path[i - W] && dist[i - W] < 0) { dist[i - W] = d + 1; q[qt++] = i - W; }
    }
    return dist;
  },
  routeTo(sx, sy, o) { // route naar dichtstbijzijnde deur van object o
    const doors = this.doorTiles(o); if (!doors.length) return null;
    const set = new Set(doors.map(t => this.idx(t[0], t[1])));
    return this.bfs(sx, sy, set);
  },
  randomReachableTile(nearX, nearY, maxDist) { // willekeurige bereikbare padtegel binnen afstand
    const dist = this.distField(nearX, nearY); const cand = [];
    for (let i = 0; i < dist.length; i++) if (dist[i] > 0 && dist[i] <= maxDist) cand.push(i);
    if (!cand.length) return null;
    const i = Util.pick(cand); return [i % this.W, (i / this.W) | 0];
  },

  // ---- omgevingsinfo ---------------------------------------------------------
  countNear(x, y, r, pred) {
    let n = 0;
    for (const o of this.objects.values()) {
      if (!pred(o)) continue;
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
      if (Math.abs(cx - x) <= r && Math.abs(cy - y) <= r) n++;
    }
    return n;
  },
  careOf(o) { return o.care === undefined ? 100 : o.care; },
  careFactor(o) { return 0.5 + 0.5 * this.careOf(o) / 100; }, // verwaarloosd groen telt half mee
  natureScoreAt(x, y, r) {
    let s = 0;
    for (const o of this.objects.values()) {
      const def = DATA.items[o.type]; if (!def.nature) continue;
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2, d = Math.max(Math.abs(cx - x), Math.abs(cy - y));
      if (d <= r) s += def.nature * this.careFactor(o) * (1 - d / (r + 1));
    }
    let water = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const tx = Math.round(x + dx), ty = Math.round(y + dy); if (this.inb(tx, ty) && this.terrain[this.idx(tx, ty)] === 2) water++; }
    return s + Math.min(water, 6) * 0.3;
  },
  // sfeer van een staplek: natuur positief, drukte (recreatie/restaurant/sanitair pal naast) licht negatief
  spotAmbience(o) {
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    const nature = this.natureScoreAt(cx, cy, 3.5);
    const noise = this.countNear(cx, cy, 3, p => p !== o && DATA.items[p.type].kind === 'facility' && (DATA.items[p.type].service === 'fun' || p.type === 'restaurant' || p.type === 'snackbar' || p.type === 'sanitairgebouw'));
    return Util.clamp(nature * 0.12 - noise * 0.08 + (this.careOf(o) - 70) / 100 * 0.2, -0.35, 0.6);
  },
  binNear(x, y) {
    for (const o of this.objects.values()) { const r = DATA.items[o.type].binRadius; if (r && Math.abs(o.x + o.w / 2 - 0.5 - x) <= r && Math.abs(o.y + o.h / 2 - 0.5 - y) <= r) return true; }
    return false;
  },
  nearestBin(x, y, maxDist) {
    let best = null, bd = maxDist;
    for (const o of this.objects.values()) { if (!DATA.items[o.type].binRadius) continue; const d = Math.abs(o.x - x) + Math.abs(o.y - y); if (d < bd && this.isReachable(o)) { bd = d; best = o; } }
    return best;
  },
  lampNear(x, y, r) {
    for (const o of this.objects.values()) if (o.type === 'lantaarn' && Math.abs(o.x - x) <= r && Math.abs(o.y - y) <= r) return true;
    return false;
  },
  has(type) { for (const o of this.objects.values()) if (o.type === type) return true; return false; },
  listByType(type) { const r = []; for (const o of this.objects.values()) if (o.type === type) r.push(o); return r; },
  pathTileCount() { let n = 0; for (let i = 0; i < this.path.length; i++) if (this.path[i]) n++; return n; },
  totalLitter() { let n = 0; for (let i = 0; i < this.litter.length; i++) n += this.litter[i]; return n; },
  // dichtstbijzijnde bereikbare padtegel binnen 4 tegels van een object (werkplek voor de tuinman)
  stagingTile(o) {
    this.recomputeReach();
    if (o._stageV === this.pathVersion) return o._stage;
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2; let best = null, bd = 99;
    for (let y = o.y - 4; y < o.y + o.h + 4; y++) for (let x = o.x - 4; x < o.x + o.w + 4; x++) {
      if (!this.inb(x, y)) continue; const i = this.idx(x, y); if (!this.path[i] || !this.reach[i]) continue;
      const d = Math.abs(x + 0.5 - cx) + Math.abs(y + 0.5 - cy); if (d < bd) { bd = d; best = [x, y]; }
    }
    o._stage = best; o._stageV = this.pathVersion; return best;
  },
  // willekeurig punt in een zone-lijst (lokale coördinaten) -> wereldcoördinaten
  randomZonePoint(o) {
    const z = ZONES[o.type]; let r;
    if (z) r = Util.pick(z); else r = [0.15, 0.15, o.w - 0.15, o.h - 0.15];
    return [o.x + Util.rand(r[0], r[2]), o.y + Util.rand(r[1], r[3])];
  },
  // willekeurig punt direct naast de footprint (voor 'around'-stijl)
  randomRingPoint(o) {
    const side = Util.randInt(0, 3);
    if (side === 0) return [o.x + Util.rand(0.2, o.w - 0.2), o.y - 0.35];
    if (side === 1) return [o.x + Util.rand(0.2, o.w - 0.2), o.y + o.h + 0.35];
    if (side === 2) return [o.x - 0.35, o.y + Util.rand(0.2, o.h - 0.2)];
    return [o.x + o.w + 0.35, o.y + Util.rand(0.2, o.h - 0.2)];
  },
};
