#!/usr/bin/env node
/* Bygger ct-bas.html: C&T Maniac (senaste byggda versionen, prototyp v50 från ct-maniac-demo på GitHub) med bara
 * gränssnittet och ett 7x7-bräde, utan C&T:s konst.
 *
 *   node tools/make-ct-bas.js <c&t-v50.html>
 *
 * - All inbakad konst blir en genomskinlig 1x1-bild (bakgrund, ram, logga, figurer, affischer, intro, symboler). Koden
 *   tror att bilderna finns och ritar därför inte heller sina reservbilder.
 * - Undantag: LAYER 1–5-brickorna och lagermärkena 1–5 (__D[16..25]), som hör till gränssnittet (UI-basen).
 * - Symbolerna: ALTER EGO:s bilder där de finns (Killen, A, K, Q), annars neutrala platshållare.
 * - 7x7: hjul och rader, hjulremsorna (sjunde hjulet som det sjätte), vinsttabellen (7 i rad betalar dubbelt mot 6),
 *   brädets storlek och texterna. Matten är C&T:s och inte omräknad för 7x7.
 */
'use strict';
var fs = require('fs'), path = require('path');
var SRC = process.argv[2];
if (!SRC) { console.error('Ange C&T-filen: node tools/make-ct-bas.js <index.html>'); process.exit(1); }
var h = fs.readFileSync(SRC, 'utf8');
var BLANK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
var KEEP = {}; for (var k = 16; k <= 25; k++) KEEP[k] = true;   // LAYER-brickorna och lagermärkena
// Målade affischer och menyer som har en ritad textversion i C&T: tom källa, så att textversionen visas i stället för en
// tom ruta (köpaffischen 26, bandspelaren 27, ODD-menyn och dess knappar 28–34, köpbekräftelsen 35–36, bonusens
// summering 37–38, bonusens startaffisch 39–40, "välkommen tillbaka" 41, storvinstens titlar 46–59, ODD INFINITY-skylten
// 65–68). All annan konst blir en genomskinlig bild (koden ritar då inte heller sin reservkonst).
var EMPTY = {}; [26, 27].concat(range(28, 41), range(46, 59), range(65, 68)).forEach(function (i) { EMPTY[i] = true; });
function range(a, b) { var o = []; for (var i = a; i <= b; i++) o.push(i); return o; }
var count = { kvar: 0, bort: 0 };
function must(re, what) { if (!re.test(h)) { console.error('Hittade inte: ' + what); process.exit(1); } }
function rep(from, to, what, all) {
  var n = h.split(from).length - 1;
  if (!n) { console.error('Hittade inte: ' + (what || from)); process.exit(1); }
  if (!all && n > 1) { console.error('Fler än en träff: ' + (what || from)); process.exit(1); }
  h = h.split(from).join(to);
  return n;
}

// 1. konsten bort (utom brickorna)
h = h.replace(/__D\[(\d+)\]="data:image\/[a-z]+;base64,[A-Za-z0-9+\/=]+"/g, function (m, i) {
  if (KEEP[+i]) { count.kvar++; return m; }
  count.bort++; return '__D[' + i + ']="' + (EMPTY[+i] ? '' : BLANK) + '"';
});
h = h.replace(/data:image\/(webp|png|jpeg|jpg|gif);base64,[A-Za-z0-9+\/=]{200,}/g, function (m, t, off, str) {
  var pre = /__D\[(\d+)\]="$/.exec(str.slice(Math.max(0, off - 14), off));
  if (pre && KEEP[+pre[1]]) return m;
  count.bort++; return BLANK;
});

// 2. symbolerna: ALTER EGO:s bilder och neutrala platshållare
function svg(body) {
  return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">' + body + '</svg>');
}
var OUT = 'stroke="#15111f" stroke-width="14" stroke-linejoin="round"';
function word(t, size, fill) {
  return '<text x="240" y="' + (240 + size * 0.36) + '" text-anchor="middle" font-family="Impact, \'Arial Black\', sans-serif" font-size="' + size + '" fill="' + fill + '" ' + OUT + ' paint-order="stroke">' + t + '</text>';
}
var BILD = {
  0: svg('<rect x="50" y="90" width="380" height="300" rx="60" fill="#ffd21f" ' + OUT + '/>' + word('WILD', 150, '#15111f')),
  1: svg('<circle cx="240" cy="240" r="180" fill="#7a3cff" ' + OUT + '/>' + word('BONUS', 104, '#fff6e0')),
  2: 'assets/figur/lv0.webp',
  3: 'assets/figur/katt-lv0.webp',
  4: 'assets/figur/vaxt-lv0.webp',
  5: svg('<circle cx="240" cy="240" r="185" fill="#58c4f5" ' + OUT + '/>'),
  6: svg('<path d="M240 45L410 143V337L240 435L70 337V143Z" fill="#ffa35a" ' + OUT + '/>'),
  7: svg('<rect x="75" y="75" width="330" height="330" rx="60" fill="#78dcb0" ' + OUT + '/>'),
  8: 'assets/ikoner/A.webp',
  9: 'assets/ikoner/K.webp',
  10: 'assets/ikoner/Q.webp',
  11: svg(word('J', 380, '#f5c451')),
  22: svg('<circle cx="240" cy="240" r="190" fill="#ffd21f" ' + OUT + '/>' + word('∞', 300, '#15111f'))
};
must(/var SYM_BILDER = \{[^\n]*\};/, 'SYM_BILDER');
h = h.replace(/var SYM_BILDER = \{[^\n]*\};/, function () { return 'var SYM_BILDER = ' + JSON.stringify(BILD) + ';'; });
// bildernas ram (C&T:s mått per symbolbild) gäller inte de nya bilderna
h = h.replace(/var SYM_RUTA = \{[\s\S]*?\n  \};/, 'var SYM_RUTA = {};');

