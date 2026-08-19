# Plausibiliteit OPTIMAAL-scenario (7 jaar, 2026-2032)

Sessie d8b97442 — Cito (~124 FTE). Bron: `known-breakdowns.ts` + `component-redeneringen.ts`. Werkelijke scenariobedrag €1.628.000 (4 inspanningen) + €140.000 onvoorzien = **€1.768.000**.

## Samenvatting
- Beoordeelde componenten: **22 sub-componenten + 1 onvoorzien-post**
- Plausibel: **17** | Aandachtspunt: **5** | Vraagteken: **1**
- Cap-overschrijdingen: **1 jaar** (jaar 1, 2026, fors)
- Belangrijkste bevinding: **eenmalige posten (€863K) landen volledig in jaar 1 → cap fors overschreden**, maar gemiddeld over 7 jaar zit programma binnen norm.

---

## 1. CRM-klantdashboard (data_systemen) — €1.095.000

**Eenmalige posten** (hoofdtotaal-mid €540K, sub-componenten tellen op tot €505K — €35K reconciliatie-buffer):

| Component | Mid | Plausibel? | Onderbouwing | Advies |
|---|---|---|---|---|
| Externe implementatie 1.500–2.500u × €150–170/u | €312.500 | ✓ Plausibel | Tarief Berenschot/Conclusion senior CRM-consultant. Aantal = Gartner mid-size benchmark. | OK |
| Datamigratie + 7–8 integraties | €100.000 | ✓ Plausibel | 7–8 koppelingen × €8–15K + cleaning €15–20K = €71–140K. Aantal uit dossier. | OK |
| Training adoptie 85 mw + schaduw | €47.500 | ✓ Plausibel | Trainer €2.500/dag ÷ 5–7 deelnemers + schaduwbegeleiding. | OK |
| Dubbele licentielast 6–12 mnd | €45.000 | ✓ Plausibel | 85 × €60/mnd × 9 mnd ≈ €46K. MS Pricing 2025 herleidbaar. | OK |
| **Reconciliatie-buffer (verschil hoofdtotaal-mid en componenten)** | **€35.000** | ⚠ Onbenoemd | Hoofdtotaal-mid €540K, componenten €505K. €35K is in scenario "vrije ruimte" zonder zichtbare component. | **Toevoegen als "PM-reservering datakwaliteit/onverwachte koppelingen €30–40K"** |

**Structurele posten** (vanaf jaar 2 — 6 actief jaren in 7-jarig):

| Component | Mid/jr | Cum. 6j | Plausibel? | Advies |
|---|---|---|---|---|
| MS Dynamics-licenties 85 gebruikers | €62.500 | €375.000 | ✓ Plausibel | MS Pricing 2025 €55–65/mnd herleidbaar. OK |
| Beheer 0,3 FTE + doorontwikkeling | €30.000 | €180.000 | ⚠ Aandachtspunt | 0,3 FTE × €100K loaded = €30K. **Maar Forrester-benchmark voor 85-gebruikers MS Dynamics is 0,5–0,8 FTE.** 0,3 FTE is mager — risico op onderbesteding-discussie of inhuur-meerwerk. | **Verhogen naar €40–45K/jr (0,4 FTE) of expliciet vermelden "minimaal model, externe inhuur bij escalatie".** |

**CRM-totaal**: €1.095K = €156K/jr gem. — verdedigbaar.

---

## 2. Gespreksvaardigheidstraining (mens) — €222.500

**Eenmalige posten** (hoofdtotaal-mid €142,5K, componenten €155K — €12,5K overlap):

| Component | Mid | Plausibel? | Onderbouwing | Advies |
|---|---|---|---|---|
| LMS-licentie 5 jaar vooruit | €30.000 | ⚠ Aandachtspunt | 5 × €6K/jr — **maar 5j vooruit-betalen voor een 7-jarig programma laat 2 jaar onbetaald**. | **Of LMS naar 7 jaar verhogen (€42K) of naar structureel verschuiven €6K/jr.** |
| Content-ontwikkeling 25–30d × €850 | €25.000 | ✓ Plausibel | Curriculum-ontwerper NL ZZP-tarief. | OK |
| Train-de-trainer 12 deelnemers | €10.000 | ✓ Plausibel | 2d × €5.000/d ToT-cursus. | OK |
| Nulmeting 80 × €100 + 4 sectoren | €10.000 | ✓ Plausibel | TalentLens-tarief assessment + intake-sessies. | OK |
| Kerntraject 2 blokken | €63.000 | ✓ Plausibel | 12–13 trainerdagen × €2.500 × 2 blokken = €60–65K. Zit in midden marktrange. | OK |
| Sessieondersteuning + locatie | €17.000 | ✓ Plausibel | Locatie €5K + materialen €5K + coördinatie €7K. Cito-zaal-tarief realistisch. | OK |

