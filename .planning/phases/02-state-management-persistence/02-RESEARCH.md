# Phase 2: State Management & Persistence - Research

**Researched:** 2026-03-31
**Domain:** React Context state management, localStorage persistence, race condition prevention
**Confidence:** HIGH

## Summary

Phase 2 addresses a well-understood class of bugs in React Context: stale closure references in `updateSession`. The current implementation captures `session` in a `useCallback` dependency, meaning two rapid calls to `updateSession` will both read the same stale snapshot -- the second call overwrites the first. The fix is a textbook React pattern: replace the `Partial<DINSession>` merge API with a functional updater callback `(prev: DINSession) => Partial<DINSession>` that reads from `setSession`'s latest state.

The scope is precisely bounded: 1 context file (`session-context.tsx`), 1 persistence file (`persistence.ts`), 1 new toast component, and 34 `updateSession` callsites across 5 step components. There are no external dependencies, no new libraries needed, and no architectural changes beyond the API signature shift.

**Primary recommendation:** Migrate `updateSession` to a functional updater API, remove the empty-array guard in `saveLocal`, add boolean return for save feedback, and build a minimal toast system for error reporting. All using existing stack (React Context + localStorage).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** React Context behouden -- geen migratie naar externe state library (Zustand/Jotai). Minimale wijziging, lost het kernprobleem op.
- **D-02:** `updateSession` wordt omgebouwd naar functionele callback API: `updateSession(prev => ({ benefits: [...prev.benefits, newBenefit] }))`. Alle 30+ callsites worden gemigreerd.
- **D-03:** `setCurrentStep` krijgt dezelfde functionele updater-fix -- consistent patroon door de hele context.
- **D-04:** De oude `updateSession(Partial<DINSession>)` API verdwijnt volledig -- alleen de callback-variant blijft.
- **D-05:** De lege-array guard in `saveLocal` wordt volledig verwijderd. Lege arrays zijn valide data (bijv. alle baten verwijderd van een doel).
- **D-06:** Een lege session_list is gewoon "geen sessies" -- homepage toont dan het aanmaakscherm.
- **D-07:** Generiek toast-systeem opzetten: `ToastProvider` + `useToast()` hook, herbruikbaar voor alle meldingen in de app (ook AI-fouten in latere fases).
- **D-08:** `saveLocal` retourneert `boolean` (true/false) in plaats van void. Persistence-laag blijft puur, UI-logica zit in de context.
- **D-09:** `updateSession` controleert de return-waarde van saveLocal en triggert een toast bij falen: "Opslaan mislukt -- ruim browsergegevens op of exporteer je sessie."
- **D-10:** Laatste save wint -- geen extra transactie/rollback mechanisme. Met functionele updaters is elke save een volledig sessie-object. Acceptabel risico voor single-user app.
- **D-11:** Subtiele "Opgeslagen [tijdstip]" indicator in de sessie-header, vergelijkbaar met Google Docs. Geeft vertrouwen zonder ruimte in te nemen.

### Claude's Discretion
- Exacte implementatie van het toast-systeem (animaties, positionering, auto-dismiss timing)
- Hoe de "Opgeslagen" indicator precies wordt gepositioneerd in de bestaande header
- Volgorde van migratie van de 30+ callsites (welke components eerst)
- Of saveLocal intern nog logging doet naast de boolean return

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-03 | Session state management gebruikt functionele updaters -- geen race conditions bij gelijktijdige operaties | Functional updater pattern in `updateSession` (D-02/D-04), `setCurrentStep` fix (D-03), complete callsite migration across 5 files |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.0 | State management via Context + useState | Already in project; functional updaters are built-in |
| TypeScript | 5.8.0 | Type safety for the new callback API | Already in project |
| Tailwind CSS | 4.1.0 | Toast and indicator styling | Already in project |

### Supporting
No new dependencies needed. This phase uses only existing project infrastructure.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Context | Zustand | Better API, but D-01 locks React Context -- migration not justified for this scope |
| Custom toast | react-hot-toast / sonner | Extra dependency; D-07 specifies custom system for full control and reusability |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Changes
```
src/
├── lib/
│   ├── session-context.tsx    # MODIFY: functional updater API
│   └── persistence.ts         # MODIFY: boolean return, remove empty guard
├── components/
│   └── ui/
│       └── Toast.tsx           # NEW: ToastProvider + useToast hook
└── app/
    └── sessies/[id]/page.tsx  # MODIFY: add ToastProvider, "Opgeslagen" indicator
```

