# Phase 13: Stap 5 Cross-Analyse Prioriteitsview eerste doel - Research

**Researched:** 2026-04-05
**Domain:** Next.js 16 / React 19 / Zod schema refactor + AI prompt rewrite + focused read-only UI
**Confidence:** HIGH (codebase verified end-to-end; no external libraries introduced)

## Summary

Phase 13 is almost entirely a **refactor-inside-existing-patterns** phase. Every library, hook, component, and AI-call pattern needed already exists in the codebase and is validated by Phase 11 execution. The work is: rewrite one Zod schema, rewrite one prompt constant, narrow the `structuredData` payload in one branch of one API route, and rewrite one React component end-to-end. No new dependencies, no new abstractions, no new test frameworks.

The core research finding is that the plan-artefact (`~/.claude/plans/twinkling-puzzling-hennessy.md`) and CONTEXT.md already lock every meaningful technical decision — including the exact Zod schema shape, the API-route filtering logic, the focusdoel-selection expression, and the migration strategy for stale `stap5` data. Research confirms those decisions are feasible against the current code and identifies the concrete integration points where each change lands.

The one subtle risk is **Zod validation on session load**: the current `loadSession` in `session-context.tsx` does NOT run `DINSessionSchema.safeParse` on loaded data (it only migrates `sectorAnalyses`). This means old `stap5` shape will silently flow through to `CrossAnalyseWizard.tsx` and blow up in the renderer. D-10 must be implemented at the wizard-restore boundary (lines 98-113 of `CrossAnalyseWizard.tsx`), not in `session-context.tsx`.

**Primary recommendation:** Execute the plan-artefact changes in file order (schema -> prompt -> API route -> wizard intro/migration guard -> `StapSectorVertaling.tsx` rewrite), gated by `npm run build` + `npm run lint` after each file. The only code that needs actual design thinking is the internal component split inside the new `StapSectorVertaling.tsx` — everything else is mechanical.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Focusdoel-bepaling**
- **D-01:** Focusdoel = het eerste doel uit de KiB-import (nummer 1). Bepaal via `[...session.goals].sort((a,b) => (a.rank ?? 999) - (b.rank ?? 999))[0]`, fallback op `session.goals[0]`. Identieke logica in client en API-route zodat beide naar hetzelfde doel kijken. Geen dropdown of toggle in stap 5.

**AI-trigger**
- **D-02:** Handmatige "Analyseer" knop — hergebruik bestaande `handleAnalyse` in `CrossAnalyseWizard.tsx`. Consistent met Phase 11 D-11. Structurele view (focusdoel + baten + vermogens + inspanningen) rendert ook zonder AI-resultaat; AI-callouts verschijnen pas na klik.

**"Buiten scope" footer**
- **D-03:** Ingeklapt toont alleen tellingen ("X vermogens en Y inspanningen vielen buiten de consolidatie"). Bij uitklappen: simpele lijst met titels + sector-badges. Geen volledige kaarten of AI-review per item — dat herintroduceert juist de ruis die we wegnemen.

**Stakeholder-herkenning & badging (kritisch)**
- **D-04:** Kleurgecodeerde badges zijn verplicht — sector managers hebben individuele sectorsessies gehad om hún baten te bepalen. In de geconsolideerde stap 5 moeten ze op één blik kunnen terugvinden welke van hun baten daadwerkelijk geraakt worden door de gedeelde vermogens en inspanningen. Dit is de visuele basis voor mandaat en draagvlak om de cross-sector aanpak uit te voeren.
- **D-05:** Badge-schema:
  - `batenDekking.wordtGeraakt: true` -> groene badge "geraakt"
  - `batenDekking.wordtGeraakt: false` -> rode badge "risico" + risico-tekst zichtbaar
  - `inspanningReview.breedteOordeel: "dekt_volledig"` -> groene badge
  - `inspanningReview.breedteOordeel: "moet_verbreed"` -> amber badge
  - `inspanningReview.breedteOordeel: "mist_aspect"` -> rode badge
- **D-06:** Baten worden per sector gegroepeerd (PO/VO/Zakelijk) met `SectorBadge`. Naast elke baat de geraakt/risico-badge. Dit maakt de "is mijn baat geraakt?"-vraag per sectormanager direct beantwoordbaar.

