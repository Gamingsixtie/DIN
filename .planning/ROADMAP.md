# Roadmap: DIN — Doelen-Inspanningennetwerk

## Overview

De DIN-app heeft een werkende basis maar lijdt aan drie kernproblemen: onbetrouwbare dataopslag, AI-output die niet voldoet aan de methodiek, en een workflow die niet cyclisch per doel werkt. Deze roadmap lost eerst de datafundamenten op (fases 1-2), maakt daarna de AI betrouwbaar en methodiek-conform (fases 3-4), implementeert het cyclisch werken (fases 5-6), verbetert de cross-analyse (fases 7-8), en levert tenslotte de eindproducten af (fases 9-10). Elke fase bouwt voort op de vorige — precies zoals de DIN-methodiek zelf vereist.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Zod Schema Validatie** - AI responses worden gevalideerd met typed schemas in plaats van fragiele regex-parsing
- [ ] **Phase 2: State Management & Persistence** - Race conditions en dataverlies opgelost met functionele state updates
- [ ] **Phase 3: Programmaboek Context Pipeline** - Relevante secties uit het programmaboek worden geextraheerd en meegegeven aan AI-prompts
- [ ] **Phase 4: AI Output Kwaliteit** - AI genereert methodiek-conforme output met juiste aantallen en formaten
- [ ] **Phase 5: Sectorwerk Doorstroming** - Sectorwerk-analyse resultaten stromen als getypeerde objecten door naar DIN-mapping
- [ ] **Phase 6: Cyclisch Doel-voor-Doel Werken** - Gebruiker werkt een doel volledig uit voordat het volgende begint
- [x] **Phase 7: Dutch Tokenizer & Similarity** - Cross-analyse gebruikt correcte woordsplitsing en verhoogde similarity-drempels (completed 2026-04-02)
- [x] **Phase 8: Cross-Analyse Semantische Matching** - Gedeelde baten, vermogens en inspanningen over sectoren worden herkend en geconsolideerd (completed 2026-04-03)
- [ ] **Phase 9: Wizard Cleanup & Export Voorbereiding** - Integratieadvies verwijderd, export-validatie toegevoegd
- [x] **Phase 10: Eindproducten** - Compleet programmaplan, DIN-overzicht en roadmap als exporteerbare documenten (completed 2026-04-04)

## Phase Details

### Phase 1: Zod Schema Validatie
**Goal**: AI responses worden betrouwbaar geparsed en opgeslagen als getypeerde objecten
**Depends on**: Nothing (first phase)
**Requirements**: DATA-02
**Success Criteria** (what must be TRUE):
  1. Elke AI response wordt gevalideerd tegen een Zod schema voordat deze wordt opgeslagen
  2. Bij een AI response die niet voldoet aan het schema, krijgt de gebruiker een foutmelding (geen stille corruptie)
  3. Alle opgeslagen DIN-data (baten, vermogens, inspanningen) zijn getypeerde objecten, niet ruwe strings
**Plans:** 3 plans
Plans:
- [x] 01-01-PLAN.md — Zod schemas als single source of truth + types.ts herschrijving
- [x] 01-02-PLAN.md — AI validatie pipeline (parseAIResponse + retry) + API routes refactoring
- [x] 01-03-PLAN.md — KiB import validatie + client-side parsing cleanup

### Phase 2: State Management & Persistence
**Goal**: Sessiedata wordt betrouwbaar opgeslagen zonder dataverlies bij gelijktijdige operaties
**Depends on**: Phase 1
**Requirements**: DATA-03
**Success Criteria** (what must be TRUE):
  1. Twee snelle bewerkingen achter elkaar resulteren in beide wijzigingen behouden (geen overschrijving)
  2. Sessiedata blijft intact na het herladen van de pagina, inclusief alle sectoranalyses en DIN-mappings
  3. State updates gebruiken functionele updaters die altijd de laatste state lezen
