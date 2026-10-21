# Perceelkaart

Percelen kiezen op de kaart en het totaal in ha zien, met bufferstroken langs water.

**Openen:** https://johndeere6110.github.io/perceelkaart/

- Tik op een perceel om het toe te voegen, nog eens tikken haalt het weg.
- **Water zoeken** markeert randen langs BGT-water (sloot = 3 m, greppel/droge sloot = 0 m).
- **Oevers aanwijzen** om een rand zelf om te zetten: nat of kort droogvallend (3 m), lang droogvallend (1 m), droge sloot (0 m).
- Boven 4 % van het perceel rekent hij de strook smaller, zoals RVO (3 m → 1 m → 0,5 m).
- **Sporen** tekent de spuitsporen (standaard 27 m) evenwijdig aan de lange kant, met A en B, genummerde gangen en pijlen heen en weer. Met **Buitenronde eerst** rijd je eerst een ronde langs de rand en gaat de spuit uit bij het bandenspoor daarvan. Per perceel zie je hoe de laatste gang uitkomt.
- **Percelen koppelen** maakt van percelen die tegen elkaar liggen één kavel: één buitenrand, samen het aantal ha, en de spuitsporen over het geheel. Bufferstroken blijven per perceel (zoals RVO). Liggen ze niet tegen elkaar (sloot ertussen), dan wordt het geweigerd.

Bronnen: PDOK (BRP gewaspercelen, BGT waterdeel, achtergrondkaart en luchtfoto). De officiële bufferstroken staan in Mijn percelen bij RVO; deze app is een hulpmiddel.

Lettertype Barlow (SIL OFL, zie fonts/OFL.txt), kaart met Leaflet (BSD-2, zie vendor/leaflet/LICENSE), samenvoegen van percelen met polygon-clipping (MIT, zie vendor/polygon-clipping/LICENSE.md).
