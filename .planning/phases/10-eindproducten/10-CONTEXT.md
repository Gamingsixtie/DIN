# Phase 10: Eindproducten - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Gebruiker kan een compleet programmaplan, DIN-overzicht en roadmap exporteren als Word-document. De bestaande export (ExportStep.tsx + word-export.ts) wordt verbeterd: consolidatie-data uit Phase 8 opnemen, genummerde kopjes, DIN-netwerk als tabel-flow visualisatie, gap-detectie vóór export, en roadmap-placeholder. De ongebruikte AI-gegenereerde prose export (/api/export + generateProgrammaPlan) wordt verwijderd.

</domain>

<decisions>
## Implementation Decisions

### Export inhoud & structuur
- **D-01:** Bestaande secties verbeteren, niet herontwerpen. De huidige ~15 secties (titelpagina, TOC, samenvatting, visie, scope, doelen, DIN-keten, cross-analyse, gap-analyse, hefboomwerking, governance, externe projecten, sectorale uitwerking, roadmap) vormen een goede basis.
- **D-02:** Geconsolideerde items (Phase 8) tonen als één gedeeld item met alle gekoppelde sectoren. Originele sector-specifieke items niet apart herhalen in de export. De undo-mogelijkheid zit in de app zelf (consolidated-vlag + undo-knop) — gebruiker kan altijd terug, aanpassen, en opnieuw exporteren.
- **D-03:** Automatische nummering van kopjes (1. Programmavisie, 1.1 Beknopt, 2. Scope, etc.) die automatisch gegenereerd worden op basis van de aanwezige secties. TOC volgt dezelfde nummering.
- **D-04:** De /api/export route en generateProgrammaPlan() functie verwijderen. Het Word-document is het eindproduct — geen apart AI-gegenereerd tekstdocument nodig.
- **D-05:** Niet-uitgewerkte doelen (cyclisch werken, één doel per keer) worden wél opgenomen in het document met notitie "Uitwerking volgt in volgende cyclus". Zo is het document compleet maar eerlijk over wat nog komt.

### DIN-overzicht visualisatie
- **D-06:** Gestylede tabel-flow per doel: een tabel per doel waarin de DIN-keten als kolommen staat (Baat | Vermogen | Inspanning) met pijl-symbolen (→) als verbindingen. Per sector een aparte tabel.
- **D-07:** Per sector apart, niet alle sectoren in één tabel. Geconsolideerde vermogens/inspanningen verschijnen bij alle relevante sectoren met markering 'gedeeld'.
- **D-08:** Geen apart helicopter-view/totaaloverzicht — met cyclisch werken (één doel per keer) voegt dat weinig toe. De bestaande samenvattings-sectie dekt de cijfers.

### Roadmap & tijdlijn
- **D-09:** Altijd een roadmap-sectie opnemen in het document. Als er geen kwartaaldata beschikbaar is: placeholder-tekst "Kwartaalplanning wordt in een volgende cyclus bepaald." Als er wél kwartaaldata is: eenvoudige tabel tonen.
- **D-10:** Geen uitgebreide tijdlijn-visualisatie of Gantt-chart. Kwartaalplanning is een latere stap — eerst worden baten, vermogens en inspanningen bepaald via de DIN-keten en cross-analyse.

### Gap-detectie & validatie
- **D-11:** Informatief overzicht bij klikken op 'Exporteer': eerst gaps tonen, gebruiker kiest "Toch exporteren" of "Eerst aanvullen". Niet blokkerend — soms wil je bewust een deels uitgewerkt plan delen.
- **D-12:** Gap-analyse als sectie opnemen in het Word-document zelf. Maakt voor stakeholders zichtbaar waar het programma nog onvolledig is.
- **D-13:** Onderscheid maken tussen "nog niet aan de beurt" (doelen die bewust niet uitgewerkt zijn, volgende cyclus) en "echte gaps" (onvolledige ketens binnen een gestart doel). Gebruik completedGoals-data uit Phase 6 voor dit onderscheid.

### Claude's Discretion
- Exacte opmaak en styling van de tabel-flow (kleuren, celgroottes, pijl-stijl)
- Nummering-implementatie (counter-variabele of prefix per sectie)
- Hoe "gedeeld" markering er visueel uitziet in de tabel-flow
- Exacte tekst van placeholder bij lege roadmap
- Hoe de gap-waarschuwing modal eruitziet in de app
- Eventuele cleanup van ongebruikte code na verwijdering van /api/export

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Export (te wijzigen)
- `src/components/steps/ExportStep.tsx` — In-app preview met alle secties (DocumentTitlePage, VisionBlock, ScopeBlock, GoalsBlock, DINKetenBlock, CrossAnalyseBlock, GapAnalyseBlock, HefboomBlock, GovernanceBlock, ExterneProjectenBlock, SectorBlocks, RoadmapBlock)
- `src/lib/word-export.ts` — Word-document generatie met docx library (titelpagina, TOC, samenvatting, visie/scope/doelen, DIN-keten per doel, cross-analyse, gap-analyse, hefboomwerking, governance, sectoren, roadmap)

