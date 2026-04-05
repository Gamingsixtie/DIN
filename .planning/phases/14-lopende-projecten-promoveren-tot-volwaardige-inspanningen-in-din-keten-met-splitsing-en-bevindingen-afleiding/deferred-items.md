# Phase 14 — Deferred Items

Out-of-scope discoveries logged during plan execution. These are not caused by Phase 14 changes and belong to other phases / future cleanup work.

## Pre-existing test failure in schemas.test.ts

**Discovered during:** 14-01 execution (full suite regression check)
**Location:** `src/lib/__tests__/schemas.test.ts:395`
**Test name:** `DINSessionSchema legacy integratieAdvies strip`
**Assertion:** `expect(result.data).not.toHaveProperty("integratieAdvies")`

**Status:** FAILING on clean HEAD (verified via `git stash` + rerun before Phase 14 changes).

**Root cause:** The test expects `DINSessionSchema.safeParse` to strip the `integratieAdvies` field from legacy data, but the current schema definition (`schemas.ts:496`) declares `integratieAdvies: z.record(z.string(), z.unknown()).optional()` which preserves the field. The field is still present on `result.data` so the assertion fails.

**Why not fixed in 14-01:**
- Not caused by Phase 14 changes (pre-existing)
- Not in scope of 14-01 (schemas + promotion helpers)
- Fix requires either (a) removing the field from `DINSessionSchema`, or (b) updating the test to assert it IS present. Either choice needs a separate decision in its own plan.

**Recommendation:** Handle in a dedicated cleanup task (either Phase 14 Plan 2/3 if integratieAdvies clean-up is related to project promotion, or a separate maintenance task).
