# Phase 14: Lopende projecten promoveren tot volwaardige inspanningen - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 14-lopende-projecten-promoveren-tot-volwaardige-inspanningen-in-din-keten-met-splitsing-en-bevindingen-afleiding
**Areas discussed:** Promotie-mechanisme, Splitsings-strategie, Origineel project na promotie, Bevindingen-ontwerp

---

## Gebied-selectie

| Option | Description | Selected |
|--------|-------------|----------|
| Promotie-mechanisme | Hoe start de promotie? Handmatige knop, bulk, AI-trigger? Waar zit de knop? | ✓ |
| Splitsings-strategie | Eén project → hoeveel inspanningen? Per domein, AI-voorstel, handmatig? | ✓ |
| Origineel project na promotie | Verwijderen, archiveren, laten staan? Terugdraaien mogelijk? | ✓ |
| Bevindingen-ontwerp | Wat zijn bevindingen, waar landen ze, hoe opgeslagen? | ✓ |

**User's choice:** Alle vier geselecteerd.

---

## Promotie-mechanisme

### Waar zit de promotie-trigger in de UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Knop op project-card | 'Promoveren → inspanning' knop direct op elke project-card in ExterneProjectenPanel | |
| Uitbreiding AIKoppelingPanel | Vervolgstap in Phase 12 AI-koppelings flow | |
| Nieuwe promotie-sectie | Aparte uitklapbare sectie onder ExterneProjectenPanel | |
| Via AIKoppelingPanel uitbreiding | Toggle 'Toon promotie-suggesties' binnen AIKoppelingPanel | |

**User's choice:** (Other) "knop waarbij je dus kan aangeven bij welke baat het hoort obv ai advies"
**Notes:** Belangrijke nuance — de promotie gaat niet alleen over vermogen-koppeling maar ook over baat-koppeling. User wil een knop die leidt naar een panel waar AI adviseert welke baat, en user kiest/bevestigt. De promotie-flow wordt dus een **volledige DIN-positionering**: baat → vermogen → gesplitste efforts in één aanroep.

### Wie initieert de promotie?

| Option | Description | Selected |
|--------|-------------|----------|
| AI stelt splitsing voor, user reviewt | User klikt, AI analyseert + stelt voor, user reviewt/wijzigt/bevestigt | ✓ |
| User kiest splitsing, AI verrijkt | User bepaalt aantal/domeinen, AI vult velden | |
| AI voert volledig uit, user bevestigt | Snelste, achteraf terugdraaien | |

**User's choice:** AI stelt splitsing voor, user reviewt
**Notes:** Consistent met Phase 12 D-06.

### Pre-conditie: moet koppeling aan vermogens al bestaan?

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, koppeling verplicht | Promoveren pas beschikbaar na Phase 12 AI-koppeling | |
| Nee, altijd beschikbaar | AI doet koppeling én promotie in één stap | |
| Aanbevolen maar niet verplicht | Waarschuwing, user kan doorzetten | |

**User's choice:** (Other) "nee AI doet totale suggestie van baat en bij welke vermogen"
**Notes:** AI doet in één aanroep alles — baat-match, vermogen-match, effort-splitsing. Geen afhankelijkheid van Phase 12 koppel-flow.

### Scope van één promotie-actie?

| Option | Description | Selected |
|--------|-------------|----------|
| Per project | Eén project tegelijk promoveren | ✓ |
| Per sector (bulk) | Alle projecten van een sector in één keer | |
| Beide | Beide knoppen naast elkaar | |

**User's choice:** Per project
**Notes:** Bulk deferred.

---

## Splitsings-strategie

### Hoe stelt AI de splitsing voor?

| Option | Description | Selected |
|--------|-------------|----------|
| Per domein dat project raakt | Eén effort per domein in multi-domein-veld | |
| Per vermogen dat project bedient | Eén effort per vermogen | |
| AI-oordeel, vrij binnen 1-4 | AI bepaalt zelf logische splitsing, max 4 | ✓ |
| Per baat die project raakt | Eén effort per baat | |

**User's choice:** AI-oordeel, vrij binnen 1-4
**Notes:** Zod-schema enforceert `.min(1).max(4)`.

### Splitsing verplicht of optioneel?

| Option | Description | Selected |
|--------|-------------|----------|
| Optioneel, user kan 1 kiezen | User kan in review kiezen voor 1 effort | ✓ |
| Verplicht splitsen als >1 domein | Methodisch strakker | |
| Altijd minstens 1, geen maximum | Volledige vrijheid | |

**User's choice:** Optioneel, user kan 1 kiezen

### Verplichte velden op nieuwe efforts?

| Option | Description | Selected |
|--------|-------------|----------|
| AI vult alles in, user reviewt | Alle velden hebben default, direct bevestigen mogelijk | ✓ |
| Alleen titel/beschrijving/domein verplicht | Lean, quartaal/dossier leeg | |
| Volledig dossier (DIN-methodiek) | AI vult ook inspanningsdossier | |

**User's choice:** AI vult alles in, user reviewt

---

## Origineel project na promotie

### Wat gebeurt met ExternalProject?