**Plans:** 2 plans
Plans:
- [x] 02-01-PLAN.md — Persistence boolean return + Toast system + session-context functional updater rewrite
- [x] 02-02-PLAN.md — Callsite migration (34 updateSession calls) + homepage cleanup + Opgeslagen indicator

### Phase 3: Programmaboek Context Pipeline
**Goal**: AI-prompts bevatten relevante methodiek-context uit het programmaboek
**Depends on**: Phase 1
**Requirements**: AI-01
**Success Criteria** (what must be TRUE):
  1. Bij het genereren van baten bevat de AI-prompt de relevante programmaboek-sectie over batenprofielen
  2. Bij het genereren van vermogens en inspanningen bevat de AI-prompt de relevante methodiek-definities
  3. De programmaboek-context wordt token-bewust ingekort (geen willekeurige afkapping midden in een zin)
**Plans:** 2 plans
Plans:
- [x] 03-01-PLAN.md — Build-time extractie + prompt assembly module met use-case mapping
- [x] 03-02-PLAN.md — API route integratie + prompt/boek discrepantie review (D-06)

### Phase 4: AI Output Kwaliteit
**Goal**: AI genereert methodiek-conforme DIN-elementen die de gebruiker kan presenteren aan stakeholders
**Depends on**: Phase 1, Phase 3
**Requirements**: AI-02, AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. AI genereert maximaal 2-4 baten per doel per sector, met titels in vergrotende trap
  2. KiB visie en scope zijn zichtbaar als context in elke AI-generatie stap
  3. Gegenereerde baten, vermogens en inspanningen worden gevalideerd tegen methodiek-regels voordat ze worden opgeslagen
  4. Vermogens bevatten werkwoorden, inspanningen zijn concrete activiteiten in de vier domeinen (Mens, Processen, Data & Systemen, Cultuur)
**Plans:** 3 plans
Plans:
- [x] 04-01-PLAN.md — KiB context injectie in alle AI-prompts + hoeveelheidslimieten op Zod schemas
- [x] 04-02-PLAN.md — DIN-methodiek validatiemodule + post-validatie pipeline + correctie-badges in UI
- [x] 04-03-PLAN.md — Gap closure: kibGoals/kibScope doorvoeren in DINMappingStep fetch-aanroepen

### Phase 5: Sectorwerk Doorstroming
**Goal**: Sectorwerk-analyse resultaten zijn beschikbaar als gestructureerde input voor DIN-mapping
**Depends on**: Phase 2
**Requirements**: DATA-01, DATA-04
**Success Criteria** (what must be TRUE):
  1. Sectorwerk analyse wordt opgeslagen als getypeerd SectorplanAnalyseResult object (niet als markdown string)
  2. Bij het starten van DIN-mapping ziet de gebruiker suggesties gebaseerd op de sectorwerk-analyse
  3. De sectorwerk-resultaten zijn per sector beschikbaar als context voor de AI bij DIN-generatie
**Plans:** 2 plans
Plans:
- [x] 05-01-PLAN.md — Schema migratie + migratielogica + SectorWerkStep typed object opslag en weergave
- [x] 05-02-PLAN.md — buildSectorwerkBlock + API route opschoning + SectorwerkSuggestiePanel in DINMappingStep
**UI hint**: yes

### Phase 6: Cyclisch Doel-voor-Doel Werken
**Goal**: Gebruiker kan een doel volledig door het DIN-netwerk uitwerken voordat het volgende begint
**Depends on**: Phase 4, Phase 5
**Requirements**: CYCL-01, CYCL-02, CYCL-03
**Success Criteria** (what must be TRUE):
  1. Gebruiker kan een specifiek doel selecteren en dat doel uitwerken over alle drie sectoren
  2. Bij het uitwerken van een volgend doel worden eerder uitgewerkte doelen als context meegegeven (voorkomt duplicatie)
  3. Gebruiker ziet per doel de voortgangsstatus: volledig uitgewerkt, deels uitgewerkt, of nog niet begonnen
  4. Pas na het afronden van een doel wordt het volgende doel voorgesteld
