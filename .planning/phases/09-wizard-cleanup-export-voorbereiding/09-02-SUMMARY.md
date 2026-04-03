---
phase: 09-wizard-cleanup-export-voorbereiding
plan: 02
status: checkpoint
started: 2026-04-03T20:30:00Z
completed: null
duration: ~8min
tasks_completed: 2
tasks_total: 3
---

# Plan 09-02 Summary: UI Cleanup and Orphaned File Deletion

## What Was Built

Removed all integratieadvies UI elements from DINMappingStep and deleted three orphaned component files. The DIN mapping interface now renders a clean, focused workflow without the unused advies panel, phase toggle, or samengevoegd view.

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Strip integratieadvies from DINMappingStep | Done | `b199215` |
| 2 | Delete orphaned component files | Done | `b199215` |
| 3 | Human verification of wizard flow | Pending checkpoint |

## Changes

### DINMappingStep.tsx (~80 lines removed)
- Removed `MergedDINView` import
- Removed `DINPhase` type alias and `phase`/`setPhase` state
- Removed phase toggle UI (Per Sector / Samengevoegd buttons)
- Removed samengevoegd rendering section with MergedDINView
- Unwrapped per-sector content from conditional `phase === "per-sector"` wrapper

### Deleted Files (~1,738 lines removed)
- `src/components/steps/SectorIntegratieStep.tsx` — orphaned step component
- `src/components/steps/SamengevoegdDINStep.tsx` — orphaned step component
- `src/components/din/MergedDINView.tsx` — orphaned after toggle removal

## Key Files

### Created
- None

### Modified
- src/components/steps/DINMappingStep.tsx

### Deleted
- src/components/steps/SectorIntegratieStep.tsx
- src/components/steps/SamengevoegdDINStep.tsx
- src/components/din/MergedDINView.tsx

## Deviations

Plan 09-01 (data layer cleanup) already removed integratieAdvies types, prompts, AI client functions, API route handlers, and cleaned ExportStep.tsx and word-export.ts as a deviation. This plan focused on the remaining DINMappingStep UI cleanup and file deletions.

## Checkpoint

Awaiting human verification of wizard flow after cleanup.

## Self-Check: PARTIAL
- [x] DINMappingStep has no MergedDINView, DINPhase, samengevoegd, or phase toggle
- [x] Three orphaned files deleted
- [x] npm run build passes
- [x] All vitest tests pass
- [ ] Human verification of wizard flow pending
