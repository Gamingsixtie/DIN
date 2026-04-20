# Phase 18: Rijke cross-sectorale domein-uitwerking - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 6 (1 schema modify, 1 prompt modify, 1 route modify, 1 component modify, 1 demo modify, 1 test extend)
**Analogs found:** 6 / 6 (all in-codebase, high quality)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/schemas.ts` | model (zod schema) | validation / type source | `AIPromotedEffortSchema` + `AIEffortSchema` + `InspanningsDossierSchema` (same file) | exact (in-file precedent) |
| `src/lib/prompts.ts` | config (AI prompt) | request → AI | `SUB_EFFORT_ANALYSE_PROMPT` (current body, same file) + `CROSS_ANALYSE_STAP5_PROMPT` (focusDoel pattern) | exact (rewrite of same prompt) |
| `src/app/api/cross-analyse/route.ts` | route handler | request-response / AI orchestration | Stap 5 `focusGoal` branch (lines 141-198, same file) | exact (identical pattern, neighboring branch) |
| `src/components/cross-analyse/StapSectorVertaling.tsx` | component (card rendering) | presentation | existing domein-loop block (lines 380-422 same file) + `SectorBadge` shared | exact (extension of same block) |
| `src/lib/demo-data.ts` | fixture | data definition | existing `subEffortAnalysis` entries (lines 755-796 same file) | exact (augment existing entries) |
| `src/lib/__tests__/cross-analyse-schema.test.ts` | test | unit validation | `describe("SubEffortAdviesSchema (D-30)")` block (lines 373-407 same file) | exact (sibling describe block) |

## Pattern Assignments

### `src/lib/schemas.ts` (model, validation)

**Analog:** same-file precedents — `InspanningsDossierSchema` (storage dossier shape), `AIPromotedEffortSchema` (Phase 14 AI-side inline dossier with `.default("")`), `AIEffortSchema` (same AI-side inline dossier pattern).

**InspanningsDossierSchema storage pattern** (`src/lib/schemas.ts:88-94`):
```typescript
export const InspanningsDossierSchema = z.object({
  eigenaar: z.string(),
  inspanningsleider: z.string(),
  verwachtResultaat: z.string(),
  kostenraming: z.string(),
  randvoorwaarden: z.string(),
});
```
All 5 fields are required `z.string()`. Storage-level contract. **Don't reuse directly for AI-side** — AI may omit.

**AI-side dossier pattern** (`src/lib/schemas.ts:604-612` in `AIEffortSchema`, mirrored `796-813` in `AIPromotedEffortSchema`):
```typescript
dossier: z
  .object({
    eigenaar: z.string().optional().default(""),
    inspanningsleider: z.string().optional().default(""),
    verwachtResultaat: z.string().optional().default(""),
    kostenraming: z.string().optional().default(""),
    randvoorwaarden: z.string().optional().default(""),
  })
  .optional(),