**Plans:** 1/3 plans executed
Plans:
- [x] 06-01-PLAN.md — Schema extensie (completedGoals) + compleetheidslogica (checkSectorChain, getGoalCompletionStatus) + unit tests
- [x] 06-02-PLAN.md — AI context injectie (buildCompletedGoalsContext) + API route wiring (din-mapping, din-suggest)
- [x] 06-03-PLAN.md — UI: sidebar status-badges, "Doel afronden" knop, auto-advance, completedGoalItems passthrough
**UI hint**: yes

### Phase 7: Dutch Tokenizer & Similarity
**Goal**: Cross-analyse gebruikt correcte Nederlandse woordsplitsing en realistische similarity-drempels
**Depends on**: Phase 2
**Requirements**: CROSS-04
**Success Criteria** (what must be TRUE):
  1. Samengestelde Nederlandse woorden worden correct gesplitst (bijv. "onderwijskwaliteit" herkent "onderwijs" en "kwaliteit")
  2. Similarity-drempel is verhoogd zodat oppervlakkige overeenkomsten niet als verbanden worden getoond
  3. Tokens korter dan 4 karakters worden gefilterd (geen ruis van lidwoorden en voorzetsels)
**Plans:** 1/1 plans complete
Plans:
- [x] 07-01-PLAN.md — Snowball stemmer tokenizer + conservative compound splitting + din-service wiring

### Phase 8: Cross-Analyse Semantische Matching
**Goal**: Cross-analyse herkent echte samenhang tussen sectoren en geeft bruikbare consolidatie-adviezen
**Depends on**: Phase 6, Phase 7
**Requirements**: CROSS-01, CROSS-02, CROSS-03
**Success Criteria** (what must be TRUE):
  1. Gedeelde baten over PO/VO/Zakelijk worden herkend op basis van semantische gelijkenis (niet alleen exacte woordmatch)
  2. Gedeelde vermogens die voor meerdere sectoren gelden worden geidentificeerd en gegroepeerd
  3. Gedeelde inspanningen die meerdere sectoren dienen worden geconsolideerd met een aanbeveling
  4. De gebruiker ziet per gedeeld element welke sectoren erbij betrokken zijn
**Plans:** 2/2 plans complete
Plans:
- [x] 08-01-PLAN.md — Schema extensie (consolidation flags + cluster schemas) + prompt upgrade + API route update
- [x] 08-02-PLAN.md — UI: cluster sections (vermogens, inspanningen, projecten) + consolidation merge/undo + filtered local analysis
**UI hint**: yes

### Phase 9: Wizard Cleanup & Export Voorbereiding
**Goal**: Alle integratieadvies-code volledig verwijderd uit de applicatie, wizard-flow opgeschoond
**Depends on**: Phase 6
**Requirements**: EXP-04
**Success Criteria** (what must be TRUE):
  1. De integratieadvies-stap is verwijderd uit de wizard — gebruiker ziet deze stap niet meer
  2. De wizard-flow loopt logisch door zonder gaten na het verwijderen van de stap
**Plans:** 2 plans
Plans:
- [ ] 09-01-PLAN.md — Data layer cleanup: schemas, types, prompts, AI client, API route, session context
- [ ] 09-02-PLAN.md — UI cleanup: DINMappingStep, ExportStep, word-export, orphaned file deletions
**UI hint**: yes

### Phase 10: Eindproducten
**Goal**: Gebruiker kan een compleet programmaplan, DIN-overzicht en roadmap exporteren
**Depends on**: Phase 8, Phase 9
**Requirements**: EXP-01, EXP-02, EXP-03
**Success Criteria** (what must be TRUE):
  1. Word-export bevat alle DIN-secties met inhoudsopgave en genummerde kopjes
  2. Export bevat een visuele DIN-overzicht weergave (doelen, baten, vermogens, inspanningen als netwerk)
  3. Export bevat een roadmap/tijdlijn met kwartaalplanning van inspanningen en afhankelijkheden
  4. Gebruiker wordt voor export gewaarschuwd als er onvolledige ketens zijn (gap-detectie)
