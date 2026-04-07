# Phase 16: Supabase dual persistence — stabiliteit, sync en verificatie - Research

**Researched:** 2026-04-07
**Domain:** Client-side persistence, Supabase JS SDK, retry patterns, sync UI
**Confidence:** HIGH

## Summary

Phase 16 stabilizes the existing localStorage-first + Supabase async persistence so every session mutation is guaranteed to reach Supabase. The current implementation uses fire-and-forget `saveSessionToSupabase()` calls scattered across `session-context.tsx` and `page.tsx` — failures are silently logged. This phase replaces that with an awaited retry mechanism, adds a version counter for optimistic locking, introduces a sync-status footer, and provides health-check + unit test coverage.

The codebase already has all the structural pieces: `persistence.ts` with Supabase CRUD functions, `session-context.tsx` with a centralized `updateSession` path, a Toast system, and vitest infrastructure with 20+ test files. The work is primarily refactoring existing patterns (not greenfield) with clear boundaries: `persistence.ts` for retry logic, a new `SyncStatusFooter` component, and extended tests.

**Primary recommendation:** Build a retry queue in `persistence.ts` with exponential backoff (max 3 retries), expose sync status via React context, and add a footer badge component. Keep the JSON blob pattern (D-07) and add a `version` field to DINSession for optimistic locking.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Subtiele sync-badge in een footer/statusbalk: groen = gesynct, oranje = bezig, rood = fout
- **D-02:** Badge verschijnt in een nieuwe footer/statusbalk onderaan het scherm (niet in de header)
- **D-03:** Bij langdurige Supabase-onbereikbaarheid: badge rood + automatische retry-queue. Zodra Supabase weer bereikbaar is, worden opgestapelde wijzigingen automatisch gesynct
- **D-04:** Nieuwste wint: vergelijk updatedAt timestamps — de nieuwste versie overschrijft de andere
- **D-05:** Single-device gebruik: een apparaat per sessie. Supabase is voor backup/herstel, geen real-time multi-device sync
- **D-06:** Session_list ook naar Supabase syncen. Bestaande `loadSessionListFromSupabase` wordt uitgebreid zodat bij verlies van localStorage alle sessies teruggehaald kunnen worden
- **D-07:** JSON blob behouden als opslagpatroon in `din_sessions` tabel. Geen migratie naar genormaliseerd schema
- **D-08:** Version counter toevoegen aan sessie voor optimistic locking. Oplopend versienummer bij elke save; bij save checken of Supabase-versie niet hoger is dan verwacht
- **D-09:** Unit tests voor persistence.ts (mock Supabase) + in-app health-check
- **D-10:** Health-check op homepage toont: Supabase bereikbaar (ja/nee), aantal sessies in Supabase, laatste sync-tijd. Subtiel in de footer
- **D-11:** saveSessionToSupabase wordt afgewacht (await) met automatische retry (max 3x) bij fouten. Badge toont sync-status. localStorage blijft altijd eerst geschreven
- **D-12:** Graceful degradation: als NEXT_PUBLIC_SUPABASE_URL of ANON_KEY ontbreken, werkt de app offline-only (localStorage). Badge toont 'Offline modus'. Supabase is optioneel
- **D-13:** Ongebruikte dualSave/dualLoad generics opruimen. Nieuwe retry-logica komt in de Supabase-specifieke functies

### Claude's Discretion
- Exacte retry-strategie (exponential backoff, interval, max queue size)
- Footer/statusbalk styling en animatie
- Unit test structuur en mock-patronen
- Version counter implementatiedetails (field naam, initiele waarde)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.49.x (installed), 2.102.1 (latest) | Supabase client | Already in use for din_sessions table |
| vitest | 4.1.x | Unit testing | Already configured with path aliases |
| React 19.1 | 19.1.x | UI components | Existing stack |

### No Additional Libraries Needed

The retry mechanism, sync status, and version counter are all implementable with existing dependencies. No new packages required.

**Rationale:**
- Retry with exponential backoff: ~20 lines of utility code, no library needed
- Sync status: React state + context, already have Toast system
- Version counter: Simple integer field on DINSession

