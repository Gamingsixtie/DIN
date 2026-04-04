# Phase 11: Cross-analyse herontwerp — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 11-cross-analyse-herontwerp-stapsgewijs-traject-met-consolidatie
**Areas discussed:** Stappen-navigatie, Informatie-verdeling, Consolidatie-interactie, AI-aanroep timing, Per-sector vertaling (stap 5)

---

## Stappen-navigatie

| Option | Description | Selected |
|--------|-------------|----------|
| Wizard (lineair) | Volgende/vorige knoppen, stappen worden ontgrendeld na voltooiing | ✓ |
| Stepper (vrij klikbaar) | Alle stappen altijd klikbaar, gebruiker kan terug | |
| Accordion (alles zichtbaar) | Alle 5 stappen als inklapbare secties op één pagina | |

**User's choice:** Wizard (lineair)
**Notes:** Past bij het methodische karakter van DIN.

---

## Informatie-verdeling

| Option | Description | Selected |
|--------|-------------|----------|
| DIN-keten focus | Stappen volgen baten → vermogens → inspanningen → consolidatie → sector-vertaling | ✓ |
| Analyse → Actie scheiding | Stap 1-3 readonly, stap 4 alle acties, stap 5 resultaat | |
| Minimaal (3+2) | Sommige secties geschrapt | |

**User's choice:** DIN-keten focus
**Notes:** Volgorde moet DIN-methodiek reflecteren.

---

## Consolidatie-interactie

| Option | Description | Selected |
|--------|-------------|----------|
| AI-voorstel + één klik | AI advies per cluster, gebruiker accepteert/wijst af | ✓ |
| Checkbox-selectie | Gebruiker vinkt per cluster items aan | |
| Drag-drop groepering | Items als kaartjes naar groepen slepen | |

**User's choice:** AI-voorstel + één klik, met extra toevoeging: gebruiker moet context of extra info kunnen toevoegen voor optimaler AI-voorstel.
**Notes:** Optioneel tekstveld vóór consolidatie-advies.

---

## AI-aanroep timing

| Option | Description | Selected |
|--------|-------------|----------|
| Eén call vooraf | Alle data in één keer analyseren, verdelen over stappen | |
| Per stap apart | Elke stap eigen AI-call, handmatig getriggerd | ✓ |
| Hybride (1 + verfijning) | Eén initiële call voor stap 1-3, tweede voor consolidatie | |

**User's choice:** Per stap apart
**Notes:** —

### Vervolgvragen AI timing

**Trigger:** Handmatig (knop per stap) — gebruiker klikt 'Analyseer' per stap, kan eerst data bekijken.

**Context:** Cumulatief — elke stap stuurt resultaat eerdere stappen mee als AI-context.

---

## Per-sector vertaling (stap 5)

| Option | Description | Selected |
|--------|-------------|----------|
| Sector-tabs met volledige keten | Tab per sector met baten, vermogens, inspanningen | ✓ |
| Vergelijkingstabel | Alle sectoren naast elkaar in matrix | |
| Beide: tabs + tabel | Compacte tabel bovenaan, dan tabs voor detail | |

**User's choice:** Sector-tabs met volledige keten

### Vervolgvragen stap 5

**Inhoud per tab:** Alles — DIN-keten + domeinbalans + gaps per sector.

**Samenvattings-tab:** Ja, 'Overzicht' tab als eerste met compacte vergelijking alle sectoren.

---

## Claude's Discretion

- Exacte wizard-UI-ontwerp (progress indicator, knoppen-layout)
- Schema-structuur per-stap AI responses
- Hoe cumulatieve context wordt samengevoegd in prompts
- Visuele weergave samenvattingstabel stap 5
- Welke sub-componenten hergebruikt vs herschreven
- Technische refactoring-aanpak 9-secties → 5-stappen

## Deferred Ideas

Geen — discussie bleef binnen phase scope.
