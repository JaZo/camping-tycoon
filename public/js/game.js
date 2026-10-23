'use strict';
// ---------------------------------------------------------------------------
// Spelkern: tijd, loop, kaartgeneratie, bouwen, opslaan/laden
// ---------------------------------------------------------------------------
const SAVE_PREFIX = 'campingTycoonSave_v1_', META_PREFIX = 'campingTycoonMeta_', LEGACY_KEY = 'campingTycoonSave_v1';

const Game = {
  name: '', day: 0, t: 0.4, time: 0, speed: 1, prevSpeed: 1, weather: 'zon', money: 0, prices: {}, fees: {}, stats: {}, milestones: {},
  keys: new Set(), started: false, lastTs: 0, autosaveTimer: 0, milestoneTimer: 0, seed: 1, slot: 1,

  get month() { return (DATA.START_MONTH + Math.floor(this.day / DATA.DAYS_PER_MONTH)) % 12; },
  get year() { return Math.floor((DATA.START_MONTH + Math.floor(this.day / DATA.DAYS_PER_MONTH)) / 12) + 1; },
  isNight() { return this.t < 0.2 || this.t >= 0.95; },
  isEvening() { return this.t >= 0.76 && this.t < 0.95; },
  dateString() { return 'Dag ' + (this.day % DATA.DAYS_PER_MONTH + 1) + ' · ' + DATA.months[this.month] + ' · jaar ' + this.year; },
  clockString() { const h = Math.floor(this.t * 24), m = Math.floor((this.t * 24 - h) * 60); return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; },
  setSpeed(s) { if (s === 0 && this.speed) this.prevSpeed = this.speed; this.speed = s; UI.updateHud(); },

  init() {
    Render.init(); UI.init();
    this.migrateLegacySave();
    window.addEventListener('beforeunload', () => { if (this.started) this.save(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.started) this.save(); });
    this.showStart();
    requestAnimationFrame(ts => this.loop(ts));
  },
  showStart(preferSlot) {
    const wasRunning = this.started;
    this.started = false; this.speed = 0;
    const s = document.getElementById('startscreen'); s.classList.remove('hidden');
    document.getElementById('start-name').value = 'Camping ' + Util.pick(Names.campings);
    const slots = this.listSlots(), $ = id => document.getElementById(id);
    // bestaande campings
    const list = $('start-slots'); list.innerHTML = '';
    if (slots.some(x => x)) {
      list.appendChild(Util.el('h3', null, 'Bestaande campings'));
      slots.forEach((m, i) => {
        if (!m) return; const n = i + 1;
        const row = Util.el('div', 'slot-row', '<div><b>' + Util.esc(m.name) + '</b> <small class="muted">slot ' + n + '</small><br><small class="muted">' + Util.esc(m.date) + ' · ' + Util.euro(m.money) + ' · ' + m.stars + ' ★ · ' + m.guests + ' gasten</small></div>');
        const bl = Util.el('button', 'small', 'Spelen'); bl.onclick = () => { if (this.load(n)) s.classList.add('hidden'); };
        const bd = Util.el('button', 'small danger', 'Verwijderen'); bd.onclick = () => UI.confirmDialog('Camping "' + m.name + '" definitief verwijderen?', () => { this.deleteSlot(n); this.showStart(preferSlot); }, 'Verwijderen');
        const btns = Util.el('div', 'slot-btns'); btns.appendChild(bl); btns.appendChild(bd); row.appendChild(btns); list.appendChild(row);
      });
    }
    // slotkeuze voor een nieuwe camping
    const sel = $('start-slot'); sel.innerHTML = '';
    let firstFree = slots.findIndex(x => !x); if (firstFree < 0) firstFree = 0;
    slots.forEach((m, i) => { const o = document.createElement('option'); o.value = i + 1; o.textContent = 'Slot ' + (i + 1) + (m ? ' (overschrijft "' + m.name + '")' : ' (leeg)'); sel.appendChild(o); });
    sel.value = preferSlot || (firstFree + 1);
    $('start-btn').onclick = () => {
      const slot = +sel.value;
      const go = () => { this.newGame($('start-name').value.trim() || 'Camping Zonder Naam', +$('start-size').value, slot); s.classList.add('hidden'); };
      if (slots[slot - 1]) UI.confirmDialog('Slot ' + slot + ' bevat al "' + slots[slot - 1].name + '". Overschrijven?', go, 'Overschrijven'); else go();
    };
    const back = $('start-back'); back.classList.toggle('hidden', !wasRunning);
    back.onclick = () => { s.classList.add('hidden'); this.started = true; this.setSpeed(1); };
    const params = new URLSearchParams(location.search);
    if (params.get('test')) { this.newGame('Camping Test', 40, 4); s.classList.add('hidden'); window.runSelfTest && window.runSelfTest(); }
  },
  // ---- opslagslots ---------------------------------------------------------------------
  slotMeta(d) {
    const m = (DATA.START_MONTH + Math.floor(d.day / DATA.DAYS_PER_MONTH)) % 12, y = Math.floor((DATA.START_MONTH + Math.floor(d.day / DATA.DAYS_PER_MONTH)) / 12) + 1;
    return { name: d.name, day: d.day, money: Math.round(d.money), stars: d.econ ? Math.round(d.econ.rating / 10) / 2 : 0, guests: d.guests && d.guests.guests ? d.guests.guests.length : 0, date: 'Dag ' + (d.day % DATA.DAYS_PER_MONTH + 1) + ' ' + DATA.months[m] + ', jaar ' + y };
  },
  listSlots() {
    const r = [];
    for (let n = 1; n <= DATA.SAVE_SLOTS; n++) { try { const m = localStorage.getItem(META_PREFIX + n); r.push(m ? JSON.parse(m) : (localStorage.getItem(SAVE_PREFIX + n) ? { name: 'Camping', day: 0, money: 0, stars: 0, guests: 0, date: '' } : null)); } catch (e) { r.push(null); } }
    return r;
  },
  deleteSlot(n) { localStorage.removeItem(SAVE_PREFIX + n); localStorage.removeItem(META_PREFIX + n); },
  migrateLegacySave() {
    try {
      const old = localStorage.getItem(LEGACY_KEY);
      if (old && !localStorage.getItem(SAVE_PREFIX + '1')) { localStorage.setItem(SAVE_PREFIX + '1', old); localStorage.setItem(META_PREFIX + '1', JSON.stringify(this.slotMeta(JSON.parse(old)))); localStorage.removeItem(LEGACY_KEY); }
    } catch (e) { console.warn('Migratie mislukt', e); }
  },

  newGame(name, size, slot) {
    this.slot = slot || this.slot || 1;
    this.name = name; this.day = 0; this.t = 0.38; this.time = 0; this.speed = 1; this.prevSpeed = 1; this.money = DATA.START_MONEY;
    this.prices = Object.assign({}, DATA.defaultPrices); this.fees = Object.assign({}, DATA.defaultFees); this.milestones = {};
    this.stats = { totalParties: 0, totalGuests: 0, turnedAwayFull: 0, turnedAwayPrice: 0, noReception: 0, missedType: {}, queueGiveUps: 0, breakdowns: 0, litterPicked: 0, nights: 0, departed: 0, happyDepartures: 0, landBought: 0 };
    this.seed = (Math.random() * 1e9) | 0;
    const MAX = Math.max(64, size + 32), x0 = Math.floor((MAX - size) / 2);
    World.init(MAX, MAX, { x0, y0: MAX - size, x1: x0 + size, y1: MAX }); Guests.reset(); Staff.reset(); Animals.reset(); Econ.reset(); Sprites.cache.clear(); UI.previews.clear();
    Sprites.season = DATA.seasonOf(this.month); Econ.ledger.curLabel = DATA.months[this.month] + ' ' + this.year;
    this.generateMap(this.seed); Econ.rollWeather();
    Render.centerOnMap(); UI.select(null); UI.openCategory(null); UI.updateHud();
    this.started = true;
    UI.notify('Welkom bij ' + name + '! Leg een pad vanaf de ingang (onderaan), bouw een receptie en maak staplekken.', 'good');
    setTimeout(() => UI.notify('Tip: ' + DATA.tips[2], 'info'), 4000);
    setTimeout(() => UI.notify('Tip: ' + DATA.tips[4], 'info'), 12000);
  },

  generateMap(seed) {
    const r = Util.rng(seed), W = World.W, H = World.H, ex = World.entrance.x, ey = World.entrance.y, ow = World.owned;
    const nearEntrance = (x, y) => y > ey - 8 && Math.abs(x - ex) < 6;
    World.genMode = true;
    // vijver (binnen het eigen terrein)
    const px = ow.x0 + 5 + Math.floor(r() * (World.ownedW() - 10)), py = ow.y0 + 4 + Math.floor(r() * World.ownedH() * 0.45), pr = 2.4 + r() * 1.6;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - px, (y - py) * 1.2) + (Util.hash2(x, y, seed) - 0.5) * 1.6;
      if (d < pr) World.terrain[World.idx(x, y)] = 2; else if (d < pr + 1.1) World.terrain[World.idx(x, y)] = 1;
    }
    const tryPlace = (id, x, y) => { if (!World.inb(x, y) || nearEntrance(x, y)) return false; const def = DATA.items[id]; const c = World.canPlace(def, x, y); if (!c.ok) return false; World.place(def, x, y); return true; };
    // boomgroepen
    const nClusters = 5 + Math.floor(r() * 4);
    for (let k = 0; k < nClusters; k++) {
      const cx = Math.floor(r() * W), cy = Math.floor(r() * H * 0.85), rad = 2 + r() * 3, n = 6 + Math.floor(r() * 10);
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, dd = r() * rad; const x = Math.round(cx + Math.cos(a) * dd), y = Math.round(cy + Math.sin(a) * dd);
        const id = Util.weighted([['eik', 3], ['den', 3], ['berk', 2], ['struik', 2], ['fruitboom', 0.4], ['bloemen', 1]]);
        tryPlace(id, x, y);
      }
    }
    for (let i = 0; i < W * H * 0.012; i++) tryPlace(Util.weighted([['eik', 2], ['den', 2], ['berk', 1], ['struik', 2], ['bloemen', 2], ['rotsblok', 0.5]]), Math.floor(r() * W), Math.floor(r() * H));
    // buiten het eigendom is het bosrijker
    for (let i = 0; i < W * H * 0.03; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * H); if (World.isOwned(x, y)) continue; tryPlace(Util.weighted([['eik', 3], ['den', 3], ['berk', 1], ['struik', 1]]), x, y); }
    // wilgen en eenden bij de vijver
    let wilg = 0, eend = 0;
    for (let tries = 0; tries < 200 && (wilg < 3 || eend < 3); tries++) {
      const x = Math.floor(px + (r() - 0.5) * (pr + 3) * 2), y = Math.floor(py + (r() - 0.5) * (pr + 3) * 2);
      if (!World.inb(x, y)) continue;
      const i = World.idx(x, y);
      if (World.terrain[i] === 2 && eend < 3) { Animals.add('eend', x, y); eend++; }
      else if (World.terrain[i] === 1 && wilg < 3 && tryPlace('wilg', x, y)) wilg++;
    }
    World.genMode = false;
  },

  // ---- bouwen -------------------------------------------------------------------
  build(def, x, y, mirror) {
    const c = World.canPlace(def, x, y, mirror);
    if (!c.ok) { if (def.kind !== 'path' && def.kind !== 'terrain') UI.notify(c.reason, 'warn'); return false; }
    if (!Econ.canAfford(def.cost) && this.money < def.cost) { if (this.time - UI.moneyWarn > 2) { UI.moneyWarn = this.time; UI.notify('Niet genoeg geld (' + Util.euro(def.cost) + ' nodig).', 'bad'); } return false; }
    if (def.kind === 'path') { const i = World.idx(x, y); const o = World.objAt(x, y); if (o && DATA.items[o.type].kind === 'pathobj') { /* pad onder pathobj vervangen */ } World.setPath(x, y, def.pathType); World.litter[i] = 0; Econ.expense('bouw', def.cost); return true; }
    if (def.kind === 'terrain') { World.setTerrain(x, y, def.terrain); Econ.expense('terrein', def.cost); for (const a of Animals.list.values()) if (!Animals.allowed(a.kind, a.x, a.y)) { a.hx = a.x; } return true; }
    if (def.kind === 'animal') { Animals.add(def.id, x, y); Econ.expense('bouw', def.cost); return true; }
    const o = World.place(def, x, y, 0, mirror);
    Econ.expense('bouw', def.cost);
    if (c.warn) UI.notify(def.name + ' geplaatst, maar ' + c.warn.toLowerCase() + '. Leg er een pad naartoe.', 'warn');
    if (def.id === 'receptie' && World.listByType('receptie').length === 1) UI.notify('Receptie gebouwd! Zorg dat hij via een pad met de ingang verbonden is.', 'good');
    return o;
  },
  // dragging: bij slepen met het sloopgereedschap alleen paden en begroeiing weghalen, nooit gebouwen
  demolishAt(x, y, dragging) {
    if (!World.inb(x, y)) return;
    const o = World.objAt(x, y);
    if (o) {
      const d = DATA.items[o.type];
      if (d.kind === 'deco') { this.demolishObject(o); return; }
      if (dragging) return;
      if (o.occupant) { UI.notify('Er staan nog gasten op deze plek! Wacht tot ze vertrokken zijn.', 'warn'); return; }
      this.confirmDemolish(o);
      return;
    }
    const i = World.idx(x, y);
    if (World.path[i]) { if (World.isEntrance(x, y) || (x === World.entrance.x && y === World.entrance.y - 1)) { UI.notify('De ingang kan niet weg.', 'warn'); return; } World.clearPath(x, y); World.litter[i] = 0; return; }
  },
  moveObject(o, x, y, mirror) {
    const def = DATA.items[o.type]; const c = World.canPlace(def, x, y, mirror);
    if (!c.ok) { UI.notify(c.reason, 'warn'); return false; }
    World.placeExisting(o, x, y, mirror);
    if (c.warn) UI.notify(def.name + ' verplaatst, maar ' + c.warn.toLowerCase() + '.', 'warn');
    return true;
  },
  rotateObject(o) {
    const def = DATA.items[o.type]; if (!UI.canMirror(def)) return false;
    if (o.occupant) { UI.notify('Er staan nog gasten op deze plek.', 'warn'); return false; }
    for (const gid of [...o.users]) { const g = Guests.guests.get(gid); if (g) Guests.finishUse(g, true); }
    const old = !!o.mirror; World.remove(o);
    const c = World.canPlace(def, o.x, o.y, !old);
    if (c.ok) { World.placeExisting(o, o.x, o.y, !old); return true; }
    World.placeExisting(o, o.x, o.y, old); UI.notify('Gedraaid past het hier niet: ' + c.reason.toLowerCase() + '. Verplaats het object eerst.', 'warn'); return false;
  },
  buyLand(dir) {
    const cost = World.landCost(dir);
    if (!cost) { UI.notify('Aan deze kant is geen grond meer te koop.', 'warn'); return false; }
    if (this.money < cost) { UI.notify('Niet genoeg geld (' + Util.euro(cost) + ' nodig).', 'bad'); return false; }
    World.buyLand(dir); Econ.expense('terrein', cost); this.stats.landBought = (this.stats.landBought || 0) + 1;
    UI.notify('Strook grond gekocht voor ' + Util.euro(cost) + '. Je terrein is nu ' + World.ownedW() + ' × ' + World.ownedH() + ' tegels.', 'good');
    return true;
  },
  confirmDemolish(o) {
    const d = DATA.items[o.type], refund = Math.floor((d.cost || 0) * 0.5);
    UI.confirmDialog(d.name + ' slopen?' + (refund ? ' Je krijgt ' + Util.euro(refund) + ' terug.' : ''), () => { if (World.objects.has(o.id)) this.demolishObject(o); }, 'Slopen');
  },
  sellAnimal(a, ask) {
    const d = DATA.animals[a.kind], price = Math.floor(d.cost * 0.5);
    const doSell = () => { if (!Animals.list.has(a.id)) return; Econ.income('verkoop', price); Animals.remove(a.id); if (UI.selected && UI.selected.kind === 'animal' && UI.selected.id === a.id) UI.select(null); };
    if (ask) UI.confirmDialog(d.name + ' verkopen voor ' + Util.euro(price) + '?', doSell, 'Verkopen'); else doSell();
  },
  demolishObject(o) {
    const def = DATA.items[o.type];
    if (o.occupant) { UI.notify('Er staan nog gasten op deze plek! Wacht tot ze vertrokken zijn.', 'warn'); return; }
    for (const gid of [...o.users]) { const g = Guests.guests.get(gid); if (g) Guests.finishUse(g, true); }
    for (const g of Guests.guests.values()) if (g.insideObj === o.id) g.insideObj = 0;
    World.remove(o);
    const refund = Math.floor((def.cost || 0) * 0.5);
    if (refund) Econ.income('verkoop', refund);
    if (UI.selected && UI.selected.kind === 'obj' && UI.selected.id === o.id) UI.select(null);
  },
  bankrupt() {
    this.setSpeed(0);
    UI.openModal('Failliet?', b => {
      b.innerHTML = '<p>Je staat meer dan € 25.000 rood. ' + (Econ.bailouts === 0 ? 'Een oom is bereid je eenmalig een noodlening van € 40.000 te geven.' : 'Niemand wil je nog geld lenen.') + '</p><div class="menu">' + (Econ.bailouts === 0 ? '<button id="b-loan">Noodlening aannemen</button>' : '') + '<button id="b-new" class="danger">Nieuw spel</button></div>';
      if (document.getElementById('b-loan')) document.getElementById('b-loan').onclick = () => { Econ.bailouts++; Econ.income('lening', 40000); UI.closeModal(); this.setSpeed(1); UI.notify('Noodlening ontvangen. Let goed op je kosten!', 'warn'); };
      document.getElementById('b-new').onclick = () => { UI.closeModal(); this.showStart(); };
    });
  },

  // ---- loop ---------------------------------------------------------------------
  loop(ts) {
    requestAnimationFrame(t2 => this.loop(t2));
    let dt = Math.min(0.1, (ts - this.lastTs) / 1000 || 0); this.lastTs = ts;
    if (!this.started) return;
    // camera met toetsen
    const k = this.keys, sp = 600 * dt / Render.cam.zoom;
    if (k.has('arrowleft') || k.has('a')) Render.cam.x -= sp; if (k.has('arrowright') || k.has('d')) Render.cam.x += sp;
    if (k.has('arrowup') || k.has('w')) Render.cam.y -= sp; if (k.has('arrowdown') || k.has('s')) Render.cam.y += sp;
    if (k.size) Render.clampCamera();
    if (this.speed > 0) {
      let rem = dt * this.speed;
      while (rem > 0) { const st = Math.min(rem, 0.05); this.step(st); rem -= st; }
      this.autosaveTimer += dt; if (this.autosaveTimer > 60) { this.autosaveTimer = 0; this.save(); }
    }
    Render.draw(this.time, dt);
    UI.tick(dt);
  },
  step(dt) {
    this.time += dt; this.t += dt / DATA.DAY_SECONDS;
    if (this.t >= 1) { this.t -= 1; this.day++; Econ.dayRollover(); }
    Guests.update(dt); Staff.update(dt); Animals.update(dt); Econ.computeRating(dt);
    this.milestoneTimer += dt; if (this.milestoneTimer > 3) { this.milestoneTimer = 0; Econ.checkMilestones(); }
  },

  // ---- opslaan / laden ---------------------------------------------------------------
  serialize() {
    const strip = (k, v) => (k.startsWith('_') ? undefined : v);
    const data = {
      v: 2, name: this.name, day: this.day, slot: this.slot, owned: World.owned, entrance: World.entrance, t: this.t, time: this.time, speed: this.speed, weather: this.weather, money: this.money, prices: this.prices, fees: this.fees, stats: this.stats, milestones: this.milestones, seed: this.seed,
      W: World.W, H: World.H, terrain: Array.from(World.terrain), path: Array.from(World.path), litter: Array.from(World.litter), objects: [...World.objects.values()], nextId: World.nextId,
      guests: Guests.serialize(), staff: Staff.serialize(), animals: Animals.serialize(),
      econ: { rating: Econ.rating, ratingDepart: Econ.ratingDepart, ledger: Econ.ledger, bailouts: Econ.bailouts, lastRatingStars: Econ.lastRatingStars },
      cam: Render.cam,
    };
    return JSON.stringify(data, strip);
  },
  save() { if (!this.started) return; try { const s = this.serialize(); localStorage.setItem(SAVE_PREFIX + this.slot, s); localStorage.setItem(META_PREFIX + this.slot, JSON.stringify(this.slotMeta(JSON.parse(s)))); } catch (e) { console.warn('Opslaan mislukt', e); } },
  load(slot) { slot = slot || this.slot; const s = localStorage.getItem(SAVE_PREFIX + slot); if (!s) return false; if (this.loadFromString(s)) { this.slot = slot; return true; } return false; },
  loadFromString(s) {
    let d; try { d = JSON.parse(s); } catch (e) { return false; }
    if (!d || (d.v !== 1 && d.v !== 2)) return false;
    try {
      this.name = d.name; this.day = d.day; this.t = d.t; this.time = d.time; this.speed = 1; this.prevSpeed = 1; this.weather = d.weather; this.money = d.money;
      this.prices = Object.assign({}, DATA.defaultPrices, d.prices); this.fees = Object.assign({}, DATA.defaultFees, d.fees); this.stats = d.stats; this.milestones = d.milestones || {}; this.seed = d.seed || 1;
      World.init(d.W, d.H, d.owned || null, d.entrance || null); World.terrain.set(d.terrain); World.path.set(d.path); World.litter.set(d.litter); World.nextId = d.nextId;
      for (const o of d.objects) { o.users = o.users || []; World.objects.set(o.id, o); for (let dy = 0; dy < o.h; dy++) for (let dx = 0; dx < o.w; dx++) World.obj[World.idx(o.x + dx, o.y + dy)] = o.id; }
      World.pathVersion++;
      Guests.deserialize(d.guests); Staff.deserialize(d.staff); Animals.deserialize(d.animals);
      Econ.reset(); Object.assign(Econ, d.econ);
      Sprites.season = DATA.seasonOf(this.month); Sprites.cache.clear(); UI.previews.clear();
      if (d.cam) Object.assign(Render.cam, d.cam); else Render.centerOnMap();
      UI.select(null); UI.openCategory(null); UI.updateHud();
      this.started = true;
      document.getElementById('startscreen').classList.add('hidden');
      return true;
    } catch (e) { console.error('Laden mislukt', e); return false; }
  },
  exportSave() {
    const blob = new Blob([this.serialize()], { type: 'application/json' }), url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = (this.name || 'camping').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-dag' + this.day + '.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
};

window.addEventListener('DOMContentLoaded', () => Game.init());
