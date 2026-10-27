# ⛺ Camping Tycoon

Een browsergame in de stijl van RollerCoaster Tycoon, maar dan voor een camping. Volledig in vanilla HTML, CSS en JavaScript (canvas), zonder server, zonder build-stap en zonder externe afhankelijkheden. Alles (ook de graphics) wordt in de browser gegenereerd.

## Spelen

Open `public/index.html` in een browser, of host de map `public` als statische site (bijvoorbeeld GitHub Pages).

**GitHub Pages:** de workflow in `.github/workflows/pages.yml` publiceert de map `public` bij elke push naar `main`. Zet bij *Settings → Pages* de bron op *GitHub Actions*; daarna staat het spel op `https://<gebruikersnaam>.github.io/<repository>/`.

Het spel wordt elke minuut automatisch in de browser opgeslagen (localStorage). Via *Menu* kun je ook een savebestand exporteren en importeren.

## Wat zit erin

- **Paden** (grind en tegels) waar gasten en personeel overheen lopen. Alles moet via een pad met de ingang verbonden zijn.
- **Staplekken**: tentplek, caravanplek en comfortplek. Bezette plekken tonen een tent, caravan of camper.
- **Verhuur**: trekkershut, glampingtent, stacaravan, chalet en pipowagen.
- **Voorzieningen**: receptie (verplicht om in te checken), slagboom, sanitairgebouw, toiletunit, restaurant met terras, snackbar, pizzeria, bakker, ijssalon, campingwinkel, wasserette, afvalstation, camperservicepunt, prullenbakken, bankjes, lantaarnpalen, picknicktafels, informatiebord, fietsverhuur en parkeerplaats. Prullenbakken, lantaarns, bankjes en borden staan aan de rand van het pad.
- **Recreatie**: speeltuin, zwembad, trampoline, midgetgolf, volleybalveld, jeu-de-boulesbaan, kampvuurplaats, recreatiezaal, dierenweide, skelterverhuur en tafeltennistafel. Overdekt: binnenzwembad, binnenspeeltuin, bowlingbaan, fitnessruimte en bioscoop (populair bij regen en in de winter).
- **Natuur**: eiken, dennen, berken, treurwilgen, appelbomen, struiken, heggen, bloemperken, wilde bloemen en rotsblokken. Sfeer rond een staplek maakt gasten blijer.
- **Dieren**: geiten, schapen, kippen, koeien, pony's, konijnen en eenden lopen (of zwemmen) vrij rond.
- **Personeel**: schoonmakers (zwerfafval en sanitair, met instelbare focus), onderhoudsmonteurs (reparaties en preventief onderhoud), tuinmannen (maaien staplekken en verzorgen bloemen, heggen en bomen; zonder tuinman verwildert het terrein langzaam en telt het groen minder mee) en animatiemedewerkers (vermaak, 's avonds bij het kampvuur).
- **Terrein**: gras, zand en water om zelf een vijver of strandje te maken, en stroken grond bijkopen om het terrein uit te breiden.
- **Bouwen**: objecten draaien (R) en verplaatsen via het infopaneel; op touchschermen tik je eerst om te mikken en bevestig je met *Plaatsen*.
- **Meerdere campings**: vier opslagslots, één camping tegelijk actief.

## Simulatie

- Gezelschappen (gezinnen, stellen, vriendengroepen, senioren) komen aan met een eigen wens (tent, caravan, hut...), checken in bij de receptie en blijven een aantal nachten.
- Iedere gast heeft behoeften (honger, hygiëne, vermaak, vermoeidheid), een tevredenheid en gedachten die je kunt bekijken door op de gast te klikken.
- Seizoenen en weer: hoogseizoen in de zomer, regen, sneeuw in de winter, dag en nacht met lantaarnlicht.
- Voorzieningen slijten, gaan af en toe kapot en worden vies. Een onderhoudsmonteur repareert ze; zonder monteur komt na drie dagen een dure externe reparateur. Gasten laten afval slingeren.
- Vertrekkende gezelschappen laten weten waarover ze ontevreden waren (in de melding en in het Gasten-paneel onder *Laatste vertrekken*). Het Gasten-paneel opent met een **advieslijst** die knelpunten benoemt: te lange loopafstanden, te weinig capaciteit, verwilderde plekken, kapotte of vieze voorzieningen, winter zonder overdekte attracties, donkere paden.
- Een beoordeling van 0 tot 5 sterren, opgebouwd uit tevredenheid, netheid, voorzieningen en natuur, bepaalt hoeveel gasten er komen en wat ze willen betalen.
- Prijzen per nacht en tarieven van voorzieningen zijn instelbaar. Maandelijkse financiën, doelen en een noodlening als het misgaat.

## Besturing

| Actie | Invoer |
|---|---|
| Schuiven | slepen met de muis, rechtermuisknop, pijltjes of WASD |
| Zoomen | scrollwiel, `+` / `-`, pinch op touchscreens |
| Bouwen | kies een categorie onderin, klik een item en klik op het terrein (slepen voor paden en terrein) |
| Draaien | `R` (ook voor een geselecteerd gebouw) of de knop *Draaien* |
| Verplaatsen | selecteer een gebouw en kies *Verplaatsen* in het infopaneel |
| Stoppen met bouwen | `Esc` of rechtermuisknop |
| Informatie | klik op een gebouw, gast, personeelslid of dier |
| Pauze / snelheid | spatie, `1`, `2`, `3` |
| Volledig scherm | `F` of de knop ⛶ rechtsboven. Op iPad/iPhone staat Apple dit alleen in Safari toe; open het spel daar via *Delen → Zet op beginscherm* als schermvullende app (werkt ook als Firefox je standaardbrowser is) |
| Slopen | `X` of `Delete`; gebouwen, dieren en personeel vragen om bevestiging, paden en begroeiing niet (die kun je ook wegslepen) |

## Cache-busting

GitHub Pages laat bestanden tien minuten cachen. De deploy-workflow vult daarom de commit-hash in op de plek van `__V__` in `public/index.html` (als `?v=` achter elke script- en css-link) en schrijft `public/version.json`. Bij het starten vergelijkt het spel zijn ingebakken versie met `version.json` (buiten de cache om) en herlaadt het zichzelf één keer als die afwijkt; tijdens het spelen verschijnt bij een nieuwe versie een melding met een herlaadknop.

## Ontwikkeling

Er is geen build-stap. De bestanden in `public/js/` worden in volgorde geladen door `public/index.html`:

| Bestand | Inhoud |
|---|---|
| `util.js` | hulpfuncties, namen |
| `data.js` | catalogus van objecten, gasttypes, personeel, doelen, balanswaarden |
| `sprites.js` | procedurele isometrische sprites, personen en dieren |
| `world.js` | tegelraster, plaatsing, bereikbaarheid, padvinding |
| `guests.js` | gezelschappen en gastengedrag |
| `staff.js` | personeel en dieren |
| `economy.js` | geld, beoordeling, weer, maandoverzicht, doelen |
| `render.js` | camera, tekenen, nacht, weer, minimap |
| `ui.js` | HUD, panelen, invoer |
| `game.js` | spel-loop, kaartgeneratie, opslaan en laden |
| `selftest.js` | automatische test: `public/index.html?test=1&days=30` bouwt een complete camping en spoelt dagen door; `&scenario=start` simuleert een bescheiden beginnerscamping; `&input=1` test de muis- en toetsinvoer (uitvoer in de console) |
