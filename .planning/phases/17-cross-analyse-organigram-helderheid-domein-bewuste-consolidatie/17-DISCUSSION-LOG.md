---
phase: 17
phase_name: cross-analyse-organigram-helderheid-domein-bewuste-consolidatie
type: discussion-log
purpose: Audit trail of gray-area Q&A during /gsd:discuss-phase. Not consumed by downstream agents.
created: 2026-04-10
---

# Phase 17 — Discussion Log

> Volledige audit trail van de discuss-phase sessie. Alleen voor menselijke referentie / compliance.
> Beslissingen zelf staan in `17-CONTEXT.md` (D-01..D-24).

## Gray areas gepresenteerd

De volgende gray areas werden geïdentificeerd na codebase-scan en prior-context load:

1. **Guard failure UX** — hoe falen title/domain guards graceful in bestaande auto-apply flow?
2. **Herzie advies contract** — API-vorm, state, UX-patroon voor regeneratie
3. **Sub-effort trigger & caching** — wanneer draait de tweede-niveau analyse, hoe vaak, waar opgeslagen?
4. **Organigram A/B logica** — hoe kiest de UI tussen Variant A en Variant B per groep?

Deferred (niet besproken, voldoende gelocked door ROADMAP):
- Guard-regels zelf (staan in scope)
- Beslismodel bestaan (staat in scope)
- Rationale "waarom gedeeld" bestaan (staat in scope)

**Gekozen voor discussie:** alle 4.

---

## Area 1 — Guard failure UX

### Q1.1 — Hoe detecteert de title-guard een sector-naam in `suggestedTitle`?

| Optie | Beschrijving | Selected |
|---|---|---|
| Substring match | `.includes("PO")` etc. — snel maar matched ook "Competitie" | |
| Word-boundary regex | `/\b(PO\|VO\|Zakelijk\|primair onderwijs\|voortgezet onderwijs)\b/i` — Aanbevolen | ✓ |
| AI-check | Extra API call om te valideren — te duur | |

**Notitie:** Word-boundary regex voorkomt false positives op "Computerondersteund" (bevat "PO") terwijl "Professionalisering PO" wel wordt gevangen.

### Q1.2 — Waar toont de UI een guard-fout?

| Optie | Beschrijving | Selected |
|---|---|---|
| Toast | Tijdelijk, verdwijnt — user kan het missen | |
| Inline error boven actieknoppen | In `ConsolidationActionBar` boven Merge-knoppen — Aanbevolen | ✓ |
| Modal | Te obtrusive voor een titel-probleem | |

**Notitie:** Inline past bij het bestaande state-machine-patroon (`showConfirm`, `showAfstemmingsAdvies`) — nieuwe sub-state `showGuardError` voegt naadloos toe.

### Q1.3 — Wat doet auto-apply als de guard faalt?

| Optie | Beschrijving | Selected |
|---|---|---|
| Halt + user-ingreep | Blokkeert hele auto-apply flow | |
| Skip silently, flag review | Sla individuele cluster over, badge "Vereist review" — Aanbevolen | ✓ |
| Altijd handmatig | Schakelt auto-apply volledig uit | |

**Notitie:** Badge "Vereist review" is zichtbaar in ClusterCard header en blijft staan tot user via ConsolidationActionBar de merge opnieuw probeert met aangepaste titel.

### Q1.4 — Waar landt de effort domain-guard?

| Optie | Beschrijving | Selected |
|---|---|---|
| Throw in `mergeEfforts` + catch in UI | Pure functie blijft bron van waarheid — Aanbevolen | ✓ |
| Alleen UI-check | Pure functie kan misbruikt worden door tests/callers | |
| Dubbel (UI + pure) | Code duplicatie | |

**Notitie:** `mergeEfforts` gooit `Error('Domein-conflict: efforts behoren tot verschillende domeinen')`. UI catcht en toont via ConsolidationActionBar.

