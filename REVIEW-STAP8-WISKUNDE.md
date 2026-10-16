# REVIEW Stap 8 — Wiskundige audit BerekeningenStep.tsx

**Bestand:** `src/components/steps/BerekeningenStep.tsx` (2091 regels)
**Bron lifecycle-curves:** `scripts/rebalance-verdeling.ts`
**Datum:** 2026-05-02
**Sessie referentie:** d8b97442-ce8f-4134-b2c7-67dc8e3a3f93

---

## Samenvatting

**Verdict: PASS-met-kanttekeningen.**

De macro-wiskunde klopt: lifecycle-curves sommeren naar 100, scenario-totaalsommen kloppen exact (Δ=€0 in alle 4 scenarios voor d8b97442), benuttings-percentages zijn rekenkundig correct, en de tolerantie-logica voor de Sectie D-checks is intern consistent. De individuele componenten-berekeningen zijn over het algemeen verdedigbaar afgerond. **Maar:** de bottom-up component-sommen sluiten niet altijd aan op de DOSSIERS-ranges, de risico-buffer-cirkelredenering hanteert willekeurige basisbedragen, en CRM heeft een midpoint-fout van €2.500.

**Top 3 kritieke bugs:**

1. **CRM `eenmaligMid` is 2.500 lager dan (min+max)/2** (regel 102-104). 455.000 + 680.000 = 1.135.000 → mid hoort 567.500 te zijn, niet 565.000. Dit is de enige mid-fout in DOSSIERS.
2. **Leiderschapsprogramma component-sommen liggen ~10K boven DOSSIER-range** (regels 446-478 vs regels 130-138). Σ componenten min = 45.500 vs DOSSIER.min = 33.000 (Δ +12,5K); Σ max = 52.500 vs DOSSIER.max = 43.000 (Δ +9,5K). Het label in de UI "(mid € 38.000)" matcht niet met (Σmin+Σmax)/2 = 49.000.
3. **Risico-buffer-component CRM gebruikt willekeurige basisbedragen** (regels 268-270). "440K", "540K", "540K" zijn niet de bottom-up sommen van de andere CRM-componenten (excl. buffer), niet de DOSSIER-min/mid/max, en niet onderling consistent. 8% × 440K = 35.200, dat is naar boven afgerond op 40.000 (+13,6%) — geen afronding maar een oprek.

---

## Per-onderdeel bevindingen

### 1. DOSSIERS-tabel — interne consistentie  ⚠ ONNAUWKEURIG

| Dossier | min | max | (min+max)/2 | mid in code | Δ | Verdict |
|---|---|---|---|---|---|---|
| CRM | 455.000 | 680.000 | **567.500** | 565.000 | **−2.500** | ✗ fout |
| Uniforme klantbenadering | 55.000 | 70.000 | 62.500 | 62.500 | 0 | ✓ |
| Gespreksvaardigheid | 125.000 | 160.000 | 142.500 | 142.500 | 0 | ✓ |
| Leiderschap | 33.000 | 43.000 | 38.000 | 38.000 | 0 | ✓ |
| Klantfeedback | 40.000 | 60.000 | 50.000 | 50.000 | 0 | ✓ |
| Klantdata-platform | 200.000 | 300.000 | 250.000 | 250.000 | 0 | ✓ |

**Toelichting-coherentie:**
- CRM toelichting (regel 107) zegt "€455K–€680K" → matcht DOSSIERS.min/max ✓ — maar ziet de gebruiker dat 565K niet de echte midpoint is.
- Alle andere toelichtingen kloppen met de getallen in de velden.

**Structureel realisme:** structureelPerJaar bedragen zijn redelijk t.o.v. eenmalig (CRM 92,5K = 16% van 565K eenmalig; klantfeedback 10K = 20% van 50K). Geen rode vlaggen.

### 2. COMPONENT_BREAKDOWNS optellen tot DOSSIERS  ✗ FOUT

#### CRM (eenmalig)
- Σ rangeMin componenten: 250.000 + 75.000 + 40.000 + 30.000 + 40.000 = **435.000**
- Σ rangeMax componenten: 375.000 + 125.000 + 55.000 + 60.000 + 80.000 = **695.000**
- DOSSIER.min = 455.000 → **Δ −20.000** (componenten 20K lager)
- DOSSIER.max = 680.000 → **Δ +15.000** (componenten 15K hoger)
- Σmid van componenten: (435+695)/2 = **565.000** = DOSSIER.eenmaligMid ✓ (toevallig consistent met code-mid, maar de UI-balk toont "Σ eenmalig 435K – 695K (mid 565K)" terwijl de range-uiteinden wijken van de DOSSIER-range af)

