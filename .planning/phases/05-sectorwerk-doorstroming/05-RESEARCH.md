# Phase 5: Sectorwerk Doorstroming - Research

**Researched:** 2026-04-02
**Domain:** Data flow transformation (string -> typed object), UI suggestie panel, AI context injection
**Confidence:** HIGH

## Summary

Phase 5 transforms the sectorwerk-analyse pipeline from a string-based storage model to fully typed `SectorplanAnalyseResult` objects, then surfaces those results as actionable suggestions in the DIN-mapping step. The work spans three interconnected concerns: (1) schema migration in `schemas.ts` and data flow cleanup in `SectorWerkStep.tsx`, (2) a new suggestie panel UI component in `DINMappingStep.tsx` that displays baten-suggesties from sectorwerk analyses with one-click adoption, and (3) injection of structured sectorwerk context into the AI system prompt for DIN-generation endpoints.

The codebase is well-prepared for this change. The `AISectorplanAnalyseSchema` already exists and validates AI output. The `analyze-sectorplan` API route already returns a validated object. The problem is localized: `SectorWerkStep.tsx` stringifies the result before storing it, and downstream consumers (`DINMappingStep.tsx`, `din-mapping/route.ts`) receive and parse that string back. The fix is to stop the unnecessary serialization/deserialization cycle and store the typed object directly.

**Primary recommendation:** Change `sectorAnalyses` from `Record<string, string>` to `Record<string, SectorplanAnalyseResult>` in the Zod schema, update SectorWerkStep to store the object directly, update DINMappingStep and API routes to consume the typed object, add a migration path for legacy string data, and build the suggestie panel as an inklapbaar component at the top of DIN-mapping.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `sectorAnalyses` in DINSession wordt gewijzigd van `Record<string, string>` naar `Record<string, SectorplanAnalyseResult>`. Het Zod schema in `schemas.ts` wordt aangepast.
- **D-02:** `SectorWerkStep.tsx` stopt met JSON.stringify van het API-resultaat en slaat het gevalideerde object direct op.
- **D-03:** Een inklapbaar suggestiepaneel bovenaan de DIN-mapping stap toont per sector de baten-suggesties uit de sectorwerk-analyse. Alleen baten worden getoond -- vermogens en inspanningen worden door de AI gegenereerd op basis van de baat.
- **D-04:** Klik op [+] bij een suggestie neemt de baat direct over als nieuw item in de sessie. Geen wizard-tussenstap.
- **D-05:** Overgenomen suggesties worden visueel gemarkeerd (doorgestreept of grijs) in het paneel. Ze blijven zichtbaar als referentie.
- **D-06:** Sectorwerk-analyse wordt als apart blok in de system prompt geplaatst, na programmaboek-context en KiB-context. Past bij het bestaande prompt-assembly patroon uit Phase 3/4.
- **D-07:** Sectorwerk-context gaat alleen mee bij DIN-generatie endpoints (din-mapping, din-suggest). Niet bij cross-analyse of export.
- **D-08:** Bij het openen van een bestaande sessie: als `sectorAnalyses` een string bevat, probeer `JSON.parse` + Zod validatie. Als het JSON is dat valideert -> migreer stilletjes. Als het markdown of ongeldige data is -> verwijder en toon melding dat heranalyse nodig is. Consistent met Phase 1 D-08 (stille defaults bij laden).
- **D-09:** Sectorwerk-analyse wordt getoond als gestructureerde kaarten per categorie: samenvatting bovenaan, dan aansluiting bij doelen, baten-suggesties, vermogens-suggesties, en inspanningen per domein.
- **D-10:** Inspanningen in de analyse-weergave worden gegroepeerd per domein met de standaard DIN-kleuren (Mens=blauw `#2563eb`, Processen=groen `#059669`, Data & Systemen=paars `#7c3aed`, Cultuur=amber `#d97706`). Consistent met de rest van de app.

