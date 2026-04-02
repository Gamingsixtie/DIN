# Phase 6: Cyclisch Doel-voor-Doel Werken - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Gebruiker kan een doel volledig door het DIN-netwerk uitwerken voordat het volgende begint. De DIN-mapping stap wordt omgebouwd van vrij schakelen naar cyclisch werken met zachte begeleiding, voortgangsindicatie per doel, en context-meegave aan de AI om duplicatie te voorkomen. Alle doelen blijven toegankelijk, maar het systeem stuurt actief naar sequentieel afwerken.

</domain>

<decisions>
## Implementation Decisions

### Progressiemodel
- **D-01:** Zachte begeleiding — alle doelen blijven toegankelijk in de sidebar. Het actieve doel is visueel gemarkeerd. Na het afronden van een doel wordt het volgende doel automatisch voorgesteld (sidebar springt naar volgend niet-afgerond doel).
- **D-02:** Een expliciete "Doel afronden"-knop wordt getoond bij het actieve doel. Geen waarschuwingsdialoog bij switchen naar andere doelen — gebruiker is vrij om te navigeren.

### Compleetheid-definitie
- **D-03:** Een doel is "volledig uitgewerkt" als het in ELKE sector (PO, VO, Zakelijk) een volledige DIN-keten heeft: minstens 1 baat → 1 vermogen → 1 inspanning, met de koppelingen via goalBenefitMap, benefitCapabilityMap, capabilityEffortMap.
- **D-04:** De "Doel afronden"-knop is NIET beschikbaar als de keten niet compleet is in alle sectoren. De knop toont wat er nog ontbreekt (bijv. "VO: mist inspanningen").
- **D-05:** Afgeronde doelen worden gemarkeerd in de sessie-state (nieuw veld op DINSession, bijv. `completedGoals: string[]` met goal IDs).

### Context-meegave bij volgend doel (CYCL-02)
- **D-06:** Bij het uitwerken van een volgend doel krijgt de AI de volledige items (baten met profielen, vermogens met profielen, inspanningen met dossiers) van alle eerder afgeronde doelen als context mee.
- **D-07:** Automatische prompt-budget cap: volledige profielen tot ~2000 tokens. Bij overschrijding terugvallen op titels + beschrijvingen + deduplicatie-instructie. Consistent met Phase 5 buildSectorwerkBlock (capped at 1500 chars).
- **D-08:** De context wordt als apart blok in de system prompt geplaatst, na sectorwerk-context. Past bij het bestaande prompt-assembly patroon (programmaboek → KiB → sectorwerk → eerder-uitgewerkte-doelen).
- **D-09:** Expliciete deduplicatie-instructie in de prompt: "Vermijd overlap met bestaande items. Genereer aanvullende, unieke baten/vermogens/inspanningen voor dit doel."

### Voortgangsweergave (CYCL-03)
- **D-10:** De bestaande doelen-sidebar in DINMappingStep krijgt status-badges per doel: afgerond (groen vinkje), actief/bezig (blauw), nog niet begonnen (open cirkel).
- **D-11:** Bij doelen met status "bezig" toont de sidebar een compact per-sector overzicht van wat compleet is (bijv. "PO ✓ VO ✓ Zak ✗") en wat er ontbreekt.
- **D-12:** De bestaande groene stip (hasBenefits indicator) wordt vervangen door de nieuwe status-badges — meer informatief en methodisch correct.

### Claude's Discretion
- Exacte styling en positionering van de "Doel afronden"-knop (onder de sidebar, bij het actieve doel, of als floating action)
- Animatie/transitie wanneer sidebar naar het volgende doel springt
- Exacte formattering van het eerder-uitgewerkte-doelen blok in de system prompt
- Hoe het per-sector voortgangsoverzicht eruitziet in de sidebar (iconen, kleuren, tekst)
- Of de "Doel afronden"-knop een bevestigingsstap heeft of direct afrond
- Implementatiedetails van de completedGoals state (migratielogica voor bestaande sessies)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### DIN-mapping (te wijzigen)
- `src/components/steps/DINMappingStep.tsx` — Huidige DIN-mapping stap met doelen-sidebar (lijn 1440-1472), goal selection (lijn 433/530), sector-baten filtering
- `src/lib/din-service.ts` — `getStepCompletions()` (lijn 581-641), `getBenefitsByGoalAndSector()`, DIN CRUD helpers