**Structurele posten** (vanaf jaar 4 — 4 actief jaren):

| Component | Mid/jr | Cum. 4j | Plausibel? | Advies |
|---|---|---|---|---|
| Refresh-sessies 3–4/jr | €15.000 | €60.000 | ✓ Plausibel | €3.500–4.500/sessie herleidbaar. | OK |
| Onboarding nieuwe medewerkers | €5.000 | €20.000 | ✓ Plausibel | 8–12 nieuwe mw × €400–600 micro-leertraject. | OK |

**Gesprek-totaal**: €222,5K = €32K/jr gem. — verdedigbaar.

---

## 3. Uniforme klantinformatieprocessen (processen) — €150.000

**Eenmalige posten** (hoofdtotaal-mid €78K, componenten €76K — close):

| Component | Mid | Plausibel? | Onderbouwing | Advies |
|---|---|---|---|---|
| Procesbegeleiding 20d + uitrol 11–30d × €800 | €32.500 | ✓ Plausibel | Senior procesconsultant Berenschot. | OK |
| Sessiebegeleiding 9 werksessies | €20.000 | ✓ Plausibel | 1,5d × €750–850 + materialen = €1.700–2.800/sessie × 9. | OK |
| Materialen BiSL/Lean | €7.500 | ✓ Plausibel | Methodiek-licentie + content-aanpassing. | OK |
| Governance-instrumentarium | €10.000 | ✓ Plausibel | KPI-template + integratie-format. | OK |
| Sectorvariatie-buffer 10% | €6.000 | ❓ Vraagteken | **Dubbele buffer**: programma-brede onvoorzien (€140K) dekt al herbewerkings-risico. Per-inspanning buffer is dubbeltelling. | **Schrappen** of expliciet motiveren als sector-specifiek (niet redundant met onvoorzien). |

**Structurele posten** (vanaf jaar 2 — 6 actief jaren):

| Component | Mid/jr | Cum. 6j | Plausibel? | Advies |
|---|---|---|---|---|
| Proceseigenaarschap-borging 14–18d × €700–850 | €12.000 | €72.000 | ✓ Plausibel | Smartprocess in stack. Externe sparring herleidbaar. | OK |

**Processen-totaal**: €150K = €21,4K/jr gem. — verdedigbaar.

---

## 4. Leiderschapsprogramma (cultuur) — €161.000

**Eenmalige posten** (€107,5K — bevat **bruto-bedragen, niet out-of-pocket**, zie disclaimer):

| Component | Mid | Plausibel? | Onderbouwing | Advies |
|---|---|---|---|---|
| Externe begeleider 15d × €2.500 | €37.500 | ✓ Plausibel | Berenschot Tariefbenchmark Adviesbranche 2026. **Disclaimer over bruto vs out-of-pocket helder.** | OK |
| Executive-tarief reservering | €20.000 | ⚠ Aandachtspunt | "1,5–2,5 dagen × €4.000 = €6–10K", maar component is **€20K**. **Verschil €10K niet onderbouwd.** | **Verlagen naar €10–12K** (consistent met redenering) of motiveren waarom hoger. |
| Individuele coaching 9 × €4.000 | €36.000 | ✓ Plausibel | NIP/NOLOC-register. 9 lg uit Stap 7 cultuur-domein. | OK |
| HR-instrumentarium 360° + cyclus | €15.000 | ⚠ Aandachtspunt | Redenering geeft "€5.000–€8.000". Component is **€15K = bijna 2× hoger**. **Onderbouwing-mismatch.** | **Verlagen naar €7–8K** of motiveren extra werk dat in redenering ontbreekt. |

**Structurele posten** (gespreid: jr 1, jr 3, jr 5):

| Component | Mid/jr | Actief in 7j | Cum. | Plausibel? | Advies |
|---|---|---|---|---|---|
| 360°-tool licentie (vanaf jr 1) | €5.000 | 7 jr | €35.000 | ✓ Plausibel | Effectory €4–6K/jr. | OK |
| Cultuurmeting (vanaf jr 3) | €2.500 | 5 jr | €12.500 | ✓ Plausibel | Effectory MT-laag €2–3K/meting. Goed gespreid voor 7j. | OK |
| Onboarding leiders (vanaf jr 5) | €2.000 | 3 jr | €6.000 | ✓ Plausibel | 1–2 nieuwe lg/jr × €1–2K. | OK |

**Leiderschap-totaal**: €161K = €23K/jr gem. — verdedigbaar mits twee aandachtspunten worden gefixt.

---

## 5. Post onvoorzien (programma-breed) — €140.000

| Aspect | Waarde | Plausibel? |
|---|---|---|
| Bedrag | €140.000 | — |
| % van programma (excl. onvoorzien €1.628K) | **8,6%** | ⚠ **Onder Cito-norm 10%** |
| Berekening | Niet zichtbaar — geen formule of ratio in bron | ❓ Onbenoemd |
| Risico-onderbouwing | Ontbreekt | ❓ Geen koppeling met risico-buffer |

