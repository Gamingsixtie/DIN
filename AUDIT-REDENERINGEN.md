# Audit redeneringen Stap 8

Audit-datum: 2026-05-02
Bron: `src/lib/component-redeneringen.ts` (21 entries) + cross-check tegen `src/lib/known-breakdowns.ts`.

## Samenvatting

- Totaal: 21 entries
- Compleet: 9 | Partiaal: 11 | Missing: 1
- Marktconform (OK): 17 | Vlag: 4

**Hoofdbevinding (klacht 1)**: ~57% van de entries heeft GEEN expliciete uitwerking-formule die de berekening sluit met `= € totaal`. Veel entries beschrijven wel het tarief en aantal afzonderlijk, maar laten de tussenstap "(aantal × tarief = subtotaal) + (aantal × tarief = subtotaal) = €totaal" weg, of springen direct naar een afgerond bedrag zonder rekenstap.

**Hoofdbevinding (klacht 2)**: 4 entries dwalen materieel af van de NL-marktbenchmark; 2x te laag (risico: geen interesse), 2x mogelijk te hoog (risico: directeur-vragen).

## Per inspanning

### CRM (data_systemen)

| Component | Volledigheid | Marktcheck | Issue / advies |
|---|---|---|---|
| implementatie | COMPLEET | OK | Formule sluit met "= €225K-€425K". Tarief €150-170/u sluit aan op senior CRM-consultant NL. |
| datamigratie | COMPLEET | OK | "7-8 × €8K-15K + €15K-20K = €71K-140K" — uitwerking sluit. |
| training | COMPLEET | OK | "85 × €350-500 + €10K-15K = €39K-58K" — sluit. |
| licentielast | PARTIAAL | VLAG (te laag) | Berekening eindigt op "€30K-60K" maar herleidt niet expliciet: 6-12 mnd × €4K-5K/mnd = €24K-€60K. Toon de tussenstap. **Marktcheck**: €4K-5K/maand voor 85 gebruikers = ~€47-59/gebr/mnd, dat is aan de **lage kant** van Microsoft-pricing range — past nog binnen, maar voeg toe dat dit de Customer Engagement Pro SKU is (geen Sales Premium-add-ons). |
| licenties | COMPLEET | OK | "85 × €660-780 = €56K-66K → €50K-75K incl. premium" — sluit. |
| beheer | COMPLEET | OK | "0,3 FTE × €100K = €30K/jr" — sluit. |

### Uniforme klantbenadering (processen)

| Component | Volledigheid | Marktcheck | Issue / advies |
|---|---|---|---|
| procesbegeleiding | PARTIAAL | OK | "20 × €800 = €16K basis" sluit, maar "+ 11-30 dagen voor uitrol = €25K-40K" toont het optelresultaat niet. Voeg toe: 11-30 × €800/dag = €9K-€24K → totaal €25K-€40K. |
| sessiebegeleiding | COMPLEET | OK | "9 × €1.700-2.800 = €15K-25K" — sluit. |
| materialen | PARTIAAL | OK | "€2,5K-5K + 4-7 × €700 = ?". Sluit niet expliciet: €2,5K-5K + €2,8K-€4,9K = €5,3K-€9,9K → afgerond €5K-€10K. Voeg de optelling toe. |
| proceseigenaarschap | PARTIAAL | OK | "2-3 dagen/maand × €700-850 = ?" maar geen jaartotaal. Toon: 24-36 dagen/jr × €700-850 = €17K-€31K → maar tekst zegt €10K-15K. **Discrepantie**: aantal-bron noemt 24-36 dagen, dat × tarief geeft duidelijk MEER dan €10K-15K. Of het aantal moet naar ~14-18 dagen, of het bedrag naar ~€20K. **Hier zit een rekenkundige inconsistentie die de programmamanager direct zal zien.** |
| governance | COMPLEET | OK | "12-15 dagen × €700-850 = €8K-12K" — sluit. |
| sectorvariatie | COMPLEET | OK | "10% × €60K = €6K" — sluit. |

### Gespreksvaardigheid (mens)

| Component | Volledigheid | Marktcheck | Issue / advies |
|---|---|---|---|
| lms-licentie | PARTIAAL | OK | "5+ jr × ~€6K = €30K". Sluit, maar "vooruitbetaalkorting" wordt genoemd zonder %. Klein detail. |
| content-ontwikkeling | COMPLEET | OK | "25-30 × €850 = €21K-25K" — sluit. |
| train-de-trainer | PARTIAAL | OK | "12 × €833 = €10K" sluit, maar de €833 zelf is afgeleid uit "€5.000/dag × 2 dagen ÷ 12" — die is **niet expliciet getoond**. Voeg toe: 2 dagen × €5.000/dag = €10.000 totaal ÷ 12 deelnemers = €833/persoon. |
| nulmeting | PARTIAAL | OK | "80 × €100 + 4 × €500 = €8K + €2K = €10K". Sluit niet stapsgewijs. Voeg de twee subtotalen apart toe vóór het totaal. |
| kerntraject | PARTIAAL | VLAG (mogelijk te laag) | Berekening "10 dagen × €2.500 = €31,5K per blok × 2 = €63K" klopt niet rekenkundig: 10 × €2.500 = €25.000, niet €31.500. **Rekenfout**. Of: 12,6 dagen × €2.500 = €31.500 — aantal moet kloppen. **Marktcheck**: €2.500/dag voor outside-in B2B-trainer met onderwijs-context zit aan de **onderkant** van benchmark (€2.500-3.500/dag). Voor senior-trainer met sector-specifieke expertise (PO/VO/Zakelijk gemixt) reken op €3.000-3.500/dag. Bij 80 deelnemers in 8 groepen × 2 blokken á 2 dagen = 32 trainerdagen, niet 20. **Advies: hercontroleer aantal trainerdagen — formule sluit nu niet.** |
| sessieondersteuning | PARTIAAL | OK | "Locatie €5K + materialen €5K + coördinatie 8 × €850 = €6,8K → totaal €17K". Sluit niet (€5K + €5K + €6,8K = €16,8K, prima rond), maar de formule presenteert 3 losse bedragen zonder eindsom. Voeg expliciete optelregel toe. |
| refresh | PARTIAAL | OK | "3-4 × €4K = €12K-€16K" — uitwerking ontbreekt. Tekst zegt €12K-€18K, dat klopt niet met 3-4 × €4K (max €16K). Pas aan: "3-4 sessies × €3.500-4.500 = €10.500-€18.000 → €12K-€18K". |
| onboarding | COMPLEET | OK | "8-12 × €400-600 = €3K-7K" — sluit. |

