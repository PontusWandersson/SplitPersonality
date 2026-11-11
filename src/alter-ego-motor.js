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
  function aeTumble(strips, grid, stops, gone, fixed) {
    var next = [], nextStops = [], moves = [];
    for (var r = 0; r < REELS; r++) {
      var free = [], keep = [], col = new Array(ROWS), mv = [], y;
      for (y = 0; y < ROWS; y++) {
        if (fixed ? fixed[r][y] : AE.L[r][y]) { col[y] = grid[r][y]; mv.push({ sym: grid[r][y], from: y, to: y, fresh: false }); continue; }
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
  // ================================================================ ALTER EGO-superbonusen: gubbarna och spärren
  // Pontus 2026-11-11 ("ikonerna styr mer, inte hela själva sidan"; "alla måste levela upp till en viss level ... när alla
  // har gjort det, så släpper spärren"; "Ja, bygg spärren"). Hela bonusen är en omgång (Stake).
  // Akt 1, frispinnen: fyra gubbar (AEC_SYM: Killen, Katten, Växten och A) sitter fast i var sin hörnruta (AEC_HOME) hela
  // bonusen. Vinsterna betalar åt båda hållen (från vänster och från höger; en vinst över alla sju hjul räknas en gång),
  // så att gubbarna i de högra hörnen kommer med lika ofta. En gubbe som är med i en vinst levlar ett steg (högst ett per
  // lavinsteg), upp till LAYER 4 (AEC_LOCK). En vinst får det högsta LAYER-numret bland gubbarna den går genom som multi.
  // Spärren: mitten är låst. När alla fyra står på LAYER 4 släpper den: ALTER EGO. Gubbarna går in i mitten (AEC_MID) och
  // blir LAYER 5, och vinster som går genom mittens 3x3 rutor får x5 resten av bonusen.
  // Akt 2, finalen efter sista frispinnet: väggen rivs. Släppte spärren: LAYER 1–5 och sedan INFINITY; annars så många lager
  // som den högsta gubben nådde. Lager d spelas som ett eget bräde med x(2d), med gubbarna fasta på sina rutor och en WILD i
  // brädets mitt när spärren har släppt.
  // (Förut, samma dag: fyra 3x3-hörn som levlade och vandrade in mot mitten; ersatta av gubbarna och spärren.)
  var AEC_SYM = [2, 3, 4, 8];
  var AEC_HOME = [[0, 0], [6, 0], [0, 6], [6, 6]];   // gubbarnas hörnrutor (hjul, rad)
  var AEC_MID = [[2, 2], [4, 2], [2, 4], [4, 4]];    // där de står när spärren har släppt (hörnen av mittens 3x3)
  var AEC_LOCK = 4;
  var AEC = null;   // under superbonusen: { lev: [4] gubbarnas LAYER, open: spärren har släppt }
  function aecPos(i) { var p = AEC.open ? AEC_MID[i] : AEC_HOME[i]; return { r: p[0], y: p[1] }; }
  function aecMid(r, y) { return r >= 2 && r <= 4 && y >= 2 && y <= 4; }
  // gubbarna på brädet (när brädet landar, och efter att spärren har släppt)
  function aecPlaceIcons(grid) {
    var out = [];
    for (var i = 0; i < 4; i++) { var p = aecPos(i); grid[p.r][p.y] = AEC_SYM[i]; out.push({ r: p.r, y: p.y, sym: AEC_SYM[i] }); }
    return out;
  }
  // rutorna som står still i lavinen: gubbarna (eller finalens placerade symboler)
  function aecFixedFrom(list) {
    var F = []; for (var r = 0; r < REELS; r++) F.push(new Array(ROWS).fill(false));
    list.forEach(function (p) { F[p.r][p.y] = true; });
    return F;
  }
  function aecFixed() { var l = []; for (var i = 0; i < 4; i++) { var p = aecPos(i); l.push(p); } return aecFixedFrom(l); }
  function aecGone(removed, F) { return removed.map(function (col, r) { return col.map(function (v, y) { return v && !F[r][y]; }); }); }
  // vinsterna åt båda hållen: från vänster som vanligt, och från höger (brädet speglat; en vinst över alla hjul räknas bara
  // från vänster). En vinst från höger har cols för alla hjul (tomma utanför vinsten) och rtl = true.
  function aecEvaluate(grid, layers) {
    var a = evaluateDeep(grid, layers), mg = grid.slice().reverse(), b = evaluateDeep(mg, layers);
    b.wins.forEach(function (w) {
      if (w.len >= REELS) return;
      var cols = []; for (var r = 0; r < REELS; r++) cols.push([]);
      w.cols.forEach(function (rows, c) { cols[REELS - 1 - c] = rows; });
      w.cols = cols; w.rtl = true; a.wins.push(w); a.x += w.x;
    });
    return a;
  }
  // vinstens multi: det högsta LAYER-numret bland gubbarna den går genom, x5 genom mitten när spärren har släppt
  function aecWins(ev) {
    var total = 0;
    ev.wins.forEach(function (w) {
      var m = 1, touch = [];
      for (var i = 0; i < 4; i++) { var p = aecPos(i); if ((w.cols[p.r] || []).indexOf(p.y) >= 0) { m = Math.max(m, AEC.lev[i]); touch.push(i); } }
      if (AEC.open) w.cols.forEach(function (rows, r) { rows.forEach(function (y) { if (aecMid(r, y)) m = Math.max(m, 5); }); });
      w.x *= m; w.aeMul = m; w.aeTouch = touch; total += w.x;
    });
    ev.x = total;
  }
  // gubbarna som var med i en vinst levlar (upp till AEC_LOCK); släpper spärren svarar opened = true
  function aecLevel(ev) {
    var up = [];
    if (AEC.open) return { up: up, opened: false };
    for (var i = 0; i < 4; i++) {
      if (AEC.lev[i] >= AEC_LOCK) continue;
      var p = aecPos(i), hit = ev.wins.some(function (w) { return (w.cols[p.r] || []).indexOf(p.y) >= 0; });
      if (hit) { AEC.lev[i]++; up.push(i); }
    }
    var all = AEC.lev.every(function (l) { return l >= AEC_LOCK; });
    if (all) { AEC.open = true; AEC.lev = [5, 5, 5, 5]; }
    return { up: up, opened: all };
  }
  // finalen: lager d = ett eget bräde med x(2d) (bonusens vinsttabell; LAYER 1 x2 … LAYER 5 x10), gubbarna fasta på sina
  // rutor och en WILD i mitten när spärren har släppt. (Med x d stod finalen för 31 % av bonusen, med x(2d) 47 %.)
  var AEC_FINMUL = 2;
  function aecFinal(rng, scale, x0, x) {
    var out = [], D = AEC.open ? 5 : Math.max.apply(null, AEC.lev), place = [];
    for (var i = 0; i < 4; i++) { var p = aecPos(i); place.push({ r: p.r, y: p.y, sym: AEC_SYM[i] }); }
    if (AEC.open) place.push({ r: 3, y: 3, sym: W });
    for (var d = 1; d <= D && x0 + x < TIME.maxX; d++) {
      var f = playRound(rng, { fs: true, fsMult: AEC_FINMUL * d, layers: [emptyGrid()], depth: 1, payScale: scale, place: place, aeFinal: d });
      f.retrigger = 0; f.aeFinal = d; f.aeDepth = D; f.aeC0 = AEC.lev.slice(); f.aeOpen0 = AEC.open;
      out.push(f); x += f.x;
    }
    // INFINITY (Pontus 2026-11-11: "gräddet på moset", "Ja, bygg INFINITY"): efter LAYER 5, bara när spärren har släppt.
    // Ett sista bräde där AEC_INF_P av rutorna har ett tal (C&T:s INFINITY-tal och vikter). En vinst gångras med summan av
    // talen i sina rutor (minst x1); ett tal som har använts i en vinst försvinner. Talen sitter på rutorna, inte på
    // symbolerna, och står kvar när lavinen faller.
    if (AEC.open && x0 + x < TIME.maxX) {
      var V = [];
      for (var r = 0; r < REELS; r++) { V.push([]); for (var y = 0; y < ROWS; y++) V[r].push(rng() < AEC_INF_P ? drawW(rng, AEC_INF_DRAW) : 0); }
      var V0 = V.map(function (col) { return col.slice(); });
      var fi = playRound(rng, { fs: true, fsMult: 1, layers: [emptyGrid()], depth: 1, payScale: scale, place: place, aeFinal: 6, aeInf: V });
      fi.retrigger = 0; fi.aeFinal = 6; fi.aeDepth = D; fi.aeC0 = AEC.lev.slice(); fi.aeOpen0 = true; fi.aeInfV0 = V0;
      out.push(fi);
    }
    return out;
  }
  // AEC_INF_P: andelen rutor med tal. C&T:s 0,3 gav INFINITY i snitt cirka 2 000x och 80 % av hela bonusen; 0,1 cirka
  // 160x (9 %), 0,15 cirka 670x (34 %), så 0,12 (simulerat 2026-11-11, 800 köp per värde).
  var AEC_INF_P = 0.12, AEC_INF_DRAW = { v: [2, 3, 5, 10, 25, 50, 100, 500, 1000], w: [30, 25, 20, 13, 7, 3, 1.5, 0.4, 0.1] };
  // INFINITY-vinsterna: varje vinst gångras med summan av talen i sina rutor (aeInfK; minst x1). Talen som användes
  // försvinner efter steget. Svarar rutorna vars tal användes ({ r, y, v }).
  function aecInfWins(ev, V) {
    var used = {}, list = [], total = 0;
    ev.wins.forEach(function (w) {
      var sum = 0, cells = [];
      w.cols.forEach(function (rows, r) { rows.forEach(function (y) { var v = V[r][y]; if (v > 0) { sum += v; cells.push({ r: r, y: y, v: v }); } }); });
      var m = Math.max(1, sum);
      w.x *= m; w.aeInfK = m; total += w.x;
      cells.forEach(function (c) { var key = c.r + ',' + c.y; if (!used[key]) { used[key] = true; list.push(c); } });
    });
    list.forEach(function (c) { V[c.r][c.y] = 0; });
    ev.x = total;
    return list;
  }