// 3. 7x7
rep('var REELS = 6, ROWS = 6;', 'var REELS = 7, ROWS = 7;', 'REELS/ROWS');
rep('for (var n = 0; n < blocksDef[s][r]; n++) {', 'for (var n = 0; n < blocksDef[s][Math.min(r, blocksDef[s].length - 1)]; n++) {', 'hjulremsorna');
rep('var PAY_SCALE = 0.723;', 'var PAY_SCALE = 0.723;\n  // 7x7: 7 i rad betalar dubbelt mot 6 i rad (vinsttabellerna har bara 3–6)\n  function payLen(T, s, len) { var a = T[s], i = len - 3; return i < a.length ? a[i] : a[a.length - 1] * 2; }', 'PAY_SCALE');
rep('PAY[s][len - 3]', 'payLen(PAY, s, len)', 'PAY-uppslag', true);
rep('PT[s][len - 3]', 'payLen(PT, s, len)', 'PT-uppslag', true);
rep('(TIME.payT || PAY)[sym][len - 3]', 'payLen(TIME.payT || PAY, sym, len)', 'payFor');
rep('out.push([false, false, false, false, false, false]);', 'out.push(new Array(ROWS).fill(false));', 'noneRemoved');
rep('g.push([-1, -1, -1, -1, -1, -1]); return g; }', 'g.push(new Array(ROWS).fill(-1)); return g; }', 'emptyGrid');
rep('960 * UIZ)) / 6), pr', '960 * UIZ)) / REELS), pr', 'brädets mått');
rep('return c6 * 6;', 'return c6 * REELS;', 'brädets storlek');
rep('cell = size / 6;', 'cell = size / REELS;', 'rutans storlek');
rep('background-size: calc(100% / 6) calc(100% / 6);', 'background-size: calc(100% / 7) calc(100% / 7);', 'rutnätet i CSS');
// texterna
[['6 hjul och 6 rader', '7 hjul och 7 rader'], ['6 reels and 6 rows', '7 reels and 7 rows'],
  ['6×6 · 46 656 VÄGAR', '7×7 · 823 543 VÄGAR'], ['6×6 · 46,656 WAYS', '7×7 · 823,543 WAYS'],
  ['6 rader på vart och ett av de 6 hjulen: 6 × 6 × 6 × 6 × 6 × 6 = 46 656 vägar', '7 rader på vart och ett av de 7 hjulen: 7 × 7 × 7 × 7 × 7 × 7 × 7 = 823 543 vägar'],
  ['6 rows on each of the 6 reels: 6 × 6 × 6 × 6 × 6 × 6 = 46,656 ways', '7 rows on each of the 7 reels: 7 × 7 × 7 × 7 × 7 × 7 × 7 = 823,543 ways'],
  ['46 656 vinstvägar', '823 543 vinstvägar'], ['46,656 ways to win', '823,543 ways to win'],
  ['6 hjul, 6 rader och', '7 hjul, 7 rader och'], ['6 reels, 6 rows and', '7 reels, 7 rows and'],
  ["'6 HJUL'", "'7 HJUL'"], ["'6 RADER'", "'7 RADER'"], ["'6 REELS'", "'7 REELS'"], ["'6 ROWS'", "'7 ROWS'"]
].forEach(function (p) { rep(p[0], p[1], p[0], true); });
// vinstvägarna i reglerna och guiden: antalet räknas, och exempelvägarna har 7 steg
rep('num(46656)', 'num(Math.pow(ROWS, REELS))', 'antal vägar', true);
rep('return a * 6 + (r - 1);', 'return a * ROWS + (r - 1);', 'vägens nummer');
h = h.replace(/var WAY_EX = \[[\s\S]*?\]\];/, 'var WAY_EX = [[1, 1, 1, 1, 1, 1, 1], [1, 2, 3, 4, 5, 6, 7], [2, 5, 2, 5, 2, 5, 2], [7, 6, 5, 4, 3, 2, 1], [3, 3, 4, 4, 3, 3, 4], [5, 2, 4, 6, 1, 3, 7],\n    [7, 7, 1, 1, 7, 7, 1], [4, 1, 6, 1, 4, 3, 5], [2, 3, 2, 1, 2, 3, 2], [7, 7, 7, 7, 7, 7, 7]];');
rep('var STEP = 33, PW = 17, PH = 77, s = \'\', pts = [];\n    for (var r = 0; r < 6; r++) {', 'var STEP = 33, PW = 17, PH = 89, s = \'\', pts = [];\n    for (var r = 0; r < REELS; r++) {', 'vägbilden');
rep('for (var k = 0; k < 6; k++) if (k !== rows[r] - 1)', 'for (var k = 0; k < ROWS; k++) if (k !== rows[r] - 1)', 'vägbildens prickar');
rep("if (r < 5) s += '<text x=\"' + (x0 + 25)", "if (r < REELS - 1) s += '<text x=\"' + (x0 + 25)", 'vägbildens kryss');
rep('var L = 0; for (var i = 1; i < 6; i++) L += Math.hypot', 'var L = 0; for (var i = 1; i < REELS; i++) L += Math.hypot', 'vägbildens linje');
rep('<svg viewBox="-3 -3 188 83" aria-hidden="true">', '<svg viewBox="-3 -3 221 95" aria-hidden="true">', 'vägbildens storlek');
// ---- 7x7-mattens skalor och bomber (prototyp, mätt i sidan 2026-11-10 med CTMath.playGame/buyGame, inte certifierat).
// Grundspelet: en bomb på hjul 1–6 och ingen på hjul 7 (C&T hade 1,1,1,1,1,2 på sex hjul; sju hjul med sju rader gav
// Bonusspelet var 72:a snurr). Bonusspelet kommer ungefär var 280:e snurr. Utan lager (NOLAYER nedan) och med multi x1 i
// bonusarna: hela spelet cirka 93–96 % (grundspelet cirka 66 %, bonusarna cirka 30 %), köpt Bonusspel och köpt ALTER EGO
// cirka 96 %. Bonusarnas vinster är scale × fsScale och scale × maniacScale.
var CAL = { scale: 0.4338, fsScale: 3.649, maniacScale: 23.05 };
// ALTER EGO-lagren: maniacScale per variant (0 bara lagren, 1 + multi, 2 + wild, 3 båda), se AE_SCALE i spelmotorn.
// Köpt ALTER EGO (500x) simulerat i node 2026-11-11 (scratchpad sim-ae.js, köpen genom CTMath.buyGame):
// 0: 96,6 % ±1,5 (25 000 köp), median 156x, 39 % under 100x, ALTER EGO nås i 25 %.
// 1: 95,4 % ±2,6 och 99,3 % ±2,7 vid 6,25 och 6,48 (20 000 köp var), median cirka 60x, 60 % under 100x, multin i snitt x7 i
//    slutet (högst x144).
// 2: 84,3 % ±2,5 vid 5,0 (20 000 köp), skattat 96 % vid 5,9; median cirka 47x, 69 % under 100x (wilden tar det mesta).
// 3: inte inställd och inte i menyn: med multi och wild går nästan allt till maxvinsten (median cirka 4x vid 96 %).
var AE_CAL = [21.85, 6.3, 5.9, 0.44];
rep('    1: [1, 1, 1, 1, 1, 2],', '    1: [1, 1, 1, 1, 1, 1, 0],', 'bomberna i grundspelet');
// HUNT-lägena i köpmenyn (7x7, utan lager; mätt i sidan 2026-11-10 med CTMath.playGame(rng, vägg, läge)): två bomber på
// hjul 1–6 och ingen på hjul 7, så att Bonusspelet kommer ungefär var 41:a snurr (C&T: var 39:e). BONUS HUNT ger 2,735x per
// snurr (1,4 M snurr) och ALTER EGO HUNT 12,23x (760 000 snurr), så priserna 2,85x och 12,75x ger cirka 96,0 och 95,9 %.
rep('  HUNT_BLOCKS[1] = [2, 2, 2, 2, 2, 3];', '  HUNT_BLOCKS[1] = [2, 2, 2, 2, 2, 2, 0];', 'bomberna i HUNT-lägena');
rep("    hunt: { price: 3, strips: 'hunt' },\n    inf: { price: 14, strips: 'hunt', inf: true },", "    hunt: { price: 2.85, strips: 'hunt' },\n    inf: { price: 12.75, strips: 'hunt', inf: true },", 'HUNT-lägenas priser');
rep('var MODE_RTP = { hunt: 96.6, inf: 95.8, lay3: 96.5 };', 'var MODE_RTP = { hunt: 96.0, inf: 95.9, lay3: 96.5 };', 'HUNT-lägenas återbetalning');
rep("document.title = 'C&T Maniac';", "document.title = 'ALTER EGO';", 'fliktiteln');
// inget ljud alls (Pontus 2026-11-10: "Ta bort allt ljud"): ljudmotorn startar aldrig, som i en webbläsare utan Web Audio
// (C&T:s kod klarar det: alla ljud kollar Sound.ctx). Ljudknappen står kvar men gör inget hörbart; ljudfilerna hämtas inte.
rep('      var AC = window.AudioContext || window.webkitAudioContext;\n      if (!AC) return;', '      return;   // ALTER EGO: inget ljud', 'ljudmotorn');
// summeringen efter bonusen spelar en ton per diagonal; 7x7 har 13 diagonaler (6x6 hade 11), annars blir tonen NaN och bonusen fastnar
rep('var BC_PENTA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];', 'var BC_PENTA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24, 27, 29];', 'summeringens toner');
// storvinst-rutans bakgrund och nivåtitlar är konst (bortplockad): dölj de tomma bilderna, så att ingen trasig bildram syns
rep('</head>', '<style>img.ws-bg[src=""], img.ws-ti[src=""], img.ws-bg:not([src]), img.ws-ti:not([src]) { visibility: hidden; }</style></head>', 'storvinstens tomma bilder');
rep("var kick = state.fs.maniac ? txl('Infinity klart') : txl('Bonusspel klart');", "var kick = state.fs.maniac ? txl('ALTER EGO klart') : txl('Bonusspel klart');", 'summeringens rubrik');
rep("'Infinity klart': 'Infinity complete',", "'ALTER EGO klart': 'ALTER EGO complete',", 'summeringens rubrik på engelska');
// ---- NOLAYER: lagerfunktionen bort (Pontus 2026-11-10: "Ta bort alla med layerfunktionen som den är nu. Vi ska bygga den
// på ett annat vis."). C&T:s lagerkod ligger kvar men stängs av: i spelmotorn med TIME-värdena nedan, i spelet med
// patcharna under "lagren syns inte". Multin i bonusarna växte bara med lagren och står nu på x1.
// ---- ALTER EGO (superbonusen), byggd på C&T:s INFINITY-bonus. Killen (2), Katten (3) och Växten (4) har var sitt steg
// 1–5; 5 karaktärssymboler i vinster ger nästa steg och karaktären byter bild. Stegen styr inga lager (Pontus
// 2026-11-10: "Behåll att de levlar").
rep('var INFB = null, INFV = null, LADU = 99, LADC = 0, LADX = 0, LADCAP = 6;',
  'var INFB = null, INFV = null, LADU = 99, LADC = 0, LADX = 0, LADCAP = 6;\n' +
  '  // ALTER EGO: inga lager (tools/make-ct-bas.js, NOLAYER). Vinsterna når aldrig förra snurret, lagren eller INFINITY\n' +
  '  // (minCur 99), inga lagerkast, ingen kassett vid bonusstart, ingen INFINITY, ingen stege och multin står på x1.\n' +
  '  TIME.minCur = 99; TIME.layerTedP = 0; TIME.layerCarlaP = 0; TIME.infVals = null; TIME.fsLad = false;\n' +
  '  TIME.fsPrefill = false; TIME.maniacPrefill = false; TIME.fsLayersDraw = null; TIME.maniacLayersDraw = null;\n' +
  '  TIME.fsStartDraw = null; TIME.maniacStartDraw = null; TIME.fsStart = 1; TIME.maniacStart = 1;\n' +
  '  // ALTER EGO: AE = { s: steg, c: symboler mot nästa steg } för Killen, Katten och Växten (bara i superbonusen)\n' +
  '  TIME.alterEgo = true;\n' +
  '  // 7x7 (prototyp, inte certifierat): vinsterna skalade så att spelet och köpen hamnar nära 96 % (tools/make-ct-bas.js, CAL)\n' +
  '  TIME.scale = ' + CAL.scale + '; TIME.fsScale = ' + CAL.fsScale + '; TIME.maniacScale = ' + CAL.maniacScale + ';\n' +
  '  var AE_CH = { 2: 0, 3: 1, 4: 2 }, AE_NEED = 5, AE = null;\n' +
  '  // ALTER EGO-lagren (prototyp, Pontus 2026-11-11: "Ta fram det du har så får jag spela och utefter det ta beslut"):\n' +
  '  // en karaktär landar med lika många lager som sitt steg. En vinst river av översta lagret och karaktären står kvar, ett\n' +
  '  // steg mindre; med sista lagret sprängs den som vanligt. Två val som Pontus provar fram (TEST-menyn, variant 0–3):\n' +
  '  // aeMulti: varje rivet lager (karaktären står kvar) ger +1 i multin, som växer under hela bonusen.\n' +
  '  // aeWild: ALTER EGO-ögonblicket. När en karaktär når steg 5 blir alla den karaktären på brädet wild (efter lavinen),\n' +
  '  // var och en tills dess översta lager rivs. Karaktärer som landar senare är vanliga. (Först var varje karaktär som\n' +
  '  // landade på steg 5 wild, tills den var borta eller tills översta lagret var rivet: wilden skenade, 6–20 % av\n' +
  '  // superbonusarna slog i maxvinsten och med 96 % hade de andra bonusarna nästan inget kvar.)\n' +
  '  // AE_SCALE: maniacScale per variant, så att köpt ALTER EGO hamnar nära 96 % i alla fyra (tools/make-ct-bas.js, AE_CAL).\n' +
  '  var AE_SCALE = ' + JSON.stringify(AE_CAL) + ';\n' +
  '  function aeVariant(v) { v = v | 0; TIME.aeVar = v; TIME.aeMulti = !!(v & 1); TIME.aeWild = !!(v & 2); TIME.maniacScale = AE_SCALE[v]; }\n' +
  '  aeVariant(0);\n' +
  '  // under bedömningen i superbonusen: { g: brädet, w: rutorna som är wild } (scanReel)\n' +
  '  var AEX = null;\n' +
  '  // lagren på ett nytt bräde: varje karaktär har sitt steg (0 = ingen karaktär)\n' +
  '  function aeLay(grid) { return grid.map(function (col) { return col.map(function (g) { var ci = AE_CH[g]; return ci == null ? 0 : AE.s[ci]; }); }); }', 'AE i spelmotorn');
