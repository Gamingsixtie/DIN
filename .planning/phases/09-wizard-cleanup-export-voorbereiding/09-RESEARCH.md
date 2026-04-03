# Phase 9: Wizard Cleanup & Export Voorbereiding - Research

**Researched:** 2026-04-03
**Domain:** Dead code removal / integratieadvies feature cleanup
**Confidence:** HIGH

## Summary

Phase 9 is a surgical removal phase: every trace of the integratieadvies feature must be deleted from the codebase. The feature spans 7 files across schemas, types, AI client, prompts, session context, two UI components (DINMappingStep and ExportStep), word export, one API route, and one test file. Three orphaned component files must be deleted entirely. The total removal is approximately 500-700 lines of dead code.

The codebase is well-structured with Zod schemas as the single source of truth. Removing schemas cascades cleanly to types. The `integratieAdvies` field in DINSessionSchema uses `.optional()` which means legacy sessions that still carry this field will parse without error -- Zod silently strips unknown keys when the field is removed from the schema.

**Critical finding:** MergedDINView.tsx is listed as an orphaned component in CONTEXT.md (D-03), but it is actively imported and used in DINMappingStep.tsx (line 37 import, line 1469 usage) for the "Samengevoegd DIN-Netwerk" toggle view. Deleting MergedDINView.tsx would break DINMappingStep. The planner MUST keep MergedDINView.tsx alive or also remove the samengevoegd phase toggle from DINMappingStep.

**Primary recommendation:** Execute removals in dependency order: schemas/types first (breaks compile), then AI client/prompts, then session context, then UI components, then word export, then API route, then delete orphaned files. Build-verify after each wave.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Deep clean -- alle integratieadvies-gerelateerde code wordt volledig verwijderd. Geen dead code achterlaten.
- **D-02:** Verwijder het integratieadvies-panel uit DINMappingStep (knop, slide-out panel, state, 'Verwerk in sectorplan' flow). Geen vervanging nodig.
- **D-03:** Verwijder verweesde componenten: `SectorIntegratieStep.tsx`, `SamengevoegdDINStep.tsx`, `MergedDINView.tsx`.
- **D-04:** Verwijder `generateSectorIntegratie()` functie en `SECTOR_INTEGRATIE_PROMPT` uit ai-client.ts.
- **D-05:** Verwijder `IntegratieAdviesItemSchema`, `IntegratieAdviesResultSchema` en gerelateerde types uit schemas.ts.
- **D-06:** Verwijder het `integratieAdvies` veld uit DINSessionSchema. Zod's `.optional()` zorgt ervoor dat legacy sessies zonder problemen laden -- het veld wordt stilzwijgend genegeerd.
- **D-07:** Verwijder de 'Integratie-advies' sectie uit word-export.ts (per-sector advies rendering).
- **D-08:** Verwijder de `IntegratieAdviesSubSection` en gerelateerde integratie-advies weergave uit ExportStep.tsx.
- **D-09:** Geen vervangende sectie in de export -- Phase 10 behandelt de volledige export-redesign.
- **D-10:** Geen lightweight vervanging voor het verwijderde advies-panel. Cross-analyse (Phase 8) zal cross-sector guidance apart afhandelen.

### Claude's Discretion
- Volgorde van verwijdering (welke bestanden eerst)
- Eventuele cleanup van imports die na verwijdering ongebruikt zijn
- Hoe de DINMappingStep UI er uitziet na verwijdering van het panel (layout aanpassingen)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXP-04 | Integratieadvies-stap verwijderd uit de wizard flow | Full removal inventory documented: 7 source files + 3 deletions + 1 API route + 1 test file. All integratieAdvies references mapped with exact line numbers. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Stack**: Next.js 16, TypeScript, Tailwind CSS 4 -- no changes to stack
- **Language**: All UI and AI output in Dutch (nl-NL) -- relevant for any remaining copy after removal
- **Build gate**: `npm run build` must succeed without errors after changes
- **Skills**: Use available skills (pim-dev-skill, frontend-design) for implementation
- **Direct commit and push**: After each working change
- **Persistence**: localStorage-first (sync-first pattern) -- integratieAdvies removal from session must not break this
- **Functional check**: Verify existing functionality is not broken after removal

## Architecture Patterns

### Removal Dependency Graph

The integratieAdvies feature has this dependency structure:

