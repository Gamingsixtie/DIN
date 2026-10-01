# Audit Stap 6 vs Stap 8 — MIN20-scenario (10 jaar, 2026-2035)

Sessie `d8b97442-ce8f-4134-b2c7-67dc8e3a3f93`. Vergelijking tussen Stap 6 (Optimaliseren — `StapOptimaliseren.tsx`) en Stap 8 (Berekeningen — `BerekeningenStep.tsx`) voor het langste scenario (-20%).

---

## A) totaalEuro per inspanning — sluit Stap 6 op Stap 8 aan?

| Inspanning | Stap 6 `inspanningen[].totaalEuro` | Stap 8 (eenmalig + struct.cum.) | Aansluiting |
|---|---|---|---|
| CRM-klantdashboard (data_systemen) | € 1.372.500 | € 540.000 + € 832.500 = € 1.372.500 | OK |
| Gespreksvaardigheidstraining (mens) | € 282.500 | € 142.500 + € 140.000 = € 282.500 | OK |
| Uniforme klantinformatieprocessen (processen) | € 186.000 | € 78.000 + € 108.000 = € 186.000 | OK |
| Leiderschapsprogramma (cultuur) | € 189.500 | € 107.500 + € 82.000 = € 189.500 | OK |
| Post onvoorzien (overig) | € 67.000 | (geen breakdown) | OK (programma-breed) |

Cijfermatig sluiten **alle vier hoofd-inspanningen** in MIN20 perfect aan: de som van eenmalig plus structureel-cumulatief × 10 jaar (met `vanafJaar` per component) is gelijk aan `totaalEuro` in Stap 6 én aan de som van `verdelingPerJaar`. Antwoord A: **ja**, de totaalEuro is consistent.

---

## B) Motivatie-tekst — bevatten de motivaties nog OUDE bedragen of onvolledige info?

Hier zit de echte audit-pijn. De motivatie-tekst in `scenarios.min20.inspanningen[i].motivatie` wordt door de AI in Stap 6 gegenereerd en is op meerdere punten **niet meer in lijn met de breakdown die Stap 8 toont**.

### B1) Gespreksvaardigheidstraining (mens) — motivatie-bedragen versus breakdown

**Motivatie-tekst (huidig)**:
> "vast eenmalig € 75.000 (LMS-licentie € 30.000 voor 5+ jaar, content-ontwikkeling outside-in curriculum € 25.000, train-de-trainer voor 12 interne trainer/adviseurs A € 10.000, nulmeting + intake € 10.000) plus variabel kerntraject € 80.000 (externe trainingspartner twee blokken à circa € 31.500 voor 80 deelnemers + sessieondersteuning, locatie en materialen € 17.000)"

**Breakdown in Stap 8 (eenmalig)**: € 125.000 – € 160.000 (mid € 142.500). Optelling 75 + 80 = € 155K klopt op de mid in zoverre, maar **de splitsing is verwarrend**: wie de motivatie leest ziet "€75K + €80K = €155K" en de breakdown-tabel zegt "mid € 142.500 (in een range 125–160)". De €75K/€80K-splitsing komt nergens terug in `KNOWN_BREAKDOWNS["gespreksvaardigh"]`. De stuurgroep ziet daardoor niet hoe €75K + €80K op €142.500 mid uitkomt.

**Bovendien**: motivatie noemt "jaarlijks circa € 15.000 refresh + € 5.000 onboarding **vanaf jaar 4**". Voor MIN20 (10 jaar, jaar 4 = 2029) is dat een structurele last van **€20K/jaar × 7 actieve jaren = € 140.000**. Dat is precies wat Stap 8 toont, maar de motivatie zegt "Voor langere scenario's komt daar jaarlijks circa €15K + €5K bij" — zonder ooit het cumulatief van **€140K over de looptijd** te noemen.

**Tekstvoorstel motivatie min20**:
> "Vast eenmalig € 142.500 mid (range € 125K–€ 160K): LMS-licentie € 30K (5+ jaar vooruit), content-ontwikkeling € 25K, train-de-trainer 12 adviseurs € 10K, nulmeting + intake € 10K, kerntraject 2 blokken externe trainingspartner € 63K, sessieondersteuning + locatie € 17K. Voor MIN20 komt daar structureel **€ 140.000 cumulatief** bij (refresh € 15K/jaar + onboarding € 5K/jaar vanaf jaar 4 = € 20K × 7 jaar). Totaal MIN20: € 282.500 — het lange-staart-deel (refresh + onboarding) is daarmee bijna de helft van de eenmalige investering. Cross-sectorale bundeling levert circa 30% schaalvoordeel; vaste-prijs-contract bij start vereist."

