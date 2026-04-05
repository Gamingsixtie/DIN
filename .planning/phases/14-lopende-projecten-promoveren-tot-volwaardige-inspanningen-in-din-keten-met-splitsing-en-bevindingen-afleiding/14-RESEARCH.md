# Phase 14: Lopende projecten promoveren tot volwaardige inspanningen in DIN-keten met splitsing en bevindingen-afleiding - Research

**Researched:** 2026-04-05
**Domain:** Zod schema extension + combined-shot Claude prompt engineering + multi-mutation atomic state update + review-UI (Next.js 16 / React 19)
**Confidence:** HIGH (every library, hook, schema, AI-pattern and persistence rule already exists in the codebase; Phase 14 is a targeted extension of Phase 12's infrastructure)

## Summary

Phase 14 introduces one new user-facing capability ("promoveer dit lopende project naar een volwaardige DIN-inspanning") but technically sits entirely inside patterns Phases 01-12 already established. There are **zero new libraries** to introduce, **zero new architectural layers**, and **zero new runtime migrations** — everything lands as an additive extension of existing Zod schemas, one new API route (or an extension of `din-suggest`), one new prompt constant, one new AI-client function, one new review panel component, and one multi-mutation `updateSession` transaction.

The three subtle engineering challenges — all well-understood in the existing codebase — are:

1. **Combined AI call shape.** A single prompt must return four concerns (benefit matches, capability matches, 1-4 split efforts with fully-populated dossiers, findings list). Zod handles this cleanly via `ProjectPromotieResultSchema` with nested objects, and `callClaudeWithValidation()` already has the retry-on-invalid loop. Claude Sonnet 4.6 has 64k max output tokens — far beyond the ~4-8k this payload needs — so token budget is not a constraint. Use `claude-opus-4-6` for this call (same choice as cross-analyse, which also does multi-concept reasoning).

2. **Atomic multi-mutation via `updateSession(prev => ...)`.** Promoting a project touches **five session arrays in one transaction**: `externalProjects` (mark promoted), `efforts` (add 1-4), `capabilityEffortMaps` (add rows), `projectCapabilityMaps` (remove rows for this project), and optionally `benefits`/`capabilities`/`efforts` (for accepted findings). Phase 2 D-03 already established the functional-updater pattern; all mutations must live in a single `updater` callback so `setSession` commits them atomically and saves once.

3. **Backward-compatible schema extension.** Three new optional fields on existing schemas (`ExternalProject.promotedAt`, `ExternalProject.promotedToEffortIds`, `DINEffort.originProjectId`). Phase 01 convention is `.optional()` **without** `.default()` — this keeps existing sessions in localStorage parseable. All three fields are strings/arrays with no enum constraints, so no migration step is required.

**Primary recommendation:** Build Phase 14 as **four self-contained waves** that compose cleanly:
1. **Wave 0 — Schemas + tests.** Extend `ExternalProjectSchema`, `DINEffortSchema`, add `FindingSuggestionSchema` + `ProjectPromotieResultSchema`. Extend `external-project-schema.test.ts`.
2. **Wave 1 — AI pipeline.** Add `PROJECT_PROMOTIE_PROMPT`, `promoteExternalProject()` AI client function, new `src/app/api/promote-project/route.ts`.
3. **Wave 2 — Mutation helper.** Add pure function `promoteProjectToEfforts(session, projectId, result)` in `din-service.ts`. Unit-test the pure mutation (no React, no AI).
4. **Wave 3 — UI.** New `ProjectPromotiePanel.tsx` component (expandable section on existing project cards). Wire into `ExterneProjectenPanel`. Add "Toon gepromoveerde projecten" toggle + undo button.

Split this way, each wave has a testable boundary and the UI wave can be iterated on without touching any data layer code.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Promotie-mechanisme**
- **D-01:** Promotie-trigger is een knop **per project** op de project-card in `ExterneProjectenPanel` (of in de promotie-tak van `AIKoppelingPanel` — planner/researcher kiest de schoonste plek). Eén klik -> AI-aanroep -> review-scherm voor dat ene project. Geen bulk-acties in deze phase.
- **D-02:** AI doet in **één aanroep** de volledige DIN-positionering voor het project en retourneert: (a) voorgestelde baat-koppeling(en) met AI-advies per match, (b) voorgestelde vermogen-koppeling(en), (c) gesplitste efforts (1-4), (d) bevindingen. User reviewt het hele pakket in één panel. Consistent met Phase 12 D-06 (AI-suggestie + handmatig bevestigen).
- **D-03:** Geen pre-condities. Promotie is beschikbaar ongeacht of het project eerder aan vermogens is gekoppeld via Phase 12 flow. De AI maakt zelf een volledig nieuwe positionering op basis van projectbeschrijving, sector, domeinen, en beschikbare DIN-context.
- **D-04:** De user kiest per voorgestelde baat-koppeling (AI-advies) welke baat het project hoort bij — meerdere baten tegelijk mogelijk. Dit is een expliciete review-stap in het promotie-panel: user ziet AI-suggestie met toelichting en vinkt aan/af.

**Splitsings-strategie**
- **D-05:** AI splitst vrij binnen **1-4 inspanningen** per project op basis van projectinhoud. Geen vaste regel (per domein / per vermogen / per baat) — de AI oordeelt welke logische splitsing past bij het specifieke project. Zod-schema enforceert `.min(1).max(4)` op de splitsing.
- **D-06:** Splitsing is **optioneel**. In het review-scherm kan de user het aantal voorgestelde efforts reduceren (bv. naar 1 effort) of accepteren. Voor kleine/eenvoudige projecten blijft één effort een valide optie.
- **D-07:** AI vult **alle velden** in op de voorgestelde efforts: `title`, `description`, `domain`, `status` (default `in_uitvoering` want het is een lopend project), `quarter`, `responsibleSector` (overgenomen van origineel project), en een basis `dossier`. User kan inline corrigeren in het review-scherm, maar hoeft niet — alles heeft een default zodat bevestigen direct mogelijk is.

**Relatie origineel project <-> nieuwe efforts**
- **D-08:** Origineel `ExternalProject` wordt **gemarkeerd als gepromoveerd**, niet verwijderd. Nieuwe velden op `ExternalProjectSchema`: `promotedAt?: string` (ISO) en `promotedToEffortIds?: string[]`. Het project verdwijnt uit de standaard "Lopende projecten" lijst (gefilterd op `!promotedAt`) maar blijft oproepbaar via een "Toon gepromoveerde projecten" schakelaar voor audit/undo.
- **D-09:** Datarelatie effort -> project: nieuwe optionele veld `originProjectId?: string` op `DINEffortSchema`. Lookup vanuit effort is simpel (filter op sessie), lookup vanuit project gaat via `promotedToEffortIds[]`. Bewust bi-directioneel voor snelle navigatie in beide richtingen (accepteer sync-verantwoordelijkheid bij undo/delete).
- **D-10:** Bestaande `projectCapabilityMaps` voor het gepromoveerde project worden **omgezet naar `capabilityEffortMaps`**: voor elke nieuwe effort wordt een capability-effort-koppeling aangemaakt op basis van welk vermogen de AI in de promotie-flow heeft voorgesteld. De oude `projectCapabilityMaps` voor dit project worden na conversie verwijderd. De DIN-keten blijft zo schoon (één mapping-patroon: baat -> vermogen -> inspanning).
- **D-11:** Terugdraaien is mogelijk via het **project-detail van een gepromoveerd project** (zichtbaar in "Toon gepromoveerde projecten"). Een "Terugdraaien"-knop verwijdert de efforts, draait `capabilityEffortMaps` terug naar `projectCapabilityMaps` waar mogelijk, clear `promotedAt`/`promotedToEffortIds`, en zet het project terug in de actieve lijst. Altijd beschikbaar zolang de sessie bestaat. Geen tijdgebonden toast-undo.

**Bevindingen-ontwerp**
- **D-12:** Bevindingen zijn **DIN-element suggesties** — elementen die de AI uit de projectbeschrijving herkent als impliciet maar niet expliciet uitgevoerd. Concreet: "dit project suggereert nieuw vermogen X dat nog niet in de DIN-keten staat", "raakt ook impliciet baat Y", "ontbrekende inspanning Z voor domein Cultuur". Geen risico's, geen lessons learned tekst — uitsluitend klikbare DIN-verrijkingsvoorstellen.
- **D-13:** Bevindingen **landen in het promotie-review-scherm** als sectie onder de voorgestelde efforts. Elke bevinding heeft: type (baat / vermogen / inspanning), voorstel-tekst, AI-toelichting (waarom), en een "Voeg toe aan DIN"-knop. Klikken -> nieuw DIN-element wordt direct aangemaakt in de sessie met `originProjectId` terugverwijzing naar het bron-project. Niet geaccepteerde bevindingen worden bij annuleer verwijderd.
- **D-14:** Zod-schema voor bevindingen: `FindingSuggestionSchema` met `type: 'baat' | 'vermogen' | 'inspanning'`, `beschrijving: string`, `toelichting: string`, `targetSector: SectorName`. Opgenomen in de promotie-response schema (`ProjectPromotieResultSchema`) naast de voorgestelde efforts. Geaccepteerde bevindingen worden omgezet naar echte `DINBenefit`/`DINCapability`/`DINEffort` entries bij klik; afgewezen of niet-bevestigde bevindingen worden niet persistent opgeslagen (transient in review-UI).

### Claude's Discretion
- Precieze locatie van de promotie-knop: op de bestaande project-card in `ExterneProjectenPanel`, uitgebreid `AIKoppelingPanel`, of nieuwe `ProjectPromotiePanel` — planner/researcher kiest de schoonste aansluiting op de bestaande Phase 12 UI.
- Visuele opmaak van het review-scherm: modal, uitklappaneel, full-page overlay — mits de hele DIN-keten (baat -> vermogen -> efforts -> bevindingen) in één overzicht zichtbaar is.
- Prompt-ontwerp voor de gecombineerde promotie-AI-aanroep (baat-match + vermogen-match + splitsing + bevindingen in één response).
- Exacte Zod-schema shape voor `ProjectPromotieResultSchema` — welke velden per voorgestelde effort, hoe bevindingen gestructureerd zijn, hoe AI-toelichting meegestuurd wordt.
- Of de promotie-AI-call hergebruik maakt van bestaande prompt-assembly (`assembleSystemPrompt` + KiB-context + programmaboek) of een eigen prompt-pipeline krijgt.
- Schema-migratie voor bestaande sessies (nieuwe optionele velden moeten backward-compat zijn; `.optional()` zonder `.default()` volgt Phase 01 conventie).
- Exacte copy van de promotie-knop en review-scherm teksten.
- UI-stijl van de "gepromoveerd"-badge bij project-cards en de "Toon gepromoveerde projecten" schakelaar.
- Tests: welke unit tests op mapping-conversie, welke integration tests op de AI-flow.

### Deferred Ideas (OUT OF SCOPE)
- **Bulk-promotie per sector** — "Promoveer alle projecten van PO in één keer" is handig voor sessies met veel projecten, maar vereist een aparte bulk-review-UX en is buiten scope van deze phase.
- **Bevindingen als Word-export hoofdstuk** — "Bevindingen uit lopende projecten" als apart hoofdstuk in de export zou stakeholders een overzicht geven, maar vereist persistente bevindingen-opslag en Word-template werk. Kan een latere phase worden.
- **Bevindingen-historie (afgewezen/geaccepteerd trail)** — Nu worden niet-geaccepteerde bevindingen niet opgeslagen. Een trail van "welke bevindingen heeft de AI ooit voorgesteld, wat deed de user ermee" is nuttig voor audit maar introduceert state-beheer complexiteit.
- **Tijdgebonden toast-undo** — Een quick-undo toast naast het project-detail terugdraaien is denkbaar maar niet noodzakelijk; project-detail undo volstaat voor deze phase.
- **AI-prompt iteratie op bestaande gepromoveerde projecten** — "Analyseer dit gepromoveerde project opnieuw" is een re-promotie scenario dat buiten scope valt; user kan handmatig undo + opnieuw promoveren.
- **Cross-sector promotie** — Een project dat meerdere sectoren bedient en gepromoveerd wordt tot cross-sector efforts. Valt buiten Phase 12 D-04 (projecten per sector) en daarmee ook buiten deze phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

Phase 14 has **no formal R-ID in REQUIREMENTS.md** — the 19 v1 requirements are all marked Complete (see `.planning/REQUIREMENTS.md` lines 82-103). Phase 14 was added after the v1 roadmap closure (see STATE.md "Roadmap Evolution" line 148) as an extension of Phase 12's project-handling capability. The 14 locked decisions (D-01..D-14 in CONTEXT.md) collectively form the phase contract.

| ID | Description | Research Support |
|----|-------------|------------------|
| D-01 | Per-project promotion trigger (single-click, no bulk) | Existing `ExterneProjectenPanel` project-card layout already has action slot; `AIKoppelingPanel` pattern for AI-trigger + review is the reusable model |
| D-02 | Single AI call returns benefit-matches + capability-matches + 1-4 split efforts + findings | `callClaudeWithValidation()` + new `ProjectPromotieResultSchema` + Claude Sonnet/Opus 4.6 (64k output tokens, well within budget) |
| D-03 | No pre-conditions, AI creates fresh positioning | Same pattern as `extract-projects` route: full project description + session context -> AI |
| D-04 | Per-suggested-benefit multi-select review | Reuse `AIKoppelingPanel` pre-accept + toggle pattern (lines 97-105, 117-129) |
| D-05 | Zod `.min(1).max(4)` on split efforts | Native Zod array constraint, already used on `AIDINMappingResponseSchema.benefits.max(4)` |
| D-06 | Splitting optional — user can reduce count in review | Review-state as transient local state, not persisted until commit |
| D-07 | AI pre-fills every effort field including status=in_uitvoering | Prompt instruction + `AIEffortSchema` shape as starting point, extended with `status` + `responsibleSector` |
| D-08 | `promotedAt?: string` + `promotedToEffortIds?: string[]` on `ExternalProjectSchema` | Additive optional fields, backward-compat (Phase 01 convention) |
| D-09 | `originProjectId?: string` on `DINEffortSchema` | Single optional field, no cascade constraints |
| D-10 | Convert `projectCapabilityMaps` -> `capabilityEffortMaps` atomically | Single `updateSession(prev => ...)` transaction that mutates both arrays (Phase 2 D-03 functional updater) |
| D-11 | Undo button on promoted project detail | Inverse of promotion mutation — same pure function pattern |
| D-12 | Findings are DIN-element suggestions, not risks/lessons | Prompt instruction + discriminated union in Zod (`type: 'baat' \| 'vermogen' \| 'inspanning'`) |
| D-13 | Findings render as "Voeg toe aan DIN"-clickable cards in review screen | Local transient React state + onClick dispatches `updateSession` with the new entity |
| D-14 | `FindingSuggestionSchema` shape: type + beschrijving + toelichting + targetSector | Reuses existing `SectorNameSchema` enum |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

These are hard constraints from the DIN project instructions; every Phase 14 plan task MUST honor them:

- **`npm run build` moet slagen** na elke taak — geen failed builds committen.
- **UI + AI-output in het Nederlands (nl-NL)** — knop-teksten, error-meldingen, toasts, AI-prompts, AI-responses. Geen Engelse termen in de interface.
- **Cito blauw `#003366`** als primaire kleur; domein-kleuren (blauw/groen/paars/amber) uit Phase 12 constants (`DOMAIN_BORDER_COLORS`, `DOMAIN_CHIP_CHECKED` in `ExterneProjectenPanel.tsx` §48-60).
- **Dual persistence — localStorage FIRST, Supabase async** (`src/lib/persistence.ts`). De bestaande `updateSession` updater zorgt hier al voor; Phase 14 mag geen direct `localStorage.setItem` doen buiten `session-context.tsx`.
- **Nooit lege state opslaan** — check altijd of mutatie daadwerkelijk waarde heeft voordat `updateSession` wordt aangeroepen.
- **Deduplicatie van IDs** via `generateId()` en `deduplicateById()` uit `din-service.ts`/`persistence.ts` bij AI-regeneratie.
- **Gebruikersfeedback bij elke actie** — loading state tijdens AI-call, success-toast na commit, error-toast bij mislukte AI-validatie of persistence failure. Gebruik `addToast` uit `@/components/ui/Toast` (beschikbaar via `useToast` hook).
- **UX design voor alle output** — AI-output in review-scherm wordt gerenderd als gestructureerde kaarten met headings, domein-kleuren, badges. Geen raw markdown, geen rauwe JSON preview.
- **Direct committen en pushen** na elke werkende wijziging (door plan-orchestrator; researcher hoeft hier niet op in te spelen).
- **Methodiek volgen** — elke voorgestelde effort moet de methodiek-regels volgen (werkwoorden in titel, concrete activiteit, domein-consistent). Bestaande `validateInspanning()` in `src/lib/din-validation.ts` kan na de AI-call worden toegepast als post-validation pass op elke split effort.
- **Skills gebruiken** — `.claude/skills/` bevat `pim-dev-skill`, `frontend-design`, `interface-design`, `klant-in-beeld`, `ui-design-system`, `web-asset-generator`. Researcher heeft deze niet diep nodig, maar planner moet `interface-design` raadplegen voor het review-scherm ontwerp (dashboards, complex info dichtheid).

## Standard Stack

### Core (already in codebase — no install needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | (via schemas.ts — pinned transitively) | Schema definition + validation | Phase 01 established Zod as single source of truth; `ProjectPromotieResultSchema` extends this pattern |
| `@anthropic-ai/sdk` | ^0.78.0 | Claude API client | `ai-client.ts` already wraps this via `callClaudeWithValidation()` — reuse as-is |
| `vitest` | ^4.1.2 | Unit test runner | Only test framework in project; already validates schemas + pure functions |
| `next` | ^16.1.0 | API routes + SSR | New `src/app/api/promote-project/route.ts` lives in existing App Router structure |
| `react` | ^19.1.0 | UI library | Component layer uses React Context (`useSession`) + hooks (`useState`, `useCallback`) — same as Phase 12 |
| `tailwindcss` | ^4.1.0 | Styling | All Phase 14 UI uses Tailwind utility classes + existing color constants |

### Supporting (already in codebase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing `prompt-assembly.ts` helpers | N/A | `assembleSystemPrompt` + `extractKiBContext` + `buildSectorwerkBlock` + `buildCompletedGoalsContext` | Yes — use for promotie-prompt so it gets programmaboek + KiB + sectorwerk + completed goals context (same layering as Phase 11 per-step prompts) |
| `din-validation.ts` (`validateInspanning`) | N/A | Post-validate AI effort output against methodiek rules | Optional but recommended: run each split effort through `validateInspanning` after AI-response parse, surface warnings in review-UI |
| `generateId()` from `din-service.ts` | N/A | UUID generation | All new `DINEffort`, `DINBenefit`, `DINCapability`, `CapabilityEffortMap` entries |
| `deduplicateById()` from `persistence.ts` | N/A | ID-collision prevention on AI re-runs | Apply after merge when committing split efforts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending existing `/api/din-suggest/route.ts` with a new `mode: "promote-project"` branch | New dedicated `/api/promote-project/route.ts` | **Recommended: new route.** `din-suggest` already has two modes (`create` + `domain-recommend` + default aanscherp) and its branching is getting unwieldy. A new route is cleaner, easier to test, and has no bundle-size penalty (Next.js App Router routes are independently code-split). |
| Extending `AIKoppelingPanel.tsx` to host the promotion review | New `ProjectPromotiePanel.tsx` component | **Recommended: new component.** `AIKoppelingPanel` is purpose-built for `project -> capability` matching (3 props types, specific `AIMatchResult` shape). Promotion is a **bigger** concern (baat + vermogen + effort-split + findings). Embedding it would double the component's complexity. New component is cleaner and the two can coexist. |
| One big Claude call returning everything | Multiple smaller calls (one for benefits, one for capabilities, one for effort-split, one for findings) | **Recommended: single call (per D-02).** Single call gives the AI the full reasoning context so it can ensure baten -> vermogen -> effort -> findings are coherent. Token budget is not a constraint (Sonnet/Opus 4.6: 64k output tokens). Multiple calls would be 4x latency and harder to keep internally consistent. |
| Mutating state in multiple sequential `updateSession` calls | Single `updateSession(prev => ...)` with all mutations | **Recommended: single call (D-10, Phase 2 D-03).** Multiple calls cause race conditions and trigger the "opgeslagen" indicator 5x. Single functional updater is atomic. |
| Using Claude Sonnet 4.6 | Using Claude Opus 4.6 | **Recommended: Opus 4.6 for the promotion call.** Same choice as `generateCrossAnalyse()` (line 246 of `ai-client.ts`) — multi-concept reasoning benefits from the deeper model. Extract-projects and match-projects (Phase 12) already use Sonnet; promotion is a higher-stakes combined reasoning task. |

**Installation:** None. All dependencies are already in `package.json`.

**Version verification:** Skipped — no new packages. Existing Anthropic SDK (`^0.78.0`) supports both `claude-sonnet-4-6` and `claude-opus-4-6` (verified in `src/lib/ai-client.ts` line 36).

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── api/
│       └── promote-project/
│           └── route.ts              # NEW — POST handler for combined AI call
├── lib/
│   ├── schemas.ts                    # EXTEND — add FindingSuggestionSchema, ProjectPromotieResultSchema; extend ExternalProjectSchema + DINEffortSchema
│   ├── ai-client.ts                  # EXTEND — add promoteExternalProject() function
│   ├── prompts.ts                    # EXTEND — add PROJECT_PROMOTIE_PROMPT constant
│   ├── din-service.ts                # EXTEND — add promoteProjectToEfforts() + undoProjectPromotion() pure functions
│   └── __tests__/
│       ├── external-project-schema.test.ts     # EXTEND — tests for new fields
│       ├── schemas.test.ts                     # EXTEND — ProjectPromotieResultSchema tests
│       └── project-promotion.test.ts           # NEW — unit tests for promoteProjectToEfforts() mutation
└── components/
    ├── din/
    │   ├── ExterneProjectenPanel.tsx # EXTEND — promotion button per project card + "Toon gepromoveerde" toggle + undo flow
    │   └── ProjectPromotiePanel.tsx  # NEW — review screen showing benefit matches + capability matches + split efforts + findings
    └── steps/
        └── DINMappingStep.tsx        # MINIMAL — filter .externalProjects.filter(p => !p.promotedAt) in inline rendering (§1780-1870)
```

### Pattern 1: Combined Zod schema with nested concerns (D-02, D-14)
**What:** A single top-level schema that nests the four AI response concerns (baat-matches, vermogen-matches, split efforts, findings) so `callClaudeWithValidation` can parse the whole response in one pass.

**When to use:** Any AI call where multiple distinct concerns must stay internally consistent (mirrors Phase 11's `AICrossAnalyseSchema` that nests synergie/gaps/hefboom/domein/etc. under one top-level object — see `schemas.ts` §603).

**Example (authoritative for Phase 14):**
```typescript
// src/lib/schemas.ts — add below AIProjectCapabilityMatchResponseSchema (§714)

// Discriminated union for the type of DIN element a finding suggests
export const FindingSuggestionSchema = z.object({
  type: z.enum(["baat", "vermogen", "inspanning"]),
  beschrijving: z.string(),
  toelichting: z.string(),
  targetSector: SectorNameSchema,
  // For inspanning findings, allow AI to hint a domain (optional)
  domain: EffortDomainSchema.optional(),
});

// Per-effort shape in the splitsing (1..4) — mirrors AIEffortSchema but adds status + responsibleSector
export const AIPromotedEffortSchema = z.object({
  title: z.string(),
  description: z.string(),
  domain: EffortDomainSchema,
  status: EffortStatusSchema.optional().default("in_uitvoering"),
  quarter: z.string().optional(),
  responsibleSector: z.string().optional(),
  dossier: z
    .object({
      eigenaar: z.string().optional().default(""),
      inspanningsleider: z.string().optional().default(""),
      verwachtResultaat: z.string().optional().default(""),
      kostenraming: z.string().optional().default(""),
      randvoorwaarden: z.string().optional().default(""),
    })
    .optional(),
  // AI's reasoning for why THIS split effort exists (shown in review UI)
  rationale: z.string().optional(),
});

// Per-benefit match: user picks which suggested benefits to link the promoted project to
export const AIPromotedBenefitMatchSchema = z.object({
  benefitId: z.string(), // Matches an existing DINBenefit.id from the session
  toelichting: z.string(), // AI's reason why this benefit is relevant
});

// Per-capability match: new capabilityEffortMap rows will be created for each accepted capability x effort
export const AIPromotedCapabilityMatchSchema = z.object({
  capabilityId: z.string(), // Matches an existing DINCapability.id
  toelichting: z.string(),
});

// The top-level response — one call returns all four concerns
export const ProjectPromotieResultSchema = z.object({
  benefitMatches: z.array(AIPromotedBenefitMatchSchema).optional().default([]),
  capabilityMatches: z.array(AIPromotedCapabilityMatchSchema).min(1), // At least one capability must be suggested
  splitEfforts: z.array(AIPromotedEffortSchema).min(1).max(4), // D-05
  findings: z.array(FindingSuggestionSchema).optional().default([]),
  samenvatting: z.string(), // 1-2 sentence executive summary of the promotion
});

export type FindingSuggestion = z.infer<typeof FindingSuggestionSchema>;
export type AIPromotedEffort = z.infer<typeof AIPromotedEffortSchema>;
export type AIPromotedBenefitMatch = z.infer<typeof AIPromotedBenefitMatchSchema>;
export type AIPromotedCapabilityMatch = z.infer<typeof AIPromotedCapabilityMatchSchema>;
export type ProjectPromotieResult = z.infer<typeof ProjectPromotieResultSchema>;
```

Rationale for each decision in this shape:
- `capabilityMatches.min(1)` — every promoted project must land in at least one vermogen (the DIN-keten demands it). No min on benefits because a project can primarily strengthen a vermogen without hitting a new baat.
- `splitEfforts.min(1).max(4)` — D-05 hard constraint.
- `benefitMatches` and `findings` use `.optional().default([])` so the AI can omit them if none are relevant (Phase 01 convention; AI response schemas commonly have soft defaults — see `AICrossAnalyseSchema` §603).
- `rationale` on `AIPromotedEffortSchema` is optional because it's a UX concern (shown in review card) not a data concern.
- `targetSector` on findings uses existing `SectorNameSchema` enum — findings always belong to one sector, consistent with Phase 12 D-04.
- Schema is added to `schemas.ts` (not a new file) to stay with the existing single-source-of-truth pattern.
- Schema is **not** added to `DINSessionSchema` — the result is transient (only lives in the review UI until user commits or cancels), not stored in the session. Only the effects of committing it (new efforts, new maps, promoted flag on project) are persistent.

### Pattern 2: Layered system prompt for combined AI call (D-02)
**What:** Reuse `assembleSystemPrompt(PROJECT_PROMOTIE_PROMPT, "inspanning-create", undefined, kibContext)` + append `buildSectorwerkBlock()` + append `buildCompletedGoalsContext()`. This gives the promotion AI the same layered context (programmaboek -> KiB -> sectorwerk -> completed goals) as other DIN-generation calls.

**When to use:** Every AI call that needs to reason methodiek-conformly about DIN elements in a specific sector.

**Recommendation:** Use `ProgrammaboekUseCase = "inspanning-create"` for the promotion call since the primary output is new inspanningen (efforts). This injects the `PROGRAMMABOEK_INSPANNINGEN` section, which defines the inspanningendossier shape — critical because the AI must populate `dossier` on each split effort.

**Example prompt structure:**
```typescript
// src/lib/prompts.ts — add at end of file after BATENPROFIEL_PROMPT

export const PROJECT_PROMOTIE_PROMPT = `Je bent een expert in het DIN-framework (Doelen-Inspanningennetwerk, Wijnen & Van der Tak, 2002).

Een lopend project moet worden gepromoveerd tot een volwaardige inspanning in de DIN-keten. Je krijgt:
- De beschrijving, status en domeinen van het project
- De sector waar het project bij hoort
- De beschikbare DIN-baten voor die sector (met titel, beschrijving, indicator)
- De beschikbare DIN-vermogens voor die sector (met titel, beschrijving)
- Optioneel: welke vermogens het project al los gekoppeld was via Phase 12 flow

Je taak is om in EEN antwoord vier dingen te produceren:

1. **BENEFIT MATCHES** — Welke van de bestaande DIN-baten raakt dit project? Lever 0-N matches met een korte toelichting per match waarom dit project bijdraagt. Referentie naar de baten gaat via exact het benefitId uit de lijst.

2. **CAPABILITY MATCHES** — Welke van de bestaande DIN-vermogens bouwt dit project op? Lever minimaal 1 match (anders is het project methodisch niet aan te sluiten in de DIN-keten). Gebruik capabilityId.

3. **SPLIT EFFORTS (1-4)** — Splits het project in 1 tot 4 concrete inspanningen. Elke split effort krijgt:
   - title: kort actielabel in werkwoorden
   - description: 1-2 zinnen toelichting
   - domain: een van 'mens' | 'processen' | 'data_systemen' | 'cultuur'
   - status: 'in_uitvoering' (default, want het is een lopend project)
   - quarter: schatting in formaat 'Q1 2026' of 'Q2-Q3 2026'
   - responsibleSector: overgenomen van het origineel project
   - dossier: volledig ingevulde InspanningsDossier (eigenaar, inspanningsleider, verwachtResultaat, kostenraming, randvoorwaarden)
   - rationale: waarom deze split effort bestaat (wordt in review-UI getoond)

   Splits alleen als het logisch is. Eenvoudige/kleine projecten = 1 effort. Multi-domein projecten = meerdere efforts, elk met eigen domain.

4. **FINDINGS** — Bevindingen zijn DIN-element suggesties die uit het project voortvloeien maar niet expliciet door het project zelf worden uitgevoerd. Voorbeelden:
   - "Dit project suggereert een nieuw vermogen X dat nog niet in de keten staat"
   - "Project raakt impliciet baat Y — overweeg deze toe te voegen"
   - "Voor domein 'cultuur' ontbreekt nog een inspanning die dit project zou versterken"

   Elke bevinding: type ('baat' | 'vermogen' | 'inspanning'), beschrijving (korte voorstel-tekst), toelichting (waarom is dit relevant), targetSector, optioneel domain (alleen voor inspanning).

   BELANGRIJK: bevindingen zijn GEEN risico's, GEEN lessons learned, GEEN aandachtspunten. Alleen concrete DIN-element voorstellen die de keten zouden verrijken.

Antwoord als JSON met exact deze structuur:
{
  "benefitMatches": [{"benefitId": "...", "toelichting": "..."}],
  "capabilityMatches": [{"capabilityId": "...", "toelichting": "..."}],
  "splitEfforts": [{"title":"...","description":"...","domain":"mens","status":"in_uitvoering","quarter":"Q1 2026","responsibleSector":"PO","dossier":{...},"rationale":"..."}],
  "findings": [{"type":"vermogen","beschrijving":"...","toelichting":"...","targetSector":"PO"}],
  "samenvatting": "1-2 zinnen executive summary van de promotie"
}

Splits: minimaal 1, maximaal 4. Capabilities: minimaal 1. Benefits en findings mogen [] zijn als geen match/bevinding.`;
```

### Pattern 3: Atomic multi-mutation via functional updater (D-10, D-11, Phase 2 D-03)
**What:** All state mutations for promotion live in **one** `updateSession(prev => ...)` call so they commit atomically and trigger exactly one save to localStorage + one "opgeslagen" toast.

**Example:**
```typescript
// src/lib/din-service.ts — add at end of file

import type { DINSession, ExternalProject, DINEffort, CapabilityEffortMap, ProjectCapabilityMap, DINBenefit, DINCapability } from "./types";
import type { ProjectPromotieResult, AIPromotedEffort, FindingSuggestion } from "./schemas";

interface PromotionSelections {
  acceptedBenefitIds: string[];       // From review UI — which suggested benefits user kept
  acceptedCapabilityIds: string[];    // Which suggested capabilities user kept
  keptEfforts: AIPromotedEffort[];    // User may have reduced from 4 -> 1 (D-06)
  acceptedFindings: FindingSuggestion[]; // Findings user clicked "Voeg toe aan DIN" on
}

/**
 * Pure function: given a session + promotion result + user selections,
 * returns the Partial<DINSession> that should be applied.
 *
 * This is a PURE function — it must be called INSIDE `updateSession(prev => ...)`
 * so React's functional updater guarantees atomicity.
 *
 * Mutations:
 * 1. Mark original project as promoted (promotedAt, promotedToEffortIds)
 * 2. Create new DINEffort entries (1..4) with originProjectId pointing to project
 * 3. Remove old projectCapabilityMaps rows for this project
 * 4. Create new capabilityEffortMap rows (one per capability x effort)
 * 5. For accepted findings: create new DINBenefit / DINCapability / DINEffort entries
 *    with originProjectId pointing to the source project
 */
export function promoteProjectToEfforts(
  session: DINSession,
  projectId: string,
  result: ProjectPromotieResult,
  selections: PromotionSelections
): Partial<DINSession> {
  const project = (session.externalProjects || []).find(p => p.id === projectId);
  if (!project) return {};

  // 1. Create new DINEffort entries
  const newEffortIds: string[] = [];
  const newEfforts: DINEffort[] = selections.keptEfforts.map(ae => {
    const id = generateId();
    newEffortIds.push(id);
    return {
      id,
      sectorId: project.sectorId,
      title: ae.title,
      description: ae.description,
      domain: ae.domain,
      quarter: ae.quarter,
      responsibleSector: ae.responsibleSector || project.sectorId,
      status: ae.status || "in_uitvoering",
      dependencies: [],
      votes: 0,
      dossier: ae.dossier
        ? {
            eigenaar: ae.dossier.eigenaar || "",
            inspanningsleider: ae.dossier.inspanningsleider || "",
            verwachtResultaat: ae.dossier.verwachtResultaat || "",
            kostenraming: ae.dossier.kostenraming || "",
            randvoorwaarden: ae.dossier.randvoorwaarden || "",
          }
        : undefined,
      originProjectId: projectId, // D-09
    };
  });

  // 2. Build new capabilityEffortMap rows (cartesian product: each accepted cap x each new effort)
  const newCapEffMaps: CapabilityEffortMap[] = [];
  for (const capabilityId of selections.acceptedCapabilityIds) {
    for (const effortId of newEffortIds) {
      newCapEffMaps.push({ capabilityId, effortId });
    }
  }

  // 3. Remove existing projectCapabilityMaps for this project (D-10)
  const filteredProjectCapMaps = (session.projectCapabilityMaps || []).filter(
    m => m.projectId !== projectId
  );

  // 4. Mark original project as promoted (D-08)
  const updatedProjects = (session.externalProjects || []).map(p =>
    p.id === projectId
      ? {
          ...p,
          promotedAt: new Date().toISOString(),
          promotedToEffortIds: newEffortIds,
        }
      : p
  );

  // 5. Accepted findings -> new entities
  const findingBenefits: DINBenefit[] = [];
  const findingCapabilities: DINCapability[] = [];
  const findingEfforts: DINEffort[] = [];
  // (Findings can also be added incrementally in the UI — see UI pattern below —
  // so this helper supports both paths via the `acceptedFindings` list.)
  for (const finding of selections.acceptedFindings) {
    if (finding.type === "baat") {
      findingBenefits.push({
        id: generateId(),
        goalId: "", // TODO: planner decides — findings may need goal selection step
        sectorId: finding.targetSector,
        title: finding.beschrijving.slice(0, 60),
        description: finding.beschrijving,
        profiel: {
          bateneigenaar: "",
          indicator: "",
          indicatorOwner: "",
          currentValue: "",
          targetValue: "",
        },
        // originProjectId can be added to DINBenefitSchema if findings need traceback;
        // CONTEXT.md D-13 mentions "met originProjectId terugverwijzing" — planner to decide
        // if this field is added to DINBenefitSchema too, or tracked via a separate mapping.
      });
    } else if (finding.type === "vermogen") {
      findingCapabilities.push({
        id: generateId(),
        sectorId: finding.targetSector,
        title: finding.beschrijving.slice(0, 60),
        description: finding.beschrijving,
        relatedSectors: [finding.targetSector],
        profiel: { eigenaar: "", huidieSituatie: "", gewensteSituatie: "" },
      });
    } else if (finding.type === "inspanning") {
      findingEfforts.push({
        id: generateId(),
        sectorId: finding.targetSector,
        title: finding.beschrijving.slice(0, 60),
        description: finding.beschrijving,
        domain: finding.domain || "processen",
        status: "gepland",
        dependencies: [],
        originProjectId: projectId, // Findings from this promotion trace back
      });
    }
  }

  return {
    externalProjects: updatedProjects,
    efforts: [...(session.efforts || []), ...newEfforts, ...findingEfforts],
    benefits: [...(session.benefits || []), ...findingBenefits],
    capabilities: [...(session.capabilities || []), ...findingCapabilities],
    capabilityEffortMaps: [...(session.capabilityEffortMaps || []), ...newCapEffMaps],
    projectCapabilityMaps: filteredProjectCapMaps,
  };
}

/**
 * Pure function: inverse of promoteProjectToEfforts.
 * Restores projectCapabilityMaps from the capabilityEffortMaps that point at
 * efforts with originProjectId matching this project.
 */
export function undoProjectPromotion(
  session: DINSession,
  projectId: string
): Partial<DINSession> {
  const project = (session.externalProjects || []).find(p => p.id === projectId);
  if (!project || !project.promotedAt) return {};

  const promotedEffortIds = new Set(project.promotedToEffortIds || []);
  // Also catch any efforts that have originProjectId set (belt-and-braces)
  const effortsToRemove = new Set(
    (session.efforts || [])
      .filter(e => e.originProjectId === projectId || promotedEffortIds.has(e.id))
      .map(e => e.id)
  );

  // Restore projectCapabilityMaps from capabilityEffortMaps where effortId is in effortsToRemove
  const restoredProjectCapMaps: ProjectCapabilityMap[] = [];
  const seen = new Set<string>();
  for (const cem of (session.capabilityEffortMaps || [])) {
    if (effortsToRemove.has(cem.effortId)) {
      const key = `${projectId}:${cem.capabilityId}`;
      if (!seen.has(key)) {
        restoredProjectCapMaps.push({ projectId, capabilityId: cem.capabilityId });
        seen.add(key);
      }
    }
  }

  return {
    externalProjects: (session.externalProjects || []).map(p =>
      p.id === projectId
        ? { ...p, promotedAt: undefined, promotedToEffortIds: undefined }
        : p
    ),
    efforts: (session.efforts || []).filter(e => !effortsToRemove.has(e.id)),
    capabilityEffortMaps: (session.capabilityEffortMaps || []).filter(
      cem => !effortsToRemove.has(cem.effortId)
    ),
    projectCapabilityMaps: [
      ...(session.projectCapabilityMaps || []),
      ...restoredProjectCapMaps,
    ],
    // Findings cannot be rolled back automatically — they are now first-class DIN entities.
    // Document this behavior in the undo confirmation dialog.
  };
}
```

Then the UI calls it like:
```typescript
// In ProjectPromotiePanel.tsx commit handler
const { updateSession } = useSession();

function handleCommit() {
  updateSession(prev => promoteProjectToEfforts(prev, projectId, aiResult, selections));
  addToast(`Project ${project.name} gepromoveerd tot ${selections.keptEfforts.length} inspanning(en).`, "success");
  onClose();
}

// In undo handler (in ExterneProjectenPanel promoted-projects toggle view)
function handleUndo(projectId: string) {
  if (!confirm("Weet je zeker dat je deze promotie wilt terugdraaien? Bevindingen die al zijn toegevoegd aan de DIN-keten blijven bestaan.")) return;
  updateSession(prev => undoProjectPromotion(prev, projectId));
  addToast("Promotie teruggedraaid.", "info");
}
```

### Anti-Patterns to Avoid
- **Chained `updateSession` calls:** Do NOT do `updateSession(...); updateSession(...);` — each call is a separate setState, triggers separate saves, and risks stale-prev read. Use one call with all mutations. (Phase 2 D-03.)
- **Mutating `prev` inside the updater:** Always return a new object via spread. Do NOT `prev.efforts.push(x)` — this mutates React state directly.
- **Storing findings in session state before user accepts them:** Findings are transient review-UI state. Persist only what the user clicks "Voeg toe aan DIN" on. Storing unreviewed findings breaks D-13 (niet geaccepteerde bevindingen worden niet persistent opgeslagen).
- **AI calling without retry wrapper:** Do NOT call `callClaude()` directly — use `callClaudeWithValidation(ProjectPromotieResultSchema, ...)` so the 2 silent retries kick in on malformed JSON (Phase 01 D-01).
- **Hardcoded IDs in the AI prompt:** Pass the actual session `benefits`/`capabilities` with their real IDs as structured input so the AI can reference them by ID in its response (same pattern as Phase 12 `matchProjectsToCapabilities` line 751-759).
- **Deleting the project on promotion:** D-08 is explicit — `promotedAt` marker, not deletion. Every filter in the UI that currently shows lopende projecten must add `.filter(p => !p.promotedAt)` for the default view.
- **Not filtering promoted projects from the Phase 12 inline rendering:** `DINMappingStep.tsx` §1781-1783 currently filters on `!p.buitenScope` and `projectCapabilityMaps.some(...)`. After Phase 14, promoted projects no longer have rows in `projectCapabilityMaps` (they've been converted to `capabilityEffortMaps`), so they'll auto-disappear from that list. But the outer `ExterneProjectenPanel` at §1831 (`.filter((p) => p.sectorId === activeSector)`) must be updated to also filter `!p.promotedAt`. Planner: verify both call sites in Wave 3.
- **Broadcasting originProjectId to non-Phase-14 schemas without backward-compat test:** Adding `originProjectId` to `DINBenefitSchema` would require a new backward-compat test. If the planner chooses to add it (for finding traceback per D-13), the test must cover "old sessions without this field still parse." The safest scope-minimal choice is to **only** add `originProjectId` to `DINEffortSchema` (the primary promotion target). Findings that create benefits/capabilities trace back via domain-level bookkeeping elsewhere or the field is deferred.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON parsing from Claude response | Custom regex / manual string splitting | `parseAIResponse()` + `callClaudeWithValidation()` from `ai-client.ts` (§62-155) | Already handles markdown code fences, malformed JSON, retry loop (Phase 01 D-01). |
| Atomic multi-field session update | Multiple `updateSession` calls chained with `await` / `useEffect` | Single `updateSession(prev => ({...multi-field Partial<DINSession>}))` | Phase 2 D-03: functional updater is the single atomic commit point. |
| Dual persistence (localStorage + Supabase) | Manual `localStorage.setItem` in components | The existing `updateSession` updater already does this via `saveLocal()` | All persistence flows through `session-context.tsx` — do not bypass. |
| UUID generation | `Math.random()`, timestamp IDs, counter-based IDs | `generateId()` from `din-service.ts` (wraps `crypto.randomUUID()`) | Consistent across all entities; collision-free per Phase 01. |
| Deduplication after AI regeneration | Custom Set tracking in component | `deduplicateById()` from `persistence.ts` | Established utility. |
| Methodiek validation of AI effort output | Re-implementing title-is-werkwoord / description-is-concrete rules | `validateInspanning()` / `validateBaat()` / `validateVermogen()` from `din-validation.ts` | Phase 04 already built this. Post-validate every split effort before committing. |
| Sector name validation | String literals in components | `SectorNameSchema` enum + `SECTORS` constant from `types.ts` | Single source of truth. |
| Layered system prompt assembly | Custom string concatenation with programmaboek snippets | `assembleSystemPrompt()` + `buildSectorwerkBlock()` + `buildCompletedGoalsContext()` from `prompt-assembly.ts` | Phase 03-06 established this pipeline; promotion-prompt should get the same context layering for methodiek-conformity. |
| Toast notifications | Custom notification components | `useToast` / `addToast` from `@/components/ui/Toast` | Phase 02 standardized this. |

**Key insight:** Phase 14 is an extension, not a greenfield. Every question of "how should I build X?" has a tested answer somewhere in Phases 01-12. The planner's job is to wire them together; the researcher's job is to point at the exact files. Everything in this section points at a specific file in the repo.

## Runtime State Inventory

Phase 14 is a pure **additive code/schema extension**. It introduces new optional fields on existing schemas (`ExternalProject.promotedAt`, `ExternalProject.promotedToEffortIds`, `DINEffort.originProjectId`), not renames or migrations. There is no external runtime state to audit.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no rename, no key changes. New optional fields default to `undefined` and existing localStorage sessions parse cleanly against extended schemas (verified against Phase 01 convention: `.optional()` without `.default()` preserves backward compat). | None |
| Live service config | None — app is single-user localStorage-first, no external services configured per sector/project name. Supabase integration (`src/lib/supabase.ts`) uses anon key only and is not wired to per-project keys. | None |
| OS-registered state | None — no OS-level registrations (no Task Scheduler, no services, no pm2). | None |
| Secrets/env vars | None — only `ANTHROPIC_API_KEY` is referenced (checked at runtime in API routes) and it's unchanged. No new env vars required for Phase 14. | None |
| Build artifacts | None — no generated files reference Phase 14 entities. `programmaboek-context.ts` (build-time generated from `docs/programmaboek.doc`) does not reference project promotion. | None |

**The canonical question:** *After every file in the repo is updated, what runtime systems still have old state cached?*
**Answer:** None. Phase 14 adds fields; it does not rename or migrate anything. Existing sessions in users' browsers will parse against the extended schemas because all new fields are `.optional()` without `.default()`. When a user promotes a project for the first time, the new fields get populated on that project only.

## Common Pitfalls

### Pitfall 1: Zod `.optional()` vs `.optional().default([])` mismatch breaks TypeScript inference
**What goes wrong:** If `promotedToEffortIds` is declared as `z.array(z.string()).optional().default([])`, TypeScript infers the type as `string[]` (not `string[] | undefined`), because `.default()` makes the output type non-optional. But object literals that construct `ExternalProject` without this field will then fail type-check.

**Why it happens:** Zod's `.default()` on `.optional()` asserts the field will always be present in the output shape, and TypeScript reflects this.

**How to avoid:** Follow the Phase 01 convention: use `.optional()` WITHOUT `.default()` for all new fields. Verified in `schemas.ts` §148-149 (`approvalStatus`, `approvalDate` use `.optional()` alone). This makes the inferred type `string | undefined` and existing object constructors like `createEffort()` in `din-service.ts` continue to compile without modification.

**Warning signs:**
- `npm run build` fails with `Property 'promotedToEffortIds' is missing in type...` on `createBenefit()`/`createEffort()`/`createCapability()` helpers.
- Existing tests fail because minimal-session fixtures lack the new field.

### Pitfall 2: AI returns `capabilityId` values that don't exist in session
**What goes wrong:** AI hallucinates capability IDs or returns the `description` instead of the `id`. The subsequent `capabilityEffortMaps` commit creates maps pointing at non-existent capabilities; the DIN-keten becomes inconsistent and the UI renders orphaned chips.

**Why it happens:** Even with explicit "gebruik capabilityId" instruction, LLMs occasionally substitute human-readable strings when they look similar to IDs.

**How to avoid:**
1. In the prompt, send capabilities as structured JSON with the exact ID field name: `[{"id": "cap-uuid-xxx", "description": "..."}]`. This is how `matchProjectsToCapabilities` already works (line 751-759).
2. **After Zod validation**, do a post-parse consistency check: filter `result.capabilityMatches` to only rows where `capabilityId` exists in `session.capabilities`. Drop invalid ones and log a warning.
3. In the review UI, render the capability by lookup: `capabilities.find(c => c.id === match.capabilityId)`. If not found, show an orange "AI-fout" chip that the user must manually remap or remove.

**Warning signs:**
- Unit test for `ProjectPromotieResultSchema.safeParse` passes but live calls produce invalid IDs.
- Review UI shows blank capability names.

### Pitfall 3: `updateSession` callback reading stale `session` from closure
**What goes wrong:** Component captures `session` from `useSession()` in a closure, then inside an async AI handler does `updateSession(prev => ({...session, efforts: ...}))` using the captured `session` — reading stale data.

**Why it happens:** JavaScript closures capture by reference. The `session` variable points at the snapshot from the last render, not the current state at the time the callback runs.

**How to avoid:** Only use `prev` inside the updater. Never reference the outer `session` variable inside the updater callback. This is explicit in Phase 2 D-03 and enforced by the test suite (`src/lib/__tests__/session-context.test.ts`).

**Warning signs:**
- User promotes project A, then quickly promotes project B, then undoes A — promotion B appears to "lose" its efforts.
- Test: `applySessionUpdate` unit test covers this case.

### Pitfall 4: Findings click-to-add creates duplicate entities on double-click
**What goes wrong:** User clicks "Voeg toe aan DIN" twice in quick succession; two `updateSession` calls fire; two `DINBenefit` entries created with identical content and different IDs.

**Why it happens:** No idempotency on the findings list; each click adds a new entity.

**How to avoid:**
1. After click, immediately remove the finding from the local review state (`setFindings(prev => prev.filter(f => f !== thisFinding))`). This also serves as visual feedback that the click registered.
2. Disable the button during the click handler (use an `isAdding` state or check if the finding is still in the list).
3. Unit test: simulate two rapid clicks, assert only one entity created.

**Warning signs:**
- After promotion, session has 2x the expected finding entities.
- User reports "same suggestion appeared twice."

### Pitfall 5: Inline project filter in `DINMappingStep.tsx` §1781-1783 double-counts after promotion
**What goes wrong:** Current inline-project rendering filters on `!buitenScope && projectCapabilityMaps.some(...)`. After promotion, `projectCapabilityMaps` rows are deleted, so the project disappears from that rendering — correct. BUT the outer `ExterneProjectenPanel` at §1831 still receives the full `.filter(p => p.sectorId === activeSector)` list and will show the promoted project in its import list unless we also filter `!p.promotedAt`.

**Why it happens:** Two separate filters in two separate views; only one gets updated if the planner misses the second.

**How to avoid:** Planner checklist — verify BOTH call sites in `DINMappingStep.tsx`:
1. §1783: `.filter(p => p.sectorId === activeSector && !p.buitenScope && projectCapabilityMaps.some(...))` — no change needed (auto-filtered via empty maps).
2. §1833: `.filter((p) => p.sectorId === activeSector)` — **ADD `&& !p.promotedAt`** (or use a toggle if the "Toon gepromoveerde" schakelaar is active).

**Warning signs:**
- Promoted project still appears in the "Bevestigde projecten" list.
- Test: integration check that `inScopeProjects` in `ExterneProjectenPanel` excludes promoted items.

### Pitfall 6: `validateInspanning()` post-validation corrections silently drop effort data
**What goes wrong:** Phase 04 `validateInspanning()` may strip or rewrite title/description if they fail methodiek rules (e.g., title not in vergrotende trap for baten). After AI returns split efforts, running them through validation may lose the rationale or change the intent.

**Why it happens:** `din-validation.ts` is a correction layer, not a pass-through.

**How to avoid:** Either (a) show corrections in the review UI so the user sees what validation changed, (b) only run validation for warnings (not corrections) on promotion flow, or (c) skip post-validation entirely for the promotion call and rely on the prompt-level constraints. Planner decides based on Phase 04 test coverage.

**Warning signs:**
- AI returns rich effort titles; committed efforts have generic titles.
- Tests of `validateInspanning()` show transformations beyond warnings.

### Pitfall 7: Schema addition breaks `DINSessionSchema` parse on load
**What goes wrong:** Even though new fields are optional, if a developer accidentally makes one required (forgets `.optional()`), all existing localStorage sessions fail `DINSessionSchema.safeParse` on load and users see "Sessie laden..." forever.

**Why it happens:** `session-context.tsx` `loadSession` currently does NOT actually run `DINSessionSchema.safeParse` (only migrates `sectorAnalyses`), so this particular pitfall is **partially mitigated** by the fact that schema validation doesn't happen on session load. But future tasks or verifier runs may add strict validation.

**How to avoid:** Unit test in `external-project-schema.test.ts` and `schemas.test.ts` must include a minimal-session test that verifies a session with NO `promotedAt`, NO `originProjectId`, NO `promotedToEffortIds` parses as success. Extend the existing Test 10 pattern (line 121-124 of `external-project-schema.test.ts`).

**Warning signs:**
- `DINSessionSchema.safeParse(oldSession)` returns `success: false`.
- Users report "mijn sessie kan niet geladen worden."

## Code Examples

Verified patterns from the existing codebase; Phase 14 plans must reference these exact files.

### Example 1: AI client wrapper for combined response (new function)
```typescript
// src/lib/ai-client.ts — add after matchProjectsToCapabilities (line 751)

import { ProjectPromotieResultSchema } from "./schemas";
import type { DINBenefit, DINCapability, ExternalProject } from "./types";
import { PROJECT_PROMOTIE_PROMPT } from "./prompts";
import { assembleSystemPrompt, extractKiBContext, buildSectorwerkBlock, buildCompletedGoalsContext } from "./prompt-assembly";
import type { KiBContext, CompletedGoalContext } from "./prompt-assembly";
import type { SectorplanAnalyseResult } from "./types";

export async function promoteExternalProject(
  project: ExternalProject,
  sectorBenefits: DINBenefit[],
  sectorCapabilities: DINCapability[],
  sectorName: string,
  options: {
    kibContext?: KiBContext | null;
    sectorAnalysis?: SectorplanAnalyseResult | null;
    completedGoalItems?: CompletedGoalContext;
    priorProjectCapabilityIds?: string[]; // From existing projectCapabilityMaps (optional context)
  }
): Promise<{ success: true; data: z.infer<typeof ProjectPromotieResultSchema> } | { success: false; error: string }> {
  // Assemble layered system prompt (programmaboek + KiB + sectorwerk + completed goals)
  let systemPrompt = assembleSystemPrompt(
    PROJECT_PROMOTIE_PROMPT,
    "inspanning-create",
    undefined,
    options.kibContext
  );
  if (options.sectorAnalysis) {
    systemPrompt += buildSectorwerkBlock(options.sectorAnalysis);
  }
  if (options.completedGoalItems && options.completedGoalItems.length > 0) {
    systemPrompt += buildCompletedGoalsContext(options.completedGoalItems);
  }

  // Build user message with structured IDs (see Pitfall 2)
  const parts: string[] = [];
  parts.push(`Sector: ${sectorName}`);
  parts.push(`\nTe promoveren project:`);
  parts.push(`- Naam: ${project.name}`);
  parts.push(`- Beschrijving: ${project.description}`);
  parts.push(`- Status: ${project.status}`);
  if (project.domains?.length) {
    parts.push(`- Domeinen: ${project.domains.join(", ")}`);
  }
  if (project.relevance) {
    parts.push(`- Relevantie: ${project.relevance}`);
  }
  if (options.priorProjectCapabilityIds?.length) {
    parts.push(`- Eerder (Phase 12) gekoppeld aan vermogens: ${options.priorProjectCapabilityIds.join(", ")}`);
  }

  parts.push(`\nBeschikbare DIN-baten voor sector ${sectorName} (gebruik benefitId in response):`);
  parts.push(JSON.stringify(
    sectorBenefits.map(b => ({
      id: b.id,
      title: b.title || b.description.slice(0, 60),
      description: b.description,
      indicator: b.profiel?.indicator,
    })),
    null,
    2
  ));

  parts.push(`\nBeschikbare DIN-vermogens voor sector ${sectorName} (gebruik capabilityId in response):`);
  parts.push(JSON.stringify(
    sectorCapabilities.map(c => ({
      id: c.id,
      title: c.title || c.description.slice(0, 60),
      description: c.description,
    })),
    null,
    2
  ));

  parts.push(`\nPromoveer het project volgens de DIN-methodiek. Retourneer JSON volgens het schema in de system-prompt.`);

  return callClaudeWithValidation(
    ProjectPromotieResultSchema,
    systemPrompt,
    parts.join("\n"),
    { maxTokens: 8192, model: "claude-opus-4-6" } // Opus for multi-concept reasoning
  );
}
```

### Example 2: API route (mirroring match-projects pattern)
```typescript
// src/app/api/promote-project/route.ts — NEW FILE

import { NextRequest, NextResponse } from "next/server";
import { promoteExternalProject } from "@/lib/ai-client";
import { extractKiBContext } from "@/lib/prompt-assembly";
import type { SectorplanAnalyseResult } from "@/lib/types";
import type { CompletedGoalContext } from "@/lib/prompt-assembly";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project,
      sectorBenefits,
      sectorCapabilities,
      sectorName,
      kibGoals,
      kibScope,
      sectorAnalysis,
      completedGoalItems,
      priorProjectCapabilityIds,
    } = body;

    if (!project || !sectorName) {
      return NextResponse.json(
        { success: false, error: "project en sectorName zijn verplicht" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "ANTHROPIC_API_KEY niet geconfigureerd. AI-promotie niet beschikbaar.",
      }, { status: 503 });
    }

    const kibContext = extractKiBContext({ goals: kibGoals, scope: kibScope });

    const result = await promoteExternalProject(
      project,
      sectorBenefits || [],
      sectorCapabilities || [],
      sectorName,
      {
        kibContext,
        sectorAnalysis: sectorAnalysis as SectorplanAnalyseResult | null,
        completedGoalItems: completedGoalItems as CompletedGoalContext | undefined,
        priorProjectCapabilityIds,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, retryable: true },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Fout bij promotie-aanroep",
      },
      { status: 500 }
    );
  }
}
```

### Example 3: Schema extensions (exact diff)
```typescript
// src/lib/schemas.ts — modifications