```
Pattern: **inline object** with every field `.optional().default("")`, wrapped in outer `.optional()`. Downstream reads always see string, never undefined. **This is the precedent Phase 18 must follow** — define it once as `SubEffortDossierSchema` (DRY), consume via `SubEffortDossierSchema.optional()` in `SubEffortAdviesSchema`.

**Current SubEffortAdviesSchema** (`src/lib/schemas.ts:330-337`):
```typescript
export const SubEffortAdviesSchema = z.object({
  groepId: z.string(),
  domein: z.enum(["mens", "processen", "data_systemen", "cultuur"]),
  actie: z.enum(["combineren", "apart_houden"]),
  items: z.array(z.string()),
  reden: z.string(),
  voorgesteldeNaam: z.string().nullable().optional(),
});
```
Extend by appending 5 new `.optional()` fields **after** the existing 6 — preserves legacy parse order and keeps the diff minimal.

**Optional-field precedent for backward compat** (`schemas.ts:191` — Phase 14 `promotedToEffortIds`):
```typescript
promotedToEffortIds: z.array(z.string()).optional(), // Phase 14 D-08 — NO .default() per Pitfall 1
```
Key lesson: when the field's absence must mean "not generated yet" (not "empty on purpose"), use `.optional()` without `.default()`. Apply to `titel`, `beschrijving`, `beargumentatie`, `vermogenImpact`, `dossier` — all five.

**Type export pattern** (`schemas.ts:931` — existing):
```typescript
export type SubEffortAdvies = z.infer<typeof SubEffortAdviesSchema>;
```
Picks up new optional fields automatically. **Add two new exports** for the new sub-schemas:
```typescript
export type SubEffortVermogenImpact = z.infer<typeof SubEffortVermogenImpactSchema>;
export type SubEffortDossier = z.infer<typeof SubEffortDossierSchema>;
```

**Sector enum reuse** (`schemas.ts:57`):
```typescript
export const SectorNameSchema = z.enum(["PO", "VO", "Zakelijk"]);
```
Use directly in `SubEffortVermogenImpactSchema.sectorId`.

---

### `src/lib/prompts.ts` (config, AI prompt)

**Analog:** current `SUB_EFFORT_ANALYSE_PROMPT` (`prompts.ts:360-387`) — the exact string being rewritten. Secondary analog: `CROSS_ANALYSE_STAP5_PROMPT` for how `focusDoel` is framed in a prompt input-shape.

**Current SUB_EFFORT_ANALYSE_PROMPT skeleton** (`prompts.ts:360-387`):
```typescript
export const SUB_EFFORT_ANALYSE_PROMPT = `Je bent een expert in programmamanagement (DIN-methodiek) en analyseert inspanningen per inspannings-domein onder een VermogenGelijkenisGroep.

Een VermogenGelijkenisGroep bevat drie (of meer) sector-vermogens die inhoudelijk op elkaar lijken (PO + VO + Zakelijk). Inspanningen die aan deze vermogens gekoppeld zijn kunnen per domein worden geclusterd of apart blijven.

Input krijg je (JSON):
{
  "groep": { "id": "<groepId>", "vermogenIds": [...], "gezamenlijkeOmschrijving": "...", "reden": "..." },
  "vermogens": [{ "id": "...", "sectorId": "PO|VO|Zakelijk", "title"|"description": "..." }],
  "efforts":   [{ "id": "...", "sectorId": "...", "domain": "mens|processen|data_systemen|cultuur", "title": "...", "description": "..." }]
}

Lever een array \`SubEffortAdvies[]\` met één entry per (groep × domein) waar minstens één gekoppelde inspanning staat:
{
  "groepId": "<zelfde als input.groep.id>",
  "domein": "mens" | "processen" | "data_systemen" | "cultuur",
  "actie": "combineren" | "apart_houden",
  "items": ["<effort-id>", "..."],
  "reden": "<methodiek-conforme onderbouwing>",
  "voorgesteldeNaam": "<sectoroverstijgende titel>" | null
}

Regels (D-11, D-31):
- ÉÉN advies per domein binnen een groep. Geen cross-domein combineren.
- \`voorgesteldeNaam\` is VERPLICHT bij \`actie: "combineren"\` en MOET sectoroverstijgend zijn (geen PO/VO/Zakelijk substrings, min 10 chars).
- Bij \`actie: "apart_houden"\`: \`voorgesteldeNaam\` is \`null\`.
- Gebruik cross-domein context ALLEEN om je reden te versterken ("Mens-training ondersteunt Data-implementatie"), maar nooit als justificatie voor cross-domein merge.
- Als een domein geen gekoppelde inspanningen heeft, laat dat domein WEG uit de response (geen lege entries — dat doet de client).
- Produceer ALLEEN geldige JSON, geen prose errom.`;
```

**Pattern to preserve during rewrite:**
- Opening line: `Je bent een expert in programmamanagement (DIN-methodiek)` — follow with `, Werken aan Programma's, Prevaas & Van Loon / Wijnen & Van der Tak 2002)` for Hfst 11.3 reference (matching `DIN_SUGGEST_INSPANNING_PROMPT` style at `prompts.ts:646-691`).
- Explicit "Input krijg je (JSON):" block with JSON skeleton — keep this shape, add `focusDoel` as first key, add `profielHuidig`/`profielGewenst` to each vermogen.
- Explicit "Lever een array" block with JSON skeleton — add the 5 new fields with inline `<descriptor>` comments.
- "Regels" bullet list — keep existing 4 rules, append new rules: titel-inherits-voorgesteldeNaam-guard, vermogenImpact-exactly-one-per-sector, Dutch role terminology.
- Closing line: `Produceer ALLEEN geldige JSON, geen prose errom.` — keep verbatim.

