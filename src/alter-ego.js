  // ================================================================ ALTER EGO (superbonusen)
  // Förs in i C&T-koden av tools/make-ct-bas.js (före runFreeSpins), så allt i C&T:s spelkod går att använda här.
  // Lagermodellen (prototyp, Pontus 2026-11-11: "Bygg så ser vi om jag gillar det"; matten i src/alter-ego-motor.js):
  // varje omgång har sin egen vägg med LAYER 1–5 bakom brädet (inget följer med från förra omgången, Stakes regel), och
  // lavinerna lägger in sina bräden som nya lager. Killen, Katten och Växten i en vinst levlar och låses, och rutorna runt
  // en låst gubbe blir en lagerzon där en ruta räknas med symbolerna i lagren bakom den (steg 2 LAYER 1 … ALTER EGO alla,
  // två varv). I grundspelet gäller det under lavinerna i snurret, i superbonusen hela bonusen.
  // Här: gubbarnas bild och ram per steg (c.ae = steget, 2–5 = låst), zonen med LAYER 1 i hörnet, symbolerna ur lagren i
  // vinsten, låsta gubbar som står still när hjulen snurrar, panelen, ALTER EGO-kortet och ALTER EGO-läget i TEST.
  var AE_SYM = [2, 3, 4], AE_NAMN = ['KILLEN', 'KATTEN', 'VÄXTEN'];
  var AE_PIP = '#ff8629', AE_PIP_MAX = '#ffd21f';   // stegen (orange accent) och ALTER EGO (gul)
  // ramen och zonen i färgen för hur djupt gubben når: steg 2 = LAYER 1 blå, 3 = LAYER 1–2 grön, 4 = LAYER 1–3 röd
  // (UI-basen), 5 = ALTER EGO, alla fem, gul. Lagren själva har samma färger (LAYER 4 lila, LAYER 5 gul).
  var AE_LAYER_FARG = { 1: '#33c9ff', 2: '#3ccf6e', 3: '#ff3b3b', 4: '#b45cff', 5: '#ffd21f' };
  // hur djupt en gubbe på steg k når (samma som aeReach i spelmotorn): ALTER EGO alla fem
  function aeNar(k) { return k >= 5 ? 5 : Math.max(0, k - 1); }
  function aeRadie(k) { return k >= 5 ? 2 : 1; }
  // Pontus fem bilder per gubbe (steg 1–5); steg 1 är samma bild som symbolen i grundspelet
  var AE_SRC = {
    2: [0, 1, 2, 3, 4].map(function (k) { return 'assets/figur/lv' + k + '.webp'; }),
    3: [0, 1, 2, 3, 4].map(function (k) { return 'assets/figur/katt-lv' + k + '.webp'; }),
    4: [0, 1, 2, 3, 4].map(function (k) { return 'assets/figur/vaxt-lv' + k + '.webp'; })
  };
  var AE_IMG = {}, AE_BASE = {};
  AE_SYM.forEach(function (s) {
    AE_BASE[s] = SYM_IMG[s];
    AE_IMG[s] = AE_SRC[s].map(function (src) { var im = new Image(); im.src = src; return im; });
  });
  function aeOk(im) { return !!(im && im.complete && im.naturalWidth > 1); }

  // ---- gubbarna på brädet
  // gubbens bild för steg k, i brädets storlek (byggs första gången den behövs och när rutorna byter storlek)
  var aeSprC = {};
  function aeSpr(s, k) {
    var size = sprites[s] && sprites[s].width;
    if (!size || !AE_IMG[s]) return null;
    k = Math.max(1, Math.min(5, k));
    var key = s + ':' + k + ':' + size;
    if (aeSprC[key]) return aeSprC[key];
    var im = k > 1 ? AE_IMG[s][k - 1] : AE_BASE[s];
    if (!aeOk(im)) return null;
    var keep = SYM_IMG[s], keepB = symPaBrade;
    SYM_IMG[s] = im; symPaBrade = true;
    try { aeSprC[key] = makeSprite(s, size); } finally { SYM_IMG[s] = keep; symPaBrade = keepB; }
    return aeSprC[key];
  }
  // aeLockView: de låsta gubbarna medan hjulen snurrar och landar ({ L: steg per ruta, G: brädet })
  var aeLockView = null;
  // rutans steg: c.ae, och medan hjulen landar de låsta gubbarna (rutorna har inte fått c.ae än)
  function aeStegAt(c, x) {
    if (c.ae) return c.ae;
    if (!aeLockView) return 0;
    var r = Math.round(x / cell), y = Math.round(c.y);
    return Math.abs(c.y - y) < 0.02 && aeLockView.L[r] ? aeLockView.L[r][y] || 0 : 0;
  }
  // drawCell ritar en låst gubbe med sitt stegs bild (symbolens bild byts bara medan rutan ritas). Symbolanimationen efter
  // studsen hör till symbolens vanliga bild, så den står över för låsta gubbar.
  function aeSwap(c, x) {
    if (c.aecLev) {
      // superbonusens gubbar (c.aecLev = LAYER 1–5): bilden för LAYER n är bild n, ALTER EGO bild 5
      var oc = { k: c.aecLev, s: c.sym, p: null, a: SYM_ANIM }, sc = AE_IMG[c.sym] && aeSpr(c.sym, c.aecLev);
      if (sc) { oc.p = sprites[c.sym]; sprites[c.sym] = sc; SYM_ANIM = false; }
      return oc;
    }
    var k = aeStegAt(c, x);
    if (k < 2 || !AE_IMG[c.sym]) return null;
    var o = { k: k, s: c.sym, p: sprites[c.sym], a: SYM_ANIM }, spr = aeSpr(c.sym, k);
    if (spr) { sprites[c.sym] = spr; SYM_ANIM = false; } else o.p = null;
    return o;
  }
  function aeUnswap(o) { if (o && o.p) { sprites[o.s] = o.p; SYM_ANIM = o.a; } }
  // den låsta rutan: en mörk platta bakom gubben
  function aeTile(g, c, x, highlight, k) {
    if (c.pop >= 0) return;
    var y = c.y * cell;
    if (y > boardPx || y < -cell) return;
    aePlatta(g, x, y, highlight && !c.win ? 0.2 : 1);
  }
  function aePlatta(g, x, y, alpha) {
    g.save(); g.globalAlpha = alpha;
    g.fillStyle = 'rgba(21,17,31,0.92)';
    rr(g, x + cell * 0.04, y + cell * 0.04, cell * 0.92, cell * 0.92, cell * 0.16); g.fill();
    g.restore();
  }
  // ramen i lagrets färg och lagrets siffra
  function aeMark(g, c, x, highlight, k) {
    if (c.pop >= 0) return;
    var y = c.y * cell;
    if (y > boardPx || y < -cell) return;
    aeRam(g, x, y, k, highlight && !c.win ? 0.2 : 1, !!c.aecLev);
  }
  function aeRam(g, x, y, k, alpha, direct) {
    var n = direct ? k : aeNar(k), col = AE_LAYER_FARG[n] || AE_PIP;
    g.save(); g.globalAlpha = alpha;
    g.strokeStyle = col; g.lineWidth = Math.max(2, cell * 0.05);
    rr(g, x + cell * 0.05, y + cell * 0.05, cell * 0.9, cell * 0.9, cell * 0.15); g.stroke();
    // siffran: gubbens lager (ALTER EGO: ∞)
    var br = cell * 0.13, bx = x + cell * 0.84, by = y + cell * 0.16;
    g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = Math.max(1.5, cell * 0.025);
    g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = INK; g.font = Math.round(br * 1.5) + 'px ' + DISPLAY; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(k >= 5 ? '∞' : String(n), bx, by + br * 0.08);
    g.restore();
  }
  // medan hjulen snurrar står de låsta gubbarna still ovanpå hjulet (anropas för varje hjul, inom hjulets ruta)
  function aeDrawLocked(g, r, x) {
    for (var y = 0; y < ROWS; y++) {
      var k = aeLockView.L[r] && aeLockView.L[r][y];
      if (!(k >= 2)) continue;
      var sym = aeLockView.G[r][y], py = y * cell, spr = aeSpr(sym, k) || sprites[sym];
      aePlatta(g, x, py, 1);
      if (spr) g.drawImage(spr, x, py, cell, cell);
      aeRam(g, x, py, k, 1);
    }
  }
  // ---- lagerzonen: aeZ = hur djupt varje ruta når (0 = utanför), aePeekG = LAYER 1 (syns i hörnet på rutorna i zonen)
  var aeZ = null, aePeekG = null;
  function aeZoneCalc() {
    var Z = [], r, y;
    for (r = 0; r < REELS; r++) Z.push(new Array(ROWS).fill(0));
    for (r = 0; r < REELS; r++) for (y = 0; y < ROWS; y++) {
      var c = reels[r] && reels[r].cells[y], k = aeLockView ? aeLockView.L[r][y] : c && c.ae;
      if (!(k >= 2)) continue;
      var d = aeNar(k), rad = aeRadie(k);
      for (var dr = -rad; dr <= rad; dr++) for (var dy = -rad; dy <= rad; dy++) {
        var rr2 = r + dr, yy = y + dy;
        if (rr2 >= 0 && rr2 < REELS && yy >= 0 && yy < ROWS && d > Z[rr2][yy]) Z[rr2][yy] = d;
      }
    }
    aeZ = Z;
  }
  // rutans zon (bara när rutan står på sin plats)
  function aeZoneAt(c, x) {
    if (!aeZ) return 0;
    var r = Math.round(x / cell), y = Math.round(c.y);
    return Math.abs(c.y - y) < 0.02 && aeZ[r] ? aeZ[r][y] || 0 : 0;
  }
  // zonen: en svag ton i färgen för hur djupt rutan når
  function aeZoneBg(g, c, x, highlight, z) {
    if (c.pop >= 0) return;
    var y = c.y * cell, col = AE_LAYER_FARG[z] || AE_PIP;
    g.save(); g.globalAlpha = highlight && !c.win ? 0.08 : 0.2;
    g.fillStyle = col; rr(g, x + cell * 0.04, y + cell * 0.04, cell * 0.92, cell * 0.92, cell * 0.16); g.fill();
    g.globalAlpha = highlight && !c.win ? 0.15 : 0.55; g.strokeStyle = col; g.lineWidth = Math.max(1, cell * 0.02);
    g.stroke(); g.restore();
  }
  // hörnet: symbolen i LAYER 1 bakom rutan (i vinsten i stället symbolen ur lagret som vinsten använder, med LAYER-siffran)
  function aePeek(g, c, x, highlight, z) {
    if (c.pop >= 0) return;
    var y = c.y * cell;
    if (c.aeDoor) { aeDorr(g, x, y, c.aeDoor); return; }
    var r = Math.round(x / cell), yy = Math.round(c.y), sym = aePeekG && aePeekG[r] ? aePeekG[r][yy] : -1;
    if (sym == null || sym < 0 || !sprites[sym]) return;
    var s = cell * 0.36, sx = x + cell * 0.6, sy = y + cell * 0.6;
    g.save(); g.globalAlpha = highlight && !c.win ? 0.2 : 0.95;
    g.fillStyle = PAPER; g.strokeStyle = AE_LAYER_FARG[1]; g.lineWidth = Math.max(1.5, cell * 0.03);
    g.beginPath(); g.moveTo(sx + s, sy - s * 0.06); g.lineTo(sx + s, sy + s); g.lineTo(sx - s * 0.06, sy + s); g.closePath(); g.fill(); g.stroke();
    g.drawImage(sprites[sym], sx + s * 0.34, sy + s * 0.34, s * 0.64, s * 0.64);
    g.restore();
  }
  // en symbol ur ett lager i vinsten: syns stort i hörnet, med LAYER-siffran i lagrets färg
  function aeDorr(g, x, y, d) {
    var col = AE_LAYER_FARG[d.d] || AE_PIP, s = cell * 0.5, sx = x + cell * 0.47, sy = y + cell * 0.47;
    g.save();
    g.fillStyle = PAPER; g.strokeStyle = col; g.lineWidth = Math.max(2, cell * 0.05);
    rr(g, sx, sy, s, s, cell * 0.1); g.fill(); g.stroke();
    if (sprites[d.sym]) g.drawImage(sprites[d.sym], sx + s * 0.06, sy + s * 0.02, s * 0.88, s * 0.88);
    var lw = cell * 0.56, lh = cell * 0.18, lx = x + cell * 0.04, ly = y + cell * 0.04;
    g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = Math.max(1.5, cell * 0.025);
    rr(g, lx, ly, lw, lh, lh * 0.4); g.fill(); g.stroke();
    g.fillStyle = INK; g.font = Math.round(lh * 0.8) + 'px ' + DISPLAY; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('LAYER ' + d.d, lx + lw / 2, ly + lh * 0.56);
    g.restore();
  }
  // gubbarnas steg från matten (L) läggs på brädets rutor; peek: det nya LAYER 1 (brädet som lavinen sprängde)
  function aeCells(L, peek) {
    for (var r = 0; r < REELS; r++) for (var y = 0; y < ROWS; y++) {
      var c = reels[r] && reels[r].cells[y];
      if (!c) continue;
      c.ae = (L[r] && L[r][y]) || 0; c.aeDoor = null;
    }
    if (peek) aePeekG = peek.map(function (col) { return col.slice(); });
    aeZoneCalc(); aePanel();
  }
  // ett nytt snurr (grundspelet) eller frispinn: de låsta gubbarna står kvar medan hjulen snurrar
  function aeSpinStart(res) {
    aeBuild(); aePlace(); aeEl.hidden = false;
    aeLockView = { L: res.aeL0, G: res.startGrid }; aeZ = null; aePanel();
  }
  function aeLanded(res) { aeLockView = null; aeCells(res.aeL0, res.aePeek0); }
  // vinsten: rutorna där vinsten tar en symbol ur ett lager lyser och visar symbolen och lagret
  function aeLayerWin(st) {
    st.lused.forEach(function (l) {
      var c = reels[l.r] && reels[l.r].cells[l.y];
      if (!c) return;
      c.win = true;
      if (!c.aeDoor || l.k > c.aeDoor.d) c.aeDoor = { sym: l.sym, d: l.k };
    });
  }
  // gubbarna i vinsten levlar (de sprängs inte): ny bild och ram, en studs och en ring i färgen för hur djupt de når;
  // når en gubbe ALTER EGO (steg 5) visas kortet
  async function aeLevel(st) {
    reels.forEach(function (rl) { rl.cells.forEach(function (c) { c.aeDoor = null; }); });
    var top = null;
    st.up.forEach(function (u) {
      var c = reels[u.r] && reels[u.r].cells[u.y];
      if (!c) return;
      c.ae = u.k; c.tagIn = 0;
      parts.push({ kind: 'ring', x: u.r * cell + cell / 2, y: u.y * cell + cell / 2, life: 0, max: 0.35, c: AE_LAYER_FARG[aeNar(u.k)] || AE_PIP });
      if (u.k >= 5 && !top) top = c.sym;
    });
    aeZoneCalc(); aePanel();
    if (top != null) await aeCard(AE_SYM.indexOf(top), true);
  }
  // grundspelets omgång är slut: inga låsta gubbar eller zoner syns (inget ska se ut att följa med till nästa omgång)
  function aeRoundEnd() {
    if (state.fs) return;
    reels.forEach(function (rl) { rl.cells.forEach(function (c) { c.ae = 0; c.aeDoor = null; }); });
    aeLockView = null; aeZ = null; aePeekG = null; aePanel();
  }
  function aeCard(i, max) {
    var fx = document.createElement('div'); fx.className = 'ae-fx';
    fx.innerHTML = '<div class="ae-card' + (max ? ' max' : '') + '"><img alt="" src="' + AE_SRC[AE_SYM[i]][4] + '"><b>' + AE_NAMN[i] + ' · ALTER EGO!</b></div>';
    (document.getElementById('frame') || document.body).appendChild(fx);
    return wait(showTime(1.6)).then(function () { fx.remove(); });
  }

  // ---- panelen: på datorn i högerspalten, på telefonen under knapparna (bara under superbonusen)
  var aeEl = null;
  function aeCss() {
    if (document.getElementById('aeCss')) return;
    var css = document.createElement('style'); css.id = 'aeCss';
    css.textContent =
      '.ae-panel { display: grid; gap: 10px; padding: 12px; border-radius: 16px; background: rgba(21,17,31,.9); border: 2px solid rgba(255,246,224,.22); color: var(--paper, #fff6e0); font-family: var(--ui, "Fredoka", sans-serif); }' +
      '.ae-title { font-family: var(--display, "Bangers", Impact, sans-serif); font-size: 30px; letter-spacing: .05em; text-align: center; color: #ff8629; -webkit-text-stroke: 1.5px #15111f; paint-order: stroke fill; line-height: 1; }' +
      '.ae-row { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 10px; align-items: center; }' +
      '.ae-row img { width: 56px; height: 56px; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,.5)); }' +
      '.ae-name { font-family: var(--display, "Bangers", Impact, sans-serif); font-size: 21px; letter-spacing: .05em; line-height: 1; }' +
      '.ae-step { font-size: 11px; font-weight: 700; letter-spacing: .03em; white-space: nowrap; opacity: .85; margin-top: 2px; }' +
      '.ae-row.max .ae-step { color: #ffd21f; opacity: 1; }' +
      '.ae-pips { display: flex; gap: 4px; margin-top: 5px; }' +
      '.ae-pips i { width: 17px; height: 8px; border-radius: 3px; background: rgba(255,246,224,.14); border: 1.5px solid #15111f; }' +
      '.portrait .ae-panel { position: absolute; left: 0; right: 0; top: calc(100% + 12px); z-index: 5; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 8px; gap: 8px; }' +
      '.portrait .ae-title { display: none; }' +
      '.portrait .ae-row { grid-template-columns: 34px minmax(0, 1fr); gap: 5px; }' +
      '.portrait .ae-row img { width: 34px; height: 34px; }' +
      '.portrait .ae-name { font-size: 13px; } .portrait .ae-step { font-size: 8px; white-space: normal; }' +
      '.portrait .ae-pips i { width: 9px; height: 6px; }' +
      '.ae-fx { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; z-index: 40; }' +
      '.ae-card { display: grid; justify-items: center; gap: 4px; animation: aeCard 1.3s ease-out both; }' +
      '.ae-card img { width: 46%; max-width: 360px; filter: drop-shadow(0 10px 30px rgba(0,0,0,.75)); }' +
      '.ae-card b { font-family: var(--display, "Bangers", Impact, sans-serif); font-weight: 400; font-size: 60px; letter-spacing: .05em; color: #fff; -webkit-text-stroke: 3px #15111f; paint-order: stroke fill; text-shadow: 4px 4px 0 #15111f; white-space: nowrap; }' +
      '.ae-card.max b { color: #ffd21f; }' +
      '.portrait .ae-card b { font-size: 30px; -webkit-text-stroke: 2px #15111f; }' +
      '@keyframes aeCard { 0% { transform: scale(.3); opacity: 0; } 18% { transform: scale(1.12); opacity: 1; } 30% { transform: scale(1); } 82% { opacity: 1; } 100% { opacity: 0; transform: scale(1.04); } }';
    document.head.appendChild(css);
  }
  function aeBuild() {
    aeCss();
    if (aeEl) return aeEl;
    aeEl = document.createElement('section'); aeEl.className = 'ae-panel'; aeEl.id = 'aePanel'; aeEl.hidden = true;
    aeEl.setAttribute('aria-live', 'polite');
    aeEl.innerHTML = '<div class="ae-title">ALTER EGO</div>' + AE_SYM.map(function (s, i) {
      return '<div class="ae-row" data-i="' + i + '"><img alt=""><div><div class="ae-name">' + AE_NAMN[i] + '</div><div class="ae-step"></div>' +
        '<div class="ae-pips"><i></i><i></i><i></i><i></i><i></i></div></div></div>';
    }).join('');
    return aeEl;
  }
  function aePlace() {
    var el2 = aeBuild(), portrait = document.documentElement.classList.contains('portrait');
    var home = document.getElementById(portrait ? 'machine' : 'right');
    if (home && el2.parentNode !== home) { if (portrait) home.appendChild(el2); else home.insertBefore(el2, home.firstChild); }
  }
  // per gubbe: hur många som är låsta och det högsta steget (från rutorna, eller de låsta medan hjulen snurrar)
  function aeStats() {
    var st = AE_SYM.map(function () { return { n: 0, max: 1 }; });
    for (var r = 0; r < REELS; r++) for (var y = 0; y < ROWS; y++) {
      var k, sym;
      if (aeLockView) { k = aeLockView.L[r] && aeLockView.L[r][y]; sym = aeLockView.G[r][y]; }
      else { var c = reels[r] && reels[r].cells[y]; if (!c) continue; k = c.ae; sym = c.sym; }
      var i = AE_SYM.indexOf(sym);
      if (i < 0 || !(k >= 2)) continue;
      st[i].n++; if (k > st[i].max) st[i].max = k;
    }
    return st;
  }
  function aePanel() {
    if (!aeEl || aeEl.hidden) return;
    aePlace();
    var stats = aeStats(), rows = aeEl.querySelectorAll('.ae-row');
    for (var i = 0; i < 3; i++) {
      var s = stats[i], k = s.max, row = rows[i], img = row.querySelector('img'), src = AE_SRC[AE_SYM[i]][k - 1];
      if (img.getAttribute('src') !== src) img.setAttribute('src', src);
      row.querySelector('.ae-step').textContent = !s.n ? 'INGEN LÅST' : s.n + ' LÅST' + (s.n > 1 ? 'A' : '') + ' · ' + (k >= 5 ? 'ALTER EGO' : 'STEG ' + k);
      row.querySelectorAll('.ae-pips i').forEach(function (p, j) { p.style.background = j < k ? (k >= 5 ? AE_PIP_MAX : AE_PIP) : ''; });
      row.classList.toggle('max', k >= 5);
    }
  }
  function aeInit() { aeBuild(); aePlace(); aeEl.hidden = false; aeLockView = null; aeZ = null; aePeekG = null; aePanel(); }
  function aeEnd() {
    if (aeEl) aeEl.hidden = true;
    aeLockView = null; aeZ = null; aePeekG = null;
    // brädet efter bonusen har inga låsta gubbar
    reels.forEach(function (rl) { rl.cells.forEach(function (c) { c.ae = 0; c.aeDoor = null; }); });
    document.querySelectorAll('.ae-fx').forEach(function (f) { f.remove(); });
  }

  // ---- TEST-menyn, bonusens startkort och reglerna
  function aeNew() {
    return [['aeGo', 'ALTER EGO: gratis superbonus', 'Gubbarna i hörnen levlar (3 vinster = nästa LAYER); vinster lånar ur lagren bakåt och ur nästa frispinn (FRAMÅT).']];
  }
  // ---- ALTER EGO-läget (TEST-menyn, Pontus 2026-11-11: "så jag inte behöver starta bonusen varje gång"): varje vanligt
  // snurr spelas som ett frispinn i superbonusen (spelmotorns aeTestSpin), och de låsta gubbarna står kvar mellan
  // snurren. Ingen bonusstart, inget startkort, ingen summering och ingen storvinst-ruta. Snurret kostar insatsen som
  // vanligt (låtsassaldot) och betalar superbonusens vinster. Av och på igen nollställer gubbarna.
  var aeTestOn = false;
  function aeTestToggle() {
    aeTestOn = !aeTestOn;
    M.aeTestSpin(null, true);
    if (aeTestOn) aeInit(); else aeEnd();
  }
  function aeTestGame(hist) {
    var r = M.aeTestSpin(rng);
    return { version: M.ENGINE_VERSION, thr: null, base: r, bonus: null, rawX: r.x, x: Math.min(r.x, M.TIME.maxX), capped: r.x >= M.TIME.maxX, wallOut: hist };
  }
  function aeFacts() {
    return '<p><b>Fyra gubbar i hörnen.</b> ' + M.AEC_HITS + ' vinster = nästa LAYER. Gubbens LAYER är multi och hur många lager bakåt vinsten når.</p>' +
      '<p><b>Lån:</b> saknas en symbol får vinsten låna den ur lagren bakom brädet eller ur nästa frispinn (<b>FRAMÅT</b>). <b>INFINITY-tal</b> på rutorna läggs till multin.</p>' +
      '<p>När alla fyra är på LAYER 4 <b>släpper spärren: ALTER EGO</b>. Efter frispinnen <b>rivs väggen</b> (LAYER 1 = x2 … LAYER 5 = x10), sist <b>INFINITY</b> om spärren släppte</p>';
  }
  function aeRule() {
    return '<li>' + txl('Grundspelet: 7 hjul och 7 rader, vinster från vänster och laviner. Grundspelet har inga lager.') + '</li>' +
      '<li>' + txl('ALTER EGO, frispinnen: fyra gubbar (Killen, Katten, Växten och A) sitter fast i var sitt hörn hela bonusen och börjar på LAYER 1. Vinsterna betalar åt båda hållen, från vänster och från höger. En gubbe som har varit med i {n} vinster går upp ett LAYER, upp till LAYER 4.', { n: M.AEC_HITS }) + '</li>' +
      '<li>' + txl('Väggen: när bonusen startar ligger 5 lager bakom brädet (LAYER 1–5). När ett frispinn är slut läggs brädet överst som nytt LAYER 1 och det äldsta faller bort.') + '</li>' +
      '<li>' + txl('Lån bakåt: saknas symbolen på ett hjul får vinsten låna den ur lagren bakom brädet, i rutan på samma rad som vinsten kom ifrån, LAYER 1 först. En vinst genom en gubbe når lika många lager som gubbens LAYER, annars LAYER 1. En vinst lånar högst en symbol.') + '</li>' +
      '<li>' + txl('Lån framåt (FRAMÅT): nästa frispinns bräde syns redan. Finns symbolen inte i lagren bakåt får vinsten låna den därifrån. Den rutan är tom när nästa frispinn landar och fylls ovanifrån.') + '</li>' +
      '<li>' + txl('Multi: gubbens LAYER (LAYER 3 = x3, x5 genom mitten när spärren har släppt) plus INFINITY-talen i vinstens rutor, lånade rutor inräknade. LAYER 3 och två x5 = x13. Några rutor har ett tal (x2–x100), och ett tal som har använts försvinner. WILD x2, x3 och x5 gångrar vägarna.') + '</li>' +
      '<li>' + txl('Spärren: mitten är låst. När alla fyra gubbarna står på LAYER 4 släpper spärren: ALTER EGO. Gubbarna går in i mitten och blir LAYER 5, och vinster som går genom mittens 3×3 rutor får x5 resten av bonusen.') + '</li>' +
      '<li>' + txl('Finalen efter sista frispinnet: väggen rivs. Släppte spärren får du LAYER 1–5, annars så många lager som den högsta gubben nådde. Varje lager spelas som ett eget bräde med dubbla sitt nummer i multi (LAYER 1 = x2, LAYER 3 = x6, LAYER 5 = x10), med gubbarna på sina rutor och en WILD i mitten när spärren har släppt.') + '</li>' +
      '<li>' + txl('INFINITY: släppte spärren kommer ett sista bräde efter LAYER 5. Ungefär var åttonde ruta har ett tal (x2, x3, x5, x10, x25, x50, x100, x500 eller x1000). En vinst gångras med summan av talen i sina rutor, och ett tal som har använts försvinner.') + '</li>';
  }


  // ================================================================ superbonusen: gubbarna, spärren och lagren
  // Matten i src/alter-ego-motor.js (AEC, mattespecen). Här: de fyra gubbarna i hörnrutorna (c.aecLev = LAYER, bild och ram
  // i lagrets färg) som står still när hjulen snurrar, mitten med spärren, INFINITY-talen på rutorna (ODD INFINITY:s färger),
  // lånen med C&T:s rivna hörn, och panelen med gubbarna, ODD INFINITY-skylten och FRAMÅT-brädet (nästa frispinn). Inga kort
  // eller andra animationer (Pontus 2026-11-11: "ta bort alla animationer").
  var AEC_FARG = AE_LAYER_FARG;   // LAYER 1 blå, 2 grön, 3 röd, 4 lila, 5 gul (ALTER EGO)
  var AEC_NAMN = ['KILLEN', 'KATTEN', 'VÄXTEN', 'A'];
  // ODD INFINITY: skiffer, kräm och turkos (skylten), bilderna ur C&T:s ODD INFINITY (Pontus 2026-11-11: "ODD infinty är
  // det som ska användas för infinitylayert")
  var AEC_SKIFFER = '#1d2629', AEC_KRAM = '#f6e7c8', AEC_TURKOS = '#3fbfa0';
  var AEC_ODD = { last: 'assets/odd-inf/odd-inf-last.webp', oppen: 'assets/odd-inf/odd-inf-oppen.webp' };
  // aecView: { lev: gubbarnas LAYER, open: spärren har släppt, final: lagret som rivs i finalen (6 = INFINITY), depth,
  // inf: talen på rutorna, next: FRAMÅT-brädet { g, v }, started }; aecSpin: hjulen snurrar (gubbarna ritas fast ovanpå)
  var aecView = null, aecEl = null, aecSpin = false;
  function aecPosOf(i) { var q = aecView && aecView.open ? M.AEC_MID[i] : M.AEC_HOME[i]; return { r: q[0], y: q[1] }; }
  function aecSprOf(i, lev) { var sym = M.AEC_SYM[i]; return (AE_IMG[sym] && aeSpr(sym, lev)) || sprites[sym]; }
  // gubbarnas rutor på brädet får sitt LAYER (bild och ram); allt annat nollställs
  function aecIconsSet(st) {
    if (st && st.aecPlace) st.aecPlace.forEach(function (q) { var c = reels[q.r] && reels[q.r].cells[q.y]; if (c) c.sym = q.sym; });
    reels.forEach(function (rl) { rl.cells.forEach(function (c) { c.aecLev = 0; }); });
    if (!aecView) return;
    for (var i = 0; i < 4; i++) {
      var p = aecPosOf(i), c = reels[p.r] && reels[p.r].cells[p.y];
      if (c && c.sym === M.AEC_SYM[i]) c.aecLev = aecView.lev[i];
    }
  }
  // medan hjulen snurrar står gubbarna still ovanpå sitt hjul
  function aecDrawLocked(g, r, x) {
    if (!aecView) return;
    for (var i = 0; i < 4; i++) {
      var p = aecPosOf(i);
      if (p.r !== r) continue;
      var py = p.y * cell, spr = aecSprOf(i, aecView.lev[i]);
      aePlatta(g, x, py, 1);
      if (spr) g.drawImage(spr, x, py, cell, cell);
      aeRam(g, x, py, aecView.lev[i], 1, true);
    }
  }
  // ---- lånen med C&T:s rivna hörn (Pontus 2026-11-11: "ta bort alla animationer och när dem är lånad så ska dem ha samma
  // utseende som C&T avriven icon", "Det ska vara genomgående. Och då kan man ändra färg när det är framtida eller lånad")
  // I frispinnen syns LAYER 1 (förra frispinnets bräde) i det rivna hörnet på varje ruta, som i C&T. En vinst som lånar
  // river affischen i rutan: lån bakåt i lagrets färg med LAYER-taggen (LAYER 1 blå … LAYER 5 gul), lån framåt (FRAMÅT,
  // djup 7 i spelmotorn) i turkos med » i brickan. Spelmotorn sätter vinstens gcols/depth/gsym (aecGhost) och ghostUsed.
  DEPTH_COL[7] = AEC_TURKOS; DEPTH_TINT[7] = 'rgba(63, 191, 160, 0.26)';
  function aecGhostView(res) {
    return state.fs && res && res.aecWall1 ? { grid: res.aecWall1.map(function (c) { return c.slice(); }), t0: clock, out: null } : null;
  }
  // ovanpå brädet: mitten (frispinnen) och talen på rutorna
  function aecDraw(g) {
    if (!aecView) return;
    if (!aecView.final) aecMidDraw(g);
    if (aecView.inf && !aecSpin) aecInfDraw(g);
  }
  // mitten: låst (en skylt med hur många gubbar som saknar LAYER 4) eller öppen (guld, ALTER EGO x5)
  function aecMidDraw(g) {
    var x0 = cell * 2, y0 = cell * 2, w = cell * 3, open = aecView.open;
    var left = aecView.lev.filter(function (l) { return l < M.AEC_LOCK; }).length;
    var fl = 0;
    g.save();
    g.globalAlpha = open ? 0.14 + 0.3 * fl : 0.06; g.fillStyle = open ? AEC_FARG[5] : PAPER;
    rr(g, x0 + 3, y0 + 3, w - 6, w - 6, cell * 0.2); g.fill();
    g.globalAlpha = open ? 0.95 : 0.45; g.strokeStyle = open ? AEC_FARG[5] : PAPER; g.lineWidth = Math.max(2, cell * (open ? 0.06 : 0.035));
    if (!open) g.setLineDash([cell * 0.12, cell * 0.09]);
    rr(g, x0 + 3, y0 + 3, w - 6, w - 6, cell * 0.2); g.stroke(); g.setLineDash([]);
    var txt = open ? 'ALTER EGO  x5' : 'LÅST · ' + left + ' KVAR TILL LAYER ' + M.AEC_LOCK;
    var lh = cell * 0.28, lw = Math.min(w - cell * 0.2, lh * 0.5 * txt.length + lh), lx = x0 + (w - lw) / 2, ly = y0 + w - lh - cell * 0.08;
    g.globalAlpha = 1; g.fillStyle = open ? AEC_FARG[5] : INK; g.strokeStyle = open ? INK : PAPER; g.lineWidth = Math.max(1.5, cell * 0.025);
    rr(g, lx, ly, lw, lh, lh * 0.45); g.fill(); g.stroke();
    g.fillStyle = open ? INK : PAPER; g.font = Math.round(lh * 0.62) + 'px ' + DISPLAY; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, lx + lw / 2, ly + lh * 0.56);
    g.restore();
  }
  // INFINITY-talen på rutorna: brickor i ODD INFINITY:s färger nere i hörnet
  function aecInfDraw(g) {
    var V = aecView.inf;
    for (var r = 0; r < REELS; r++) for (var y = 0; y < ROWS; y++) {
      var v = V[r] && V[r][y];
      if (!v) continue;
      var k = 0;
      aecBricka(g, r * cell, y * cell, cell, v, k);
    }
  }
  function aecBricka(g, x, y, size, v, k) {
    k = k || 0;
    var bw = size * (0.52 + 0.12 * k), bh = size * (0.25 + 0.06 * k), bx = x + size - bw - size * 0.04, by = y + size - bh - size * 0.04;
    g.save();
    g.fillStyle = AEC_SKIFFER; g.strokeStyle = v >= 100 ? AEC_FARG[5] : AEC_TURKOS; g.lineWidth = Math.max(1.5, size * 0.035);
    rr(g, bx, by, bw, bh, bh * 0.45); g.fill(); g.stroke();
    g.fillStyle = v >= 100 ? AEC_FARG[5] : AEC_KRAM; g.font = Math.round(bh * 0.78) + 'px ' + DISPLAY; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('x' + v, bx + bw / 2, by + bh * 0.56);
    g.restore();
  }
  // ett frispinn börjar: gubbarnas läge och FRAMÅT-brädet, eller finalens lager. Inga kort (Pontus 2026-11-11: "ta bort
  // alla animationer"). Talen syns först när brädet har landat.
  async function aecSpinStart(res) {
    aecBuild(); aecPlace(); aecEl.hidden = false; if (aeEl) aeEl.hidden = true;
    if (!aecView) aecView = { lev: res.aeC0.slice(), open: !!res.aeOpen0 };
    aecView.lev = res.aeC0.slice(); aecView.open = !!res.aeOpen0;
    aecView.inf = null;
    aecSpin = true;
    if (res.aeFinal) { aecView.final = res.aeFinal; aecView.depth = res.aeDepth; aecView.next = null; aecPanel(); return; }
    aecView.final = 0; aecView.started = true;
    aecView.next = res.aecNext0 ? { g: res.aecNext0.g.map(function (c) { return c.slice(); }), v: res.aecNext0.v.map(function (c) { return c.slice(); }) } : null;
    aecPanel();
  }
  function aecLanded(res) {
    aecSpin = false; aecIconsSet(null);
    var V = res && (res.aecV0 || res.aeInfV0);
    if (aecView) aecView.inf = V ? V.map(function (c) { return c.slice(); }) : null;
  }
  // vinsten: lånen syns med C&T:s rivna hörn (spelets egen tidsvägsvisning); här bara ingenting extra
  function aecWinShow(st) { }
  // efter ett lavinsteg: talen som användes försvinner, rutan som lånades ur FRAMÅT blir tom i panelen, gubbarnas LAYER och
  // spärren uppdateras (utan kort)
  async function aecStep(st) {
    if (!aecView) return;
    if (aecView.final) {
      if (st.aeInfUsed) st.aeInfUsed.forEach(function (c) { if (aecView.inf) aecView.inf[c.r][c.y] = 0; });
      return;
    }
    if (!st.aeC) return;
    var u = st.aecUse;
    if (u) {
      u.inf.forEach(function (c) { if (aecView.inf) aecView.inf[c.r][c.y] = 0; });
      u.fwd.forEach(function (c) { if (aecView.next) { aecView.next.g[c.r][c.y] = -1; aecView.next.v[c.r][c.y] = 0; } });
    }
    aecView.lev = st.aeC.slice();
    st.aeCup.forEach(function (i) { var p = aecPosOf(i), c = reels[p.r] && reels[p.r].cells[p.y]; if (c) c.aecLev = st.aeC[i]; });
    if (st.aeOpened) aecView.open = true;
    aecPanel();
  }
  // panelen: gubbarnas LAYER, ODD INFINITY-skylten (bakom stängslet tills spärren släpper) och FRAMÅT-brädet (nästa
  // frispinn, med sina tal)
  function aecBuild() {
    aeCss();
    if (!document.getElementById('aecCss')) {
      var css = document.createElement('style'); css.id = 'aecCss';
      css.textContent = '.ae-fin { font-family: var(--display, "Bangers", Impact, sans-serif); font-size: 17px; letter-spacing: .05em; text-align: center; color: #ffd21f; }' +
        '.aec-odd { width: 100%; display: block; }' +
        '.aec-fram { display: grid; gap: 4px; justify-items: center; } .aec-fram b { font-family: var(--display, "Bangers", Impact, sans-serif); font-weight: 400; font-size: 15px; letter-spacing: .05em; color: ' + AEC_TURKOS + '; }' +
        '.aec-fram canvas { width: 154px; height: 154px; border-radius: 8px; border: 2px solid ' + AEC_TURKOS + '; background: ' + AEC_SKIFFER + '; }' +
        '.portrait #aecPanel { grid-template-columns: repeat(4, minmax(0, 1fr)); } .portrait .ae-fin { grid-column: 1 / -1; font-size: 12px; }' +
        '.portrait .aec-odd { grid-column: 1 / 3; } .portrait .aec-fram { grid-column: 3 / 5; } .portrait .aec-fram canvas { width: 84px; height: 84px; } .portrait .aec-fram b { font-size: 10px; }';
      document.head.appendChild(css);
    }
    if (aecEl) return aecEl;
    aecEl = document.createElement('section'); aecEl.className = 'ae-panel'; aecEl.id = 'aecPanel'; aecEl.hidden = true;
    aecEl.innerHTML = '<div class="ae-title">ALTER EGO</div>' + [0, 1, 2, 3].map(function (i) {
      return '<div class="ae-row" data-i="' + i + '"><img alt=""><div><div class="ae-name">' + AEC_NAMN[i] + '</div><div class="ae-step"></div>' +
        '<div class="ae-pips"><i></i><i></i><i></i><i></i><i></i></div></div></div>';
    }).join('') + '<div class="ae-fin"></div><img class="aec-odd" alt="INFINITY">' +
      '<div class="aec-fram"><b></b><canvas width="308" height="308"></canvas></div>';
    return aecEl;
  }
  function aecPlace() {
    var el3 = aecBuild(), portrait = document.documentElement.classList.contains('portrait');
    var home = document.getElementById(portrait ? 'machine' : 'right');
    if (home && el3.parentNode !== home) { if (portrait) home.appendChild(el3); else home.insertBefore(el3, home.firstChild); }
  }
  function aecPanel() {
    if (!aecEl || aecEl.hidden || !aecView) return;
    aecPlace();
    var rows = aecEl.querySelectorAll('.ae-row'), left = aecView.lev.filter(function (l) { return l < M.AEC_LOCK; }).length;
    for (var i = 0; i < 4; i++) {
      var lv = aecView.lev[i], sym = M.AEC_SYM[i], row = rows[i], img = row.querySelector('img');
      var src = AE_SRC[sym] ? AE_SRC[sym][lv - 1] : symRawSrc(sym);
      if (src && img.getAttribute('src') !== src) img.setAttribute('src', src);
      row.querySelector('.ae-step').textContent = lv >= 5 ? 'ALTER EGO · x5' : 'LAYER ' + lv + ' · x' + lv + (lv >= M.AEC_LOCK ? ' · KLAR' : '');
      row.querySelectorAll('.ae-pips i').forEach(function (q, j) { q.style.background = j < lv ? AEC_FARG[j + 1] : ''; });
      row.classList.toggle('max', lv >= M.AEC_LOCK);
    }
    var D = aecView.open ? 5 : Math.max.apply(null, aecView.lev);
    aecEl.querySelector('.ae-fin').textContent = aecView.final === 6 ? 'INFINITY' : aecView.final ? 'LAYER ' + aecView.final + ' AV ' + aecView.depth + ' · x' + 2 * aecView.final :
      aecView.open ? 'SPÄRREN SLÄPPT · FINALEN: LAYER 1–5 + INFINITY' : 'SPÄRREN: ' + left + ' KVAR · FINALEN: LAYER 1–' + D;
    var odd = aecEl.querySelector('.aec-odd'), osrc = aecView.open ? AEC_ODD.oppen : AEC_ODD.last;
    if (odd.getAttribute('src') !== osrc) odd.setAttribute('src', osrc);
    aecMini();
  }
  // FRAMÅT-brädet i panelen: nästa frispinns bräde med sina tal; en ruta som har lånats är tom
  function aecMini() {
    if (!aecEl || !aecView) return;
    var box = aecEl.querySelector('.aec-fram'), cv = box.querySelector('canvas'), g = cv.getContext('2d'), N = aecView.next;
    box.querySelector('b').textContent = aecView.final ? 'FINALEN' : N || !aecView.started ? 'FRAMÅT · NÄSTA FRISPINN' : 'SISTA FRISPINNET · INGET FRAMÅT';
    var S = cv.width, cs = S / REELS;
    g.clearRect(0, 0, S, S);
    g.fillStyle = AEC_SKIFFER; g.fillRect(0, 0, S, S);
    if (!N || aecView.final) return;
    for (var r = 0; r < REELS; r++) for (var y = 0; y < ROWS; y++) {
      var s = N.g[r][y], x0 = r * cs, y0 = y * cs;
      if (s >= 0 && sprites[s]) g.drawImage(sprites[s], x0 + cs * 0.06, y0 + cs * 0.06, cs * 0.88, cs * 0.88);
      if (s >= 0 && N.v[r][y]) aecBricka(g, x0, y0, cs, N.v[r][y]);
    }
  }
  function aecInit() {
    aecBuild(); aecPlace(); aecEl.hidden = false; if (aeEl) aeEl.hidden = true;
    aecView = { lev: [1, 1, 1, 1], open: false, next: null }; aecSpin = false; aecPanel();
  }
  function aecEnd() {
    aecView = null; aecSpin = false; ghostView = null; if (aecEl) aecEl.hidden = true;
    reels.forEach(function (rl) { rl.cells.forEach(function (c) { c.aecLev = 0; }); });
  }