**Datamodel & AI-prompt**
- **D-07:** `Stap5ResultSchema` wordt volledig vervangen door het nieuwe schema uit plan-artefact (velden: `focusDoelId`, `focusDoelNaam`, `vermogenReview[]`, `inspanningReview[]`, `batenDekking[]`, `samenvatting`). Oude shape (`sectorVertalingen[]`) verdwijnt.
- **D-08:** `CROSS_ANALYSE_STAP5_PROMPT` wordt volledig herschreven rond vier punten: hefboomwerking per vermogen, breedte van inspanningen, baten-dekking (met expliciete risico-waarschuwing), en 3-5 zinnen samenvatting. Methodisch geankerd in hefboomwerking (Werken aan Programma's, Hfst 8).
- **D-09:** API-route versmalt de `structuredData` payload voor `stap === 5`: alleen focusdoel, baten onder focusdoel, cross-sector vermogens (`relatedSectors.length > 1`) die aan die baten hangen, en gedeelde inspanningen (multi-sector `responsibleSector`) die aan die vermogens hangen. Client filtert parallel dezelfde items voor de view.

**Migratie bestaande sessies**
- **D-10:** Geen destructieve migratie. Oude `stap5` data (oude shape) faalt Zod-parse -> try/catch bij inladen in `CrossAnalyseWizard.tsx` zet `stap5: undefined`. User draait stap 5 opnieuw. Geen dataverlies in andere stappen.

**Wizard-copy**
- **D-11:** Stap-titel/intro voor stap 5 actualiseren van "Sector-vertaling" naar "Prioriteitsview — eerste doel". Intro-tekst benoemt expliciet: (a) waarom alleen het eerste doel, (b) dat niet-geconsolideerde items later alsnog kunnen worden opgepakt.

**Empty states**
- **D-12:** Drie empty states: (a) geen doelen -> bestaande empty state hergebruiken; (b) focusdoel maar geen cross-sector vermogens -> expliciete melding "Voer eerst stap 4 uit of voeg gedeelde vermogens toe"; (c) wel data maar AI-resultaat nog niet -> structurele view zonder AI-callouts plus de "Analyseer" knop.

### Claude's Discretion

- Exacte visuele opmaak van callouts (borders, spacing, icoon-keuze) — **binnen UI-SPEC grenzen**
- Tailwind-klassenkeuze voor de badges (mits kleuren conform D-05 blijven)
- Precieze copy van intro-tekst en section-headers — **UI-SPEC heeft exacte copy reeds vastgelegd**
- Of de samenvatting als card, callout of quote wordt gerenderd
- Interne component-opsplitsing binnen `StapSectorVertaling.tsx`

### Deferred Ideas (OUT OF SCOPE)

- **Multi-doel toggle in stap 5:** Gebruiker wilde strikt het eerste doel; doorloop voor doel 2, 3, etc. kan een latere phase worden.
- **Apply-knop voor AI-verbredingssuggesties:** Plan noemt expliciet: alleen weergave, geen apply. Apply-functionaliteit kan in een volgfase.
- **Domeinbalans en gap-analyse voor het focusdoel:** Verdwijnt uit stap 5; zou eventueel in een toekomstige "diepteview per doel" passen.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| R-CROSS-01 | Cross-analyse herkent gedeelde baten over PO/VO/Zakelijk sectoren (semantisch, niet alleen exacte match) | Cross-sector herkenning is **reeds gereed** via Phase 8 semantische matching (`findSharedCapabilities`, `VermogenClusterItemSchema`). Phase 13 consumeert dat resultaat: de `relatedSectors: string[]` op `DINCapability` en consolidatie-flags zijn de basis voor de focusview-filtering. Research bevestigt: geen nieuwe matching-logica nodig, alleen lezen van bestaande state. |
| R-CROSS-02 | Cross-analyse herkent gedeelde vermogens die voor meerdere sectoren gelden | Idem: `activeCaps.filter(c => c.relatedSectors && c.relatedSectors.length > 1)` is de canonical filter (gebruikt in huidige `StapSectorVertaling.tsx` lines 37-42 en in de focus-wizard-header line 318 van `CrossAnalyseWizard.tsx`). Phase 13 re-usest deze filter voor de focusview. Voor inspanningen: `responsibleSector.includes(",")` als multi-sector indicator (bestaand patroon). |

**Belangrijk:** Beide requirements zijn v1, al uitgevoerd in Phase 8 ("completed 2026-04-03"). Phase 13 is een **weergave-herontwerp** dat de output van die requirements scherper presenteert — niet een nieuwe implementatie van cross-analyse logica zelf. De traceability blijft: R-CROSS-01/02 -> Phase 8 (motor) + Phase 13 (focusview presentation).
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Verificatie bij elke feature:** `npm run build` MOET slagen zonder errors; functionele controle verplicht (imports, props, types); geen stille failures; direct committen en pushen na werkende wijziging.
- **Methodiek:** Elke feature moet aansluiten bij `docs/programmaboek.doc` (Prevaas & Van Loon). Hefboomwerking is de methodische anker voor de nieuwe prompt (Hfst 8).
- **UX voor alle output:** AI-output MOET visueel aantrekkelijk en overzichtelijk gerenderd worden — nooit platte tekst of raw markdown. In Phase 13 geldt dat voor de AI-samenvatting, hefboomanalyses, verbredingssuggesties, risico-teksten.
- **Taal:** Alle UI en AI-output in nl-NL. Geen Engelse termen.
- **Branding:** Cito blauw `#003366` als primaire kleur. DIN-keten kleuren (`#003366`/`#0066cc`/`#0891b2`/`#059669`) reeds gedefinieerd in `globals.css`.
- **Dual persistence:** localStorage-first (sync) -> Supabase (async). Nooit lege state opslaan. Sessie is bron van waarheid.
- **Skills gebruiken:** `interface-design`, `frontend-design`, `ui-design-system`, `pim-dev-skill` beschikbaar in `.claude/skills/`. UI-SPEC heeft design-contract reeds gelockt — executor moet zich daar aan houden.
- **GSD workflow enforcement:** Geen directe repo-edits buiten GSD-command zonder expliciete opdracht. Phase execution via `/gsd:execute-phase`.

## Standard Stack

### Core (already installed — NO new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.0 | App Router, API routes, SSR | Reeds in codebase; Phase 13 raakt alleen één bestaande API-route en één client component |
| react | 19.1.0 | UI rendering, hooks | `useState`, `useCallback`, `useEffect` via `useSession()` context |
| typescript | 5.8.0 | Type safety | `strict: true` mode is aan; alle types via `z.infer` uit `schemas.ts` |
| zod | (via @anthropic-ai/sdk + app) | Schema validatie single source of truth | Phase 1 D-10: schemas.ts is de enige bron voor types; `z.infer<>` in `types.ts` |
| @anthropic-ai/sdk | 0.78.0 | Claude API client | `callClaudeWithValidation()` is het centrale patroon |
| tailwindcss | 4.1.0 | Utility-first CSS via `@theme` tokens | Cito tokens al in `globals.css`; geen preset, geen shadcn |
| vitest | 4.1.2 | Unit test runner | `include: src/**/*.test.ts`; bestaand patroon (zie `src/lib/__tests__/`) |

### Supporting (already in use)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| docx | 9.6.0 | Word export | Niet geraakt in Phase 13 (export blijft werken op geconsolideerde session-state) |
| mammoth / pdf-parse | — | Document parsing | Niet geraakt in Phase 13 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled focus-view filtering | Extract naar `din-service.ts` helper | **Recommendatie:** client-filter inline houden in `StapSectorVertaling.tsx` — de filter is 4 regels en wordt nergens anders gebruikt. Extractie voegt abstractie-kosten toe zonder hergebruik-winst. Wel als **pure function** schrijven zodat hij separaat test-baar is indien gewenst (zie Validation Architecture). |
| Volledig nieuwe API-route `/api/cross-analyse-focus` | Uitbreiden bestaande `route.ts` op `stap === 5` tak | **Recommendatie:** bestaande route uitbreiden (D-09 locked). Nieuwe route breekt het Phase 11 `stap`-parameter patroon en vereist aparte frontend-wiring. |
| Separate test file | Tests aan bestaand `src/lib/__tests__/` pattern toevoegen | **Recommendatie:** nieuwe `src/lib/__tests__/stap5-focus-filter.test.ts` als de filter als pure function wordt geëxtraheerd; anders component-integratie testen via handmatige UAT (bestaand patroon in codebase — geen React Testing Library in dependencies). |

**Installation:**
```bash
# NIETS te installeren — alles al aanwezig
npm install   # alleen als node_modules corrupt is
```

**Version verification** (via package.json inspectie, 2026-04-05):
- `next`: `^16.1.0` — actieve major, App Router stable
- `react` / `react-dom`: `^19.1.0` — actieve major, concurrent features
- `typescript`: `^5.8.0`
- `vitest`: `^4.1.2`
- `@anthropic-ai/sdk`: `^0.78.0` — Phase 13 gebruikt alleen `client.messages.create()` via bestaande `callClaude` wrapper (ai-client.ts line 39-48); geen direct SDK-werk
- `tailwindcss`: `^4.1.0` met `@tailwindcss/postcss ^4.1.0`
- `zod`: meegeleverd via @anthropic-ai/sdk + lokaal gebruikt; schemas.ts gebruikt alleen Zod v3 API (`z.object`, `z.array`, `z.enum`, `.optional().default([])`, `.safeParse`) — geen Zod v4-specifieke features nodig

Geen `npm view` verificatie nodig: niets wordt toegevoegd.

## Architecture Patterns

### Recommended Project Structure (no changes — status quo)
```
src/
├── app/
│   └── api/
│       └── cross-analyse/
│           └── route.ts              # ← BRANCH uitbreiden (stap === 5)
├── components/
│   └── cross-analyse/
│       ├── CrossAnalyseWizard.tsx    # ← intro-tekst + stap5-restore guard
│       ├── StapSectorVertaling.tsx   # ← VOLLEDIG HERSCHRIJVEN
│       └── shared/
│           ├── SectorBadge.tsx       # reuse
│           └── LoadingOverlay.tsx    # reuse via parent
├── lib/
│   ├── schemas.ts                    # ← Stap5ResultSchema vervangen
│   ├── prompts.ts                    # ← CROSS_ANALYSE_STAP5_PROMPT vervangen
│   ├── types.ts                      # geen wijziging (types volgen z.infer automatisch)
│   ├── ai-client.ts                  # reuse callClaudeWithValidation
│   ├── prompt-assembly.ts            # reuse assembleSystemPrompt
│   └── __tests__/
│       └── stap5-focus-filter.test.ts  # ← NIEUW (Wave 0) als pure function geëxtraheerd
```

### Pattern 1: Zod-first single source of truth
**What:** Types worden afgeleid uit Zod schemas via `z.infer<>`; schemas.ts is de enige bron.
**When to use:** Altijd — elke entity, elk AI-response schema, elke persistence shape.
**Example** (bestaand patroon, schemas.ts:795-820):
```typescript
// schemas.ts
export const Stap5ResultSchema = z.object({
  focusDoelId: z.string(),
  focusDoelNaam: z.string(),
  vermogenReview: z.array(z.object({
    vermogenId: z.string(),
    hefboomAnalyse: z.string(),
    suggestieAanscherping: z.string().optional(),
  })).default([]),
  inspanningReview: z.array(z.object({
    inspanningId: z.string(),
    breedteOordeel: z.enum(["dekt_volledig", "moet_verbreed", "mist_aspect"]),
    toelichting: z.string(),
    suggestieVerbreding: z.string().optional(),
  })).default([]),
  batenDekking: z.array(z.object({
    baatId: z.string(),
    sector: z.string(),
    wordtGeraakt: z.boolean(),
    redenering: z.string(),
    risico: z.string().optional(),
  })).default([]),
  samenvatting: z.string(),
});
export type Stap5Result = z.infer<typeof Stap5ResultSchema>;
```
`types.ts` re-export bestaat al (line 47) en vangt automatisch het nieuwe shape op. **Geen types.ts wijziging nodig.**

### Pattern 2: `callClaudeWithValidation` for all Claude calls
**What:** Central wrapper die Zod schema injecteert, 2 silent retries doet, `parseAIResponse` aanroept.
**When to use:** Elke Claude API call die gestructureerde JSON verwacht.
**Example** (bestaand, route.ts:142-147):
```typescript
// src/app/api/cross-analyse/route.ts (stap === 5 branch)
const result = await callClaudeWithValidation(
  Stap5ResultSchema,                                                          // nieuwe shape
  assembleSystemPrompt(CROSS_ANALYSE_STAP5_PROMPT, "cross-analyse", undefined, kibContext),
  userMessage,  // bevat versmalde structuredData
  { maxTokens: 16384, model: "claude-opus-4-6" }
);
if (!result.success) {
  return NextResponse.json({ success: false, error: result.error, retryable: true }, { status: 422 });
}
```

### Pattern 3: Per-step branch in `route.ts` via `stap` parameter
**What:** Eén API-route handelt alle 5 stappen af, discrimineert via `body.stap`, selecteert schema+prompt via `getStepConfig(stap)` (route.ts:23-32).
**When to use:** Phase 11 pattern — niet breken.
**Example:**
```typescript
// route.ts:23-32 (BESTAANT — alleen Stap5ResultSchema krijgt nieuwe shape)
const configs: Record<number, { prompt: string; schema: z.ZodSchema }> = {
  1: { prompt: CROSS_ANALYSE_STAP1_PROMPT, schema: Stap1ResultSchema },
  2: { prompt: CROSS_ANALYSE_STAP2_PROMPT, schema: Stap2ResultSchema },
  3: { prompt: CROSS_ANALYSE_STAP3_PROMPT, schema: Stap3ResultSchema },
  4: { prompt: CROSS_ANALYSE_STAP4_PROMPT, schema: Stap4ResultSchema },
  5: { prompt: CROSS_ANALYSE_STAP5_PROMPT, schema: Stap5ResultSchema },  // nieuwe shape landt hier vanzelf
};
```
De map hoeft **niet** gewijzigd — alleen het onderliggende schema en prompt veranderen.

### Pattern 4: Versmalde `structuredData` voor stap 5 (NIEUW, maar binnen bestaand patroon)
**What:** Voor `stap === 5` specifiek, filter de `structuredData` payload voordat je hem in `userMessage` serialiseert. Alle andere stappen krijgen de volledige payload.
**When to use:** Alleen in de `if (stap && stap >= 1 && stap <= 5)` tak, vóór `JSON.stringify(structuredData, ...)`.
**Example** (nieuw, landt tussen route.ts:120 en route.ts:134):
```typescript
// Determine focusdoel op dezelfde manier als client (D-01)
const focusGoal = [...(body.goals || [])].sort(
  (a: { rank?: number }, b: { rank?: number }) => (a.rank ?? 999) - (b.rank ?? 999)
)[0];

let payloadForPrompt = structuredData;
if (stap === 5 && focusGoal) {
  const focusBenefitIds = new Set(
    (body.goalBenefitMaps || [])
      .filter((m: { goalId: string }) => m.goalId === focusGoal.id)
      .map((m: { benefitId: string }) => m.benefitId)
  );
  const focusBenefits = benefitsData.filter((b) => focusBenefitIds.has(b.id));

  const sharedCapIds = new Set(
    (body.capabilities || [])
      .filter((c: { relatedSectors?: string[] }) => (c.relatedSectors?.length ?? 0) > 1)
      .map((c: { id: string }) => c.id)
  );
  const focusCapIds = new Set(
    (body.benefitCapabilityMaps || [])
      .filter((m: { benefitId: string; capabilityId: string }) =>
        focusBenefitIds.has(m.benefitId) && sharedCapIds.has(m.capabilityId)
      )
      .map((m: { capabilityId: string }) => m.capabilityId)
  );
  const focusCaps = capsData.filter((c) => focusCapIds.has(c.id));

  const sharedEffortIds = new Set(
    (body.efforts || [])
      .filter((e: { responsibleSector?: string }) => e.responsibleSector?.includes(","))
      .map((e: { id: string }) => e.id)
  );
  const focusEffortIds = new Set(
    (body.capabilityEffortMaps || [])
      .filter((m: { capabilityId: string; effortId: string }) =>
        focusCapIds.has(m.capabilityId) && sharedEffortIds.has(m.effortId)
      )
      .map((m: { effortId: string }) => m.effortId)
  );
  const focusEfforts = effortsData.filter((e) => focusEffortIds.has(e.id));

  payloadForPrompt = {
    focusDoel: { id: focusGoal.id, naam: focusGoal.name },
    baten: focusBenefits,
    gedeeldeVermogens: focusCaps,
    gedeeldeInspanningen: focusEfforts,
    koppelingen: {
      goalBenefitMaps: (body.goalBenefitMaps || []).filter((m: { goalId: string }) => m.goalId === focusGoal.id),
      benefitCapabilityMaps: (body.benefitCapabilityMaps || []).filter((m: { benefitId: string; capabilityId: string }) =>
        focusBenefitIds.has(m.benefitId) && focusCapIds.has(m.capabilityId)
      ),
      capabilityEffortMaps: (body.capabilityEffortMaps || []).filter((m: { capabilityId: string; effortId: string }) =>
        focusCapIds.has(m.capabilityId) && focusEffortIds.has(m.effortId)
      ),
    },
  };
}

let userMessage = `Analyseer de volgende DIN-data over alle sectoren heen.\nGebruik de id-velden om items te identificeren in je clusters.\n\n${JSON.stringify(payloadForPrompt, null, 2).slice(0, 20000)}`;
```

De `structuredData` variabele blijft intact voor stap 1-4; alleen `payloadForPrompt` wordt conditioneel versmald. Backward compat dus geborgd.

### Pattern 5: Functional `updateSession` updaters
**What:** Alle session-mutaties via `updateSession(prev => ({...updates}))` — voorkomt race conditions (Phase 2 D-03).
**When to use:** Elke wijziging aan session-state, inclusief `crossAnalyseWizard.stepResults.stap5`.
**Example** (bestaand CrossAnalyseWizard.tsx:116-141) — **niet wijzigen**; `handleStepComplete` werkt al correct voor de nieuwe shape omdat het generiek `result: unknown` accepteert.

### Pattern 6: Client-side filtering, AI kwalitatieve review
**What:** De client bepaalt welke items zichtbaar zijn via pure filtering (`relatedSectors.length > 1`, `responsibleSector.includes(",")`, `goalBenefitMaps.goalId === focusGoal.id`). De AI krijgt dezelfde versmalde payload en levert alleen tekst per id.
**When to use:** Deze specifieke phase. Principe: **AI telt niets, filtert niets, rangschikt niets.**
**Why:** Reproduceerbaarheid + de client heeft de ground truth (geen round-trip nodig voor filter-semantiek).

### Pattern 7: Migration-on-restore via try/catch (D-10)
**What:** Bij sessie-load wordt de DINSession NIET geheel Zod-gevalideerd (zie session-context.tsx:103-126). Validatie gebeurt op gebruiks-niveau. Voor stap5 betekent dit: validatie bij restore in `CrossAnalyseWizard.tsx:98-113`.
**When to use:** Als een schema onbrekend wordt gewijzigd en oude data in localStorage kan staan.
**Example** (nieuw — inline in bestaande useEffect):
```typescript
// CrossAnalyseWizard.tsx:98-113 — vervang de bestaande useEffect-body
useEffect(() => {
  if (!session) return;

  const wizData = session.crossAnalyseWizard;
  if (wizData) {
    // D-10: stap5 schema is breaking changed — valideer bij restore
    let restoredStap5: Stap5Result | undefined = wizData.stepResults?.stap5;
    if (restoredStap5) {
      const parsed = Stap5ResultSchema.safeParse(restoredStap5);
      if (!parsed.success) {
        console.warn("[cross-analyse] stap5 result heeft oude shape, wordt gereset", parsed.error.issues);
        restoredStap5 = undefined;
      } else {
        restoredStap5 = parsed.data;
      }
    }

    setWizardState({
      currentStep: wizData.currentStep || 1,
      completedSteps: new Set(wizData.completedSteps || []),
      stepResults: {
        ...wizData.stepResults,
        stap5: restoredStap5,
      },
    });
  } else if (session.crossAnalyse) {
    setLegacyMode(true);
  }
}, [session?.id]);
```
`Stap5ResultSchema` moet dan geïmporteerd worden uit `@/lib/schemas` in dit bestand.

### Anti-Patterns to Avoid
- **Schema validatie op session-load in `session-context.tsx`:** breekt andere features en voegt een grote refactor toe die niet bij deze phase hoort. Validatie moet lokaal bij de consument (Phase 11 pattern: `stap1-4` worden ook niet globaal gevalideerd). Houd het bij de wizard-restore useEffect.
- **AI inline de client-filter laten reproduceren:** als de AI moet beoordelen welke vermogens "gedeeld" zijn, krijgen we inconsistentie. Client filtert, AI beoordeelt.
- **Extract van de focus-filter naar `din-service.ts` ZONDER concrete hergebruik:** abstractie zonder call-site. Laat 'm inline of als top-level helper bovenaan `StapSectorVertaling.tsx`.
- **Rerun van `findGaps()` / `getDomainBalance()` in de nieuwe view:** deze functies blijven in `din-service.ts` voor andere callers, maar verdwijnen UIT `StapSectorVertaling.tsx` (CONTEXT.md `<code_context>`).
- **Dropdown/toggle voor doel-selectie:** D-01 locked; niet introduceren ook niet "voor later flexibiliteit" — dat is de Deferred Idea.
- **Grote card-based rendering van "buiten scope" items:** D-03 verbiedt dit expliciet — simpele lijst met titels + sector-badges bij uitklap, niets meer.
- **Text-based risk signalling zonder kleur:** D-04/D-05 eisen kleurbadges als visuele mandaat-basis. Omgekeerd: kleur mag niet het enige signaal zijn (accessibility — UI-SPEC verplicht tekst-label in elke badge).
- **Behoud van CHAIN_COLORS-elementen als background colors:** UI-SPEC beperkt accent tot `border-l-4` (10% regel). Geen `bg-[#003366]` fills.
- **`font-medium` (500) gebruiken:** UI-SPEC verbiedt dit expliciet. Alleen 400 (`font-normal`) en 600 (`font-semibold`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Claude API call met JSON validatie + retry | Inline `client.messages.create` + manual JSON.parse + manual retry loop | `callClaudeWithValidation(schema, systemPrompt, userMessage, options)` | Bestaand centraal patroon (ai-client.ts:131-155), 2 silent retries, Zod integratie, error-types geregistreerd |
| JSON extractie uit Claude response | Regex `\{[\s\S]*\}` | `extractJSON(raw)` uit ai-client.ts | Handelt markdown code blocks af (```json```, ```...```), valideert met `JSON.parse` voor return, null-safe |
| Cito blauw / DIN-keten kleuren | Nieuwe constanten introduceren | Bestaande `CHAIN_COLORS` in `StapSectorVertaling.tsx` (lines 20-25) EN `globals.css` tokens (`--color-cito-blue`, `--color-din-doelen`, etc.) | UI-SPEC verplicht deze tokens verbatim. Nieuwe constanten leiden tot drift. |
| Sector badge rendering | Nieuwe `<span className="...">` blocks | `<SectorBadge sector={...} />` uit `@/components/cross-analyse/shared` | UI-SPEC lock; `SECTOR_COLORS` lookup ingebouwd; `px-1.5 py-0.5` padding is codebase-standaard |
| Loading state tijdens AI-call | Nieuwe spinner | `LoadingOverlay` via parent wizard (parent dispatcht al op `isLoading`) | Bestaand in `cross-analyse/shared`; animatie & copy al correct |
| Prompt assembly met programmaboek + KiB context | Handmatig strings concateneren | `assembleSystemPrompt(CROSS_ANALYSE_STAP5_PROMPT, "cross-analyse", undefined, kibContext)` (route.ts:144) | Injecteert programmaboek-context + KiB scope volgens layered architecture (Phase 3/4) |
| Focusdoel selecteren | Ad-hoc `goals.find(g => g.rank === 1)` | `[...session.goals].sort((a,b) => (a.rank ?? 999) - (b.rank ?? 999))[0]` | D-01 locked exact expression; defensive tegen missing rank (legacy); identiek op client en server |
| `responsibleSector` multi-sector detectie | Custom regex | `.includes(",")` (bestaand idioom, StapSectorVertaling.tsx:41) | Codebase-standaard voor "multi-sector effort" |
| Cross-sector capability detectie | Custom lookup | `.relatedSectors && .relatedSectors.length > 1` (bestaand idioom, StapSectorVertaling.tsx:37-39 en CrossAnalyseWizard.tsx:318) | Canonical — dezelfde filter overal |
| Session state updates | `setSession({...session, ...})` direct | `updateSession((prev) => ({ crossAnalyseWizard: {...} }))` | Phase 2 D-03 functional updater pattern; voorkomt race conditions |

**Key insight:** Phase 13 is een **herschikking**, niet een nieuwe capability. Alle bouwstenen bestaan al in gevalideerde vorm. De enige echte ontwerpkeuze zit in de interne component-split van de nieuwe `StapSectorVertaling.tsx` — en zelfs daar legt de UI-SPEC de blokken en volgorde vast.

## Runtime State Inventory

**Not applicable** — Phase 13 is een code-wijziging zonder rename/refactor/migration implicaties voor externe runtime state.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | localStorage `session_{id}`: kan oude `stap5` shape bevatten onder `crossAnalyseWizard.stepResults.stap5` | **Geen migratie — D-10 handelt dit af via try/catch in wizard useEffect**. Geen databank records om te migreren (Supabase is optioneel, schema's kunnen afwijken — niet geforceerd). |
| Live service config | None — verified: geen externe services afhankelijk van `Stap5Result` shape. Claude API is stateless per call; geen config-drift mogelijk. | None |
| OS-registered state | None — verified: browser-only app, geen OS-taken. | None |
| Secrets/env vars | `ANTHROPIC_API_KEY` blijft onveranderd; geen nieuwe secrets nodig. | None |
| Build artifacts | `next.config.ts` default; geen build-time code generatie voor `stap5` shape (programmaboek-context.ts is wél generated maar onafhankelijk van dit schema). Geen compiled binaries die oude shape cachen. | None — `npm run build` na wijziging is voldoende |

**Canonical check:** *Na file-rewrites, welke runtime systemen hebben nog de oude shape?*
- Enige plaats: gebruikers-browsers die vóór deploy een sessie hadden met een `stap5` result. Dit is exact wat D-10 adresseert via de restore-guard in `CrossAnalyseWizard.tsx`. Na één "Analyseer" klik in stap 5 is de nieuwe shape actief.

## Common Pitfalls

### Pitfall 1: Stap5 oude shape blokkeert de hele wizard-useEffect
**What goes wrong:** Als je de D-10 try/catch NIET toevoegt, passeert oude `sectorVertalingen[]` data onder `session.crossAnalyseWizard.stepResults.stap5` gewoon door `setWizardState` en landt in `StapSectorVertaling.tsx`. Daar stort de destructuring van `result.vermogenReview[0].vermogenId` in — runtime error, witte pagina.
**Why it happens:** `session-context.tsx:104` doet geen `DINSessionSchema.safeParse` op load. Phase 11 heeft wel Zod schemas toegevoegd, maar de restore-path in `CrossAnalyseWizard.tsx:98-113` doet ook geen schema validatie per stap-result.
**How to avoid:** Implementeer D-10 exact als in Pattern 7 hierboven. Importeer `Stap5ResultSchema` en `safeParse` bij restore. Warn in console maar silent-reset voor user.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'vermogenId')` in browser console direct na page-load op stap 5.

### Pitfall 2: Client en server bepalen verschillende focusdoelen
**What goes wrong:** Client sorteert `[...session.goals].sort((a,b) => (a.rank ?? 999) - (b.rank ?? 999))[0]`, server sorteert `[...body.goals].sort((a,b) => a.rank - b.rank)[0]`. Als rank ontbreekt (legacy), krijgen ze verschillende eerste doelen.
**Why it happens:** Twee onafhankelijke implementaties.
**How to avoid:** **EXACT dezelfde expressie** in beide bestanden, inclusief de `?? 999` fallback en de spread-kopie. Schrijf 'm als helper-functie als je wilt: `function getFocusGoal<T extends { rank?: number }>(goals: T[]): T | undefined`. D-01 locked de formule.
**Warning signs:** AI-samenvatting spreekt over een ander doel dan wat de UI toont; `focusDoelId` uit AI-response komt niet voor in `session.goals` (Zod passes omdat het gewoon een string is, maar semantisch fout).

### Pitfall 3: `findGaps()` / `getDomainBalance()` import blijft staan maar is dead code
**What goes wrong:** ESLint no-unused-imports faalt de build (of Next.js strict mode waarschuwt).
**Why it happens:** Huidige `StapSectorVertaling.tsx:4` importeert beide functies. Na rewrite zijn ze weg uit de file, maar als je de `import` regel vergeet bij te werken, blijft het hangen.
**How to avoid:** Na rewrite: controleer imports bovenaan. Verwijder `findGaps`, `getDomainBalance`, `DOMAIN_LABELS` (indien niet meer gebruikt), `EffortDomain` type-import (indien niet meer gebruikt). Behoud: `SectorBadge`, `DINSession`, `Stap5Result`.
**Warning signs:** `npm run lint` faalt met `no-unused-vars` of `@typescript-eslint/no-unused-vars`.

### Pitfall 4: UI-SPEC typografie overtreding
**What goes wrong:** Executor gebruikt `font-medium` (500) of `text-xl` omdat die "natuurlijk voelen" — UI-SPEC zegt expliciet nee.
**Why it happens:** Tailwind defaults hebben `font-medium` overal; design muscle memory.
**How to avoid:** Alleen `font-normal` (400) en `font-semibold` (600). Alleen `text-lg` (18), `text-sm` (14), `text-[13px]` (13), `text-[11px]` (11). UI-SPEC Dimension 4 is locked en wordt door `gsd-ui-checker` geverifieerd vóór approval.
**Warning signs:** UI ziet er goed uit maar `gsd-ui-checker` gooit Dimension 4 (Typography) fout tijdens verify.

### Pitfall 5: `@/components/cross-analyse/shared` import path
**What goes wrong:** `import { SectorBadge } from "./shared"` versus `"@/components/cross-analyse/shared"`. Beide werken, maar codebase gebruikt **relative import** (`./shared`) in cross-analyse components (verified: `StapSectorVertaling.tsx:3`, `CrossAnalyseWizard.tsx:20`). Inconsistentie geeft ESLint warnings.
**Why it happens:** Tailwind + Next.js alias beide toegestaan.
**How to avoid:** Gebruik `./shared` in cross-analyse component files, `@/lib/...` voor cross-module imports. Bestaand patroon volgen.
**Warning signs:** Mixed import style in diff review.

### Pitfall 6: AI genereert `breedteOordeel` waarde buiten de enum
**What goes wrong:** Claude produceert `"needs_broadening"` of `"broader"` (Engelse hallucinatie) in plaats van exact `"moet_verbreed"`. Zod faalt, 2 retries, dan error 422.
**Why it happens:** Nederlandse enum-waardes zijn ongebruikelijk in training data.
**How to avoid:** In de prompt (D-08 herschrijving): expliciet `breedteOordeel MOET exact een van: "dekt_volledig", "moet_verbreed", "mist_aspect" zijn.` — idioom volgt Phase 11 STAP2/STAP3/STAP4 prompts (zie prompts.ts:190-191, 223, 250). Ook een voorbeeld JSON met de exacte waarde opnemen.
**Warning signs:** Retryable 422 errors op eerste stap-5-Analyseer-call na deploy.

### Pitfall 7: `stap5Result` uit API-response wordt niet opgeslagen omdat `handleStepComplete` falsey checked
**What goes wrong:** Als AI `vermogenReview: []` teruggeeft (lege array, legaal per `.default([])`), zou een overdreven-defensieve check het als "leeg resultaat" wegfilteren.
**Why it happens:** Huidige `handleStepComplete` (CrossAnalyseWizard.tsx:116-141) accepteert elk `result: unknown` en slaat het op. Geen issue — maar als executor een extra check toevoegt ("result.vermogenReview?.length > 0"), zou die fout gaan.
**How to avoid:** **Niet aanpassen.** `handleStepComplete` werkt generiek. De client-side view rendert lege reviews als "AI had niks te melden over dit item" en valt terug op de neutrale placeholder dot (UI-SPEC Accessibility section).
**Warning signs:** AI-respons krijgt 200 maar UI-callouts verschijnen niet; React DevTools toont `stap5: undefined`.

### Pitfall 8: `responsibleSector.includes(",")` mist whitespace varianten
**What goes wrong:** Een effort heeft `responsibleSector: "PO, VO"` (met spatie) of `"PO,VO"` (zonder) — beide werken voor `.includes(",")`. Maar `"PO;VO"` (semicolon) mist.
**Why it happens:** Codebase-convention is comma-separated; Phase 11 consolidatie schrijft altijd `"PO, VO"`. Andere delimiters zijn geen voorkomend patroon.
**How to avoid:** Blijf bij `.includes(",")` (codebase standaard). Als je extra defensive wilt zijn: geen — voeg geen nieuwe splitters toe zonder aanleiding. **Verified:** grep vindt alleen comma-delimited usage in de codebase.
**Warning signs:** Een effort met `responsibleSector: "PO & VO"` verschijnt niet in shared — maar dit is een data-integriteit issue, niet een Phase 13 bug.

## Code Examples

Verified patterns from the codebase:

### Example 1: New Stap5ResultSchema (schemas.ts replacement for lines 430-444)
```typescript
// src/lib/schemas.ts — vervangen
export const Stap5ResultSchema = z.object({
  focusDoelId: z.string(),
  focusDoelNaam: z.string(),
  vermogenReview: z.array(z.object({
    vermogenId: z.string(),
    hefboomAnalyse: z.string(),
    suggestieAanscherping: z.string().optional(),
  })).default([]),
  inspanningReview: z.array(z.object({
    inspanningId: z.string(),
    breedteOordeel: z.enum(["dekt_volledig", "moet_verbreed", "mist_aspect"]),
    toelichting: z.string(),
    suggestieVerbreding: z.string().optional(),
  })).default([]),
  batenDekking: z.array(z.object({
    baatId: z.string(),
    sector: z.string(),
    wordtGeraakt: z.boolean(),
    redenering: z.string(),
    risico: z.string().optional(),
  })).default([]),
  samenvatting: z.string(),
});
```
`types.ts` re-export (line 47) vangt automatisch. Geen `types.ts` wijziging.

### Example 2: New CROSS_ANALYSE_STAP5_PROMPT (prompts.ts replacement for lines 253-284)
```typescript
// src/lib/prompts.ts — vervangen
export const CROSS_ANALYSE_STAP5_PROMPT = `Je bent een expert in programmamanagement (DIN-methodiek, Werken aan Programma's, Hfst 8 — Hefboomwerking).

Je krijgt het EERSTE DOEL (focusdoel) met:
- de baten die eraan gekoppeld zijn, per sector
- de GECONSOLIDEERDE cross-sector vermogens die hefboom moeten leveren op die baten
- de GEDEELDE inspanningen die die vermogens opbouwen

Je taak is KWALITATIEF beoordelen — niet tellen, niet rangschikken, niet filteren. De client heeft de items al geselecteerd.

Beoordeel:

1. HEFBOOMWERKING PER VERMOGEN
   Voor elk vermogen: welke baten (in welke sectoren) raakt dit vermogen en WAAROM levert cross-sector consolidatie hefboom op?
   Optioneel: een korte aanscherpings-suggestie voor de formulering.

2. BREEDTE VAN INSPANNINGEN
   Omdat de vermogens nu cross-sector zijn, moeten inspanningen mogelijk BREDER worden geformuleerd.
   Per inspanning:
   - "dekt_volledig" -> inspanning past al bij het gedeelde vermogen
   - "moet_verbreed" -> inspanning dekt maar een deel; geef concrete herformulering
   - "mist_aspect" -> er ontbreekt een relevant aspect; benoem welk aspect
   Geef altijd een toelichting; bij "moet_verbreed" en "mist_aspect" een suggestieVerbreding.

3. BATEN-DEKKING (kritisch — stakeholder-mandaat)
   Loop elke baat onder het focusdoel langs.
   - wordtGeraakt: true als de huidige cross-sector vermogens en inspanningen deze baat daadwerkelijk realiseren
   - wordtGeraakt: false als er een MISMATCH is — deze baat dreigt buiten schot te raken
   Geef altijd een redenering. Bij false: een concrete risico-tekst ("wat missen we als het zo blijft").

4. SAMENVATTING
   3-5 zinnen die vastleggen: welke hefbomen trekken we, waar zit het risico, waarom gaat dit het focusdoel realiseren.

Antwoord ALLEEN als JSON-object met EXACT deze structuur:
{
  "focusDoelId": "uuid-van-doel",
  "focusDoelNaam": "Naam van het focusdoel",
  "vermogenReview": [
    {
      "vermogenId": "uuid",
      "hefboomAnalyse": "Concrete analyse over welke baten dit vermogen raakt en waarom consolidatie hefboom geeft.",
      "suggestieAanscherping": "Optionele herformulering"
    }
  ],
  "inspanningReview": [
    {
      "inspanningId": "uuid",
      "breedteOordeel": "dekt_volledig",
      "toelichting": "Waarom dit oordeel",
      "suggestieVerbreding": "Concrete bredere herformulering (alleen bij moet_verbreed of mist_aspect)"
    }
  ],
  "batenDekking": [
    {
      "baatId": "uuid",
      "sector": "PO",
      "wordtGeraakt": true,
      "redenering": "Waarom wel/niet",
      "risico": "Alleen bij wordtGeraakt=false: wat verliezen we"
    }
  ],
  "samenvatting": "3-5 zinnen over de kern van de cross-sector hefboomwerking voor dit focusdoel."
}

breedteOordeel MOET exact een van: "dekt_volledig", "moet_verbreed", "mist_aspect" zijn.
Gebruik de werkelijke id-velden uit de data. Verwijs nooit naar doelen, baten, vermogens of inspanningen die niet in de input staan.
BELANGRIJK: Antwoord in het Nederlands.`;
```

### Example 3: API-route stap 5 branch narrowing
See Pattern 4 above. Key insight: introduce `payloadForPrompt` local variable; only reassign for `stap === 5`; serialize `payloadForPrompt` into `userMessage` instead of `structuredData`.

### Example 4: Focus helper (top of StapSectorVertaling.tsx)
```typescript
// src/components/cross-analyse/StapSectorVertaling.tsx
import { useState } from "react";
import { SectorBadge } from "./shared";
import type { DINSession, Stap5Result, DINBenefit, DINCapability, DINEffort } from "@/lib/types";

interface StapSectorVertalingProps {
  session: DINSession;
  result?: Stap5Result;
}

const CHAIN_COLORS = {
  doelen: "border-l-[#003366]",
  baten: "border-l-[#0066cc]",
  vermogens: "border-l-[#0891b2]",
  inspanningen: "border-l-[#059669]",
} as const;

// D-01 — EXACT dezelfde expressie als in route.ts
function getFocusGoal(goals: DINSession["goals"]): DINSession["goals"][number] | undefined {
  if (goals.length === 0) return undefined;
  return [...goals].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))[0];
}

