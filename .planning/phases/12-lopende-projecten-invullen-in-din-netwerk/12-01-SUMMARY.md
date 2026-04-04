---
phase: 12-lopende-projecten-invullen-in-din-netwerk
plan: 01
subsystem: api
tags: [zod, schemas, api-routes, ai-client, pdf-parse, mammoth, project-import, capability-matching]

# Dependency graph
requires:
  - phase: 01-zod-schema-validatie
    provides: callClaudeWithValidation pattern, Zod schema infrastructure
  - phase: 08-cross-analyse-semantische-matching
    provides: ExternalProjectSchema, ProjectMatchItemSchema
provides:
  - Extended ExternalProjectSchema with domains, linkedCapabilityIds, aiWarning, buitenScope
  - ProjectCapabilityMapSchema for project-to-capability linking
  - AIProjectExtractionResponseSchema and AIProjectCapabilityMatchResponseSchema
  - DINSessionSchema projectCapabilityMaps field
  - 3 new API routes (parse-projects, extract-projects, match-projects)
  - AI client functions extractProjectsFromText and matchProjectsToCapabilities
  - Helper functions getProjectsBySector and getLinkedCapabilities
affects: [12-02, 12-03]

# Tech tracking
tech-stack:
  added: [pdf-parse@1.1.1]
  patterns: [dynamic-pdf-import, project-capability-mapping]

key-files:
  created:
    - src/app/api/parse-projects/route.ts
    - src/app/api/extract-projects/route.ts
    - src/app/api/match-projects/route.ts
    - src/lib/__tests__/external-project-schema.test.ts
    - src/lib/pdf-parse.d.ts
  modified:
    - src/lib/schemas.ts
    - src/lib/types.ts
    - src/lib/din-service.ts
    - src/lib/prompts.ts
    - src/lib/ai-client.ts
    - src/app/page.tsx
    - src/components/steps/DINMappingStep.tsx
    - src/lib/demo-data.ts
    - src/lib/session-context.tsx

key-decisions:
  - "pdf-parse v1.1.1 (not v2) for simple Buffer-in/text-out API"
  - "Dynamic import for pdf-parse to keep it server-side only"
  - "ProjectCapabilityMap as separate mapping schema (not embedded in ExternalProject)"

patterns-established:
  - "Project import pipeline: parse -> extract -> match (3-step API)"
  - "AI response schemas for project data follow same callClaudeWithValidation pattern"

requirements-completed: [D-01, D-03, D-05, D-06, D-09, D-11]

# Metrics
duration: 11min
completed: 2026-04-04
---

# Phase 12 Plan 01: External Project Data Layer Summary

**Zod schemas, 3 API routes, and AI client functions for importing external projects and matching them to DIN capabilities**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-04T21:18:22Z
- **Completed:** 2026-04-04T21:29:28Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Extended ExternalProjectSchema with domains, linkedCapabilityIds, aiWarning, buitenScope fields (backward compatible)
- Created ProjectCapabilityMapSchema and AI response schemas for project extraction and capability matching
- Built 3 API routes: parse-projects (DOCX/DOC/PDF/TXT), extract-projects (AI), match-projects (AI)
- All 10 schema tests pass, build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema extensions + tests (TDD)**
   - `e46fcfd` (test) - Failing tests for 10 schema behaviors
   - `bb73fcd` (feat) - Schema implementations passing all tests
2. **Task 2: API routes + AI prompts + client functions** - `2507f59` (feat)

## Files Created/Modified