### Pattern 1: Functional Updater for updateSession

**What:** Replace `updateSession(updates: Partial<DINSession>)` with `updateSession(updater: (prev: DINSession) => Partial<DINSession>)`

**When to use:** Always -- the old API is removed entirely (D-04).

**Why this fixes the race condition:** The current bug occurs because `updateSession` is wrapped in `useCallback([session])`. When a component calls `updateSession` twice in rapid succession (e.g., adding a benefit then a mapping in the same handler), both calls read the same `session` closure value. The second call's spread `{ ...session, ...updates }` overwrites the first call's changes. With the functional updater, `setSession(prev => ...)` always reads the latest queued state from React's internal state queue.

**Current code (broken):**
```typescript
// session-context.tsx
const updateSession = useCallback(
  (updates: Partial<DINSession>) => {
    if (!session) return;
    // BUG: `session` is stale if called twice before re-render
    const updated = { ...session, ...updates, updatedAt: new Date().toISOString() };
    setSession(updated);
    saveLocal(`session_${session.id}`, updated);
  },
  [session]  // <-- this is the problem
);
```

**New code (fixed):**
```typescript
// session-context.tsx
const updateSession = useCallback(
  (updater: (prev: DINSession) => Partial<DINSession>) => {
    setSession(prev => {
      if (!prev) return prev;
      const updates = updater(prev);
      const updated = { ...prev, ...updates, updatedAt: new Date().toISOString() };
      const saved = saveLocal(`session_${prev.id}`, updated);
      if (!saved) {
        // Trigger toast via ref or callback (not state -- we're in a setter)
        queueMicrotask(() => showToast("Opslaan mislukt -- ruim browsergegevens op of exporteer je sessie.", "error"));
      } else {
        queueMicrotask(() => setLastSaved(new Date()));
      }
      return updated;
    });
  },
  []  // <-- no dependencies! session is always read via `prev`
);
```

**Key insight:** The `useCallback` dependency array becomes `[]` because we never reference `session` directly -- we read it via `setSession`'s functional form. This eliminates stale closures entirely.

### Pattern 2: Toast Error Notification via queueMicrotask

**What:** Inside `setSession`'s updater function, we cannot call `setState` on another piece of state (React batching rules). Use `queueMicrotask` to schedule the toast outside the state update.

**When to use:** When persistence fails inside `updateSession`.

**Example:**
```typescript
// Inside setSession updater:
if (!saved) {
  queueMicrotask(() => addToast({
    message: "Opslaan mislukt -- ruim browsergegevens op of exporteer je sessie.",
    type: "error",
    duration: 5000,
  }));
}
```

**Alternative:** Use a `useRef` to store the toast function and call it from a `useEffect` that watches a save-failure counter. Both approaches work; `queueMicrotask` is simpler.

### Pattern 3: Callsite Migration

**What:** Convert all 34 `updateSession({...})` calls to `updateSession(prev => ({...}))`.

**Mechanical transformation:**

| Before | After |
|--------|-------|
| `updateSession({ benefits: [...session!.benefits, newBenefit] })` | `updateSession(prev => ({ benefits: [...prev.benefits, newBenefit] }))` |
| `updateSession({ efforts: session!.efforts.map(e => e.id === id ? updated : e) })` | `updateSession(prev => ({ efforts: prev.efforts.map(e => e.id === id ? updated : e) }))` |
| `updateSession({ sectorAnalyses: cleaned })` | `updateSession(prev => ({ sectorAnalyses: cleaned }))` |

**Key rule:** Replace every `session!.` reference inside `updateSession` arguments with `prev.`. When the value does not depend on previous state (e.g., `{ crossAnalyse: JSON.stringify(result) }`), the callback simply ignores `prev` but still uses the callback form for API consistency.

### Pattern 4: setCurrentStep Fix

**What:** Apply the same functional updater pattern to `setCurrentStep`.

**Current code:**
```typescript
const setCurrentStep = useCallback(
  (step: AppStep) => {
    setCurrentStepState(step);
    if (session) {  // <-- stale closure
      const stepIndex = APP_STEPS.findIndex(s => s.key === step);
      const updated = { ...session, currentStep: stepIndex >= 0 ? stepIndex : 0, updatedAt: new Date().toISOString() };
      setSession(updated);
      saveLocal(`session_${session.id}`, updated);
    }
  },
  [session]
);
```

