  // ================================================================ ALTER EGO (superbonusen)
  // Förs in i C&T-koden av tools/make-ct-bas.js (före runFreeSpins), så allt i C&T:s spelkod går att använda här.
  // Superbonusen kommer som C&T:s superbonus (guldbomben eller köp). Killen, Katten och Växten har var sitt steg 1–5 (matten:
  // AE i spelmotorn): 5 karaktärssymboler i vinster ger nästa steg, och steg 5 heter ALTER EGO.
  // Lagren (prototyp 2026-11-11, Pontus: "Ta fram det du har så får jag spela och utefter det ta beslut"): en karaktär
  // landar med lika många lager som sitt steg. En vinst river av översta lagret, och karaktären står kvar ett steg mindre
  // (med sitt stegs bild); med sista lagret sprängs den. Variant 0–3 (TEST-menyn, sparas): 1 = varje rivet lager ger +1 i
  // multin, 2 = ALTER EGO-ögonblicket: när en karaktär når steg 5 blir alla den karaktären på brädet wild (var och en tills
  // dess översta lager rivs), 3 = båda (inte i menyn: den går nästan bara till maxvinsten).
  // Här: bilderna per steg (nya karaktärer landar med stegets bild, c.ae är rutans egna lager), panelen med karaktärerna,
  // LEVEL UP, lagren som rivs och varianterna.
  var AE_SYM = [2, 3, 4], AE_NAMN = ['KILLEN', 'KATTEN', 'VÄXTEN'];
  var AE_PIP = '#ff8629', AE_PIP_MAX = '#ffd21f';   // stegens färg (orange accent) och ALTER EGO (gul)
  // Pontus fem bilder per karaktär (steg 1–5); steg 1 är samma bild som symbolen i grundspelet
  var AE_SRC = {
    2: [0, 1, 2, 3, 4].map(function (k) { return 'assets/figur/lv' + k + '.webp'; }),
    3: [0, 1, 2, 3, 4].map(function (k) { return 'assets/figur/katt-lv' + k + '.webp'; }),
    4: [0, 1, 2, 3, 4].map(function (k) { return 'assets/figur/vaxt-lv' + k + '.webp'; })
  };
  var AE_IMG = {}, AE_BASE = {};
  AE_SYM.forEach(function (s) {
    AE_BASE[s] = SYM_IMG[s];
    AE_IMG[s] = AE_SRC[s].map(function (src) { var im = new Image(); im.src = src; return im; });
  });
  function aeOk(im) { return !!(im && im.complete && im.naturalWidth > 1); }
  // symbolernas bild blir stegets bild, och symbolerna byggs om (alla karaktärer på brädet byter bild på en gång)
  function aeSprites(steps) {
    var changed = false;
    AE_SYM.forEach(function (s, i) {
      var k = Math.max(1, Math.min(5, steps[i])) - 1, im = k ? AE_IMG[s][k] : AE_BASE[s];
      if (!aeOk(im)) im = AE_BASE[s];
      if (SYM_IMG[s] !== im) { SYM_IMG[s] = im; changed = true; }
    });
    if (changed) { try { buildSprites(); } catch (e) { /* byggs vid nästa storleksändring */ } }
  }

  // ---- lagren på brädet: varje ruta med en karaktär har c.ae (lager kvar, 1–5) och c.aeW (wild, variant 2 och 3)
  // rutans bild för k lager, i brädets storlek (byggs första gången den behövs och när rutorna byter storlek)
  var aeSprC = {};
  function aeSpr(s, k) {
    var size = sprites[s] && sprites[s].width;
    if (!size || !AE_IMG[s]) return null;
    k = Math.max(1, Math.min(5, k));
    var key = s + ':' + k + ':' + size;
    if (aeSprC[key]) return aeSprC[key];
    var im = k > 1 ? AE_IMG[s][k - 1] : AE_BASE[s];
    if (!aeOk(im)) return null;
    var keep = SYM_IMG[s], keepB = symPaBrade;
    SYM_IMG[s] = im; symPaBrade = true;
    try { aeSprC[key] = makeSprite(s, size); } finally { SYM_IMG[s] = keep; symPaBrade = keepB; }
    return aeSprC[key];
  }
  // drawCell ritar rutan med dess lagers bild (symbolens bild byts bara medan rutan ritas). Symbolanimationen efter
  // studsen hör till symbolens vanliga bild, så den står över för rutor med egna lager.
  function aeSwap(c) {
    if (!c.ae) return null;
    var spr = aeSpr(c.sym, c.ae);
    if (!spr) return null;
    var o = { s: c.sym, p: sprites[c.sym], a: SYM_ANIM };
    sprites[c.sym] = spr; SYM_ANIM = false;
    return o;
  }
  function aeUnswap(o) { if (o) { sprites[o.s] = o.p; SYM_ANIM = o.a; } }
  // WILD-märket under en wild-karaktär
  function aeMark(g, c, x, highlight) {
    if (c.pop >= 0) return;
    var y = c.y * cell;
    if (y > boardPx || y < -cell) return;
    var w = cell * 0.6, hh = cell * 0.19, bx = x + (cell - w) / 2, by = y + cell * 0.77;
    g.save();
    if (highlight && !c.win) g.globalAlpha = 0.2;
    g.fillStyle = AE_PIP_MAX; g.strokeStyle = INK; g.lineWidth = Math.max(1.5, cell * 0.03);
    rr(g, bx, by, w, hh, hh * 0.4); g.fill(); g.stroke();
    g.fillStyle = INK; g.font = Math.round(hh * 0.86) + 'px ' + DISPLAY; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('WILD', x + cell / 2, by + hh * 0.56);
    g.restore();
  }
  // lagren från matten (L: lager per ruta, W: wild per ruta) läggs på brädets rutor
  function aeCells(L, W) {
    for (var r = 0; r < REELS; r++) for (var y = 0; y < ROWS; y++) {
      var c = reels[r] && reels[r].cells[y];
      if (!c) continue;
      c.ae = (L[r] && L[r][y]) || 0; c.aeW = !!(W && W[r] && W[r][y]);
    }
  }
  // vinsten river översta lagret: det gamla lagret spricker i bitar ovanpå rutan, och under syns karaktären ett steg mindre
  function aePeel(st) {
    st.peel.forEach(function (p) {
      var c = reels[p.r] && reels[p.r].cells[p.y];
      if (!c) return;
      var px = p.r * cell + cell / 2, py = p.y * cell + cell / 2, spr = aeSpr(c.sym, c.ae || p.k + 1) || sprites[c.sym];
      if (spr) parts.push({ kind: 'shatter', x: px, y: py, spr: spr, pieces: shatterPieces(), life: 0, max: SHATTER_LIV });
      parts.push({ kind: 'ring', x: px, y: py, life: 0, max: 0.3, c: '#fff6e0', delay: SHATTER_CRACK });
      c.ae = p.k; c.aeW = false; c.tagIn = 0;
    });
  }

  // ---- varianterna (TEST-menyn, fliken Nytt): de två valen Pontus provar fram. Varianten sparas och gäller också köpt
  // ALTER EGO och guldbomben.
  var AE_VAR = ['BARA LAGER', 'LAGER + MULTI', 'LAGER + WILD', 'LAGER + MULTI + WILD'];
  var AE_VAR_TXT = [
    'Vinsten river ett lager, karaktären står kvar. Ingen multi, ingen wild.',
    'Som bara lager, och varje rivet lager ger +1 i multin (växer hela bonusen).',
    'Som bara lager, och när en karaktär når steg 5 blir alla den karaktären på brädet wild.',
    'Både multin och wild.'
  ];
  // variant 3 (multi och wild) går nästan bara till maxvinsten och finns inte i menyn (tools/make-ct-bas.js, AE_CAL)
  function aeVarGet() { var v = +store.get('aeVar', 0); return v >= 0 && v <= 2 ? v : 0; }
  function aeVarSet(v) { store.set('aeVar', v); M.aeVariant(v); }
  M.aeVariant(aeVarGet());
  function aeNew() {
    return AE_VAR.slice(0, 3).map(function (n, v) { return ['aeV' + v, 'ALTER EGO: ' + n, AE_VAR_TXT[v] + ' Startar en gratis superbonus.']; });
  }
  function aeTest(v) { aeVarSet(v); TESTS.maniac(); }
  // bonusens startkort och reglerna
  function aeFacts() {
    return '<p><b>Steget = lager.</b> En vinst river av ett lager och karaktären står kvar. 5 karaktärer i vinster ger nästa steg.</p>' +
      (M.TIME.aeMulti ? '<p>Varje rivet lager ger <b>+1 i MULTI</b></p>' : '') +
      (M.TIME.aeWild ? '<p>Når en karaktär <b>steg 5</b> blir den <b>WILD</b> på hela brädet</p>' : '');
  }
  function aeRule() {
    return '<li>' + txl('Killen, Katten och Växten levlar var för sig: 5 karaktärssymboler i vinster ger nästa steg. Steget är antal lager: en karaktär landar med lika många lager som sitt steg, och steg 5 heter ALTER EGO.') + '</li>' +
      '<li>' + txl('En vinst river av översta lagret, och karaktären står kvar ett steg mindre och kan vinna igen i nästa lavin. Med sista lagret sprängs den som vanligt.') + '</li>' +
      (M.TIME.aeMulti ? '<li>' + txl('Varje rivet lager (karaktären står kvar) ger +1 i multin, som gäller resten av bonusen.') + '</li>' : '') +
      (M.TIME.aeWild ? '<li>' + txl('När en karaktär når steg 5 (ALTER EGO) blir alla den karaktären på brädet wild, var och en tills dess översta lager rivs. Karaktärer som landar senare är vanliga.') + '</li>' : '');
  }

  // ---- panelen: på datorn i högerspalten, på telefonen i det tomma fältet under knapparna (bara under superbonusen)
  var aeEl = null;
  function aeCss() {
    if (document.getElementById('aeCss')) return;
    var css = document.createElement('style'); css.id = 'aeCss';
    css.textContent =
      '.ae-panel { display: grid; gap: 10px; padding: 12px; border-radius: 16px; background: rgba(21,17,31,.9); border: 2px solid rgba(255,246,224,.22); color: var(--paper, #fff6e0); font-family: var(--ui, "Fredoka", sans-serif); }' +
      '.ae-title { font-family: var(--display, "Bangers", Impact, sans-serif); font-size: 30px; letter-spacing: .05em; text-align: center; color: #ff8629; -webkit-text-stroke: 1.5px #15111f; paint-order: stroke fill; line-height: 1; }' +
      '.ae-var { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-align: center; opacity: .8; margin-top: -5px; }' +
      '.ae-row { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 10px; align-items: center; }' +
      '.ae-row img { width: 56px; height: 56px; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,.5)); }' +
      '.ae-row.up img { animation: aeUp .8s cubic-bezier(.3,1.6,.5,1); }' +
      '@keyframes aeUp { 0% { transform: scale(1.7) rotate(-8deg); filter: brightness(2.2); } 100% { transform: none; } }' +
      '.ae-name { font-family: var(--display, "Bangers", Impact, sans-serif); font-size: 21px; letter-spacing: .05em; line-height: 1; }' +
      '.ae-step { font-size: 11px; font-weight: 700; letter-spacing: .03em; white-space: nowrap; opacity: .85; margin-top: 2px; }' +
      '.ae-row.max .ae-step { color: #ffd21f; opacity: 1; }' +
      '.ae-pips { display: flex; gap: 4px; margin-top: 5px; }' +
      '.ae-pips i { width: 17px; height: 8px; border-radius: 3px; background: rgba(255,246,224,.14); border: 1.5px solid #15111f; }' +
      '.ae-wins { display: flex; gap: 4px; margin-top: 4px; }' +
      '.ae-wins i { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,246,224,.2); }' +
      '.ae-wins i.on { background: #ffd21f; }' +
      '.portrait .ae-panel { position: absolute; left: 0; right: 0; top: calc(100% + 12px); z-index: 5; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 8px; gap: 8px; }' +
      '.portrait .ae-title { display: none; }' +
      '.portrait .ae-var { grid-column: 1 / -1; margin: 0; font-size: 9px; }' +
      '.portrait .ae-row { grid-template-columns: 34px minmax(0, 1fr); gap: 5px; }' +
      '.portrait .ae-row img { width: 34px; height: 34px; }' +
      '.portrait .ae-name { font-size: 13px; } .portrait .ae-step { font-size: 8px; white-space: normal; }' +
      '.portrait .ae-pips i { width: 9px; height: 6px; } .portrait .ae-wins i { width: 6px; height: 6px; }' +
      '.ae-fx { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; z-index: 40; }' +
      '.ae-card { display: grid; justify-items: center; gap: 4px; animation: aeCard 1.3s ease-out both; }' +
      '.ae-card img { width: 46%; max-width: 360px; filter: drop-shadow(0 10px 30px rgba(0,0,0,.75)); }' +
      '.ae-card b { font-family: var(--display, "Bangers", Impact, sans-serif); font-weight: 400; font-size: 60px; letter-spacing: .05em; color: #fff; -webkit-text-stroke: 3px #15111f; paint-order: stroke fill; text-shadow: 4px 4px 0 #15111f; white-space: nowrap; }' +
      '.ae-card.max b { color: #ffd21f; }' +
      '.portrait .ae-card b { font-size: 30px; -webkit-text-stroke: 2px #15111f; }' +
      '@keyframes aeCard { 0% { transform: scale(.3); opacity: 0; } 18% { transform: scale(1.12); opacity: 1; } 30% { transform: scale(1); } 82% { opacity: 1; } 100% { opacity: 0; transform: scale(1.04); } }';
    document.head.appendChild(css);
  }
  function aeBuild() {
    aeCss();
    if (aeEl) return aeEl;
    aeEl = document.createElement('section'); aeEl.className = 'ae-panel'; aeEl.id = 'aePanel'; aeEl.hidden = true;
    aeEl.setAttribute('aria-live', 'polite');
    aeEl.innerHTML = '<div class="ae-title">ALTER EGO</div><div class="ae-var"></div>' + AE_SYM.map(function (s, i) {
      return '<div class="ae-row" data-i="' + i + '"><img alt=""><div><div class="ae-name">' + AE_NAMN[i] + '</div><div class="ae-step"></div>' +
        '<div class="ae-pips"><i></i><i></i><i></i><i></i><i></i></div><div class="ae-wins"><i></i><i></i><i></i><i></i><i></i></div></div></div>';
    }).join('');
    return aeEl;
  }
  function aePlace() {
    var el = aeBuild(), portrait = document.documentElement.classList.contains('portrait');
    var home = document.getElementById(portrait ? 'machine' : 'right');
    if (home && el.parentNode !== home) { if (portrait) home.appendChild(el); else home.insertBefore(el, home.firstChild); }
  }
  // ae: { s: steg [3], c: symboler mot nästa steg [3] }, up: karaktärer som just levlade
  function aeRender(ae, up) {
    if (!aeEl) return;
    aePlace();
    var rows = aeEl.querySelectorAll('.ae-row');
    aeEl.querySelector('.ae-var').textContent = AE_VAR[M.TIME.aeVar || 0];
    for (var i = 0; i < 3; i++) {
      var k = ae.s[i], row = rows[i], img = row.querySelector('img'), src = AE_SRC[AE_SYM[i]][k - 1];
      if (img.getAttribute('src') !== src) img.setAttribute('src', src);
      row.querySelector('.ae-step').textContent = k >= 5 ? 'ALTER EGO' : 'STEG ' + k + ' AV 5';
      row.querySelectorAll('.ae-pips i').forEach(function (p, j) { p.style.background = j < k ? (k >= 5 ? AE_PIP_MAX : AE_PIP) : ''; });
      row.querySelectorAll('.ae-wins i').forEach(function (p, j) { p.classList.toggle('on', k < 5 && j < ae.c[i]); });
      row.classList.toggle('max', k >= 5);
      if (up && up.indexOf(i) >= 0) { row.classList.remove('up'); void row.offsetWidth; row.classList.add('up'); }
    }
  }
  function aeInit() { aeBuild(); aePlace(); aeEl.hidden = false; aeSprites([1, 1, 1]); aeRender({ s: [1, 1, 1], c: [0, 0, 0] }); }
  function aeEnd() {
    if (aeEl) aeEl.hidden = true;
    aeSprites([1, 1, 1]);
    // brädet efter bonusen har inga lager
    reels.forEach(function (rl) { rl.cells.forEach(function (c) { c.ae = 0; c.aeW = false; }); });
    document.querySelectorAll('.ae-fx').forEach(function (f) { f.remove(); });
  }
  // efter ett lavinsteg: panelen räknar vinsterna, och en karaktär som når nästa steg växer (LEVEL UP på brädet)
  async function aeShow(st) {
    var ae = st.ae;
    aeRender(ae, ae.up);
    if (!ae.up.length) return;
    aeSprites(ae.s);
    for (var j = 0; j < ae.up.length; j++) {
      var i = ae.up[j], k = ae.s[i];
      var fx = document.createElement('div'); fx.className = 'ae-fx';
      fx.innerHTML = '<div class="ae-card' + (k >= 5 ? ' max' : '') + '"><img alt="" src="' + AE_SRC[AE_SYM[i]][k - 1] + '"><b>' +
        (k >= 5 ? AE_NAMN[i] + ' · ALTER EGO!' : AE_NAMN[i] + ' · STEG ' + k) + '</b></div>';
      (document.getElementById('frame') || document.body).appendChild(fx);
      await wait(showTime(k >= 5 ? 1.6 : 1.1));
      fx.remove();
    }
  }