### B2) Uniforme klantinformatieprocessen (processen) — motivatie-bedragen versus breakdown

**Motivatie-tekst (huidig)**:
> "eenmalig € 55.000 – € 70.000 (middenpunt circa € 62.000) ... plus structureel € 10.000 – € 15.000 per jaar (mid € 12.000)"

**Breakdown in Stap 8 (eenmalig)**: € 70.000 – € 86.000 (mid € 78.000). De motivatie zegt **€55–70K** maar `KNOWN_BREAKDOWNS["uniforme"]` (en de kostenraming-tekst zelf) zegt **€70–86K**. Dit is een **echte tegenstrijdigheid**: het motivatie-bereik is **€15K te laag** vergeleken met de breakdown die Stap 8 als waarheid toont. Verschil komt doordat motivatie alleen de *kern* (procesbegeleiding + sessies + materialen) telt en **governance-instrumentarium €10K + sectorvariatie-buffer €6K niet meeneemt** in het hoofdgetal — die staan wel in de breakdown.

**Cumulatief structureel MIN20**: €12K/jaar × 9 actieve jaren (vanaf jaar 2 = 2027) = **€108K**. Motivatie noemt alleen "€10–15K per jaar"; nergens staat dat dat over 10 jaar **€108K cumulatief** wordt — terwijl dat bijna 60% van het inspanning-totaal is.

**Tekstvoorstel motivatie min20**:
> "Eenmalig € 70.000 – € 86.000 (mid € 78.000): externe procesbegeleiding € 32,5K (20 dagen × € 800 + uitrol-coördinatie 3 sectoren), sessiebegeleiding 9 werksessies € 20K, materialen/methodieken € 7,5K, governance-instrumentarium (KPI-template + CRM-integratie-format) € 10K, sectorvariatie-buffer 10% € 6K. Structureel borgings-last bedraagt € 12K/jaar (proceseigenaarschap-borging via Smartprocess-tooling) vanaf jaar 2 — voor MIN20 cumulatief **€ 108.000 over 9 jaar**, oftewel ruim 58% van het totaal van € 186.000. De stuurgroep moet beseffen dat de structurele staart langer doortelt dan de eenmalige investering."

### B3) Leiderschapsprogramma (cultuur) — out-of-pocket vs bruto

**Motivatie-tekst (huidig)**: noemt eenmalig € 37,5K + € 20K + € 36K + € 15K = **€ 108,5K**, plus structureel € 5K/jaar tool, € 2,5K/jaar cultuurmeting vanaf jaar 3, € 2K/jaar onboarding leiders vanaf jaar 5.

**Probleem**: de motivatie zwijgt over de **disclaimer** uit `KNOWN_BREAKDOWNS["leiderschap"]`. Die disclaimer (zie `known-breakdowns.ts` regel 271-272) maakt expliciet dat de kostenraming-samenvatting "€33–43K eenmalig + €25–30K structureel cumulatief" een **andere weergave** is dan de motivatie/scenario-bedragen van € 95–120K bruto. Stap 8 toont die disclaimer prominent boven de breakdown-tabel; **Stap 6 doet dat niet** omdat motivatie in Stap 6 niet eens wordt gerenderd (zie sectie E hieronder).

**Cumulatief structureel MIN20**: in 10 jaar krijg je 360°-tool (€5K × 10 = €50K) + cultuurmeting (€2,5K × 8 vanaf jaar 3 = €20K) + onboarding (€2K × 6 vanaf jaar 5 = €12K) = **€82K**. Motivatie noemt geen van deze cumulaties; de stuurgroep ziet "€5K/jaar tool" en denkt vermoedelijk aan "kleine post" — maar over 10 jaar is structureel **€ 82.000, bijna 75% van de eenmalige investering**.

