'use strict';
// ---------------------------------------------------------------------------
// Personeel en dieren
// ---------------------------------------------------------------------------
const Staff = {
  list: new Map(), nextId: 1, claims: new Map(),
  reset() { this.list = new Map(); this.nextId = 1; this.claims = new Map(); },
  hire(role) {
    const def = DATA.staff[role];
    const s = { id: this.nextId++, role, name: Names.adultName() + ' ' + Util.pick(Names.surnames), hired: Game.day,
      x: World.entrance.x + 0.5, y: World.entrance.y + 0.5, ox: Util.rand(-0.2, 0.2), oy: Util.rand(-0.2, 0.2), dir: -1, phase: Math.random() * 6,
      speed: 2.6, skin: Util.pick(C.skins), hair: Util.pick(C.hairs), shirt: def.color, pants: role === 'schoonmaker' ? '#2a4d8f' : role === 'monteur' ? '#4a4a4a' : role === 'tuinman' ? '#5a4a3a' : '#333',
      state: 'idle', task: null, target: 0, route: null, ri: 0, dest: null, timer: Util.rand(0, 1), hidden: false, walking: false, idleTime: 0,
      tasksDone: 0, focus: 'alles' };
    this.list.set(s.id, s);
    UI.notify(def.name + ' ' + s.name + ' is in dienst genomen (' + Util.euro(def.wage) + ' per dag).', 'info');
    return s;
  },
  fire(id) { const s = this.list.get(id); if (!s) return; this.list.delete(id); UI.notify(DATA.staff[s.role].name + ' ' + s.name + ' is ontslagen.', 'info'); if (UI.selected && UI.selected.kind === 'staff' && UI.selected.id === id) UI.select(null); },
  update(dt) { for (const s of this.list.values()) this.updateOne(s, dt); },
  routeTo(s, goals) {
    const sx = Math.floor(s.x), sy = Math.floor(s.y);
    if (!World.hasPath(sx, sy)) { s.x = World.entrance.x + 0.5; s.y = World.entrance.y + 0.5; return false; }
    const r = World.bfs(sx, sy, goals);
    if (!r) return false;
    s.route = r; s.ri = 0; s.dest = null; s.state = 'walk'; return true;
  },
  goToObject(s, o, task) {
    const doors = World.doorTiles(o); if (!doors.length) return false;
    if (!this.routeTo(s, new Set(doors.map(t => World.idx(t[0], t[1]))))) return false;
    s.task = task; s.target = o.id; return true;
  },
  wander(s) {
    const t = World.randomReachableTile(Math.floor(s.x), Math.floor(s.y), 10);
    if (t && this.routeTo(s, new Set([World.idx(t[0], t[1])]))) { s.task = 'wander'; return; }
    s.state = 'idle'; s.timer = 2;
  },
  pickTask(s) {
    World.recomputeReach();
    if (s.role === 'schoonmaker') {
      this.releaseClaims(s);
      const focus = s.focus || 'alles', sx = Math.floor(s.x), sy = Math.floor(s.y);
      let litterRoute = null;
      if (focus !== 'sanitair') litterRoute = World.bfs(sx, sy, i => World.litter[i] > 0 && !this.claimedTile(i, s.id));
      let san = null;
      if (focus !== 'afval') {
        const thr = focus === 'sanitair' ? 15 : (s.idleTime > 20 ? 15 : 25);
        const list = [...World.objects.values()].filter(o => DATA.items[o.type].dirtRate && o.dirt > thr && World.isReachable(o) && !this.claimedObject(o, s.id)).sort((a, b) => b.dirt - a.dirt);
        san = list[0] || null;
      }
      // sanitair gaat voor als het echt vies is of het afval ver weg ligt; anders het afval
      if (san && (!litterRoute || san.dirt > 55 || litterRoute.length > 12)) { if (this.goToObject(s, san, 'clean')) { san.cleanerId = s.id; return; } }
      if (litterRoute) {
        s.route = litterRoute; s.ri = 0; s.state = 'walk'; s.task = 'litter'; s.target = 0;
        const last = litterRoute.length ? litterRoute[litterRoute.length - 1] : [sx, sy];
        s.claim = World.idx(last[0], last[1]); this.claims.set(s.claim, s.id); return;
      }
      if (san && this.goToObject(s, san, 'clean')) { san.cleanerId = s.id; return; }
      this.wander(s); return;
    }
    if (s.role === 'monteur') {
      const broken = [...World.objects.values()].filter(o => o.broken && World.isReachable(o));
      broken.sort((a, b) => (Math.abs(a.x - s.x) + Math.abs(a.y - s.y)) - (Math.abs(b.x - s.x) + Math.abs(b.y - s.y)));
      for (const o of broken) if (this.goToObject(s, o, 'repair')) return;
      const worn = [...World.objects.values()].filter(o => DATA.items[o.type].breakable && !o.broken && o.cond < 60 && World.isReachable(o)).sort((a, b) => a.cond - b.cond);
      for (const o of worn) if (this.goToObject(s, o, 'service')) return;
      this.wander(s); return;
    }
    if (s.role === 'tuinman') {
      this.releaseClaims(s);
      let best = null, bs = 0;
      for (const o of World.objects.values()) {
        const d = DATA.items[o.type]; if (!d.care) continue;
        const care = World.careOf(o); if (care > 65) continue;
        if (o.gardenerId && o.gardenerId !== s.id) { const g = this.list.get(o.gardenerId); if (g && g.task === 'tend' && g.target === o.id) continue; }
        if (!World.stagingTile(o)) continue;
        const score = (100 - care) * (d.nature || 1.2) / (1 + (Math.abs(o.x - s.x) + Math.abs(o.y - s.y)) / 8);
        if (score > bs) { bs = score; best = o; }
      }
      if (best) { const st = World.stagingTile(best); if (this.routeTo(s, new Set([World.idx(st[0], st[1])]))) { s.task = 'tend'; s.target = best.id; best.gardenerId = s.id; return; } }
      this.wander(s); return;
    }
    if (s.role === 'animator') {
      if (Game.isEvening()) {
        const fires = World.listByType('kampvuurplaats').filter(o => World.isReachable(o));
        if (fires.length && Util.chance(0.7)) { const o = Util.pick(fires); if (this.goToObject(s, o, 'campfire')) return; }
      }
      const gs = [...Guests.guests.values()].filter(g => !g.hidden && g.state !== 'sleep' && (g.state === 'home' || g.state === 'walk' || g.state === 'use' || g.state === 'idle'));
      if (gs.length) {
        const g = Util.pick(gs), gx = Math.floor(g.x), gy = Math.floor(g.y);
        const r = World.bfs(Math.floor(s.x), Math.floor(s.y), i => { const x = i % World.W, y = (i / World.W) | 0; return Math.abs(x - gx) <= 1 && Math.abs(y - gy) <= 1; });
        if (r) { s.route = r; s.ri = 0; s.state = 'walk'; s.task = 'perform'; s.target = 0; return; }
      }
      this.wander(s); return;
    }
  },
  // claims voorkomen dat alle schoonmakers naar hetzelfde stuk afval of hetzelfde gebouw lopen
  claimedTile(i, selfId) {
    const c = this.claims.get(i); if (!c || c === selfId) return false;
    const o = this.list.get(c); if (!o || o.task !== 'litter' || o.claim !== i) { this.claims.delete(i); return false; }
    return true;
  },
  claimedObject(o, selfId) {
    if (!o.cleanerId || o.cleanerId === selfId) return false;
    const c = this.list.get(o.cleanerId); if (!c || c.target !== o.id || c.task !== 'clean') { o.cleanerId = 0; return false; }
    return true;
  },
  releaseClaims(s) {
    if (s.claim !== undefined) { if (this.claims.get(s.claim) === s.id) this.claims.delete(s.claim); s.claim = undefined; }
    if (s.target) { const o = World.objects.get(s.target); if (o && o.cleanerId === s.id) o.cleanerId = 0; if (o && o.gardenerId === s.id) o.gardenerId = 0; }
  },
  updateOne(s, dt) {
    switch (s.state) {
      case 'idle': s.walking = false; s.timer -= dt; s.idleTime += dt; if (s.timer <= 0) { this.pickTask(s); } break;
      case 'walk': {
        if (Guests.moveEntity(s, dt)) this.arrive(s);
        else if (s.task === 'litter' && s.ri % 2 === 0) { const i = World.idx(Math.floor(s.x), Math.floor(s.y)); if (World.litter[i] > 0) { s.route = null; this.arrive(s); } }
        break;
      }
      case 'walkfree': { // van het pad het gras op (of terug) om groen te verzorgen
        if (Guests.moveEntity(s, dt)) { if (s.task === 'tend' && !s.returning) { s.state = 'work'; s.timer = 2.5; } else { s.returning = false; s.state = 'idle'; s.timer = 0.3; } }
        break;
      }
      case 'work': {
        s.walking = false; s.timer -= dt;
        if (s.task === 'perform' || s.task === 'campfire') {
          for (const g of Guests.guests.values()) {
            if (g.hidden || g.state === 'sleep') continue;
            if (Math.abs(g.x - s.x) < 2.5 && Math.abs(g.y - s.y) < 2.5) { g.needs.fun = Math.max(0, g.needs.fun - 7 * dt); if (g.happy < 95) g.happy += 0.7 * dt; Guests.think(g, 'entertain'); }
          }
          if (s.task === 'campfire' && !Game.isEvening()) s.timer = 0;
        }
        if (s.timer <= 0) this.finishWork(s);
        break;
      }
    }
  },
  arrive(s) {
    const o = s.target ? World.objects.get(s.target) : null;
    s.walking = false;
    if (s.task === 'litter') { const i = World.idx(Math.floor(s.x), Math.floor(s.y)); if (World.litter[i] > 0) { s.state = 'work'; s.timer = Math.min(4, 0.7 * World.litter[i]); s.workTile = i; return; } s.state = 'idle'; s.timer = 0.2; return; }
    if (s.task === 'clean' && o) { s.state = 'work'; s.timer = 4; s.hidden = DATA.items[o.type].indoor; return; }
    if (s.task === 'repair' && o) { if (!o.broken) { s.state = 'idle'; s.timer = 0.2; return; } s.state = 'work'; s.timer = 6; return; }
    if (s.task === 'service' && o) { s.state = 'work'; s.timer = 3; return; }
    if (s.task === 'tend' && o) { s.stage = [s.x, s.y]; s.dest = [o.x + o.w / 2 + 0.2, o.y + o.h + 0.35]; if (!World.isOwned(Math.floor(s.dest[0]), Math.floor(s.dest[1]))) s.dest = [o.x + o.w / 2, o.y - 0.35]; s.returning = false; s.state = 'walkfree'; return; }
    if (s.task === 'perform') { s.state = 'work'; s.timer = 6; return; }
    if (s.task === 'campfire') { s.state = 'work'; s.timer = 30; return; }
    s.state = 'idle'; s.timer = Util.rand(1, 3);
  },
  finishWork(s) {
    const o = s.target ? World.objects.get(s.target) : null;
    s.hidden = false; s.idleTime = 0;
    if (s.task === 'litter' && s.workTile !== undefined) { Game.stats.litterPicked += World.litter[s.workTile]; World.litter[s.workTile] = 0; s.tasksDone++; }
    else if (s.task === 'clean' && o) { o.dirt = 0; s.tasksDone++; }
    else if (s.task === 'repair' && o) { o.broken = false; o.cond = 100; s.tasksDone++; UI.notify(DATA.items[o.type].name + ' is gerepareerd door ' + s.name + '.', 'good'); }
    else if (s.task === 'service' && o) { o.cond = Math.min(100, o.cond + 45); s.tasksDone++; }
    else if (s.task === 'perform' || s.task === 'campfire') s.tasksDone++;
    else if (s.task === 'tend') {
      // alles in de buurt in één keer verzorgen
      for (const ob of World.objects.values()) { const d = DATA.items[ob.type]; if (!d.care) continue; if (Math.abs(ob.x + ob.w / 2 - s.x) <= 2.5 && Math.abs(ob.y + ob.h / 2 - s.y) <= 2.5) { if (World.careOf(ob) < 100) s.tasksDone++; ob.care = 100; } }
      this.releaseClaims(s);
      s.task = null; s.target = 0; s.returning = true; s.dest = s.stage ? [s.stage[0], s.stage[1]] : null; s.state = s.dest ? 'walkfree' : 'idle'; s.timer = 0.3; return;
    }
    this.releaseClaims(s);
    s.task = null; s.target = 0; s.state = 'idle'; s.timer = 0.3;
  },
  statusText(s) {
    const o = s.target ? World.objects.get(s.target) : null, n = o ? DATA.items[o.type].name.toLowerCase() : '';
    if (s.state === 'walkfree') return s.returning ? 'Loopt terug naar het pad' : 'Loopt naar het groen';
    if (s.state === 'walk') return { litter: 'Op weg naar zwerfafval', clean: 'Op weg naar ' + n, repair: 'Op weg naar kapotte ' + n, service: 'Op weg voor onderhoud aan ' + n, tend: 'Op weg naar ' + (n || 'het groen'), perform: 'Op zoek naar publiek', campfire: 'Op weg naar het kampvuur', wander: 'Loopt een rondje' }[s.task] || 'Onderweg';
    if (s.state === 'work') return { litter: 'Raapt afval op', clean: 'Maakt ' + n + ' schoon', repair: 'Repareert ' + n, service: 'Onderhoudt ' + n, tend: 'Harkt en snoeit', perform: 'Voert een act op', campfire: 'Zingt bij het kampvuur' }[s.task] || 'Aan het werk';
    return 'Kijkt rond';
  },
  serialize() { return { nextId: this.nextId, list: [...this.list.values()] }; },
  deserialize(d) { this.reset(); this.nextId = d.nextId; for (const s of d.list) this.list.set(s.id, s); },
};

