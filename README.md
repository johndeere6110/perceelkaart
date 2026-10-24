# Perceelkaart

Percelen kiezen op de kaart met het totaal in ha, bufferstroken langs water, spuitsporen, een zaaiplan voor mais en AB-lijnen uitmeten. Werkt op je telefoon.

**Openen:** https://johndeere6110.github.io/perceelkaart/
**Installeren of doorsturen:** https://johndeere6110.github.io/perceelkaart/installeren.html (ook via **Stuur installatielink** onderaan in de app, en onderaan de installatiepagina van de [Zaaihulp](https://johndeere6110.github.io/zaaihulp/installeren.html))

## Percelen en oppervlakte

- Tik op een perceel om het toe te voegen, nog eens tikken haalt het weg.
- De oppervlakte wordt vlak in RD (Rijksdriehoeksstelsel) berekend, net als RVO en Boer&Bunder.
- **Grenzen:** BRP-gewasperceel (zoals ingetekend bij de Gecombineerde opgave) of referentieperceel (RVO, uit de BGT: de kavel tot de slootkant). De knop zet ook de al gekozen percelen om. Per perceel zie je de andere grens met het verschil in ha en wissel je met één tik; oevers en gevonden water horen bij een grens en komen terug als je terugwisselt. Overlappen percelen (één referentieperceel over twee BRP-percelen), dan waarschuwt de app dat het totaal dubbel telt.
- **Nieuwer BRP-jaar:** bij het openen (met bereik) kijkt de app of PDOK voor een bewaard perceel een nieuwer jaar heeft, met het verschil in ha en een knop **Overstappen**.
- **Percelen koppelen** maakt van percelen die tegen elkaar liggen één kavel: één buitenrand en de spuitsporen over het geheel. Een pad of naad tot ongeveer 3,5 m ertussen mag; dat telt niet mee in de ha. Ligt er een sloot tussen, dan wordt het geweigerd. Bufferstroken blijven per perceel (zoals RVO).

## Bufferstroken langs water

- **Water zoeken** markeert randen langs BGT-water (sloot = 3 m, greppel/droge sloot = 0 m). De strook gaat vanaf de **insteek van het talud**: BGT waterdeel en BGT ondersteunend waterdeel (oever, slootkant) samen, de buitenrand daarvan is de insteek. Alleen het deel binnen het perceel telt; het talud zelf niet. Geen talud in de BGT: dan vanaf de waterlijn, en dat staat erbij. Per perceel zie je de m² strook binnen het perceel (om te vergelijken met RVO of Boer&Bunder) en wat het vanaf de perceelrand zou zijn. Het talud staat licht bruin op de kaart.
- **Oevers aanwijzen:** zelf een rand omzetten naar nat of kort droogvallend (3 m), lang droogvallend (1 m) of droge sloot (0 m). Zelf aangewezen oevers rekenen vanaf de perceelrand.
- Boven 4 % van het perceel wordt de strook smaller, zoals bij RVO (3 m → 1 m → 0,5 m).
- **Langs water erbij** (per perceel, 0/1/2/3 m): ligt de BRP-grens al op de bufferstrook maar wordt er dichter bij het water geteeld, dan telt lengte waterkant × breedte bij de oppervlakte (voor zaaizaad e.d.; die strook valt wel in de bufferstrook).

## Spuiten en mais zaaien

Twee knoppen, los aan/uit: **Spuiten** en **Mais zaaien**. Alleen de velden en tekeningen van wat aan staat zijn te zien.

**Spuiten**
- Spuitsporen (standaard 27 m) evenwijdig aan de lange kant, met A en B, genummerde gangen, koers in graden en de coördinaten van A en B.
- **Buitenronde eerst:** eerst een ronde langs de rand, de spuit gaat uit bij het bandenspoor daarvan. Per perceel zie je hoe de laatste gang uitkomt, in hele secties.
- **AB-kant kiezen** (naast AB-lijn meten): tik bij de kant van een gekozen perceel of kavel waar de AB-lijn langs moet.
- **Eigen AB-lijn** (bijv. langs een pad midden in het perceel): zet A en B bij **AB-lijn meten** en tik **Gebruik als AB-lijn voor perceel …**. Standaard is die lijn een spuitpad (de gangen liggen op hele spuitbreedtes ervan); onder de spuituitleg om te zetten naar "spuit begint naast de lijn". **AB weer automatisch** zet het terug.
- Steekt een deel van het perceel voorbij de AB-lijn uit, dan lopen de gangen daar door op dezelfde GPS-lijnen.

