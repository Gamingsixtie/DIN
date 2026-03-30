# Architecture Patterns

**Domain:** Multi-step programmamanagement wizard (DIN-methodiek)
**Researched:** 2026-03-30
**Focus:** Data flow between wizard steps, AI prompt context, cross-sector analysis, cyclical goal processing, network visualization

## Recommended Architecture

### Current State Assessment

The existing architecture is fundamentally sound: React Context for session state, localStorage persistence, API routes for AI calls, and a clear step-based workflow. The problems are not structural but about **data flow between steps** and **context accumulation** -- information generated in Step 1 (Sectorwerk) does not automatically enrich Step 2 (DIN-Mapping), and there is no cyclical goal-by-goal processing pattern.

### Target Architecture: Context Pipeline

The core improvement is a **context pipeline** -- each step produces structured output that becomes input context for subsequent steps. This is not a rewrite; it is adding a data-propagation layer on top of the existing session model.

```
                    Context Pipeline
                    ================

Step 0: Import     Step 1: Sectorwerk    Step 2: DIN-Mapping    Step 3: Cross-Analyse
 [KiB data]    -->  [Sector analyses]  -->  [DIN entities]    -->  [Synergy data]
   |                     |                       |                      |
   v                     v                       v                      v
 vision             sectorAnalyses          benefits/caps/efforts   crossAnalyse
 goals              (per sector)            goalBenefitMaps         hefboomResults
 scope                                     benefitCapabilityMaps
                                           capabilityEffortMaps

         Each step reads ALL previous context via session
         Each AI call receives a CURATED SUBSET of prior context
```

## Component Boundaries

| Component | Responsibility | Reads From | Writes To |
|-----------|---------------|------------|-----------|
| **ImportStep** | Parse KiB data, set vision/goals/scope | User uploads | `session.vision`, `session.goals`, `session.scope` |
| **SectorWerkStep** | Upload sector plans, run AI analysis per sector | `session.goals`, user uploads | `session.sectorPlans`, `session.sectorAnalyses` |
| **DINMappingStep** | Generate DIN entities per goal per sector | `session.goals`, `session.sectorPlans`, `session.sectorAnalyses` | `session.benefits/capabilities/efforts`, mapping tables |
| **CrossAnalyseStep** | Identify synergies, gaps, leverage across sectors | All DIN entities + maps | `session.crossAnalyse` |
| **PrioriteringStep** | Schedule, vote, approve efforts | All DIN entities | `session.efforts` (quarter, votes, approvalStatus) |
| **ExportStep** | Generate Word document | Entire session | File download |
| **SessionContext** | In-memory state + localStorage persistence | localStorage | React state + localStorage |
| **AI Client** | Compose prompts, call Claude, parse responses | Prompt templates + context data | Raw AI responses |
| **DIN Service** | CRUD, chain building, cross-analysis helpers | Session entities | Derived data (chains, clusters, gaps) |
| **Context Assembler** (NEW) | Build curated AI prompt context from session state | Full session | Structured context objects for AI prompts |

## Data Flow Patterns

### Pattern 1: Step-to-Step Context Propagation

**What:** Each step's AI calls receive curated context from all prior steps, not just the immediate input.

**Current problem:** The `generateDINMapping()` function receives `sectorAnalysis` as an optional string, but: (a) it is truncated to 3000 chars, (b) the structured `SectorplanAnalyseResult` is re-serialized and re-parsed losing fidelity, (c) vision and scope from Step 0 are not passed at all.

**Recommended approach:** Create a `ContextAssembler` module that builds prompt-ready context from session state.

```typescript
// src/lib/context-assembler.ts

interface DINMappingContext {
  vision: string;                          // From Step 0
  goal: { name: string; description: string };  // Current goal
  otherGoals: { name: string; description: string }[];  // Other KiB goals
  scope: { inScope: string[]; outScope: string[] };     // From Step 0
  sectorPlan: { rawText: string } | null;               // From Step 1
  sectorAnalysis: SectorplanAnalyseResult | null;       // From Step 1 (STRUCTURED, not string)
  existingDINForGoal: {                                 // Previously generated for OTHER sectors
    benefits: DINBenefit[];
    capabilities: DINCapability[];
    efforts: DINEffort[];
  };
  previousGoalResults?: {                               // DIN from COMPLETED goals
    goalName: string;
    benefitCount: number;
    sharedCapabilities: string[];
  }[];
}

function assembleDINMappingContext(
  session: DINSession,
  goalId: string,
  sectorId: string
): DINMappingContext { ... }
```

