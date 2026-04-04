---
phase: 11-cross-analyse-herontwerp-stapsgewijs-traject-met-consolidatie
plan: 03
subsystem: cross-analyse wizard
tags: [wizard, cross-analyse, steps, baten, vermogens, inspanningen]
dependency_graph:
  requires: [11-01, 11-02]
  provides: [CrossAnalyseWizard, StapBatenOverloop, StapGedeeldeVermogens, StapInspanningenOverlap]
  affects: [CrossAnalyseStep, session-context]
tech_stack:
  added: []
  patterns: [wizard-orchestrator, read-only-cluster-card, per-step-ai-call, cumulative-context]
key_files:
  created:
    - src/components/cross-analyse/CrossAnalyseWizard.tsx
    - src/components/cross-analyse/StapBatenOverloop.tsx
    - src/components/cross-analyse/StapGedeeldeVermogens.tsx
    - src/components/cross-analyse/StapInspanningenOverlap.tsx
  modified:
    - src/lib/schemas.ts
    - src/lib/types.ts
    - src/app/api/cross-analyse/route.ts
    - src/lib/prompts.ts
decisions:
  - "WizardNavigation rendered inside step content panel for unified layout"
  - "Steps 4-5 use inline placeholder functions pending Plan 04"
  - "ClusterCard readOnly={true} prevents consolidation in analysis steps (D-08)"
  - "Wave 1 dependencies (shared components, schemas, API route, prompts) copied from main repo into worktree"
metrics:
  duration: 7min
  completed: "2026-04-04T21:26:33Z"
---

# Phase 11 Plan 03: CrossAnalyseWizard Orchestrator and Analysis Steps Summary

Wizard orchestrator with 5-step navigation and 3 analysis step components (baten-overloop, gedeelde vermogens, inspanningen-overlap) using shared components and per-step AI calls via cumulative context.

## What Was Built

### CrossAnalyseWizard.tsx (Orchestrator)
- 5-step wizard managing step state, cumulative AI context, and session persistence via `crossAnalyseWizard` session field
- Legacy mode detection: shows "Eerdere analyse gevonden" banner when old `crossAnalyse` data exists without wizard state
- Per-step AI calls to `/api/cross-analyse` with `stap: currentStep` parameter, cumulative step results, and optional user feedback
- Stats strip header with goal/benefit/capability/effort/synergy counts
- Step completion via AI analysis OR manual "Markeer als bekeken" button
- Optional context textarea per step with step-specific placeholders (D-13)
- Per-step loading overlay with customized titles/descriptions per UI-SPEC
- Error state with retry textarea and "Opnieuw proberen" button
- Steps 4-5 render temporary placeholders pending Plan 04

### StapBatenOverloop.tsx (Step 1)
- 3-column sector grid showing baten per sector side-by-side (D-03)
- Each baat shows title and linked goal badge via goalBenefitMaps
- Local gap analysis using `findGaps()` from din-service (GapsSection pattern)
- AI result rendering: synergies with sector badges, enhanced gaps, summary

### StapGedeeldeVermogens.tsx (Step 2)
- Vermogen-Synergie Matrix table using `findSharedCapabilities()` with PO/VO/Zakelijk columns
- AI result rendering: read-only ClusterCard for vermogen clusters (D-04), hefboomwerking section with priority badges
- Read-only mode prevents consolidation buttons in this analysis step (D-08)

### StapInspanningenOverlap.tsx (Step 3)
- 4-domain balance grid using `getDomainBalance()` with percentage bars and sector breakdowns
- Domain gap warnings for unrepresented domains
- AI result rendering: read-only inspanning clusters, project matching with match/no-match badges (D-05)
- Read-only mode prevents consolidation buttons in this analysis step (D-08)

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 3bff17e | feat(11-03): CrossAnalyseWizard orchestrator with 5-step navigation |
| 2 | bfb5f7d | feat(11-03): wizard steps 1-3 — baten-overloop, gedeelde vermogens, inspanningen-overlap |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Wave 1 dependencies not in worktree**
- **Found during:** Task 1 setup
- **Issue:** Worktree was on main branch without Wave 1 commits (11-01 shared components, schemas, API route; 11-02 WizardNavigation, StepAnalyseButton). These existed in main repo but not in the worktree.
- **Fix:** Copied Wave 1 files from main repo into worktree: shared components, updated schemas.ts (per-step schemas), types.ts (per-step type exports), route.ts (step-based dispatch), prompts.ts (per-step prompts)
- **Files modified:** All Wave 1 files staged with Task 1 commit
- **Commit:** 3bff17e

**2. [Rule 2 - Missing functionality] WizardNavigation layout**
- **Found during:** Task 1
- **Issue:** Plan specified WizardNavigation at both top and bottom of step panel, but the component bundles both progress indicator and nav buttons
- **Fix:** Rendered WizardNavigation once inside the step content panel providing both progress indicator and navigation buttons
- **Commit:** 3bff17e

## Known Stubs

| File | Location | Stub | Reason |
|------|----------|------|--------|
| CrossAnalyseWizard.tsx | lines 23-30 | StapConsolidatiePlaceholder, StapSectorVertalingPlaceholder | Plan 04 will implement these steps |

These stubs are intentional and will be replaced by Plan 04 (consolidation and sector translation steps).

## Verification

- `npm run build` passes without errors
- TypeScript compilation clean for all new components
- All acceptance criteria verified via grep checks

## Self-Check: PASSED

- All 4 created files exist on disk
- Commit 3bff17e (Task 1) verified in git log
- Commit bfb5f7d (Task 2) verified in git log
- `npm run build` succeeds
