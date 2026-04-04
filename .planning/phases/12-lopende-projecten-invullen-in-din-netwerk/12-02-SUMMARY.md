---
phase: 12-lopende-projecten-invullen-in-din-netwerk
plan: 02
subsystem: ui
tags: [component-extraction, ai-import, review-cards, domain-chips, warning-badges, buiten-scope]

# Dependency graph
requires:
  - phase: 12-lopende-projecten-invullen-in-din-netwerk
    plan: 01
    provides: ExternalProjectSchema extensions, parse-projects API, extract-projects API
provides:
  - ExterneProjectenPanel component with AI import, review cards, domain chips, warning badges
  - Updated DINMappingStep with extracted component import and onAddProjects prop
affects: [12-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [two-tab-import-panel, review-card-confirm-flow, domain-chip-checkbox, warning-badge-expandable]

key-files:
  created:
    - src/components/din/ExterneProjectenPanel.tsx
  modified:
    - src/components/steps/DINMappingStep.tsx

key-decisions:
  - "Auto-save on all-confirmed: setTimeout(saveConfirmedProjects, 0) to batch-save when all review cards are confirmed"
  - "Separate buiten-scope section: projects with buitenScope=true rendered at bottom with opacity-50 and strikethrough"
  - "Domain chips on existing cards: unchecked domains appear on hover via group-hover:opacity-100 pattern"

patterns-established:
  - "ReviewProject local type for temporary review state before persisting to session"
  - "WarningBadge sub-component with click-to-expand tooltip for AI toelichting"
  - "ExistingProjectCard sub-component for confirmed project management with inline editing"

requirements-completed: [D-01, D-02, D-04, D-05, D-07, D-10, D-11, D-13]

# Metrics
duration: 7min
completed: 2026-04-04
---

# Phase 12 Plan 02: ExterneProjectenPanel UI Component Summary

**Extracted ExterneProjectenPanel with AI-powered import tabs, review cards with domain checkboxes, warning badges, and buiten scope toggle**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-04T21:34:24Z
- **Completed:** 2026-04-04T21:41:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created 854-line ExterneProjectenPanel component with full project import and management functionality
- Two-tab import: text paste + document upload, both calling /api/parse-projects and /api/extract-projects
- Review cards with editable name, description, status select, and multi-domain checkboxes (4 domains)
- Warning badges (D-13) with expandable AI toelichting and "Buiten scope" action
- Batch confirm ("Alles bevestigen") and individual confirm ("Project bevestigen") flows
- Buiten scope toggle: projects marked as buiten scope shown dimmed at bottom with "Terug in scope" option
- Removed 163-line inline ExterneProjectenPanel from DINMappingStep (2031 -> 1861 lines)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ExterneProjectenPanel component** - `b9adc28` (feat)
2. **Task 2: Update DINMappingStep import** - `5dd51ce` (refactor)

## Files Created/Modified

- `src/components/din/ExterneProjectenPanel.tsx` - New 854-line component with import tabs, review cards, domain chips, warning badges, buiten scope management
- `src/components/steps/DINMappingStep.tsx` - Removed inline ExterneProjectenPanel, added import from new component, updated to onAddProjects prop

## Decisions Made

- **Auto-save on all-confirmed**: When all review cards are marked as confirmed, a setTimeout triggers batch save to avoid intermediate state updates. This follows the plan's instruction to use a single onAddProjects call for batch saving (Research pitfall 5).
- **Separate buiten-scope section**: Projects with buitenScope=true are rendered in a dedicated section at the bottom with dimmed styling (opacity-50, bg-gray-50, line-through on name), with a "Terug in scope" action.
- **Domain chips on hover**: Existing project cards show unchecked domain chips on hover via the group-hover:opacity-100 pattern, allowing users to add domains without entering full edit mode.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None -- all component functionality is fully wired to the API routes from Plan 01. Import flow calls /api/parse-projects and /api/extract-projects. Review and confirm flow saves to session via onAddProjects.

## Next Phase Readiness
- ExterneProjectenPanel ready for Plan 03 integration (AIKoppelingPanel, inline project display)
- Component exports default function, ready for import from any step component

## Self-Check: PASSED