// wild-karaktärerna räknas som wild för de andra symbolerna (för sin egen symbol är de sig själva)
rep('      else if (isWild(g)) { out.rows.push(y); out.weight += WILD_MULT[g]; if (WILD_MULT[g] > out.top) out.top = WILD_MULT[g]; }\n    }\n  }',
  '      else if (isWild(g)) { out.rows.push(y); out.weight += WILD_MULT[g]; if (WILD_MULT[g] > out.top) out.top = WILD_MULT[g]; }\n' +
  '      else if (AEX && AEX.g === board && AEX.w[r][y]) { out.rows.push(y); out.weight += 1; }\n    }\n  }', 'wild-karaktärerna i scanReel');
// lagren per ruta när brädet landar (aeL lager, aeW wild)
rep('    var startGrid = grid;\n    for (;;) {',
  '    // ALTER EGO-lagren: aeL = lager per ruta (0 = ingen karaktär), aeW = 1 där rutan är wild (TIME.aeWild, ALTER EGO-ögonblicket)\n' +
  '    var aeL = AE && opts.fs && layers ? aeLay(grid) : null;\n' +
  '    var aeW = aeL ? aeL.map(function (col) { return col.map(function () { return 0; }); }) : null;\n' +
  '    var aeL0 = aeL ? copyGrid(aeL) : null, aeW0 = aeW ? copyGrid(aeW) : null;\n' +
  '    var startGrid = grid;\n    for (;;) {', 'lagren när brädet landar');