```
schemas.ts (IntegratieAdviesItemSchema, IntegratieAdviesResultSchema, DINSessionSchema.integratieAdvies)
    |
    +-- types.ts (re-exports IntegratieAdviesItem, IntegratieAdviesResult)
    |       |
    |       +-- DINMappingStep.tsx (imports types, has state, functions, UI)
    |       +-- ExportStep.tsx (imports type, has IntegratieAdviesSubSection)
    |       +-- word-export.ts (imports type, has per-sector rendering)
    |       +-- ai-client.ts (integratieAdvies param in generateVerrijktSectorplan)
    |
    +-- schemas.ts (AIIntegratieAdviesSchema, AI item/default schemas)
    |       |
    |       +-- cross-analyse/route.ts (imports AIIntegratieAdviesSchema)
    |
    +-- prompts.ts (SECTOR_INTEGRATIE_PROMPT)
    |       |
    |       +-- ai-client.ts (imports SECTOR_INTEGRATIE_PROMPT)
    |       +-- cross-analyse/route.ts (imports SECTOR_INTEGRATIE_PROMPT)
    |
    +-- session-context.tsx (integratieAdvies: {} in initial state)
    +-- session-context.test.ts (integratieAdvies: {} in fixture)
```

### Recommended Removal Order

**Wave 1 -- Data layer (schemas, types, prompts):**
1. `src/lib/schemas.ts` -- Remove IntegratieAdviesItemSchema, IntegratieAdviesResultSchema, integratieAdvies from DINSessionSchema, AIIntegratieAdviesSchema + helpers
2. `src/lib/types.ts` -- Remove IntegratieAdviesItem and IntegratieAdviesResult re-exports
3. `src/lib/prompts.ts` -- Remove SECTOR_INTEGRATIE_PROMPT

**Wave 2 -- Business logic (AI client, API route, session context):**
4. `src/lib/ai-client.ts` -- Remove generateSectorIntegratie(), SECTOR_INTEGRATIE_PROMPT import, integratieAdvies param from generateVerrijktSectorplan()
5. `src/app/api/cross-analyse/route.ts` -- Remove sector-integratie code path, AIIntegratieAdviesSchema import, SECTOR_INTEGRATIE_PROMPT import, integratieAdvies from verrijkt-sectorplan call
6. `src/lib/session-context.tsx` -- Remove integratieAdvies from initial state
7. `src/lib/__tests__/session-context.test.ts` -- Remove integratieAdvies from fixture

**Wave 3 -- UI components:**
8. `src/components/steps/DINMappingStep.tsx` -- Remove all integratieAdvies state, functions, UI elements (ADVIES_SECTIONS, AdviesCard, buttons, panel, integratieAdvies in verrijkt sectorplan call)
9. `src/components/steps/ExportStep.tsx` -- Remove IntegratieAdviesSubSection function, advies lookup, rendering

**Wave 4 -- Word export:**
10. `src/lib/word-export.ts` -- Remove integratie-advies per-sector section, IntegratieAdviesResult import

**Wave 5 -- File deletions:**
11. Delete `src/components/steps/SectorIntegratieStep.tsx`
12. Delete `src/components/steps/SamengevoegdDINStep.tsx`
13. Delete `src/components/din/MergedDINView.tsx` (SEE CRITICAL NOTE BELOW)

### Anti-Patterns to Avoid

- **Partial removal:** Removing the schema but leaving type imports will cause compile errors. Always remove in dependency order.
- **Forgetting the API route:** The `cross-analyse/route.ts` has a `type === "sector-integratie"` code path that must be entirely removed -- it is the server-side handler for the feature.
- **Breaking verrijkt sectorplan:** The `handleGenerateVerrijktPlan` function (DINMappingStep line 1275) and `generateVerrijktSectorplan` (ai-client.ts line 524) both pass `integratieAdvies` as an optional parameter. The parameter must be removed from both the caller and the function signature.

## Critical Finding: MergedDINView.tsx Is NOT Orphaned

**Confidence: HIGH -- verified by code inspection**

CONTEXT.md D-03 lists `MergedDINView.tsx` as an orphaned component to delete. However, MergedDINView is actively imported and used:

