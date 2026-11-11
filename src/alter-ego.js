  // ================================================================ ALTER EGO (superbonusen)
  // Förs in i C&T-koden av tools/make-ct-bas.js (före runFreeSpins), så allt i C&T:s spelkod går att använda här.
  // Gubben är en dörr ner i lagren (prototyp, Pontus 2026-11-11: "Bygg så jag får se vad du menar"; matten i
  // src/alter-ego-motor.js): Killen, Katten och Växten i en vinst levlar och låses fast, lavinerna bygger LAYER 1–4 bakom
  // brädet, och en vinst som saknar sin symbol på ett hjul kan gå ner genom en låst gubbe och hämta den i lagren.
  // Här: gubbarnas bild och ram per steg (c.ae = steget, 2–5 = låst), låsta gubbar som står still när hjulen snurrar,
  // dörrarna i vinsten, +n till multin, panelen och ALTER EGO-kortet.
  var AE_SYM = [2, 3, 4], AE_NAMN = ['KILLEN', 'KATTEN', 'VÄXTEN'];
  var AE_PIP = '#ff8629', AE_PIP_MAX = '#ffd21f';   // stegen (orange accent) och ALTER EGO (gul)
  // ramen och lagret i lagrets färg: LAYER 1 blå, 2 grön, 3 röd (UI-basen) och 4 gul (ALTER EGO når alla)
  var AE_LAYER_FARG = { 1: '#33c9ff', 2: '#3ccf6e', 3: '#ff3b3b', 4: '#ffd21f' };
  // hur många lager en gubbe på steg k når (samma som aeReach i spelmotorn)
  function aeNar(k) { return k >= 5 ? 4 : Math.max(0, k - 1); }
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
  // aeLockView: de låsta gubbarna medan hjulen snurrar och landar ({ L: steg per ruta, G: brädet }); aeDjup: antal lager
  var aeLockView = null, aeDjup = 0;
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
  // ramen i färgen för det djupaste lagret gubben når, siffran (hur många lager) och dörren när en vinst går genom den
  function aeMark(g, c, x, highlight, k) {
    if (c.pop >= 0) return;
    var y = c.y * cell;
    if (y > boardPx || y < -cell) return;
    aeRam(g, x, y, k, highlight && !c.win && !c.aeDoor ? 0.2 : 1);
    if (c.aeDoor) aeDorr(g, x, y, c.aeDoor);
  }
  function aeRam(g, x, y, k, alpha) {
    var n = aeNar(k), col = AE_LAYER_FARG[n] || AE_PIP;
    g.save(); g.globalAlpha = alpha;
    g.strokeStyle = col; g.lineWidth = Math.max(2, cell * 0.05);
    rr(g, x + cell * 0.05, y + cell * 0.05, cell * 0.9, cell * 0.9, cell * 0.15); g.stroke();
    // siffran: hur många lager gubben når (ALTER EGO: alla)
    var br = cell * 0.13, bx = x + cell * 0.84, by = y + cell * 0.16;
    g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = Math.max(1.5, cell * 0.025);
    g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = INK; g.font = Math.round(br * 1.5) + 'px ' + DISPLAY; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(k >= 5 ? '∞' : String(n), bx, by + br * 0.08);
    g.restore();
  }
  // dörren: symbolen ur lagret syns i ett hörn av gubben, med LAYER-siffran och vad den ger i multi för vinsten
  function aeDorr(g, x, y, d) {
    var col = AE_LAYER_FARG[d.d] || AE_PIP, s = cell * 0.5, sx = x + cell * 0.47, sy = y + cell * 0.47;
    g.save();
    g.fillStyle = PAPER; g.strokeStyle = col; g.lineWidth = Math.max(2, cell * 0.05);
    rr(g, sx, sy, s, s, cell * 0.1); g.fill(); g.stroke();
    var spr = sprites[d.sym];
    if (spr) g.drawImage(spr, sx + s * 0.06, sy + s * 0.02, s * 0.88, s * 0.88);
    var lw = cell * 0.84, lh = cell * 0.18, lx = x + cell * 0.08, ly = y + cell * 0.04;
    g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = Math.max(1.5, cell * 0.025);
    rr(g, lx, ly, lw, lh, lh * 0.4); g.fill(); g.stroke();
    g.fillStyle = INK; g.font = Math.round(lh * 0.78) + 'px ' + DISPLAY; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('LAYER ' + d.d + '  +' + d.d + ' MULTI', lx + lw / 2, ly + lh * 0.56);
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
  // gubbarnas steg från matten (L) läggs på brädets rutor; depth: antal lager
  function aeCells(L, depth) {
    for (var r = 0; r < REELS; r++) for (var y = 0; y < ROWS; y++) {
      var c = reels[r] && reels[r].cells[y];
      if (!c) continue;
      c.ae = (L[r] && L[r][y]) || 0; c.aeDoor = null;
    }
    if (depth != null) aeDjup = depth;
    aePanel();
  }
  // ett nytt frispinn: de låsta gubbarna står kvar medan hjulen snurrar
  function aeSpinStart(res) { aeLockView = { L: res.aeL0, G: res.startGrid }; aeDjup = res.aeD0 || 0; aePanel(); }
  function aeLanded(res) { aeCells(res.aeL0, res.aeD0); aeLockView = null; }
  // vinsten går genom dörrarna: gubben visar symbolen ur lagret medan vinsten visas
  function aeDoors(doors) {
    doors.forEach(function (d) { var c = reels[d.r] && reels[d.r].cells[d.y]; if (c) c.aeDoor = { sym: d.sym, d: d.d }; });
  }
  // gubbarna i vinsten levlar (de sprängs inte): ny bild och ram, en studs och en ring i lagrets färg; når en gubbe
  // ALTER EGO (steg 5) visas kortet
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
    aePanel();
    if (top != null) await aeCard(AE_SYM.indexOf(top), true);
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
      '.ae-lay { display: flex; gap: 6px; align-items: center; justify-content: center; padding-top: 2px; }' +
      '.ae-lay b { font-family: var(--display, "Bangers", Impact, sans-serif); font-weight: 400; font-size: 17px; letter-spacing: .05em; margin-right: 4px; }' +
      '.ae-lay i { width: 26px; height: 14px; border-radius: 4px; background: rgba(255,246,224,.12); border: 1.5px solid #15111f; font-style: normal; font-size: 10px; font-weight: 700; color: #15111f; display: grid; place-items: center; }' +
      '.portrait .ae-panel { position: absolute; left: 0; right: 0; top: calc(100% + 12px); z-index: 5; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 8px; gap: 8px; }' +
      '.portrait .ae-title { display: none; }' +
      '.portrait .ae-lay { grid-column: 1 / -1; } .portrait .ae-lay b { font-size: 13px; } .portrait .ae-lay i { width: 20px; height: 11px; font-size: 8px; }' +
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
    }).join('') + '<div class="ae-lay"><b>LAGER</b><i>1</i><i>2</i><i>3</i><i>4</i></div>';
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
    aeEl.querySelectorAll('.ae-lay i').forEach(function (p, j) { p.style.background = j < aeDjup ? AE_LAYER_FARG[j + 1] : ''; });
  }
  function aeInit() { aeBuild(); aePlace(); aeEl.hidden = false; aeLockView = null; aeDjup = 0; aePanel(); }
  function aeEnd() {
    if (aeEl) aeEl.hidden = true;
    aeLockView = null; aeDjup = 0;
    // brädet efter bonusen har inga låsta gubbar
    reels.forEach(function (rl) { rl.cells.forEach(function (c) { c.ae = 0; c.aeDoor = null; }); });
    document.querySelectorAll('.ae-fx').forEach(function (f) { f.remove(); });
  }

  // ---- TEST-menyn, bonusens startkort och reglerna
  function aeNew() { return [['aeGo', 'ALTER EGO: gratis superbonus', 'Gubbarna levlar och låses, och vinster kan gå ner i lagren genom dem.']]; }
  function aeFacts() {
    return '<p><b>Vinst = levla och låsas.</b> Killen, Katten och Växten sprängs inte: de blir nästa gubbe och står kvar (en per hjul).</p>' +
      '<p>Saknas symbolen på ett hjul går vinsten <b>ner genom en låst gubbe</b> och hämtar den i lagren. <b>LAYER 2 = +2 i MULTI</b> för vinsten</p>';
  }
  function aeRule() {
    return '<li>' + txl('Killen, Katten och Växten i en vinst sprängs inte. De blir nästa gubbe (steg 2–5) och låses fast resten av bonusen, en per hjul (en gubbe till på samma hjul sprängs som vanligt). Nästa snurr landar runt dem, och lavinerna faller förbi dem.') + '</li>' +
      '<li>' + txl('Varje lavin lägger brädet bakom som ett lager: LAYER 1 är det senaste, upp till LAYER 4.') + '</li>' +
      '<li>' + txl('Saknas symbolen på ett hjul (från hjul 3) kan vinsten gå ner genom den låsta gubben på hjulet och hämta symbolen i lagren den når: steg 2 når LAYER 1, steg 3 LAYER 1–2, steg 4 LAYER 1–3 och steg 5 (ALTER EGO) alla. Gubben levlar då också.') + '</li>' +
      '<li>' + txl('En vinst genom LAYER 2 får +2 i multi (x3), genom två dörrar läggs lagren ihop. En vinst räknas bara om den har minst en ny symbol.') + '</li>';
  }