**Fixed code:**
```typescript
const setCurrentStep = useCallback(
  (step: AppStep) => {
    setCurrentStepState(step);
    setSession(prev => {
      if (!prev) return prev;
      const stepIndex = APP_STEPS.findIndex(s => s.key === step);
      const updated = { ...prev, currentStep: stepIndex >= 0 ? stepIndex : 0, updatedAt: new Date().toISOString() };
      saveLocal(`session_${prev.id}`, updated);
      return updated;
    });
  },
  []  // no dependency on session
);
```

### Anti-Patterns to Avoid
- **Calling setState inside setSession updater:** React may throw or behave unexpectedly. Use `queueMicrotask` or `useEffect` for side effects triggered by state updates.
- **Partial migration:** Leaving some callsites on the old API creates a mixed-mode codebase. D-04 requires the old API to be fully removed -- TypeScript will enforce this via the new type signature.
- **Reading `session` outside callback for updateSession args:** After migration, no step component should reference `session!.benefits` (etc.) inside an `updateSession` call. The `prev` parameter is the only source.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State management library | Custom state store | React Context (already in place) | D-01 locks this. Context is sufficient for single-user app |
| Toast notifications | Inline error divs per component | Centralized `ToastProvider` + `useToast()` | D-07 requires reusable system for future phases too |
| Save conflict resolution | Optimistic locking / CRDT | Last-write-wins (D-10) | Single-user app; functional updaters prevent the actual race condition |

**Key insight:** The race condition is not a concurrency problem (there is no server or multi-user); it is a stale closure problem. Functional updaters solve it completely within React's existing model. No external state management needed.

## Common Pitfalls

### Pitfall 1: Calling addToast inside setSession updater
**What goes wrong:** Setting React state inside a `setState` updater function can cause unpredictable batching behavior or warnings.
**Why it happens:** `updateSession` calls `setSession(prev => { ... })` and the developer wants to show a toast inside that callback.
**How to avoid:** Use `queueMicrotask(() => addToast(...))` to schedule the toast call after the current state update completes. Alternatively, use a `useRef` to store a failure flag and react to it in a `useEffect`.
**Warning signs:** "Cannot update a component while rendering a different component" warning in console.

### Pitfall 2: Forgetting to migrate all `session!.` references
**What goes wrong:** A callsite passes `session!.benefits` to `updateSession(prev => ({ benefits: [...session!.benefits, x] }))` -- using the outer `session` instead of `prev`. This reintroduces the exact race condition we are fixing.
**Why it happens:** Mechanical search-and-replace that only wraps in a callback but does not change the data source inside.
**How to avoid:** Search for `session!.` inside all `updateSession(prev =>` calls after migration. There should be zero matches. TypeScript cannot catch this because both `session` and `prev` have the same type.
**Warning signs:** `grep -n "session!" src/components/steps/*.tsx` showing hits inside `updateSession` callbacks.

### Pitfall 3: Empty array guard in saveLocal blocking valid deletions
**What goes wrong:** User deletes all benefits from a goal. `saveLocal` refuses to persist because the benefits array is now empty. On reload, the old (non-empty) data reappears.
**Why it happens:** The current `saveLocal` has `if (Array.isArray(data) && data.length === 0) return;` -- this was a KiB-era safety net that is now harmful.
**How to avoid:** D-05 removes this guard entirely. The full `DINSession` object is always saved (not individual arrays), so an empty array within the session is valid state.
**Warning signs:** Data "coming back" after deletion and page reload.

### Pitfall 4: Homepage `saveLocal("session_list", ...)` with empty array
**What goes wrong:** After removing the empty-array guard, deleting the last session tries to save `[]` to `session_list`. The current homepage code has a workaround (`__placeholder__`) that should be cleaned up.
**Why it happens:** The old guard prevented saving `[]`, so a placeholder hack was needed.
**How to avoid:** With the guard removed, save `[]` directly. The homepage already checks for empty list and shows the creation screen (D-06). Remove the `__placeholder__` hack.
**Warning signs:** `__placeholder__` string appearing in session list after migration.

### Pitfall 5: Toast context not available in layout
**What goes wrong:** `useToast()` called in a component that is not wrapped by `ToastProvider`.
**Why it happens:** `ToastProvider` is placed inside `SessionProvider` which only wraps `/sessies/[id]` pages, but the homepage may also need toasts.
**How to avoid:** Place `ToastProvider` in `RootLayout` (`src/app/layout.tsx`) so it wraps the entire app. `SessionProvider` remains scoped to session pages.
**Warning signs:** "useToast must be used within ToastProvider" error on homepage.

