---
phase: 14-lopende-projecten-promoveren-tot-volwaardige-inspanningen-in-din-keten-met-splitsing-en-bevindingen-afleiding
plan: 01
subsystem: schemas
tags: [zod, typescript, tdd, vitest, pure-functions, din-promotion]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Zod as single source of truth, callClaudeWithValidation pattern, .optional() without .default() convention"
  - phase: 12-lopende-projecten-invullen-in-din-netwerk
    provides: "ExternalProject schema, ProjectCapabilityMap mapping, ExterneProjectenPanel infrastructure"
provides:
  - "ProjectPromotieResultSchema family (5 schemas + 5 type exports) for combined-shot promotion AI responses"
  - "ExternalProjectSchema extended with promotedAt + promotedToEffortIds (D-08)"
  - "DINEffortSchema extended with originProjectId for traceback (D-09)"
  - "promoteProjectToEfforts() pure mutation helper — converts project + AI result + user selections into Partial<DINSession>"
  - "undoProjectPromotion() inverse helper with deduped projectCapabilityMap restore"
  - "PromotionSelections interface for review-UI state shape"
  - "31 new passing tests (16 schema extension + 7 result schema + 8 mutation helpers)"
affects: [14-02 AI pipeline, 14-03 UI wave]

# Tech tracking
tech-stack:
  added: []  # No new dependencies
  patterns:
    - "Combined-shot Zod response schema (mirrors AICrossAnalyseSchema nested pattern)"
    - "Pure Partial<DINSession> mutation returned for atomic updateSession(prev => ...) commit"
    - "Cartesian product capability x effort for capabilityEffortMap creation"
    - "Deduped restore via seen-Set pattern in undo helper"

key-files:
  created:
    - "src/lib/__tests__/project-promotion-schema.test.ts"
    - "src/lib/__tests__/project-promotion.test.ts"
  modified:
    - "src/lib/schemas.ts (+67 lines: new schemas + type exports + ExternalProject/DINEffort extensions)"
    - "src/lib/din-service.ts (+227 lines: PromotionSelections + promoteProjectToEfforts + undoProjectPromotion)"
    - "src/lib/__tests__/external-project-schema.test.ts (+61 lines: Tests 11-16 for Phase 14 fields)"

key-decisions:
  - "Use .optional() WITHOUT .default() for promotedToEffortIds to preserve TypeScript inference and keep createEffort/createBenefit/createCapability helpers compiling (Pitfall 1)"
  - "capabilityMatches.min(1) enforced: every promoted project MUST land in at least one vermogen (DIN-keten integrity)"
  - "splitEfforts.min(1).max(4) enforced per D-05 (AI splits freely 1-4, no pre-conditions)"
  - "Findings-created entities are NOT rolled back by undoProjectPromotion (first-class DIN entities after acceptance — documented behavior)"
  - "Dossier reuses inline shape (all fields optional+default empty string) for AI side instead of sharing storage InspanningsDossierSchema, because the storage shape requires non-optional fields"
  - "Finding of type 'baat' uses empty goalId placeholder — goal-picker is a Wave 3 UI concern per open question in RESEARCH.md"
  - "Inspanning-type findings carry originProjectId for traceback; baat/vermogen findings do NOT (Phase 14 stays scope-minimal per RESEARCH.md anti-pattern 'broadcasting originProjectId to non-Phase-14 schemas')"

patterns-established:
  - "Pure mutation helper returning Partial<DINSession>: called inside updateSession(prev => ...) for atomic multi-field commit (mirrors Phase 8 mergeCapabilities pattern)"
  - "Cartesian product for many-to-many map creation: for each accepted capability, for each new effort, push {capabilityId, effortId}"
  - "Dedupe via seen-Set keyed by composite string '${projectId}:${capabilityId}' during undo restoration"
  - "TDD cycle on Zod schemas: write tests against non-existent schema (RED) → add schema → GREEN → run build for TypeScript regression check"

requirements-completed: [D-05, D-07, D-08, D-09, D-10, D-11, D-12, D-14]

# Metrics
duration: 7min
completed: 2026-04-05
---

# Phase 14 Plan 01: Project Promotie Schema + Mutation Helpers Summary

**Zod schemas + TypeScript types + pure mutation helpers voor het promoveren van lopende projecten tot volwaardige DIN-inspanningen, volledig getest en backward-compatible met bestaande sessies.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-05T21:31:46Z
- **Completed:** 2026-04-05T21:39:44Z
- **Tasks:** 3 completed
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- Data-laag foundation voor Phase 14 project-promotie volledig neergezet: schemas, types en pure functies in één atomische commit-bare unit.
- 31 nieuwe tests green (16 schema extension + 7 result schema + 8 mutation helpers), geen regressies op de bestaande 250+ tests (behalve één pre-existing failure die niets met Phase 14 te maken heeft — gedocumenteerd in `deferred-items.md`).
- Backward-compatibility gegarandeerd: alle nieuwe velden zijn `.optional()` zonder `.default()` volgens Phase 01 conventie, bestaande localStorage-sessies blijven parseable.
- Wave 2 (AI) en Wave 3 (UI) kunnen nu bouwen op stabiele, getypeerde, getest fundament: `ProjectPromotieResult`, `AIPromotedEffort`, `FindingSuggestion`, `PromotionSelections`, `promoteProjectToEfforts`, `undoProjectPromotion`.

## Task Commits

Each task was committed atomically (combined RED+GREEN per task):

