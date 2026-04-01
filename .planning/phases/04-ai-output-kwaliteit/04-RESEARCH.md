# Phase 4: AI Output Kwaliteit - Research

**Researched:** 2026-04-01
**Domain:** AI prompt engineering, Zod validation, DIN methodology rule extraction, KiB context injection
**Confidence:** HIGH

## Summary

Phase 4 adds three capabilities to the existing AI pipeline: (1) KiB context injection into all AI prompts, (2) quantity limits on generated items, and (3) post-generation methodology validation with auto-correction. The codebase already has a solid foundation from Phases 1-3: `callClaudeWithValidation()` with retry, `assembleSystemPrompt()` with programmaboek context, Zod schemas for structural validation, and `parseAIResponse()` for JSON extraction.

The key technical insight is that the architecture naturally supports a post-validation layer. After `callClaudeWithValidation()` returns structurally valid data (Zod pass), a new `validateDINMethodiek()` function applies methodology rules and returns corrections. This keeps structural validation (Zod) separate from semantic validation (methodology rules). KiB context injection fits cleanly into `assembleSystemPrompt()` as an additional context block. Quantity limits go into the existing Zod schemas as `.max()` constraints.

**Primary recommendation:** Build a pure `src/lib/din-validation.ts` module with per-type validators, integrate into the existing `callClaudeWithValidation` pipeline, and extend `assembleSystemPrompt` with a KiB context block. All three concerns (context, limits, validation) are additive and do not require restructuring existing code.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Dual validatie: prompts sturen de AI aan om methodiek-conforme output te genereren, EN aparte validatiefuncties in code controleren elk item achteraf op methodiekregels (vergrotende trap voor baten, werkwoorden voor vermogens, domeintoewijzing voor inspanningen).
- **D-02:** Validatie geldt voor ALLE items -- zowel AI-gegenereerde als handmatig ingevoerde baten, vermogens en inspanningen. Consistentie over de hele sessie.
- **D-03:** Bij validatiefalen: stille correctie waar mogelijk (bijv. werkwoord verwijderen uit baat-titel). De gebruiker ziet het gecorrigeerde resultaat en kan bijsturen via extra prompt of handmatige aanpassing. Geen harde blokkade.
- **D-04:** KiB-data (top-doelen + scope) wordt als apart blok in de system prompt geplaatst, na de programmaboek-context. Past bij het bestaande prompt-assembly patroon uit Phase 3.
- **D-05:** Alleen top-doelen (alle, met beschrijving en ranking) en scope (in/buiten) worden meegegeven. Geen visietekst -- doelen en scope geven voldoende richting.
- **D-06:** KiB-context gaat mee bij ALLE AI-aanroepen: din-mapping, suggest, create, cross-analyse. Consistent en voorkomt dat AI buiten scope genereert (AI-03 requirement).
- **D-07:** Baten-limiet (2-4 per doel per sector) wordt afgedwongen via prompt-instructie EN Zod schema `.max(4)`. Dubbele zekerheid.
- **D-08:** Vergelijkbare limieten gelden voor vermogens en inspanningen bij AI-generatie (bijv. max 3-5 vermogens per baat, max 2-4 inspanningen per vermogen). Exacte aantallen door Claude te bepalen op basis van methodiek.
- **D-09:** Limieten gelden alleen voor AI-generatie. De gebruiker kan handmatig extra items toevoegen boven de limiet als dat wenselijk is.
- **D-10:** Gecorrigeerde items tonen een inline correctie-badge op de kaart (bijv. "Gecorrigeerd: titel aangepast") die na bekijken verdwijnt. Subtiel maar informatief.
- **D-11:** Geen apart validatie-overzicht per generatieronde -- feedback per item is voldoende.
- **D-12:** Bijsturen van gecorrigeerde items gaat via de bestaande "Aanscherpen met AI" functie op de kaart. Geen nieuwe UI nodig voor bijsturing.

