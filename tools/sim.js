#!/usr/bin/env node
/* Simulerar Lagerspelet och skriver en rapport.
 *
 *   node tools/sim.js --n 1000000 --seed 1
 *   node tools/sim.js --n 1000000 --set '{"scale":0.12,"fsScale":1.5}'
 *   node tools/sim.js --n 1000000 --cfg prov.json
 *
 * --n: antal betalda omgångar, --seed: startfrö, --workers: antal kärnor (standard: alla utom fyra),
 * --set / --cfg: ändrade inställningar (JSON), --mal: RTP-mål i procent (standard 96), --bas: grundspelets andel av RTP
 * (standard 0.65), --json: skriv resultatet som JSON också.
 */
'use strict';
var path = require('path');
var os = require('os');
var wt = require('worker_threads');
var M = require(path.join(__dirname, '..', 'src', 'math.js')).LagerMath;

var WIN_EDGES = [0, 1, 2, 5, 10, 20, 50, 100, 500, 1000, 5000, 10000];
var STEP_MAX = 40;

function newStats() {
  return {
    n: 0, sum: 0, sum2: 0, baseSum: 0, bonusSum: 0, hits: 0, hits1: 0, capped: 0, maxX: 0, guard: 0,
    winHist: new Array(WIN_EDGES.length + 1).fill(0),
    stepHist: new Array(STEP_MAX + 1).fill(0), stepsSum: 0, maxSteps: 0,
    lvHist: [0, 0, 0, 0], bursts: 0, burstSpins: 0, maxSize: 0,
    bonusN: 0, bonusWins: [], fsSpins: 0, fsSteps: 0, fsMaxSteps: 0, fsBursts: 0, retriggers: 0,
    fsLvBy: new Array(12).fill(0), fsLvN: new Array(12).fill(0),
    sizeBase: new Array(200).fill(0), sizeFs: new Array(200).fill(0), bonusSteps: 0, goldHist: new Array(7).fill(0),
    trigN: [0, 0, 0, 0, 0, 0]
  };
}

function winBucket(x) {
  if (x === 0) return 0;
  for (var i = 1; i < WIN_EDGES.length; i++) if (x < WIN_EDGES[i]) return i;
  return WIN_EDGES.length;
}

function runChunk(n, seed, cfg, preset) {
  if (preset) M.usePreset(preset);
  if (cfg) M.set(cfg);
  var rng = M.mulberry32(seed), st = newStats();
  M.setStats({ base: st.sizeBase, fs: st.sizeFs });
  for (var i = 0; i < n; i++) {
    var g = M.playGame(rng, false);
    var x = g.x;
    st.n++; st.sum += x; st.sum2 += x * x;
    st.baseSum += g.base.x; if (g.bonus) st.bonusSum += Math.min(g.bonus.x, M.CFG.maxX - g.base.x);
    if (x > 0) st.hits++;
    if (x >= 1) st.hits1++;
    if (g.capped) st.capped++;
    if (x > st.maxX) st.maxX = x;
    st.winHist[winBucket(x)]++;
    var b = g.base;
    st.stepHist[Math.min(b.steps, STEP_MAX)]++; st.stepsSum += b.steps; if (b.steps > st.maxSteps) st.maxSteps = b.steps;
    if (b.steps >= M.CFG.maxSteps) st.guard++;
    st.lvHist[b.maxLv]++; st.bursts += b.bursts; if (b.bursts) st.burstSpins++;
    if (b.maxSize > st.maxSize) st.maxSize = b.maxSize;
    if (g.bonus) {
      st.bonusN++; st.bonusWins.push(g.bonus.x); st.retriggers += g.bonus.retriggers;
      var lastB = g.bonus.spins.length ? g.bonus.spins[g.bonus.spins.length - 1].goldN || 0 : 0;
      st.goldHist[Math.min(lastB, 6)]++;
      st.trigN[Math.min(b.scatters, 5)]++;
      for (var s = 0; s < g.bonus.spins.length; s++) {
        var f = g.bonus.spins[s];
        st.fsSpins++; st.fsSteps += f.steps; st.fsBursts += f.bursts; st.bonusSteps += f.steps;
        st.fsLvBy[Math.min(s, 11)] += f.lvSum / M.CELLS; st.fsLvN[Math.min(s, 11)]++;
        if (f.steps > st.fsMaxSteps) st.fsMaxSteps = f.steps;
        if (f.steps >= M.CFG.maxSteps) st.guard++;
        if (f.maxSize > st.maxSize) st.maxSize = f.maxSize;
      }
    }
  }
  return st;
}