| Option | Description | Selected |
|--------|-------------|----------|
| Markeer als gepromoveerd, verberg standaard | Blijft bestaan met `promotedAt`/`promotedToEffortIds`, gefilterd uit actieve lijst | ✓ |
| Volledig verwijderen | Record weg, geen terugdraaien zonder herimport | |
| Blijf zichtbaar naast efforts | Dubbele zichtbaarheid met badge | |

**User's choice:** Markeer als gepromoveerd, verberg standaard

### Datarelatie project ↔ efforts?

| Option | Description | Selected |
|--------|-------------|----------|
| Op effort: `originProjectId` | Enkelzijdig, effort → project lookup | ✓ |
| Op project: `promotedToEffortIds[]` | Enkelzijdig, project → effort lookup | |
| Beide velden (bi-directioneel) | Beide richtingen snel | |

**User's choice:** Op effort: `originProjectId`
**Notes:** In de context-sectie is uiteindelijk besloten bi-directioneel te gaan (zowel `originProjectId` op effort als `promotedToEffortIds` op project) voor snelle navigatie in beide richtingen — consistent met de user's keuze voor "markeer als gepromoveerd" die `promotedToEffortIds` al impliceert.

### Wat met bestaande `projectCapabilityMaps`?

| Option | Description | Selected |
|--------|-------------|----------|
| Omzetten naar effort-koppelingen | `projectCapabilityMap` → `capabilityEffortMap` per nieuwe effort | ✓ |
| Behouden als bron-historie | Oude maps blijven, nieuwe komen erbij | |
| Verwijderen zonder omzetting | Schone lei, AI bepaalt opnieuw | |

**User's choice:** Omzetten naar effort-koppelingen

### Undo-mechanisme?

| Option | Description | Selected |
|--------|-------------|----------|
| Undo-knop direct na promotie (toast) | Tijdgebonden, vóór volgende sessie-actie | |
| Permanente terugdraaien via project-detail | Altijd beschikbaar zolang sessie bestaat | ✓ |
| Geen undo, alleen handmatig opruimen | Simpeler datamodel | |

**User's choice:** Permanente terugdraaien via project-detail

---

## Bevindingen-ontwerp

### Definitie van bevindingen?

| Option | Description | Selected |
|--------|-------------|----------|
| DIN-element suggesties | Nieuwe baten/vermogens/inspanningen die project impliceert | ✓ |
| Risico's + hiaten | Problemen die AI signaleert | |
| Gemengd: inzichten + suggesties + risico's | Verzamelcategorie met type-veld | |
| Lessons learned / kwalitatieve notes | Vrije tekst inzichten | |

**User's choice:** DIN-element suggesties

### Waar landen bevindingen?

| Option | Description | Selected |
|--------|-------------|----------|
| Als suggesties terug in de DIN-keten | Klikbare "voeg toe" knoppen in review-scherm | ✓ |
| Aparte bevindingen-sectie per sector | Uitklapbare sectie in DINMappingStep | |
| Als annotaties op gerelateerde items | Icoon + tooltip bij vermogens | |
| In Word-export als hoofdstuk | Eindproduct-verrijking | |

**User's choice:** Als suggesties terug in de DIN-keten

### Opslag in datamodel?

| Option | Description | Selected |
|--------|-------------|----------|
| Nieuwe `DINFinding` entity | Aparte schema + session array | |
| Als veld op ExternalProject | Embedded, kleiner schema-impact | |
| Als onderdeel van promotie-result (transient) | Alleen in review-scherm, niet persistent | |

**User's choice:** (Other) "jij bepaalt"
**Notes:** Claude's discretion toegekend. Gekozen voor transient model: bevindingen zitten in de AI-response schema (`ProjectPromotieResultSchema` met `FindingSuggestionSchema`), worden getoond in review-UI, en bij klik "voeg toe" direct omgezet naar echte DIN-entities (`DINBenefit`/`DINCapability`/`DINEffort`) met `originProjectId` backlink. Niet geaccepteerde bevindingen worden niet persistent opgeslagen. Rationale: minimale datamodel-impact, past bij gekozen transient promotie-review-UX, en user kan later altijd opnieuw promoveren als re-iteratie nodig is.

---

## Claude's Discretion

- Precieze locatie van promotie-knop (bestaande panel uitgebreid of nieuwe component)
- Visuele opmaak van review-scherm (modal / panel / overlay)
- Prompt-ontwerp voor gecombineerde promotie-AI-aanroep
- Exacte Zod-schema shape voor `ProjectPromotieResultSchema` + `FindingSuggestionSchema`
- Hergebruik van `assembleSystemPrompt` vs eigen prompt-pipeline
- Exact migratie-pad voor backward-compat van bestaande sessies
- UI-stijl van "gepromoveerd"-badge en "Toon gepromoveerde projecten" toggle
- Test-strategie (unit + integration scope)

## Deferred Ideas

- Bulk-promotie per sector
- Bevindingen als Word-export hoofdstuk
- Bevindingen-historie (accept/reject trail)
- Tijdgebonden toast-undo
- Re-promotie van reeds gepromoveerde projecten
- Cross-sector promotie
