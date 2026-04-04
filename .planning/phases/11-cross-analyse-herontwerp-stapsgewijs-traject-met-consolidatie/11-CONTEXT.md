# Phase 11: Cross-analyse herontwerp — stapsgewijs traject met consolidatie - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Herstructureer de CrossAnalyseStep van 9 losse secties naar een lineaire 5-stappen wizard zodat stakeholders in één oogopslag zien hoe de drie sectoren samenhangen. De wizard volgt de DIN-keten (baten → vermogens → inspanningen), consolideert gedeelde items, en toont per sector hoe hun input terugkomt in het geheel.

</domain>

<decisions>
## Implementation Decisions

### Stappen-navigatie
- **D-01:** Lineaire wizard met volgende/vorige knoppen. Stappen worden ontgrendeld na voltooiing. Past bij het methodische karakter van DIN.
- **D-02:** 5 stappen in vaste volgorde: (1) Sectoroverloop baten, (2) Gedeelde vermogens, (3) Inspanningen-overlap, (4) Consolidatie-actie, (5) Per-sector vertaling.

### Informatie-verdeling (DIN-keten focus)
- **D-03:** Stap 1 — Baten per sector naast elkaar + gaps (ontbrekende baat-ketens). Uit huidige SynergieSection + GapsSection.
- **D-04:** Stap 2 — VermogenClusters + hefboomwerking. Welke vermogens delen sectoren? Uit huidige VermogenClusterSection + HefboomSection.
- **D-05:** Stap 3 — InspanningClusters + ProjectMatching (lopende projecten). Uit huidige InspanningClusterSection + ProjectMatchingSection.
- **D-06:** Stap 4 — Consolidatie-acties. AI-advies per cluster met samenvoeg/apart houden knoppen.
- **D-07:** Stap 5 — Per-sector vertaling met tabs. DIN-keten + domeinbalans + gaps per sector. DomeinBalansSection en SectorOverlapSection verhuizen hierheen.

### Consolidatie-interactie
- **D-08:** AI-voorstel per cluster met één klik accepteren of afwijzen (combineren / apart houden). Niet checkbox-selectie, niet drag-drop.
- **D-09:** Optioneel tekstveld bij de consolidatie-stap waarin de gebruiker extra context of sturing kan toevoegen vóór het AI-consolidatieadvies. Dit verbetert de kwaliteit van het AI-voorstel.
- **D-10:** Bestaande consolidatie-logica (mergeCapabilities, mergeEfforts, undo-functies) blijft intact — bewezen patroon uit Phase 8.

### AI-aanroep timing
- **D-11:** Per stap een aparte AI-call, handmatig getriggerd via een 'Analyseer' knop. Gebruiker kan eerst de data bekijken vóórdat AI draait.
- **D-12:** Cumulatieve context: elke stap stuurt het resultaat van eerdere stappen mee als AI-context. Stap 2 krijgt baten-overloop mee, stap 3 krijgt baten + vermogens, stap 4 krijgt alles + eventuele extra gebruiker-context.
- **D-13:** Optioneel tekstveld per stap voor extra context/sturing vóór de AI-call.

### Per-sector vertaling (stap 5)
- **D-14:** Sector-tabs (PO/VO/ZK) met volledige DIN-keten per sector. Eigen baten, gedeelde vermogens (met badge welke sectoren), inspanningen, domeinbalans-indicator, en gaps.
- **D-15:** Eerste tab is 'Overzicht' — compacte samenvattingstabel met aantallen per sector (baten/vermogens/inspanningen, waarvan gedeeld, gaps totaal). Daarna de individuele sector-tabs.
- **D-16:** Geconsolideerde items tonen duidelijk welke sectoren erbij betrokken zijn (badge/icoon). Stakeholders moeten hun eigen sector-input herkennen — dit is cruciaal voor draagvlak.

