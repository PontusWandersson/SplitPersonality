  // ================================================================ ALTER EGO (superbonusen)
  // Förs in i C&T-koden av tools/make-ct-bas.js (före runFreeSpins), så allt i C&T:s spelkod går att använda här.
  // Superbonusen är C&T:s INFINITY-bonus (guldbomben eller köp i ODD-menyn) med en ändring: Killen, Katten och Växten har
  // var sitt steg 1–5 (matten: AE i spelmotorn). Steget avgör hur många lager karaktärens vinster når (steg 1 = LAYER 1,
  // steg 4 = LAYER 1–4) och steg 5, ALTER EGO, når alla lager och INFINITY. 5 karaktärssymboler i vinster (brädet och lagren) ger nästa steg. Andra
  // symboler når bara LAYER 1. Multin växer med lagrets siffra som i C&T (LAYER 3 = +3) och nollställs aldrig.
  // Här: bilderna per steg (alla karaktärer på brädet byter bild), panelen med karaktärerna och LEVEL UP.
  var AE_SYM = [2, 3, 4], AE_NAMN = ['KILLEN', 'KATTEN', 'VÄXTEN'];
  var AE_LCOL = ['#2fb4ff', '#3ccf6e', '#ff2d4f', '#d23cff', '#ffd21f'];   // lagrens färger (LAYER 1–5), som C&T
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

  // ---- panelen: på datorn i högerspalten, på telefonen i det tomma fältet under knapparna (bara under superbonusen)
  var aeEl = null;
  function aeCss() {
    if (document.getElementById('aeCss')) return;
    var css = document.createElement('style'); css.id = 'aeCss';
    css.textContent =
      '.ae-panel { display: grid; gap: 10px; padding: 12px; border-radius: 16px; background: rgba(21,17,31,.9); border: 2px solid rgba(255,246,224,.22); color: var(--paper, #fff6e0); font-family: var(--ui, "Fredoka", sans-serif); }' +
      '.ae-title { font-family: var(--display, "Bangers", Impact, sans-serif); font-size: 30px; letter-spacing: .05em; text-align: center; color: #ff8629; -webkit-text-stroke: 1.5px #15111f; paint-order: stroke fill; line-height: 1; }' +
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
    aeEl.innerHTML = '<div class="ae-title">ALTER EGO</div>' + AE_SYM.map(function (s, i) {
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
    for (var i = 0; i < 3; i++) {
      var k = ae.s[i], row = rows[i], img = row.querySelector('img'), src = AE_SRC[AE_SYM[i]][k - 1];
      if (img.getAttribute('src') !== src) img.setAttribute('src', src);
      row.querySelector('.ae-step').textContent = k >= 5 ? 'ALTER EGO · INFINITY' : 'STEG ' + k + ' · LAYER ' + (k === 1 ? '1' : '1–' + k);
      row.querySelectorAll('.ae-pips i').forEach(function (p, j) { p.style.background = j < k ? AE_LCOL[j] : ''; });
      row.querySelectorAll('.ae-wins i').forEach(function (p, j) { p.classList.toggle('on', k < 5 && j < ae.c[i]); });
      row.classList.toggle('max', k >= 5);
      if (up && up.indexOf(i) >= 0) { row.classList.remove('up'); void row.offsetWidth; row.classList.add('up'); }
    }
    // C&T:s lagerstege visar hur djupt den bästa karaktären når; steg 5 öppnar INFINITY
    if (state.fs) {
      var top = Math.max(ae.s[0], ae.s[1], ae.s[2]);
      state.fs.ladU = top >= 5 ? infD() : top; state.fs.ladC = 0;
      try { renderMeter(); } catch (e) { /* mätaren ritas nästa gång */ }
    }
  }
  function aeInit() { aeBuild(); aePlace(); aeEl.hidden = false; aeSprites([1, 1, 1]); aeRender({ s: [1, 1, 1], c: [0, 0, 0] }); }
  function aeEnd() {
    if (aeEl) aeEl.hidden = true;
    aeSprites([1, 1, 1]);
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
      try {
        Sound.tone(392, 0.16, { type: 'triangle', vol: 0.12 }); Sound.tone(523, 0.16, { type: 'triangle', vol: 0.12, when: 0.1 });
        Sound.tone(k >= 5 ? 1046 : 784, 0.32, { type: 'triangle', vol: 0.12, when: 0.2 });
      } catch (e) { /* inget ljud */ }
      await wait(showTime(k >= 5 ? 1.6 : 1.1));
      fx.remove();
    }
  }

