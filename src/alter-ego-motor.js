  // ================================================================ ALTER EGO i spelmotorn (superbonusen)
  // Förs in i C&T:s spelmotor av tools/make-ct-bas.js (efter INFB-raden), så scanReel, payLen och TIME finns.
  // Gubbarna levlar, låses och sprider sig (prototyp, Pontus 2026-11-11: "Ersätt dörrarna" med spridningen: "om man får
  // ett layer ... sprider ut sina eventuella symboler som kan levlas upp, så man får kluster av samma"):
  // - Killen (2), Katten (3) och Växten (4) i en vinst sprängs inte. Rutan blir nästa gubbe (steg 2–5, ett steg per
  //   lavinsteg) och låses fast resten av bonusen; nästa snurr landar runt den. Det som inte är låst faller förbi.
  // - Ett hjul har plats för AE_PER_REEL låsta gubbar; en gubbe till i en vinst sprängs som vanligt.
  // - Spridningen: varje gång en gubbe levlar (får ett lager) sprider den sig efter lavinen till grannrutorna (de åtta runt
  //   om): steg 2–4 till 1 granne och steg 5 (ALTER EGO) till 2 (AE_SPRID). Grannen blir samma gubbe på steg 1 (inte låst).
  //   Låsta gubbar, BONUS och WILD tas aldrig över, och en ruta tas bara över en gång per lavinsteg. Vilka grannar slumpas.
  // - En vinst räknas bara om minst en ruta inte var låst; annars skulle samma vinst upprepas.
  // (Förut, samma dag: dörrar ner i lagren bakom brädet, där LAYER d gav +d i multi för vinsten. Ersatta av spridningen.)
  var AE_CH = { 2: 0, 3: 1, 4: 2 }, AE_MAX = 5, AE_PER_REEL = 1, AE = null;
  // AE under superbonusen: L = gubbens steg per ruta (0 = ingen låst gubbe), S = den låsta gubbens symbol
  function aeStart() {
    var L = [], S = [];
    for (var r = 0; r < REELS; r++) { L.push(new Array(ROWS).fill(0)); S.push(new Array(ROWS).fill(-1)); }
    return { L: L, S: S };
  }
  // hur många grannar en gubbe sprider sig till när den når steg k (AE_SPRID[k]): steg 2–4 en granne, ALTER EGO två.
  // Simulerat 2026-11-11 (köpt ALTER EGO, maniacScale 3,58, 400–1 000 köp per variant): 1/2/3/alla gav 1 330 % och 14 % i
  // maxvinsten (vid 96 % skulle de sämsta 10 % ge under 1x); 1/1/2/3 590 %; 1/1/1/3 370 %; 1/1/2/2 300 %; 1/1/1/2 230 %
  // (vald: jämnast, medianen cirka 300x och de sämsta 10 % cirka 8x vid 96 %); 1/1/1/1 170 %.
  var AE_SPRID = [0, 0, 1, 1, 1, 2];
  function aeSprid(k) { return AE_SPRID[Math.min(AE_MAX, k)] || 0; }
  // de låsta gubbarna står kvar när ett nytt snurr landar
  function aeOverlay(grid) {
    for (var r = 0; r < REELS; r++) for (var y = 0; y < ROWS; y++) if (AE.L[r][y]) grid[r][y] = AE.S[r][y];
  }
  // ways-vinsterna i superbonusen: som evaluate, men en vinst räknas bara om minst en ruta inte var låst
  function aeEvaluate(grid) {
    var wins = [], total = 0, PT = TIME.payT || PAY;
    for (var s = 2; s < PAYING; s++) {
      var ways = 1, len = 0, cols = [], fresh = false, boost = 1;
      for (var r = 0; r < REELS; r++) {
        var hit = { rows: [], weight: 0, top: 1 };
        scanReel(grid, r, s, hit);
        if (!hit.rows.length) break;
        for (var q = 0; q < hit.rows.length; q++) if (!AE.L[r][hit.rows[q]]) fresh = true;
        cols.push(hit.rows);
        ways *= hit.weight; len++; boost *= hit.top;
      }
      if (len >= 3 && fresh && payLen(PT, s, len) > 0) {
        var pay = payLen(PT, s, len) * PAY_SCALE * TIME.scale * ways;
        wins.push({ sym: s, len: len, ways: ways, x: pay, cols: cols, gcols: null, timeAt: -1, boost: boost, tmult: 1, hops: 0 });
        total += pay;
      }
    }
    return { wins: wins, x: total };
  }
  // ett lavinsteg med vinst: gubbarna i vinsterna levlar och låses i stället för att sprängas.
  // Svarar { gone: det som sprängs, up: [{ r, y, k }] gubbar som levlade }.
  function aeStep(grid, wins, removed) {
    var gone = [], up = [], r, y;
    for (r = 0; r < REELS; r++) {
      gone.push(new Array(ROWS).fill(false));
      // AE_PER_REEL: så många låsta gubbar får plats på ett hjul; en gubbe till i en vinst sprängs som vanligt
      var held = 0;
      for (y = 0; y < ROWS; y++) if (AE.L[r][y]) held++;
      for (y = 0; y < ROWS; y++) {
        if (!removed[r][y]) continue;
        if (AE_CH[grid[r][y]] == null || (!AE.L[r][y] && held >= AE_PER_REEL)) { gone[r][y] = true; continue; }
        if (!AE.L[r][y]) held++;
        var k = Math.min(AE_MAX, Math.max(1, AE.L[r][y]) + 1);
        if (k !== AE.L[r][y]) { AE.L[r][y] = k; up.push({ r: r, y: y, k: k }); }
        AE.S[r][y] = grid[r][y];
      }
    }
    return { gone: gone, up: up };
  }
  // spridningen efter lavinen (grid = brädet efter lavinen, ändras här): varje gubbe som levlade tar över grannrutor.
  // Svarar [{ r, y, sym, fr, fy }] (fr, fy: gubben som spred sig).
  function aeSpread(rng, grid, up) {
    var out = [], taken = {};
    up.forEach(function (u) {
      var sym = AE.S[u.r][u.y], n = aeSprid(u.k), cand = [];
      for (var dr = -1; dr <= 1; dr++) for (var dy = -1; dy <= 1; dy++) {
        var r = u.r + dr, y = u.y + dy;
        if ((!dr && !dy) || r < 0 || r >= REELS || y < 0 || y >= ROWS) continue;
        var g = grid[r][y];
        // en ruta tas bara över en gång per lavinsteg
        if (AE.L[r][y] || taken[r + ',' + y] || g === sym || g === S || isWild(g)) continue;
        cand.push({ r: r, y: y });
      }
      for (var i = cand.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = cand[i]; cand[i] = cand[j]; cand[j] = t; }
      cand.slice(0, n).forEach(function (c) { grid[c.r][c.y] = sym; taken[c.r + ',' + c.y] = true; out.push({ r: c.r, y: c.y, sym: sym, fr: u.r, fy: u.y }); });
    });
    return out;
  }
  // lavinen med låsta gubbar: de låsta står still och det som är kvar faller förbi dem (hjulet utan de låsta rutorna är som
  // ett kortare hjul); nya symboler fyller de översta lediga rutorna. Samma form på svaret som tumble().
  function aeTumble(strips, grid, stops, gone) {
    var next = [], nextStops = [], moves = [];
    for (var r = 0; r < REELS; r++) {
      var free = [], keep = [], col = new Array(ROWS), mv = [], y;
      for (y = 0; y < ROWS; y++) {
        if (AE.L[r][y]) { col[y] = grid[r][y]; mv.push({ sym: grid[r][y], from: y, to: y, fresh: false }); continue; }
        free.push(y);
        if (!gone[r][y]) keep.push({ sym: grid[r][y], from: y });
      }
      var k = free.length - keep.length, L = strips[r].length;
      for (var j = 0; j < k; j++) {
        var sym = strips[r][mod(stops[r] - k + j, L)];
        col[free[j]] = sym; mv.push({ sym: sym, from: j - k, to: free[j], fresh: true });
      }
      for (var i = 0; i < keep.length; i++) { col[free[k + i]] = keep[i].sym; mv.push({ sym: keep[i].sym, from: keep[i].from, to: free[k + i], fresh: false }); }
      next.push(col); nextStops.push(mod(stops[r] - k, L)); moves.push(mv);
    }
    return { grid: next, stops: nextStops, moves: moves };
  }
  // TEST-menyn (ALTER EGO-läget): ett frispinn i superbonusen utanför bonusen, med de låsta gubbarna kvar mellan snurren
  // (AE_TEST) tills läget nollställs (reset). Samma matte som i bonusen: playRound med frispinnens hjul och superbonusens
  // vinsttabell.
  var AE_TEST = null;
  function aeTestSpin(rng, reset) {
    if (reset || !AE_TEST) AE_TEST = aeStart();
    if (reset) return null;
    var keep = AE; AE = AE_TEST;
    try { return playRound(rng, { fs: true, fsMult: 1, layers: [emptyGrid()], depth: 1, payScale: TIME.maniacScale }); }
    finally { AE = keep; }
  }