### Claude's Discretion
- Exacte methodiekregels per DIN-type extraheren uit prompts.ts en programmaboek-context naar validatiefuncties
- Correctielogica per regeltype (welke correcties automatisch, welke alleen markeren)
- Exacte limieten voor vermogens en inspanningen op basis van methodiek
- Structuur van het validatieresultaat-object (warnings, corrections, passed)
- Badge-styling en verdwijntiming voor correctie-indicatie

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-02 | AI genereert maximaal 2-4 baten per doel per sector, met methodiek-conforme titels (vergrotende trap) | Zod `.max(4)` on `AIDINMappingResponseSchema.benefits`, prompt reinforcement, post-validation `validateBaatTitle()` for vergrotende trap |
| AI-03 | KiB visie en scope worden meegegeven aan alle AI-generatie stappen (DIN-mapping, cross-analyse, sectorintegratie) | `assembleSystemPrompt()` extended with KiB context block after programmaboek context; session goals+scope extracted on API route level |
| AI-04 | AI-output wordt gevalideerd tegen DIN-methodiek regels voordat het wordt opgeslagen (baten = effecten, vermogens = werkwoorden, inspanningen = concrete activiteiten) | New `din-validation.ts` module with per-type validators; integrated into both AI pipeline and manual item creation |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 4.3.6 | Schema validation with `.max()` limits | Already in use; `.max()` verified working on z.array() |
| @anthropic-ai/sdk | 0.78.0 | Claude API calls | Already in use for all AI features |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.2 | Unit tests for validation functions | Testing din-validation.ts pure functions |

No new dependencies needed. All functionality builds on the existing stack.

**Version verification:** Both zod 4.3.6 and vitest 4.1.2 are already installed and verified in the project.

## Architecture Patterns

### Recommended File Structure
```
src/lib/
  din-validation.ts        # NEW: Pure validation functions per DIN type
  din-validation.test.ts   # NEW: Test coverage for all validation rules
  prompt-assembly.ts       # EXTEND: Add KiB context block
  schemas.ts               # EXTEND: Add .max() limits to AI response schemas
  ai-client.ts             # EXTEND: Post-validation step after Zod pass

src/components/din/
  BenefitCard.tsx           # EXTEND: Inline correctie-badge
  CapabilityCard.tsx        # EXTEND: Inline correctie-badge
  EffortCard.tsx            # EXTEND: Inline correctie-badge

src/app/api/
  din-mapping/route.ts     # EXTEND: Pass KiB context, apply post-validation
  din-suggest/route.ts     # EXTEND: Pass KiB context, apply post-validation
  cross-analyse/route.ts   # EXTEND: Pass KiB context
```

### Pattern 1: Validation Result Object
**What:** A typed return value from validation functions describing what passed, what was corrected, and what warnings remain.
**When to use:** Every time a DIN item is validated (after AI generation or manual edit).
**Example:**
```typescript
// din-validation.ts
export interface ValidationCorrection {
  field: string;           // Which field was corrected ("title", "description", etc.)
  original: string;        // Original value
  corrected: string;       // Corrected value
  rule: string;            // Which rule triggered ("vergrotende-trap", "werkwoord-check", etc.)
  message: string;         // Human-readable Dutch explanation
}

export interface ValidationResult<T> {
  item: T;                 // The (possibly corrected) item
  passed: boolean;         // All rules passed without correction
  corrections: ValidationCorrection[];  // Applied auto-corrections
  warnings: string[];      // Issues that couldn't be auto-corrected
}
```

### Pattern 2: Per-Type Validator Functions
**What:** Separate pure functions for each DIN type (baat, vermogen, inspanning) that check methodology rules.
**When to use:** After Zod structural validation succeeds.
**Example:**
```typescript
// din-validation.ts
export function validateBaat(baat: AIBenefit): ValidationResult<AIBenefit> {
  const corrections: ValidationCorrection[] = [];
  const warnings: string[] = [];
  let correctedBaat = { ...baat };

  // Rule 1: Title must use vergrotende trap (-er / meer / hogere / lagere etc.)
  const trapResult = checkVergrotendeTrap(correctedBaat.title);
  if (!trapResult.valid && trapResult.suggestion) {
    corrections.push({
      field: "title",
      original: correctedBaat.title,
      corrected: trapResult.suggestion,
      rule: "vergrotende-trap",
      message: `Titel aangepast naar vergrotende trap`,
    });
    correctedBaat = { ...correctedBaat, title: trapResult.suggestion };
  }

  // Rule 2: Title must NOT contain verbs
  const verbResult = checkNoVerbs(correctedBaat.title);
  if (!verbResult.valid) {
    warnings.push(`Titel bevat werkwoord "${verbResult.verb}" -- baten beschrijven effecten, geen activiteiten`);
  }

  return {
    item: correctedBaat,
    passed: corrections.length === 0 && warnings.length === 0,
    corrections,
    warnings,
  };
}
```

