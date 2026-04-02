---
phase: 06-cyclisch-doel-voor-doel-werken
plan: 03
subsystem: DINMappingStep UI
tags: [cyclisch-werken, goal-status, sidebar, ui, checkpoint]
dependency_graph:
  requires: [checkSectorChain, getGoalCompletionStatus, buildCompletedGoalsContext, completedGoalItems-api]
  provides: [GoalStatusBadge, DoelAfrondenButton, auto-advance, completedGoalItems-passthrough]
  affects: [DINMappingStep]
tech_stack:
  - React 19 (inline components, useState, useSession)
  - Tailwind CSS 4 (emerald, gray, green status colors)
started: 2026-04-02T21:30:00Z
completed: 2026-04-03T09:00:00Z
duration_minutes: 15
status: complete
---

## What was done

Replaced the old green dot indicator in the DINMappingStep sidebar with a full cyclical goal-by-goal workflow UI.

## Key changes

### src/components/steps/DINMappingStep.tsx
- **GoalStatusBadge**: Tri-state inline component — green checkmark (afgerond), per-sector mini indicators PO+/VO-/Za- (bezig), gray circle (niet-begonnen)
- **"Doel afronden" button**: Emerald green when all 3 sectors have complete DIN chains, gray+disabled with missing-chain text when incomplete
- **Auto-advance**: After completing a goal, sidebar advances to next incomplete goal (300ms delay)
- **Un-complete toggle**: "Dit doel is afgerond" + "Markering opheffen" link for completed goals
- **buildCompletedGoalItemsForAPI()**: Helper assembles completed goal data for all AI fetch calls
- **completedGoalItems passthrough**: Added to all fetch calls to /api/din-mapping and /api/din-suggest
- **Old green dot removed**: hasBenefits check and \u25CF character fully replaced

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Replace green dot with status badges, afrond-knop, auto-advance, completedGoalItems | done | 021b32c |
| 2 | Human verification of cyclical workflow UI | approved | - |

## Self-Check: PASSED

- [x] GoalStatusBadge renders tri-state correctly
- [x] "Doel afronden" gated by completeness check
- [x] Auto-advance to next incomplete goal
- [x] Un-complete toggle works
- [x] completedGoalItems in all AI fetch calls
- [x] Old green dot removed
- [x] Build passes
- [x] Human verification: approved

## key-files

### created
(none — modifications only)

### modified
- src/components/steps/DINMappingStep.tsx (+171/-21 lines)
