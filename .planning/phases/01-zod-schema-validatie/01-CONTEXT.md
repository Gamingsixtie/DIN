# Phase 1: Zod Schema Validatie - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

AI responses en externe input (KiB import, sectorplan parsing) worden gevalideerd met Zod schemas voordat ze worden opgeslagen. Fragiele regex-parsing (`result.match(/\{[\s\S]*\}/)` + `JSON.parse`) wordt vervangen door getypeerde Zod validatie met duidelijke foutafhandeling.

</domain>

<decisions>
## Implementation Decisions

### Foutafhandeling
- **D-01:** Bij een ongeldige AI response worden automatisch 2 stille retries uitgevoerd. De gebruiker merkt alleen vertraging.
- **D-02:** Na 2 mislukte retries krijgt de gebruiker een foutmelding met context over wat er mis ging (bijv. "AI gaf geen geldige baten terug").
- **D-03:** In de foutmelding verschijnt een tekstveld waarmee de gebruiker extra instructies kan meegeven aan de AI-prompt voor een nieuwe poging.
- **D-04:** Er wordt nooit data opgeslagen die niet door het Zod schema komt — geen stille corruptie.

### Validatiescope
- **D-05:** Alle 7 AI endpoints krijgen tegelijk Zod validatie: din-mapping, din-suggest, cross-analyse, analyze-sectorplan, export, import-kib, parse-sector.
- **D-06:** Niet-AI parsing (KiB JSON import, sectorplan upload) wordt ook via Zod gevalideerd. Alle externe input is consistent gevalideerd.

### Bestaande data
- **D-07:** Bestaande sessies in localStorage worden niet gemigreerd. Data wordt gevalideerd bij gebruik (openen/bewerken).
- **D-08:** Ongeldige of ontbrekende velden in bestaande data krijgen stille defaults via Zod `.default()` — geen meldingen aan de gebruiker.

### Schema-strategie
- **D-09:** Zod schemas worden de single source of truth. TypeScript types worden afgeleid via `z.infer<>`. De bestaande `types.ts` wordt herschreven zodat types uit schemas komen.
- **D-10:** Alle schemas leven centraal in `src/lib/schemas.ts` — één bestand, herbruikbaar door alle endpoints en componenten.

### Claude's Discretion
- Nesting en structuur van schemas binnen `schemas.ts` (hoe granulair, welke sub-schemas)
- Keuze van Zod features (`.transform()`, `.refine()`, `.catch()`) per situatie
- Exacte foutmeldingen per endpoint (binnen het kader: "met context, niet technisch")

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bestaande code (te refactoren)
- `src/lib/ai-client.ts` — Alle AI wrapper functies, `callClaude()` retourneert raw strings
- `src/lib/types.ts` — Bestaande TypeScript types die vervangen worden door Zod-afgeleide types
- `src/app/api/din-mapping/route.ts` — Voorbeeld van fragiele JSON parsing (regex + JSON.parse)
- `src/app/api/din-suggest/route.ts` — AI suggest endpoint
- `src/app/api/cross-analyse/route.ts` — Cross-analyse endpoint
- `src/app/api/analyze-sectorplan/route.ts` — Sectorplan analyse endpoint
- `src/app/api/export/route.ts` — Export endpoint
- `src/app/api/import-kib/route.ts` — KiB import endpoint
- `src/app/api/parse-sector/route.ts` — Sectorplan parsing endpoint
- `src/lib/kib-import.ts` — KiB JSON parsing logica

### Methodiek
- `docs/programmaboek.doc` — DIN-methodiek definities (batenprofielen, vermogens, inspanningsdomeinen)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/types.ts` — Bevat alle DIN types (DINBenefit, DINCapability, DINEffort, DINSession). Wordt herschreven maar de structuur is de basis voor Zod schemas.
- `src/lib/ai-client.ts` — `callClaude()` functie kan uitgebreid worden met een schema parameter voor gevalideerde responses.
- `src/lib/prompts.ts` — AI prompts die al JSON-structuur vragen. Schemas moeten aansluiten bij deze gevraagde structuur.

### Established Patterns
- **API routes**: Try-catch met `NextResponse.json({ success, error?, data? })` response pattern
- **AI response parsing**: `result.match(/\{[\s\S]*\}/)` + `JSON.parse` — dit is precies wat vervangen wordt
- **Error handling**: `error instanceof Error ? error.message : "Fallback"` patroon
- **localStorage persistence**: `loadLocal()`/`saveLocal()` in `persistence.ts`

### Integration Points
- Alle API routes in `src/app/api/` importeren uit `ai-client.ts` — centraal punt voor validatie
- Components die AI aanroepen: `DINCreatieWizard.tsx`, `BenefitCard.tsx`, `DINMappingStep.tsx`, `CrossAnalyseStep.tsx`, `SectorIntegratieStep.tsx`
- `session-context.tsx` slaat data op via `persistence.ts` — validatie moet hier plaatsvinden voor bestaande data

</code_context>

<specifics>
## Specific Ideas

- Gebruiker wil na een validatiefout extra instructies kunnen meegeven via een tekstveld in de foutmelding — niet alleen "opnieuw proberen" maar actief de prompt verbeteren
- Foutmeldingen moeten context bevatten ("AI gaf geen geldige baten terug") maar niet technisch zijn — de gebruiker is een programmamanager

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-zod-schema-validatie*
*Context gathered: 2026-03-30*
