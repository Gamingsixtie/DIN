---
phase: 17-cross-analyse-organigram-helderheid-domein-bewuste-consolidatie
plan: 01
subsystem: cross-analyse
tags:
  - schema
  - zod
  - consolidation
  - foundation
  - tdd
requirements:
  - R-CROSS-01
  - R-CROSS-02
requirements_addressed:
  - R-CROSS-01
  - R-CROSS-02
dependency_graph:
  requires: []
  provides:
    - "VermogenGelijkenisGroepSchema + VermogenGelijkenisGroep type"
    - "SubEffortAdviesSchema + SubEffortAdvies type"
    - "Stap2ResultSchema.vermogenGelijkenisGroepen veld"
    - "Stap4ResultSchema.subEffortAnalysis + .consolidatieAdvies[].context velden"
    - "VermogenClusterItemSchema.aanbeveling 'markeer_gelijkenis' enum-waarde"
    - "src/lib/consolidation-guards.ts module met guard-stubs + werkende computeAutoApplyResult"
    - "SECTOR_NAME_REGEX + MIN_TITLE_LENGTH constanten (D-01 locked)"
    - "DrieluikContext interface (D-27)"
  affects:
    - "Wave 1 (Plan 17-02): guards krijgen implementaties; mergeEfforts verankert hen"
    - "Wave 2 (Plan 17-03): StapConsolidatie useEffect refactort naar computeAutoApplyResult"
    - "Wave 3 (Plan 17-04): UI rendert vermogenGelijkenisGroepen + subEffortAnalysis"
tech_stack:
  added:
    - "zod@4.3.6 (directe dependency, voorheen transitief via @anthropic-ai/sdk)"
  patterns:
    - "TDD RED → GREEN voor schema + pure helper"
    - "Optional().default([]) voor backward-compat schema-extensies"
    - "Pure helper met injected mergeFn voor testbaarheid (geen React/session mock)"
    - "Guard stubs als Wave 1 anchor-points (locked signatures, geen behavior)"
key_files:
  created:
    - "src/lib/consolidation-guards.ts (104 regels, 9 exports)"
    - "src/lib/__tests__/consolidation-guards.test.ts (83 regels, 7 tests)"
  modified:
    - "package.json (zod@^4.3.6 toegevoegd)"
    - "package-lock.json (zod 4.3.6 hoisted)"
    - "src/lib/schemas.ts (+58 regels: 2 schemas + enum + 2 veld-uitbreidingen + 2 types)"
    - "src/lib/__tests__/cross-analyse-schema.test.ts (+154 regels, 11 nieuwe tests)"
decisions:
  - "VermogenGelijkenisGroep geïmporteerd uit ./schemas (niet uit ./types) omdat types.ts re-export nog niet bestaat; Wave 1 kan kiezen om in types.ts te hoisten"
  - "zod 4.3.6 geïnstalleerd (bestaande transitieve versie) — geen version-bump risico"
  - "Guard stubs geven return; (geen throw) in Wave 0; Wave 1 implementeert throws — signatures zijn locked via tests"
  - "computeAutoApplyResult gebruikt geïnjecteerde mergeFn i.p.v. session-object voor pure testbaarheid"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-17"
  test_count_added: 18
  test_count_total_in_plan_files: 29
---

# Phase 17 Plan 01: Wave 0 — Schema extensies, zod hardening, consolidation-guards scaffold Summary

Wave 0 fundament voor Phase 17 gerealiseerd: zod is nu expliciete dependency, Zod-schemas bevatten `VermogenGelijkenisGroep` + `SubEffortAdvies` + `markeer_gelijkenis` enum + `vermogenGelijkenisGroepen` + `subEffortAnalysis` + `context` veld met backward-compat defaults, en de nieuwe module `src/lib/consolidation-guards.ts` levert Wave 1-ready guard-stubs (locked signatures) plus de werkende pure helper `computeAutoApplyResult` — 29 plan-tests groen (22 schema + 7 guard), build groen, geen React-afhankelijkheid in guards.

## What Was Built

### Zod als directe dependency (package.json)

