'use strict';
// ---------------------------------------------------------------------------
// Gebruikersinterface en invoer
// ---------------------------------------------------------------------------
const UI = {
  tool: null, category: null, selected: null, hudTimer: 0, infoTimer: 0, moneyWarn: 0,
  toolMirror: false, moving: null, touchMode: false, landHover: null, lastTouch: 0,
  pan: null, painting: false, lastPaint: null, clickCand: null, pinch: null, previews: new Map(),

  $(id) { return document.getElementById(id); },
  init() {
    const tb = this.$('toolbar');
    for (const c of DATA.categories) {
      const b = Util.el('button', 'cat', '<span class="ic">' + c.icon + '</span><span>' + c.name + '</span>');
      b.dataset.cat = c.id; b.onclick = () => this.openCategory(c.id); tb.appendChild(b);
    }
    this.$('btn-pause').onclick = () => Game.setSpeed(0); this.$('btn-s1').onclick = () => Game.setSpeed(1); this.$('btn-s2').onclick = () => Game.setSpeed(2); this.$('btn-s3').onclick = () => Game.setSpeed(4);
    this.$('btn-fin').onclick = () => this.openModal('Financiën', b => this.financePanel(b));
    this.$('btn-guests').onclick = () => this.openModal('Gasten', b => this.guestsPanel(b));
    this.$('btn-staff').onclick = () => this.openModal('Personeel', b => this.staffPanel(b));
    this.$('btn-prices').onclick = () => this.openModal('Prijzen', b => this.pricesPanel(b));
    this.$('btn-goals').onclick = () => this.openModal('Doelen', b => this.goalsPanel(b));
    this.$('btn-menu').onclick = () => this.openModal('Menu', b => this.menuPanel(b));
    this.$('btn-full').onclick = () => this.toggleFullscreen();
    for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, () => this.updateFullBtn());
    // al schermvullend als web-app op het beginscherm: knop overbodig
    if ((window.matchMedia && window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) || navigator.standalone) this.$('btn-full').classList.add('hidden');
    this.$('modal-close').onclick = () => this.closeModal();
    this.$('modal').onclick = e => { if (e.target === this.$('modal')) this.closeModal(); };
    this.$('info-close').onclick = () => this.select(null);
    this.$('build-close').onclick = () => this.openCategory(null);
    this.$('hud-rating').onclick = () => this.openModal('Gasten', b => this.guestsPanel(b));
    this.$('minimap').onclick = e => { const r = this.$('minimap').getBoundingClientRect(); const s = this.$('minimap').width / World.W; const tx = (e.clientX - r.left) / r.width * this.$('minimap').width / s, ty = (e.clientY - r.top) / r.height * this.$('minimap').height / s; const [wx, wy] = Render.tileToWorld(tx, ty); Render.cam.x = wx; Render.cam.y = wy; };
    this.bindInput();
  },

  // ---- bevestigingsdialoog (geen browser-confirm: die pauzeert het spel en verbergt de preview) ----
  confirmDialog(msg, onYes, yesLabel, onNo) {
    const box = this.$('confirm'), yes = this.$('confirm-yes'), no = this.$('confirm-no');
    this.$('confirm-msg').textContent = msg; yes.textContent = yesLabel || 'Ja';
    const close = () => { box.classList.add('hidden'); this.confirmOpen = null; };
    const tap = (btn, fn) => { btn.onclick = () => { close(); fn && fn(); }; btn.ontouchend = e => { e.preventDefault(); e.stopPropagation(); this.lastTouch = Date.now(); btn.onclick(); }; };
    tap(yes, onYes); tap(no, onNo);
    box.onclick = e => { if (e.target === box) { close(); onNo && onNo(); } };
    this.confirmOpen = { onNo }; box.classList.remove('hidden');
  },
  closeConfirm() { if (!this.confirmOpen) return false; const c = this.confirmOpen; this.$('confirm').classList.add('hidden'); this.confirmOpen = null; c.onNo && c.onNo(); return true; },

  // ---- volledig scherm ----------------------------------------------------
  isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
  isApple() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },
  fullscreenTip() {
    return this.isApple()
      ? 'Op iPad en iPhone mag alleen Safari een pagina schermvullend maken. Tip: open het spel in Safari, tik op Delen en kies "Zet op beginscherm"; dan opent het als app zonder browserbalken, ook als Firefox je standaardbrowser is.'
      : 'Deze browser kan de pagina niet schermvullend maken. Tip: zet de pagina via het browsermenu op je beginscherm of installeer hem als app.';
  },
  toggleFullscreen() {
    const d = document.documentElement;
    if (this.isFullscreen()) { const ex = document.exitFullscreen || document.webkitExitFullscreen; if (ex) ex.call(document); return; }
    const req = d.requestFullscreen || d.webkitRequestFullscreen;
    if (!req) { this.notify(this.fullscreenTip(), 'info'); return; }
    try {
      const p = req.call(d, { navigationUI: 'hide' });
      if (p && p.catch) p.catch(() => this.notify(this.fullscreenTip(), 'warn'));
    } catch (e) { this.notify(this.fullscreenTip(), 'warn'); }
  },
  updateFullBtn() { const b = this.$('btn-full'); const on = this.isFullscreen(); b.classList.toggle('active', on); b.title = on ? 'Volledig scherm verlaten (F)' : 'Volledig scherm (F)'; },

  // ---- nieuwe versie beschikbaar ----------------------------------------------
  updateNotice(v) {
    if (this.$('update-notice')) return;
    const t = Util.el('div', 'toast good', 'Er is een nieuwe versie van het spel (' + Util.esc(v) + '). <button class="small" id="update-reload">Nu herladen</button>'); t.id = 'update-notice'; t.style.pointerEvents = 'auto';
    this.$('toasts').appendChild(t);
    this.$('update-reload').onclick = () => { Game.save(); location.reload(); };
  },

  // ---- meldingen ----------------------------------------------------------
  notify(msg, type) {
    const box = this.$('toasts'); const t = Util.el('div', 'toast ' + (type || 'info'), Util.esc(msg));
    box.appendChild(t);
    while (box.children.length > 6) box.removeChild(box.firstChild);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 500); }, type === 'bad' ? 9000 : 6500);
  },

  // ---- bouwmenu -------------------------------------------------------------
  openCategory(id) {
    if (this.category === id || !id) { this.category = null; this.$('buildpanel').classList.add('hidden'); this.setTool(null); document.querySelectorAll('#toolbar .cat').forEach(b => b.classList.remove('active')); return; } // menu dicht = gereedschap weg
    this.category = id;
    document.querySelectorAll('#toolbar .cat').forEach(b => b.classList.toggle('active', b.dataset.cat === id));
    if (id === 'slopen') { this.setTool(DATA.items.sloop); this.$('buildpanel').classList.add('hidden'); return; }
    const panel = this.$('buildpanel'), list = this.$('build-list'); list.innerHTML = '';
    this.$('build-title').textContent = DATA.categories.find(c => c.id === id).name;
    for (const it of DATA.itemsByCat[id]) {
      const card = Util.el('div', 'item');
      card.appendChild(this.preview(it));
      const landCost = it.kind === 'land' ? World.landCost(it.dir) : 0;
      const costTxt = it.kind === 'staff' ? Util.euro(it.wage) + '/dag' : it.kind === 'land' ? (landCost ? Util.euro(landCost) : 'niet beschikbaar') : Util.euro(it.cost) + (it.upkeep ? ' <small>+' + Util.euro(it.upkeep) + '/dag</small>' : '');
      card.appendChild(Util.el('div', 'item-info', '<b>' + it.name + '</b><span class="cost">' + costTxt + '</span><small>' + Util.esc(it.desc) + '</small>'));
      if (it.kind === 'land') { card.onmouseenter = () => { this.landHover = it.dir; }; card.onmouseleave = () => { this.landHover = null; }; }
      card.onclick = () => {
        if (it.kind === 'staff') { Staff.hire(it.id); this.flash(card); return; }
        if (it.kind === 'land') {
          if (!landCost) { this.notify('Aan deze kant is geen grond meer te koop.', 'warn'); return; }
          this.landHover = it.dir; // strook licht op zolang de vraag open staat (ook op touch)
          this.confirmDialog('Strook grond van ' + DATA.LAND_STRIP + ' tegels aan de ' + { n: 'noordkant', w: 'westkant', e: 'oostkant' }[it.dir] + ' kopen voor ' + Util.euro(landCost) + '?', () => { this.landHover = null; if (Game.buyLand(it.dir)) { this.openCategory(null); this.openCategory(id); } }, 'Kopen', () => { this.landHover = null; });
          return;
        }
        this.setTool(it);
      };
      card.dataset.id = it.id;
      list.appendChild(card);
    }
    panel.classList.remove('hidden');
    this.setTool(null);
  },
  flash(el) { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 300); },
  preview(it) {
    let cv = this.previews.get(it.id);
    if (cv) return cv.cloneNode ? this.copyCanvas(cv) : cv;
    cv = document.createElement('canvas'); cv.width = 140; cv.height = 110; cv.className = 'preview';
    const c = cv.getContext('2d');
    if (it.kind === 'path' || it.kind === 'terrain') { c.drawImage(Sprites.ground(it.kind === 'path' ? (it.pathType === 2 ? 'tegel' : 'grind') : it.terrain === 2 ? 'water' : it.terrain === 1 ? 'zand' : 'gras', 0), 10, 30, 120, 60); }
    else if (it.kind === 'animal') { c.save(); c.translate(70, 80); c.scale(3, 3); Sprites.drawAnimal(c, 0, 0, it.id, 1, 0); c.restore(); }
    else if (it.kind === 'staff') { c.save(); c.translate(70, 95); c.scale(3, 3); Sprites.drawPerson(c, 0, 0, { shirt: it.color, skin: C.skins[0], hair: C.hairs[1], pants: '#3b4a6b', dir: 1, tool: it.id === 'schoonmaker' ? 'bezem' : it.id === 'monteur' ? 'kist' : it.id === 'tuinman' ? 'hark' : 'vlag', vest: it.id === 'monteur' ? '#ff8c00' : null }, 0); c.restore(); }
    else if (it.kind === 'demolish') { c.font = '60px sans-serif'; c.textAlign = 'center'; c.fillText('🧨', 70, 80); }
    else if (it.kind === 'land') { c.drawImage(Sprites.ground('gras', 1), 10, 30, 120, 60); c.fillStyle = 'rgba(241,196,15,0.9)'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.fillText({ n: '↑', w: '←', e: '→' }[it.dir], 70, 76); }
    else { const sp = Sprites.get(it.id, 0); const sc = Math.min(130 / sp.w, 100 / sp.h, 1.2); c.drawImage(sp.cv, 70 - sp.w * sc / 2, 55 - sp.h * sc / 2, sp.w * sc, sp.h * sc); }
    this.previews.set(it.id, cv);
    return cv;
  },
  copyCanvas(src) { const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height; cv.className = src.className; cv.getContext('2d').drawImage(src, 0, 0); return cv; },
  setTool(def, keepMove) {
    if (this.moving && !keepMove) this.cancelMove();
    if (def !== this.tool) this.toolMirror = keepMove && this.moving ? this.moving.mirror : false;
    this.tool = def;
    document.querySelectorAll('#build-list .item').forEach(e => e.classList.toggle('active', !!def && e.dataset.id === def.id));
    Render.canvas.style.cursor = def ? 'crosshair' : 'default';
    this.renderHint();
  },
  canMirror(def) { return !!def && (def.kind === 'spot' || def.kind === 'facility' || def.kind === 'deco'); },
  rotateTool() { if (!this.canMirror(this.tool)) return; this.toolMirror = !this.toolMirror; },
  renderHint() {
    const def = this.tool, h = this.$('hint');
    if (!def) { h.classList.add('hidden'); return; }
    h.classList.remove('hidden');
    const extra = def.kind === 'path' || def.kind === 'terrain' ? ' Sleep om meerdere tegels te leggen.' : def.kind === 'demolish' ? ' Klik op een object, pad of dier. Gebouwen vragen om bevestiging; slepen haalt alleen paden en begroeiing weg.' : '';
    const placeable = def.kind !== 'demolish' && def.kind !== 'path' && def.kind !== 'terrain' && def.kind !== 'staff';
    h.innerHTML = '<b>' + (this.moving ? 'Verplaatsen: ' : '') + def.name + '</b>' + (def.cost && !this.moving ? ' · ' + Util.euro(def.cost) : '') + extra +
      (this.canMirror(def) ? ' <button id="hint-rot" class="hb" title="Draaien (R)">↻ Draaien</button>' : '') +
      (placeable && this.touchMode ? ' <button id="hint-place" class="hb primary">✓ Plaatsen</button>' : '') +
      ' <button id="hint-cancel" class="hb">✕ ' + (this.moving ? 'Annuleren' : 'Stoppen') + '</button>' +
      (this.touchMode ? (placeable ? ' <span class="muted">Tik op het terrein om te mikken, dan Plaatsen.</span>' : '') : ' <span class="muted">Esc of rechtermuisknop om te stoppen.</span>');
    if (this.$('hint-rot')) this.$('hint-rot').onclick = () => this.rotateTool();
    if (this.$('hint-place')) this.$('hint-place').onclick = () => { if (Render.hover) this.applyTool(Render.hover, null); };
    this.$('hint-cancel').onclick = () => { this.setTool(null); if (this.category === 'slopen') this.openCategory(null); };
    h.querySelectorAll('.hb').forEach(b => b.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); this.lastTouch = Date.now(); b.onclick(); }, { passive: false }));
  },
  // ---- verplaatsen ----
  startMove(o) {
    const def = DATA.items[o.type];
    if (o.occupant) { this.notify('Er staan nog gasten op deze plek. Wacht tot ze vertrokken zijn.', 'warn'); return; }
    for (const gid of [...o.users]) { const g = Guests.guests.get(gid); if (g) Guests.finishUse(g, true); }
    for (const g of Guests.guests.values()) if (g.insideObj === o.id) g.insideObj = 0;
    World.remove(o);
    this.moving = o; this.select(null);
    this.setTool(def, true); this.toolMirror = !!o.mirror; this.renderHint();
    Render.hover = [o.x, o.y];
  },
  cancelMove() {
    const o = this.moving; this.moving = null; if (!o) return;
    World.placeExisting(o, o.x, o.y, o.mirror);
  },

  // ---- selectie / infopaneel ----------------------------------------------------
  select(sel) { this.selected = sel; this.infoTimer = 0; if (!sel) this.$('infopanel').classList.add('hidden'); else this.updateInfo(); },
  bar(label, v, col, invert) { const p = Util.clamp(v, 0, 100); return '<div class="bar"><span>' + label + '</span><div class="track"><div class="fill" style="width:' + p + '%;background:' + (col || (invert ? (p > 70 ? '#e74c3c' : p > 45 ? '#f1c40f' : '#2ecc71') : (p < 35 ? '#e74c3c' : p < 60 ? '#f1c40f' : '#2ecc71'))) + '"></div></div></div>'; },
  updateInfo() {
    const s = this.selected; if (!s) return;
    const panel = this.$('infopanel'), body = this.$('info-body'), title = this.$('info-title');
    let html = '';
    if (s.kind === 'obj') {
      const o = World.objects.get(s.id); if (!o) { this.select(null); return; }
      const d = DATA.items[o.type]; title.textContent = d.name;
      html += '<p class="muted">' + Util.esc(d.desc) + '</p>';
      if (d.kind === 'spot') {
        html += '<div class="row"><span>Prijs per nacht</span><b>' + Util.euro(Game.prices[o.type]) + '</b></div>';
        const amb = World.spotAmbience(o); html += '<div class="row"><span>Sfeer</span><b>' + (amb > 0.35 ? 'Prachtig' : amb > 0.15 ? 'Mooi' : amb > 0 ? 'Gewoon' : 'Rumoerig') + '</b></div>';
        html += '<div class="row"><span>Bereikbaar</span><b>' + (World.isReachable(o) ? 'Ja' : '<span class="bad">Nee, grenst niet aan een verbonden pad</span>') + '</b></div>';
        if (d.care) html += this.bar('Verzorging', World.careOf(o)) + (World.careOf(o) < 40 ? '<div class="bad">Verwilderd: het gras staat hoog. Een tuinman houdt dit bij.</div>' : '');
        if (o.occupant) { const p = Guests.parties.get(o.occupant); if (p) { const left = p.arrivedDay + p.nights - Game.day; html += '<div class="sub"><b>' + Util.esc(p.name) + '</b> · ' + DATA.partyTypes[p.type].name + ' · ' + p.members.length + ' pers.<br>Nog ' + Math.max(0, left) + ' nacht(en) · ' + (p.leaving ? 'vertrekt' : 'tevredenheid ' + Math.round(Guests.partyHappiness(p)) + '%') + '</div>'; html += '<button class="small" id="info-follow">Toon gasten</button>'; } }
        else html += '<div class="row"><span>Bezetting</span><b>Vrij</b></div>';
      }
      if (d.kind === 'deco' && d.care) html += this.bar('Verzorging', World.careOf(o)) + (World.careOf(o) < 40 ? '<div class="bad">Verwaarloosd. Een tuinman houdt het groen bij.</div>' : '');
      if (d.kind === 'facility') {
        if (d.capacity) html += '<div class="row"><span>Bezoekers</span><b>' + o.users.length + ' / ' + d.capacity + '</b></div>';
        if (d.feeKey) html += '<div class="row"><span>Prijs</span><b>' + Util.euro(Game.fees[d.feeKey]) + '</b></div>';
        if (d.breakable) html += this.bar('Staat', o.cond) + (o.broken ? '<div class="bad"><b>KAPOT</b> – wacht op een onderhoudsmonteur</div>' : '');
        if (d.dirtRate) html += this.bar('Vervuiling', o.dirt, null, true);
        if (d.service) html += '<div class="row"><span>Bereikbaar</span><b>' + (World.isReachable(o) ? 'Ja' : '<span class="bad">Nee</span>') + '</b></div>';
        if (d.upkeep) html += '<div class="row"><span>Onderhoud</span><b>' + Util.euro(d.upkeep) + '/dag</b></div>';
        if (d.service && d.service !== 'checkin') html += '<button class="small" id="info-toggle">' + (o.open ? 'Sluiten' : 'Openen') + '</button>';
      }
      if (!o.occupant) { html += '<button class="small" id="info-move">Verplaatsen</button>'; if (this.canMirror(d)) html += '<button class="small" id="info-rotate">↻ Draaien</button>'; }
      html += '<button class="small danger" id="info-demolish">Slopen (' + Util.euro(Math.floor((d.cost || 0) * 0.5)) + ' terug)</button>';
    } else if (s.kind === 'guest') {
      const g = Guests.guests.get(s.id); if (!g) { this.select(null); return; }
      const p = Guests.parties.get(g.pid); title.textContent = g.name + (p ? ' (' + p.name + ')' : '');
      html += '<div class="row"><span>' + (g.kid ? 'Kind' : g.senior ? 'Senior' : g.youth ? 'Jongere' : 'Volwassene') + '</span><b>' + Util.esc(Guests.statusText(g)) + '</b></div>';
      html += this.bar('Tevredenheid', g.happy);
      for (const k of ['hunger', 'hygiene', 'fun', 'energy']) html += this.bar(NEED_NAME[k], g.needs[k], null, true);
      if (p) html += '<div class="sub">' + DATA.partyTypes[p.type].name + ' · ' + p.members.length + ' pers. · nacht ' + Math.min(p.nights, Game.day - p.arrivedDay + 1) + ' van ' + p.nights + (p.leaving ? ' · <b>vertrekt</b>' : '') + '</div>';
      html += '<div class="thoughts"><b>Gedachten</b>' + (g.thoughts.length ? g.thoughts.map(t => '<div>“' + Util.esc(t.t) + '”</div>').join('') : '<div class="muted">...</div>') + '</div>';
      if (p) html += '<div class="members">' + p.members.map(id => { const m = Guests.guests.get(id); return m ? '<span class="chip' + (m.id === g.id ? ' me' : '') + '" data-g="' + m.id + '">' + Util.esc(m.name) + '</span>' : ''; }).join('') + '</div>';
      html += '<button class="small" id="info-follow">Camera hierheen</button>';
    } else if (s.kind === 'staff') {
      const st = Staff.list.get(s.id); if (!st) { this.select(null); return; }
      title.textContent = st.name;
      html += '<div class="row"><span>' + DATA.staff[st.role].name + '</span><b>' + Util.esc(Staff.statusText(st)) + '</b></div>';
      html += '<div class="row"><span>Loon</span><b>' + Util.euro(DATA.staff[st.role].wage) + '/dag</b></div><div class="row"><span>Taken gedaan</span><b>' + st.tasksDone + '</b></div>';
      if (st.role === 'schoonmaker') html += '<div class="focus"><b>Focus</b><div class="seg">' + Object.entries(DATA.staffFocus).map(([k, n]) => '<button class="seg-btn' + ((st.focus || 'alles') === k ? ' on' : '') + '" data-focus="' + k + '">' + n + '</button>').join('') + '</div></div>';
      html += '<button class="small" id="info-follow">Camera hierheen</button><button class="small danger" id="info-fire">Ontslaan</button>';
    } else if (s.kind === 'animal') {
      const a = Animals.list.get(s.id); if (!a) { this.select(null); return; }
      const d = DATA.animals[a.kind]; title.textContent = d.name;
      html += '<p class="muted">' + Util.esc(d.desc) + '</p><div class="row"><span>Voer</span><b>' + Util.euro(d.upkeep) + '/dag</b></div>';
      html += '<button class="small danger" id="info-sell">Verkopen (' + Util.euro(Math.floor(d.cost * 0.5)) + ')</button>';
    }
    body.innerHTML = html; panel.classList.remove('hidden');
    const q = id => this.$(id);
    if (q('info-demolish')) q('info-demolish').onclick = () => { const o = World.objects.get(s.id); if (!o) return; if (o.occupant) { this.notify('Er staan nog gasten op deze plek! Wacht tot ze vertrokken zijn.', 'warn'); return; } if (DATA.items[o.type].kind === 'deco') Game.demolishObject(o); else Game.confirmDemolish(o); };
    if (q('info-toggle')) q('info-toggle').onclick = () => { const o = World.objects.get(s.id); if (o) { o.open = !o.open; if (!o.open) for (const gid of [...o.users]) { const g = Guests.guests.get(gid); if (g) Guests.finishUse(g, true); } this.updateInfo(); } };
    if (q('info-follow')) q('info-follow').onclick = () => { if (s.kind === 'obj') { const o = World.objects.get(s.id); const p = o && Guests.parties.get(o.occupant); if (p && p.members.length) { this.select({ kind: 'guest', id: p.members[0] }); this.centerOn(Guests.guests.get(p.members[0])); } } else { const e = s.kind === 'guest' ? Guests.guests.get(s.id) : Staff.list.get(s.id); if (e) this.centerOn(e); } };
    if (q('info-fire')) q('info-fire').onclick = () => { const st = Staff.list.get(s.id); if (st) this.confirmDialog(DATA.staff[st.role].name + ' ' + st.name + ' ontslaan?', () => Staff.fire(s.id), 'Ontslaan'); };
    if (q('info-move')) q('info-move').onclick = () => { const o = World.objects.get(s.id); if (o) this.startMove(o); };
    if (q('info-rotate')) q('info-rotate').onclick = () => { const o = World.objects.get(s.id); if (o) { Game.rotateObject(o); this.updateInfo(); } };
    body.querySelectorAll('[data-focus]').forEach(b => b.onclick = () => { const st = Staff.list.get(s.id); if (st) { st.focus = b.dataset.focus; this.updateInfo(); } });
    if (q('info-sell')) q('info-sell').onclick = () => { const a = Animals.list.get(s.id); if (a) Game.sellAnimal(a, true); };
    body.querySelectorAll('.chip').forEach(ch => ch.onclick = () => { this.select({ kind: 'guest', id: +ch.dataset.g }); });
  },
  centerOn(e) { const [wx, wy] = Render.tileToWorld(e.x, e.y); Render.cam.x = wx; Render.cam.y = wy; },

  // ---- HUD -----------------------------------------------------------------------
  tick(dt) {
    this.hudTimer -= dt; if (this.hudTimer <= 0) { this.hudTimer = 0.2; this.updateHud(); }
    this.infoTimer -= dt; if (this.infoTimer <= 0 && this.selected) { this.infoTimer = 0.6; if (!document.activeElement || document.activeElement.tagName !== 'BUTTON') this.updateInfo(); }
  },
  updateHud() {
    this.$('hud-name').textContent = Game.name;
    const m = this.$('hud-money'); m.textContent = Util.euro(Game.money); m.classList.toggle('neg', Game.money < 0);
    this.$('hud-date').textContent = Game.dateString();
    this.$('hud-weather').textContent = (Game.weather === 'zon' ? '☀️' : Game.weather === 'bewolkt' ? '☁️' : Sprites.season === 'winter' ? '❄️' : '🌧️') + ' ' + Util.cap(DATA.seasonOf(Game.month));
    this.$('hud-guests').textContent = '👥 ' + Guests.guests.size;
    const st = Econ.stars(); let stars = ''; for (let i = 1; i <= 5; i++) stars += '<span class="' + (st >= i ? 'on' : st >= i - 0.5 ? 'half' : 'off') + '">★</span>';
    this.$('hud-rating').innerHTML = '<span class="stars">' + stars + '</span> <small>' + Math.round(Econ.rating) + '</small>';
    ['btn-pause', 'btn-s1', 'btn-s2', 'btn-s3'].forEach((id, i) => this.$(id).classList.toggle('active', Game.speed === [0, 1, 2, 4][i]));
    this.$('hud-clock').textContent = Game.clockString();
  },

  // ---- modals -------------------------------------------------------------------
  openModal(title, builder) { this.$('modal-title').textContent = title; const b = this.$('modal-body'); b.innerHTML = ''; builder(b); this.$('modal').classList.remove('hidden'); this.modalBuilder = builder; this.modalTitle = title; },
  refreshModal() { if (this.modalBuilder && !this.$('modal').classList.contains('hidden')) { const b = this.$('modal-body'); const sc = b.scrollTop; b.innerHTML = ''; this.modalBuilder(b); b.scrollTop = sc; } },
  closeModal() { this.$('modal').classList.add('hidden'); this.modalBuilder = null; },
  table(rows) { return '<table>' + rows.map(r => '<tr>' + r.map((c, i) => '<td' + (i ? ' class="num"' : '') + '>' + c + '</td>').join('') + '</tr>').join('') + '</table>'; },
  financePanel(b) {
    const L = Econ.ledger, cur = L.cur, prev = L.prev;
    const ledgerRows = (lg) => { const r = []; for (const k in lg.inc) r.push(['<span class="good">+</span> ' + (INC_NAMES[k] || k), Util.euro(lg.inc[k])]); for (const k in lg.exp) r.push(['<span class="bad">−</span> ' + (EXP_NAMES[k] || k), Util.euro(-lg.exp[k])]); r.push(['<b>Resultaat</b>', '<b>' + Util.euro(Econ.sum(lg.inc) - Econ.sum(lg.exp)) + '</b>']); return r; };
    let upkeep = 0; for (const o of World.objects.values()) upkeep += DATA.items[o.type].upkeep || 0;
    let wages = 0; for (const s of Staff.list.values()) wages += DATA.staff[s.role].wage;
    let feed = 0; for (const a of Animals.list.values()) feed += DATA.animals[a.kind].upkeep;
    let spots = 0, occ = 0; for (const o of World.objects.values()) if (DATA.items[o.type].kind === 'spot') { spots++; if (o.occupant) occ++; }
    b.innerHTML = '<div class="cols"><div><h3>Deze maand (' + Util.esc(DATA.months[Game.month] + ' ' + Game.year) + ')</h3>' + this.table(ledgerRows(cur)) + '</div>' +
      '<div><h3>Vorige maand' + (L.prevLabel ? ' (' + Util.esc(L.prevLabel) + ')' : '') + '</h3>' + this.table(ledgerRows(prev)) + '</div></div>' +
      '<h3>Overzicht</h3>' + this.table([['Kas', '<b>' + Util.euro(Game.money) + '</b>'], ['Vaste kosten per dag', '<b>' + Util.euro(upkeep + wages + feed) + '</b>'], ['&nbsp;&nbsp;onderhoud gebouwen', Util.euro(upkeep)], ['&nbsp;&nbsp;personeel', Util.euro(wages)], ['&nbsp;&nbsp;dierenvoer', Util.euro(feed)], ['Bezetting', occ + ' van ' + spots + ' plekken'], ['Overnachtingen totaal', Game.stats.nights], ['Gasten ontvangen totaal', Game.stats.totalGuests]]);
  },
  guestsPanel(b) {
    const st = Game.stats, bd = Econ.breakdown;
    let html = '<div class="cols"><div><h3>Beoordeling: ' + Econ.stars() + ' sterren (' + Math.round(Econ.rating) + '/100)</h3>' +
      this.table([['Tevredenheid gasten', Math.round(bd.happy || 0) + ' / 50'], ['Netheid', Math.round(bd.clean || 0) + ' / 15'], ['Voorzieningen', Math.round(bd.variety || 0) + ' / 20'], ['Natuur & dieren', Math.round(bd.nature || 0) + ' / 15'], ['Strafpunten (vies, kapot, onbereikbaar)', '-' + Math.round(bd.penalty || 0)]]) +
      '</div><div><h3>Gemiste gasten</h3>' + this.table([['Alles bezet', st.turnedAwayFull], ['Te duur', st.turnedAwayPrice], ['Geen receptie', st.noReception], ['Opgegeven in de rij', st.queueGiveUps]].concat(Object.entries(st.missedType).map(([k, v]) => ['Zochten een ' + DATA.wantNames[k] + ' (niet aanwezig)', v]))) + '</div></div>';
    html += '<h3>Gezelschappen nu op de camping (' + Guests.parties.size + ', ' + Guests.guests.size + ' personen)</h3>';
    const rows = [];
    for (const p of Guests.parties.values()) { const sp = World.objects.get(p.spot); rows.push(['<a href="#" data-p="' + p.id + '">' + Util.esc(p.name) + '</a>', DATA.partyTypes[p.type].name, sp ? DATA.items[sp.type].name : '-', p.leaving ? 'vertrekt' : 'nog ' + Math.max(0, p.arrivedDay + p.nights - Game.day) + ' nacht(en)', Math.round(Guests.partyHappiness(p)) + '%']); }
    html += rows.length ? this.table(rows) : '<p class="muted">Nog geen gasten.</p>';
    const dl = st.departLog || [];
    html += '<h3>Laatste vertrekken</h3>' + (dl.length ? this.table(dl.map(d => [Util.esc(d.name), DATA.partyTypes[d.type].name, 'dag ' + d.day, (d.early ? '<span class="bad">vroegtijdig</span> ' : '') + d.happy + '%', d.happy < 65 ? (d.reasons.length ? '<small class="bad">ontevreden over: ' + Util.esc(d.reasons.join(', ')) + '</small>' : '<small class="muted">geen specifieke klacht</small>') : '<small class="muted">tevreden' + (d.reasons.length ? ' (kleine ergernis: ' + Util.esc(d.reasons[0]) + ')' : '') + '</small>'])) : '<p class="muted">Nog niemand vertrokken.</p>');
    b.innerHTML = html;
    b.querySelectorAll('a[data-p]').forEach(a => a.onclick = e => { e.preventDefault(); const p = Guests.parties.get(+a.dataset.p); if (p && p.members.length) { const g = Guests.guests.get(p.members[0]); this.select({ kind: 'guest', id: g.id }); this.centerOn(g); this.closeModal(); } });
  },
  staffPanel(b) {
    let html = '<div class="hire">';
    for (const s of Object.values(DATA.staff)) html += '<button data-hire="' + s.id + '">Huur ' + s.name.toLowerCase() + ' in<br><small>' + Util.euro(s.wage) + ' per dag</small></button>';
    html += '</div><h3>In dienst (' + Staff.list.size + ')</h3>';
    const rows = [];
    for (const s of Staff.list.values()) rows.push([Util.esc(s.name), DATA.staff[s.role].name + (s.role === 'schoonmaker' ? '<br><select data-focus-id="' + s.id + '">' + Object.entries(DATA.staffFocus).map(([k, n]) => '<option value="' + k + '"' + ((s.focus || 'alles') === k ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>' : ''), Util.esc(Staff.statusText(s)), s.tasksDone + ' taken', '<button class="small danger" data-fire="' + s.id + '">Ontslaan</button>']);
    html += rows.length ? this.table(rows) : '<p class="muted">Je hebt nog geen personeel. Zonder schoonmakers wordt het snel een rommel!</p>';
    b.innerHTML = html;
    b.querySelectorAll('[data-hire]').forEach(x => x.onclick = () => { Staff.hire(x.dataset.hire); this.refreshModal(); });
    b.querySelectorAll('[data-fire]').forEach(x => x.onclick = () => { const st = Staff.list.get(+x.dataset.fire); if (st) this.confirmDialog(DATA.staff[st.role].name + ' ' + st.name + ' ontslaan?', () => { Staff.fire(st.id); this.refreshModal(); }, 'Ontslaan'); });
    b.querySelectorAll('[data-focus-id]').forEach(x => x.onchange = () => { const st = Staff.list.get(+x.dataset.focusId); if (st) st.focus = x.value; });
  },
  pricesPanel(b) {
    const rf = 0.7 + Econ.rating / 100 * 0.6;
    const rows = [];
    for (const id in Game.prices) { const d = DATA.items[id]; const want = d.accepts[0]; const ok = Math.round(DATA.baseWillingness[want] * rf); rows.push([d.name, '<span class="muted">gasten vinden tot ± ' + Util.euro(ok) + ' redelijk</span>', '<button class="pm" data-k="p" data-id="' + id + '" data-d="-1">−</button> <b>' + Util.euro(Game.prices[id]) + '</b> <button class="pm" data-k="p" data-id="' + id + '" data-d="1">+</button>']); }
    let html = '<h3>Prijs per nacht</h3>' + this.table(rows) + '<h3>Tarieven voorzieningen</h3>';
    const frows = [];
    for (const k in Game.fees) frows.push([DATA.feeNames[k], '<span class="muted">standaard ' + Util.euro(DATA.defaultFees[k]) + '</span>', '<button class="pm" data-k="f" data-id="' + k + '" data-d="-1">−</button> <b>' + Util.euro(Game.fees[k]) + '</b> <button class="pm" data-k="f" data-id="' + k + '" data-d="1">+</button>']);
    html += this.table(frows) + '<p class="muted">Per nacht geldt een toeslag van ' + Util.euro(DATA.EXTRA_PERSON) + ' per persoon boven de twee. Tip: houd Shift ingedrukt voor stappen van 5. Een hogere beoordeling laat je meer vragen; te hoge prijzen schrikken gasten af.</p>';
    b.innerHTML = html;
    b.querySelectorAll('.pm').forEach(x => x.onclick = e => { const step = (e.shiftKey ? 5 : 1) * +x.dataset.d; if (x.dataset.k === 'p') Game.prices[x.dataset.id] = Math.max(1, Game.prices[x.dataset.id] + step); else Game.fees[x.dataset.id] = Math.max(0, Game.fees[x.dataset.id] + step); this.refreshModal(); });
  },
  goalsPanel(b) {
    const rows = DATA.milestones.map(m => [(Game.milestones[m.id] ? '✅' : '⬜') + ' ' + m.text, Game.milestones[m.id] ? '<span class="muted">dag ' + Game.milestones[m.id] + '</span>' : '']);
    b.innerHTML = this.table(rows) + '<h3>Tips</h3><ul class="tips">' + DATA.tips.map(t => '<li>' + Util.esc(t) + '</li>').join('') + '</ul>';
  },
  menuPanel(b) {
    b.innerHTML = '<div class="menu"><button id="m-save">💾 Opslaan (slot ' + Game.slot + ')</button><button id="m-campings">🏕️ Mijn campings (wisselen / nieuw)</button><button id="m-export">⬇️ Exporteren (bestand)</button><button id="m-import">⬆️ Importeren (bestand)</button><button id="m-rename">✏️ Camping hernoemen</button></div>' +
      '<input type="file" id="m-file" accept="application/json" class="hidden">' +
      '<h3>Besturing</h3><ul class="tips"><li>Slepen met de muis (of rechtermuisknop) om te schuiven, scrollen om te zoomen, pijltjes/WASD werken ook.</li><li>Klik op gasten, personeel, dieren of gebouwen voor informatie.</li><li>Spatie pauzeert, 1 / 2 / 3 zetten de snelheid, Esc stopt het bouwen.</li><li>Het spel wordt elke minuut automatisch opgeslagen in je browser.</li></ul>' +
      '<p class="muted">Camping Tycoon · versie ' + Util.esc(Game.version) + ' · een browsergame zonder server. Alles wordt lokaal in je browser bewaard.</p>';
    this.$('m-save').onclick = () => { Game.save(); this.notify('Spel opgeslagen.', 'good'); };
    this.$('m-campings').onclick = () => { Game.save(); this.closeModal(); Game.showStart(); };
    this.$('m-export').onclick = () => Game.exportSave();
    this.$('m-import').onclick = () => this.$('m-file').click();
    this.$('m-file').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { if (Game.loadFromString(r.result)) { this.notify('Spel geïmporteerd.', 'good'); this.closeModal(); } else this.notify('Bestand kon niet worden gelezen.', 'bad'); }; r.readAsText(f); };
    this.$('m-rename').onclick = () => { const n = prompt('Nieuwe naam voor je camping:', Game.name); if (n && n.trim()) { Game.name = n.trim().slice(0, 30); this.updateHud(); } };
  },

  campingsPanel(b) {
    const slots = Game.listSlots();
    let html = '<p class="muted">Je kunt ' + DATA.SAVE_SLOTS + ' campings bewaren en er één tegelijk spelen. De huidige camping staat in slot ' + Game.slot + '.</p>';
    html += this.table(slots.map((s, i) => { const n = i + 1, cur = n === Game.slot; return ['<b>Slot ' + n + '</b>' + (cur ? ' <small class="good">(actief)</small>' : ''),
      s ? Util.esc(s.name) + '<br><small class="muted">' + Util.esc(s.date) + ' · ' + Util.euro(s.money) + ' · ' + s.stars + ' ★ · ' + s.guests + ' gasten</small>' : '<span class="muted">leeg</span>',
      (s && !cur ? '<button class="small" data-load="' + n + '">Laden</button>' : '') + (!cur ? '<button class="small" data-newslot="' + n + '">Nieuwe camping</button>' : '') + (s && !cur ? '<button class="small danger" data-del="' + n + '">Verwijderen</button>' : '')]; }));
    b.innerHTML = html;
    b.querySelectorAll('[data-load]').forEach(x => x.onclick = () => { Game.save(); if (Game.load(+x.dataset.load)) { this.closeModal(); this.notify('Camping geladen.', 'good'); } });
    b.querySelectorAll('[data-newslot]').forEach(x => x.onclick = () => { Game.save(); this.closeModal(); Game.showStart(+x.dataset.newslot); });
    b.querySelectorAll('[data-del]').forEach(x => x.onclick = () => this.confirmDialog('Camping in slot ' + x.dataset.del + ' definitief verwijderen?', () => { Game.deleteSlot(+x.dataset.del); this.refreshModal(); }, 'Verwijderen'));
  },

  // ---- invoer -------------------------------------------------------------------
  bindInput() {
    const cv = Render.canvas;
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('mousedown', e => {
      const [tx, ty] = Render.screenToTile(e.clientX, e.clientY); const tile = [Math.floor(tx), Math.floor(ty)];
      if (e.button === 2 || e.button === 1) { if (e.button === 2 && this.tool) { this.setTool(null); if (this.category === 'slopen') this.openCategory(null); return; } this.pan = { x: e.clientX, y: e.clientY }; return; }
      if (e.button !== 0) return;
      if (this.tool) { this.applyTool(tile, e); if (this.tool && (this.tool.kind === 'path' || this.tool.kind === 'terrain' || this.tool.kind === 'demolish')) { this.painting = true; this.lastPaint = tile.join(','); } }
      else this.clickCand = { x: e.clientX, y: e.clientY, moved: false };
    });
    window.addEventListener('mousemove', e => {
      if (Date.now() - this.lastTouch < 1000) return; // nagebootste muisgebeurtenis na een tik
      const [tx, ty] = Render.screenToTile(e.clientX, e.clientY); Render.hover = [Math.floor(tx), Math.floor(ty)];
      if (this.pan) { Render.cam.x -= (e.clientX - this.pan.x) / Render.cam.zoom; Render.cam.y -= (e.clientY - this.pan.y) / Render.cam.zoom; this.pan = { x: e.clientX, y: e.clientY }; Render.clampCamera(); return; }
      if (this.clickCand) { if (Math.abs(e.clientX - this.clickCand.x) > 4 || Math.abs(e.clientY - this.clickCand.y) > 4) this.clickCand.moved = true; if (this.clickCand.moved) { Render.cam.x -= (e.clientX - this.clickCand.x) / Render.cam.zoom; Render.cam.y -= (e.clientY - this.clickCand.y) / Render.cam.zoom; this.clickCand.x = e.clientX; this.clickCand.y = e.clientY; Render.clampCamera(); } return; }
      if (this.painting && this.tool) { const key = Render.hover.join(','); if (key !== this.lastPaint) { this.lastPaint = key; this.applyTool(Render.hover, e, true); } }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 2 || e.button === 1) { this.pan = null; return; }
      if (this.clickCand && !this.clickCand.moved) this.pick(e.clientX, e.clientY);
      this.clickCand = null; this.painting = false;
    });
    cv.addEventListener('wheel', e => { e.preventDefault(); this.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0012)); }, { passive: false });
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      Game.keys.add(e.key.toLowerCase());
      if (e.key === 'Escape') { if (this.closeConfirm()) { } else if (!this.$('modal').classList.contains('hidden')) this.closeModal(); else if (this.tool) { this.setTool(null); if (this.category === 'slopen') this.openCategory(null); } else if (this.category) this.openCategory(null); else this.select(null); }
      if (e.key === ' ') { e.preventDefault(); Game.setSpeed(Game.speed ? 0 : (Game.prevSpeed || 1)); }
      if (e.key === '1') Game.setSpeed(1); if (e.key === '2') Game.setSpeed(2); if (e.key === '3') Game.setSpeed(4);
      if (e.key === 'Delete' || e.key.toLowerCase() === 'x') this.openCategory('slopen');
      if (e.key.toLowerCase() === 'f') this.toggleFullscreen();
      if (e.key.toLowerCase() === 'r') { if (this.tool) this.rotateTool(); else if (this.selected && this.selected.kind === 'obj') { const o = World.objects.get(this.selected.id); if (o) { Game.rotateObject(o); this.updateInfo(); } } }
      if (e.key === '+' || e.key === '=') this.zoomAt(Render.W / 2, Render.H / 2, 1.2); if (e.key === '-') this.zoomAt(Render.W / 2, Render.H / 2, 1 / 1.2);
    });
    window.addEventListener('keyup', e => Game.keys.delete(e.key.toLowerCase()));
    document.addEventListener('touchstart', () => { this.lastTouch = Date.now(); if (!this.touchMode) { this.touchMode = true; this.renderHint(); } }, { passive: true, capture: true });
    window.addEventListener('blur', () => Game.keys.clear());
    // touch
    cv.addEventListener('touchstart', e => {
      e.preventDefault(); this.lastTouch = Date.now();
      if (e.touches.length === 2) { const a = e.touches[0], b = e.touches[1]; this.pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }; this.clickCand = null; this.painting = false; return; }
      if (!this.touchMode) { this.touchMode = true; this.renderHint(); }
      const t = e.touches[0]; const [tx, ty] = Render.screenToTile(t.clientX, t.clientY); const tile = [Math.floor(tx), Math.floor(ty)];
      const direct = this.tool && (this.tool.kind === 'path' || this.tool.kind === 'terrain' || this.tool.kind === 'demolish');
      if (direct) { Render.hover = tile; this.applyTool(tile, e); this.painting = true; this.lastPaint = tile.join(','); }
      else this.clickCand = { x: t.clientX, y: t.clientY, moved: false, tile, aim: !!this.tool }; // tik = mikken (met gereedschap) of selecteren
    }, { passive: false });
    cv.addEventListener('touchmove', e => {
      e.preventDefault(); this.lastTouch = Date.now();
      if (e.touches.length === 2 && this.pinch) { const a = e.touches[0], b = e.touches[1]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), x = (a.clientX + b.clientX) / 2, y = (a.clientY + b.clientY) / 2; this.zoomAt(x, y, d / this.pinch.d); Render.cam.x -= (x - this.pinch.x) / Render.cam.zoom; Render.cam.y -= (y - this.pinch.y) / Render.cam.zoom; this.pinch = { d, x, y }; return; }
      const t = e.touches[0]; const [tx, ty] = Render.screenToTile(t.clientX, t.clientY); if (this.painting) Render.hover = [Math.floor(tx), Math.floor(ty)];
      if (this.clickCand) { if (Math.abs(t.clientX - this.clickCand.x) > 6 || Math.abs(t.clientY - this.clickCand.y) > 6) this.clickCand.moved = true; if (this.clickCand.moved) { Render.cam.x -= (t.clientX - this.clickCand.x) / Render.cam.zoom; Render.cam.y -= (t.clientY - this.clickCand.y) / Render.cam.zoom; this.clickCand.x = t.clientX; this.clickCand.y = t.clientY; Render.clampCamera(); } }
      else if (this.painting && this.tool) { const key = Render.hover.join(','); if (key !== this.lastPaint) { this.lastPaint = key; this.applyTool(Render.hover, e, true); } }
    }, { passive: false });
    cv.addEventListener('touchend', e => { e.preventDefault(); this.lastTouch = Date.now(); if (e.touches.length < 2) this.pinch = null; if (this.clickCand && !this.clickCand.moved) { if (this.clickCand.aim) Render.hover = this.clickCand.tile; else this.pick(this.clickCand.x, this.clickCand.y); } this.clickCand = null; this.painting = false; }, { passive: false });
  },
  zoomAt(mx, my, f) {
    const cam = Render.cam, old = cam.zoom, nz = Util.clamp(old * f, 0.35, 3);
    const wx = (mx - Render.W / 2) / old + cam.x, wy = (my - Render.H / 2) / old + cam.y;
    cam.zoom = nz; cam.x = wx - (mx - Render.W / 2) / nz; cam.y = wy - (my - Render.H / 2) / nz; Render.clampCamera();
  },
  entityAt(mx, my) {
    let best = null, bd = 16;
    const test = (e, kind) => { if (e.hidden) return; const [sx, sy] = Render.tileToScreen(e.x, e.y); const d = Math.hypot(sx - mx, sy - (my + 10 * Render.cam.zoom)); if (d < bd * Render.cam.zoom + 6) { bd = d / Render.cam.zoom; best = { kind, id: e.id }; } };
    for (const g of Guests.guests.values()) test(g, 'guest');
    for (const s of Staff.list.values()) test(s, 'staff');
    for (const a of Animals.list.values()) test(a, 'animal');
    return best;
  },
  pick(mx, my) {
    const ent = this.entityAt(mx, my); if (ent) { this.select(ent); return; }
    const [tx, ty] = Render.screenToTile(mx, my); const o = World.objAt(Math.floor(tx), Math.floor(ty));
    this.select(o ? { kind: 'obj', id: o.id } : null);
  },
  applyTool(tile, e, dragging) {
    const t = this.tool; if (!t) return;
    if (t.kind === 'demolish') { const ent = !dragging && e && e.clientX !== undefined ? this.entityAt(e.clientX, e.clientY) : null; if (ent && ent.kind === 'animal') { const a = Animals.list.get(ent.id); if (a) Game.sellAnimal(a, true); return; } Game.demolishAt(tile[0], tile[1], !!dragging); return; }
    if (this.moving) { const o = this.moving; if (Game.moveObject(o, tile[0], tile[1], this.toolMirror)) { this.moving = null; this.setTool(null); this.select({ kind: 'obj', id: o.id }); } return; }
    Game.build(t, tile[0], tile[1], this.toolMirror);
  },
};
