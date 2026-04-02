# Phase 6: Cyclisch Doel-voor-Doel Werken - Research

**Researched:** 2026-04-02
**Domain:** Session state management, UI workflow progression, AI prompt context assembly
**Confidence:** HIGH

## Summary

Phase 6 transforms the DIN-mapping step from free-form goal navigation to guided cyclical goal-by-goal workflow. The core changes span three domains: (1) session state extension with `completedGoals` tracking and completeness validation per goal per sector, (2) UI updates to the doelen-sidebar with status badges and a "Doel afronden" button, and (3) AI prompt context extension to inject previously completed goal items when working on subsequent goals.

All changes build on well-established patterns in the codebase. The Zod schema extension pattern (`.optional().default([])`) is proven in multiple prior phases. The prompt-assembly layered context pattern (programmaboek -> KiB -> sectorwerk) has a clear extension point for a fourth "eerder-uitgewerkte-doelen" block. The sidebar UI is a compact ~30 lines in DINMappingStep that receives straightforward badge enhancements.

**Primary recommendation:** Implement in three waves: (1) schema + completeness logic, (2) UI sidebar + afrond-knop, (3) AI context injection. Each wave is independently testable and the ordering prevents regressions.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Zachte begeleiding -- alle doelen blijven toegankelijk in de sidebar. Het actieve doel is visueel gemarkeerd. Na het afronden van een doel wordt het volgende doel automatisch voorgesteld (sidebar springt naar volgend niet-afgerond doel).
- **D-02:** Een expliciete "Doel afronden"-knop wordt getoond bij het actieve doel. Geen waarschuwingsdialoog bij switchen naar andere doelen -- gebruiker is vrij om te navigeren.
- **D-03:** Een doel is "volledig uitgewerkt" als het in ELKE sector (PO, VO, Zakelijk) een volledige DIN-keten heeft: minstens 1 baat -> 1 vermogen -> 1 inspanning, met de koppelingen via goalBenefitMap, benefitCapabilityMap, capabilityEffortMap.
- **D-04:** De "Doel afronden"-knop is NIET beschikbaar als de keten niet compleet is in alle sectoren. De knop toont wat er nog ontbreekt (bijv. "VO: mist inspanningen").
- **D-05:** Afgeronde doelen worden gemarkeerd in de sessie-state (nieuw veld op DINSession, bijv. `completedGoals: string[]` met goal IDs).
- **D-06:** Bij het uitwerken van een volgend doel krijgt de AI de volledige items (baten met profielen, vermogens met profielen, inspanningen met dossiers) van alle eerder afgeronde doelen als context mee.
- **D-07:** Automatische prompt-budget cap: volledige profielen tot ~2000 tokens. Bij overschrijding terugvallen op titels + beschrijvingen + deduplicatie-instructie. Consistent met Phase 5 buildSectorwerkBlock (capped at 1500 chars).
- **D-08:** De context wordt als apart blok in de system prompt geplaatst, na sectorwerk-context. Past bij het bestaande prompt-assembly patroon (programmaboek -> KiB -> sectorwerk -> eerder-uitgewerkte-doelen).
- **D-09:** Expliciete deduplicatie-instructie in de prompt: "Vermijd overlap met bestaande items. Genereer aanvullende, unieke baten/vermogens/inspanningen voor dit doel."
- **D-10:** De bestaande doelen-sidebar in DINMappingStep krijgt status-badges per doel: afgerond (groen vinkje), actief/bezig (blauw), nog niet begonnen (open cirkel).
- **D-11:** Bij doelen met status "bezig" toont de sidebar een compact per-sector overzicht van wat compleet is (bijv. "PO checkmark VO checkmark Zak X") en wat er ontbreekt.
- **D-12:** De bestaande groene stip (hasBenefits indicator) wordt vervangen door de nieuwe status-badges -- meer informatief en methodisch correct.

