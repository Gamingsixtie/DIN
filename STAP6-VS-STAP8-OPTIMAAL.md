# Stap 6 vs Stap 8 — OPTIMAAL (7 jaar)

## Samenvatting

| # | Inspanning | Bedrag stap 6 | Bedrag stap 8 | Motivatie-tekst | Verdeling/jaar | Advies |
|---|---|---|---|---|---|---|
| 1 | CRM (data_systemen) | €1.095.000 | €1.095.000 | Aansluit (mid €540K + €92,5K/jr) | Identiek | Consistent |
| 2 | Gespreksvaardigheid (mens) | €222.500 | €222.500 | **Mismatch** — zegt "vast eenmalig €75K" + "kerntraject €80K" = €155K-mid; stap 8 toont known-breakdown €125–160K mid €142,5K | Identiek | **Tekst herschrijven** |
| 3 | Uniforme processen (processen) | €150.000 | €150.000 | **Mismatch** — zegt "eenmalig €55–70K (mid €62K)"; stap 8 known-breakdown €70–86K mid €78K | Identiek | **Tekst herschrijven** |
| 4 | Leiderschap (cultuur) | €161.000 | €161.000 | Aansluit op bedragen (€37,5K + €20K + €36K + €15K = €108,5K eenmalig); maar **disclaimer ontbreekt in stap 6** terwijl stap 8 de bruto/out-of-pocket-mismatch wel toelicht | Identiek | Disclaimer toevoegen |
| 5 | Post onvoorzien | €140.000 | €140.000 | Beschrijft cap-headroom logica, sluit aan | Identiek | Consistent |

**Hoofdbevinding**: De **bedragen** sluiten in stap 6 en stap 8 1-op-1 op elkaar (beide lezen `session.crossAnalyseWizard.stepResults.stap4.begrotingAdvies.scenarios.optimaal`). De **verdelingPerJaar** is 100% identiek. **Maar de motivatie-tekst per inspanning bevat verouderde getallen** voor 2 van de 4 hoofdinspanningen — die getallen sluiten niet meer aan op de breakdown in stap 8 (die uit `known-breakdowns.ts` komt en 1-op-1 op het scenario-totaal sluit).

**Belangrijke nuance**: stap 6 (`StapOptimaliseren.tsx`) **rendert de motivatie-tekst per inspanning NIET** in de scenario-tabel. Zoek in het bestand: `insp.motivatie` komt nergens voor. Stap 6 toont alleen `samenvatting`, `prioriteitAdvies`, en de verdelingPerJaar-cellen met `fase` en `activiteit`. De motivatie-tekst zit dus wel in de session-data en wordt mee-gepersist (en verschijnt in een eventuele export), maar de gebruiker ziet hem NU niet in stap 6 op het scherm. **Hij ziet hem wél in stap 8** via `MotivatiePaneel` in `BerekeningenStep.tsx` regel 808.

Conclusie: visueel ziet de directeur **geen** mismatch in stap 6 zelf. Maar zodra de motivatie als bron wordt gebruikt (export-document, AI-finetune-prompts die "TEKST_ONLY" verwijzen naar deze motivatie, of toekomstige UI die hem wél toont) ontstaat een tegenstelling. Ook stap 8 (C2 MotivatiePaneel) toont vandaag al verouderde tekst die haaks staat op de C2/C3-componentbreakdown eronder.

---

## Per inspanning

### 1. CRM — €1.095.000 (data_systemen)

- **Totaal stap 6 vs stap 8**: identiek — €1.095.000 (€540K eenmalig + €555K cumulatief structureel = €1.095K). Sluit op known-breakdown.
- **Motivatie-tekst**: zegt "eenmalig € 440.000 – € 640.000 ... middenpunt circa € 540.000; plus structureel € 92.500 per jaar voor licenties (~€ 63.000) en beheer plus doorontwikkeling (~ € 30.000)". Stap 8 known-breakdown CRM eenmalig €440–640K mid €540K + structureel €75–110K mid €92,5K. **Volledig consistent.**
- **Verdeling per jaar (2026–2032)**: €173K, €176K, €153K, €180K, €150K, €138K, €125K = €1.095.000. Som klopt. Stap 8 toont identieke cellen.
- **Advies**: Consistent — geen actie nodig.

