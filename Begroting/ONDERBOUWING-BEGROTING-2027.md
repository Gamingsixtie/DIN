# Onderbouwing projectbegroting 2027 — Klant in zicht (30626-0003)

**Bestand:** `Projectraming 2027 30626-0003 klant in zicht 2027.xlsx` (tabblad Projectbegroting)
**Programma:** Klant in Beeld (hoofdproject 30626) · jaarschijf 2027 · projectleider Pim de Burger · opdrachtgever Roel Bakker · controller George Pavel
**Scenario:** Plus20 — het geadviseerde vijfjarige middenscenario (2026–2030, totaal € 1.459.500 out-of-pocket, jaarplafond € 300.000 vanaf 2027)
**Ingevuld voor 2027:** € 301.500 out-of-pocket (onkosten) + 3.484 interne uren (eigen medewerkers, € 261.316 tegen Cito-tarieven)

> **Actualisatie 11-08-2026:** cijfers bijgewerkt van de mei-snapshot naar de actuele live sessie (versie 2594 volgens Supabase-metadata bij export): **3.484 uur** (+71 uur). Oorzaak: RASCI-herberekening van kernteam- en leiderumen, Product Owner systemen van geconsulteerd naar kernteam (nu 46 u), rol Commercieel manager toegevoegd (3 u) en drie kleine geconsulteerd-rollen vervallen (o.a. content specialist en productowner website). **De out-of-pocket-kant is ongewijzigd** (€ 301.500, zelfde verdeling).

---

## 1. Uitgangspunt

Deze begroting is de **jaarschijf 2027** van het programma Klant in Beeld, volgens het gekozen 20%-scenario ("Plus20": het geadviseerde vijfjarige middenscenario met een jaarbudget 20% boven het huidige plafond — totaal € 1.459.500 externe kosten over 2026–2030). Van dat programma is hier uitsluitend het jaar 2027 opgenomen: € 301.500 externe kosten en 3.484 interne uren. Het jaarbedrag ligt € 1.500 (0,5%) boven het richtbedrag van € 300.000; dat valt binnen de afrondingstolerantie van het scenario (bron: `STAP6-VS-STAP8-PLUS20.md` §D).

Alle waarden zijn één-op-één herleid uit de actuele programmadata (extract d.d. 11-08-2026 van de live programmadata; lokale kopie: `BRON-LIVE-SESSIE-STAP4-2026-08-11.json`). Tarieven en bedragen zijn onderbouwd met marktbenchmarks (o.a. Berenschot, Microsoft Pricing, Gartner; zie `PLAUSIBILITEIT-PLUS20.md`). De CRM-splitsing licenties/diensten komt uit `src/lib/known-breakdowns.ts`; kruiscontrole jaarbedragen in `AUDIT-OUT-OF-POCKET-FASERING.md` en `STAP6-VS-STAP8-PLUS20.md`. Het vulscript filtert hard op `jaar == 2027` en breekt af als de som niet exact overeenkomt met het jaartotaal in de bron.

---

## 2. Out-of-pocket per kostenpost — € 301.500

| Cel | Kostenpost | Bedrag | Herkomst (Plus20, jaar 2027) |
|---|---|---:|---|
| D67 | 350 — ICT hardware en software | € 62.500 | CRM: Dynamics 365-licenties 85 gebruikers |
| D68 | 410 — Advies en Consultant | € 65.000 | Leiderschap € 30.000 + processen € 28.000 + onvoorzien € 7.000 — begeleiding door o.a. 3sides |
| D75 | 543 — ICT diensten | € 134.500 | CRM: implementatiepartner + beheer (€ 197.000 − € 62.500 licenties) — uitvoering deels door 3sides |
| D85 | 586 — Trainers/Docenten | € 39.500 | Gespreksvaardigheidstraining, eerste blok |
| D98 | 843 — Omzet | € 0 | Kostenproject (projectgroep "Kosten"); geen omzet begroot |
| | **Totaal onkosten** | **€ 301.500** | = Plus20-jaarbedrag 2027, geverifieerd tegen de live sessie |

### Waarom deze categorieën

**350 — ICT hardware en software: € 62.500 (CRM-licenties).** Het CRM-jaarbedrag 2027 (€ 197.000, fase "Realisatie & integraties") bevat vanaf jaar 2 de structurele licentiecomponent: MS Dynamics 365 Pro-licenties voor 85 gebruikers, € 50.000–75.000/jaar met middenwaarde **€ 62.500** (bron: `known-breakdowns.ts`, geverifieerd tegen Microsoft Pricing 2025). Licenties zijn softwarekosten en horen administratief op post 350, niet bij diensten.