### Claude's Discretion
- Exacte styling en positionering van de "Doel afronden"-knop (onder de sidebar, bij het actieve doel, of als floating action)
- Animatie/transitie wanneer sidebar naar het volgende doel springt
- Exacte formattering van het eerder-uitgewerkte-doelen blok in de system prompt
- Hoe het per-sector voortgangsoverzicht eruitziet in de sidebar (iconen, kleuren, tekst)
- Of de "Doel afronden"-knop een bevestigingsstap heeft of direct afrond
- Implementatiedetails van de completedGoals state (migratielogica voor bestaande sessies)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CYCL-01 | Gebruiker kan een specifiek doel selecteren en dat doel uitwerken over alle drie sectoren | Sidebar goal selection already exists (DINMappingStep line 1440-1472). Needs completeness check per goal/sector via mapping traversal, "Doel afronden" button with validation gate, and auto-advance to next incomplete goal. |
| CYCL-02 | Context van eerder uitgewerkte doelen wordt meegegeven bij het uitwerken van volgende doelen (voorkom duplicatie) | New `buildCompletedGoalsContext()` function in prompt-assembly.ts, following the established layered prompt pattern. Injected as 5th block after sectorwerk-context. Capped at ~2000 tokens with fallback to titles-only. |
| CYCL-03 | Voortgangsindicatie per doel -- welke doelen zijn volledig uitgewerkt, welke nog niet | Replace green dot (hasBenefits) with tri-state badges (afgerond/bezig/niet begonnen) and per-sector mini status. New `getGoalCompletionStatus()` function in din-service.ts. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.0 | App framework | Already installed, project stack |
| React | 19.1.0 | UI library | Already installed, project stack |
| Zod | (installed) | Schema validation | Used for all session schemas, backward-compat pattern established |
| Tailwind CSS | 4.1.0 | Styling | Already installed, all UI uses Tailwind classes |
| Vitest | 4.1.2 | Testing | Already installed, existing test patterns |

### Supporting
No new libraries needed. All functionality builds on existing codebase patterns.

## Architecture Patterns

### Files to Modify

```
src/
  lib/
    schemas.ts          # Add completedGoals field to DINSessionSchema
    types.ts            # Types auto-derived from schemas (no change needed)
    din-service.ts      # Add getGoalCompletionStatus() and isGoalComplete()
    prompt-assembly.ts  # Add buildCompletedGoalsContext()
    session-context.tsx # (unchanged -- updateSession callback handles new field)
  app/
    api/
      din-mapping/route.ts   # Pass completedGoalItems to system prompt
      din-suggest/route.ts   # Pass completedGoalItems to system prompt
  components/
    steps/
      DINMappingStep.tsx     # Sidebar badges, afrond-knop, auto-advance
```

### Pattern 1: Schema Extension with Backward Compatibility
**What:** Add `completedGoals` to DINSessionSchema using the established `.optional().default([])` pattern
**When to use:** Every time a new field is added to DINSession
**Example:**
```typescript
// Source: established pattern in schemas.ts line 366-368
completedGoals: z.array(z.string()).optional().default([]),
```
This ensures existing sessions loaded from localStorage automatically get `completedGoals: []` without migration code.

### Pattern 2: Layered System Prompt Assembly
**What:** Add a new context block to the system prompt, following the chain: programmaboek -> KiB -> sectorwerk -> completed goals
**When to use:** Adding domain-specific context to AI prompts
**Example:**
```typescript
// Source: prompt-assembly.ts existing pattern
// System prompt is assembled as: instructionPrompt + programmaboek + KiB + sectorwerk
// New block follows the same pattern:
export function buildCompletedGoalsContext(
  completedGoalItems: CompletedGoalContext
): string {
  // Similar to buildSectorwerkBlock: build text, cap at ~2000 chars
  // Include deduplicatie-instructie per D-09
}
```
The existing pattern appends blocks after `assembleSystemPrompt()`:
```typescript
// In din-mapping/route.ts:
let systemPrompt = assembleSystemPrompt(...);
if (sectorAnalysis) systemPrompt += buildSectorwerkBlock(...);
// New: add completed goals block
if (completedGoalItems) systemPrompt += buildCompletedGoalsContext(...);
```

