---
phase: 18-rijke-cross-sectorale-domein-uitwerking-in-sub-effort-analys
plan: 01
completed: 2026-04-20
---

# Plan 18-01 — Summary

## Wat is toegevoegd
- 2 nieuwe `describe`-blokken in `src/lib/__tests__/cross-analyse-schema.test.ts`:
  - `SubEffortAdviesSchema Phase 18 rijke uitwerking (R-CROSS-03)` — 5 tests
  - `Stap4ResultSchema Phase 18 integratie (R-CROSS-03)` — 2 tests
- **Totaal: 7 nieuwe tests**

## RED state (verwacht)
Van 30 tests nu 6 RED na toevoeging:

RED (faalt tot Plan 02 + Plan 05):
- `accepteert volledig rijke input met titel, beschrijving, beargumentatie, vermogenImpact en dossier`
- `dossier leeg object parseert met default lege strings per veld`
- `vermogenImpact lege array parseert succesvol`
- `vermogenImpact faalt bij ongeldige sectorId`
- `Stap4Result met rijke subEffortAnalysis entry parseert succesvol`
- `demo-data stap4Result.subEffortAnalysis parseert onder Stap4ResultSchema`

GREEN (al):
- `backward compat — Phase 17 shape zonder rijke velden parseert succesvol`

## Phase 17 regressions
Geen — alle 24 bestaande tests blijven groen.

## Verification
```
Test Files  1 failed (1)
     Tests  6 failed | 24 passed (30)
```

## Commit
`959c590`