function merge(a, b) {
  for (var k in a) {
    if (Array.isArray(a[k])) {
      if (k === 'bonusWins') { for (var j = 0; j < b[k].length; j++) a[k].push(b[k][j]); }
      else for (var i = 0; i < a[k].length; i++) a[k][i] += b[k][i];
    } else if (k === 'maxX' || k === 'maxSteps' || k === 'fsMaxSteps' || k === 'maxSize') a[k] = Math.max(a[k], b[k]);
    else a[k] += b[k];
  }
  return a;
}

if (!wt.isMainThread) {
  var d = wt.workerData;
  wt.parentPort.postMessage(runChunk(d.n, d.seed, d.cfg, d.preset));
  return;
}

// ------------------------------------------------------------------ huvudtråden
function arg(name, def) {
  var i = process.argv.indexOf('--' + name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}
var N = parseInt(arg('n', '200000'), 10);
var SEED = parseInt(arg('seed', '1'), 10);
var WORKERS = parseInt(arg('workers', String(Math.max(1, os.cpus().length - 4))), 10);
var TARGET = parseFloat(arg('mal', '96')) / 100;
var BASESHARE = parseFloat(arg('bas', '0.65'));
var PRESET = arg('preset');
if (PRESET) { if (!M.PRESETS[PRESET]) { console.error('Okänd variant: ' + PRESET); process.exit(1); } M.usePreset(PRESET); }
var cfg = {};
if (arg('cfg')) Object.assign(cfg, JSON.parse(require('fs').readFileSync(arg('cfg'), 'utf8')));
if (arg('set')) Object.assign(cfg, JSON.parse(arg('set')));
M.set(cfg);

var t0 = Date.now(), per = Math.ceil(N / WORKERS), done = 0, total = newStats(), jobs = [];
for (var w = 0; w < WORKERS; w++) {
  var nn = Math.min(per, N - w * per);
  if (nn <= 0) break;
  jobs.push(new Promise(function (res, rej) {
    var wk = new wt.Worker(__filename, { workerData: { n: nn, seed: (SEED * 1000003 + w * 7919) >>> 0, cfg: cfg, preset: PRESET } });
    wk.on('message', res); wk.on('error', rej);
  }));
}
Promise.all(jobs).then(function (parts) {
  parts.forEach(function (p) { merge(total, p); });
  report(total, (Date.now() - t0) / 1000);
}).catch(function (e) { console.error(e); process.exit(1); });

function pct(a, b) { return (100 * a / b).toFixed(2) + ' %'; }
function oneIn(a, b) { return a ? '1 per ' + Math.round(b / a).toLocaleString('sv-SE') : 'aldrig'; }
function fx(x) { return x.toLocaleString('sv-SE', { maximumFractionDigits: 2 }) + 'x'; }
function quant(arr, q) { if (!arr.length) return 0; return arr[Math.min(arr.length - 1, Math.floor(q * arr.length))]; }

function report(s, sec) {
  var C = M.CFG, n = s.n;
  var rtp = s.sum / n, baseR = s.baseSum / n, bonusR = s.bonusSum / n;
  var sd = Math.sqrt(s.sum2 / n - rtp * rtp);
  var se = sd / Math.sqrt(n);
  if (process.argv.indexOf('--kort') >= 0) {
    // en rad per prov: namn, RTP (grund/bonus), träff, steg (snitt/9+/längsta), LV3 i grundspelet, bonus, bonusens steg
    var r9 = 0; for (var i9 = 9; i9 <= STEP_MAX; i9++) r9 += s.stepHist[i9];
    var bwk = s.bonusWins.slice().sort(function (a, b) { return a - b; });
    console.log([(arg('namn', '') + '                ').slice(0, 16),
      'RTP ' + (100 * baseR).toFixed(0) + '/' + (100 * bonusR).toFixed(0),
      'träff ' + (100 * s.hits / n).toFixed(1) + '%',
      'steg ' + (s.stepsSum / n).toFixed(2) + ' 9+ ' + (100 * r9 / n).toFixed(2) + '% max ' + s.maxSteps,
      'LV3 ' + (100 * s.lvHist[3] / n).toFixed(2) + '%',
      'bonus ' + oneIn(s.bonusN, n),
      'fs-steg ' + (s.fsSpins ? (s.fsSteps / s.fsSpins).toFixed(1) : '-') + ' max ' + s.fsMaxSteps,
      'bonus median ' + fx(quant(bwk, 0.5)) + ' tak ' + oneIn(s.capped, n),
      s.guard ? 'SPÄRR ' + s.guard : ''].join(' | '));
    return;
  }
  var out = [];
  out.push('Lagerspelet: ' + n.toLocaleString('sv-SE') + ' omgångar på ' + sec.toFixed(1) + ' s (' + WORKERS + ' kärnor, frö ' + SEED + ')');
  out.push('');
  out.push('RTP totalt            ' + pct(s.sum, n) + '  (±' + (196 * se).toFixed(2) + ' %)');
  out.push('  grundspelet         ' + pct(s.baseSum, n));
  out.push('  bonusen             ' + pct(s.bonusSum, n));
  out.push('Spridning (SD)        ' + sd.toFixed(2));
  out.push('Någon vinst           ' + pct(s.hits, n) + '  (' + oneIn(s.hits, n) + ')');
  out.push('Vinst minst insatsen  ' + pct(s.hits1, n));
  out.push('Största vinst         ' + fx(s.maxX) + (s.capped ? '   maxvinsten ' + oneIn(s.capped, n) : ''));
  out.push('');
  out.push('Laviner i grundspelet');
  out.push('  steg per snurr i snitt   ' + (s.stepsSum / n).toFixed(2) + ',  längsta ' + s.maxSteps);
  var sh = s.stepHist, line = [];
  for (var i = 0; i <= 8; i++) line.push(i + ': ' + pct(sh[i], n));
  var rest = 0; for (i = 9; i <= STEP_MAX; i++) rest += sh[i];
  line.push('9+: ' + pct(rest, n));
  out.push('  ' + line.join('   '));
  out.push('  högsta nivå i snurret    LV0 ' + pct(s.lvHist[0], n) + '   LV1 ' + pct(s.lvHist[1], n) + '   LV2 ' + pct(s.lvHist[2], n) + '   LV3 ' + pct(s.lvHist[3], n));
  out.push('  sprickor                 ' + (s.bursts / n).toFixed(3) + ' per snurr, minst en spricka ' + pct(s.burstSpins, n));
  out.push('  största klunga           ' + s.maxSize + ' rutor');
  out.push('');
  var bw = s.bonusWins.slice().sort(function (a, b) { return a - b; });
  out.push('Bonusen                ' + oneIn(s.bonusN, n) + '  (3: ' + s.trigN[3] + ', 4: ' + s.trigN[4] + ', 5+: ' + s.trigN[5] + ')');
  if (s.bonusN) {
    var avg = s.bonusWins.reduce(function (a, b) { return a + b; }, 0) / s.bonusN;
    out.push('  snitt ' + fx(avg) + ',  median ' + fx(quant(bw, 0.5)) + ',  10 % ' + fx(quant(bw, 0.1)) + ',  90 % ' + fx(quant(bw, 0.9)) + ',  99 % ' + fx(quant(bw, 0.99)) + ',  största ' + fx(bw[bw.length - 1]));
    out.push('  frispinn per bonus ' + (s.fsSpins / s.bonusN).toFixed(2) + ',  fler frispinn i ' + pct(s.retriggers, s.bonusN) + ' (räknat per gång)');
    out.push('  lavinsteg per frispinn ' + (s.fsSteps / s.fsSpins).toFixed(2) + ',  längsta ' + s.fsMaxSteps + ',  sprickor per frispinn ' + (s.fsBursts / s.fsSpins).toFixed(2));
    var lvl = [];
    for (i = 0; i < 12; i++) if (s.fsLvN[i]) lvl.push((i < 11 ? (i + 1) : '12+') + ': ' + (s.fsLvBy[i] / s.fsLvN[i]).toFixed(2));
    out.push('  rutornas snittnivå efter frispinn nr  ' + lvl.join('  '));
    out.push('  lavinsteg per bonus (hela bonusen) ' + (s.bonusSteps / s.bonusN).toFixed(1));
    if (C.fsGoldP) out.push('  guldrutor i slutet av bonusen  ' + s.goldHist.map(function (v, gi) { return (gi < 6 ? gi : '6+') + ': ' + pct(v, s.bonusN); }).join('  '));
    out.push('  under 10x ' + pct(bw.filter(function (x) { return x < 10; }).length, s.bonusN) + ',  under 50x ' + pct(bw.filter(function (x) { return x < 50; }).length, s.bonusN) + ',  minst 1000x ' + pct(bw.filter(function (x) { return x >= 1000; }).length, s.bonusN));
  }
  out.push('');
  out.push('Vinster (gånger insatsen)');
  var labels = ['0'];
  for (i = 1; i < WIN_EDGES.length; i++) labels.push(WIN_EDGES[i - 1] + '–' + WIN_EDGES[i]);
  labels.push(WIN_EDGES[WIN_EDGES.length - 1] + '+');
  for (i = 0; i < labels.length; i++) if (s.winHist[i]) out.push('  ' + (labels[i] + '          ').slice(0, 12) + pct(s.winHist[i], n) + '   (' + oneIn(s.winHist[i], n) + ')');
  out.push('');
  out.push('Klungornas storlek (antal klungor, grundspelet / bonusen)');
  var edges = [5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50, 70, 100, 200];
  for (i = 0; i + 1 < edges.length; i++) {
    var cb = 0, cf = 0;
    for (var z = edges[i]; z < edges[i + 1]; z++) { cb += s.sizeBase[z]; cf += s.sizeFs[z]; }
    if (cb || cf) out.push('  ' + (edges[i] + (edges[i + 1] - 1 > edges[i] ? '–' + (edges[i + 1] - 1) : '') + '        ').slice(0, 8) + (cb.toLocaleString('sv-SE') + '            ').slice(0, 14) + cf.toLocaleString('sv-SE'));
  }
  if (s.guard) out.push('VARNING: säkerhetsspärren för laviner nåddes ' + s.guard + ' gånger');
  out.push('');
  // förslag på skalor som ger målet
  if (baseR > 0 && bonusR === 0) out.push('Förslag för ' + (TARGET * 100) + ' % (bara grundspelet):  scale ' + (C.scale * TARGET / baseR).toFixed(5) + '  (nu ' + C.scale + ')');
  if (baseR > 0 && bonusR > 0) {
    var newScale = C.scale * (TARGET * BASESHARE) / baseR;
    var newFs = C.fsScale * (TARGET * (1 - BASESHARE)) / bonusR * (C.scale / newScale);
    out.push('Förslag för ' + (TARGET * 100) + ' % med grundspelet ' + Math.round(BASESHARE * 100) + ' %:  scale ' + newScale.toFixed(5) + ',  fsScale ' + newFs.toFixed(4) + '  (nu ' + C.scale + ' och ' + C.fsScale + ')');
  }
  console.log(out.join('\n'));
  if (process.argv.indexOf('--json') >= 0) console.log(JSON.stringify({ rtp: rtp, base: baseR, bonus: bonusR, sd: sd, hit: s.hits / n, bonusEvery: n / s.bonusN, cfg: C }));
}
