# ALTER EGO

Gränssnittet följer UI-basen från C&T Maniac: `docs/ui-bas/UI-bas C&T Maniac.md` (kopierad från C&T-mappen 2026-11-10, med skärmbilderna). Platserna står i tabellen `POS` i `prototyp.html`.

En 7x7-slot med klungvinster, där rutorna levlar upp i lavinerna. En levlad ruta rymmer fler symboler och räknas som fler rutor i klungan. Temat är inte bestämt.

- `src/math.js`: matten, version 0.2 (fallande laviner som i C&T, lagren sitter i rutan bakom symbolen). Varianten `bas` är bara grundspelet, inställd på 96 % (skalan 0,1497). Bonusen är inte omkalibrerad sedan 0.1.
- `prototyp.html`: spelbar prototyp av basspelet med C&T Maniacs hjulrörelse (hjulmotorn från reels.js), laviner (tyngdkraft och studs), vinstblixt och upplägg (LAYER-panel, knapprad, TEST och info)
- `index.html`: samma spel som en vanlig webbsida (för GitHub Pages), byggd med `node tools/build.js`. Kör den efter varje ändring i `prototyp.html`.
- `tools/sim.js`: simulatorn (`node tools/sim.js --n 10000000`, bara basspelet: `--preset bas`)
- `tools/serve.js`: lokal server för prototypen (`node tools/serve.js`, sedan http://localhost:5181, QR-kod till telefonen på /qr)
- `docs/matte-v0.1.md`: reglerna, resultaten och det som återstår att bestämma

Kräver Node.js.