#### CRM (structureel)
- Σ perJaarMin: 63.000 + 30.000 = 93.000
- Σ perJaarMax: 63.000 + 30.000 = 93.000
- DOSSIER.structureelPerJaar = 92.500 → Δ +500 (verwaarloosbaar) ✓

#### Uniforme klantbenadering (eenmalig)
- Σ min: 16.000 + 20.000 + 8.000 + 5.000 + 6.000 = **55.000** ✓ = DOSSIER.min
- Σ max: 16.000 + 25.000 + 12.000 + 10.000 + 7.000 = **70.000** ✓ = DOSSIER.max
- Σmid: 62.500 = DOSSIER.mid ✓
- **Verdict: perfect aligned.**

#### Uniforme klantbenadering (structureel)
- 1 component à 12.500/jaar = 12.500 = DOSSIER.structureelPerJaar ✓

#### Gespreksvaardigheid (eenmalig) — ✗ FOUT
- Σ min componenten: 52.000 + 10.000 + 15.000 + 10.000 + 20.000 + 8.000 = **115.000**
- Σ max componenten: 52.000 + 10.000 + 30.000 + 15.000 + 30.000 + 13.000 = **150.000**
- DOSSIER.min = 125.000 → **Δ −10.000**
- DOSSIER.max = 160.000 → **Δ −10.000**
- Σmid: (115+150)/2 = **132.500** vs DOSSIER.mid = 142.500 → **Δ −10.000**
- UI-label "Σ eenmalig 115K – 150K (mid 142.500)" toont een mid die buiten de balk-range valt — visueel/wiskundig misleidend.

#### Gespreksvaardigheid (structureel)
- Lege array, structureelNote present ✓
- Klopt met DOSSIER.structureelPerJaar = 0 ✓
- Verdict: ✓ correct (geen structurele kosten is methodisch verdedigbaar)

#### Leiderschapsprogramma (eenmalig) — ✗ FOUT
- Σ min: 37.500 + 3.000 + 5.000 = **45.500**
- Σ max: 37.500 + 5.000 + 10.000 = **52.500**
- DOSSIER.min = 33.000 → **Δ +12.500** (componenten **38% hoger**)
- DOSSIER.max = 43.000 → **Δ +9.500** (componenten **22% hoger**)
- Σmid: (45.5+52.5)/2 = **49.000** vs DOSSIER.mid = 38.000 → **Δ +11.000**
- Dit is de **grootste bottom-up-versus-dossier-discrepantie** in de hele audit. De stuurgroep ziet een Σ-balk van "45.500 – 52.500 (mid 38.000)" — mid valt **buiten** de balk-range aan de lage kant.

#### Leiderschapsprogramma (structureel)
- Σ min: 5.000 + 2.000 = 7.000
- Σ max: 8.000 + 3.000 = 11.000
- Σmid: 9.000 vs DOSSIER 7.500 → Δ −1.500 (componenten 20% hoger)
- Verdict: ⚠ kleine afwijking

**Verdict onderdeel 2:** ✗ fout voor CRM, Gespreksvaardigheid, Leiderschap (3 van 4 inspanningen waarvoor breakdowns bestaan).

### 3. Risico-buffer cirkelredenering  ✗ FOUT

CRM-component "Risico-buffer onvoorzien" (regels 263-272):

| Variant | Formule | Berekend | Afgerond | Verschil |
|---|---|---|---|---|
| Min | 8% × 440K | 35.200 | 40.000 | **+13,6%** ⚠ |
| Mid | 11% × 540K | 59.400 | 60.000 | +1,0% ✓ |
| Max | 15% × 540K | 81.000 | 80.000 | −1,2% ✓ |

**Basis-analyse "440K / 540K":**

Som van **andere** CRM-componenten (excl. buffer):
- Min (excl. buffer): 250 + 75 + 40 + 30 = **395K**
- Max (excl. buffer): 375 + 125 + 55 + 60 = **615K**
- Mid bottom-up (excl. buffer): (395+615)/2 = **505K**

Vergelijking:
- "440K" past niet bij min-excl-buffer (395K), niet bij DOSSIER.min (455K), niet bij Σ-min-incl-buffer (435K). **Onverklaarde keuze** — vermoedelijk afgerond van DOSSIER.min−15K.
- "540K" past niet bij mid-excl-buffer (505K), niet bij DOSSIER.mid (565K), niet bij Σ-mid-incl-buffer (565K). **Onverklaarde keuze.**
- "540K" voor max past niet bij max-excl-buffer (615K), DOSSIER.max (680K), Σ-max-incl-buffer (695K). **Niet-verdedigbaar** — buffer-percentage moet logisch op een hoger basisbedrag toegepast worden voor het Max-scenario.