**Tekstvoorstel motivatie min20**:
> "Bruto investering € 95.000 – € 120.000 (mid € 107.500), opgebouwd uit externe begeleider 15 dagen × € 2.500 (€ 37.500), executive-tarief reservering top-coaches € 20K, individuele coaching 9 leidinggevenden × € 4K (€ 36K), HR-instrumentarium functioneringscyclus + 360°-integratie € 15K. **Let op**: de samenvattende kostenraming-tekst noemt out-of-pocket € 33–43K eenmalig — dat is na aftrek van interne uren (zie § 4.2). Het scenario-bedrag werkt op de bruto-basis. Structureel cumulatief MIN20 = € 82.000: 360°-tool € 5K/jaar × 10 jaar = € 50K + cultuurmeting vanaf jaar 3 (€ 2,5K × 8 = € 20K) + onboarding nieuwe leiders vanaf jaar 5 (€ 2K × 6 = € 12K). Totaal MIN20: € 189.500 — structurele staart is 43% van het totaal, vrijwel even groot als de eenmalige investering."

### B4) CRM (data_systemen) — meest urgente lange-staart-blindspot

**Motivatie-tekst (huidig)**:
> "structureel € 92.500 per jaar voor licenties (~ € 63.000) en beheer plus doorontwikkeling (~ € 30.000). ... Het scenario-totaal in de tabel hangt af van hoe lang de structurele beheerfase loopt — hoe langer, hoe hoger het cumulatief totaal."

**Cumulatief structureel MIN20**: € 92,5K/jaar × 9 actieve jaren (vanaf go-live in jaar 2) = **€832.500**. De motivatie zegt netjes "hoe langer, hoe hoger" maar **noemt de €832K niet expliciet**. Dat is precies de blindspot die de vraagstelling raakt: in MIN20 is de structurele last (€832K) **groter dan de eenmalige investering** (€540K), en dat moet voor de stuurgroep zwart-op-wit staan, niet impliciet in een tabel.

**Tekstvoorstel motivatie min20**:
> "Het CRM is het technische fundament onder outside-in werken. Eenmalig € 540.000 mid (range € 440K–€ 640K) voor implementatie, datamigratie, 7-8 bronsysteemintegraties en dubbele licentielast tijdens transitie. **Voor MIN20 (10 jaar) is structureel cumulatief € 832.500** — dat is € 92.500/jaar × 9 actieve jaren vanaf go-live in jaar 2 (licenties 85 gebruikers € 62,5K + beheer + doorontwikkeling € 30K). De structurele staart overstijgt daarmee de eenmalige investering: van het MIN20-totaal van € 1.372.500 zit **61% in de jaren ná de bouw**. Stuurgroep-implicatie: een MIN20-keuze is geen 'goedkoper' programma — het is hetzelfde programma met een dubbel zo lange staart."

---

## C) Kostenraming-tekst gebruikt in Stap 6?

**Nee**. `StapOptimaliseren.tsx` gebruikt geen `dossier.kostenraming` veld en toont geen breakdown-tabel. Alleen `motivatie`, `verdelingPerJaar`, `samenvatting` en `prioriteitAdvies` worden in de UI gebruikt — en zelfs `motivatie` wordt **niet gerenderd** (zie sectie E). In Stap 8 daarentegen wordt zowel de letterlijke kostenraming-tekst (C1-blok) als de motivatie-onderbouwing (C2-blok via `MotivatiePaneel`) getoond, mét breakdown-tabel uit `KNOWN_BREAKDOWNS`.

---

## D) verdelingPerJaar 2026-2035 — sluit aan?

Per inspanning telt de som van `verdelingPerJaar` exact op `totaalEuro`:

| Inspanning | Σ verdelingPerJaar | totaalEuro | Aansluiting |
|---|---|---|---|
| CRM | € 1.372.500 | € 1.372.500 | OK |
| Processen | € 186.000 | € 186.000 | OK |
| Mens | € 282.500 | € 282.500 | OK |
| Cultuur | € 189.500 | € 189.500 | OK |
| Post onvoorzien | € 67.000 | € 67.000 | OK |