**Focus-doel framing analog** — how stap 5 payload presents focusDoel to AI (`src/app/api/cross-analyse/route.ts:182-196`):
```typescript
payloadForPrompt = {
  focusDoel: { id: focusGoal.id, naam: focusGoal.name ?? focusGoal.description ?? "" },
  baten: focusBenefits,
  gedeeldeVermogens: focusCaps,
  gedeeldeInspanningen: focusEfforts,
  // ...
};
```
The stap 5 route only sends `id` + `naam`. **Phase 18 extends** to `{ id, naam, beschrijving }` — same flat shape, one extra key. Prompt input-shape must mirror: `"focusDoel": { "id", "naam", "beschrijving" }`.

---

### `src/app/api/cross-analyse/route.ts` (route handler, AI orchestration)

**Analog:** same-file stap 5 `focusGoal` branch (`route.ts:141-198`) — identical extraction pattern for `focusGoal` from `body.goals`.

**Existing focusGoal extraction** (`route.ts:141-144`):
```typescript
if (stap === 5) {
  const rawGoals = (body.goals || []) as Array<{ id: string; name?: string; description?: string; rank?: number }>;
  const focusGoal = getFocusGoal(rawGoals);
  if (focusGoal) {
```
**Copy this pattern verbatim** into the stap 4 branch, just before the `Promise.all` at line 244. `getFocusGoal` is already imported at line 23.

**Existing stap 4 sub-call structure** (`route.ts:244-284`) — the exact block to modify:
```typescript
const subAnalyses = await Promise.all(
  groepen.map(async (groep) => {
    const capIdSet = new Set(groep.vermogenIds);
    const groepVermogens = capsData.filter((c: { id: string }) => capIdSet.has(c.id));
    const groepEffortIdSet = new Set(
      capEffortMapsLocal
        .filter((m) => capIdSet.has(m.capabilityId))
        .map((m) => m.effortId)
    );
    const groepEfforts = effortsData.filter((e: { id: string }) =>
      groepEffortIdSet.has(e.id)
    );

    if (groepEfforts.length === 0) {
      // D-13: skip AI-call — geen gekoppelde efforts
      return [];
    }

    const subSystemPrompt = assembleSystemPrompt(
      SUB_EFFORT_ANALYSE_PROMPT,
      "cross-analyse",
      undefined,
      kibContext
    );

    const subUserMessage = JSON.stringify(
      { groep, vermogens: groepVermogens, efforts: groepEfforts },
      null,
      2
    );

    const subResult = await callClaudeWithValidation(
      z.array(SubEffortAdviesSchema),
      subSystemPrompt,
      subUserMessage,
      { maxTokens: 4096 }
    );

    return subResult.success ? subResult.data : [];
  })
);
```

**Three concrete diffs:**
1. **Before `Promise.all`** — add focus-goal extraction (mirror lines 141-144):
   ```typescript
   const rawGoals = (body.goals || []) as Array<{ id: string; name?: string; description?: string; rank?: number }>;
   const focusGoal = getFocusGoal(rawGoals);
   const focusDoelContext = focusGoal
     ? { id: focusGoal.id, naam: focusGoal.name ?? "", beschrijving: focusGoal.description ?? "" }
     : null;
   const rawCaps = (body.capabilities || []) as Array<{ id: string; profiel?: { huidieSituatie?: string; gewensteSituatie?: string } }>;
   ```
