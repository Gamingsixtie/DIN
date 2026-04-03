---
phase: 09-wizard-cleanup-export-voorbereiding
plan: 01
subsystem: data-layer
tags: [zod, schemas, types, prompts, ai-client, api-routes, cleanup]

# Dependency graph
requires:
  - phase: 01-zod-schema-validatie
    provides: Zod schemas with IntegratieAdvies types that are now removed
  - phase: 04-ai-output-kwaliteit
    provides: sector-integratie routing through assembleSystemPrompt
provides:
  - "Clean data layer without integratieAdvies schemas, types, or prompts"
  - "Clean AI client without generateSectorIntegratie function"
  - "Clean cross-analyse API route handling only cross-analyse and verrijkt-sectorplan"
  - "Legacy compatibility test for old sessions with integratieAdvies field"
affects: [09-02-PLAN, export, cross-analyse]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zod schema stripping: unknown fields automatically dropped by safeParse for legacy data compatibility"

key-files:
  created: []
  modified:
    - src/lib/schemas.ts
    - src/lib/types.ts
    - src/lib/prompts.ts
    - src/lib/ai-client.ts
    - src/app/api/cross-analyse/route.ts
    - src/lib/session-context.tsx
    - src/lib/__tests__/schemas.test.ts
    - src/lib/__tests__/session-context.test.ts
    - src/components/steps/DINMappingStep.tsx
    - src/components/steps/ExportStep.tsx
    - src/lib/word-export.ts

key-decisions:
  - "Consumer UI files (DINMappingStep, ExportStep, word-export) cleaned in this plan rather than deferring to Plan 02 -- build would not pass otherwise (Rule 3 blocking fix)"
  - "Verrijkt sectorplan panel restructured as standalone overlay instead of nested inside advies panel"

patterns-established:
  - "Legacy data stripping: Zod safeParse automatically drops unknown fields, no explicit migration needed"

requirements-completed: [EXP-04]

# Metrics
duration: 11min
completed: 2026-04-03
---

# Phase 09 Plan 01: Remove IntegratieAdvies Data Layer Summary

**Complete removal of integratieadvies schemas, types, prompts, AI functions, API route handler, and session state -- 766 lines of dead code deleted with legacy compatibility test**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-03T20:00:19Z
- **Completed:** 2026-04-03T20:11:21Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Deleted IntegratieAdviesItemSchema, IntegratieAdviesResultSchema, AIIntegratieAdviesSchema, and all type exports from schemas.ts
- Removed integratieAdvies field from DINSessionSchema, session-context initial state, and test fixtures
- Deleted SECTOR_INTEGRATIE_PROMPT (42 lines) from prompts.ts
- Deleted generateSectorIntegratie function (137 lines) from ai-client.ts
- Removed entire sector-integratie handler (~153 lines) from cross-analyse API route
- Cleaned integratieAdvies UI from DINMappingStep (button, state, panel), ExportStep (subsection), and word-export (export section)
- Added legacy compatibility test confirming old sessions with integratieAdvies field parse successfully (field is stripped by Zod)
- All 178 vitest tests pass, npm build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove integratieadvies from schemas, types, and prompts** - `af62ba1` (feat)
2. **Task 2: Remove integratieadvies from AI client and API route** - `453935f` (feat)

## Files Created/Modified
- `src/lib/schemas.ts` - Removed IntegratieAdvies schemas, AI schemas, type exports, and DINSession field
- `src/lib/types.ts` - Removed IntegratieAdviesItem and IntegratieAdviesResult re-exports
- `src/lib/prompts.ts` - Removed SECTOR_INTEGRATIE_PROMPT constant
- `src/lib/ai-client.ts` - Removed generateSectorIntegratie function and integratieAdvies param from generateVerrijktSectorplan
- `src/app/api/cross-analyse/route.ts` - Removed sector-integratie handler, AIIntegratieAdviesSchema import, integratieAdvies param
- `src/lib/session-context.tsx` - Removed integratieAdvies from initial session state
- `src/lib/__tests__/schemas.test.ts` - Added legacy compatibility test for integratieAdvies stripping
- `src/lib/__tests__/session-context.test.ts` - Removed integratieAdvies from test fixture
- `src/components/steps/DINMappingStep.tsx` - Removed integratieAdvies button, state, panel, AdviesCard component, ADVIES_SECTIONS constant
- `src/components/steps/ExportStep.tsx` - Removed IntegratieAdviesSubSection component and usage
- `src/lib/word-export.ts` - Removed integratieAdvies export section

## Decisions Made
- Consumer UI files (DINMappingStep, ExportStep, word-export) were cleaned in this plan rather than deferring to Plan 02, because removing the types without updating consumers caused TypeScript build errors (Rule 3: auto-fix blocking issues)
- Verrijkt sectorplan panel was restructured as a standalone overlay triggered by verrijktSectorplan state, since it was previously nested inside the advies panel modal

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Cleaned integratieAdvies from consumer UI components**
- **Found during:** Task 2 (build verification)
- **Issue:** DINMappingStep.tsx, ExportStep.tsx, and word-export.ts imported IntegratieAdviesResult and IntegratieAdviesItem types that were deleted in Task 1, causing TypeScript build errors
- **Fix:** Removed all integratieAdvies-related UI code (buttons, state, panels, components, export sections) from the three consumer files. Restructured verrijkt sectorplan panel as standalone overlay.
- **Files modified:** src/components/steps/DINMappingStep.tsx, src/components/steps/ExportStep.tsx, src/lib/word-export.ts
- **Verification:** `npm run build` succeeds, all 178 vitest tests pass
- **Committed in:** `453935f` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to achieve clean build. This work was originally scoped for Plan 02 but is required here because types were removed in Plan 01's scope. Plan 02 will have less UI cleanup work as a result.

## Issues Encountered
- Worktree was based on older pre-GSD commit; required merge from main to get schemas.ts and test infrastructure from phases 1-7.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Data layer is fully clean of integratieAdvies code
- Plan 02 can focus on remaining wizard cleanup and export preparation
- Consumer UI files are already partially cleaned; Plan 02 may have reduced scope

---
*Phase: 09-wizard-cleanup-export-voorbereiding*
*Completed: 2026-04-03*

## Self-Check: PASSED
- All 11 modified files exist
- Both task commits found (af62ba1, 453935f)
- SUMMARY.md created
