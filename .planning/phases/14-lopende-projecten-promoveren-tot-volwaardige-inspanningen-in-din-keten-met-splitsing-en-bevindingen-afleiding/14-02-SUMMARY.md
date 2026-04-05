---
phase: 14-lopende-projecten-promoveren-tot-volwaardige-inspanningen-in-din-keten-met-splitsing-en-bevindingen-afleiding
plan: 02
subsystem: ai-pipeline
tags: [ai, claude-opus-4-6, zod, nextjs-api-route, vitest, promotie, din-keten]

# Dependency graph
requires:
  - phase: 14-lopende-projecten-promoveren (Plan 01)
    provides: "ProjectPromotieResultSchema, ProjectPromotieResult type, PromotionSelections, promoteProjectToEfforts, undoProjectPromotion"
  - phase: 01-foundation
    provides: "callClaudeWithValidation wrapper met 2 silent retries, layered system prompt pattern via assembleSystemPrompt"
  - phase: 03-06
    provides: "buildSectorwerkBlock + buildCompletedGoalsContext voor methodiek-conforme context-injectie"
  - phase: 12-lopende-projecten-invullen
    provides: "ExternalProject entity, matchProjectsToCapabilities als sibling-reference voor structured-JSON input pattern"
provides:
  - "PROJECT_PROMOTIE_PROMPT constant: 48-regel Dutch prompt met 4 genummerde secties (BENEFIT MATCHES, CAPABILITY MATCHES, SPLIT EFFORTS 1-4, FINDINGS) + exacte JSON response-structuur"
  - "promoteExternalProject(project, benefits, capabilities, sectorName, options) — AI-client functie die Opus 4.6 aanroept via callClaudeWithValidation(ProjectPromotieResultSchema, …)"
  - "POST /api/promote-project Next.js route die body valideert, ANTHROPIC_API_KEY checkt (503), resultaat wraps naar {success, data} of {success:false, error, retryable:true}"
  - "Pitfall 2 safeguard: post-parse filter dropt benefitMatches/capabilityMatches met onbekende IDs + console.warn log"
  - "5 mocked vitest cases die filter-logic, failure-propagation en valid-passthrough verifiëren via vi.mock(@anthropic-ai/sdk)"
affects: [14-03 UI wave — ProjectPromotiePanel kan direct fetch("/api/promote-project", ...) aanroepen]

# Tech tracking
tech-stack:
  added: []  # Geen nieuwe dependencies — volledig hergebruik van bestaande AI stack
  patterns:
    - "Combined-shot AI call: één Opus 4.6 prompt levert 4 concept-families in één JSON response (mirror van generateCrossAnalyse)"
    - "Layered system prompt via assembleSystemPrompt('inspanning-create', kibContext) + buildSectorwerkBlock + buildCompletedGoalsContext voor methodiek-conformiteit"
    - "Structured JSON IDs in user-message (JSON.stringify met expliciete id-veld) voorkomt ID-hallucinatie (Pitfall 2 prevention layer 1)"
    - "Post-parse Set-based filter als Pitfall 2 prevention layer 2 — dropt orphaned IDs voordat downstream code ze commit"
    - "vi.mock(@anthropic-ai/sdk) op module-niveau met mockCreate closure, import ai-client AFTER mock — zelfde patroon als ai-parsing.test.ts"

key-files:
  created:
    - "src/app/api/promote-project/route.ts (99 lines — POST handler, body destructure, ANTHROPIC_API_KEY guard, try/catch)"
    - "src/lib/__tests__/ai-client-promotion.test.ts (257 lines — 5 tests: 2x Pitfall 2 filter, 2x failure propagation, 1x valid passthrough)"
  modified:
    - "src/lib/prompts.ts (+64 lines: PROJECT_PROMOTIE_PROMPT constant appended na BATENPROFIEL_PROMPT)"
    - "src/lib/ai-client.ts (+140 lines: imports extended met ProjectPromotieResultSchema + PROJECT_PROMOTIE_PROMPT + assembleSystemPrompt/buildSectorwerkBlock/buildCompletedGoalsContext + KiBContext/CompletedGoalContext/ExternalProject/DINBenefit/DINCapability/SectorplanAnalyseResult types; promoteExternalProject function appended na matchProjectsToCapabilities)"

