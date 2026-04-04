---
phase: 11-cross-analyse-herontwerp-stapsgewijs-traject-met-consolidatie
plan: 01
subsystem: cross-analyse
tags: [schemas, prompts, api, wizard, per-step]
dependency_graph:
  requires: [AICrossAnalyseSchema, VermogenClusterItemSchema, InspanningClusterItemSchema, CrossAnalyseHefboomItemSchema, CrossAnalyseDomeinItemSchema, ProjectMatchItemSchema]
  provides: [Stap1ResultSchema, Stap2ResultSchema, Stap3ResultSchema, Stap4ResultSchema, Stap5ResultSchema, CrossAnalyseWizardStateSchema, per-step-prompts, per-step-api-route]
  affects: [src/lib/schemas.ts, src/lib/types.ts, src/lib/prompts.ts, src/app/api/cross-analyse/route.ts]
tech_stack:
  added: []
  patterns: [per-step-schema-selection, cumulative-context-building, backward-compatible-api-extension]
key_files:
  created: []
  modified: [src/lib/schemas.ts, src/lib/types.ts, src/lib/prompts.ts, src/app/api/cross-analyse/route.ts]
decisions:
  - Per-step schemas placed before DINSessionSchema for declaration order correctness
  - Cumulative context capped at 3000 chars with sentence-boundary truncation
  - Backward compat maintained: calls without stap parameter use original CROSS_ANALYSE_PROMPT + AICrossAnalyseSchema
metrics:
  duration: 4min
  completed: 2026-04-04
  tasks: 2
  files: 4
---

# Phase 11 Plan 01: Per-step Cross-analyse Data Layer Summary

Per-step Zod schemas, AI prompts, and API route refactoring for 5-step cross-analyse wizard with cumulative context injection and backward compatibility.

## What Was Done

### Task 1: Per-step Zod schemas + DINSession wizard state extension
- Added 5 per-step AI response schemas (Stap1-5ResultSchema) to schemas.ts
- Each schema matches the specific output shape for its wizard step (baten-overloop, vermogen-clusters, inspanning-clusters, consolidatie-advies, sector-vertalingen)
- Added CrossAnalyseWizardStateSchema to persist wizard progress (currentStep, completedSteps, stepResults)
- Extended DINSessionSchema with optional crossAnalyseWizard field
- Added all 6 new type exports and re-exports in types.ts
- **Commit:** 84d119e

### Task 2: Per-step prompts + API route refactoring
- Added 5 per-step cross-analyse prompts (CROSS_ANALYSE_STAP1-5_PROMPT) in prompts.ts after existing CROSS_ANALYSE_PROMPT
- Each prompt instructs Claude to produce JSON matching its corresponding schema
- Refactored route.ts with getStepConfig() helper for per-step prompt/schema dispatch
- Added buildCumulativeContext() that accumulates samenvatting from prior steps (capped at 3000 chars)
- API route now accepts optional stap parameter (1-5) for per-step invocation
- userFeedback parameter supported per step (D-13)
- Backward compat: calls without stap parameter fall through to original full cross-analyse
- **Commit:** 84ef5ab

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Declaration order: CrossAnalyseWizardStateSchema before DINSessionSchema**
- **Found during:** Task 1
- **Issue:** Plan said to insert schemas after AICrossAnalyseSchema (line ~603), but DINSessionSchema uses CrossAnalyseWizardStateSchema and is declared earlier (line ~379). TypeScript error: block-scoped variable used before declaration.
- **Fix:** Moved per-step schemas and wizard state schema to before DINSessionSchema (after AISectorplanAnalyseSchema, before DINSession section)
- **Files modified:** src/lib/schemas.ts
- **Commit:** 84d119e

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Schemas placed before DINSessionSchema | TypeScript requires declaration before use; DINSessionSchema references CrossAnalyseWizardStateSchema |
| Cumulative context 3000 char cap with sentence boundary | Prevents token budget explosion while keeping coherent summaries from prior steps |
| Backward compat via fallthrough | Existing CrossAnalyseStep.tsx calls without stap parameter continue to work unchanged |

## Known Stubs

None. All schemas, prompts, and API route logic are fully wired.

## Self-Check: PASSED

All 4 files verified present. Both commit hashes (84d119e, 84ef5ab) confirmed in git history.