**Plans:** 3/3 plans complete
Plans:
- [x] 10-01-PLAN.md — Word export engine: numbering, consolidation filtering, tabel-flow, smart gaps, roadmap placeholder + tests
- [x] 10-02-PLAN.md — ExportStep UI: gap-detection modal, numbered preview, tabel-flow, consolidation filtering
- [x] 10-03-PLAN.md — Cleanup: verwijder ongebruikte /api/export route, generateProgrammaPlan(), PROGRAMMAPLAN_PROMPT
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Zod Schema Validatie | 0/3 | Planning complete | - |
| 2. State Management & Persistence | 0/2 | Planning complete | - |
| 3. Programmaboek Context Pipeline | 0/2 | Planning complete | - |
| 4. AI Output Kwaliteit | 0/3 | Gap closure planned | - |
| 5. Sectorwerk Doorstroming | 2/2 | Executing | - |
| 6. Cyclisch Doel-voor-Doel Werken | 1/3 | In Progress|  |
| 7. Dutch Tokenizer & Similarity | 1/1 | Complete   | 2026-04-02 |
| 8. Cross-Analyse Semantische Matching | 2/2 | Complete   | 2026-04-03 |
| 9. Wizard Cleanup & Export Voorbereiding | 0/2 | Planning complete | - |
| 10. Eindproducten | 3/3 | Complete    | 2026-04-04 |

### Phase 11: Cross-analyse herontwerp: stapsgewijs traject met consolidatie

**Goal:** Herstructureer de CrossAnalyseStep van 9 losse secties naar een helder stapsgewijs traject zodat stakeholders in één oogopslag zien hoe de drie sectoren samenhangen. Flow: (1) Sectoroverloop op baten-niveau (hoogover), (2) Gedeelde vermogens cross-sectoraal, (3) Inspanningen-overlap, (4) Consolidatie-actie met samenvoegen-knop die logische cross-sector vermogens genereert, (5) Per-sector vertaling met eigen nuance/saus per sector.
**Requirements**: R-CROSS-01 (cross-analyse), R-CROSS-02 (synergie-matrix)
**Depends on:** Phase 10
**UI hint:** yes
**Plans:** 4/4 plans complete

Plans:
- [x] 11-01-PLAN.md — Per-step Zod schemas + per-step AI prompts + API route refactoring met stap parameter en cumulatieve context
- [x] 11-02-PLAN.md — Shared component extractie (SectorBadge, LoadingOverlay, ClusterCard, ConsolidationActionBar) + WizardNavigation + StepAnalyseButton
- [x] 11-03-PLAN.md — CrossAnalyseWizard orchestrator + Stap 1-3 (Baten-overloop, Gedeelde Vermogens, Inspanningen-overlap)
- [x] 11-04-PLAN.md — Stap 4-5 (Consolidatie, Sectorvertaling) + CrossAnalyseStep.tsx herschrijving als dunne wrapper

### Phase 12: Lopende Projecten Invullen in DIN-Netwerk

**Goal:** Bestaande lopende projecten (outside-in, online, systemen & data) kunnen specifiek worden ingevuld en gepositioneerd in het DIN-netwerk, gekoppeld aan doelen, baten, vermogens en inspanningen.
**Requirements**: D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14
**Depends on:** Phase 11
**UI hint:** yes
**Plans:** 3/3 plans complete

Plans:
- [x] 12-01-PLAN.md — Schema extensies (ExternalProject + ProjectCapabilityMap + AI response schemas) + API routes (parse/extract/match) + AI client + tests
- [x] 12-02-PLAN.md — ExterneProjectenPanel extractie + import tabs + AI extractie + review cards + domain checkboxes + DINMappingStep update
- [x] 12-03-PLAN.md — AIKoppelingPanel + inline project display in inspanningen + Word export + ExportStep update + human verify