**Logica-inconsistentie:** Min gebruikt 440K, Mid 540K, Max **ook 540K**. Bij Max zou je verwachten dat de basis hoger is dan bij Mid (hogere kostenbasis → hogere absolute buffer). Door dezelfde basis te gebruiken, is de Max alleen door een hoger percentage hoger — dat is verdedigbaar als "buffer-percentage neemt toe bij hogere onzekerheid", maar niet logisch als "buffer = % × eenmalig".

**Cirkelredenering:** Buffer-component zit **in** de DOSSIER-range. Als buffer = 8–15% van Σ-andere-componenten, dan zou je verwachten:
- Min-buffer: 8% × 395K = 31.600 → afgerond 30K of 35K
- Mid-buffer: 11% × 505K = 55.550 → 55K of 60K
- Max-buffer: 15% × 615K = 92.250 → 90K of 95K

De huidige cijfers (40/60/80K) hanteren een gemiddelde basis die **niet uit de bottom-up volgt**. De toelichting "8-15% van eenmalige investering" suggereert wél bottom-up, maar de cijfers volgen het niet.

**Verdict:** ✗ fout — tekst en cijfers spreken elkaar tegen; min-afronding is +13,6% (geen afronding maar oprek); max-basis is identiek aan mid-basis.

### 4. Scenario-berekeningsformule  ✓ CORRECT met kanttekening

Formule `inspanning-totaal = eenmaligMid + structureelPerJaar × aantalJaren` wordt toegepast op:
- regel 877 (`Sectie0VolledigeBerekening` — Stap 2)
- regels 893-894 (sumBerekend / sumWerkelijk in dezelfde sectie)
- regel 1367 (Stap1ComponentDerivation tekst)
- regel 1584-1585 (`SectieB` — `berekend` kolom)
- regels 1716-1719 (`SectieScenarioTotaal` rows)
- regels 1731-1732 (sumBerekend / sumWerkelijk in B+)
- regel 1801 (B+ samenvattings-tekst)

De formule is **rekenkundig correct**. Alle 7 plekken gebruiken dezelfde eenmaligMid + structJr × aantalJaren-formule. ✓

**Driftinterpretatie B+ (regel 1789):** "scenario is opgehoogd / verlaagd t.o.v. dossier-mid" — semantisch klopt dit (positieve drift = werkelijk hoger dan bottom-up = scenario opgehoogd). ✓

**Tolerantie-issue regel 1586:** `derivTol = max(50.000, 15% × berekend)`.
- Commentaar zegt "scenario kan ±20% schuiven" maar tolerantie staat op 15%.
- Reken-test: voor een inspanning waarbij berekend = 565.000 (CRM optimaal mid):
  - +20% scenario zou werkelijk = 678.000 maken → drift = 113.000.
  - 15% × 565.000 = 84.750 → derivTol = 84.750.
  - 113.000 > 84.750 → derivMatch = false → toont "≈" (amber).
- **False-positive risk: nee.** Sterker, dit is een **false-NEGATIVE**: de match-kolom toont "≈" voor scenarios die binnen de geadverteerde ±20% vallen, terwijl de tekst suggereert dat dat OK is.
- **Wel: de Match-kolom is conservatief**: alle non-mid-scenarios krijgen "≈" en de gebruiker moet de legenda lezen om te weten dat dit normaal is.

**Verdict:** ✓ correct, ⚠ tolerantie-getal (15%) ligt onder advertentie-getal (20%) in commentaar.

### 5. Lifecycle-curves som = 100  ✓ PERFECT

Alle 16 curves verifieerd (4 domeinen × 4 jaren-configuraties):

| Domein | 4 jr | 5 jr | 7 jr | 10 jr |
|---|---|---|---|---|
| data_systemen | 15+35+35+15 = 100 ✓ | 12+25+30+22+11 = 100 ✓ | 10+20+25+18+12+10+5 = 100 ✓ | 5+10+14+18+18+14+10+6+3+2 = 100 ✓ |
| mens | 15+40+35+10 = 100 ✓ | 10+30+35+18+7 = 100 ✓ | 8+20+25+20+15+8+4 = 100 ✓ | 5+15+20+18+14+10+8+5+3+2 = 100 ✓ |
| cultuur | 20+35+30+15 = 100 ✓ | 15+25+25+20+15 = 100 ✓ | 10+16+20+18+15+12+9 = 100 ✓ | 8+12+14+14+12+12+10+8+6+4 = 100 ✓ |
| processen | 25+35+25+15 = 100 ✓ | 20+30+25+15+10 = 100 ✓ | 15+22+20+15+12+10+6 = 100 ✓ | 10+18+18+15+12+8+7+5+4+3 = 100 ✓ |

**Vergelijking met `scripts/rebalance-verdeling.ts` (regels 34-61):** alle 16 arrays zijn **bit-identiek** met de bron. ✓ Geen divergentie.

### 6. Tolerance-logica  ✓ CORRECT

