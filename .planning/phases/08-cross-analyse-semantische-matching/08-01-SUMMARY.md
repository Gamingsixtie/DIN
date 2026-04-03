---
phase: 08-cross-analyse-semantische-matching
plan: 01
subsystem: cross-analyse
tags: [schemas, ai-prompts, semantic-matching, backward-compat]
dependency_graph:
  requires: [07-01]
  provides: [AICrossAnalyseSchema-clusters, consolidation-flags, semantic-matching-prompt]
  affects: [src/lib/schemas.ts, src/lib/prompts.ts, src/app/api/cross-analyse/route.ts, src/lib/types.ts]
tech_stack:
  added: []
  patterns: [VermogenClusterItemSchema, InspanningClusterItemSchema, ProjectMatchItemSchema, consolidation-flags]
key_files:
  created:
    - src/lib/__tests__/cross-analyse-schema.test.ts
  modified:
    - src/lib/schemas.ts
    - src/lib/types.ts
    - src/lib/prompts.ts
    - src/app/api/cross-analyse/route.ts
decisions:
  - "Cluster schemas use .enum(['combineren', 'afstemmen', 'apart_houden']) for aanbeveling field -- enforces valid values"
  - "Baten are NOT matched or clustered per D-03 -- methodically correct per sector"
  - "Entity IDs sent in structured format to AI for reliable ID-based cluster matching"
  - "maxTokens increased from 8192 to 16384 to accommodate larger response with cluster sections"
metrics:
  duration: 5min
  completed: "2026-04-03T20:06:00Z"
  tasks: 2
  files: 5
---

# Phase 8 Plan 01: Cross-Analyse Schema Extension & Prompt Upgrade Summary

Extended Zod schemas with consolidation flags and three new AI cluster response sections (vermogenClusters, inspanningClusters, projectMatching), upgraded CROSS_ANALYSE_PROMPT with semantic matching instructions per DIN-methodiek, and updated the API route to send structured entity data with IDs and 16384 maxTokens.

## Tasks Completed

### Task 1: Extend Zod schemas with consolidation flags and AI cluster response sections (TDD)
- **Commit:** 7e13afc (RED: failing tests), 326087c (GREEN: implementation)
- **Files:** src/lib/schemas.ts, src/lib/types.ts, src/lib/__tests__/cross-analyse-schema.test.ts
- Added `consolidated: z.boolean().optional()` and `consolidatedInto: z.string().optional()` to DINCapabilitySchema and DINEffortSchema
- Created VermogenClusterItemSchema, InspanningClusterItemSchema, ProjectMatchItemSchema
- Extended AICrossAnalyseSchema with vermogenClusters, inspanningClusters, projectMatching (all optional with defaults)
- Added type exports and re-exports in types.ts
- 10 unit tests written and passing (backward compat + new fields)

### Task 2: Upgrade CROSS_ANALYSE_PROMPT and API route for semantic matching
- **Commit:** 07952a4
- **Files:** src/lib/prompts.ts, src/app/api/cross-analyse/route.ts
- Added semantic matching instructions: "Identificeer SEMANTISCH vergelijkbare vermogens en inspanningen"
- Added D-03 instruction: "Baten worden NIET gematcht of samengevoegd"
- Added D-07/D-08 instruction: koppel lopende projecten aan vermogens of baten
- Added ID-based matching instruction: "Retourneer altijd het exacte id van het item"
- Extended JSON response template with vermogenClusters, inspanningClusters, projectMatching sections
- API route now sends structured data with entity IDs instead of raw JSON.stringify
- Increased maxTokens from 8192 to 16384, data slice from 15000 to 20000 chars
- Added userFeedback support for cross-analyse

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts`: 10/10 tests pass
- `npx vitest run`: 187/187 tests pass across 12 test files (no regressions)
- `npm run build`: compiles successfully, all routes functional

## Known Stubs

None -- all schemas, prompts, and API route changes are fully functional. The UI rendering of the new cluster sections is deferred to Plan 02.

## Self-Check: PASSED
