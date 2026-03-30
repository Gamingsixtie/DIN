# Phase 1: Zod Schema Validatie - Research

**Researched:** 2026-03-30
**Domain:** Runtime schema validation, AI response parsing, TypeScript type inference
**Confidence:** HIGH

## Summary

This phase replaces fragile regex-based JSON extraction (`result.match(/\{[\s\S]*\}/)` + `JSON.parse`) across 7 API endpoints and 3 client-side components with Zod schema validation. The codebase currently has **26+ instances** of unvalidated JSON parsing spread across API routes (`din-mapping`, `din-suggest`, `cross-analyse`, `analyze-sectorplan`, `export`, `import-kib`, `parse-sector`), client components (`DINMappingStep`, `CrossAnalyseStep`, `SectorWerkStep`), and the `ai-client.ts` helper layer.

Zod 4.3.6 is the current stable version. It is a major version upgrade from the widely-documented Zod 3.x, with breaking changes in `.default()` behavior, error customization API (unified `error` parameter), and internal schema representation. The project currently has **no Zod dependency** -- it must be installed fresh.

**Primary recommendation:** Install `zod@^4.3.6`, create `src/lib/schemas.ts` as single source of truth, derive all TypeScript types via `z.infer<>`, and add a `parseAIResponse<T>(raw: string, schema: ZodSchema<T>)` utility in `ai-client.ts` that handles JSON extraction + Zod validation + retry logic centrally.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Bij een ongeldige AI response worden automatisch 2 stille retries uitgevoerd. De gebruiker merkt alleen vertraging.
- **D-02:** Na 2 mislukte retries krijgt de gebruiker een foutmelding met context over wat er mis ging (bijv. "AI gaf geen geldige baten terug").
- **D-03:** In de foutmelding verschijnt een tekstveld waarmee de gebruiker extra instructies kan meegeven aan de AI-prompt voor een nieuwe poging.
- **D-04:** Er wordt nooit data opgeslagen die niet door het Zod schema komt -- geen stille corruptie.
- **D-05:** Alle 7 AI endpoints krijgen tegelijk Zod validatie: din-mapping, din-suggest, cross-analyse, analyze-sectorplan, export, import-kib, parse-sector.
- **D-06:** Niet-AI parsing (KiB JSON import, sectorplan upload) wordt ook via Zod gevalideerd. Alle externe input is consistent gevalideerd.
- **D-07:** Bestaande sessies in localStorage worden niet gemigreerd. Data wordt gevalideerd bij gebruik (openen/bewerken).
- **D-08:** Ongeldige of ontbrekende velden in bestaande data krijgen stille defaults via Zod `.default()` -- geen meldingen aan de gebruiker.
- **D-09:** Zod schemas worden de single source of truth. TypeScript types worden afgeleid via `z.infer<>`. De bestaande `types.ts` wordt herschreven zodat types uit schemas komen.
- **D-10:** Alle schemas leven centraal in `src/lib/schemas.ts` -- een bestand, herbruikbaar door alle endpoints en componenten.

### Claude's Discretion
- Nesting en structuur van schemas binnen `schemas.ts` (hoe granulair, welke sub-schemas)
- Keuze van Zod features (`.transform()`, `.refine()`, `.catch()`) per situatie
- Exacte foutmeldingen per endpoint (binnen het kader: "met context, niet technisch")

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-02 | AI responses worden gevalideerd met Zod schema's -- geen gebroken JSON of ongestructureerde output | Zod 4 `safeParse()` + centralized `parseAIResponse()` utility replaces all 26+ regex/JSON.parse instances. Schema definitions in `schemas.ts` enforce structure. Retry logic (D-01/D-02) handles invalid AI output gracefully. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 4.3.6 | Runtime schema validation + TypeScript type inference | De facto standard for TS validation. 14x faster string parsing vs v3. Single library provides both runtime validation and static types via `z.infer<>`. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.2 | Test runner for schema validation tests | Already available globally (verified on system). Needed for Wave 0 test infrastructure. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod 4 | Zod 3.x | Zod 3 has more docs/examples but is 14x slower, 2.3x larger bundle, and entering maintenance mode |
| Zod | Anthropic SDK structured output | SDK supports JSON mode but does not validate against app-specific schemas or provide TypeScript type inference |
| Zod | valibot | Smaller bundle but less ecosystem adoption, no `.catch()` equivalent for legacy data defaults |