### Te verwijderen
- `src/app/api/export/route.ts` — Ongebruikte API route die AI-gegenereerde prose programmaplan genereert
- `src/lib/ai-client.ts` lijn 243-248 — `generateProgrammaPlan()` functie en `PROGRAMMAPLAN_PROMPT` import
- `src/lib/prompts.ts` — `PROGRAMMAPLAN_PROMPT` definitie (zoek naar de prompt)

### Consolidatie-data (Phase 8, te integreren in export)
- `src/lib/schemas.ts` — ConsolidationClusterSchema, consolidated vlag op DINCapability/DINEffort
- `src/lib/types.ts` — ConsolidationCluster, CrossAnalyseResult types
- `src/lib/din-service.ts` — mergeCapabilities(), consolidatie-gerelateerde functies

### Cyclisch werken (Phase 6, nodig voor gap-onderscheid)
- `src/lib/din-service.ts` — checkSectorChain(), getGoalCompletionStatus(), completedGoals logica
- `src/lib/types.ts` — CompletedGoalItem type, completedGoals veld op DINSession

### DIN-keten
- `src/lib/din-service.ts` — buildChainsForSector() voor het opbouwen van Baat→Vermogen→Inspanning ketens
- `src/lib/din-service.ts` — findGaps() voor gap-detectie

### Methodiek
- `docs/programmaboek.doc` — DIN-methodiek: batenprofielen, vermogens, inspanningen in vier domeinen

### Requirements
- `.planning/REQUIREMENTS.md` — EXP-01 (compleet programmaplan Word-export), EXP-02 (visuele DIN-overzicht), EXP-03 (roadmap/tijdlijn)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ExportStep.tsx` (~900 regels): Volledige in-app preview met alle secties. Kan als blauwdruk dienen voor de Word-export verbeteringen.
- `word-export.ts` (~1200 regels): Uitgebreide Word-generatie met docx library. Titelpagina, TOC, alle secties. Basis is sterk — moet aangevuld worden met consolidatie-data en tabel-flow.
- `buildChainsForSector()`: Bouwt de Baat→Vermogen→Inspanning keten per sector per doel. Herbruikbaar voor de tabel-flow visualisatie.
- `findGaps()`: Detecteert breuken in de DIN-keten. Herbruikbaar voor de gap-waarschuwing.
- `getGoalCompletionStatus()`: Bepaalt of een doel volledig, deels of niet uitgewerkt is. Nodig voor onderscheid "nog niet aan de beurt" vs "echte gap".
- Toast-systeem (Phase 2): Voor feedback bij export-acties.

### Established Patterns
- Word-document via docx library: Paragraph, TextRun, Table, TableRow, TableCell met Cito-branding kleuren
- `heading()`, `subHeading()`, `bodyText()`, `bullet()`, `styledCell()`, `headerCell()` helper functies in word-export.ts
- Secties als aparte functies die een `{ properties, children }` object retourneren
- In-app preview: React componenten met Section/SubSection layout-helpers

### Integration Points
- `ExportStep.tsx`: handleExportWord() importeert dynamisch word-export.ts — dit patroon blijft
- `ExportStep.tsx`: Nieuwe gap-waarschuwing modal vóór export-trigger toevoegen
- `word-export.ts`: Tabel-flow visualisatie toevoegen als nieuwe sectie-functie
- `word-export.ts`: Consolidatie-data integreren in cross-analyse secties
- `word-export.ts`: Nummering-systeem toevoegen aan heading() helper
- `/api/export/route.ts` + `generateProgrammaPlan()`: Verwijderen

</code_context>

<specifics>
## Specific Ideas

- Cyclisch werken is de kern: gebruiker importeert alles maar werkt per doel (6-9 maanden per cyclus). Export moet goed werken met slechts één uitgewerkt doel.
- Niet-uitgewerkte doelen als "volgt in volgende cyclus" — transparant maar niet alarmerend.
- Gap-detectie moet slim zijn: doelen die bewust nog niet uitgewerkt zijn, zijn geen "gap" maar "volgende cyclus". Echte gaps zijn onvolledige ketens binnen een gestart doel.
- De tabel-flow per doel per sector is de kern-visualisatie van het DIN-netwerk in het document.
- Consolidatie altijd vanuit het geconsolideerde beeld tonen — de gebruiker kan in de app undo doen en opnieuw exporteren.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-eindproducten*
*Context gathered: 2026-04-03*