### Claude's Discretion
- Exacte layout en styling van het suggestiepaneel in DIN-mapping (positie, grootte, animatie)
- Hoe de sectorwerk-context wordt geformateerd in de system prompt (proza vs structured)
- Migratie-implementatie details (waar in de laadcyclus, foutafhandeling)
- Exacte kaart-layout voor de analyse-weergave in SectorWerkStep (grid, spacing, responsive)
- Of er een "alle suggesties overnemen" batch-knop komt naast individuele [+] knoppen

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | Sectorwerk-analyse resultaten stromen automatisch door als suggesties in de DIN-mapping stap | D-03/D-04/D-05: suggestiepaneel met one-click adoption in DINMappingStep. Schema change (D-01) ensures typed data flows through. |
| DATA-04 | Sectorwerk analyse wordt opgeslagen als getypeerd object (SectorplanAnalyseResult), niet als markdown string | D-01/D-02: schema change from `z.record(z.string(), z.string())` to `z.record(z.string(), AISectorplanAnalyseSchema)`. SectorWerkStep stores object directly. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | Already installed | Schema validation + type inference | Single source of truth for types (established in Phase 1) |
| React 19.1 | Already installed | Component state + UI rendering | Project stack |
| Next.js 16.1 | Already installed | API routes + app router | Project stack |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @anthropic-ai/sdk | Already installed | AI API calls | Used by callClaudeWithValidation |

No new libraries needed for this phase. All work uses existing project dependencies.

## Architecture Patterns

### Current Data Flow (BROKEN -- what we fix)
```
analyze-sectorplan API  -->  returns AISectorplanAnalyseResult object
       |
SectorWerkStep          -->  JSON.stringify(object) --> stores as string
       |
DINMappingStep          -->  reads string --> passes to API as string
       |
din-mapping API         -->  receives string --> JSON.parse + manual extraction --> injects as text
```

### Target Data Flow (Phase 5 result)
```
analyze-sectorplan API  -->  returns AISectorplanAnalyseResult object
       |
SectorWerkStep          -->  stores object directly in session.sectorAnalyses
       |
DINMappingStep          -->  reads typed object --> shows suggestiepaneel
       |                 -->  passes structured object to API
       |
din-mapping API         -->  receives typed object --> formats into system prompt block
din-suggest API         -->  receives typed object --> formats into system prompt block
```

### Pattern 1: Schema Migration with Backward Compatibility
**What:** Change `sectorAnalyses` schema from `z.record(z.string(), z.string())` to accept both old string data and new typed objects during transition.
**When to use:** Any time a DINSession field type changes.
**Implementation approach:**

The Zod schema for `sectorAnalyses` should use `z.record(z.string(), z.union([AISectorplanAnalyseSchema, z.string()]))` temporarily during the migration, or -- given D-08 -- handle migration at load time and keep the schema clean as `z.record(z.string(), AISectorplanAnalyseSchema)`.

Given D-08 specifies migration at load time (consistent with Phase 1), the cleaner approach is:
1. Change schema to `z.record(z.string(), AISectorplanAnalyseSchema)` (target type only)
2. Migration logic in session loading handles the backward compat
3. Use `z.preprocess` or a custom transform at the `sectorAnalyses` field level to attempt parse + validate strings

**Recommended:** Use `.transform()` at the schema level:
```typescript
sectorAnalyses: z.record(z.string(), z.union([
  AISectorplanAnalyseSchema,
  z.string().transform((str) => {
    try {
      const parsed = JSON.parse(str);
      return AISectorplanAnalyseSchema.parse(parsed);
    } catch {
      return null; // Will be filtered out
    }
  })
])).optional(),
```

Or simpler: handle migration in `loadSession` / `loadLocal` call, then keep schema as pure typed.

**Best fit with existing codebase:** The existing `loadLocal<DINSession>()` does not do schema validation at load time (it just deserializes JSON). The session-context `loadSession` callback (line 66-73 of session-context.tsx) loads raw data. Migration should happen here as a post-load cleanup step.

### Pattern 2: Suggestiepaneel as Collapsible Component
**What:** Inklapbaar panel at the top of DIN-mapping that displays baten-suggesties from sectorwerk analysis.
**When to use:** When the active sector has a sectorwerk analysis.

Key design decisions:
- Panel appears ONLY when `session.sectorAnalyses?.[activeSector]` exists and has `baten.punten.length > 0`
- Each suggestie has a [+] button for one-click adoption
- Adopted suggesties get visually marked (D-05)
- Track adopted suggesties in local component state (compare existing benefit titles/descriptions against suggestie text)

