# AUDIT — BerekeningenStep (Stap 8) vs §4.1 Begroting

**Sessie:** `d8b97442-ce8f-4134-b2c7-67dc8e3a3f93`
**Datum:** 2026-05-01
**Scope:** Verifiëren dat `BerekeningenStep.tsx` exact dezelfde getallen toont als §4.1 begroting (StapOptimaliseren + ExportStep), op basis van actuele Supabase-data.

---

## 1. Data-bron vergelijking

| Component | Pad naar begrotingAdvies | Bron |
|---|---|---|
| `BerekeningenStep.tsx` (regel 64-65) | `session.crossAnalyseWizard.stepResults.stap4.begrotingAdvies` | `useSession()` → context (sync met Supabase) |
| `StapOptimaliseren.tsx` (regel 220, 267) | `stap4Result.begrotingAdvies` (geladen via `loadStap4Result`) → uiteindelijk dezelfde key | localStorage / Supabase |
| `ExportStep.tsx` (regel 2330) | `session.crossAnalyseWizard.stepResults.stap4.begrotingAdvies` | identiek aan BerekeningenStep |

**Conclusie:** Alle drie componenten lezen exact hetzelfde `begrotingAdvies`-object. **PASS.**

Velden die elk component leest:
- `startJaar`, `scenarios[k].jaarlijksBudgetEuro`, `aantalJaren`, `totaalGeraamdEuro`
- `inspanningen[i].inspanningTitel`, `domein`, `totaalEuro`, `verdelingPerJaar[j].euro`
- `totalenPerJaar[j].euro`

Geen mismatch in field-naming of indirection.

---

## 2. Numerieke verificatie per scenario (Supabase actual)

Tolerantie-norm BerekeningenStep: `max(€5.000, 0,5%·totaal)` (regel 52-54).

### OPTIMAAL — "Huidig budget" (7 jaar × €250.000 cap)

| Veld | Supabase | Berekend (Σ cells) | Status |
|---|---|---|---|
| Cap (`jaarlijksBudgetEuro`) | € 250.000 | — | PASS |
| Aantal jaren | 7 (2026–2032) | — | PASS |
| Theoretisch max | — | € 1.750.000 (cap × N) | PASS |
| `totaalGeraamdEuro` | € 1.490.000 | — | PASS |
| Σ inspanning-totalen | — | € 1.490.000 | Δ=€0 PASS |
| Σ verdelingPerJaar per inspanning | — | exact = `totaalEuro` voor alle 4 | Δ=€0 PASS |
| Σ from-inspanning per jaar vs `totalenPerJaar` | — | identiek voor alle 7 jaar | Δ=€0 PASS |
| Σ `totalenPerJaar` | — | € 1.490.000 | PASS |
| Cap-overschrijding? | — | nee (max benutting 100%) | PASS |

### PLUS20 — "+20% sneller" (5 jaar × €300.000 cap)

| Veld | Supabase | Σ cells | Status |
|---|---|---|---|
| Cap | € 300.000 | — | PASS |
| `totaalGeraamdEuro` | € 1.270.000 | € 1.270.000 (Σ insp) / € 1.270.000 (Σ jaar) | Δ=€0 PASS |
| Per-inspanning Σ verdeling = `totaalEuro` | 4/4 inspanningen | exact | PASS |
| Cap-overschrijding | — | nee (max 100%) | PASS |

### ADVIES — "Optimaal advies" (4 jaar × €341.000 cap)

| Veld | Supabase | Σ cells | Status |
|---|---|---|---|
| Cap | € 341.000 | — | PASS |
| `totaalGeraamdEuro` | € 1.159.000 | € 1.159.000 / € 1.159.000 | Δ=€0 PASS |
| Per-inspanning Σ verdeling = `totaalEuro` | 4/4 | exact | PASS |
| Cap-overschrijding | — | nee (max 100%) | PASS |