rep('      var ev = layers ? evaluateDeep(grid, layers) : ghost ? evaluateTime(grid, ghost, noTm) : evaluate(grid);',
  '      AEX = aeW ? { g: grid, w: aeW } : null;\n' +
  '      var ev = layers ? evaluateDeep(grid, layers) : ghost ? evaluateTime(grid, ghost, noTm) : evaluate(grid);\n' +
  '      AEX = null;', 'wild-karaktärerna i bedömningen');
// en vinst river översta lagret: karaktären står kvar (gone = det som sprängs och faller bort)
rep("      var t = tumble(strips, grid, stops, removed);\n      steps.push({ type: 'win', grid: grid, wins: ev.wins, baseX: ev.x, mult: mult, x: ev.x * mult, removed: removed, moves: t.moves, next: t.grid, ghostUsed: ghostUsed });",
  '      // ALTER EGO-lagren: en karaktär i en vinst som har fler än ett lager sprängs inte. Översta lagret rivs av (ett per\n' +
  '      // lavinsteg, även om rutan är med i flera vinster) och karaktären står kvar, ett steg mindre. removed är vinstens\n' +
  '      // rutor (de lyser), gone det som sprängs, peel de rivna lagren ({ r, y, k: lagren kvar }).\n' +
  '      var gone = removed, aePeel = null;\n' +
  '      if (aeL) {\n' +
  '        gone = removed.map(function (col) { return col.slice(); }); aePeel = [];\n' +
  '        for (var pr = 0; pr < REELS; pr++) for (var py = 0; py < ROWS; py++) if (removed[pr][py] && aeL[pr][py] > 1) {\n' +
  '          gone[pr][py] = false; aeL[pr][py]--; aeW[pr][py] = 0; aePeel.push({ r: pr, y: py, k: aeL[pr][py] });\n' +
  '        }\n' +
  '      }\n' +
  '      var t = tumble(strips, grid, stops, gone);\n' +
  "      steps.push({ type: 'win', grid: grid, wins: ev.wins, baseX: ev.x, mult: mult, x: ev.x * mult, removed: removed, gone: gone, peel: aePeel, moves: t.moves, next: t.grid, ghostUsed: ghostUsed });",
  'lagren rivs i stället för att sprängas');