## Architecture Patterns

### Current Architecture (what exists)

```
session-context.tsx
  updateSession() -> saveLocal() -> saveSessionToSupabase() [fire-and-forget]
  loadSession()   -> loadLocal() -> loadSessionFromSupabase() [compare updatedAt]

persistence.ts
  saveLocal() / loadLocal()          -- sync, reliable
  saveSessionToSupabase()            -- async, no retry, errors silently logged
  loadSessionFromSupabase()          -- async, returns null on error
  dualSave() / dualLoad()           -- unused generics (D-13: remove)

page.tsx (homepage)
  handleCreate() -> saveLocal + saveSessionToSupabase [fire-and-forget]
  handleDelete() -> removeLocal + deleteSessionFromSupabase [fire-and-forget]
```

### Target Architecture

```
persistence.ts (refactored)
  saveLocal() / loadLocal()                    -- unchanged
  saveSessionToSupabase()                      -- now with retry (max 3x, exponential backoff)
  saveSessionToSupabaseWithRetry()             -- internal: await + retry wrapper
  loadSessionFromSupabase()                    -- unchanged (read path, no retry needed)
  getSupabaseAvailable()                       -- check if env vars present (D-12)
  checkSupabaseHealth()                        -- ping for health-check (D-10)
  getRemoteVersion()                           -- fetch version field for optimistic lock (D-08)
  [REMOVED: dualSave, dualLoad]               -- D-13

sync-status-context.tsx (new)
  SyncStatusProvider                           -- wraps app, tracks sync state
  useSyncStatus()                              -- hook: { status, lastSyncTime, retryCount, isOffline }
  status: 'synced' | 'syncing' | 'error' | 'offline'

session-context.tsx (modified)
  updateSession()                              -- awaits saveSessionToSupabase, updates sync status
  loadSession()                                -- unchanged conflict resolution (D-04 already works)

SyncStatusFooter.tsx (new component)
  Fixed footer bar with colored badge (D-01, D-02)
  Green/Orange/Red dot with label

HealthCheck.tsx (new component, homepage)
  Supabase reachable, session count, last sync time (D-10)
```

### Pattern 1: Retry with Exponential Backoff
**What:** Wrap Supabase save in retry loop with increasing delays
**When to use:** Every Supabase write operation
**Example:**
```typescript
// persistence.ts
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 500
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, attempt); // 500, 1000, 2000ms
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unreachable");
}
```

### Pattern 2: Sync Status via React Context
**What:** Dedicated context to track Supabase sync state, separate from session context
**When to use:** Footer badge reads this, session-context writes to it
**Example:**
```typescript
// sync-status-context.tsx
type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

interface SyncState {
  status: SyncStatus;
  lastSyncTime: Date | null;
  pendingCount: number;
  isOfflineMode: boolean;  // env vars missing (D-12)
}
```

### Pattern 3: Version Counter for Optimistic Locking
**What:** Increment version on every save, check remote version before write
**When to use:** Every Supabase upsert
**Example:**
```typescript
// In DINSessionSchema, add:
version: z.number().optional().default(1),

// In saveSessionToSupabase:
// 1. Read remote version
// 2. If remote.version > local.version, remote is newer (D-04: newest wins)
// 3. If remote.version <= local.version, safe to write with version + 1
```

### Pattern 4: Graceful Degradation (D-12)
**What:** Check env vars at module load, export `isSupabaseConfigured` boolean
**When to use:** Guard all Supabase calls
**Example:**
```typescript
// supabase.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
```

### Anti-Patterns to Avoid
- **Fire-and-forget saves without status tracking:** Current pattern. Replace with awaited saves that report status.
- **Retry inside React state updater:** Never put async retry logic inside `setSession()` callback. Do the retry after the state update returns.
- **Blocking UI on Supabase:** localStorage write is the fast path. Supabase retry happens in background, only badge changes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Complex offline-first sync | PouchDB/CouchDB replication | Simple retry queue in localStorage | D-05 single-device, D-07 JSON blob = too simple for a sync framework |
| Real-time conflict resolution | CRDT/OT algorithms | Newest-wins timestamp (D-04) | Single device per session, no concurrent edits |
| Persistent queue library | Custom IndexedDB queue | localStorage array of pending saves | Queue is small (max session at a time), localStorage is sufficient |