2. **Inside `groepen.map`** — enrich groepVermogens with profiel fields, rebuild `subUserMessage`:
   ```typescript
   const groepVermogensRich = groepVermogens.map((v: { id: string; sectorId: string; title: string; description: string }) => {
     const raw = rawCaps.find((r) => r.id === v.id);
     return { ...v, profielHuidig: raw?.profiel?.huidieSituatie ?? "", profielGewenst: raw?.profiel?.gewensteSituatie ?? "" };
   });
   const subUserMessage = JSON.stringify(
     { focusDoel: focusDoelContext, groep, vermogens: groepVermogensRich, efforts: groepEfforts },
     null,
     2
   );
   ```
3. **In `callClaudeWithValidation` options** — bump `maxTokens: 4096` → `maxTokens: 8192`.

**Schema import unchanged** — `SubEffortAdviesSchema` at line 11 auto-picks up the rich fields after `schemas.ts` edit.
**No new import needed** — `getFocusGoal` already at line 23.

**Error-handling pattern to preserve** (line 282): `return subResult.success ? subResult.data : [];` — silent per-group failure per Phase 17 Pitfall 4. Keep verbatim.

---

### `src/components/cross-analyse/StapSectorVertaling.tsx` (component, presentation)

**Analog:** same-file existing domein-loop block (`StapSectorVertaling.tsx:380-422`) — the exact advies-state render to extend. Secondary analog: `SectorBadge` from `./shared`.

**Existing advies-state card** (`StapSectorVertaling.tsx:380-422`):
```tsx
return (
  <div
    key={domein}
    className={`border ${colors.border} ${colors.bg} rounded-lg p-3`}
    data-testid={`hefboomlaag-${groep.id}-${domein}`}
  >
    <div className="flex items-center justify-between mb-1 gap-1">
      <p className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
        {DOMAIN_LABELS[domein]}
      </p>
      <span
        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
          advies.actie === "combineren"
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-600"
        }`}
      >
        {advies.actie === "combineren" ? "Combineren" : "Apart"}
      </span>
    </div>
    {advies.voorgesteldeNaam && (
      <p className="text-xs font-semibold text-gray-800 mb-1">
        {advies.voorgesteldeNaam}
      </p>
    )}
    {advies.reden && (
      <p className="text-[11px] text-gray-600 mb-2 leading-snug">
        {advies.reden}
      </p>
    )}
    {relatedEfforts.length > 0 && (
      <ul className="text-[11px] text-gray-700 space-y-0.5">
        {relatedEfforts.map((eff) => (
          <li key={eff.id}>• {eff.title || eff.description}</li>
        ))}
      </ul>
    )}
    {advies.actie === "combineren" && (
      <HefboomBadge vermogens={groepVermogens} />
    )}
  </div>
);
```

**Existing DOMAIN_COLORS map** (`StapSectorVertaling.tsx:34-39`) — reuse verbatim:
```tsx
const DOMAIN_COLORS: Record<EffortDomain, { bg: string; border: string; text: string }> = {
  mens: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  processen: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
  data_systemen: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  cultuur: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
};
```
These tints already correspond to the CLAUDE.md domain colors (blue=mens #2563eb, green=processen #059669, purple=data_systemen #7c3aed, amber=cultuur #d97706). Background tint pattern (`bg-*-50` + `border-*-200` + `text-*-700`) is the codebase standard for domain differentiation. Do not introduce new color tokens.

**Existing SectorBadge import** (`StapSectorVertaling.tsx:4`):
```tsx
import { SectorBadge } from "./shared";
```
Reuse for `vermogenImpact` list rendering — each entry badges `PO`/`VO`/`Zakelijk` next to the impact text.

**Type-imports pattern to extend** (`StapSectorVertaling.tsx:16`):
```tsx
import type { VermogenGelijkenisGroep, SubEffortAdvies } from "@/lib/schemas";
```
After schemas.ts edit: add `SubEffortDossier` and `SubEffortVermogenImpact` to this import line — they'll be needed by the new `DossierSectie` helper component and the `vermogenImpact` map callback.

**Backward-compat rendering rule** — every new block must guard on the field:
```tsx
{advies.titel && <h4 ...>{advies.titel}</h4>}
{advies.beschrijving && <p ...>{advies.beschrijving}</p>}
{advies.vermogenImpact && advies.vermogenImpact.length > 0 && <section>...</section>}
{advies.dossier && <DossierSectie dossier={advies.dossier} />}
```
Keep legacy `voorgesteldeNaam` / `reden` / `relatedEfforts` / `HefboomBadge` blocks as fallback — old sessions without rich fields still render identically.

**Local useState pattern for expand/collapse** — the codebase already uses this idiom. `StapSectorVertaling.tsx:3`:
```tsx
import React, { useState } from "react";
```
Dossier helper component uses `const [open, setOpen] = useState(false)` — standard React idiom, no new abstraction.

**Grid-layout concern** (`StapSectorVertaling.tsx:356`):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
```
The 4-column grid becomes tight for rich content. Planner decides between `lg:grid-cols-2` (safer) vs. keeping 4-col with dossier expand-only. Research flags this as R4 risk; recommended `lg:grid-cols-2` for readability.