### Pattern 3: Completeness Check via Mapping Traversal
**What:** Determine if a goal has a complete DIN chain per sector by traversing the mapping arrays
**When to use:** For the "Doel afronden" button state and status badges
**Example:**
```typescript
// Traverse: goal -> goalBenefitMaps -> benefits per sector ->
//   benefitCapabilityMaps -> capabilities -> capabilityEffortMaps -> efforts
export function getGoalCompletionStatus(
  session: DINSession,
  goalId: string
): GoalCompletionStatus {
  const sectorStatuses: Record<string, SectorChainStatus> = {};
  for (const sector of SECTORS) {
    // Check: has benefit? has capability linked? has effort linked?
    sectorStatuses[sector] = checkSectorChain(session, goalId, sector);
  }
  return { goalId, sectorStatuses, isComplete: allSectorsComplete(sectorStatuses) };
}
```

### Pattern 4: Functional Session Update (Established)
**What:** Use `updateSession(prev => ...)` callback for all state mutations
**When to use:** Updating completedGoals, toggling goal completion
**Example:**
```typescript
// Mark goal as completed
updateSession(prev => ({
  completedGoals: [...(prev.completedGoals || []), goalId],
}));
```

### Anti-Patterns to Avoid
- **Direct state mutation outside updateSession:** All session changes MUST go through the functional updater to ensure localStorage sync
- **Checking only hasBenefits for completeness:** The old green dot only checked if benefits exist. The new check MUST verify the full chain (baat -> vermogen -> inspanning) WITH mappings per D-03
- **Blocking navigation between goals:** Per D-01 and D-02, all goals must remain accessible. Never disable goal buttons or show warnings when switching
- **Injecting raw large context without capping:** Per D-07, ALWAYS cap the completed goals context block. The buildSectorwerkBlock caps at 1500 chars -- the new block should cap at ~2000 tokens (approximately 6000-8000 chars for Dutch text)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema backward compat | Custom migration logic for completedGoals | `.optional().default([])` on Zod schema | Proven pattern, handles all edge cases automatically |
| Prompt budget management | Token counter | Character-based cap with fallback (like buildSectorwerkBlock) | Consistent with existing approach, no extra dependencies |
| UUID generation | Custom ID generation | `crypto.randomUUID()` via `generateId()` | Already used everywhere in din-service.ts |

**Key insight:** This phase adds no new libraries. Every pattern has an established precedent in the codebase. The risk is not in choosing wrong tools but in deviating from established patterns.

## Common Pitfalls

### Pitfall 1: Incomplete Chain Detection Missing Mapping Links
**What goes wrong:** Checking if benefits/capabilities/efforts exist per sector but not checking if they are LINKED via the mapping arrays
**Why it happens:** It is tempting to just count `benefits.filter(b => b.goalId === goalId && b.sectorId === sector).length > 0` but this does not verify the chain is connected
**How to avoid:** The completeness check must traverse: goalBenefitMaps -> benefitCapabilityMaps -> capabilityEffortMaps. A goal is NOT complete if items exist but are not linked
**Warning signs:** Goals marked as "complete" that have orphaned items

### Pitfall 2: Prompt Budget Overflow with Many Completed Goals
**What goes wrong:** When 4-5 goals are completed with full profiles, the context block could easily exceed 10K characters
**Why it happens:** Each goal has 3 sectors x (2-4 baten + 2-4 vermogens + 4-8 inspanningen) with full profiles
**How to avoid:** Per D-07, implement a two-tier approach: full profiles up to ~2000 tokens, then fall back to titles + descriptions only. Cap the total block at a fixed character limit (e.g., 6000 chars)
**Warning signs:** AI responses become less coherent or start truncating

