# Perceelkaart
Web-app om percelen te kiezen op de kaart (PDOK BRP gewaspercelen), het totaal in ha te zien en bufferstroken langs water af te trekken. Basis voor een latere kunstmest-app; los van de Zaaihulp.
- index.html bevat de pagina (HTML, CSS en JS in één bestand). Geen build-stap, geen frameworks.
- perceel.js is een losse module zonder afhankelijkheden (PDOK, oppervlakte, zijden, water). Wordt hij in een andere app gekopieerd, verhoog dan het versienummer bovenin.
- Leaflet en de lettertypen staan in vendor/ en fonts/: niets van een CDN of Google laden.
- Taal in de app: Nederlands, komma als decimaalteken.
- Gegevens staan in localStorage (sleutels kaartTest*, perceelCache). Verander bestaande sleutels niet. Let op: deze app deelt de opslag met de Zaaihulp (zelfde github.io-domein).
- Groep (namen delen): groep/apps-script.gs in een eigen Google Sheet, web-app-URL in GROEP_URL_VAST in index.html (los van de Zaaihulp-groep). Opslag: kaartGroep (naam, code, apparaat), kaartGroepBasis (laatste gezamenlijke stand per naam, om samen te voegen), kaartGroepData. Bewaarde metingen gaan ook mee (soort "meting", id "meting:<id>", basis in kaartGroepBasis.m). Niet de sleutels groep*/groepUrl gebruiken: die zijn van de Zaaihulp.
- Bemesten: kunstmest per perceel q.km {lha, noti, gedaan} en per naam n.km {wat, lha (standaard), noti}; mest hetzelfde in q.mest / n.mest (lha = m³/ha). De code in het tabblad werkt met q[KV] (KV = "km" of "mest"). Grenzen: kunstmest ≥ 50 l/ha (of 0); mest > 200 m³/ha alleen na "Ja, klopt". Instellingen: kaartBemSoort, kaartTankL, kaartTankM3, kaartKmZoom, kaartKmLabel.
- Meten (tabblad, los van percelen): concept in kaartMetConcept (lijst stukken; vroeger één ring), bewaarde metingen in kaartMetingen ({id, naam, ts, vlakken (vroeger ring), m2, zaad}), laatste zaadinstelling in kaartMetZaad ({mengsel, manier nieuw|door, waarde, extra, zak}), mengsellijst met kg/ha per manier in kaartMetMengsels.
- Offline kaarttegels staan in de cache "tegels-perceelkaart" (Cache Storage); sw.js geeft ze. Die naam mag niet met "perceelkaart-" of "zaaihulp-" beginnen, want die caches ruimen de service workers bij een update op.
- Gebruik geen alert() of confirm(); gebruik armed() en een hint-tekst.
- Bij elke wijziging: verhoog het versienummer onderaan index.html ("versie 1" -> 2 enz., in de .voet) én in sw.js (perceelkaart-v1 -> v2), anders krijgen geïnstalleerde apps de update niet.
- Eigen app-identiteit: manifest.webmanifest met "id": "/perceelkaart/". Niet veranderen, anders ziet de telefoon hem als een andere app. De Zaaihulp heeft "/zaaihulp/".
- brp2026/ bevat tegels met de concept-BRP van het lopende jaar voor één regio (index.json + i_j.json, compact formaat v2: zie tools/brp-regio.py en tegelUit in perceel.js), gemaakt met tools/brp-regio.py uit de PDOK-download. Houd de map klein: GitHub Pages brak bij 100 MB af op de 10-minutengrens. Verversen: script opnieuw draaien met hetzelfde RD-vak. Is het jaar definitief live in PDOK, dan kan de map weg (en de regel Perceel.gebruikRegio in index.html).
- Push direct naar main, zonder pull request.