### Pattern 3: KiB Context Block in Prompt Assembly
**What:** A new section in `assembleSystemPrompt()` that appends KiB goals and scope after programmaboek context.
**When to use:** Every AI call that uses `assembleSystemPrompt()`.
**Example:**
```typescript
// prompt-assembly.ts
export interface KiBContext {
  goals: { name: string; description: string; rank: number }[];
  scope: { inScope: string[]; outScope: string[] } | null;
}

export function assembleSystemPrompt(
  instructionPrompt: string,
  useCase: ProgrammaboekUseCase,
  kibContext?: KiBContext,     // NEW parameter
  maxContextChars?: number
): string {
  let context = getContextForUseCase(useCase);
  if (maxContextChars && context.length > maxContextChars) {
    context = truncateAtSentenceBoundary(context, maxContextChars);
  }

  let kibBlock = "";
  if (kibContext && kibContext.goals.length > 0) {
    kibBlock = `\n\n---\nKIB PROGRAMMADOELEN EN SCOPE:\n\n`;
    kibBlock += `Doelen (gerangschikt op prioriteit):\n`;
    kibContext.goals
      .sort((a, b) => a.rank - b.rank)
      .forEach((g, i) => {
        kibBlock += `${i + 1}. ${g.name}: ${g.description}\n`;
      });
    if (kibContext.scope) {
      kibBlock += `\nBinnen scope:\n${kibContext.scope.inScope.map(s => `- ${s}`).join("\n")}`;
      kibBlock += `\n\nBuiten scope:\n${kibContext.scope.outScope.map(s => `- ${s}`).join("\n")}`;
    }
    kibBlock += `\n\nGenereer ALLEEN items die passen binnen bovenstaande doelen en scope. Verwijs waar mogelijk naar specifieke doelen.\n---`;
  }

  return `${instructionPrompt}

---
ACHTERGRONDKENNIS UIT HET PROGRAMMABOEK ...
${context}
---${kibBlock}

Gebruik bovenstaande methodiek-kennis als referentie ...`;
}
```

### Pattern 4: Post-Validation in AI Pipeline
**What:** After `callClaudeWithValidation()` returns validated data, run methodology validation and return both the corrected data and correction metadata.
**When to use:** In every API route that generates or suggests DIN items.
**Example:**
```typescript
// In din-mapping/route.ts, after callClaudeWithValidation succeeds:
const validated = result.data;
const benefitResults = validated.benefits.map(b => validateBaat(b));
const capabilityResults = validated.capabilities.map(c => validateVermogen(c));
const effortResults = validated.efforts.map(e => validateInspanning(e));

return NextResponse.json({
  success: true,
  data: {
    benefits: benefitResults.map(r => r.item),
    capabilities: capabilityResults.map(r => r.item),
    efforts: effortResults.map(r => r.item),
  },
  corrections: [
    ...benefitResults.flatMap(r => r.corrections),
    ...capabilityResults.flatMap(r => r.corrections),
    ...effortResults.flatMap(r => r.corrections),
  ],
});
```

### Anti-Patterns to Avoid
- **Blocking validation:** D-03 says no hard blocks -- always allow the item through, with corrections or warnings. Never reject a user's manual input.
- **Mixing structural and semantic validation:** Keep Zod (structure) separate from methodology (semantic). Zod checks "is this valid JSON with the right fields?" while din-validation checks "does this follow DIN methodology rules?"
- **Validating in the client:** Validation logic should live in `src/lib/din-validation.ts` as pure functions, importable by both API routes (server-side) and components (client-side per D-02 for manual items).
- **Over-engineering NLP:** Dutch verb detection does not need a full NLP library. A curated list of common verb patterns and suffixes suffices for the DIN domain. Keep it simple and extensible.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema validation | Custom JSON validators | Zod `.max()`, `.min()`, `.refine()` | Already proven in Phase 1; adding `.max(4)` is one line |
| Prompt assembly patterns | New prompt builder | Extend existing `assembleSystemPrompt()` | Already handles programmaboek context; KiB is another block |
| AI retry logic | New retry mechanism | Existing `callClaudeWithValidation()` | 2-retry loop already works; just add post-validation step |
| Toast/feedback UI | New notification system | Existing `useToast()` from Phase 2 | Already available for correction badges |

**Key insight:** This phase is primarily about EXTENDING existing infrastructure, not building new systems. The architecture from Phases 1-3 was designed with exactly these extension points.

## Methodology Rules (Extracted from prompts.ts)