### 2. Gespreksvaardigheid — €222.500 (mens)

- **Totaal stap 6 vs stap 8**: identiek — €222.500 (€142,5K eenmalig + €80K structureel cumulatief over 4 actieve refresh-jaren = €222,5K).
- **Motivatie-tekst**: zegt "vast eenmalig € 75.000 (LMS € 30K, content € 25K, ToT € 10K, nulmeting € 10K) plus variabel kerntraject € 80.000 (twee blokken á € 31.500 + sessieondersteuning € 17K)". Som = €155.000-mid. **Stap 8 known-breakdown zegt eenmalig €125–160K, mid €142.500** opgebouwd uit 6 componenten (LMS €30K + content €25K + ToT €10K + nulmeting €10K + kerntraject mid €63K + sessieondersteuning mid €17K = €155K, alleen ranges van €125–160K).
- **Mismatch?** Ja — de motivatie splitst in "vast €75K + kerntraject €80K = €155K" maar geeft als losse posten één range met midpoint €142,5K. De getallen zelf (€30K LMS, €25K content, €10K ToT, €10K nulmeting, €63K kerntraject, €17K sessieondersteuning) kloppen wél individueel; de **structuur "vast €75K + variabel €80K"** is achterhaald. Stap 8 splitst niet meer vast/variabel maar 6 componenten met ranges.
- **Verdeling per jaar**: €35,5K + €30K + €33,5K + €23,5K + €31K + €33,5K + €35,5K = €222.500. Klopt; identiek tussen stap 6 en stap 8.
- **Advies**: **Motivatie-tekst herschrijven** — verwijder het "vast €75K + kerntraject €80K"-frame en sluit op de 6 componenten + ranges van €125–160K eenmalig + €15–20K/jr structureel vanaf jaar 4.

### 3. Uniforme klantbenadering / processen — €150.000

- **Totaal stap 6 vs stap 8**: identiek — €150.000 (€78K eenmalig + €72K structureel cumul = €150K).
- **Motivatie-tekst**: zegt "eenmalig € 55.000 – € 70.000 (middenpunt circa € 62.000)". **Stap 8 known-breakdown zegt eenmalig € 70.000 – € 86.000, mid € 78.000**. Mismatch van €16K op middenpunt en €15K op de high-range.
- **Mismatch?** Ja, materieel. De motivatie noemt "procesinventarisatie + 20 dgn × € 800 = € 16K, sessiebegeleiding € 20K, methodieken € 7,5K" — dat telt op tot €43,5K, niet €62K. De €62K-mid is niet onderbouwd door de losse posten in dezelfde tekst. Stap 8 splitst de eenmalige post in 5 componenten (procesbegeleiding €25–40K, sessiebegeleiding €15–25K, materialen €5–10K, governance-instrumentarium €10K, sectorvariatie-buffer €5–7K) waarvan mid-totaal €78K — dat sluit op het werkelijke scenariobedrag.
- **Verdeling per jaar**: €15K + €27K + €29K + €5K + €16K + €24K + €34K = €150.000. Klopt.
- **Advies**: **Motivatie-tekst herschrijven** — vervang door de 5-componenten-uitsplitsing met range €70–86K eenmalig en €10–15K/jr structureel vanaf jaar 2.

### 4. Leiderschap — €161.000 (cultuur)

