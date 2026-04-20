---
phase: 18-rijke-cross-sectorale-domein-uitwerking-in-sub-effort-analys
plan: 02
completed: 2026-04-20
---

# Plan 18-02 — Summary

## Schema-uitbreidingen in `src/lib/schemas.ts`
- `SubEffortVermogenImpactSchema` toegevoegd vóór `SubEffortAdviesSchema` (regel ~327-333).
- `SubEffortDossierSchema` toegevoegd vóór `SubEffortAdviesSchema` (regel ~337-345).
- `SubEffortAdviesSchema` uitgebreid met 5 nieuwe optionele velden (`titel`, `beschrijving`, `beargumentatie`, `vermogenImpact[]`, `dossier{}`) op regel ~351-367.
- Type-exports `SubEffortVermogenImpact` en `SubEffortDossier` toegevoegd direct onder bestaande `SubEffortAdvies`.

## Decision R3 bevestigd
Inline `z.object({ ...: z.string().optional().default("") })` patroon gekozen — consistent met `AIEffortSchema` en `AIPromotedEffortSchema`. Geen `InspanningsDossierSchema.partial()`.

## Test resultaat
```
Test Files  1 failed (1)
     Tests  1 failed | 29 passed (30)
```
- ✅ Alle 5 rijke-velden tests Phase 18: GREEN
- ✅ Stap4 rijke-entry parse test: GREEN
- ✅ Alle 24 Phase 17 tests: GREEN
- ⏳ 1 test RED (demo-data parse) — wacht op Plan 05

## Commit
`970e7f7`