**Advies**: **Verhogen naar €165K (10% van €1.628K)**, met expliciete vermelding *"10%-norm conform Cito-programmakader, dekt: scope-variatie sectoren, externe-tarief-stijging, vertraagde go-live CRM"*.

---

## Cap-toetsing per jaar (cap = €250K/jr)

Met onvoorzien gelijk verdeeld over 7j (€20K/jr):

| Jaar | Eenmalig | Structureel | Onvoorzien | Totaal | Cap | Status |
|---|---|---|---|---|---|---|
| 2026 (jr 1) | €833.000 | €5.000 | €20.000 | **€858.000** | €250K | **OVER +€608K** |
| 2027 (jr 2) | €0 | €112.000 | €20.000 | €132.000 | €250K | OK |
| 2028 (jr 3) | €0 | €114.500 | €20.000 | €134.500 | €250K | OK |
| 2029 (jr 4) | €0 | €134.500 | €20.000 | €154.500 | €250K | OK |
| 2030 (jr 5) | €0 | €136.500 | €20.000 | €156.500 | €250K | OK |
| 2031 (jr 6) | €0 | €136.500 | €20.000 | €156.500 | €250K | OK |
| 2032 (jr 7) | €0 | €136.500 | €20.000 | €156.500 | €250K | OK |
| **Totaal** | **€833K** | **€775K** | **€140K** | **€1.748K** | €1.750K | OK gemiddeld |

**Verdedigingsadvies stuurgroep**: Cap is nominaal gehaald (gem. €250K/jr), maar **jaar 1 piekt op €858K**. Ofwel:
- **(a) CRM-implementatie faseren over jr 1+jr 2** (€500K + €333K) → jr 1 zakt naar €525K (nog steeds boven cap, maar verdedigbaar als "investerings-piek").
- **(b) Cap als 7-jaars gemiddelde formuleren** (zoals nu impliciet) — vraagt expliciete stuurgroep-instemming.

---

## Concrete adviezen (priority)

1. **CRM-implementatie temporeel spreiden over jaar 1 én 2** (€312K → €175K + €137K). Voorkomt €858K-piek in 2026 — dit is **het grootste verantwoording-risico**.
2. **Onvoorzien €140K → €165K** (10% van programma) en motiveren met 3 risico-categorieën.
3. **CRM-beheer €30K/jr → €40–45K/jr** (Forrester-norm 0,5–0,8 FTE i.p.v. 0,3 FTE).
4. **Leiderschap "Executive-tarief" €20K → €10K** OF motiveren €10K extra-werk.
5. **Leiderschap "HR-instrumentarium" €15K → €8K** OF motiveren €7K extra-werk.
6. **Processen "Sectorvariatie-buffer €6K"** schrappen (dubbeltelling met onvoorzien).
7. **CRM-reconciliatiebuffer €35K** zichtbaar maken als component "PM-reservering datakwaliteit".
8. **LMS-licentie**: 5 jaar → 7 jaar (€42K) OF naar structureel (€6K/jr).

---

## Verantwoordbaarheid voor stuurgroep (≈200 woorden)

Een directeur kan deze begroting voor **drie van de vier inspanningen** verdedigen zonder grote vragen: Gesprekvaardigheidstraining (€222K), Processen (€150K) en het structurele deel van Leiderschap (€53K) zijn rekenkundig herleidbaar, baseren tarieven op Berenschot/NIP/MS Pricing en hebben aantallen die uit Stap 7 of het dossier komen. De CRM-investering (€1.095K = 62% van programma) is op hoofdlijnen verdedigbaar (MS Pricing-licenties zijn waterdicht), maar drie kwetsbaarheden komen direct in beeld bij kritisch lezen:

**Kwetsbaarheid 1**: **De cap-piek in 2026** (€858K op een cap van €250K) is technisch een driewerf-overschrijding. Zonder fasering of expliciete cap-herinterpretatie naar 7-jaars-gemiddelde is dit het eerste wat een CFO opmerkt.

**Kwetsbaarheid 2**: **Het CRM-beheer van €30K/jr** (0,3 FTE) onderschat de Forrester-norm voor 85-gebruikers MS Dynamics — risico op meerwerk-discussie binnen 18 maanden.

**Kwetsbaarheid 3**: **Twee leiderschapscomponenten (Executive-tarief €20K en HR-instrumentarium €15K)** wijken af van de eigen redeneringstekst zonder onderbouwing van het verschil. Op vraag "waarom precies dit bedrag?" is er geen herleidbaar antwoord. Dit zijn samen €35K — niet groot, maar het ondergraaft de geloofwaardigheid van de andere bedragen.

Met de 8 voorgestelde fixes is deze begroting volledig stuurgroep-proof.
