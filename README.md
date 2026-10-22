# Perceelkaart

Percelen kiezen op de kaart en het totaal in ha zien, met bufferstroken langs water.

**Openen:** https://johndeere6110.github.io/perceelkaart/

- Tik op een perceel om het toe te voegen, nog eens tikken haalt het weg.
- De oppervlakte wordt vlak in RD (Rijksdriehoeksstelsel) berekend, net als RVO en Boer&Bunder. Tot versie 19 rekende de app over de bol en kwam dan ~0,16 % te laag uit (10,587 in plaats van 10,604 ha).
- Bij het openen (met bereik) kijkt de app of PDOK voor een bewaard BRP-perceel een nieuwer jaar heeft. Zo ja, dan staat bij dat perceel "BRP 2026 beschikbaar" met het verschil in ha en een knop **Overstappen**. Oevers en gevonden water horen bij de oude grens en vervallen dan.
- **Grenzen:** kies tussen het BRP-gewasperceel (zoals ingetekend bij de Gecombineerde opgave) en het referentieperceel (RVO, afgeleid van de BGT: de kavel tot de slootkant, meestal nauwkeuriger). De knop zet ook de percelen om die al gekozen zijn. Per perceel zie je de oppervlakte van de andere grens en wissel je met één tik (**Wissel naar referentieperceel / BRP-perceel**); oevers en gevonden water horen bij een grens en komen terug als je terugwisselt. Omvat één referentieperceel twee gekozen BRP-percelen, dan waarschuwt de app dat het totaal dubbel telt.
- **Water zoeken** markeert randen langs BGT-water (sloot = 3 m, greppel/droge sloot = 0 m). De strook gaat vanaf de insteek van het talud: BGT waterdeel (het water) en BGT ondersteunend waterdeel (oever, slootkant) samen, de buitenrand daarvan is de insteek. Alleen het deel binnen het perceel telt, want de perceelgrens ligt niet precies op de insteek; het talud zelf telt niet als strook. Staat er bij een sloot geen talud in de BGT, dan rekent hij vanaf de waterlijn en zegt hij dat erbij. Per perceel zie je hoeveel m² strook binnen het perceel valt (om te vergelijken met RVO of Boer&Bunder) en wat het vanaf de perceelrand zou zijn. Het talud staat licht bruin op de kaart.
- Zelf aangewezen oevers (**Oevers aanwijzen**) rekenen vanaf de perceelrand: lengte × breedte.
- **Oevers aanwijzen** om een rand zelf om te zetten: nat of kort droogvallend (3 m), lang droogvallend (1 m), droge sloot (0 m).
- Boven 4 % van het perceel rekent hij de strook smaller, zoals RVO (3 m → 1 m → 0,5 m).
- **Sporen** tekent de spuitsporen (standaard 27 m) evenwijdig aan de lange kant, met A en B, genummerde gangen en pijlen heen en weer. Met **Buitenronde eerst** rijd je eerst een ronde langs de rand en gaat de spuit uit bij het bandenspoor daarvan. Per perceel zie je hoe de laatste gang uitkomt.
- **Percelen koppelen** maakt van percelen die tegen elkaar liggen één kavel: één buitenrand, samen het aantal ha, en de spuitsporen over het geheel. Bufferstroken blijven per perceel (zoals RVO). Liggen ze niet tegen elkaar (sloot ertussen), dan wordt het geweigerd.

Bronnen: PDOK (BRP gewaspercelen, RVO referentiepercelen, BGT waterdeel en ondersteunend waterdeel, achtergrondkaart en luchtfoto). De officiële bufferstroken staan in Mijn percelen bij RVO; deze app is een hulpmiddel.

Lettertype Barlow (SIL OFL, zie fonts/OFL.txt), kaart met Leaflet (BSD-2, zie vendor/leaflet/LICENSE), samenvoegen van percelen met polygon-clipping (MIT, zie vendor/polygon-clipping/LICENSE.md).