key-decisions:
  - "Opus 4.6 gekozen voor multi-concept redenering (zelfde model als generateCrossAnalyse) — 4 concept-families in één call vereisen bredere reasoning dan Sonnet biedt"
  - "Pitfall 2 safeguard als 2-laags defense: (1) structured JSON IDs in user message minimaliseren hallucinatie, (2) post-parse filter met Set-lookup dropt resterende invalid IDs met console.warn"
  - "TDD cyclus gecombineerd met Task 1: de Pitfall 2 filter-logic in promoteExternalProject wordt direct gedekt door mocked tests in Task 2. De tests zijn GREEN zodra Task 1 gecommit is — geen aparte RED-commit omdat de test het verwachte gedrag beschrijft dat al aanwezig is"
  - "assembleSystemPrompt aangeroepen met maxContextChars=undefined (3e arg) — de signature is (instructionPrompt, useCase, maxContextChars?, kibContext?), dus undefined betekent 'geen cap, gebruik volledige programmaboek-inspanningen context'"
  - "API route gebruikt 503 voor ontbrekende ANTHROPIC_API_KEY (niet 200 met stub data zoals match-projects doet) — promotie kan niet gedeeltelijk werken zonder AI, dus gate is hard"
  - "Mocked test fixtures gebruiken minimal-valid session shape: één project, één benefit, twee capabilities — genoeg om filter-logic te testen zonder te verdrinken in setup"

patterns-established:
  - "Combined-shot AI call wrapper: (1) assembleSystemPrompt met gepaste useCase, (2) append buildSectorwerkBlock + buildCompletedGoalsContext als opties aanwezig, (3) bouw user-message parts met structured JSON IDs, (4) callClaudeWithValidation met Opus 4.6 + maxTokens 8192, (5) post-parse filter van orphan IDs met console.warn"
  - "vi.mock @anthropic-ai/sdk patroon voor AI-client unit tests: declareer mockCreate buiten vi.mock factory, sluit closure in class.messages.create, import ai-client AFTER mock, reset in beforeEach"
  - "Mocked ParseResult response builder: helper function `mockAnthropicResponse(payload)` die een text-block teruggeeft met JSON.stringify(payload) — voorkomt boilerplate in elke test"

requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-07, D-12, D-13, D-14]

# Metrics
duration: 6min
completed: 2026-04-05
---

# Phase 14 Plan 02: AI Pipeline voor Project Promotie Summary

**Combined-shot Claude Opus 4.6 AI-pipeline voor het promoveren van lopende projecten tot volwaardige inspanningen in de DIN-keten — één prompt levert baat-matches, vermogen-matches, 1-4 split efforts én findings in één JSON response, geankerd in het programmaboek via layered system prompt.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-05T21:44:25Z
- **Completed:** 2026-04-05T21:50:08Z
- **Tasks:** 2 completed
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- Wave 2 (AI-laag) volledig neergezet bovenop Wave 1 schemas + helpers: prompt, AI-client functie, API route en mocked tests in één atomische flow.
- `PROJECT_PROMOTIE_PROMPT` instrueert Claude Opus 4.6 om in één JSON response vier concept-families te leveren (BENEFIT MATCHES, CAPABILITY MATCHES, SPLIT EFFORTS 1-4, FINDINGS) met exact gespecificeerde structuur en een expliciete "Splits: minimaal 1, maximaal 4. Capabilities: minimaal 1" regel.
- `promoteExternalProject()` hergebruikt het volledige layered-context patroon uit Phase 03-06: programmaboek ("inspanning-create" use case injecteert PROGRAMMABOEK_INSPANNINGEN) + KiB doelen/scope + sectorwerk-analyse + eerder uitgewerkte doelen. De AI heeft dezelfde methodiek-context als alle andere DIN-generatie calls.
- Pitfall 2 defense in depth: (1) structured JSON IDs in user-message (`JSON.stringify({id, title, description})` per benefit/capability) voorkomen dat AI description-strings teruggeven als ID; (2) post-parse Set-based filter dropt alsnog hallucinated IDs met `console.warn("[promoteExternalProject] Dropped invalid capabilityId from AI response:", id)` — orphan mappings komen nooit in de DIN-keten terecht.
- POST `/api/promote-project` route volgt exact het match-projects sibling-pattern: body destructure, 400 bij ontbrekende verplichte velden, 503 bij ontbrekende `ANTHROPIC_API_KEY` (hard gate — promotie werkt niet zonder AI), 422 met `retryable: true` bij AI-falen, 500 bij onverwachte exceptions.
- 5 mocked vitest cases verifiëren filter-logic (ghost capabilityId + ghost benefitId dropped), failure-propagation (malformed JSON 3x → failure; schema-violation → failure) en valid passthrough (alle velden preserved, 1 API call). Wave 3 kan direct `fetch("/api/promote-project", ...)` bouwen zonder verdere AI-laag wijzigingen.