`totaalGeraamdEuro` op scenario-niveau staat in de Supabase-dump op € 0 / bufferEuro € 0 / postOnvoorzienEuro € 0 (top-level velden van het scenario zijn niet correct doorgeschreven), maar de tabel-tfoot in `StapOptimaliseren.tsx` regel 1871 leest uit `s.totaalGeraamdEuro` — daar moet wel een waarde staan. Aanbeveling: verifieer of dit een dump-truncatie is of een echt persistence-issue (apart audit-punt buiten MIN20-scope).

---

## E) Lange-staart-transparantie — kerngebrek

Het zwaartepunt van deze audit. In MIN20 (10 jaar) zit een gigantisch deel van de kosten in **structurele cumulatieven** die de motivatie-tekst niet expliciet noemt:

| Inspanning | Eenmalig | Struct.cumulatief | Aandeel staart |
|---|---|---|---|
| CRM | € 540.000 | **€ 832.500** | **61%** |
| Processen | € 78.000 | **€ 108.000** | **58%** |
| Cultuur | € 107.500 | € 82.000 | 43% |
| Mens | € 142.500 | € 140.000 | 50% |

Het MIN20-totaal van **€ 2.097.500** (excl. post onvoorzien) bestaat voor **52% uit structurele staart**. Geen enkele motivatie-tekst noemt dit cumulatief expliciet — alle vier teksten eindigen met varianten van "het scenario-totaal hangt af van hoe lang de structurele fase loopt". Voor de stuurgroep is dat **niet voldoende**: ze moeten kunnen zien dat MIN20 geen "afgeslankt" programma is maar een programma met een **dubbele staart** vergeleken met OPTIMAAL (7 jaar, struct.cum. ~€941K) of ADVIES (4 jaar, struct.cum. ~€359K).

**Generieke disclaimer-aanbeveling** (toe te voegen aan elk MIN20-motivatie-blok in de UI of aan de scenario-banner):

> "Dit is het langste scenario. Van de € 2.097.500 totale investering zit € 1.162.500 (ruim 55%) in de jaren na de eenmalige bouw — voornamelijk CRM-licenties (€ 832.500), processen-borging (€ 108.000), gespreks-refresh + onboarding (€ 140.000) en leiderschap-tooling (€ 82.000). Een MIN20-keuze betekent dus niet 'minder programma', maar 'hetzelfde programma met een aanzienlijk langere structurele staart'."

---

## Samenvatting + aanbevelingen

1. **Cijfermatig sluit Stap 6 perfect aan op Stap 8** — totaalEuro = eenmalig + struct.cumulatief, en Σ verdelingPerJaar = totaalEuro voor alle vier inspanningen plus post onvoorzien.
2. **Motivatie-tekst is niet zichtbaar in Stap 6**: geen rendering van `insp.motivatie` in `StapOptimaliseren.tsx` — alleen in de export en in Stap 8. Aanbeveling: óf motivatie tonen onder elke inspanning-rij in de tabel, óf verwijderen uit de Stap 6 data-shape voor consistentie.
3. **Bedragen in motivatie wijken af van breakdown** voor processen (€55–70K vs €70–86K) en gespreksvaardigheid (€75+€80K-splitsing klopt niet met de mid €142,5K). Tekstvoorstellen hierboven (B1, B2) corrigeren dit.
4. **Leiderschap mist disclaimer** over out-of-pocket vs bruto in de motivatie zelf — wel aanwezig in `KNOWN_BREAKDOWNS` maar alleen zichtbaar in Stap 8.
5. **Lange-staart-transparantie ontbreekt**: geen enkele MIN20-motivatie noemt het cumulatief structureel bedrag expliciet. CRM €832K, gesprek €140K, processen €108K, cultuur €82K — voor de stuurgroep cruciaal om te zien dat MIN20 geen "afgeslankt" maar een "verlengd" scenario is.

**Bestanden**:
- `c:\Users\pdebu\Projects VS code\DIN\src\components\cross-analyse\StapOptimaliseren.tsx` (motivatie-shape regel 158, NIET gerenderd in JSX)
- `c:\Users\pdebu\Projects VS code\DIN\src\components\steps\BerekeningenStep.tsx` (regel 808 `MotivatiePaneel`, regel 1019 `splitMotivatie`)
- `c:\Users\pdebu\Projects VS code\DIN\src\lib\known-breakdowns.ts` (breakdowns die in Stap 8 prevaleren over motivatie-tekst)