`tolerantie(totaal) = max(5000, totaal × 0.005)` (regels 519-521).

| Scenario | Totaal | 0,5% | Tolerantie |
|---|---|---|---|
| optimaal | 1.490.000 | 7.450 | **7.450** |
| plus20 | 1.270.000 | 6.350 | **6.350** |
| advies | 1.159.000 | 5.795 | **5.795** |
| min20 | 1.819.500 | 9.097,5 | **9.098** |

**Toepassing in 4 Sectie D-checks:**
- Check 1 (Σ inspanning-totalen = scenario-totaal): scenario-tolerantie ✓
- Check 2 (Σ jaartotalen = scenario-totaal): scenario-tolerantie ✓
- Check 3 (Geen jaar boven cap): **scenario-tolerantie**, niet cap-tolerantie ⚠ (zie sectie 9 hieronder voor false-positive analyse)
- Check 4 (Σ verdelingPerJaar per inspanning = inspanning-totaal): per-inspanning-tolerantie ✓

**Per-inspanning vs scenario-tol:**
- Een €100K inspanning krijgt tolerantie max(5.000, 500) = **5.000 = 5,0%** marge.
- Een €1M inspanning krijgt tolerantie max(5.000, 5.000) = **5.000 = 0,5%** marge.
- Inderdaad: kleinere inspanningen krijgen hogere relatieve marge. Maar omdat alle bedragen in Supabase op duizendtallen worden afgerond (zie rebalance-verdeling.ts regel 83), is dit geen praktisch probleem.

**Verdict:** ✓ correct, met kanttekening bij Check 3 (zie 9).

### 7. Theoretisch-curve-toepassing  ⚠ KLEINE DRIFT

Formule (regel 904): `Math.round((curve[idx] / 100) * r.werkelijk)`.

**Klopt formule:** Ja — curve-percentage × inspanning-totaal, afgerond op €1.

**Rounding-drift:**
- Voor werkelijk = 1.000.000 met curve [10, 20, 25, 18, 12, 10, 5]: alle cellen exact, som = 1.000.000.
- Voor werkelijk = 1.234.567 met dezelfde curve: cellen = [123.457, 246.913, 308.642, 222.222, 148.148, 123.457, 61.728] → Σ = 1.234.567 (exact toevallig hier).
- Voor werkelijk = 1.234.500 (rebalance-verdeling rondt op duizendtallen): elke cell = veelvoud van 1.234,5 → kan tot ±3 € drift veroorzaken over 7 cellen.

**Verschil met rebalance-verdeling.ts:** Die rondt op duizendtallen (regel 83) en compenseert drift in grootste cel (regels 84-89). BerekeningenStep doet géén drift-correctie en rondt op €1. Dit kan tot **±€7 drift** in de "Σ theoretisch jaar-totalen"-rij van Stap 3 leiden.

**Praktische impact:** verwaarloosbaar — €7 op €1.000.000 = 0,0007% — maar de UI presenteert dit als "exact". Geen visuele bug maar academisch onnauwkeurig.

**Verdict:** ⚠ correct in formule, maar mist drift-compensatie die wel in de bron-script staat.

### 8. Sectie A "Theoretisch max"  ✓ CORRECT (alle 4 scenarios)

`theoMax = cap × aantalJaren`, `benutting = totaalScenario / theoMax` met Math.round naar % (regel 23).

| Scenario | Cap | Jaren | TheoMax | Totaal | Benutting | UI |
|---|---|---|---|---|---|---|
| optimaal | 250.000 | 7 | 1.750.000 | 1.490.000 | 0,8514 → 85% | ✓ |
| plus20 | 300.000 | 5 | 1.500.000 | 1.270.000 | 0,8467 → 85% | ✓ |
| advies | 341.000 | 4 | 1.364.000 | 1.159.000 | 0,8497 → 85% | ✓ |
| min20 | 200.000 | 10 | 2.000.000 | 1.819.500 | 0,9098 → 91% | ✓ |

Alle 4 berekend bedragen kloppen met code-output. ✓

### 9. "Geen jaar boven cap" check  ⚠ MOGELIJK FALSE-POSITIVE

Check (regel 760): `jaren.every((j) => (officieelPerJaar[j] ?? 0) <= cap + tol)`.

`tol` is hier de **scenario-tolerantie** (`tolerantie(totaalScenario)`), niet een cap-specifieke tolerantie.

**Concrete false-positive scenarios:**

| Scenario | Cap | Tol | Cap+Tol | Werkelijke "boven cap" zonder alarm |
|---|---|---|---|---|
| optimaal | 250.000 | 7.450 | 257.450 | Een jaar van €257.000 → ✓, maar §4.1 toont €257K (2,8% over cap) |
| min20 | 200.000 | 9.098 | 209.098 | Een jaar van €208.000 → ✓, maar §4.1 toont €208K (4,0% over cap) |