**Installation:**
```bash
npm install zod@^4.3.6
npm install -D vitest@^4.1.2
```

**Version verification:** `zod@4.3.6` confirmed as latest stable on npm registry (2026-03-30). `vitest@4.1.2` confirmed as latest stable.

## Architecture Patterns

### Recommended Project Structure
```
src/lib/
  schemas.ts          # ALL Zod schemas (single source of truth) — D-10
  types.ts            # Re-exports z.infer<> types from schemas — D-09
  ai-client.ts        # parseAIResponse() + retry logic — D-01/D-02
  kib-import.ts       # Uses schemas for KiB validation — D-06
  persistence.ts      # loadLocal with optional schema validation — D-07/D-08
src/app/api/
  din-mapping/        # Uses parseAIResponse() instead of regex
  din-suggest/        # Uses parseAIResponse() instead of regex
  cross-analyse/      # Uses parseAIResponse() instead of regex
  analyze-sectorplan/ # Uses parseAIResponse() instead of regex
  export/             # Uses schema for request validation
  import-kib/         # Uses KiB schema for import validation — D-06
  parse-sector/       # Uses schema for upload validation — D-06
```

### Pattern 1: Centralized Schema Definition (D-09, D-10)
**What:** All Zod schemas in one file, TypeScript types derived via `z.infer<>`
**When to use:** Every domain type in the application
**Example:**
```typescript
// src/lib/schemas.ts
import { z } from "zod";

// Sub-schemas (granular, composable)
export const BatenProfielSchema = z.object({
  bateneigenaar: z.string().optional().default(""),
  indicator: z.string(),
  indicatorOwner: z.string(),
  currentValue: z.string(),
  targetValue: z.string(),
  meetmethode: z.string().optional().default(""),
  measurementMoment: z.string().optional().default(""),
});

export const DINBenefitSchema = z.object({
  id: z.string(),
  goalId: z.string(),
  sectorId: z.string(),
  title: z.string().optional().default(""),
  description: z.string(),
  profiel: BatenProfielSchema,
});

// Type derivation
export type DINBenefit = z.infer<typeof DINBenefitSchema>;
```

```typescript
// src/lib/types.ts (updated — re-exports from schemas)
export type { DINBenefit, DINCapability, DINEffort } from "./schemas";
// Keep non-schema constants here (SECTORS, DOMAIN_LABELS, etc.)
```

### Pattern 2: AI Response Parsing with Retry (D-01, D-02, D-04)
**What:** Centralized function that extracts JSON from AI response, validates with Zod, retries on failure
**When to use:** Every AI API call
**Example:**
```typescript
// src/lib/ai-client.ts
import { z } from "zod";

interface ParseResult<T> {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  retryable: boolean;
}

function extractJSON(raw: string): string | null {
  // Strip markdown code fences
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  // Try direct parse first
  try { JSON.parse(cleaned); return cleaned; } catch {}
  // Fallback: extract first JSON object
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function parseAIResponse<T>(raw: string, schema: z.ZodType<T>): ParseResult<T> {
  const jsonStr = extractJSON(raw);
  if (!jsonStr) {
    return { success: false, error: "Geen geldig JSON in AI-antwoord", retryable: true };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { success: false, error: "Ongeldig JSON formaat", retryable: true };
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      error: `Onverwachte AI-structuur: ${result.error.issues.map(i => i.message).join(", ")}`,
      retryable: true,
    };
  }
  return { success: true, data: result.data };
}
```

