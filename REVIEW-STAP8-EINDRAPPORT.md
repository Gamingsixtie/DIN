# Eindrapport — Review Stap 8 (BerekeningenStep)

**Datum:** 2026-05-02
**Bestand:** `src/components/steps/BerekeningenStep.tsx` (2091 regels)
**Reviewers:** twee parallelle agents (begrijpelijkheid + wiskundige correctheid)
**Detail-rapporten:**
- [REVIEW-STAP8-BEGRIJPELIJKHEID.md](REVIEW-STAP8-BEGRIJPELIJKHEID.md)
- [REVIEW-STAP8-WISKUNDE.md](REVIEW-STAP8-WISKUNDE.md)

---

## Eindoordeel in één zin

**Macro-wiskunde klopt, maar voor een leek onleesbaar — en op component-niveau zit een aantal echte fouten waardoor de UI claims maakt die niet kloppen met de getoonde getallen.**

| Dimensie | Score | Verdict |
|---|---|---|
| **Begrijpelijkheid voor stuurgroep-lid zonder voorkennis** | 4/10 | ✗ pagina is alleen leesbaar mét programmamanager naast je |
| **Macro-wiskunde** (scenario-totalen, jaartotalen, lifecycle-curves) | 10/10 | ✓ alle Δ=€0 in sessie d8b97442 |
| **Component-wiskunde** (DOSSIERS vs COMPONENT_BREAKDOWNS) | 5/10 | ✗ 3 van 4 inspanningen wijken af; Leiderschap toont mid buiten range |
| **Onderbouwing van risico-buffer** | 3/10 | ✗ basisbedragen niet uit bottom-up afgeleid |

---

## De 3 belangrijkste problemen

### 1. UI maakt claims die wiskundig niet kloppen (kritiek)

In Sectie 0 / Stap 1 toont de UI per inspanning een balk:
> "Σ eenmalig 45.500 – 52.500 **(mid € 38.000)**"

Voor **Leiderschap** valt de mid-waarde (38K) **buiten de balk-range** (45,5–52,5K). Voor **Gespreksvaardigheid** valt de mid (142,5K) buiten de Σ-range (115K–150K). Een audit-pagina die zegt "kijk, deze drie getallen horen bij elkaar" terwijl ze niet bij elkaar horen, ondermijnt het hele transparantie-doel.

