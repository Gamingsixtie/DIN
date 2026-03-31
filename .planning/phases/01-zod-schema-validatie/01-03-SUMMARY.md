---
phase: 01-zod-schema-validatie
plan: 03
subsystem: validation
tags: [zod, kib-import, client-cleanup, retryable-ui, validation]

requires:
  - "Zod schemas from Plan 01 (KiBExportSchema)"
  - "AI validation pipeline from Plan 02 (callClaudeWithValidation, retryable responses)"
provides:
  - "KiB import validated with Zod schema (no type assertions)"
  - "Client-side components free of regex JSON extraction"
  - "Retryable feedback UI in all 6 AI-calling components (D-03)"
  - "API routes return validated objects instead of JSON strings"
affects: [api-routes, client-components, kib-import]

tech_stack:
  added: []
  patterns:
    - "Zod safeParse for external input validation"
    - "Retryable feedback textarea for AI error recovery"
    - "Session backward compat via JSON.stringify"

key_files:
  created:
    - src/lib/__tests__/kib-import.test.ts
  modified:
    - src/lib/kib-import.ts
    - src/app/api/cross-analyse/route.ts
    - src/app/api/analyze-sectorplan/route.ts
    - src/components/steps/CrossAnalyseStep.tsx
    - src/components/steps/SectorWerkStep.tsx
    - src/components/steps/DINMappingStep.tsx
    - src/components/din/BenefitCard.tsx
    - src/components/din/DINCreatieWizard.tsx
    - src/components/steps/SectorIntegratieStep.tsx

decisions:
  - "API routes now return validated objects directly (not JSON.stringify) -- clients use objects, session stores JSON.stringify for backward compat"
  - "Retryable feedback UI uses aiRetryable state + userFeedback textarea pattern across all components"
  - "KiB import re-exports KiBExport type from schemas.ts instead of defining its own interface"

metrics:
  duration: 17min
  completed: 2026-03-31
  tasks: 2
  files: 10
---

# Phase 01 Plan 03: KiB Validatie & Client Cleanup Summary

Zod-validated KiB import with 9 tests, client-side regex JSON extraction removed from 3 step components, retryable feedback textarea added to all 6 AI-calling components.

## Tasks Completed

### Task 1: Refactor KiB import met Zod validatie (TDD)
**Commit:** `e32ead2`

Replaced the manual `JSON.parse() as KiBExport` type assertion with Zod schema validation using `KiBExportSchema.safeParse()`. The `KiBExport` interface was removed from `kib-import.ts` and is now imported from `schemas.ts` (single source of truth). Invalid input produces descriptive Dutch error messages ("Ongeldig KiB-formaat: ...").

9 tests created covering: valid JSON with all fields, partial data, empty objects with defaults, invalid JSON, missing required fields (naam, rang).

### Task 2: Remove client-side JSON parsing + retryable feedback UI

**Commit:** `d4c6a41`

**Part A: API & client cleanup**
- Changed `cross-analyse/route.ts` and `analyze-sectorplan/route.ts` to return validated objects instead of `JSON.stringify(result.data)`
- Removed `analysis.match(/\{[\s\S]*\}/)` + `JSON.parse` from `CrossAnalyseStep.tsx` (2 locations)
- Removed `currentAnalysis.match(/\{[\s\S]*\}/)` + `JSON.parse` from `SectorWerkStep.tsx` (1 location)
- Removed `JSON.parse(cleaned)` from `DINMappingStep.tsx` for integratie-advies (1 location)
- Changed `CrossAnalyseStep` state from `string | null` to `CrossAnalyseResult | null`
- Session persistence preserved via `JSON.stringify()` when saving to session

**Part B: Retryable feedback UI (D-03)**

Added retryable error handling to all 6 AI-calling components:
1. **BenefitCard** -- textarea appears when AI suggestion fails
2. **DINCreatieWizard** -- textarea in 3 error display locations (domeinverkenning, domeinkeuze, vragen phases)
3. **DINMappingStep** -- textarea for DIN generation, integratie-advies, and per-item AI suggestions
4. **CrossAnalyseStep** -- textarea in error state below cross-analyse button
5. **SectorWerkStep** -- textarea in analysis error state
6. **SectorIntegratieStep** -- textarea below integratie-advies button

Pattern: `aiRetryable` boolean state + `userFeedback` string state. When API returns `retryable: true`, textarea appears. User types feedback, clicks "Opnieuw proberen", and the feedback is passed to the retry request.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. No regex JSON extraction in step components -- PASS
2. No `as KiBExport` type assertion in kib-import.ts -- PASS
3. retryable/userFeedback present in all 6 components -- PASS (BenefitCard:5, DINCreatieWizard:11, DINMappingStep:9, CrossAnalyseStep:5, SectorWerkStep:6, SectorIntegratieStep:6)
4. All 39 tests green (schemas:16, ai-parsing:14, kib-import:9) -- PASS
5. `npm run build` -- PASS
6. `safeParse` in kib-import.ts -- PASS

## Known Stubs

None. All functionality is fully wired.

## Self-Check: PASSED

All 10 files verified present. Both commits (e32ead2, d4c6a41) found in history.
