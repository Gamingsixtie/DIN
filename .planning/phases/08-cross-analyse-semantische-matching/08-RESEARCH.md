# Phase 8: Cross-Analyse Semantische Matching - Research

**Researched:** 2026-04-03
**Domain:** AI-driven semantic matching + consolidation UI for DIN cross-sector analysis
**Confidence:** HIGH

## Summary

Phase 8 replaces the local tokenizer-based matching (Snowball stemmer, `findBenefitClusters`, `findEffortClusters`, `findSharedCapabilities`) with a single AI-driven Claude API call that performs semantic matching across all DIN items. The scope is well-defined: upgrade the existing `CROSS_ANALYSE_PROMPT` and `AICrossAnalyseSchema`, extend DIN entity schemas with consolidation flags, build new UI sections (VermogenClusterSection, InspanningClusterSection, ProjectMatchingSection), and implement the consolidation flow (merge/align/separate with undo).

All infrastructure is already in place. The project uses `callClaudeWithValidation()` with Zod schemas for structured AI output, `assembleSystemPrompt()` for layered context injection, and `updateSession(prev => ...)` for state mutations. No new libraries or dependencies are needed. The work consists of extending existing patterns into the cross-analyse domain.

**Primary recommendation:** Extend the existing AI cross-analyse pipeline (prompt + schema + route + UI) with semantic matching clusters, consolidation flags, and project matching. Use the established `callClaudeWithValidation` + Zod schema pattern. Keep all changes within existing files (schemas.ts, prompts.ts, cross-analyse/route.ts, CrossAnalyseStep.tsx) plus new UI sub-components.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Volledig AI-gestuurde semantische matching via Claude API. Lokale tokenizer-functies (`findBenefitClusters`, `findEffortClusters`, `findSharedCapabilities`) worden vervangen door AI-calls voor de cross-analyse.
- **D-02:** De nl-tokenizer.ts (Snowball stemmer) blijft bestaan voor eventueel ander gebruik, maar wordt niet meer gebruikt voor cross-analyse matching.
- **D-03:** Baten worden NIET gematcht of samengevoegd. Baten zijn per sector verschillend -- methodisch correct. Baten worden wel getoond als context bij geconsolideerde vermogens/inspanningen.
- **D-04:** Vermogens en inspanningen worden semantisch gematcht over sectoren heen. Dit zijn de consolidatiekandidaten.
- **D-05:** Matching gebeurt over alle doelen heen in een AI-call. Niet per doel apart.
- **D-06:** Een AI-call die alle DIN-items ontvangt en per niveau (vermogens, inspanningen) clusters teruggeeft, inclusief koppeling naar sector-baten.
- **D-07:** Lopende/externe projecten worden als extra laag meegenomen. AI matcht projecten aan vermogens en baten.
- **D-08:** AI geeft expliciet aan als een lopend project NIET thuishoort in de DIN-keten.
- **D-09:** Advies + actie per cluster. Consolidatie-advies (combineren/afstemmen/apart houden). Gebruiker kan met een klik items samenvoegen.
- **D-10:** Bij samenvoegen blijven originele items bestaan met 'geconsolideerd' vlag + link naar gedeeld item. UI vouwt samen/filtert.
- **D-11:** Geconsolideerde vermogens/inspanningen tonen altijd de keten: aan welke sector-specifieke baten ze bijdragen.
- **D-12:** Bestaande CROSS_ANALYSE_PROMPT en AICrossAnalyseSchema upgraden. Geen aparte stap of tab.
- **D-13:** CrossAnalyseStep UI uitbreiden met consolidatie-acties bij geidentificeerde clusters.