**How to detect "already adopted":**
- Maintain a `Set<string>` of adopted suggestie indices or texts
- On [+] click: create a `DINBenefit` via `createBenefit()`, add to session, add to goalBenefitMaps, add index to adopted set
- On render: check if suggestie text matches any existing benefit description/title in the current sector

### Pattern 3: AI Context Block Injection
**What:** Add sectorwerk analysis as a fourth context block in the system prompt.
**When to use:** For din-mapping and din-suggest endpoints only (D-07).

The existing `assembleSystemPrompt()` function signature:
```typescript
assembleSystemPrompt(
  instructionPrompt: string,
  useCase: ProgrammaboekUseCase,
  maxContextChars?: number,
  kibContext?: KiBContext | null
): string
```

Options for injecting sectorwerk context:
1. **Add parameter to assembleSystemPrompt:** `sectorwerkContext?: SectorplanAnalyseResult | null`
2. **Append after assembleSystemPrompt call:** Build the sectorwerk block separately and concatenate
3. **New function in prompt-assembly.ts:** `buildSectorwerkBlock(analysis: SectorplanAnalyseResult): string`

**Recommended:** Option 3 -- new exported function `buildSectorwerkBlock()` in `prompt-assembly.ts`. The API routes (`din-mapping/route.ts`, `din-suggest/route.ts`) call `assembleSystemPrompt()` then append the sectorwerk block. This keeps the function signature stable and follows the established pattern where API routes compose the final prompt.

### Pattern 4: SectorWerkStep Structured Display
**What:** Replace JSON.parse + string fallback in SectorWerkStep with direct object rendering.
**When to use:** When displaying sectorwerk analysis results.

The current SectorWerkStep already has structured rendering code (lines 550-715) that parses the stored string back to an object. After this phase, the analysis IS the object, so the JSON.parse block becomes unnecessary. The structured rendering code can read from the typed object directly.

### Anti-Patterns to Avoid
- **Double serialization:** Never JSON.stringify a validated Zod output for storage in a typed field. The entire point of Phase 5 is to eliminate this.
- **String comparison for adoption tracking:** Do not use exact string matching to detect adopted suggesties. Instead, store adopted indices in component state.
- **Modifying assembleSystemPrompt signature:** Adding more optional parameters creates a fragile API. Use composition instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema migration | Custom parse/validate loop | Zod `.transform()` or `.preprocess()` at field level | Zod handles edge cases, provides proper error reporting |
| Benefit creation | Manual object construction | Existing `createBenefit()` from din-service.ts | Ensures correct ID generation, default profiel values |
| Context formatting | Raw string concatenation | New `buildSectorwerkBlock()` function with consistent formatting | Prevents prompt injection, maintains separator pattern |

## Common Pitfalls

### Pitfall 1: Local State Desync with Session State
**What goes wrong:** The `planAnalysis` local state in SectorWerkStep is `Record<string, string | null>` and is initialized from `session?.sectorAnalyses`. After changing the schema, the local state type must also change.
**Why it happens:** SectorWerkStep maintains its own local state copy and syncs back via `updateSession`. The type mismatch will cause TypeScript errors.
**How to avoid:** Change local state type from `Record<string, string | null>` to `Record<string, SectorplanAnalyseResult | null>`. Update the `setPlanAnalysis` helper function accordingly.
**Warning signs:** TypeScript compilation errors about string vs object assignment.

### Pitfall 2: DIN-mapping API String Parsing Code
**What goes wrong:** The `din-mapping/route.ts` (lines 54-91) has extensive code to parse `sectorAnalysis` from a string, including regex JSON extraction. After the change, this code receives an object and the parsing is unnecessary.
**Why it happens:** The code was written to handle string input. Now it gets an object.
**How to avoid:** Check `typeof sectorAnalysis` -- if object, use directly. If string (backward compat), attempt parse. Better: just expect object and let the schema change handle backward compat at the session level.
**Warning signs:** The `sectorAnalysis.match(/\{[\s\S]*\}/)` regex call will crash on a non-string input.

### Pitfall 3: DINMappingStep Line 892 -- String Passthrough
**What goes wrong:** `sectorAnalysis: session!.sectorAnalyses?.[activeSector] || ""` passes the value to the API. After schema change, this sends an object where API expects a string. The `|| ""` fallback also won't work for object types.
**Why it happens:** The fallback was designed for strings.
**How to avoid:** Change to `sectorAnalysis: session!.sectorAnalyses?.[activeSector] || null`. Update din-mapping API to handle object input.
**Warning signs:** API receives `[object Object]` as sectorAnalysis.