### Claude's Discretion
- Exacte wizard-UI-ontwerp (progress indicator stijl, knoppen-layout)
- Hoe de 'Analyseer' knop en loading state eruitzien per stap
- Schema-structuur van per-stap AI responses
- Hoe de cumulatieve context wordt samengevoegd in prompts
- Visuele weergave van de samenvattingstabel in stap 5
- Welke huidige sub-componenten hergebruikt vs herschreven worden
- Hoe de overgang van 9-secties naar 5-stappen technisch wordt gerefactord

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### CrossAnalyseStep (te herstructureren)
- `src/components/steps/CrossAnalyseStep.tsx` — Huidige 1641-regels component met 9 secties, consolidatie-logica (mergeCapabilities, mergeEfforts, undo-functies), en AI-analyse flow
- `src/app/api/cross-analyse/route.ts` — Cross-analyse API route met AI-call en prompt-assembly
- `src/lib/prompts.ts` — CROSS_ANALYSE_PROMPT (regel 47-140), moet opgesplitst worden in per-stap prompts

### Schemas & types
- `src/lib/schemas.ts` — AICrossAnalyseSchema, VermogenClusterSchema, InspanningClusterSchema, ProjectMatchSchema
- `src/lib/types.ts` — CrossAnalyseResult, AICrossAnalyse, VermogenClusterItem, InspanningClusterItem, ProjectMatchItem

### Bestaande patronen (hergebruiken)
- `src/lib/ai-client.ts` — callClaudeWithValidation() centraal AI-aanroeppatroon
- `src/lib/prompt-assembly.ts` — assembleSystemPrompt() voor layered context
- `src/lib/session-context.tsx` — updateSession met functionele updaters
- `src/lib/din-service.ts` — findSharedCapabilities(), getDomainBalance(), findGaps()

### Methodiek
- `docs/programmaboek.doc` — DIN-methodiek: baten per sector, vermogens en inspanningen kunnen gedeeld zijn

### Prior context
- `.planning/phases/08-cross-analyse-semantische-matching/08-CONTEXT.md` — Originele cross-analyse beslissingen (D-01 t/m D-13)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `mergeCapabilities()` / `undoMergeCapabilities()` (CrossAnalyseStep.tsx:17-91): Pure consolidatie-functies, direct herbruikbaar
- `mergeEfforts()` / `undoMergeEfforts()` (CrossAnalyseStep.tsx:92-160): Idem voor inspanningen
- `ConsolidationActionBar` (CrossAnalyseStep.tsx:529-623): Samenvoeg-UI met undo, herbruikbaar in stap 4
- `ClusterCard` (CrossAnalyseStep.tsx:624-696): Cluster-weergave component, herbruikbaar in stap 2 en 3
- `VermogenClusterSection` / `InspanningClusterSection`: Bestaande cluster-rendering, basis voor stap 2 en 3
- `DomeinBalansSection` (CrossAnalyseStep.tsx:390-450): Verhuist naar stap 5 sector-tabs
- `SectorBadge` (CrossAnalyseStep.tsx:161-169): Sector-kleur badge, herbruikbaar in alle stappen
- `LoadingOverlay` (CrossAnalyseStep.tsx:170-234): AI-loading animatie, herbruikbaar

### Established Patterns
- AI-responses via callClaudeWithValidation met Zod schemas en retry
- Functionele updateSession(prev => ...) voor state-mutaties
- Prompt-assembly met layered context blokken
- Toast-systeem voor feedback bij consolidatie-acties

### Integration Points
- CrossAnalyseStep wordt aangeroepen vanuit de sessie wizard (stap 3 van de hoofdwizard)
- Session state bevat crossAnalyseResult en de consolidatie-vlaggen op capabilities/efforts
- API route `/api/cross-analyse` moet opgesplitst worden in per-stap endpoints of één endpoint met stap-parameter

</code_context>

<specifics>
## Specific Ideas

- **Stakeholder-herkenning is cruciaal:** Stakeholders hebben eerst afzonderlijke sector-sessies gehad. In de cross-analyse wordt het gezamenlijk. Ze moeten hun eigen sector terugvinden — anders ontstaan vragen als "ik heb een sessie gehad maar ik zie het niet terug."
- **DIN-keten volgorde:** Alles wordt gepresenteerd in de methodische volgorde: baten → vermogens → inspanningen. Niet andersom, niet door elkaar.
- **Extra context veld bij consolidatie:** Gebruiker kan context toevoegen vóór het AI-consolidatieadvies voor een optimaler voorstel.
- **Na consolidatie een duidelijk overzicht:** Het eindresultaat (stap 5) moet helder tonen: "zo gaan we het doen met deze gedeelde vermogens en inspanningen die deze baten bedienen."

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-cross-analyse-herontwerp-stapsgewijs-traject-met-consolidatie*
*Context gathered: 2026-04-04*
