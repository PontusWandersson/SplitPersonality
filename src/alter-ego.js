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
    aeZoneCalc();
  }
  // ett nytt snurr (grundspelet) eller frispinn: de låsta gubbarna står kvar medan hjulen snurrar
  function aeSpinStart(res) {
    aeLockView = { L: res.aeL0, G: res.startGrid }; aeZ = null;
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
  // (inget kort, ingen panel)
  async function aeLevel(st) {
    reels.forEach(function (rl) { rl.cells.forEach(function (c) { c.aeDoor = null; }); });
    st.up.forEach(function (u) {
      var c = reels[u.r] && reels[u.r].cells[u.y];
      if (!c) return;
      c.ae = u.k; c.tagIn = 0;
      parts.push({ kind: 'ring', x: u.r * cell + cell / 2, y: u.y * cell + cell / 2, life: 0, max: 0.35, c: AE_LAYER_FARG[aeNar(u.k)] || AE_PIP });
    });
    aeZoneCalc();
  }
  // grundspelets omgång är slut: inga låsta gubbar eller zoner syns (inget ska se ut att följa med till nästa omgång)
  function aeRoundEnd() {
    if (state.fs) return;
    reels.forEach(function (rl) { rl.cells.forEach(function (c) { c.ae = 0; c.aeDoor = null; }); });
    aeLockView = null; aeZ = null; aePeekG = null;
  }
  // ingen egen panel: allt utanför brädet är C&T:s UI (Pontus 2026-11-11)
  function aeInit() { aeLockView = null; aeZ = null; aePeekG = null; }
  function aeEnd() {
    aeLockView = null; aeZ = null; aePeekG = null;
    // brädet efter bonusen har inga låsta gubbar
    reels.forEach(function (rl) { rl.cells.forEach(function (c) { c.ae = 0; c.aeDoor = null; }); });
  }

  // ---- TEST-menyn, bonusens startkort och reglerna
  function aeNew() {
    return [['aeGo', 'THE OTHER SIDE: gratis superbonus', 'Gubbarna i hörnen levlar (3 vinster = nästa LAYER); vinster lånar ur lagren bakåt och ur nästa frispinn (FRAMÅT).']];
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
      '<p>När alla fyra är på LAYER 4 <b>släpper spärren: THE OTHER SIDE</b>. Efter frispinnen <b>rivs väggen</b> (LAYER 1 = x2 … LAYER 5 = x10), sist <b>INFINITY</b> om spärren släppte</p>';
  }
  function aeRule() {
    return '<li>' + txl('Grundspelet: 7 hjul och 7 rader, vinster från vänster och laviner. Grundspelet har inga lager.') + '</li>' +
      '<li>' + txl('THE OTHER SIDE, frispinnen: fyra gubbar (Killen, Katten, Växten och A) sitter fast i var sitt hörn hela bonusen och börjar på LAYER 1. Vinsterna betalar åt båda hållen, från vänster och från höger. En gubbe som har varit med i {n} vinster går upp ett LAYER, upp till LAYER 4.', { n: M.AEC_HITS }) + '</li>' +
      '<li>' + txl('Väggen: när bonusen startar ligger 5 lager bakom brädet (LAYER 1–5). När ett frispinn är slut läggs brädet överst som nytt LAYER 1 och det äldsta faller bort.') + '</li>' +
      '<li>' + txl('Lån bakåt: saknas symbolen på ett hjul får vinsten låna den ur lagren bakom brädet, i rutan på samma rad som vinsten kom ifrån, LAYER 1 först. En vinst genom en gubbe når lika många lager som gubbens LAYER, annars LAYER 1. En vinst lånar högst en symbol.') + '</li>' +
      '<li>' + txl('Lån framåt (FRAMÅT): nästa frispinns bräde syns redan. Finns symbolen inte i lagren bakåt får vinsten låna den därifrån. Den rutan är tom när nästa frispinn landar och fylls ovanifrån.') + '</li>' +
      '<li>' + txl('Multi: gubbens LAYER (LAYER 3 = x3, x5 genom mitten när spärren har släppt) plus INFINITY-talen i vinstens rutor, lånade rutor inräknade. LAYER 3 och två x5 = x13. Några rutor har ett tal (x2–x100), och ett tal som har använts försvinner. WILD x2, x3 och x5 gångrar vägarna.') + '</li>' +
      '<li>' + txl('Spärren: mitten är låst. När alla fyra gubbarna står på LAYER 4 släpper spärren: THE OTHER SIDE. Gubbarna går in i mitten och blir LAYER 5, och vinster som går genom mittens 3×3 rutor får x5 resten av bonusen.') + '</li>' +
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
  // aecView: { lev: gubbarnas LAYER, open: spärren har släppt, final: lagret som rivs i finalen (6 = INFINITY), depth,
  // inf: talen på rutorna }; aecSpin: hjulen snurrar (gubbarna ritas fast ovanpå)
  var aecView = null, aecSpin = false;
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
  // ovanpå brädet: talen på rutorna (ingen skylt i mitten, Pontus 2026-11-11: bara C&T:s UI)
  function aecDraw(g) {
    if (!aecView) return;
    if (aecView.inf && !aecSpin) aecInfDraw(g);
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
  // ett frispinn börjar: gubbarnas läge, eller finalens lager. Inga kort (Pontus 2026-11-11: "ta bort
  // alla animationer"). Talen syns först när brädet har landat.
  async function aecSpinStart(res) {
    if (!aecView) aecView = { lev: res.aeC0.slice(), open: !!res.aeOpen0 };
    aecView.lev = res.aeC0.slice(); aecView.open = !!res.aeOpen0;
    aecView.inf = null;
    aecSpin = true;
    if (res.aeFinal) { aecView.final = res.aeFinal; aecView.depth = res.aeDepth; return; }
    aecView.final = 0;
  }
  function aecLanded(res) {
    aecSpin = false; aecIconsSet(null);
    var V = res && (res.aecV0 || res.aeInfV0);
    if (aecView) aecView.inf = V ? V.map(function (c) { return c.slice(); }) : null;
  }
  // vinsten: lånen syns med C&T:s rivna hörn (spelets egen tidsvägsvisning); här bara ingenting extra
  function aecWinShow(st) { }
  // efter ett lavinsteg: talen som användes försvinner, gubbarnas LAYER och spärren uppdateras
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
    }
    aecView.lev = st.aeC.slice();
    st.aeCup.forEach(function (i) { var p = aecPosOf(i), c = reels[p.r] && reels[p.r].cells[p.y]; if (c) c.aecLev = st.aeC[i]; });
    if (st.aeOpened) aecView.open = true;
  }
  function aecInit() {
    aecView = { lev: [1, 1, 1, 1], open: false }; aecSpin = false;
  }
  function aecEnd() {
    aecView = null; aecSpin = false; ghostView = null;
    reels.forEach(function (rl) { rl.cells.forEach(function (c) { c.aecLev = 0; }); });
  }