### Pitfall 4: Migration Edge Case -- Invalid JSON Strings
**What goes wrong:** Some existing `sectorAnalyses` entries might contain plain markdown text (not JSON) from earlier app versions or error states.
**Why it happens:** The SectorWerkStep fallback (line 115-118) could store error messages as strings.
**How to avoid:** D-08 specifies: try JSON.parse + Zod validate. If it fails, remove entry and show toast about needing re-analysis. Log the removed entry for debugging.
**Warning signs:** Users see "Sectorwerk-analyse opnieuw uitvoeren" toast after loading old sessions.

### Pitfall 5: Suggestie Adoption Creates Orphan Benefits
**What goes wrong:** A benefit created from a suggestie is not connected to a goal via `goalBenefitMaps`.
**Why it happens:** The [+] click handler creates a benefit but forgets to add the mapping.
**How to avoid:** Always add both the benefit AND the goalBenefitMap entry. Use the same pattern as `addBenefitManual()` (DINMappingStep line 472-484).
**Warning signs:** DIN chain indicator shows disconnected benefits.

### Pitfall 6: SectorWerkStep Analysis Display -- Redundant Rendering Code
**What goes wrong:** After storing typed objects, the SectorWerkStep still has JSON.parse logic (lines 538-546) that is now unnecessary.
**Why it happens:** The structured display code was built around parsing strings.
**How to avoid:** Remove the JSON.parse block entirely. Read `currentAnalysis` as `SectorplanAnalyseResult | null` directly. Remove the markdown fallback rendering (lines 719-743) or keep as a very thin safety net.
**Warning signs:** Dead code in the component.

## Code Examples

### Example 1: Schema Change in schemas.ts
```typescript
// BEFORE (line 337):
sectorAnalyses: z.record(z.string(), z.string()).optional(),

// AFTER:
sectorAnalyses: z.record(z.string(), AISectorplanAnalyseSchema).optional(),
```

### Example 2: SectorWerkStep -- Stop Stringifying
```typescript
// BEFORE (lines 100-108):
const analysisStr = typeof data.data.analysis === "string"
  ? data.data.analysis
  : JSON.stringify(data.data.analysis);
setPlanAnalysis((prev) => ({
  ...prev,
  [activeSector]: analysisStr,
}));

// AFTER:
setPlanAnalysis((prev) => ({
  ...prev,
  [activeSector]: data.data.analysis,
}));
```

### Example 3: SectorWerkStep Local State Type
```typescript
// BEFORE:
const [planAnalysis, setPlanAnalysisState] = useState<Record<string, string | null>>(
  session?.sectorAnalyses || {}
);

// AFTER:
import type { SectorplanAnalyseResult } from "@/lib/types";
const [planAnalysis, setPlanAnalysisState] = useState<Record<string, SectorplanAnalyseResult | null>>(
  session?.sectorAnalyses || {}
);
```

### Example 4: Suggestiepaneel in DINMappingStep
```typescript
// Conceptual component within DINMappingStep
function SectorwerkSuggestiePanel({
  analysis,
  activeSector,
  selectedGoal,
  existingBenefits,
  onAdopt,
}: {
  analysis: SectorplanAnalyseResult;
  activeSector: SectorName;
  selectedGoal: string;
  existingBenefits: DINBenefit[];
  onAdopt: (suggestieText: string, index: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [adoptedIndices, setAdoptedIndices] = useState<Set<number>>(new Set());

  const suggesties = analysis.baten?.punten || [];
  if (suggesties.length === 0) return null;

  return (
    <div className="border border-blue-200 rounded-lg bg-blue-50/50">
      <button onClick={() => setCollapsed(!collapsed)} className="...">
        Suggesties uit sectorwerk-analyse ({suggesties.length})
      </button>
      {!collapsed && (
        <div className="p-3 space-y-2">
          {suggesties.map((s, i) => (
            <div key={i} className={adoptedIndices.has(i) ? "opacity-50 line-through" : ""}>
              <span>{s}</span>
              {!adoptedIndices.has(i) && (
                <button onClick={() => { onAdopt(s, i); setAdoptedIndices(prev => new Set(prev).add(i)); }}>
                  +
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Example 5: buildSectorwerkBlock in prompt-assembly.ts
```typescript
import type { SectorplanAnalyseResult } from "./schemas";

