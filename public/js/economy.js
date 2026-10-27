'use strict';
// ---------------------------------------------------------------------------
// Economie, beoordeling, weer, dag/maand-overgangen, doelen
// ---------------------------------------------------------------------------
const INC_NAMES = { overnachtingen: 'Overnachtingen', restaurant: 'Restaurant', snackbar: 'Snackbar', winkel: 'Winkel', wasserette: 'Wasserette', fiets: 'Fietsverhuur', zwembad: 'Zwembad', midgetgolf: 'Midgetgolf', skelter: 'Skelterverhuur', verkoop: 'Verkoop / sloop', lening: 'Noodlening' };
const EXP_NAMES = { bouw: 'Bouw & aanleg', personeel: 'Personeel', onderhoud: 'Onderhoud', dieren: 'Dierenvoer', terrein: 'Terreinwerk' };

const Econ = {
  rating: 45, ratingDepart: 55, ratingTimer: 0, lastRatingStars: 0,
  ledger: { cur: { inc: {}, exp: {} }, prev: { inc: {}, exp: {} }, curLabel: '', prevLabel: '' },
  breakdown: { happy: 0, clean: 0, variety: 0, nature: 0, penalty: 0 },
  bailouts: 0,

  reset() { this.rating = 45; this.ratingDepart = 55; this.ledger = { cur: { inc: {}, exp: {} }, prev: { inc: {}, exp: {} }, curLabel: '', prevLabel: '' }; this.bailouts = 0; },
  income(cat, amt) { Game.money += amt; this.ledger.cur.inc[cat] = (this.ledger.cur.inc[cat] || 0) + amt; },
  expense(cat, amt) { Game.money -= amt; this.ledger.cur.exp[cat] = (this.ledger.cur.exp[cat] || 0) + amt; },
  canAfford(amt) { return Game.money >= amt; },
  sum(o) { let s = 0; for (const k in o) s += o[k]; return s; },

  recordDeparture(happy, party) {
    this.ratingDepart = Util.lerp(this.ratingDepart, happy, 0.12);
    Game.stats.departed++;
    if (happy >= 75) Game.stats.happyDepartures++;
  },

  stars() { return Math.round(this.rating / 10) / 2; },

  computeRating(dt) {
    this.ratingTimer -= dt; if (this.ratingTimer > 0) return; this.ratingTimer = 2;
    let sum = 0, n = 0;
    for (const g of Guests.guests.values()) { sum += g.happy; n++; }
    const avgNow = n ? sum / n : this.ratingDepart;
    const happy = n ? Util.lerp(this.ratingDepart, avgNow, Math.min(1, n / 12)) : this.ratingDepart;
    const paths = World.pathTileCount();
    const clean = 1 - Util.clamp(World.totalLitter() / Math.max(8, paths * 0.25), 0, 1);
    const has = t => World.has(t);
    let funTypes = 0, nature = 0, spots = 0, dirtSum = 0, dirtN = 0, broken = 0, unreachable = 0;
    const funSet = new Set();
    for (const o of World.objects.values()) {
      const d = DATA.items[o.type];
      if (d.service === 'fun') funSet.add(o.type);
      if (d.nature) nature += d.nature * World.careFactor(o);
      if (d.kind === 'spot') spots++;
      if (d.dirtRate) { dirtSum += o.dirt; dirtN++; }
      if (o.broken) broken++;
      if ((d.kind === 'spot' || (d.kind === 'facility' && d.service)) && !World.isReachable(o)) unreachable++;
    }
    funTypes = funSet.size;
    let variety = 0;
    if (has('sanitairgebouw')) variety += 0.22; else if (has('toiletunit')) variety += 0.1;
    if (has('restaurant')) variety += 0.14; if (has('snackbar')) variety += 0.06; if (has('winkeltje')) variety += 0.08;
    variety += Math.min(funTypes, 6) * 0.05;
    if (has('bankje') || has('picknicktafel')) variety += 0.04; if (has('lantaarn')) variety += 0.04; if (has('prullenbak')) variety += 0.04;
    if (has('slagboom')) variety += 0.03; if (has('informatiebord')) variety += 0.02; if (has('parkeerplaats')) variety += 0.02; if (has('wasserette')) variety += 0.02;
    if (has('afvalstation')) variety += 0.03; if (has('camperservice')) variety += 0.03; if (has('pizzeria') || has('bakker') || has('ijssalon')) variety += 0.04;
    variety = Math.min(1, variety);
    const natureScore = Util.clamp((nature + Animals.list.size * 0.8) / Math.max(5, spots * 1.6), 0, 1);
    const penalty = (dirtN ? dirtSum / dirtN / 100 * 8 : 0) + broken * 3 + unreachable * 2;
    const target = Util.clamp(happy * 0.5 + clean * 15 + variety * 20 + natureScore * 15 - penalty, 0, 100);
    this.breakdown = { happy: happy * 0.5, clean: clean * 15, variety: variety * 20, nature: natureScore * 15, penalty, avgNow, n };
    this.rating = Util.lerp(this.rating, target, 0.08);
    const st = this.stars();
    if (st !== this.lastRatingStars) {
      if (this.lastRatingStars && st > this.lastRatingStars) UI.notify('De beoordeling is gestegen naar ' + st + ' sterren!', 'good');
      else if (this.lastRatingStars && st < this.lastRatingStars) UI.notify('De beoordeling is gedaald naar ' + st + ' sterren.', 'warn');
      this.lastRatingStars = st;
    }
  },

  rollWeather() {
    const t = DATA.weatherTable[Game.month];
    Game.weather = Util.weighted([['zon', t[0]], ['bewolkt', t[1]], ['regen', t[2]]]);
  },

  dayRollover() {
    // overnachtingen innen
    for (const p of Guests.parties.values()) {
      if (p.leaving) continue;
      const sp = World.objects.get(p.spot); if (!sp) continue;
      this.income('overnachtingen', Game.prices[sp.type] + Math.max(0, p.members.length - 2) * DATA.EXTRA_PERSON); p.nightsPaid++; Game.stats.nights++;
    }
    let upkeep = 0; for (const o of World.objects.values()) upkeep += DATA.items[o.type].upkeep || 0;
    if (upkeep) this.expense('onderhoud', upkeep);
    let wages = 0; for (const s of Staff.list.values()) wages += DATA.staff[s.role].wage;
    if (wages) this.expense('personeel', wages);
    let feed = 0; for (const a of Animals.list.values()) feed += DATA.animals[a.kind].upkeep;
    if (feed) this.expense('dieren', feed);
    // camperservicepunt: caravan- en campergasten verwachten er een
    const svc = World.listByType('camperservice').some(o => World.isReachable(o));
    for (const p of Guests.parties.values()) {
      if (p.leaving || (p.vehicle !== 'caravan' && p.vehicle !== 'camper')) continue;
      for (const id of p.members) { const g = Guests.guests.get(id); if (!g) continue; if (svc) { g.happy = Math.min(100, g.happy + 2); if (Util.chance(0.3)) Guests.think(g, 'service'); } else { g.happy -= 1.5; Guests.think(g, 'noservice'); } }
    }
    // natuurlijke slijtage en vervuiling
    // gras groeit, bloemen verwelken: verzorging neemt dagelijks af (de tuinman herstelt het)
    for (const o of World.objects.values()) { const d = DATA.items[o.type]; if (d.care) o.care = Math.max(0, World.careOf(o) - d.care); }
    const hasMonteur = [...Staff.list.values()].some(s => s.role === 'monteur');
    for (const o of World.objects.values()) {
      const d = DATA.items[o.type]; if (!d.breakable) continue;
      if (!o.broken) { o.cond = Math.max(0, o.cond - 0.4); if (Util.chance(0.001 + (1 - o.cond / 100) * 0.015)) Guests.breakdown(o); o.brokenDays = 0; }
      else if (!hasMonteur) {
        // vangnet: zonder monteur komt na 3 dagen een externe reparateur, tegen een flinke rekening
        o.brokenDays = (o.brokenDays || 0) + 1;
        if (o.brokenDays >= 3) { const bill = 400 + Math.round((d.cost || 0) * 0.03); this.expense('onderhoud', bill); o.broken = false; o.cond = 100; o.brokenDays = 0; UI.notify('Geen monteur in dienst: een externe reparateur heeft ' + d.name.toLowerCase() + ' gerepareerd voor ' + Util.euro(bill) + '.', 'warn'); }
      }
    }
    this.rollWeather();
    if (Game.day % DATA.DAYS_PER_MONTH === 0) this.monthRollover();
    if (Game.money < 0 && Game.money > -25000) UI.notify('Let op: je staat rood! Verlaag kosten of verhoog je inkomsten.', 'warn');
    if (Game.money <= -25000) Game.bankrupt();
  },
  monthRollover() {
    this.ledger.prev = this.ledger.cur; this.ledger.prevLabel = this.ledger.curLabel;
    this.ledger.cur = { inc: {}, exp: {} }; this.ledger.curLabel = DATA.months[Game.month] + ' ' + Game.year;
    const prevSeason = DATA.seasonOf((Game.month + 11) % 12), season = DATA.seasonOf(Game.month);
    if (season !== prevSeason) {
      Sprites.season = season; Sprites.clearSeasonal();
      const msg = { lente: 'De lente is begonnen: de eerste kampeerders komen eraan.', zomer: 'Hoogseizoen! Verwacht een stormloop aan gasten.', herfst: 'Het wordt herfst. Het seizoen loopt ten einde.', winter: 'Winter: alleen de hutten en chalets trekken nog gasten. Tijd om te bouwen!' }[season];
      UI.notify(msg, 'info');
    }
  },

  statsSnapshot() {
    const st = Game.stats;
    let nature = 0, staff = Staff.list.size; const has = {};
    for (const o of World.objects.values()) { const d = DATA.items[o.type]; if (d.nature && d.kind === 'deco' && !o.natural) nature++; has[o.type] = true; }
    return { totalParties: st.totalParties, totalGuests: st.totalGuests, ratingStars: this.stars(), guestsNow: Guests.guests.size, money: Game.money, has, animals: Animals.list.size, nature, staff, day: Game.day, landBought: st.landBought || 0 };
  },
  checkMilestones() {
    const s = this.statsSnapshot();
    for (const m of DATA.milestones) {
      if (Game.milestones[m.id]) continue;
      if (m.check(s)) { Game.milestones[m.id] = Game.day + 1; UI.notify('Doel behaald: ' + m.text + '!', 'good'); } // dag + 1: dag 0 zou anders als 'niet behaald' tellen
    }
  },
};