**Key insight:** This is NOT an offline-first sync problem. It is a "make sure async backup reaches the server" problem. The simplest reliable solution is: retry with backoff, queue in localStorage for page refresh survival, drain queue on reconnect.

## Common Pitfalls

### Pitfall 1: Race Condition Between updateSession Calls
**What goes wrong:** Multiple rapid `updateSession` calls each trigger a Supabase save. Later saves may arrive before earlier ones, writing stale data.
**Why it happens:** `updateSession` uses functional updater for localStorage (correct), but Supabase saves are async and can reorder.
**How to avoid:** Only save the latest version. Use a debounce or "latest wins" pattern: assign a save sequence number, check it before writing.
**Warning signs:** Supabase data appears to "revert" after rapid edits.

### Pitfall 2: Supabase Client Crashes When Env Vars Missing
**What goes wrong:** `createClient(undefined!, undefined!)` throws at import time, breaking the entire app.
**Why it happens:** Current `supabase.ts` uses `!` non-null assertion on env vars.
**How to avoid:** Guard with `isSupabaseConfigured` check (D-12). Create client only if vars present.
**Warning signs:** App white-screens in development without `.env.local`.

### Pitfall 3: Version Counter Desync After Failed Save
**What goes wrong:** Local version is incremented but Supabase save fails. Next save has a gap in version numbers.
**Why it happens:** Incrementing version before confirming write success.
**How to avoid:** Increment version in the Supabase payload only, not in localStorage. On successful save, update local version to match. On failure, local version stays the same.
**Warning signs:** `version` in localStorage differs from Supabase.

### Pitfall 4: Retry Queue Grows Unbounded During Extended Outage
**What goes wrong:** User makes many edits while offline. Queue grows to hundreds of entries, each containing a full session JSON blob.
**Why it happens:** Every `updateSession` call adds to queue.
**How to avoid:** Queue should only contain the LATEST session state per session ID. New saves for the same session ID replace the previous queued entry. Max queue size = number of open sessions (typically 1).
**Warning signs:** localStorage quota exceeded.

### Pitfall 5: Footer Component Outside SessionProvider
**What goes wrong:** SyncStatusFooter renders on homepage where there's no SessionProvider.
**Why it happens:** Homepage (`page.tsx`) doesn't wrap in SessionProvider, only `sessies/[id]/page.tsx` does.
**How to avoid:** SyncStatusProvider should be in `ClientProviders` (layout-level), not inside SessionProvider. Sync status is app-wide. Health-check on homepage is a separate component reading Supabase directly.
**Warning signs:** "useSyncStatus must be used within provider" error on homepage.

### Pitfall 6: queueMicrotask Side Effects Lost on Retry
**What goes wrong:** Current pattern uses `queueMicrotask` for toast/sync side effects inside `setSession`. If retry logic is also in queueMicrotask, ordering becomes unpredictable.
**Why it happens:** Multiple microtasks compete.
**How to avoid:** Keep localStorage save synchronous in setSession. Move all Supabase retry to a separate async function called AFTER setSession completes. Use a ref to hold the latest session for the async path.

## Code Examples

### Retry Utility (recommended implementation)
```typescript
// persistence.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; label?: string } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 500, label = 'operation' } = options;
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.error(`[persistence] ${label} poging ${attempt + 1} mislukt, retry in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}
```

### Sync Status Context
```typescript
// sync-status-context.tsx
"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

interface SyncStatusValue {
  status: SyncStatus;
  lastSyncTime: Date | null;
  pendingCount: number;
  setSyncing: () => void;
  setSynced: () => void;
  setError: () => void;
}

const SyncStatusContext = createContext<SyncStatusValue | null>(null);

export function useSyncStatus() {
  const ctx = useContext(SyncStatusContext);
  if (!ctx) throw new Error("useSyncStatus moet binnen SyncStatusProvider gebruikt worden");
  return ctx;
}
```

### Footer Badge Component
```typescript
// components/ui/SyncStatusFooter.tsx
"use client";