Voorheen kwam `zod` uitsluitend transitief binnen via `@anthropic-ai/sdk`. Dit maakte builds fragiel (transitive resolutie kon breken bij SDK-major-bumps). `npm install zod@^4.3.6` voegde `"zod": "^4.3.6"` toe aan `dependencies`. `npm ls zod` toont nu `din@0.1.0 … └── zod@4.3.6` als directe dep. Geïnstalleerde versie: **zod 4.3.6** (matcht bestaande deduped transitive).

### Schema-uitbreidingen (src/lib/schemas.ts)

| Regel | Symbol | Wijziging |
|-------|--------|-----------|
| 314 | `VermogenClusterItemSchema.aanbeveling` | Enum uitgebreid met `"markeer_gelijkenis"` (D-30) |
| 320–325 | `VermogenGelijkenisGroepSchema` | **NIEUW** (D-26): `id`, `vermogenIds.min(1)`, `gezamenlijkeOmschrijving`, `reden` |
| 330–337 | `SubEffortAdviesSchema` | **NIEUW** (D-30): `groepId`, `domein` enum, `actie` enum `combineren\|apart_houden`, `items`, `reden`, `voorgesteldeNaam.nullable()` |
| 461 | `Stap2ResultSchema.vermogenGelijkenisGroepen` | **NIEUW** veld, optional default `[]` (backward compat) |
| 480 | `Stap4ResultSchema.consolidatieAdvies[].context` | **NIEUW** veld (D-19): user-context voor herzie-advies, optional string |
| 490 | `Stap4ResultSchema.subEffortAnalysis` | **NIEUW** veld (D-30), optional default `[]` |
| 930 | `export type VermogenGelijkenisGroep` | `z.infer<typeof VermogenGelijkenisGroepSchema>` |
| 931 | `export type SubEffortAdvies` | `z.infer<typeof SubEffortAdviesSchema>` |

### Nieuwe module: src/lib/consolidation-guards.ts

- `SECTOR_NAME_REGEX = /\b(PO|VO|Zakelijk|primair onderwijs|voortgezet onderwijs)\b/i` — D-01 locked
- `MIN_TITLE_LENGTH = 10` — D-01 locked
- `DrieluikContext` interface — D-27 shape: `{ gelijkenisGroepen, capEffortMaps }`
- `validateNeutralTitle(title)` — Wave 0 stub, Wave 1 throw
- `validateSameDomain(items)` — Wave 0 stub, Wave 1 throw
- `validateDrieluikThreshold(effortIds, ctx)` — Wave 0 stub, Wave 1 throw
- `computeAutoApplyResult(clusters, alreadyMergedKeys, mergeFn)` — **WERKEND**, pure, unit-testbaar:
  - `<2 items`: skip silently
  - key in `alreadyMergedKeys`: skip
  - `mergeFn` throw → push naar `failedKeys`, reden in `reasons`
  - `mergeFn` success → push naar `mergedKeys`

Geen React-imports. `VermogenGelijkenisGroep` geïmporteerd uit `./schemas` direct (types.ts re-exporteert nog niet — bewust; Wave 1 kan hoisten).

### Test suites

| File | Tests added | Total in file |
|------|-------------|---------------|
| `src/lib/__tests__/cross-analyse-schema.test.ts` | 11 | 22 (11 origineel + 11 nieuw) |
| `src/lib/__tests__/consolidation-guards.test.ts` | 7 | 7 (nieuw bestand) |

**Nieuwe test-groepen:**
- `VermogenGelijkenisGroepSchema (D-26)` — 2 tests (valid input, min-1 faalt)
- `Stap2ResultSchema backward compat (D-30)` — 2 tests (default, aanwezig)
- `VermogenClusterItemSchema markeer_gelijkenis enum (D-30)` — 2 tests (nieuw + bestaand)
- `SubEffortAdviesSchema (D-30)` — 3 tests (string/null voorgesteldeNaam, ongeldig domein faalt)
- `Stap4ResultSchema backward compat (D-19, D-30)` — 3 tests (default, context, subEffortAnalysis)
- `consolidation-guards module exports` — 3 tests (module, regex, MIN_TITLE_LENGTH)
- `computeAutoApplyResult (D-05) — auto apply skip failure` — 4 tests (happy, throw-capture, <2 items, already-merged)

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Zod 4.3.6 (match bestaande) i.p.v. version-bump | Geen risico op breaking changes tijdens Wave 0 foundation; bump kan later zelfstandig plan |
| `VermogenGelijkenisGroep` import uit `./schemas` niet `./types` | types.ts re-export nog niet bestaat; Wave 1 kan hoisten zonder 17-01 te touch — cleaner scope |
| Guard-stubs met `return;` i.p.v. `throw new Error('NOT_IMPLEMENTED')` | Wave 0 moet build + bestaande call-sites groen houden; Wave 1 voegt throws toe met tests die falen bij misgebruik |
| `computeAutoApplyResult` gebruikt injected `mergeFn` | Pure testbaarheid zonder session-mock; Wave 2 refactort StapConsolidatie useEffect om deze helper aan te roepen met `mergeEfforts` closure |
| TDD voor beide tasks (RED → GREEN) | Plan task metadata `tdd="true"` — volgt phase 17 tdd-first aanpak |

