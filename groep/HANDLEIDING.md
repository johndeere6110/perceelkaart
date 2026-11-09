# Groep instellen (Google Sheet)

De Perceelkaart kan namen (een boer met zijn percelen) delen met een groep: welke percelen, de grens, kavels, AB-keuzes,
zelf aangewezen oevers en de kunstmest (l/ha, notities, gedaan). Iedereen in de groep kan een naam aanpassen; de app
voegt het per perceel samen. Alles komt in één Google Sheet; de app stuurt en haalt op via een klein script in die sheet.
Eenmalig instellen, daarna gaat het vanzelf. Dit is een aparte groep, los van die van de Zaaihulp.

Wat niet gedeeld wordt: de vorm van de percelen (haalt elke telefoon zelf op), gevonden water (Water zoeken doet elke
telefoon zelf), offline kaarten en de instellingen (spuitbreedte, tank enz.).

## 1. Sheet maken
1. Log in bij Google, het liefst met een apart account voor de groep (bv. hetzelfde account als voor de Zaaihulp-groep).
2. Ga naar [sheets.new](https://sheets.new). Geef de sheet een naam, bv. **Perceelkaart groep**.

## 2. Script erin zetten
1. In de sheet: **Uitbreidingen → Apps Script** (in sommige versies heet het menu **Extensies**).
2. Haal de voorbeeldtekst weg en plak de inhoud van [`apps-script.gs`](apps-script.gs). Klik op opslaan (schijfje).
3. Links: **Projectinstellingen** (tandwiel) → onderaan **Scripteigenschappen** → **Scripteigenschap toevoegen**:
   - Eigenschap: `GROEPSCODE`
   - Waarde: een code die je zelf verzint, bv. `percelen-noordholland-26`. Niet te kort: wie de code kent, kan schrijven.
     Liefst een andere code dan die van de Zaaihulp-groep.

## 3. Publiceren als web-app
1. Rechtsboven **Implementeren → Nieuwe implementatie**.
2. Type (tandwiel): **Web-app**.
3. Uitvoeren als: **Ik**. Wie heeft toegang: **Iedereen**.
4. **Implementeren**. Google vraagt toestemming: kies je account → *Geavanceerd* → *Ga naar … (onveilig)* → *Toestaan*.
   (Google waarschuwt omdat het een eigen script is; het script kan alleen bij deze ene sheet.)
5. Kopieer de **URL van de web-app** (eindigt op `/exec`) en stuur die naar de ontwikkelaar van de app. Die zet hem
   vast in de app; daarna hoeft niemand meer iets met die URL te doen.

## 4. Meedoen
- In de app, tabblad **Bedrijven** → onderaan **Groep** → *Meedoen met de groep*, je naam en de groepscode invullen.
- Of: één persoon tikt op **Stuur groepslink** en stuurt die naar de rest. Wie de link opent, doet meteen mee
  (alleen zijn naam nog invullen).
- Alle namen op je telefoon gaan naar de groep, en die van de anderen komen erbij. Een naam die al bestond
  (zelfde naam) wordt samengevoegd.

## Hoe het samenvoegen werkt
- Per naam en per perceel: wat alleen jij veranderde gaat naar de groep, wat alleen een ander veranderde komt bij jou.
- Veranderden twee mensen hetzelfde (bv. allebei de l/ha van hetzelfde perceel), dan wint wie het laatst bijwerkt.
- Haalt iemand een naam weg, dan verdwijnt hij bij iedereen. Paste iemand anders hem intussen aan, dan komt hij terug.
- De app werkt vanzelf bij als je hem opent of terughaalt van de achtergrond, elke 5 minuten zolang hij openstaat, en
  een paar seconden na een wijziging. Meteen: **Nu bijwerken**.

## Beheer
- Alles staat in het blad **data**, één regel per naam. Kolom *omschrijving* is leesbaar, kolom *data* is voor de app,
  kolom *van* is wie hem het laatst aanpaste.
- Het blad **namen** is een overzicht om te lezen (wordt na elke keer bijwerken opnieuw gemaakt). Meteen zien: in de
  Apps Script-editor de functie `overzichtNu` kiezen en *Uitvoeren*.
- **Een naam bij iedereen weghalen:** zet in kolom **weg** bijvoorbeeld `ja`. Bij het volgende bijwerken is hij bij
  iedereen weg, ook als een telefoon hem later opnieuw stuurt. Terugzetten: kolom *weg* weer leegmaken.
- **Definitief opruimen:** een regel met `verwijderd` mag je helemaal weghalen (rechtsklik op het rijnummer → *Rij
  verwijderen*).
- **Script aangepast?** Implementeren → *Implementaties beheren* → potloodje → Versie: *Nieuwe versie* → Implementeren.
  Zo blijft de URL hetzelfde.
- **Code veranderen:** pas `GROEPSCODE` aan bij de scripteigenschappen. Iedereen moet dan de nieuwe code invullen
  (of een nieuwe groepslink krijgen).