- **Totaal stap 6 vs stap 8**: identiek — €161.000 (€107,5K eenmalig + €53,5K structureel cumul over 7 jaar = €161K, met cultuurmeting vanaf jaar 3 en onboarding vanaf jaar 5).
- **Motivatie-tekst**: zegt "eenmalig externe begeleider 15 dagen × € 2.500 (€ 37.500) plus executive-tarief € 20K, individuele coaching 9 lg × € 4.000 (€ 36K) en HR-instrumentarium € 15K" = €108.500. Stap 8 known-breakdown geeft eenmalig €95–120K mid €107,5K. **Sluit aan** (verschil van € 1.000 valt binnen afronding van de range-middens).
- **Bruto vs out-of-pocket disclaimer**: Stap 8 toont een expliciete **disclaimer** boven de breakdown (`known-breakdowns.ts` regel 271–272) over de mismatch tussen kostenraming-tekst (€33–43K + €25–30K = €60–72K out-of-pocket na aftrek € 57K interne uren) en het bruto scenario-totaal (€161K). **Stap 6 toont deze disclaimer niet.** De gebruiker ziet in stap 6 alleen het scenariobedrag €161K zonder de bruto/out-of-pocket-context.
- **Verdeling per jaar**: €29K + €20K + €18K + €17K + €21K + €25K + €31K = €161.000. Klopt.
- **Advies**: Motivatie-tekst is goed; voeg in stap 6 wel de **disclaimer-tekst** toe (of een verwijzing "zie stap 8 voor de bruto/out-of-pocket-toelichting").

### 5. Post onvoorzien — €140.000

- **Totaal stap 6 vs stap 8**: identiek — €140.000 (geen breakdown, is risico-buffer; ~10% van basisraming met cap-headroom).
- **Motivatie-tekst**: legt cap-headroom-logica uit, geen mismatch met componenten omdat er geen breakdown is. Stap 8 toont dezelfde tekst in C1/C2-equivalent voor `domein === "overig"`.
- **Verdeling per jaar**: €0, €0, €20K, €27K, €34K, €32K, €27K = €140.000. Klopt.
- **Advies**: Consistent — geen actie nodig.

---

## Concrete adviezen — nieuwe motivatie-teksten

### Inspanning 2 — Gespreksvaardigheid (vervang `scenario.inspanningen[1].motivatie`)

> De cross-sectorale gespreksvaardigheidstraining vertaalt outside-in werken naar concreet, meetbaar gespreksgedrag bij 80 klantgerichte medewerkers verdeeld over PO, VO, Zakelijk en Professionals (uit Stap 7 selectiePerDomein). Dossier-onderbouwing: **eenmalig € 125.000 – € 160.000 (mid € 142.500)** opgebouwd uit zes componenten — LMS-licentie 5 jaar vooruit (€ 30.000), content-ontwikkeling outside-in curriculum (€ 21–30K), train-de-trainer voor 12 interne trainer/adviseurs (€ 10.000), nulmeting + intake-sessies (€ 10.000), kerntraject met externe trainingspartner 2 blokken voor 80 deelnemers (€ 54–72K, mid € 63K) en sessieondersteuning, locatie en materialen (€ 12–22K). **Plus structureel € 15.000 – € 20.000 per jaar vanaf jaar 4** voor refresh-sessies (€ 12–18K) en onboarding nieuwe medewerkers (€ 3–7K). Cross-sectorale bundeling levert circa 30 % schaalvoordeel; geen executive-tarief aangenomen — vaste-prijs-contract bij start vereist. Het scenario-totaal in de tabel hangt af van het aantal jaren met onderhoud en onboarding.

### Inspanning 3 — Uniforme klantbenadering (vervang `scenario.inspanningen[2].motivatie`)

