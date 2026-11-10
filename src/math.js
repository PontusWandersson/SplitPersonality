/* Lagerspelet (arbetsnamn) — spelmatematik, version 0.2 (2026-11-10: fallande laviner som i C&T Maniac)
 *
 * Rutnät 7x7 (7 hjul, 7 rader). Vinst = en klunga om minst 5 rutor som sitter ihop (upp, ner, vänster, höger) och har
 * samma symbol.
 *
 * Varje ruta har en symbol överst (den som snurrar in och faller i lavinerna) och en nivå, LV0–LV3. Nivån hör till
 * rutan, inte till symbolen: en ruta på LV2 har två lager bakom symbolen (LAYER 1 och LAYER 2). Ett lager har en symbol
 * eller är tomt (layerBlank). En ruta räknas som alla sina symboler (överst och i lagren), så den kan vara med i flera
 * klungor samtidigt.
 *
 * Klungans storlek = antal rutor + rutornas nivåer (sizeLv; en LV2-ruta räknas som 3 rutor). Storleken avgör vinsten.
 *
 * Lavin (som i C&T): vinnande symboler överst sprängs, symbolerna ovanför faller ner och nya faller in uppifrån. Vinnande
 * symboler i ett lager försvinner och lagret fylls på där det sitter. Varje ruta som var med i en vinst levlar ett steg
 * (får ett lager till). En LV3-ruta som vinner igen spricker: den börjar om på LV0 (lagren rivs) och rutorna runt omkring
 * (upp, ner, vänster, höger) levlar ett steg.
 *
 * Grundspelet: varje snurr börjar alla rutor på LV0.
 * Bonusen (inte omkalibrerad sedan 0.1, avstängd i varianten bas): nivåerna ligger kvar mellan frispinnen.
 *
 * Alla slumptal kommer från rng i en fast ordning, så att en server kan avgöra hela omgången. Kalibrering: se
 * PRESETS.bas och docs/.
 */