### Pattern 3: AI Response Schemas (separate from storage schemas)
**What:** Schemas specifically for AI responses, which may differ from storage schemas (e.g., AI returns arrays without IDs)
**When to use:** AI endpoints that generate new items
**Example:**
```typescript
// src/lib/schemas.ts — AI response schemas

// AI returns benefits WITHOUT id/goalId/sectorId (those are added after)
export const AIBenefitResponseSchema = z.object({
  title: z.string(),
  description: z.string(),
  profiel: z.object({
    bateneigenaar: z.string().optional().default(""),
    indicator: z.string(),
    indicatorOwner: z.string().optional().default(""),
    currentValue: z.string().optional().default(""),
    targetValue: z.string().optional().default(""),
  }),
});

export const AIDINMappingResponseSchema = z.object({
  benefits: z.array(AIBenefitResponseSchema),
  capabilities: z.array(AICapabilityResponseSchema),
  efforts: z.array(AIEffortResponseSchema),
});
```

### Pattern 4: Legacy Data Validation with Defaults (D-07, D-08)
**What:** When loading existing localStorage data, use `.catch()` for graceful degradation
**When to use:** `loadLocal()` calls for session data
**Example:**
```typescript
// Schema with .default() for missing fields in legacy data
export const DINBenefitLegacySchema = z.object({
  id: z.string(),
  goalId: z.string(),
  sectorId: z.string(),
  title: z.string().optional().default(""),
  description: z.string().catch(""),
  profiel: BatenProfielSchema.catch({
    bateneigenaar: "",
    indicator: "",
    indicatorOwner: "",
    currentValue: "",
    targetValue: "",
    meetmethode: "",
    measurementMoment: "",
  }),
});
```

### Pattern 5: Retry Wrapper for AI Calls (D-01, D-02, D-03)
**What:** Wrapper that retries AI calls up to 2 times silently, then surfaces error with user feedback field
**When to use:** All AI-powered API routes
**Example:**
```typescript
async function callClaudeWithValidation<T>(
  schema: z.ZodType<T>,
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; model?: string }
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const MAX_RETRIES = 2;
  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const raw = await callClaude(systemPrompt, userMessage, options?.maxTokens);
    const result = parseAIResponse(raw, schema);
    if (result.success) return result;
    lastError = result.error;
    // Silent retry — user doesn't know
  }

  return { success: false, error: lastError };
}
```

### Anti-Patterns to Avoid
- **Separate schemas per file:** D-10 mandates one central `schemas.ts`. Do not scatter schemas across API routes or components.
- **Duplicating types:** D-09 mandates `z.infer<>` derivation. Never manually define an interface that mirrors a Zod schema.
- **Using `.parse()` instead of `.safeParse()`:** Always use `safeParse()` for AI responses and external input. `.parse()` throws, which makes error handling harder and violates D-04 (no silent corruption).
- **Validating on the client only:** API routes must validate server-side. Client-side components should trust data that has already been validated and stored.
- **Using Zod 3 patterns in Zod 4:** Do not use `z.string().email()` (v3 pattern), use `z.email()` (v4 top-level). Do not pass `{ message: "..." }` for errors (v3), use `{ error: "..." }` (v4).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON extraction from AI text | Custom regex parsers per endpoint | Single `extractJSON()` utility | 26+ duplicate regex instances currently; centralizing eliminates inconsistency |
| Type validation | `as TypeName` type assertions | `schema.safeParse()` | Type assertions provide zero runtime safety; Zod catches actual malformed data |
| Default values for missing fields | Manual `field ?? defaultValue` checks | Zod `.default()` and `.catch()` | Consistent, declarative, and tested; manual checks are error-prone and scattered |
| Error message formatting | Custom error string construction per endpoint | Zod `z.prettifyError()` or issue mapping | Zod provides structured error data; hand-rolled messages miss edge cases |
| Retry logic | Per-endpoint retry with try/catch | Centralized `callClaudeWithValidation()` | D-01 mandates consistent 2-retry behavior across all 7 endpoints |

**Key insight:** The current codebase has the exact same fragile parsing pattern copy-pasted across 26+ locations. Centralizing into `parseAIResponse()` + schemas eliminates the entire class of bugs at once.

## Common Pitfalls

