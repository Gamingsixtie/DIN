# Phase 9: Wizard Cleanup & Export Voorbereiding - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Verwijder de integratieadvies-functionaliteit volledig uit de applicatie. Dit omvat het verwijderen van de ingebouwde advies-panel in DINMappingStep, het opschonen van verweesde step-componenten, het verwijderen van dode schemas/types/AI-functies, en het opschonen van de export. De wizard-flow (6 stappen) blijft intact maar wordt schoner.

</domain>

<decisions>
## Implementation Decisions

### Cleanup scope
- **D-01:** Deep clean — alle integratieadvies-gerelateerde code wordt volledig verwijderd. Geen dead code achterlaten.
- **D-02:** Verwijder het integratieadvies-panel uit DINMappingStep (knop, slide-out panel, state, 'Verwerk in sectorplan' flow). Geen vervanging nodig.
- **D-03:** Verwijder verweesde componenten: `SectorIntegratieStep.tsx`, `SamengevoegdDINStep.tsx`, `MergedDINView.tsx`.
- **D-04:** Verwijder `generateSectorIntegratie()` functie en `SECTOR_INTEGRATIE_PROMPT` uit ai-client.ts.
- **D-05:** Verwijder `IntegratieAdviesItemSchema`, `IntegratieAdviesResultSchema` en gerelateerde types uit schemas.ts.
- **D-06:** Verwijder het `integratieAdvies` veld uit DINSessionSchema. Zod's `.optional()` zorgt ervoor dat legacy sessies zonder problemen laden — het veld wordt stilzwijgend genegeerd.

### Export
- **D-07:** Verwijder de 'Integratie-advies' sectie uit word-export.ts (per-sector advies rendering).
- **D-08:** Verwijder de `IntegratieAdviesSubSection` en gerelateerde integratie-advies weergave uit ExportStep.tsx.
- **D-09:** Geen vervangende sectie in de export — Phase 10 behandelt de volledige export-redesign.

### DINMappingStep na opschoning
- **D-10:** Geen lightweight vervanging voor het verwijderde advies-panel. Cross-analyse (Phase 8) zal cross-sector guidance apart afhandelen.

### Claude's Discretion
- Volgorde van verwijdering (welke bestanden eerst)
- Eventuele cleanup van imports die na verwijdering ongebruikt zijn
- Hoe de DINMappingStep UI er uitziet na verwijdering van het panel (layout aanpassingen)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Integratieadvies in DINMappingStep (te verwijderen)
- `src/components/steps/DINMappingStep.tsx` — Bevat integratieAdvies state, panel, knop, 'Verwerk in sectorplan' flow (~regels 446-502, 1277-1321, 1641-1647, 2203-2238)

### Verweesde componenten (te verwijderen)
- `src/components/steps/SectorIntegratieStep.tsx` — Los staand component, niet in wizard
- `src/components/steps/SamengevoegdDINStep.tsx` — Los staand component, niet in wizard
- `src/components/din/MergedDINView.tsx` — Samengevoegd DIN-overzicht component

### Schemas & types (te wijzigen)
- `src/lib/schemas.ts` — IntegratieAdviesItemSchema (lijn 296), IntegratieAdviesResultSchema (lijn 302), integratieAdvies veld in DINSessionSchema (lijn 370)
- `src/lib/types.ts` — Re-export van IntegratieAdviesItem, IntegratieAdviesResult

### AI client (te wijzigen)
- `src/lib/ai-client.ts` — SECTOR_INTEGRATIE_PROMPT import (lijn 9), generateSectorIntegratie() functie (lijn 244), integratieAdvies parameter in generateProgrammaplan (lijn 531, 592-594)

### Export (te wijzigen)
- `src/lib/word-export.ts` — Integratie-advies sectie per sector (lijn 1137-1141)
- `src/components/steps/ExportStep.tsx` — IntegratieAdviesSubSection rendering (lijn 699-704, 835)

### Prompts (te wijzigen)
- `src/lib/prompts.ts` — SECTOR_INTEGRATIE_PROMPT definitie

### Session context (te wijzigen)
- `src/lib/session-context.tsx` — integratieAdvies in initial state
- `src/lib/__tests__/session-context.test.ts` — integratieAdvies in test fixtures

### Requirements
- `.planning/REQUIREMENTS.md` — EXP-04: Integratieadvies-stap verwijderd uit de wizard flow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Geen — dit is een opschoningsfase, geen nieuwbouw

### Established Patterns
- Zod schemas als single source of truth (Phase 1): verwijdering uit schemas.ts cascadeert naar types.ts
- Functionele updateSession (Phase 2): integratieAdvies state in DINMappingStep gebruikt dit patroon — kan compleet verwijderd worden
- `callClaudeWithValidation` patroon: de te verwijderen `generateSectorIntegratie` gebruikt het oude `callClaude` patroon, niet het nieuwe — geen impact op andere AI-functies

### Integration Points
- APP_STEPS in types.ts: hoeft NIET gewijzigd — bevat al alleen de 6 actieve stappen
- AppStepSchema in schemas.ts: hoeft NIET gewijzigd — bevat al alleen de 6 enum values
- StepContent switch in sessies/[id]/page.tsx: hoeft NIET gewijzigd — verwijst al niet naar de verweesde componenten
- DINMappingStep.tsx: NA verwijdering van advies-panel worden ~200-300 regels code en meerdere state variabelen verwijderd

</code_context>

<specifics>
## Specific Ideas

- De `integratieAdvies` state en bijbehorende functies in DINMappingStep (setIntegratieAdvies, showAdviesPanel, isAnalyzingIntegratie, ADVIES_SECTIONS) zijn allemaal onderdeel van hetzelfde feature-cluster — verwijder ze als groep.
- In generateProgrammaplan (ai-client.ts) wordt integratieAdvies als optionele parameter meegegeven aan de export-prompt. Dit kan volledig verwijderd worden.
- De word-export gebruikt IntegratieAdviesResult type voor de integratie-advies sectie — na verwijdering van het type kan deze hele sectie weg.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-wizard-cleanup-export-voorbereiding*
*Context gathered: 2026-04-03*
