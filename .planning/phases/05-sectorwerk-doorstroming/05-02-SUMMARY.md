---
phase: 05-sectorwerk-doorstroming
plan: 02
subsystem: api, ui
tags: [prompt-assembly, typed-objects, sectorwerk, din-mapping, suggestion-panel]

# Dependency graph
requires:
  - phase: 05-sectorwerk-doorstroming/01
    provides: AISectorplanAnalyseSchema typed storage, migrateSectorAnalyses, SectorplanAnalyseResult type
provides:
  - buildSectorwerkBlock() for system prompt context injection
  - SectorwerkSuggestiePanel UI component for benefit adoption from sectorwerk analysis
  - Typed object consumption in din-mapping and din-suggest API routes
  - sectorAnalysis passthrough as typed object in DINMappingStep fetch calls
affects: [cross-analyse, din-suggest, din-mapping, export]

# Tech tracking
tech-stack:
  added: []
  patterns: [buildSectorwerkBlock prompt injection pattern, SectorwerkSuggestiePanel adoption pattern]

key-files:
  created: []
  modified:
    - src/lib/prompt-assembly.ts
    - src/lib/__tests__/prompt-assembly.test.ts
    - src/app/api/din-mapping/route.ts
    - src/app/api/din-suggest/route.ts
    - src/components/steps/DINMappingStep.tsx

key-decisions:
  - "buildSectorwerkBlock capped at 1500 chars to manage prompt budget"
  - "Sectorwerk context injected into system prompt (not user message) per D-06"
  - "DINCreatieWizard din-suggest calls not updated (out of scope for this plan)"

patterns-established:
  - "buildSectorwerkBlock: typed analysis object to formatted prompt block pattern"
  - "SectorwerkSuggestiePanel: adoptie-logica with deduplication against existing benefits"

requirements-completed: [DATA-01, DATA-04]

# Metrics
duration: 7min
completed: 2026-04-02
---

# Phase 5 Plan 2: Sectorwerk Doorstroming - Suggestiepaneel en AI Context Summary

**buildSectorwerkBlock prompt injection + SectorwerkSuggestiePanel met one-click baat-adoptie uit sectorwerk-analyse**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-02T19:35:47Z
- **Completed:** 2026-04-02T19:43:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- buildSectorwerkBlock() function with 5 passing tests for structured sectorwerk-analyse prompt injection
- Replaced ~40 lines of fragile regex/JSON string parsing in din-mapping route with 4 lines of typed object consumption
- Injected sectorwerk-context into din-suggest system prompts across 3 call sites (domain-recommend, create, suggest)
- SectorwerkSuggestiePanel component with collapsible UI, one-click adoption, batch adoption, and adopted-state styling
- DINMappingStep updated to pass typed objects (null instead of empty string) for sectorAnalysis

## Task Commits

Each task was committed atomically:

1. **Task 1: buildSectorwerkBlock + API route opschoning** - `6074223` (test: RED phase), `bd2b651` (feat: GREEN + API cleanup)
2. **Task 2: SectorwerkSuggestiePanel in DINMappingStep** - `4be9408` (feat: suggestion panel + adoption logic)

_Note: Task 1 followed TDD with RED/GREEN commits._

## Files Created/Modified
- `src/lib/prompt-assembly.ts` - Added buildSectorwerkBlock() function with 1500-char cap and domain formatting
- `src/lib/__tests__/prompt-assembly.test.ts` - Added 5 test cases for buildSectorwerkBlock (samenvatting, baten, inspanningen, truncation, null)
- `src/app/api/din-mapping/route.ts` - Removed regex parsing, uses buildSectorwerkBlock for typed objects, injects in system prompt
- `src/app/api/din-suggest/route.ts` - Added sectorAnalysis extraction from body, injects buildSectorwerkBlock in 3 system prompt calls
- `src/components/steps/DINMappingStep.tsx` - Added SectorwerkSuggestiePanel component, adoptSuggestie/adoptAllSuggesties handlers, typed object passthrough

## Decisions Made
- buildSectorwerkBlock capped at 1500 chars to manage prompt budget (prevents sectorwerk data from overwhelming the system prompt)
- Sectorwerk context injected as system prompt suffix (after programmaboek + KiB blocks), per D-06 layered context architecture
- DINCreatieWizard din-suggest calls not updated with sectorAnalysis passthrough (3 calls out of scope for this plan, noted as deferred item)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added sectorAnalysis to din-suggest fetch in DINMappingStep**
- **Found during:** Task 1 (API route cleanup)
- **Issue:** DINMappingStep's callAISuggest function sent requests to /api/din-suggest without sectorAnalysis, but the route now expects it
- **Fix:** Added `sectorAnalysis: session!.sectorAnalyses?.[activeSector] || null` to the fetch body
- **Files modified:** src/components/steps/DINMappingStep.tsx
- **Verification:** npm run build succeeds
- **Committed in:** bd2b651 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for din-suggest to receive sectorwerk context. No scope creep.

## Known Stubs

None - all data flows are wired end-to-end.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sectorwerk-analyse data now flows through the full pipeline: typed storage (Plan 01) -> suggestiepaneel + AI context (Plan 02)
- DINCreatieWizard could benefit from sectorAnalysis passthrough in a future plan
- Cross-analyse route may also benefit from buildSectorwerkBlock pattern

## Self-Check: PASSED

All 6 files verified present. All 3 commits (6074223, bd2b651, 4be9408) verified in git log.

---
*Phase: 05-sectorwerk-doorstroming*
*Completed: 2026-04-02*