**Bron:** `DOSSIERS`-tabel (regels 98–159) en `COMPONENT_BREAKDOWNS` (regels 209–507) zijn ooit los opgesteld en niet bijgewerkt naar elkaar. Zie [REVIEW-STAP8-WISKUNDE.md sectie 2](REVIEW-STAP8-WISKUNDE.md#L43-L93).

### 2. CRM risico-buffer is een schijn-berekening (kritiek)

Regels 263–273 tonen:
- "8% × € 440K eenmalig = € 35K → afgerond € 40.000" → werkelijk +13,6% (geen afronding)
- "11% × € 540K eenmalig = € 60.000" → mid
- "15% × € 540K eenmalig = € 80.000" → max

De basisbedragen 440K / 540K / 540K zijn niet onderbouwd:
- Σ andere CRM-componenten (excl. buffer): min 395K, mid 505K, max 615K — geen match
- DOSSIER-range CRM eenmalig: 455K / 567,5K / 680K — geen match
- Min en Max gebruiken verschillende basis (440 vs 540), wat niet uit de tekst volgt

Voor een stuurgroep-document is dit pijnlijk: het etiket zegt "% van eenmalige investering" maar de cijfers zijn ad-hoc.

### 3. Pagina lekt code in de stuurgroep-tekst (must-fix voor doelgroep)

Op zichtbare plekken staat letterlijk:
- `FASE_CHAINS` (regel 1013)
- `scripts/rebalance-verdeling.ts` (regel 1992)
- `scripts/normalize-fases.ts` (regel 1994)
- `Supabase (scenario.inspanningen[].verdelingPerJaar)` (regel 1090)
- `totalenPerJaar (scenario-veld)` (regel 1898)
- `Σ verdelingPerJaar (per inspanning) = inspanning-totaal` (regel 764) — **letterlijke variabelennaam in een check-label**

Dit zijn variabelennamen, bestandspaden en database-velden. Een stuurgroep-lid leest hier "ik moet kunnen programmeren om dit te lezen".

---

## Gecombineerde prioriteit-lijst (must-fix → nice-to-have)

| # | Prio | Type | Regel | Probleem | Voorstel fix | Effort |
|---|---|---|---|---|---|---|
| **1** | KRITIEK | wiskunde | 130–138 vs 446–478 | Leiderschap: Σ componenten 45,5–52,5K, DOSSIER 33–43K. Mid 38K valt buiten Σ-range. | Componenten verlagen óf DOSSIER-range ophogen. Toelichting "€33K–€43K" sluit duidelijk niet aan — die kant van de fix lijkt logischer. | M |
| **2** | KRITIEK | wiskunde | 121–128 vs 374–437 | Gespreksvaardigheid: Σ componenten 115–150K, DOSSIER 125–160K. Mid 142,5K valt buiten Σ-range. | 10K toevoegen aan curriculum-ontwikkeling of materialen om bottom-up = DOSSIER te krijgen. | S |
| **3** | KRITIEK | wiskunde | 263–273 | CRM risico-buffer: basisbedragen 440K/540K/540K niet uit Σ-andere-componenten herleidbaar; min-"afronding" is +13,6% oprek. | Herrekenen als percentage van Σ-andere-CRM-componenten (excl. buffer): min 8%×395K=31,6K, mid 11%×505K=55,6K, max 15%×615K=92,3K. | M |
| **4** | KRITIEK | begrijp | 1090, 1898, 1992–1994 | Code-lekkage in user-facing tekst (FASE_CHAINS, Supabase, scriptpaden, variabelennamen). | Verwijder of verplaats naar uitklapbare "Technische verantwoording". Vervang `totalenPerJaar (scenario-veld)` door "Officiële jaartotalen". | S |
| **5** | KRITIEK | begrijp | 936–944 | Sectie 0 default `<details>` dicht — daardoor mist de leek de cruciale `MinMidMaxToelichting` (regels 1103–1188). | Twee opties (kies één): (a) verplaats `MinMidMaxToelichting` boven scenario-picker (regel ≤553); (b) zet Sectie 0 default `open`. (a) heeft de voorkeur. | S |
| **6** | KRITIEK | begrijp | 749, 754, 759, 764 | Sectie D-checks gebruiken Σ + variabelennamen ("Σ verdelingPerJaar"). | Volzinnen: "De som van alle inspanningen klopt met het scenario-totaal" / "Geen jaar overschrijdt het jaarbudget-plafond" / "Per inspanning klopt de jaarverdeling met het inspanning-totaal". | S |
| **7** | KRITIEK | begrijp | 669, 702, 787, 1045, 1520 | "Cap" 6× gebruikt zonder definitie. | Vervang door "jaarbudget-plafond" en voeg in header eenmalige uitleg toe. | S |
| **8** | HOOG | wiskunde | 760 | Sectie D check 3 gebruikt scenario-tolerantie (€7.450) i.p.v. cap-tolerantie. Een jaar van 257K bij cap 250K geeft ✓ terwijl §4.1 het rood toont. Tegenspraak binnen één pagina. | Strict `<= cap` of `cap × 1.001`, consistent met §4.1 (regel 1917). | XS |
| **9** | HOOG | wiskunde | 102–104 | CRM `eenmaligMid` = 565.000, maar (455+680)/2 = 567.500. | Eén-regel-fix: `eenmaligMid: 567_500`. Of bewuster afgeronde mid-keuze documenteren. | XS |
| **10** | HOOG | wiskunde | 213–273 vs 102–104 | CRM componenten Σ min/max (435K/695K) wijken af van DOSSIER-range (455K/680K), terwijl toelichting wél "€455K–€680K" zegt. | Component-bedragen aligneren OF DOSSIER-toelichting aanpassen naar 435–695K. | M |
| **11** | HOOG | begrijp | 1524 | "Benutting %" zonder context — een leek weet niet of 82% goed is. | Label naar "% van plafond benut" + sub-tekst "100% = jaarbudget vol; <100% = ruimte over". Visuele balk toevoegen. | S |
| **12** | HOOG | begrijp | 986–1004, 1016–1029, 1068–1088 | Drie `<pre>` monospace-blokken in Sectie 0 lezen als terminal-output, niet bestuurlijk. Σ en Δ niet uitgelegd. | Vervang door `<table>` met `text-right tabular-nums`. Vervang Σ→"Totaal", Δ→"Verschil". | M |
| **13** | MIDDEL | begrijp | 1037–1058 | Stap 4 "Aanpassingen" stapelt jargon (water-fill, dossier-mid, borgingstail). | Splits A+B (rekenkundig) van C (keuze). Geef per aanpassing een mini-voorbeeld met een concreet bedrag. | M |
| **14** | MIDDEL | wiskunde | 1586 + 1652 | `derivTol` 15% maar legenda zegt "scenario kan ±20% schuiven". Pure plus20/min20 geven false-negative "≈". | `derivTol = max(50_000, 0.22 × berekend)`. | XS |
| **15** | MIDDEL | begrijp | 79–84, 1957 | Curve-labels stapelen onbekende termen ("U-curve — piek in realisatie + acceptatie/uitrol (PRINCE2/BiSL)"). | Mini-sparkline (5 staafjes) per domein. PRINCE2/BiSL naar tooltip "methodische bron". | M |
| **16** | MIDDEL | wiskunde | 14–19 | `formatEurK(1.249)` → "€ 1K" (verlies 24,9%); `formatEurK(999.500)` → "€ 1000K". | Voor 1.000–9.999: één decimaal: `(n/1000).toFixed(1)+"K"` → "€ 1.2K". Voor 999.500–999.999: route naar M-formaat. | XS |
| **17** | MIDDEL | begrijp | 1735–1804 | Sectie B+ "bottom-up samenvatting" komt ná Sectie B (detail-tabel). | Wissel volgorde, óf hernoem naar "Recap". | S |
| **18** | LAAG | wiskunde | 488 | Leiderschap doorlopende begeleiding max: 3 × 2.750 = 8.250, maar code zegt "= € 8.000". | Corrigeer naar 8.250 of voeg "afgerond" toelichting toe. | XS |
| **19** | LAAG | wiskunde | 904 | Stap 3 theoretische curve mist drift-compensatie die in `rebalance-verdeling.ts` wel bestaat. ±€7 mogelijk. | Na de loop: drift = werkelijk − Σ cells; voeg drift toe aan grootste cel. | XS |
| **20** | LAAG | wiskunde | 902–915 | Stille fallback bij `aantalJaren ∉ {4,5,7,10}` — geen UI-warning. | Amber banner boven Sectie C: "⚠ Geen lifecycle-curve gedefinieerd voor X jaren — lineaire verdeling toegepast." | S |
| **21** | LAAG | wiskunde | 21–24 | `pct(NaN, 100)` → "NaN%" niet afgevangen. | `if (!isFinite(num) ⋯) return "—"`. | XS |
| **22** | LAAG | begrijp | 666 vs 785 | Snel-nav toont "1490K", banner toont "€ 1.49M" — twee notaties op één scherm. | Kies één. Voor stuurgroep is "€ 1,49 mln" leesbaarder. | XS |

**Effort-legenda:** XS=<15 min, S=15–60 min, M=1–3u.

---

## Drie tegenstrijdigheden binnen Stap 8 zelf

Naast de leek-leesbaarheid en de component-fouten valt op dat de pagina op drie plekken **zichzelf tegenspreekt**:

1. **Sectie D check 3 ✓ vs §4.1 ⚠ over cap.** Zie #8 hierboven.
2. **Sectie B match-kolom "≈" voor +20%-scenarios** terwijl de legenda zegt dat ±20% normaal is. Zie #14.
3. **Σ-balk Stap 1 toont mid buiten range** voor Leiderschap en Gespreksvaardigheid. Zie #1, #2.

Deze drie zijn de belangrijkste vertrouwens-issues: de pagina is bedoeld als audit-laag, en als de pagina tegenstrijdige verdicten geeft over dezelfde getallen, verliest hij zijn doel.

---

## Aanbevolen volgorde

**Fase A — Numerieke integriteit (must-fix, ~3 uur totaal):**
- #9 CRM mid-fix (XS)
- #1, #2 Leiderschap + Gespreksvaardigheid range alignment (S+M)
- #3 Risico-buffer herrekenen (M)
- #8 Cap-check tolerantie strict (XS)
- #10 CRM Σ vs DOSSIER alignment (M)

**Fase B — Doelgroep-leesbaarheid (must-fix, ~2 uur totaal):**
- #4 Code-lekkage verwijderen (S)
- #5 `MinMidMaxToelichting` boven scenario-picker (S)
- #6 Sectie D-check labels naar volzinnen (S)
- #7 "Cap" → "jaarbudget-plafond" (S)
- #11 Benutting met context (S)

**Fase C — Polishing (nice-to-have, ~3 uur totaal):**
- #12 `<pre>`-blokken naar tabellen (M)
- #13 Stap 4 mini-voorbeelden (M)
- #14, #16, #17, #22 (XS+S+S+XS)
- #15 Sparklines voor curves (M)

**Fase D — Edge cases (laag, ~30 min totaal):**
- #18, #19, #20, #21

**Totaal alle must-fix:** ~5 uur effort.
**Totaal compleet:** ~9 uur effort.

---

## Wat goed is en moet blijven

- **Macro-wiskunde is foutloos.** Lifecycle-curves sommeren naar 100, scenario-totaalsommen kloppen exact (Δ=€0 alle 4 scenarios), benuttingen zijn rekenkundig correct, alle 16 curves bit-identiek aan `rebalance-verdeling.ts`.
- **`MinMidMaxToelichting` is pedagogisch goed geschreven** (regels 1103–1188) — de zin "uur-tarieven liggen vast, aantal uren kan binnen aannemelijke range vallen" is precies wat een leek nodig heeft. Probleem is alleen de **plek** waar hij staat.
- **Per-component formule + tarief + aantal-onderbouwing** (regels 1402–1499) is een goede vertaalslag van "€55.000" naar "20 dagen × €800 + sectorvalidatie". Houd dit patroon.
- **Sectie D-tolerantie-logica** (regels 519–521) is intern consistent en correct — alleen de tekst van check 3 moet aangescherpt.
- **Tolerantie tegen rondings-drift** (geen blokker maar vermeldenswaardig): de tabellen tonen Δ=€0 voor alle 4 scenarios in de huidige sessie, dus voor productie werkt het systeem.

---

## Conclusie

Stap 8 is **technisch sterk in zijn kern** — de macro-getallen kloppen tot op de euro nauwkeurig. Maar de pagina **mist twee dingen om zijn doel te halen**:

1. **Wiskundige integriteit op component-niveau.** De DOSSIERS- en COMPONENT_BREAKDOWNS-tabellen zijn ooit los opgesteld en niet meer samen onderhouden. Op drie plekken toont de UI een "mid" die buiten de Σ-range valt. De risico-buffer is een schijn-berekening met onverklaarde basisbedragen.

2. **Bestuurlijke leesbaarheid.** Een stuurgroep-lid zonder voorkennis kan de pagina niet zelfstandig lezen — code-lekkage, Σ-symbolen, ongedefinieerde "cap"/"benutting", verstopte uitleg en verwijzingen naar TS-bronbestanden maken het een ingenieurs-document, niet een audit-pagina voor besluitvormers.

Beide issues zijn verhelpbaar met **~5 uur fix-werk voor de must-fix-laag** en de pagina wordt dan inderdaad het audit-instrument dat het beoogt te zijn. Daarna heeft de stuurgroep geen programmamanager meer nodig om de berekeningen te lezen, en zijn de UI-claims wiskundig consistent met de getoonde getallen.