## Deviations from Plan

### Auto-fixed Issues

**None** — plan executed exactly as written. Alle acceptance criteria gehaald zonder bug-fixes of missing-functionality aanpassingen.

### Out-of-scope findings (deferred)

Zie `.planning/phases/17-…/deferred-items.md`. 8 pre-existing test failures in persistence/schemas/stap5-focus-filter zijn niet door 17-01 geïntroduceerd (bestonden voor plan-start in uncommitted working tree) en vallen buiten Wave 0 scope.

### Tooling

`npm run lint` script gebroken op Windows (space-in-path interpreteerde als directory). Pre-existing; niet door 17-01 veroorzaakt. Gedocumenteerd in deferred-items.md. Tests en build werken normaal via vitest en next.

## Test Results

```
npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts src/lib/__tests__/consolidation-guards.test.ts
→ Test Files  2 passed (2)
→ Tests  29 passed (29)
→ Duration  206ms
```

Schema-tests: 22 (11 origineel + 11 nieuw) groen. Consolidation-guards tests: 7 groen. Build: `npm run build` exit 0. Full-suite: 282/290 groen (8 pre-existing failures, zie deferred-items).

## Wave 1 Handoff

Wave 1 (Plan 17-02) kan direct starten met:
1. Implementeer `validateNeutralTitle` throw conform D-01 (regex + length check)
2. Implementeer `validateSameDomain` throw conform D-02 (set-size check)
3. Implementeer `validateDrieluikThreshold` throw conform D-27 (per-cap groep-lookup)
4. Haak guards in `mergeEfforts` (CrossAnalyseStep.tsx) — signatures zijn locked
5. Voeg DrieluikContext-arg toe aan `mergeEfforts` voor D-27 threshold

Schema-velden zijn klaar: `VermogenGelijkenisGroep` bestaat in schemas, `Stap2Result.vermogenGelijkenisGroepen` kan gezet worden door AI en gelezen door consumers.

## Self-Check: PASSED

**Files verified:**
- FOUND: `src/lib/consolidation-guards.ts`
- FOUND: `src/lib/__tests__/consolidation-guards.test.ts`
- FOUND: `src/lib/schemas.ts` (modified, bevat 7/7 required symbols)
- FOUND: `src/lib/__tests__/cross-analyse-schema.test.ts` (modified)
- FOUND: `package.json` (zod als dep)

**Commits verified:**
- FOUND: `bd5b385` — feat(17-01): expliciete zod dep + Phase 17 schema extensies
- FOUND: `e5e22aa` — test(17-01): failing tests for consolidation-guards (TDD RED)
- FOUND: `30b4b0f` — feat(17-01): consolidation-guards module (TDD GREEN)

**Acceptance criteria verified:**
- [x] `npm ls zod` toont `din@0.1.0 … └── zod@4.3.6` direct
- [x] `package.json` bevat `"zod": "^4.3.6"` in dependencies
- [x] Schemas bevatten alle 7 required symbols (9 matches op grep)
- [x] Type-exports aanwezig voor `VermogenGelijkenisGroep` + `SubEffortAdvies`
- [x] `consolidation-guards.ts` bevat alle 9 exports (regex, constant, 3 guards, helper, 3 interfaces)
- [x] `npx vitest run` op plan-bestanden: 29/29 groen
- [x] `npm run build`: exit 0
- [x] Geen React-imports in `consolidation-guards.ts`
- [x] Geen `validateNeutralTitle` usage in `CrossAnalyseStep.tsx` (Wave 1 werk)
