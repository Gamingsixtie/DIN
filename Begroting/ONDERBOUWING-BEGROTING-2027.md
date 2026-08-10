# Onderbouwing projectbegroting 2027 — Klant in zicht (30626-0003)

**Bestand:** `Projectgroting 2027 30626-0003 klant in zicht 2027.xlsx` (tabblad Projectbegroting)
**Programma:** Klant in Beeld (hoofdproject 30626) · jaarschijf 2027 · projectleider Pim de Burger · opdrachtgever Roel Bakker · controller George Pavel
**Scenario:** Plus20 — het door de stuurgroep/3sides geadviseerde vijfjarige middenscenario (2026–2030, totaal € 1.459.500 out-of-pocket, jaarplafond € 300.000 vanaf 2027)
**Ingevuld voor 2027:** € 301.500 out-of-pocket (onkosten) + 3.413 interne uren (eigen medewerkers, € 255.117 tegen Cito-tarieven)

---

## 1. Scenario en bronnen

Het "20%-scenario" is het **Plus20-scenario** uit het programma-begrotingsadvies: 20% méér jaarbudget dan het huidige plafond (€ 250.000 × 1,2 = € 300.000 vanaf 2027; 2026 blijft hard € 250.000), waardoor het programma in 5 jaar in plaats van 7 kan worden gerealiseerd. Plus20 is het geadviseerde scenario: gefaseerd tempo met beheersbare jaarlast en gespreide CRM-bouw.

Alle ingevulde waarden zijn herleid uit één bron van waarheid en scriptmatig gecontroleerd (geen handmatig overgetypte bedragen):

| Bron | Gebruikt voor |
|---|---|
| `INTERNE-UREN-SNAPSHOT.json` → `stap4.begrotingAdvies.scenarios.plus20` | Out-of-pocket 2027 per inspanning (verdelingPerJaar, jaar 2027) |
| `INTERNE-UREN-SNAPSHOT.json` → `stap4.stap7InterneUren.scenarios.plus20` | Interne uren 2027 per rol per domein (strikt gefilterd op jaar = 2027) |
| `src/lib/known-breakdowns.ts` (CRM-component, mid-waarden) | Splitsing CRM-bedrag in licenties vs. diensten |
| `AUDIT-OUT-OF-POCKET-FASERING.md` · `STAP6-VS-STAP8-PLUS20.md` | Kruiscontrole jaarbedragen |
| `PLAUSIBILITEIT-PLUS20.md` | Marktbenchmark-onderbouwing tarieven (Berenschot, Microsoft Pricing, Gartner/Forrester, NIP/NOLOC) |

**Alleen jaarschijf 2027.** Het Plus20-scenario omvat in totaal 8.075 interne uren en € 1.459.500 over vijf jaar; in deze begroting is uitsluitend de 2027-schijf opgenomen (3.413 uur, € 301.500). Het vulscript filtert hard op `jaar == 2027` en breekt af als de som niet exact 3.413 uur is.

---

## 2. Out-of-pocket per kostenpost — € 301.500

| Cel | Kostenpost | Bedrag | Herkomst (Plus20, jaar 2027) |
|---|---|---:|---|
| D67 | 350 — ICT hardware en software | € 62.500 | CRM: Dynamics 365-licenties 85 gebruikers |
| D68 | 410 — Advies en Consultant | € 65.000 | Leiderschap € 30.000 + processen € 28.000 + onvoorzien € 7.000 |
| D75 | 543 — ICT diensten | € 134.500 | CRM: implementatiepartner + beheer (€ 197.000 − € 62.500 licenties) |
| D85 | 586 — Trainers/Docenten | € 39.500 | Gespreksvaardigheidstraining, eerste blok |
| D98 | 843 — Omzet | € 0 | Kostenproject (projectgroep "Kosten"); geen omzet begroot |
| | **Totaal onkosten** | **€ 301.500** | = Plus20-jaarbedrag 2027 |

### Waarom deze categorieën