**543 — ICT diensten: € 134.500 (CRM-implementatie en beheer).** Het restant van het CRM-jaarbedrag (€ 197.000 − € 62.500): de externe implementatiepartner bouwt datamodel en koppelingen, realiseert de eerste bronsysteemintegraties (4 van 7–8), migreert deels vervuilde data en richt de sectoren PO en VO in; daarnaast beheer en doorontwikkeling na oplevering van de eerste componenten. Een deel van dit uitvoerende data & systemen-werk wordt door 3sides geleverd (zie disclaimer hieronder). Externe implementatie-uren (raming 1.500–2.500 uur × € 150–170/u over de looptijd) zijn ingekochte ICT-dienstverlening → post 543.

**410 — Advies en Consultant: € 65.000 (drie samengevoegde posten; begeleiding mede door 3sides, zie disclaimer hieronder).**
- *Leiderschapsprogramma outside-in — € 30.000* (fase "Acceptatie & rolmodelgedrag"): externe begeleider senior leiderschapsconsultant, individuele coaching van 9 leidinggevenden (NIP/NOLOC-tarieven), cross-sectorale leerkringen en integratie in de HR-cyclus. Externe advies- en coachingsdiensten → 410.
- *Uniforme klantinformatieprocessen — € 28.000* (fase "Herontwerp (to-be) & pilot"): externe procesbegeleiding (dagtarief € 800), begeleiding van multidisciplinaire werksessies, pilots in Smartprocess (de bestaande procestool) en afstemming met het CRM-datamodel. Externe procesconsultancy → 410.
- *Onvoorzien — € 7.000*: programma-brede risicobuffer (scope-uitloop, tariefrisico externe partners, integratie-issues). Het Cito-sjabloon kent geen aparte post onvoorzien; de buffer is bij 410 gevoegd omdat de belangrijkste risico's in de externe advies-/implementatiesfeer liggen. **Bij vrijval valt dit bedrag terug aan het programmabudget** (conform scenario-motivatie).

> **Disclaimer 3sides:** de inzet van 3sides is **verdisconteerd in de posten 410 én 543**. Als strategische- en executiepartner (bron: `3SIDES-VOORSTEL-2026-2027.md`) levert 3sides zowel advies en begeleiding (410: leiderschaps- en procescomponenten) als uitvoerend werk op data & systemen binnen de CRM-realisatie (543, naast de technische implementatiepartner). De precieze verdeling over beide posten volgt uit de 3sides-urenraming 2027 (6 maanden, uren aanpasbaar op basis van de 2026-ervaring); de totaalbedragen per post wijzigen daardoor niet.

**586 — Trainers/Docenten: € 39.500 (trainingsblok gespreksvaardigheid).** Eerste trainingsblok van drie maanden: externe trainers (kerntraject dagtarief € 2.500), gedragsgerichte coaching op gespreksregie en praktijkopdrachten met echte klantcases per sector. Externe trainerskosten → 586.

**843 — Omzet: € 0.** Dit is een kostenproject (projectgroep "Kosten — Beheeractiviteiten", kostenplaats 7040); er wordt geen omzet op dit project begroot. De marge-regel (E105) toont daardoor `#DIV/0!` — inherent aan een kostenproject, geen fout.

---

## 3. Interne uren — 3.484 uur eigen medewerkers

### Van programmafunctie naar Cito-rolcode

De urenraming van het programma is opgebouwd per functie (bijvoorbeeld accountmanager C, klantenservice C, sectormanager PO) per domein. Het Cito-sjabloon kent 24 rolcodes; elke functie is volgens vier vaste regels aan één rolcode toegewezen:

1. **Uitvoerende functies** → hun directe Cito-code (accountmanager → AM € 81/u, trainer → TRA € 87/u, productmanager → PDM € 95/u, productowner → PDO € 87/u).
2. **Klantenservice- en binnendienstfuncties** → **MCB** (Medewerker Commerciële Binnendienst, € 56/u) — het sjabloon kent geen aparte klantenservice-code; MCB is hetzelfde klantcontact-cluster.
3. **Alle leidinggevende functies** (sectormanagers, directeur, managers — incl. de nieuwe Commercieel manager —, teamleiders én de vier inspanningsleiders) → **PJM** (Projectmanager), tegen het **PJM-tarief van € 90/u**. PJM is de enige leidinggevende rolcode in het sjabloon; het tarief ligt daarmee het dichtst bij de € 82/u die het programma voor leidinggevenden rekent.
4. **HR-functies**: curriculum-/opleidingswerk → **TRA** (€ 87/u); HRM-instrumentarium (360°-feedback, functioneringscyclus) → **PRO** (procesconsultant, € 56/u).

### Resultaat per rolregel in de Excel

