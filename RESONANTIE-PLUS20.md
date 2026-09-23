# C1↔C2 resonantie PLUS20 (5 jaar)

Sessie: `d8b97442-ce8f-4134-b2c7-67dc8e3a3f93` — scenario `plus20`, aantalJaren = 5, jaarbudget €300.000, totaalGeraamd €1.459.500.

C1 = "Uit het dossier"-blok (kostenraming + motivatie-tekst).
C2 = breakdown-tabel (motivatie-extract + `known-breakdowns.ts`).

## Samenvatting

| Inspanning | Status | Reden |
|---|---|---|
| CRM (data_systemen) — €910.000 | **Resoneren** | C1-bedragen verschijnen 1-op-1 in C2 en omgekeerd; totaal sluit exact op €540K + 4×€92,5K. |
| Gespreksvaardigheid (mens) — €182.500 | **Gedeeltelijk** | Bedragen overlappen, maar twee verschillende eenmalig-koppen (kostenraming €125-160K vs motivatie €155K) leven naast elkaar; structureel-vanafJaar mismatch (kostenraming "vanaf jaar 4" = niet aanwezig in 5j-scenario zoals gerekend). |
| Uniforme klantbenadering (processen) — €126.000 | **Gedeeltelijk** | Eenmalig-totaal dossier (€70-86K) ≠ motivatie (€55-70K, €62K mid); kerncijfers wel terug te vinden, maar twee onafhankelijke totalen. |
| Leiderschap (cultuur) — €142.000 | **Mismatch (bewust)** | Disclaimer staat al in `known-breakdowns.ts`: kostenraming-tekst noemt €33-43K en €25-30K cumulatief; motivatie + scenario gebruiken €95-120K eenmalig. C1↔C2 hebben verschillende basis. |

## Per inspanning

### 1. CRM (data_systemen) — €910.000

Berekening scenario: eenmalig mid €540K + structureel €92,5K × 4 jaar (vanaf jaar 2 → jaren 2-5) = 540 + 370 = **€910K — exact**.

| Component | C1 (kostenraming) | C1 (motivatie) | C2 (breakdown) | Bedrag-match | Status |
|---|---|---|---|---|---|
| Externe implementatie + dashboardbouw | €250-375K (1.500-2.500u × €150-170/u) | "implementatie ... 1.500-2.500 consultanturen" | €250-375K (mid €312,5K) | Exact | OK |
| Datamigratie + 7-8 integraties | €75-125K (80-150u/koppeling × €100-130) | "datamigratie en 7-8 bronsysteemintegraties" | €75-125K (mid €100K) | Exact | OK |
| Training + adoptie 85 medewerkers | €40-55K | (impliciet in "implementatie") | €40-55K (mid €47,5K) | Exact | OK |
| Dubbele licentielast 6-12 mnd | €30-60K (85 × €55-65 × 6-12) | "dubbele licentielast tijdens transitiefase" | €30-60K (mid €45K) | Exact | OK |
| Eenmalig-totaal | €440-640K | €440-640K, mid €540K | €440-640K, mid €540K | Exact | OK |
| Structureel licenties | €50-75K/jr (€55-65/maand × 85) | "~€63.000" | €50-75K/jr (mid €62,5K) | Exact | OK |
| Structureel beheer + dooront. | €25-35K/jr (0,3 FTE) | "~€30.000" | €25-35K/jr (mid €30K) | Exact | OK |
| Structureel-totaal | €75-110K/jr vanaf jaar 2 | €92,5K/jr | €75-110K/jr vanaf jaar 2 | Exact | OK |

**Mismatches/advies**: geen — dit is de gouden referentie. Alle vier C1-componenten verschijnen in C2 met dezelfde range; eenmalig- en structureel-totalen zijn identiek.

---

### 2. Gespreksvaardigheid (mens) — €182.500

Berekening scenario: eenmalig kostenraming-mid €142,5K + structureel €20K × 2 jaar (vanaf jaar 4 → jaren 4-5) = 142,5 + 40 = **€182,5K — exact**.

| Component | C1 (kostenraming) | C1 (motivatie) | C2 (breakdown) | Bedrag-match | Status |
|---|---|---|---|---|---|
| LMS-licentie 5 jr | €30K (€6K × 5) | €30K | €30K | Exact | OK |
| Content-ontwikkeling | €21-30K (25-30 dagen × €850) | €25K | €21-30K (mid €25K) | Exact | OK |
| Train-de-trainer | €10K (2 dagen × €5.000 × 12) | €10K | €10K | Exact | OK |
| Nulmeting + intake | €10K (80 × €100 + 4 × €500) | €10K | €10K | Exact | OK |
| Kerntraject (2 blokken) | €54-72K (afgerond €63K) | "twee blokken à circa €31.500" = €63K | €54-72K (mid €63K) | Exact | OK |
| Sessieondersteuning + locatie | €12-22K | €17K | €12-22K (mid €17K) | Exact | OK |
| Eenmalig-totaal | €125-160K (mid €142,5K) | €155K (€75K + €80K) | €125-160K (mid €142,5K) | **€12,5K verschil** kostenraming vs motivatie | Gedeeltelijk |
| Structureel refresh | €12-18K/jr **vanaf jaar 4** | €15K/jr "vanaf jaar 4" | €12-18K/jr vanafJaar 4 | Exact | OK |
| Structureel onboarding | €3-7K/jr | €5K/jr "vanaf jaar 4" | €3-7K/jr vanafJaar 4 | Exact | OK |