// (1) Line 136-153: DINEffortSchema — add originProjectId
export const DINEffortSchema = z.object({
  id: z.string(),
  sectorId: z.string(),
  title: z.string().optional(),
  description: z.string(),
  domain: EffortDomainSchema,
  quarter: z.string().optional(),
  responsibleSector: z.string().optional(),
  status: EffortStatusSchema,
  dependencies: z.array(z.string()),
  votes: z.number().optional(),
  opmerking: z.string().optional(),
  approvalStatus: ApprovalStatusSchema.optional(),
  approvalDate: z.string().optional(),
  dossier: InspanningsDossierSchema.optional(),
  consolidated: z.boolean().optional(),
  consolidatedInto: z.string().optional(),
  originProjectId: z.string().optional(), // NEW Phase 14 D-09
});

// (2) Line 155-166: ExternalProjectSchema — add promotedAt + promotedToEffortIds
export const ExternalProjectSchema = z.object({
  id: z.string(),
  sectorId: z.string(),
  name: z.string(),
  description: z.string(),
  status: EffortStatusSchema,
  relevance: z.string().optional(),
  domains: z.array(EffortDomainSchema).optional().default([]),
  linkedCapabilityIds: z.array(z.string()).optional().default([]),
  aiWarning: z.string().optional(),
  buitenScope: z.boolean().optional().default(false),
  promotedAt: z.string().optional(),                   // NEW Phase 14 D-08
  promotedToEffortIds: z.array(z.string()).optional(), // NEW Phase 14 D-08 — no .default() per Pitfall 1
});
```

Note the intentional asymmetry: `domains` and `linkedCapabilityIds` use `.optional().default([])` (Phase 12 convention), but new `promotedToEffortIds` uses `.optional()` WITHOUT `.default()`. Phase 01 D-XX convention is `.optional()` without default; Phase 12 drifted for project-specific fields. For Phase 14, stick with the purer Phase 01 convention to avoid TypeScript inference surprises (Pitfall 1).

### Example 4: Test pattern for schema extension
```typescript
// src/lib/__tests__/external-project-schema.test.ts — append