import { useSyncStatus } from "@/lib/sync-status-context";

const STATUS_CONFIG = {
  synced:  { color: "bg-green-500", label: "Gesynct" },
  syncing: { color: "bg-orange-400 animate-pulse", label: "Synchroniseren..." },
  error:   { color: "bg-red-500", label: "Sync mislukt" },
  offline: { color: "bg-gray-400", label: "Offline modus" },
} as const;

export function SyncStatusFooter() {
  const { status, lastSyncTime } = useSyncStatus();
  const config = STATUS_CONFIG[status];
  
  return (
    <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-cito-border px-4 py-2 flex items-center gap-2 text-xs text-gray-500 z-50">
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      <span>{config.label}</span>
      {lastSyncTime && (
        <span className="ml-auto">
          Laatste sync: {lastSyncTime.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </footer>
  );
}
```

### Graceful Degradation in supabase.ts
```typescript
// supabase.ts (refactored)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
```

### Version Counter Integration
```typescript
// In persistence.ts saveSessionToSupabase:
export async function saveSessionToSupabase(session: DINSession): Promise<boolean> {
  if (!supabase) return false; // D-12 graceful degradation
  
  return withRetry(async () => {
    // Check remote version for optimistic locking (D-08)
    const { data: remote } = await supabase
      .from("din_sessions")
      .select("data")
      .eq("id", session.id)
      .single();
    
    const remoteVersion = (remote?.data as DINSession | null)?.version ?? 0;
    const localVersion = session.version ?? 0;
    
    // Newest wins (D-04): if remote is newer, don't overwrite
    if (remoteVersion > localVersion) {
      console.warn("[persistence] Remote versie is nieuwer, skip write");
      return false;
    }
    
    const nextVersion = Math.max(remoteVersion, localVersion) + 1;
    const sessionWithVersion = { ...session, version: nextVersion };
    
    const { error } = await supabase
      .from("din_sessions")
      .upsert({
        id: session.id,
        name: session.name,
        data: sessionWithVersion,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    
    if (error) throw error;
    return true;
  }, { maxRetries: 3, label: "saveSession" });
}
```

## State of the Art

| Old Approach (current) | New Approach (Phase 16) | Impact |
|------------------------|------------------------|--------|
| Fire-and-forget Supabase saves | Awaited with 3x retry + exponential backoff | Guaranteed delivery (D-11) |
| Silent error logging | Sync status badge in footer | User sees sync state (D-01) |
| No version tracking | Version counter per session | Optimistic locking (D-08) |
| `createClient(url!, key!)` crashes if missing | Graceful null check | Offline-only mode (D-12) |
| dualSave/dualLoad generics | Removed, replaced by specific retry functions | Cleaner API (D-13) |
| Session list only in localStorage | Session list also in Supabase | Recovery from localStorage loss (D-06) |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.x |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/lib/__tests__/persistence.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-11 | saveSessionToSupabase retries 3x on failure | unit | `npx vitest run src/lib/__tests__/persistence.test.ts -t "retry"` | Extend existing |
| D-11 | Exponential backoff delays | unit | same file | Extend existing |
| D-08 | Version counter increments on save | unit | same file | Extend existing |
| D-08 | Remote newer version blocks write | unit | same file | Extend existing |
| D-12 | Graceful degradation without env vars | unit | `npx vitest run src/lib/__tests__/persistence.test.ts -t "offline"` | Extend existing |
| D-13 | dualSave/dualLoad removed | unit | Existing tests updated (remove dualSave tests) | Update existing |
| D-01/D-02 | SyncStatusFooter renders correct badge | manual | Visual check | N/A |
| D-10 | Health-check shows Supabase status | manual | Visual check | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/persistence.test.ts`
- **Per wave merge:** `npx vitest run && npm run build`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Extend `src/lib/__tests__/persistence.test.ts` with Supabase mock for retry tests
- [ ] Add `withRetry` unit tests (success, failure after N, backoff timing)
- [ ] Add version counter tests (increment, remote-newer-blocks)
- [ ] Add graceful degradation tests (supabase=null path)
- [ ] Update existing `dualSave` tests to reflect removal (D-13)

## Existing Code Analysis

### Files to Modify
| File | Changes | Risk |
|------|---------|------|
| `src/lib/supabase.ts` | Conditional client creation (D-12) | LOW — 7 lines, simple guard |
| `src/lib/persistence.ts` | Add retry, remove dualSave/dualLoad, version counter logic | MEDIUM — core persistence, thorough testing needed |
| `src/lib/schemas.ts` | Add `version` field to DINSessionSchema | LOW — optional field with default |
| `src/lib/session-context.tsx` | Await Supabase saves, integrate sync status | MEDIUM — central state management |
| `src/app/page.tsx` | Add health-check in footer, await Supabase calls | LOW — UI addition |
| `src/app/sessies/[id]/page.tsx` | Add SyncStatusFooter | LOW — UI addition |
| `src/components/ui/ClientProviders.tsx` | Add SyncStatusProvider | LOW — wrapper addition |

### Files to Create
| File | Purpose |
|------|---------|
| `src/lib/sync-status-context.tsx` | Sync status state management |
| `src/components/ui/SyncStatusFooter.tsx` | Footer badge component (D-01, D-02) |
| `src/components/ui/HealthCheck.tsx` | Homepage health-check (D-10) |

### Files to Clean Up
| In File | Remove | Reason |
|---------|--------|--------|
| `persistence.ts` | `dualSave()` function | D-13: unused generic |
| `persistence.ts` | `dualLoad()` function | D-13: unused generic |
| `persistence.test.ts` | `dualSave` test describe block | D-13: tests for removed code |

### Callers of dualSave/dualLoad (verify no usage)
Grep confirms `dualSave` and `dualLoad` are only imported in `persistence.test.ts`. No production code uses them. Safe to remove.

## Open Questions

1. **Retry queue persistence across page refresh (from CONTEXT specifics)**
   - What we know: User wants retry queue in localStorage so pending saves survive page refresh during Supabase outage
   - What's unclear: Whether a separate queue is needed or just re-saving current session on load is sufficient
   - Recommendation: Since we always save the LATEST full session (not incremental diffs), and `loadSession` already syncs to Supabase on load, a separate persistent queue is unnecessary. On page load, if localStorage has data and Supabase doesn't match, the existing `loadSession` flow will sync. Add an explicit "drain pending" check on app startup.

2. **Version counter in Supabase column vs JSON blob**
   - What we know: D-07 says keep JSON blob. D-08 says add version counter.
   - Recommendation: Store `version` inside the JSON blob (as `session.version` field) AND as a top-level column on `din_sessions` for efficient querying. This means adding a `version INTEGER DEFAULT 1` column to the Supabase table. The column allows checking version without downloading the full JSON.

3. **Session page bottom padding with fixed footer**
   - What we know: New footer is fixed at bottom (D-02). Content may be hidden behind it.
   - Recommendation: Add `pb-12` to the main content wrapper in `sessies/[id]/page.tsx` and homepage.

## Sources

### Primary (HIGH confidence)
- `src/lib/persistence.ts` — Current implementation, all Supabase CRUD functions
- `src/lib/session-context.tsx` — All save/load call sites, fire-and-forget pattern
- `src/lib/supabase.ts` — Current client creation with non-null assertion
- `src/lib/schemas.ts` line 496-525 — DINSessionSchema (no version field yet)
- `src/lib/__tests__/persistence.test.ts` — Existing test patterns with localStorage mock
- `vitest.config.ts` — Test configuration with path aliases

### Secondary (MEDIUM confidence)
- @supabase/supabase-js 2.102.1 (npm registry) — Latest version, though project uses 2.49.x. No breaking changes for upsert/select API.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new packages needed, everything is already installed
- Architecture: HIGH - Existing patterns are clear, changes are well-scoped
- Pitfalls: HIGH - Based on direct code analysis of current implementation

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable domain, no fast-moving dependencies)
