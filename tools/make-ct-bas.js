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
// WILD med multi (superbonusens hjul): som WILD, med multin under ordet
function wildX(t) {
  return svg('<rect x="50" y="70" width="380" height="340" rx="60" fill="#ffd21f" ' + OUT + '/>' +
    '<text x="240" y="230" text-anchor="middle" font-family="Impact, \'Arial Black\', sans-serif" font-size="118" fill="#15111f">WILD</text>' +
    '<text x="240" y="372" text-anchor="middle" font-family="Impact, \'Arial Black\', sans-serif" font-size="140" fill="#ff3b3b" ' + OUT + ' paint-order="stroke">' + t + '</text>');
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
  12: wildX('x2'), 13: wildX('x3'), 14: wildX('x5'),
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
// ALTER EGO med spridningen (2026-11-11, scratchpad sim-spr.js, köpt ALTER EGO genom CTMath.buyGame): 93,7, 89,5 och 89,3 %
// vid maniacScale 1,48 (4 000 köp var), alltså 1,565 för 96 %. Medianen cirka 300x på köpet för 500x, 28 % under 100x, de
// sämsta 10 % cirka 5x, cirka 22 steg upp och 27 spridningar per bonus, ALTER EGO (steg 5) i 83 % av bonusarna, ingen
// maxvinst på 12 000 köp. Snittet är detsamma som förut, så hela spelet och HUNT-lägena påverkas inte.
// (Dörrarna samma dag: 3,58.)
// Lagermodellen (2026-11-11, scratchpad sim-zon.js; gäller nu): grundspelet med gubbarna och lagerzonen, tre körningar
// (80 000, 80 000 och 150 000 snurr) gav sammanvägt 64,3 % ±1,6 ensamt vid scale 0,4243; Bonusspel var 287:e–297:e snurr,
// ALTER EGO cirka var 33 000:e (tidigare mätning). Superbonusen med lagerzonen gav 98,4 och 102,5 % vid maniacScale 4,723
// (2 500 köp var), alltså 4,516. Köpt Bonusspel 100,3 % ±3,2 (6 000 köp; samma matte som förut, där den gav cirka 96,5 %).
// Grundspelet höjt x1,058 till cirka 68 % och bonusarna sänkta lika mycket, så att de är som förut och hela spelet hamnar
// nära 96,3 % (grundspelet 68 % + Bonusspel 26,9 % + ALTER EGO 1,5 %). Osäkert: cirka ±2 %, för grundspelet har en lång
// svans; inte certifierat, och Stake kräver 96,0–96,7 %.
// Superbonusen med fyra hörn och väggen (2026-11-11, scratchpad sim-horn.js, köpt ALTER EGO): 99,9, 89,9 och 96,7 % vid
// maniacScale 4,823 (2 500 köp var), alltså 4,85 för 96 %. Medianen cirka 153x på köpet för 500x, de sämsta 10 % cirka
// 12x, 40 % under 100x, finalen står för cirka hälften, bästa hörnet når LAYER 1–5 i cirka 6, 12, 38, 16 och 27 % av
// bonusarna (27 % ALTER EGO), maxvinsten 4 gånger på 7 500 köp. Snittet är detsamma som förut, så hela spelet och HUNT-
// lägena påverkas inte.
// Med INFINITY efter LAYER 5 (tal på 12 % av rutorna): 116,7, 121,7 och 110,2 % vid 4,85 (2 500 köp var), alltså cirka
// 3,98 för 96 %. INFINITY kommer i cirka 29 % av bonusarna och står för 10–28 % av vinsten (svänger mycket: x500 och
// x1000 är sällsynta); medianen cirka 135x, maxvinsten cirka 1 på 600 köp.
// Gubbarna och spärren (2026-11-11, scratchpad sim-sparr.js, köpt ALTER EGO): 95,9, 94,6 och 94,8 % vid maniacScale 2,87
// (2 500 köp var), alltså 2,90. Spärren (alla fyra på LAYER 4) släpper i cirka 12 % av bonusarna (på LAYER 3 skulle den
// släppa i 34 %), oftast sent (median frispinn 12). Medianen cirka 230x på köpet för 500x, de sämsta 10 % cirka 66x, 20 %
// under 100x, finalen står för drygt hälften och INFINITY för 5–11 %.
// Mattespecen (2026-11-11, scratchpad sim-hel.js och sim-lan.js, två omgångar): grundspelet utan lager gav ensamt 68,28 %
// vid scale 0,446 (14 M snurr sammanlagt; Bonusspel var 283:e snurr, ALTER EGO var 34 000:e), köpt Bonusspel 95,8 % vid
// fsScale × scale 1,556 (180 000 köp) och köpt ALTER EGO cirka 96,5 % vid maniacScale × scale 0,2399 (130 000 köp). Nu:
// grundspelet x0,9922 (cirka 67,7 %), bonusarna så att köpen blir 96,3 %, hela spelet cirka 96,3 % (grundspelet 67,7 % +
// Bonusspel 27,2 % + ALTER EGO 1,4 %). Bonusarna svänger mycket (±0,8 % per 100 000 köp). Inte certifierat.
// Pontus 2026-11-11: "96 ska vi uppnå" (inte 96,3). Alla körningar sammanslagna (scratchpad sim-hel.js; 20 M snurr,
// 280 000 köpta Bonusspel, 100 000 köpta ALTER EGO, räknat per skalenhet): grundsnurret 1,5359 × scale per snurr,
// Bonusspel var 282:a snurr, ALTER EGO var 35 000:e, Bonusspel 49,26 × scale × fsScale per köp, ALTER EGO 2 007 × scale ×
// maniacScale per köp. För 96,0 %: köpen 76,8x och 480x, grundspelet 67,4 % + Bonusspel 27,2 % + ALTER EGO 1,4 %.
var CAL = { scale: 0.4388, fsScale: 3.553, maniacScale: 0.5448 };
rep('    1: [1, 1, 1, 1, 1, 2],', '    1: [1, 1, 1, 1, 1, 1, 0],', 'bomberna i grundspelet');
// HUNT-lägena i köpmenyn: två bomber på hjul 1–6 och ingen på hjul 7, så att Bonusspelet kommer ungefär var 43:e snurr
// (C&T: var 39:e). Med lagermodellen (2026-11-11, 80 000 snurr, grundspelet räknat om till scale 0,4489): grundspelet
// 0,708x per snurr, Bonusspel 2,34 % och ALTER EGO 0,039 % av snurren. BONUS HUNT ger då cirka 2,70x per snurr och ALTER
// EGO HUNT (varje bonus blir ALTER EGO) cirka 12,10x, så priserna 2,80x och 12,55x ger cirka 96,3 och 96,4 % (±2 %).
// (Förut, utan lager: 2,85x och 12,75x.)
// Mattespecen (2026-11-11, 2,8 M snurr per läge, grundspelet utan lager, räknat om till scale 0,4425): grundspelet
// 0,730x per snurr, Bonusspel 2,36 % och ALTER EGO 0,038 % av snurren i BONUS HUNT (cirka 2,73x per snurr), bonus 2,38 %
// av snurren i ALTER EGO HUNT (cirka 12,20x). 2,80x och 12,55x gav då cirka 97,5 och 97,2 % (över Stakes 96,7 %), så
// priserna var 2,83x och 12,65x (cirka 96,5 och 96,4 %). Med 96,0 % som mål (scale 0,4388, 4,4 M snurr per läge):
// BONUS HUNT cirka 2,706x per snurr, ALTER EGO HUNT cirka 12,17x, så 2,81x (96,3 %; 2,82x skulle ge 95,96 %, under
// Stakes gräns) och 12,67x (96,05 %).
rep('  HUNT_BLOCKS[1] = [2, 2, 2, 2, 2, 3];', '  HUNT_BLOCKS[1] = [2, 2, 2, 2, 2, 2, 0];', 'bomberna i HUNT-lägena');
rep("    hunt: { price: 3, strips: 'hunt' },\n    inf: { price: 14, strips: 'hunt', inf: true },", "    hunt: { price: 2.81, strips: 'hunt' },\n    inf: { price: 12.67, strips: 'hunt', inf: true },", 'HUNT-lägenas priser');
rep('var MODE_RTP = { hunt: 96.6, inf: 95.8, lay3: 96.5 };', 'var MODE_RTP = { hunt: 96.3, inf: 96.0, lay3: 96.5 };', 'HUNT-lägenas återbetalning');
// spelets namn (Pontus 2026-11-11: SPLIT PERSONALITY, "Ja, byt namn"; superbonusen heter ALTER EGO kvar): fliken och
// loggans text (loggan är C&T:s bild, som är bortplockad, så texten syns bara utan bilder och för skärmläsare)
rep("document.title = 'C&T Maniac';", "document.title = 'SPLIT PERSONALITY';", 'fliktiteln');
rep('<span class="l-c">C</span><span class="l-amp">&amp;</span><span class="l-t">T</span><span class="l-m">MANIAC</span>',
  '<span class="l-c">SPLIT</span><span class="l-m">PERSONALITY</span>', 'loggans text', true);
rep('aria-label="C&amp;T Maniac"', 'aria-label="SPLIT PERSONALITY"', 'loggans namn');
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
// ---- ALTER EGO: lagermodellen (Pontus 2026-11-11: "Bygg så ser vi om jag gillar det"), i grundspelet och i
// superbonusen (byggd på C&T:s INFINITY-bonus). Varje omgång har sin egen vägg med LAYER 1–5 (Stake: inget följer med
// mellan omgångar), lavinerna lägger in sina bräden som nya lager, Killen (2), Katten (3) och Växten (4) i en vinst levlar
// och låses, och rutorna runt en låst gubbe är en lagerzon där lagren fyller luckor i vinster. Spelmotorns del ligger i
// src/alter-ego-motor.js, spelets i src/alter-ego.js. (Förut, samma dag: steg som styrde LAYER 1–5, lager som revs av,
// dörrar och spridning; alla ersatta.)
var AE_MOTOR = fs.readFileSync(path.join(__dirname, '..', 'src', 'alter-ego-motor.js'), 'utf8');
rep('var INFB = null, INFV = null, LADU = 99, LADC = 0, LADX = 0, LADCAP = 6;',
  'var INFB = null, INFV = null, LADU = 99, LADC = 0, LADX = 0, LADCAP = 6;\n' +
  '  // ALTER EGO: C&T:s lager är avstängda (tools/make-ct-bas.js, NOLAYER). Vinsterna når aldrig förra snurret, C&T:s lager\n' +
  '  // eller INFINITY (minCur 99), inga lagerkast, ingen kassett vid bonusstart, ingen INFINITY och ingen stege. Multin\n' +
  '  // står på x1 (ALTER EGO-gubbarna i src/alter-ego-motor.js ger ingen multi).\n' +
  '  TIME.minCur = 99; TIME.layerTedP = 0; TIME.layerCarlaP = 0; TIME.infVals = null; TIME.fsLad = false;\n' +
  '  TIME.fsPrefill = false; TIME.maniacPrefill = false; TIME.fsLayersDraw = null; TIME.maniacLayersDraw = null;\n' +
  '  TIME.fsStartDraw = null; TIME.maniacStartDraw = null; TIME.fsStart = 1; TIME.maniacStart = 1;\n' +
  '  TIME.alterEgo = true;\n' +
  '  // mattespecen: maxvinst 25 000x insatsen per omgång (förut 20 000x)\n' +
  '  TIME.maxX = 25000;\n' +
  '  // 7x7 (prototyp, inte certifierat): vinsterna skalade så att spelet och köpen hamnar nära 96 % (tools/make-ct-bas.js, CAL)\n' +
  '  TIME.scale = ' + CAL.scale + '; TIME.fsScale = ' + CAL.fsScale + '; TIME.maniacScale = ' + CAL.maniacScale + ';\n' +
  AE_MOTOR, 'ALTER EGO i spelmotorn');
// ALTER EGO-runda (aeOn: grundspelets snurr med opts.ae, ett frispinn i superbonusen, eller TEST-läget): de låsta gubbarna
// landar på sin plats, vinsterna räknas med lagerzonen, gubbarna levlar i stället för att sprängas, lavinen faller förbi
// de låsta och brädet läggs in som nytt LAYER 1
rep('    var startGrid = grid;\n    for (;;) {',
  '    // ALTER EGO: aeL0 = gubbarnas steg när brädet landar, aePeek0 = LAYER 1 då (syns i zonen)\n' +
  '    var aeOn = !!(AE && (opts.ae || (opts.fs && layers))), aeL0 = null, aePeek0 = null;\n' +
  '    if (aeOn) { aeOverlay(grid); aeL0 = copyGrid(AE.L); aePeek0 = copyGrid(AE.stack[0]); }\n' +
  '    // superbonusens hörn: aeC0 = hörnens LAYER när brädet landar; finalen: placerade gubbar (opts.place)\n' +
  '    if (opts.place) opts.place.forEach(function (p) { grid[p.r][p.y] = p.sym; });\n' +
  '    var aecOn = !!(AEC && opts.fs && !opts.aeFinal), aeC0 = aecOn ? AEC.lev.slice() : null, aeOpen0 = aecOn ? AEC.open : false;\n' +
  '    if (aecOn) aecPlaceIcons(grid);\n' +
  '    // superbonusen (mattespecen): frispinnet landar från FRAMÅT (rutorna som lånades fylls ovanifrån), finalens lager från\n' +
  '    // lagrets bräde; aecV = INFINITY-talen på rutorna. Sedan dras nästa frispinns bräde (FRAMÅT), om det finns ett.\n' +
  '    var aecLd = null, aecV = null, aecV0 = null, aecNext0 = null;\n' +
  '    if (aecOn || opts.aecBoard) {\n' +
  '      aecLd = aecLanding(rng, strips, grid, stops, aecOn ? AEC.next : opts.aecBoard, aecOn ? aecFixed() : aecFixedFrom(opts.place || []), aecOn ? null : opts.place);\n' +
  '      grid = aecLd.grid; stops = aecLd.stops; aecV = aecLd.v; aecV0 = copyGrid(aecV);\n' +
  '      if (opts.aecBoard) opts.aeInf = aecV;\n' +
  '    }\n' +
  '    if (aecOn) { AEC.upSpin = [false, false, false, false]; AEC.next = opts.aecNext ? aecBoard(rng) : null; aecNext0 = aecCopyB(AEC.next); }\n' +
  '    var startGrid = aecLd ? aecLd.start : grid;\n    for (;;) {', 'ALTER EGO när brädet landar');
rep('      if (opts.payScale && opts.payScale !== 1) { ev.wins.forEach(function (wn) { wn.x *= opts.payScale; }); ev.x *= opts.payScale; }',
  '      if (opts.payScale && opts.payScale !== 1) { ev.wins.forEach(function (wn) { wn.x *= opts.payScale; }); ev.x *= opts.payScale; }\n' +
  '      // superbonusens hörn: vinsten får det högsta LAYER-numret bland hörnen den går genom; INFINITY: talen i rutorna\n' +
  '      if (aecOn) aecWins(ev);\n' +
  '      var aeInfUsed = opts.aeInf ? aecInfWins(ev, opts.aeInf) : null;', 'hörnens multi');
rep('      var ev = layers ? evaluateDeep(grid, layers) : ghost ? evaluateTime(grid, ghost, noTm) : evaluate(grid);',
  '      var ev = aeOn ? aeEvaluate(grid) : aecOn ? aecEval(grid, aecV) : opts.aeFinal ? aecEvaluate(grid, layers) : layers ? evaluateDeep(grid, layers) : ghost ? evaluateTime(grid, ghost, noTm) : evaluate(grid);', 'ALTER EGO-vinsterna');
rep("      var t = tumble(strips, grid, stops, removed);\n      steps.push({ type: 'win', grid: grid, wins: ev.wins, baseX: ev.x, mult: mult, x: ev.x * mult, removed: removed, moves: t.moves, next: t.grid, ghostUsed: ghostUsed });",
  '      // ALTER EGO: removed är vinstens rutor på brädet (de lyser), gone det som sprängs, up gubbarna som levlar, lused\n' +
  '      // symbolerna ur lagren i vinsterna, aeN gubbarnas steg efter lavinen (steget grid blir nytt LAYER 1)\n' +
  '      var aeS = aeOn ? aeStep(grid, ev.wins, removed) : null;\n' +
  '      var aecFix = aecOn ? aecFixed() : opts.place ? aecFixedFrom(opts.place) : null, aecGoneM = aecFix ? aecGone(removed, aecFix) : null;\n' +
  '      var t = aeS ? aeTumble(strips, grid, stops, aeS.gone) : aecFix ? aeTumble(strips, grid, stops, aecGoneM, aecFix) : tumble(strips, grid, stops, removed);\n' +
  "      steps.push({ type: 'win', grid: grid, wins: ev.wins, baseX: ev.x, mult: mult, x: ev.x * mult, removed: removed, moves: t.moves, next: t.grid, ghostUsed: ghostUsed });\n" +
  '      if (aeS) {\n' +
  '        var aeSt = steps[steps.length - 1];\n' +
  '        aeSt.gone = aeS.gone; aeSt.up = aeS.up; aeSt.lused = aeS.lused; aeSt.aeN = copyGrid(AE.L); aeSt.aePeek = copyGrid(AE.stack[0]);\n' +
  '      }\n' +
  '      // superbonusens hörn: aeCup = hörnen som levlade, aeC = hörnens LAYER efter steget\n' +
  '      if (aecGoneM) steps[steps.length - 1].gone = aecGoneM;\n' +
  '      if (aecOn) {\n' +
  '        var aecSt = steps[steps.length - 1], aecL = aecLevel(ev);\n' +
  '        aecSt.aeCup = aecL.up; aecSt.aeC = AEC.lev.slice(); aecSt.aeOpen = AEC.open; aecSt.aeHit = AEC.hit ? AEC.hit.slice() : [0, 0, 0, 0];\n' +
  '        // spärren släppte: gubbarna går in i mitten efter lavinen (brädet t.grid ändras)\n' +
  '        if (aecL.opened) { aecSt.aeOpened = true; aecSt.aecPlace = aecPlaceIcons(t.grid); aecSt.aecPlace.forEach(function (p) { aecV[p.r][p.y] = 0; }); }\n' +
  '        // talen och de lånade rutorna som vinsterna använde försvinner (aecUse)\n' +
  '        aecSt.aecUse = aecUse(ev, aecV);\n' +
  '      }\n' +
  '      if (aeInfUsed) steps[steps.length - 1].aeInfUsed = aeInfUsed;', 'ALTER EGO i lavinen');
rep('    // guldbomben: med 4 eller fler bomber när hjulen landar', '    // ALTER EGO: frispinnets slutbräde blir nytt LAYER 1 (aecPush)\n    if (aecOn) aecPush(grid, aecV);\n    // guldbomben: med 4 eller fler bomber när hjulen landar', 'frispinnets bräde blir LAYER 1');
rep('    return { gold: gold, startGrid: startGrid, steps: steps,', '    return { aeL0: aeL0, aePeek0: aePeek0, aeC0: aeC0, aeOpen0: aeOpen0, aecV0: aecV0, aecNext0: aecNext0, aecLand: aecLd ? aecLd.land : null, gold: gold, startGrid: startGrid, steps: steps,', 'ALTER EGO i rundans resultat');
// grundspelets snurr (också i HUNT-lägena) med omgångens egen vägg i stället för C&T:s vägg från förra omgången (Stake:
// inget får följa med mellan omgångar)
rep('    var base = thr ? throwRound(rng, hist, thr) : playRound(rng, baseOpts({ ghost: hist[0] }));', '    var base = thr ? throwRound(rng, hist, thr) : aeBaseRound(rng);', 'grundspelets snurr');
rep('      else base = playRound(rng, baseOpts({ ghost: hist[0], strips: strips }));', '      else base = aeBaseRound(rng, { strips: strips });', 'HUNT-lägenas snurr');
rep('LADCAP = INFB ? (TIME.infAt || 6) : depth; LADU = LADX ? Math.max(1, nL) : 99; LADC = 0; var lad0 = LADU;',
  'LADCAP = INFB ? (TIME.infAt || 6) : depth; LADU = LADX ? Math.max(1, nL) : 99; LADC = 0; var lad0 = LADU;\n' +
  '    // superbonusen: de fyra hörnen börjar på LAYER 1 (gubbarna och lagerzonen från grundspelet gäller inte här)\n' +
  '    AE = null; AEC = maniac && TIME.alterEgo ? aecStart(rng) : null;', 'ALTER EGO vid bonusstart');
// superbonusens frispinn: egna hjul (fler wilds), landar från FRAMÅT (samma stopp) och drar nästa bräde när det finns
// ett nästa frispinn (aecNext)
rep('      var f = playRound(rng, { fs: true, fsMult: mult, layers: layers, depth: depth, payScale: scale });',
  '      var f = playRound(rng, { fs: true, fsMult: mult, layers: layers, depth: depth, payScale: scale, strips: AEC ? STRIPS.aec : undefined, stops: AEC && AEC.next ? AEC.next.stops : undefined, aecNext: !!AEC && left > 0 });', 'superbonusens frispinn');
rep('var ladEnd = LADX ? LADU : 0, ladS = LADX ? lad0 : 0; INFB = null; INFV = null; LADU = 99; LADX = 0; LADCAP = 6;',
  '// ALTER EGO-finalen efter sista frispinnet: väggen rivs (aecFinal), lager för lager\n' +
  '    if (AEC) aecFinal(rng, scale, x0, x).forEach(function (fin) { spins.push(fin); x += fin.x; });\n' +
  '    var ladEnd = LADX ? LADU : 0, ladS = LADX ? lad0 : 0; INFB = null; INFV = null; LADU = 99; LADX = 0; LADCAP = 6;\n' +
  '    var aeLevEnd = AEC ? AEC.lev.slice() : null; AE = null; AEC = null;', 'ALTER EGO vid bonusslut');
rep('return { lad: ladEnd, ladStart: ladS, maniac: maniac,', 'return { lad: ladEnd, ladStart: ladS, aeLev: aeLevEnd, maniac: maniac,', 'hörnen i bonusens resultat');
rep('    MODES: MODES,\n', '    MODES: MODES, aeTestSpin: aeTestSpin, aeBaseRound: aeBaseRound, AEC_SYM: AEC_SYM, AEC_HOME: AEC_HOME, AEC_MID: AEC_MID, AEC_LOCK: AEC_LOCK, AEC_HITS: AEC_HITS,\n', 'ALTER EGO i CTMath');
// spelet: gubbarna, lagerzonen och panelen (src/alter-ego.js), inkopplat i grundspelet och bonusflödet
var AE_JS = fs.readFileSync(path.join(__dirname, '..', 'src', 'alter-ego.js'), 'utf8');
rep('  async function runFreeSpins(', AE_JS + '  async function runFreeSpins(', 'runFreeSpins');
rep('    if (!document.body.classList.contains(\'fs\')) fsOn();\n', '    if (!document.body.classList.contains(\'fs\')) fsOn();\n    if (maniac && M.TIME.alterEgo) aecInit();\n', 'hörnen vid bonusstart');
rep('      await spinReels(res, true);\n      // brädet syns en stund innan vinsterna visas', '      if (res.aeC0 || res.aeFinal) await aecSpinStart(res);\n      if (res.aeL0) aeSpinStart(res);\n      await spinReels(res, true);\n      if (res.aeL0) aeLanded(res);\n      if (res.aeC0 || res.aeFinal) aecLanded(res);\n      if (res.aecLand) await aecFill(res);\n      // brädet syns en stund innan vinsterna visas', 'ALTER EGO per frispinn');
// finalen: lagren räknas inte som frispinn och ger inga nya frispinn
rep('      state.fs.left--; renderMeter(); hud(); clearChips();', '      if (!plan.spins[si].aeFinal) state.fs.left--; renderMeter(); hud(); clearChips();', 'finalens lager räknas inte som frispinn');
rep('      if (res.scatters >= 3) {', '      if (res.scatters >= 3 && !res.aeFinal) {', 'finalen utan nya frispinn');
// hörnen levlar efter lavinsteget, och de ritas ovanpå brädet
rep('      if (fs) await ladShow(st);\n', '      if (fs) await ladShow(st);\n      if (fs && (st.aeC || st.aeInfUsed)) await aecStep(st);\n', 'hörnen levlar');
rep('    if (shade) { g.fillStyle = shade; g.fillRect(0, 0, boardPx, boardPx); }', '    if (aecView) aecDraw(g);\n    if (shade) { g.fillStyle = shade; g.fillRect(0, 0, boardPx, boardPx); }', 'hörnen på brädet');
rep('      await spinReels(res, false);\n      await presentSteps(res, false);', '      if (res.aeL0) aeSpinStart(res);\n      await spinReels(res, false);\n      if (res.aeL0) aeLanded(res);\n      await presentSteps(res, false);', 'ALTER EGO i grundspelet');
// grundspelet: när omgången är slut syns inga låsta gubbar eller zoner (inget får se ut att följa med till nästa omgång)
rep('    if (T().minRound && clock - round0 < T().minRound) await wait(T().minRound - (clock - round0));\n    endRound(res);',
  '    if (T().minRound && clock - round0 < T().minRound) await wait(T().minRound - (clock - round0));\n    aeRoundEnd();\n    endRound(res);', 'ALTER EGO när omgången är slut');
// gubbarna på brädet: rutan ritas med sitt stegs bild och ram (aeSwap, aeTile, aeMark), zonen och LAYER 1 i hörnet
// (aeZoneBg, aePeek), låsta gubbar står still när hjulen snurrar (aeDrawLocked), symbolerna ur lagren syns i vinsten
// (aeLayerWin), gubbarna i en vinst levlar i stället för att sprängas (aeLevel) och lavinen faller förbi dem (aeCells)
rep('  function drawCell(g, c, x, time, highlight) {\n    var y = c.y * cell;',
  '  // ALTER EGO: en gubbe ritas med sitt stegs bild och sin ram, och en ruta i lagerzonen visar zonen och LAYER 1 (src/alter-ego.js)\n' +
  '  function drawCell(g, c, x, time, highlight) {\n' +
  '    if (c.sym < 0) { if (aecView) aecHole(g, c, x); return; }   // superbonusen: rutan lånades framåt (tom tills den fylls)\n' +
  '    var aeS = aeSwap(c, x), aeZv = aeZoneAt(c, x);\n' +
  '    if (aeS) aeTile(g, c, x, highlight, aeS.k); else if (aeZv) aeZoneBg(g, c, x, highlight, aeZv);\n' +
  '    try { drawCell0(g, c, x, time, highlight); } finally { aeUnswap(aeS); }\n' +
  '    if (aeS) aeMark(g, c, x, highlight, aeS.k);\n' +
  '    if (aeZv) aePeek(g, c, x, highlight, aeZv);\n' +
  '    if (c.aecDoor) aecDorr(g, c, x);   // superbonusen: en lånad symbol i vinsten\n' +
  '  }\n' +
  '  function drawCell0(g, c, x, time, highlight) {\n    var y = c.y * cell;', 'gubbarna på brädet');
rep('          g.drawImage(blur ? blurs[s] : sprites[s], x, sy - cell * (stretch - 1) / 2, cell, cell * stretch);\n        }\n      } else {',
  '          if (s >= 0) g.drawImage(blur ? blurs[s] : sprites[s], x, sy - cell * (stretch - 1) / 2, cell, cell * stretch);   // ALTER EGO: -1 = rutan lånades framåt (tom)\n        }\n        if (aeLockView) aeDrawLocked(g, r, x);\n        if (aecSpin) aecDrawLocked(g, r, x);\n      } else {', 'låsta gubbar under snurret');
// de låsta gubbarna ritas sist, så att det som faller förbi dem i lavinen går bakom
rep('        for (var i = 0; i < reel.cells.length; i++) drawCell(g, reel.cells[i], x, time, highlight);',
  '        for (var i = 0; i < reel.cells.length; i++) if (!(reel.cells[i].ae >= 2)) drawCell(g, reel.cells[i], x, time, highlight);\n' +
  '        for (var i2 = 0; i2 < reel.cells.length; i2++) if (reel.cells[i2].ae >= 2) drawCell(g, reel.cells[i2], x, time, highlight);', 'låsta gubbar överst');
rep("      markCells(st.removed);\n      state.phase = 'show'; hud();", "      markCells(st.removed);\n      if (st.lused) aeLayerWin(st);\n      if (fs) aecWinShow(st);\n      state.phase = 'show'; hud();", 'lagren i vinsten');
rep('      popCells(st.removed);\n      if (LAVIN_LJUD) Sound.pop(winIdx);','      popCells(st.gone || st.removed);\n      if (st.up) await aeLevel(st);\n      if (LAVIN_LJUD) Sound.pop(winIdx);', 'gubbarna levlar');
rep('      applyMoves(st.moves);\n', '      applyMoves(st.moves);\n      if (st.aeN) aeCells(st.aeN, st.aePeek);\n      if (fs && aecView) aecIconsSet(st);\n', 'gubbarna i lavinen');
// TEST-menyn, fliken Nytt: ALTER EGO-läget och en gratis superbonus
rep('  var TESTS = {\n', '  var TESTS = {\n    // ALTER EGO (src/alter-ego.js, aeNew)\n    aeGo: function () { TESTS.maniac(); },\n    aeMode: function () { aeTestToggle(); },\n', 'testknapparna');
rep('  function nxNew() { return []; }', '  function nxNew() { return aeNew(); }', 'fliken Nytt');
rep('    var total = state.fs.total, wasManiac = state.fs.maniac, maxed = state.maxShown;', '    aeEnd(); aecEnd();\n    var total = state.fs.total, wasManiac = state.fs.maniac, maxed = state.maxShown;', 'aeEnd');
// ALTER EGO-läget i TEST (src/alter-ego.js, aeTestOn): vanliga snurr spelas som frispinn i superbonusen, utan läge i
// köpmenyn, utan storvinst-rutan och utan bombväntan (bomberna startar ingen bonus där)
rep("    var mode = typeof forced === 'function' || forceThrow || nxPick ? '' : state.mode || '', cost = spinCost(mode);",
  "    var mode = typeof forced === 'function' || forceThrow || nxPick || aeTestOn ? '' : state.mode || '', cost = spinCost(mode);", 'läget utan köpmenyns läge');
rep(': nxPick ? nxPickGame(hist) : M.playGame(rng, hist, mode || undefined);', ': nxPick ? nxPickGame(hist) : aeTestOn ? aeTestGame(hist) : M.playGame(rng, hist, mode || undefined);', 'läget i snurret');
rep('      if (!fs && res.scatters < 3 && (state.winHold != null || state.roundWin + amount >= bet() * WINSHOW_X)) {', '      if (!fs && !aeTestOn && res.scatters < 3 && (state.winHold != null || state.roundWin + amount >= bet() * WINSHOW_X)) {', 'läget utan storvinst (1)');
rep('    else if (res.scatters < 3 && win >= bet() * WINSHOW_MIN * modePrice(game && game.mode)) await winShow(', '    else if (res.scatters < 3 && !aeTestOn && win >= bet() * WINSHOW_MIN * modePrice(game && game.mode)) await winShow(', 'läget utan storvinst (2)');
rep('        if (!state.slam && (bombAnt || tAnt) && idx > 0) {', '        if (!state.slam && !aeTestOn && (bombAnt || tAnt) && idx > 0) {', 'läget utan bombväntan');
rep("<h2 class=\"ov-title\">' + (maniac ? 'INFINITY' : txl('BONUSSPEL'))", "<h2 class=\"ov-title\">' + (maniac ? 'ALTER EGO' : txl('BONUSSPEL'))", 'bonusens rubrik', true);
rep("var INF_LADDER = '<p><b>3 lagervinster</b> öppnar nästa LAYER. Sist öppnas <b class=\"inf-word\">INFINITY</b></p>';",
  "var INF_LADDER = '<p><b>3 vinster</b> ger gubben nästa LAYER. <b>Alla fyra på LAYER 4 = ALTER EGO</b></p>';", 'bonusens regel');
// superbonusens hjul snurrar med sina egna remsor (fler wilds)
rep('    var strips = fs ? M.STRIPS.fs : md && md.strips ? M.STRIPS[md.strips] : REN_STRIPS;', '    var strips = fs ? (aecView && M.STRIPS.aec ? M.STRIPS.aec : M.STRIPS.fs) : md && md.strips ? M.STRIPS[md.strips] : REN_STRIPS;', 'superbonusens remsor');

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
h = h.replace(/<title>[^<]*<\/title>/, '<title>SPLIT PERSONALITY</title>');
// egna sparnycklar (C&T:s sparade 6x6-väggar och omgångar får inte läsas av 7x7-brädet)
var nKey = rep("'ctm.", "'alterego7.", 'sparnycklarna', true);
console.log('sparnycklar bytta: ' + nKey);

var out = path.join(__dirname, '..', 'ct-bas.html');
fs.writeFileSync(out, h);
console.log('ct-bas.html: ' + Math.round(h.length / 1024) + ' kB, bilder kvar ' + count.kvar + ', bortplockade ' + count.bort);
