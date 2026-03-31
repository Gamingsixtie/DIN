# Phase 3: Programmaboek Context Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 03-programmaboek-context-pipeline
**Areas discussed:** Extractiemoment, Sectieselectie, Context-injectie, Inkortlogica

---

## Extractiemoment

| Option | Description | Selected |
|--------|-------------|----------|
| Build-time | Eenmalig extracten naar .ts/.json bestanden. Snel, geen runtime overhead, werkt op Vercel. | ✓ |
| Statische bestanden | Eenmalig extraheren naar losse .txt bestanden in docs/chunks/. Runtime lezen via fs. | |
| Runtime per API-call | Bij elke AI-aanroep mammoth.extractRawText op het .doc bestand. | |

**User's choice:** Build-time
**Notes:** Gebruiker bevestigde dat het programmaboek de autoriteitsbron is die bij elk AI-moment moet worden gebruikt. De theorie is statisch.

### Vervolgvraag: Opslagformaat

**User's choice:** Vrije tekst — "het bereikste hierin is dat voor ieder onderdeel een bepaald deel van het boek wordt aangedragen. We gaan die bron ten volle benutten."
**Notes:** Gebruiker benadrukt dat het boek volledig benut moet worden bij elk moment van werken. Opslagformaat is ondergeschikt aan functie.

### Vervolgvraag: Bereik

| Option | Description | Selected |
|--------|-------------|----------|
| Overal | Elke AI-aanroep krijgt programmaboek-context | |
| Alleen DIN-mapping | Alleen bij genereren/aanscherpen van baten, vermogens, inspanningen | |
| DIN + cross-analyse | Bij DIN-element generatie en cross-analyse | ✓ (nuance) |

**User's choice:** Vooral DIN-mapping, en ook cross-analyse vanuit de theorie om te toetsen of resultaten uitvoerbaar zijn.

---

## Sectieselectie

| Option | Description | Selected |
|--------|-------------|----------|
| Vaste mapping | Handmatig toewijzen per use case. Voorspelbaar, onderhoudbaar. | ✓ |
| Keyword-matching | Automatisch relevante sectie zoeken op basis van keywords. | |
| Alles meegeven | Hele programmaboek altijd meegeven. | |

**User's choice:** Vaste mapping, maar kent het boek niet uit het hoofd — researcher moet de mapping voorstellen.
**Notes:** Gebruiker wil de mapping reviewen voordat deze wordt geimplementeerd.

---

## Context-injectie

| Option | Description | Selected |
|--------|-------------|----------|
| System prompt | Programmaboek als achtergrondkennis in system prompt | ✓ |
| User message | Als extra context in user message | |
| Claude beslist | Per situatie de beste plek kiezen | |

**User's choice:** System prompt

### Vervolgvraag: Bestaande prompts

| Option | Description | Selected |
|--------|-------------|----------|
| Vervangen door boek | Handgeschreven uitleg vervangen door echte boektekst | |
| Aanvullen met boek | Handgeschreven uitleg behouden, boektekst ernaast | |
| Claude beslist | Per prompt beoordelen wat overlapt | |

**User's choice:** Vrije tekst — "in principe moeten die kloppen, controleren of dit ook zo is en geef voorstel tot eventuele aanpassing die ik handmatig accordeer"
**Notes:** Bestaande prompts controleren tegen het boek, afwijkingen als voorstel aan gebruiker, handmatige goedkeuring.

---

## Inkortlogica

| Option | Description | Selected |
|--------|-------------|----------|
| Zinsgrenzen | Afkappen op laatste hele zin binnen limiet | |
| AI-samenvatting | Te lange secties laten samenvatten door Claude | |
| Claude beslist | Per situatie kiezen | |

**User's choice:** Vrije tekst — "kan de AI niet van te voren op basis van het framework wat er al staat een analyse doen wat het precies uit het boek nodig heeft en obv een selectie maken?"
**Notes:** Gebruiker stelde intelligente build-time selectie voor: AI analyseert het hele boek eenmalig, bepaalt per use case welke passages relevant zijn, en slaat die op. Dit werd vervolgens bevestigd als build-time aanpak.

### Vervolgvraag: Timing van AI-selectie

| Option | Description | Selected |
|--------|-------------|----------|
| Build-time | Eenmalig AI-analyse van hele boek + selectie per use case | ✓ |
| Runtime per call | Bij elke AI-aanroep een selectie-query | |

**User's choice:** Build-time
**Notes:** "De theorie is statisch en zit de kwaliteit in de output waarbij de juiste delen worden toegepast maar dit is niet dynamisch."

---

## Claude's Discretion

- Opslagformaat voor geextraheerde secties (TypeScript constanten vs JSON)
- Structuur van het build-time extractie-script
- Zinsgrenzen-logica als fallback
- Volgorde van instructies + context in system prompt

## Deferred Ideas

None — discussion stayed within phase scope