### Claude's Discretion
- Exacte prompt-formulering voor semantische matching instructie
- UI-ontwerp van samenvoeg-knoppen en geconsolideerd-markering
- Schema-structuur van de uitgebreide cross-analyse response
- Hoe de 'geconsolideerd' vlag technisch wordt opgeslagen (nieuw veld op DINCapability/DINEffort of apart mapping object)
- Visuele weergave van de project-matching resultaten
- Hoe undo van consolidatie werkt (vlag verwijderen + UI-state)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CROSS-01 | Cross-analyse herkent gedeelde baten over PO/VO/Zakelijk sectoren (semantisch, niet alleen exacte match) | Per D-03: baten worden NIET gematcht/samengevoegd, maar AI toont ze als context bij geconsolideerde vermogens/inspanningen. The semantic recognition happens at vermogen/inspanning level; baat context makes the hefboomwerking visible. The existing AI call already receives all benefits -- the prompt upgrade adds instructions to reference sector-specific baten when presenting clusters. |
| CROSS-02 | Cross-analyse herkent gedeelde vermogens die voor meerdere sectoren gelden | AI semantic matching replaces `findSharedCapabilities()` (exact match) and `findBenefitClusters()` (tokenizer). Extended `AICrossAnalyseSchema` gets new `vermogenClusters` section with cluster items containing matched items, sector badges, AI advice, and baat-chain references. |
| CROSS-03 | Cross-analyse herkent gedeelde inspanningen die meerdere sectoren dienen en consolideert deze | AI semantic matching replaces `findEffortClusters()`. Extended schema gets `inspanningClusters` section. Consolidation UI (merge/align/separate) allows one-click merging with undo. New `consolidated` + `consolidatedInto` fields on DINCapability and DINEffort schemas. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | 0.78.0 | Claude API for semantic matching | Already in use, callClaudeWithValidation pattern established |
| zod | 4.3.6 | Schema validation for AI responses | Already in use, AICrossAnalyseSchema pattern established |
| React 19 | 19.1.0 | UI components | Already in use |
| Next.js 16 | 16.1.0 | API routes + SSR | Already in use |
| Tailwind CSS 4 | 4.1.0 | Styling | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.2 | Unit testing schema changes | Test consolidation logic and schema validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single AI call (D-06) | Multiple targeted AI calls per level | Single call is cheaper, ensures holistic analysis, but may hit token limits with large DIN datasets |
| `consolidated` flag on entities | Separate consolidation mapping table | Flag is simpler, CONTEXT.md explicitly chose this approach (D-10) |

**Installation:**
No new packages needed. All dependencies are already installed.

## Architecture Patterns

### Recommended Change Structure
```
src/
├── lib/
│   ├── schemas.ts                    # Extend DINCapability/DINEffort + AICrossAnalyseSchema
│   ├── prompts.ts                    # Upgrade CROSS_ANALYSE_PROMPT
│   ├── din-service.ts                # Keep existing functions, remove from cross-analyse imports
│   └── prompt-assembly.ts            # No changes needed (cross-analyse use case already exists)
├── app/
│   └── api/
│       └── cross-analyse/
│           └── route.ts              # Update user message assembly, schema reference
└── components/
    └── steps/
        └── CrossAnalyseStep.tsx      # Add new sections, consolidation logic
```

### Pattern 1: Schema Extension for Consolidation Flags
**What:** Add optional `consolidated` and `consolidatedInto` fields to DINCapabilitySchema and DINEffortSchema
**When to use:** When items are merged into a shared item
**Example:**
```typescript
// In schemas.ts - extend existing schemas
export const DINCapabilitySchema = z.object({
  // ... existing fields ...
  consolidated: z.boolean().optional(),        // true when merged
  consolidatedInto: z.string().optional(),     // id of the shared item
});

export const DINEffortSchema = z.object({
  // ... existing fields ...
  consolidated: z.boolean().optional(),
  consolidatedInto: z.string().optional(),
});
```
**Confidence:** HIGH -- Zod optional fields with no default are backward-compatible with existing data.