### Pitfall 1: Zod 4 `.default()` Behavior Change
**What goes wrong:** In Zod 3, `.default()` values were parsed through the schema. In Zod 4, they short-circuit and must match the output type.
**Why it happens:** Developer expects v3 behavior where `.default("hello").transform(val => val.length)` would return 5.
**How to avoid:** Use `.prefault()` if you need the v3 behavior. For this project, `.default()` on simple types is fine -- just ensure default values match the expected output type.
**Warning signs:** Type errors where `.default()` value doesn't match the inferred output type.

### Pitfall 2: AI Returns Extra Fields or Markdown Wrapping
**What goes wrong:** Claude may wrap JSON in markdown code fences (` ```json ... ``` `) or include extra commentary before/after JSON.
**Why it happens:** LLMs don't always follow "ONLY return JSON" instructions perfectly.
**How to avoid:** The `extractJSON()` utility must: (1) strip code fences, (2) extract first `{...}` match as fallback, (3) handle both direct JSON and wrapped JSON.
**Warning signs:** `safeParse` failures where the raw string contains valid JSON buried in markdown.

### Pitfall 3: Schema Strictness Breaking Legacy Data
**What goes wrong:** Making schemas too strict causes existing localStorage sessions to fail validation.
**Why it happens:** Legacy data may have missing optional fields, different field names, or `null` where `undefined` is expected.
**How to avoid:** Use `.optional().default()` liberally for fields that may not exist in old data. Use `.catch()` for nested objects that may be entirely absent. Per D-08, silently apply defaults.
**Warning signs:** Users opening existing sessions seeing errors or blank screens.

### Pitfall 4: Circular Type References
**What goes wrong:** `DINSession` references `DINBenefit[]`, `DINCapability[]`, etc. Defining everything in one file with cross-references can cause circular issues.
**Why it happens:** Zod schemas are runtime objects, not just types -- circular references need special handling.
**How to avoid:** Define leaf schemas first (BatenProfiel, VermogensProfiel, InspanningsDossier), then entity schemas (DINBenefit, DINCapability, DINEffort), then composition schemas (DINSession). No actual circular references exist in this domain model, so this is straightforward.
**Warning signs:** TypeScript compilation errors or runtime "Cannot access before initialization" errors.

### Pitfall 5: Error Message Parameter Change in Zod 4
**What goes wrong:** Using `{ message: "..." }` (Zod 3 API) instead of `{ error: "..." }` (Zod 4 API).
**Why it happens:** Most online examples and tutorials still show Zod 3 syntax.
**How to avoid:** Always use `{ error: "..." }` for custom error messages. Use `z.config(z.locales.nl())` if a Dutch locale is available, or configure global error messages in Dutch manually.
**Warning signs:** Custom error messages not appearing; seeing default English messages instead.

### Pitfall 6: AI Response Schema vs Storage Schema Mismatch
**What goes wrong:** Using the storage schema (with `id`, `goalId`, `sectorId`) to validate AI responses that don't include those fields.
**Why it happens:** Developer uses one schema for everything.
**How to avoid:** Create separate "AI response" schemas (without generated fields) and "storage" schemas (with all fields). AI response schemas validate what Claude returns; the API route adds `id`, `goalId`, `sectorId` before saving.
**Warning signs:** AI responses always failing validation because they lack fields the app generates client-side.

## Code Examples

