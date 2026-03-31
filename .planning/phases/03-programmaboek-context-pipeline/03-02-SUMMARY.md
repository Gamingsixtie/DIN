---
phase: 03-programmaboek-context-pipeline
plan: 02
subsystem: programmaboek-api-route-wiring
tags: [ai-context, programmaboek, api-routes, prompt-assembly, system-prompt]
dependency_graph:
  requires: [src/lib/prompt-assembly.ts, src/lib/programmaboek-context.ts]
  provides: [programmaboek-context-in-din-mapping, programmaboek-context-in-din-suggest, programmaboek-context-in-cross-analyse]
  affects: [src/app/api/din-mapping/route.ts, src/app/api/din-suggest/route.ts, src/app/api/cross-analyse/route.ts]
tech_stack:
  added: []
  patterns: [assembled-system-prompt, per-use-case-context-injection]
key_files:
  created: []
  modified:
    - src/app/api/din-mapping/route.ts
    - src/app/api/din-suggest/route.ts
    - src/app/api/cross-analyse/route.ts
decisions:
  - Per D-11 export and sectorplan-analyse routes excluded from programmaboek context injection
  - Per-type useCaseMap pattern for din-suggest modes (create and suggest each get specific ProgrammaboekUseCase)
  - Sector-integratie and verrijkt-sectorplan blocks in cross-analyse intentionally left without programmaboek context
metrics:
  duration: 3min
  completed: "2026-03-31T21:31:00Z"
  tasks_completed: 1
  tasks_total: 2
  tests_added: 0
  files_changed: 3
---

# Phase 03 Plan 02: API Route Wiring Summary

Wired assembleSystemPrompt into all 3 DIN-related API routes so every AI call for baten, vermogens, inspanningen and cross-analyse includes relevant programmaboek methodology context in the system prompt.

## What Was Built

### Task 1: Wire assembleSystemPrompt into API routes

Modified three API route files to compose system prompts with programmaboek context:

**`src/app/api/din-mapping/route.ts`:**
- Added import of `assembleSystemPrompt` from `@/lib/prompt-assembly`
- Wrapped `DIN_MAPPING_PROMPT` with `assembleSystemPrompt(DIN_MAPPING_PROMPT, "din-mapping")`
- This injects DIN overview + baten definition + vermogens definition from the programmaboek

**`src/app/api/din-suggest/route.ts`:**
- Added import of `assembleSystemPrompt` and `ProgrammaboekUseCase` type
- Mode "domain-recommend": `assembleSystemPrompt(DIN_DOMAIN_RECOMMEND_PROMPT, "domain-recommend")` -- injects vermogens aspecten context
- Mode "create": Added `createUseCaseMap` mapping baat/vermogen/inspanning to their create use cases (`baat-create`, `vermogen-create`, `inspanning-create`)
- Mode "suggest" (default): Added `suggestUseCaseMap` mapping baat/vermogen/inspanning to their suggest use cases (`baat-suggest`, `vermogen-suggest`, `inspanning-suggest`)
- All 7 prompt constants across 3 modes now include their type-specific programmaboek context

**`src/app/api/cross-analyse/route.ts`:**
- Added import of `assembleSystemPrompt` from `@/lib/prompt-assembly`
- Default cross-analyse block: `assembleSystemPrompt(CROSS_ANALYSE_PROMPT, "cross-analyse")` -- injects cross-analyse context
- Per D-11: `SECTOR_INTEGRATIE_PROMPT` (sector-integratie block) remains unwrapped
- Per D-11: `generateVerrijktSectorplan` (verrijkt-sectorplan block) remains untouched
- Per D-11: `src/app/api/export/route.ts` was NOT modified

### Task 2: Checkpoint -- Review prompt/book discrepancies (D-06)

**Status: AWAITING HUMAN VERIFICATION**

This task requires the user to verify that:
1. The extracted programmaboek sections in `src/lib/programmaboek-context.ts` contain accurate methodology text
2. The existing prompt instructions in `src/lib/prompts.ts` are not contradicted by the programmaboek text
3. The assembled system prompts (instruction layer + knowledge layer) are complementary, not redundant

Key areas to check:
- DIN_MAPPING_PROMPT references "Wijnen en Van der Tak (2002)" vs. programmaboek (Prevaas & Van Loon)
- Batenprofiel structure in prompts vs. Chapter 8.5
- Vermogens "6 aspecten" in prompts vs. Chapter 10.4
- Inspanningendossier fields in prompts vs. Chapter 11.3

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **D-11 strict exclusion:** Export route, sector-integratie block, and verrijkt-sectorplan block are all excluded from programmaboek context injection -- only DIN-mapping, DIN-suggest (all modes), and cross-analyse (default mode) receive context.
2. **Per-type useCaseMap pattern:** Rather than a single conditional, each mode in din-suggest uses a Record mapping type string to ProgrammaboekUseCase for clarity and type safety.

## Test Coverage

- No new tests added (this plan modifies call sites, not logic)
- All 92 existing tests pass with no regressions
- `npm run build` succeeds

## Known Stubs

None -- all modifications are complete and functional.

## What's Next

Task 2 checkpoint requires human verification of prompt/book alignment (D-06). Once approved, Phase 3 is complete and Phase 4 (AI Output Kwaliteit) can begin.

## Self-Check: PASSED

All 3 modified files verified on disk. Commit hash 263965b verified in git log. Build succeeds. 92 tests passing.