### Pitfall 6: saveLocal returning boolean changes dualSave contract
**What goes wrong:** `dualSave` calls `saveLocal` and does not check the return value. After D-08, `saveLocal` returns boolean but `dualSave` ignores it.
**Why it happens:** `dualSave` was written when `saveLocal` returned void.
**How to avoid:** Update `dualSave` to propagate the boolean return. Not blocking for this phase (dualSave is not actively used), but should be consistent.
**Warning signs:** Silent save failures when using the dual persistence path.

## Code Examples

### Example 1: New updateSession Implementation
```typescript
// src/lib/session-context.tsx
interface SessionContextValue {
  session: DINSession | null;
  currentStep: AppStep;
  lastSaved: Date | null;
  setCurrentStep: (step: AppStep) => void;
  loadSession: (id: string) => void;
  createSession: (name: string) => DINSession;
  updateSession: (updater: (prev: DINSession) => Partial<DINSession>) => void;
}
```

### Example 2: Typical Callsite Migration (addBenefitManual)
```typescript
// BEFORE (DINMappingStep.tsx)
function addBenefitManual() {
  if (!selectedGoal) return;
  const newBenefit = createBenefit(selectedGoal, activeSector, "");
  updateSession({
    benefits: [...session!.benefits, newBenefit],
    goalBenefitMaps: [
      ...session!.goalBenefitMaps,
      { goalId: selectedGoal, benefitId: newBenefit.id },
    ],
  });
}

// AFTER
function addBenefitManual() {
  if (!selectedGoal) return;
  const newBenefit = createBenefit(selectedGoal, activeSector, "");
  updateSession(prev => ({
    benefits: [...prev.benefits, newBenefit],
    goalBenefitMaps: [
      ...prev.goalBenefitMaps,
      { goalId: selectedGoal, benefitId: newBenefit.id },
    ],
  }));
}
```

### Example 3: Toast System
```typescript
// src/components/ui/Toast.tsx
"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  addToast: (message: string, type?: Toast["type"], duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast moet binnen ToastProvider gebruikt worden");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast["type"] = "info", duration = 5000) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container - fixed position bottom-right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-in ${
              toast.type === "error" ? "bg-red-600 text-white" :
              toast.type === "success" ? "bg-green-600 text-white" :
              "bg-gray-800 text-white"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
```

### Example 4: saveLocal Boolean Return
```typescript
// src/lib/persistence.ts
export function saveLocal<T>(key: string, data: T): boolean {
  if (typeof window === "undefined") return false;
  if (data === null || data === undefined) return false;
  // D-05: empty array guard REMOVED -- empty arrays are valid state
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error(`[persistence] localStorage write failed for ${key}:`, e);
    return false;
  }
}
```

### Example 5: "Opgeslagen" Indicator
```typescript
// Inside SessionFlow component (sessies/[id]/page.tsx header)
<div className="flex items-center gap-4">
  {lastSaved && (
    <span className="text-xs text-blue-200/70">
      Opgeslagen {lastSaved.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
    </span>
  )}
  <span className="text-sm text-blue-200">
    Stap {currentStepIndex + 1} van {APP_STEPS.length}
  </span>
</div>
```

## Callsite Inventory

Complete list of files and call counts that need migration:

| File | Calls | Complexity | Notes |
|------|-------|------------|-------|
| `src/components/steps/DINMappingStep.tsx` | 25 | HIGH | Most complex: CRUD ops, wizard results, link toggles, undo. All use `session!.` spreads |
| `src/components/steps/ImportStep.tsx` | 3 | LOW | Simple property overrides (vision, goals, scope) |
| `src/components/steps/SectorWerkStep.tsx` | 3 | MEDIUM | Nested state updater wrappers (setPlanAnalysis, handleSectorUpload) |
| `src/components/steps/PrioriteringStep.tsx` | 2 | LOW | Array map operations (approval status, quarter update) |
| `src/components/steps/CrossAnalyseStep.tsx` | 1 | LOW | Single call, stores serialized JSON string |
| **Total** | **34** | | |

**Note:** `SectorIntegratieStep.tsx` and `ExportStep.tsx` do NOT use `updateSession` -- no migration needed there.