### Pattern 2: Extended AI Response Schema for Clusters
**What:** Add `vermogenClusters`, `inspanningClusters`, and `projectMatching` sections to AICrossAnalyseSchema
**When to use:** AI returns semantic matching results alongside existing analysis sections
**Example:**
```typescript
// New sub-schemas for cross-analyse response
export const VermogenClusterItemSchema = z.object({
  clusterTitel: z.string(),
  items: z.array(z.object({
    beschrijving: z.string(),     // The vermogen description (for matching to session data)
    sector: z.string(),
  })),
  batenContext: z.array(z.object({
    baat: z.string(),
    sector: z.string(),
  })),
  advies: z.string(),             // AI advice: combineren/afstemmen/apart houden
  aanbeveling: z.enum(["combineren", "afstemmen", "apart_houden"]),
});

export const InspanningClusterItemSchema = z.object({
  clusterTitel: z.string(),
  items: z.array(z.object({
    beschrijving: z.string(),
    sector: z.string(),
    domein: z.string(),
  })),
  batenContext: z.array(z.object({
    baat: z.string(),
    sector: z.string(),
  })),
  advies: z.string(),
  aanbeveling: z.enum(["combineren", "afstemmen", "apart_houden"]),
});

export const ProjectMatchItemSchema = z.object({
  project: z.string(),
  heeftMatch: z.boolean(),
  gekoppeldAan: z.string().optional(),   // vermogen/baat name if matched
  type: z.string().optional(),            // "vermogen" | "baat" | "inspanning"
  advies: z.string(),
});
```
**Confidence:** HIGH -- follows established pattern of AICrossAnalyseSchema with optional defaults.

### Pattern 3: Consolidation State Management
**What:** Use `updateSession(prev => ...)` functional updater to create shared items and flag originals
**When to use:** When user clicks "Combineren" (merge) on a cluster
**Example:**
```typescript
function handleMergeCluster(clusterItems: {id: string; sectorId: string}[], type: "capability" | "effort") {
  updateSession(prev => {
    const newId = crypto.randomUUID();
    // Create shared item from first item as template, multi-sector
    // Flag originals with consolidated: true, consolidatedInto: newId
    // Add mappings for all sectors
    return {
      ...prev,
      capabilities: type === "capability" ? prev.capabilities.map(c =>
        clusterItems.some(ci => ci.id === c.id)
          ? { ...c, consolidated: true, consolidatedInto: newId }
          : c
      ).concat([sharedCapability]) : prev.capabilities,
      // ... similar for efforts
    };
  });
}
```
**Confidence:** HIGH -- established pattern from Phase 2.

### Pattern 4: AI Prompt Upgrade for Semantic Matching
**What:** Extend CROSS_ANALYSE_PROMPT with semantic matching instructions and structured cluster output
**When to use:** Single call that replaces both existing analysis + new semantic matching
**Key considerations:**
- Must instruct AI to identify clusters based on semantic similarity, not just word overlap
- Must include baten as context (per D-03) even though they are not matched
- Must handle external projects (per D-07, D-08)
- JSON response structure must extend existing schema (backward-compatible)
- Token budget: current call uses `maxTokens: 8192` and `model: "claude-opus-4-6"` -- may need increase for larger response

### Pattern 5: Matching AI Cluster Items to Session Data
**What:** Map AI-returned cluster descriptions back to actual session entity IDs
**When to use:** AI returns descriptions (strings), but consolidation needs entity IDs
**Critical insight:** The AI does not know entity IDs. It works with descriptions. The client must fuzzy-match AI cluster item descriptions back to actual session entities to resolve IDs for consolidation.
**Approach:** When the AI returns a cluster with items like `{beschrijving: "Medewerkers beheersen klantgesprek-methodiek", sector: "PO"}`, the client searches `session.capabilities` for items where `sectorId === "PO"` and `description` or `title` closely matches. Use case-insensitive includes/startsWith as the matching heuristic -- the AI is quoting the data it received, so matches should be close to exact.
**Confidence:** MEDIUM -- matching accuracy depends on AI faithfully quoting the input descriptions.

