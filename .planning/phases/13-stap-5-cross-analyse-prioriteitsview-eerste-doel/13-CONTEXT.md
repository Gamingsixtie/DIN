# Phase 13: Stap 5 Cross-Analyse Prioriteitsview eerste doel - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Herschrijf stap 5 van de cross-analyse wizard (`StapSectorVertaling.tsx`) van een breed totaaloverzicht naar een **focusview rond het eerste doel** (hoogste rank uit KiB-import). De view toont de methodische keten voor precies dat ene doel: focusdoel → baten per sector → geconsolideerde cross-sector vermogens → bijbehorende gedeelde inspanningen. Een AI-review beoordeelt hefboomwerking, breedte van inspanningen, en baten-dekking. Het huidige totaaloverzicht (volledige DIN-keten, domeinbalans, gap-analyse) verdwijnt uit stap 5. Niet-geconsolideerde items komen in een inklapbare "buiten scope" footer.

**Buiten scope voor deze phase:** wijzigingen aan stap 1-4, wijzigingen aan prioriteringsstap of export, apply-knoppen voor AI-suggesties (alleen weergave), multi-doel toggle in stap 5.

</domain>

<decisions>
## Implementation Decisions

### Focusdoel-bepaling
- **D-01:** Focusdoel = het eerste doel uit de KiB-import (nummer 1). Bepaal via `[...session.goals].sort((a,b) => (a.rank ?? 999) - (b.rank ?? 999))[0]`, fallback op `session.goals[0]`. Identieke logica in client en API-route zodat beide naar hetzelfde doel kijken. Geen dropdown of toggle in stap 5.

### AI-trigger
- **D-02:** Handmatige "Analyseer" knop — hergebruik bestaande `handleAnalyse` in `CrossAnalyseWizard.tsx`. Consistent met Phase 11 D-11. Structurele view (focusdoel + baten + vermogens + inspanningen) rendert ook zonder AI-resultaat; AI-callouts verschijnen pas na klik.

### "Buiten scope" footer
- **D-03:** Ingeklapt toont alleen tellingen ("X vermogens en Y inspanningen vielen buiten de consolidatie"). Bij uitklappen: simpele lijst met titels + sector-badges. Geen volledige kaarten of AI-review per item — dat herintroduceert juist de ruis die we wegnemen.

### Stakeholder-herkenning & badging (kritisch)
- **D-04:** Kleurgecodeerde badges zijn verplicht — sector managers hebben individuele sectorsessies gehad om hún baten te bepalen. In de geconsolideerde stap 5 moeten ze **op één blik** kunnen terugvinden welke van hun baten daadwerkelijk geraakt worden door de gedeelde vermogens en inspanningen. Dit is de visuele basis voor mandaat en draagvlak om de cross-sector aanpak uit te voeren.
- **D-05:** Badge-schema:
  - `batenDekking.wordtGeraakt: true` → groene badge "geraakt"
  - `batenDekking.wordtGeraakt: false` → rode badge "risico" + risico-tekst zichtbaar
  - `inspanningReview.breedteOordeel: "dekt_volledig"` → groene badge
  - `inspanningReview.breedteOordeel: "moet_verbreed"` → amber badge
  - `inspanningReview.breedteOordeel: "mist_aspect"` → rode badge
- **D-06:** Baten worden per sector gegroepeerd (PO/VO/Zakelijk) met `SectorBadge`. Naast elke baat de geraakt/risico-badge. Dit maakt de "is mijn baat geraakt?"-vraag per sectormanager direct beantwoordbaar.

