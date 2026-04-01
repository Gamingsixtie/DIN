---
phase: 04-ai-output-kwaliteit
plan: 01
subsystem: AI prompt assembly + API routes
tags: [kib-context, prompt-injection, quantity-limits, zod-schemas]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [kib-context-injection, ai-quantity-limits]
  affects: [din-mapping, din-suggest, cross-analyse, sector-integratie]
tech_stack:
  added: []
  patterns: [KiBContext interface, extractKiBContext helper, prompt assembly with KiB block]
key_files:
  created: []
  modified:
    - src/lib/prompt-assembly.ts
    - src/lib/schemas.ts
    - src/lib/__tests__/prompt-assembly.test.ts
    - src/lib/__tests__/schemas.test.ts
    - src/app/api/din-mapping/route.ts
    - src/app/api/din-suggest/route.ts
    - src/app/api/cross-analyse/route.ts
decisions:
  - KiB context placed after programmaboek context in system prompt for layered knowledge injection
  - Scope instruction uses explicit ALLEEN directive to constrain AI generation
  - .max() only on AIDINMappingResponseSchema, storage schemas remain unlimited
  - sector-integratie now routed through assembleSystemPrompt for consistent context injection
metrics:
  duration: 5min
  completed: "2026-04-01T21:19:00Z"
  tasks: 2
  files: 7
---

# Phase 04 Plan 01: KiB Context Injection + Quantity Limits Summary

KiB programmadoelen en scope injected into all AI system prompts via assembleSystemPrompt; .max() quantity limits on AI response arrays prevent unbounded generation.

## What Was Done

### Task 1: KiB context interface + prompt-assembly extension + schema limits (TDD)
- Added `KiBContext` interface with goals (name, description, rank) and scope (inScope, outScope)
- Added `extractKiBContext` helper that maps session data to KiBContext, sorting goals by rank, capping descriptions at 80 chars, limiting scope to 10 items per list
- Extended `assembleSystemPrompt` with optional 4th parameter `kibContext?: KiBContext | null`
- KiB block placed AFTER programmaboek context with header "KIB PROGRAMMADOELEN EN SCOPE:"
- Footer instruction: "Genereer ALLEEN items die passen binnen bovenstaande doelen en scope"
- Total KiB block capped at ~1000 chars to prevent context window bloat
- Added `.max(4)` on benefits, `.max(8)` on capabilities, `.max(12)` on efforts in AIDINMappingResponseSchema
- Storage schemas (DINSessionSchema) remain unlimited -- only AI response schemas enforce limits
- 13 new tests covering extractKiBContext, KiB prompt assembly, and quantity limits
- **Commit:** `1cee01d`

### Task 2: KiB context doorvoeren in alle API routes
- `din-mapping/route.ts`: extracts kibGoals/kibScope from body, passes kibContext to assembleSystemPrompt
- `din-suggest/route.ts`: extracts kibContext once at top of handler, passes to all 3 assembleSystemPrompt calls (domain-recommend, create, suggest)
- `cross-analyse/route.ts`: passes kibContext to both cross-analyse and sector-integratie modes; sector-integratie now routed through assembleSystemPrompt (was using raw prompt)
- All 6 assembleSystemPrompt calls across 3 API routes now include kibContext
- Build succeeds without errors
- **Commit:** `d943de0`

## Verification Results

- All 65 tests pass (prompt-assembly.test.ts + schemas.test.ts)
- `npm run build` succeeds without errors
- All 6 assembleSystemPrompt calls in API routes verified to pass kibContext parameter

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all functionality is fully wired. The client-side components do not yet send `kibGoals` and `kibScope` in their API calls, but this is expected to be wired in Plan 02 (DINMappingStep client-side validation).

## Self-Check: PASSED

- All 7 modified files exist on disk
- Commit 1cee01d found in git log
- Commit d943de0 found in git log
