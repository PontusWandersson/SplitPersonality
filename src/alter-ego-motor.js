  // ================================================================ ALTER EGO i spelmotorn
  // Förs in i C&T:s spelmotor av tools/make-ct-bas.js (efter INFB-raden), så scanReel, matchAt, payLen, randBoard och TIME
  // finns. Lagermodellen (Pontus 2026-11-11: "Bygg så ser vi om jag gillar det"), byggd för Stake: varje omgång är
  // fristående ("Engine games are strictly stateless"), så allt nedan skapas inne i omgången (C&T:s lösning, egen vägg).
  // - Omgångens egen vägg: när omgången börjar dras AE_DEPTH tysta bräden (randBoard) som blir LAYER 1–5 bakom brädet.
  //   Inget kommer från förra omgången.
  // - Lavinerna fyller på: brädet i varje lavinsteg med vinst läggs in som nytt LAYER 1 (utan rutorna som vann och de
  //   låsta gubbarna), de andra flyttas ner och det understa faller bort.
  // - Gubbarna: Killen (2), Katten (3) och Växten (4) i en vinst sprängs inte. Rutan blir nästa gubbe (steg 2–5, ett steg
  //   per lavinsteg) och låses, en per hjul (AE_PER_REEL; en gubbe till på samma hjul sprängs som vanligt). I grundspelet
  //   står de låsta under lavinerna i samma snurr, i superbonusen hela bonusen (hela bonusen är en omgång).
  // - Lagerzonen: rutorna runt en låst gubbe (ett varv, ALTER EGO två) ser ner i lagren. Där räknas en ruta som sin egen
  //   symbol plus symbolerna i lagren bakom den, så långt gubben når: steg 2 LAYER 1, steg 3 LAYER 1–2, steg 4 LAYER 1–3
  //   och steg 5 (ALTER EGO) alla fem. En symbol ur ett lager som används i en vinst förbrukas.
  // - En vinst räknas bara om den har minst en ny ruta: en ruta som inte var låst, eller en symbol ur ett lager.
  // (Förut, samma dag: dörrar ner i lagren och spridning till grannar; båda ersatta av lagerzonen.)
  var AE_CH = { 2: 0, 3: 1, 4: 2 }, AE_MAX = 5, AE_DEPTH = 5, AE_PER_REEL = 1, AE = null;
  // AE under en omgång: L = gubbens steg per ruta (0 = ingen låst gubbe), S = den låsta gubbens symbol, stack = lagren
  // (stack[0] = LAYER 1), omgångens egen vägg från början
  function aeStart(rng) {
    var L = [], S = [], stack = [];
    for (var r = 0; r < REELS; r++) { L.push(new Array(ROWS).fill(0)); S.push(new Array(ROWS).fill(-1)); }
    for (var k = 0; k < AE_DEPTH; k++) stack.push(randBoard(rng));
    return { L: L, S: S, stack: stack };
  }
  // hur djupt en gubbe på steg k når, och hur många varv zonen har
  function aeReach(k) { return k >= AE_MAX ? AE_DEPTH : Math.max(0, k - 1); }
  function aeRad(k) { return k >= AE_MAX ? 2 : 1; }
  // zonen: hur djupt varje ruta når (det djupaste av gubbarna som täcker den)
  function aeZone() {
    var Z = [], r, y;
    for (r = 0; r < REELS; r++) Z.push(new Array(ROWS).fill(0));
    for (r = 0; r < REELS; r++) for (y = 0; y < ROWS; y++) {
      var k = AE.L[r][y];
      if (k < 2) continue;
      var d = aeReach(k), rad = aeRad(k);
      for (var dr = -rad; dr <= rad; dr++) for (var dy = -rad; dy <= rad; dy++) {
        var rr = r + dr, yy = y + dy;
        if (rr >= 0 && rr < REELS && yy >= 0 && yy < ROWS && d > Z[rr][yy]) Z[rr][yy] = d;
      }
    }
    return Z;
  }
  // de låsta gubbarna står kvar när ett nytt frispinn landar (superbonusen)
  function aeOverlay(grid) {
    for (var r = 0; r < REELS; r++) for (var y = 0; y < ROWS; y++) if (AE.L[r][y]) grid[r][y] = AE.S[r][y];
  }
  // ways-vinsterna med lagerzonen. Som i C&T fyller lagren luckor: saknas symbolen på ett hjul (från hjul AE_MINCUR + 1)
  // hämtar vinsten en symbol ur lagren i zonen på det hjulet, det grundaste lagret först, helst samma symbol och närmast
  // raden vinsten kom ifrån (lcols: [{ r, y, k: lagret, sym }]).
  // (Först räknades varje ruta i zonen med alla lager den nådde: vägarna exploderade, superbonusen gav cirka 1 360 % och
  // grundspelet ensamt cirka 190 % med samma skalor.)
  var AE_MINCUR = 1;
  function aeFetch(Z, r, s, from) {
    var best = null;
    for (var k = 0; k < AE.stack.length && !best; k++) for (var y = 0; y < ROWS; y++) {
      if (Z[r][y] <= k) continue;
      var lg = AE.stack[k][r][y];
      if (lg == null || lg < 0) continue;
      var exact = matchAt(lg, s);
      if (!exact && !isWild(lg)) continue;
      var c = { r: r, y: y, k: k + 1, sym: lg, ex: exact, dist: Math.abs(y - from) };
      if (!best || (c.ex && !best.ex) || (c.ex === best.ex && c.dist < best.dist)) best = c;
    }
    return best;
  }
  function aeEvaluate(grid) {
    var wins = [], total = 0, PT = TIME.payT || PAY, Z = aeZone();
    for (var s = 2; s < PAYING; s++) {
      var ways = 1, len = 0, cols = [], lcols = [], fresh = false, boost = 1, from = 3;
      for (var r = 0; r < REELS; r++) {
        var rows = [], w = 0, top = 1;
        for (var y = 0; y < ROWS; y++) {
          var g = grid[r][y];
          if (matchAt(g, s)) { rows.push(y); w += 1; if (!AE.L[r][y]) fresh = true; }
          else if (isWild(g)) { rows.push(y); w += WILD_MULT[g]; if (WILD_MULT[g] > top) top = WILD_MULT[g]; if (!AE.L[r][y]) fresh = true; }
        }
        if (w) from = rows.reduce(function (a, b) { return a + b; }, 0) / rows.length;
        else if (r >= AE_MINCUR) {
          var f = aeFetch(Z, r, s, from);
          if (!f) break;
          lcols.push({ r: f.r, y: f.y, k: f.k, sym: f.sym });
          w = f.ex ? 1 : WILD_MULT[f.sym]; fresh = true; from = f.y;
        }
        if (!w) break;
        cols.push(rows); ways *= w; len++; boost *= top;
      }
      if (len >= 3 && fresh && payLen(PT, s, len) > 0) {
        var pay = payLen(PT, s, len) * PAY_SCALE * TIME.scale * ways;
        wins.push({ sym: s, len: len, ways: ways, x: pay, cols: cols, lcols: lcols, gcols: null, timeAt: -1, boost: boost, tmult: 1, hops: 0 });
        total += pay;
      }
    }
    return { wins: wins, x: total };
  }
  // ett lavinsteg med vinst: gubbarna i vinsterna levlar och låses i stället för att sprängas, symbolerna ur lagren som
  // användes förbrukas och brädet läggs in som nytt LAYER 1.
  // Svarar { gone: det som sprängs, up: [{ r, y, k }] gubbar som levlade, lused: symbolerna ur lagren i vinsterna }.
  function aeStep(grid, wins, removed) {
    var gone = [], up = [], lused = [], seen = {}, r, y;
    for (r = 0; r < REELS; r++) {
      gone.push(new Array(ROWS).fill(false));
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
    wins.forEach(function (w) {
      (w.lcols || []).forEach(function (c) {
        var key = c.k + ',' + c.r + ',' + c.y;
        if (seen[key]) return;
        seen[key] = true; lused.push(c);
      });
    });
    lused.forEach(function (c) { AE.stack[c.k - 1][c.r][c.y] = -1; });
    // brädet blir nytt LAYER 1, utan rutorna som vann och utan de låsta gubbarna (de står kvar på brädet). Annars blir
    // gubbens eko i lagret en ny symbol varje lavinsteg och samma vinst kommer om och om igen.
    var layer = copyGrid(grid);
    for (r = 0; r < REELS; r++) for (y = 0; y < ROWS; y++) if (removed[r][y] || AE.L[r][y]) layer[r][y] = -1;
    AE.stack.unshift(layer);
    if (AE.stack.length > AE_DEPTH) AE.stack.length = AE_DEPTH;
    return { gone: gone, up: up, lused: lused };
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
  // grundspelets snurr: omgångens egen vägg och gubbarna (bara under lavinerna i det här snurret); extra: t.ex. { strips }
  // för HUNT-lägena. Inget från förra omgången används.
  function aeBaseRound(rng, extra) {
    AE = TIME.alterEgo ? aeStart(rng) : null;
    var o = { ae: true }; for (var key in extra) o[key] = extra[key];
    try { return playRound(rng, baseOpts(o)); } finally { AE = null; }
  }
  // TEST-menyn (ALTER EGO-läget): ett frispinn i superbonusen utanför bonusen, med gubbarna och lagren kvar mellan snurren
  // (AE_TEST) tills läget nollställs (reset). Bara ett testverktyg: det för med något mellan snurr och får inte finnas i en
  // version till Stake.
  var AE_TEST = null;
  function aeTestSpin(rng, reset) {
    if (reset) { AE_TEST = null; return null; }
    if (!AE_TEST) AE_TEST = aeStart(rng);
    var keep = AE; AE = AE_TEST;
    try { return playRound(rng, { fs: true, fsMult: 1, layers: [emptyGrid()], depth: 1, payScale: TIME.maniacScale }); }
    finally { AE = keep; }
  }
  // ================================================================ ALTER EGO-superbonusen: fyra hörn och väggen
  // Pontus 2026-11-11 ("Bygg denna matten så får vi kolla på det och se hur det känns"). Hela bonusen är en omgång (Stake).
  // Akt 1, frispinnen: fyra hörn på 3x3 rutor med var sin gubbe (AEC_SYM: Killen, Katten, Växten och A). Alla börjar på
  // LAYER 1. När hörnets gubbe vinner levlar hörnet ett steg, två om vinsten har en av gubbens rutor inne i hörnet, och
  // hörnet flyttar in mot mitten (AEC_PATH). LAYER 5 är mitten: ALTER EGO. Varje vinst får det högsta LAYER-numret bland
  // hörnen den går genom som multi.
  // Akt 2, finalen efter sista frispinnet: väggen rivs. Lika många lager som det bästa hörnet nådde; lager d spelas som ett
  // eget bräde (frispinnens hjul) med x(2d). Varje hörns gubbe står i mitten av sitt hörn på varje lager, och nådde ett hörn
  // mitten (ALTER EGO) står en WILD i brädets mitt.
  var AEC_SYM = [2, 3, 4, 8];
  // hörnets övre vänstra ruta (hjul, rad) för LAYER 1–5
  var AEC_PATH = [
    [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]],
    [[4, 0], [3, 0], [3, 1], [2, 1], [2, 2]],
    [[0, 4], [1, 4], [1, 3], [2, 3], [2, 2]],
    [[4, 4], [3, 4], [3, 3], [2, 3], [2, 2]]
  ];
  var AEC = null;   // under superbonusen: { lev: [4] } hörnens LAYER
  function aecPos(i) { var p = AEC_PATH[i][Math.min(5, AEC.lev[i]) - 1]; return { c: p[0], r: p[1] }; }
  function aecIn(i, r, y) { var p = aecPos(i); return r >= p.c && r < p.c + 3 && y >= p.r && y < p.r + 3; }
  // vinsternas multi: det högsta LAYER-numret bland hörnen vinsten går genom (aeMul, aeTouch). (Först summan: mer multi i
  // akt 1 och för lite kvar till finalen, som då bara stod för 5–10 % av bonusen.)
  function aecWins(ev) {
    var total = 0;
    ev.wins.forEach(function (w) {
      var m = 1, touch = [];
      for (var i = 0; i < 4; i++) {
        var hit = false;
        w.cols.forEach(function (rows, r) { rows.forEach(function (y) { if (aecIn(i, r, y)) hit = true; }); });
        if (hit) { m = Math.max(m, AEC.lev[i]); touch.push(i); }
      }
      w.x *= m; w.aeMul = m; w.aeTouch = touch; total += w.x;
    });
    ev.x = total;
  }
  // hörnen som levlar efter ett lavinsteg: +1 när hörnets gubbe vinner var som helst, och +1 till när vinsten har en av
  // gubbens rutor inne i hörnet (högst +2 per lavinsteg, högst LAYER 5). Svarar hörnen som levlade.
  // (Först bara en ruta inne i hörnet: de högra hörnen nås bara av vinster över minst fem hjul, hörnen levlade 1,5 gånger
  // per bonus och ALTER EGO nåddes i 0,5 %. Bara var som helst: 3 %. Med båda: 27 %.)
  function aecLevel(ev, grid) {
    var up = [];
    for (var i = 0; i < 4; i++) {
      if (AEC.lev[i] >= 5) continue;
      var s = AEC_SYM[i], hit = false, hitIn = false;
      ev.wins.forEach(function (w) {
        if (w.sym !== s) return;
        w.cols.forEach(function (rows, r) { rows.forEach(function (y) { if (grid[r][y] === s) { hit = true; if (aecIn(i, r, y)) hitIn = true; } }); });
      });
      if (hit) { AEC.lev[i] = Math.min(5, AEC.lev[i] + (hitIn ? 2 : 1)); up.push(i); }
    }
    return up;
  }
  // finalen: lager d = ett eget bräde med x(2d) (bonusens vinsttabell; LAYER 1 x2 … LAYER 5 x10), hörnens gubbar
  // placerade, WILD i mitten vid ALTER EGO. (Med x d stod finalen för 31 % av bonusen, med x(2d) 47 %.)
  var AEC_FINMUL = 2;
  function aecFinal(rng, scale, x0, x) {
    var out = [], D = Math.max.apply(null, AEC.lev), place = [];
    for (var i = 0; i < 4; i++) { var p = aecPos(i); place.push({ r: p.c + 1, y: p.r + 1, sym: AEC_SYM[i] }); }
    if (D >= 5) place.push({ r: 3, y: 3, sym: W });
    for (var d = 1; d <= D && x0 + x < TIME.maxX; d++) {
      var f = playRound(rng, { fs: true, fsMult: AEC_FINMUL * d, layers: [emptyGrid()], depth: 1, payScale: scale, place: place, aeFinal: d });
      f.retrigger = 0; f.aeFinal = d; f.aeDepth = D; f.aeC0 = AEC.lev.slice();
      out.push(f); x += f.x;
    }
    return out;
  }