rep('    return { gold: gold, startGrid: startGrid, steps: steps,', '    return { aeL0: aeL0, aeW0: aeW0, gold: gold, startGrid: startGrid, steps: steps,', 'lagren i rundans resultat');
rep('    MODES: MODES,\n', '    MODES: MODES, aeVariant: aeVariant,\n', 'aeVariant i CTMath');
rep('      if (LADX && opts.fs && layers) {',
  '      // ALTER EGO: varje karaktärssymbol i en vinst (på brädet och i lagren) fyller karaktärens mätare; AE_NEED\n' +
  '      // symboler ger nästa steg (från nästa lavinsteg). En stor vinst kan ge flera steg på en gång.\n' +
  '      if (AE && opts.fs && layers) {\n' +
  '        var aeUp = [];\n' +
  '        ev.wins.forEach(function (w) {\n' +
  '          var ci = AE_CH[w.sym]; if (ci == null || AE.s[ci] >= 5) return;\n' +
  '          var n = 0; w.cols.forEach(function (c) { n += c.length; }); if (w.gcols) w.gcols.forEach(function (c) { n += c.length; });\n' +
  '          AE.c[ci] += n;\n' +
  '          while (AE.c[ci] >= AE_NEED && AE.s[ci] < 5) { AE.c[ci] -= AE_NEED; AE.s[ci]++; if (aeUp.indexOf(ci) < 0) aeUp.push(ci); }\n' +
  '          if (AE.s[ci] >= 5) AE.c[ci] = 0;\n' +
  '        });\n' +
  '        steps[steps.length - 1].ae = { s: AE.s.slice(), c: AE.c.slice(), up: aeUp };\n' +
  '      }\n' +
  '      // ALTER EGO-lagren efter lavinen: karaktärerna som faller in landar med sitt steg (efter stegen ovan), de som står\n' +
  '      // kvar behåller sina lager. aeGrow: rivna lager som ger multi (TIME.aeMulti). Steget får aeN, aeWN och aeGrow.\n' +
  '      if (aeL) {\n' +
  '        var aeNL = [], aeNW = [];\n' +
  '        t.moves.forEach(function (mv, mr) {\n' +
  '          aeNL.push([]); aeNW.push([]);\n' +
  '          mv.forEach(function (m) {\n' +
  '            var ci = AE_CH[m.sym];\n' +
  '            if (m.fresh) { aeNL[mr][m.to] = ci == null ? 0 : AE.s[ci]; aeNW[mr][m.to] = 0; }\n' +
  '            else { aeNL[mr][m.to] = aeL[mr][m.from]; aeNW[mr][m.to] = aeW[mr][m.from]; }\n' +
  '            // ALTER EGO-ögonblicket (TIME.aeWild): karaktären nådde steg 5 i det här steget\n' +
  '            if (ci != null && TIME.aeWild && AE.s[ci] >= 5 && aeUp.indexOf(ci) >= 0) aeNW[mr][m.to] = 1;\n' +
  '          });\n' +
  '        });\n' +
  '        aeL = aeNL; aeW = aeNW;\n' +
  '        var aeGrow = TIME.aeMulti ? aePeel.length : 0;\n' +
  '        fsMult += aeGrow;\n' +
  '        var aeSt = steps[steps.length - 1]; aeSt.aeN = copyGrid(aeL); aeSt.aeWN = copyGrid(aeW); aeSt.aeGrow = aeGrow;\n' +
  '      }\n' +
  '      if (LADX && opts.fs && layers) {', 'stegen i playRound');
