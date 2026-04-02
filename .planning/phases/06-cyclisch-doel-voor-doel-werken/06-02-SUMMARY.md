---
phase: 06-cyclisch-doel-voor-doel-werken
plan: 02
subsystem: prompt-assembly, api-routes
tags: [ai-deduplication, completed-goals-context, prompt-assembly, cycl-02]
dependency_graph:
  requires: [completedGoals-schema, checkSectorChain, getGoalCompletionStatus]
  provides: [buildCompletedGoalsContext, CompletedGoalContext-type, CompletedGoalItem-type, completedGoalItems-api-param]
  affects: [din-mapping-api, din-suggest-api]
tech_stack:
  added: []
  patterns: [layered-prompt-assembly, char-cap-truncation, newline-boundary-truncation]
key_files:
  created: []
  modified:
    - src/lib/prompt-assembly.ts
    - src/lib/__tests__/prompt-assembly.test.ts
    - src/app/api/din-mapping/route.ts
    - src/app/api/din-suggest/route.ts
decisions:
  - "buildCompletedGoalsContext uses 6000 char cap with newline-boundary truncation per D-07, consistent with buildSectorwerkBlock pattern"
  - "Completed goals context is the 5th block in layered prompt: programmaboek -> KiB -> sectorwerk -> eerder-uitgewerkte-doelen per D-08"
  - "Dutch deduplication instruction per D-09: Vermijd overlap, genereer aanvullende unieke items"
  - "All 3 din-suggest branches (domain-recommend, create, suggest) wired with completed goals context"
metrics:
  duration: 3min
  completed: "2026-04-02T21:26:00Z"
---

# Phase 6 Plan 2: AI Context Injection for Completed Goals Summary

buildCompletedGoalsContext generates a Dutch-language prompt block with 6000-char cap and deduplication instruction; wired into din-mapping and din-suggest API routes as the 5th layered prompt block.

## What Was Done

### Task 1: Implement buildCompletedGoalsContext with tests (TDD)

**RED:** Created 9 failing tests covering:
- Empty input returns empty string
- Non-empty input contains "EERDER UITGEWERKTE DOELEN:" header
- Contains D-09 deduplication instructions ("Vermijd overlap", "Genereer aanvullende, unieke")
- Output format matches sectorwerk block (\n---\n ... \n---)
- Goal names, benefit titles, capability titles appear in output
- Large input (20 goals x 10 benefits) truncated to max 6100 chars
- Truncation happens at newline boundary

**GREEN:** Implemented in src/lib/prompt-assembly.ts:
1. `CompletedGoalItem` interface with goalName, benefits, capabilities, efforts
2. `CompletedGoalContext` type alias
3. `buildCompletedGoalsContext()` function with:
   - 6000 char cap (`COMPLETED_GOALS_MAX_CHARS`)
   - Clean newline-boundary truncation at 70% threshold
   - Dutch deduplication instruction per D-09
   - Format consistent with buildSectorwerkBlock pattern

All 56 prompt-assembly tests pass (47 existing + 9 new).

### Task 2: Wire buildCompletedGoalsContext into API routes

1. **din-mapping/route.ts**: Added `completedGoalItems` to request body destructuring, appended completed goals context block after sectorwerk block
2. **din-suggest/route.ts**: All 3 branches wired:
   - `domain-recommend` mode: completed goals context after sectorwerk block
   - `create` mode: completed goals context after sectorwerk block
   - `suggest` mode (default): completed goals context after sectorwerk block

Build succeeds without TypeScript errors.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npx vitest run src/lib/__tests__/prompt-assembly.test.ts`: 56/56 tests pass
- `npm run build`: Succeeds without errors
- `grep -rn "buildCompletedGoalsContext" src/`: Found in prompt-assembly.ts (definition), din-mapping/route.ts (1 usage), din-suggest/route.ts (3 usages), test file (9 usages)

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| d8a8f85 | test | Failing tests for buildCompletedGoalsContext (RED) |
| bdcbb76 | feat | Implement buildCompletedGoalsContext with char cap and deduplication (GREEN) |
| e50bfce | feat | Wire buildCompletedGoalsContext into din-mapping and din-suggest API routes |

## Known Stubs

None -- all functions are fully implemented and tested. The API routes accept completedGoalItems but the frontend call-site wiring is deferred to Plan 03 (UI changes).

## Self-Check: PASSED