---

## Area 2 — Herzie advies contract

### Q2.1 — Hoe triggert "Herzie advies" regeneratie?

| Optie | Beschrijving | Selected |
|---|---|---|
| Per-cluster regen | Knop op elke cluster-kaart, alleen die cluster wordt ververst — Aanbevolen | ✓ |
| Alles-opnieuw | Één knop die hele stap 4 opnieuw draait | |
| Batch-select | Checkbox per cluster + bulk-regen | |

**Notitie (user-toevoeging):** "optie 1 met extra toevoeging dat gebruiker extra context kan geven"
→ Het bestaande `userContext`-textarea-patroon uit ConsolidationActionBar blijft intact en wordt doorgegeven aan de regen-call. User kan voor de regen extra context intypen (bijv. "focus op data-domein").

### Q2.2 — Welke API-vorm voor de regen-call?

| Optie | Beschrijving | Selected |
|---|---|---|
| Nieuwe tak in `/api/din-suggest` | Clone `type: "consolidatie-advies"` → `type: "consolidatie-herzien"` — Aanbevolen | ✓ |
| Nieuwe endpoint `/api/consolidatie-herzien` | Extra bestand voor één call | |
| Parameter op stap-4-endpoint | Mengt batch en single-cluster | |

**Notitie:** Nieuwe tak hergebruikt auth, validation, error handling. Minimale diff.

### Q2.3 — Hoe schrijft regen de nieuwe advies weg?

| Optie | Beschrijving | Selected |
|---|---|---|
| Overschrijven | `consolidatieAdvies[i] = newAdvies` — Aanbevolen | ✓ |
| History-stack | Undo/redo van advies-versies — overkill | |
| Apart veld `herzienAdvies` | Versnippert state | |

**Notitie:** Geen history nodig — methodisch is alleen de laatste advies relevant. Undo van de uiteindelijke merge blijft bestaan via Phase 8 undo-pattern.

### Q2.4 — UX van de regen-knop terwijl de call loopt?

| Optie | Beschrijving | Selected |
|---|---|---|
| Knop inline spinner + disabled | Lokaal op de cluster — Aanbevolen | ✓ |
| Page-level overlay | Blokkeert hele stap 4 | |
| Optimistic update | User ziet niet dat er iets laadt | |

**Notitie:** Past bij bestaande `isGenerating` state in ConsolidationActionBar.

---

## Area 3 — Sub-effort trigger & caching

### Q3.1 — Wanneer draait de sub-effort analyse?

| Optie | Beschrijving | Selected |
|---|---|---|
| Tijdens stap 4 "Analyseer" | Samen met consolidatieAdvies + citobreedInzicht — Aanbevolen | ✓ |
| Aparte knop in organigram | Extra user-actie vereist | |
| Automatisch bij elke cap-wijziging | Te veel AI-calls | |

**Notitie:** User klikt één keer "Analyseer" en krijgt alle stap-4 resultaten terug, inclusief sub-effort uitsplitsing per shared cap.

### Q3.2 — Hoe wordt de AI-call gebatcht?

User stelde verhelderingsvraag: *"welke is beste voor kwaliteit en betrowubaarheid?"*

| Optie | Beschrijving | Selected |
|---|---|---|
| 1 call per shared cap, alle 4 domeinen in payload | Cross-domein context in één prompt, lage token-druk — Aanbevolen | ✓ |
| 4 calls per shared cap (1 per domein) | Meer calls, hogere kosten, geen cross-domein zicht | |
| 1 mega-call voor alle shared caps | Te groot, attention-drift, lange timeout | |

**Rationale die ik gaf:**
- **Kwaliteit:** Optie 1 geeft AI cross-domein zicht ("als je in Mens een training doet, stem af met Proces-stap"). Optie 2 verliest die synergie. Optie 3 lijdt aan attention-drift bij N×4 domeinen.
- **Betrouwbaarheid:** Optie 1 heeft beperkte payload (1 cap × 4 domeinen × ~10 efforts ≈ rustige prompt). Optie 3 heeft onvoorspelbare response-grootte.