### Anti-Patterns to Avoid
- **Separate AI calls per cluster:** D-05/D-06 explicitly require one call for all items. Do not split.
- **Destructive merge:** D-10 explicitly requires preserving originals. Never delete items on merge.
- **Matching baten across sectors:** D-03 explicitly forbids this. Baten are sector-specific by methodology.
- **Client-side semantic matching:** The whole point is to move from tokenizer-based to AI-based matching. Do not add new client-side similarity algorithms.
- **Breaking backward compatibility:** The session.crossAnalyse is stored as JSON string. New schema must parse old data gracefully (all new fields optional with defaults).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Semantic matching | Custom embedding/cosine similarity | Claude API via callClaudeWithValidation | D-01 mandates AI-driven matching, existing infra handles structured output |
| Schema validation | Manual JSON parsing | Zod schemas with .optional().default() | Established pattern, backward-compatible, type-safe |
| State management | Custom consolidation store | updateSession functional updater + localStorage-first | Established dual persistence pattern |
| ID resolution | Exact string matching only | Case-insensitive search with sector filter | AI may rephrase slightly, but sector+description combo is unique enough |

**Key insight:** This phase is primarily a prompt engineering + schema extension + UI task. No new algorithms, libraries, or architectural patterns are needed. The entire AI matching pipeline already exists and just needs to be upgraded with richer prompt instructions and a wider output schema.

## Common Pitfalls

### Pitfall 1: Token Limit on Large DIN Datasets
**What goes wrong:** With 5 goals x 3 sectors x ~4 baten + vermogens + inspanningen each, the input data can be 10K+ tokens. Combined with the expanded prompt and expected larger output, the 8192 maxTokens may be insufficient.
**Why it happens:** The current call already uses `maxTokens: 8192` for the response. The expanded schema (adding 3 new sections) means more output tokens needed.
**How to avoid:** Increase maxTokens to at least 12288 or 16384 for the cross-analyse call. The model is already claude-opus-4-6 which supports large context. Also truncate/summarize the input data sent to the API -- the current route already slices to 15000 chars.
**Warning signs:** Truncated AI responses, incomplete cluster sections, or Zod validation failures on missing required fields.

### Pitfall 2: Backward Compatibility of AICrossAnalyseSchema
**What goes wrong:** Existing saved sessions have `crossAnalyse` as a JSON string conforming to the old schema. If the new schema makes new fields required, old data fails validation.
**Why it happens:** The session loads crossAnalyse from localStorage and parses it against the schema on mount.
**How to avoid:** All new sections (vermogenClusters, inspanningClusters, projectMatching) MUST be `.optional().default([])` in the schema. The existing CrossAnalyseStep already handles missing sections gracefully.
**Warning signs:** Console errors when loading sessions that have old cross-analyse results saved.

### Pitfall 3: AI Description-to-ID Matching Failures
**What goes wrong:** The AI returns cluster item descriptions that don't exactly match any session entity, causing empty consolidation attempts.
**Why it happens:** The AI receives entity data as text in the prompt. It may rephrase, abbreviate, or slightly modify descriptions when quoting them back.
**How to avoid:** (1) Include entity IDs in the data sent to the AI and ask it to return them. This is the most reliable approach. (2) Alternatively, use a multi-step matching: exact match first, then case-insensitive, then substring match. (3) Include a fallback that shows unmatched clusters as read-only (no merge button).
**Warning signs:** Clusters appear in AI results but "Combineren" button does not resolve to actual items.

### Pitfall 4: Consolidation Undo Data Integrity
**What goes wrong:** Undoing a consolidation leaves orphaned mappings or fails to restore original state.
**Why it happens:** The merge creates a new shared item AND modifies originals AND adds new mappings. Undo must reverse all three operations atomically.
**How to avoid:** Store the shared item ID on originals (consolidatedInto field). On undo: (1) find all items with that consolidatedInto, (2) clear their flags, (3) remove the shared item, (4) remove shared item mappings. Use a single updateSession call for atomicity.
**Warning signs:** "Ghost" items in the session after undo, duplicate entries in mapping arrays.

