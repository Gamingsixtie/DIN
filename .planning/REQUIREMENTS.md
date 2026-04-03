# Requirements: DIN — Doelen-Inspanningennetwerk

**Defined:** 2026-03-30
**Core Value:** Methodische samenhang — elke stap bouwt voort op de vorige, AI-output is getoetst aan het programmaboek, en het resultaat is een samenhangende keten van doelen → baten → vermogens → inspanningen.

## v1 Requirements

Requirements voor de huidige verbeterronde. Elke requirement koppelt aan roadmap-fases.

### Data-integriteit

- [x] **DATA-01**: Sectorwerk-analyse resultaten stromen automatisch door als suggesties in de DIN-mapping stap
- [x] **DATA-02**: AI responses worden gevalideerd met Zod schema's — geen gebroken JSON of ongestructureerde output
- [x] **DATA-03**: Session state management gebruikt functionele updaters — geen race conditions bij gelijktijdige operaties
- [x] **DATA-04**: Sectorwerk analyse wordt opgeslagen als getypeerd object (SectorplanAnalyseResult), niet als markdown string

### AI-kwaliteit

- [x] **AI-01**: Relevante secties uit docs/programmaboek.doc worden als context meegegeven aan alle AI-prompts
- [x] **AI-02**: AI genereert maximaal 2-4 baten per doel per sector, met methodiek-conforme titels (vergrotende trap)
- [x] **AI-03**: KiB visie en scope worden meegegeven aan alle AI-generatie stappen (DIN-mapping, cross-analyse, sectorintegratie)
- [x] **AI-04**: AI-output wordt gevalideerd tegen DIN-methodiek regels voordat het wordt opgeslagen (baten = effecten, vermogens = werkwoorden, inspanningen = concrete activiteiten)

### Cyclisch werken

- [x] **CYCL-01**: Gebruiker kan één doel selecteren en dat volledig door het DIN-netwerk uitwerken voordat het volgende begint
- [x] **CYCL-02**: Context van eerder uitgewerkte doelen wordt meegegeven bij het uitwerken van volgende doelen (voorkom duplicatie)
- [x] **CYCL-03**: Voortgangsindicatie per doel — welke doelen zijn volledig uitgewerkt, welke nog niet

### Cross-analyse

- [x] **CROSS-01**: Cross-analyse herkent gedeelde baten over PO/VO/Zakelijk sectoren (semantisch, niet alleen exacte match)
- [x] **CROSS-02**: Cross-analyse herkent gedeelde vermogens die voor meerdere sectoren gelden
- [x] **CROSS-03**: Cross-analyse herkent gedeelde inspanningen die meerdere sectoren dienen en consolideert deze
- [x] **CROSS-04**: Dutch tokenizer gerepareerd — correcte woordsplitsing voor samengestelde woorden

### Export & visualisatie

- [ ] **EXP-01**: Compleet programmaplan als Word-export met alle DIN-secties, inhoudsopgave en genummerde kopjes
- [ ] **EXP-02**: DIN-overzicht met visuele weergave van het netwerk (doelen → baten → vermogens → inspanningen) in export
- [ ] **EXP-03**: Roadmap/tijdlijn met kwartaalplanning van inspanningen en afhankelijkheden
- [ ] **EXP-04**: Integratieadvies-stap verwijderd uit de wizard flow

## v2 Requirements

Uitgesteld naar toekomstige release. Bijgehouden maar niet in huidige roadmap.

### Visualisatie

- **VIS-01**: Interactieve DIN-netwerk graph met klikbare nodes en detail-panels
- **VIS-02**: Gantt-chart weergave voor inspanningen met afhankelijkheden

### Samenwerking

- **COLLAB-01**: Export/import van sessies als bestand voor delen met collega's
- **COLLAB-02**: Approval workflow voor inspanningen (PSC goedkeuring)

### Geavanceerde analyse

- **ADV-01**: Gap-analyse met actionable "fix dit gat" knoppen
- **ADV-02**: Domeinbalans-analyse met visuele warnings bij scheefgroei

## Out of Scope

Expliciet uitgesloten. Gedocumenteerd om scope creep te voorkomen.

| Feature | Reden |
|---------|-------|
| Multi-user samenwerking | App voor één gebruiker — localStorage-first |
| Database-first (Supabase) | Voegt complexiteit toe zonder meerwaarde voor single-user |
| Realtime sync | Niet nodig voor single-user |
| Free-form AI chat | Methodiek vereist gestructureerde output, geen open gesprek |
| PDF export (primair) | Word is standaard in Nederlands programmamanagement |
| Role-based access control | Geen rollen nodig voor single-user |
| Generic PM features (taakborden, tijdregistratie) | Dit is een methodiek-tool, geen PM-tool |
| Automatische AI zonder review | Methodiek vereist menselijk oordeel bij elke stap |

## Traceability

Welke fases dekken welke requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 5 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 2 | Complete |
| DATA-04 | Phase 5 | Complete |
| AI-01 | Phase 3 | Complete |
| AI-02 | Phase 4 | Complete |
| AI-03 | Phase 4 | Complete |
| AI-04 | Phase 4 | Complete |
| CYCL-01 | Phase 6 | Complete |
| CYCL-02 | Phase 6 | Complete |
| CYCL-03 | Phase 6 | Complete |
| CROSS-01 | Phase 8 | Complete |
| CROSS-02 | Phase 8 | Complete |
| CROSS-03 | Phase 8 | Complete |
| CROSS-04 | Phase 7 | Complete |
| EXP-01 | Phase 10 | Pending |
| EXP-02 | Phase 10 | Pending |
| EXP-03 | Phase 10 | Pending |
| EXP-04 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after roadmap creation*