User antwoord: **"Ja, 1 call per shared cap"** → bevestigd.

### Q3.3 — Waar wordt het resultaat opgeslagen?

| Optie | Beschrijving | Selected |
|---|---|---|
| Sticky tot user opnieuw analyseert | Op `crossAnalyseSteps.stap4.subEffortAnalysis` — Aanbevolen | ✓ |
| Recompute on every render | Duur, losse AI-calls per organigram-open | |
| Cache in sessionStorage | Versnippert state, inconsistent met rest session | |

**Notitie:** Past bij bestaande per-step schema pattern (Phase 11). Regen via stap-4 Analyseer-knop overschrijft.

### Q3.4 — Wat bij shared caps zonder efforts?

| Optie | Beschrijving | Selected |
|---|---|---|
| Skip sub-analyse + toon empty-state | "Nog geen efforts in deze cap" — Aanbevolen | ✓ |
| Forceer placeholder | Rommelige AI-output | |
| Verberg hele cap uit organigram | Informatie-verlies | |

**Notitie:** Empty-state tekst in organigram, geen AI-call besteed aan lege payload.

---

## Area 4 — Organigram A/B logica

### Q4.1 — Wat is de "groep" waar het beslismodel op draait?

| Optie | Beschrijving | Selected |
|---|---|---|
| Per betrokken sector-combinatie | bijv. PO+VO als één groep, PO+Zakelijk als andere — Aanbevolen | ✓ |
| Per individuele sector | Drie vaste groepen | |
| Per shared cap apart | Elke cap zijn eigen beslissing | |

**Notitie:** Sector-combinatie past bij DIN-methodiek — "welke sectoren delen iets" is de kernvraag.

### Q4.2 — Variant A (shared cap met lokale efforts) vs Variant B (shared effort met sector-specifieke caps) — wie wint?

| Optie | Beschrijving | Selected |
|---|---|---|
| Variant A wint altijd | Shared cap is sterkere signaal van samenwerking — Aanbevolen | ✓ |
| Variant B wint bij ≥2 gedeelde efforts | Kwantitatief criterium | |
| Allebei tonen | Huidige gedrag, oorzaak van onduidelijkheid | |

**Notitie:** ROADMAP eist mutual exclusivity. Shared cap is methodisch sterker — delen van een vermogen betekent dezelfde capaciteit opbouwen.

### Q4.3 — Waar toon je de domein-balans?

| Optie | Beschrijving | Selected |
|---|---|---|
| Per shared cap, lokale efforts | Badge boven elke cap in organigram — Aanbevolen | ✓ |
| Global balance over alle caps | Verliest per-cap detail | |
| Tab met alleen balans | Extra navigatie | |

**Notitie:** Per-cap badge maakt direct zichtbaar of een cap mono-domein of multi-domein is.

### Q4.4 — Hoe render je de domein-buckets onder een cap?

| Optie | Beschrijving | Selected |
|---|---|---|
| Domein-sectie per cap met color-coded bucket | Gebruik `DOMAIN_COLORS` uit StapSectorVertaling — Aanbevolen | ✓ |
| Platte lijst met kleine badges | Verliest visuele domein-groepering | |
| Tabel | Te dens voor organigram | |

**Notitie:** Mens=blauw, Processen=groen, Data & Systemen=paars, Cultuur=amber — bestaande convention hergebruiken.

---

## Ready confirmation

User bevestigde: **"Schrijf CONTEXT.md"**

Alle 4 gray areas doorgelopen, 16 Q's beantwoord, 24 decisions (D-01..D-24) vastgelegd in `17-CONTEXT.md` (inclusief schema/prompt extensies, legacy handling en test coverage die uit de discussies afgeleid werden).