## Task Commits

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | PROJECT_PROMOTIE_PROMPT + promoteExternalProject() in ai-client.ts | `fcb5ddc` | src/lib/prompts.ts, src/lib/ai-client.ts |
| 2 | POST /api/promote-project route + mocked unit tests | `e49731f` | src/app/api/promote-project/route.ts, src/lib/__tests__/ai-client-promotion.test.ts |

## Files Created/Modified

### Created
- `src/app/api/promote-project/route.ts` — Next.js POST handler; delegates to `promoteExternalProject`; wraps result in consistent `{success, data}` or `{success:false, error, retryable:true}` shape
- `src/lib/__tests__/ai-client-promotion.test.ts` — 5 mocked vitest cases covering Pitfall 2 filter (2), failure propagation (2), valid passthrough (1)

### Modified
- `src/lib/prompts.ts` — Appended `PROJECT_PROMOTIE_PROMPT` constant (64 lines) na `BATENPROFIEL_PROMPT` met 4 genummerde secties + exacte JSON response-structuur + "Splits: minimaal 1, maximaal 4" regel
- `src/lib/ai-client.ts` — Extended imports (PROJECT_PROMOTIE_PROMPT, ProjectPromotieResultSchema, assembleSystemPrompt/buildSectorwerkBlock/buildCompletedGoalsContext + KiBContext/CompletedGoalContext/ExternalProject/DINBenefit/DINCapability/SectorplanAnalyseResult types); appended `promoteExternalProject()` na `matchProjectsToCapabilities` met Opus 4.6 model, layered system prompt, structured JSON IDs en Pitfall 2 post-parse filter

## Verification

### Automated Tests

```bash
npx vitest run src/lib/__tests__/ai-client-promotion.test.ts  # 5/5 pass
npx vitest run                                                # 255/256 pass (1 pre-existing fail)
npm run build                                                 # exits 0, /api/promote-project in route list
```

The single failing test (`src/lib/__tests__/schemas.test.ts:395` — legacy `integratieAdvies` strip) is **pre-existing** and already documented in 14-01-SUMMARY.md under Deviations / Out-of-Scope Discovery. Not caused by this plan.

### Acceptance Criteria (from 14-02-PLAN.md)

