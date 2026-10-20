'use strict';
// Automatische zelftest: open index.html?test=1&days=30 . Bouwt een camping, spoelt dagen door en logt de uitkomst.
window.runSelfTest = function () {
  const params = new URLSearchParams(location.search), days = +(params.get('days') || 20);
  const log = (...a) => console.log('[SELFTEST]', ...a);
  const errors = [];
  window.addEventListener('error', e => { errors.push(e.message + ' @' + e.filename + ':' + e.lineno); });
  try {
    const ex = World.entrance.x, ey = World.entrance.y;
    const path = DATA.items.grindpad;
    if (params.get('scenario') === 'start') {
      // realistische start: standaard kapitaal, bescheiden camping
      const lay0 = (x, y) => { const o = World.objAt(x, y); if (o) Game.demolishObject(o); if (World.terrain[World.idx(x, y)] === 2) World.setTerrain(x, y, 0); Game.build(path, x, y); };
      const put0 = (id, x, y) => { const d = DATA.items[id]; for (let dy = 0; dy < d.h; dy++) for (let dx = 0; dx < d.w; dx++) { const o = World.objAt(x + dx, y + dy); if (o) Game.demolishObject(o); if (World.terrain[World.idx(x + dx, y + dy)] === 2) World.setTerrain(x + dx, y + dy, 0); } if (!Game.build(d, x, y)) log('kon niet plaatsen', id); };
      for (let y = ey; y >= 24; y--) lay0(ex, y);
      for (let x = ex - 9; x <= ex + 9; x++) lay0(x, 26);
      put0('receptie', ex + 1, ey - 4); put0('sanitairgebouw', ex - 4, 23); for (let x = ex - 4; x < ex; x++) lay0(x, 25); put0('snackbar', ex + 1, 24);
      for (let i = 0; i < 3; i++) { put0('tentplek', ex - 9 + i * 3, 27); put0('caravanplek', ex + 1 + i * 3, 27); }
      put0('prullenbak', ex, 30); put0('bankje', ex - 1, 26); for (let i = 0; i < 4; i++) put0('eik', ex - 8 + i * 4, 29);
      Staff.hire('schoonmaker');
      log('start-scenario: geld na bouwen', Math.round(Game.money), 'objecten', World.objects.size);
      const months = [];
      for (let d = 0; d < days; d++) { for (let s = 0; s < DATA.DAY_SECONDS; s += 0.05) Game.step(0.05); if ((Game.day % DATA.DAYS_PER_MONTH) === 0) { const L = Econ.ledger.prev; months.push(DATA.months[(Game.month + 11) % 12] + ': inkomsten ' + Math.round(Econ.sum(L.inc)) + ' uitgaven ' + Math.round(Econ.sum(L.exp)) + ' kas ' + Math.round(Game.money)); } }
      log('maanden', JSON.stringify(months));
      const st = Game.stats;
      log('geld', Math.round(Game.money), 'rating', Math.round(Econ.rating), 'gasten totaal', st.totalGuests, 'vertrokken', st.departed, 'blij', st.happyDepartures, 'vol', st.turnedAwayFull, 'prijs', st.turnedAwayPrice, 'kapot', st.breakdowns, 'rij', st.queueGiveUps);
      log('vertrekken', JSON.stringify((st.departLog || []).slice(0, 6)));
      log('gebruik', JSON.stringify(st.uses), 'beslissingen', JSON.stringify(st.dec));
      let nd = { hunger: 0, hygiene: 0, fun: 0, energy: 0, happy: 0, n: 0 }; for (const g of Guests.guests.values()) { for (const k in g.needs) nd[k] += g.needs[k]; nd.happy += g.happy; nd.n++; } log('gem. behoeften', JSON.stringify(Object.fromEntries(Object.entries(nd).map(([k, v]) => [k, k === 'n' ? v : Math.round(v / Math.max(1, nd.n))]))));
      const cmp = {}; for (const g of Guests.guests.values()) for (const k in (g.complaints || {})) cmp[k] = (cmp[k] || 0) + g.complaints[k]; log('klachten nu', JSON.stringify(cmp));
      Render.draw(Game.time, 0.016); Game.speed = 0; UI.updateHud();
      log('errors', JSON.stringify(errors)); log('DONE'); return;
    }
    Game.money = 1e6;
    // hoofdpad omhoog + dwarspaden
    const lay = (x, y) => { const o = World.objAt(x, y); if (o) Game.demolishObject(o); if (World.terrain[World.idx(x, y)] === 2) World.setTerrain(x, y, 0); Game.build(path, x, y); };
    for (let y = ey; y >= 6; y--) lay(ex, y);
    for (const yy of [10, 18, 26]) for (let x = ex - 12; x <= ex + 12; x++) lay(x, yy);
    const put = (id, x, y) => { const d = DATA.items[id]; for (let dy = 0; dy < d.h; dy++) for (let dx = 0; dx < d.w; dx++) { const o = World.objAt(x + dx, y + dy); if (o) Game.demolishObject(o); if (World.terrain[World.idx(x + dx, y + dy)] === 2) World.setTerrain(x + dx, y + dy, 0); } const r = Game.build(d, x, y); if (!r) log('kon niet plaatsen', id, x, y, World.canPlace(d, x, y).reason); return r; };
    put('receptie', ex + 1, ey - 4); put('slagboom', ex, ey - 2); put('parkeerplaats', ex - 3, ey - 4);
    put('sanitairgebouw', ex - 4, 11); put('restaurant', ex + 1, 11); put('winkeltje', ex + 5, 11); put('snackbar', ex - 7, 11);
    put('zwembad', ex + 1, 19); put('speeltuin', ex - 3, 19); put('trampoline', ex - 5, 19); put('kampvuurplaats', ex + 5, 19); put('recreatiezaal', ex + 7, 19);
    put('midgetgolf', ex - 8, 19); put('volleybalveld', ex - 11, 19); put('jeudeboules', ex - 8, 25);
    // staplekken langs pad y=26 en y=10
    for (let i = 0; i < 5; i++) { put('tentplek', ex - 12 + i * 3, 27); if (i < 4) put('caravanplek', ex + 1 + i * 3, 27); } put('comfortplek', ex + 10, 23);
    for (let i = 0; i < 4; i++) { put('trekkershut', ex - 12 + i * 3, 8); put('glampingtent', ex + 1 + i * 3, 8); }
    put('stacaravan', ex - 12, 24); put('chalet', ex + 9, 23); put('pipowagen', ex + 6, 25);
    for (let i = 0; i < 6; i++) { put('lantaarn', ex, ey - 3 - i * 4); put('prullenbak', ex - 2 + (i % 2) * 4, 18); }
    put('bankje', ex + 1, 26); put('picknicktafel', ex - 5, 25); put('bankje', ex + 3, 10); put('informatiebord', ex - 1, 18); put('fietsverhuur', ex - 2, 17); put('skelterverhuur', ex + 1, 17); put('toiletunit', ex + 4, 17); put('wasserette', ex + 6, 17); put('dierenweide', ex - 7, 16); put('tafeltennis', ex - 2, 9);
    for (let i = 0; i < 12; i++) put(['eik', 'den', 'berk', 'bloemperk', 'struik', 'heg'][i % 6], ex - 14 + i * 2, 29);
    for (const k of ['geit', 'schaap', 'kip', 'koe', 'pony', 'konijn']) { const x = ex - 14 + Math.floor(Math.random() * 28), y = 31 + Math.floor(Math.random() * 4); if (World.canPlace(DATA.items[k], x, y).ok) Game.build(DATA.items[k], x, y); }
    Staff.hire('schoonmaker'); Staff.hire('schoonmaker'); Staff.hire('monteur'); Staff.hire('animator');
    if (params.get('month')) { const m = +params.get('month'); Game.day = ((m - DATA.START_MONTH + 12) % 12) * DATA.DAYS_PER_MONTH; Sprites.season = DATA.seasonOf(Game.month); Sprites.clearSeasonal(); Econ.rollWeather(); }
    Game.money = 60000;
    log('gebouwd: objecten', World.objects.size, 'padtegels', World.pathTileCount(), 'bereikbaar receptie', World.listByType('receptie').every(o => World.isReachable(o)));
    if (params.get('trace')) {
      const p = Guests.createParty('tent'); if (!p) { log('geen party'); return; }
      const g = Guests.guests.get(p.members[0]); g.needs.hunger = 70; g.needs.fun = 10; g.needs.energy = 10; g.needs.hygiene = 10;
      let last = '';
      for (let s = 0; s < 90; s += 0.05) { Game.step(0.05); const k = g.state + '/' + g.goal + '/' + g.goalObj + '/' + (g.route ? g.route.length - g.ri : '-') + '/' + (g.dest ? 'dest' : '-') + '/' + g.phase2; if (k !== last) { last = k; log('t=' + s.toFixed(1), k, 'pos', g.x.toFixed(1), g.y.toFixed(1), 'needs', Object.values(g.needs).map(v => v | 0).join(','), 'happy', g.happy | 0, 'inside', g.insideObj, 'use', g.useObj); } if (!Guests.guests.has(g.id)) { log('gast weg'); break; } }
      log('thoughts', JSON.stringify(g.thoughts));
      return;
    }
    const t0 = performance.now();
    const total = days * DATA.DAY_SECONDS; let steps = 0;
    for (let s = 0; s < total; s += 0.05) { Game.step(0.05); steps++; if ((steps % 2000) === 0) { Render.draw(Game.time, 0.05); } }
    const ms = performance.now() - t0;
    const st = Game.stats;
    let stuck = 0, states = {}; for (const g of Guests.guests.values()) { states[g.state] = (states[g.state] || 0) + 1; if (g.state === 'stuck') stuck++; }
    log('na', days, 'dagen in', Math.round(ms), 'ms;', steps, 'stappen');
    log('geld', Math.round(Game.money), 'rating', Math.round(Econ.rating), 'sterren', Econ.stars());
    log('gasten nu', Guests.guests.size, 'gezelschappen', Guests.parties.size, 'totaal ontvangen', st.totalGuests, 'vertrokken', st.departed, 'blij', st.happyDepartures);
    log('gemist: vol', st.turnedAwayFull, 'prijs', st.turnedAwayPrice, 'geenreceptie', st.noReception, 'types', JSON.stringify(st.missedType), 'rij', st.queueGiveUps, 'kapot', st.breakdowns, 'afval opgeruimd', st.litterPicked, 'afval nu', World.totalLitter());
    log('staten', JSON.stringify(states), 'stuck', stuck);
    const unreach = [...World.objects.values()].filter(o => { const d = DATA.items[o.type]; return (d.kind === 'spot' || (d.kind === 'facility' && d.service)) && !World.isReachable(o); }).map(o => o.type + '@' + o.x + ',' + o.y);
    log('onbereikbaar', JSON.stringify(unreach));
    log('ledger', JSON.stringify(Econ.ledger.cur), JSON.stringify(Econ.ledger.prev));
    log('breakdown', JSON.stringify(Econ.breakdown));
    log('gebruik', JSON.stringify(st.uses), 'beslissingen', JSON.stringify(st.dec));
    log('vertrekken', JSON.stringify((st.departLog || []).slice(0, 5)));
    const thoughts = {}; for (const g of Guests.guests.values()) for (const t of g.thoughts) thoughts[t.t] = (thoughts[t.t] || 0) + 1;
    log('gedachten', JSON.stringify(Object.entries(thoughts).sort((a, b) => b[1] - a[1]).slice(0, 12)));
    // render-test met verschillende tijden
    for (const tt of [0.1, 0.5, 0.8, 0.95]) { Game.t = tt; Render.draw(Game.time, 0.016); }
    Game.t = +(params.get('t') || 0.55);
    Game.weather = params.get('weather') || Game.weather;
    if (params.get('zoom')) Render.cam.zoom = +params.get('zoom');
    Render.draw(Game.time, 0.016);
    // save/load roundtrip
    const s = Game.serialize(); const ok = Game.loadFromString(s); log('save/load', ok, 'bytes', s.length, 'gasten na load', Guests.guests.size);
    for (let s2 = 0; s2 < 20; s2 += 0.05) Game.step(0.05);
    Game.t = +(params.get('t') || 0.55);
    if (params.get('cx')) { const [wx, wy] = Render.tileToWorld(+params.get('cx'), +params.get('cy')); Render.cam.x = wx; Render.cam.y = wy; }
    Render.draw(Game.time, 0.016);
    Game.speed = 0;
    UI.updateHud();
    if (params.get('panel') === 'gasten') UI.openModal('Gasten', b => UI.guestsPanel(b));
    if (params.get('panel') === 'fin') UI.openModal('Financiën', b => UI.financePanel(b));
    if (params.get('cat')) UI.openCategory(params.get('cat'));
    if (params.get('sel') === 'guest') { const g = Guests.guests.values().next().value; if (g) { UI.select({ kind: 'guest', id: g.id }); UI.centerOn(g); } }
    if (params.get('input')) {
      const cv = Render.canvas, W = Render.W, H = Render.H;
      const ev = (type, x, y, extra) => cv.dispatchEvent(new MouseEvent(type, Object.assign({ clientX: x, clientY: y, bubbles: true, button: 0 }, extra || {})));
      const wev = (type, x, y, extra) => window.dispatchEvent(new MouseEvent(type, Object.assign({ clientX: x, clientY: y, bubbles: true, button: 0 }, extra || {})));
      const key = (k) => { window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); window.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true })); };
      try {
        for (const c of DATA.categories) { UI.openCategory(c.id); UI.openCategory(null); }
        UI.openCategory('paden'); document.querySelector('#build-list .item').click(); log('tool', UI.tool && UI.tool.id);
        ev('mousedown', W / 2, H / 2); wev('mousemove', W / 2 + 40, H / 2 + 20); wev('mousemove', W / 2 + 80, H / 2 + 40); wev('mouseup', W / 2 + 80, H / 2 + 40);
        cv.dispatchEvent(new WheelEvent('wheel', { deltaY: -200, clientX: W / 2, clientY: H / 2, bubbles: true, cancelable: true }));
        cv.dispatchEvent(new WheelEvent('wheel', { deltaY: 300, clientX: W / 2, clientY: H / 2, bubbles: true, cancelable: true }));
        ev('mousedown', W / 2, H / 2, { button: 2 }); wev('mousemove', W / 2 - 30, H / 2 - 30); wev('mouseup', W / 2 - 30, H / 2 - 30, { button: 2 });
        key('Escape'); log('tool na esc', UI.tool);
        UI.openCategory('natuur'); document.querySelectorAll('#build-list .item')[0].click(); ev('mousedown', W / 2 + 100, H / 2 + 60); wev('mouseup', W / 2 + 100, H / 2 + 60); key('Escape'); key('Escape');
        UI.openCategory('dieren'); document.querySelectorAll('#build-list .item')[0].click(); ev('mousedown', W / 2 - 150, H / 2 + 90); wev('mouseup', W / 2 - 150, H / 2 + 90); key('Escape'); key('Escape');
        UI.openCategory('personeel'); document.querySelectorAll('#build-list .item')[2].click(); key('Escape');
        // selecteer object door te klikken op de receptie
        const rec = World.listByType('receptie')[0]; const [sx, sy] = Render.tileToScreen(rec.x + 1, rec.y + 1);
        ev('mousedown', sx, sy - 20); wev('mouseup', sx, sy - 20); log('selected', JSON.stringify(UI.selected));
        const g = Guests.guests.values().next().value; if (g) { const [gx, gy] = Render.tileToScreen(g.x, g.y); ev('mousedown', gx, gy - 8); wev('mouseup', gx, gy - 8); log('selected guest', JSON.stringify(UI.selected)); }
        for (const [t, f] of [['Financiën', b => UI.financePanel(b)], ['Gasten', b => UI.guestsPanel(b)], ['Personeel', b => UI.staffPanel(b)], ['Prijzen', b => UI.pricesPanel(b)], ['Doelen', b => UI.goalsPanel(b)], ['Menu', b => UI.menuPanel(b)]]) { UI.openModal(t, f); UI.refreshModal(); }
        UI.openModal('Prijzen', b => UI.pricesPanel(b)); document.querySelector('#modal-body .pm').click(); log('prijs na klik', Game.prices.tentplek); UI.closeModal();
        key(' '); key('1'); key('2'); key('3'); key('+'); key('-'); key('x'); key('Escape');
        UI.openCategory('slopen'); const tree = [...World.objects.values()].find(o => DATA.items[o.type].kind === 'deco'); if (tree) { const [tx2, ty2] = Render.tileToScreen(tree.x + 0.5, tree.y + 0.5); ev('mousedown', tx2, ty2); wev('mouseup', tx2, ty2); log('tree removed', !World.objects.has(tree.id)); } key('Escape');
        cv.dispatchEvent(new TouchEvent('touchstart', { touches: [new Touch({ identifier: 1, target: cv, clientX: W / 2, clientY: H / 2 })], bubbles: true, cancelable: true }));
        cv.dispatchEvent(new TouchEvent('touchmove', { touches: [new Touch({ identifier: 1, target: cv, clientX: W / 2 + 30, clientY: H / 2 + 30 })], bubbles: true, cancelable: true }));
        cv.dispatchEvent(new TouchEvent('touchend', { touches: [], bubbles: true, cancelable: true }));
        Render.draw(Game.time, 0.016); UI.updateHud(); UI.updateInfo();
        log('input test ok');
      } catch (e) { log('INPUT EXCEPTION', e.message, e.stack.split('\n').slice(0, 3).join(' | ')); }
    }
    log('errors', JSON.stringify(errors));
    log('DONE');
  } catch (e) { console.log('[SELFTEST] EXCEPTION', e.message, e.stack); }
};
