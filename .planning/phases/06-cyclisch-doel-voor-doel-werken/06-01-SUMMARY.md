---
phase: 06-cyclisch-doel-voor-doel-werken
plan: 01
subsystem: din-service, schemas
tags: [goal-completion, din-chain, cyclisch-werken, tdd]
dependency_graph:
  requires: []
  provides: [completedGoals-schema, checkSectorChain, getGoalCompletionStatus, GoalStatus-type, SectorChainStatus-type, GoalCompletionStatus-type]
  affects: [session-context, page, demo-data]
tech_stack:
  added: []
  patterns: [mapping-chain-traversal, tri-state-status]
key_files:
  created:
    - src/lib/__tests__/goal-completion.test.ts
  modified:
    - src/lib/schemas.ts
    - src/lib/din-service.ts
    - src/app/page.tsx
    - src/lib/session-context.tsx
    - src/lib/__tests__/session-context.test.ts
    - src/lib/demo-data.ts
decisions:
  - "completedGoals uses .optional().default([]) pattern per D-05 for backward-compatible legacy session loading"
  - "checkSectorChain traverses mapping chain only (goalBenefitMaps -> benefitCapabilityMaps -> capabilityEffortMaps), not loose items"
  - "GoalStatus tri-state: afgerond (manual), bezig (any items), niet-begonnen (no items) -- afgerond requires explicit marking"
metrics:
  duration: 7min
  completed: "2026-04-02T21:19:00Z"
---

# Phase 6 Plan 1: Goal Completion Logic Summary

DINSession schema extended with completedGoals field; checkSectorChain and getGoalCompletionStatus implement tri-state doel-voor-doel voortgang via mapping-chain traversal.

## What Was Done

### Task 1: Add completedGoals to DINSessionSchema + implement completeness logic (TDD)

**RED:** Created 11 failing test cases covering:
- DINSessionSchema completedGoals default and preservation
- checkSectorChain: empty, complete, partial, unlinked-item scenarios
- getGoalCompletionStatus: niet-begonnen, bezig, afgerond states, sector coverage

**GREEN:** Implemented:
1. **Schema extension** (`src/lib/schemas.ts`): Added `completedGoals: z.array(z.string()).optional().default([])` to DINSessionSchema
2. **Completeness functions** (`src/lib/din-service.ts`):
   - `checkSectorChain(session, goalId, sectorId)`: Traverses the full mapping chain (goalBenefitMaps -> benefitCapabilityMaps -> capabilityEffortMaps) to determine if a goal has benefits, capabilities, and efforts in a specific sector
   - `getGoalCompletionStatus(session, goalId)`: Returns tri-state status across all 3 sectors
3. **Exported types**: `SectorChainStatus`, `GoalCompletionStatus`, `GoalStatus`

**REFACTOR:** No refactoring needed -- implementation is minimal and clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed direct DINSession construction missing completedGoals**
- **Found during:** Build verification after schema extension
- **Issue:** Three files construct DINSession objects directly (not via schema parser) and were missing the new required `completedGoals` field: `src/app/page.tsx`, `src/lib/session-context.tsx`, `src/lib/demo-data.ts`
- **Fix:** Added `completedGoals: []` to all direct DINSession object literals
- **Files modified:** src/app/page.tsx, src/lib/session-context.tsx, src/lib/demo-data.ts, src/lib/__tests__/session-context.test.ts

## Verification Results

- `npx vitest run src/lib/__tests__/goal-completion.test.ts`: 11/11 tests pass
- `npx vitest run`: 168/168 total tests pass (no regressions)
- `npm run build`: Succeeds without errors
- Grep checks: All exported types and functions present at expected locations

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| f8ecbfe | test | Failing tests for goal completion logic (RED) |
| 5b443ef | feat | Implement goal completion logic with completedGoals schema field (GREEN) |

## Known Stubs

None -- all functions are fully implemented and tested with real logic.

## Self-Check: PASSED

- All created/modified files exist on disk
- Both commit hashes (f8ecbfe, 5b443ef) verified in git log
- 168/168 tests pass, build succeeds