### Complete Schema File Structure
```typescript
// src/lib/schemas.ts
import { z } from "zod";

// === Enums & Literals ===
export const EffortDomainSchema = z.enum(["mens", "processen", "data_systemen", "cultuur"]);
export const EffortStatusSchema = z.enum(["gepland", "in_uitvoering", "afgerond", "on_hold"]);
export const ApprovalStatusSchema = z.enum(["voorstel", "goedgekeurd", "afgewezen", "aangepast"]);
export const PrioritySchema = z.enum(["hoog", "midden", "laag"]);
export const SectorNameSchema = z.enum(["PO", "VO", "Zakelijk"]);

// === Sub-schemas (profielen) ===
export const BatenProfielSchema = z.object({
  bateneigenaar: z.string().optional().default(""),
  indicator: z.string(),
  indicatorOwner: z.string(),
  currentValue: z.string(),
  targetValue: z.string(),
  meetmethode: z.string().optional().default(""),
  measurementMoment: z.string().optional().default(""),
});

export const VermogensProfielSchema = z.object({
  eigenaar: z.string(),
  huidieSituatie: z.string(),
  gewensteSituatie: z.string(),
});

export const InspanningsDossierSchema = z.object({
  eigenaar: z.string(),
  inspanningsleider: z.string(),
  verwachtResultaat: z.string(),
  kostenraming: z.string(),
  randvoorwaarden: z.string(),
});

// === Entity schemas (storage) ===
export const DINBenefitSchema = z.object({
  id: z.string(),
  goalId: z.string(),
  sectorId: z.string(),
  title: z.string().optional().default(""),
  description: z.string(),
  profiel: BatenProfielSchema,
});

// ... (DINCapability, DINEffort, etc.)

// === AI Response schemas (no id/goalId/sectorId) ===
export const AIBenefitSchema = z.object({
  title: z.string(),
  description: z.string(),
  profiel: z.object({
    bateneigenaar: z.string().optional().default(""),
    indicator: z.string().optional().default(""),
    indicatorOwner: z.string().optional().default(""),
    currentValue: z.string().optional().default(""),
    targetValue: z.string().optional().default(""),
  }),
});

// DIN-Mapping AI response
export const AIDINMappingSchema = z.object({
  benefits: z.array(AIBenefitSchema),
  capabilities: z.array(AICapabilitySchema),
  efforts: z.array(AIEffortSchema),
});

// Type exports
export type EffortDomain = z.infer<typeof EffortDomainSchema>;
export type DINBenefit = z.infer<typeof DINBenefitSchema>;
// ... etc.
```

### SafeParse Usage in API Route
```typescript
// src/app/api/din-mapping/route.ts (refactored)
import { AIDINMappingSchema } from "@/lib/schemas";
import { callClaudeWithValidation } from "@/lib/ai-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ... input validation ...

    const result = await callClaudeWithValidation(
      AIDINMappingSchema,
      DIN_MAPPING_PROMPT,
      userMessage,
      { maxTokens: 8192 }
    );

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        retryable: true, // D-03: client shows feedback field
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    // ... error handling ...
  }
}
```

### KiB Import with Zod (D-06)
```typescript
// src/lib/kib-import.ts (refactored)
import { z } from "zod";

export const KiBExportSchema = z.object({
  visie: z.object({
    uitgebreid: z.string(),
    beknopt: z.string(),
  }).optional(),
  doelen: z.array(z.object({
    id: z.string().optional(),
    naam: z.string(),
    beschrijving: z.string(),
    rang: z.number(),
  })).optional().default([]),
  scope: z.object({
    binnen: z.array(z.string()),
    buiten: z.array(z.string()),
  }).optional(),
  sessionId: z.string().optional(),
});

export function parseKiBExport(json: string): z.infer<typeof KiBExportSchema> {
  const parsed = JSON.parse(json); // may throw
  const result = KiBExportSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("Ongeldig KiB-formaat: " + result.error.issues.map(i => i.message).join(", "));
  }
  return result.data;
}
```

## Inventory of All Parsing Locations (Must Be Refactored)

This is the complete list of locations where fragile JSON parsing occurs. Every one of these must be updated to use Zod validation.

### Server-side (API routes)
| File | Line(s) | Current Pattern | Target |
|------|---------|----------------|--------|
| `src/app/api/din-mapping/route.ts` | 38-39 | `result.match(/\{[\s\S]*\}/)` + `JSON.parse` | `callClaudeWithValidation(AIDINMappingSchema, ...)` |
| `src/app/api/din-suggest/route.ts` | 50-59 | `JSON.parse(raw)` with regex fallback | `callClaudeWithValidation(AISuggestSchema, ...)` |
| `src/app/api/cross-analyse/route.ts` | (returns raw string) | No parsing -- raw string passed through | Validate with schema before returning |
| `src/app/api/analyze-sectorplan/route.ts` | (returns raw string) | No parsing -- raw string passed through | Validate with schema before returning |
| `src/app/api/export/route.ts` | (returns raw string) | No parsing -- prose output | Special case: export returns markdown prose, not JSON. Schema validates request input only. |
| `src/app/api/import-kib/route.ts` | 36 | `importFromKiB(jsonText)` with `JSON.parse` | Use `KiBExportSchema.safeParse()` |
| `src/app/api/parse-sector/route.ts` | N/A | Returns raw text, no JSON parsing | Validate output structure with SectorPlan schema |