| Cel | Code | Tarief | Uren | Bedrag | Bronrollen (uren 2027, live sessie) |
|---|---|---:|---:|---:|---|
| F31 | AM — Accountmanager | € 81 | 378 | € 30.618 | accountmanager a (24) · b (24) · c (168) · c prof (120) · trainee prof (42) |
| F33 | CM — Campagne Marketeer | € 80 | 18 | € 1.440 | campagne marketeer a (6) · b (6) · junior marketeer prof (6) |
| F36 | MCB — Mdw Commerciële Binnendienst | € 56 | 1.050 | € 58.800 | klantenservice a (24) · b (24) · **c (672)** · binnendienst a (24) · b (168) · a prof (46) · PO (46) · VO (46) |
| F38 | PDO — Productowner | € 87 | 46 | € 4.002 | Product Owner van de systemen — kernteamlid CRM (46) |
| F39 | PRO — Procesondersteuner/-consultant | € 56 | 348 | € 19.488 | procesmanager data (101) · procesondersteuner PO (55) · VO (55) · professionals (55) · HR-instrumentarium cultuur (82) |
| F43 | TRA — Trainer | € 87 | 498 | € 43.326 | trainer/adviseur a (456: 288 training + 168 CRM-adoptie) · HR-curriculum (42) |
| F45 | PDM — Productmanager | € 95 | 113 | € 10.735 | productmanagers DST (37) · KIB (14) · KLT (20) · LIB (14) · NT2 (14) · CVVO (14) |
| F53 | IA — Businessanalist | € 69 | 3 | € 207 | business info analist c (3) |
| F54 | PJM — Projectmanager | € 90 | 1.030 | € 92.700 | projectmanager d (101) · 4 inspanningsleiders (4 × 95 = 380: Sven/SIO data, Yara/HR mens én cultuur, processen t.b.b.) · sectormanagers PO/VO/Prof (3 × 100 = 300, incl. 3 u geconsulteerd processen p.p.) · manager D&T (44) · manager klantcontact (90) · directeur BV (41) · teamleider PS (41) · teamleider klantenservice (24) · teamleider trainingen (6) · commercieel manager (3, geconsulteerd) |
| | **Totaal** | | **3.484** | **€ 261.316** | |

> **Leeswaarschuwing voor de controller:** MCB (1.050 u) en PJM (1.030 u) zijn *optellingen* van meerdere functies — MCB bundelt 8 klantenservice- en binnendienstfuncties, PJM bundelt 15 leidinggevende functies (sectormanagers, teamleiders, directeur, inspanningsleiders). Het zijn dus geen twee individuele medewerkers met een extreem urenbeslag. De opbouw per functie is reproduceerbaar uit het bronbestand `BRON-LIVE-SESSIE-STAP4-2026-08-11.json`. De functie content specialist is in de actuele programmadata vervallen; CS staat daarom leeg.

**Inleen (F55–F65) is bewust leeg.** Alle externe inzet (implementatiepartner, trainers, consultants, coaches) is in het programmamodel als out-of-pocket-bedrag geraamd en staat dus op de onkostenposten (§ 2), niet als inleenuren.

### Waarom 3.484 uur — 2027 is het bewuste piekjaar

Het urentotaal oogt hoog, maar is verklaarbaar en bewust gepland:

1. **43% van alle programma-uren valt in 2027.** Het vijfjarige scenario kent 8.166 uur; 2026 is aanloop (293 u), 2027 (3.484 u) en 2028 zijn de uitvoeringsjaren, daarna zakt het sterk terug. In 2027 vallen **twee zware sporen samen**: het eerste trainingsblok én het CRM-realisatiejaar.
2. **Mens: 1.896 uur (54%) — dit zijn déélnemersuren, geen projectteam.** Het eerste trainingsblok gespreksvaardigheid (24 u per cursist) draait breed door de organisatie. De grootste post is klantenservice: 28 medewerkers × 24 uur = 672 uur. Daarnaast accountmanagers, binnendienst en 456 uur trainer-inzet (train-de-trainer-model met 12 interne adviseurs).
3. **Data & Systemen: 742 uur (21%) — CRM-realisatiejaar.** Interne begeleiding van bouw en integraties (4 van 7–8 bronsystemen), datamigratie-controle, sectorinrichting PO/VO en reviews door productowner en analisten naast de externe implementatiepartner.
4. **Cultuur: 464 uur + Processen: 382 uur.** Leiderschapsprogramma (deelname 7 leidinggevenden × 41 u + inspanningsleider 95 u + HR-instrumentarium 82 u = 464 u) en de werkgroep procesherontwerp met pilots per sector.
5. **Per persoon blijft de belasting beperkt.** De uren zijn verspreid over ± 65 functies door grote delen van de organisatie. Voor de meeste betrokkenen gaat het om trainingsdeelname (24 u per jaar) of korte consultatie (3–14 u); kernteamleden zitten op 40–55 u (HR-instrumentarium 82 u) en de grootste individuele posten liggen rond de 100 u (project- en procesmanagement, sectormanagers, inspanningsleiders — ± 0,05 fte).
6. **Verhouding tot het reguliere projecturenbudget:** het scenario rekent met een basis-urenruimte van 540 u/jaar; 2027 gaat daar met +2.944 uur bewust overheen. Dit is de geplande programmapiek — de uren worden gedragen vanuit de reguliere personeelsbegroting en zijn hier apart inzichtelijk gemaakt, niet dubbel begroot.

