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
// ALTER EGO med dörrarna (2026-11-11, scratchpad sim-dorr.js, köpt ALTER EGO genom CTMath.buyGame): 97,8, 95,4 och 92,5 %
// vid maniacScale 3,55 (7 000 köp var), alltså 3,58 för 96 %. Medianen cirka 187x på köpet för 500x, 39 % under 100x, cirka
// 11 dörrar och 5 låsta gubbar per bonus, ALTER EGO (steg 5) i 78 % av bonusarna, maxvinsten 2 gånger på 21 000 köp.
// Snittet är detsamma som förut, så hela spelet och HUNT-lägena påverkas inte.
var CAL = { scale: 0.4338, fsScale: 3.649, maniacScale: 3.58 };
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
// ---- ALTER EGO (superbonusen), byggd på C&T:s INFINITY-bonus. Gubben är en dörr ner i lagren (Pontus 2026-11-11: "Bygg
// så jag får se vad du menar"): Killen (2), Katten (3) och Växten (4) i en vinst levlar och låses, lavinerna bygger lagren
// och en vinst kan gå ner i lagren genom en låst gubbe. Spelmotorns del ligger i src/alter-ego-motor.js, spelets i
// src/alter-ego.js. (Förut: först stegen 1–5 per karaktär som styrde LAYER 1–5, sedan lager som revs av; båda borttagna.)
var AE_MOTOR = fs.readFileSync(path.join(__dirname, '..', 'src', 'alter-ego-motor.js'), 'utf8');
rep('var INFB = null, INFV = null, LADU = 99, LADC = 0, LADX = 0, LADCAP = 6;',
  'var INFB = null, INFV = null, LADU = 99, LADC = 0, LADX = 0, LADCAP = 6;\n' +
  '  // ALTER EGO: C&T:s lager är avstängda (tools/make-ct-bas.js, NOLAYER). Vinsterna når aldrig förra snurret, C&T:s lager\n' +
  '  // eller INFINITY (minCur 99), inga lagerkast, ingen kassett vid bonusstart, ingen INFINITY och ingen stege. Multin\n' +
  '  // börjar på x1; i superbonusen växer den med ALTER EGO-lagren (src/alter-ego-motor.js).\n' +
  '  TIME.minCur = 99; TIME.layerTedP = 0; TIME.layerCarlaP = 0; TIME.infVals = null; TIME.fsLad = false;\n' +
  '  TIME.fsPrefill = false; TIME.maniacPrefill = false; TIME.fsLayersDraw = null; TIME.maniacLayersDraw = null;\n' +
  '  TIME.fsStartDraw = null; TIME.maniacStartDraw = null; TIME.fsStart = 1; TIME.maniacStart = 1;\n' +
  '  TIME.alterEgo = true;\n' +
  '  // 7x7 (prototyp, inte certifierat): vinsterna skalade så att spelet och köpen hamnar nära 96 % (tools/make-ct-bas.js, CAL)\n' +
  '  TIME.scale = ' + CAL.scale + '; TIME.fsScale = ' + CAL.fsScale + '; TIME.maniacScale = ' + CAL.maniacScale + ';\n' +
  AE_MOTOR, 'ALTER EGO i spelmotorn');
// superbonusens runda (aeOn): de låsta gubbarna landar på sin plats, vinsterna räknas med dörrarna, gubbarna levlar i
// stället för att sprängas och lavinen faller förbi de låsta
rep('    var startGrid = grid;\n    for (;;) {',
  '    // ALTER EGO: de låsta gubbarna står kvar (aeL0 = gubbarnas steg när brädet landar, aeD0 = antalet lager)\n' +
  '    var aeOn = !!(AE && opts.fs && layers), aeL0 = null, aeD0 = 0;\n' +
  '    if (aeOn) { aeOverlay(grid); aeL0 = copyGrid(AE.L); aeD0 = AE.stack.length; }\n' +
  '    var startGrid = grid;\n    for (;;) {', 'ALTER EGO när brädet landar');
rep('      var ev = layers ? evaluateDeep(grid, layers) : ghost ? evaluateTime(grid, ghost, noTm) : evaluate(grid);',
  '      var ev = aeOn ? aeEvaluate(grid) : layers ? evaluateDeep(grid, layers) : ghost ? evaluateTime(grid, ghost, noTm) : evaluate(grid);', 'ALTER EGO-vinsterna');
