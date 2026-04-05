---
phase: 13-stap-5-cross-analyse-prioriteitsview-eerste-doel
plan: 01
subsystem: cross-analyse-stap5
tags: [tests, tdd, wave-0, stap5, focus-view, schema]
requires: []
provides:
  - src/lib/__tests__/schemas-stap5.test.ts
  - src/lib/__tests__/stap5-focus-filter.test.ts
  - src/lib/__tests__/stap5-restore-guard.test.ts
affects: []
tech_stack_added: []
patterns:
  - Pure-function contract tests per module
  - Zod safeParse regression guards for breaking schema changes
key_files_created:
  - src/lib/__tests__/schemas-stap5.test.ts
  - src/lib/__tests__/stap5-focus-filter.test.ts
  - src/lib/__tests__/stap5-restore-guard.test.ts
key_files_modified: []
decisions:
  - "Wave 1 already landed before Wave 0: all 23 tests GREEN on commit"
  - "Tests serve as regression guards rather than RED→GREEN scaffolding"
metrics:
  duration: 4min
  tasks: 3
  files: 3
  tests_added: 23
completed: 2026-04-05
---

# Phase 13 Plan 01: Stap 5 Wave 0 — Test Scaffolding Summary

Test scaffolding for Phase 13 Stap 5 focus view: 23 vitest tests across 3 files locking the `Stap5ResultSchema` shape, `getFocusGoal`/`computeFocusView` pure filter semantics, and `restoreStap5Result` D-10 migration behavior.

## What Was Built

Three test files in `src/lib/__tests__/`:

1. **schemas-stap5.test.ts** (5 tests) — `Stap5ResultSchema.safeParse` assertions validating the new shape (`focusDoelId`, `vermogenReview`, `inspanningReview`, `batenDekking`) and rejecting the deprecated `sectorVertalingen[]` shape per D-07.

2. **stap5-focus-filter.test.ts** (11 tests) — Contract tests for `getFocusGoal` (rank sort, 999 fallback, immutability) and `computeFocusView` (focus-benefit filtering via `goalBenefitMaps`, cross-sector capability filtering via `relatedSectors.length > 1`, multi-sector effort filtering via `responsibleSector`, consolidated exclusion).

3. **stap5-restore-guard.test.ts** (7 tests) — `restoreStap5Result` pure function tests for D-10 non-destructive migration: valid new shape passthrough, old shape → `undefined` reset, null/undefined handling, partial shape rejection, `console.warn` emission on rejection.

## Test Results

```
 ✓ src/lib/__tests__/schemas-stap5.test.ts (5 tests)
 ✓ src/lib/__tests__/stap5-focus-filter.test.ts (11 tests)
 ✓ src/lib/__tests__/stap5-restore-guard.test.ts (7 tests)
 Test Files  3 passed (3)
 Tests       23 passed (23)
```

**Note on state:** The plan anticipated a RED state (tests failing until Wave 1 lands). However, Wave 1 artifacts (`src/lib/schemas.ts` Stap5ResultSchema rewrite, `src/lib/stap5-focus.ts` with `getFocusGoal`/`computeFocusView`/`restoreStap5Result`) were already landed prior to executing this plan. All 23 tests are GREEN on first run. This is an even stronger outcome — the tests now function as regression guards against any future regression of Wave 1 contracts.

## Verification

- `npx vitest run src/lib/__tests__/schemas-stap5.test.ts src/lib/__tests__/stap5-focus-filter.test.ts src/lib/__tests__/stap5-restore-guard.test.ts` → 23/23 passed
- `npm run build` → success (Next.js build unaffected, tests excluded from build)
- All three files use `@/lib/...` alias per `vitest.config.ts`
- `mockSession` helper typed via `Partial<DINSession>` (no `any`)

## Deviations from Plan

### [Rule 3 - Blocker out-of-scope] `npm run lint` script broken

The plan required `npm run lint` to pass. The project's `lint` script is `next lint`, which was removed in Next.js 16 and now fails with `Invalid project directory provided, no such directory: ...lint`. This is a pre-existing project-level tooling issue unrelated to the test files added in this plan. Logged as deferred; not in scope for plan 13-01.

### Tests GREEN instead of RED

The plan anticipated RED tests until Wave 1 implementation. Wave 1 modules (`src/lib/stap5-focus.ts`, updated `Stap5ResultSchema`) were already present in the codebase when this plan executed, so all assertions passed immediately. No code was written to make them pass — the tests validate pre-existing Wave 1 contracts and will guard against regressions.

## Wave 1 Dependencies (Already Present)

- `src/lib/schemas.ts` — `Stap5ResultSchema` with new shape (lines 430-452)
- `src/lib/stap5-focus.ts` — exports `getFocusGoal`, `computeFocusView`, `restoreStap5Result`

## Deferred Issues

- Project `lint` script broken due to Next.js 16 removing `next lint`. Needs migration to standalone ESLint CLI. Not in scope for this plan.

## Commits

- `e5adec1` test(13-01): add Stap5ResultSchema contract tests
- `bb255d0` test(13-01): add Stap5 focus filter contract tests
- `755019e` test(13-01): add Stap5 restore guard tests for D-10 migration

## Self-Check: PASSED

- `src/lib/__tests__/schemas-stap5.test.ts` — FOUND
- `src/lib/__tests__/stap5-focus-filter.test.ts` — FOUND
- `src/lib/__tests__/stap5-restore-guard.test.ts` — FOUND
- Commit e5adec1 — FOUND
- Commit bb255d0 — FOUND
- Commit 755019e — FOUND