function computeFocusView(session: DINSession) {
  const focusGoal = getFocusGoal(session.goals);
  if (!focusGoal) return null;

  const focusBenefitIds = new Set(
    session.goalBenefitMaps.filter((m) => m.goalId === focusGoal.id).map((m) => m.benefitId)
  );
  const focusBenefits = session.benefits.filter((b) => focusBenefitIds.has(b.id));

  const activeCaps = session.capabilities.filter((c) => !c.consolidated);
  const sharedCaps = activeCaps.filter((c) => (c.relatedSectors?.length ?? 0) > 1);
  const focusCapIds = new Set(
    session.benefitCapabilityMaps
      .filter((m) => focusBenefitIds.has(m.benefitId) && sharedCaps.some((c) => c.id === m.capabilityId))
      .map((m) => m.capabilityId)
  );
  const focusCaps = sharedCaps.filter((c) => focusCapIds.has(c.id));

  const activeEfforts = session.efforts.filter((e) => !e.consolidated);
  const sharedEfforts = activeEfforts.filter((e) => e.responsibleSector?.includes(","));
  const focusEffortIds = new Set(
    session.capabilityEffortMaps
      .filter((m) => focusCapIds.has(m.capabilityId) && sharedEfforts.some((e) => e.id === m.effortId))
      .map((m) => m.effortId)
  );
  const focusEfforts = sharedEfforts.filter((e) => focusEffortIds.has(e.id));

  // Buiten scope: active items die NIET in de focus-scope vallen
  const outOfScopeCaps = activeCaps.filter((c) => !focusCapIds.has(c.id));
  const outOfScopeEfforts = activeEfforts.filter((e) => !focusEffortIds.has(e.id));

  return { focusGoal, focusBenefits, focusCaps, focusEfforts, outOfScopeCaps, outOfScopeEfforts };
}
```

This is a **pure function**, separately testable, and can also be shared with the API-route if desired (currently Pattern 4 inlines it server-side for isolation; re-exporting from `din-service.ts` is an optional Wave 1 refinement if executor prefers single source).

### Example 5: SectorBadge per-baat group
```typescript
// Binnen StapSectorVertaling.tsx — BatenPerSectorGroup
const batenGroupedBySector = (["PO", "VO", "Zakelijk"] as const).map((sectorKey) => ({
  sector: sectorKey,
  baten: focusBenefits.filter((b) => b.sectorId === sectorKey),
}));