rep("      var t = tumble(strips, grid, stops, removed);\n      steps.push({ type: 'win', grid: grid, wins: ev.wins, baseX: ev.x, mult: mult, x: ev.x * mult, removed: removed, moves: t.moves, next: t.grid, ghostUsed: ghostUsed });",
  '      // ALTER EGO: removed är vinstens rutor (de lyser, också dörrarna), gone det som sprängs, up gubbarna som levlar,\n' +
  '      // doors vinsterna genom dörrarna, aeN gubbarnas steg efter lavinen, aeDepth antalet lager\n' +
  '      var aeS = aeOn ? aeStep(grid, ev.wins, removed) : null;\n' +
  '      var t = aeS ? aeTumble(strips, grid, stops, aeS.gone) : tumble(strips, grid, stops, removed);\n' +
  "      steps.push({ type: 'win', grid: grid, wins: ev.wins, baseX: ev.x, mult: mult, x: ev.x * mult, removed: removed, moves: t.moves, next: t.grid, ghostUsed: ghostUsed });\n" +
  '      if (aeS) {\n' +
  '        var aeSt = steps[steps.length - 1];\n' +
  '        aeSt.gone = aeS.gone; aeSt.up = aeS.up; aeSt.doors = aeS.doors; aeSt.aeN = copyGrid(AE.L); aeSt.aeDepth = AE.stack.length;\n' +
  '      }', 'ALTER EGO i lavinen');
rep('    return { gold: gold, startGrid: startGrid, steps: steps,', '    return { aeL0: aeL0, aeD0: aeD0, gold: gold, startGrid: startGrid, steps: steps,', 'ALTER EGO i rundans resultat');
rep('LADCAP = INFB ? (TIME.infAt || 6) : depth; LADU = LADX ? Math.max(1, nL) : 99; LADC = 0; var lad0 = LADU;',
  'LADCAP = INFB ? (TIME.infAt || 6) : depth; LADU = LADX ? Math.max(1, nL) : 99; LADC = 0; var lad0 = LADU;\n' +
  '    AE = maniac && TIME.alterEgo ? aeStart() : null;', 'ALTER EGO vid bonusstart');
rep('var ladEnd = LADX ? LADU : 0, ladS = LADX ? lad0 : 0; INFB = null; INFV = null; LADU = 99; LADX = 0; LADCAP = 6;',
  'var ladEnd = LADX ? LADU : 0, ladS = LADX ? lad0 : 0; INFB = null; INFV = null; LADU = 99; LADX = 0; LADCAP = 6;\n' +
  '    AE = null;', 'ALTER EGO vid bonusslut');
// spelet: gubbarna, dörrarna och panelen (src/alter-ego.js), inkopplat i bonusflödet
var AE_JS = fs.readFileSync(path.join(__dirname, '..', 'src', 'alter-ego.js'), 'utf8');
rep('  async function runFreeSpins(', AE_JS + '  async function runFreeSpins(', 'runFreeSpins');
rep('    if (!document.body.classList.contains(\'fs\')) fsOn();\n', '    if (!document.body.classList.contains(\'fs\')) fsOn();\n    if (maniac && M.TIME.alterEgo) aeInit();\n', 'aeInit');
rep('      await spinReels(res, true);\n      // brädet syns en stund innan vinsterna visas', '      if (res.aeL0) aeSpinStart(res);\n      await spinReels(res, true);\n      if (res.aeL0) aeLanded(res);\n      // brädet syns en stund innan vinsterna visas', 'ALTER EGO per frispinn');
// dörrarna syns när vinsten visas (symbolen ur lagret och LAYER-siffran på gubben)
rep("      markCells(st.removed);\n      state.phase = 'show'; hud();", "      markCells(st.removed);\n      if (st.doors) aeDoors(st.doors);\n      state.phase = 'show'; hud();", 'dörrarna i vinsten');
// gubbarna på brädet: rutan ritas med sitt stegs bild och ram (aeSwap, aeTile, aeMark), låsta gubbar står still när hjulen
// snurrar (aeDrawLocked), gubbarna i en vinst levlar i stället för att sprängas (aeLevel) och lavinen faller förbi dem (aeCells)
rep('  function drawCell(g, c, x, time, highlight) {\n    var y = c.y * cell;',
  '  // ALTER EGO: en gubbe ritas med sitt stegs bild och sin ram, och en dörr visar symbolen ur lagret (src/alter-ego.js)\n' +
  '  function drawCell(g, c, x, time, highlight) {\n' +
  '    var aeS = aeSwap(c, x);\n' +
  '    if (aeS) aeTile(g, c, x, highlight, aeS.k);\n' +
  '    try { drawCell0(g, c, x, time, highlight); } finally { aeUnswap(aeS); }\n' +
  '    if (aeS) aeMark(g, c, x, highlight, aeS.k);\n' +
  '  }\n' +
  '  function drawCell0(g, c, x, time, highlight) {\n    var y = c.y * cell;', 'gubbarna på brädet');