**350 — ICT hardware en software: € 62.500 (CRM-licenties).** Het CRM-jaarbedrag 2027 (€ 197.000, fase "Realisatie & integraties") bevat vanaf jaar 2 de structurele licentiecomponent: MS Dynamics 365 Pro-licenties voor 85 gebruikers, € 50.000–75.000/jaar met middenwaarde **€ 62.500** (bron: `known-breakdowns.ts`, geverifieerd tegen Microsoft Pricing 2025). Licenties zijn softwarekosten en horen administratief op post 350, niet bij diensten.

**543 — ICT diensten: € 134.500 (CRM-implementatie en beheer).** Het restant van het CRM-jaarbedrag (€ 197.000 − € 62.500): de externe implementatiepartner bouwt datamodel en koppelingen, realiseert de eerste bronsysteemintegraties (4 van 7–8), migreert deels vervuilde data en richt de sectoren PO en VO in; daarnaast beheer en doorontwikkeling na oplevering van de eerste componenten (activiteittekst 2027 uit het scenario). Externe implementatie-uren (raming 1.500–2.500 uur × € 150–170/u over de looptijd) zijn ingekochte ICT-dienstverlening → post 543.

**410 — Advies en Consultant: € 65.000 (drie samengevoegde posten).**
- *Leiderschapsprogramma outside-in — € 30.000* (fase "Acceptatie & rolmodelgedrag"): externe begeleider senior leiderschapsconsultant, individuele coaching van 9 leidinggevenden (NIP/NOLOC-tarieven), cross-sectorale leerkringen en integratie in de HR-cyclus. Externe advies- en coachingsdiensten → 410.
- *Uniforme klantinformatieprocessen — € 28.000* (fase "Herontwerp (to-be) & pilot"): externe procesbegeleiding (dagtarief € 800), begeleiding van multidisciplinaire werksessies, pilots in Smartprocess en afstemming met het CRM-datamodel. Externe procesconsultancy → 410.
- *Onvoorzien — € 7.000*: programma-brede risicobuffer (scope-uitloop, tariefrisico externe partners, integratie-issues). Het Cito-sjabloon kent geen aparte post onvoorzien; de buffer is bij 410 gevoegd omdat de belangrijkste risico's in de externe advies-/implementatiesfeer liggen. **Bij vrijval valt dit bedrag terug aan het programmabudget** (conform scenario-motivatie).

**586 — Trainers/Docenten: € 39.500 (trainingsblok gespreksvaardigheid).** Eerste trainingsblok van drie maanden voor ± 80 deelnemers: externe trainers (kerntraject dagtarief € 2.500), gedragsgerichte coaching op gespreksregie en praktijkopdrachten met echte klantcases per sector. Externe trainerskosten → 586.

**843 — Omzet: € 0.** Dit is een kostenproject (projectgroep "Kosten — Beheeractiviteiten", kostenplaats 7040); er wordt geen omzet op dit project begroot. De marge-regel (E105) toont daardoor `#DIV/0!` — inherent aan een kostenproject, geen fout.

---

## 3. Interne uren — 3.413 uur eigen medewerkers

### Mappingregel DIN-rollen → Cito-rolcodes

Het programmamodel raamt uren op 66 rolregels (functie × domein); het Cito-sjabloon kent 24 rolcodes. Mapping volgens vier vaste regels, integraal toegepast:

1. **Uitvoerende rollen** → hun directe Cito-code (accountmanager → AM, trainer → TRA, productmanager → PDM, …).
2. **Klantenservice- en binnendienstrollen** → **MCB** (Medewerker Commerciële Binnendienst) — het sjabloon kent geen aparte klantenservice-code; MCB is hetzelfde klantcontact-cluster en met € 56/u een conservatief tarief.
3. **Alle leidinggevende rollen** (sectormanagers, directeur, managers, teamleiders én de vier inspanningsleiders) → **PJM** (Projectmanager) — programma-/projectleidende inzet; PJM-tarief € 90/u ligt het dichtst bij het leiderstarief van het model (€ 82/u).
4. **HR-rollen**: curriculum-/opleidingswerk → **TRA**; HRM-instrumentarium (360°-feedback, functioneringscyclus) → **PRO** (procesconsultant).

### Resultaat per rolregel in de Excel

