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
  count.bort++; return '__D[' + i + ']="' + BLANK + '"';
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
h = h.replace(/<title>[^<]*<\/title>/, '<title>ALTER EGO</title>');
// egna sparnycklar (C&T:s sparade 6x6-väggar och omgångar får inte läsas av 7x7-brädet)
var nKey = rep("'ctm.", "'alterego7.", 'sparnycklarna', true);
console.log('sparnycklar bytta: ' + nKey);

var out = path.join(__dirname, '..', 'ct-bas.html');
fs.writeFileSync(out, h);
console.log('ct-bas.html: ' + Math.round(h.length / 1024) + ' kB, bilder kvar ' + count.kvar + ', bortplockade ' + count.bort);