**Why:** The AI produces better, more focused output when it knows (a) what the vision is, (b) what the sector plan already identified, (c) what was already generated for other sectors of the same goal (to avoid duplication and find synergies).

**Build dependency:** Requires Step 0 and Step 1 data to be stored in structured form (already the case for `sectorAnalyses`).

### Pattern 2: Cyclical Goal-by-Goal Processing

**What:** Process one goal completely through the DIN chain (across all 3 sectors) before moving to the next goal.

**Current problem:** `DINMappingStep` lets users navigate freely between goals and sectors, but there is no structured workflow that ensures complete processing. The user can skip sectors or goals without the UI guiding them.

**Recommended approach:** A **Goal Queue** pattern with progress tracking.

```typescript
// Goal processing state (add to DINSession or local step state)
interface GoalProcessingState {
  currentGoalIndex: number;         // Which goal is being processed
  goalCompletionMap: Record<string, {  // goalId -> completion per sector
    [sectorId: string]: {
      dinGenerated: boolean;        // AI mapping was run
      userReviewed: boolean;        // User confirmed/edited results
    };
  }>;
}
```

**UI flow:**
1. Show Goal 1 as the active focus
2. Within Goal 1, show tabs for PO / VO / Zakelijk
3. For each sector: generate DIN -> user reviews -> mark complete
4. When all 3 sectors are done for Goal 1, show summary + "Ga naar Doel 2"
5. Goal 2 AI calls receive Goal 1's results as context (avoid duplicating shared capabilities)

**Why:** This matches the methodology ("cyclisch per doel") and produces higher quality output because the AI can reference what was already decided for previous goals.

### Pattern 3: AI Prompt Context Management

**What:** Structured approach to what goes into each AI prompt, with explicit token budgets.

**Current problem:** Context is assembled ad-hoc with `.slice(0, 3000)` truncation. The structured `SectorplanAnalyseResult` is serialized to a string, stored as JSON in a string field, then re-parsed and re-serialized when building the next prompt -- losing structure and wasting tokens on JSON formatting.

**Recommended approach:**

```typescript
// src/lib/prompt-context.ts

// Token budget allocation per prompt type
const TOKEN_BUDGETS = {
  dinMapping: {
    systemPrompt: 1500,     // Methodology instructions
    vision: 200,            // Programme vision (beknopt)
    goal: 300,              // Current goal
    sectorPlan: 2000,       // Sector plan text (most important)
    sectorAnalysis: 1500,   // Previous AI analysis (structured summary)
    existingDIN: 800,       // What exists for other sectors (dedup context)
    outputInstructions: 500, // JSON format spec
    // Total: ~6800 tokens prompt, leaving room for 8192 output
  },
  crossAnalyse: {
    allDINData: 12000,       // All entities across all sectors
    methodology: 1000,       // Cross-analysis instructions
    // Total: ~13000, using opus for 8192 output
  },
};

function buildDINMappingPrompt(ctx: DINMappingContext): {
  system: string;
  user: string;
} {
  // Use structured data, not raw strings
  // Prioritize: goal > sectorAnalysis > sectorPlan > existing DIN
  // Truncate intelligently: summarize sectorPlan instead of hard cut
}
```

**Key principles:**
- Store `sectorAnalyses` as `Record<string, SectorplanAnalyseResult>` (typed), not `Record<string, string>`
- Pass structured analysis data to prompts, not re-serialized JSON strings
- Include vision summary in every DIN-mapping prompt (currently missing)
- Include "what already exists for other sectors" to promote cross-sector coherence

### Pattern 4: Cross-Sector Analysis Pipeline

**What:** Two-phase cross-analysis -- client-side structural analysis + AI-powered semantic analysis.

**Current implementation is good:** `findBenefitClusters()`, `findEffortClusters()`, `findGaps()`, `getDomainBalance()` already provide structural analysis. The `generateCrossAnalyse()` AI call provides semantic analysis.

**Improvement:** The client-side analysis should feed INTO the AI cross-analysis, not run independently.

```
Phase 1 (client-side, instant):
  findBenefitClusters() -> benefit clusters with hefboomScore
  findEffortClusters() -> effort clusters with consolidatieAdvies
  findGaps() -> structural gaps in the chain
  getDomainBalance() -> effort distribution across 4 domains

Phase 2 (AI-powered, with Phase 1 as input):
  generateCrossAnalyse({
    ...allDINData,
    structuralAnalysis: {           // NEW: feed client-side findings
      benefitClusters: [...],       // "These benefits overlap across sectors"
      effortClusters: [...],        // "These efforts could be consolidated"
      gaps: [...],                  // "These chains are incomplete"
      domainBalance: {...},         // "Cultuur is underrepresented"
    }
  })
```