describe("ExternalProjectSchema Phase 14 promotion fields", () => {
  const baseProject = {
    id: "x",
    sectorId: "PO",
    name: "Test",
    description: "Desc",
    status: "in_uitvoering" as const,
  };

  it("Test 11: accepts promotedAt ISO string", () => {
    const result = ExternalProjectSchema.parse({
      ...baseProject,
      promotedAt: "2026-04-05T12:34:56.000Z",
    });
    expect(result.promotedAt).toBe("2026-04-05T12:34:56.000Z");
  });

  it("Test 12: accepts promotedToEffortIds array", () => {
    const result = ExternalProjectSchema.parse({
      ...baseProject,
      promotedToEffortIds: ["eff-1", "eff-2"],
    });
    expect(result.promotedToEffortIds).toEqual(["eff-1", "eff-2"]);
  });

  it("Test 13: backward-compat — project without promoted fields still parses", () => {
    const result = ExternalProjectSchema.parse(baseProject);
    expect(result.promotedAt).toBeUndefined();
    expect(result.promotedToEffortIds).toBeUndefined();
  });

  it("Test 14: promotedToEffortIds not defaulted to []", () => {
    const result = ExternalProjectSchema.parse(baseProject);
    // Pitfall 1: should be undefined, not []
    expect(result.promotedToEffortIds).toBeUndefined();
  });
});