### Client-side (components)
| File | Line(s) | Current Pattern | Target |
|------|---------|----------------|--------|
| `src/components/steps/CrossAnalyseStep.tsx` | 394-396, 467-469 | `analysis.match(/\{[\s\S]*\}/)` + `JSON.parse` | Receive validated data from API (server validates) |
| `src/components/steps/SectorWerkStep.tsx` | 500-502 | `currentAnalysis.match(/\{[\s\S]*\}/)` + `JSON.parse` | Receive validated data from API (server validates) |
| `src/components/steps/DINMappingStep.tsx` | 922 | `JSON.parse(cleaned)` for integratie-advies | Receive validated data from API (server validates) |

### Library layer
| File | Line(s) | Current Pattern | Target |
|------|---------|----------------|--------|
| `src/lib/ai-client.ts` | 79-81, 219-221 | `sectorAnalysis.match(/\{[\s\S]*\}/)` + `JSON.parse` | Parse in `generateDINMapping()` using schemas |
| `src/lib/kib-import.ts` | 26 | `JSON.parse(json) as KiBExport` | `KiBExportSchema.safeParse()` |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zod 3.x `z.string().email()` | Zod 4 `z.email()` (top-level) | June 2025 (Zod 4.0) | Must use v4 syntax for all string format validators |
| Zod 3 `{ message: "..." }` | Zod 4 `{ error: "..." }` | June 2025 (Zod 4.0) | Error customization API changed |
| Zod 3 `.default()` parsed through schema | Zod 4 `.default()` short-circuits (output type) | June 2025 (Zod 4.0) | Default values must match output type, not input type |
| Manual `JSON.parse() as Type` | `schema.safeParse()` with runtime validation | Current best practice | Eliminates entire class of type assertion bugs |

**Deprecated/outdated:**
- Zod 3.x: Entering maintenance mode, Zod 4 is the actively developed version
- `result.match(/\{[\s\S]*\}/)` pattern: Known fragile -- breaks on nested objects with regex edge cases, no validation

## Open Questions

1. **Dutch locale for Zod error messages**
   - What we know: Zod 4 supports 40+ locales via `z.config(z.locales.nl())`
   - What's unclear: Whether Dutch (`nl`) is included in the 40+ locales, and whether the messages are suitable for end-user display
   - Recommendation: Check at implementation time. If available, use it. If not, configure global Dutch error messages manually. Per Claude's discretion area.

2. **Export endpoint (prose output)**
   - What we know: The export endpoint (`/api/export`) returns markdown prose for the programmaplan, not JSON
   - What's unclear: Whether this endpoint needs Zod validation at all, since the output is free-form text
   - Recommendation: Validate the request input (sessionData structure) with Zod, but leave the AI prose output as-is. The export endpoint is the exception to the "validate all AI output" rule -- prose cannot be schema-validated.

3. **Cross-analyse/sectorplan analysis stored as strings**
   - What we know: `session.crossAnalyse` and `session.sectorAnalyses` are stored as `string` in the session type. Client components parse these strings into structured types at render time.
   - What's unclear: Should the API routes return validated structured objects (changing the session shape), or keep returning strings that the client validates?
   - Recommendation: API routes should validate and return structured objects. Update session type to store `CrossAnalyseResult | null` instead of `string`. This aligns with D-04 (no unvalidated data stored) and eliminates client-side parsing.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v24.14.0 | -- |
| npm | Package management | Yes | (bundled) | -- |
| zod | Schema validation | No (must install) | 4.3.6 (target) | -- |
| vitest | Testing | Yes (global) | 4.1.2 | -- |
| TypeScript | Type checking | Yes | ^5.8.0 | -- |

