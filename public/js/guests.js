'use strict';
// ---------------------------------------------------------------------------
// Gasten en gezelschappen
// ---------------------------------------------------------------------------
const NEED_RATE = { hunger: 90, hygiene: 70, fun: 95, energy: 80 }; // per dag
const COMPLAINT_WEIGHT = { nofood: 3, nohygiene: 3, nofun: 3, broken: 3, full: 2, dirtyfac: 3, litter: 2, pricey: 2, wait: 1, hungry: 1, dirty: 1, bored: 1, tired: 0.5, dark: 1, rain: 0.5 };
const NEED_PENALTY = { hunger: 0.4, hygiene: 0.4, fun: 0.2, energy: 0.1 }; // tevredenheidsverlies per seconde bij behoefte 100
const THRESH = { hunger: 55, hygiene: 60, fun: 50, energy: 75 };
const SERVICE = { hunger: 'food', hygiene: 'hygiene', fun: 'fun' };
const NEED_NAME = { hunger: 'Honger', hygiene: 'Hygiëne', fun: 'Vermaak', energy: 'Vermoeidheid' };
const WALK_SPEED = 2.4;

const Guests = {
  parties: new Map(), guests: new Map(), nextId: 1,
  notifyCooldown: 0, lastNoReception: -1, lastFullNotify: -1,

  reset() { this.parties = new Map(); this.guests = new Map(); this.nextId = 1; },

  // ---- aanmaken --------------------------------------------------------------
  makeGuest(party, role) {
    const kid = role === 'kid', senior = role === 'senior', youth = role === 'youth';
    const female = Util.chance(0.5);
    const name = kid ? Util.pick(Names.kid) : senior ? Util.pick(Names.senior) : youth ? Util.pick(Names.youth) : (female ? Util.pick(Names.female) : Util.pick(Names.male));
    const g = {
      id: this.nextId++, pid: party.id, name, kid, senior, youth, female,
      shirt: Util.pick(C.shirts), skin: Util.pick(C.skins), hair: senior ? Util.pick(['#d0d0d0', '#eee', '#a0a0a0']) : Util.pick(C.hairs),
      pants: Util.pick(['#3b4a6b', '#555', '#8a6a4a', '#2c3e50', '#6c7a89']),
      dress: female && !kid && Util.chance(0.45), longHair: female && Util.chance(0.6),
      hat: senior && Util.chance(0.4) ? Util.pick(['#d9c9a0', '#8a6a4a']) : null,
      cap: (youth && Util.chance(0.35)) || (kid && Util.chance(0.3)) ? Util.pick(['#e74c3c', '#3498db', '#2c3e50']) : null,
      x: World.entrance.x + 0.5 + Util.rand(-0.25, 0.25), y: World.H + 1.3 + Util.rand(0, 0.8),
      ox: Util.rand(-0.22, 0.22), oy: Util.rand(-0.22, 0.22), phase: Math.random() * 6, dir: -1,
      speed: WALK_SPEED * (kid ? 1.05 : senior ? 0.85 : 1) * Util.rand(0.92, 1.08),
      needs: { hunger: Util.rand(15, 35), hygiene: Util.rand(10, 25), fun: Util.rand(20, 40), energy: Util.rand(10, 25) },
      happy: 65, thoughts: [], lastThought: {}, complaints: {}, trash: false, item: null,
      state: 'enter', goal: 'reception', goalObj: 0, route: null, ri: 0, dest: null, phase2: false,
      timer: 0, hidden: false, insideObj: 0, useObj: 0, sitting: false, swim: false, bounce: false, walking: false, stuck: 0,
    };
    this.guests.set(g.id, g);
    party.members.push(g.id);
    return g;
  },

  partyName(type) {
    const sn = Util.pick(Names.surnames), cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    if (type === 'gezin') return 'Familie ' + cap(sn);
    if (type === 'stel') return Names.adultName() + ' & ' + Names.adultName();
    if (type === 'jongeren') return 'Vrienden uit ' + Util.pick(Names.cities);
    return 'Echtpaar ' + cap(sn);
  },

  trySpawn(dt) {
    if (Game.t < 0.3 || Game.t > 0.8) return;
    let spots = 0; for (const o of World.objects.values()) if (DATA.items[o.type].kind === 'spot') spots++;
    if (!spots) return;
    const season = DATA.seasonFactor[Game.month];
    const rating = Econ.rating / 100;
    const weather = Game.weather === 'regen' ? 0.55 : Game.weather === 'bewolkt' ? 0.85 : 1;
    const perDay = (2 + spots * 0.45) * season * (0.4 + rating * 0.8) * weather;
    if (Math.random() < perDay * dt / (0.47 * DATA.DAY_SECONDS)) this.createParty();
  },

  createParty(forceWant) {
    const winter = DATA.seasonOf(Game.month) === 'winter';
    const type = Util.weighted(Object.entries(DATA.partyTypes).map(([k, v]) => [k, v.weight * (winter && (k === 'jongeren') ? 0.3 : 1)]));
    const pt = DATA.partyTypes[type];
    // welke types bestaan er op de camping?
    const existing = new Set();
    for (const o of World.objects.values()) { const d = DATA.items[o.type]; if (d.kind === 'spot') d.accepts.forEach(a => existing.add(a)); }
    const onlyExisting = Util.chance(0.85);
    let pairs = Object.entries(pt.wants).map(([k, w]) => [k, w * ((winter && (k === 'tent' || k === 'caravan' || k === 'camper')) ? 0.08 : 1) * (onlyExisting && !existing.has(k) ? 0 : 1)]).filter(p => p[1] > 0);
    if (!pairs.length) pairs = Object.entries(pt.wants);
    const want = forceWant || Util.weighted(pairs);
    const st = Game.stats;
    // vrije plek zoeken
    let cands = [];
    for (const o of World.objects.values()) { const d = DATA.items[o.type]; if (d.kind === 'spot' && d.accepts.includes(want) && !o.occupant && World.isReachable(o)) cands.push(o); }
    if (!cands.length) {
      if (existing.has(want)) { st.turnedAwayFull++; if (Game.day !== this.lastFullNotify && Util.chance(0.5)) { this.lastFullNotify = Game.day; UI.notify('Gasten kwamen voor een ' + DATA.wantNames[want] + ', maar alles is bezet (of onbereikbaar).', 'warn'); } }
      else { st.missedType[want] = (st.missedType[want] || 0) + 1; }
      return null;
    }
    // beste plek: comfort + sfeer + toeval
    for (const o of cands) o._amb = World.spotAmbience(o);
    cands.sort((a, b) => (DATA.items[b.type].comfort + b._amb * 2 + Util.hash2(b.id, Game.day)) - (DATA.items[a.type].comfort + a._amb * 2 + Util.hash2(a.id, Game.day)));
    const spot = cands[0], sdef = DATA.items[spot.type];
    const price = Game.prices[spot.type];
    const willingness = DATA.baseWillingness[want] * pt.budget * (0.7 + Econ.rating / 100 * 0.6) * (1 + spot._amb * 0.8) * (sdef.comfort / Math.max(1, sdef.comfort));
    if (price > willingness * 1.2) { st.turnedAwayPrice++; return null; }
    // receptie
    const rec = World.listByType('receptie').find(o => World.isReachable(o) && !o.broken);
    if (!rec) { st.noReception++; if (Game.day !== this.lastNoReception) { this.lastNoReception = Game.day; UI.notify('Gasten kwamen aan, maar er is geen bereikbare receptie om in te checken!', 'bad'); } return null; }
    // gezelschap
    const p = { id: this.nextId++, name: this.partyName(type), type, want, spot: spot.id, members: [], nights: Util.randInt(pt.nights[0], pt.nights[1]),
      arrivedDay: Game.day, leaving: false, vehicle: ['tent', 'caravan', 'camper'].includes(want) ? want : null, color: Util.randInt(0, 5),
      ambience: spot._amb, pricey: price > willingness * 0.9, cheap: price < willingness * 0.5, checkedIn: false, nightsPaid: 0, early: false };
    this.parties.set(p.id, p);
    spot.occupant = p.id;
    if (type === 'gezin') { this.makeGuest(p, 'adult'); this.makeGuest(p, 'adult'); const k = Util.randInt(1, 3); for (let i = 0; i < k; i++) this.makeGuest(p, 'kid'); }
    else if (type === 'stel') { this.makeGuest(p, 'adult'); this.makeGuest(p, 'adult'); }
    else if (type === 'jongeren') { const k = Util.randInt(3, 5); for (let i = 0; i < k; i++) this.makeGuest(p, 'youth'); }
    else { this.makeGuest(p, 'senior'); if (Util.chance(0.85)) this.makeGuest(p, 'senior'); }
    for (const gid of p.members) { const g = this.guests.get(gid); g.goalObj = rec.id; this.think(g, 'arrive'); if (p.pricey) this.think(g, 'pricey'); if (p.cheap) { this.think(g, 'cheap'); g.happy += 5; } }
    st.totalParties++; st.totalGuests += p.members.length;
    if (this.notifyCooldown <= 0) { UI.notify(p.name + ' (' + p.members.length + ' pers.) komt aan voor ' + p.nights + ' nachten op een ' + sdef.name.toLowerCase() + '.', 'info'); this.notifyCooldown = 6; }
    return p;
  },

  // ---- gedachten -------------------------------------------------------------
  think(g, key, x) {
    const now = Game.time;
    if (g.lastThought[key] && now - g.lastThought[key] < 40) return;
    g.lastThought[key] = now;
    let t = Util.pick(DATA.thoughts[key]); if (x) t = t.replace('{x}', x);
    g.thoughts.unshift({ t, day: Game.day });
    if (g.thoughts.length > 6) g.thoughts.length = 6;
    if (DATA.complaintNames[key]) { if (!g.complaints) g.complaints = {}; g.complaints[key] = (g.complaints[key] || 0) + 1; }
  },

  // ---- reizen ----------------------------------------------------------------
  onPath(g) { return World.hasPath(Math.floor(g.x), Math.floor(g.y)); },
  startTrip(g, goal, obj) {
    g.goal = goal; g.goalObj = obj ? obj.id : 0; g.sitting = false; g.swim = false; g.bounce = false; g.hidden = false;
    if (!this.onPath(g)) {
      const cur = g.insideObj ? World.objects.get(g.insideObj) : null;
      let door = cur ? World.nearestDoor(cur, g.x, g.y) : null;
      if (!door) { // probeer een padtegel vlakbij
        let best = null, bd = 9;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const tx = Math.floor(g.x) + dx, ty = Math.floor(g.y) + dy; if (World.hasPath(tx, ty)) { World.recomputeReach(); if (!World.reach[World.idx(tx, ty)]) continue; const d = Math.abs(dx) + Math.abs(dy); if (d < bd) { bd = d; best = [tx, ty]; } } }
        door = best;
      }
      if (!door) { this.setStuck(g); return; }
      g.dest = [door[0] + 0.5 + g.ox, door[1] + 0.5 + g.oy]; g.route = null; g.phase2 = true; g.state = 'walk';
      return;
    }
    this.computeRoute(g);
  },
  computeRoute(g) {
    const sx = Math.floor(g.x), sy = Math.floor(g.y);
    let goals = null, route = null;
    if (g.goal === 'exit') goals = new Set([World.idx(World.entrance.x, World.entrance.y)]);
    else if (g.goal === 'home') { const sp = World.objects.get(this.parties.get(g.pid).spot); goals = sp ? new Set(World.doorTiles(sp).map(t => World.idx(t[0], t[1]))) : null; }
    else if (g.goal === 'facility' || g.goal === 'reception') { const o = World.objects.get(g.goalObj); goals = o ? new Set(World.doorTiles(o).map(t => World.idx(t[0], t[1]))) : null; }
    else if (g.goal === 'wander') { const t = World.randomReachableTile(sx, sy, 14); goals = t ? new Set([World.idx(t[0], t[1])]) : null; }
    if (goals && goals.size) route = World.bfs(sx, sy, goals);
    if (!route) {
      if (g.goal === 'exit') { this.setStuck(g, true); return; }
      if (g.goal === 'home') { this.setStuck(g); return; }
      g.state = 'idle'; g.timer = 1.5; return;
    }
    g.route = route; g.ri = 0; g.dest = null; g.phase2 = false; g.state = 'walk';
    if (!route.length) this.handleArrival(g);
  },
  setStuck(g, exiting) {
    g.state = 'stuck'; g.timer = exiting ? 6 : 12; g.route = null; g.dest = null;
    if (!exiting) { this.think(g, 'wait'); g.happy -= 2; }
  },
  moveEntity(g, dt) {
    let tx, ty;
    if (g.route && g.ri < g.route.length) { const t = g.route[g.ri]; tx = t[0] + 0.5 + g.ox; ty = t[1] + 0.5 + g.oy; }
    else if (g.dest) { tx = g.dest[0]; ty = g.dest[1]; }
    else { g.walking = false; return true; }
    const dx = tx - g.x, dy = ty - g.y, d = Math.sqrt(dx * dx + dy * dy), step = g.speed * dt;
    if (Math.abs(dx - dy) > 0.02) g.dir = (dx - dy) > 0 ? 1 : -1;
    g.walking = true;
    if (d <= step) {
      g.x = tx; g.y = ty;
      if (g.route && g.ri < g.route.length) { g.ri++; if (g.ri >= g.route.length) { g.route = null; if (!g.dest) { g.walking = false; return true; } } }
      else { g.dest = null; g.walking = false; return true; }
      return false;
    }
    g.x += dx / d * step; g.y += dy / d * step;
    return false;
  },

  // ---- aankomst bij doel ------------------------------------------------------
  handleArrival(g) {
    const p = this.parties.get(g.pid);
    if (g.goal === 'exit') { g.dest = [World.entrance.x + 0.5 + g.ox, World.H + 1.6]; g.goal = 'gone'; g.state = 'walk'; g.insideObj = 0; return; }
    if (g.goal === 'gone') { this.removeGuest(g); return; }
    if (g.goal === 'reception') {
      const o = World.objects.get(g.goalObj);
      if (o && !o.broken) { this.enter(g, o, 'checkin'); return; }
      g.goal = 'home'; this.startTrip(g, 'home'); return;
    }
    if (g.goal === 'home') {
      const sp = World.objects.get(p.spot); if (!sp) { this.startTrip(g, 'exit'); return; }
      g.insideObj = sp.id; g.dest = World.randomZonePoint(sp); g.goal = 'homeIn'; g.state = 'walk'; return;
    }
    if (g.goal === 'homeIn') {
      if (Game.isNight() && !p.leaving) { g.state = 'sleep'; g.hidden = true; g.walking = false; return; }
      g.state = 'home'; g.timer = Util.rand(3, 9); g.walking = false;
      if (p.ambience > 0.25) this.think(g, 'nature');
      return;
    }
    if (g.goal === 'facility') {
      const o = World.objects.get(g.goalObj);
      if (!o || o.broken || !o.open) { if (o && o.broken) { this.think(g, 'broken', DATA.items[o.type].name); g.happy -= 3; } this.decide(g); return; }
      const def = DATA.items[o.type];
      if (o.users.length >= def.capacity) { g.state = 'wait'; g.timer = 10; g.walking = false; this.think(g, 'wait'); return; }
      this.enter(g, o, g.need);
      return;
    }
    if (g.goal === 'wander') { g.state = 'idle'; g.timer = Util.rand(1, 3); return; }
    this.decide(g);
  },

  enter(g, o, need) {
    const def = DATA.items[o.type];
    o.users.push(g.id); o.uses = (o.uses || 0) + 1; Game.stats.uses = Game.stats.uses || {}; Game.stats.uses[o.type] = (Game.stats.uses[o.type] || 0) + 1;
    g.useObj = o.id; g.insideObj = o.id; g.need = need; g.state = 'use'; g.timer = (def.duration || 3) * Util.rand(0.8, 1.2); g.route = null;
    if (def.indoor) { g.hidden = true; g.dest = null; }
    else if (def.style === 'inside' || def.style === 'swim' || def.style === 'bounce') { g.dest = World.randomZonePoint(o); g.swim = def.style === 'swim'; g.bounce = def.style === 'bounce'; }
    else if (def.style === 'around') { g.dest = World.randomZonePoint(o); }
    else if (def.style === 'sit') { const n = o.users.length - 1; g.dest = [o.x + 0.3 + (n % 2) * 0.4, o.y + 0.5 + (n > 1 ? 0.2 : 0)]; g.sitting = true; }
    else g.dest = null;
    // betalen
    if (def.feeKey) {
      const fee = Game.fees[def.feeKey], base = DATA.defaultFees[def.feeKey];
      Econ.income(def.feeKey, fee);
      if (fee > base * 1.4) { g.happy -= 2; this.think(g, 'pricey'); }
    }
    if (def.dirtRate) o.dirt = Math.min(100, o.dirt + def.dirtRate);
    if (def.breakable) {
      o.cond = Math.max(0, o.cond - (def.wear || 1) * 0.12);
      if (o.cond < 45 && Util.chance(Math.pow((45 - o.cond) / 45, 2) * 0.03)) this.breakdown(o);
    }
  },
  breakdown(o) {
    if (o.broken) return;
    o.broken = true;
    const def = DATA.items[o.type];
    for (const gid of [...o.users]) { const g = this.guests.get(gid); if (g) { this.think(g, 'broken', def.name); g.happy -= 4; this.finishUse(g, true); } }
    UI.notify(def.name + ' is kapot! Een onderhoudsmonteur kan het repareren.', 'bad');
    Game.stats.breakdowns++;
  },
  finishUse(g, aborted) {
    const o = World.objects.get(g.useObj);
    if (o) { const k = o.users.indexOf(g.id); if (k >= 0) o.users.splice(k, 1); }
    g.useObj = 0; g.hidden = false; g.sitting = false; g.swim = false; g.bounce = false; g.dest = null;
    if (!o || aborted) { g.state = 'idle'; g.timer = 0.5; return; }
    const def = DATA.items[o.type];
    if (def.service === 'checkin') {
      const p = this.parties.get(g.pid); p.checkedIn = true;
      if (World.has('slagboom')) g.happy += 2;
      this.startTrip(g, 'home'); return;
    }
    if (def.service && g.need) {
      const needKey = Object.keys(SERVICE).find(k => SERVICE[k] === def.service) || (def.service === 'rest' ? 'energy' : null);
      if (needKey) g.needs[needKey] = Math.max(0, g.needs[needKey] - (def.amount || 50));
      let bonus = 4 + def.quality * 2.5;
      if (def.dirtRate) { bonus *= (1 - o.dirt / 150); if (o.dirt > 60) { this.think(g, 'dirtyfac'); bonus -= 4; } }
      if (def.outdoor && Game.weather === 'regen') bonus -= 3;
      if (def.sunBonus && Game.weather === 'zon') bonus += 3;
      if (def.rainBonus && Game.weather === 'regen') bonus += 3;
      g.happy += bonus;
      if (def.service === 'food') { this.think(g, 'goodfood'); g.trash = !!(o.type === 'snackbar' || Util.chance(0.5)); g.item = o.type === 'winkeltje' ? 'tas' : 'eten'; g.itemTimer = 8; }
      else if (def.service === 'hygiene') this.think(g, 'goodhyg');
      else if (def.service === 'fun') { if (o.type === 'zwembad') this.think(g, 'swim'); else if (o.type === 'dierenweide') this.think(g, 'animals'); else if (o.type === 'kampvuurplaats') this.think(g, 'campfire'); else this.think(g, 'goodfun'); }
    }
    g.happy = Util.clamp(g.happy, 0, 100);
    g.state = 'idle'; g.timer = Util.rand(0.3, 1.2);
  },

  // ---- beslissen -------------------------------------------------------------
  audiencePref(def, g, p) {
    if (!def.aud) return 1;
    return g.kid ? def.aud.kid : def.aud[p.type];
  },
  findFacility(g, service) {
    const p = this.parties.get(g.pid);
    let sx = Math.floor(g.x), sy = Math.floor(g.y);
    if (!World.hasPath(sx, sy)) { const cur = g.insideObj ? World.objects.get(g.insideObj) : null; const d = cur ? World.nearestDoor(cur, g.x, g.y) : null; if (!d) return null; sx = d[0]; sy = d[1]; }
    const dist = World.distField(sx, sy);
    const evening = Game.isEvening(), rain = Game.weather === 'regen', winter = DATA.seasonOf(Game.month) === 'winter';
    const cands = [];
    for (const o of World.objects.values()) {
      const def = DATA.items[o.type];
      if (def.service !== service || o.broken || !o.open) continue;
      if (o.users.length >= def.capacity + 2) continue;
      if (def.evening && !evening) continue;
      if (def.noRain && rain) continue; if (def.noWinter && winter) continue;
      if (def.outdoor && rain && !def.rainBonus && Util.hash2(o.id, Game.day) < 0.6) continue;
      const pref = this.audiencePref(def, g, p); if (pref <= 0.05) continue;
      const doors = World.doorTiles(o); if (!doors.length) continue;
      let dd = 1e9; for (const t of doors) { const v = dist[World.idx(t[0], t[1])]; if (v >= 0 && v < dd) dd = v; }
      if (dd >= 1e9) continue;
      let score = pref * (def.quality || 1) / (1 + dd / 10) * Util.rand(0.75, 1.25);
      if (def.feeKey) { const ratio = Game.fees[def.feeKey] / DATA.defaultFees[def.feeKey]; score *= Util.clamp(1.5 - ratio * 0.5, 0.15, 1.1); if (p.type === 'jongeren' && ratio > 1) score *= 0.8; }
      if (def.dirtRate && o.dirt > 70) score *= 0.6;
      if (o.users.length >= def.capacity) score *= 0.5;
      if (def.rainBonus && rain) score *= 1.8;
      if (def.sunBonus && Game.weather === 'zon') score *= 1.4;
      if (def.evening && evening) score *= 1.6;
      cands.push([o, score * score]);
    }
    if (!cands.length) return null;
    return Util.weighted(cands); // gewogen toeval: niet iedereen naar dezelfde voorziening
  },
  decide(g) {
    const p = this.parties.get(g.pid);
    if (p.leaving) { this.startTrip(g, 'exit'); return; }
    if (Game.isNight()) { if (g.insideObj === p.spot && !this.onPath(g)) { g.state = 'sleep'; g.hidden = true; return; } this.startTrip(g, 'home'); return; }
    const order = Object.keys(THRESH).filter(k => g.needs[k] > THRESH[k]).sort((a, b) => (g.needs[b] - THRESH[b]) - (g.needs[a] - THRESH[a]));
    for (const need of order) {
      if (need === 'energy') {
        if (g.insideObj === p.spot && g.state !== 'walk' && !this.onPath(g)) { g.state = 'home'; g.timer = Util.rand(5, 10); return; }
        const b = this.findFacility(g, 'rest');
        if (b && Util.chance(0.5)) { g.need = 'energy'; this.startTrip(g, 'facility', b); return; }
        this.startTrip(g, 'home'); return;
      }
      const f = this.findFacility(g, SERVICE[need]);
      Game.stats.dec = Game.stats.dec || {}; Game.stats.dec[need + (f ? '+' : '-')] = (Game.stats.dec[need + (f ? '+' : '-')] || 0) + 1;
      if (f) { g.need = need; this.startTrip(g, 'facility', f); return; }
      g.happy -= need === 'fun' ? 1 : 3;
      this.think(g, need === 'hunger' ? 'nofood' : need === 'hygiene' ? 'nohygiene' : 'nofun');
    }
    // niets dringends
    const r = Math.random();
    if (r < 0.45 && g.insideObj === p.spot && !this.onPath(g)) { g.state = 'home'; g.timer = Util.rand(3, 8); g.dest = World.randomZonePoint(World.objects.get(p.spot)); return; }
    if (r < 0.75 && g.needs.fun > 25) { const f = this.findFacility(g, 'fun'); if (f) { g.need = 'fun'; this.startTrip(g, 'facility', f); return; } }
    if (r < 0.85) { this.startTrip(g, 'wander'); return; }
    this.startTrip(g, 'home');
  },

  // ---- update ---------------------------------------------------------------
  update(dt) {
    this.notifyCooldown -= dt;
    this.trySpawn(dt);
    for (const p of this.parties.values()) this.updateParty(p);
    for (const g of this.guests.values()) this.updateGuest(g, dt);
  },
  updateParty(p) {
    if (p.leaving) { if (!p.members.length) this.departed(p); return; }
    const depart = Game.day >= p.arrivedDay + p.nights && Game.t >= 0.33;
    let early = false;
    if (!depart && Game.t > 0.5 && Game.day > p.arrivedDay) {
      let sum = 0; for (const id of p.members) sum += this.guests.get(id).happy;
      if (sum / p.members.length < 15) early = true;
    }
    if (depart || early) {
      p.leaving = true; p.early = early;
      const avg = this.partyHappiness(p); p.finalHappy = avg;
      for (const id of p.members) {
        const g = this.guests.get(id);
        if (g.state === 'use') this.finishUse(g, true);
        g.hidden = false;
        this.think(g, avg < 40 ? 'leavebad' : 'leave');
        this.startTrip(g, 'exit');
      }
      const reasons = this.partyReasons(p);
      Game.stats.departLog = Game.stats.departLog || [];
      Game.stats.departLog.unshift({ name: p.name, type: p.type, day: Game.day, happy: Math.round(avg), early, reasons });
      if (Game.stats.departLog.length > 12) Game.stats.departLog.length = 12;
      if (early) UI.notify(p.name + ' vertrekt vroegtijdig, ontevreden over: ' + (reasons.join(', ') || 'van alles') + '.', 'bad');
    }
  },
  partyReasons(p) {
    const tot = {};
    for (const id of p.members) { const g = this.guests.get(id); if (!g || !g.complaints) continue; for (const k in g.complaints) tot[k] = (tot[k] || 0) + g.complaints[k] * (COMPLAINT_WEIGHT[k] || 1); }
    return Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => DATA.complaintNames[e[0]]);
  },
  partyHappiness(p) { let s = 0, n = 0; for (const id of p.members) { const g = this.guests.get(id); if (g) { s += g.happy; n++; } } return n ? s / n : 50; },
  departed(p) {
    const sp = World.objects.get(p.spot); if (sp && sp.occupant === p.id) sp.occupant = 0;
    this.parties.delete(p.id);
  },
  removeGuest(g) {
    const p = this.parties.get(g.pid);
    if (p) { const k = p.members.indexOf(g.id); if (k >= 0) p.members.splice(k, 1); if (!p.members.length) { Econ.recordDeparture(p.finalHappy !== undefined ? p.finalHappy : g.happy, p); this.departed(p); } }
    if (g.useObj) this.finishUse(g, true);
    this.guests.delete(g.id);
    if (UI.selected && UI.selected.kind === 'guest' && UI.selected.id === g.id) UI.select(null);
  },
  updateGuest(g, dt) {
    const p = this.parties.get(g.pid);
    if (!p) { this.guests.delete(g.id); return; }
    const pt = DATA.partyTypes[p.type];
    // behoeften
    if (g.state !== 'sleep') {
      for (const k in NEED_RATE) {
        let r = NEED_RATE[k] / DATA.DAY_SECONDS * (pt.needMul[k] || 1);
        if (g.kid) r *= k === 'fun' ? 1.2 : k === 'hygiene' ? 0.7 : 1;
        if (k === 'energy' && g.state === 'home') r = -12; // uitrusten
        if (k === 'fun') { if (g.state === 'home') r = -(0.6 + Math.max(0, p.ambience) * 2.5); else if (g.state === 'walk' && g.goal === 'wander') r = -0.5; } // relaxen bij de tent en rondwandelen is ook vakantie
        g.needs[k] = Util.clamp(g.needs[k] + r * dt, 0, 100);
        if (g.needs[k] > 80 && !p.leaving) g.happy -= (g.needs[k] - 80) / 20 * NEED_PENALTY[k] * dt;
      }
      if (g.needs.hunger > 85) this.think(g, 'hungry'); if (g.needs.hygiene > 85) this.think(g, 'dirty'); if (g.needs.fun > 85) this.think(g, 'bored'); if (g.needs.energy > 90) this.think(g, 'tired');
      if (Game.weather === 'regen' && !g.hidden) { g.happy -= 0.12 * dt; if (Util.chance(dt * 0.02)) this.think(g, 'rain'); }
      if (Game.weather === 'zon' && !g.hidden && Util.chance(dt * 0.004)) { this.think(g, 'sun'); g.happy += 0.5; }
      if (g.state === 'home') g.happy += (0.25 + p.ambience * 1.5) * dt * (g.happy < 85 ? 1 : 0);
    }
    if (g.itemTimer > 0) { g.itemTimer -= dt; if (g.itemTimer <= 0) g.item = null; }
    g.happy = Util.clamp(g.happy, 0, 100);

    switch (g.state) {
      case 'enter': {
        g.dest = [World.entrance.x + 0.5 + g.ox, World.entrance.y + 0.5 + g.oy];
        if (this.moveEntity(g, dt)) { g.state = 'walk'; g.goal = 'reception'; this.computeRoute(g); }
        break;
      }
      case 'walk': {
        const prevTile = (Math.floor(g.x)) + ',' + Math.floor(g.y);
        const arrived = this.moveEntity(g, dt);
        const tile = Math.floor(g.x) + ',' + Math.floor(g.y);
        if (tile !== prevTile) this.onNewTile(g, p);
        if (arrived) { if (g.phase2) { g.phase2 = false; this.computeRoute(g); } else this.handleArrival(g); }
        else if (g.goal === 'facility' && Game.isNight() && g.ri % 3 === 0 && Util.chance(0.3)) { this.startTrip(g, 'home'); }
        break;
      }
      case 'home': {
        if (g.dest) this.moveEntity(g, dt); else g.walking = false;
        g.timer -= dt;
        if (g.timer <= 0) { const urgent = Object.keys(THRESH).some(k => g.needs[k] > THRESH[k]); if (!urgent && Util.chance(0.5)) { const sp = World.objects.get(p.spot); if (sp) g.dest = World.randomZonePoint(sp); g.timer = Util.rand(3, 8); this.maybeIdleThink(g, p); } else this.decide(g); }
        break;
      }
      case 'idle': { g.walking = false; g.timer -= dt; if (g.timer <= 0) this.decide(g); break; }
      case 'use': {
        if (g.dest) this.moveEntity(g, dt); else g.walking = false;
        g.timer -= dt;
        if (g.timer <= 0) this.finishUse(g);
        break;
      }
      case 'wait': {
        g.walking = false;
        const o = World.objects.get(g.goalObj);
        if (!o || o.broken) { this.decide(g); break; }
        if (o.users.length < DATA.items[o.type].capacity) { this.enter(g, o, g.need); break; }
        g.timer -= dt;
        if (g.timer <= 0) { g.happy -= 4; this.think(g, 'full', DATA.items[o.type].name.toLowerCase()); Game.stats.queueGiveUps++; g.state = 'idle'; g.timer = 0.5; }
        break;
      }
      case 'sleep': {
        g.hidden = true; g.walking = false;
        if (!Game.isNight()) { g.hidden = false; g.needs.energy = 5; g.happy = Math.min(100, g.happy + 3); if (Util.chance(0.3)) this.think(g, 'sleep'); g.state = 'home'; g.timer = Util.rand(2, 6); }
        if (p.leaving) { g.hidden = false; this.startTrip(g, 'exit'); }
        break;
      }
      case 'stuck': {
        g.walking = false; g.timer -= dt;
        if (g.timer <= 0) {
          if (g.goal === 'exit' || g.goal === 'gone') { this.removeGuest(g); break; }
          // teleporteer naar de ingang als er echt geen weg is
          g.x = World.entrance.x + 0.5; g.y = World.entrance.y + 0.5; g.insideObj = 0; g.happy -= 5; this.decide(g);
        }
        break;
      }
    }
  },
  maybeIdleThink(g, p) {
    if (p.ambience > 0.3 && Util.chance(0.2)) this.think(g, 'nature');
  },
  onNewTile(g, p) {
    const tx = Math.floor(g.x), ty = Math.floor(g.y);
    if (!World.inb(tx, ty)) return;
    const i = World.idx(tx, ty);
    if (g.trash) {
      if (World.binNear(tx, ty, 2)) { g.trash = false; }
      else if (Util.chance(p.type === 'jongeren' ? 0.3 : 0.12)) { if (World.path[i] && World.litter[i] < 6) World.litter[i]++; g.trash = false; }
    }
    if (World.litter[i] >= 2) { g.happy -= 0.8; this.think(g, 'litter'); }
    if (Game.isNight() && !World.lampNear(tx, ty, 3)) { g.happy -= 0.15; if (Util.chance(0.3)) this.think(g, 'dark'); }
    // dieren in de buurt
    for (const a of Animals.list.values()) { if (Math.abs(a.x - g.x) < 2 && Math.abs(a.y - g.y) < 2) { g.needs.fun = Math.max(0, g.needs.fun - (g.kid ? 6 : 2)); g.happy += 0.3; this.think(g, 'animals'); break; } }
  },

  // ---- hulp ---------------------------------------------------------------------
  statusText(g) {
    const p = this.parties.get(g.pid);
    const o = g.useObj ? World.objects.get(g.useObj) : null;
    switch (g.state) {
      case 'enter': case 'walk': return g.goal === 'exit' || g.goal === 'gone' ? 'Vertrekt naar huis' : g.goal === 'reception' ? 'Op weg naar de receptie' : g.goal === 'home' || g.goal === 'homeIn' ? 'Op weg naar de staplek' : g.goal === 'facility' ? 'Op weg naar ' + (World.objects.get(g.goalObj) ? DATA.items[World.objects.get(g.goalObj).type].name.toLowerCase() : '...') : 'Wandelt rond';
      case 'home': return 'Bij de ' + (p && World.objects.get(p.spot) ? DATA.items[World.objects.get(p.spot).type].name.toLowerCase() : 'staplek');
      case 'use': return o ? (DATA.items[o.type].hideText ? Util.cap(DATA.items[o.type].hideText) : DATA.items[o.type].service === 'checkin' ? 'Checkt in' : 'Bij ' + DATA.items[o.type].name.toLowerCase()) : 'Bezig';
      case 'wait': return 'Wacht in de rij';
      case 'sleep': return 'Slaapt';
      case 'stuck': return 'Kan de weg niet vinden!';
      default: return 'Denkt na';
    }
  },
  serialize() {
    return { nextId: this.nextId, parties: [...this.parties.values()], guests: [...this.guests.values()].map(g => Object.assign({}, g, { lastThought: {} })) };
  },
  deserialize(d) {
    this.reset(); this.nextId = d.nextId;
    for (const p of d.parties) this.parties.set(p.id, p);
    for (const g of d.guests) this.guests.set(g.id, g);
  },
};
