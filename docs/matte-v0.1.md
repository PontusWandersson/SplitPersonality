# Lagerspelet (arbetsnamn): matte version 0.1

2026-11-10. Första kalibrerade utkastet. Inte certifierat, och temat är inte bestämt.

## Reglerna

- **Rutnät 7x7** med 8 betalande symboler (4 höga och 4 låga) och en bonussymbol.
- **Vinst:** en klunga på minst 5 rutor som sitter ihop (upp, ner, vänster eller höger) och har samma symbol.
- **Rutorna har nivåer.** På LV0 rymmer en ruta 1 symbol, på LV1 2, på LV2 3 och på LV3 4. En ruta räknas som alla sina symboler, så den kan vara med i flera klungor samtidigt.
- **Lager kan vara tomma.** Platserna under den översta symbolen är tomma i 30 % av fallen (25 % i bonusen). Det är bromsen som gör att lavinerna tar slut.
- **Lavinen:** de vinnande symbolerna försvinner, och varje ruta som var med i en vinst levlar ett steg. Tomma platser fylls med nya symboler.
- **Spricka:** en LV3-ruta som vinner igen spricker. Den börjar om på LV0, och rutorna runt omkring levlar ett steg.
- **Nivåerna ger större vinster.** Varje nivå räknas som en ruta extra i klungan. En klunga på 8 rutor som alla är LV2 betalar som en klunga på 24.
- **Bonusen:** 3 bonussymboler ger 10 frispinn, 4 ger 12 och 5 eller fler ger 15. 3 bonussymboler i ett frispinn ger 5 frispinn till. Nivåerna från snurret som startade bonusen följer med och ligger kvar hela bonusen, så väggen växer. Bonussymbolen kommer bara överst, aldrig i ett lager.
- **Guldrutor (bara i bonusen):** när en ruta spricker blir den ibland guld (0,6 % av sprickorna). En guldruta räknas som 10 rutor extra i varje klunga den är med i, och den är guld resten av bonusen.
- **Maxvinst:** 10 000x insatsen.

## Resultat (10 miljoner omgångar)

| | |
|---|---|
| RTP | **96,18 %** (±0,82), varav grundspelet 62,2 % och bonusen 34,0 % |
| Någon vinst | 28,5 % av snurren (ungefär vart 4:e) |
| Vinst minst lika stor som insatsen | 5,5 % av snurren |
| Bonusen | 1 per 245 snurr |
| Bonusens vinst | snitt 83x, median 39x, var 10:e över 211x, var 100:e över 635x |
| Största vinst | 4 646x |
| Spridning (SD) | 13,3 (hög volatilitet) |
| Lavinsteg | grundspelet 0,46 per snurr (som mest 66), bonusen 6,1 per frispinn (cirka 63 per bonus) |
| Väggen växer i bonusen | rutornas snittnivå går från 0,2 efter första frispinnet till 1,4 efter det tionde |

## Vad simuleringarna visade

1. **Utan broms tar lavinen aldrig slut.** När rutorna har 4 symboler bildas klungor hela tiden. Grundspelet gick upp till 1 373 lavinsteg, och nästan varje bonus nådde maxvinsten.
2. **Tomma lager är en bra broms, men spelet ligger nära en tipppunkt.** Med 30 % tomma lager tar lavinerna alltid slut. Med 15 % tomma i bonusen blir det 19 lavinsteg per frispinn, och med 5 % tar de inte slut alls. Små ändringar av symbolerna kan också få bonusen att tippa över.
3. **När sprickan nollställer rutan blir alla bonusar ungefär lika stora.** Väggen kan aldrig växa hur långt som helst, och en bonus består av många små vinster. Utan något extra blev den största bonusen bara cirka 6 gånger snittet.
4. **Guldrutorna ger toppar utan gångervinst.** I 30 % av bonusarna blir det ingen guldruta och i 11 % sex eller fler. Det är de bonusarna som ger de stora vinsterna.

## Det som inte är bra än

- **Var fjärde bonus är för svag:** 28 % betalar under 10x, och var tionde nästan ingenting. Det beror på att bonusen börjar på LV0 och ibland aldrig kommer igång.
- **Maxvinsten 10 000x nås inte.** Den största vinsten på 10 miljoner omgångar var 4 646x.
- **Grundspelets vinster är oftast små.** Det blir vinst i vart 4:e snurr, men bara vart 18:e ger minst insatsen tillbaka.
- **En bonus har cirka 63 lavinsteg att visa.** Det kan bli långt att titta på.

## Att bestämma

1. Ska guldrutorna vara med? Det andra alternativet är en växande multi i bonusen, som i C&T.
2. Hur ska de svaga bonusarna lösas? Alternativen är en startnivå för väggen, fler frispinn eller en lägsta vinst.
3. Ska maxvinsten vara 10 000x eller 20 000x?

## Köra själv

```bash
node tools/sim.js --n 10000000 --seed 11
```

Simulerar 10 miljoner omgångar på cirka 20 sekunder. Med `--set '{"layerBlank":0.25}'` provas en ändring utan att mattefilen ändras, och `--kort` ger en rad per prov.