**Why:** The AI can then focus on qualitative assessment and strategic recommendations rather than re-discovering what the code already computed. This makes the AI output more actionable and less generic.

### Pattern 5: Network Visualization (DAG)

**What:** Visualize the Goal -> Benefit -> Capability -> Effort chain as an interactive directed acyclic graph.

**Current implementation:** `DINNetworkGraph.tsx` uses a custom card-based layout (ChainRow pattern: Benefit -> Capability(s) -> Effort(s)), not a true graph visualization. This works well for per-sector, per-goal views.

**Recommended for cross-sector view:** Use a layered DAG layout for the cross-analysis view where shared capabilities/efforts across sectors need to be visible.

```
Layout approach (no library needed for current scale):

Layer 0: Goals (3-5 nodes)
  |
Layer 1: Benefits (grouped by goal, colored by sector)
  |
Layer 2: Capabilities (shared ones highlighted, spanning sectors)
  |
Layer 3: Efforts (grouped by domain, colored by sector)

Interaction:
- Click a node -> highlight its full chain (upstream + downstream)
- Shared capabilities glow to show cross-sector leverage
- Gaps shown as dashed/empty nodes
```

**Library recommendation:** For the current scale (3-5 goals, ~30 benefits, ~20 capabilities, ~30 efforts), a custom SVG/CSS approach is sufficient. The existing `DINNetworkGraph.tsx` card-based pattern is the right call for per-sector views. For a cross-sector overview, consider:

| Option | When to Use | Why |
|--------|-------------|-----|
| Custom CSS grid + SVG lines | < 100 nodes | Full control, no dependency, matches existing patterns |
| React Flow | > 100 nodes or user needs drag/zoom | Industry standard for node-based editors |
| D3-dag | Complex DAG layout needed | Specialized DAG layout algorithms |

**Recommendation:** Stay with custom CSS/SVG for now. The DIN network at this scale (3 sectors x 5 goals x ~4 benefits = ~60 benefit nodes, ~40 capability nodes, ~50 effort nodes) is manageable without a graph library. Add React Flow only if users need interactive graph editing.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic Session Object
**What:** Storing everything in a single DINSession object that grows unboundedly.
**Why bad:** The session object already has 20+ fields. As context accumulates (sectorAnalyses, crossAnalyse, verrijkteSectorplannen), localStorage serialization becomes slow and the object becomes unwieldy.
**Instead:** Keep the current flat structure but be disciplined about what goes in. AI-generated text (crossAnalyse, verrijkteSectorplannen) should be stored separately or lazily loaded. For now, the session size is manageable (likely <500KB), but watch this.

### Anti-Pattern 2: String-Typed Structured Data
**What:** Storing `sectorAnalyses` as `Record<string, string>` when the value is always a JSON-serialized `SectorplanAnalyseResult`.
**Why bad:** Every consumer has to `JSON.parse()` and `JSON.match(/\{[\s\S]*\}/)`, duplicating parsing logic and losing type safety. The `ai-client.ts` contains duplicate JSON-parsing code in `generateDINMapping()` and `generateSectorIntegratie()`.
**Instead:** Store as `Record<string, SectorplanAnalyseResult>` (already typed). Parse once at the API boundary, store structured.

### Anti-Pattern 3: Duplicated Context Assembly
**What:** Both `generateDINMapping()` and `generateSectorIntegratie()` contain nearly identical code for parsing sectorAnalysis JSON and building text summaries.
**Why bad:** Bug fixes and improvements must be applied in multiple places.
**Instead:** Extract a shared `summarizeSectorAnalysis(analysis: SectorplanAnalyseResult): string` function, or better, use the ContextAssembler pattern from Pattern 1.

### Anti-Pattern 4: Fire-and-Forget AI Responses
**What:** AI responses are parsed with `result.match(/\{[\s\S]*\}/)` and if parsing fails, the raw text is returned or empty arrays are used.
**Why bad:** No feedback loop -- if the AI produces invalid JSON, the user sees empty results with no explanation. The regex-based JSON extraction is fragile (fails on nested JSON with string-embedded braces).
**Instead:** Use Anthropic's structured output (tool_use) for predictable JSON responses, or at minimum provide user-visible error messages when parsing fails.

## Scalability Considerations