### Leiderschap (cultuur)

| Component | Volledigheid | Marktcheck | Issue / advies |
|---|---|---|---|
| executive-tarief | PARTIAAL | VLAG (mogelijk te hoog) | "5 × €4.000 = €20K" sluit, maar dit is een **opslag bovenop** de €37.500 basis (15 × €2.500). Totaal voor leiderschap-coaching wordt dan €57.500. **Marktcheck**: €4.000/dag voor executive-coach NIP-register zit aan de **bovengrens**; dat is verdedigbaar voor MT-niveau, maar onderbouw expliciet wáárom de basis-coach niet volstaat (anders lijkt dit dubbel betalen). |
| hr-instrumentarium | PARTIAAL | OK | "€6K-10K + 5-10 × €850 = €4,3K-€8,5K → totaal €10K-€18K → €15K". Sluit grotendeels, maar het sprong van range €10K-€18K naar het puntbedrag €15K wordt niet gemotiveerd. Voeg toe: "midpoint, omdat scope MT-laag (9+2) gemiddeld is". |

**Missing voor leiderschap (klacht-relevant)**: De motivatie-tekst noemt blijkbaar formules (15 × €2.500 = €37.500, 9 × €4.000 = €36.000) die de parser uit motivatie haalt — maar voor componenten ZONDER zo'n formule in de tekst (zoals "MT-coaching algemeen", "leiderschapsdiagnose") staat **geen** redenering in dit bestand. Als known-breakdowns.ts of de parser daar niets oplevert, valt de gebruiker terug op een raw bedrag zonder uitwerking. **Aanbeveling**: voeg minimaal 1-2 extra leiderschaps-componenten toe.

## Concrete fixes (priority)

1. **CRITICAL — proceseigenaarschap (uniforme)**: rekenkundige inconsistentie tussen aantalBron (24-36 dagen) en eindbedrag (€10K-15K). Kies één: óf bedrag verhogen naar ~€17K-€31K, óf aantal verlagen naar ~14-18 dagen/jr. Voorbeeld correcte tekst: `"Continuïteitsondersteuning ~14-18 dagen/jr × €700-850/dag = €10K-€15K/jaar (proceseigenaren 3 sectoren samen)"`.

2. **CRITICAL — kerntraject (gesprek)**: `10 × €2.500 = €25.000`, niet €31.500. Rekenfout. Voorbeeld correcte tekst: `"Per blok: 10-13 trainerdagen × €2.500-3.000/dag = €25K-€39K → afgerond €31,5K per blok × 2 blokken = €63K voor 80 deelnemers"`. **Tarief-marktcheck**: overweeg of €2.500/dag realistisch is voor outside-in onderwijs-trainer; benchmark suggereert €2.500-3.500.

3. **HIGH — train-de-trainer**: voeg de 2-staps afleiding toe. Voorbeeld: `"ToT 2 dagen × €5.000/dag externe trainer = €10.000 totaal ÷ 12 deelnemers = ~€833/persoon → totaal €10K"`.

4. **HIGH — refresh**: bereken-range klopt niet (3-4 × €4K = max €16K, niet €18K). Pas aan naar bandbreedte tarief: `"3-4 sessies × €3.500-4.500/sessie = €10,5K-€18K/jaar → €12K-€18K (afgerond)"`.

5. **MEDIUM — alle PARTIAAL entries**: standaardiseer formule-template `[aantal-1] × [tarief-1] = [subtotaal-1] + [aantal-2] × [tarief-2] = [subtotaal-2] + ... = [eindbedrag]`. Niet alleen omschrijving + eindbedrag.

6. **MEDIUM — licentielast (CRM)**: vermeld expliciet de SKU (Customer Engagement Pro vs Sales Premium) want bij Pro is €4K-5K/mnd voor 85 gebruikers aan de onderkant; bij Sales Premium is het ondergrens-onhaalbaar.

7. **LOW — executive-tarief (leiderschap)**: motiveer waarom dit bovenop basistarief komt en niet ipv. Anders ogen dit als dubbele kosten.

8. **LOW — leiderschap aanvullen**: voeg 1-2 extra componenten toe (MT-coaching, leiderschapsdiagnose) voor situaties waar parser geen formule uit motivatie haalt.

## Onzekerheid in benchmarks

- LMS NL-pricing (TalentLMS/AbsorbLMS) is sterk volume-afhankelijk; €5K-7K/jr voor 80 gebruikers is plausibel maar niet hard-bevestigd voor outside-in modulair gebruik.
- "Pentapower"-benchmark in kerntraject-tariefBron herken ik niet als gevestigde benchmark; verifieer of dit een echte bron is, anders schrappen.
- 360°-tool config €6K-10K eenmalig is afhankelijk van rapportage-aanpassingen; voor standaard NL-tools (Effectory) kan dit ook €3K-5K zijn.
