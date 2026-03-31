---
phase: 01-zod-schema-validatie
plan: 02
subsystem: api
tags: [zod, validation, ai-client, retry, anthropic, next-api-routes]

# Dependency graph
requires:
  - phase: 01-zod-schema-validatie plan 01
    provides: Zod schemas (AIDINMappingResponseSchema, AISuggestBaatSchema, etc.) and vitest infrastructure
provides:
  - extractJSON() utility for robust JSON extraction from AI responses
  - parseAIResponse() for Zod schema validation of AI output
  - callClaudeWithValidation() with 2 silent retries and error reporting
  - All 7 API routes refactored to use Zod-validated responses
  - retryable flag on all AI validation failure responses (status 422)
affects: [01-zod-schema-validatie plan 03, client-side parsing cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns: [callClaudeWithValidation central AI validation pipeline, ParseResult<T> discriminated union, retryable error pattern]

key-files:
  created:
    - src/lib/__tests__/ai-parsing.test.ts
  modified:
    - src/lib/ai-client.ts
    - src/app/api/din-mapping/route.ts
    - src/app/api/din-suggest/route.ts
    - src/app/api/cross-analyse/route.ts
    - src/app/api/analyze-sectorplan/route.ts
    - src/app/api/export/route.ts
    - src/app/api/import-kib/route.ts
    - src/app/api/parse-sector/route.ts

key-decisions:
  - "Validated AI responses serialized back to JSON strings for backward compat with client-side parsing (Plan 03 cleans up)"
  - "Export route keeps callClaude for prose output, validates only request input"
  - "parse-sector validates response structure, not AI output (no AI involved)"

patterns-established:
  - "callClaudeWithValidation pattern: schema + systemPrompt + userMessage -> validated data or error"
  - "API error response pattern: { success: false, error: string, retryable: boolean } with status 422"
  - "ParseResult<T> discriminated union for type-safe success/failure handling"

requirements-completed: [DATA-02]

# Metrics
duration: 10min
completed: 2026-03-31
---

# Phase 01 Plan 02: AI Validation Pipeline Summary

**Central AI validation pipeline (extractJSON + parseAIResponse + callClaudeWithValidation) with 2 silent retries, all 7 API routes refactored from regex parsing to Zod-validated responses**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-31T12:56:21Z
- **Completed:** 2026-03-31T13:06:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Built extractJSON, parseAIResponse, and callClaudeWithValidation utilities with 14 passing tests
- Refactored all 7 API routes to use callClaudeWithValidation instead of fragile regex JSON extraction
- Zero regex parsing patterns remain in server-side API routes
- All AI endpoints return retryable flag (status 422) on validation failure for client feedback
- Backward compatible: client code unchanged, validated data serialized to strings where needed

## Task Commits

Each task was committed atomically:

1. **Task 1: Bouw parseAIResponse en callClaudeWithValidation** - `1744c64` (feat, TDD)
2. **Task 2: Refactor alle 7 API routes** - `614d306` (feat)

## Files Created/Modified
- `src/lib/ai-client.ts` - Added extractJSON, parseAIResponse, callClaudeWithValidation utilities with Zod import
- `src/lib/__tests__/ai-parsing.test.ts` - 14 tests covering JSON extraction, schema validation, retry logic
- `src/app/api/din-mapping/route.ts` - Uses callClaudeWithValidation with AIDINMappingResponseSchema
- `src/app/api/din-suggest/route.ts` - Uses callClaudeWithValidation per mode/type (domain-recommend, create, suggest)
- `src/app/api/cross-analyse/route.ts` - Validates default + sector-integratie with Zod, verrijkt-sectorplan keeps prose
- `src/app/api/analyze-sectorplan/route.ts` - Validates with AISectorplanAnalyseSchema
- `src/app/api/export/route.ts` - Validates request input with Zod, keeps callClaude for prose output
- `src/app/api/import-kib/route.ts` - Validates KiB JSON with KiBExportSchema.safeParse()
- `src/app/api/parse-sector/route.ts` - Validates response structure, checks for empty text

## Decisions Made
- **Backward compatibility via JSON serialization:** For endpoints where clients expect raw strings (cross-analyse, analyze-sectorplan), validated data is serialized back to JSON strings. Plan 03 will update client components to use structured data directly.
- **Export keeps callClaude:** The export endpoint generates prose markdown, not JSON. Only request input is validated with Zod.
- **parse-sector validates output structure:** No AI involved, but response is validated for non-empty text and correct shape.
- **UserMessage construction moved to routes:** Each API route now builds the userMessage directly instead of calling wrapper functions, enabling direct schema specification per endpoint.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Vitest not installed in worktree: resolved by running `npm install` before tests.
- Worktree did not have Plan 01 changes: resolved by merging main into worktree.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All API routes use Zod-validated responses, ready for Plan 03 client-side cleanup
- Client components still do their own regex parsing of API responses, which Plan 03 will simplify
- callClaudeWithValidation is the established pattern for any future AI endpoints

---
## Self-Check: PASSED

All 9 files verified present. Both task commits (1744c64, 614d306) verified in git history. Build passes. 30/30 tests pass.

---
*Phase: 01-zod-schema-validatie*
*Completed: 2026-03-31*