---

### `src/lib/demo-data.ts` (fixture, data)

**Analog:** the 4 existing `subEffortAnalysis` entries at `demo-data.ts:755-796` — augment in place.

**Existing entry shape** (`demo-data.ts:755-765`, one of 4):
```typescript
subEffortAnalysis: [
  {
    groepId: "groep-klantpartnerschap",
    domein: "mens",
    actie: "combineren",
    items: [effortIds[1], effortIds[4], effortIds[6]],
    reden:
      "Scope: gezamenlijk curriculum outside-in gespreksvaardigheden + sector-specifieke casuïstiek modules. Stappen: (1) Q2 2026 gezamenlijk programmaontwerp...",
    voorgesteldeNaam:
      "Sectoroverstijgende outside-in gespreksvaardigheidstraining",
  },
  // ... 3 more entries for cultuur, data_systemen, processen
],
```

**Augmentation strategy per entry** — add 5 new keys, keeping the existing 6 intact:
1. `titel` = existing `voorgesteldeNaam` verbatim (satisfies prompt rule "titel inherits voorgesteldeNaam").
2. `beschrijving` = first 1-2 sentences distilled from existing `reden` ("Scope: ..." clause).
3. `beargumentatie` = hefboom-sentence from existing `reden` ("Besparing ~30% t.o.v. drie losse trajecten" / "Voorkomt datasilo's" / "Voorwaarde voor slagen CRM-hefboom").
4. `vermogenImpact` = 3-entry array using `capIds[0..2]` with sector-specific impact text. For cultuur entry (currently 2 items, VO not in `items`): still produce 3 entries — VO gets "voorspelde aansluiting" impact consistent with existing `reden` note on VO prediction.
5. `dossier` = full 5-field object with Cito-realistic role names (Directie L&D, Programmamanager Klant in Beeld, CIO, Sectormanager, Business Process Owner) — see Research "Realistisch dossier-content per domein" for verbatim strings.

**Focus-doel linking** — demo must demonstrate that the rich rendering is focus-goal-aware. `demo-data.ts:53-57` defines the focus goal description: "Integraal klantbeeld en outside-in werken als strategisch fundament". Each `beargumentatie` must literally reference this doel-phrasing so the UAT demo proves the prompt pipeline.

**`capIds` / `effortIds` helpers** already defined at the top of the file (referenced at `demo-data.ts:760` as `effortIds[1]` etc.). Use same indexing for `vermogenImpact.vermogenId`.

---

### `src/lib/__tests__/cross-analyse-schema.test.ts` (test, unit)

**Analog:** existing `describe("SubEffortAdviesSchema (D-30)")` block at `cross-analyse-schema.test.ts:373-407`. Extend by adding sibling `describe("SubEffortAdviesSchema Phase 18 rijke uitwerking")` after line 407.