**Missing dependencies with no fallback:**
- `zod` must be installed: `npm install zod@^4.3.6`

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | none -- see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-02a | Zod schemas match existing TypeScript types (no regression) | unit | `npx vitest run src/lib/__tests__/schemas.test.ts -t "schema structure"` | No -- Wave 0 |
| DATA-02b | `parseAIResponse()` extracts JSON from various AI output formats | unit | `npx vitest run src/lib/__tests__/ai-parsing.test.ts -t "extractJSON"` | No -- Wave 0 |
| DATA-02c | `parseAIResponse()` validates against schema and returns typed result | unit | `npx vitest run src/lib/__tests__/ai-parsing.test.ts -t "parseAIResponse"` | No -- Wave 0 |
| DATA-02d | Invalid AI response triggers retry (up to 2 times) | unit | `npx vitest run src/lib/__tests__/ai-parsing.test.ts -t "retry"` | No -- Wave 0 |
| DATA-02e | KiB import validates against KiBExportSchema | unit | `npx vitest run src/lib/__tests__/kib-import.test.ts` | No -- Wave 0 |
| DATA-02f | Legacy data with missing fields gets defaults via `.default()`/`.catch()` | unit | `npx vitest run src/lib/__tests__/schemas.test.ts -t "legacy"` | No -- Wave 0 |
| DATA-02g | `npm run build` succeeds (no type regressions after types.ts rewrite) | integration | `npm run build` | N/A (build command) |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run && npm run build`
- **Phase gate:** Full suite green + `npm run build` succeeds before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- vitest configuration with path aliases matching `tsconfig.json`
- [ ] `src/lib/__tests__/schemas.test.ts` -- schema structure tests, legacy data tests
- [ ] `src/lib/__tests__/ai-parsing.test.ts` -- `extractJSON`, `parseAIResponse`, retry logic tests
- [ ] `src/lib/__tests__/kib-import.test.ts` -- KiB import validation tests
- [ ] Framework install: `npm install -D vitest@^4.1.2` -- dev dependency

## Project Constraints (from CLAUDE.md)

These directives from CLAUDE.md apply to this phase:

1. **`npm run build` must succeed** after every change -- critical for types.ts rewrite
2. **Skills gebruiken** -- use pim-dev-skill patterns (TypeScript, Tailwind, App Router)
3. **Geen stille failures** -- always show user feedback (aligns with D-02, D-03)
4. **Direct committen en pushen** -- commit after each working change
5. **Dual Persistence Patroon** -- localStorage FIRST, then Supabase. Validation must not break this flow.
6. **Deduplicatie van IDs** -- existing `deduplicateById()` in persistence.ts must be preserved
7. **All UI and AI output in Nederlands (nl-NL)** -- error messages must be in Dutch
8. **@/* import aliases** -- all imports use absolute paths with `@/` prefix
9. **Type imports** -- use `import type { ... }` for type-only imports
10. **Error handling pattern** -- try-catch with `NextResponse.json({ success, error?, data? })`

## Sources

### Primary (HIGH confidence)
- [zod.dev](https://zod.dev/) -- Official Zod 4 documentation, API reference, basic usage
- [zod.dev/v4](https://zod.dev/v4) -- Zod 4 release notes and new features
- [zod.dev/v4/changelog](https://zod.dev/v4/changelog) -- Migration guide from v3 to v4
- [zod.dev/basics](https://zod.dev/basics) -- parse, safeParse, type inference patterns
- [zod.dev/api](https://zod.dev/api) -- Complete API reference for schema definition
- [zod.dev/error-customization](https://zod.dev/error-customization) -- Error handling in Zod 4
- npm registry -- `zod@4.3.6` confirmed as latest stable (2026-03-30)

### Secondary (MEDIUM confidence)
- [DEV Community migration guide](https://dev.to/pockit_tools/migrating-to-zod-4-the-complete-guide-to-breaking-changes-performance-gains-and-new-features-3ll0) -- Community migration guide, cross-verified with official docs

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Zod 4 is the de facto standard, version confirmed on npm
- Architecture: HIGH -- Patterns derived from official Zod docs + analysis of all 26+ parsing locations in the codebase
- Pitfalls: HIGH -- Breaking changes documented in official migration guide; legacy data patterns verified against existing types.ts

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable library, 30-day validity)