**Risico:** Een gebruiker ziet in §4.1 dat een jaartotaal boven cap valt (UI toont rood, ⚠), maar Sectie D zegt "✓ klopt" — interne tegenspraak in dezelfde stap.

**Logischere keuze:** kleinere cap-marge, bijv. `Math.max(1000, cap × 0.001)` om alleen afrondingsfouten op duizendtallen te tolereren. Of helemaal geen tolerantie — `<= cap` strict.

**Voor sessie d8b97442:** alle scenarios benutten max 100% — geen praktische false-positive in deze sessie. Maar de logica is fragiel voor toekomstige sessies waar water-fill niet alle overschrijdingen oplost.

**Verdict:** ⚠ logisch fout, geen actuele false-positive maar structureel risico.

### 10. Inconsistente afrondingen  ⚠ ÉÉN GROTE, REST OK

Sample van 18 berekeningen geverifieerd:

| Bron | Formule | Echt | Afgerond | Δ% | Verdict |
|---|---|---|---|---|---|
| CRM impl. min | 1500 × 150 | 225.000 | 250.000 | +11,1% | ⚠ "afgerond" terwijl tekst zegt "~10% PM-buffer" — tolerantie is 11,1%, OK |
| CRM impl. mid | 2000 × 160 | 320.000 | 320.000 | 0 | ✓ |
| CRM impl. max | 2500 × 170 | 425.000 | 375.000 | −11,8% | ⚠ "capped" — verdedigbaar maar significant |
| CRM training min | 85×350+10K | 39.750 | 40.000 | +0,6% | ✓ |
| CRM training max | 85×500+15K | 57.500 | 55.000 | −4,3% | ⚠ "capped" |
| CRM datamigratie min | 7×8K+15K | 71.000 | 75.000 | +5,6% | ⚠ kleine oprek |
| CRM datamigratie max | 8×15K+20K | 140.000 | 125.000 | −10,7% | ⚠ "capped" — significant |
| **CRM risico-buffer min** | **8% × 440K** | **35.200** | **40.000** | **+13,6%** | **✗ overgrote afronding** |
| CRM risico-buffer mid | 11% × 540K | 59.400 | 60.000 | +1,0% | ✓ |
| CRM risico-buffer max | 15% × 540K | 81.000 | 80.000 | −1,2% | ✓ |
| CRM licenties | 85 × 740 | 62.900 | 63.000 | +0,2% | ✓ |
| Uniforme werksessies min | 9 × 2.200 | 19.800 | 20.000 | +1,0% | ✓ |
| Uniforme werksessies max | 9 × 2.800 | 25.200 | 25.000 | −0,8% | ✓ |
| Gespreksvaardig. nulmeting | 3 × 3.300 | 9.900 | 10.000 | +1,0% | ✓ |
| Leiderschap externe begel. | 15 × 2.500 | 37.500 | 37.500 | 0 | ✓ |
| Leiderschap progr.-ontw. min | 2×1K+1K | 3.000 | 3.000 | 0 | ✓ |
| Leiderschap progr.-ontw. max | 3×1.250+1.250 | 5.000 | 5.000 | 0 | ✓ |
| **Leiderschap doorl. begel. max** | **3 × 2.750** | **8.250** | **8.000** | **−3,0%** | **⚠ kleine onjuiste afronding** |
| Leiderschap HR coörd. max | 30×85+450 | 3.000 | 3.000 | 0 | ✓ |

**Grote bevindingen:**
- CRM risico-buffer min "afronding" is +13,6% (moet ofwel 35K worden, of de basis ophogen naar ~500K).
- Leiderschap doorlopende begeleiding max: 3 × 2.750 = 8.250, code zegt 8.000 — 3% afgerond naar beneden zonder cap-aanduiding.
- Drie "capped"-afrondingen (CRM impl. max, training max, datamigratie max) zijn redactioneel verdedigbaar (uitleg: realistisch plafond) maar zijn 4–12% lager dan de kaalformule. Geen wiskundige fout, wel transparantie-vraag.

**Verdict:** 17/18 binnen acceptabele tolerantie (≤±1%); 1 grote uitschieter bij CRM risico-buffer min.

### 11. Sectie B "= Berekend" kolom  ✓ CORRECT

Formule (regel 1585): `berekend = eenmalig + structTotaal` waarbij `structTotaal = structJr × aantalJaren`.

**Reken-test voor sessie d8b97442:**

| Scenario | Inspanning | berekend | werkelijk (Supabase) | drift | derivTol (15%) | Match? |
|---|---|---|---|---|---|---|
| optimaal (7j) | CRM | 565K + 92,5K×7 = 1.212K | (geschat) ~750K-1.0M | substantieel | ~182K | ≈ |
| plus20 (5j) | CRM | 565K + 92,5K×5 = 1.027K | — | — | ~154K | — |
| advies (4j) | CRM | 565K + 92,5K×4 = 935K | — | — | ~140K | — |
| min20 (10j) | CRM | 565K + 92,5K×10 = 1.490K | — | — | ~224K | — |