**Existing Phase 17 test block** (`cross-analyse-schema.test.ts:373-407`):
```typescript
describe("SubEffortAdviesSchema (D-30)", () => {
  test("sub effort advies accepteert valide input met voorgesteldeNaam string", () => {
    const result = SubEffortAdviesSchema.safeParse({
      groepId: "g1",
      domein: "mens",
      actie: "combineren",
      items: ["eff-1", "eff-2"],
      reden: "gedeelde training",
      voorgesteldeNaam: "Sector-overstijgende training",
    });
    expect(result.success).toBe(true);
  });
  test("sub effort advies accepteert voorgesteldeNaam null", () => {
    const result = SubEffortAdviesSchema.safeParse({
      groepId: "g1",
      domein: "processen",
      actie: "apart_houden",
      items: ["eff-1"],
      reden: "verschillende contexten",
      voorgesteldeNaam: null,
    });
    expect(result.success).toBe(true);
  });
  test("sub effort advies faalt bij ongeldig domein", () => {
    const result = SubEffortAdviesSchema.safeParse({
      groepId: "g1",
      domein: "financien",
      actie: "combineren",
      items: [],
      reden: "x",
      voorgesteldeNaam: null,
    });
    expect(result.success).toBe(false);
  });
});
```

**Pattern to mirror:**
- `describe("X (Phase N)")` label with phase-decision-ID.
- Per test: `SchemaName.safeParse({...})` with inline object literal (no fixture variables).
- Assert via `expect(result.success).toBe(true|false)`.
- When asserting on parsed data, always include `if (result.success) { ... }` narrow-guard block before accessing `result.data` — see `cross-analyse-schema.test.ts:417`, `434-436`, `454-455`.

**Integration test precedent** (`cross-analyse-schema.test.ts:465-512`):
```typescript
describe("Stap4ResultSchema sub effort advies integration (D-30)", () => {
  test("volledig stap 4 response met subEffortAnalysis parseert succesvol", () => {
    const mockResponse = { /* full object with 2 subEffortAnalysis entries */ };
    const result = Stap4ResultSchema.safeParse(mockResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subEffortAnalysis).toHaveLength(2);
      // ... field-level assertions
    }
  });
});
```
Add a Phase 18 integration test that feeds a demo-shaped entry with all 5 new fields + dossier + vermogenImpact through `Stap4ResultSchema.safeParse`.

**Backward-compat preservation** — existing 3 tests at lines 373-407 MUST stay green after schema extension. They use Phase 17 shape (no new fields). Since all new fields are `.optional()`, Zod accepts their absence → tests remain valid without modification.

**Recommended new tests** (6 total):
1. Rich shape with all 5 new fields populated parses successfully.
2. `dossier: {}` (empty object) parses successfully — verifies `.default("")` on each dossier subfield.
3. `vermogenImpact: []` (empty array) parses successfully.
4. `vermogenImpact[].sectorId: "INVALID"` parse fails — enforces `SectorNameSchema`.
5. Demo-data fixture (imported from `@/lib/demo-data`) parses through `Stap4ResultSchema`.
6. Legacy Phase 17 shape (no new fields) still parses — mirror of line 373 but with explicit comment asserting Phase 18 backward compat.

---

## Shared Patterns

### Zod AI-side vs. storage-side dossier dichotomy
**Source:** `src/lib/schemas.ts:88-94` (storage strict) + `src/lib/schemas.ts:604-612` + `796-813` (AI loose with defaults)
**Apply to:** Phase 18 `SubEffortDossierSchema`
**Rule:** storage schemas have required `z.string()`; AI-side schemas use inline object with `.optional().default("")` per field, wrapped in outer `.optional()`. Preserve this split — don't call `InspanningsDossierSchema.partial()` (creates `undefined` fields, breaks downstream string-operations).

### `.optional()` WITHOUT `.default()` for new optional fields
**Source:** `src/lib/schemas.ts:191` (`promotedToEffortIds: z.array(z.string()).optional(), // Phase 14 D-08 — NO .default() per Pitfall 1`)
**Apply to:** all 5 new `SubEffortAdviesSchema` fields (`titel`, `beschrijving`, `beargumentatie`, `vermogenImpact`, `dossier`)
**Rule:** when field absence means "not generated" (vs. "empty on purpose"), omit `.default()`. Downstream renderer then uses `{advies.titel && <h4>...}` guards, not `{advies.titel || <placeholder>}`.