**Mais zaaien** (zaaiplan op dezelfde AB-lijn)
- Instellingen: zaaibreedte (6 m), rijafstand (37,5 cm, dus 16 rijen), zaairondes eromheen (bijv. 3) en de richting (met of tegen de klok), spoorbreedte van de spuit (snel kiezen: 1,50 of 1,80) en bandbreedte.
- Rijpatroon standaard **spuitpaden eerst**: na de rondes de spuitpaden achter elkaar in rondjes (om en om heen en terug) met de kast vast op het pad, daarna de rest met de kast vast op een teller zonder pad. Bij 27 m op 6 m zit het pad zo elke keer op dezelfde rijen (10 + 15 bij spoor 1,80). Onder "Uitleg" om te zetten naar heen en weer, en pad links of rechts op de zaaier.
- Onder het perceel in een paar korte regels: rondes, spuitpaden (teller en rijen), rondjes (GPS-lijnen en richting) en daarna. Uitleg, de tabel met alle gangen (lijn, teller, rijrichting, rijen dicht) en de **AB-lijn voor de zaaier** (lijn 0 = hart van gang 1) zitten achter "Uitleg".
- Ritme van de zaaicomputer: bij 27 m op 6 m ritme 18 (2 × 9, om en om gespiegeld) met spuitpad bij teller 3, 7, 12, 16. Gecontroleerd met een Kverneland Optima (rijen 10 en 15).
- Op de kaart: spuitpaden als gele strook met het lijnnummer, de startgang oranje met een pijl, de ronde met het spuitpad paars. Met **Zaaigangen: aan** ook het hart van elke zaaigang en elke zaaironde als stippellijn, en in een wit rondje hoeveel banen er tussen de spuitpaden zitten (bij 27 m op 6 m om en om 3 en 4). Uitgezoomd alleen START en de ronde.

## AB-lijn meten

Tik A en B op de kaart, sleep ze (alles rekent live mee), tik coördinaten in (`52.68, 5.20` of `52,68 5,20`) of gebruik GPS. Je ziet de koers A → B en terug (4 decimalen, ware noorden), de afstand, het midden en de coördinaten, en optioneel dezelfde lijn een aantal meter naar links of rechts.

De koers wordt gerekend zoals de GPS-kast: met de aarde als bol. Vergeleken met de terminal op twee percelen (47,321° en 244,672°) scheelde het daarna nog ±0,02°, het tikken van A en B. Op de afgeplatte aarde (zoals de Geocaching Toolbox) komt een schuine lijn tot ~0,07° hoger uit; een noord-zuidlijn scheelt bijna niets.

## Overig

- **Tablet:** liggend staat de kaart links over de volle hoogte en de bediening rechts in een eigen kolom; staand is de kaart groter.
- Alleen de kaart zoomt (tot zoom 22; boven 19 wordt de luchtfoto vergroot), niet de hele pagina.
- Alles blijft op je eigen telefoon. De app deelt de opslag met de Zaaihulp (zelfde domein), met eigen sleutels.
- Onderaan staat **Zaaihulp openen**; de Zaaihulp heeft op het startscherm een knop naar de Perceelkaart. De installatiepagina's verwijzen naar elkaar: één link sturen is genoeg om allebei te installeren.

Bronnen: PDOK (BRP gewaspercelen, RVO referentiepercelen, BGT waterdeel en ondersteunend waterdeel, achtergrondkaart en luchtfoto). De officiële bufferstroken staan in Mijn percelen bij RVO; deze app is een hulpmiddel.

Lettertype Barlow (SIL OFL, zie fonts/OFL.txt), kaart met Leaflet (BSD-2, zie vendor/leaflet/LICENSE), samenvoegen van percelen met polygon-clipping (MIT, zie vendor/polygon-clipping/LICENSE.md), QR-code op de installatiepagina met qrcodejs (MIT, zie vendor/qrcodejs/LICENSE).