### Pitfall 5: Prompt Budget for Semantic Matching Instructions
**What goes wrong:** Adding detailed semantic matching instructions to CROSS_ANALYSE_PROMPT makes the system prompt too long, reducing the AI's effective input budget for DIN data.
**Why it happens:** The prompt goes through assembleSystemPrompt which adds programmaboek context (~2K chars for cross-analyse use case) + KiB context (~1K chars). Adding verbose matching instructions on top can crowd out room for actual DIN data.
**How to avoid:** Keep semantic matching instructions concise. Focus on the JSON output structure and brief behavioral instructions. The model already understands semantic similarity -- it just needs to know the output format.
**Warning signs:** AI truncates input data, produces incomplete responses, or ignores some DIN items entirely.

### Pitfall 6: Consolidated Items in Other UI Components
**What goes wrong:** Consolidated items still appear as separate entries in the Vermogen-Synergie Matrix and Inspanningen per Domein sections, showing confusing duplicates.
**Why it happens:** These existing local analysis sections (`findSharedCapabilities`, `getDomainBalance`) read directly from `session.capabilities` and `session.efforts` without filtering consolidated items.
**How to avoid:** Filter out items where `consolidated === true` in the existing local analysis sections. Only show the shared item (which has `consolidated` undefined/false). Per D-10: "In de UI worden ze samengevouwen/gefilterd."
**Warning signs:** Duplicate items in the synergie matrix and domain balance after consolidation.

## Code Examples

### Example 1: Extended CROSS_ANALYSE_PROMPT (key addition)
```typescript
// Append to existing CROSS_ANALYSE_PROMPT JSON structure:
// After "externeProjecten" section, add:

  "vermogenClusters": {
    "titel": "Gedeelde vermogens",
    "toelichting": "Korte samenvatting (1-2 zinnen)",
    "items": [
      {
        "clusterTitel": "Beschrijvende naam van het gedeelde vermogen",
        "items": [
          {"id": "uuid-van-het-vermogen", "beschrijving": "Vermogen beschrijving", "sector": "PO"},
          {"id": "uuid-van-het-vermogen", "beschrijving": "Vergelijkbaar vermogen", "sector": "VO"}
        ],
        "batenContext": [
          {"baat": "Baat waar dit vermogen aan bijdraagt", "sector": "PO"},
          {"baat": "Andere baat", "sector": "VO"}
        ],
        "advies": "Concreet consolidatie-advies",
        "aanbeveling": "combineren"
      }
    ]
  },
  "inspanningClusters": { ... },
  "projectMatching": { ... }
```
**Confidence:** HIGH -- direct extension of existing JSON structure pattern.

### Example 2: Sending Entity IDs to AI for Reliable Matching
```typescript
// In cross-analyse/route.ts, format capabilities with IDs:
const capsForAI = session.capabilities.map(c => ({
  id: c.id,
  sector: c.sectorId,
  title: c.title || "",
  description: c.description,
}));

// In the prompt, instruct AI to return these IDs in clusters:
// "Gebruik de meegegeven id-velden om items te identificeren in je clusters."
```
**Confidence:** HIGH -- eliminates the fuzzy matching problem entirely. The API route already sends full entity data including IDs.