### Session state (te wijzigen)
- `src/lib/schemas.ts` — `DINSessionSchema` met goalBenefitMaps, benefitCapabilityMaps, capabilityEffortMaps. Uitbreiden met `completedGoals`
- `src/lib/types.ts` — Afgeleide types, `DINSession` interface
- `src/lib/session-context.tsx` — SessionProvider met `updateSession` callback API

### AI prompt-assembly (te wijzigen)
- `src/lib/prompt-assembly.ts` — `assembleSystemPrompt()` voor system prompt opbouw. Uitbreiden met eerder-uitgewerkte-doelen blok
- `src/lib/ai-client.ts` — `callClaudeWithValidation()` centraal AI-aanroeppatroon

### API routes (context doorgeven)
- `src/app/api/din-mapping/route.ts` — DIN-keten generatie, moet eerder-uitgewerkte-doelen context ontvangen
- `src/app/api/din-suggest/route.ts` — DIN-suggest endpoint, idem

### Mapping-koppelingen (compleetheids-check)
- `src/lib/schemas.ts` — `GoalBenefitMapSchema` (lijn 164), `BenefitCapabilityMapSchema`, `CapabilityEffortMapSchema`

### Methodiek
- `docs/programmaboek.doc` — DIN-methodiek referentie (keten doelen → baten → vermogens → inspanningen)

### Requirements
- `.planning/REQUIREMENTS.md` — CYCL-01 (selecteer en uitwerken), CYCL-02 (context meegave), CYCL-03 (voortgang per doel)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Doelen-sidebar in DINMappingStep (lijn 1440-1472): Al een lijst van doelen met klik-selectie en groene stip. Wordt uitgebreid met status-badges en afrond-knop.
- `getStepCompletions()` in din-service.ts: Bestaand voortgangspatroon per stap. Kan als referentie voor per-doel voortgangsberekening.
- `goalBenefitMaps`, `benefitCapabilityMaps`, `capabilityEffortMaps`: Alle koppelingen bestaan al — compleetheids-check kan hierop bouwen.
- `assembleSystemPrompt()` in prompt-assembly.ts: Bestaand patroon voor context-blokken. Nieuw blok voor eerder-uitgewerkte-doelen past in dezelfde structuur.
- Toast-systeem uit Phase 2: Herbruikbaar voor "Doel afgerond!" feedback.

### Established Patterns
- System prompt = instructie + `---` + programmaboek-context + `---` + KiB-context + `---` + sectorwerk-context. Eerder-uitgewerkte-doelen wordt het vijfde blok.
- Functionele `updateSession(prev => ...)` callback API voor state updates.
- `Record<string, T>` patroon voor sector-geindexeerde data.
- Zod schema's met `.optional().default([])` voor nieuwe velden (backward compat).

### Integration Points
- DINMappingStep doelen-sidebar (lijn 1440-1472): Status-badges toevoegen, groene stip vervangen.
- DINMappingStep goal selection (lijn 433/530): Na afronden automatisch doorspringen naar volgend doel.
- `schemas.ts` DINSessionSchema: Nieuw veld `completedGoals: z.array(z.string()).optional().default([])`.
- `prompt-assembly.ts`: Nieuwe functie `buildCompletedGoalsContext()` voor het eerder-uitgewerkte-doelen prompt-blok.
- API routes (din-mapping, din-suggest): Extra parameter `completedGoalItems` doorgeven.

</code_context>

<specifics>
## Specific Ideas

- Zachte begeleiding: alle doelen vrij toegankelijk, maar het systeem stuurt naar sequentieel werken via visuele status en automatisch doorspringen
- Volledige DIN-keten vereist per sector (baat→vermogen→inspanning met koppelingen) — geen shortcuts
- "Doel afronden"-knop is pas actief als keten compleet is, toont wat er ontbreekt als het niet kan
- AI krijgt volledige items van afgeronde doelen mee, met automatische cap bij prompt-budget overschrijding (consistent met Phase 5 buildSectorwerkBlock capping)
- Context-blok past in het bestaande layered prompt-assembly patroon: programmaboek → KiB → sectorwerk → eerder-uitgewerkte-doelen
- Status-badges vervangen de huidige groene stip — rijkere informatie (afgerond/bezig/niet begonnen + per-sector detail)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-cyclisch-doel-voor-doel-werken*
*Context gathered: 2026-04-02*