### Pitfall 3: State Race Condition on "Doel Afronden"
**What goes wrong:** Clicking "Doel afronden" while an AI generation is still in progress could mark a goal as complete before all items are saved
**Why it happens:** The AI generate function uses async fetch and then calls updateSession, while the "afronden" action also calls updateSession
**How to avoid:** Disable the "Doel afronden" button while `isGenerating` is true. The functional updater pattern in session-context already prevents race conditions on the state itself (per Phase 2 decision DATA-03)
**Warning signs:** Goals marked complete but with fewer items than expected

### Pitfall 4: Auto-Advance to Wrong Goal
**What goes wrong:** After marking a goal complete, the sidebar should advance to the next INCOMPLETE goal, but it might advance to a completed one or stay put
**Why it happens:** The advance logic needs to skip already-completed goals and wrap around if needed
**How to avoid:** After updating completedGoals, compute the next incomplete goal using `session.goals.sort((a,b) => a.rank - b.rank).find(g => !completedGoals.includes(g.id))`. If all are complete, stay on the current goal
**Warning signs:** Users stuck on a completed goal, or sidebar jumps to an already-completed goal

### Pitfall 5: Sidebar Badge Flicker During Sector Navigation
**What goes wrong:** When switching sectors via the sector tabs, the goal status badges should NOT change (they show cross-sector status), but the DIN editor panel does change
**Why it happens:** If the badge computation accidentally filters by activeSector instead of checking ALL sectors
**How to avoid:** The `getGoalCompletionStatus()` function must always check all three sectors (PO, VO, Zakelijk), regardless of which sector is currently active in the UI
**Warning signs:** Badges showing "incomplete" when switching to a sector where no work is done yet, even though other sectors are complete

### Pitfall 6: Backward Compatibility with Existing Sessions
**What goes wrong:** Existing sessions from localStorage don't have `completedGoals` field, causing undefined errors
**Why it happens:** Direct property access like `session.completedGoals.includes(...)` throws if undefined
**How to avoid:** The Zod `.optional().default([])` handles parsing. In the component, always use `(session.completedGoals ?? [])` or rely on the schema default. The `loadSession` function in session-context already passes through Zod parsing for sector analyses -- apply the same pattern if needed
**Warning signs:** Console errors about "cannot read property 'includes' of undefined"

## Code Examples

### Completeness Check Function
```typescript
// New function in din-service.ts
import { SECTORS } from "./types";

export interface SectorChainStatus {
  hasBenefits: boolean;
  hasCapabilities: boolean;
  hasEfforts: boolean;
  isComplete: boolean;
  missing: string[]; // e.g., ["mist vermogens", "mist inspanningen"]
}

export type GoalStatus = "afgerond" | "bezig" | "niet-begonnen";

export interface GoalCompletionStatus {
  goalId: string;
  status: GoalStatus;
  sectorStatuses: Record<string, SectorChainStatus>;
  isComplete: boolean;
  isManuallyCompleted: boolean; // In completedGoals array
}

export function checkSectorChain(
  session: DINSession,
  goalId: string,
  sectorId: string
): SectorChainStatus {
  // 1. Find benefits for this goal+sector via goalBenefitMaps
  const goalBenefitIds = session.goalBenefitMaps
    .filter(m => m.goalId === goalId)
    .map(m => m.benefitId);
  const sectorBenefits = session.benefits
    .filter(b => goalBenefitIds.includes(b.id) && b.sectorId === sectorId);

  // 2. Find capabilities linked to those benefits
  const benefitIds = sectorBenefits.map(b => b.id);
  const linkedCapIds = session.benefitCapabilityMaps
    .filter(m => benefitIds.includes(m.benefitId))
    .map(m => m.capabilityId);
  const sectorCaps = session.capabilities
    .filter(c => linkedCapIds.includes(c.id) && c.sectorId === sectorId);

  // 3. Find efforts linked to those capabilities
  const capIds = sectorCaps.map(c => c.id);
  const linkedEffortIds = session.capabilityEffortMaps
    .filter(m => capIds.includes(m.capabilityId))
    .map(m => m.effortId);
  const sectorEfforts = session.efforts
    .filter(e => linkedEffortIds.includes(e.id) && e.sectorId === sectorId);

  const hasBenefits = sectorBenefits.length > 0;
  const hasCapabilities = sectorCaps.length > 0;
  const hasEfforts = sectorEfforts.length > 0;

  const missing: string[] = [];
  if (!hasBenefits) missing.push("mist baten");
  if (!hasCapabilities) missing.push("mist vermogens");
  if (!hasEfforts) missing.push("mist inspanningen");

  return {
    hasBenefits,
    hasCapabilities,
    hasEfforts,
    isComplete: hasBenefits && hasCapabilities && hasEfforts,
    missing,
  };
}
```