### Example 3: Consolidation Merge Handler
```typescript
function handleMergeCapabilities(clusterItemIds: string[]) {
  if (clusterItemIds.length < 2) return;

  updateSession(prev => {
    const itemsToMerge = prev.capabilities.filter(c => clusterItemIds.includes(c.id));
    if (itemsToMerge.length < 2) return prev;

    const newId = crypto.randomUUID();
    const allSectors = [...new Set(itemsToMerge.map(c => c.sectorId))];

    // Create shared item from first item as template
    const sharedItem: DINCapability = {
      ...itemsToMerge[0],
      id: newId,
      sectorId: allSectors[0], // Primary sector
      relatedSectors: allSectors,
      title: itemsToMerge[0].title || itemsToMerge[0].description.slice(0, 60),
    };

    // Flag originals
    const updatedCaps = prev.capabilities.map(c =>
      clusterItemIds.includes(c.id)
        ? { ...c, consolidated: true, consolidatedInto: newId }
        : c
    );

    // Add shared item + copy mappings from originals to shared item
    const newBenCapMaps = [...prev.benefitCapabilityMaps];
    const newCapEffMaps = [...prev.capabilityEffortMaps];
    for (const original of itemsToMerge) {
      // Copy benefit->capability mappings
      prev.benefitCapabilityMaps
        .filter(m => m.capabilityId === original.id)
        .forEach(m => {
          if (!newBenCapMaps.some(nm => nm.benefitId === m.benefitId && nm.capabilityId === newId)) {
            newBenCapMaps.push({ benefitId: m.benefitId, capabilityId: newId });
          }
        });
      // Copy capability->effort mappings
      prev.capabilityEffortMaps
        .filter(m => m.capabilityId === original.id)
        .forEach(m => {
          if (!newCapEffMaps.some(nm => nm.effortId === m.effortId && nm.capabilityId === newId)) {
            newCapEffMaps.push({ capabilityId: newId, effortId: m.effortId });
          }
        });
    }

    return {
      ...prev,
      capabilities: [...updatedCaps, sharedItem],
      benefitCapabilityMaps: newBenCapMaps,
      capabilityEffortMaps: newCapEffMaps,
    };
  });
}
```
**Confidence:** HIGH -- follows established updateSession pattern from Phase 2.

