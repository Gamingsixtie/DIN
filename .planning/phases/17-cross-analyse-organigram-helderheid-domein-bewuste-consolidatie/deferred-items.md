# Deferred Items — Phase 17

## Out-of-scope findings during Wave 0 (Plan 17-01)

These failures existed **before** plan 17-01 started (caused by in-progress, uncommitted modifications in working tree at session start). They are not introduced by 17-01 changes (zod dep + schema extensies + consolidation-guards module).

### Pre-existing test failures (8 total)

**src/lib/__tests__/persistence.test.ts — 5 failures**
- `saveSessionToSupabase > skips write when remote version > local version (D-08)`
- `saveSessionToSupabase > skips write when versions equal but remote updatedAt is newer (D-04 tiebreaker)`
- `saveSessionToSupabase > writes when versions equal and local updatedAt is newer (D-04 tiebreaker)`
- `saveSessionToSupabase > writes when remote has no data (new session)`
- `single-device guarantee (D-05) > write path uses version check + updatedAt tiebreaker without multi-device merge logic`

**src/lib/__tests__/schemas.test.ts — 1 failure**
- `AIDINMappingResponseSchema quantity limits > DINSessionSchema strips unknown integratieAdvies field from legacy data`

**src/lib/__tests__/stap5-focus-filter.test.ts — 2 failures**
- `computeFocusView (R-CROSS-01, R-CROSS-02) > Test 2: filtert vermogens op relatedSectors.length > 1 EN koppeling aan focus-baten`
- `computeFocusView (R-CROSS-01, R-CROSS-02) > Test 3: filtert inspanningen op responsibleSector multi-sector EN koppeling aan focus-vermogens`

### Tooling issue

- `npm run lint` is broken on Windows due to space-in-path (`DIN/lint` misinterpretation). ESLint 9 config file missing (`eslint.config.js` instead of `.eslintrc.*`). Pre-existing — not introduced by 17-01.

### Scope boundary

Per executor Deviation Rules `SCOPE BOUNDARY`: "Only auto-fix issues DIRECTLY caused by the current task's changes. Pre-existing warnings, linting errors, or failures in unrelated files are out of scope."

These belong to later Wave 1/2/3 plans or separate cleanup work.
