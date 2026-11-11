  // ================================================================ ALTER EGO i spelmotorn (superbonusen)
  // Förs in i C&T:s spelmotor av tools/make-ct-bas.js (efter INFB-raden), så scanReel, threadCell, payLen och TIME finns.
  // Gubben är en dörr ner i lagren (prototyp, Pontus 2026-11-11: "Bygg så jag får se vad du menar"):
  // - Killen (2), Katten (3) och Växten (4) i en vinst sprängs inte. Rutan blir nästa gubbe (steg 2–5, ett steg per
  //   lavinsteg) och låses fast resten av bonusen; nästa snurr landar runt den. Det som inte är låst faller förbi.
  // - Lagren byggs av lavinerna: brädet i varje lavinsteg med vinst läggs bakom som LAYER 1, och de äldre flyttas ett lager
  //   ner (högst AE_DEPTH). Lagren gäller hela bonusen och backar aldrig till gamla snurr.
  // - Dörren: saknas symbolen på ett hjul (från hjul AE_MINCUR + 1) kan vinsten gå ner genom en låst gubbe på hjulet och
  //   hämta symbolen i lagren gubben når: steg 2 når LAYER 1, steg 3 LAYER 1–2, steg 4 LAYER 1–3 och steg 5 (ALTER EGO)
  //   alla. Det grundaste lagret där symbolen finns används, och rutan i lagret förbrukas. LAYER d ger +d i multi för just
  //   den vinsten (x1 + summan av lagren). Dörrgubben är med i vinsten och levlar.
  // - Ett hjul har plats för AE_PER_REEL låsta gubbar; en gubbe till i en vinst sprängs som vanligt.
  // - En vinst räknas bara om minst en ruta inte var låst (eller kommer ur ett lager); annars skulle samma vinst upprepas.
  // Simulerat 2026-11-11 (köpt ALTER EGO, maniacScale 23,05): låsta resten av bonusen utan gräns per hjul och med multin
  // kvar resten av bonusen gav cirka 2 300 % och hälften av bonusarna i maxvinsten; bara under snurret gav nästan inga
  // dörrar. En låst per hjul: 1 700 % med multin kvar, 680 % med multin per snurr och 590 % med multin per vinst (vald:
  // jämnast, medianen cirka 200x vid 96 %).
  var AE_CH = { 2: 0, 3: 1, 4: 2 }, AE_MAX = 5, AE_DEPTH = 4, AE_MINCUR = 2, AE_PER_REEL = 1, AE = null;
  // AE under superbonusen: L = gubbens steg per ruta (0 = ingen låst gubbe), S = den låsta gubbens symbol, stack = lagren
  // (stack[0] = LAYER 1)
  function aeStart() {
    var L = [], S = [];
    for (var r = 0; r < REELS; r++) { L.push(new Array(ROWS).fill(0)); S.push(new Array(ROWS).fill(-1)); }
    return { L: L, S: S, stack: [] };
  }
  // hur många lager en gubbe på steg k når
  function aeReach(k) { return k >= AE_MAX ? AE_DEPTH : Math.max(0, k - 1); }
  // de låsta gubbarna står kvar när ett nytt snurr landar (AE_HOLD 'bonus'), eller bara under lavinerna i samma snurr
  // ('spin': ett nytt snurr börjar utan låsta gubbar; lagren finns kvar)
  var AE_HOLD = 'bonus';
  function aeOverlay(grid) {
    for (var r = 0; r < REELS; r++) for (var y = 0; y < ROWS; y++) {
      if (AE_HOLD === 'spin') { AE.L[r][y] = 0; AE.S[r][y] = -1; }
      else if (AE.L[r][y]) grid[r][y] = AE.S[r][y];
    }
  }
  // dörren på hjul r: den låsta gubben som når djupast (lika djupt: närmast raden vinsten kom ifrån)
  function aeDoor(r, from) {
    var best = null;
    for (var y = 0; y < ROWS; y++) {
      var reach = aeReach(AE.L[r][y]);
      if (!reach) continue;
      if (!best || reach > best.reach || (reach === best.reach && Math.abs(y - from) < Math.abs(best.y - from))) best = { y: y, reach: reach };
    }
    return best;
  }
  // ways-vinsterna i superbonusen: som evaluate, och ett hjul utan symbolen kan nås genom en dörr (doors: { r, y: dörrens
  // rad, d: lagret, ly: raden i lagret, sym }, aeDeep: summan av lagren)
  function aeEvaluate(grid) {
    var wins = [], total = 0, PT = TIME.payT || PAY;
    for (var s = 2; s < PAYING; s++) {
      var ways = 1, len = 0, cols = [], doors = [], deep = 0, from = 0, fresh = false, boost = 1;
      for (var r = 0; r < REELS; r++) {
        var hit = { rows: [], weight: 0, top: 1 };
        scanReel(grid, r, s, hit);
        if (hit.rows.length) {
          for (var q = 0; q < hit.rows.length; q++) if (!AE.L[r][hit.rows[q]]) fresh = true;
          cols.push(hit.rows);
          from = hit.rows.reduce(function (a, b) { return a + b; }, 0) / hit.rows.length;
        } else {
          var door = r >= AE_MINCUR && AE.stack.length ? aeDoor(r, from) : null, d = 0;
          if (door) for (var k = 0; k < Math.min(door.reach, AE.stack.length) && !d; k++) { threadCell(AE.stack[k], r, s, from, hit); if (hit.rows.length) d = k + 1; }
          if (!d) break;
          cols.push([]); doors.push({ r: r, y: door.y, d: d, ly: hit.rows[0], sym: AE.stack[d - 1][r][hit.rows[0]] });
          deep += d; fresh = true; from = door.y;
        }
        ways *= hit.weight; len++; boost *= hit.top;
      }
      if (len >= 3 && fresh && payLen(PT, s, len) > 0) {
        // dörrarna: LAYER d ger +d i multi för just den här vinsten (x1 + summan av lagren)
        var pay = payLen(PT, s, len) * PAY_SCALE * TIME.scale * ways * (1 + deep);
        wins.push({ sym: s, len: len, ways: ways, x: pay, cols: cols, gcols: null, timeAt: -1, boost: boost, tmult: 1, hops: 0, doors: doors, aeDeep: deep, aeX: 1 + deep });
        total += pay;
      }
    }
    return { wins: wins, x: total };
  }
  // ett lavinsteg med vinst: dörrarna lyser med vinsten (removed), gubbarna i vinsterna levlar och låses i stället för att
  // sprängas, rutorna som hämtades ur lagren förbrukas och brädet läggs bakom som LAYER 1.
  // Svarar { gone: det som sprängs, up: [{ r, y, k }] gubbar som levlade, doors, deep: summan av lagren (multin) }.
  function aeStep(grid, wins, removed) {
    var gone = [], up = [], doors = [], deep = 0, r, y;
    wins.forEach(function (w) {
      (w.doors || []).forEach(function (dd) { removed[dd.r][dd.y] = true; doors.push(dd); });
      deep += w.aeDeep || 0;
    });
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
    doors.forEach(function (dd) { AE.stack[dd.d - 1][dd.r][dd.ly] = -1; });
    AE.stack.unshift(copyGrid(grid));
    if (AE.stack.length > AE_DEPTH) AE.stack.length = AE_DEPTH;
    return { gone: gone, up: up, doors: doors, deep: deep };
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
