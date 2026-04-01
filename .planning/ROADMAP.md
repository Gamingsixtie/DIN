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
- [ ] **Phase 7: Dutch Tokenizer & Similarity** - Cross-analyse gebruikt correcte woordsplitsing en verhoogde similarity-drempels
- [ ] **Phase 8: Cross-Analyse Semantische Matching** - Gedeelde baten, vermogens en inspanningen over sectoren worden herkend en geconsolideerd
- [ ] **Phase 9: Wizard Cleanup & Export Voorbereiding** - Integratieadvies verwijderd, export-validatie toegevoegd
- [ ] **Phase 10: Eindproducten** - Compleet programmaplan, DIN-overzicht en roadmap als exporteerbare documenten

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
**Plans**: TBD
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
**Plans**: TBD
**UI hint**: yes

### Phase 7: Dutch Tokenizer & Similarity
**Goal**: Cross-analyse gebruikt correcte Nederlandse woordsplitsing en realistische similarity-drempels
**Depends on**: Phase 2
**Requirements**: CROSS-04
**Success Criteria** (what must be TRUE):
  1. Samengestelde Nederlandse woorden worden correct gesplitst (bijv. "onderwijskwaliteit" herkent "onderwijs" en "kwaliteit")
  2. Similarity-drempel is verhoogd zodat oppervlakkige overeenkomsten niet als verbanden worden getoond
  3. Tokens korter dan 4 karakters worden gefilterd (geen ruis van lidwoorden en voorzetsels)
**Plans**: TBD

### Phase 8: Cross-Analyse Semantische Matching
**Goal**: Cross-analyse herkent echte samenhang tussen sectoren en geeft bruikbare consolidatie-adviezen
**Depends on**: Phase 6, Phase 7
**Requirements**: CROSS-01, CROSS-02, CROSS-03
**Success Criteria** (what must be TRUE):
  1. Gedeelde baten over PO/VO/Zakelijk worden herkend op basis van semantische gelijkenis (niet alleen exacte woordmatch)
  2. Gedeelde vermogens die voor meerdere sectoren gelden worden geidentificeerd en gegroepeerd
  3. Gedeelde inspanningen die meerdere sectoren dienen worden geconsolideerd met een aanbeveling
  4. De gebruiker ziet per gedeeld element welke sectoren erbij betrokken zijn
**Plans**: TBD
**UI hint**: yes

### Phase 9: Wizard Cleanup & Export Voorbereiding
**Goal**: De wizard-flow is opgeschoond en export wordt voorbereid met validatie
**Depends on**: Phase 6
**Requirements**: EXP-04
**Success Criteria** (what must be TRUE):
  1. De integratieadvies-stap is verwijderd uit de wizard — gebruiker ziet deze stap niet meer
  2. De wizard-flow loopt logisch door zonder gaten na het verwijderen van de stap
**Plans**: TBD
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
**Plans**: TBD
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
| 5. Sectorwerk Doorstroming | 0/0 | Not started | - |
| 6. Cyclisch Doel-voor-Doel Werken | 0/0 | Not started | - |
| 7. Dutch Tokenizer & Similarity | 0/0 | Not started | - |
| 8. Cross-Analyse Semantische Matching | 0/0 | Not started | - |
| 9. Wizard Cleanup & Export Voorbereiding | 0/0 | Not started | - |
| 10. Eindproducten | 0/0 | Not started | - |