### MIN20 — "−20% langzamer" (10 jaar × €200.000 cap)

| Veld | Supabase | Σ cells | Status |
|---|---|---|---|
| Cap | € 200.000 | — | PASS |
| `totaalGeraamdEuro` | € 1.819.500 | € 1.819.500 / € 1.819.500 | Δ=€0 PASS |
| Per-inspanning Σ verdeling = `totaalEuro` | 4/4 | exact | PASS |
| Cap-overschrijding | — | nee (max 100%) | PASS |

**Alle 4 scenarios: zero discrepancy.** Elk getal dat BerekeningenStep zal tonen is bit-identiek aan wat in §4.1 staat.

---

## 3. Sectie-validatie BerekeningenStep

| Sectie | Wat het toont | Beoordeling |
|---|---|---|
| **A — Scenario-input** | Cap, jaren-range, theoretisch max (cap × N), benutting % | **PASS** — direct uit `scenario.jaarlijksBudgetEuro`, `aantalJaren`, `totaalGeraamdEuro`. Identieke labels en bron als §4.1. |
| **B — Per inspanning** | Inspanning-titel, domein, # cellen, Σ verdeling, `totaalEuro`, %-van-scenario, match-check | **PASS** — leest `scenario.inspanningen[i].totaalEuro` en `verdelingPerJaar[]`. Toont exact dezelfde nummers als de §4.1-tabelfooter (`insp.totaalEuro`). Tolerantie verzekert robuustheid bij future rounding. |
| **C — Matrix per jaar** | Inspanning × jaar grid met `cell.euro`, plus 3 footers: Σ-uit-inspanningen, officieel `totalenPerJaar`, cap-benutting % | **PASS** — exact dezelfde cellen als §4.1 (`insp.verdelingPerJaar.find(x=>x.jaar===jr)`), zelfde footer (`s.totalenPerJaar.find(...)`). Voor sessie d8b97442 zijn `Σ-uit-insp` en `officieel totalenPerJaar` per jaar identiek (Δ=€0 voor alle jaren in alle scenarios). |
| **D — Som-controle** | 4 checks met €5K / 0,5%-tolerantie (Σ inspanningen, Σ jaartotalen, cap-overschrijding, per-inspanning verdeling) | **PASS** — voor deze sessie geven alle 4 checks ✓ in alle 4 scenarios. Logica is correct. |

---

## 4. Format-vergelijking BerekeningenStep ↔ §4.1

| Aspect | BerekeningenStep | §4.1 (StapOptimaliseren / ExportStep) | Match? |
|---|---|---|---|
| Per-cel formattering | `€ ${Math.round(n).toLocaleString("nl-NL")}` (regel 9-12) | `€ ${cell.euro.toLocaleString("nl-NL")}` (StapOpt 1832; Export 2461) | PASS — bedragen zijn al integers in Supabase, `Math.round` is no-op |
| Inspanning-totaal | `formatEur(insp.totaalEuro)` | `€ ${insp.totaalEuro.toLocaleString("nl-NL")}` | PASS |
| Scenario-totaal | `formatEur(s.totaalGeraamdEuro)` | `€ ${s.totaalGeraamdEuro.toLocaleString("nl-NL")}` of `Intl.NumberFormat currency EUR` | PASS — exporteerschrift gebruikt currency-style maar resulteert in zelfde getallen |
| K-notatie (snel-nav) | `formatEurK` (≥1M → `M`, ≥1K → `K`) | n.v.t. (§4.1 toont volledige bedragen) | Verschil is opzettelijk: snel-nav-pictogrammen, niet de hoofdcijfers |

**Geen mismatch:** Het enige verschil is dat BerekeningenStep in de scenario-picker-cards `formatEurK` (€ 1.49M, € 1.27M, etc.) toont. De hoofd-banner én alle tabelcellen gebruiken `formatEur` met volledige bedragen — identiek aan §4.1.

---

## 5. Edge-case-handling

