# Deferred Items — Phase 13

## Pre-existing test failure (out of scope for 13-02)

- **File:** `src/lib/__tests__/schemas.test.ts:395`
- **Test:** "DINSessionSchema strips integratieAdvies from legacy sessions"
- **Status:** Already failing on main before 13-02 changes (verified via `git stash`)
- **Root cause:** `DINSessionSchema` does not strip the `integratieAdvies` field — likely from incomplete Phase 09-01 cleanup.
- **Action:** Should be addressed in a separate fix plan (09-01 follow-up), not Phase 13.