| Cel | Code | Tarief | Uren | Bedrag | Bronrollen (uren 2027) |
|---|---|---:|---:|---:|---|
| F31 | AM — Accountmanager | € 81 | 387 | € 31.347 | accountmanager a (24) · b (24) · c (168) · c prof (129) · trainee prof (42) |
| F33 | CM — Campagne Marketeer | € 80 | 18 | € 1.440 | campagne marketeer a (6) · b (6) · junior marketeer prof (6) |
| F34 | CS — Content Specialist | € 64 | 14 | € 896 | content specialist (14) |
| F36 | MCB — Mdw Commerciële Binnendienst | € 56 | 1.047 | € 58.632 | klantenservice a (24) · b (24) · **c (672)** · binnendienst a (24) · b (168) · a prof (45) · PO (45) · VO (45) |
| F38 | PDO — Productowner | € 87 | 6 | € 522 | productowner website (3) · producten (3) |
| F39 | PRO — Procesondersteuner/-consultant | € 56 | 336 | € 18.816 | procesmanager data (98) · procesondersteuner PO (53) · VO (53) · professionals (53) · HR-instrumentarium cultuur (79) |
| F43 | TRA — Trainer | € 87 | 496 | € 43.152 | trainer/adviseur a (456: 288 training + 168 CRM-adoptie) · HR-curriculum (40) |
| F45 | PDM — Productmanager | € 95 | 113 | € 10.735 | productmanagers DST (37) · KIB (14) · KLT (20) · LIB (14) · NT2 (14) · CVVO (14) |
| F53 | IA — Businessanalist | € 69 | 3 | € 207 | business info analist c (3) |
| F54 | PJM — Projectmanager | € 90 | 993 | € 89.370 | projectmanager d (98) · 4 inspanningsleiders (4 × 93 = 372: Sven/SIO data, Yara/HR mens én cultuur, processen t.b.b.) · sectormanagers PO/VO/Prof (3 × 94 = 282) · manager D&T (43) · manager klantcontact (88) · directeur BV (40) · teamleider PS (40) · teamleider klantenservice (24) · teamleider trainingen (6) |
| | **Totaal** | | **3.413** | **€ 255.117** | |

> **Leeswaarschuwing voor de controller:** MCB (1.047 u) en PJM (993 u) zijn *aggregaties* van respectievelijk 8 en 14 modelrollen — het zijn geen twee individuele medewerkers met een extreem urenbeslag. De volledige herleiding staat in de tabel hierboven; het regel-niveau (66 rijen) is reproduceerbaar uit de snapshot-bron.

**Inleen (F55–F65) is bewust leeg.** Alle externe inzet (implementatiepartner, trainers, consultants, coaches) is in het programmamodel als out-of-pocket-bedrag geraamd en staat dus op de onkostenposten (§ 2), niet als inleenuren.

### Waarom 3.413 uur — 2027 is het bewuste piekjaar

Het urentotaal oogt hoog, maar is verklaarbaar en bewust gepland:

1. **42% van alle programma-uren valt in 2027.** Het vijfjarige scenario kent 8.075 uur; 2026 is aanloop (330 u), 2027 (3.413 u) en 2028 (3.261 u) zijn de uitvoeringsjaren, daarna zakt het terug (2029: 628 u, 2030: 443 u). In 2027 vallen **twee zware sporen samen**: het eerste trainingsblok én het CRM-realisatiejaar.
2. **Mens: 1.885 uur (55%) — dit zijn déélnemersuren, geen projectteam.** Het eerste trainingsblok gespreksvaardigheid draait voor ± 80 deelnemers breed door de organisatie. De grootste post is klantenservice: 28 medewerkers × 24 uur = 672 uur. Daarnaast accountmanagers, binnendienst en 456 uur trainer-inzet (train-de-trainer-model met 12 interne adviseurs).
3. **Data & Systemen: 718 uur (21%) — CRM-realisatiejaar.** Interne begeleiding van bouw en integraties (4 van 7–8 bronsystemen), datamigratie-controle en sectorinrichting PO/VO naast de externe implementatiepartner.
4. **Cultuur: 452 uur + Processen: 358 uur.** Leiderschapsprogramma (9 leidinggevenden × 40 uur deelname) plus HR-instrumentarium, en de werkgroep procesherontwerp met pilots per sector.
5. **Per persoon blijft de belasting beperkt.** De uren zijn verspreid over 66 rollen door grote delen van de organisatie; gemiddeld 5–12 uur per medewerker per jaar (bron: programmaplan-3sides, actieplan-slide). De grootste individuele posten: inspanningsleiders 93 uur (± 0,05 fte) en trainingsdeelnemers 24 uur p.p.
6. **Verhouding tot het reguliere projecturenbudget:** het scenario rekent met een basis-urenruimte van 540 u/jaar; 2027 gaat daar met +2.873 uur bewust overheen. Dit is de geplande programmapiek — de uren worden gedragen vanuit de reguliere personeelsbegroting en zijn hier apart inzichtelijk gemaakt, niet dubbel begroot.