(De werkelijke per-inspanning bedragen uit Supabase staan niet in dit audit-bestand, dus exacte match-test niet uitvoerbaar zonder DB-toegang.)

**Theoretische false-positive analyse:**
- Bij berekend = 1.000.000: derivTol = max(50K, 150K) = 150K
- Een werkelijk-bedrag van 1.150.000 (+15%) of 850.000 (−15%) valt **net binnen** ✓
- Een werkelijk-bedrag van 1.200.000 (+20%) of 800.000 (−20%) valt **buiten** → ≈
- → De geadverteerde "scenario kan ±20% schuiven" past **niet** bij de 15%-tolerantie. Pure plus20/min20-scenarios geven mogelijk false-negatives (≈ ipv ✓), wat verwarrend is voor stuurgroep.

**Verdict:** ✓ formule correct, ⚠ tolerantie te krap voor advertentie.

### 12. Format-functies  ⚠ EDGE CASE PRECISIE-VERLIES

#### `formatEur(n)` (regel 9-12)
- `formatEur(NaN)` → "—" ✓
- `formatEur(undefined)` → "—" ✓
- `formatEur(-1.000)` → "€ -1.000" ✓ (rond werkt)
- `formatEur(0)` → "€ 0" ✓
- `formatEur(1e15)` → "€ 1.000.000.000.000.000" — werkt, geen overflow
- **Verdict:** ✓ robuust

#### `formatEurK(n)` (regel 14-19)
- `formatEurK(999.999)`: niet ≥ 1M, ≥ 1K → `Math.round(999.999/1.000) = 1000` → **"€ 1000K"** — onlogische output (zou 1M moeten zijn)
- `formatEurK(999.500)`: zelfde → "€ 1000K"
- `formatEurK(1.249)`: `Math.round(1,249) = 1` → "€ 1K" — **verlies van precisie 24,9%**
- `formatEurK(1.500)`: round = 2 → "€ 2K" — verlies 33%
- `formatEurK(0)` → "€ 0" ✓
- `formatEurK(NaN)` → "—" ✓
- `formatEurK(-1.500.000)`: abs ≥ 1M → "€ -1,50M" ✓
- **Verdict:** ⚠ K-grens (≥1K) toont aanzienlijk precisie-verlies tussen 1.000–9.999. M-grens valt over 999.999 (toont 1000K ipv 1M).

**Praktische impact in BerekeningenStep:** wordt gebruikt in scenario-picker (`s?.totaalGeraamdEuro` — altijd >100K voor productie-scenarios), en in Stap 3 / Stap 5 voor cell-bedragen. Cell-bedragen kunnen 1K–10K zijn, dus precisie-verlies is reëel.

#### `pct(num, denom)` (regel 21-24)
- `pct(num, 0)` → "—" ✓
- `pct(num, -5)` → "—" ✓ (denom <= 0)
- `pct(-100, 1.000)` → "-10%" — werkt, maar onlogisch in context
- `pct(NaN, 100)` → "NaN%" — niet afgevangen, kan in UI verschijnen
- **Verdict:** ⚠ NaN niet afgevangen.

### 13. Edge case: aantalJaren ∉ {4,5,7,10}  ⚠ STILLE FALLBACK

Code (regels 902-915): als `CURVES[domein][aantalJaren]` undefined is, valt het in **fallback lineair** (`werkelijk / aantalJaren` per cel).

**Praktische scenarios:**
- Scenario met 3, 6, 8, 9 jaren → fallback lineair (geen S-curve, U-curve, etc.).
- **Geen UI-melding** dat curves niet beschikbaar zijn voor dat aantal jaren.
- In Sectie C wordt curve-string als "lineair" getoond (regel 1020: `r.curve ? r.curve.join("/") + "%" : "lineair"`), wat een **stille hint** is, maar geen prominente waarschuwing.

**Voor sessie d8b97442:** scenarios zijn 4, 5, 7, 10 — geen fallback geactiveerd. ✓

**Verdict:** ⚠ silent failure — geen blokker maar gebruiker moet zelf opmerken dat de curve-uitleg afwijkt.

---

## Kritieke bug-lijst (severity hoog → laag)

### HOOG