(function (root) {
  'use strict';

  var N = 7, CELLS = N * N, MAXLV = 3;
  // Ruta c = rad * 7 + hjul (rad 0 överst). Grannar upp, ner, vänster, höger.
  var NB = [];
  for (var c0 = 0; c0 < CELLS; c0++) {
    var y0 = Math.floor(c0 / N), r0 = c0 % N, nb = [];
    if (y0 > 0) nb.push(c0 - N);
    if (y0 < N - 1) nb.push(c0 + N);
    if (r0 > 0) nb.push(c0 - 1);
    if (r0 < N - 1) nb.push(c0 + 1);
    NB.push(nb);
  }

  var CFG = {
    names: ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'BONUS'],
    paying: 8,          // symbol 0–7 betalar
    scatter: 8,         // bonussymbolen (bara överst, aldrig i ett lager)
    baseW: [6, 7, 8, 9, 13, 14, 15, 16, 0.55],   // hur ofta varje symbol kommer (grundspelet)
    fsW: [6, 7, 8, 9, 13, 14, 15, 16, 0.4],      // samma i bonusen
    sizes: [5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50, 70],          // klungans storlek (minst)
    ladder: [1, 1.5, 2, 3, 4, 5, 7, 10, 20, 50, 150, 600, 2500, 10000],  // vinsttabellens steg
    symF: [5, 3, 2.5, 2, 1.5, 1.25, 1.1, 1],     // hur mycket varje symbol betalar jämfört med den lägsta
    sizeLv: 1,          // varje nivå räknas som så många rutor extra i klungans storlek
    scale: 0.15,        // grundskala för alla vinster (kalibreras per variant)
    fsScale: 0.0215,    // bonusens skala (gånger scale)
    fsAward: { 3: 10, 4: 12, 5: 15 },
    fsRetrigger: 5,
    fsGoldP: 0.006, goldSize: 10,
    maxLv: 3,           // högsta nivån (LV3 = 3 lager)
    layerBlank: 0.3,    // chansen att ett nytt lager är tomt (bromsen som gör att lavinerna tar slut)
    fsLayerBlank: 0.25,
    burst: 'grow',      // 'grow': rutan börjar om och grannarna levlar, 'self': bara rutan börjar om, 'none'
    maxX: 10000,        // maxvinst per omgång (gånger insatsen)
    maxSteps: 1000      // säkerhetsspärr för laviner (ska aldrig nås)
  };
  function set(o) { for (var k in o) CFG[k] = o[k]; }
  // Färdiga varianter. bas: bara grundspelet (ingen bonussymbol), kalibrerat för sig självt.
  var PRESETS = {
    // 0.2: 96,20 % (13 M omgångar, frö 5 och 21, skala 0,15) -> 0,1497. SD 12,8, vinst i 28,9 % av snurren.
    bas: { baseW: [6, 7, 8, 9, 13, 14, 15, 16, 0], scale: 0.1497 }
  };
  function usePreset(name) { if (PRESETS[name]) set(PRESETS[name]); }
  var STATS = null;
  function setStats(s) { STATS = s; }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function popcount(m) { var n = 0; while (m) { m &= m - 1; n++; } return n; }

  // Viktad slump bland symbolerna som inte finns i mask (ett slumptal).
  function pick(rng, w, mask) {
    var t = 0, i;
    for (i = 0; i < w.length; i++) if (!(mask & (1 << i))) t += w[i];
    var u = rng() * t;
    for (i = 0; i < w.length; i++) {
      if (mask & (1 << i)) continue;
      u -= w[i];
      if (u < 0) return i;
    }
    for (i = w.length - 1; i >= 0; i--) if (!(mask & (1 << i)) && w[i] > 0) return i;
    return 0;
  }
  // Lagrens vikter: som snurrets, men utan bonussymbolen.
  var LW = null, LW_SRC = null;
  function layerW(w) {
    if (LW_SRC !== w) { LW = w.slice(); LW[CFG.scatter] = 0; LW_SRC = w; }
    return LW;
  }

  // Brädet: top = symbolen överst, lv = nivån, lmask = symbolerna i lagren (en bit per symbol), lblank = tomma lager,
  // gold = guldruta (bara i bonusen).
  function emptyBoard() {
    return { top: new Int8Array(CELLS), lv: new Int8Array(CELLS), lmask: new Int32Array(CELLS), lblank: new Int8Array(CELLS), gold: new Int8Array(CELLS) };
  }
  function copyBoard(b) {
    return { top: Int8Array.from(b.top), lv: Int8Array.from(b.lv), lmask: Int32Array.from(b.lmask), lblank: Int8Array.from(b.lblank), gold: Int8Array.from(b.gold) };
  }
  function symset(b, c) { return (1 << b.top[c]) | b.lmask[c]; }

  // Nya symboler överst på hela brädet: hjul för hjul, uppifrån och ner (ett slumptal per ruta).
  function spinTops(rng, b, w) {
    for (var r = 0; r < N; r++) for (var y = 0; y < N; y++) b.top[y * N + r] = pick(rng, w, 0);
  }
  // Fyller lagren upp till nivån, ruta för ruta (rad för rad). Ett nytt lager är tomt med chansen blankP (ett slumptal),
  // annars en symbol som rutan inte redan har (ett slumptal).
  function fillLayers(rng, b, w, blankP) {
    var lw = layerW(w), pb = blankP == null ? CFG.layerBlank : blankP;
    for (var c = 0; c < CELLS; c++) {
      var m = b.lmask[c], bl = b.lblank[c], need = b.lv[c] - popcount(m) - bl;
      while (need-- > 0) {
        if (pb > 0 && rng() < pb) bl++;
        else m |= 1 << pick(rng, lw, m | (1 << b.top[c]));
      }
      b.lmask[c] = m; b.lblank[c] = bl;
    }
  }

  function countScatter(b) {
    var n = 0;
    for (var c = 0; c < CELLS; c++) if (b.top[c] === CFG.scatter) n++;
    return n;
  }
  function payFor(s, size) {
    var i = CFG.sizes.length - 1;
    while (i > 0 && size < CFG.sizes[i]) i--;
    return CFG.ladder[i] * CFG.symF[s] * CFG.scale;
  }

  // Alla klungor om minst 5 rutor: [{ sym, cells, size, lvs, x }].
  var SEEN = new Int32Array(CELLS), GEN = 0, STACK = new Int32Array(CELLS);
  function findWins(b) {
    var wins = [];
    for (var s = 0; s < CFG.paying; s++) {
      var bit = 1 << s;
      GEN++;
      for (var c = 0; c < CELLS; c++) {
        if (!(symset(b, c) & bit) || SEEN[c] === GEN) continue;
        var cells = [], sp = 0;
        STACK[sp++] = c; SEEN[c] = GEN;
        while (sp) {
          var q = STACK[--sp];
          cells.push(q);
          var nb = NB[q];
          for (var j = 0; j < nb.length; j++) {
            var z = nb[j];
            if ((symset(b, z) & bit) && SEEN[z] !== GEN) { SEEN[z] = GEN; STACK[sp++] = z; }
          }
        }
        if (cells.length >= 5) {
          var lvs = 0, gs = 0;
          for (var e = 0; e < cells.length; e++) { lvs += b.lv[cells[e]]; gs += b.gold[cells[e]]; }
          var size = cells.length + CFG.sizeLv * lvs + (CFG.fsGoldP ? CFG.goldSize * gs : 0);
          wins.push({ sym: s, cells: cells, size: size, lvs: lvs, x: payFor(s, size) });
        }
      }
    }
    return wins;
  }

  /* Ett snurr med alla laviner på brädet b (symbolerna överst är redan snurrade). Brädet ändras på plats.
   * opts.w: vikterna, opts.k: extra vinstfaktor (bonusen), opts.blank: chansen för tomma lager, opts.room: hur mycket som
   * får vinnas innan taket, opts.fs: bonusen, opts.record: spara varje lavinsteg (för att visa spelet).
   * Ett sparat steg: before (brädet), wins, topWin (rutor vars översta symbol vinner), layWin (vinnande lagersymboler per
   * ruta), lvup (rutor som levlade), bursts (rutor som sprack), grow (grannar som levlade av en spricka), moves (per hjul:
   * { sym, from, to, fresh } som i C&T), after (brädet efter lavinen och påfyllningen). */
  function playRound(rng, b, opts) {
    var x = 0, steps = 0, bursts = 0, maxLv = 0, maxSize = 0, k = opts.k || 1, rec = opts.record ? [] : null;
    var winMask = new Int32Array(CELLS), top = CFG.maxLv, bm = CFG.burst;
    for (;;) {
      var wins = findWins(b);
      if (!wins.length) break;
      var stepX = 0, i, c;
      winMask.fill(0);
      for (i = 0; i < wins.length; i++) {
        var wn = wins[i];
        wn.x *= k; stepX += wn.x;
        if (wn.size > maxSize) maxSize = wn.size;
        if (STATS) STATS[opts.fs ? 'fs' : 'base'][Math.min(wn.size, 199)]++;
        for (var j = 0; j < wn.cells.length; j++) winMask[wn.cells[j]] |= 1 << wn.sym;
      }
      var before = rec ? copyBoard(b) : null;
      var topWin = new Uint8Array(CELLS), layWin = rec ? new Int32Array(CELLS) : null, lvup = rec ? new Uint8Array(CELLS) : null;
      var burstAt = [], grow = [];
      // vinnande symboler: överst sprängs de, i lagren försvinner de; rutan levlar eller spricker
      for (c = 0; c < CELLS; c++) {
        var wm = winMask[c];
        if (!wm) continue;
        if (wm & (1 << b.top[c])) topWin[c] = 1;
        if (layWin) layWin[c] = b.lmask[c] & wm;
        b.lmask[c] &= ~wm; b.lblank[c] = 0;
        if (b.lv[c] < top) { b.lv[c]++; if (lvup) lvup[c] = 1; }
        else if (bm !== 'none') burstAt.push(c);
      }
      for (i = 0; i < burstAt.length; i++) { c = burstAt[i]; b.lv[c] = 0; b.lmask[c] = 0; b.lblank[c] = 0; }
      if (bm === 'grow') for (i = 0; i < burstAt.length; i++) {
        var nb = NB[burstAt[i]];
        for (var q = 0; q < nb.length; q++) {
          var z = nb[q];
          if (burstAt.indexOf(z) < 0 && b.lv[z] < top) { b.lv[z]++; grow.push(z); }
        }
      }
      bursts += burstAt.length;
      // lavinen: per hjul faller symbolerna som är kvar ner, och nya faller in uppifrån (ett slumptal per ny symbol,
      // hjul för hjul, uppifrån och ner)
      var moves = [];
      for (var r = 0; r < N; r++) {
        var keep = [], mv = [];
        for (var y = 0; y < N; y++) if (!topWin[y * N + r]) keep.push({ sym: b.top[y * N + r], from: y });
        var kNew = N - keep.length;
        for (var jn = 0; jn < kNew; jn++) {
          var ns = pick(rng, opts.w, 0);
          mv.push({ sym: ns, from: jn - kNew, to: jn, fresh: true });
        }
        for (var jk = 0; jk < keep.length; jk++) mv.push({ sym: keep[jk].sym, from: keep[jk].from, to: kNew + jk, fresh: false });
        for (jn = 0; jn < mv.length; jn++) b.top[mv[jn].to * N + r] = mv[jn].sym;
        moves.push(mv);
      }
      fillLayers(rng, b, opts.w, opts.blank);
      for (c = 0; c < CELLS; c++) if (b.lv[c] > maxLv) maxLv = b.lv[c];
      x += stepX; steps++;
      if (rec) rec.push({ before: before, wins: wins, x: stepX, topWin: topWin, layWin: layWin, lvup: lvup, bursts: burstAt, grow: grow, moves: moves, after: copyBoard(b) });
      if (opts.room !== undefined && x >= opts.room) break;
      if (steps >= CFG.maxSteps) break;
    }
    var lvSum = 0, goldN = 0;
    for (var cc = 0; cc < CELLS; cc++) { lvSum += b.lv[cc]; goldN += b.gold[cc]; }
    return { x: x, steps: steps, bursts: bursts, maxLv: maxLv, maxSize: maxSize, lvSum: lvSum, goldN: goldN, scatters: countScatter(b), record: rec };
  }

  // Bonusen (inte omkalibrerad i 0.2): nivåerna från startbrädet följer med och ligger kvar mellan frispinnen.
  function playBonus(rng, startBoard, scatters, x0, record) {
    var b = copyBoard(startBoard);
    var left = CFG.fsAward[Math.min(scatters, 5)] || 0, x = 0, spins = [], awarded = left, retriggers = 0;
    while (left > 0 && x0 + x < CFG.maxX) {
      left--;
      spinTops(rng, b, CFG.fsW);
      b.lmask.fill(0); b.lblank.fill(0);
      fillLayers(rng, b, CFG.fsW, CFG.fsLayerBlank);
      var start = record ? copyBoard(b) : null;
      var r = playRound(rng, b, { fs: true, w: CFG.fsW, k: CFG.fsScale, blank: CFG.fsLayerBlank, room: CFG.maxX - x0 - x, record: record });
      r.start = start;
      if (r.scatters >= 3) { left += CFG.fsRetrigger; retriggers++; }
      x += r.x;
      spins.push(r);
    }
    return { x: x, spins: spins, awarded: awarded, retriggers: retriggers };
  }

  // En hel betald omgång: grundsnurr med laviner, och bonusen om det blev minst 3 bonussymboler.
  function playGame(rng, record) {
    var b = emptyBoard();
    spinTops(rng, b, CFG.baseW);
    var start = record ? copyBoard(b) : null;
    var base = playRound(rng, b, { w: CFG.baseW, room: CFG.maxX, record: record });
    base.start = start; base.end = record ? copyBoard(b) : null;
    var bonus = base.scatters >= 3 && base.x < CFG.maxX ? playBonus(rng, b, base.scatters, base.x, record) : null;
    var raw = base.x + (bonus ? bonus.x : 0);
    return { base: base, bonus: bonus, x: Math.min(raw, CFG.maxX), capped: raw >= CFG.maxX };
  }

  root.LagerMath = {
    VERSION: '0.2', N: N, CELLS: CELLS, MAXLV: MAXLV, NB: NB, CFG: CFG, set: set, setStats: setStats, PRESETS: PRESETS, usePreset: usePreset,
    mulberry32: mulberry32, popcount: popcount, emptyBoard: emptyBoard, copyBoard: copyBoard, symset: symset,
    findWins: findWins, payFor: payFor, countScatter: countScatter,
    playRound: playRound, playBonus: playBonus, playGame: playGame
  };
})(typeof module !== 'undefined' ? module.exports : window);
