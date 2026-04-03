---
phase: 10-eindproducten
plan: 03
subsystem: export-pipeline-cleanup
tags: [cleanup, dead-code, export, ai-client, prompts]
dependency_graph:
  requires: []
  provides:
    - "Clean ai-client.ts without deprecated generateProgrammaPlan"
    - "Clean prompts.ts without deprecated PROGRAMMAPLAN_PROMPT"
    - "No unused /api/export route"
  affects:
    - src/lib/ai-client.ts
    - src/lib/prompts.ts
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified:
    - src/lib/ai-client.ts
    - src/lib/prompts.ts
  deleted:
    - src/app/api/export/route.ts
decisions:
  - "D-04 enforced: Word document is the eindproduct, no separate AI prose export needed"
metrics:
  duration: 2min
  completed: "2026-04-03T22:34:34Z"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 3
---

# Phase 10 Plan 03: Remove Unused AI Prose Export Pipeline Summary

Removed the deprecated AI-generated prose export pipeline per decision D-04: the Word document is the eindproduct, no separate AI text generation is needed. Deleted /api/export/route.ts, generateProgrammaPlan() from ai-client.ts, and PROGRAMMAPLAN_PROMPT from prompts.ts.

## What Was Done

### Task 1: Remove unused AI prose export pipeline (D-04) [86d4e5b]

Removed three pieces of dead code that formed the unused AI prose export pipeline:

1. **Deleted `src/app/api/export/route.ts`** -- the entire API route file (38 lines) that accepted session data and called `generateProgrammaPlan()` to produce AI-generated prose. This route was not called anywhere; the actual Word export uses `word-export.ts` directly via dynamic import in ExportStep.tsx.

2. **Removed `generateProgrammaPlan()` from `src/lib/ai-client.ts`** -- the exported async function (5 lines) that called Claude with PROGRAMMAPLAN_PROMPT and 16384 max tokens. Also removed the `PROGRAMMAPLAN_PROMPT` import from the import statement.

3. **Removed `PROGRAMMAPLAN_PROMPT` from `src/lib/prompts.ts`** -- the multi-line template literal (46 lines) containing the full programmaplan generation prompt with structure, section headers, and writing rules.

4. **Verified no remaining references** -- grep across entire `src/` directory confirmed zero references to `generateProgrammaPlan`, `PROGRAMMAPLAN_PROMPT`, or `api/export`.

5. **Deleted empty directory** `src/app/api/export/` after removing the route file.

**Net change:** 93 lines deleted, 0 lines added.

## Verification Results

| Check | Result |
|-------|--------|
| `npm run build` | PASSED -- clean build, /api/export no longer in route list |
| Grep for removed identifiers | PASSED -- zero results across src/ |
| File deletion confirmed | PASSED -- route.ts and directory gone |
| No test regressions | PASSED -- no test files affected |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| D-04 enforced: no AI prose export | Word document via word-export.ts is the single export mechanism; AI prose generation was unused dead code |

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 86d4e5b | chore(10-03): remove unused AI prose export pipeline (D-04) |

## Self-Check: PASSED

- [x] src/app/api/export/route.ts deleted
- [x] src/lib/ai-client.ts exists (modified)
- [x] src/lib/prompts.ts exists (modified)
- [x] Commit 86d4e5b verified
- [x] SUMMARY.md created
