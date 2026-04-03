---
phase: 10-eindproducten
plan: 01
subsystem: export
tags: [word-export, docx, numbering, consolidation, gap-analysis, tabel-flow, din-methodiek]

# Dependency graph
requires:
  - phase: 08-cross-analyse-semantische-matching
    provides: consolidated/consolidatedInto fields on capabilities and efforts
provides:
  - Numbered headings with dynamic TOC in Word export
  - Consolidation-aware filtering in all document sections
  - Smart gap categorization (volgende cyclus vs echte gaps)
  - DIN tabel-flow visualization per doel per sector
  - Roadmap placeholder when no quarter data
  - Volgende cyclus notation for unworked goals
affects: [10-02, 10-03, export]

# Tech tracking
tech-stack:
  added: [vitest]
  patterns: [NumberingState for dynamic document structure, activeSession pattern for consolidated filtering, categorizeGaps for smart gap analysis]

key-files:
  created:
    - src/lib/__tests__/word-export.test.ts
    - vitest.config.ts
  modified:
    - src/lib/word-export.ts
    - src/lib/types.ts
    - package.json

key-decisions:
  - "Inline goal status determination instead of getGoalCompletionStatus import (function not present in codebase)"
  - "activeSession pattern: pass session with filtered caps/efforts to buildChainsForSector"
  - "TOC built after all content sections (post-pass from tocEntries array)"
  - "consolidated fields added to DINCapability and DINEffort types to support Phase 8 consolidation data"

patterns-established:
  - "NumberingState pattern: h1/h2 counters + tocEntries accumulator passed through all section functions"
  - "getActiveCaps/getActiveEfforts: centralized consolidation filtering before any section rendering"
  - "categorizeGaps: smart gap categorization separating intentional non-work from real chain breaks"

requirements-completed: [EXP-01, EXP-02, EXP-03]

# Metrics
duration: 9min
completed: 2026-04-04
---

# Phase 10 Plan 01: Eindproducten Export Engine Upgrade Summary

**Word export with numbered headings, consolidation filtering, tabel-flow DIN visualization, smart gap categorization, and volgende-cyclus notation**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-03T22:34:44Z
- **Completed:** 2026-04-03T22:44:00Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 5

## Accomplishments
- NumberingState system with dynamic TOC built from accumulated tocEntries after all content sections
- All document sections now use numbered headings (1. Programmavisie, 1.1 Beknopt, etc.)
- Consolidated items (from Phase 8 cross-analyse merging) filtered from every section via getActiveCaps/getActiveEfforts
- Smart gap analysis distinguishes "volgende cyclus" goals (intentionally not yet worked) from "echte gaps" (broken chains)
- DIN tabel-flow visualization: 5-column table (Baat -> Vermogen -> Inspanning) per doel per sector with domain-colored shading
- Roadmap shows "Kwartaalplanning wordt in een volgende cyclus bepaald" when no efforts have quarter data
- Goals without benefits marked with "Uitwerking volgt in volgende cyclus" in overview section
- "(gedeeld)" suffix on shared capabilities in goalDIN sections and sector sections
- 13 unit tests covering numbering, consolidation, gap-category, roadmap, and volgende-cyclus

## Task Commits

Each task was committed atomically (TDD flow):

1. **Task 1 RED: Failing tests** - `8bfa374` (test)
2. **Task 1 GREEN: Full implementation** - `c6a32ea` (feat)

## Files Created/Modified
- `src/lib/word-export.ts` - Enhanced with NumberingState, consolidation filtering, categorizeGaps, dinFlowTableSection, roadmap placeholder, volgende cyclus notation
- `src/lib/types.ts` - Added consolidated/consolidatedInto fields to DINCapability and DINEffort
- `src/lib/__tests__/word-export.test.ts` - 13 unit tests for all new behaviors
- `vitest.config.ts` - Vitest configuration with @/ path alias
- `package.json` / `package-lock.json` - vitest dev dependency added

## Decisions Made
- **Inline goal status logic**: getGoalCompletionStatus referenced in plan does not exist in din-service.ts; implemented equivalent logic in categorizeGaps() by checking goalBenefitMaps presence
- **activeSession pattern**: Rather than modifying buildChainsForSector API, created a session copy with only active (non-consolidated) caps/efforts
- **Post-pass TOC**: All content sections built first advancing numState, then TOC generated from accumulated tocEntries -- ensures TOC always matches actual document structure

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] getGoalCompletionStatus does not exist in din-service.ts**
- **Found during:** Task 1 (implementation)
- **Issue:** Plan references importing getGoalCompletionStatus from din-service, but this function is not present in the codebase
- **Fix:** Implemented equivalent goal status logic directly in categorizeGaps() -- checks goalBenefitMaps to determine if a goal is "niet-begonnen" (no benefits) vs has some activity
- **Files modified:** src/lib/word-export.ts
- **Verification:** categorizeGaps tests pass, correctly separating volgendeCyclus from echteGapsGoals

**2. [Rule 3 - Blocking] consolidated fields missing from types.ts**
- **Found during:** Task 1 (implementation)
- **Issue:** DINCapability and DINEffort interfaces don't have consolidated/consolidatedInto fields (exist in schemas.ts on main but not in this worktree's types.ts)
- **Fix:** Added optional consolidated?: boolean and consolidatedInto?: string to both interfaces
- **Files modified:** src/lib/types.ts
- **Verification:** TypeScript compiles, build passes, getActiveCaps/getActiveEfforts tests pass

**3. [Rule 3 - Blocking] vitest not installed**
- **Found during:** Task 1 (RED phase)
- **Issue:** Package not in devDependencies
- **Fix:** npm install --save-dev vitest
- **Files modified:** package.json, package-lock.json
- **Verification:** npx vitest run succeeds

---

**Total deviations:** 3 auto-fixed (3 blocking)
**Impact on plan:** All auto-fixes necessary to complete the task. No scope creep. The inline goal status logic provides equivalent behavior to the planned getGoalCompletionStatus import.

## Issues Encountered
- DINEffort type does not have relatedSectors field, so "(gedeeld)" suffix for efforts was not added (only capabilities have relatedSectors). This is correct per the type system.

## Known Stubs
None - all functionality is wired to real data sources.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Word export engine fully upgraded with all D-02 through D-13 features from UI-SPEC
- Ready for Plan 02 (export UI and verification) and Plan 03 (final integration)
- All section functions accept NumberingState and active item arrays -- consistent API for any future section additions

## Self-Check: PASSED

All files verified present, all commits verified in git history.

---
*Phase: 10-eindproducten*
*Completed: 2026-04-04*