### Tariefverschil model vs. Cito-sjabloon

Het programmamodel waardeert 2027-uren tegen één indexeerd tarief (€ 77/u; leidinggevenden € 82/u): **€ 263.731**. Het Cito-sjabloon rekent met kostprijstarieven per rol uit boekjaar 2026 (€ 46–95/u): **€ 255.117**. Verschil **−€ 8.614 (−3,3%)** — verklaarbaar doordat het vlakke modeltarief voor de grote MCB-groep (€ 56/u werkelijk) hoger uitvalt dan de werkelijke kostprijs. Het urenaantal (3.413) is in beide gelijk; alleen de waardering verschilt.

---

## 4. Wat bewust níét is ingevuld of gewijzigd

| Onderdeel | Status | Reden |
|---|---|---|
| K1 (tariefjaar) | Blijft 01-01-**2026** | Boekjaar 2027 ontbreekt nog in de tarieven-referentietabel (Power Query); op 2027 zetten zou alle tarieven op 0 zetten. Zodra de 2027-tarieven geladen zijn kan K1 worden bijgezet — bedragen kolom E schalen dan automatisch mee. |
| K2 (Index) | Blijft 0 | Wordt door geen enkele formule gebruikt; indexatie zit al in de tariefkaart. |
| Maandverdeling (G28:R28) | Standaard 1/12 | Het programmamodel bevat geen maandfasering; gelijkmatige spreiding is de neutrale keuze. |
| B20 kostendrager / B21 variant | Leeg — **te bepalen** | Vorige jaarschijven (30626, -0001, -0002) hebben deze ook niet; invullen is een keuze voor de controller. |
| Inleen (F55–F65) | Leeg | Externe inzet is als out-of-pocket geraamd (§ 3). |
| Overige onkostenposten | 0 | Niet geraamd in het scenario → niet ingevuld (niets verzonnen). |

**Openstaande punten voor de controller:**
1. Tabblad *Stamgegevens projecten* bevat drie hardgecodeerde "vertaling"-persnummers (G2/H2/I2) die niet overeenkomen met de huidige projectleider/controller/opdrachtgever — bewust niet aangepast (administratie-eigenaarschap ligt bij control).
2. Controlecel F108 staat op −1; dit is een bestaande sjabloonafwijking (de omzetregel telt niet mee in het aantal-totaal) die al vóór het invullen bestond.
3. Boekjaar-2027-tarieven laden en K1 bijzetten zodra beschikbaar (zie boven).

---

## 5. Controlecijfers na invullen

| Controle | Waarde |
|---|---|
| E100 Eigen medewerkers | € 255.117 |
| E101 Inleen | € 0 |
| E102 Onkosten | € 301.500 (= Plus20-jaarbedrag 2027, exact) |
| E103 Omzet | € 0 |
| E104 Projectresultaat | −€ 556.617 (kostenproject) |
| Som uren F31:F54 | 3.413 (= modeltotaal 2027, exact) |
| E108 Controle ETC-regels | 0 ✓ |
| S-kolom regelchecks | Alle 0 ✓ |
| Maandcellen | Jaarbedrag / 12 ✓ |
| Bestandsintegriteit | Power Query-verbindingen, opmerkingen en verborgen referentiebladen intact ✓ |

*Origineel leeg sjabloon bewaard als: `Projectgroting 2027 30626-0003 klant in zicht 2027 - origineel leeg.xlsx`.*