These rules MUST be implemented as validation functions. Extracted from the existing prompt instructions and the programmaboek.

### Baat (Benefit) Rules
1. **Vergrotende trap (comparative form):** Title must contain a noun + adjective in comparative form (-er). Examples: "Hogere klanttevredenheid", "Snellere doorlooptijd", "Meer data-gedreven besluitvorming".
2. **Geen werkwoorden:** Title must NOT contain verbs. A baat describes an effect, not an activity.
3. **Kort:** Title max 5 words.
4. **Indirect effect:** A baat is a leverage point, not the goal itself made measurable.

**Auto-correctable:** Rule 1 (prepend "Hogere/Meer/Betere" if missing comparative), Rule 3 (truncate).
**Warning only:** Rule 2 (verb detection is imperfect, flag for user review), Rule 4 (semantic, cannot auto-correct).

### Vermogen (Capability) Rules
1. **Geen actie-werkwoorden:** Title must NOT contain action verbs like "implementeren", "uitvoeren", "opzetten", "inrichten". Those are inspanningen.
2. **Beschrijft KUNNEN:** Title describes what the organization must be ABLE TO DO, not what it must DO.
3. **Kort:** Title max 5 words.

**Auto-correctable:** Rule 3 (truncate).
**Warning only:** Rule 1 (verb detection), Rule 2 (semantic).

### Inspanning (Effort) Rules
1. **Werkwoorden verplicht:** Title MUST contain verbs. "Werk = werkwoord."
2. **Domeintoewijzing:** Must be assigned to exactly one of the four domains (mens, processen, data_systemen, cultuur).
3. **Kort:** Title max 8 words, action-oriented.
4. **Domein-specifiek:** The effort description and result must be specific to the assigned domain.

**Auto-correctable:** Rule 2 (Zod enum already enforces this).
**Warning only:** Rule 1 (missing verb), Rule 3 (length), Rule 4 (semantic).

### Dutch Verb Detection Strategy
For the DIN domain, a pragmatic approach works:
- **Common action verbs blacklist for baten:** implementeren, uitvoeren, opzetten, inrichten, trainen, bouwen, ontwikkelen, realiseren, verbeteren, optimaliseren, lanceren
- **Common action verbs whitelist for inspanningen:** same list, but their PRESENCE is required
- **Vergrotende trap patterns:** words ending in -er (hogere, snellere, lagere, betere), words starting with "meer" or "minder", words like "grotere", "bredere", "sterkere"
- This is NOT full NLP -- it's a curated domain-specific word list. Covers 90%+ of DIN use cases.

## Quantity Limits (Based on Methodology)

Per the DIN methodology (programmaboek) and existing prompt instructions:

| Type | Per... | Min | Max | Rationale |
|------|--------|-----|-----|-----------|
| Baten | doel per sector | 2 | 4 | D-07, existing prompt instruction, methodology focus |
| Vermogens | baat | 1 | 3 | "1-2 per baat" in prompts, allow slight flex |
| Inspanningen | vermogen | 1 | 3 | "1-2 per vermogen" in prompts, allow slight flex |

For the DIN-mapping endpoint that generates all at once:
- `benefits`: `.max(4)` (per D-07)
- `capabilities`: `.max(8)` (practical: 4 baten x 2 vermogens each)
- `efforts`: `.max(12)` (practical: 8 vermogens x 1.5 inspanningen each)

These limits apply ONLY to AI-generated arrays (D-09). The storage schemas remain unlimited.

## Common Pitfalls

### Pitfall 1: Breaking Backward Compatibility on Schema Changes
**What goes wrong:** Adding `.max(4)` to `AIDINMappingResponseSchema.benefits` could cause existing sessions with >4 benefits per goal to fail validation when loaded.
**Why it happens:** Storage schemas and AI response schemas share field names, making it easy to accidentally constrain both.
**How to avoid:** ONLY modify the AI response schemas (prefixed with `AI`), NEVER the storage schemas (`DINBenefitSchema`, `DINSessionSchema`). The separation established in Phase 1 (Pitfall 6) exists precisely for this reason.
**Warning signs:** TypeScript errors in components that load session data.

### Pitfall 2: KiB Context Bloating System Prompts
**What goes wrong:** If all goals have long descriptions and scope has many items, the system prompt becomes very large, eating into the output token budget.
**Why it happens:** No truncation on KiB context.
**How to avoid:** Cap KiB context block at ~1000 chars. Goals: name + first 80 chars of description. Scope: max 10 items per list.
**Warning signs:** AI responses being cut off or incomplete.