| Concern | Current (1 user, ~5 goals) | At 10 goals, 3 sectors | At production scale |
|---------|---------------------------|------------------------|---------------------|
| Session size | ~50KB localStorage | ~200KB, still fine | May need IndexedDB for >1MB |
| AI calls per session | ~15-20 | ~50-60 | Consider batch processing |
| Cross-analysis time | 10-20s (single call) | 20-30s (more data) | Pre-compute structural analysis, AI for insights only |
| Network visualization | ~50 nodes, CSS fine | ~150 nodes, CSS strains | React Flow if interactive editing needed |
| Context window usage | ~7K tokens per prompt | ~12K tokens per prompt | Monitor token usage, implement context summarization |

## Suggested Build Order

Based on dependency analysis, the components should be built in this order:

### Phase 1: Context Foundation
1. **Type the sectorAnalyses field** -- Change from `Record<string, string>` to `Record<string, SectorplanAnalyseResult>` with migration logic for existing sessions
2. **Create ContextAssembler module** -- Extract context-building logic from `ai-client.ts` into a dedicated module
3. **Wire sectorAnalysis into DIN-Mapping prompts** -- Use structured data instead of re-parsed strings

**Rationale:** Everything downstream depends on having clean, typed, structured data flowing between steps. This is the foundation.

### Phase 2: Goal-by-Goal Workflow
4. **Add GoalProcessingState** -- Track which goals/sectors have been processed
5. **Implement cyclical goal UI** -- Focus on one goal at a time, show progress
6. **Pass previous goal context to AI** -- "Goal 1 already has these capabilities, reuse where possible"

**Rationale:** Depends on Phase 1 (context assembly). The workflow change is primarily UI + state management.

### Phase 3: AI Quality Improvements
7. **Implement token-budgeted prompt building** -- Explicit token allocation per context section
8. **Add vision/scope to DIN-mapping prompts** -- Currently missing, improves output relevance
9. **Feed structural analysis into AI cross-analysis** -- Client-side findings as AI input

**Rationale:** Depends on Phase 1 (ContextAssembler) and Phase 2 (complete data from cyclical processing).

### Phase 4: Cross-Sector Analysis
10. **Enhance cross-analysis pipeline** -- Two-phase: structural + semantic
11. **Cross-sector DAG visualization** -- For the overview after cross-analysis
12. **Shared capability/effort identification** -- Surface leverage points across sectors

**Rationale:** Depends on Phase 2 (all goals processed) and Phase 3 (better AI output to analyze).

### Phase 5: Polish and Export
13. **Improve network visualization** -- Highlight shared nodes, show gaps
14. **Enhanced Word export** -- Include cross-analysis findings, roadmap
15. **Session quality indicators** -- Show completeness, flag gaps before export

**Rationale:** Depends on all prior phases producing complete, high-quality data.

## Key Data Flow Diagram

```
USER INPUT                    AI PROCESSING                 SESSION STATE
==========                    =============                 =============

KiB Upload -----> parse-sector API -----> session.vision
                                          session.goals
                                          session.scope

Sector DOCX ----> parse-sector API -----> session.sectorPlans[sector].rawText
                  |
                  v
                  analyze-sectorplan ---> session.sectorAnalyses[sector]
                  API                     (SectorplanAnalyseResult)
                  (uses: goals)

[User triggers    din-mapping API ------> session.benefits[]
 DIN generation]  (uses: goal,            session.capabilities[]
                   sectorPlan,            session.efforts[]
                   sectorAnalysis,        session.goalBenefitMaps[]
                   vision*,               session.benefitCapabilityMaps[]
                   scope*,                session.capabilityEffortMaps[]
                   previousGoals*)

                   * = currently missing, should be added

[User triggers    cross-analyse API ----> session.crossAnalyse
 cross-analysis]  (uses: ALL DIN data,    (CrossAnalyseResult)
                   structuralAnalysis*)

                   * = currently missing, should be added

[User edits       direct state update --> session.efforts[].quarter
 priorities]                              session.efforts[].votes
                                          session.efforts[].approvalStatus

[User exports]    export API -----------> Word document download
                  (uses: entire session)
```

## Sources

- Codebase analysis: `src/lib/ai-client.ts`, `src/lib/session-context.tsx`, `src/lib/din-service.ts`, `src/lib/types.ts`
- Codebase analysis: `src/components/steps/DINMappingStep.tsx`, `src/components/steps/SectorWerkStep.tsx`, `src/components/steps/CrossAnalyseStep.tsx`
- Codebase analysis: `src/components/din/DINCreatieWizard.tsx`, `src/components/din/DINNetworkGraph.tsx`
- Domain methodology: DIN-methodiek (Doelen-Inspanningennetwerk), Wijnen & Van der Tak
- Confidence: HIGH -- based entirely on codebase analysis, not external research

---

*Architecture research: 2026-03-30*