export function buildSectorwerkBlock(analysis: SectorplanAnalyseResult): string {
  const parts: string[] = [];

  if (analysis.samenvatting) {
    parts.push(`Samenvatting sectorplan-analyse: ${analysis.samenvatting}`);
  }
  if (analysis.baten?.punten?.length) {
    parts.push(`\nVoorgestelde baten:\n${analysis.baten.punten.map(p => `- ${p}`).join("\n")}`);
  }
  if (analysis.vermogens?.punten?.length) {
    parts.push(`\nBenodigde vermogens:\n${analysis.vermogens.punten.map(p => `- ${p}`).join("\n")}`);
  }
  if (analysis.inspanningen) {
    const domains = { mens: "Mens", processen: "Processen", data_systemen: "Data & Systemen", cultuur: "Cultuur" };
    const domainParts: string[] = [];
    for (const [key, label] of Object.entries(domains)) {
      const items = analysis.inspanningen[key as keyof typeof analysis.inspanningen];
      if (Array.isArray(items) && items.length) {
        domainParts.push(`  ${label}: ${items.join("; ")}`);
      }
    }
    if (domainParts.length) {
      parts.push(`\nVoorgestelde inspanningen:\n${domainParts.join("\n")}`);
    }
  }

  let block = parts.join("\n");
  if (block.length > 1500) {
    block = block.substring(0, 1500);
    const lastNewline = block.lastIndexOf("\n");
    if (lastNewline > 1000) block = block.substring(0, lastNewline);
  }

  return `\n---\nSECTORWERK-ANALYSE (eerder gegenereerd):\n\n${block}\n---`;
}
```

### Example 6: Migration Logic for Legacy Data
```typescript
// In session-context.tsx loadSession or a utility function
function migrateSectorAnalyses(
  raw: Record<string, unknown> | undefined
): Record<string, SectorplanAnalyseResult> | undefined {
  if (!raw) return undefined;
  const migrated: Record<string, SectorplanAnalyseResult> = {};
  let needsToast = false;

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "object" && value !== null) {
      // Already an object -- validate
      const result = AISectorplanAnalyseSchema.safeParse(value);
      if (result.success) {
        migrated[key] = result.data;
      } else {
        needsToast = true; // Invalid object, skip
      }
    } else if (typeof value === "string") {
      // Legacy string -- try parse
      try {
        const parsed = JSON.parse(value);
        const result = AISectorplanAnalyseSchema.safeParse(parsed);
        if (result.success) {
          migrated[key] = result.data;
        } else {
          needsToast = true;
        }
      } catch {
        needsToast = true; // Not JSON, discard
      }
    }
  }

  return { migrated, needsToast };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store AI analysis as stringified JSON | Store validated typed objects | Phase 5 (now) | Eliminates parse/stringify cycle, enables typed downstream consumption |