| Edge case | Code-gedrag | Status |
|---|---|---|
| `verdelingPerJaar` cellen ontbreken voor sommige jaren | Sectie C: `cells[j] ?? 0` → "—" rendered (regel 553-554). Som over jaren defaultet naar 0 voor missing. | PASS — niet stilletjes verkeerd |
| `totalenPerJaar` ontbreekt | `officieelPerJaar[j] ?? 0` (regel 587) → toont "€ 0". Δ-check zal dan FAIL = expliciet zichtbaar. | PASS |
| `scenario.totaalGeraamdEuro` stale | Sectie D check 1 zou FAIL'en als Σ insp-totalen ≠ scenario-totaal | PASS — wordt gedetecteerd |
| Geen begrotingsadvies | `GeenBegrotingPlaceholder` met CTA naar Cross-analyse Stap 6 (regel 132-145) | PASS |
| Wel record, geen scenarios | Amber waarschuwingsbox (regel 78-82) | PASS |
| `inspanningen` array leeg | Sectie B-tabel rendert footer met `Σ=€0`, scenario-Δ wordt zichtbaar in Sectie D | PASS |
| Cap = 0 (theoretisch) | `pct(num, 0)` → "—" (regel 22-24); `cap > 0 ? ... : 0` (regel 601) — geen NaN | PASS |
| Cap-overschrijding | `overcap = p > 1.001` rood gemarkeerd in C, en check 3 in D | PASS |

Geen ontdekte hiaten in null-safety.

---

## 6. Live verificatie d8b97442 — eindgetallen die de gebruiker zal zien

Snel-nav-cards (formatEurK):
- Huidig budget: **€ 1490K · 7 jr · cap € 250K/jr**
- +20%: **€ 1270K · 5 jr · cap € 300K/jr**
- Optimaal advies: **€ 1159K · 4 jr · cap € 341K/jr**
- −20%: **€ 1820K · 10 jr · cap € 200K/jr** *(Math.round van 1.819.500 → 1820)*

Banners (formatEurK):
- Optimaal: € 1.49M
- Plus20: € 1.27M
- Advies: € 1.16M
- Min20: € 1.82M

Sectie A volledige bedragen:
- optimaal: max € 1.750.000, benutting 85%
- plus20: max € 1.500.000, benutting 85%
- advies: max € 1.364.000, benutting 85%
- min20: max € 2.000.000, benutting 91%

Sectie B inspanning-totalen — exact gelijk aan §4.1 rechterkolom "Totaal":
- optimaal: CRM € 1.095.000, Mens € 143.000, Processen € 137.000, Cultuur € 115.000
- plus20: CRM € 910.000, Processen € 112.500, Mens € 142.500, Cultuur € 105.000
- advies: CRM € 817.000, Mens € 142.000, Processen € 100.000, Cultuur € 100.000
- min20: CRM € 1.372.000, Processen € 175.000, Mens € 142.500, Cultuur € 130.000

Sectie C jaartotalen — exact gelijk aan §4.1 footer "Totaal per jaar". Alle Δ = €0 (zie tabel hierboven).

Sectie D — alle 4 checks ✓ in alle scenarios.

---

## 7. Eindoordeel

**PASS — geen fixes nodig.**

- Data-bron is identiek voor BerekeningenStep, StapOptimaliseren, ExportStep.
- Numeriek: alle scenario-totalen, inspanning-totalen, jaartotalen en cellen matchen exact (Δ = €0 in alle scenarios voor sessie d8b97442).
- Format is consistent (`toLocaleString("nl-NL")` met integer-bedragen).
- Edge cases zijn correct afgehandeld (null-safety, zero-cap, missing cells).
- Sectie D som-controle bevestigt het bovenstaande live op het scherm.

Geen aanbevelingen voor wijzigingen aan `BerekeningenStep.tsx`. De pagina is een betrouwbare audit-laag boven §4.1.