describe("DINEffortSchema Phase 14 originProjectId", () => {
  const baseEffort = {
    id: "e1",
    sectorId: "PO",
    description: "Training klantgesprek",
    domain: "mens" as const,
    status: "in_uitvoering" as const,
    dependencies: [],
  };

  it("Test 15: accepts originProjectId", () => {
    const result = DINEffortSchema.parse({
      ...baseEffort,
      originProjectId: "proj-uuid-xyz",
    });
    expect(result.originProjectId).toBe("proj-uuid-xyz");
  });

  it("Test 16: backward-compat — effort without originProjectId still parses", () => {
    const result = DINEffortSchema.parse(baseEffort);
    expect(result.originProjectId).toBeUndefined();
  });
});
```

### Example 5: Test pattern for ProjectPromotieResultSchema
```typescript
// src/lib/__tests__/schemas.test.ts — append (or create project-promotion-schema.test.ts)

describe("ProjectPromotieResultSchema", () => {
  const valid = {
    benefitMatches: [{ benefitId: "b1", toelichting: "raakt NPS" }],
    capabilityMatches: [{ capabilityId: "c1", toelichting: "bouwt klantgesprek-vermogen op" }],
    splitEfforts: [
      {
        title: "Training Q1",
        description: "Bouw competentie",
        domain: "mens" as const,
        status: "in_uitvoering" as const,
        quarter: "Q1 2026",
        dossier: {
          eigenaar: "Sectormanager",
          inspanningsleider: "HR-lead",
          verwachtResultaat: "80% medewerkers getraind",
          kostenraming: "€50k",
          randvoorwaarden: "Zaal beschikbaar",
        },
        rationale: "Project valt methodisch onder mens-domein",
      },
    ],
    findings: [
      {
        type: "vermogen" as const,
        beschrijving: "Meten van klantreis-kwaliteit",
        toelichting: "Project impliceert dit maar voert het niet uit",
        targetSector: "PO" as const,
      },
    ],
    samenvatting: "Project gepromoveerd tot 1 mens-inspanning.",
  };

  it("accepts full valid response", () => {
    const result = ProjectPromotieResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects 0 split efforts", () => {
    const result = ProjectPromotieResultSchema.safeParse({ ...valid, splitEfforts: [] });
    expect(result.success).toBe(false);
  });

  it("rejects 5 split efforts (max 4 per D-05)", () => {
    const result = ProjectPromotieResultSchema.safeParse({
      ...valid,
      splitEfforts: Array(5).fill(valid.splitEfforts[0]),
    });
    expect(result.success).toBe(false);
  });

  it("rejects 0 capability matches", () => {
    const result = ProjectPromotieResultSchema.safeParse({ ...valid, capabilityMatches: [] });
    expect(result.success).toBe(false);
  });

  it("accepts empty benefitMatches and findings", () => {
    const result = ProjectPromotieResultSchema.safeParse({
      ...valid,
      benefitMatches: [],
      findings: [],
    });
    expect(result.success).toBe(true);
  });

  it("defaults status to in_uitvoering on split effort", () => {
    const { status, ...effortWithoutStatus } = valid.splitEfforts[0];
    void status;
    const result = ProjectPromotieResultSchema.safeParse({
      ...valid,
      splitEfforts: [effortWithoutStatus],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.splitEfforts[0].status).toBe("in_uitvoering");
    }
  });

  it("rejects finding with invalid type", () => {
    const result = ProjectPromotieResultSchema.safeParse({
      ...valid,
      findings: [{ ...valid.findings[0], type: "risico" }],
    });
    expect(result.success).toBe(false);
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Extract-projects + match-projects as two separate calls (Phase 12) | Single combined call for full promotion (Phase 14) | This phase | 1 AI call latency instead of 2; guaranteed internal consistency between benefit/capability/effort recommendations |
| `projectCapabilityMap` as parallel mapping channel (Phase 12) | Convert to standard `capabilityEffortMap` on promotion (Phase 14) | This phase | DIN-keten has single canonical mapping pattern post-promotion |
| Lopende projecten as inline "inspanning-achtige" badge display | Lopende projecten exist as dual-state: unprompted (badge) OR promoted (full efforts in chain) | This phase | Stakeholders see consistent methodiek regardless of project origin |
| AI post-validation (Phase 04 `validateInspanning`) only applied at DIN-mapping generation time | Post-validation **optional** on promotion split efforts — recommendation: warnings-only | This phase | Prevents silent corrections on AI-generated effort data |

**Deprecated/outdated within Phase 14 scope:**
- None — Phase 14 is additive. No prior code is removed.

## Open Questions

1. **Should `DINBenefitSchema` and `DINCapabilitySchema` also get `originProjectId`?**
   - What we know: D-13 says "nieuw DIN-element wordt direct aangemaakt in de sessie met `originProjectId` terugverwijzing naar het bron-project." This strongly implies benefits and capabilities created from findings should also carry this field.
   - What's unclear: Only `DINEffortSchema` is listed in canonical_refs (§114-153) as the schema to extend. Adding the field to all three requires three test updates and three schema modifications.
   - Recommendation: **Planner decision in Wave 0.** Safest scope-minimal: add `originProjectId` to `DINEffortSchema` only (primary promotion target per D-09). For findings that create benefits/capabilities, skip the field in Phase 14 and document as known limitation. If the planner wants full traceback, add to all three but include additional backward-compat tests.

2. **How does a finding of type `baat` pick a `goalId`?**
   - What we know: `DINBenefitSchema` requires `goalId` (line 116, not optional). A new baat must belong to a goal.
   - What's unclear: The AI doesn't know which goal the finding-baat should attach to. Possible solutions:
     - (a) Prompt constrains findings to reference a `goalId` from session.goals.
     - (b) Review UI shows a goal-picker dropdown on "Voeg toe aan DIN" click for baat-type findings.
     - (c) Finding creates a "dangling" baat with empty `goalId` that the user must resolve later (would break existing DIN-mapping step assumptions).
   - Recommendation: **Option (b)** — goal-picker dropdown appears when user clicks "Voeg toe aan DIN" on a baat-finding. Minimal AI complexity, explicit user control. Planner should consider whether to reflect `goalId?: string` in `FindingSuggestionSchema` so AI can suggest a goal hint.

3. **Should `validateInspanning()` run on split efforts before commit?**
   - What we know: Phase 04 provides `validateInspanning()` which returns `{item, corrections, warnings}`. Corrections can modify the AI's output.
   - What's unclear: Whether the correction behavior is safe for promotion (where user has already reviewed the AI output).
   - Recommendation: **Run it in warnings-only mode** — extract warnings from the result, show as amber badges in the review card, but use the original AI title/description (ignore corrections). This gives the user signal without overwriting their review decisions.

4. **Can a user re-promote an already-promoted project after undo?**
   - What we know: D-11 says undo is always available. Nothing explicit on re-promotion.
   - What's unclear: After undo, the project is back in active list with cleared `promotedAt`. Clicking promotion again should work — no state prevents it. But the AI will see the project fresh and may produce different splits.
   - Recommendation: **Allow it.** The result may differ because AI is non-deterministic and session context may have changed. This is expected behavior. Document in plan verification step: "Undo + re-promotion is supported; results may vary."

5. **Display order when multiple projects are promoted?**
   - What we know: CONTEXT.md doesn't specify "Toon gepromoveerde projecten" sort order.
   - What's unclear: Sort by `promotedAt` desc (most recent first) vs. alphabetical vs. by sector.
   - Recommendation: **`promotedAt` desc** — most recently promoted first. Aligns with audit-log convention and makes undo of the last action most discoverable.

## Environment Availability

Phase 14 is pure code/config change with no new external tools, services, or runtimes.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `npm run build`, `npm run dev`, `vitest` | ✓ | Existing (Next.js 16 requires 16.8+) | — |
| `@anthropic-ai/sdk` | `promoteExternalProject()` AI call | ✓ | ^0.78.0 | — |
| `ANTHROPIC_API_KEY` env var | Runtime AI call | Runtime-dependent (guarded by `process.env.ANTHROPIC_API_KEY` check in API route, returns 503 with Dutch error) | — | Graceful degradation — API route returns 503 with "ANTHROPIC_API_KEY niet geconfigureerd" message |
| `zod` | Schema validation | ✓ | Transitive via existing schemas | — |
| `vitest` | Unit tests | ✓ | ^4.1.2 | — |
| `next` | API route + App Router | ✓ | ^16.1.0 | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None. `ANTHROPIC_API_KEY` at runtime is handled by existing guard pattern (see `match-projects/route.ts` line 16-24) — test environments without the key get 503 responses, which the UI must handle gracefully (show "promotie niet beschikbaar" message instead of crashing).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 (verified in `package.json` devDependencies) |
| Config file | Existing vitest config (inferred from `src/lib/__tests__/*.test.ts` patterns) |
| Quick run command | `npx vitest run src/lib/__tests__/external-project-schema.test.ts src/lib/__tests__/project-promotion.test.ts` |
| Full suite command | `npx vitest run` |
| Lint command | `npm run lint` |
| Build command | `npm run build` |
| Type-check | via `npm run build` (Next.js compiles with `strict: true`) |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-02 | `ProjectPromotieResultSchema.safeParse` accepts a full valid AI response with benefit matches + capability matches + 1-4 split efforts + findings | unit (Zod schema) | `npx vitest run src/lib/__tests__/project-promotion-schema.test.ts` | Wave 0 — NEW FILE |
| D-05 | `splitEfforts` array is rejected at 0 or at 5+ items (`.min(1).max(4)`) | unit (Zod schema) | idem, `-t "rejects 0 split efforts"`, `-t "rejects 5 split efforts"` | Wave 0 |
| D-07 | `AIPromotedEffortSchema` defaults `status` to `"in_uitvoering"` when AI omits it | unit (Zod schema) | idem, `-t "defaults status"` | Wave 0 |
| D-08 | `ExternalProjectSchema` accepts `promotedAt` (ISO string) and `promotedToEffortIds` (string[]) and parses existing projects without them | unit (Zod schema) | `npx vitest run src/lib/__tests__/external-project-schema.test.ts` | Extend existing file — Wave 0 |
| D-09 | `DINEffortSchema` accepts `originProjectId` and parses existing efforts without it (backward-compat) | unit (Zod schema) | `npx vitest run src/lib/__tests__/external-project-schema.test.ts -t "originProjectId"` | Extend existing file — Wave 0 |
| D-10 | `promoteProjectToEfforts()` pure function atomically: marks project promoted, creates efforts, creates capabilityEffortMaps, removes projectCapabilityMaps for that project | unit (pure function) | `npx vitest run src/lib/__tests__/project-promotion.test.ts -t "promote mutation"` | Wave 0 — NEW FILE |
| D-11 | `undoProjectPromotion()` pure function restores projectCapabilityMaps from capabilityEffortMaps, removes the promoted efforts, clears `promotedAt` + `promotedToEffortIds` | unit (pure function) | `npx vitest run src/lib/__tests__/project-promotion.test.ts -t "undo mutation"` | Wave 0 — NEW FILE |
| D-14 | `FindingSuggestionSchema` enum discriminates type in `['baat', 'vermogen', 'inspanning']`; invalid types rejected | unit (Zod schema) | `npx vitest run src/lib/__tests__/project-promotion-schema.test.ts -t "finding"` | Wave 0 |
| D-01, D-04, D-06, D-13 (UI) | Promotion button exists on project card, review screen renders benefit/capability/effort/findings, user can reduce split count, findings are click-to-add | component-manual | Handmatige UAT via `npm run dev` + checklist in plan verification step | — (no @testing-library/react in project) |
| AI contract (D-02, D-14) | Live AI calls return `ProjectPromotieResult`-shaped JSON; invalid responses trigger 2 silent retries then 422 | runtime (callClaudeWithValidation) | No unit test — exercised live during UAT; Zod catches violations | — |
| Pitfall 2 (capability ID consistency) | AI-returned `capabilityId` values exist in session.capabilities; orphans filtered in post-parse | unit (pure filter function, extract from API route) | `npx vitest run src/lib/__tests__/project-promotion.test.ts -t "consistency check"` | Wave 0 — NEW FILE |
| Pitfall 5 (DINMappingStep filter) | Promoted projects filtered from `ExterneProjectenPanel` default view | integration-manual | UAT: promote a project, verify it disappears from "Bevestigde projecten" list | — |
| CLAUDE.md methodiek | `validateInspanning()` warnings surface on split efforts in review UI | unit (warning pass-through) | `npx vitest run src/lib/__tests__/project-promotion.test.ts -t "validation warnings"` | Wave 0 — NEW FILE (optional, depends on planner decision on Open Question 3) |

### Sampling Rate
- **Per task commit:** `npm run lint && npm run build` (always) + `npx vitest run src/lib/__tests__/external-project-schema.test.ts src/lib/__tests__/project-promotion*.test.ts` (when touching schemas, ai-client, or din-service)
- **Per wave merge:** `npx vitest run` (full Vitest suite) + `npm run build`
- **Phase gate:** Full suite green + `npm run build` green + manual UAT checklist from plan verification steps (promote a test project, verify split efforts appear in keten, verify findings click-to-add works, verify undo restores state, verify backward compat with a pre-Phase-14 session)

### Wave 0 Gaps
- [ ] `src/lib/__tests__/project-promotion-schema.test.ts` — NEW FILE — covers `ProjectPromotieResultSchema`, `FindingSuggestionSchema`, `AIPromotedEffortSchema` shape + min/max constraints + defaults
- [ ] `src/lib/__tests__/project-promotion.test.ts` — NEW FILE — covers `promoteProjectToEfforts()` and `undoProjectPromotion()` as pure functions; uses mock `DINSession` fixture similar to `consolidation.test.ts` pattern (§18-68 of `src/lib/__tests__/consolidation.test.ts`)
- [ ] Extend `src/lib/__tests__/external-project-schema.test.ts` — add Tests 11-14 for `promotedAt` / `promotedToEffortIds` / backward compat
- [ ] Extend same file — add Tests 15-16 for `DINEffortSchema.originProjectId`
- [ ] (Optional, if planner chooses) Integration smoke test for `/api/promote-project` — skip by default since project has no existing API route tests

**No framework install needed:** Vitest 4.1.2 already in devDependencies.

**Unit test priority:** The promotion mutation (`promoteProjectToEfforts`) is the single highest-risk piece of code in this phase — it touches 5 session arrays atomically and has subtle ID-threading logic. It MUST have dedicated unit tests with multiple fixture scenarios (1 effort, 4 efforts, multiple capabilities, no benefits, with findings, empty findings). The schema tests are smaller wins but also cheap to write.

## Sources

### Primary (HIGH confidence — file-verified in the repo)
- `src/lib/schemas.ts` §114-200, 497-716 — All schemas to extend and existing AI schema patterns
- `src/lib/ai-client.ts` §1-155, 740-759 — `callClaudeWithValidation` retry loop and `matchProjectsToCapabilities` pattern to mirror
- `src/lib/prompts.ts` §702-728 — `PROJECT_EXTRACTION_PROMPT` and `PROJECT_CAPABILITY_MATCHING_PROMPT` as the closest prior-art prompts
- `src/lib/prompt-assembly.ts` §48-72, 374-400 — `assembleSystemPrompt` layered context pipeline with use-case-specific programmaboek slices
- `src/lib/session-context.tsx` §160-185 — Functional `updateSession` pattern (Phase 2 D-03 authoritative implementation)
- `src/lib/persistence.ts` §40-47 — `deduplicateById` helper
- `src/lib/din-service.ts` §1-160 — `generateId`, CRUD helpers, extension pattern
- `src/components/din/ExterneProjectenPanel.tsx` §1-900 — Existing Phase 12 panel where promotion button lands
- `src/components/din/AIKoppelingPanel.tsx` §1-308 — Existing AI-suggest + review pattern (pre-accept + toggle)
- `src/components/steps/DINMappingStep.tsx` §1780-1870 — Inline project rendering + `ExterneProjectenPanel` embed site (needs `!p.promotedAt` filter addition)
- `src/app/api/match-projects/route.ts` §1-52 — Closest API route pattern; new `promote-project` route mirrors this exactly
- `src/app/api/din-suggest/route.ts` §1-80 — Layered prompt assembly in route handler pattern
- `src/lib/__tests__/external-project-schema.test.ts` §1-125 — Test extension template
- `src/lib/__tests__/consolidation.test.ts` §1-80 — Pure-function mutation testing with `DINSession` fixture pattern
- `src/lib/word-export.ts` §1020-1060 — `externalProjectsSection()`; no changes required in Phase 14 scope (CONTEXT.md "Integration Points")
- `.planning/phases/12-lopende-projecten-invullen-in-din-netwerk/12-CONTEXT.md` — Phase 12 data model + AI-suggest pattern that Phase 14 extends
- `.planning/phases/11-cross-analyse-herontwerp-stapsgewijs-traject-met-consolidatie/11-CONTEXT.md` — D-11/D-12 manual analyse button + cumulative context pattern
- `./CLAUDE.md` — Project constraints (Dutch, Cito branding, dual persistence, `npm run build` on every change)
- `.planning/STATE.md` "Accumulated Context" — Phase 01-12 decisions referenced in code examples
- `package.json` — Confirmed dependencies: Vitest 4.1.2, Zod (transitive), Anthropic SDK 0.78.0, Next 16.1.0

### Secondary (MEDIUM confidence — web-verified)
- [Claude Sonnet 4.6 max_tokens API docs (64k standard output)](https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-6) — Confirms combined-shot promotion call is well within budget

### Tertiary (LOW confidence)
- None — all Phase 14 recommendations are derived from existing repo code with file references.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library already in `package.json`, no new dependencies
- Architecture: HIGH — every pattern demonstrated in existing Phases 01-12 code
- Pitfalls: HIGH for Pitfalls 1-5, MEDIUM for Pitfalls 6-7 (depend on planner decisions on post-validation and on `DINSessionSchema` load-time parse)
- Validation architecture: HIGH — mirrors Phase 13 research format and existing Vitest test patterns
- Open questions: 5 questions flagged explicitly; all have recommended default answers that a planner can pick up without further research

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (30 days — research depends on stable codebase structure, low risk of drift since Phase 14 builds on Phase 12 which is complete)

## RESEARCH COMPLETE

**Phase:** 14 — Lopende projecten promoveren tot volwaardige inspanningen in DIN-keten met splitsing en bevindingen-afleiding
**Confidence:** HIGH

### Key Findings

1. **Zero new dependencies.** Every library, hook, schema pattern, AI-call wrapper, persistence rule, and UI component needed is already in the codebase. Phase 14 is a targeted additive extension of Phase 12's data model and AI pipeline.

2. **Single combined AI call is the correct shape (D-02).** Claude Sonnet/Opus 4.6 has 64k max output tokens — far beyond the ~4-8k this payload needs. One call gives the AI the full reasoning context for baat + vermogen + split + findings internal consistency. Use Opus 4.6 (same choice as cross-analyse) for multi-concept reasoning. The Zod schema is `ProjectPromotieResultSchema` with nested `benefitMatches` / `capabilityMatches` / `splitEfforts` / `findings` / `samenvatting`. `splitEfforts.min(1).max(4)` enforces D-05 natively.

3. **Atomic mutation via single `updateSession(prev => ...)` is non-negotiable.** Promotion touches 5 session arrays (externalProjects, efforts, capabilityEffortMaps, projectCapabilityMaps, plus benefits/capabilities if findings accepted). All must be in one functional updater so React commits them atomically and localStorage saves once. Two new pure functions in `din-service.ts` — `promoteProjectToEfforts()` and `undoProjectPromotion()` — encapsulate the mutation logic and are unit-testable without React.

4. **Schema backward-compat requires Phase 01 convention: `.optional()` WITHOUT `.default()`.** Three new fields (`ExternalProject.promotedAt`, `ExternalProject.promotedToEffortIds`, `DINEffort.originProjectId`) are all additive. Adding `.default([])` on `promotedToEffortIds` would break TypeScript inference on existing `createEffort()` constructors (see Pitfall 1). Existing sessions in localStorage parse cleanly because `session-context.tsx` does not run `DINSessionSchema.safeParse` on load, but schema-level tests must still confirm backward compat.

5. **UI should be a new `ProjectPromotiePanel.tsx` component (NOT an extension of `AIKoppelingPanel.tsx`).** `AIKoppelingPanel` is tuned for the project -> capability matching concern (3 prop types, specific `AIMatchResult` shape). Promotion is fundamentally larger: benefit matches + capability matches + effort splits + findings. Extending would double the component's complexity. New component keeps both flows clean and colocated in `src/components/din/`.

6. **One new API route (`/api/promote-project`), not an extension of `/api/din-suggest`.** `din-suggest` already has three modes; adding a fourth would make the branching unmaintainable. Next.js App Router code-splits routes independently, so there's no bundle-size cost.

7. **Five concrete pitfalls identified with specific mitigations** (see Common Pitfalls section). The highest-risk ones are: (a) Zod `.optional().default([])` breaking TypeScript inference, (b) AI returning invalid `capabilityId` values that must be filtered post-parse, (c) the dual filter site in `DINMappingStep.tsx` §1783 + §1833 that both need `!p.promotedAt` awareness.

8. **Findings design requires one planner decision (Open Question 2): how to pick a `goalId` for baat-findings.** Recommended: goal-picker dropdown appears when user clicks "Voeg toe aan DIN" on a baat-type finding. The AI can suggest a hint, but the user confirms.

### Must-reads for the planner (in order)

1. **`src/lib/schemas.ts`** — Understand the exact structure of `ExternalProjectSchema`, `DINEffortSchema`, `DINBenefitSchema`, `DINCapabilitySchema`, `DINSessionSchema`, and the AI response schemas (`AIBenefitSchema`, `AIEffortSchema`, `AICrossAnalyseSchema`). The new schemas must follow the same shape conventions.
2. **`src/lib/ai-client.ts` lines 131-155 + 751-759** — `callClaudeWithValidation` and `matchProjectsToCapabilities`. The new `promoteExternalProject()` function must mirror these exactly.
3. **`src/lib/session-context.tsx` lines 160-185** — The functional `updateSession` pattern. All promotion mutations must flow through this in a single call.
4. **`src/components/din/ExterneProjectenPanel.tsx`** — Base Phase 12 panel. Understand the existing project-card layout, the import flow, and the `onUpdate`/`onDelete` prop contracts before deciding where the promotion button lands.
5. **`src/components/din/AIKoppelingPanel.tsx`** — Model for review-UI with AI-suggest + toggle-to-accept. The new `ProjectPromotiePanel.tsx` should feel like a scaled-up version of this.
6. **`src/lib/__tests__/consolidation.test.ts`** — Exact test pattern for pure-function mutations on `DINSession`. Copy this template for `project-promotion.test.ts`.
7. **`src/lib/__tests__/external-project-schema.test.ts`** — Existing test file to extend with Tests 11-16.
8. **`.planning/phases/14-.../14-CONTEXT.md` <decisions>** — The 14 locked decisions D-01..D-14 are the phase contract. Every plan task must trace back to one or more of these decisions.
9. **`.planning/phases/12-lopende-projecten-invullen-in-din-netwerk/12-CONTEXT.md`** — Phase 12 data model + AI-suggest pattern. Phase 14 is a strict additive extension; no Phase 12 code should be rewritten, only filtered (`!p.promotedAt`).
10. **`./CLAUDE.md`** — DIN project rules (Dutch, Cito branding, dual persistence, `npm run build` gates, skills usage). Every plan task inherits these constraints.

### File to Create
`.planning/phases/14-lopende-projecten-promoveren-tot-volwaardige-inspanningen-in-din-keten-met-splitsing-en-bevindingen-afleiding/14-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | No new dependencies; all verified in `package.json` |
| Architecture | HIGH | Every pattern has a tested implementation in Phases 01-12 |
| Pitfalls | HIGH (1-5), MEDIUM (6-7) | 1-5 are file-verified; 6-7 depend on planner decisions on post-validation and load-time parse |
| Validation Architecture | HIGH | Mirrors Phase 13 format and existing Vitest suite conventions |
| Zod schema shape | HIGH | Schema design choices all justified against Phase 01 conventions and existing AI response schemas |

### Open Questions for Planner
1. Does `DINBenefitSchema` / `DINCapabilitySchema` also get `originProjectId`? (Recommended: no, keep scope minimal to `DINEffortSchema` only.)
2. How does a baat-type finding pick a `goalId`? (Recommended: goal-picker dropdown in review UI on "Voeg toe aan DIN" click.)
3. Should `validateInspanning()` post-run on split efforts? (Recommended: warnings-only, never corrections.)
4. Re-promotion after undo allowed? (Recommended: yes, document as expected behavior.)
5. Sort order for "Toon gepromoveerde projecten"? (Recommended: `promotedAt` desc.)

### Ready for Planning
Research complete. Planner can now create 14-01-PLAN.md (+ potentially 14-02, 14-03, 14-04) following the 4-wave structure outlined in the Summary: (1) schemas + tests, (2) AI pipeline, (3) mutation helpers + unit tests, (4) UI component + integration.

Sources:
- [Claude Sonnet 4.6 max_tokens API docs](https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-6)