### Example 4: Undo Merge Handler
```typescript
function handleUndoMerge(sharedItemId: string, type: "capability" | "effort") {
  updateSession(prev => {
    if (type === "capability") {
      return {
        ...prev,
        // Remove consolidated flags from originals
        capabilities: prev.capabilities
          .filter(c => c.id !== sharedItemId)  // Remove shared item
          .map(c => c.consolidatedInto === sharedItemId
            ? { ...c, consolidated: undefined, consolidatedInto: undefined }
            : c
          ),
        // Remove shared item mappings
        benefitCapabilityMaps: prev.benefitCapabilityMaps.filter(m => m.capabilityId !== sharedItemId),
        capabilityEffortMaps: prev.capabilityEffortMaps.filter(m => m.capabilityId !== sharedItemId),
      };
    }
    // Similar for efforts...
    return prev;
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Snowball stemmer tokenizer matching | AI-driven semantic matching | Phase 8 (this phase) | Far better cross-sector matching for Dutch compound words and semantic equivalents |
| Exact description match (findSharedCapabilities) | AI clusters with advice | Phase 8 (this phase) | Catches conceptually similar but differently worded items |
| No consolidation capability | Merge with undo and original preservation | Phase 8 (this phase) | Actionable output -- users can consolidate with one click |

**Deprecated/outdated:**
- `findBenefitClusters()` and `findEffortClusters()` in din-service.ts: Still exist but no longer used by CrossAnalyseStep after this phase. The tokenizer-based matching was already limited by the SIMILARITY_THRESHOLD of 0.35.
- `findSharedCapabilities()` in din-service.ts: Replaced by AI vermogen-clusters for the cross-analyse view. The function itself stays (may still be used by the stats strip counter).

## Open Questions

1. **Should entity IDs be included in AI prompt data?**
   - What we know: The API route currently sends full entity objects including IDs. The AI can return these IDs in cluster items, eliminating the fuzzy matching problem.
   - What's unclear: Whether including IDs in the prompt slightly degrades AI reasoning quality (noise in the context).
   - Recommendation: Include IDs. The reliability benefit far outweighs any minor prompt quality concern. The AI already handles structured data with IDs in other use cases.

2. **Should crossAnalyse session field change from string to object?**
   - What we know: Currently `crossAnalyse: z.string().optional()` in DINSessionSchema, storing JSON.stringify'd results. The extended schema has significantly more data.
   - What's unclear: Whether to keep string serialization or switch to storing the validated object directly.
   - Recommendation: Keep as string for now (backward compatibility). The pattern is established and works. Switching to object storage would require migration logic for existing sessions.

3. **maxTokens budget for expanded response**
   - What we know: Current cross-analyse call uses `maxTokens: 8192`. With 3 new sections (vermogenClusters, inspanningClusters, projectMatching), the response will be significantly larger.
   - What's unclear: Exact token needs for typical DIN datasets.
   - Recommendation: Increase to 16384. Claude Opus supports this. Better to have headroom than truncated responses.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CROSS-01 | Baten shown as context in clusters (not matched) | unit | `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts -t "batenContext" -x` | Wave 0 |
| CROSS-02 | Vermogen clusters identified by AI, schema validates | unit | `npx vitest run src/lib/__tests__/cross-analyse-schema.test.ts -t "vermogenClusters" -x` | Wave 0 |
| CROSS-03 | Inspanning clusters + consolidation merge/undo logic | unit | `npx vitest run src/lib/__tests__/consolidation.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run && npm run build`
- **Phase gate:** Full suite green + build green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/cross-analyse-schema.test.ts` -- covers extended AICrossAnalyseSchema validation (CROSS-01, CROSS-02)
- [ ] `src/lib/__tests__/consolidation.test.ts` -- covers merge/undo logic for capabilities and efforts (CROSS-03)
- [ ] Schema backward compat test: old crossAnalyse JSON still parses successfully with new schema

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/schemas.ts` -- current AICrossAnalyseSchema structure and Zod patterns
- Existing codebase: `src/app/api/cross-analyse/route.ts` -- current API route structure, model/token config
- Existing codebase: `src/components/steps/CrossAnalyseStep.tsx` -- current UI structure (~900 lines)
- Existing codebase: `src/lib/prompts.ts` lines 47-138 -- current CROSS_ANALYSE_PROMPT
- Existing codebase: `src/lib/din-service.ts` lines 173-413 -- functions to be replaced
- Existing codebase: `src/lib/ai-client.ts` -- callClaudeWithValidation pattern
- Existing codebase: `src/lib/prompt-assembly.ts` -- assembleSystemPrompt pattern with cross-analyse use case
- Phase CONTEXT: `.planning/phases/08-cross-analyse-semantische-matching/08-CONTEXT.md` -- all decisions D-01 through D-13
- Phase UI-SPEC: `.planning/phases/08-cross-analyse-semantische-matching/08-UI-SPEC.md` -- visual contract

### Secondary (MEDIUM confidence)
- Anthropic Claude API documentation -- model supports structured JSON output with large context windows

### Tertiary (LOW confidence)
- None

## Project Constraints (from CLAUDE.md)

- **Tech stack**: Next.js 16, TypeScript, Tailwind CSS 4 -- no new frameworks
- **Taal**: Alle UI en AI-output in het Nederlands (nl-NL)
- **Branding**: Cito blauw (#003366) als primaire kleur
- **Persistence**: localStorage-first (sync-first patroon)
- **AI**: Anthropic Claude API via Next.js API routes
- **Build**: `npm run build` moet slagen zonder fouten na elke wijziging
- **Skills**: Gebruik beschikbare skills (pim-dev-skill, frontend-design, interface-design, ui-design-system) bij implementatie
- **UX**: Alle AI-output moet visueel aantrekkelijk en overzichtelijk zijn -- nooit platte tekst
- **No silent failures**: Altijd gebruikersfeedback tonen bij acties (loading states, success/error meldingen)
- **Methodiek**: Elke feature moet aansluiten bij DIN-methodiek uit `docs/programmaboek.doc`
- **Dual persistence**: localStorage EERST schrijven (synchronous), dan Supabase (async)
- **GSD Workflow**: Werk via GSD commands, niet direct file edits

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns established
- Architecture: HIGH -- extending existing patterns (schemas, prompts, route, UI components)
- Pitfalls: HIGH -- derived from direct code analysis of existing codebase and CONTEXT.md decisions

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable domain, no external dependency changes expected)