### `getFocusGoal` extraction from `body.goals`
**Source:** `src/app/api/cross-analyse/route.ts:141-144` (existing stap 5 branch)
**Apply to:** stap 4 sub-effort branch (new, Phase 18)
```typescript
const rawGoals = (body.goals || []) as Array<{ id: string; name?: string; description?: string; rank?: number }>;
const focusGoal = getFocusGoal(rawGoals);
```
`getFocusGoal` is already imported at route.ts:23 — no import change.

### Domain color tokens
**Source:** `src/components/cross-analyse/StapSectorVertaling.tsx:34-39` (`DOMAIN_COLORS` map with Tailwind `bg-*-50` / `border-*-200` / `text-*-700`)
**Apply to:** all rich card rendering for sub-effort advies in Phase 18 — reuse the existing map, don't define a new color dictionary.

### `SectorBadge` from `./shared`
**Source:** `src/components/cross-analyse/shared/index.ts:1` + `SectorBadge.tsx`
**Apply to:** `vermogenImpact` list rendering — each entry prefixed with `<SectorBadge sector={v.sectorId} />`.
**Import pattern:** `import { SectorBadge } from "./shared";` (already present in StapSectorVertaling.tsx line 4).

### Progressive disclosure via `useState(false)`
**Source:** React standard, already imported at `StapSectorVertaling.tsx:3`
**Apply to:** dossier expand/collapse — standalone helper component inside the same file, `const [open, setOpen] = useState(false);`.

### Silent-failure pattern for parallel AI calls
**Source:** `src/app/api/cross-analyse/route.ts:282` (`return subResult.success ? subResult.data : [];`)
**Apply to:** Phase 18 modified stap 4 branch — keep this line verbatim. Per Phase 17 Pitfall 4, one failing sub-call should not block other groups.

### Legacy-guard narrow access in tests
**Source:** `src/lib/__tests__/cross-analyse-schema.test.ts:416-418`, `433-437`, `453-456`
**Apply to:** all new Phase 18 tests — always wrap `result.data.X` access in `if (result.success) { ... }` block.

### Dutch-only content (CLAUDE.md directive)
**Apply to:** prompts (all new user-facing strings in prompt templates), demo-data (all dossier text), UI labels in StapSectorVertaling rich card. "Opdrachtgever", "Inspanningsleider", "Verwacht resultaat", "Kostenraming", "Randvoorwaarden" — no English equivalents.

### Cito blue `#003366` for primary heading color
**Source:** CLAUDE.md branding rule + inline usage convention
**Apply to:** rich card titel (`text-[#003366]`) and dossier toggle button (`text-[#003366] hover:text-[#002244]`) — primary accent stays consistent with Cito brand.

## No Analog Found

All 6 files have strong in-codebase analogs. No Phase 18 file requires a pattern drawn purely from RESEARCH.md or external reference.

## Metadata

**Analog search scope:**
- `src/lib/schemas.ts` (951 lines) — dossier and AI-side schema precedents
- `src/lib/prompts.ts` (963 lines) — existing SUB_EFFORT_ANALYSE_PROMPT and dossier-language in DIN_SUGGEST_INSPANNING_PROMPT
- `src/app/api/cross-analyse/route.ts` (337 lines) — stap 5 focusGoal branch as direct analog for stap 4 extension
- `src/components/cross-analyse/StapSectorVertaling.tsx` (623 lines) — existing domein-loop card renderer
- `src/components/cross-analyse/shared/` — SectorBadge and ClusterCard
- `src/lib/demo-data.ts` (803 lines) — existing 4 subEffortAnalysis entries
- `src/lib/__tests__/cross-analyse-schema.test.ts` (513 lines) — Phase 17 D-30 test block as direct template

**Files scanned:** 7 (primary files) + shared/ directory (2 files)
**Pattern extraction date:** 2026-04-20