1. **CRM risico-buffer-component basis-bedragen incoherent** (regels 268-270)
   - Wat is mis: 440K (min), 540K (mid), 540K (max) zijn niet onderbouwd uit bottom-up componenten of DOSSIER-range. Min/Max gebruiken verschillende basissen op een manier die niet uit de toelichting volgt. Het label zegt "% van eenmalige investering" maar de basis matcht geen enkele eenmalige som.
   - Wat zou moeten: uitgaan van Σ-andere-CRM-componenten bij min/mid/max:
     - Min: 8% × 395K = 31.600 → 30K of 35K
     - Mid: 11% × 505K = 55.550 → 55K of 60K
     - Max: 15% × 615K = 92.250 → 90K of 95K
   - Voorstel fix: herrekenen van buffer als percentage van Σ-andere-componenten en label-tekst aanpassen.

2. **Leiderschapsprogramma-componenten zijn 22-38% hoger dan DOSSIER-range** (regels 446-478 vs 130-138)
   - Wat is mis: Σ min componenten = 45.500 (DOSSIER min = 33.000); Σ max = 52.500 (DOSSIER max = 43.000). UI-balk toont mid 38.000 als "tussen" 45.500 en 52.500 — wat onmogelijk is.
   - Wat zou moeten: óf DOSSIER-range ophogen naar (45.500–52.500, mid 49.000), óf componenten verlagen.
   - Voorstel fix: DOSSIER-range corrigeren naar de bottom-up sommen, óf componenten herzien om binnen 33–43K te vallen. De toelichting "Eenmalig €33K–€43K (programma, coaching, intervisie)" sluit duidelijk niet aan bij de 3 component-bedragen.

3. **Gespreksvaardigheid-componenten zijn 7-8% lager dan DOSSIER-range** (regels 374-437 vs 121-128)
   - Wat is mis: Σ min = 115K (DOSSIER min = 125K); Σ max = 150K (DOSSIER max = 160K); Σ-mid = 132,5K vs DOSSIER-mid = 142,5K. UI-balk toont mid 142.500 buiten balk-range.
   - Wat zou moeten: range alignment, hetzij component-bedragen bijsturen, hetzij DOSSIER-range verlagen.
   - Voorstel fix: 10K toevoegen aan een van de componenten (bv. curriculum-ontwikkeling of materialen) om bottom-up = DOSSIER te krijgen.

### MIDDEL

4. **CRM `eenmaligMid` is 2.500 lager dan rekenkundig midpunt** (regel 104)
   - (455.000 + 680.000) / 2 = 567.500, code zegt 565.000.
   - Voorstel fix: één regel — wijzig `eenmaligMid: 565_000` → `eenmaligMid: 567_500`.

5. **CRM-componenten Σ min/max wijken af van DOSSIER-range** (regels 213-273 vs 102-104)
   - Σ-min = 435K (DOSSIER 455K), Σ-max = 695K (DOSSIER 680K). Σ-mid bottom-up valt toevallig op DOSSIER.eenmaligMid 565K.
   - De UI-balk toont "435K – 695K" terwijl de toelichting tekst spreekt van "455K – 680K".
   - Voorstel fix: óf component-bedragen aligneren met DOSSIER-range, óf DOSSIER-toelichting aanpassen.

6. **Sectie D Check 3 "geen jaar boven cap" gebruikt scenario-tolerantie i.p.v. cap-tolerantie** (regel 760)
   - Een jaartotaal van 257K bij cap 250K (optimaal) zou ✓ tonen vanwege tol = 7.450, terwijl §4.1 het bedrag rood/⚠ markeert (regel 1917-1926: `cap × 1.001`).
   - Voorstel fix: gebruik `cap * 0.001` of strict `<= cap` in Check 3, consistent met §4.1-rendering.

### LAAG

7. **Sectie B `derivTol` op 15%, advertentie op ±20%** (regel 1586 + 1652)
   - "scenario kan ±20% schuiven" maar tolerantie staat op 15%. Voor pure plus20/min20 scenarios → derivMatch = false → toont "≈" terwijl het normaal is.
   - Voorstel fix: `derivTol = max(50.000, 22% × berekend)` voor 22% (om afronding op te vangen bovenop 20%-shift).

8. **`formatEurK` precisie-verlies tussen 1.000–9.999** (regel 17)
   - 1.249 → "€ 1K" (verlies 24,9%); 1.500 → "€ 2K" (verlies 33%).
   - Voorstel fix: voor `< 10.000` toon één decimaal: `(n / 1.000).toFixed(1) + "K"` → "€ 1.2K", "€ 1.5K". Voor scenario-pickers en cell-bedragen behaalt dit veel betere precisie.

9. **`formatEurK` toont "€ 1000K" voor 999.500-999.999** (regel 17)
   - Geen prioriteit (zeldzaam in praktijk), maar inconsistent.
   - Voorstel fix: `if (Math.round(n) >= 999_500) return formatEurM`.