// Render:
{batenGroupedBySector.map(({ sector, baten }) => (
  <div key={sector} className="space-y-2">
    <div className="flex items-center gap-2">
      <SectorBadge sector={sector} />
      <span className="text-[11px] font-semibold text-gray-500">
        {baten.length} {baten.length === 1 ? "baat" : "baten"}
      </span>
    </div>
    {baten.map((baat) => {
      const dekking = result?.batenDekking.find((d) => d.baatId === baat.id);
      const wordtGeraakt = dekking?.wordtGeraakt;
      return (
        <div key={baat.id} className={`border-l-4 ${CHAIN_COLORS.baten} pl-3 pr-3 py-2`}>
          <div className="flex items-start justify-between gap-2">
            <span className="text-[13px] text-gray-700 flex-1">{baat.title || baat.description}</span>
            {dekking ? (
              wordtGeraakt ? (
                <span className="text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5">
                  geraakt
                </span>
              ) : (
                <span className="text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 rounded px-1.5 py-0.5">
                  risico
                </span>
              )
            ) : (
              <span className="w-2 h-2 rounded-full bg-gray-300" aria-label="Wachten op AI-analyse" />
            )}
          </div>
          {dekking && !wordtGeraakt && dekking.risico && (
            <p className="text-[13px] text-red-700 mt-1">
              <span className="font-semibold">Risico: </span>{dekking.risico}
            </p>
          )}
        </div>
      );
    })}
  </div>
))}
```
Reference: UI-SPEC "Semantic badge palette" table + "Copywriting Contract" (risico prefix) + "Accessibility" (aria-label on placeholder dot).

### Example 6: Buiten-scope collapsible footer
```typescript
const [buitenScopeOpen, setBuitenScopeOpen] = useState(false);
// ...
<div className="mt-12">
  <button
    onClick={() => setBuitenScopeOpen((v) => !v)}
    className="w-full min-h-[44px] flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-left hover:bg-gray-100 transition-colors"
    aria-expanded={buitenScopeOpen}
  >
    <span className="text-[13px] text-gray-700">
      <span className="font-semibold">Buiten scope voor nu</span> — {outOfScopeCaps.length} vermogens en {outOfScopeEfforts.length} inspanningen
    </span>
    <span className="text-[11px] font-semibold text-gray-500">
      {buitenScopeOpen ? "Verberg details" : "Toon details"}
    </span>
  </button>
  {buitenScopeOpen && (
    <div className="mt-3 px-4 py-3 bg-white border border-gray-200 rounded-lg space-y-3">
      <p className="text-[13px] text-gray-600">
        Deze items zijn niet geconsolideerd tot cross-sector hefbomen voor dit doel. Ze blijven beschikbaar voor latere doelen of vervolgstappen.
      </p>
      {outOfScopeCaps.length > 0 && (
        <div>
          <h5 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Vermogens</h5>
          <ul className="space-y-1">
            {outOfScopeCaps.map((c) => (
              <li key={c.id} className="text-[13px] text-gray-700 flex items-center gap-2">
                <span className="flex-1">{c.title || c.description}</span>
                {c.sectorId && <SectorBadge sector={c.sectorId} />}
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* idem voor outOfScopeEfforts */}
    </div>
  )}
</div>
```
Reference: D-03 (alleen tellingen + simpele lijst met titel + sector-badges, geen AI-review per item) + UI-SPEC Copywriting Contract (exacte copy).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stap 5 toont volledig DIN-netwerk + domeinbalans + gap-analyse | Stap 5 toont alleen het focusdoel + cross-sector hefbomen + AI-review | Phase 13 (nu) | Kernbericht wordt zichtbaar; overige data verhuist (domeinbalans/gaps blijven in `din-service.ts` voor future use) |
| `sectorVertalingen[]` AI response shape | `vermogenReview[] + inspanningReview[] + batenDekking[] + samenvatting` | Phase 13 | AI levert id-gekoppelde kwalitatieve review in plaats van per-sector statistiek |
| Cross-analyse = single large prompt | 5 stap-specifieke prompts + stap-parameter in route | Phase 11 (2026-04-04) | Modulariteit; cumulatieve context tussen stappen; Phase 13 bouwt hier op voort |
| Dutch tokenization = simple regex | Snowball stemmer + compound splitting | Phase 7 | Indirect — Phase 13 consumeert `relatedSectors` dat door deze matching gezet wordt |
| AI response = freeform text + regex parse | Zod schema + `callClaudeWithValidation` + silent retries | Phase 1 | Phase 13 volgt dit patroon voor de nieuwe stap5 shape |

**Deprecated/outdated:**
- Oude `Stap5ResultSchema` met `sectorVertalingen[]`, `dinKeten`, `domeinBalans`, `gaps`, `totaalSamenvatting` — verdwijnt in Phase 13.
- `STEP_INFO[5].title = "Nieuw DIN-netwerk"` — wordt `"Prioriteitsview — eerste doel"` (D-11).
- Apply-buttons voor AI-suggesties in stap 5 — niet gebouwd, niet gebouwd worden (Deferred).

## Open Questions

1. **Moet de `getFocusGoal` helper gedeeld worden tussen client en server?**
   - What we know: D-01 vereist identieke expressie op beide plekken. Codebase heeft geen `lib/shared-helpers.ts` patroon voor client+server sharing.
   - What's unclear: Of executor de helper in `din-service.ts` zet (importeerbaar vanuit zowel `StapSectorVertaling.tsx` als `route.ts`) of als inline expression duplicate houdt.
   - Recommendation: **Inline de expressie in beide files.** De uitdrukking is 1 regel, de coupling is klein, en gedeelde helpers via `din-service.ts` dwingen server-side imports die build-size beïnvloeden. Als dupliceren voelt vies: markeer beide met een comment `// D-01 — houd identiek aan {other file}`. Dit is executor's discretion en NIET blocking.

2. **Empty state C (data maar geen AI-resultaat) kan conflicteren met wizard-owned "Analyseer" button — wie toont de call-to-action?**
   - What we know: UI-SPEC zegt "Primary CTA (parent-owned, referenced)" — `CrossAnalyseWizard.tsx` eigent de button. Maar huidige wizard toont de Analyseer-knop alleen voor `currentStep <= 4` (line 437 condition). Voor stap 5 ontbreekt de knop.
   - What's unclear: Moet `CrossAnalyseWizard.tsx` line 437 worden gewijzigd om ook stap 5 te includeren? Of moet `StapSectorVertaling.tsx` zelf een lokale "Analyseer" knop renderen?
   - Recommendation: **Wijzig `CrossAnalyseWizard.tsx:437` van `currentStep <= 4` naar `currentStep <= 5`**. Dat is de minst invasieve oplossing, volgt het bestaande patroon (optionele context textarea + StepAnalyseButton), en alignt met UI-SPEC "parent-owned CTA". Pas `STEP_INFO[5]` aan met `placeholder`, `analyseLabel`, `loadingTitle`, `loadingDescription` (zijn nu allemaal `""`). **Dit is een kleine wijziging in `CrossAnalyseWizard.tsx` die bovenop D-11 komt** — executor moet dit in de plan opnemen. MEDIUM confidence: plan-artefact noemt het niet expliciet maar context impliceert het.

3. **Moet `assembleSystemPrompt` een nieuwe `useCase` krijgen voor stap-5 specifiek?**
   - What we know: huidige call gebruikt `"cross-analyse"` useCase (route.ts:144). `ProgrammaboekUseCase` types in `prompt-assembly.ts` bevatten `"cross-analyse"` maar geen stap-specifieke varianten.
   - What's unclear: Of de nieuwe Stap5-prompt baat heeft bij een specifieker programmaboek-context-blok (bijv. alleen Hfst 8 hefboomwerking).
   - Recommendation: **Nee — gebruik bestaand `"cross-analyse"` useCase.** De programmaboek-context is al token-capped; een nieuwe useCase vereist Phase 3 code generator aanpassingen (`scripts/build-programmaboek-context.ts`). Dat is scope creep. Als hefboomwerking te weinig prominent in de context komt, kan dat in een follow-up phase worden verfijnd. LOW priority.

4. **Wat als er meer dan 3 sectoren bestaan (toekomstuitbreiding)?**
   - What we know: `SECTORS = ["PO", "VO", "Zakelijk"] as const` is gelockt in types.ts:64. UI-SPEC groepert expliciet per die drie.
   - What's unclear: Niets — deze phase doet geen uitbreiding.
   - Recommendation: **Hard-code `["PO", "VO", "Zakelijk"] as const` in de BatenPerSectorGroup render loop**, NIET via dynamisch `Object.keys(...)`. Dit maakt future-refactoring expliciet. Geen actie nodig.

5. **Kan de versmalde structuredData-logica DRY met de client-filter?**
   - What we know: `computeFocusView` (client) en de route's stap-5-narrowing doen functioneel hetzelfde werk.
   - What's unclear: Of de duplicatie een onderhouds-risico is.
   - Recommendation: **Accepteer de duplicatie voor nu.** Server heeft `body.goals` (plain objects), client heeft `session` (typed). De types zijn compatible maar de call-sites zijn verschillend genoeg dat een shared function forse generics vraagt. Als er ooit een derde caller komt, extract 'm dan. Voor Phase 13: twee inline implementaties zijn acceptabel. LOW risk.

## Environment Availability

**Not applicable** — Phase 13 introduceert geen nieuwe externe dependencies, services, runtimes, of tools. Alle benodigde infrastructure is reeds aanwezig:

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | All Next.js operations | Aanwezig (inferred from working package.json) | N/A checked | — |
| `ANTHROPIC_API_KEY` env var | API route Claude call | User-managed, al geconfigureerd (Phase 1+) | — | Route returnt `{ success: true, data: { analysis: null, message: "niet geconfigureerd" }}` als missing — bestaand gedrag (route.ts:67-72) |
| Claude Opus 4.6 model | `callClaudeWithValidation` | Anthropic API | via SDK 0.78.0 | Sonnet fallback (bestaand patroon) indien Opus niet beschikbaar — voorlopig niet nodig |

**Skip reason:** Phase 13 is pure code refactor met hergebruik van bestaande infra.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` (include: `src/**/*.test.ts`) |
| Quick run command | `npx vitest run src/lib/__tests__/stap5-focus-filter.test.ts` (na Wave 0) |
| Full suite command | `npx vitest run` |
| Lint command | `npm run lint` |
| Build command | `npm run build` |
| Type-check | via `npm run build` (Next.js compiles strict TS) |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R-CROSS-01 | Cross-sector baten-herkenning via `relatedSectors.length > 1` filter werkt deterministisch op focus-view input | unit (pure function) | `npx vitest run src/lib/__tests__/stap5-focus-filter.test.ts` | Wave 0 |
| R-CROSS-02 | Gedeelde vermogens filter selecteert alleen multi-sector capabilities die via `benefitCapabilityMaps` aan focusdoel-baten hangen | unit | idem | Wave 0 |
| D-01 | `getFocusGoal(goals)` sorteert op rank, fallback op eerste item bij ontbrekende rank | unit | `npx vitest run src/lib/__tests__/stap5-focus-filter.test.ts -t "focusGoal"` | Wave 0 |
| D-05 / D-07 | `Stap5ResultSchema.safeParse` accepteert valid response en rejecteert oude `sectorVertalingen[]` shape | unit | `npx vitest run src/lib/__tests__/schemas-stap5.test.ts` | Wave 0 |
| D-09 | API-route versmalt structuredData alleen voor `stap === 5` | integration-manual | Handmatige curl / UAT — geen API-route unit tests in codebase (pattern: manual UAT via `npm run dev`) | — |
| D-10 | Stap5 restore guard reset oude shape naar `undefined` | unit (pure function) | `npx vitest run src/lib/__tests__/stap5-restore-guard.test.ts` | Wave 0 |
| D-12 | Empty states renderen correct bij (a) geen doelen, (b) geen cross-sector vermogens, (c) geen AI-resultaat | component-manual | Handmatige UAT — codebase gebruikt geen React Testing Library (verified: `@testing-library/*` NIET in devDependencies) | — |
| D-06 | Baten per sector met kleurbadges zichtbaar | visual-manual | UAT via `npm run dev` | — |
| AI contract | `breedteOordeel` altijd een van 3 enum values | runtime | `Stap5ResultSchema.safeParse` in `callClaudeWithValidation` — silent 2-retry, dan 422 | — |

### Sampling Rate
- **Per task commit:** `npm run lint && npm run build` (altijd) + `npx vitest run src/lib/__tests__/stap5-*.test.ts` (waar relevant)
- **Per wave merge:** `npx vitest run` (full vitest suite) + `npm run build`
- **Phase gate:** Full suite green + `npm run build` green + handmatige UAT checklist uit plan-artefact §Verificatie

### Wave 0 Gaps
- [ ] `src/lib/__tests__/stap5-focus-filter.test.ts` — unit tests voor `getFocusGoal()` en `computeFocusView()` (indien deze helpers als pure functions uit `StapSectorVertaling.tsx` worden geëxtraheerd naar `din-service.ts` of een nieuw `src/lib/stap5-focus.ts` bestand). **Dit is Wave 0 alleen als executor voor extraction kiest** — de CONTEXT.md discretion clause staat inline ook toe. Als inline: dit test-bestand vervalt, en validatie gebeurt via build+lint+UAT.
- [ ] `src/lib/__tests__/schemas-stap5.test.ts` — verifieert dat `Stap5ResultSchema.safeParse` een valid payload accepteert én de oude `sectorVertalingen[]` shape afwijst. Klein maar waardevol voor D-10 regressie-preventie.
- [ ] `src/lib/__tests__/stap5-restore-guard.test.ts` — optioneel als `CrossAnalyseWizard.tsx` useEffect logic wordt geëxtraheerd naar een pure function `restoreWizardState(session)`. Zo niet: gedekt door manual UAT met een sessie die oude stap5 shape in localStorage heeft.

**Fallback if no extraction:** Alleen `schemas-stap5.test.ts` als Wave 0 verplicht. Andere validatie via `npm run build` (type-check vangt 95% van de fouten) + handmatige UAT checklist.

**No framework install needed:** Vitest 4.1.2 al aanwezig in `devDependencies`.

## Sources

### Primary (HIGH confidence — directly verified in codebase)
- `src/lib/schemas.ts` — huidige `Stap5ResultSchema` (lines 430-444), `z.infer<>` re-export patroon (lines 795-820), `DINSessionSchema` zonder Zod-validatie bij load (line 462)
- `src/lib/prompts.ts` — huidige `CROSS_ANALYSE_STAP5_PROMPT` (lines 253-284), enum-constraint idioom in andere stap-prompts (lines 190-191, 223, 250)
- `src/app/api/cross-analyse/route.ts` — per-stap branch structuur (lines 23-32, 122-160), `assembleSystemPrompt` integration (line 144), `callClaudeWithValidation` options (line 146: `maxTokens: 16384, model: "claude-opus-4-6"`)
- `src/components/cross-analyse/StapSectorVertaling.tsx` — huidige `findGaps` / `getDomainBalance` usage (lines 56-72), `CHAIN_COLORS` constant (lines 20-25), `findSharedCapabilities` filter (lines 37-42, 318 — verified identiek aan wizard)
- `src/components/cross-analyse/CrossAnalyseWizard.tsx` — `STEP_INFO` map (lines 35-83), `handleAnalyse` / `handleStepComplete` flow (lines 116-215), restore useEffect gap (lines 98-113), CTA-button conditie op `currentStep <= 4` (line 437 — MEDIUM: moet naar `<= 5` voor stap 5)
- `src/lib/session-context.tsx` — `loadSession` zonder DINSessionSchema validatie (lines 103-126), `updateSession` functional updater (line 161), `migrateSectorAnalyses` als precedent voor restore-migration
- `src/lib/ai-client.ts` — `callClaudeWithValidation` centraal patroon (lines 131-155), `extractJSON` markdown-safe parser (lines 62-86)
- `src/lib/din-service.ts` — `findSharedCapabilities` (line 175), `getDomainBalance` (line 199), `findGaps` (line 210); gerelateerde helpers die IN `din-service.ts` blijven maar UIT `StapSectorVertaling.tsx` verdwijnen
- `src/lib/types.ts` — `SECTORS`, `SECTOR_COLORS`, `DOMAIN_LABELS` constanten (lines 64-80); Stap5Result re-export (line 47)
- `src/components/cross-analyse/shared/SectorBadge.tsx` — exacte padding `px-1.5 py-0.5`, text size `text-[10px]`, `SECTOR_COLORS` lookup
- `package.json` — versions verified: next 16.1.0, react 19.1.0, typescript 5.8.0, vitest 4.1.2, @anthropic-ai/sdk 0.78.0, tailwindcss 4.1.0
- `vitest.config.ts` — include glob `src/**/*.test.ts`, `@` alias
- `.planning/phases/13-.../13-UI-SPEC.md` — design-contract (approved, checker signed off)
- `.planning/phases/13-.../13-CONTEXT.md` — user decisions D-01 tot D-12
- `~/.claude/plans/twinkling-puzzling-hennessy.md` — plan-artefact met exacte schema + prompt + API-route + UI structuur
- `CLAUDE.md` — project constraints (Nederlands, Cito branding, verificatie-protocol, methodiek-binding, UX-output, skills)
- `.planning/STATE.md` — Phase 11 / 12 completion bevestigt dat consolidatie-flags en per-stap wizard al production-ready zijn
- `.planning/REQUIREMENTS.md` — R-CROSS-01, R-CROSS-02 reeds "complete" in Phase 8

### Secondary (MEDIUM confidence — architecturele conclusies afgeleid uit codebase)
- Observatie: `session-context.tsx` valideert alleen `sectorAnalyses` bij load, NIET `crossAnalyseWizard` — dit dwingt D-10 implementatie naar `CrossAnalyseWizard.tsx:useEffect` (Pitfall 1)
- Observatie: `STEP_INFO[5]` heeft lege strings voor analyseLabel/placeholder — `CrossAnalyseWizard.tsx:437` condition `currentStep <= 4` impliceert dat stap 5 historisch geen AI-trigger had. Phase 13 keert dat om (Open Question 2)
- Observatie: Phase 11 Plan 04 voegde al `readOnly` prop patroon toe (state notes); stap 5 past in read-only category

### Tertiary (LOW confidence — needs validation during execution)
- Assumption: Claude Opus 4.6 handelt `z.enum(["dekt_volledig", "moet_verbreed", "mist_aspect"])` consistent zonder Engelse hallucinatie wanneer de prompt expliciete voorbeelden bevat. **Mitigatie:** `callClaudeWithValidation` doet 2 silent retries — als eerste run faalt, tweede slaagt meestal. Als beide falen: 422 response met retryable flag (bestaand handling in frontend).
- Assumption: Het versmalde `payloadForPrompt` past binnen de 20000 char `.slice()` van `userMessage` (route.ts:134). Voor een realistische sessie (1 focusdoel, 5-10 baten, 3-5 cross-sector vermogens, 5-10 shared efforts) is de JSON <2000 chars — ruim binnen budget. **Niet verifiëren tenzij productie data anders uitwijst.**
- Assumption: De UI-SPEC pre-AI placeholder dot (`aria-label="Wachten op AI-analyse"`) is screen-reader geverifieerd door de ui-checker. **Overgenomen uit UI-SPEC approved status.**

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — alle versies en imports directe grep-verified in package.json en source files
- Architecture patterns: **HIGH** — elk pattern heeft expliciete code-referentie in de codebase
- Don't hand-roll list: **HIGH** — elke "don't" verwijst naar een bestaand helper dat al in use is
- Runtime state: **HIGH** — localStorage is de enige persistence laag; D-10 adresseert de one-time migration correct
- Pitfalls: **HIGH** (1, 3, 5, 8), **MEDIUM** (2, 4, 7), **LOW** (6 — Claude gedrag is per definitie probabilistisch)
- Code examples: **HIGH** — elk example komt uit of matcht exact bestaande patterns
- Validation architecture: **MEDIUM** — test strategy is pragmatic want codebase heeft geen React Testing Library; manual UAT is het bestaande pattern voor component-level verificatie
- Open questions: **MEDIUM** — Open Question 2 (CTA-button condition) is waarschijnlijk een kleine extra wijziging die de plan-artefact niet expliciet noemt; executor moet dit identificeren tijdens planning

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (30 days — stack is stable, geen fast-moving libraries)

**Not investigated (intentionally out of scope):**
- Supabase sync gedrag voor `crossAnalyseWizard.stepResults.stap5` (single-user app per out-of-scope in REQUIREMENTS.md)
- E2E browser tests (geen Playwright / Cypress in codebase)
- Accessibility audit tooling (geen axe-core in devDependencies; UI-SPEC a11y contract is de primaire bron)
- Performance metrics voor de focus-filter berekening (O(n) op kleine collecties — triviaal)

---

*Research complete. Planner can proceed.*