| Location | Line | Usage |
|----------|------|-------|
| `DINMappingStep.tsx` | 37 | `import MergedDINView from "@/components/din/MergedDINView"` |
| `DINMappingStep.tsx` | 1469 | `<MergedDINView session={session} onSwitchToEdit={() => setPhase("per-sector")} />` |
| `DINMappingStep.tsx` | 42 | `type DINPhase = "per-sector" \| "samengevoegd"` |
| `DINMappingStep.tsx` | 1437-1458 | Phase toggle UI between "Per Sector Invullen" and "Samengevoegd DIN-Netwerk" |

**Impact of deletion:** If MergedDINView.tsx is deleted without removing its usage from DINMappingStep, the build will fail. If the usage AND the samengevoegd phase toggle are both removed, the user loses the ability to view the combined DIN network overview.

**Planner options:**
1. **Remove MergedDINView.tsx AND the samengevoegd phase toggle from DINMappingStep** -- Consistent with D-03 but removes a feature. Also clean up: DINPhase type becomes unnecessary (always "per-sector"), phase state variable can be removed.
2. **Keep MergedDINView.tsx, only delete SectorIntegratieStep.tsx and SamengevoegdDINStep.tsx** -- Safer, preserves existing functionality, but contradicts D-03.

**Recommendation:** Option 1 (remove both) is most consistent with the CONTEXT.md intent. The "samengevoegd" view is a read-only aggregation that cross-analyse (Phase 8) will handle differently. Removing it simplifies DINMappingStep significantly (removes ~40 lines of toggle UI + type). SamengevoegdDINStep.tsx (the standalone wizard step) is truly orphaned and uses MergedDINView -- once the standalone step is deleted, MergedDINView's only remaining consumer is DINMappingStep's toggle. Removing the toggle makes MergedDINView truly orphaned, and then deleting it is clean.

## Complete Removal Inventory

### Files to DELETE entirely (3 files)

| File | Size | Truly Orphaned? |
|------|------|-----------------|
| `src/components/steps/SectorIntegratieStep.tsx` | 13.4 KB | YES -- not referenced in wizard or any import |
| `src/components/steps/SamengevoegdDINStep.tsx` | 1.5 KB | YES -- not referenced in wizard or any import |
| `src/components/din/MergedDINView.tsx` | 80 KB | CONDITIONALLY -- still used by DINMappingStep samengevoegd toggle |

### Files to EDIT (10 files)

| File | What to Remove | Estimated Lines Removed |
|------|---------------|------------------------|
| `src/lib/schemas.ts` | IntegratieAdviesItemSchema (L296-300), IntegratieAdviesResultSchema (L302-309), DINSessionSchema.integratieAdvies (L370-372), AIIntegratieAdviesItemSchema (L556-560), aiIntegratieAdviesItemDefault (L562-566), AIIntegratieAdviesSchema (L568-575), type exports (L653-654, L666) | ~45 lines |
| `src/lib/types.ts` | IntegratieAdviesItem and IntegratieAdviesResult re-exports (L37-38) | 2 lines |
| `src/lib/prompts.ts` | SECTOR_INTEGRATIE_PROMPT (L140-181) | ~42 lines |
| `src/lib/ai-client.ts` | SECTOR_INTEGRATIE_PROMPT import (L9), generateSectorIntegratie() (L244-381), integratieAdvies param in generateVerrijktSectorplan (L531, L592-594) | ~145 lines |
| `src/app/api/cross-analyse/route.ts` | AIIntegratieAdviesSchema import (L4), SECTOR_INTEGRATIE_PROMPT import (L5), integratieAdvies in verrijkt-sectorplan (L30), sector-integratie code path (L40-192) | ~155 lines |
| `src/lib/session-context.tsx` | integratieAdvies in initial state (L144) | 1 line |
| `src/lib/__tests__/session-context.test.ts` | integratieAdvies in fixture (L36) | 1 line |
| `src/components/steps/DINMappingStep.tsx` | Types import (L14-15), ADVIES_SECTIONS (L81-93), AdviesCard component (L95-130), MergedDINView import (L37), DINPhase type (L42), isAnalyzingIntegratie state (L439), showAdviesPanel state (L448), integratieAdvies state (L449-451), setIntegratieAdvies wrapper (L498-504), handleIntegratieAdvies function (L1217-1272), integratieAdvies in handleGenerateVerrijktPlan (L1279-1293, L1320), phase toggle UI (L1436-1458), samengevoegd phase section (L1460-1474), advies buttons (L1637-1652), slide-out panel (L2182-2330+) | ~300+ lines |
| `src/components/steps/ExportStep.tsx` | IntegratieAdviesResult import (L7), IntegratieAdviesSubSection function (L651-681), advies lookup (L701-704), advies rendering (L835) | ~35 lines |
| `src/lib/word-export.ts` | IntegratieAdviesResult import (L20), integratie-advies section (L1137-1169) | ~35 lines |