### Datamodel & AI-prompt
- **D-07:** `Stap5ResultSchema` wordt volledig vervangen door het nieuwe schema uit plan-artefact (velden: `focusDoelId`, `focusDoelNaam`, `vermogenReview[]`, `inspanningReview[]`, `batenDekking[]`, `samenvatting`). Oude shape (`sectorVertalingen[]`) verdwijnt.
- **D-08:** `CROSS_ANALYSE_STAP5_PROMPT` wordt volledig herschreven rond vier punten: hefboomwerking per vermogen, breedte van inspanningen, baten-dekking (met expliciete risico-waarschuwing), en 3-5 zinnen samenvatting. Methodisch geankerd in hefboomwerking (Werken aan Programma's, Hfst 8).
- **D-09:** API-route versmalt de `structuredData` payload voor `stap === 5`: alleen focusdoel, baten onder focusdoel, cross-sector vermogens (`relatedSectors.length > 1`) die aan die baten hangen, en gedeelde inspanningen (multi-sector `responsibleSector`) die aan die vermogens hangen. Client filtert parallel dezelfde items voor de view.

### Migratie bestaande sessies
- **D-10:** Geen destructieve migratie. Oude `stap5` data (oude shape) faalt Zod-parse → try/catch bij inladen in `CrossAnalyseWizard.tsx` zet `stap5: undefined`. User draait stap 5 opnieuw. Geen dataverlies in andere stappen.

### Wizard-copy
- **D-11:** Stap-titel/intro voor stap 5 actualiseren van "Sector-vertaling" naar "Prioriteitsview — eerste doel". Intro-tekst benoemt expliciet: (a) waarom alleen het eerste doel, (b) dat niet-geconsolideerde items later alsnog kunnen worden opgepakt.

### Empty states
- **D-12:** Drie empty states: (a) geen doelen → bestaande empty state hergebruiken; (b) focusdoel maar geen cross-sector vermogens → expliciete melding "Voer eerst stap 4 uit of voeg gedeelde vermogens toe"; (c) wel data maar AI-resultaat nog niet → structurele view zonder AI-callouts plus de "Analyseer" knop.

### Claude's Discretion
- Exacte visuele opmaak van callouts (borders, spacing, icoon-keuze)
- Tailwind-klassenkeuze voor de badges (mits kleuren conform D-05 blijven)
- Precieze copy van intro-tekst en section-headers
- Of de samenvatting als card, callout of quote wordt gerenderd
- Interne component-opsplitsing binnen `StapSectorVertaling.tsx`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Plan-artefact (primaire bron)
- `~/.claude/plans/twinkling-puzzling-hennessy.md` — Volledig plan inclusief datamodel, prompt-strekking, API-versmalling, UI-structuur en verificatie-checklist

### Te wijzigen bestanden
- `src/components/cross-analyse/StapSectorVertaling.tsx` — Volledig herschrijven naar focusview
- `src/lib/schemas.ts` §430-444 — `Stap5ResultSchema` vervangen
- `src/lib/prompts.ts` §253-284 — `CROSS_ANALYSE_STAP5_PROMPT` vervangen
- `src/app/api/cross-analyse/route.ts` §109-160 — structuredData voor stap 5 versmallen
- `src/components/cross-analyse/CrossAnalyseWizard.tsx` §30-35 — intro-tekst stap 5 actualiseren
- `src/lib/types.ts` — `Stap5Result` type afleiding uit nieuw schema

### Hergebruik-patronen (niet wijzigen)
- `src/components/cross-analyse/shared.tsx` — `SectorBadge` component
- `src/lib/ai-client.ts` — `callClaudeWithValidation()` voor AI-aanroep met Zod-validatie
- `src/lib/din-service.ts` — bestaande filtering via `relatedSectors.length > 1` (zie huidige stap 5 lines 37-42)
- `src/lib/session-context.tsx` — `updateSession` functionele updaters

### Methodiek
- `docs/programmaboek.doc` — DIN-methodiek, hoofdstuk 8 (hefboomwerking) als ankerpunt voor de nieuwe prompt

### Prior context
- `.planning/phases/11-cross-analyse-herontwerp-stapsgewijs-traject-met-consolidatie/11-CONTEXT.md` — D-11/D-12 (handmatige AI-trigger, cumulatieve context) gelden nog; D-14/D-15 (sector-tabs, overzicht-tab) worden door deze phase vervangen
- `.planning/phases/12-lopende-projecten-invullen-in-din-netwerk/12-CONTEXT.md` — consolidatie-state (`consolidated` flag op capabilities/efforts, `relatedSectors`, multi-sector `responsibleSector`) blijft de bron voor stap 5 filtering

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SectorBadge` (`src/components/cross-analyse/shared.tsx`) — kleur-badge per sector (PO/VO/Zakelijk), cruciaal voor stakeholder-herkenning per baat
- `callClaudeWithValidation()` (`src/lib/ai-client.ts`) — centraal AI-aanroeppatroon met Zod retry; gebruiken voor stap 5 AI-call
- `CHAIN_COLORS` constante (huidige `StapSectorVertaling.tsx` lines 20-25) — kleurmapping voor doelen/baten/vermogens/inspanningen, bewaren voor de nieuwe view
- Bestaande `handleAnalyse` flow in `CrossAnalyseWizard.tsx` — POST `/api/cross-analyse` met `stap: 5`; ongewijzigd hergebruiken

### Established Patterns
- Zod-first validatie: AI-response MOET Stap5ResultSchema passeren; Claude herhaalt bij fail
- Prompt-assembly via `assembleSystemPrompt()` voor layered context (DIN-methodiek + KiB-visie)
- Functionele `updateSession(prev => ...)` voor alle state-mutaties
- Client-side filtering (niet AI) voor het bepalen van de zichtbare items — AI doet alleen kwalitatieve review

### Integration Points
- `CrossAnalyseWizard.tsx` rendert `StapSectorVertaling` wanneer `currentStep === 5`
- Session state leest `session.crossAnalyseWizard.stepResults.stap5` voor het AI-resultaat
- `/api/cross-analyse` route-splitsing op `stap`-parameter (bestaande pattern uit Phase 11)
- Consolidatie-flags (`capabilities[].consolidated`, `efforts[].consolidated`) blijven de bron voor "buiten scope" tellingen

### Niet meer gebruiken in stap 5
- `findGaps()`, `getDomainBalance()` — blijven in din-service, maar verdwijnen uit `StapSectorVertaling.tsx`
- Oude `sectorVertalingen[]` rendering-logica — volledige vervanging

</code_context>

<specifics>
## Specific Ideas

- **Mandaat via zichtbaarheid:** De kern van deze phase is dat sectormanagers — die eerder individueel hun baten hebben bepaald — in de geconsolideerde stap 5 per baat direct zien of 'hún' baat geraakt wordt door de cross-sector aanpak. Dit geeft het mandaat en draagvlak om gedeelde vermogens en inspanningen samen uit te voeren. Elke ontwerpkeuze (kleurbadges, groepering per sector, risico-tekst bij `wordtGeraakt: false`) dient dit doel.
- **Hefboom boven volledigheid:** Stap 5 laat expliciet níet meer alles zien. De boodschap is "dit zijn de hefbomen voor het eerste doel" — andere doelen, niet-geconsolideerde items, domeinbalans en gaps horen elders of in een latere iteratie thuis.
- **AI-review is kwalitatief, niet kwantitatief:** De AI telt niets, rangschikt niets, filtert niets. Alleen tekstuele beoordeling per id (hefboomAnalyse, breedteOordeel + toelichting, wordtGeraakt + redenering). Client filtert welke items zichtbaar zijn.

</specifics>

<deferred>
## Deferred Ideas

- **Multi-doel toggle in stap 5:** Gebruiker wilde strikt het eerste doel; doorloop voor doel 2, 3, etc. kan een latere phase worden.
- **Apply-knop voor AI-verbredingssuggesties:** Plan noemt expliciet: alleen weergave, geen apply. Apply-functionaliteit kan in een volgfase.
- **Domeinbalans en gap-analyse voor het focusdoel:** Verdwijnt uit stap 5; zou eventueel in een toekomstige "diepteview per doel" passen.

</deferred>

---

*Phase: 13-stap-5-cross-analyse-prioriteitsview-eerste-doel*
*Context gathered: 2026-04-05*