### Phase 13: Stap 5 Cross-Analyse Prioriteitsview eerste doel

**Goal:** Herschrijf stap 5 van de cross-analyse wizard naar een focusview rond het eerste doel (hoogste rank). Toon alleen: (1) het focusdoel, (2) de daaraan gekoppelde baten per sector, (3) de geconsolideerde cross-sector vermogens die hefboom leveren op die baten, (4) de bijbehorende gedeelde inspanningen. Voeg AI-review toe die beoordeelt of inspanningen breed genoeg zijn voor de nu cross-sector vermogens (verbredings-suggesties) en of de baten daadwerkelijk worden geraakt (risico-detectie). Verwijder het huidige totaaloverzicht (volledige DIN-keten, domeinbalans, gap-analyse) uit stap 5. Niet-geconsolideerde items komen in een inklapbare "buiten scope" sectie. Raakt: `Stap5ResultSchema`, `CROSS_ANALYSE_STAP5_PROMPT`, `api/cross-analyse` route (stap 5 tak), `StapSectorVertaling.tsx`, `CrossAnalyseWizard.tsx`. Plan-artefact: `~/.claude/plans/twinkling-puzzling-hennessy.md`.
**Requirements**: R-CROSS-01, R-CROSS-02
**Depends on:** Phase 12
**UI hint:** yes
**Plans:** 3/4 plans executed

Plans:
- [x] 13-01-PLAN.md — Wave 0 TDD scaffolding: 3 test files (schemas-stap5, stap5-focus-filter, stap5-restore-guard) — 23 tests verwacht RED
- [x] 13-02-PLAN.md — Wave 1 foundation: vervang Stap5ResultSchema + CROSS_ANALYSE_STAP5_PROMPT, creëer src/lib/stap5-focus.ts pure helpers (getFocusGoal, computeFocusView, restoreStap5Result)
- [x] 13-03-PLAN.md — Wave 2 API + component: cross-analyse route payload narrowing voor stap===5, StapSectorVertaling.tsx volledig herschrijven naar focusview per UI-SPEC
- [x] 13-04-PLAN.md — Wave 3 wizard integratie + UAT: CrossAnalyseWizard.tsx restore guard + STEP_INFO[5] copy + CTA condition <= 5, human-verify checkpoint (10 checks)

### Phase 14: Lopende projecten promoveren tot volwaardige inspanningen in DIN-keten met splitsing en bevindingen-afleiding

**Goal:** Bestaande lopende projecten (Phase 12) kunnen per stuk gepromoveerd worden tot 1-4 volwaardige DIN-inspanningen via één AI-aanroep die de volledige DIN-positionering doet (baat-match, vermogen-match, effort-splitsing, bevindingen-afleiding) in een inline review-scherm. Gepromoveerde projecten verschuiven van de parallelle projectCapabilityMap naar de standaard capabilityEffortMap DIN-keten; originele projecten blijven als audit-trail zichtbaar via een toggle met terugdraai-mogelijkheid.
**Requirements**: D-01..D-14 (CONTEXT.md locked decisions — no formal R-ID; added post-v1-roadmap as Phase 12 extension)
**Depends on:** Phase 13
**UI hint:** yes
**Plans:** 3 plans

Plans:
- [ ] 14-01-PLAN.md — Schemas (ExternalProject/DINEffort/ProjectPromotieResult) + pure mutation helpers (promoteProjectToEfforts/undoProjectPromotion) + 31 unit tests
- [ ] 14-02-PLAN.md — AI pipeline: PROJECT_PROMOTIE_PROMPT + promoteExternalProject() + POST /api/promote-project + mocked tests (Pitfall 2 safeguard)
- [ ] 14-03-PLAN.md — UI: ProjectPromotiePanel review screen + ExterneProjectenPanel integration + DINMappingStep filter fix + human verify