**Task 1 (prompts.ts + ai-client.ts):**
- grep `export const PROJECT_PROMOTIE_PROMPT` in src/lib/prompts.ts — 1 match (line 782)
- grep `1. \*\*BENEFIT MATCHES\*\*` — 1 match (line 793)
- grep `3. \*\*SPLIT EFFORTS \(1-4\)\*\*` — 1 match (line 797)
- grep `4. \*\*FINDINGS\*\*` — 1 match (line 809)
- grep `Splits: minimaal 1, maximaal 4. Capabilities: minimaal 1.` — 1 match (line 827)
- grep `export async function promoteExternalProject` in src/lib/ai-client.ts — 1 match (line 782)
- grep `ProjectPromotieResultSchema` in src/lib/ai-client.ts — 3 matches (import + return type + call arg)
- grep `claude-opus-4-6` contains promoteExternalProject region — match at line 871 (inside the function's callClaudeWithValidation call)
- grep `assembleSystemPrompt(PROJECT_PROMOTIE_PROMPT, "inspanning-create"` (multiline) — match at line 800-802
- grep `Dropped invalid capabilityId` in src/lib/ai-client.ts — 1 match (line 895, console.warn)
- `npm run build` exits 0

**Task 2 (route.ts + ai-client-promotion.test.ts):**
- file src/app/api/promote-project/route.ts exists
- grep `export async function POST` in route.ts — 1 match (line 32)
- grep `promoteExternalProject` in route.ts — 2 matches (import + call)
- grep `ANTHROPIC_API_KEY niet geconfigureerd` in route.ts — 1 match (line 58)
- grep `retryable: true` in route.ts — 2 matches (jsdoc + actual return)
- grep `extractKiBContext` in route.ts — 2 matches (import + call)
- file src/lib/__tests__/ai-client-promotion.test.ts exists with 5 test blocks
- `npx vitest run src/lib/__tests__/ai-client-promotion.test.ts` exits 0 (5/5 pass)
- `npm run build` exits 0 — `/api/promote-project` verscheen in de gegenereerde route-lijst

## Deviations from Plan

### TDD cycle merged with Task 1

Plan Task 2 suggested a separate RED→GREEN cycle voor de tests. Omdat de Pitfall 2 filter-logic volledig in Task 1's `promoteExternalProject` staat (en een RED-only commit de AI-client zou opsplitsen in twee halve commits), heb ik:

1. Task 1 gecommit inclusief de volledige filter-logic.
2. Task 2 gecommit met het route + de tests, die direct GREEN zijn.

De tests zijn zinvol: ze lock-in het Pitfall 2 gedrag zodat toekomstige refactors het niet per ongeluk verwijderen. Drie cases dekken het belangrijkste gedrag: ghost-ID drop, ghost-benefit-ID drop, failure propagation (2 varianten), en valid passthrough. De fallback-strategie uit het plan (spyOn als vi.mock niet werkt) was niet nodig — `vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create: mockCreate }; } }))` werkt direct zoals in de bestaande `ai-parsing.test.ts`.

### assembleSystemPrompt 3rd argument

Het research-example uit §Example 1 gebruikt `assembleSystemPrompt(PROJECT_PROMOTIE_PROMPT, "inspanning-create", undefined, options.kibContext)`. Het plan sprak over `currentItem` als 3e arg, maar de werkelijke signature in `prompt-assembly.ts` is `(instructionPrompt, useCase, maxContextChars?, kibContext?)`. `undefined` als 3e arg betekent "geen cap op de programmaboek-context" — exact wat we willen voor een Opus-call met 8192 tokens. Plan-tekst en code matchen.

### Research Example 1 verbatim vs actual

Twee micro-aanpassingen t.o.v. het research voorbeeld:
1. **Pitfall 2 filter uitgebreid naar benefitMatches**: het plan noemde alleen capabilityMatches, maar dezelfde hallucination-risk geldt voor benefitMatches. Twee Set-based filters (een voor benefits, een voor capabilities) met console.warn per drop — zelfde prefix `[promoteExternalProject]`.
2. **`b.profiel?.indicator` werd `b.profiel?.indicator`**: `BatenProfielSchema` heeft `profiel` als non-optional, dus in theorie is `?.` overbodig; ik heb het toch laten staan omdat het defensive is en TypeScript het prima vindt.

### Auth gates

Geen. `ANTHROPIC_API_KEY` is al overal geconfigureerd; de 503-response path wordt alleen getoetst bij ontbrekende env var tijdens runtime, niet in de mocked tests.

## Self-Check: PASSED

Verification performed after writing SUMMARY.md:

**Files exist:**
- FOUND: src/lib/prompts.ts (modified)
- FOUND: src/lib/ai-client.ts (modified)
- FOUND: src/app/api/promote-project/route.ts
- FOUND: src/lib/__tests__/ai-client-promotion.test.ts

**Commits exist:**
- FOUND: fcb5ddc (Task 1 — PROJECT_PROMOTIE_PROMPT + promoteExternalProject)
- FOUND: e49731f (Task 2 — promote-project route + mocked tests)

**Tests green:**
- 5/5 ai-client-promotion.test.ts
- 255/256 full suite (1 pre-existing fail, logged in Wave 1 deferred items)

**Build:** `npm run build` exits 0, `/api/promote-project` in route list.