- `src/lib/schemas.ts` - Extended ExternalProjectSchema, added ProjectCapabilityMapSchema, AI response schemas, DINSession projectCapabilityMaps
- `src/lib/types.ts` - Re-exported ProjectCapabilityMap type
- `src/lib/din-service.ts` - Added getProjectsBySector and getLinkedCapabilities helpers
- `src/lib/prompts.ts` - PROJECT_EXTRACTION_PROMPT and PROJECT_CAPABILITY_MATCHING_PROMPT
- `src/lib/ai-client.ts` - extractProjectsFromText and matchProjectsToCapabilities functions
- `src/app/api/parse-projects/route.ts` - Document parsing for project import (PDF/DOCX/TXT)
- `src/app/api/extract-projects/route.ts` - AI-powered project extraction from text
- `src/app/api/match-projects/route.ts` - AI-powered project-to-capability matching
- `src/lib/__tests__/external-project-schema.test.ts` - 10 schema validation tests
- `src/lib/pdf-parse.d.ts` - Type declaration for pdf-parse v1
- `src/app/page.tsx` - Added projectCapabilityMaps to session constructor
- `src/components/steps/DINMappingStep.tsx` - Added new fields to ExternalProject constructor
- `src/lib/demo-data.ts` - Added projectCapabilityMaps to demo session
- `src/lib/session-context.tsx` - Added projectCapabilityMaps to session creation

## Decisions Made

- **pdf-parse v1.1.1**: Chose v1 over v2 because v2 has a class-based API incompatible with the simple dynamic import pattern. v1 provides a straightforward Buffer-in/text-out function.
- **Dynamic import for pdf-parse**: Used `const pdfParse = (await import("pdf-parse")).default` to keep the library server-side only and avoid bundling issues.
- **Separate ProjectCapabilityMap schema**: Created as a standalone mapping schema (projectId + capabilityId) following the existing mapping pattern (GoalBenefitMap, BenefitCapabilityMap, etc.) rather than embedding capability links inside ExternalProject.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added projectCapabilityMaps to 3 direct DINSession constructors**
- **Found during:** Task 2 (build verification)
- **Issue:** Adding projectCapabilityMaps with `.optional().default([])` to DINSessionSchema changed the inferred TypeScript type to require the field when constructing objects directly
- **Fix:** Added `projectCapabilityMaps: []` to page.tsx, session-context.tsx, and demo-data.ts session constructors
- **Files modified:** src/app/page.tsx, src/lib/session-context.tsx, src/lib/demo-data.ts
- **Verification:** npm run build succeeds
- **Committed in:** 2507f59 (Task 2 commit)

**2. [Rule 3 - Blocking] Added domains, linkedCapabilityIds, buitenScope to ExternalProject constructor in DINMappingStep**
- **Found during:** Task 2 (build verification)
- **Issue:** Extending ExternalProjectSchema with required-with-defaults fields broke existing direct ExternalProject construction
- **Fix:** Added the three new fields to the object literal in DINMappingStep.tsx
- **Files modified:** src/components/steps/DINMappingStep.tsx
- **Verification:** npm run build succeeds
- **Committed in:** 2507f59 (Task 2 commit)

**3. [Rule 3 - Blocking] Downgraded pdf-parse from v2.4.5 to v1.1.1**
- **Found during:** Task 2 (build verification)
- **Issue:** pdf-parse v2 uses a class-based API (PDFParse class) without a default export, incompatible with the `(await import("pdf-parse")).default` pattern
- **Fix:** Installed pdf-parse@1.1.1 which has the simple function API, added type declaration
- **Files modified:** package.json, package-lock.json, src/lib/pdf-parse.d.ts
- **Verification:** npm run build succeeds
- **Committed in:** 2507f59 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 3 - blocking)
**Impact on plan:** All auto-fixes necessary for build to succeed. No scope creep.

## Issues Encountered

- Pre-existing test failure in src/lib/__tests__/schemas.test.ts ("DINSessionSchema strips unknown integratieAdvies field from legacy data") -- not caused by this plan's changes. Logged as out-of-scope.

## Known Stubs

None -- all schemas, API routes, and AI client functions are fully wired with real implementations.

## User Setup Required

None - no external service configuration required. The API routes use the existing ANTHROPIC_API_KEY environment variable.

## Next Phase Readiness
- Data layer and API infrastructure complete for project import flow
- Plan 02 (UI components) can build on the schemas and API routes established here
- Plan 03 (integration) can wire the UI to the API routes

## Self-Check: PASSED

All 10 key files verified present. All 3 commit hashes verified in git log.

---
*Phase: 12-lopende-projecten-invullen-in-din-netwerk*
*Completed: 2026-04-04*
