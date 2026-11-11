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
  // grundspelets snurr (också HUNT-lägena; extra: t.ex. { strips }). Mattespecen (Pontus 2026-11-11, "Ja, bygg", beslut 3):
  // grundspelet har inga lager, så lagren blir superbonusens. Ett vanligt 7x7-snurr med laviner; inget från förra
  // omgången används. (Lagerzonen ovan används bara av TEST-läget.)
  // Tomt spöklager (ghost), så att vinsterna räknas som förut (evaluateTime, med TIME.scale; C&T:s lager är avstängda med
  // minCur 99). Utan ghost räknas de med evaluate(), som inte har TIME.scale: grundspelet gav då cirka 157 %.
  function aeBaseRound(rng, extra) {
    AE = null;
    var o = { ghost: emptyGrid() }; for (var key in extra) o[key] = extra[key];
    return playRound(rng, baseOpts(o));
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
  // ================================================================ ALTER EGO-superbonusen: gubbarna, spärren och lagren
  // Mattespecen (Claude Docs "ALTER EGO – mattespecifikation", Pontus 2026-11-11: "Ja, bygg"). Hela bonusen är en omgång
  // (Stake): väggen, alla frispinnens bräden och talen dras inne i omgången, och inget följer med till nästa insats.
  // - Fyra gubbar (AEC_SYM: Killen, Katten, Växten och A) sitter fast i var sin hörnruta (AEC_HOME). Vinsterna betalar åt
  //   båda hållen (en vinst över alla sju hjul räknas en gång). En gubbe som har varit med i AEC_HITS (3) vinster går upp
  //   ett LAYER (högst en vinst räknas per lavinsteg), upp till LAYER 4 (AEC_LOCK). När alla fyra står på LAYER 4 släpper
  //   spärren: gubbarna går in i mitten (AEC_MID) och blir LAYER 5, och vinster genom mittens 3x3 får x5.
  // - Väggen bakåt: när bonusen startar dras 5 bräden (LAYER 1–5). När ett frispinn är slut läggs slutbrädet överst som
  //   nytt LAYER 1 och det äldsta faller bort.
  // - Lån bakåt: saknas symbolen på ett hjul (från vinstens andra hjul) får vinsten hämta den ur lagren bakom rutan på
  //   samma rad som vinsten kom ifrån, LAYER 1 först och sedan djupare. Vinsten når lika många lager som nivån på gubben
  //   den går genom (gubbens symbol); går den inte genom någon gubbe når den LAYER 1.
  // - Lån framåt: nästa frispinns bräde dras redan när frispinnet börjar (AEC.next, FRAMÅT). Räcker inte lagren bakåt får
  //   vinsten hämta symbolen ur FRAMÅT. Den rutan är tom när nästa frispinn landar och fylls ovanifrån.
  // - Högst en lånad symbol per vinst (AEC_LAN_MAX), och en vinst måste ha minst en ny ruta på brädet (inte bara gubbar).
  // - INFINITY-tal: AEC_NUM_P av rutorna med betalande symbol i varje bräde (väggen, frispinnen, FRAMÅT) har ett tal
  //   (x2–x100). Talen sitter på rutorna. Vinstens multi är gubbens nivå (eller x5 i mitten) plus summan av talen i
  //   vinstens rutor, lånade rutor inräknade (AEC_ADD). Ett använt tal försvinner.
  // - Finalen efter sista frispinnet: väggen rivs. LAYER 1–D spelas som nya bräden med x(2d); D = 5 om spärren släppt,
  //   annars den högsta gubbens nivå. Släppte spärren kommer sist INFINITY-brädet (tal på AEC_INF_P av rutorna, x2–x1000).
  // Simulerat 2026-11-11 (scratchpad sim-lan.js, variants.js, köpt ALTER EGO): mattespecens startvärden gav cirka 4 900 %
  // och maxvinst i 9 av 10 bonusar, så lånen, nivåerna, multin och wildsen är strypta (se respektive ratt). Nu: spärren
  // cirka 14 %, lånen i cirka 43 % av vinsten, talen i cirka 40 %, medianen cirka 270x på köpet för 500x, de sämsta 10 %
  // cirka 80x, maxvinst cirka 1 på 4 000 köp (mattespecens förslag var 1 på 50 000).
  // (Förut, samma dag: fyra 3x3-hörn; gubbarna och spärren utan lån.)
  var AEC_SYM = [2, 3, 4, 8];
  var AEC_HOME = [[0, 0], [6, 0], [0, 6], [6, 6]];   // gubbarnas hörnrutor (hjul, rad)
  var AEC_MID = [[2, 2], [4, 2], [2, 4], [4, 4]];    // där de står när spärren har släppt (hörnen av mittens 3x3)
  var AEC_LOCK = 4, AEC_BACK = 5;
  // AEC under superbonusen: { lev: gubbarnas LAYER, open: spärren har släppt, wall: [{ g, v }] lagren bakåt (wall[0] =
  // LAYER 1), next: { g, v, stops } nästa frispinns bräde (FRAMÅT) eller null }
  var AEC = null;
  // AEC_NUM_P: andelen rutor (med betalande symbol) som har ett INFINITY-tal i frispinnen och väggen (mattespecen: 2 %)
  var AEC_NUM_P = 0.02;
  var AEC_INF_P = 0.12, AEC_INF_DRAW = { v: [2, 3, 5, 10, 25, 50, 100, 500, 1000], w: [30, 25, 20, 13, 7, 3, 1.5, 0.4, 0.1] };
  // frispinnens och väggens tal: samma vikter utan x500 och x1000 (de finns bara i INFINITY-brädet). Med alla tal i
  // frispinnen kom maxvinsten cirka 1 på 1 300 köp (ett x500- eller x1000-tal på en vinst med hundratals vägar).
  var AEC_NUM_DRAW = { v: [2, 3, 5, 10, 25, 50, 100], w: [30, 25, 20, 13, 7, 3, 1.5] };

  // ---- superbonusens hjul (mattespecen, Wilds): bonushjulen med fler WILD och WILD x2/x3/x5, alltid ensamma.
  // Block per hjul (hjul 1–7): WILD 5 på hjul 2–7 (som bonushjulen), x2 1 på hjul 2–7, x3 1 på hjul 3–5, x5 1 på hjul 4.
  // (Mattespecens start, WILD 7, x2 2, x3 1 och x5 1 på de flesta hjul, gav cirka 1 000 % och spärren i 80 % av bonusarna.)
  var AEC_WILDS = {}; AEC_WILDS[W] = [0, 5, 5, 5, 5, 5, 5]; AEC_WILDS[WX2] = [0, 1, 1, 1, 1, 1, 1];
  AEC_WILDS[WX3] = [0, 0, 1, 1, 1, 0, 0]; AEC_WILDS[WX5] = [0, 0, 0, 1, 0, 0, 0];
  function aecBlocksOk(blocks) {
    var n = blocks.length;
    for (var i = 0; i < n; i++) {
      var a = blocks[i].sym, b = blocks[(i + 1) % n].sym, c = blocks[(i + 2) % n].sym;
      if (a === b) return false;
      if (a === S && (b <= S || c <= S || isWild(b) || isWild(c))) return false;
      if (isWild(a) && (b === S || c === S || isWild(b))) return false;
    }
    return true;
  }
  function aecStrips() {
    var rnd = mulberry32(0xA17E60), strips = [];
    for (var r = 0; r < REELS; r++) {
      var blocks = [];
      for (var s = 0; s < PAYING; s++) {
        var n = s === W ? AEC_WILDS[W][r] : FS_BLOCKS[s][Math.min(r, FS_BLOCKS[s].length - 1)];
        for (var q = 0; q < n; q++) blocks.push({ sym: s, h: s <= S ? 1 : stackHeight(rnd) });
      }
      [WX2, WX3, WX5].forEach(function (s2) { for (var q2 = 0; q2 < AEC_WILDS[s2][r]; q2++) blocks.push({ sym: s2, h: 1 }); });
      for (var attempt = 0; attempt < 5000; attempt++) {
        for (var i = blocks.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), tmp = blocks[i]; blocks[i] = blocks[j]; blocks[j] = tmp; }
        if (aecBlocksOk(blocks)) break;
      }
      var list = [];
      for (var b = 0; b < blocks.length; b++) for (var h = 0; h < blocks[b].h; h++) list.push(blocks[b].sym);
      strips.push(list);
    }
    return strips;
  }
  STRIPS.aec = aecStrips();

  // ---- bräden och tal
  // talen till ett bräde: AEC_NUM_P av rutorna med betalande symbol (C&T:s INFINITY-tal och vikter)
  function aecNums(rng, g) {
    return g.map(function (col) { return col.map(function (s) { return s >= 2 && s < PAYING && rng() < AEC_NUM_P ? drawW(rng, AEC_NUM_DRAW) : 0; }); });
  }
  // ett bräde från superbonusens hjul, med sina tal
  function aecBoard(rng) {
    var g = [], stops = [];
    for (var r = 0; r < REELS; r++) { var st = Math.floor(rng() * STRIPS.aec[r].length); stops.push(st); g.push(windowAt(STRIPS.aec, r, st)); }
    return { g: g, v: aecNums(rng, g), stops: stops };
  }
  // bonusstart: gubbarna på LAYER 1 och väggen med 5 bräden
  function aecStart(rng) {
    var wall = [];
    for (var k = 0; k < AEC_BACK; k++) { var b = aecBoard(rng); wall.push({ g: b.g, v: b.v }); }
    return { lev: [1, 1, 1, 1], open: false, wall: wall, next: null };
  }
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
  function aecAny(M) { return M.some(function (col) { return col.some(Boolean); }); }

  // ---- brädet landar. Frispinn: från FRAMÅT-brädet som drogs i förra frispinnet (samma stopp; rutorna som lånades är
  // tomma och fylls ovanifrån), annars det dragna brädet med nya tal. Finalen: lagrets bräde (src), tomma rutor fylls från
  // stoppen som drogs. Svarar { grid, stops, v: talen, start: brädet som landar (med tomma rutor, -1), land: { moves } när
  // tomma rutor fylls }.
  function aecLanding(rng, strips, grid, stops, src, F, place) {
    var V, start = grid, land = null;
    if (src) {
      grid = copyGrid(src.g);
      if (place) place.forEach(function (p) { grid[p.r][p.y] = p.sym; }); else aecPlaceIcons(grid);
      V = src.v.map(function (col) { return col.slice(); });
      var holes = grid.map(function (col, r) { return col.map(function (s, y) { return s < 0 && !F[r][y]; }); });
      start = grid;
      if (aecAny(holes)) {
        var t = aeTumble(strips, grid, stops, holes, F);
        land = { moves: t.moves }; grid = t.grid; stops = t.stops;
      }
    } else V = aecNums(rng, grid);
    for (var r = 0; r < REELS; r++) for (var y = 0; y < ROWS; y++) if (F[r][y]) V[r][y] = 0;
    return { grid: grid, stops: stops, v: V, start: start, land: land };
  }

  // ---- vinsterna med lånen
  // en ruta att låna på hjul r ur bräde B (lagret k, 0 = FRAMÅT): helst samma symbol, annars en wild, närmast raden
  // vinsten kom ifrån; gubbarnas rutor lånas inte
  // AEC_LAN_MAX: högst så många lånade symboler per vinst; AEC_LAN_ROW: bara rutan på samma rad som vinsten kom ifrån (en
  // rad där förra hjulets symbol låg). Utan dem (alla rader, ett lån per hjul) blev nästan varje symbol på första hjulet en
  // lång vinst: köpt ALTER EGO cirka 4 900 % vid maniacScale 2,9 och maxvinst i 9 av 10 bonusar (300 köp, 2026-11-11).
  var AEC_LAN_MAX = 1, AEC_LAN_ROW = true;
  function aecPick(B, r, s, from, k, F, prev) {
    var best = null;
    for (var y = 0; y < ROWS; y++) {
      if (F[r][y] || (AEC_LAN_ROW && prev.indexOf(y) < 0)) continue;
      var lg = B.g[r][y];
      if (lg == null || lg < 0) continue;
      var ex = matchAt(lg, s);
      if (!ex && !isWild(lg)) continue;
      var c = { r: r, y: y, k: k, sym: lg, ex: ex, v: B.v[r][y] || 0, dist: Math.abs(y - from) };
      if (!best || (c.ex && !best.ex) || (c.ex === best.ex && c.dist < best.dist)) best = c;
    }
    return best;
  }
  // bakåt (LAYER 1 till depth) och sedan FRAMÅT
  function aecFetch(r, s, from, depth, F, prev) {
    var best = null;
    for (var k = 0; k < Math.min(depth, AEC.wall.length) && !best; k++) best = aecPick(AEC.wall[k], r, s, from, k + 1, F, prev);
    if (!best && AEC.next) best = aecPick(AEC.next, r, s, from, 0, F, prev);
    return best;
  }
  // en vinst åt ett håll (order: hjulens ordning). cols har alla hjul (tomma utanför vinsten), lcols de lånade rutorna.
  function aecWay(grid, s, order, depth, F) {
    var ways = 1, len = 0, cols = [], lcols = [], fresh = false, boost = 1, from = 3, prev = [];
    for (var r0 = 0; r0 < REELS; r0++) cols.push([]);
    for (var i = 0; i < order.length; i++) {
      var r = order[i], rows = [], w = 0, top = 1;
      for (var y = 0; y < ROWS; y++) {
        var g = grid[r][y];
        if (matchAt(g, s)) { rows.push(y); w += 1; if (!F[r][y]) fresh = true; }
        else if (isWild(g)) { rows.push(y); w += WILD_MULT[g]; if (WILD_MULT[g] > top) top = WILD_MULT[g]; if (!F[r][y]) fresh = true; }
      }
      if (w) { from = rows.reduce(function (a, b) { return a + b; }, 0) / rows.length; prev = rows; }
      else if (i >= 1 && lcols.length < AEC_LAN_MAX) {
        var f = aecFetch(r, s, from, depth, F, prev);
        if (!f) break;
        lcols.push(f); w = f.ex ? 1 : WILD_MULT[f.sym]; if (w > top) top = w; from = f.y; prev = [f.y];
      }
      if (!w) break;
      cols[r] = rows; ways *= w; len++; boost *= top;
    }
    return { len: len, ways: ways, cols: cols, lcols: lcols, fresh: fresh, boost: boost };
  }
  var AEC_LTR = [0, 1, 2, 3, 4, 5, 6], AEC_RTL = [6, 5, 4, 3, 2, 1, 0];
  // frispinnets vinster: båda hållen, lån bakåt efter gubbens nivå och framåt, INFINITY-talen (V) i rutorna
  function aecEval(grid, V) {
    var wins = [], total = 0, PT = TIME.payT || PAY, F = aecFixed();
    for (var s = 2; s < PAYING; s++) {
      var gi = AEC_SYM.indexOf(s), gp = gi >= 0 ? aecPos(gi) : null, D = gi >= 0 ? AEC.lev[gi] : 1, ltrFull = false;
      for (var dir = 0; dir < 2; dir++) {
        if (dir === 1 && ltrFull) break;   // en vinst över alla sju hjul räknas bara från vänster
        var order = dir ? AEC_RTL : AEC_LTR, a = aecWay(grid, s, order, D, F);
        // går vinsten inte genom gubben når den bara LAYER 1
        if (D > 1 && !(gp && a.cols[gp.r].indexOf(gp.y) >= 0)) a = aecWay(grid, s, order, 1, F);
        if (dir === 0 && a.len >= REELS) ltrFull = true;
        if (dir === 1 && a.len >= REELS) continue;
        if (a.len < 3 || !a.fresh || !(payLen(PT, s, a.len) > 0)) continue;
        var pay = payLen(PT, s, a.len) * PAY_SCALE * TIME.scale * a.ways, sum = 0, cells = [];
        a.cols.forEach(function (rows, r) { rows.forEach(function (y) { if (V[r][y] > 0) { sum += V[r][y]; cells.push({ r: r, y: y, v: V[r][y], k: -1 }); } }); });
        a.lcols.forEach(function (c) { if (c.v > 0) { sum += c.v; cells.push({ r: c.r, y: c.y, v: c.v, k: c.k }); } });
        wins.push({ sym: s, len: a.len, ways: a.ways, x: pay, cols: a.cols, lcols: a.lcols, rtl: dir === 1, aeInfSum: sum, aeInfCells: cells,
          gcols: null, timeAt: -1, boost: a.boost, tmult: 1, hops: 0 });
        total += pay;
      }
    }
    return { wins: wins, x: total };
  }
  // vinstens multi: gubbens nivå (det högsta LAYER bland gubbarna den går genom, x5 genom mitten när spärren har släppt)
  // gånger summan av INFINITY-talen (minst x1)
  // AEC_ADD: gubbens nivå och talen läggs ihop (LAYER 3 och två x5 = x13) i stället för att gångras (3 × 10 = x30)
  var AEC_ADD = true;
  function aecWins(ev) {
    var total = 0;
    ev.wins.forEach(function (w) {
      var m = 1, touch = [], k = Math.max(1, w.aeInfSum || 0);
      for (var i = 0; i < 4; i++) { var p = aecPos(i); if ((w.cols[p.r] || []).indexOf(p.y) >= 0) { m = Math.max(m, AEC.lev[i]); touch.push(i); } }
      if (AEC.open) w.cols.forEach(function (rows, r) { rows.forEach(function (y) { if (aecMid(r, y)) m = Math.max(m, 5); }); });
      var tot = AEC_ADD ? (w.aeInfSum > 0 ? m + w.aeInfSum : m) : m * k;
      w.x *= tot; w.aeMul = m; w.aeInfK = k; w.aeTot = tot; w.aeTouch = touch; total += w.x;
    });
    ev.x = total;
  }
  // efter steget: talen som användes försvinner, och de lånade rutorna är tomma i sitt lager eller i FRAMÅT. Svarar
  // { inf: [{ r, y, v }] tal på brädet, back: [{ r, y, k, sym, v }] lånat bakåt, fwd: [{ r, y, sym, v }] lånat framåt }.
  function aecUse(ev, V) {
    var out = { inf: [], back: [], fwd: [] }, seen = {};
    ev.wins.forEach(function (w) {
      w.cols.forEach(function (rows, r) { rows.forEach(function (y) {
        var key = 'g' + r + ',' + y;
        if (V[r][y] > 0 && !seen[key]) { seen[key] = true; out.inf.push({ r: r, y: y, v: V[r][y] }); }
      }); });
      (w.lcols || []).forEach(function (c) {
        var key = c.k + ':' + c.r + ',' + c.y;
        if (seen[key]) return;
        seen[key] = true; (c.k ? out.back : out.fwd).push({ r: c.r, y: c.y, k: c.k, sym: c.sym, v: c.v });
      });
    });
    out.inf.forEach(function (c) { V[c.r][c.y] = 0; });
    out.back.forEach(function (c) { var B = AEC.wall[c.k - 1]; B.g[c.r][c.y] = -1; B.v[c.r][c.y] = 0; });
    out.fwd.forEach(function (c) { AEC.next.g[c.r][c.y] = -1; AEC.next.v[c.r][c.y] = 0; });
    return out;
  }
  // frispinnet är slut: slutbrädet (utan gubbarna, med talen som är kvar) blir nytt LAYER 1
  function aecPush(grid, V) {
    var F = aecFixed();
    AEC.wall.unshift({ g: grid.map(function (col, r) { return col.map(function (s, y) { return F[r][y] ? -1 : s; }); }),
      v: V.map(function (col, r) { return col.map(function (n, y) { return F[r][y] ? 0 : n; }); }) });
    if (AEC.wall.length > AEC_BACK) AEC.wall.length = AEC_BACK;
  }
  function aecCopyB(B) { return B ? { g: copyGrid(B.g), v: copyGrid(B.v) } : null; }
  // finalen: vinsterna åt båda hållen, utan lån (brädet speglat; en vinst över alla hjul räknas bara från vänster)
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
  // gubbarna som var med i en vinst levlar (upp till AEC_LOCK); släpper spärren svarar opened = true.
  // AEC_UP_SPIN: högst ett steg per gubbe och frispinn (AEC.upSpin nollställs när frispinnet landar); annars ett per lavinsteg.
  // AEC_HITS: så många vinster (träffar) en gubbe behöver för nästa LAYER (AEC.hit räknar, nollställs vid varje nytt LAYER).
  var AEC_UP_SPIN = false, AEC_HITS = 3;
  function aecLevel(ev) {
    var up = [];
    if (AEC.open) return { up: up, opened: false };
    if (!AEC.hit) AEC.hit = [0, 0, 0, 0];
    for (var i = 0; i < 4; i++) {
      if (AEC.lev[i] >= AEC_LOCK || (AEC_UP_SPIN && AEC.upSpin && AEC.upSpin[i])) continue;
      var p = aecPos(i), hit = ev.wins.some(function (w) { return (w.cols[p.r] || []).indexOf(p.y) >= 0; });
      if (!hit) continue;
      if (AEC.upSpin) AEC.upSpin[i] = true;
      if (++AEC.hit[i] < AEC_HITS) continue;
      AEC.hit[i] = 0; AEC.lev[i]++; up.push(i);
    }
    var all = AEC.lev.every(function (l) { return l >= AEC_LOCK; });
    if (all) { AEC.open = true; AEC.lev = [5, 5, 5, 5]; }
    return { up: up, opened: all };
  }
  // finalen: lager d = lagrets bräde med x(2d) (LAYER 1 x2 … LAYER 5 x10), gubbarna fasta på sina rutor och en WILD i
  // mitten när spärren har släppt; sist INFINITY om spärren har släppt
  var AEC_FINMUL = 2;
  function aecFinal(rng, scale, x0, x) {
    var out = [], D = AEC.open ? 5 : Math.max.apply(null, AEC.lev), place = [];
    for (var i = 0; i < 4; i++) { var p = aecPos(i); place.push({ r: p.r, y: p.y, sym: AEC_SYM[i] }); }
    if (AEC.open) place.push({ r: 3, y: 3, sym: W });
    for (var d = 1; d <= D && x0 + x < TIME.maxX; d++) {
      // (ett nytt bräde per lager, som förut: lagren själva är frispinnens slutbräden och har aldrig någon vinst kvar, så
      // finalen gav nästan inget när den spelade dem; 400 köp 2026-11-11)
      var f = playRound(rng, { fs: true, fsMult: AEC_FINMUL * d, layers: [emptyGrid()], depth: 1, payScale: scale, place: place, aeFinal: d, strips: STRIPS.aec });
      f.retrigger = 0; f.aeFinal = d; f.aeDepth = D; f.aeC0 = AEC.lev.slice(); f.aeOpen0 = AEC.open;
      out.push(f); x += f.x;
    }
    // INFINITY (Pontus 2026-11-11: "gräddet på moset"): ett sista bräde där AEC_INF_P av rutorna har ett tal
    if (AEC.open && x0 + x < TIME.maxX) {
      var V = [];
      for (var r = 0; r < REELS; r++) { V.push([]); for (var y = 0; y < ROWS; y++) V[r].push(rng() < AEC_INF_P ? drawW(rng, AEC_INF_DRAW) : 0); }
      var V0 = copyGrid(V);
      var fi = playRound(rng, { fs: true, fsMult: 1, layers: [emptyGrid()], depth: 1, payScale: scale, place: place, aeFinal: 6, aeInf: V, strips: STRIPS.aec });
      fi.retrigger = 0; fi.aeFinal = 6; fi.aeDepth = D; fi.aeC0 = AEC.lev.slice(); fi.aeOpen0 = true; fi.aecV0 = V0;
      out.push(fi);
    }
    return out;
  }
  // INFINITY-talen i finalens bräden: varje vinst gångras med summan av talen i sina rutor (aeInfK; minst x1). Talen som
  // användes försvinner efter steget. Svarar rutorna vars tal användes ({ r, y, v }).
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
