---
phase: 16-supabase-dual-persistence-stabiliteit-sync-en-verificatie
plan: 02
subsystem: persistence-ui
tags: [sync-status, pending-saves, footer, context-provider]

# Dependency graph
requires: [16-01]
provides:
  - SyncStatusProvider + useSyncStatus hook for sync state tracking
  - SyncStatusFooter fixed badge (green/orange/red/gray)
  - Persistent pending-saves queue (addPendingSave/drainPendingSaves/getPendingSaveCount)
  - Session-list Supabase sync in page.tsx (D-06)
affects: [16-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [syncStatusRef for stale closure avoidance, latestSessionRef for async save outside setSession, pending-saves localStorage queue with drain on mount]

key-files:
  created:
    - src/lib/sync-status-context.tsx
    - src/components/ui/SyncStatusFooter.tsx
  modified:
    - src/lib/persistence.ts
    - src/lib/session-context.tsx
    - src/components/ui/ClientProviders.tsx
    - src/components/ui/Toast.tsx
    - src/app/sessies/[id]/page.tsx
    - src/app/page.tsx

key-decisions:
  - "syncStatusRef pattern (same as addToastRef) avoids stale closures in setSession functional updater"
  - "latestSessionRef captures session for async Supabase save OUTSIDE setSession callback (Pitfall 6)"
  - "Pending-saves queue stores LATEST version per session ID to prevent stale overwrites (Pitfall 4)"

patterns-established:
  - "Sync status context: setSyncing -> setSynced/setError lifecycle for all Supabase saves"
  - "Pending-saves queue: addPendingSave on failure, drainPendingSaves on app mount"
  - "D-06 session-list sync: handleCreate/handleDelete/handleLoadDemo all sync to Supabase with fallback"

requirements-completed: [D-01, D-02, D-03, D-06]

# Metrics
duration: 4min
completed: 2026-04-07
---

# Phase 16 Plan 02: Sync Status UI + Pending Saves Queue Summary

**SyncStatusContext with footer badge, persistent retry-queue for failed saves (D-03), session-context sync status tracking (D-01/D-02), and session-list Supabase sync (D-06)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-07T20:49:39Z
- **Completed:** 2026-04-07T20:54:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- SyncStatusProvider + useSyncStatus hook tracks sync state across the app (D-01/D-02)
- SyncStatusFooter renders fixed at bottom of all pages with color-coded status badge
- Pending-saves queue persists failed saves to localStorage and auto-drains on app startup (D-03)
- All Supabase saves in session-context (updateSession, createSession, loadSession, setCurrentStep) track sync status
- Toast notification fires on final retry failure with Dutch message
- Session-list operations in page.tsx (create, delete, demo) sync to Supabase with fallback (D-06)
- Toast position raised to bottom-12 to clear fixed footer
- Bottom padding (pb-12) added to homepage and session page

## Task Commits

Each task was committed atomically:

1. **Task 1: Pending-saves queue + SyncStatusContext + SyncStatusFooter** - `8cda454` (feat)
2. **Task 2: ClientProviders wiring + Toast position + page padding** - `f078a12` (feat)
3. **Task 3: Wire session-context saves to sync status + pending queue + D-06 session-list sync** - `0247dc3` (feat)

## Files Created/Modified

- `src/lib/sync-status-context.tsx` - SyncStatusProvider + useSyncStatus hook (NEW)
- `src/components/ui/SyncStatusFooter.tsx` - Fixed footer with color-coded sync badge (NEW)
- `src/lib/persistence.ts` - addPendingSave, getPendingSaveCount, drainPendingSaves functions
- `src/lib/session-context.tsx` - syncStatusRef, latestSessionRef, sync status tracking on all save paths
- `src/components/ui/ClientProviders.tsx` - SyncStatusProvider + SyncStatusFooter wrapping
- `src/components/ui/Toast.tsx` - bottom-4 -> bottom-12 for footer clearance
- `src/app/sessies/[id]/page.tsx` - pb-12 bottom padding
- `src/app/page.tsx` - pb-12 + D-06 sync with addPendingSave fallback

## Decisions Made

- syncStatusRef pattern (same as addToastRef) avoids stale closures in setSession functional updater
- latestSessionRef captures session for async Supabase save OUTSIDE setSession callback (Pitfall 6)
- Pending-saves queue stores LATEST version per session ID to prevent stale overwrites (Pitfall 4)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all components are fully wired with real data sources.

## Pre-existing Issues

- `schemas.test.ts` has 1 pre-existing failing test (`DINSessionSchema strips unknown integratieAdvies field from legacy data`) unrelated to this plan's changes. Verified by running tests before and after changes.

---
*Phase: 16-supabase-dual-persistence-stabiliteit-sync-en-verificatie*
*Completed: 2026-04-07*
