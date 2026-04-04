# Phase 11: Cross-analyse herontwerp -- stapsgewijs traject met consolidatie - Research

**Researched:** 2026-04-04
**Domain:** React UI refactoring, wizard pattern, AI prompt splitting, session state management
**Confidence:** HIGH

## Summary

Phase 11 transforms the existing monolithic CrossAnalyseStep.tsx (1641 lines, 9 sections rendered at once) into a linear 5-step wizard that follows the DIN chain order (baten -> vermogens -> inspanningen -> consolidatie -> per-sector vertaling). The current component already contains all the building blocks: consolidation logic (mergeCapabilities/mergeEfforts with undo), cluster cards, section renderers, and AI integration via callClaudeWithValidation. The refactor is primarily a UI restructuring exercise -- splitting one large component into 5 focused sub-steps with wizard navigation, per-step AI calls, and cumulatieve context passing.

The codebase is mature with well-established patterns: functional updateSession for state mutations, Zod-validated AI responses, prompt assembly with layered context, and toast feedback. All consolidation pure functions are already exported and tested. The key technical challenge is splitting the single CROSS_ANALYSE_PROMPT into 5 per-step prompts while maintaining the cumulatieve context requirement (D-12), and redesigning the API route to support per-step calls.

**Primary recommendation:** Extract the wizard as a parent orchestrator component that manages step navigation and cumulative context state, with each of the 5 steps as a separate child component that receives data and an 'Analyseer' callback. Reuse existing section components (ClusterCard, ConsolidationActionBar, SectorBadge, LoadingOverlay) and consolidation logic verbatim.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Lineaire wizard met volgende/vorige knoppen. Stappen worden ontgrendeld na voltooiing. Past bij het methodische karakter van DIN.
- **D-02:** 5 stappen in vaste volgorde: (1) Sectoroverloop baten, (2) Gedeelde vermogens, (3) Inspanningen-overlap, (4) Consolidatie-actie, (5) Per-sector vertaling.
- **D-03:** Stap 1 -- Baten per sector naast elkaar + gaps (ontbrekende baat-ketens). Uit huidige SynergieSection + GapsSection.
- **D-04:** Stap 2 -- VermogenClusters + hefboomwerking. Welke vermogens delen sectoren? Uit huidige VermogenClusterSection + HefboomSection.
- **D-05:** Stap 3 -- InspanningClusters + ProjectMatching (lopende projecten). Uit huidige InspanningClusterSection + ProjectMatchingSection.
- **D-06:** Stap 4 -- Consolidatie-acties. AI-advies per cluster met samenvoeg/apart houden knoppen.
- **D-07:** Stap 5 -- Per-sector vertaling met tabs. DIN-keten + domeinbalans + gaps per sector. DomeinBalansSection en SectorOverlapSection verhuizen hierheen.
- **D-08:** AI-voorstel per cluster met een klik accepteren of afwijzen (combineren / apart houden). Niet checkbox-selectie, niet drag-drop.
- **D-09:** Optioneel tekstveld bij de consolidatie-stap waarin de gebruiker extra context of sturing kan toevoegen voor het AI-consolidatieadvies.
- **D-10:** Bestaande consolidatie-logica (mergeCapabilities, mergeEfforts, undo-functies) blijft intact -- bewezen patroon uit Phase 8.
- **D-11:** Per stap een aparte AI-call, handmatig getriggerd via een 'Analyseer' knop. Gebruiker kan eerst de data bekijken voordat AI draait.
- **D-12:** Cumulatieve context: elke stap stuurt het resultaat van eerdere stappen mee als AI-context.
- **D-13:** Optioneel tekstveld per stap voor extra context/sturing voor de AI-call.
- **D-14:** Sector-tabs (PO/VO/ZK) met volledige DIN-keten per sector.
- **D-15:** Eerste tab is 'Overzicht' -- compacte samenvattingstabel.
- **D-16:** Geconsolideerde items tonen duidelijk welke sectoren erbij betrokken zijn (badge/icoon).

