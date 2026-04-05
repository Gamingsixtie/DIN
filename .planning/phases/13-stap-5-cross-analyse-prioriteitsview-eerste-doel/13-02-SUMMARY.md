---
phase: 13-stap-5-cross-analyse-prioriteitsview-eerste-doel
plan: 02
subsystem: cross-analyse
tags: [schemas, prompts, pure-module, tdd, wave-1]
dependency_graph:
  requires: [13-01]
  provides: [Stap5ResultSchema-new, CROSS_ANALYSE_STAP5_PROMPT-new, stap5-focus-helpers]
  affects: [stap5-route, StapSectorVertaling, CrossAnalyseWizard]
tech_stack:
  added: []
  patterns: [pure-function-module, zod-discriminated-enum, safeParse-migration-guard]
key_files:
  created:
    - src/lib/stap5-focus.ts
  modified:
    - src/lib/schemas.ts
    - src/lib/prompts.ts
decisions:
  - Pure functions (getFocusGoal, computeFocusView, restoreStap5Result) are single source of truth for client+server filter semantics
  - restoreStap5Result uses Zod safeParse with console.warn on legacy shape rejection per D-10
  - types.ts left unchanged; z.infer<typeof Stap5ResultSchema> automatically propagates new shape
metrics:
  duration: ~10min
  completed: "2026-04-05"
  tasks: 2
  files: 3
requirements: [R-CROSS-01, R-CROSS-02]
---

# Phase 13 Plan 02: Stap 5 Wave 1 Foundation Summary

**One-liner:** Vervangt Stap5ResultSchema (focusDoelId + vermogenReview + inspanningReview + batenDekking + samenvatting), herschrijft CROSS_ANALYSE_STAP5_PROMPT rond hefboomwerking/breedte/baten-dekking, en introduceert `src/lib/stap5-focus.ts` als pure-function single source of truth voor focus-filter semantiek.

## What Was Built

### 1. `src/lib/schemas.ts` — Stap5ResultSchema vervangen

Lines 430-451 (oude lines 430-444 uitgebreid naar 22 lines in nieuwe shape). De oude `sectorVertalingen[]` + `totaalSamenvatting` shape is volledig verwijderd. Nieuwe velden:

- `focusDoelId: string`
- `focusDoelNaam: string`
- `vermogenReview[]` met `{ vermogenId, hefboomAnalyse, suggestieAanscherping? }` (default `[]`)
- `inspanningReview[]` met `{ inspanningId, breedteOordeel: "dekt_volledig" | "moet_verbreed" | "mist_aspect", toelichting, suggestieVerbreding? }` (default `[]`)
- `batenDekking[]` met `{ baatId, sector, wordtGeraakt, redenering, risico? }` (default `[]`)
- `samenvatting: string`

`CrossAnalyseWizardStateSchema` (lines 453-463) ongewijzigd — `stap5: Stap5ResultSchema.optional()` werkt transparant met nieuwe shape.

### 2. `src/lib/prompts.ts` — CROSS_ANALYSE_STAP5_PROMPT herschreven

Lines 253-315 (was 253-284, uitgebreid tot ~62 lines). Instrueert Claude op 4 beoordelingspunten:
1. **Hefboomwerking per vermogen** (welke baten, waarom consolidatie hefboom geeft)
2. **Breedte van inspanningen** (met expliciete Nederlandse enum: dekt_volledig / moet_verbreed / mist_aspect)
3. **Baten-dekking** (kritisch — stakeholder-mandaat met wordtGeraakt + risico)
4. **Samenvatting** (3-5 zinnen)

Referentie naar "Werken aan Programma's, Hfst 8 — Hefboomwerking". JSON-schema-contract expliciet in prompt om hallucinatie te voorkomen (Pitfall 6).

### 3. `src/lib/stap5-focus.ts` — NIEUW, 115 lines

Pure-function module met drie exports + één interface:

- `getFocusGoal<T extends { rank?: number }>(goals: T[]): T | undefined` — D-01 locked expression `[...goals].sort((a,b) => (a.rank ?? 999) - (b.rank ?? 999))[0]`; lege array → undefined; muteert input niet.
- `FocusView` interface: `{ focusGoal, focusBenefits, focusCaps, focusEfforts, outOfScopeCaps, outOfScopeEfforts }`
- `computeFocusView(session): FocusView | null` — 8-step filter: focusdoel → baten (via goalBenefitMaps) → active caps (`!consolidated`) → shared caps (`relatedSectors.length > 1`) → focus caps via benefitCapabilityMaps → active efforts → shared efforts (`responsibleSector.includes(",")`) → focus efforts via capabilityEffortMaps. `outOfScopeCaps`/`outOfScopeEfforts` = active items niet in focus.
- `restoreStap5Result(raw): Stap5Result | undefined` — D-10 migratie: `null`/`undefined` passes through; else `Stap5ResultSchema.safeParse` → op failure `console.warn` + undefined.

## Tasks Executed