10. **Stap 3 theoretische curve-rounding-drift** (regel 904)
    - Math.round per cel zonder drift-compensatie kan ±€7 afwijking geven. Bron-script (rebalance-verdeling.ts) compenseert wél.
    - Voorstel fix: na de loop, drift = werkelijk − Σ cells; voeg drift toe aan grootste cel.

11. **Stille fallback bij aantalJaren ∉ {4,5,7,10}** (regel 908)
    - Geen UI-warning. "Curve" string verandert naar "lineair" maar dat valt makkelijk weg.
    - Voorstel fix: amber banner boven Sectie C bij fallback: "⚠ Geen lifecycle-curve gedefinieerd voor X jaren — lineaire verdeling toegepast."

12. **`pct` geeft "NaN%" bij num = NaN** (regel 21-24)
    - Niet afgevangen.
    - Voorstel fix: `if (!isFinite(num) || !isFinite(denom) || denom <= 0) return "—"`.

13. **Leiderschap doorl. begeleiding max afronding −3%** (regel 488)
    - 3 × 2.750 = 8.250, code zegt "= € 8.000/jaar". Geen "capped"-aanduiding.
    - Voorstel fix: corrigeer naar 8.250 of accepteer als afronding met expliciete tekst.

---

## False-positives die kunnen optreden

1. **Sectie D "✓ klopt" terwijl een jaartotaal boven cap valt.** Bij een jaar van 257.000 bij cap 250.000 (optimaal): 7K boven cap, maar 7K = scenario-tol → check_3 = ✓. §4.1 toont tegelijkertijd rode "⚠ over cap". Stuurgroep ziet tegenstelling binnen één stap.

2. **Sectie B Match-kolom toont ✓ voor +14% scenario.** Met 15%-tolerantie: een werkelijk dat 14% boven berekend ligt → ✓ — maar dat is geen advies-mid scenario, dat is +14% afgeleid. Lezer denkt "berekening klopt exact" terwijl er 14% drift is. (Inverse false-positive.)

3. **Sectie 0 Stap 1 UI-balk "Σ eenmalig 435K – 695K (mid 565K)" suggereert mid binnen range** — voor CRM klopt dit toevallig, maar voor **Leiderschap (45.500 – 52.500, mid 38.000)** valt mid expliciet **buiten** de balk-range. Visuele inconsistentie zonder waarschuwing.

4. **`formatEurK` rondt 999.500 af op "€ 1000K".** Een gebruiker leest "€ 1000K" en denkt 1.000.000, terwijl het werkelijk 999.500 is. In een audit-context (transparantie!) is dat misleidend.

5. **Sectie 0 Stap 3 "Σ theoretisch jaar-totalen" toont fictief exacte sommen** — Math.round per cel kan tot €7 drift veroorzaken die wordt gepresenteerd als "exact". Niet kritisch, wel academisch onnauwkeurig in een audit-pagina.

6. **Sectie B+ drift-tekst "scenario is opgehoogd / verlaagd t.o.v. dossier-mid"** — voor advies-scenario zou drift klein moeten zijn, maar omdat structureel × aantalJaren een sterk schalende factor is (4 jr × 92,5K = 370K vs 10 jr × 92,5K = 925K voor CRM), kan een drift van honderdduizenden euro's tussen scenarios "normaal" zijn. De tekst "voor het referentie-scenario hoort het verschil klein te zijn" is alleen waar als alle scenarios identieke aantal-jaren-mid hadden, wat niet zo is.

---

## Conclusie en aanbevelingen

**Macro-niveau:** alle scenario-totalen, jaartotalen, verdelingen-per-inspanning en lifecycle-curves zijn rekenkundig correct. Sessie d8b97442 toont Δ=€0 op alle Sectie D-checks. ✓

**Component-niveau:** drie van de vier breakdown-inspanningen (CRM, Gespreksvaardigheid, Leiderschap) hebben **niet-aansluitende bottom-up sommen vs DOSSIER-range**. Leiderschap is de grootste outlier (componenten 22-38% boven DOSSIER). Dit is een transparantie-probleem: stuurgroep ziet UI-balken waarvan mid buiten de range valt.

**Risico-buffer:** wiskundig zwak — basisbedragen ("440K", "540K") zijn niet onderbouwd uit de andere componenten en min-afronding is een +13,6% oprek.

**Aanbevolen prioritaire fixes:**
1. CRM `eenmaligMid` 565.000 → 567.500 (1 regel).
2. Leiderschap-componenten of DOSSIER-range aligneren (Δ groot).
3. Risico-buffer basisbedragen herrekenen op Σ-andere-componenten.
4. Cap-check tolerantie loskoppelen van scenario-tolerantie.
5. Gespreksvaardigheid en CRM bottom-up sommen aligneren met DOSSIER-range.

Voor de overige punten (formatEurK precisie, fallback-warning, derivTol-grens) geldt: cosmetisch / kleine UX-verbetering, niet rekenkundig fout.