### Pitfall 3: Auto-Correction Causing Infinite Loops
**What goes wrong:** User sees a corrected item, clicks "Aanscherpen met AI", AI generates new text, validation corrects it again, user confused.
**Why it happens:** Validation runs on every item change, including AI suggestions.
**How to avoid:** Corrections should only trigger the badge on FIRST validation. Once user acknowledges or edits, the badge clears. The "Aanscherpen met AI" flow already produces methodology-aware output (the prompts enforce it), so re-corrections should be rare.
**Warning signs:** Badge keeps appearing after using "Aanscherpen met AI".

### Pitfall 4: Vergrotende Trap Detection False Positives
**What goes wrong:** Words like "sneller" are flagged as verbs, or "implementer" is incorrectly matched as comparative.
**Why it happens:** Dutch morphology is complex; naive suffix matching has edge cases.
**How to avoid:** Use a curated allowlist of known comparative forms for the DIN domain rather than trying to parse all Dutch. Start small, expand based on real usage.
**Warning signs:** Correct titles being "corrected" to wrong formulations.

### Pitfall 5: Forgetting to Pass KiB Context in All Routes
**What goes wrong:** One API route doesn't get KiB context, AI generates off-scope items.
**Why it happens:** Multiple routes to update (din-mapping, din-suggest in 3 modes, cross-analyse).
**How to avoid:** Make KiB context a required parameter in `assembleSystemPrompt()` (with `KiBContext | null` type). TypeScript will force every call site to explicitly handle it.
**Warning signs:** API routes not passing `kibContext` parameter.

## Code Examples

### Adding .max() to AI Response Schemas
```typescript
// schemas.ts -- ONLY modify AI schemas, not storage schemas
export const AIDINMappingResponseSchema = z.object({
  benefits: z.array(AIBenefitSchema).max(4),     // D-07: max 4 baten per generatie
  capabilities: z.array(AICapabilitySchema).max(8),
  efforts: z.array(AIEffortSchema).max(12),
});
```

### KiB Context Extraction Helper
```typescript
// prompt-assembly.ts
export function extractKiBContext(session: {
  goals?: { name: string; description: string; rank: number }[];
  scope?: { inScope: string[]; outScope: string[] } | null;
}): KiBContext {
  return {
    goals: (session.goals || []).map(g => ({
      name: g.name,
      description: g.description.slice(0, 80),
      rank: g.rank,
    })),
    scope: session.scope || null,
  };
}
```

### Vergrotende Trap Check
```typescript
// din-validation.ts
const VERGROTENDE_TRAP_PATTERNS = [
  /\b(hogere?|lagere?|snellere?|betere?|grotere?|bredere?|sterkere?|diepere?|rijkere?)\b/i,
  /\b(meer|minder)\b/i,
  /\b\w+ere?\b/i,  // Generic -er/-ere ending (with caution)
];

const VERGROTENDE_PREFIXES = ["Hogere", "Meer", "Betere", "Grotere", "Sterkere", "Snellere", "Lagere", "Bredere"];

function checkVergrotendeTrap(title: string): { valid: boolean; suggestion?: string } {
  const hasComparative = VERGROTENDE_TRAP_PATTERNS.some(p => p.test(title));
  if (hasComparative) return { valid: true };

  // Auto-correct: prepend "Betere" as safe default
  return {
    valid: false,
    suggestion: `Betere ${title.charAt(0).toLowerCase()}${title.slice(1)}`,
  };
}
```