rep('          g.drawImage(blur ? blurs[s] : sprites[s], x, sy - cell * (stretch - 1) / 2, cell, cell * stretch);\n        }\n      } else {',
  '          g.drawImage(blur ? blurs[s] : sprites[s], x, sy - cell * (stretch - 1) / 2, cell, cell * stretch);\n        }\n        if (aeLockView) aeDrawLocked(g, r, x);\n      } else {', 'låsta gubbar under snurret');
// de låsta gubbarna ritas sist, så att det som faller förbi dem i lavinen går bakom
rep('        for (var i = 0; i < reel.cells.length; i++) drawCell(g, reel.cells[i], x, time, highlight);',
  '        for (var i = 0; i < reel.cells.length; i++) if (!(reel.cells[i].ae >= 2)) drawCell(g, reel.cells[i], x, time, highlight);\n' +
  '        for (var i2 = 0; i2 < reel.cells.length; i2++) if (reel.cells[i2].ae >= 2) drawCell(g, reel.cells[i2], x, time, highlight);', 'låsta gubbar överst');
rep('      popCells(st.removed);\n      if (LAVIN_LJUD) Sound.pop(winIdx);', '      popCells(st.gone || st.removed);\n      if (st.up) await aeLevel(st);\n      if (LAVIN_LJUD) Sound.pop(winIdx);', 'gubbarna levlar');
rep('      applyMoves(st.moves);\n', '      applyMoves(st.moves);\n      if (st.aeN) aeCells(st.aeN, st.aeDepth);\n', 'gubbarna i lavinen');
// TEST-menyn, fliken Nytt: en gratis superbonus
rep('  var TESTS = {\n', '  var TESTS = {\n    // ALTER EGO: en gratis superbonus (src/alter-ego.js, aeNew)\n    aeGo: function () { TESTS.maniac(); },\n', 'testknappen');
rep('  function nxNew() { return []; }', '  function nxNew() { return aeNew(); }', 'fliken Nytt');
rep('    var total = state.fs.total, wasManiac = state.fs.maniac, maxed = state.maxShown;', '    aeEnd();\n    var total = state.fs.total, wasManiac = state.fs.maniac, maxed = state.maxShown;', 'aeEnd');
// ALTER EGO-läget i TEST (src/alter-ego.js, aeTestOn): vanliga snurr spelas som frispinn i superbonusen, utan läge i
// köpmenyn och utan storvinst-rutan, och de låsta gubbarna står still när hjulen snurrar
rep('    aeGo: function () { TESTS.maniac(); },\n', '    aeGo: function () { TESTS.maniac(); },\n    aeMode: function () { aeTestToggle(); },\n', 'testknappen för läget');
rep("    var mode = typeof forced === 'function' || forceThrow || nxPick ? '' : state.mode || '', cost = spinCost(mode);",
  "    var mode = typeof forced === 'function' || forceThrow || nxPick || aeTestOn ? '' : state.mode || '', cost = spinCost(mode);", 'läget utan köpmenyns läge');
rep(': nxPick ? nxPickGame(hist) : M.playGame(rng, hist, mode || undefined);', ': nxPick ? nxPickGame(hist) : aeTestOn ? aeTestGame(hist) : M.playGame(rng, hist, mode || undefined);', 'läget i snurret');
rep('      await spinReels(res, false);\n      await presentSteps(res, false);', '      if (res.aeL0) aeSpinStart(res);\n      await spinReels(res, false);\n      if (res.aeL0) aeLanded(res);\n      await presentSteps(res, false);', 'läget när hjulen snurrar');
rep('      if (!fs && res.scatters < 3 && (state.winHold != null || state.roundWin + amount >= bet() * WINSHOW_X)) {', '      if (!fs && !res.aeL0 && res.scatters < 3 && (state.winHold != null || state.roundWin + amount >= bet() * WINSHOW_X)) {', 'läget utan storvinst (1)');
rep('    else if (res.scatters < 3 && win >= bet() * WINSHOW_MIN * modePrice(game && game.mode)) await winShow(', '    else if (res.scatters < 3 && !res.aeL0 && win >= bet() * WINSHOW_MIN * modePrice(game && game.mode)) await winShow(', 'läget utan storvinst (2)');
rep('    MODES: MODES,\n', '    MODES: MODES, aeTestSpin: aeTestSpin,\n', 'aeTestSpin i CTMath');
// bomberna på frispinnens hjul startar ingen bonus i läget, så hjulen väntar inte på dem
rep('        if (!state.slam && (bombAnt || tAnt) && idx > 0) {', '        if (!state.slam && !aeTestOn && (bombAnt || tAnt) && idx > 0) {', 'läget utan bombväntan');
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