### Claude's Discretion
- Exacte wizard-UI-ontwerp (progress indicator stijl, knoppen-layout)
- Hoe de 'Analyseer' knop en loading state eruitzien per stap
- Schema-structuur van per-stap AI responses
- Hoe de cumulatieve context wordt samengevoegd in prompts
- Visuele weergave van de samenvattingstabel in stap 5
- Welke huidige sub-componenten hergebruikt vs herschreven worden
- Hoe de overgang van 9-secties naar 5-stappen technisch wordt gerefactord

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| R-CROSS-01 | Cross-analyse herkent gedeelde baten over PO/VO/Zakelijk sectoren (semantisch, niet alleen exacte match) | Step 1 (Sectoroverloop baten) shows baten per sector side-by-side with synergy indicators; AI analyses sector overlap on benefit level. Existing SynergieSection already renders this. |
| R-CROSS-02 | Cross-analyse herkent gedeelde vermogens die voor meerdere sectoren gelden | Step 2 (Gedeelde vermogens) with VermogenClusterSection and HefboomSection; AI clusters capabilities semantically. Existing ClusterCard + VermogenClusterSection already implement this. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack**: Next.js 16, TypeScript, Tailwind CSS 4 -- no new dependencies needed
- **Taal**: All UI and AI output in Nederlands (nl-NL)
- **Branding**: Cito blauw (#003366) as primary color
- **Persistence**: localStorage-first (sync-first pattern)
- **AI**: Anthropic Claude API via Next.js API routes with callClaudeWithValidation
- **Kwaliteitseis**: `npm run build` must pass; verify existing functionality not broken
- **UX design**: All AI output must be visually attractive and structured -- never plain text
- **Skills**: Use available skills (frontend-design, interface-design) for UI implementation
- **GSD Workflow**: Always work through GSD commands

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.0 | App Router, API routes | Existing framework |
| React | 19.1.0 | UI components | Existing framework |
| Tailwind CSS | 4.1.0 | Utility styling | Existing styling approach |
| Zod | (bundled) | Schema validation for AI responses | Existing validation pattern |
| @anthropic-ai/sdk | 0.78.0 | Claude API for per-step AI calls | Existing AI integration |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.2 | Unit testing for consolidation logic | Test mergeCapabilities/mergeEfforts after refactor |

### No New Dependencies Needed
This phase is purely a UI restructuring. All required libraries are already installed. No new packages required.

## Architecture Patterns

### Recommended Component Structure

```
src/components/steps/
  CrossAnalyseStep.tsx           # Refactored: wizard orchestrator (was 1641 lines)
src/components/cross-analyse/
  CrossAnalyseWizard.tsx         # Wizard shell with step navigation + progress
  StapBatenOverloop.tsx          # Step 1: Baten per sector + gaps
  StapGedeeldeVermogens.tsx      # Step 2: Vermogen clusters + hefboom
  StapInspanningenOverlap.tsx    # Step 3: Inspanning clusters + project matching
  StapConsolidatie.tsx           # Step 4: Consolidation actions + AI advies
  StapSectorVertaling.tsx        # Step 5: Per-sector tabs + overview
  WizardNavigation.tsx           # Shared: progress bar + volgende/vorige buttons
  StepAnalyseButton.tsx          # Shared: 'Analyseer' button with loading + feedback
  shared/                        # Reused from current CrossAnalyseStep
    SectorBadge.tsx              # Extracted (lines 161-168)
    LoadingOverlay.tsx           # Extracted (lines 170-231)
    ClusterCard.tsx              # Extracted (lines 624-695)
    ConsolidationActionBar.tsx   # Extracted (lines 529-622)
src/app/api/cross-analyse/
  route.ts                       # Refactored: accepts `stap` parameter (1-5)
src/lib/
  prompts.ts                     # Split: 5 per-step prompts + cumulative context builder
  schemas.ts                     # 5 per-step AI response schemas
```

### Pattern 1: Wizard Orchestrator with Local Step State

**What:** CrossAnalyseWizard manages the current wizard step, cumulative AI results, and step completion state. Each step component receives props (session data, previous step results) and calls back on completion.

**When to use:** This is the ONLY pattern for the wizard navigation.

**Example:**
```typescript
// CrossAnalyseWizard.tsx
interface WizardState {
  currentStep: number; // 1-5
  completedSteps: Set<number>;
  stepResults: {
    stap1?: Stap1Result;  // Baten overloop analysis
    stap2?: Stap2Result;  // Vermogen clusters
    stap3?: Stap3Result;  // Inspanning clusters + project matching
    stap4?: Stap4Result;  // Consolidation decisions
    stap5?: Stap5Result;  // Sector vertaling
  };
}

// Step completion unlocks next step (D-01)
function handleStepComplete(stepNum: number, result: StepResult) {
  setWizardState(prev => ({
    ...prev,
    completedSteps: new Set([...prev.completedSteps, stepNum]),
    stepResults: { ...prev.stepResults, [`stap${stepNum}`]: result },
  }));
}
```

### Pattern 2: Per-Step AI Calls with Cumulative Context (D-11, D-12)

**What:** Each step has its own 'Analyseer' button. The API route accepts a `stap` parameter and assembles the prompt from the base DIN data PLUS results from earlier steps.

**When to use:** For every AI interaction within the wizard.

**Example:**
```typescript
// API call from Step 3 includes Step 1 + Step 2 results
const response = await fetch("/api/cross-analyse", {
  method: "POST",
  body: JSON.stringify({
    stap: 3,
    // Base DIN data
    goals, benefits, capabilities, efforts, externalProjects,
    goalBenefitMaps, benefitCapabilityMaps, capabilityEffortMaps,
    // Cumulative context from earlier steps
    stap1Result: wizardState.stepResults.stap1,
    stap2Result: wizardState.stepResults.stap2,
    // Optional user feedback (D-13)
    userFeedback: stepFeedback,
  }),
});
```

### Pattern 3: Session Persistence for Wizard State

**What:** The wizard state (step results, completed steps) is stored in the session alongside the existing crossAnalyse field. This allows resuming the wizard after page navigation.

**When to use:** On every step completion and consolidation action.

**Example:**
```typescript
// Store wizard state in session for resume capability
updateSession(prev => ({
  ...prev,
  crossAnalyseWizard: {
    currentStep: wizardState.currentStep,
    completedSteps: Array.from(wizardState.completedSteps),
    stepResults: wizardState.stepResults,
  },
}));
```

### Pattern 4: Sector Tabs in Step 5 (D-14, D-15)

**What:** Step 5 uses a tab-based layout: first tab is 'Overzicht' (summary table), then individual sector tabs (PO/VO/Zakelijk). Each sector tab shows DIN chain, domain balance, and gaps specific to that sector.

**Example:**
```typescript
const tabs = [
  { key: "overzicht", label: "Overzicht" },
  ...SECTORS.map(s => ({ key: s, label: s })),
];

// Overzicht tab: summary table
// | Sector | Baten | Vermogens | Inspanningen | Waarvan gedeeld | Gaps |
// | PO     | 6     | 4         | 8            | 2              | 1    |
// | VO     | 5     | 3         | 7            | 2              | 0    |
// | Zakelijk| 4    | 3         | 6            | 1              | 2    |
```

### Anti-Patterns to Avoid

- **Single monolithic AI call for all 5 steps:** Violates D-11. Each step MUST have its own AI call triggered by the user.
- **Storing per-step results only in React state:** Wizard state will be lost on navigation. Must persist to session.
- **Passing full previous AI response text as context:** Token bloat. Extract only the relevant summary/conclusion from each prior step to pass forward.
- **Breaking the consolidation pure functions:** D-10 mandates mergeCapabilities/mergeEfforts/undo stay intact. Only the UI calling them changes.
- **Auto-advancing steps:** Steps unlock after completion (D-01) but the user manually navigates. No auto-advance.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wizard step navigation | Custom router-based wizard | Simple useState with step index + completion gate | App already uses single-page step pattern, no need for URL routing per wizard sub-step |
| Sector tab component | Custom tab implementation | Reuse existing pattern from sector work steps (SectorWerkStep has tabs) | Consistent UI pattern already proven |
| AI response validation | Manual JSON parsing | callClaudeWithValidation with per-step Zod schemas | Established pattern with retry logic |
| Consolidation logic | New merge functions | Existing mergeCapabilities/mergeEfforts from CrossAnalyseStep | Already tested and proven (D-10) |
| Toast feedback | Custom notification system | Existing toast system (useToast from Phase 2) | Already integrated throughout the app |

## Common Pitfalls

### Pitfall 1: Losing Wizard State on Navigation
**What goes wrong:** User navigates away from cross-analyse step and back; all wizard progress is lost.
**Why it happens:** Wizard state stored only in React useState, not persisted to session.
**How to avoid:** Persist wizardState to session on every step completion. Load it back on mount via useEffect. Store in a new `crossAnalyseWizard` field on DINSession.
**Warning signs:** State resets when switching between main app steps.

### Pitfall 2: Token Budget Explosion from Cumulative Context
**What goes wrong:** By step 4, the cumulative context from steps 1-3 makes the prompt too large, causing AI errors or degraded quality.
**Why it happens:** Naively concatenating full AI responses from prior steps as context.
**How to avoid:** Extract concise summaries from each step result (key findings only, not full items lists). Cap cumulative context at ~3000 characters. Use the existing truncateAtSentenceBoundary utility from prompt-assembly.ts.
**Warning signs:** AI calls taking >30 seconds, getting truncated responses, or schema validation failures.

### Pitfall 3: Breaking Existing crossAnalyse Session Storage
**What goes wrong:** The new wizard format is incompatible with the existing `crossAnalyse: string` field, breaking sessions that already have cross-analyse data.
**Why it happens:** Changing the storage format without migration logic.
**How to avoid:** Keep the existing `crossAnalyse` string field for backward compatibility. Add a NEW field `crossAnalyseWizard` for the wizard state. On mount, check both fields: if old-format data exists but no wizard data, show the old results as a "previous analysis" that the user can view or re-run with the new wizard.
**Warning signs:** Old sessions crash or show empty cross-analyse.

### Pitfall 4: Consolidation Actions in Wrong Wizard Step
**What goes wrong:** User tries to consolidate in step 2 or 3 instead of step 4.
**Why it happens:** ClusterCard already has consolidation buttons; reusing it in steps 2-3 exposes consolidation too early.
**How to avoid:** In steps 2-3, render clusters in READ-ONLY mode (no merge buttons). Only step 4 shows ConsolidationActionBar with full merge/undo actions.
**Warning signs:** Consolidation actions appearing before the user has seen all clusters.

### Pitfall 5: API Route Breaking Change
**What goes wrong:** The refactored API route breaks the build or causes 500 errors.
**Why it happens:** Changing the route signature without maintaining backward compatibility.
**How to avoid:** The `stap` parameter is optional. If not provided, fall back to the existing full cross-analyse behavior. This maintains backward compatibility with any code still calling the old format.
**Warning signs:** API errors in the browser console, build failures.

### Pitfall 6: Step Unlocking Logic Too Strict
**What goes wrong:** User cannot navigate back to review previous steps, or cannot proceed because step completion detection is too rigid.
**Why it happens:** Overly strict validation of what "completed" means for each step.
**How to avoid:** A step is "completed" when the user has either (a) viewed the data and optionally run the AI analysis, or (b) run the AI analysis and reviewed results. Navigation BACK should always be allowed. Only FORWARD navigation requires current step completion.
**Warning signs:** Users stuck on a step with no way to proceed.

## Code Examples

### Example 1: Wizard Navigation Component
```typescript
// WizardNavigation.tsx
interface WizardNavigationProps {
  currentStep: number;
  completedSteps: Set<number>;
  onStepChange: (step: number) => void;
  stepLabels: string[];
}

const STEP_LABELS = [
  "Sectoroverloop baten",
  "Gedeelde vermogens",
  "Inspanningen-overlap",
  "Consolidatie",
  "Per-sector vertaling",
];

// Progress indicator: numbered circles connected by lines
// Active step: filled cito-blue circle
// Completed step: filled with checkmark
// Locked step: gray outline, not clickable
```

### Example 2: Per-Step API Route Structure
```typescript
// route.ts refactored
export async function POST(request: NextRequest) {
  const body = await request.json();
  const stap = body.stap as number | undefined;

  // Build cumulative context from prior step results
  let cumulativeContext = "";
  if (stap && stap >= 2 && body.stap1Result) {
    cumulativeContext += `\n\nEERDERE ANALYSE - Stap 1 (Baten-overloop):\n${summarizeStap1(body.stap1Result)}`;
  }
  if (stap && stap >= 3 && body.stap2Result) {
    cumulativeContext += `\n\nEERDERE ANALYSE - Stap 2 (Vermogen-clusters):\n${summarizeStap2(body.stap2Result)}`;
  }
  // ... etc

  // Select per-step prompt and schema
  const { prompt, schema } = getStepConfig(stap || 0);

  const result = await callClaudeWithValidation(
    schema,
    assembleSystemPrompt(prompt, "cross-analyse", undefined, kibContext),
    userMessage + cumulativeContext,
    { maxTokens: 16384, model: "claude-opus-4-6" }
  );
  // ...
}
```

### Example 3: Existing Reusable Components (KEEP AS-IS)
```typescript
// These are extracted from CrossAnalyseStep.tsx and reused:
// 1. mergeCapabilities() / undoMergeCapabilities()     -> lines 17-90
// 2. mergeEfforts() / undoMergeEfforts()               -> lines 92-152
// 3. SectorBadge                                        -> lines 161-168
// 4. LoadingOverlay                                     -> lines 170-231
// 5. ClusterCard                                        -> lines 624-695
// 6. ConsolidationActionBar                             -> lines 529-622
// 7. VermogenClusterSection                             -> lines 697-753
// 8. InspanningClusterSection                           -> lines 756-813
// 9. ProjectMatchingSection                             -> lines 815-863
// 10. SynergieSection                                   -> lines 235-275
// 11. GapsSection                                       -> lines 277-333
// 12. HefboomSection                                    -> lines 335-388
// 13. DomeinBalansSection                               -> lines 390-449
// 14. SectorOverlapSection                              -> lines 451-488
```

### Example 4: Session Schema Extension
```typescript
// schemas.ts addition - wizard state storage
export const CrossAnalyseWizardStateSchema = z.object({
  currentStep: z.number().min(1).max(5),
  completedSteps: z.array(z.number()),
  stepResults: z.object({
    stap1: z.unknown().optional(),
    stap2: z.unknown().optional(),
    stap3: z.unknown().optional(),
    stap4: z.unknown().optional(),
    stap5: z.unknown().optional(),
  }).optional(),
});

// DINSession extension
crossAnalyseWizard: CrossAnalyseWizardStateSchema.optional(),
```

## Mapping: Current Sections -> New Steps

| Current Section (9 total) | New Location | Step |
|---------------------------|-------------|------|
| SynergieSection | StapBatenOverloop | 1 |
| GapsSection (local analysis) | StapBatenOverloop | 1 |
| Vermogen-Synergie Matrix (local) | StapBatenOverloop | 1 |
| VermogenClusterSection | StapGedeeldeVermogens | 2 |
| HefboomSection | StapGedeeldeVermogens | 2 |
| InspanningClusterSection | StapInspanningenOverlap | 3 |
| ProjectMatchingSection | StapInspanningenOverlap | 3 |
| ConsolidationActionBar (on clusters) | StapConsolidatie | 4 |
| DomeinBalansSection | StapSectorVertaling | 5 |
| SectorOverlapSection | StapSectorVertaling | 5 |
| ExterneProjectenSection | StapInspanningenOverlap | 3 |
| Inspanningen per Domein (local) | StapSectorVertaling | 5 |
| Header + statistieken | CrossAnalyseWizard (top) | All |

## Per-Step AI Prompt Strategy

| Step | What AI Produces | Input Data | Cumulative Context |
|------|-----------------|------------|-------------------|
| 1 | Baten-overloop per sector, gaps, synergies | Goals, benefits, goalBenefitMaps | None (first step) |
| 2 | Vermogen-clusters, hefboomwerking | Capabilities, benefitCapabilityMaps | Step 1 summary (key synergies + gaps) |
| 3 | Inspanning-clusters, project matching | Efforts, capabilityEffortMaps, externalProjects | Step 1+2 summary |
| 4 | Consolidation advice per cluster | All clusters from steps 2+3 | Step 1+2+3 summaries + optional user context (D-09) |
| 5 | Per-sector DIN chain + domain balance + gaps | All DIN data + consolidation decisions | Step 1-4 summaries |

## Per-Step Zod Schema Design

Each step needs its own AI response schema. These are subsets of the current `AICrossAnalyseSchema`:

| Step | Schema Fields |
|------|--------------|
| 1 | synergie, gaps, batenPerSector (new: baten grouped by sector with sector overlap markers) |
| 2 | vermogenClusters (existing schema), hefboomwerking |
| 3 | inspanningClusters (existing schema), projectMatching (existing schema) |
| 4 | consolidatieAdvies (new: per cluster a recommendation + rationale + suggested merged title) |
| 5 | sectorVertaling (new: per sector - DIN chain summary, domeinBalans, gaps, gedeelde items count) |

## State of the Art

| Old Approach (current) | New Approach (Phase 11) | Impact |
|------------------------|------------------------|--------|
| 9 sections rendered at once | 5 wizard steps, linear progression | Focused stakeholder experience |
| Single AI call, all sections at once | Per-step AI calls with cumulative context | Better AI quality, user control |
| Consolidation buttons inline with analysis | Dedicated consolidation step | Clear decision moment |
| No per-sector view | Dedicated sector tabs in step 5 | Stakeholder recognition |
| crossAnalyse stored as single JSON string | Per-step results + wizard state | Resumable workflow |

## Open Questions

1. **crossAnalyseWizard session field type**
   - What we know: Need to store wizard state including per-step AI results
   - What's unclear: Whether to use strict per-step schemas or store as `z.unknown()` for flexibility
   - Recommendation: Use `z.record(z.string(), z.unknown()).optional()` for the stepResults to avoid schema migration issues as per-step schemas evolve. The wizard orchestrator component handles the typing at runtime.

2. **Backward compatibility with existing sessions**
   - What we know: Some sessions may already have `crossAnalyse` string data from Phase 8
   - What's unclear: How much existing data is in production
   - Recommendation: Keep both fields. On mount, if `crossAnalyseWizard` exists use it; if only `crossAnalyse` exists, show a "Vorige analyse gevonden" notice with option to view old results or start fresh wizard.

3. **API route: single endpoint with stap parameter vs. separate endpoints**
   - What we know: D-11 requires per-step AI calls
   - What's unclear: Whether one route with switch or 5 separate routes is cleaner
   - Recommendation: Single `/api/cross-analyse` route with `stap` parameter. Keeps backward compat (no stap = old behavior) and reduces file proliferation. A switch statement selects prompt + schema per step.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | vitest config via package.json (existing) |
| Quick run command | `npx vitest run src/lib/__tests__/consolidation.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R-CROSS-01 | Cross-analyse shows baten per sector with synergy detection | manual | Visual verification in browser | N/A (UI) |
| R-CROSS-02 | Cross-analyse clusters shared vermogens across sectors | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts -x` | Exists |

### Sampling Rate
- **Per task commit:** `npm run build` (mandatory per CLAUDE.md)
- **Per wave merge:** `npx vitest run` + `npm run build`
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps
- [ ] Consolidation tests already exist and cover mergeCapabilities/mergeEfforts -- no new test files needed for logic
- [ ] No unit tests needed for UI wizard navigation (React component testing not established in project)
- [ ] Build verification (`npm run build`) is the primary quality gate for this phase

## Sources

### Primary (HIGH confidence)
- `src/components/steps/CrossAnalyseStep.tsx` -- full 1641-line component read, all sections catalogued
- `src/app/api/cross-analyse/route.ts` -- current API route with single AI call pattern
- `src/lib/schemas.ts` -- all cross-analyse Zod schemas (AICrossAnalyseSchema, cluster schemas)
- `src/lib/prompts.ts` -- CROSS_ANALYSE_PROMPT (lines 47-138)
- `src/lib/ai-client.ts` -- callClaudeWithValidation pattern
- `src/lib/prompt-assembly.ts` -- assembleSystemPrompt with layered context
- `src/lib/din-service.ts` -- findSharedCapabilities, getDomainBalance, findGaps
- `.planning/phases/08-cross-analyse-semantische-matching/08-CONTEXT.md` -- Phase 8 decisions (original cross-analyse)
- `src/lib/__tests__/consolidation.test.ts` -- existing tests for merge logic
- `src/lib/__tests__/cross-analyse-schema.test.ts` -- existing schema backward compat tests

### Secondary (MEDIUM confidence)
- `.claude/skills/interface-design/SKILL.md` -- interface design principles for wizard UI
- `.claude/skills/frontend-design/SKILL.md` -- frontend design principles

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, fully existing stack
- Architecture: HIGH -- clear refactoring plan based on thorough code reading
- Pitfalls: HIGH -- based on direct analysis of current code patterns and session storage
- Per-step prompt strategy: MEDIUM -- prompt splitting is design work, not verifiable until implementation
- Backward compatibility: HIGH -- migration strategy based on actual schema analysis

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable codebase, no external dependency changes expected)