### Correction Badge Component Pattern
```typescript
// Inline badge in BenefitCard, CapabilityCard, EffortCard
{corrections.length > 0 && !dismissed && (
  <div
    className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700 cursor-pointer"
    onClick={() => setDismissed(true)}
    title="Klik om te verbergen"
  >
    <span className="font-medium">Gecorrigeerd:</span>
    <span>{corrections[0].message}</span>
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prompts only for quality | Prompts + code validation (dual) | Phase 4 | Catches AI mistakes + validates manual input |
| No KiB context in prompts | Goals + scope injected in all AI calls | Phase 4 | AI stays within programme scope |
| Unlimited AI output | .max() on Zod schemas | Phase 4 | Prevents DIN network bloat |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/__tests__/din-validation.test.ts` |
| Full suite command | `npm run test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-02 | Baten array .max(4) on Zod schema | unit | `npx vitest run src/lib/__tests__/schemas.test.ts` | Exists (extend) |
| AI-02 | Vergrotende trap validation | unit | `npx vitest run src/lib/__tests__/din-validation.test.ts` | Wave 0 |
| AI-03 | KiB context block in assembleSystemPrompt | unit | `npx vitest run src/lib/__tests__/prompt-assembly.test.ts` | Wave 0 |
| AI-04 | Baat validation rules | unit | `npx vitest run src/lib/__tests__/din-validation.test.ts` | Wave 0 |
| AI-04 | Vermogen validation rules | unit | `npx vitest run src/lib/__tests__/din-validation.test.ts` | Wave 0 |
| AI-04 | Inspanning validation rules | unit | `npx vitest run src/lib/__tests__/din-validation.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/din-validation.test.ts`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green + `npm run build` before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/din-validation.test.ts` -- covers AI-02 (vergrotende trap), AI-04 (all type rules)
- [ ] `src/lib/__tests__/prompt-assembly.test.ts` -- covers AI-03 (KiB context injection)

## Open Questions

1. **Vergrotende trap edge cases**
   - What we know: Common patterns like "hogere", "meer", "snellere" are well-defined
   - What's unclear: How to handle compound words like "Data-gedreven" or domain-specific terms
   - Recommendation: Start with a curated list (20-30 words), expand based on real usage. Keep the validator extensible.

2. **Correction badge dismissal persistence**
   - What we know: Badge should disappear after user acknowledges (D-10)
   - What's unclear: Should dismissal persist across page refreshes? Currently DINBenefit type has no `correctionDismissed` field.
   - Recommendation: Use component-local state. If the item is re-validated (e.g., after edit) and passes, no badge needed. Corrections metadata stored in a transient Map, not in session storage.

3. **Manual item validation timing (D-02)**
   - What we know: Both AI and manual items need validation
   - What's unclear: When to validate manual input -- on every keystroke? on blur? on save?
   - Recommendation: Validate on save/apply. Not on keystroke (annoying), not on blur (too frequent). When user clicks save or navigates away, run validation and show badge if corrections applied.

## Project Constraints (from CLAUDE.md)

The following CLAUDE.md directives are relevant to this phase:

- **Tech stack:** Next.js 16, TypeScript, Tailwind CSS 4 -- no new frameworks
- **Taal:** All UI and AI output in Dutch (nl-NL) -- validation messages must be in Dutch
- **Branding:** Cito blauw (#003366) as primary color -- badge styling should use amber/warning tones, not conflict with primary
- **Build must pass:** `npm run build` must succeed after every change
- **Skills gebruiken:** Use available skills for implementation
- **UX design voor alle output:** Correction badges must be visually clean, not disruptive
- **Dual Persistence:** localStorage-first -- correction state is transient (component state), NOT persisted
- **Methodiek volgen:** DIN methodology from `docs/programmaboek.doc` is authoritative

## Sources

### Primary (HIGH confidence)
- `src/lib/prompts.ts` (612 lines) -- Extracted methodology rules (vergrotende trap, werkwoorden, domeinen) directly from prompts
- `src/lib/schemas.ts` -- Verified Zod 4.3.6 `.max()` works on arrays (tested in shell)
- `src/lib/prompt-assembly.ts` -- Verified extension point for KiB context block
- `src/lib/ai-client.ts` -- Verified `callClaudeWithValidation()` pipeline supports post-validation
- `src/lib/programmaboek-context.ts` -- Methodology definitions from the programmaboek
- `docs/programmaboek.doc` via programmaboek-context.ts -- Batenprofiel, vergrotende trap, vermogensdefinitie

### Secondary (MEDIUM confidence)
- `src/components/din/BenefitCard.tsx`, `CapabilityCard.tsx`, `EffortCard.tsx` -- Verified component structure for badge placement
- `src/app/api/din-mapping/route.ts`, `din-suggest/route.ts`, `cross-analyse/route.ts` -- All routes use assembleSystemPrompt, confirmed extension path

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new dependencies, all verified in project
- Architecture: HIGH -- Extension points already exist, patterns match Phase 1-3 decisions
- Pitfalls: HIGH -- Based on direct code analysis and Phase 1-3 patterns
- Validation rules: MEDIUM -- Methodology rules clearly defined in prompts, but Dutch NLP edge cases exist
- UI (badge): MEDIUM -- Component structure supports it, but exact UX needs iteration

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable domain, no external API changes expected)