const Animals = {
  list: new Map(), nextId: 1,
  reset() { this.list = new Map(); this.nextId = 1; },
  add(kind, x, y) {
    const a = { id: this.nextId++, kind, x: x + 0.5, y: y + 0.5, hx: x + 0.5, hy: y + 0.5, tx: 0, ty: 0, state: 'idle', timer: Util.rand(1, 4), dir: Util.chance(0.5) ? 1 : -1, phase: Math.random() * 6,
      speed: { kip: 0.6, konijn: 1.4, geit: 0.7, schaap: 0.45, koe: 0.35, pony: 0.8, eend: 0.5 }[kind] || 0.5, name: DATA.animals[kind].name };
    this.list.set(a.id, a);
    return a;
  },
  remove(id) { this.list.delete(id); },
  allowed(kind, x, y) {
    const tx = Math.floor(x), ty = Math.floor(y); if (!World.inb(tx, ty)) return false;
    const i = World.idx(tx, ty);
    if (kind === 'eend') return World.terrain[i] === 2;
    return World.terrain[i] !== 2 && !World.path[i] && !World.obj[i];
  },
  update(dt) {
    for (const a of this.list.values()) {
      if (a.state === 'idle') {
        a.timer -= dt;
        if (a.timer <= 0) {
          for (let k = 0; k < 6; k++) {
            const ang = Math.random() * Math.PI * 2, r = Util.rand(0.5, 2.2), tx = a.hx + Math.cos(ang) * r, ty = a.hy + Math.sin(ang) * r;
            if (this.allowed(a.kind, tx, ty)) { a.tx = tx; a.ty = ty; a.state = 'walk'; break; }
          }
          if (a.state !== 'walk') a.timer = Util.rand(1, 3);
        }
      } else {
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.sqrt(dx * dx + dy * dy), st = a.speed * dt;
        if (Math.abs(dx - dy) > 0.02) a.dir = (dx - dy) > 0 ? 1 : -1;
        if (d <= st) { a.x = a.tx; a.y = a.ty; a.state = 'idle'; a.timer = Util.rand(a.kind === 'kip' ? 0.5 : 2, a.kind === 'koe' ? 9 : 5); }
        else { a.x += dx / d * st; a.y += dy / d * st; }
      }
    }
  },
  serialize() { return { nextId: this.nextId, list: [...this.list.values()] }; },
  deserialize(d) { this.reset(); this.nextId = d.nextId; for (const a of d.list) this.list.set(a.id, a); },
};