### Completed Goals Context Builder
```typescript
// New function in prompt-assembly.ts
// Follows the buildSectorwerkBlock pattern (cap at char limit, layered structure)

const COMPLETED_GOALS_MAX_CHARS = 6000; // ~2000 tokens for Dutch text

export function buildCompletedGoalsContext(
  completedGoals: Array<{
    goalName: string;
    benefits: Array<{ title: string; description: string; indicator?: string }>;
    capabilities: Array<{ title: string; description: string }>;
    efforts: Array<{ title: string; description: string; domain?: string }>;
  }>
): string {
  if (completedGoals.length === 0) return "";

  const parts: string[] = [];
  parts.push("EERDER UITGEWERKTE DOELEN:");
  parts.push("Onderstaande items zijn al gegenereerd voor eerdere doelen. Vermijd overlap en duplicatie.");
  parts.push("Genereer aanvullende, unieke baten/vermogens/inspanningen voor het huidige doel.\n");

  for (const goal of completedGoals) {
    parts.push(`Doel: ${goal.goalName}`);
    if (goal.benefits.length) {
      parts.push(`  Baten: ${goal.benefits.map(b => b.title || b.description.slice(0, 50)).join("; ")}`);
    }
    if (goal.capabilities.length) {
      parts.push(`  Vermogens: ${goal.capabilities.map(c => c.title || c.description.slice(0, 50)).join("; ")}`);
    }
    if (goal.efforts.length) {
      parts.push(`  Inspanningen: ${goal.efforts.map(e => e.title || e.description.slice(0, 50)).join("; ")}`);
    }
  }

  let block = parts.join("\n");

  // Cap at max chars (per D-07, consistent with buildSectorwerkBlock pattern)
  if (block.length > COMPLETED_GOALS_MAX_CHARS) {
    block = block.substring(0, COMPLETED_GOALS_MAX_CHARS);
    const lastNewline = block.lastIndexOf("\n");
    if (lastNewline > COMPLETED_GOALS_MAX_CHARS * 0.7) {
      block = block.substring(0, lastNewline);
    }
  }

  return `\n---\n${block}\n---`;
}
```