The homepage (`src/app/page.tsx`) uses `saveLocal`/`loadLocal` directly (not `updateSession`). The D-05 empty-array guard removal affects the homepage's `__placeholder__` workaround for empty session lists.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useCallback([session])` with spread merge | `setSession(prev => ...)` functional updater | React 16+ (always available) | Eliminates stale closure race conditions |
| `saveLocal` returns void | `saveLocal` returns boolean | This phase | Enables error feedback without try/catch in callers |
| Empty-array guard in persistence | Allow all valid state values | This phase | Fixes phantom data resurrection after deletions |

**Deprecated/outdated:**
- The `Partial<DINSession>` signature for `updateSession` is removed entirely (D-04). All callers must use the callback form.

## Open Questions

1. **Toast trigger mechanism inside setSession**
   - What we know: We cannot call `setState` (addToast) inside a `setState` updater (setSession). Options are `queueMicrotask`, `useRef` + `useEffect`, or `setTimeout(fn, 0)`.
   - What's unclear: Which approach feels cleanest in practice.
   - Recommendation: Use `queueMicrotask` -- it runs after the current microtask (state update) completes but before the browser renders. Cleaner than `setTimeout` and simpler than `useRef` + `useEffect`.

2. **Toast placement: RootLayout vs SessionProvider**
   - What we know: D-07 says the toast system should be reusable across the app. Currently only session pages have providers.
   - What's unclear: Whether the homepage will need toasts in this phase.
   - Recommendation: Place `ToastProvider` in `RootLayout` for future-proofing. The overhead is negligible (empty array in state). The homepage already does persistence operations that could fail.

3. **Slide-in animation for toasts**
   - What we know: Tailwind CSS 4 supports arbitrary animations via `@keyframes` in CSS.
   - What's unclear: Exact animation feel desired.
   - Recommendation: Add a simple `animate-slide-in` keyframe in `globals.css`. Fade + slide from right, 200ms ease-out. Keep it subtle per Cito branding.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements --> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-03-a | Functional updater reads latest state (no stale closure) | unit | `npx vitest run src/lib/__tests__/session-context.test.ts -t "functional updater" -x` | No -- Wave 0 |
| DATA-03-b | Two rapid updateSession calls both persist | unit | `npx vitest run src/lib/__tests__/session-context.test.ts -t "rapid updates" -x` | No -- Wave 0 |
| DATA-03-c | saveLocal returns boolean on success/failure | unit | `npx vitest run src/lib/__tests__/persistence.test.ts -t "returns boolean" -x` | No -- Wave 0 |
| DATA-03-d | Empty arrays are saved (guard removed) | unit | `npx vitest run src/lib/__tests__/persistence.test.ts -t "empty array" -x` | No -- Wave 0 |
| DATA-03-e | Session data survives page reload | manual-only | Manual: edit session, reload, verify data | N/A |
| DATA-03-f | Toast appears on save failure | unit | `npx vitest run src/lib/__tests__/session-context.test.ts -t "toast on failure" -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run && npm run build`
- **Phase gate:** Full suite green + `npm run build` success before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/session-context.test.ts` -- covers DATA-03-a, DATA-03-b, DATA-03-f (needs mock for localStorage and React state)
- [ ] `src/lib/__tests__/persistence.test.ts` -- covers DATA-03-c, DATA-03-d (pure function tests, straightforward)

**Note:** Testing React Context hooks requires either `@testing-library/react` or manual mock setup. Since the project does not currently have `@testing-library/react`, the session-context tests should test the pure logic (updater functions) in isolation, or a lightweight `renderHook` setup can be added. The persistence tests are pure functions and need no additional test infrastructure.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** -- direct reading of `session-context.tsx`, `persistence.ts`, all 5 step components, `page.tsx` (session and home)
- **React documentation** -- functional updaters in `useState` are a stable, well-documented feature since React 16
- **CONTEXT.md** -- 11 locked decisions (D-01 through D-11) constraining the implementation

### Secondary (MEDIUM confidence)
- **React 19 batching behavior** -- automatic batching of state updates (introduced in React 18) means multiple `setSession` calls in the same handler are batched, but functional updaters still guarantee sequential reads from latest state

### Tertiary (LOW confidence)
- None -- this phase is entirely within well-understood React patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns are standard React
- Architecture: HIGH -- the functional updater pattern is textbook React; the codebase changes are mechanical
- Pitfalls: HIGH -- identified from direct code analysis; each pitfall maps to specific lines in the current codebase

**Research date:** 2026-03-31
**Valid until:** 2026-06-30 (stable patterns, no moving targets)
