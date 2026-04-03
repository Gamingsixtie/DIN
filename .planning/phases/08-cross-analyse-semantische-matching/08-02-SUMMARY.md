---
phase: 08-cross-analyse-semantische-matching
plan: 02
subsystem: cross-analyse
tags: [consolidation, cluster-ui, project-matching, merge-undo, filtered-analysis]
dependency_graph:
  requires: [08-01]
  provides: [VermogenClusterSection, InspanningClusterSection, ProjectMatchingSection, consolidation-handlers, filtered-local-analysis]
  affects: [src/components/steps/CrossAnalyseStep.tsx, src/lib/types.ts, src/lib/__tests__/consolidation.test.ts]
tech_stack:
  added: []
  patterns: [pure-function-consolidation, merge-undo-session-pattern, inline-confirmation-ui, cluster-card-component]
key_files:
  created:
    - src/lib/__tests__/consolidation.test.ts
  modified:
    - src/components/steps/CrossAnalyseStep.tsx
    - src/lib/types.ts
decisions:
  - "Pure function consolidation pattern: mergeCapabilities/undoMergeCapabilities as exported pure functions above component for testability"
  - "ProjectMatchingSection replaces ExterneProjectenSection with fallback: if projectMatching data present, use it; otherwise fall back to externeProjecten"
  - "AICrossAnalyse added to types.ts re-exports for consistent import path"
  - "Consolidated items filtered from activeCaps/activeEfforts before all local analysis computations"
  - "Toast notification for merge/undo via local state with 3s auto-clear instead of global toast system"
metrics:
  duration: 7min
  completed: "2026-04-03T20:19:00Z"
  tasks: 2
  files: 3
---

# Phase 8 Plan 02: Cluster UI, Consolidation Actions, Project Matching Summary

Cluster UI sections (teal vermogens, indigo inspanningen) with inline consolidation workflow, project matching with match/no-match status, and filtered local analysis hiding consolidated items from Synergie Matrix and Domein sections.

## Tasks Completed

### Task 1: Consolidation logic (merge/undo) as pure functions + unit tests (TDD)
- **Commits:** 65dec99 (RED: failing tests), 8cc7049 (GREEN: implementation)
- **Files:** src/components/steps/CrossAnalyseStep.tsx, src/lib/__tests__/consolidation.test.ts
- Exported pure functions: `mergeCapabilities`, `undoMergeCapabilities`, `mergeEfforts`, `undoMergeEfforts`
- mergeCapabilities: creates shared item with multi-sector relatedSectors, flags originals with consolidated/consolidatedInto, copies+deduplicates benefitCapabilityMaps and capabilityEffortMaps
- mergeEfforts: creates shared effort with combined responsibleSector, flags originals, copies capabilityEffortMaps
- Undo functions: remove shared item, clear flags on originals, remove shared mappings
- 8 unit tests covering merge, undo, mapping deduplication, edge cases (< 2 items)

### Task 2: UI components for cluster sections, consolidation actions, project matching, and filtered local analysis
- **Commit:** c866be1
- **Files:** src/components/steps/CrossAnalyseStep.tsx, src/lib/types.ts
- **New components (all inner functions in CrossAnalyseStep):**
  - `VermogenClusterSection`: teal-bordered section with ClusterCard rendering, sector badges, AI advice
  - `InspanningClusterSection`: indigo-bordered section, same pattern plus domain labels on items
  - `ProjectMatchingSection`: cyan-bordered section showing match/no-match status with AI advice
  - `ClusterCard`: reusable card with left border accent (teal/indigo), items list, baten context, consolidation bar
  - `ConsolidationActionBar`: Combineren (primary, inline confirm), Afstemmen (secondary), Apart houden (ghost), collapsed Geconsolideerd view with undo
- **Section order updated in AIAnalysisResult:** Synergie, Gaps, Hefboom, VermogenCluster, InspanningCluster, DomeinBalans, SectorOverlap, ProjectMatching
- **Consolidation state management:** mergedCapClusters/mergedEffClusters Maps, reviewedClusters Set, handlers wired via updateSession
- **Filtered local analysis:** activeCaps/activeEfforts exclude consolidated items; used in Synergie Matrix, Domein cards, Gap analysis, and stats strip
- **Toast feedback:** "Items samengevoegd" / "Samenvoeging ongedaan gemaakt" with 3s auto-clear
- **AICrossAnalyse** added to types.ts re-exports

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npx vitest run src/lib/__tests__/consolidation.test.ts`: 8/8 tests pass
- `npx vitest run`: 195/195 tests pass across 13 test files (no regressions)
- `npm run build`: compiles successfully, all routes functional
- Section order verified: Synergie, Gaps, Hefboom, VermogenCluster, InspanningCluster, DomeinBalans, SectorOverlap, ProjectMatching
- Consolidated items filtered: `!c.consolidated` and `!e.consolidated` confirmed in activeCaps/activeEfforts

## Known Stubs

None -- all UI sections, consolidation handlers, and filtering logic are fully functional.

## Self-Check: PASSED
