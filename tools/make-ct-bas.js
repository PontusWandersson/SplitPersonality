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
  3: svg('<path d="M240 40L430 240L240 440L50 240Z" fill="#ff6f91" ' + OUT + '/>'),
  4: svg('<path d="M240 50L440 420H40Z" fill="#a78bfa" ' + OUT + '/>'),
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
// Bonusspelet var 72:a snurr). Då kommer Bonusspelet ungefär var 245:e snurr. Skalorna: hela spelet cirka 96 % (grundspelet
// cirka 62 %, bonusarna cirka 34 %), köpt Bonusspel och köpt ALTER EGO cirka 96 %. Bonusarnas vinster är scale × fsScale
// och scale × maniacScale.
var CAL = { scale: 0.10713, fsScale: 0.08228, maniacScale: 0.5195 };
rep('    1: [1, 1, 1, 1, 1, 2],', '    1: [1, 1, 1, 1, 1, 1, 0],', 'bomberna i grundspelet');
rep("document.title = 'C&T Maniac';", "document.title = 'ALTER EGO';", 'fliktiteln');
// summeringen efter bonusen spelar en ton per diagonal; 7x7 har 13 diagonaler (6x6 hade 11), annars blir tonen NaN och bonusen fastnar
rep('var BC_PENTA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];', 'var BC_PENTA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24, 27, 29];', 'summeringens toner');
// storvinst-rutans bakgrund och nivåtitlar är konst (bortplockad): dölj de tomma bilderna, så att ingen trasig bildram syns
rep('</head>', '<style>img.ws-bg[src=""], img.ws-ti[src=""], img.ws-bg:not([src]), img.ws-ti:not([src]) { visibility: hidden; }</style></head>', 'storvinstens tomma bilder');
rep("var kick = state.fs.maniac ? txl('Infinity klart') : txl('Bonusspel klart');", "var kick = state.fs.maniac ? txl('ALTER EGO klart') : txl('Bonusspel klart');", 'summeringens rubrik');
rep("'Infinity klart': 'Infinity complete',", "'ALTER EGO klart': 'ALTER EGO complete',", 'summeringens rubrik på engelska');
// ---- ALTER EGO (superbonusen), byggd på C&T:s INFINITY-bonus. Spelmotorn: Killen (2), Katten (3) och Växten (4) har
// var sitt steg 1–5. Steget = hur många lager karaktärens vinster når (steg 5: alla lager och INFINITY). 5 karaktärssymboler i vinster (brädet och lagren)
// ger nästa steg. Andra symboler når bara LAYER 1. C&T:s gemensamma stege är avstängd i den bonusen.
rep('var INFB = null, INFV = null, LADU = 99, LADC = 0, LADX = 0, LADCAP = 6;',
  'var INFB = null, INFV = null, LADU = 99, LADC = 0, LADX = 0, LADCAP = 6;\n' +
  '  // ALTER EGO: AE = { s: steg, c: symboler mot nästa steg } för Killen, Katten och Växten (bara i superbonusen)\n' +
  '  TIME.alterEgo = true;\n' +
  '  // 7x7 (prototyp, inte certifierat): vinsterna skalade så att spelet och köpen hamnar nära 96 % (tools/make-ct-bas.js, CAL)\n' +
  '  TIME.scale = ' + CAL.scale + '; TIME.fsScale = ' + CAL.fsScale + '; TIME.maniacScale = ' + CAL.maniacScale + ';\n' +
  '  var AE_CH = { 2: 0, 3: 1, 4: 2 }, AE_NEED = 5, AE = null;\n' +
  '  function aeLim(s) { if (!AE) return LADU; var ci = AE_CH[s]; return ci == null ? 1 : AE.s[ci] >= 5 ? 99 : AE.s[ci]; }\n' +
  '  function aeInf(s) { if (!AE) return LADU >= (TIME.infAt || 6); var ci = AE_CH[s]; return ci != null && AE.s[ci] >= 5; }', 'AE i spelmotorn');
rep('for (var k = 0; k < Math.min(layers.length, LADU) && !hit.rows.length; k++)', 'for (var k = 0; k < Math.min(layers.length, aeLim(s)) && !hit.rows.length; k++)', 'lagrens djup per symbol');
rep('if (!hit.rows.length && INFB && LADU >= (TIME.infAt || 6)) for (var ib = 0;', 'if (!hit.rows.length && INFB && aeInf(s)) for (var ib = 0;', 'INFINITY per symbol');
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
  '      if (LADX && opts.fs && layers) {', 'stegen i playRound');
rep('LADCAP = INFB ? (TIME.infAt || 6) : depth; LADU = LADX ? Math.max(1, nL) : 99; LADC = 0; var lad0 = LADU;',
  'LADCAP = INFB ? (TIME.infAt || 6) : depth; LADU = LADX ? Math.max(1, nL) : 99; LADC = 0; var lad0 = LADU;\n' +
  '    AE = maniac && INFB && TIME.alterEgo ? { s: [1, 1, 1], c: [0, 0, 0] } : null;\n' +
  '    if (AE) { LADX = 0; LADU = 99; lad0 = LADU; }', 'AE vid bonusstart');
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
rep('      await spinReels(res, true);\n      // brädet syns en stund innan vinsterna visas', '      if (res.aeIn) { aeSprites(res.aeIn.s); aeRender(res.aeIn); }\n      await spinReels(res, true);\n      // brädet syns en stund innan vinsterna visas', 'aeRender per frispinn');
rep('      if (fs) await ladShow(st);\n', '      if (fs) await ladShow(st);\n      if (fs && st.ae) await aeShow(st);\n', 'aeShow');
rep('    var total = state.fs.total, wasManiac = state.fs.maniac, maxed = state.maxShown;', '    aeEnd();\n    var total = state.fs.total, wasManiac = state.fs.maniac, maxed = state.maxShown;', 'aeEnd');
rep("<h2 class=\"ov-title\">' + (maniac ? 'INFINITY' : txl('BONUSSPEL'))", "<h2 class=\"ov-title\">' + (maniac ? 'ALTER EGO' : txl('BONUSSPEL'))", 'bonusens rubrik', true);
rep("var INF_LADDER = '<p><b>3 lagervinster</b> öppnar nästa LAYER. Sist öppnas <b class=\"inf-word\">INFINITY</b></p>';",
  "var INF_LADDER = '<p><b>Killen, Katten och Växten</b> levlar var för sig: <b>5 karaktärer i vinster</b> ger nästa steg. Steget är hur många LAYER karaktären når. <b>Steg 5 = ALTER EGO</b> når <b class=\"inf-word\">INFINITY</b></p>';", 'bonusens regel');

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