rep('LADCAP = INFB ? (TIME.infAt || 6) : depth; LADU = LADX ? Math.max(1, nL) : 99; LADC = 0; var lad0 = LADU;',
  'LADCAP = INFB ? (TIME.infAt || 6) : depth; LADU = LADX ? Math.max(1, nL) : 99; LADC = 0; var lad0 = LADU;\n' +
  '    AE = maniac && TIME.alterEgo ? { s: [1, 1, 1], c: [0, 0, 0] } : null;', 'AE vid bonusstart');
rep('var ladIn = LADX ? { u: LADU, c: LADC } : null;', 'var ladIn = LADX ? { u: LADU, c: LADC } : null, aeIn = AE ? { s: AE.s.slice(), c: AE.c.slice() } : null;', 'AE per frispinn');
rep('f.retrigger = f.scatters >= 3 ? more : 0; f.ladIn = ladIn;', 'f.retrigger = f.scatters >= 3 ? more : 0; f.ladIn = ladIn; f.aeIn = aeIn;', 'AE per frispinn (2)');
rep('var ladEnd = LADX ? LADU : 0, ladS = LADX ? lad0 : 0; INFB = null; INFV = null; LADU = 99; LADX = 0; LADCAP = 6;',
  'var ladEnd = LADX ? LADU : 0, ladS = LADX ? lad0 : 0; INFB = null; INFV = null; LADU = 99; LADX = 0; LADCAP = 6;\n' +
  '    var aeEnd = AE ? AE.s.slice() : null; AE = null;', 'AE vid bonusslut');
rep('return { lad: ladEnd, ladStart: ladS, maniac: maniac,', 'return { lad: ladEnd, ladStart: ladS, ae: aeEnd, maniac: maniac,', 'AE i bonusens resultat');
// spelet: bilderna per steg, panelen och LEVEL UP (src/alter-ego.js), inkopplat i bonusflödet
var AE_JS = fs.readFileSync(path.join(__dirname, '..', 'src', 'alter-ego.js'), 'utf8');
rep('  async function runFreeSpins(', AE_JS + '  async function runFreeSpins(', 'runFreeSpins');
rep('    if (!document.body.classList.contains(\'fs\')) fsOn();\n', '    if (!document.body.classList.contains(\'fs\')) fsOn();\n    if (maniac && M.TIME.alterEgo) aeInit();\n', 'aeInit');
rep('      await spinReels(res, true);\n      // brädet syns en stund innan vinsterna visas', '      if (res.aeIn) { aeSprites(res.aeIn.s); aeRender(res.aeIn); }\n      await spinReels(res, true);\n      if (res.aeL0) aeCells(res.aeL0, res.aeW0);\n      // brädet syns en stund innan vinsterna visas', 'aeRender per frispinn');
rep('      if (fs) await ladShow(st);\n', '      if (fs) await ladShow(st);\n      if (fs && st.ae) await aeShow(st);\n', 'aeShow');
// ALTER EGO-lagren i spelet: rutan ritas med sina lagers bild (c.ae), vinsten river översta lagret (aePeel) i stället för
// att spränga karaktären, och lagren följer med i lavinen (aeCells)
rep('  function drawCell(g, c, x, time, highlight) {\n    var y = c.y * cell;',
  '  // ALTER EGO: en karaktär med egna lager (c.ae) ritas med sitt stegs bild, och en wild-karaktär får WILD-märket (src/alter-ego.js)\n' +
  '  function drawCell(g, c, x, time, highlight) { var aeS = aeSwap(c); try { drawCell0(g, c, x, time, highlight); } finally { aeUnswap(aeS); } if (c.aeW) aeMark(g, c, x, highlight); }\n' +
  '  function drawCell0(g, c, x, time, highlight) {\n    var y = c.y * cell;', 'rutans lager');