**Total estimated removal: ~760 lines of code across 13 files (10 edits + 3 deletions)**

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Legacy session compatibility | Custom migration logic | Zod `.optional()` behavior | Removing a field from a Zod schema that was `.optional()` means old data with that field is silently stripped during parse -- no migration code needed |
| Finding all references | Manual search | TypeScript compiler errors after schema removal | Remove schemas first, then `npm run build` will report every remaining reference |

**Key insight:** The TypeScript compiler is the best tool for this job. Remove schemas/types first, build, and let the compiler tell you every remaining reference. This is safer than grep because it catches indirect type dependencies.

## Common Pitfalls

### Pitfall 1: Forgetting the API Route Handler
**What goes wrong:** The `cross-analyse/route.ts` has a `type === "sector-integratie"` branch that imports AIIntegratieAdviesSchema and SECTOR_INTEGRATIE_PROMPT. Removing the schema without cleaning the route causes import errors.
**Why it happens:** The API route is not obviously connected to the UI-level feature.
**How to avoid:** Include the API route in Wave 2 cleanup.
**Warning signs:** Build fails with import errors from `src/app/api/cross-analyse/route.ts`.

### Pitfall 2: Verrijkt Sectorplan Still Passes integratieAdvies
**What goes wrong:** The `handleGenerateVerrijktPlan` function in DINMappingStep (L1274-1330) constructs `integratieAdvies` text from the local state and passes it to the API. The API then passes it to `generateVerrijktSectorplan` in ai-client.ts. Both the caller and the function must be cleaned.
**Why it happens:** integratieAdvies was used as supplementary context for verrijkt sectorplan generation -- it is woven into the data flow, not just the UI.
**How to avoid:** Remove the integratieAdvies parameter from generateVerrijktSectorplan signature (ai-client.ts L531) and the code that builds adviesText in DINMappingStep (L1278-1293) and passes it (L1320).
**Warning signs:** TypeScript error on function signature mismatch, or silently passing empty string.

### Pitfall 3: MergedDINView Dependency Chain
**What goes wrong:** Deleting MergedDINView.tsx without removing its import and usage in DINMappingStep breaks the build.
**Why it happens:** CONTEXT.md lists it as orphaned but it has an active consumer.
**How to avoid:** Remove the import, the samengevoegd phase toggle, and the samengevoegd view section from DINMappingStep BEFORE deleting MergedDINView.tsx.
**Warning signs:** Import error on build.

### Pitfall 4: Stale Type Imports After Removal
**What goes wrong:** After removing IntegratieAdviesResult from schemas/types, files that import it fail.
**Why it happens:** Multiple files import this type: DINMappingStep, ExportStep, word-export.
**How to avoid:** Clean all imports in the same wave as the type removal, or rely on build errors to catch them.
**Warning signs:** TypeScript "not exported" errors.

### Pitfall 5: cross-analyse Route Becomes Simpler But Must Still Work
**What goes wrong:** After removing the `sector-integratie` branch and `verrijkt-sectorplan` integratieAdvies param, the remaining cross-analyse and verrijkt-sectorplan paths must still function correctly.
**Why it happens:** The route handles 3 types: cross-analyse (keep), sector-integratie (remove), verrijkt-sectorplan (keep but simplify).
**How to avoid:** Test that cross-analyse and verrijkt-sectorplan still work after cleanup. Only the sector-integratie type handling is removed.
**Warning signs:** 500 errors on cross-analyse or verrijkt-sectorplan API calls.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | vitest.config.ts (inferred) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXP-04 | integratieAdvies field removed from DINSessionSchema | unit | `npx vitest run src/lib/__tests__/schemas.test.ts -x` | Existing (needs update) |
| EXP-04 | Legacy sessions with integratieAdvies field still parse | unit | `npx vitest run src/lib/__tests__/schemas.test.ts -x` | Needs new test case |
| EXP-04 | Session context no longer includes integratieAdvies | unit | `npx vitest run src/lib/__tests__/session-context.test.ts -x` | Existing (needs update) |
| EXP-04 | Build succeeds after all removals | smoke | `npm run build` | N/A (build command) |

