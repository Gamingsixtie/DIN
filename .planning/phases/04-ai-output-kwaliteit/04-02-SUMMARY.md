---
phase: 04-ai-output-kwaliteit
plan: 02
subsystem: AI validation + UI feedback
tags: [din-validation, vergrotende-trap, werkwoord-check, corrections-badge, post-validation]
dependency_graph:
  requires:
    - phase: 04-01
      provides: KiB context injection, assembleSystemPrompt, callClaudeWithValidation pipeline
    - phase: 01
      provides: Zod schemas for AIBenefit, AICapability, AIEffort
  provides:
    - Pure DIN-methodiek validation module (validateBaat, validateVermogen, validateInspanning)
    - Post-validation pipeline in din-mapping and din-suggest API routes
    - Corrections state management in DINMappingStep
    - Client-side validation on manual title edits (D-02)
    - Inline correctie-badges on all card components
  affects: [din-mapping, din-suggest, benefit-card, capability-card, effort-card]
tech_stack:
  added: []
  patterns: [ValidationResult/ValidationCorrection types, post-validation pipeline, corrections state maps keyed by item ID, badge dismiss pattern]
key_files:
  created:
    - src/lib/din-validation.ts
    - src/lib/__tests__/din-validation.test.ts
  modified:
    - src/app/api/din-mapping/route.ts
    - src/app/api/din-suggest/route.ts
    - src/components/din/BenefitCard.tsx
    - src/components/din/CapabilityCard.tsx
    - src/components/din/EffortCard.tsx
    - src/components/steps/DINMappingStep.tsx
key_decisions:
  - "Curated word list for vergrotende trap instead of generic -er/-ere suffix matching (Pitfall 4 avoidance)"
  - "Corrections keyed by item ID in state maps for direct lookup when passing to card components"
  - "Client-side validation only triggers on title changes to keep UI responsive"
  - "Badge dismiss state is component-local (transient), not persisted — resets when corrections change"
patterns_established:
  - "ValidationResult<T> generic pattern: item + passed + corrections + warnings"
  - "Post-validation pipeline: Zod (structural) then din-validation (semantic)"
  - "Corrections state map pattern: Record<string, ValidationCorrection[]> keyed by entity ID"
  - "Badge dismiss with useEffect reset on corrections change"
requirements_completed: [AI-04]
metrics:
  duration: 18min
  completed: 2026-04-01
  tasks: 2
  files: 8
---

# Phase 04 Plan 02: DIN-methodiek Validation Module Summary

**Pure DIN-methodiek validatiefuncties met vergrotende trap auto-correctie, werkwoord-checks, post-validation pipeline in API routes, en inline correctie-badges op kaarten**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-01T21:23:14Z
- **Completed:** 2026-04-01T21:40:52Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Pure validation module with per-type validators (validateBaat, validateVermogen, validateInspanning) and 20 passing tests
- Post-validation integrated into din-mapping and din-suggest API routes, returning corrections parallel to items
- DINMappingStep stores corrections from API response in state maps and runs client-side validation on manual title changes (D-02)
- All three card components (BenefitCard, CapabilityCard, EffortCard) show inline amber correctie-badges that dismiss on click

## Task Commits

Each task was committed atomically:

1. **Task 1: DIN-methodiek validatiemodule met tests** - `52184f6` (test: RED phase), `77f5967` (feat: GREEN phase + implementation)
2. **Task 2: Post-validatie in API pipeline + corrections wiring + correctie-badges** - `57a39a5` (feat)

## Files Created/Modified
- `src/lib/din-validation.ts` - Pure validation module: ValidationResult/ValidationCorrection types, ACTION_VERBS_BLACKLIST, VERGROTENDE_TRAP_PATTERNS, validateBaat/validateVermogen/validateInspanning
- `src/lib/__tests__/din-validation.test.ts` - 20 test cases covering all validation rules per DIN type
- `src/app/api/din-mapping/route.ts` - Post-validation after callClaudeWithValidation, corrections object in response
- `src/app/api/din-suggest/route.ts` - Post-validation in both create and suggest modes
- `src/components/steps/DINMappingStep.tsx` - Corrections state maps, API response processing, client-side validation on title changes
- `src/components/din/BenefitCard.tsx` - corrections prop, badgeDismissed state, inline badge render
- `src/components/din/CapabilityCard.tsx` - corrections prop, badgeDismissed state, inline badge render
- `src/components/din/EffortCard.tsx` - corrections prop, badgeDismissed state, inline badge render

## Decisions Made
- Used curated word list for vergrotende trap detection instead of generic -er/-ere suffix matching (prevents false positives per Pitfall 4 from research)
- Corrections in API response keyed by type (benefits/capabilities/efforts) with arrays parallel to items, enabling index-based mapping to item IDs in the client
- Client-side validation only on title field changes (not every keystroke of description/profile fields) to keep UI responsive
- Badge dismiss is component-local state that resets via useEffect when corrections prop changes, avoiding stale dismiss state
- Type cast `{ ...updated, title: updated.title || "" }` used in DINMappingStep to handle optional title field in DINBenefit/Capability/Effort types

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed type incompatibility between DIN entity types and validator signature**
- **Found during:** Task 2 (build verification)
- **Issue:** DINBenefit/DINCapability/DINEffort have `title?: string` (optional) but validators require `title: string`
- **Fix:** Used `{ ...updated, title: updated.title || "" }` in DINMappingStep update handlers; used `as { title: string; [key: string]: unknown }` in din-suggest route
- **Files modified:** src/components/steps/DINMappingStep.tsx, src/app/api/din-suggest/route.ts
- **Verification:** npm run build succeeds
- **Committed in:** 57a39a5

**2. [Rule 1 - Bug] Removed explicit type annotations on map callbacks in din-mapping route**
- **Found during:** Task 2 (build verification)
- **Issue:** `Record<string, unknown>` annotation on map callbacks conflicted with Zod-inferred types that include `title: string`
- **Fix:** Let TypeScript infer types from the validated data
- **Files modified:** src/app/api/din-mapping/route.ts
- **Verification:** npm run build succeeds
- **Committed in:** 57a39a5

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for TypeScript compilation. No scope creep.

## Issues Encountered
None beyond the type issues documented above.

## Known Stubs
None -- all functionality is fully wired.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DIN-methodiek validation complete: all AI-generated and manually edited items can be validated
- Corrections are surfaced via inline badges on cards
- Phase 04 (ai-output-kwaliteit) is now complete with both plans done
- Ready for Phase 05 or subsequent phases

## Self-Check: PASSED

- All 8 files exist on disk
- Commit 52184f6 found in git log
- Commit 77f5967 found in git log
- Commit 57a39a5 found in git log

---
*Phase: 04-ai-output-kwaliteit*
*Completed: 2026-04-01*