rep('      popCells(st.removed);\n      if (LAVIN_LJUD) Sound.pop(winIdx);', '      popCells(st.gone || st.removed);\n      if (st.peel) aePeel(st);\n      if (LAVIN_LJUD) Sound.pop(winIdx);', 'lagren rivs');
rep('      applyMoves(st.moves);\n', '      applyMoves(st.moves);\n      if (st.aeN) aeCells(st.aeN, st.aeWN);\n', 'lagren i lavinen');
rep('        var grow = st.wins.reduce(function (a, x) { return a + (x.deep || 0); }, 0);', '        var grow = st.wins.reduce(function (a, x) { return a + (x.deep || 0); }, 0) + (st.aeGrow || 0);', 'multin av rivna lager');
// TEST-menyn: fliken Nytt med de fyra varianterna (gratis superbonus i varianten), som Pontus provar fram
rep('  var TESTS = {\n', '  var TESTS = {\n    // ALTER EGO-lagren: en gratis superbonus i variant 0–3 (src/alter-ego.js, aeTest)\n' +
  '    aeV0: function () { aeTest(0); }, aeV1: function () { aeTest(1); }, aeV2: function () { aeTest(2); }, aeV3: function () { aeTest(3); },\n', 'testknapparna');
rep('  function nxNew() { return []; }', '  function nxNew() { return aeNew(); }', 'fliken Nytt');
rep('    var total = state.fs.total, wasManiac = state.fs.maniac, maxed = state.maxShown;', '    aeEnd();\n    var total = state.fs.total, wasManiac = state.fs.maniac, maxed = state.maxShown;', 'aeEnd');
rep("<h2 class=\"ov-title\">' + (maniac ? 'INFINITY' : txl('BONUSSPEL'))", "<h2 class=\"ov-title\">' + (maniac ? 'ALTER EGO' : txl('BONUSSPEL'))", 'bonusens rubrik', true);
rep("var INF_LADDER = '<p><b>3 lagervinster</b> öppnar nästa LAYER. Sist öppnas <b class=\"inf-word\">INFINITY</b></p>';",
  "var INF_LADDER = '<p><b>Killen, Katten och Växten</b> levlar var för sig: <b>5 karaktärer i vinster</b> ger nästa steg. <b>Steg 5 = ALTER EGO</b></p>';", 'bonusens regel');

// ---- NOLAYER i spelet: lagren syns inte (inga rivna hörn, ingen LAYERSPINS-panel eller stege, inga LAYER-brickor och
// lagertexter i bonusens startkort, summeringen och reglerna). C&T:s kod för dem ligger kvar men visas inte.
// cut: byter allt från start (måste finnas en gång) fram till end (första träffen efter start) mot to
function cut(start, end, to, what) {
  var a = h.indexOf(start);
  if (a < 0 || h.indexOf(start, a + 1) >= 0) { console.error((a < 0 ? 'Hittade inte: ' : 'Fler än en träff: ') + what); process.exit(1); }
  var b = h.indexOf(end, a + start.length);
  if (b < 0) { console.error('Hittade inte slutet: ' + what); process.exit(1); }
  h = h.slice(0, a) + to + h.slice(b);
}
// förra snurrets symbol i ett rivet hörn av varje ruta
rep('    ghostView = any ? { grid: res.ghostIn.map(function (col) { return col.slice(); }), t0: clock, out: null } : null;',
  '    ghostView = null;   // ALTER EGO: inga lager, inga rivna hörn', 'rivna hörn');
// LAYERSPINS-loggan och LAYER 1–3 till vänster i grundspelet
rep('      bl.hidden = false;', '      bl.hidden = true;   // ALTER EGO: ingen LAYERSPINS-panel', 'LAYERSPINS-panelen');
// bonusarna utan djup i spelet: ingen stege, inga LAYER-brickor i startkortet och inga lagerrader i summeringen
rep('depth: maniac ? M.TIME.maniacDepth : M.TIME.fsDepth };', 'depth: 0 };   // ALTER EGO: inga lager i bonusarna', 'bonusens lagerdjup i spelet');
// bonusens startkort: bara karaktärerna (superbonusen) och bomberna
cut("      // Tidsvägar: reglerna i korta, stora rader", "      // ingen knapp, samma text som överallt",
  "      // ALTER EGO: inga lager, så bara karaktärerna (superbonusen) och bomberna\n" +
  "      '<div class=\"cv-facts\">' + (maniac && M.TIME.alterEgo ? aeFacts() : '') + txl('<p><b>3 BOMBER</b> = +{n} frispinn</p>', { n: maniac ? 3 : M.FS_RETRIGGER }) + '</div>' +\n",
  'bonusens startkort');