### Sidebar Status Badge (UI Pattern)
```typescript
// Inside DINMappingStep sidebar, replacing the green dot
// Per D-10, D-11, D-12

function GoalStatusBadge({ status, sectorStatuses }: {
  status: GoalStatus;
  sectorStatuses: Record<string, SectorChainStatus>;
}) {
  if (status === "afgerond") {
    return <span className="ml-1 text-green-500" title="Afgerond">&#10003;</span>;
  }
  if (status === "bezig") {
    // Compact per-sector view per D-11
    return (
      <span className="ml-1 text-xs">
        {SECTORS.map(s => (
          <span key={s} className={sectorStatuses[s]?.isComplete ? "text-green-500" : "text-gray-300"}>
            {s.slice(0, 2)}{sectorStatuses[s]?.isComplete ? "+" : "-"}
          </span>
        ))}
      </span>
    );
  }
  // niet-begonnen: open circle
  return <span className="ml-1 text-gray-300">&#9675;</span>;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Green dot (hasBenefits) | Tri-state badge with per-sector detail | Phase 6 | More informative, methodically correct |
| Free-form goal navigation | Guided cyclical workflow with soft steering | Phase 6 | Better adherence to DIN methodology |
| No context carryover between goals | Full completed-goal context injection | Phase 6 | Prevents duplicate items, AI-aware of prior work |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | vitest.config.ts (root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CYCL-01 | checkSectorChain returns correct status for complete/incomplete chains | unit | `npx vitest run src/lib/__tests__/goal-completion.test.ts -x` | Wave 0 |
| CYCL-01 | isGoalComplete returns true only when all 3 sectors have full chains | unit | `npx vitest run src/lib/__tests__/goal-completion.test.ts -x` | Wave 0 |
| CYCL-02 | buildCompletedGoalsContext generates correct prompt block | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts -x` | Extend existing |
| CYCL-02 | buildCompletedGoalsContext respects character cap | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts -x` | Extend existing |
| CYCL-02 | buildCompletedGoalsContext includes deduplicatie-instructie | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts -x` | Extend existing |
| CYCL-03 | getGoalCompletionStatus returns correct GoalStatus for all states | unit | `npx vitest run src/lib/__tests__/goal-completion.test.ts -x` | Wave 0 |
| CYCL-01 | DINSession schema accepts completedGoals field | unit | `npx vitest run src/lib/__tests__/goal-completion.test.ts -x` | Wave 0 |
| ALL | Build succeeds without errors | integration | `npm run build` | Existing |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npm test && npm run build`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/goal-completion.test.ts` -- covers CYCL-01, CYCL-03 (checkSectorChain, isGoalComplete, getGoalCompletionStatus)
- [ ] Extend `src/lib/__tests__/prompt-assembly.test.ts` -- covers CYCL-02 (buildCompletedGoalsContext)

*(Existing test infrastructure is sufficient. Vitest, tsconfig path aliases, and test patterns are all established.)*

## Open Questions

1. **Character cap vs token cap for completed goals context**
   - What we know: buildSectorwerkBlock uses 1500 chars. D-07 says ~2000 tokens.
   - What's unclear: Exact character-to-token ratio for Dutch text with DIN terminology.
   - Recommendation: Use 6000 chars as initial cap (conservative estimate of ~2000 tokens for Dutch), log actual usage, adjust if needed. This is Claude's discretion per CONTEXT.md.

2. **How to handle "un-completing" a goal**
   - What we know: D-05 says completedGoals stores goal IDs. D-02 says no warning when switching.
   - What's unclear: Can a user un-mark a completed goal? (e.g., if they realize they need to add more items)
   - Recommendation: Allow un-completing by providing a toggle on completed goals. This is a minor UX detail within Claude's discretion. Implementation: filter the ID out of completedGoals array.

## Sources

### Primary (HIGH confidence)
- `src/lib/schemas.ts` -- DINSessionSchema structure, mapping schemas, `.optional().default([])` pattern
- `src/lib/prompt-assembly.ts` -- assembleSystemPrompt, buildSectorwerkBlock (1500 char cap), layered context injection
- `src/lib/din-service.ts` -- getStepCompletions, buildChainsForSector (chain traversal logic), mapping traversal patterns
- `src/components/steps/DINMappingStep.tsx` -- sidebar (line 1440-1472), goal selection (line 530), handleAIGenerate (line 1045)
- `src/lib/session-context.tsx` -- updateSession callback pattern, functional updater, loadSession migration
- `src/app/api/din-mapping/route.ts` -- current prompt assembly, sectorwerk block injection
- `src/app/api/din-suggest/route.ts` -- current prompt assembly for suggest/create modes

### Secondary (MEDIUM confidence)
- `.planning/phases/06-cyclisch-doel-voor-doel-werken/06-CONTEXT.md` -- all implementation decisions D-01 through D-12

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all established patterns
- Architecture: HIGH -- every extension point is documented with existing code references
- Pitfalls: HIGH -- drawn from direct code inspection of race conditions, mapping traversal, and prompt budget patterns

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable -- internal codebase patterns, no external API changes)