| # | Task | Status | Commit | Files |
|---|------|--------|--------|-------|
| 1 | Stap5ResultSchema replace + CROSS_ANALYSE_STAP5_PROMPT rewrite | DONE | `3882793` | `src/lib/schemas.ts`, `src/lib/prompts.ts` |
| 2 | Create `src/lib/stap5-focus.ts` pure module | DONE | `c048fc6` | `src/lib/stap5-focus.ts` |

## Verification Results

### Wave 0 tests — all GREEN
```
npx vitest run src/lib/__tests__/schemas-stap5.test.ts src/lib/__tests__/stap5-focus-filter.test.ts src/lib/__tests__/stap5-restore-guard.test.ts

 Test Files  3 passed (3)
      Tests  23 passed (23)
```
- `schemas-stap5.test.ts` — 5 tests PASS
- `stap5-focus-filter.test.ts` — 11 tests PASS
- `stap5-restore-guard.test.ts` — 7 tests PASS
- **Totaal: 23/23 GREEN** ✓

### Acceptance criteria
- `grep sectorVertalingen src/lib/schemas.ts` → 0 matches ✓
- `grep focusDoelId src/lib/schemas.ts` → 1+ match ✓
- `grep aantalBaten src/lib/prompts.ts` → 0 matches ✓
- `grep "HEFBOOMWERKING PER VERMOGEN" src/lib/prompts.ts` → match ✓
- `grep "Werken aan Programma's, Hfst 8" src/lib/prompts.ts` → match ✓
- `src/lib/stap5-focus.ts` exports: `getFocusGoal`, `computeFocusView`, `restoreStap5Result`, `FocusView` ✓
- Geen `: any` in stap5-focus.ts ✓

### Build
`npm run build` → succeeds (Next.js/Turbopack is lenient op strict-check). Downstream consumers `StapSectorVertaling.tsx` en `CrossAnalyseWizard.tsx` nog niet aangeraakt — worden door Wave 2 (Plan 03) en Wave 3 (Plan 04) gefixt. Dat is conform scope.

### types.ts
Line 47 (`Stap5Result` re-export via `z.infer<typeof Stap5ResultSchema>`) ongewijzigd. TypeScript propagatie werkt automatisch — de nieuwe shape is nu beschikbaar als `Stap5Result` in alle downstream imports.

## Deviations from Plan

None — plan executed exactly as written. Schemas + prompt vervangen verbatim uit 13-RESEARCH Example 1 & 2. `stap5-focus.ts` gecreëerd verbatim uit 13-RESEARCH Example 4.

## Deferred Issues

### Pre-existing (out of scope, niet door 13-02 veroorzaakt)
- `src/lib/__tests__/schemas.test.ts:395` — DINSessionSchema strips integratieAdvies test fails. Verified pre-existing via `git stash` test run. Documented in `deferred-items.md`.
- `src/lib/__tests__/word-export.test.ts` — meerdere TS compile-time type mismatches, pre-existing, niet in scope.
- `src/lib/__tests__/stap5-focus-filter.test.ts` (Wave 0, van 13-01) heeft TypeScript strict-check errors in mock data (createdAt op benefit types, geen rank op goals). Vitest draait ze via transpile-only dus alle 11 tests zijn GREEN. Strict TS type fixes zijn 13-01 author's verantwoordelijkheid, niet Wave 1.

## Downstream Impact (Wave 2/3 scope)

**Wave 2 (Plan 03) zal deze bestanden moeten raken:**
- `src/app/api/cross-analyse/route.ts` — payload builder voor stap5 moet nieuwe shape maken; kan `computeFocusView` rechtstreeks importeren
- `src/components/cross-analyse/StapSectorVertaling.tsx` — volledige rewrite naar focus-view UI die `focusGoal`, `vermogenReview`, `inspanningReview`, `batenDekking` rendert

**Wave 3 (Plan 04) zal deze bestanden moeten raken:**
- `src/components/cross-analyse/CrossAnalyseWizard.tsx` — restore guard via `restoreStap5Result(raw)` bij session load useEffect

## Key Decisions Made

1. **Pure module als single source of truth** — `stap5-focus.ts` werkt zowel client- als serverside, geen `"use client"`. Dit garandeert identieke D-09 filter-semantiek tussen API route payload en client-side out-of-scope display.
2. **`import` vs `import type` splitsing** — `Stap5ResultSchema` (runtime value voor `safeParse`) normaal geïmporteerd; alle type-only imports via `import type`.
3. **Default `[]` arrays in schema** — voorkomt dat AI met minimale output (alleen focusDoelId + samenvatting) een parse failure triggert; de 3 review-arrays zijn optional-by-default maar altijd aanwezig in het resultaat.

## Self-Check: PASSED

**Files verified:**
- FOUND: `src/lib/schemas.ts` (modified — new Stap5ResultSchema)
- FOUND: `src/lib/prompts.ts` (modified — new CROSS_ANALYSE_STAP5_PROMPT)
- FOUND: `src/lib/stap5-focus.ts` (created — 115 lines)

**Commits verified:**
- FOUND: `3882793` feat(13-02): replace Stap5ResultSchema and CROSS_ANALYSE_STAP5_PROMPT
- FOUND: `c048fc6` feat(13-02): add pure module stap5-focus

**Tests verified:**
- 23/23 Wave 0 tests GREEN (5 + 11 + 7)