// reglerna (i-knappen): lagertexterna bort (mtRuleText läser kassettens värden, som inte finns längre, och kraschade)
cut("    var fsRule = '<li>' + mtRuleText(false) + '</li>' +", "    $('#infoBody').innerHTML =",
  "    var fsRule = '', mnRule = aeRule();\n",
  'reglernas bonusregler');
// exemplet med det rivna hörnet under "Så vinner du" (Wild-exemplet blir sist)
cut("] },\n      { t: 'Layerspins', x: txl('Saknas symbolen på nästa hjul kan förra snurrets symbol", "\n    ];\n    var cards = ex.map(", '] }', 'reglernas Layerspins-exempel');
cut("      '<section><h3>Layerspins</h3><ul>' +", "      '<section><h3>' + txl('Vinsttabell')", '', 'reglernas Layerspins');
cut("      '<li>' + (M.TIME.fsLad ? txl('Stegen: kassetten öppnar", "      fsRule +", '', 'reglernas lager i Bonusspelet');
cut("      '<li>' + (M.TIME.infVals ? infRuleLadder()", "      mnRule +", '', 'reglernas lager i superbonusen');
cut("      '<li>' + txl('3 LAYERS: varje snurr spelas med LAYER 1–3", "      '<li>' + txl('Vinsterna räknas i gånger insatsen som vanligt.", '', 'reglernas 3 LAYERS');
rep("'<section><h3>' + txl('Infinity-bonus') + '</h3><ul>' +", "'<section><h3>ALTER EGO</h3><ul>' +", 'reglernas rubrik');
rep("txl('RTP köpt Infinity')", "txl('RTP köpt ALTER EGO')", 'reglernas RTP-rad', true);
rep('Blir en av bomberna guld startar Infinity-bonusen i stället.', 'Blir en av bomberna guld startar ALTER EGO i stället.', 'reglernas guldbomb (1)', true);
rep('Guldbomben startar Infinity-bonusen med {n} frispinn.', 'Guldbomben startar ALTER EGO med {n} frispinn.', 'reglernas guldbomb (2)', true);
rep("txl('I Infinity-bonusen är vinsterna vinsttabellen gånger {s}", "txl('I ALTER EGO är vinsterna vinsttabellen gånger {s}", 'reglernas skala', true);
rep("txl('Köp: Infinity-bonusen för {x} gånger insatsen. Köpt Infinity-bonus ger i snitt {p} tillbaka.'", "txl('Köp: ALTER EGO för {x} gånger insatsen. Köpt ALTER EGO ger i snitt {p} tillbaka.'", 'reglernas köp', true);
rep("txl('INFINITY HUNT: samma hjul som BONUS HUNT, och varje bonus som startar blir Infinity-bonusen.", "txl('ALTER EGO HUNT: samma hjul som BONUS HUNT, och varje bonus som startar blir ALTER EGO.", 'reglernas läge', true);
// köpmenyn: superbonusen heter ALTER EGO, och läget 3 LAYERS finns inte
rep("card('b2', 'mn', 'INFINITY<small>BONUS</small>',", "card('b2', 'mn', 'ALTER EGO<small>BONUS</small>',", 'köpmenyns superbonus');
rep("      btn('inf', 'mn', 'INFINITY<br>HUNT', txl('Varje bonus blir INFINITY')) +\n      btn('lay3', 'ly', '3<br>LAYERS', txl('LAYER 1–3 i varje snurr')) + '</div></div>';",
  "      btn('inf', 'mn', 'ALTER EGO<br>HUNT', txl('Varje bonus blir ALTER EGO')) + '</div></div>';", 'köpmenyns lägen');
// guiden "Så funkar spelet" handlar om Layerspins och kassetten: menyvalet döljs (som "Hur man spelar", INTRO_PAUSAT)
rep('<button class="mitem" type="button" id="mGuide">', '<button class="mitem" type="button" id="mGuide" hidden>', 'guiden i menyn');
// laddningsskärmens LAYERSPINS-märke
rep("{ lsEl = document.createElement('div'); lsEl.className = 'ld-ls'; lsEl.innerHTML = lsLockupHtml(); var lg0 = L.querySelector('.ld-game'); if (lg0) lg0.appendChild(lsEl); else lsEl = null; }",
  "{ lsEl = null; }   // ALTER EGO: inget LAYERSPINS-märke", 'laddningsskärmens märke');

// rakt in i spelet: inget ODD HEAD-intro och ingen startskärm med "Hur man spelar" (C&T:s egen brytare; Pontus
// 2026-11-10: "ta bort introt och 'hur man spelar' nu när vi ska börja bygga produkten"). Reglerna finns kvar i menyn.
rep('var INTRO_PAUSAT = false;', 'var INTRO_PAUSAT = true;', 'INTRO_PAUSAT');
h = h.replace(/<title>[^<]*<\/title>/, '<title>ALTER EGO</title>');
// egna sparnycklar (C&T:s sparade 6x6-väggar och omgångar får inte läsas av 7x7-brädet)
var nKey = rep("'ctm.", "'alterego7.", 'sparnycklarna', true);
console.log('sparnycklar bytta: ' + nKey);

var out = path.join(__dirname, '..', 'ct-bas.html');
fs.writeFileSync(out, h);
console.log('ct-bas.html: ' + Math.round(h.length / 1024) + ' kB, bilder kvar ' + count.kvar + ', bortplockade ' + count.bort);