### Tariefverschil programma-raming vs. Cito-sjabloon

De programma-raming waardeert de 2027-uren tegen een geïndexeerd vlak tarief (overwegend € 77/u, leidinggevenden deels € 82/u): **€ 266.985** (jaartotaal-veld in de bron). Het Cito-sjabloon rekent met kostprijstarieven per rol uit boekjaar 2026 (sjabloonbereik interne rollen € 46–95/u, externe rolcode ICTE € 139/u; in deze begroting gebruikte codes € 56–95/u): **€ 261.316**. Verschil **−€ 5.669 (−2,1%)** — het grootste urenblok (klantenservice/binnendienst, MCB € 56/u) kost werkelijk minder dan het vlakke modeltarief; de duurdere rollen (PJM € 90, TRA € 87, PDM € 95) compenseren dat grotendeels maar niet volledig. Het urenaantal (3.484) is in beide gelijk; alleen de waardering verschilt. **Zodra de tariefkaart boekjaar 2027 geladen is en K1 wordt bijgezet, herrekent de Excel automatisch naar 2027-tarieven** — bij ± 5% indexatie stijgt het bedrag naar ± € 274.000.

---

## 4. Wat bewust níét is ingevuld of gewijzigd

| Onderdeel | Status | Reden |
|---|---|---|
| K1 (tariefjaar) | Blijft 01-01-**2026** | Boekjaar 2027 ontbreekt nog in de tarieven-referentietabel (Power Query); op 2027 zetten zou nu alle tarieven op 0 zetten. Zodra de 2027-tarieven geladen zijn kan K1 worden bijgezet — bedragen schalen automatisch mee. |
| K2 (Index) | Blijft 0 | Wordt door geen enkele formule gebruikt; indexatie zit al in de tariefkaart. |
| Maandverdeling (G28:R28) | Standaard 1/12 | Het programmamodel bevat geen maandfasering; gelijkmatige spreiding is de neutrale keuze. |
| B20 kostendrager / B21 variant | Leeg — **te bepalen** | Vorige jaarschijven (30626, -0001, -0002) hebben deze ook niet; invullen is een keuze voor de controller. |
| Inleen (F55–F65) | Leeg | Externe inzet is als out-of-pocket geraamd (§ 3). |
| Overige onkostenposten | 0 | Niet geraamd in het scenario → niet ingevuld (niets verzonnen). |

**Openstaande punten voor de controller:**
1. **Tariefkaart boekjaar 2027 laden en K1 bijzetten** — grootste openstaande actualisatie; een 2027-begroting hoort tegen 2027-tarieven (zie § 3, tariefverschil).
2. Tabblad *Stamgegevens projecten* bevat drie hardgecodeerde "vertaling"-persnummers (G2/H2/I2) die niet overeenkomen met de huidige projectleider, controller en verkoopleider — bewust niet aangepast (administratie-eigenaarschap ligt bij control).
3. Controlecel F108 staat op −1; dit is een bestaande sjabloonafwijking (de omzetregel telt niet mee in het aantal-totaal) die al vóór het invullen bestond.
4. **3sides-urenraming 2027 nog te ontvangen**; de verdeling van de 3sides-inzet over de posten 410 en 543 daarop afstemmen (zie disclaimer in § 2).

---

## 5. Controlecijfers na invullen

| Controle | Waarde |
|---|---|
| E100 Eigen medewerkers | € 261.316 |
| E101 Inleen | € 0 |
| E102 Onkosten | € 301.500 (= Plus20-jaarbedrag 2027, exact) |
| E103 Omzet | € 0 |
| E104 Projectresultaat | −€ 562.816 (kostenproject) |
| Som uren F31:F54 | 3.484 (= live jaartotaal 2027, exact) |
| E108 Controle ETC-regels | 0 ✓ |
| S-kolom regelchecks | Alle 0 ✓ |
| Maandcellen | Jaarbedrag / 12 ✓ |
| Bestandsintegriteit | Power Query-verbindingen, opmerkingen en verborgen referentiebladen intact ✓ |

*Origineel leeg sjabloon bewaard als: `Projectgroting 2027 30626-0003 klant in zicht 2027 - origineel leeg.xlsx`. Brondata: `BRON-LIVE-SESSIE-STAP4-2026-08-11.json` (extract live sessie, 11-08-2026).*
