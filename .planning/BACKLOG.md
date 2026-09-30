# Backlog

Verbeteringen die zijn afgesproken maar nog niet gebouwd. Per item: wat, waar, en wat het vraagt. Oppakken via `/gsd:quick`.

## Stap 11 "Programma × 3sides", uit het doornemen met Pim op 30-09-2026

Alle punten volgen uit het punt-voor-punt doornemen van de analyse. Skill `din-model-toets` altijd laden bij het oppakken.

### A. Inhoud (tekst in `src/lib/integratie-3sides-default.ts`)

1. **Deel 1 "De kern" uitgebreid toelichten.** Nu alleen een kader en een tabel. Gevraagd: een volledige toelichting op het geheel: waar het programma staat (drie maanden 3sides, vier werkstromen), wat het DIN in gewone taal is, waarom de structuur staat (met bron), wat er knelt (concretiseren, overlap, onduidelijke rollen), hoe de rollen in het framework dat oplossen, wat dit stuk doet per deel en hoe je de plaat gebruikt bij nieuwe vragen (toets op domein en vermogensdeel).
2. **"Wie doet wat": rol domeineigenaar concreet maken.** "Laten het werken in de lijn" is te dun. Uitschrijven wat een domeineigenaar precies doet, gesourcet uit `src/lib/organigram-default.ts` (beslist over de uitwerking in het eigen domein, landing in de lijn, op uitnodiging in de stuurgroep bij besluiten over het domein, geen Cito-lead van hetzelfde domein) en het stappenplan (inspanningsleider en team per domein mét de domeineigenaar bepalen, stand per domein voor de 0-meting).
3. **"Staat de structuur?": tegenstrijdigheid oplossen.** De rij "Werkstromen" zegt "elk met een plan van aanpak van 3sides" (staat erin) en de rij "Plan van aanpak per werkstroom" zegt "deels". Scherp neerzetten: de vier werkstromen zijn afgesproken (structuur staat); 3sides beschreef per werkstroom doel, resultaten, aanpak en planning; wat het programma nog toevoegt is output-KPI, capaciteit van Cito, eigenaar en bij adoptie de scope.
4. **Meetmodel: KPI's op vermogensniveau en werkstroomniveau nadrukkelijk benoemen.** Een eigen tabel "KPI's per niveau" met concrete KPI's: vermogen-KPI's (kernprincipe-score 1–10 per kernprincipe, stand per domein AS-IS → TO-BE, kandidaat-indicatoren na de 0-meting, als voorstel) en werkstroom-KPI's (output-KPI per werkstroom uit het organigram, veld `outputKpi`, gelabeld "tot nu toe besproken; definitief uit het plan van aanpak").
5. **Al lokaal aangepast, nog niet live:** deel 1, tabel "wat nu knelt", rij 2 en 3 staan nu op vermogens- en domeinniveau (toets op vermogensdeel, niet op baat). Meenemen in de eerstvolgende deploy.

### B. De plaat (`src/components/bewerkbaar/BewerkbaarDocument.tsx`, `DinPlaatBlok`)

6. **Regieband over de keten duidelijker maken.** Mensen lezen er nu overheen. Bijvoorbeeld een Cito-blauwe band met witte tekst en een verticale lijn langs alle niveaus, zodat zichtbaar is dat programmamanagement over de hele keten gaat.
7. **Plaat als "Miro": blokken toevoegen, wijzigen en verwijderen.** In bewerkmodus baten, domeinen en werkstromen kunnen toevoegen en weghalen, en per werkstroom de domeinen aanvinken. Nu is alleen de tekst aanpasbaar.
8. **Dynamisch framework: koppelingen per werkstroom.** Vanuit de plaat en de werkstroomkaarten links naar de documenten van 3sides die bij die werkstroom horen, en een link naar het Jira-bord zodra dat er is, zodat status en documentatie altijd te vinden zijn. Vraagt: veld `koppelingen: [{label, url}]` op de werkstroomkaart (schema in `src/lib/schemas.ts`), bewerkbaar in de app; weergave in `WerkstroomKaartenBlok.tsx` en een kleine verwijzing in de plaat.

### C. Paginaverwijzingen als echte links

9. **Elke paginaverwijzing ("plan van aanpak p. 10–11") wordt een link naar het document op de juiste pagina.** Vraagt een vindplaats voor de documenten, en dat is een keuze van Pim:
   - de 3sides-documenten in de app zetten (`public/`): dan zijn ze bereikbaar voor iedereen met de link, want de app heeft geen login; of
   - een SharePoint- of Teams-map: dan opent de link het bestand, maar de paginasprong werkt daar meestal niet.
   Bouw: een instelling "documentenmap" en "Jira-bord" in de sessie (`koppelingen` in het sessieschema), invulbaar in stap 11; in de weergave herkent de app documentnamen met paginanummer of tabblad en maakt er links van (`<basis>/<bestand>#page=N` voor pdf's). Bestandsnamen: plan van aanpak = `Cito_-_Plan_van_Aanpak.pdf`, meetinstrument = `0-meting_meetinstrument_-_WiP.pdf`, adoptieframework = `Cito_DIN_Adoptie_Framework_-_WiP.pdf`, BV-dag = `BV-dag-229-final.pdf`, blueprint = `Blueprint_Klantreis_-_Draft.xlsx`, tijdlijn = `Cito_-_Project_tijdlijn_-_Klant_in_zicht.xlsx`, datapunten = `Data_punten_ter_input_KPI.xlsx`, Data & Tech = `Cito_Data_&_Tech.pdf`, praatplaten = `Praatplaat_Marketing__Sales_funnel.pdf` en `Praatplaat_Marketing__Sales_proces.pdf`, evaluatie = `Evaluatie_Klant_in_Beeld.xlsx`.

### Volgorde bij oppakken

A3, A4, A5 en A2 zijn tekstwerk en kunnen in één deploy. A1 is schrijfwerk en hoort in dezelfde ronde. B6 en B7 gaan naar de plaat-agent, B8 naar de kaarten-agent, parallel. C9 pas na de keuze van Pim over de vindplaats.