**Mismatches + advies**:
1. Het scenariobedrag €182,5K = €142,5K kostenraming-mid + 2 × €20K structureel. Dat is consistent met de **kostenraming**-mid, maar de motivatie noemt eenmalig €155K (€75K vast + €80K variabel) — dus C1 heeft twee verschillende eenmalig-totalen die niet 1-op-1 doorrekenen. Advies: laat motivatie-tekst aanpassen aan kostenraming-mid €142,5K, óf motiveer expliciet waarom motivatie €155K boven kostenraming-band uitkomt.
2. Kostenraming zegt structureel "vanaf jaar 4 (verankering)" — bij plus20 = 5 jaar betekent dat 2 jaar structureel (jaar 4, jaar 5). De `known-breakdowns.ts` heeft `vanafJaar: 4`, dus alignment correct. Bevestig dat user weet dat in 5j-scenario er maar 2 jaar refresh zit (€40K) — dat klopt.

---

### 3. Uniforme klantbenadering (processen) — €126.000

Berekening scenario: eenmalig mid €78K + structureel €12K × 4 jaar (vanaf jaar 2 → jaren 2-5) = 78 + 48 = **€126K — exact**.

| Component | C1 (kostenraming) | C1 (motivatie) | C2 (breakdown) | Bedrag-match | Status |
|---|---|---|---|---|---|
| Externe procesbegeleiding 20+11-30 dagen | €25-40K | "20 dagen × €800 = €16K" | €25-40K (mid €32,5K) | **Range mismatch** — motivatie €16K, kostenraming + uitrol €25-40K | Gedeeltelijk |
| Sessiebegeleiding 9 werksessies | €15-25K (€1.700-2.800/sessie) | €20K | €15-25K (mid €20K) | Exact | OK |
| Materialen / methodieken | €5-10K | €7,5K | €5-10K (mid €7,5K) | Exact | OK |
| Governance-instrumentarium | €10K | €10K | €10K | Exact | OK |
| Sectorvariatie-buffer 10% | €5-7K | €6K | €5-7K (mid €6K) | Exact | OK |
| Eenmalig-totaal | €70-86K (mid €78K) | €55-70K (mid €62K) | €70-86K (mid €78K) | **€16K verschil** mid-mid | Gedeeltelijk |
| Structureel proceseigenaarschap | €10-15K/jr (14-18 dagen × €700-850) | €10-15K/jr "mid €12K" | €10-15K/jr vanafJaar 2 | Exact | OK |

**Mismatches + advies**:
1. Motivatie noemt eenmalig €55-70K (mid €62K) — kostenraming en breakdown zeggen €70-86K (mid €78K). Verschil zit in (a) procesbegeleider-component dat in motivatie maar €16K is en in kostenraming €25-40K, en (b) governance-instrumentarium en buffer staan in motivatie als "structureel-aanvulling" maar in kostenraming als eenmalig-component. Advies: harmoniseer — neem in motivatie expliciet de extra uitrol-dagen (11-30 dagen) op, of plaats governance/buffer expliciet in eenmalig.
2. Bedragen wel overal terug te vinden, maar de optelling klopt niet tussen de twee paragrafen. Voor lezer ontstaat onduidelijkheid welk eenmalig-bedrag leidend is.

---

### 4. Leiderschap (cultuur) — €142.000

Berekening scenario: eenmalig mid €107,5K + structureel: 5jr × €5K (360°-tool, vanaf jaar 1) + 3jr × €2,5K (cultuurmeting, vanaf jaar 3) + 1jr × €2K (onboarding, vanaf jaar 5) = 107,5 + 25 + 7,5 + 2 = **€142K — exact**.

| Component | C1 (kostenraming) | C1 (motivatie) | C2 (breakdown) | Bedrag-match | Status |
|---|---|---|---|---|---|
| Externe begeleider 15 dagen × €2.500 | €33-42K (mid €37,5K) | €37,5K | €33-42K (mid €37,5K) | Exact | OK |
| Executive-tarief reservering | €15-25K (mid €20K) | €20K | €15-25K (mid €20K) | Exact | OK |
| Individuele coaching 9 lg × €4.000 | €32-40K (mid €36K) | €36K | €32-40K (mid €36K) | Exact | OK |
| HR-instrumentarium 360° | €13-17K (mid €15K) | €15K | €13-17K (mid €15K) | Exact | OK |
| Eenmalig-totaal | €95-120K (mid €107,5K) | "€37,5+€20+€36+€15 = €108,5K" | €95-120K (mid €107,5K) | **Mismatch met dossier-tekst** uitgelegd in disclaimer | Gedeeltelijk |
| Structureel 360°-tool vanaf jaar 1 | €4-6K/jr | €5K/jr "over de looptijd" | €4-6K/jr vanafJaar 1 | Exact | OK |
| Structureel cultuurmeting vanaf jaar 3 | €2-3K/jr | €2,5K "vanaf jaar 3" | €2-3K/jr vanafJaar 3 | Exact | OK |
| Structureel onboarding vanaf jaar 5 | €1,5-2,5K/jr | €2K/jr "vanaf jaar 5" | €1,5-2,5K/jr vanafJaar 5 | Exact | OK |