| Manual JSON.parse in consumers | Direct object property access | Phase 5 (now) | Removes ~40 lines of fragile parsing code in din-mapping/route.ts |
| No sectorwerk suggestions in DIN | Suggestiepaneel with one-click adoption | Phase 5 (now) | DATA-01 requirement fulfilled |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-04 | sectorAnalyses stores typed object, not string | unit | `npx vitest run src/lib/__tests__/sector-migration.test.ts -t "stores typed object"` | Wave 0 |
| DATA-04 | Legacy string data migrates to typed object | unit | `npx vitest run src/lib/__tests__/sector-migration.test.ts -t "migrates legacy"` | Wave 0 |
| DATA-04 | Invalid/markdown strings are discarded during migration | unit | `npx vitest run src/lib/__tests__/sector-migration.test.ts -t "discards invalid"` | Wave 0 |
| DATA-01 | buildSectorwerkBlock formats analysis for system prompt | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts -t "sectorwerk block"` | Wave 0 |
| DATA-01 | Suggestiepaneel renders baten from analysis | manual-only | Visual verification in browser | N/A |
| DATA-01 | Adopted suggestie creates benefit with goalBenefitMap | manual-only | Visual verification + session inspection | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run && npm run build`
- **Phase gate:** Full suite green + `npm run build` before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/sector-migration.test.ts` -- covers DATA-04 migration logic
- [ ] `src/lib/__tests__/prompt-assembly.test.ts` -- covers DATA-01 sectorwerk block formatting (may need to be created or extended if not existing)

## Integration Points (Detailed)

### Files That Must Change

| File | Change | Risk |
|------|--------|------|
| `src/lib/schemas.ts` line 337 | `z.record(z.string(), z.string())` -> `z.record(z.string(), AISectorplanAnalyseSchema)` | LOW -- single line, well-understood |
| `src/components/steps/SectorWerkStep.tsx` | Remove JSON.stringify, change local state type, simplify display logic | MEDIUM -- larger refactor, touches rendering |
| `src/components/steps/DINMappingStep.tsx` | Add suggestiepaneel, change sectorAnalysis passthrough from string to object | MEDIUM -- new UI component, integration |
| `src/app/api/din-mapping/route.ts` lines 54-92 | Replace string parsing with direct object consumption | LOW -- simplification |
| `src/app/api/din-suggest/route.ts` | Add sectorwerk context injection (currently does not use it) | LOW -- additive |
| `src/lib/prompt-assembly.ts` | Add `buildSectorwerkBlock()` function | LOW -- additive, no existing code changes |
| `src/lib/session-context.tsx` | Add migration logic for legacy sectorAnalyses data | MEDIUM -- touches session loading |

### Files That Must NOT Change
- `src/app/api/cross-analyse/route.ts` -- per D-07, no sectorwerk context injection
- `src/app/api/export/route.ts` -- per D-07, no sectorwerk context injection
- `src/app/api/analyze-sectorplan/route.ts` -- already returns typed object, no changes needed

## Open Questions

1. **Migration placement: session-context.tsx vs loadLocal wrapper**
   - What we know: D-08 specifies migration at load time. Phase 1 D-08 established stille defaults bij laden.
   - What's unclear: Should migration happen in `loadSession` callback in session-context.tsx (where toast is available) or in `loadLocal` (lower level, no toast access)?
   - Recommendation: Do it in `loadSession` in session-context.tsx, consistent with where toasts are accessible. Use the `addToastRef` pattern already established in Phase 2.

2. **Suggestie adoption tracking: local state vs session state**
   - What we know: D-05 requires visual marking of adopted suggesties.
   - What's unclear: Should adopted indices persist across page reloads (stored in session) or reset (local component state)?
   - Recommendation: Use local component state initialized by comparing existing benefits against suggestie text. This is more robust and does not require schema changes. On mount, check which suggesties already have matching benefits.

3. **Batch adoption button**
   - What we know: Claude's discretion area per CONTEXT.md.
   - Recommendation: Include a "Alle suggesties overnemen" batch button if >= 3 suggesties are available and none are yet adopted. Low implementation cost, high user value.

## Sources

### Primary (HIGH confidence)
- `src/lib/schemas.ts` -- Verified `sectorAnalyses` schema at line 337: `z.record(z.string(), z.string()).optional()`
- `src/lib/schemas.ts` -- Verified `AISectorplanAnalyseSchema` at lines 455-479: fully defined with all sections
- `src/components/steps/SectorWerkStep.tsx` -- Verified JSON.stringify at lines 100-108
- `src/components/steps/DINMappingStep.tsx` -- Verified string passthrough at line 892
- `src/app/api/din-mapping/route.ts` -- Verified string parsing logic at lines 54-91
- `src/app/api/analyze-sectorplan/route.ts` -- Verified it already returns typed object at line 58
- `src/lib/prompt-assembly.ts` -- Verified assembleSystemPrompt signature and pattern
- `src/lib/session-context.tsx` -- Verified loadSession and updateSession patterns

### Secondary (MEDIUM confidence)
- Phase 1/2 STATE.md decisions -- migration patterns and addToastRef pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing
- Architecture: HIGH -- codebase thoroughly inspected, all integration points verified
- Pitfalls: HIGH -- each pitfall verified against actual code with line numbers
- Migration: MEDIUM -- edge cases with old data depend on what users have stored

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable domain, no external dependency changes expected)
