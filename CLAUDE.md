# Perceelkaart
Web-app om percelen te kiezen op de kaart (PDOK BRP gewaspercelen), het totaal in ha te zien en bufferstroken langs water af te trekken. Basis voor een latere kunstmest-app; los van de Zaaihulp.
- index.html bevat de pagina (HTML, CSS en JS in één bestand). Geen build-stap, geen frameworks.
- perceel.js is een losse module zonder afhankelijkheden (PDOK, oppervlakte, zijden, water). Wordt hij in een andere app gekopieerd, verhoog dan het versienummer bovenin.
- Leaflet en de lettertypen staan in vendor/ en fonts/: niets van een CDN of Google laden.
- Taal in de app: Nederlands, komma als decimaalteken.
- Gegevens staan in localStorage (sleutels kaartTest*, perceelCache). Verander bestaande sleutels niet. Let op: deze app deelt de opslag met de Zaaihulp (zelfde github.io-domein).
- Gebruik geen alert() of confirm(); gebruik armed() en een hint-tekst.
- Bij elke wijziging: verhoog het versienummer in de kop van index.html (versie 1 -> 2 enz.).
- Push direct naar main, zonder pull request.