**Mismatches + advies**:
1. **Bekend probleem, gedocumenteerd in `known-breakdowns.ts` disclaimer**: de samenvattende kostenraming-tekst boven de breakdown vermeldt out-of-pocket €60-72K (na §4.2 interne uren-aftrek) en suggereert eenmalig €33-43K. De motivatie-detailoptelling (€37,5+€20+€36+€15 = €108,5K) en de scenarioberekening werken op brutobasis €95-120K. Disclaimer maakt dit expliciet.
2. Bij plus20 (5 jaar) springt vanaf-jaar-5-onboarding wél aan (€2K eenmalig in jaar 5). Dat is 1 jaar boekhouding op een component die methodisch pas vanaf jaar 5 begint — feitelijk juist, maar voor lezer kan het verwarren ("waarom maar €2K als het structureel is?"). Advies: in C1-tekst expliciet noemen dat onboarding pas vanaf jaar 5 telt, dus in 5j-scenario maar 1× €2K.
3. Plausibiliteit OK maar de twee dossier-passages (kostenraming-blok bovenaan, motivatie-blok onderaan) gebruiken twee bedragen-bases (out-of-pocket vs bruto). Advies: harmoniseer of consolideer naar één basis.

---

## Concrete adviezen

1. **CRM is de gouden standaard** — gebruik dezelfde structuur (4 sub-componenten, exact dezelfde bandbreedten in C1 en C2, structureel met vanafJaar) als template voor de andere drie inspanningen.
2. **Gespreksvaardigheid**: harmoniseer eenmalig-mid tussen kostenraming (€142,5K) en motivatie (€155K). Het scenario rekent met €142,5K — maar motivatie suggereert €155K. Kies één en pas tekst aan.
3. **Processen**: motivatie noemt eenmalig €55-70K, kostenraming €70-86K. Voeg in motivatie de uitrol-coördinatie 11-30 dagen toe, óf splits governance + buffer expliciet uit zodat de twee totalen op elkaar aansluiten.
4. **Leiderschap**: behoud disclaimer (terecht), maar overweeg de kostenraming-tekst zelf te herschrijven naar bruto basis (€95-120K eenmalig) zodat C1↔C2 ook zonder disclaimer resoneren.
5. **Vanaf-jaar-toelichting**: voeg per inspanning één regel toe die expliciet zegt hoeveel structurele jaren in 5j-scenario meetellen (CRM: 4 jaar, Gesprek: 2 jaar, Processen: 4 jaar, Leiderschap: 5/3/1 jaar gemengd). Voorkomt rekentwijfel.

## Plausibiliteit-conclusie

De vier scenariototalen reproduceren zich exact uit de breakdown-tabel met de `vanafJaar`-logica uit `known-breakdowns.ts`: CRM €910K, Gesprek €182,5K, Processen €126K en Leiderschap €142K kloppen tot op de euro met de berekening eenmalig-mid + Σ(structureel-component × actiefjaren). De tarieven zijn herleidbaar: senior CRM-consultant €150-170/u (Berenschot 2026), curriculum-ontwerper €850/dag, externe trainingspartner €2.500/dag, leiderschapsconsultant €2.500/dag, NIP-coach €800/sessie en €4.000/dag executive-tarief. Microsoft Dynamics-licentie €55-65/maand komt uit Microsoft Pricing 2025. Volumetrische aannames (85 gebruikers, 80 deelnemers, 9 leidinggevenden + 2 HR, 9 werksessies × 3 sectoren) zijn consistent met Cito-context (~124 FTE, doelgroep ~85 commerciële medewerkers). De kern-kritiek is niet feitelijk maar **structureel**: bij Gespreksvaardigheid, Processen en Leiderschap leven binnen één dossier twee parallelle totalen (kostenraming-blok vs motivatie-blok) die niet exact op elkaar aansluiten — verschil typisch €12-16K. Bij Leiderschap is het verschil het grootst (€95-120K bruto vs €60-72K out-of-pocket) maar door disclaimer geadresseerd. De plus20-totaal van €1.459.500 met €300K/jaar budget en €99K onvoorzien is intern consistent en plausibel binnen het Cito-kader. De resonantie-issues vallen onder onderhoudsschuld in de bron-tekst, niet onder rekenfouten in de berekening.