### Sampling Rate
- **Per task commit:** `npm run build`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green + successful build

### Wave 0 Gaps
- [ ] New test case in `schemas.test.ts`: verify DINSessionSchema parses legacy data containing `integratieAdvies` field without error (field is silently stripped)
- [ ] Update existing `session-context.test.ts` fixture: remove `integratieAdvies: {}`

## Code Examples

### Removing integratieAdvies from DINSessionSchema (schemas.ts)

Before:
```typescript
// Line 370-372
integratieAdvies: z
  .record(z.string(), z.union([IntegratieAdviesResultSchema, z.string()]))
  .optional(),
```

After: Delete these 3 lines entirely. Zod's `z.object()` with `strict()` not used -- extra keys in parsed data are silently stripped by default.

### Removing integratieAdvies from generateVerrijktSectorplan (ai-client.ts)

Before:
```typescript
// Line 531
integratieAdvies?: string;
// Lines 592-594
if (data.integratieAdvies) {
  parts.push("\n--- Integratie-advies ---");
  parts.push(data.integratieAdvies.slice(0, 3000));
}
```

After: Remove the parameter from the function signature and the conditional block.

### Removing sector-integratie from cross-analyse/route.ts

Before:
```typescript
import { AICrossAnalyseSchema, AIIntegratieAdviesSchema } from "@/lib/schemas";
import { CROSS_ANALYSE_PROMPT, SECTOR_INTEGRATIE_PROMPT } from "@/lib/prompts";
// ...
integratieAdvies: body.integratieAdvies || "",
// ...
if (body.type === "sector-integratie") { /* ~150 lines */ }
```

After: Remove AIIntegratieAdviesSchema import, remove SECTOR_INTEGRATIE_PROMPT import, remove integratieAdvies from verrijkt-sectorplan body, remove entire sector-integratie if-block (lines 40-192).

### Legacy Session Compatibility Test

```typescript
// New test case for schemas.test.ts
it("DINSessionSchema strips unknown integratieAdvies field from legacy data", () => {
  const legacyData = {
    id: "test",
    name: "Test",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    currentStep: 0,
    goals: [],
    sectorPlans: [],
    pmcEntries: [],
    benefits: [],
    capabilities: [],
    efforts: [],
    integratieAdvies: { PO: { sectorName: "PO", aansluiting: { titel: "t", toelichting: "t", punten: [] }, verrijking: { titel: "t", toelichting: "t", punten: [] }, aanvullingen: { titel: "t", toelichting: "t", punten: [] }, quickWins: { titel: "t", toelichting: "t", punten: [] }, aandachtspunten: { titel: "t", toelichting: "t", punten: [] } } },
  };
  const result = DINSessionSchema.safeParse(legacyData);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).not.toHaveProperty("integratieAdvies");
  }
});
```

## Open Questions

1. **MergedDINView.tsx removal scope**
   - What we know: CONTEXT.md D-03 says delete it. It IS used in DINMappingStep.
   - What's unclear: Was the user aware of the samengevoegd toggle dependency when making D-03?
   - Recommendation: Remove MergedDINView AND the samengevoegd phase toggle from DINMappingStep, since cross-analyse (Phase 8) will provide a different cross-sector view. This is the most consistent interpretation of D-03. If the planner disagrees, keep MergedDINView and only delete SectorIntegratieStep and SamengevoegdDINStep.

## Sources

### Primary (HIGH confidence)
- Direct code inspection of all 13 affected files
- `npm run build` -- verified current build succeeds
- `npx vitest --version` -- verified vitest 4.1.2 available
- `src/lib/schemas.ts` -- Zod schema structure verified
- `src/app/api/cross-analyse/route.ts` -- API route handler verified with sector-integratie path

### Secondary (MEDIUM confidence)
- Zod behavior for `.optional()` fields: when a field is removed from a schema, data containing that field is parsed with the extra field silently ignored (Zod does not use `.strict()` by default)

## Metadata

**Confidence breakdown:**
- Removal inventory: HIGH -- every file inspected, all references found via grep
- Dependency order: HIGH -- based on import graph analysis
- Legacy compatibility: HIGH -- Zod `.optional()` + non-strict parsing confirmed
- MergedDINView finding: HIGH -- import at line 37, usage at line 1469 confirmed

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable -- this is a removal phase, code does not drift)