> Uniforme klantinformatieprocessen en funnelgovernance worden cross-sectoraal ingericht door 5 interne uitvoerders die alle drie sectoren PO, VO en Professionals dekken: Projectmanager D, Procesmanager Data en Procesondersteuner per sector. Dossier-onderbouwing: **eenmalig € 70.000 – € 86.000 (mid € 78.000)** opgebouwd uit vijf componenten — externe procesbegeleiding 20 dgn × € 800 + uitrol-coördinatie 3 sectoren (€ 25–40K), sessiebegeleiding 9 multidisciplinaire werksessies (€ 15–25K), externe materialen/methodieken BiSL/Lean + content-aanpassing (€ 5–10K), cross-sectoraal governance-instrumentarium KPI-template + integratie-format CRM (€ 10K) en sectorvariatie-buffer 10 % herbewerkingsrisico (€ 5–7K). **Plus structureel € 10.000 – € 15.000 per jaar vanaf jaar 2** voor proceseigenaarschap-borging via bestaande Smartprocess-tooling. Schaalvoordeel 30–40 % is al verrekend. Het scenario-totaal in de tabel hangt af van hoe lang de structurele borgingsfase loopt.

### Inspanning 4 — Leiderschap (geen tekst-aanpassing nodig, wel disclaimer toevoegen aan stap 6)

Eventueel toevoegen aan motivatie of als aparte UI-banner in stap 6:

> *Bruto/out-of-pocket-toelichting:* het scenariobedrag € 161.000 is een **bruto-raming op motivatie-basis** (vier eenmalige posten = € 108.500 + structureel € 53.500 cumulatief over 7 jaar). De kostenraming-tekst in het dossier toont een **out-of-pocket-bedrag van € 60–72K** na aftrek van interne uren (~ 740 u × € 77/u ≈ € 57.000, geboekt onder § 4.2 Interne uren). Beide bedragen kloppen — verschillende aggregatie-niveaus.

---

## Implementatie-plan

**Stap A — schrijf script `scripts/fix-motivatie-stap6-optimaal.ts`** dat per scenario (optimaal, plus20, min20, advies) de motivatie-tekst voor inspanning 2 (gespreksvaardigheid) en inspanning 3 (processen) herschrijft. Match op `inspanningTitel.toLowerCase().includes("gespreksvaardigh")` en `.includes("uniforme")`. Bewaar dezelfde introductie-zin (sector-headcount uit Stap 7) en vervang alleen het "Dossier-onderbouwing:"-deel + de structurele toelichting.

**Stap B — pas dezelfde fix toe in alle 4 scenario's** (niet alleen optimaal). Andere scenario's hebben dezelfde motivatie-tekst en zelfde mismatch.

**Stap C — voeg een disclaimer-block toe in stap 6** voor leiderschap. Optie: render `KNOWN_BREAKDOWNS.find(b => b.inspanningMatch === "leiderschap")?.disclaimer` in StapOptimaliseren rond regel 1825 (binnen de inspanning-cel) als de inspanning-titel "leiderschap" bevat. Of: render de disclaimer eenmalig boven de scenario-tabel als hint.

**Stap D — verifieer**:
- `npx tsx scripts/check-c3-aansluiting.ts` moet nog steeds OPTIMAAL alle €0 verschil tonen (motivatie-tekst beïnvloedt geen totalen, dus mag niet veranderen).
- Stap 8 in browser: motivatie-paneel C2 leest nu nieuwe tekst, sluit aan op C3-breakdown (geen visueel conflict meer).
- `npm run build` slaagt zonder fouten.

**Stap E — commit**:
> `feat(begroting): motivatie-tekst optimaal/plus20/min20/advies sluit op known-breakdowns C2 stap 8`

**Bestand-paden**:
- `c:\Users\pdebu\Projects VS code\DIN\src\components\cross-analyse\StapOptimaliseren.tsx` (regel 1820–1850 voor disclaimer-injectie)
- `c:\Users\pdebu\Projects VS code\DIN\src\components\steps\BerekeningenStep.tsx` (regel 808 — MotivatiePaneel renders de motivatie die we herschrijven)
- `c:\Users\pdebu\Projects VS code\DIN\src\lib\known-breakdowns.ts` (bron van de juiste bedragen — niet wijzigen)
- `c:\Users\pdebu\Projects VS code\DIN\scripts\fix-motivatie-stap6-optimaal.ts` (nieuw)