1. **Task 1: Extend ExternalProjectSchema + DINEffortSchema + tests 11-16** — `195a7c2` (feat)
2. **Task 2: ProjectPromotieResultSchema family + 7 schema tests** — `52cfde7` (feat)
3. **Task 3: promoteProjectToEfforts + undoProjectPromotion + 8 mutation tests** — `f8677e5` (feat)

## Files Created/Modified

### Created
- `src/lib/__tests__/project-promotion-schema.test.ts` — 7 Zod tests: valid/invalid/min/max/defaults/enum rejection
- `src/lib/__tests__/project-promotion.test.ts` — 8 unit tests: promote 1x1 / 3x2 cartesian / vermogen finding / inspanning finding / project-not-found / undo restore / undo no-op / undo preserves findings

### Modified
- `src/lib/schemas.ts` — Added 5 new schemas (FindingSuggestionSchema, AIPromotedEffortSchema, AIPromotedBenefitMatchSchema, AIPromotedCapabilityMatchSchema, ProjectPromotieResultSchema) + 5 type exports; extended DINEffortSchema with `originProjectId`; extended ExternalProjectSchema with `promotedAt` + `promotedToEffortIds`
- `src/lib/din-service.ts` — Added PromotionSelections interface + promoteProjectToEfforts + undoProjectPromotion pure functions; added imports for new schema types + CapabilityEffortMap
- `src/lib/__tests__/external-project-schema.test.ts` — Appended Tests 11-16 covering Phase 14 promoted fields + originProjectId (backward compat + Pitfall 1 verification)

## Verification

### Automated Tests
```bash
npx vitest run src/lib/__tests__/external-project-schema.test.ts  # 16 pass
npx vitest run src/lib/__tests__/project-promotion-schema.test.ts # 7 pass
npx vitest run src/lib/__tests__/project-promotion.test.ts        # 8 pass
npx vitest run                                                    # 250 pass, 1 pre-existing fail
npm run build                                                     # exits 0, zero TS errors
```

### Acceptance Criteria (from 14-01-PLAN.md)
- grep `originProjectId: z.string().optional()` — 1 match (schemas.ts:153)
- grep `promotedAt: z.string().optional()` — 1 match (schemas.ts:167)
- grep `promotedToEffortIds: z.array(z.string()).optional()` — 1 match (schemas.ts:168)
- `promotedToEffortIds` does NOT have `.default(` — verified
- `export const ProjectPromotieResultSchema` — 1 match (schemas.ts:774)
- `export const FindingSuggestionSchema` — 1 match (schemas.ts:733)
- `export const AIPromotedEffortSchema` — 1 match (schemas.ts:742)
- `export type ProjectPromotieResult` — 1 match (schemas.ts:883)
- `splitEfforts: z.array(AIPromotedEffortSchema).min(1).max(4)` — 1 match (schemas.ts:779)
- `capabilityMatches: z.array(AIPromotedCapabilityMatchSchema).min(1)` — 1 match (schemas.ts:777)
- `export function promoteProjectToEfforts` — 1 match (din-service.ts:835)
- `export function undoProjectPromotion` — 1 match (din-service.ts:972)
- `export interface PromotionSelections` — 1 match (din-service.ts:813)
- `originProjectId: projectId` — 2 matches (din-service.ts:871 + 943)
- `npm run build` exits 0, no TypeScript regressions

## Deviations from Plan

### Plan Template Deviations

**Dossier shape on AIPromotedEffortSchema — inline instead of InspanningsDossierSchema reuse**

The plan's Task 2 instructions said: "prefer reusing existing InspanningsDossierSchema.optional() for consistency; if that schema has different field names, fall back to the inline shape from RESEARCH.md lines 199-207".

I chose the inline shape because `InspanningsDossierSchema` (schemas.ts:65-71) requires ALL 5 fields as non-optional `z.string()`, while the AI-response shape needs all 5 as `.optional().default("")`. Reusing would either (a) break AI-response backward compat (AI could omit fields), or (b) require a parallel "soft" dossier schema anyway. Inline shape matches the AIBenefitSchema/AICapabilitySchema/AIEffortSchema pattern already established at schemas.ts:505-547.

### Out-of-Scope Discovery (logged to deferred-items.md)

Full test suite revealed one pre-existing failing test unrelated to Phase 14:

**`src/lib/__tests__/schemas.test.ts:395`** — `DINSessionSchema legacy integratieAdvies strip` expects `result.data` to NOT have `integratieAdvies`, but the schema field preserves it via `z.record().optional()`. Verified pre-existing via `git stash` + rerun on clean HEAD before my changes. Logged to `deferred-items.md` for a separate cleanup plan.

## Self-Check: PASSED

Verification performed after writing SUMMARY.md:

**Files exist:**
- FOUND: src/lib/__tests__/project-promotion-schema.test.ts
- FOUND: src/lib/__tests__/project-promotion.test.ts
- FOUND: src/lib/schemas.ts (modified)
- FOUND: src/lib/din-service.ts (modified)
- FOUND: src/lib/__tests__/external-project-schema.test.ts (modified)

**Commits exist:**
- FOUND: 195a7c2 (Task 1 — schema extensions)
- FOUND: 52cfde7 (Task 2 — ProjectPromotieResultSchema)
- FOUND: f8677e5 (Task 3 — promotion helpers)

**Tests green:**
- 16/16 external-project-schema.test.ts
- 7/7 project-promotion-schema.test.ts
- 8/8 project-promotion.test.ts
- 250/251 full suite (1 pre-existing failure logged)

**Build:** `npm run build` exits 0 with zero TypeScript regressions.
